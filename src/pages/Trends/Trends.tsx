import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Loader2, AlertTriangle, TrendingUp, Play, AlertCircle } from 'lucide-react';
import { getTrendingTopics, getScraperPlatforms, runIndirectScrape, getDeadLetterItems } from '../../api/scraper';
import type { TrendingTopic, Platform, DeadLetterItem } from '../../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function relTime(iso: string | null | undefined) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)   return 'just now';
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function TopicRow({ topic }: { topic: TrendingTopic }) {
  const title     = (topic.title ?? topic.topic ?? '') as string;
  const platform  = (topic.platform ?? '') as string;
  const score     = typeof topic.score === 'number' ? topic.score : null;
  const timestamp = (topic.published_at ?? topic.timestamp ?? null) as string | null;
  const snippet   = (topic.snippet ?? '') as string;

  return (
    <div
      className="px-4 py-3 flex items-start gap-3"
      style={{ borderBottom: '1px solid var(--border)' }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{title || '—'}</p>
        {!!snippet && (
          <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-3)', lineHeight: 1.5 }}>
            {snippet}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3 flex-shrink-0 text-xs" style={{ fontFamily: 'ui-monospace, monospace' }}>
        {platform && (
          <span className="px-1.5 py-0.5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-3)' }}>
            {platform}
          </span>
        )}
        {score !== null && (
          <span style={{ color: 'var(--brand)' }}>{score.toFixed(2)}</span>
        )}
        <span style={{ color: 'var(--text-3)' }}>{relTime(timestamp)}</span>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = 'topics' | 'platforms' | 'dead';

export default function Trends() {
  const [tab,        setTab]        = useState<Tab>('topics');
  const [topics,     setTopics]     = useState<TrendingTopic[]>([]);
  const [platforms,  setPlatforms]  = useState<Platform[]>([]);
  const [deadItems,  setDeadItems]  = useState<DeadLetterItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [running,    setRunning]    = useState(false);
  const [runMsg,     setRunMsg]     = useState('');

  const load = useCallback((refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError('');
    Promise.all([
      getTrendingTopics().catch(() => [] as TrendingTopic[]),
      getScraperPlatforms().catch(() => [] as Platform[]),
      getDeadLetterItems(undefined, 20).catch(() => [] as DeadLetterItem[]),
    ]).then(([t, p, d]) => {
      setTopics(Array.isArray(t) ? t : []);
      setPlatforms(Array.isArray(p) ? p : []);
      setDeadItems(Array.isArray(d) ? d : []);
    })
    .catch(() => setError('Could not load trend data.'))
    .finally(() => { setLoading(false); setRefreshing(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleRun() {
    setRunning(true);
    setRunMsg('');
    runIndirectScrape({ queries: [] })
      .then(() => { setRunMsg('Scrape triggered — results will appear shortly.'); load(true); })
      .catch(() => setRunMsg('Could not trigger scrape. Check backend connectivity.'))
      .finally(() => setRunning(false));
  }

  const TABS: { id: Tab; label: string; count?: number }[] = [
    { id: 'topics',    label: 'Trending Topics', count: topics.length },
    { id: 'platforms', label: 'Platforms',       count: platforms.length },
    { id: 'dead',      label: 'Dead Letter',     count: deadItems.length },
  ];

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh' }}>
      <header
        className="flex items-center justify-between px-7 py-4 sticky top-0 z-10"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)', letterSpacing: '-0.01em' }}>
            Trends
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
            Real-time signals scraped from public sources
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRun}
            disabled={running}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40"
            style={{ background: 'var(--brand)', color: '#111' }}
          >
            <Play size={11} /> {running ? 'Running…' : 'Run scrape'}
          </button>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40"
            style={{ border: '1px solid var(--border)', color: 'var(--text-2)', background: 'var(--surface)' }}
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </header>

      {runMsg && (
        <div className="px-7 py-2 text-xs" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', color: 'var(--text-2)' }}>
          {runMsg}
        </div>
      )}

      <div className="px-7 py-6 max-w-5xl">
        {/* Tab bar */}
        <div className="flex mb-5" style={{ borderBottom: '1px solid var(--border)' }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors"
              style={{
                color:        tab === t.id ? 'var(--text)' : 'var(--text-3)',
                borderBottom: tab === t.id ? '2px solid var(--brand)' : '2px solid transparent',
                marginBottom: -1,
                background:   'none',
              }}
            >
              {t.label}
              {t.count !== undefined && (
                <span className="text-xs px-1.5 py-0.5" style={{ background: 'var(--surface-2)', color: 'var(--text-3)', borderRadius: 3 }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm py-16 justify-center" style={{ color: 'var(--text-3)' }}>
            <Loader2 size={15} className="animate-spin" /> Loading trends…
          </div>
        )}
        {!loading && error && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />
            <p className="text-sm" style={{ color: 'var(--text-2)' }}>{error}</p>
            <button onClick={() => load()} className="text-xs px-3 py-1.5" style={{ border: '1px solid var(--border)', color: 'var(--text-3)' }}>Retry</button>
          </div>
        )}

        {!loading && !error && tab === 'topics' && (
          <div style={{ border: '1px solid var(--border)' }}>
            {topics.length === 0 ? (
              <div className="text-center py-16">
                <TrendingUp size={24} className="mx-auto mb-3" style={{ color: 'var(--text-3)' }} />
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>No trending topics yet</p>
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>Click "Run scrape" to collect fresh signals.</p>
              </div>
            ) : (
              topics.map((t, i) => <TopicRow key={i} topic={t} />)
            )}
          </div>
        )}

        {!loading && !error && tab === 'platforms' && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {platforms.length === 0 ? (
              <p className="col-span-3 text-sm py-8 text-center" style={{ color: 'var(--text-3)' }}>No platforms configured.</p>
            ) : platforms.map((p, i) => (
              <div key={i} className="p-4 flex items-center justify-between" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
                <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{p.name}</span>
                <span
                  className="text-xs font-bold px-2 py-0.5"
                  style={{
                    color:      p.enabled ? 'var(--success)' : 'var(--text-3)',
                    background: p.enabled ? 'rgba(34,197,94,0.1)' : 'var(--surface-2)',
                    border:     `1px solid ${p.enabled ? 'rgba(34,197,94,0.25)' : 'var(--border)'}`,
                    borderRadius: 4,
                  }}
                >
                  {p.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && tab === 'dead' && (
          <div style={{ border: '1px solid var(--border)' }}>
            {deadItems.length === 0 ? (
              <div className="text-center py-16">
                <AlertCircle size={20} className="mx-auto mb-3" style={{ color: 'var(--text-3)' }} />
                <p className="text-sm" style={{ color: 'var(--text-3)' }}>No failed scrape items.</p>
              </div>
            ) : deadItems.map((d, i) => (
              <div key={i} className="px-4 py-3 flex items-start gap-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <AlertCircle size={13} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--danger)' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold" style={{ color: 'var(--text)', fontFamily: 'ui-monospace, monospace' }}>
                    [{d.platform}] {d.query}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--danger)' }}>{d.error}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{relTime(d.attempted_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
