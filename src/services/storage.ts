// ── Storage helpers ────────────────────────────────────────────────────────────
// Thin wrappers around localStorage/sessionStorage that handle JSON
// serialisation and silent failures (e.g. private browsing, quota exceeded).

// ── localStorage ─────────────────────────────────────────────────────────────

export const storage = {
  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : null;
    } catch {
      return null;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      console.warn(`[storage] Failed to write key "${key}" to localStorage.`);
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Silently fail
    }
  },

  clear(): void {
    try {
      localStorage.clear();
    } catch {
      // Silently fail
    }
  },
};

// ── sessionStorage ────────────────────────────────────────────────────────────

export const session = {
  get<T>(key: string): T | null {
    try {
      const item = sessionStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : null;
    } catch {
      return null;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      console.warn(`[session] Failed to write key "${key}" to sessionStorage.`);
    }
  },

  remove(key: string): void {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // Silently fail
    }
  },

  clear(): void {
    try {
      sessionStorage.clear();
    } catch {
      // Silently fail
    }
  },
};

// ── Raw string helpers (for tokens — stored as plain strings, not JSON) ───────

export const rawStorage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  set(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      console.warn(`[rawStorage] Failed to write key "${key}".`);
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // Silently fail
    }
  },
};
