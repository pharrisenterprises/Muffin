# types/recording.ts Content Specification

**File ID:** E3  
**File Path:** `src/types/recording.ts`  
**Status:** CREATE  
**Priority:** P0

---

## Purpose

Defines TypeScript types and interfaces for the multi-layer recording system. Covers configuration types for RecordingOrchestrator, EvidenceBuffer, and all 4 capture layers (DOM, Vision, Mouse, Network). Provides type definitions for evidence metadata, buffer management, and orchestrator lifecycle. This file ensures type safety across the entire recording pipeline from user action capture through evidence storage.

---

## Dependencies

### Uses (imports from)
- `./vision`: VisionConfig
- `./strategy`: FallbackChain, LocatorStrategy

### Used By (exports to)
- `../contentScript/RecordingOrchestrator`: RecordingOrchestratorConfig, RecordingSession
- `../contentScript/EvidenceBuffer`: BufferConfig, BufferMetadata
- `../contentScript/layers/DOMCapture`: DOMCaptureConfig, DOMCaptureResult
- `../contentScript/layers/VisionCapture`: VisionCaptureConfig, VisionCaptureResult
- `../contentScript/layers/MouseCapture`: MouseCaptureConfig, MouseCaptureResult
- `../contentScript/layers/NetworkCapture`: NetworkCaptureConfig, NetworkCaptureResult
- `../contentScript/content.tsx`: RecordingSessionState
- `../pages/Recorder.tsx`: Display recording state

---

## Type Definitions

```typescript
/**
 * ============================================================================
 * RECORDING ORCHESTRATOR CONFIGURATION
 * ============================================================================
 */

/**
 * Configuration for the RecordingOrchestrator
 */
export interface RecordingOrchestratorConfig {
  /** Enable vision/OCR capture layer */
  enableVision: boolean;
  
  /** Enable mouse trail tracking layer */
  enableMouse: boolean;
  
  /** Enable network request capture layer */
  enableNetwork: boolean;
  
  /** Vision-specific configuration */
  visionConfig: VisionConfig;
  
  /** Maximum buffer size in bytes (default: 73400320 = 70MB) */
  bufferSizeLimit: number;
  
  /** Tab ID being recorded */
  tabId: number;
  
  /** Project ID for this recording session */
  projectId: string;
  
  /** Enable debug logging */
  debug: boolean;
}

/**
 * Default recording configuration
 */
export const DEFAULT_RECORDING_CONFIG: RecordingOrchestratorConfig = {
  enableVision: true,
  enableMouse: true,
  enableNetwork: true,
  visionConfig: {
    captureScreenshots: true,
    runOCR: true,
    ocrConfidenceThreshold: 0.6,
    maxScreenshotSize: 1920 * 1080,
    compressionQuality: 0.8
  },
  bufferSizeLimit: 70 * 1024 * 1024, // 70MB
  tabId: -1,
  projectId: '',
  debug: false
};

/**
 * ============================================================================
 * RECORDING SESSION STATE
 * ============================================================================
 */

/**
 * Current recording session state
 */
export interface RecordingSession {
  /** Session ID (generated on start) */
  sessionId: string;
  
  /** Project ID */
  projectId: string;
  
  /** Tab ID */
  tabId: number;
  
  /** Session start timestamp */
  startTime: number;
  
  /** Current recording state */
  state: RecordingSessionState;
  
  /** Number of actions captured */
  actionsCount: number;
  
  /** Total evidence size in bytes */
  evidenceSize: number;
  
  /** Configuration used for this session */
  config: RecordingOrchestratorConfig;
  
  /** Errors encountered during recording */
  errors: RecordingError[];
}

/**
 * Recording session state machine
 */
export type RecordingSessionState =
  | 'idle'         // Not recording
  | 'initializing' // Setting up capture layers
  | 'recording'    // Actively recording user actions
  | 'paused'       // Recording paused
  | 'finalizing'   // Generating final data structures
  | 'completed'    // Recording finished successfully
  | 'error';       // Recording failed

/**
 * Recording error information
 */
export interface RecordingError {
  /** Timestamp when error occurred */
  timestamp: number;
  
  /** Error message */
  message: string;
  
  /** Error source (which layer or component) */
  source: string;
  
  /** Error severity */
  severity: 'warning' | 'error' | 'critical';
  
  /** Additional error context */
  context?: Record<string, any>;
}

/**
 * ============================================================================
 * EVIDENCE BUFFER TYPES
 * ============================================================================
 */

/**
 * Configuration for EvidenceBuffer
 */
export interface BufferConfig {
  /** Maximum buffer size in bytes */
  maxSize: number;
  
  /** Enable automatic garbage collection */
  autoGC: boolean;
  
  /** GC threshold (percentage of maxSize) */
  gcThreshold: number;
  
  /** Enable compression for stored evidence */
  enableCompression: boolean;
  
  /** Debug logging */
  debug: boolean;
}

/**
 * Default buffer configuration
 */
export const DEFAULT_BUFFER_CONFIG: BufferConfig = {
  maxSize: 70 * 1024 * 1024, // 70MB
  autoGC: true,
  gcThreshold: 0.8, // GC when 80% full
  enableCompression: true,
  debug: false
};

/**
 * Buffer metadata for monitoring
 */
export interface BufferMetadata {
  /** Current buffer size in bytes */
  currentSize: number;
  
  /** Maximum buffer size in bytes */
  maxSize: number;
  
  /** Number of actions stored */
  actionsCount: number;
  
  /** Number of GC runs performed */
  gcRuns: number;
  
  /** Last GC timestamp */
  lastGC: number | null;
  
  /** Buffer utilization percentage (0-100) */
  utilization: number;
}

/**
 * ============================================================================
 * CAPTURE LAYER CONFIGURATION
 * ============================================================================
 */

/**
 * DOM Capture Layer Configuration
 */
export interface DOMCaptureConfig {
  /** Enable capturing DOM snapshots */
  captureSnapshots: boolean;
  
  /** Enable computing XPath selectors */
  computeXPath: boolean;
  
  /** Enable computing CSS selectors */
  computeCSS: boolean;
  
  /** Maximum depth for DOM traversal */
  maxDepth: number;
  
  /** Debug logging */
  debug: boolean;
}

/**
 * Vision Capture Layer Configuration
 */
export interface VisionCaptureConfig extends VisionConfig {
  /** Enable layer */
  enabled: boolean;
  
  /** Capture frequency (ms between captures) */
  captureInterval: number;
  
  /** Debug logging */
  debug: boolean;
}

/**
 * Mouse Capture Layer Configuration
 */
export interface MouseCaptureConfig {
  /** Enable layer */
  enabled: boolean;
  
  /** Trail buffer size (number of points) */
  trailSize: number;
  
  /** Trail decay time (ms) */
  trailDecay: number;
  
  /** Capture clicks */
  captureClicks: boolean;
  
  /** Capture movements */
  captureMovements: boolean;
  
  /** Capture hovers */
  captureHovers: boolean;
  
  /** Debug logging */
  debug: boolean;
}

/**
 * Network Capture Layer Configuration
 */
export interface NetworkCaptureConfig {
  /** Enable layer */
  enabled: boolean;
  
  /** Capture XHR requests */
  captureXHR: boolean;
  
  /** Capture Fetch requests */
  captureFetch: boolean;
  
  /** Capture WebSocket messages */
  captureWebSocket: boolean;
  
  /** Maximum request body size to capture */
  maxBodySize: number;
  
  /** Debug logging */
  debug: boolean;
}

/**
 * ============================================================================
 * CAPTURE RESULTS
 * ============================================================================
 */

/**
 * Base interface for all capture results
 */
export interface BaseCaptureResult {
  /** Capture timestamp */
  timestamp: number;
  
  /** Capture layer type */
  layer: CaptureLayer;
  
  /** Capture success status */
  success: boolean;
  
  /** Error message if capture failed */
  error?: string;
  
  /** Capture duration in ms */
  duration: number;
}

/**
 * Capture layer type
 */
export type CaptureLayer = 'dom' | 'vision' | 'mouse' | 'network';

/**
 * DOM capture result
 */
export interface DOMCaptureResult extends BaseCaptureResult {
  layer: 'dom';
  
  /** Target element selector */
  selector: string;
  
  /** XPath to element */
  xpath?: string;
  
  /** CSS selector to element */
  cssSelector?: string;
  
  /** Element attributes */
  attributes: Record<string, string>;
  
  /** Element text content */
  textContent: string;
  
  /** Element bounding box */
  boundingBox: DOMRect;
  
  /** Parent element info */
  parent?: {
    tagName: string;
    id: string;
    className: string;
  };
  
  /** DOM snapshot (if enabled) */
  snapshot?: string;
}

/**
 * Vision capture result
 */
export interface VisionCaptureResult extends BaseCaptureResult {
  layer: 'vision';
  
  /** Screenshot data URL */
  screenshot?: string;
  
  /** OCR results */
  ocrResults?: OCRResult[];
  
  /** Screenshot dimensions */
  dimensions: {
    width: number;
    height: number;
  };
  
  /** Compression ratio applied */
  compressionRatio: number;
}

/**
 * OCR result from vision layer
 */
export interface OCRResult {
  /** Detected text */
  text: string;
  
  /** Confidence score (0-1) */
  confidence: number;
  
  /** Bounding box of text */
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Mouse capture result
 */
export interface MouseCaptureResult extends BaseCaptureResult {
  layer: 'mouse';
  
  /** Mouse event type */
  eventType: 'click' | 'move' | 'hover';
  
  /** Mouse coordinates */
  coordinates: {
    x: number;
    y: number;
    clientX: number;
    clientY: number;
    pageX: number;
    pageY: number;
  };
  
  /** Mouse trail points */
  trail: MouseTrailPoint[];
  
  /** Button pressed (for clicks) */
  button?: number;
  
  /** Modifier keys */
  modifiers: {
    shift: boolean;
    ctrl: boolean;
    alt: boolean;
    meta: boolean;
  };
}

/**
 * Mouse trail point
 */
export interface MouseTrailPoint {
  /** X coordinate */
  x: number;
  
  /** Y coordinate */
  y: number;
  
  /** Timestamp */
  timestamp: number;
  
  /** Distance from previous point */
  distance: number;
  
  /** Velocity (px/ms) */
  velocity: number;
}

/**
 * Network capture result
 */
export interface NetworkCaptureResult extends BaseCaptureResult {
  layer: 'network';
  
  /** Request URL */
  url: string;
  
  /** Request method */
  method: string;
  
  /** Request headers */
  headers: Record<string, string>;
  
  /** Request body (truncated if too large) */
  requestBody?: string;
  
  /** Response status */
  status?: number;
  
  /** Response headers */
  responseHeaders?: Record<string, string>;
  
  /** Response body (truncated if too large) */
  responseBody?: string;
  
  /** Request type */
  requestType: 'xhr' | 'fetch' | 'websocket';
  
  /** Request duration (ms) */
  requestDuration?: number;
}

/**
 * ============================================================================
 * CAPTURED ACTION
 * ============================================================================
 */

/**
 * A captured action with evidence from all layers
 */
export interface CapturedAction {
  /** Action ID (generated) */
  actionId: string;
  
  /** Action timestamp */
  timestamp: number;
  
  /** Action type */
  actionType: ActionType;
  
  /** Target element selector */
  selector: string;
  
  /** Evidence from all capture layers */
  evidence: {
    dom?: DOMCaptureResult;
    vision?: VisionCaptureResult;
    mouse?: MouseCaptureResult;
    network?: NetworkCaptureResult;
  };
  
  /** Generated FallbackChain */
  fallbackChain: FallbackChain;
  
  /** Action metadata */
  metadata: {
    url: string;
    title: string;
    viewport: {
      width: number;
      height: number;
    };
  };
}

/**
 * Action types that can be recorded
 */
export type ActionType =
  | 'click'
  | 'type'
  | 'select'
  | 'hover'
  | 'scroll'
  | 'navigate'
  | 'wait';

/**
 * ============================================================================
 * EXPORTS
 * ============================================================================
 */

export default {
  DEFAULT_RECORDING_CONFIG,
  DEFAULT_BUFFER_CONFIG
};
```

---

## Integration Points

### With RecordingOrchestrator (A1)
- `RecordingOrchestratorConfig`: Configuration type
- `RecordingSession`: Session state tracking
- `CapturedAction`: Output from orchestrator

### With EvidenceBuffer (A2)
- `BufferConfig`: Buffer configuration
- `BufferMetadata`: Buffer monitoring

### With Capture Layers (A3-A6)
- `DOMCaptureConfig`, `DOMCaptureResult`: DOM layer (A3)
- `VisionCaptureConfig`, `VisionCaptureResult`: Vision layer (A4)
- `MouseCaptureConfig`, `MouseCaptureResult`: Mouse layer (A5)
- `NetworkCaptureConfig`, `NetworkCaptureResult`: Network layer (A6)

### With Strategy Types (E1)
- `FallbackChain`: Strategy chain generation
- `LocatorStrategy`: Individual strategies

### With Vision Types (E4)
- `VisionConfig`: Vision service configuration
- `OCRResult`: OCR data structure

---

## Implementation Notes

1. **Type Safety:** All recording configuration and results are strongly typed
2. **Layer Abstraction:** `BaseCaptureResult` provides common interface for all layers
3. **State Machine:** `RecordingSessionState` tracks orchestrator lifecycle
4. **Buffer Management:** `BufferMetadata` enables monitoring and GC decisions
5. **Evidence Packaging:** `CapturedAction` bundles all evidence with FallbackChain
6. **Configuration Defaults:** Provides sensible defaults for all configs
7. **Error Handling:** `RecordingError` captures issues during recording

---

## Phase 3 Integration

**ENG-001 (7-Tier Fallback Chain):**
- `FallbackChain` field in `CapturedAction` stores generated strategies

**ENG-007 (DOM Capture Layer):**
- `DOMCaptureConfig` enables/disables DOM evidence capture
- `DOMCaptureResult` stores captured DOM evidence

**ENG-008 (Vision Capture Layer):**
- `VisionCaptureConfig` controls screenshot and OCR capture
- `VisionCaptureResult` stores vision evidence

**TST-009 (Mouse Trail Evidence):**
- `MouseCaptureConfig` enables mouse tracking
- `MouseCaptureResult` stores mouse trail data

**UI-010 (Network Capture Layer):**
- `NetworkCaptureConfig` controls network request capture
- `NetworkCaptureResult` stores network evidence

**UI-011 (Multi-Layer Recording UI):**
- `RecordingSession` displays current recording state
- `BufferMetadata` shows buffer utilization

**DAT-003 (Evidence Buffer):**
- `BufferConfig` configures buffer size and GC
- `BufferMetadata` tracks buffer health

**ENG-016 (Recording Orchestrator):**
- `RecordingOrchestratorConfig` configures all capture layers
- `RecordingSession` manages orchestrator lifecycle
- `CapturedAction` is the orchestrator's primary output

---

## File Status

**Status:** CREATE  
**Location:** `src/types/recording.ts`  
**Dependencies:** VisionConfig (E4), FallbackChain (E1)  
**Used By:** RecordingOrchestrator (A1), EvidenceBuffer (A2), all capture layers (A3-A6)

This file provides comprehensive type definitions for the entire recording system, ensuring type safety across all 4 capture layers and the orchestrator.
