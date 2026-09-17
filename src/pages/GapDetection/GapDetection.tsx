import { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { listDocuments } from '../../api/ingest';
import { getCloseActions } from '../../api/gaps';
import type { DocumentListItem, GapCloseActionsResponse } from '../../types';

function relTime(iso: string | null | undefined) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

const SEV_COLOR: Record<string, string> = {
  critical: 'var(--danger)',
  high:     '#f97316',
  medium:   'var(--warning)',
  low:      'var(--success)',
};

const STATUS_COLOR: Record<string, string> = {
  pending:      'var(--text-3)',
  drafts_ready: 'var(--info)',
  resolved:     'var(--success)',
};

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-xs font-bold capitalize rounded-sm"
      style={{ color, background: `color-mix(in srgb, ${color} 12%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 25%, transparent)` }}
    >
      {label.replace(/_/g, ' ')}
    </span>
  );
}

function GapRow({ doc }: { doc: DocumentListItem }) {
  const [open,    setOpen]    = useState(false);
  const [data,    setData]    = useState<GapCloseActionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState('');

  const load = useCallback(() => {
    if (data || loading) return;
    setLoading(true);
    getCloseActions(doc.document_id, '')
      .then(setData)
      .catch(() => setErr('Could not load gap detail.'))
      .finally(() => setLoading(false));
  }, [doc.document_id, data, loading]);

  function toggle() {
    setOpen(v => !v);
    if (!open) load();
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', background: 'var(--surface)' }}>
      <button
        onClick={toggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
        style={{ background: 'var(--surface)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
      >
        <span className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
          {doc.file_name ?? doc.document_id}
        </span>
        <span className="text-xs" style={{ color: 'var(--text-3)' }}>{relTime(doc.created_at)}</span>
        {open ? <ChevronUp size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} /> : <ChevronDown size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>
          {loading && (
            <div className="flex items-center gap-2 pt-3 text-xs" style={{ color: 'var(--text-3)' }}>
              <Loader2 size={12} className="animate-spin" /> Loading…
            </div>
          )}
          {err && <p className="text-xs pt-3" style={{ color: 'var(--danger)' }}>{err}</p>}
          {data && (
            <div className="pt-3 space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <Pill label={data.severity} color={SEV_COLOR[data.severity] ?? 'var(--text-3)'} />
                <Pill label={data.status}   color={STATUS_COLOR[data.status] ?? 'var(--text-3)'} />
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                  Gap score: <span style={{ color: 'var(--text)', fontWeight: 600 }}>{(data.gap_score * 100).toFixed(0)}%</span>
                </span>
              </div>

              {data.missing_topics.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>Missing topics</p>
                  <div className="flex flex-wrap gap-1.5">
                    {data.missing_topics.map(t => (
                      <span key={t} className="px-2 py-0.5 text-xs rounded-sm" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {data.close_plan?.clusters?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>Close plan clusters</p>
                  <div className="space-y-1.5">
                    {data.close_plan.clusters.map((c, i) => (
                      <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-sm" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                        <span className="text-xs font-semibold w-4 flex-shrink-0 tabular-nums" style={{ color: 'var(--text-3)' }}>{i + 1}</span>
                        <div>
                          <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{c.topic}</span>
                          <span className="text-xs ml-2" style={{ color: 'var(--text-3)' }}>{c.intent}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function GapDetection() {
  const [docs,    setDocs]    = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const load = useCallback(() => {
    setLoading(true); setError('');
    listDocuments({ page: 1, page_size: 50, status: 'completed' })
      .then(setDocs)
      .catch(() => setError('Could not load documents from the backend.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="px-7 py-7 max-w-3xl" style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-base font-bold" style={{ color: 'var(--text)' }}>Gap Detection</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>Content gaps detected per crawled document — click a row to expand.</p>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors disabled:opacity-40" style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-3)' }}>
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--danger)' }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {!loading && !error && docs.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>No completed documents yet</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Gap analysis runs automatically after the first crawl completes.</p>
        </div>
      )}

      {!loading && docs.length > 0 && (
        <div className="space-y-2">
          {docs.map(doc => <GapRow key={doc.document_id} doc={doc} />)}
        </div>
      )}
    </div>
  );
}
