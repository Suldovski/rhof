import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

function normKey(s){
  return String(s ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function parseAnyDate(v){
  if (!v) return '';
  if (v instanceof Date) return v.toISOString().slice(0,10);
  const s = String(v).trim();
  const br = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (br){ const [,d,m,y]=br; const yy = y.length===2?`20${y}`:y; return `${yy}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`; }
  const iso = s.match(/^\d{4}-\d{2}-\d{2}/);
  if (iso) return s.slice(0,10);
  return '';
}

function parseNumberBR(v){
  if (typeof v === 'number') return v;
  if (v==null) return 0;
  const s = String(v).replace(/[R$\s]/g,'').replace(/\./g,'').replace(',', '.');
  const n = parseFloat(s);
  return isFinite(n)?n:0;
}

const file = process.argv[2] || path.resolve(process.cwd(), 'test_import.xlsx');
if(!fs.existsSync(file)){
  console.error('File not found:', file);
  process.exit(2);
}
const buf = fs.readFileSync(file);
const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
console.log('Sheets:', wb.SheetNames.join(', '));

let found = false;
for(const name of wb.SheetNames){
  const sh = wb.Sheets[name];
  const rows = XLSX.utils.sheet_to_json(sh, { header:1, defval:'', raw:true });
  console.log('\n--- Sheet:', name, 'rows:', rows.length, '---');
  // try to detect header in first 50 rows
  let headerIdx = -1;
  let bestScore = 0;
  const nameIndicators = ['nome','name','funcionario','employee','colaborador','nomecompleto','fullname'];
  const cpfIndicators = ['cpf','documento','cpfcnpj'];
  for(let i=0;i<Math.min(50, rows.length); i++){
    const keys = (rows[i]||[]).map(normKey);
    const hasName = keys.some(k=>nameIndicators.some(t=>k.includes(t)));
    const hasCpf = keys.some(k=>cpfIndicators.some(t=>k.includes(t)));
    const score = (hasName?4:0) + (hasCpf?2:0) + (keys.some(k=>k.includes('obra'))?1:0) + (keys.some(k=>k.includes('funcao')||k==='cargo')?1:0) + (keys.some(k=>k.includes('admiss'))?1:0);
    if(score>bestScore){ bestScore=score; headerIdx=i; }
  }
  if(headerIdx<0 || bestScore<2){
    console.log('No header detected in this sheet (bestScore=',bestScore,'). Preview first 5 rows:');
    rows.slice(0,5).forEach((r,idx)=> console.log(`[r${idx}]`, (r||[]).map(c=>String(c).slice(0,80)).join(' | ')));
    continue;
  }
  found = true;
  console.log('Detected header at row', headerIdx, 'score', bestScore);
  const headers = (rows[headerIdx]||[]).map(normKey);
  console.log('Normalized headers:', headers.join(' | '));
  // find columns
  function findCol(terms){
    for(let i=0;i<headers.length;i++){ const h=headers[i]; if(!h) continue; if(terms.some(t=>h===t||h.includes(t))) return i; } return -1;
  }
  const col = {
    id: findCol(['re','matricula','matricula','id']),
    name: findCol(['nome','name','funcionario','employee','colaborador','fullname']),
    cpf: findCol(['cpf','documento','cpfcnpj']),
    nasc: findCol(['datanasc','nascimento']),
    admission: findCol(['dataadmissao','datadeadmissao','admissao']),
    role: findCol(['funcao','cargo','cbo']),
    site: findCol(['obra','site','canteiro']),
    salHora: findCol(['salariohora','salhora','hora']),
    salMensal: findCol(['salariomensal','salmensal','mensal','salario']),
    status: findCol(['situacao','status']),
  };
  console.log('Mapped cols:', col);
  // parse rows
  const parsed=[];
  for(let i=headerIdx+1;i<rows.length;i++){
    const row=rows[i]; if(!row || row.every(c=>c==='')) continue;
    const name = col.name>=0?String(row[col.name]||'').trim():'';
    if(!name) continue;
    const obj={
      id: col.id>=0?String(row[col.id]||'').trim():undefined,
      name,
      cpf: col.cpf>=0?String(row[col.cpf]||'').trim():'',
      nascimento: col.nasc>=0?parseAnyDate(row[col.nasc]):'',
      admission: col.admission>=0?parseAnyDate(row[col.admission]):'',
      role: col.role>=0?String(row[col.role]||'').trim():'',
      site: col.site>=0?String(row[col.site]||'').trim():'',
      salarioHora: col.salHora>=0?parseNumberBR(row[col.salHora]):0,
      salarioMensal: col.salMensal>=0?parseNumberBR(row[col.salMensal]):0,
      status: col.status>=0?String(row[col.status]||'').trim():'',
    };
    parsed.push(obj);
  }
  console.log('Parsed rows:', parsed.length);
  console.log('Sample:', parsed.slice(0,5));
}
if(!found) process.exit(1);
