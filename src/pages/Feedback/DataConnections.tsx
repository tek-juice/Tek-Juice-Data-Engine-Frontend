import { useCallback, useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import {
  connectBing, connectGoogleServiceAccount, disconnectConnection, getConnectionProperties, getConnections,
  setConnectionProperty, startGoogleConnection, type ConnectionsState, type DataConnection,
} from '../../api/dashboard';
import { apiErrorMessage } from '../../utils/apiError';

const NAMES: Record<string, string> = {
  google_search_console: 'Google Search Console',
  google_analytics: 'Google Analytics 4',
  bing_webmaster: 'Bing Webmaster Tools',
};

export function connectionLabel(c: DataConnection): string {
  switch (c.status) {
    case 'connected': return `Connected: ${c.property}${c.last_sync_at ? ` (synced ${new Date(c.last_sync_at).toLocaleDateString()})` : ''}`;
    case 'needs_property': return 'Authorized: choose a property';
    case 'error': return `Needs reconnecting${c.last_error ? `: ${c.last_error}` : ''}`;
    case 'revoked': return 'Disconnected';
    default: return 'Not connected';
  }
}

export default function DataConnections({ websiteId }: { websiteId: string }) {
  const [state, setState] = useState<ConnectionsState | null>(null);
  const [checking, setChecking] = useState(false);
  const [options, setOptions] = useState<Record<string, { property: string; name?: string }[]>>({});
  const [message, setMessage] = useState('');
  const [bing, setBing] = useState({ key: '', site: '' });

  const load = useCallback(() => {
    getConnections(websiteId).then(setState).catch(() => setMessage('Unable to load data connections.'));
  }, [websiteId]);

  useEffect(() => {
    load();
    const result = new URLSearchParams(window.location.search).get('google');
    if (result) setMessage(result === 'connected' ? 'Google access granted. Choose the properties below.'
      : 'Google access was not granted.');
  }, [load]);

  const fail = (err: unknown) => setMessage(isAxiosError(err) && err.response?.status === 403
    ? 'Only admins can change data connections.' : 'The request failed.');

  const connect = async () => {
    try {
      window.location.assign(await startGoogleConnection(websiteId, window.location.href.split('?')[0]));
    } catch (err) { fail(err); }
  };

  const checkServiceAccount = async () => {
    setChecking(true);
    try {
      const result = await connectGoogleServiceAccount(websiteId);
      const missing = result.not_connected.map((m) => m.reason).join(' ');
      setMessage(`Connected. The first sync (up to 16 months of history) has started.${missing ? ` ${missing}` : ''}`);
      load();
    } catch (err) {
      setMessage(apiErrorMessage(err, 'The access check failed.'));
    } finally {
      setChecking(false);
    }
  };

  const loadOptions = async (provider: string) => {
    try { setOptions({ ...options, [provider]: await getConnectionProperties(websiteId, provider) }); } catch (err) { fail(err); }
  };

  if (!state) return <div className="card"><div className="muted">{message || 'Loading data connections…'}</div></div>;

  return (
    <div className="card">
      <div className="section-header">
        <div>
          <div className="eyebrow">First-party data</div>
          <h2>Data connections</h2>
        </div>
        {state.google_configured && (
          <button className="button" onClick={() => void connect()}>Connect Google</button>
        )}
      </div>
      <p className="muted">
        Search Console provides clicks, impressions, positions and Google's index status for published pages;
        GA4 provides organic sessions and conversions. Access is granted on Google's own consent screen and can
        be removed at any time.
      </p>
      {state.google_service_account && (
        <div className="card" style={{ background: 'transparent' }}>
          <strong>Connect without signing in to Google</strong>
          <ol className="muted" style={{ margin: '8px 0', paddingLeft: 20 }}>
            <li>Search Console → Settings → Users and permissions → Add user:{' '}
              <code style={{ userSelect: 'all' }}>{state.google_service_account}</code> (Restricted access is enough).</li>
            <li>Optional, for conversions: Google Analytics → Admin → Property access management → add the same
              email as Viewer.</li>
            <li>Check access below. Only properties for this website's own domain can be connected.</li>
          </ol>
          <button className="button" disabled={checking} onClick={() => void checkServiceAccount()}>
            {checking ? 'Checking access…' : 'Check access and connect'}
          </button>
        </div>
      )}
      {!state.google_configured && !state.google_service_account && (
        <p className="muted">Google connections are not configured on this Data Engine instance yet.</p>
      )}
      <div className="detail-grid">
        {state.connections.map((c) => (
          <div key={c.provider}>
            <div className="muted">{NAMES[c.provider] ?? c.provider}</div>
            <strong>{connectionLabel(c)}</strong>
            {c.provider === 'bing_webmaster' && c.status !== 'connected' && (
              <div style={{ display: 'grid', gap: 4 }}>
                <input placeholder="Bing API key" type="password" value={bing.key}
                  onChange={(e) => setBing({ ...bing, key: e.target.value })} />
                <input placeholder="Verified site URL (https://...)" value={bing.site}
                  onChange={(e) => setBing({ ...bing, site: e.target.value })} />
                <button className="button secondary" onClick={() => void connectBing(websiteId, bing.key, bing.site)
                  .then(() => { setBing({ key: '', site: '' }); load(); })
                  .catch((err) => setMessage(apiErrorMessage(err, 'The request failed.')))}>
                  Connect Bing
                </button>
              </div>
            )}
            {c.status === 'needs_property' && (
              options[c.provider] ? (
                <select defaultValue="" onChange={(e) => {
                  void setConnectionProperty(websiteId, c.provider, e.target.value).then(load).catch(fail);
                }}>
                  <option value="" disabled>Choose…</option>
                  {options[c.provider].map((o) => <option key={o.property} value={o.property}>{o.name ? `${o.name} (${o.property})` : o.property}</option>)}
                </select>
              ) : (
                <div><button className="button secondary" onClick={() => void loadOptions(c.provider)}>Choose property</button></div>
              )
            )}
            {['connected', 'needs_property', 'error'].includes(c.status) && (
              <div>
                <button className="button secondary" onClick={() => void disconnectConnection(websiteId, c.provider).then(load).catch(fail)}>
                  Disconnect
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      {message && <p className="muted">{message}</p>}
    </div>
  );
}
