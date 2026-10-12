import { describe, expect, it } from 'vitest';
import { deriveConnectionState, failureHint } from '../utils/connectionState';

describe('deriveConnectionState', () => {
  it.each([
    ['WEBSITE_REGISTERED', 'website_registered', 1],
    ['CONNECTOR_PENDING', 'ownership_pending', 2],
    ['OWNERSHIP_VERIFICATION_FAILED', 'ownership_pending', 2],
    ['OWNERSHIP_VERIFIED', 'backend_pending', 3],
    ['CONNECTOR_AUTHENTICATED', 'connector_authenticated', 3],
  ])('%s -> %s (step %s)', (onboarding, id, step) => {
    const state = deriveConnectionState(onboarding, { status: 'not_configured', ready: false });
    expect(state.id).toBe(id);
    expect(state.setupStep).toBe(step);
    expect(state.publicationReady).toBe(false);
  });

  it('is publication-ready only when the backend reports a verified, active connection', () => {
    expect(deriveConnectionState('READY', { status: 'verified', ready: true }).id)
      .toBe('publication_ready');
    expect(deriveConnectionState('READY', { status: 'verified', ready: false }).id)
      .toBe('disconnected');
  });

  it('never treats onboarding READY alone as publication-ready', () => {
    const state = deriveConnectionState('READY', { status: 'not_configured', ready: false });
    expect(state.id).toBe('disconnected');
    expect(state.intelligenceReady).toBe(true);
    expect(state.publicationReady).toBe(false);
  });

  it('reports verification in progress and failures with an actionable hint', () => {
    expect(deriveConnectionState('BACKEND_CONNECTED', { status: 'pending_verification' }).id)
      .toBe('verifying');
    const failed = deriveConnectionState('BACKEND_CONNECTED', {
      status: 'failed', failure_reason: 'verification_rejected',
    });
    expect(failed.id).toBe('verification_failed');
    expect(failed.tone).toBe('danger');
    expect(failed.description).toMatch(/verify operation/);
  });

  it('handles missing status safely', () => {
    expect(deriveConnectionState(undefined, null).id).toBe('unknown');
    expect(failureHint('something_new')).toBe('Verification failed (something_new).');
  });
});
