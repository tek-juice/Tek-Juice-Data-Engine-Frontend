import { login as apiLogin, refreshToken as apiRefresh, register as apiRegister } from '../api/auth';
import { rawStorage } from './storage';
import type { TokenResponse } from '../types';

const TOKEN_KEY =
  import.meta.env.VITE_TOKEN_STORAGE_KEY ?? 'data_engine_token';
const REFRESH_KEY =
  import.meta.env.VITE_REFRESH_TOKEN_STORAGE_KEY ?? 'data_engine_refresh_token';

// ── Token management ──────────────────────────────────────────────────────────

export function getAccessToken(): string | null {
  return rawStorage.get(TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return rawStorage.get(REFRESH_KEY);
}

export function setTokens(tokens: TokenResponse): void {
  rawStorage.set(TOKEN_KEY, tokens.access_token);
  rawStorage.set(REFRESH_KEY, tokens.refresh_token);
}

export function clearTokens(): void {
  rawStorage.remove(TOKEN_KEY);
  rawStorage.remove(REFRESH_KEY);
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

/**
 * Persist any token pair received from an OAuth exchange.
 * Called by OAuthCallback after the code/token exchange succeeds.
 */
export function handleOAuthToken(tokens: TokenResponse): void {
  setTokens(tokens);
}

// ── Auth actions ──────────────────────────────────────────────────────────────

/**
 * Login with username and password.
 * Stores tokens automatically on success.
 */
export async function login(
  username: string,
  password: string,
): Promise<TokenResponse> {
  const tokens = await apiLogin(username, password);
  setTokens(tokens);
  return tokens;
}

/**
 * Register a new account.
 * Stores tokens automatically on success so the user lands straight in the app.
 */
export async function register(
  email: string,
  password: string,
  full_name?: string,
): Promise<TokenResponse> {
  const tokens = await apiRegister(email, password, full_name);
  setTokens(tokens);
  return tokens;
}

/**
 * Exchange the stored refresh token for a new access token.
 * Updates storage automatically on success.
 * Clears tokens and dispatches `auth:logout` if refresh fails.
 */
export async function refreshSession(): Promise<TokenResponse | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    logout();
    return null;
  }

  try {
    const tokens = await apiRefresh(refreshToken);
    setTokens(tokens);
    return tokens;
  } catch {
    logout();
    return null;
  }
}

/**
 * Log out the current user — clears tokens and notifies the app.
 */
export function logout(): void {
  clearTokens();
  window.dispatchEvent(new Event('auth:logout'));
}

// ── JWT introspection (client-side only, no signature verification) ───────────

interface JwtPayload {
  sub?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

function parseJwt(token: string): JwtPayload | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join(''),
    );
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Returns true if the stored access token is expired (client-side check only).
 */
export function isTokenExpired(): boolean {
  const token = getAccessToken();
  if (!token) return true;
  const payload = parseJwt(token);
  if (!payload?.exp) return true;
  // Add a 30-second buffer to handle clock skew
  return Date.now() / 1000 > payload.exp - 30;
}

/**
 * Returns the subject (user ID) from the stored JWT, or null.
 */
export function getCurrentUserId(): string | null {
  const token = getAccessToken();
  if (!token) return null;
  const payload = parseJwt(token);
  return payload?.sub ?? null;
}
