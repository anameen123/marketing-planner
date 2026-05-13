// ════════════════════════════════════════════════════════════════════════════
// Authentication + authorization helpers
// ────────────────────────────────────────────────────────────────────────────
// Static Web Apps injects the authenticated user via the x-ms-client-principal
// header. This module decodes it and provides role-based gates.
// ────────────────────────────────────────────────────────────────────────────
// Server-side enforcement of roles — replaces the client-side isAdmin() check
// in the HTML, which was bypassable via browser dev tools.
// ════════════════════════════════════════════════════════════════════════════

/** Decode the SWA-provided principal header. Returns null when not signed in. */
export function getPrincipal(request) {
  const header = request.headers.get('x-ms-client-principal');
  if (!header) return null;
  try {
    const decoded = Buffer.from(header, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch (err) {
    console.error('[auth] failed to decode principal header', err);
    return null;
  }
}

/** True when a user is signed in (any role). */
export function isAuthenticated(request) {
  return getPrincipal(request) !== null;
}

/** True when the signed-in user holds the named role. */
export function hasRole(request, roleName) {
  const p = getPrincipal(request);
  if (!p || !Array.isArray(p.userRoles)) return false;
  return p.userRoles.includes(roleName);
}

/** Convenience helpers mirroring the HTML's role checks. */
export function isAdmin(request)          { return hasRole(request, 'admin'); }
export function isReferralEditor(request) { return hasRole(request, 'admin') || hasRole(request, 'sadia'); }
export function isMember(request)         { return hasRole(request, 'member') || isAdmin(request); }

/** Build a standard 401/403 response. */
export function forbidden(message = 'Forbidden') {
  return { status: 403, jsonBody: { error: message } };
}

export function unauthorized() {
  return { status: 401, jsonBody: { error: 'Not signed in' } };
}

/** Wrap a handler so it auto-rejects unauthenticated requests. */
export function requireAuth(handler) {
  return async (request, context) => {
    if (!isAuthenticated(request)) return unauthorized();
    return handler(request, context);
  };
}

/** Wrap a handler so it auto-rejects non-admin requests. */
export function requireAdmin(handler) {
  return async (request, context) => {
    if (!isAdmin(request)) return forbidden('Admin only');
    return handler(request, context);
  };
}
