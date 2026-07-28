import apiClient from './axios';
import type {
  UploadResponse,
  DocumentStatusResponse,
  DocumentListItem,
  PaginatedQuery,
  DocumentStatus,
} from '../types';

// ── Document Ingestion ────────────────────────────────────────────────────────

/**
 * POST /api/v1/ingest/upload
 * Upload a document. Triggers the full pipeline:
 * chunk → embed → gap-analyse → write drafts → push webhook.
 * Accepts: PDF, DOCX, HTML, TXT, CSV, JSON, MD
 */
export async function uploadDocument(
  file: File,
  source_type?: string,
  onUploadProgress?: (percent: number) => void,
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  if (source_type) {
    formData.append('source_type', source_type);
  }

  const { data } = await apiClient.post<UploadResponse>(
    '/api/v1/ingest/upload',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onUploadProgress
        ? (e) => {
            if (e.total) {
              onUploadProgress(Math.round((e.loaded / e.total) * 100));
            }
          }
        : undefined,
    },
  );
  return data;
}

/**
 * GET /api/v1/ingest/status/{document_id}
 * Poll processing status.
 * Status flow: queued → preprocessing → chunking → embedding → storing → completed | failed
 */
export async function getDocumentStatus(
  document_id: string,
): Promise<DocumentStatusResponse> {
  const { data } = await apiClient.get<DocumentStatusResponse>(
    `/api/v1/ingest/status/${document_id}`,
  );
  return data;
}

/**
 * GET /api/v1/ingest/documents
 * Paginated list of all documents for the current tenant.
 */
export async function listDocuments(
  params?: PaginatedQuery & { status?: DocumentStatus },
): Promise<DocumentListItem[]> {
  const { data } = await apiClient.get<DocumentListItem[]>(
    '/api/v1/ingest/documents',
    { params: { page: 1, page_size: 20, ...params } },
  );
  return data;
}

/**
 * DELETE /api/v1/ingest/documents/{document_id}
 * Soft-delete a document. Cascades to chunks and embeddings. Returns 204.
 */
export async function deleteDocument(document_id: string): Promise<void> {
  await apiClient.delete(`/api/v1/ingest/documents/${document_id}`);
}

// ── Polling helper ────────────────────────────────────────────────────────────

/**
 * Poll document status until it reaches `completed` or `failed`.
 * @param document_id  The document to poll.
 * @param intervalMs   Polling interval in milliseconds (default: 3000).
 * @param onStatus     Optional callback fired on each poll with the current status.
 * @returns            The final DocumentStatusResponse.
 */
export async function pollDocumentStatus(
  document_id: string,
  intervalMs = 3000,
  onStatus?: (status: DocumentStatusResponse) => void,
): Promise<DocumentStatusResponse> {
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const status = await getDocumentStatus(document_id);
        onStatus?.(status);
        if (status.status === 'completed' || status.status === 'failed') {
          resolve(status);
        } else {
          setTimeout(poll, intervalMs);
        }
      } catch (err) {
        reject(err);
      }
    };
    poll();
  });
}
