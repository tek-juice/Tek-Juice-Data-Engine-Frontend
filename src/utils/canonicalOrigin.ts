/**
 * The dashboard must run on the same origin as the API: sign-in uses
 * httpOnly cookies, which browsers do not keep for cross-site requests.
 * When the API is configured on HTTPS but the page was opened over plain
 * http (e.g. the old http://<ip>:9601 address), the URL to send the browser
 * to instead; otherwise null. Local development (localhost) is left alone.
 */
export function canonicalRedirect(apiBaseUrl: string, location: Pick<Location, 'protocol' | 'hostname' | 'origin' | 'pathname' | 'search' | 'hash'>): string | null {
  let api: URL;
  try {
    api = new URL(apiBaseUrl);
  } catch {
    return null;
  }
  if (api.protocol !== 'https:' || location.protocol !== 'http:') return null;
  if (['localhost', '127.0.0.1', '::1'].includes(location.hostname)) return null;
  if (api.origin === location.origin) return null;
  return `${api.origin}${location.pathname}${location.search}${location.hash}`;
}
