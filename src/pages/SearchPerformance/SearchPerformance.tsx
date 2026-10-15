import { useCallback, useEffect, useMemo, useState } from 'react';
import SearchResults from '../Feedback/SearchResults';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { isAxiosError } from 'axios';
import { getVisibilitySearchPerformance } from '../../api/dashboard';
import { listWebsites, type Website } from '../../api/websites';
import type { VisibilitySearchPerformanceResponse } from '../../types';

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="card">
      <div className="muted">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

export default function SearchPerformance() {
  const [website, setWebsite] = useState<Website | null>(null);
  const [data, setData] =
    useState<VisibilitySearchPerformanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (refreshMode = false) => {
    try {
      setError('');

      if (refreshMode) setRefreshing(true);
      else setLoading(true);

      const websites = await listWebsites();

      if (!websites.length) {
        setWebsite(null);
        setData(null);
        return;
      }

      const selectedWebsite = websites[0];
      setWebsite(selectedWebsite);

      const response = await getVisibilitySearchPerformance(
        selectedWebsite.id,
      );

      setData(response);
    } catch (err) {
      console.error(err);

      if (isAxiosError(err) && err.response?.status === 404) {
        setError('Search performance projection is not available yet.');
      } else {
        setError('Unable to load search performance.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const executionSummary = useMemo(() => {
    if (!data) {
      return {
        total: 0,
        published: 0,
        awaitingPublication: 0,
        failed: 0,
      };
    }

    return data.execution_state.reduce(
      (summary, state) => {
        summary.total += state.content_count;

        if (state.publication_status === 'published') {
          summary.published += state.content_count;
        }

        if (
          state.publication_status === 'pending' ||
          state.publication_status === 'awaiting_publication'
        ) {
          summary.awaitingPublication += state.content_count;
        }

        if (
          state.approval_status === 'failed' ||
          state.publication_status === 'failed'
        ) {
          summary.failed += state.content_count;
        }

        return summary;
      },
      {
        total: 0,
        published: 0,
        awaitingPublication: 0,
        failed: 0,
      },
    );
  }, [data]);

  const measurementSummary = useMemo(() => {
    if (!data) {
      return {
        measurements: 0,
        improved: 0,
        declined: 0,
        avgPosition: null as number | null,
      };
    }

    let measurements = 0;
    let improved = 0;
    let declined = 0;
    let weightedPosition = 0;
    let positionCount = 0;

    for (const row of data.search_performance) {
      measurements += row.measurement_count;
      improved += row.improved;
      declined += row.declined;

      if (row.avg_position !== null) {
        weightedPosition += row.avg_position * row.measurement_count;
        positionCount += row.measurement_count;
      }
    }

    return {
      measurements,
      improved,
      declined,
      avgPosition:
        positionCount > 0
          ? weightedPosition / positionCount
          : null,
    };
  }, [data]);

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <div className="eyebrow">Search &amp; Visibility</div>
            <h1>Search Performance</h1>
          </div>
        </div>

        <div className="card">
          <div className="muted">Loading search performance…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <div className="eyebrow">Search &amp; Visibility</div>
            <h1>Search Performance</h1>
          </div>

          <button
            className="button secondary"
            onClick={() => void load(true)}
            disabled={refreshing}
          >
            <RefreshCw size={16} />
            {refreshing ? 'Refreshing…' : 'Retry'}
          </button>
        </div>

        <div className="card empty-state">
          <AlertCircle size={22} />
          <h3>{error}</h3>
          <p className="muted">
            This page reads from the canonical visibility and feedback
            projection.
          </p>
        </div>
      </div>
    );
  }

  if (!website) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <div className="eyebrow">Search &amp; Visibility</div>
            <h1>Search Performance</h1>
          </div>
        </div>

        <div className="card empty-state">
          <h3>Connect a website first</h3>
          <p className="muted">
            Search performance is scoped to a connected website.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Search &amp; Visibility</div>
          <h1>Search Performance</h1>
          <p className="muted">
            {website.domain || website.url}
          </p>
        </div>

        <button
          className="button secondary"
          onClick={() => void load(true)}
          disabled={refreshing}
        >
          <RefreshCw size={16} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <SearchResults websiteId={website.id} />

      <div className="section-header">
        <div>
          <div className="eyebrow">Data Engine rank checks</div>
          <h2>Tracked queries (the engine's own search checks, not Search Console)</h2>
        </div>
      </div>

      <div className="grid grid-4">
        <SummaryCard
          label="Tracked measurements"
          value={measurementSummary.measurements}
        />
        <SummaryCard
          label="Average position"
          value={
            measurementSummary.avgPosition === null
              ? '—'
              : measurementSummary.avgPosition.toFixed(1)
          }
        />
        <SummaryCard
          label="Improved"
          value={measurementSummary.improved}
        />
        <SummaryCard
          label="Declined"
          value={measurementSummary.declined}
        />
      </div>

      <div className="section-header">
        <div>
          <div className="eyebrow">Execution state</div>
          <h2>Publication pipeline</h2>
        </div>
      </div>

      <div className="grid grid-4">
        <SummaryCard
          label="Content executions"
          value={executionSummary.total}
        />
        <SummaryCard
          label="Published"
          value={executionSummary.published}
        />
        <SummaryCard
          label="Awaiting publication"
          value={executionSummary.awaitingPublication}
        />
        <SummaryCard
          label="Failed"
          value={executionSummary.failed}
        />
      </div>

      <div className="section-header">
        <div>
          <div className="eyebrow">Feedback measurements</div>
          <h2>Search visibility by rank band</h2>
        </div>
      </div>

      {data?.search_performance.length ? (
        <div className="card table-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rank band</th>
                  <th>Measurements</th>
                  <th>Average position</th>
                  <th>Improved</th>
                  <th>Declined</th>
                </tr>
              </thead>

              <tbody>
                {data.search_performance.map((row) => (
                  <tr key={row.rank_band}>
                    <td>
                      <strong>{row.rank_band}</strong>
                    </td>
                    <td>{row.measurement_count}</td>
                    <td>
                      {row.avg_position === null
                        ? '—'
                        : row.avg_position.toFixed(1)}
                    </td>
                    <td>{row.improved}</td>
                    <td>{row.declined}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card empty-state">
          <h3>No search measurements yet</h3>
          <p className="muted">
            Search-performance feedback will appear here when the Data Engine
            has recorded publication measurements.
          </p>
        </div>
      )}

      <div className="section-header">
        <div>
          <div className="eyebrow">Execution detail</div>
          <h2>Approval and publication states</h2>
        </div>
      </div>

      {data?.execution_state.length ? (
        <div className="card table-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Approval status</th>
                  <th>Publication status</th>
                  <th>Content count</th>
                </tr>
              </thead>

              <tbody>
                {data.execution_state.map((state, index) => (
                  <tr
                    key={`${state.approval_status}-${state.publication_status}-${index}`}
                  >
                    <td>{state.approval_status}</td>
                    <td>{state.publication_status}</td>
                    <td>{state.content_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card empty-state">
          <h3>No execution state available</h3>
        </div>
      )}
    </div>
  );
}
