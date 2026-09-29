import apiClient from './axios';

export interface Website {
  id: string;
  url: string;
  domain: string;
  status: string;
  page_count: number | null;
  last_crawled_at: string | null;
  created_at: string;
}

export interface WebsiteStatus {
  website_id: string;
  url: string;
  domain: string;
  status: string;
  stage: string | null;
  run_status: string | null;
  progress: Record<string, unknown> | null;
  page_count: number | null;
  last_crawled_at: string | null;
  verified_at: string | null;
}

export async function listWebsites(): Promise<Website[]> {
  const { data } = await apiClient.get<Website[]>('/api/v1/websites');
  return data;
}

export async function getWebsite(website_id: string): Promise<Website> {
  const { data } = await apiClient.get<Website>(
    `/api/v1/websites/${website_id}`,
  );
  return data;
}

export async function getWebsiteStatus(
  website_id: string,
): Promise<WebsiteStatus> {
  const { data } = await apiClient.get<WebsiteStatus>(
    `/api/v1/websites/${website_id}/status`,
  );
  return data;
}
