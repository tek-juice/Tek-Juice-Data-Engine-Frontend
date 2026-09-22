import { useState } from 'react';
import { User, Key, CheckCircle2, AlertTriangle, Loader2, Eye, EyeOff } from 'lucide-react';
import { getAccessToken, getTenantId, getCurrentUserId } from '../../services/auth.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseJwt(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64)) as Record<string, unknown>;
  } catch {
    return null;
  }
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

const inputCls = [
  'w-full px-3 py-2 text-sm outline-none transition-colors',
  'bg-[var(--surface-2)] border border-[var(--border)]',
  'text-[var(--text)] placeholder:text-[var(--text-3)]',
  'focus:border-[var(--text-2)]',
].join(' ');

// ── Profile info ──────────────────────────────────────────────────────────────

function ProfileInfo() {
  const token   = getAccessToken();
  const payload = token ? parseJwt(token) : null;
  const userId  = getCurrentUserId() ?? '—';
  const tenantId = getTenantId() ?? '—';
  const email   = (payload?.email as string | undefined) ?? (payload?.sub as string | undefined) ?? '—';
  const name    = (payload?.name as string | undefined) ?? (payload?.full_name as string | undefined) ?? '—';
  const exp     = payload?.exp ? new Date((payload.exp as number) * 1000).toLocaleString() : '—';

  return (
    <div className="space-y-3">
      {([
        ['User ID',   userId],
        ['Tenant ID', tenantId],
        ['Email',     email],
        ['Name',      name],
        ['Token expires', exp],
      ] as [string, string][]).map(([label, value]) => (
        <div key={label} className="flex items-start gap-4">
          <span
            className="text-xs font-semibold w-28 flex-shrink-0 pt-0.5"
            style={{ color: 'var(--text-3)' }}
          >
            {label}
          </span>
          <span
            className="text-xs break-all"
            style={{ color: 'var(--text)', fontFamily: label.includes('ID') || label.includes('Token') ? 'ui-monospace, monospace' : undefined }}
          >
            {value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Change password ───────────────────────────────────────────────────────────

function ChangePassword() {
  const [current,  setCurrent]  = useState('');
  const [next,     setNext]     = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showCurr, setShowCurr] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState('');
  const [ok,       setOk]       = useState(true);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    if (!current) { setOk(false); setMsg('Enter your current password.'); return; }
    if (next.length < 8) { setOk(false); setMsg('New password must be at least 8 characters.'); return; }
    if (next !== confirm) { setOk(false); setMsg('Passwords do not match.'); return; }

    setSaving(true);
    try {
      // The backend password-change endpoint is at POST /api/v1/auth/change-password
      // We call it directly via fetch here to avoid circular imports
      const token = getAccessToken();
      const resp = await fetch(
        `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'}/api/v1/auth/change-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ current_password: current, new_password: next }),
        },
      );
      if (resp.ok) {
        setOk(true); setMsg('Password changed successfully.');
        setCurrent(''); setNext(''); setConfirm('');
      } else {
        const data = await resp.json().catch(() => ({}));
        setOk(false); setMsg((data as { detail?: string }).detail ?? 'Password change failed.');
      }
    } catch {
      setOk(false); setMsg('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  function ToggleBtn({ show, onToggle }: { show: boolean; onToggle: () => void }) {
    return (
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3 top-1/2 -translate-y-1/2"
        style={{ color: 'var(--text-3)' }}
      >
        {show ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-2)' }}>Current password</label>
        <div className="relative">
          <input
            type={showCurr ? 'text' : 'password'}
            value={current}
            onChange={e => setCurrent(e.target.value)}
            className={inputCls + ' pr-9'}
            autoComplete="current-password"
          />
          <ToggleBtn show={showCurr} onToggle={() => setShowCurr(v => !v)} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-2)' }}>New password</label>
        <div className="relative">
          <input
            type={showNext ? 'text' : 'password'}
            value={next}
            onChange={e => setNext(e.target.value)}
            placeholder="Minimum 8 characters"
            className={inputCls + ' pr-9'}
            autoComplete="new-password"
          />
          <ToggleBtn show={showNext} onToggle={() => setShowNext(v => !v)} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-2)' }}>Confirm new password</label>
        <input
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          className={inputCls}
          autoComplete="new-password"
        />
      </div>
      {msg && <Toast msg={msg} ok={ok} />}
      <button
        type="submit"
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 text-xs font-bold transition-colors disabled:opacity-40"
        style={{ background: 'var(--brand)', color: '#111', borderRadius: 3 }}
      >
        {saving
          ? <><Loader2 size={12} className="animate-spin" /> Saving…</>
          : <><Key size={12} /> Update password</>
        }
      </button>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh' }}>
      <header
        className="flex items-center gap-3 px-7 py-4 sticky top-0 z-10"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        <User size={16} style={{ color: 'var(--text-3)' }} />
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text)', letterSpacing: '-0.01em' }}>Profile</h1>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>Account details and security</p>
        </div>
      </header>

      <div className="px-7 py-8 max-w-xl space-y-8">
        {/* Account info */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-3)', letterSpacing: '0.06em' }}>
            Account
          </h2>
          <div
            className="p-5"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4 }}
          >
            <ProfileInfo />
          </div>
        </div>

        {/* Change password */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-3)', letterSpacing: '0.06em' }}>
            Security
          </h2>
          <div
            className="p-5"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4 }}
          >
            <ChangePassword />
          </div>
        </div>

        {/* Danger zone */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--danger)', letterSpacing: '0.06em' }}>
            Danger zone
          </h2>
          <div
            className="p-5"
            style={{ background: 'var(--surface)', border: '1px solid var(--danger)', borderRadius: 4, opacity: 0.8 }}
          >
            <p className="text-sm mb-3" style={{ color: 'var(--text-2)' }}>
              Deactivating your account will stop all crawls, gap analysis, and content injection for your tenant. This action cannot be undone.
            </p>
            <button
              className="text-xs font-bold px-3 py-2 transition-colors"
              style={{ border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: 3 }}
              onClick={() => window.alert('Please contact support to deactivate your account.')}
            >
              Deactivate account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
