import { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangle, Search, BarChart2 } from 'lucide-react';
import { getDashboardDocuments } from '../../api/dashboard';
import { analyzeSeo, registerRankConfig } from '../../api/seo';
import type { DocumentListItem, SeoAnalysisResponse } from '../../types';

// ── Score bar ─────────────────────────────────────────────────────────────────

function ScoreBar({ label, score }: { label: string; score: number }) {
  const pct   = Math.min(100, Math.max(0, score));
  const color = pct >= 80 ? 'var(--success)' : pct >= 60 ? 'var(--info)' : pct >= 40 ? 'var(--warning)' : 'var(--danger)';
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs w-32 flex-shrink-0" style={{ color: 'var(--text-2)' }}>{label}</span>
      <div className="flex-1 h-1.5 overflow-hidden" style={{ background: 'var(--surface-2)', borderRadius: 2 }}>
        <div className="h-full transition-all duration-700" style={{ width: `${pct}%`, background: color, borderRadius: 2 }} />
      </div>
      <span className="text-xs font-bold tabular-nums w-8 text-right" style={{ color, fontFamily: 'ui-monospace, monospace' }}>{pct.toFixed(0)}</span>
    </div>
  );
}

// ── Result panel ──────────────────────────────────────────────────────────────

function SeoResult({ result }: { result: SeoAnalysisResponse }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>Overall SEO score</div>
          <div
            className="text-4xl font-bold tabular-nums"
            style={{
              color: result.overall_score >= 80 ? 'var(--success)' : result.overall_score >= 60 ? 'var(--info)' : result.overall_score >= 40 ? 'var(--warning)' : 'var(--danger)',
              fontFamily: 'ui-monospace, monospace',
            }}
          >
            {result.overall_score.toFixed(0)}
            <span className="text-base font-normal ml-1" style={{ color: 'var(--text-3)' }}>/100</span>
          </div>
        </div>
        <div className="p-3" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>Readability</div>
          <div className="text-4xl font-bold tabular-nums" style={{ color: 'var(--info)', fontFamily: 'ui-monospace, monospace' }}>
            {result.readability_score.toFixed(0)}
            <span className="text-base font-normal ml-1" style={{ color: 'var(--text-3)' }}>/100</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <ScoreBar label="SEO score"    score={result.overall_score} />
        <ScoreBar label="Readability"  score={result.readability_score} />
      </div>

      {result.matched_keywords.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>Matched keywords</p>
          <div className="flex flex-wrap gap-1.5">
            {result.matched_keywords.map((kw, i) => (
              <span key={i} className="text-xs px-2 py-0.5" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: 'var(--success)' }}>
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      {Object.keys(result.keyword_density).length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>Keyword density</p>
          <div className="space-y-1.5">
            {Object.entries(result.keyword_density).slice(0, 8).map(([kw, den]) => (
              <div key={kw} className="flex items-center gap-2 text-xs" style={{ fontFamily: 'ui-monospace, monospace' }}>
                <span className="w-32 truncate" style={{ color: 'var(--text-2)' }}>{kw}</span>
                <div className="flex-1 h-1 overflow-hidden" style={{ background: 'var(--surface-2)', borderRadius: 1 }}>
                  <div className="h-full" style={{ width: `${Math.min(100, den * 200)}%`, background: 'var(--info)', borderRadius: 1 }} />
                </div>
                <span style={{ color: 'var(--text-3)' }}>{(den * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.issues.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--danger)' }}>Issues</p>
          <ul className="space-y-1">
            {result.issues.map((issue, i) => (
              <li key={i} className="flex gap-2 text-xs" style={{ color: 'var(--danger)', lineHeight: 1.5 }}>
                <span style={{ flexShrink: 0 }}>✗</span>{issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.recommendations.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>Recommendations</p>
          <ul className="space-y-1">
            {result.recommendations.map((r, i) => (
              <li key={i} className="flex gap-2 text-xs" style={{ color: 'var(--text-2)', lineHeight: 1.5 }}>
                <span style={{ color: 'var(--brand)', flexShrink: 0 }}>→</span>{r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SEO() {
  const [docs,        setDocs]        = useState<DocumentListItem[]>([]);
  const [docsLoaded,  setDocsLoaded]  = useState(false);
  const [docsError,   setDocsError]   = useState('');

  const [selectedDoc,  setSelectedDoc]  = useState('');
  const [keywords,     setKeywords]     = useState('');
  const [url,          setUrl]          = useState('');
  const [analyzing,    setAnalyzing]    = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');
  const [result,       setResult]       = useState<SeoAnalysisResponse | null>(null);

  // Rank tracking
  const [domain,       setDomain]       = useState('');
  const [keyword,      setKeyword]      = useState('');
  const [tracking,     setTracking]     = useState(false);
  const [trackMsg,     setTrackMsg]     = useState('');

  const loadDocs = useCallback(() => {
    setDocsError('');
    getDashboardDocuments({ status: 'completed', page_size: 50 })
      .then(d => {
        setDocs(d);
        if (d.length && !selectedDoc) setSelectedDoc((d[0].document_id ?? d[0].id ?? '') as string);
      })
      .catch(() => setDocsError('Could not load documents.'))
      .finally(() => setDocsLoaded(true));
  }, [selectedDoc]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  function handleAnalyze() {
    if (!selectedDoc) return;
    const doc  = docs.find(d => ((d.document_id ?? d.id) as string) === selectedDoc);
    const kws  = keywords.split(',').map(k => k.trim()).filter(Boolean);
    setAnalyzing(true);
    setAnalyzeError('');
    setResult(null);
    analyzeSeo({
      document_id:     selectedDoc,
      tenant_id:       '',
      content:         doc?.filename ?? selectedDoc,
      target_keywords: kws,
      url:             url || undefined,
    })
      .then(setResult)
      .catch(() => setAnalyzeError('SEO analysis failed. Check backend connectivity.'))
      .finally(() => setAnalyzing(false));
  }

  function handleTrack() {
    if (!domain || !keyword) return;
    setTracking(true);
    setTrackMsg('');
    registerRankConfig({ tenant_id: '', domain, keyword })
      .then(() => setTrackMsg(`Tracking registered: "${keyword}" on ${domain}`))
      .catch(() => setTrackMsg('Could not register rank tracking. Check backend.'))
      .finally(() => setTracking(false));
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
            SEO
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
            On-page SEO analysis and SERP rank tracking
          </p>
        </div>
      </header>

      <div className="px-7 py-6 max-w-5xl space-y-6">
        {docsError && (
          <div className="flex items-center gap-2 text-xs p-3" style={{ border: '1px solid var(--border)', color: 'var(--warning)', background: 'var(--surface)' }}>
            <AlertTriangle size={12} /> {docsError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Controls */}
          <div className="md:col-span-1 space-y-4">
            <div className="p-4 space-y-4" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Analyse document</h2>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>Document</label>
                {!docsLoaded ? (
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-3)' }}><Loader2 size={11} className="animate-spin" /> Loading…</div>
                ) : docs.length === 0 ? (
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>No completed documents.</p>
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
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>Target keywords (comma-separated)</label>
                <input
                  type="text"
                  value={keywords}
                  onChange={e => setKeywords(e.target.value)}
                  placeholder="seo, optimisation, content"
                  style={input}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>Page URL (optional)</label>
                <input
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://yourproduct.com/page"
                  style={input}
                />
              </div>

              <button
                onClick={handleAnalyze}
                disabled={analyzing || !selectedDoc}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold transition-colors disabled:opacity-40"
                style={{ background: 'var(--brand)', color: '#111' }}
              >
                <Search size={14} />
                {analyzing ? 'Analysing…' : 'Analyse'}
              </button>
              {analyzeError && <p className="text-xs" style={{ color: 'var(--danger)' }}>{analyzeError}</p>}
            </div>

            {/* Rank tracking */}
            <div className="p-4 space-y-4" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Track keyword rank</h2>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>Domain</label>
                <input type="text" value={domain} onChange={e => setDomain(e.target.value)} placeholder="yourproduct.com" style={input} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>Keyword</label>
                <input type="text" value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="project management tool" style={input} />
              </div>
              <button
                onClick={handleTrack}
                disabled={tracking || !domain || !keyword}
                className="w-full flex items-center justify-center gap-2 py-2 text-sm font-bold transition-colors disabled:opacity-40"
                style={{ border: '1px solid var(--border)', color: 'var(--text-2)', background: 'var(--surface-2)' }}
              >
                <BarChart2 size={13} />
                {tracking ? 'Registering…' : 'Start tracking'}
              </button>
              {trackMsg && <p className="text-xs" style={{ color: 'var(--text-2)' }}>{trackMsg}</p>}
            </div>
          </div>

          {/* Result */}
          <div className="md:col-span-2">
            {analyzing && (
              <div className="flex items-center gap-2 text-sm py-12 justify-center" style={{ color: 'var(--text-3)' }}>
                <Loader2 size={15} className="animate-spin" /> Running analysis…
              </div>
            )}
            {!analyzing && !result && (
              <div className="text-center py-16">
                <Search size={28} className="mx-auto mb-3" style={{ color: 'var(--text-3)' }} />
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>Select a document and click Analyse.</p>
              </div>
            )}
            {!analyzing && result && <SeoResult result={result} />}
          </div>
        </div>
      </div>
    </div>
  );
}
