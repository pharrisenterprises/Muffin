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
