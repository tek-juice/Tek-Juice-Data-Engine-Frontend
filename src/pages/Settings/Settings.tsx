import { useState, useEffect, useCallback } from 'react';
import {
  Settings, Loader2, AlertTriangle, CheckCircle2,
  Clock, Layers, Bell,
} from 'lucide-react';
import { listWebhooks, registerWebhook, deleteWebhook } from '../../api/auth';
import type { WebhookEndpoint, WebhookEventType } from '../../types';

// ── Shared primitives ─────────────────────────────────────────────────────────

function Section({ icon: Icon, title, children }: {
  icon: React.ElementType; title: string; children: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={14} style={{ color: 'var(--brand)' }} />
        <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-3)', letterSpacing: '0.06em' }}>
          {title}
        </h2>
      </div>
      <div
        className="p-5 space-y-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4 }}
      >
        {children}
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-2)' }}>{label}</label>
      {children}
      {hint && <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{hint}</p>}
    </div>
  );
}

const inputCls = [
  'w-full px-3 py-2 text-sm outline-none transition-colors',
  'bg-[var(--surface-2)] border border-[var(--border)]',
  'text-[var(--text)] placeholder:text-[var(--text-3)]',
  'focus:border-[var(--text-2)]',
].join(' ');

function SaveBtn({ saving, label = 'Save changes' }: { saving: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className="flex items-center gap-2 px-4 py-2 text-xs font-bold transition-colors disabled:opacity-40"
      style={{ background: 'var(--brand)', color: '#111', borderRadius: 3 }}
    >
      {saving ? <><Loader2 size={12} className="animate-spin" /> Saving…</> : label}
    </button>
  );
}

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 text-xs"
      style={{
        background: ok ? 'rgba(34,197,94,0.08)' : 'var(--danger-bg, #2d1212)',
        border: `1px solid ${ok ? 'rgba(34,197,94,0.3)' : 'var(--danger)'}`,
        color: ok ? 'var(--success)' : 'var(--danger)',
        borderRadius: 4,
      }}
    >
      {ok ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
      {msg}
    </div>
  );
}

// ── Webhook section ───────────────────────────────────────────────────────────

const ALL_EVENTS: WebhookEventType[] = [
  'document.completed', 'document.failed', 'gap.detected',
  'gap.resolved', 'drafts.ready', 'schema.generated',
  'ranking.updated', '*',
];

function WebhookSettings() {
  const [webhooks, setWebhooks]  = useState<WebhookEndpoint[]>([]);
  const [url, setUrl]            = useState('');
  const [events, setEvents]      = useState<WebhookEventType[]>(['*']);
  const [desc, setDesc]          = useState('');
  const [saving, setSaving]      = useState(false);
  const [msg, setMsg]            = useState('');
  const [ok, setOk]              = useState(true);
  const [newSecret, setNewSecret] = useState('');

  const load = useCallback(() => {
    listWebhooks().then(setWebhooks).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  function toggleEvent(ev: WebhookEventType) {
    setEvents(prev =>
      prev.includes(ev) ? prev.filter(e => e !== ev) : [...prev, ev]
    );
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setMsg(''); setNewSecret('');
    try {
      const result = await registerWebhook({ url: url.trim(), event_types: events, description: desc.trim() || undefined });
      if (result.secret) setNewSecret(result.secret);
      setUrl(''); setDesc(''); setEvents(['*']);
      setOk(true); setMsg('Webhook registered.');
      load();
    } catch {
      setOk(false); setMsg('Failed to register webhook.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteWebhook(id).catch(() => {});
    load();
  }

  return (
    <div className="space-y-5">
      {/* Existing webhooks */}
      {webhooks.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-2)' }}>Registered endpoints</p>
          <div className="space-y-2">
            {webhooks.map(wh => (
              <div
                key={wh.endpoint_id}
                className="flex items-start justify-between px-3 py-2.5"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 3 }}
              >
                <div className="min-w-0">
                  <p className="text-xs font-mono truncate" style={{ color: 'var(--text)' }}>{wh.url}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                    {wh.event_types.join(', ')}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(wh.endpoint_id)}
                  className="text-xs ml-3 flex-shrink-0 transition-colors"
                  style={{ color: 'var(--danger)' }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New secret reveal */}
      {newSecret && (
        <div
          className="px-3 py-2.5 text-xs"
          style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 3 }}
        >
          <p className="font-semibold mb-1" style={{ color: 'var(--success)' }}>Webhook secret (shown once — copy now)</p>
          <code className="break-all" style={{ color: 'var(--text)', fontFamily: 'ui-monospace, monospace' }}>{newSecret}</code>
        </div>
      )}

      {/* Add form */}
      <form onSubmit={handleAdd} className="space-y-3">
        <p className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>Add endpoint</p>
        <Field label="Callback URL">
          <input type="url" value={url} onChange={e => setUrl(e.target.value)}
            placeholder="https://yourapp.com/webhooks/data-engine" className={inputCls} required />
        </Field>
        <Field label="Description (optional)">
          <input value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="Production webhook" className={inputCls} />
        </Field>
        <div>
          <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>Events</p>
          <div className="flex flex-wrap gap-2">
            {ALL_EVENTS.map(ev => (
              <label key={ev} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={events.includes(ev)}
                  onChange={() => toggleEvent(ev)}
                  className="accent-[var(--brand)]"
                />
                <span className="text-xs" style={{ color: 'var(--text-2)', fontFamily: 'ui-monospace, monospace' }}>{ev}</span>
              </label>
            ))}
          </div>
        </div>
        {msg && <Toast msg={msg} ok={ok} />}
        <SaveBtn saving={saving} label="Register webhook" />
      </form>
    </div>
  );
}

// ── Notification preferences ──────────────────────────────────────────────────

function NotificationSettings() {
  const [emailOnDraft, setEmailOnDraft]   = useState(true);
  const [emailOnGap,   setEmailOnGap]     = useState(false);
  const [emailOnPublish, setEmailOnPublish] = useState(true);
  const [saved, setSaved]                  = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    // Preferences are stored client-side for now (backend setting endpoint TBD)
    try {
      localStorage.setItem('notif_prefs', JSON.stringify({ emailOnDraft, emailOnGap, emailOnPublish }));
    } catch { /* ignore */ }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <form onSubmit={handleSave} className="space-y-3">
      {([
        ['Email when drafts are ready', emailOnDraft, setEmailOnDraft],
        ['Email when a gap is detected', emailOnGap, setEmailOnGap],
        ['Email when content is published', emailOnPublish, setEmailOnPublish],
      ] as [string, boolean, (v: boolean) => void][]).map(([label, val, set]) => (
        <label key={label} className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={val}
            onChange={e => set(e.target.checked)}
            className="accent-[var(--brand)]"
          />
          <span className="text-sm" style={{ color: 'var(--text)' }}>{label}</span>
        </label>
      ))}
      {saved && <Toast msg="Preferences saved." ok={true} />}
      <SaveBtn saving={false} label="Save preferences" />
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh' }}>
      <header
        className="flex items-center gap-3 px-7 py-4 sticky top-0 z-10"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        <Settings size={16} style={{ color: 'var(--text-3)' }} />
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)', letterSpacing: '-0.01em' }}>Settings</h1>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>Webhooks, notifications, and pipeline status</p>
        </div>
      </header>

      <div className="px-7 py-8 max-w-2xl">
        <Section icon={Layers} title="Webhooks">
          <WebhookSettings />
        </Section>

        <Section icon={Bell} title="Notifications">
          <NotificationSettings />
        </Section>

        <Section icon={Clock} title="Pipeline schedule">
          <div className="space-y-2">
            {([
              ['Gap analysis',       'Every 6h on completed documents'],
              ['AI draft writing',   'Every gap_auto_close_interval'],
              ['Trend scraping',     'Every hour (Google News, HN, Reddit, GitHub, YouTube)'],
              ['SEO rank tracking',  'Daily'],
              ['AEO analysis',       'Every 6h'],
              ['Data pool sync',     'Every 15 minutes'],
              ['Health checks',      'Every 60 seconds'],
            ] as [string, string][]).map(([name, sched]) => (
              <div key={name} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
                <span className="text-sm" style={{ color: 'var(--text)' }}>{name}</span>
                <span className="text-xs" style={{ color: 'var(--text-3)', fontFamily: 'ui-monospace, monospace' }}>{sched}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}
