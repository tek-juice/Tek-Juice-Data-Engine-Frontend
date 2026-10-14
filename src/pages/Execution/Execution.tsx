import { approvalLabel, indexabilityLabel, publicationLabel, verificationLabel } from '../../utils/publicationLabels';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { isAxiosError } from 'axios';
import {
  getContentExecutions,
  type ContentExecution,
} from '../../api/dashboard';
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

export default function Execution() {
  const { selectedRunId } = useIntelligenceRun();
  const [executions, setExecutions] = useState<ContentExecution[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const load = useCallback(async (refreshMode = false) => {
    try {
      setError('');

      if (refreshMode) setRefreshing(true);
      else setLoading(true);

      const response = await getContentExecutions({
        page: 1,
        page_size: 100,
        ...(status ? { status } : {}),
        ...(selectedRunId ? { run_id: selectedRunId } : {}),
      });

      setExecutions(response.items);
      setTotal(response.total);
    } catch (err) {
      console.error(err);

      if (isAxiosError(err) && err.response?.status === 404) {
        setError('Content execution endpoint is not available yet.');
      } else {
        setError('Unable to load content executions.');
      }
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

    if (!needle) return executions;

    return executions.filter((execution) =>
      [
        execution.action_type,
        execution.target_title,
        execution.target_url,
        execution.opportunity_title,
        execution.primary_query,
        execution.approval_status,
        execution.publication_status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle)),
    );
  }, [executions, search]);

  const counts = useMemo(() => {
    return {
      approved: executions.filter(
        (item) => item.approval_status === 'approved',
      ).length,
      published: executions.filter(
        (item) => item.publication_status === 'published',
      ).length,
      awaitingApproval: executions.filter(
        (item) => item.approval_status === 'pending' ||
          item.approval_status === 'held' ||
          item.approval_status === 'awaiting_approval',
      ).length,
      awaitingPublication: executions.filter(
        (item) =>
          item.approval_status === 'approved' &&
          item.publication_status !== 'published',
      ).length,
      failed: executions.filter(
        (item) =>
          item.approval_status === 'failed' ||
          item.publication_status === 'failed',
      ).length,
    };
  }, [executions]);

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <div className="eyebrow">Content &amp; Execution</div>
            <h1>Execution</h1>
          </div>
        </div>
        <div className="card">
          <div className="muted">Loading executions…</div>
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
            <h1>Execution</h1>
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
            The page is connected to the canonical content execution
            projection and will display execution records when the endpoint is
            available.
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
          <h1>Execution</h1>
          <p className="muted">
            Canonical execution state from strategy through publication.
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

      <div className="grid grid-5">
        <SummaryCard label="Total executions" value={total} />
        <SummaryCard label="Approved" value={counts.approved} />
        <SummaryCard
          label="Awaiting approval"
          value={counts.awaitingApproval}
        />
        <SummaryCard
          label="Awaiting publication"
          value={counts.awaitingPublication}
        />
        <SummaryCard label="Published" value={counts.published} />
      </div>

      <div className="card">
        <div className="toolbar">
          <input
            className="input"
            placeholder="Search executions, targets, queries…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <select
            className="input"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">All statuses</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="held">Held for review</option>
            <option value="rejected">Rejected</option>
            <option value="queued">Queued</option>
            <option value="published">Published</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card empty-state">
          <h3>No executions found</h3>
          <p className="muted">
            No execution records match the current filters.
          </p>
        </div>
      ) : (
        <div className="card table-card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Execution</th>
                  <th>Opportunity</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>Approval</th>
                  <th>Publication</th>
                  <th>Published URL</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((execution) => (
                  <tr key={execution.id}>
                    <td>
                      <strong>
                        {execution.target_title ||
                          execution.primary_query ||
                          execution.id}
                      </strong>
                    </td>
                    <td>
                      {execution.opportunity_title ||
                        execution.opportunity_id ||
                        '—'}
                    </td>
                    <td>{execution.action_type || '—'}</td>
                    <td>{execution.target_url || '—'}</td>
                    <td title={approvalLabel(execution).detail ?? undefined}>
                      {approvalLabel(execution).text}
                      {approvalLabel(execution).detail && (
                        <div className="muted">{approvalLabel(execution).detail}</div>
                      )}
                    </td>
                    <td title={publicationLabel(execution).detail ?? undefined}>
                      {publicationLabel(execution).text}
                      {publicationLabel(execution).detail && (
                        <div className="muted">{publicationLabel(execution).detail}</div>
                      )}
                    </td>
                    <td>
                      {execution.published_url ? (
                        <a href={execution.published_url} target="_blank" rel="noreferrer">
                          {execution.published_url}
                        </a>
                      ) : '—'}
                      {indexabilityLabel(execution.url_verification) && (
                        <div className="muted">{indexabilityLabel(execution.url_verification)}</div>
                      )}
                      {verificationLabel(execution.url_verification) && (
                        <div className="muted">{verificationLabel(execution.url_verification)}</div>
                      )}
                    </td>
                    <td>
                      {new Date(execution.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {counts.failed > 0 && (
        <div className="card">
          <div className="error-row">
            <AlertCircle size={18} />
            <span>
              {counts.failed} execution record
              {counts.failed === 1 ? '' : 's'} currently marked as failed.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
