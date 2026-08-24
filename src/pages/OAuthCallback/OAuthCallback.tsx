import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { setTokens } from '../../services/auth.service';
import { exchangeOAuthCode } from '../../api/auth';
import type { OAuthProvider } from '../../api/auth';

/**
 * OAuthCallback — /auth/callback
 *
 * Handles two backend callback patterns:
 *
 * Pattern A — backend sends JWT directly (preferred):
 *   /auth/callback?access_token=xxx&refresh_token=yyy&token_type=bearer&expires_in=3600
 *
 * Pattern B — backend sends OAuth code (standard OAuth flow):
 *   /auth/callback?code=xxx&provider=github
 *   → frontend exchanges code for JWT via POST /api/v1/auth/oauth/callback
 *
 * On success → redirects to /dashboard
 * On failure → redirects to /login?error=oauth_failed
 */
export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const [status, setStatus] = useState<'processing' | 'error'>('processing');
  const [detail, setDetail] = useState('');

  useEffect(() => {
    async function handle() {
      // ── Pattern A: backend already resolved tokens ──────────────────────────
      const accessToken  = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      const expiresIn    = searchParams.get('expires_in');
      const error        = searchParams.get('error');

      if (error) {
        const desc = searchParams.get('error_description') ?? error;
        setDetail(desc);
        setStatus('error');
        setTimeout(() => navigate(`/login?error=${encodeURIComponent(desc)}`, { replace: true }), 2500);
        return;
      }

      if (accessToken) {
        setTokens({
          access_token:  accessToken,
          refresh_token: refreshToken ?? '',
          token_type:    'bearer',
          expires_in:    Number(expiresIn ?? 3600),
        });
        navigate('/dashboard', { replace: true });
        return;
      }

      // ── Pattern B: exchange code for tokens ────────────────────────────────
      const code     = searchParams.get('code');
      const provider = searchParams.get('provider') as OAuthProvider | null;

      if (code && provider) {
        try {
          const tokens = await exchangeOAuthCode(provider, code);
          setTokens(tokens);
          navigate('/dashboard', { replace: true });
        } catch {
          setDetail('Authentication failed. Please try again.');
          setStatus('error');
          setTimeout(() => navigate('/login?error=oauth_failed', { replace: true }), 2500);
        }
        return;
      }

      // ── No recognisable params ─────────────────────────────────────────────
      setDetail('Invalid callback — missing token or code.');
      setStatus('error');
      setTimeout(() => navigate('/login?error=oauth_invalid', { replace: true }), 2500);
    }

    void handle();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-950 text-zinc-200">
      <div className="text-center space-y-3">
        {status === 'processing' ? (
          <>
            <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-300 rounded-full animate-spin mx-auto" />
            <p className="text-sm font-mono text-zinc-400">Completing sign-in…</p>
          </>
        ) : (
          <>
            <div className="text-red-400 text-sm font-mono">Authentication failed</div>
            <div className="text-xs text-zinc-600">{detail}</div>
            <div className="text-xs text-zinc-700">Redirecting to login…</div>
          </>
        )}
      </div>
    </div>
  );
}
