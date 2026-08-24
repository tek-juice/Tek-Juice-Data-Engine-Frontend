import { useState, useCallback, useEffect } from 'react';
import {
  Key, Plus, Copy, Trash2, Eye, EyeOff,
  CheckCircle2, AlertTriangle, Shield, Code2, Zap,
  Webhook, Globe, Globe2, Loader2, RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react';
import {
  createApiKey, deleteApiKey, listApiKeys,
  registerWebhook, listWebhooks, deleteWebhook, getWebhookLogs,
} from '../../api/auth';
import { registerWebsiteCrawl, getCrawlStatus } from '../../api/ingest';
import type { CrawlStatusResponse } from '../../api/ingest';
import type {
  ApiKeyResponse, ApiKeyListItem,
  WebhookEndpoint, WebhookEventType, WebhookLogEntry,
} from '../../types';

// ─── Shared helpers ───────────────────────────────────────────────────────────

function maskKey(prefix: string) {
  return `${prefix}_${'•'.repeat(32)}`;
}

function CodeBlock({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    void navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="relative group bg-black border border-zinc-800 rounded">
      <pre className="text-xs font-mono text-zinc-300 px-4 py-3 overflow-x-auto whitespace-pre-wrap leading-relaxed">
        {children}
      </pre>
      <button
        onClick={copy}
        className="absolute top-2 right-2 px-2 py-1 text-xs font-mono border border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-500 transition-colors opacity-0 group-hover:opacity-100"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}

// ─── Create API key modal ─────────────────────────────────────────────────────

function CreateKeyModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (key: ApiKeyResponse) => void;
}) {
  const [name, setName]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function handleCreate() {
    if (!name.trim()) { setError('Give this key a name.'); return; }
    setError('');
    setLoading(true);
    try {
      const result = await createApiKey(name.trim());
      onCreate(result);
    } catch {
      setError('Could not create key — check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-zinc-900 border border-zinc-700 w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-sm font-semibold text-zinc-100 mb-1">Create API key</h2>
        <p className="text-xs text-zinc-500 mb-5">
          Give the key a name that describes where it will be used.
          The raw key is shown <span className="text-amber-400">once only</span> — copy it immediately.
        </p>

        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Key name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          placeholder="e.g. Production Backend"
          autoFocus
          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 text-zinc-100 text-sm font-mono placeholder-zinc-700 outline-none focus:border-zinc-400 transition-colors"
        />

        {error && (
          <p className="mt-2 text-xs text-red-400 flex items-center gap-1.5">
            <AlertTriangle size={11} /> {error}
          </p>
        )}

        <div className="flex items-center gap-2 mt-5 justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading}
            className="px-4 py-1.5 text-xs font-semibold bg-zinc-100 text-zinc-900 hover:bg-white transition-colors disabled:opacity-40"
          >
            {loading ? 'Creating…' : 'Create key'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Revealed key modal ───────────────────────────────────────────────────────

function RevealedKeyModal({ apiKey, name, onClose }: {
  apiKey: string;
  name: string;
  onClose: () => void;
}) {
  const [copied, setCopied]   = useState(false);
  const [visible, setVisible] = useState(false);

  function copy() {
    void navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const display = visible ? apiKey : apiKey.slice(0, 12) + '•'.repeat(32);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-zinc-900 border border-zinc-700 w-full max-w-lg p-6 shadow-2xl">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 size={15} className="text-emerald-400" />
          <h2 className="text-sm font-semibold text-zinc-100">Key created — "{name}"</h2>
        </div>
        <p className="text-xs text-amber-400 flex items-center gap-1.5 mb-5">
          <AlertTriangle size={11} />
          This is the only time the full key will be shown. Copy it now and store it securely.
        </p>

        <div className="bg-black border border-zinc-800 px-4 py-3 flex items-center gap-3 mb-4">
          <code className="flex-1 text-xs font-mono text-emerald-400 break-all leading-relaxed">
            {display}
          </code>
          <button
            onClick={() => setVisible(v => !v)}
            className="text-zinc-600 hover:text-zinc-300 transition-colors flex-shrink-0"
            aria-label={visible ? 'Hide key' : 'Show key'}
          >
            {visible ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>

        <button
          onClick={copy}
          className={`w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold border transition-colors ${
            copied
              ? 'border-emerald-600 text-emerald-400'
              : 'border-zinc-600 text-zinc-300 hover:border-zinc-400 hover:text-zinc-100'
          }`}
        >
          {copied ? <><CheckCircle2 size={12} /> Copied to clipboard</> : <><Copy size={12} /> Copy key</>}
        </button>

        <div className="mt-5">
          <p className="text-xs font-medium text-zinc-400 mb-2 flex items-center gap-1.5">
            <Code2 size={12} /> Add to your product's backend
          </p>
          <CodeBlock>{`# HTTP header (add to every request)
X-API-Key: ${display}

# Or as a Bearer token
Authorization: Bearer ${display}`}
          </CodeBlock>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full py-2 text-xs font-medium border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
        >
          I've saved my key — close
        </button>
      </div>
    </div>
  );
}

// ─── Revoke confirm modal ─────────────────────────────────────────────────────

function RevokeModal({ itemLabel, onConfirm, onClose, loading }: {
  itemLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-zinc-900 border border-zinc-700 w-full max-w-sm p-6 shadow-2xl">
        <div className="flex items-center gap-2 mb-1">
          <Trash2 size={14} className="text-red-400" />
          <h2 className="text-sm font-semibold text-zinc-100">Revoke</h2>
        </div>
        <p className="text-xs text-zinc-400 mt-2 mb-5 leading-relaxed">
          Revoking <span className="text-zinc-100 font-medium">"{itemLabel}"</span> is permanent.
          Any product using it will lose access immediately.
        </p>
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-1.5 text-xs font-semibold bg-red-600 text-white hover:bg-red-500 transition-colors disabled:opacity-40"
          >
            {loading ? 'Revoking…' : 'Revoke'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Key row ──────────────────────────────────────────────────────────────────

function KeyRow({ k, onRevoke }: {
  k: ApiKeyListItem;
  onRevoke: (id: string, name: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  function copyPrefix() {
    void navigator.clipboard.writeText(maskKey(k.prefix));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <tr className="border-b border-zinc-900 hover:bg-zinc-800/50 transition-colors group">
      <td className="py-3 px-4">
        <div className="text-sm font-medium text-zinc-100">{k.name}</div>
        <div className="text-xs text-zinc-600 mt-0.5">Created {k.created_at.slice(0, 10)}</div>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <code className="text-xs font-mono text-zinc-400">{maskKey(k.prefix)}</code>
          <button
            onClick={copyPrefix}
            className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-zinc-300 transition-all"
            aria-label="Copy masked key"
          >
            {copied ? <CheckCircle2 size={12} className="text-emerald-400" /> : <Copy size={12} />}
          </button>
        </div>
      </td>
      <td className="py-3 px-4 text-xs font-mono text-zinc-500 tabular-nums">
        {k.last_used ?? 'Never'}
      </td>
      <td className="py-3 px-4 text-right">
        <button
          onClick={() => onRevoke(k.key_id, k.name)}
          className="opacity-0 group-hover:opacity-100 flex items-center gap-1 ml-auto text-xs font-medium text-zinc-600 hover:text-red-400 transition-all"
        >
          <Trash2 size={12} /> Revoke
        </button>
      </td>
    </tr>
  );
}

// ─── All webhook event types ──────────────────────────────────────────────────

const ALL_EVENTS: WebhookEventType[] = [
  'document.completed',
  'document.failed',
  'gap.detected',
  'gap.resolved',
  'drafts.ready',
  'schema.generated',
  'ranking.updated',
  '*',
];

// ─── Register webhook modal ───────────────────────────────────────────────────

function RegisterWebhookModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (ep: WebhookEndpoint) => void;
}) {
  const [url, setUrl]               = useState('');
  const [desc, setDesc]             = useState('');
  const [events, setEvents]         = useState<WebhookEventType[]>(['*']);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  function toggleEvent(ev: WebhookEventType) {
    if (ev === '*') { setEvents(['*']); return; }
    setEvents(prev => {
      const next = prev.filter(e => e !== '*');
      return next.includes(ev) ? next.filter(e => e !== ev) : [...next, ev];
    });
  }

  async function handleRegister() {
    if (!url.trim()) { setError('Enter a URL.'); return; }
    try { new URL(url); } catch { setError('Enter a valid URL (https://…)'); return; }
    if (events.length === 0) { setError('Select at least one event type.'); return; }
    setError('');
    setLoading(true);
    try {
      const result = await registerWebhook({ url: url.trim(), event_types: events, description: desc.trim() || undefined });
      onCreate(result);
    } catch {
      setError('Could not register webhook — check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-zinc-900 border border-zinc-700 w-full max-w-lg p-6 shadow-2xl">
        <h2 className="text-sm font-semibold text-zinc-100 mb-1">Register webhook</h2>
        <p className="text-xs text-zinc-500 mb-5">
          Data Engine will POST signed events to your URL. The HMAC secret is shown <span className="text-amber-400">once only</span>.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Endpoint URL <span className="text-red-400">*</span></label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://yourproduct.com/webhooks/data-engine"
              autoFocus
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 text-zinc-100 text-sm font-mono placeholder-zinc-700 outline-none focus:border-zinc-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description <span className="text-zinc-700">(optional)</span></label>
            <input
              type="text"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="e.g. Production notification handler"
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 text-zinc-100 text-sm font-mono placeholder-zinc-700 outline-none focus:border-zinc-400 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">Events to receive</label>
            <div className="flex flex-wrap gap-2">
              {ALL_EVENTS.map(ev => (
                <button
                  key={ev}
                  onClick={() => toggleEvent(ev)}
                  className={`px-2.5 py-1 text-xs font-mono border transition-colors ${
                    events.includes(ev)
                      ? 'border-zinc-400 text-zinc-100 bg-zinc-800'
                      : 'border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300'
                  }`}
                >
                  {ev}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-3 text-xs text-red-400 flex items-center gap-1.5">
            <AlertTriangle size={11} /> {error}
          </p>
        )}

        <div className="flex items-center gap-2 mt-6 justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleRegister}
            disabled={loading}
            className="px-4 py-1.5 text-xs font-semibold bg-zinc-100 text-zinc-900 hover:bg-white transition-colors disabled:opacity-40"
          >
            {loading ? 'Registering…' : 'Register webhook'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Revealed webhook secret modal ────────────────────────────────────────────

function RevealedWebhookModal({ endpoint, onClose }: {
  endpoint: WebhookEndpoint;
  onClose: () => void;
}) {
  const [copied, setCopied]   = useState(false);
  const [visible, setVisible] = useState(false);
  const secret = endpoint.secret ?? '';
  const display = visible ? secret : secret.slice(0, 8) + '•'.repeat(24);

  function copy() {
    void navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-zinc-900 border border-zinc-700 w-full max-w-lg p-6 shadow-2xl">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 size={15} className="text-emerald-400" />
          <h2 className="text-sm font-semibold text-zinc-100">Webhook registered</h2>
        </div>
        <p className="text-xs text-zinc-400 mb-1">{endpoint.url}</p>
        <p className="text-xs text-amber-400 flex items-center gap-1.5 mb-5">
          <AlertTriangle size={11} />
          This HMAC secret is shown once only. Store it to verify incoming webhook signatures.
        </p>

        <div className="bg-black border border-zinc-800 px-4 py-3 flex items-center gap-3 mb-4">
          <code className="flex-1 text-xs font-mono text-emerald-400 break-all leading-relaxed">
            {display}
          </code>
          <button
            onClick={() => setVisible(v => !v)}
            className="text-zinc-600 hover:text-zinc-300 transition-colors flex-shrink-0"
          >
            {visible ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>

        <button
          onClick={copy}
          className={`w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold border transition-colors ${
            copied ? 'border-emerald-600 text-emerald-400' : 'border-zinc-600 text-zinc-300 hover:border-zinc-400 hover:text-zinc-100'
          }`}
        >
          {copied ? <><CheckCircle2 size={12} /> Copied</> : <><Copy size={12} /> Copy secret</>}
        </button>

        <div className="mt-5">
          <p className="text-xs font-medium text-zinc-400 mb-2 flex items-center gap-1.5">
            <Code2 size={12} /> Verify signatures in your backend
          </p>
          <CodeBlock>{`import hmac, hashlib

def verify(payload: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(
        secret.encode(), payload, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)

# Data Engine sends: X-Signature: sha256=<hex>`}
          </CodeBlock>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full py-2 text-xs font-medium border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
        >
          I've saved my secret — close
        </button>
      </div>
    </div>
  );
}

// ─── Webhook logs drawer ──────────────────────────────────────────────────────

function WebhookLogsDrawer({ endpoint, onClose }: {
  endpoint: WebhookEndpoint;
  onClose: () => void;
}) {
  const [logs, setLogs]       = useState<WebhookLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getWebhookLogs(endpoint.endpoint_id)
      .then(setLogs)
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [endpoint.endpoint_id]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-700 w-full max-w-2xl p-6 shadow-2xl max-h-[70vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Delivery logs</h2>
            <p className="text-xs text-zinc-500 mt-0.5 font-mono">{endpoint.url}</p>
          </div>
          <button onClick={onClose} className="text-xs text-zinc-600 hover:text-zinc-300">Close</button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 gap-2 text-zinc-600">
            <Loader2 size={14} className="animate-spin" /> Loading…
          </div>
        ) : logs.length === 0 ? (
          <p className="text-xs text-zinc-600 text-center py-8">No delivery attempts yet.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="py-2 px-3 text-left font-medium text-zinc-500">Event</th>
                <th className="py-2 px-3 text-left font-medium text-zinc-500">Status</th>
                <th className="py-2 px-3 text-left font-medium text-zinc-500">Duration</th>
                <th className="py-2 px-3 text-left font-medium text-zinc-500">Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l, i) => (
                <tr key={i} className="border-b border-zinc-900 hover:bg-zinc-800/40">
                  <td className="py-2 px-3 font-mono text-zinc-300">{l.event_type}</td>
                  <td className="py-2 px-3">
                    <span className={`font-mono ${l.success ? 'text-emerald-400' : 'text-red-400'}`}>
                      {l.status_code} {l.success ? '✓' : '✗'}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-zinc-500 tabular-nums">{l.duration_ms}ms</td>
                  <td className="py-2 px-3 text-zinc-600 tabular-nums">{new Date(l.attempted_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── Webhook row ──────────────────────────────────────────────────────────────

function WebhookRow({ ep, onRevoke, onLogs }: {
  ep: WebhookEndpoint;
  onRevoke: (id: string, url: string) => void;
  onLogs: (ep: WebhookEndpoint) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr className="border-b border-zinc-900 hover:bg-zinc-800/50 transition-colors group">
        <td className="py-3 px-4">
          <div className="text-sm font-mono text-zinc-100 truncate max-w-xs">{ep.url}</div>
          {ep.description && (
            <div className="text-xs text-zinc-600 mt-0.5">{ep.description}</div>
          )}
        </td>
        <td className="py-3 px-4">
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-xs font-mono text-zinc-500 hover:text-zinc-300"
          >
            {ep.event_types.includes('*') ? '*' : `${ep.event_types.length} events`}
            {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        </td>
        <td className="py-3 px-4 text-xs font-mono text-zinc-600 tabular-nums">
          {ep.created_at.slice(0, 10)}
        </td>
        <td className="py-3 px-4 text-right">
          <div className="flex items-center gap-3 justify-end opacity-0 group-hover:opacity-100 transition-all">
            <button
              onClick={() => onLogs(ep)}
              className="text-xs font-medium text-zinc-600 hover:text-zinc-300 transition-colors"
            >
              Logs
            </button>
            <button
              onClick={() => onRevoke(ep.endpoint_id, ep.url)}
              className="flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-red-400 transition-colors"
            >
              <Trash2 size={12} /> Revoke
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-zinc-900 bg-zinc-900/50">
          <td colSpan={4} className="px-4 pb-3 pt-1">
            <div className="flex flex-wrap gap-1.5">
              {ep.event_types.map(ev => (
                <span key={ev} className="px-2 py-0.5 text-xs font-mono border border-zinc-700 text-zinc-400">
                  {ev}
                </span>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Tab types ────────────────────────────────────────────────────────────────

type Tab = 'keys' | 'webhooks';

// ─── Main page ────────────────────────────────────────────────────────────────

// ─── Website Auto-Crawl Section ──────────────────────────────────────────────

function WebsiteCrawlSection() {
  const [status, setStatus]       = useState<CrawlStatusResponse | null>(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [url, setUrl]             = useState('');
  const [maxPages, setMaxPages]   = useState(50);
  const [interval, setInterval_]  = useState(24);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');

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
      setStatus({ registered: true, website_url: res.website_url, crawl_config: { max_pages: res.max_pages, max_depth: 3, recrawl_interval_hours: res.recrawl_interval_hours }, last_crawled_at: null });
    } catch {
      setError('Could not register — check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Globe2 size={13} className="text-zinc-400" />
        <h2 className="text-xs font-mono font-medium text-zinc-500 uppercase tracking-wider">
          Website Auto-Crawl
        </h2>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-5">
        <p className="text-xs text-zinc-500 leading-relaxed mb-4">
          Register your website URL once. The Engine will automatically crawl every page,
          chunk and embed the content, detect gaps against live trends, and generate
          AI-written sections to fill them — then re-crawl on the interval you set.
          <span className="text-zinc-300 font-medium"> No further action required.</span>
        </p>

        {loading ? (
          <div className="flex items-center gap-2 text-zinc-600 py-4">
            <Loader2 size={13} className="animate-spin" /> Loading…
          </div>
        ) : (
          <div className="space-y-4">
            {status?.registered && (
              <div className="bg-zinc-950 border border-zinc-800 px-4 py-3 flex items-start gap-3">
                <CheckCircle2 size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-zinc-400">
                  <span className="text-zinc-100 font-medium">Active:</span>{' '}
                  <span className="font-mono text-emerald-400">{status.website_url}</span>
                  <br />
                  <span className="text-zinc-600">
                    Crawl every {status.crawl_config?.recrawl_interval_hours ?? 24}h &nbsp;·&nbsp;
                    Last crawl: {status.last_crawled_at
                      ? new Date(status.last_crawled_at).toLocaleString()
                      : 'Pending first run'}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Website URL <span className="text-red-400">*</span>
              </label>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://yourwebsite.com"
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 text-zinc-100 text-sm font-mono placeholder-zinc-700 outline-none focus:border-zinc-400 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Max pages per crawl</label>
                <input
                  type="number"
                  min={1} max={200}
                  value={maxPages}
                  onChange={e => setMaxPages(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 text-zinc-100 text-sm font-mono outline-none focus:border-zinc-400 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Re-crawl every (hours)</label>
                <input
                  type="number"
                  min={1} max={168}
                  value={interval}
                  onChange={e => setInterval_(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 text-zinc-100 text-sm font-mono outline-none focus:border-zinc-400 transition-colors"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-400 flex items-center gap-1.5">
                <AlertTriangle size={11} /> {error}
              </p>
            )}
            {success && (
              <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 size={11} /> {success}
              </p>
            )}

            <button
              onClick={handleRegister}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-zinc-100 text-zinc-900 text-xs font-semibold hover:bg-white transition-colors disabled:opacity-40"
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
  );
}


export default function Credentials() {
  const [tab, setTab]                         = useState<Tab>('keys');

  // API keys state
  const [keys, setKeys]                       = useState<ApiKeyListItem[]>([]);
  const [keysLoading, setKeysLoading]         = useState(true);
  const [keysError, setKeysError]             = useState('');
  const [showCreate, setShowCreate]           = useState(false);
  const [revealedKey, setRevealedKey]         = useState<{ raw: string; name: string } | null>(null);
  const [revokeKey, setRevokeKey]             = useState<{ id: string; name: string } | null>(null);
  const [revokingKey, setRevokingKey]         = useState(false);

  // Webhooks state
  const [webhooks, setWebhooks]               = useState<WebhookEndpoint[]>([]);
  const [webhooksLoading, setWebhooksLoading] = useState(true);
  const [webhooksError, setWebhooksError]     = useState('');
  const [showRegister, setShowRegister]       = useState(false);
  const [revealedWebhook, setRevealedWebhook] = useState<WebhookEndpoint | null>(null);
  const [revokeWebhook, setRevokeWebhook]     = useState<{ id: string; url: string } | null>(null);
  const [revokingWebhook, setRevokingWebhook] = useState(false);
  const [logsWebhook, setLogsWebhook]         = useState<WebhookEndpoint | null>(null);

  // ── Fetch API keys ───────────────────────────────────────────────────────────

  const fetchKeys = useCallback(() => {
    setKeysLoading(true);
    setKeysError('');
    listApiKeys()
      .then(data => setKeys(data))
      .catch(() => setKeysError('Could not load API keys.'))
      .finally(() => setKeysLoading(false));
  }, []);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  // ── Fetch webhooks ───────────────────────────────────────────────────────────

  const fetchWebhooks = useCallback(() => {
    setWebhooksLoading(true);
    setWebhooksError('');
    listWebhooks()
      .then(data => setWebhooks(data))
      .catch(() => setWebhooksError('Could not load webhooks.'))
      .finally(() => setWebhooksLoading(false));
  }, []);

  useEffect(() => { fetchWebhooks(); }, [fetchWebhooks]);

  // ── Handlers: API keys ───────────────────────────────────────────────────────

  const handleKeyCreated = useCallback((result: ApiKeyResponse) => {
    setShowCreate(false);
    const newKey: ApiKeyListItem = {
      key_id:     result.key_id,
      name:       result.name,
      prefix:     result.prefix,
      created_at: new Date().toISOString(),
      last_used:  null,
    };
    setKeys(prev => [newKey, ...prev]);
    setRevealedKey({ raw: result.api_key, name: result.name });
  }, []);

  const handleRevokeKey = useCallback(async () => {
    if (!revokeKey) return;
    setRevokingKey(true);
    try {
      await deleteApiKey(revokeKey.id);
    } catch {
      // optimistic — remove from UI regardless
    } finally {
      setKeys(prev => prev.filter(k => k.key_id !== revokeKey.id));
      setRevokeKey(null);
      setRevokingKey(false);
    }
  }, [revokeKey]);

  // ── Handlers: webhooks ───────────────────────────────────────────────────────

  const handleWebhookCreated = useCallback((ep: WebhookEndpoint) => {
    setShowRegister(false);
    setWebhooks(prev => [ep, ...prev]);
    setRevealedWebhook(ep);
  }, []);

  const handleRevokeWebhook = useCallback(async () => {
    if (!revokeWebhook) return;
    setRevokingWebhook(true);
    try {
      await deleteWebhook(revokeWebhook.id);
    } catch {
      // optimistic removal
    } finally {
      setWebhooks(prev => prev.filter(e => e.endpoint_id !== revokeWebhook.id));
      setRevokeWebhook(null);
      setRevokingWebhook(false);
    }
  }, [revokeWebhook]);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Modals — API keys ── */}
      {showCreate && (
        <CreateKeyModal onClose={() => setShowCreate(false)} onCreate={handleKeyCreated} />
      )}
      {revealedKey && (
        <RevealedKeyModal
          apiKey={revealedKey.raw}
          name={revealedKey.name}
          onClose={() => setRevealedKey(null)}
        />
      )}
      {revokeKey && (
        <RevokeModal
          itemLabel={revokeKey.name}
          onConfirm={handleRevokeKey}
          onClose={() => setRevokeKey(null)}
          loading={revokingKey}
        />
      )}

      {/* ── Modals — webhooks ── */}
      {showRegister && (
        <RegisterWebhookModal onClose={() => setShowRegister(false)} onCreate={handleWebhookCreated} />
      )}
      {revealedWebhook && (
        <RevealedWebhookModal endpoint={revealedWebhook} onClose={() => setRevealedWebhook(null)} />
      )}
      {revokeWebhook && (
        <RevokeModal
          itemLabel={revokeWebhook.url}
          onConfirm={handleRevokeWebhook}
          onClose={() => setRevokeWebhook(null)}
          loading={revokingWebhook}
        />
      )}
      {logsWebhook && (
        <WebhookLogsDrawer endpoint={logsWebhook} onClose={() => setLogsWebhook(null)} />
      )}

      <div className="min-h-screen bg-zinc-950 text-zinc-200">

        {/* ── Page header ── */}
        <div className="px-6 py-5 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Key size={15} className="text-zinc-400" />
              <h1 className="text-sm font-semibold text-zinc-100">API Credentials</h1>
            </div>
            <p className="text-xs text-zinc-500 ml-5">
              Generate API keys and configure webhooks to integrate Data Engine into your product.
            </p>
          </div>
          <button
            onClick={() => tab === 'keys' ? setShowCreate(true) : setShowRegister(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-zinc-100 text-zinc-900 text-xs font-semibold hover:bg-white transition-colors"
          >
            <Plus size={13} /> {tab === 'keys' ? 'New API Key' : 'Register Webhook'}
          </button>
        </div>

        <div className="px-6 py-6 space-y-8 max-w-4xl">

          {/* ── How it works ── */}
          <div className="bg-zinc-900 border border-zinc-800 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={14} className="text-zinc-400" />
              <h2 className="text-sm font-semibold text-zinc-200">How it works</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { step: '01', icon: <Key size={14} />, title: 'Create a key', desc: 'Generate an API key for each product or environment that needs to call Data Engine.' },
                { step: '02', icon: <Code2 size={14} />, title: 'Add to your backend', desc: 'Pass the key as X-API-Key header on every request. Data Engine identifies your tenant automatically.' },
                { step: '03', icon: <Zap size={14} />, title: 'Boost visibility', desc: 'Data Engine runs gap detection, GEO/SEO scoring, and AI-powered drafts against your content automatically.' },
              ].map(({ step, icon, title, desc }) => (
                <div key={step} className="flex gap-3">
                  <span className="text-xs font-mono text-zinc-700 mt-0.5 flex-shrink-0">{step}</span>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1 text-zinc-400">{icon}<span className="text-xs font-semibold text-zinc-200">{title}</span></div>
                    <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Integration snippet ── */}
          <div>
            <h2 className="text-xs font-mono font-medium text-zinc-500 uppercase tracking-wider mb-3">Integration snippet</h2>
            <CodeBlock>{`# Python example — call from your product's backend
import requests

response = requests.post(
    "http://localhost:8000/api/v1/ingest/upload",
    headers={"X-API-Key": "YOUR_API_KEY"},
    files={"file": open("content.md", "rb")},
    data={"source_type": "markdown"},
)

# Data Engine will automatically:
# 1. Chunk and embed your content
# 2. Run gap detection against trend signals
# 3. Generate AI drafts to fill gaps
# 4. Score SEO, GEO, and AEO visibility
# 5. Push results via webhook when ready`}
            </CodeBlock>
          </div>

          {/* ── Tabs ── */}
          <div>
            <div className="flex border-b border-zinc-800 mb-6">
              {([
                { id: 'keys',     label: 'API Keys',  icon: <Key size={12} />,     count: keys.length },
                { id: 'webhooks', label: 'Webhooks',  icon: <Webhook size={12} />, count: webhooks.length },
              ] as const).map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
                    tab === t.id
                      ? 'border-zinc-200 text-zinc-100'
                      : 'border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {t.icon} {t.label}
                  <span className={`ml-1 text-xs font-mono ${tab === t.id ? 'text-zinc-500' : 'text-zinc-700'}`}>
                    ({t.count})
                  </span>
                </button>
              ))}
            </div>

            {/* ── API Keys panel ── */}
            {tab === 'keys' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-mono font-medium text-zinc-500 uppercase tracking-wider">
                    Active keys <span className="text-zinc-700 ml-1">({keys.length})</span>
                  </h2>
                  <button
                    onClick={fetchKeys}
                    className="text-zinc-600 hover:text-zinc-300 transition-colors"
                    aria-label="Refresh"
                  >
                    <RefreshCw size={13} />
                  </button>
                </div>

                {keysLoading ? (
                  <div className="flex items-center justify-center py-14 gap-2 text-zinc-600">
                    <Loader2 size={14} className="animate-spin" /> Loading keys…
                  </div>
                ) : keysError ? (
                  <div className="bg-zinc-900 border border-zinc-800 border-dashed py-10 flex flex-col items-center gap-3 text-center">
                    <AlertTriangle size={18} className="text-amber-600" />
                    <p className="text-xs text-zinc-500">{keysError}</p>
                    <button
                      onClick={fetchKeys}
                      className="text-xs text-zinc-400 hover:text-zinc-200 underline"
                    >
                      Try again
                    </button>
                  </div>
                ) : keys.length === 0 ? (
                  <div className="bg-zinc-900 border border-zinc-800 border-dashed py-12 flex flex-col items-center gap-3 text-center">
                    <Key size={20} className="text-zinc-700" />
                    <p className="text-sm text-zinc-500">No API keys yet.</p>
                    <p className="text-xs text-zinc-600 max-w-xs">Create your first key to start integrating Data Engine into your product.</p>
                    <button
                      onClick={() => setShowCreate(true)}
                      className="mt-2 flex items-center gap-1.5 px-4 py-2 border border-zinc-700 text-zinc-300 text-xs font-medium hover:border-zinc-500 hover:text-zinc-100 transition-colors"
                    >
                      <Plus size={12} /> Create first key
                    </button>
                  </div>
                ) : (
                  <div className="bg-zinc-900 border border-zinc-800 overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-zinc-800">
                          <th className="py-2.5 px-4 text-left text-xs font-medium text-zinc-500">Name</th>
                          <th className="py-2.5 px-4 text-left text-xs font-medium text-zinc-500">Key</th>
                          <th className="py-2.5 px-4 text-left text-xs font-medium text-zinc-500">Last used</th>
                          <th className="py-2.5 px-4" />
                        </tr>
                      </thead>
                      <tbody>
                        {keys.map(k => (
                          <KeyRow
                            key={k.key_id}
                            k={k}
                            onRevoke={(id, name) => setRevokeKey({ id, name })}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── Webhooks panel ── */}
            {tab === 'webhooks' && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-mono font-medium text-zinc-500 uppercase tracking-wider">
                    Registered endpoints <span className="text-zinc-700 ml-1">({webhooks.length})</span>
                  </h2>
                  <button
                    onClick={fetchWebhooks}
                    className="text-zinc-600 hover:text-zinc-300 transition-colors"
                    aria-label="Refresh"
                  >
                    <RefreshCw size={13} />
                  </button>
                </div>

                {webhooksLoading ? (
                  <div className="flex items-center justify-center py-14 gap-2 text-zinc-600">
                    <Loader2 size={14} className="animate-spin" /> Loading webhooks…
                  </div>
                ) : webhooksError ? (
                  <div className="bg-zinc-900 border border-zinc-800 border-dashed py-10 flex flex-col items-center gap-3 text-center">
                    <AlertTriangle size={18} className="text-amber-600" />
                    <p className="text-xs text-zinc-500">{webhooksError}</p>
                    <button
                      onClick={fetchWebhooks}
                      className="text-xs text-zinc-400 hover:text-zinc-200 underline"
                    >
                      Try again
                    </button>
                  </div>
                ) : webhooks.length === 0 ? (
                  <div className="bg-zinc-900 border border-zinc-800 border-dashed py-12 flex flex-col items-center gap-3 text-center">
                    <Globe size={20} className="text-zinc-700" />
                    <p className="text-sm text-zinc-500">No webhooks registered.</p>
                    <p className="text-xs text-zinc-600 max-w-xs">
                      Register an endpoint so Data Engine can push visibility events directly to your product.
                    </p>
                    <button
                      onClick={() => setShowRegister(true)}
                      className="mt-2 flex items-center gap-1.5 px-4 py-2 border border-zinc-700 text-zinc-300 text-xs font-medium hover:border-zinc-500 hover:text-zinc-100 transition-colors"
                    >
                      <Plus size={12} /> Register first webhook
                    </button>
                  </div>
                ) : (
                  <div className="bg-zinc-900 border border-zinc-800 overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-zinc-800">
                          <th className="py-2.5 px-4 text-left text-xs font-medium text-zinc-500">URL</th>
                          <th className="py-2.5 px-4 text-left text-xs font-medium text-zinc-500">Events</th>
                          <th className="py-2.5 px-4 text-left text-xs font-medium text-zinc-500">Created</th>
                          <th className="py-2.5 px-4" />
                        </tr>
                      </thead>
                      <tbody>
                        {webhooks.map(ep => (
                          <WebhookRow
                            key={ep.endpoint_id}
                            ep={ep}
                            onRevoke={(id, url) => setRevokeWebhook({ id, url })}
                            onLogs={ep => setLogsWebhook(ep)}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Webhook event reference */}
                <div className="mt-6 bg-zinc-900 border border-zinc-800 p-4">
                  <p className="text-xs font-medium text-zinc-400 mb-3">Available event types</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {ALL_EVENTS.filter(e => e !== '*').map(ev => (
                      <div key={ev} className="text-xs font-mono text-zinc-500 border border-zinc-800 px-2 py-1">
                        {ev}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-zinc-600 mt-2">Use <code className="font-mono">*</code> to subscribe to all events.</p>
                </div>
              </div>
            )}
          </div>

          {/* ── Website Auto-Crawl ── */}
          <WebsiteCrawlSection />

          {/* ── Security notice ── */}
          <div className="border border-amber-900/40 bg-amber-950/20 px-4 py-3 flex gap-3">
            <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-400 mb-0.5">Keep credentials secret</p>
              <p className="text-xs text-zinc-500 leading-relaxed">
                API keys and webhook secrets grant full access to your tenant's data.
                Never expose them in client-side code, public repos, or logs.
                Revoke and rotate immediately if compromised. Use one key per environment.
              </p>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
