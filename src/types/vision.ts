/**
 * Vision Engine Type Definitions
 * Phase 3: Muffin Lite Vision Enhancement
 * 
 * This file contains all TypeScript interfaces for the Vision/OCR features.
 * All types are centralized here for easy importing across the codebase.
 */

// ============================================================================
// VISION ENGINE CONFIGURATION
// ============================================================================

/**
 * Configuration options for the Vision Engine OCR system.
 * Controls OCR behavior, confidence thresholds, and polling settings.
 */
export interface VisionConfig {
  /** Minimum OCR confidence threshold (0-100). Default: 60 */
  confidenceThreshold: number;
  /** Milliseconds between OCR scans during polling. Default: 1000 */
  pollIntervalMs: number;
  /** Number of scroll attempts before giving up on finding text. Default: 3 */
  scrollRetries: number;
  /** Whether to use SIMD optimization if available. Default: true */
  useSIMD?: boolean;
  /** Tesseract language code. Default: 'eng' */
  language?: string;
  /** Enable debug logging. Default: false */
  debugMode?: boolean;
}

/**
 * Default Vision configuration values.
 */
export const DEFAULT_VISION_CONFIG: VisionConfig = {
  confidenceThreshold: 60,
  pollIntervalMs: 1000,
  scrollRetries: 3,
  useSIMD: true,
  language: 'eng',
  debugMode: false,
};

// ============================================================================
// OCR RESULTS
// ============================================================================

/**
 * Bounding box coordinates for detected text.
 * Includes center point for click targeting.
 */
export interface TextBounds {
  /** Left edge X coordinate in pixels */
  x: number;
  /** Top edge Y coordinate in pixels */
  y: number;
  /** Width of the bounding box in pixels */
  width: number;
  /** Height of the bounding box in pixels */
  height: number;
  /** Center X coordinate (x + width/2) */
  centerX: number;
  /** Center Y coordinate (y + height/2) */
  centerY: number;
}

/**
 * Result from OCR text recognition.
 * Contains the detected text, confidence score, and location.
 */
export interface TextResult {
  /** The recognized text string */
  text: string;
  /** OCR confidence score (0-100) */
  confidence: number;
  /** Bounding box location of the text */
  bounds: TextBounds;
}

/**
 * Target for Vision-based clicking.
 * Simplified structure with center coordinates for click dispatch.
 */
export interface ClickTarget {
  /** The text that was matched */
  text: string;
  /** Center X coordinate for clicking */
  x: number;
  /** Center Y coordinate for clicking */
  y: number;
  /** OCR confidence score (0-100) */
  confidence: number;
}

// ============================================================================
// CONDITIONAL CLICK CONFIGURATION
// ============================================================================

/**
 * Interaction types supported by conditional click steps.
 */
export type ConditionalInteractionType = 'click' | 'dropdown' | 'input';

/**
 * Configuration for conditional click steps.
 * Enables polling-based waiting for dynamic content like approval buttons.
 */
export interface ConditionalConfig {
  /** Whether conditional behavior is enabled for this step */
  enabled: boolean;
  /** Text strings to search for (e.g., ['Allow', 'Keep', 'Continue']) */
  searchTerms: string[];
  /** Maximum time to wait in seconds. Default: 120 */
  timeoutSeconds: number;
  /** Milliseconds between OCR polls. Default: 1000 */
  pollIntervalMs: number;
  /** Type of interaction when text is found */
  interactionType: ConditionalInteractionType;
  /** For dropdown type: the option to select */
  dropdownOption?: string;
  /** For input type: the value to enter */
  inputValue?: string;
}

/**
 * Default conditional configuration values.
 */
export const DEFAULT_CONDITIONAL_CONFIG: Omit<ConditionalConfig, 'enabled' | 'searchTerms'> = {
  timeoutSeconds: 120,
  pollIntervalMs: 1000,
  interactionType: 'click',
};

/**
 * Result from a conditional click polling loop.
 */
export interface ConditionalClickResult {
  /** Number of buttons/elements successfully clicked */
  buttonsClicked: number;
  /** Whether the operation timed out before finding all targets */
  timedOut: boolean;
  /** Total duration of the polling loop in milliseconds */
  duration: number;
  /** Text of buttons that were clicked */
  clickedTexts?: string[];
}

/**
 * Result of a quick scan (single-attempt) operation.
 * Used by the auto-detection failsafe (ENG-015).
 */
export interface QuickScanResult {
  /** Whether a matching button was found */
  found: boolean;
  /** Whether the button was successfully clicked */
  clicked: boolean;
  /** The search term that matched (if found) */
  buttonText?: string;
  /** The actual text that was matched in OCR (if found) */
  matchedText?: string;
  /** OCR confidence of the match (if found) */
  confidence?: number;
  /** Error message if something went wrong */
  error?: string;
}

// ============================================================================
// STEP RECORDING
// ============================================================================

/**
 * How the step was recorded: DOM selector or Vision/OCR.
 */
export type RecordedVia = 'dom' | 'vision';

/**
 * Coordinate data for Vision-recorded steps.
 */
export interface StepCoordinates {
  /** X coordinate of the click point */
  x: number;
  /** Y coordinate of the click point */
  y: number;
  /** Width of the detected element/text */
  width: number;
  /** Height of the detected element/text */
  height: number;
}

/**
 * Event types supported by steps.
 * Extended to include dropdown and conditional-click for Vision features.
 */
export type StepEventType = 
  | 'open' 
  | 'click' 
  | 'input' 
  | 'dropdown' 
  | 'conditional-click';

// ============================================================================
// RECORDING DEFAULTS
// ============================================================================

/**
 * Default conditional settings stored at the recording level.
 */
export interface RecordingConditionalDefaults {
  /** Default search terms for new conditional steps */
  searchTerms: string[];
  /** Default timeout in seconds */
  timeoutSeconds: number;
  /** Default confidence threshold (0-100) */
  confidenceThreshold: number;
}

/**
 * Default recording-level conditional settings.
 */
export const DEFAULT_RECORDING_CONDITIONAL: RecordingConditionalDefaults = {
  searchTerms: ['Allow', 'Keep'],
  timeoutSeconds: 120,
  confidenceThreshold: 60,
};

// ============================================================================
// VISION MESSAGE TYPES (for content script communication)
// ============================================================================

/**
 * Message types for Vision commands sent to content scripts.
 */
export type VisionMessageType =
  | 'VISION_CLICK'
  | 'VISION_TYPE'
  | 'VISION_KEY'
  | 'VISION_SCROLL'
  | 'VISION_GET_ELEMENT';

/**
 * Vision click command message.
 */
export interface VisionClickMessage {
  type: 'VISION_CLICK';
  x: number;
  y: number;
}

/**
 * Vision type command message.
 */
export interface VisionTypeMessage {
  type: 'VISION_TYPE';
  text: string;
}

/**
 * Vision keyboard command message.
 */
export interface VisionKeyMessage {
  type: 'VISION_KEY';
  key: string;
  modifiers?: {
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    metaKey?: boolean;
  };
}

/**
 * Vision scroll command message.
 */
export interface VisionScrollMessage {
  type: 'VISION_SCROLL';
  direction: 'up' | 'down';
  amount?: number;
}

/**
 * Vision get element command message.
 */
export interface VisionGetElementMessage {
  type: 'VISION_GET_ELEMENT';
  x: number;
  y: number;
}

/**
 * Union type for all Vision messages.
 */
export type VisionMessage =
  | VisionClickMessage
  | VisionTypeMessage
  | VisionKeyMessage
  | VisionScrollMessage
  | VisionGetElementMessage;

/**
 * Response from Vision command handlers.
 */
export interface VisionResponse {
  success: boolean;
  error?: string;
  data?: unknown;
}

// ============================================================================
// EXTENDED STEP INTERFACE
// ============================================================================

/**
 * Extended Step interface with Vision and delay fields.
 * All new fields are optional for backward compatibility with existing recordings.
 * 
 * Existing steps will have recordedVia default to 'dom' via migration.
 */
export interface Step {
  // === EXISTING FIELDS (unchanged) ===
  /** Unique step identifier */
  id?: number;
  /** User-defined label for the step */
  label: string;
  /** Type of event/action */
  event: StepEventType;
  /** Input value for input/dropdown steps */
  value?: string;
  /** CSS selector for the target element */
  selector?: string;
  /** XPath for the target element */
  xpath?: string;
  /** URL for navigation steps */
  url?: string;
  /** Timestamp when step was recorded */
  timestamp?: number;
  /** Order index in the recording */
  order?: number;

  // === NEW FIELDS (Phase 3 Vision Enhancement) ===
  
  /**
   * How the step was recorded.
   * - 'dom': Traditional DOM selector-based recording
   * - 'vision': OCR/coordinate-based recording (Vision fallback)
   * @default 'dom' (set by migration for existing steps)
   */
  recordedVia?: RecordedVia;

  /**
   * Screen coordinates for Vision-recorded steps.
   * Only populated when recordedVia === 'vision'.
   */
  coordinates?: StepCoordinates;

  /**
   * OCR text that was matched during Vision recording.
   * Stored for debugging and re-matching during playback.
   */
  ocrText?: string;

  /**
   * OCR confidence score (0-100) from Vision recording.
   * Higher values indicate more reliable text recognition.
   */
  confidenceScore?: number;

  /**
   * Delay in seconds to wait BEFORE executing this step.
   * Used for steps that need the page to settle.
   */
  delaySeconds?: number;

  /**
   * Configuration for conditional click behavior.
   * Only used when event === 'conditional-click'.
   */
  conditionalConfig?: ConditionalConfig | null;
}

/**
 * Creates a new Step with default values.
 * Use this factory function when programmatically creating steps.
 */
export function createDefaultStep(overrides: Partial<Step> = {}): Step {
  return {
    label: '',
    event: 'click',
    recordedVia: 'dom',
    ...overrides,
  };
}

/**
 * Type guard to check if a step was recorded via Vision.
 */
export function isVisionStep(step: Step): boolean {
  return step.recordedVia === 'vision';
}

/**
 * Type guard to check if a step is a conditional click.
 */
export function isConditionalStep(step: Step): boolean {
  return step.event === 'conditional-click';
}

/**
 * Type guard to check if a step has a delay configured.
 */
export function hasStepDelay(step: Step): boolean {
  return typeof step.delaySeconds === 'number' && step.delaySeconds > 0;
}

// ============================================================================
// EXTENDED RECORDING INTERFACE
// ============================================================================

/**
 * Extended Recording interface with loop, delay, and conditional configuration.
 * All new fields have sensible defaults for backward compatibility.
 */
export interface Recording {
  // === EXISTING FIELDS ===
  /** Unique recording identifier */
  id?: number;
  /** Associated project ID */
  projectId: number;
  /** Recording name/title */
  name?: string;
  /** Array of recorded steps */
  steps: Step[];
  /** When the recording was created */
  createdAt?: number;
  /** When the recording was last modified */
  updatedAt?: number;

  // === NEW FIELDS (Phase 3 Vision Enhancement) ===

  /**
   * Schema version for migration tracking.
   * - v1: Original schema (no Vision fields)
   * - v2: Added Vision fields
   * - v3: Current version with all features
   * @default 3
   */
  schemaVersion?: number;

  /**
   * Index of the step where CSV loop iteration begins.
   * Steps before this index execute only on the first row.
   * Steps at and after this index execute for every CSV row.
   * @default 0 (all steps execute for every row)
   */
  loopStartIndex: number;

  /**
   * Global delay in milliseconds to apply AFTER each step.
   * Applied only when the step doesn't have its own delaySeconds.
   * @default 0 (no delay)
   */
  globalDelayMs: number;

  /**
   * Default settings for new conditional click steps.
   * These values are used when creating new conditional steps.
   */
  conditionalDefaults: RecordingConditionalDefaults;

  /**
   * Parsed CSV field mappings for data-driven testing.
   * Populated after CSV upload and field mapping.
   */
  parsedFields?: ParsedField[];

  /**
   * Raw CSV data rows.
   * First row is headers, subsequent rows are data.
   */
  csvData?: string[][];
}

/**
 * Parsed field mapping from CSV columns to step labels.
 */
export interface ParsedField {
  /** CSV column header name */
  columnName: string;
  /** Index of the column in CSV (0-based) */
  columnIndex: number;
  /** Target step label to inject value into */
  targetLabel: string;
  /** Step indices that match this target label */
  stepIndices: number[];
}

/**
 * Creates a new Recording with default values.
 * Use this factory function when programmatically creating recordings.
 */
export function createDefaultRecording(projectId: number, overrides: Partial<Recording> = {}): Recording {
  return {
    projectId,
    steps: [],
    schemaVersion: 3,
    loopStartIndex: -1,
    globalDelayMs: 0,
    conditionalDefaults: { ...DEFAULT_RECORDING_CONDITIONAL },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

/**
 * Checks if a recording has CSV loop configuration.
 */
export function hasLoopConfig(recording: Recording): boolean {
  return recording.loopStartIndex > 0;
}

/**
 * Checks if a recording has a global delay configured.
 */
export function hasGlobalDelay(recording: Recording): boolean {
  return recording.globalDelayMs > 0;
}

/**
 * Gets the steps that execute only on the first CSV row.
 */
export function getPreLoopSteps(recording: Recording): Step[] {
  return recording.steps.slice(0, recording.loopStartIndex);
}

/**
 * Gets the steps that execute for every CSV row.
 */
export function getLoopSteps(recording: Recording): Step[] {
  return recording.steps.slice(recording.loopStartIndex);
}

// ============================================================================
// MIGRATION HELPERS
// ============================================================================

/**
 * Migrates a legacy step (v1) to the current schema (v3).
 * Adds default values for all new fields.
 */
export function migrateStep(step: Partial<Step>): Step {
  return {
    ...step,
    label: step.label || '',
    event: step.event || 'click',
    recordedVia: step.recordedVia || 'dom',
  } as Step;
}

/**
 * Migrates a legacy recording (v1/v2) to the current schema (v3).
 * Adds default values for all new fields and migrates all steps.
 */
export function migrateRecording(recording: Partial<Recording>, projectId: number): Recording {
  const migratedSteps = (recording.steps || []).map(migrateStep);
  
  return {
    ...recording,
    projectId: recording.projectId || projectId,
    steps: migratedSteps,
    schemaVersion: 3,
    loopStartIndex: recording.loopStartIndex ?? -1,
    globalDelayMs: recording.globalDelayMs ?? 0,
    conditionalDefaults: recording.conditionalDefaults || { ...DEFAULT_RECORDING_CONDITIONAL },
    createdAt: recording.createdAt || Date.now(),
    updatedAt: Date.now(),
  } as Recording;
}

/**
 * Validates that a recording has been migrated to the current schema.
 */
export function isRecordingMigrated(recording: Partial<Recording>): boolean {
  return recording.schemaVersion === 3 &&
    typeof recording.loopStartIndex === 'number' &&
    typeof recording.globalDelayMs === 'number' &&
    recording.conditionalDefaults !== undefined;
}
