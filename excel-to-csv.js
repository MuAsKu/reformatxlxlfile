"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");

const { exportRecordsToCsv } = require("./src/csv-exporter");
const { parseWorkbookFile } = require("./src/parser");

/**
 *
 * @returns {Promise<void>}
 */
async function main() {
  const { inputPath, outputPath } = getCliArgs(process.argv.slice(2));

  if (!inputPath) {
    printHelp();
    process.exitCode = 1;
    return;
  }

  await validateInputFile(inputPath);

  const records = await parseWorkbookFile(inputPath);
  const csv = exportRecordsToCsv(records);
  await fs.writeFile(outputPath, csv, "utf8");

  console.log(`Готово: найдено ${records.length} квартир.`);
  console.log(`CSV сохранен в: ${outputPath}`);

  if (records.length === 0) {
    console.log(
      "Подсказка: файл успешно прочитан, но подходящие обозначения квартир не найдены.",
    );
  }
}

/**
 *
 * @param {string[]} args
 * @returns {{ inputPath: string, outputPath: string }}
 */
function getCliArgs(args) {
  const inputPath = args[0] ? path.resolve(args[0]) : "";
  const outputPath = args[1]
    ? path.resolve(args[1])
    : inputPath
      ? path.join(
          path.dirname(inputPath),
          `${path.basename(inputPath, path.extname(inputPath))}.csv`,
        )
      : "";

  return { inputPath, outputPath };
}

/**
 *
 * @param {string} inputPath
 * @returns {Promise<void>}
 */
function validateInputFile(inputPath) {
  if (path.extname(inputPath).toLowerCase() !== ".xlsx") {
    throw new Error("Поддерживается только формат .xlsx");
  }

  return fs.access(inputPath);
}

function printHelp() {
  console.log("Использование:");
  console.log("  node excel-to-csv.js <input.xlsx> [output.csv]");
  console.log("");
  console.log("Что делает скрипт:");
  console.log("  - ищет квартиры по всему листу (Кв-1, КВ12, apt 15 и т.д.)");
  console.log("  - анализирует соседний контекст без привязки к координатам");
  console.log("  - определяет статус по цвету ячейки");
  console.log("  - экспортирует результат в CSV");
  console.log("");
  console.log("Статусы по цвету:");
  console.log("  Белый / без заливки -> Свободен");
  console.log("  Синий -> Забронировано");
  console.log("  Фиолетовый -> Недоступно");
}

main().catch((error) => {
  console.error("Ошибка при обработке Excel:", error.message);
  process.exitCode = 1;
});
// команда запуска: node excel-to-csv.js "ваш-файл.xlsx"
