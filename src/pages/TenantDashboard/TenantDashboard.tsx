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
import { getMyTenantPerformance } from '../../api/dashboard';
import { getQualityScore } from '../../api/gaps';
import type { QualityScoreResponse } from '../../types';
import type { TenantPerformance } from '../../types';

// ─── Seed data generator ──────────────────────────────────────────────────────

function seedMyPerformance(): TenantPerformance {
  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

  let calls = 28, seo = 67, geo = 51, aeo = 38;
  const usage_timeseries = hours.map(h => {
    calls = Math.max(0, calls + (Math.random() * 12 - 5));
    return { hour: h, api_calls: Math.round(calls), errors: Math.round(calls * 0.012), avg_latency_ms: Math.round(110 + Math.random() * 70) };
  });

  const visibility_history = hours.map(h => {
    seo = Math.min(99, Math.max(30, seo + (Math.random() * 4 - 1.5)));
    geo = Math.min(99, Math.max(20, geo + (Math.random() * 5 - 2)));
    aeo = Math.min(99, Math.max(10, aeo + (Math.random() * 6 - 2.5)));
    return { time: h, seo: +seo.toFixed(1), geo: +geo.toFixed(1), aeo: +aeo.toFixed(1) };
  });

  let coverage = 72, gapScore = 0.28;
  const gap_history = Array.from({ length: 14 }, (_, i) => {
    coverage = Math.min(99, coverage + Math.random() * 1.5);
    gapScore = Math.max(0.05, gapScore - Math.random() * 0.018);
    return { day: `D${i + 1}`, gap_score: +gapScore.toFixed(2), coverage_before: +(coverage - 6).toFixed(1), coverage_after: +coverage.toFixed(1), gaps_closed: Math.floor(Math.random() * 4 + 1) };
  });

  const event_types = ['document.completed', 'gap.detected', 'drafts.ready', 'ranking.updated', 'schema.generated', 'gap.resolved'];
  const recent_activity = Array.from({ length: 25 }, (_, i) => ({
    event_type: event_types[Math.floor(Math.random() * event_types.length)],
    service: ['ingest', 'gaps', 'seo', 'geo', 'drafts', 'schema'][Math.floor(Math.random() * 6)],
    document_id: `doc_${Math.random().toString(36).slice(2, 9)}`,
    timestamp: new Date(Date.now() - i * 480000).toISOString(),
    status: (Math.random() > 0.08 ? 'success' : 'error') as 'success' | 'error' | 'pending',
    duration_ms: Math.round(75 + Math.random() * 380),
  }));

  return {
    tenant: {
      tenant_id: 'my_tenant',
      name: 'My Product',
      key_prefix: 'de_prod',
      plan: 'pro',
      created_at: new Date(Date.now() - 21 * 86400000).toISOString(),
      last_active: new Date().toISOString(),
      status: 'active' as const,
      documents_total: 142,
      api_calls_total: 18740,
      api_calls_24h: 284,
      webhooks_delivered: 1820,
      avg_gap_score: 0.18,
      avg_seo_score: 67,
      avg_geo_score: 51,
      coverage_pct: 78.4,
      drafts_generated: 94,
      gaps_closed: 61,
      error_rate: 0.008,
    },
    usage_timeseries,
    visibility_history,
    gap_history,
    recent_activity,
  };
}

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
  const [perf, setPerf]             = useState<TenantPerformance>(seedMyPerformance());
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [qsData, setQsData]         = useState<QualityScoreResponse | null>(null);
  const [liveQS, setLiveQS]         = useState<number | null>(null);
  const [qsLoading, setQsLoading]   = useState(false);

  // Live-tick visibility scores every 8s
  const latest = perf.visibility_history[perf.visibility_history.length - 1];
  const [liveSEO, setLiveSEO]     = useState(latest.seo);
  const [liveGEO, setLiveGEO]     = useState(latest.geo);
  const [liveAEO, setLiveAEO]     = useState(latest.aeo);
  const [liveCalls, setLiveCalls] = useState(perf.tenant.api_calls_24h);

  useEffect(() => {
    const t = setInterval(() => {
      setLiveSEO(v => +Math.min(99, Math.max(30, v + (Math.random() * 2 - 0.8))).toFixed(1));
      setLiveGEO(v => +Math.min(99, Math.max(20, v + (Math.random() * 2 - 1))).toFixed(1));
      setLiveAEO(v => +Math.min(99, Math.max(10, v + (Math.random() * 3 - 1.2))).toFixed(1));
      setLiveCalls(v => v + Math.floor(Math.random() * 3));
    }, 8000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback((refreshMode = false) => {
    if (refreshMode) setRefreshing(true); else setLoading(true);
    getMyTenantPerformance()
      .then(data => { setPerf(data); setLastUpdated(new Date()); })
      .catch(() => { /* keep seed */ })
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setQsLoading(true);
    getQualityScore({
      content: 'This product helps businesses increase revenue by automating data pipelines. According to Gartner 2024, companies using automated ETL reduce data engineering costs by 40%. Our platform integrates with 50+ data sources.\n\n## Key Features\n- Real-time sync\n- No-code builder\n- SOC2 compliant',
      title: 'Data Automation Platform',
      query: 'data pipeline automation software',
      target_keywords: ['data pipeline', 'ETL automation', 'data integration'],
    })
      .then(res => { setQsData(res); setLiveQS(res.quality_score); })
      .catch(() => {})
      .finally(() => setQsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const t = perf.tenant;

  const latestGap = perf.gap_history[perf.gap_history.length - 1];
  const gapLift   = (latestGap.coverage_after - latestGap.coverage_before).toFixed(1);

  const pipelineStages = [
    { label: 'Ingest',     ok: Math.round(t.documents_total * 0.997), total: t.documents_total },
    { label: 'Chunking',   ok: Math.round(t.documents_total * 0.994), total: t.documents_total },
    { label: 'Embedding',  ok: Math.round(t.documents_total * 0.991), total: t.documents_total },
    { label: 'Gap detect', ok: Math.round(t.documents_total * 0.989), total: t.documents_total },
    { label: 'Drafts',     ok: t.drafts_generated,                     total: t.gaps_closed },
  ];

  const sevenDaySeverity = [
    { day: 'Mon', critical: 1, high: 3, medium: 5, low: 2 },
    { day: 'Tue', critical: 0, high: 4, medium: 4, low: 3 },
    { day: 'Wed', critical: 2, high: 2, medium: 6, low: 1 },
    { day: 'Thu', critical: 0, high: 3, medium: 3, low: 4 },
    { day: 'Fri', critical: 0, high: 2, medium: 4, low: 5 },
    { day: 'Sat', critical: 0, high: 1, medium: 3, low: 4 },
    { day: 'Sun', critical: 0, high: 2, medium: 2, low: 3 },
  ];

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
          <StatCard label="SEO score"       value={`${liveSEO}%`}       delta={+((liveSEO - 61).toFixed(0))}  icon={<Search size={14}/>}       color="var(--info)" />
          <StatCard label="GEO score"       value={`${liveGEO}%`}       delta={+((liveGEO - 44).toFixed(0))}  icon={<Globe size={14}/>}        color="#a78bfa" />
          <StatCard label="AEO score"       value={`${liveAEO}%`}       delta={+((liveAEO - 29).toFixed(0))}  icon={<Bot size={14}/>}          color="var(--warning)" />
          <StatCard label="Coverage"        value={fmtPct(t.coverage_pct)} delta={+gapLift}                   icon={<CheckCircle2 size={14}/>} color="var(--success)" />
          <StatCard label="API calls / 24h" value={fmt(liveCalls)}       sub="today"                          icon={<Activity size={14}/>} />
          <StatCard label="Gaps closed"     value={fmt(t.gaps_closed)}   sub="lifetime"                       icon={<Shield size={14}/>} />
          {liveQS !== null && (
            <StatCard
              label="Quality Score"
              value={`${liveQS.toFixed(1)}/10`}
              sub={qsData?.beats_paid_ads ? '✓ beats paid ads' : 'below paid ads'}
              icon={<Target size={14}/>}
              color={qsData?.beats_paid_ads ? 'var(--success)' : 'var(--warning)'}
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
            <VisGauge label="SEO — Search Engines"         score={liveSEO} barColor="var(--info)"   icon={<Search size={15}/>} />
            <VisGauge label="GEO — Generative Engines"     score={liveGEO} barColor="#a78bfa"       icon={<Globe size={15}/>} />
            <VisGauge label="AEO — AI Engine Optimisation" score={liveAEO} barColor="var(--warning)" icon={<Bot size={15}/>} />
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
                    {liveQS?.toFixed(1)}
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
                      <span className="ml-1" style={{ color: 'var(--text)' }}>{(qsData.rank_simulation.estimated_ctr * 100).toFixed(1)}%</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-3)' }}>Ads beaten</span>
                      <span className="ml-1" style={{ color: 'var(--text)' }}>{qsData.rank_simulation.paid_ads_beaten}/4</span>
                    </div>
                  </div>
                </div>
                {/* 3 dimension bars */}
                {Object.entries(qsData.dimensions).map(([key, dim]) => (
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
                    {qsData.rank_simulation.ad_benchmarks.map(b => (
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
                    {qsData.rank_simulation.uplift_steps.slice(0, 4).map((s, i) => (
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
              <LineChart data={perf.visibility_history} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
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
              <AreaChart data={perf.usage_timeseries} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
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
              <AreaChart data={perf.gap_history} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
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

          {/* Gap severity breakdown */}
          <div className="p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <SH title="Gap Severity — last 7 days" icon={<Shield size={14}/>} />
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sevenDaySeverity} margin={{ top: 0, right: 0, left: -24, bottom: 0 }} barSize={14}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
                  <Tooltip {...TT} />
                  <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-3)', paddingTop: 8 }} />
                  <Bar dataKey="critical" name="Critical" stackId="a" fill="#ef4444" radius={[0,0,0,0]} />
                  <Bar dataKey="high"     name="High"     stackId="a" fill="#f59e0b" radius={[0,0,0,0]} />
                  <Bar dataKey="medium"   name="Medium"   stackId="a" fill="#3b82f6" radius={[0,0,0,0]} />
                  <Bar dataKey="low"      name="Low"      stackId="a" fill="var(--surface-3)" radius={[2,2,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── Recent pipeline activity ── */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} className="overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
            <SH title="Pipeline Activity Feed" icon={<Activity size={14}/>} />
            <span className="text-xs" style={{ color: 'var(--text-3)', fontFamily: 'ui-monospace, monospace' }}>Live events</span>
          </div>
          <div className="divide-y max-h-80 overflow-y-auto" style={{ borderColor: 'var(--border)' }}>
            {perf.recent_activity.map((ev, i) => (
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
                {ev.document_id && (
                  <span className="text-xs flex-shrink-0 hidden md:inline" style={{ color: 'var(--text-3)', fontFamily: 'ui-monospace, monospace' }}>{ev.document_id}</span>
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
            { label: 'Total API calls',    value: fmt(t.api_calls_total),    color: 'var(--info)',    icon: <Activity size={14}/> },
            { label: 'Documents processed',value: fmt(t.documents_total),    color: 'var(--text)',    icon: <FileText size={14}/> },
            { label: 'Drafts generated',   value: fmt(t.drafts_generated),   color: '#a78bfa',        icon: <TrendingUp size={14}/> },
            { label: 'Webhooks delivered', value: fmt(t.webhooks_delivered), color: 'var(--success)', icon: <Webhook size={14}/> },
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
        {t.error_rate > 0.03 && (
          <div className="px-4 py-3 flex items-start gap-3" style={{ border: '1px solid var(--danger-border)', background: 'var(--danger-bg)' }}>
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} />
            <div>
              <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--warning)' }}>
                Elevated error rate: {(t.error_rate * 100).toFixed(1)}%
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
                More than 3% of API calls are returning errors. Check your integration and review the activity feed above.
              </p>
            </div>
          </div>
        )}

        <div className="pb-4" />
      </div>
    </div>
  );
}
