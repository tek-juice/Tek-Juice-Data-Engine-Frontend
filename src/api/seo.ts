import apiClient from './axios';
import type { SeoAnalysisResponse, RankSnapshot, AuthoritySnapshot } from '../types';

// ── SEO Engine ────────────────────────────────────────────────────────────────

export interface SeoAnalyzePayload {
  document_id: string;
  tenant_id: string;
  content: string;
  target_keywords: string[];
  url?: string;
  title?: string;
}

/**
 * POST /api/v1/seo/analyze
 * Full on-page SEO analysis — keyword density, readability, structured data, issues.
 */
export async function analyzeSeo(
  payload: SeoAnalyzePayload,
): Promise<SeoAnalysisResponse> {
  const { data } = await apiClient.post<SeoAnalysisResponse>(
    '/api/v1/seo/analyze',
    payload,
  );
  return data;
}

export interface RankConfigPayload {
  tenant_id: string;
  domain: string;
  keyword: string;
  location_code?: number; // default 2840 (US)
  tags?: string[];
}

/**
 * POST /api/v1/seo/rank-config
 * Register a keyword + domain for daily SERP rank tracking via DataForSEO.
 * Returns 201 Created.
 */
export async function registerRankConfig(
  payload: RankConfigPayload,
): Promise<unknown> {
  const { data } = await apiClient.post('/api/v1/seo/rank-config', {
    location_code: 2840,
    tags: [],
    ...payload,
  });
  return data;
}

/**
 * GET /api/v1/seo/rankings/{domain}
 * SERP rank history — use to build a keyword position trend chart.
 */
export async function getRankings(
  domain: string,
  keyword: string,
  days = 30,
): Promise<RankSnapshot[]> {
  const { data } = await apiClient.get<RankSnapshot[]>(
    `/api/v1/seo/rankings/${domain}`,
    { params: { keyword, days } },
  );
  return data;
}

/**
 * GET /api/v1/seo/authority/{domain}
 * Domain authority and backlink history.
 */
export async function getDomainAuthority(
  domain: string,
  days = 90,
): Promise<AuthoritySnapshot[]> {
  const { data } = await apiClient.get<AuthoritySnapshot[]>(
    `/api/v1/seo/authority/${domain}`,
    { params: { days } },
  );
  return data;
}
