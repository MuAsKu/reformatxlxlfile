"use strict";

const ExcelJS = require("exceljs");

const { detectApartmentStatus } = require("./color-detector");
const { createContextAnalyzer } = require("./context-analyzer");
const { extractSheetMetadata } = require("./metadata-extractor");
const { createThemePalette } = require("./theme-resolver");
const { buildSheetModel } = require("./workbook-model");
const {
  compareTextNatural,
  extractSortableNumber,
  parseLocalizedNumber,
} = require("./utils");

/**
 * @param {string} inputPath
 * @returns {Promise<Array<{
 *   status: string,
 *   apartment: string,
 *   apartmentNumber: number,
 *   area: string,
 *   areaValue: number|null,
 *   type: string,
 *   floor: string,
 *   floorValue: number,
 *   block: string,
 *   entrance: string,
 *   section: string,
 *   complexName: string,
 *   houseName: string,
 *   sheet: string,
 *   cell: string,
 *   color: string
 * }>>}
 */
async function parseWorkbookFile(inputPath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(inputPath);
  const themePalette = createThemePalette(
    workbook.model?.themes?.theme1 || workbook._themes?.theme1,
  );

  const records = [];

  for (const worksheet of workbook.worksheets) {
    const sheetModel = buildSheetModel(worksheet, themePalette);
    if (sheetModel.apartments.length === 0) {
      continue;
    }

    const sheetMetadata = extractSheetMetadata(sheetModel.cells);
    const contextAnalyzer = createContextAnalyzer(sheetModel);

    for (const apartmentCell of sheetModel.apartments) {
      const context = contextAnalyzer.analyzeApartment(apartmentCell);
      const status = detectApartmentStatus(apartmentCell.fill);

      records.push({
        status: status.status,
        apartment: apartmentCell.apartmentLabel,
        apartmentNumber: apartmentCell.apartmentNumber,
        area: context.area,
        areaValue: parseLocalizedNumber(context.area),
        type: context.type,
        floor: context.floor,
        floorValue: extractSortableNumber(context.floor),
        block: context.block,
        entrance: context.entrance,
        section: context.section,
        complexName: sheetMetadata.complexName,
        houseName: sheetMetadata.houseName,
        sheet: worksheet.name,
        cell: apartmentCell.address,
        color: status.color,
      });
    }
  }

  records.sort(compareApartmentRecords);
  return records;
}

/**
 * @param {object} left
 * @param {object} right
 * @returns {number}
 */
function compareApartmentRecords(left, right) {
  const blockDiff = compareTextNatural(left.block, right.block);
  if (blockDiff !== 0) {
    return blockDiff;
  }

  const floorDiff = compareNullableNumbers(left.floorValue, right.floorValue);
  if (floorDiff !== 0) {
    return floorDiff;
  }

  const areaDiff = compareNullableNumbers(left.areaValue, right.areaValue);
  if (areaDiff !== 0) {
    return areaDiff;
  }

  const apartmentDiff = compareNullableNumbers(
    left.apartmentNumber,
    right.apartmentNumber,
  );
  if (apartmentDiff !== 0) {
    return apartmentDiff;
  }

  const sheetDiff = compareTextNatural(left.sheet, right.sheet);
  if (sheetDiff !== 0) {
    return sheetDiff;
  }

  return compareTextNatural(left.cell, right.cell);
}

/**
 * @param {number|null|undefined} left
 * @param {number|null|undefined} right
 * @returns {number}
 */
function compareNullableNumbers(left, right) {
  const leftValue = Number.isFinite(left) ? left : Number.MAX_SAFE_INTEGER;
  const rightValue = Number.isFinite(right) ? right : Number.MAX_SAFE_INTEGER;

  return leftValue - rightValue;
}

module.exports = {
  parseWorkbookFile,
};
