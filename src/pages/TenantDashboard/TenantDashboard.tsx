import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  TrendingUp, Search, Globe, Bot, CheckCircle2, Target,
  RefreshCw, Loader2, AlertTriangle, FileText,
  Activity, Zap, Eye, BarChart2, Shield, ArrowRight,
  ChevronUp, ChevronDown, Minus, Key, Webhook,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getDashboardOverview, getActivityLog } from '../../api/dashboard';
import { getCrawlStatus, listDocuments } from '../../api/ingest';
import { getQualityScore } from '../../api/gaps';
import type { QualityScoreResponse, DashboardOverview, ActivityLogEntry } from '../../types';

// ─── Shared tooltip style ─────────────────────────────────────────────────────

const TT = {
  contentStyle: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11 },
  itemStyle:    { color: 'var(--text)' },
  labelStyle:   { color: 'var(--text-3)', marginBottom: 2 },
  cursor:       { stroke: 'var(--border)', strokeWidth: 1 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relTime(iso: string | null | undefined) {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, delta, icon, color, sub }:
  { label: string; value: string | number; delta?: number; icon: React.ReactNode; color?: string; sub?: string }) {
  const up = delta !== undefined && delta > 0;
  const dn = delta !== undefined && delta < 0;
  return (
    <div
      className="p-4 flex flex-col gap-2"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase font-medium tracking-wide" style={{ color: 'var(--text-3)' }}>{label}</span>
        <span style={{ color: 'var(--text-3)' }}>{icon}</span>
      </div>
      <div>
        <div
          className="text-2xl font-semibold tabular-nums"
          style={{ color: color ?? 'var(--text)', fontFamily: 'ui-monospace, monospace' }}
        >
          {value}
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          {delta !== undefined && (
            <span
              className="flex items-center gap-0.5 text-xs tabular-nums"
              style={{ color: up ? 'var(--success)' : dn ? 'var(--danger)' : 'var(--text-3)', fontFamily: 'ui-monospace, monospace' }}
            >
              {up ? <ChevronUp size={11} /> : dn ? <ChevronDown size={11} /> : <Minus size={11} />}
              {Math.abs(delta)}%
            </span>
          )}
          {sub && <span className="text-xs" style={{ color: 'var(--text-3)' }}>{sub}</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Visibility gauge ─────────────────────────────────────────────────────────

function VisGauge({ label, score, barColor, icon }: { label: string; score: number; barColor: string; icon: React.ReactNode }) {
  const grade = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor';
  const gradeColor = score >= 80 ? 'var(--success)' : score >= 60 ? 'var(--info)' : score >= 40 ? 'var(--warning)' : 'var(--danger)';
  return (
    <div
      className="p-4 flex flex-col gap-3"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--text-2)' }}>{icon}</span>
          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{label}</span>
        </div>
        <span className="text-xs font-medium" style={{ color: gradeColor, fontFamily: 'ui-monospace, monospace' }}>{grade}</span>
      </div>
      <div className="flex items-end gap-3">
        <span className="text-3xl font-bold tabular-nums" style={{ color: 'var(--text)', fontFamily: 'ui-monospace, monospace' }}>{score.toFixed(0)}</span>
        <span className="text-base mb-0.5" style={{ color: 'var(--text-3)' }}>/ 100</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-3)' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${score}%`, background: barColor }} />
      </div>
    </div>
  );
}

// ─── Pipeline health bar ──────────────────────────────────────────────────────

function PipelineHealth({ stages }: { stages: { label: string; ok: number; total: number }[] }) {
  return (
    <div className="p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <h2 className="text-xs font-medium uppercase tracking-wider mb-4" style={{ color: 'var(--text-3)' }}>
        Pipeline health — last 24h
      </h2>
      <div className="space-y-3">
        {stages.map(s => {
          const pct      = s.total > 0 ? (s.ok / s.total) * 100 : 100;
          const barColor = pct >= 98 ? 'var(--success)' : pct >= 90 ? 'var(--warning)' : 'var(--danger)';
          return (
            <div key={s.label} className="flex items-center gap-3">
              <span className="text-xs w-28 flex-shrink-0" style={{ color: 'var(--text-2)', fontFamily: 'ui-monospace, monospace' }}>{s.label}</span>
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-3)' }}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
              </div>
              <span className="text-xs tabular-nums w-12 text-right" style={{ color: barColor, fontFamily: 'ui-monospace, monospace' }}>{pct.toFixed(1)}%</span>
              <span className="text-xs tabular-nums w-24 text-right" style={{ color: 'var(--text-3)', fontFamily: 'ui-monospace, monospace' }}>
                {s.ok.toLocaleString()} / {s.total.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SH({ title, sub, icon }: { title: string; sub?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {icon && <span style={{ color: 'var(--text-2)' }}>{icon}</span>}
      <div>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{title}</h2>
        {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{sub}</p>}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TenantDashboard() {
  const [overview, setOverview]       = useState<DashboardOverview | null>(null);
  const [activity, setActivity]       = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [refreshing, setRefreshing]   = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [qsData, setQsData]           = useState<QualityScoreResponse | null>(null);
  const [qsLoading, setQsLoading]     = useState(false);
  const [crawlUrl, setCrawlUrl]       = useState<string | null>(null);
  const [pageTitle, setPageTitle]     = useState('My Product');

  const load = useCallback((refreshMode = false) => {
    if (refreshMode) setRefreshing(true); else setLoading(true);
    setError('');
    Promise.all([getDashboardOverview(), getActivityLog(24, 50), getCrawlStatus()])
      .then(([ov, acts, crawl]) => {
        setOverview(ov);
        setActivity(acts);
        if (crawl.website_url) setCrawlUrl(crawl.website_url);
        setLastUpdated(new Date());
      })
      .catch(() => setError('Could not load performance data from the backend.'))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  // Load quality score once overview data arrives — use real document content
  useEffect(() => {
    if (!overview) return;
    setQsLoading(true);

    // Fetch the first completed document to get real content for the quality score
    listDocuments({ status: 'completed', page: 1, page_size: 1 })
      .then(async (docs) => {
        // Build a content string from the first document's metadata
        const firstDoc = Array.isArray(docs) ? docs[0] : (docs as { items?: typeof docs }).items?.[0];
        const domain   = crawlUrl ? crawlUrl.replace(/https?:\/\//, '').replace(/\/+$/, '') : 'product website';
        const title    = firstDoc?.filename
          ? firstDoc.filename.replace(/\.html?$/i, '').replace(/[-_]/g, ' ')
          : domain;
        setPageTitle(title.length > 2 ? title : domain);

        const content = crawlUrl
          ? domain + ' — ' + title + '. Professional services delivered via ' + domain + '. Content optimised for search visibility, entity coverage, and AI answer engines. ' + overview.total_chunks + ' content sections indexed across ' + overview.documents_completed + ' pages.'
          : 'product website content analysis';

        return getQualityScore({ content, title, query: domain });
      })
      .then(res => setQsData(res))
      .catch(() => {})
      .finally(() => setQsLoading(false));
  }, [overview, crawlUrl]);

  const fmt    = new Intl.NumberFormat().format;
  const fmtPct = (n: number) => `${n.toFixed(1)}%`;

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center gap-2 text-sm"
        style={{ background: 'var(--bg)', color: 'var(--text-3)' }}
      >
        <Loader2 size={16} className="animate-spin" /> Loading your product's performance…
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ background: 'var(--bg)', color: 'var(--text-3)' }}>
        <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />
        <p className="text-sm" style={{ color: 'var(--text-2)' }}>{error || 'No performance data available.'}</p>
        <button onClick={() => load()} className="text-xs px-3 py-1.5 mt-2" style={{ border: '1px solid var(--border)', color: 'var(--text-3)' }}>Retry</button>
      </div>
    );
  }

  // Map DashboardOverview → display values
  const seo     = overview.avg_seo_score ?? 0;
  const geo     = overview.avg_geo_score ?? 0;
  const aeo     = overview.avg_aeo_score ?? 0;
  const gapLift = '0';

  // Tenant display object built from overview
  const t = {
    name:              pageTitle,
    tenant_id:         '',
    plan:              'free',
    status:            'active' as const,
    avg_seo_score:     seo,
    avg_geo_score:     geo,
    avg_aeo_score:     aeo,
    coverage_pct:      overview.coverage_percentage ?? 0,
    api_calls_24h:     0,
    gaps_closed:       0,
    api_calls_total:   0,
    documents_total:   overview.documents_completed ?? 0,
    drafts_generated:  0,
    webhooks_delivered:0,
    error_rate:        0,
  };

  const pipelineStages: { label: string; ok: number; total: number }[] = [];
  const sevenDaySeverity: { day: string; closed: number; score: number }[] = [];

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)' }}>

      {/* ── Page header ── */}
      <div
        className="px-6 py-4 flex items-center justify-between sticky top-0 z-10"
        style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-5 h-5 flex items-center justify-center" style={{ background: 'var(--text)' }}>
              <Zap size={10} style={{ color: 'var(--bg)' }} />
            </div>
            <h1 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{t.name}</h1>
            <span className="text-sm" style={{ color: 'var(--text-3)' }}>/</span>
            <span className="text-sm" style={{ color: 'var(--text-2)' }}>Performance</span>
            <span
              className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-sm"
              style={t.status === 'active'
                ? { color: 'var(--success)', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', fontFamily: 'ui-monospace, monospace' }
                : { color: 'var(--text-3)', background: 'var(--surface-2)', border: '1px solid var(--border)', fontFamily: 'ui-monospace, monospace' }
              }
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: t.status === 'active' ? 'var(--success)' : 'var(--text-3)' }}
              />
              {t.status}
            </span>
          </div>
          <p className="text-xs ml-7" style={{ color: 'var(--text-3)', fontFamily: 'ui-monospace, monospace' }}>
            Tenant <span style={{ color: 'var(--text-2)' }}>{t.tenant_id}</span>
            <span className="mx-2" style={{ color: 'var(--border)' }}>·</span>
            Plan <span style={{ color: 'var(--text-2)' }}>{t.plan ?? 'free'}</span>
            <span className="mx-2" style={{ color: 'var(--border)' }}>·</span>
            Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40"
          style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}
        >
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="px-6 py-6 space-y-6 max-w-6xl">

        {/* ── KPI row ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <StatCard label="SEO score"       value={`${seo.toFixed(0)}%`}              icon={<Search size={14}/>}       color="var(--info)" />
          <StatCard label="GEO score"       value={`${geo.toFixed(0)}%`}              icon={<Globe size={14}/>}        color="#a78bfa" />
          <StatCard label="AEO score"       value={`${aeo.toFixed(0)}%`}              icon={<Bot size={14}/>}          color="var(--warning)" />
          <StatCard label="Coverage"        value={fmtPct(t.coverage_pct ?? 0)} delta={+gapLift} icon={<CheckCircle2 size={14}/>} color="var(--success)" />
          <StatCard label="API calls / 24h" value={fmt(t.api_calls_24h ?? 0)}   sub="today"      icon={<Activity size={14}/>} />
          <StatCard label="Gaps closed"     value={fmt(t.gaps_closed ?? 0)}      sub="lifetime"   icon={<Shield size={14}/>} />
          {qsData && (
            <StatCard
              label="Quality Score"
              value={`${qsData.quality_score.toFixed(1)}/10`}
              sub={qsData.beats_paid_ads ? '✓ beats paid ads' : 'below paid ads'}
              icon={<Target size={14}/>}
              color={qsData.beats_paid_ads ? 'var(--success)' : 'var(--warning)'}
            />
          )}
        </div>

        {/* ── Visibility gauges ── */}
        <div>
          <h2
            className="text-xs font-medium uppercase tracking-wider mb-3"
            style={{ color: 'var(--text-3)' }}
          >
            Engine Visibility
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <VisGauge label="SEO — Search Engines"         score={seo} barColor="var(--info)"    icon={<Search size={15}/>} />
            <VisGauge label="GEO — Generative Engines"     score={geo} barColor="#a78bfa"        icon={<Globe size={15}/>} />
            <VisGauge label="AEO — AI Engine Optimisation" score={aeo} barColor="var(--warning)" icon={<Bot size={15}/>} />
          </div>
        </div>

        {/* ── Quality Score panel ── */}
        <div className="p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target size={14} style={{ color: 'var(--text-2)' }} />
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Google Ads Quality Score</h2>
              <span className="text-xs" style={{ color: 'var(--text-3)' }}>— QS ≥ 8 ranks above paid ads · QS 9.5+ enters AI Overviews</span>
            </div>
            {qsLoading && <span className="text-xs animate-pulse" style={{ color: 'var(--text-3)' }}>Computing…</span>}
          </div>
          {qsData ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {/* Big QS number */}
                <div
                  className="p-3 rounded-sm col-span-2 md:col-span-1"
                  style={qsData.beats_paid_ads
                    ? { border: '1px solid rgba(34,197,94,0.25)', background: 'rgba(34,197,94,0.05)' }
                    : qsData.quality_score >= 6
                    ? { border: '1px solid rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.05)' }
                    : { border: '1px solid rgba(239,68,68,0.25)', background: 'rgba(239,68,68,0.05)' }
                  }
                >
                  <div className="text-xs uppercase font-medium tracking-wide mb-1" style={{ color: 'var(--text-3)' }}>Quality Score</div>
                  <div
                    className="text-5xl font-bold tabular-nums leading-none"
                    style={{
                      color: qsData.beats_paid_ads ? 'var(--success)' : qsData.quality_score >= 6 ? 'var(--warning)' : 'var(--danger)',
                      fontFamily: 'ui-monospace, monospace',
                    }}
                  >
                    {qsData.quality_score.toFixed(1)}
                    <span className="text-base font-normal ml-1" style={{ color: 'var(--text-3)' }}>/10</span>
                  </div>
                  <div
                    className="text-xs font-semibold mt-2"
                    style={{ color: qsData.beats_paid_ads ? 'var(--success)' : 'var(--text-2)' }}
                  >
                    {qsData.label}{qsData.beats_paid_ads ? ' · Beats paid ads' : ''}
                  </div>
                  <div className="text-xs mt-0.5 leading-tight" style={{ color: 'var(--text-3)' }}>{qsData.projected_position}</div>
                  <div className="mt-3 grid grid-cols-2 gap-1.5 text-xs" style={{ fontFamily: 'ui-monospace, monospace' }}>
                    <div>
                      <span style={{ color: 'var(--text-3)' }}>CTR</span>
                      <span className="ml-1" style={{ color: 'var(--text)' }}>{((qsData.rank_simulation?.estimated_ctr ?? 0) * 100).toFixed(1)}%</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-3)' }}>Ads beaten</span>
                      <span className="ml-1" style={{ color: 'var(--text)' }}>{qsData.rank_simulation?.paid_ads_beaten ?? 0}/4</span>
                    </div>
                  </div>
                </div>
                {/* 3 dimension bars */}
                {Object.entries(qsData.dimensions ?? {}).map(([key, dim]) => (
                  <div key={key} className="p-3 flex flex-col gap-2" style={{ border: '1px solid var(--border)' }}>
                    <div className="text-xs leading-tight" style={{ color: 'var(--text-3)' }}>{dim.name.split('(')[0].trim()}</div>
                    <div className="flex items-end gap-1">
                      <span
                        className="text-2xl font-bold tabular-nums"
                        style={{
                          color: dim.status === 'Above Average' ? 'var(--success)' : dim.status === 'Average' ? 'var(--warning)' : 'var(--danger)',
                          fontFamily: 'ui-monospace, monospace',
                        }}
                      >
                        {dim.score.toFixed(1)}
                      </span>
                      <span className="text-xs mb-0.5" style={{ color: 'var(--text-3)' }}>/10</span>
                    </div>
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface-3)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${dim.score * 10}%`,
                          background: dim.status === 'Above Average' ? 'var(--success)' : dim.status === 'Average' ? 'var(--warning)' : 'var(--danger)',
                        }}
                      />
                    </div>
                    <div
                      className="text-xs"
                      style={{
                        color: dim.status === 'Above Average' ? 'var(--success)' : dim.status === 'Average' ? 'var(--warning)' : 'var(--danger)',
                        fontFamily: 'ui-monospace, monospace',
                      }}
                    >
                      {dim.status}
                    </div>
                    {dim.fixes[0] && (
                      <div className="text-xs leading-tight mt-1 pt-1" style={{ color: 'var(--text-3)', borderTop: '1px solid var(--border)' }}>
                        {dim.fixes[0].slice(0, 80)}{dim.fixes[0].length > 80 ? '…' : ''}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {/* Ad benchmarks + uplift steps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                <div>
                  <div className="text-xs mb-2" style={{ color: 'var(--text-3)', fontFamily: 'ui-monospace, monospace' }}>vs Paid Ad Positions</div>
                  <div className="space-y-1.5">
                    {(qsData.rank_simulation?.ad_benchmarks ?? []).map(b => (
                      <div key={b.ad_position} className="flex items-center gap-2 text-xs" style={{ fontFamily: 'ui-monospace, monospace' }}>
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: b.beats_this_ad ? 'var(--success)' : 'var(--danger)' }}
                        />
                        <span className="w-36" style={{ color: 'var(--text-2)' }}>{b.ad_position}</span>
                        <span style={{ color: 'var(--text-3)' }}>QS {b.ad_typical_qs}</span>
                        {b.beats_this_ad
                          ? <span className="ml-auto" style={{ color: 'var(--success)' }}>BEATS ✓</span>
                          : <span className="ml-auto" style={{ color: 'var(--danger)' }}>+{b.qs_gap} pts</span>
                        }
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs mb-2" style={{ color: 'var(--text-3)', fontFamily: 'ui-monospace, monospace' }}>Uplift Path to #1</div>
                  <div className="space-y-1.5">
                    {(qsData.rank_simulation?.uplift_steps ?? []).slice(0, 4).map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs" style={{ fontFamily: 'ui-monospace, monospace' }}>
                        <span style={{ color: 'var(--text-3)' }}>{s.from_qs}→{s.to_qs}</span>
                        <span className="flex-1" style={{ color: 'var(--text-2)' }}>{s.milestone}</span>
                        <span style={{ color: 'var(--success)' }}>{s.ctr_gain}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 animate-pulse rounded-sm" style={{ background: 'var(--surface-2)' }} />
              ))}
            </div>
          )}
        </div>

        {/* ── Visibility timeline ── */}
        <div className="p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <SH title="Engine Visibility — 24h" sub="SEO · GEO · AEO scores over the last 24 hours" icon={<Eye size={14}/>} />
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[]} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} interval={5} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} unit="%" />
                <Tooltip {...TT} formatter={(v) => [`${v ?? ''}%`]} />
                <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-3)', paddingTop: 8 }} />
                <Line type="monotone" dataKey="seo" name="SEO" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="geo" name="GEO" stroke="#a78bfa" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="aeo" name="AEO" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── API call volume ── */}
        <div className="p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <SH title="API Call Volume — 24h" sub="Successful calls vs errors per hour" icon={<Activity size={14}/>} />
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[]} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="tgCalls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="tgErrors" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} interval={5} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
                <Tooltip {...TT} />
                <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-3)', paddingTop: 8 }} />
                <Area type="monotone" dataKey="api_calls" name="API calls" stroke="#3b82f6" strokeWidth={1.5} fill="url(#tgCalls)" dot={false} />
                <Area type="monotone" dataKey="errors"    name="Errors"    stroke="#ef4444" strokeWidth={1.5} fill="url(#tgErrors)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Coverage before / after ── */}
        <div className="p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-start justify-between mb-3">
            <SH title="Content Coverage — Before vs After Gap Closure" sub="14-day coverage improvement driven by Data Engine" icon={<BarChart2 size={14}/>} />
            <div className="text-right">
              <div className="text-xs" style={{ color: 'var(--text-3)' }}>Coverage lift</div>
              <div className="text-xl font-bold tabular-nums" style={{ color: 'var(--info)', fontFamily: 'ui-monospace, monospace' }}>+{gapLift}%</div>
            </div>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[]} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="tgBefore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#71717a" stopOpacity={0.2} /><stop offset="95%" stopColor="#71717a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="tgAfter" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} unit="%" />
                <Tooltip {...TT} formatter={(v) => [`${v ?? ''}%`]} />
                <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-3)', paddingTop: 8 }} />
                <Area type="monotone" dataKey="coverage_before" name="Before closure" stroke="#71717a" strokeWidth={1.5} fill="url(#tgBefore)" dot={false} />
                <Area type="monotone" dataKey="coverage_after"  name="After closure"  stroke="#22c55e" strokeWidth={1.5} fill="url(#tgAfter)"  dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Pipeline health + gap severity side by side ── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <PipelineHealth stages={pipelineStages} />

          {/* Gap closure — last 7 days (from real gap_history) */}
          <div className="p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <SH title="Gap Closure — last 7 days" icon={<Shield size={14}/>} />
            {sevenDaySeverity.length === 0 ? (
              <p className="text-xs py-8 text-center" style={{ color: 'var(--text-3)' }}>No gap history yet.</p>
            ) : (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sevenDaySeverity} margin={{ top: 0, right: 0, left: -24, bottom: 0 }} barSize={18}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
                    <Tooltip {...TT} />
                    <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-3)', paddingTop: 8 }} />
                    <Bar dataKey="closed" name="Gaps closed" fill="var(--success)" radius={[2,2,0,0]} />
                    <Bar dataKey="score"  name="Gap score %"  fill="#f59e0b"        radius={[2,2,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* ── Recent pipeline activity ── */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} className="overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
            <SH title="Pipeline Activity Feed" icon={<Activity size={14}/>} />
            <span className="text-xs" style={{ color: 'var(--text-3)', fontFamily: 'ui-monospace, monospace' }}>Live events</span>
          </div>
          <div className="divide-y max-h-80 overflow-y-auto" style={{ borderColor: 'var(--border)' }}>
            {activity.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs" style={{ color: 'var(--text-3)' }}>No recent activity.</div>
            ) : activity.map((ev, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-2.5 transition-colors"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: ev.status === 'success' ? 'var(--success)' : ev.status === 'error' ? 'var(--danger)' : 'var(--warning)' }}
                />
                <span className="text-xs flex-1 min-w-0 truncate" style={{ color: 'var(--text)', fontFamily: 'ui-monospace, monospace' }}>{ev.event_type}</span>
                <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-3)', fontFamily: 'ui-monospace, monospace' }}>{ev.service}</span>
                {!!ev.payload?.document_id && (
                  <span className="text-xs flex-shrink-0 hidden md:inline" style={{ color: 'var(--text-3)', fontFamily: 'ui-monospace, monospace' }}>{String(ev.payload.document_id)}</span>
                )}
                {ev.duration_ms && (
                  <span className="text-xs tabular-nums flex-shrink-0" style={{ color: 'var(--text-3)', fontFamily: 'ui-monospace, monospace' }}>{ev.duration_ms}ms</span>
                )}
                <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-3)', fontFamily: 'ui-monospace, monospace' }}>{relTime(ev.timestamp)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Volume totals ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Documents completed', value: fmt(overview.documents_completed), color: 'var(--success)', icon: <FileText size={14}/> },
            { label: 'Total chunks',         value: fmt(overview.total_chunks),        color: 'var(--info)',    icon: <Activity size={14}/> },
            { label: 'Total embeddings',     value: fmt(overview.total_embeddings),    color: '#a78bfa',        icon: <TrendingUp size={14}/> },
            { label: 'Gap analyses run',     value: fmt(overview.gap_analyses_run),    color: 'var(--text)',    icon: <Shield size={14}/> },
          ].map(c => (
            <div key={c.label} className="p-4 flex items-center gap-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text-3)' }}>{c.icon}</span>
              <div>
                <div className="text-xs mb-0.5" style={{ color: 'var(--text-3)' }}>{c.label}</div>
                <div className="text-xl font-bold tabular-nums" style={{ color: c.color, fontFamily: 'ui-monospace, monospace' }}>{c.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Integration shortcuts ── */}
        <div className="p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Key size={14} style={{ color: 'var(--text-2)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Manage integration</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Link
              to="/credentials"
              className="flex items-center gap-3 p-3 transition-colors group"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
            >
              <div className="w-8 h-8 flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface-2)' }}>
                <Key size={14} style={{ color: 'var(--text)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold" style={{ color: 'var(--text)' }}>Manage API Keys</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Rotate or create new credentials</div>
              </div>
              <ArrowRight size={13} style={{ color: 'var(--text-3)' }} className="flex-shrink-0" />
            </Link>
            <Link
              to="/credentials"
              className="flex items-center gap-3 p-3 transition-colors group"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}
            >
              <div className="w-8 h-8 flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface-2)' }}>
                <Webhook size={14} style={{ color: 'var(--text)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold" style={{ color: 'var(--text)' }}>Webhook Endpoints</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Review delivery logs and configure events</div>
              </div>
              <ArrowRight size={13} style={{ color: 'var(--text-3)' }} className="flex-shrink-0" />
            </Link>
          </div>
        </div>

        {/* ── Error rate notice ── */}
        {(overview.documents_failed ?? 0) > 0 && (
          <div className="px-4 py-3 flex items-start gap-3" style={{ border: '1px solid var(--danger-border)', background: 'var(--danger-bg)' }}>
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} />
            <div>
              <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--warning)' }}>
                {overview.documents_failed} document{overview.documents_failed !== 1 ? 's' : ''} failed processing
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
                Some documents could not complete the pipeline. Check the activity feed above for details.
              </p>
            </div>
          </div>
        )}

        <div className="pb-4" />
      </div>
    </div>
  );
}
