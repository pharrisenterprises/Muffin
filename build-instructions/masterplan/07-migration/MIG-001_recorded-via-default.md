# MIG-001: RecordedVia Default Migration

> **Build Card:** MIG-001  
> **Category:** Migration  
> **Dependencies:** FND-010, DAT-002  
> **Risk Level:** Low  
> **Estimated Lines:** 120-150

---

## 1. PURPOSE

Implement the migration logic that adds the `recordedVia` field with default value `'dom'` to all existing steps that lack this field. This ensures backward compatibility when loading legacy recordings created before Vision features were added. All existing steps are assumed to be DOM-based since Vision recording didn't exist previously.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| Step Interface | `src/types/step.types.ts` | recordedVia field definition |
| DAT-002 Spec | `build-instructions/masterplan/02-data-layer/DAT-002_schema-migration.md` | Migration framework |
| FND-010 Spec | `build-instructions/masterplan/01-foundation/FND-010_step-interface-extension.md` | Field requirements |
| Storage Service | `src/lib/storageService.ts` | Where recordings are stored |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/lib/migrations/migrateRecordedVia.ts` | CREATE | +60 |
| `src/lib/schemaMigration.ts` | MODIFY | +15 |

### Artifacts

- `migrateRecordedVia()` function
- Integration with schema migration pipeline
- Default value assignment logic

---

## 4. DETAILED SPECIFICATION

### 4.1 Migration Function
```typescript
// src/lib/migrations/migrateRecordedVia.ts

import { Step, RecordedVia } from '../../types';

/**
 * Default value for recordedVia field
 * All legacy steps are assumed to be DOM-based
 */
export const RECORDED_VIA_DEFAULT: RecordedVia = 'dom';

/**
 * Migrates a single step to include recordedVia field
 * 
 * @param step - The step to migrate
 * @returns Step with recordedVia field guaranteed
 */
export function migrateStepRecordedVia(step: Step): Step {
  // If already has recordedVia, return unchanged
  if (step.recordedVia !== undefined) {
    return step;
  }

  // Add default recordedVia
  return {
    ...step,
    recordedVia: RECORDED_VIA_DEFAULT,
  };
}

/**
 * Migrates all steps in a recording to include recordedVia
 * 
 * @param steps - Array of steps to migrate
 * @returns Array of steps with recordedVia field guaranteed
 */
export function migrateAllStepsRecordedVia(steps: Step[]): Step[] {
  if (!Array.isArray(steps)) {
    return [];
  }

  return steps.map(step => migrateStepRecordedVia(step));
}

/**
 * Checks if a step needs recordedVia migration
 * 
 * @param step - Step to check
 * @returns true if step lacks recordedVia field
 */
export function needsRecordedViaMigration(step: Step): boolean {
  return step.recordedVia === undefined;
}

/**
 * Checks if any steps in array need migration
 * 
 * @param steps - Array of steps to check
 * @returns true if any step lacks recordedVia
 */
export function stepsNeedRecordedViaMigration(steps: Step[]): boolean {
  if (!Array.isArray(steps) || steps.length === 0) {
    return false;
  }

  return steps.some(step => needsRecordedViaMigration(step));
}
```

### 4.2 Integration with Schema Migration
```typescript
// In src/lib/schemaMigration.ts

import { migrateAllStepsRecordedVia } from './migrations/migrateRecordedVia';

/**
 * Main migration function for recordings
 */
export function migrateRecording(recording: Recording): Recording {
  if (!recording || !recording.id) {
    throw new Error('Invalid recording: null or undefined');
  }

  if (!Array.isArray(recording.steps)) {
    throw new Error('Invalid recording: steps must be an array');
  }

  // Clone to avoid mutation
  const migrated = { ...recording };

  // Apply step-level migrations
  migrated.steps = migrateAllStepsRecordedVia(recording.steps);

  // Apply other migrations (MIG-002, MIG-003, MIG-004)
  // ...

  // Update schema version
  migrated.schemaVersion = CURRENT_SCHEMA_VERSION;
  migrated.updatedAt = Date.now();

  return migrated;
}
```

### 4.3 Storage Service Integration
```typescript
// In src/lib/storageService.ts

import { migrateRecording } from './schemaMigration';

/**
 * Loads a recording and applies migrations if needed
 */
export async function loadRecording(id: string): Promise<Recording> {
  const raw = await chrome.storage.local.get(id);
  const recording = raw[id] as Recording;

  if (!recording) {
    throw new Error(`Recording not found: ${id}`);
  }

  // Apply migrations
  const migrated = migrateRecording(recording);

  // If migrated, save back to storage
  if (migrated.schemaVersion !== recording.schemaVersion) {
    await saveRecording(migrated);
  }

  return migrated;
}
```

### 4.4 Type Guard
```typescript
// In src/types/step.types.ts or src/lib/migrations/migrateRecordedVia.ts

/**
 * Type guard to check if step has recordedVia
 */
export function hasRecordedVia(
  step: Step
): step is Step & { recordedVia: RecordedVia } {
  return step.recordedVia !== undefined;
}

/**
 * Asserts step has recordedVia after migration
 */
export function assertRecordedVia(step: Step): asserts step is Step & { recordedVia: RecordedVia } {
  if (step.recordedVia === undefined) {
    throw new Error('Step missing recordedVia after migration');
  }
}
```

---

## 5. MIGRATION RULES

### 5.1 Default Value Logic

| Condition | Default Value | Rationale |
|-----------|---------------|-----------|
| Step has no `recordedVia` | `'dom'` | All legacy steps used DOM recording |
| Step has `recordedVia: 'dom'` | Keep `'dom'` | Already correct |
| Step has `recordedVia: 'vision'` | Keep `'vision'` | Already migrated |

### 5.2 Migration Triggers

The migration runs when:
1. Recording is loaded from storage
2. Recording is imported from file
3. Recording is received via message passing
4. Explicit migration is triggered by user

### 5.3 Migration Safety
```typescript
// Safe migration pattern - never lose data
function safeMigrateStep(step: Step): Step {
  try {
    return migrateStepRecordedVia(step);
  } catch (error) {
    console.error('Step migration failed:', error);
    // Return original step rather than losing it
    return step;
  }
}
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** Steps without `recordedVia` get default `'dom'`
- [ ] **AC-2:** Steps with existing `recordedVia` are unchanged
- [ ] **AC-3:** Migration doesn't mutate original step objects
- [ ] **AC-4:** Empty steps array handled gracefully
- [ ] **AC-5:** Invalid step objects handled (null in array)
- [ ] **AC-6:** Migration is idempotent (safe to run multiple times)
- [ ] **AC-7:** Type guard correctly identifies migrated steps
- [ ] **AC-8:** Integration with loadRecording works
- [ ] **AC-9:** Migrated recordings save with new schema version
- [ ] **AC-10:** No data loss during migration

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Immutability** - Never mutate original objects
2. **Idempotency** - Safe to run multiple times
3. **Backward compatibility** - Old recordings must work

### Patterns to Follow

1. **Nullish coalescing** - Use `??` for defaults
2. **Spread operator** - Clone before modifying
3. **Early return** - Skip if already migrated

### Edge Cases

1. **Undefined step** - Skip or throw
2. **Null recordedVia** - Treat as undefined
3. **Invalid recordedVia value** - Reset to default
4. **Empty string recordedVia** - Reset to default

---

## 8. VERIFICATION COMMANDS
```bash
# Verify file creation
ls -la src/lib/migrations/migrateRecordedVia.ts

# Verify exports
grep -n "migrateStepRecordedVia\|migrateAllStepsRecordedVia" src/lib/migrations/migrateRecordedVia.ts

# Verify integration
grep -n "migrateAllStepsRecordedVia" src/lib/schemaMigration.ts

# Run tests
npm run test -- migrateRecordedVia

# Run type check
npm run type-check
```

---

## 9. ROLLBACK PROCEDURE
```bash
# Remove migration file
rm src/lib/migrations/migrateRecordedVia.ts

# Revert schema migration changes
git checkout src/lib/schemaMigration.ts

# Revert storage service changes
git checkout src/lib/storageService.ts
```

---

## 10. REFERENCES

- FND-010: Step Interface Extension
- DAT-002: Schema Migration
- TST-008: Schema Migration Tests
- MIG-002: LoopStartIndex Default (next migration)

---

*End of Specification MIG-001*
