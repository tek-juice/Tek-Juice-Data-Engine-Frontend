import apiClient from './axios';
import type { TrendingTopic, Platform, DeadLetterItem, ScraperSource } from '../types';

// ── Trend Scraper ─────────────────────────────────────────────────────────────

export interface ScrapeRunPayload {
  sources: ScraperSource[];
  queries: string[];
}

/**
 * POST /api/v1/scrape/run
 * Manually trigger a scrape run across selected sources.
 */
export async function runScrape(payload: ScrapeRunPayload): Promise<unknown> {
  const { data } = await apiClient.post('/api/v1/scrape/run', payload);
  return data;
}

/**
 * GET /api/v1/scrape/trending
 * Fetch latest scraped trending topics for the dashboard trend feed.
 */
export async function getTrendingTopics(): Promise<TrendingTopic[]> {
  const { data } = await apiClient.get<TrendingTopic[]>(
    '/api/v1/scrape/trending',
  );
  return data;
}

export interface IndirectScrapePayload {
  queries: string[];
}

/**
 * POST /api/v1/scrape/indirect
 * Collect public signals: Reddit, YouTube RSS, GitHub trending, Wikipedia.
 * No API keys needed.
 */
export async function runIndirectScrape(
  payload: IndirectScrapePayload,
): Promise<unknown> {
  const { data } = await apiClient.post('/api/v1/scrape/indirect', payload);
  return data;
}

/**
 * GET /api/v1/scrape/platforms
 * List all supported platforms and their enabled/disabled status.
 */
export async function getScraperPlatforms(): Promise<Platform[]> {
  const { data } = await apiClient.get<Platform[]>('/api/v1/scrape/platforms');
  return data;
}

/**
 * GET /api/v1/scrape/dead-letter
 * Items that failed scraping — useful for diagnostics panel.
 */
export async function getDeadLetterItems(
  platform?: string,
  limit = 50,
): Promise<DeadLetterItem[]> {
  const { data } = await apiClient.get<DeadLetterItem[]>(
    '/api/v1/scrape/dead-letter',
    { params: { ...(platform && { platform }), limit } },
  );
  return data;
}
