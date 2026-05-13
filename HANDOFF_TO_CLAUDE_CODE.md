# 📋 ICC Marketing Planner — Project Handoff

**Last updated:** 2026-05-13 (live)
**Status:** Code complete for SharePoint backend + Entra ID sign-in. Awaiting user to test MS sign-in popup + decide GitHub Pages visibility.

---

## ⚠ Read this first

The current direction is **NOT** Azure (no subscription) and **NOT** Vercel (banned). It is:

- ✅ **Single HTML file** as the user-facing app (still `marketing_schedule_FINAL4.html`)
- ✅ **GitHub Pages** for HTML hosting (decision: private $4/mo vs public free — TBD)
- ✅ **Microsoft Lists** in SharePoint for shared team data
- ✅ **Entra ID (Microsoft sign-in)** for auth — no more hardcoded passwords
- ✅ **Power Automate** for monthly + quarterly Excel auto-exports to SharePoint
- ✅ **Microsoft-only stack** — customer requirement
- ✅ **Cost:** $0–4/month (just the optional GitHub Pro for private repo)

The Azure-first plan (Cosmos DB + Static Web Apps + Bicep) is **back-pocket only** — files are still in the repo (`api/`, `infra/`, `scripts/seed.js`) in case we ever pivot back. They're not in the current execution path.

---

## 🟢 What's done (in commit order)

| Commit | Description |
|---|---|
| `cc089bf` | Initial commit — HTML, README, .gitignore, GitHub Pages workflow |
| `0791bee` | DataLayer abstraction — single chokepoint for all reads/writes |
| `0fe6f30` | SharePoint backend code (MSAL + Graph API + polling + provisioning) — still dormant |
| `a09627d` | Microsoft sign-in button + EMAIL_USER_MAP + doMsLogin() |
| `a415796` | Wired Entra ID app credentials (clientId, tenantId) into config |
| `8341258` | Auto-bootstrap SharePoint on first successful MS sign-in |

**6 commits today, all pushed to https://github.com/anameen123/marketing-planner (private repo)**

---

## 🔑 Credentials & infrastructure (live in WCG tenant)

### Entra ID app registration
- **Display name:** ICC Marketing Planner
- **Client (Application) ID:** `0447f26e-7a21-4c67-90a0-e967ee70a10f`
- **Object ID:** `392e967a-5234-4ffe-86fc-a3af44ce2b35`
- **Tenant ID:** `36db94fb-80e4-470d-a675-2ee06ddf3d89` (wcgtx.com)
- **Sign-in audience:** AzureADMyOrg (only WCG users)
- **Type:** SPA (Single-page application)
- **SPA Redirect URIs (all approved):**
  - `http://localhost:3000`
  - `http://localhost:3000/marketing_schedule_FINAL4.html`
  - `https://anameen123.github.io/marketing-planner/`
  - `https://anameen123.github.io/marketing-planner/marketing_schedule_FINAL4.html`
- **API permissions (delegated, Microsoft Graph):**
  - `Sites.ReadWrite.All` — `89fe6a52-be36-487e-b7d8-d061c450a026`
  - `User.Read` — `e1fe6dd8-ba31-4d61-89e7-88639da4683d`
- **Admin consent:** NOT granted (Mahmoud isn't Global Admin). Users will see per-user consent popup on first sign-in. Acceptable.

### SharePoint
- **Root site:** `https://wcgtx.sharepoint.com`
- Lists will be auto-provisioned by `DataLayer.bootstrap()` on first MS sign-in:
  - `Visits` (schedule + spending data)
  - `BusinessReferrals`
  - `TierThresholds`
  - `Settings`
  - `AdminNotifications`

### GitHub
- **Repo:** https://github.com/anameen123/marketing-planner
- **Owner:** `anameen123` (Mahmoud's account, free tier)
- **Visibility:** Private — Pages won't work until either (a) upgrade to GitHub Pro ($4/mo), or (b) make repo public

---

## 🧱 Tech stack — current

| Layer | Technology | Cost |
|---|---|---|
| Frontend | Single HTML file with inline JS + CSS | $0 |
| Data (today) | localStorage (per-browser, no sharing) | $0 |
| Data (after MS sign-in) | Microsoft Lists in SharePoint (team-wide, 5-sec live sync) | $0 (M365 covered) |
| Hosting (today) | localhost via `npx serve` | $0 |
| Hosting (after deploy) | GitHub Pages | $0 public / $4/mo private |
| Auth (today) | Hardcoded passwords in HTML | $0 |
| Auth (after MS sign-in wired) | Microsoft Entra ID via MSAL.js | $0 (M365 covered) |
| Reports → SharePoint | Power Automate (M365) — TBD setup | $0 (M365 covered) |
| Monitoring | Browser console + GitHub commit history | $0 |

---

## 🔑 Critical business rules (UNCHANGED — preserve at all costs)

These remain identical to the May 8 handoff. They're enforced in the HTML and must be enforced server-side too if we ever build a server.

### Visit editing window
- Members can edit within **2 days after visit date**
- Admin bypasses
- Future dates: always editable
- Past locked dates: greyed + struck through

### Spending edit window
- 5 PM cutoff on `visit_date + 3 days`
- Admin bypasses

### Status restrictions
- **Cannot mark "Completed" before visit date** — even admin
- **Cannot reschedule to a past date** — even admin

### Counter philosophy
- All counters are **live calculations** — never stored as derived values
- "This week" = current Monday–Sunday
- Lead counters pull from each visit's `relationship` field

### Period rollover (quarterly)
- Automatic when calendar quarter changes
- Snapshot ref count → history; reset live count to 0
- **EXCEPT random + holiday outreach** — those are LIFETIME counters

### Permission rules
- **Admin** — bypasses most checks (NOT date-integrity)
- **Member** — own work editable; can view others read-only
- **Manager (readonly)** — view-only everywhere
- **Ms Sadia** — also has "referral editor" privilege

### Three-level visit confirmation
1. Member confirms assignment (memberConfirmed)
2. Spending saved (if any)
3. Final row-level confirmation (rowConfirmed) — only then does spending appear in the Spending Log

### Period budget (added 2026-05)
- Per-visit cap + per-quarter budget pool
- Toggle: "ENFORCING / OFF"

### Activity bell (added 2026-05-13)
- Lives in the shared header (visible to admin + members; hidden for readonly)
- Admin sees all admin-override notifications
- Members see only entries where they were the `originalAuthor` ("your visit was edited")
- Readonly: hidden entirely

---

## 👤 User accounts

| Email | Role | M365 username | Hardcoded fallback |
|---|---|---|---|
| `malthaher@wcgtx.com` | admin | Mahmoud Althaher | `admin` / `1234` |
| `duaa@wcgtx.com` | member | Duaa | `duaa` / `Duaa@WCG2026` |
| `sadia@wcgtx.com` | member (+ referral editor) | Ms Sadia | `sadia` / `Sadia@WCG2026` |
| `ahsan@wcgtx.com` | member | Dr Ahsan | `ahsan` / `Ahsan@WCG2026` |
| (TBD)@wcgtx.com | readonly | Manager | `manager` / `Manager@WCG2026` |

**Hardcoded passwords are still in the HTML** (used by `doLogin()`) — they're a dev-mode fallback. Production will use only `doMsLogin()` via the Microsoft button. The hardcoded fallback gets removed once MS sign-in is verified in production.

---

## 🏗 Architecture — DataLayer + AuthLayer

The HTML is one file but organized into clear modules:

### `DataLayer` — every read/write
- Public API: `DataLayer.load(key, fallback?)`, `DataLayer.save(key, value)`, `DataLayer.remove(key)`
- **localStorage mode** (today): writes to browser localStorage, no network
- **SharePoint mode** (after MS sign-in): same calls, but with 5-sec polling for incoming changes + write-through cache + retry queue
- Bootstrap is automatic on `doMsLogin()` success
- Falls back to localStorage if SharePoint bootstrap fails

### Auth flow
- `doLogin()` — hardcoded fallback. Sets `CURRENT_USER.authVia = 'hardcoded'`. SharePoint stays off.
- `doMsLogin()` — Microsoft sign-in. Sets `CURRENT_USER.authVia = 'entra-id'`. Auto-runs `DataLayer.bootstrap()`.
- `EMAIL_USER_MAP` — maps M365 email → role/profile. Unknown emails are rejected.

### Storage keys (the chokepoint)
- `wcg_schedule_v1` → SharePoint List "Visits"
- `wcg_business_referrals_v1` → List "BusinessReferrals"
- `wcg_tier_thresholds_v4` → List "TierThresholds"
- `wcg_period_budget_enabled_v1` → List "Settings"
- `wcg_admin_notifications_v1` → List "AdminNotifications"
- `wcg_admin_notif_read_*` (per-user) → stays in localStorage (per-user state, not synced)

---

## 🚦 What's blocked / what's next

**Awaiting user action (Mahmoud):**
1. ✋ Click "Sign in with Microsoft" once on localhost to verify the auth + bootstrap flow works
2. ✋ Decide: keep repo private ($4/mo GitHub Pro) or make public (free, code visible)
3. ✋ Once Pages is enabled — test in production at `anameen123.github.io/marketing-planner/`
4. ✋ Walk through Power Automate flow setup (instructions in `flows/README.md`)
5. ✋ Test on real iPhone (member view) — 30-60 min with phone

**Once those are done:**
- Cutover: send team the URL with a 1-line "use this now" message
- Monitor for 1 week, fix bugs

---

## 🛠 Local dev

```bash
# Serve the HTML locally
npx serve . -l 3000

# Open http://localhost:3000/marketing_schedule_FINAL4.html
# Sign in with admin/1234 → localStorage-only dev mode
# Or click "Sign in with Microsoft" → real Entra ID flow against the WCG tenant
```

Edit `marketing_schedule_FINAL4.html` directly. Refresh browser. No build step.

---

## 📦 What's in this folder

```
CODE PROJECT/
├── marketing_schedule_FINAL4.html       ← The app. Single file.
├── README.md                            ← Public-facing project overview
├── HANDOFF_TO_CLAUDE_CODE.md            ← (this file)
├── AZURE_SHAREPOINT_SETUP.md            ← OLD Azure plan (back-pocket only)
├── logo.jpeg                            ← ICC of Texas logo
├── *.backup-*.html                       ← Safety backups before risky edits
│
├── .github/workflows/pages.yml          ← Auto-deploy to GitHub Pages on push
│
├── flows/README.md                      ← Power Automate setup instructions
│
├── api/                                  ← Azure Functions (back-pocket; not deployed)
├── infra/main.bicep                     ← Azure Bicep template (back-pocket)
└── scripts/seed.js                      ← Cosmos seed script (back-pocket)
```

---

## 📞 Project context

- **Customer:** Immediate Care Centers of Texas (ICC of Texas), part of Wellness & Care Group of Texas Inc.
- **Tech constraints:** Microsoft-only stack, Vercel banned, no Azure subscription (yet)
- **Primary users:** 3-4 marketing agents (Duaa, Ms Sadia, Dr Ahsan) + 1 admin (Mahmoud)
- **Primary device:** iPhone (members) + laptop (admin)
- **M365 tenant:** wcgtx.com
- **GitHub account:** anameen123

---

**End of handoff. Source of truth: the HTML file + this document.**
