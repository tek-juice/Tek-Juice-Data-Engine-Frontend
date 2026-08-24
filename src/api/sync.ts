import apiClient from './axios';
import type { SyncRun, SyncType } from '../types';

// ── Synchronization ───────────────────────────────────────────────────────────

/**
 * GET /api/v1/sync/status
 * Recent sync run history — useful for admin status panel.
 */
export async function getSyncStatus(): Promise<SyncRun[]> {
  const { data } = await apiClient.get<SyncRun[]>('/api/v1/sync/status');
  return data;
}

export interface TriggerSyncPayload {
  sync_type: SyncType;
  tenant_id?: string;
  resource?: string;
}

/**
 * POST /api/v1/sync/trigger
 * Manually trigger a data sync (full | incremental | cache).
 */
export async function triggerSync(
  payload: TriggerSyncPayload,
): Promise<unknown> {
  const { data } = await apiClient.post('/api/v1/sync/trigger', payload);
  return data;
}

// ── Cache ─────────────────────────────────────────────────────────────────────

export interface InvalidateCachePayload {
  keys: string[];
  tenant_id?: string;
}

/**
 * POST /api/v1/cache/invalidate
 * Invalidate Redis cache keys — use after bulk content updates.
 */
export async function invalidateCache(
  payload: InvalidateCachePayload,
): Promise<unknown> {
  const { data } = await apiClient.post('/api/v1/cache/invalidate', payload);
  return data;
}
