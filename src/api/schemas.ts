import apiClient from './axios';
import type { SchemaGenerateResponse, SchemaType } from '../types';

// ── Schema Factory ────────────────────────────────────────────────────────────

export interface GenerateSchemaPayload {
  document_id: string;
  tenant_id: string;
  content: string;
  schema_type: SchemaType;
  entities?: string[];
  metadata?: Record<string, unknown>;
  missing_topics?: string[];
}

/**
 * POST /api/v1/schemas/generate
 * Generate GEO-optimised JSON-LD structured data.
 * Embed the returned `script_tag` in the page <head>.
 *
 * Supported schema_types:
 * Article | FAQPage | HowTo | Product | Organisation | WebPage |
 * Dataset | SoftwareApplication | ImageObject | VideoObject
 */
export async function generateSchema(
  payload: GenerateSchemaPayload,
): Promise<SchemaGenerateResponse> {
  const { data } = await apiClient.post<SchemaGenerateResponse>(
    '/api/v1/schemas/generate',
    { entities: [], metadata: {}, missing_topics: [], ...payload },
  );
  return data;
}

/**
 * GET /api/v1/schemas/types
 * List all supported Schema.org types.
 */
export async function getSchemaTypes(): Promise<SchemaType[]> {
  const { data } = await apiClient.get<SchemaType[]>('/api/v1/schemas/types');
  return data;
}
