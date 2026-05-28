// Verify the Plan-a-Route start picker — Phase 22+24 fix.
// Drives the real app via Playwright, opens the planner, exercises the
// pick-on-map flow in Corridor mode AND Random Pick wizard.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const HTML = path.resolve(__dirname, '..', 'marketing_schedule_FINAL4.html');
const SHOT = path.resolve(__dirname, '_verify_route_planner.png');
const TRACE = path.resolve(__dirname, '_verify_route_planner.log');

(async () => {
  const log = [];
  const note = (s) => { console.log(s); log.push(s); };

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  // Capture page console + errors so silent JS failures don't hide
  page.on('console', m => note('[console.' + m.type() + '] ' + m.text().slice(0, 280)));
  page.on('pageerror', e => note('[pageerror] ' + e.message));

  await page.goto('file:///' + HTML.replace(/\\/g, '/'));
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(1500);   // let the app initialize

  // ── (1) Sign in as Mahmoud (admin) via the View-As menu ──────────────
  // App might auto-route to a landing tab. Look for the View-As button.
  note('--- Step: sign in as admin ---');
  try {
    // Try the simplest path: set CURRENT_USER directly via JS so we don't
    // have to navigate the View-As UI (which has known timing quirks).
    await page.evaluate(() => {
      window.CURRENT_USER = { name: 'Mahmoud Althaher', role: 'admin' };
      try { localStorage.setItem('CURRENT_USER', JSON.stringify(window.CURRENT_USER)); } catch(_){}
      if(typeof refreshAllUI === 'function') refreshAllUI();
    });
    note('[ok] CURRENT_USER set to admin via JS');
  } catch(e) {
    note('[warn] could not set admin: ' + e.message);
  }

  // ── (2) Open the route-planner drawer directly via JS ─────────────────
  note('--- Step: openRoutePlanner ---');
  const opened = await page.evaluate(() => {
    if(typeof openRoutePlanner === 'function'){
      try { openRoutePlanner(); return 'called'; } catch(e){ return 'err:' + e.message; }
    }
    return 'no openRoutePlanner';
  });
  note('  → ' + opened);
  await page.waitForTimeout(800);
  const drawerVisible = await page.evaluate(() => {
    const el = document.getElementById('route-planner-modal');
    return el ? (el.style.display !== 'none') : null;
  });
  note('  → drawer visible? ' + drawerVisible);

  // ── (3) Click the corridor pick-on-map button + observe state ─────────
  note('--- Step: click Corridor [📍 Map] for Start ---');
  // Drive via JS so a missing button click selector doesn't blank us
  const corridorState = await page.evaluate(() => {
    const out = {};
    // Make sure we're in corridor mode
    if(typeof _rpSetMode === 'function') _rpSetMode('corridor');
    // Call the same handler the button does
    if(typeof rpPickFromMapMode === 'function'){
      try { rpPickFromMapMode('start'); out.called = true; }
      catch(e){ out.err = e.message; }
    } else out.err = 'no rpPickFromMapMode';
    out.awaiting = window._RP_DIALOG_AWAITING;
    out.drawerDisplay = (document.getElementById('route-planner-modal') || {}).style?.display;
    const statusPanel = document.getElementById('rp-corridor-pick-status');
    out.statusVisible = statusPanel ? (statusPanel.style.display !== 'none') : null;
    out.statusText = statusPanel ? statusPanel.innerText.slice(0, 120) : null;
    return out;
  });
  note('  → ' + JSON.stringify(corridorState));

  // ── (4) ONE-CLICK pin pick via _rpQuickPickPin (Phase 25) ─────────────
  note('--- Step: one-click pin pick via _rpQuickPickPin ---');
  const pinClickRes = await page.evaluate(() => {
    const out = {};
    // Find a clinic that has coords
    let target = null, coord = null;
    if(typeof CLINIC_BANK !== 'undefined'){
      for(const c of CLINIC_BANK){
        if(c && c.n && typeof getCoordForBusiness === 'function'){
          const co = getCoordForBusiness(c.n);
          if(co){ target = c.n; coord = co; break; }
        }
      }
    }
    out.target = target;
    if(!target){ out.err = 'no clinic with coords found'; return out; }
    if(typeof _rpQuickPickPin === 'function'){
      out.quickPickExists = true;
      try { _rpQuickPickPin(target, coord); } catch(e){ out.err = e.message; }
    } else out.err = 'no _rpQuickPickPin (Phase 25 fn missing)';
    out.startVal     = (document.getElementById('rp-start') || {}).value;
    out.startLbl     = (document.getElementById('rp-start-search') || {}).value;
    out.drawer       = (document.getElementById('route-planner-modal') || {}).style?.display;
    out.awaitingCleared = !window._RP_DIALOG_AWAITING;
    out.startHalo    = !!(window._RP_SELECTION_HALOS && window._RP_SELECTION_HALOS.start);
    out.startMarker  = !!window._RP_RANDOM_S_MARKER;
    return out;
  });
  note('  → ' + JSON.stringify(pinClickRes));

  // ── (6) One-click END + check auto-AI hook fires ─────────────────────
  note('--- Step: one-click pick END + verify auto-AI hook attempts to run ---');
  const endRes = await page.evaluate(() => {
    if(typeof rpPickFromMapMode === 'function') rpPickFromMapMode('end');
    // Pick a different clinic
    let target = null, coord = null;
    if(typeof CLINIC_BANK !== 'undefined'){
      for(const c of CLINIC_BANK){
        if(c && c.n && c.n !== window._RP_START_NAME && typeof getCoordForBusiness === 'function'){
          const co = getCoordForBusiness(c.n);
          if(co){ target = c.n; coord = co; break; }
        }
      }
    }
    if(target && typeof _rpQuickPickPin === 'function'){
      _rpQuickPickPin(target, coord);
    }
    return {
      endVal:    (document.getElementById('rp-end') || {}).value,
      endLbl:    (document.getElementById('rp-end-search') || {}).value,
      drawer:    (document.getElementById('route-planner-modal') || {}).style?.display,
      endHalo:   !!(window._RP_SELECTION_HALOS && window._RP_SELECTION_HALOS.end),
      endMarker: !!window._RP_END_MARKER,
      aiEnabledByDefault: !!(window._RP_AI && window._RP_AI.enabled),
      autoFnExists: typeof window._rpAutoSuggestIfReady === 'function',
      hasGeminiKey: (typeof hasGeminiKey === 'function') ? hasGeminiKey() : null
    };
  });
  note('  → ' + JSON.stringify(endRes));

  // ── (6.5) Phase 26 — verify deterministic auto + per-level uniqueness ─
  note('--- Step: verify Phase 26 auto-compute + per-level candidates ---');
  const phase26 = await page.evaluate(() => {
    const out = {};
    // Pick two clinics that are geographically far apart. Use the bank
    // entries with the most extreme lat or lng diff so totalMi > 0.
    let start = null, end = null, startCoord = null, endCoord = null;
    if(typeof CLINIC_BANK !== 'undefined' && typeof getCoordForBusiness === 'function'){
      const withCoords = [];
      for(const c of CLINIC_BANK){
        if(c && c.n){
          const co = getCoordForBusiness(c.n);
          if(co) withCoords.push({ name: c.n, coord: co });
        }
      }
      // Sort by lng to find east-most + west-most
      withCoords.sort((a, b) => a.coord.lng - b.coord.lng);
      if(withCoords.length >= 2){
        start = withCoords[0].name; startCoord = withCoords[0].coord;
        end   = withCoords[withCoords.length - 1].name; endCoord = withCoords[withCoords.length - 1].coord;
      }
    }
    if(!start || !end){ out.err = 'no clinics'; return out; }
    out.startCoord = startCoord; out.endCoord = endCoord;
    // Reset planner state
    window._RP_AI && (window._RP_AI.autoSuggestLast = null);
    // Use _rpQuickPickPin to commit Start then End — pass real coords
    if(typeof rpPickFromMapMode === 'function') rpPickFromMapMode('start');
    if(typeof _rpQuickPickPin === 'function') _rpQuickPickPin(start, startCoord);
    if(typeof rpPickFromMapMode === 'function') rpPickFromMapMode('end');
    if(typeof _rpQuickPickPin === 'function') _rpQuickPickPin(end, endCoord);
    out.startLabel = start; out.endLabel = end;
    out.nVal = (document.getElementById('rp-level-count') || {}).value;
    out.halfWidthVal = (document.getElementById('rp-corridor') || {}).value;
    // Run the corridor algorithm
    if(typeof _rpV5Start === 'function'){
      try { _rpV5Start(); } catch(e){ out.runErr = e.message; }
    }
    const last = window._RP_V5_LAST;
    if(!last){ out.err2 = 'no _RP_V5_LAST'; return out; }
    out.N = last.N;
    out.baseWidth = last.baseWidth;
    out.totalMi = Math.round(last.totalMi * 10) / 10;
    // Per-level snapshot
    out.perLevel = last.slices.map((s, i) => ({
      k: i + 1,
      n: s.candidates.length,
      first3: s.candidates.slice(0, 3).map(c => c.name)
    }));
    // Cross-level uniqueness check: any clinic in 2+ levels?
    const seen = {};
    let dupes = 0;
    last.slices.forEach((s, i) => {
      s.candidates.forEach(c => {
        if(seen[c.name] != null && seen[c.name] !== i) dupes++;
        seen[c.name] = i;
      });
    });
    out.crossLevelDupes = dupes;
    return out;
  });
  note('  → N=' + phase26.N + ', halfWidth=' + phase26.baseWidth + ' mi, totalMi=' + phase26.totalMi);
  note('  → per-level: ' + JSON.stringify(phase26.perLevel));
  note('  → cross-level dupes: ' + phase26.crossLevelDupes + ' (should be 0)');

  // ── (7) Random Pick wizard — click pick-on-map, expect drawer stays ──
  note('--- Step: Random Pick mode + wizard pick ---');
  const randomRes = await page.evaluate(() => {
    if(typeof _rpSetMode === 'function') _rpSetMode('random');
    // Wait a tick for the wizard to render
    return new Promise(resolve => {
      setTimeout(() => {
        if(typeof _rpRwGoto === 'function') _rpRwGoto(1);
        const out = {};
        out.beforeStartType = window._RP_RW && window._RP_RW.startType;
        // Click the pick-on-map button (the bug we fixed — defaulted facility → no-op)
        if(typeof _rpRwStartPickOnMap === 'function'){
          try { _rpRwStartPickOnMap(); out.called = true; }
          catch(e){ out.err = e.message; }
        }
        out.afterStartType = window._RP_RW && window._RP_RW.startType;
        out.mapPickActive  = !!window._RP_RW_MAP_PICK_ACTIVE;
        out.bannerExists   = !!document.getElementById('rp-rw-map-pick-banner');
        out.drawer = (document.getElementById('route-planner-modal') || {}).style?.display;
        resolve(out);
      }, 600);
    });
  });
  note('  → ' + JSON.stringify(randomRes));

  await page.screenshot({ path: SHOT, fullPage: false });
  fs.writeFileSync(TRACE, log.join('\n'), 'utf8');
  await browser.close();
  console.log('Screenshot: ' + SHOT);
  console.log('Log: ' + TRACE);
})().catch(e => { console.error(e); process.exit(1); });
