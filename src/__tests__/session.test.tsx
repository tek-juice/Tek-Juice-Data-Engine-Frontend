import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import axios from 'axios';
import apiClient, { SESSION_HEADERS } from '../api/axios';
import ProtectedRoute from '../routes/ProtectedRoute';
import * as authApi from '../api/auth';
import { getCurrentRole, getTenantId, login } from '../services/auth.service';
import { getSessionUser, purgeLegacyTokens, setSessionUser } from '../services/session';

const USER = { sub: 'user-1', tenant_id: 'tenant-1', role: 'admin' };

/** Replace the HTTP layer of the real client: (config) -> response. */
function useAdapter(handler: (config: Record<string, any>) => { status: number; data?: unknown }) {
  const seen: Record<string, any>[] = [];
  const adapter = async (config: any) => {
    seen.push(config);
    const { status, data } = handler(config);
    const response = { status, data, headers: {}, config, statusText: String(status) };
    if (status >= 400) {
      throw new axios.AxiosError('failed', String(status), config, null, response as never);
    }
    return response;
  };
  apiClient.defaults.adapter = adapter;
  vi.spyOn(axios, 'post').mockImplementation(async (url: string, _body?: unknown, config?: any) => {
    const result = await adapter({ ...(config ?? {}), url, method: 'post' });
    return result as never;
  });
  return seen;
}

const originalAdapter = apiClient.defaults.adapter;

beforeEach(() => {
  apiClient.defaults.adapter = originalAdapter;
});

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
});

describe('API client session transport', () => {
  it('sends cookies and the CSRF header, never an Authorization header', async () => {
    localStorage.setItem('data_engine_token', 'stale-jwt');
    const seen = useAdapter(() => ({ status: 200, data: {} }));

    await apiClient.get('/api/v1/websites');

    const config = seen[0];
    expect(config.withCredentials).toBe(true);
    expect(config.headers['X-Requested-With']).toBe(SESSION_HEADERS['X-Requested-With']);
    expect(config.headers['X-Auth-Transport']).toBe('cookie');
    expect(config.headers.Authorization).toBeUndefined();
  });

  it('refreshes once on 401 and retries, sharing the refresh across requests', async () => {
    let refreshed = false;
    const seen = useAdapter(config => {
      if (config.url?.endsWith('/api/v1/auth/refresh')) {
        refreshed = true;
        return { status: 200, data: { token_type: 'cookie', expires_in: 3600, user: USER } };
      }
      return refreshed ? { status: 200, data: { ok: true } } : { status: 401 };
    });

    const results = await Promise.all([apiClient.get('/a'), apiClient.get('/b')]);

    expect(results.map(r => r.data)).toEqual([{ ok: true }, { ok: true }]);
    expect(seen.filter(c => c.url?.endsWith('/auth/refresh'))).toHaveLength(1);
    expect(getSessionUser()).toEqual(USER);
  });

  it('ends the session and announces expiry when refresh fails', async () => {
    setSessionUser(USER);
    useAdapter(() => ({ status: 401 }));
    const events: string[] = [];
    window.addEventListener('auth:logout', e => events.push((e as CustomEvent).detail?.reason));

    await expect(apiClient.get('/api/v1/websites')).rejects.toBeTruthy();

    expect(getSessionUser()).toBeNull();
    expect(events).toContain('session_expired');
  });

  it('does not try to refresh when login itself is rejected', async () => {
    const seen = useAdapter(() => ({ status: 401 }));
    await expect(authApi.login('a@b.c', 'wrong')).rejects.toBeTruthy();
    expect(seen.some(c => c.url?.endsWith('/auth/refresh'))).toBe(false);
  });
});

describe('login', () => {
  it('keeps only the session identity in memory and writes no token anywhere', async () => {
    vi.spyOn(authApi, 'login').mockResolvedValue({
      token_type: 'cookie', expires_in: 3600, user: USER,
    });

    await login('a@b.c', 'secret password');

    expect(getSessionUser()).toEqual(USER);
    expect(getTenantId()).toBe('tenant-1');
    expect(getCurrentRole()).toBe('admin');
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    expect(document.cookie).toBe('');
  });

  it('deletes tokens left in storage by earlier releases', () => {
    localStorage.setItem('data_engine_token', 'old-access');
    localStorage.setItem('data_engine_refresh_token', 'old-refresh');
    purgeLegacyTokens();
    expect(localStorage.getItem('data_engine_token')).toBeNull();
    expect(localStorage.getItem('data_engine_refresh_token')).toBeNull();
  });
});

describe('ProtectedRoute', () => {
  function renderAt() {
    return render(
      <MemoryRouter initialEntries={['/app']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<div>private page</div>} />
          </Route>
          <Route path="/login" element={<div>login page</div>} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('resolves the cookie session from the server before rendering', async () => {
    const fetch = vi.spyOn(authApi, 'fetchSession').mockResolvedValue(USER);
    renderAt();
    expect(screen.getByText(/checking your session/i)).toBeInTheDocument();
    expect(await screen.findByText('private page')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('sends a signed-out visitor to login', async () => {
    vi.spyOn(authApi, 'fetchSession').mockRejectedValue({ response: { status: 401 } });
    renderAt();
    expect(await screen.findByText('login page')).toBeInTheDocument();
  });

  it('leaves the app when the session ends', async () => {
    setSessionUser(USER);
    renderAt();
    expect(screen.getByText('private page')).toBeInTheDocument();
    setSessionUser(null);
    await waitFor(() => expect(screen.getByText('login page')).toBeInTheDocument());
  });
});
