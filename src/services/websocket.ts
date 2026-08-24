import type { WsActivityEvent } from '../types';

const WS_BASE_URL =
  import.meta.env.VITE_WS_BASE_URL ?? 'ws://localhost:8011';
const RECONNECT_INTERVAL = Number(
  import.meta.env.VITE_WS_RECONNECT_INTERVAL ?? 5000,
);
const MAX_RECONNECT_ATTEMPTS = Number(
  import.meta.env.VITE_WS_MAX_RECONNECT_ATTEMPTS ?? 10,
);

type EventHandler = (event: WsActivityEvent) => void;
type StatusHandler = (status: 'connected' | 'disconnected' | 'error') => void;

/**
 * ActivityFeedSocket
 *
 * Connects to ws://localhost:8011/ws/activity?token=<jwt>
 * and provides auto-reconnect, typed message delivery, and clean teardown.
 *
 * Usage:
 *   const feed = new ActivityFeedSocket(token);
 *   feed.onMessage((event) => console.log(event));
 *   feed.connect();
 *   // later...
 *   feed.disconnect();
 */
export class ActivityFeedSocket {
  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private shouldReconnect = true;

  private messageHandlers: EventHandler[] = [];
  private statusHandlers: StatusHandler[] = [];

  constructor(private readonly token: string) {}

  // ── Public API ──────────────────────────────────────────────────────────────

  connect(): void {
    this.shouldReconnect = true;
    this.openSocket();
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.clearReconnectTimer();
    this.socket?.close(1000, 'Client disconnected');
    this.socket = null;
    this.reconnectAttempts = 0;
  }

  /** Register a handler that fires for every incoming activity event. */
  onMessage(handler: EventHandler): () => void {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter((h) => h !== handler);
    };
  }

  /** Register a handler that fires when the connection status changes. */
  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.push(handler);
    return () => {
      this.statusHandlers = this.statusHandlers.filter((h) => h !== handler);
    };
  }

  get isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private openSocket(): void {
    const url = `${WS_BASE_URL}/ws/activity?token=${encodeURIComponent(this.token)}`;

    try {
      this.socket = new WebSocket(url);
    } catch (err) {
      console.error('[WebSocket] Failed to construct socket:', err);
      this.scheduleReconnect();
      return;
    }

    this.socket.onopen = () => {
      console.log('[WebSocket] Connected to activity feed.');
      this.reconnectAttempts = 0;
      this.notifyStatus('connected');
    };

    this.socket.onmessage = (event: MessageEvent<string>) => {
      try {
        const parsed = JSON.parse(event.data) as WsActivityEvent;
        this.messageHandlers.forEach((h) => h(parsed));
      } catch {
        console.warn('[WebSocket] Received non-JSON message:', event.data);
      }
    };

    this.socket.onerror = () => {
      console.error('[WebSocket] Socket error.');
      this.notifyStatus('error');
    };

    this.socket.onclose = (event) => {
      console.warn(
        `[WebSocket] Connection closed — code ${event.code}, reason: "${event.reason}".`,
      );
      this.notifyStatus('disconnected');
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('[WebSocket] Max reconnect attempts reached. Giving up.');
      return;
    }

    this.reconnectAttempts += 1;
    const delay = RECONNECT_INTERVAL * Math.min(this.reconnectAttempts, 5); // progressive back-off up to 5×

    console.log(
      `[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})…`,
    );

    this.reconnectTimer = setTimeout(() => {
      if (this.shouldReconnect) {
        this.openSocket();
      }
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private notifyStatus(status: 'connected' | 'disconnected' | 'error'): void {
    this.statusHandlers.forEach((h) => h(status));
  }
}

// ── Singleton factory ─────────────────────────────────────────────────────────

let _instance: ActivityFeedSocket | null = null;

/**
 * Get (or create) the global ActivityFeedSocket singleton.
 * Call `getActivityFeed(token)` once at app boot.
 * Subsequent calls with the same instance return it unchanged.
 */
export function getActivityFeed(token: string): ActivityFeedSocket {
  if (!_instance) {
    _instance = new ActivityFeedSocket(token);
  }
  return _instance;
}

/**
 * Tear down the singleton — call on logout.
 */
export function destroyActivityFeed(): void {
  _instance?.disconnect();
  _instance = null;
}
