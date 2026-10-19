import apiClient from './axios';
import { API_BASE_URL, API_PREFIX } from '../config';
import type {
  SessionResponse,
  SessionUser,
  ApiKeyResponse,
  WebhookEndpoint,
  WebhookEventType,
  WebhookLogEntry,
} from '../types';

// ── Auth ──────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/token
 * Login — get JWT access + refresh tokens.
 * Uses application/x-www-form-urlencoded as required by the backend.
 */
export async function login(
  username: string,
  password: string,
): Promise<SessionResponse> {
  const params = new URLSearchParams({ username, password });
  const { data } = await apiClient.post<SessionResponse>(
    '/api/v1/auth/token',
    params,
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
  );
  return data;
}

/**
 * POST /api/v1/auth/register
 * Create a new account and return JWT tokens immediately.
 */
export async function register(
  email: string,
  password: string,
  full_name?: string,
  product_name?: string,
  business_description?: string,
): Promise<SessionResponse> {
  const { data } = await apiClient.post<SessionResponse>(
    '/api/v1/auth/register',
    {
      email,
      password,
      full_name: full_name ?? '',
      product_name: product_name ?? '',
      business_description: business_description ?? '',
    },
  );
  return data;
}

/**
 * GET /api/v1/auth/session
 * Who the httpOnly session cookie belongs to. Rejects with 401 when signed out.
 */
export async function fetchSession(): Promise<SessionUser> {
  const { data } = await apiClient.get<SessionUser>('/api/v1/auth/session');
  return data;
}

/**
 * POST /api/v1/auth/logout
 * Clears the session cookies on the server side.
 */
export async function logoutRequest(): Promise<void> {
  await apiClient.post('/api/v1/auth/logout');
}

// ── OAuth ─────────────────────────────────────────────────────────────────────

export type OAuthProvider = 'google' | 'github' | 'builderid';

/**
 * Redirect the browser to the backend OAuth authorisation URL.
 *
 * `redirect_uri` is this frontend's origin (it must be in the gateway's
 * allowlist). After sign-in the gateway sets the httpOnly session cookies and
 * redirects to `${origin}/auth/callback` — no tokens in the URL.
 */
/** Sign-in methods this instance offers; Google only when it is configured. */
export async function getAuthProviders(): Promise<{ password: boolean; google: boolean }> {
  try {
    const { data } = await apiClient.get<{ password: boolean; google: boolean }>('/api/v1/auth/providers');
    return { password: data.password !== false, google: data.google === true };
  } catch {
    return { password: true, google: false };   // older gateway or unreachable: never offer a broken button
  }
}

export function redirectToOAuth(provider: OAuthProvider): void {
  window.location.href = `${API_BASE_URL}${API_PREFIX}/auth/oauth/${provider}?redirect_uri=${encodeURIComponent(window.location.origin)}`;
}

// ── API Keys ──────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/auth/api-keys
 * List all API keys for the current tenant (prefix + metadata, never raw key).
 */
export async function listApiKeys(): Promise<import('../types').ApiKeyListItem[]> {
  const { data } = await apiClient.get<{
    api_keys: Array<{ id: string; key_prefix: string; name: string; is_active: boolean; created_at: string }>;
    count: number;
  }>('/api/v1/auth/api-keys');
  // Normalise backend field names to the ApiKeyListItem shape the UI expects
  return (data.api_keys ?? []).map(k => ({
    key_id:     k.id,
    prefix:     k.key_prefix,
    name:       k.name,
    is_active:  k.is_active,
    created_at: k.created_at,
  }));
}

/**
 * POST /api/v1/auth/api-keys
 * Generate a new API key. The raw key is shown once — store it immediately.
 */
export async function createApiKey(name: string): Promise<ApiKeyResponse> {
  const { data } = await apiClient.post<ApiKeyResponse>(
    '/api/v1/auth/api-keys',
    { name },
  );
  return data;
}

/**
 * DELETE /api/v1/auth/api-keys/{key_id}
 * Revoke an API key permanently. Returns 204.
 */
export async function deleteApiKey(key_id: string): Promise<void> {
  await apiClient.delete(`/api/v1/auth/api-keys/${key_id}`);
}

// ── Webhooks ──────────────────────────────────────────────────────────────────

export interface RegisterWebhookPayload {
  url: string;
  event_types: WebhookEventType[];
  description?: string;
}

/**
 * POST /api/v1/auth/webhooks
 * Register a product callback URL.
 * The response includes a one-time HMAC secret — store it immediately.
 */
export async function registerWebhook(
  payload: RegisterWebhookPayload,
): Promise<WebhookEndpoint> {
  const { data } = await apiClient.post<WebhookEndpoint>(
    '/api/v1/auth/webhooks',
    payload,
  );
  return data;
}

/**
 * GET /api/v1/auth/webhooks
 * List all registered webhook endpoints for the tenant.
 */
export async function listWebhooks(): Promise<WebhookEndpoint[]> {
  const { data } = await apiClient.get<{
    webhooks: Array<{ id: string; url: string; event_types: string[]; description?: string; is_active?: boolean; created_at: string }>;
    count: number;
  }>('/api/v1/auth/webhooks');
  // Normalise backend 'id' → 'endpoint_id'
  return (data.webhooks ?? []).map(w => ({
    endpoint_id: w.id,
    url:         w.url,
    event_types: w.event_types as WebhookEventType[],
    description: w.description,
    is_active:   w.is_active,
    created_at:  w.created_at,
  }));
}

/**
 * DELETE /api/v1/auth/webhooks/{endpoint_id}
 * Deactivate (soft-delete) a webhook endpoint. Returns 204.
 */
export async function deleteWebhook(endpoint_id: string): Promise<void> {
  await apiClient.delete(`/api/v1/auth/webhooks/${endpoint_id}`);
}

/**
 * GET /api/v1/auth/webhooks/{endpoint_id}/logs
 * Delivery audit log — debug missed or failed webhook pushes.
 */
export async function getWebhookLogs(
  endpoint_id: string,
  limit = 50,
): Promise<WebhookLogEntry[]> {
  const { data } = await apiClient.get<WebhookLogEntry[]>(
    `/api/v1/auth/webhooks/${endpoint_id}/logs`,
    { params: { limit } },
  );
  return data;
}
