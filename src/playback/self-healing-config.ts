// ═══════════════════════════════════════════════════════════════════════════
// SELF-HEALING PLAYBACK CONFIGURATION - All Tunable Parameters
// ═══════════════════════════════════════════════════════════════════════════

import type {
  SelfHealingPlaybackConfig,
  ComparisonOptions,
  ResolutionStrategy,
  DiagnosticType
} from './self-healing-types';

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT PLAYBACK CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_SELF_HEALING_PLAYBACK_CONFIG: SelfHealingPlaybackConfig = {
  /** Enable self-healing */
  selfHealingEnabled: true,
  
  /** Enable screenshot comparison */
  screenshotComparisonEnabled: true,
  
  /** Enable drift detection */
  driftDetectionEnabled: true,
  
  /** Enable graph-based finding */
  graphFindingEnabled: true,
  
  /** AI healing disabled by default (no API key) */
  aiHealingEnabled: false,
  
  /** Auto-apply high-confidence healings */
  autoApplyHealings: true,
  
  /** Flag medium-confidence for review */
  flagMediumConfidence: true,
  
  /** Max 3 healing attempts per step */
  maxHealingAttempts: 3,
  
  /** 30 second step timeout */
  stepTimeout: 30000,
  
  /** 10 second element wait */
  elementTimeout: 10000,
  
  /** 85% screenshot similarity required */
  screenshotThreshold: 0.85,
  
  /** 50px drift threshold */
  driftThreshold: 50,
  
  /** Debug logging off */
  debugLogging: false
};

// ─────────────────────────────────────────────────────────────────────────────
// SCREENSHOT COMPARISON DEFAULTS
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_COMPARISON_OPTIONS: ComparisonOptions = {
  /** 85% similarity threshold */
  similarityThreshold: 0.85,
  
  /** Don't ignore colors (important for context) */
  ignoreColors: false,
  
  /** Ignore small noise */
  ignoreNoise: true,
  
  /** 5px noise threshold */
  noiseThreshold: 5,
  
  /** Focus on element region */
  focusOnElement: true,
  
  /** 100px context around element */
  contextPadding: 100
};

// ─────────────────────────────────────────────────────────────────────────────
// DRIFT DETECTION THRESHOLDS
// ─────────────────────────────────────────────────────────────────────────────

export const DRIFT_THRESHOLDS = {
  /** Maximum position drift before flagging (pixels) */
  POSITION_MAX: 50,
  
  /** Maximum size change before flagging (percent) */
  SIZE_CHANGE_MAX: 25,
  
  /** Minimum element size to consider valid */
  MIN_ELEMENT_SIZE: 5,
  
  /** Maximum distance to search for drifted element */
  SEARCH_RADIUS: 200
};

// ─────────────────────────────────────────────────────────────────────────────
// GRAPH-BASED FINDING CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

export const GRAPH_FIND_CONFIG = {
  /** Maximum parent chain depth to search */
  MAX_PARENT_DEPTH: 10,
  
  /** Maximum siblings to consider */
  MAX_SIBLINGS: 20,
  
  /** Maximum nearby elements to track */
  MAX_NEARBY: 10,
  
  /** Distance threshold for "nearby" (pixels) */
  NEARBY_DISTANCE: 200,
  
  /** Landmark selectors to capture */
  LANDMARK_SELECTORS: [
    'header', 'nav', 'main', 'aside', 'footer',
    '[role="banner"]', '[role="navigation"]', 
    '[role="main"]', '[role="complementary"]',
    '[role="contentinfo"]', '[role="search"]'
  ],
  
  /** Stable element indicators (less likely to change) */
  STABLE_INDICATORS: {
    attributes: ['id', 'data-testid', 'data-cy', 'name'],
    roles: ['button', 'link', 'textbox', 'navigation', 'main'],
    tags: ['header', 'nav', 'main', 'footer', 'form', 'table']
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// RESOLUTION STRATEGY PRIORITY
// ─────────────────────────────────────────────────────────────────────────────

export const RESOLUTION_STRATEGY_PRIORITY: ResolutionStrategy[] = [
  'retry-original',       // Always try original first
  'drift-correction',     // Simple position adjustment
  'graph-navigation',     // Use relationship graph
  'evidence-scoring',     // Batch 10: Multi-evidence scoring (spatial, sequence, visual, DOM, history)
  'healing-cache',        // Check cached healings
  'screenshot-locate',    // Visual location
  'local-vision',         // Pattern matching
  'ai-vision',            // Claude Vision (if enabled)
  'manual-selector'       // Last resort
];

// ─────────────────────────────────────────────────────────────────────────────
// DIAGNOSTIC PRIORITY
// ─────────────────────────────────────────────────────────────────────────────

export const DIAGNOSTIC_PRIORITY: DiagnosticType[] = [
  'page-loaded',          // First: is page ready?
  'iframe-accessible',    // Can we access iframes?
  'shadow-accessible',    // Can we access shadow DOM?
  'selector-valid',       // Is selector syntax valid?
  'element-exists',       // Does element exist?
  'element-visible',      // Is it visible?
  'element-interactable', // Can we interact?
  'screenshot-match',     // Visual verification
  'drift-check',          // Position check
  'context-match',        // Visual context
  'graph-integrity'       // Related elements
];

// ─────────────────────────────────────────────────────────────────────────────
// TIMEOUTS
// ─────────────────────────────────────────────────────────────────────────────

export const PLAYBACK_TIMEOUTS = {
  /** Page load timeout */
  PAGE_LOAD: 30000,
  
  /** Element wait timeout */
  ELEMENT_WAIT: 10000,
  
  /** Screenshot capture timeout */
  SCREENSHOT: 5000,
  
  /** Comparison timeout */
  COMPARISON: 3000,
  
  /** Single healing attempt timeout */
  HEALING_ATTEMPT: 10000,
  
  /** Total troubleshooting timeout */
  TROUBLESHOOTING: 60000,
  
  /** Retry interval */
  RETRY_INTERVAL: 150
};
