import apiClient from './axios';
import type {
  GapAnalysisResponse,
  GapClustersResponse,
  GapCloseActionsResponse,
  GapCloseResponse,
  GapWriteResponse,
  DraftItem,
  DraftStatus,
} from '../types';

// ── Gap Detection & Auto-Closure ──────────────────────────────────────────────

export interface GapAnalyzePayload {
  document_id: string;
  tenant_id: string;
  gap_threshold?: number; // default 0.40
  max_gaps?: number;      // default 20
}

/**
 * POST /api/v1/gaps/analyze
 * Run gap analysis on a document against recent trend signals.
 */
export async function analyzeGaps(
  payload: GapAnalyzePayload,
): Promise<GapAnalysisResponse> {
  const { data } = await apiClient.post<GapAnalysisResponse>(
    '/api/v1/gaps/analyze',
    { gap_threshold: 0.4, max_gaps: 20, ...payload },
  );
  return data;
}

/**
 * GET /api/v1/gaps/history/{document_id}
 * Full gap analysis history — shows coverage improvement over time.
 */
export async function getGapHistory(
  document_id: string,
  tenant_id: string,
): Promise<GapAnalysisResponse[]> {
  const { data } = await apiClient.get<GapAnalysisResponse[]>(
    `/api/v1/gaps/history/${document_id}`,
    { params: { tenant_id } },
  );
  return data;
}

export interface GapClustersPayload {
  document_id: string;
  tenant_id: string;
  missing_topics: string[];
  document_content: string;
  max_clusters_per_topic?: number;
}

/**
 * POST /api/v1/gaps/clusters
 * Build Intent-Based Content Clusters from missing topics.
 * Returns 8 intent types per topic, authority score, and a full content brief.
 */
export async function buildGapClusters(
  payload: GapClustersPayload,
): Promise<GapClustersResponse> {
  const { data } = await apiClient.post<GapClustersResponse>(
    '/api/v1/gaps/clusters',
    { max_clusters_per_topic: 4, ...payload },
  );
  return data;
}

/**
 * GET /api/v1/gaps/close-actions/{document_id}
 * Get the live auto-closure plan — full cluster spec of what Gemini will write.
 * Status: pending | drafts_ready | resolved
 */
export async function getCloseActions(
  document_id: string,
  tenant_id: string,
): Promise<GapCloseActionsResponse> {
  const { data } = await apiClient.get<GapCloseActionsResponse>(
    `/api/v1/gaps/close-actions/${document_id}`,
    { params: { tenant_id } },
  );
  return data;
}

/**
 * POST /api/v1/gaps/close/{document_id}
 * Force immediate gap detection + closure plan (synchronous).
 */
export async function closeGap(
  document_id: string,
  tenant_id: string,
): Promise<GapCloseResponse> {
  const { data } = await apiClient.post<GapCloseResponse>(
    `/api/v1/gaps/close/${document_id}`,
    null,
    { params: { tenant_id } },
  );
  return data;
}

/**
 * POST /api/v1/gaps/write/{document_id}
 * Dispatch Gemini writing agent for a document (async).
 * Poll GET /api/v1/gaps/drafts/{document_id} or wait for `drafts.ready` webhook.
 */
export async function dispatchWrite(
  document_id: string,
  tenant_id: string,
): Promise<GapWriteResponse> {
  const { data } = await apiClient.post<GapWriteResponse>(
    `/api/v1/gaps/write/${document_id}`,
    null,
    { params: { tenant_id } },
  );
  return data;
}

/**
 * GET /api/v1/gaps/drafts/{document_id}
 * Retrieve all Gemini-generated content drafts.
 * Filter by status: draft | embedded | approved | rejected
 */
export async function getDrafts(
  document_id: string,
  tenant_id: string,
  status?: DraftStatus,
): Promise<DraftItem[]> {
  const { data } = await apiClient.get<DraftItem[]>(
    `/api/v1/gaps/drafts/${document_id}`,
    { params: { tenant_id, ...(status && { status }) } },
  );
  return data;
}
