# MIG-002: LoopStartIndex Default Migration

> **Build Card:** MIG-002  
> **Category:** Migration  
> **Dependencies:** FND-011, DAT-002, MIG-001  
> **Risk Level:** Low  
> **Estimated Lines:** 100-120

---

## 1. PURPOSE

Implement the migration logic that adds the `loopStartIndex` field with default value `0` to all existing recordings that lack this field. This ensures backward compatibility when loading legacy recordings created before the CSV loop feature was added. A default of `0` means all steps execute for every CSV row (no skipping), which matches original behavior.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| Recording Interface | `src/types/recording.types.ts` | loopStartIndex field definition |
| DAT-002 Spec | `build-instructions/masterplan/02-data-layer/DAT-002_schema-migration.md` | Migration framework |
| FND-011 Spec | `build-instructions/masterplan/01-foundation/FND-011_recording-interface-extension.md` | Field requirements |
| MIG-001 | `build-instructions/masterplan/07-migration/MIG-001_recorded-via-default.md` | Migration pattern |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/lib/migrations/migrateLoopStartIndex.ts` | CREATE | +50 |
| `src/lib/schemaMigration.ts` | MODIFY | +10 |

### Artifacts

- `migrateLoopStartIndex()` function
- Integration with schema migration pipeline
- Default value assignment logic

---

## 4. DETAILED SPECIFICATION

### 4.1 Migration Function
```typescript
// src/lib/migrations/migrateLoopStartIndex.ts

import { Recording } from '../../types';

/**
 * Default value for loopStartIndex field
 * 0 means all steps run for every row (original behavior)
 */
export const LOOP_START_INDEX_DEFAULT: number = 0;

/**
 * Migrates a recording to include loopStartIndex field
 * 
 * @param recording - The recording to migrate
 * @returns Recording with loopStartIndex field guaranteed
 */
export function migrateLoopStartIndex(recording: Recording): Recording {
  // If already has loopStartIndex, return unchanged
  if (recording.loopStartIndex !== undefined) {
    return recording;
  }

  // Add default loopStartIndex
  return {
    ...recording,
    loopStartIndex: LOOP_START_INDEX_DEFAULT,
  };
}

/**
 * Checks if a recording needs loopStartIndex migration
 * 
 * @param recording - Recording to check
 * @returns true if recording lacks loopStartIndex field
 */
export function needsLoopStartIndexMigration(recording: Recording): boolean {
  return recording.loopStartIndex === undefined;
}

/**
 * Validates loopStartIndex is within valid range
 * 
 * @param recording - Recording to validate
 * @returns true if loopStartIndex is valid
 */
export function isValidLoopStartIndex(recording: Recording): boolean {
  const index = recording.loopStartIndex;
  
  if (index === undefined || index === null) {
    return false;
  }
  
  if (typeof index !== 'number' || !Number.isInteger(index)) {
    return false;
  }
  
  if (index < 0) {
    return false;
  }
  
  // Can't be greater than steps length
  if (index > recording.steps.length) {
    return false;
  }
  
  return true;
}

/**
 * Repairs invalid loopStartIndex values
 * 
 * @param recording - Recording to repair
 * @returns Recording with valid loopStartIndex
 */
export function repairLoopStartIndex(recording: Recording): Recording {
  if (isValidLoopStartIndex(recording)) {
    return recording;
  }
  
  const index = recording.loopStartIndex;
  
  // If undefined or null, use default
  if (index === undefined || index === null) {
    return { ...recording, loopStartIndex: LOOP_START_INDEX_DEFAULT };
  }
  
  // If negative, reset to 0
  if (typeof index === 'number' && index < 0) {
    return { ...recording, loopStartIndex: 0 };
  }
  
  // If beyond steps length, cap to last step
  if (typeof index === 'number' && index > recording.steps.length) {
    return { ...recording, loopStartIndex: Math.max(0, recording.steps.length - 1) };
  }
  
  // Fallback to default
  return { ...recording, loopStartIndex: LOOP_START_INDEX_DEFAULT };
}
```

### 4.2 Integration with Schema Migration
```typescript
// In src/lib/schemaMigration.ts

import { migrateLoopStartIndex, repairLoopStartIndex } from './migrations/migrateLoopStartIndex';

/**
 * Main migration function for recordings
 */
export function migrateRecording(recording: Recording): Recording {
  // ... existing validation ...

  // Clone to avoid mutation
  let migrated = { ...recording };

  // Apply step-level migrations (MIG-001)
  migrated.steps = migrateAllStepsRecordedVia(recording.steps);

  // Apply recording-level migrations
  migrated = migrateLoopStartIndex(migrated);
  migrated = repairLoopStartIndex(migrated); // Fix invalid values

  // Apply other migrations (MIG-003, MIG-004)
  // ...

  // Update schema version
  migrated.schemaVersion = CURRENT_SCHEMA_VERSION;
  migrated.updatedAt = Date.now();

  return migrated;
}
```

---

## 5. MIGRATION RULES

### 5.1 Default Value Logic

| Condition | Default Value | Rationale |
|-----------|---------------|-----------|
| Recording has no `loopStartIndex` | `0` | All steps run for every row (original behavior) |
| Recording has `loopStartIndex: 0` | Keep `0` | Already correct |
| Recording has valid `loopStartIndex` | Keep value | User configured |
| Recording has negative `loopStartIndex` | Reset to `0` | Invalid, repair |
| Recording has `loopStartIndex > steps.length` | Cap to last step | Invalid, repair |

### 5.2 Behavior Preservation
```
Original behavior (no loopStartIndex):
  Row 1: Run steps 1, 2, 3, 4
  Row 2: Run steps 1, 2, 3, 4
  Row 3: Run steps 1, 2, 3, 4

With loopStartIndex = 0 (default):
  Row 1: Run steps 1, 2, 3, 4  ← Same
  Row 2: Run steps 1, 2, 3, 4  ← Same
  Row 3: Run steps 1, 2, 3, 4  ← Same

Behavior is identical - backward compatible!
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** Recordings without `loopStartIndex` get default `0`
- [ ] **AC-2:** Recordings with existing `loopStartIndex` are unchanged
- [ ] **AC-3:** Negative values are repaired to `0`
- [ ] **AC-4:** Values exceeding steps.length are capped
- [ ] **AC-5:** Migration doesn't mutate original recording
- [ ] **AC-6:** Migration is idempotent
- [ ] **AC-7:** Validation function works correctly
- [ ] **AC-8:** Repair function fixes all invalid cases
- [ ] **AC-9:** Integration with schemaMigration works
- [ ] **AC-10:** Original playback behavior preserved

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Immutability** - Never mutate original objects
2. **Idempotency** - Safe to run multiple times
3. **Behavior preservation** - Default must match original behavior

### Patterns to Follow

1. **Nullish coalescing** - Use `??` for defaults
2. **Validation before repair** - Check, then fix
3. **Range clamping** - Keep within valid bounds

### Edge Cases

1. **Empty steps array** - loopStartIndex 0 is valid
2. **Single step** - loopStartIndex 0 or 1 valid
3. **Float value** - Round or reject
4. **String value** - Parse or reset to default

---

## 8. VERIFICATION COMMANDS
```bash
# Verify file creation
ls -la src/lib/migrations/migrateLoopStartIndex.ts

# Verify exports
grep -n "migrateLoopStartIndex\|repairLoopStartIndex" src/lib/migrations/migrateLoopStartIndex.ts

# Verify integration
grep -n "migrateLoopStartIndex" src/lib/schemaMigration.ts

# Run tests
npm run test -- migrateLoopStartIndex

# Run type check
npm run type-check
```

---

## 9. ROLLBACK PROCEDURE
```bash
# Remove migration file
rm src/lib/migrations/migrateLoopStartIndex.ts

# Revert schema migration changes
git checkout src/lib/schemaMigration.ts
```

---

## 10. REFERENCES

- FND-011: Recording Interface Extension
- DAT-002: Schema Migration
- MIG-001: RecordedVia Default Migration
- TST-008: Schema Migration Tests

---

*End of Specification MIG-002*
