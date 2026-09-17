import { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { listDocuments } from '../../api/ingest';
import { getDrafts } from '../../api/gaps';
import type { DocumentListItem, DraftItem } from '../../types';

const SCORE_COLOR = (s: number) =>
  s >= 8 ? 'var(--success)' : s >= 6 ? 'var(--info)' : s >= 4 ? 'var(--warning)' : 'var(--danger)';

function DraftCard({ draft }: { draft: DraftItem }) {
  const [expanded, setExpanded] = useState(false);
  const qs = draft.quality_score ?? 0;
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', overflow: 'hidden' }}>
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors"
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
        onMouseLeave={e => (e.currentTarget.style.background = '')}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{draft.topic}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
            {draft.intent}{draft.word_count ? ` · ${draft.word_count} words` : ''}
            {draft.status ? ` · ${draft.status}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {qs > 0 && (
            <span className="text-xs font-bold tabular-nums" style={{ color: SCORE_COLOR(qs) }}>QS {qs.toFixed(1)}</span>
          )}
          {draft.beats_paid_ads && (
            <span className="text-xs px-1.5 py-0.5 rounded-sm font-bold" style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--success)', border: '1px solid rgba(34,197,94,0.25)' }}>↑ Beats ads</span>
          )}
          {draft.projected_position && (
            <span className="text-xs hidden sm:inline" style={{ color: 'var(--text-3)' }}>{draft.projected_position}</span>
          )}
          {expanded ? <ChevronUp size={13} style={{ color: 'var(--text-3)' }} /> : <ChevronDown size={13} style={{ color: 'var(--text-3)' }} />}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>
          {draft.draft_text && (
            <p className="text-xs pt-3 leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-2)' }}>{draft.draft_text}</p>
          )}
          {draft.query_variants?.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-3)' }}>Query variants</p>
              <div className="flex flex-wrap gap-1">
                {draft.query_variants.map(q => (
                  <span key={q} className="px-2 py-0.5 text-xs rounded-sm" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>{q}</span>
                ))}
              </div>
            </div>
          )}
          {draft.authority_signals?.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-3)' }}>Authority signals</p>
              <div className="flex flex-wrap gap-1">
                {draft.authority_signals.map(s => (
                  <span key={s} className="px-2 py-0.5 text-xs rounded-sm" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>{s}</span>
                ))}
              </div>
            </div>
          )}
          {draft.model_used && (
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>
              Model: <span style={{ color: 'var(--text-2)' }}>{draft.model_used}</span>
              {draft.generated_at && <span className="ml-2">{new Date(draft.generated_at).toLocaleString()}</span>}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function DocDrafts({ doc }: { doc: DocumentListItem }) {
  const [open,    setOpen]    = useState(false);
  const [drafts,  setDrafts]  = useState<DraftItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState('');

  function toggle() {
    setOpen(v => !v);
    if (!open && drafts.length === 0 && !loading) {
      setLoading(true);
      // tenant_id resolved server-side from Bearer token
      getDrafts(doc.document_id)
        .then(setDrafts)
        .catch(() => setErr('Could not load drafts.'))
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
        <span className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
          {doc.filename ?? doc.document_id}
        </span>
        <span className="text-xs mr-2" style={{ color: 'var(--text-3)' }}>
          {doc.chunk_count != null ? `${doc.chunk_count} chunks` : ''}
        </span>
        {open ? <ChevronUp size={14} style={{ color: 'var(--text-3)' }} /> : <ChevronDown size={14} style={{ color: 'var(--text-3)' }} />}
      </button>
      {open && (
        <div className="px-4 pb-4" style={{ borderTop: '1px solid var(--border)' }}>
          {loading && <div className="flex items-center gap-2 pt-3 text-xs" style={{ color: 'var(--text-3)' }}><Loader2 size={12} className="animate-spin" /> Loading drafts…</div>}
          {err     && <p className="text-xs pt-3" style={{ color: 'var(--danger)' }}>{err}</p>}
          {!loading && !err && drafts.length === 0 && (
            <p className="text-xs pt-3" style={{ color: 'var(--text-3)' }}>No drafts for this document yet.</p>
          )}
          {drafts.length > 0 && (
            <div className="pt-3 space-y-2">
              {drafts.map((d, i) => <DraftCard key={d.id ?? i} draft={d} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Drafts() {
  const [docs,    setDocs]    = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const load = useCallback(() => {
    setLoading(true); setError('');
    listDocuments({ page: 1, page_size: 100, status: 'completed' })
      .then(setDocs)
      .catch(() => setError('Could not load documents.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="px-7 py-7 max-w-3xl" style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-base font-bold" style={{ color: 'var(--text)' }}>Drafts</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
            {docs.length > 0
              ? `${docs.length} document${docs.length !== 1 ? 's' : ''} — expand to read AI-generated drafts`
              : 'AI-generated content drafts per crawled document.'}
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
          <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Drafts are written automatically after gap analysis completes.</p>
        </div>
      )}
      {!loading && docs.length > 0 && (
        <div className="space-y-2">
          {docs.map(doc => <DocDrafts key={doc.document_id} doc={doc} />)}
        </div>
      )}
    </div>
  );
}
