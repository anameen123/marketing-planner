// Phase 110 (2026-05-28) — scan CLINIC_BANK + MVA_ATTORNEYS + OUTREACH
// for entries with no street address. Build an Excel workbook with one
// sheet per bank type so the recipient can fill the missing addresses
// + we can re-ingest later.
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const SRC = path.join(__dirname, '..', 'marketing_schedule_FINAL4.html');
const html = fs.readFileSync(SRC, 'utf8');

// ── Extract a top-level array literal from the HTML by name ──────────
// Walks brace+bracket depth so we don't trip over nested arrays/objects
// or strings containing brackets.
function extractArrayLiteral(name){
  const declRe = new RegExp('var\\s+' + name + '\\s*=\\s*\\[', 'g');
  const m = declRe.exec(html);
  if(!m) throw new Error('Could not find ' + name);
  let i = m.index + m[0].length - 1;  // position of the opening '['
  let depth = 0, inStr = false, esc = false, q = '';
  for(; i < html.length; i++){
    const ch = html[i];
    if(inStr){
      if(esc){ esc = false; continue; }
      if(ch === '\\'){ esc = true; continue; }
      if(ch === q){ inStr = false; }
      continue;
    }
    if(ch === '"' || ch === "'"){ inStr = true; q = ch; continue; }
    if(ch === '[' || ch === '{') depth++;
    else if(ch === ']' || ch === '}'){
      depth--;
      if(depth === 0){
        const literal = html.slice(m.index + m[0].length - 1, i + 1);
        // Use Function() to safely evaluate the literal (no side effects)
        return new Function('return ' + literal)();
      }
    }
  }
  throw new Error('Unterminated ' + name);
}

const CLINIC_BANK     = extractArrayLiteral('CLINIC_BANK');
const MVA_ATTORNEYS   = extractArrayLiteral('MVA_ATTORNEYS');
let   OUTREACH        = [];
try { OUTREACH = extractArrayLiteral('OUTREACH'); } catch(_){}

// ── "Has real address" heuristic ─────────────────────────────────────
// Real = street number + city/state OR explicit comma-separated parts.
// Just "Frisco, TX" or "Plano" is NOT a real street address.
function hasRealAddress(addr){
  if(!addr || typeof addr !== 'string') return false;
  const s = addr.trim();
  if(s.length < 12) return false;                      // too short
  // Must start with a number (street number) OR have a "Suite/Ste/Unit" token
  if(!/^\d/.test(s) && !/(Suite|Ste\.?|Unit|#)\s*\d/i.test(s)) return false;
  // Must contain at least one comma (so it's not just "8000 Preston Rd")
  if(!s.includes(',')) return false;
  return true;
}

const clinicMissing = CLINIC_BANK.filter(c => !hasRealAddress(c.address));
const mvaMissing    = MVA_ATTORNEYS.filter(m => !hasRealAddress(m.address));
const outreachMissing = OUTREACH.filter(o => !hasRealAddress(o.address));

const clinicHave    = CLINIC_BANK.length - clinicMissing.length;
const mvaHave       = MVA_ATTORNEYS.length - mvaMissing.length;
const outreachHave  = OUTREACH.length - outreachMissing.length;

console.log('── Address completeness audit ──────────────────────────────');
console.log('CLINIC_BANK    : ' + clinicHave + ' / ' + CLINIC_BANK.length    + ' have real addresses · ' + clinicMissing.length    + ' missing');
console.log('MVA_ATTORNEYS  : ' + mvaHave    + ' / ' + MVA_ATTORNEYS.length  + ' have real addresses · ' + mvaMissing.length      + ' missing');
console.log('OUTREACH       : ' + outreachHave + ' / ' + OUTREACH.length     + ' have real addresses · ' + outreachMissing.length + ' missing');

// ── Build the Excel workbook ─────────────────────────────────────────
const wb = new ExcelJS.Workbook();
wb.creator = 'WCG Marketing Planner — Phase 110 address audit';
wb.created = new Date();

function addSheet(name, header, rows){
  const ws = wb.addWorksheet(name);
  ws.columns = header;
  rows.forEach(r => ws.addRow(r));
  // Style header row
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };
  ws.getRow(1).height = 22;
  ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'left' };
  // Auto-filter
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: header.length } };
  // Freeze first row
  ws.views = [{ state: 'frozen', ySplit: 1 }];
}

addSheet('Clinics — missing address', [
  { header: 'Clinic Name',          key: 'name',     width: 38 },
  { header: 'Specialty',            key: 'spec',     width: 14 },
  { header: 'Doctor',               key: 'doc',      width: 28 },
  { header: 'City (best guess)',    key: 'city',     width: 16 },
  { header: 'Assigned member',      key: 'member',   width: 14 },
  { header: 'Current address text', key: 'curAddr',  width: 30 },
  { header: 'FILL: street address', key: 'newAddr',  width: 42 },
  { header: 'FILL: city',           key: 'newCity',  width: 18 },
  { header: 'FILL: state',          key: 'newState', width: 8  },
  { header: 'FILL: zip',            key: 'newZip',   width: 8  },
  { header: 'Notes',                key: 'notes',    width: 30 }
], clinicMissing.map(c => ({
  name: c.n || '', spec: c.s || '', doc: c.d || '', city: c.c || '',
  member: c.t || '', curAddr: c.address || '', notes: ''
})));

addSheet('MVA Attorneys — missing address', [
  { header: 'Firm',                 key: 'firm',     width: 38 },
  { header: 'Attorney',             key: 'attorney', width: 28 },
  { header: 'City',                 key: 'city',     width: 16 },
  { header: 'Phone',                key: 'phone',    width: 16 },
  { header: 'Current address text', key: 'curAddr',  width: 30 },
  { header: 'FILL: street address', key: 'newAddr',  width: 42 },
  { header: 'FILL: city',           key: 'newCity',  width: 18 },
  { header: 'FILL: state',          key: 'newState', width: 8  },
  { header: 'FILL: zip',            key: 'newZip',   width: 8  },
  { header: 'Notes',                key: 'notes',    width: 30 }
], mvaMissing.map(m => ({
  firm: m.firm || '', attorney: m.attorney || '', city: m.city || '',
  phone: m.phone || '', curAddr: m.address || '', notes: ''
})));

addSheet('Outreach — missing address', [
  { header: 'Org name',             key: 'name',     width: 38 },
  { header: 'Type',                 key: 'type',     width: 18 },
  { header: 'City',                 key: 'city',     width: 16 },
  { header: 'Contact',              key: 'contact',  width: 22 },
  { header: 'Current address text', key: 'curAddr',  width: 30 },
  { header: 'FILL: street address', key: 'newAddr',  width: 42 },
  { header: 'FILL: city',           key: 'newCity',  width: 18 },
  { header: 'FILL: state',          key: 'newState', width: 8  },
  { header: 'FILL: zip',            key: 'newZip',   width: 8  },
  { header: 'Notes',                key: 'notes',    width: 30 }
], outreachMissing.map(o => ({
  name: o.name || '', type: o.type || '', city: o.city || '',
  contact: o.contact || '', curAddr: o.address || '', notes: ''
})));

// Summary sheet — top
const summary = wb.addWorksheet('Summary', { properties: { tabColor: { argb: 'FF16A34A' } } });
summary.columns = [
  { header: 'Bank',     key: 'bank', width: 24 },
  { header: 'Total',    key: 'total', width: 10 },
  { header: 'Have addr',key: 'have', width: 12 },
  { header: 'Missing',  key: 'miss', width: 12 },
  { header: '% complete', key: 'pct', width: 14 }
];
function pct(have, total){ return total ? (have/total*100).toFixed(1) + '%' : '—'; }
summary.addRow({ bank: 'Clinics',       total: CLINIC_BANK.length,    have: clinicHave,    miss: clinicMissing.length,    pct: pct(clinicHave, CLINIC_BANK.length) });
summary.addRow({ bank: 'MVA attorneys', total: MVA_ATTORNEYS.length,  have: mvaHave,       miss: mvaMissing.length,       pct: pct(mvaHave, MVA_ATTORNEYS.length) });
summary.addRow({ bank: 'Outreach',      total: OUTREACH.length,       have: outreachHave,  miss: outreachMissing.length,  pct: pct(outreachHave, OUTREACH.length) });
summary.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
summary.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };

const today = new Date().toISOString().slice(0, 10);
const outPath = path.join(__dirname, '..', '_research', 'missing_addresses_' + today + '.xlsx');
// Ensure _research exists
const outDir = path.dirname(outPath);
if(!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
wb.xlsx.writeFile(outPath).then(() => {
  console.log('\n✓ Wrote ' + outPath);
  console.log('  Open it, fill the "FILL:" columns, send back — we re-ingest with a counterpart script.');
});
