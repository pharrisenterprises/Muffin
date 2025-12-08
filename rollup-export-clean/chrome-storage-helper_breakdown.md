# Chrome Storage Helper Breakdown

## Purpose
**What it does:** Provides a promise-based wrapper around Chrome's `chrome.storage.sync` API for persistent key-value storage. Simplifies async storage operations with clean error handling.

**Where it lives:** `src/common/helpers/storageHelper.ts` (~60 lines)

**Why it exists:** Chrome's native storage API uses callbacks. This helper modernizes it with async/await syntax and consistent error handling patterns.

## Inputs
**Data Requirements:**
```typescript
StorageHelper.get<T>(key: string): Promise<T | null>
StorageHelper.set(key: string, value: any): Promise<void>
StorageHelper.remove(key: string): Promise<void>
StorageHelper.getAll(): Promise<{ [key: string]: any }>
StorageHelper.clear(): Promise<void>
```

**Constraints:**
- `chrome.storage.sync` quota: 100KB total, 8KB per item, 512 items max
- Keys must be strings
- Values must be JSON-serializable

## Outputs
**Returns:**
- `get<T>()` → `T | null` (typed value or null if not found)
- `set()` → `void` (throws on error)
- `remove()` → `void` (throws on error)
- `getAll()` → `{ [key: string]: any }` (all stored items)
- `clear()` → `void` (throws on error)

**Side Effects:**
- Syncs data across user's Chrome instances (if signed in)
- Writes to disk
- Emits `chrome.storage.onChanged` events

## Internal Architecture

### Code Structure
```typescript
export const StorageHelper = {
  get: async <T>(key: string): Promise<T | null> => {
    return new Promise((resolve) => {
      chrome.storage.sync.get([key], (result) => {
        if (chrome.runtime.lastError) {
          console.log(`Error getting key '${key}':`, chrome.runtime.lastError);
          resolve(null); // Return null on error
        } else {
          resolve(result[key] ?? null);
        }
      });
    });
  },

  set: async (key: string, value: any): Promise<void> => {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
          console.log(`Error setting key '${key}':`, chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  },

  remove: async (key: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.remove([key], () => {
        if (chrome.runtime.lastError) {
          console.log(`Error removing key '${key}':`, chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  },

  getAll: async (): Promise<{ [key: string]: any }> => {
    return new Promise((resolve) => {
      chrome.storage.sync.get(null, (items) => {
        if (chrome.runtime.lastError) {
          console.log("Error getting all keys:", chrome.runtime.lastError);
          resolve({}); // Return empty object on error
        } else {
          resolve(items);
        }
      });
    });
  },

  clear: async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.clear(() => {
        if (chrome.runtime.lastError) {
          console.log("Error clearing storage:", chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }
};
```

## Critical Dependencies
**External:**
- Chrome Extension API: `chrome.storage.sync`

**Internal:**
- None (standalone utility)

## Hidden Assumptions
1. **Sync storage only**: Does not support `chrome.storage.local`
2. **Silent failure on get**: Returns null instead of throwing
3. **User signed in**: Sync requires Chrome account
4. **No quota monitoring**: Doesn't check 100KB limit

## Stability Concerns
- **Quota exceeded**: Silently fails if 100KB limit hit
- **Sync conflicts**: Last-write-wins if multiple tabs update same key
- **Network dependency**: Sync may delay if offline

## Edge Cases
- **Large values (>8KB)**: Throws QUOTA_BYTES_PER_ITEM error
- **Non-serializable values**: Functions, DOM nodes cause silent failure
- **Key name conflicts**: No namespace separation from other extensions

## Developer-Must-Know Notes
- Use `chrome.storage.local` for non-synced data (no quota limit)
- Sync storage persists across browser reinstalls (if signed in)
- Changes trigger `chrome.storage.onChanged` listeners
- Consider compression for large objects
- Test offline behavior explicitly

## Phase 3 Integration Points

### Recording System (Phase 3A)
- **Usage**: Store user preferences for recording settings
- **Keys**: `recording_config`, `auto_capture_screenshots`
- **Integration**: RecordingOrchestrator loads config on init

### Vision System (Phase 3D)
- **Usage**: Store vision API keys and confidence thresholds
- **Keys**: `claude_api_key`, `ocr_confidence_threshold`
- **Integration**: VisionService retrieves API credentials

### Strategy System (Phase 3C)
- **Usage**: Store strategy priority preferences
- **Keys**: `strategy_priority`, `fallback_enabled`
- **Integration**: DecisionEngine loads user-configured priorities

### UI Components (Phase 3F)
- **Usage**: Store UI preferences (theme, layout)
- **Keys**: `theme`, `show_strategy_badges`
- **Integration**: TestRunner/Recorder load display preferences

**Common Keys**:
- `recording_config`: RecordingConfig object
- `vision_config`: VisionConfig object
- `strategy_priority`: string[] of strategy types
- `api_keys`: { claude?: string, openai?: string }
- `ui_preferences`: { theme, badges, notifications }

**Migration Strategy**:
- Phase 3 will migrate to `chrome.storage.local` for large data (evidence buffers)
- Sync storage reserved for user preferences only (<10KB total)

**Last Updated**: December 7, 2025 — Phase 3 Specification Complete
