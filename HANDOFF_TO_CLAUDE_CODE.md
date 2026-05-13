# 📋 ICC Marketing Planner — Project Handoff

**Last updated:** 2026-05-13
**Status:** Single-file HTML app running locally + comprehensive Azure deployment plan ready

---

## ⚠ Read this first

The previous version of this handoff (May 8) described migrating to **Next.js + Supabase + Vercel**. That plan is **OBSOLETE**. The current direction is:

- ✅ **Stay with the single HTML file** as the user-facing app
- ✅ **Microsoft-only stack** — Azure for hosting + Cosmos DB for data
- ❌ **Vercel banned** by the customer
- ❌ **No rewrite to Next.js / Supabase**

**The master plan lives in `AZURE_SHAREPOINT_SETUP.md` — read that for the actual architecture and deployment steps.** This file is a high-level orientation for anyone new to the project.

---

## 🗂 What's in this folder

```
CODE PROJECT/
├── marketing_schedule_FINAL4.html          ← The app. Single file. Open in any browser.
├── AZURE_SHAREPOINT_SETUP.md               ← The master deployment plan. Read this.
├── HANDOFF_TO_CLAUDE_CODE.md               ← (this file)
├── logo.jpeg                                ← ICC of Texas logo
├── *.backup-*.html                          ← Safety backups before major changes
│
├── infra/
│   └── main.bicep                          ← One-click Azure resource creation
│
├── api/                                     ← Azure Functions API (Node.js 18)
│   ├── host.json
│   ├── package.json
│   └── src/
│       ├── shared/
│       │   ├── cosmos.js                   ← Cosmos DB client + helpers
│       │   └── auth.js                     ← Server-side role enforcement
│       └── functions/
│           ├── visits.js                   ← GET/POST/PUT/DELETE /api/visits
│           ├── spending.js                 ← /api/spending CRUD
│           ├── referrals.js                ← /api/referrals + adjust + rollover
│           ├── businesses.js               ← /api/businesses (clinic/mva/outreach)
│           └── exports.js                  ← /api/export/monthly + quarterly
│
├── scripts/
│   └── seed.js                             ← Initial data migration HTML → Cosmos
│
├── flows/
│   └── README.md                           ← Power Automate flow setup instructions
│
├── staticwebapp.config.json                 ← Azure SWA routing + Entra ID auth
│
└── .github/workflows/
    └── azure-deploy.yml                    ← Auto-deploy on git push
```

---

## 🎯 What the app does

A team marketing planner used by ICC of Texas marketing staff to:

1. **Schedule visits** to clinics, MVA attorney firms, and community outreach orgs
2. **Track visit outcomes** (Completed / Postponed / Canceled + lead status)
3. **Log spending** per visit (with per-tier per-visit cap + per-quarter budget pool)
4. **Track patient referrals** per business — used to rank businesses into tiers
5. **Run quarterly ranking** that locks tiers + budgets for the next 3 months
6. **Export monthly + quarterly reports** to SharePoint as Excel files

---

## 🧱 Tech stack (current)

| Layer | Technology | Why |
|---|---|---|
| Frontend | Single HTML file with inline JS + CSS | Customer wants iterative changes without a build step. Easy to edit, easy to deploy, no framework overhead. |
| Data persistence (today) | Browser localStorage | Works offline; per-user; **migrating to Cosmos DB** |
| Data persistence (after Azure) | Azure Cosmos DB for NoSQL (serverless) | Shared across users; auto-backups; scales to zero |
| API | Azure Functions (Node.js 18) | Cheap; same JavaScript the HTML uses |
| Hosting | Azure Static Web Apps (Standard tier — $9/mo) | Built-in Entra ID auth; HTTPS; custom domain |
| Auth | Microsoft Entra ID (single sign-on with @iccoftexas.com) | No password management |
| Reports → SharePoint | Power Automate (M365) | Scheduled monthly + quarterly |
| Monitoring | Application Insights | Free tier covers our scale |

---

## 🔑 Critical business rules (preserve at all costs)

These are in the HTML and the API must enforce the same rules server-side.

### Visit editing window
- Members can edit visits within **2 days after visit date** (`visit_date + 2 days` = last editable day)
- Admin bypasses this
- Future dates: always editable
- Past locked dates: greyed out + struck through in calendar popup

### Spending edit window
- 5 PM cutoff on `visit_date + 3 days`
- Admin bypasses

### Status restrictions
- **Cannot mark "Completed" before visit date** — even admin
- Other statuses (Pending / Postponed / Canceled) work for any date
- **Cannot reschedule to a past date** — even admin

### Counter philosophy
- All counters are **live calculations** from raw data — never stored as derived values
- "This week" = current Monday–Sunday range
- "This month" = current calendar month
- Editing a visit auto-updates counters
- Lead counters pull from each visit's `relationship` field

### Period rollover (quarterly)
- Triggered automatically when the calendar quarter changes (Q1/Q2/Q3/Q4)
- For each business, current ref count → snapshotted into `history[]` with the quarter label
- Live count → resets to 0
- **EXCEPT random + holiday outreach** — those are LIFETIME counters and never reset

### Permission rules
- **Admin:** bypasses most permission checks (NOT the date-integrity rules above)
- **Member:** own profile/work editable; can view others read-only
- **Manager:** read-only everywhere
- **Ms Sadia:** also has "referral editor" privilege — can adjust patient-referral counts on Bank cards
- **Lead status update:** only the establisher + admin can change
- **Announcement delete:** only poster + admin
- **Side activity add/delete:** only own member

### Three-level visit confirmation
1. Member confirms they accept the assignment (memberConfirmed = true)
2. Spending saved (if any)
3. Final row-level confirmation (rowConfirmed = true) — only then does spending appear in the Spending Log

### Period budget (added 2026-05)
- Each business tier has a per-visit cap AND a per-quarter budget pool
- Every confirmed visit's spending deducts from the pool
- Pool exhausted → admin approval modal opens with both reasons (cap + budget)
- Toggle in Tier Settings: "ENFORCING / OFF" — turns off the period budget enforcement (cap-only mode)

---

## 🎨 Design tokens

```css
--navy:   #1F3864
--purple: #7030A0
--surface: #f7f8fc
--card:   #ffffff
--border: #e4e7ef
--text:   #1a2233
--muted:  #6b7a99

Member colors:
- Duaa:     #1e40af (blue)
- Ms Sadia: #166534 (green)
- Dr Ahsan: #5b21b6 (purple)

Tier colors (Bronze → Silver → Gold → Platinum):
- Bronze:   #b87333 (copper)
- Silver:   #94a3b8 (slate)
- Gold:     #ca8a04 (yellow)
- Platinum: #7030A0 (purple)

Member view background: linear-gradient(180deg, #e0f2fe → #eff6ff)
Admin view background: linear-gradient + purple/burgundy hero photo

Font: 'DM Sans' (UI), 'DM Mono' (numbers/clock)
```

---

## 👤 User accounts (current, before Entra ID migration)

| Username | Password | Role | Notes |
|---|---|---|---|
| `admin` | `1234` | admin | Full access |
| `duaa` | `Duaa@WCG2026` | member | Marketing Agent — also a Call Handler |
| `sadia` | `Sadia@WCG2026` | member | VP Marketing Lead — also "referral editor" |
| `ahsan` | `Ahsan@WCG2026` | member | Marketing Agent |
| `manager` | `Manager@WCG2026` | readonly | View-only |

**Security note:** these passwords are visible in the HTML source. **Migration to Entra ID is mandatory before public deployment** — see `AZURE_SHAREPOINT_SETUP.md` Section 6.3.

---

## 🌐 Tabs (the app's information architecture)

After the 2026-05-13 IA cleanup:

1. **🏠 Home** (default landing) — welcome banner, today's snapshot, 4 quick-action cards
2. **📅 Dashboard** — Planning Calendar + Team Overview + Member cards + Coming Events + Observances
3. **📊 Status** — Established leads CRM with member counters
4. **👥 Team** — Org chart + member profile (Overview / Performance / History)
5. **🏢 Businesses** — Bank of Targets · Visits · Podcast Schedule
   - Sub: Clinics · MVA Attorneys · Community Outreach (Random / Scheduled / Holidays)
6. **💰 Finances** — Spending Log · Rankings · Tier Settings · Quarterly Rankings
7. **📋 Reports** — Monthly progress + Bulk Export (CSV download buttons)
8. **📡 Activity Feed** — Audit log of confirmed visits

Member-view (non-admin) renders as Azure-style left sidebar with accordion groups for items that have sub-tabs.

---

## 📅 Schedule fundamentals

- **Date range:** May 1, 2026 → April 30, 2027 (1 full year, weekdays + weekends)
- **6 visit slots per day** + manual add for additional rows
- Each row: clinic/business, doctor, specialty, city, member, status, notes, spending
- Status: Pending / Postponed / Completed / Canceled
- Calendar locks: weekly target locks Monday 8 PM; visit edit window 2 days after; spending window 3 days after at 5 PM

---

## 🌱 Seed data (in the HTML, ready to migrate to Cosmos)

- **595 clinics** in `CLINIC_BANK`
- **20 MVA firms** in `MVA_ATTORNEYS`
- **46 outreach orgs** in `OUTREACH` (auto-classified into random/scheduled categories)
- **74 observances** in `OBSERVANCES` (auto-imported as `category:'holiday'` outreach cards)
- **3 tier-threshold sets** in `TIER_THRESHOLDS` (clinic/mva/outreach with Bronze/Silver/Gold/Platinum tiers)
- **3 members** in `MEMBERS` (Duaa, Ms Sadia, Dr Ahsan)
- **25 community events** in `EVENTS`
- **21 cities** for filter dropdowns

`scripts/seed.js` reads all of these from the HTML and writes them to Cosmos.

---

## 🚀 Suggested implementation order (Phase 2 — Azure migration)

Read `AZURE_SHAREPOINT_SETUP.md` Section 12 for the full schedule. TL;DR:

1. **Week 0** — Admin grants Azure access + IT creates SharePoint folder
2. **Week 1** — Deploy Bicep + seed Cosmos + first API endpoints (visits, spending, referrals)
3. **Week 2** — Migrate HTML's data layer from localStorage to API calls (feature-flagged)
4. **Week 3** — Set up Power Automate flows + iPhone polish + custom domain
5. **Go-live** — Members start using on real devices

---

## 🎯 What Claude Code (or future you) should do next

If you're picking this up fresh:

1. **Read `AZURE_SHAREPOINT_SETUP.md` first** — it has every decision already made
2. **Confirm with admin** that they have Azure access + Microsoft 365
3. **Run the Bicep template** (Section 6.1 of the setup doc) — this creates everything in 15 minutes
4. **Run `scripts/seed.js`** to populate Cosmos with the seed data
5. **Start the data-layer migration** in the HTML — add `Api.*` module, replace localStorage calls one feature at a time, feature-flag it so you can roll back
6. **Set up Power Automate** following `flows/README.md`
7. **Test on iPhone** — actual iPhone, not simulator
8. **Cutover** and start using it

If you're picking this up to **add a new feature** to the HTML (no migration yet):
- Edit `marketing_schedule_FINAL4.html` directly
- Save backups before risky changes (`cp marketing_schedule_FINAL4.html marketing_schedule_FINAL4.backup-before-X.html`)
- Test in Chrome via `npx serve` on port 3000
- The HTML is **canonical** — when in doubt, the HTML is the spec

---

## 📞 Project context

- **Customer:** Immediate Care Centers of Texas (ICC of Texas)
- **Tech constraints:** Microsoft-only stack, Azure approved, Vercel banned, 30-sec polling accepted (not real-time)
- **Primary users:** 3 marketing agents (Duaa, Ms Sadia, Dr Ahsan) + 1 admin
- **Primary device:** iPhone (members) + laptop (admin)
- **Existing infrastructure:** Microsoft 365 (SharePoint, Power Automate available), Azure subscription available

---

**End of handoff. The HTML and `AZURE_SHAREPOINT_SETUP.md` are the source of truth.**
