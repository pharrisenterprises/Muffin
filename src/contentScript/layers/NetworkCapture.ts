/**
 * @fileoverview Network Capture Layer
 * @description Tracks network requests during recording.
 * Layer 4 of 4 in recording capture system.
 * 
 * @module contentScript/layers/NetworkCapture
 * @version 1.0.0
 * @since Phase 4
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface NetworkCaptureConfig {
  maxRequests: number;
  requestTTL: number;
  trackXHR: boolean;
  trackFetch: boolean;
  ignorePatterns: RegExp[];
}

const DEFAULT_CONFIG: NetworkCaptureConfig = {
  maxRequests: 50,
  requestTTL: 30000,
  trackXHR: true,
  trackFetch: true,
  ignorePatterns: [
    /\.png$/i, /\.jpg$/i, /\.gif$/i, /\.svg$/i,
    /\.woff/i, /\.ttf/i, /\.css$/i,
    /google-analytics/i, /hotjar/i, /segment/i
  ]
};

export interface NetworkRequest {
  id: string;
  url: string;
  method: string;
  status?: number;
  startTime: number;
  endTime?: number;
  pending: boolean;
}

export interface NetworkCaptureResult {
  recentRequests: Array<{
    url: string;
    method: string;
    status?: number;
    timestamp: number;
  }>;
  pendingRequests: number;
  pageLoaded: boolean;
}

// ============================================================================
// NETWORK CAPTURE CLASS
// ============================================================================

export class NetworkCapture {
  private config: NetworkCaptureConfig;
  private requests: Map<string, NetworkRequest> = new Map();
  private requestCounter = 0;
  private isTracking = false;

  // Original implementations to restore
  private originalFetch: typeof window.fetch | null = null;
  private originalXHROpen: typeof XMLHttpRequest.prototype.open | null = null;
  private originalXHRSend: typeof XMLHttpRequest.prototype.send | null = null;

  constructor(config?: Partial<NetworkCaptureConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ==========================================================================
  // TRACKING CONTROL
  // ==========================================================================

  startTracking(): void {
    if (this.isTracking) return;

    this.requests.clear();
    this.requestCounter = 0;
    this.isTracking = true;

    if (this.config.trackFetch) {
      this.interceptFetch();
    }

    if (this.config.trackXHR) {
      this.interceptXHR();
    }

    console.log('[NetworkCapture] Tracking started');
  }

  stopTracking(): void {
    if (!this.isTracking) return;

    this.restoreFetch();
    this.restoreXHR();

    this.isTracking = false;
    console.log('[NetworkCapture] Tracking stopped');
  }

  // ==========================================================================
  // CAPTURE
  // ==========================================================================

  getSnapshot(): NetworkCaptureResult {
    this.cleanupOldRequests();

    const recentRequests = Array.from(this.requests.values())
      .filter(r => !r.pending)
      .slice(-20)
      .map(r => ({
        url: r.url,
        method: r.method,
        status: r.status,
        timestamp: r.startTime
      }));

    const pendingCount = Array.from(this.requests.values())
      .filter(r => r.pending).length;

    return {
      recentRequests,
      pendingRequests: pendingCount,
      pageLoaded: document.readyState === 'complete'
    };
  }

  getPendingCount(): number {
    return Array.from(this.requests.values()).filter(r => r.pending).length;
  }

  isIdle(): boolean {
    return this.getPendingCount() === 0 && document.readyState === 'complete';
  }

  // ==========================================================================
  // FETCH INTERCEPTION
  // ==========================================================================

  private interceptFetch(): void {
    this.originalFetch = window.fetch;
    const self = this;

    window.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      
      if (self.shouldIgnore(url)) {
        return self.originalFetch!.call(window, input, init);
      }

      const requestId = self.addRequest(url, init?.method ?? 'GET');

      try {
        const response = await self.originalFetch!.call(window, input, init);
        self.completeRequest(requestId, response.status);
        return response;
      } catch (error) {
        self.completeRequest(requestId, 0);
        throw error;
      }
    };
  }

  private restoreFetch(): void {
    if (this.originalFetch) {
      window.fetch = this.originalFetch;
      this.originalFetch = null;
    }
  }

  // ==========================================================================
  // XHR INTERCEPTION
  // ==========================================================================

  private interceptXHR(): void {
    this.originalXHROpen = XMLHttpRequest.prototype.open;
    this.originalXHRSend = XMLHttpRequest.prototype.send;
    const self = this;

    XMLHttpRequest.prototype.open = function(
      method: string,
      url: string | URL,
      async?: boolean,
      username?: string | null,
      password?: string | null
    ): void {
      (this as any)._networkCaptureUrl = url.toString();
      (this as any)._networkCaptureMethod = method;
      return self.originalXHROpen!.call(this, method, url, async ?? true, username, password);
    };

    XMLHttpRequest.prototype.send = function(body?: Document | XMLHttpRequestBodyInit | null): void {
      const url = (this as any)._networkCaptureUrl as string;
      const method = (this as any)._networkCaptureMethod as string;

      if (!self.shouldIgnore(url)) {
        const requestId = self.addRequest(url, method);

        this.addEventListener('loadend', () => {
          self.completeRequest(requestId, this.status);
        });

        this.addEventListener('error', () => {
          self.completeRequest(requestId, 0);
        });
      }

      return self.originalXHRSend!.call(this, body);
    };
  }

  private restoreXHR(): void {
    if (this.originalXHROpen) {
      XMLHttpRequest.prototype.open = this.originalXHROpen;
      this.originalXHROpen = null;
    }
    if (this.originalXHRSend) {
      XMLHttpRequest.prototype.send = this.originalXHRSend;
      this.originalXHRSend = null;
    }
  }

  // ==========================================================================
  // REQUEST MANAGEMENT
  // ==========================================================================

  private addRequest(url: string, method: string): string {
    const id = `req_${++this.requestCounter}`;

    this.requests.set(id, {
      id,
      url: this.sanitizeUrl(url),
      method,
      startTime: Date.now(),
      pending: true
    });

    // Trim old requests
    while (this.requests.size > this.config.maxRequests) {
      const firstKey = this.requests.keys().next().value;
      if (firstKey) this.requests.delete(firstKey);
    }

    return id;
  }

  private completeRequest(id: string, status: number): void {
    const request = this.requests.get(id);
    if (request) {
      request.status = status;
      request.endTime = Date.now();
      request.pending = false;
    }
  }

  private cleanupOldRequests(): void {
    const cutoff = Date.now() - this.config.requestTTL;

    for (const [id, request] of Array.from(this.requests)) {
      if (request.startTime < cutoff && !request.pending) {
        this.requests.delete(id);
      }
    }
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private shouldIgnore(url: string): boolean {
    return this.config.ignorePatterns.some(pattern => pattern.test(url));
  }

  private sanitizeUrl(url: string): string {
    // Remove sensitive query params
    try {
      const parsed = new URL(url, window.location.origin);
      ['token', 'key', 'secret', 'password', 'auth'].forEach(param => {
        if (parsed.searchParams.has(param)) {
          parsed.searchParams.set(param, '[REDACTED]');
        }
      });
      return parsed.pathname + parsed.search;
    } catch {
      return url;
    }
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let instance: NetworkCapture | null = null;

export function getNetworkCapture(config?: Partial<NetworkCaptureConfig>): NetworkCapture {
  if (!instance) {
    instance = new NetworkCapture(config);
  }
  return instance;
}
