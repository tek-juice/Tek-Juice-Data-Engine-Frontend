import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { isAxiosError } from 'axios';
import {
  getContentStrategies,
  type ContentStrategy,
} from '../../api/dashboard';
import { listWebsites, type Website } from '../../api/websites';
import { useIntelligenceRun } from '../../contexts/IntelligenceRunContext';

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

function listValue(value: unknown): string {
  if (!Array.isArray(value)) return '—';
  return value.length ? value.join(', ') : '—';
}

export default function ContentStrategies() {
  const { selectedRunId } = useIntelligenceRun();
  const [website, setWebsite] = useState<Website | null>(null);
  const [strategies, setStrategies] = useState<ContentStrategy[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [available, setAvailable] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const load = useCallback(async (refreshMode = false) => {
    try {
      setError('');
      if (refreshMode) setRefreshing(true);
      else setLoading(true);

      const websites = await listWebsites();

      if (!websites.length) {
        setWebsite(null);
        setStrategies([]);
        setTotal(0);
        setAvailable(true);
        return;
      }

      const selectedWebsite = websites[0];
      setWebsite(selectedWebsite);

      try {
        const response = await getContentStrategies(selectedWebsite.id, {
          page: 1,
          page_size: 100,
          ...(status ? { status } : {}),
          ...(selectedRunId ? { run_id: selectedRunId } : {}),
        });

        setStrategies(response.items);
        setTotal(response.total);
        setAvailable(true);
      } catch (err) {
        if (isAxiosError(err) && err.response?.status === 404) {
          setStrategies([]);
          setTotal(0);
          setAvailable(false);
          return;
        }

        throw err;
      }
    } catch (err) {
      console.error(err);
      setError('Unable to load content strategies.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [status, selectedRunId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();

    if (!needle) return strategies;

    return strategies.filter((strategy) =>
      [
        strategy.objective,
        strategy.content_type,
        strategy.target_intent,
        strategy.primary_query,
        strategy.topic,
        strategy.status,
        strategy.opportunity_title,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [search, strategies]);

  const statusCounts = useMemo(() => {
    return strategies.reduce<Record<string, number>>((acc, strategy) => {
      acc[strategy.status] = (acc[strategy.status] ?? 0) + 1;
      return acc;
    }, {});
  }, [strategies]);

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <div className="eyebrow">Content &amp; Execution</div>
            <h1>Content Strategies</h1>
          </div>
        </div>
        <div className="card">
          <div className="muted">Loading content strategies…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <div className="eyebrow">Content &amp; Execution</div>
            <h1>Content Strategies</h1>
          </div>
          <button className="button secondary" onClick={() => void load(true)}>
            <RefreshCw size={16} />
            Retry
          </button>
        </div>

        <div className="card">
          <div className="error-row">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!website) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <div className="eyebrow">Content &amp; Execution</div>
            <h1>Content Strategies</h1>
          </div>
        </div>

        <div className="card empty-state">
          <h3>Connect a website first</h3>
          <p className="muted">
            Content strategies are generated from the canonical intelligence
            and opportunity pipeline for a connected website.
          </p>
        </div>
      </div>
    );
  }

  if (!available) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <div className="eyebrow">Content &amp; Execution</div>
            <h1>Content Strategies</h1>
            <p className="muted">
              {website.domain || website.url}
            </p>
          </div>

          <button className="button secondary" onClick={() => void load(true)}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        <div className="card empty-state">
          <AlertCircle size={22} />
          <h3>Strategy projection not available yet</h3>
          <p className="muted">
            The frontend contract is ready for the canonical content strategy
            projection. The dashboard backend endpoint has not been finalized
            yet, so no strategy data is being fabricated here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Content &amp; Execution</div>
          <h1>Content Strategies</h1>
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

      <div className="grid grid-4">
        <SummaryCard label="Total strategies" value={total} />
        <SummaryCard
          label="Draft"
          value={statusCounts.draft ?? 0}
        />
        <SummaryCard
          label="Generated"
          value={statusCounts.generated ?? 0}
        />
        <SummaryCard
          label="Visible results"
          value={filtered.length}
        />
      </div>

      <div className="card">
        <div className="toolbar">
          <input
            className="input"
            placeholder="Search strategies, topics, queries…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <select
            className="input"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">All statuses</option>
            <option value="draft">Draft</option>
            <option value="generated">Generated</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card empty-state">
          <h3>No content strategies found</h3>
          <p className="muted">
            No strategies match the current filters.
          </p>
        </div>
      ) : (
        <div className="card table-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Strategy</th>
                  <th>Content type</th>
                  <th>Intent</th>
                  <th>Primary query</th>
                  <th>Topic</th>
                  <th>Opportunity</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((strategy) => (
                  <tr key={strategy.id}>
                    <td>
                      <strong>
                        {strategy.objective || strategy.primary_query || 'Untitled strategy'}
                      </strong>
                    </td>
                    <td>{strategy.content_type || '—'}</td>
                    <td>{strategy.target_intent || '—'}</td>
                    <td>{strategy.primary_query || '—'}</td>
                    <td>{strategy.topic || '—'}</td>
                    <td>
                      {strategy.opportunity_title ||
                        strategy.opportunity_id}
                    </td>
                    <td>{strategy.status}</td>
                    <td>
                      {new Date(strategy.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="card">
          <div className="eyebrow">Strategy detail</div>
          <div className="detail-grid">
            {filtered.slice(0, 5).map((strategy) => (
              <div className="detail-item" key={strategy.id}>
                <strong>{strategy.primary_query || 'Untitled strategy'}</strong>
                <span className="muted">
                  Required sections: {listValue(strategy.required_sections)}
                </span>
                <span className="muted">
                  Entities: {listValue(strategy.entities)}
                </span>
                <span className="muted">
                  Schema: {listValue(strategy.schema_recommendations)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
