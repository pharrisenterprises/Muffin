// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION TYPES - Independently Wrapped Type Definitions
// ═══════════════════════════════════════════════════════════════════════════
// No loose wires - all types self-contained with clear boundaries

import { RecordedStep, Bundle } from '../recording/types';

export type LocatorBundle = Bundle;

// ─────────────────────────────────────────────────────────────────────────────
// SCREENSHOT TYPES (Wrapped independently)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Screenshot capture result with metadata
 * Used for visual validation during recording and playback
 */
export interface ScreenshotCapture {
  /** Base64-encoded PNG image data */
  imageData: string;
  
  /** Timestamp when screenshot was captured */
  timestamp: number;
  
  /** Bounding box of target element */
  elementBounds: BoundingBox;
  
  /** Extended context area (element + 300px padding) */
  contextBounds: BoundingBox;
  
  /** Page URL at time of capture */
  pageUrl: string;
  
  /** Viewport dimensions */
  viewport: { width: number; height: number };
  
  /** Step number this screenshot is associated with */
  stepNumber: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Screenshot capture options - controls what to capture
 */
export interface ScreenshotOptions {
  /** Include element context (default: true) */
  includeContext?: boolean;
  
  /** Context padding in pixels (default: 300) */
  contextPadding?: number;
  
  /** Capture full page (default: false) */
  fullPage?: boolean;
  
  /** Image quality 0-1 (default: 0.8) */
  quality?: number;
  
  /** Add visual highlight to element (default: true) */
  highlightElement?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// VISUAL CONTEXT TYPES (For terminal vs Copilot detection)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Visual context analysis result
 * Prevents terminal/Copilot confusion by analyzing visual patterns
 */
export interface VisualContextResult {
  /** Detected context type */
  contextType: ContextType;
  
  /** Confidence in context detection (0-1) */
  confidence: number;
  
  /** Detected text patterns around element */
  detectedPatterns: DetectedPattern[];
  
  /** Visual characteristics of the element */
  visualCharacteristics: VisualCharacteristics;
  
  /** Warning if context might be misidentified */
  contextWarning?: ContextWarning;
}

export type ContextType = 
  | 'terminal'           // CLI/terminal interface
  | 'copilot-prompt'     // GitHub Copilot prompt
  | 'input-field'        // Standard input field
  | 'button'             // Clickable button
  | 'link'               // Navigation link
  | 'dropdown'           // Select/dropdown
  | 'modal'              // Modal dialog
  | 'editor'             // Code/text editor
  | 'unknown';           // Unable to determine

export interface DetectedPattern {
  /** Pattern type (text, icon, border, etc.) */
  type: 'text' | 'icon' | 'border' | 'background' | 'cursor';
  
  /** Pattern value or description */
  value: string;
  
  /** Confidence in pattern detection */
  confidence: number;
  
  /** Position relative to element */
  position: 'inside' | 'above' | 'below' | 'left' | 'right';
}

export interface VisualCharacteristics {
  /** Background color (hex) */
  backgroundColor: string;
  
  /** Text color (hex) */
  textColor: string;
  
  /** Font family detected */
  fontFamily: string;
  
  /** Is monospace font (terminal indicator) */
  isMonospace: boolean;
  
  /** Has dark theme (terminal indicator) */
  hasDarkTheme: boolean;
  
  /** Has command prompt patterns ($, >, #) */
  hasPromptIndicators: boolean;
  
  /** Border style */
  borderStyle: string;
  
  /** Is inside a code block */
  isInCodeBlock: boolean;
}

export interface ContextWarning {
  /** Warning type */
  type: 'terminal-vs-input' | 'copilot-vs-editor' | 'similar-elements' | 'dynamic-content';
  
  /** Warning message */
  message: string;
  
  /** Suggested verification action */
  suggestedAction: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// LABEL CONFIDENCE TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Label confidence scoring result
 * Measures quality of step labels for reliable playback
 */
export interface LabelConfidenceResult {
  /** Original label */
  originalLabel: string;
  
  /** Overall confidence score (0-1) */
  overallScore: number;
  
  /** Breakdown of confidence factors */
  factors: ConfidenceFactor[];
  
  /** Suggested label if different */
  suggestedLabel?: string;
  
  /** Confidence tier for decision making */
  tier: ConfidenceTier;
}

export interface ConfidenceFactor {
  /** Factor name */
  name: ConfidenceFactorType;
  
  /** Factor score (0-1) */
  score: number;
  
  /** Factor weight in overall calculation */
  weight: number;
  
  /** Explanation */
  explanation: string;
}

export type ConfidenceFactorType =
  | 'text-clarity'        // Label is clear, not generic
  | 'uniqueness'          // Label is unique on page
  | 'aria-match'          // Matches ARIA attributes
  | 'placeholder-match'   // Matches placeholder text
  | 'visual-match'        // Matches visual context
  | 'semantic-meaning'    // Has meaningful semantics
  | 'length-appropriate'; // Not too short or long

export type ConfidenceTier = 
  | 'high'      // >= 0.80 - Auto-accept
  | 'medium'    // 0.60-0.79 - Accept + flag
  | 'low'       // < 0.60 - Needs correction
  | 'critical'; // < 0.30 - Must correct before playback

// ─────────────────────────────────────────────────────────────────────────────
// VALIDATION RESULT TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Complete validation result for a recorded step
 * Unified output - no confusion about step associations
 */
export interface StepValidationResult {
  /** Step number being validated */
  stepNumber: number;
  
  /** Overall validation status */
  status: ValidationStatus;
  
  /** Screenshot capture (if enabled) */
  screenshot?: ScreenshotCapture;
  
  /** Visual context analysis */
  visualContext: VisualContextResult;
  
  /** Label confidence analysis */
  labelConfidence: LabelConfidenceResult;
  
  /** Validation timestamp */
  timestamp: number;
  
  /** Warnings that need attention */
  warnings: ValidationWarning[];
  
  /** Corrections applied (if any) */
  corrections: AppliedCorrection[];
}

export type ValidationStatus = 
  | 'valid'           // Step is validated and ready
  | 'corrected'       // Step was corrected and is now valid
  | 'needs-review'    // Step needs human review
  | 'invalid';        // Step cannot be validated

export interface ValidationWarning {
  /** Warning code */
  code: string;
  
  /** Warning severity */
  severity: 'info' | 'warning' | 'error';
  
  /** Warning message */
  message: string;
  
  /** Suggested fix */
  suggestedFix?: string;
}

export interface AppliedCorrection {
  /** What was corrected */
  field: 'label' | 'selector' | 'contextType' | 'bounds';
  
  /** Original value */
  originalValue: string;
  
  /** Corrected value */
  correctedValue: string;
  
  /** Reason for correction */
  reason: string;
  
  /** Confidence in correction */
  confidence: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// HEALING EXPANSION INTERFACE (For future Claude Vision API)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Vision API Provider Interface - for future expansion
 * Currently: Local validation only
 * Future: Claude Vision API integration
 */
export interface IVisionProvider {
  /** Provider name */
  name: string;
  
  /** Is provider available */
  isAvailable(): Promise<boolean>;
  
  /** Analyze screenshot for element identification */
  analyzeScreenshot(
    screenshot: ScreenshotCapture,
    context: VisionAnalysisContext
  ): Promise<VisionAnalysisResult>;
}

export interface VisionAnalysisContext {
  /** Step label to find */
  targetLabel: string;
  
  /** Element type hint */
  elementType: string;
  
  /** Expected element bounds (if known) */
  expectedBounds?: BoundingBox;
  
  /** Additional context hints */
  hints?: string[];
}

export interface VisionAnalysisResult {
  /** Found element */
  found: boolean;
  
  /** Suggested selector */
  suggestedSelector?: string;
  
  /** Confidence score (0-1) */
  confidence: number;
  
  /** Reasoning */
  reasoning: string;
  
  /** Alternative matches */
  alternatives?: Array<{
    selector: string;
    confidence: number;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// HEALING CACHE TYPES (Local storage, no API needed)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Healing cache key - composite for accurate matching
 */
export interface HealingCacheKey {
  /** Page URL pattern (e.g., "github.com/wildcard/copilot") */
  pageURLPattern: string;
  
  /** Step type (click, input, etc.) */
  stepType: string;
  
  /** Field label */
  fieldLabel: string;
  
  /** Hash of original selector */
  selectorHash: string;
}

/**
 * Cached healing result
 */
export interface CachedHealing {
  /** Cache key */
  key: HealingCacheKey;
  
  /** Original selector that failed */
  originalSelector: string;
  
  /** Healed selector that worked */
  healedSelector: string;
  
  /** Confidence when healed */
  confidence: number;
  
  /** When cached */
  timestamp: number;
  
  /** Success tracking */
  successCount: number;
  failureCount: number;
  
  /** Expiry time (24 hours from last success) */
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
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAYBACK MAPPING TYPES (Uniform performance mapping)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Step-to-playback mapping - ensures uniform playback performance
 * Clear association between recorded step and playback action
 */
export interface PlaybackMapping {
  /** Original recorded step */
  recordedStep: RecordedStep;
  
  /** Validation result */
  validation: StepValidationResult;
  
  /** Playback-ready locator bundle */
  playbackBundle: LocatorBundle;
  
  /** Cached healing (if available) */
  cachedHealing?: CachedHealing;
  
  /** Confidence in playback success */
  playbackConfidence: number;
  
  /** Ordered fallback strategies for this step */
  fallbackStrategies: PlaybackStrategy[];
}

export interface PlaybackStrategy {
  /** Strategy name */
  name: string;
  
  /** Priority (1 = highest) */
  priority: number;
  
  /** Selector to use */
  selector: string;
  
  /** Expected confidence */
  expectedConfidence: number;
  
  /** Timeout for this strategy (ms) */
  timeout: number;
}

/**
 * Complete playback plan - uniform performance for all steps
 */
export interface PlaybackPlan {
  /** Project ID */
  projectId: string;
  
  /** All step mappings */
  mappings: PlaybackMapping[];
  
  /** Overall plan confidence */
  overallConfidence: number;
  
  /** Steps needing review before playback */
  stepsNeedingReview: number[];
  
  /** Timestamp plan was created */
  createdAt: number;
}
