/**
 * In-memory browser session.
 *
 * The access and refresh tokens are httpOnly cookies set by the gateway; no
 * script can read them. The browser only knows who is signed in (user,
 * tenant, role), fetched from GET /api/v1/auth/session and kept in memory.
 */
import type { SessionUser } from '../types';
import { LEGACY_TOKEN_KEYS } from '../config';

type Listener = (user: SessionUser | null) => void;

let current: SessionUser | null = null;
let known = false;
const listeners = new Set<Listener>();

/** Delete JWTs that earlier releases left in browser storage. */
export function purgeLegacyTokens(): void {
  for (const key of LEGACY_TOKEN_KEYS) {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch {
      // Storage may be unavailable (private mode); nothing to purge then.
    }
  }
}

purgeLegacyTokens();

export function getSessionUser(): SessionUser | null {
  return current;
}

/** True once the session has been resolved (signed in or not). */
export function isSessionKnown(): boolean {
  return known;
}

export function setSessionUser(user: SessionUser | null): void {
  current = user;
  known = true;
  listeners.forEach(listener => listener(user));
}

export function subscribeSession(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Test helper: forget the resolved session. */
export function resetSessionForTests(): void {
  current = null;
  known = false;
}
