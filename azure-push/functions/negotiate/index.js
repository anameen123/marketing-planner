// negotiate — returns a SignalR connection URL + access token to the client.
// The client calls this once on app load, then uses the returned URL to open
// a WebSocket directly to Azure SignalR Service (the Function App is only
// involved in this one negotiate handshake, not in the actual messaging).
module.exports = async function (context, req, connectionInfo) {
  // CORS preflight (browsers send OPTIONS before cross-origin POST/GET).
  // The Function App's CORS rules (set via ARM template app settings) handle
  // most of this — but we belt-and-braces the headers here too.
  if (req.method === 'OPTIONS') {
    context.res = {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
      }
    };
    return;
  }

  context.res = {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
    body: connectionInfo
  };
};
