import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useIntelligenceRun } from '../../contexts/IntelligenceRunContext';
import {
  getApprovalPolicy, listContentReviews, reviewContent, setApprovalPolicy,
  type ApprovalPolicy, type ContentReviewItem,
} from '../../api/contentReview';
import { apiErrorMessage } from '../../utils/apiError';
import { isAdmin } from '../../services/auth.service';

const REASON_LABELS: Record<string, string> = {
  manual_review_required: 'Manual review is required for this website',
};

export function describeReason(reason: string): string {
  if (REASON_LABELS[reason]) return REASON_LABELS[reason];
  const [code, detail] = reason.split(/:(.*)/s);
  if (code === 'unverified_figures') return `Figures not found on your website: ${detail}`;
  if (code === 'enrichment_invalid') return `Enrichment problems: ${detail}`;
  return reason;
}

export default function ContentReviews() {
  const { website } = useIntelligenceRun();
  const admin = isAdmin();
  const [items, setItems] = useState<ContentReviewItem[]>([]);
  const [policy, setPolicy] = useState<ApprovalPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    if (!website) return;
    setLoading(true);
    setError('');
    try {
      const [held, currentPolicy] = await Promise.all([
        listContentReviews(website.id, 'held'),
        getApprovalPolicy(website.id),
      ]);
      setItems(held);
      setPolicy(currentPolicy);
    } catch (err) {
      setError(apiErrorMessage(err, 'Unable to load content awaiting review.'));
    } finally {
      setLoading(false);
    }
  }, [website]);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(item: ContentReviewItem, decision: 'approve' | 'reject') {
    if (!website) return;
    setBusy(item.execution_id);
    setError('');
    try {
      await reviewContent(website.id, item.execution_id, decision, notes[item.execution_id]);
      setItems(current => current.filter(entry => entry.execution_id !== item.execution_id));
    } catch (err) {
      setError(apiErrorMessage(err, 'The review could not be saved.'));
    } finally {
      setBusy('');
    }
  }

  async function changeMode(mode: ApprovalPolicy['mode']) {
    if (!website || !policy) return;
    try {
      setPolicy(await setApprovalPolicy(website.id, {
        mode, hold_unverified_figures: policy.hold_unverified_figures,
      }));
    } catch (err) {
      setError(apiErrorMessage(err, 'The approval policy could not be changed.'));
    }
  }

  if (!website) {
    return <div className="px-7 py-8 text-sm" style={{ color: 'var(--text-3)' }}>Connect a website first.</div>;
  }

  return (
    <div className="px-7 py-8 space-y-5" style={{ color: 'var(--text)' }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-base font-bold">Content reviews</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
            Content the approval policy held for a human decision. Nothing here is published until approved.
          </p>
        </div>
        {policy && (
          <label className="text-xs flex items-center gap-2" style={{ color: 'var(--text-3)' }}>
            Approval
            <select value={policy.mode} disabled={!admin} aria-label="Approval mode"
              onChange={event => void changeMode(event.target.value as ApprovalPolicy['mode'])}
              className="px-2 py-1 rounded"
              style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' }}>
              <option value="auto">Automatic (hold unverified figures)</option>
              <option value="manual">Manual review of everything</option>
            </select>
          </label>
        )}
      </div>

      {error && <p role="alert" className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-3)' }}>
          <Loader2 size={14} className="animate-spin" /> Loading…
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>No content is waiting for review.</p>
      ) : (
        <ul className="space-y-3">
          {items.map(item => (
            <li key={item.execution_id} className="p-4 rounded space-y-2"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="text-sm font-semibold">{item.title ?? 'Untitled'}</div>
              <ul className="text-xs list-disc pl-4" style={{ color: 'var(--text-2)' }}>
                {item.approval.reasons.map(reason => <li key={reason}>{describeReason(reason)}</li>)}
              </ul>
              {admin && (
                <div className="flex items-center gap-2">
                  <input aria-label={`Review note for ${item.title ?? item.execution_id}`}
                    placeholder="Note (optional)" value={notes[item.execution_id] ?? ''}
                    onChange={event => setNotes(current => ({ ...current, [item.execution_id]: event.target.value }))}
                    className="flex-1 px-2 py-1.5 rounded text-xs"
                    style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' }} />
                  <button type="button" disabled={busy !== ''} onClick={() => void decide(item, 'approve')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold"
                    style={{ background: 'var(--brand)', color: '#111' }}>
                    <CheckCircle2 size={12} /> Approve
                  </button>
                  <button type="button" disabled={busy !== ''} onClick={() => void decide(item, 'reject')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold"
                    style={{ background: 'var(--surface-2)', color: 'var(--danger)' }}>
                    <XCircle size={12} /> Reject
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
