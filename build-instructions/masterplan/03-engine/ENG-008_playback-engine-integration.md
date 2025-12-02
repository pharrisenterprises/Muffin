# ENG-008: PLAYBACK ENGINE INTEGRATION SPECIFICATION

> **Build Card:** ENG-008  
> **Category:** Engine / Integration  
> **Dependencies:** ENG-007 (Conditional clicking), FND-010 (Step extension)  
> **Risk Level:** High  
> **Estimated Lines:** ~500

---

## 1. PURPOSE

This specification integrates the VisionEngine with the existing PlaybackEngine. The PlaybackEngine is responsible for executing recorded automation steps - this integration adds support for:

1. **Vision step execution** - Execute steps recorded via Vision
2. **Conditional click steps** - Handle 'conditional-click' event type
3. **Step delays** - Apply per-step and global delays
4. **Loop start index** - Support CSV loop behavior
5. **Hybrid playback** - Mix DOM and Vision steps seamlessly

This is a **HIGH RISK** modification as it touches core playback functionality.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| ENG-001 to ENG-007 | VisionEngine | All Vision methods |
| FND-010 | Step extension | Extended Step interface |
| FND-011 | Recording extension | Loop and delay settings |
| Existing PlaybackEngine | `src/lib/playbackEngine.ts` | Current implementation |
| Architecture Spec | `/future-spec/04_architecture.md` | Integration design |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `src/lib/playbackEngine.ts` | MODIFY | Add Vision step support |
| `src/lib/stepExecutors.ts` | CREATE | Step execution strategies |
| `src/lib/delayManager.ts` | CREATE | Delay handling utilities |

### New Capabilities

| Capability | Description |
|------------|-------------|
| Vision step execution | Execute steps with `recordedVia: 'vision'` |
| Conditional click execution | Handle `event: 'conditional-click'` |
| Per-step delays | Apply `step.delaySeconds` before execution |
| Global delays | Apply `recording.globalDelayMs` as fallback |
| Loop start index | Skip initial steps for CSV rows 2+ |

---

## 4. DETAILED SPECIFICATION

### 4.1 Step Executors

Create `src/lib/stepExecutors.ts`:

```typescript
/**
 * @fileoverview Step execution strategies for different step types
 * @module lib/stepExecutors
 * 
 * Provides executor functions for different step types including
 * DOM-based steps, Vision-based steps, and conditional clicks.
 */

import type { Step, ClickTarget, ConditionalClickResult } from '@/types';
import { VisionEngine } from './visionEngine';

/**
 * Result of step execution
 */
export interface StepExecutionResult {
  /** Whether execution succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Execution duration in ms */
  durationMs: number;
  /** Additional result data */
  data?: {
    /** For Vision clicks: the target that was clicked */
    clickTarget?: ClickTarget;
    /** For conditional clicks: polling result */
    conditionalResult?: ConditionalClickResult;
    /** Element that was interacted with */
    elementInfo?: string;
  };
}

/**
 * Context for step execution
 */
export interface ExecutionContext {
  /** Tab ID to execute in */
  tabId: number;
  /** VisionEngine instance (if Vision features needed) */
  visionEngine?: VisionEngine;
  /** Current row data for variable substitution */
  rowData?: Record<string, string>;
  /** Whether to skip delays */
  skipDelays?: boolean;
  /** Abort signal for cancellation */
  abortSignal?: AbortSignal;
}

/**
 * Executor function type
 */
export type StepExecutor = (
  step: Step,
  context: ExecutionContext
) => Promise<StepExecutionResult>;

/**
 * Executes a DOM-based click step
 */
export async function executeDomClick(
  step: Step,
  context: ExecutionContext
): Promise<StepExecutionResult> {
  const startTime = performance.now();

  try {
    if (!step.selector) {
      return {
        success: false,
        error: 'No selector provided for DOM click',
        durationMs: performance.now() - startTime,
      };
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: context.tabId },
      func: (selector: string) => {
        const element = document.querySelector(selector);
        if (!element) {
          return { success: false, error: `Element not found: ${selector}` };
        }

        // Scroll into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Dispatch click
        const rect = element.getBoundingClientRect();
        const eventInit: MouseEventInit = {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2,
        };

        element.dispatchEvent(new MouseEvent('mousedown', eventInit));
        element.dispatchEvent(new MouseEvent('mouseup', eventInit));
        element.dispatchEvent(new MouseEvent('click', eventInit));

        return {
          success: true,
          elementInfo: `${element.tagName.toLowerCase()}${element.id ? '#' + element.id : ''}`,
        };
      },
      args: [step.selector],
    });

    const result = results[0]?.result;
    
    return {
      success: result?.success ?? false,
      error: result?.error,
      durationMs: performance.now() - startTime,
      data: { elementInfo: result?.elementInfo },
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'DOM click failed',
      durationMs: performance.now() - startTime,
    };
  }
}

/**
 * Executes a Vision-based click step
 */
export async function executeVisionClick(
  step: Step,
  context: ExecutionContext
): Promise<StepExecutionResult> {
  const startTime = performance.now();

  try {
    if (!context.visionEngine) {
      return {
        success: false,
        error: 'VisionEngine not available',
        durationMs: performance.now() - startTime,
      };
    }

    // Ensure engine is ready
    if (!context.visionEngine.isReady()) {
      await context.visionEngine.initialize();
    }

    let clickTarget: ClickTarget | null = null;

    // If we have stored coordinates, use them directly
    if (step.coordinates) {
      await context.visionEngine.clickAtCoordinates(
        step.coordinates.x,
        step.coordinates.y
      );

      clickTarget = {
        x: step.coordinates.x,
        y: step.coordinates.y,
        width: step.coordinates.width,
        height: step.coordinates.height,
        matchedText: step.ocrText,
        confidence: step.confidenceScore,
      };

    } else if (step.ocrText) {
      // Fall back to finding text by OCR
      clickTarget = await context.visionEngine.clickAtText([step.ocrText]);
      
      if (!clickTarget) {
        return {
          success: false,
          error: `Text not found: "${step.ocrText}"`,
          durationMs: performance.now() - startTime,
        };
      }
    } else {
      return {
        success: false,
        error: 'Vision step has no coordinates or OCR text',
        durationMs: performance.now() - startTime,
      };
    }

    return {
      success: true,
      durationMs: performance.now() - startTime,
      data: { clickTarget },
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Vision click failed',
      durationMs: performance.now() - startTime,
    };
  }
}

/**
 * Executes a conditional click step
 */
export async function executeConditionalClick(
  step: Step,
  context: ExecutionContext
): Promise<StepExecutionResult> {
  const startTime = performance.now();

  try {
    if (!context.visionEngine) {
      return {
        success: false,
        error: 'VisionEngine not available for conditional click',
        durationMs: performance.now() - startTime,
      };
    }

    if (!step.conditionalConfig?.enabled) {
      return {
        success: true,
        durationMs: performance.now() - startTime,
        data: {
          conditionalResult: {
            success: true,
            reason: 'completed',
            clickCount: 0,
            elapsedMs: 0,
            matchesFound: [],
          },
        },
      };
    }

    const config = step.conditionalConfig;

    // Ensure engine is ready
    if (!context.visionEngine.isReady()) {
      await context.visionEngine.initialize();
    }

    // Run conditional click polling
    const result = await context.visionEngine.pollAndClick(
      config.searchTerms,
      config.timeoutSeconds,
      config.pollIntervalMs
    );

    return {
      success: result.success,
      durationMs: performance.now() - startTime,
      data: { conditionalResult: result },
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Conditional click failed',
      durationMs: performance.now() - startTime,
    };
  }
}

/**
 * Executes a type/input step
 */
export async function executeType(
  step: Step,
  context: ExecutionContext
): Promise<StepExecutionResult> {
  const startTime = performance.now();

  try {
    // Substitute variables in value
    let value = step.value || '';
    if (context.rowData) {
      value = substituteVariables(value, context.rowData);
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: context.tabId },
      func: (selector: string, text: string) => {
        const element = document.querySelector(selector) as HTMLInputElement;
        if (!element) {
          return { success: false, error: `Element not found: ${selector}` };
        }

        // Focus and clear
        element.focus();
        element.value = '';

        // Dispatch input events
        element.value = text;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));

        return { success: true };
      },
      args: [step.selector || '', value],
    });

    const result = results[0]?.result;
    
    return {
      success: result?.success ?? false,
      error: result?.error,
      durationMs: performance.now() - startTime,
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Type action failed',
      durationMs: performance.now() - startTime,
    };
  }
}

/**
 * Executes a navigation step
 */
export async function executeNavigation(
  step: Step,
  context: ExecutionContext
): Promise<StepExecutionResult> {
  const startTime = performance.now();

  try {
    const url = step.value || step.url;
    if (!url) {
      return {
        success: false,
        error: 'No URL provided for navigation',
        durationMs: performance.now() - startTime,
      };
    }

    await chrome.tabs.update(context.tabId, { url });

    // Wait for page load
    await waitForPageLoad(context.tabId);

    return {
      success: true,
      durationMs: performance.now() - startTime,
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Navigation failed',
      durationMs: performance.now() - startTime,
    };
  }
}

/**
 * Simple variable substitution
 */
function substituteVariables(
  text: string,
  data: Record<string, string>
): string {
  return text.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
    return data[varName.trim()] ?? '';
  });
}

/**
 * Waits for page to finish loading
 */
async function waitForPageLoad(tabId: number, timeoutMs: number = 30000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error('Page load timeout'));
    }, timeoutMs);

    const listener = (
      updatedTabId: number,
      changeInfo: chrome.tabs.TabChangeInfo
    ) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        // Small additional delay for dynamic content
        setTimeout(resolve, 500);
      }
    };

    chrome.tabs.onUpdated.addListener(listener);
  });
}

/**
 * Gets the appropriate executor for a step
 */
export function getStepExecutor(step: Step): StepExecutor {
  // Conditional click has its own executor
  if (step.event === 'conditional-click') {
    return executeConditionalClick;
  }

  // Vision-recorded steps use vision executor
  if (step.recordedVia === 'vision') {
    if (step.event === 'click') {
      return executeVisionClick;
    }
    // Other vision events could be added here
  }

  // DOM-based steps
  switch (step.event) {
    case 'click':
      return executeDomClick;
    case 'type':
    case 'input':
      return executeType;
    case 'navigation':
    case 'navigate':
      return executeNavigation;
    default:
      return executeDomClick; // Default fallback
  }
}
```

### 4.2 Delay Manager

Create `src/lib/delayManager.ts`:

```typescript
/**
 * @fileoverview Delay management utilities
 * @module lib/delayManager
 * 
 * Handles step delays including per-step delays and global delays.
 */

import type { Step, Recording } from '@/types';

/**
 * Calculates the effective delay for a step
 * Priority: step.delaySeconds > recording.globalDelayMs > 0
 * 
 * @param step - The step to get delay for
 * @param recording - The recording with global delay settings
 * @returns Delay in milliseconds
 */
export function getEffectiveDelay(step: Step, recording: Recording): number {
  // Step-specific delay takes priority
  if (step.delaySeconds !== undefined && step.delaySeconds > 0) {
    return step.delaySeconds * 1000;
  }

  // Fall back to global delay
  if (recording.globalDelayMs !== undefined && recording.globalDelayMs > 0) {
    return recording.globalDelayMs;
  }

  return 0;
}

/**
 * Applies a delay
 * @param ms - Delay in milliseconds
 * @param abortSignal - Optional signal to abort the delay
 * @returns Promise that resolves after delay
 */
export function applyDelay(
  ms: number,
  abortSignal?: AbortSignal
): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(resolve, ms);

    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        clearTimeout(timeout);
        reject(new Error('Delay aborted'));
      });
    }
  });
}

/**
 * Creates a delay with progress reporting
 * @param ms - Total delay in milliseconds
 * @param onProgress - Progress callback (0-100)
 * @param intervalMs - Progress update interval
 */
export async function applyDelayWithProgress(
  ms: number,
  onProgress: (percent: number) => void,
  intervalMs: number = 100
): Promise<void> {
  if (ms <= 0) {
    onProgress(100);
    return;
  }

  const startTime = Date.now();
  
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const percent = Math.min(100, Math.round((elapsed / ms) * 100));
      onProgress(percent);

      if (elapsed >= ms) {
        clearInterval(interval);
        resolve();
      }
    }, intervalMs);
  });
}

/**
 * Estimates total execution time for a recording
 * @param recording - Recording to estimate
 * @param rowCount - Number of CSV rows (1 if no CSV)
 * @returns Estimated milliseconds
 */
export function estimateTotalTime(
  recording: Recording,
  rowCount: number = 1
): number {
  const baseStepTime = 500; // Base time per step execution
  
  let totalTime = 0;

  for (let row = 0; row < rowCount; row++) {
    const startIndex = row === 0 ? 0 : recording.loopStartIndex;
    
    for (let i = startIndex; i < recording.steps.length; i++) {
      const step = recording.steps[i];
      
      // Base execution time
      totalTime += baseStepTime;
      
      // Add delay
      totalTime += getEffectiveDelay(step, recording);
      
      // Conditional clicks add significant time
      if (step.event === 'conditional-click' && step.conditionalConfig?.enabled) {
        // Assume at least a few seconds for conditional
        totalTime += Math.min(
          step.conditionalConfig.timeoutSeconds * 1000,
          10000 // Cap estimate at 10s
        );
      }
    }
  }

  return totalTime;
}

/**
 * Formats duration for display
 * @param ms - Duration in milliseconds
 * @returns Formatted string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  if (minutes < 60) {
    return remainingSeconds > 0 
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  return `${hours}h ${remainingMinutes}m`;
}
```

### 4.3 PlaybackEngine Integration

Update `src/lib/playbackEngine.ts` - add Vision support:

```typescript
// Add imports at top
import { VisionEngine, getDefaultEngine } from './visionEngine';
import { getStepExecutor, type ExecutionContext, type StepExecutionResult } from './stepExecutors';
import { getEffectiveDelay, applyDelay } from './delayManager';
import { getStepsForRow } from './csvUtils';

// Add to PlaybackEngine class properties
/** VisionEngine instance for Vision steps */
private visionEngine: VisionEngine | null = null;

/** Whether Vision is initialized */
private visionInitialized: boolean = false;

// Add method to initialize Vision
/**
 * Initializes Vision capabilities if needed
 * Called automatically when Vision steps are detected
 */
private async ensureVisionReady(): Promise<void> {
  if (this.visionInitialized && this.visionEngine?.isReady()) {
    return;
  }

  this.visionEngine = getDefaultEngine();
  
  if (!this.visionEngine.isReady()) {
    console.log('[PlaybackEngine] Initializing VisionEngine...');
    await this.visionEngine.initialize();
  }
  
  this.visionInitialized = true;
}

// Add method to check if recording needs Vision
/**
 * Checks if a recording contains Vision steps
 */
private recordingNeedsVision(recording: Recording): boolean {
  return recording.steps.some(
    (step) => 
      step.recordedVia === 'vision' || 
      step.event === 'conditional-click'
  );
}

// Update or add executeStep method
/**
 * Executes a single step with Vision support
 */
private async executeStep(
  step: Step,
  recording: Recording,
  context: {
    tabId: number;
    rowData?: Record<string, string>;
    stepIndex: number;
    totalSteps: number;
  }
): Promise<StepExecutionResult> {
  const { tabId, rowData, stepIndex, totalSteps } = context;

  // Report progress
  this.emit('stepStart', {
    stepIndex,
    totalSteps,
    step,
  });

  // Apply pre-step delay
  const delayMs = getEffectiveDelay(step, recording);
  if (delayMs > 0) {
    console.log(`[PlaybackEngine] Applying ${delayMs}ms delay before step ${stepIndex + 1}`);
    await applyDelay(delayMs, this.abortController?.signal);
  }

  // Get executor for this step type
  const executor = getStepExecutor(step);

  // Build execution context
  const execContext: ExecutionContext = {
    tabId,
    visionEngine: this.visionEngine ?? undefined,
    rowData,
    abortSignal: this.abortController?.signal,
  };

  // Execute the step
  const result = await executor(step, execContext);

  // Report result
  this.emit('stepComplete', {
    stepIndex,
    totalSteps,
    step,
    result,
  });

  return result;
}

// Update playRecording method to support Vision and loops
/**
 * Plays a recording with Vision and CSV loop support
 */
async playRecording(
  recording: Recording,
  options: {
    tabId?: number;
    csvData?: Record<string, string>[];
    onProgress?: (progress: PlaybackProgress) => void;
  } = {}
): Promise<PlaybackResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let stepsExecuted = 0;

  try {
    // Get tab ID
    const tabId = options.tabId || await this.getActiveTabId();

    // Initialize Vision if needed
    if (this.recordingNeedsVision(recording)) {
      await this.ensureVisionReady();
    }

    // Determine rows to process
    const rows = options.csvData || [{}];

    // Process each row
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const rowData = rows[rowIndex];
      
      // Get steps for this row (respects loopStartIndex)
      const stepsToExecute = getStepsForRow(recording, rowIndex);

      // Execute steps
      for (let i = 0; i < stepsToExecute.length; i++) {
        // Check for abort
        if (this.abortController?.signal.aborted) {
          return {
            success: false,
            stepsExecuted,
            totalSteps: recording.steps.length,
            errors: [...errors, 'Playback aborted'],
            durationMs: Date.now() - startTime,
          };
        }

        const step = stepsToExecute[i];
        const absoluteIndex = rowIndex === 0 
          ? i 
          : recording.loopStartIndex + i;

        try {
          const result = await this.executeStep(step, recording, {
            tabId,
            rowData,
            stepIndex: absoluteIndex,
            totalSteps: recording.steps.length,
          });

          if (!result.success) {
            errors.push(`Step ${absoluteIndex + 1}: ${result.error}`);
            
            // Decide whether to continue on error
            if (this.options.stopOnError) {
              throw new Error(result.error);
            }
          }

          stepsExecuted++;

          // Report progress
          options.onProgress?.({
            currentStep: absoluteIndex,
            totalSteps: recording.steps.length,
            currentRow: rowIndex,
            totalRows: rows.length,
            stepsExecuted,
            errors: errors.length,
          });

        } catch (stepError) {
          const errorMsg = stepError instanceof Error 
            ? stepError.message 
            : 'Unknown error';
          errors.push(`Step ${absoluteIndex + 1}: ${errorMsg}`);
          
          if (this.options.stopOnError) {
            throw stepError;
          }
        }
      }
    }

    return {
      success: errors.length === 0,
      stepsExecuted,
      totalSteps: recording.steps.length * rows.length,
      errors,
      durationMs: Date.now() - startTime,
    };

  } catch (error) {
    return {
      success: false,
      stepsExecuted,
      totalSteps: recording.steps.length,
      errors: [...errors, error instanceof Error ? error.message : 'Unknown error'],
      durationMs: Date.now() - startTime,
    };
  }
}

// Add cleanup method
/**
 * Cleans up resources including Vision engine
 */
async cleanup(): Promise<void> {
  if (this.visionEngine) {
    await this.visionEngine.terminate();
    this.visionEngine = null;
    this.visionInitialized = false;
  }
}
```

---

## 5. CODE EXAMPLES

### 5.1 Playing a Recording with Vision Steps

```typescript
import { PlaybackEngine } from '@/lib/playbackEngine';

const engine = new PlaybackEngine();

const result = await engine.playRecording(recording, {
  onProgress: (progress) => {
    console.log(`Step ${progress.currentStep + 1}/${progress.totalSteps}`);
  },
});

if (result.success) {
  console.log(`Completed in ${result.durationMs}ms`);
} else {
  console.error('Errors:', result.errors);
}
```

### 5.2 Playing with CSV Data

```typescript
const csvData = [
  { name: 'John', email: 'john@example.com' },
  { name: 'Jane', email: 'jane@example.com' },
];

const result = await engine.playRecording(recording, {
  csvData,
  onProgress: (progress) => {
    console.log(`Row ${progress.currentRow + 1}/${progress.totalRows}`);
  },
});
```

### 5.3 Using Step Executors Directly

```typescript
import { executeVisionClick, executeDomClick } from '@/lib/stepExecutors';

// Execute a Vision click
const result = await executeVisionClick(step, {
  tabId: activeTabId,
  visionEngine: engine,
});

if (result.success) {
  console.log('Clicked:', result.data?.clickTarget?.matchedText);
}
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** DOM steps execute correctly (existing behavior)
- [ ] **AC-2:** Vision steps execute using VisionEngine
- [ ] **AC-3:** Conditional click steps poll and click
- [ ] **AC-4:** Per-step delays are applied correctly
- [ ] **AC-5:** Global delays are used as fallback
- [ ] **AC-6:** Loop start index skips steps for rows 2+
- [ ] **AC-7:** CSV variable substitution works
- [ ] **AC-8:** Progress events fire correctly
- [ ] **AC-9:** Errors are collected and reported
- [ ] **AC-10:** Cleanup terminates VisionEngine

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Backward compatible** - Existing recordings must work
2. **Lazy initialization** - Only init Vision when needed
3. **Error resilience** - Option to continue on errors

### Patterns to Follow

1. **Strategy pattern** - Executors for different step types
2. **Event emission** - Report progress via events
3. **Resource cleanup** - Terminate Vision on completion

### Edge Cases

1. **Mixed DOM/Vision** - Seamlessly switch between
2. **Vision init failure** - Skip Vision steps gracefully
3. **Abort during delay** - Cancel delay on abort

---

## 8. VERIFICATION COMMANDS

```bash
# Verify files exist
ls -la src/lib/stepExecutors.ts
ls -la src/lib/delayManager.ts

# Run type check
npm run type-check

# Build and test
npm run build
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Revert PlaybackEngine changes
git checkout src/lib/playbackEngine.ts

# Remove new files
rm src/lib/stepExecutors.ts
rm src/lib/delayManager.ts
```

---

## 10. REFERENCES

- ENG-001 to ENG-007: VisionEngine Implementation
- FND-010: Step Interface Extension
- FND-011: Recording Interface Extension
- Architecture Spec: `/future-spec/04_architecture.md`

---

*End of Specification ENG-008*
