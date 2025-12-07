# NetworkCapture Content Specification

**File ID:** A6  
**File Path:** `src/contentScript/layers/NetworkCapture.ts`  
**Status:** CREATE  
**Priority:** P1

---

## Purpose

Network request capture layer that monitors HTTP/XHR/Fetch activity during recording sessions. Tracks pending requests, recent completions, and page load states to provide context for timing-sensitive actions. Helps identify when user actions trigger network activity (form submissions, AJAX calls) and enables smarter wait strategies during playback. This layer is lower priority than DOM/Vision/Mouse but provides valuable context for complex web applications.

---

## Dependencies

### Uses (imports from)
- None (uses native browser APIs)

### Used By (exports to)
- `../RecordingOrchestrator`: Retrieves network context during action capture
- `../EvidenceBuffer`: Stores network data for context
- `../../background/services/AutoWaiting`: Uses pending request count for wait decisions

---

## Interfaces

```typescript
/**
 * Configuration for NetworkCapture layer
 */
interface NetworkCaptureConfig {
  /** Enable network capture (default: true) */
  enabled: boolean;
  /** Maximum number of recent requests to track (default: 50) */
  maxRecentRequests: number;
  /** Request retention time in ms (default: 10000) */
  retentionTimeMs: number;
  /** Ignore requests matching these patterns */
  ignorePatterns: RegExp[];
  /** Track request bodies (default: false - privacy) */
  trackBodies: boolean;
  /** Track response bodies (default: false - memory) */
  trackResponses: boolean;
  /** Maximum body size to track in bytes (default: 1024) */
  maxBodySize: number;
}

/**
 * Tracked network request
 */
interface TrackedRequest {
  /** Unique request ID */
  id: string;
  /** Request URL */
  url: string;
  /** HTTP method */
  method: string;
  /** Request start timestamp */
  startTime: number;
  /** Request end timestamp (if complete) */
  endTime?: number;
  /** HTTP status code (if complete) */
  status?: number;
  /** Status text */
  statusText?: string;
  /** Request duration in ms (if complete) */
  duration?: number;
  /** Request type */
  type: RequestType;
  /** Whether request is still pending */
  pending: boolean;
  /** Request headers (subset) */
  headers?: Record<string, string>;
  /** Request body (if tracked and small) */
  body?: string;
  /** Response size in bytes */
  responseSize?: number;
  /** Error message if failed */
  error?: string;
  /** Initiator info (what triggered this request) */
  initiator?: {
    type: 'script' | 'xmlhttprequest' | 'fetch' | 'navigation' | 'other';
    url?: string;
  };
}

/**
 * Request type classification
 */
type RequestType = 
  | 'xhr'
  | 'fetch'
  | 'document'
  | 'script'
  | 'stylesheet'
  | 'image'
  | 'font'
  | 'media'
  | 'websocket'
  | 'other';

/**
 * Complete network capture result
 */
interface NetworkCaptureResult {
  /** Recent completed requests */
  recentRequests: TrackedRequest[];
  /** Currently pending request count */
  pendingCount: number;
  /** Currently pending request URLs */
  pendingUrls: string[];
  /** Total requests since capture started */
  totalRequests: number;
  /** Total failed requests */
  failedRequests: number;
  /** Page load state */
  pageLoadState: PageLoadState;
  /** Active WebSocket connections */
  activeWebSockets: number;
  /** Timestamp of last network activity */
  lastActivityTime: number;
}

/**
 * Page load state
 */
interface PageLoadState {
  /** Document ready state */
  readyState: DocumentReadyState;
  /** Whether all initial resources loaded */
  domContentLoaded: boolean;
  /** Whether window.onload fired */
  windowLoaded: boolean;
  /** Time since last network activity in ms */
  networkIdleTime: number;
}

/**
 * Network activity summary for a time window
 */
interface NetworkActivitySummary {
  /** Requests started in window */
  requestsStarted: number;
  /** Requests completed in window */
  requestsCompleted: number;
  /** Requests failed in window */
  requestsFailed: number;
  /** Average response time in window */
  averageResponseTime: number;
  /** Domains contacted */
  domains: string[];
}

/**
 * Layer status
 */
type NetworkCaptureStatus = 'idle' | 'ready' | 'capturing' | 'error' | 'disabled';
```

---

## Functions

```typescript
/**
 * NetworkCapture - Network request monitoring layer
 */
class NetworkCapture {
  private config: NetworkCaptureConfig;
  private status: NetworkCaptureStatus;
  private requests: Map<string, TrackedRequest>;
  private recentCompleted: TrackedRequest[];
  private totalRequests: number;
  private failedRequests: number;
  private lastActivityTime: number;
  private domContentLoaded: boolean;
  private windowLoaded: boolean;
  
  // Interceptor references for cleanup
  private originalXHROpen: typeof XMLHttpRequest.prototype.open;
  private originalXHRSend: typeof XMLHttpRequest.prototype.send;
  private originalFetch: typeof window.fetch;

  /**
   * Create new NetworkCapture instance
   * @param config - Capture configuration
   */
  constructor(config?: Partial<NetworkCaptureConfig>);

  /**
   * Start capturing network activity
   * Patches XHR and Fetch APIs
   */
  start(): void;

  /**
   * Stop capturing network activity
   * Restores original XHR and Fetch
   */
  stop(): void;

  /**
   * Get current layer status
   * @returns Layer status
   */
  getStatus(): NetworkCaptureStatus;

  /**
   * Get recent network activity
   * @returns Network capture result
   */
  getRecent(): NetworkCaptureResult;

  /**
   * Get activity summary for time window
   * @param windowMs - Time window in ms
   * @returns Activity summary
   */
  getActivitySummary(windowMs: number): NetworkActivitySummary;

  /**
   * Get current pending request count
   * @returns Number of pending requests
   */
  getPendingCount(): number;

  /**
   * Get pending request URLs
   * @returns Array of pending URLs
   */
  getPendingUrls(): string[];

  /**
   * Check if network is idle
   * @param thresholdMs - Idle threshold in ms (default: 500)
   * @returns True if no activity for threshold duration
   */
  isNetworkIdle(thresholdMs?: number): boolean;

  /**
   * Wait for network to be idle
   * @param thresholdMs - Idle threshold in ms
   * @param timeoutMs - Maximum wait time
   * @returns Promise resolving when idle or timeout
   */
  waitForNetworkIdle(thresholdMs?: number, timeoutMs?: number): Promise<boolean>;

  /**
   * Wait for specific request pattern
   * @param pattern - URL pattern to match
   * @param timeoutMs - Maximum wait time
   * @returns Promise resolving to matching request or null
   */
  waitForRequest(pattern: RegExp, timeoutMs?: number): Promise<TrackedRequest | null>;

  /**
   * Get page load state
   * @returns Current page load state
   */
  getPageLoadState(): PageLoadState;

  /**
   * Clear tracked requests
   */
  clear(): void;

  // Private methods
  private interceptXHR(): void;
  private interceptFetch(): void;
  private restoreXHR(): void;
  private restoreFetch(): void;
  private trackRequest(request: Partial<TrackedRequest>): string;
  private completeRequest(id: string, updates: Partial<TrackedRequest>): void;
  private failRequest(id: string, error: string): void;
  private shouldIgnore(url: string): boolean;
  private classifyRequestType(url: string, contentType?: string): RequestType;
  private extractDomain(url: string): string;
  private generateRequestId(): string;
  private pruneOldRequests(): void;
  private setupPageLoadListeners(): void;
}

export { 
  NetworkCapture, 
  NetworkCaptureConfig, 
  NetworkCaptureResult, 
  TrackedRequest, 
  RequestType,
  PageLoadState,
  NetworkActivitySummary 
};
```

---

## Key Implementation Details

### XHR Interception
```typescript
private interceptXHR(): void {
  const self = this;
  
  // Store originals
  this.originalXHROpen = XMLHttpRequest.prototype.open;
  this.originalXHRSend = XMLHttpRequest.prototype.send;

  // Patch open
  XMLHttpRequest.prototype.open = function(
    method: string,
    url: string | URL,
    async: boolean = true,
    username?: string | null,
    password?: string | null
  ) {
    const urlString = url.toString();
    
    // Store request info on XHR instance
    (this as any).__muffin_request__ = {
      method,
      url: urlString,
      type: 'xhr' as RequestType
    };

    return self.originalXHROpen.call(this, method, url, async, username, password);
  };

  // Patch send
  XMLHttpRequest.prototype.send = function(body?: Document | XMLHttpRequestBodyInit | null) {
    const xhr = this;
    const requestInfo = (xhr as any).__muffin_request__;

    if (requestInfo && !self.shouldIgnore(requestInfo.url)) {
      const requestId = self.trackRequest({
        url: requestInfo.url,
        method: requestInfo.method,
        type: 'xhr',
        body: self.config.trackBodies && body ? String(body).slice(0, self.config.maxBodySize) : undefined
      });

      // Track completion
      xhr.addEventListener('load', () => {
        self.completeRequest(requestId, {
          status: xhr.status,
          statusText: xhr.statusText,
          responseSize: xhr.response ? new Blob([xhr.response]).size : 0
        });
      });

      // Track errors
      xhr.addEventListener('error', () => {
        self.failRequest(requestId, 'Network error');
      });

      xhr.addEventListener('abort', () => {
        self.failRequest(requestId, 'Aborted');
      });

      xhr.addEventListener('timeout', () => {
        self.failRequest(requestId, 'Timeout');
      });
    }

    return self.originalXHRSend.call(this, body);
  };
}

private restoreXHR(): void {
  if (this.originalXHROpen) {
    XMLHttpRequest.prototype.open = this.originalXHROpen;
  }
  if (this.originalXHRSend) {
    XMLHttpRequest.prototype.send = this.originalXHRSend;
  }
}
```

### Fetch Interception
```typescript
private interceptFetch(): void {
  const self = this;
  this.originalFetch = window.fetch;

  window.fetch = async function(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    const url = typeof input === 'string' 
      ? input 
      : input instanceof URL 
        ? input.toString() 
        : input.url;

    const method = init?.method || (input instanceof Request ? input.method : 'GET');

    if (self.shouldIgnore(url)) {
      return self.originalFetch.call(window, input, init);
    }

    const requestId = self.trackRequest({
      url,
      method,
      type: 'fetch',
      body: self.config.trackBodies && init?.body 
        ? String(init.body).slice(0, self.config.maxBodySize) 
        : undefined
    });

    try {
      const response = await self.originalFetch.call(window, input, init);

      // Clone response to read size without consuming body
      const clone = response.clone();
      let responseSize = 0;
      try {
        const blob = await clone.blob();
        responseSize = blob.size;
      } catch {
        // Ignore size calculation errors
      }

      self.completeRequest(requestId, {
        status: response.status,
        statusText: response.statusText,
        responseSize
      });

      return response;
    } catch (error) {
      self.failRequest(requestId, error instanceof Error ? error.message : 'Fetch failed');
      throw error;
    }
  };
}

private restoreFetch(): void {
  if (this.originalFetch) {
    window.fetch = this.originalFetch;
  }
}
```

### Request Tracking
```typescript
private trackRequest(request: Partial<TrackedRequest>): string {
  const id = this.generateRequestId();
  const now = Date.now();

  const tracked: TrackedRequest = {
    id,
    url: request.url || '',
    method: request.method || 'GET',
    startTime: now,
    type: request.type || 'other',
    pending: true,
    body: request.body,
    initiator: request.initiator
  };

  this.requests.set(id, tracked);
  this.totalRequests++;
  this.lastActivityTime = now;

  // Prune old requests periodically
  if (this.requests.size > this.config.maxRecentRequests * 2) {
    this.pruneOldRequests();
  }

  return id;
}

private completeRequest(id: string, updates: Partial<TrackedRequest>): void {
  const request = this.requests.get(id);
  if (!request) return;

  const now = Date.now();
  request.endTime = now;
  request.duration = now - request.startTime;
  request.pending = false;
  request.status = updates.status;
  request.statusText = updates.statusText;
  request.responseSize = updates.responseSize;

  this.lastActivityTime = now;

  // Move to recent completed
  this.recentCompleted.push(request);
  if (this.recentCompleted.length > this.config.maxRecentRequests) {
    this.recentCompleted.shift();
  }

  // Remove from pending map after short delay
  setTimeout(() => {
    this.requests.delete(id);
  }, 1000);
}

private failRequest(id: string, error: string): void {
  const request = this.requests.get(id);
  if (!request) return;

  const now = Date.now();
  request.endTime = now;
  request.duration = now - request.startTime;
  request.pending = false;
  request.error = error;

  this.failedRequests++;
  this.lastActivityTime = now;

  // Move to recent completed (failures are also tracked)
  this.recentCompleted.push(request);
  if (this.recentCompleted.length > this.config.maxRecentRequests) {
    this.recentCompleted.shift();
  }

  this.requests.delete(id);
}
```

### Get Recent Network Activity
```typescript
getRecent(): NetworkCaptureResult {
  const pendingRequests = Array.from(this.requests.values()).filter(r => r.pending);

  return {
    recentRequests: [...this.recentCompleted].slice(-20), // Last 20 completed
    pendingCount: pendingRequests.length,
    pendingUrls: pendingRequests.map(r => r.url),
    totalRequests: this.totalRequests,
    failedRequests: this.failedRequests,
    pageLoadState: this.getPageLoadState(),
    activeWebSockets: this.countActiveWebSockets(),
    lastActivityTime: this.lastActivityTime
  };
}

getPageLoadState(): PageLoadState {
  const now = Date.now();
  return {
    readyState: document.readyState,
    domContentLoaded: this.domContentLoaded,
    windowLoaded: this.windowLoaded,
    networkIdleTime: now - this.lastActivityTime
  };
}

private countActiveWebSockets(): number {
  // WebSocket tracking requires separate interception
  // For now, return 0 - can be enhanced later
  return 0;
}
```

### Network Idle Detection
```typescript
isNetworkIdle(thresholdMs: number = 500): boolean {
  const pendingCount = this.getPendingCount();
  const idleTime = Date.now() - this.lastActivityTime;

  return pendingCount === 0 && idleTime >= thresholdMs;
}

async waitForNetworkIdle(
  thresholdMs: number = 500, 
  timeoutMs: number = 30000
): Promise<boolean> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    const check = () => {
      if (this.isNetworkIdle(thresholdMs)) {
        resolve(true);
        return;
      }

      if (Date.now() - startTime >= timeoutMs) {
        resolve(false);
        return;
      }

      setTimeout(check, 100);
    };

    check();
  });
}

async waitForRequest(
  pattern: RegExp, 
  timeoutMs: number = 30000
): Promise<TrackedRequest | null> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    const check = () => {
      // Check recent completed requests
      const match = this.recentCompleted.find(r => pattern.test(r.url));
      if (match) {
        resolve(match);
        return;
      }

      if (Date.now() - startTime >= timeoutMs) {
        resolve(null);
        return;
      }

      setTimeout(check, 100);
    };

    check();
  });
}
```

### Activity Summary
```typescript
getActivitySummary(windowMs: number): NetworkActivitySummary {
  const cutoff = Date.now() - windowMs;
  const domains = new Set<string>();

  let requestsStarted = 0;
  let requestsCompleted = 0;
  let requestsFailed = 0;
  let totalResponseTime = 0;
  let completedCount = 0;

  // Check all requests
  for (const request of this.requests.values()) {
    if (request.startTime >= cutoff) {
      requestsStarted++;
      domains.add(this.extractDomain(request.url));
    }
  }

  // Check recent completed
  for (const request of this.recentCompleted) {
    if (request.endTime && request.endTime >= cutoff) {
      requestsCompleted++;
      domains.add(this.extractDomain(request.url));

      if (request.error) {
        requestsFailed++;
      } else if (request.duration) {
        totalResponseTime += request.duration;
        completedCount++;
      }
    }
  }

  return {
    requestsStarted,
    requestsCompleted,
    requestsFailed,
    averageResponseTime: completedCount > 0 ? totalResponseTime / completedCount : 0,
    domains: Array.from(domains)
  };
}

private extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'unknown';
  }
}
```

### Page Load Listeners
```typescript
private setupPageLoadListeners(): void {
  // Track DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      this.domContentLoaded = true;
      this.lastActivityTime = Date.now();
    }, { once: true });
  } else {
    this.domContentLoaded = true;
  }

  // Track window load
  if (document.readyState !== 'complete') {
    window.addEventListener('load', () => {
      this.windowLoaded = true;
      this.lastActivityTime = Date.now();
    }, { once: true });
  } else {
    this.windowLoaded = true;
  }
}
```

---

## Integration Points

### With RecordingOrchestrator
```typescript
// In RecordingOrchestrator
class RecordingOrchestrator {
  private networkCapture: NetworkCapture | null;

  async start(): Promise<void> {
    if (this.config.enableNetwork) {
      this.networkCapture = new NetworkCapture({
        enabled: true,
        maxRecentRequests: 50,
        retentionTimeMs: 10000,
        ignorePatterns: [
          /google-analytics\.com/,
          /googletagmanager\.com/,
          /facebook\.com\/tr/,
          /hotjar\.com/
        ]
      });
      this.networkCapture.start();
    }
  }

  async captureAction(event: Event, element: HTMLElement): Promise<CapturedAction> {
    const networkData = this.networkCapture?.getRecent();
    
    const action: CapturedAction = {
      // ...other data
      networkData
    };
  }
}
```

### With AutoWaiting Service
```typescript
// In AutoWaiting.ts
import { NetworkCapture } from '../../contentScript/layers/NetworkCapture';

export async function waitForStable(networkCapture: NetworkCapture): Promise<void> {
  // Wait for no pending requests and network idle for 500ms
  await networkCapture.waitForNetworkIdle(500, 10000);
}
```

---

## Acceptance Criteria

- [ ] Intercepts all XHR requests without breaking functionality
- [ ] Intercepts all Fetch requests without breaking functionality
- [ ] Tracks request start, completion, and failure
- [ ] Calculates accurate request duration
- [ ] Respects ignore patterns (analytics, tracking)
- [ ] getPendingCount() returns accurate count
- [ ] isNetworkIdle() correctly detects idle state
- [ ] waitForNetworkIdle() resolves when idle or times out
- [ ] waitForRequest() finds matching requests
- [ ] Page load state tracked correctly
- [ ] Original XHR/Fetch restored on stop()
- [ ] No memory leaks (bounded request storage)
- [ ] TypeScript compiles with strict mode, 0 errors
- [ ] Works with service workers

---

## Edge Cases

1. **Service Worker intercepts**: May not see all requests
2. **Cross-origin requests**: Limited header visibility
3. **Streaming responses**: Size calculation may fail
4. **WebSocket connections**: Basic tracking only
5. **Request cancellation**: Track as failure
6. **Redirect chains**: Track final URL
7. **Cached responses**: May not trigger network activity
8. **Preflight requests**: Track OPTIONS separately
9. **File uploads**: Large body handling
10. **blob: URLs**: Handle special URL schemes

---

## Estimated Lines

300-380 lines
