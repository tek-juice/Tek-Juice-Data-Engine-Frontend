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
  category: 'technical_access' | 'content' | 'external_corroboration';
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
