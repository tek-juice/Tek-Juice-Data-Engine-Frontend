import { useCallback, useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { decideAction, getActions, rollbackAction, type OptimizationAction } from '../../api/dashboard';

const TIER_LABELS: Record<number, string> = {
  1: 'Tier 1 · safe automation',
  2: 'Tier 2 · policy controlled',
  3: 'Tier 3 · approval required',
};

const STATUS_LABELS: Record<string, string> = {
  proposed: 'For the site owner',
  needs_approval: 'Needs approval',
  approved: 'Approved',
  queued: 'Queued',
  executing: 'In progress',
  executed: 'Executed',
  verifying: 'Verifying',
  measuring: 'Measuring outcome',
  retained: 'Kept (outcome measured)',
  revise: 'Needs revision',
  rejected: 'Rejected',
  rolled_back: 'Rolled back',
  failed: 'Failed',
  resolved: 'Resolved',
  superseded: 'Superseded',
};

/** "Observed: clicks +5, position +2.3 (observational)" or null. */
export function outcomeText(action: OptimizationAction): string | null {
  const outcome = action.outcome;
  if (!outcome) return null;
  const changes = Object.entries(outcome.changes ?? {})
    .filter(([, v]) => typeof v === 'number' || typeof v === 'string')
    .map(([k, v]) => `${k.replace(/_/g, ' ')} ${typeof v === 'number' && v > 0 ? '+' : ''}${String(v)}`);
  return `Observed ${outcome.direction ?? ''}${changes.length ? `: ${changes.join(', ')}` : ''} (${outcome.label ?? 'observational'})`;
}

export default function Actions({ websiteId }: { websiteId: string }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof getActions>> | null>(null);
  const [message, setMessage] = useState('');

  const load = useCallback(() => {
    getActions(websiteId).then(setData).catch(() => setMessage('Unable to load optimization actions.'));
  }, [websiteId]);
  useEffect(load, [load]);

  const decide = async (action: OptimizationAction, decision: 'approve' | 'reject') => {
    try {
      await decideAction(websiteId, action.id, decision);
      load();
    } catch (err) {
      setMessage(isAxiosError(err) && err.response?.status === 403 ? 'Only admins can approve actions.' : 'The decision failed.');
    }
  };

  if (!data) return <div className="card"><div className="muted">{message || 'Loading optimization actions…'}</div></div>;
  const open = data.actions.filter((a) => ['needs_approval', 'queued', 'proposed', 'executing', 'verifying', 'measuring'].includes(a.status));
  const done = data.actions.filter((a) => !open.includes(a)).slice(0, 15);

  return (
    <div className="card">
      <div className="section-header">
        <div>
          <div className="eyebrow">Prioritized work</div>
          <h2>Optimization actions</h2>
        </div>
      </div>
      <p className="muted">
        {`Priority = ${data.priority_formula}. Policy: tier 1 ${data.policy.tier1}, tier 2 ${data.policy.tier2}, tier 3 ${data.policy.tier3}. `}
        Content changes still pass QA and content review before publication. Outcomes are before/after observations,
        not proof of cause.
      </p>
      {message && <p className="muted">{message}</p>}
      {open.length === 0 ? <p className="muted">No open actions.</p> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Action</th><th>Tier</th><th>Status</th><th>Done by</th><th>Priority</th><th /></tr></thead>
            <tbody>
              {open.map((a) => (
                <tr key={a.id}>
                  <td>
                    <strong>{a.title}</strong>
                    <div className="muted" style={{ fontSize: 12 }}>{a.rationale}</div>
                    {a.validation?.method && <div className="muted" style={{ fontSize: 12 }}>{`Verified by: ${a.validation.method}`}</div>}
                  </td>
                  <td>{TIER_LABELS[a.tier]}</td>
                  <td>{STATUS_LABELS[a.status] ?? a.status}</td>
                  <td>{a.executed_by === 'engine' ? 'Engine' : 'Site owner'}</td>
                  <td title={JSON.stringify(a.priority_factors)}>{a.priority_score.toFixed(2)}</td>
                  <td>
                    {a.status === 'needs_approval' && (
                      <>
                        <button className="button" onClick={() => void decide(a, 'approve')}>Approve</button>{' '}
                        <button className="button secondary" onClick={() => void decide(a, 'reject')}>Reject</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {done.length > 0 && (
        <>
          <h3>Recent outcomes</h3>
          <ul>
            {done.map((a) => (
              <li key={a.id}>
                <strong>{a.title}</strong> · {STATUS_LABELS[a.status] ?? a.status}
                {a.kind === 'site_change' && ['retained', 'revise'].includes(a.status) && (
                  <>{' '}<button className="button secondary" onClick={() => void rollbackAction(websiteId, a.id)
                    .then(load).catch(() => setMessage('Rollback failed (admins only).'))}>Roll back</button></>
                )}
                {outcomeText(a) && <div className="muted" style={{ fontSize: 12 }}>{outcomeText(a)}</div>}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
