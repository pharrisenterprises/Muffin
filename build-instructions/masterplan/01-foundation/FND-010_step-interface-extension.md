# FND-010: STEP INTERFACE EXTENSION SPECIFICATION

> **Build Card:** FND-010  
> **Category:** Foundation / Architecture  
> **Dependencies:** FND-004 (Type definitions), FND-008 (ConditionalConfig)  
> **Risk Level:** Medium  
> **Estimated Lines:** ~520

---

## 1. PURPOSE

This specification defines the extension of the existing `Step` interface to support Vision-based automation features. The Step interface is the core data structure representing a single recorded action. This extension adds:

1. **Recording method tracking** - Whether step was recorded via DOM or Vision
2. **Vision coordinates** - Pixel coordinates for Vision-based playback
3. **OCR metadata** - Text and confidence from Vision recording
4. **Per-step delays** - Custom delay before step execution
5. **Conditional configuration** - Settings for conditional click behavior

This is a **medium risk** change because Step is used throughout the codebase. All existing code must continue to work with the extended interface.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| Type Definitions | `src/types/vision.ts` | Step interface from FND-004 |
| Data Layer Spec | `/future-spec/05_data-layer.md` | Extended Step definition |
| Existing Step | `src/types/index.ts` | Current Step interface |
| Bidirectional Analysis | `BIDIRECTIONAL_ANALYSIS.md` | Gap analysis for Step |
| FND-008 | ConditionalConfig | Conditional click config type |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `src/types/vision.ts` | VERIFY | Step interface already in FND-004 |
| `src/types/index.ts` | MODIFY | Re-export extended Step |
| `src/lib/stepUtils.ts` | CREATE | Step utility functions |

### New Step Properties

| Property | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `recordedVia` | `'dom' \| 'vision'` | Yes | `'dom'` | How step was recorded |
| `coordinates` | `StepCoordinates` | No | - | Vision click coordinates |
| `ocrText` | `string` | No | - | OCR text at coordinates |
| `confidenceScore` | `number` | No | - | OCR confidence (0-100) |
| `delaySeconds` | `number` | No | - | Delay before step |
| `conditionalConfig` | `ConditionalConfig` | No | - | Conditional click settings |

---

## 4. DETAILED SPECIFICATION

### 4.1 Extended Step Interface

The complete Step interface from `src/types/vision.ts`:

```typescript
/**
 * Coordinates for Vision-recorded steps
 */
export interface StepCoordinates {
  /** Left edge X position in viewport pixels */
  x: number;
  /** Top edge Y position in viewport pixels */
  y: number;
  /** Element width in pixels */
  width: number;
  /** Element height in pixels */
  height: number;
}

/**
 * Method used to record a step
 */
export type RecordingMethod = 'dom' | 'vision';

/**
 * Types of step events
 */
export type StepEventType =
  | 'open'              // Navigate to URL
  | 'input'             // Type text into field
  | 'click'             // Click element
  | 'dropdown'          // Select dropdown option (Vision)
  | 'conditional-click' // Poll and click until timeout
  ;

/**
 * A step represents a single user action in a recording
 * Extended with Vision and delay capabilities
 */
export interface Step {
  // ===== Existing Properties (Unchanged) =====
  
  /** Unique identifier within recording (UUID) */
  id: string;

  /** Human-readable label for the step */
  label: string;

  /** Type of action to perform */
  event: StepEventType;

  /** Input value for input/type events */
  value?: string;

  /** CSS selector for DOM-based element targeting */
  selector?: string;

  /** XPath for DOM-based element targeting (fallback) */
  xpath?: string;

  /** URL for navigation (open) events */
  url?: string;

  /** Timestamp when step was recorded */
  timestamp?: number;

  /** Order in the step sequence */
  order?: number;

  // ===== NEW: Recording Method =====

  /**
   * How this step was recorded
   * - 'dom': Standard DOM event capture (selector/xpath available)
   * - 'vision': Vision/OCR fallback (coordinates available)
   * @default 'dom'
   */
  recordedVia: RecordingMethod;

  // ===== NEW: Vision Data =====

  /**
   * Element coordinates for Vision-recorded steps
   * Used for coordinate-based clicking during playback
   */
  coordinates?: StepCoordinates;

  /**
   * Text recognized by OCR at the element location
   * Stored for debugging and verification
   */
  ocrText?: string;

  /**
   * OCR confidence score (0-100)
   * Indicates reliability of the Vision recording
   */
  confidenceScore?: number;

  // ===== NEW: Time Delay =====

  /**
   * Delay in seconds to wait BEFORE this step executes
   * Overrides globalDelayMs for this specific step
   * @minimum 0
   */
  delaySeconds?: number;

  // ===== NEW: Conditional Click =====

  /**
   * Configuration for conditional-click event type
   * Required when event is 'conditional-click'
   */
  conditionalConfig?: ConditionalConfig;
}
```

### 4.2 Property Details

#### 4.2.1 recordedVia (Required)

| Attribute | Value |
|-----------|-------|
| Type | `'dom' \| 'vision'` |
| Required | Yes |
| Default | `'dom'` |

**Description:**
Indicates how this step was captured during recording. This determines which data is available for playback.

**Recording Methods:**

| Method | Available Data | Playback Strategy |
|--------|----------------|-------------------|
| `'dom'` | selector, xpath | Query DOM, click element |
| `'vision'` | coordinates, ocrText | Click at coordinates |

**Migration Note:**
Existing steps without `recordedVia` should default to `'dom'` during migration.

#### 4.2.2 coordinates (Optional)

| Attribute | Value |
|-----------|-------|
| Type | `StepCoordinates` |
| Required | Only for Vision steps |

**Description:**
The bounding box coordinates of the element when it was recorded via Vision. Used for coordinate-based clicking during playback.

**StepCoordinates Structure:**

```typescript
interface StepCoordinates {
  x: number;      // Left edge (pixels from viewport left)
  y: number;      // Top edge (pixels from viewport top)
  width: number;  // Element width in pixels
  height: number; // Element height in pixels
}
```

**Click Target Calculation:**
```typescript
const clickX = coordinates.x + (coordinates.width / 2);
const clickY = coordinates.y + (coordinates.height / 2);
```

**Validation Rules:**
- All values must be non-negative
- width and height must be positive
- x + width should not exceed viewport width (soft warning)
- y + height should not exceed viewport height (soft warning)

#### 4.2.3 ocrText (Optional)

| Attribute | Value |
|-----------|-------|
| Type | `string` |
| Required | No (but recommended for Vision steps) |

**Description:**
The text recognized by OCR at the element's location during recording. Stored for:
- Debugging and verification
- User display in UI
- Re-finding element if coordinates fail

**Example Values:**
- `"Submit"` - Button text
- `"Enter your email"` - Input placeholder
- `"Allow for this chat"` - Approval button

#### 4.2.4 confidenceScore (Optional)

| Attribute | Value |
|-----------|-------|
| Type | `number` |
| Required | No |
| Range | 0-100 |

**Description:**
The OCR confidence score from when the step was recorded. Indicates how reliable the Vision capture was.

**Interpretation:**

| Score | Reliability | UI Indicator |
|-------|-------------|--------------|
| 80-100 | High | Green badge |
| 60-79 | Medium | Yellow badge |
| 40-59 | Low | Orange badge |
| 0-39 | Very Low | Red badge |

#### 4.2.5 delaySeconds (Optional)

| Attribute | Value |
|-----------|-------|
| Type | `number` |
| Required | No |
| Minimum | 0 |
| Unit | Seconds |

**Description:**
Custom delay to wait BEFORE this step executes. Overrides the recording's `globalDelayMs` for this specific step.

**Delay Priority:**
1. Step-level `delaySeconds` (if set, converted to ms)
2. Recording-level `globalDelayMs` (if set)
3. No delay (0)

**Conversion:**
```typescript
const delayMs = step.delaySeconds 
  ? step.delaySeconds * 1000 
  : recording.globalDelayMs;
```

**Use Cases:**
- Wait for slow-loading elements
- Allow animations to complete
- Give user time to review (for debugging)

#### 4.2.6 conditionalConfig (Optional)

| Attribute | Value |
|-----------|-------|
| Type | `ConditionalConfig` |
| Required | Only for `event: 'conditional-click'` |

**Description:**
Configuration for conditional click behavior. See FND-008 for full specification.

**Validation:**
- Required when `event === 'conditional-click'`
- Must have at least one search term
- Must have positive timeout

---

### 4.3 Backward Compatibility

All new properties are either optional or have sensible defaults, ensuring backward compatibility:

```typescript
// Old step (v1) still valid:
const oldStep = {
  id: 'step-1',
  label: 'Click button',
  event: 'click',
  selector: '#submit-btn',
};

// After migration, becomes:
const migratedStep = {
  id: 'step-1',
  label: 'Click button',
  event: 'click',
  selector: '#submit-btn',
  recordedVia: 'dom',  // Added by migration
};
```

---

### 4.4 Utility Functions

Create `src/lib/stepUtils.ts`:

```typescript
/**
 * @fileoverview Utility functions for Step operations
 * @module lib/stepUtils
 */

import {
  Step,
  StepCoordinates,
  StepEventType,
  RecordingMethod,
  ConditionalConfig,
  DEFAULT_STEP,
} from '@/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Creates a new Step with default values
 * @param overrides - Properties to set
 * @returns Complete Step object
 */
export function createStep(overrides: Partial<Step> = {}): Step {
  return {
    id: uuidv4(),
    label: '',
    event: 'click',
    recordedVia: 'dom',
    ...overrides,
  };
}

/**
 * Creates a DOM-recorded step
 * @param label - Step label
 * @param event - Event type
 * @param selector - CSS selector
 * @param options - Additional options
 * @returns DOM step
 */
export function createDomStep(
  label: string,
  event: StepEventType,
  selector: string,
  options: {
    xpath?: string;
    value?: string;
    url?: string;
  } = {}
): Step {
  return createStep({
    label,
    event,
    selector,
    recordedVia: 'dom',
    ...options,
  });
}

/**
 * Creates a Vision-recorded step
 * @param label - Step label
 * @param event - Event type
 * @param coordinates - Click coordinates
 * @param options - Additional options
 * @returns Vision step
 */
export function createVisionStep(
  label: string,
  event: StepEventType,
  coordinates: StepCoordinates,
  options: {
    ocrText?: string;
    confidenceScore?: number;
    value?: string;
  } = {}
): Step {
  return createStep({
    label,
    event,
    coordinates,
    recordedVia: 'vision',
    ...options,
  });
}

/**
 * Creates a conditional click step
 * @param label - Step label
 * @param config - Conditional configuration
 * @returns Conditional click step
 */
export function createConditionalStep(
  label: string,
  config: ConditionalConfig
): Step {
  return createStep({
    label,
    event: 'conditional-click',
    recordedVia: 'vision',
    conditionalConfig: config,
  });
}

/**
 * Type guard: Check if step was recorded via Vision
 * @param step - Step to check
 * @returns True if Vision-recorded
 */
export function isVisionStep(step: Step): boolean {
  return step.recordedVia === 'vision';
}

/**
 * Type guard: Check if step was recorded via DOM
 * @param step - Step to check
 * @returns True if DOM-recorded
 */
export function isDomStep(step: Step): boolean {
  return step.recordedVia === 'dom';
}

/**
 * Type guard: Check if step has coordinates
 * @param step - Step to check
 * @returns True if coordinates are present
 */
export function hasCoordinates(
  step: Step
): step is Step & { coordinates: StepCoordinates } {
  return step.coordinates !== undefined;
}

/**
 * Type guard: Check if step is conditional click
 * @param step - Step to check
 * @returns True if conditional click
 */
export function isConditionalClick(
  step: Step
): step is Step & { conditionalConfig: ConditionalConfig } {
  return (
    step.event === 'conditional-click' && step.conditionalConfig !== undefined
  );
}

/**
 * Type guard: Check if step has a custom delay
 * @param step - Step to check
 * @returns True if delay is set
 */
export function hasDelay(step: Step): step is Step & { delaySeconds: number } {
  return step.delaySeconds !== undefined && step.delaySeconds > 0;
}

/**
 * Gets the effective delay for a step in milliseconds
 * @param step - Step to check
 * @param globalDelayMs - Recording's global delay
 * @returns Delay in milliseconds
 */
export function getEffectiveDelayMs(step: Step, globalDelayMs: number): number {
  if (step.delaySeconds !== undefined && step.delaySeconds > 0) {
    return step.delaySeconds * 1000;
  }
  return globalDelayMs;
}

/**
 * Gets click coordinates for a step
 * @param step - Step to get coordinates from
 * @returns Center coordinates or null
 */
export function getClickCoordinates(
  step: Step
): { x: number; y: number } | null {
  if (!step.coordinates) {
    return null;
  }
  
  return {
    x: step.coordinates.x + step.coordinates.width / 2,
    y: step.coordinates.y + step.coordinates.height / 2,
  };
}

/**
 * Validates a Step object
 * @param step - Step to validate
 * @returns Validation result
 */
export function validateStep(step: Step): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Required fields
  if (!step.id || step.id.trim() === '') {
    errors.push('Step ID is required');
  }

  if (!step.label || step.label.trim() === '') {
    errors.push('Step label is required');
  }

  if (!step.event) {
    errors.push('Step event type is required');
  }

  if (!step.recordedVia) {
    errors.push('recordedVia is required');
  }

  // Event-specific validation
  switch (step.event) {
    case 'open':
      if (!step.url) {
        errors.push('URL is required for open events');
      }
      break;

    case 'input':
      if (step.recordedVia === 'dom' && !step.selector && !step.xpath) {
        errors.push('Selector or XPath is required for DOM input events');
      }
      if (step.recordedVia === 'vision' && !step.coordinates) {
        errors.push('Coordinates are required for Vision input events');
      }
      break;

    case 'click':
      if (step.recordedVia === 'dom' && !step.selector && !step.xpath) {
        errors.push('Selector or XPath is required for DOM click events');
      }
      if (step.recordedVia === 'vision' && !step.coordinates) {
        errors.push('Coordinates are required for Vision click events');
      }
      break;

    case 'conditional-click':
      if (!step.conditionalConfig) {
        errors.push('conditionalConfig is required for conditional-click');
      } else {
        if (!step.conditionalConfig.searchTerms?.length) {
          errors.push('At least one search term is required');
        }
        if (step.conditionalConfig.timeoutSeconds <= 0) {
          errors.push('Timeout must be greater than 0');
        }
      }
      break;
  }

  // Delay validation
  if (step.delaySeconds !== undefined && step.delaySeconds < 0) {
    errors.push('Delay cannot be negative');
  }

  // Coordinates validation
  if (step.coordinates) {
    if (step.coordinates.x < 0 || step.coordinates.y < 0) {
      errors.push('Coordinates cannot be negative');
    }
    if (step.coordinates.width <= 0 || step.coordinates.height <= 0) {
      errors.push('Dimensions must be positive');
    }
  }

  // Confidence validation
  if (step.confidenceScore !== undefined) {
    if (step.confidenceScore < 0 || step.confidenceScore > 100) {
      errors.push('Confidence score must be between 0 and 100');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Migrates a v1 step to v2 format
 * @param step - Old step (may be missing recordedVia)
 * @returns Migrated step with recordedVia
 */
export function migrateStep(step: Partial<Step> & { id: string }): Step {
  return {
    ...step,
    label: step.label || '',
    event: step.event || 'click',
    recordedVia: step.recordedVia || 'dom',
  } as Step;
}

/**
 * Clones a step with a new ID
 * @param step - Step to clone
 * @returns New step with unique ID
 */
export function cloneStep(step: Step): Step {
  return {
    ...step,
    id: uuidv4(),
  };
}

/**
 * Creates a step summary string for display
 * @param step - Step to summarize
 * @returns Human-readable summary
 */
export function stepToString(step: Step): string {
  const method = step.recordedVia === 'vision' ? '📷' : '🖱️';
  const delay = step.delaySeconds ? ` ⏱️${step.delaySeconds}s` : '';
  const conditional = step.event === 'conditional-click' ? ' 🔄' : '';
  
  return `${method} ${step.label}${delay}${conditional}`;
}
```

---

## 5. CODE EXAMPLES

### 5.1 Creating Different Step Types

```typescript
import {
  createDomStep,
  createVisionStep,
  createConditionalStep,
} from '@/lib/stepUtils';
import { createConditionalConfig } from '@/lib/conditionalConfigUtils';

// DOM step
const domStep = createDomStep('Click Submit', 'click', '#submit-btn', {
  xpath: '/html/body/form/button',
});

// Vision step
const visionStep = createVisionStep(
  'Click Allow Button',
  'click',
  { x: 100, y: 200, width: 80, height: 32 },
  { ocrText: 'Allow', confidenceScore: 85 }
);

// Conditional click step
const conditionalStep = createConditionalStep(
  'Handle Approvals',
  createConditionalConfig({
    enabled: true,
    searchTerms: ['Allow', 'Keep'],
    timeoutSeconds: 120,
  })
);
```

### 5.2 Working with Step Properties

```typescript
import {
  isVisionStep,
  hasCoordinates,
  getClickCoordinates,
  getEffectiveDelayMs,
} from '@/lib/stepUtils';

function executeStep(step: Step, globalDelayMs: number) {
  // Get delay
  const delayMs = getEffectiveDelayMs(step, globalDelayMs);
  if (delayMs > 0) {
    await sleep(delayMs);
  }
  
  // Execute based on recording method
  if (isVisionStep(step) && hasCoordinates(step)) {
    const coords = getClickCoordinates(step);
    await clickAt(coords.x, coords.y);
  } else {
    await clickElement(step.selector);
  }
}
```

### 5.3 Validating Steps

```typescript
import { validateStep } from '@/lib/stepUtils';

const step = {
  id: 'step-1',
  label: '',  // Invalid: empty
  event: 'click',
  recordedVia: 'dom',
  // Missing selector for DOM click
};

const result = validateStep(step);
console.log(result.valid);  // false
console.log(result.errors);
// ['Step label is required', 'Selector or XPath is required for DOM click events']
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** Step interface includes all new properties (recordedVia, coordinates, etc.)
- [ ] **AC-2:** StepCoordinates interface is defined
- [ ] **AC-3:** RecordingMethod type is defined as union 'dom' | 'vision'
- [ ] **AC-4:** StepEventType includes 'conditional-click'
- [ ] **AC-5:** `src/lib/stepUtils.ts` is created with all utilities
- [ ] **AC-6:** Type guards (isVisionStep, hasCoordinates, etc.) work correctly
- [ ] **AC-7:** validateStep() catches all validation errors
- [ ] **AC-8:** Existing code compiles without modification (backward compatible)
- [ ] **AC-9:** migrateStep() correctly upgrades v1 steps
- [ ] **AC-10:** TypeScript compiles without errors

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Backward compatible** - Existing steps must work without modification
2. **recordedVia required** - All new steps must specify recording method
3. **Conditional validation** - conditionalConfig required only for conditional-click

### Patterns to Follow

1. **Type guards** - Use is* and has* functions for type narrowing
2. **Factory functions** - Use create* functions for step creation
3. **Validation before save** - Always validate before persisting

### Edge Cases

1. **Missing recordedVia** - Default to 'dom' during migration
2. **Vision step without coordinates** - Validation error
3. **Conditional without config** - Validation error

---

## 8. VERIFICATION COMMANDS

```bash
# Verify file exists
ls -la src/lib/stepUtils.ts

# Run type check
npm run type-check

# Test step creation
npx ts-node -e "
  const { createVisionStep, stepToString } = require('./src/lib/stepUtils');
  const step = createVisionStep('Test', 'click', { x: 100, y: 200, width: 50, height: 30 });
  console.log(stepToString(step));
"
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Remove the utilities file
rm src/lib/stepUtils.ts

# Verify types still compile
npm run type-check
```

---

## 10. REFERENCES

- FND-004: Type Definitions File
- FND-008: ConditionalConfig Interface
- Data Layer Spec: `/future-spec/05_data-layer.md`
- Bidirectional Analysis: `BIDIRECTIONAL_ANALYSIS.md`

---

*End of Specification FND-010*
