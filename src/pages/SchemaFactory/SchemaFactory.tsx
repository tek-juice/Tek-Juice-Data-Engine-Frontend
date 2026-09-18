import { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, Code2, CheckCircle2, AlertTriangle, FileJson, Zap } from 'lucide-react';
import { listDocuments } from '../../api/ingest';
import type { DocumentListItem } from '../../types';

function relTime(iso: string | null | undefined) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

const SCHEMA_TYPES = [
  { type: 'FAQPage',       desc: 'Q&A pairs — boosts AI Overview eligibility',        color: '#a78bfa' },
  { type: 'HowTo',         desc: 'Step-by-step processes — featured snippet trigger',  color: '#3b82f6' },
  { type: 'Article',       desc: 'E-E-A-T authorship + date signals',                  color: '#22c55e' },
  { type: 'Product',       desc: 'Price, availability, review schema',                 color: '#f59e0b' },
  { type: 'LocalBusiness', desc: 'NAP + opening hours — local pack visibility',        color: '#ef4444' },
  { type: 'BreadcrumbList', desc: 'Sitelinks + navigation context',                    color: '#06b6d4' },
];

export default function SchemaFactory() {
  const [docs,        setDocs]        = useState<DocumentListItem[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [generating,  setGenerating]  = useState<string | null>(null);
  const [generated,   setGenerated]   = useState<Record<string, string>>({});

  const load = useCallback(() => {
    setLoading(true); setError('');
    listDocuments({ page: 1, page_size: 50, status: 'completed' })
      .then(res => {
        const arr = Array.isArray(res) ? res : ((res as Record<string,unknown>).items as typeof res ?? []);
        // Deduplicate by filename
        const seen = new Set<string>();
        setDocs(arr.filter(d => {
          if (seen.has(d.filename)) return false;
          seen.add(d.filename);
          return true;
        }));
      })
      .catch(() => setError('Could not load documents.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function generateSchema(doc: DocumentListItem, schemaType: string) {
    const key = `${doc.id}-${schemaType}`;
    setGenerating(key);
    try {
      // Use the quality score engine to generate a content brief for this schema type
      const res = await fetch('/api/v1/gaps/quality-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token') ?? ''}`,
        },
        body: JSON.stringify({
          content: `${doc.filename.replace(/\.html?$/i, '').replace(/[-_]/g, ' ')} — ${schemaType} schema optimisation for ultimatemove.co.uk`,
          title: doc.filename.replace(/\.html?$/i, ''),
          query: schemaType.toLowerCase() + ' schema',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const schemaJson = JSON.stringify({
          '@context': 'https://schema.org',
          '@type': schemaType,
          name: doc.filename.replace(/\.html?$/i, '').replace(/[-_]/g, ' '),
          description: data.quick_wins?.[0] ?? `${schemaType} for ${doc.filename}`,
          url: 'https://ultimatemove.co.uk',
        }, null, 2);
        setGenerated(prev => ({ ...prev, [key]: schemaJson }));
      }
    } catch {
      // silent
    } finally {
      setGenerating(null);
    }
  }

  return (
    <div className="px-7 py-7 max-w-5xl" style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh' }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
            <FileJson size={16} style={{ color: 'var(--text-2)' }} />
            Schema Factory
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
            Generate JSON-LD structured data schemas for each crawled page — improves AI Overview eligibility and rich results.
          </p>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold disabled:opacity-40" style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Schema type legend */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-6">
        {SCHEMA_TYPES.map(s => (
          <div key={s.type} className="flex items-start gap-2 p-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <Code2 size={12} className="mt-0.5 flex-shrink-0" style={{ color: s.color }} />
            <div>
              <p className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{s.type}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {loading && <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-3)' }}><Loader2 size={14} className="animate-spin" /> Loading pages…</div>}
      {error   && <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--danger)' }}><AlertTriangle size={14} /> {error}</div>}

      {!loading && docs.length === 0 && !error && (
        <div className="py-16 text-center">
          <FileJson size={24} className="mx-auto mb-3" style={{ color: 'var(--text-3)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>No completed pages yet</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Crawl a website first from Website Setup.</p>
        </div>
      )}

      {/* Document list */}
      <div className="space-y-3">
        {docs.map(doc => (
          <div key={doc.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            {/* Doc header */}
            <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <CheckCircle2 size={13} style={{ color: 'var(--success)', flexShrink: 0 }} />
              <span className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--text)' }}>
                {doc.filename.replace(/\.html?$/i, '').replace(/[-_]/g, ' ')}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-3)', fontFamily: 'ui-monospace, monospace' }}>
                {doc.chunk_count ?? 0} chunks · {relTime(doc.created_at)}
              </span>
            </div>

            {/* Schema action buttons */}
            <div className="px-4 py-3 flex flex-wrap gap-2">
              {SCHEMA_TYPES.map(s => {
                const key = `${doc.id}-${s.type}`;
                const done = !!generated[key];
                const busy = generating === key;
                return (
                  <button
                    key={s.type}
                    disabled={busy}
                    onClick={() => !done && generateSchema(doc, s.type)}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50"
                    style={{
                      border: `1px solid ${done ? s.color : 'var(--border)'}`,
                      color: done ? s.color : 'var(--text-3)',
                      background: done ? `color-mix(in srgb, ${s.color} 8%, transparent)` : 'var(--bg)',
                    }}
                  >
                    {busy
                      ? <Loader2 size={10} className="animate-spin" />
                      : done
                      ? <CheckCircle2 size={10} />
                      : <Zap size={10} />
                    }
                    {s.type}
                  </button>
                );
              })}
            </div>

            {/* Generated schema output */}
            {SCHEMA_TYPES.map(s => {
              const key = `${doc.id}-${s.type}`;
              if (!generated[key]) return null;
              return (
                <div key={key} className="px-4 pb-3">
                  <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-3)', fontFamily: 'ui-monospace, monospace' }}>
                    {s.type} — generated
                  </p>
                  <pre
                    className="text-xs p-3 overflow-x-auto rounded-sm"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-2)', fontFamily: 'ui-monospace, monospace', maxHeight: 160 }}
                  >
                    {generated[key]}
                  </pre>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
