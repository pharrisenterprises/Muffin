# DAT-003: RECORDING REPOSITORY SPECIFICATION

> **Build Card:** DAT-003  
> **Category:** Data Layer  
> **Dependencies:** DAT-001 (IndexedDB Schema v2)  
> **Risk Level:** Low  
> **Estimated Lines:** ~420

---

## 1. PURPOSE

This specification defines the Recording Repository, a data access layer that provides a clean API for CRUD operations on recordings. The repository:

1. **Encapsulates database access** - Hides Dexie.js implementation details
2. **Ensures data integrity** - Applies defaults and validation on read/write
3. **Provides type safety** - Returns properly typed Recording objects
4. **Handles migrations** - Ensures data is in v2 format when accessed
5. **Supports querying** - Filter, sort, and paginate recordings

This pattern separates business logic from data access, making the codebase more maintainable and testable.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| DAT-001 | IndexedDB Schema v2 | Database structure |
| FND-011 | Recording extension | Recording interface |
| Data Layer Spec | `/future-spec/05_data-layer.md` | Repository pattern |
| Existing indexedDB.ts | `src/background/indexedDB.ts` | Current data access |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `src/repositories/recordingRepository.ts` | CREATE | Recording repository implementation |
| `src/repositories/index.ts` | CREATE | Repository exports |

### Repository Methods

| Method | Description |
|--------|-------------|
| `getById` | Get single recording by ID |
| `getByProjectId` | Get all recordings for a project |
| `getAll` | Get all recordings |
| `create` | Create new recording |
| `update` | Update existing recording |
| `delete` | Delete recording by ID |
| `duplicate` | Clone a recording |
| `count` | Count recordings (optionally by project) |
| `search` | Search recordings by name |

---

## 4. DETAILED SPECIFICATION

### 4.1 Repository Pattern

The repository pattern provides:

```
┌─────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                       │
│  (React Components, Services, Handlers)                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                    ┌─────────────────┐                       │
│                    │   Repository    │                       │
│                    │     API         │                       │
│                    └────────┬────────┘                       │
│                             │                                │
│            ┌────────────────┼────────────────┐              │
│            │                │                │              │
│            ▼                ▼                ▼              │
│     ┌──────────┐    ┌──────────┐    ┌──────────────┐       │
│     │ Defaults │    │Validation│    │ Normalization│       │
│     └──────────┘    └──────────┘    └──────────────┘       │
│                             │                                │
│                             ▼                                │
│                    ┌─────────────────┐                       │
│                    │   Dexie.js      │                       │
│                    │   (IndexedDB)   │                       │
│                    └─────────────────┘                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Repository Implementation

Create `src/repositories/recordingRepository.ts`:

```typescript
/**
 * @fileoverview Recording Repository - Data access layer for recordings
 * @module repositories/recordingRepository
 * 
 * This repository provides a clean API for CRUD operations on recordings,
 * ensuring all data is properly typed and includes required v2 fields.
 */

import { db } from '@/background/indexedDB';
import type { Recording, Step, RecordingConditionalDefaults } from '@/types';
import { validateRecording } from '@/lib/recordingUtils';
import { v4 as uuidv4 } from 'uuid';

/**
 * Default values for new recordings
 */
const DEFAULT_CONDITIONAL_DEFAULTS: RecordingConditionalDefaults = {
  searchTerms: ['Allow', 'Keep'],
  timeoutSeconds: 120,
};

/**
 * Options for querying recordings
 */
export interface RecordingQueryOptions {
  /** Filter by project ID */
  projectId?: number;
  /** Sort field */
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
  /** Maximum results */
  limit?: number;
  /** Skip first N results */
  offset?: number;
}

/**
 * Result of a paginated query
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Ensures a recording has all v2 fields with defaults
 * @param recording - Recording from database (may be missing fields)
 * @returns Recording with all required fields
 */
function ensureV2Format(recording: any): Recording {
  return {
    ...recording,
    loopStartIndex: recording.loopStartIndex ?? 0,
    globalDelayMs: recording.globalDelayMs ?? 0,
    conditionalDefaults: recording.conditionalDefaults ?? {
      ...DEFAULT_CONDITIONAL_DEFAULTS,
    },
    steps: (recording.steps || []).map((step: any) => ({
      ...step,
      recordedVia: step.recordedVia ?? 'dom',
    })),
  };
}

/**
 * Prepares a recording for saving
 * @param recording - Recording to prepare
 * @returns Recording ready for database
 */
function prepareForSave(recording: Partial<Recording>): Partial<Recording> {
  const now = new Date();
  
  return {
    ...recording,
    updatedAt: now,
    createdAt: recording.createdAt || now,
    loopStartIndex: recording.loopStartIndex ?? 0,
    globalDelayMs: recording.globalDelayMs ?? 0,
    conditionalDefaults: recording.conditionalDefaults ?? {
      ...DEFAULT_CONDITIONAL_DEFAULTS,
    },
    steps: (recording.steps || []).map((step) => ({
      ...step,
      id: step.id || uuidv4(),
      recordedVia: step.recordedVia ?? 'dom',
    })),
  };
}

/**
 * Recording Repository
 * 
 * Provides data access methods for Recording entities.
 * All methods ensure data is in v2 format with proper defaults.
 */
export const recordingRepository = {
  /**
   * Gets a recording by ID
   * @param id - Recording ID
   * @returns Recording or undefined if not found
   */
  async getById(id: number): Promise<Recording | undefined> {
    const recording = await db.recordings.get(id);
    
    if (!recording) {
      return undefined;
    }
    
    return ensureV2Format(recording);
  },

  /**
   * Gets all recordings for a project
   * @param projectId - Project ID
   * @param options - Query options
   * @returns Array of recordings
   */
  async getByProjectId(
    projectId: number,
    options: Omit<RecordingQueryOptions, 'projectId'> = {}
  ): Promise<Recording[]> {
    let query = db.recordings.where('projectId').equals(projectId);
    
    let recordings = await query.toArray();
    
    // Apply sorting
    if (options.sortBy) {
      recordings = recordings.sort((a, b) => {
        let aVal: any = a[options.sortBy!];
        let bVal: any = b[options.sortBy!];
        
        // Handle dates
        if (aVal instanceof Date) aVal = aVal.getTime();
        if (bVal instanceof Date) bVal = bVal.getTime();
        
        // Handle strings
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        
        if (options.sortOrder === 'desc') {
          return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
        }
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      });
    }
    
    // Apply pagination
    if (options.offset) {
      recordings = recordings.slice(options.offset);
    }
    if (options.limit) {
      recordings = recordings.slice(0, options.limit);
    }
    
    return recordings.map(ensureV2Format);
  },

  /**
   * Gets all recordings
   * @param options - Query options
   * @returns Array of recordings
   */
  async getAll(options: RecordingQueryOptions = {}): Promise<Recording[]> {
    let recordings = await db.recordings.toArray();
    
    // Apply project filter
    if (options.projectId !== undefined) {
      recordings = recordings.filter((r) => r.projectId === options.projectId);
    }
    
    // Apply sorting
    if (options.sortBy) {
      recordings = recordings.sort((a, b) => {
        let aVal: any = a[options.sortBy!];
        let bVal: any = b[options.sortBy!];
        
        if (aVal instanceof Date) aVal = aVal.getTime();
        if (bVal instanceof Date) bVal = bVal.getTime();
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        
        if (options.sortOrder === 'desc') {
          return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
        }
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      });
    }
    
    // Apply pagination
    if (options.offset) {
      recordings = recordings.slice(options.offset);
    }
    if (options.limit) {
      recordings = recordings.slice(0, options.limit);
    }
    
    return recordings.map(ensureV2Format);
  },

  /**
   * Gets recordings with pagination info
   * @param options - Query options
   * @returns Paginated result
   */
  async getPaginated(
    options: RecordingQueryOptions = {}
  ): Promise<PaginatedResult<Recording>> {
    const allRecordings = await db.recordings.toArray();
    
    // Apply project filter
    let filtered = options.projectId !== undefined
      ? allRecordings.filter((r) => r.projectId === options.projectId)
      : allRecordings;
    
    const total = filtered.length;
    const limit = options.limit || 20;
    const offset = options.offset || 0;
    
    // Apply sorting
    if (options.sortBy) {
      filtered = filtered.sort((a, b) => {
        let aVal: any = a[options.sortBy!];
        let bVal: any = b[options.sortBy!];
        
        if (aVal instanceof Date) aVal = aVal.getTime();
        if (bVal instanceof Date) bVal = bVal.getTime();
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        
        if (options.sortOrder === 'desc') {
          return bVal > aVal ? 1 : bVal < aVal ? -1 : 0;
        }
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      });
    }
    
    // Apply pagination
    const items = filtered.slice(offset, offset + limit).map(ensureV2Format);
    
    return {
      items,
      total,
      limit,
      offset,
      hasMore: offset + items.length < total,
    };
  },

  /**
   * Creates a new recording
   * @param recording - Recording data (without ID)
   * @returns Created recording with ID
   * @throws Error if validation fails
   */
  async create(
    recording: Omit<Recording, 'id'>
  ): Promise<Recording> {
    const prepared = prepareForSave(recording) as Omit<Recording, 'id'>;
    
    // Validate
    const validation = validateRecording({ ...prepared, id: 0 } as Recording);
    if (!validation.valid) {
      throw new Error(`Invalid recording: ${validation.errors.join(', ')}`);
    }
    
    const id = await db.recordings.add(prepared as Recording);
    
    return {
      ...prepared,
      id,
    } as Recording;
  },

  /**
   * Updates an existing recording
   * @param id - Recording ID
   * @param updates - Partial recording updates
   * @returns Updated recording
   * @throws Error if recording not found or validation fails
   */
  async update(
    id: number,
    updates: Partial<Omit<Recording, 'id'>>
  ): Promise<Recording> {
    const existing = await this.getById(id);
    
    if (!existing) {
      throw new Error(`Recording not found: ${id}`);
    }
    
    const merged = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date(),
    };
    
    // Ensure steps have IDs and recordedVia
    if (merged.steps) {
      merged.steps = merged.steps.map((step) => ({
        ...step,
        id: step.id || uuidv4(),
        recordedVia: step.recordedVia ?? 'dom',
      }));
    }
    
    // Validate
    const validation = validateRecording(merged);
    if (!validation.valid) {
      throw new Error(`Invalid recording: ${validation.errors.join(', ')}`);
    }
    
    await db.recordings.update(id, merged);
    
    return merged;
  },

  /**
   * Deletes a recording
   * @param id - Recording ID
   * @throws Error if recording not found
   */
  async delete(id: number): Promise<void> {
    const existing = await db.recordings.get(id);
    
    if (!existing) {
      throw new Error(`Recording not found: ${id}`);
    }
    
    await db.recordings.delete(id);
  },

  /**
   * Deletes all recordings for a project
   * @param projectId - Project ID
   * @returns Number of deleted recordings
   */
  async deleteByProjectId(projectId: number): Promise<number> {
    const recordings = await db.recordings
      .where('projectId')
      .equals(projectId)
      .toArray();
    
    const ids = recordings.map((r) => r.id!).filter(Boolean);
    await db.recordings.bulkDelete(ids);
    
    return ids.length;
  },

  /**
   * Duplicates a recording with a new name
   * @param id - Recording ID to duplicate
   * @param newName - Name for the duplicate
   * @returns New recording
   */
  async duplicate(id: number, newName: string): Promise<Recording> {
    const original = await this.getById(id);
    
    if (!original) {
      throw new Error(`Recording not found: ${id}`);
    }
    
    // Clone with new IDs for steps
    const clone: Omit<Recording, 'id'> = {
      ...original,
      name: newName,
      createdAt: new Date(),
      updatedAt: new Date(),
      steps: original.steps.map((step) => ({
        ...step,
        id: uuidv4(),
      })),
    };
    
    // Remove the old ID
    delete (clone as any).id;
    
    return this.create(clone);
  },

  /**
   * Counts recordings
   * @param projectId - Optional project ID filter
   * @returns Count
   */
  async count(projectId?: number): Promise<number> {
    if (projectId !== undefined) {
      return db.recordings.where('projectId').equals(projectId).count();
    }
    return db.recordings.count();
  },

  /**
   * Searches recordings by name
   * @param query - Search query
   * @param projectId - Optional project filter
   * @returns Matching recordings
   */
  async search(query: string, projectId?: number): Promise<Recording[]> {
    const lowerQuery = query.toLowerCase();
    
    let recordings = await db.recordings.toArray();
    
    // Filter by project if specified
    if (projectId !== undefined) {
      recordings = recordings.filter((r) => r.projectId === projectId);
    }
    
    // Filter by name match
    recordings = recordings.filter((r) =>
      r.name.toLowerCase().includes(lowerQuery)
    );
    
    return recordings.map(ensureV2Format);
  },

  /**
   * Checks if a recording exists
   * @param id - Recording ID
   * @returns True if exists
   */
  async exists(id: number): Promise<boolean> {
    const count = await db.recordings.where('id').equals(id).count();
    return count > 0;
  },

  /**
   * Gets recordings that use Vision features
   * @param projectId - Optional project filter
   * @returns Recordings with Vision steps
   */
  async getVisionRecordings(projectId?: number): Promise<Recording[]> {
    let recordings = await this.getAll({ projectId });
    
    return recordings.filter((r) =>
      r.steps.some((s) => s.recordedVia === 'vision')
    );
  },

  /**
   * Gets recordings with conditional clicks
   * @param projectId - Optional project filter
   * @returns Recordings with conditional click steps
   */
  async getConditionalRecordings(projectId?: number): Promise<Recording[]> {
    let recordings = await this.getAll({ projectId });
    
    return recordings.filter((r) =>
      r.steps.some((s) => s.event === 'conditional-click')
    );
  },
};

// Export type for the repository
export type RecordingRepository = typeof recordingRepository;
```

### 4.3 Repository Index

Create `src/repositories/index.ts`:

```typescript
/**
 * @fileoverview Repository exports
 * @module repositories
 */

export { recordingRepository } from './recordingRepository';
export type { 
  RecordingQueryOptions, 
  PaginatedResult,
  RecordingRepository,
} from './recordingRepository';

// Future repositories can be added here:
// export { projectRepository } from './projectRepository';
// export { testRunRepository } from './testRunRepository';
```

---

## 5. CODE EXAMPLES

### 5.1 Basic CRUD Operations

```typescript
import { recordingRepository } from '@/repositories';

// Create
const recording = await recordingRepository.create({
  projectId: 1,
  name: 'My Automation',
  steps: [],
  startUrl: 'https://example.com',
  createdAt: new Date(),
  loopStartIndex: 0,
  globalDelayMs: 1000,
  conditionalDefaults: { searchTerms: ['Allow'], timeoutSeconds: 120 },
});

// Read
const fetched = await recordingRepository.getById(recording.id!);

// Update
const updated = await recordingRepository.update(recording.id!, {
  name: 'Updated Name',
});

// Delete
await recordingRepository.delete(recording.id!);
```

### 5.2 Querying and Pagination

```typescript
import { recordingRepository } from '@/repositories';

// Get all for a project, sorted by name
const recordings = await recordingRepository.getByProjectId(1, {
  sortBy: 'name',
  sortOrder: 'asc',
});

// Paginated query
const page1 = await recordingRepository.getPaginated({
  projectId: 1,
  limit: 10,
  offset: 0,
  sortBy: 'createdAt',
  sortOrder: 'desc',
});

console.log(`Showing ${page1.items.length} of ${page1.total}`);
console.log(`Has more: ${page1.hasMore}`);
```

### 5.3 Specialized Queries

```typescript
import { recordingRepository } from '@/repositories';

// Search by name
const results = await recordingRepository.search('automation', 1);

// Get Vision recordings
const visionRecordings = await recordingRepository.getVisionRecordings(1);

// Duplicate a recording
const clone = await recordingRepository.duplicate(5, 'Copy of Recording');
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** `src/repositories/recordingRepository.ts` is created
- [ ] **AC-2:** All CRUD methods work correctly (create, read, update, delete)
- [ ] **AC-3:** `getById` returns undefined for non-existent IDs
- [ ] **AC-4:** `getByProjectId` filters correctly
- [ ] **AC-5:** Sorting works for name, createdAt, updatedAt
- [ ] **AC-6:** Pagination returns correct slice and metadata
- [ ] **AC-7:** `duplicate` creates new recording with new step IDs
- [ ] **AC-8:** All methods ensure v2 format with defaults
- [ ] **AC-9:** Validation runs before create/update
- [ ] **AC-10:** TypeScript compiles without errors

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Always apply defaults** - Never return data without v2 fields
2. **Validate before save** - Reject invalid data
3. **Generate step IDs** - Ensure all steps have unique IDs

### Patterns to Follow

1. **Repository pattern** - Single point of data access
2. **Defensive programming** - Handle missing/null values
3. **Immutable operations** - Don't mutate input data

### Edge Cases

1. **Empty steps array** - Valid, should work
2. **Missing optional fields** - Apply defaults
3. **Concurrent updates** - Last write wins (Dexie default)

---

## 8. VERIFICATION COMMANDS

```bash
# Verify file exists
ls -la src/repositories/recordingRepository.ts

# Run type check
npm run type-check

# Test repository (manual)
# Import and call methods in DevTools console
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Remove repository files
rm -rf src/repositories/

# Revert to direct database access
# Update imports in affected files
```

---

## 10. REFERENCES

- DAT-001: IndexedDB Schema v2
- FND-011: Recording Interface Extension
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)

---

*End of Specification DAT-003*
