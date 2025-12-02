# ENG-018: Delay Execution Logic

> **Build Card:** ENG-018  
> **Category:** Core Engine  
> **Dependencies:** FND-010, FND-011, ENG-017  
> **Risk Level:** Low  
> **Estimated Lines:** 320-380

---

## 1. PURPOSE

Implement the comprehensive delay execution system that manages timing between steps during playback. This includes support for global delays (applied after every step), per-step delays (override global for specific steps), dynamic delays (calculated based on conditions), and delay visualization in the UI. Proper delay management is critical for reliable automation where pages need time to respond.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| Step Interface | `src/types/step.types.ts` | delayMs field |
| Recording Interface | `src/types/recording.types.ts` | globalDelayMs field |
| Feature Specs | `/future-spec/03_feature-specs.md` | Delay requirements |
| Step Executor | `src/lib/stepExecutors.ts` | Delay integration points |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/lib/delayManager.ts` | CREATE | ~180 |
| `src/types/delay.types.ts` | CREATE | ~45 |
| `src/lib/stepExecutors.ts` | MODIFY | +20 |

### Artifacts

- `DelayManager` class created
- `DelayConfig` interface defined
- `DelayResult` interface defined
- Integration with step execution flow

---

## 4. DETAILED SPECIFICATION

### 4.1 Type Definitions

```typescript
// In src/types/delay.types.ts

/**
 * Delay type classification
 */
export type DelayType = 
  | 'global'      // Recording-level default delay
  | 'step'        // Per-step override delay
  | 'dynamic'     // Calculated based on conditions
  | 'none';       // No delay applied

/**
 * Configuration for delay behavior
 */
export interface DelayConfig {
  /** Global delay applied after each step (ms) */
  globalDelayMs: number;
  
  /** Minimum delay even when set to 0 (ms) */
  minimumDelayMs: number;
  
  /** Maximum allowed delay (ms) */
  maximumDelayMs: number;
  
  /** Whether to skip delays in fast mode */
  fastModeEnabled: boolean;
  
  /** Fast mode delay multiplier (0.0 - 1.0) */
  fastModeMultiplier: number;
  
  /** Whether delays are enabled at all */
  delaysEnabled: boolean;
  
  /** Dynamic delay calculation function */
  dynamicDelayFn?: (step: Step, context: DelayContext) => number;
}

/**
 * Context provided for dynamic delay calculation
 */
export interface DelayContext {
  /** Previous step result */
  previousStepResult?: StepExecutionResult;
  
  /** Current step being executed */
  currentStep: Step;
  
  /** Index in step array */
  stepIndex: number;
  
  /** Total steps in recording */
  totalSteps: number;
  
  /** Current CSV row index */
  csvRowIndex: number;
  
  /** Whether Vision was used */
  usedVision: boolean;
  
  /** Current page URL */
  pageUrl?: string;
}

/**
 * Result of delay calculation
 */
export interface DelayResult {
  /** Actual delay applied (ms) */
  delayMs: number;
  
  /** Type of delay that was applied */
  type: DelayType;
  
  /** Whether delay was modified from original */
  modified: boolean;
  
  /** Original delay before any modifications */
  originalDelayMs: number;
  
  /** Reason for any modification */
  modificationReason?: string;
}

/**
 * Delay event for progress reporting
 */
export interface DelayProgressEvent {
  /** Step ID associated with delay */
  stepId: string;
  
  /** Total delay duration */
  totalMs: number;
  
  /** Elapsed time in delay */
  elapsedMs: number;
  
  /** Remaining time in delay */
  remainingMs: number;
  
  /** Whether delay can be skipped */
  skippable: boolean;
}
```

### 4.2 DelayManager Class

```typescript
// In src/lib/delayManager.ts

import { 
  DelayConfig, 
  DelayContext, 
  DelayResult, 
  DelayType,
  DelayProgressEvent 
} from '@/types/delay.types';
import { Step } from '@/types/step.types';
import { StepExecutionResult } from '@/types/executor.types';

/**
 * Default delay configuration
 */
const DEFAULT_DELAY_CONFIG: DelayConfig = {
  globalDelayMs: 500,
  minimumDelayMs: 0,
  maximumDelayMs: 30000,
  fastModeEnabled: false,
  fastModeMultiplier: 0.25,
  delaysEnabled: true
};

/**
 * Manages delay execution during playback
 */
export class DelayManager {
  private config: DelayConfig;
  private abortController: AbortController | null = null;
  private currentDelayPromise: Promise<void> | null = null;
  private onProgressCallback: ((event: DelayProgressEvent) => void) | null = null;

  constructor(config: Partial<DelayConfig> = {}) {
    this.config = { ...DEFAULT_DELAY_CONFIG, ...config };
  }

  /**
   * Updates delay configuration
   */
  updateConfig(config: Partial<DelayConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Gets current configuration
   */
  getConfig(): DelayConfig {
    return { ...this.config };
  }

  /**
   * Sets progress callback for delay visualization
   */
  setProgressCallback(callback: ((event: DelayProgressEvent) => void) | null): void {
    this.onProgressCallback = callback;
  }

  /**
   * Calculates the effective delay for a step
   */
  calculateDelay(step: Step, context: DelayContext): DelayResult {
    const result: DelayResult = {
      delayMs: 0,
      type: 'none',
      modified: false,
      originalDelayMs: 0
    };

    // If delays are disabled, return zero
    if (!this.config.delaysEnabled) {
      result.modificationReason = 'Delays disabled';
      return result;
    }

    // Determine base delay
    let baseDelay: number;
    let delayType: DelayType;

    if (step.delayMs !== undefined && step.delayMs >= 0) {
      // Per-step delay takes priority
      baseDelay = step.delayMs;
      delayType = 'step';
    } else if (this.config.dynamicDelayFn) {
      // Dynamic calculation
      baseDelay = this.config.dynamicDelayFn(step, context);
      delayType = 'dynamic';
    } else {
      // Fall back to global delay
      baseDelay = this.config.globalDelayMs;
      delayType = 'global';
    }

    result.originalDelayMs = baseDelay;
    result.type = delayType;

    // Apply fast mode multiplier
    let effectiveDelay = baseDelay;
    if (this.config.fastModeEnabled && baseDelay > 0) {
      effectiveDelay = Math.round(baseDelay * this.config.fastModeMultiplier);
      result.modified = true;
      result.modificationReason = `Fast mode (${this.config.fastModeMultiplier}x)`;
    }

    // Apply minimum bound
    if (effectiveDelay < this.config.minimumDelayMs) {
      effectiveDelay = this.config.minimumDelayMs;
      if (effectiveDelay !== baseDelay) {
        result.modified = true;
        result.modificationReason = `Minimum delay applied (${this.config.minimumDelayMs}ms)`;
      }
    }

    // Apply maximum bound
    if (effectiveDelay > this.config.maximumDelayMs) {
      effectiveDelay = this.config.maximumDelayMs;
      result.modified = true;
      result.modificationReason = `Maximum delay capped (${this.config.maximumDelayMs}ms)`;
    }

    result.delayMs = effectiveDelay;
    return result;
  }

  /**
   * Executes a delay with progress reporting
   */
  async executeDelay(
    delayMs: number,
    stepId: string,
    options: { skippable?: boolean } = {}
  ): Promise<{ completed: boolean; actualDelayMs: number }> {
    const { skippable = true } = options;
    
    if (delayMs <= 0) {
      return { completed: true, actualDelayMs: 0 };
    }

    const startTime = performance.now();
    this.abortController = new AbortController();

    // Progress reporting interval
    const progressInterval = Math.min(100, delayMs / 10);
    let progressTimer: ReturnType<typeof setInterval> | null = null;

    if (this.onProgressCallback) {
      progressTimer = setInterval(() => {
        const elapsed = performance.now() - startTime;
        const remaining = Math.max(0, delayMs - elapsed);
        
        this.onProgressCallback!({
          stepId,
          totalMs: delayMs,
          elapsedMs: elapsed,
          remainingMs: remaining,
          skippable
        });
      }, progressInterval);
    }

    try {
      this.currentDelayPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          resolve();
        }, delayMs);

        // Handle abort
        this.abortController!.signal.addEventListener('abort', () => {
          clearTimeout(timeout);
          reject(new Error('Delay skipped'));
        });
      });

      await this.currentDelayPromise;

      return { 
        completed: true, 
        actualDelayMs: performance.now() - startTime 
      };

    } catch (error) {
      // Delay was skipped
      return { 
        completed: false, 
        actualDelayMs: performance.now() - startTime 
      };

    } finally {
      if (progressTimer) {
        clearInterval(progressTimer);
      }
      this.currentDelayPromise = null;
      this.abortController = null;

      // Final progress update
      if (this.onProgressCallback) {
        this.onProgressCallback({
          stepId,
          totalMs: delayMs,
          elapsedMs: delayMs,
          remainingMs: 0,
          skippable
        });
      }
    }
  }

  /**
   * Skips the current delay if one is active
   */
  skipCurrentDelay(): boolean {
    if (this.abortController) {
      this.abortController.abort();
      return true;
    }
    return false;
  }

  /**
   * Checks if a delay is currently active
   */
  isDelayActive(): boolean {
    return this.currentDelayPromise !== null;
  }

  /**
   * Creates a smart delay based on action type
   */
  static getRecommendedDelay(action: string, usedVision: boolean): number {
    const baseDelays: Record<string, number> = {
      click: 300,
      input: 200,
      type: 100,
      select: 400,
      navigate: 1000,
      keyboard: 200,
      conditional_click: 0, // Has its own timing
      vision_click: 400,
      vision_type: 300
    };

    const baseDelay = baseDelays[action] || 300;
    
    // Vision actions may need slightly longer delays
    if (usedVision && !action.startsWith('vision_')) {
      return Math.round(baseDelay * 1.2);
    }

    return baseDelay;
  }

  /**
   * Creates a dynamic delay function based on page load indicators
   */
  static createPageLoadAwareDelayFn(
    baseDelayMs: number,
    pageLoadIndicators: string[] = []
  ): (step: Step, context: DelayContext) => number {
    return (step: Step, context: DelayContext): number => {
      // After navigation, use longer delay
      if (context.previousStepResult?.action === 'navigate') {
        return Math.max(baseDelayMs, 1500);
      }

      // After conditional click, minimal delay (already waited)
      if (context.previousStepResult?.action === 'conditional_click') {
        return 100;
      }

      // Last step of recording needs no delay
      if (context.stepIndex === context.totalSteps - 1) {
        return 0;
      }

      // Default to base delay
      return baseDelayMs;
    };
  }
}

// Singleton instance
let delayManagerInstance: DelayManager | null = null;

export function getDelayManager(config?: Partial<DelayConfig>): DelayManager {
  if (!delayManagerInstance) {
    delayManagerInstance = new DelayManager(config);
  } else if (config) {
    delayManagerInstance.updateConfig(config);
  }
  return delayManagerInstance;
}

export function resetDelayManager(): void {
  delayManagerInstance = null;
}
```

### 4.3 Integration with Step Executors

```typescript
// In src/lib/stepExecutors.ts - Update executeStep function

import { getDelayManager, DelayManager } from './delayManager';
import { DelayContext } from '@/types/delay.types';

/**
 * Main entry point for step execution with integrated delay management
 */
export async function executeStep(
  step: Step,
  context: ExecutionContext,
  stepIndex: number,
  totalSteps: number,
  previousResult?: StepExecutionResult
): Promise<StepExecutionResult> {
  // ... existing execution logic ...

  // After successful execution, handle delay
  if (result.success) {
    const delayManager = getDelayManager({
      globalDelayMs: context.globalDelayMs,
      delaysEnabled: true
    });

    const delayContext: DelayContext = {
      previousStepResult: previousResult,
      currentStep: step,
      stepIndex,
      totalSteps,
      csvRowIndex: context.currentRowIndex,
      usedVision: result.method === 'vision',
      pageUrl: undefined // Could be populated if needed
    };

    const delayResult = delayManager.calculateDelay(step, delayContext);

    if (delayResult.delayMs > 0) {
      context.onProgress?.({
        stepId: step.id,
        phase: 'waiting',
        message: `Waiting ${delayResult.delayMs}ms (${delayResult.type})`
      });

      await delayManager.executeDelay(delayResult.delayMs, step.id);
    }

    // Add delay info to result metadata
    result.metadata = {
      ...result.metadata,
      delay: {
        appliedMs: delayResult.delayMs,
        type: delayResult.type,
        modified: delayResult.modified
      }
    };
  }

  return result;
}
```

### 4.4 UI Integration for Delay Display

```typescript
// Example React hook for delay visualization
// (For reference - actual implementation in UI specs)

import { useState, useEffect, useCallback } from 'react';
import { getDelayManager } from '@/lib/delayManager';
import { DelayProgressEvent } from '@/types/delay.types';

export function useDelayProgress() {
  const [delayProgress, setDelayProgress] = useState<DelayProgressEvent | null>(null);
  const [isDelayActive, setIsDelayActive] = useState(false);

  useEffect(() => {
    const delayManager = getDelayManager();
    
    delayManager.setProgressCallback((event) => {
      setDelayProgress(event);
      setIsDelayActive(event.remainingMs > 0);
    });

    return () => {
      delayManager.setProgressCallback(null);
    };
  }, []);

  const skipDelay = useCallback(() => {
    const delayManager = getDelayManager();
    return delayManager.skipCurrentDelay();
  }, []);

  return {
    delayProgress,
    isDelayActive,
    skipDelay,
    percentComplete: delayProgress 
      ? (delayProgress.elapsedMs / delayProgress.totalMs) * 100 
      : 0
  };
}
```

---

## 5. CODE EXAMPLES

### 5.1 Basic Delay Configuration

```typescript
import { DelayManager, getDelayManager } from '@/lib/delayManager';

// Using singleton
const delayManager = getDelayManager({
  globalDelayMs: 500,
  minimumDelayMs: 100,
  maximumDelayMs: 10000
});

// Or create instance directly
const customManager = new DelayManager({
  globalDelayMs: 1000,
  fastModeEnabled: true,
  fastModeMultiplier: 0.5
});
```

### 5.2 Calculating Step Delay

```typescript
const step = {
  id: 'step-1',
  action: 'click',
  delayMs: 800  // Per-step override
};

const context: DelayContext = {
  currentStep: step,
  stepIndex: 5,
  totalSteps: 10,
  csvRowIndex: 0,
  usedVision: false
};

const result = delayManager.calculateDelay(step, context);
console.log(result);
// { delayMs: 800, type: 'step', modified: false, originalDelayMs: 800 }
```

### 5.3 Executing Delay with Progress

```typescript
delayManager.setProgressCallback((event) => {
  const percent = (event.elapsedMs / event.totalMs) * 100;
  console.log(`Delay progress: ${percent.toFixed(1)}%`);
  updateProgressBar(percent);
});

const { completed, actualDelayMs } = await delayManager.executeDelay(
  2000,
  'step-1',
  { skippable: true }
);

console.log(completed ? 'Delay completed' : 'Delay was skipped');
console.log(`Actual time: ${actualDelayMs}ms`);
```

### 5.4 Fast Mode

```typescript
// Enable fast mode for quick testing
delayManager.updateConfig({
  fastModeEnabled: true,
  fastModeMultiplier: 0.25  // 25% of normal delays
});

const step = { id: 's1', action: 'click', delayMs: 1000 };
const result = delayManager.calculateDelay(step, context);

console.log(result.delayMs);       // 250
console.log(result.modified);      // true
console.log(result.originalDelayMs); // 1000
```

### 5.5 Dynamic Delay Function

```typescript
// Create page-load aware delays
const dynamicFn = DelayManager.createPageLoadAwareDelayFn(500, ['spinner', 'loading']);

delayManager.updateConfig({
  dynamicDelayFn: dynamicFn
});

// After navigation, delay will be 1500ms
// After conditional click, delay will be 100ms
// Otherwise, delay will be 500ms
```

### 5.6 Skipping Delays

```typescript
// In UI - Skip button handler
function handleSkipClick() {
  const skipped = delayManager.skipCurrentDelay();
  if (skipped) {
    showToast('Delay skipped');
  }
}

// Check if delay is active
if (delayManager.isDelayActive()) {
  showSkipButton();
}
```

### 5.7 Integration with Playback Loop

```typescript
const delayManager = getDelayManager({
  globalDelayMs: recording.globalDelayMs || 500
});

for (let i = 0; i < recording.steps.length; i++) {
  const step = recording.steps[i];
  
  // Execute step
  const result = await executeStep(step, context);
  
  if (result.success) {
    // Calculate and execute delay
    const delayContext: DelayContext = {
      previousStepResult: i > 0 ? results[i - 1] : undefined,
      currentStep: step,
      stepIndex: i,
      totalSteps: recording.steps.length,
      csvRowIndex: currentRow,
      usedVision: result.method === 'vision'
    };
    
    const delayResult = delayManager.calculateDelay(step, delayContext);
    
    if (delayResult.delayMs > 0) {
      await delayManager.executeDelay(delayResult.delayMs, step.id);
    }
  }
  
  results.push(result);
}
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** Global delay applied when step has no delayMs
- [ ] **AC-2:** Per-step delayMs overrides global delay
- [ ] **AC-3:** Fast mode reduces delays by multiplier
- [ ] **AC-4:** Minimum delay enforced when configured
- [ ] **AC-5:** Maximum delay capped when configured
- [ ] **AC-6:** Progress callback fires during delay
- [ ] **AC-7:** Delays can be skipped via skipCurrentDelay()
- [ ] **AC-8:** Dynamic delay function calculates correctly
- [ ] **AC-9:** Zero delay skips wait entirely
- [ ] **AC-10:** Delay metadata included in step results

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Timing precision** - JavaScript timers not guaranteed precise
2. **Skip responsiveness** - Abort should be immediate
3. **Memory leaks** - Clear intervals on cleanup

### Patterns to Follow

1. **Singleton pattern** - Shared delay manager instance
2. **Strategy pattern** - Dynamic delay functions
3. **Observable pattern** - Progress callbacks

### Edge Cases

1. **Zero delay** - Should skip entirely, not setTimeout(0)
2. **Negative delay** - Treat as zero
3. **Very long delays** - Progress reporting essential
4. **Rapid skip requests** - Handle gracefully
5. **Page unload during delay** - Handle cleanup

---

## 8. VERIFICATION COMMANDS

```bash
# Verify file creation
ls -la src/lib/delayManager.ts
ls -la src/types/delay.types.ts

# Verify exports
grep -n "DelayManager\|getDelayManager" src/lib/delayManager.ts

# Verify type definitions
grep -n "DelayConfig\|DelayResult\|DelayContext" src/types/delay.types.ts

# Run type check
npm run type-check

# Build extension
npm run build
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Remove new files
rm src/lib/delayManager.ts
rm src/types/delay.types.ts

# Revert stepExecutors changes
git checkout src/lib/stepExecutors.ts
```

---

## 10. REFERENCES

- FND-010: Step Interface Extension (delayMs field)
- FND-011: Recording Interface Extension (globalDelayMs field)
- ENG-017: Step Executor Module
- Feature Spec: `/future-spec/03_feature-specs.md` Section 1.2
- Screenshot Reference: Loop/delay UI from project screenshot

---

*End of Specification ENG-018*
