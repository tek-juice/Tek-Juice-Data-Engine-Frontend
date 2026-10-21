import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Globe,
  Loader2,
  Minus,
  RefreshCw,
  Search,
  Shield,
  Target,
  Zap,
} from 'lucide-react';
import {
  getVisibilityGaps,
  getVisibilityOverview,
  getVisibilityPublished,
  getVisibilitySearchPerformance,
  getSearchResults,
  type SearchResults,
} from '../../api/dashboard';
import { listWebsites } from '../../api/websites';
import { useIntelligenceRun } from '../../contexts/IntelligenceRunContext';
import { rangeText } from '../Feedback/SearchResults';
import type {
  VisibilityGapItem,
  VisibilityOverview,
  VisibilityPublishedItem,
  VisibilitySearchPerformanceResponse,
} from '../../types';

function relTime(iso: string | null | undefined) {
  if (!iso) return 'Never';

  const diff = Date.now() - new Date(iso).getTime();

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

  return `${Math.floor(diff / 86400000)}d ago`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';

  return new Date(iso).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function statusColor(status: string) {
  const value = status.toLowerCase();

  if (
    value.includes('published') ||
    value.includes('complete') ||
    value.includes('success') ||
    value.includes('approved') ||
    value === 'open'
  ) {
    return 'var(--success)';
  }

  if (
    value.includes('failed') ||
    value.includes('error') ||
    value.includes('rejected')
  ) {
    return 'var(--danger)';
  }

  if (
    value.includes('running') ||
    value.includes('processing') ||
    value.includes('pending') ||
    value.includes('awaiting')
  ) {
    return 'var(--warning)';
  }

  return 'var(--text-3)';
}

/** Google Search Console totals for the last 28 days (observed, matches the Search Console UI). */
function GoogleSearchKpis({ websiteId }: { websiteId: string }) {
  const [results, setResults] = useState<SearchResults | null>(null);
  useEffect(() => {
    getSearchResults(websiteId).then(setResults).catch(() => setResults(null));
  }, [websiteId]);
  if (!results) return null;
  if (results.status !== 'measured') {
    return (
      <div className="p-4 text-sm" style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>
        Google Search Console: {results.reason}.
      </div>
    );
  }
  const t = results.last_28_days;
  return (
    <div className="space-y-2">
      <div className="text-xs uppercase font-semibold tracking-widest" style={{ color: 'var(--text-3)' }}>
        Google Search · last 28 days ({rangeText(t)}) · Search Console
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <OverviewKpi label="Google clicks" value={formatNumber(t.clicks)} icon={<Activity size={16} />} color="var(--success)" />
        <OverviewKpi label="Impressions" value={formatNumber(t.impressions)} icon={<Globe size={16} />} color="var(--info)" />
        <OverviewKpi label="CTR" value={t.ctr === null ? '—' : `${(t.ctr * 100).toFixed(1)}%`} icon={<Target size={16} />} />
        <OverviewKpi label="Avg Google position" value={t.average_position === null ? '—' : t.average_position.toFixed(1)}
          icon={<Search size={16} />} color="var(--info)" />
      </div>
    </div>
  );
}

function OverviewKpi({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
}) {
  return (
    <div
      className="min-h-36 p-5 flex flex-col justify-between"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className="text-xs uppercase font-semibold tracking-widest"
          style={{ color: 'var(--text-3)' }}
        >
          {label}
        </span>

        <span
          className="flex items-center justify-center w-8 h-8"
          style={{
            color: color || 'var(--text-2)',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
          }}
        >
          {icon}
        </span>
      </div>

      <div
        className="text-4xl md:text-5xl font-semibold tracking-tight leading-none"
        style={{
          color: color || 'var(--text)',
          fontFamily: 'ui-monospace, monospace',
        }}
      >
        {value}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  delta,
  icon,
  color,
  sub,
}: {
  label: string;
  value: string | number;
  delta?: number;
  icon: React.ReactNode;
  color?: string;
  sub?: string;
}) {
  const up = delta !== undefined && delta > 0;
  const down = delta !== undefined && delta < 0;

  return (
    <div
      className="p-4 flex flex-col gap-2"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-xs uppercase font-medium tracking-wide"
          style={{ color: 'var(--text-3)' }}
        >
          {label}
        </span>

        <span style={{ color: 'var(--text-3)' }}>{icon}</span>
      </div>

      <div>
        <div
          className="text-2xl font-semibold tabular-nums"
          style={{
            color: color ?? 'var(--text)',
            fontFamily: 'ui-monospace, monospace',
          }}
        >
          {value}
        </div>

        <div className="flex items-center gap-1.5 mt-1">
          {delta !== undefined && (
            <span
              className="flex items-center gap-0.5 text-xs tabular-nums"
              style={{
                color: up
                  ? 'var(--success)'
                  : down
                    ? 'var(--danger)'
                    : 'var(--text-3)',
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              {up ? (
                <ChevronUp size={11} />
              ) : down ? (
                <ChevronDown size={11} />
              ) : (
                <Minus size={11} />
              )}
              {Math.abs(delta)}%
            </span>
          )}

          {sub && (
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>
              {sub}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function PipelineState({
  overview,
}: {
  overview: VisibilityOverview;
}) {
  const pipeline = overview.pipeline;

  return (
    <div
      className="p-4"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity size={14} style={{ color: 'var(--text-2)' }} />
          <span
            className="text-sm font-semibold"
            style={{ color: 'var(--text)' }}
          >
            Intelligence Pipeline
          </span>
        </div>

        <span
          className="inline-flex items-center gap-1.5 px-2 py-1 text-xs"
          style={{
            color: statusColor(pipeline.state),
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            fontFamily: 'ui-monospace, monospace',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: statusColor(pipeline.state) }}
          />
          {pipeline.state || 'unknown'}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <div className="text-xs" style={{ color: 'var(--text-3)' }}>
            Stage
          </div>
          <div
            className="text-sm mt-1"
            style={{
              color: 'var(--text)',
              fontFamily: 'ui-monospace, monospace',
            }}
          >
            {pipeline.stage || '—'}
          </div>
        </div>

        <div>
          <div className="text-xs" style={{ color: 'var(--text-3)' }}>
            Run status
          </div>
          <div
            className="text-sm mt-1"
            style={{
              color: statusColor(pipeline.run_status || ''),
              fontFamily: 'ui-monospace, monospace',
            }}
          >
            {pipeline.run_status || '—'}
          </div>
        </div>

        <div>
          <div className="text-xs" style={{ color: 'var(--text-3)' }}>
            Started
          </div>
          <div className="text-sm mt-1" style={{ color: 'var(--text)' }}>
            {formatDate(pipeline.started_at)}
          </div>
        </div>

        <div>
          <div className="text-xs" style={{ color: 'var(--text-3)' }}>
            Completed
          </div>
          <div className="text-sm mt-1" style={{ color: 'var(--text)' }}>
            {formatDate(pipeline.completed_at)}
          </div>
        </div>
      </div>

      {pipeline.error && (
        <div
          className="mt-4 px-3 py-2.5 flex items-start gap-2"
          style={{
            background: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
          }}
        >
          <AlertTriangle
            size={13}
            className="mt-0.5 flex-shrink-0"
            style={{ color: 'var(--danger)' }}
          />

          <div>
            <div
              className="text-xs font-semibold"
              style={{ color: 'var(--danger)' }}
            >
              Pipeline error
            </div>

            <div
              className="text-xs mt-0.5"
              style={{ color: 'var(--text-2)' }}
            >
              {pipeline.error}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IntelligencePanel({
  overview,
  gaps,
}: {
  overview: VisibilityOverview;
  gaps: VisibilityGapItem[];
}) {
  return (
    <div
      className="p-4"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target size={14} style={{ color: 'var(--text-2)' }} />
          <span
            className="text-sm font-semibold"
            style={{ color: 'var(--text)' }}
          >
            Intelligence
          </span>
        </div>

        <span
          className="text-xs"
          style={{
            color: 'var(--text-3)',
            fontFamily: 'ui-monospace, monospace',
          }}
        >
          {overview.intelligence.opportunities_open} open opportunities
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <StatCard
          label="Open gaps"
          value={formatNumber(overview.intelligence.gaps_open)}
          icon={<AlertTriangle size={14} />}
          color="var(--warning)"
        />

        <StatCard
          label="Gaps in progress"
          value={formatNumber(overview.intelligence.gaps_in_progress ?? 0)}
          icon={<Loader2 size={14} />}
          color="var(--info)"
        />

        <StatCard
          label="Resolved gaps (measured)"
          value={formatNumber(overview.intelligence.gaps_resolved)}
          icon={<CheckCircle2 size={14} />}
          color="var(--success)"
        />

        <StatCard
          label="Opportunities"
          value={formatNumber(overview.intelligence.opportunities_total)}
          icon={<Target size={14} />}
        />

        <StatCard
          label="Avg gap score"
          value={
            overview.intelligence.avg_gap_score === null
              ? '—'
              : overview.intelligence.avg_gap_score.toFixed(1)
          }
          icon={<Shield size={14} />}
        />
      </div>

      {gaps.length > 0 && (
        <div
          className="divide-y"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          {gaps.slice(0, 5).map((gap) => (
            <div
              key={gap.id}
              className="py-3 flex items-start gap-3"
              style={{ borderColor: 'var(--border)' }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                style={{ background: statusColor(gap.severity || gap.status) }}
              />

              <div className="min-w-0 flex-1">
                <div
                  className="text-xs font-medium"
                  style={{ color: 'var(--text)' }}
                >
                  {gap.title}
                </div>

                <div
                  className="text-xs mt-0.5 truncate"
                  style={{ color: 'var(--text-3)' }}
                >
                  {gap.description || gap.query_text || gap.topic || '—'}
                </div>
              </div>

              <div className="flex-shrink-0 text-right">
                <div
                  className="text-xs"
                  style={{
                    color: statusColor(gap.status),
                    fontFamily: 'ui-monospace, monospace',
                  }}
                >
                  {gap.status}
                </div>

                <div
                  className="text-xs mt-0.5"
                  style={{
                    color: 'var(--text-3)',
                    fontFamily: 'ui-monospace, monospace',
                  }}
                >
                  {gap.gap_score === null ? '—' : gap.gap_score.toFixed(1)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ContentPanel({
  overview,
  published,
}: {
  overview: VisibilityOverview;
  published: VisibilityPublishedItem[];
}) {
  const content = overview.content;

  return (
    <div
      className="p-4"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText size={14} style={{ color: 'var(--text-2)' }} />
          <span
            className="text-sm font-semibold"
            style={{ color: 'var(--text)' }}
          >
            Content Execution
          </span>
        </div>

      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard
          label="Strategies"
          value={formatNumber(content.strategies_total)}
          icon={<Target size={14} />}
        />

        <StatCard
          label="Executions"
          value={formatNumber(content.executions_total)}
          icon={<Zap size={14} />}
        />

        <StatCard
          label="Published"
          value={formatNumber(content.published)}
          icon={<CheckCircle2 size={14} />}
          color="var(--success)"
        />

        <StatCard
          label="Published today"
          value={formatNumber(content.published_today)}
          icon={<Globe size={14} />}
          color="var(--info)"
        />
      </div>

      {content.this_run && content.this_run.executions_created === 0 &&
        content.this_run.strategies_already_covered > 0 && (
        <p className="text-xs mb-4" style={{ color: 'var(--text-2)' }}>
          This run created no new content: its{' '}
          {formatNumber(content.this_run.strategies_already_covered)} topics are already covered by pages
          published in the last {content.this_run.regeneration_cooldown_days} days, which are left for
          search engines to assess before they are rewritten.
        </p>
      )}

      {published.length > 0 && (
        <div
          className="divide-y"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          {published.slice(0, 5).map((item) => (
            <div
              key={item.id}
              className="py-3 flex items-center gap-3"
              style={{ borderColor: 'var(--border)' }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: 'var(--success)' }}
              />

              <div className="min-w-0 flex-1">
                <div
                  className="text-xs font-medium truncate"
                  style={{ color: 'var(--text)' }}
                >
                  {item.target_title ||
                    item.topic ||
                    item.primary_query ||
                    'Published content'}
                </div>

                <div
                  className="text-xs mt-0.5 truncate"
                  style={{ color: 'var(--text-3)' }}
                >
                  {item.published_url || item.target_url || '—'}
                </div>
              </div>

              <span
                className="text-xs flex-shrink-0"
                style={{
                  color: 'var(--text-3)',
                  fontFamily: 'ui-monospace, monospace',
                }}
              >
                {relTime(item.published_at || item.created_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SearchPerformance({
  data,
}: {
  data: VisibilitySearchPerformanceResponse | null;
}) {
  return (
    <div
      className="p-4"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Search size={14} style={{ color: 'var(--text-2)' }} />
        <span
          className="text-sm font-semibold"
          style={{ color: 'var(--text)' }}
        >
          Search Performance
        </span>
      </div>

      {!data ? (
        <div className="text-xs" style={{ color: 'var(--text-3)' }}>
          No search-performance measurements are available yet.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {data.search_performance.map((band) => (
              <StatCard
                key={band.rank_band}
                label={band.rank_band}
                value={formatNumber(band.measurement_count)}
                sub={
                  band.avg_position === null
                    ? 'no position'
                    : `avg #${band.avg_position.toFixed(1)}`
                }
                icon={<Search size={14} />}
                color={
                  band.improved > band.declined
                    ? 'var(--success)'
                    : band.declined > band.improved
                      ? 'var(--danger)'
                      : 'var(--text)'
                }
              />
            ))}
          </div>

          <div
            className="pt-3"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <div
              className="text-xs mb-2"
              style={{
                color: 'var(--text-3)',
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              Publication state
            </div>

            <div className="space-y-1.5">
              {data.execution_state.map((state) => (
                <div
                  key={`${state.approval_status}-${state.publication_status}`}
                  className="flex items-center gap-2 text-xs"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: statusColor(state.publication_status),
                    }}
                  />

                  <span
                    className="flex-1"
                    style={{ color: 'var(--text-2)' }}
                  >
                    {state.approval_status} → {state.publication_status}
                  </span>

                  <span
                    style={{
                      color: 'var(--text-3)',
                      fontFamily: 'ui-monospace, monospace',
                    }}
                  >
                    {formatNumber(state.content_count)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function TenantDashboard() {
  const { selectedRunId } = useIntelligenceRun();
  const [websiteId, setWebsiteId] = useState<string | null>(null);
  const [overview, setOverview] = useState<VisibilityOverview | null>(null);
  const [gaps, setGaps] = useState<VisibilityGapItem[]>([]);
  const [published, setPublished] = useState<VisibilityPublishedItem[]>([]);
  const [searchPerformance, setSearchPerformance] =
    useState<VisibilitySearchPerformanceResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async (refreshMode = false) => {
    if (refreshMode) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const websites = await listWebsites();

      if (!websites.length) {
        setWebsiteId(null);
        setOverview(null);
        setGaps([]);
        setPublished([]);
        setSearchPerformance(null);
        return;
      }

      const id = websites[0].id;
      setWebsiteId(id);

      const [ov, gapData, publishedData, searchData] =
        await Promise.all([
          getVisibilityOverview(id, selectedRunId ?? undefined),
          getVisibilityGaps(id, 20),
          getVisibilityPublished(id, {
            page: 1,
            page_size: 20,
            ...(selectedRunId ? { run_id: selectedRunId } : {}),
          }),
          getVisibilitySearchPerformance(id),
        ]);

      setOverview(ov);
      setGaps(gapData);
      setPublished(publishedData.items);
      setSearchPerformance(searchData);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to load canonical visibility data', err);
      setError('Could not load visibility data from the backend.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedRunId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div
        className="min-h-full flex items-center justify-center gap-2 text-sm"
        style={{ background: 'var(--bg)', color: 'var(--text-3)' }}
      >
        <Loader2 size={16} className="animate-spin" />
        Loading Data Engine intelligence…
      </div>
    );
  }

  if (!websiteId) {
    return (
      <div
        className="min-h-full flex flex-col items-center justify-center gap-3 px-6"
        style={{ background: 'var(--bg)', color: 'var(--text-3)' }}
      >
        <Globe size={22} style={{ color: 'var(--text-2)' }} />

        <div
          className="text-sm font-medium"
          style={{ color: 'var(--text)' }}
        >
          No website connected
        </div>

        <div className="text-xs text-center max-w-sm">
          Connect a website to start the Data Engine intelligence pipeline.
        </div>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div
        className="min-h-full flex flex-col items-center justify-center gap-3"
        style={{ background: 'var(--bg)', color: 'var(--text-3)' }}
      >
        <AlertTriangle
          size={18}
          style={{ color: 'var(--warning)' }}
        />

        <p className="text-sm" style={{ color: 'var(--text-2)' }}>
          {error || 'No visibility data available.'}
        </p>

        <button
          onClick={() => void load()}
          className="text-xs px-3 py-1.5"
          style={{
            border: '1px solid var(--border)',
            color: 'var(--text-3)',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  const { website, intelligence, content, feedback } = overview;

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <div
        className="px-6 py-5 flex items-center justify-between sticky top-0 z-10"
        style={{
          background: 'var(--bg)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div>
          <div className="flex items-center gap-3">
            <div
              className="w-7 h-7 flex items-center justify-center"
              style={{ background: 'var(--text)' }}
            >
              <Zap size={13} style={{ color: 'var(--bg)' }} />
            </div>

            <h1
              className="text-xl md:text-2xl font-semibold tracking-tight"
              style={{ color: 'var(--text)' }}
            >
              Visibility Overview
            </h1>

            <span
              className="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-sm"
              style={{
                color: statusColor(website.status),
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: statusColor(website.status) }}
              />
              {website.status}
            </span>
          </div>

          <p
            className="text-xs ml-10 mt-1.5"
            style={{
              color: 'var(--text-3)',
              fontFamily: 'ui-monospace, monospace',
            }}
          >
            {website.domain || website.url}
            <span className="mx-2" style={{ color: 'var(--border)' }}>
              ·
            </span>
            {website.page_count} pages
            <span className="mx-2" style={{ color: 'var(--border)' }}>
              ·
            </span>
            Updated{' '}
            {lastUpdated
              ? lastUpdated.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })
              : '—'}
          </p>
        </div>

        <button
          onClick={() => void load(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors disabled:opacity-40"
          style={{
            border: '1px solid var(--border)',
            color: 'var(--text-2)',
            background: 'var(--surface)',
          }}
        >
          <RefreshCw
            size={13}
            className={refreshing ? 'animate-spin' : ''}
          />
          Refresh
        </button>
      </div>

      <div className="p-6 space-y-4">
        <GoogleSearchKpis websiteId={websiteId} />

        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
          <OverviewKpi
            label="Open gaps"
            value={formatNumber(intelligence.gaps_open)}
            icon={<Target size={16} />}
            color="var(--warning)"
          />

          <OverviewKpi
            label="Gaps resolved"
            value={`${formatNumber(intelligence.gaps_resolved)} of ${formatNumber(intelligence.gaps_total)}`}
            icon={<CheckCircle2 size={16} />}
            color="var(--success)"
          />

          <OverviewKpi
            label="Opportunities"
            value={formatNumber(intelligence.opportunities_open)}
            icon={<Target size={16} />}
          />

          <OverviewKpi
            label="Executions"
            value={formatNumber(content.executions_total)}
            icon={<Zap size={16} />}
          />

          <OverviewKpi
            label="Published"
            value={formatNumber(content.published)}
            icon={<CheckCircle2 size={16} />}
            color="var(--success)"
          />

          <OverviewKpi
            label="Published today"
            value={formatNumber(content.published_today)}
            icon={<FileText size={16} />}
            color="var(--info)"
          />

          <OverviewKpi
            label="Avg position (tracked queries)"
            value={
              feedback.avg_position === null
                ? '—'
                : `#${feedback.avg_position.toFixed(1)}`
            }
            icon={<Search size={16} />}
            color="var(--info)"
          />
        </div>

        <PipelineState overview={overview} />

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <IntelligencePanel
          overview={overview}
          gaps={gaps}
        />

        <ContentPanel
          overview={overview}
          published={published}
        />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SearchPerformance data={searchPerformance} />

        <div
            className="p-4"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
        >
            <div className="flex items-center gap-2 mb-4">
              <Activity size={14} style={{ color: 'var(--text-2)' }} />
              <span
                className="text-sm font-semibold"
                style={{ color: 'var(--text)' }}
              >
                Feedback Loop
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <StatCard
                label="Measurements"
                value={formatNumber(feedback.total_measurements)}
                icon={<Activity size={14} />}
              />

              <StatCard
                label="Ranked"
                value={formatNumber(feedback.ranked_measurements)}
                icon={<Search size={14} />}
              />

              <StatCard
                label="Improved"
                value={formatNumber(feedback.improved)}
                icon={<ChevronUp size={14} />}
                color="var(--success)"
              />

              <StatCard
                label="Declined"
                value={formatNumber(feedback.declined)}
                icon={<ChevronDown size={14} />}
                color="var(--danger)"
              />

              <StatCard
                label="Unchanged"
                value={formatNumber(feedback.unchanged)}
                icon={<Minus size={14} />}
              />
            </div>

            <div
              className="text-xs mt-3"
              style={{
                color: 'var(--text-3)',
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              Last measured {relTime(feedback.last_measured_at)}
            </div>
        </div>
          </div>

        {overview.recent_executions.length > 0 && (
          <div
            className="overflow-hidden"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
          >
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2">
                <Activity
                  size={14}
                  style={{ color: 'var(--text-2)' }}
                />
                <span
                  className="text-sm font-medium"
                  style={{ color: 'var(--text)' }}
                >
                  Execution Activity
                </span>
              </div>

            </div>

            <div
              className="divide-y max-h-80 overflow-y-auto"
              style={{ borderColor: 'var(--border)' }}
            >
              {overview.recent_executions.map((execution) => (
                <div
                  key={execution.id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{
                      background: statusColor(
                        execution.publication_status ||
                          execution.approval_status,
                      ),
                    }}
                  />

                  <div className="flex-1 min-w-0">
                    <div
                      className="text-xs font-medium truncate"
                      style={{ color: 'var(--text)' }}
                    >
                      {execution.strategy_topic ||
                        execution.opportunity_title ||
                        execution.action_type}
                    </div>

                    <div
                      className="text-xs mt-0.5 truncate"
                      style={{ color: 'var(--text-3)' }}
                    >
                      {execution.published_url ||
                        execution.target_url ||
                        execution.action_type}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div
                      className="text-xs"
                      style={{
                        color: statusColor(
                          execution.publication_status ||
                            execution.approval_status,
                        ),
                        fontFamily: 'ui-monospace, monospace',
                      }}
                    >
                      {execution.publication_status ||
                        execution.approval_status}
                    </div>

                    <div
                      className="text-xs mt-0.5"
                      style={{
                        color: 'var(--text-3)',
                        fontFamily: 'ui-monospace, monospace',
                      }}
                    >
                      {relTime(execution.published_at || execution.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {content.failed > 0 && (
          <div
            className="px-4 py-3 flex items-start gap-3"
            style={{
              border: '1px solid var(--danger-border)',
              background: 'var(--danger-bg)',
            }}
          >
            <AlertTriangle
              size={14}
              className="flex-shrink-0 mt-0.5"
              style={{ color: 'var(--warning)' }}
            />

            <div>
              <p
                className="text-xs font-semibold mb-0.5"
                style={{ color: 'var(--warning)' }}
              >
                {formatNumber(content.failed)} execution
                {content.failed !== 1 ? 's' : ''} failed
              </p>

              <p
                className="text-xs leading-relaxed"
                style={{ color: 'var(--text-2)' }}
              >
                The backend reported failed execution jobs. The Data Engine
                pipeline will expose the associated state and error through
                the execution data.
              </p>
            </div>
          </div>
        )}

        <div className="pb-4" />
      </div>
    </div>
  );
}
