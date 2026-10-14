import { useEffect, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getSearchResults, type SearchResults as Results } from '../../api/dashboard';

type Measured = Extract<Results, { status: 'measured' }>;

/** "+25%" / "−10%" / null for a relative change. */
export function changeText(change: number | null | undefined): string | null {
  if (change === null || change === undefined) return null;
  const pct = Math.round(change * 100);
  return `${pct > 0 ? '+' : pct < 0 ? '−' : ''}${Math.abs(pct)}%`;
}

/** Position change in places (positive = moved up). */
export function positionText(places: number | null | undefined): string | null {
  if (places === null || places === undefined) return null;
  if (places === 0) return 'no change';
  return places > 0 ? `up ${places} places` : `down ${Math.abs(places)} places`;
}

export function verdictText(comparison: Measured['comparison']): string {
  if (!comparison) return 'No Search Console data since the Data Engine started yet.';
  if (comparison.verdict === 'too_early') return `Too early to judge: ${comparison.note}.`;
  if (comparison.verdict === 'too_little_data') return `Too little data to judge: ${comparison.note}.`;
  return 'Observed before/after (not a controlled experiment).';
}

const pct = (v: number | null | undefined) => (v === null || v === undefined ? '—' : `${(v * 100).toFixed(1)}%`);
const pos = (v: number | null | undefined) => (v === null || v === undefined ? '—' : v.toFixed(1));

function Tile({ label, value, sub }: { label: string; value: string | number; sub?: string | null }) {
  return (
    <div>
      <div className="muted">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="muted">{sub}</div>}
    </div>
  );
}

export default function SearchResults({ websiteId }: { websiteId: string }) {
  const [data, setData] = useState<Results | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getSearchResults(websiteId).then(setData).catch(() => setError('Unable to load Search Console results.'));
  }, [websiteId]);

  if (error || !data) return <div className="card"><div className="muted">{error || 'Loading Search Console results…'}</div></div>;

  if (data.status === 'unavailable') {
    return (
      <div className="card">
        <div className="eyebrow">Google Search results</div>
        <h2>Results since the Data Engine started</h2>
        <p className="muted">Unavailable: {data.reason}. Connect Search Console under Data connections below.</p>
      </div>
    );
  }

  const cmp = data.comparison;
  const after = cmp?.after;
  const gaps = data.search_gaps_closed;
  const pages = data.published_pages;

  return (
    <div className="card">
      <div className="section-header">
        <div>
          <div className="eyebrow">Google Search results · {data.source}</div>
          <h2>Results since the Data Engine started</h2>
          <p className="muted">
            {data.property} · data {data.data_from} to {data.data_to}
            {data.engine_started && <> · started {data.engine_started} ({data.engine_started_source})</>}
          </p>
        </div>
      </div>

      {after && (
        <div className="detail-grid">
          <Tile label={`Clicks (${after.days} days)`} value={after.clicks}
            sub={cmp?.change ? `${changeText(cmp.change.clicks_per_day) ?? 'n/a'} per day vs before` : null} />
          <Tile label="Impressions" value={after.impressions}
            sub={cmp?.change ? `${changeText(cmp.change.impressions_per_day) ?? 'n/a'} per day vs before` : null} />
          <Tile label="CTR" value={pct(after.ctr)}
            sub={cmp?.change && cmp.before ? `before ${pct(cmp.before.ctr)}` : null} />
          <Tile label="Average position" value={pos(after.average_position)}
            sub={cmp?.change ? positionText(cmp.change.average_position_places) : null} />
        </div>
      )}
      <p className="muted">{verdictText(cmp)}</p>

      {data.weekly.length > 1 && (
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer>
            <LineChart data={data.weekly} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="week" fontSize={11} />
              <YAxis yAxisId="i" fontSize={11} />
              <YAxis yAxisId="c" orientation="right" fontSize={11} />
              <Tooltip />
              <Legend />
              <Line yAxisId="i" type="monotone" dataKey="impressions" name="Impressions / week" stroke="var(--info)" dot={false} />
              <Line yAxisId="c" type="monotone" dataKey="clicks" name="Clicks / week" stroke="var(--brand)" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="section-header">
        <div>
          <div className="eyebrow">Search gaps closed</div>
          <h3>Target queries the Data Engine published for</h3>
        </div>
      </div>
      <div className="detail-grid">
        <Tile label="Target queries" value={gaps.targets} />
        <Tile label="Site appears in Google" value={gaps.appearing} />
        <Tile label="Top 10" value={gaps.top_10} />
        <Tile label="Clicked" value={gaps.clicked} />
      </div>
      <p className="muted">
        {pages.appearing_in_google} of {pages.count} published pages appear in Google ({pages.impressions} impressions,{' '}
        {pages.clicks} clicks since publication)
        {data.new_queries_since_start !== null && <> · {data.new_queries_since_start} queries the site was not shown for before</>}.
      </p>

      {pages.pages.some((p) => p.impressions > 0) && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[var(--text-secondary)]">
              <tr>
                <th className="px-3 py-2 font-medium">Page</th>
                <th className="px-3 py-2 font-medium">Target query</th>
                <th className="px-3 py-2 font-medium">First seen</th>
                <th className="px-3 py-2 font-medium">Impressions</th>
                <th className="px-3 py-2 font-medium">Clicks</th>
                <th className="px-3 py-2 font-medium">Avg position</th>
              </tr>
            </thead>
            <tbody>
              {pages.pages.filter((p) => p.impressions > 0).slice(0, 15).map((p) => (
                <tr key={p.url}>
                  <td className="px-3 py-2"><a href={p.url} target="_blank" rel="noreferrer">{p.url.replace(/^https?:\/\/[^/]+/, '') || '/'}</a></td>
                  <td className="px-3 py-2">
                    {p.target_query ?? '—'}
                    {p.target_query_result && <span className="muted"> (pos. {pos(p.target_query_result.average_position)})</span>}
                  </td>
                  <td className="px-3 py-2">{p.first_seen_in_google ?? '—'}</td>
                  <td className="px-3 py-2">{p.impressions}</td>
                  <td className="px-3 py-2">{p.clicks}</td>
                  <td className="px-3 py-2">{pos(p.average_position)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ul className="muted" style={{ paddingLeft: 20 }}>
        {data.caveats.map((c) => <li key={c}>{c}</li>)}
      </ul>
    </div>
  );
}
