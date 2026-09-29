import apiClient from './axios';
import type {
  DashboardOverview,
  GapComparisonPoint,
  DocumentListItem,
  ActivityLogEntry,
  MetricsSummary,
  ThroughputPoint,
  TelemetryError,
  PipelineMetrics,
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
 * GET /api/v1/dashboard/gap-comparison/{document_id}
 * Before/after gap timeline for a document — powers a coverage improvement chart.
 */
export async function getGapComparison(
  document_id: string,
): Promise<GapComparisonPoint[]> {
  const { data } = await apiClient.get<GapComparisonPoint[]>(
    `/api/v1/dashboard/gap-comparison/${document_id}`,
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

/**
 * GET /api/v1/dashboard/metrics/summary
 * Event counts and error rate summary for the metrics panel.
 */
export async function getMetricsSummary(hours = 24): Promise<MetricsSummary> {
  const { data } = await apiClient.get<MetricsSummary>(
    '/api/v1/dashboard/metrics/summary',
    { params: { hours } },
  );
  return data;
}

/**
 * GET /api/v1/dashboard/metrics/throughput
 * Throughput time series — events per interval for charting.
 */
export async function getMetricsThroughput(
  hours = 24,
  interval_minutes = 60,
): Promise<ThroughputPoint[]> {
  const { data } = await apiClient.get<ThroughputPoint[]>(
    '/api/v1/dashboard/metrics/throughput',
    { params: { hours, interval_minutes } },
  );
  return data;
}

/**
 * GET /api/v1/dashboard/metrics/errors
 * Error event log — use for error rate panel.
 */
export async function getMetricsErrors(
  limit = 100,
): Promise<TelemetryError[]> {
  const { data } = await apiClient.get<TelemetryError[]>(
    '/api/v1/dashboard/metrics/errors',
    { params: { limit } },
  );
  return data;
}

/**
 * GET /api/v1/dashboard/metrics/pipeline
 * Per-stage pipeline latencies — ingest, chunk, embed, gap, write.
 */
export async function getPipelineMetrics(): Promise<PipelineMetrics> {
  const { data } = await apiClient.get<PipelineMetrics>(
    '/api/v1/dashboard/metrics/pipeline',
  );
  return data;
}

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
