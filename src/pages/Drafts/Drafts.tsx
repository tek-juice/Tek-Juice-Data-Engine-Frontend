import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, Loader2, AlertTriangle, ChevronDown, ChevronUp,
  FileText, Zap, CheckCircle2, Copy, Check,
} from 'lucide-react';
import { getDrafts } from '../../api/gaps';
import { getDashboardDocuments } from '../../api/dashboard';
import { getTenantId } from '../../services/auth.service';
import { copyToClipboard } from '../../utils/clipboard';
import type { DraftItem, DocumentListItem, DraftStatus } from '../../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function severityColor(score: number | undefined) {
  if (score == null) return 'var(--text-3)';
  if (score >= 8)   return 'var(--success)';
  if (score >= 6)   return 'var(--warning)';
  return 'var(--danger)';
}

function statusColor(s: DraftStatus | undefined) {
  if (s === 'published' as DraftStatus) return 'var(--success)';
  if (s === 'embedded')  return 'var(--info, #3b82f6)';
  if (s === 'approved')  return 'var(--success)';
  if (s === 'rejected')  return 'var(--danger)';
  return 'var(--text-3)';
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-xs font-bold capitalize"
      style={{
        color,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
        borderRadius: 4,
      }}
    >
      {label}
    </span>
  );
}

// ── Draft card ────────────────────────────────────────────────────────────────

function DraftCard({ draft }: { draft: DraftItem }) {
  const [open, setOpen]       = useState(false);
  const [copied, setCopied]   = useState(false);

  const qs    = draft.quality_score;
  const words = draft.word_count ?? draft.draft_text?.split(/\s+/).length ?? 0;

  async function handleCopy() {
    await copyToClipboard(draft.draft_text ?? '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ border: '1px solid var(--border)', marginBottom: 8 }}>
      {/* Row header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left"
        style={{ background: 'var(--surface)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
            {draft.topic}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)', fontFamily: 'ui-monospace, monospace' }}>
            {draft.intent} · {words.toLocaleString()} words
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {qs != null && (
            <span
              className="text-xs font-bold tabular-nums"
              style={{ color: severityColor(qs), fontFamily: 'ui-monospace, monospace' }}
            >
              QS {qs.toFixed(1)}/10
            </span>
          )}
          {draft.beats_paid_ads && (
            <Pill label="Beats ads" color="var(--success)" />
          )}
          {draft.status && (
            <Pill label={draft.status} color={statusColor(draft.status)} />
          )}
          {draft.projected_position && (
            <span className="text-xs" style={{ color: 'var(--brand)' }}>
              {draft.projected_position}
            </span>
          )}
          {open
            ? <ChevronUp size={14} style={{ color: 'var(--text-3)' }} />
            : <ChevronDown size={14} style={{ color: 'var(--text-3)' }} />
          }
        </div>
      </button>

      {open && (
        <div
          className="px-4 pb-4 pt-3 space-y-4"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)' }}
        >
          {/* QS breakdown */}
          {(draft.geo_score != null || draft.aeo_score != null || draft.composite_score != null) && (
            <div className="grid grid-cols-3 gap-3">
              {[
                ['GEO score', draft.geo_score],
                ['AEO score', draft.aeo_score],
                ['Composite', draft.composite_score],
              ].filter(([, v]) => v != null).map(([label, val]) => (
                <div key={String(label)} className="p-3" style={{ border: '1px solid var(--border)' }}>
                  <div className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>{label}</div>
                  <div
                    className="text-xl font-bold tabular-nums"
                    style={{ color: severityColor((val as number) * 10), fontFamily: 'ui-monospace, monospace' }}
                  >
                    {((val as number) * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Query variants */}
          {draft.query_variants?.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-3)' }}>
                Query variants
              </p>
              <div className="flex flex-wrap gap-1.5">
                {draft.query_variants.map((q, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-0.5"
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}
                  >
                    {q}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Draft text */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                Draft content
              </p>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs transition-colors"
                style={{ color: copied ? 'var(--success)' : 'var(--text-3)' }}
              >
                {copied ? <Check size={11} /> : <Copy size={11} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre
              className="text-xs leading-relaxed overflow-auto max-h-64 p-3"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text-2)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {draft.draft_text}
            </pre>
          </div>

          {draft.model_used && (
            <p className="text-xs" style={{ color: 'var(--text-3)', fontFamily: 'ui-monospace, monospace' }}>
              Generated by {draft.provider_used ?? ''} / {draft.model_used}
              {draft.generated_at && ` · ${new Date(draft.generated_at).toLocaleDateString()}`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Document section ──────────────────────────────────────────────────────────

function DocSection({ doc }: { doc: DocumentListItem }) {
  const [open, setOpen]       = useState(false);
  const [drafts, setDrafts]   = useState<DraftItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const docId    = (doc.document_id ?? doc.id ?? '') as string;
  const tenantId = getTenantId();

  function toggle() {
    if (!open && drafts === null) {
      setLoading(true);
      getDrafts(docId, tenantId)
        .then(setDrafts)
        .catch(() => setError('Could not load drafts.'))
        .finally(() => setLoading(false));
    }
    setOpen(v => !v);
  }

  const draftCount = drafts?.length ?? 0;

  return (
    <div className="mb-3" style={{ border: '1px solid var(--border)' }}>
      <button
        onClick={toggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        style={{ background: 'var(--surface)' }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
      >
        <FileText size={13} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>
            {doc.filename ?? docId}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)', fontFamily: 'ui-monospace, monospace' }}>
            {doc.chunk_count ?? 0} chunks · {doc.status}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 text-xs" style={{ color: 'var(--text-3)' }}>
          {drafts !== null && (
            <span style={{ color: draftCount > 0 ? 'var(--brand)' : 'var(--text-3)' }}>
              {draftCount} draft{draftCount !== 1 ? 's' : ''}
            </span>
          )}
          {open
            ? <ChevronUp size={14} />
            : <ChevronDown size={14} />
          }
        </div>
      </button>

      {open && (
        <div className="px-4 pb-3 pt-1" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
          {loading && (
            <div className="flex items-center gap-2 py-6 text-xs justify-center" style={{ color: 'var(--text-3)' }}>
              <Loader2 size={13} className="animate-spin" /> Loading drafts…
            </div>
          )}
          {error && <p className="text-xs py-4 text-center" style={{ color: 'var(--danger)' }}>{error}</p>}
          {!loading && !error && drafts !== null && drafts.length === 0 && (
            <div className="py-6 text-center">
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                No drafts yet — the engine will write them once gap analysis runs.
              </p>
            </div>
          )}
          {!loading && drafts && drafts.length > 0 && (
            <div className="mt-2">
              {drafts.map((d, i) => (
                <DraftCard key={d.id ?? i} draft={d} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Drafts() {
  const [docs,       setDocs]       = useState<DocumentListItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback((refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError('');
    getDashboardDocuments({ status: 'completed', page_size: 50 })
      .then(setDocs)
      .catch(() => setError('Could not load documents.'))
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
            Drafts
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
            AI-written content ready to review and publish
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
          <div className="flex items-center gap-2 text-sm py-20 justify-center" style={{ color: 'var(--text-3)' }}>
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
          <div className="text-center py-24">
            <Zap size={24} className="mx-auto mb-3" style={{ color: 'var(--text-3)' }} />
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>No completed documents yet</p>
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>
              The engine writes drafts automatically after processing your content.
            </p>
          </div>
        )}

        {!loading && !error && docs.length > 0 && (
          <div>
            <p className="text-xs mb-4" style={{ color: 'var(--text-3)' }}>
              {docs.length} document{docs.length !== 1 ? 's' : ''} — click any row to view AI-generated drafts
            </p>
            {docs.map(doc => (
              <DocSection key={(doc.document_id ?? doc.id) as string} doc={doc} />
            ))}
          </div>
        )}

        {!loading && !error && docs.length > 0 && (
          <div
            className="mt-6 px-4 py-3 flex items-start gap-2 text-xs"
            style={{ border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 4 }}
          >
            <CheckCircle2 size={13} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
            <p style={{ color: 'var(--text-3)', lineHeight: 1.6 }}>
              Drafts with <strong>QS ≥ 8.0</strong> beat all paid ads. Drafts with <strong>QS ≥ 9.5</strong> are captured by Google AI Overviews. The engine writes and embeds drafts automatically — injection into your connected product happens on the next scheduled run.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
