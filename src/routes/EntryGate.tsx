import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { listWebsites } from '../api/websites';

type EntryState = 'loading' | 'connect' | 'app' | 'error';

export default function EntryGate() {
  const [state, setState] = useState<EntryState>('loading');

  useEffect(() => {
    let mounted = true;

    async function resolveEntry() {
      try {
        const websites = await listWebsites();

        if (!mounted) return;

        setState(websites.length > 0 ? 'app' : 'connect');
      } catch (error) {
        console.error('Failed to resolve authenticated entry:', error);

        if (mounted) {
          setState('error');
        }
      }
    }

    void resolveEntry();

    return () => {
      mounted = false;
    };
  }, []);

  if (state === 'loading') {
    return (
      <div
        className="min-h-screen flex items-center justify-center gap-2 text-sm"
        style={{
          background: 'var(--bg)',
          color: 'var(--text-3)',
        }}
      >
        <Loader2 size={15} className="animate-spin" />
        Loading Data Engine…
      </div>
    );
  }

  if (state === 'connect') {
    return <Navigate to="/websites/connect" replace />;
  }

  if (state === 'app') {
    return <Navigate to="/visibility" replace />;
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-2 text-sm"
      style={{
        background: 'var(--bg)',
        color: 'var(--text-3)',
      }}
    >
      <div style={{ color: 'var(--text)' }}>
        Unable to load your Data Engine account.
      </div>

      <div className="text-xs">
        Please refresh and try again.
      </div>
    </div>
  );
}
