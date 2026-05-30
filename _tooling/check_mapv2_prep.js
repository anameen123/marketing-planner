// Verify all Map v2 prep is in place and fails gracefully when no keys.
const { chromium } = require('playwright');
const path = require('path');

const HTML_PATH = path.resolve(__dirname, '..', 'marketing_schedule_FINAL4.html');
const URL = 'file:///' + HTML_PATH.replace(/\\/g, '/') + '?devmode=1';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.route('**/login.microsoftonline.com/**', r => r.abort());
  await ctx.route('**/graph.microsoft.com/**', r => r.abort());
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGE ERROR:', e.message.slice(0,200)));

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  await page.evaluate(() => {
    window.CURRENT_USER = { username:'admin', name:'Mahmoud', role:'admin' };
    var ls = document.getElementById('login-screen'); if(ls){ ls.style.display='none'; }
  });
  await page.waitForTimeout(500);

  // Verify all the new top-level functions exist
  const fnCheck = await page.evaluate(() => {
    var required = [
      'isMapV2Enabled', 'hasMapsKey', 'hasGeminiKey',
      'loadGoogleMapsApi', 'initGoogleMap',
      'geocodeAddress', 'batchGeocodeAllBusinesses', 'setBusinessCoords',
      'computeDrivingRoute', 'decodePolyline',
      'askGeminiForRouteAdvice', 'buildGeminiAdviceContext',
      'openMapV2Settings', 'closeMapV2Settings', 'saveMapV2Settings',
      '_mv2TestMapsKey', '_mv2TestGeminiKey',
      'renderMapV2CostMeter', 'getMapV2QuotaToday',
      'openRoutePlannerV2'
    ];
    var missing = required.filter(function(fn){ return typeof window[fn] !== 'function'; });
    return { missing: missing, total: required.length };
  });
  console.log('Function check:', JSON.stringify(fnCheck));

  // Verify devmode kill switch + no-key fallbacks
  const fallbackCheck = await page.evaluate(() => {
    return {
      devmodeKill: !isMapV2Enabled(),  // devmode=1 should force false
      hasMaps:     hasMapsKey(),
      hasGemini:   hasGeminiKey(),
      // Try to geocode without key → should error gracefully
      geocodeResult: new Promise(function(resolve){
        geocodeAddress('1234 Main St', function(err, r){
          resolve({ err: err ? err.message : null, hasResult: !!r });
        });
      })
    };
  });
  console.log('Fallback check (sync part):', JSON.stringify({
    devmodeKill: fallbackCheck.devmodeKill,
    hasMaps: fallbackCheck.hasMaps,
    hasGemini: fallbackCheck.hasGemini
  }));

  // Verify settings modal opens
  await page.evaluate(() => { openMapV2Settings(); });
  await page.waitForTimeout(300);
  const modalOpen = await page.evaluate(() => {
    var m = document.getElementById('mapv2-settings-modal');
    return m && m.style.display === 'flex';
  });
  console.log('Settings modal opens:', modalOpen);

  // Verify cost meter renders
  const meterRendered = await page.evaluate(() => {
    var el = document.getElementById('mv2-cost-meter');
    return el && el.innerHTML.indexOf('Maps calls') >= 0;
  });
  console.log('Cost meter renders:', meterRendered);

  await page.evaluate(() => { closeMapV2Settings(); });

  // Verify the day-view v2 button exists
  await page.evaluate(() => { if(typeof switchTab==='function') switchTab('schedule'); });
  await page.waitForTimeout(400);
  const v2BtnExists = await page.evaluate(() => {
    return !!document.getElementById('dv-plan-route-v2-btn');
  });
  console.log('v2 button in day view:', v2BtnExists);

  await browser.close();
  console.log('Done.');
})().catch(e => { console.error(e); process.exit(1); });
