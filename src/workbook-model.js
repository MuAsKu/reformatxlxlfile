"use strict";

const { APARTMENT_REGEX } = require("./constants");
const { extractCellFill } = require("./color-detector");
const {
  createSingleCellRange,
  formatApartmentLabel,
  normalizeSearchText,
  normalizeText,
  parseRangeAddress,
} = require("./utils");

/**
 * @param {import("exceljs").Worksheet} worksheet
 * @param {Map<number, string>} [themePalette]
 * @returns {{
 *   name: string,
 *   bounds: { top: number, left: number, bottom: number, right: number },
 *   cells: Array<{
 *     row: number,
 *     col: number,
 *     address: string,
 *     text: string,
 *     searchText: string,
 *     range: { top: number, left: number, bottom: number, right: number, address: string },
 *     fill: { pattern: string, hex: string|null, raw: string, source: string },
 *     hiddenRow: boolean,
 *     hiddenCol: boolean
 *   }>,
 *   apartments: Array<{
 *     row: number,
 *     col: number,
 *     address: string,
 *     text: string,
 *     searchText: string,
 *     range: { top: number, left: number, bottom: number, right: number, address: string },
 *     fill: { pattern: string, hex: string|null, raw: string, source: string },
 *     hiddenRow: boolean,
 *     hiddenCol: boolean,
 *     apartmentNumber: number,
 *     apartmentLabel: string
 *   }>
 * }}
 */
function buildSheetModel(worksheet, themePalette = new Map()) {
  const bounds = getWorksheetBounds(worksheet);
  const mergeMap = buildMergeMap(worksheet.model?.merges || []);
  const seenAddresses = new Set();
  const cells = [];
  const apartments = [];

  if (bounds.bottom === 0 || bounds.right === 0) {
    return {
      name: worksheet.name,
      bounds,
      cells,
      apartments,
    };
  }

  for (let row = bounds.top; row <= bounds.bottom; row += 1) {
    for (let col = bounds.left; col <= bounds.right; col += 1) {
      const excelCell = worksheet.getCell(row, col);
      const sourceCell =
        excelCell.master && excelCell.master.address
          ? excelCell.master
          : excelCell;

      if (seenAddresses.has(sourceCell.address)) {
        continue;
      }
      seenAddresses.add(sourceCell.address);

      const text = normalizeText(sourceCell.text);
      const fill = extractCellFill(sourceCell, themePalette);
      if (!text) {
        continue;
      }

      const cellModel = {
        row: sourceCell.row,
        col: sourceCell.col,
        address: sourceCell.address,
        text,
        searchText: normalizeSearchText(text),
        range:
          mergeMap.get(sourceCell.address) ||
          createSingleCellRange(sourceCell.row, sourceCell.col, sourceCell.address),
        fill,
        hiddenRow: Boolean(worksheet.getRow(sourceCell.row).hidden),
        hiddenCol: Boolean(worksheet.getColumn(sourceCell.col).hidden),
      };

      cells.push(cellModel);

      const apartmentMatch = text.match(APARTMENT_REGEX);
      if (apartmentMatch) {
        const apartmentNumber = Number.parseInt(apartmentMatch[1], 10);
        apartments.push({
          ...cellModel,
          apartmentNumber,
          apartmentLabel: formatApartmentLabel(apartmentNumber),
        });
      }
    }
  }

  return {
    name: worksheet.name,
    bounds,
    cells,
    apartments,
  };
}

/**
 * @param {import("exceljs").Worksheet} worksheet
 * @returns {{ top: number, left: number, bottom: number, right: number }}
 */
function getWorksheetBounds(worksheet) {
  const dimensions = worksheet.dimensions;
  if (dimensions) {
    return {
      top: dimensions.top,
      left: dimensions.left,
      bottom: dimensions.bottom,
      right: dimensions.right,
    };
  }

  return {
    top: 1,
    left: 1,
    bottom: worksheet.rowCount || 0,
    right: worksheet.columnCount || 0,
  };
}

/**
 * @param {string[]} mergedRanges
 * @returns {Map<string, { top: number, left: number, bottom: number, right: number, address: string }>}
 */
function buildMergeMap(mergedRanges) {
  const result = new Map();

  for (const rangeAddress of mergedRanges) {
    const range = parseRangeAddress(rangeAddress);
    const masterAddress = String(rangeAddress).split(":")[0];
    result.set(masterAddress.toUpperCase(), range);
  }

  return result;
}

module.exports = {
  buildSheetModel,
};
