"use strict";

const { CSV_HEADERS } = require("./constants");
const { mapRecordsToCrmRows } = require("./crm-mapper");

/**
 * @param {Array<object>} records
 * @returns {string}
 */
function exportRecordsToCsv(records) {
  const crmRows = mapRecordsToCrmRows(records);
  const lines = [CSV_HEADERS];

  for (const row of crmRows) {
    lines.push([
      row.roomNumber,
      row.pricePerSqm,
      row.currency,
      row.floor,
      row.entrance,
      row.area,
      row.status,
      row.rooms,
      row.complexName,
      row.houseName,
      row.description,
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
