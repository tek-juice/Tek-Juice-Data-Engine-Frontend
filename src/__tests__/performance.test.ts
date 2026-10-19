import { describe, expect, it } from 'vitest';
import { eligibilityText, outcomeLabel } from '../pages/Feedback/Performance';

describe('performance labels', () => {
  it('never presents a code change as code-free', () => {
    expect(eligibilityText({ eligibility: 'code_change_required' })).toMatch(/code/);
    expect(eligibilityText({ eligibility: 'code_change_required' })).not.toMatch(/Code-free/);
    expect(eligibilityText({ eligibility: 'code_free_candidate' })).toMatch(/if the connector supports it/);
  });

  it('labels verification outcomes without claiming success early', () => {
    expect(outcomeLabel('VERIFIED_RESOLVED')).toBe('Resolved (verified)');
    expect(outcomeLabel('ROLLBACK_FAILED')).toBe('Rollback failed');
    expect(outcomeLabel(null)).toBeNull();
  });
});
