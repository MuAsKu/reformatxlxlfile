"use strict";

/**
 * @param {unknown} value
 * @returns {string}
 */
function normalizeText(value) {
  return String(value ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function normalizeSearchText(value) {
  return normalizeText(value).toLocaleLowerCase("ru-RU");
}

/**
 * @param {number|string} apartmentNumber
 * @returns {string}
 */
function formatApartmentLabel(apartmentNumber) {
  return `Кв-${String(apartmentNumber).trim()}`;
}

/**
 * @param {string} text
 * @returns {number|null}
 */
function parseLocalizedNumber(text) {
  const match = normalizeText(text).match(/-?\d+(?:[.,]\d+)?/);
  if (!match) {
    return null;
  }

  return Number.parseFloat(match[0].replace(",", "."));
}

/**
 * @param {string} text
 * @returns {number}
 */
function extractSortableNumber(text) {
  const value = parseLocalizedNumber(text);
  return value === null ? Number.MAX_SAFE_INTEGER : value;
}

/**
 * @param {string} left
 * @param {string} right
 * @returns {number}
 */
function compareTextNatural(left, right) {
  return String(left || "").localeCompare(String(right || ""), "ru", {
    numeric: true,
    sensitivity: "base",
  });
}

/**
 * @param {number} row
 * @param {number} col
 * @param {string} address
 * @returns {{ top: number, left: number, bottom: number, right: number, address: string }}
 */
function createSingleCellRange(row, col, address) {
  return {
    top: row,
    left: col,
    bottom: row,
    right: col,
    address,
  };
}

/**
 * @param {string} label
 * @returns {number}
 */
function columnLabelToNumber(label) {
  let value = 0;
  for (const char of label.toUpperCase()) {
    value = value * 26 + (char.charCodeAt(0) - 64);
  }

  return value;
}

/**
 * @param {string} address
 * @returns {{ row: number, col: number }}
 */
function parseCellAddress(address) {
  const match = String(address).match(/^([A-Z]+)(\d+)$/i);
  if (!match) {
    throw new Error(`Некорректный адрес ячейки: ${address}`);
  }

  return {
    col: columnLabelToNumber(match[1]),
    row: Number.parseInt(match[2], 10),
  };
}

/**
 * @param {string} rangeAddress
 * @returns {{ top: number, left: number, bottom: number, right: number, address: string }}
 */
function parseRangeAddress(rangeAddress) {
  const [startAddress, endAddress] = String(rangeAddress).split(":");
  const start = parseCellAddress(startAddress);
  const end = endAddress ? parseCellAddress(endAddress) : start;

  return {
    top: Math.min(start.row, end.row),
    left: Math.min(start.col, end.col),
    bottom: Math.max(start.row, end.row),
    right: Math.max(start.col, end.col),
    address: rangeAddress,
  };
}

/**
 * @param {number} firstStart
 * @param {number} firstEnd
 * @param {number} secondStart
 * @param {number} secondEnd
 * @returns {number}
 */
function rangeGap(firstStart, firstEnd, secondStart, secondEnd) {
  if (firstEnd < secondStart) {
    return secondStart - firstEnd;
  }

  if (secondEnd < firstStart) {
    return firstStart - secondEnd;
  }

  return 0;
}

/**
 * @param {{ top: number, left: number, bottom: number, right: number }} sourceRange
 * @param {{ top: number, left: number, bottom: number, right: number }} targetRange
 * @returns {{
 *   rowGap: number,
 *   colGap: number,
 *   rowOverlap: boolean,
 *   colOverlap: boolean,
 *   sameRow: boolean,
 *   sameColumn: boolean,
 *   isAbove: boolean,
 *   isBelow: boolean,
 *   isLeft: boolean,
 *   isRight: boolean
 * }}
 */
function getSpatialRelation(sourceRange, targetRange) {
  const rowGap = rangeGap(
    sourceRange.top,
    sourceRange.bottom,
    targetRange.top,
    targetRange.bottom,
  );
  const colGap = rangeGap(
    sourceRange.left,
    sourceRange.right,
    targetRange.left,
    targetRange.right,
  );

  const sourceCenterRow = (sourceRange.top + sourceRange.bottom) / 2;
  const sourceCenterCol = (sourceRange.left + sourceRange.right) / 2;
  const targetCenterRow = (targetRange.top + targetRange.bottom) / 2;
  const targetCenterCol = (targetRange.left + targetRange.right) / 2;

  return {
    rowGap,
    colGap,
    rowOverlap: rowGap === 0,
    colOverlap: colGap === 0,
    sameRow: Math.abs(sourceCenterRow - targetCenterRow) < 0.01,
    sameColumn: Math.abs(sourceCenterCol - targetCenterCol) < 0.01,
    isAbove: targetRange.bottom < sourceRange.top,
    isBelow: targetRange.top > sourceRange.bottom,
    isLeft: targetRange.right < sourceRange.left,
    isRight: targetRange.left > sourceRange.right,
  };
}

module.exports = {
  normalizeText,
  normalizeSearchText,
  formatApartmentLabel,
  parseLocalizedNumber,
  extractSortableNumber,
  compareTextNatural,
  createSingleCellRange,
  columnLabelToNumber,
  parseCellAddress,
  parseRangeAddress,
  getSpatialRelation,
};
