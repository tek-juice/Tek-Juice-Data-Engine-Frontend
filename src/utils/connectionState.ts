/**
 * Website connection state, derived only from verified backend state:
 * the onboarding status and the S2S publication readiness the Data Engine
 * reports. Never from what the browser did (e.g. that a key was issued).
 */

export type ConnectionStateId =
  | 'website_registered'
  | 'ownership_pending'
  | 'backend_pending'
  | 'connector_authenticated'
  | 'verifying'
  | 'verification_failed'
  | 'publication_ready'
  | 'disconnected'
  | 'unknown';

export type Tone = 'neutral' | 'progress' | 'success' | 'danger' | 'warning';

export interface ConnectionState {
  id: ConnectionStateId;
  label: string;
  description: string;
  tone: Tone;
  /**
   * Setup step the user should be on, following the backend's order:
   * 1 connector key -> 2 ownership proof -> 3 backend connection; null when done.
   */
  setupStep: 1 | 2 | 3 | null;
  publicationReady: boolean;
  /** Intelligence can run (onboarding READY), independent of publication. */
  intelligenceReady: boolean;
}

export interface PublicationInput {
  status?: string | null;
  ready?: boolean | null;
  failure_reason?: string | null;
}

const FAILURE_HINTS: Record<string, string> = {
  required_capability_missing:
    'The receiver must support publish.create and publish.verify. Update the connector package.',
  contract_version_unsupported: 'The connector must support publication contract 1.0.',
  endpoint_unreachable: 'The Data Engine could not reach the publication endpoint over HTTPS.',
  receiver_authentication_failed:
    'The receiver rejected the credential. Check TEKJUICE_RECEIVER_SECRET on your backend.',
  verification_rejected:
    'The endpoint does not implement the Tek Juice verify operation. Mount the connector receiver.',
  receiver_error: 'The receiver returned a server error during verification.',
  challenge_mismatch: 'The receiver did not echo the verification challenge.',
  website_mismatch: 'The receiver is configured for a different website ID.',
  verification_not_dry_run: 'The receiver stored content during a dry run.',
  invalid_publish_url: "The receiver's publish URL is not on your website's domain.",
  credentials_unreadable: 'The stored receiver credential is unreadable. Repeat the handshake.',
};

export function failureHint(reason: string | null | undefined): string {
  if (!reason) return 'Verification failed. Fix the receiver and restart your backend.';
  return FAILURE_HINTS[reason] ?? `Verification failed (${reason}).`;
}

const PRE_OWNERSHIP = new Set(['REGISTERED', 'EMAIL_VERIFIED', 'WEBSITE_REGISTERED']);
const OWNERSHIP_PENDING = new Set([
  'CREDENTIALS_ISSUED',
  'CONNECTOR_PENDING',
  'OWNERSHIP_VERIFICATION_FAILED',
  'CONNECTOR_AUTHENTICATION_FAILED',
]);

export function deriveConnectionState(
  onboardingStatus: string | null | undefined,
  publication?: PublicationInput | null,
): ConnectionState {
  const status = (onboardingStatus ?? '').toUpperCase();
  const pub = publication ?? {};
  const pubStatus = pub.status ?? 'not_configured';
  const intelligenceReady = status === 'READY';

  const state = (
    id: ConnectionStateId,
    label: string,
    description: string,
    tone: Tone,
    setupStep: ConnectionState['setupStep'],
  ): ConnectionState => ({
    id,
    label,
    description,
    tone,
    setupStep,
    publicationReady: id === 'publication_ready',
    intelligenceReady,
  });

  if (!status) {
    return state('unknown', 'Status unavailable', 'Connection status could not be loaded.', 'neutral', null);
  }
  if (PRE_OWNERSHIP.has(status)) {
    return state('website_registered', 'Generate a connector key',
      'Create the website-scoped key your backend will use to connect.', 'progress', 1);
  }
  if (OWNERSHIP_PENDING.has(status)) {
    return state('ownership_pending', 'Verify ownership',
      'Complete the DNS or HTTPS ownership check for this domain.', 'progress', 2);
  }
  if (status === 'OWNERSHIP_VERIFIED') {
    return state('backend_pending', 'Connect your backend',
      'Install the Tek Juice connector on your backend and start it with your keys.', 'progress', 3);
  }

  if (pub.ready === true && pubStatus === 'verified') {
    return state('publication_ready', 'Publication ready',
      'Your backend is connected and verified to receive content.', 'success', null);
  }
  if (pubStatus === 'failed') {
    return state('verification_failed', 'Verification failed', failureHint(pub.failure_reason),
      'danger', 3);
  }
  if (pubStatus === 'pending_verification') {
    return state('verifying', 'Verifying publication',
      'The Data Engine is checking it can publish to your backend.', 'progress', 3);
  }
  if (status === 'READY' && pubStatus === 'verified' && pub.ready === false) {
    return state('disconnected', 'Publication disconnected',
      'The publication connection is inactive. Re-run the connector handshake.', 'warning', 3);
  }
  if (status === 'READY') {
    return state('disconnected', 'Publication not connected',
      'Intelligence runs, but no verified publication receiver is registered.', 'warning', 3);
  }
  // CONNECTOR_AUTHENTICATED, BACKEND_CONNECTED or BACKEND_CONNECTION_FAILED
  return state('connector_authenticated', 'Connector authenticated',
    'Register your publication receiver through the connector handshake.', 'progress', 3);
}
