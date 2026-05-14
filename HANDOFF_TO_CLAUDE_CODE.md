# 📋 ICC Marketing Planner — Project Handoff

**Last updated:** 2026-05-14 (end of day session)
**Status:** ✅ LIVE IN PRODUCTION — fully functional, tested end-to-end, used by 5-person team. Trial period starting.

---

## ⚠ Read this first if you're a new Claude / new developer

You're picking up a working production app. Don't break things.

**Current architecture (LOCKED — do not pivot):**
- ✅ **Single HTML file** as the app: `marketing_schedule_FINAL4.html` (~1.3 MB self-contained)
- ✅ **GitHub Pages (public repo)** hosting at `https://anameen123.github.io/marketing-planner/marketing_schedule_FINAL4.html`
- ✅ **SharePoint Document Library** for shared team data (file-based storage, NOT Lists — we switched because Lists has 64K char limit)
- ✅ **Microsoft Entra ID** for auth via MSAL.js v3 — no more hardcoded passwords (admin/1234 etc. removed)
- ✅ **DataLayer abstraction** (in HTML) — single chokepoint for all reads/writes; routes to localStorage cache + SharePoint via Graph API
- ✅ **5-second polling** for live sync between team members
- ✅ **Microsoft-only stack** — customer requirement (no AWS, no Vercel)
- ✅ **Cost: $0/month** — uses existing M365 + free GitHub tier

**REJECTED architectures** (don't propose these again):
- ❌ Azure Cosmos DB + Static Web Apps — user has no Azure subscription
- ❌ Vercel — banned by customer
- ❌ Supabase — not Microsoft, banned by customer
- ❌ SharePoint Lists (multi-line text columns) — hit the 64K limit
- ❌ Private GitHub repo (with Pages) — would need GitHub Pro $4/mo, user chose public + security hardening

The Azure-first attempt files (`api/`, `infra/main.bicep`, `scripts/seed.js`) are still in the repo as a back-pocket reference but are **NOT in the execution path**.

---

## 🟢 Production deployment state

| Component | Status | Where |
|---|---|---|
| **Live URL** | ✅ Serving 200 OK | https://anameen123.github.io/marketing-planner/marketing_schedule_FINAL4.html |
| **Entra ID app registration** | ✅ Live in wcgtx.com tenant | Client ID `0447f26e-7a21-4c67-90a0-e967ee70a10f` |
| **IT admin consent** | ✅ Granted (yesterday by WCG IT) | Sites.ReadWrite.All + User.Read |
| **SharePoint site** | ✅ Active | https://wcgtx.sharepoint.com/sites/mkt |
| **M365 Group** | ✅ 5 members (Mahmoud + 3 members + 1 readonly) | Group ID `cdf645b7-5c7e-467d-824c-305c21575e20` |
| **Data folder** | ✅ Auto-created | `MarketingPlannerData/` under Documents |
| **First seed-up** | ✅ Schedule.json (596 KB) uploaded | Verified via Graph API |
| **Live sync** | ✅ Verified bidirectional | Tested: modify SP via Graph → user's browser updates within 5 sec |
| **Sign-out** | ✅ Instant (no Microsoft popup) | Uses MSAL clearCache, not logoutPopup |

---

## 👥 Team roster (in `EMAIL_USER_MAP` + M365 Group)

| Email | Role | App username | Display name | Color |
|---|---|---|---|---|
| `malthaher@wcgtx.com` | admin | admin | Mahmoud Althaher | #1F3864 (navy) |
| `dkhan@wcgtx.com` | member | duaa | Duaa Khan | #7030A0 (purple) |
| `skhan@frisco-er.com` (guest) | member | sadia | Ms Sadia (Sadia Khan) | #2563eb (blue) |
| `aparacha@wcgtx.com` | member | ahsan | Dr Ahsan Paracha | #059669 (green) |
| `ashuja@wcgtx.com` | readonly | manager | Ahmed Shuja | #64748b (grey) |

**To add a new member:**
1. User adds them to the M365 Group via SharePoint UI (member panel)
2. Claude adds their email to `EMAIL_USER_MAP` in HTML
3. Push to GitHub → live in ~30 sec

**To permanently remove:**
1. User removes from M365 Group
2. Claude removes from `EMAIL_USER_MAP`
3. All their historical data STAYS (visits, leads, spending, rankings) — only access is revoked

---

## 🧱 Tech stack (current — locked)

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Single HTML file with inline JS/CSS | No build, no framework |
| Data persistence | `DataLayer` module → SharePoint Documents library (JSON files) | 7 tracked keys mapped to 7 files |
| Live sync | 5-sec polling via Microsoft Graph API | Configurable; `pollIntervalMs: 5000` |
| Auth | MSAL.js v3 (SPA + delegated `Sites.ReadWrite.All`) | App reg in WCG tenant |
| Hosting | GitHub Pages from `main` branch | Auto-deploys on push |
| Local cache | localStorage (write-through cache) | Survives offline + refresh |
| Reports | Manual CSV exports built-in + Power Automate planned for auto Excel | Folder structure created in SP |
| Monitoring | Browser console + SharePoint version history + Entra ID sign-in logs | No App Insights needed |

---

## 📁 SharePoint data files (what's where)

```
https://wcgtx.sharepoint.com/sites/mkt
  → Documents
    → MarketingPlannerData/
      ├── schedule.json                     ← all visits (~600 KB)
      ├── business-referrals.json            ← referral counts per business + history
      ├── tier-thresholds.json               ← Bronze/Silver/Gold/Platinum thresholds + caps
      ├── settings-period-budget.json        ← global toggle for period budget enforcement
      ├── settings-reset-interval.json       ← quarterly | monthly toggle (added 2026-05-14)
      ├── admin-notifications.json           ← activity bell entries
      ├── clinic-leads.json                  ← lead status (L1-L4) per business
      ├── display-names.json                 ← admin's display-name overrides
      │
      └── Reports/
          ├── Monthly/                       ← Power Automate auto-drops (not yet wired)
          ├── Quarterly/                     ← Power Automate auto-drops (not yet wired)
          ├── Manuals/
          │   ├── MEMBER_MANUAL.pdf          ← user-facing guide
          │   ├── TECHNICAL_MANUAL.pdf       ← architecture docs
          │   └── COVERAGE_ANALYSIS.pdf      ← role vs app coverage (~47%)
          └── Archive/                        ← future use
```

---

## 🔑 Critical business rules (preserve at all costs)

Same as the original handoff — these are enforced in the HTML and must NOT be removed:

### Visit edit window
- Members can edit within **2 days after visit date** (`visit_date + 2 days` = last editable day)
- Admin bypasses

### Spending edit window
- 5 PM cutoff on `visit_date + 3 days`
- Admin bypasses

### Status restrictions
- **Cannot mark "Completed" before visit date** — even admin
- **Cannot reschedule to a past date** — even admin

### Counter philosophy
- All counters are **live calculations** from raw data — never stored as derived values
- "This week" = current Monday–Sunday range
- "This month" = current calendar month

### Period rollover
- Configurable: quarterly (default) OR monthly (trial mode via `RESET_INTERVAL` setting)
- Quarterly: snapshot each business's currentRefs → history[]; reset to 0
- Random + Holiday outreach = LIFETIME counters, NEVER reset

### Permission rules
- **Admin** — bypasses most checks (NOT date-integrity)
- **Member** — own work editable; can view others read-only
- **Manager (readonly)** — view-only everywhere

### Three-level visit confirmation
1. Member confirms assignment (`memberConfirmed`)
2. Spending saved (if any)
3. Final row-level confirmation (`rowConfirmed`)

### Activity bell (added 2026-05-13)
- Lives in the shared header (admin + members; hidden for readonly)
- Admin sees all admin-override notifications
- Members see only entries where `originalAuthor === CURRENT_USER.name`

### Lead level editor (added 2026-05-14)
- Each clinic + MVA card has "+ Set Lead" / "✎ Change" button
- Picks L1 / L2 / L3 / L4 (or Clear)
- Stored in `clinic-leads.json` via `setClinicLead` (existing infrastructure)

### Click visit-info → jump to bank card (added 2026-05-14)
- Clinic name in calendar visit-info is clickable
- Navigates to Businesses → correct sub-tab → filters by name → scrolls + highlights

---

## 🛤 Major features completed (chronological)

| Date | Feature | Commits |
|---|---|---|
| 2026-05-13 | DataLayer abstraction | `0791bee` |
| 2026-05-13 | SharePoint backend code | `0fe6f30` |
| 2026-05-13 | Microsoft sign-in UI | `a09627d` |
| 2026-05-13 | Entra ID credentials wired | `a415796` |
| 2026-05-13 | Auto-bootstrap on MS sign-in | `8341258` |
| 2026-05-13 | Seed-up data safety | `8282e2e` |
| 2026-05-13 | iPhone meta tags + 44px tap targets | `9a16d2d` |
| 2026-05-13 | Auto-resume MS session | `8982ad5` |
| 2026-05-13 | Sync status badge | `4a3afee` |
| 2026-05-13 | iOS Add-to-Home-Screen hint | `8dcfc44` |
| 2026-05-13 | Reconnect button on sync errors | `b5dcf9b` |
| 2026-05-13 | **Bug fix:** Lists → Document Library (64K limit) | `08e47f2` |
| 2026-05-13 | Bootstrap auto-retry (exp backoff) | `1f19035` |
| 2026-05-14 | Friendlier MSAL error messages | `d72f986` |
| 2026-05-14 | **Security:** removed leaked Azure secret + scrubbed history | `4d8bbb7`, `26b3d68` |
| 2026-05-14 | **Security:** removed leaked Eventbrite token + scrubbed history | `d991d58` |
| 2026-05-14 | Removed hardcoded passwords; dev-mode-only legacy login | `26b3d68` |
| 2026-05-14 | SECURITY.md policy + gitleaks pre-commit hook | (same) |
| 2026-05-14 | Site config pointed at `/sites/mkt` | `ed61392` |
| 2026-05-14 | Manager (Ahmed Shuja) added to access list | `2bbcd65` |
| 2026-05-14 | Admin name changed to "Mahmoud Althaher" + rename feature | `ecee61a` |
| 2026-05-14 | **Feature:** click visit-info → jump to bank card with pulse | `7905635` |
| 2026-05-14 | **Feature:** edit lead status L1-L4 on cards + L4 level added | `d86cf97` |
| 2026-05-14 | Configurable reset frequency (monthly/quarterly) | `ea1ed2f` |
| 2026-05-14 | Member + Technical + Coverage Analysis PDFs (manuals) | `6c2c5a1`, `ea1ed2f` |
| 2026-05-14 | Sign-out is now instant (no MSAL popup) | `af59609` |

**Total: ~30+ commits since project start. All on `main`.**

---

## 🛠 Local dev workflow

```bash
# Serve locally
cd "C:\Users\roses\CODE PROJECT"
npx serve . -l 3000

# Open dev mode (legacy username login enabled)
http://localhost:3000/marketing_schedule_FINAL4.html?devmode=1
# Sign in with admin / (any password — devmode bypasses) 

# Production URL (no devmode — only MS sign-in)
https://anameen123.github.io/marketing-planner/marketing_schedule_FINAL4.html
```

**Common useful commands:**
```bash
# View recent commits
git log --oneline -10

# Push a change
git add . && git commit -m "..." && git push

# View current branch
git status
```

---

## 📦 What's in this folder

```
CODE PROJECT/
├── marketing_schedule_FINAL4.html       ← The app. Single file. ~1.3 MB.
├── README.md                            ← Project overview (public-facing)
├── HANDOFF_TO_CLAUDE_CODE.md            ← (this file — comprehensive handoff)
├── SECURITY.md                          ← Security policy + incident log
├── MEMBER_MANUAL.md / .pdf              ← User-facing manual
├── TECHNICAL_MANUAL.md / .pdf           ← Architecture docs
├── COVERAGE_ANALYSIS.md / .pdf          ← Role-vs-app coverage analysis
├── TEAM_ONBOARDING.md                   ← Short 1-pager for distribution
├── AZURE_SHAREPOINT_SETUP.md            ← OLD Azure plan (back-pocket, not in path)
├── logo.jpeg                            ← ICC of Texas logo
├── .gitignore                           ← Excludes node_modules, backups, secrets
├── *.backup-*.html                       ← Safety snapshots before risky edits
│
├── .github/workflows/                   ← pages.yml + azure-deploy.yml (latter unused)
├── .githooks/pre-commit                 ← gitleaks scanner (must run `git config core.hooksPath .githooks` once)
├── .claude/launch.json                  ← preview dev server config
│
├── scripts/
│   ├── md_to_pdf.py                     ← Generates the 3 manual PDFs
│   ├── seed.js                          ← (old Azure seeding script — back-pocket)
│   └── package.json                     ← deps for seed.js
│
├── api/                                  ← Old Azure Functions code (back-pocket)
├── infra/main.bicep                     ← Old Azure Bicep template (back-pocket)
└── flows/README.md                      ← Power Automate setup notes
```

---

## 🚦 What's pending (open work)

| # | Item | Effort | Priority |
|---|---|---|---|
| 1 | **User to revoke Eventbrite token** at eventbrite.com/account-settings/api (token `MBM2JW3LEGYX44PVH6FH`) | 1 min (their action) | Medium |
| 2 | **Trial period kickoff** — 1 month with 2 members, then evaluate | Ongoing | High (in progress) |
| 3 | **Backfill historical visits** — user dictates, Claude records | Variable | Medium |
| 4 | **Power Automate flows** for monthly + quarterly Excel auto-exports | 30-60 min walkthrough | Medium |
| 5 | **Real iPhone test** when accessible | 30-60 min | Medium |
| 6 | **In-app admin panel** for managing `EMAIL_USER_MAP` + team config (eliminates code-edits to add member) | ~1 hour | Low-medium |
| 7 | **Tier Settings UI** for `RESET_INTERVAL` toggle (currently console-only) | 30 min | Low |
| 8 | **Cleanup** — remove `api/`, `infra/`, `scripts/seed.js` once user confirms Azure path is permanently abandoned | 15 min | Low |

---

## 📞 Project context

- **Customer:** Immediate Care Centers of Texas (ICC of Texas), part of Wellness & Care Group of Texas Inc.
- **Tech constraints:** Microsoft-only stack, Vercel banned
- **Primary users:** 3 marketing agents (Duaa Khan, Sadia Khan, Dr Ahsan Paracha) + 1 admin (Mahmoud Althaher) + 1 readonly manager (Ahmed Shuja)
- **Primary devices:** iPhone (members) + laptop (admin)
- **M365 tenant:** wcgtx.com (`36db94fb-80e4-470d-a675-2ee06ddf3d89`)
- **Verified domains in tenant:** wcgtx.com (default), wcgtx.onmicrosoft.com, nbxcore.com, iccotx.com
- **GitHub account:** anameen123 (free tier, public repo)

---

## ✅ Past incidents (security)

| Date | What | Resolution |
|---|---|---|
| 2026-05-14 | Azure client secret leaked in HTML (old Marketing dashboard app `0f338bab-...`) | Revoked secret via Azure CLI + scrubbed from git history + deleted entire orphan app |
| 2026-05-14 | Eventbrite OAuth2 token leaked in HTML (`MBM2JW3LEGYX44PVH6FH`) | Removed from code + scrubbed from git history; user needs to manually revoke at eventbrite.com |

See SECURITY.md for full policy.

---

## 🤖 Tips for next Claude / next developer

1. **Read the user's mood carefully.** Mahmoud uses voice-to-text often, so messages can be fragmented. Parse intent generously.

2. **He wants autonomous execution.** Phrases like "do it yourself" or "go go" mean don't ask, just ship. Phrases like "wait" or "no" mean stop + reconsider.

3. **He doesn't care about code structure but cares about UX and security.** Optimize for: things work, things feel polished, secrets never leak.

4. **The app is in production. People depend on it.** Don't break anything. Test in preview before pushing.

5. **Use the chime system.** PowerShell `[Console]::Beep` triggers audible alerts. He configured: 3 fast rising notes = urgent need-attention; 2 soft notes = checkpoint; 4 rising notes = victory.

6. **The user has limited tech vocabulary.** Don't use jargon. "URL" = "the address bar at the top". "Repo" = "the folder of code". Etc.

7. **Permissions in M365 are complex.** When debugging access issues, walk through both layers: M365 Group membership AND `EMAIL_USER_MAP` in code.

8. **The bell is role-aware** — admin sees all admin-action notifications; members see only entries where `originalAuthor === CURRENT_USER.name`; readonly is hidden.

9. **The DataLayer is the single source of truth for persistence.** Never touch localStorage directly — always go through `DataLayer.load / save / remove`.

10. **When in doubt, check `git log -p` for the relevant feature** — every meaningful change has a detailed commit message explaining the why.

---

**End of handoff. The HTML, this document, and the SharePoint state are the sources of truth.**

If you got this far: thanks for reading carefully. Now go build cool things.
