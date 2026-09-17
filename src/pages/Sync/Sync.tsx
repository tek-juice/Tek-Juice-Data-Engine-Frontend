import { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, AlertTriangle, Play } from 'lucide-react';
import { getSyncStatus, triggerSync } from '../../api/sync';
import type { SyncRun, SyncType } from '../../types';

function relTime(iso: string | null | undefined) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

const STATUS_COLOR: Record<string, string> = {
  completed: 'var(--success)',
  running:   'var(--info)',
  failed:    'var(--danger)',
  pending:   'var(--text-3)',
};

export default function Sync() {
  const [runs,      setRuns]      = useState<SyncRun[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [triggering, setTriggering] = useState<SyncType | null>(null);
  const [trigMsg,   setTrigMsg]   = useState('');

  const load = useCallback(() => {
    setLoading(true); setError('');
    getSyncStatus()
      .then(setRuns)
      .catch(() => setError('Could not load sync history.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleTrigger(sync_type: SyncType) {
    setTriggering(sync_type); setTrigMsg('');
    try {
      await triggerSync({ sync_type });
      setTrigMsg(`${sync_type} sync triggered successfully.`);
      setTimeout(load, 1500);
    } catch {
      setTrigMsg('Failed to trigger sync.');
    } finally {
      setTriggering(null);
    }
  }

  return (
    <div className="px-7 py-7 max-w-3xl" style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-base font-bold" style={{ color: 'var(--text)' }}>Sync</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>Data sync history and manual triggers.</p>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors disabled:opacity-40" style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Manual trigger panel */}
      <div className="p-4 mb-6 rounded space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>Manual trigger</p>
        <div className="flex flex-wrap gap-2">
          {(['full', 'incremental', 'cache'] as SyncType[]).map(t => (
            <button
              key={t}
              onClick={() => handleTrigger(t)}
              disabled={triggering !== null}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded capitalize transition-colors disabled:opacity-40"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-2)')}
            >
              {triggering === t ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
              {t}
            </button>
          ))}
        </div>
        {trigMsg && <p className="text-xs" style={{ color: trigMsg.includes('success') ? 'var(--success)' : 'var(--danger)' }}>{trigMsg}</p>}
      </div>

      {loading && <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-3)' }}><Loader2 size={14} className="animate-spin" /> Loading…</div>}
      {error   && <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--danger)' }}><AlertTriangle size={14} /> {error}</div>}

      {!loading && !error && runs.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>No sync runs recorded yet.</p>
      )}

      {!loading && runs.length > 0 && (
        <div className="space-y-2">
          {runs.map(run => (
            <div key={run.id} className="flex items-center gap-3 px-4 py-3 rounded" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <span
                className="text-xs font-bold capitalize w-20 flex-shrink-0"
                style={{ color: STATUS_COLOR[run.status] ?? 'var(--text-3)' }}
              >
                {run.status}
              </span>
              <span className="text-sm font-medium capitalize flex-1" style={{ color: 'var(--text)' }}>{run.sync_type}</span>
              <span className="text-xs" style={{ color: 'var(--text-3)' }}>Started {relTime(run.started_at)}</span>
              {run.completed_at && (
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>· Finished {relTime(run.completed_at)}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
