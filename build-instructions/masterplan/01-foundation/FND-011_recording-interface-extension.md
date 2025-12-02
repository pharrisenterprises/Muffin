# FND-011: RECORDING INTERFACE EXTENSION SPECIFICATION

> **Build Card:** FND-011  
> **Category:** Foundation / Architecture  
> **Dependencies:** FND-004 (Type definitions), FND-008 (ConditionalConfig), FND-010 (Step extension)  
> **Risk Level:** Medium  
> **Estimated Lines:** ~480

---

## 1. PURPOSE

This specification defines the extension of the existing `Recording` interface to support Vision-based automation features. The Recording interface is the top-level data structure containing steps and configuration. This extension adds:

1. **Loop start index** - Where CSV row looping begins
2. **Global delay** - Default delay between all steps
3. **Conditional defaults** - Default settings for conditional clicks
4. **Extended steps array** - Array of extended Step objects

This is a **medium risk** change because Recording is persisted to IndexedDB and used throughout the application. All existing recordings must remain functional after this change.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| Type Definitions | `src/types/vision.ts` | Recording interface from FND-004 |
| Data Layer Spec | `/future-spec/05_data-layer.md` | Extended Recording definition |
| Existing Recording | `src/types/index.ts` | Current Recording interface |
| Bidirectional Analysis | `BIDIRECTIONAL_ANALYSIS.md` | Gap analysis for Recording |
| FND-010 | Step extension | Extended Step interface |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `src/types/vision.ts` | VERIFY | Recording interface already in FND-004 |
| `src/types/index.ts` | MODIFY | Re-export extended Recording |
| `src/lib/recordingUtils.ts` | CREATE | Recording utility functions |

### New Recording Properties

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `loopStartIndex` | `number` | Yes | `0` | Step index where CSV looping starts |
| `globalDelayMs` | `number` | Yes | `0` | Default delay after each step (ms) |
| `conditionalDefaults` | `object` | Yes | See below | Default conditional click settings |

---

## 4. DETAILED SPECIFICATION

### 4.1 Extended Recording Interface

The complete Recording interface from `src/types/vision.ts`:

```typescript
/**
 * Parsed field from CSV mapping
 */
export interface ParsedField {
  /** Column name from CSV header */
  field_name: string;

  /** Matched step label (inputvarfields) */
  inputvarfields: string;

  /** Whether a mapping was established */
  mapped: boolean;
}

/**
 * Default conditional settings for a recording
 */
export interface RecordingConditionalDefaults {
  /** Default text to search for */
  searchTerms: string[];

  /** Default timeout in seconds */
  timeoutSeconds: number;
}

/**
 * A recording is a sequence of steps that can be replayed
 * Extended with loop, delay, and conditional configuration
 */
export interface Recording {
  // ===== Existing Properties (Unchanged) =====

  /** Auto-incremented primary key */
  id?: number;

  /** Foreign key to parent project */
  projectId: number;

  /** User-defined recording name */
  name: string;

  /** Optional recording description */
  description?: string;

  /** Array of recorded steps (extended with Vision fields) */
  steps: Step[];

  /** URL where recording started */
  startUrl: string;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt?: Date;

  // ===== NEW: Loop Configuration =====

  /**
   * Index where loop starts for CSV rows 2+
   * Row 1 always executes all steps (index 0 to end)
   * Rows 2+ execute from this index to end
   * @default 0 (execute all steps for every row)
   * @minimum 0
   */
  loopStartIndex: number;

  // ===== NEW: Delay Configuration =====

  /**
   * Global delay applied AFTER each step (milliseconds)
   * Only applies if step has no per-step delaySeconds
   * @default 0 (no delay)
   * @minimum 0
   */
  globalDelayMs: number;

  // ===== NEW: Conditional Defaults =====

  /**
   * Default configuration for conditional click steps
   * Individual steps can override these values
   */
  conditionalDefaults: RecordingConditionalDefaults;

  // ===== CSV Data (Existing, unchanged) =====

  /** Parsed CSV column mappings */
  parsedFields?: ParsedField[];

  /** Raw CSV data rows */
  csvData?: Record<string, string>[];
}
```

### 4.2 Property Details

#### 4.2.1 loopStartIndex

| Attribute | Value |
|-----------|-------|
| Type | `number` |
| Required | Yes |
| Default | `0` |
| Minimum | `0` |

**Description:**
Determines which steps execute for each CSV row during playback. This enables "one-time setup" steps that only run once.

**Loop Behavior:**

```
Recording with 5 steps, loopStartIndex = 2:

CSV Row 1: Execute steps 0, 1, 2, 3, 4 (ALL steps)
CSV Row 2: Execute steps 2, 3, 4 (skip 0, 1)
CSV Row 3: Execute steps 2, 3, 4 (skip 0, 1)
...and so on
```

**Use Cases:**

| loopStartIndex | Scenario |
|----------------|----------|
| 0 | Execute all steps for every row (default) |
| 1 | Skip first step (e.g., initial navigation) |
| 2 | Skip login/setup steps |
| N | Skip first N steps |

**Visual Representation:**

```
Steps:    [0: Open] [1: Login] [2: Search] [3: Fill Form] [4: Submit]
                                    ↑
                            loopStartIndex = 2
                            
Row 1:    ████████████████████████████████████████████████████████
Row 2+:                     ██████████████████████████████████████
```

**Validation:**
- Must be >= 0
- Should be < steps.length (warn if equal or greater)

#### 4.2.2 globalDelayMs

| Attribute | Value |
|-----------|-------|
| Type | `number` |
| Required | Yes |
| Default | `0` |
| Minimum | `0` |
| Unit | Milliseconds |

**Description:**
Default delay applied after each step during playback. Provides a consistent pace for automation.

**Delay Logic:**

```typescript
for (const step of steps) {
  await executeStep(step);
  
  // Apply delay
  const delayMs = step.delaySeconds 
    ? step.delaySeconds * 1000  // Step-level override
    : globalDelayMs;             // Recording-level default
    
  if (delayMs > 0) {
    await sleep(delayMs);
  }
}
```

**Common Values:**

| Value | Use Case |
|-------|----------|
| 0 | No delay (fastest execution) |
| 500 | Quick pacing (0.5s between steps) |
| 1000 | Standard pacing (1s between steps) |
| 2000 | Slow pacing (for debugging) |
| 5000+ | Very slow (for manual observation) |

**UI Input:**
The UI displays this as seconds with a dropdown, but stores as milliseconds:
- Display: "1 second" → Store: 1000
- Display: "0.5 seconds" → Store: 500

#### 4.2.3 conditionalDefaults

| Attribute | Value |
|-----------|-------|
| Type | `RecordingConditionalDefaults` |
| Required | Yes |
| Default | `{ searchTerms: ['Allow', 'Keep'], timeoutSeconds: 120 }` |

**Description:**
Default settings applied to conditional click steps that don't have their own configuration. Provides recording-level defaults that can be overridden per-step.

**RecordingConditionalDefaults Structure:**

```typescript
interface RecordingConditionalDefaults {
  /** Default text strings to search for */
  searchTerms: string[];
  
  /** Default timeout in seconds */
  timeoutSeconds: number;
}
```

**Merge Behavior:**

```typescript
function getConditionalConfig(step: Step, recording: Recording): ConditionalConfig {
  if (step.conditionalConfig) {
    // Step has full override
    return step.conditionalConfig;
  }
  
  // Use recording defaults
  return {
    enabled: false,
    searchTerms: recording.conditionalDefaults.searchTerms,
    timeoutSeconds: recording.conditionalDefaults.timeoutSeconds,
    pollIntervalMs: 1000,
    interactionType: 'click',
  };
}
```

**Default Values Rationale:**
- `['Allow', 'Keep']` - Common Claude.ai approval button text
- `120` seconds - 2 minutes, typical AI response time

---

### 4.3 Backward Compatibility

All new properties have defaults, ensuring backward compatibility:

```typescript
// Old recording (v1) still valid:
const oldRecording = {
  id: 1,
  projectId: 1,
  name: 'My Recording',
  steps: [...],
  startUrl: 'https://example.com',
  createdAt: new Date(),
};

// After migration, becomes:
const migratedRecording = {
  id: 1,
  projectId: 1,
  name: 'My Recording',
  steps: [...],  // Steps also migrated
  startUrl: 'https://example.com',
  createdAt: new Date(),
  loopStartIndex: 0,           // Added
  globalDelayMs: 0,            // Added
  conditionalDefaults: {       // Added
    searchTerms: ['Allow', 'Keep'],
    timeoutSeconds: 120,
  },
};
```

---

### 4.4 Utility Functions

Create `src/lib/recordingUtils.ts`:

```typescript
/**
 * @fileoverview Utility functions for Recording operations
 * @module lib/recordingUtils
 */

import {
  Recording,
  Step,
  RecordingConditionalDefaults,
  ParsedField,
} from '@/types';
import { migrateStep } from './stepUtils';

/**
 * Default conditional settings
 */
export const DEFAULT_CONDITIONAL_DEFAULTS: RecordingConditionalDefaults = {
  searchTerms: ['Allow', 'Keep'],
  timeoutSeconds: 120,
};

/**
 * Default recording values
 */
export const DEFAULT_RECORDING_VALUES = {
  loopStartIndex: 0,
  globalDelayMs: 0,
  conditionalDefaults: DEFAULT_CONDITIONAL_DEFAULTS,
} as const;

/**
 * Creates a new Recording with default values
 * @param projectId - Parent project ID
 * @param name - Recording name
 * @param overrides - Additional properties
 * @returns Complete Recording object
 */
export function createRecording(
  projectId: number,
  name: string,
  overrides: Partial<Omit<Recording, 'id' | 'projectId' | 'name'>> = {}
): Omit<Recording, 'id'> {
  return {
    projectId,
    name,
    description: '',
    steps: [],
    startUrl: '',
    createdAt: new Date(),
    loopStartIndex: 0,
    globalDelayMs: 0,
    conditionalDefaults: { ...DEFAULT_CONDITIONAL_DEFAULTS },
    ...overrides,
  };
}

/**
 * Migrates a v1 recording to v2 format
 * @param recording - Old recording (may be missing new fields)
 * @returns Migrated recording with all required fields
 */
export function migrateRecording(recording: Partial<Recording>): Recording {
  // Migrate steps
  const migratedSteps = (recording.steps || []).map((step) =>
    migrateStep(step as any)
  );

  return {
    id: recording.id,
    projectId: recording.projectId!,
    name: recording.name || '',
    description: recording.description || '',
    steps: migratedSteps,
    startUrl: recording.startUrl || '',
    createdAt: recording.createdAt || new Date(),
    updatedAt: recording.updatedAt,
    loopStartIndex: recording.loopStartIndex ?? 0,
    globalDelayMs: recording.globalDelayMs ?? 0,
    conditionalDefaults: recording.conditionalDefaults ?? {
      ...DEFAULT_CONDITIONAL_DEFAULTS,
    },
    parsedFields: recording.parsedFields,
    csvData: recording.csvData,
  };
}

/**
 * Validates a Recording object
 * @param recording - Recording to validate
 * @returns Validation result
 */
export function validateRecording(recording: Recording): {
  valid: boolean;
  errors: string[];
  stepErrors: Map<string, string[]>;
} {
  const errors: string[] = [];
  const stepErrors = new Map<string, string[]>();

  // Required fields
  if (!recording.name || recording.name.trim() === '') {
    errors.push('Recording name is required');
  }

  if (recording.projectId === undefined || recording.projectId === null) {
    errors.push('Project ID is required');
  }

  // Steps validation
  if (!recording.steps || recording.steps.length === 0) {
    errors.push('At least one step is required');
  } else {
    // Import validateStep dynamically to avoid circular deps
    const { validateStep } = require('./stepUtils');
    
    recording.steps.forEach((step, index) => {
      const result = validateStep(step);
      if (!result.valid) {
        stepErrors.set(step.id || `step-${index}`, result.errors);
      }
    });
  }

  // Loop start validation
  if (recording.loopStartIndex < 0) {
    errors.push('Loop start index cannot be negative');
  }
  if (recording.steps && recording.loopStartIndex >= recording.steps.length) {
    errors.push('Loop start index exceeds number of steps');
  }

  // Delay validation
  if (recording.globalDelayMs < 0) {
    errors.push('Global delay cannot be negative');
  }

  // Conditional defaults validation
  if (recording.conditionalDefaults) {
    if (recording.conditionalDefaults.timeoutSeconds <= 0) {
      errors.push('Default timeout must be greater than 0');
    }
    if (!recording.conditionalDefaults.searchTerms?.length) {
      errors.push('At least one default search term is required');
    }
  }

  return {
    valid: errors.length === 0 && stepErrors.size === 0,
    errors,
    stepErrors,
  };
}

/**
 * Gets steps that should execute for a given CSV row
 * @param recording - The recording
 * @param rowIndex - Zero-based CSV row index
 * @returns Array of steps to execute
 */
export function getStepsForRow(recording: Recording, rowIndex: number): Step[] {
  if (rowIndex === 0) {
    // First row: execute all steps
    return recording.steps;
  }
  
  // Subsequent rows: start from loopStartIndex
  return recording.steps.slice(recording.loopStartIndex);
}

/**
 * Gets the absolute step index for a step during looped execution
 * @param recording - The recording
 * @param rowIndex - Zero-based CSV row index
 * @param stepIndexInLoop - Index within the loop iteration
 * @returns Absolute step index in recording.steps
 */
export function getAbsoluteStepIndex(
  recording: Recording,
  rowIndex: number,
  stepIndexInLoop: number
): number {
  if (rowIndex === 0) {
    return stepIndexInLoop;
  }
  return recording.loopStartIndex + stepIndexInLoop;
}

/**
 * Calculates estimated execution time for a recording
 * @param recording - The recording
 * @param csvRowCount - Number of CSV rows to process
 * @returns Estimated time in milliseconds
 */
export function estimateExecutionTime(
  recording: Recording,
  csvRowCount: number = 1
): number {
  const stepCount = recording.steps.length;
  const loopStepCount = stepCount - recording.loopStartIndex;
  
  // First row: all steps
  let totalSteps = stepCount;
  
  // Subsequent rows: loop steps only
  if (csvRowCount > 1) {
    totalSteps += loopStepCount * (csvRowCount - 1);
  }
  
  // Calculate delay time
  let delayTime = 0;
  for (const step of recording.steps) {
    const stepDelay = step.delaySeconds
      ? step.delaySeconds * 1000
      : recording.globalDelayMs;
    delayTime += stepDelay;
  }
  
  // For looped rows, only count loop step delays
  if (csvRowCount > 1) {
    const loopSteps = recording.steps.slice(recording.loopStartIndex);
    for (const step of loopSteps) {
      const stepDelay = step.delaySeconds
        ? step.delaySeconds * 1000
        : recording.globalDelayMs;
      delayTime += stepDelay * (csvRowCount - 1);
    }
  }
  
  // Estimate ~500ms per step for execution
  const executionTime = totalSteps * 500;
  
  return executionTime + delayTime;
}

/**
 * Formats estimated time as human-readable string
 * @param ms - Milliseconds
 * @returns Formatted string
 */
export function formatEstimatedTime(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  
  if (seconds < 60) {
    return `~${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (remainingSeconds === 0) {
    return `~${minutes}m`;
  }
  
  return `~${minutes}m ${remainingSeconds}s`;
}

/**
 * Checks if recording has any Vision-recorded steps
 * @param recording - Recording to check
 * @returns True if any step is Vision-recorded
 */
export function hasVisionSteps(recording: Recording): boolean {
  return recording.steps.some((step) => step.recordedVia === 'vision');
}

/**
 * Checks if recording has any conditional click steps
 * @param recording - Recording to check
 * @returns True if any step is conditional-click
 */
export function hasConditionalClicks(recording: Recording): boolean {
  return recording.steps.some((step) => step.event === 'conditional-click');
}

/**
 * Gets a summary of recording configuration
 * @param recording - Recording to summarize
 * @returns Summary object
 */
export function getRecordingSummary(recording: Recording): {
  stepCount: number;
  loopStepCount: number;
  visionStepCount: number;
  conditionalStepCount: number;
  hasDelay: boolean;
  hasLoop: boolean;
} {
  const visionSteps = recording.steps.filter((s) => s.recordedVia === 'vision');
  const conditionalSteps = recording.steps.filter(
    (s) => s.event === 'conditional-click'
  );

  return {
    stepCount: recording.steps.length,
    loopStepCount: recording.steps.length - recording.loopStartIndex,
    visionStepCount: visionSteps.length,
    conditionalStepCount: conditionalSteps.length,
    hasDelay: recording.globalDelayMs > 0,
    hasLoop: recording.loopStartIndex > 0,
  };
}

/**
 * Clones a recording with a new name
 * @param recording - Recording to clone
 * @param newName - Name for the clone
 * @returns Cloned recording without ID
 */
export function cloneRecording(
  recording: Recording,
  newName: string
): Omit<Recording, 'id'> {
  const { cloneStep } = require('./stepUtils');
  
  return {
    projectId: recording.projectId,
    name: newName,
    description: recording.description,
    steps: recording.steps.map(cloneStep),
    startUrl: recording.startUrl,
    createdAt: new Date(),
    loopStartIndex: recording.loopStartIndex,
    globalDelayMs: recording.globalDelayMs,
    conditionalDefaults: { ...recording.conditionalDefaults },
    parsedFields: recording.parsedFields
      ? [...recording.parsedFields]
      : undefined,
    csvData: recording.csvData ? [...recording.csvData] : undefined,
  };
}
```

---

## 5. CODE EXAMPLES

### 5.1 Creating a Recording

```typescript
import { createRecording } from '@/lib/recordingUtils';

// Basic recording
const recording = createRecording(1, 'My Automation');

// Recording with configuration
const configuredRecording = createRecording(1, 'Claude Automation', {
  startUrl: 'https://claude.ai/chat',
  loopStartIndex: 2,
  globalDelayMs: 1000,
  conditionalDefaults: {
    searchTerms: ['Allow', 'Keep', 'Continue'],
    timeoutSeconds: 300,
  },
});
```

### 5.2 Processing CSV Rows

```typescript
import { getStepsForRow, getAbsoluteStepIndex } from '@/lib/recordingUtils';

async function runAutomation(recording: Recording, csvRows: any[]) {
  for (let rowIndex = 0; rowIndex < csvRows.length; rowIndex++) {
    const stepsToRun = getStepsForRow(recording, rowIndex);
    
    for (let i = 0; i < stepsToRun.length; i++) {
      const step = stepsToRun[i];
      const absoluteIndex = getAbsoluteStepIndex(recording, rowIndex, i);
      
      console.log(`Row ${rowIndex + 1}, Step ${absoluteIndex + 1}: ${step.label}`);
      await executeStep(step, csvRows[rowIndex]);
    }
  }
}
```

### 5.3 Estimating Execution Time

```typescript
import { 
  estimateExecutionTime, 
  formatEstimatedTime 
} from '@/lib/recordingUtils';

const recording = /* ... */;
const csvRowCount = 50;

const estimatedMs = estimateExecutionTime(recording, csvRowCount);
console.log(`Estimated time: ${formatEstimatedTime(estimatedMs)}`);
// "Estimated time: ~5m 30s"
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** Recording interface includes loopStartIndex property
- [ ] **AC-2:** Recording interface includes globalDelayMs property
- [ ] **AC-3:** Recording interface includes conditionalDefaults property
- [ ] **AC-4:** RecordingConditionalDefaults interface is defined
- [ ] **AC-5:** `src/lib/recordingUtils.ts` is created with all utilities
- [ ] **AC-6:** `createRecording()` creates valid recording with defaults
- [ ] **AC-7:** `migrateRecording()` correctly upgrades v1 recordings
- [ ] **AC-8:** `validateRecording()` catches all validation errors
- [ ] **AC-9:** `getStepsForRow()` correctly handles loop logic
- [ ] **AC-10:** Existing code compiles without modification (backward compatible)

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Backward compatible** - Existing recordings must work without modification
2. **Required new fields** - All new fields have sensible defaults
3. **Step migration** - Steps within recording must also be migrated

### Patterns to Follow

1. **Defensive defaults** - Always provide defaults for missing values
2. **Validation cascade** - Recording validation includes step validation
3. **Migration together** - Recording and steps migrate as a unit

### Edge Cases

1. **loopStartIndex >= steps.length** - Warn but don't fail
2. **Empty steps array** - Validation error
3. **Missing conditionalDefaults** - Use DEFAULT_CONDITIONAL_DEFAULTS

---

## 8. VERIFICATION COMMANDS

```bash
# Verify file exists
ls -la src/lib/recordingUtils.ts

# Run type check
npm run type-check

# Test recording creation
npx ts-node -e "
  const { createRecording, getRecordingSummary } = require('./src/lib/recordingUtils');
  const rec = createRecording(1, 'Test');
  console.log(getRecordingSummary(rec));
"
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Remove the utilities file
rm src/lib/recordingUtils.ts

# Verify types still compile
npm run type-check
```

---

## 10. REFERENCES

- FND-004: Type Definitions File
- FND-010: Step Interface Extension
- Data Layer Spec: `/future-spec/05_data-layer.md`
- Bidirectional Analysis: `BIDIRECTIONAL_ANALYSIS.md`

---

*End of Specification FND-011*
