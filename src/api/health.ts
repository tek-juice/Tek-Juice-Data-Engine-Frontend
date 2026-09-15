import apiClient from './axios';
import type { HealthStatus } from '../types';

// ── Health ────────────────────────────────────────────────────────────────────

/**
 * GET /health
 * Full system health check — all services.
 * Public — no auth required.
 */
export async function getHealth(): Promise<HealthStatus> {
  const { data } = await apiClient.get<HealthStatus>('/health');
  return data;
}

/**
 * GET /health/db
 * Database-only health check.
 * Public — no auth required.
 */
export async function getDbHealth(): Promise<HealthStatus> {
  const { data } = await apiClient.get<HealthStatus>('/health/db');
  return data;
}
