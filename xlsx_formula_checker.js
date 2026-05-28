import fetch from 'node-fetch';
import * as XLSX from 'xlsx';

async function run() {
  const url = "https://docs.google.com/spreadsheets/d/142WIok3KoHt8UQ6bbeq37sWuQKvk3VD1vIbkafy0BeE/export?format=xlsx";
  try {
    const res = await fetch(url);
    const buffer = await res.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
    const sheet = workbook.Sheets['data'];
    
    console.log("Checking formulas in column Y (index 24) and around...");
    for (let r = 1; r < 20; r++) { // first 20 rows
      const cellRef = XLSX.utils.encode_cell({ r: r, c: 24 }); // Y is column 24
      const cell = sheet[cellRef];
      if (cell) {
        console.log(`Cell ${cellRef} (Row ${r+1}): value=${JSON.stringify(cell.v)}, formula=${cell.f ? JSON.stringify(cell.f) : 'none'}`);
      } else {
        console.log(`Cell ${cellRef} (Row ${r+1}): empty`);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

run();
