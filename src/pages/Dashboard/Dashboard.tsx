import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  ChevronUp, ChevronDown, Minus,
} from 'lucide-react';
import {
  getDashboardOverview,
  getActivityLog,
  getMetricsSummary,
  getMetricsThroughput,
  getPipelineMetrics,
  getDashboardDocuments,
  getGapComparison,
} from '../../api/dashboard';
import { getRankings } from '../../api/seo';
import { getQualityScore } from '../../api/gaps';
import type {
  DashboardOverview,
  ActivityLogEntry,
  MetricsSummary,
  ThroughputPoint,
  PipelineMetrics,
  DocumentListItem,
  GapComparisonPoint,
  RankSnapshot,
  QualityScoreResponse,
} from '../../types';
import { useTheme } from '../../contexts/ThemeContext';

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function useTooltipStyle() {
  const { theme } = useTheme();
  return {
    contentStyle: {
      background:  theme === 'dark' ? '#1F1F1F' : '#ffffff',
      border:      `1px solid ${theme === 'dark' ? '#2C2C2C' : '#E0DDD6'}`,
      borderRadius: 4,
      fontSize:    13,
      fontFamily:  'Barlow, system-ui, sans-serif',
      color:       theme === 'dark' ? '#F0F0F0' : '#1A1A1A',
      boxShadow:   theme === 'dark' ? '0 4px 16px rgba(0,0,0,0.55)' : '0 4px 16px rgba(0,0,0,0.10)',
    },
    itemStyle:  { color: theme === 'dark' ? '#A8A8A8' : '#555550' },
    labelStyle: { color: theme === 'dark' ? '#636363' : '#9E9B94', marginBottom: 3, fontWeight: 600 },
    cursor:     { stroke: theme === 'dark' ? '#2C2C2C' : '#E0DDD6', strokeWidth: 1 },
  };
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function Card({ children, className = '', style = {} }: {
  children: React.ReactNode; className?: string; style?: React.CSSProperties;
}) {
  return (
    <div
      className={className}
      style={{
        background: 'var(--surface)',
        border:     '1px solid var(--border)',
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

// Section title — no icon, clean typographic hierarchy
function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>{title}</h2>
      {description && (
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>{description}</p>
      )}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  delta?: number;
  loading?: boolean;
}

function StatCard({ label, value, sub, delta, loading }: StatCardProps) {
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

// ─── Score gauge ──────────────────────────────────────────────────────────────

function ScoreGauge({ label, score, barColor, loading }: {
  label: string; score: number; barColor: string; loading?: boolean;
}) {
  const pct       = Math.min(100, Math.max(0, score));
  const grade     = pct >= 80 ? 'Excellent' : pct >= 60 ? 'Good' : pct >= 40 ? 'Fair' : 'Poor';
  const gradeColor = pct >= 80 ? 'var(--success)' : pct >= 60 ? 'var(--info)' : pct >= 40 ? 'var(--warning)' : 'var(--danger)';

  if (loading) {
    return (
      <Card className="p-5 flex flex-col gap-4">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-1.5 w-full" />
      </Card>
    );
  }

  return (
    <Card className="p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>{label}</span>
        <span className="text-xs font-bold" style={{ color: gradeColor }}>{grade}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[32px] font-bold leading-none tabular-nums" style={{ color: 'var(--text)' }}>
          {pct.toFixed(0)}
        </span>
        <span className="text-base font-medium" style={{ color: 'var(--text-3)' }}>/100</span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden"
        style={{ background: 'var(--surface-2)', borderRadius: 2 }}
      >
        <div
          className="h-full transition-all duration-700"
          style={{ width: `${pct}%`, background: barColor, borderRadius: 2 }}
        />
      </div>
    </Card>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    completed: 'var(--success)',
    failed:    'var(--danger)',
    queued:    'var(--info)',
    embedding: 'var(--warning)',
    chunking:  'var(--warning)',
    storing:   'var(--warning)',
    preprocessing: 'var(--warning)',
  };
  const color = colorMap[status] ?? 'var(--text-3)';

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
      {status}
    </span>
  );
}

// ─── Activity item ────────────────────────────────────────────────────────────

function ActivityRow({ entry }: { entry: ActivityLogEntry }) {
  const ts    = entry.created_at ?? entry.timestamp;
  const diff  = Math.floor((Date.now() - new Date(ts ?? 0).getTime()) / 1000);
  const when  = diff < 60  ? `${diff}s ago`
               : diff < 3600  ? `${Math.floor(diff / 60)}m ago`
               : diff < 86400 ? `${Math.floor(diff / 3600)}h ago`
               :                `${Math.floor(diff / 86400)}d ago`;

  return (
    <tr
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
      onMouseLeave={e => (e.currentTarget.style.background = '')}
      style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.12s' }}
    >
      <td className="py-2.5 px-5 text-sm font-medium" style={{ color: 'var(--text)' }}>
        {entry.event_type}
      </td>
      <td className="py-2.5 px-5 text-sm" style={{ color: 'var(--text-2)' }}>
        {entry.service}
      </td>
      <td className="py-2.5 px-5 text-sm text-right" style={{ color: 'var(--text-3)' }}>
        {when}
      </td>
    </tr>
  );
}

// ─── Page header ──────────────────────────────────────────────────────────────

function PageHeader({ lastUpdated, onRefresh, refreshing }: {
  lastUpdated: Date; onRefresh: () => void; refreshing: boolean;
}) {
  const date = lastUpdated.toLocaleString([], {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <header
      className="flex items-center justify-between px-7 py-4 flex-shrink-0"
      style={{
        background:   'var(--surface)',
        borderBottom: '1px solid var(--border)',
      }}
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
        className="px-4 py-2 text-sm font-bold rounded transition-colors disabled:opacity-40"
        style={{ background: 'var(--brand)', color: '#111' }}
        onMouseEnter={e => { if (!refreshing) e.currentTarget.style.background = 'var(--brand-light)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--brand)'; }}
      >
        {refreshing ? 'Refreshing…' : 'Refresh'}
      </button>
    </header>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <Card className="p-8">
      <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text)' }}>
        Connect your product
      </h2>
      <p className="text-sm mb-6" style={{ color: 'var(--text-2)', lineHeight: 1.7, maxWidth: 480 }}>
        Generate an API key and start sending content to the Data Engine.
        Gap detection, SEO and GEO scoring run automatically and push results
        back to your system via webhook.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          to="/credentials"
          className="px-5 py-3 rounded text-sm font-bold transition-colors"
          style={{ background: 'var(--brand)', color: '#111' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--brand-light)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--brand)')}
        >
          Create API Key
        </Link>
        <Link
          to="/credentials"
          className="px-5 py-3 rounded text-sm font-bold transition-colors"
          style={{
            background: 'var(--surface-2)',
            color:      'var(--text)',
            border:     '1px solid var(--border)',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-3)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-2)')}
        >
          Register Webhook
        </Link>
      </div>
    </Card>
  );
}

// ─── Root Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const tt = useTooltipStyle();

  const [overview,      setOverview]      = useState<DashboardOverview | null>(null);
  const [activity,      setActivity]      = useState<ActivityLogEntry[]>([]);
  const [metricsSummary,setMetricsSummary]= useState<MetricsSummary | null>(null);
  const [throughput,    setThroughput]    = useState<ThroughputPoint[]>([]);
  const [pipeline,      setPipeline]      = useState<PipelineMetrics | null>(null);
  const [documents,     setDocuments]     = useState<DocumentListItem[]>([]);
  const [gapComparison, setGapComparison] = useState<GapComparisonPoint[]>([]);
  const [rankings,      setRankings]      = useState<RankSnapshot[]>([]);
  const [qsData,        setQsData]        = useState<QualityScoreResponse | null>(null);

  const [loading,     setLoading]     = useState(true);
  const [qsLoading,   setQsLoading]   = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchAll = useCallback(async () => {
    const results = await Promise.allSettled([
      getDashboardOverview(),
      getActivityLog(24, 20),
      getMetricsSummary(24),
      getMetricsThroughput(24, 60),
      getPipelineMetrics(),
      getDashboardDocuments({ page: 1, page_size: 10 }),
    ]);

    if (results[0].status === 'fulfilled') setOverview(results[0].value);
    if (results[1].status === 'fulfilled') setActivity(results[1].value);
    if (results[2].status === 'fulfilled') setMetricsSummary(results[2].value);
    if (results[3].status === 'fulfilled') setThroughput(results[3].value);
    if (results[4].status === 'fulfilled') setPipeline(results[4].value);
    if (results[5].status === 'fulfilled') setDocuments(results[5].value);

    if (results[5].status === 'fulfilled' && results[5].value.length > 0) {
      const firstDoc = results[5].value[0];
      const docId = firstDoc.document_id ?? (firstDoc as Record<string, unknown>)['id'] as string;
      if (docId) {
        getGapComparison(docId).then(setGapComparison).catch(() => {});
      }
    }
    setLastUpdated(new Date());
  }, []);

  const fetchRankings = useCallback(async () => {
    const domain = (documents[0]?.['domain'] as string) ?? import.meta.env.VITE_DEFAULT_DOMAIN ?? '';
    if (!domain) return;
    try {
      const data = await getRankings(domain, '', 30);
      setRankings(data);
    } catch { /* non-critical */ }
  }, [documents]);

  const fetchQS = useCallback(() => {
    if (!documents.length) return;
    const doc     = documents[0];
    const content = (doc['content'] as string) ?? doc.filename;
    setQsLoading(true);
    getQualityScore({
      content,
      title: (doc['title'] as string) ?? doc.filename,
      query: (doc['title'] as string) ?? doc.filename,
    })
      .then(setQsData)
      .catch(() => {})
      .finally(() => setQsLoading(false));
  }, [documents]);

  useEffect(() => {
    setLoading(true);
    fetchAll().finally(() => setLoading(false));
  }, [fetchAll]);

  useEffect(() => {
    if (documents.length) {
      fetchRankings();
      fetchQS();
    }
  }, [documents, fetchRankings, fetchQS]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  // Derived — fields now typed correctly to match the backend /overview response
  const seoScore    = overview?.avg_seo_score;
  const geoScore    = overview?.avg_geo_score;
  const aeoScore    = overview?.avg_aeo_score;
  const openGaps    = overview?.open_gaps;
  const coveragePct = overview?.coverage_percentage;
  const docCount    = overview != null
    ? (overview.documents_completed + overview.documents_queued + overview.documents_failed)
    : undefined;
  const topRank    = rankings.length ? Math.min(...rankings.map(r => r.position)) : null;

  const throughputSeries = throughput.map(p => ({
    time:   new Date(p.interval_start ?? p.timestamp ?? 0).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    events: p.count,
  }));

  const gapCompSeries = gapComparison.map(p => ({
    date:   new Date(p.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    before: +(p.before_coverage * 100).toFixed(1),
    after:  +(p.after_coverage  * 100).toFixed(1),
  }));

  const gapLabel = openGaps != null
    ? (openGaps === 0 ? 'None open' : openGaps < 5 ? 'Low' : openGaps < 12 ? 'Medium' : 'High')
    : undefined;

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
      <PageHeader lastUpdated={lastUpdated} onRefresh={handleRefresh} refreshing={refreshing} />

      <div className="flex-1 overflow-y-auto">
        <div className="px-7 py-6 space-y-7">

          {/* ── KPI row ── */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard label="SEO Score"  value={seoScore    != null ? `${seoScore.toFixed(0)}%`    : '—'} loading={loading} />
            <StatCard label="GEO Score"  value={geoScore    != null ? `${geoScore.toFixed(0)}%`    : '—'} loading={loading} />
            <StatCard label="AEO Score"  value={aeoScore    != null ? `${aeoScore.toFixed(0)}%`    : '—'} loading={loading} />
            <StatCard label="Open Gaps"  value={openGaps    != null ? openGaps                     : '—'} sub={gapLabel} loading={loading} />
            <StatCard label="Coverage"   value={coveragePct != null ? `${coveragePct.toFixed(0)}%` : '—'} loading={loading} />
            <StatCard label="Documents"  value={docCount    != null ? docCount                     : '—'} sub={documents.length ? `${documents.filter(d => d.status === 'completed').length} indexed` : undefined} loading={loading} />
          </div>

          {/* ── Visibility gauges ── */}
          <div>
            <p className="text-sm font-bold mb-3" style={{ color: 'var(--text-3)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Engine Visibility
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ScoreGauge label="SEO — Search Engines"         score={seoScore ?? 0} barColor="var(--info)"   loading={loading} />
              <ScoreGauge label="GEO — Generative Engines"     score={geoScore ?? 0} barColor="#a78bfa"       loading={loading} />
              <ScoreGauge label="AEO — AI Engine Optimisation" score={aeoScore ?? 0} barColor="var(--brand)"  loading={loading} />
            </div>
          </div>

          {/* ── Quality Score panel ── */}
          {(qsData || qsLoading) && (
            <Card className="overflow-hidden">
              <div
                className="flex items-center justify-between px-6 py-4"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <div>
                  <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>
                    Content Quality Score
                  </h2>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
                    Google Ads Ad Rank model — QS 8 or above beats all paid placements
                  </p>
                </div>
                {qsLoading && (
                  <span className="text-sm font-medium" style={{ color: 'var(--text-3)' }}>
                    Analysing…
                  </span>
                )}
              </div>

              {qsData ? (
                <div className="p-6 space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Headline score */}
                    <div
                      className="p-5 flex flex-col gap-2"
                      style={{
                        border:       `1px solid ${qsData.beats_paid_ads ? 'rgba(34,197,94,0.25)' : qsData.quality_score >= 6 ? 'rgba(245,158,11,0.25)' : 'rgba(239,68,68,0.25)'}`,
                        background:   qsData.beats_paid_ads ? 'rgba(34,197,94,0.05)' : qsData.quality_score >= 6 ? 'rgba(245,158,11,0.05)' : 'rgba(239,68,68,0.05)',
                        borderRadius: 6,
                      }}
                    >
                      <span className="text-xs font-bold uppercase" style={{ color: 'var(--text-3)', letterSpacing: '0.06em' }}>
                        Quality Score
                      </span>
                      <div className="flex items-baseline gap-1.5">
                        <span
                          className="text-4xl font-bold tabular-nums"
                          style={{ color: qsData.beats_paid_ads ? 'var(--success)' : qsData.quality_score >= 6 ? 'var(--warning)' : 'var(--danger)' }}
                        >
                          {qsData.quality_score.toFixed(1)}
                        </span>
                        <span className="text-base font-medium" style={{ color: 'var(--text-3)' }}>/10</span>
                      </div>
                      <span
                        className="text-sm font-bold"
                        style={{ color: qsData.beats_paid_ads ? 'var(--success)' : 'var(--text-2)' }}
                      >
                        {qsData.label}{qsData.beats_paid_ads ? ' — Beats paid ads' : ''}
                      </span>
                      <span className="text-sm" style={{ color: 'var(--text-3)' }}>
                        {qsData.projected_position}
                      </span>
                    </div>

                    {/* Score dimensions */}
                    {Object.entries(qsData.dimensions).map(([key, dim]) => (
                      <div
                        key={key}
                        className="p-5 flex flex-col gap-2.5"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6 }}
                      >
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                          {dim.name.split('(')[0].trim()}
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span
                            className="text-2xl font-bold tabular-nums"
                            style={{ color: dim.status === 'Above Average' ? 'var(--success)' : dim.status === 'Average' ? 'var(--warning)' : 'var(--danger)' }}
                          >
                            {dim.score.toFixed(1)}
                          </span>
                          <span className="text-sm font-medium" style={{ color: 'var(--text-3)' }}>/10</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden" style={{ background: 'var(--surface-3)', borderRadius: 2 }}>
                          <div
                            className="h-full"
                            style={{
                              width:        `${dim.score * 10}%`,
                              background:   dim.status === 'Above Average' ? 'var(--success)' : dim.status === 'Average' ? 'var(--warning)' : 'var(--danger)',
                              borderRadius: 2,
                            }}
                          />
                        </div>
                        <span
                          className="text-xs font-bold"
                          style={{ color: dim.status === 'Above Average' ? 'var(--success)' : dim.status === 'Average' ? 'var(--warning)' : 'var(--danger)' }}
                        >
                          {dim.status}
                        </span>
                        {dim.fixes[0] && (
                          <span
                            className="text-xs leading-snug pt-2"
                            style={{ color: 'var(--text-3)', borderTop: '1px solid var(--border)' }}
                          >
                            {dim.fixes[0]}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Benchmarks + Action plan */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                    <div>
                      <p className="text-xs font-bold uppercase mb-3" style={{ color: 'var(--text-3)', letterSpacing: '0.06em' }}>
                        Paid Ad Benchmarks
                      </p>
                      <table className="w-full text-sm">
                        <tbody>
                          {qsData.rank_simulation.ad_benchmarks.map(b => (
                            <tr
                              key={b.ad_position}
                              style={{ borderBottom: '1px solid var(--border-subtle)' }}
                            >
                              <td className="py-2 text-sm" style={{ color: 'var(--text-2)' }}>
                                {b.ad_position}
                              </td>
                              <td className="py-2 text-sm text-center" style={{ color: 'var(--text-3)' }}>
                                QS {b.ad_typical_qs}
                              </td>
                              <td className="py-2 text-sm text-right font-semibold" style={{ color: b.beats_this_ad ? 'var(--success)' : 'var(--danger)' }}>
                                {b.beats_this_ad ? 'Beats' : `+${b.qs_gap} pts needed`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase mb-3" style={{ color: 'var(--text-3)', letterSpacing: '0.06em' }}>
                        Recommended Actions
                      </p>
                      <ol className="space-y-2.5">
                        {qsData.action_plan.slice(0, 4).map((a, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm">
                            <span
                              className="flex-shrink-0 w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5"
                              style={{ background: 'var(--surface-3)', color: 'var(--text-2)', borderRadius: 3 }}
                            >
                              {i + 1}
                            </span>
                            <span style={{ color: 'var(--text-2)', lineHeight: 1.55 }}>
                              {a.length > 130 ? a.slice(0, 130) + '…' : a}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 grid grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
                </div>
              )}
            </Card>
          )}

          {/* ── Throughput chart ── */}
          <Card className="p-6">
            <SectionTitle
              title="Pipeline Throughput"
              description="Events processed per hour over the last 24 hours"
            />
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : throughputSeries.length > 0 ? (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={throughputSeries} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                      <defs>
                        <linearGradient id="tpGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#F4A825" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#F4A825" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
                      <XAxis dataKey="time" tick={{ fontSize: 12, fill: 'var(--text-3)', fontFamily: 'Barlow, system-ui' }} tickLine={false} axisLine={false} interval={3} />
                      <YAxis  tick={{ fontSize: 12, fill: 'var(--text-3)', fontFamily: 'Barlow, system-ui' }} tickLine={false} axisLine={false} />
                      <Tooltip {...tt} />
                    <Area type="monotone" dataKey="events" name="Events" stroke="var(--brand)" strokeWidth={2} fill="url(#tpGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              ) : (
                <div className="h-48 flex items-center justify-center">
                  <p className="text-sm" style={{ color: 'var(--text-3)' }}>No throughput data yet — activity will appear here once documents are processed.</p>
                </div>
              )}
            </Card>

          {/* ── Pipeline latencies ── */}
          {pipeline && (
            <Card className="p-6">
              <SectionTitle title="Pipeline Stage Latencies" description="Average processing time per stage" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {([ ['Ingest', pipeline.ingest_ms], ['Chunk', pipeline.chunk_ms], ['Embed', pipeline.embed_ms], ['Gap', pipeline.gap_ms], ['Write', pipeline.write_ms] ] as [string, number][]).map(([stage, ms]) => (
                  <div
                    key={stage}
                    className="p-4 text-center"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6 }}
                  >
                    <p className="text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-3)', letterSpacing: '0.06em' }}>
                      {stage}
                    </p>
                    <p
                      className="text-xl font-bold tabular-nums"
                      style={{ color: ms < 200 ? 'var(--success)' : ms < 500 ? 'var(--warning)' : 'var(--danger)' }}
                    >
                      {ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ── Gap coverage chart ── */}
          {gapCompSeries.length > 0 && (
            <Card className="p-6">
              <SectionTitle
                title="Content Coverage"
                description="Coverage percentage before and after gap closure"
              />
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={gapCompSeries} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gcBefore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#636363" stopOpacity={0.12} />
                        <stop offset="95%" stopColor="#636363" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gcAfter" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#22C55E" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--text-3)', fontFamily: 'Barlow, system-ui' }} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12, fill: 'var(--text-3)', fontFamily: 'Barlow, system-ui' }} tickLine={false} axisLine={false} />
                    <Tooltip {...tt} formatter={(v) => [`${v}%`]} />
                    <Legend wrapperStyle={{ fontSize: 13, fontFamily: 'Barlow, system-ui', color: 'var(--text-3)', paddingTop: 10 }} />
                    <Area type="monotone" dataKey="before" name="Before" stroke="var(--text-3)" strokeWidth={1.5} fill="url(#gcBefore)" dot={false} />
                    <Area type="monotone" dataKey="after"  name="After"  stroke="var(--success)" strokeWidth={2}   fill="url(#gcAfter)"  dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* ── System metrics ── */}
          {metricsSummary && typeof metricsSummary.total_events === 'number' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-5">
                <p className="text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-3)', letterSpacing: '0.06em' }}>
                  Total Events (24h)
                </p>
                <p className="text-3xl font-bold tabular-nums" style={{ color: 'var(--text)' }}>
                  {(metricsSummary.total_events ?? 0).toLocaleString()}
                </p>
              </Card>
              <Card className="p-5">
                <p className="text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-3)', letterSpacing: '0.06em' }}>
                  Error Rate
                </p>
                <p
                  className="text-3xl font-bold tabular-nums"
                  style={{ color: (metricsSummary.error_rate ?? 0) < 0.02 ? 'var(--success)' : (metricsSummary.error_rate ?? 0) < 0.05 ? 'var(--warning)' : 'var(--danger)' }}
                >
                  {((metricsSummary.error_rate ?? 0) * 100).toFixed(2)}%
                </p>
              </Card>
              <Card className="p-5">
                <p className="text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-3)', letterSpacing: '0.06em' }}>
                  Top Keyword Rank
                </p>
                <p className="text-3xl font-bold tabular-nums" style={{ color: topRank ? 'var(--brand)' : 'var(--text-3)' }}>
                  {topRank ? `#${topRank}` : '—'}
                </p>
              </Card>
            </div>
          )}

          {/* ── Keyword rankings table ── */}
          {rankings.length > 0 && (
            <Card className="overflow-hidden">
              <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>Keyword Rankings</h2>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>SERP positions — last 30 days</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th className="py-3 px-6 text-left text-xs font-bold uppercase" style={{ color: 'var(--text-3)', letterSpacing: '0.06em' }}>Keyword</th>
                    <th className="py-3 px-6 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-3)', letterSpacing: '0.06em' }}>Position</th>
                    <th className="py-3 px-6 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-3)', letterSpacing: '0.06em' }}>Volume</th>
                    <th className="py-3 px-6 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-3)', letterSpacing: '0.06em' }}>CPC</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((r, i) => (
                    <tr
                      key={i}
                      style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                    >
                      <td className="py-3 px-6 font-medium" style={{ color: 'var(--text)' }}>{r.keyword}</td>
                      <td className="py-3 px-6 text-right font-bold tabular-nums" style={{ color: 'var(--text)' }}>#{r.position}</td>
                      <td className="py-3 px-6 text-right tabular-nums" style={{ color: 'var(--text-2)' }}>{r.search_volume.toLocaleString()}</td>
                      <td className="py-3 px-6 text-right tabular-nums" style={{ color: 'var(--text-2)' }}>${r.cpc.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {/* ── Recent activity ── */}
          <Card className="overflow-hidden">
            <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>Recent Activity</h2>
                  {activity.length > 0 && (
                    <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
                      {activity.length} events in the last 24 hours
                    </p>
                  )}
                </div>
              </div>
            </div>
            {loading ? (
              <div className="p-6 space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : activity.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th className="py-3 px-6 text-left text-xs font-bold uppercase" style={{ color: 'var(--text-3)', letterSpacing: '0.06em' }}>Event</th>
                    <th className="py-3 px-6 text-left text-xs font-bold uppercase" style={{ color: 'var(--text-3)', letterSpacing: '0.06em' }}>Service</th>
                    <th className="py-3 px-6 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-3)', letterSpacing: '0.06em' }}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {activity.slice(0, 12).map((e, i) => (
                    <ActivityRow key={i} entry={e} />
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="px-6 py-10 text-center">
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                  No activity recorded yet.
                </p>
              </div>
            )}
          </Card>

          {/* ── Documents table ── */}
          {documents.length > 0 && (
            <Card className="overflow-hidden">
              <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>Documents</h2>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>Recently ingested content</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th className="py-3 px-6 text-left text-xs font-bold uppercase" style={{ color: 'var(--text-3)', letterSpacing: '0.06em' }}>Filename</th>
                    <th className="py-3 px-6 text-left text-xs font-bold uppercase" style={{ color: 'var(--text-3)', letterSpacing: '0.06em' }}>Status</th>
                    <th className="py-3 px-6 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-3)', letterSpacing: '0.06em' }}>Chunks</th>
                    <th className="py-3 px-6 text-right text-xs font-bold uppercase" style={{ color: 'var(--text-3)', letterSpacing: '0.06em' }}>Added</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map(doc => (
                    <tr
                      key={doc.document_id ?? (doc as Record<string, unknown>)['id'] as string}
                      style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = '')}
                    >
                      <td className="py-3 px-6 max-w-xs">
                        <span className="block truncate font-medium" style={{ color: 'var(--text)' }}>{doc.filename}</span>
                      </td>
                      <td className="py-3 px-6">
                        <StatusBadge status={doc.status} />
                      </td>
                      <td className="py-3 px-6 text-right tabular-nums" style={{ color: 'var(--text-2)' }}>
                        {doc.chunk_count}
                      </td>
                      <td className="py-3 px-6 text-right" style={{ color: 'var(--text-3)' }}>
                        {new Date(doc.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {/* ── Empty / connect CTA ── */}
          {!loading && documents.length === 0 && <EmptyState />}

          <div className="pb-4" />
        </div>
      </div>
    </div>
  );
}
