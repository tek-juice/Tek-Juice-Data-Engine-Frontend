import { describe, expect, it } from 'vitest';
import { approvalLabel, publicationLabel, verificationLabel } from '../utils/publicationLabels';

describe('publication labels', () => {
  it('explains held approvals and human reviews', () => {
    expect(approvalLabel({
      approval_status: 'held', error: null,
      approval: { decision: 'held', reasons: ['unverified_figures:$19.99'] },
    })).toEqual({ text: 'held', detail: 'unverified_figures:$19.99' });
    expect(approvalLabel({
      approval_status: 'approved', error: null,
      approval: {
        decision: 'approved', reasons: [],
        review: { decision: 'approved', reviewer: 'u', note: 'ok', reviewed_at: '' },
      },
    }).text).toBe('approved (reviewed)');
    expect(approvalLabel({ approval_status: 'pending', error: 'Canonical content failed QA', approval: null }).text)
      .toBe('QA failed');
  });

  it('explains why publication is not progressing', () => {
    expect(publicationLabel({
      publication_status: 'pending', error: 'publication_blocked:s2s_not_registered: install',
      job_status: null, job_attempts: null,
    })).toEqual({ text: 'blocked', detail: 's2s_not_registered: install' });
    expect(publicationLabel({
      publication_status: 'queued', error: 'S2S publication failed with HTTP 503',
      job_status: 'queued', job_attempts: 2,
    }).text).toBe('retrying (attempt 2)');
    expect(publicationLabel({
      publication_status: 'failed', error: 'HTTP 409', job_status: 'failed', job_attempts: 1,
    })).toEqual({ text: 'failed', detail: 'HTTP 409' });
  });

  it('describes URL verification outcomes', () => {
    expect(verificationLabel({ status: 'verified' })).toBe('Live and verified');
    expect(verificationLabel({ status: 'reachable' })).toMatch(/not in served HTML/);
    expect(verificationLabel({ status: 'failed', reason: 'http_404' })).toBe('Not reachable (http_404)');
    expect(verificationLabel(null)).toBeNull();
  });
});


describe('indexabilityLabel', () => {
  it('says why a page is not readable by search engines', async () => {
    const { indexabilityLabel } = await import('../utils/publicationLabels');
    expect(indexabilityLabel({ status: 'verified', indexability: {
      prerendered: true, canonical: true, in_sitemap: true, indexable: true } })).toBe('Readable by search engines');
    expect(indexabilityLabel({ status: 'reachable', indexability: {
      prerendered: false, canonical: false, in_sitemap: false, indexable: false } }))
      .toBe('Not readable by search engines: article not in the page HTML, no canonical link, not in the sitemap');
    expect(indexabilityLabel({ status: 'verified' })).toBeNull();
  });
});
