"use strict";

const {
  AREA_REGEX,
  BLOCK_REGEX,
  ENTRANCE_REGEX,
  FIELD_SCORING_RULES,
  FLOOR_REGEXES,
  TYPE_REGEXES,
} = require("./constants");
const { getSpatialRelation, parseLocalizedNumber } = require("./utils");

/**
 *
 * @param {{ cells: Array<object> }} sheetModel
 * @returns {{
 *   analyzeApartment: (apartmentCell: object) => {
 *     area: string,
 *     type: string,
 *     floor: string,
 *     block: string,
 *     entrance: string
 *   }
 * }}
 */
function createContextAnalyzer(sheetModel) {
  const candidateIndex = buildCandidateIndex(sheetModel.cells);

  return {
    analyzeApartment(apartmentCell) {
      return {
        area: pickBestValue(apartmentCell, candidateIndex.area, "area"),
        type: pickBestValue(apartmentCell, candidateIndex.type, "type"),
        floor: pickBestValue(apartmentCell, candidateIndex.floor, "floor"),
        block: pickBestValue(apartmentCell, candidateIndex.block, "block"),
        entrance: pickBestValue(apartmentCell, candidateIndex.entrance, "entrance"),
      };
    },
  };
}

/**
 * @param {Array<object>} cells
 * @returns {{
 *   area: Array<object>,
 *   type: Array<object>,
 *   floor: Array<object>,
 *   block: Array<object>,
 *   entrance: Array<object>
 * }}
 */
function buildCandidateIndex(cells) {
  const candidateIndex = {
    area: [],
    type: [],
    floor: [],
    block: [],
    entrance: [],
  };

  for (const cell of cells) {
    for (const candidate of extractCandidatesFromCell(cell)) {
      candidateIndex[candidate.field].push(candidate);
    }
  }

  return candidateIndex;
}

/**
 * @param {object} apartmentCell
 * @param {Array<object>} candidates
 * @param {"area"|"type"|"floor"|"block"|"entrance"} field
 * @returns {string}
 */
function pickBestValue(apartmentCell, candidates, field) {
  const rules = FIELD_SCORING_RULES[field];
  let bestCandidate = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const candidate of candidates) {
    const score = scoreCandidate(apartmentCell, candidate, field, rules);
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  if (!bestCandidate || bestScore < rules.minimumScore) {
    return "";
  }

  return bestCandidate.value;
}

/**
 * @param {object} apartmentCell
 * @param {object} candidate
 * @param {"area"|"type"|"floor"|"block"|"entrance"} field
 * @param {object} rules
 * @returns {number}
 */
function scoreCandidate(apartmentCell, candidate, field, rules) {
  const relation = getSpatialRelation(apartmentCell.range, candidate.cell.range);
  let score = rules.baseScore;

  score -= relation.rowGap * rules.rowPenalty;
  score -= relation.colGap * rules.colPenalty;

  if (relation.rowOverlap) {
    score += rules.rowOverlapBonus;
  }
  if (relation.colOverlap) {
    score += rules.colOverlapBonus;
  }
  if (relation.sameRow) {
    score += rules.sameRowBonus;
  }
  if (relation.sameColumn) {
    score += rules.sameColumnBonus;
  }
  if (relation.isAbove) {
    score += rules.aboveBonus;
  }
  if (relation.isBelow) {
    score -= rules.belowPenalty;
  }
  if (relation.isLeft) {
    score += rules.leftBonus;
  }
  if (relation.isRight) {
    score += rules.rightBonus;
  }

  if (candidate.cell.hiddenRow || candidate.cell.hiddenCol) {
    score -= rules.hiddenPenalty;
  }

  if (candidate.cell.address === apartmentCell.address) {
    score -= 35;
  }

  if (candidate.cell.text.length <= 24) {
    score += rules.compactTextBonus;
  }

  score += getFieldSpecificBonus(apartmentCell, candidate, field, relation);

  return score;
}

/**
 * @param {object} apartmentCell
 * @param {object} candidate
 * @param {"area"|"type"|"floor"|"block"|"entrance"} field
 * @param {ReturnType<typeof getSpatialRelation>} relation
 * @returns {number}
 */
function getFieldSpecificBonus(apartmentCell, candidate, field, relation) {
  const searchText = candidate.cell.searchText;
  const rangeWidth = candidate.cell.range.right - candidate.cell.range.left + 1;

  if (field === "area") {
    let bonus = 0;
    if (/ком|room|studio|студ/i.test(searchText)) {
      bonus += 8;
    }
    if (relation.colOverlap && relation.isAbove) {
      bonus += 10;
    }
    return bonus;
  }

  if (field === "type") {
    let bonus = 0;
    if (AREA_REGEX.test(candidate.cell.text)) {
      bonus += 8;
    }
    if (relation.colOverlap && relation.isAbove) {
      bonus += 8;
    }
    return bonus;
  }

  if (field === "floor") {
    let bonus = 0;
    if (/этаж|floor|level|lvl/.test(searchText)) {
      bonus += 16;
    }
    if (relation.rowOverlap && relation.isLeft) {
      bonus += 16;
    }
    return bonus;
  }

  if (field === "block") {
    let bonus = 0;
    if (/блок|block/.test(searchText)) {
      bonus += 16;
    }
    if (relation.isAbove && relation.colOverlap) {
      bonus += 12;
    }
    if (rangeWidth > 1) {
      bonus += 6;
    }
    return bonus;
  }

  if (field === "entrance") {
    let bonus = 0;
    if (/под[ъь]езд|entrance|entry|section|секция/.test(searchText)) {
      bonus += 16;
    }
    if (relation.isAbove && relation.colOverlap) {
      bonus += 10;
    }
    if (rangeWidth > 1) {
      bonus += 4;
    }
    return bonus;
  }

  return 0;
}

/**
 * @param {object} cell
 * @returns {Array<object>}
 */
function extractCandidatesFromCell(cell) {
  const candidates = [];
  const areaCandidate = extractAreaCandidate(cell);
  if (areaCandidate) {
    candidates.push(areaCandidate);
  }

  const typeCandidate = extractTypeCandidate(cell);
  if (typeCandidate) {
    candidates.push(typeCandidate);
  }

  const floorCandidate = extractFloorCandidate(cell);
  if (floorCandidate) {
    candidates.push(floorCandidate);
  }

  const blockCandidate = extractBlockCandidate(cell);
  if (blockCandidate) {
    candidates.push(blockCandidate);
  }

  const entranceCandidate = extractEntranceCandidate(cell);
  if (entranceCandidate) {
    candidates.push(entranceCandidate);
  }

  return candidates;
}

/**
 * @param {object} cell
 * @returns {object|null}
 */
function extractAreaCandidate(cell) {
  const match = cell.text.match(AREA_REGEX);
  if (!match) {
    return null;
  }

  const numericValue = parseLocalizedNumber(match[1]);
  return {
    field: "area",
    value: `${match[1].replace(".", ",")} м2`,
    numericValue,
    cell,
  };
}

/**
 * @param {object} cell
 * @returns {object|null}
 */
function extractTypeCandidate(cell) {
  for (const regex of TYPE_REGEXES) {
    const match = cell.text.match(regex);
    if (!match) {
      continue;
    }

    const value =
      /студ/i.test(match[0]) || /studio/i.test(match[0])
        ? "Студия"
        : `${match[1]} ком`;

    return {
      field: "type",
      value,
      numericValue: /^\d+/.test(value) ? Number.parseInt(value, 10) : 0,
      cell,
    };
  }

  return null;
}

/**
 * @param {object} cell
 * @returns {object|null}
 */
function extractFloorCandidate(cell) {
  for (const regex of FLOOR_REGEXES) {
    const match = cell.text.match(regex);
    if (!match) {
      continue;
    }

    return {
      field: "floor",
      value: String(Number.parseInt(match[1], 10)),
      numericValue: Number.parseInt(match[1], 10),
      cell,
    };
  }

  return null;
}

/**
 * @param {object} cell
 * @returns {object|null}
 */
function extractBlockCandidate(cell) {
  const match = cell.text.match(BLOCK_REGEX);
  if (!match) {
    return null;
  }

  const token = cleanIdentifier(match[1]);
  return {
    field: "block",
    value: `Блок ${token}`,
    cell,
  };
}

/**
 * @param {object} cell
 * @returns {object|null}
 */
function extractEntranceCandidate(cell) {
  const match = cell.text.match(ENTRANCE_REGEX);
  if (!match) {
    return null;
  }

  const token = cleanIdentifier(match[1]);
  return {
    field: "entrance",
    value: `Подъезд ${token}`,
    cell,
  };
}

/**
 * @param {string} value
 * @returns {string}
 */
function cleanIdentifier(value) {
  return String(value).replace(/[()]/g, "").trim().toUpperCase();
}

module.exports = {
  createContextAnalyzer,
};
