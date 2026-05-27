import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

function normKey(s){
  return String(s ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '');
}

const file = process.argv[2] || path.resolve(process.cwd(), 'test_import.xlsx');
if(!fs.existsSync(file)){
  console.error('File not found:', file);
  process.exit(2);
}

const buf = fs.readFileSync(file);
const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
console.log('Workbook sheets:', wb.SheetNames.join(', '));

for(const name of wb.SheetNames){
  const sh = wb.Sheets[name];
  const rows = XLSX.utils.sheet_to_json(sh, { header: 1, defval: '', raw: true });
  console.log('\n--- Sheet:', name, '---');
  const previewRows = rows.slice(0, 8);
  previewRows.forEach((r, idx) => {
    const cells = (r||[]).map(c => String(c ?? '').replace(/\n/g,' ') .slice(0,80));
    console.log(`[r${idx}] ${cells.join(' | ')}`);
  });
  // show normalized candidate header for each of these rows
  console.log('\nNormalized candidates:');
  previewRows.forEach((r, idx) => {
    const keys = (r||[]).map(c => normKey(c));
    console.log(`[r${idx}] ${keys.join(' | ')}`);
  });
}
