// Generate a PDF report of all clinics + MVAs in the bank, showing which
// have verified street addresses, which are city-level placeholders, and
// which are TBD/missing. Saved to the user's Downloads folder.
//
// Run: node _tooling/generate_addresses_pdf.js
const fs = require('fs');
const path = require('path');
const os = require('os');
const { chromium } = require('playwright');

const HTML_FILE = path.join(__dirname, '..', 'marketing_schedule_FINAL4.html');
const OUT_DIR   = path.join(os.homedir(), 'Downloads');
const OUT_PDF   = path.join(OUT_DIR, 'Bank of Visits addresses data.pdf');

function extractArray(src, marker){
  // marker like "var CLINIC_BANK = ["
  const start = src.indexOf(marker);
  if(start < 0) throw new Error('Marker not found: ' + marker);
  // walk forward, find matching ] for the [
  const arrStart = src.indexOf('[', start);
  let depth = 0;
  let end = -1;
  for(let i = arrStart; i < src.length; i++){
    const c = src[i];
    if(c === '[') depth++;
    else if(c === ']'){
      depth--;
      if(depth === 0){ end = i + 1; break; }
    }
  }
  if(end < 0) throw new Error('Could not find closing bracket for: ' + marker);
  let jsonStr = src.slice(arrStart, end);
  // Strip JS comments (// line comments only — block comments aren't used in
  // the banks) so JSON.parse works. Mindful of // inside string values, but
  // the bank values don't contain "//" so a line-comment regex is safe.
  jsonStr = jsonStr.replace(/^\s*\/\/.*$/gm, '');
  // Also strip trailing commas before ] or }
  jsonStr = jsonStr.replace(/,(\s*[\]}])/g, '$1');
  return JSON.parse(jsonStr);
}

const src = fs.readFileSync(HTML_FILE, 'utf8');
const clinics = extractArray(src, 'var CLINIC_BANK = [');
const mvas    = extractArray(src, 'var MVA_ATTORNEYS = [');

// "Verified" = has a real street address in the literal (the agent's bulk
// research). City-placeholder pattern looks like "Frisco, TX 75034" or just
// "Frisco, TX" — i.e. nothing before the city. Street addresses start with
// a number OR contain comma-separated parts where the first one is non-city.
function looksLikeStreet(addr){
  if(!addr) return false;
  const s = String(addr).trim();
  if(!s || s === 'TBD') return false;
  // Pure city placeholder: starts with city name and ends with ", TX [zip]" with no street
  // Heuristic: must contain a digit (street number) AND a comma
  if(!/\d/.test(s)) return false;
  if(!s.includes(',')) return false;
  // Reject pure "City, TX 12345" — no street number means it's a placeholder
  // (street numbers come BEFORE the first comma in real addresses)
  const beforeComma = s.split(',')[0].trim();
  if(!/\d/.test(beforeComma)) return false;
  return true;
}
function bucket(entry){
  const addr = entry.address;
  if(looksLikeStreet(addr)) return 'verified';
  if(addr && addr.trim() && addr !== 'TBD') return 'placeholder';
  return 'missing';
}

const clinicByBucket = { verified: [], placeholder: [], missing: [] };
clinics.forEach(c => clinicByBucket[bucket(c)].push(c));

const mvaByBucket = { verified: [], placeholder: [], missing: [] };
mvas.forEach(m => mvaByBucket[bucket(m)].push(m));

// Sort each bucket: by city, then name
function sortBy(arr, nameField, cityField){
  arr.sort((a, b) => {
    const cityA = (a[cityField] || '').toLowerCase();
    const cityB = (b[cityField] || '').toLowerCase();
    if(cityA !== cityB) return cityA.localeCompare(cityB);
    const nA = (a[nameField] || '').toLowerCase();
    const nB = (b[nameField] || '').toLowerCase();
    return nA.localeCompare(nB);
  });
}
['verified', 'placeholder', 'missing'].forEach(k => {
  sortBy(clinicByBucket[k], 'n', 'c');
  sortBy(mvaByBucket[k], 'firm', 'city');
});

function esc(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

const sections = [];
function pushSection(title, rows, hint){
  if(rows.length === 0){
    sections.push(`<section><h2>${esc(title)} <span class="count">0</span></h2><p class="hint empty">No entries.</p></section>`);
    return;
  }
  const tableRows = rows.map(r => {
    const name = r.n || r.firm || '—';
    const city = r.c || r.city || '—';
    const detail = r.s || r.d || '';
    const address = r.address && r.address.trim() ? r.address : '<em>—</em>';
    return `<tr><td>${esc(name)}</td><td>${esc(city)}</td><td>${esc(detail)}</td><td class="addr">${address}</td></tr>`;
  }).join('\n');
  sections.push(`<section>
    <h2>${esc(title)} <span class="count">${rows.length}</span></h2>
    ${hint ? `<p class="hint">${esc(hint)}</p>` : ''}
    <table>
      <thead><tr><th>Name</th><th>City</th><th>Detail</th><th>Address</th></tr></thead>
      <tbody>${tableRows}</tbody>
    </table>
  </section>`);
}

const now = new Date();
const dateStr = now.toLocaleString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit' });

const totalClinic = clinics.length;
const totalMva = mvas.length;
const verClinic = clinicByBucket.verified.length;
const phClinic  = clinicByBucket.placeholder.length;
const missClinic = clinicByBucket.missing.length;
const verMva = mvaByBucket.verified.length;
const phMva  = mvaByBucket.placeholder.length;
const missMva = mvaByBucket.missing.length;

pushSection('Clinics — Verified street addresses', clinicByBucket.verified, 'Confirmed by web research; Google Maps will navigate to the actual building.');
pushSection('Clinics — City placeholder only (NOT verified)', clinicByBucket.placeholder, 'Address field has a city-level fallback (e.g. "Frisco, TX 75034"). Google Maps will search for the clinic name.');
pushSection('Clinics — Missing / TBD', clinicByBucket.missing, 'No address at all. Needs manual research or removal.');

pushSection('MVA Attorneys — Verified street addresses', mvaByBucket.verified);
pushSection('MVA Attorneys — City placeholder only', mvaByBucket.placeholder);
pushSection('MVA Attorneys — Missing / TBD', mvaByBucket.missing, 'No address — needs manual research.');

const html = `<!doctype html>
<html><head>
<meta charset="utf-8">
<title>Bank of Visits — Addresses Data</title>
<style>
  @page { size: letter; margin: 0.5in; }
  body { font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; color: #1F3864; font-size: 10px; line-height: 1.4; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  .meta { color: #64748b; font-size: 11px; margin-bottom: 14px; }
  .summary { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; margin-bottom: 20px; }
  .summary table { width: 100%; border-collapse: collapse; font-size: 11px; }
  .summary th, .summary td { text-align: left; padding: 4px 8px; }
  .summary th { color: #64748b; text-transform: uppercase; letter-spacing: .04em; font-size: 9px; }
  .summary .ok    { color: #16a34a; font-weight: 700; }
  .summary .warn  { color: #d97706; font-weight: 700; }
  .summary .miss  { color: #dc2626; font-weight: 700; }
  section { page-break-inside: avoid; margin-bottom: 18px; }
  h2 { font-size: 14px; margin: 12px 0 6px; border-bottom: 2px solid #7030A0; padding-bottom: 3px; color: #1F3864; }
  h2 .count { float: right; color: #64748b; font-weight: 400; font-size: 12px; }
  .hint { color: #64748b; font-size: 9px; font-style: italic; margin: 0 0 6px; }
  .hint.empty { color: #94a3b8; }
  table { width: 100%; border-collapse: collapse; font-size: 9px; }
  th { background: #f1f5f9; color: #475569; text-align: left; padding: 4px 6px; border-bottom: 1px solid #cbd5e1; }
  td { padding: 3px 6px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  td.addr { color: #1F3864; }
  em { color: #94a3b8; font-style: italic; }
</style>
</head><body>
<h1>Bank of Visits — Addresses Data</h1>
<div class="meta">Generated ${esc(dateStr)} · Source: <code>marketing_schedule_FINAL4.html</code></div>
<div class="summary">
  <table>
    <thead><tr><th>Bank</th><th>Total</th><th>Verified</th><th>City placeholder</th><th>Missing / TBD</th></tr></thead>
    <tbody>
      <tr>
        <td><b>Clinics</b></td>
        <td>${totalClinic}</td>
        <td class="ok">${verClinic}</td>
        <td class="warn">${phClinic}</td>
        <td class="miss">${missClinic}</td>
      </tr>
      <tr>
        <td><b>MVA Attorneys</b></td>
        <td>${totalMva}</td>
        <td class="ok">${verMva}</td>
        <td class="warn">${phMva}</td>
        <td class="miss">${missMva}</td>
      </tr>
    </tbody>
  </table>
</div>
${sections.join('\n')}
</body></html>`;

(async () => {
  if(!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  await page.pdf({ path: OUT_PDF, format: 'Letter', margin: { top: '0.5in', bottom: '0.5in', left: '0.5in', right: '0.5in' }, printBackground: true });
  await browser.close();
  console.log('Wrote: ' + OUT_PDF);
  console.log('Stats — clinics: ' + verClinic + ' verified · ' + phClinic + ' placeholder · ' + missClinic + ' missing');
  console.log('Stats — MVAs:    ' + verMva    + ' verified · ' + phMva    + ' placeholder · ' + missMva    + ' missing');
})().catch(e => { console.error(e); process.exit(1); });
