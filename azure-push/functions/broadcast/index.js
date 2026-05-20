// broadcast — receives "data changed" notifications from any client and
// fans them out to all other connected clients via SignalR. The actual
// payload is intentionally tiny: just the key that changed and who changed
// it. Clients use this as a SIGNAL to pull the real data from SharePoint
// — we never send actual user data through SignalR, only "go look".
//
// This keeps the push channel:
//   • Free (well under the 20K messages/day Free F1 cap for an 8-user team)
//   • Privacy-safe (no business data flows through Microsoft's SignalR; it
//     stays in the team's own SharePoint Document Library)
//   • Simple (no auth between clients required — even if a malicious client
//     fired fake "data changed" messages, the worst it could do is make
//     everyone else hit SharePoint once)
module.exports = async function (context, req) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    context.res = {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
      }
    };
    return;
  }

  var body = req.body || {};
  var key  = (body.key  || 'unknown').toString().slice(0, 80);
  var by   = (body.by   || 'anon').toString().slice(0, 80);

  // Send to ALL connected clients (no userId/groupName filter)
  context.bindings.signalRMessages = [{
    target: 'data-changed',
    arguments: [{ key: key, by: by, ts: Date.now() }]
  }];

  context.res = {
    status: 202,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
    body: { ok: true, broadcast: { key: key, by: by } }
  };
};
