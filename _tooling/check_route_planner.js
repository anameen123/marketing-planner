// Visual smoke test of the new Day Route Planner.
// Signs in as admin, opens a day with visits, captures the map + planner UI.
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
  page.on('pageerror', e => console.log('PAGE ERROR:', e.message.slice(0,160)));
  page.on('console', m => { if(m.type()==='error') console.log('CONSOLE ERR:', m.text().slice(0,160)); });

  console.log('Loading', URL);
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  // Sign in as admin via dev bypass
  await page.evaluate(() => {
    window.CURRENT_USER = { username:'admin', name:'Mahmoud Althaher', role:'admin', color:'#1F3864', authVia:'dev-bypass' };
    var ls = document.getElementById('login-screen'); if(ls){ ls.style.display='none'; ls.classList.remove('visible'); }
    if(typeof applyMemberViewClass==='function') applyMemberViewClass();
    if(typeof renderUserBadge==='function') renderUserBadge();
    if(typeof renderCalGrid==='function') renderCalGrid();
  });
  await page.waitForTimeout(800);

  // Open a day that has visits — Day 0 of S.days
  await page.evaluate(() => {
    if(typeof openDay === 'function' && S.days && S.days.length){
      // Find a day with at least one visit
      var idx = 0;
      for(var i=0; i<S.days.length; i++){
        if(S.days[i].rows && S.days[i].rows.some(r=>r.clinic)){ idx = i; break; }
      }
      openDay(idx);
    }
  });

  // Wait for Leaflet to load + map to render
  await page.waitForTimeout(5000);

  // Screenshot the day view scrolled down to show both table + map
  await page.screenshot({ path: path.resolve(__dirname,'..','screenshots','route_day_view.png'), fullPage: true });
  console.log('Captured full day view → screenshots/route_day_view.png');

  // Now open the route-planner dialog
  await page.evaluate(() => { if(typeof openRoutePlanner === 'function') openRoutePlanner(); });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.resolve(__dirname,'..','screenshots','route_planner_dialog.png') });
  console.log('Captured route planner dialog → screenshots/route_planner_dialog.png');

  // Run it and see recommendations
  await page.evaluate(() => { if(typeof runRoutePlanner === 'function') runRoutePlanner(); });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.resolve(__dirname,'..','screenshots','route_planner_results.png') });
  console.log('Captured route planner results → screenshots/route_planner_results.png');

  await browser.close();
  console.log('Done.');
})().catch(e => { console.error(e); process.exit(1); });
