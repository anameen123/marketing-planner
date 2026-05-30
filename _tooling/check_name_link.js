// Quick screenshot of the bank cards to verify the clinic-name link is
// visibly clickable now.
const { chromium } = require('playwright');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'marketing_schedule_FINAL4.html');
const URL = 'file:///' + HTML_PATH.replace(/\\/g, '/') + '?devmode=1';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
  await ctx.route('**/login.microsoftonline.com/**', r => r.abort());
  await ctx.route('**/graph.microsoft.com/**', r => r.abort());
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  await page.evaluate(() => {
    window.CURRENT_USER = { username:'admin', name:'Mahmoud', role:'admin', color:'#1F3864', authVia:'dev-bypass' };
    var ls = document.getElementById('login-screen'); if(ls){ ls.style.display='none'; ls.classList.remove('visible'); }
    if(typeof applyMemberViewClass==='function') applyMemberViewClass();
    if(typeof renderUserBadge==='function') renderUserBadge();
    if(typeof applyRoleRestrictions==='function') applyRoleRestrictions();
    if(typeof renderCalGrid==='function') renderCalGrid();
    if(typeof switchTab==='function') switchTab('bank');
  });
  await page.waitForTimeout(1200);

  await page.screenshot({ path: path.resolve(__dirname,'..','screenshots','bank_with_link.png'), fullPage: false });
  console.log('Bank captured');

  await browser.close();
})();
