import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  Building2, RefreshCw, Loader2, AlertTriangle,
  Search, Globe, Bot,
  FileText, Zap, Activity, ChevronDown, ChevronUp,
  Minus, ArrowRight, X, Eye,
} from 'lucide-react';
import { listTenants, getTenantPerformance } from '../../api/dashboard';
import type { TenantSummary, TenantPerformance } from '../../types';

// ─── Seed data generators ─────────────────────────────────────────────────────

function seedTenants(): TenantSummary[] {
  const names = [
    { name: 'Acme Corp',         prefix: 'de_acme',  plan: 'enterprise', status: 'active'  as const },
    { name: 'TechFlow Ltd',      prefix: 'de_tfl',   plan: 'pro',        status: 'active'  as const },
    { name: 'Nova Analytics',    prefix: 'de_nova',  plan: 'pro',        status: 'idle'    as const },
    { name: 'Pulse Media',       prefix: 'de_pulse', plan: 'free',       status: 'active'  as const },
    { name: 'EdgeScale Inc',     prefix: 'de_edge',  plan: 'enterprise', status: 'error'   as const },
    { name: 'Bright Content Co', prefix: 'de_bcc',   plan: 'pro',        status: 'active'  as const },
  ];
  return names.map((n, i) => ({
    tenant_id: `t_${String(i + 1).padStart(4, '0')}`,
    name: n.name, key_prefix: n.prefix, plan: n.plan,
    created_at: new Date(Date.now() - (30 - i * 4) * 86400000).toISOString(),
    last_active: n.status !== 'idle' ? new Date(Date.now() - i * 3600000).toISOString() : null,
    documents_total: Math.floor(Math.random() * 400 + 20),
    api_calls_total: Math.floor(Math.random() * 50000 + 1000),
    api_calls_24h:   Math.floor(Math.random() * 800 + 10),
    webhooks_delivered: Math.floor(Math.random() * 3000 + 50),
    avg_gap_score: +(Math.random() * 0.5 + 0.1).toFixed(2),
    avg_seo_score: +(Math.random() * 40 + 45).toFixed(1),
    avg_geo_score: +(Math.random() * 35 + 35).toFixed(1),
    coverage_pct:  +(Math.random() * 30 + 60).toFixed(1),
    drafts_generated: Math.floor(Math.random() * 200 + 10),
    gaps_closed: Math.floor(Math.random() * 150 + 5),
    error_rate: n.status === 'error' ? +(Math.random() * 0.15 + 0.05).toFixed(3) : +(Math.random() * 0.02).toFixed(3),
    status: n.status,
  }));
}

function seedTenantPerformance(t: TenantSummary): TenantPerformance {
  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2,'0')}:00`);
  let calls = t.api_calls_24h / 24;
  const usage_timeseries = hours.map(h => {
    calls = Math.max(0, calls + (Math.random() * 10 - 4));
    return { hour: h, api_calls: Math.round(calls), errors: Math.round(calls * t.error_rate), avg_latency_ms: Math.round(120 + Math.random() * 80) };
  });

  let seo = t.avg_seo_score, geo = t.avg_geo_score, aeo = 30;
  const visibility_history = hours.map(h => {
    seo = Math.min(99, Math.max(20, seo + (Math.random() * 4 - 1.8)));
    geo = Math.min(99, Math.max(15, geo + (Math.random() * 5 - 2)));
    aeo = Math.min(99, Math.max(10, aeo + (Math.random() * 6 - 2.5)));
    return { time: h, seo: +seo.toFixed(1), geo: +geo.toFixed(1), aeo: +aeo.toFixed(1) };
  });

  let coverage = t.coverage_pct - 15, gapScore = t.avg_gap_score + 0.2;
  const gap_history = Array.from({ length: 14 }, (_, i) => {
    coverage = Math.min(99, coverage + Math.random() * 2);
    gapScore = Math.max(0.05, gapScore - Math.random() * 0.02);
    return { day: `D${i + 1}`, gap_score: +gapScore.toFixed(2), coverage_before: +(coverage - 5).toFixed(1), coverage_after: +coverage.toFixed(1), gaps_closed: Math.floor(Math.random() * 5) };
  });

  const event_types = ['document.completed', 'gap.detected', 'drafts.ready', 'ranking.updated', 'document.failed', 'gap.resolved'];
  const recent_activity = Array.from({ length: 20 }, (_, i) => ({
    event_type: event_types[Math.floor(Math.random() * event_types.length)],
    service: ['ingest', 'gaps', 'seo', 'geo', 'drafts'][Math.floor(Math.random() * 5)],
    document_id: `doc_${Math.random().toString(36).slice(2,9)}`,
    timestamp: new Date(Date.now() - i * 600000).toISOString(),
    status: (Math.random() > 0.1 ? 'success' : 'error') as 'success' | 'error' | 'pending',
    duration_ms: Math.round(80 + Math.random() * 400),
  }));

  return { tenant: t, usage_timeseries, recent_activity, gap_history, visibility_history };
}

// ─── Shared tooltip style ─────────────────────────────────────────────────────

const TT = {
  contentStyle: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11 },
  itemStyle:    { color: 'var(--text)' },
  labelStyle:   { color: 'var(--text-3)', marginBottom: 2 },
  cursor:       { stroke: 'var(--border)', strokeWidth: 1 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, suffix = '') { return `${n.toLocaleString()}${suffix}`; }
function fmtPct(n: number) { return `${n.toFixed(1)}%`; }
function relTime(iso: string | null | undefined) {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: TenantSummary['status'] }) {
  const style = status === 'active'
    ? { color: 'var(--success)', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }
    : status === 'idle'
    ? { color: 'var(--text-3)', background: 'var(--surface-2)', border: '1px solid var(--border)' }
    : { color: 'var(--danger)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' };
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-sm"
      style={{ ...style, fontFamily: 'ui-monospace, monospace' }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: status === 'active' ? 'var(--success)' : status === 'idle' ? 'var(--text-3)' : 'var(--danger)' }}
      />
      {status}
    </span>
  );
}

// ─── Plan badge ───────────────────────────────────────────────────────────────

function PlanBadge({ plan }: { plan?: string }) {
  const style = plan === 'enterprise'
    ? { color: '#a78bfa', borderColor: 'rgba(167,139,250,0.3)' }
    : plan === 'pro'
    ? { color: 'var(--info)', borderColor: 'rgba(59,130,246,0.3)' }
    : { color: 'var(--text-3)', borderColor: 'var(--border)' };
  return (
    <span
      className="px-1.5 py-0.5 text-xs border"
      style={{ ...style, fontFamily: 'ui-monospace, monospace' }}
    >
      {plan ?? 'free'}
    </span>
  );
}

// ─── Stat mini card ───────────────────────────────────────────────────────────

function Mini({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div>
      <div className="text-xs mb-0.5" style={{ color: 'var(--text-3)' }}>{label}</div>
      <div
        className="text-lg font-bold tabular-nums"
        style={{ color: color ?? 'var(--text)', fontFamily: 'ui-monospace, monospace' }}
      >
        {value}
      </div>
    </div>
  );
}

// ─── Tenant row ───────────────────────────────────────────────────────────────

function TenantRow({ t, onSelect }: { t: TenantSummary; onSelect: (t: TenantSummary) => void }) {
  return (
    <tr
      className="transition-colors cursor-pointer group"
      style={{ borderBottom: '1px solid var(--border)' }}
      onClick={() => onSelect(t)}
    >
      <td className="py-3 px-4">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
          >
            <Building2 size={12} style={{ color: 'var(--text-2)' }} />
          </div>
          <div>
            <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>{t.name}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)', fontFamily: 'ui-monospace, monospace' }}>{t.key_prefix}_••••••••••••</div>
          </div>
        </div>
      </td>
      <td className="py-3 px-4"><PlanBadge plan={t.plan} /></td>
      <td className="py-3 px-4"><StatusBadge status={t.status} /></td>
      <td className="py-3 px-4 text-xs tabular-nums" style={{ color: 'var(--text-2)', fontFamily: 'ui-monospace, monospace' }}>
        {fmt(t.api_calls_24h)}<span style={{ color: 'var(--text-3)' }}>/24h</span>
      </td>
      <td className="py-3 px-4 text-xs tabular-nums" style={{ color: 'var(--text-2)', fontFamily: 'ui-monospace, monospace' }}>{fmt(t.documents_total)}</td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full overflow-hidden max-w-[60px]" style={{ background: 'var(--surface-3)' }}>
            <div className="h-full rounded-full" style={{ width: `${t.avg_seo_score}%`, background: 'var(--info)' }} />
          </div>
          <span className="text-xs tabular-nums" style={{ color: 'var(--text-2)', fontFamily: 'ui-monospace, monospace' }}>{t.avg_seo_score.toFixed(0)}</span>
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full overflow-hidden max-w-[60px]" style={{ background: 'var(--surface-3)' }}>
            <div className="h-full rounded-full" style={{ width: `${t.avg_geo_score}%`, background: '#a78bfa' }} />
          </div>
          <span className="text-xs tabular-nums" style={{ color: 'var(--text-2)', fontFamily: 'ui-monospace, monospace' }}>{t.avg_geo_score.toFixed(0)}</span>
        </div>
      </td>
      <td className="py-3 px-4 text-xs" style={{ color: 'var(--text-3)', fontFamily: 'ui-monospace, monospace' }}>{relTime(t.last_active)}</td>
      <td className="py-3 px-4 text-right">
        <ArrowRight size={13} className="ml-auto transition-colors" style={{ color: 'var(--text-3)' }} />
      </td>
    </tr>
  );
}

// ─── Tenant detail panel (drawer) ─────────────────────────────────────────────

function TenantDetailPanel({ tenantId, seed, onClose }: {
  tenantId: string;
  seed: TenantSummary;
  onClose: () => void;
}) {
  const [perf, setPerf]       = useState<TenantPerformance>(seedTenantPerformance(seed));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getTenantPerformance(tenantId)
      .then(setPerf)
      .catch(() => { /* keep seed */ })
      .finally(() => setLoading(false));
  }, [tenantId]);

  const t = perf.tenant;

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* backdrop */}
      <div className="flex-1 bg-black/50" onClick={onClose} />
      {/* panel */}
      <div
        className="w-full max-w-2xl flex flex-col overflow-hidden"
        style={{ background: 'var(--bg)', borderLeft: '1px solid var(--border)' }}
      >

        {/* header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 flex items-center justify-center"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
            >
              <Building2 size={14} style={{ color: 'var(--text)' }} />
            </div>
            <div>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{t.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs" style={{ color: 'var(--text-3)', fontFamily: 'ui-monospace, monospace' }}>{t.tenant_id}</span>
                <PlanBadge plan={t.plan} />
                <StatusBadge status={t.status} />
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="transition-colors p-1"
            style={{ color: 'var(--text-3)' }}
          >
            <X size={16} />
          </button>
        </div>

        {loading && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.4)' }}
          >
            <Loader2 size={18} className="animate-spin" style={{ color: 'var(--text-2)' }} />
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

          {/* ── KPI row ── */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'API calls / 24h', value: fmt(t.api_calls_24h),    color: 'var(--info)' },
              { label: 'Docs total',       value: fmt(t.documents_total),  color: undefined },
              { label: 'Gaps closed',      value: fmt(t.gaps_closed),      color: 'var(--success)' },
              { label: 'Error rate',       value: fmtPct(t.error_rate * 100), color: t.error_rate > 0.05 ? 'var(--danger)' : undefined },
            ].map(c => (
              <div key={c.label} className="p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <Mini label={c.label} value={c.value} color={c.color} />
              </div>
            ))}
          </div>

          {/* ── Visibility scores ── */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'SEO', score: t.avg_seo_score, barColor: 'var(--info)',   icon: <Search size={12} /> },
              { label: 'GEO', score: t.avg_geo_score, barColor: '#a78bfa',       icon: <Globe size={12} /> },
              { label: 'AEO', score: 30,               barColor: 'var(--warning)', icon: <Bot size={12} /> },
            ].map(g => (
              <div key={g.label} className="p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-1.5 mb-2" style={{ color: 'var(--text-2)' }}>
                  {g.icon}
                  <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{g.label}</span>
                </div>
                <div className="text-xl font-bold tabular-nums mb-2" style={{ color: 'var(--text)', fontFamily: 'ui-monospace, monospace' }}>
                  {g.score.toFixed(0)}<span className="text-sm font-normal" style={{ color: 'var(--text-3)' }}>/100</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-3)' }}>
                  <div className="h-full rounded-full" style={{ width: `${g.score}%`, background: g.barColor }} />
                </div>
              </div>
            ))}
          </div>

          {/* ── Coverage + drafts ── */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Coverage',           value: fmtPct(t.coverage_pct),    color: 'var(--success)' },
              { label: 'Drafts generated',   value: fmt(t.drafts_generated),   color: undefined },
              { label: 'Webhooks delivered', value: fmt(t.webhooks_delivered), color: undefined },
            ].map(c => (
              <div key={c.label} className="p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <Mini label={c.label} value={c.value} color={c.color} />
              </div>
            ))}
          </div>

          {/* ── API call volume chart ── */}
          <div className="p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-3)' }}>API call volume — 24h</h3>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={perf.usage_timeseries} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gCalls" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gErrs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="hour" tick={{ fontSize: 9, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} interval={5} />
                  <YAxis tick={{ fontSize: 9, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
                  <Tooltip {...TT} />
                  <Area type="monotone" dataKey="api_calls" name="Calls"  stroke="#3b82f6" strokeWidth={1.5} fill="url(#gCalls)" dot={false} />
                  <Area type="monotone" dataKey="errors"    name="Errors" stroke="#ef4444" strokeWidth={1.5} fill="url(#gErrs)"  dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Visibility timeline ── */}
          <div className="p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-3)' }}>Visibility scores — 24h</h3>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={perf.visibility_history} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize: 9, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} interval={5} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} unit="%" />
                  <Tooltip {...TT} formatter={(v) => [`${v ?? ''}%`]} />
                  <Line type="monotone" dataKey="seo" name="SEO" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="geo" name="GEO" stroke="#a78bfa" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="aeo" name="AEO" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Gap history ── */}
          <div className="p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h3 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-3)' }}>Coverage improvement — 14 days</h3>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={perf.gap_history} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gcBefore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#71717a" stopOpacity={0.2} /><stop offset="95%" stopColor="#71717a" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gcAfter" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 9, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} interval={3} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} unit="%" />
                  <Tooltip {...TT} formatter={(v) => [`${v ?? ''}%`]} />
                  <Area type="monotone" dataKey="coverage_before" name="Before" stroke="#71717a" strokeWidth={1.5} fill="url(#gcBefore)" dot={false} />
                  <Area type="monotone" dataKey="coverage_after"  name="After"  stroke="#22c55e" strokeWidth={1.5} fill="url(#gcAfter)"  dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Activity feed ── */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} className="overflow-hidden">
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Recent pipeline activity</h3>
            </div>
            <div>
              {perf.recent_activity.slice(0, 10).map((ev, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-2.5"
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: ev.status === 'success' ? 'var(--success)' : ev.status === 'error' ? 'var(--danger)' : 'var(--warning)' }}
                  />
                  <span className="text-xs flex-1" style={{ color: 'var(--text)', fontFamily: 'ui-monospace, monospace' }}>{ev.event_type}</span>
                  <span className="text-xs" style={{ color: 'var(--text-3)', fontFamily: 'ui-monospace, monospace' }}>{ev.service}</span>
                  {ev.duration_ms && (
                    <span className="text-xs tabular-nums" style={{ color: 'var(--text-3)', fontFamily: 'ui-monospace, monospace' }}>{ev.duration_ms}ms</span>
                  )}
                  <span className="text-xs" style={{ color: 'var(--text-3)', fontFamily: 'ui-monospace, monospace' }}>{relTime(ev.timestamp)}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Sort helpers ─────────────────────────────────────────────────────────────

type SortKey = 'name' | 'api_calls_24h' | 'avg_seo_score' | 'avg_geo_score' | 'coverage_pct' | 'error_rate' | 'last_active';

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminTenants() {
  const [tenants, setTenants]   = useState<TenantSummary[]>(seedTenants());
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState<'all' | TenantSummary['status']>('all');
  const [sortKey, setSortKey]   = useState<SortKey>('api_calls_24h');
  const [sortAsc, setSortAsc]   = useState(false);
  const [selected, setSelected] = useState<TenantSummary | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    listTenants()
      .then(data => setTenants(data))
      .catch(() => { /* keep seed */ })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(v => !v);
    else { setSortKey(key); setSortAsc(false); }
  }

  const visible = tenants
    .filter(t => filter === 'all' || t.status === filter)
    .filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.key_prefix.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const av = a[sortKey] ?? '', bv = b[sortKey] ?? '';
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });

  const totals = {
    active:   tenants.filter(t => t.status === 'active').length,
    idle:     tenants.filter(t => t.status === 'idle').length,
    error:    tenants.filter(t => t.status === 'error').length,
    calls24h: tenants.reduce((s, t) => s + t.api_calls_24h, 0),
    docs:     tenants.reduce((s, t) => s + t.documents_total, 0),
  };

  function SortHead({ label, col }: { label: string; col: SortKey }) {
    const active = sortKey === col;
    return (
      <th
        className="py-2.5 px-4 text-left cursor-pointer select-none group"
        onClick={() => toggleSort(col)}
      >
        <div className="flex items-center gap-1 text-xs font-medium transition-colors" style={{ color: 'var(--text-3)' }}>
          {label}
          {active
            ? (sortAsc ? <ChevronUp size={10} style={{ color: 'var(--text)' }} /> : <ChevronDown size={10} style={{ color: 'var(--text)' }} />)
            : <Minus size={10} className="opacity-0 group-hover:opacity-40" />
          }
        </div>
      </th>
    );
  }

  return (
    <>
      {selected && (
        <TenantDetailPanel
          tenantId={selected.tenant_id}
          seed={selected}
          onClose={() => setSelected(null)}
        />
      )}

      <div style={{ background: 'var(--bg)', color: 'var(--text)' }}>

        {/* ── Page header ── */}
        <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Building2 size={15} style={{ color: 'var(--text-2)' }} />
              <h1 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Connected Products</h1>
            </div>
            <p className="text-xs ml-5" style={{ color: 'var(--text-3)' }}>
              All companies and products using Data Engine via API key — real-time performance across the platform.
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40"
            style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        <div className="px-6 py-6 space-y-6 max-w-7xl">

          {/* ── Platform summary row ── */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {[
              { label: 'Total products',  value: tenants.length,       color: 'var(--text)',    icon: <Building2 size={14} /> },
              { label: 'Active now',      value: totals.active,        color: 'var(--success)', icon: <Zap size={14} /> },
              { label: 'Idle',            value: totals.idle,          color: 'var(--text-3)',  icon: <Minus size={14} /> },
              { label: 'In error state',  value: totals.error,         color: 'var(--danger)',  icon: <AlertTriangle size={14} /> },
              { label: 'API calls / 24h', value: fmt(totals.calls24h), color: 'var(--info)',    icon: <Activity size={14} /> },
              { label: 'Total docs',      value: fmt(totals.docs),     color: 'var(--text-2)',  icon: <FileText size={14} /> },
            ].map(c => (
              <div key={c.label} className="p-4 flex flex-col gap-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-medium tracking-wide" style={{ color: 'var(--text-3)' }}>{c.label}</span>
                  <span style={{ color: 'var(--text-3)' }}>{c.icon}</span>
                </div>
                <div className="text-2xl font-semibold tabular-nums" style={{ color: c.color, fontFamily: 'ui-monospace, monospace' }}>{c.value}</div>
              </div>
            ))}
          </div>

          {/* ── Filters + search ── */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or key prefix…"
                className="w-full pl-8 pr-3 py-1.5 text-xs outline-none transition-colors"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  fontFamily: 'ui-monospace, monospace',
                }}
              />
            </div>
            <div className="flex gap-1.5">
              {(['all', 'active', 'idle', 'error'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className="px-3 py-1.5 text-xs transition-colors"
                  style={filter === s
                    ? { border: '1px solid var(--text-2)', color: 'var(--text)', background: 'var(--surface-2)', fontFamily: 'ui-monospace, monospace' }
                    : { border: '1px solid var(--border)', color: 'var(--text-3)', fontFamily: 'ui-monospace, monospace' }
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs px-4 py-3" style={{ color: 'var(--warning)', border: '1px solid rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.05)' }}>
              <AlertTriangle size={13} /> {error}
            </div>
          )}

          {/* ── Main table ── */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} className="overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
              <h2 className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                {visible.length} product{visible.length !== 1 ? 's' : ''}
                {filter !== 'all' && <span className="ml-1" style={{ color: 'var(--border)' }}>· {filter}</span>}
              </h2>
              <span className="text-xs" style={{ color: 'var(--text-3)' }}>Click any row to see full performance</span>
            </div>

            {loading && tenants.length === 0 ? (
              <div className="flex items-center justify-center py-14 gap-2" style={{ color: 'var(--text-3)' }}>
                <Loader2 size={14} className="animate-spin" /> Loading tenants…
              </div>
            ) : visible.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <Building2 size={20} style={{ color: 'var(--text-3)' }} />
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>No products match your filter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <SortHead label="Product" col="name" />
                      <th className="py-2.5 px-4 text-left text-xs font-medium" style={{ color: 'var(--text-3)' }}>Plan</th>
                      <th className="py-2.5 px-4 text-left text-xs font-medium" style={{ color: 'var(--text-3)' }}>Status</th>
                      <SortHead label="API calls/24h" col="api_calls_24h" />
                      <th className="py-2.5 px-4 text-left text-xs font-medium" style={{ color: 'var(--text-3)' }}>Docs</th>
                      <SortHead label="SEO" col="avg_seo_score" />
                      <SortHead label="GEO" col="avg_geo_score" />
                      <SortHead label="Last active" col="last_active" />
                      <th className="py-2.5 px-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map(t => (
                      <TenantRow key={t.tenant_id} t={t} onSelect={setSelected} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Visibility overview across all products ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: 'Platform avg SEO', value: tenants.length ? (tenants.reduce((s,t)=>s+t.avg_seo_score,0)/tenants.length).toFixed(1) : '—', barColor: 'var(--info)',    textColor: 'var(--info)',    icon: <Search size={14} /> },
              { label: 'Platform avg GEO', value: tenants.length ? (tenants.reduce((s,t)=>s+t.avg_geo_score,0)/tenants.length).toFixed(1) : '—', barColor: '#a78bfa',        textColor: '#a78bfa',        icon: <Globe size={14} /> },
              { label: 'Platform avg coverage', value: tenants.length ? (tenants.reduce((s,t)=>s+t.coverage_pct,0)/tenants.length).toFixed(1)+'%' : '—', barColor: 'var(--success)', textColor: 'var(--success)', icon: <Eye size={14} /> },
            ].map(g => (
              <div key={g.label} className="p-4 flex items-center gap-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-3)' }}>{g.icon}</span>
                <div className="flex-1">
                  <div className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>{g.label}</div>
                  <div className="text-2xl font-bold tabular-nums" style={{ color: g.textColor, fontFamily: 'ui-monospace, monospace' }}>{g.value}</div>
                </div>
                <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-3)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      background: g.barColor,
                      width: typeof g.value === 'string' && g.value.endsWith('%') ? g.value : `${g.value}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* ── Errors callout ── */}
          {totals.error > 0 && (
            <div
              className="px-4 py-3 flex items-start gap-3"
              style={{ border: '1px solid var(--danger-border)', background: 'var(--danger-bg)' }}
            >
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--danger)' }} />
              <div>
                <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--danger)' }}>
                  {totals.error} product{totals.error > 1 ? 's' : ''} in error state
                </p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-2)' }}>
                  Click the affected row to inspect pipeline activity and error rates.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
