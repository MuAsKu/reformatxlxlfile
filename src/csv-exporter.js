"use strict";

const { CSV_HEADERS } = require("./constants");

/**
 * @param {Array<{
 *   status: string,
 *   apartment: string,
 *   area: string,
 *   type: string,
 *   floor: string,
 *   block: string,
 *   entrance: string,
 *   sheet: string,
 *   cell: string,
 *   color: string
 * }>} records
 * @returns {string}
 */
function exportRecordsToCsv(records) {
  const lines = [CSV_HEADERS];

  for (const record of records) {
    lines.push([
      record.status,
      record.apartment,
      record.area,
      record.type,
      record.floor,
      record.block,
      record.entrance,
      record.sheet,
      record.cell,
      record.color,
    ]);
  }

  return `\uFEFF${lines.map((line) => line.map(escapeCsv).join(";")).join("\n")}\n`;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function escapeCsv(value) {
  const text = String(value ?? "");
  if (!/[;"\n]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

module.exports = {
  exportRecordsToCsv,
};
