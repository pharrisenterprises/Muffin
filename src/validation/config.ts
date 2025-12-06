// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION CONFIGURATION - Tunable Parameters
// ═══════════════════════════════════════════════════════════════════════════
// All thresholds and settings in one place for easy tuning

import { 
  ScreenshotOptions,
  HealingCacheConfig,
  ConfidenceFactorType
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// SCREENSHOT DEFAULTS
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_SCREENSHOT_OPTIONS: Required<ScreenshotOptions> = {
  includeContext: true,
  contextPadding: 300,
  fullPage: false,
  quality: 0.8,
  highlightElement: true
};

// ─────────────────────────────────────────────────────────────────────────────
// CONFIDENCE THRESHOLDS
// ─────────────────────────────────────────────────────────────────────────────

export const CONFIDENCE_THRESHOLDS = {
  /** Auto-accept threshold */
  HIGH: 0.80,
  
  /** Accept + flag threshold */
  MEDIUM: 0.60,
  
  /** Needs correction threshold */
  LOW: 0.30,
  
  /** Vision provider minimum confidence */
  VISION_MIN: 0.70,
  
  /** Label uniqueness minimum */
  LABEL_UNIQUENESS_MIN: 0.50
};

// ─────────────────────────────────────────────────────────────────────────────
// CONFIDENCE FACTOR WEIGHTS
// ─────────────────────────────────────────────────────────────────────────────

export const CONFIDENCE_WEIGHTS: Record<ConfidenceFactorType, number> = {
  'text-clarity': 0.20,
  'uniqueness': 0.25,
  'aria-match': 0.15,
  'placeholder-match': 0.10,
  'visual-match': 0.15,
  'semantic-meaning': 0.10,
  'length-appropriate': 0.05
};

// ─────────────────────────────────────────────────────────────────────────────
// VISUAL CONTEXT DETECTION PATTERNS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Patterns that indicate terminal context
 * Used to prevent terminal vs Copilot confusion
 */
export const TERMINAL_PATTERNS = {
  /** Text patterns indicating terminal */
  textPatterns: [
    /^\$\s/,          // $ prompt
    /^>\s/,           // > prompt  
    /^#\s/,           // # prompt (root)
    /^%\s/,           // % prompt (zsh)
    /^C:\\>/,         // Windows prompt
    /^\[.*@.*\]\$/,   // [user@host]$
    /^bash-\d+\.\d+/, // bash version
    /^➜\s/,           // oh-my-zsh
  ],
  
  /** Font families indicating terminal */
  terminalFonts: [
    'monospace',
    'Consolas',
    'Monaco',
    'Courier',
    'SF Mono',
    'Fira Code',
    'JetBrains Mono',
    'Source Code Pro'
  ],
  
  /** Background colors indicating dark terminal */
  darkBackgrounds: [
    '#000000', '#0d1117', '#1e1e1e', '#282c34',
    '#002b36', '#272822', '#1d1f21', '#2d2d2d'
  ]
};

/**
 * Patterns that indicate Copilot prompt context
 * Different from terminal - should be handled differently
 */
export const COPILOT_PATTERNS = {
  /** Class name patterns */
  classPatterns: [
    /copilot/i,
    /github-copilot/i,
    /ai-prompt/i,
    /suggestion-box/i
  ],
  
  /** Aria patterns */
  ariaPatterns: [
    /copilot/i,
    /suggestion/i,
    /completion/i
  ],
  
  /** Text patterns */
  textPatterns: [
    /Accept suggestion/i,
    /Tab to accept/i,
    /Show completions/i,
    /AI suggestion/i
  ]
};

/**
 * Standard input field patterns
 */
export const INPUT_PATTERNS = {
  /** Input types that are clearly inputs */
  inputTypes: ['text', 'email', 'password', 'search', 'tel', 'url', 'number'],
  
  /** Aria roles indicating input */
  ariaRoles: ['textbox', 'searchbox', 'combobox'],
  
  /** Class patterns for inputs */
  classPatterns: [
    /input/i,
    /text-field/i,
    /form-control/i
  ]
};

// ─────────────────────────────────────────────────────────────────────────────
// HEALING CACHE DEFAULTS
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_HEALING_CACHE_CONFIG: HealingCacheConfig = {
  /** 24 hours */
  ttlMs: 24 * 60 * 60 * 1000,
  
  /** LRU eviction at 1000 entries */
  maxEntries: 1000,
  
  /** 70% success rate required */
  minSuccessRate: 0.7
};

// ─────────────────────────────────────────────────────────────────────────────
// PLAYBACK STRATEGY TIMEOUTS
// ─────────────────────────────────────────────────────────────────────────────

export const PLAYBACK_TIMEOUTS = {
  /** XPath strategy timeout */
  XPATH: 500,
  
  /** ID strategy timeout */
  ID: 300,
  
  /** ARIA strategy timeout */
  ARIA: 400,
  
  /** Fuzzy text timeout */
  FUZZY_TEXT: 600,
  
  /** Bounding box timeout */
  BOUNDING_BOX: 500,
  
  /** Full retry loop timeout */
  TOTAL_RETRY: 2000,
  
  /** Retry interval */
  RETRY_INTERVAL: 150
};

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION ORCHESTRATOR CONFIG
// ─────────────────────────────────────────────────────────────────────────────

export const VALIDATION_ORCHESTRATOR_CONFIG = {
  /** Enable screenshot capture during recording */
  captureScreenshots: true,
  
  /** Enable visual context validation */
  validateVisualContext: true,
  
  /** Enable post-recording label correction */
  enableLabelCorrection: true,
  
  /** Auto-correct labels below this confidence */
  autoCorrectThreshold: CONFIDENCE_THRESHOLDS.MEDIUM,
  
  /** Maximum steps to validate in parallel */
  parallelValidation: 3,
  
  /** Log validation details */
  debugLogging: false
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPANSION POINTS - Future Claude Vision API
// ─────────────────────────────────────────────────────────────────────────────

export const VISION_API_CONFIG = {
  /** Vision provider to use (future: 'claude', 'local') */
  provider: 'local' as const,
  
  /** API endpoint (for when API is available) */
  apiEndpoint: 'https://api.anthropic.com/v1/messages',
  
  /** Model to use for vision */
  model: 'claude-3-5-sonnet-20241022',
  
  /** Maximum image size (bytes) */
  maxImageSize: 5 * 1024 * 1024,
  
  /** API timeout (ms) */
  apiTimeout: 30000,
  
  /** Enable API (set to true when ready) */
  apiEnabled: false
};
