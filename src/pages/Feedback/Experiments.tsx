import { useCallback, useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { cancelExperiment, getExperiments, startExperiment, type Experiment } from '../../api/dashboard';

/** "CTR +0.6 pts (controlled)" / "insufficient data" / status note. */
export function experimentResult(e: Experiment): string {
  if (!e.result) {
    const last = e.history[e.history.length - 1];
    return last ? last.note : e.status;
  }
  if (e.result.effect === null || e.result.effect === undefined || !e.result.sufficient_data) {
    return `No conclusion: ${e.result.label ?? 'insufficient data'}`;
  }
  const points = Math.round(e.result.effect * 1000) / 10;
  return `CTR ${points > 0 ? '+' : ''}${points} pts vs control, ${e.result.decision} (${e.result.label})`;
}

export default function Experiments({ websiteId }: { websiteId: string }) {
  const [items, setItems] = useState<Experiment[] | null>(null);
  const [message, setMessage] = useState('');
  const load = useCallback(() => {
    getExperiments(websiteId).then(setItems).catch(() => setMessage('Unable to load experiments.'));
  }, [websiteId]);
  useEffect(load, [load]);

  const fail = (err: unknown) => setMessage(isAxiosError(err) && err.response?.status === 403
    ? 'Only admins can start or cancel experiments.' : 'The request failed.');

  return (
    <div className="card">
      <div className="section-header">
        <div>
          <div className="eyebrow">Controlled tests</div>
          <h2>Experiments</h2>
        </div>
        <button className="button secondary" onClick={() => void startExperiment(websiteId)
          .then((r) => { setMessage(r.reason ? `Not started: ${r.reason}` : `Status: ${r.status}`); load(); })
          .catch(fail)}>Start title test</button>
      </div>
      <p className="muted">
        Pages are randomly split into treatment and control; only titles and descriptions change, through content review.
        After 28 days click-through rates are compared; a worse treatment is rolled back automatically.
      </p>
      {message && <p className="muted">{message}</p>}
      {!items ? <div className="muted">Loading…</div> : items.length === 0 ? <p className="muted">No experiments yet.</p> : (
        <ul>
          {items.map((e) => (
            <li key={e.id} style={{ marginBottom: 8 }}>
              <strong>{`${e.kind === 'title_meta' ? 'Title and description test' : e.kind} · ${e.status}`}</strong>
              <div className="muted" style={{ fontSize: 12 }}>
                {`${e.assignment.treatment?.length ?? 0} treatment / ${e.assignment.control?.length ?? 0} control pages`}
                {e.ends_at ? ` · ends ${new Date(e.ends_at).toLocaleDateString()}` : ''}
              </div>
              <div className="muted" style={{ fontSize: 12 }}>{experimentResult(e)}</div>
              {['draft', 'awaiting_publication', 'running'].includes(e.status) && (
                <button className="button secondary" onClick={() => void cancelExperiment(websiteId, e.id).then(load).catch(fail)}>
                  Cancel
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
