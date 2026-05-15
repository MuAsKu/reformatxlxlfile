"use strict";

const THEME_COLOR_ORDER = [
  "lt1",
  "dk1",
  "lt2",
  "dk2",
  "accent1",
  "accent2",
  "accent3",
  "accent4",
  "accent5",
  "accent6",
  "hlink",
  "folHlink",
];

/**
 * Parse workbook theme XML into a theme-index -> hex palette.
 * @param {string|undefined|null} themeXml
 * @returns {Map<number, string>}
 */
function createThemePalette(themeXml) {
  const palette = new Map();
  if (!themeXml) {
    return palette;
  }

  for (const [index, colorName] of THEME_COLOR_ORDER.entries()) {
    const blockMatch = String(themeXml).match(
      new RegExp(`<a:${colorName}>[\\s\\S]*?<\\/a:${colorName}>`, "i"),
    );

    if (!blockMatch) {
      continue;
    }

    const colorBlock = blockMatch[0];
    const srgbMatch = colorBlock.match(/<a:srgbClr[^>]*val="([0-9A-F]{6})"/i);
    const sysMatch = colorBlock.match(/<a:sysClr[^>]*lastClr="([0-9A-F]{6})"/i);
    const hex = (srgbMatch?.[1] || sysMatch?.[1] || "").toUpperCase();

    if (hex) {
      palette.set(index, hex);
    }
  }

  return palette;
}

/**
 * Resolve an Excel color object to a concrete hex value.
 * @param {{ argb?: string, theme?: number, tint?: number }} color
 * @param {Map<number, string>} themePalette
 * @returns {string|null}
 */
function resolveColorToHex(color, themePalette) {
  const argbHex = normalizeArgbToHex(color?.argb);
  if (argbHex) {
    return argbHex;
  }

  if (typeof color?.theme !== "number") {
    return null;
  }

  const themeHex = themePalette.get(color.theme);
  if (!themeHex) {
    return null;
  }

  return applyTintToHex(themeHex, color.tint);
}

/**
 * @param {string} hex
 * @param {number|undefined} tint
 * @returns {string}
 */
function applyTintToHex(hex, tint) {
  const rgb = hexToRgb(hex);
  if (!rgb || typeof tint !== "number" || Number.isNaN(tint) || tint === 0) {
    return hex;
  }

  const nextRgb = {
    r: applyTintChannel(rgb.r, tint),
    g: applyTintChannel(rgb.g, tint),
    b: applyTintChannel(rgb.b, tint),
  };

  return rgbToHex(nextRgb);
}

/**
 * @param {number} channel
 * @param {number} tint
 * @returns {number}
 */
function applyTintChannel(channel, tint) {
  const normalized = Math.max(-1, Math.min(1, tint));
  const value =
    normalized < 0
      ? channel * (1 + normalized)
      : channel * (1 - normalized) + 255 * normalized;

  return Math.max(0, Math.min(255, Math.round(value)));
}

/**
 * @param {string|undefined} argb
 * @returns {string|null}
 */
function normalizeArgbToHex(argb) {
  if (!argb) {
    return null;
  }

  let hex = String(argb).replace(/^#/, "").toUpperCase();
  if (hex.length === 8) {
    hex = hex.slice(2);
  }

  return /^[0-9A-F]{6}$/.test(hex) ? hex : null;
}

/**
 * @param {string} hex
 * @returns {{ r: number, g: number, b: number }|null}
 */
function hexToRgb(hex) {
  if (!hex || hex.length !== 6) {
    return null;
  }

  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}

/**
 * @param {{ r: number, g: number, b: number }} rgb
 * @returns {string}
 */
function rgbToHex(rgb) {
  return [rgb.r, rgb.g, rgb.b]
    .map((value) => value.toString(16).padStart(2, "0").toUpperCase())
    .join("");
}

module.exports = {
  createThemePalette,
  resolveColorToHex,
};
