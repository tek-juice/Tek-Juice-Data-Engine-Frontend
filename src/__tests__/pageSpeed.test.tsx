import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PageSpeed, { groupRecommendations, taskText } from '../pages/PageSpeed/PageSpeed';
import * as dashboard from '../api/dashboard';
import * as websites from '../api/websites';
import * as context from '../contexts/IntelligenceRunContext';
import type { PerformanceFinding } from '../api/dashboard';

function finding(overrides: Partial<PerformanceFinding>): PerformanceFinding {
  return {
    id: 'f1', url: 'https://shop.example/', strategy: 'mobile', audit_id: 'unused-javascript',
    category: 'javascript', category_label: 'JavaScript execution and unused code', title: 'Reduce unused JavaScript',
    observed_display: null, threshold: null, hypothesis: 'affected: index.js', confidence: 'medium', uncertainty: null,
    eligibility: 'code_change_required', code_free: false, risk: 'medium',
    recommended_action: 'Code-split the listed bundles.', metric: null, observed_value: null,
    resources: [{ url: 'https://shop.example/assets/index-1a2b3c4d.js', wastedBytes: 153600, party: 'first' }],
    impact: { savings_ms: 450, savings_bytes: 153600 }, verification: { resolved_when: 'the audit passes' },
    evidence: { source: 'lab' }, plan: null, status: 'code_change_required', state: 'code change required',
    action_id: null, observed_at: null, ...overrides,
  };
}

const FINDINGS = [
  finding({}),
  finding({ id: 'f2', strategy: 'desktop' }),                                  // same audit, other device
  finding({ id: 'f3', audit_id: 'largest-contentful-paint', category: 'lcp', category_label: 'LCP',
    title: 'Largest Contentful Paint', observed_display: '4.8 s', resources: [], impact: {} }),
  finding({ id: 'f4', audit_id: 'uses-long-cache-ttl', category: 'caching_delivery', eligibility: 'code_free_candidate',
    code_free: true, status: 'awaiting_approval' }),                            // code-free: not on this page
  finding({ id: 'f5', audit_id: 'dom-size', status: 'no_longer_observed' }),     // gone
];

describe('PageSpeed recommendations', () => {
  it('groups code-change findings per audit and leaves out code-free or resolved ones', () => {
    const recs = groupRecommendations(FINDINGS);
    expect(recs.map((r) => r.auditId)).toEqual(['largest-contentful-paint', 'unused-javascript']);   // LCP first
    const js = recs[1];
    expect(js.pages.map((p) => p.strategy)).toEqual(['mobile', 'desktop']);
    expect(js.resources).toHaveLength(1);
    expect(js.resources[0].detail).toBe('150 KiB unused');
  });

  it('copies a developer task with pages, resources, where to fix and done criteria', () => {
    const text = taskText(groupRecommendations(FINDINGS)[1]);
    expect(text).toContain('## Reduce unused JavaScript');
    expect(text).toContain('**Where:** Bundler configuration');
    expect(text).toContain('- https://shop.example/ (desktop)');
    expect(text).toContain('index-1a2b3c4d.js (150 KiB unused)');
    expect(text).toContain('**Done when:** the audit passes');
    expect(text).toContain('lab run (simulated)');
  });

  describe('page', () => {
    beforeEach(() => {
      vi.spyOn(context, 'useIntelligenceRun').mockReturnValue({ website: null, selectedRunId: null } as never);
      vi.spyOn(websites, 'listWebsites').mockResolvedValue([{ id: 'site-1', domain: 'shop.example' }] as never);
      vi.spyOn(dashboard, 'getPerformanceFindings').mockResolvedValue({
        findings: FINDINGS, total: FINDINGS.length, categories: {},
        counts: { by_category: {}, by_eligibility: {}, by_status: {} },
      });
      vi.spyOn(dashboard, 'getPerformanceAssessments').mockResolvedValue({
        assessments: [{ id: 'a1', measured_at: '2026-10-19T10:00:00Z', url: 'https://shop.example/', strategy: 'mobile',
          status: 'ok', error: null, lab: { performance: 0.62, lcp_ms: 4800 }, field: null }],
        total: 1, calls_today: 2, daily_limit: 60,
      });
    });

    it('asks only for code-change findings and shows them with scores', async () => {
      render(<PageSpeed />);
      expect(await screen.findByRole('heading', { name: 'Reduce unused JavaScript' })).toBeInTheDocument();
      expect(dashboard.getPerformanceFindings).toHaveBeenCalledWith('site-1',
        expect.objectContaining({ eligibility: 'code_change_required' }));
      expect(screen.getByRole('heading', { name: 'Largest Contentful Paint' })).toBeInTheDocument();
      expect(screen.queryByText(/efficient cache policy/i)).not.toBeInTheDocument();
      expect(screen.getAllByText('62').length).toBeGreaterThan(0);                // mobile score
      expect(screen.getAllByRole('button', { name: /copy as task/i })).toHaveLength(2);
    });
  });
});
