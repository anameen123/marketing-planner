# Orphan / Dead-Code Audit — Phase 171
**Date:** 2026-05-30
**File audited:** `marketing_schedule_FINAL4.html` (~60k lines)
**Performed by:** parallel agent sweep, triaged by manual verification

## Purpose

Per user 2026-05-30: *"look for any bugs, any unnecessary traces, bugs,
functions that was already overread... Try to avoid deleting, but look
for any bugs."*

This document inventories candidates for future cleanup. **No code was
deleted as part of Phase 171.** Each entry is categorized so a future
session can act on them with confidence.

---

## CLEARLY DEAD (no callers, HIGH confidence)

| Function | Line | Why it looks dead | Risk of deletion |
|---|---|---|---|
| `_runRoutePlannerLegacy` | ~32532 | Pre-V5 entry point; `runRoutePlanner()` delegates to `runRoutePlannerV4()`, not this. No callers anywhere in the file. | LOW — isolated logic |

**Total: 1 function.**

---

## PROBABLY DEAD (HIGH confidence, but explicitly kept as defense per code comments)

| Function | Line | Why kept | Status |
|---|---|---|---|
| `_rlToggleExpand` | ~15837 | Phase 153 swapped row click → `openReferralCard`. Comment explicitly says "kept as a defense if openReferralCard ever fails." | **KEEP** — intentional safety net |
| `_rpHandleRandomDoubleClick` | ~36843 | Phase 68 ripped Random Pick mode. Wrapped in `_RP_MODE === 'random'` guards that never fire. | **KEEP** — defensive against legacy localStorage values |
| `_rpArmRandomMap` | ~36617 | Same as above — gated by dead mode. | **KEEP** — defense |
| `_RP_RANDOM_*` globals | ~33185-33194 | Random-mode state, only touched inside dead `_RP_MODE === 'random'` branches. | **KEEP** — no allocation cost |
| `isCallHandler` + `CALL_LOCATIONS` stub | ~59594-59597 | Phase 67 ripped Call Conversions feature. Stubs explicitly kept per existing comment: "any straggler `isCallHandler(name)` calls don't fire." | **KEEP** — explicit defense |

**Total: ~5 helpers + state. All intentional defense per existing comments.**

---

## BACK-COMPAT WRAPPERS (used as fallbacks, do not remove)

| Function | Line | Role | Status |
|---|---|---|---|
| `_rpSavedRouteKey` (v1) | ~43091 | V1 single-route storage key. Still used as fallback when loading legacy localStorage records. Phase 122a's v2 migration reads it once on first load. | **KEEP** — migrates pre-Phase-122 saved data |
| `_rpLoadCurrentRoute` | ~43280 | Back-compat wrapper around v2. Used by 7 callers — all already guarded by `typeof` checks. | **KEEP** — exposes window-level API |
| `_rpClearCurrentRoute` | ~43298 | Back-compat wrapper that clears ALL routes for a day. Multi-route callers use `_rpDeleteRouteById` instead, but this is exported to `window` for external integrations. | **KEEP** — public API surface |
| `runRoutePlannerV4` | ~32843 | Pre-V5 planner. 4 callers, all in `else-if(typeof === 'function')` fallback branches. Codebase prefers `_rpV5Start`. | **KEEP** — safety net for V5 init failure |
| `_dvScrollToMap` | ~39789 | Phase 158 made conditional. 8 HTML onclick callers expect side-effect, function self-guards when map already visible. | **KEEP** — intentional design |

**Total: 5 wrappers. All actively serve as safety nets.**

---

## HTML ↔ JS MISMATCH (potential confusion, NOT bug)

| Item | Line | Issue |
|---|---|---|
| `exportNextStopToGoogleMaps` | HTML line ~3776 (onclick) + JS line ~29310 | Phase 134e "reverted Next stop button." JS implementation survives; HTML button onclick still references it. If button is rendered, clicking it works. If button is hidden via CSS / display:none, it's effectively dead. **Verify button visibility before deleting.** |

---

## CODE SMELL (not orphans — design pattern by convention)

| Pattern | Count | Note |
|---|---|---|
| Local `esc(s)` re-definitions | 16 | Each scoped to a render function or IIFE. Hoisting to a single global `window._escapeHtml` would reduce duplication but requires careful refactor to avoid breaking closures. **NOT URGENT.** |

---

## RECOMMENDED CLEANUP STRATEGY (future)

1. **Phase 172 (someday):** Delete `_runRoutePlannerLegacy` ONLY. Single
   isolated function, no callers, no defensive purpose. Lowest-risk
   first move.
2. **Phase 173 (someday):** Audit the `exportNextStopToGoogleMaps`
   button — if it's hidden via CSS / display:none, safe to remove
   both the button + function. If visible, leave alone.
3. **Phase 174 (someday — large refactor):** Hoist `esc()` to a
   single global `_escapeHtml`. Adds testability + reduces 16 copies
   to one. Touch every render function, so save for a dedicated
   refactor session with thorough verification.
4. **Never delete:** the defense-by-design entries (random-mode
   guards, call-handler stubs, V1 route wrappers). They cost zero
   runtime and protect against legacy data or future regressions.

---

## SUMMARY

- **1 function** is truly dead with no defensive purpose
- **~10 functions** look dead but are explicit defense
- **5 back-compat wrappers** serve as safety nets
- **1 HTML↔JS mismatch** worth verifying button visibility
- **16 `esc()` copies** are a refactor opportunity, not a bug

**Net actionable findings: 1 (safe to delete `_runRoutePlannerLegacy`).**
Everything else is intentional or low-priority cleanup.

---

*Phase 171 — bug sweep audit doc. No code changes made.*
