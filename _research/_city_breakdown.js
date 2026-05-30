const fs = require('fs');
const audit = JSON.parse(fs.readFileSync('C:\\Users\\roses\\CODE PROJECT\\_research\\missing_addresses_audit.json','utf8'));
const counts = {};
for (const c of audit.clinics.missingList) {
  const key = (c.city || '(none)').trim() || '(none)';
  counts[key] = (counts[key] || 0) + 1;
}
const sorted = Object.entries(counts).sort((a,b) => b[1]-a[1]);
console.log('Clinic city distribution:');
for (const [k,v] of sorted) console.log(`  ${v.toString().padStart(3)} ${k}`);
console.log('Total clinics missing:', audit.clinics.missing);
console.log('MVA missing list:', JSON.stringify(audit.mva.missingList, null, 2));
