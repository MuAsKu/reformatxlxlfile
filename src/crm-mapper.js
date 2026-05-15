"use strict";

const { STATUS_LABELS } = require("./constants");
const { extractHouseFromBlock } = require("./metadata-extractor");
const { parseLocalizedNumber } = require("./utils");

const DEFAULT_CURRENCY = "USD";
const DEFAULT_PRICE = "0";
const DEFAULT_ENTRANCE = "1";
const ROOMS_PER_SECTION = 4;

/**
 * @param {Array<{
 *   status: string,
 *   apartmentNumber: number,
 *   area: string,
 *   areaValue: number|null,
 *   type: string,
 *   floor: string,
 *   floorValue: number,
 *   block: string,
 *   entrance: string,
 *   complexName?: string,
 *   houseName?: string
 * }>} records
 * @returns {Array<{
 *   roomNumber: number,
 *   pricePerSqm: string,
 *   currency: string,
 *   floor: string,
 *   entrance: string,
 *   area: string,
 *   status: string,
 *   rooms: string,
 *   complexName: string,
 *   houseName: string,
 *   description: string
 * }>}
 */
function mapRecordsToCrmRows(records) {
  const groupedByFloor = groupRecordsByFloor(records);
  const crmRows = [];

  for (const floorRecords of groupedByFloor) {
    floorRecords.forEach((record, indexOnFloor) => {
      crmRows.push(buildCrmRow(record, indexOnFloor));
    });
  }

  return crmRows.map((row, index) => ({
    ...row,
    roomNumber: index + 1,
  }));
}

/**
 * @param {Array<object>} records
 * @returns {Array<Array<object>>}
 */
function groupRecordsByFloor(records) {
  const groups = new Map();

  for (const record of records) {
    const floorKey = String(record.floor || "");
    if (!groups.has(floorKey)) {
      groups.set(floorKey, []);
    }
    groups.get(floorKey).push(record);
  }

  return [...groups.entries()]
    .sort(([leftFloor], [rightFloor]) => {
      const leftValue = extractSortableNumber(leftFloor);
      const rightValue = extractSortableNumber(rightFloor);
      return leftValue - rightValue;
    })
    .map(([, floorRecords]) => floorRecords);
}

/**
 * @param {string} text
 * @returns {number}
 */
function extractSortableNumber(text) {
  const match = String(text || "").match(/-?\d+/);
  return match ? Number.parseInt(match[0], 10) : Number.MAX_SAFE_INTEGER;
}

/**
 * @param {object} record
 * @param {number} indexOnFloor
 * @returns {object}
 */
function buildCrmRow(record, indexOnFloor) {
  return {
    roomNumber: 0,
    pricePerSqm: DEFAULT_PRICE,
    currency: DEFAULT_CURRENCY,
    floor: record.floor || "",
    entrance: formatEntrance(record.entrance),
    area: formatArea(record.area, record.areaValue),
    status: mapStatusLabel(record.status),
    rooms: formatRoomCount(record.type),
    complexName: record.complexName || "",
    houseName: record.houseName || extractHouseFromBlock(record.block) || "",
    description: formatSectionDescription(indexOnFloor, record.section),
  };
}

/**
 * @param {string} status
 * @returns {string}
 */
function mapStatusLabel(status) {
  if (status === STATUS_LABELS.FREE_LEGACY || !status) {
    return STATUS_LABELS.FREE;
  }

  return status;
}

/**
 * @param {string} entrance
 * @returns {string}
 */
function formatEntrance(entrance) {
  const match = String(entrance || "").match(
    /(?:под[ъь]езд|entrance|entry|section|секция)\s*([a-zа-яё0-9-]+)/iu,
  );
  if (match?.[1]) {
    return match[1];
  }

  const token = String(entrance || "").trim();
  return token || DEFAULT_ENTRANCE;
}

/**
 * @param {string} area
 * @param {number|null} areaValue
 * @returns {string}
 */
function formatArea(area, areaValue) {
  const numeric =
    areaValue !== null && areaValue !== undefined && Number.isFinite(areaValue)
      ? areaValue
      : parseLocalizedNumber(area);

  if (numeric === null || !Number.isFinite(numeric)) {
    const fallback = String(area || "").replace(/\s*м2/giu, "").trim();
    return fallback.replace(".", ",");
  }

  return numeric.toFixed(2).replace(".", ",");
}

/**
 * @param {string} type
 * @returns {string}
 */
function formatRoomCount(type) {
  const text = String(type || "");
  if (/студ/i.test(text)) {
    return "0";
  }

  const match = text.match(/(\d+)/);
  return match ? match[1] : "";
}

/**
 * @param {number} indexOnFloor
 * @param {string} [section]
 * @returns {string}
 */
function formatSectionDescription(indexOnFloor, section) {
  const token = String(section || "").trim().toUpperCase();
  if (token === "A" || token === "А") {
    return "A";
  }
  if (token === "B" || token === "Б" || token === "В") {
    return "Б";
  }

  const sectionIndex = Math.floor(indexOnFloor / ROOMS_PER_SECTION);
  return sectionIndex % 2 === 0 ? "A" : "Б";
}

module.exports = {
  mapRecordsToCrmRows,
};
