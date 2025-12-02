# DAT-004: STEP REPOSITORY SPECIFICATION

> **Build Card:** DAT-004  
> **Category:** Data Layer  
> **Dependencies:** DAT-001 (IndexedDB Schema v2), FND-010 (Step extension)  
> **Risk Level:** Low  
> **Estimated Lines:** ~400

---

## 1. PURPOSE

This specification defines the Step Repository, a data access layer that provides methods for manipulating steps within recordings. Unlike the Recording Repository which manages entire recordings, this repository focuses on:

1. **Individual step operations** - Add, update, remove, reorder steps
2. **Step validation** - Ensure steps meet v2 requirements
3. **Bulk operations** - Efficient multi-step updates
4. **Step queries** - Find steps by type, recording method, etc.
5. **Step transformations** - Convert between DOM and Vision steps

Steps are embedded within recordings, so this repository works in coordination with the Recording Repository.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| FND-010 | Step extension | Extended Step interface |
| DAT-003 | Recording repository | Parent repository pattern |
| Data Layer Spec | `/future-spec/05_data-layer.md` | Step operations |
| Step Utils | `src/lib/stepUtils.ts` | Step utilities |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `src/repositories/stepRepository.ts` | CREATE | Step repository implementation |
| `src/repositories/index.ts` | MODIFY | Add step repository export |

### Repository Methods

| Method | Description |
|--------|-------------|
| `getByRecordingId` | Get all steps for a recording |
| `getById` | Get single step by ID within a recording |
| `addStep` | Add step to recording |
| `updateStep` | Update single step |
| `removeStep` | Remove step from recording |
| `reorderSteps` | Change step order |
| `duplicateStep` | Clone a step |
| `bulkUpdate` | Update multiple steps |
| `findByType` | Find steps by event type |
| `findVisionSteps` | Get all Vision-recorded steps |

---

## 4. DETAILED SPECIFICATION

### 4.1 Step Access Pattern

Steps are stored within recordings, not as separate entities:

```
Recording
├── id: 1
├── name: "My Automation"
├── steps: [
│   ├── { id: "step-1", ... }
│   ├── { id: "step-2", ... }
│   └── { id: "step-3", ... }
│   ]
└── ...
```

The Step Repository provides convenience methods for accessing and modifying steps without manually managing the parent recording.

### 4.2 Repository Implementation

Create `src/repositories/stepRepository.ts`:

```typescript
/**
 * @fileoverview Step Repository - Data access layer for steps within recordings
 * @module repositories/stepRepository
 * 
 * This repository provides methods for manipulating steps within recordings.
 * Steps are embedded in recordings, so operations update the parent recording.
 */

import { db } from '@/background/indexedDB';
import { recordingRepository } from './recordingRepository';
import type { Step, Recording, StepEventType, RecordingMethod } from '@/types';
import { validateStep, createStep, cloneStep } from '@/lib/stepUtils';
import { v4 as uuidv4 } from 'uuid';

/**
 * Result of a step operation
 */
export interface StepOperationResult {
  success: boolean;
  step?: Step;
  error?: string;
}

/**
 * Options for finding steps
 */
export interface StepQueryOptions {
  /** Filter by event type */
  eventType?: StepEventType;
  /** Filter by recording method */
  recordedVia?: RecordingMethod;
  /** Filter by having conditional config */
  hasConditionalConfig?: boolean;
  /** Filter by having delay */
  hasDelay?: boolean;
}

/**
 * Ensures a step has v2 format
 */
function ensureStepV2Format(step: any): Step {
  return {
    ...step,
    id: step.id || uuidv4(),
    recordedVia: step.recordedVia ?? 'dom',
  };
}

/**
 * Step Repository
 * 
 * Provides data access methods for Step entities within recordings.
 * All operations automatically update the parent recording.
 */
export const stepRepository = {
  /**
   * Gets all steps for a recording
   * @param recordingId - Recording ID
   * @returns Array of steps or empty array if recording not found
   */
  async getByRecordingId(recordingId: number): Promise<Step[]> {
    const recording = await recordingRepository.getById(recordingId);
    
    if (!recording) {
      return [];
    }
    
    return recording.steps.map(ensureStepV2Format);
  },

  /**
   * Gets a single step by ID within a recording
   * @param recordingId - Recording ID
   * @param stepId - Step ID
   * @returns Step or undefined
   */
  async getById(recordingId: number, stepId: string): Promise<Step | undefined> {
    const steps = await this.getByRecordingId(recordingId);
    return steps.find((s) => s.id === stepId);
  },

  /**
   * Gets a step by index within a recording
   * @param recordingId - Recording ID
   * @param index - Step index
   * @returns Step or undefined
   */
  async getByIndex(recordingId: number, index: number): Promise<Step | undefined> {
    const steps = await this.getByRecordingId(recordingId);
    return steps[index];
  },

  /**
   * Adds a new step to a recording
   * @param recordingId - Recording ID
   * @param step - Step to add (ID will be generated if not provided)
   * @param index - Optional index to insert at (appends if not specified)
   * @returns Operation result with new step
   */
  async addStep(
    recordingId: number,
    step: Partial<Step>,
    index?: number
  ): Promise<StepOperationResult> {
    try {
      const recording = await recordingRepository.getById(recordingId);
      
      if (!recording) {
        return { success: false, error: `Recording not found: ${recordingId}` };
      }
      
      // Create step with defaults
      const newStep = createStep({
        ...step,
        id: step.id || uuidv4(),
        order: index ?? recording.steps.length,
      });
      
      // Validate
      const validation = validateStep(newStep);
      if (!validation.valid) {
        return { success: false, error: validation.errors.join(', ') };
      }
      
      // Insert at index or append
      const newSteps = [...recording.steps];
      if (index !== undefined && index >= 0 && index <= newSteps.length) {
        newSteps.splice(index, 0, newStep);
      } else {
        newSteps.push(newStep);
      }
      
      // Update order for all steps
      const reorderedSteps = newSteps.map((s, i) => ({ ...s, order: i }));
      
      // Save
      await recordingRepository.update(recordingId, { steps: reorderedSteps });
      
      return { success: true, step: newStep };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Updates a step within a recording
   * @param recordingId - Recording ID
   * @param stepId - Step ID
   * @param updates - Partial step updates
   * @returns Operation result with updated step
   */
  async updateStep(
    recordingId: number,
    stepId: string,
    updates: Partial<Omit<Step, 'id'>>
  ): Promise<StepOperationResult> {
    try {
      const recording = await recordingRepository.getById(recordingId);
      
      if (!recording) {
        return { success: false, error: `Recording not found: ${recordingId}` };
      }
      
      const stepIndex = recording.steps.findIndex((s) => s.id === stepId);
      
      if (stepIndex === -1) {
        return { success: false, error: `Step not found: ${stepId}` };
      }
      
      // Merge updates
      const updatedStep: Step = {
        ...recording.steps[stepIndex],
        ...updates,
        id: stepId, // Ensure ID is not changed
      };
      
      // Validate
      const validation = validateStep(updatedStep);
      if (!validation.valid) {
        return { success: false, error: validation.errors.join(', ') };
      }
      
      // Update steps array
      const newSteps = [...recording.steps];
      newSteps[stepIndex] = updatedStep;
      
      // Save
      await recordingRepository.update(recordingId, { steps: newSteps });
      
      return { success: true, step: updatedStep };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Removes a step from a recording
   * @param recordingId - Recording ID
   * @param stepId - Step ID
   * @returns Operation result
   */
  async removeStep(recordingId: number, stepId: string): Promise<StepOperationResult> {
    try {
      const recording = await recordingRepository.getById(recordingId);
      
      if (!recording) {
        return { success: false, error: `Recording not found: ${recordingId}` };
      }
      
      const stepIndex = recording.steps.findIndex((s) => s.id === stepId);
      
      if (stepIndex === -1) {
        return { success: false, error: `Step not found: ${stepId}` };
      }
      
      // Remove step
      const removedStep = recording.steps[stepIndex];
      const newSteps = recording.steps.filter((s) => s.id !== stepId);
      
      // Re-order remaining steps
      const reorderedSteps = newSteps.map((s, i) => ({ ...s, order: i }));
      
      // Save
      await recordingRepository.update(recordingId, { steps: reorderedSteps });
      
      return { success: true, step: removedStep };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Reorders steps within a recording
   * @param recordingId - Recording ID
   * @param stepIds - Array of step IDs in desired order
   * @returns Operation result
   */
  async reorderSteps(
    recordingId: number,
    stepIds: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const recording = await recordingRepository.getById(recordingId);
      
      if (!recording) {
        return { success: false, error: `Recording not found: ${recordingId}` };
      }
      
      // Validate all step IDs exist
      const existingIds = new Set(recording.steps.map((s) => s.id));
      for (const id of stepIds) {
        if (!existingIds.has(id)) {
          return { success: false, error: `Step not found: ${id}` };
        }
      }
      
      // Check all steps are included
      if (stepIds.length !== recording.steps.length) {
        return { success: false, error: 'Step count mismatch' };
      }
      
      // Create step map for reordering
      const stepMap = new Map(recording.steps.map((s) => [s.id, s]));
      
      // Reorder
      const reorderedSteps = stepIds.map((id, index) => ({
        ...stepMap.get(id)!,
        order: index,
      }));
      
      // Save
      await recordingRepository.update(recordingId, { steps: reorderedSteps });
      
      return { success: true };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Moves a step to a new position
   * @param recordingId - Recording ID
   * @param stepId - Step ID to move
   * @param newIndex - New position index
   * @returns Operation result
   */
  async moveStep(
    recordingId: number,
    stepId: string,
    newIndex: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const recording = await recordingRepository.getById(recordingId);
      
      if (!recording) {
        return { success: false, error: `Recording not found: ${recordingId}` };
      }
      
      const currentIndex = recording.steps.findIndex((s) => s.id === stepId);
      
      if (currentIndex === -1) {
        return { success: false, error: `Step not found: ${stepId}` };
      }
      
      if (newIndex < 0 || newIndex >= recording.steps.length) {
        return { success: false, error: `Invalid index: ${newIndex}` };
      }
      
      // Remove from current position
      const newSteps = [...recording.steps];
      const [movedStep] = newSteps.splice(currentIndex, 1);
      
      // Insert at new position
      newSteps.splice(newIndex, 0, movedStep);
      
      // Re-order
      const reorderedSteps = newSteps.map((s, i) => ({ ...s, order: i }));
      
      // Save
      await recordingRepository.update(recordingId, { steps: reorderedSteps });
      
      return { success: true };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Duplicates a step within a recording
   * @param recordingId - Recording ID
   * @param stepId - Step ID to duplicate
   * @param insertAfter - Whether to insert after original (default: true)
   * @returns Operation result with new step
   */
  async duplicateStep(
    recordingId: number,
    stepId: string,
    insertAfter: boolean = true
  ): Promise<StepOperationResult> {
    try {
      const recording = await recordingRepository.getById(recordingId);
      
      if (!recording) {
        return { success: false, error: `Recording not found: ${recordingId}` };
      }
      
      const stepIndex = recording.steps.findIndex((s) => s.id === stepId);
      
      if (stepIndex === -1) {
        return { success: false, error: `Step not found: ${stepId}` };
      }
      
      // Clone the step
      const clonedStep = cloneStep(recording.steps[stepIndex]);
      clonedStep.label = `${clonedStep.label} (copy)`;
      
      // Insert
      const insertIndex = insertAfter ? stepIndex + 1 : stepIndex;
      
      return this.addStep(recordingId, clonedStep, insertIndex);
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Updates multiple steps at once
   * @param recordingId - Recording ID
   * @param updates - Map of step ID to updates
   * @returns Number of steps updated
   */
  async bulkUpdate(
    recordingId: number,
    updates: Map<string, Partial<Omit<Step, 'id'>>>
  ): Promise<{ success: boolean; updated: number; error?: string }> {
    try {
      const recording = await recordingRepository.getById(recordingId);
      
      if (!recording) {
        return { success: false, updated: 0, error: `Recording not found: ${recordingId}` };
      }
      
      let updated = 0;
      const newSteps = recording.steps.map((step) => {
        const stepUpdates = updates.get(step.id);
        if (stepUpdates) {
          updated++;
          return { ...step, ...stepUpdates };
        }
        return step;
      });
      
      // Save
      await recordingRepository.update(recordingId, { steps: newSteps });
      
      return { success: true, updated };
      
    } catch (error) {
      return {
        success: false,
        updated: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Finds steps matching criteria within a recording
   * @param recordingId - Recording ID
   * @param options - Query options
   * @returns Matching steps
   */
  async find(recordingId: number, options: StepQueryOptions): Promise<Step[]> {
    const steps = await this.getByRecordingId(recordingId);
    
    return steps.filter((step) => {
      if (options.eventType && step.event !== options.eventType) {
        return false;
      }
      if (options.recordedVia && step.recordedVia !== options.recordedVia) {
        return false;
      }
      if (options.hasConditionalConfig !== undefined) {
        const has = step.conditionalConfig !== undefined;
        if (has !== options.hasConditionalConfig) return false;
      }
      if (options.hasDelay !== undefined) {
        const has = step.delaySeconds !== undefined && step.delaySeconds > 0;
        if (has !== options.hasDelay) return false;
      }
      return true;
    });
  },

  /**
   * Gets all Vision-recorded steps in a recording
   * @param recordingId - Recording ID
   * @returns Vision steps
   */
  async findVisionSteps(recordingId: number): Promise<Step[]> {
    return this.find(recordingId, { recordedVia: 'vision' });
  },

  /**
   * Gets all conditional click steps in a recording
   * @param recordingId - Recording ID
   * @returns Conditional click steps
   */
  async findConditionalSteps(recordingId: number): Promise<Step[]> {
    return this.find(recordingId, { eventType: 'conditional-click' });
  },

  /**
   * Counts steps in a recording
   * @param recordingId - Recording ID
   * @returns Step count
   */
  async count(recordingId: number): Promise<number> {
    const steps = await this.getByRecordingId(recordingId);
    return steps.length;
  },

  /**
   * Clears all steps from a recording
   * @param recordingId - Recording ID
   * @returns Operation result
   */
  async clearSteps(recordingId: number): Promise<{ success: boolean; error?: string }> {
    try {
      await recordingRepository.update(recordingId, { steps: [] });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Replaces all steps in a recording
   * @param recordingId - Recording ID
   * @param steps - New steps array
   * @returns Operation result
   */
  async replaceAll(
    recordingId: number,
    steps: Step[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Ensure all steps have IDs and v2 format
      const preparedSteps = steps.map((step, index) => ({
        ...ensureStepV2Format(step),
        id: step.id || uuidv4(),
        order: index,
      }));
      
      await recordingRepository.update(recordingId, { steps: preparedSteps });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
};

// Export type for the repository
export type StepRepository = typeof stepRepository;
```

### 4.3 Update Repository Index

Update `src/repositories/index.ts`:

```typescript
/**
 * @fileoverview Repository exports
 * @module repositories
 */

export { recordingRepository } from './recordingRepository';
export type { 
  RecordingQueryOptions, 
  PaginatedResult,
  RecordingRepository,
} from './recordingRepository';

export { stepRepository } from './stepRepository';
export type {
  StepOperationResult,
  StepQueryOptions,
  StepRepository,
} from './stepRepository';
```

---

## 5. CODE EXAMPLES

### 5.1 Basic Step Operations

```typescript
import { stepRepository } from '@/repositories';

// Get all steps
const steps = await stepRepository.getByRecordingId(1);

// Get single step
const step = await stepRepository.getById(1, 'step-abc123');

// Add a new step
const result = await stepRepository.addStep(1, {
  label: 'Click button',
  event: 'click',
  selector: '#submit',
  recordedVia: 'dom',
});

if (result.success) {
  console.log('Added step:', result.step);
}

// Update step
await stepRepository.updateStep(1, 'step-abc123', {
  label: 'Updated label',
  delaySeconds: 2,
});

// Remove step
await stepRepository.removeStep(1, 'step-abc123');
```

### 5.2 Reordering Steps

```typescript
import { stepRepository } from '@/repositories';

// Move a step to position 0
await stepRepository.moveStep(1, 'step-abc123', 0);

// Reorder all steps
await stepRepository.reorderSteps(1, [
  'step-3',
  'step-1',
  'step-2',
]);

// Duplicate a step
const duplicateResult = await stepRepository.duplicateStep(1, 'step-abc123');
```

### 5.3 Finding Steps

```typescript
import { stepRepository } from '@/repositories';

// Find all Vision steps
const visionSteps = await stepRepository.findVisionSteps(1);

// Find steps with specific criteria
const clickSteps = await stepRepository.find(1, {
  eventType: 'click',
  recordedVia: 'dom',
});

// Find steps with delays
const delayedSteps = await stepRepository.find(1, {
  hasDelay: true,
});
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** `src/repositories/stepRepository.ts` is created
- [ ] **AC-2:** `getByRecordingId` returns all steps for a recording
- [ ] **AC-3:** `addStep` adds step at correct index
- [ ] **AC-4:** `updateStep` updates step and validates
- [ ] **AC-5:** `removeStep` removes step and reorders
- [ ] **AC-6:** `reorderSteps` changes step order correctly
- [ ] **AC-7:** `moveStep` moves single step to new position
- [ ] **AC-8:** `duplicateStep` creates new step with new ID
- [ ] **AC-9:** `find` filters by all criteria
- [ ] **AC-10:** All operations update parent recording

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Steps exist in recordings** - No standalone step storage
2. **Maintain order** - Always update order field after changes
3. **Validate before save** - Reject invalid steps

### Patterns to Follow

1. **Return results** - Always return success/error status
2. **Ensure v2 format** - Apply defaults to all returned steps
3. **Atomic updates** - Update whole recording for step changes

### Edge Cases

1. **Invalid index** - Handle gracefully
2. **Non-existent step** - Return error
3. **Empty recording** - Handle empty steps array

---

## 8. VERIFICATION COMMANDS

```bash
# Verify file exists
ls -la src/repositories/stepRepository.ts

# Run type check
npm run type-check

# Test step operations manually in DevTools
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Remove step repository
rm src/repositories/stepRepository.ts

# Revert index.ts changes
# Remove stepRepository export
```

---

## 10. REFERENCES

- DAT-003: Recording Repository
- FND-010: Step Interface Extension
- Data Layer Spec: `/future-spec/05_data-layer.md`

---

*End of Specification DAT-004*
