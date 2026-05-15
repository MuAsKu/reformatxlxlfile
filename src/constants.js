"use strict";

const APARTMENT_REGEX =
  /(?:^|[^\p{L}\p{N}_])(?:кв(?:артира)?|apt|apartment)\s*[-#:.,]?\s*(\d{1,5})(?=$|[^\p{L}\p{N}_])/iu;

const AREA_REGEX =
  /(\d+(?:[.,]\d+)?)\s*(?:м2|м²|m2|sqm|sq\.?\s*m|кв\.?\s*м)(?=$|[^\p{L}\p{N}_])/iu;

const TYPE_REGEXES = [
  /(?:^|[^\p{L}\p{N}_])([1-9])\s*(?:[-xх*]\s*)?(?:ком(?:нат(?:а|ы|ная|ные|ных)?)?|ком\.?|room|rooms|rm)(?=$|[^\p{L}\p{N}_])/iu,
  /(?:^|[^\p{L}\p{N}_])(студия|studio)(?=$|[^\p{L}\p{N}_])/iu,
];

const FLOOR_REGEXES = [
  /(?:^|[^\p{L}\p{N}_])(-?\d{1,2})\s*[-–]?\s*(?:этаж|этажа|floor|fl|level|lvl)(?=$|[^\p{L}\p{N}_])/iu,
  /(?:этаж|floor|fl|level|lvl)\s*[-–:#]?\s*(-?\d{1,2})(?=$|[^\p{L}\p{N}_])/iu,
];

const BLOCK_REGEX =
  /(?:^|[^\p{L}\p{N}_])(?:блок|block)\s*[№#:-]?\s*([a-zа-я0-9-]+)/iu;

const ENTRANCE_REGEX =
  /(?:^|[^\p{L}\p{N}_])(?:под[ъь]езд|entrance|entry|section|секция)\s*[№#:-]?\s*([a-zа-я0-9-]+)/iu;

const STATUS_LABELS = {
  FREE: "Свободно",
  FREE_LEGACY: "Свободен",
  RESERVED: "Забронировано",
  UNAVAILABLE: "Недоступно",
};

const CSV_HEADERS = [
  "Номер помещения",
  "Цена за м2",
  "Валюта",
  "Этаж",
  "Название подъезда",
  "Общая площадь, м2",
  "Статус",
  "Кол-во комнат",
  "Название ЖК",
  "Название дома",
  "Описание помещения",
];

const FIELD_SCORING_RULES = {
  area: {
    baseScore: 120,
    rowPenalty: 18,
    colPenalty: 10,
    rowOverlapBonus: 10,
    colOverlapBonus: 36,
    sameRowBonus: 8,
    sameColumnBonus: 24,
    aboveBonus: 24,
    belowPenalty: 8,
    leftBonus: 0,
    rightBonus: 0,
    hiddenPenalty: 6,
    compactTextBonus: 3,
    minimumScore: 42,
  },
  type: {
    baseScore: 118,
    rowPenalty: 18,
    colPenalty: 10,
    rowOverlapBonus: 10,
    colOverlapBonus: 32,
    sameRowBonus: 8,
    sameColumnBonus: 24,
    aboveBonus: 22,
    belowPenalty: 8,
    leftBonus: 0,
    rightBonus: 0,
    hiddenPenalty: 6,
    compactTextBonus: 3,
    minimumScore: 40,
  },
  floor: {
    baseScore: 125,
    rowPenalty: 40,
    colPenalty: 8,
    rowOverlapBonus: 42,
    colOverlapBonus: 8,
    sameRowBonus: 36,
    sameColumnBonus: 0,
    aboveBonus: 0,
    belowPenalty: 0,
    leftBonus: 18,
    rightBonus: 2,
    hiddenPenalty: 4,
    compactTextBonus: 5,
    minimumScore: 48,
  },
  block: {
    baseScore: 100,
    rowPenalty: 16,
    colPenalty: 14,
    rowOverlapBonus: 0,
    colOverlapBonus: 24,
    sameRowBonus: 0,
    sameColumnBonus: 10,
    aboveBonus: 34,
    belowPenalty: 18,
    leftBonus: 6,
    rightBonus: 6,
    hiddenPenalty: 4,
    compactTextBonus: 2,
    minimumScore: 26,
  },
  entrance: {
    baseScore: 98,
    rowPenalty: 16,
    colPenalty: 14,
    rowOverlapBonus: 0,
    colOverlapBonus: 22,
    sameRowBonus: 0,
    sameColumnBonus: 10,
    aboveBonus: 30,
    belowPenalty: 16,
    leftBonus: 6,
    rightBonus: 6,
    hiddenPenalty: 4,
    compactTextBonus: 2,
    minimumScore: 24,
  },
  section: {
    baseScore: 96,
    rowPenalty: 14,
    colPenalty: 12,
    rowOverlapBonus: 8,
    colOverlapBonus: 28,
    sameRowBonus: 12,
    sameColumnBonus: 18,
    aboveBonus: 20,
    belowPenalty: 10,
    leftBonus: 4,
    rightBonus: 4,
    hiddenPenalty: 4,
    compactTextBonus: 4,
    minimumScore: 22,
  },
};

const SECTION_REGEX =
  /^(?:секция|секции|описание|планировка)?\s*([абaб])(?:\s*тип)?$/iu;

module.exports = {
  APARTMENT_REGEX,
  AREA_REGEX,
  TYPE_REGEXES,
  FLOOR_REGEXES,
  BLOCK_REGEX,
  ENTRANCE_REGEX,
  SECTION_REGEX,
  STATUS_LABELS,
  CSV_HEADERS,
  FIELD_SCORING_RULES,
};
