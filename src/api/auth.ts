import apiClient from './axios';
import type {
  TokenResponse,
  ApiKeyResponse,
  WebhookEndpoint,
  WebhookEventType,
  WebhookLogEntry,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

// ── Auth ──────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/token
 * Login — get JWT access + refresh tokens.
 * Uses application/x-www-form-urlencoded as required by the backend.
 */
export async function login(
  username: string,
  password: string,
): Promise<TokenResponse> {
  const params = new URLSearchParams({ username, password });
  const { data } = await apiClient.post<TokenResponse>(
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
): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>(
    '/api/v1/auth/register',
    { email, password, full_name: full_name ?? '' },
  );
  return data;
}

/**
 * POST /api/v1/auth/refresh
 * Exchange a refresh token for a new access token.
 */
export async function refreshToken(
  refresh_token: string,
): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>(
    '/api/v1/auth/refresh',
    { refresh_token },
  );
  return data;
}

// ── OAuth ─────────────────────────────────────────────────────────────────────

export type OAuthProvider = 'google' | 'github' | 'builderid';

/**
 * Redirect the browser to the backend OAuth authorisation URL.
 * The backend will redirect back to /auth/callback?code=...&provider=...
 * after the user authenticates with the social provider.
 */
export function redirectToOAuth(provider: OAuthProvider): void {
  const callbackUrl = `${window.location.origin}/auth/callback`;
  window.location.href = `${BASE_URL}/api/v1/auth/oauth/${provider}?redirect_uri=${encodeURIComponent(callbackUrl)}`;
}

/**
 * POST /api/v1/auth/oauth/callback
 * Exchange the ?code= returned by the provider for a JWT token pair.
 * Called by the OAuthCallback page after the browser is redirected back.
 */
export async function exchangeOAuthCode(
  provider: OAuthProvider,
  code: string,
): Promise<TokenResponse> {
  const callbackUrl = `${window.location.origin}/auth/callback`;
  const { data } = await apiClient.post<TokenResponse>(
    '/api/v1/auth/oauth/callback',
    { provider, code, redirect_uri: callbackUrl },
  );
  return data;
}

// ── API Keys ──────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/auth/api-keys
 * List all API keys for the current tenant (prefix + metadata, never raw key).
 */
export async function listApiKeys(): Promise<import('../types').ApiKeyListItem[]> {
  const { data } = await apiClient.get<import('../types').ApiKeyListItem[]>(
    '/api/v1/auth/api-keys',
  );
  return data;
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
  const { data } = await apiClient.get<WebhookEndpoint[]>(
    '/api/v1/auth/webhooks',
  );
  return data;
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
