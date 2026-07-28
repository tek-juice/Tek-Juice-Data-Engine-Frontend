import apiClient from './axios';
import type { CompareResponse, RankedCandidate } from '../types';

// ── Semantic Engine ───────────────────────────────────────────────────────────

/**
 * POST /api/v1/semantic/compare
 * Compute cosine similarity between two embedding vectors.
 */
export async function compareVectors(
  vector_a: number[],
  vector_b: number[],
): Promise<CompareResponse> {
  const { data } = await apiClient.post<CompareResponse>(
    '/api/v1/semantic/compare',
    { vector_a, vector_b },
  );
  return data;
}

export interface RankPayload {
  query_vector: number[];
  candidates: number[][];
  top_k: number;
}

/**
 * POST /api/v1/semantic/rank
 * Rank candidate vectors against a query vector — sorted by similarity.
 */
export async function rankVectors(
  payload: RankPayload,
): Promise<RankedCandidate[]> {
  const { data } = await apiClient.post<RankedCandidate[]>(
    '/api/v1/semantic/rank',
    payload,
  );
  return data;
}
