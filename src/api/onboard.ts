import apiClient from './axios';
import type {
  OnboardRegisterPayload,
  OnboardRegisterResponse,
  OnboardVerifyEmailPayload,
  OnboardVerifyEmailResponse,
  OnboardScanPayload,
  OnboardScanResponse,
  OnboardInstallPayload,
  OnboardInstallResponse,
  OnboardPingResponse,
} from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** True when the error is an HTTP 404 (endpoint not yet deployed). */
function is404(err: unknown): boolean {
  return (err as { response?: { status?: number } })?.response?.status === 404;
}

// ── Onboarding Flow ───────────────────────────────────────────────────────────

/**
 * POST /onboard
 * Register a new product → creates tenant, sends verification email.
 * Returns tenant_id + api_key.
 * Public — no auth required.
 *
 * 404 → endpoint not yet deployed; caller should fall back to /api/v1/auth/register.
 */
export async function onboardRegister(
  payload: OnboardRegisterPayload,
): Promise<OnboardRegisterResponse> {
  try {
    const { data } = await apiClient.post<OnboardRegisterResponse>(
      '/api/v1/onboard',
      payload,
    );
    return data;
  } catch (err) {
    if (is404(err)) throw Object.assign(new Error('onboard_not_found'), { response: { status: 404 } });
    throw err;
  }
}

/**
 * POST /onboard/verify-email
 * Verify the email token sent after registration → activates the tenant.
 * Returns tenant_id, product_name, website_url.
 * Public — no auth required.
 *
 * 404 → endpoint not yet deployed; caller may skip verification.
 */
export async function onboardVerifyEmail(
  payload: OnboardVerifyEmailPayload,
): Promise<OnboardVerifyEmailResponse> {
  try {
    const { data } = await apiClient.post<OnboardVerifyEmailResponse>(
      '/api/v1/onboard/verify-email',
      payload,
    );
    return data;
  } catch (err) {
    if (is404(err)) throw Object.assign(new Error('onboard_not_found'), { response: { status: 404 } });
    throw err;
  }
}

/**
 * POST /onboard/scan
 * Detect the platform (WordPress, Shopify, etc.) from a website URL.
 * Returns platform_type and a credential_guide for the detected platform.
 * Public — no auth required.
 *
 * 404 → endpoint not yet deployed; caller should show manual platform selector.
 */
export async function onboardScan(
  payload: OnboardScanPayload,
): Promise<OnboardScanResponse> {
  try {
    const { data } = await apiClient.post<OnboardScanResponse>(
      '/api/v1/onboard/scan',
      payload,
    );
    return data;
  } catch (err) {
    if (is404(err)) throw Object.assign(new Error('onboard_not_found'), { response: { status: 404 } });
    throw err;
  }
}

/**
 * POST /onboard/install
 * Install the injection bridge with the provided credentials.
 * Returns success flag and an `installing` flag (poll /onboard/ping to track progress).
 * Public — no auth required.
 *
 * 404 → endpoint not yet deployed; caller should simulate success.
 */
export async function onboardInstall(
  payload: OnboardInstallPayload,
): Promise<OnboardInstallResponse> {
  try {
    const { data } = await apiClient.post<OnboardInstallResponse>(
      '/api/v1/onboard/install',
      payload,
    );
    return data;
  } catch (err) {
    if (is404(err)) throw Object.assign(new Error('onboard_not_found'), { response: { status: 404 } });
    throw err;
  }
}

/**
 * GET /onboard/ping?tenant_id=
 * Poll the SSH install status for a tenant.
 * injection_status progresses: configuring → live → failed
 * Public — no auth required.
 *
 * 404 → endpoint not yet deployed; caller should treat as still configuring.
 */
export async function onboardPing(
  tenant_id: string,
): Promise<OnboardPingResponse> {
  try {
    const { data } = await apiClient.get<OnboardPingResponse>(
      '/api/v1/onboard/ping',
      { params: { tenant_id } },
    );
    return data;
  } catch (err) {
    if (is404(err)) throw Object.assign(new Error('onboard_not_found'), { response: { status: 404 } });
    throw err;
  }
}
