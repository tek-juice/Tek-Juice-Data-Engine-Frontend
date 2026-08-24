import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { setTokens } from '../../services/auth.service';
import { exchangeOAuthCode } from '../../api/auth';
import type { OAuthProvider } from '../../api/auth';

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const [status, setStatus] = useState<'processing' | 'error'>('processing');
  const [detail, setDetail] = useState('');

  useEffect(() => {
    async function handle() {
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

      setDetail('Invalid callback — missing token or code.');
      setStatus('error');
      setTimeout(() => navigate('/login?error=oauth_invalid', { replace: true }), 2500);
    }

    void handle();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="flex items-center justify-center min-h-screen"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
      <div className="text-center space-y-3">
        {status === 'processing' ? (
          <>
            <div
              className="w-6 h-6 rounded-full animate-spin mx-auto"
              style={{ border: '2px solid var(--border)', borderTopColor: 'var(--text-2)' }}
            />
            <p className="text-sm" style={{ color: 'var(--text-3)' }}>Completing sign-in…</p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold" style={{ color: 'var(--danger)' }}>
              Authentication failed
            </p>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>{detail}</p>
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>Redirecting to login…</p>
          </>
        )}
      </div>
    </div>
  );
}
