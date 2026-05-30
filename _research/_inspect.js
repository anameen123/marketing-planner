const fs = require('fs');
const src = fs.readFileSync('C:\\Users\\roses\\CODE PROJECT\\marketing_schedule_FINAL4.html','utf8').split(/\r?\n/);
const block = src.slice(41820, 45632).join('\n');
const fn = new Function(block.replace(/^\s*var\s+\w+\s*=/, 'return ').replace(/;?\s*$/,';'));
const a = fn();
let withAddr=0, withTBD=0, withEmpty=0, none=0;
for(const c of a){
  if(typeof c.address === 'undefined'){ none++; continue; }
  const t = (c.address||'').trim();
  if(!t){ withEmpty++; continue; }
  if(t.toUpperCase()==='TBD'){ withTBD++; continue; }
  withAddr++;
}
console.log({total:a.length, withAddr, withTBD, withEmpty, none});
console.log('---first 3 with real address---');
let n=0;
for(const c of a){
  if(c.address && c.address.trim() && c.address.trim().toUpperCase()!=='TBD'){
    console.log(JSON.stringify(c));
    if(++n>=3) break;
  }
}
console.log('---first 3 with empty address---');
n=0;
for(const c of a){
  if(typeof c.address === 'string' && !c.address.trim()){
    console.log(JSON.stringify(c));
    if(++n>=3) break;
  }
}

// Also MVAs
const mblock = src.slice(5234, 5892).join('\n');
const mfn = new Function(mblock.replace(/^\s*var\s+\w+\s*=/, 'return ').replace(/;?\s*$/,';'));
const m = mfn();
let mWith=0, mTBD=0, mNone=0, mEmpty=0;
for(const x of m){
  if(typeof x.address === 'undefined'){ mNone++; continue; }
  const t=(x.address||'').trim();
  if(!t){ mEmpty++; continue; }
  if(t.toUpperCase()==='TBD'){ mTBD++; continue; }
  mWith++;
}
console.log('MVA counts:', {total:m.length, mWith, mTBD, mNone, mEmpty});
