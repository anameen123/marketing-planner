# 🎯 Marketing Coordinator Role → Website Coverage Analysis

**Source:** Marketing & Community Outreach Coordinator role description (ICC of Texas)
**Compared against:** Marketing Planner web app, as of 2026-05-14
**Legend:**
- ✅ **Covered** — feature exists in the app
- ⚠ **Partial** — partially covered; admin handles some of it manually
- ❌ **Not covered** — out of scope, would need a new feature OR happens elsewhere (Outlook, social tools, etc.)

---

## Executive summary

The marketing planner covers about **45-55%** of the coordinator role, focused mainly on:
- The **operational tracking** half (calendar, visits, referrals, lead status, spending)
- The **outreach scheduling** half (clinics, MVA firms, community orgs)
- The **performance metrics** half (rankings, monthly/quarterly reporting)

What it does **NOT** cover:
- **Content / Brand work** (social media, ads, newsletters, scripting, brand audits)
- **Materials & inventory** (print materials, promotional items, signage)
- **Patient-experience touchpoints** (satisfaction surveys, hospitality, concierge work)
- **External communications** (emails to vendors, agencies, partners)

These are areas the coordinator handles outside this tool — typically in Outlook, social platforms, design software, or paper/spreadsheets.

---

## 1. STRATEGY PLANNING & COORDINATION

| Responsibility | App coverage | Notes |
|---|---|---|
| Coordinate weekly marketing meetings | ❌ | Happens in Outlook / Teams |
| Maintain marketing activity calendar | ✅ | **The Dashboard tab IS this — full year, 6 slots/day** |
| Track campaigns & community events | ✅ | **Events panel + Observances + Outreach orgs tracked** |
| Align with digital marketing team | ⚠ | App doesn't have a digital-marketing module; coord is offline |
| Prepare weekly/monthly reports | ⚠ | **Bulk CSV export works manually; Power Automate auto-export planned** |

### Deliverables

| Deliverable | App coverage |
|---|---|
| Marketing calendar | ✅ — Dashboard |
| Campaign tracking sheets | ⚠ — visits track activity, but no "campaign" entity yet |
| Weekly activity updates | ⚠ — Reports tab has progress views; weekly summary not auto-generated |
| KPI dashboard updates | ⚠ — Home + Team Performance show stats; not auto-exported daily |

---

## 2. COMMUNITY OUTREACH & EDUCATION

| Responsibility | App coverage | Notes |
|---|---|---|
| Build relationships with faith-based groups, schools, HOAs & orgs | ✅ | **OUTREACH database (46 entries — mosques, temples, churches, schools, chambers, MAs)** |
| Schedule & coordinate health events | ✅ | **Calendar + Events + Holiday observances tied to outreach** |
| Coordinate free screenings & educational workshops | ⚠ | Can be scheduled as a visit, but no "screening" event type with attendee tracking |
| Organize sponsorships & community participation | ❌ | Not in app — handled externally |

### Deliverables

| Deliverable | App coverage |
|---|---|
| Outreach schedules | ✅ — Random/Scheduled/Holiday categorized + on calendar |
| Community contact database | ✅ — OUTREACH list (46 organizations) |
| Event sign-up sheets | ❌ — not in app |
| Partnership tracking log | ⚠ — lead status (L1-L4) tracks relationship depth |

---

## 3. BRAND POSITIONING & AWARENESS

| Responsibility | App coverage |
|---|---|
| Communicate facility differentiators | ❌ |
| Ensure consistent messaging across all platforms | ❌ |
| Train staff on key messaging | ❌ |
| Distribute branded materials | ❌ |
| Maintain facility marketing displays | ❌ |

### Deliverables

| Deliverable | App coverage |
|---|---|
| Staff scripting guides | ❌ |
| Brand consistency audits | ❌ |
| Collateral inventory | ❌ |
| Promotional material coordination | ❌ |

> **Section coverage: 0% — entire area is outside the app's scope.** This is content / brand / training work that lives in Word docs, designed materials, training sessions.

---

## 4. MARKETING EXECUTION (ONLINE & OFFLINE)

### Digital Marketing Coordination

| Responsibility | App coverage |
|---|---|
| Coordinate social media & content | ❌ |
| Work with digital marketing agency | ❌ |
| Email newsletters, reviews, ads | ❌ |
| Monitor online engagement | ❌ |

### Offline Marketing Coordination

| Responsibility | App coverage |
|---|---|
| Coordinate print materials, flyers | ❌ |
| Manage promotional items & inventory | ❌ |
| Local print ads & community materials | ❌ |

### Deliverables

| Deliverable | App coverage |
|---|---|
| Social media calendar | ❌ |
| Newsletter drafts | ❌ |
| Promotional inventory logs | ❌ |
| Monthly performance summaries | ⚠ — monthly Excel export planned |

> **Section coverage: ~5% — almost entirely outside the app's scope.** This is digital/print marketing execution work handled by the digital team, agencies, design tools.

---

## 5. PATIENT ENGAGEMENT & PROMOTIONS

| Responsibility | App coverage |
|---|---|
| Coordinate monthly ER events | ⚠ — Events panel exists |
| Manage review incentive programs | ❌ |
| Organize patient appreciation campaigns | ❌ |
| Develop loyalty & engagement initiatives | ❌ |
| Coordinate follow-up communications | ❌ |

### Deliverables

| Deliverable | App coverage |
|---|---|
| Event plans & checklists | ❌ |
| Engagement reports | ❌ |
| Review tracking logs | ❌ |
| Promotional campaign summaries | ❌ |

> **Section coverage: ~10%** — events are partially tracked. The other items (loyalty, reviews, campaigns) are outside this tool.

---

## 6. REFERRAL NETWORK DEVELOPMENT ⭐ STRONGEST AREA

| Responsibility | App coverage | Notes |
|---|---|---|
| Build relationships with PCPs, urgent cares, specialists & more | ✅ | **CLINIC_BANK (595 clinics) + MVA_ATTORNEYS (20 firms) — full database** |
| Schedule clinic visits & presentations | ✅ | **The core of the app — entire calendar workflow** |
| Deliver referral materials & education | ⚠ | Materials themselves aren't tracked, but the VISIT that delivers them is |
| Maintain referral databases | ✅ | **CLINIC_BANK + BUSINESS_REFERRALS with per-business counts + history** |
| Track inbound & outbound referrals | ✅ | **BUSINESS_REFERRALS (referrals received), visit logs (outbound outreach)** |

### Deliverables

| Deliverable | App coverage |
|---|---|
| Referral tracking reports | ✅ — Rankings tab + monthly CSV exports |
| Clinic visit logs | ✅ — entire calendar + member history |
| Referral partner database | ✅ — CLINIC_BANK + MVA_ATTORNEYS |
| Outreach follow-up documentation | ✅ — Lead status (L1-L4) + visit notes + next-visit notes |

> **Section coverage: ~95%** — this is what the app was built for. The strongest match.

---

## 7. PATIENT EXPERIENCE SUPPORT

| Responsibility | App coverage |
|---|---|
| Support concierge patient experience initiatives | ❌ |
| Assist patient care coordinators | ❌ |
| Monitor patient satisfaction feedback | ❌ |
| Coordinate hospitality touchpoints | ❌ |
| Ensure marketing promises align with patient experience | ❌ |

### Deliverables

| Deliverable | App coverage |
|---|---|
| Patient satisfaction summaries | ❌ |
| Improvement recommendations | ❌ |
| Follow-up coordination logs | ❌ |

> **Section coverage: 0%** — entirely patient-facing work that happens at the clinic + via separate patient satisfaction tools (CRM, surveys, etc.). Not where this app lives.

---

## 8. MARKETING ANALYTICS & OPTIMIZATION

| Responsibility | App coverage | Notes |
|---|---|---|
| Track & report key marketing metrics | ⚠ | **Member stats + Rankings + Finances** — partial picture |
| Monitor campaign performance | ⚠ | No campaign entity, but visit outcomes tracked |
| Analyze community engagement | ⚠ | Outreach activity tracked via visits + leads |
| Measure ROI of marketing activities | ⚠ | **Spending data + Rankings = rough ROI signal**, no formal ROI computation |
| Recommend strategy improvements | ❌ | Human analysis only |

### Deliverables

| Deliverable | App coverage |
|---|---|
| Monthly KPI reports | ⚠ — manual export today, auto-export coming |
| Marketing ROI analysis | ⚠ — Finances tab has the raw data |
| Referral growth reports | ✅ — Rankings tab |
| Strategy improvement recommendations | ❌ |

> **Section coverage: ~40%** — raw data is here, but human analysis + recommendations happen offline.

---

## Operational Timeframe Coverage

### DAILY

| Task | App coverage |
|---|---|
| Answer outreach emails/calls | ❌ — Outlook / phone |
| Schedule meetings & events | ✅ — Dashboard calendar |
| Coordinate vendor communication | ❌ |
| Maintain marketing CRM & contact databases | ✅ — Bank of Targets |
| Update marketing spreadsheets | ✅ — **the app replaces spreadsheets entirely** |
| Order supplies & materials | ❌ |
| Facility branding walkthroughs | ❌ |

### WEEKLY

| Task | App coverage |
|---|---|
| Marketing team meeting | ❌ |
| Referral outreach follow-up | ✅ — leads + visits |
| Social media coordination | ❌ |
| Community engagement planning | ✅ — outreach scheduling |
| Marketing analytics review | ⚠ — Rankings + member stats |
| Event coordination | ✅ — Events panel |

### MONTHLY

| Task | App coverage |
|---|---|
| Community event execution | ✅ — calendar + Outreach |
| Referral partner visits | ✅ — core function |
| Marketing ROI reporting | ⚠ — partial via Reports/exports |
| Promotional campaign review | ❌ |
| Patient engagement initiatives | ⚠ — via visits |
| Leadership marketing presentation | ⚠ — Reports tab gives the data |

---

## KPIs Coverage

### Community Growth

| KPI | App coverage |
|---|---|
| # of outreach events | ✅ — calendar shows all |
| Community partnerships | ✅ — OUTREACH database |
| Event attendance | ❌ — not tracked per event |

### Referral Growth ⭐

| KPI | App coverage |
|---|---|
| New referral partners | ✅ — CLINIC_BANK additions tracked |
| Referral volume growth | ✅ — BUSINESS_REFERRALS counts + history |
| Clinic engagement frequency | ✅ — visit frequency per clinic |

### Patient Engagement

| KPI | App coverage |
|---|---|
| Google review growth | ❌ |
| Social media engagement | ❌ |
| Patient participation rates | ❌ |

### Marketing Performance

| KPI | App coverage |
|---|---|
| Campaign ROI | ⚠ — spending tracked, not formal campaign ROI |
| Website/social traffic | ❌ |
| Lead conversion metrics | ⚠ — leads tracked (L1-L4); patient conversion is downstream |

---

## Overall coverage by section

| Section | Coverage |
|---|---|
| **6. Referral Network Development** | ✅ **~95%** |
| **2. Community Outreach & Education** | ✅ **~70%** |
| **1. Strategy Planning & Coordination** | ⚠ **~55%** |
| **8. Marketing Analytics & Optimization** | ⚠ **~40%** |
| **5. Patient Engagement & Promotions** | ⚠ **~10%** |
| **4. Marketing Execution** | ❌ **~5%** |
| **3. Brand Positioning & Awareness** | ❌ **0%** |
| **7. Patient Experience Support** | ❌ **0%** |
| **OVERALL** | **~47%** |

---

## 🎯 What the app does best

1. **Referral network management** — clinics, MVA firms, outreach orgs all in one place, with tier-based rankings
2. **Visit calendar + scheduling** — the daily operational workflow
3. **Lead tracking** — relationship depth (L1-L4) per business
4. **Activity logging** — every visit, completion, spending entry
5. **Team coordination** — live sync so everyone sees the same data

## 🤔 What the app deliberately doesn't do

The app is a **marketing OPERATIONS tool**, not a marketing CONTENT or BRAND tool. Items NOT in scope:

- ❌ Social media content creation / scheduling (use Hootsuite / Sprout / etc.)
- ❌ Email newsletter / campaign management (use Mailchimp / Constant Contact / etc.)
- ❌ Patient satisfaction surveys (use Press Ganey / CG-CAHPS / etc.)
- ❌ Brand asset / style-guide management (use SharePoint or Word docs)
- ❌ Promotional inventory tracking (use Excel or a dedicated inventory app)
- ❌ Print material design / production (use Canva / Adobe / etc.)

Adding any of these would expand the app significantly. Each is a 1-2 week feature on its own.

---

## 🛠 What we COULD add (prioritized)

If you want to expand the app's coverage of this role, here are the highest-impact additions:

### High value, small effort (1-3 hours each)

1. **Campaign entity** — wrap multiple visits under a named campaign (e.g., "Q1 Frisco Push"). Auto-rolls up ROI from spending + new leads.
2. **Materials inventory** — simple list of promotional items + counts. Decrement when used on a visit.
3. **Event attendance tracking** — add an "attendees" field to each outreach event row.
4. **Vendor / agency log** — small panel for tracking digital agency, print vendors, with contact info + last touchpoint.

### Medium effort (3-8 hours each)

5. **Google reviews integration** — read review counts via Google Business Profile API (would need API key + admin consent).
6. **Brand asset library** — link out to SharePoint folder for materials/scripts/audits.
7. **Patient satisfaction widget** — quick survey scores per location, with month-over-month trend.

### Bigger projects (1-2 days each)

8. **Social media calendar** — separate panel mirroring the visit calendar but for posts.
9. **Newsletter draft tracker** — manage draft content + approval flow.
10. **Campaign ROI calculator** — formal model: spending in × referral revenue out per campaign.

---

## 📊 The honest read

For the **operational, daily/weekly/monthly workflow** of the Marketing Coordinator role — the app is well-suited.

For the **content, branding, patient-experience** sides of the role — the app intentionally doesn't try to be everything. The coordinator uses Outlook, Teams, design software, social platforms, and CRM tools to handle those.

This split is **on purpose**:
- A focused tool is better than a sprawling one
- Marketing teams already have tools for content / social — duplicating them creates work
- The app's strength is what it owns: visits, referrals, leads, and team coordination

If you want it to do MORE (the items in the "What we could add" list), that's a conversation for the next dev cycle.

---

**Generated:** 2026-05-14
**Compare to image:** Marketing & Community Outreach Coordinator job description (provided by Mahmoud)
