/**
 * @fileoverview Recording Type Definitions for Muffin Chrome Extension
 * @description Type definitions for the multi-layer recording system including
 * RecordingOrchestrator configuration, session state, buffer management, and
 * capture layer configurations.
 * 
 * @module types/recording
 * @version 1.0.0
 * @since Phase 4
 * 
 * Dependencies:
 * - VisionConfig from ./vision.ts (for vision capture configuration)
 * - FallbackChain from ./strategy.ts (for captured actions)
 */

import type { FallbackChain } from './strategy';

// ============================================================================
// SECTION 1: RECORDING ORCHESTRATOR CONFIGURATION
// ============================================================================

/**
 * Complete configuration for RecordingOrchestrator.
 * Controls all capture layers and buffer settings.
 */
export interface RecordingOrchestratorConfig {
  /** Buffer configuration */
  buffer: BufferConfig;
  
  /** DOM capture layer configuration */
  dom: DOMCaptureConfig;
  
  /** Vision capture layer configuration */
  vision: VisionCaptureConfig;
  
  /** Mouse capture layer configuration */
  mouse: MouseCaptureConfig;
  
  /** Network capture layer configuration */
  network: NetworkCaptureConfig;
}

/**
 * Default recording configuration.
 * Conservative defaults optimized for reliability and performance.
 */
export const DEFAULT_RECORDING_CONFIG: RecordingOrchestratorConfig = {
  buffer: {
    maxSize: 70 * 1024 * 1024, // 70MB
    autoGC: true,
    gcThreshold: 0.8,
    enableCompression: true,
    debug: false
  },
  dom: {
    captureSnapshots: false,
    computeXPath: true,
    maxDepth: 3,
    captureAttributes: true,
    captureStyles: false
  },
  vision: {
    enabled: true,
    captureInterval: 500,
    minConfidence: 60,
    maxDimension: 1920
  },
  mouse: {
    trailSize: 50,
    trailDecay: 2000,
    captureClicks: true,
    captureMovement: true,
    samplingRate: 16
  },
  network: {
    captureXHR: true,
    captureFetch: true,
    maxBodySize: 1024 * 10,
    captureHeaders: false,
    captureResponseBody: false
  }
} as const;

// ============================================================================
// SECTION 2: RECORDING SESSION STATE
// ============================================================================

/**
 * Active recording session state.
 * Tracks session lifecycle and metrics.
 */
export interface RecordingSession {
  /** Session ID */
  sessionId: string;
  
  /** Project ID (optional) */
  projectId?: string;
  
  /** Tab ID being recorded */
  tabId: number;
  
  /** Session start timestamp */
  startTime: number;
  
  /** Current session state */
  state: RecordingSessionState;
  
  /** Number of actions captured */
  actionsCount: number;
  
  /** Total evidence size in bytes */
  evidenceSize: number;
  
  /** Session configuration */
  config: RecordingOrchestratorConfig;
  
  /** Errors encountered during session */
  errors: RecordingError[];
  
  /** Last action timestamp */
  lastActionAt?: number;
  
  /** Session metadata */
  metadata?: {
    url?: string;
    title?: string;
    userAgent?: string;
  };
}

/**
 * Recording session state enum.
 */
export type RecordingSessionState =
  | 'idle'          // No active recording
  | 'initializing'  // Setting up capture layers
  | 'recording'     // Actively recording
  | 'paused'        // Recording paused
  | 'finalizing'    // Processing final evidence
  | 'completed'     // Successfully completed
  | 'error';        // Fatal error occurred

/**
 * Recording error tracking.
 */
export interface RecordingError {
  /** Error timestamp */
  timestamp: number;
  
  /** Error message */
  message: string;
  
  /** Error source (layer or component) */
  source: string;
  
  /** Error severity */
  severity: 'warning' | 'error' | 'fatal';
  
  /** Additional error context */
  context?: Record<string, unknown>;
  
  /** Error stack trace */
  stack?: string;
}

// ============================================================================
// SECTION 3: BUFFER CONFIGURATION
// ============================================================================

/**
 * EvidenceBuffer configuration.
 * Controls memory management and storage pruning.
 */
export interface BufferConfig {
  /** Maximum buffer size in bytes */
  maxSize: number;
  
  /** Enable automatic garbage collection */
  autoGC: boolean;
  
  /** GC threshold (0-1, percentage of maxSize) */
  gcThreshold: number;
  
  /** Enable compression for large evidence */
  enableCompression: boolean;
  
  /** Debug mode (logs GC activity) */
  debug: boolean;
}

/**
 * Buffer metadata for monitoring.
 */
export interface BufferMetadata {
  /** Current buffer size in bytes */
  currentSize: number;
  
  /** Maximum allowed size */
  maxSize: number;
  
  /** Number of actions stored */
  actionsCount: number;
  
  /** Number of GC runs */
  gcRuns: number;
  
  /** Last GC timestamp */
  lastGC?: number;
  
  /** Buffer utilization (0-1) */
  utilization: number;
  
  /** Pruned evidence count */
  prunedCount?: number;
}

/**
 * Default buffer configuration.
 * Matches Chrome Recorder's 70MB limit.
 */
export const DEFAULT_BUFFER_CONFIG: BufferConfig = {
  maxSize: 70 * 1024 * 1024,
  autoGC: true,
  gcThreshold: 0.8,
  enableCompression: true,
  debug: false
} as const;

// ============================================================================
// SECTION 4: CAPTURE LAYER CONFIGURATIONS
// ============================================================================

/**
 * DOM capture layer configuration.
 * Controls DOM snapshot and XPath generation.
 */
export interface DOMCaptureConfig {
  /** Capture full DOM snapshots */
  captureSnapshots: boolean;
  
  /** Compute XPath selectors */
  computeXPath: boolean;
  
  /** Maximum tree depth for snapshots */
  maxDepth: number;
  
  /** Capture element attributes */
  captureAttributes: boolean;
  
  /** Capture computed styles */
  captureStyles: boolean;
}

/**
 * Vision capture layer configuration.
 * Controls screenshot and OCR capture.
 */
export interface VisionCaptureConfig {
  /** Enable vision capture */
  enabled: boolean;
  
  /** Minimum interval between captures (ms) */
  captureInterval: number;
  
  /** Minimum OCR confidence (0-100) */
  minConfidence: number;
  
  /** Maximum screenshot dimension (width/height) */
  maxDimension: number;
  
  /** Capture format (jpeg, png, webp) */
  format?: 'jpeg' | 'png' | 'webp';
  
  /** JPEG/WebP quality (0-100) */
  quality?: number;
  
  /** Enable screenshot compression */
  enableCompression?: boolean;
}

/**
 * Mouse capture layer configuration.
 * Controls mouse trail tracking.
 */
export interface MouseCaptureConfig {
  /** Mouse trail size (number of points) */
  trailSize: number;
  
  /** Trail decay time (ms) */
  trailDecay: number;
  
  /** Capture click events */
  captureClicks: boolean;
  
  /** Capture mouse movement */
  captureMovement: boolean;
  
  /** Movement sampling rate (ms) */
  samplingRate: number;
}

/**
 * Network capture layer configuration.
 * Controls network request tracking.
 */
export interface NetworkCaptureConfig {
  /** Capture XMLHttpRequest */
  captureXHR: boolean;
  
  /** Capture Fetch API */
  captureFetch: boolean;
  
  /** Maximum request/response body size */
  maxBodySize: number;
  
  /** Capture request/response headers */
  captureHeaders: boolean;
  
  /** Capture response bodies */
  captureResponseBody: boolean;
}

// ============================================================================
// SECTION 5: CAPTURE RESULTS
// ============================================================================

/**
 * Base capture result interface.
 * Extended by layer-specific results.
 */
export interface BaseCaptureResult {
  /** Capture timestamp */
  timestamp: number;
  
  /** Capture layer */
  layer: CaptureLayer;
  
  /** Whether capture succeeded */
  success: boolean;
  
  /** Error message if failed */
  error?: string;
  
  /** Capture duration in ms */
  duration: number;
}

/**
 * Capture layer enum.
 */
export type CaptureLayer = 'dom' | 'vision' | 'mouse' | 'network';

/**
 * DOM capture result.
 * Contains DOM element information and selectors.
 */
export interface DOMCaptureResult extends BaseCaptureResult {
  layer: 'dom';
  
  /** CSS selector */
  selector?: string;
  
  /** XPath selector */
  xpath?: string;
  
  /** Alternative CSS selector */
  cssSelector?: string;
  
  /** Element attributes */
  attributes?: Record<string, string>;
  
  /** Text content */
  textContent?: string;
  
  /** Bounding box */
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  /** Parent element info */
  parent?: {
    tagName: string;
    id?: string;
    classList?: string[];
  };
  
  /** DOM snapshot (if enabled) */
  snapshot?: string;
}

/**
 * Vision capture result.
 * Contains screenshot and OCR data.
 */
export interface VisionCaptureResult extends BaseCaptureResult {
  layer: 'vision';
  
  /** Screenshot (base64) */
  screenshot?: string;
  
  /** OCR results */
  ocrResults?: OCRResult[];
  
  /** Screenshot dimensions */
  dimensions?: {
    width: number;
    height: number;
  };
  
  /** Compression ratio (if compressed) */
  compressionRatio?: number;
}

/**
 * OCR result for a text region.
 */
export interface OCRResult {
  /** Detected text */
  text: string;
  
  /** Confidence (0-100) */
  confidence: number;
  
  /** Bounding box */
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Mouse capture result.
 * Contains mouse trail and click information.
 */
export interface MouseCaptureResult extends BaseCaptureResult {
  layer: 'mouse';
  
  /** Mouse event type */
  eventType: 'click' | 'dblclick' | 'move' | 'wheel';
  
  /** Mouse coordinates */
  coordinates: {
    x: number;
    y: number;
  };
  
  /** Mouse trail points */
  trail?: Array<{
    x: number;
    y: number;
    timestamp: number;
    distance?: number;
    velocity?: number;
  }>;
  
  /** Mouse button */
  button?: 'left' | 'right' | 'middle';
  
  /** Keyboard modifiers */
  modifiers?: {
    alt: boolean;
    ctrl: boolean;
    meta: boolean;
    shift: boolean;
  };
}

/**
 * Mouse trail point with computed metrics.
 */
export interface MouseTrailPoint {
  x: number;
  y: number;
  timestamp: number;
  distance?: number;
  velocity?: number;
}

/**
 * Network capture result.
 * Contains network request information.
 */
export interface NetworkCaptureResult extends BaseCaptureResult {
  layer: 'network';
  
  /** Request URL */
  url: string;
  
  /** Request method */
  method: string;
  
  /** Request headers */
  headers?: Record<string, string>;
  
  /** Request body (truncated) */
  requestBody?: string;
  
  /** Response status */
  status?: number;
  
  /** Response headers */
  responseHeaders?: Record<string, string>;
  
  /** Response body (truncated) */
  responseBody?: string;
  
  /** Request type (xhr, fetch, other) */
  requestType: 'xhr' | 'fetch' | 'other';
  
  /** Request duration in ms */
  requestDuration?: number;
}

// ============================================================================
// SECTION 6: CAPTURED ACTION
// ============================================================================

/**
 * Complete captured action bundling all evidence layers.
 * This is what gets stored in EvidenceBuffer and eventually the database.
 */
export interface CapturedAction {
  /** Action ID (UUID) */
  actionId: string;
  
  /** Action timestamp */
  timestamp: number;
  
  /** Action type */
  actionType: ActionType;
  
  /** Target selector (primary) */
  selector: string;
  
  /** Evidence from all layers */
  evidence: {
    dom: DOMCaptureResult;
    vision?: VisionCaptureResult;
    mouse?: MouseCaptureResult;
    network?: NetworkCaptureResult;
  };
  
  /** Generated fallback chain */
  fallbackChain: FallbackChain;
  
  /** Action metadata */
  metadata?: {
    url: string;
    title: string;
    viewport: {
      width: number;
      height: number;
    };
    userAgent?: string;
  };
}

/**
 * Action types supported by recorder.
 */
export type ActionType =
  | 'click'
  | 'dblclick'
  | 'type'
  | 'select'
  | 'check'
  | 'uncheck'
  | 'hover'
  | 'scroll'
  | 'navigate'
  | 'wait';

// ============================================================================
// SECTION 7: RECORDING EVENTS
// ============================================================================

/**
 * Recording event types for UI communication.
 */
export type RecordingEventType =
  | 'recording:started'
  | 'recording:paused'
  | 'recording:resumed'
  | 'recording:stopped'
  | 'recording:action'
  | 'recording:error'
  | 'buffer:warning'
  | 'buffer:full';

/**
 * Recording event payload.
 */
export interface RecordingEvent {
  /** Event type */
  type: RecordingEventType;
  
  /** Event timestamp */
  timestamp: number;
  
  /** Session ID */
  sessionId: string;
  
  /** Event data */
  data?: Record<string, unknown>;
}

// ============================================================================
// BACKWARD COMPATIBILITY ALIASES
// ============================================================================

/**
 * Alias for RecordingSessionState.
 * @deprecated Use RecordingSessionState instead
 */
export type RecordingState = RecordingSessionState;

/**
 * Alias for RecordingSessionState.
 * @deprecated Use RecordingSessionState instead  
 */
export type RecordingStatus = RecordingSessionState;
