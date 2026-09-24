import apiClient from './axios';
import { API_BASE_URL } from '../config';
import type { SdkSignalPayload } from '../types';

// ── SDK Bridge ────────────────────────────────────────────────────────────────

/**
 * GET /sdk.js?key=<api_key>
 * Returns the URL for the JS bridge script to inject into the product website.
 * Public — authenticated via the `key` query parameter.
 */
export function getSdkScriptUrl(api_key: string): string {
  return `${API_BASE_URL}/sdk.js?key=${encodeURIComponent(api_key)}`;
}

/**
 * POST /sdk/signal
 * Sends page-live / scroll signals from the JS bridge.
 * Public — authenticated via the API key in the payload.
 */
export async function sendSdkSignal(payload: SdkSignalPayload): Promise<void> {
  await apiClient.post('/sdk/signal', payload);
}
