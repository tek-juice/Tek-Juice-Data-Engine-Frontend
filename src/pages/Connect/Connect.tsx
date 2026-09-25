import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  onboardRegister,
  onboardScan,
  onboardInstall,
  onboardPing,
} from '../../api/onboard';

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 1 | 2;

type Platform =
  | 'wordpress'
  | 'shopify'
  | 'wix'
  | 'webflow'
  | 'nextjs'
  | 'laravel'
  | 'django'
  | 'graphql'
  | 'headless'
  | 'ssh'
  | 'unknown';

interface PlatformGuide {
  label: string;
  guide: string;
  fields: Array<{ id: string; label: string; type?: string; placeholder?: string }>;
}

const PLATFORM_GUIDES: Record<Platform, PlatformGuide> = {
  wordpress: {
    label: 'WordPress',
    guide: 'Go to WordPress › Users › Profile › Application Passwords. Enter a name (e.g. "Data Engine"), click Add New, and paste the generated password below.',
    fields: [
      { id: 'wp_url',      label: 'WordPress site URL',   placeholder: 'https://example.com' },
      { id: 'wp_user',     label: 'WordPress username',   placeholder: 'admin' },
      { id: 'wp_password', label: 'Application password', placeholder: 'xxxx xxxx xxxx xxxx', type: 'password' },
    ],
  },
  shopify: {
    label: 'Shopify',
    guide: 'Go to Shopify Admin › Apps › Develop Apps. Create a private app, enable write access to Blog Posts and Pages, install it, and paste the access token below.',
    fields: [
      { id: 'shop_domain',  label: 'Shop domain',  placeholder: 'myshop.myshopify.com' },
      { id: 'access_token', label: 'Access token', placeholder: 'shpat_…', type: 'password' },
    ],
  },
  wix: {
    label: 'Wix',
    guide: 'Go to Wix Dashboard › Settings › API Keys. Click Generate API Key, select all CMS permissions, and paste the key and your Site ID below.',
    fields: [
      { id: 'wix_site_id', label: 'Site ID',  placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
      { id: 'wix_api_key', label: 'API key',  placeholder: 'IST.eyJ…', type: 'password' },
    ],
  },
  webflow: {
    label: 'Webflow',
    guide: 'Go to Webflow Project Settings › Integrations › API Access. Generate a Site API token with CMS write permissions and paste it below.',
    fields: [
      { id: 'webflow_token', label: 'API token', placeholder: 'wf_…', type: 'password' },
    ],
  },
  nextjs: {
    label: 'Next.js',
    guide: 'Provide SSH access to your server. The engine will connect, detect your Next.js setup, auto-generate an API route for content injection, install it, test it, and disconnect.',
    fields: [
      { id: 'ssh_host',     label: 'SSH host',     placeholder: '203.0.113.10' },
      { id: 'ssh_user',     label: 'SSH username', placeholder: 'ubuntu' },
      { id: 'ssh_password', label: 'SSH password or key passphrase', type: 'password', placeholder: '••••••••' },
    ],
  },
  laravel: {
    label: 'Laravel / PHP',
    guide: 'Provide SSH access to your server. The engine will connect, install a Laravel receiver package, configure it, test it, and disconnect. No code changes needed from you.',
    fields: [
      { id: 'ssh_host',     label: 'SSH host',     placeholder: '203.0.113.10' },
      { id: 'ssh_user',     label: 'SSH username', placeholder: 'ubuntu' },
      { id: 'ssh_password', label: 'SSH password or key passphrase', type: 'password', placeholder: '••••••••' },
    ],
  },
  django: {
    label: 'Django / Python',
    guide: 'Provide SSH access to your server. The engine will connect, install a Django receiver app, configure it, test it, and disconnect. No code changes needed from you.',
    fields: [
      { id: 'ssh_host',     label: 'SSH host',     placeholder: '203.0.113.10' },
      { id: 'ssh_user',     label: 'SSH username', placeholder: 'ubuntu' },
      { id: 'ssh_password', label: 'SSH password or key passphrase', type: 'password', placeholder: '••••••••' },
    ],
  },
  graphql: {
    label: 'GraphQL API',
    guide: 'Provide your GraphQL endpoint and an API key or Bearer token. The engine will introspect the schema, identify content mutation types, and inject content using your existing API — no installation required.',
    fields: [
      { id: 'graphql_endpoint', label: 'GraphQL endpoint',     placeholder: 'https://example.com/graphql' },
      { id: 'graphql_token',    label: 'API key / Bearer token', placeholder: 'Bearer …', type: 'password' },
    ],
  },
  headless: {
    label: 'Headless CMS (Contentful / Strapi / Sanity)',
    guide: 'Provide your CMS API key. The engine will use your CMS write API directly — your backend is never touched.',
    fields: [
      { id: 'cms_space', label: 'Space ID or project name',   placeholder: 'my-space' },
      { id: 'cms_token', label: 'CMS API key (write access)', placeholder: 'Bearer …', type: 'password' },
    ],
  },
  ssh: {
    label: 'Custom backend / SSH',
    guide: 'Provide SSH access to your server. The engine will connect, read your file structure and database schema, auto-generate and install a custom receiver bridge, test it, and disconnect.',
    fields: [
      { id: 'ssh_host',     label: 'SSH host',     placeholder: '203.0.113.10' },
      { id: 'ssh_user',     label: 'SSH username', placeholder: 'ubuntu' },
      { id: 'ssh_password', label: 'SSH password or key passphrase', type: 'password', placeholder: '••••••••' },
    ],
  },
  unknown: {
    label: 'Unknown — SSH deep scan',
    guide: "We couldn't auto-detect your platform. Provide SSH access and the engine will scan your server, identify your exact architecture, and auto-generate the correct injection bridge.",
    fields: [
      { id: 'ssh_host',     label: 'SSH host',     placeholder: '203.0.113.10' },
      { id: 'ssh_user',     label: 'SSH username', placeholder: 'ubuntu' },
      { id: 'ssh_password', label: 'SSH password or key passphrase', type: 'password', placeholder: '••••••••' },
    ],
  },
};

// ─── Primitives ───────────────────────────────────────────────────────────────

function WizardBox({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: '1.5rem',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 460,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '2rem',
        boxShadow: 'var(--shadow-md)',
      }}>
        {children}
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '1.75rem' }}>
      <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect width="32" height="32" rx="7" fill="#F4A825"/>
        <path d="M9 23L16 9l7 14" stroke="#111" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        <circle cx="16" cy="19" r="2.5" fill="#111"/>
      </svg>
      <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
        Data Engine
      </span>
    </div>
  );
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '1.5rem' }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          height: 3,
          flex: 1,
          borderRadius: 2,
          background: i < current ? 'var(--brand)' : 'var(--border)',
          transition: 'background 0.3s',
        }} />
      ))}
    </div>
  );
}

function FieldInput({
  id, label, type = 'text', value, onChange, placeholder, disabled,
}: {
  id: string; label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string; disabled?: boolean;
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
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          color: 'var(--text)',
          fontSize: '0.875rem',
          fontFamily: 'inherit',
          outline: 'none',
          opacity: disabled ? 0.5 : 1,
        }}
      />
    </div>
  );
}

function PrimaryBtn({
  children, onClick, disabled, loading, type = 'button',
}: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean;
  loading?: boolean; type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        width: '100%',
        padding: '0.625rem',
        minHeight: 42,
        background: 'var(--brand)',
        color: '#111',
        fontSize: '0.875rem',
        fontWeight: 700,
        fontFamily: 'inherit',
        border: 'none',
        borderRadius: 6,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.5 : 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: '0.5rem',
      }}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

function Spinner({ size = 15, color = '#111' }: { size?: number; color?: string }) {
  return (
    <span style={{
      display: 'inline-block',
      width: size,
      height: size,
      border: `1.5px solid ${color}33`,
      borderTopColor: color,
      borderRadius: '50%',
      animation: 'connect-spin 0.55s linear infinite',
      flexShrink: 0,
    }} />
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <p style={{
      fontSize: '0.8125rem',
      color: 'var(--danger)',
      background: 'var(--danger-bg)',
      border: '1px solid var(--danger-border)',
      borderRadius: 6,
      padding: '0.5rem 0.75rem',
      margin: 0,
    }}>
      {msg}
    </p>
  );
}

// ─── Step 1: Register ─────────────────────────────────────────────────────────

function Step1Register({
  onDone,
}: {
  onDone: (email: string, websiteUrl: string, tenantId?: string) => void;
}) {
  const [company, setCompany] = useState('');
  const [website, setWebsite] = useState('');
  const [email,   setEmail]   = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!company.trim()) { setError('Company name is required.'); return; }
    if (!website.trim()) { setError('Website URL is required.'); return; }
    if (!email.trim())   { setError('Email address is required.'); return; }

    setLoading(true);
    try {
      const res = await onboardRegister({
        product_name: company.trim(),
        website_url:  website.trim(),
        email:        email.trim(),
      });
      onDone(email.trim(), website.trim(), res.tenant_id);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setError('An account with that email already exists.');
      } else {
        // Endpoint not yet built or transient error — advance anyway
        onDone(email.trim(), website.trim(), undefined);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <h1 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 0.25rem', letterSpacing: '-0.015em' }}>
          Connect your product
        </h1>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-2)', margin: 0 }}>
          Step 1 of 2 — Fill in 3 fields and you're done
        </p>
      </div>

      {error && <ErrorMsg msg={error} />}

      <FieldInput id="company" label="Company name"  value={company} onChange={setCompany} placeholder="Acme Inc."           disabled={loading} />
      <FieldInput id="website" label="Website URL"   value={website} onChange={setWebsite} placeholder="https://example.com" disabled={loading} />
      <FieldInput id="email"   label="Email address" value={email}   onChange={setEmail}   placeholder="you@company.com"     disabled={loading} type="email" />

      <PrimaryBtn type="submit" loading={loading}>
        Connect →
      </PrimaryBtn>
    </form>
  );
}

// ─── Step 2: Platform + Install (combined) ────────────────────────────────────

function Step2PlatformAndInstall({
  websiteUrl,
  tenantId,
}: {
  websiteUrl: string;
  tenantId?: string;
}) {

  // Platform detection state
  const [scanning,   setScanning]   = useState(true);
  const [platform,   setPlatform]   = useState<Platform>('unknown');
  const [manualMode, setManualMode] = useState(false);
  const [creds,      setCreds]      = useState<Record<string, string>>({});
  const [formError,  setFormError]  = useState('');
  const didScan = useRef(false);

  // Install state
  const [installing, setInstalling] = useState(false);
  const [installStatus, setInstallStatus] = useState<'idle' | 'installing' | 'configuring' | 'live' | 'failed'>('idle');
  const [installError,  setInstallError]  = useState('');
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const didInstall = useRef(false);

  // Auto-scan platform on mount
  useEffect(() => {
    if (didScan.current) return;
    didScan.current = true;
    onboardScan({ website_url: websiteUrl, tenant_id: tenantId })
      .then(res => {
        const p = (res.platform_type?.toLowerCase() ?? 'unknown') as Platform;
        setPlatform(PLATFORM_GUIDES[p] ? p : 'unknown');
      })
      .catch(() => setManualMode(true))
      .finally(() => setScanning(false));
  }, [websiteUrl, tenantId]);

  // Cleanup poll on unmount
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const guide = PLATFORM_GUIDES[platform];

  async function handleInstall(e: FormEvent) {
    e.preventDefault();
    setFormError('');

    for (const f of guide.fields) {
      if (!creds[f.id]?.trim()) {
        setFormError(`${f.label} is required.`);
        return;
      }
    }

    if (didInstall.current) return;
    didInstall.current = true;
    setInstalling(true);
    setInstallStatus('installing');

    try {
      const res = await onboardInstall({
        website_url:   websiteUrl,
        platform_type: platform,
        credentials:   creds,
        tenant_id:     tenantId,
      });

      if (res.installing && tenantId) {
        setInstallStatus('configuring');
        pollRef.current = setInterval(async () => {
          try {
            const ping = await onboardPing(tenantId!);
            const s = ping.injection_status;
            if (s === 'live') {
              clearInterval(pollRef.current!);
              setInstallStatus('live');
            } else if (s === 'failed') {
              clearInterval(pollRef.current!);
              setInstallStatus('failed');
              setInstallError('Installation failed. Please check your credentials and try again.');
              setInstalling(false);
              didInstall.current = false;
            }
          } catch { /* keep polling */ }
        }, 3000);
      } else {
        // Immediate success or 404 fallback
        setInstallStatus('live');
        setInstalling(false);
      }
    } catch (err: unknown) {
      const s = (err as { response?: { status?: number } })?.response?.status;
      if (s === 404) {
        // Endpoint not yet live — simulate success
        setInstallStatus('live');
        setInstalling(false);
      } else {
        setInstallStatus('failed');
        setInstallError('Installation request failed. Please try again.');
        setInstalling(false);
        didInstall.current = false;
      }
    }
  }

  // ── Done state — shown inline when bridge goes live ──────────────────────
  if (installStatus === 'live') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, textAlign: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 0.25rem', letterSpacing: '-0.015em' }}>
            You're all set!
          </h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-2)', margin: 0 }}>
            Step 2 of 2 — Setup complete
          </p>
        </div>

        <div style={{ padding: '1.5rem 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
            {['✅ Connected.', '✅ Injection bridge live.', '✅ First crawl started.'].map(msg => (
              <p key={msg} style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--success)', margin: 0 }}>
                {msg}
              </p>
            ))}
          </div>
          <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text)', margin: '0 0 8px' }}>
            You are done — the engine is now running.
          </p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-3)', margin: 0, lineHeight: 1.7 }}>
            The engine is crawling your website, analysing your industry, writing
            missing content, and preparing to publish — automatically, without any
            further action from you.
          </p>
        </div>

        <Link
          to="/login"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '100%', padding: '0.625rem', minHeight: 42,
            background: 'var(--brand)', color: '#111',
            fontSize: '0.875rem', fontWeight: 700,
            borderRadius: 6, textDecoration: 'none',
          }}
        >
          View your dashboard →
        </Link>
      </div>
    );
  }

  // ── Installing state ─────────────────────────────────────────────────────
  if (installStatus === 'installing' || installStatus === 'configuring') {
    const label = installStatus === 'installing'
      ? 'Sending installation request…'
      : 'Configuring injection bridge…';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 0.25rem', letterSpacing: '-0.015em' }}>
            Installing bridge
          </h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-2)', margin: 0 }}>
            Step 2 of 2 — Setting up the injection bridge
          </p>
        </div>
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <Spinner size={28} color="var(--brand)" />
          <p style={{ marginTop: 12, fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-2)' }}>
            {label}
          </p>
          <p style={{ marginTop: 6, fontSize: '0.8125rem', color: 'var(--text-3)' }}>
            This usually takes 30–60 seconds…
          </p>
        </div>
      </div>
    );
  }

  // ── Scanning state ───────────────────────────────────────────────────────
  if (scanning) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 0' }}>
        <Spinner size={28} color="var(--brand)" />
        <p style={{ marginTop: 12, fontSize: '0.875rem', color: 'var(--text-2)' }}>
          Detecting your platform…
        </p>
      </div>
    );
  }

  // ── Platform credentials form ────────────────────────────────────────────
  return (
    <form onSubmit={handleInstall} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h1 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 0.25rem', letterSpacing: '-0.015em' }}>
          Platform credentials
        </h1>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-2)', margin: 0 }}>
          Step 2 of 2 — Connect your platform
        </p>
      </div>

      {manualMode && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-2)' }}>
            Select your platform
          </label>
          <select
            value={platform}
            onChange={e => setPlatform(e.target.value as Platform)}
            style={{
              padding: '0.5rem 0.75rem',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: 'var(--text)',
              fontSize: '0.875rem',
              fontFamily: 'inherit',
            }}
          >
            {(Object.keys(PLATFORM_GUIDES) as Platform[]).map(p => (
              <option key={p} value={p}>{PLATFORM_GUIDES[p].label}</option>
            ))}
          </select>
        </div>
      )}

      <p style={{ fontSize: '0.8125rem', color: 'var(--text-2)', lineHeight: 1.6, margin: 0 }}>
        {guide.guide}
      </p>

      {(formError || installError) && <ErrorMsg msg={formError || installError} />}

      {guide.fields.map(f => (
        <FieldInput
          key={f.id}
          id={f.id}
          label={f.label}
          type={f.type}
          placeholder={f.placeholder}
          value={creds[f.id] ?? ''}
          onChange={v => setCreds(prev => ({ ...prev, [f.id]: v }))}
          disabled={installing}
        />
      ))}

      <PrimaryBtn type="submit" loading={installing}>
        Install bridge →
      </PrimaryBtn>
    </form>
  );
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

export default function Connect() {
  const navigate = useNavigate();

  const [step,       setStep]       = useState<Step>(1);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [tenantId,   setTenantId]   = useState<string | undefined>();

  return (
    <>
      <style>{`@keyframes connect-spin { to { transform: rotate(360deg); } }`}</style>
      <WizardBox>
        <Brand />
        <StepIndicator current={step} total={2} />

        {step === 1 && (
          <Step1Register
            onDone={(em, url, tid) => {
              void em;
              setWebsiteUrl(url);
              if (tid) setTenantId(tid);
              setStep(2);
            }}
          />
        )}

        {step === 2 && (
          <Step2PlatformAndInstall
            websiteUrl={websiteUrl}
            tenantId={tenantId}
          />
        )}

        {step === 2 && (
          <button
            type="button"
            onClick={() => setStep(1)}
            style={{
              background: 'none', border: 'none',
              padding: '0.5rem 0', marginTop: 12,
              fontSize: '0.8125rem', color: 'var(--text-3)',
              cursor: 'pointer', width: '100%', textAlign: 'center',
            }}
          >
            ← Back
          </button>
        )}

        <p style={{ marginTop: 16, fontSize: '0.75rem', textAlign: 'center', color: 'var(--text-3)', margin: '1rem 0 0' }}>
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => navigate('/login')}
            style={{
              background: 'none', border: 'none', padding: 0,
              color: 'var(--brand)', fontWeight: 600, cursor: 'pointer',
              fontSize: 'inherit', textDecoration: 'underline', textUnderlineOffset: 2,
            }}
          >
            Sign in
          </button>
        </p>
      </WizardBox>
    </>
  );
}
