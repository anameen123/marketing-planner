# 📘 Marketing Planner — User Guide for Team Members

**For:** Duaa, Ms Sadia, Dr Ahsan, Ahmed (Manager), and any future team additions
**Last updated:** 2026-05-14

---

## 1. What is this app?

A web-based marketing planner that replaces the old paper-and-spreadsheet workflow. Use it to:

- 📅 **Schedule visits** to clinics, MVA attorneys, and community outreach
- ✅ **Track outcomes** — mark visits Completed / Postponed / Canceled
- 💰 **Log spending** per visit, with caps + quarterly budgets
- 📈 **Track leads** — which clinics have established relationships
- 🏆 **See rankings** of businesses by referrals

Everyone on the team sees the same data. Changes anyone makes show up on everyone else's screen within 5 seconds. No more "who has the latest version?"

---

## 2. How to open the app

### On your laptop

Open any browser (Edge, Chrome, Safari) and go to:

> **https://anameen123.github.io/marketing-planner/marketing_schedule_FINAL4.html**

(Bookmark it for quick access — Ctrl+D in most browsers)

### On your iPhone

1. Open **Safari** (not Chrome — Safari only for the install step)
2. Paste the URL above into the address bar
3. After signing in once, tap the **Share button** (square with up-arrow at the bottom of Safari)
4. Scroll down → tap **"Add to Home Screen"**
5. Tap **Add**

You now have a one-tap app icon on your home screen. Opening it from there opens the app fullscreen — no browser, no URL bar.

---

## 3. Signing in

You'll see a sign-in screen with a white **"Sign in with Microsoft"** button.

1. Tap / click that button
2. A Microsoft sign-in window opens
3. Enter your work email (the one you use for Outlook) — `@wcgtx.com` for most of you, `@frisco-er.com` for Sadia
4. Enter your Microsoft password (same as Outlook)
5. Approve any 2-factor authentication prompt on your phone
6. You're in.

**Trouble signing in?**
- If you see *"This app needs admin approval"* — tell admin (Mahmoud); IT needs to grant permission for our tenant
- If you see *"You're not authorized to use this app"* — your email isn't in the access list; ask admin to add you

---

## 4. The 6 main tabs at the top

| Tab | What you do here |
|---|---|
| 🏠 **Home** | Today's snapshot + quick actions + team announcements |
| 📅 **Dashboard** | The planning calendar — click any day to see/add visits |
| 📊 **Status** | Established leads CRM — see which clinics you've built relationships with |
| 👥 **Team** | Your profile + performance stats + history of your visits |
| 🏢 **Businesses** | The bank of targets — clinics, MVA attorneys, outreach orgs |
| 💰 **Finances** | Spending log + rankings + tier settings |

---

## 5. How to assign yourself a visit

1. Go to the **Dashboard** tab (calendar)
2. Click the day you want to schedule a visit on
3. A popup opens showing 6 visit slots for that day
4. In one of the empty rows:
   - Type the clinic / business name (or use **+ Add Visit** if it's a new one)
   - Click the **Assigned Member** dropdown → pick yourself
   - Click **✓ Confirm** in your row
5. The visit is saved + shared with the team immediately

---

## 6. How to mark a visit completed

1. Open the day on the calendar (Dashboard tab)
2. Find your visit row
3. Change the **Status** dropdown to **Completed**
4. If you spent money: enter spending items in the spending column
5. Click **Confirm** to finalize

**Note:** You can only mark Completed **on or after the visit date** — never before.

---

## 7. How to log spending on a visit

1. Open the day → find your visit row
2. Click the **Spending** cell
3. Enter each item (e.g., "Cupcakes", quantity 3, price $5)
4. Total is calculated automatically
5. Click **Save**

Spending must be saved within **3 days** of the visit (cutoff: 5 PM on visit_date + 3 days). After that, only admin can edit.

---

## 8. How to update lead status on a business

There are two ways:

### Method A — From a visit
When you mark a visit Completed, a lead-status modal pops up. Pick:
- **Established** (with level L1-L4) — you built a relationship
- **Needs Work** — needs more visits
- **Dead End** — they're not interested

### Method B — From a business card directly
1. Go to **Businesses** tab → Bank of Targets
2. Find the clinic / firm you visited
3. Click **+ Set Lead** (or **✎ Change** if already set)
4. Pick L1, L2, L3, or L4
5. Saves immediately, shared with the team

| Level | Means |
|---|---|
| **L1 — Front Desk** | Relationship with receptionist / front desk staff |
| **L2 — Coordinator** | Office manager or coordinator level |
| **L3 — Doctor** | Direct relationship with the physician |
| **L4 — Owner** | Direct relationship with practice owner / decision-maker |

---

## 9. The 🔔 bell

Top-right corner. Click it to see:
- **If you're admin:** All admin override notifications (any changes you made to others' work)
- **If you're a member:** Notifications about YOUR work (when admin edits something of yours)

Members don't see other members' bells. Privacy by design.

---

## 10. The 🟢 / 🔴 sync badge

Small pill next to your name. Tells you the connection status:

| Color | Meaning |
|---|---|
| 🟢 **Live** | Connected to SharePoint. Team-wide live sync working. |
| 🟡 **Syncing…** | Currently fetching changes. Wait a few seconds. |
| 🟢 **Local** | Working in offline mode. Your changes are saved locally but not shared with team yet. |
| 🔴 **Sync error** | Something failed. Click for details + Reconnect button. |

Click the badge anytime to see diagnostic info.

---

## 11. Click a visit name → jump to the business card

In the calendar / Dashboard, the clinic name in the **Visit Info** column is clickable. Click it → the app jumps to that business card in the Bank of Targets, with a brief purple highlight.

Useful when you want to check the lead status, last visits, or notes about the business without losing your place in the calendar.

---

## 12. Roles — what each person can do

| Role | Can do |
|---|---|
| **Admin** (Mahmoud) | Everything — edit anyone's data, change tier settings, override locks |
| **Member** (Duaa, Sadia, Ahsan) | Edit your own visits + spending + leads. See everyone else's read-only. |
| **Readonly Manager** (Ahmed) | See everything. Edit nothing. |

---

## 13. Editing rules — what locks you out

To prevent accidental data loss:

| Action | Lockout |
|---|---|
| Edit a past visit | 2 days after visit date — after that, admin only |
| Edit spending | 5 PM on visit_date + 3 days |
| Mark as Completed | Cannot do it before the visit date |
| Reschedule to a past date | Never allowed |

Admin bypasses the time-based locks but NOT the integrity rules ("Completed before date" and "past date" stay forbidden even for admin).

---

## 14. Common issues + fixes

| Problem | Fix |
|---|---|
| "Can't sign in" | Check your @wcgtx.com email, confirm with admin you're in the access list |
| Sign-in popup blocked on iPhone Safari | Allow popups in Settings → Safari, OR tap the button twice |
| Sync badge red 🔴 | Click it → click **Reconnect** |
| App looks weird on iPhone | Force-quit Safari, reopen via the Home Screen icon |
| Don't see a change someone made | Wait 5-10 seconds for sync, or refresh the page |
| Locked out of editing | Check the lockout rules above — admin can bypass |

---

## 15. Getting help

- **Quick question / something broke:** Message Mahmoud directly (Teams or `malthaher@wcgtx.com`)
- **Feature request / idea:** Tell Mahmoud, who logs it for the next update
- **Found a bug:** Take a screenshot + describe what you did, send to Mahmoud

---

**That's it. Welcome to the team's new marketing planner.**
