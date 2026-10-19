import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { isAxiosError } from 'axios';
import { getVisibilityOverview } from '../../api/dashboard';
import { listWebsites, type Website } from '../../api/websites';
import type { VisibilityFeedback } from '../../types';
import AIAnswers from './AIAnswers';
import BusinessFacts from './BusinessFacts';
import OptimizationOverview from './OptimizationOverview';
import DataConnections from './DataConnections';
import Actions from './Actions';
import Experiments from './Experiments';
import Performance from './Performance';
import SearchResults from './SearchResults';

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
        <SearchResults websiteId={website.id} />
        <DataConnections websiteId={website.id} />
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

      <SearchResults websiteId={website.id} />

      <div className="section-header">
        <div>
          <div className="eyebrow">Search result checks by the Data Engine</div>
          <h2>Tracked queries (not Search Console)</h2>
        </div>
      </div>

      <div className="grid grid-4">
        <SummaryCard
          label="Total measurements"
          value={feedback.total_measurements}
        />
        <SummaryCard
          label="Queries ranking"
          value={`${feedback.ranked_measurements} of ${feedback.queries_tracked ?? feedback.total_measurements}`}
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

      <div className="grid grid-4">
        <SummaryCard label="Improved" value={feedback.improved} />
        <SummaryCard label="Newly ranked" value={feedback.newly_ranked ?? 0} />
        <SummaryCard label="Declined or dropped" value={feedback.declined + (feedback.dropped ?? 0)} />
        <SummaryCard label="Unchanged" value={feedback.unchanged} />
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
            <div className="muted">Published articles ranking</div>
            <strong>
              {`${feedback.published_ranked ?? 0} of ${feedback.published_tracked ?? 0}`}
            </strong>
          </div>

          <div>
            <div className="muted">Pages in the search index</div>
            <strong>
              {feedback.indexed_pages === null || feedback.indexed_pages === undefined
                ? 'Not measured yet'
                : feedback.indexed_pages}
            </strong>
          </div>

          <div>
            <div className="muted">Not ranking (measured, site not shown)</div>
            <strong>{feedback.not_ranking ?? 0}</strong>
          </div>

          <div>
            <div className="muted">Positions from Google Search Console</div>
            <strong>{feedback.google_positions ?? 0}</strong>
          </div>

          <div>
            <div className="muted">Failed measurements (last batch)</div>
            <strong>{feedback.measurement_failures ?? 0}</strong>
          </div>
        </div>
      </div>

      {feedback.indexed_pages === 0 && (
        <div className="card">
          <h3>The site is not in the search index yet</h3>
          <p className="muted">
            Search engines currently return no pages from this website, so no query can rank.
            Pages become eligible once they are indexed: published articles are served as
            pre-rendered pages and listed in the sitemap for crawlers.
          </p>
        </div>
      )}

      {website && <OptimizationOverview websiteId={website.id} />}
      {website && <Actions websiteId={website.id} />}
      {website && <Performance websiteId={website.id} />}
      {website && <Experiments websiteId={website.id} />}
      {website && <DataConnections websiteId={website.id} />}
      {website && <AIAnswers websiteId={website.id} />}
      {website && <BusinessFacts websiteId={website.id} />}

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
