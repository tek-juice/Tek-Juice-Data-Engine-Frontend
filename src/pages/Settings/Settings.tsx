import { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, AlertTriangle, Copy, Trash2, Plus, Eye, EyeOff } from 'lucide-react';
import { listApiKeys, createApiKey, deleteApiKey, listWebhooks, deleteWebhook } from '../../api/auth';
import type { ApiKeyListItem, WebhookEndpoint } from '../../types';

// ── API Keys ──────────────────────────────────────────────────────────────────

function ApiKeys() {
  const [keys,    setKeys]    = useState<ApiKeyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [creating, setCreating] = useState(false);
  const [newName,  setNewName]  = useState('');
  const [newKey,   setNewKey]   = useState('');
  const [showKey,  setShowKey]  = useState(false);
  const [copied,   setCopied]   = useState(false);

  const load = useCallback(() => {
    setLoading(true); setError('');
    listApiKeys()
      .then(setKeys)
      .catch(() => setError('Could not load API keys.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await createApiKey(newName.trim());
      setNewKey((res as { api_key?: string; key?: string }).api_key ?? (res as { api_key?: string; key?: string }).key ?? '');
      setNewName('');
      load();
    } catch {
      setError('Failed to create key.');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(key_id: string) {
    try { await deleteApiKey(key_id); load(); } catch { setError('Failed to revoke key.'); }
  }

  function copyKey() {
    navigator.clipboard.writeText(newKey).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-bold mb-0.5" style={{ color: 'var(--text)' }}>API Keys</h2>
        <p className="text-xs" style={{ color: 'var(--text-3)' }}>Keys authenticate SDK and backend requests. Store them securely — they are shown once.</p>
      </div>

      {/* Create */}
      <div className="flex gap-2">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          placeholder="Key name (e.g. Production)"
          className="flex-1 text-sm px-3 py-2 rounded outline-none"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
          onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
        />
        <button
          onClick={handleCreate} disabled={creating || !newName.trim()}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded transition-colors disabled:opacity-40"
          style={{ background: 'var(--brand)', color: '#111' }}
        >
          {creating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Create
        </button>
      </div>

      {/* New key one-time reveal */}
      {newKey && (
        <div className="flex items-center gap-2 px-3 py-2 rounded" style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.25)' }}>
          <code className="flex-1 text-xs font-mono break-all" style={{ color: 'var(--success)' }}>
            {showKey ? newKey : newKey.slice(0, 12) + '••••••••••••••••••••'}
          </code>
          <button onClick={() => setShowKey(v => !v)} style={{ color: 'var(--text-3)' }}>{showKey ? <EyeOff size={13} /> : <Eye size={13} />}</button>
          <button onClick={copyKey} style={{ color: 'var(--text-3)' }}>{copied ? '✓' : <Copy size={13} />}</button>
        </div>
      )}

      {error   && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
      {loading && <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-3)' }}><Loader2 size={12} className="animate-spin" /> Loading…</div>}

      {!loading && keys.length === 0 && <p className="text-xs" style={{ color: 'var(--text-3)' }}>No API keys yet.</p>}
      {!loading && keys.length > 0 && (
        <div className="space-y-1.5">
          {keys.map(k => (
            <div key={k.key_id} className="flex items-center gap-3 px-3 py-2.5 rounded" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{k.name}</p>
                <p className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>{k.prefix}••••••••</p>
              </div>
              <span className="text-xs" style={{ color: k.is_active ? 'var(--success)' : 'var(--danger)' }}>{k.is_active ? 'Active' : 'Revoked'}</span>
              <button onClick={() => handleDelete(k.key_id)} style={{ color: 'var(--danger)' }} title="Revoke">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Webhooks ──────────────────────────────────────────────────────────────────

function Webhooks() {
  const [hooks,   setHooks]   = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const load = useCallback(() => {
    setLoading(true); setError('');
    listWebhooks()
      .then(setHooks)
      .catch(() => setError('Could not load webhooks.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    try { await deleteWebhook(id); load(); } catch { setError('Failed to remove webhook.'); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold mb-0.5" style={{ color: 'var(--text)' }}>Webhooks</h2>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>Registered callback URLs that receive pipeline events.</p>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded" style={{ border: '1px solid var(--border)', color: 'var(--text-3)' }}>
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error   && <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}
      {loading && <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-3)' }}><Loader2 size={12} className="animate-spin" /> Loading…</div>}
      {!loading && hooks.length === 0 && <p className="text-xs" style={{ color: 'var(--text-3)' }}>No webhooks registered.</p>}

      {!loading && hooks.length > 0 && (
        <div className="space-y-1.5">
          {hooks.map(h => (
            <div key={h.endpoint_id} className="flex items-start gap-3 px-3 py-2.5 rounded" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono truncate" style={{ color: 'var(--text)' }}>{h.url}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{h.event_types?.join(', ') ?? '—'}</p>
              </div>
              <span className="text-xs flex-shrink-0" style={{ color: h.is_active !== false ? 'var(--success)' : 'var(--danger)' }}>
                {h.is_active !== false ? 'Active' : 'Inactive'}
              </span>
              <button onClick={() => handleDelete(h.endpoint_id)} style={{ color: 'var(--danger)', flexShrink: 0 }} title="Remove">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Settings() {
  return (
    <div className="px-7 py-7 max-w-2xl space-y-10" style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh' }}>
      <div>
        <h1 className="text-base font-bold" style={{ color: 'var(--text)' }}>Settings</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>Manage API keys and webhook endpoints.</p>
      </div>
      <div className="p-5 rounded space-y-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <ApiKeys />
      </div>
      <div className="p-5 rounded space-y-1" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <Webhooks />
      </div>
    </div>
  );
}
