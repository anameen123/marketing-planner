// Generate a printable PDF of the Referral System Workflow.
// Source: _research/referral_workflow.md
// Output: ~/Downloads/Referral Workflow.pdf
const fs = require('fs');
const path = require('path');
const os = require('os');
const { chromium } = require('playwright');

const MD_FILE  = path.join(__dirname, '..', '_research', 'referral_workflow.md');
const OUT_DIR  = path.join(os.homedir(), 'Downloads');
const OUT_PDF  = path.join(OUT_DIR, 'Referral Workflow.pdf');

const md = fs.readFileSync(MD_FILE, 'utf8');

// Minimal markdown → HTML renderer (handles headings, lists, tables, code, bold, italics)
function mdToHtml(src){
  const lines = src.split(/\r?\n/);
  let out = '';
  let inCode = false, codeBuf = [];
  let inTable = false, tableRows = [];
  let inList = false, listType = '';
  function flushList(){ if(inList){ out += '</' + listType + '>'; inList = false; listType = ''; } }
  function flushTable(){
    if(!inTable) return;
    out += '<table>';
    tableRows.forEach((r, idx) => {
      if(idx === 1) return; // separator row
      const tag = idx === 0 ? 'th' : 'td';
      out += '<tr>' + r.map(c => `<${tag}>${inlineMd(c)}</${tag}>`).join('') + '</tr>';
    });
    out += '</table>';
    inTable = false; tableRows = [];
  }
  function inlineMd(s){
    return s
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  }
  for(let i = 0; i < lines.length; i++){
    const ln = lines[i];
    if(/^```/.test(ln)){
      if(inCode){
        out += '<pre><code>' + codeBuf.join('\n') + '</code></pre>';
        codeBuf = []; inCode = false;
      } else { inCode = true; flushList(); flushTable(); }
      continue;
    }
    if(inCode){ codeBuf.push(ln.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')); continue; }
    // Headings
    const hMatch = ln.match(/^(#{1,6})\s+(.+)$/);
    if(hMatch){ flushList(); flushTable(); out += `<h${hMatch[1].length}>${inlineMd(hMatch[2])}</h${hMatch[1].length}>`; continue; }
    // Horizontal rule
    if(/^---+\s*$/.test(ln)){ flushList(); flushTable(); out += '<hr>'; continue; }
    // Table row
    if(/^\|.*\|$/.test(ln)){
      flushList();
      inTable = true;
      tableRows.push(ln.replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
      continue;
    } else if(inTable){ flushTable(); }
    // Unordered list
    if(/^[-*]\s+/.test(ln)){
      if(!inList || listType !== 'ul'){ flushList(); flushTable(); out += '<ul>'; inList = true; listType = 'ul'; }
      out += '<li>' + inlineMd(ln.replace(/^[-*]\s+/, '')) + '</li>';
      continue;
    }
    // Ordered list
    if(/^\d+\.\s+/.test(ln)){
      if(!inList || listType !== 'ol'){ flushList(); flushTable(); out += '<ol>'; inList = true; listType = 'ol'; }
      out += '<li>' + inlineMd(ln.replace(/^\d+\.\s+/, '')) + '</li>';
      continue;
    }
    // Blank line
    if(!ln.trim()){ flushList(); flushTable(); continue; }
    // Paragraph
    flushList(); flushTable();
    out += '<p>' + inlineMd(ln) + '</p>';
  }
  flushList(); flushTable();
  if(inCode) out += '<pre><code>' + codeBuf.join('\n') + '</code></pre>';
  return out;
}

const body = mdToHtml(md);

const html = `<!doctype html>
<html><head>
<meta charset="utf-8">
<title>Referral Workflow</title>
<style>
  @page { size: letter; margin: 0.55in; }
  body { font-family: -apple-system, "Segoe UI", Helvetica, Arial, sans-serif; color: #1F3864; font-size: 11px; line-height: 1.55; }
  h1 { font-size: 22px; margin: 0 0 8px; color: #1F3864; border-bottom: 3px solid #7030A0; padding-bottom: 6px; }
  h2 { font-size: 15px; margin: 18px 0 6px; color: #1F3864; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; }
  h3 { font-size: 13px; margin: 14px 0 5px; color: #7030A0; }
  p  { margin: 4px 0; }
  ul, ol { margin: 4px 0 6px 18px; padding: 0; }
  li { margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 10px; }
  th { background: #eef2ff; color: #3730a3; text-align: left; padding: 5px 8px; border-bottom: 2px solid #c7d2fe; }
  td { padding: 4px 8px; border-bottom: 1px solid #e0e7ff; vertical-align: top; }
  tr:nth-child(even) td { background: #fafbfc; }
  code { background: #f1f5f9; color: #0f172a; padding: 1px 5px; border-radius: 3px; font-family: "Cascadia Code", Consolas, "Courier New", monospace; font-size: 10px; }
  pre { background: #1F3864; color: #f8fafc; padding: 12px; border-radius: 6px; font-size: 9px; line-height: 1.5; overflow-x: auto; }
  pre code { background: transparent; color: inherit; padding: 0; }
  hr { border: none; border-top: 1px dashed #cbd5e1; margin: 14px 0; }
  strong { color: #0f172a; }
  em { color: #475569; }
  a { color: #7030A0; }
</style>
</head><body>${body}</body></html>`;

(async () => {
  if(!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  await page.pdf({ path: OUT_PDF, format: 'Letter', margin: { top:'0.55in', bottom:'0.55in', left:'0.55in', right:'0.55in' }, printBackground: true });
  await browser.close();
  console.log('Wrote: ' + OUT_PDF);
})().catch(e => { console.error(e); process.exit(1); });
