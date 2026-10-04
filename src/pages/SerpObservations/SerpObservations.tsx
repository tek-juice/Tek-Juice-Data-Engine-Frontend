import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { isAxiosError } from 'axios';
import {
  getSerpObservations,
  type SerpObservation,
} from '../../api/intelligence';
import { listWebsites, type Website } from '../../api/websites';

const PAGE_SIZE = 50;

function formatDate(value: string | null) {
  if (!value) return '—';

  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatEngines(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(', ') || '—';
  }

  if (typeof value === 'string') {
    return value || '—';
  }

  if (value && typeof value === 'object') {
    return Object.keys(value).join(', ') || '—';
  }

  return '—';
}

export default function SerpObservations() {
  const [website, setWebsite] = useState<Website | null>(null);
  const [observations, setObservations] = useState<SerpObservation[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [endpointAvailable, setEndpointAvailable] = useState(true);

  const load = useCallback(async (nextOffset = offset, refresh = false) => {
    try {
      setError('');

      if (refresh) setRefreshing(true);
      else setLoading(true);

      const websites = await listWebsites();

      if (!websites.length) {
        setWebsite(null);
        setObservations([]);
        setTotal(0);
        return;
      }

      const selectedWebsite = websites[0];
      setWebsite(selectedWebsite);

      try {
        const result = await getSerpObservations(
          selectedWebsite.id,
          PAGE_SIZE,
          nextOffset,
        );

        setObservations(result.observations);
        setTotal(result.total);
        setOffset(result.offset);
        setEndpointAvailable(true);
      } catch (err) {
        if (isAxiosError(err) && err.response?.status === 404) {
          setObservations([]);
          setTotal(0);
          setEndpointAvailable(false);
        } else {
          throw err;
        }
      }
    } catch (err) {
      console.error(err);
      setError('Unable to load SERP observations.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [offset]);

  useEffect(() => {
    void load(0);
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <RefreshCw size={22} className="animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
        <div className="flex items-center gap-3 text-red-500">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>

        <button
          onClick={() => void load(offset, true)}
          className="mt-4 rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!website) {
    return (
      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)] p-8">
        No connected website is available.
      </div>
    );
  }

  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + observations.length, total);
  const hasPrevious = offset > 0;
  const hasNext = offset + observations.length < total;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">SERP Observations</h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--text-secondary)]">
            Observed search results collected by the Data Engine for{' '}
            {website.domain || website.url}.
          </p>
        </div>

        <button
          onClick={() => void load(offset, true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </header>

      {!endpointAvailable ? (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)] p-8">
          <div className="flex items-start gap-4">
            <AlertCircle size={21} className="mt-0.5" />

            <div>
              <h2 className="font-semibold">
                SERP observations are unavailable
              </h2>

              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                The canonical SERP observation projection could not be
                retrieved for this website. Refresh the page and try again.
              </p>
            </div>
          </div>
        </div>
      ) : observations.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)] p-8">
          <h2 className="font-semibold">No SERP observations</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            No search-result observations have been returned for this website.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="border-b border-[var(--border-color)]">
                  <tr className="text-left text-xs text-[var(--text-secondary)]">
                    <th className="px-5 py-3 font-medium">Query</th>
                    <th className="px-5 py-3 font-medium">Position</th>
                    <th className="px-5 py-3 font-medium">Result</th>
                    <th className="px-5 py-3 font-medium">Domain</th>
                    <th className="px-5 py-3 font-medium">Engines</th>
                    <th className="px-5 py-3 font-medium">Observed</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[var(--border-color)]">
                  {observations.map((observation) => (
                    <tr key={observation.id} className="align-top">
                      <td className="px-5 py-4">
                        <div className="max-w-[260px] font-medium">
                          {observation.query_text}
                        </div>
                      </td>

                      <td className="px-5 py-4 font-medium">
                        {observation.position ?? '—'}
                      </td>

                      <td className="px-5 py-4">
                        {observation.result_url ? (
                          <a
                            href={observation.result_url}
                            target="_blank"
                            rel="noreferrer"
                            className="group inline-flex max-w-[320px] items-start gap-2"
                          >
                            <span>
                              <span className="block font-medium group-hover:underline">
                                {observation.result_title || observation.result_url}
                              </span>

                              {observation.result_snippet && (
                                <span className="mt-1 block text-xs leading-5 text-[var(--text-secondary)]">
                                  {observation.result_snippet}
                                </span>
                              )}
                            </span>

                            <ExternalLink
                              size={14}
                              className="mt-0.5 shrink-0"
                            />
                          </a>
                        ) : (
                          <span>{observation.result_title || '—'}</span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-[var(--text-secondary)]">
                        {observation.result_domain || '—'}
                      </td>

                      <td className="px-5 py-4 text-[var(--text-secondary)]">
                        {formatEngines(observation.engines)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-[var(--text-secondary)]">
                        {formatDate(observation.observed_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[var(--text-secondary)]">
              Showing {pageStart}–{pageEnd} of {total.toLocaleString()}
            </span>

            <div className="flex gap-2">
              <button
                onClick={() => void load(Math.max(0, offset - PAGE_SIZE), true)}
                disabled={!hasPrevious || refreshing}
                className="rounded-lg border border-[var(--border-color)] px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <button
                onClick={() => void load(offset + PAGE_SIZE, true)}
                disabled={!hasNext || refreshing}
                className="rounded-lg border border-[var(--border-color)] px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
