import { useState, useEffect } from 'react';
import { Loader2, Globe, ChevronDown, ChevronUp, Package, Image as ImageIcon, Video } from 'lucide-react';
import { getDashboardDocuments } from '../../api/dashboard';
import { analyzeGeo, createLeoItem, analyzeImageSeo, analyzeVideoSeo } from '../../api/geo';
import { getTenantId } from '../../services/auth.service';
import type {
  DocumentListItem, GeoAnalysisResponse, LeoItem, ImageSeoResponse, VideoSeoResponse,
} from '../../types';

// ── Shared ────────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  padding: '0.45rem 0.75rem',
  background: 'var(--surface-2)',
  border: '1px solid var(--border)',
  color: 'var(--text)',
  fontSize: '0.8125rem',
  fontFamily: 'inherit',
  width: '100%',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>{label}</label>
      {children}
    </div>
  );
}

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

// ── Tabs ──────────────────────────────────────────────────────────────────────

type TabKey = 'analyze' | 'leo' | 'vseo-image' | 'vseo-video';

const TABS: { key: TabKey; label: string; icon: typeof Globe }[] = [
  { key: 'analyze',     label: 'GEO Analysis',  icon: Globe },
  { key: 'leo',         label: 'LEO Inventory', icon: Package },
  { key: 'vseo-image',  label: 'VSEO Images',   icon: ImageIcon },
  { key: 'vseo-video',  label: 'VSEO Video',    icon: Video },
];

function TabBar({ active, onChange }: { active: TabKey; onChange: (t: TabKey) => void }) {
  return (
    <div className="flex gap-1 mb-6" style={{ borderBottom: '1px solid var(--border)' }}>
      {TABS.map(t => {
        const Icon = t.icon;
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors"
            style={{
              color: isActive ? 'var(--brand)' : 'var(--text-3)',
              borderBottom: isActive ? '2px solid var(--brand)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            <Icon size={13} /> {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ── GEO Analysis tab (existing behaviour) ──────────────────────────────────────

function GeoResult({ result }: { result: GeoAnalysisResponse }) {
  const [showContent, setShowContent] = useState(false);

  const citationScore = typeof result.citation_readiness === 'boolean'
    ? (result.citation_readiness ? 100 : 0)
    : (result.citation_readiness ?? 0);

  const entityLabels: string[] = (result.extracted_entities ?? []).map((e: unknown) =>
    typeof e === 'string' ? e : (e as { text?: string }).text ?? ''
  ).filter(Boolean);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-6 justify-center py-4" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <ScoreRing score={result.llm_visibility_score ?? 0}   label="LLM visibility" />
        <ScoreRing score={result.entity_coverage ?? 0}        label="Entity coverage" />
        <ScoreRing score={citationScore}                       label="Citation readiness" />
        <ScoreRing score={result.context_richness_score ?? 0} label="Context richness" />
      </div>

      {entityLabels.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>Extracted entities</p>
          <div className="flex flex-wrap gap-1.5">
            {entityLabels.map((label, i) => (
              <span key={i} className="text-xs px-2 py-0.5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                {label}
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

const AI_MODELS = ['ChatGPT', 'Perplexity', 'Google AI Overviews', 'Claude', 'Gemini'];

function GeoAnalysisTab() {
  const [docs,        setDocs]        = useState<DocumentListItem[]>([]);
  const [docsLoaded,  setDocsLoaded]  = useState(false);

  const [selectedDoc,  setSelectedDoc]  = useState('');
  const [selectedModels, setSelectedModels] = useState<string[]>(AI_MODELS.slice(0, 3));
  const [analyzing,    setAnalyzing]    = useState(false);
  const [analyzeError, setAnalyzeError] = useState('');
  const [result,       setResult]       = useState<GeoAnalysisResponse | null>(null);

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
    setSelectedModels(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  }

  function handleAnalyze() {
    if (!selectedDoc) return;
    const doc = docs.find(d => ((d.document_id ?? d.id) as string) === selectedDoc);
    setAnalyzing(true);
    setAnalyzeError('');
    setResult(null);
    analyzeGeo({
      document_id:   selectedDoc,
      tenant_id:     getTenantId(),
      content:       (doc?.filename
        ? `Document: ${doc.filename} — GEO analysis for generative engine optimisation`
        : `Document ID: ${selectedDoc} — GEO analysis for generative engine optimisation`
      ),
      target_models: selectedModels,
    })
      .then(setResult)
      .catch(() => setAnalyzeError('GEO analysis failed. Check backend connectivity.'))
      .finally(() => setAnalyzing(false));
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1">
        <div className="p-4 space-y-4" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Analyse for GEO</h2>

          <Field label="Document">
            {!docsLoaded ? (
              <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-3)' }}><Loader2 size={11} className="animate-spin" /> Loading…</div>
            ) : docs.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>No completed documents yet.</p>
            ) : (
              <select value={selectedDoc} onChange={e => setSelectedDoc(e.target.value)} style={inputStyle}>
                {docs.map(d => {
                  const id = (d.document_id ?? d.id ?? '') as string;
                  return <option key={id} value={id}>{d.filename ?? id}</option>;
                })}
              </select>
            )}
          </Field>

          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-2)' }}>Target AI models</label>
            <div className="space-y-1.5">
              {AI_MODELS.map(m => (
                <label key={m} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={selectedModels.includes(m)} onChange={() => toggleModel(m)} className="accent-[var(--brand)]" />
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
  );
}

// ── LEO Inventory tab ───────────────────────────────────────────────────────────

function LeoTab() {
  const [item, setItem] = useState<LeoItem>({
    id: '', name: '', description: '', brand: '', sku: '', category: '', url: '', image_url: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');
  const [result, setResult]         = useState<unknown>(null);

  function update<K extends keyof LeoItem>(key: K, value: LeoItem[K]) {
    setItem(prev => ({ ...prev, [key]: value }));
  }

  function handleSubmit() {
    if (!item.name || !item.description) return;
    setSubmitting(true);
    setError('');
    setResult(null);
    createLeoItem({ ...item, id: item.id || crypto.randomUUID() })
      .then(setResult)
      .catch(() => setError('Could not build LEO item. Check backend connectivity.'))
      .finally(() => setSubmitting(false));
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="p-4 space-y-4" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Build a LEO item</h2>
        <p className="text-xs" style={{ color: 'var(--text-3)' }}>
          Live Entity Optimisation — builds Schema.org Product/Entity markup for AI shopping agents and knowledge panels.
        </p>

        <Field label="Name *"><input style={inputStyle} value={item.name} onChange={e => update('name', e.target.value)} /></Field>
        <Field label="Description *"><textarea style={{ ...inputStyle, minHeight: 70 }} value={item.description} onChange={e => update('description', e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Brand"><input style={inputStyle} value={item.brand ?? ''} onChange={e => update('brand', e.target.value)} /></Field>
          <Field label="SKU"><input style={inputStyle} value={item.sku ?? ''} onChange={e => update('sku', e.target.value)} /></Field>
        </div>
        <Field label="Category"><input style={inputStyle} value={item.category ?? ''} onChange={e => update('category', e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="URL"><input style={inputStyle} value={item.url ?? ''} onChange={e => update('url', e.target.value)} /></Field>
          <Field label="Image URL"><input style={inputStyle} value={item.image_url ?? ''} onChange={e => update('image_url', e.target.value)} /></Field>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting || !item.name || !item.description}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold transition-colors disabled:opacity-40"
          style={{ background: 'var(--brand)', color: '#111' }}
        >
          <Package size={14} />
          {submitting ? 'Building…' : 'Build LEO Item'}
        </button>
        {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
      </div>

      <div>
        {!result && (
          <div className="text-center py-16">
            <Package size={28} className="mx-auto mb-3" style={{ color: 'var(--text-3)' }} />
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>Fill in the item details and build.</p>
          </div>
        )}
        {result != null && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>Generated entity markup</p>
            <pre
              className="text-xs leading-relaxed overflow-auto max-h-96 p-3"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
            >
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

// ── VSEO Image tab ────────────────────────────────────────────────────────────

function VseoImageTab() {
  const [url, setUrl]           = useState('');
  const [altText, setAltText]   = useState('');
  const [caption, setCaption]   = useState('');
  const [filename, setFilename] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState('');
  const [result, setResult]     = useState<ImageSeoResponse | null>(null);

  function handleSubmit() {
    if (!url || !altText) return;
    setSubmitting(true);
    setError('');
    setResult(null);
    analyzeImageSeo({ url, alt_text: altText, caption, filename })
      .then(setResult)
      .catch(() => setError('Could not score image. Check backend connectivity.'))
      .finally(() => setSubmitting(false));
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="p-4 space-y-4" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Score an image</h2>
        <Field label="Image URL *"><input style={inputStyle} value={url} onChange={e => setUrl(e.target.value)} /></Field>
        <Field label="Alt text *"><input style={inputStyle} value={altText} onChange={e => setAltText(e.target.value)} /></Field>
        <Field label="Caption"><input style={inputStyle} value={caption} onChange={e => setCaption(e.target.value)} /></Field>
        <Field label="Filename"><input style={inputStyle} value={filename} onChange={e => setFilename(e.target.value)} /></Field>

        <button
          onClick={handleSubmit}
          disabled={submitting || !url || !altText}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold transition-colors disabled:opacity-40"
          style={{ background: 'var(--brand)', color: '#111' }}
        >
          <ImageIcon size={14} />
          {submitting ? 'Scoring…' : 'Score Image'}
        </button>
        {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
      </div>

      <div>
        {!result && (
          <div className="text-center py-16">
            <ImageIcon size={28} className="mx-auto mb-3" style={{ color: 'var(--text-3)' }} />
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>Enter an image URL and alt text, then score.</p>
          </div>
        )}
        {result && (
          <div className="space-y-5">
            <div className="flex gap-6 justify-center py-4" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
              <ScoreRing score={result.overall_score}   label="Overall score" />
              <ScoreRing score={result.alt_text_score}  label="Alt text score" />
            </div>
            {result.issues?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>Issues</p>
                <ul className="space-y-1">
                  {result.issues.map((issue, i) => (
                    <li key={i} className="flex gap-2 text-xs" style={{ color: 'var(--text-2)', lineHeight: 1.5 }}>
                      <span style={{ color: 'var(--danger)', flexShrink: 0 }}>•</span>{issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.optimised_alt_text && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>Optimised alt text</p>
                <div className="text-xs p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-2)', lineHeight: 1.6 }}>
                  {result.optimised_alt_text}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── VSEO Video tab ────────────────────────────────────────────────────────────

function VseoVideoTab() {
  const [url, setUrl]                 = useState('');
  const [name, setName]               = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState('');
  const [result, setResult]           = useState<VideoSeoResponse | null>(null);

  function handleSubmit() {
    if (!url || !name || !description) return;
    setSubmitting(true);
    setError('');
    setResult(null);
    analyzeVideoSeo({ url, name, description, thumbnail_url: thumbnailUrl })
      .then(setResult)
      .catch(() => setError('Could not score video. Check backend connectivity.'))
      .finally(() => setSubmitting(false));
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="p-4 space-y-4" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Score a video</h2>
        <Field label="Video URL *"><input style={inputStyle} value={url} onChange={e => setUrl(e.target.value)} /></Field>
        <Field label="Name *"><input style={inputStyle} value={name} onChange={e => setName(e.target.value)} /></Field>
        <Field label="Description *"><textarea style={{ ...inputStyle, minHeight: 70 }} value={description} onChange={e => setDescription(e.target.value)} /></Field>
        <Field label="Thumbnail URL"><input style={inputStyle} value={thumbnailUrl} onChange={e => setThumbnailUrl(e.target.value)} /></Field>

        <button
          onClick={handleSubmit}
          disabled={submitting || !url || !name || !description}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-bold transition-colors disabled:opacity-40"
          style={{ background: 'var(--brand)', color: '#111' }}
        >
          <Video size={14} />
          {submitting ? 'Scoring…' : 'Score Video'}
        </button>
        {error && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
      </div>

      <div>
        {!result && (
          <div className="text-center py-16">
            <Video size={28} className="mx-auto mb-3" style={{ color: 'var(--text-3)' }} />
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>Enter video details, then score.</p>
          </div>
        )}
        {result && (
          <div className="space-y-5">
            <div className="flex gap-6 justify-center py-4" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
              <ScoreRing score={result.overall_score}       label="Overall score" />
              <ScoreRing score={result.metadata_score}      label="Metadata score" />
              <ScoreRing score={result.transcript_score}    label="Transcript score" />
            </div>
            {result.ai_summary && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>AI summary</p>
                <div className="text-xs p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-2)', lineHeight: 1.6 }}>
                  {result.ai_summary}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function GEO() {
  const [tab, setTab] = useState<TabKey>('analyze');

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
            Generative Engine Optimisation — AI citation readiness, entity feeds, and visual SEO
          </p>
        </div>
      </header>

      <div className="px-7 py-6 max-w-5xl">
        <TabBar active={tab} onChange={setTab} />
        {tab === 'analyze'    && <GeoAnalysisTab />}
        {tab === 'leo'        && <LeoTab />}
        {tab === 'vseo-image' && <VseoImageTab />}
        {tab === 'vseo-video' && <VseoVideoTab />}
      </div>
    </div>
  );
}
