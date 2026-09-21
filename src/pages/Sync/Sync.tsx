import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Loader2, AlertTriangle, Play, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { getSyncStatus, triggerSync } from '../../api/sync';
import type { SyncRun, SyncType } from '../../types';

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

function duration(start: string, end?: string) {
  if (!end) return '—';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'completed') return <CheckCircle2 size={13} style={{ color: 'var(--success)' }} />;
  if (status === 'failed')    return <XCircle       size={13} style={{ color: 'var(--danger)'  }} />;
  return <Clock size={13} style={{ color: 'var(--warning)' }} />;
}

// ── Main page ─────────────────────────────────────────────────────────────────

const SYNC_TYPES: SyncType[] = ['full', 'incremental', 'cache'];

export default function Sync() {
  const [runs,       setRuns]       = useState<SyncRun[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const [syncType,   setSyncType]   = useState<SyncType>('incremental');
  const [triggering, setTriggering] = useState(false);
  const [trigMsg,    setTrigMsg]    = useState('');

  const load = useCallback((refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError('');
    getSyncStatus()
      .then(r => setRuns(Array.isArray(r) ? r : []))
      .catch(() => setError('Could not load sync history.'))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleTrigger() {
    setTriggering(true);
    setTrigMsg('');
    triggerSync({ sync_type: syncType })
      .then(() => {
        setTrigMsg(`${syncType} sync triggered successfully.`);
        setTimeout(() => load(true), 1500);
      })
      .catch(() => setTrigMsg('Could not trigger sync. Check backend connectivity.'))
      .finally(() => setTriggering(false));
  }

  const select: React.CSSProperties = {
    padding: '0.45rem 0.75rem',
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    fontSize: '0.8125rem',
    fontFamily: 'inherit',
  };

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh' }}>
      <header
        className="flex items-center justify-between px-7 py-4 sticky top-0 z-10"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)', letterSpacing: '-0.01em' }}>
            Sync
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
            Data synchronisation history and manual triggers
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
        {/* Trigger panel */}
        <div className="p-4 flex flex-wrap items-end gap-4" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>Sync type</label>
            <select value={syncType} onChange={e => setSyncType(e.target.value as SyncType)} style={select}>
              {SYNC_TYPES.map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleTrigger}
            disabled={triggering}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold transition-colors disabled:opacity-40"
            style={{ background: 'var(--brand)', color: '#111' }}
          >
            <Play size={13} />
            {triggering ? 'Triggering…' : 'Trigger sync'}
          </button>
          {trigMsg && <p className="text-xs" style={{ color: 'var(--text-2)' }}>{trigMsg}</p>}
        </div>

        {/* History */}
        {loading && (
          <div className="flex items-center gap-2 text-sm py-12 justify-center" style={{ color: 'var(--text-3)' }}>
            <Loader2 size={15} className="animate-spin" /> Loading sync history…
          </div>
        )}
        {!loading && error && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />
            <p className="text-sm" style={{ color: 'var(--text-2)' }}>{error}</p>
            <button onClick={() => load()} className="text-xs px-3 py-1.5" style={{ border: '1px solid var(--border)', color: 'var(--text-3)' }}>Retry</button>
          </div>
        )}
        {!loading && !error && (
          <div style={{ border: '1px solid var(--border)' }}>
            <div
              className="grid grid-cols-5 px-4 py-2 text-xs font-semibold uppercase tracking-wider"
              style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', color: 'var(--text-3)' }}
            >
              <span>Type</span>
              <span>Status</span>
              <span>Started</span>
              <span>Duration</span>
              <span className="hidden md:block">ID</span>
            </div>
            {runs.length === 0 ? (
              <div className="text-center py-12 text-sm" style={{ color: 'var(--text-3)' }}>
                No sync runs yet. Trigger one above.
              </div>
            ) : runs.map(r => (
              <div
                key={r.id}
                className="grid grid-cols-5 items-center px-4 py-3 text-sm"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <span className="text-xs font-mono" style={{ color: 'var(--text)' }}>{r.sync_type}</span>
                <span className="flex items-center gap-1.5 text-xs">
                  <StatusIcon status={r.status} />
                  <span style={{ color: r.status === 'completed' ? 'var(--success)' : r.status === 'failed' ? 'var(--danger)' : 'var(--warning)' }}>
                    {r.status}
                  </span>
                </span>
                <span className="text-xs" style={{ color: 'var(--text-3)', fontFamily: 'ui-monospace, monospace' }}>
                  {relTime(r.started_at)}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-3)', fontFamily: 'ui-monospace, monospace' }}>
                  {duration(r.started_at, r.completed_at)}
                </span>
                <span className="hidden md:block text-xs truncate" style={{ color: 'var(--text-3)', fontFamily: 'ui-monospace, monospace' }}>
                  {r.id}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
