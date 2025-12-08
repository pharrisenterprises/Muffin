# Phase 3 Types Rollup

**Generated:** December 7, 2025  
**Included Specs:** E1, E2, E3, E4, E5, H2  
**Purpose:** Comprehensive type definitions for the 7-tier strategy system, CDP operations, recording layer, vision subsystem, and telemetry. This rollup provides all TypeScript interfaces and types needed for Phase 3 implementation.

---

## Table of Contents

- [E1: Strategy Types](#e1-strategy-types)
- [E2: CDP Types](#e2-cdp-types)
- [E3: Recording Types](#e3-recording-types)
- [E4: Vision Types](#e4-vision-types)
- [E5: Telemetry Types](#e5-telemetry-types)
- [H2: Types Index](#h2-types-index)

---

## E1: Strategy Types

**File Path:** `src/types/strategy.ts` | **Status:** CREATE | **Priority:** P0

### Purpose
Defines all TypeScript types for the 7-tier strategy system. Central type definition file ensuring type safety across FallbackChain architecture.

---

## Type Definitions

```typescript
/**
 * ============================================================================
 * CORE STRATEGY TYPES
 * ============================================================================
 */

/**
 * The 7 strategy types in priority order
 * These map to the confidence weights defined in DecisionEngine
 */
export type StrategyType =
  | 'cdp_semantic'      // 0.95 - Role + accessible name (Playwright getByRole)
  | 'cdp_power'         // 0.90 - Text/label/placeholder (Playwright getByText, etc.)
  | 'dom_selector'      // 0.85 - ID or generated unique selector
  | 'evidence_scoring'  // 0.80 - Mouse trail + attribute matching
  | 'css_selector'      // 0.75 - CSS path selector
  | 'vision_ocr'        // 0.70 - OCR text matching
  | 'coordinates';      // 0.60 - X/Y fallback

/**
 * Strategy category for grouping and diversity analysis
 */
export type StrategyCategory =
  | 'semantic'      // cdp_semantic, cdp_power
  | 'dom'           // dom_selector, css_selector
  | 'vision'        // vision_ocr
  | 'evidence'      // evidence_scoring
  | 'coordinates';  // coordinates

/**
 * ============================================================================
 * LOCATOR STRATEGY
 * ============================================================================
 */

/**
 * A single locator strategy within a FallbackChain
 */
export interface LocatorStrategy {
  /** Strategy type */
  type: StrategyType;
  
  /** CSS selector or XPath (for dom_selector, css_selector) */
  selector?: string;
  
  /** Confidence score (0-1) assigned during recording */
  confidence: number;
  
  /** Strategy-specific metadata */
  metadata?: StrategyMetadata;
}

/**
 * Union type for all strategy metadata variants
 */
export type StrategyMetadata =
  | CDPSemanticMetadata
  | CDPPowerMetadata
  | DOMSelectorMetadata
  | CSSSelectorMetadata
  | EvidenceScoringMetadata
  | VisionOCRMetadata
  | CoordinatesMetadata;

/**
 * ============================================================================
 * STRATEGY METADATA TYPES
 * ============================================================================
 */

/**
 * CDP Semantic strategy metadata (getByRole)
 */
export interface CDPSemanticMetadata {
  /** ARIA role */
  role: string;
  /** Accessible name */
  name?: string;
  /** Exact name match */
  exact?: boolean;
  /** Element states */
  states?: {
    checked?: boolean;
    disabled?: boolean;
    expanded?: boolean;
    pressed?: boolean;
    selected?: boolean;
  };
  /** Heading level (1-6) */
  level?: number;
}

/**
 * CDP Power strategy metadata (getByText, getByLabel, etc.)
 */
export interface CDPPowerMetadata {
  /** Text content to match */
  text?: string;
  /** Label text to match */
  label?: string;
  /** Placeholder text to match */
  placeholder?: string;
  /** Test ID to match */
  testId?: string;
  /** Alt text to match */
  altText?: string;
  /** Title attribute to match */
  title?: string;
  /** Exact text match */
  exact?: boolean;
}

/**
 * DOM selector strategy metadata
 */
export interface DOMSelectorMetadata {
  /** Type of selector used */
  selectorType: 'id' | 'testId' | 'unique' | 'name' | 'path';
  /** Whether ID appears stable */
  isStable?: boolean;
  /** Original ID value */
  id?: string;
  /** Test ID value */
  testId?: string;
}

/**
 * CSS selector strategy metadata
 */
export interface CSSSelectorMetadata {
  /** Type of CSS selector */
  selectorType: 'class' | 'attribute' | 'path' | 'combined';
  /** Classes used in selector */
  classes?: string[];
  /** Attribute used */
  attribute?: string;
  /** Attribute value */
  value?: string;
}

/**
 * Evidence scoring strategy metadata
 */
export interface EvidenceScoringMetadata {
  /** Mouse trail endpoint */
  endpoint: {
    x: number;
    y: number;
  };
  /** Last N points of mouse trail */
  mouseTrail?: Array<{
    x: number;
    y: number;
    timestamp: number;
  }>;
  /** Mouse movement pattern */
  pattern?: 'direct' | 'curved' | 'searching' | 'hesitant' | 'corrective';
  /** Element attributes for verification */
  attributes?: {
    tagName?: string;
    id?: string;
    classList?: string[];
  };
}

/**
 * Vision OCR strategy metadata
 */
export interface VisionOCRMetadata {
  /** Target text to find */
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
  /** Exact text match */
  exact?: boolean;
  /** Case sensitive match */
  caseSensitive?: boolean;
  /** Alternative text variations */
  variations?: string[];
}

/**
 * Coordinates strategy metadata
 */
export interface CoordinatesMetadata {
  /** X coordinate */
  x: number;
  /** Y coordinate */
  y: number;
  /** Original bounding rect */
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

/**
 * ============================================================================
 * FALLBACK CHAIN
 * ============================================================================
 */

/**
 * Complete fallback chain for a recorded action
 * Contains all strategies sorted by confidence (highest first)
 */
export interface FallbackChain {
  /** Ordered array of strategies (highest confidence first) */
  strategies: LocatorStrategy[];
  
  /** Primary strategy type (first in array) */
  primaryStrategy: StrategyType;
  
  /** Timestamp when chain was recorded */
  recordedAt: number;
  
  /** Optional chain ID */
  id?: string;
  
  /** Optional metadata about chain generation */
  generationMetadata?: {
    layersUsed: string[];
    candidatesEvaluated: number;
    processingTime: number;
  };
}

/**
 * ============================================================================
 * CAPTURED ACTION (Recording)
 * ============================================================================
 */

/**
 * Complete captured action from recording
 */
export interface CapturedAction {
  /** Unique action ID */
  id: string;
  
  /** Capture timestamp */
  timestamp: number;
  
  /** Event type */
  eventType: ActionEventType;
  
  /** Input value (for type/select) */
  value?: string;
  
  /** DOM capture data */
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

/**
 * Action event types
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

/**
 * DOM capture data included in action
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
  /** Text content */
  textContent?: string;
  /** Inner text */
  innerText?: string;
  /** Placeholder */
  placeholder?: string;
  /** Test ID */
  testId?: string;
  /** Bounding rect */
  boundingRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Click coordinates */
  x: number;
  y: number;
  /** Attributes */
  attributes: Record<string, string>;
  /** Whether in shadow DOM */
  isInShadowDOM: boolean;
  /** Shadow host chain */
  shadowHostChain?: string[];
  /** Iframe chain */
  iframeChain?: string[];
  /** Unique selector (if generated) */
  uniqueSelector?: string;
  /** Data attributes */
  dataAttributes?: Record<string, string>;
  /** Form context */
  formContext?: {
    formId?: string;
    fieldName?: string;
    fieldType?: string;
  };
}

/**
 * Vision capture data included in action
 */
export interface VisionCaptureData {
  /** Screenshot (base64, may be pruned) */
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
  /** All OCR results (may be pruned) */
  allTextResults?: Array<{
    text: string;
    confidence: number;
    bbox: { x: number; y: number; width: number; height: number };
  }>;
  /** Processing time in ms */
  processingTime?: number;
}

/**
 * Mouse capture data included in action
 */
export interface MouseCaptureData {
  /** Mouse trail points */
  trail: Array<{
    x: number;
    y: number;
    timestamp: number;
  }>;
  /** Trail endpoint */
  endpoint: {
    x: number;
    y: number;
  };
  /** Trail duration in ms */
  duration: number;
  /** Total distance traveled */
  totalDistance: number;
  /** Average velocity (px/s) */
  averageVelocity: number;
  /** Movement pattern classification */
  pattern: 'direct' | 'curved' | 'searching' | 'hesitant' | 'corrective' | 'unknown';
  /** Hesitation points */
  hesitationPoints?: Array<{
    x: number;
    y: number;
    duration: number;
  }>;
  /** Direction changes count */
  directionChanges: number;
}

/**
 * Network capture data included in action
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

/**
 * ============================================================================
 * STRATEGY EVALUATION (Playback)
 * ============================================================================
 */

/**
 * Result of evaluating a single strategy
 */
export interface StrategyEvaluationResult {
  /** Strategy that was evaluated */
  strategy: LocatorStrategy;
  /** Whether element was found */
  found: boolean;
  /** Confidence score (0-1) */
  confidence: number;
  /** Backend node ID if found */
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
 * Results from evaluating all strategies in a chain
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

/**
 * ============================================================================
 * STRATEGY WEIGHTS
 * ============================================================================
 */

/**
 * Fixed strategy weights (not user-configurable)
 * Architecture Decision #6
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
 * Strategy category mapping
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

/**
 * ============================================================================
 * UTILITY TYPES
 * ============================================================================
 */

/**
 * Type guard to check if metadata is CDP semantic
 */
export function isCDPSemanticMetadata(
  metadata: StrategyMetadata | undefined
): metadata is CDPSemanticMetadata {
  return metadata !== undefined && 'role' in metadata;
}

/**
 * Type guard to check if metadata is CDP power
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
 * Type guard to check if metadata is Vision OCR
 */
export function isVisionOCRMetadata(
  metadata: StrategyMetadata | undefined
): metadata is VisionOCRMetadata {
  return metadata !== undefined && 'targetText' in metadata;
}

/**
 * Type guard to check if metadata is Coordinates
 */
export function isCoordinatesMetadata(
  metadata: StrategyMetadata | undefined
): metadata is CoordinatesMetadata {
  return metadata !== undefined && 'x' in metadata && 'y' in metadata && !('endpoint' in metadata);
}

/**
 * Type guard to check if metadata is Evidence Scoring
 */
export function isEvidenceScoringMetadata(
  metadata: StrategyMetadata | undefined
): metadata is EvidenceScoringMetadata {
  return metadata !== undefined && 'endpoint' in metadata;
}

/**
 * Get strategy category from type
 */
export function getStrategyCategory(type: StrategyType): StrategyCategory {
  return STRATEGY_CATEGORIES[type];
}

/**
 * Get base weight for strategy type
 */
export function getStrategyWeight(type: StrategyType): number {
  return STRATEGY_WEIGHTS[type];
}

/**
 * Create empty fallback chain
 */
export function createEmptyFallbackChain(): FallbackChain {
  return {
    strategies: [],
    primaryStrategy: 'coordinates',
    recordedAt: Date.now()
  };
}

/**
 * Sort strategies by confidence (highest first)
 */
export function sortStrategiesByConfidence(strategies: LocatorStrategy[]): LocatorStrategy[] {
  return [...strategies].sort((a, b) => b.confidence - a.confidence);
}
```

---

## Usage Examples

### Creating a Strategy
```typescript
import { LocatorStrategy, CDPSemanticMetadata } from '../types/strategy';

const buttonStrategy: LocatorStrategy = {
  type: 'cdp_semantic',
  confidence: 0.95,
  metadata: {
    role: 'button',
    name: 'Submit'
  } as CDPSemanticMetadata
};
```

### Creating a FallbackChain
```typescript
import { FallbackChain, sortStrategiesByConfidence } from '../types/strategy';

const chain: FallbackChain = {
  strategies: sortStrategiesByConfidence([
    { type: 'cdp_semantic', confidence: 0.95, metadata: { role: 'button', name: 'Submit' } },
    { type: 'dom_selector', selector: '#submit-btn', confidence: 0.85 },
    { type: 'coordinates', confidence: 0.60, metadata: { x: 500, y: 300 } }
  ]),
  primaryStrategy: 'cdp_semantic',
  recordedAt: Date.now()
};
```

### Using Type Guards
```typescript
import { LocatorStrategy, isCDPSemanticMetadata } from '../types/strategy';

function processStrategy(strategy: LocatorStrategy) {
  if (isCDPSemanticMetadata(strategy.metadata)) {
    console.log(`Role: ${strategy.metadata.role}, Name: ${strategy.metadata.name}`);
  }
}
```

---

## Acceptance Criteria

- [ ] All 7 strategy types defined in StrategyType
- [ ] LocatorStrategy interface with type, selector, confidence, metadata
- [ ] All metadata types defined (CDP, DOM, Vision, Evidence, Coordinates)
- [ ] FallbackChain interface with strategies array
- [ ] CapturedAction interface with all capture layers
- [ ] StrategyEvaluationResult for playback
- [ ] STRATEGY_WEIGHTS constant matches Architecture Decision #6
- [ ] Type guards for metadata discrimination
- [ ] Utility functions for common operations
- [ ] TypeScript compiles with strict mode, 0 errors

---

## Edge Cases

1. **Empty metadata**: Should be optional
2. **Unknown strategy type**: Handle gracefully
3. **Missing selector**: Valid for non-DOM strategies
4. **Confidence out of range**: Should be 0-1
5. **Circular imports**: Avoided by consolidating types here
6. **Future strategy types**: Extensible union type
7. **Partial metadata**: Type guards handle missing fields
8. **Serialization**: All types are JSON-serializable
9. **Deep nesting**: Keep interfaces flat where possible
10. **Backward compatibility**: Adding fields is non-breaking

---

## Estimated Lines

350-400 lines

````

---

