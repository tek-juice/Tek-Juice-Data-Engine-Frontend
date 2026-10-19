import { useCallback, useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { Link } from 'react-router-dom';
import {
  decideAction,
  getPerformanceFindings,
  getPerformanceRemediations,
  planPerformanceFinding,
  requestPerformanceAssessment,
  rollbackAction,
  type PerformanceFinding,
  type PerformanceRemediation,
} from '../../api/dashboard';

const OUTCOME_LABELS: Record<string, string> = {
  VERIFIED_RESOLVED: 'Resolved (verified)',
  PARTIALLY_RESOLVED: 'Partially resolved',
  NOT_RESOLVED: 'Not resolved',
  REGRESSION_DETECTED: 'Regression detected',
  ROLLBACK_COMPLETED: 'Rolled back (verified)',
  ROLLBACK_FAILED: 'Rollback failed',
  VERIFICATION_UNAVAILABLE: 'Verification unavailable',
};

/** "Code-free fix possible" / "Needs a code change" / ... for a finding. */
export function eligibilityText(finding: Pick<PerformanceFinding, 'eligibility'>): string {
  return {
    code_free_candidate: 'Code-free fix possible (if the connector supports it)',
    code_change_required: 'Needs a change in the site’s code',
    not_controllable: 'Third-party resource',
    insufficient_evidence: 'Not enough evidence to act',
  }[finding.eligibility];
}

export function outcomeLabel(outcome: string | null | undefined): string | null {
  return outcome ? OUTCOME_LABELS[outcome] ?? outcome : null;
}

export default function Performance({ websiteId }: { websiteId: string }) {
  const [findings, setFindings] = useState<Awaited<ReturnType<typeof getPerformanceFindings>> | null>(null);
  const [remediations, setRemediations] = useState<Awaited<ReturnType<typeof getPerformanceRemediations>> | null>(null);
  const [message, setMessage] = useState('');

  const load = useCallback(() => {
    getPerformanceFindings(websiteId).then(setFindings).catch(() => setMessage('Unable to load performance findings.'));
    getPerformanceRemediations(websiteId).then(setRemediations).catch(() => undefined);
  }, [websiteId]);
  useEffect(load, [load]);

  const act = async (work: () => Promise<unknown>, done: string) => {
    try {
      await work();
      setMessage(done);
      load();
    } catch (err) {
      setMessage(isAxiosError(err) && err.response?.status === 403 ? 'Only admins can do this.' : 'The request failed.');
    }
  };

  if (!findings) return <div className="card"><div className="muted">{message || 'Loading performance findings…'}</div></div>;
  const current = findings.findings.filter((f) => !['no_longer_observed', 'resolved', 'rolled_back'].includes(f.status));
  // Source-code changes have their own page (PageSpeed recommendations).
  const open = current.filter((f) => f.eligibility !== 'code_change_required');
  const codeChanges = current.length - open.length;

  return (
    <div className="card">
      <div className="section-header">
        <div>
          <div className="eyebrow">PageSpeed Insights</div>
          <h2>Performance</h2>
        </div>
        <button className="button secondary" onClick={() => void act(() => requestPerformanceAssessment(websiteId),
          'Assessment queued (mobile and desktop). Results appear in a few minutes.')}>Assess now</button>
      </div>
      <p className="muted">
        Lab values come from one simulated Lighthouse run; field values from real Chrome users over 28 days.
        Only delivery settings the connector really supports can be changed without code, after approval and
        verification. Everything else is listed as a code change for the site owner.
        {remediations && !remediations.execution_enabled && ' Remediation execution is currently disabled.'}
      </p>
      {message && <p className="muted">{message}</p>}
      {codeChanges > 0 && (
        <p>
          {`${codeChanges} finding(s) need a change in the site's source code: `}
          <Link to="/pagespeed">see PageSpeed recommendations</Link>.
        </p>
      )}
      {open.length === 0 ? <p className="muted">No open code-free or unresolved findings.</p> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Finding</th><th>Device</th><th>Category</th><th>Fix</th><th>State</th><th /></tr></thead>
            <tbody>
              {open.map((f) => (
                <tr key={f.id}>
                  <td>
                    <strong>{f.title}</strong>{f.observed_display && ` · ${f.observed_display}`}
                    <div className="muted" style={{ fontSize: 12 }}>{f.url}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{f.hypothesis}</div>
                    {f.plan?.blocked_reason && <div className="muted" style={{ fontSize: 12 }}>{`Blocked: ${f.plan.blocked_reason}`}</div>}
                  </td>
                  <td>{f.strategy}</td>
                  <td>{f.category_label}</td>
                  <td>{eligibilityText(f)}</td>
                  <td>{f.state}</td>
                  <td>
                    {f.code_free && !f.action_id && (
                      <button className="button secondary" onClick={() => void act(() => planPerformanceFinding(websiteId, f.id),
                        'Planned against the connector’s live capabilities.')}>Plan</button>
                    )}
                    {f.action_id && f.status === 'awaiting_approval' && (
                      <>
                        <button className="button" onClick={() => void act(() => decideAction(websiteId, f.action_id!, 'approve'),
                          'Approved.')}>Approve</button>{' '}
                        <button className="button secondary" onClick={() => void act(() => decideAction(websiteId, f.action_id!, 'reject'),
                          'Rejected.')}>Reject</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {remediations && remediations.remediations.length > 0 && (
        <>
          <h3>Remediations</h3>
          <ul>
            {remediations.remediations.map((r: PerformanceRemediation) => (
              <li key={r.id}>
                <strong>{r.title}</strong> · {outcomeLabel(r.verification_outcome) ?? r.status}
                {r.outcome?.reason && <div className="muted" style={{ fontSize: 12 }}>{r.outcome.reason}</div>}
                {r.incident && <div style={{ fontSize: 12 }}>{`Incident: ${r.incident.summary}. ${r.incident.action}`}</div>}
                {['retained', 'revise'].includes(r.status) && (
                  <>{' '}<button className="button secondary" onClick={() => void act(() => rollbackAction(websiteId, r.id),
                    'Rollback requested.')}>Roll back</button></>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
