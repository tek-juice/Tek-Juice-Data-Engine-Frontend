import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Copy, RefreshCw } from 'lucide-react';
import { isAxiosError } from 'axios';
import {
  getPerformanceAssessments,
  getPerformanceFindings,
  requestPerformanceAssessment,
  type PerformanceAssessment,
  type PerformanceFinding,
} from '../../api/dashboard';
import { listWebsites, type Website } from '../../api/websites';

/** Where in the site's code a developer usually makes the change, per category. */
export const WHERE_TO_FIX: Record<string, string> = {
  javascript: 'Bundler configuration and route components (code splitting, removing unused dependencies, deferring scripts).',
  css: 'Stylesheets and their imports (remove unused rules, split CSS per route).',
  render_blocking: 'The <head> of the HTML template (inline critical CSS, defer/async scripts, preload fonts).',
  fonts: 'Font loading in the HTML head and CSS (@font-face font-display, preload, fallback sizing).',
  lcp: 'The component rendering the largest element (hero image or heading): no lazy loading, preload it, render it without waiting for an API call.',
  cls: 'Components that render late content (reserve space: image width/height, fixed-height placeholders).',
  inp: 'Event handlers and re-renders triggered by interactions (split long tasks, debounce, memoise).',
  backend: 'Server code for the page (database queries, rendering, external calls; add caching).',
  network_server: 'Server and hosting configuration (measure origin time with Server-Timing first).',
  caching_delivery: 'Build output naming (content hashes in file names), then the cache policy.',
  compression: 'The build pipeline or server configuration for the heaviest resources.',
  images: 'Image assets and the components that render them (sizes, formats, lazy loading).',
  security_compat: 'Server or hosting configuration (HTTPS, HTTP/2).',
};

const CATEGORY_ORDER = ['lcp', 'cls', 'inp', 'javascript', 'render_blocking', 'css', 'fonts', 'images',
  'caching_delivery', 'compression', 'backend', 'network_server', 'security_compat'];

export interface Recommendation {
  auditId: string;
  category: string;
  categoryLabel: string;
  title: string;
  recommendedAction: string;
  hypothesis: string;
  confidence: string;
  uncertainty: string | null;
  source: 'lab' | 'field';
  pages: { url: string; strategy: string; observed: string | null }[];
  resources: { label: string; party?: string; detail?: string }[];
  verification: string | null;
  savingsMs: number;
  savingsBytes: number;
}

function resourceDetail(r: PerformanceFinding['resources'][number]): string | undefined {
  if (r.wastedBytes) return `${Math.round(r.wastedBytes / 1024)} KiB unused`;
  if (r.wastedMs) return `${Math.round(r.wastedMs)} ms`;
  if (r.totalBytes) return `${Math.round(r.totalBytes / 1024)} KiB`;
  return undefined;
}

/** One recommendation per audit: every affected page and device, the resources named, the savings. */
export function groupRecommendations(findings: PerformanceFinding[]): Recommendation[] {
  const byAudit = new Map<string, Recommendation>();
  for (const f of findings) {
    if (f.eligibility !== 'code_change_required') continue;
    if (['no_longer_observed', 'resolved', 'rolled_back'].includes(f.status)) continue;
    const item = byAudit.get(f.audit_id) ?? {
      auditId: f.audit_id, category: f.category, categoryLabel: f.category_label, title: f.title,
      recommendedAction: f.recommended_action, hypothesis: f.hypothesis, confidence: f.confidence,
      uncertainty: f.uncertainty, source: f.evidence?.source ?? 'lab', pages: [], resources: [],
      verification: f.verification?.resolved_when ?? null, savingsMs: 0, savingsBytes: 0,
    };
    item.pages.push({ url: f.url, strategy: f.strategy, observed: f.observed_display });
    for (const r of f.resources ?? []) {
      const label = r.url ?? r.selector ?? r.snippet;
      if (label && !item.resources.some((x) => x.label === label)) {
        item.resources.push({ label, party: r.party, detail: resourceDetail(r) });
      }
    }
    item.savingsMs = Math.max(item.savingsMs, f.impact?.savings_ms ?? 0);
    item.savingsBytes = Math.max(item.savingsBytes, f.impact?.savings_bytes ?? 0);
    if (f.confidence === 'high') item.confidence = 'high';
    byAudit.set(f.audit_id, item);
  }
  const rank = (c: string) => {
    const i = CATEGORY_ORDER.indexOf(c);
    return i === -1 ? CATEGORY_ORDER.length : i;
  };
  return [...byAudit.values()].sort((a, b) => rank(a.category) - rank(b.category)
    || b.pages.length - a.pages.length || b.savingsMs - a.savingsMs);
}

/** A Markdown task a developer can paste into a ticket. */
export function taskText(r: Recommendation): string {
  const lines = [
    `## ${r.title} (${r.categoryLabel})`,
    '',
    `**Why:** ${r.hypothesis}`,
    `**Change:** ${r.recommendedAction}`,
    WHERE_TO_FIX[r.category] ? `**Where:** ${WHERE_TO_FIX[r.category]}` : '',
    '',
    '**Affected pages:**',
    ...r.pages.map((p) => `- ${p.url} (${p.strategy})${p.observed ? `: ${p.observed}` : ''}`),
  ];
  if (r.resources.length) {
    lines.push('', '**Resources / elements:**',
      ...r.resources.slice(0, 10).map((x) => `- ${x.label}${x.detail ? ` (${x.detail})` : ''}${x.party === 'third' ? ' [third party]' : ''}`));
  }
  if (r.verification) lines.push('', `**Done when:** ${r.verification} (PageSpeed Insights, same page and device).`);
  lines.push('', `Evidence: PageSpeed Insights ${r.source === 'field' ? 'field data (real users, 28 days)' : 'lab run (simulated)'}, audit \`${r.auditId}\`.`);
  return lines.filter((l, i, all) => !(l === '' && all[i - 1] === '')).join('\n');
}

function scoreText(value: number | null | undefined): string {
  return typeof value === 'number' ? String(Math.round(value * 100)) : '—';
}

function latestScores(assessments: PerformanceAssessment[]) {
  const latest = new Map<string, PerformanceAssessment>();
  for (const a of assessments) {
    if (a.status !== 'ok') continue;
    const key = `${a.url}|${a.strategy}`;
    if (!latest.has(key)) latest.set(key, a);       // newest first from the API
  }
  return [...latest.values()];
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card">
      <div className="muted">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

function Header({ website, onRefresh, onAssess, busy }: {
  website?: Website | null; onRefresh?: () => void; onAssess?: () => void; busy?: boolean;
}) {
  return (
    <div className="page-header">
      <div>
        <div className="eyebrow">Search &amp; Visibility</div>
        <h1>PageSpeed recommendations</h1>
        {website && (
          <p className="muted">
            {`Changes to ${website.domain || website.url}'s source code that PageSpeed Insights evidence calls for. `}
            These cannot be fixed by configuration; hand them to the site&apos;s developers.
          </p>
        )}
      </div>
      {onRefresh && (
        <div style={{ display: 'flex', gap: 8 }}>
          {onAssess && <button className="button" onClick={onAssess} disabled={busy}>Assess now</button>}
          <button className="button secondary" onClick={onRefresh} disabled={busy}>
            <RefreshCw size={16} />
            {busy ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function PageSpeed() {
  const [website, setWebsite] = useState<Website | null>(null);
  const [findings, setFindings] = useState<PerformanceFinding[]>([]);
  const [assessments, setAssessments] = useState<PerformanceAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [strategy, setStrategy] = useState<'all' | 'mobile' | 'desktop'>('all');
  const [category, setCategory] = useState('all');

  const load = useCallback(async (refresh = false) => {
    try {
      setError('');
      if (refresh) setRefreshing(true);
      else setLoading(true);
      const websites = await listWebsites();
      if (!websites.length) {
        setWebsite(null);
        return;
      }
      const selected = websites[0];
      setWebsite(selected);
      const [found, measured] = await Promise.all([
        getPerformanceFindings(selected.id, { eligibility: 'code_change_required', limit: 200 }),
        getPerformanceAssessments(selected.id, 50),
      ]);
      setFindings(found.findings);
      setAssessments(measured.assessments);
    } catch (err) {
      console.error(err);
      setError(isAxiosError(err) && err.response?.status === 404
        ? 'PageSpeed findings are not available yet.' : 'Unable to load PageSpeed recommendations.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => findings.filter((f) => (strategy === 'all' || f.strategy === strategy)
    && (category === 'all' || f.category === category)), [findings, strategy, category]);
  const recommendations = useMemo(() => groupRecommendations(visible), [visible]);
  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const f of findings) seen.set(f.category, f.category_label);
    return [...seen.entries()];
  }, [findings]);
  const scores = useMemo(() => latestScores(assessments), [assessments]);

  const assess = async () => {
    if (!website) return;
    try {
      await requestPerformanceAssessment(website.id);
      setMessage('Assessment queued (mobile and desktop). Refresh in a few minutes.');
    } catch (err) {
      setMessage(isAxiosError(err) && err.response?.status === 403 ? 'Only admins can request an assessment.'
        : 'The assessment could not be queued.');
    }
  };

  const copy = async (r: Recommendation) => {
    try {
      await navigator.clipboard.writeText(taskText(r));
      setMessage(`Copied "${r.title}" as a task.`);
    } catch {
      setMessage('Copy failed: your browser blocked clipboard access.');
    }
  };

  if (loading) {
    return (
      <div className="page">
        <Header />
        <div className="card"><div className="muted">Loading PageSpeed recommendations…</div></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <Header onRefresh={() => void load(true)} busy={refreshing} />
        <div className="card empty-state">
          <AlertCircle size={22} />
          <h3>{error}</h3>
        </div>
      </div>
    );
  }

  if (!website) {
    return (
      <div className="page">
        <Header />
        <div className="card empty-state">
          <h3>Connect a website first</h3>
          <p className="muted">PageSpeed recommendations are scoped to a connected website.</p>
        </div>
      </div>
    );
  }

  const home = (device: string) => {
    const forDevice = scores.filter((s) => s.strategy === device);
    return forDevice.find((s) => new URL(s.url).pathname === '/') ?? forDevice[0];
  };
  const pagesAffected = new Set(visible.filter((f) => !['no_longer_observed', 'resolved'].includes(f.status))
    .map((f) => f.url)).size;

  return (
    <div className="page">
      <Header website={website} onRefresh={() => void load(true)} onAssess={() => void assess()} busy={refreshing} />
      {message && <p className="muted">{message}</p>}

      <div className="grid grid-4">
        <SummaryCard label="Code changes recommended" value={recommendations.length} />
        <SummaryCard label="Pages affected" value={pagesAffected} />
        <SummaryCard label="Mobile score (home)" value={scoreText(home('mobile')?.lab?.performance)} />
        <SummaryCard label="Desktop score (home)" value={scoreText(home('desktop')?.lab?.performance)} />
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <label className="muted">
            Device{' '}
            <select value={strategy} onChange={(e) => setStrategy(e.target.value as typeof strategy)}>
              <option value="all">All</option>
              <option value="mobile">Mobile</option>
              <option value="desktop">Desktop</option>
            </select>
          </label>
          <label className="muted">
            Category{' '}
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">All</option>
              {categories.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
          <span className="muted" style={{ fontSize: 12 }}>
            Lab values come from one simulated Lighthouse run and vary between runs; field values come from real
            Chrome users over 28 days. Fixes the connector can apply without code (caching, compression) are under
            Feedback → Performance.
          </span>
        </div>
      </div>

      {recommendations.length === 0 ? (
        <div className="card empty-state">
          <h3>No source-code changes recommended</h3>
          <p className="muted">
            {assessments.length === 0
              ? 'No PageSpeed assessment has been recorded yet. Use “Assess now” to measure the home page on mobile and desktop.'
              : 'The latest PageSpeed assessments found nothing that needs a code change for this selection.'}
          </p>
        </div>
      ) : recommendations.map((r) => (
        <div className="card" key={r.auditId}>
          <div className="section-header">
            <div>
              <div className="eyebrow">{`${r.categoryLabel} · ${r.source === 'field' ? 'real users' : 'lab'} · ${r.confidence} confidence`}</div>
              <h2>{r.title}</h2>
            </div>
            <button className="button secondary" onClick={() => void copy(r)}>
              <Copy size={16} /> Copy as task
            </button>
          </div>
          <p><strong>Change: </strong>{r.recommendedAction}</p>
          {WHERE_TO_FIX[r.category] && <p className="muted"><strong>Where: </strong>{WHERE_TO_FIX[r.category]}</p>}
          <p className="muted"><strong>Why: </strong>{r.hypothesis}</p>
          {(r.savingsMs > 0 || r.savingsBytes > 0) && (
            <p className="muted">
              {`Estimated savings: ${r.savingsMs > 0 ? `${Math.round(r.savingsMs)} ms` : ''}`}
              {r.savingsMs > 0 && r.savingsBytes > 0 ? ', ' : ''}
              {r.savingsBytes > 0 ? `${Math.round(r.savingsBytes / 1024)} KiB` : ''}
              {' (PageSpeed estimate, not a guarantee)'}
            </p>
          )}
          <div className="table-wrap">
            <table>
              <thead><tr><th>Page</th><th>Device</th><th>Measured</th></tr></thead>
              <tbody>
                {r.pages.map((p) => (
                  <tr key={`${p.url}|${p.strategy}`}>
                    <td>{p.url}</td><td>{p.strategy}</td><td>{p.observed ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {r.resources.length > 0 && (
            <details>
              <summary className="muted">{`${r.resources.length} resource(s) or element(s) named by PageSpeed`}</summary>
              <ul>
                {r.resources.slice(0, 15).map((x) => (
                  <li key={x.label} style={{ fontSize: 12, wordBreak: 'break-all' }}>
                    <code>{x.label}</code>{x.detail ? ` · ${x.detail}` : ''}{x.party === 'third' ? ' · third party' : ''}
                  </li>
                ))}
              </ul>
            </details>
          )}
          {r.verification && <p className="muted" style={{ fontSize: 12 }}>{`Done when: ${r.verification}.`}</p>}
          {r.uncertainty && <p className="muted" style={{ fontSize: 12 }}>{r.uncertainty}</p>}
        </div>
      ))}

      {scores.length > 0 && (
        <>
          <div className="section-header">
            <div>
              <div className="eyebrow">Latest measurements</div>
              <h2>Scores by page and device</h2>
            </div>
          </div>
          <div className="card table-card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Page</th><th>Device</th><th>Score</th><th>LCP</th><th>CLS</th><th>TBT</th><th>TTFB</th><th>Field data</th><th>Measured</th></tr>
                </thead>
                <tbody>
                  {scores.map((s) => (
                    <tr key={s.id}>
                      <td>{s.url}</td>
                      <td>{s.strategy}</td>
                      <td>{scoreText(s.lab?.performance)}</td>
                      <td>{typeof s.lab?.lcp_ms === 'number' ? `${(s.lab.lcp_ms / 1000).toFixed(1)} s` : '—'}</td>
                      <td>{typeof s.lab?.cls === 'number' ? s.lab.cls.toFixed(3) : '—'}</td>
                      <td>{typeof s.lab?.tbt_ms === 'number' ? `${Math.round(s.lab.tbt_ms)} ms` : '—'}</td>
                      <td>{typeof s.lab?.ttfb_ms === 'number' ? `${Math.round(s.lab.ttfb_ms)} ms` : '—'}</td>
                      <td>{s.field?.category ?? 'not enough traffic'}</td>
                      <td>{new Date(s.measured_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
