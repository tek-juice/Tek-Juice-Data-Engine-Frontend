import { useState, useEffect } from 'react';
import {
  Globe2, Loader2, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { registerWebsiteCrawl, getCrawlStatus } from '../../api/ingest';
import type { CrawlStatusResponse } from '../../api/ingest';

// ─── Website Auto-Crawl ───────────────────────────────────────────────────────

export default function Credentials() {
  const [status, setStatus]      = useState<CrawlStatusResponse | null>(null);
  const [loading, setLoading]    = useState(true);
  const [saving, setSaving]      = useState(false);
  const [url, setUrl]            = useState('');
  const [maxPages, setMaxPages]  = useState(50);
  const [interval, setInterval_] = useState(24);
  const [error, setError]        = useState('');
  const [success, setSuccess]    = useState('');

  useEffect(() => {
    getCrawlStatus()
      .then(s => { setStatus(s); if (s.website_url) setUrl(s.website_url); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleRegister() {
    if (!url.trim()) { setError('Enter your website URL.'); return; }
    try { new URL(url); } catch { setError('Enter a valid URL (https://…)'); return; }
    setError(''); setSuccess(''); setSaving(true);
    try {
      const res = await registerWebsiteCrawl({
        website_url: url.trim(),
        max_pages: maxPages,
        recrawl_interval_hours: interval,
      });
      setSuccess(`Registered! First crawl queued — ${res.max_pages} pages, re-crawls every ${res.recrawl_interval_hours}h automatically.`);
      setStatus({
        registered: true,
        website_url: res.website_url,
        crawl_config: { max_pages: res.max_pages, max_depth: 3, recrawl_interval_hours: res.recrawl_interval_hours },
        last_crawled_at: null,
      });
    } catch {
      setError('Could not register — check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)' }}>

      {/* ── Page header ── */}
      <div
        className="px-6 py-5"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2 mb-0.5">
          <Globe2 size={15} style={{ color: 'var(--text-2)' }} />
          <h1 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Website Setup</h1>
        </div>
        <p className="text-xs ml-5" style={{ color: 'var(--text-3)' }}>
          Register your website once. The Engine crawls, analyses, and publishes automatically from here.
        </p>
      </div>

      <div className="px-6 py-6 max-w-2xl">
        <div className="p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <p className="text-xs leading-relaxed mb-5" style={{ color: 'var(--text-2)' }}>
            Register your website URL once. The Engine will automatically crawl every page,
            chunk and embed the content, detect gaps against live trends, and generate
            AI-written sections to fill them — then re-crawl on the interval you set.
            <span className="font-medium" style={{ color: 'var(--text)' }}> No further action required.</span>
          </p>

          {loading ? (
            <div className="flex items-center gap-2 py-4" style={{ color: 'var(--text-3)' }}>
              <Loader2 size={13} className="animate-spin" /> Loading…
            </div>
          ) : (
            <div className="space-y-4">
              {status?.registered && (
                <div className="px-4 py-3 flex items-start gap-3" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--success)' }} />
                  <div className="text-xs" style={{ color: 'var(--text-2)' }}>
                    <span className="font-medium" style={{ color: 'var(--text)' }}>Active:</span>{' '}
                    <span style={{ color: 'var(--success)', fontFamily: 'ui-monospace, monospace' }}>{status.website_url}</span>
                    <br />
                    <span style={{ color: 'var(--text-3)' }}>
                      Crawl every {status.crawl_config?.recrawl_interval_hours ?? 24}h &nbsp;·&nbsp;
                      Last crawl: {status.last_crawled_at
                        ? new Date(status.last_crawled_at).toLocaleString()
                        : 'Pending first run'}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>
                  Website URL <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://yourwebsite.com"
                  className="w-full px-3 py-2 text-sm outline-none transition-colors"
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    fontFamily: 'ui-monospace, monospace',
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Max pages per crawl</label>
                  <input
                    type="number"
                    min={1} max={200}
                    value={maxPages}
                    onChange={e => setMaxPages(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm outline-none transition-colors"
                    style={{
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                      fontFamily: 'ui-monospace, monospace',
                    }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Re-crawl every (hours)</label>
                  <input
                    type="number"
                    min={1} max={168}
                    value={interval}
                    onChange={e => setInterval_(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm outline-none transition-colors"
                    style={{
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                      fontFamily: 'ui-monospace, monospace',
                    }}
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--danger)' }}>
                  <AlertTriangle size={11} /> {error}
                </p>
              )}
              {success && (
                <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--success)' }}>
                  <CheckCircle2 size={11} /> {success}
                </p>
              )}

              <button
                onClick={handleRegister}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-40"
                style={{ background: 'var(--text)', color: 'var(--bg)' }}
              >
                {saving
                  ? <><Loader2 size={12} className="animate-spin" /> Registering…</>
                  : <><Globe2 size={12} /> {status?.registered ? 'Update & Re-crawl' : 'Register & Start Crawl'}</>
                }
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
