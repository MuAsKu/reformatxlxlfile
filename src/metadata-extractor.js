"use strict";

const { normalizeSearchText, normalizeText } = require("./utils");

const COMPLEX_REGEXES = [
  /(?:^|[^\p{L}\p{N}_])(?:жк|жил(?:ой|ого)\s+комплекс)\s*[«"'«]?\s*([^»"'\n,;]+?)(?=$|[^\p{L}\p{N}_])/iu,
  /(?:^|[^\p{L}\p{N}_])комплекс\s+([^\n,;]+?)(?=$|[^\p{L}\p{N}_])/iu,
];

const HOUSE_REGEXES = [
  /(?:^|[^\p{L}\p{N}_])(?:дом|корпус|building)\s*[№#:.\-]?\s*([a-zа-яё0-9-]+)/iu,
  /(?:^|[^\p{L}\p{N}_])(?:блок|block)\s*[№#:.\-]?\s*([a-zа-яё0-9-]+)/iu,
];

/**
 * @param {Array<{ text: string, searchText: string }>} cells
 * @returns {{ complexName: string, houseName: string }}
 */
function extractSheetMetadata(cells) {
  let complexName = "";
  let houseName = "";

  for (const cell of cells) {
    if (!complexName) {
      complexName = matchFirstPattern(cell.text, COMPLEX_REGEXES);
    }
    if (!houseName) {
      houseName = matchFirstPattern(cell.text, HOUSE_REGEXES);
    }
    if (complexName && houseName) {
      break;
    }
  }

  return {
    complexName: cleanMetadataValue(complexName),
    houseName: cleanMetadataValue(houseName),
  };
}

/**
 * @param {string} text
 * @param {RegExp[]} patterns
 * @returns {string}
 */
function matchFirstPattern(text, patterns) {
  for (const pattern of patterns) {
    const match = normalizeText(text).match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return "";
}

/**
 * @param {string} value
 * @returns {string}
 */
function cleanMetadataValue(value) {
  return normalizeText(value)
    .replace(/^["'«]+|["'»]+$/g, "")
    .trim();
}

/**
 * @param {string} blockValue
 * @returns {string}
 */
function extractHouseFromBlock(blockValue) {
  const match = normalizeSearchText(blockValue).match(
    /(?:блок|block)\s*([a-zа-яё0-9-]+)/iu,
  );
  if (match?.[1]) {
    return cleanMetadataValue(match[1]);
  }

  const token = cleanMetadataValue(blockValue);
  if (/^[a-zа-яё0-9-]+$/iu.test(token)) {
    return token;
  }

  return "";
}

module.exports = {
  extractSheetMetadata,
  extractHouseFromBlock,
};
