// ═══════════════════════════════════════════════════════════════════════════
// HEALING CONFIGURATION - All Tunable Parameters
// ═══════════════════════════════════════════════════════════════════════════
// Centralized configuration for healing system

import {
  HealingCacheConfig,
  RateLimitConfig,
  ClaudeVisionConfig,
  HealingOrchestratorConfig
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIDENCE THRESHOLDS (From FR-5.2)
// ─────────────────────────────────────────────────────────────────────────────

export const HEALING_CONFIDENCE_THRESHOLDS = {
  /** Auto-apply if >= 0.80 */
  AUTO_APPLY: 0.80,
  
  /** Apply + flag if >= 0.60 */
  APPLY_FLAG: 0.60,
  
  /** Below 0.60: suggest only */
  SUGGEST_ONLY: 0.60,
  
  /** Minimum confidence to consider valid */
  MINIMUM: 0.30
};

// ─────────────────────────────────────────────────────────────────────────────
// CACHE DEFAULTS (From FR-5.3)
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_HEALING_CACHE_CONFIG: HealingCacheConfig = {
  /** 24 hours TTL */
  ttlMs: 24 * 60 * 60 * 1000,
  
  /** LRU eviction at 1000 entries */
  maxEntries: 1000,
  
  /** 70% success rate required to use cached healing */
  minSuccessRate: 0.7,
  
  /** Enable by default */
  enabled: true
};

// ─────────────────────────────────────────────────────────────────────────────
// RATE LIMITING DEFAULTS (From Q11)
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_RATE_LIMIT_CONFIG: RateLimitConfig = {
  /** Max 50 API calls per 60 seconds */
  maxCallsPerWindow: 50,
  
  /** 60 second window */
  windowDurationMs: 60 * 1000,
  
  /** Max 2 healing attempts per step */
  maxAttemptsPerStep: 2,
  
  /** Open circuit after 3 consecutive failures */
  circuitBreakerThreshold: 3,
  
  /** Keep circuit open for 5 minutes */
  circuitBreakerDurationMs: 5 * 60 * 1000
};

// ─────────────────────────────────────────────────────────────────────────────
// CLAUDE VISION API DEFAULTS
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_CLAUDE_VISION_CONFIG: ClaudeVisionConfig = {
  /** Disabled by default (no API key) */
  enabled: false,
  
  /** Anthropic API endpoint */
  apiEndpoint: 'https://api.anthropic.com/v1/messages',
  
  /** Claude 3.5 Sonnet for vision */
  model: 'claude-3-5-sonnet-20241022',
  
  /** Max response tokens */
  maxTokens: 1024,
  
  /** 30 second timeout */
  timeoutMs: 30 * 1000,
  
  /** Retry once on failure */
  retryCount: 1,
  
  /** Wait 5 seconds before retry */
  retryDelayMs: 5 * 1000,
  
  /** Estimated cost per request (for tracking) */
  costPerRequest: 0.005
};

// ─────────────────────────────────────────────────────────────────────────────
// LOCAL VISION DEFAULTS
// ─────────────────────────────────────────────────────────────────────────────

export const LOCAL_VISION_CONFIG = {
  /** Text similarity threshold for matching */
  textSimilarityThreshold: 0.6,
  
  /** Bounding box proximity threshold (pixels) */
  positionThreshold: 150,
  
  /** Max candidates to consider */
  maxCandidates: 10,
  
  /** Timeout for local analysis (ms) */
  timeoutMs: 2000
};

// ─────────────────────────────────────────────────────────────────────────────
// FULL ORCHESTRATOR CONFIG
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_HEALING_ORCHESTRATOR_CONFIG: HealingOrchestratorConfig = {
  /** Enable healing */
  enabled: true,
  
  /** Enable cache */
  cacheEnabled: true,
  
  /** Enable local vision (always available) */
  localVisionEnabled: true,
  
  /** Disable Claude Vision by default (no API) */
  claudeVisionEnabled: false,
  
  /** Confidence thresholds */
  confidenceThresholds: {
    autoApply: HEALING_CONFIDENCE_THRESHOLDS.AUTO_APPLY,
    applyFlag: HEALING_CONFIDENCE_THRESHOLDS.APPLY_FLAG
  },
  
  /** Rate limiting */
  rateLimit: { ...DEFAULT_RATE_LIMIT_CONFIG },
  
  /** Cache config */
  cache: { ...DEFAULT_HEALING_CACHE_CONFIG },
  
  /** Claude Vision config */
  claudeVision: { ...DEFAULT_CLAUDE_VISION_CONFIG },
  
  /** Debug logging */
  debugLogging: false
};

// ─────────────────────────────────────────────────────────────────────────────
// CLAUDE VISION PROMPT TEMPLATE
// ─────────────────────────────────────────────────────────────────────────────

export const CLAUDE_VISION_PROMPT_TEMPLATE = `Analyze this webpage screenshot.

TASK: Find the element that matches this description:
- Action: {{action}}
- Failed selector: {{selector}}
- Element type: {{elementType}}
- Expected label: "{{label}}"
- Last known position: {{position}}

Return ONLY this JSON (no markdown, no explanation):
{
  "found": true/false,
  "confidence": 0-100,
  "bounding_box": { "x": number, "y": number, "width": number, "height": number },
  "element_type": "button" | "input" | "link" | "select" | "other",
  "text_content": "visible text on element",
  "reasoning": "brief explanation of why this element matches",
  "suggested_selectors": ["selector1", "selector2"]
}

CRITICAL: Return ONLY valid JSON, no markdown formatting.`;

// ─────────────────────────────────────────────────────────────────────────────
// HEALING PROVIDER PRIORITY
// ─────────────────────────────────────────────────────────────────────────────

export const HEALING_PROVIDER_PRIORITY: Array<{
  provider: string;
  enabled: (config: HealingOrchestratorConfig) => boolean;
}> = [
  {
    provider: 'cache',
    enabled: (c) => c.cacheEnabled
  },
  {
    provider: 'local-vision',
    enabled: (c) => c.localVisionEnabled
  },
  {
    provider: 'claude-vision',
    enabled: (c) => c.claudeVisionEnabled
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// DEXIE DATABASE SCHEMA VERSION
// ─────────────────────────────────────────────────────────────────────────────

export const HEALING_DB_VERSION = 1;
export const HEALING_DB_NAME = 'AutomationHealingDB';
