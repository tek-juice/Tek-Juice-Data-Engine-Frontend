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

describe('experiments', () => {
  it('reports controlled results and refuses to conclude without data', async () => {
    const { experimentResult } = await import('../pages/Feedback/Experiments');
    const base = { id: '1', kind: 'title_meta', status: 'concluded', hypothesis: '', metric: 'ctr', assignment: {},
      guardrails: {}, history: [{ at: '', status: 'blocked', note: 'Search Console is not connected' }],
      started_at: null, ends_at: null } as never;
    expect(experimentResult({ ...(base as object), result: null } as never)).toBe('Search Console is not connected');
    expect(experimentResult({ ...(base as object), result: { effect: 0.006, sufficient_data: true, decision: 'keep',
      label: 'controlled (page-level random assignment)' } } as never))
      .toBe('CTR +0.6 pts vs control, keep (controlled (page-level random assignment))');
    expect(experimentResult({ ...(base as object), result: { effect: 0.01, sufficient_data: false,
      label: 'insufficient data' } } as never)).toBe('No conclusion: insufficient data');
  });
});

describe('search results', () => {
  it('states changes, position movement and refuses to judge too early', async () => {
    const { changeText, positionText, verdictText } = await import('../pages/Feedback/SearchResults');
    expect(changeText(0.25)).toBe('+25%');
    expect(changeText(-0.1)).toBe('−10%');
    expect(changeText(null)).toBeNull();
    expect(positionText(3.2)).toBe('up 3.2 places');
    expect(positionText(-1)).toBe('down 1 places');
    expect(verdictText(null)).toBe('No Search Console data since the Data Engine started yet.');
    expect(verdictText({ verdict: 'too_early', note: 'only 2 day(s) of data since the engine started; wait for 14',
      before: null, after: {} as never, change: null })).toBe(
      'Too early to judge: only 2 day(s) of data since the engine started; wait for 14.');
  });
});

describe('gap status', () => {
  it('labels evidence-based gap statuses', async () => {
    const { gapStatusLabel } = await import('../pages/Gaps/Gaps');
    expect(gapStatusLabel('in_progress')).toBe('In progress');
    expect(gapStatusLabel('resolved')).toBe('Resolved');
    expect(gapStatusLabel('open')).toBe('Open');
  });
});

describe('date ranges', () => {
  it('names the window every figure covers', async () => {
    const { rangeText } = await import('../pages/Feedback/SearchResults');
    expect(rangeText({ from: '2026-09-28', to: '2026-10-14' })).toBe('28 Sept – 14 Oct 2026'.replace('Sept', new Date('2026-09-28T00:00:00Z').toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' })));
  });
});

describe('PageSpeed Insights connection', () => {
  it('shows the Cloud project it runs through', () => {
    expect(connectionLabel({ provider: 'google_pagespeed', status: 'connected',
      property: 'Google Cloud project aqueous-argon-408202', last_sync_at: null, last_error: null } as never))
      .toBe('Connected: Google Cloud project aqueous-argon-408202');
  });
});
