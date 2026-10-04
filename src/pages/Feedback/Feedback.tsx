import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { isAxiosError } from 'axios';
import { getVisibilityOverview } from '../../api/dashboard';
import { listWebsites, type Website } from '../../api/websites';
import type { VisibilityFeedback } from '../../types';

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

export default function Feedback() {
  const [website, setWebsite] = useState<Website | null>(null);
  const [feedback, setFeedback] = useState<VisibilityFeedback | null>(null);
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
        setFeedback(null);
        return;
      }

      const selectedWebsite = websites[0];
      setWebsite(selectedWebsite);

      const overview = await getVisibilityOverview(
        selectedWebsite.id,
      );

      setFeedback(overview.feedback);
    } catch (err) {
      console.error(err);

      if (isAxiosError(err) && err.response?.status === 404) {
        setError('Feedback projection is not available yet.');
      } else {
        setError('Unable to load feedback.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const changeTotal = useMemo(() => {
    if (!feedback) return 0;

    return (
      feedback.improved +
      feedback.declined +
      feedback.unchanged
    );
  }, [feedback]);

  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <div className="eyebrow">Search &amp; Visibility</div>
            <h1>Feedback</h1>
          </div>
        </div>

        <div className="card">
          <div className="muted">Loading feedback…</div>
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
            <h1>Feedback</h1>
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
            Feedback is the measurement loop connecting published content
            back into the Data Engine.
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
            <h1>Feedback</h1>
          </div>
        </div>

        <div className="card empty-state">
          <h3>Connect a website first</h3>
          <p className="muted">
            Feedback measurements are scoped to a connected website.
          </p>
        </div>
      </div>
    );
  }

  if (!feedback) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <div className="eyebrow">Search &amp; Visibility</div>
            <h1>Feedback</h1>
            <p className="muted">
              {website.domain || website.url}
            </p>
          </div>
        </div>

        <div className="card empty-state">
          <h3>No feedback data available</h3>
          <p className="muted">
            The Data Engine has not returned a feedback projection for this
            website.
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
          <h1>Feedback</h1>
          <p className="muted">
            Measurement feedback for {website.domain || website.url}
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
        <SummaryCard
          label="Total measurements"
          value={feedback.total_measurements}
        />
        <SummaryCard
          label="Ranked measurements"
          value={feedback.ranked_measurements}
        />
        <SummaryCard
          label="Average position"
          value={
            feedback.avg_position === null
              ? '—'
              : feedback.avg_position.toFixed(1)
          }
        />
        <SummaryCard
          label="Measured changes"
          value={changeTotal}
        />
      </div>

      <div className="section-header">
        <div>
          <div className="eyebrow">Performance movement</div>
          <h2>What changed after publication</h2>
        </div>
      </div>

      <div className="grid grid-3">
        <SummaryCard
          label="Improved"
          value={feedback.improved}
        />
        <SummaryCard
          label="Declined"
          value={feedback.declined}
        />
        <SummaryCard
          label="Unchanged"
          value={feedback.unchanged}
        />
      </div>

      <div className="card">
        <div className="section-header">
          <div>
            <div className="eyebrow">Measurement status</div>
            <h2>Feedback loop</h2>
          </div>
        </div>

        <div className="detail-grid">
          <div>
            <div className="muted">Last measured</div>
            <strong>
              {feedback.last_measured_at
                ? new Date(
                    feedback.last_measured_at,
                  ).toLocaleString()
                : 'No measurements yet'}
            </strong>
          </div>

          <div>
            <div className="muted">Ranked coverage</div>
            <strong>
              {feedback.total_measurements > 0
                ? `${(
                    (feedback.ranked_measurements /
                      feedback.total_measurements) *
                    100
                  ).toFixed(1)}%`
                : '—'}
            </strong>
          </div>
        </div>
      </div>

      {feedback.total_measurements === 0 && (
        <div className="card empty-state">
          <h3>No measurements recorded yet</h3>
          <p className="muted">
            Once published content receives search-performance measurements,
            the Data Engine will feed those observations back into this
            visibility loop.
          </p>
        </div>
      )}
    </div>
  );
}
