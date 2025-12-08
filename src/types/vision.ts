// src/types/vision.ts

// Re-export common types from indexedDB
export type {
  RecordedStep as Step,
  Project as Recording,
  ConditionalDefaults as RecordingConditionalDefaults,
  ParsedField
} from '../common/services/indexedDB';

// Import ConditionalConfig for internal use and re-export
import type { ConditionalConfig } from '../common/services/indexedDB';
export type { ConditionalConfig };

// Step event types
export type StepEventType = 
  | 'click' 
  | 'type' 
  | 'navigate' 
  | 'conditional-click' 
  | 'dropdown' 
  | 'wait';

// Step coordinates
export interface StepCoordinates {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

// Vision-specific configuration
export interface VisionConfig {
  enabled: boolean;
  confidenceThreshold: number;
  pollIntervalMs: number;
  scrollRetries: number;
  useSIMD: boolean;
  language: "eng" | "spa" | "fra" | "deu";
  debugMode: boolean;
  screenshotQuality: number;
  devicePixelRatio: number;
  fuzzyMatchThreshold: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextResult {
  text: string;
  confidence: number;
  bbox: BoundingBox;
}

export interface ClickTarget {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  confidence: number;
  timestamp: number;
  center: { x: number; y: number };
}

// ConditionalConfig is re-exported from indexedDB above
// It includes: enabled, searchTerms, timeoutSeconds, pollIntervalMs, interactionType, dropdownOption, inputValue

export interface ConditionalClickResult {
  success: boolean;
  attempts: number;
  totalWaitMs: number;
  buttonsClicked: number;
  clickTargets: ClickTarget[];
  clickedTexts: string[];
  duration: number;
  timedOut: boolean;
  error?: string;
}

export interface VisionData {
  targetText: string;
  clickTarget: ClickTarget;
  screenshot?: string;
  ocrConfidence: number;
}

export interface Screenshot {
  dataUrl: string;
  width: number;
  height: number;
  timestamp: number;
}

export interface OcrResult {
  results: TextResult[];
  duration: number;
  timestamp: number;
}

// Backward compatibility alias
export type OCRResult = OcrResult;

// VisionResult encompasses all vision-based detection results
export interface VisionResult {
  found: boolean;
  target?: ClickTarget;
  ocr?: OcrResult;
  screenshot?: Screenshot;
  confidence: number;
  duration: number;
}

export const DEFAULT_VISION_CONFIG: VisionConfig = {
  enabled: true,
  confidenceThreshold: 60,
  pollIntervalMs: 1000,
  scrollRetries: 3,
  useSIMD: true,
  language: "eng",
  debugMode: false,
  screenshotQuality: 0.92,
  devicePixelRatio: 1,
  fuzzyMatchThreshold: 0.7
};

// Vision message types for content script communication
export interface VisionMessage {
  action: 'vision-click' | 'vision-type' | 'vision-ocr' | 'vision-screenshot';
  tabId?: number;
  searchTerms?: string[];
  text?: string;
  coordinates?: { x: number; y: number };
}

export interface VisionResponse {
  success: boolean;
  error?: string;
  result?: unknown;
  coordinates?: { x: number; y: number };
  confidence?: number;
}

export const DEFAULT_CONDITIONAL_CONFIG: ConditionalConfig = {
  enabled: false,
  searchTerms: ["Allow", "Keep", "Continue", "Accept"],
  timeoutSeconds: 120,
  pollIntervalMs: 1000,
  interactionType: "click"
};
