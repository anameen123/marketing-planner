# ICC of Texas — Marketing Planner

Internal team-coordination web app for **Immediate Care Centers of Texas** marketing staff.

**Live app:** _(URL added once deployed)_

---

## What it does

Replaces a paper-and-spreadsheet workflow for the marketing team:

- 📅 **Schedule visits** to clinics, MVA attorneys, and community outreach orgs
- ✅ **Track outcomes** (Completed / Postponed / Canceled + lead-relationship status)
- 💰 **Log spending** per visit, with per-tier per-visit cap + per-quarter budget pool
- 📈 **Track patient referrals** per business — used to rank into tiers
- 🏆 **Quarterly ranking** that locks tiers + budgets for the next 3 months
- 📋 **Auto-exports** monthly + quarterly Excel reports to SharePoint

---

## Tech stack

| Layer | Choice | Cost |
|---|---|---|
| Frontend | Single HTML file (`marketing_schedule_FINAL4.html`) with inline JS + CSS | $0 |
| Data | Microsoft Lists (SharePoint) via Microsoft Graph API | $0 (M365) |
| Hosting | GitHub Pages | $0–4/mo |
| Auth | Microsoft Entra ID (single sign-on with `@wcgtx.com` / `@iccoftexas.com`) | $0 (M365) |
| Reports → SharePoint | Power Automate (M365) | $0 (M365) |

Single HTML file as the front-end means iterative changes are easy — no build step, no framework overhead. Open and edit.

---

## Folder layout

```
marketing_schedule_FINAL4.html   # The app. Single file. Open in any browser.
logo.jpeg                        # ICC of Texas logo
README.md                        # ← you are here
AZURE_SHAREPOINT_SETUP.md        # Original deployment plan (Azure-first; superseded but useful reference)
HANDOFF_TO_CLAUDE_CODE.md        # High-level project handoff for any future maintainer
.gitignore

api/                             # Azure Functions (if we ever pivot back to Azure)
infra/                           # Bicep (same — back-pocket option)
scripts/                         # One-shot scripts (data seeding, migrations)
flows/                           # Power Automate flow setup docs
.github/workflows/               # GitHub Actions for deployment
```

---

## Local development

```bash
# Serve the HTML locally
npx serve . -l 3000

# Open http://localhost:3000/marketing_schedule_FINAL4.html
```

Edit the HTML directly, refresh the browser. That's the whole workflow.

---

## Deployment

GitHub Pages auto-deploys on every push to `main`. The site goes live within ~30 seconds.

See `.github/workflows/pages.yml` for the build step.

---

## Roles & permissions

| Role | Can see | Can edit |
|---|---|---|
| **Admin** | Everything | Everything (bypasses most lockout rules) |
| **Member** | Everything | Their own profile/visits/spending |
| **Manager** (readonly) | Everything | Nothing |

Roles are assigned in SharePoint after sign-in.

---

## Critical business rules (preserve at all costs)

- **Visit edit window**: 2 days after visit date (admin bypasses)
- **Spending edit window**: 5 PM cutoff on visit_date + 3 days (admin bypasses)
- **No "Completed" before visit date** — even admin
- **No reschedule to a past date** — even admin
- **Counters are live** — never stored as derived values
- **Quarterly rollover** — snapshots refs, resets live counts (EXCEPT random + holiday outreach, which are lifetime)

See `HANDOFF_TO_CLAUDE_CODE.md` for the full list.

---

## Maintenance contact

**Mahmoud Althaher** — `malthaher@wcgtx.com`
