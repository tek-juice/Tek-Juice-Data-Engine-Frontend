import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, API_TIMEOUT } from '../config';
import { setSessionUser } from '../services/session';
import type { SessionResponse } from '../types';

/**
 * API client for browser sessions.
 *
 * Authentication travels in httpOnly cookies (`withCredentials`), never in
 * script-readable storage or an Authorization header. `X-Requested-With` is
 * the gateway's CSRF guard for cookie-authenticated writes, and
 * `X-Auth-Transport: cookie` asks auth endpoints to answer with cookies.
 */
export const SESSION_HEADERS = {
  'X-Requested-With': 'XMLHttpRequest',
  'X-Auth-Transport': 'cookie',
} as const;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    ...SESSION_HEADERS,
  },
});

const REFRESH_PATH = '/api/v1/auth/refresh';
// Requests whose 401 means "wrong credentials", not "session expired".
const NO_REFRESH = ['/api/v1/auth/token', '/api/v1/auth/register', REFRESH_PATH];

let refreshing: Promise<boolean> | null = null;

/** One refresh at a time; concurrent 401s wait for the same attempt. */
export function refreshSessionCookies(): Promise<boolean> {
  refreshing ??= axios
    .post<SessionResponse>(`${API_BASE_URL}${REFRESH_PATH}`, null, {
      withCredentials: true,
      headers: { ...SESSION_HEADERS },
      timeout: API_TIMEOUT,
    })
    .then(({ data }) => {
      setSessionUser(data.user);
      return true;
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

function endSession(): void {
  setSessionUser(null);
  window.dispatchEvent(
    new CustomEvent('auth:logout', { detail: { reason: 'session_expired' } }),
  );
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const url = original?.url ?? '';

    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !NO_REFRESH.some(path => url.includes(path))
    ) {
      original._retry = true;
      if (await refreshSessionCookies()) {
        return apiClient(original);
      }
      endSession();
    }

    return Promise.reject(error);
  },
);

export default apiClient;
