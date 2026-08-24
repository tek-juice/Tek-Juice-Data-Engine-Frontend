import { useState, useCallback, useEffect } from 'react';
import {
  Key, Plus, Copy, Trash2, Eye, EyeOff,
  CheckCircle2, AlertTriangle, Shield, Code2, Zap,
  Webhook, Globe2, Loader2, ChevronDown, ChevronUp,
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
    <div className="relative group rounded" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
      <pre
        className="text-xs px-4 py-3 overflow-x-auto whitespace-pre-wrap leading-relaxed"
        style={{ color: 'var(--text-2)', fontFamily: 'ui-monospace, monospace' }}
      >
        {children}
      </pre>
      <button
        onClick={copy}
        className="absolute top-2 right-2 px-2 py-1 text-xs transition-colors opacity-0 group-hover:opacity-100"
        style={{ border: '1px solid var(--border)', color: 'var(--text-3)' }}
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
      <div className="w-full max-w-md p-6 shadow-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>Create API key</h2>
        <p className="text-xs mb-5" style={{ color: 'var(--text-3)' }}>
          Give the key a name that describes where it will be used.
          The raw key is shown <span style={{ color: 'var(--warning)' }}>once only</span> — copy it immediately.
        </p>

        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>Key name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
          placeholder="e.g. Production Backend"
          autoFocus
          className="w-full px-3 py-2 text-sm outline-none transition-colors"
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            fontFamily: 'ui-monospace, monospace',
          }}
        />

        {error && (
          <p className="mt-2 text-xs flex items-center gap-1.5" style={{ color: 'var(--danger)' }}>
            <AlertTriangle size={11} /> {error}
          </p>
        )}

        <div className="flex items-center gap-2 mt-5 justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium transition-colors"
            style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading}
            className="px-4 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40"
            style={{ background: 'var(--text)', color: 'var(--bg)' }}
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
      <div className="w-full max-w-lg p-6 shadow-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 size={15} style={{ color: 'var(--success)' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Key created — "{name}"</h2>
        </div>
        <p className="text-xs flex items-center gap-1.5 mb-5" style={{ color: 'var(--warning)' }}>
          <AlertTriangle size={11} />
          This is the only time the full key will be shown. Copy it now and store it securely.
        </p>

        <div className="px-4 py-3 flex items-center gap-3 mb-4" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
          <code className="flex-1 text-xs break-all leading-relaxed" style={{ color: 'var(--success)', fontFamily: 'ui-monospace, monospace' }}>
            {display}
          </code>
          <button
            onClick={() => setVisible(v => !v)}
            className="transition-colors flex-shrink-0"
            style={{ color: 'var(--text-3)' }}
            aria-label={visible ? 'Hide key' : 'Show key'}
          >
            {visible ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>

        <button
          onClick={copy}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold border transition-colors"
          style={copied
            ? { borderColor: 'var(--success)', color: 'var(--success)' }
            : { borderColor: 'var(--border)', color: 'var(--text-2)' }
          }
        >
          {copied ? <><CheckCircle2 size={12} /> Copied to clipboard</> : <><Copy size={12} /> Copy key</>}
        </button>

        <div className="mt-5">
          <p className="text-xs font-medium mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-2)' }}>
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
          className="mt-5 w-full py-2 text-xs font-medium transition-colors"
          style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}
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
      <div className="w-full max-w-sm p-6 shadow-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-1">
          <Trash2 size={14} style={{ color: 'var(--danger)' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Revoke</h2>
        </div>
        <p className="text-xs mt-2 mb-5 leading-relaxed" style={{ color: 'var(--text-2)' }}>
          Revoking <span className="font-medium" style={{ color: 'var(--text)' }}>"{itemLabel}"</span> is permanent.
          Any product using it will lose access immediately.
        </p>
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs transition-colors"
            style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-40"
            style={{ background: 'var(--danger)' }}
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
    <tr className="group transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
      <td className="py-3 px-4">
        <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>{k.name}</div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Created {k.created_at.slice(0, 10)}</div>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <code className="text-xs" style={{ color: 'var(--text-2)', fontFamily: 'ui-monospace, monospace' }}>{maskKey(k.prefix)}</code>
          <button
            onClick={copyPrefix}
            className="opacity-0 group-hover:opacity-100 transition-all"
            style={{ color: 'var(--text-3)' }}
            aria-label="Copy masked key"
          >
            {copied ? <CheckCircle2 size={12} style={{ color: 'var(--success)' }} /> : <Copy size={12} />}
          </button>
        </div>
      </td>
      <td className="py-3 px-4 text-xs tabular-nums" style={{ color: 'var(--text-3)', fontFamily: 'ui-monospace, monospace' }}>
        {k.last_used ?? 'Never'}
      </td>
      <td className="py-3 px-4 text-right">
        <button
          onClick={() => onRevoke(k.key_id, k.name)}
          className="opacity-0 group-hover:opacity-100 flex items-center gap-1 ml-auto text-xs font-medium transition-all"
          style={{ color: 'var(--text-3)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
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
  const [url, setUrl]         = useState('');
  const [desc, setDesc]       = useState('');
  const [events, setEvents]   = useState<WebhookEventType[]>(['*']);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

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
      <div className="w-full max-w-lg p-6 shadow-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>Register webhook</h2>
        <p className="text-xs mb-5" style={{ color: 'var(--text-3)' }}>
          Data Engine will POST signed events to your URL. The HMAC secret is shown <span style={{ color: 'var(--warning)' }}>once only</span>.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>
              Endpoint URL <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://yourproduct.com/webhooks/data-engine"
              autoFocus
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
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-2)' }}>
              Description <span style={{ color: 'var(--text-3)' }}>(optional)</span>
            </label>
            <input
              type="text"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="e.g. Production notification handler"
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
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-2)' }}>Events to receive</label>
            <div className="flex flex-wrap gap-2">
              {ALL_EVENTS.map(ev => (
                <button
                  key={ev}
                  onClick={() => toggleEvent(ev)}
                  className="px-2.5 py-1 text-xs transition-colors"
                  style={events.includes(ev)
                    ? { border: '1px solid var(--text-2)', color: 'var(--text)', background: 'var(--surface-2)', fontFamily: 'ui-monospace, monospace' }
                    : { border: '1px solid var(--border)', color: 'var(--text-3)', fontFamily: 'ui-monospace, monospace' }
                  }
                >
                  {ev}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-3 text-xs flex items-center gap-1.5" style={{ color: 'var(--danger)' }}>
            <AlertTriangle size={11} /> {error}
          </p>
        )}

        <div className="flex items-center gap-2 mt-6 justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium transition-colors"
            style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleRegister}
            disabled={loading}
            className="px-4 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40"
            style={{ background: 'var(--text)', color: 'var(--bg)' }}
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
      <div className="w-full max-w-lg p-6 shadow-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 size={15} style={{ color: 'var(--success)' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Webhook registered</h2>
        </div>
        <p className="text-xs mb-1" style={{ color: 'var(--text-2)' }}>{endpoint.url}</p>
        <p className="text-xs flex items-center gap-1.5 mb-5" style={{ color: 'var(--warning)' }}>
          <AlertTriangle size={11} />
          This HMAC secret is shown once only. Store it to verify incoming webhook signatures.
        </p>

        <div className="px-4 py-3 flex items-center gap-3 mb-4" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
          <code className="flex-1 text-xs break-all leading-relaxed" style={{ color: 'var(--success)', fontFamily: 'ui-monospace, monospace' }}>
            {display}
          </code>
          <button
            onClick={() => setVisible(v => !v)}
            className="transition-colors flex-shrink-0"
            style={{ color: 'var(--text-3)' }}
          >
            {visible ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>

        <button
          onClick={copy}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold border transition-colors"
          style={copied
            ? { borderColor: 'var(--success)', color: 'var(--success)' }
            : { borderColor: 'var(--border)', color: 'var(--text-2)' }
          }
        >
          {copied ? <><CheckCircle2 size={12} /> Copied</> : <><Copy size={12} /> Copy secret</>}
        </button>

        <div className="mt-5">
          <p className="text-xs font-medium mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-2)' }}>
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
          className="mt-5 w-full py-2 text-xs font-medium transition-colors"
          style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}
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
        className="w-full max-w-2xl p-6 shadow-2xl max-h-[70vh] overflow-y-auto"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Delivery logs</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)', fontFamily: 'ui-monospace, monospace' }}>{endpoint.url}</p>
          </div>
          <button onClick={onClose} className="text-xs" style={{ color: 'var(--text-3)' }}>Close</button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 gap-2" style={{ color: 'var(--text-3)' }}>
            <Loader2 size={14} className="animate-spin" /> Loading…
          </div>
        ) : logs.length === 0 ? (
          <p className="text-xs text-center py-8" style={{ color: 'var(--text-3)' }}>No delivery attempts yet.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th className="py-2 px-3 text-left font-medium" style={{ color: 'var(--text-2)' }}>Event</th>
                <th className="py-2 px-3 text-left font-medium" style={{ color: 'var(--text-2)' }}>Status</th>
                <th className="py-2 px-3 text-left font-medium" style={{ color: 'var(--text-2)' }}>Duration</th>
                <th className="py-2 px-3 text-left font-medium" style={{ color: 'var(--text-2)' }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="py-2 px-3" style={{ color: 'var(--text)', fontFamily: 'ui-monospace, monospace' }}>{l.event_type}</td>
                  <td className="py-2 px-3">
                    <span style={{ color: l.success ? 'var(--success)' : 'var(--danger)', fontFamily: 'ui-monospace, monospace' }}>
                      {l.status_code} {l.success ? '✓' : '✗'}
                    </span>
                  </td>
                  <td className="py-2 px-3 tabular-nums" style={{ color: 'var(--text-2)', fontFamily: 'ui-monospace, monospace' }}>{l.duration_ms}ms</td>
                  <td className="py-2 px-3 tabular-nums" style={{ color: 'var(--text-3)', fontFamily: 'ui-monospace, monospace' }}>{new Date(l.attempted_at).toLocaleString()}</td>
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
      <tr className="group transition-colors" style={{ borderBottom: '1px solid var(--border)' }}>
        <td className="py-3 px-4">
          <div className="text-sm truncate max-w-xs" style={{ color: 'var(--text)', fontFamily: 'ui-monospace, monospace' }}>{ep.url}</div>
          {ep.description && (
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{ep.description}</div>
          )}
        </td>
        <td className="py-3 px-4">
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-xs transition-colors"
            style={{ color: 'var(--text-2)', fontFamily: 'ui-monospace, monospace' }}
          >
            {ep.event_types.includes('*') ? '*' : `${ep.event_types.length} events`}
            {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        </td>
        <td className="py-3 px-4 text-xs tabular-nums" style={{ color: 'var(--text-3)', fontFamily: 'ui-monospace, monospace' }}>
          {ep.created_at.slice(0, 10)}
        </td>
        <td className="py-3 px-4 text-right">
          <div className="flex items-center gap-3 justify-end opacity-0 group-hover:opacity-100 transition-all">
            <button
              onClick={() => onLogs(ep)}
              className="text-xs font-medium transition-colors"
              style={{ color: 'var(--text-3)' }}
            >
              Logs
            </button>
            <button
              onClick={() => onRevoke(ep.endpoint_id, ep.url)}
              className="flex items-center gap-1 text-xs font-medium transition-colors"
              style={{ color: 'var(--text-3)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
            >
              <Trash2 size={12} /> Revoke
            </button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>
          <td colSpan={4} className="px-4 pb-3 pt-1">
            <div className="flex flex-wrap gap-1.5">
              {ep.event_types.map(ev => (
                <span
                  key={ev}
                  className="px-2 py-0.5 text-xs"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-2)', fontFamily: 'ui-monospace, monospace' }}
                >
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
        <Globe2 size={13} style={{ color: 'var(--text-2)' }} />
        <h2 className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
          Website Auto-Crawl
        </h2>
      </div>

      <div className="p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text-2)' }}>
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
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

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

      <div style={{ background: 'var(--bg)', color: 'var(--text)' }}>

        {/* ── Page header ── */}
        <div
          className="px-6 py-5 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Key size={15} style={{ color: 'var(--text-2)' }} />
              <h1 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>API Credentials</h1>
            </div>
            <p className="text-xs ml-5" style={{ color: 'var(--text-3)' }}>
              Generate API keys and configure webhooks to integrate Data Engine into your product.
            </p>
          </div>
          <button
            onClick={() => tab === 'keys' ? setShowCreate(true) : setShowRegister(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold transition-colors"
            style={{ background: 'var(--text)', color: 'var(--bg)' }}
          >
            <Plus size={13} /> {tab === 'keys' ? 'New API Key' : 'Register Webhook'}
          </button>
        </div>

        <div className="px-6 py-6 space-y-8 max-w-4xl">

          {/* ── How it works ── */}
          <div className="p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Shield size={14} style={{ color: 'var(--text-2)' }} />
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>How it works</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { step: '01', icon: <Key size={14} />, title: 'Create a key', desc: 'Generate an API key for each product or environment that needs to call Data Engine.' },
                { step: '02', icon: <Code2 size={14} />, title: 'Add to your backend', desc: 'Pass the key as X-API-Key header on every request. Data Engine identifies your tenant automatically.' },
                { step: '03', icon: <Zap size={14} />, title: 'Boost visibility', desc: 'Data Engine runs gap detection, GEO/SEO scoring, and AI-powered drafts against your content automatically.' },
              ].map(({ step, icon, title, desc }) => (
                <div key={step} className="flex gap-3">
                  <span className="text-xs mt-0.5 flex-shrink-0" style={{ color: 'var(--text-3)', fontFamily: 'ui-monospace, monospace' }}>{step}</span>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1" style={{ color: 'var(--text-2)' }}>
                      {icon}
                      <span className="text-xs font-semibold" style={{ color: 'var(--text)' }}>{title}</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-3)' }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Integration snippet ── */}
          <div>
            <h2 className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-3)' }}>Integration snippet</h2>
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
            <div className="flex mb-6" style={{ borderBottom: '1px solid var(--border)' }}>
              {([
                { id: 'keys',     label: 'API Keys',  icon: <Key size={12} />,     count: keys.length },
                { id: 'webhooks', label: 'Webhooks',  icon: <Webhook size={12} />, count: webhooks.length },
              ] as const).map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors -mb-px"
                  style={tab === t.id
                    ? { borderBottomColor: 'var(--text)', color: 'var(--text)' }
                    : { borderBottomColor: 'transparent', color: 'var(--text-3)' }
                  }
                >
                  {t.icon} {t.label}
                  <span className="ml-1 text-xs" style={{ color: 'var(--text-3)', fontFamily: 'ui-monospace, monospace' }}>
                    ({t.count})
                  </span>
                </button>
              ))}
            </div>

            {/* ── API Keys panel ── */}
            {tab === 'keys' && (
              <div>
                {keysLoading ? (
                  <div className="flex items-center justify-center py-10 gap-2" style={{ color: 'var(--text-3)' }}>
                    <Loader2 size={14} className="animate-spin" /> Loading…
                  </div>
                ) : keysError ? (
                  <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--warning)' }}>
                    <AlertTriangle size={12} /> {keysError}
                  </p>
                ) : keys.length === 0 ? (
                  <div className="text-center py-12">
                    <Key size={20} className="mx-auto mb-2" style={{ color: 'var(--text-3)' }} />
                    <p className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>No API keys yet</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Create your first key to start integrating.</p>
                    <button
                      onClick={() => setShowCreate(true)}
                      className="mt-4 flex items-center gap-1.5 px-4 py-2 text-xs font-semibold mx-auto transition-colors"
                      style={{ background: 'var(--text)', color: 'var(--bg)' }}
                    >
                      <Plus size={13} /> Create first key
                    </button>
                  </div>
                ) : (
                  <div style={{ border: '1px solid var(--border)' }}>
                    <table className="w-full">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          {['Name', 'Key', 'Last used', ''].map(h => (
                            <th key={h} className="py-2.5 px-4 text-left text-xs font-medium" style={{ color: 'var(--text-3)' }}>{h}</th>
                          ))}
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
                {webhooksLoading ? (
                  <div className="flex items-center justify-center py-10 gap-2" style={{ color: 'var(--text-3)' }}>
                    <Loader2 size={14} className="animate-spin" /> Loading…
                  </div>
                ) : webhooksError ? (
                  <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--warning)' }}>
                    <AlertTriangle size={12} /> {webhooksError}
                  </p>
                ) : webhooks.length === 0 ? (
                  <div className="text-center py-12">
                    <Webhook size={20} className="mx-auto mb-2" style={{ color: 'var(--text-3)' }} />
                    <p className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>No webhooks registered</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Register a webhook to get push notifications when Data Engine completes work.</p>
                    <button
                      onClick={() => setShowRegister(true)}
                      className="mt-4 flex items-center gap-1.5 px-4 py-2 text-xs font-semibold mx-auto transition-colors"
                      style={{ background: 'var(--text)', color: 'var(--bg)' }}
                    >
                      <Plus size={13} /> Register first webhook
                    </button>
                  </div>
                ) : (
                  <div style={{ border: '1px solid var(--border)' }}>
                    <table className="w-full">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          {['URL', 'Events', 'Created', ''].map(h => (
                            <th key={h} className="py-2.5 px-4 text-left text-xs font-medium" style={{ color: 'var(--text-3)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {webhooks.map(ep => (
                          <WebhookRow
                            key={ep.endpoint_id}
                            ep={ep}
                            onRevoke={(id, url) => setRevokeWebhook({ id, url })}
                            onLogs={setLogsWebhook}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Website Auto-Crawl section ── */}
          <WebsiteCrawlSection />

        </div>
      </div>
    </>
  );
}
