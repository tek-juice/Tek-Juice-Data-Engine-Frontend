import apiClient from './axios';
import type { ApprovalDecision } from './dashboard';

export interface ContentReviewItem {
  execution_id: string;
  action_type: string | null;
  target_url: string | null;
  title: string | null;
  approval_status: string;
  publication_status: string;
  approval: ApprovalDecision;
  edited?: boolean;
  updated_at: string | null;
}

/** The full article under review. */
export interface ContentReviewDetail extends ContentReviewItem {
  content: string | null;
  meta_description: string | null;
  slug: string | null;
  primary_query: string | null;
  style_warnings: string[];
  review_edits: Array<{ editor: string; at: string; fields: string[] }>;
}

export interface ArticleEdits {
  title?: string;
  content?: string;
  meta_description?: string;
}

export interface ApprovalPolicy {
  website_id: string;
  mode: 'auto' | 'manual';
  hold_unverified_figures: boolean;
}

export async function listContentReviews(
  websiteId: string,
  status: 'held' | 'rejected' | 'approved' = 'held',
): Promise<ContentReviewItem[]> {
  const { data } = await apiClient.get<ContentReviewItem[]>(
    `/api/v1/websites/${websiteId}/content-reviews`,
    { params: { status } },
  );
  return data;
}

export async function reviewContent(
  websiteId: string,
  executionId: string,
  decision: 'approve' | 'reject',
  note?: string,
  edits?: ArticleEdits,
): Promise<{ execution_id: string; approval_status: string }> {
  const { data } = await apiClient.post(
    `/api/v1/websites/${websiteId}/content-reviews/${executionId}`,
    { decision, note: note || null, ...(edits ? { edits } : {}) },
  );
  return data;
}

export async function getContentReview(
  websiteId: string,
  executionId: string,
): Promise<ContentReviewDetail> {
  const { data } = await apiClient.get<ContentReviewDetail>(
    `/api/v1/websites/${websiteId}/content-reviews/${executionId}`,
  );
  return data;
}

/** Save a reviewer's corrections; the article stays held for review. */
export async function saveContentEdits(
  websiteId: string,
  executionId: string,
  edits: ArticleEdits,
): Promise<ContentReviewDetail> {
  const { data } = await apiClient.put<ContentReviewDetail>(
    `/api/v1/websites/${websiteId}/content-reviews/${executionId}`,
    edits,
  );
  return data;
}

export async function getApprovalPolicy(websiteId: string): Promise<ApprovalPolicy> {
  const { data } = await apiClient.get<ApprovalPolicy>(
    `/api/v1/websites/${websiteId}/approval-policy`,
  );
  return data;
}

export async function setApprovalPolicy(
  websiteId: string,
  policy: Pick<ApprovalPolicy, 'mode' | 'hold_unverified_figures'>,
): Promise<ApprovalPolicy> {
  const { data } = await apiClient.put<ApprovalPolicy>(
    `/api/v1/websites/${websiteId}/approval-policy`,
    policy,
  );
  return data;
}
