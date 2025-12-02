# DAT-006: VISION STATE STORAGE SPECIFICATION

> **Build Card:** DAT-006  
> **Category:** Data Layer  
> **Dependencies:** FND-005 (VisionConfig), FND-004 (Type definitions)  
> **Risk Level:** Low  
> **Estimated Lines:** ~400

---

## 1. PURPOSE

This specification defines the storage mechanism for Vision-related runtime state. Unlike recordings which persist to IndexedDB, Vision state includes:

1. **Runtime configuration** - Current VisionConfig settings
2. **Worker status** - Tesseract worker initialization state
3. **Session cache** - Temporary OCR results for performance
4. **Debug state** - Vision debugging flags and overlay settings
5. **Preferences** - User preferences for Vision features

This state is stored in Chrome's `chrome.storage.local` for persistence across sessions, with some volatile state kept only in memory.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| FND-005 | VisionConfig interface | Configuration structure |
| FND-004 | Type definitions | Vision types |
| Chrome Storage API | Chrome docs | Storage patterns |
| Architecture Spec | `/future-spec/04_architecture.md` | State management |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `src/lib/visionStateStorage.ts` | CREATE | Vision state storage implementation |
| `src/types/visionState.ts` | CREATE | State type definitions |

### Storage Keys

| Key | Type | Persistence | Description |
|-----|------|-------------|-------------|
| `vision_config` | VisionConfig | chrome.storage.local | User configuration |
| `vision_preferences` | VisionPreferences | chrome.storage.local | UI preferences |
| `vision_debug` | VisionDebugState | chrome.storage.local | Debug settings |
| `vision_worker_cache` | WorkerCache | memory only | Temporary cache |

---

## 4. DETAILED SPECIFICATION

### 4.1 State Types

Create `src/types/visionState.ts`:

```typescript
/**
 * @fileoverview Vision state type definitions
 * @module types/visionState
 */

import type { VisionConfig } from './vision';

/**
 * User preferences for Vision features
 */
export interface VisionPreferences {
  /** Whether Vision features are enabled globally */
  enabled: boolean;

  /** Show Vision indicator in UI when active */
  showIndicator: boolean;

  /** Auto-initialize Tesseract on extension load */
  autoInitialize: boolean;

  /** Default recording method for new steps */
  defaultRecordingMethod: 'dom' | 'vision' | 'auto';

  /** Show confidence badges on Vision steps */
  showConfidenceBadges: boolean;

  /** Minimum confidence to show green badge */
  highConfidenceThreshold: number;

  /** Minimum confidence to show yellow badge */
  mediumConfidenceThreshold: number;
}

/**
 * Debug state for Vision features
 */
export interface VisionDebugState {
  /** Enable debug mode */
  debugMode: boolean;

  /** Show OCR bounding boxes overlay */
  showBoundingBoxes: boolean;

  /** Log OCR results to console */
  logOcrResults: boolean;

  /** Capture screenshots for debugging */
  captureScreenshots: boolean;

  /** Save screenshots to downloads */
  saveScreenshots: boolean;

  /** Highlight click targets */
  highlightClickTargets: boolean;

  /** Show performance metrics */
  showPerformanceMetrics: boolean;
}

/**
 * Tesseract worker status
 */
export type WorkerStatus =
  | 'uninitialized'
  | 'initializing'
  | 'ready'
  | 'busy'
  | 'error'
  | 'terminated';

/**
 * Worker state (memory only, not persisted)
 */
export interface WorkerState {
  /** Current worker status */
  status: WorkerStatus;

  /** Error message if status is 'error' */
  errorMessage?: string;

  /** Time when worker was initialized */
  initializedAt?: number;

  /** Number of OCR operations performed */
  operationCount: number;

  /** Last operation timestamp */
  lastOperationAt?: number;

  /** Average operation time in ms */
  averageOperationTime?: number;
}

/**
 * Cached OCR result (memory only)
 */
export interface CachedOcrResult {
  /** Cache key (usually screenshot hash) */
  key: string;

  /** Cached text results */
  results: import('./vision').TextResult[];

  /** When result was cached */
  cachedAt: number;

  /** Time to live in ms */
  ttl: number;
}

/**
 * Complete Vision state
 */
export interface VisionState {
  /** User configuration */
  config: VisionConfig;

  /** User preferences */
  preferences: VisionPreferences;

  /** Debug state */
  debug: VisionDebugState;

  /** Worker state (memory only) */
  worker: WorkerState;

  /** Result cache (memory only) */
  cache: Map<string, CachedOcrResult>;
}

/**
 * Persisted portion of Vision state
 */
export interface PersistedVisionState {
  config: VisionConfig;
  preferences: VisionPreferences;
  debug: VisionDebugState;
}
```

### 4.2 Default Values

```typescript
// In visionStateStorage.ts

import type {
  VisionConfig,
  VisionPreferences,
  VisionDebugState,
  WorkerState,
  VisionState,
} from '@/types';

/**
 * Default Vision configuration
 */
export const DEFAULT_VISION_CONFIG: VisionConfig = {
  confidenceThreshold: 60,
  pollIntervalMs: 1000,
  scrollRetries: 3,
  useSIMD: true,
  language: 'eng',
};

/**
 * Default Vision preferences
 */
export const DEFAULT_VISION_PREFERENCES: VisionPreferences = {
  enabled: true,
  showIndicator: true,
  autoInitialize: false,
  defaultRecordingMethod: 'auto',
  showConfidenceBadges: true,
  highConfidenceThreshold: 80,
  mediumConfidenceThreshold: 60,
};

/**
 * Default debug state
 */
export const DEFAULT_DEBUG_STATE: VisionDebugState = {
  debugMode: false,
  showBoundingBoxes: false,
  logOcrResults: false,
  captureScreenshots: false,
  saveScreenshots: false,
  highlightClickTargets: false,
  showPerformanceMetrics: false,
};

/**
 * Default worker state
 */
export const DEFAULT_WORKER_STATE: WorkerState = {
  status: 'uninitialized',
  operationCount: 0,
};
```

### 4.3 Storage Implementation

Create `src/lib/visionStateStorage.ts`:

```typescript
/**
 * @fileoverview Vision state storage and management
 * @module lib/visionStateStorage
 * 
 * Manages persistence and retrieval of Vision-related state
 * using Chrome storage API for persisted state and in-memory
 * storage for volatile state.
 */

import type {
  VisionConfig,
  VisionPreferences,
  VisionDebugState,
  WorkerState,
  VisionState,
  PersistedVisionState,
  CachedOcrResult,
} from '@/types';

// Storage keys
const STORAGE_KEYS = {
  CONFIG: 'vision_config',
  PREFERENCES: 'vision_preferences',
  DEBUG: 'vision_debug',
} as const;

/**
 * Default Vision configuration
 */
export const DEFAULT_VISION_CONFIG: VisionConfig = {
  confidenceThreshold: 60,
  pollIntervalMs: 1000,
  scrollRetries: 3,
  useSIMD: true,
  language: 'eng',
};

/**
 * Default Vision preferences
 */
export const DEFAULT_VISION_PREFERENCES: VisionPreferences = {
  enabled: true,
  showIndicator: true,
  autoInitialize: false,
  defaultRecordingMethod: 'auto',
  showConfidenceBadges: true,
  highConfidenceThreshold: 80,
  mediumConfidenceThreshold: 60,
};

/**
 * Default debug state
 */
export const DEFAULT_DEBUG_STATE: VisionDebugState = {
  debugMode: false,
  showBoundingBoxes: false,
  logOcrResults: false,
  captureScreenshots: false,
  saveScreenshots: false,
  highlightClickTargets: false,
  showPerformanceMetrics: false,
};

/**
 * Default worker state
 */
export const DEFAULT_WORKER_STATE: WorkerState = {
  status: 'uninitialized',
  operationCount: 0,
};

// In-memory state (not persisted)
let memoryState: {
  worker: WorkerState;
  cache: Map<string, CachedOcrResult>;
} = {
  worker: { ...DEFAULT_WORKER_STATE },
  cache: new Map(),
};

/**
 * Vision State Storage
 * 
 * Provides methods for reading and writing Vision state.
 * Persisted state uses chrome.storage.local.
 * Volatile state is kept in memory only.
 */
export const visionStateStorage = {
  // ==================== CONFIG ====================

  /**
   * Gets the current Vision configuration
   * @returns VisionConfig
   */
  async getConfig(): Promise<VisionConfig> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.CONFIG);
      const stored = result[STORAGE_KEYS.CONFIG];
      
      if (stored) {
        return { ...DEFAULT_VISION_CONFIG, ...stored };
      }
      
      return { ...DEFAULT_VISION_CONFIG };
    } catch (error) {
      console.error('[VisionState] Failed to get config:', error);
      return { ...DEFAULT_VISION_CONFIG };
    }
  },

  /**
   * Updates the Vision configuration
   * @param updates - Partial config updates
   * @returns Updated config
   */
  async updateConfig(updates: Partial<VisionConfig>): Promise<VisionConfig> {
    const current = await this.getConfig();
    const updated = { ...current, ...updates };
    
    await chrome.storage.local.set({ [STORAGE_KEYS.CONFIG]: updated });
    
    return updated;
  },

  /**
   * Resets configuration to defaults
   */
  async resetConfig(): Promise<VisionConfig> {
    const defaults = { ...DEFAULT_VISION_CONFIG };
    await chrome.storage.local.set({ [STORAGE_KEYS.CONFIG]: defaults });
    return defaults;
  },

  // ==================== PREFERENCES ====================

  /**
   * Gets Vision preferences
   * @returns VisionPreferences
   */
  async getPreferences(): Promise<VisionPreferences> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.PREFERENCES);
      const stored = result[STORAGE_KEYS.PREFERENCES];
      
      if (stored) {
        return { ...DEFAULT_VISION_PREFERENCES, ...stored };
      }
      
      return { ...DEFAULT_VISION_PREFERENCES };
    } catch (error) {
      console.error('[VisionState] Failed to get preferences:', error);
      return { ...DEFAULT_VISION_PREFERENCES };
    }
  },

  /**
   * Updates Vision preferences
   * @param updates - Partial preference updates
   * @returns Updated preferences
   */
  async updatePreferences(
    updates: Partial<VisionPreferences>
  ): Promise<VisionPreferences> {
    const current = await this.getPreferences();
    const updated = { ...current, ...updates };
    
    await chrome.storage.local.set({ [STORAGE_KEYS.PREFERENCES]: updated });
    
    return updated;
  },

  /**
   * Resets preferences to defaults
   */
  async resetPreferences(): Promise<VisionPreferences> {
    const defaults = { ...DEFAULT_VISION_PREFERENCES };
    await chrome.storage.local.set({ [STORAGE_KEYS.PREFERENCES]: defaults });
    return defaults;
  },

  // ==================== DEBUG ====================

  /**
   * Gets debug state
   * @returns VisionDebugState
   */
  async getDebugState(): Promise<VisionDebugState> {
    try {
      const result = await chrome.storage.local.get(STORAGE_KEYS.DEBUG);
      const stored = result[STORAGE_KEYS.DEBUG];
      
      if (stored) {
        return { ...DEFAULT_DEBUG_STATE, ...stored };
      }
      
      return { ...DEFAULT_DEBUG_STATE };
    } catch (error) {
      console.error('[VisionState] Failed to get debug state:', error);
      return { ...DEFAULT_DEBUG_STATE };
    }
  },

  /**
   * Updates debug state
   * @param updates - Partial debug state updates
   * @returns Updated debug state
   */
  async updateDebugState(
    updates: Partial<VisionDebugState>
  ): Promise<VisionDebugState> {
    const current = await this.getDebugState();
    const updated = { ...current, ...updates };
    
    await chrome.storage.local.set({ [STORAGE_KEYS.DEBUG]: updated });
    
    return updated;
  },

  /**
   * Toggles debug mode
   * @returns New debug mode state
   */
  async toggleDebugMode(): Promise<boolean> {
    const current = await this.getDebugState();
    const newState = !current.debugMode;
    
    await this.updateDebugState({ debugMode: newState });
    
    return newState;
  },

  /**
   * Resets debug state to defaults
   */
  async resetDebugState(): Promise<VisionDebugState> {
    const defaults = { ...DEFAULT_DEBUG_STATE };
    await chrome.storage.local.set({ [STORAGE_KEYS.DEBUG]: defaults });
    return defaults;
  },

  // ==================== WORKER STATE (MEMORY ONLY) ====================

  /**
   * Gets current worker state
   * @returns WorkerState
   */
  getWorkerState(): WorkerState {
    return { ...memoryState.worker };
  },

  /**
   * Updates worker state
   * @param updates - Partial worker state updates
   */
  updateWorkerState(updates: Partial<WorkerState>): void {
    memoryState.worker = { ...memoryState.worker, ...updates };
  },

  /**
   * Records an OCR operation
   * @param durationMs - Operation duration
   */
  recordOperation(durationMs: number): void {
    const { operationCount, averageOperationTime = 0 } = memoryState.worker;
    
    // Calculate running average
    const newCount = operationCount + 1;
    const newAverage =
      (averageOperationTime * operationCount + durationMs) / newCount;
    
    memoryState.worker = {
      ...memoryState.worker,
      operationCount: newCount,
      lastOperationAt: Date.now(),
      averageOperationTime: Math.round(newAverage),
    };
  },

  /**
   * Resets worker state
   */
  resetWorkerState(): void {
    memoryState.worker = { ...DEFAULT_WORKER_STATE };
  },

  // ==================== CACHE (MEMORY ONLY) ====================

  /**
   * Gets a cached OCR result
   * @param key - Cache key
   * @returns Cached result or undefined
   */
  getCachedResult(key: string): CachedOcrResult | undefined {
    const cached = memoryState.cache.get(key);
    
    if (!cached) return undefined;
    
    // Check TTL
    if (Date.now() - cached.cachedAt > cached.ttl) {
      memoryState.cache.delete(key);
      return undefined;
    }
    
    return cached;
  },

  /**
   * Caches an OCR result
   * @param key - Cache key
   * @param results - OCR results
   * @param ttl - Time to live in ms (default: 5000)
   */
  cacheResult(
    key: string,
    results: import('@/types').TextResult[],
    ttl: number = 5000
  ): void {
    memoryState.cache.set(key, {
      key,
      results,
      cachedAt: Date.now(),
      ttl,
    });
  },

  /**
   * Clears expired cache entries
   */
  cleanCache(): number {
    const now = Date.now();
    let removed = 0;
    
    for (const [key, cached] of memoryState.cache) {
      if (now - cached.cachedAt > cached.ttl) {
        memoryState.cache.delete(key);
        removed++;
      }
    }
    
    return removed;
  },

  /**
   * Clears all cache entries
   */
  clearCache(): void {
    memoryState.cache.clear();
  },

  /**
   * Gets cache statistics
   */
  getCacheStats(): { size: number; oldestEntry: number | null } {
    let oldest: number | null = null;
    
    for (const cached of memoryState.cache.values()) {
      if (oldest === null || cached.cachedAt < oldest) {
        oldest = cached.cachedAt;
      }
    }
    
    return {
      size: memoryState.cache.size,
      oldestEntry: oldest,
    };
  },

  // ==================== COMBINED STATE ====================

  /**
   * Gets complete Vision state
   * @returns Full VisionState object
   */
  async getFullState(): Promise<VisionState> {
    const [config, preferences, debug] = await Promise.all([
      this.getConfig(),
      this.getPreferences(),
      this.getDebugState(),
    ]);
    
    return {
      config,
      preferences,
      debug,
      worker: this.getWorkerState(),
      cache: new Map(memoryState.cache),
    };
  },

  /**
   * Gets persisted state only
   * @returns PersistedVisionState
   */
  async getPersistedState(): Promise<PersistedVisionState> {
    const [config, preferences, debug] = await Promise.all([
      this.getConfig(),
      this.getPreferences(),
      this.getDebugState(),
    ]);
    
    return { config, preferences, debug };
  },

  /**
   * Resets all state to defaults
   */
  async resetAll(): Promise<void> {
    await Promise.all([
      this.resetConfig(),
      this.resetPreferences(),
      this.resetDebugState(),
    ]);
    
    this.resetWorkerState();
    this.clearCache();
  },

  /**
   * Exports state for backup
   * @returns JSON-serializable state
   */
  async exportState(): Promise<PersistedVisionState> {
    return this.getPersistedState();
  },

  /**
   * Imports state from backup
   * @param state - State to import
   */
  async importState(state: Partial<PersistedVisionState>): Promise<void> {
    if (state.config) {
      await this.updateConfig(state.config);
    }
    if (state.preferences) {
      await this.updatePreferences(state.preferences);
    }
    if (state.debug) {
      await this.updateDebugState(state.debug);
    }
  },
};

// Export type for the storage object
export type VisionStateStorage = typeof visionStateStorage;
```

---

## 5. CODE EXAMPLES

### 5.1 Basic Configuration

```typescript
import { visionStateStorage, DEFAULT_VISION_CONFIG } from '@/lib/visionStateStorage';

// Get current config
const config = await visionStateStorage.getConfig();
console.log('Confidence threshold:', config.confidenceThreshold);

// Update config
await visionStateStorage.updateConfig({
  confidenceThreshold: 70,
  pollIntervalMs: 500,
});

// Reset to defaults
await visionStateStorage.resetConfig();
```

### 5.2 Managing Worker State

```typescript
import { visionStateStorage } from '@/lib/visionStateStorage';

// Update worker status
visionStateStorage.updateWorkerState({
  status: 'initializing',
});

// After initialization
visionStateStorage.updateWorkerState({
  status: 'ready',
  initializedAt: Date.now(),
});

// Record operation performance
const startTime = performance.now();
await performOcr();
const duration = performance.now() - startTime;
visionStateStorage.recordOperation(duration);

// Check stats
const state = visionStateStorage.getWorkerState();
console.log(`Average OCR time: ${state.averageOperationTime}ms`);
```

### 5.3 Using the Cache

```typescript
import { visionStateStorage } from '@/lib/visionStateStorage';

// Check cache before OCR
const cacheKey = computeScreenshotHash(screenshot);
const cached = visionStateStorage.getCachedResult(cacheKey);

if (cached) {
  console.log('Using cached result');
  return cached.results;
}

// Perform OCR and cache
const results = await performOcr(screenshot);
visionStateStorage.cacheResult(cacheKey, results, 10000); // 10s TTL

// Periodic cleanup
setInterval(() => {
  const removed = visionStateStorage.cleanCache();
  console.log(`Cleaned ${removed} expired cache entries`);
}, 30000);
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** `src/types/visionState.ts` defines all state types
- [ ] **AC-2:** `src/lib/visionStateStorage.ts` is created
- [ ] **AC-3:** Config persists to chrome.storage.local
- [ ] **AC-4:** Preferences persist to chrome.storage.local
- [ ] **AC-5:** Debug state persists to chrome.storage.local
- [ ] **AC-6:** Worker state is memory-only (not persisted)
- [ ] **AC-7:** Cache with TTL expiration works correctly
- [ ] **AC-8:** `getFullState()` returns complete state
- [ ] **AC-9:** `resetAll()` resets all state to defaults
- [ ] **AC-10:** TypeScript compiles without errors

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Chrome storage limits** - Be mindful of storage quotas
2. **Memory state volatility** - Worker state resets on extension reload
3. **Cache cleanup** - Implement periodic cleanup to prevent memory leaks

### Patterns to Follow

1. **Defensive defaults** - Always merge with defaults on read
2. **Async for persisted** - Use async/await for chrome.storage
3. **Sync for memory** - Synchronous access for in-memory state

### Edge Cases

1. **Storage unavailable** - Return defaults on error
2. **Corrupted state** - Reset to defaults
3. **Cache overflow** - Implement max cache size if needed

---

## 8. VERIFICATION COMMANDS

```bash
# Verify files exist
ls -la src/types/visionState.ts
ls -la src/lib/visionStateStorage.ts

# Run type check
npm run type-check
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Remove Vision state files
rm src/types/visionState.ts
rm src/lib/visionStateStorage.ts
```

---

## 10. REFERENCES

- FND-005: VisionConfig Interface
- FND-004: Type Definitions
- [Chrome Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)

---

*End of Specification DAT-006*
