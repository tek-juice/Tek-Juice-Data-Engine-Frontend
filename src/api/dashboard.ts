import apiClient from './axios';
import type {
  PaginatedQuery,
  VisibilityOverview,
  VisibilityPublishedResponse,
  VisibilityConnection,
  VisibilityGapItem,
  VisibilitySearchPerformanceResponse,
} from '../types';

// ── Visibility Dashboard ──────────────────────────────────────────────────────

/**
 * GET /api/v1/dashboard/visibility/overview?website_id={website_id}
 * Current website-scoped visibility, pipeline, intelligence, content and feedback state.
 */
export async function getVisibilityOverview(
  website_id: string,
): Promise<VisibilityOverview> {
  const { data } = await apiClient.get<VisibilityOverview>(
    '/api/v1/dashboard/visibility/overview',
    { params: { website_id } },
  );
  return data;
}

/**
 * GET /api/v1/dashboard/visibility/published?website_id={website_id}
 * Paginated published content from the canonical execution pipeline.
 */
export async function getVisibilityPublished(
  website_id: string,
  params?: PaginatedQuery,
): Promise<VisibilityPublishedResponse> {
  const { data } = await apiClient.get<VisibilityPublishedResponse>(
    '/api/v1/dashboard/visibility/published',
    {
      params: {
        website_id,
        page: 1,
        page_size: 20,
        ...params,
      },
    },
  );
  return data;
}

/**
 * GET /api/v1/dashboard/visibility/connection?website_id={website_id}
 * Current website connection and crawl state.
 */
export async function getVisibilityConnection(
  website_id: string,
): Promise<VisibilityConnection> {
  const { data } = await apiClient.get<VisibilityConnection>(
    '/api/v1/dashboard/visibility/connection',
    { params: { website_id } },
  );
  return data;
}

/**
 * GET /api/v1/dashboard/visibility/gaps?website_id={website_id}
 * Current intelligence gaps and downstream opportunity/content state.
 */
export async function getVisibilityGaps(
  website_id: string,
  limit = 20,
): Promise<VisibilityGapItem[]> {
  const { data } = await apiClient.get<VisibilityGapItem[]>(
    '/api/v1/dashboard/visibility/gaps',
    {
      params: {
        website_id,
        limit,
      },
    },
  );
  return data;
}

/**
 * GET /api/v1/dashboard/visibility/search-performance?website_id={website_id}
 * Publication state and measured SearXNG search performance.
 */
export async function getVisibilitySearchPerformance(
  website_id: string,
): Promise<VisibilitySearchPerformanceResponse> {
  const { data } = await apiClient.get<VisibilitySearchPerformanceResponse>(
    '/api/v1/dashboard/visibility/search-performance',
    { params: { website_id } },
  );
  return data;
}

export interface ContentStrategy {
  id: string;
  website_id: string;
  opportunity_id: string;
  objective: string | null;
  content_type: string | null;
  target_intent: string | null;
  primary_query: string | null;
  supporting_queries: string[];
  topic: string | null;
  entities: string[];
  required_sections: string[];
  competitor_evidence: unknown[];
  content_gaps: string[];
  schema_recommendations: string[];
  quality_requirements: Record<string, unknown>;
  status: string;
  writing_task_id: string | null;
  created_at: string;
  updated_at: string;
  opportunity_title?: string | null;
  opportunity_priority_score?: number | null;
}

export interface ContentStrategyListResponse {
  items: ContentStrategy[];
  total: number;
  page: number;
  page_size: number;
}

/**
 * GET /api/v1/dashboard/content-strategies?website_id={website_id}
 *
 * Canonical content strategy projection.
 * The backend endpoint will be finalized separately; the frontend
 * contract is intentionally ready for that projection.
 */
export async function getContentStrategies(
  website_id: string,
  params?: PaginatedQuery & { status?: string; run_id?: string },
): Promise<ContentStrategyListResponse> {
  const { data } = await apiClient.get<ContentStrategyListResponse>(
    '/api/v1/dashboard/content-strategies',
    {
      params: {
        website_id,
        page: 1,
        page_size: 20,
        ...params,
      },
    },
  );
  return data;
}

export interface ContentExecution {
  id: string;
  opportunity_id: string | null;
  content_strategy_id: string | null;
  action_type: string | null;
  target_url: string | null;
  target_title: string | null;
  approval_status: string | null;
  publication_status: string | null;
  published_url: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  opportunity_title: string | null;
  primary_query: string | null;
  error?: string | null;
  approval?: ApprovalDecision | null;
  job_status?: string | null;
  job_attempts?: number | null;
  url_verification?: UrlVerification | null;
}

export interface ApprovalDecision {
  decision: 'approved' | 'held' | 'rejected' | string;
  reasons: string[];
  policy?: { mode?: string; name?: string };
  decided_at?: string;
  review?: {
    decision: string;
    reviewer: string;
    note: string | null;
    reviewed_at: string;
    policy_decision?: string;
  };
}

export interface UrlVerification {
  status: 'verified' | 'reachable' | 'failed' | string;
  reason?: string;
  http_status?: number;
  url?: string;
  attempt?: number;
  checked_at?: string;
  /** Whether search engines can read the page (Data Engine check after publication). */
  indexability?: {
    prerendered: boolean;
    canonical: boolean | null;
    in_sitemap: boolean | null;
    indexable: boolean;
  };
  /** Whether AI answer engines can read the page and credit its canonical URL. */
  ai_readability?: {
    structured_data: boolean;
    faq_schema: boolean;
    speakable: boolean;
    markdown: boolean | null;
    llms_txt: boolean | null;
    ai_readable: boolean;
  };
}

export interface ContentExecutionListResponse {
  items: ContentExecution[];
  total: number;
  page: number;
  page_size: number;
}

/**
 * GET /api/v1/dashboard/content-executions
 * Canonical content execution pipeline records.
 */
export async function getContentExecutions(
  params?: PaginatedQuery & { status?: string; run_id?: string },
): Promise<ContentExecutionListResponse> {
  const { data } = await apiClient.get<ContentExecutionListResponse>(
    '/api/v1/dashboard/content-executions',
    {
      params: {
        page: 1,
        page_size: 20,
        ...params,
      },
    },
  );
  return data;
}

export interface AIPlatformSummary {
  asked: number;
  answered: number;
  failed: number;
  grounded: number;
  mentioned: number;
  recommended?: number;
  cited: number;
  retrieval_rate?: number | null;
  mention_rate?: number | null;
  recommendation_rate?: number | null;
  citation_rate: number | null;
  avg_citation_position?: number | null;
  share_of_voice?: number | null;
  claims_accurate?: number;
  claims_inaccurate?: number;
  claims_unverifiable?: number;
}

export interface AIAnswerRecord {
  platform: string;
  model: string | null;
  query_text: string;
  query_kind: 'brand' | 'recommendation' | 'published' | 'query';
  grounded: boolean;
  mentioned: boolean | null;
  recommended?: boolean | null;
  competitors_mentioned?: string[];
  accuracy?: { claims?: { claim: string; verdict: string }[]; error?: string } | null;
  diagnosis?: string | null;
  cited: boolean | null;
  cited_url: string | null;
  cited_rank: number | null;
  sources: { url: string; domain: string; title: string }[];
  answer_excerpt: string | null;
  error: string | null;
  measured_at: string | null;
}

export interface AISourceGap {
  domain: string;
  citations: number;
  questions: string[];
  platforms: string[];
  example_url: string | null;
}

export interface AIAction {
  category: 'technical_access' | 'content' | 'external_corroboration' | 'entity_clarity';
  automatic: boolean;
  action: string;
  detail: string;
  questions: string[];
}

export interface AIAnswersReport {
  measured_at: string | null;
  measurements?: number;
  configured_platforms: string[];
  platforms: Record<string, AIPlatformSummary>;
  previous?: Record<string, AIPlatformSummary> | null;
  baseline?: Record<string, AIPlatformSummary> | null;
  diagnoses?: Record<string, number>;
  diagnosis_categories?: Record<string, number>;
  access?: {
    result: {
      blocked_platforms: string[];
      unreadable_platforms: string[];
      sitemap: boolean | null;
      llms_txt: boolean | null;
      platforms: Record<string, { access: string }>;
    } | null;
    measured_at: string | null;
  };
  indexed_pages?: number | null;
  actions?: AIAction[];
  questions: AIAnswerRecord[];
  source_gaps: AISourceGap[];
  indexnow: {
    published: number;
    submitted: number;
    last_submitted_at: string | null;
    last_problem: string | null;
  } | null;
}

/**
 * GET /api/v1/dashboard/visibility/ai-answers?website_id={website_id}
 * Whether AI assistants mention and cite the website, and who they cite instead.
 */
export async function getAIAnswers(website_id: string): Promise<AIAnswersReport> {
  const { data } = await apiClient.get<AIAnswersReport>(
    '/api/v1/dashboard/visibility/ai-answers',
    { params: { website_id } },
  );
  return data;
}

export interface EntityFactItem {
  value: string;
  source: 'customer' | 'crawl' | 'inferred';
  verified: boolean;
  evidence: { url?: string; quote?: string; confirmed_by?: string }[];
}

export interface EntityFact {
  value?: string;
  items?: EntityFactItem[];
  source?: 'customer' | 'crawl' | 'inferred';
  verified?: boolean;
  evidence?: { url?: string; quote?: string; confirmed_by?: string }[];
}

export interface EntityProfile {
  website_id: string;
  facts: Record<string, EntityFact>;
  status: 'draft' | 'confirmed';
  confirmed_by: string | null;
  confirmed_at: string | null;
  customer_pages: number;
  unverified: string[];
  published_facts: Record<string, string | string[]>;
}

/** GET /api/v1/websites/{id}/entity — the business's verified source of truth. */
export async function getEntity(websiteId: string): Promise<EntityProfile> {
  const { data } = await apiClient.get<EntityProfile>(`/api/v1/websites/${websiteId}/entity`);
  return data;
}

/** PUT /api/v1/websites/{id}/entity — enter, correct or confirm facts (admin). */
export async function saveEntity(
  websiteId: string,
  facts: Record<string, string | string[] | null>,
  confirm: boolean,
): Promise<EntityProfile> {
  const { data } = await apiClient.put<EntityProfile>(`/api/v1/websites/${websiteId}/entity`, { facts, confirm });
  return data;
}

export interface OptimizationMetric {
  status: 'measured' | 'unavailable';
  value: number | Record<string, unknown> | null;
  formula: string;
  evidence: Record<string, unknown>;
  source: string | null;
}

export interface AuditFinding {
  type: string;
  severity: 'high' | 'medium' | 'low';
  fixable_by: 'automatic' | 'site_owner';
  urls: string[];
  count: number;
  evidence: string;
}

export interface OptimizationOverview {
  metrics: Record<string, OptimizationMetric>;
  site_audit: {
    pages_checked: number;
    published_pages: number;
    verified_pages: number;
    crawled_at: string | null;
    findings: AuditFinding[];
    counts: Record<string, number>;
  };
  competitors: { domain: string; category: string; appearance_count: number; best_position: number | null }[];
  work: { awaiting_review: number; publishing: number; published: number; opportunities: number;
          verification: Record<string, number> };
  note: string;
}

/** GET /api/v1/dashboard/visibility/optimization — scores with formulas and evidence. */
export async function getOptimization(website_id: string): Promise<OptimizationOverview> {
  const { data } = await apiClient.get<OptimizationOverview>('/api/v1/dashboard/visibility/optimization',
    { params: { website_id } });
  return data;
}

export interface DataConnection {
  provider: 'google_search_console' | 'google_analytics' | 'google_pagespeed' | 'bing_webmaster';
  status: 'not_connected' | 'pending' | 'connected' | 'needs_property' | 'error' | 'revoked';
  property: string | null;
  last_sync_at: string | null;
  last_error: string | null;
  auth?: 'oauth' | 'service_account' | 'api_key' | null;
}

export interface ConnectionsState {
  google_configured: boolean;
  /** The Data Engine's service account email to add as a user of the property, if configured. */
  google_service_account?: string | null;
  connections: DataConnection[];
}

export async function getConnections(websiteId: string): Promise<ConnectionsState> {
  const { data } = await apiClient.get(`/api/v1/websites/${websiteId}/connections`);
  return data;
}

/** Check the service account's access to this website's properties and connect (starts the first sync). */
export async function connectGoogleServiceAccount(websiteId: string): Promise<{
  connected: { provider: string; status: string; property: string | null }[];
  not_connected: { provider: string; reason: string }[];
}> {
  const { data } = await apiClient.post(`/api/v1/websites/${websiteId}/connections/google/service-account`, {});
  return data;
}

export interface SearchTotals {
  from: string; to: string; days: number; clicks: number; impressions: number;
  ctr: number | null; average_position: number | null; clicks_per_day: number | null; impressions_per_day: number | null;
}

export interface SearchResultsPage {
  url: string; published_at: string | null; kind: string; target_query: string | null;
  first_seen_in_google: string | null; impressions: number; clicks: number; average_position: number | null;
  target_query_result: { impressions: number; clicks: number; average_position: number | null } | null;
  top_queries: { query: string; impressions: number; clicks: number; average_position: number | null }[];
}

export type SearchResults =
  | { status: 'unavailable'; reason: string }
  | {
      status: 'measured'; source: string; property: string; last_sync_at: string | null;
      data_from: string; data_to: string; engine_started: string | null; engine_started_source: string;
      last_28_days: SearchTotals;
      weekly: { week: string; clicks: number; impressions: number; ctr: number | null; average_position: number | null }[];
      comparison: {
        verdict: 'measured' | 'too_early' | 'too_little_data'; note: string;
        before: SearchTotals | null; after: SearchTotals;
        change: { clicks_per_day: number | null; impressions_per_day: number | null; ctr: number | null;
                  average_position_places: number | null } | null;
      } | null;
      published_pages: { count: number; appearing_in_google: number; with_clicks: number; impressions: number;
                         clicks: number; pages: SearchResultsPage[] };
      search_gaps_closed: { targets: number; appearing: number; top_10: number; clicked: number; definition: string };
      new_queries_since_start: number | null;
      caveats: string[];
    };

/** GET /api/v1/dashboard/visibility/search-results — Google Search results since the engine started. */
export async function getSearchResults(website_id: string): Promise<SearchResults> {
  const { data } = await apiClient.get<SearchResults>('/api/v1/dashboard/visibility/search-results',
    { params: { website_id } });
  return data;
}

export async function startGoogleConnection(websiteId: string, returnUrl: string): Promise<string> {
  const { data } = await apiClient.post<{ authorization_url: string }>(
    `/api/v1/websites/${websiteId}/connections/google/start`, { return_url: returnUrl });
  return data.authorization_url;
}

export async function getConnectionProperties(websiteId: string, provider: string): Promise<{ property: string; name?: string }[]> {
  const { data } = await apiClient.get(`/api/v1/websites/${websiteId}/connections/${provider}/properties`);
  return data.properties;
}

export async function setConnectionProperty(websiteId: string, provider: string, property: string): Promise<void> {
  await apiClient.put(`/api/v1/websites/${websiteId}/connections/${provider}`, { property });
}

/** Measure page speed now (e.g. after deploying a fix); actions follow the result. */
export async function measurePageSpeed(websiteId: string): Promise<{ queued: boolean; detail: string }> {
  const { data } = await apiClient.post(`/api/v1/websites/${websiteId}/connections/google_pagespeed/measure`);
  return data;
}

export async function disconnectConnection(websiteId: string, provider: string): Promise<void> {
  await apiClient.delete(`/api/v1/websites/${websiteId}/connections/${provider}`);
}

export interface OptimizationAction {
  id: string;
  kind: string;
  tier: 1 | 2 | 3;
  status: string;
  title: string;
  rationale: string;
  urls: string[];
  query_text: string | null;
  expected_outcome: string | null;
  validation: { method?: string };
  priority_score: number;
  priority_factors: Record<string, number | string>;
  outcome: { label?: string; direction?: string; changes?: Record<string, unknown>; note?: string } | null;
  executed_by: 'engine' | 'site_owner';
  updated_at: string | null;
}

export async function getActions(websiteId: string): Promise<{ policy: Record<string, string>; priority_formula: string;
  actions: OptimizationAction[]; counts: Record<string, number> }> {
  const { data } = await apiClient.get(`/api/v1/websites/${websiteId}/actions`);
  return data;
}

export async function decideAction(websiteId: string, actionId: string, decision: 'approve' | 'reject', note?: string): Promise<void> {
  await apiClient.post(`/api/v1/websites/${websiteId}/actions/${actionId}/${decision}`, { note });
}

export async function connectBing(websiteId: string, apiKey: string, siteUrl: string): Promise<void> {
  await apiClient.post(`/api/v1/websites/${websiteId}/connections/bing`, { api_key: apiKey, site_url: siteUrl });
}

export async function rollbackAction(websiteId: string, actionId: string): Promise<void> {
  await apiClient.post(`/api/v1/websites/${websiteId}/actions/${actionId}/rollback`);
}

export interface Experiment {
  id: string;
  kind: string;
  status: string;
  hypothesis: string;
  metric: string;
  assignment: { treatment?: string[]; control?: string[] };
  result: { decision?: string; effect?: number | null; label?: string; sufficient_data?: boolean; note?: string } | null;
  guardrails: { unchanged?: string[] };
  history: { at: string; status: string; note: string }[];
  started_at: string | null;
  ends_at: string | null;
}

export async function getExperiments(websiteId: string): Promise<Experiment[]> {
  const { data } = await apiClient.get<{ experiments: Experiment[] }>(`/api/v1/websites/${websiteId}/experiments`);
  return data.experiments;
}

export async function startExperiment(websiteId: string): Promise<{ status: string; reason?: string }> {
  const { data } = await apiClient.post(`/api/v1/websites/${websiteId}/experiments`);
  return data;
}

export async function cancelExperiment(websiteId: string, experimentId: string): Promise<void> {
  await apiClient.post(`/api/v1/websites/${websiteId}/experiments/${experimentId}/cancel`);
}

// ── Performance (PageSpeed findings and code-free remediation) ─────────────

export interface PerformanceFinding {
  id: string;
  url: string;
  strategy: 'mobile' | 'desktop';
  audit_id: string;
  category: string;
  category_label: string;
  title: string;
  observed_display: string | null;
  threshold: number | null;
  hypothesis: string;
  confidence: string;
  uncertainty: string | null;
  eligibility: 'code_free_candidate' | 'code_change_required' | 'not_controllable' | 'insufficient_evidence';
  code_free: boolean;
  risk: string;
  recommended_action: string;
  resources: { url?: string; selector?: string; snippet?: string; party?: string; wastedBytes?: number;
    wastedMs?: number; totalBytes?: number }[];
  metric: string | null;
  observed_value: number | null;
  impact: { savings_ms?: number; savings_bytes?: number; metric_savings?: Record<string, number> };
  verification: { resolved_when?: string; functional?: string[] };
  evidence: { source?: 'lab' | 'field'; scope?: string };
  plan: { status?: string; blocked_reason?: string | null; approval?: { mode: string; reason: string } } | null;
  status: string;
  state: string;
  action_id: string | null;
  observed_at: string | null;
}

export async function getPerformanceFindings(websiteId: string,
  params: { status?: string; strategy?: string; eligibility?: string; category?: string; limit?: number } = {}):
  Promise<{ findings: PerformanceFinding[]; total: number; counts: { by_category: Record<string, number>;
    by_eligibility: Record<string, number>; by_status: Record<string, number> }; categories: Record<string, string> }> {
  const { data } = await apiClient.get(`/api/v1/websites/${websiteId}/performance/findings`, { params });
  return data;
}

export async function requestPerformanceAssessment(websiteId: string, urls: string[] = []):
  Promise<{ queued: boolean; detail: string; rejected_urls: string[] }> {
  const { data } = await apiClient.post(`/api/v1/websites/${websiteId}/performance/assessments`,
    { urls, strategies: ['mobile', 'desktop'] });
  return data;
}

export async function planPerformanceFinding(websiteId: string, findingId: string):
  Promise<{ state: string; action_id: string | null; detail?: string; plan: PerformanceFinding['plan'] }> {
  const { data } = await apiClient.post(`/api/v1/websites/${websiteId}/performance/findings/${findingId}/plan`);
  return data;
}

export interface PerformanceRemediation {
  id: string;
  status: string;
  title: string;
  verification_outcome: string | null;
  rollback: { outcome?: string; reason?: string } | null;
  incident: { summary: string; action: string } | null;
  outcome: { reason?: string; before?: { score: number | null }; after?: { score: number | null } } | null;
}

export async function getPerformanceRemediations(websiteId: string):
  Promise<{ remediations: PerformanceRemediation[]; execution_enabled: boolean }> {
  const { data } = await apiClient.get(`/api/v1/websites/${websiteId}/performance/remediations`);
  return data;
}

export interface PerformanceAssessment {
  id: string;
  measured_at: string;
  url: string;
  strategy: 'mobile' | 'desktop';
  status: 'ok' | 'error';
  error: string | null;
  lab: { performance?: number | null; lcp_ms?: number | null; cls?: number | null; tbt_ms?: number | null;
    ttfb_ms?: number | null } | null;
  field: { category?: string; scope?: string } | null;
}

export async function getPerformanceAssessments(websiteId: string, limit = 50):
  Promise<{ assessments: PerformanceAssessment[]; total: number; calls_today: number; daily_limit: number }> {
  const { data } = await apiClient.get(`/api/v1/websites/${websiteId}/performance/assessments`, { params: { limit } });
  return data;
}
