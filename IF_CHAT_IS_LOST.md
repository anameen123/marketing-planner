# 🆘 If this Claude chat is lost — recovery guide

**Audience:** Mahmoud (admin), in case the current Claude conversation expires, gets deleted, or you switch devices.

---

## ✅ The good news: NOTHING is lost

Everything important lives outside the chat:

| Where | What's there |
|---|---|
| **GitHub** — `github.com/anameen123/marketing-planner` | All code + history + manuals |
| **Your laptop** — `C:\Users\roses\CODE PROJECT\` | Local copy of everything |
| **SharePoint** — `https://wcgtx.sharepoint.com/sites/mkt` | Your team's data + manuals |
| **Entra ID** — `entra.microsoft.com` | App registration (ICC Marketing Planner) |
| **Production URL** — `anameen123.github.io/marketing-planner/...` | App still running for the team |

**The app keeps working for your team even if your laptop dies, Claude disappears, you lose internet for a week, anything.**

---

## 🔄 How to resume work with a fresh Claude / new developer

### Option A: Quick start with a new Claude conversation

Open Claude (or Cursor, or any AI coding assistant) and paste this **EXACT** message:

```
I'm continuing work on a project at C:\Users\roses\CODE PROJECT — 
a marketing planner web app for ICC of Texas / WCG.

Please read these files first (in this order):
1. C:\Users\roses\CODE PROJECT\HANDOFF_TO_CLAUDE_CODE.md
2. C:\Users\roses\CODE PROJECT\TECHNICAL_MANUAL.md
3. C:\Users\roses\CODE PROJECT\COVERAGE_ANALYSIS.md

Then run:
  cd "C:\Users\roses\CODE PROJECT"
  git log --oneline -20

After that, summarize what you understand and ask me what's next.
Don't make any changes until I tell you to.

I am Mahmoud Althaher (malthaher@wcgtx.com). I usually want you to 
act autonomously — minimal questions, just plow forward. Use 
PowerShell [Console]::Beep(...) chimes for urgent attention.

The app is LIVE at: 
https://anameen123.github.io/marketing-planner/marketing_schedule_FINAL4.html
```

The new Claude reads those files, gets ~95% of the context, and continues from where you left off.

### Option B: Hire a human developer

Show them:
1. The GitHub repo
2. The `HANDOFF_TO_CLAUDE_CODE.md` file (it's written for them too)
3. The `TECHNICAL_MANUAL.md` for full architecture

Any competent web developer can pick up this codebase in 1-2 hours of reading.

---

## 🔑 Critical info to keep accessible (write this down somewhere)

If you ever lose your laptop and need to access these from scratch:

### GitHub
- **Username:** anameen123
- **Email:** malthaher@wcgtx.com
- **Repo:** github.com/anameen123/marketing-planner
- **Password reset:** Use the "Forgot password" flow at github.com/login

### Microsoft 365 / Entra ID
- **Tenant:** wcgtx.com (`36db94fb-80e4-470d-a675-2ee06ddf3d89`)
- **Your email:** malthaher@wcgtx.com
- **App registration name:** ICC Marketing Planner
- **App client ID:** `0447f26e-7a21-4c67-90a0-e967ee70a10f`

### SharePoint
- **URL:** https://wcgtx.sharepoint.com/sites/mkt
- **M365 Group ID:** `cdf645b7-5c7e-467d-824c-305c21575e20`
- **Group email:** mkt@wcgtx.com
- **Members:** 5 people (Mahmoud, Duaa, Sadia, Ahsan, Ahmed Shuja)

### Live app URL (this is the one your team uses)
```
https://anameen123.github.io/marketing-planner/marketing_schedule_FINAL4.html
```

---

## 🛠 Common tasks — exact phrases to use with a fresh Claude

### "Add a new team member"
```
Add a new member: [Full Name], [email@wcgtx.com], role: [admin/member/readonly], color: [hex or name].
Also add them to the M365 Group via SharePoint UI (I'll do that part myself).
```

### "Remove someone (they left the company)"
```
Permanently remove [Name] (email [their email]). They left the company. 
Keep all their historical data — just revoke access.
```

### "Add a clinic"
```
Add a new clinic: [Name], [City], [Doctor], [Specialty], [Phone], [Address], [Notes].
```

### "Backfill past visits"
```
Backfill these past visits:
- [Date] — [Member] visited [Clinic] — [Status] — [Spending if any]
- ...
```

### "Change a tier threshold"
```
Change [Bronze/Silver/Gold/Platinum] for [clinic/mva/outreach]: 
minRefs=X, maxRefs=Y, perVisitCap=$Z, quarterlyBudget=$W.
```

### "Switch reset frequency"
```
Switch reset frequency to [monthly/quarterly].
```

### "Bug: [description]"
```
Bug: when I try to [action], [unexpected result happens]. 
The sync badge shows [color/text]. Screenshot attached.
```

### "I want to add [feature]"
```
I want to add a feature: [describe it]. The user [does X], the app [does Y], 
the result is [Z]. Should be available to [admin/all members/readonly].
```

---

## 📞 Emergency contacts

- **If the live URL stops working:** Check `https://github.com/anameen123/marketing-planner/actions` for deploy errors
- **If team can't sign in:** Check Entra ID app registration is still active at `entra.microsoft.com`
- **If SharePoint data goes missing:** Use SharePoint version history (right-click file → Version History)
- **If you suspect a security incident:** Read SECURITY.md, follow the response protocol

---

## 🎯 The system in one sentence

**An HTML file on GitHub Pages, signed in via Microsoft, saves JSON data to your SharePoint site, syncs to the team every 5 seconds, costs $0/month.**

---

**Save a copy of this file somewhere outside C:\Users\roses\CODE PROJECT\ too** — like print it, or save to OneDrive personal folder. Just in case the laptop dies.

OneDrive copy location suggestion:
```
OneDrive/Documents/Marketing Planner/IF_CHAT_IS_LOST.md
```

---

**Last updated:** 2026-05-14
**Maintained by:** Mahmoud Althaher
