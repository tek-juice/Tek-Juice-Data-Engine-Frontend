import { useCallback, useEffect, useState } from 'react';
import {
  BookOpen, CheckCircle2, ExternalLink, Loader2, Pencil, Save, XCircle,
} from 'lucide-react';
import { useIntelligenceRun } from '../../contexts/IntelligenceRunContext';
import {
  getApprovalPolicy, getContentReview, listContentReviews, reviewContent,
  saveContentEdits, setApprovalPolicy,
  type ApprovalPolicy, type ArticleEdits, type ContentReviewDetail, type ContentReviewItem,
} from '../../api/contentReview';
import ArticlePreview from '../../components/content/ArticlePreview';
import { apiErrorMessage } from '../../utils/apiError';
import { isAdmin } from '../../services/auth.service';

const REASON_LABELS: Record<string, string> = {
  manual_review_required: 'Manual review is required for this website',
  requalified_pre_policy_content: 'Written before the current approval policy; re-checked',
};

export function describeReason(reason: string): string {
  if (REASON_LABELS[reason]) return REASON_LABELS[reason];
  const [code, detail] = reason.split(/:(.*)/s);
  if (code === 'unverified_figures') return `Figures not found on your website: ${detail}`;
  if (code === 'enrichment_invalid') return `Enrichment problems: ${detail}`;
  if (code === 'update_topic_drift') return 'The update drifts away from the existing page’s topic';
  if (code === 'update_shorter_than_live') return 'The update is much shorter than the existing page';
  if (code === 'recovery_review_required') return 'Replaces a live page, so it needs a human decision';
  return reason;
}

const STYLE_LABELS: Record<string, string> = {
  intro_missing: 'The introduction is missing or very short.',
  too_few_subheadings: 'Fewer than three subheadings.',
  template_headings: 'Generic headings (Introduction, Key Benefits, Get Started) are used.',
  conclusion_missing: 'There is no real conclusion.',
  long_paragraphs: 'Some paragraphs are very long.',
  dashes_or_hyphens: 'Dashes or hyphens are present.',
  decorative_symbols: 'Arrows, emoji, check marks or bold text are present.',
};

export function describeStyleWarning(warning: string): string {
  const [code, detail] = warning.split(/:(.*)/s);
  const label = STYLE_LABELS[code] ?? warning;
  return detail && code === 'template_headings' ? `${label} (${detail})` : label;
}

const META_MIN = 50;
const META_MAX = 160;

const field = { background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)' };

function ReviewCard({
  websiteId, item, admin, onDecided,
}: {
  websiteId: string;
  item: ContentReviewItem;
  admin: boolean;
  onDecided: (executionId: string) => void;
}) {
  const [detail, setDetail] = useState<ContentReviewDetail | null>(null);
  const [mode, setMode] = useState<'closed' | 'read' | 'edit'>('closed');
  const [draft, setDraft] = useState<ArticleEdits>({});
  const [previewDraft, setPreviewDraft] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  async function loadDetail(): Promise<ContentReviewDetail | null> {
    if (detail) return detail;
    try {
      const loaded = await getContentReview(websiteId, item.execution_id);
      setDetail(loaded);
      return loaded;
    } catch (err) {
      setError(apiErrorMessage(err, 'The article could not be loaded.'));
      return null;
    }
  }

  async function open(next: 'read' | 'edit') {
    if (mode === next) { setMode('closed'); return; }
    setError('');
    setSaved('');
    const loaded = await loadDetail();
    if (!loaded) return;
    if (next === 'edit') {
      setDraft({
        title: loaded.title ?? '',
        meta_description: loaded.meta_description ?? '',
        content: loaded.content ?? '',
      });
      setPreviewDraft(false);
    }
    setMode(next);
  }

  function changedEdits(): ArticleEdits | undefined {
    if (!detail || mode !== 'edit') return undefined;
    const edits: ArticleEdits = {};
    if ((draft.title ?? '') !== (detail.title ?? '')) edits.title = draft.title;
    if ((draft.content ?? '') !== (detail.content ?? '')) edits.content = draft.content;
    if ((draft.meta_description ?? '') !== (detail.meta_description ?? '')) edits.meta_description = draft.meta_description;
    return Object.keys(edits).length ? edits : undefined;
  }

  async function save() {
    const edits = changedEdits();
    if (!edits) { setSaved('No changes to save.'); return; }
    setBusy(true);
    setError('');
    try {
      const updated = await saveContentEdits(websiteId, item.execution_id, edits);
      setDetail(updated);
      setSaved('Changes saved. The article is still waiting for approval.');
    } catch (err) {
      setError(apiErrorMessage(err, 'The changes could not be saved.'));
    } finally {
      setBusy(false);
    }
  }

  async function decide(decision: 'approve' | 'reject') {
    setBusy(true);
    setError('');
    try {
      const edits = decision === 'approve' ? changedEdits() : undefined;
      if (edits) await reviewContent(websiteId, item.execution_id, decision, note, edits);
      else await reviewContent(websiteId, item.execution_id, decision, note);
      onDecided(item.execution_id);
    } catch (err) {
      setError(apiErrorMessage(err, 'The review could not be saved.'));
      setBusy(false);
    }
  }

  const metaLength = (draft.meta_description ?? '').length;
  const isUpdate = item.action_type === 'update';

  return (
    <li className="p-4 rounded space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">{detail?.title ?? item.title ?? 'Untitled'}</span>
        <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}>
          {isUpdate ? 'Update to an existing page' : 'New article'}
        </span>
        {(detail?.edited ?? item.edited) && (
          <span className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-2)', color: 'var(--brand)' }}>
            Edited by a reviewer
          </span>
        )}
      </div>

      {item.target_url && (
        <a href={item.target_url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs underline break-all" style={{ color: 'var(--brand)' }}>
          <ExternalLink size={12} /> {isUpdate ? 'Existing page: ' : ''}{item.target_url}
        </a>
      )}

      <ul className="text-xs list-disc pl-4" style={{ color: 'var(--text-2)' }}>
        {item.approval.reasons.map(reason => <li key={reason}>{describeReason(reason)}</li>)}
      </ul>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void open('read')}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold" style={field}>
          <BookOpen size={12} /> {mode === 'read' ? 'Hide article' : 'Read article'}
        </button>
        {admin && (
          <button type="button" onClick={() => void open('edit')}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold" style={field}>
            <Pencil size={12} /> {mode === 'edit' ? 'Close editor' : 'Edit'}
          </button>
        )}
      </div>

      {mode === 'read' && detail && (
        <div className="p-4 rounded space-y-3" style={{ background: 'var(--surface-2)' }}>
          {detail.meta_description && (
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>
              <span className="font-semibold">Search description: </span>{detail.meta_description}
            </p>
          )}
          {detail.style_warnings.length > 0 && (
            <ul className="text-xs list-disc pl-4" style={{ color: 'var(--danger)' }}>
              {detail.style_warnings.map(w => <li key={w}>{describeStyleWarning(w)}</li>)}
            </ul>
          )}
          <ArticlePreview title={detail.title} content={detail.content ?? ''} />
        </div>
      )}

      {mode === 'edit' && detail && (
        <div className="p-4 rounded space-y-3" style={{ background: 'var(--surface-2)' }}>
          <label className="block text-xs space-y-1">
            <span className="font-semibold">Headline</span>
            <input aria-label="Headline" value={draft.title ?? ''} maxLength={200}
              onChange={event => setDraft(d => ({ ...d, title: event.target.value }))}
              className="w-full px-2 py-1.5 rounded text-sm" style={field} />
          </label>
          <label className="block text-xs space-y-1">
            <span className="font-semibold">Search description</span>
            <textarea aria-label="Search description" value={draft.meta_description ?? ''} rows={2} maxLength={320}
              onChange={event => setDraft(d => ({ ...d, meta_description: event.target.value }))}
              className="w-full px-2 py-1.5 rounded text-sm" style={field} />
            <span style={{ color: metaLength < META_MIN || metaLength > META_MAX ? 'var(--danger)' : 'var(--text-3)' }}>
              {metaLength} characters ({META_MIN} to {META_MAX})
            </span>
          </label>
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold">Article (Markdown: ## for subheadings, [text](https://...) for links)</span>
            <button type="button" onClick={() => setPreviewDraft(p => !p)} className="underline">
              {previewDraft ? 'Back to editing' : 'Preview changes'}
            </button>
          </div>
          {previewDraft ? (
            <div className="p-3 rounded" style={{ background: 'var(--surface)' }}>
              <ArticlePreview title={draft.title} content={draft.content ?? ''} />
            </div>
          ) : (
            <textarea aria-label="Article body" value={draft.content ?? ''} rows={22}
              onChange={event => setDraft(d => ({ ...d, content: event.target.value }))}
              className="w-full px-2 py-1.5 rounded text-sm font-mono" style={field} />
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={busy} onClick={() => void save()}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold" style={field}>
              <Save size={12} /> Save changes
            </button>
            <button type="button" disabled={busy} onClick={() => void decide('approve')}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold"
              style={{ background: 'var(--brand)', color: '#111' }}>
              <CheckCircle2 size={12} /> Save &amp; approve
            </button>
            {saved && <span className="text-xs" style={{ color: 'var(--text-3)' }}>{saved}</span>}
          </div>
        </div>
      )}

      {error && <p role="alert" className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>}

      {admin && mode !== 'edit' && (
        <div className="flex items-center gap-2">
          <input aria-label={`Review note for ${item.title ?? item.execution_id}`}
            placeholder="Note (optional)" value={note}
            onChange={event => setNote(event.target.value)}
            className="flex-1 px-2 py-1.5 rounded text-xs" style={field} />
          <button type="button" disabled={busy} onClick={() => void decide('approve')}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold"
            style={{ background: 'var(--brand)', color: '#111' }}>
            <CheckCircle2 size={12} /> Approve
          </button>
          <button type="button" disabled={busy} onClick={() => void decide('reject')}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-bold"
            style={{ background: 'var(--surface-2)', color: 'var(--danger)' }}>
            <XCircle size={12} /> Reject
          </button>
        </div>
      )}
    </li>
  );
}

export default function ContentReviews() {
  const { website } = useIntelligenceRun();
  const admin = isAdmin();
  const [items, setItems] = useState<ContentReviewItem[]>([]);
  const [policy, setPolicy] = useState<ApprovalPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
            Read, correct and approve articles before they are published. Nothing here is published until approved.
          </p>
        </div>
        {policy && (
          <label className="text-xs flex items-center gap-2" style={{ color: 'var(--text-3)' }}>
            Approval
            <select value={policy.mode} disabled={!admin} aria-label="Approval mode"
              onChange={event => void changeMode(event.target.value as ApprovalPolicy['mode'])}
              className="px-2 py-1 rounded" style={field}>
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
            <ReviewCard key={item.execution_id} websiteId={website.id} item={item} admin={admin}
              onDecided={id => setItems(current => current.filter(entry => entry.execution_id !== id))} />
          ))}
        </ul>
      )}
    </div>
  );
}
