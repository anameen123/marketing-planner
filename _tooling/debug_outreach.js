const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'marketing_schedule_FINAL4.html'), 'utf8');

const start = html.indexOf('var OUTREACH = [');
const end = html.indexOf('];', start);
console.log('OUTREACH literal: starts ch ' + start + ', ends ch ' + end);
console.log('First 800 chars after var OUTREACH =\n');
console.log(html.slice(start, start + 800));
