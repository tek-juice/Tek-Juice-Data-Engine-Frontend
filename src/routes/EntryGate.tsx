import { Navigate } from 'react-router-dom';
import { Loader2, RefreshCw } from 'lucide-react';
import { useIntelligenceRun } from '../contexts/IntelligenceRunContext';

/**
 * Authenticated entry point.
 *
 * - No website yet  -> register one.
 * - Any website     -> the dashboard. When the selected website is not
 *   connected or not publication-ready, the shell's status banner says what
 *   is wrong and links to its connection setup; the interface (and the
 *   other websites) stay reachable.
 *
 * Decided from the backend's onboarding_status, never from browser state.
 */
export default function EntryGate() {
  const { website, websites, loading, error, refreshRuns } = useIntelligenceRun();

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center gap-2 text-sm"
        style={{ background: 'var(--bg)', color: 'var(--text-3)' }}
      >
        <Loader2 size={15} className="animate-spin" />
        Loading Data Engine…
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-3 text-sm"
        style={{ background: 'var(--bg)', color: 'var(--text-3)' }}
      >
        <div role="alert" style={{ color: 'var(--text)' }}>
          Unable to load your Data Engine account.
        </div>
        <button
          type="button"
          onClick={() => void refreshRuns()}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold rounded"
          style={{ background: 'var(--surface-2)', color: 'var(--text)' }}
        >
          <RefreshCw size={12} /> Try again
        </button>
      </div>
    );
  }

  if (!websites.length || !website) {
    return <Navigate to="/websites/connect" replace />;
  }

  return <Navigate to="/visibility" replace />;
}
