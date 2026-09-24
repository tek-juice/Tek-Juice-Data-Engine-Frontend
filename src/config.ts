/**
 * config.ts — Single source of truth for all environment-driven values.
 *
 * Every module that needs the API base URL, WebSocket URL, token storage keys,
 * or any other configurable constant must import from here — never read
 * import.meta.env directly in individual files.
 */

// ── API ───────────────────────────────────────────────────────────────────────

/** HTTP base URL for the backend API gateway, e.g. http://54.86.109.228:8000 */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? '';

/** Versioned API prefix, e.g. /api/v1 */
export const API_PREFIX: string =
  `/api/${import.meta.env.VITE_API_VERSION ?? 'v1'}`;

/** Full base for versioned API calls — convenience for building paths */
export const API_URL: string = `${API_BASE_URL}${API_PREFIX}`;

/** Request timeout in milliseconds */
export const API_TIMEOUT: number =
  Number(import.meta.env.VITE_API_TIMEOUT ?? 30000);

// ── WebSocket ─────────────────────────────────────────────────────────────────

/** WebSocket base URL, e.g. ws://54.86.109.228:8000 */
export const WS_BASE_URL: string =
  import.meta.env.VITE_WS_BASE_URL ?? '';

/** Path for the activity feed WebSocket endpoint */
export const WS_ACTIVITY_PATH = '/ws/activity';

/** Milliseconds between reconnect attempts */
export const WS_RECONNECT_INTERVAL: number =
  Number(import.meta.env.VITE_WS_RECONNECT_INTERVAL ?? 5000);

/** Maximum number of reconnect attempts before giving up */
export const WS_MAX_RECONNECT_ATTEMPTS: number =
  Number(import.meta.env.VITE_WS_MAX_RECONNECT_ATTEMPTS ?? 10);

// ── Auth / Storage ────────────────────────────────────────────────────────────

/** localStorage key for the JWT access token */
export const TOKEN_KEY: string =
  import.meta.env.VITE_TOKEN_STORAGE_KEY ?? 'data_engine_token';

/** localStorage key for the JWT refresh token */
export const REFRESH_KEY: string =
  import.meta.env.VITE_REFRESH_TOKEN_STORAGE_KEY ?? 'data_engine_refresh_token';

// ── Pagination ────────────────────────────────────────────────────────────────

/** Default page size for list/document fetch calls */
export const DEFAULT_PAGE_SIZE = 50;

// ── Environment ───────────────────────────────────────────────────────────────

export const IS_PRODUCTION: boolean =
  import.meta.env.VITE_ENV === 'production';
