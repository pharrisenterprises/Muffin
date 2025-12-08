# Schema Migration System - Component Breakdown

**Last Updated:** December 7, 2025

---

## Purpose
**What it does:** Migrates legacy recordings (schema v1) to Vision-compatible format (schema v3). Adds defaults for `recordedVia`, `loopStartIndex`, `globalDelayMs`, `conditionalConfig`, and `delaySeconds`. Verifies backward compatibility after migration.

**Where it lives:**
- `src/lib/schemaMigration.ts` - Main migration orchestrator
- `src/lib/migrations/` - Individual migration functions

**Why it exists:** Phase 3 (Vision integration) introduced new fields that didn't exist in Phase 1/2 recordings. This system ensures old recordings remain playable with sensible defaults.

---

## Inputs
| Input | Type | Source | Purpose |
|-------|------|--------|----------|
| recording | `Recording` | IndexedDB | Legacy recording to migrate |
| currentSchema | `number` | `recording.schemaVersion` | Current version (1, 2, or undefined) |

---

## Outputs
| Output | Type | Destination | Content |
|--------|------|-------------|---------|
| migratedRecording | `Recording` | IndexedDB | Updated recording with v3 fields |
| compatibilityReport | `CompatibilityReport` | Logger | Verification results |

**Added Fields:**
- `recordedVia: 'dom'` on all steps (MIG-001)
- `loopStartIndex: 0` on recording (MIG-002)
- `globalDelayMs: 0` on recording (MIG-003)
- `conditionalConfig: null` on all steps (MIG-004)
- `delaySeconds: null` on all steps (MIG-004)
- `schemaVersion: 3` on recording (final marker)

---

## Internal Architecture

### Migration Pipeline
```typescript
// schemaMigration.ts
function migrateRecording(recording: Recording): Recording {
  // Skip if already v3
  if (recording.schemaVersion === 3) {
    return recording;
  }

  let migrated = { ...recording };

  // Stage 1: Add defaults for missing fields
  migrated = migrateRecordedVia(migrated);        // MIG-001
  migrated = migrateLoopStartIndex(migrated);     // MIG-002
  migrated = migrateGlobalDelayMs(migrated);      // MIG-003
  migrated = migrateConditionalDefaults(migrated); // MIG-004

  // Stage 2: Repair invalid values
  migrated = repairLoopStartIndex(migrated);
  migrated = repairGlobalDelayMs(migrated);
  migrated = repairConditionalDefaults(migrated);

  // Stage 3: Update schema version
  migrated.schemaVersion = 3;

  // Stage 4: Verify compatibility
  const report = verifyBackwardCompatibility(recording, migrated); // MIG-005
  if (!report.compatible && isDevelopment) {
    console.warn('Migration compatibility issues:', report);
  }

  return migrated;
}
```

### Individual Migration Functions

#### MIG-001: migrateRecordedVia
```typescript
function migrateRecordedVia(recording: Recording): Recording {
  return {
    ...recording,
    steps: recording.steps.map(step => ({
      ...step,
      recordedVia: step.recordedVia ?? 'dom'  // Default to DOM
    }))
  };
}
```
**Rationale:** All legacy steps used DOM recording (Vision added in Phase 3).

#### MIG-002: migrateLoopStartIndex
```typescript
function migrateLoopStartIndex(recording: Recording): Recording {
  return {
    ...recording,
    loopStartIndex: recording.loopStartIndex ?? 0
  };
}
```
**Rationale:** Original behavior was to loop through all steps for all CSV rows.

#### MIG-003: migrateGlobalDelayMs
```typescript
function migrateGlobalDelayMs(recording: Recording): Recording {
  return {
    ...recording,
    globalDelayMs: recording.globalDelayMs ?? 0
  };
}
```
**Rationale:** Original behavior had no delays between steps.

#### MIG-004: migrateConditionalDefaults
```typescript
function migrateConditionalDefaults(recording: Recording): Recording {
  return {
    ...recording,
    steps: recording.steps.map(step => ({
      ...step,
      conditionalConfig: step.conditionalConfig ?? null,
      delaySeconds: step.delaySeconds ?? null
    }))
  };
}
```
**Rationale:** Conditional clicks and per-step delays are opt-in features (disabled by default).

### Repair Functions

#### repairLoopStartIndex
```typescript
function repairLoopStartIndex(recording: Recording): Recording {
  const maxIndex = recording.steps.length - 1;
  let loopStartIndex = recording.loopStartIndex ?? 0;

  if (loopStartIndex < 0) loopStartIndex = 0;
  if (loopStartIndex > maxIndex) loopStartIndex = maxIndex;

  return { ...recording, loopStartIndex };
}
```
**Validates:** `0 <= loopStartIndex <= steps.length - 1`

#### repairGlobalDelayMs
```typescript
function repairGlobalDelayMs(recording: Recording): Recording {
  let globalDelayMs = recording.globalDelayMs ?? 0;

  if (globalDelayMs < 0) globalDelayMs = 0;
  if (globalDelayMs > 60000) globalDelayMs = 60000;  // 60 second max

  return { ...recording, globalDelayMs };
}
```
**Validates:** `0 <= globalDelayMs <= 60000`

#### repairConditionalDefaults
```typescript
function repairConditionalDefaults(recording: Recording): Recording {
  return {
    ...recording,
    steps: recording.steps.map(step => {
      let conditionalConfig = step.conditionalConfig;
      let delaySeconds = step.delaySeconds;

      // Validate conditionalConfig structure
      if (conditionalConfig && (!conditionalConfig.buttonTexts || !Array.isArray(conditionalConfig.buttonTexts))) {
        conditionalConfig = null;
      }

      // Validate delaySeconds range
      if (delaySeconds !== null) {
        if (delaySeconds < 0) delaySeconds = 0;
        if (delaySeconds > 3600) delaySeconds = 3600;  // 1 hour max
      }

      return { ...step, conditionalConfig, delaySeconds };
    })
  };
}
```

### Compatibility Verification (MIG-005)
```typescript
function verifyBackwardCompatibility(
  original: Recording,
  migrated: Recording
): CompatibilityReport {
  const issues: string[] = [];

  // Check critical fields unchanged
  if (original.id !== migrated.id) issues.push('ID mismatch');
  if (original.name !== migrated.name) issues.push('Name changed');
  if (original.steps.length !== migrated.steps.length) issues.push('Step count changed');

  // Check step IDs preserved
  original.steps.forEach((origStep, i) => {
    if (origStep.id !== migrated.steps[i].id) {
      issues.push(`Step ${i} ID mismatch`);
    }
  });

  // Check playability (DOM steps have path, Vision steps have target)
  migrated.steps.forEach((step, i) => {
    if (step.recordedVia === 'dom' && !step.path) {
      issues.push(`Step ${i} missing DOM path`);
    }
    if (step.recordedVia === 'vision' && !step.target) {
      issues.push(`Step ${i} missing Vision target`);
    }
  });

  return {
    compatible: issues.length === 0,
    issues
  };
}
```

---

## Critical Dependencies
**Upstream:**
- **StorageService** (DAT-003) - Calls `migrateRecording()` on project load
- **PlaybackEngine** (ENG-008) - Uses migrated recordings for playback

**Downstream:**
- **Recording interface** (FND-011) - Schema v3 type definition
- **Step interface** (FND-010) - Field definitions

---

## Hidden Assumptions
1. **Schema Version 1 or undefined** - Treats missing schemaVersion as v1
2. **Idempotency** - Running migration twice has no effect
3. **Immutability** - Original recording not modified (spread operators)
4. **Default preservation** - All defaults preserve original behavior
5. **Field order irrelevant** - Order doesn't matter for compatibility
6. **Step IDs preserved** - Critical for step-specific logic
7. **Development mode warnings** - Compatibility issues logged only in dev
8. **Automatic migration** - Happens on load, not on save

---

## Stability Concerns

### High-Risk Patterns
1. **Data loss risk**
   ```typescript
   // Bug in migration could corrupt recordings
   // No backup mechanism before migration
   ```

2. **Playback breakage risk**
   ```typescript
   // Wrong defaults break existing recordings
   recordedVia: 'vision'  // Instead of 'dom' → Playback fails
   ```

3. **Performance for large recordings**
   ```typescript
   // Recording with 1000+ steps
   // Migration iterates all steps → May delay load
   ```

4. **Verification false positives**
   ```typescript
   // Harmless changes flagged as issues
   // Updated_date changed → Flagged but safe
   ```

### Failure Modes
- **Crash mid-migration** - May leave recording in invalid state (partial migration)
- **Future schema version** - If schemaVersion > 3, skips migration (potential data loss)
- **Circular references** - JSON serialization fails (should never happen but uncaught)
- **Storage quota** - Migrated recording larger than original (may hit quota)

---

## Edge Cases

### Input Variations
1. **No schema version field**
   ```typescript
   recording.schemaVersion === undefined  // Treats as v1
   ```

2. **Future schema version**
   ```typescript
   recording.schemaVersion === 4  // Skips migration (not v1/v2/undefined)
   ```

3. **Empty steps array**
   ```typescript
   recording.steps = []  // Migration works, no steps to iterate
   ```

4. **Partial migration (crash scenario)**
   ```typescript
   // Browser crashes after MIG-001 but before MIG-004
   // Recording may have invalid state (some fields migrated, others not)
   ```

5. **Negative loopStartIndex**
   ```typescript
   recording.loopStartIndex = -5  // Repaired to 0
   ```

6. **Huge globalDelayMs**
   ```typescript
   recording.globalDelayMs = 999999  // Capped to 60000
   ```

7. **Invalid conditionalConfig**
   ```typescript
   step.conditionalConfig = { invalid: true }  // Reset to null
   ```

8. **Null vs undefined**
   ```typescript
   step.delaySeconds = null  // Preserved
   step.delaySeconds = undefined  // Migrated to null
   ```

---

## Developer-Must-Know Notes
- **Runs on load** - Every project load triggers migration check
- **Immutable** - Uses spread operators to avoid mutating original
- **Idempotent** - Safe to run multiple times (schemaVersion check prevents re-migration)
- **Defaults preserve behavior** - All defaults match Phase 1/2 behavior
- **Repair functions critical** - Validate constraints after migration
- **Verification optional** - Only logs warnings in dev mode, doesn't block
- **No rollback** - Once migrated, cannot revert to v1 (one-way operation)
- **Testing strategy:**
  - Unit tests: Each migration function (MIG-001 to MIG-004)
  - Integration tests: Full pipeline + verification (MIG-005)
  - E2E tests: Load legacy recording, playback, verify results

---

## Phase 3 Integration Points

### Strategy Implementation
| Strategy ID | Relevance | Integration Point |
|-------------|-----------|-------------------|
| **MIG-001** | Critical | Adds `recordedVia` field enabling DOM/Vision routing |
| **MIG-002** | High | Adds `loopStartIndex` for CSV loop configuration |
| **MIG-003** | High | Adds `globalDelayMs` for playback timing control |
| **MIG-004** | High | Adds `conditionalConfig` and `delaySeconds` for advanced features |
| **MIG-005** | Critical | Verifies migration didn't break playback compatibility |

### Specification Mapping
- **F1** (Schema Versioning) - Defines migration pipeline for schema evolution
- **G4** (Playback Engine) - Ensures legacy recordings remain playable
- **H3** (Data Integrity) - Verification prevents data corruption

### Evidence References
- Code: `src/lib/schemaMigration.ts` (main pipeline)
- Code: `src/lib/migrations/migrateRecordedVia.ts` (MIG-001)
- Code: `src/lib/migrations/migrateLoopStartIndex.ts` (MIG-002)
- Code: `src/lib/migrations/migrateGlobalDelay.ts` (MIG-003)
- Code: `src/lib/migrations/migrateConditionalDefaults.ts` (MIG-004)
- Code: `src/lib/migrations/verifyBackwardCompatibility.ts` (MIG-005)
- Test: Unit tests for each migration function
- Test: Integration test loading Phase 1 recording and verifying playback

### Integration Risks
1. **Crash Mid-Migration:** Partial migration may leave recording in invalid state (no atomic transaction)
2. **Performance:** Large recordings (1000+ steps) may delay page load during migration
3. **False Positives:** Verification may flag harmless changes as compatibility issues
4. **One-Way Operation:** Cannot revert migrated recordings to v1 (no rollback mechanism)

---

## Related Components
- **Project Repository** (`project-repository_breakdown.md`) - Loads recordings triggering migration
- **Playback Engine** (`test-orchestrator_breakdown.md`) - Consumes migrated recordings
- **Step Executor** (`step-executor_breakdown.md`) - Uses `recordedVia` field added by migration
- **CSV Position Mapping** (`csv-position-mapping_breakdown.md`) - Uses `loopStartIndex` field
