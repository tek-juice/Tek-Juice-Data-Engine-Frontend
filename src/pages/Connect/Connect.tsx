import { useState, type FormEvent } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Globe, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { connectWebsite } from '../../api/websites';

function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function Connect() {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const trimmed = url.trim();

    if (!trimmed) {
      setError('Enter your website URL.');
      return;
    }

    if (!isValidUrl(trimmed)) {
      setError('Enter a valid website URL including https://');
      return;
    }

    setSaving(true);

    try {
      const result = await connectWebsite({ url: trimmed });

      setSuccess(result.message);

      window.setTimeout(() => {
        navigate('/', { replace: true });
      }, 900);
    } catch (e: unknown) {
      const response = (
        e as {
          response?: {
            data?: {
              detail?: string;
            };
          };
        }
      ).response;

      setError(
        response?.data?.detail ??
          'Unable to connect this website. Please check the URL and try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  const inputClass = [
    'w-full px-3 py-2.5 text-sm outline-none transition-colors',
    'bg-[var(--surface-2)] border border-[var(--border)]',
    'text-[var(--text)] placeholder:text-[var(--text-3)]',
    'focus:border-[var(--text-2)]',
    'rounded',
  ].join(' ');

  return (
    <div
      className="min-h-full px-7 py-8"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
      <div className="max-w-xl">
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-9 h-9 flex items-center justify-center flex-shrink-0 rounded"
            style={{ background: 'var(--brand)' }}
          >
            <Globe size={16} style={{ color: '#111' }} />
          </div>

          <div>
            <h1 className="text-base font-bold" style={{ color: 'var(--text)' }}>
              Connect your website
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
              Give Data Engine your website URL and it will start intelligence analysis automatically.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 rounded space-y-5"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
          }}
        >
          <div>
            <label
              htmlFor="website-url"
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--text-2)' }}
            >
              Website URL <span style={{ color: 'var(--danger)' }}>*</span>
            </label>

            <input
              id="website-url"
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://yourproduct.com"
              autoComplete="url"
              disabled={saving}
              className={inputClass}
            />

            <p className="text-xs mt-1.5" style={{ color: 'var(--text-3)' }}>
              Data Engine will register the website and begin the background intelligence pipeline.
            </p>
          </div>

          {error && (
            <div
              className="flex items-start gap-2 px-3 py-2.5 rounded"
              style={{
                border: '1px solid var(--danger-border)',
                background: 'var(--danger-bg)',
              }}
            >
              <AlertTriangle
                size={13}
                className="flex-shrink-0 mt-0.5"
                style={{ color: 'var(--danger)' }}
              />
              <p className="text-xs" style={{ color: 'var(--danger)' }}>
                {error}
              </p>
            </div>
          )}

          {success && (
            <div
              className="flex items-start gap-2 px-3 py-2.5 rounded"
              style={{
                border: '1px solid rgba(34,197,94,0.25)',
                background: 'rgba(34,197,94,0.06)',
              }}
            >
              <CheckCircle2
                size={13}
                className="flex-shrink-0 mt-0.5"
                style={{ color: 'var(--success)' }}
              />
              <p className="text-xs" style={{ color: 'var(--success)' }}>
                {success}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded transition-opacity disabled:opacity-40"
            style={{ background: 'var(--brand)', color: '#111' }}
          >
            {saving ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Connecting…
              </>
            ) : (
              <>
                Connect website
                <ArrowRight size={13} />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
