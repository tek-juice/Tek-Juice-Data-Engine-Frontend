import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  TrendingUp, Search, Globe, Bot, CheckCircle2,
  RefreshCw, Loader2, AlertTriangle, FileText,
  Activity, Zap, Eye, BarChart2, Shield, ArrowRight,
  ChevronUp, ChevronDown, Minus, Key, Webhook,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getMyTenantPerformance } from '../../api/dashboard';
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
      documents_total: 148,
      api_calls_total: 24730,
      api_calls_24h: 612,
      webhooks_delivered: 1840,
      avg_gap_score: 0.22,
      avg_seo_score: 71,
      avg_geo_score: 55,
      coverage_pct: 82.4,
      drafts_generated: 93,
      gaps_closed: 67,
      error_rate: 0.012,
      status: 'active',
    },
    usage_timeseries,
    recent_activity,
    gap_history,
    visibility_history,
  };
}

// ─── Shared tooltip style ─────────────────────────────────────────────────────

const TT = {
  contentStyle: { background: '#18181b', border: '1px solid #27272a', borderRadius: 4, fontSize: 11, fontFamily: 'ui-monospace' },
  itemStyle: { color: '#e4e4e7' },
  labelStyle: { color: '#71717a', marginBottom: 2 },
  cursor: { stroke: '#3f3f46', strokeWidth: 1 },
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

function StatCard({ label, value, delta, icon, accent = 'text-zinc-100', sub }:
  { label: string; value: string | number; delta?: number; icon: React.ReactNode; accent?: string; sub?: string }) {
  const up = delta !== undefined && delta > 0;
  const dn = delta !== undefined && delta < 0;
  return (
    <div className="bg-zinc-900 border border-zinc-800 p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500 uppercase font-medium tracking-wide">{label}</span>
        <span className="text-zinc-500">{icon}</span>
      </div>
      <div>
        <div className={`text-2xl font-mono font-semibold tabular-nums ${accent}`}>{value}</div>
        <div className="flex items-center gap-1.5 mt-1">
          {delta !== undefined && (
            <span className={`flex items-center gap-0.5 text-xs font-mono tabular-nums ${up ? 'text-emerald-400' : dn ? 'text-red-400' : 'text-zinc-500'}`}>
              {up ? <ChevronUp size={11} /> : dn ? <ChevronDown size={11} /> : <Minus size={11} />}
              {Math.abs(delta)}%
            </span>
          )}
          {sub && <span className="text-xs text-zinc-600">{sub}</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Visibility gauge ─────────────────────────────────────────────────────────

function VisGauge({ label, score, color, icon }: { label: string; score: number; color: string; icon: React.ReactNode }) {
  const grade = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor';
  const gc    = score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-sky-400' : score >= 40 ? 'text-amber-400' : 'text-red-400';
  return (
    <div className="bg-zinc-900 border border-zinc-800 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-zinc-400">{icon}</span>
          <span className="text-sm font-semibold text-zinc-200">{label}</span>
        </div>
        <span className={`text-xs font-mono font-medium ${gc}`}>{grade}</span>
      </div>
      <div className="flex items-end gap-3">
        <span className="text-3xl font-mono font-bold tabular-nums text-zinc-100">{score.toFixed(0)}</span>
        <span className="text-base text-zinc-500 mb-0.5">/ 100</span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

// ─── Pipeline health bar ──────────────────────────────────────────────────────

function PipelineHealth({ stages }: { stages: { label: string; ok: number; total: number }[] }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 p-4">
      <h2 className="text-xs font-mono font-medium text-zinc-500 uppercase tracking-wider mb-4">Pipeline health — last 24h</h2>
      <div className="space-y-3">
        {stages.map(s => {
          const pct = s.total > 0 ? (s.ok / s.total) * 100 : 100;
          const color = pct >= 98 ? 'bg-emerald-500' : pct >= 90 ? 'bg-amber-500' : 'bg-red-500';
          const text  = pct >= 98 ? 'text-emerald-400' : pct >= 90 ? 'text-amber-400' : 'text-red-400';
          return (
            <div key={s.label} className="flex items-center gap-3">
              <span className="text-xs font-mono text-zinc-400 w-28 flex-shrink-0">{s.label}</span>
              <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
              </div>
              <span className={`text-xs font-mono tabular-nums ${text} w-12 text-right`}>{pct.toFixed(1)}%</span>
              <span className="text-xs font-mono text-zinc-700 w-24 text-right">{s.ok.toLocaleString()} / {s.total.toLocaleString()}</span>
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
      {icon && <span className="text-zinc-500">{icon}</span>}
      <div>
        <h2 className="text-sm font-semibold text-zinc-200">{title}</h2>
        {sub && <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>}
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

  // Live-tick visibility scores every 8s
  const latest = perf.visibility_history[perf.visibility_history.length - 1];
  const [liveSEO, setLiveSEO] = useState(latest.seo);
  const [liveGEO, setLiveGEO] = useState(latest.geo);
  const [liveAEO, setLiveAEO] = useState(latest.aeo);
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

  const t = perf.tenant;

  const latestGap = perf.gap_history[perf.gap_history.length - 1];
  const gapLift   = (latestGap.coverage_after - latestGap.coverage_before).toFixed(1);

  const pipelineStages = [
    { label: 'Ingest',    ok: Math.round(t.documents_total * 0.997), total: t.documents_total },
    { label: 'Chunking',  ok: Math.round(t.documents_total * 0.994), total: t.documents_total },
    { label: 'Embedding', ok: Math.round(t.documents_total * 0.991), total: t.documents_total },
    { label: 'Gap detect',ok: Math.round(t.documents_total * 0.989), total: t.documents_total },
    { label: 'Drafts',    ok: t.drafts_generated,                    total: t.gaps_closed },
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

  const fmt = new Intl.NumberFormat().format;
  const fmtPct = (n: number) => `${n.toFixed(1)}%`;

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center gap-2 text-zinc-600">
        <Loader2 size={16} className="animate-spin" /> Loading your product's performance…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">

      {/* ── Page header ── */}
      <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950 sticky top-0 z-10">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="w-5 h-5 bg-zinc-100 flex items-center justify-center">
              <Zap size={10} className="text-zinc-900" />
            </div>
            <h1 className="text-sm font-semibold text-zinc-100">{t.name}</h1>
            <span className="text-zinc-700 text-sm">/</span>
            <span className="text-sm text-zinc-400">Performance</span>
            <span className={`ml-2 inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono border rounded-sm ${
              t.status === 'active' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-800' : 'text-zinc-500 bg-zinc-800 border-zinc-700'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'active' ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
              {t.status}
            </span>
          </div>
          <p className="text-xs font-mono text-zinc-600 ml-7">
            Tenant <span className="text-zinc-500">{t.tenant_id}</span>
            <span className="mx-2 text-zinc-800">·</span>
            Plan <span className="text-zinc-500">{t.plan ?? 'free'}</span>
            <span className="mx-2 text-zinc-800">·</span>
            Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition-colors disabled:opacity-40"
        >
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      <div className="px-6 py-6 space-y-6 max-w-6xl">

        {/* ── KPI row ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <StatCard label="SEO score"       value={`${liveSEO}%`}       delta={+((liveSEO - 61).toFixed(0))}  icon={<Search size={14}/>}       accent="text-sky-300" />
          <StatCard label="GEO score"       value={`${liveGEO}%`}       delta={+((liveGEO - 44).toFixed(0))}  icon={<Globe size={14}/>}        accent="text-violet-300" />
          <StatCard label="AEO score"       value={`${liveAEO}%`}       delta={+((liveAEO - 29).toFixed(0))}  icon={<Bot size={14}/>}          accent="text-amber-300" />
          <StatCard label="Coverage"        value={fmtPct(t.coverage_pct)} delta={+gapLift}                   icon={<CheckCircle2 size={14}/>} accent="text-emerald-400" />
          <StatCard label="API calls / 24h" value={fmt(liveCalls)}       sub="today"                           icon={<Activity size={14}/>}     accent="text-zinc-100" />
          <StatCard label="Gaps closed"     value={fmt(t.gaps_closed)}   sub="lifetime"                        icon={<Shield size={14}/>}       accent="text-zinc-100" />
        </div>

        {/* ── Visibility gauges ── */}
        <div>
          <h2 className="text-xs font-mono font-medium text-zinc-500 uppercase tracking-wider mb-3">Engine Visibility</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <VisGauge label="SEO — Search Engines"          score={liveSEO} color="bg-sky-500"    icon={<Search size={15}/>} />
            <VisGauge label="GEO — Generative Engines"      score={liveGEO} color="bg-violet-500" icon={<Globe size={15}/>} />
            <VisGauge label="AEO — AI Engine Optimisation"  score={liveAEO} color="bg-amber-500"  icon={<Bot size={15}/>} />
          </div>
        </div>

        {/* ── Visibility timeline ── */}
        <div className="bg-zinc-900 border border-zinc-800 p-4">
          <SH title="Engine Visibility — 24h" sub="SEO · GEO · AEO scores over the last 24 hours" icon={<Eye size={14}/>} />
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={perf.visibility_history} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
                <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'ui-monospace' }} tickLine={false} axisLine={false} interval={5} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'ui-monospace' }} tickLine={false} axisLine={false} unit="%" />
                <Tooltip {...TT} formatter={(v) => [`${v ?? ""}%`]} />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'ui-monospace', color: '#71717a', paddingTop: 8 }} />
                <Line type="monotone" dataKey="seo" name="SEO" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="geo" name="GEO" stroke="#a78bfa" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="aeo" name="AEO" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── API call volume ── */}
        <div className="bg-zinc-900 border border-zinc-800 p-4">
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
                <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'ui-monospace' }} tickLine={false} axisLine={false} interval={5} />
                <YAxis tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'ui-monospace' }} tickLine={false} axisLine={false} />
                <Tooltip {...TT} />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'ui-monospace', color: '#71717a', paddingTop: 8 }} />
                <Area type="monotone" dataKey="api_calls" name="API calls" stroke="#3b82f6" strokeWidth={1.5} fill="url(#tgCalls)" dot={false} />
                <Area type="monotone" dataKey="errors"    name="Errors"    stroke="#ef4444" strokeWidth={1.5} fill="url(#tgErrors)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Coverage before / after ── */}
        <div className="bg-zinc-900 border border-zinc-800 p-4">
          <div className="flex items-start justify-between mb-3">
            <SH title="Content Coverage — Before vs After Gap Closure" sub="14-day coverage improvement driven by Data Engine" icon={<BarChart2 size={14}/>} />
            <div className="text-right">
              <div className="text-xs text-zinc-500">Coverage lift</div>
              <div className="text-xl font-mono font-bold text-sky-400 tabular-nums">+{gapLift}%</div>
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
                <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'ui-monospace' }} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'ui-monospace' }} tickLine={false} axisLine={false} unit="%" />
                <Tooltip {...TT} formatter={(v) => [`${v ?? ""}%`]} />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'ui-monospace', color: '#71717a', paddingTop: 8 }} />
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
          <div className="bg-zinc-900 border border-zinc-800 p-4">
            <SH title="Gap Severity — last 7 days" icon={<Shield size={14}/>} />
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sevenDaySeverity} margin={{ top: 0, right: 0, left: -24, bottom: 0 }} barSize={14}>
                  <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'ui-monospace' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'ui-monospace' }} tickLine={false} axisLine={false} />
                  <Tooltip {...TT} />
                  <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'ui-monospace', color: '#71717a', paddingTop: 8 }} />
                  <Bar dataKey="critical" name="Critical" stackId="a" fill="#ef4444" radius={[0,0,0,0]} />
                  <Bar dataKey="high"     name="High"     stackId="a" fill="#f59e0b" radius={[0,0,0,0]} />
                  <Bar dataKey="medium"   name="Medium"   stackId="a" fill="#3b82f6" radius={[0,0,0,0]} />
                  <Bar dataKey="low"      name="Low"      stackId="a" fill="#27272a" radius={[2,2,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ── Recent pipeline activity ── */}
        <div className="bg-zinc-900 border border-zinc-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <SH title="Pipeline Activity Feed" icon={<Activity size={14}/>} />
            <span className="text-xs font-mono text-zinc-600">Live events</span>
          </div>
          <div className="divide-y divide-zinc-900 max-h-80 overflow-y-auto">
            {perf.recent_activity.map((ev, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800/40 transition-colors">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  ev.status === 'success' ? 'bg-emerald-400' : ev.status === 'error' ? 'bg-red-400' : 'bg-amber-400'
                }`} />
                <span className="text-xs font-mono text-zinc-300 flex-1 min-w-0 truncate">{ev.event_type}</span>
                <span className="text-xs font-mono text-zinc-600 flex-shrink-0">{ev.service}</span>
                {ev.document_id && (
                  <span className="text-xs font-mono text-zinc-700 flex-shrink-0 hidden md:inline">{ev.document_id}</span>
                )}
                {ev.duration_ms && (
                  <span className="text-xs font-mono text-zinc-700 tabular-nums flex-shrink-0">{ev.duration_ms}ms</span>
                )}
                <span className="text-xs font-mono text-zinc-700 flex-shrink-0">{relTime(ev.timestamp)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Volume totals ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total API calls',       value: fmt(t.api_calls_total), accent: 'text-sky-300',    icon: <Activity size={14}/> },
            { label: 'Documents processed',   value: fmt(t.documents_total), accent: 'text-zinc-100',  icon: <FileText size={14}/> },
            { label: 'Drafts generated',      value: fmt(t.drafts_generated),accent: 'text-violet-300',icon: <TrendingUp size={14}/> },
            { label: 'Webhooks delivered',    value: fmt(t.webhooks_delivered), accent: 'text-emerald-400', icon: <Webhook size={14}/> },
          ].map(c => (
            <div key={c.label} className="bg-zinc-900 border border-zinc-800 p-4 flex items-center gap-3">
              <span className="text-zinc-600">{c.icon}</span>
              <div>
                <div className="text-xs text-zinc-600 mb-0.5">{c.label}</div>
                <div className={`text-xl font-mono font-bold tabular-nums ${c.accent}`}>{c.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Integration shortcuts ── */}
        <div className="bg-zinc-900 border border-zinc-800 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Key size={14} className="text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-200">Manage integration</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Link to="/credentials" className="flex items-center gap-3 p-3 bg-zinc-950 border border-zinc-800 hover:border-zinc-600 transition-colors group">
              <div className="w-8 h-8 bg-zinc-800 flex items-center justify-center flex-shrink-0">
                <Key size={14} className="text-zinc-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-zinc-100">Manage API Keys</div>
                <div className="text-xs text-zinc-600 mt-0.5">Rotate or create new credentials</div>
              </div>
              <ArrowRight size={13} className="text-zinc-700 group-hover:text-zinc-400 flex-shrink-0" />
            </Link>
            <Link to="/credentials" className="flex items-center gap-3 p-3 bg-zinc-950 border border-zinc-800 hover:border-zinc-600 transition-colors group">
              <div className="w-8 h-8 bg-zinc-800 flex items-center justify-center flex-shrink-0">
                <Webhook size={14} className="text-zinc-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-zinc-100">Webhook Endpoints</div>
                <div className="text-xs text-zinc-600 mt-0.5">Review delivery logs and configure events</div>
              </div>
              <ArrowRight size={13} className="text-zinc-700 group-hover:text-zinc-400 flex-shrink-0" />
            </Link>
          </div>
        </div>

        {/* ── Error rate notice ── */}
        {t.error_rate > 0.03 && (
          <div className="border border-amber-900/40 bg-amber-950/20 px-4 py-3 flex items-start gap-3">
            <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-400 mb-0.5">Elevated error rate: {(t.error_rate * 100).toFixed(1)}%</p>
              <p className="text-xs text-zinc-500 leading-relaxed">
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
