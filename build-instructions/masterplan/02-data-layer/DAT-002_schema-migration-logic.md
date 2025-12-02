# DAT-002: SCHEMA MIGRATION LOGIC SPECIFICATION

> **Build Card:** DAT-002  
> **Category:** Data Layer  
> **Dependencies:** DAT-001 (IndexedDB Schema v2)  
> **Risk Level:** Medium  
> **Estimated Lines:** ~450

---

## 1. PURPOSE

This specification defines the complete migration logic for upgrading Muffin Lite's data from schema v1 to v2. While DAT-001 defines the schema structure, this specification focuses on:

1. **Migration execution flow** - Step-by-step process
2. **Data transformation rules** - How each field is transformed
3. **Error handling** - Recovery from migration failures
4. **Validation** - Verifying migration success
5. **Rollback strategy** - Handling migration failures

This is critical infrastructure that runs automatically when users update to the Vision-enabled version.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| DAT-001 | Schema v2 specification | Schema structure and defaults |
| Data Layer Spec | `/future-spec/05_data-layer.md` | Migration requirements |
| Migration Notes | `/future-spec/07_migration-notes.md` | Detailed migration steps |
| FND-010 | Step extension | Step field mappings |
| FND-011 | Recording extension | Recording field mappings |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `src/lib/migrations/v1ToV2.ts` | MODIFY | Complete migration implementation |
| `src/lib/migrations/index.ts` | CREATE | Migration registry and runner |
| `src/lib/migrations/migrationUtils.ts` | CREATE | Shared migration utilities |

### Migration Functions

| Function | Description |
|----------|-------------|
| `runMigrations` | Execute all pending migrations |
| `migrateV1ToV2` | V1 to V2 migration logic |
| `validateMigration` | Verify migration success |
| `createBackup` | Backup before migration |
| `restoreBackup` | Restore from backup |

---

## 4. DETAILED SPECIFICATION

### 4.1 Migration Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    MIGRATION FLOW                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Extension Startup                                        │
│         │                                                    │
│         ▼                                                    │
│  2. Check Database Version                                   │
│         │                                                    │
│         ├── Version >= 2 ──► No migration needed            │
│         │                                                    │
│         ▼                                                    │
│  3. Version < 2: Start Migration                            │
│         │                                                    │
│         ▼                                                    │
│  4. Create Backup (localStorage snapshot)                   │
│         │                                                    │
│         ▼                                                    │
│  5. Begin Transaction                                        │
│         │                                                    │
│         ▼                                                    │
│  6. Migrate Each Recording                                   │
│         │   ├── Add loopStartIndex                          │
│         │   ├── Add globalDelayMs                           │
│         │   ├── Add conditionalDefaults                     │
│         │   └── Migrate each step                           │
│         │           └── Add recordedVia                     │
│         │                                                    │
│         ▼                                                    │
│  7. Validate Migration                                       │
│         │                                                    │
│         ├── Validation Failed ──► Restore Backup            │
│         │                                                    │
│         ▼                                                    │
│  8. Commit Transaction                                       │
│         │                                                    │
│         ▼                                                    │
│  9. Update Version to 2                                      │
│         │                                                    │
│         ▼                                                    │
│  10. Clear Backup                                            │
│         │                                                    │
│         ▼                                                    │
│  11. Migration Complete                                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Migration Registry

Create `src/lib/migrations/index.ts`:

```typescript
/**
 * @fileoverview Migration registry and runner
 * @module lib/migrations
 * 
 * This module manages database migrations for Muffin Lite.
 * Migrations are run automatically when the database is opened
 * and the version is lower than the current schema version.
 */

import { db } from '@/background/indexedDB';
import { migrateV1ToV2, validateV1ToV2Migration } from './v1ToV2';
import {
  createBackup,
  restoreBackup,
  clearBackup,
  MigrationResult,
  MigrationError,
} from './migrationUtils';

/**
 * Migration definition
 */
export interface Migration {
  /** Source version */
  fromVersion: number;
  /** Target version */
  toVersion: number;
  /** Migration function */
  migrate: () => Promise<MigrationResult>;
  /** Validation function */
  validate: () => Promise<boolean>;
  /** Human-readable description */
  description: string;
}

/**
 * Registry of all migrations
 * Add new migrations here as the schema evolves
 */
export const MIGRATIONS: Migration[] = [
  {
    fromVersion: 1,
    toVersion: 2,
    migrate: migrateV1ToV2,
    validate: validateV1ToV2Migration,
    description: 'Add Vision support (loopStartIndex, globalDelayMs, conditionalDefaults, recordedVia)',
  },
  // Future migrations go here:
  // {
  //   fromVersion: 2,
  //   toVersion: 3,
  //   migrate: migrateV2ToV3,
  //   validate: validateV2ToV3Migration,
  //   description: 'Description of v3 changes',
  // },
];

/**
 * Current schema version
 */
export const CURRENT_SCHEMA_VERSION = 2;

/**
 * Runs all pending migrations
 * Called automatically by Dexie, but can be called manually for testing
 * @returns Migration results
 */
export async function runPendingMigrations(): Promise<{
  ran: number;
  skipped: number;
  failed: number;
  results: MigrationResult[];
}> {
  const currentVersion = db.verno;
  const results: MigrationResult[] = [];
  let ran = 0;
  let skipped = 0;
  let failed = 0;

  console.log(`[Migration] Current version: ${currentVersion}, Target: ${CURRENT_SCHEMA_VERSION}`);

  for (const migration of MIGRATIONS) {
    if (currentVersion >= migration.toVersion) {
      console.log(`[Migration] Skipping v${migration.fromVersion}→v${migration.toVersion} (already applied)`);
      skipped++;
      continue;
    }

    if (currentVersion < migration.fromVersion) {
      console.log(`[Migration] Skipping v${migration.fromVersion}→v${migration.toVersion} (not applicable)`);
      skipped++;
      continue;
    }

    console.log(`[Migration] Running v${migration.fromVersion}→v${migration.toVersion}: ${migration.description}`);

    try {
      // Create backup before migration
      await createBackup(`pre-migration-v${migration.toVersion}`);

      // Run migration
      const result = await migration.migrate();
      results.push(result);

      if (!result.success) {
        console.error(`[Migration] Failed:`, result.error);
        failed++;
        
        // Attempt restore
        await restoreBackup(`pre-migration-v${migration.toVersion}`);
        break; // Stop further migrations
      }

      // Validate
      const isValid = await migration.validate();
      if (!isValid) {
        console.error(`[Migration] Validation failed for v${migration.toVersion}`);
        failed++;
        
        // Attempt restore
        await restoreBackup(`pre-migration-v${migration.toVersion}`);
        break;
      }

      // Success - clear backup
      await clearBackup(`pre-migration-v${migration.toVersion}`);
      ran++;
      console.log(`[Migration] v${migration.fromVersion}→v${migration.toVersion} complete`);

    } catch (error) {
      console.error(`[Migration] Unexpected error:`, error);
      results.push({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        recordsProcessed: 0,
        recordsUpdated: 0,
        duration: 0,
      });
      failed++;
      break;
    }
  }

  return { ran, skipped, failed, results };
}

/**
 * Gets migration status for display to user
 */
export function getMigrationStatus(): {
  currentVersion: number;
  targetVersion: number;
  pendingMigrations: Migration[];
  isUpToDate: boolean;
} {
  const currentVersion = db.verno;
  const pendingMigrations = MIGRATIONS.filter(
    (m) => m.fromVersion >= currentVersion && m.toVersion <= CURRENT_SCHEMA_VERSION
  );

  return {
    currentVersion,
    targetVersion: CURRENT_SCHEMA_VERSION,
    pendingMigrations,
    isUpToDate: currentVersion >= CURRENT_SCHEMA_VERSION,
  };
}
```

### 4.3 Migration Utilities

Create `src/lib/migrations/migrationUtils.ts`:

```typescript
/**
 * @fileoverview Shared utilities for database migrations
 * @module lib/migrations/migrationUtils
 */

/**
 * Result of a migration operation
 */
export interface MigrationResult {
  /** Whether migration succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Number of records examined */
  recordsProcessed: number;
  /** Number of records modified */
  recordsUpdated: number;
  /** Duration in milliseconds */
  duration: number;
  /** Additional details */
  details?: Record<string, unknown>;
}

/**
 * Migration error with context
 */
export class MigrationError extends Error {
  constructor(
    message: string,
    public readonly phase: string,
    public readonly recordId?: number,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'MigrationError';
  }
}

/**
 * Backup storage key prefix
 */
const BACKUP_PREFIX = 'muffin_migration_backup_';

/**
 * Creates a backup of recordings before migration
 * Stores in localStorage as JSON (size-limited fallback)
 * @param backupId - Unique identifier for this backup
 */
export async function createBackup(backupId: string): Promise<void> {
  try {
    const { db } = await import('@/background/indexedDB');
    const recordings = await db.recordings.toArray();
    
    const backup = {
      timestamp: new Date().toISOString(),
      version: db.verno,
      recordingCount: recordings.length,
      recordings: recordings,
    };
    
    const key = BACKUP_PREFIX + backupId;
    const json = JSON.stringify(backup);
    
    // Check size (localStorage limit ~5MB)
    if (json.length > 4 * 1024 * 1024) {
      console.warn('[Backup] Data too large for localStorage, skipping backup');
      return;
    }
    
    localStorage.setItem(key, json);
    console.log(`[Backup] Created backup '${backupId}' with ${recordings.length} recordings`);
    
  } catch (error) {
    console.error('[Backup] Failed to create backup:', error);
    // Don't throw - migration should still attempt to proceed
  }
}

/**
 * Restores recordings from a backup
 * @param backupId - Identifier of backup to restore
 */
export async function restoreBackup(backupId: string): Promise<boolean> {
  try {
    const key = BACKUP_PREFIX + backupId;
    const json = localStorage.getItem(key);
    
    if (!json) {
      console.error(`[Backup] No backup found with id '${backupId}'`);
      return false;
    }
    
    const backup = JSON.parse(json);
    const { db } = await import('@/background/indexedDB');
    
    // Clear current recordings
    await db.recordings.clear();
    
    // Restore from backup
    await db.recordings.bulkAdd(backup.recordings);
    
    console.log(`[Backup] Restored ${backup.recordingCount} recordings from '${backupId}'`);
    return true;
    
  } catch (error) {
    console.error('[Backup] Failed to restore backup:', error);
    return false;
  }
}

/**
 * Clears a backup after successful migration
 * @param backupId - Identifier of backup to clear
 */
export async function clearBackup(backupId: string): Promise<void> {
  const key = BACKUP_PREFIX + backupId;
  localStorage.removeItem(key);
  console.log(`[Backup] Cleared backup '${backupId}'`);
}

/**
 * Lists all available backups
 */
export function listBackups(): string[] {
  const backups: string[] = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(BACKUP_PREFIX)) {
      backups.push(key.replace(BACKUP_PREFIX, ''));
    }
  }
  
  return backups;
}

/**
 * Creates a migration result for success
 */
export function successResult(
  recordsProcessed: number,
  recordsUpdated: number,
  duration: number,
  details?: Record<string, unknown>
): MigrationResult {
  return {
    success: true,
    recordsProcessed,
    recordsUpdated,
    duration,
    details,
  };
}

/**
 * Creates a migration result for failure
 */
export function failureResult(
  error: string,
  recordsProcessed: number,
  duration: number
): MigrationResult {
  return {
    success: false,
    error,
    recordsProcessed,
    recordsUpdated: 0,
    duration,
  };
}

/**
 * Measures execution time of an async function
 */
export async function timed<T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = Math.round(performance.now() - start);
  return { result, duration };
}

/**
 * Batch processor for large datasets
 * Processes items in chunks to avoid memory issues
 */
export async function processBatches<T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<R[]>
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await processor(batch);
    results.push(...batchResults);
    
    // Log progress for large datasets
    if (items.length > 100) {
      console.log(`[Migration] Processed ${Math.min(i + batchSize, items.length)}/${items.length}`);
    }
  }
  
  return results;
}
```

### 4.4 Complete V1 to V2 Migration

Update `src/lib/migrations/v1ToV2.ts`:

```typescript
/**
 * @fileoverview Migration from schema v1 to v2
 * @module lib/migrations/v1ToV2
 * 
 * This migration adds Vision-related fields to recordings and steps.
 */

import { db } from '@/background/indexedDB';
import type { Recording, Step, RecordingConditionalDefaults } from '@/types';
import {
  MigrationResult,
  MigrationError,
  successResult,
  failureResult,
  timed,
  processBatches,
} from './migrationUtils';

/**
 * Default values applied during migration
 */
export const V2_DEFAULTS = {
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
 * Migrates a single step to v2 format
 */
function migrateStep(step: any): Step {
  return {
    ...step,
    recordedVia: step.recordedVia ?? V2_DEFAULTS.step.recordedVia,
  };
}

/**
 * Migrates a single recording to v2 format
 */
function migrateRecording(recording: any): Recording {
  const migratedSteps = (recording.steps || []).map(migrateStep);
  
  return {
    ...recording,
    steps: migratedSteps,
    loopStartIndex: recording.loopStartIndex ?? V2_DEFAULTS.recording.loopStartIndex,
    globalDelayMs: recording.globalDelayMs ?? V2_DEFAULTS.recording.globalDelayMs,
    conditionalDefaults: recording.conditionalDefaults ?? {
      ...V2_DEFAULTS.recording.conditionalDefaults,
    },
  };
}

/**
 * Executes the v1 to v2 migration
 * @returns Migration result
 */
export async function migrateV1ToV2(): Promise<MigrationResult> {
  console.log('[Migration v1→v2] Starting...');
  
  const { result, duration } = await timed(async () => {
    try {
      // Get all recordings
      const recordings = await db.recordings.toArray();
      console.log(`[Migration v1→v2] Found ${recordings.length} recordings to migrate`);
      
      if (recordings.length === 0) {
        return { processed: 0, updated: 0 };
      }
      
      let updated = 0;
      
      // Process in batches of 50
      await processBatches(recordings, 50, async (batch) => {
        const updates: { key: number; changes: Partial<Recording> }[] = [];
        
        for (const recording of batch) {
          const migrated = migrateRecording(recording);
          
          // Check if migration actually changed anything
          const needsUpdate =
            recording.loopStartIndex === undefined ||
            recording.globalDelayMs === undefined ||
            !recording.conditionalDefaults ||
            recording.steps?.some((s: any) => !s.recordedVia);
          
          if (needsUpdate && recording.id !== undefined) {
            updates.push({
              key: recording.id,
              changes: {
                loopStartIndex: migrated.loopStartIndex,
                globalDelayMs: migrated.globalDelayMs,
                conditionalDefaults: migrated.conditionalDefaults,
                steps: migrated.steps,
              },
            });
          }
        }
        
        // Bulk update
        for (const { key, changes } of updates) {
          await db.recordings.update(key, changes);
          updated++;
        }
        
        return updates;
      });
      
      console.log(`[Migration v1→v2] Updated ${updated} recordings`);
      return { processed: recordings.length, updated };
      
    } catch (error) {
      console.error('[Migration v1→v2] Error:', error);
      throw new MigrationError(
        error instanceof Error ? error.message : 'Unknown error',
        'migration',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  });
  
  if (result instanceof Error) {
    return failureResult(result.message, 0, duration);
  }
  
  return successResult(result.processed, result.updated, duration, {
    defaults: V2_DEFAULTS,
  });
}

/**
 * Validates that v1 to v2 migration was successful
 * @returns True if all recordings have required v2 fields
 */
export async function validateV1ToV2Migration(): Promise<boolean> {
  try {
    const recordings = await db.recordings.toArray();
    
    for (const recording of recordings) {
      // Check recording-level fields
      if (recording.loopStartIndex === undefined) {
        console.error(`[Validation] Recording ${recording.id}: missing loopStartIndex`);
        return false;
      }
      
      if (recording.globalDelayMs === undefined) {
        console.error(`[Validation] Recording ${recording.id}: missing globalDelayMs`);
        return false;
      }
      
      if (!recording.conditionalDefaults) {
        console.error(`[Validation] Recording ${recording.id}: missing conditionalDefaults`);
        return false;
      }
      
      // Check step-level fields
      for (let i = 0; i < (recording.steps?.length || 0); i++) {
        const step = recording.steps![i];
        if (!step.recordedVia) {
          console.error(`[Validation] Recording ${recording.id}, Step ${i}: missing recordedVia`);
          return false;
        }
      }
    }
    
    console.log(`[Validation] All ${recordings.length} recordings passed v2 validation`);
    return true;
    
  } catch (error) {
    console.error('[Validation] Error during validation:', error);
    return false;
  }
}

/**
 * Gets statistics about what migration would change
 * Useful for dry-run or progress display
 */
export async function analyzeV1ToV2Migration(): Promise<{
  totalRecordings: number;
  recordingsNeedingUpdate: number;
  totalSteps: number;
  stepsNeedingUpdate: number;
}> {
  const recordings = await db.recordings.toArray();
  
  let recordingsNeedingUpdate = 0;
  let totalSteps = 0;
  let stepsNeedingUpdate = 0;
  
  for (const recording of recordings) {
    const needsRecordingUpdate =
      recording.loopStartIndex === undefined ||
      recording.globalDelayMs === undefined ||
      !recording.conditionalDefaults;
    
    if (needsRecordingUpdate) {
      recordingsNeedingUpdate++;
    }
    
    for (const step of recording.steps || []) {
      totalSteps++;
      if (!(step as any).recordedVia) {
        stepsNeedingUpdate++;
      }
    }
  }
  
  return {
    totalRecordings: recordings.length,
    recordingsNeedingUpdate,
    totalSteps,
    stepsNeedingUpdate,
  };
}
```

---

## 5. CODE EXAMPLES

### 5.1 Running Migrations on Startup

```typescript
import { runPendingMigrations, getMigrationStatus } from '@/lib/migrations';

async function initializeApp() {
  const status = getMigrationStatus();
  
  if (!status.isUpToDate) {
    console.log(`Migrating from v${status.currentVersion} to v${status.targetVersion}`);
    
    const result = await runPendingMigrations();
    
    if (result.failed > 0) {
      console.error('Migration failed!', result.results);
      // Show error to user
    } else {
      console.log(`Migration complete: ${result.ran} migrations applied`);
    }
  }
}
```

### 5.2 Analyzing Before Migration

```typescript
import { analyzeV1ToV2Migration } from '@/lib/migrations/v1ToV2';

async function showMigrationPreview() {
  const analysis = await analyzeV1ToV2Migration();
  
  console.log(`
    Migration Preview:
    - Recordings to update: ${analysis.recordingsNeedingUpdate}/${analysis.totalRecordings}
    - Steps to update: ${analysis.stepsNeedingUpdate}/${analysis.totalSteps}
  `);
}
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** `src/lib/migrations/index.ts` exports migration registry
- [ ] **AC-2:** `src/lib/migrations/migrationUtils.ts` provides backup/restore
- [ ] **AC-3:** `migrateV1ToV2()` successfully migrates all recordings
- [ ] **AC-4:** `validateV1ToV2Migration()` verifies migration success
- [ ] **AC-5:** Backup is created before migration starts
- [ ] **AC-6:** Backup is restored on migration failure
- [ ] **AC-7:** Migration handles empty database gracefully
- [ ] **AC-8:** Migration handles large datasets (100+ recordings)
- [ ] **AC-9:** Progress is logged during migration
- [ ] **AC-10:** No data loss during migration

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Atomic operations** - Migration should be all-or-nothing
2. **Backup size limits** - localStorage ~5MB limit
3. **Performance** - Process in batches for large datasets

### Patterns to Follow

1. **Defensive defaults** - Always use ?? for missing values
2. **Validation after migration** - Verify success before committing
3. **Logging throughout** - Detailed logs for debugging

### Edge Cases

1. **No recordings** - Should complete successfully
2. **Partially migrated data** - Handle gracefully
3. **Very large recordings** - Batch processing

---

## 8. VERIFICATION COMMANDS

```bash
# Verify files exist
ls -la src/lib/migrations/

# Run type check
npm run type-check

# Build and test manually
npm run build
# Load extension, check console for migration logs
```

---

## 9. ROLLBACK PROCEDURE

If migration fails:

1. Backup is automatically restored if available
2. User can manually restore from localStorage backup
3. Worst case: User re-imports recordings from exported files

---

## 10. REFERENCES

- DAT-001: IndexedDB Schema v2
- Migration Notes: `/future-spec/07_migration-notes.md`
- [Dexie.js Upgrade](https://dexie.org/docs/Version/Version.upgrade())

---

*End of Specification DAT-002*
