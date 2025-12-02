# DAT-001: INDEXEDDB SCHEMA V2 SPECIFICATION

> **Build Card:** DAT-001  
> **Category:** Data Layer  
> **Dependencies:** FND-010 (Step extension), FND-011 (Recording extension)  
> **Risk Level:** Medium  
> **Estimated Lines:** ~480

---

## 1. PURPOSE

This specification defines the IndexedDB schema version 2 for Muffin Lite, which adds support for Vision-related fields. The schema upgrade includes:

1. **Extended Recording table** - New fields for loop, delay, and conditional defaults
2. **Extended Step structure** - Vision coordinates, recording method, delays
3. **Migration logic** - Upgrade path from v1 to v2
4. **Backward compatibility** - Existing data preserved during upgrade

IndexedDB (via Dexie.js) is the primary persistence layer for recordings, projects, and test runs. This upgrade must be seamless for existing users.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| Current Schema | `src/background/indexedDB.ts` | Existing Dexie configuration |
| Data Layer Spec | `/future-spec/05_data-layer.md` | Schema v2 definition |
| FND-010 | Step extension | Extended Step interface |
| FND-011 | Recording extension | Extended Recording interface |
| Migration Notes | `/future-spec/07_migration-notes.md` | Migration requirements |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `src/background/indexedDB.ts` | MODIFY | Add schema v2 with migration |
| `src/lib/migrations/v1ToV2.ts` | CREATE | Migration logic |

### Schema Changes

| Table | Change | Description |
|-------|--------|-------------|
| `recordings` | MODIFY | Add loopStartIndex, globalDelayMs, conditionalDefaults |
| `recordings.steps[]` | MODIFY | Add recordedVia, coordinates, delaySeconds, conditionalConfig |
| `projects` | UNCHANGED | No changes required |
| `testRuns` | UNCHANGED | No changes required |

---

## 4. DETAILED SPECIFICATION

### 4.1 Current Schema (v1)

The existing schema before Vision features:

```typescript
// src/background/indexedDB.ts (current)
import Dexie, { Table } from 'dexie';

export interface Project {
  id?: number;
  name: string;
  description?: string;
  targetUrl?: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Recording {
  id?: number;
  projectId: number;
  name: string;
  description?: string;
  steps: Step[];
  startUrl: string;
  createdAt: Date;
  updatedAt?: Date;
  parsedFields?: ParsedField[];
  csvData?: Record<string, string>[];
}

export interface Step {
  id: string;
  label: string;
  event: string;
  value?: string;
  selector?: string;
  xpath?: string;
  url?: string;
  timestamp?: number;
  order?: number;
}

export interface TestRun {
  id?: number;
  recordingId: number;
  projectId: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  results?: any;
}

class MuffinLiteDatabase extends Dexie {
  projects!: Table<Project>;
  recordings!: Table<Recording>;
  testRuns!: Table<TestRun>;

  constructor() {
    super('MuffinLiteDB');
    
    this.version(1).stores({
      projects: '++id, name, createdAt',
      recordings: '++id, projectId, name, createdAt',
      testRuns: '++id, recordingId, projectId, status, createdAt'
    });
  }
}

export const db = new MuffinLiteDatabase();
```

### 4.2 New Schema (v2)

The updated schema with Vision support:

```typescript
// src/background/indexedDB.ts (updated)
import Dexie, { Table } from 'dexie';
import type {
  Project,
  Recording,
  Step,
  TestRun,
  RecordingConditionalDefaults,
} from '@/types';

// Re-export types for convenience
export type { Project, Recording, Step, TestRun };

/**
 * Default values for new recordings
 */
const DEFAULT_CONDITIONAL_DEFAULTS: RecordingConditionalDefaults = {
  searchTerms: ['Allow', 'Keep'],
  timeoutSeconds: 120,
};

/**
 * Muffin Lite IndexedDB Database
 * 
 * Version History:
 * - v1: Initial schema (projects, recordings, testRuns)
 * - v2: Vision support (loopStartIndex, globalDelayMs, conditionalDefaults, recordedVia)
 */
class MuffinLiteDatabase extends Dexie {
  projects!: Table<Project>;
  recordings!: Table<Recording>;
  testRuns!: Table<TestRun>;

  constructor() {
    super('MuffinLiteDB');
    
    // Version 1: Original schema
    this.version(1).stores({
      projects: '++id, name, createdAt',
      recordings: '++id, projectId, name, createdAt',
      testRuns: '++id, recordingId, projectId, status, createdAt'
    });
    
    // Version 2: Vision support
    // Note: Indexes don't change, only data structure
    this.version(2)
      .stores({
        projects: '++id, name, createdAt',
        recordings: '++id, projectId, name, createdAt',
        testRuns: '++id, recordingId, projectId, status, createdAt'
      })
      .upgrade(async (tx) => {
        // Migrate all recordings to v2 format
        const recordings = tx.table('recordings');
        
        await recordings.toCollection().modify((recording) => {
          // Add new recording-level fields
          if (recording.loopStartIndex === undefined) {
            recording.loopStartIndex = 0;
          }
          
          if (recording.globalDelayMs === undefined) {
            recording.globalDelayMs = 0;
          }
          
          if (!recording.conditionalDefaults) {
            recording.conditionalDefaults = {
              searchTerms: ['Allow', 'Keep'],
              timeoutSeconds: 120,
            };
          }
          
          // Migrate steps
          if (recording.steps && Array.isArray(recording.steps)) {
            recording.steps = recording.steps.map((step: any) => ({
              ...step,
              recordedVia: step.recordedVia ?? 'dom',
              // Other new fields are optional, no need to add defaults
            }));
          }
        });
        
        console.log('[MuffinLiteDB] Migration v1 → v2 complete');
      });
  }
}

export const db = new MuffinLiteDatabase();

/**
 * Initialize database and run any pending migrations
 * Call this on extension startup
 */
export async function initializeDatabase(): Promise<void> {
  try {
    await db.open();
    console.log('[MuffinLiteDB] Database opened successfully, version:', db.verno);
  } catch (error) {
    console.error('[MuffinLiteDB] Failed to open database:', error);
    throw error;
  }
}

/**
 * Get current database version
 */
export function getDatabaseVersion(): number {
  return db.verno;
}

/**
 * Check if database needs migration
 * Useful for showing migration status to user
 */
export async function checkMigrationStatus(): Promise<{
  currentVersion: number;
  latestVersion: number;
  needsMigration: boolean;
}> {
  const currentVersion = db.verno;
  const latestVersion = 2; // Update this when adding new versions
  
  return {
    currentVersion,
    latestVersion,
    needsMigration: currentVersion < latestVersion,
  };
}
```

### 4.3 Migration Logic Details

Create `src/lib/migrations/v1ToV2.ts`:

```typescript
/**
 * @fileoverview Migration logic from schema v1 to v2
 * @module lib/migrations/v1ToV2
 * 
 * This migration adds Vision-related fields to recordings and steps.
 * It is automatically run by Dexie when the database is opened.
 * 
 * Changes:
 * - Recording: Add loopStartIndex, globalDelayMs, conditionalDefaults
 * - Step: Add recordedVia field (defaults to 'dom')
 */

import type { Recording, Step, RecordingConditionalDefaults } from '@/types';

/**
 * Default values for migration
 */
export const MIGRATION_DEFAULTS = {
  recording: {
    loopStartIndex: 0,
    globalDelayMs: 0,
    conditionalDefaults: {
      searchTerms: ['Allow', 'Keep'],
      timeoutSeconds: 120,
    } as RecordingConditionalDefaults,
  },
  step: {
    recordedVia: 'dom' as const,
  },
};

/**
 * Migrates a single step from v1 to v2 format
 * @param step - V1 step (may be missing recordedVia)
 * @returns V2 step with recordedVia
 */
export function migrateStepV1ToV2(step: any): Step {
  return {
    ...step,
    recordedVia: step.recordedVia ?? MIGRATION_DEFAULTS.step.recordedVia,
  };
}

/**
 * Migrates a single recording from v1 to v2 format
 * @param recording - V1 recording (may be missing new fields)
 * @returns V2 recording with all required fields
 */
export function migrateRecordingV1ToV2(recording: any): Recording {
  // Migrate steps first
  const migratedSteps = (recording.steps || []).map(migrateStepV1ToV2);
  
  return {
    ...recording,
    steps: migratedSteps,
    loopStartIndex: recording.loopStartIndex ?? MIGRATION_DEFAULTS.recording.loopStartIndex,
    globalDelayMs: recording.globalDelayMs ?? MIGRATION_DEFAULTS.recording.globalDelayMs,
    conditionalDefaults: recording.conditionalDefaults ?? {
      ...MIGRATION_DEFAULTS.recording.conditionalDefaults,
    },
  };
}

/**
 * Validates that a recording has been successfully migrated
 * @param recording - Recording to validate
 * @returns Validation result
 */
export function validateMigration(recording: Recording): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  // Check recording-level fields
  if (recording.loopStartIndex === undefined) {
    issues.push('Missing loopStartIndex');
  }
  
  if (recording.globalDelayMs === undefined) {
    issues.push('Missing globalDelayMs');
  }
  
  if (!recording.conditionalDefaults) {
    issues.push('Missing conditionalDefaults');
  } else {
    if (!recording.conditionalDefaults.searchTerms) {
      issues.push('Missing conditionalDefaults.searchTerms');
    }
    if (recording.conditionalDefaults.timeoutSeconds === undefined) {
      issues.push('Missing conditionalDefaults.timeoutSeconds');
    }
  }
  
  // Check step-level fields
  if (recording.steps) {
    recording.steps.forEach((step, index) => {
      if (!step.recordedVia) {
        issues.push(`Step ${index}: Missing recordedVia`);
      }
    });
  }
  
  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Performs a manual migration check and repair
 * Can be called to fix partially migrated data
 * @param recordings - Array of recordings to check/fix
 * @returns Migration results
 */
export function repairMigration(recordings: any[]): {
  checked: number;
  repaired: number;
  results: Recording[];
} {
  let repaired = 0;
  
  const results = recordings.map((recording) => {
    const validation = validateMigration(recording);
    
    if (!validation.valid) {
      repaired++;
      return migrateRecordingV1ToV2(recording);
    }
    
    return recording as Recording;
  });
  
  return {
    checked: recordings.length,
    repaired,
    results,
  };
}

/**
 * Migration statistics for logging/debugging
 */
export interface MigrationStats {
  recordingsProcessed: number;
  stepsProcessed: number;
  fieldsAdded: {
    loopStartIndex: number;
    globalDelayMs: number;
    conditionalDefaults: number;
    recordedVia: number;
  };
  errors: string[];
}

/**
 * Collects statistics about what the migration would change
 * Useful for dry-run analysis
 * @param recordings - Recordings to analyze
 * @returns Migration statistics
 */
export function analyzeMigration(recordings: any[]): MigrationStats {
  const stats: MigrationStats = {
    recordingsProcessed: 0,
    stepsProcessed: 0,
    fieldsAdded: {
      loopStartIndex: 0,
      globalDelayMs: 0,
      conditionalDefaults: 0,
      recordedVia: 0,
    },
    errors: [],
  };
  
  for (const recording of recordings) {
    stats.recordingsProcessed++;
    
    if (recording.loopStartIndex === undefined) {
      stats.fieldsAdded.loopStartIndex++;
    }
    
    if (recording.globalDelayMs === undefined) {
      stats.fieldsAdded.globalDelayMs++;
    }
    
    if (!recording.conditionalDefaults) {
      stats.fieldsAdded.conditionalDefaults++;
    }
    
    if (recording.steps && Array.isArray(recording.steps)) {
      for (const step of recording.steps) {
        stats.stepsProcessed++;
        
        if (!step.recordedVia) {
          stats.fieldsAdded.recordedVia++;
        }
      }
    }
  }
  
  return stats;
}
```

### 4.4 Database Helper Functions

Add these helper functions to `src/background/indexedDB.ts`:

```typescript
// Additional helper functions for indexedDB.ts

/**
 * Saves a recording, automatically updating timestamps
 * @param recording - Recording to save
 * @returns Saved recording with ID
 */
export async function saveRecording(recording: Omit<Recording, 'id'> | Recording): Promise<Recording> {
  const now = new Date();
  
  const toSave = {
    ...recording,
    updatedAt: now,
    createdAt: recording.createdAt || now,
    // Ensure new fields have defaults
    loopStartIndex: recording.loopStartIndex ?? 0,
    globalDelayMs: recording.globalDelayMs ?? 0,
    conditionalDefaults: recording.conditionalDefaults ?? DEFAULT_CONDITIONAL_DEFAULTS,
  };
  
  if ('id' in recording && recording.id !== undefined) {
    // Update existing
    await db.recordings.update(recording.id, toSave);
    return { ...toSave, id: recording.id };
  } else {
    // Create new
    const id = await db.recordings.add(toSave as Recording);
    return { ...toSave, id };
  }
}

/**
 * Gets a recording by ID with migration check
 * @param id - Recording ID
 * @returns Recording or undefined
 */
export async function getRecording(id: number): Promise<Recording | undefined> {
  const recording = await db.recordings.get(id);
  
  if (recording) {
    // Ensure migrated (defensive)
    return {
      ...recording,
      loopStartIndex: recording.loopStartIndex ?? 0,
      globalDelayMs: recording.globalDelayMs ?? 0,
      conditionalDefaults: recording.conditionalDefaults ?? DEFAULT_CONDITIONAL_DEFAULTS,
      steps: recording.steps?.map(step => ({
        ...step,
        recordedVia: step.recordedVia ?? 'dom',
      })) ?? [],
    };
  }
  
  return undefined;
}

/**
 * Gets all recordings for a project with migration check
 * @param projectId - Project ID
 * @returns Array of recordings
 */
export async function getRecordingsByProject(projectId: number): Promise<Recording[]> {
  const recordings = await db.recordings.where('projectId').equals(projectId).toArray();
  
  // Ensure all are migrated
  return recordings.map(recording => ({
    ...recording,
    loopStartIndex: recording.loopStartIndex ?? 0,
    globalDelayMs: recording.globalDelayMs ?? 0,
    conditionalDefaults: recording.conditionalDefaults ?? DEFAULT_CONDITIONAL_DEFAULTS,
    steps: recording.steps?.map(step => ({
      ...step,
      recordedVia: step.recordedVia ?? 'dom',
    })) ?? [],
  }));
}

/**
 * Deletes a recording
 * @param id - Recording ID
 */
export async function deleteRecording(id: number): Promise<void> {
  await db.recordings.delete(id);
}

/**
 * Counts recordings in a project
 * @param projectId - Project ID
 * @returns Count
 */
export async function countRecordings(projectId: number): Promise<number> {
  return db.recordings.where('projectId').equals(projectId).count();
}
```

---

## 5. CODE EXAMPLES

### 5.1 Opening Database with Migration

```typescript
import { initializeDatabase, getDatabaseVersion } from '@/background/indexedDB';

// On extension startup
async function startup() {
  await initializeDatabase();
  console.log('Database version:', getDatabaseVersion()); // 2
}
```

### 5.2 Saving a Recording with New Fields

```typescript
import { saveRecording } from '@/background/indexedDB';

const recording = {
  projectId: 1,
  name: 'My Automation',
  steps: [
    { id: 'step-1', label: 'Open page', event: 'open', url: 'https://example.com', recordedVia: 'dom' },
    { id: 'step-2', label: 'Click button', event: 'click', selector: '#btn', recordedVia: 'dom' },
  ],
  startUrl: 'https://example.com',
  createdAt: new Date(),
  loopStartIndex: 1,
  globalDelayMs: 1000,
  conditionalDefaults: {
    searchTerms: ['Allow', 'Keep'],
    timeoutSeconds: 120,
  },
};

const saved = await saveRecording(recording);
console.log('Saved with ID:', saved.id);
```

### 5.3 Checking Migration Status

```typescript
import { checkMigrationStatus } from '@/background/indexedDB';

const status = await checkMigrationStatus();
if (status.needsMigration) {
  console.log(`Database needs migration: v${status.currentVersion} → v${status.latestVersion}`);
}
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** Database version is incremented to 2
- [ ] **AC-2:** v2 schema includes upgrade function
- [ ] **AC-3:** Migration adds loopStartIndex with default 0
- [ ] **AC-4:** Migration adds globalDelayMs with default 0
- [ ] **AC-5:** Migration adds conditionalDefaults with correct defaults
- [ ] **AC-6:** Migration adds recordedVia: 'dom' to all existing steps
- [ ] **AC-7:** `src/lib/migrations/v1ToV2.ts` is created
- [ ] **AC-8:** Existing recordings load correctly after migration
- [ ] **AC-9:** New recordings save with all required fields
- [ ] **AC-10:** No data loss during migration

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Dexie version ordering** - Versions must be sequential (1, 2, 3...)
2. **Upgrade runs once** - Migration only runs when version changes
3. **Transaction safety** - Upgrade runs in a transaction
4. **No index changes** - Indexes remain the same (no reindexing needed)

### Patterns to Follow

1. **Defensive reads** - Always apply defaults when reading data
2. **Idempotent migration** - Can be re-run safely
3. **Logging** - Log migration progress for debugging

### Edge Cases

1. **Empty steps array** - Handle gracefully
2. **Null vs undefined** - Use nullish coalescing (??)
3. **Corrupted data** - Log and skip, don't fail migration

---

## 8. VERIFICATION COMMANDS

```bash
# Verify files exist
ls -la src/background/indexedDB.ts
ls -la src/lib/migrations/v1ToV2.ts

# Run type check
npm run type-check

# Build and test in browser
npm run build
# Load extension, open DevTools, check for migration logs
```

---

## 9. ROLLBACK PROCEDURE

**Warning:** Database downgrades are complex. If issues arise:

```typescript
// Emergency: Clear database and start fresh
await db.delete();
// User will lose all data - use only as last resort
```

For safer rollback:
1. Export all recordings before migration
2. Keep backup of old extension version
3. Restore from export if needed

---

## 10. REFERENCES

- [Dexie.js Version Management](https://dexie.org/docs/Tutorial/Design#database-versioning)
- [Dexie.js Upgrade](https://dexie.org/docs/Version/Version.upgrade())
- FND-010: Step Interface Extension
- FND-011: Recording Interface Extension
- Data Layer Spec: `/future-spec/05_data-layer.md`

---

*End of Specification DAT-001*
