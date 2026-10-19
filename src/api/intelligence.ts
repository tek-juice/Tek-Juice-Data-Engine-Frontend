import apiClient from './axios';

export type EvidenceStatus = 'confirmed' | 'inferred' | 'unverified';
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'none';

export interface OfferingEvidence {
  type: string;
  source: string;
  observation: string;
  reliability: 'verified' | 'strong' | 'moderate' | 'weak';
  observed_at: string | null;
}

/** A product, service, plan or capability with its provenance. */
export interface Offering {
  id: string;
  name: string;
  kind: 'product' | 'service' | 'plan' | 'feature';
  status: EvidenceStatus;
  confidence: Exclude<ConfidenceLevel, 'none'>;
  origins: string[];
  evidence: OfferingEvidence[];
}

export interface OfferingsResult {
  state: 'identified' | 'unresolved';
  offerings: Offering[];
  /** Why nothing could be identified (state = unresolved). */
  missing: string[];
}

export type GeoScope =
  | 'LOCAL' | 'CITY' | 'SUBNATIONAL' | 'NATIONAL' | 'MULTI_COUNTRY'
  | 'CONTINENTAL_OR_REGIONAL' | 'GLOBAL' | 'MIXED' | 'UNDETERMINED';

export interface GeoMarket {
  name: string;
  level: 'global' | 'region' | 'country' | 'subnational' | 'city' | 'unresolved';
  country: string | null;
  status: string;
  confidence: Exclude<ConfidenceLevel, 'none'>;
  basis: string[];
  evidence: string[];
}

export interface GeoOfferingScope {
  offering: string;
  scope: GeoScope;
  confidence: ConfidenceLevel;
  basis: string[];
  conflicts: string[];
  delivery_model: string[];
  operational_markets: GeoMarket[];
  uses_site_wide_evidence: boolean;
}

export interface GeoEvidence {
  id: string;
  relation: string;
  place: { name: string; level: string; country: string | null };
  offering: string | null;
  evidence_type: string;
  reliability: 'verified' | 'strong' | 'moderate' | 'weak';
  source: string;
  observation: string;
  observed_at: string | null;
}

/** Evidence-based geographic market intelligence for one run. */
export interface Geography {
  scope: GeoScope;
  confidence: ConfidenceLevel;
  basis: string[];
  conflicts: string[];
  candidate_scopes: GeoScope[];
  delivery_model: string[];
  headquarters: GeoMarket[];
  offices: GeoMarket[];
  operational_markets: GeoMarket[];
  target_markets: GeoMarket[];
  observed_demand_markets: GeoMarket[];
  visibility_markets: GeoMarket[];
  competitive_markets: GeoMarket[];
  regulatory: GeoMarket[];
  unverified_markets: GeoMarket[];
  excluded_markets: GeoMarket[];
  offerings: GeoOfferingScope[];
  evidence: GeoEvidence[];
  missing_evidence: string[];
}

export interface ProductProfile {
  business_name: string | null;
  description: string | null;
  category: string | null;
  products?: string[];
  /** Supported services and capabilities (names only). */
  services: string[];
  /** Headquarters, offices and confirmed operational places. */
  locations: string[];
  target_markets?: string[];
  confidence: number;
  /** null for profiles built before offerings were tracked. */
  offerings?: OfferingsResult | null;
  /** null for profiles built before geographic intelligence. */
  geography?: Geography | null;
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
  /** open / in_progress / resolved (resolved = measured top-10 position for the query). */
  status: string;
  engine?: string | null;
  resolution?: {
    status: string; reason: string; checked_at: string; verified_at: string | null; rule: string;
    evidence: { source: string; position: number | null; impressions?: number; page?: string | null; note?: string } | null;
    published: { url: string; at: string | null } | null;
    history: { at: string; from: string; to: string; reason: string }[];
  } | null;
  resolved_at?: string | null;
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
  run_id?: string,
): Promise<IntelligenceSummary> {
  const { data } = await apiClient.get<IntelligenceSummary>(
    `/api/v1/intelligence/${website_id}`,
    { params: run_id ? { run_id } : undefined },
  );
  return data;
}

export async function getCompetitors(
  website_id: string,
  run_id?: string,
): Promise<Competitor[]> {
  const { data } = await apiClient.get<Competitor[]>(
    `/api/v1/intelligence/${website_id}/competitors`,
    { params: run_id ? { run_id } : undefined },
  );
  return data;
}

export async function getIntelligenceGaps(
  website_id: string,
  run_id?: string,
): Promise<IntelligenceGap[]> {
  const { data } = await apiClient.get<IntelligenceGap[]>(
    `/api/v1/intelligence/${website_id}/gaps`,
    { params: run_id ? { run_id } : undefined },
  );
  return data;
}

export async function getOpportunities(
  website_id: string,
  run_id?: string,
): Promise<IntelligenceOpportunity[]> {
  const { data } = await apiClient.get<IntelligenceOpportunity[]>(
    `/api/v1/intelligence/${website_id}/opportunities`,
    { params: run_id ? { run_id } : undefined },
  );
  return data;
}

export interface MarketProfile {
  id: string;
  website_id: string;
  primary_category: string | null;
  subcategories: string[];
  geographic_markets: string[];
  customer_segments: string[];
  commercial_intents: string[];
  informational_intents: string[];
  adjacent_topics: string[];
  related_markets: string[];
  entities: string[];
  terminology: string[];
  evidence: unknown;
  confidence: number | null;
  created_at: string;
  updated_at: string;
}

export async function getMarketProfile(
  website_id: string,
  run_id?: string,
): Promise<MarketProfile | null> {
  const { data } = await apiClient.get<MarketProfile | null>(
    `/api/v1/intelligence/${website_id}/market`,
    { params: run_id ? { run_id } : undefined },
  );
  return data;
}

export interface IntelligenceRun {
  id: string;
  website_id: string;
  status: string;
  stage: string | null;
  progress: Record<string, unknown> | null;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export async function getIntelligenceRuns(
  website_id: string,
): Promise<IntelligenceRun[]> {
  const { data } = await apiClient.get<IntelligenceRun[]>(
    `/api/v1/intelligence/${website_id}/runs`,
  );
  return data;
}

export interface DiscoveredQuery {
  id: string;
  website_id: string;
  run_id: string | null;
  query_text: string;
  intent: string | null;
  topic: string | null;
  location: string | null;
  discovery_method: string | null;
  relevance_score: number;
  business_value: number;
  status: string;
  serp_fetched_at: string | null;
  tenant_position: number | null;
  evidence: unknown;
  created_at: string;
}

export async function getDiscoveredQueries(
  website_id: string,
  run_id?: string,
): Promise<DiscoveredQuery[]> {
  const { data } = await apiClient.get<DiscoveredQuery[]>(
    `/api/v1/intelligence/${website_id}/queries`,
    { params: run_id ? { run_id } : undefined },
  );
  return data;
}

export interface SerpObservation {
  id: string;
  tenant_id: string;
  website_id: string;
  query_id: string | null;
  query_text: string;
  position: number | null;
  result_url: string | null;
  result_domain: string | null;
  result_title: string | null;
  result_snippet: string | null;
  engines: unknown;
  observed_at: string;
}

export interface SerpObservationsResponse {
  website_id: string;
  total: number;
  limit: number;
  offset: number;
  observations: SerpObservation[];
}

export async function getSerpObservations(
  website_id: string,
  limit = 100,
  offset = 0,
  run_id?: string,
): Promise<SerpObservationsResponse> {
  const { data } = await apiClient.get<SerpObservationsResponse>(
    `/api/v1/intelligence/${website_id}/serp-observations`,
    {
      params: {
        limit,
        offset,
        ...(run_id ? { run_id } : {}),
      },
    },
  );

  return data;
}
