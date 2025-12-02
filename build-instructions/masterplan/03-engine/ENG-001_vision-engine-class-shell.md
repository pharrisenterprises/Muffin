# ENG-001: VISIONENGINE CLASS SHELL SPECIFICATION

> **Build Card:** ENG-001  
> **Category:** Engine / Core  
> **Dependencies:** FND-004 (Types), FND-005 (VisionConfig), DAT-006 (State storage)  
> **Risk Level:** Medium  
> **Estimated Lines:** ~480

---

## 1. PURPOSE

This specification defines the foundational VisionEngine class shell - the core orchestrator for all Vision/OCR operations. The VisionEngine is responsible for:

1. **Tesseract.js worker management** - Initialize, manage, and terminate workers
2. **Screenshot capture** - Capture viewport images for OCR processing
3. **OCR execution** - Perform text recognition on captured images
4. **Configuration management** - Apply and update Vision settings
5. **Result processing** - Transform raw OCR output into usable data

This is the **class shell** - it defines the structure, public API, and key method signatures. Subsequent specifications (ENG-002 through ENG-007) will implement the individual methods.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| FND-004 | Type definitions | VisionConfig, TextResult, ClickTarget |
| FND-005 | VisionConfig interface | Configuration structure |
| DAT-006 | Vision state storage | State management |
| Architecture Spec | `/future-spec/04_architecture.md` | VisionEngine design |
| Tesseract.js Docs | npm package | Worker API |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `src/lib/visionEngine.ts` | CREATE | VisionEngine class implementation |
| `src/lib/index.ts` | MODIFY | Export VisionEngine |

### Public API

| Method | Description |
|--------|-------------|
| `constructor` | Initialize with optional config |
| `initialize` | Start Tesseract worker |
| `terminate` | Stop worker and cleanup |
| `captureScreenshot` | Capture current viewport |
| `recognizeText` | Perform OCR on image |
| `findText` | Search for text in viewport |
| `findAllText` | Find all instances of text |
| `clickAtText` | Find and click on text |
| `getConfig` | Get current configuration |
| `updateConfig` | Update configuration |

---

## 4. DETAILED SPECIFICATION

### 4.1 Class Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      VisionEngine                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐    ┌─────────────────┐                 │
│  │ Configuration   │    │ Worker Manager  │                 │
│  │ - VisionConfig  │    │ - Tesseract.js  │                 │
│  │ - State storage │    │ - Worker pool   │                 │
│  └────────┬────────┘    └────────┬────────┘                 │
│           │                      │                          │
│           ▼                      ▼                          │
│  ┌─────────────────────────────────────────┐               │
│  │           Core Operations               │               │
│  │  - captureScreenshot()                  │               │
│  │  - recognizeText()                      │               │
│  │  - findText()                           │               │
│  │  - clickAtText()                        │               │
│  └─────────────────────────────────────────┘               │
│                         │                                   │
│                         ▼                                   │
│  ┌─────────────────────────────────────────┐               │
│  │           Result Processing             │               │
│  │  - Filter by confidence                 │               │
│  │  - Transform to ClickTarget             │               │
│  │  - Cache results                        │               │
│  └─────────────────────────────────────────┘               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Class Shell Implementation

Create `src/lib/visionEngine.ts`:

```typescript
/**
 * @fileoverview VisionEngine - Core OCR and Vision automation engine
 * @module lib/visionEngine
 * 
 * The VisionEngine class provides the core functionality for Vision-based
 * automation, including OCR text recognition, element finding, and
 * coordinate-based clicking.
 * 
 * @example
 * ```typescript
 * const engine = new VisionEngine({ confidenceThreshold: 70 });
 * await engine.initialize();
 * 
 * const result = await engine.findText(['Allow', 'Keep']);
 * if (result) {
 *   await engine.clickAtCoordinates(result.x, result.y);
 * }
 * 
 * await engine.terminate();
 * ```
 */

import Tesseract, { Worker, createWorker } from 'tesseract.js';
import type {
  VisionConfig,
  TextResult,
  ClickTarget,
  ConditionalClickResult,
} from '@/types';
import {
  visionStateStorage,
  DEFAULT_VISION_CONFIG,
} from '@/lib/visionStateStorage';
import { filterByConfidence, findTextMatch, toClickTarget } from '@/lib/textResultUtils';

/**
 * Options for text recognition
 */
export interface RecognizeOptions {
  /** Override confidence threshold for this operation */
  confidenceThreshold?: number;
  /** Specific region to scan (viewport coordinates) */
  region?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Skip cache and force fresh OCR */
  skipCache?: boolean;
}

/**
 * Options for finding text
 */
export interface FindTextOptions extends RecognizeOptions {
  /** Search terms to find */
  searchTerms: string[];
  /** Case-sensitive matching */
  caseSensitive?: boolean;
  /** Require exact match (not substring) */
  exactMatch?: boolean;
  /** Maximum results to return (for findAllText) */
  maxResults?: number;
}

/**
 * Options for clicking at text
 */
export interface ClickAtTextOptions extends FindTextOptions {
  /** Offset from center X */
  offsetX?: number;
  /** Offset from center Y */
  offsetY?: number;
  /** Click type */
  clickType?: 'left' | 'right' | 'double';
}

/**
 * Screenshot result
 */
export interface ScreenshotResult {
  /** Base64-encoded image data (without data URL prefix) */
  data: string;
  /** Image width */
  width: number;
  /** Image height */
  height: number;
  /** When screenshot was captured */
  timestamp: number;
  /** Format of the image */
  format: 'png' | 'jpeg';
}

/**
 * Engine status
 */
export type EngineStatus =
  | 'uninitialized'
  | 'initializing'
  | 'ready'
  | 'busy'
  | 'error'
  | 'terminated';

/**
 * Engine event types
 */
export type EngineEventType =
  | 'statusChange'
  | 'ocrStart'
  | 'ocrComplete'
  | 'ocrError'
  | 'configChange';

/**
 * Engine event handler
 */
export type EngineEventHandler = (event: {
  type: EngineEventType;
  data?: unknown;
}) => void;

/**
 * VisionEngine - Core OCR and Vision automation engine
 * 
 * Provides methods for capturing screenshots, performing OCR,
 * finding text elements, and executing coordinate-based clicks.
 */
export class VisionEngine {
  // ==================== Private Properties ====================

  /** Tesseract.js worker instance */
  private worker: Worker | null = null;

  /** Current engine configuration */
  private config: VisionConfig;

  /** Current engine status */
  private status: EngineStatus = 'uninitialized';

  /** Error message if status is 'error' */
  private errorMessage: string | null = null;

  /** Event listeners */
  private eventListeners: Map<EngineEventType, Set<EngineEventHandler>> = new Map();

  /** Operation counter for metrics */
  private operationCount: number = 0;

  /** Last OCR results cache */
  private lastResults: TextResult[] | null = null;

  /** Last screenshot cache */
  private lastScreenshot: ScreenshotResult | null = null;

  // ==================== Constructor ====================

  /**
   * Creates a new VisionEngine instance
   * @param config - Optional configuration overrides
   */
  constructor(config: Partial<VisionConfig> = {}) {
    this.config = {
      ...DEFAULT_VISION_CONFIG,
      ...config,
    };
  }

  // ==================== Lifecycle Methods ====================

  /**
   * Initializes the Tesseract.js worker
   * Must be called before any OCR operations
   * 
   * @throws Error if initialization fails
   * 
   * @example
   * ```typescript
   * const engine = new VisionEngine();
   * await engine.initialize();
   * ```
   */
  async initialize(): Promise<void> {
    if (this.status === 'ready') {
      console.log('[VisionEngine] Already initialized');
      return;
    }

    if (this.status === 'initializing') {
      throw new Error('Engine is already initializing');
    }

    this.setStatus('initializing');

    try {
      // Create worker with configuration
      this.worker = await createWorker(this.config.language || 'eng', 1, {
        // Worker options
        workerPath: chrome.runtime.getURL('tesseract/worker.min.js'),
        corePath: chrome.runtime.getURL(
          this.config.useSIMD
            ? 'tesseract/tesseract-core-simd.wasm.js'
            : 'tesseract/tesseract-core.wasm.js'
        ),
        langPath: chrome.runtime.getURL('tesseract'),
        // Logging
        logger: (m) => {
          if (this.config.useSIMD === false) {
            // Only log in debug mode
            console.log('[Tesseract]', m);
          }
        },
      });

      this.setStatus('ready');
      console.log('[VisionEngine] Initialized successfully');

      // Update state storage
      visionStateStorage.updateWorkerState({
        status: 'ready',
        initializedAt: Date.now(),
      });

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.errorMessage = message;
      this.setStatus('error');
      
      visionStateStorage.updateWorkerState({
        status: 'error',
        errorMessage: message,
      });

      throw new Error(`Failed to initialize VisionEngine: ${message}`);
    }
  }

  /**
   * Terminates the Tesseract.js worker and cleans up resources
   * 
   * @example
   * ```typescript
   * await engine.terminate();
   * ```
   */
  async terminate(): Promise<void> {
    if (this.worker) {
      try {
        await this.worker.terminate();
      } catch (error) {
        console.error('[VisionEngine] Error during termination:', error);
      }
      this.worker = null;
    }

    this.lastResults = null;
    this.lastScreenshot = null;
    this.setStatus('terminated');

    visionStateStorage.updateWorkerState({
      status: 'terminated',
    });

    console.log('[VisionEngine] Terminated');
  }

  // ==================== Status Methods ====================

  /**
   * Gets the current engine status
   * @returns Current EngineStatus
   */
  getStatus(): EngineStatus {
    return this.status;
  }

  /**
   * Checks if the engine is ready for operations
   * @returns True if ready
   */
  isReady(): boolean {
    return this.status === 'ready';
  }

  /**
   * Gets the last error message
   * @returns Error message or null
   */
  getErrorMessage(): string | null {
    return this.errorMessage;
  }

  // ==================== Configuration Methods ====================

  /**
   * Gets the current configuration
   * @returns Current VisionConfig
   */
  getConfig(): VisionConfig {
    return { ...this.config };
  }

  /**
   * Updates the configuration
   * @param updates - Partial configuration updates
   * @returns Updated configuration
   */
  updateConfig(updates: Partial<VisionConfig>): VisionConfig {
    this.config = {
      ...this.config,
      ...updates,
    };

    this.emit('configChange', { config: this.config });

    return this.getConfig();
  }

  // ==================== Core OCR Methods ====================
  // (Method bodies will be implemented in subsequent specs)

  /**
   * Captures a screenshot of the current viewport
   * 
   * @param tabId - Optional tab ID (defaults to active tab)
   * @returns Screenshot result with base64 data
   * @throws Error if capture fails
   * 
   * @see ENG-002 for implementation
   */
  async captureScreenshot(tabId?: number): Promise<ScreenshotResult> {
    this.ensureReady();
    // Implementation in ENG-002
    throw new Error('Not implemented - see ENG-002');
  }

  /**
   * Performs OCR on an image and returns text results
   * 
   * @param image - Base64 image data or ScreenshotResult
   * @param options - Recognition options
   * @returns Array of TextResult objects
   * @throws Error if OCR fails
   * 
   * @see ENG-003 for implementation
   */
  async recognizeText(
    image: string | ScreenshotResult,
    options: RecognizeOptions = {}
  ): Promise<TextResult[]> {
    this.ensureReady();
    // Implementation in ENG-003
    throw new Error('Not implemented - see ENG-003');
  }

  /**
   * Captures screenshot and performs OCR in one operation
   * 
   * @param options - Recognition options
   * @returns Array of TextResult objects
   * 
   * @see ENG-004 for implementation
   */
  async scanViewport(options: RecognizeOptions = {}): Promise<TextResult[]> {
    this.ensureReady();
    // Implementation in ENG-004
    throw new Error('Not implemented - see ENG-004');
  }

  // ==================== Text Finding Methods ====================

  /**
   * Finds the first occurrence of any search term
   * 
   * @param searchTerms - Terms to search for
   * @param options - Search options
   * @returns ClickTarget if found, null otherwise
   * 
   * @see ENG-005 for implementation
   */
  async findText(
    searchTerms: string[],
    options: Omit<FindTextOptions, 'searchTerms'> = {}
  ): Promise<ClickTarget | null> {
    this.ensureReady();
    // Implementation in ENG-005
    throw new Error('Not implemented - see ENG-005');
  }

  /**
   * Finds all occurrences of search terms
   * 
   * @param searchTerms - Terms to search for
   * @param options - Search options
   * @returns Array of ClickTargets
   * 
   * @see ENG-005 for implementation
   */
  async findAllText(
    searchTerms: string[],
    options: Omit<FindTextOptions, 'searchTerms'> = {}
  ): Promise<ClickTarget[]> {
    this.ensureReady();
    // Implementation in ENG-005
    throw new Error('Not implemented - see ENG-005');
  }

  // ==================== Click Methods ====================

  /**
   * Clicks at specific viewport coordinates
   * 
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param options - Click options
   * 
   * @see ENG-006 for implementation
   */
  async clickAtCoordinates(
    x: number,
    y: number,
    options: {
      clickType?: 'left' | 'right' | 'double';
      tabId?: number;
    } = {}
  ): Promise<void> {
    // Implementation in ENG-006
    throw new Error('Not implemented - see ENG-006');
  }

  /**
   * Finds text and clicks on it
   * 
   * @param searchTerms - Terms to search for
   * @param options - Click options
   * @returns ClickTarget that was clicked, or null
   * 
   * @see ENG-006 for implementation
   */
  async clickAtText(
    searchTerms: string[],
    options: Omit<ClickAtTextOptions, 'searchTerms'> = {}
  ): Promise<ClickTarget | null> {
    this.ensureReady();
    // Implementation in ENG-006
    throw new Error('Not implemented - see ENG-006');
  }

  // ==================== Conditional Click Methods ====================

  /**
   * Polls for text and clicks when found
   * 
   * @param searchTerms - Terms to search for
   * @param timeoutSeconds - Maximum time to poll
   * @param pollIntervalMs - Time between polls
   * @returns Conditional click result
   * 
   * @see ENG-007 for implementation
   */
  async pollAndClick(
    searchTerms: string[],
    timeoutSeconds: number,
    pollIntervalMs: number = this.config.pollIntervalMs
  ): Promise<ConditionalClickResult> {
    this.ensureReady();
    // Implementation in ENG-007
    throw new Error('Not implemented - see ENG-007');
  }

  // ==================== Event Methods ====================

  /**
   * Adds an event listener
   * @param event - Event type
   * @param handler - Event handler
   */
  on(event: EngineEventType, handler: EngineEventHandler): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(handler);
  }

  /**
   * Removes an event listener
   * @param event - Event type
   * @param handler - Event handler to remove
   */
  off(event: EngineEventType, handler: EngineEventHandler): void {
    const handlers = this.eventListeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  // ==================== Metrics Methods ====================

  /**
   * Gets operation count
   * @returns Number of OCR operations performed
   */
  getOperationCount(): number {
    return this.operationCount;
  }

  /**
   * Gets cached results from last OCR operation
   * @returns Last TextResult array or null
   */
  getLastResults(): TextResult[] | null {
    return this.lastResults ? [...this.lastResults] : null;
  }

  /**
   * Gets last captured screenshot
   * @returns Last ScreenshotResult or null
   */
  getLastScreenshot(): ScreenshotResult | null {
    return this.lastScreenshot ? { ...this.lastScreenshot } : null;
  }

  // ==================== Private Methods ====================

  /**
   * Ensures the engine is ready for operations
   * @throws Error if not ready
   */
  private ensureReady(): void {
    if (this.status !== 'ready') {
      throw new Error(
        `VisionEngine not ready. Current status: ${this.status}. ` +
        `Call initialize() first.`
      );
    }
  }

  /**
   * Sets the engine status and emits event
   * @param status - New status
   */
  private setStatus(status: EngineStatus): void {
    const previousStatus = this.status;
    this.status = status;

    if (previousStatus !== status) {
      this.emit('statusChange', { previousStatus, status });
    }
  }

  /**
   * Emits an event to listeners
   * @param type - Event type
   * @param data - Event data
   */
  private emit(type: EngineEventType, data?: unknown): void {
    const handlers = this.eventListeners.get(type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler({ type, data });
        } catch (error) {
          console.error(`[VisionEngine] Event handler error:`, error);
        }
      }
    }
  }

  /**
   * Increments operation counter
   */
  protected incrementOperationCount(): void {
    this.operationCount++;
  }

  /**
   * Caches OCR results
   * @param results - Results to cache
   */
  protected cacheResults(results: TextResult[]): void {
    this.lastResults = results;
  }

  /**
   * Caches screenshot
   * @param screenshot - Screenshot to cache
   */
  protected cacheScreenshot(screenshot: ScreenshotResult): void {
    this.lastScreenshot = screenshot;
  }

  /**
   * Gets the Tesseract worker (for internal use)
   * @returns Worker instance
   * @throws Error if not initialized
   */
  protected getWorker(): Worker {
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }
    return this.worker;
  }
}

// Export singleton instance for convenience
let defaultEngine: VisionEngine | null = null;

/**
 * Gets the default VisionEngine instance (singleton)
 * @returns Default VisionEngine
 */
export function getDefaultEngine(): VisionEngine {
  if (!defaultEngine) {
    defaultEngine = new VisionEngine();
  }
  return defaultEngine;
}

/**
 * Resets the default engine (for testing)
 */
export function resetDefaultEngine(): void {
  if (defaultEngine) {
    defaultEngine.terminate().catch(console.error);
    defaultEngine = null;
  }
}
```

---

## 5. CODE EXAMPLES

### 5.1 Basic Usage

```typescript
import { VisionEngine } from '@/lib/visionEngine';

// Create and initialize
const engine = new VisionEngine({
  confidenceThreshold: 70,
  pollIntervalMs: 500,
});

await engine.initialize();

// Check status
console.log('Ready:', engine.isReady()); // true

// Use the engine...

// Cleanup
await engine.terminate();
```

### 5.2 Using the Singleton

```typescript
import { getDefaultEngine } from '@/lib/visionEngine';

const engine = getDefaultEngine();
await engine.initialize();

// Now available throughout the app
```

### 5.3 Event Handling

```typescript
import { VisionEngine } from '@/lib/visionEngine';

const engine = new VisionEngine();

engine.on('statusChange', ({ data }) => {
  console.log(`Status changed: ${data.previousStatus} → ${data.status}`);
});

engine.on('ocrComplete', ({ data }) => {
  console.log(`OCR found ${data.resultCount} text elements`);
});

await engine.initialize();
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** `src/lib/visionEngine.ts` is created with class shell
- [ ] **AC-2:** Constructor accepts partial VisionConfig
- [ ] **AC-3:** `initialize()` method signature is correct
- [ ] **AC-4:** `terminate()` method signature is correct
- [ ] **AC-5:** All public method signatures match specification
- [ ] **AC-6:** Status management (getStatus, isReady) works
- [ ] **AC-7:** Configuration management (getConfig, updateConfig) works
- [ ] **AC-8:** Event system (on, off, emit) works
- [ ] **AC-9:** Singleton pattern (getDefaultEngine) works
- [ ] **AC-10:** TypeScript compiles without errors

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Method stubs** - Methods throw "Not implemented" for now
2. **Worker paths** - Use chrome.runtime.getURL for WASM files
3. **Status management** - Always update status on state changes

### Patterns to Follow

1. **Singleton option** - Provide both class and singleton access
2. **Event emitter** - Simple event system for status changes
3. **Protected methods** - Allow extension/testing

### Edge Cases

1. **Double initialization** - Handle gracefully
2. **Operations when not ready** - Throw clear error
3. **Termination when not initialized** - Handle gracefully

---

## 8. VERIFICATION COMMANDS

```bash
# Verify file exists
ls -la src/lib/visionEngine.ts

# Run type check
npm run type-check

# Test instantiation (will not run OCR without implementation)
npx ts-node -e "
  const { VisionEngine } = require('./src/lib/visionEngine');
  const engine = new VisionEngine({ confidenceThreshold: 75 });
  console.log('Status:', engine.getStatus());
  console.log('Config:', engine.getConfig());
"
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Remove VisionEngine file
rm src/lib/visionEngine.ts

# Remove export from index if added
```

---

## 10. REFERENCES

- [Tesseract.js API](https://github.com/naptha/tesseract.js/blob/master/docs/api.md)
- FND-004: Type Definitions
- FND-005: VisionConfig Interface
- Architecture Spec: `/future-spec/04_architecture.md`

---

*End of Specification ENG-001*
