import { useState, useEffect } from 'react';
import { Loader2, Globe, ChevronDown, ChevronUp } from 'lucide-react';
import { getDashboardDocuments } from '../../api/dashboard';
import { analyzeGeo } from '../../api/geo';
import type { DocumentListItem, GeoAnalysisResponse } from '../../types';

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

function GeoResult({ result }: { result: GeoAnalysisResponse }) {
  const [showContent, setShowContent] = useState(false);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-6 justify-center py-4" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <ScoreRing score={result.llm_visibility_score}     label="LLM visibility" />
        <ScoreRing score={result.entity_coverage}          label="Entity coverage" />
        <ScoreRing score={result.citation_readiness}       label="Citation readiness" />
        <ScoreRing score={result.context_richness_score}   label="Context richness" />
      </div>

      {result.extracted_entities.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>Extracted entities</p>
          <div className="flex flex-wrap gap-1.5">
            {result.extracted_entities.map((e, i) => (
              <span key={i} className="text-xs px-2 py-0.5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                {e}
              </span>
            ))}
          </div>
        </div>
      )}

      {result.recommendations.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>Recommendations</p>
          <ul className="space-y-1.5">
            {result.recommendations.map((r, i) => (
              <li key={i} className="flex gap-2 text-xs" style={{ color: 'var(--text-2)', lineHeight: 1.5 }}>
                <span style={{ color: 'var(--brand)', flexShrink: 0 }}>→</span>{r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.optimised_content && (
        <div>
          <button
            onClick={() => setShowContent(v => !v)}
            className="flex items-center gap-2 text-xs font-semibold mb-2"
            style={{ color: 'var(--text-2)' }}
          >
            {showContent ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Optimised content
          </button>
          {showContent && (
            <div
              className="text-xs p-3 max-h-56 overflow-y-auto"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-2)', lineHeight: 1.7 }}
            >
              {result.optimised_content}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const AI_MODELS = ['ChatGPT', 'Perplexity', 'Google AI Overviews', 'Claude', 'Gemini'];

export default function GEO() {
  const [docs,        setDocs]        = useState<DocumentListItem[]>([]);
  const [docsLoaded,  setDocsLoaded]  = useState(false);

  const [selectedDoc,  setSelectedDoc]  = useState('');
  const [selectedModels, setSelectedModels] = useState<string[]>(AI_MODELS.slice(0, 3));
  const [analyzing,    setAnalyzing]    = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');
  const [result,       setResult]       = useState<GeoAnalysisResponse | null>(null);

  // Lazy-load docs on first render
  useEffect(() => {
    getDashboardDocuments({ status: 'completed', page_size: 50 })
      .then(d => {
        setDocs(d);
        if (d.length && !selectedDoc) setSelectedDoc((d[0].document_id ?? d[0].id ?? '') as string);
      })
      .catch(() => {/* non-fatal */})
      .finally(() => setDocsLoaded(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleModel(m: string) {
    setSelectedModels(prev =>
      prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
    );
  }

  function handleAnalyze() {
    if (!selectedDoc) return;
    const doc = docs.find(d => ((d.document_id ?? d.id) as string) === selectedDoc);
    setAnalyzing(true);
    setAnalyzeError('');
    setResult(null);
    analyzeGeo({
      document_id:   selectedDoc,
      tenant_id:     '',
      content:       doc?.filename ?? selectedDoc,
      target_models: selectedModels,
    })
      .then(setResult)
      .catch(() => setAnalyzeError('GEO analysis failed. Check backend connectivity.'))
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
            GEO
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
            Generative Engine Optimisation — AI citation readiness
          </p>
        </div>
      </header>

      <div className="px-7 py-6 max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="md:col-span-1">
            <div className="p-4 space-y-4" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Analyse for GEO</h2>

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
                <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-2)' }}>Target AI models</label>
                <div className="space-y-1.5">
                  {AI_MODELS.map(m => (
                    <label key={m} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedModels.includes(m)}
                        onChange={() => toggleModel(m)}
                        className="accent-[var(--brand)]"
                      />
                      <span className="text-xs" style={{ color: 'var(--text-2)' }}>{m}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={analyzing || !selectedDoc || selectedModels.length === 0}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold transition-colors disabled:opacity-40"
                style={{ background: 'var(--brand)', color: '#111' }}
              >
                <Globe size={14} />
                {analyzing ? 'Analysing…' : 'Analyse'}
              </button>
              {analyzeError && <p className="text-xs" style={{ color: 'var(--danger)' }}>{analyzeError}</p>}
            </div>
          </div>

          {/* Result */}
          <div className="md:col-span-2">
            {analyzing && (
              <div className="flex items-center gap-2 text-sm py-12 justify-center" style={{ color: 'var(--text-3)' }}>
                <Loader2 size={15} className="animate-spin" /> Running GEO analysis…
              </div>
            )}
            {!analyzing && !result && (
              <div className="text-center py-16">
                <Globe size={28} className="mx-auto mb-3" style={{ color: 'var(--text-3)' }} />
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>Select a document and click Analyse.</p>
              </div>
            )}
            {!analyzing && result && <GeoResult result={result} />}
          </div>
        </div>
      </div>
    </div>
  );
}
