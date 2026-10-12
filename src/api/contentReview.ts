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
  updated_at: string | null;
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
): Promise<{ execution_id: string; approval_status: string }> {
  const { data } = await apiClient.post(
    `/api/v1/websites/${websiteId}/content-reviews/${executionId}`,
    { decision, note: note || null },
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
