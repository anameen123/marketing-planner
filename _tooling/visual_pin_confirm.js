// Visual test of the click → preview → confirm flow at REAL clinic-detail
// zoom (≥12) where individual pins are rendered. Screenshots before & after
// so we can see if S/E lands on the clicked pin or somewhere else.
const fs  = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const HTML       = path.resolve(__dirname, '..', 'marketing_schedule_FINAL4.html');
const SHOT_BEFORE = path.resolve(__dirname, '_visual_before_confirm.png');
const SHOT_AFTER  = path.resolve(__dirname, '_visual_after_confirm.png');
const TRACE_LOG   = path.resolve(__dirname, '_visual_trace.log');

(async () => {
  const log = [];
  const note = (s) => { console.log(s); log.push(s); };

  const browser = await chromium.launch({ headless: true });
  const ctx     = await browser.newContext({ viewport: { width: 1600, height: 1400 } });
  const page    = await ctx.newPage();
  page.on('console', m => { if(m.type() === 'error') note('[js-error] ' + m.text().slice(0, 200)); });
  page.on('pageerror', e => note('[pageerror] ' + e.message));

  await page.goto('file:///' + HTML.replace(/\\/g, '/'));
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(2000);

  // Sign in as admin, navigate to a day-view + open planner
  await page.evaluate(() => {
    window.CURRENT_USER = { name: 'Mahmoud Althaher', role: 'admin' };
    if(typeof refreshAllUI === 'function') refreshAllUI();
  });

  // Navigate to the day-view tab + openDay so the map actually renders
  await page.evaluate(() => {
    if(typeof switchTab === 'function') switchTab('schedule');
  });
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    if(typeof openDay === 'function') openDay(0);
  });
  await page.waitForTimeout(1500);
  // Open the planner drawer
  await page.evaluate(() => {
    if(typeof openRoutePlanner === 'function') openRoutePlanner();
  });
  await page.waitForTimeout(600);

  // Zoom + center the map on Frisco where lots of pins cluster
  const zoomed = await page.evaluate(() => {
    if(typeof _DV_MAP === 'undefined' || !_DV_MAP) return { err: 'no map' };
    _DV_MAP.setView([33.156, -96.823], 13, { animate: false });
    return { center: _DV_MAP.getCenter(), zoom: _DV_MAP.getZoom() };
  });
  note('[map] ' + JSON.stringify(zoomed));
  await page.waitForTimeout(1500);   // let pins re-render

  // Pick a clinic that IS in the registry (= actually rendered)
  const target = await page.evaluate(() => {
    const reg = window._RP_PIN_REGISTRY || {};
    const names = Object.keys(reg);
    if(names.length === 0) return null;
    // Find one near the center of the viewport
    let best = null, bestDist = Infinity;
    const c = _DV_MAP.getCenter();
    names.forEach(n => {
      const m = reg[n] && reg[n].marker;
      if(!m) return;
      const ll = m.getLatLng();
      const d  = Math.abs(ll.lat - c.lat) + Math.abs(ll.lng - c.lng);
      if(d < bestDist){ bestDist = d; best = { name: n, lat: ll.lat, lng: ll.lng }; }
    });
    return best;
  });
  note('[target] ' + JSON.stringify(target));
  if(!target){ note('NO TARGET, aborting'); await browser.close(); return; }

  // Arm Start pick, then simulate clicking that pin
  await page.evaluate((t) => {
    rpPickFromMapMode('start');
  }, target);
  await page.waitForTimeout(400);

  // Convert lat/lng to pixel coords, then dispatch the click via Playwright
  const pixel = await page.evaluate((t) => {
    if(!_DV_MAP) return null;
    const p = _DV_MAP.latLngToContainerPoint([t.lat, t.lng]);
    const rect = _DV_MAP.getContainer().getBoundingClientRect();
    return { x: rect.left + p.x, y: rect.top + p.y };
  }, target);
  note('[pixel] ' + JSON.stringify(pixel));

  // Fire the marker's click event directly via Leaflet — exercises the
  // exact handler I wired in addPin without depending on pixel hit-testing.
  const fired = await page.evaluate((t) => {
    const reg = window._RP_PIN_REGISTRY && window._RP_PIN_REGISTRY[t.name];
    if(!reg || !reg.marker) return 'no marker';
    reg.marker.fire('click', {
      originalEvent: { stopPropagation: () => {} },
      latlng: { lat: t.lat, lng: t.lng }
    });
    return 'fired';
  }, target);
  note('[fire click] ' + fired);
  await page.waitForTimeout(500);

  // Snapshot BEFORE confirm
  const beforeState = await page.evaluate(() => ({
    pending: window._RP_DIALOG_PENDING && window._RP_DIALOG_PENDING.name,
    pendingCoord: window._RP_DIALOG_PENDING && window._RP_DIALOG_PENDING.coord,
    pinState: window._RP_PIN_STATE && window._RP_PIN_STATE[window._RP_DIALOG_PENDING && window._RP_DIALOG_PENDING.name],
    previewRingExists: !!window._DV_PREVIEW_RING
  }));
  note('[before confirm] ' + JSON.stringify(beforeState));
  await page.screenshot({ path: SHOT_BEFORE, fullPage: false });
  note('Screenshot before: ' + SHOT_BEFORE);

  // Now confirm
  await page.evaluate(() => {
    if(typeof _rpConfirmPendingPick === 'function') _rpConfirmPendingPick();
  });
  await page.waitForTimeout(700);

  // Read the actual S marker coordinate
  const afterState = await page.evaluate((t) => {
    const startMarker = window._RP_RANDOM_S_MARKER;
    const sLL = startMarker ? startMarker.getLatLng() : null;
    return {
      sMarkerLatLng: sLL,
      targetLatLng:  { lat: t.lat, lng: t.lng },
      latDiff: sLL ? Math.abs(sLL.lat - t.lat) : null,
      lngDiff: sLL ? Math.abs(sLL.lng - t.lng) : null
    };
  }, target);
  note('[after confirm] ' + JSON.stringify(afterState));
  await page.screenshot({ path: SHOT_AFTER, fullPage: false });
  note('Screenshot after:  ' + SHOT_AFTER);

  // Verdict
  if(afterState.sMarkerLatLng && afterState.latDiff < 0.0001 && afterState.lngDiff < 0.0001){
    note('PASS — S marker landed on the clicked pin');
  } else {
    note('FAIL — S marker is offset from the clicked pin');
    note('  clicked: ' + JSON.stringify(afterState.targetLatLng));
    note('  S at:    ' + JSON.stringify(afterState.sMarkerLatLng));
  }

  // Phase 34: also pick an End and verify the auto-compute banner +
  // button click actually fire the deterministic compute.
  const autoTest = await page.evaluate(() => {
    const out = {};
    // Pick a second clinic for End ~5 km from the first
    const reg = window._RP_PIN_REGISTRY || {};
    const names = Object.keys(reg);
    if(names.length < 2) return { err: 'need 2 pins' };
    // Find a pin notably distant from the Start we just confirmed
    const sLL = window._RP_RANDOM_S_MARKER && window._RP_RANDOM_S_MARKER.getLatLng();
    if(!sLL) return { err: 'no start marker' };
    let endName = null, endLat, endLng, bestD = -1;
    names.forEach(n => {
      const m = reg[n] && reg[n].marker;
      if(!m) return;
      const ll = m.getLatLng();
      const d = Math.abs(ll.lat - sLL.lat) + Math.abs(ll.lng - sLL.lng);
      if(d > bestD){ bestD = d; endName = n; endLat = ll.lat; endLng = ll.lng; }
    });
    // Arm End, fire its click, confirm
    rpPickFromMapMode('end');
    reg[endName].marker.fire('click', {
      originalEvent: { stopPropagation: () => {} },
      latlng: { lat: endLat, lng: endLng }
    });
    _rpConfirmPendingPick();
    // After end-confirm, check the banner visibility + N/halfWidth inputs
    out.endName = endName;
    out.bannerVisible = (document.getElementById('rp-auto-banner') || {}).style?.display === 'flex';
    out.nValueBeforeClick = (document.getElementById('rp-level-count') || {}).value;
    out.halfValueBeforeClick = (document.getElementById('rp-corridor') || {}).value;
    // Now simulate a click on the auto-compute button
    if(window._RP_AI) window._RP_AI.autoSuggestLast = null;
    try { _rpRunAutoCompute(); out.runAutoOk = true; }
    catch(e){ out.runAutoErr = e.message; }
    out.nValueAfterClick = (document.getElementById('rp-level-count') || {}).value;
    out.halfValueAfterClick = (document.getElementById('rp-corridor') || {}).value;
    out.hintHasText = (document.getElementById('rp-ai-suggest-n-hint') || {}).innerText || '';
    // Phase 34b: verify the centerline + corridor box actually got drawn
    out.centerlineDrawn = !!(window._DV_CENTERLINE && window._DV_CENTERLINE.main);
    out.corridorBoxDrawn = !!(window._DV_CORRIDOR_BOX && window._DV_CORRIDOR_BOX.fill);
    out.startCoordStashed = !!window._RP_START_COORD;
    out.endCoordStashed   = !!window._RP_END_COORD;
    return out;
  });
  note('[auto-compute test] ' + JSON.stringify(autoTest, null, 2));

  fs.writeFileSync(TRACE_LOG, log.join('\n'), 'utf8');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
