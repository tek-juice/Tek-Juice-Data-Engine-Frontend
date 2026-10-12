import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { getVisibilityConnection } from '../../api/dashboard';
import { useIntelligenceRun } from '../../contexts/IntelligenceRunContext';
import { deriveConnectionState, type ConnectionState } from '../../utils/connectionState';
import type { PublicationReadiness } from '../../types';

/**
 * Shows the selected website's verified connection state when publication is
 * not ready, with a link to the setup flow. Hidden once publication-ready.
 */
export default function PublicationStatusBanner() {
  const { website } = useIntelligenceRun();
  const [state, setState] = useState<ConnectionState | null>(null);

  useEffect(() => {
    let active = true;
    setState(null);
    if (!website) return;
    getVisibilityConnection(website.id)
      .then(connection => {
        if (!active) return;
        setState(deriveConnectionState(
          connection.onboarding_status ?? website.onboarding_status,
          (connection.publication ?? null) as PublicationReadiness | null,
        ));
      })
      .catch(() => {
        if (active) setState(deriveConnectionState(website.onboarding_status, null));
      });
    return () => {
      active = false;
    };
  }, [website]);

  if (!website || !state || state.publicationReady) return null;

  const color = state.tone === 'danger' ? 'var(--danger)' : 'var(--text-2)';
  return (
    <div role="status" data-testid="publication-banner"
      className="flex items-center justify-between gap-3 px-7 py-2.5 text-xs"
      style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)', color }}>
      <span className="flex items-center gap-2">
        {state.tone === 'progress' ? <Loader2 size={12} className="animate-spin" /> : <AlertTriangle size={12} />}
        <strong>{state.label}.</strong> {state.description}
      </span>
      <Link to={`/websites/${website.id}/setup`} className="font-bold underline" style={{ color: 'var(--text)' }}>
        Open connection setup
      </Link>
    </div>
  );
}
