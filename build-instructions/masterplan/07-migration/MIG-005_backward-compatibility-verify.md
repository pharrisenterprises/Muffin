# MIG-005: Backward Compatibility Verification

> **Build Card:** MIG-005  
> **Category:** Migration  
> **Dependencies:** MIG-001, MIG-002, MIG-003, MIG-004  
> **Risk Level:** Medium  
> **Estimated Lines:** 150-180

---

## 1. PURPOSE

Implement verification logic that confirms backward compatibility after all migrations have been applied. This includes validating that migrated recordings can be played back correctly, that legacy recordings produce identical behavior to their original execution, and that no data is lost during migration. This is the final safety check before releasing Vision features.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| MIG-001 to MIG-004 | `build-instructions/masterplan/07-migration/` | All migration specs |
| TST-008 | `build-instructions/masterplan/06-testing/TST-008_schema-migration-test.md` | Migration tests |
| Recording Interface | `src/types/recording.types.ts` | Full interface |
| Step Interface | `src/types/step.types.ts` | Full interface |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/lib/migrations/verifyBackwardCompatibility.ts` | CREATE | +120 |
| `src/lib/schemaMigration.ts` | MODIFY | +15 |

### Artifacts

- `verifyBackwardCompatibility()` function
- `verifyRecordingIntegrity()` function
- `verifyStepPlayability()` function
- Compatibility report generator

---

## 4. DETAILED SPECIFICATION

### 4.1 Verification Functions

```typescript
// src/lib/migrations/verifyBackwardCompatibility.ts

import { Recording, Step } from '../../types';

/**
 * Result of backward compatibility verification
 */
export interface CompatibilityReport {
  /** Overall pass/fail status */
  compatible: boolean;
  
  /** Recording-level issues */
  recordingIssues: CompatibilityIssue[];
  
  /** Step-level issues (by step ID) */
  stepIssues: Map<string, CompatibilityIssue[]>;
  
  /** Warnings (non-blocking) */
  warnings: string[];
  
  /** Schema version before migration */
  originalVersion: number;
  
  /** Schema version after migration */
  migratedVersion: number;
  
  /** Timestamp of verification */
  verifiedAt: number;
}

/**
 * Individual compatibility issue
 */
export interface CompatibilityIssue {
  /** Issue severity */
  severity: 'error' | 'warning';
  
  /** Issue code for programmatic handling */
  code: string;
  
  /** Human-readable message */
  message: string;
  
  /** Field that caused the issue */
  field?: string;
  
  /** Original value */
  originalValue?: any;
  
  /** Migrated value */
  migratedValue?: any;
}

/**
 * Verifies backward compatibility of a migrated recording
 * 
 * @param original - Original recording before migration
 * @param migrated - Recording after migration
 * @returns Compatibility report
 */
export function verifyBackwardCompatibility(
  original: Recording,
  migrated: Recording
): CompatibilityReport {
  const report: CompatibilityReport = {
    compatible: true,
    recordingIssues: [],
    stepIssues: new Map(),
    warnings: [],
    originalVersion: original.schemaVersion ?? 1,
    migratedVersion: migrated.schemaVersion,
    verifiedAt: Date.now(),
  };

  // Verify recording-level fields
  verifyRecordingFields(original, migrated, report);

  // Verify each step
  verifySteps(original.steps, migrated.steps, report);

  // Verify playability
  verifyPlayability(migrated, report);

  // Set overall compatibility based on errors
  report.compatible = report.recordingIssues.every(i => i.severity !== 'error') &&
    Array.from(report.stepIssues.values()).every(issues => 
      issues.every(i => i.severity !== 'error')
    );

  return report;
}

/**
 * Verifies recording-level fields preserved
 */
function verifyRecordingFields(
  original: Recording,
  migrated: Recording,
  report: CompatibilityReport
): void {
  // Critical fields that must be preserved exactly
  const criticalFields: (keyof Recording)[] = ['id', 'name', 'url', 'createdAt'];

  for (const field of criticalFields) {
    if (original[field] !== migrated[field]) {
      report.recordingIssues.push({
        severity: 'error',
        code: 'FIELD_CHANGED',
        message: `Critical field '${field}' was modified during migration`,
        field,
        originalValue: original[field],
        migratedValue: migrated[field],
      });
    }
  }

  // Verify steps count preserved
  if (original.steps.length !== migrated.steps.length) {
    report.recordingIssues.push({
      severity: 'error',
      code: 'STEPS_COUNT_CHANGED',
      message: `Steps count changed from ${original.steps.length} to ${migrated.steps.length}`,
      field: 'steps',
      originalValue: original.steps.length,
      migratedValue: migrated.steps.length,
    });
  }

  // Verify new fields have valid defaults
  if (migrated.loopStartIndex === undefined) {
    report.recordingIssues.push({
      severity: 'error',
      code: 'MISSING_LOOP_START_INDEX',
      message: 'loopStartIndex not set after migration',
      field: 'loopStartIndex',
    });
  }

  if (migrated.globalDelayMs === undefined) {
    report.recordingIssues.push({
      severity: 'error',
      code: 'MISSING_GLOBAL_DELAY',
      message: 'globalDelayMs not set after migration',
      field: 'globalDelayMs',
    });
  }

  // Warning if loopStartIndex is non-zero (behavior change)
  if (original.loopStartIndex === undefined && migrated.loopStartIndex !== 0) {
    report.warnings.push(
      `loopStartIndex defaulted to ${migrated.loopStartIndex} instead of 0`
    );
  }
}

/**
 * Verifies all steps preserved and migrated correctly
 */
function verifySteps(
  originalSteps: Step[],
  migratedSteps: Step[],
  report: CompatibilityReport
): void {
  for (let i = 0; i < originalSteps.length; i++) {
    const original = originalSteps[i];
    const migrated = migratedSteps[i];

    if (!migrated) {
      report.recordingIssues.push({
        severity: 'error',
        code: 'STEP_MISSING',
        message: `Step at index ${i} (${original.id}) missing after migration`,
      });
      continue;
    }

    const stepIssues: CompatibilityIssue[] = [];

    // Verify critical step fields preserved
    const criticalStepFields: (keyof Step)[] = ['id', 'event', 'path', 'value', 'label'];

    for (const field of criticalStepFields) {
      if (original[field] !== migrated[field]) {
        stepIssues.push({
          severity: 'error',
          code: 'STEP_FIELD_CHANGED',
          message: `Step field '${field}' was modified`,
          field,
          originalValue: original[field],
          migratedValue: migrated[field],
        });
      }
    }

    // Verify new fields have valid values
    if (migrated.recordedVia === undefined) {
      stepIssues.push({
        severity: 'error',
        code: 'MISSING_RECORDED_VIA',
        message: 'recordedVia not set after migration',
        field: 'recordedVia',
      });
    }

    if (migrated.conditionalConfig === undefined) {
      stepIssues.push({
        severity: 'error',
        code: 'MISSING_CONDITIONAL_CONFIG',
        message: 'conditionalConfig not set after migration (should be null)',
        field: 'conditionalConfig',
      });
    }

    if (migrated.delaySeconds === undefined) {
      stepIssues.push({
        severity: 'error',
        code: 'MISSING_DELAY_SECONDS',
        message: 'delaySeconds not set after migration (should be null)',
        field: 'delaySeconds',
      });
    }

    // Store issues for this step
    if (stepIssues.length > 0) {
      report.stepIssues.set(original.id, stepIssues);
    }
  }
}

/**
 * Verifies migrated recording can be played back
 */
function verifyPlayability(
  migrated: Recording,
  report: CompatibilityReport
): void {
  // Check each step is playable
  for (const step of migrated.steps) {
    // DOM steps must have a path
    if (step.recordedVia === 'dom' && !step.path && step.event !== 'open') {
      report.stepIssues.set(step.id, [
        ...(report.stepIssues.get(step.id) || []),
        {
          severity: 'warning',
          code: 'DOM_STEP_NO_PATH',
          message: 'DOM step has no path selector',
          field: 'path',
        },
      ]);
    }

    // Vision steps should have visionTarget or be conditional
    if (step.recordedVia === 'vision' && 
        !step.visionTarget && 
        step.event !== 'conditional-click') {
      report.stepIssues.set(step.id, [
        ...(report.stepIssues.get(step.id) || []),
        {
          severity: 'warning',
          code: 'VISION_STEP_NO_TARGET',
          message: 'Vision step has no visionTarget data',
          field: 'visionTarget',
        },
      ]);
    }

    // Conditional clicks must have config
    if (step.event === 'conditional-click' && !step.conditionalConfig) {
      report.stepIssues.set(step.id, [
        ...(report.stepIssues.get(step.id) || []),
        {
          severity: 'error',
          code: 'CONDITIONAL_NO_CONFIG',
          message: 'Conditional click step missing configuration',
          field: 'conditionalConfig',
        },
      ]);
    }
  }

  // Check loopStartIndex is valid
  if (migrated.loopStartIndex > migrated.steps.length) {
    report.recordingIssues.push({
      severity: 'error',
      code: 'INVALID_LOOP_START',
      message: `loopStartIndex (${migrated.loopStartIndex}) exceeds steps count (${migrated.steps.length})`,
      field: 'loopStartIndex',
    });
  }
}

/**
 * Generates human-readable compatibility report
 */
export function formatCompatibilityReport(report: CompatibilityReport): string {
  const lines: string[] = [];

  lines.push('=== Backward Compatibility Report ===');
  lines.push(`Status: ${report.compatible ? '✅ COMPATIBLE' : '❌ INCOMPATIBLE'}`);
  lines.push(`Schema: v${report.originalVersion} → v${report.migratedVersion}`);
  lines.push(`Verified: ${new Date(report.verifiedAt).toISOString()}`);
  lines.push('');

  if (report.recordingIssues.length > 0) {
    lines.push('Recording Issues:');
    for (const issue of report.recordingIssues) {
      const icon = issue.severity === 'error' ? '❌' : '⚠️';
      lines.push(`  ${icon} [${issue.code}] ${issue.message}`);
    }
    lines.push('');
  }

  if (report.stepIssues.size > 0) {
    lines.push('Step Issues:');
    for (const [stepId, issues] of report.stepIssues) {
      lines.push(`  Step ${stepId}:`);
      for (const issue of issues) {
        const icon = issue.severity === 'error' ? '❌' : '⚠️';
        lines.push(`    ${icon} [${issue.code}] ${issue.message}`);
      }
    }
    lines.push('');
  }

  if (report.warnings.length > 0) {
    lines.push('Warnings:');
    for (const warning of report.warnings) {
      lines.push(`  ⚠️ ${warning}`);
    }
    lines.push('');
  }

  if (report.compatible && report.recordingIssues.length === 0 && report.stepIssues.size === 0) {
    lines.push('No issues found. Recording is fully backward compatible.');
  }

  return lines.join('\n');
}
```

### 4.2 Integration with Schema Migration

```typescript
// In src/lib/schemaMigration.ts

import { 
  verifyBackwardCompatibility, 
  formatCompatibilityReport,
  CompatibilityReport,
} from './migrations/verifyBackwardCompatibility';

/**
 * Migrates and verifies a recording
 * 
 * @param recording - Original recording
 * @param options - Migration options
 * @returns Migrated recording and compatibility report
 */
export function migrateAndVerify(
  recording: Recording,
  options: { throwOnIncompatible?: boolean } = {}
): { recording: Recording; report: CompatibilityReport } {
  // Perform migration
  const migrated = migrateRecording(recording);

  // Verify compatibility
  const report = verifyBackwardCompatibility(recording, migrated);

  // Log report in development
  if (process.env.NODE_ENV === 'development') {
    console.log(formatCompatibilityReport(report));
  }

  // Optionally throw on incompatibility
  if (options.throwOnIncompatible && !report.compatible) {
    throw new Error(
      `Migration produced incompatible recording:\n${formatCompatibilityReport(report)}`
    );
  }

  return { recording: migrated, report };
}
```

---

## 5. VERIFICATION CHECKLIST

### 5.1 Recording-Level Checks

| Check | Expected | Severity |
|-------|----------|----------|
| ID preserved | Unchanged | Error |
| Name preserved | Unchanged | Error |
| URL preserved | Unchanged | Error |
| CreatedAt preserved | Unchanged | Error |
| Steps count preserved | Same length | Error |
| loopStartIndex set | Number ≥ 0 | Error |
| globalDelayMs set | Number ≥ 0 | Error |
| schemaVersion updated | Current version | Error |

### 5.2 Step-Level Checks

| Check | Expected | Severity |
|-------|----------|----------|
| ID preserved | Unchanged | Error |
| Event preserved | Unchanged | Error |
| Path preserved | Unchanged | Error |
| Value preserved | Unchanged | Error |
| Label preserved | Unchanged | Error |
| recordedVia set | 'dom' or 'vision' | Error |
| conditionalConfig set | Object or null | Error |
| delaySeconds set | Number or null | Error |

### 5.3 Playability Checks

| Check | Expected | Severity |
|-------|----------|----------|
| DOM steps have path | Non-empty string | Warning |
| Vision steps have target | Object or conditional | Warning |
| Conditional has config | Valid config object | Error |
| loopStartIndex valid | ≤ steps.length | Error |

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** Critical fields verified unchanged
- [ ] **AC-2:** Steps count verified unchanged
- [ ] **AC-3:** All new fields verified present
- [ ] **AC-4:** Playability checks pass
- [ ] **AC-5:** Report correctly identifies errors vs warnings
- [ ] **AC-6:** Report formatting is human-readable
- [ ] **AC-7:** Integration with migration pipeline works
- [ ] **AC-8:** throwOnIncompatible option works
- [ ] **AC-9:** Development logging works
- [ ] **AC-10:** All legacy recordings pass verification

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Non-destructive** - Verification never modifies data
2. **Complete** - Check all fields, not just migrated ones
3. **Actionable** - Report gives clear next steps

### Patterns to Follow

1. **Accumulate issues** - Don't fail fast, collect all
2. **Severity levels** - Distinguish blocking vs non-blocking
3. **Detailed reporting** - Include before/after values

### Edge Cases

1. **Empty recording** - Should still pass
2. **Already migrated** - Should pass with no changes
3. **Corrupted data** - Should fail gracefully

---

## 8. VERIFICATION COMMANDS

```bash
# Verify file creation
ls -la src/lib/migrations/verifyBackwardCompatibility.ts

# Verify exports
grep -n "verifyBackwardCompatibility\|formatCompatibilityReport" src/lib/migrations/verifyBackwardCompatibility.ts

# Verify integration
grep -n "migrateAndVerify" src/lib/schemaMigration.ts

# Run tests
npm run test -- verifyBackwardCompatibility

# Run type check
npm run type-check
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Remove verification file
rm src/lib/migrations/verifyBackwardCompatibility.ts

# Revert schema migration changes
git checkout src/lib/schemaMigration.ts
```

---

## 10. REFERENCES

- MIG-001: RecordedVia Default Migration
- MIG-002: LoopStartIndex Default Migration
- MIG-003: GlobalDelayMs Default Migration
- MIG-004: Conditional Defaults Migration
- TST-008: Schema Migration Tests

---

*End of Specification MIG-005*
