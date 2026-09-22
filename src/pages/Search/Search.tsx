import { useState, useCallback, useRef } from 'react';
import { Search, Loader2, AlertTriangle, Zap } from 'lucide-react';
import { embedTexts } from '../../api/vectors';
import { searchVectors } from '../../api/vectors';
import { getTenantId } from '../../services/auth.service';
import type { VectorSearchResult } from '../../types';

// ── Result card ───────────────────────────────────────────────────────────────

function ResultCard({ result, rank }: { result: VectorSearchResult; rank: number }) {
  const pct = Math.round(result.similarity * 100);
  const color =
    pct >= 80 ? 'var(--success)' :
    pct >= 60 ? 'var(--info, #3b82f6)' :
    pct >= 40 ? 'var(--warning)' :
               'var(--text-3)';

  return (
    <div
      className="px-5 py-4"
      style={{ borderBottom: '1px solid var(--border)' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
      onMouseLeave={e => (e.currentTarget.style.background = '')}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex-shrink-0 text-xs font-bold tabular-nums w-6 text-right mt-0.5"
          style={{ color: 'var(--text-3)', fontFamily: 'ui-monospace, monospace' }}
        >
          {rank}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>
            {result.text}
          </p>
          {result.metadata && Object.keys(result.metadata).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(result.metadata)
                .filter(([, v]) => v != null && String(v).length < 60)
                .slice(0, 4)
                .map(([k, v]) => (
                  <span
                    key={k}
                    className="text-xs px-1.5 py-0.5"
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-3)',
                      fontFamily: 'ui-monospace, monospace',
                    }}
                  >
                    {k}: {String(v)}
                  </span>
                ))
              }
            </div>
          )}
        </div>
        <div className="flex-shrink-0 text-right">
          <span
            className="text-sm font-bold tabular-nums"
            style={{ color, fontFamily: 'ui-monospace, monospace' }}
          >
            {pct}%
          </span>
          <div
            className="h-1 w-16 mt-1 overflow-hidden"
            style={{ background: 'var(--surface-2)', borderRadius: 2 }}
          >
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${pct}%`, background: color, borderRadius: 2 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SearchPage() {
  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState<VectorSearchResult[]>([]);
  const [topK,     setTopK]     = useState(10);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const tenantId = getTenantId();

  const handleSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    setSearched(true);

    try {
      // Step 1: embed the query text
      const embedResp = await embedTexts([trimmed]);
      const queryVector = embedResp.embeddings?.[0];
      if (!queryVector || queryVector.length === 0) {
        throw new Error('Embedding returned empty vector.');
      }

      // Step 2: vector search
      const hits = await searchVectors({
        query_vector: queryVector,
        tenant_id: tenantId,
        top_k: topK,
        similarity_threshold: 0.3,
      });
      setResults(hits);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail ?? (err as Error).message ?? 'Search failed.';
      setError(msg);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, topK]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') void handleSearch(query);
  }

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh' }}>
      {/* Header */}
      <header
        className="px-7 py-4 sticky top-0 z-10"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--text)', letterSpacing: '-0.01em' }}>
          Semantic Search
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>
          Vector similarity search across all embedded content
        </p>
      </header>

      <div className="px-7 py-6 max-w-4xl">
        {/* Search bar */}
        <div
          className="flex items-center gap-3 px-4 py-3 mb-2"
          style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}
        >
          <Search size={15} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search your content semantically…"
            className="flex-1 text-sm outline-none bg-transparent"
            style={{ color: 'var(--text)' }}
            autoFocus
          />
          <div className="flex items-center gap-3 flex-shrink-0">
            <label className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-3)' }}>
              Top
              <select
                value={topK}
                onChange={e => setTopK(Number(e.target.value))}
                className="text-xs outline-none px-1 py-0.5"
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  borderRadius: 3,
                }}
              >
                {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <button
              onClick={() => void handleSearch(query)}
              disabled={loading || !query.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-40"
              style={{ background: 'var(--brand)', color: '#111', borderRadius: 3 }}
            >
              {loading
                ? <><Loader2 size={11} className="animate-spin" /> Searching…</>
                : <><Zap size={11} /> Search</>
              }
            </button>
          </div>
        </div>
        <p className="text-xs mb-6" style={{ color: 'var(--text-3)' }}>
          Press <kbd style={{ fontFamily: 'ui-monospace, monospace', background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '0 4px', borderRadius: 3 }}>Enter</kbd> to search · Results ranked by cosine similarity
        </p>

        {/* Error */}
        {error && (
          <div
            className="flex items-center gap-2 px-4 py-3 mb-6 text-sm"
            style={{ border: '1px solid var(--danger)', background: 'var(--danger-bg, #2d1212)', color: 'var(--danger)', borderRadius: 4 }}
          >
            <AlertTriangle size={14} className="flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Results */}
        {!loading && searched && !error && (
          results.length > 0 ? (
            <div style={{ border: '1px solid var(--border)' }}>
              <div
                className="flex items-center justify-between px-5 py-3"
                style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
              >
                <p className="text-xs font-bold" style={{ color: 'var(--text)' }}>
                  {results.length} result{results.length !== 1 ? 's' : ''} for{' '}
                  <span style={{ color: 'var(--brand)' }}>"{query}"</span>
                </p>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>Similarity score</p>
              </div>
              {results.map((r, i) => (
                <ResultCard key={r.chunk_id} result={r} rank={i + 1} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <Search size={24} className="mx-auto mb-3" style={{ color: 'var(--text-3)' }} />
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>No results found</p>
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                Try different keywords, or upload more content for the engine to index.
              </p>
            </div>
          )
        )}

        {/* Empty state before first search */}
        {!loading && !searched && (
          <div className="text-center py-24">
            <Search size={32} className="mx-auto mb-4" style={{ color: 'var(--text-3)' }} />
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>Semantic search</p>
            <p className="text-sm max-w-xs mx-auto" style={{ color: 'var(--text-3)', lineHeight: 1.6 }}>
              Search by meaning, not keywords. The engine finds the most semantically similar chunks across all your embedded content.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
