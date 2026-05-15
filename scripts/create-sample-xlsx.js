"use strict";

const path = require("node:path");
const ExcelJS = require("exceljs");

async function main() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Шахматка");

  sheet.getCell("A1").value = "ЖК Энесай";
  sheet.getCell("A2").value = "Дом A";

  const floors = [
    { floor: 8, apartments: buildFloorApartments(1) },
    { floor: 9, apartments: buildFloorApartments(9) },
    { floor: 10, apartments: buildFloorApartments(17) },
  ];

  let row = 4;
  for (const floorData of floors) {
    sheet.getCell(`A${row}`).value = `${floorData.floor} этаж`;
    row += 1;

    for (const [index, apartment] of floorData.apartments.entries()) {
      const section = index < 4 ? "A" : "Б";
      sheet.getCell(`B${row}`).value = `Кв-${apartment.number}`;
      sheet.getCell(`C${row}`).value = `${apartment.area} м2`;
      sheet.getCell(`D${row}`).value = `${apartment.rooms} ком`;
      sheet.getCell(`E${row}`).value = section;
      sheet.getCell(`F${row}`).value = "Подъезд 1";
      row += 1;
    }

    row += 1;
  }

  const outputPath = path.resolve(__dirname, "..", "sample-input.xlsx");
  await workbook.xlsx.writeFile(outputPath);
  console.log(outputPath);
}

function buildFloorApartments(startNumber) {
  const template = [
    { area: "104.62", rooms: 3 },
    { area: "59.12", rooms: 2 },
    { area: "82.12", rooms: 2 },
    { area: "136.21", rooms: 4 },
    { area: "136.21", rooms: 4 },
    { area: "82.12", rooms: 2 },
    { area: "59.12", rooms: 2 },
    { area: "104.62", rooms: 3 },
  ];

  return template.map((item, index) => ({
    number: startNumber + index,
    ...item,
  }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
