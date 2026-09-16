import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronUp, ChevronDown, Minus, RefreshCw,
} from 'lucide-react';
import {
  getVisibilityOverview,
  getVisibilityPublished,
  getVisibilityGaps,
  getVisibilityQualityScores,
} from '../../api/dashboard';
import { getRankings } from '../../api/seo';
import type {
  VisibilityOverview,
  VisibilityPublishedItem,
  VisibilityGapItem,
  VisibilityQualityScore,
  RankSnapshot,
} from '../../types';

// ─── Primitives ───────────────────────────────────────────────────────────────

function Card({ children, className = '', style = {} }: {
  children: React.ReactNode; className?: string; style?: React.CSSProperties;
}) {
  return (
    <div
      className={className}
      style={{
        background:   'var(--surface)',
        border:       '1px solid var(--border)',
        borderRadius: 6,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse ${className}`}
      style={{ background: 'var(--surface-2)', borderRadius: 4 }}
    />
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, delta, loading }: {
  label: string; value: string | number; sub?: string; delta?: number; loading?: boolean;
}) {
  const up   = delta !== undefined && delta > 0;
  const down = delta !== undefined && delta < 0;

  if (loading) {
    return (
      <Card className="p-5 flex flex-col gap-3">
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-3 w-14" />
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="mb-3">
        <span
          className="text-xs font-bold uppercase"
          style={{ color: 'var(--text-3)', letterSpacing: '0.06em' }}
        >
          {label}
        </span>
      </div>
      <div
        className="text-[28px] font-bold leading-none tabular-nums"
        style={{ color: 'var(--text)' }}
      >
        {value}
      </div>
      {(sub || delta !== undefined) && (
        <div className="flex items-center gap-2 mt-2">
          {delta !== undefined && (
            <span
              className="flex items-center gap-0.5 text-sm font-semibold tabular-nums"
              style={{ color: up ? 'var(--success)' : down ? 'var(--danger)' : 'var(--text-3)' }}
            >
              {up ? <ChevronUp size={12} /> : down ? <ChevronDown size={12} /> : <Minus size={12} />}
              {Math.abs(delta)}%
            </span>
          )}
          {sub && (
            <span className="text-sm" style={{ color: 'var(--text-3)' }}>{sub}</span>
          )}
        </div>
      )}
    </Card>
  );
}

// ─── Score bar ────────────────────────────────────────────────────────────────

function ScoreBar({ label, score, loading }: {
  label: string; score: number; loading?: boolean;
}) {
  const pct   = Math.min(100, Math.max(0, score));
  const color =
    pct >= 80 ? 'var(--success)' :
    pct >= 60 ? 'var(--info)'    :
    pct >= 40 ? 'var(--warning)' :
               'var(--danger)';

  if (loading) return <Skeleton className="h-8 w-full" />;

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm w-28 flex-shrink-0" style={{ color: 'var(--text-2)' }}>{label}</span>
      <div className="flex-1 h-2 overflow-hidden" style={{ background: 'var(--surface-2)', borderRadius: 2 }}>
        <div className="h-full transition-all duration-700" style={{ width: `${pct}%`, background: color, borderRadius: 2 }} />
      </div>
      <span className="text-sm font-bold tabular-nums w-10 text-right" style={{ color }}>{pct.toFixed(0)}</span>
    </div>
  );
}

// ─── Status pill ──────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    live:          'var(--success)',
    connected:     'var(--success)',
    configuring:   'var(--warning)',
    not_installed: 'var(--text-3)',
    disconnected:  'var(--danger)',
    failed:        'var(--danger)',
    error:         'var(--danger)',
    pending:       'var(--text-3)',
    drafts_ready:  'var(--info)',
    resolved:      'var(--success)',
  };
  const color = map[status] ?? 'var(--text-3)';
  const label = status.replace(/_/g, ' ');

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-xs font-bold capitalize"
      style={{
        color,
        background: `color-mix(in srgb, ${color} 10%, transparent)`,
        border:     `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
        borderRadius: 4,
      }}
    >
      {label}
    </span>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyCard({ title, body, cta, to }: {
  title: string; body: string; cta?: string; to?: string;
}) {
  return (
    <Card className="p-6 text-center">
      <p className="text-sm font-bold mb-1" style={{ color: 'var(--text)' }}>{title}</p>
      <p className="text-sm mb-4" style={{ color: 'var(--text-3)', lineHeight: 1.6 }}>{body}</p>
      {cta && to && (
        <Link
          to={to}
          className="inline-flex px-4 py-2 text-sm font-bold rounded transition-colors"
          style={{ background: 'var(--brand)', color: '#111' }}
        >
          {cta}
        </Link>
      )}
    </Card>
  );
}

// ─── Page header ──────────────────────────────────────────────────────────────

function PageHeader({ lastUpdated, onRefresh, refreshing }: {
  lastUpdated: Date; onRefresh: () => void; refreshing: boolean;
}) {
  const date = lastUpdated.toLocaleString([], {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <header
      className="flex items-center justify-between px-7 py-4 flex-shrink-0"
      style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
    >
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text)', letterSpacing: '-0.01em' }}>
          Dashboard
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
          Last updated {date}
        </p>
      </div>

      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded transition-colors disabled:opacity-40"
        style={{ background: 'var(--brand)', color: '#111' }}
        onMouseEnter={e => { if (!refreshing) e.currentTarget.style.background = 'var(--brand-light)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--brand)'; }}
      >
        <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
        {refreshing ? 'Refreshing…' : 'Refresh'}
      </button>
    </header>
  );
}

// ─── What the engine is working on next ───────────────────────────────────────

function NextActions({ gaps, loading }: { gaps: VisibilityGapItem[]; loading: boolean }) {
  const pending = gaps.filter(g => g.status === 'pending' || g.status === 'drafts_ready');

  if (loading) {
    return (
      <Card className="p-5">
        <Skeleton className="h-4 w-40 mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      </Card>
    );
  }

  if (!pending.length) {
    return (
      <Card className="p-5">
        <p className="text-sm font-bold mb-1" style={{ color: 'var(--text)' }}>
          What the engine is working on next
        </p>
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>
          All gaps resolved — the engine will monitor for new content.
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>
          What the engine is working on next
        </p>
      </div>
      <table className="w-full">
        <tbody>
          {pending.slice(0, 5).map((g, i) => (
            <tr
              key={g.document_id}
              style={{
                borderTop: i === 0 ? undefined : '1px solid var(--border-subtle)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              <td className="py-3 px-5 text-sm font-medium truncate max-w-xs" style={{ color: 'var(--text)' }}>
                {g.title}
              </td>
              <td className="py-3 px-5 text-sm" style={{ color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                Gap score: <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>{(g.gap_score * 100).toFixed(0)}%</span>
              </td>
              <td className="py-3 px-5 text-right" style={{ whiteSpace: 'nowrap' }}>
                <StatusPill status={g.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

// ─── Published this week ──────────────────────────────────────────────────────

function PublishedList({ items, loading }: { items: VisibilityPublishedItem[]; loading: boolean }) {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = items.filter(it => new Date(it.published_at).getTime() > cutoff);

  if (loading) {
    return (
      <Card className="p-5">
        <Skeleton className="h-4 w-40 mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      </Card>
    );
  }

  if (!recent.length) {
    return (
      <EmptyCard
        title="No content published this week"
        body="The engine publishes optimised content automatically once a crawl completes."
      />
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>
          Content published this week
          <span className="ml-2 text-xs font-medium" style={{ color: 'var(--text-3)' }}>
            {recent.length} item{recent.length !== 1 ? 's' : ''}
          </span>
        </p>
      </div>
      <table className="w-full">
        <tbody>
          {recent.slice(0, 6).map((it, i) => (
            <tr
              key={it.document_id}
              style={{ borderTop: i === 0 ? undefined : '1px solid var(--border-subtle)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              <td className="py-3 px-5 text-sm font-medium truncate max-w-xs" style={{ color: 'var(--text)' }}>
                {it.url ? (
                  <a href={it.url} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                    {it.title}
                  </a>
                ) : it.title}
              </td>
              <td className="py-3 px-5 text-sm text-right tabular-nums" style={{ color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                {new Date(it.published_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </td>
              {it.quality_score != null && (
                <td className="py-3 px-5 text-right">
                  <span
                    className="text-xs font-bold tabular-nums"
                    style={{ color: it.quality_score >= 8 ? 'var(--success)' : it.quality_score >= 6 ? 'var(--warning)' : 'var(--danger)' }}
                  >
                    QS {it.quality_score.toFixed(1)}
                  </span>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

// ─── Quality scores ───────────────────────────────────────────────────────────

function QualityList({ scores, loading }: { scores: VisibilityQualityScore[]; loading: boolean }) {
  if (loading) {
    return (
      <Card className="p-5">
        <Skeleton className="h-4 w-40 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-6 w-full" />)}
        </div>
      </Card>
    );
  }

  if (!scores.length) {
    return (
      <EmptyCard
        title="No quality scores yet"
        body="Quality scores appear after the engine processes your first piece of content."
      />
    );
  }

  const avg = scores.reduce((s, x) => s + x.quality_score, 0) / scores.length;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>Quality scores</p>
        <span
          className="text-sm font-bold tabular-nums"
          style={{ color: avg >= 8 ? 'var(--success)' : avg >= 6 ? 'var(--warning)' : 'var(--danger)' }}
        >
          avg {avg.toFixed(1)}/10
        </span>
      </div>
      <div className="p-5 space-y-3">
        {scores.slice(0, 6).map(s => (
          <div key={s.document_id} className="flex items-center gap-3">
            <span className="text-sm truncate flex-1" style={{ color: 'var(--text-2)' }}>{s.title}</span>
            <div
              className="h-1.5 w-20 flex-shrink-0 overflow-hidden"
              style={{ background: 'var(--surface-2)', borderRadius: 2 }}
            >
              <div
                className="h-full"
                style={{
                  width: `${s.quality_score * 10}%`,
                  background: s.beats_paid_ads ? 'var(--success)' : s.quality_score >= 6 ? 'var(--warning)' : 'var(--danger)',
                  borderRadius: 2,
                  transition: 'width 0.7s',
                }}
              />
            </div>
            <span
              className="text-xs font-bold tabular-nums w-10 text-right flex-shrink-0"
              style={{ color: s.beats_paid_ads ? 'var(--success)' : s.quality_score >= 6 ? 'var(--warning)' : 'var(--danger)' }}
            >
              {s.quality_score.toFixed(1)}/10
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Rankings ─────────────────────────────────────────────────────────────────

function RankingsPanel({ rankings, loading }: { rankings: RankSnapshot[]; loading: boolean }) {
  if (loading) {
    return (
      <Card className="p-5">
        <Skeleton className="h-4 w-40 mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
      </Card>
    );
  }

  const rank1 = rankings.filter(r => r.position === 1).length;

  if (!rankings.length) {
    return (
      <EmptyCard
        title="No keyword rankings yet"
        body="Rankings are tracked once content is published and indexed by search engines."
      />
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>Keyword rankings</p>
        <span className="text-xs font-semibold" style={{ color: 'var(--text-3)' }}>
          {rank1} ranking #1
        </span>
      </div>
      <table className="w-full">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <th className="py-2 px-5 text-left text-xs font-bold uppercase" style={{ color: 'var(--text-3)', letterSpacing: '0.05em' }}>Keyword</th>
            <th className="py-2 px-5 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-3)', letterSpacing: '0.05em' }}>Position</th>
          </tr>
        </thead>
        <tbody>
          {rankings.slice(0, 8).map((r, i) => (
            <tr
              key={`${r.keyword}-${i}`}
              style={{ borderTop: i === 0 ? undefined : '1px solid var(--border-subtle)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              <td className="py-2.5 px-5 text-sm" style={{ color: 'var(--text)' }}>{r.keyword}</td>
              <td
                className="py-2.5 px-5 text-sm font-bold text-right tabular-nums"
                style={{ color: r.position <= 3 ? 'var(--success)' : r.position <= 10 ? 'var(--warning)' : 'var(--text-3)' }}
              >
                #{r.position}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

// ─── First-run empty state ────────────────────────────────────────────────────

function FirstRunBanner() {
  return (
    <Card className="p-8">
      <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text)' }}>
        Welcome to Data Engine
      </h2>
      <p className="text-sm mb-6" style={{ color: 'var(--text-2)', lineHeight: 1.7, maxWidth: 520 }}>
        Your account is ready. Connect your product to start the first crawl —
        keywords, content scores and traffic insights will appear here automatically.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          to="/connect"
          className="px-5 py-3 rounded text-sm font-bold transition-colors"
          style={{ background: 'var(--brand)', color: '#111' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--brand-light)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--brand)')}
        >
          Connect your product
        </Link>
        <Link
          to="/credentials"
          className="px-5 py-3 rounded text-sm font-bold transition-colors"
          style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-2)')}
        >
          Manage API Keys
        </Link>
      </div>
    </Card>
  );
}

// ─── Root Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [overview,  setOverview]  = useState<VisibilityOverview | null>(null);
  const [published, setPublished] = useState<VisibilityPublishedItem[]>([]);
  const [gaps,      setGaps]      = useState<VisibilityGapItem[]>([]);
  const [scores,    setScores]    = useState<VisibilityQualityScore[]>([]);
  const [rankings,  setRankings]  = useState<RankSnapshot[]>([]);

  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchAll = useCallback(async () => {
    const [ov, pub, g, sc] = await Promise.allSettled([
      getVisibilityOverview(),
      getVisibilityPublished({ page: 1, page_size: 20 }),
      getVisibilityGaps(),
      getVisibilityQualityScores(),
    ]);

    if (ov.status  === 'fulfilled') setOverview(ov.value);
    if (pub.status === 'fulfilled') setPublished(pub.value);
    if (g.status   === 'fulfilled') setGaps(g.value);
    if (sc.status  === 'fulfilled') setScores(sc.value);

    // Attempt rankings using domain from overview
    if (ov.status === 'fulfilled' && ov.value?.platform_type) {
      const domain =
        (ov.value['website_url'] as string | undefined)?.replace(/^https?:\/\//, '').split('/')[0]
        ?? import.meta.env.VITE_DEFAULT_DOMAIN ?? '';
      if (domain) {
        getRankings(domain, '', 30).then(setRankings).catch(() => {});
      }
    }

    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  // Derived
  const injectionStatus = overview?.injection_status;
  const isConnected     = injectionStatus === 'live' || injectionStatus === 'configuring';
  const noData          = !loading && !overview;

  const publishedCount  = overview?.published_count ?? 0;
  const openGaps        = overview?.open_gaps ?? 0;
  const coveragePct     = overview?.coverage_pct ?? 0;
  const crawlProgress   = overview?.crawl_progress ?? 0;
  const rank1Count      = rankings.filter(r => r.position === 1).length;
  const avgQuality      = scores.length
    ? scores.reduce((s, x) => s + x.quality_score, 0) / scores.length
    : null;
  const avgCoverage     = scores.length
    ? scores.reduce((s, x) => s + (x['coverage_pct'] as number ?? 0), 0) / scores.length
    : null;

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <PageHeader lastUpdated={lastUpdated} onRefresh={handleRefresh} refreshing={refreshing} />

      <div className="flex-1 overflow-y-auto">
        <div className="px-7 py-6 space-y-7">

          {/* ── First-run banner ── */}
          {noData && <FirstRunBanner />}

          {/* ── KPI strip ── */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard
              label="Keywords #1"
              value={loading ? '—' : rank1Count}
              sub={rankings.length ? `of ${rankings.length} tracked` : undefined}
              loading={loading}
            />
            <StatCard
              label="Published this week"
              value={loading ? '—' : published.filter(p => new Date(p.published_at).getTime() > Date.now() - 7 * 24 * 3600 * 1000).length}
              loading={loading}
            />
            <StatCard
              label="AI citations"
              value={loading ? '—' : (overview?.['ai_citation_count'] as number | undefined) ?? '—'}
              loading={loading}
            />
            <StatCard
              label="Traffic growth"
              value={loading ? '—' : (overview?.['traffic_growth_pct'] as number | undefined) != null ? `${(overview!['traffic_growth_pct'] as number).toFixed(0)}%` : '—'}
              delta={(overview?.['traffic_growth_pct'] as number | undefined)}
              loading={loading}
            />
            <StatCard
              label="Avg quality"
              value={avgQuality != null ? `${avgQuality.toFixed(1)}/10` : '—'}
              loading={loading}
            />
            <StatCard
              label="Open gaps"
              value={loading ? '—' : openGaps}
              sub={openGaps === 0 && !loading ? 'All resolved' : undefined}
              loading={loading}
            />
          </div>

          {/* ── Engine status + scores ── */}
          {(isConnected || loading) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Bridge status */}
              <Card className="p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>Engine status</span>
                  {loading
                    ? <Skeleton className="h-5 w-16" />
                    : <StatusPill status={injectionStatus ?? 'unknown'} />
                  }
                </div>
                <div className="space-y-3">
                  <ScoreBar label="Coverage"     score={coveragePct}  loading={loading} />
                  <ScoreBar label="Crawl progress" score={crawlProgress} loading={loading} />
                  <ScoreBar label="Avg quality"   score={avgQuality != null ? avgQuality * 10 : 0} loading={loading} />
                  <ScoreBar label="Gap closure"   score={avgCoverage != null ? avgCoverage * 100 : 0} loading={loading} />
                </div>
              </Card>

              {/* Published */}
              <Card className="p-5 flex flex-col gap-3">
                <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>Content published</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-[40px] font-bold leading-none tabular-nums" style={{ color: 'var(--text)' }}>
                    {loading ? '—' : publishedCount}
                  </span>
                  <span className="text-base" style={{ color: 'var(--text-3)' }}>total items</span>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                  {loading ? '' : `${published.filter(p => new Date(p.published_at).getTime() > Date.now() - 7 * 24 * 3600 * 1000).length} published in the last 7 days`}
                </p>
                {!loading && (
                  <div className="mt-auto pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                    <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                      {overview?.last_crawled_at
                        ? `Last crawled ${new Date(overview.last_crawled_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}`
                        : 'Crawl not yet run'}
                    </span>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* ── Rankings ── */}
          <RankingsPanel rankings={rankings} loading={loading} />

          {/* ── Published this week list ── */}
          <PublishedList items={published} loading={loading} />

          {/* ── Quality scores ── */}
          <QualityList scores={scores} loading={loading} />

          {/* ── What the engine is working on next ── */}
          <NextActions gaps={gaps} loading={loading} />

        </div>
      </div>
    </div>
  );
}
