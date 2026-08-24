import apiClient from './axios';
import type { EmbedResponse, EmbedInfo, VectorSearchResult } from '../types';

// ── Embedding Service ─────────────────────────────────────────────────────────

/**
 * POST /api/v1/embed
 * Generate embedding vectors for arbitrary text (Gemini by default).
 */
export async function embedTexts(
  texts: string[],
  provider?: string,
  batch_size?: number,
): Promise<EmbedResponse> {
  const { data } = await apiClient.post<EmbedResponse>('/api/v1/embed', {
    texts,
    ...(provider && { provider }),
    ...(batch_size !== undefined && { batch_size }),
  });
  return data;
}

/**
 * GET /api/v1/embed/info
 * Get active embedding provider, model name, and output dimensions.
 */
export async function getEmbedInfo(): Promise<EmbedInfo> {
  const { data } = await apiClient.get<EmbedInfo>('/api/v1/embed/info');
  return data;
}

// ── Vector Vault ──────────────────────────────────────────────────────────────

export interface VectorSearchPayload {
  query_vector: number[];
  tenant_id: string;
  top_k: number;
  similarity_threshold?: number;
  document_id?: string;
}

/**
 * POST /api/v1/vectors/search
 * Cosine-similarity search across all document vectors — powers semantic search UI.
 */
export async function searchVectors(
  payload: VectorSearchPayload,
): Promise<VectorSearchResult[]> {
  const { data } = await apiClient.post<VectorSearchResult[]>(
    '/api/v1/vectors/search',
    payload,
  );
  return data;
}

export interface StoreVectorPayload {
  chunk_id: string;
  document_id: string;
  tenant_id: string;
  embedding: number[];
  provider: string;
  model: string;
}

/**
 * POST /api/v1/vectors/store
 * Persist embedding vectors (called automatically by the pipeline).
 */
export async function storeVector(payload: StoreVectorPayload): Promise<void> {
  await apiClient.post('/api/v1/vectors/store', payload);
}

/**
 * DELETE /api/v1/vectors/document/{document_id}
 * Delete all vectors for a document. Returns 204.
 */
export async function deleteDocumentVectors(
  document_id: string,
  tenant_id: string,
): Promise<void> {
  await apiClient.delete(`/api/v1/vectors/document/${document_id}`, {
    params: { tenant_id },
  });
}
