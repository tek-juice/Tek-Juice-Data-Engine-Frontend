import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Filter,
  RefreshCw,
  Search,
} from 'lucide-react';
import { isAxiosError } from 'axios';
import {
  getOpportunities,
  IntelligenceOpportunity,
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

export default function Opportunities() {
  const { selectedRunId } = useIntelligenceRun();
  const [website, setWebsite] = useState<Website | null>(null);
  const [opportunities, setOpportunities] = useState<IntelligenceOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [endpointUnavailable, setEndpointUnavailable] = useState(false);

  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
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
        setOpportunities([]);
        return;
      }

      const selectedWebsite = websites[0];
      setWebsite(selectedWebsite);

      try {
        const data = await getOpportunities(selectedWebsite.id, selectedRunId ?? undefined);
        setOpportunities(data);
      } catch (err) {
        if (isAxiosError(err) && err.response?.status === 404) {
          setEndpointUnavailable(true);
          setOpportunities([]);
        } else {
          throw err;
        }
      }
    } catch (err) {
      setError(
        isAxiosError(err)
          ? err.response?.data?.detail || 'Unable to load opportunities.'
          : 'Unable to load opportunities.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [, selectedRunId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredOpportunities = useMemo(() => {
    const term = search.trim().toLowerCase();

    return opportunities.filter((opportunity) => {
      const matchesSearch =
        !term ||
        [
          opportunity.title,
          opportunity.target_topic,
          opportunity.primary_query,
          opportunity.intent,
          opportunity.recommended_action,
          opportunity.opportunity_type,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));

      const matchesType =
        !type ||
        opportunity.opportunity_type.toLowerCase() === type.toLowerCase();

      const matchesStatus =
        !status ||
        opportunity.status.toLowerCase() === status.toLowerCase();

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [opportunities, search, type, status]);

  const typeOptions = useMemo(
    () =>
      [...new Set(
        opportunities
          .map((opportunity) => opportunity.opportunity_type)
          .filter(Boolean),
      )].sort(),
    [opportunities],
  );

  const statusOptions = useMemo(
    () =>
      [...new Set(
        opportunities.map((opportunity) => opportunity.status).filter(Boolean),
      )].sort(),
    [opportunities],
  );

  const openCount = opportunities.filter(
    (opportunity) => opportunity.status.toLowerCase() === 'open',
  ).length;

  const progressedCount = opportunities.filter(
    (opportunity) =>
      (opportunity.current_status || '').toLowerCase() === 'progressed',
  ).length;

  const avgPriority =
    opportunities.length > 0
      ? opportunities.reduce(
          (sum, opportunity) => sum + (opportunity.priority_score ?? 0),
          0,
        ) / opportunities.length
      : 0;

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
        <h1 className="text-xl font-semibold">Opportunities</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Connect a website before viewing intelligence opportunities.
        </p>
      </div>
    );
  }

  if (endpointUnavailable) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Opportunities</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Business and search opportunities derived from Data Engine intelligence.
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)] p-8">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-[var(--text-secondary)]" />
            <div>
              <h2 className="font-medium">Opportunity data is not available yet</h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                The frontend is connected to the canonical opportunity contract,
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
          <p className="text-sm text-[var(--text-secondary)]">
            {website.domain || website.url}
          </p>
          <h1 className="mt-1 text-2xl font-semibold">Opportunities</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Business and search opportunities derived from intelligence findings.
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
        <SummaryCard label="Total opportunities" value={opportunities.length} />
        <SummaryCard label="Open" value={openCount} />
        <SummaryCard label="Progressed" value={progressedCount} />
        <SummaryCard
          label="Average priority"
          value={Number(avgPriority.toFixed(2))}
        />
      </div>

      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)] p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search opportunities, queries, topics..."
              className="w-full rounded-lg border border-[var(--border-color)] bg-transparent py-2.5 pl-9 pr-3 text-sm outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[var(--text-secondary)]" />

            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
              className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-color)] px-3 py-2.5 text-sm outline-none"
            >
              <option value="">All types</option>
              {typeOptions.map((option) => (
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
          <table className="w-full min-w-[1200px] text-left text-sm">
            <thead className="border-b border-[var(--border-color)] text-[var(--text-secondary)]">
              <tr>
                <th className="px-5 py-3 font-medium">Opportunity</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Target</th>
                <th className="px-5 py-3 font-medium">Intent</th>
                <th className="px-5 py-3 font-medium">Priority</th>
                <th className="px-5 py-3 font-medium">Business value</th>
                <th className="px-5 py-3 font-medium">Recommended action</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[var(--border-color)]">
              {filteredOpportunities.map((opportunity) => (
                <tr key={opportunity.id} className="align-top">
                  <td className="px-5 py-4">
                    <p className="font-medium">{opportunity.title}</p>
                    {opportunity.primary_query && (
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">
                        {opportunity.primary_query}
                      </p>
                    )}
                  </td>

                  <td className="px-5 py-4">
                    <span className="rounded-md bg-[var(--surface-muted)] px-2 py-1 text-xs">
                      {opportunity.opportunity_type}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    {opportunity.target_topic || '—'}
                  </td>

                  <td className="px-5 py-4">
                    {opportunity.intent || '—'}
                  </td>

                  <td className="px-5 py-4">
                    {opportunity.priority_score == null
                      ? '—'
                      : opportunity.priority_score.toFixed(2)}
                  </td>

                  <td className="px-5 py-4">
                    {opportunity.score_business_value == null
                      ? '—'
                      : opportunity.score_business_value.toFixed(2)}
                  </td>

                  <td className="max-w-sm px-5 py-4">
                    {opportunity.recommended_action || '—'}
                  </td>

                  <td className="px-5 py-4">
                    {opportunity.status}
                  </td>
                </tr>
              ))}

              {!filteredOpportunities.length && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-12 text-center text-sm text-[var(--text-secondary)]"
                  >
                    {opportunities.length
                      ? 'No opportunities match the current filters.'
                      : 'No intelligence opportunities have been recorded yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-[var(--border-color)] px-5 py-3 text-xs text-[var(--text-secondary)]">
          Showing {filteredOpportunities.length} of {opportunities.length} opportunities
        </div>
      </div>
    </div>
  );
}
