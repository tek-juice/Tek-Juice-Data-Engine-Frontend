import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle2, Copy, KeyRound, Loader2, RefreshCw, Server, ShieldCheck,
} from 'lucide-react';
import { getWebsiteStatus, type WebsiteStatus } from '../../api/websites';
import { getVisibilityConnection } from '../../api/dashboard';
import {
  createOwnershipChallenge,
  issueConnectorCredential,
  reverifyPublication,
  revokeConnectorCredential,
  verifyOwnershipChallenge,
  type OwnershipChallenge,
} from '../../api/connector';
import type { PublicationReadiness } from '../../types';
import { deriveConnectionState, type ConnectionState } from '../../utils/connectionState';
import { apiErrorMessage, apiErrorStatus } from '../../utils/apiError';
import { isAdmin } from '../../services/auth.service';
import { API_BASE_URL } from '../../config';

const POLL_MS = 5000;
const IN_FLIGHT = new Set(['backend_pending', 'connector_authenticated', 'verifying']);

const card = { background: 'var(--surface)', border: '1px solid var(--border)' };
const button =
  'inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded transition-opacity disabled:opacity-40';

function Notice({ tone, children }: { tone: 'danger' | 'success' | 'neutral'; children: React.ReactNode }) {
  const color = tone === 'danger' ? 'var(--danger)' : tone === 'success' ? 'var(--success)' : 'var(--text-2)';
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className="flex items-start gap-2 px-3 py-2.5 rounded text-xs"
      style={{ border: '1px solid var(--border)', color }}>
      {tone === 'danger' ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}
      <span>{children}</span>
    </div>
  );
}

function CopyBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>{label}</span>
        <button type="button" className="text-xs inline-flex items-center gap-1" style={{ color: 'var(--text-3)' }}
          onClick={() => {
            void navigator.clipboard?.writeText(value).then(() => setCopied(true)).catch(() => setCopied(false));
          }}>
          <Copy size={11} /> {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="text-xs p-3 rounded overflow-x-auto whitespace-pre-wrap break-all"
        style={{ background: 'var(--surface-2)', color: 'var(--text)' }}>{value}</pre>
    </div>
  );
}

function StepHeader({ n, title, active, done }: { n: number; title: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
        style={{ background: done ? 'var(--success)' : active ? 'var(--brand)' : 'var(--surface-2)', color: '#111' }}>
        {done ? '✓' : n}
      </span>
      <h2 className="text-sm font-semibold" style={{ color: active || done ? 'var(--text)' : 'var(--text-3)' }}>
        {title}
      </h2>
    </div>
  );
}

export default function WebsiteSetup() {
  const { websiteId = '' } = useParams();
  const admin = isAdmin();

  const [website, setWebsite] = useState<WebsiteStatus | null>(null);
  const [publication, setPublication] = useState<PublicationReadiness | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  // The connector key exists only in this component's memory.
  const [connectorKey, setConnectorKey] = useState<string | null>(null);
  const [keyError, setKeyError] = useState('');
  const [keyConflict, setKeyConflict] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const [method, setMethod] = useState<OwnershipChallenge['method']>('dns_txt');
  const [challenge, setChallenge] = useState<OwnershipChallenge | null>(null);
  const [ownershipError, setOwnershipError] = useState('');

  const [busy, setBusy] = useState('');
  const [actionNotice, setActionNotice] = useState('');
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const [status, connection] = await Promise.all([
        getWebsiteStatus(websiteId),
        getVisibilityConnection(websiteId),
      ]);
      if (!mounted.current) return;
      setWebsite(status);
      setPublication(connection.publication ?? null);
      setLoadError('');
    } catch (error) {
      if (!mounted.current) return;
      setLoadError(
        apiErrorStatus(error) === 404
          ? 'This website was not found for your account.'
          : apiErrorMessage(error, 'Unable to load the connection status.'),
      );
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [websiteId]);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => {
      mounted.current = false;
    };
  }, [refresh]);

  const state: ConnectionState = deriveConnectionState(website?.onboarding_status, publication);

  // Poll while the backend is connecting or verifying.
  useEffect(() => {
    if (!IN_FLIGHT.has(state.id)) return;
    const timer = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [state.id, refresh]);

  async function run(label: string, action: () => Promise<void>) {
    setBusy(label);
    setActionNotice('');
    try {
      await action();
    } finally {
      if (mounted.current) setBusy('');
    }
  }

  const issueKey = () =>
    run('issue', async () => {
      setKeyError('');
      setKeyConflict(false);
      try {
        const issued = await issueConnectorCredential(websiteId);
        setConnectorKey(issued.key);
        await refresh();
      } catch (error) {
        if (apiErrorStatus(error) === 409) setKeyConflict(true);
        setKeyError(apiErrorMessage(error, 'Could not create a connector key.'));
      }
    });

  const revokeAndReissue = () =>
    run('revoke', async () => {
      try {
        await revokeConnectorCredential(websiteId);
        setConfirmRevoke(false);
        setKeyConflict(false);
        const issued = await issueConnectorCredential(websiteId);
        setConnectorKey(issued.key);
        setKeyError('');
        await refresh();
      } catch (error) {
        setKeyError(apiErrorMessage(error, 'Could not replace the connector key.'));
      }
    });

  const startChallenge = () =>
    run('challenge', async () => {
      setOwnershipError('');
      try {
        setChallenge(await createOwnershipChallenge(websiteId, method));
      } catch (error) {
        setOwnershipError(apiErrorMessage(error, 'Could not start ownership verification.'));
      }
    });

  const verifyChallenge = () =>
    run('verify', async () => {
      if (!challenge) return;
      setOwnershipError('');
      try {
        await verifyOwnershipChallenge(websiteId, challenge.challenge_id);
        setChallenge(null);
        await refresh();
      } catch (error) {
        setOwnershipError(apiErrorMessage(error,
          'Ownership could not be verified yet. Check the record or file and try again.'));
      }
    });

  const reverify = () =>
    run('reverify', async () => {
      try {
        await reverifyPublication(websiteId);
        setActionNotice('Verification requested. This page updates automatically.');
        await refresh();
      } catch (error) {
        setActionNotice(apiErrorMessage(error, 'Could not request verification.'));
      }
    });

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center gap-2 text-sm" style={{ color: 'var(--text-3)' }}>
        <Loader2 size={15} className="animate-spin" /> Loading connection status…
      </div>
    );
  }

  if (loadError && !website) {
    return (
      <div className="min-h-full px-7 py-8 max-w-xl space-y-3">
        <Notice tone="danger">{loadError}</Notice>
        <button type="button" className={button} style={{ background: 'var(--surface-2)', color: 'var(--text)' }}
          onClick={() => { setLoading(true); void refresh(); }}>
          <RefreshCw size={12} /> Retry
        </button>
      </div>
    );
  }

  const step = state.setupStep;
  const engineUrl = API_BASE_URL || window.location.origin;

  return (
    <div className="min-h-full px-7 py-8" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <div className="max-w-2xl space-y-5">
        <div>
          <h1 className="text-base font-bold">Connect {website?.domain}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
            Content is published to your website only through a verified Tek Juice connector.
          </p>
        </div>

        <div className="p-4 rounded flex items-start justify-between gap-3" style={card} data-testid="connection-state">
          <div>
            <div className="text-sm font-semibold">{state.label}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{state.description}</div>
          </div>
          {IN_FLIGHT.has(state.id) && <Loader2 size={14} className="animate-spin" aria-label="Checking" />}
        </div>

        {loadError && <Notice tone="danger">{loadError}</Notice>}
        {!admin && step !== null && (
          <Notice tone="neutral">An administrator must complete these steps.</Notice>
        )}

        {/* Step 1 — connector key */}
        <section className="p-5 rounded" style={card}>
          <StepHeader n={1} title="Create a connector key" active={step === 1} done={step !== null && step > 1 || state.publicationReady} />
          {connectorKey ? (
            <div className="space-y-3">
              <Notice tone="success">Copy these values to your backend now. The key is not shown again.</Notice>
              <CopyBlock
                label="Backend environment"
                value={[
                  `TEKJUICE_WEBSITE_ID=${websiteId}`,
                  `TEKJUICE_CONNECTOR_KEY=${connectorKey}`,
                  `TEKJUICE_DATA_ENGINE_URL=${engineUrl}`,
                ].join('\n')}
              />
              <button type="button" className={button} style={{ background: 'var(--surface-2)', color: 'var(--text)' }}
                onClick={() => setConnectorKey(null)}>
                I have saved the key
              </button>
            </div>
          ) : step === 1 ? (
            <div className="space-y-3">
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                The key identifies your backend to the Data Engine for this website only.
              </p>
              <button type="button" className={button} style={{ background: 'var(--brand)', color: '#111' }}
                disabled={!admin || busy !== ''} onClick={issueKey}>
                {busy === 'issue' ? <Loader2 size={12} className="animate-spin" /> : <KeyRound size={12} />}
                Generate connector key
              </button>
            </div>
          ) : (
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>A connector key has been issued for this website.</p>
          )}
          {keyError && <div className="mt-3"><Notice tone="danger">{keyError}</Notice></div>}
          {admin && (keyConflict || step !== 1) && !connectorKey && (
            <div className="mt-3 text-xs space-y-2">
              {confirmRevoke ? (
                <div className="flex items-center gap-2">
                  <span style={{ color: 'var(--danger)' }}>
                    Your backend stops authenticating until it uses the new key.
                  </span>
                  <button type="button" className={button} style={{ background: 'var(--danger)', color: '#fff' }}
                    disabled={busy !== ''} onClick={revokeAndReissue}>Replace key</button>
                  <button type="button" className={button} onClick={() => setConfirmRevoke(false)}>Cancel</button>
                </div>
              ) : (
                <button type="button" className="underline" style={{ color: 'var(--text-3)' }}
                  onClick={() => setConfirmRevoke(true)}>Lost the key? Replace it</button>
              )}
            </div>
          )}
        </section>

        {/* Step 2 — ownership */}
        <section className="p-5 rounded" style={card}>
          <StepHeader n={2} title="Verify domain ownership" active={step === 2} done={step === 3 || state.publicationReady} />
          {step === 2 && (
            <div className="space-y-3">
              {!challenge ? (
                <>
                  <fieldset className="flex gap-4 text-xs">
                    <legend className="sr-only">Verification method</legend>
                    <label className="flex items-center gap-1.5">
                      <input type="radio" name="method" checked={method === 'dns_txt'} onChange={() => setMethod('dns_txt')} />
                      DNS TXT record
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input type="radio" name="method" checked={method === 'https_file'} onChange={() => setMethod('https_file')} />
                      HTTPS file
                    </label>
                  </fieldset>
                  <button type="button" className={button} style={{ background: 'var(--brand)', color: '#111' }}
                    disabled={!admin || busy !== ''} onClick={startChallenge}>
                    {busy === 'challenge' ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                    Get verification instructions
                  </button>
                </>
              ) : (
                <>
                  {challenge.method === 'dns_txt' ? (
                    <>
                      <CopyBlock label="TXT record name" value={challenge.instructions.record_name ?? ''} />
                      <CopyBlock label="TXT record value" value={challenge.instructions.record_value ?? ''} />
                    </>
                  ) : (
                    <>
                      <CopyBlock label="Serve this file at" value={challenge.instructions.url ?? ''} />
                      <CopyBlock label="With exactly this content" value={challenge.instructions.file_contents ?? ''} />
                    </>
                  )}
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                    Expires {new Date(challenge.expires_at).toLocaleString()}.
                  </p>
                  <button type="button" className={button} style={{ background: 'var(--brand)', color: '#111' }}
                    disabled={busy !== ''} onClick={verifyChallenge}>
                    {busy === 'verify' && <Loader2 size={12} className="animate-spin" />}
                    Verify ownership
                  </button>
                </>
              )}
              {ownershipError && <Notice tone="danger">{ownershipError}</Notice>}
            </div>
          )}
        </section>

        {/* Step 3 — backend connection and publication verification */}
        <section className="p-5 rounded" style={card}>
          <StepHeader n={3} title="Connect your backend" active={step === 3} done={state.publicationReady} />
          {(step === 3 || state.publicationReady) && (
            <div className="space-y-3 text-xs">
              {!state.publicationReady && (
                <>
                  <p style={{ color: 'var(--text-3)' }}>
                    Install the connector on your backend and run its setup with the environment above.
                    Setup creates the receiver secret and the publication endpoint on your server,
                    registers them with the Data Engine and waits for verification: there is nothing
                    else to copy. If your framework does not declare its public API address, add
                    TEKJUICE_API_BASE_URL=https://&lt;your backend&apos;s API address&gt; first.
                  </p>
                  <CopyBlock label="Install and set up" value={'pip install "tekjuice-connector>=0.7.0"\ntekjuice setup --env-file .env'} />
                  <p style={{ color: 'var(--text-3)' }}>
                    Backend in another language (Node, PHP, Go, …)? Run the connector next to it as a
                    sidecar: <code>tekjuice serve</code>.
                  </p>
                </>
              )}
              {publication && publication.status !== 'not_configured' && (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1" data-testid="publication-details">
                  <dt style={{ color: 'var(--text-3)' }}>Receiver</dt>
                  <dd>{publication.endpoint_host ?? '—'}</dd>
                  <dt style={{ color: 'var(--text-3)' }}>Capabilities</dt>
                  <dd>{publication.capabilities.join(', ') || '—'}</dd>
                  <dt style={{ color: 'var(--text-3)' }}>Verified</dt>
                  <dd>{publication.verified_at ? new Date(publication.verified_at).toLocaleString() : '—'}</dd>
                </dl>
              )}
              {state.id === 'verification_failed' && admin && (
                <button type="button" className={button} style={{ background: 'var(--surface-2)', color: 'var(--text)' }}
                  disabled={busy !== ''} onClick={reverify}>
                  <RefreshCw size={12} /> Verify again
                </button>
              )}
              {actionNotice && <Notice tone="neutral">{actionNotice}</Notice>}
            </div>
          )}
        </section>

        {state.intelligenceReady && (
          <Link to="/visibility" className={button} style={{ background: 'var(--brand)', color: '#111' }}>
            <Server size={12} /> Go to dashboard
          </Link>
        )}
      </div>
    </div>
  );
}
