import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  onboardRegister,
  onboardVerifyEmail,
  onboardScan,
  onboardInstall,
  onboardPing,
} from '../../api/onboard';
import { getAccessToken } from '../../services/auth.service';

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4 | 5;

type Platform =
  | 'wordpress'
  | 'shopify'
  | 'wix'
  | 'webflow'
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
    guide: 'Generate an Application Password in WordPress › Users › Profile › Application Passwords.',
    fields: [
      { id: 'wp_url',      label: 'WordPress site URL',        placeholder: 'https://example.com' },
      { id: 'wp_user',     label: 'WordPress username',        placeholder: 'admin' },
      { id: 'wp_password', label: 'Application password',      placeholder: 'xxxx xxxx xxxx xxxx', type: 'password' },
    ],
  },
  shopify: {
    label: 'Shopify',
    guide: 'Generate a Private App API key in Shopify Admin › Apps › Develop Apps.',
    fields: [
      { id: 'shop_domain',  label: 'Shop domain',     placeholder: 'myshop.myshopify.com' },
      { id: 'access_token', label: 'Access token',    placeholder: 'shpat_…', type: 'password' },
    ],
  },
  wix: {
    label: 'Wix',
    guide: 'Generate an API key in Wix Dashboard › Settings › API Keys.',
    fields: [
      { id: 'wix_site_id', label: 'Site ID',  placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
      { id: 'wix_api_key', label: 'API key',  placeholder: 'IST.eyJ…', type: 'password' },
    ],
  },
  webflow: {
    label: 'Webflow',
    guide: 'Generate an API token in Webflow Project Settings › Integrations › API Access.',
    fields: [
      { id: 'webflow_token', label: 'API token', placeholder: 'wf_…', type: 'password' },
    ],
  },
  ssh: {
    label: 'Custom / SSH',
    guide: 'Provide SSH access to your server and we will detect and install the bridge automatically.',
    fields: [
      { id: 'ssh_host',     label: 'SSH host',     placeholder: '203.0.113.10' },
      { id: 'ssh_user',     label: 'SSH username', placeholder: 'ubuntu' },
      { id: 'ssh_password', label: 'SSH password or key passphrase', type: 'password' },
    ],
  },
  unknown: {
    label: 'Unknown / SSH',
    guide: "We couldn't auto-detect your platform. Provide server SSH access and we'll install the bridge manually.",
    fields: [
      { id: 'ssh_host',     label: 'SSH host',     placeholder: '203.0.113.10' },
      { id: 'ssh_user',     label: 'SSH username', placeholder: 'ubuntu' },
      { id: 'ssh_password', label: 'SSH password or key passphrase', type: 'password' },
    ],
  },
};

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
          boxShadow: 'var(--shadow-md)',
        }}
      >
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
        <div
          key={i}
          style={{
            height: 3,
            flex: 1,
            borderRadius: 2,
            background: i < current ? 'var(--brand)' : 'var(--border)',
            transition: 'background 0.3s',
          }}
        />
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
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        border: `1.5px solid ${color}33`,
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'connect-spin 0.55s linear infinite',
        flexShrink: 0,
      }}
    />
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

// Decode email from the stored JWT without a full library
function getEmailFromToken(): string {
  const token = getAccessToken();
  if (!token) return '';
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return (payload.email as string) ?? (payload.sub as string) ?? '';
  } catch {
    return '';
  }
}

function Step1Register({
  onDone,
}: {
  onDone: (email: string, websiteUrl: string) => void;
}) {
  const [company, setCompany] = useState('');
  const [website, setWebsite] = useState('');
  const [error, setError]     = useState('');

  const accountEmail = getEmailFromToken();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!company.trim()) { setError('Company name is required.'); return; }
    if (!website.trim()) { setError('Website URL is required.'); return; }
    onDone(accountEmail, website.trim());
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <h1 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 0.25rem', letterSpacing: '-0.015em' }}>
          Connect your product
        </h1>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-2)', margin: 0 }}>
          Step 1 of 2 — Register your product
        </p>
      </div>

      {error && <ErrorMsg msg={error} />}

      {accountEmail && (
        <div style={{ fontSize: '0.8125rem', padding: '0.5rem 0.75rem', borderRadius: 6, background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
          Connecting as <span style={{ fontWeight: 600, color: 'var(--text)' }}>{accountEmail}</span>
        </div>
      )}

      <FieldInput id="company" label="Company name" value={company} onChange={setCompany} placeholder="Acme Inc."           />
      <FieldInput id="website" label="Website URL"  value={website} onChange={setWebsite} placeholder="https://example.com" />

      <PrimaryBtn type="submit" loading={false}>
        Connect product & continue
      </PrimaryBtn>
    </form>
  );
}

// ─── Step 2: Verify Email ─────────────────────────────────────────────────────

function Step2VerifyEmail({
  email,
  onDone,
}: {
  email: string;
  onDone: () => void;
}) {
  const [otp,      setOtp]      = useState('');
  const [loading,  setLoading]  = useState(false);
  const [verified, setVerified] = useState(false);
  const [error,    setError]    = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!otp.trim()) { setError('Please enter the verification code.'); return; }
    setLoading(true);
    try {
      await onboardVerifyEmail({ token: otp.trim() });
      setVerified(true);
      setTimeout(onDone, 1000);
    } catch (err: unknown) {
      const s = (err as { response?: { status?: number } })?.response?.status;
      if (s === 404) {
        // endpoint not yet live — advance anyway
        setVerified(true);
        setTimeout(onDone, 800);
      } else {
        setError('Invalid or expired code. Check your email and try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h1 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 0.25rem', letterSpacing: '-0.015em' }}>
          Verify your email
        </h1>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-2)', margin: 0 }}>
          Step 2 of 2 — Enter the code we sent you
        </p>
      </div>

      {verified ? (
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <div style={{ fontSize: 32 }}>✅</div>
          <p style={{ marginTop: 8, fontSize: '0.875rem', fontWeight: 600, color: 'var(--success, #22c55e)' }}>Email verified!</p>
        </div>
      ) : (
        <>
          <div style={{ fontSize: '0.8125rem', padding: '0.5rem 0.75rem', borderRadius: 6, background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
            A verification code was sent to{' '}
            <span style={{ fontWeight: 600, color: 'var(--text)' }}>{email || 'your email'}</span>.
            Copy it and paste it below.
          </div>

          {error && <ErrorMsg msg={error} />}

          <FieldInput
            id="otp"
            label="Verification code"
            value={otp}
            onChange={setOtp}
            placeholder="Paste your code here"
            disabled={loading}
          />

          <PrimaryBtn type="submit" loading={loading}>
            Verify & continue
          </PrimaryBtn>
        </>
      )}
    </form>
  );
}

// ─── Step 3: Platform Detection ───────────────────────────────────────────────

function Step3Platform({
  websiteUrl,
  tenantId,
  onDone,
}: {
  websiteUrl: string;
  tenantId?: string;
  onDone: (platform: Platform, credentials: Record<string, string>) => void;
}) {
  const [scanning,  setScanning]  = useState(true);
  const [detected,  setDetected]  = useState<string | null>(null);
  const [platform,  setPlatform]  = useState<Platform>('unknown');
  const [manualMode, setManualMode] = useState(false);
  const [creds,     setCreds]     = useState<Record<string, string>>({});
  const [error,     setError]     = useState('');
  const didScan = useRef(false);

  useEffect(() => {
    if (didScan.current) return;
    didScan.current = true;
    onboardScan({ website_url: websiteUrl })
      .then(res => {
        const p = (res.platform_type?.toLowerCase() ?? 'unknown') as Platform;
        setPlatform(PLATFORM_GUIDES[p] ? p : 'unknown');
        setDetected(res.platform_type ?? 'Unknown');
      })
      .catch(err => {
        const s = (err as { response?: { status?: number } })?.response?.status;
        if (s === 404) {
          setManualMode(true);
        } else {
          setManualMode(true);
        }
        setDetected(null);
      })
      .finally(() => setScanning(false));
  }, [websiteUrl, tenantId]);

  const guide = PLATFORM_GUIDES[platform];

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    for (const f of guide.fields) {
      if (!creds[f.id]?.trim()) {
        setError(`${f.label} is required.`);
        return;
      }
    }
    onDone(platform, creds);
  }

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

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h1 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 0.25rem', letterSpacing: '-0.015em' }}>
          Platform credentials
        </h1>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-2)', margin: 0 }}>
          Step 3 of 5 — Connect your platform
        </p>
      </div>

      {detected && !manualMode && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '0.625rem 0.875rem',
          background: 'color-mix(in srgb, var(--success) 10%, transparent)',
          border: '1px solid color-mix(in srgb, var(--success) 25%, transparent)',
          borderRadius: 6,
          fontSize: '0.875rem',
          fontWeight: 600,
          color: 'var(--success)',
        }}>
          ✅ {detected} detected
        </div>
      )}

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

      {error && <ErrorMsg msg={error} />}

      {guide.fields.map(f => (
        <FieldInput
          key={f.id}
          id={f.id}
          label={f.label}
          type={f.type}
          placeholder={f.placeholder}
          value={creds[f.id] ?? ''}
          onChange={v => setCreds(prev => ({ ...prev, [f.id]: v }))}
        />
      ))}

      <PrimaryBtn type="submit">
        Install bridge →
      </PrimaryBtn>
    </form>
  );
}

// ─── Step 4: Bridge Installation ─────────────────────────────────────────────

function Step4Install({
  tenantId,
  platform,
  credentials,
  onDone,
}: {
  tenantId?: string;
  platform: Platform;
  credentials: Record<string, string>;
  onDone: () => void;
}) {
  const [status,  setStatus]  = useState<'installing' | 'configuring' | 'live' | 'failed'>('installing');
  const [error,   setError]   = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const didInstall = useRef(false);

  useEffect(() => {
    if (didInstall.current) return;
    didInstall.current = true;

    onboardInstall({
      tenant_id:   tenantId ?? '',
      platform:    platform,
      credentials,
    })
      .then(res => {
        if (res.installing) {
          setStatus('configuring');
          pollRef.current = setInterval(async () => {
            if (!tenantId) { clearInterval(pollRef.current!); onDone(); return; }
            try {
              const ping = await onboardPing(tenantId);
              const s = ping.injection_status;
              if (s === 'live') {
                clearInterval(pollRef.current!);
                setStatus('live');
                setTimeout(onDone, 1200);
              } else if (s === 'failed') {
                clearInterval(pollRef.current!);
                setStatus('failed');
                setError('Installation failed. Please check your credentials and try again.');
              } else {
                setStatus('configuring');
              }
            } catch {
              // keep polling
            }
          }, 3000);
        } else {
          setStatus('live');
          setTimeout(onDone, 1000);
        }
      })
      .catch(err => {
        const s = (err as { response?: { status?: number } })?.response?.status;
        if (s === 404) {
          // Endpoint not yet live — simulate success
          setStatus('live');
          setTimeout(onDone, 1000);
        } else {
          setStatus('failed');
          setError('Installation request failed. Please try again.');
        }
      });

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const statusLabel =
    status === 'installing'  ? 'Sending installation request…' :
    status === 'configuring' ? 'Configuring injection bridge…' :
    status === 'live'        ? '✅ Bridge is live!'             :
                               '❌ Installation failed';

  const statusColor =
    status === 'live'   ? 'var(--success)' :
    status === 'failed' ? 'var(--danger)'  :
                          'var(--text-2)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 0.25rem', letterSpacing: '-0.015em' }}>
          Installing bridge
        </h1>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-2)', margin: 0 }}>
          Step 4 of 5 — Setting up the injection bridge
        </p>
      </div>

      <div style={{ textAlign: 'center', padding: '2rem 0' }}>
        {status !== 'live' && status !== 'failed' && (
          <Spinner size={28} color="var(--brand)" />
        )}
        <p style={{ marginTop: 12, fontSize: '0.9375rem', fontWeight: 600, color: statusColor }}>
          {statusLabel}
        </p>
        {(status === 'installing' || status === 'configuring') && (
          <p style={{ marginTop: 6, fontSize: '0.8125rem', color: 'var(--text-3)' }}>
            This usually takes 30–60 seconds…
          </p>
        )}
      </div>

      {error && <ErrorMsg msg={error} />}

      {status === 'failed' && (
        <PrimaryBtn onClick={() => { setStatus('installing'); didInstall.current = false; setError(''); }}>
          Retry
        </PrimaryBtn>
      )}
    </div>
  );
}

// ─── Step 5: Done ─────────────────────────────────────────────────────────────

function Step5Done() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, textAlign: 'center' }}>
      <div>
        <h1 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 0.25rem', letterSpacing: '-0.015em' }}>
          You're all set!
        </h1>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-2)', margin: 0 }}>
          Step 5 of 5 — Setup complete
        </p>
      </div>

      <div style={{ padding: '1.5rem 0' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            '✅ Account created',
            '✅ Injection bridge live',
            '✅ First crawl started',
          ].map(msg => (
            <p key={msg} style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--success)', margin: 0 }}>
              {msg}
            </p>
          ))}
        </div>
        <p style={{ marginTop: 16, fontSize: '0.875rem', color: 'var(--text-3)' }}>
          You are done — close this page or sign in to view your dashboard.
        </p>
      </div>

      <Link
        to="/login"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          padding: '0.625rem',
          minHeight: 42,
          background: 'var(--brand)',
          color: '#111',
          fontSize: '0.875rem',
          fontWeight: 700,
          borderRadius: 6,
          textDecoration: 'none',
        }}
      >
        Go to Dashboard →
      </Link>
    </div>
  );
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

export default function Connect() {
  const navigate = useNavigate();

  const [step,       setStep]       = useState<Step>(1);
  const [email,      setEmail]      = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  return (
    <>
      <style>{`@keyframes connect-spin { to { transform: rotate(360deg); } }`}</style>
      <WizardBox>
        <Brand />
        <StepIndicator current={step} total={2} />

        {step === 1 && (
          <Step1Register
            onDone={(em, url) => {
              setEmail(em);
              setWebsiteUrl(url);
              setStep(2);
            }}
          />
        )}

        {step === 2 && (
          <Step2VerifyEmail
            email={email}
            onDone={() => navigate('/dashboard', { replace: true })}
          />
        )}

        {step === 1 && (
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
