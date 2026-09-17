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

// ── Onboarding Flow ───────────────────────────────────────────────────────────

/**
 * POST /onboard
 * Register a new product → creates tenant, sends verification email.
 * Returns tenant_id + api_key.
 * Public — no auth required.
 */
export async function onboardRegister(
  payload: OnboardRegisterPayload,
): Promise<OnboardRegisterResponse> {
  const { data } = await apiClient.post<OnboardRegisterResponse>(
    '/api/v1/auth/register',
    {
      email:     payload.admin_email,
      password:  payload.password,
      full_name: payload.product_name,
    },
  );
  return data;
}

/**
 * POST /onboard/verify-email
 * Verify the email token sent after registration → activates the tenant.
 * Returns tenant_id, product_name, website_url.
 * Public — no auth required.
 */
export async function onboardVerifyEmail(
  payload: OnboardVerifyEmailPayload,
): Promise<OnboardVerifyEmailResponse> {
  const { data } = await apiClient.post<OnboardVerifyEmailResponse>(
    '/onboard/verify-email',
    payload,
  );
  return data;
}

/**
 * POST /onboard/scan
 * Detect the platform (WordPress, Shopify, etc.) from a website URL.
 * Returns platform_type and a credential_guide for the detected platform.
 * Public — no auth required.
 */
export async function onboardScan(
  payload: OnboardScanPayload,
): Promise<OnboardScanResponse> {
  const { data } = await apiClient.post<OnboardScanResponse>(
    '/onboard/scan',
    payload,
  );
  return data;
}

/**
 * POST /onboard/install
 * Install the injection bridge with the provided credentials.
 * Returns success flag and an `installing` flag (poll /onboard/ping to track progress).
 * Public — no auth required.
 */
export async function onboardInstall(
  payload: OnboardInstallPayload,
): Promise<OnboardInstallResponse> {
  const { data } = await apiClient.post<OnboardInstallResponse>(
    '/onboard/install',
    payload,
  );
  return data;
}

/**
 * GET /onboard/ping?tenant_id=
 * Poll the SSH install status for a tenant.
 * injection_status progresses: configuring → live → failed
 * Public — no auth required.
 */
export async function onboardPing(
  tenant_id: string,
): Promise<OnboardPingResponse> {
  const { data } = await apiClient.get<OnboardPingResponse>(
    '/onboard/ping',
    { params: { tenant_id } },
  );
  return data;
}
