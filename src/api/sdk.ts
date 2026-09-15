import apiClient from './axios';
import type { SdkSignalPayload } from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

// ── SDK Bridge ────────────────────────────────────────────────────────────────

/**
 * GET /sdk.js?key=<api_key>
 * Returns the URL for the JS bridge script to inject into the product website.
 * Public — authenticated via the `key` query parameter.
 */
export function getSdkScriptUrl(api_key: string): string {
  return `${BASE_URL}/sdk.js?key=${encodeURIComponent(api_key)}`;
}

/**
 * POST /sdk/signal
 * Sends page-live / scroll signals from the JS bridge.
 * Public — authenticated via the API key in the payload.
 */
export async function sendSdkSignal(payload: SdkSignalPayload): Promise<void> {
  await apiClient.post('/sdk/signal', payload);
}
