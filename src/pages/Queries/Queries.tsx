import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Filter,
  RefreshCw,
  Search,
} from 'lucide-react';
import { isAxiosError } from 'axios';
import {
  getDiscoveredQueries,
  type DiscoveredQuery,
} from '../../api/intelligence';
import { listWebsites, type Website } from '../../api/websites';
import { useIntelligenceRun } from '../../contexts/IntelligenceRunContext';

function formatScore(value: number | null | undefined) {
  if (value == null) return '—';
  return value.toFixed(2);
}

function formatDate(value: string | null) {
  if (!value) return '—';

  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function Queries() {
  const { selectedRunId } = useIntelligenceRun();
  const [website, setWebsite] = useState<Website | null>(null);
  const [queries, setQueries] = useState<DiscoveredQuery[]>([]);
  const [search, setSearch] = useState('');
  const [intent, setIntent] = useState('all');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [endpointAvailable, setEndpointAvailable] = useState(true);

  const load = useCallback(async (refresh = false) => {
    try {
      setError('');

      if (refresh) setRefreshing(true);
      else setLoading(true);

      const websites = await listWebsites();

      if (!websites.length) {
        setWebsite(null);
        setQueries([]);
        return;
      }

      const selectedWebsite = websites[0];
      setWebsite(selectedWebsite);

      try {
        const result = await getDiscoveredQueries(selectedWebsite.id, selectedRunId ?? undefined);
        setQueries(result);
        setEndpointAvailable(true);
      } catch (err) {
        if (isAxiosError(err) && err.response?.status === 404) {
          setQueries([]);
          setEndpointAvailable(false);
        } else {
          throw err;
        }
      }
    } catch (err) {
      console.error(err);
      setError('Unable to load discovered queries.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [, selectedRunId]);

  useEffect(() => {
    void load();
  }, [load]);

  const intents = useMemo(
    () =>
      Array.from(
        new Set(
          queries
            .map((query) => query.intent)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort(),
    [queries],
  );

  const statuses = useMemo(
    () =>
      Array.from(
        new Set(
          queries
            .map((query) => query.status)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort(),
    [queries],
  );

  const filteredQueries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return queries.filter((query) => {
      const matchesSearch =
        !normalizedSearch ||
        query.query_text.toLowerCase().includes(normalizedSearch) ||
        query.topic?.toLowerCase().includes(normalizedSearch) ||
        query.location?.toLowerCase().includes(normalizedSearch);

      const matchesIntent =
        intent === 'all' || query.intent === intent;

      const matchesStatus =
        status === 'all' || query.status === status;

      return matchesSearch && matchesIntent && matchesStatus;
    });
  }, [queries, search, intent, status]);

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
          onClick={() => void load(true)}
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

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Queries</h1>
          <p className="mt-2 max-w-3xl text-sm text-[var(--text-secondary)]">
            Search queries discovered by the Data Engine from product,
            market and search intelligence.
          </p>
        </div>

        <button
          onClick={() => void load(true)}
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
                Query endpoint not available yet
              </h2>

              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                The frontend is ready for the canonical{' '}
                <code>discovered_queries</code> data. The dedicated API
                projection will be connected when the backend route is
                finalized.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <SummaryCard label="Total queries" value={queries.length} />
            <SummaryCard
              label="With SERP data"
              value={queries.filter((query) => query.serp_fetched_at).length}
            />
            <SummaryCard
              label="With current position"
              value={queries.filter(
                (query) => query.tenant_position != null,
              ).length}
            />
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)] p-4 lg:flex-row">
            <div className="relative flex-1">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
              />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search queries, topics or locations..."
                className="w-full rounded-lg border border-[var(--border-color)] bg-transparent py-2.5 pl-10 pr-3 text-sm outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter size={17} className="text-[var(--text-secondary)]" />

              <select
                value={intent}
                onChange={(event) => setIntent(event.target.value)}
                className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-color)] px-3 py-2.5 text-sm"
              >
                <option value="all">All intents</option>
                {intents.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>

              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-color)] px-3 py-2.5 text-sm"
              >
                <option value="all">All statuses</option>
                {statuses.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)]">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-[var(--border-color)] text-xs text-[var(--text-secondary)]">
                <tr>
                  <th className="px-5 py-4 font-medium">Query</th>
                  <th className="px-5 py-4 font-medium">Intent</th>
                  <th className="px-5 py-4 font-medium">Topic</th>
                  <th className="px-5 py-4 font-medium">Location</th>
                  <th className="px-5 py-4 font-medium">Position</th>
                  <th className="px-5 py-4 font-medium">Relevance</th>
                  <th className="px-5 py-4 font-medium">Business value</th>
                  <th className="px-5 py-4 font-medium">Status</th>
                  <th className="px-5 py-4 font-medium">Discovered</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[var(--border-color)]">
                {filteredQueries.map((query) => (
                  <tr key={query.id}>
                    <td className="max-w-[300px] px-5 py-4 font-medium">
                      {query.query_text}
                    </td>
                    <td className="px-5 py-4">
                      {query.intent || '—'}
                    </td>
                    <td className="px-5 py-4">
                      {query.topic || '—'}
                    </td>
                    <td className="px-5 py-4">
                      {query.location || '—'}
                    </td>
                    <td className="px-5 py-4">
                      {query.tenant_position ?? '—'}
                    </td>
                    <td className="px-5 py-4">
                      {formatScore(query.relevance_score)}
                    </td>
                    <td className="px-5 py-4">
                      {formatScore(query.business_value)}
                    </td>
                    <td className="px-5 py-4">
                      {query.status || '—'}
                    </td>
                    <td className="px-5 py-4">
                      {formatDate(query.created_at)}
                    </td>
                  </tr>
                ))}

                {!filteredQueries.length && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-5 py-12 text-center text-sm text-[var(--text-secondary)]"
                    >
                      No queries match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-[var(--text-secondary)]">
            Showing {filteredQueries.length} of {queries.length} queries.
          </p>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)] p-5">
      <p className="text-sm text-[var(--text-secondary)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
