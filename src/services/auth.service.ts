import {
  fetchSession,
  login as apiLogin,
  logoutRequest,
  register as apiRegister,
} from '../api/auth';
import { refreshSessionCookies } from '../api/axios';
import { getSessionUser, isSessionKnown, setSessionUser } from './session';
import type { SessionUser } from '../types';

/**
 * Browser authentication. Tokens are httpOnly cookies managed by the gateway;
 * nothing here can read or store them. Only the session's identity (user,
 * tenant, role) is held, in memory.
 */

export function isAuthenticated(): boolean {
  return getSessionUser() !== null;
}

/**
 * Resolve the session from the server once per page load (cookies survive
 * reloads; memory does not). Resolves null when signed out.
 */
export async function loadSession(): Promise<SessionUser | null> {
  if (isSessionKnown()) return getSessionUser();
  try {
    const user = await fetchSession();
    setSessionUser(user);
    return user;
  } catch {
    setSessionUser(null);
    return null;
  }
}

export async function login(username: string, password: string): Promise<SessionUser> {
  const { user } = await apiLogin(username, password);
  setSessionUser(user);
  return user;
}

export async function register(
  email: string,
  password: string,
  full_name?: string,
  product_name?: string,
  business_description?: string,
): Promise<SessionUser> {
  const { user } = await apiRegister(email, password, full_name, product_name, business_description);
  setSessionUser(user);
  return user;
}

/** Refresh the session cookies; resolves false (and signs out) when that fails. */
export async function refreshSession(): Promise<boolean> {
  const ok = await refreshSessionCookies();
  if (!ok) setSessionUser(null);
  return ok;
}

/** Sign out: clear the server cookies, then the in-memory session. */
export function logout(): void {
  void logoutRequest().catch(() => undefined);
  setSessionUser(null);
  window.dispatchEvent(new Event('auth:logout'));
}

/** @deprecated Tokens are httpOnly cookies and cannot be read by scripts. */
export function getAccessToken(): string | null {
  return null;
}

export function getCurrentUserId(): string | null {
  return getSessionUser()?.sub ?? null;
}

/** The signed-in user's tenant ID, or '' when signed out. */
export function getTenantId(): string {
  return getSessionUser()?.tenant_id ?? '';
}

/**
 * Role of the signed-in user ('admin', 'editor', 'viewer', …).
 * For UI affordances only — the backend enforces every permission.
 */
export function getCurrentRole(): string {
  return getSessionUser()?.role ?? 'viewer';
}

export function isAdmin(): boolean {
  return getCurrentRole() === 'admin';
}
