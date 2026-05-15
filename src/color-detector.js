"use strict";

const { STATUS_LABELS } = require("./constants");
const { resolveColorToHex } = require("./theme-resolver");

/**
 * Extract fill metadata and resolve theme colors to concrete RGB.
 * @param {import("exceljs").Cell} cell
 * @param {Map<number, string>} [themePalette]
 * @returns {{ pattern: string, hex: string|null, raw: string, source: string }}
 */
function extractCellFill(cell, themePalette = new Map()) {
  const fill = cell.fill || cell.style?.fill || {};
  const color =
    fill.fgColor ||
    fill.bgColor ||
    cell.style?.fill?.fgColor ||
    cell.style?.fill?.bgColor ||
    null;

  const hex = resolveColorToHex(color, themePalette);
  const source = describeColorSource(color);
  const raw =
    hex && source && source !== hex
      ? `${hex} [${source}]`
      : hex || source || "NO_FILL";

  return {
    pattern: fill.pattern || cell.style?.fill?.pattern || "",
    hex,
    raw,
    source: source || (hex ? "RGB" : "NO_FILL"),
  };
}

/**
 * @param {{ pattern?: string, hex?: string|null, raw?: string }} fillInfo
 * @returns {{ status: string, color: string }}
 */
function detectApartmentStatus(fillInfo) {
  if (fillInfo?.pattern === "none") {
    return {
      status: STATUS_LABELS.FREE,
      color: fillInfo?.raw || "NO_FILL",
    };
  }

  if (!fillInfo?.hex) {
    return {
      status: STATUS_LABELS.FREE,
      color: fillInfo?.raw || "NO_FILL",
    };
  }

  const rgb = hexToRgb(fillInfo.hex);
  if (!rgb || isWhiteLike(rgb)) {
    return {
      status: STATUS_LABELS.FREE,
      color: fillInfo.raw || fillInfo.hex,
    };
  }

  const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);

  if (isBlueLike(rgb, hsv)) {
    return {
      status: STATUS_LABELS.RESERVED,
      color: fillInfo.raw || fillInfo.hex,
    };
  }

  if (isPurpleLike(rgb, hsv)) {
    return {
      status: STATUS_LABELS.UNAVAILABLE,
      color: fillInfo.raw || fillInfo.hex,
    };
  }

  return {
    status: STATUS_LABELS.FREE,
    color: fillInfo.raw || fillInfo.hex,
  };
}

/**
 * @param {{ argb?: string, theme?: number, tint?: number }} color
 * @returns {string}
 */
function describeColorSource(color) {
  const argb = color?.argb ? String(color.argb).toUpperCase() : "";
  if (argb) {
    return argb;
  }

  if (typeof color?.theme === "number") {
    const tint = typeof color.tint === "number" ? `:${color.tint}` : "";
    return `THEME_${color.theme}${tint}`;
  }

  return "";
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
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {{ h: number, s: number, v: number }}
 */
function rgbToHsv(r, g, b) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === red) {
      h = ((green - blue) / delta) % 6;
    } else if (max === green) {
      h = (blue - red) / delta + 2;
    } else {
      h = (red - green) / delta + 4;
    }

    h *= 60;
    if (h < 0) {
      h += 360;
    }
  }

  const s = max === 0 ? 0 : delta / max;
  const v = max;

  return { h, s, v };
}

/**
 * @param {{ r: number, g: number, b: number }} rgb
 * @returns {boolean}
 */
function isWhiteLike(rgb) {
  return rgb.r >= 242 && rgb.g >= 242 && rgb.b >= 242;
}

/**
 * @param {{ r: number, g: number, b: number }} rgb
 * @param {{ h: number, s: number, v: number }} hsv
 * @returns {boolean}
 */
function isBlueLike(rgb, hsv) {
  return (
    (hsv.h >= 180 && hsv.h <= 245 && hsv.s >= 0.12 && hsv.v >= 0.45) ||
    (rgb.b >= 160 && rgb.b - rgb.r >= 18 && rgb.b - rgb.g >= 6)
  );
}

/**
 * @param {{ r: number, g: number, b: number }} rgb
 * @param {{ h: number, s: number, v: number }} hsv
 * @returns {boolean}
 */
function isPurpleLike(rgb, hsv) {
  return (
    (hsv.h >= 255 && hsv.h <= 330 && hsv.s >= 0.1 && hsv.v >= 0.45) ||
    (rgb.r >= 175 && rgb.b >= 175 && rgb.g <= 235)
  );
}

module.exports = {
  extractCellFill,
  detectApartmentStatus,
};
