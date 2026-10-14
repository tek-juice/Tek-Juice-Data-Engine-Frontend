import { describe, expect, it } from 'vitest';
import { findingLabel, metricText } from '../pages/Feedback/OptimizationOverview';

const m = (value: unknown, status: 'measured' | 'unavailable' = 'measured', reason?: string) =>
  ({ status, value, formula: 'f', evidence: reason ? { reason } : {}, source: 's' }) as never;

describe('metricText', () => {
  it('shows rates, counts, rankings and unavailable data distinctly', () => {
    expect(metricText(m(0.72))).toBe('72%');
    expect(metricText(m(1))).toBe('100%');
    expect(metricText(m(0))).toBe('0%');
    expect(metricText(m(14), 'count')).toBe('14');
    expect(metricText(m(1), 'count')).toBe('1');
    expect(metricText(m({ ranked: 3, tracked: 18, average_position: 6.5 }))).toBe('3 of 18 (avg. position 6.5)');
    expect(metricText(m(null, 'unavailable', 'Search Console not connected'))).toBe('Unavailable: Search Console not connected');
    expect(findingLabel({ type: 'canonical_points_elsewhere' } as never)).toBe('Canonical link points to another page');
  });
});
