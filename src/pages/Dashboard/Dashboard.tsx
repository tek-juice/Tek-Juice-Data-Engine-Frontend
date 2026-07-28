import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  TrendingUp, AlertTriangle, CheckCircle2,
  RefreshCw, Eye, Search, Bot, Globe,
  ChevronUp, ChevronDown, Minus, ArrowRight,
  BarChart2, Shield, Zap, Key, Webhook,
} from 'lucide-react';
import { getDashboardOverview, getMetricsThroughput } from '../../api/dashboard';
import { getRankings } from '../../api/seo';

// ─── Seed data (used while API loads or as fallback) ──────────────────────────

function makeCoverageHistory() {
  const pts = [];
  let before = 38, after = 38;
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  for (let i = 0; i < 14; i++) {
    before = Math.min(95, before + (Math.random() * 3 - 0.5));
    after  = Math.min(99, after  + (Math.random() * 5 + 0.5));
    pts.push({
      day: days[i % 7],
      before: +before.toFixed(1),
      after:  +after.toFixed(1),
    });
  }
  return pts;
}

function makeVisibilityHistory() {
  const pts = [];
  let seo = 61, geo = 44, aeo = 29;
  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2,'0')}:00`);
  for (let i = 0; i < 24; i++) {
    seo = Math.min(99, Math.max(30, seo + (Math.random() * 4 - 1.5)));
    geo = Math.min(99, Math.max(20, geo + (Math.random() * 5 - 1.8)));
    aeo = Math.min(99, Math.max(10, aeo + (Math.random() * 6 - 2)));
    pts.push({ time: hours[i], seo: +seo.toFixed(1), geo: +geo.toFixed(1), aeo: +aeo.toFixed(1) });
  }
  return pts;
}

function makeGapMonitoring() {
  const pts = [];
  let gaps = 18;
  for (let i = 0; i < 30; i++) {
    const closed = i > 14 ? Math.floor(Math.random() * 3) : 0;
    gaps = Math.max(0, gaps + Math.floor(Math.random() * 2) - closed);
    pts.push({
      day: `D${i + 1}`,
      detected: gaps + Math.floor(Math.random() * 4),
      open: gaps,
      closed: i > 14 ? Math.floor(Math.random() * 8 + 2) : 0,
    });
  }
  return pts;
}

function makeRankHistory() {
  const kws = ['data pipeline tool', 'ETL automation', 'content gap analysis', 'AI content engine'];
  return kws.map(kw => {
    const pts = [];
    let pos = Math.floor(Math.random() * 30 + 5);
    for (let i = 0; i < 14; i++) {
      pos = Math.max(1, Math.min(60, pos + Math.floor(Math.random() * 6 - 3)));
      pts.push({ day: `D${i + 1}`, position: pos });
    }
    return { keyword: kw, current: pts[pts.length - 1].position, delta: pts[pts.length - 1].position - pts[0].position, history: pts };
  });
}

const SEED_COVERAGE   = makeCoverageHistory();
const SEED_VISIBILITY = makeVisibilityHistory();
const SEED_GAPS       = makeGapMonitoring();
const SEED_RANKS      = makeRankHistory();

// ─── Shared tooltip style ─────────────────────────────────────────────────────

const TOOLTIP_STYLE = {
  contentStyle: { background: '#18181b', border: '1px solid #27272a', borderRadius: 4, fontSize: 11, fontFamily: 'ui-monospace, monospace' },
  itemStyle: { color: '#e4e4e7' },
  labelStyle: { color: '#71717a', marginBottom: 2 },
  cursor: { stroke: '#3f3f46', strokeWidth: 1 },
};

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  delta?: number;
  icon: React.ReactNode;
  accent?: string;
}

function StatCard({ label, value, sub, delta, icon, accent = 'text-zinc-400' }: StatCardProps) {
  const up   = delta !== undefined && delta > 0;
  const down = delta !== undefined && delta < 0;
  return (
    <div className="bg-zinc-900 border border-zinc-800 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500 font-medium tracking-wide uppercase">{label}</span>
        <span className={accent}>{icon}</span>
      </div>
      <div>
        <div className="text-2xl font-mono font-semibold tabular-nums text-zinc-100">{value}</div>
        {(sub || delta !== undefined) && (
          <div className="flex items-center gap-1.5 mt-1">
            {delta !== undefined && (
              <span className={`flex items-center gap-0.5 text-xs font-mono tabular-nums ${up ? 'text-emerald-400' : down ? 'text-red-400' : 'text-zinc-500'}`}>
                {up ? <ChevronUp size={11} /> : down ? <ChevronDown size={11} /> : <Minus size={11} />}
                {Math.abs(delta)}%
              </span>
            )}
            {sub && <span className="text-xs text-zinc-600">{sub}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, sub, icon }: { title: string; sub?: string; icon?: React.ReactNode }) {
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

// ─── Visibility gauge (SEO / GEO / AEO) ──────────────────────────────────────

function VisibilityGauge({ label, score, color, icon }: {
  label: string; score: number; color: string; icon: React.ReactNode;
}) {
  const pct = Math.min(100, Math.max(0, score));
  const grade = pct >= 80 ? 'Excellent' : pct >= 60 ? 'Good' : pct >= 40 ? 'Fair' : 'Poor';
  const gradeColor = pct >= 80 ? 'text-emerald-400' : pct >= 60 ? 'text-sky-400' : pct >= 40 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-zinc-400">{icon}</span>
          <span className="text-sm font-semibold text-zinc-200">{label}</span>
        </div>
        <span className={`text-xs font-mono font-medium ${gradeColor}`}>{grade}</span>
      </div>
      <div className="flex items-end gap-3">
        <span className="text-3xl font-mono font-bold tabular-nums text-zinc-100">{pct.toFixed(0)}</span>
        <span className="text-base text-zinc-500 mb-0.5">/ 100</span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Rank table ───────────────────────────────────────────────────────────────

function RankTable({ ranks }: { ranks: typeof SEED_RANKS }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800">
        <SectionHeader title="Keyword Rankings" sub="SERP positions — last 14 days" icon={<Search size={14} />} />
      </div>
      <table className="w-full text-xs font-mono">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="py-2 px-4 text-left text-zinc-500 font-medium">Keyword</th>
            <th className="py-2 px-4 text-right text-zinc-500 font-medium">Position</th>
            <th className="py-2 px-4 text-right text-zinc-500 font-medium">Change</th>
            <th className="py-2 px-4 text-right text-zinc-500 font-medium w-36">Trend (14d)</th>
          </tr>
        </thead>
        <tbody>
          {ranks.map((r) => {
            const improved = r.delta < 0;
            const worsened = r.delta > 0;
            return (
              <tr key={r.keyword} className="border-b border-zinc-900 hover:bg-zinc-800 transition-colors">
                <td className="py-2 px-4 text-zinc-200">{r.keyword}</td>
                <td className="py-2 px-4 text-right tabular-nums text-zinc-100 font-semibold">#{r.current}</td>
                <td className="py-2 px-4 text-right tabular-nums">
                  <span className={`flex items-center justify-end gap-0.5 ${improved ? 'text-emerald-400' : worsened ? 'text-red-400' : 'text-zinc-500'}`}>
                    {improved ? <ChevronUp size={11} /> : worsened ? <ChevronDown size={11} /> : <Minus size={11} />}
                    {Math.abs(r.delta)}
                  </span>
                </td>
                <td className="py-2 px-4">
                  <div className="h-7 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={r.history}>
                        <Line type="monotone" dataKey="position" stroke={improved ? '#34d399' : worsened ? '#f87171' : '#71717a'} strokeWidth={1.5} dot={false} />
                        <YAxis domain={['dataMin - 2', 'dataMax + 2']} reversed hide />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Gap monitoring panel ─────────────────────────────────────────────────────

function GapMonitor({ data }: { data: typeof SEED_GAPS }) {
  const latest   = data[data.length - 1];
  const prev     = data[data.length - 2];
  const newGaps  = latest.detected - prev.detected;

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-4">
      <SectionHeader
        title="Continuous Gap Monitoring"
        sub="Detected vs closed over 30 days"
        icon={<Shield size={14} />}
      />
      <div className="flex items-center gap-6 mb-4">
        <div>
          <div className="text-xs text-zinc-500 mb-0.5">Currently Open</div>
          <div className="text-xl font-mono font-bold text-red-400 tabular-nums">{latest.open}</div>
        </div>
        <div>
          <div className="text-xs text-zinc-500 mb-0.5">Closed Today</div>
          <div className="text-xl font-mono font-bold text-emerald-400 tabular-nums">{latest.closed}</div>
        </div>
        <div>
          <div className="text-xs text-zinc-500 mb-0.5">New Detected</div>
          <div className={`text-xl font-mono font-bold tabular-nums ${newGaps > 0 ? 'text-amber-400' : 'text-zinc-400'}`}>{newGaps > 0 ? `+${newGaps}` : newGaps}</div>
        </div>
        <div className="ml-auto flex items-center gap-4 text-xs font-mono text-zinc-500">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-amber-400 inline-block" />Detected</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-red-400 inline-block" />Open</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-emerald-400 inline-block" />Closed</span>
        </div>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="gDetected" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gOpen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gClosed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'ui-monospace' }} tickLine={false} axisLine={false} interval={4} />
            <YAxis tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'ui-monospace' }} tickLine={false} axisLine={false} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Area type="monotone" dataKey="detected" stroke="#f59e0b" strokeWidth={1.5} fill="url(#gDetected)" dot={false} />
            <Area type="monotone" dataKey="open"     stroke="#ef4444" strokeWidth={1.5} fill="url(#gOpen)"     dot={false} />
            <Area type="monotone" dataKey="closed"   stroke="#22c55e" strokeWidth={1.5} fill="url(#gClosed)"   dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Before / After gap comparison ───────────────────────────────────────────

function GapComparison({ data }: { data: typeof SEED_COVERAGE }) {
  const latest = data[data.length - 1];
  const lift   = (latest.after - latest.before).toFixed(1);

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-4">
      <SectionHeader
        title="Coverage — Before vs After Gap Closure"
        sub="Content coverage % over time"
        icon={<BarChart2 size={14} />}
      />
      <div className="flex items-center gap-6 mb-4">
        <div>
          <div className="text-xs text-zinc-500 mb-0.5">Before</div>
          <div className="text-xl font-mono font-bold text-zinc-400 tabular-nums">{latest.before}%</div>
        </div>
        <ArrowRight size={14} className="text-zinc-600" />
        <div>
          <div className="text-xs text-zinc-500 mb-0.5">After</div>
          <div className="text-xl font-mono font-bold text-emerald-400 tabular-nums">{latest.after}%</div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-xs text-zinc-500 mb-0.5">Coverage lift</div>
          <div className="text-xl font-mono font-bold text-sky-400 tabular-nums">+{lift}%</div>
        </div>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="gBefore" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#71717a" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#71717a" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gAfter" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'ui-monospace' }} tickLine={false} axisLine={false} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'ui-monospace' }} tickLine={false} axisLine={false} unit="%" />
            <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`${v}%`]} />
            <Area type="monotone" dataKey="before" name="Before" stroke="#71717a" strokeWidth={1.5} fill="url(#gBefore)" dot={false} />
            <Area type="monotone" dataKey="after"  name="After"  stroke="#22c55e" strokeWidth={1.5} fill="url(#gAfter)"  dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-6 mt-2 text-xs font-mono text-zinc-500">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-zinc-500 inline-block" />Before closure</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-emerald-500 inline-block" />After closure</span>
      </div>
    </div>
  );
}

// ─── Engine visibility chart ──────────────────────────────────────────────────

function VisibilityTimeline({ data }: { data: typeof SEED_VISIBILITY }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 p-4">
      <SectionHeader
        title="Engine Visibility — 24h"
        sub="SEO · GEO · AEO scores across all engines"
        icon={<Eye size={14} />}
      />
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'ui-monospace' }} tickLine={false} axisLine={false} interval={5} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'ui-monospace' }} tickLine={false} axisLine={false} unit="%" />
            <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`${v}%`]} />
            <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'ui-monospace', color: '#71717a', paddingTop: 8 }} />
            <Line type="monotone" dataKey="seo" name="SEO"  stroke="#3b82f6" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="geo" name="GEO"  stroke="#a78bfa" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="aeo" name="AEO"  stroke="#f59e0b" strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Top nav ──────────────────────────────────────────────────────────────────

function TopNav({ lastUpdated, onRefresh, refreshing }: {
  lastUpdated: Date;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const fmt = lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return (
    <header className="flex items-center justify-between px-5 h-12 border-b border-zinc-800 bg-zinc-950 flex-shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 bg-zinc-100 flex items-center justify-center">
          <Zap size={11} className="text-zinc-900" />
        </div>
        <span className="text-sm font-semibold text-zinc-100">Data Engine</span>
        <span className="text-zinc-700 text-sm">/</span>
        <span className="text-sm text-zinc-400">Analytics</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs font-mono text-zinc-600">
          Updated {fmt}
        </span>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-zinc-100 transition-colors disabled:opacity-40"
        >
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>
    </header>
  );
}

// ─── Root Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [coverageData]   = useState(SEED_COVERAGE);
  const [visibilityData] = useState(SEED_VISIBILITY);
  const [gapData]        = useState(SEED_GAPS);
  const [rankData]       = useState(SEED_RANKS);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Live-tick the visibility scores every 8s to simulate monitoring
  const [liveSEO, setLiveSEO] = useState(visibilityData[visibilityData.length - 1].seo);
  const [liveGEO, setLiveGEO] = useState(visibilityData[visibilityData.length - 1].geo);
  const [liveAEO, setLiveAEO] = useState(visibilityData[visibilityData.length - 1].aeo);
  const [liveGaps, setLiveGaps] = useState(gapData[gapData.length - 1].open);
  const [liveCoverage, setLiveCoverage] = useState(coverageData[coverageData.length - 1].after);
  const [liveRank, setLiveRank] = useState(rankData[0].current);

  useEffect(() => {
    const t = setInterval(() => {
      setLiveSEO(v  => +Math.min(99, Math.max(30, v + (Math.random() * 2 - 0.8))).toFixed(1));
      setLiveGEO(v  => +Math.min(99, Math.max(20, v + (Math.random() * 2 - 1))).toFixed(1));
      setLiveAEO(v  => +Math.min(99, Math.max(10, v + (Math.random() * 3 - 1.2))).toFixed(1));
      setLiveGaps(v => Math.max(0, v + (Math.random() > 0.7 ? -1 : Math.random() > 0.85 ? 1 : 0)));
      setLiveCoverage(v => +Math.min(99, Math.max(60, v + (Math.random() * 0.4 - 0.1))).toFixed(1));
      setLiveRank(v => Math.max(1, Math.min(60, v + (Math.random() > 0.6 ? -1 : Math.random() > 0.75 ? 1 : 0))));
    }, 8000);
    return () => clearInterval(t);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Real API calls — will use seed data if backend is not yet connected
      await Promise.allSettled([
        getDashboardOverview(),
        getMetricsThroughput(24, 60),
        getRankings('example.com', 'data pipeline tool', 30),
      ]);
      setLastUpdated(new Date());
    } finally {
      setRefreshing(false);
    }
  }, []);

  const latestGap = gapData[gapData.length - 1];
  const gapSeverity = liveGaps === 0 ? 'None' : liveGaps < 5 ? 'Low' : liveGaps < 12 ? 'Medium' : liveGaps < 20 ? 'High' : 'Critical';
  const severityColor = liveGaps === 0 ? 'text-emerald-400' : liveGaps < 5 ? 'text-sky-400' : liveGaps < 12 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-200 overflow-hidden">
      <TopNav lastUpdated={lastUpdated} onRefresh={handleRefresh} refreshing={refreshing} />

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">

        {/* ── Stat row ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <StatCard label="SEO Score"      value={`${liveSEO}%`}     delta={+((liveSEO - 61).toFixed(0))}  icon={<Search size={15} />}    accent="text-sky-400" />
          <StatCard label="GEO Score"      value={`${liveGEO}%`}     delta={+((liveGEO - 44).toFixed(0))}  icon={<Globe size={15} />}     accent="text-violet-400" />
          <StatCard label="AEO Score"      value={`${liveAEO}%`}     delta={+((liveAEO - 29).toFixed(0))}  icon={<Bot size={15} />}       accent="text-amber-400" />
          <StatCard label="Open Gaps"      value={liveGaps}           sub={gapSeverity}                      icon={<AlertTriangle size={15} />} accent={severityColor} />
          <StatCard label="Coverage"       value={`${liveCoverage}%`} delta={+((liveCoverage - 38).toFixed(0))} icon={<CheckCircle2 size={15} />} accent="text-emerald-400" />
          <StatCard label="Top Rank"       value={`#${liveRank}`}     sub={rankData[0].keyword.slice(0, 18) + '…'} icon={<TrendingUp size={15} />} accent="text-zinc-400" />
        </div>

        {/* ── Visibility gauges ── */}
        <div>
          <h2 className="text-xs font-mono font-medium text-zinc-500 uppercase tracking-wider mb-3">
            Engine Visibility
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <VisibilityGauge label="SEO — Search Engines"       score={liveSEO} color="bg-sky-500"    icon={<Search size={15} />} />
            <VisibilityGauge label="GEO — Generative Engines"   score={liveGEO} color="bg-violet-500" icon={<Globe size={15} />} />
            <VisibilityGauge label="AEO — AI Engine Optimisation" score={liveAEO} color="bg-amber-500" icon={<Bot size={15} />} />
          </div>
        </div>

        {/* ── Visibility timeline ── */}
        <VisibilityTimeline data={visibilityData} />

        {/* ── Gap monitoring ── */}
        <GapMonitor data={gapData} />

        {/* ── Before / after coverage ── */}
        <GapComparison data={coverageData} />

        {/* ── Keyword rankings ── */}
        <RankTable ranks={rankData.map((r, i) => ({
          ...r,
          current: i === 0 ? liveRank : r.current,
        }))} />

        {/* ── Gap severity breakdown ── */}
        <div className="bg-zinc-900 border border-zinc-800 p-4">
          <SectionHeader title="Gap Severity Breakdown" sub="Count of open gaps by severity — last 7 days" icon={<BarChart2 size={14} />} />
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { day: 'Mon', critical: 2, high: 5, medium: 8, low: 3 },
                  { day: 'Tue', critical: 1, high: 6, medium: 7, low: 4 },
                  { day: 'Wed', critical: 3, high: 4, medium: 9, low: 2 },
                  { day: 'Thu', critical: 1, high: 3, medium: 6, low: 5 },
                  { day: 'Fri', critical: 0, high: 4, medium: 5, low: 6 },
                  { day: 'Sat', critical: 0, high: 2, medium: 4, low: 7 },
                  { day: 'Sun', critical: liveGaps > 15 ? 2 : 0, high: Math.min(liveGaps, 4), medium: Math.max(0, liveGaps - 4), low: 3 },
                ]}
                margin={{ top: 0, right: 0, left: -24, bottom: 0 }}
                barSize={14}
              >
                <CartesianGrid stroke="#27272a" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'ui-monospace' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#52525b', fontFamily: 'ui-monospace' }} tickLine={false} axisLine={false} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'ui-monospace', color: '#71717a', paddingTop: 8 }} />
                <Bar dataKey="critical" name="Critical" stackId="a" fill="#ef4444" radius={[0,0,0,0]} />
                <Bar dataKey="high"     name="High"     stackId="a" fill="#f59e0b" radius={[0,0,0,0]} />
                <Bar dataKey="medium"   name="Medium"   stackId="a" fill="#3b82f6" radius={[0,0,0,0]} />
                <Bar dataKey="low"      name="Low"      stackId="a" fill="#27272a" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Recent gap detections ── */}
        <div className="bg-zinc-900 border border-zinc-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <SectionHeader title="Recent Gap Detections" icon={<AlertTriangle size={14} />} />
            <span className="text-xs font-mono text-zinc-600">{latestGap.detected} total</span>
          </div>
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="py-2 px-4 text-left text-zinc-500 font-medium">Topic</th>
                <th className="py-2 px-4 text-left text-zinc-500 font-medium">Intent</th>
                <th className="py-2 px-4 text-right text-zinc-500 font-medium">Severity</th>
                <th className="py-2 px-4 text-right text-zinc-500 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { topic: 'Batch processing latency optimisation', intent: 'How-to',       severity: 'high',     status: 'open' },
                { topic: 'Real-time streaming architecture',       intent: 'Informational', severity: 'critical', status: 'open' },
                { topic: 'Schema registry integration guide',      intent: 'How-to',       severity: 'medium',   status: 'drafting' },
                { topic: 'Connector SDK authentication patterns',  intent: 'Technical',    severity: 'high',     status: 'open' },
                { topic: 'Cost optimisation on cloud pipelines',   intent: 'Commercial',   severity: 'medium',   status: 'closed' },
                { topic: 'Multi-tenant data isolation strategies', intent: 'Technical',    severity: 'low',      status: 'closed' },
              ].map((g, i) => {
                const sc = g.severity === 'critical' ? 'text-red-400' : g.severity === 'high' ? 'text-amber-400' : g.severity === 'medium' ? 'text-sky-400' : 'text-zinc-400';
                const ss = g.status === 'closed' ? 'text-emerald-400' : g.status === 'drafting' ? 'text-violet-400' : 'text-zinc-400';
                return (
                  <tr key={i} className="border-b border-zinc-900 hover:bg-zinc-800 transition-colors">
                    <td className="py-2 px-4 text-zinc-200">{g.topic}</td>
                    <td className="py-2 px-4 text-zinc-500">{g.intent}</td>
                    <td className={`py-2 px-4 text-right capitalize ${sc}`}>{g.severity}</td>
                    <td className={`py-2 px-4 text-right capitalize ${ss}`}>{g.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Integrate your product ── */}
        <div className="bg-zinc-900 border border-zinc-800 p-5">
          <div className="flex items-center gap-2 mb-1">
            <Key size={14} className="text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-200">Integrate your product</h2>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed mb-4">
            Connect any product's backend to Data Engine using an API key. Once connected,
            Data Engine automatically runs gap detection, GEO/SEO scoring, and AI drafts
            against your content — pushing results back via webhook.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Link
              to="/credentials"
              className="flex items-center gap-3 p-3 bg-zinc-950 border border-zinc-800 hover:border-zinc-600 transition-colors group"
            >
              <div className="w-8 h-8 bg-zinc-800 flex items-center justify-center flex-shrink-0">
                <Key size={14} className="text-zinc-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-zinc-100">Create API Key</div>
                <div className="text-xs text-zinc-600 mt-0.5">Generate credentials for your backend</div>
              </div>
              <ArrowRight size={13} className="text-zinc-700 group-hover:text-zinc-400 transition-colors flex-shrink-0" />
            </Link>
            <Link
              to="/credentials"
              className="flex items-center gap-3 p-3 bg-zinc-950 border border-zinc-800 hover:border-zinc-600 transition-colors group"
            >
              <div className="w-8 h-8 bg-zinc-800 flex items-center justify-center flex-shrink-0">
                <Webhook size={14} className="text-zinc-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-zinc-100">Register Webhook</div>
                <div className="text-xs text-zinc-600 mt-0.5">Receive real-time visibility events</div>
              </div>
              <ArrowRight size={13} className="text-zinc-700 group-hover:text-zinc-400 transition-colors flex-shrink-0" />
            </Link>
          </div>
        </div>

        <div className="pb-4" />
      </div>
    </div>
  );
}
