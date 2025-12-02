# FND-004: TYPE DEFINITIONS FILE SPECIFICATION

> **Build Card:** FND-004  
> **Category:** Foundation / Architecture  
> **Dependencies:** None  
> **Risk Level:** Low  
> **Estimated Lines:** ~520

---

## 1. PURPOSE

This specification defines the creation of a centralized type definitions file for all Vision-related TypeScript interfaces and types. This file serves as the single source of truth for:

1. **Vision Engine types** - Configuration, results, and targets
2. **Extended Step interface** - New fields for Vision and delay features
3. **Extended Recording interface** - Loop, delay, and conditional defaults
4. **Message types** - Communication between extension components
5. **Utility types** - Shared helper types

Centralizing types ensures:
- Consistent type usage across the codebase
- Easy refactoring and maintenance
- Clear documentation via JSDoc comments
- Better IDE autocomplete and error detection

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| Data Layer Spec | `/future-spec/05_data-layer.md` | Type definitions (lines 86-400) |
| API Contracts | `/future-spec/06_api-contracts.md` | Message types |
| Feature Specs | `/future-spec/03_feature-specs.md` | Configuration options |
| Existing types | `/src/types/index.ts` | Current type structure |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `src/types/vision.ts` | CREATE | All Vision-related type definitions |
| `src/types/index.ts` | MODIFY | Re-export vision types |

### Exports Summary

| Export Name | Type | Description |
|-------------|------|-------------|
| `VisionConfig` | interface | OCR configuration options |
| `TextResult` | interface | OCR recognition result |
| `ClickTarget` | interface | Vision click target with coordinates |
| `ConditionalConfig` | interface | Conditional click configuration |
| `ConditionalClickResult` | interface | Result of conditional click operation |
| `StepEventType` | type | Union of step event types |
| `RecordingMethod` | type | 'dom' \| 'vision' |
| `Step` | interface | Extended step with Vision fields |
| `Recording` | interface | Extended recording with loop/delay |
| `VisionMessage` | type | Vision-related message types |
| `VisionMessageType` | enum | Message type constants |

---

## 4. DETAILED SPECIFICATION

### 4.1 File Location and Structure

Create the file at: `src/types/vision.ts`

```
src/
└── types/
    ├── index.ts      # Main exports (modify to include vision)
    └── vision.ts     # NEW: All Vision-related types
```

### 4.2 Complete Type Definitions

The `vision.ts` file must contain the following complete type definitions:

```typescript
/**
 * @fileoverview Vision-related type definitions for Muffin Lite
 * @module types/vision
 * @version 2.1.0
 * 
 * This file contains all TypeScript interfaces and types related to:
 * - Vision Engine (OCR/Tesseract.js)
 * - Extended Step interface (Vision, delays, conditionals)
 * - Extended Recording interface (loops, global delays)
 * - Message passing types
 */

// ============================================================================
// VISION ENGINE TYPES
// ============================================================================

/**
 * Configuration options for the Vision Engine (Tesseract.js wrapper)
 * Controls OCR behavior and polling parameters
 */
export interface VisionConfig {
  /**
   * Minimum OCR confidence score (0-100) to consider a match valid
   * Lower values = more matches but more false positives
   * Higher values = fewer matches but more accurate
   * @default 60
   */
  confidenceThreshold: number;

  /**
   * Milliseconds between OCR scans during polling operations
   * Used by conditional clicks and element searching
   * @default 1000
   */
  pollIntervalMs: number;

  /**
   * Number of scroll attempts when searching for text not currently visible
   * Each attempt scrolls the viewport and re-scans
   * @default 3
   */
  scrollRetries: number;

  /**
   * Whether to use SIMD-optimized WASM if available
   * Improves performance on supported browsers
   * @default true
   */
  useSIMD?: boolean;

  /**
   * Language code for OCR recognition
   * @default 'eng'
   */
  language?: string;
}

/**
 * Default Vision configuration values
 */
export const DEFAULT_VISION_CONFIG: VisionConfig = {
  confidenceThreshold: 60,
  pollIntervalMs: 1000,
  scrollRetries: 3,
  useSIMD: true,
  language: 'eng',
};

/**
 * Result of an OCR text recognition operation
 * Contains recognized text, confidence, and bounding box
 */
export interface TextResult {
  /** The recognized text string */
  text: string;

  /** Confidence score from 0-100 */
  confidence: number;

  /** Bounding box coordinates in viewport pixels */
  bounds: {
    /** Left edge X coordinate */
    x: number;
    /** Top edge Y coordinate */
    y: number;
    /** Width of the bounding box */
    width: number;
    /** Height of the bounding box */
    height: number;
    /** Computed center X coordinate */
    centerX: number;
    /** Computed center Y coordinate */
    centerY: number;
  };
}

/**
 * Target for a Vision-based click operation
 * Contains coordinates and optional metadata
 */
export interface ClickTarget {
  /** Center X coordinate to click */
  x: number;

  /** Center Y coordinate to click */
  y: number;

  /** Width of the target element (for debugging) */
  width?: number;

  /** Height of the target element (for debugging) */
  height?: number;

  /** The text that was matched */
  matchedText?: string;

  /** Confidence score of the match */
  confidence?: number;
}

// ============================================================================
// CONDITIONAL CLICK TYPES
// ============================================================================

/**
 * Configuration for conditional click operations
 * Defines polling behavior for approval buttons and similar elements
 */
export interface ConditionalConfig {
  /**
   * Whether conditional click is enabled for this step
   * @default false
   */
  enabled: boolean;

  /**
   * Text strings to search for on screen
   * Any match will trigger the action
   * @example ['Allow', 'Keep', 'Continue']
   */
  searchTerms: string[];

  /**
   * Maximum seconds to wait after last successful click
   * Polling stops when timeout reached without finding new matches
   * @default 120
   */
  timeoutSeconds: number;

  /**
   * Milliseconds between OCR scans
   * Lower = more responsive but higher CPU usage
   * @default 1000
   */
  pollIntervalMs: number;

  /**
   * Type of interaction when text is found
   * @default 'click'
   */
  interactionType: 'click' | 'type' | 'scroll';

  /**
   * Text to type (only used when interactionType is 'type')
   */
  typeText?: string;

  /**
   * For dropdown events: the option text to select
   */
  dropdownOption?: string;
}

/**
 * Default conditional configuration values
 */
export const DEFAULT_CONDITIONAL_CONFIG: ConditionalConfig = {
  enabled: false,
  searchTerms: ['Allow', 'Keep'],
  timeoutSeconds: 120,
  pollIntervalMs: 1000,
  interactionType: 'click',
};

/**
 * Result of a conditional click operation
 * Contains statistics about the polling session
 */
export interface ConditionalClickResult {
  /** Whether the operation completed successfully */
  success: boolean;

  /** How the operation ended */
  reason: 'timeout' | 'completed' | 'cancelled' | 'error';

  /** Number of clicks performed */
  clickCount: number;

  /** Total milliseconds spent polling */
  elapsedMs: number;

  /** Text matches found during operation */
  matchesFound: string[];

  /** Error message if reason is 'error' */
  errorMessage?: string;
}

// ============================================================================
// STEP TYPES
// ============================================================================

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
 * A step represents a single user action in a recording
 * Extended with Vision and delay capabilities
 */
export interface Step {
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

  // ===== Recording Method =====

  /**
   * How this step was recorded
   * - 'dom': Standard DOM event capture (selector/xpath available)
   * - 'vision': Vision/OCR fallback (coordinates available)
   * @default 'dom'
   */
  recordedVia: RecordingMethod;

  // ===== Vision Data =====

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

  // ===== Time Delay =====

  /**
   * Delay in seconds to wait BEFORE this step executes
   * Overrides globalDelayMs for this specific step
   * @minimum 0
   */
  delaySeconds?: number;

  // ===== Conditional Click =====

  /**
   * Configuration for conditional-click event type
   * Required when event is 'conditional-click'
   */
  conditionalConfig?: ConditionalConfig;
}

/**
 * Default values for a new Step
 */
export const DEFAULT_STEP: Omit<Step, 'id'> = {
  label: '',
  event: 'click',
  recordedVia: 'dom',
};

// ============================================================================
// RECORDING TYPES
// ============================================================================

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
  /** Auto-incremented primary key */
  id?: number;

  /** Foreign key to parent project */
  projectId: number;

  /** User-defined recording name */
  name: string;

  /** Optional recording description */
  description?: string;

  /** Array of recorded steps */
  steps: Step[];

  /** URL where recording started */
  startUrl: string;

  /** Creation timestamp */
  createdAt: Date;

  /** Last update timestamp */
  updatedAt?: Date;

  // ===== Loop Configuration =====

  /**
   * Index where loop starts for CSV rows 2+
   * Row 1 always executes all steps (index 0 to end)
   * Rows 2+ execute from this index to end
   * @default 0 (execute all steps for every row)
   * @minimum 0
   */
  loopStartIndex: number;

  // ===== Delay Configuration =====

  /**
   * Global delay applied AFTER each step (milliseconds)
   * Only applies if step has no per-step delaySeconds
   * @default 0 (no delay)
   * @minimum 0
   */
  globalDelayMs: number;

  // ===== Conditional Defaults =====

  /**
   * Default configuration for conditional click steps
   * Individual steps can override these values
   */
  conditionalDefaults: RecordingConditionalDefaults;

  // ===== CSV Data =====

  /** Parsed CSV column mappings */
  parsedFields?: ParsedField[];

  /** Raw CSV data rows */
  csvData?: Record<string, string>[];
}

/**
 * Default values for a new Recording
 */
export const DEFAULT_RECORDING: Omit<Recording, 'id' | 'projectId'> = {
  name: '',
  description: '',
  steps: [],
  startUrl: '',
  createdAt: new Date(),
  loopStartIndex: 0,
  globalDelayMs: 0,
  conditionalDefaults: {
    searchTerms: ['Allow', 'Keep'],
    timeoutSeconds: 120,
  },
};

// ============================================================================
// MESSAGE TYPES
// ============================================================================

/**
 * Vision-related message types for chrome.runtime messaging
 */
export enum VisionMessageType {
  // Screenshot
  CAPTURE_SCREENSHOT = 'VISION_CAPTURE_SCREENSHOT',
  SCREENSHOT_RESULT = 'VISION_SCREENSHOT_RESULT',

  // OCR
  RECOGNIZE_TEXT = 'VISION_RECOGNIZE_TEXT',
  RECOGNIZE_RESULT = 'VISION_RECOGNIZE_RESULT',

  // Actions
  VISION_CLICK = 'VISION_CLICK',
  VISION_TYPE = 'VISION_TYPE',
  VISION_SCROLL = 'VISION_SCROLL',
  VISION_KEY = 'VISION_KEY',

  // Status
  VISION_READY = 'VISION_READY',
  VISION_ERROR = 'VISION_ERROR',
}

/**
 * Base message structure for Vision operations
 */
export interface VisionMessageBase {
  type: VisionMessageType;
  timestamp?: number;
}

/**
 * Screenshot capture request
 */
export interface CaptureScreenshotMessage extends VisionMessageBase {
  type: VisionMessageType.CAPTURE_SCREENSHOT;
  tabId?: number;
}

/**
 * Screenshot result
 */
export interface ScreenshotResultMessage extends VisionMessageBase {
  type: VisionMessageType.SCREENSHOT_RESULT;
  success: boolean;
  imageDataUrl?: string;
  error?: string;
}

/**
 * Vision click request
 */
export interface VisionClickMessage extends VisionMessageBase {
  type: VisionMessageType.VISION_CLICK;
  x: number;
  y: number;
}

/**
 * Vision type request
 */
export interface VisionTypeMessage extends VisionMessageBase {
  type: VisionMessageType.VISION_TYPE;
  x: number;
  y: number;
  text: string;
}

/**
 * Vision scroll request
 */
export interface VisionScrollMessage extends VisionMessageBase {
  type: VisionMessageType.VISION_SCROLL;
  direction: 'up' | 'down';
  amount?: number;
}

/**
 * Union type for all Vision messages
 */
export type VisionMessage =
  | CaptureScreenshotMessage
  | ScreenshotResultMessage
  | VisionClickMessage
  | VisionTypeMessage
  | VisionScrollMessage;

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Result of a Vision operation
 */
export interface VisionOperationResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  duration?: number;
}

/**
 * Vision Engine state
 */
export type VisionEngineState =
  | 'uninitialized'
  | 'initializing'
  | 'ready'
  | 'busy'
  | 'error'
  | 'terminated';

/**
 * Type guard: Check if step is Vision-recorded
 */
export function isVisionStep(step: Step): boolean {
  return step.recordedVia === 'vision';
}

/**
 * Type guard: Check if step has coordinates
 */
export function hasCoordinates(step: Step): step is Step & { coordinates: StepCoordinates } {
  return step.coordinates !== undefined;
}

/**
 * Type guard: Check if step is conditional click
 */
export function isConditionalClick(step: Step): step is Step & { conditionalConfig: ConditionalConfig } {
  return step.event === 'conditional-click' && step.conditionalConfig !== undefined;
}
```

### 4.3 Index File Update

Update `src/types/index.ts` to re-export vision types:

```typescript
// src/types/index.ts

// Existing exports
export * from './project';
export * from './testRun';
// ... other existing exports

// NEW: Vision types
export * from './vision';
```

---

## 5. CODE EXAMPLES

### 5.1 Using Vision Types in Components

```typescript
// Example: Using types in a React component
import React from 'react';
import { Step, isVisionStep, hasCoordinates } from '@/types';

interface StepRowProps {
  step: Step;
}

export function StepRow({ step }: StepRowProps) {
  return (
    <div className="step-row">
      <span>{step.label}</span>
      {isVisionStep(step) && (
        <span className="badge vision-badge">📷 Vision</span>
      )}
      {hasCoordinates(step) && (
        <span className="coordinates">
          ({step.coordinates.x}, {step.coordinates.y})
        </span>
      )}
    </div>
  );
}
```

### 5.2 Using Types in Vision Engine

```typescript
// Example: Using types in VisionEngine class
import {
  VisionConfig,
  TextResult,
  ClickTarget,
  DEFAULT_VISION_CONFIG,
  VisionEngineState,
} from '@/types';

class VisionEngine {
  private config: VisionConfig;
  private state: VisionEngineState = 'uninitialized';

  constructor(config: Partial<VisionConfig> = {}) {
    this.config = { ...DEFAULT_VISION_CONFIG, ...config };
  }

  async findText(searchTerms: string[]): Promise<ClickTarget | null> {
    // Implementation uses types for full type safety
    const results: TextResult[] = await this.recognizeText();
    
    for (const term of searchTerms) {
      const match = results.find(
        r => r.text.includes(term) && r.confidence >= this.config.confidenceThreshold
      );
      
      if (match) {
        return {
          x: match.bounds.centerX,
          y: match.bounds.centerY,
          width: match.bounds.width,
          height: match.bounds.height,
          matchedText: match.text,
          confidence: match.confidence,
        };
      }
    }
    
    return null;
  }
}
```

### 5.3 Using Types in Message Handlers

```typescript
// Example: Type-safe message handling
import {
  VisionMessage,
  VisionMessageType,
  VisionClickMessage,
  VisionTypeMessage,
} from '@/types';

function handleVisionMessage(message: VisionMessage): void {
  switch (message.type) {
    case VisionMessageType.VISION_CLICK:
      handleClick(message as VisionClickMessage);
      break;
    case VisionMessageType.VISION_TYPE:
      handleType(message as VisionTypeMessage);
      break;
    default:
      console.warn('Unknown message type:', message.type);
  }
}

function handleClick(message: VisionClickMessage): void {
  const { x, y } = message;
  // Click at coordinates...
}

function handleType(message: VisionTypeMessage): void {
  const { x, y, text } = message;
  // Click and type...
}
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** File `src/types/vision.ts` is created
- [ ] **AC-2:** All interfaces defined in Section 4.2 are present
- [ ] **AC-3:** All exports are available from `@/types` import
- [ ] **AC-4:** TypeScript compiles without errors (`npm run type-check`)
- [ ] **AC-5:** All interfaces have complete JSDoc documentation
- [ ] **AC-6:** Default value constants are exported (DEFAULT_VISION_CONFIG, etc.)
- [ ] **AC-7:** Type guards are implemented and exported (isVisionStep, etc.)
- [ ] **AC-8:** `src/types/index.ts` re-exports all vision types
- [ ] **AC-9:** No circular dependency warnings

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Single file for Vision types** - All Vision-related types in one file for discoverability
2. **JSDoc required** - All interfaces and properties must have JSDoc comments
3. **Defaults exported** - Default value constants must be exported for use in factories
4. **No runtime dependencies** - Type file should have no runtime imports

### Patterns to Follow

1. **Interface over Type** - Use `interface` for object shapes, `type` for unions/primitives
2. **Readonly where possible** - Consider `readonly` for immutable properties
3. **Optional with defaults** - Optional properties should have documented defaults
4. **Type guards** - Provide type guard functions for common checks

### Edge Cases

1. **Partial configurations** - Use `Partial<VisionConfig>` for optional overrides
2. **Null vs undefined** - Prefer `undefined` over `null` for optional properties
3. **Date handling** - Use `Date` type, not string, for timestamps

---

## 8. VERIFICATION COMMANDS

```bash
# Check file exists
ls -la src/types/vision.ts

# Run type check
npm run type-check

# Verify exports work
npx ts-node -e "import * as V from './src/types/vision'; console.log(Object.keys(V));"

# Check for circular dependencies
npx madge --circular src/types/

# Verify build still works
npm run build
```

---

## 9. ROLLBACK PROCEDURE

If the type definitions cause issues:

```bash
# Remove the vision types file
rm src/types/vision.ts

# Restore index.ts
git checkout HEAD~1 -- src/types/index.ts

# Verify types compile without vision
npm run type-check
```

---

## 10. REFERENCES

- [TypeScript Handbook - Interfaces](https://www.typescriptlang.org/docs/handbook/interfaces.html)
- [TypeScript Handbook - Type Guards](https://www.typescriptlang.org/docs/handbook/advanced-types.html#type-guards-and-differentiating-types)
- [JSDoc Reference](https://jsdoc.app/)
- Data Layer Spec: `/future-spec/05_data-layer.md`

---

*End of Specification FND-004*
