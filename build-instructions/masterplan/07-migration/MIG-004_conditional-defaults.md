# MIG-004: Conditional Config Defaults Migration

> **Build Card:** MIG-004  
> **Category:** Migration  
> **Dependencies:** FND-010, DAT-002, MIG-003  
> **Risk Level:** Low  
> **Estimated Lines:** 100-130

---

## 1. PURPOSE

Implement the migration logic that adds the `conditionalConfig` and `delaySeconds` fields with default value `null` to all existing steps that lack these fields. This ensures backward compatibility when loading legacy recordings created before conditional click and per-step delay features were added. A default of `null` means these features are disabled, preserving original step behavior.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| Step Interface | `src/types/step.types.ts` | conditionalConfig, delaySeconds fields |
| ConditionalClickConfig | `src/types/vision.types.ts` | Config interface |
| DAT-002 Spec | `build-instructions/masterplan/02-data-layer/DAT-002_schema-migration.md` | Migration framework |
| FND-010 Spec | `build-instructions/masterplan/01-foundation/FND-010_step-interface-extension.md` | Field requirements |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/lib/migrations/migrateConditionalDefaults.ts` | CREATE | +70 |
| `src/lib/schemaMigration.ts` | MODIFY | +10 |

### Artifacts

- `migrateStepConditionalDefaults()` function
- `migrateAllStepsConditionalDefaults()` function
- Integration with schema migration pipeline

---

## 4. DETAILED SPECIFICATION

### 4.1 Migration Function

```typescript
// src/lib/migrations/migrateConditionalDefaults.ts

import { Step, ConditionalClickConfig } from '../../types';

/**
 * Default value for conditionalConfig field
 * null means conditional click is not enabled for this step
 */
export const CONDITIONAL_CONFIG_DEFAULT: ConditionalClickConfig | null = null;

/**
 * Default value for delaySeconds field
 * null means no per-step delay (use global delay if set)
 */
export const DELAY_SECONDS_DEFAULT: number | null = null;

/**
 * Migrates a single step to include conditionalConfig and delaySeconds fields
 * 
 * @param step - The step to migrate
 * @returns Step with conditionalConfig and delaySeconds fields guaranteed
 */
export function migrateStepConditionalDefaults(step: Step): Step {
  let needsMigration = false;
  const updates: Partial<Step> = {};

  // Check conditionalConfig
  if (step.conditionalConfig === undefined) {
    updates.conditionalConfig = CONDITIONAL_CONFIG_DEFAULT;
    needsMigration = true;
  }

  // Check delaySeconds
  if (step.delaySeconds === undefined) {
    updates.delaySeconds = DELAY_SECONDS_DEFAULT;
    needsMigration = true;
  }

  // If no migration needed, return original
  if (!needsMigration) {
    return step;
  }

  // Return migrated step
  return {
    ...step,
    ...updates,
  };
}

/**
 * Migrates all steps in a recording to include conditional defaults
 * 
 * @param steps - Array of steps to migrate
 * @returns Array of steps with conditional fields guaranteed
 */
export function migrateAllStepsConditionalDefaults(steps: Step[]): Step[] {
  if (!Array.isArray(steps)) {
    return [];
  }

  return steps.map(step => migrateStepConditionalDefaults(step));
}

/**
 * Checks if a step needs conditional defaults migration
 * 
 * @param step - Step to check
 * @returns true if step lacks conditionalConfig or delaySeconds
 */
export function needsConditionalDefaultsMigration(step: Step): boolean {
  return (
    step.conditionalConfig === undefined ||
    step.delaySeconds === undefined
  );
}

/**
 * Checks if any steps in array need migration
 * 
 * @param steps - Array of steps to check
 * @returns true if any step needs migration
 */
export function stepsNeedConditionalDefaultsMigration(steps: Step[]): boolean {
  if (!Array.isArray(steps) || steps.length === 0) {
    return false;
  }

  return steps.some(step => needsConditionalDefaultsMigration(step));
}

/**
 * Validates conditionalConfig structure if present
 * 
 * @param config - Config to validate
 * @returns true if config is valid or null
 */
export function isValidConditionalConfig(
  config: ConditionalClickConfig | null | undefined
): boolean {
  // null is valid (disabled)
  if (config === null) {
    return true;
  }

  // undefined is invalid (needs migration)
  if (config === undefined) {
    return false;
  }

  // Validate required fields
  if (!Array.isArray(config.buttonTexts) || config.buttonTexts.length === 0) {
    return false;
  }

  if (typeof config.timeoutSeconds !== 'number' || config.timeoutSeconds <= 0) {
    return false;
  }

  if (typeof config.pollIntervalMs !== 'number' || config.pollIntervalMs <= 0) {
    return false;
  }

  if (typeof config.confidenceThreshold !== 'number' || 
      config.confidenceThreshold < 0 || 
      config.confidenceThreshold > 1) {
    return false;
  }

  return true;
}

/**
 * Repairs invalid conditionalConfig
 * 
 * @param step - Step to repair
 * @returns Step with valid conditionalConfig (or null)
 */
export function repairConditionalConfig(step: Step): Step {
  // If undefined, set to null
  if (step.conditionalConfig === undefined) {
    return { ...step, conditionalConfig: null };
  }

  // If null, it's valid
  if (step.conditionalConfig === null) {
    return step;
  }

  // If invalid config, reset to null
  if (!isValidConditionalConfig(step.conditionalConfig)) {
    console.warn('Invalid conditionalConfig detected, resetting to null:', step.id);
    return { ...step, conditionalConfig: null };
  }

  return step;
}

/**
 * Validates delaySeconds value
 * 
 * @param delay - Delay value to validate
 * @returns true if valid
 */
export function isValidDelaySeconds(delay: number | null | undefined): boolean {
  // null is valid (no delay)
  if (delay === null) {
    return true;
  }

  // undefined is invalid (needs migration)
  if (delay === undefined) {
    return false;
  }

  // Must be a non-negative number
  if (typeof delay !== 'number' || delay < 0) {
    return false;
  }

  // Cap at reasonable max (1 hour)
  if (delay > 3600) {
    return false;
  }

  return true;
}

/**
 * Repairs invalid delaySeconds
 * 
 * @param step - Step to repair
 * @returns Step with valid delaySeconds (or null)
 */
export function repairDelaySeconds(step: Step): Step {
  const delay = step.delaySeconds;

  // If undefined, set to null
  if (delay === undefined) {
    return { ...step, delaySeconds: null };
  }

  // If null, it's valid
  if (delay === null) {
    return step;
  }

  // If negative, set to null
  if (typeof delay === 'number' && delay < 0) {
    return { ...step, delaySeconds: null };
  }

  // If exceeds max, cap to max
  if (typeof delay === 'number' && delay > 3600) {
    return { ...step, delaySeconds: 3600 };
  }

  // If not a number, set to null
  if (typeof delay !== 'number') {
    return { ...step, delaySeconds: null };
  }

  return step;
}
```

### 4.2 Integration with Schema Migration

```typescript
// In src/lib/schemaMigration.ts

import { 
  migrateAllStepsConditionalDefaults,
  repairConditionalConfig,
  repairDelaySeconds,
} from './migrations/migrateConditionalDefaults';

/**
 * Main migration function for recordings
 */
export function migrateRecording(recording: Recording): Recording {
  // ... existing validation ...

  // Clone to avoid mutation
  let migrated = { ...recording };

  // Apply step-level migrations
  migrated.steps = migrateAllStepsRecordedVia(recording.steps);
  migrated.steps = migrateAllStepsConditionalDefaults(migrated.steps);
  
  // Repair any invalid step values
  migrated.steps = migrated.steps.map(step => {
    let repairedStep = repairConditionalConfig(step);
    repairedStep = repairDelaySeconds(repairedStep);
    return repairedStep;
  });

  // Apply recording-level migrations
  migrated = migrateLoopStartIndex(migrated);
  migrated = repairLoopStartIndex(migrated);
  migrated = migrateGlobalDelayMs(migrated);
  migrated = repairGlobalDelayMs(migrated);

  // Update schema version
  migrated.schemaVersion = CURRENT_SCHEMA_VERSION;
  migrated.updatedAt = Date.now();

  return migrated;
}
```

---

## 5. MIGRATION RULES

### 5.1 Default Value Logic

| Field | Condition | Default Value | Rationale |
|-------|-----------|---------------|-----------|
| `conditionalConfig` | undefined | `null` | Feature disabled |
| `conditionalConfig` | null | Keep `null` | Already correct |
| `conditionalConfig` | valid object | Keep object | User configured |
| `conditionalConfig` | invalid object | Reset to `null` | Repair invalid |
| `delaySeconds` | undefined | `null` | No per-step delay |
| `delaySeconds` | null | Keep `null` | Already correct |
| `delaySeconds` | valid number | Keep number | User configured |
| `delaySeconds` | negative | Reset to `null` | Repair invalid |
| `delaySeconds` | > 3600 | Cap to `3600` | Exceeds max |

### 5.2 Behavior Preservation

```
Original behavior (no conditionalConfig or delaySeconds):
  Step executes immediately with DOM selector

With conditionalConfig = null, delaySeconds = null (defaults):
  Step executes immediately with DOM selector
  (identical behavior - backward compatible!)
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** Steps without `conditionalConfig` get default `null`
- [ ] **AC-2:** Steps without `delaySeconds` get default `null`
- [ ] **AC-3:** Existing valid values are preserved
- [ ] **AC-4:** Invalid conditionalConfig is repaired to `null`
- [ ] **AC-5:** Negative delaySeconds is repaired to `null`
- [ ] **AC-6:** delaySeconds > 3600 is capped
- [ ] **AC-7:** Migration doesn't mutate original steps
- [ ] **AC-8:** Migration is idempotent
- [ ] **AC-9:** Validation functions work correctly
- [ ] **AC-10:** Original step behavior preserved

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Immutability** - Never mutate original objects
2. **Idempotency** - Safe to run multiple times
3. **Null vs Undefined** - null = disabled, undefined = needs migration

### Patterns to Follow

1. **Explicit null** - Use null for "disabled" state
2. **Validation before repair** - Check validity first
3. **Conservative repair** - Reset to null rather than guess

### Edge Cases

1. **Empty buttonTexts array** - Invalid config, reset to null
2. **Zero timeout** - Invalid config, reset to null
3. **Zero pollInterval** - Invalid config, reset to null
4. **Confidence outside 0-1** - Invalid config, reset to null

---

## 8. VERIFICATION COMMANDS

```bash
# Verify file creation
ls -la src/lib/migrations/migrateConditionalDefaults.ts

# Verify exports
grep -n "migrateStepConditionalDefaults\|migrateAllStepsConditionalDefaults" src/lib/migrations/migrateConditionalDefaults.ts

# Verify integration
grep -n "migrateAllStepsConditionalDefaults" src/lib/schemaMigration.ts

# Run tests
npm run test -- migrateConditionalDefaults

# Run type check
npm run type-check
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Remove migration file
rm src/lib/migrations/migrateConditionalDefaults.ts

# Revert schema migration changes
git checkout src/lib/schemaMigration.ts
```

---

## 10. REFERENCES

- FND-010: Step Interface Extension
- DAT-002: Schema Migration
- MIG-003: GlobalDelayMs Default Migration
- TST-008: Schema Migration Tests

---

*End of Specification MIG-004*
