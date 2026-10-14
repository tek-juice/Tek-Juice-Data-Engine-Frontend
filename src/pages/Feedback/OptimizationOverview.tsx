import { useEffect, useState } from 'react';
import { getOptimization, type AuditFinding, type OptimizationMetric, type OptimizationOverview as Overview } from '../../api/dashboard';

const METRICS: { key: string; label: string }[] = [
  { key: 'technical_readiness', label: 'Technical readiness' },
  { key: 'indexable_pages', label: 'Published pages readable by search engines' },
  { key: 'structured_data_validity', label: 'Valid structured data' },
  { key: 'search_index', label: 'Pages in the search index' },
  { key: 'search_rankings', label: 'Queries where the site appears' },
  { key: 'search_impressions_clicks', label: 'Search impressions and clicks' },
  { key: 'product_information', label: 'Product information verified' },
  { key: 'search_intent_coverage', label: 'Top queries with a page' },
  { key: 'content_freshness', label: 'Content updated in 180 days' },
];

const COUNT_METRICS = new Set(['search_index']);

const FINDING_LABELS: Record<string, string> = {
  missing_title: 'Missing page title',
  duplicate_title: 'Pages share one title',
  title_length: 'Title too short or long',
  missing_meta_description: 'Missing meta description',
  duplicate_meta_description: 'Pages share one meta description',
  meta_description_length: 'Meta description too short or long',
  missing_headings: 'No headings',
  generic_headings: 'Generic headings',
  canonical_points_elsewhere: 'Canonical link points to another page',
  thin_content: 'Thin content',
  duplicate_content: 'Identical content on several URLs',
  missing_structured_data: 'No structured data',
  orphan_page: 'No internal links point here',
  cannibalization: 'Pages compete for the same searches',
  not_prerendered: 'Content only visible with JavaScript',
  not_in_sitemap: 'Missing from the sitemap',
  structured_data_invalid: 'Structured data has errors',
  not_live: 'Published URL not live',
};

/** "72%", "14", "3 of 18 (avg. 6.5)", or the reason the data is unavailable. */
export function metricText(metric: OptimizationMetric | undefined, kind: 'rate' | 'count' = 'rate'): string {
  if (!metric) return '—';
  if (metric.status === 'unavailable') return `Unavailable: ${String(metric.evidence?.reason ?? 'no data')}`;
  const v = metric.value;
  if (typeof v === 'number') return kind === 'count' ? String(v) : `${Math.round(v * 100)}%`;
  if (v && typeof v === 'object' && 'ranked' in v) {
    const r = v as { ranked: number; tracked: number; average_position: number | null };
    return `${r.ranked} of ${r.tracked}${r.average_position ? ` (avg. position ${r.average_position})` : ''}`;
  }
  return '—';
}

export function findingLabel(finding: AuditFinding): string {
  return FINDING_LABELS[finding.type] ?? finding.type;
}

export default function OptimizationOverview({ websiteId }: { websiteId: string }) {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getOptimization(websiteId).then(setData).catch(() => setError('Unable to load the optimization overview.'));
  }, [websiteId]);

  if (error) return <div className="card"><div className="muted">{error}</div></div>;
  if (!data) return <div className="card"><div className="muted">Loading optimization overview…</div></div>;

  const findings = data.site_audit.findings;
  return (
    <>
      <div className="card">
        <div className="section-header">
          <div>
            <div className="eyebrow">Search, GEO and AEO</div>
            <h2>Optimization overview</h2>
          </div>
        </div>
        <p className="muted">{data.note}</p>
        <div className="detail-grid">
          {METRICS.map(({ key, label }) => {
            const metric = data.metrics[key];
            return (
              <div key={key} title={metric ? `How it is calculated: ${metric.formula}` : ''}>
                <div className="muted">{label}</div>
                <strong>{metricText(metric, COUNT_METRICS.has(key) ? 'count' : 'rate')}</strong>
                {metric?.source && <div className="muted" style={{ fontSize: 12 }}>{metric.source}</div>}
              </div>
            );
          })}
          <div>
            <div className="muted">Work</div>
            <strong>{`${data.work.published} published · ${data.work.awaiting_review} awaiting review`}</strong>
            <div className="muted" style={{ fontSize: 12 }}>{`${data.work.opportunities} opportunities in the latest run`}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Site audit</h3>
        <p className="muted">
          {`${data.site_audit.pages_checked} crawled pages`}
          {data.site_audit.crawled_at ? ` (crawled ${new Date(data.site_audit.crawled_at).toLocaleString()})` : ''}
          {`, ${data.site_audit.verified_pages} published pages verified live. `}
          Automatic fixes go through the content pipeline; the others need the site owner.
        </p>
        {findings.length === 0 ? (
          <p className="muted">No issues found.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Issue</th><th>Severity</th><th>Pages</th><th>Fixed by</th><th>Evidence</th></tr>
              </thead>
              <tbody>
                {findings.map((f) => (
                  <tr key={`${f.type}-${f.fixable_by}-${f.urls[0] ?? ''}`}>
                    <td>{findingLabel(f)}</td>
                    <td>{f.severity}</td>
                    <td title={f.urls.join('\n')}>{f.count}</td>
                    <td>{f.fixable_by === 'automatic' ? 'Pipeline (automatic)' : 'Site owner'}</td>
                    <td>
                      {f.evidence}
                      {f.urls[0] && <div className="muted" style={{ fontSize: 12 }}>{f.urls.slice(0, 2).join(', ')}{f.count > 2 ? ' …' : ''}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data.competitors.length > 0 && (
        <div className="card">
          <h3>Competitors seen in search results</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Site</th><th>Type</th><th>Appearances</th><th>Best position</th></tr></thead>
              <tbody>
                {data.competitors.map((c) => (
                  <tr key={c.domain}><td>{c.domain}</td><td>{c.category}</td><td>{c.appearance_count}</td><td>{c.best_position ?? '—'}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
