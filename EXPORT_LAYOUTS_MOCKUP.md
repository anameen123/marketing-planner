# Export Layouts — Mockup for review

This is what your team will get when you click **↓ Download monthly CSVs** or **↓ Download quarterly CSVs** in the Reports tab.

Each export is a **bundle of CSVs** (multiple separate spreadsheet files) — your accounting / leadership can open them in Excel separately or stitch them into a single workbook with tabs.

---

## 📅 MONTHLY BUNDLE — 4 files

Triggered by: Reports tab → "Download monthly CSVs" → pick year + month. Example filenames assume **May 2026**.

### 1. `visits_2026-05.csv`
*Every visit row that fell on a day in May 2026.* This is the "what actually happened" log.

| Date | Day of week | Member(s) | Business | Area | Specialty | Status | Lead status | Lead level | Lead notes | Rescheduled to | Was rescheduled | Member confirmed | Row confirmed | Additional notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-05-06 | Wednesday | Ms Sadia | MD Medical Group | Frisco | PCP | Completed | established | 2 | Met office mgr | | No | Yes | Yes | Bring brochures next time |
| 2026-05-06 | Wednesday | Duaa | Clinica San Miguel | Frisco | PCP | Postponed | | | | 2026-05-13 | No | Yes | No | |
| 2026-05-06 | Wednesday | Dr Ahsan; Duaa | ICQC Frisco | Frisco | | Completed | | | Outreach event | | No | Yes | Yes | 200+ attendees |
| 2026-05-08 | Friday | Ms Sadia | Bloomfield | Frisco | PCP | Canceled | | | | | No | Yes | No | Office closed for holiday |

**How team uses it:** weekly review meetings, manager spot-checks, dispute resolution.

### 2. `member_stats_2026-05.csv`
*One row per team member with their monthly totals.*

| Member | Total assigned | Completed | Postponed | Canceled | Pending | Leads — established | Leads — needs work | Leads — dead end | Completion % |
|---|---|---|---|---|---|---|---|---|---|
| Ms Sadia | 42 | 31 | 6 | 3 | 2 | 8 | 4 | 1 | 74% |
| Duaa | 38 | 27 | 5 | 2 | 4 | 5 | 6 | 2 | 71% |
| Dr Ahsan | 35 | 30 | 3 | 1 | 1 | 7 | 2 | 0 | 86% |
| Abrar Mamun | 18 | 14 | 2 | 1 | 1 | 3 | 1 | 0 | 78% |

**How team uses it:** monthly 1-on-1 reviews, ranking, bonus calc, KPI scorecards.

### 3. `team_stats_2026-05.csv`
*Single-table team totals + target vs actual.*

| Metric | Value |
|---|---|
| Month | May 2026 |
| Total assigned visits | 133 |
| Completed | 102 |
| Postponed | 16 |
| Canceled | 7 |
| Pending | 8 |
| Leads established | 23 |
| Team monthly target | 120 |
| **Completion %** | **85%** |

**How team uses it:** the one number you show senior leadership. Goes on a dashboard slide.

### 4. `spending_2026-05.csv`
*Every confirmed visit's spending — itemized.*

| Date | Member | Business | Tier at save | Per-visit cap | Visit total | Over cap? | Override reason | Zero spending? | Item | Qty | Price each | Item total | Confirmed by | Confirmed at |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 2026-05-06 | Ms Sadia | MD Medical Group | A | $50 | $32.50 | No | | No | Coffee gift box | 1 | 25.00 | 25.00 | Ms Sadia | 2026-05-06T15:20 |
| 2026-05-06 | Ms Sadia | MD Medical Group | A | $50 | $32.50 | No | | No | Greeting card | 1 | 7.50 | 7.50 | Ms Sadia | 2026-05-06T15:20 |
| 2026-05-06 | Duaa | EPIC Plano | B oc | $30 | 0 | No | | Yes | — (zero spending) | | | | Duaa | 2026-05-06T18:00 |
| 2026-05-08 | Dr Ahsan | Castle Hills Clinic | A | $50 | $48.00 | No | | No | Restaurant gift card | 1 | 48.00 | 48.00 | Dr Ahsan | 2026-05-08T14:10 |

**How team uses it:** monthly reconciliation with accounting. Audit trail. Per-tier compliance.

---

## 📊 QUARTERLY BUNDLE — 2 files

Triggered by: Reports tab → "Download quarterly CSVs" → pick quarter. Example filenames assume **2026-Q2**.

### 1. `referrals_by_clinic_2026-Q2.csv`
*Locked snapshot of every business's quarter performance.*

| Business | Type | Category | Period | Patient referrals | Tier (locked) | $ Per-visit cap | $ Period budget | Period $ spent | Counter type |
|---|---|---|---|---|---|---|---|---|---|
| MD Medical Group | clinic | | 2026-Q2 | 14 | A | $50 | $300 | $187.50 | period-reset |
| Clinica San Miguel | clinic | | 2026-Q2 | 5 | C | $20 | $100 | $40.00 | period-reset |
| Davenport Law | mva | | 2026-Q2 | 3 | B mva | $35 | $150 | $70.00 | period-reset |
| ICQC Frisco | outreach | scheduled | 2026-Q2 | 9 | A oc | $40 | $200 | $112.00 | period-reset |
| Frisco Chamber of Commerce | outreach | random | 2026-Q2 | 22 | — | — | — | $35.00 | lifetime (random) |

**How team uses it:** tier-up decisions for next quarter. Per-clinic ROI ranking. Vendor performance.

### 2. `quarterly_summary_2026-Q2.csv`
*Team-level quarter totals + per-type breakdown.*

| Metric | Value |
|---|---|
| Quarter | 2026-Q2 |
| Period start | 2026-04-01 |
| Period end | 2026-06-30 |
| --- | --- |
| Total visits (all statuses) | 405 |
| Completed | 312 |
| Postponed | 49 |
| Canceled | 18 |
| Pending | 26 |
| Leads established | 71 |
| Total spending ($) | $4,287.50 |
| --- | --- |
| Clinic visits | 287 |
| Clinic spend $ | $2,890.00 |
| MVA visits | 64 |
| MVA spend $ | $810.50 |
| Outreach visits | 54 |
| Outreach spend $ | $587.00 |

**How team uses it:** quarterly business review. Compare against last quarter. Identify trends.

---

## ⚠ Gaps I see (suggested additions — your call)

If you want, I can add these to the bundles. They use data the app already tracks:

### Suggested for MONTHLY
- `outreach_engagement_2026-05.csv` — per-outreach numeric counters that we just built (Reached / Interested / Emails / Phones / Consent). Helps measure community-event productivity.
- `patient_referrals_2026-05.csv` — every patient referral logged by front-desk in May, with timestamp, member credited (single OR multi-member), source business, channel (Google / walk-in / etc.), destination facility.
- `member_call_conversions_2026-05.csv` — Duaa's "+1 Convert" entries (calls she handled that became patient visits).

### Suggested for QUARTERLY
- `lead_journey_2026-Q2.csv` — per-clinic lead-status history (e.g., "Bloomfield: Not Visited → Needs Work → L1 — Front Desk → L2 — Coordinator" with dates). Shows which clinics moved up or down over the quarter.
- `member_quarterly_ranking_2026-Q2.csv` — full member ranking with multiple metrics (visits, completion %, established leads, $ spent) so leadership can decide bonuses / promotions / recognitions.

---

## 📋 Pick what you want

For each bundle, tell me one of:

- ✅ **"keep as-is"** — current 4-CSV / 2-CSV bundles are fine
- ➕ **"add X, Y"** — add the suggested files you want
- 🔄 **"change column N to Z"** — rename / add / remove specific columns
- 📐 **"split file X into Y and Z"** — restructure a sheet

Once you tell me, I'll write the export functions for any new sheets, hook them into the existing "Download bundle" buttons, and push.
