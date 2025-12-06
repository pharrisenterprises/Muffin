// ═══════════════════════════════════════════════════════════════════════════
// HEALING TYPES - Independently Wrapped Type Definitions
// ═══════════════════════════════════════════════════════════════════════════
// All healing types in one place - no loose wires

import { 
  ScreenshotCapture, 
  BoundingBox,
  IVisionProvider,
  VisionAnalysisContext,
  VisionAnalysisResult
} from '../validation/types';
import { RecordedStep } from '../recording/types';

// Re-export for convenience
export type { IVisionProvider, VisionAnalysisContext, VisionAnalysisResult, BoundingBox };

// ─────────────────────────────────────────────────────────────────────────────
// HEALING REQUEST/RESPONSE TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Healing request - all info needed to heal a failing step
 */
export interface HealingRequest {
  /** The failing step */
  step: RecordedStep;
  
  /** Screenshot of current page state */
  screenshot: ScreenshotCapture;
  
  /** All selectors that were tried and failed */
  attemptedSelectors: AttemptedSelector[];
  
  /** Current page URL */
  pageUrl: string;
  
  /** Current page title */
  pageTitle: string;
  
  /** Time of request */
  timestamp: number;
  
  /** Session/job identifier */
  sessionId?: string;
  
  /** Project identifier */
  projectId?: string;
}

export interface AttemptedSelector {
  /** Selector that was tried */
  selector: string;
  
  /** Strategy that generated it */
  strategy: string;
  
  /** Why it failed */
  failureReason: string;
  
  /** Time spent trying (ms) */
  duration: number;
}

/**
 * Healing response - result from healing attempt
 */
export interface HealingResponse {
  /** Was healing successful? */
  success: boolean;
  
  /** Provider that produced this result */
  provider: HealingProviderType;
  
  /** Suggested selector (if found) */
  suggestedSelector?: string;
  
  /** Confidence in the suggestion (0-1) */
  confidence: number;
  
  /** Reasoning for the suggestion */
  reasoning: string;
  
  /** Alternative selectors (backup options) */
  alternatives?: AlternativeSelector[];
  
  /** Element bounding box (if found via vision) */
  elementBounds?: BoundingBox;
  
  /** Time taken to heal (ms) */
  duration: number;
  
  /** Action to take based on confidence */
  action: HealingAction;
  
  /** Error if healing failed */
  error?: string;
}

export interface AlternativeSelector {
  selector: string;
  confidence: number;
  strategy?: string;
}

export type HealingProviderType = 
  | 'cache'           // From cached healing
  | 'local-vision'    // Local pattern matching
  | 'claude-vision'   // Claude Vision API
  | 'fallback';       // Default fallback

export type HealingAction =
  | 'auto-apply'      // Confidence >= 0.80
  | 'apply-flag'      // Confidence 0.60-0.79
  | 'suggest-only'    // Confidence < 0.60
  | 'no-action';      // Healing failed

// ─────────────────────────────────────────────────────────────────────────────
// HEALING CACHE TYPES (Dexie Storage)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Healing cache entry - stored in Dexie
 */
export interface HealingCacheEntry {
  /** Auto-generated ID */
  id?: number;
  
  /** Composite cache key */
  cacheKey: string;
  
  /** Page URL pattern */
  pageURLPattern: string;
  
  /** Step type (click, input, etc.) */
  stepType: string;
  
  /** Field label */
  fieldLabel: string;
  
  /** Hash of original selector */
  selectorHash: string;
  
  /** Original selector that failed */
  originalSelector: string;
  
  /** Healed selector that worked */
  healedSelector: string;
  
  /** Confidence when healed */
  confidence: number;
  
  /** Provider that generated this healing */
  provider: HealingProviderType;
  
  /** When first cached */
  createdAt: number;
  
  /** When last used */
  lastUsedAt: number;
  
  /** Number of successful uses */
  successCount: number;
  
  /** Number of failed uses */
  failureCount: number;
  
  /** Expiry timestamp (24 hours from last success) */
  expiresAt: number;
}

/**
 * Healing cache configuration
 */
export interface HealingCacheConfig {
  /** Time-to-live in milliseconds (default: 24 hours) */
  ttlMs: number;
  
  /** Maximum cache entries (default: 1000) */
  maxEntries: number;
  
  /** Minimum success rate to use cached healing (default: 0.7) */
  minSuccessRate: number;
  
  /** Enable cache (default: true) */
  enabled: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// HEALING LOG TYPES (Analytics)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Healing log entry - for analytics and debugging
 */
export interface HealingLogEntry {
  /** Auto-generated ID */
  id?: number;
  
  /** Step number */
  stepNumber: number;
  
  /** Step label */
  stepLabel: string;
  
  /** Project ID */
  projectId?: string;
  
  /** Session ID */
  sessionId?: string;
  
  /** Page URL */
  pageUrl: string;
  
  /** Original selector that failed */
  originalSelector: string;
  
  /** Healed selector (if successful) */
  healedSelector?: string;
  
  /** Provider that attempted healing */
  provider: HealingProviderType;
  
  /** Was healing successful? */
  success: boolean;
  
  /** Confidence score */
  confidence: number;
  
  /** Action taken */
  action: HealingAction;
  
  /** Reasoning from provider */
  reasoning: string;
  
  /** Duration of healing attempt (ms) */
  duration: number;
  
  /** Error message if failed */
  error?: string;
  
  /** Timestamp */
  timestamp: number;
  
  /** Was cache used? */
  cacheHit: boolean;
  
  /** Cost in API credits (if applicable) */
  apiCost?: number;
}

/**
 * Healing analytics summary
 */
export interface HealingAnalytics {
  /** Total healing attempts */
  totalAttempts: number;
  
  /** Successful healings */
  successCount: number;
  
  /** Failed healings */
  failureCount: number;
  
  /** Success rate (0-1) */
  successRate: number;
  
  /** Cache hit count */
  cacheHits: number;
  
  /** Cache hit rate (0-1) */
  cacheHitRate: number;
  
  /** Average confidence of successful healings */
  avgConfidence: number;
  
  /** Average healing duration (ms) */
  avgDuration: number;
  
  /** Total API cost (if using Claude) */
  totalApiCost: number;
  
  /** Breakdown by provider */
  byProvider: Record<HealingProviderType, {
    attempts: number;
    successes: number;
    avgConfidence: number;
  }>;
  
  /** Breakdown by action */
  byAction: Record<HealingAction, number>;
}

// ─────────────────────────────────────────────────────────────────────────────
// RATE LIMITING & CIRCUIT BREAKER TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rate limiter state
 */
export interface RateLimiterState {
  /** Requests in current window */
  requestsInWindow: number;
  
  /** Window start time */
  windowStart: number;
  
  /** Window duration (ms) */
  windowDuration: number;
  
  /** Max requests per window */
  maxRequests: number;
  
  /** Current wait time (ms) */
  currentWaitTime: number;
}

/**
 * Circuit breaker state
 */
export interface CircuitBreakerState {
  /** Current state */
  state: 'closed' | 'open' | 'half-open';
  
  /** Consecutive failures */
  failureCount: number;
  
  /** Failure threshold to open */
  failureThreshold: number;
  
  /** Time circuit opened */
  openedAt?: number;
  
  /** Duration to stay open (ms) */
  openDuration: number;
  
  /** Last failure time */
  lastFailureTime?: number;
  
  /** Last success time */
  lastSuccessTime?: number;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  /** Max API calls per window */
  maxCallsPerWindow: number;
  
  /** Window duration (ms) - default: 60000 (1 min) */
  windowDurationMs: number;
  
  /** Max healing attempts per step */
  maxAttemptsPerStep: number;
  
  /** Circuit breaker failure threshold */
  circuitBreakerThreshold: number;
  
  /** Circuit breaker open duration (ms) */
  circuitBreakerDurationMs: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLAUDE VISION API TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Claude Vision API configuration
 */
export interface ClaudeVisionConfig {
  /** API enabled (default: false until API key added) */
  enabled: boolean;
  
  /** API endpoint */
  apiEndpoint: string;
  
  /** Model to use */
  model: string;
  
  /** Max tokens for response */
  maxTokens: number;
  
  /** Request timeout (ms) */
  timeoutMs: number;
  
  /** Retry count */
  retryCount: number;
  
  /** Retry delay (ms) */
  retryDelayMs: number;
  
  /** Cost per request (for tracking) */
  costPerRequest: number;
}

/**
 * Claude Vision API request
 */
export interface ClaudeVisionRequest {
  /** Model to use */
  model: string;
  
  /** Max tokens */
  max_tokens: number;
  
  /** Messages array */
  messages: Array<{
    role: 'user';
    content: Array<{
      type: 'image' | 'text';
      source?: {
        type: 'base64';
        media_type: 'image/png';
        data: string;
      };
      text?: string;
    }>;
  }>;
}

/**
 * Claude Vision API response
 */
export interface ClaudeVisionResponse {
  /** Response ID */
  id: string;
  
  /** Response content */
  content: Array<{
    type: 'text';
    text: string;
  }>;
  
  /** Stop reason */
  stop_reason: string;
  
  /** Usage stats */
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

/**
 * Parsed Claude Vision element result
 */
export interface ClaudeVisionElementResult {
  /** Element found? */
  found: boolean;
  
  /** Confidence (0-100) */
  confidence: number;
  
  /** Bounding box */
  bounding_box?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  /** Element type */
  element_type?: string;
  
  /** Text content */
  text_content?: string;
  
  /** Reasoning */
  reasoning: string;
  
  /** Suggested selector strategies */
  suggested_selectors?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL VISION TYPES (Pattern Matching)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Local vision analysis result
 */
export interface LocalVisionResult {
  /** Candidates found */
  candidates: ElementCandidate[];
  
  /** Best match (if any) */
  bestMatch?: ElementCandidate;
  
  /** Analysis method used */
  method: LocalVisionMethod;
  
  /** Duration (ms) */
  duration: number;
}

export interface ElementCandidate {
  /** The element */
  element: HTMLElement;
  
  /** Generated selector */
  selector: string;
  
  /** Confidence score (0-1) */
  confidence: number;
  
  /** Why this element matched */
  matchReasons: string[];
  
  /** Bounding box */
  bounds: BoundingBox;
}

export type LocalVisionMethod =
  | 'text-search'      // Find by visible text
  | 'attribute-scan'   // Scan all attributes
  | 'position-based'   // Use recorded position
  | 'structure-match'  // Match DOM structure
  | 'combined';        // Multiple methods

// ─────────────────────────────────────────────────────────────────────────────
// HEALING ORCHESTRATOR TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Healing orchestrator configuration
 */
export interface HealingOrchestratorConfig {
  /** Enable healing (default: true) */
  enabled: boolean;
  
  /** Enable cache (default: true) */
  cacheEnabled: boolean;
  
  /** Enable local vision (default: true) */
  localVisionEnabled: boolean;
  
  /** Enable Claude Vision API (default: false) */
  claudeVisionEnabled: boolean;
  
  /** Confidence thresholds */
  confidenceThresholds: {
    autoApply: number;    // >= this: auto-apply (default: 0.80)
    applyFlag: number;    // >= this: apply + flag (default: 0.60)
    // below applyFlag: suggest only
  };
  
  /** Rate limiting config */
  rateLimit: RateLimitConfig;
  
  /** Cache config */
  cache: HealingCacheConfig;
  
  /** Claude Vision config */
  claudeVision: ClaudeVisionConfig;
  
  /** Debug logging */
  debugLogging: boolean;
}

/**
 * Healing session state
 */
export interface HealingSessionState {
  /** Session ID */
  sessionId: string;
  
  /** Healing attempts in this session */
  attempts: number;
  
  /** Successful healings */
  successes: number;
  
  /** Rate limiter state */
  rateLimiter: RateLimiterState;
  
  /** Circuit breaker state */
  circuitBreaker: CircuitBreakerState;
  
  /** Session start time */
  startTime: number;
}
