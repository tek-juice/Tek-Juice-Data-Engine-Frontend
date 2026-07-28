import apiClient from './axios';
import type {
  TelemetrySummary,
  TelemetryTimeseriesPoint,
  TelemetryError,
  QueueStatus,
} from '../types';

// ── Telemetry ─────────────────────────────────────────────────────────────────

export interface EmitEventPayload {
  event_type: string;
  service: string;
  payload: Record<string, unknown>;
  tenant_id: string;
  duration_ms?: number;
  status?: string;
}

/**
 * POST /api/v1/telemetry/emit
 * Emit a custom event from the frontend into the pipeline (e.g. user actions).
 * Returns 202 Accepted.
 */
export async function emitTelemetryEvent(
  payload: EmitEventPayload,
): Promise<void> {
  await apiClient.post('/api/v1/telemetry/emit', payload);
}

/**
 * GET /api/v1/telemetry/summary
 * Event counts, error rates, and service health summary.
 */
export async function getTelemetrySummary(
  hours = 24,
  tenant_id?: string,
): Promise<TelemetrySummary> {
  const { data } = await apiClient.get<TelemetrySummary>(
    '/api/v1/telemetry/summary',
    { params: { hours, ...(tenant_id && { tenant_id }) } },
  );
  return data;
}

/**
 * GET /api/v1/telemetry/timeseries
 * Events-per-interval time series for throughput charts.
 */
export async function getTelemetryTimeseries(
  hours = 24,
  interval_minutes = 60,
): Promise<TelemetryTimeseriesPoint[]> {
  const { data } = await apiClient.get<TelemetryTimeseriesPoint[]>(
    '/api/v1/telemetry/timeseries',
    { params: { hours, interval_minutes } },
  );
  return data;
}

/**
 * GET /api/v1/telemetry/errors
 * Error event log across all services.
 */
export async function getTelemetryErrors(
  limit = 100,
): Promise<TelemetryError[]> {
  const { data } = await apiClient.get<TelemetryError[]>(
    '/api/v1/telemetry/errors',
    { params: { limit } },
  );
  return data;
}

/**
 * GET /api/v1/telemetry/queue
 * Redis queue depth and buffer status.
 */
export async function getQueueStatus(): Promise<QueueStatus> {
  const { data } = await apiClient.get<QueueStatus>('/api/v1/telemetry/queue');
  return data;
}
