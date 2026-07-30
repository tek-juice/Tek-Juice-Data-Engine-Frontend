import { useState, useEffect, useCallback } from 'react';
import {
  Globe, CheckCircle2, Loader2, RefreshCw,
  AlertTriangle, ArrowRight, Clock, Zap,
} from 'lucide-react';
import { registerWebsiteCrawl, getCrawlStatus } from '../../api/ingest';
import type { CrawlStatusResponse } from '../../api/ingest';

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WebsiteSetup() {
  const [url, setUrl]               = useState('');
  const [maxPages, setMaxPages]     = useState(50);
  const [maxDepth, setMaxDepth]     = useState(3);
  const [recrawlHours, setRecrawlHours] = useState(24);

  const [status, setStatus]   = useState<CrawlStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

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
    if (!trimmed)          { setError('Enter your website URL.'); return; }
    if (!isValidUrl(trimmed)) { setError('Enter a valid URL including https://'); return; }

    setSaving(true);
    try {
      await registerWebsiteCrawl({
        website_url: trimmed,
        max_pages:   maxPages,
        max_depth:   maxDepth,
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
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center gap-2 text-zinc-600">
        <Loader2 size={14} className="animate-spin" />
        <span className="text-xs font-mono">Loading…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 px-6 py-8 max-w-2xl">

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-8 h-8 bg-zinc-100 flex items-center justify-center flex-shrink-0">
          <Globe size={14} className="text-zinc-900" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-zinc-100">Website Setup</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Register your product's website — Data Engine crawls it automatically and keeps everything optimised.
          </p>
        </div>
      </div>

      {/* Current status banner */}
      {status?.registered && (
        <div className="border border-emerald-800 bg-emerald-950/30 px-4 py-3 mb-6 flex items-start gap-3">
          <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-emerald-300 mb-0.5">Website registered</p>
            <p className="text-xs font-mono text-zinc-400 truncate">{status.website_url}</p>
            <div className="flex items-center gap-4 mt-2 text-xs font-mono text-zinc-600">
              <span className="flex items-center gap-1">
                <Clock size={10} /> Last crawled: {relTime(status.last_crawled_at)}
              </span>
              <span>Recrawls every {status.crawl_config?.recrawl_interval_hours ?? 24}h</span>
            </div>
          </div>
          <button
            onClick={loadStatus}
            className="text-zinc-600 hover:text-zinc-300 transition-colors flex-shrink-0"
            title="Refresh status"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      )}

      {/* Form */}
      <div className="bg-zinc-900 border border-zinc-800 p-6 space-y-5">

        {/* URL */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-1.5">
            Website URL <span className="text-red-400">*</span>
          </label>
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://yourproduct.com"
            className="w-full bg-zinc-950 border border-zinc-700 text-zinc-100 text-sm font-mono px-3 py-2.5 focus:outline-none focus:border-zinc-400 placeholder:text-zinc-700 rounded-sm"
          />
          <p className="text-xs text-zinc-600 mt-1.5">
            The Engine crawls every page under this domain — static sites, React/Next.js SPAs, and Cloudflare-protected pages all work.
          </p>
        </div>

        {/* Config row */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Max pages</label>
            <input
              type="number" min={1} max={500}
              value={maxPages}
              onChange={e => setMaxPages(Number(e.target.value))}
              className="w-full bg-zinc-950 border border-zinc-700 text-zinc-100 text-sm font-mono px-3 py-2 focus:outline-none focus:border-zinc-400 rounded-sm"
            />
            <p className="text-xs text-zinc-700 mt-1">Pages per crawl</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Max depth</label>
            <input
              type="number" min={1} max={10}
              value={maxDepth}
              onChange={e => setMaxDepth(Number(e.target.value))}
              className="w-full bg-zinc-950 border border-zinc-700 text-zinc-100 text-sm font-mono px-3 py-2 focus:outline-none focus:border-zinc-400 rounded-sm"
            />
            <p className="text-xs text-zinc-700 mt-1">Link depth from root</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Recrawl every</label>
            <div className="relative">
              <input
                type="number" min={1} max={168}
                value={recrawlHours}
                onChange={e => setRecrawlHours(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-700 text-zinc-100 text-sm font-mono px-3 py-2 pr-10 focus:outline-none focus:border-zinc-400 rounded-sm"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-600 pointer-events-none">h</span>
            </div>
            <p className="text-xs text-zinc-700 mt-1">Hours between crawls</p>
          </div>
        </div>

        {/* Error / success */}
        {error && (
          <div className="flex items-start gap-2 border border-red-900/50 bg-red-950/20 px-3 py-2.5">
            <AlertTriangle size={13} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-2 border border-emerald-800 bg-emerald-950/20 px-3 py-2.5">
            <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-300">{success}</p>
          </div>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-900 text-xs font-semibold hover:bg-white transition-colors disabled:opacity-40"
        >
          {saving
            ? <><Loader2 size={13} className="animate-spin" /> Registering…</>
            : <><Zap size={13} /> {status?.registered ? 'Update & re-crawl' : 'Register & start crawl'}</>
          }
        </button>
      </div>

      {/* What happens next */}
      <div className="mt-6 border border-zinc-800 p-5">
        <h2 className="text-xs font-semibold text-zinc-300 mb-4">What happens after registration</h2>
        <div className="space-y-3">
          {([
            ['Crawl',        'Every page on your site is fetched — including SPAs and Cloudflare-protected pages.'],
            ['Chunk + Embed','Each page is split into semantic chunks and embedded with Gemini.'],
            ['Gap Detection','Content is scored against live trend signals to find missing topics.'],
            ['AI Drafts',    'Gemini writes QS-optimised content drafts for every gap found.'],
            ['Auto-repeat',  `The entire cycle repeats every ${recrawlHours}h with no action needed.`],
          ] as [string, string][]).map(([step, desc], i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-5 h-5 bg-zinc-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-mono text-zinc-400">{i + 1}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-zinc-200">{step}</span>
                <span className="text-xs text-zinc-500 ml-2">{desc}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center gap-2 text-xs text-zinc-600">
          <ArrowRight size={11} />
          View results in
          <span className="text-zinc-400 font-medium ml-1">Dashboard → Gap Detection → Drafts</span>
        </div>
      </div>

    </div>
  );
}
