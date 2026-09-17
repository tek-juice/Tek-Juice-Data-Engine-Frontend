import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAccessToken } from '../../services/auth.service';
import { registerWebsiteCrawl } from '../../api/ingest';

// ─── Primitives ───────────────────────────────────────────────────────────────

function WizardBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 460,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '2rem',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.5rem' }}>
      <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 11L7 3l4 8" stroke="#111" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="7" cy="9" r="1.4" fill="#111"/>
        </svg>
      </div>
      <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text)' }}>Data Engine</span>
    </div>
  );
}

function FieldInput({
  id, label, value, onChange, placeholder, type = 'text', disabled,
}: {
  id: string; label: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
  type?: string; disabled?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label htmlFor={id} style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-2)' }}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '0.5rem 0.75rem',
          fontSize: '0.875rem',
          borderRadius: 6,
          border: '1px solid var(--border)',
          background: 'var(--surface-2)',
          color: 'var(--text)',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

function PrimaryBtn({ children, type = 'button', loading = false, onClick }: {
  children: React.ReactNode; type?: 'submit' | 'button'; loading?: boolean; onClick?: () => void;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading}
      style={{
        width: '100%',
        padding: '0.625rem',
        minHeight: 42,
        background: 'var(--brand)',
        color: '#111',
        fontSize: '0.875rem',
        fontWeight: 700,
        borderRadius: 6,
        border: 'none',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.6 : 1,
      }}
    >
      {loading ? 'Please wait…' : children}
    </button>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <p style={{ fontSize: '0.8125rem', color: 'var(--danger, #ef4444)', margin: 0 }}>{msg}</p>
  );
}

// ─── JWT email helper ─────────────────────────────────────────────────────────

function getEmailFromToken(): string {
  const token = getAccessToken();
  if (!token) return '';
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return (payload.email as string) ?? '';
  } catch {
    return '';
  }
}

// ─── Step 1: Register product ─────────────────────────────────────────────────

function Step1Register({ onDone }: { onDone: () => void }) {
  const [company, setCompany] = useState('');
  const [website, setWebsite] = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const accountEmail = getEmailFromToken();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!company.trim()) { setError('Company name is required.'); return; }
    if (!website.trim()) { setError('Website URL is required.');  return; }

    // Validate URL format before sending
    try { new URL(website.trim()); } catch {
      setError('Enter a valid URL including https://');
      return;
    }

    setLoading(true);
    try {
      await registerWebsiteCrawl({
        website_url: website.trim(),
        max_pages:   50,
        max_depth:   3,
        recrawl_interval_hours: 24,
      });
    } catch {
      // Non-fatal — crawl registration failed but we still let the user
      // reach the dashboard (they can retry from Website Setup)
    } finally {
      setLoading(false);
    }
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <h1 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 0.25rem', letterSpacing: '-0.015em' }}>
          Connect your product
        </h1>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-2)', margin: 0 }}>
          Register your website — the engine crawls it automatically.
        </p>
      </div>

      {error && <ErrorMsg msg={error} />}

      {accountEmail && (
        <div style={{ fontSize: '0.8125rem', padding: '0.5rem 0.75rem', borderRadius: 6, background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
          Connecting as <span style={{ fontWeight: 600, color: 'var(--text)' }}>{accountEmail}</span>
        </div>
      )}

      <FieldInput id="company" label="Company name" value={company} onChange={setCompany} placeholder="Acme Inc." />
      <FieldInput id="website" label="Website URL"  value={website} onChange={setWebsite} placeholder="https://example.com" />

      <PrimaryBtn type="submit" loading={loading}>
        {loading ? 'Registering crawl…' : 'Connect product & start crawl'}
      </PrimaryBtn>
    </form>
  );
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

export default function Connect() {
  const navigate = useNavigate();

  return (
    <>
      <WizardBox>
        <Brand />

        <Step1Register onDone={() => navigate('/dashboard', { replace: true })} />

        <p style={{ marginTop: 16, fontSize: '0.75rem', textAlign: 'center', color: 'var(--text-3)', margin: '1rem 0 0' }}>
          Already signed in?{' '}
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            style={{ background: 'none', border: 'none', padding: 0, color: 'var(--brand)', fontWeight: 600, cursor: 'pointer', fontSize: 'inherit', textDecoration: 'underline', textUnderlineOffset: 2 }}
          >
            Go to dashboard
          </button>
        </p>
      </WizardBox>
    </>
  );
}
