import apiClient from './axios';

export interface ProductProfile {
  business_name: string | null;
  description: string | null;
  category: string | null;
  services: string[];
  locations: string[];
  confidence: number;
}

export interface IntelligenceSummary {
  website_id: string;
  product: ProductProfile | null;
  queries_discovered: number;
  competitors_found: number;
  gaps_found: number;
  opportunities: number;
}

export interface Competitor {
  domain: string;
  category: string | null;
  appearance_count: number;
  query_count: number;
  avg_position: number | null;
  best_position: number | null;
  serp_overlap_score: number | null;
  confidence: number | null;
}

export interface IntelligenceGap {
  id: string;
  gap_type: string;
  title: string;
  description: string | null;
  query_text: string | null;
  topic: string | null;
  intent: string | null;
  severity: string | null;
  gap_score: number | null;
  competitor_domain: string | null;
  tenant_position: number | null;
  competitor_position: number | null;
  status: string;
  created_at: string;
}

export interface IntelligenceOpportunity {
  id: string;
  title: string;
  opportunity_type: string;
  target_topic: string | null;
  primary_query: string | null;
  intent: string | null;
  recommended_action: string | null;
  current_status: string | null;
  priority_score: number | null;
  score_relevance: number | null;
  score_business_value: number | null;
  score_intent_value: number | null;
  score_competitor_strength: number | null;
  score_reasons: unknown;
  status: string;
  created_at: string;
}

export async function getIntelligenceSummary(
  website_id: string,
): Promise<IntelligenceSummary> {
  const { data } = await apiClient.get<IntelligenceSummary>(
    `/api/v1/intelligence/${website_id}`,
  );
  return data;
}

export async function getCompetitors(
  website_id: string,
): Promise<Competitor[]> {
  const { data } = await apiClient.get<Competitor[]>(
    `/api/v1/intelligence/${website_id}/competitors`,
  );
  return data;
}

export async function getIntelligenceGaps(
  website_id: string,
): Promise<IntelligenceGap[]> {
  const { data } = await apiClient.get<IntelligenceGap[]>(
    `/api/v1/intelligence/${website_id}/gaps`,
  );
  return data;
}

export async function getOpportunities(
  website_id: string,
): Promise<IntelligenceOpportunity[]> {
  const { data } = await apiClient.get<IntelligenceOpportunity[]>(
    `/api/v1/intelligence/${website_id}/opportunities`,
  );
  return data;
}
