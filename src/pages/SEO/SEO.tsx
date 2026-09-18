import { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { getCrawlStatus } from '../../api/ingest';
import { getRankings, getDomainAuthority } from '../../api/seo';
import type { RankSnapshot, AuthoritySnapshot } from '../../types';

function domain(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

function ScoreBar({ label, value, max = 100 }: { label: string; value: number | undefined | null; max?: number }) {
  const v = value ?? 0;
  const pct = Math.min(100, (v / max) * 100);
  const color = pct >= 70 ? 'var(--success)' : pct >= 40 ? 'var(--warning)' : 'var(--danger)';
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs w-36 flex-shrink-0" style={{ color: 'var(--text-2)' }}>{label}</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-bold tabular-nums w-12 text-right" style={{ color }}>{v.toLocaleString()}</span>
    </div>
  );
}

export default function SEO() {
  const [siteDomain, setSiteDomain] = useState('');
  const [rankings,   setRankings]   = useState<RankSnapshot[]>([]);
  const [authority,  setAuthority]  = useState<AuthoritySnapshot | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');

  const load = useCallback(() => {
    setLoading(true); setError('');
    getCrawlStatus()
      .then(async s => {
        if (!s.website_url) { setLoading(false); return; }
        const d = domain(s.website_url);
        setSiteDomain(d);
        const [ranks, auth] = await Promise.allSettled([
          getRankings(d, '', 30),
          getDomainAuthority(d, 90),
        ]);
        if (ranks.status === 'fulfilled')  setRankings(ranks.value);
        if (auth.status === 'fulfilled') {
          // API returns array; take latest snapshot
          const arr = Array.isArray(auth.value) ? auth.value : [auth.value];
          setAuthority(arr[arr.length - 1] ?? null);
        }
      })
      .catch(() => setError('Could not load SEO data.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="px-7 py-7 max-w-3xl" style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh' }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-base font-bold" style={{ color: 'var(--text)' }}>SEO</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
            {siteDomain ? `Keyword rankings and domain authority for ${siteDomain}` : 'Keyword rankings and domain authority.'}
          </p>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors disabled:opacity-40" style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}>
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {loading && <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-3)' }}><Loader2 size={14} className="animate-spin" /> Loading…</div>}
      {error   && <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--danger)' }}><AlertTriangle size={14} /> {error}</div>}

      {!loading && !siteDomain && !error && (
        <div className="py-16 text-center">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>No website connected yet</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Register your website in Website Setup to enable SEO tracking.</p>
        </div>
      )}

      {/* Domain Authority */}
      {authority && (
        <div className="p-5 mb-6 rounded space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="text-sm font-bold" style={{ color: 'var(--text)' }}>Domain Authority</h2>
          <ScoreBar label="Domain rank"        value={authority.domain_rank}        max={100} />
          <ScoreBar label="Total backlinks"    value={authority.total_backlinks}     max={Math.max(authority.total_backlinks, 1000)} />
          <ScoreBar label="Referring domains"  value={authority.referring_domains}   max={Math.max(authority.referring_domains, 500)} />
          <ScoreBar label="New backlinks 30d"  value={authority.new_backlinks_30d}   max={Math.max(authority.new_backlinks_30d, 100)} />
          <ScoreBar label="Spam score"         value={authority.spam_score}          max={100} />
          {authority.top_anchors?.length > 0 && (
            <div className="pt-1">
              <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-3)' }}>Top anchors</p>
              <div className="flex flex-wrap gap-1.5">
                {authority.top_anchors.slice(0, 10).map(a => (
                  <span key={a.anchor} className="px-2 py-0.5 text-xs rounded-sm" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                    {a.anchor} <span style={{ color: 'var(--text-3)' }}>×{a.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rankings */}
      {rankings.length > 0 && (
        <div className="p-5 rounded" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--text)' }}>Keyword Rankings</h2>
          <div className="space-y-1.5">
            {rankings.map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2 rounded" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <span className="text-sm font-bold tabular-nums w-8 text-center" style={{ color: r.position <= 3 ? 'var(--success)' : r.position <= 10 ? 'var(--info)' : 'var(--text-3)' }}>
                  #{r.position}
                </span>
                <span className="flex-1 text-sm truncate" style={{ color: 'var(--text)' }}>{r.keyword}</span>
                <span className="text-xs tabular-nums" style={{ color: 'var(--text-3)' }}>Vol {r.search_volume?.toLocaleString() ?? '—'}</span>
                <span className="text-xs tabular-nums" style={{ color: 'var(--text-3)' }}>CPC ${r.cpc?.toFixed(2) ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && siteDomain && rankings.length === 0 && !authority && (
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>No ranking data yet — DataForSEO tracking starts after the first crawl.</p>
      )}
    </div>
  );
}
