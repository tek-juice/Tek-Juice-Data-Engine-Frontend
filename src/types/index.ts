// ─────────────────────────────────────────────────────────────────────────────
// Shared TypeScript types for the Data Engine frontend
// Mirrors the backend API response shapes documented in the API reference.
// ─────────────────────────────────────────────────────────────────────────────

// ── Common ────────────────────────────────────────────────────────────────────

export interface PaginatedQuery {
  page?: number;
  page_size?: number;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  expires_in: number;
}

/** Who the browser session belongs to. Carries no token. */
export interface SessionUser {
  sub: string;
  tenant_id: string;
  role: string;
}

/** Login/register/refresh response in cookie transport: no tokens in the body. */
export interface SessionResponse {
  token_type: 'cookie';
  expires_in: number;
  user: SessionUser;
}

export interface ApiKeyResponse {
  key_id: string;
  api_key: string;
  prefix: string;
  name: string;
}

/** Shape returned by GET /api/v1/auth/api-keys (list endpoint — no raw key) */
export interface ApiKeyListItem {
  key_id: string;
  prefix: string;
  name: string;
  is_active?: boolean;
  created_at: string;
  last_used?: string | null;
}

export type WebhookEventType =
  | 'document.completed'
  | 'document.failed'
  | 'gap.detected'
  | 'gap.resolved'
  | 'drafts.ready'
  | 'schema.generated'
  | 'ranking.updated'
  | '*';

export interface WebhookEndpoint {
  endpoint_id: string;  // normalised from backend 'id'
  url: string;
  event_types: WebhookEventType[];
  description?: string;
  is_active?: boolean;
  secret?: string;      // Only returned on creation
  created_at: string;
}

export interface WebhookLogEntry {
  event_type: WebhookEventType;
  status_code: number;
  success: boolean;
  error?: string;
  duration_ms: number;
  attempted_at: string;
}

// ── WebSocket ─────────────────────────────────────────────────────────────────

export interface WsActivityEvent {
  event_type: string;
  service: string;
  tenant_id: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

// ── Health ────────────────────────────────────────────────────────────────────

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  services: Record<string, { status: string; latency_ms?: number }>;
}

// ── Visibility Dashboard ──────────────────────────────────────────────────────

export interface VisibilityWebsite {
  id: string;
  url: string;
  domain: string;
  status: string;
  verified_at: string | null;
  last_crawled_at: string | null;
  page_count: number;
}

export interface VisibilityPipeline {
  state: string;
  stage: string | null;
  run_id: string | null;
  run_status: string | null;
  progress: Record<string, unknown>;
  error: string | null;
  retry_count: number;
  started_at: string | null;
  completed_at: string | null;
}

export interface VisibilityIntelligence {
  gaps_total: number;
  gaps_open: number;
  /** A page targets the gap or the site appears below the top 10. */
  gaps_in_progress?: number;
  /** Measured top-10 position for the gap's query (Search Console, Bing or the engine's search checks). */
  gaps_resolved: number;
  avg_gap_score: number | null;
  opportunities_total: number;
  opportunities_open: number;
  opportunities_progressed: number;
  avg_priority_score: number | null;
}

export interface VisibilityContent {
  strategies_total: number;
  strategies_draft: number;
  strategies_progressed: number;
  executions_total: number;
  awaiting_approval: number;
  approved: number;
  rejected: number;
  awaiting_publication: number;
  published: number;
  failed: number;
  published_this_week: number;
  published_today: number;
}

export interface VisibilityFeedback {
  total_measurements: number;
  ranked_measurements: number;
  avg_position: number | null;
  improved: number;
  declined: number;
  unchanged: number;
  last_measured_at: string | null;
  newly_ranked?: number;
  dropped?: number;
  queries_tracked?: number;
  measurement_failures?: number;
  /** Measured, and the site was not shown for the query. */
  not_ranking?: number;
  /** Positions that are Google's own (Search Console), not the engine's search check. */
  google_positions?: number;
  published_tracked?: number;
  published_ranked?: number;
  /** Pages of the site the search index returns; null when unknown. */
  indexed_pages?: number | null;
}

export interface VisibilityRecentExecution {
  id: string;
  opportunity_id: string | null;
  content_strategy_id: string | null;
  action_type: string;
  target_url: string | null;
  target_title: string | null;
  approval_status: string;
  publication_status: string;
  published_url: string | null;
  published_at: string | null;
  error: string | null;
  created_at: string;
  opportunity_title: string | null;
  strategy_topic: string | null;
}

export interface VisibilityOverview {
  website: VisibilityWebsite;
  pipeline: VisibilityPipeline;
  intelligence: VisibilityIntelligence;
  content: VisibilityContent;
  feedback: VisibilityFeedback;
  recent_executions: VisibilityRecentExecution[];
}

export interface VisibilityPublishedItem {
  id: string;
  website_id: string;
  opportunity_id: string | null;
  content_strategy_id: string | null;
  action_type: string;
  target_url: string | null;
  target_title: string | null;
  published_url: string | null;
  published_at: string | null;
  created_at: string;
  opportunity_title: string | null;
  primary_query: string | null;
  topic: string | null;
  content_type: string | null;
  target_intent: string | null;
}

export interface VisibilityPublishedResponse {
  items: VisibilityPublishedItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface VisibilityConnection {
  website_id: string;
  product_name: string | null;
  website_url: string;
  domain: string;
  status: string;
  verified_at: string | null;
  last_crawled_at: string | null;
  page_count: number;
  meta: Record<string, unknown> | null;
  onboarding_status?: string;
  publication?: PublicationReadiness;
}

/** Secret-free S2S publication readiness for a website. */
export interface PublicationReadiness {
  transport: 's2s_connector';
  status: 'not_configured' | 'pending_verification' | 'verified' | 'failed' | string;
  ready: boolean;
  endpoint_host: string | null;
  capabilities: string[];
  contract_versions: string[];
  verified_at: string | null;
  failure_reason: string | null;
}

export interface VisibilityGapItem {
  id: string;
  run_id: string | null;
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
  engine?: string | null;
  resolution?: {
    status: string; reason: string; checked_at: string; verified_at: string | null; rule: string;
    evidence: { source: string; position: number | null; impressions?: number; clicks?: number; page?: string | null;
                note?: string } | null;
    published: { url: string; at: string | null } | null;
    history: { at: string; from: string; to: string; reason: string }[];
  } | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
  opportunity_count: number;
  strategy_count: number;
  execution_count: number;
}

export interface VisibilitySearchPerformance {
  rank_band: string;
  measurement_count: number;
  avg_position: number | null;
  improved: number;
  declined: number;
}

export interface VisibilitySearchPerformanceResponse {
  execution_state: Array<{
    approval_status: string;
    publication_status: string;
    content_count: number;
  }>;
  search_performance: VisibilitySearchPerformance[];
}
