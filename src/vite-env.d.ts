/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_WS_BASE_URL: string;
  readonly VITE_ENV: string;
  readonly VITE_TOKEN_STORAGE_KEY: string;
  readonly VITE_REFRESH_TOKEN_STORAGE_KEY: string;
  readonly VITE_API_TIMEOUT: string;
  readonly VITE_WS_RECONNECT_INTERVAL: string;
  readonly VITE_WS_MAX_RECONNECT_ATTEMPTS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
