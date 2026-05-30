// Visual smoke test: open the clinic-history modal for a sample clinic
// and verify the new contact-info panel renders with distance + nearest.
const { chromium } = require('playwright');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'marketing_schedule_FINAL4.html');
const URL = 'file:///' + HTML_PATH.replace(/\\/g, '/') + '?devmode=1';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 2 });
  await ctx.route('**/login.microsoftonline.com/**', r => r.abort());
  await ctx.route('**/graph.microsoft.com/**', r => r.abort());
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGE ERROR:', e.message.slice(0,200)));

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  await page.evaluate(() => {
    window.CURRENT_USER = { username:'admin', name:'Mahmoud Althaher', role:'admin', color:'#1F3864', authVia:'dev-bypass' };
    var ls = document.getElementById('login-screen'); if(ls){ ls.style.display='none'; ls.classList.remove('visible'); }
    if(typeof applyMemberViewClass==='function') applyMemberViewClass();
    if(typeof renderUserBadge==='function') renderUserBadge();
    if(typeof applyRoleRestrictions==='function') applyRoleRestrictions();
    if(typeof renderCalGrid==='function') renderCalGrid();
  });
  await page.waitForTimeout(600);

  // Open clinic history for a Frisco clinic that exists
  await page.evaluate(() => {
    if(typeof openClinicHistory === 'function'){
      openClinicHistory('Bloomfield', 'Frisco', 'Cudjoe, MD', 'PCP');
    }
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.resolve(__dirname,'..','screenshots','clinic_contact_empty.png'), fullPage: false });
  console.log('Empty contact panel captured');

  // Populate phone + website via the public helper
  await page.evaluate(() => {
    if(typeof updateBusinessContact === 'function'){
      updateBusinessContact('Bloomfield', {
        phone:'469-555-0123',
        fax:'469-555-0124',
        website:'https://bloomfieldhealth.example.com',
        address:'500 Main St, Frisco TX 75035'
      });
    }
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.resolve(__dirname,'..','screenshots','clinic_contact_filled.png'), fullPage: false });
  console.log('Filled contact panel captured');

  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
