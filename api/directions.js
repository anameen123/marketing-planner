// ─────────────────────────────────────────────────────────────────────────
// VERCEL SERVERLESS FUNCTION — Google Directions proxy
// ─────────────────────────────────────────────────────────────────────────
// Per user 2026-05-25: Google Directions REST API doesn't ship CORS
// headers, so the browser can't fetch from maps.googleapis.com directly.
// This server-side proxy calls Google for us and returns the JSON to
// the browser. Same data, but the response now includes the
// Access-Control-Allow-Origin header we add ourselves.
//
// Endpoint: GET /api/directions?origin=lat,lng&destination=lat,lng[&waypoints=lat,lng|lat,lng]
//
// Auth: the Google Maps API key lives in Vercel env var GOOGLE_MAPS_KEY.
// Set it via Vercel dashboard → Settings → Environment Variables. The
// key NEVER ships to the browser, so we can drop the HTTP referrer
// restriction on the key in Google Cloud (the key only travels Vercel →
// Google server-to-server now).
//
// Cost: same $200/mo free credit from Google. Each call counts as one
// Directions API request (~$0.005 above credit).
// ─────────────────────────────────────────────────────────────────────────

export default async function handler(req, res){
  // CORS — allow our planner (any origin really, since the key isn't exposed)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

  if(req.method === 'OPTIONS'){
    res.status(200).end();
    return;
  }
  if(req.method !== 'GET'){
    res.status(405).json({ error: 'Method not allowed — use GET' });
    return;
  }

  const { origin, destination, waypoints } = req.query || {};
  if(!origin || !destination){
    res.status(400).json({ error: 'Missing origin or destination query params' });
    return;
  }

  const key = process.env.GOOGLE_MAPS_KEY;
  if(!key){
    res.status(500).json({
      error: 'GOOGLE_MAPS_KEY not configured',
      detail: 'Admin: set GOOGLE_MAPS_KEY in Vercel → Settings → Environment Variables.'
    });
    return;
  }

  // Build the Google Directions URL
  let url = 'https://maps.googleapis.com/maps/api/directions/json'
    + '?origin='      + encodeURIComponent(origin)
    + '&destination=' + encodeURIComponent(destination)
    + '&mode=driving'
    + '&departure_time=now'   // traffic-aware ETAs
    + '&key='         + encodeURIComponent(key);
  if(waypoints){
    url += '&waypoints=' + encodeURIComponent(waypoints);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if(!response.ok){
      res.status(502).json({
        error: 'Google responded with non-OK status',
        status: response.status
      });
      return;
    }
    const json = await response.json();
    // Pass Google's response through unchanged so existing client code
    // doesn't need to know whether it's hitting Google directly or via
    // this proxy. Same shape, same fields.
    res.status(200).json(json);
  } catch(e){
    res.status(502).json({
      error: 'Google fetch failed',
      detail: String(e && e.message || e)
    });
  }
}
