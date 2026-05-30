// Dump the remaining-to-research clinic list (those not yet in found[])
const fs = require('fs');
const path = require('path');
const ROOT = 'C:\\Users\\roses\\CODE PROJECT\\_research';
const audit = JSON.parse(fs.readFileSync(path.join(ROOT,'missing_addresses_audit.json'),'utf8'));
const results = JSON.parse(fs.readFileSync(path.join(ROOT,'address_research_results.json'),'utf8'));

function norm(s){ return (s||'').toString().toLowerCase().replace(/[^a-z0-9]+/g,' ').trim(); }
function key(name, city){ return norm(name) + '|' + norm(city); }

const handled = new Set();
for (const f of results.found) handled.add(key(f.name || f.firm, f.city));
for (const n of results.notFound) handled.add(key(n.name || n.firm, n.city));

const remaining = audit.clinics.missingList.filter(c => !handled.has(key(c.name, c.city)));
console.log('Remaining clinics to research:', remaining.length);
fs.writeFileSync(path.join(ROOT,'_remaining_clinics.json'), JSON.stringify(remaining, null, 2));

// Also dump by city
const byCity = {};
for (const c of remaining) {
  const k = c.city || '(none)';
  (byCity[k] ||= []).push(c);
}
console.log('Remaining by city:');
for (const [c,arr] of Object.entries(byCity).sort((a,b)=>b[1].length-a[1].length)){
  console.log(`  ${arr.length.toString().padStart(3)} ${c}`);
}
