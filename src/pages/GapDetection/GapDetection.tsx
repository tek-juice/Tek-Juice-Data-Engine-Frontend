import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Loader2, AlertTriangle, ChevronDown, ChevronUp, Zap, Target } from 'lucide-react';
import { getDashboardDocuments } from '../../api/dashboard';
import { analyzeGaps, getCloseActions } from '../../api/gaps';
import type { DocumentListItem, GapAnalysisResponse, GapCloseActionsResponse, GapSeverity } from '../../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function severityColor(s: GapSeverity | string) {
  if (s === 'critical') return 'var(--danger)';
  if (s === 'high')     return '#f97316';
  if (s === 'medium')   return 'var(--warning)';
  return 'var(--success)';
}

function ScoreBar({ score }: { score: number }) {
  const pct   = Math.min(100, Math.max(0, Math.round(score * 100)));
  const color = pct <= 30 ? 'var(--success)' : pct <= 60 ? 'var(--warning)' : 'var(--danger)';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 overflow-hidden" style={{ background: 'var(--surface-2)', borderRadius: 2 }}>
        <div className="h-full" style={{ width: `${pct}%`, background: color, borderRadius: 2 }} />
      </div>
      <span className="text-xs tabular-nums w-8 text-right" style={{ color, fontFamily: 'ui-monospace, monospace' }}>
        {pct}%
      </span>
    </div>
  );
}

function Pill({ label, color }: { label: string; color: string }) {
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
      {label}
    </span>
  );
}

// ── Document row ──────────────────────────────────────────────────────────────

function DocRow({ doc }: { doc: DocumentListItem }) {
  const [open,     setOpen]    = useState(false);
  const [analysis, setAnalysis] = useState<GapAnalysisResponse | null>(null);
  const [actions,  setActions]  = useState<GapCloseActionsResponse | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const docId   = (doc.document_id ?? doc.id ?? '') as string;
  const tenantId = '';

  function toggleOpen() {
    if (!open && !analysis) {
      setLoading(true);
      setError('');
      Promise.all([
        analyzeGaps({ document_id: docId, tenant_id: tenantId }).catch(() => null),
        getCloseActions(docId, tenantId).catch(() => null),
      ]).then(([gap, act]) => {
        if (gap)  setAnalysis(gap);
        if (act)  setActions(act);
      }).catch(() => setError('Could not load gap data.')).finally(() => setLoading(false));
    }
    setOpen(v => !v);
  }

  return (
    <div style={{ border: '1px solid var(--border)', marginBottom: 8 }}>
      <button
        onClick={toggleOpen}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        style={{ background: 'var(--surface)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
            {doc.filename ?? docId}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)', fontFamily: 'ui-monospace, monospace' }}>
            {doc.chunk_count ?? 0} chunks · {doc.status}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {analysis && (
            <Pill label={analysis.severity} color={severityColor(analysis.severity)} />
          )}
          <div className="w-28">
            {analysis && <ScoreBar score={analysis.gap_score} />}
          </div>
          {open ? <ChevronUp size={14} style={{ color: 'var(--text-3)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-3)' }} />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-2" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
          {loading && (
            <div className="flex items-center gap-2 text-xs py-4" style={{ color: 'var(--text-3)' }}>
              <Loader2 size={13} className="animate-spin" /> Analysing gaps…
            </div>
          )}
          {error && <p className="text-xs py-4" style={{ color: 'var(--danger)' }}>{error}</p>}
          {analysis && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3" style={{ border: '1px solid var(--border)' }}>
                  <div className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>Gap score</div>
                  <div className="text-2xl font-bold tabular-nums" style={{ color: severityColor(analysis.severity), fontFamily: 'ui-monospace, monospace' }}>
                    {(analysis.gap_score * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="p-3" style={{ border: '1px solid var(--border)' }}>
                  <div className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>Before coverage</div>
                  <div className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text)', fontFamily: 'ui-monospace, monospace' }}>
                    {(analysis.before_coverage * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="p-3" style={{ border: '1px solid var(--border)' }}>
                  <div className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>After coverage</div>
                  <div className="text-2xl font-bold tabular-nums" style={{ color: 'var(--success)', fontFamily: 'ui-monospace, monospace' }}>
                    {(analysis.after_coverage * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              {analysis.missing_topics.length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>Missing topics</div>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.missing_topics.map((t, i) => (
                      <span key={i} className="text-xs px-2 py-0.5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {analysis.recommendations.length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>Recommendations</div>
                  <ul className="space-y-1">
                    {analysis.recommendations.slice(0, 5).map((r, i) => (
                      <li key={i} className="flex gap-2 text-xs" style={{ color: 'var(--text-2)', lineHeight: 1.5 }}>
                        <span style={{ color: 'var(--brand)', flexShrink: 0 }}>→</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {actions && (
            <div className="mt-4 p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Zap size={12} style={{ color: 'var(--brand)' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>Auto-closure plan</span>
                <Pill label={actions.status} color={actions.status === 'resolved' ? 'var(--success)' : actions.status === 'drafts_ready' ? 'var(--info)' : 'var(--text-3)'} />
              </div>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                {actions.close_plan?.clusters?.length ?? 0} content clusters planned · gap score {(actions.gap_score * 100).toFixed(0)}%
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function GapDetection() {
  const [docs,       setDocs]       = useState<DocumentListItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback((refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError('');
    getDashboardDocuments({ status: 'completed', page_size: 50 })
      .then(setDocs)
      .catch(() => setError('Could not load documents from the backend.'))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh' }}>
      <header
        className="flex items-center justify-between px-7 py-4 sticky top-0 z-10"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)', letterSpacing: '-0.01em' }}>
            Gap Detection
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
            Missing topics and coverage analysis per document
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

      <div className="px-7 py-6 max-w-5xl">
        {loading && (
          <div className="flex items-center gap-2 text-sm py-16 justify-center" style={{ color: 'var(--text-3)' }}>
            <Loader2 size={15} className="animate-spin" /> Loading documents…
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />
            <p className="text-sm" style={{ color: 'var(--text-2)' }}>{error}</p>
            <button onClick={() => load()} className="text-xs px-3 py-1.5" style={{ border: '1px solid var(--border)', color: 'var(--text-3)' }}>Retry</button>
          </div>
        )}

        {!loading && !error && docs.length === 0 && (
          <div className="text-center py-20">
            <Target size={24} className="mx-auto mb-3" style={{ color: 'var(--text-3)' }} />
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>No completed documents yet</p>
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>
              Connect your product and let the engine crawl your content first.
            </p>
          </div>
        )}

        {!loading && !error && docs.length > 0 && (
          <div>
            <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>
              {docs.length} document{docs.length !== 1 ? 's' : ''} — click any row to run gap analysis
            </p>
            {docs.map(doc => (
              <DocRow key={(doc.document_id ?? doc.id) as string} doc={doc} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
