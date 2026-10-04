import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronUp, ChevronDown, Minus, RefreshCw,
} from 'lucide-react';
import {
  getVisibilityOverview,
  getVisibilityPublished,
  getVisibilityGaps,
  getVisibilitySearchPerformance,
} from '../../api/dashboard';
import { listWebsites } from '../../api/websites';
import type {
  VisibilityOverview,
  VisibilityPublishedItem,
  VisibilityGapItem,
  VisibilitySearchPerformanceResponse,
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
  if (loading) {
    return (
      <Card className="p-5">
        <Skeleton className="h-4 w-48 mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      </Card>
    );
  }

  const openGaps = gaps.filter(g => g.status !== 'resolved');

  if (!openGaps.length) {
    return (
      <Card className="p-5">
        <p className="text-sm font-bold mb-1" style={{ color: 'var(--text)' }}>
          What the engine is working on next
        </p>
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>
          All gaps resolved — the engine will monitor for new opportunities.
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
          {openGaps.slice(0, 5).map((g, i) => (
            <tr
              key={g.id}
              style={{ borderTop: i === 0 ? undefined : '1px solid var(--border-subtle)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              <td className="py-3 px-5 text-sm font-medium truncate max-w-xs" style={{ color: 'var(--text)' }}>
                {g.title}
              </td>
              <td className="py-3 px-5 text-sm" style={{ color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                Gap score:{' '}
                <span style={{ color: 'var(--text-2)', fontWeight: 600 }}>
                  {g.gap_score != null ? `${(g.gap_score * 100).toFixed(0)}%` : '—'}
                </span>
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

// ─── Published content ────────────────────────────────────────────────────────

function PublishedList({ items, loading }: { items: VisibilityPublishedItem[]; loading: boolean }) {
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

  if (!items.length) {
    return (
      <EmptyCard
        title="No published content yet"
        body="Published content will appear here after approved execution jobs are delivered to the connected product."
      />
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>
          Published content
          <span className="ml-2 text-xs font-medium" style={{ color: 'var(--text-3)' }}>
            {items.length} item{items.length !== 1 ? 's' : ''}
          </span>
        </p>
      </div>
      <table className="w-full">
        <tbody>
          {items.slice(0, 8).map((it, i) => {
            const label = it.target_title ?? it.primary_query ?? it.topic ?? it.id;

            return (
              <tr
                key={it.id}
                style={{ borderTop: i === 0 ? undefined : '1px solid var(--border-subtle)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                onMouseLeave={e => (e.currentTarget.style.background = '')}
              >
                <td className="py-3 px-5 text-sm font-medium truncate max-w-xs" style={{ color: 'var(--text)' }}>
                  {it.published_url ? (
                    <a
                      href={it.published_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'inherit', textDecoration: 'none' }}
                    >
                      {label}
                    </a>
                  ) : (
                    label
                  )}
                </td>
                <td
                  className="py-3 px-5 text-xs text-right"
                  style={{ color: 'var(--text-3)', whiteSpace: 'nowrap' }}
                >
                  {it.published_at
                    ? new Date(it.published_at).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                      })
                    : '—'}
                </td>
                <td
                  className="py-3 px-5 text-xs text-right"
                  style={{ color: 'var(--text-3)', whiteSpace: 'nowrap' }}
                >
                  {it.action_type}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}

// ─── Search performance ───────────────────────────────────────────────────────

function RankingsPanel({
  performance,
  loading,
}: {
  performance: VisibilitySearchPerformanceResponse | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <Card className="p-5">
        <Skeleton className="h-4 w-48 mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
      </Card>
    );
  }

  const bands = performance?.search_performance ?? [];

  if (!bands.length) {
    return (
      <EmptyCard
        title="No search performance yet"
        body="Search measurements will appear after the engine records ranking observations."
      />
    );
  }

  const total = bands.reduce((sum, band) => sum + band.measurement_count, 0);
  const improved = bands.reduce((sum, band) => sum + band.improved, 0);
  const declined = bands.reduce((sum, band) => sum + band.declined, 0);

  return (
    <Card className="overflow-hidden">
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>
          Search performance
        </p>
        <span className="text-xs font-semibold" style={{ color: 'var(--text-3)' }}>
          {total} measurements
        </span>
      </div>
      <table className="w-full">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <th
              className="py-2 px-5 text-left text-xs font-bold uppercase"
              style={{ color: 'var(--text-3)', letterSpacing: '0.05em' }}
            >
              Rank band
            </th>
            <th
              className="py-2 px-5 text-right text-xs font-bold uppercase"
              style={{ color: 'var(--text-3)', letterSpacing: '0.05em' }}
            >
              Measurements
            </th>
            <th
              className="py-2 px-5 text-right text-xs font-bold uppercase"
              style={{ color: 'var(--text-3)', letterSpacing: '0.05em' }}
            >
              Avg position
            </th>
          </tr>
        </thead>
        <tbody>
          {bands.map((band, i) => (
            <tr
              key={band.rank_band}
              style={{ borderTop: i === 0 ? undefined : '1px solid var(--border-subtle)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              <td className="py-2.5 px-5 text-sm" style={{ color: 'var(--text)' }}>
                {band.rank_band}
              </td>
              <td className="py-2.5 px-5 text-sm text-right tabular-nums" style={{ color: 'var(--text-2)' }}>
                {band.measurement_count}
              </td>
              <td className="py-2.5 px-5 text-sm font-bold text-right tabular-nums" style={{ color: 'var(--text)' }}>
                {band.avg_position != null ? `#${band.avg_position.toFixed(1)}` : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div
        className="px-5 py-3 text-xs"
        style={{
          borderTop: '1px solid var(--border)',
          color: 'var(--text-3)',
          fontFamily: 'ui-monospace, monospace',
        }}
      >
        {improved} improved · {declined} declined
      </div>
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
        Connect a website to start crawling, intelligence analysis, content execution,
        publication and performance feedback.
      </p>
      <Link
        to="/websites/connect"
        className="inline-block px-5 py-3 rounded text-sm font-bold transition-colors"
        style={{ background: 'var(--brand)', color: '#111' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--brand-light)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'var(--brand)')}
      >
        Connect website
      </Link>
    </Card>
  );
}

// ─── Root Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [website, setWebsite] = useState<{
    id: string;
    url: string;
    domain: string;
  } | null>(null);

  const [overview, setOverview] = useState<VisibilityOverview | null>(null);
  const [published, setPublished] = useState<VisibilityPublishedItem[]>([]);
  const [gaps, setGaps] = useState<VisibilityGapItem[]>([]);
  const [searchPerformance, setSearchPerformance] =
    useState<VisibilitySearchPerformanceResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);

    const websites = await listWebsites();

    if (!websites.length) {
      setWebsite(null);
      setOverview(null);
      setPublished([]);
      setGaps([]);
      setSearchPerformance(null);
      setLastUpdated(new Date());
      return;
    }

    const currentWebsite = websites[0];

    setWebsite({
      id: currentWebsite.id,
      url: currentWebsite.url,
      domain: currentWebsite.domain,
    });

    const [ov, pub, g, sp] = await Promise.all([
      getVisibilityOverview(currentWebsite.id),
      getVisibilityPublished(currentWebsite.id, { page: 1, page_size: 20 }),
      getVisibilityGaps(currentWebsite.id, 20),
      getVisibilitySearchPerformance(currentWebsite.id),
    ]);

    setOverview(ov);
    setPublished(pub.items);
    setGaps(g);
    setSearchPerformance(sp);
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchAll()
      .catch((err) => {
        console.error('Dashboard load failed:', err);
        setError('Unable to load dashboard data.');
      })
      .finally(() => setLoading(false));
  }, [fetchAll]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchAll();
    } catch (err) {
      console.error('Dashboard refresh failed:', err);
      setError('Unable to refresh dashboard data.');
    } finally {
      setRefreshing(false);
    }
  }, [fetchAll]);

  const intelligence = overview?.intelligence;
  const content = overview?.content;
  const pipeline = overview?.pipeline;
  const feedback = overview?.feedback;
  const publishedThisWeek = content?.published_this_week ?? 0;
  const openGaps = intelligence?.gaps_open ?? 0;
  const hasWebsite = !!website;
    const noData = !loading && !hasWebsite;

  const recentPublished = published.slice(0, 8);

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
      <PageHeader
        lastUpdated={lastUpdated}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="px-7 py-6 space-y-7">

          {error && (
            <Card className="p-4">
              <p className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>
                {error}
              </p>
            </Card>
          )}

          {noData && (
            <FirstRunBanner />
          )}

          {!loading && website && (
            <div
              className="flex items-center gap-3 px-4 py-2.5 text-xs rounded"
              style={{
                background: 'rgba(34,197,94,0.06)',
                border: '1px solid rgba(34,197,94,0.2)',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: 'var(--success)' }}
              />
              <span
                style={{
                  color: 'var(--success)',
                  fontWeight: 600,
                  fontFamily: 'ui-monospace, monospace',
                }}
              >
                {overview?.website.status ?? 'Connected'}
              </span>
              <a
                href={website.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1"
                style={{
                  color: 'var(--text-3)',
                  textDecoration: 'none',
                  fontFamily: 'ui-monospace, monospace',
                }}
              >
                {website.domain}
              </a>
              {overview?.website.last_crawled_at && (
                <span
                  style={{
                    color: 'var(--text-3)',
                    marginLeft: 'auto',
                  }}
                >
                  Last crawled{' '}
                  {new Date(overview.website.last_crawled_at).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">

            <StatCard
              label="Published this week"
              value={loading ? '—' : publishedThisWeek}
              loading={loading}
            />

            <StatCard
              label="Search measurements"
              value={loading ? '—' : feedback?.total_measurements ?? 0}
              loading={loading}
            />

            <StatCard
              label="Avg position"
              value={
                loading
                  ? '—'
                  : feedback?.avg_position != null
                    ? feedback.avg_position.toFixed(1)
                    : '—'
              }
              loading={loading}
            />

            <StatCard
              label="Open gaps"
              value={loading ? '—' : openGaps}
loading={loading}
            />
          </div>

          {(hasWebsite || overview || loading) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

              <Card className="p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span
                    className="text-sm font-bold"
                    style={{ color: 'var(--text)' }}
                  >
                    Pipeline health
                  </span>

                  {loading ? (
                    <Skeleton className="h-5 w-20" />
                  ) : (
                    <StatusPill
                      status={
                        pipeline?.state ??
                        overview?.website.status ??
                        'pending'
                      }
                    />
                  )}
                </div>
{overview && !loading && (
                  <div
                    className="pt-3 grid grid-cols-3 gap-2 text-xs"
                    style={{
                      borderTop: '1px solid var(--border)',
                      fontFamily: 'ui-monospace, monospace',
                    }}
                  >
                    <div>
                      <span style={{ color: 'var(--text-3)' }}>Gaps</span>
                      <div style={{ color: 'var(--text)' }}>
                        {intelligence?.gaps_total ?? 0}
                      </div>
                    </div>

                    <div>
                      <span style={{ color: 'var(--text-3)' }}>Strategies</span>
                      <div style={{ color: 'var(--text)' }}>
                        {content?.strategies_total ?? 0}
                      </div>
                    </div>

                    <div>
                      <span style={{ color: 'var(--text-3)' }}>Executions</span>
                      <div style={{ color: 'var(--text)' }}>
                        {content?.executions_total ?? 0}
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              <Card className="p-5 flex flex-col gap-3">
                <span
                  className="text-sm font-bold"
                  style={{ color: 'var(--text)' }}
                >
                  Content execution
                </span>

                <div className="flex items-baseline gap-2">
                  <span
                    className="text-[40px] font-bold leading-none tabular-nums"
                    style={{ color: 'var(--text)' }}
                  >
                    {loading ? '—' : content?.executions_total ?? 0}
                  </span>
                  <span
                    className="text-base"
                    style={{ color: 'var(--text-3)' }}
                  >
                    total
                  </span>
                </div>

                {!loading && content && (
                  <div
                    className="flex flex-wrap gap-4 text-xs"
                    style={{ fontFamily: 'ui-monospace, monospace' }}
                  >
                    <span style={{ color: 'var(--warning)' }}>
                      {content.awaiting_approval} awaiting approval
                    </span>
                    <span style={{ color: 'var(--success)' }}>
                      {content.approved} approved
                    </span>
                    <span style={{ color: 'var(--danger)' }}>
                      {content.failed} failed
                    </span>
                  </div>
                )}

                {!loading && (
                  <div
                    className="mt-auto pt-3"
                    style={{ borderTop: '1px solid var(--border)' }}
                  >
                    <span
                      className="text-xs"
                      style={{ color: 'var(--text-3)' }}
                    >
                      {content?.awaiting_publication ?? 0} awaiting publication ·{' '}
                      {content?.published ?? 0} published
                    </span>
                  </div>
                )}
              </Card>
            </div>
          )}

          <RankingsPanel
            performance={searchPerformance}
            loading={loading}
          />

          <PublishedList
            items={recentPublished}
            loading={loading}
          />

          <NextActions
            gaps={gaps}
            loading={loading}
          />

        </div>
      </div>
    </div>
  );
}
