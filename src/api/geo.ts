import apiClient from './axios';
import type {
  GeoAnalysisResponse,
  LeoItem,
  ImageSeoResponse,
  VideoSeoResponse,
} from '../types';

// ── GEO / LEO / VSEO Engine ───────────────────────────────────────────────────

export interface GeoAnalyzePayload {
  document_id: string;
  tenant_id: string;
  content: string;
  target_models?: string[];
}

/**
 * POST /api/v1/geo/analyze
 * Score content for AI engine citation readiness —
 * ChatGPT, Perplexity, Google AI Overviews.
 */
export async function analyzeGeo(
  payload: GeoAnalyzePayload,
): Promise<GeoAnalysisResponse> {
  const { data } = await apiClient.post<GeoAnalysisResponse>(
    '/api/v1/geo/analyze',
    payload,
  );
  return data;
}

// ── LEO (Live Entity Optimisation) ────────────────────────────────────────────

/**
 * POST /api/v1/leo/items
 * Build a Live Entity Optimisation item — Schema.org Product/Entity markup.
 */
export async function createLeoItem(item: LeoItem): Promise<unknown> {
  const { data } = await apiClient.post('/api/v1/leo/items', item);
  return data;
}

export interface LeoFeedQuery {
  page?: number;
  page_size?: number;
  tenant_name?: string;
  feed_url?: string;
}

/**
 * POST /api/v1/leo/feed
 * Generate a paginated LEO feed for multiple products.
 */
export async function generateLeoFeed(
  items: LeoItem[],
  query?: LeoFeedQuery,
): Promise<unknown> {
  const { data } = await apiClient.post('/api/v1/leo/feed', items, {
    params: { page: 1, page_size: 20, ...query },
  });
  return data;
}

// ── VSEO (Visual SEO) ─────────────────────────────────────────────────────────

export interface ImageSeoPayload {
  url: string;
  alt_text: string;
  caption?: string;
  filename?: string;
  width?: number;
  height?: number;
  file_size_kb?: number;
  author?: string;
}

/**
 * POST /api/v1/vseo/image
 * Score a single image for visual SEO — alt text, caption, filename, technical.
 */
export async function analyzeImageSeo(
  payload: ImageSeoPayload,
): Promise<ImageSeoResponse> {
  const { data } = await apiClient.post<ImageSeoResponse>(
    '/api/v1/vseo/image',
    payload,
  );
  return data;
}

/**
 * POST /api/v1/vseo/page-images
 * Score all images on a page — aggregate + per-image breakdown.
 */
export async function analyzePageImages(
  images: ImageSeoPayload[],
): Promise<unknown> {
  const { data } = await apiClient.post('/api/v1/vseo/page-images', images);
  return data;
}

export interface VideoSeoPayload {
  url: string;
  name: string;
  description: string;
  thumbnail_url?: string;
  duration_iso?: string; // ISO 8601 e.g. "PT5M30S"
  upload_date?: string;
  embed_url?: string;
  transcript_segments?: Array<{ start: number; text: string }>;
}

/**
 * POST /api/v1/vseo/video
 * Score a video for visual SEO — metadata, transcript coverage, schema.
 */
export async function analyzeVideoSeo(
  payload: VideoSeoPayload,
): Promise<VideoSeoResponse> {
  const { data } = await apiClient.post<VideoSeoResponse>(
    '/api/v1/vseo/video',
    payload,
  );
  return data;
}
