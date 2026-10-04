import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Filter,
  RefreshCw,
  Search,
} from 'lucide-react';
import { isAxiosError } from 'axios';
import {
  getIntelligenceGaps,
  IntelligenceGap,
} from '../../api/intelligence';
import { listWebsites, Website } from '../../api/websites';
import { useIntelligenceRun } from '../../contexts/IntelligenceRunContext';

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

export default function Gaps() {
  const { selectedRunId } = useIntelligenceRun();
  const [website, setWebsite] = useState<Website | null>(null);
  const [gaps, setGaps] = useState<IntelligenceGap[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [endpointUnavailable, setEndpointUnavailable] = useState(false);

  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [status, setStatus] = useState('');

  const load = useCallback(async (refreshMode = false) => {
    setError('');
    setEndpointUnavailable(false);

    if (refreshMode) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const websites = await listWebsites();

      if (!websites.length) {
        setWebsite(null);
        setGaps([]);
        return;
      }

      const selectedWebsite = websites[0];
      setWebsite(selectedWebsite);

      try {
        const data = await getIntelligenceGaps(selectedWebsite.id, selectedRunId ?? undefined);
        setGaps(data);
      } catch (err) {
        if (isAxiosError(err) && err.response?.status === 404) {
          setEndpointUnavailable(true);
          setGaps([]);
        } else {
          throw err;
        }
      }
    } catch (err) {
      setError(
        isAxiosError(err)
          ? err.response?.data?.detail || 'Unable to load intelligence gaps.'
          : 'Unable to load intelligence gaps.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [, selectedRunId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredGaps = useMemo(() => {
    const term = search.trim().toLowerCase();

    return gaps.filter((gap) => {
      const matchesSearch =
        !term ||
        [
          gap.title,
          gap.description,
          gap.query_text,
          gap.topic,
          gap.intent,
          gap.competitor_domain,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));

      const matchesSeverity =
        !severity || (gap.severity || '').toLowerCase() === severity.toLowerCase();

      const matchesStatus =
        !status || gap.status.toLowerCase() === status.toLowerCase();

      return matchesSearch && matchesSeverity && matchesStatus;
    });
  }, [gaps, search, severity, status]);

  const severityOptions = useMemo(
    () =>
      [...new Set(gaps.map((gap) => gap.severity).filter(Boolean))]
        .sort()
        .map((value) => String(value)),
    [gaps],
  );

  const statusOptions = useMemo(
    () => [...new Set(gaps.map((gap) => gap.status).filter(Boolean))].sort(),
    [gaps],
  );

  const openCount = gaps.filter((gap) => gap.status.toLowerCase() === 'open').length;
  const highSeverityCount = gaps.filter(
    (gap) =>
      (gap.severity || '').toLowerCase() === 'high' ||
      (gap.severity || '').toLowerCase() === 'critical',
  ).length;
  const withCompetitorCount = gaps.filter((gap) => gap.competitor_domain).length;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-[var(--text-secondary)]" />
      </div>
    );
  }

  if (!website) {
    return (
      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)] p-8">
        <h1 className="text-xl font-semibold">Gaps</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Connect a website before viewing intelligence gaps.
        </p>
      </div>
    );
  }

  if (endpointUnavailable) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Intelligence Gaps</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Visibility and content gaps identified from the Data Engine intelligence pipeline.
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)] p-8">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-[var(--text-secondary)]" />
            <div>
              <h2 className="font-medium">Gap data is not available yet</h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                The frontend is connected to the canonical intelligence-gap contract,
                but the backend endpoint is not currently available.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-sm text-[var(--text-secondary)]">{website.domain || website.url}</p>
          <h1 className="mt-1 text-2xl font-semibold">Intelligence Gaps</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Detected search, content, and visibility gaps from the intelligence pipeline.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void load(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface-muted)] disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total gaps" value={gaps.length} />
        <SummaryCard label="Open gaps" value={openCount} />
        <SummaryCard label="High / critical" value={highSeverityCount} />
        <SummaryCard label="With competitor evidence" value={withCompetitorCount} />
      </div>

      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)] p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search gaps, queries, topics, competitors..."
              className="w-full rounded-lg border border-[var(--border-color)] bg-transparent py-2.5 pl-9 pr-3 text-sm outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[var(--text-secondary)]" />

            <select
              value={severity}
              onChange={(event) => setSeverity(event.target.value)}
              className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-color)] px-3 py-2.5 text-sm outline-none"
            >
              <option value="">All severities</option>
              {severityOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-color)] px-3 py-2.5 text-sm outline-none"
            >
              <option value="">All statuses</option>
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="border-b border-[var(--border-color)] text-[var(--text-secondary)]">
              <tr>
                <th className="px-5 py-3 font-medium">Gap</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Query</th>
                <th className="px-5 py-3 font-medium">Severity</th>
                <th className="px-5 py-3 font-medium">Gap score</th>
                <th className="px-5 py-3 font-medium">Competitor</th>
                <th className="px-5 py-3 font-medium">Positions</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[var(--border-color)]">
              {filteredGaps.map((gap) => (
                <tr key={gap.id} className="align-top">
                  <td className="px-5 py-4">
                    <p className="font-medium">{gap.title}</p>
                    {gap.description && (
                      <p className="mt-1 max-w-md text-xs text-[var(--text-secondary)]">
                        {gap.description}
                      </p>
                    )}
                  </td>

                  <td className="px-5 py-4">
                    <span className="rounded-md bg-[var(--surface-muted)] px-2 py-1 text-xs">
                      {gap.gap_type}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <p>{gap.query_text || '—'}</p>
                    {gap.topic && (
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">
                        {gap.topic}
                      </p>
                    )}
                  </td>

                  <td className="px-5 py-4">
                    {gap.severity || '—'}
                  </td>

                  <td className="px-5 py-4">
                    {gap.gap_score == null ? '—' : gap.gap_score.toFixed(2)}
                  </td>

                  <td className="px-5 py-4">
                    {gap.competitor_domain || '—'}
                  </td>

                  <td className="px-5 py-4">
                    {gap.tenant_position == null && gap.competitor_position == null
                      ? '—'
                      : `${gap.tenant_position ?? '—'} / ${gap.competitor_position ?? '—'}`}
                  </td>

                  <td className="px-5 py-4">
                    {gap.status}
                  </td>
                </tr>
              ))}

              {!filteredGaps.length && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-12 text-center text-sm text-[var(--text-secondary)]"
                  >
                    {gaps.length
                      ? 'No gaps match the current filters.'
                      : 'No intelligence gaps have been recorded yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-[var(--border-color)] px-5 py-3 text-xs text-[var(--text-secondary)]">
          Showing {filteredGaps.length} of {gaps.length} gaps
        </div>
      </div>
    </div>
  );
}
