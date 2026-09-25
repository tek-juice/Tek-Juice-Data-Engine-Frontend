import { useState, useEffect } from 'react';
import { Loader2, MessageCircleQuestion, ChevronDown, ChevronUp, Mic, FileSearch } from 'lucide-react';
import { getDashboardDocuments } from '../../api/dashboard';
import { analyzeAeo } from '../../api/aeo';
import { getTenantId } from '../../services/auth.service';
import type { DocumentListItem, AEOAnalysisResponse } from '../../types';

// ── Score ring ────────────────────────────────────────────────────────────────

function ScoreRing({ score, label }: { score: number; label: string }) {
  const pct   = Math.min(100, Math.max(0, score));
  const color = pct >= 70 ? 'var(--success)' : pct >= 45 ? 'var(--warning)' : 'var(--danger)';
  const r     = 30;
  const circ  = 2 * Math.PI * r;
  const dash  = circ * (pct / 100);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={80} height={80} viewBox="0 0 80 80">
        <circle cx={40} cy={40} r={r} fill="none" strokeWidth={6} stroke="var(--surface-2)" />
        <circle
          cx={40} cy={40} r={r} fill="none" strokeWidth={6}
          stroke={color}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 40 40)"
        />
        <text x={40} y={40} textAnchor="middle" dominantBaseline="central" style={{ fontSize: 14, fontWeight: 700, fill: color, fontFamily: 'ui-monospace, monospace' }}>
          {pct.toFixed(0)}
        </text>
      </svg>
      <span className="text-xs text-center" style={{ color: 'var(--text-3)', maxWidth: 80 }}>{label}</span>
    </div>
  );
}

// ── Result panel ──────────────────────────────────────────────────────────────

function AeoResult({ result }: { result: AEOAnalysisResponse }) {
  const [showIntro, setShowIntro] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-6 justify-center py-4" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <ScoreRing score={result.scores.overall_aeo_score} label="Overall AEO" />
        <ScoreRing score={result.scores.answer_readiness}  label="Answer readiness" />
        <ScoreRing score={result.scores.snippet_readiness} label="Snippet readiness" />
        <ScoreRing score={result.scores.pz_readiness}      label="Position-zero" />
        <ScoreRing score={result.scores.voice_readiness}   label="Voice readiness" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3" style={{ border: '1px solid var(--border)' }}>
          <div className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>Snippet ready</div>
          <div className="text-lg font-bold" style={{ color: result.snippet_ready ? 'var(--success)' : 'var(--text-3)' }}>
            {result.snippet_ready ? 'Yes' : 'No'}
          </div>
        </div>
        <div className="p-3" style={{ border: '1px solid var(--border)' }}>
          <div className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>PZ opportunities</div>
          <div className="text-lg font-bold tabular-nums" style={{ color: 'var(--text)', fontFamily: 'ui-monospace, monospace' }}>
            {result.pz_opportunities}
          </div>
        </div>
        <div className="p-3" style={{ border: '1px solid var(--border)' }}>
          <div className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>Questions mapped</div>
          <div className="text-lg font-bold tabular-nums" style={{ color: 'var(--text)', fontFamily: 'ui-monospace, monospace' }}>
            {result.questions_mapped}
          </div>
        </div>
        <div className="p-3" style={{ border: '1px solid var(--border)' }}>
          <div className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>Questions answered</div>
          <div className="text-lg font-bold tabular-nums" style={{ color: 'var(--success)', fontFamily: 'ui-monospace, monospace' }}>
            {result.questions_answered}
          </div>
        </div>
      </div>

      {result.spoken_answer && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-3)' }}>
            <Mic size={11} /> Spoken answer (voice search)
          </p>
          <div className="text-sm p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-2)', lineHeight: 1.6, fontStyle: 'italic' }}>
            "{result.spoken_answer}"
          </div>
        </div>
      )}

      {result.priority_actions.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>Priority actions</p>
          <ul className="space-y-1.5">
            {result.priority_actions.map((r, i) => (
              <li key={i} className="flex gap-2 text-xs" style={{ color: 'var(--text-2)', lineHeight: 1.5 }}>
                <span style={{ color: 'var(--brand)', flexShrink: 0 }}>→</span>{r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.quick_wins.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>Quick wins</p>
          <div className="flex flex-wrap gap-1.5">
            {result.quick_wins.map((w, i) => (
              <span key={i} className="text-xs px-2 py-0.5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                {w}
              </span>
            ))}
          </div>
        </div>
      )}

      {result.optimised_intro && (
        <div>
          <button
            onClick={() => setShowIntro(v => !v)}
            className="flex items-center gap-2 text-xs font-semibold mb-2"
            style={{ color: 'var(--text-2)' }}
          >
            {showIntro ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Optimised intro paragraph
          </button>
          {showIntro && (
            <div
              className="text-xs p-3 max-h-56 overflow-y-auto"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-2)', lineHeight: 1.7 }}
            >
              {result.optimised_intro}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const ENGINE_TARGETS = [
  'google_featured_snippet', 'google_ai_overview', 'bing_answer_box',
  'perplexity', 'chatgpt', 'siri', 'alexa', 'google_assistant',
  'people_also_ask', 'knowledge_panel',
];

export default function AEO() {
  const [docs,       setDocs]       = useState<DocumentListItem[]>([]);
  const [docsLoaded, setDocsLoaded] = useState(false);

  const [selectedDoc, setSelectedDoc]     = useState('');
  const [selectedTargets, setSelectedTargets] = useState<string[]>(ENGINE_TARGETS.slice(0, 4));
  const [analyzing,    setAnalyzing]    = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');
  const [result,       setResult]       = useState<AEOAnalysisResponse | null>(null);

  useEffect(() => {
    getDashboardDocuments({ status: 'completed', page_size: 50 })
      .then(d => {
        setDocs(d);
        if (d.length && !selectedDoc) setSelectedDoc((d[0].document_id ?? d[0].id ?? '') as string);
      })
      .catch(() => {/* non-fatal */})
      .finally(() => setDocsLoaded(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleTarget(t: string) {
    setSelectedTargets(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    );
  }

  function handleAnalyze() {
    if (!selectedDoc) return;
    const doc = docs.find(d => ((d.document_id ?? d.id) as string) === selectedDoc);
    setAnalyzing(true);
    setAnalyzeError('');
    setResult(null);
    analyzeAeo({
      document_id: selectedDoc,
      tenant_id:   getTenantId(),
      content:     (doc?.filename
        ? `Document: ${doc.filename} — AEO analysis for answer engine optimisation`
        : `Document ID: ${selectedDoc} — AEO analysis for answer engine optimisation`
      ),
      title:          doc?.filename ?? '',
      engine_targets: selectedTargets,
    })
      .then(setResult)
      .catch(() => setAnalyzeError('AEO analysis failed. Check backend connectivity.'))
      .finally(() => setAnalyzing(false));
  }

  const input: React.CSSProperties = {
    padding: '0.45rem 0.75rem',
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    fontSize: '0.8125rem',
    fontFamily: 'inherit',
    width: '100%',
  };

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh' }}>
      <header
        className="flex items-center justify-between px-7 py-4 sticky top-0 z-10"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)', letterSpacing: '-0.01em' }}>
            AEO
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
            Answer Engine Optimisation — featured snippets, voice search, position-zero
          </p>
        </div>
      </header>

      <div className="px-7 py-6 max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="md:col-span-1">
            <div className="p-4 space-y-4" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Analyse for AEO</h2>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>Document</label>
                {!docsLoaded ? (
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-3)' }}><Loader2 size={11} className="animate-spin" /> Loading…</div>
                ) : docs.length === 0 ? (
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>No completed documents yet.</p>
                ) : (
                  <select value={selectedDoc} onChange={e => setSelectedDoc(e.target.value)} style={input}>
                    {docs.map(d => {
                      const id = (d.document_id ?? d.id ?? '') as string;
                      return <option key={id} value={id}>{d.filename ?? id}</option>;
                    })}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-2)' }}>Answer engine targets</label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {ENGINE_TARGETS.map(t => (
                    <label key={t} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedTargets.includes(t)}
                        onChange={() => toggleTarget(t)}
                        className="accent-[var(--brand)]"
                      />
                      <span className="text-xs capitalize" style={{ color: 'var(--text-2)' }}>{t.replace(/_/g, ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={analyzing || !selectedDoc || selectedTargets.length === 0}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold transition-colors disabled:opacity-40"
                style={{ background: 'var(--brand)', color: '#111' }}
              >
                <MessageCircleQuestion size={14} />
                {analyzing ? 'Analysing…' : 'Analyse'}
              </button>
              {analyzeError && <p className="text-xs" style={{ color: 'var(--danger)' }}>{analyzeError}</p>}
            </div>
          </div>

          {/* Result */}
          <div className="md:col-span-2">
            {analyzing && (
              <div className="flex items-center gap-2 text-sm py-12 justify-center" style={{ color: 'var(--text-3)' }}>
                <Loader2 size={15} className="animate-spin" /> Running AEO analysis…
              </div>
            )}
            {!analyzing && !result && (
              <div className="text-center py-16">
                <FileSearch size={28} className="mx-auto mb-3" style={{ color: 'var(--text-3)' }} />
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>Select a document and click Analyse.</p>
              </div>
            )}
            {!analyzing && result && <AeoResult result={result} />}
          </div>
        </div>
      </div>
    </div>
  );
}
