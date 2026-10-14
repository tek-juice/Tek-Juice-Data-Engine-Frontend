import { describe, expect, it } from 'vitest';
import { connectionLabel } from '../pages/Feedback/DataConnections';
import { outcomeText } from '../pages/Feedback/Actions';
import { metricText } from '../pages/Feedback/OptimizationOverview';

const m = (value: unknown) => ({ status: 'measured', value, formula: 'f', evidence: {}, source: 's' }) as never;

describe('growth dashboard', () => {
  it('labels connections, outcomes and observed metrics', () => {
    expect(connectionLabel({ provider: 'google_analytics', status: 'needs_property', property: null, last_sync_at: null, last_error: null }))
      .toBe('Authorized: choose a property');
    expect(connectionLabel({ provider: 'google_search_console', status: 'error', property: 'p', last_sync_at: null,
      last_error: 'reauthorization_required' })).toBe('Needs reconnecting: reauthorization_required');
    expect(outcomeText({ outcome: { label: 'observational', direction: 'improved', changes: { clicks: 5, position: 2.3 } } } as never))
      .toBe('Observed improved: clicks +5, position +2.3 (observational)');
    expect(outcomeText({ outcome: null } as never)).toBeNull();
    expect(metricText(m({ clicks: 3, impressions: 40, average_position: 8.4 }))).toBe('3 clicks · 40 impressions · avg. position 8.4');
    expect(metricText(m({ sessions: 9, conversions: 1 }))).toBe('9 sessions · 1 conversions');
    expect(metricText(m({ indexed: 1, not_indexed: 2, unknown: 0, not_inspected: 3, overdue: 2 })))
      .toBe('1 indexed · 2 not indexed (2 overdue) · 3 not inspected');
  });
});
