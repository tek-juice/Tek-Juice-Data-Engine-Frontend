import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Loader2, AlertTriangle, Code2, Copy, Check } from 'lucide-react';
import { getDashboardDocuments } from '../../api/dashboard';
import { generateSchema, getSchemaTypes } from '../../api/schemas';
import { getTenantId } from '../../services/auth.service';
import type { DocumentListItem, SchemaType, SchemaGenerateResponse } from '../../types';

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 text-xs px-2 py-1"
      style={{ border: '1px solid var(--border)', color: 'var(--text-3)', background: 'var(--surface)' }}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

// ── Schema result panel ───────────────────────────────────────────────────────

function SchemaResult({ result }: { result: SchemaGenerateResponse }) {
  const jsonld   = JSON.stringify(result.jsonld, null, 2);
  const ogJson   = JSON.stringify(result.open_graph, null, 2);

  return (
    <div className="space-y-4">
      {/* Scores */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>Citation score</div>
          <div
            className="text-3xl font-bold tabular-nums"
            style={{ color: (result.citation_score ?? 0) >= 70 ? 'var(--success)' : (result.citation_score ?? 0) >= 40 ? 'var(--warning)' : 'var(--danger)', fontFamily: 'ui-monospace, monospace' }}
          >
            {(result.citation_score ?? 0).toFixed(0)}
            <span className="text-sm font-normal ml-1" style={{ color: 'var(--text-3)' }}>/100</span>
          </div>
        </div>
        <div className="p-3" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>Zero-click score</div>
          <div
            className="text-3xl font-bold tabular-nums"
            style={{ color: (result.zero_click_score ?? 0) >= 70 ? 'var(--success)' : (result.zero_click_score ?? 0) >= 40 ? 'var(--warning)' : 'var(--danger)', fontFamily: 'ui-monospace, monospace' }}
          >
            {(result.zero_click_score ?? 0).toFixed(0)}
            <span className="text-sm font-normal ml-1" style={{ color: 'var(--text-3)' }}>/100</span>
          </div>
        </div>
      </div>

      {/* First sentence */}
      {result.first_sentence && (
        <div className="p-3" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>First sentence (AI summary seed)</p>
          <p className="text-sm" style={{ color: 'var(--text)', lineHeight: 1.6 }}>{result.first_sentence}</p>
        </div>
      )}

      {/* JSON-LD */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>JSON-LD — paste in &lt;head&gt;</p>
          <CopyBtn text={result.script_tag} />
        </div>
        <pre
          className="text-xs p-3 overflow-x-auto max-h-60"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-2)', fontFamily: 'ui-monospace, monospace', lineHeight: 1.5 }}
        >
          {jsonld}
        </pre>
      </div>

      {/* Open Graph */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Open Graph meta tags</p>
          <CopyBtn text={result.metadata_html} />
        </div>
        <pre
          className="text-xs p-3 overflow-x-auto max-h-40"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-2)', fontFamily: 'ui-monospace, monospace', lineHeight: 1.5 }}
        >
          {ogJson}
        </pre>
      </div>

      {/* sameAs */}
      {result.same_as_urls.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>sameAs URLs</p>
          <ul className="space-y-1">
            {result.same_as_urls.map((url, i) => (
              <li key={i}>
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: 'var(--info)' }}>{url}</a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const SCHEMA_TYPES: SchemaType[] = [
  'Article', 'FAQPage', 'HowTo', 'Product', 'Organisation',
  'WebPage', 'Dataset', 'SoftwareApplication', 'ImageObject', 'VideoObject',
];

export default function SchemaFactory() {
  const [docs,        setDocs]        = useState<DocumentListItem[]>([]);
  const [schemaTypes, setSchemaTypes] = useState<SchemaType[]>(SCHEMA_TYPES);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [refreshing,  setRefreshing]  = useState(false);

  const [selectedDoc,    setSelectedDoc]    = useState('');
  const [selectedType,   setSelectedType]   = useState<SchemaType>('Article');
  const [generating,     setGenerating]     = useState(false);
  const [genError,       setGenError]       = useState('');
  const [result,         setResult]         = useState<SchemaGenerateResponse | null>(null);

  const load = useCallback((refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError('');
    Promise.all([
      getDashboardDocuments({ status: 'completed', page_size: 50 }).catch(() => [] as DocumentListItem[]),
      getSchemaTypes().catch(() => SCHEMA_TYPES),
    ]).then(([d, types]) => {
      setDocs(d);
      if (types.length) setSchemaTypes(types);
      if (d.length && !selectedDoc) setSelectedDoc((d[0].document_id ?? d[0].id ?? '') as string);
    })
    .catch(() => setError('Could not load documents.'))
    .finally(() => { setLoading(false); setRefreshing(false); });
  }, [selectedDoc]);

  useEffect(() => { load(); }, [load]);

  function handleGenerate() {
    if (!selectedDoc) return;
    const doc = docs.find(d => ((d.document_id ?? d.id) as string) === selectedDoc);
    setGenerating(true);
    setGenError('');
    setResult(null);
    generateSchema({
      document_id: selectedDoc,
      tenant_id:   getTenantId(),
      content:     doc?.filename
        ? `Document: ${doc.filename} — schema generation for structured data`
        : `Document ID: ${selectedDoc} — schema generation for structured data`,
      schema_type: selectedType,
    })
      .then(setResult)
      .catch(() => setGenError('Schema generation failed. Check backend connectivity.'))
      .finally(() => setGenerating(false));
  }

  const select: React.CSSProperties = {
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
            Schema Factory
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
            Generate GEO-optimised JSON-LD structured data
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
            <Loader2 size={15} className="animate-spin" /> Loading…
          </div>
        )}
        {!loading && error && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />
            <p className="text-sm" style={{ color: 'var(--text-2)' }}>{error}</p>
            <button onClick={() => load()} className="text-xs px-3 py-1.5" style={{ border: '1px solid var(--border)', color: 'var(--text-3)' }}>Retry</button>
          </div>
        )}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Controls */}
            <div className="md:col-span-1 space-y-4">
              <div className="p-4 space-y-4" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
                <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Generate schema</h2>

                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>
                    Document
                  </label>
                  {docs.length === 0 ? (
                    <p className="text-xs" style={{ color: 'var(--text-3)' }}>No completed documents yet.</p>
                  ) : (
                    <select value={selectedDoc} onChange={e => setSelectedDoc(e.target.value)} style={select}>
                      {docs.map(d => {
                        const id = (d.document_id ?? d.id ?? '') as string;
                        return <option key={id} value={id}>{d.filename ?? id}</option>;
                      })}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>
                    Schema type
                  </label>
                  <select value={selectedType} onChange={e => setSelectedType(e.target.value as SchemaType)} style={select}>
                    {schemaTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={generating || !selectedDoc}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold transition-colors disabled:opacity-40"
                  style={{ background: 'var(--brand)', color: '#111' }}
                >
                  <Code2 size={14} />
                  {generating ? 'Generating…' : 'Generate'}
                </button>

                {genError && (
                  <p className="text-xs" style={{ color: 'var(--danger)' }}>{genError}</p>
                )}
              </div>
            </div>

            {/* Result */}
            <div className="md:col-span-2">
              {generating && (
                <div className="flex items-center gap-2 text-sm py-12 justify-center" style={{ color: 'var(--text-3)' }}>
                  <Loader2 size={15} className="animate-spin" /> Generating schema…
                </div>
              )}
              {!generating && !result && (
                <div className="text-center py-16">
                  <Code2 size={28} className="mx-auto mb-3" style={{ color: 'var(--text-3)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                    Select a document and schema type, then click Generate.
                  </p>
                </div>
              )}
              {!generating && result && <SchemaResult result={result} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
