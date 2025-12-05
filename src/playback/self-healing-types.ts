// ═══════════════════════════════════════════════════════════════════════════
// SELF-HEALING PLAYBACK TYPES - Type Definitions for Batch 9
// ═══════════════════════════════════════════════════════════════════════════
// All types for self-healing playback system

import type { RecordedStep } from '../recording/types';
import type { BoundingBox } from '../validation/types';

// Re-export BoundingBox for use by other self-healing modules
export type { BoundingBox };

// ─────────────────────────────────────────────────────────────────────────────
// SCREENSHOT COMPARISON TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Screenshot comparison result
 */
export interface ScreenshotComparisonResult {
  /** Are the screenshots similar enough? */
  match: boolean;
  
  /** Similarity score (0-1) */
  similarity: number;
  
  /** Comparison method used */
  method: ComparisonMethod;
  
  /** Regions that differ significantly */
  diffRegions: DiffRegion[];
  
  /** Target element still visible in current? */
  elementVisible: boolean;
  
  /** Target element location changed? */
  elementMoved: boolean;
  
  /** New element location (if moved) */
  newElementBounds?: BoundingBox;
  
  /** Confidence in the match */
  confidence: number;
  
  /** Duration of comparison (ms) */
  duration: number;
}

export type ComparisonMethod = 
  | 'pixel-diff'       // Direct pixel comparison
  | 'structural'       // DOM structure comparison  
  | 'perceptual-hash'  // Image hashing (pHash)
  | 'feature-match'    // Feature detection
  | 'combined';        // Multiple methods

export interface DiffRegion {
  /** Region bounds */
  bounds: BoundingBox;
  
  /** Difference intensity (0-1) */
  intensity: number;
  
  /** Type of difference */
  type: 'added' | 'removed' | 'changed' | 'moved';
  
  /** Is this the target element region? */
  isTargetRegion: boolean;
}

/**
 * Screenshot comparison options
 */
export interface ComparisonOptions {
  /** Similarity threshold to consider match (default: 0.85) */
  similarityThreshold: number;
  
  /** Ignore color differences (default: false) */
  ignoreColors: boolean;
  
  /** Ignore small differences (default: true) */
  ignoreNoise: boolean;
  
  /** Noise threshold in pixels (default: 5) */
  noiseThreshold: number;
  
  /** Focus on element region only (default: true) */
  focusOnElement: boolean;
  
  /** Include surrounding context (default: 100px) */
  contextPadding: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// ELEMENT DRIFT TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Element drift detection result
 */
export interface DriftDetectionResult {
  /** Was drift detected? */
  driftDetected: boolean;
  
  /** Type of drift */
  driftType: DriftType;
  
  /** Original element bounds (from recording) */
  originalBounds: BoundingBox;
  
  /** Current element bounds (if found) */
  currentBounds?: BoundingBox;
  
  /** Distance drifted (pixels) */
  driftDistance: number;
  
  /** Direction of drift */
  driftDirection?: DriftDirection;
  
  /** Size change */
  sizeChange?: SizeChange;
  
  /** Is element still interactable? */
  stillInteractable: boolean;
  
  /** Suggested correction */
  correction?: DriftCorrection;
  
  /** Confidence in drift detection */
  confidence: number;
}

export type DriftType =
  | 'none'          // No drift
  | 'position'      // Element moved
  | 'size'          // Element resized
  | 'both'          // Moved and resized
  | 'disappeared'   // Element not found
  | 'replaced';     // Different element at location

export interface DriftDirection {
  horizontal: 'left' | 'right' | 'none';
  vertical: 'up' | 'down' | 'none';
  deltaX: number;
  deltaY: number;
}

export interface SizeChange {
  widthChange: number;  // Positive = larger
  heightChange: number;
  percentChange: number;
}

export interface DriftCorrection {
  /** Corrected bounds */
  correctedBounds: BoundingBox;
  
  /** Corrected selector (if needed) */
  correctedSelector?: string;
  
  /** Correction method */
  method: 'bounds-adjust' | 'selector-update' | 'both';
  
  /** Confidence in correction */
  confidence: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// ELEMENT GRAPH TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Element relationship graph captured during recording
 */
export interface ElementGraph {
  /** Target element node */
  target: ElementNode;
  
  /** Parent chain (immediate parent to root) */
  parents: ElementNode[];
  
  /** Sibling elements */
  siblings: ElementNode[];
  
  /** Child elements (first level only) */
  children: ElementNode[];
  
  /** Nearby elements (within 200px) */
  nearby: ElementNode[];
  
  /** Landmark elements on page */
  landmarks: ElementNode[];
}

export interface ElementNode {
  /** Node identifier */
  nodeId: string;
  
  /** Relationship to target */
  relationship: ElementRelationship;
  
  /** Tag name */
  tagName: string;
  
  /** Element text (truncated) */
  text: string;
  
  /** Key attributes */
  attributes: {
    id?: string;
    className?: string;
    name?: string;
    ariaLabel?: string;
    role?: string;
    dataTestId?: string;
  };
  
  /** Bounding box */
  bounds: BoundingBox;
  
  /** Selector to find this element */
  selector: string;
  
  /** Is this element likely stable? */
  isStable: boolean;
  
  /** Distance from target (for nearby) */
  distanceFromTarget?: number;
}

export type ElementRelationship =
  | 'target'         // The target element itself
  | 'parent'         // Direct parent
  | 'ancestor'       // Parent of parent, etc.
  | 'sibling'        // Same parent
  | 'child'          // Direct child
  | 'nearby'         // Within proximity
  | 'landmark';      // Page landmark (header, nav, main, footer)

/**
 * Graph-based element finding result
 */
export interface GraphFindResult {
  /** Was element found? */
  found: boolean;
  
  /** Found element */
  element?: HTMLElement;
  
  /** Selector used */
  selector?: string;
  
  /** Strategy that worked */
  strategy: GraphFindStrategy;
  
  /** Relationship path taken */
  relationshipPath: string[];
  
  /** Confidence in the find */
  confidence: number;
  
  /** Alternative candidates */
  alternatives: Array<{
    element: HTMLElement;
    selector: string;
    confidence: number;
  }>;
}

export type GraphFindStrategy =
  | 'parent-child'      // Find parent, then child selector
  | 'sibling-relative'  // Find sibling, then relative position
  | 'landmark-path'     // From landmark to target
  | 'nearby-text'       // Find nearby, then direction
  | 'combined';         // Multiple strategies

// ─────────────────────────────────────────────────────────────────────────────
// PLAYBACK TROUBLESHOOTER TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Playback troubleshooting session
 */
export interface TroubleshootingSession {
  /** Session ID */
  sessionId: string;
  
  /** Step being troubleshot */
  step: RecordedStep;
  
  /** All diagnostic results */
  diagnostics: DiagnosticResult[];
  
  /** Resolution attempts */
  resolutionAttempts: ResolutionAttempt[];
  
  /** Final resolution (if found) */
  finalResolution?: Resolution;
  
  /** Session status */
  status: TroubleshootingStatus;
  
  /** Total time spent (ms) */
  totalDuration: number;
  
  /** Timestamp */
  timestamp: number;
}

export type TroubleshootingStatus =
  | 'diagnosing'     // Running diagnostics
  | 'resolving'      // Attempting resolutions
  | 'resolved'       // Successfully resolved
  | 'unresolved'     // Could not resolve
  | 'manual';        // Needs manual intervention

/**
 * Individual diagnostic result
 */
export interface DiagnosticResult {
  /** Diagnostic type */
  type: DiagnosticType;
  
  /** Diagnostic passed? */
  passed: boolean;
  
  /** Diagnostic message */
  message: string;
  
  /** Detailed findings */
  findings: Record<string, unknown>;
  
  /** Suggested actions */
  suggestedActions: string[];
  
  /** Duration (ms) */
  duration: number;
}

export type DiagnosticType =
  | 'page-loaded'         // Is page fully loaded?
  | 'element-exists'      // Does element exist in DOM?
  | 'element-visible'     // Is element visible?
  | 'element-interactable'// Can element be clicked/typed?
  | 'screenshot-match'    // Does screenshot match?
  | 'drift-check'         // Has element drifted?
  | 'context-match'       // Is visual context same?
  | 'graph-integrity'     // Are related elements present?
  | 'selector-valid'      // Is selector still valid?
  | 'iframe-accessible'   // Can iframe be accessed?
  | 'shadow-accessible';  // Can shadow DOM be accessed?

/**
 * Resolution attempt
 */
export interface ResolutionAttempt {
  /** Resolution strategy */
  strategy: ResolutionStrategy;
  
  /** Was it successful? */
  success: boolean;
  
  /** Resulting selector (if successful) */
  resultSelector?: string;
  
  /** Confidence in resolution */
  confidence: number;
  
  /** Error if failed */
  error?: string;
  
  /** Duration (ms) */
  duration: number;
}

export type ResolutionStrategy =
  | 'retry-original'      // Retry original selector
  | 'drift-correction'    // Apply drift correction
  | 'graph-navigation'    // Use element graph
  | 'evidence-scoring'    // Batch 10: Multi-evidence scoring
  | 'healing-cache'       // Use cached healing
  | 'screenshot-locate'   // Locate via screenshot
  | 'local-vision'        // Local pattern matching
  | 'ai-vision'           // Claude Vision API
  | 'manual-selector';    // User-provided selector

/**
 * Final resolution
 */
export interface Resolution {
  /** Strategy that worked */
  strategy: ResolutionStrategy;
  
  /** Final selector */
  selector: string;
  
  /** Found element */
  element: HTMLElement;
  
  /** Confidence */
  confidence: number;
  
  /** Should this be cached? */
  shouldCache: boolean;
  
  /** Should this update the recording? */
  shouldUpdateRecording: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// SELF-HEALING PLAYBACK ENGINE TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Playback configuration
 */
export interface SelfHealingPlaybackConfig {
  /** Enable self-healing (default: true) */
  selfHealingEnabled: boolean;
  
  /** Enable screenshot comparison (default: true) */
  screenshotComparisonEnabled: boolean;
  
  /** Enable drift detection (default: true) */
  driftDetectionEnabled: boolean;
  
  /** Enable graph-based finding (default: true) */
  graphFindingEnabled: boolean;
  
  /** Enable AI healing (default: false until API key) */
  aiHealingEnabled: boolean;
  
  /** Auto-apply high-confidence healings (default: true) */
  autoApplyHealings: boolean;
  
  /** Flag medium-confidence healings for review (default: true) */
  flagMediumConfidence: boolean;
  
  /** Maximum healing attempts per step (default: 3) */
  maxHealingAttempts: number;
  
  /** Step execution timeout (ms) (default: 30000) */
  stepTimeout: number;
  
  /** Element wait timeout (ms) (default: 10000) */
  elementTimeout: number;
  
  /** Screenshot similarity threshold (default: 0.85) */
  screenshotThreshold: number;
  
  /** Drift distance threshold (px) (default: 50) */
  driftThreshold: number;
  
  /** Debug logging (default: false) */
  debugLogging: boolean;
}

/**
 * Step execution result
 */
export interface StepExecutionResult {
  /** Step number */
  stepNumber: number;
  
  /** Was execution successful? */
  success: boolean;
  
  /** Was healing applied? */
  healingApplied: boolean;
  
  /** Healing details (if applied) */
  healingDetails?: {
    strategy: ResolutionStrategy;
    originalSelector: string;
    healedSelector: string;
    confidence: number;
  };
  
  /** Final selector used */
  finalSelector: string;
  
  /** Final element bounds */
  finalBounds?: BoundingBox;
  
  /** Execution duration (ms) */
  duration: number;
  
  /** Error if failed */
  error?: string;
  
  /** Troubleshooting session (if needed) */
  troubleshootingSession?: TroubleshootingSession;
  
  /** Should recording be updated? */
  suggestRecordingUpdate: boolean;
}

/**
 * Playback session state
 */
export interface PlaybackSessionState {
  /** Session ID */
  sessionId: string;
  
  /** Project ID */
  projectId: string;
  
  /** Current step index */
  currentStepIndex: number;
  
  /** Total steps */
  totalSteps: number;
  
  /** Steps executed */
  stepsExecuted: StepExecutionResult[];
  
  /** Healing statistics */
  healingStats: {
    attempted: number;
    successful: number;
    failed: number;
    cached: number;
  };
  
  /** Session start time */
  startTime: number;
  
  /** Current status */
  status: 'running' | 'paused' | 'completed' | 'failed' | 'aborted';
  
  /** Pause reason (if paused) */
  pauseReason?: string;
}
