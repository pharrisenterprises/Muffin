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
**Upstream:**
- **Any component needing persistence** - Theme preferences, user settings

**Downstream:**
- **Chrome Storage API** - `chrome.storage.sync.*`

**External:**
- **Chrome Extension APIs** - Requires `storage` permission in manifest.json

## Hidden Assumptions
1. **chrome.storage.sync available** - Assumes extension context (not content script isolation)
2. **Errors resolve to null/empty** - `get()` returns null on error, not throw
3. **JSON-serializable values** - No functions, DOM nodes, circular refs
4. **Sync preferred over local** - Uses `.sync` not `.local` (cross-device)
5. **No quota management** - Doesn't check 100KB limit before writes
6. **Immediate consistency** - Assumes writes complete before next read

## Stability Concerns
### High-Risk Patterns
1. **Quota exceeded errors** (100KB limit)
   ```typescript
   await StorageHelper.set('largeData', hugeObject);
   // May silently fail or throw QUOTA_BYTES_PER_ITEM error
   ```

2. **Circular reference serialization**
   ```typescript
   const obj = { self: null };
   obj.self = obj;
   await StorageHelper.set('circular', obj); // JSON error
   ```

3. **Race conditions** (no locking)
   ```typescript
   await StorageHelper.set('counter', 1);
   await StorageHelper.set('counter', 2); // Race: order not guaranteed
   ```

4. **Error swallowing in `get()`**
   ```typescript
   const value = await StorageHelper.get('key');
   // value is null - was there an error, or just missing key?
   ```

### Failure Modes
- **Quota exceeded** → `set()` rejects with error
- **Invalid JSON** → Serialization fails silently
- **Storage disabled** → All operations fail
- **Network sync issues** → `.sync` may delay/fail across devices

## Edge Cases
### Input Variations
1. **Non-existent key**
   ```typescript
   await StorageHelper.get('nonexistent') → null
   ```

2. **Null/undefined values**
   ```typescript
   await StorageHelper.set('key', null);
   await StorageHelper.get('key') → null (ambiguous with missing key)
   ```

3. **Empty string key**
   ```typescript
   await StorageHelper.set('', 'value'); // Valid but confusing
   ```

4. **Large value** (>8KB)
   ```typescript
   await StorageHelper.set('big', new Array(10000).join('x'));
   // Throws QUOTA_BYTES_PER_ITEM error
   ```

5. **Special characters in key**
   ```typescript
   await StorageHelper.set('key.with.dots', 'value'); // Valid
   ```

## Developer-Must-Know Notes
### Quick Context
This is a **thin wrapper** around Chrome's storage API. It's used sparingly in this codebase—most data lives in IndexedDB via Dexie. Only lightweight settings (like theme preferences) should use this.

### Common Issues
1. **Why is my data not persisting?**
   - Check quota limits (100KB total)
   - Verify `storage` permission in manifest.json
   - **Fix:** Use IndexedDB for large data

2. **Why is `get()` returning null?**
   - Key doesn't exist, OR
   - Storage error occurred (check console logs)
   - **Fix:** Check `chrome.runtime.lastError` in console

3. **Why is data not syncing across devices?**
   - User not signed into Chrome
   - Network connectivity issues
   - `.sync` quota exhausted
   - **Fix:** Consider using `.local` instead

### Integration Points
**Used By:**
- Theme state management (potentially)
- User preferences
- Small configuration values

**NOT Used For:**
- Projects (stored in IndexedDB via Dexie)
- Test runs (stored in IndexedDB)
- Recorded steps (stored in IndexedDB)

### Performance Notes
- **Average latency:** <10ms for local reads, <100ms for sync writes
- **Quota:** 100KB total (shared across all keys)
- **Sync delay:** Can take seconds to propagate across devices

### Testing Guidance
**Mock Requirements:**
```typescript
// Mock chrome.storage API
global.chrome = {
  storage: {
    sync: {
      get: jest.fn((keys, callback) => callback({})),
      set: jest.fn((items, callback) => callback()),
      remove: jest.fn((keys, callback) => callback()),
      clear: jest.fn((callback) => callback())
    }
  },
  runtime: { lastError: null }
};
```

**Test Cases to Cover:**
1. ✅ get() returns stored value
2. ✅ get() returns null for missing key
3. ✅ set() stores value successfully
4. ✅ remove() deletes key
5. ✅ getAll() returns all items
6. ✅ clear() removes all items
7. ✅ Error handling (quota exceeded, invalid JSON)

### Future Improvements
1. **Quota tracking** - Warn before exceeding limits
   ```typescript
   async getBytesInUse(): Promise<number>
   ```

2. **Type-safe keys** - Enum-based key management
   ```typescript
   enum StorageKeys {
     THEME = 'app.theme',
     LOCALE = 'app.locale'
   }
   ```

3. **Batch operations** - Reduce API calls
   ```typescript
   async setMany(items: Record<string, any>): Promise<void>
   ```

4. **Local vs Sync strategy** - Choose storage area based on data size
   ```typescript
   async set(key: string, value: any, area: 'local' | 'sync' = 'sync')
   ```

5. **Change listeners** - React to storage updates
   ```typescript
   onChanged(key: string, callback: (newValue, oldValue) => void)
   ```
