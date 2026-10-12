import apiClient from './axios';
import type {
  DashboardOverview,
  DocumentListItem,
  ActivityLogEntry,
  PaginatedQuery,
  DocumentStatus,
  TenantSummary,
  TenantPerformance,
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

// ── Authenticated Proxy ───────────────────────────────────────────────────────

/**
 * Proxy — GET/POST/PUT/DELETE/PATCH /api/v1/{service}/{path}
 * Routes authenticated requests to any downstream microservice.
 */
export async function proxyRequest<T = unknown>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  service: string,
  path: string,
  body?: unknown,
  params?: Record<string, unknown>,
): Promise<T> {
  const { data } = await apiClient.request<T>({
    method,
    url: `/api/v1/${service}/${path}`,
    data: body,
    params,
  });
  return data;
}


// ── Dashboard & Analytics ─────────────────────────────────────────────────────

/**
 * GET /api/v1/dashboard/overview
 * Platform overview: document count, avg gap score, coverage %, recent activity.
 */
export async function getDashboardOverview(): Promise<DashboardOverview> {
  const { data } = await apiClient.get<DashboardOverview>(
    '/api/v1/dashboard/overview',
  );
  return data;
}

/**
 * GET /api/v1/dashboard/documents
 * Paginated document list with status, chunk count, and metadata.
 */
export async function getDashboardDocuments(
  params?: PaginatedQuery & { status?: DocumentStatus },
): Promise<DocumentListItem[]> {
  const { data } = await apiClient.get<{ items: DocumentListItem[] } | DocumentListItem[]>(
    '/api/v1/dashboard/documents',
    { params: { page: 1, page_size: 20, ...params } },
  );
  // Backend returns a paginated envelope { items, total, page, page_size }
  return Array.isArray(data) ? data : (data as { items: DocumentListItem[] }).items ?? [];
}

/**
 * GET /api/v1/dashboard/activity-log
 * Recent system activity across all pipeline stages — live feed source.
 */
export async function getActivityLog(
  hours = 24,
  limit = 50,
): Promise<ActivityLogEntry[]> {
  const { data } = await apiClient.get<ActivityLogEntry[]>(
    '/api/v1/dashboard/activity-log',
    { params: { hours, limit } },
  );
  return data;
}

// ── Metrics ───────────────────────────────────────────────────────────────────

// ── Admin: Tenant / Product Performance ──────────────────────────────────────

/**
 * GET /api/v1/dashboard/admin/tenants
 * List all tenants (products/companies) using the platform.
 * Admin-only — requires an admin-scoped JWT.
 */
export async function listTenants(
  params?: { status?: 'active' | 'idle' | 'error'; limit?: number },
): Promise<TenantSummary[]> {
  const { data } = await apiClient.get<TenantSummary[]>(
    '/api/v1/dashboard/admin/tenants',
    { params: { limit: 100, ...params } },
  );
  return data;
}

/**
 * GET /api/v1/dashboard/admin/tenants/{tenant_id}
 * Full performance breakdown for a single tenant.
 */
export async function getTenantPerformance(
  tenant_id: string,
): Promise<TenantPerformance> {
  const { data } = await apiClient.get<TenantPerformance>(
    `/api/v1/dashboard/admin/tenants/${tenant_id}`,
  );
  return data;
}

// ── Tenant-scoped: Company's own performance ──────────────────────────────────

/**
 * GET /api/v1/dashboard/tenant/me
 * The calling tenant's own performance snapshot (scoped to their API key / JWT).
 */
export async function getMyTenantPerformance(): Promise<TenantPerformance> {
  const { data } = await apiClient.get<TenantPerformance>(
    '/api/v1/dashboard/tenant/me',
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
