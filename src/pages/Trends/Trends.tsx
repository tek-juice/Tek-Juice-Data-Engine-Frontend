import { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, AlertTriangle, TrendingUp } from 'lucide-react';
import { getTrendingTopics } from '../../api/scraper';
import type { TrendingTopic } from '../../types';

function relTime(iso: string | null | undefined) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export default function Trends() {
  const [topics,  setTopics]  = useState<TrendingTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const load = useCallback(() => {
    setLoading(true); setError('');
    getTrendingTopics()
      .then(setTopics)
      .catch(() => setError('Could not load trending topics from the backend.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Group by platform
  const grouped = topics.reduce<Record<string, TrendingTopic[]>>((acc, t) => {
    const p = t.platform ?? 'other';
    acc[p] = [...(acc[p] ?? []), t];
    return acc;
  }, {});

  return (
    <div className="px-7 py-7 max-w-3xl" style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-base font-bold" style={{ color: 'var(--text)' }}>Trends</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
            Live trending topics scraped from Google, Bing, Reddit, YouTube, and more.
          </p>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors disabled:opacity-40" style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {loading && <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-3)' }}><Loader2 size={14} className="animate-spin" /> Loading…</div>}
      {error   && <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--danger)' }}><AlertTriangle size={14} /> {error}</div>}

      {!loading && !error && topics.length === 0 && (
        <div className="py-16 text-center">
          <TrendingUp size={24} className="mx-auto mb-3" style={{ color: 'var(--text-3)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>No trending topics yet</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>The scraper runs automatically on a schedule.</p>
        </div>
      )}

      {!loading && Object.entries(grouped).map(([platform, items]) => (
        <div key={platform} className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-3)', letterSpacing: '0.07em' }}>
            {platform}
          </p>
          <div className="space-y-1.5">
            {items.map((t, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3 rounded"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <span className="text-xs tabular-nums w-5 flex-shrink-0 text-right" style={{ color: 'var(--text-3)' }}>{i + 1}</span>
                <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text)' }}>{t.topic}</span>
                {t.score != null && (
                  <span className="text-xs tabular-nums font-semibold" style={{ color: 'var(--brand)' }}>
                    {typeof t.score === 'number' ? t.score.toFixed(0) : t.score}
                  </span>
                )}
                <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-3)' }}>{relTime(t.timestamp as string)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
