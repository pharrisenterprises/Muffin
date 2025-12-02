# MIG-003: GlobalDelayMs Default Migration

> **Build Card:** MIG-003  
> **Category:** Migration  
> **Dependencies:** FND-011, DAT-002, MIG-002  
> **Risk Level:** Low  
> **Estimated Lines:** 90-110

---

## 1. PURPOSE

Implement the migration logic that adds the `globalDelayMs` field with default value `0` to all existing recordings that lack this field. This ensures backward compatibility when loading legacy recordings created before the global delay feature was added. A default of `0` means no delay between steps, which matches original behavior where steps executed as fast as possible.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| Recording Interface | `src/types/recording.types.ts` | globalDelayMs field definition |
| DAT-002 Spec | `build-instructions/masterplan/02-data-layer/DAT-002_schema-migration.md` | Migration framework |
| FND-011 Spec | `build-instructions/masterplan/01-foundation/FND-011_recording-interface-extension.md` | Field requirements |
| MIG-002 | `build-instructions/masterplan/07-migration/MIG-002_loop-start-index-default.md` | Migration pattern |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/lib/migrations/migrateGlobalDelay.ts` | CREATE | +45 |
| `src/lib/schemaMigration.ts` | MODIFY | +8 |

### Artifacts

- `migrateGlobalDelayMs()` function
- Integration with schema migration pipeline
- Default value assignment logic

---

## 4. DETAILED SPECIFICATION

### 4.1 Migration Function

```typescript
// src/lib/migrations/migrateGlobalDelay.ts

import { Recording } from '../../types';

/**
 * Default value for globalDelayMs field
 * 0 means no delay between steps (original behavior)
 */
export const GLOBAL_DELAY_MS_DEFAULT: number = 0;

/**
 * Maximum allowed delay in milliseconds (1 minute)
 */
export const GLOBAL_DELAY_MS_MAX: number = 60000;

/**
 * Migrates a recording to include globalDelayMs field
 * 
 * @param recording - The recording to migrate
 * @returns Recording with globalDelayMs field guaranteed
 */
export function migrateGlobalDelayMs(recording: Recording): Recording {
  // If already has globalDelayMs, return unchanged
  if (recording.globalDelayMs !== undefined) {
    return recording;
  }

  // Add default globalDelayMs
  return {
    ...recording,
    globalDelayMs: GLOBAL_DELAY_MS_DEFAULT,
  };
}

/**
 * Checks if a recording needs globalDelayMs migration
 * 
 * @param recording - Recording to check
 * @returns true if recording lacks globalDelayMs field
 */
export function needsGlobalDelayMsMigration(recording: Recording): boolean {
  return recording.globalDelayMs === undefined;
}

/**
 * Validates globalDelayMs is within valid range
 * 
 * @param recording - Recording to validate
 * @returns true if globalDelayMs is valid
 */
export function isValidGlobalDelayMs(recording: Recording): boolean {
  const delay = recording.globalDelayMs;
  
  if (delay === undefined || delay === null) {
    return false;
  }
  
  if (typeof delay !== 'number') {
    return false;
  }
  
  if (delay < 0) {
    return false;
  }
  
  if (delay > GLOBAL_DELAY_MS_MAX) {
    return false;
  }
  
  return true;
}

/**
 * Repairs invalid globalDelayMs values
 * 
 * @param recording - Recording to repair
 * @returns Recording with valid globalDelayMs
 */
export function repairGlobalDelayMs(recording: Recording): Recording {
  if (isValidGlobalDelayMs(recording)) {
    return recording;
  }
  
  const delay = recording.globalDelayMs;
  
  // If undefined or null, use default
  if (delay === undefined || delay === null) {
    return { ...recording, globalDelayMs: GLOBAL_DELAY_MS_DEFAULT };
  }
  
  // If negative, reset to 0
  if (typeof delay === 'number' && delay < 0) {
    return { ...recording, globalDelayMs: 0 };
  }
  
  // If exceeds maximum, cap to max
  if (typeof delay === 'number' && delay > GLOBAL_DELAY_MS_MAX) {
    return { ...recording, globalDelayMs: GLOBAL_DELAY_MS_MAX };
  }
  
  // If not a number, reset to default
  if (typeof delay !== 'number') {
    return { ...recording, globalDelayMs: GLOBAL_DELAY_MS_DEFAULT };
  }
  
  // Fallback to default
  return { ...recording, globalDelayMs: GLOBAL_DELAY_MS_DEFAULT };
}
```

### 4.2 Integration with Schema Migration

```typescript
// In src/lib/schemaMigration.ts

import { migrateGlobalDelayMs, repairGlobalDelayMs } from './migrations/migrateGlobalDelay';

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
  migrated = repairLoopStartIndex(migrated);
  migrated = migrateGlobalDelayMs(migrated);
  migrated = repairGlobalDelayMs(migrated);

  // Apply other migrations (MIG-004)
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
| Recording has no `globalDelayMs` | `0` | No delay (original behavior) |
| Recording has `globalDelayMs: 0` | Keep `0` | Already correct |
| Recording has valid `globalDelayMs` | Keep value | User configured |
| Recording has negative `globalDelayMs` | Reset to `0` | Invalid, repair |
| Recording has `globalDelayMs > 60000` | Cap to `60000` | Exceeds max, cap |

### 5.2 Behavior Preservation

```
Original behavior (no globalDelayMs):
  Step 1 → Step 2 → Step 3 → Step 4
  (no delays between steps)

With globalDelayMs = 0 (default):
  Step 1 → Step 2 → Step 3 → Step 4
  (no delays between steps - identical!)

Behavior is identical - backward compatible!
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** Recordings without `globalDelayMs` get default `0`
- [ ] **AC-2:** Recordings with existing `globalDelayMs` are unchanged
- [ ] **AC-3:** Negative values are repaired to `0`
- [ ] **AC-4:** Values exceeding 60000 are capped
- [ ] **AC-5:** Migration doesn't mutate original recording
- [ ] **AC-6:** Migration is idempotent
- [ ] **AC-7:** Validation function works correctly
- [ ] **AC-8:** Repair function fixes all invalid cases
- [ ] **AC-9:** Integration with schemaMigration works
- [ ] **AC-10:** Original playback behavior preserved (no delays)

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Immutability** - Never mutate original objects
2. **Idempotency** - Safe to run multiple times
3. **Behavior preservation** - Default 0 = no delay = original behavior

### Patterns to Follow

1. **Nullish coalescing** - Use `??` for defaults
2. **Range clamping** - Keep within 0 to 60000
3. **Type checking** - Ensure number type

### Edge Cases

1. **Float value** - Accept (will be used as-is in setTimeout)
2. **Very small value** - Accept (e.g., 1ms is valid)
3. **String value** - Parse or reset to default
4. **NaN** - Reset to default

---

## 8. VERIFICATION COMMANDS

```bash
# Verify file creation
ls -la src/lib/migrations/migrateGlobalDelay.ts

# Verify exports
grep -n "migrateGlobalDelayMs\|repairGlobalDelayMs" src/lib/migrations/migrateGlobalDelay.ts

# Verify integration
grep -n "migrateGlobalDelayMs" src/lib/schemaMigration.ts

# Run tests
npm run test -- migrateGlobalDelay

# Run type check
npm run type-check
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Remove migration file
rm src/lib/migrations/migrateGlobalDelay.ts

# Revert schema migration changes
git checkout src/lib/schemaMigration.ts
```

---

## 10. REFERENCES

- FND-011: Recording Interface Extension
- DAT-002: Schema Migration
- MIG-002: LoopStartIndex Default Migration
- TST-008: Schema Migration Tests

---

*End of Specification MIG-003*
