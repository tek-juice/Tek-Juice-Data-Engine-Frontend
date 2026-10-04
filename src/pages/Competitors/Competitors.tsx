import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Filter,
  RefreshCw,
  Search,
} from 'lucide-react';
import { isAxiosError } from 'axios';
import {
  getCompetitors,
  Competitor,
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

export default function Competitors() {
  const { selectedRunId } = useIntelligenceRun();
  const [website, setWebsite] = useState<Website | null>(null);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [endpointUnavailable, setEndpointUnavailable] = useState(false);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

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
        setCompetitors([]);
        return;
      }

      const selectedWebsite = websites[0];
      setWebsite(selectedWebsite);

      try {
        const data = await getCompetitors(selectedWebsite.id, selectedRunId ?? undefined);
        setCompetitors(data);
      } catch (err) {
        if (isAxiosError(err) && err.response?.status === 404) {
          setEndpointUnavailable(true);
          setCompetitors([]);
        } else {
          throw err;
        }
      }
    } catch (err) {
      setError(
        isAxiosError(err)
          ? err.response?.data?.detail || 'Unable to load competitors.'
          : 'Unable to load competitors.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [, selectedRunId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredCompetitors = useMemo(() => {
    const term = search.trim().toLowerCase();

    return competitors.filter((competitor) => {
      const matchesSearch =
        !term ||
        [
          competitor.domain,
          competitor.category,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));

      const matchesCategory =
        !category ||
        (competitor.category || '').toLowerCase() === category.toLowerCase();

      return matchesSearch && matchesCategory;
    });
  }, [competitors, search, category]);

  const categoryOptions = useMemo(
    () =>
      [...new Set(
        competitors
          .map((competitor) => competitor.category)
          .filter(Boolean),
      )]
        .sort()
        .map((value) => String(value)),
    [competitors],
  );

  const avgPosition =
    competitors.length > 0
      ? competitors.reduce(
          (sum, competitor) => sum + (competitor.avg_position ?? 0),
          0,
        ) / competitors.filter((competitor) => competitor.avg_position != null).length
      : 0;

  const withPosition = competitors.filter(
    (competitor) => competitor.avg_position != null,
  ).length;

  const strongestOverlap = competitors.filter(
    (competitor) => (competitor.serp_overlap_score ?? 0) > 0,
  ).length;

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
        <h1 className="text-xl font-semibold">Competitors</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Connect a website before viewing competitor intelligence.
        </p>
      </div>
    );
  }

  if (endpointUnavailable) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Competitors</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Competitor domains identified through the intelligence pipeline.
          </p>
        </div>

        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)] p-8">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-[var(--text-secondary)]" />
            <div>
              <h2 className="font-medium">Competitor data is not available yet</h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                The frontend is connected to the canonical competitor contract,
                but the backend endpoint is not currently available.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const positionAverage = Number.isFinite(avgPosition)
    ? Number(avgPosition.toFixed(2))
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-sm text-[var(--text-secondary)]">
            {website.domain || website.url}
          </p>
          <h1 className="mt-1 text-2xl font-semibold">Competitors</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Domains detected across the website's discovered search landscape.
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
        <SummaryCard label="Competitors" value={competitors.length} />
        <SummaryCard label="With position data" value={withPosition} />
        <SummaryCard label="SERP overlap detected" value={strongestOverlap} />
        <SummaryCard label="Average position" value={positionAverage} />
      </div>

      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-color)] p-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search competitor domains..."
              className="w-full rounded-lg border border-[var(--border-color)] bg-transparent py-2.5 pl-9 pr-3 text-sm outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-[var(--text-secondary)]" />

            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="rounded-lg border border-[var(--border-color)] bg-[var(--surface-color)] px-3 py-2.5 text-sm outline-none"
            >
              <option value="">All categories</option>
              {categoryOptions.map((option) => (
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
                <th className="px-5 py-3 font-medium">Domain</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Appearances</th>
                <th className="px-5 py-3 font-medium">Queries</th>
                <th className="px-5 py-3 font-medium">Avg position</th>
                <th className="px-5 py-3 font-medium">Best position</th>
                <th className="px-5 py-3 font-medium">SERP overlap</th>
                <th className="px-5 py-3 font-medium">Confidence</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[var(--border-color)]">
              {filteredCompetitors.map((competitor) => (
                <tr key={competitor.domain} className="align-top">
                  <td className="px-5 py-4 font-medium">
                    {competitor.domain}
                  </td>

                  <td className="px-5 py-4">
                    {competitor.category || '—'}
                  </td>

                  <td className="px-5 py-4">
                    {competitor.appearance_count}
                  </td>

                  <td className="px-5 py-4">
                    {competitor.query_count}
                  </td>

                  <td className="px-5 py-4">
                    {competitor.avg_position == null
                      ? '—'
                      : competitor.avg_position.toFixed(2)}
                  </td>

                  <td className="px-5 py-4">
                    {competitor.best_position == null
                      ? '—'
                      : competitor.best_position}
                  </td>

                  <td className="px-5 py-4">
                    {competitor.serp_overlap_score == null
                      ? '—'
                      : competitor.serp_overlap_score.toFixed(2)}
                  </td>

                  <td className="px-5 py-4">
                    {competitor.confidence == null
                      ? '—'
                      : competitor.confidence.toFixed(2)}
                  </td>
                </tr>
              ))}

              {!filteredCompetitors.length && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-12 text-center text-sm text-[var(--text-secondary)]"
                  >
                    {competitors.length
                      ? 'No competitors match the current filters.'
                      : 'No competitor intelligence has been recorded yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-[var(--border-color)] px-5 py-3 text-xs text-[var(--text-secondary)]">
          Showing {filteredCompetitors.length} of {competitors.length} competitors
        </div>
      </div>
    </div>
  );
}
