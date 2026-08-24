import { useState, useEffect, useCallback } from 'react';
import {
  Globe, CheckCircle2, Loader2, RefreshCw,
  AlertTriangle, ArrowRight, Clock, Zap,
} from 'lucide-react';
import { registerWebsiteCrawl, getCrawlStatus } from '../../api/ingest';
import type { CrawlStatusResponse } from '../../api/ingest';

function relTime(iso: string | null | undefined) {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function isValidUrl(val: string) {
  try { new URL(val); return true; } catch { return false; }
}

export default function WebsiteSetup() {
  const [url, setUrl]               = useState('');
  const [maxPages, setMaxPages]     = useState(50);
  const [maxDepth, setMaxDepth]     = useState(3);
  const [recrawlHours, setRecrawlHours] = useState(24);
  const [status, setStatus]         = useState<CrawlStatusResponse | null>(null);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');

  const loadStatus = useCallback(() => {
    setLoading(true);
    getCrawlStatus()
      .then(s => {
        setStatus(s);
        if (s.registered && s.website_url) {
          setUrl(s.website_url);
          if (s.crawl_config) {
            setMaxPages(s.crawl_config.max_pages ?? 50);
            setMaxDepth(s.crawl_config.max_depth ?? 3);
            setRecrawlHours(s.crawl_config.recrawl_interval_hours ?? 24);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);

  const handleSave = async () => {
    setError(''); setSuccess('');
    const trimmed = url.trim();
    if (!trimmed)             { setError('Enter your website URL.'); return; }
    if (!isValidUrl(trimmed)) { setError('Enter a valid URL including https://'); return; }
    setSaving(true);
    try {
      await registerWebsiteCrawl({
        website_url:            trimmed,
        max_pages:              maxPages,
        max_depth:              maxDepth,
        recrawl_interval_hours: recrawlHours,
      });
      setSuccess(
        `Website registered. First crawl queued — every page will be automatically ` +
        `chunked, embedded, gap-analysed, and AI-written. ` +
        `Re-crawl runs every ${recrawlHours}h with no further action needed.`
      );
      loadStatus();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail ?? 'Failed to register. Check the URL and try again.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div
        className="flex items-center justify-center h-full min-h-64 gap-2"
        style={{ background: 'var(--bg)', color: 'var(--text-3)' }}
      >
        <Loader2 size={14} className="animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  const inputCls = [
    'w-full px-3 py-2.5 text-sm outline-none transition-colors',
    'bg-[var(--surface-2)] border border-[var(--border)]',
    'text-[var(--text)] placeholder:text-[var(--text-3)]',
    'focus:border-[var(--text-2)]',
  ].join(' ');

  return (
    <div
      className="min-h-screen px-7 py-8 max-w-2xl"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div
          className="w-8 h-8 flex items-center justify-center flex-shrink-0 rounded"
          style={{ background: 'var(--brand)' }}
        >
          <Globe size={14} style={{ color: '#111' }} />
        </div>
        <div>
          <h1 className="text-base font-bold" style={{ color: 'var(--text)' }}>Website Setup</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
            Register your product's website — Data Engine crawls it automatically.
          </p>
        </div>
      </div>

      {/* Status banner */}
      {status?.registered && (
        <div
          className="px-4 py-3 mb-6 flex items-start gap-3 rounded"
          style={{
            border:     '1px solid rgba(34,197,94,0.25)',
            background: 'rgba(34,197,94,0.06)',
          }}
        >
          <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--success)' }}>Website registered</p>
            <p className="text-xs truncate" style={{ color: 'var(--text-2)' }}>{status.website_url}</p>
            <div className="flex items-center gap-4 mt-2 text-xs" style={{ color: 'var(--text-3)' }}>
              <span className="flex items-center gap-1">
                <Clock size={10} /> Last crawled: {relTime(status.last_crawled_at)}
              </span>
              <span>Recrawls every {status.crawl_config?.recrawl_interval_hours ?? 24}h</span>
            </div>
          </div>
          <button
            onClick={loadStatus}
            className="flex-shrink-0 transition-colors"
            style={{ color: 'var(--text-3)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
            title="Refresh status"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      )}

      {/* Form */}
      <div
        className="p-6 space-y-5 rounded"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>
            Website URL <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input
            type="url" value={url} onChange={e => setUrl(e.target.value)}
            placeholder="https://yourproduct.com"
            className={inputCls}
          />
          <p className="text-xs mt-1.5" style={{ color: 'var(--text-3)' }}>
            Static sites, React/Next.js SPAs, and Cloudflare-protected pages all work.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Max pages</label>
            <input type="number" min={1} max={500} value={maxPages}
              onChange={e => setMaxPages(Number(e.target.value))} className={inputCls} />
            <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Pages per crawl</p>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Max depth</label>
            <input type="number" min={1} max={10} value={maxDepth}
              onChange={e => setMaxDepth(Number(e.target.value))} className={inputCls} />
            <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Link depth from root</p>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Recrawl every</label>
            <div className="relative">
              <input type="number" min={1} max={168} value={recrawlHours}
                onChange={e => setRecrawlHours(Number(e.target.value))}
                className={inputCls + ' pr-8'} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs pointer-events-none"
                style={{ color: 'var(--text-3)' }}>h</span>
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Hours between crawls</p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded"
            style={{ border: '1px solid var(--danger-border)', background: 'var(--danger-bg)' }}>
            <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--danger)' }} />
            <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-2 px-3 py-2.5 rounded"
            style={{ border: '1px solid rgba(34,197,94,0.25)', background: 'rgba(34,197,94,0.06)' }}>
            <CheckCircle2 size={13} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
            <p className="text-xs" style={{ color: 'var(--success)' }}>{success}</p>
          </div>
        )}

        <button
          onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded transition-colors disabled:opacity-40"
          style={{ background: 'var(--brand)', color: '#111' }}
        >
          {saving
            ? <><Loader2 size={13} className="animate-spin" /> Registering…</>
            : <><Zap size={13} /> {status?.registered ? 'Update & re-crawl' : 'Register & start crawl'}</>
          }
        </button>
      </div>

      {/* What happens next */}
      <div className="mt-6 p-5 rounded" style={{ border: '1px solid var(--border)' }}>
        <h2 className="text-xs font-bold uppercase mb-4"
          style={{ color: 'var(--text-3)', letterSpacing: '0.06em' }}>
          What happens after registration
        </h2>
        <div className="space-y-3">
          {([
            ['Crawl',         'Every page on your site is fetched — including SPAs and Cloudflare-protected pages.'],
            ['Chunk + Embed', 'Each page is split into semantic chunks and embedded with Gemini.'],
            ['Gap Detection', 'Content is scored against live trend signals to find missing topics.'],
            ['AI Drafts',     'Gemini writes QS-optimised content drafts for every gap found.'],
            ['Auto-repeat',   `The entire cycle repeats every ${recrawlHours}h with no action needed.`],
          ] as [string, string][]).map(([step, desc], i) => (
            <div key={i} className="flex items-start gap-3">
              <div
                className="w-5 h-5 flex items-center justify-center flex-shrink-0 mt-0.5 rounded text-xs font-bold"
                style={{ background: 'var(--surface-2)', color: 'var(--text-3)' }}
              >
                {i + 1}
              </div>
              <div>
                <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{step}</span>
                <span className="text-xs ml-2" style={{ color: 'var(--text-3)' }}>{desc}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 flex items-center gap-2 text-xs"
          style={{ borderTop: '1px solid var(--border)', color: 'var(--text-3)' }}>
          <ArrowRight size={11} />
          View results in
          <span className="font-medium ml-1" style={{ color: 'var(--text-2)' }}>
            Dashboard → Gap Detection → Drafts
          </span>
        </div>
      </div>
    </div>
  );
}
