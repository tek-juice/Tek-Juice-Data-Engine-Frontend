import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Loader2, AlertTriangle, Activity, Server } from 'lucide-react';
import { getTelemetrySummary, getTelemetryTimeseries, getTelemetryErrors, getQueueStatus } from '../../api/telemetry';
import type { TelemetrySummary, TelemetryTimeseriesPoint, TelemetryError, QueueStatus } from '../../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// ── Helpers ───────────────────────────────────────────────────────────────────

function relTime(iso: string | null | undefined) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const TT = {
  contentStyle: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11 },
  itemStyle:    { color: 'var(--text)' },
  labelStyle:   { color: 'var(--text-3)' },
  cursor:       { stroke: 'var(--border)', strokeWidth: 1 },
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Telemetry() {
  const [summary,    setSummary]    = useState<TelemetrySummary | null>(null);
  const [timeseries, setTimeseries] = useState<TelemetryTimeseriesPoint[]>([]);
  const [errors,     setErrors]     = useState<TelemetryError[]>([]);
  const [queue,      setQueue]      = useState<QueueStatus | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback((refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError('');
    Promise.all([
      getTelemetrySummary(24).catch(() => null),
      getTelemetryTimeseries(24, 60).catch(() => [] as TelemetryTimeseriesPoint[]),
      getTelemetryErrors(50).catch(() => [] as TelemetryError[]),
      getQueueStatus().catch(() => null),
    ]).then(([s, ts, errs, q]) => {
      if (s)   setSummary(s);
      setTimeseries(Array.isArray(ts) ? ts : []);
      setErrors(Array.isArray(errs) ? errs : []);
      if (q)   setQueue(q);
    })
    .catch(() => setError('Could not load telemetry data.'))
    .finally(() => { setLoading(false); setRefreshing(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const errorRate = summary?.error_rate ?? 0;
  const totalEvents = summary?.event_counts
    ? Object.values(summary.event_counts).reduce((a, b) => a + (Number(b) || 0), 0)
    : 0;

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh' }}>
      <header
        className="flex items-center justify-between px-7 py-4 sticky top-0 z-10"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)', letterSpacing: '-0.01em' }}>
            Telemetry
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
            System events, error rates, and queue status
          </p>
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40"
          style={{ border: '1px solid var(--border)', color: 'var(--text-2)', background: 'var(--surface)' }}
        >
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </header>

      <div className="px-7 py-6 max-w-5xl space-y-6">
        {loading && (
          <div className="flex items-center gap-2 text-sm py-16 justify-center" style={{ color: 'var(--text-3)' }}>
            <Loader2 size={15} className="animate-spin" /> Loading telemetry…
          </div>
        )}
        {!loading && error && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />
            <p className="text-sm" style={{ color: 'var(--text-2)' }}>{error}</p>
            <button onClick={() => load()} className="text-xs px-3 py-1.5" style={{ border: '1px solid var(--border)', color: 'var(--text-3)' }}>Retry</button>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Total events (24h)', value: totalEvents.toLocaleString(), color: 'var(--info)' },
                { label: 'Error rate',         value: `${(errorRate * 100).toFixed(1)}%`, color: errorRate > 0.05 ? 'var(--danger)' : 'var(--success)' },
                { label: 'Queue depth',        value: (queue?.queue_depth ?? 0).toString(), color: 'var(--text)' },
                { label: 'Buffer status',      value: (queue?.buffer_status ?? 'unknown') as string, color: 'var(--text-2)' },
              ].map((s, i) => (
                <div key={i} className="p-4" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
                  <div className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>{s.label}</div>
                  <div className="text-2xl font-bold tabular-nums" style={{ color: s.color, fontFamily: 'ui-monospace, monospace' }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Event counts by type */}
            {summary?.event_counts && Object.keys(summary.event_counts).length > 0 && (
              <div className="p-4" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
                <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-3)' }}>
                  Events by type
                </h2>
                <div className="space-y-2">
                  {Object.entries(summary.event_counts).map(([type, count]) => {
                    const pct = totalEvents > 0 ? (Number(count) / totalEvents) * 100 : 0;
                    return (
                      <div key={type} className="flex items-center gap-3 text-xs">
                        <span className="w-40 truncate" style={{ color: 'var(--text-2)', fontFamily: 'ui-monospace, monospace' }}>{type}</span>
                        <div className="flex-1 h-1.5 overflow-hidden" style={{ background: 'var(--surface-2)', borderRadius: 2 }}>
                          <div className="h-full" style={{ width: `${pct}%`, background: 'var(--info)', borderRadius: 2 }} />
                        </div>
                        <span className="tabular-nums w-10 text-right" style={{ color: 'var(--text-3)', fontFamily: 'ui-monospace, monospace' }}>
                          {Number(count).toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Service health */}
            {summary?.services && Object.keys(summary.services).length > 0 && (
              <div className="p-4" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Server size={13} style={{ color: 'var(--text-3)' }} />
                  <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Service health</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(summary.services).map(([svc, info]) => (
                    <div key={svc} className="flex items-center justify-between p-3" style={{ border: '1px solid var(--border)' }}>
                      <div>
                        <div className="text-xs font-semibold" style={{ color: 'var(--text)', fontFamily: 'ui-monospace, monospace' }}>{svc}</div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{Number(info.event_count).toLocaleString()} events</div>
                      </div>
                      <span
                        className="text-xs font-bold px-2 py-0.5"
                        style={{
                          color:      info.healthy ? 'var(--success)' : 'var(--danger)',
                          background: info.healthy ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                          border:     `1px solid ${info.healthy ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                          borderRadius: 4,
                        }}
                      >
                        {info.healthy ? 'healthy' : 'down'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Throughput chart */}
            {timeseries.length > 0 && (
              <div className="p-4" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Activity size={13} style={{ color: 'var(--text-3)' }} />
                  <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                    Event throughput — 24h
                  </h2>
                </div>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timeseries} margin={{ top: 0, right: 0, left: -24, bottom: 0 }}>
                      <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                      <XAxis
                        dataKey="timestamp"
                        tickFormatter={v => {
                          const d = new Date(v);
                          return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        }}
                        tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis tick={{ fontSize: 10, fill: 'var(--text-3)' }} tickLine={false} axisLine={false} />
                      <Tooltip {...TT} />
                      <Line type="monotone" dataKey="count" name="Events" stroke="var(--info)" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Recent errors */}
            <div style={{ border: '1px solid var(--border)' }}>
              <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                  Recent errors
                </h2>
                <span className="text-xs" style={{ color: errors.length > 0 ? 'var(--danger)' : 'var(--text-3)', fontFamily: 'ui-monospace, monospace' }}>
                  {errors.length} error{errors.length !== 1 ? 's' : ''}
                </span>
              </div>
              {errors.length === 0 ? (
                <div className="text-center py-10 text-sm" style={{ color: 'var(--text-3)' }}>
                  No errors in the last 24h.
                </div>
              ) : errors.map((e, i) => (
                <div key={i} className="px-4 py-3 flex items-start gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'var(--danger)' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold" style={{ color: 'var(--text)', fontFamily: 'ui-monospace, monospace' }}>
                      [{e.service}] {e.event_type}
                    </p>
                    {e.error && <p className="text-xs mt-0.5" style={{ color: 'var(--danger)' }}>{e.error}</p>}
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{relTime(e.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
