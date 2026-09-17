import { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { listDocuments } from '../../api/ingest';
import { analyzeGeo } from '../../api/geo';
import type { DocumentListItem, GeoAnalysisResponse } from '../../types';

function ScoreGauge({ label, value }: { label: string; value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const color = pct >= 70 ? 'var(--success)' : pct >= 40 ? 'var(--info)' : pct >= 20 ? 'var(--warning)' : 'var(--danger)';
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs w-44 flex-shrink-0" style={{ color: 'var(--text-2)' }}>{label}</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-bold tabular-nums w-10 text-right" style={{ color }}>{pct.toFixed(0)}</span>
    </div>
  );
}

function GeoDocRow({ doc }: { doc: DocumentListItem }) {
  const [open,    setOpen]    = useState(false);
  const [result,  setResult]  = useState<GeoAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState('');

  function toggle() {
    setOpen(v => !v);
    if (!open && !result && !loading) {
      setLoading(true);
      analyzeGeo({ document_id: doc.document_id, tenant_id: '', content: doc.file_name ?? '' })
        .then(setResult)
        .catch(() => setErr('Could not run GEO analysis for this document.'))
        .finally(() => setLoading(false));
    }
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', background: 'var(--surface)' }}>
      <button
        onClick={toggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
        onMouseLeave={e => (e.currentTarget.style.background = '')}
      >
        <span className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{doc.file_name ?? doc.document_id}</span>
        <span className="text-xs" style={{ color: 'var(--text-3)' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4" style={{ borderTop: '1px solid var(--border)' }}>
          {loading && <div className="flex items-center gap-2 pt-3 text-xs" style={{ color: 'var(--text-3)' }}><Loader2 size={12} className="animate-spin" /> Analysing…</div>}
          {err     && <p className="text-xs pt-3" style={{ color: 'var(--danger)' }}>{err}</p>}
          {result  && (
            <div className="pt-3 space-y-3">
              <div className="space-y-2">
                <ScoreGauge label="LLM visibility score"    value={result.llm_visibility_score * 100} />
                <ScoreGauge label="Entity coverage"         value={result.entity_coverage * 100} />
                <ScoreGauge label="Citation readiness"      value={result.citation_readiness * 100} />
                <ScoreGauge label="Context richness"        value={result.context_richness_score * 100} />
              </div>
              {result.extracted_entities?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-3)' }}>Extracted entities</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.extracted_entities.map(e => (
                      <span key={e} className="px-2 py-0.5 text-xs rounded-sm" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>{e}</span>
                    ))}
                  </div>
                </div>
              )}
              {result.recommendations?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-3)' }}>Recommendations</p>
                  <ul className="space-y-1">
                    {result.recommendations.map((r, i) => (
                      <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: 'var(--text-2)' }}>
                        <span style={{ color: 'var(--brand)', flexShrink: 0 }}>→</span>{r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function GEO() {
  const [docs,    setDocs]    = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const load = useCallback(() => {
    setLoading(true); setError('');
    listDocuments({ page: 1, page_size: 50, status: 'completed' })
      .then(setDocs)
      .catch(() => setError('Could not load documents.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="px-7 py-7 max-w-3xl" style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-base font-bold" style={{ color: 'var(--text)' }}>GEO</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
            Generative Engine Optimisation — scores content for ChatGPT, Perplexity, Google AI Overviews.
          </p>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors disabled:opacity-40" style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {loading && <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-3)' }}><Loader2 size={14} className="animate-spin" /> Loading…</div>}
      {error   && <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--danger)' }}><AlertTriangle size={14} /> {error}</div>}

      {!loading && !error && docs.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>No documents yet</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>GEO analysis runs automatically after content is crawled and processed.</p>
        </div>
      )}

      {!loading && docs.length > 0 && (
        <div className="space-y-2">
          {docs.map(doc => <GeoDocRow key={doc.document_id} doc={doc} />)}
        </div>
      )}
    </div>
  );
}
