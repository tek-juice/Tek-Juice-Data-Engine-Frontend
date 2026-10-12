import type { ContentExecution, UrlVerification } from '../api/dashboard';

/** Approval column text: decision plus the policy's first reason. */
export function approvalLabel(execution: Pick<ContentExecution, 'approval_status' | 'approval' | 'error'>): {
  text: string;
  detail: string | null;
} {
  const status = execution.approval_status ?? '—';
  const reasons = execution.approval?.reasons ?? [];
  if (execution.approval?.review) {
    return { text: `${status} (reviewed)`, detail: execution.approval.review.note ?? null };
  }
  if (status === 'pending' && execution.error) {
    return { text: 'QA failed', detail: execution.error };
  }
  return { text: status, detail: reasons[0] ?? null };
}

/** Publication column text: status plus the reason it is not moving. */
export function publicationLabel(
  execution: Pick<ContentExecution, 'publication_status' | 'error' | 'job_status' | 'job_attempts'>,
): { text: string; detail: string | null } {
  const status = execution.publication_status ?? '—';
  const error = execution.error ?? null;
  if (status === 'pending' && error?.startsWith('publication_blocked:')) {
    return { text: 'blocked', detail: error.replace(/^publication_blocked:/, '') };
  }
  if (status === 'held' && error?.startsWith('publication_held:')) {
    return { text: 'held', detail: error.replace(/^publication_held:/, '') };
  }
  if (status === 'queued' && execution.job_status === 'queued' && (execution.job_attempts ?? 0) > 0) {
    return { text: `retrying (attempt ${execution.job_attempts})`, detail: error };
  }
  return { text: status, detail: status === 'failed' ? error : null };
}

export function verificationLabel(verification: UrlVerification | null | undefined): string | null {
  if (!verification) return null;
  switch (verification.status) {
    case 'verified':
      return 'Live and verified';
    case 'reachable':
      return 'Live (content not in served HTML)';
    case 'failed':
      return `Not reachable (${verification.reason ?? 'unknown'})`;
    default:
      return verification.status;
  }
}
