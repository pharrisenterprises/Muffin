# TST-008: Schema Migration Tests

> **Build Card:** TST-008  
> **Category:** Testing & Validation  
> **Dependencies:** DAT-002, FND-010, FND-011  
> **Risk Level:** High  
> **Estimated Lines:** 250-300

---

## 1. PURPOSE

Create comprehensive unit tests for the schema migration system. These tests verify that existing recordings without Vision fields are correctly migrated to the new schema, default values are applied appropriately, data integrity is maintained, and backward compatibility is preserved. Critical for ensuring users don't lose existing recordings when upgrading to the Vision-enabled version.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| DAT-002 Spec | `build-instructions/masterplan/02-data-layer/DAT-002_schema-migration.md` | Migration logic |
| Step Interface | `src/types/step.types.ts` | New fields |
| Recording Interface | `src/types/recording.types.ts` | New fields |
| MIG-001 to MIG-004 | Migration specs | Default values |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/lib/__tests__/schemaMigration.test.ts` | CREATE | +220 |
| `src/lib/__tests__/fixtures/legacy-recordings.fixture.ts` | CREATE | +100 |

### Artifacts

- Schema migration test suite
- Legacy recording fixtures (v1, v2 formats)
- Data integrity validation tests

---

## 4. DETAILED SPECIFICATION

### 4.1 Test File Structure

```typescript
// src/lib/__tests__/schemaMigration.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { migrateRecording, migrateStep, getSchemaVersion } from '../schemaMigration';
import { 
  legacyRecordingV1,
  legacyRecordingV2,
  legacyStepBasic,
  legacyStepWithValue,
  modernRecording,
  corruptedRecording,
  minimalRecording,
} from './fixtures/legacy-recordings.fixture';

describe('Schema Migration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test suites defined below...
});
```

### 4.2 Legacy Recording Fixtures

```typescript
// src/lib/__tests__/fixtures/legacy-recordings.fixture.ts

/**
 * Version 1 recording - original format before any Vision features
 * Missing: loopStartIndex, globalDelayMs, schemaVersion
 */
export const legacyRecordingV1 = {
  id: 'rec-001',
  name: 'Login Flow',
  url: 'https://example.com/login',
  steps: [
    {
      id: 'step-001',
      label: 'Click login button',
      event: 'click',
      path: '/html/body/button[1]',
      value: '',
    },
    {
      id: 'step-002',
      label: 'Enter username',
      event: 'input',
      path: '/html/body/input[1]',
      value: 'testuser',
    },
  ],
  createdAt: 1699900000000,
  updatedAt: 1699900000000,
};

/**
 * Version 2 recording - has some fields but not Vision
 * Has: loopStartIndex
 * Missing: globalDelayMs, schemaVersion, step.recordedVia
 */
export const legacyRecordingV2 = {
  id: 'rec-002',
  name: 'Data Entry Flow',
  url: 'https://example.com/form',
  loopStartIndex: 2,
  steps: [
    {
      id: 'step-001',
      label: 'Open page',
      event: 'open',
      path: 'https://example.com/form',
      value: '',
    },
    {
      id: 'step-002',
      label: 'Fill name',
      event: 'input',
      path: '#name-field',
      value: '{{name}}',
    },
    {
      id: 'step-003',
      label: 'Submit',
      event: 'click',
      path: '#submit-btn',
      value: '',
    },
  ],
  createdAt: 1700000000000,
  updatedAt: 1700100000000,
};

/**
 * Legacy step - basic click without new fields
 */
export const legacyStepBasic = {
  id: 'step-legacy-001',
  label: 'Click button',
  event: 'click',
  path: '/html/body/div/button',
  value: '',
};

/**
 * Legacy step - input with value
 */
export const legacyStepWithValue = {
  id: 'step-legacy-002',
  label: 'Enter email',
  event: 'input',
  path: '#email',
  value: 'test@example.com',
};

/**
 * Modern recording - fully migrated with all fields
 */
export const modernRecording = {
  id: 'rec-003',
  name: 'Modern Flow',
  url: 'https://example.com',
  loopStartIndex: 0,
  globalDelayMs: 500,
  schemaVersion: 3,
  steps: [
    {
      id: 'step-001',
      label: 'Click Allow',
      event: 'click',
      path: '',
      value: '',
      recordedVia: 'vision',
      delaySeconds: null,
      conditionalConfig: null,
      visionTarget: {
        text: 'Allow',
        bbox: { x0: 100, y0: 100, x1: 170, y1: 130 },
        confidence: 97.0,
      },
    },
  ],
  createdAt: 1700200000000,
  updatedAt: 1700200000000,
};

/**
 * Corrupted recording - missing required fields
 */
export const corruptedRecording = {
  id: 'rec-corrupt',
  // Missing: name, url, steps
  createdAt: 1699800000000,
};

/**
 * Minimal valid recording
 */
export const minimalRecording = {
  id: 'rec-minimal',
  name: 'Minimal',
  url: 'https://example.com',
  steps: [],
};

/**
 * Recording with mixed step formats
 */
export const mixedStepsRecording = {
  id: 'rec-mixed',
  name: 'Mixed Steps',
  url: 'https://example.com',
  steps: [
    // Legacy step
    {
      id: 'step-001',
      label: 'Old click',
      event: 'click',
      path: '#old-button',
      value: '',
    },
    // Already migrated step
    {
      id: 'step-002',
      label: 'New click',
      event: 'click',
      path: '#new-button',
      value: '',
      recordedVia: 'dom',
      delaySeconds: 2,
      conditionalConfig: null,
    },
  ],
};
```

### 4.3 Recording Migration Tests

```typescript
describe('migrateRecording()', () => {
  it('should add loopStartIndex with default 0', () => {
    const migrated = migrateRecording(legacyRecordingV1);
    
    expect(migrated.loopStartIndex).toBe(0);
  });

  it('should preserve existing loopStartIndex', () => {
    const migrated = migrateRecording(legacyRecordingV2);
    
    expect(migrated.loopStartIndex).toBe(2);
  });

  it('should add globalDelayMs with default 0', () => {
    const migrated = migrateRecording(legacyRecordingV1);
    
    expect(migrated.globalDelayMs).toBe(0);
  });

  it('should add schemaVersion', () => {
    const migrated = migrateRecording(legacyRecordingV1);
    
    expect(migrated.schemaVersion).toBe(3);
  });

  it('should not modify already migrated recording', () => {
    const migrated = migrateRecording(modernRecording);
    
    expect(migrated).toEqual(modernRecording);
    expect(migrated.schemaVersion).toBe(3);
  });

  it('should migrate all steps in recording', () => {
    const migrated = migrateRecording(legacyRecordingV1);
    
    migrated.steps.forEach(step => {
      expect(step.recordedVia).toBe('dom');
      expect(step.delaySeconds).toBeNull();
      expect(step.conditionalConfig).toBeNull();
    });
  });

  it('should preserve all original fields', () => {
    const migrated = migrateRecording(legacyRecordingV1);
    
    expect(migrated.id).toBe(legacyRecordingV1.id);
    expect(migrated.name).toBe(legacyRecordingV1.name);
    expect(migrated.url).toBe(legacyRecordingV1.url);
    expect(migrated.createdAt).toBe(legacyRecordingV1.createdAt);
    expect(migrated.steps.length).toBe(legacyRecordingV1.steps.length);
  });

  it('should update updatedAt timestamp', () => {
    const before = Date.now();
    const migrated = migrateRecording(legacyRecordingV1);
    const after = Date.now();
    
    expect(migrated.updatedAt).toBeGreaterThanOrEqual(before);
    expect(migrated.updatedAt).toBeLessThanOrEqual(after);
  });

  it('should handle empty steps array', () => {
    const migrated = migrateRecording(minimalRecording);
    
    expect(migrated.steps).toEqual([]);
    expect(migrated.loopStartIndex).toBe(0);
  });
});
```

### 4.4 Step Migration Tests

```typescript
describe('migrateStep()', () => {
  it('should add recordedVia with default "dom"', () => {
    const migrated = migrateStep(legacyStepBasic);
    
    expect(migrated.recordedVia).toBe('dom');
  });

  it('should add delaySeconds with default null', () => {
    const migrated = migrateStep(legacyStepBasic);
    
    expect(migrated.delaySeconds).toBeNull();
  });

  it('should add conditionalConfig with default null', () => {
    const migrated = migrateStep(legacyStepBasic);
    
    expect(migrated.conditionalConfig).toBeNull();
  });

  it('should preserve existing recordedVia', () => {
    const stepWithRecordedVia = {
      ...legacyStepBasic,
      recordedVia: 'vision',
    };
    
    const migrated = migrateStep(stepWithRecordedVia);
    
    expect(migrated.recordedVia).toBe('vision');
  });

  it('should preserve existing delaySeconds', () => {
    const stepWithDelay = {
      ...legacyStepBasic,
      delaySeconds: 5,
    };
    
    const migrated = migrateStep(stepWithDelay);
    
    expect(migrated.delaySeconds).toBe(5);
  });

  it('should preserve all original step fields', () => {
    const migrated = migrateStep(legacyStepWithValue);
    
    expect(migrated.id).toBe(legacyStepWithValue.id);
    expect(migrated.label).toBe(legacyStepWithValue.label);
    expect(migrated.event).toBe(legacyStepWithValue.event);
    expect(migrated.path).toBe(legacyStepWithValue.path);
    expect(migrated.value).toBe(legacyStepWithValue.value);
  });

  it('should handle step with all new fields already present', () => {
    const modernStep = modernRecording.steps[0];
    const migrated = migrateStep(modernStep);
    
    expect(migrated).toEqual(modernStep);
  });
});
```

### 4.5 Schema Version Detection Tests

```typescript
describe('getSchemaVersion()', () => {
  it('should return 1 for original legacy format', () => {
    const version = getSchemaVersion(legacyRecordingV1);
    
    expect(version).toBe(1);
  });

  it('should return 2 for format with loopStartIndex', () => {
    const version = getSchemaVersion(legacyRecordingV2);
    
    expect(version).toBe(2);
  });

  it('should return 3 for fully migrated format', () => {
    const version = getSchemaVersion(modernRecording);
    
    expect(version).toBe(3);
  });

  it('should detect version from explicit schemaVersion field', () => {
    const recording = { ...legacyRecordingV1, schemaVersion: 3 };
    const version = getSchemaVersion(recording);
    
    expect(version).toBe(3);
  });

  it('should return 1 for minimal recording', () => {
    const version = getSchemaVersion(minimalRecording);
    
    expect(version).toBe(1);
  });
});
```

### 4.6 Backward Compatibility Tests

```typescript
describe('Backward Compatibility', () => {
  it('should produce recordings playable by old engine', () => {
    const migrated = migrateRecording(legacyRecordingV1);
    
    // Old engine expects these fields
    expect(migrated.id).toBeDefined();
    expect(migrated.name).toBeDefined();
    expect(migrated.url).toBeDefined();
    expect(migrated.steps).toBeDefined();
    expect(Array.isArray(migrated.steps)).toBe(true);
  });

  it('should produce steps with required playback fields', () => {
    const migrated = migrateRecording(legacyRecordingV1);
    
    migrated.steps.forEach(step => {
      expect(step.id).toBeDefined();
      expect(step.event).toBeDefined();
      expect(step.path).toBeDefined();
    });
  });

  it('should not break existing DOM playback', () => {
    const migrated = migrateRecording(legacyRecordingV1);
    
    // DOM steps should still have valid paths
    migrated.steps.forEach(step => {
      if (step.recordedVia === 'dom') {
        expect(step.path).toBeTruthy();
      }
    });
  });

  it('should handle recordings from multiple schema versions', () => {
    const recordings = [
      legacyRecordingV1,
      legacyRecordingV2,
      modernRecording,
    ];
    
    const migrated = recordings.map(r => migrateRecording(r));
    
    migrated.forEach(r => {
      expect(r.schemaVersion).toBe(3);
      expect(r.loopStartIndex).toBeDefined();
      expect(r.globalDelayMs).toBeDefined();
    });
  });
});
```

### 4.7 Data Integrity Tests

```typescript
describe('Data Integrity', () => {
  it('should not mutate original recording', () => {
    const original = JSON.parse(JSON.stringify(legacyRecordingV1));
    migrateRecording(legacyRecordingV1);
    
    expect(legacyRecordingV1).toEqual(original);
  });

  it('should not mutate original steps', () => {
    const original = JSON.parse(JSON.stringify(legacyStepBasic));
    migrateStep(legacyStepBasic);
    
    expect(legacyStepBasic).toEqual(original);
  });

  it('should preserve step order', () => {
    const migrated = migrateRecording(legacyRecordingV1);
    
    expect(migrated.steps[0].id).toBe('step-001');
    expect(migrated.steps[1].id).toBe('step-002');
  });

  it('should preserve step values exactly', () => {
    const migrated = migrateRecording(legacyRecordingV2);
    
    const inputStep = migrated.steps.find(s => s.event === 'input');
    expect(inputStep?.value).toBe('{{name}}');
  });

  it('should handle special characters in values', () => {
    const specialRecording = {
      ...minimalRecording,
      steps: [{
        id: 'step-special',
        label: 'Special chars',
        event: 'input',
        path: '#field',
        value: '{"json": "value", "with": "quotes"}',
      }],
    };
    
    const migrated = migrateRecording(specialRecording);
    
    expect(migrated.steps[0].value).toBe('{"json": "value", "with": "quotes"}');
  });

  it('should handle unicode in labels', () => {
    const unicodeRecording = {
      ...minimalRecording,
      name: '日本語テスト',
      steps: [{
        id: 'step-unicode',
        label: 'クリック 📱',
        event: 'click',
        path: '#btn',
        value: '',
      }],
    };
    
    const migrated = migrateRecording(unicodeRecording);
    
    expect(migrated.name).toBe('日本語テスト');
    expect(migrated.steps[0].label).toBe('クリック 📱');
  });
});
```

### 4.8 Error Handling Tests

```typescript
describe('Error Handling', () => {
  it('should throw for null recording', () => {
    expect(() => migrateRecording(null as any)).toThrow(
      'Invalid recording: null or undefined'
    );
  });

  it('should throw for undefined recording', () => {
    expect(() => migrateRecording(undefined as any)).toThrow(
      'Invalid recording: null or undefined'
    );
  });

  it('should throw for recording without id', () => {
    const noId = { name: 'Test', url: 'https://test.com', steps: [] };
    
    expect(() => migrateRecording(noId as any)).toThrow(
      'Invalid recording: missing id'
    );
  });

  it('should throw for recording without steps array', () => {
    const noSteps = { id: 'rec-1', name: 'Test', url: 'https://test.com' };
    
    expect(() => migrateRecording(noSteps as any)).toThrow(
      'Invalid recording: steps must be an array'
    );
  });

  it('should handle null step in steps array', () => {
    const nullStep = {
      ...minimalRecording,
      steps: [legacyStepBasic, null, legacyStepWithValue],
    };
    
    expect(() => migrateRecording(nullStep as any)).toThrow(
      'Invalid step at index 1'
    );
  });

  it('should handle step without id', () => {
    const noIdStep = {
      ...minimalRecording,
      steps: [{ label: 'No ID', event: 'click', path: '#btn', value: '' }],
    };
    
    // Should generate ID or throw - depends on implementation
    const migrated = migrateRecording(noIdStep as any);
    expect(migrated.steps[0].id).toBeDefined();
  });
});
```

### 4.9 Migration Idempotency Tests

```typescript
describe('Migration Idempotency', () => {
  it('should produce same result when run multiple times', () => {
    const first = migrateRecording(legacyRecordingV1);
    const second = migrateRecording(first);
    const third = migrateRecording(second);
    
    // Ignore updatedAt as it will differ
    const normalize = (r: any) => ({ ...r, updatedAt: 0 });
    
    expect(normalize(second)).toEqual(normalize(first));
    expect(normalize(third)).toEqual(normalize(second));
  });

  it('should not change schemaVersion on re-migration', () => {
    const first = migrateRecording(legacyRecordingV1);
    const second = migrateRecording(first);
    
    expect(second.schemaVersion).toBe(first.schemaVersion);
  });

  it('should not add duplicate fields on re-migration', () => {
    const first = migrateRecording(legacyRecordingV1);
    const second = migrateRecording(first);
    
    const firstKeys = Object.keys(first).sort();
    const secondKeys = Object.keys(second).sort();
    
    expect(secondKeys).toEqual(firstKeys);
  });
});
```

---

## 5. TEST EXECUTION

### 5.1 Running Tests

```bash
# Run only migration tests
npm run test -- schemaMigration.test.ts

# Run with coverage
npm run test -- schemaMigration.test.ts --coverage

# Run all data layer tests
npm run test -- schema
```

### 5.2 Expected Output

```
 ✓ Schema Migration
   ✓ migrateRecording() (8 tests)
   ✓ migrateStep() (7 tests)
   ✓ getSchemaVersion() (5 tests)
   ✓ Backward Compatibility (4 tests)
   ✓ Data Integrity (6 tests)
   ✓ Error Handling (6 tests)
   ✓ Migration Idempotency (3 tests)

Test Files  1 passed (1)
Tests       39 passed (39)
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** Recording migration adds all new fields
- [ ] **AC-2:** Step migration adds all new fields
- [ ] **AC-3:** Existing values preserved
- [ ] **AC-4:** Schema version detected correctly
- [ ] **AC-5:** Backward compatibility maintained
- [ ] **AC-6:** Data integrity preserved
- [ ] **AC-7:** Error handling works correctly
- [ ] **AC-8:** Migration is idempotent
- [ ] **AC-9:** Original objects not mutated
- [ ] **AC-10:** Test coverage > 95% for migration

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Immutability** - Never mutate original objects
2. **Idempotency** - Multiple migrations = same result
3. **Validation** - Verify required fields exist

### Patterns to Follow

1. **Deep clone** - Clone before modifying
2. **Default values** - Use nullish coalescing
3. **Version detection** - Check field presence

### Edge Cases

1. **Corrupted data** - Handle gracefully
2. **Partial migration** - Some fields present
3. **Future versions** - Don't downgrade

---

## 8. VERIFICATION COMMANDS

```bash
# Verify test file creation
ls -la src/lib/__tests__/schemaMigration.test.ts

# Verify fixtures
ls -la src/lib/__tests__/fixtures/legacy-recordings.fixture.ts

# Run tests
npm run test -- schemaMigration.test.ts

# Check coverage
npm run test -- schemaMigration.test.ts --coverage
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Remove test file
rm src/lib/__tests__/schemaMigration.test.ts

# Remove fixtures
rm src/lib/__tests__/fixtures/legacy-recordings.fixture.ts
```

---

## 10. REFERENCES

- DAT-002: Schema Migration
- MIG-001: RecordedVia Default
- MIG-002: LoopStartIndex Default
- MIG-003: GlobalDelayMs Default
- MIG-004: Conditional Defaults

---

*End of Specification TST-008*
