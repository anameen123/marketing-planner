# Real-time push for the WCG Marketing Planner

This folder contains the **optional** Azure backend that turns the planner from
polling-based sync (which can lag when tabs are backgrounded) into **true push** —
the server tells your client "data changed" the instant it happens, no waiting
for the next poll.

**The planner works fine without this.** Polling still runs as a safety net.
Deploying this just makes sync instant even when tabs are idle.

---

## What gets created in your Azure tenant

| Resource | SKU | Cost |
|----------|-----|------|
| Azure SignalR Service | Free F1 (20 connections, 20K msgs/day) | **$0/month** forever |
| Azure Function App | Consumption (Y1) — 1M execs/month free | **$0/month** forever |
| Storage Account | Standard_LRS | ~$0.05/month after first 12 months |

Total: effectively **$0** for our team size. The storage account is the only
non-free thing and it's pennies.

---

## Deploy (60 seconds)

### Option A — One-click button (recommended)

Click this button:

[![Deploy to Azure](https://aka.ms/deploytoazurebutton)](https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fraw.githubusercontent.com%2Fanameen123%2Fmarketing-planner%2Fmain%2Fazure-push%2Fazuredeploy.json)

It opens the Azure portal pre-filled. You:

1. **Subscription**: pick yours (the one tied to `wcgtx.com`)
2. **Resource group**: click "Create new" → name it `wcg-sync` → click OK
3. **Region**: pick "Central US" or whichever is closest to Texas
4. **Resource prefix**: leave as `wcg-sync` (just a naming prefix)
5. **Allowed client origin**: leave as `https://anameen123.github.io`
6. Click **Review + create** → **Create**
7. Wait ~2 minutes for deployment to finish
8. Click **Outputs** tab → copy the `functionAppUrl` value (looks like `https://wcg-sync-fn-xxxxxx.azurewebsites.net`)
9. Paste it into the planner: open **Settings → Real-time push** and paste the URL

That's it. Push is now live.

### Option B — Azure CLI (if you prefer)

```bash
az group create -n wcg-sync -l centralus

az deployment group create \
  -g wcg-sync \
  --template-uri https://raw.githubusercontent.com/anameen123/marketing-planner/main/azure-push/azuredeploy.json \
  --parameters resourcePrefix=wcg-sync allowedClientOrigin=https://anameen123.github.io
```

The output prints the `functionAppUrl` — paste it into the planner's settings.

---

## What's inside the Function App

Two HTTP endpoints, both anonymous (the SignalR hub itself enforces the real
auth via short-lived access tokens issued by negotiate):

- **`GET /api/negotiate`** — Client calls this once on load. Returns a SignalR
  connection URL + a short-lived access token (~1 hour). Client opens a
  WebSocket directly to Azure SignalR with the URL — the Function App is NOT
  in the data path after this handshake.

- **`POST /api/broadcast`** — Client calls this after every successful write
  to SharePoint, with a tiny JSON body: `{ key, by }`. The Function fans it
  out as a `data-changed` SignalR message to all connected clients. Other
  clients receive it and immediately pull the changed key from SharePoint.

**No business data flows through Azure SignalR.** Only the SIGNAL "key X
changed, go look in SharePoint" travels through the push channel. The actual
visit/clinic/referral data stays in your SharePoint Document Library.

---

## Privacy + security

- SignalR connection URLs are short-lived JWTs (~1 hour). They're scoped to
  the `wcgsync` hub and cannot read SharePoint or your tokens.
- CORS is locked to `https://anameen123.github.io` (your GitHub Pages origin).
  No other site can call your Function App.
- Anonymous functions are fine here because the worst a bad actor could do is
  send a fake "data changed" ping, causing your team's browsers to do one
  extra SharePoint poll. They cannot read or write any planner data through
  the push channel.

---

## Disabling push (back to polling-only)

Open the planner → **Settings → Real-time push** → clear the endpoint URL → save.
The client immediately stops trying to connect to SignalR and falls back to
polling. You can leave the Azure resources running (still free) or delete the
resource group: `az group delete -n wcg-sync --yes`.
