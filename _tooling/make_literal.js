const fs = require('fs');
const path = require('path');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'business_geocodes.json'), 'utf8'));
const lines = ['var BUSINESS_GEOCODES = {'];
const keys = Object.keys(data);
keys.forEach((k, i) => {
  const v = data[k];
  const safe = k.replace(/'/g, "\\'");
  lines.push("  '" + safe + "': {lat:" + v.lat + ",lng:" + v.lng + '}' + (i === keys.length - 1 ? '' : ','));
});
lines.push('};');
fs.writeFileSync(path.join(__dirname, 'business_geocodes_literal.js'), lines.join('\n'));
console.log('Wrote ' + keys.length + ' entries to business_geocodes_literal.js');
