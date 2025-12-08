/**
 * @fileoverview Strategy Type Definitions for Muffin Chrome Extension
 * @description Central type definitions for the 7-tier fallback strategy system.
 * This file is the single source of truth for all strategy-related types used
 * across recording (FallbackChainGenerator), storage (EvidenceBuffer), and
 * playback (DecisionEngine).
 * 
 * @module types/strategy
 * @version 1.0.0
 * @since Phase 4
 * 
 * Architecture Decision #6: Strategy weights are FIXED (not user-configurable)
 */

// ============================================================================
// SECTION 1: CORE STRATEGY TYPES
// ============================================================================

/**
 * The 7 strategy types in priority order.
 * These map to the confidence weights defined in STRATEGY_WEIGHTS.
 * 
 * Priority Order:
 * 1. cdp_semantic (0.95) - Role + accessible name (Playwright getByRole)
 * 2. cdp_power (0.90) - Text/label/placeholder (Playwright getByText, etc.)
 * 3. dom_selector (0.85) - ID or generated unique selector
 * 4. evidence_scoring (0.80) - Mouse trail + attribute matching
 * 5. css_selector (0.75) - CSS path selector
 * 6. vision_ocr (0.70) - OCR text matching
 * 7. coordinates (0.60) - X/Y fallback (last resort)
 */
export type StrategyType =
  | 'cdp_semantic'
  | 'cdp_power'
  | 'dom_selector'
  | 'evidence_scoring'
  | 'css_selector'
  | 'vision_ocr'
  | 'coordinates';

/**
 * Strategy category for grouping and diversity analysis.
 * Used to ensure fallback chains have diverse strategy types.
 */
export type StrategyCategory =
  | 'semantic'      // cdp_semantic, cdp_power
  | 'dom'           // dom_selector, css_selector
  | 'vision'        // vision_ocr
  | 'evidence'      // evidence_scoring
  | 'coordinates';  // coordinates

/**
 * Action event types supported by the recorder.
 */
export type ActionEventType =
  | 'click'
  | 'dblclick'
  | 'type'
  | 'select'
  | 'check'
  | 'uncheck'
  | 'navigate'
  | 'scroll'
  | 'hover'
  | 'focus'
  | 'blur'
  | 'submit'
  | 'keydown';

// ============================================================================
// SECTION 2: LOCATOR STRATEGY INTERFACE
// ============================================================================

/**
 * A single locator strategy within a FallbackChain.
 * Each strategy represents one method of finding an element on a page.
 */
export interface LocatorStrategy {
  /** Strategy type from the 7-tier system */
  type: StrategyType;
  
  /** CSS selector or XPath (for dom_selector, css_selector) */
  selector?: string;
  
  /** Confidence score (0-1) assigned during recording */
  confidence: number;
  
  /** Strategy-specific metadata */
  metadata?: StrategyMetadata;
}

/**
 * Union type for all strategy metadata variants.
 * Discriminated by the presence of specific fields.
 */
export type StrategyMetadata =
  | CDPSemanticMetadata
  | CDPPowerMetadata
  | DOMSelectorMetadata
  | CSSSelectorMetadata
  | EvidenceScoringMetadata
  | VisionOCRMetadata
  | CoordinatesMetadata;

// ============================================================================
// SECTION 3: STRATEGY METADATA TYPES
// ============================================================================

/**
 * CDP Semantic strategy metadata (Playwright getByRole equivalent).
 * Uses accessibility tree information for robust element location.
 */
export interface CDPSemanticMetadata {
  /** ARIA role (button, textbox, link, etc.) */
  role: string;
  
  /** Accessible name (button text, label text, etc.) */
  name?: string;
  
  /** Whether to require exact name match */
  exact?: boolean;
  
  /** Element states from accessibility tree */
  states?: {
    checked?: boolean;
    disabled?: boolean;
    expanded?: boolean;
    pressed?: boolean;
    selected?: boolean;
  };
  
  /** Heading level (1-6) for heading roles */
  level?: number;
}

/**
 * CDP Power strategy metadata (Playwright getByText, getByLabel, etc.).
 * Uses text content and semantic attributes for element location.
 */
export interface CDPPowerMetadata {
  /** Text content to match */
  text?: string;
  
  /** Label text to match (for form fields) */
  label?: string;
  
  /** Placeholder text to match */
  placeholder?: string;
  
  /** data-testid attribute value */
  testId?: string;
  
  /** Alt text to match (for images) */
  altText?: string;
  
  /** Title attribute to match */
  title?: string;
  
  /** Whether to require exact text match */
  exact?: boolean;
}

/**
 * DOM selector strategy metadata.
 * Uses traditional DOM selectors (ID, unique path, etc.).
 */
export interface DOMSelectorMetadata {
  /** Type of selector used */
  selectorType: 'id' | 'testId' | 'unique' | 'name' | 'path';
  
  /** Whether ID appears stable (not auto-generated) */
  isStable?: boolean;
  
  /** Original ID value */
  id?: string;
  
  /** Test ID value */
  testId?: string;
}

/**
 * CSS selector strategy metadata.
 * Uses CSS selector paths for element location.
 */
export interface CSSSelectorMetadata {
  /** Type of CSS selector */
  selectorType: 'class' | 'attribute' | 'path' | 'combined';
  
  /** Classes used in selector */
  classes?: string[];
  
  /** Attribute used in selector */
  attribute?: string;
  
  /** Attribute value */
  value?: string;
}

/**
 * Evidence scoring strategy metadata.
 * Uses mouse trail and attribute matching for element location.
 */
export interface EvidenceScoringMetadata {
  /** Mouse trail endpoint (where user clicked) */
  endpoint: {
    x: number;
    y: number;
  };
  
  /** Last N points of mouse trail for pattern analysis */
  mouseTrail?: Array<{
    x: number;
    y: number;
    timestamp: number;
  }>;
  
  /** Mouse movement pattern classification */
  pattern?: 'direct' | 'curved' | 'searching' | 'hesitant' | 'corrective';
  
  /** Element attributes for verification */
  attributes?: {
    tagName?: string;
    id?: string;
    classList?: string[];
  };
}

/**
 * Vision OCR strategy metadata.
 * Uses OCR text matching for element location.
 */
export interface VisionOCRMetadata {
  /** Target text to find via OCR */
  targetText: string;
  
  /** Original OCR confidence (0-100) */
  ocrConfidence?: number;
  
  /** Bounding box from recording */
  textBbox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  /** Whether to require exact text match */
  exact?: boolean;
  
  /** Whether match is case sensitive */
  caseSensitive?: boolean;
  
  /** Alternative text variations to try */
  variations?: string[];
}

/**
 * Coordinates strategy metadata.
 * Last resort fallback using absolute coordinates.
 */
export interface CoordinatesMetadata {
  /** X coordinate */
  x: number;
  
  /** Y coordinate */
  y: number;
  
  /** Original bounding rect of element */
  boundingRect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  /** Original viewport size */
  viewport?: {
    width: number;
    height: number;
  };
  
  /** Original scroll position */
  scrollPosition?: {
    x: number;
    y: number;
  };
  
  /** Tag name for verification */
  tagName?: string;
  
  /** Element ID for verification */
  elementId?: string;
  
  /** Classes for verification */
  classList?: string[];
}

// ============================================================================
// SECTION 4: FALLBACK CHAIN
// ============================================================================

/**
 * Complete fallback chain for a recorded action.
 * Contains all strategies sorted by confidence (highest first).
 */
export interface FallbackChain {
  /** Ordered array of strategies (highest confidence first) */
  strategies: LocatorStrategy[];
  
  /** Primary strategy type (first in array) */
  primaryStrategy: StrategyType;
  
  /** Timestamp when chain was recorded */
  recordedAt: number;
  
  /** Optional chain ID for tracking */
  id?: string;
  
  /** Optional metadata about chain generation */
  generationMetadata?: {
    /** Capture layers used */
    layersUsed: string[];
    /** Number of candidates evaluated */
    candidatesEvaluated: number;
    /** Processing time in ms */
    processingTime: number;
  };
}

// ============================================================================
// SECTION 5: CAPTURE DATA TYPES
// ============================================================================

/**
 * DOM capture data included in action.
 * Contains all DOM-related information captured during recording.
 */
export interface DOMCaptureData {
  /** CSS selector */
  selector: string;
  
  /** XPath */
  xpath: string;
  
  /** Tag name */
  tagName: string;
  
  /** Element ID */
  id?: string;
  
  /** Class list */
  classList: string[];
  
  /** ARIA role */
  role?: string;
  
  /** Accessible name */
  accessibleName?: string;
  
  /** Text content (truncated) */
  textContent?: string;
  
  /** Inner text (truncated) */
  innerText?: string;
  
  /** Placeholder attribute */
  placeholder?: string;
  
  /** data-testid attribute */
  testId?: string;
  
  /** Bounding rect */
  boundingRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  /** Click X coordinate */
  x: number;
  
  /** Click Y coordinate */
  y: number;
  
  /** All attributes */
  attributes: Record<string, string>;
  
  /** Whether element is in shadow DOM */
  isInShadowDOM: boolean;
  
  /** Shadow host chain (if in shadow DOM) */
  shadowHostChain?: string[];
  
  /** Iframe chain (if in iframe) */
  iframeChain?: string[];
  
  /** Generated unique selector */
  uniqueSelector?: string;
  
  /** Data attributes */
  dataAttributes?: Record<string, string>;
  
  /** Form context (if element is in a form) */
  formContext?: {
    formId?: string;
    fieldName?: string;
    fieldType?: string;
  };
}

/**
 * Vision capture data included in action.
 * Contains OCR results and screenshot data.
 */
export interface VisionCaptureData {
  /** Screenshot (base64, may be pruned for storage) */
  screenshot?: string;
  
  /** OCR text near click point */
  ocrText?: string;
  
  /** OCR confidence (0-100) */
  confidence?: number;
  
  /** Text bounding box */
  textBbox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  /** All OCR results (may be pruned for storage) */
  allTextResults?: Array<{
    text: string;
    confidence: number;
    bbox: { x: number; y: number; width: number; height: number };
  }>;
  
  /** OCR processing time in ms */
  processingTime?: number;
}

/**
 * Mouse capture data included in action.
 * Contains mouse trail for evidence scoring.
 */
export interface MouseCaptureData {
  /** Mouse trail points */
  trail: Array<{
    x: number;
    y: number;
    timestamp: number;
  }>;
  
  /** Trail endpoint (click location) */
  endpoint: {
    x: number;
    y: number;
  };
  
  /** Trail duration in ms */
  duration: number;
  
  /** Total distance traveled in pixels */
  totalDistance: number;
  
  /** Average velocity (px/s) */
  averageVelocity: number;
  
  /** Movement pattern classification */
  pattern: 'direct' | 'curved' | 'searching' | 'hesitant' | 'corrective' | 'unknown';
  
  /** Hesitation points (pauses during movement) */
  hesitationPoints?: Array<{
    x: number;
    y: number;
    duration: number;
  }>;
  
  /** Number of direction changes */
  directionChanges: number;
}

/**
 * Network capture data included in action.
 * Contains network state at time of action.
 */
export interface NetworkCaptureData {
  /** Recent requests at time of action */
  recentRequests: Array<{
    url: string;
    method: string;
    status?: number;
    duration?: number;
    type: string;
  }>;
  
  /** Pending request count */
  pendingCount: number;
  
  /** Whether network was idle */
  wasIdle: boolean;
  
  /** Page load state */
  pageLoadState: 'loading' | 'interactive' | 'complete';
}

// ============================================================================
// SECTION 6: CAPTURED ACTION
// ============================================================================

/**
 * Complete captured action from recording.
 * Contains data from all capture layers and the generated fallback chain.
 */
export interface CapturedAction {
  /** Unique action ID */
  id: string;
  
  /** Capture timestamp */
  timestamp: number;
  
  /** Event type */
  eventType: ActionEventType;
  
  /** Input value (for type/select actions) */
  value?: string;
  
  /** DOM capture data (always present) */
  domData: DOMCaptureData;
  
  /** Vision capture data (optional) */
  visionData?: VisionCaptureData;
  
  /** Mouse capture data (optional) */
  mouseData?: MouseCaptureData;
  
  /** Network capture data (optional) */
  networkData?: NetworkCaptureData;
  
  /** Generated fallback chain */
  fallbackChain: FallbackChain;
}

// ============================================================================
// SECTION 7: STRATEGY EVALUATION TYPES
// ============================================================================

/**
 * Result of evaluating a single strategy during playback.
 */
export interface StrategyEvaluationResult {
  /** Strategy that was evaluated */
  strategy: LocatorStrategy;
  
  /** Whether element was found */
  found: boolean;
  
  /** Confidence score (0-1) */
  confidence: number;
  
  /** Backend node ID if found (CDP) */
  backendNodeId?: number;
  
  /** Node ID for current CDP session */
  nodeId?: number;
  
  /** Click point if found */
  clickPoint?: {
    x: number;
    y: number;
  };
  
  /** Evaluation duration in ms */
  duration: number;
  
  /** Number of matches found */
  matchCount?: number;
  
  /** Error message if failed */
  error?: string;
  
  /** Additional result metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Results from evaluating all strategies in a chain.
 */
export interface EvaluationResults {
  /** All strategy results */
  results: StrategyEvaluationResult[];
  
  /** Best strategy (highest confidence that found element) */
  bestStrategy: StrategyEvaluationResult | null;
  
  /** Total evaluation time in ms */
  totalDuration: number;
  
  /** Number of strategies evaluated */
  strategiesEvaluated: number;
  
  /** Number of strategies that found element */
  strategiesSucceeded: number;
}

// ============================================================================
// SECTION 8: STRATEGY WEIGHTS AND CATEGORIES
// ============================================================================

/**
 * Fixed strategy weights (not user-configurable).
 * Per Architecture Decision #6: Weights are fixed to ensure consistent behavior.
 * Higher weight = higher preference when confidence scores are equal.
 */
export const STRATEGY_WEIGHTS: Record<StrategyType, number> = {
  cdp_semantic: 0.95,
  cdp_power: 0.90,
  dom_selector: 0.85,
  evidence_scoring: 0.80,
  css_selector: 0.75,
  vision_ocr: 0.70,
  coordinates: 0.60
} as const;

/**
 * Strategy category mapping.
 * Maps each strategy type to its category for diversity analysis.
 */
export const STRATEGY_CATEGORIES: Record<StrategyType, StrategyCategory> = {
  cdp_semantic: 'semantic',
  cdp_power: 'semantic',
  dom_selector: 'dom',
  css_selector: 'dom',
  evidence_scoring: 'evidence',
  vision_ocr: 'vision',
  coordinates: 'coordinates'
} as const;

// ============================================================================
// SECTION 9: TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if metadata is CDP semantic.
 */
export function isCDPSemanticMetadata(
  metadata: StrategyMetadata | undefined
): metadata is CDPSemanticMetadata {
  return metadata !== undefined && 'role' in metadata;
}

/**
 * Type guard to check if metadata is CDP power.
 */
export function isCDPPowerMetadata(
  metadata: StrategyMetadata | undefined
): metadata is CDPPowerMetadata {
  return metadata !== undefined && (
    'text' in metadata ||
    'label' in metadata ||
    'placeholder' in metadata ||
    'testId' in metadata
  );
}

/**
 * Type guard to check if metadata is DOM selector.
 */
export function isDOMSelectorMetadata(
  metadata: StrategyMetadata | undefined
): metadata is DOMSelectorMetadata {
  return metadata !== undefined && 'selectorType' in metadata && 
    ['id', 'testId', 'unique', 'name', 'path'].includes((metadata as DOMSelectorMetadata).selectorType);
}

/**
 * Type guard to check if metadata is CSS selector.
 */
export function isCSSSelectorMetadata(
  metadata: StrategyMetadata | undefined
): metadata is CSSSelectorMetadata {
  return metadata !== undefined && 'selectorType' in metadata && 
    ['class', 'attribute', 'path', 'combined'].includes((metadata as CSSSelectorMetadata).selectorType);
}

/**
 * Type guard to check if metadata is Evidence Scoring.
 */
export function isEvidenceScoringMetadata(
  metadata: StrategyMetadata | undefined
): metadata is EvidenceScoringMetadata {
  return metadata !== undefined && 'endpoint' in metadata;
}

/**
 * Type guard to check if metadata is Vision OCR.
 */
export function isVisionOCRMetadata(
  metadata: StrategyMetadata | undefined
): metadata is VisionOCRMetadata {
  return metadata !== undefined && 'targetText' in metadata;
}

/**
 * Type guard to check if metadata is Coordinates.
 */
export function isCoordinatesMetadata(
  metadata: StrategyMetadata | undefined
): metadata is CoordinatesMetadata {
  return metadata !== undefined && 'x' in metadata && 'y' in metadata && !('endpoint' in metadata);
}

// ============================================================================
// SECTION 10: UTILITY FUNCTIONS
// ============================================================================

/**
 * Get strategy category from type.
 */
export function getStrategyCategory(type: StrategyType): StrategyCategory {
  return STRATEGY_CATEGORIES[type];
}

/**
 * Get base weight for strategy type.
 */
export function getStrategyWeight(type: StrategyType): number {
  return STRATEGY_WEIGHTS[type];
}

/**
 * Create empty fallback chain.
 */
export function createEmptyFallbackChain(): FallbackChain {
  return {
    strategies: [],
    primaryStrategy: 'coordinates',
    recordedAt: Date.now()
  };
}

/**
 * Sort strategies by confidence (highest first).
 */
export function sortStrategiesByConfidence(strategies: LocatorStrategy[]): LocatorStrategy[] {
  return [...strategies].sort((a, b) => b.confidence - a.confidence);
}

/**
 * Sort strategies by weight (highest first).
 */
export function sortStrategiesByWeight(strategies: LocatorStrategy[]): LocatorStrategy[] {
  return [...strategies].sort((a, b) => {
    const weightA = STRATEGY_WEIGHTS[a.type];
    const weightB = STRATEGY_WEIGHTS[b.type];
    return weightB - weightA;
  });
}

/**
 * Calculate combined score (weight * confidence).
 */
export function calculateCombinedScore(strategy: LocatorStrategy): number {
  return STRATEGY_WEIGHTS[strategy.type] * strategy.confidence;
}

/**
 * Sort strategies by combined score (highest first).
 */
export function sortStrategiesByCombinedScore(strategies: LocatorStrategy[]): LocatorStrategy[] {
  return [...strategies].sort((a, b) => {
    return calculateCombinedScore(b) - calculateCombinedScore(a);
  });
}

/**
 * Check if strategy type is valid.
 */
export function isValidStrategyType(type: string): type is StrategyType {
  return type in STRATEGY_WEIGHTS;
}

/**
 * Get all strategy types as array.
 */
export function getAllStrategyTypes(): StrategyType[] {
  return [
    'cdp_semantic',
    'cdp_power',
    'dom_selector',
    'evidence_scoring',
    'css_selector',
    'vision_ocr',
    'coordinates'
  ];
}
