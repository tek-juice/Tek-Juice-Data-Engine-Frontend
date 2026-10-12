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

// ── Document Ingestion ────────────────────────────────────────────────────────

export type DocumentStatus =
  | 'queued'
  | 'preprocessing'
  | 'chunking'
  | 'embedding'
  | 'storing'
  | 'completed'
  | 'failed';

export interface UploadResponse {
  document_id: string;
  status: 'queued';
  filename: string;
  message: string;
}

export interface DocumentStatusResponse {
  document_id: string;
  filename: string;
  status: DocumentStatus;
  chunk_count: number;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentListItem extends DocumentStatusResponse {
  [key: string]: unknown; // Extended metadata from dashboard endpoint
}

// ── Embeddings ────────────────────────────────────────────────────────────────

export interface EmbedResponse {
  embeddings: number[][];
  provider: string;
  model: string;
  dimensions: number;
  count: number;
}

export interface EmbedInfo {
  provider: string;
  model: string;
  dimensions: number;
}

// ── Vectors ───────────────────────────────────────────────────────────────────

export interface VectorSearchResult {
  chunk_id: string;
  text: string;
  similarity: number;
  metadata: Record<string, unknown>;
}

// ── Semantic ──────────────────────────────────────────────────────────────────

export interface CompareResponse {
  similarity: number;
  dimensions: number;
}

export interface RankedCandidate {
  index: number;
  similarity: number;
  candidate: number[];
}

// ── Gap Detection ─────────────────────────────────────────────────────────────

export type GapSeverity = 'low' | 'medium' | 'high' | 'critical';
export type GapStatus = 'pending' | 'drafts_ready' | 'resolved';

export interface GapAnalysisResponse {
  gap_score: number;
  severity: GapSeverity;
  missing_topics: string[];
  recommendations: string[];
  before_coverage: number;
  after_coverage: number;
}

export interface GapCluster {
  topic: string;
  intent: string;
  priority: number;
  clusters: unknown[];
}

export interface GapClustersResponse {
  authority_score: number;
  coverage_gaps: string[];
  top_priority_clusters: GapCluster[];
  full_content_brief: unknown[];
  estimated_words_needed: number;
  clusters: GapCluster[];
}

export interface GapCloseActionsResponse {
  gap_score: number;
  severity: GapSeverity;
  missing_topics: string[];
  close_plan: { clusters: GapCluster[] };
  status: GapStatus;
  created_at: string;
  resolved_at?: string;
}

export interface GapCloseResponse {
  document_id: string;
  gap_score: number;
  severity: GapSeverity;
  actions: unknown[];
  clusters_created: number;
  estimated_words: number;
}

export interface GapWriteResponse {
  status: 'queued';
  document_id: string;
  message: string;
}

export interface DraftItem {
  id?: string;
  topic: string;
  intent: string;
  priority: number;
  draft_text: string;
  word_count: number;
  query_variants: string[];
  schema_types: string[];
  authority_signals: string[];
  content_brief: unknown[];
  // Quality Score fields (added by QS engine)
  geo_score?: number;
  aeo_score?: number;
  composite_score?: number;
  quality_score?: number;       // 1–10 Google Ads QS equivalent
  beats_paid_ads?: boolean;     // true if QS >= 8
  projected_position?: string;  // e.g. "#1–#2 — above most paid ads"
  model_used?: string;
  provider_used?: string;
  status?: DraftStatus;
  generated_at?: string;
}

export type DraftStatus = 'draft' | 'embedded' | 'approved' | 'rejected';

// ── Schema Factory ────────────────────────────────────────────────────────────

export type SchemaType =
  | 'Article'
  | 'FAQPage'
  | 'HowTo'
  | 'Product'
  | 'Organisation'
  | 'WebPage'
  | 'Dataset'
  | 'SoftwareApplication'
  | 'ImageObject'
  | 'VideoObject';

export interface SchemaGenerateResponse {
  jsonld: Record<string, unknown>;
  script_tag: string;
  metadata_html: string;
  open_graph: Record<string, string>;
  twitter_card: Record<string, string>;
  citation_score: number;
  zero_click_score: number;
  same_as_urls: string[];
  first_sentence: string;
}

// ── Trend Scraper ─────────────────────────────────────────────────────────────

export type ScraperSource = 'google' | 'bing' | 'news' | 'social_media';

export interface TrendingTopic {
  topic: string;
  platform: string;
  score?: number;
  timestamp?: string;
  [key: string]: unknown;
}

export interface Platform {
  name: string;
  enabled: boolean;
  [key: string]: unknown;
}

export interface DeadLetterItem {
  platform: string;
  query: string;
  error: string;
  attempted_at: string;
  [key: string]: unknown;
}

// ── SEO ───────────────────────────────────────────────────────────────────────

export interface SeoAnalysisResponse {
  overall_score: number;
  keyword_density: Record<string, number>;
  matched_keywords: string[];
  issues: string[];
  recommendations: string[];
  readability_score: number;
  schema_valid: boolean;
}

export interface RankSnapshot {
  keyword: string;
  position: number;
  ranking_url: string;
  search_volume: number;
  cpc: number;
  competition: number;
  snapshot_date: string;
}

export interface AuthoritySnapshot {
  domain_rank: number;
  total_backlinks: number;
  referring_domains: number;
  dofollow_backlinks: number;
  spam_score: number;
  new_backlinks_30d: number;
  lost_backlinks_30d: number;
  top_anchors: Array<{ anchor: string; count: number }>;
}

// ── GEO / LEO / VSEO ─────────────────────────────────────────────────────────

export interface GeoAnalysisResponse {
  llm_visibility_score: number;
  entity_coverage: number;
  citation_readiness: number;
  context_richness_score: number;
  extracted_entities: string[];
  recommendations: string[];
  optimised_content: string;
}

export interface LeoItem {
  id: string;
  name: string;
  description: string;
  brand?: string;
  sku?: string;
  gtin?: string;
  category?: string;
  url?: string;
  image_url?: string;
  tags?: string[];
  ai_summary?: string;
  offers?: unknown[];
}

export interface ImageSeoResponse {
  overall_score: number;
  alt_text_score: number;
  issues: string[];
  optimised_alt_text: string;
  schema_org: Record<string, unknown>;
}

export interface VideoSeoResponse {
  overall_score: number;
  metadata_score: number;
  transcript_score: number;
  ai_summary: string;
  schema_org: Record<string, unknown>;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface DashboardOverview {
  // Fields returned by the backend analytics_router /overview endpoint
  documents_completed: number;
  documents_failed: number;
  documents_queued: number;
  total_chunks: number;
  total_embeddings: number;
  gap_analyses_run: number;
  schemas_generated: number;
  trends_today: number;
  // Optional fields present when the engine has processed content
  avg_seo_score?: number;
  avg_geo_score?: number;
  avg_aeo_score?: number;
  avg_gap_score?: number;
  coverage_percentage?: number;
  open_gaps?: number;
  [key: string]: unknown;
}


export interface ActivityLogEntry {
  event_type: string;
  service: string;
  status?: string;
  duration_ms?: number;
  payload?: Record<string, unknown>;
  // Backend returns created_at.
  created_at?: string;
  timestamp?: string;
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

// ── Tenant / Product Performance ──────────────────────────────────────────────

/** Summary of a single tenant/product using the platform via API key */
export interface TenantSummary {
  tenant_id: string;
  name: string;                     // product / company name
  key_prefix: string;               // masked key prefix e.g. "de_prod"
  plan?: string;                    // free | pro | enterprise
  created_at: string;
  last_active?: string | null;

  // volume counters (lifetime or windowed)
  documents_total: number;
  api_calls_total: number;
  api_calls_24h: number;
  webhooks_delivered: number;

  // pipeline outcomes
  avg_gap_score: number;            // 0–1
  avg_seo_score: number;            // 0–100
  avg_geo_score: number;            // 0–100
  avg_aeo_score?: number;           // 0–100
  coverage_pct: number;             // 0–100
  drafts_generated: number;
  gaps_closed: number;

  // health
  error_rate: number;               // 0–1
  status: 'active' | 'idle' | 'error';
}

/** Per-hour API call time series for a single tenant */
export interface TenantUsagePoint {
  hour: string;      // ISO timestamp or "HH:00"
  api_calls: number;
  errors: number;
  avg_latency_ms: number;
}

/** A single pipeline event for a tenant's activity feed */
export interface TenantActivityEvent {
  event_type: string;
  service: string;
  document_id?: string;
  timestamp: string;
  status: 'success' | 'error' | 'pending';
  duration_ms?: number;
  payload?: Record<string, unknown>;
}

/** Detailed performance snapshot for one tenant */
export interface TenantPerformance {
  tenant: TenantSummary;
  usage_timeseries: TenantUsagePoint[];       // last 24h by hour
  recent_activity: TenantActivityEvent[];     // last 50 events
  gap_history: Array<{                        // last 14 days
    day: string;
    gap_score: number;
    coverage_before: number;
    coverage_after: number;
    gaps_closed: number;
  }>;
  visibility_history: Array<{                 // last 24h
    time: string;
    seo: number;
    geo: number;
    aeo: number;
  }>;
  /** Per-stage pipeline metrics from GET /api/v1/dashboard/metrics/pipeline */
  pipeline_metrics?: Record<string, { success?: number; error?: number; avg_latency_ms?: number }>;
}

// ── Quality Score (Google Ads Ad Rank Engine) ─────────────────────────────────

export interface QualityScoreDimension {
  name: string;
  score: number;        // 0–10
  status: 'Above Average' | 'Average' | 'Below Average';
  signals: string[];
  issues: string[];
  fixes: string[];
}

export type QualityScoreLabel = 'Perfect' | 'Strong' | 'Average' | 'Below Avg' | 'Poor';

export interface AdBenchmark {
  ad_position: string;
  ad_typical_qs: number;
  beats_this_ad: boolean;
  qs_gap: number;
  notes: string;
}

export interface UpliftStep {
  from_qs: number;
  to_qs: number;
  qs_gain: number;
  from_pos: number;
  to_pos: number;
  ctr_gain: string;
  milestone: string;
  action: string;
}

export interface RankSimulation {
  estimated_position: number;
  position_label: string;
  estimated_ctr: number;
  paid_ads_beaten: number;
  beats_all_paid_ads: boolean;
  ctr_multiplier: number;
  traffic_multiplier: string;
  qs_gap_to_position_1: number;
  target_qs_to_beat_ads: number;
  ad_benchmarks: AdBenchmark[];
  uplift_steps: UpliftStep[];
}

export interface QualityScoreResponse {
  // Headline
  quality_score: number;          // 1–10
  label: QualityScoreLabel;
  summary: string;
  beats_paid_ads: boolean;
  projected_position: string;
  score_to_next_band: number | null;

  // 3 QS dimensions
  dimensions: {
    snippet_attractiveness: QualityScoreDimension;
    keyword_alignment: QualityScoreDimension;
    content_experience: QualityScoreDimension;
  };

  // Actions
  priority_fixes: string[];
  quick_wins: string[];

  // Rank simulation vs paid ads
  rank_simulation: RankSimulation;
  action_plan: string[];

  // Supporting scores
  supporting_scores: {
    citation_readiness: number;
    aeo_answer_score: number;
    keyword_coverage: number | null;
    word_count: number;
  };
}

export interface QualityScoreRequest {
  content: string;
  title?: string;
  meta_description?: string;
  query?: string;
  target_keywords?: string[];
  monthly_search_volume?: number;
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

// ── AEO (Answer Engine Optimisation) ──────────────────────────────────────────

export interface AEOScoreBreakdown {
  overall_aeo_score: number;
  answer_readiness: number;
  voice_readiness: number;
  snippet_readiness: number;
  pz_readiness: number;
}

export interface AEOAnalysisResponse {
  document_id: string;
  tenant_id: string;
  scores: AEOScoreBreakdown;
  snippet_ready: boolean;
  spoken_answer: string;
  optimised_intro: string;
  pz_opportunities: number;
  questions_mapped: number;
  questions_answered: number;
  priority_actions: string[];
  quick_wins: string[];
  recommendations: string[];
  engine_targets: string[];
  analysed_at: string;
  word_count: number;
}

export interface AnswerScoreResponse {
  overall_score: number;
  directness_score: number;
  completeness_score: number;
  conciseness_score: number;
  verifiability_score: number;
  answer_type: string;
  word_count: number;
  starts_directly: boolean;
  has_filler_opener: boolean;
  snippet_ready: boolean;
  has_statistics: boolean;
  has_named_sources: boolean;
  completeness_signals: string[];
  issues: string[];
  recommendations: string[];
}

export interface QuestionMapItem {
  text: string;
  intent: string;
  is_voice_search: boolean;
  is_long_tail?: boolean;
  has_direct_answer: boolean;
  answer_excerpt?: string;
  answer_quality: number;
}

export interface QuestionMapResponse {
  total_questions: number;
  answered_count: number;
  unanswered_count: number;
  coverage_score: number;
  voice_search_count: number;
  long_tail_count: number;
  intent_distribution: Record<string, number>;
  explicit_questions: QuestionMapItem[];
  implicit_questions: QuestionMapItem[];
  recommendations: string[];
}

export interface SnippetCandidate {
  text?: string;
  snippet_type: string;
  word_count: number;
  snippet_score: number;
  starts_with_direct_answer?: boolean;
  has_trigger_phrase?: boolean;
  readability_score?: number;
  optimised_text: string;
  issues?: string[];
}

export interface FeaturedSnippetResponse {
  has_snippet_ready_content: boolean;
  overall_snippet_score: number;
  snippet_type_distribution: Record<string, number>;
  best_candidate: SnippetCandidate | null;
  all_candidates: SnippetCandidate[];
  recommendations: string[];
}

export interface VoiceSearchResponse {
  overall_score: number;
  conversational_score: number;
  answer_length_score: number;
  question_alignment_score: number;
  local_intent_score: number;
  word_count: number;
  is_conversational: boolean;
  has_local_intent: boolean;
  has_filler_words: boolean;
  detected_voice_patterns: string[];
  spoken_answer: string;
  optimised_for_voice: string;
  recommendations: string[];
}

export interface PositionZeroOpportunity {
  position_zero_type: string;
  readiness_score: number;
  content_block?: string;
  required_changes: string[];
  trigger_found?: boolean;
}

export interface PositionZeroResponse {
  overall_pz_score: number;
  total_opportunities: number;
  high_readiness_count: number;
  type_breakdown: Record<string, number>;
  people_also_ask_questions: string[];
  knowledge_panel_signals: string[];
  best_opportunity: PositionZeroOpportunity | null;
  all_opportunities: PositionZeroOpportunity[];
  recommendations: string[];
}

export interface AEOEngineTarget {
  id: string;
  type: string;
  description: string;
}
