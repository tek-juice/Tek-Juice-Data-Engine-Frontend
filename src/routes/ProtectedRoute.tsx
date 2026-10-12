import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { loadSession } from '../services/auth.service';
import { getSessionUser, isSessionKnown, subscribeSession } from '../services/session';

/**
 * Renders the app only for a signed-in session. The session is resolved from
 * the server (httpOnly cookie), so a reload keeps the user signed in and a
 * revoked or expired cookie signs them out.
 */
export default function ProtectedRoute() {
  const [state, setState] = useState<'loading' | 'in' | 'out'>(
    isSessionKnown() ? (getSessionUser() ? 'in' : 'out') : 'loading',
  );

  useEffect(() => {
    let active = true;
    if (!isSessionKnown()) {
      void loadSession().then(user => {
        if (active) setState(user ? 'in' : 'out');
      });
    }
    const unsubscribe = subscribeSession(user => {
      if (active) setState(user ? 'in' : 'out');
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center gap-2 text-sm"
        style={{ background: 'var(--bg)', color: 'var(--text-3)' }}>
        <Loader2 size={15} className="animate-spin" /> Checking your session…
      </div>
    );
  }

  if (state === 'out') {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
