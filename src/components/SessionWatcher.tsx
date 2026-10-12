import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Sends the user to /login when the API client ends the session (expired or
 * revoked tokens), instead of leaving them on a page whose requests now fail.
 */
export default function SessionWatcher() {
  const navigate = useNavigate();
  useEffect(() => {
    function onLogout(event: Event) {
      const reason = (event as CustomEvent<{ reason?: string }>).detail?.reason;
      if (reason === 'session_expired') {
        navigate('/login', { replace: true, state: { reason } });
      }
    }
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, [navigate]);
  return null;
}
