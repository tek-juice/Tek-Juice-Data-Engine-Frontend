import { useState, useEffect, useCallback, type ReactNode, type FormEvent, type InputHTMLAttributes } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Globe, CheckCircle2, Loader2, AlertTriangle,
  Mail, Key, ArrowRight, Zap, RefreshCw, ShieldCheck,
} from 'lucide-react';
import {
  onboardRegister,
  onboardVerifyEmail,
  onboardScan,
  onboardInstall,
  onboardPing,
} from '../../api/onboard';
import type {
  OnboardScanResponse,
  OnboardRegisterResponse,
  InjectionStatus,
} from '../../types';

// ── Step types ────────────────────────────────────────────────────────────────

type Step = 'register' | 'verify' | 'scan' | 'install' | 'done';

const STEPS: { key: Step; label: string }[] = [
  { key: 'register', label: 'Register' },
  { key: 'verify',   label: 'Verify email' },
  { key: 'scan',     label: 'Detect platform' },
  { key: 'install',  label: 'Install bridge' },
  { key: 'done',     label: 'Live' },
];

// ── Step progress bar ─────────────────────────────────────────────────────────

function StepBar({ current }: { current: Step }) {
  const idx = STEPS.findIndex(s => s.key === current);
  return (
    <div className="flex items-center mb-8">
      {STEPS.map((s, i) => (
        <div key={s.key} className="flex items-center">
          <div
            className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-mono border transition-colors"
            style={{
              background: i < idx ? 'var(--brand)' : i === idx ? 'var(--text)' : 'transparent',
              borderColor: i < idx ? 'var(--brand)' : i === idx ? 'var(--text)' : 'var(--border)',
              color: i <= idx ? 'var(--bg)' : 'var(--text-3)',
            }}
          >
            {i < idx ? <CheckCircle2 size={12} /> : i + 1}
          </div>
          <span
            className="ml-1.5 text-xs hidden sm:inline"
            style={{ color: i === idx ? 'var(--text)' : i < idx ? 'var(--brand)' : 'var(--text-3)' }}
          >
            {s.label}
          </span>
          {i < STEPS.length - 1 && (
            <div
              className="mx-2 h-px w-6 sm:w-8"
              style={{ background: i < idx ? 'var(--brand)' : 'var(--border)' }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Shared form primitives ────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-2)' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full text-sm px-3 py-2.5 rounded-md outline-none transition-colors"
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        color: 'var(--text)',
        ...(props.style ?? {}),
      }}
      onFocus={e => { e.currentTarget.style.borderColor = 'var(--brand)'; }}
      onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
    />
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div
      className="flex items-start gap-2 px-3 py-2.5 rounded-md text-xs"
      style={{ background: 'var(--danger-bg, #2d1212)', border: '1px solid var(--danger)', color: 'var(--danger)' }}
    >
      <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
      <span>{msg}</span>
    </div>
  );
}

function SubmitBtn({ loading, label, loadingLabel }: { loading: boolean; label: string; loadingLabel: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors disabled:opacity-40"
      style={{ background: 'var(--brand)', color: '#111' }}
    >
      {loading
        ? <><Loader2 size={13} className="animate-spin" />{loadingLabel}</>
        : <><ArrowRight size={13} />{label}</>
      }
    </button>
  );
}

// ── Step 1: Register ──────────────────────────────────────────────────────────

function StepRegister({ onDone }: { onDone: (result: OnboardRegisterResponse, url: string, email: string) => void }) {
  const [productName, setProductName] = useState('');
  const [email, setEmail]             = useState('');
  const [website, setWebsite]         = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!productName.trim()) { setError('Company name is required.'); return; }
    if (!email.trim())       { setError('Email address is required.'); return; }
    if (!website.trim())     { setError('Website URL is required.'); return; }
    try { new URL(website.trim()); } catch { setError('Enter a valid URL including https://'); return; }

    setLoading(true);
    try {
      const result = await onboardRegister({
        product_name: productName.trim(),
        email: email.trim(),
        website_url: website.trim(),
      });
      onDone(result, website.trim(), email.trim());
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 flex items-center justify-center rounded flex-shrink-0" style={{ background: 'var(--brand)' }}>
          <Zap size={14} style={{ color: '#111' }} />
        </div>
        <div>
          <h2 className="text-sm font-bold" style={{ color: 'var(--text)' }}>Connect your product</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>Fill in 3 fields. The Engine does everything else.</p>
        </div>
      </div>
      {error && <ErrorBox msg={error} />}
      <Field label="Company name">
        <Input value={productName} onChange={e => setProductName(e.target.value)} placeholder="Acme Corp" autoFocus />
      </Field>
      <Field label="Website URL">
        <Input type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://yourproduct.com" />
      </Field>
      <Field label="Email address">
        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" />
      </Field>
      <SubmitBtn loading={loading} label="Connect" loadingLabel="Connecting…" />
    </form>
  );
}

// ── Step 2: Verify email ──────────────────────────────────────────────────────

function StepVerifyEmail({ email, onDone }: { email: string; onDone: () => void }) {
  const [params] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function submitToken(t: string) {
    setLoading(true); setError('');
    try {
      await onboardVerifyEmail({ token: t.trim() });
      onDone();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? 'Invalid or expired link. Check your email and click the link again.';
      setError(msg);
      setLoading(false);
    }
  }

  // Auto-advance when the email link brings them back with ?token=
  useEffect(() => {
    const urlToken = params.get('token');
    if (urlToken) { void submitToken(urlToken); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 flex items-center justify-center rounded flex-shrink-0" style={{ background: 'var(--brand)' }}>
          <Mail size={14} style={{ color: '#111' }} />
        </div>
        <div>
          <h2 className="text-sm font-bold" style={{ color: 'var(--text)' }}>Check your inbox</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>We sent a verification link to your email.</p>
        </div>
      </div>
      <div
        className="px-4 py-4 rounded text-sm leading-relaxed"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}
      >
        A verification link has been sent to{' '}
        <span className="font-semibold" style={{ color: 'var(--text)' }}>{email}</span>.
        <br /><br />
        Open your email and click the link to continue. This page will advance automatically.
      </div>
      {loading && (
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-3)' }}>
          <Loader2 size={12} className="animate-spin" /> Verifying…
        </div>
      )}
      {error && <ErrorBox msg={error} />}
    </div>
  );
}

// ── Step 3: Scan platform ─────────────────────────────────────────────────────

function StepScanPlatform({ websiteUrl, onDone }: { websiteUrl: string; onDone: (scan: OnboardScanResponse) => void }) {
  const [url, setUrl]         = useState(websiteUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function handleScan(target: string) {
    if (!target.trim()) { setError('Enter your website URL.'); return; }
    try { new URL(target.trim()); } catch { setError('Enter a valid URL including https://'); return; }
    setLoading(true); setError('');
    try {
      const result = await onboardScan({ website_url: target.trim() });
      onDone(result);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? 'Platform detection failed. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (websiteUrl) { void handleScan(websiteUrl); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await handleScan(url);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 flex items-center justify-center rounded flex-shrink-0" style={{ background: 'var(--brand)' }}>
          <Globe size={14} style={{ color: '#111' }} />
        </div>
        <div>
          <h2 className="text-sm font-bold" style={{ color: 'var(--text)' }}>Detect your platform</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>We'll identify WordPress, Shopify, and others automatically.</p>
        </div>
      </div>
      {error && <ErrorBox msg={error} />}
      {loading && (
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-3)' }}>
          <Loader2 size={12} className="animate-spin" /> Scanning {url}…
        </div>
      )}
      <Field label="Website URL">
        <Input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://yourproduct.com" />
      </Field>
      <SubmitBtn loading={loading} label="Scan platform" loadingLabel="Scanning…" />
    </form>
  );
}

// ── Step 4: Install bridge ────────────────────────────────────────────────────

function StepInstall({ tenantId, scan, onDone }: { tenantId: string; scan: OnboardScanResponse; onDone: () => void }) {
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [injectionStatus, setInjectionStatus] = useState<InjectionStatus | null>(null);

  const credFields = scan.credential_guide
    .split(/\n|,|;/)
    .map(l => l.replace(/[^a-zA-Z0-9_\s]/g, '').trim())
    .filter(l => l.length > 2 && l.length < 60);

  function setField(key: string, value: string) {
    setCredentials(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(''); setInjectionStatus(null);
    setLoading(true);
    try {
      await onboardInstall({ tenant_id: tenantId, platform: scan.platform_type, credentials });
      let attempts = 0;
      const poll = async (): Promise<void> => {
        if (attempts >= 40) {
          setError('Install timed out. Check your credentials and try again.');
          setLoading(false);
          return;
        }
        attempts++;
        const ping = await onboardPing(tenantId);
        setInjectionStatus(ping.injection_status);
        if (ping.injection_status === 'live') {
          setLoading(false);
          onDone();
        } else if (ping.injection_status === 'failed') {
          setLoading(false);
          setError(ping.message ?? 'Bridge installation failed. Verify your credentials.');
        } else {
          setTimeout(() => void poll(), 3000);
        }
      };
      await poll();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        ?? 'Install failed. Check your credentials and try again.';
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 flex items-center justify-center rounded flex-shrink-0" style={{ background: 'var(--brand)' }}>
          <Key size={14} style={{ color: '#111' }} />
        </div>
        <div>
          <h2 className="text-sm font-bold" style={{ color: 'var(--text)' }}>Install injection bridge</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
            Platform: <span style={{ color: 'var(--text)' }} className="font-mono">{scan.platform_type}</span>
          </p>
        </div>
      </div>
      <div
        className="px-4 py-3 rounded text-xs leading-relaxed whitespace-pre-wrap"
        style={{ background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
      >
        {scan.credential_guide}
      </div>
      {error && <ErrorBox msg={error} />}
      {injectionStatus === 'configuring' && (
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-3)' }}>
          <Loader2 size={12} className="animate-spin" /> Configuring injection bridge…
        </div>
      )}
      {credFields.length > 0
        ? credFields.map(field => (
            <Field key={field} label={field}>
              <Input value={credentials[field] ?? ''} onChange={e => setField(field, e.target.value)} placeholder={`Enter ${field}`} />
            </Field>
          ))
        : (
          <div className="text-xs px-3 py-2 rounded" style={{ background: 'var(--surface-2)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
            No credentials required — bridge will be installed automatically.
          </div>
        )
      }
      <SubmitBtn loading={loading} label="Install bridge" loadingLabel="Installing…" />
    </form>
  );
}

// ── Step 5: Done ──────────────────────────────────────────────────────────────

function StepDone({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 flex items-center justify-center rounded flex-shrink-0" style={{ background: 'var(--brand)' }}>
          <ShieldCheck size={14} style={{ color: '#111' }} />
        </div>
        <div>
          <h2 className="text-sm font-bold" style={{ color: 'var(--text)' }}>You are done — forever.</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>The Engine takes it from here.</p>
        </div>
      </div>
      <div className="space-y-2">
        {[
          '✅ Connected.',
          '✅ Injection bridge live.',
          '✅ First crawl started.',
        ].map(line => (
          <div key={line} className="px-4 py-2.5 text-sm font-medium rounded"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            {line}
          </div>
        ))}
      </div>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
        The Data Engine is now crawling your website, detecting every content gap, writing AI-optimised content, and publishing it directly into your site — automatically, every 24 hours, forever.
        <br /><br />
        <span className="font-semibold" style={{ color: 'var(--text)' }}>Your job is done. You can close this page.</span>
      </p>
      <button
        onClick={onNavigate}
        className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-colors"
        style={{ background: 'var(--brand)', color: '#111' }}
      >
        <ArrowRight size={13} /> View Dashboard
      </button>
    </div>
  );
}

// ── Main Onboarding page ──────────────────────────────────────────────────────

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep]               = useState<Step>('register');
  const [tenantId, setTenantId]       = useState('');
  const [email, setEmail]             = useState('');
  const [websiteUrl, setWebsiteUrl]   = useState('');
  const [scan, setScan]               = useState<OnboardScanResponse | null>(null);

  const handleRegisterDone = useCallback((result: OnboardRegisterResponse, url: string, registeredEmail: string) => {
    setTenantId(result.tenant_id);
    setWebsiteUrl(url);
    setEmail(registeredEmail);
    setStep('verify');
  }, []);

  const handleVerifyDone  = useCallback(() => setStep('scan'),    []);
  const handleScanDone    = useCallback((s: OnboardScanResponse) => { setScan(s); setStep('install'); }, []);
  const handleInstallDone = useCallback(() => setStep('done'),    []);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
      <div className="w-full max-w-lg">

        {/* Brand */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-7 h-7 flex items-center justify-center rounded" style={{ background: 'var(--brand)' }}>
            <RefreshCw size={13} style={{ color: '#111' }} />
          </div>
          <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>Data Engine</span>
          <span className="text-sm" style={{ color: 'var(--text-3)' }}>/</span>
          <span className="text-sm" style={{ color: 'var(--text-2)' }}>Connect</span>
        </div>

        <StepBar current={step} />

        <div
          className="p-6 rounded-lg"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          {step === 'register' && <StepRegister onDone={handleRegisterDone} />}
          {step === 'verify'   && <StepVerifyEmail email={email} onDone={handleVerifyDone} />}
          {step === 'scan'     && <StepScanPlatform websiteUrl={websiteUrl} onDone={handleScanDone} />}
          {step === 'install'  && scan && <StepInstall tenantId={tenantId} scan={scan} onDone={handleInstallDone} />}
          {step === 'done'     && <StepDone onNavigate={() => navigate('/dashboard', { replace: true })} />}
        </div>

      </div>
    </div>
  );
}
