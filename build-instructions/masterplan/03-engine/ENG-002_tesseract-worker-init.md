# ENG-002: TESSERACT WORKER INITIALIZATION SPECIFICATION

> **Build Card:** ENG-002  
> **Category:** Engine / Core  
> **Dependencies:** ENG-001 (VisionEngine shell), FND-003 (Vite WASM config)  
> **Risk Level:** Medium  
> **Estimated Lines:** ~420

---

## 1. PURPOSE

This specification implements the Tesseract.js worker initialization logic for the VisionEngine class. Worker initialization is critical because:

1. **WASM loading** - Must load correct WASM binaries from extension bundle
2. **Language data** - Load trained data for OCR language support
3. **SIMD detection** - Use SIMD-optimized binary when available
4. **Error handling** - Gracefully handle initialization failures
5. **Progress tracking** - Report initialization progress to UI

This implements the `initialize()` method stub from ENG-001.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| ENG-001 | VisionEngine shell | Class structure and stubs |
| FND-003 | Vite WASM config | Asset locations |
| Tesseract.js Docs | npm package | Worker creation API |
| DAT-006 | Vision state storage | Worker state management |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `src/lib/visionEngine.ts` | MODIFY | Implement initialize() method |
| `src/lib/tesseractConfig.ts` | CREATE | Tesseract configuration helpers |

### Implementation Details

| Method | Status | Description |
|--------|--------|-------------|
| `initialize()` | IMPLEMENT | Full implementation |
| `terminate()` | IMPLEMENT | Full implementation |
| `reinitialize()` | ADD | Force re-initialization |
| `getWorkerInfo()` | ADD | Get worker status info |

---

## 4. DETAILED SPECIFICATION

### 4.1 Tesseract Configuration

Create `src/lib/tesseractConfig.ts`:

```typescript
/**
 * @fileoverview Tesseract.js configuration for Chrome extension environment
 * @module lib/tesseractConfig
 * 
 * Provides configuration for Tesseract.js worker initialization
 * within a Chrome extension context, handling WASM file paths
 * and SIMD detection.
 */

/**
 * Supported OCR languages
 */
export const SUPPORTED_LANGUAGES = {
  eng: 'English',
  spa: 'Spanish',
  fra: 'French',
  deu: 'German',
  ita: 'Italian',
  por: 'Portuguese',
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

/**
 * Checks if SIMD is supported in the current environment
 * @returns Promise resolving to true if SIMD is supported
 */
export async function detectSIMDSupport(): Promise<boolean> {
  try {
    // Check for WebAssembly SIMD support
    const simdTest = new Uint8Array([
      0x00, 0x61, 0x73, 0x6d, // WASM magic number
      0x01, 0x00, 0x00, 0x00, // Version 1
      0x01, 0x05, 0x01, 0x60, // Type section
      0x00, 0x01, 0x7b,       // Function type returning v128
      0x03, 0x02, 0x01, 0x00, // Function section
      0x0a, 0x0a, 0x01,       // Code section
      0x08, 0x00, 0x41, 0x00, // Function body with i32.const 0
      0xfd, 0x0f,             // v128.const (SIMD instruction)
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00,
      0x0b,                   // end
    ]);

    await WebAssembly.compile(simdTest);
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets the path to WASM core file based on SIMD support
 * @param useSIMD - Whether to use SIMD version
 * @returns Path to WASM core file
 */
export function getCorePath(useSIMD: boolean): string {
  const filename = useSIMD
    ? 'tesseract-core-simd.wasm.js'
    : 'tesseract-core.wasm.js';
  
  return chrome.runtime.getURL(`tesseract/${filename}`);
}

/**
 * Gets the path to worker script
 * @returns Path to worker script
 */
export function getWorkerPath(): string {
  return chrome.runtime.getURL('tesseract/worker.min.js');
}

/**
 * Gets the path to language data directory
 * @returns Path to language data
 */
export function getLangPath(): string {
  return chrome.runtime.getURL('tesseract');
}

/**
 * Gets the path to a specific language data file
 * @param lang - Language code
 * @returns Path to traineddata file
 */
export function getLangDataPath(lang: SupportedLanguage): string {
  return chrome.runtime.getURL(`tesseract/${lang}.traineddata`);
}

/**
 * Tesseract worker options for Chrome extension
 */
export interface TesseractWorkerOptions {
  /** Path to worker script */
  workerPath: string;
  /** Path to WASM core */
  corePath: string;
  /** Path to language data */
  langPath: string;
  /** Cache path for worker */
  cachePath?: string;
  /** Logger function */
  logger?: (message: any) => void;
  /** Error handler */
  errorHandler?: (error: any) => void;
}

/**
 * Creates Tesseract worker options for Chrome extension environment
 * @param useSIMD - Whether to use SIMD optimization
 * @param enableLogging - Whether to enable progress logging
 * @returns Worker options object
 */
export function createWorkerOptions(
  useSIMD: boolean,
  enableLogging: boolean = false
): TesseractWorkerOptions {
  return {
    workerPath: getWorkerPath(),
    corePath: getCorePath(useSIMD),
    langPath: getLangPath(),
    logger: enableLogging
      ? (m) => console.log('[Tesseract]', m)
      : undefined,
    errorHandler: (e) => console.error('[Tesseract Error]', e),
  };
}

/**
 * Validates that required Tesseract assets exist
 * @param lang - Language to check
 * @param useSIMD - Whether SIMD version is needed
 * @returns Validation result
 */
export async function validateTesseractAssets(
  lang: SupportedLanguage = 'eng',
  useSIMD: boolean = true
): Promise<{
  valid: boolean;
  missing: string[];
}> {
  const missing: string[] = [];
  
  const assetsToCheck = [
    { name: 'worker', path: getWorkerPath() },
    { name: 'core', path: getCorePath(useSIMD) },
    { name: 'langData', path: getLangDataPath(lang) },
  ];
  
  for (const asset of assetsToCheck) {
    try {
      const response = await fetch(asset.path, { method: 'HEAD' });
      if (!response.ok) {
        missing.push(asset.name);
      }
    } catch {
      missing.push(asset.name);
    }
  }
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Progress stages during initialization
 */
export const INIT_STAGES = {
  LOADING_CORE: 'loading core',
  LOADING_LANG: 'loading language data',
  INITIALIZING: 'initializing engine',
  READY: 'ready',
} as const;

export type InitStage = typeof INIT_STAGES[keyof typeof INIT_STAGES];

/**
 * Progress callback for initialization
 */
export type InitProgressCallback = (progress: {
  stage: InitStage;
  progress: number; // 0-100
  message?: string;
}) => void;
```

### 4.2 Worker Initialization Implementation

Update `src/lib/visionEngine.ts` - replace the `initialize()` and `terminate()` stubs:

```typescript
// Add imports at top of file
import {
  detectSIMDSupport,
  createWorkerOptions,
  validateTesseractAssets,
  INIT_STAGES,
  type InitProgressCallback,
  type SupportedLanguage,
} from './tesseractConfig';

// Add to private properties
/** Initialization promise for deduplication */
private initPromise: Promise<void> | null = null;

/** Whether SIMD is being used */
private usingSIMD: boolean = false;

/** Time when initialization completed */
private initializedAt: number | null = null;

// Replace initialize() method
/**
 * Initializes the Tesseract.js worker
 * Must be called before any OCR operations
 * 
 * @param progressCallback - Optional callback for progress updates
 * @throws Error if initialization fails
 * 
 * @example
 * ```typescript
 * const engine = new VisionEngine();
 * await engine.initialize((progress) => {
 *   console.log(`${progress.stage}: ${progress.progress}%`);
 * });
 * ```
 */
async initialize(progressCallback?: InitProgressCallback): Promise<void> {
  // Already initialized
  if (this.status === 'ready' && this.worker) {
    console.log('[VisionEngine] Already initialized');
    return;
  }

  // Initialization in progress - return existing promise
  if (this.initPromise) {
    return this.initPromise;
  }

  // Start initialization
  this.initPromise = this.doInitialize(progressCallback);
  
  try {
    await this.initPromise;
  } finally {
    this.initPromise = null;
  }
}

/**
 * Internal initialization logic
 */
private async doInitialize(progressCallback?: InitProgressCallback): Promise<void> {
  this.setStatus('initializing');
  this.errorMessage = null;

  const reportProgress = (stage: typeof INIT_STAGES[keyof typeof INIT_STAGES], progress: number, message?: string) => {
    if (progressCallback) {
      progressCallback({ stage, progress, message });
    }
  };

  try {
    // Step 1: Detect SIMD support
    reportProgress(INIT_STAGES.LOADING_CORE, 0, 'Detecting SIMD support...');
    
    let useSIMD = this.config.useSIMD ?? true;
    if (useSIMD) {
      useSIMD = await detectSIMDSupport();
      console.log(`[VisionEngine] SIMD support: ${useSIMD}`);
    }
    this.usingSIMD = useSIMD;

    // Step 2: Validate assets exist
    reportProgress(INIT_STAGES.LOADING_CORE, 10, 'Validating assets...');
    
    const lang = (this.config.language || 'eng') as SupportedLanguage;
    const validation = await validateTesseractAssets(lang, useSIMD);
    
    if (!validation.valid) {
      throw new Error(
        `Missing Tesseract assets: ${validation.missing.join(', ')}. ` +
        `Ensure WASM files are copied to dist/tesseract/`
      );
    }

    // Step 3: Create worker options
    reportProgress(INIT_STAGES.LOADING_CORE, 20, 'Creating worker...');
    
    const options = createWorkerOptions(useSIMD, false);

    // Step 4: Create and initialize worker
    reportProgress(INIT_STAGES.LOADING_LANG, 30, 'Loading language data...');
    
    // Import Tesseract dynamically to avoid issues in non-browser contexts
    const { createWorker } = await import('tesseract.js');
    
    this.worker = await createWorker(lang, 1, {
      ...options,
      logger: (m) => {
        // Parse Tesseract progress messages
        if (m.status === 'loading tesseract core') {
          reportProgress(INIT_STAGES.LOADING_CORE, 40 + (m.progress * 20), m.status);
        } else if (m.status === 'loading language traineddata') {
          reportProgress(INIT_STAGES.LOADING_LANG, 60 + (m.progress * 30), m.status);
        } else if (m.status === 'initializing api') {
          reportProgress(INIT_STAGES.INITIALIZING, 90 + (m.progress * 10), m.status);
        }
      },
    });

    // Step 5: Mark as ready
    reportProgress(INIT_STAGES.READY, 100, 'Ready');
    
    this.initializedAt = Date.now();
    this.setStatus('ready');
    
    console.log('[VisionEngine] Initialized successfully', {
      usingSIMD: this.usingSIMD,
      language: lang,
    });

    // Update state storage
    visionStateStorage.updateWorkerState({
      status: 'ready',
      initializedAt: this.initializedAt,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown initialization error';
    this.errorMessage = message;
    this.setStatus('error');
    this.worker = null;

    console.error('[VisionEngine] Initialization failed:', message);

    visionStateStorage.updateWorkerState({
      status: 'error',
      errorMessage: message,
    });

    throw new Error(`Failed to initialize VisionEngine: ${message}`);
  }
}

// Replace terminate() method
/**
 * Terminates the Tesseract.js worker and cleans up resources
 * Safe to call multiple times
 * 
 * @example
 * ```typescript
 * await engine.terminate();
 * ```
 */
async terminate(): Promise<void> {
  // Cancel any pending initialization
  this.initPromise = null;

  if (this.worker) {
    try {
      await this.worker.terminate();
      console.log('[VisionEngine] Worker terminated');
    } catch (error) {
      console.error('[VisionEngine] Error during worker termination:', error);
    }
    this.worker = null;
  }

  // Clear caches
  this.lastResults = null;
  this.lastScreenshot = null;
  this.initializedAt = null;
  
  this.setStatus('terminated');

  visionStateStorage.updateWorkerState({
    status: 'terminated',
  });

  visionStateStorage.clearCache();
}

// Add new methods
/**
 * Force re-initialization (terminates existing worker first)
 * Useful when configuration changes require new worker
 * 
 * @param progressCallback - Optional progress callback
 */
async reinitialize(progressCallback?: InitProgressCallback): Promise<void> {
  await this.terminate();
  await this.initialize(progressCallback);
}

/**
 * Gets detailed worker information
 * @returns Worker info object
 */
getWorkerInfo(): {
  status: EngineStatus;
  usingSIMD: boolean;
  language: string;
  initializedAt: number | null;
  operationCount: number;
  uptime: number | null;
} {
  return {
    status: this.status,
    usingSIMD: this.usingSIMD,
    language: this.config.language || 'eng',
    initializedAt: this.initializedAt,
    operationCount: this.operationCount,
    uptime: this.initializedAt ? Date.now() - this.initializedAt : null,
  };
}

/**
 * Checks if the worker needs reinitialization
 * (e.g., after config changes that require new worker)
 * 
 * @param newConfig - New configuration to check against
 * @returns True if reinit is needed
 */
needsReinit(newConfig: Partial<VisionConfig>): boolean {
  // Language change requires reinit
  if (newConfig.language && newConfig.language !== this.config.language) {
    return true;
  }
  
  // SIMD setting change requires reinit
  if (newConfig.useSIMD !== undefined && newConfig.useSIMD !== this.config.useSIMD) {
    return true;
  }
  
  return false;
}
```

---

## 5. CODE EXAMPLES

### 5.1 Basic Initialization

```typescript
import { VisionEngine } from '@/lib/visionEngine';

const engine = new VisionEngine();

try {
  await engine.initialize();
  console.log('Engine ready!');
  console.log('Worker info:', engine.getWorkerInfo());
} catch (error) {
  console.error('Init failed:', error.message);
}
```

### 5.2 Initialization with Progress

```typescript
import { VisionEngine } from '@/lib/visionEngine';

const engine = new VisionEngine();

await engine.initialize((progress) => {
  // Update UI progress bar
  progressBar.value = progress.progress;
  progressLabel.textContent = progress.stage;
  
  console.log(`[${progress.progress}%] ${progress.stage}`);
});
```

### 5.3 Handling Configuration Changes

```typescript
import { VisionEngine } from '@/lib/visionEngine';

const engine = new VisionEngine({ language: 'eng' });
await engine.initialize();

// Later, user wants to change language
const newConfig = { language: 'spa' };

if (engine.needsReinit(newConfig)) {
  engine.updateConfig(newConfig);
  await engine.reinitialize((p) => {
    console.log(`Reinitializing: ${p.progress}%`);
  });
}
```

### 5.4 Concurrent Initialization Safety

```typescript
import { VisionEngine } from '@/lib/visionEngine';

const engine = new VisionEngine();

// These calls are safe - only one initialization will run
await Promise.all([
  engine.initialize(),
  engine.initialize(),
  engine.initialize(),
]);

console.log('Only initialized once!');
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** `initialize()` loads Tesseract worker successfully
- [ ] **AC-2:** SIMD detection works and falls back to non-SIMD
- [ ] **AC-3:** Asset validation catches missing WASM files
- [ ] **AC-4:** Progress callback receives accurate progress updates
- [ ] **AC-5:** Concurrent initialize() calls are deduplicated
- [ ] **AC-6:** `terminate()` properly cleans up worker
- [ ] **AC-7:** `reinitialize()` terminates then initializes
- [ ] **AC-8:** `getWorkerInfo()` returns accurate information
- [ ] **AC-9:** `needsReinit()` correctly detects config changes
- [ ] **AC-10:** State storage is updated on status changes

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Chrome extension paths** - Must use chrome.runtime.getURL
2. **Dynamic import** - Tesseract.js should be dynamically imported
3. **Single worker** - Only one worker instance at a time

### Patterns to Follow

1. **Promise deduplication** - Store init promise to prevent concurrent inits
2. **Progress reporting** - Parse Tesseract's status messages
3. **Graceful termination** - Always try to terminate, ignore errors

### Edge Cases

1. **Init during init** - Return existing promise
2. **Init after terminate** - Should work normally
3. **Terminate without init** - Should be safe (no-op)

---

## 8. VERIFICATION COMMANDS

```bash
# Verify files exist
ls -la src/lib/tesseractConfig.ts

# Run type check
npm run type-check

# Build and test manually
npm run build
# Load extension, open DevTools, test initialization
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Revert to stub implementations
# Replace initialize() and terminate() with original stubs from ENG-001

# Remove config file
rm src/lib/tesseractConfig.ts
```

---

## 10. REFERENCES

- [Tesseract.js createWorker](https://github.com/naptha/tesseract.js/blob/master/docs/api.md#createworker)
- [WebAssembly SIMD](https://webassembly.org/features/)
- ENG-001: VisionEngine Class Shell
- FND-003: Vite WASM Configuration

---

*End of Specification ENG-002*
