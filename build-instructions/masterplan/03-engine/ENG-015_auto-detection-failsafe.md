# ENG-015: Auto-Detection Failsafe

> **Build Card:** ENG-015  
> **Category:** Core Engine  
> **Dependencies:** ENG-001, ENG-006, INT-009  
> **Risk Level:** Medium  
> **Estimated Lines:** 380-450

---

## 1. PURPOSE

Implement the auto-detection failsafe system that automatically falls back to Vision-based interaction when DOM selectors fail during playback. This ensures robust automation by detecting selector failures in real-time and seamlessly switching to OCR-based element location. The failsafe operates transparently, requiring no user intervention while maintaining playback continuity.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| VisionEngine Class | `src/lib/visionEngine.ts` | findText and click methods |
| PlaybackEngine | `src/lib/playbackEngine.ts` | Step execution flow |
| Feature Specs | `/future-spec/03_feature-specs.md` | Failsafe behavior requirements |
| INT-009 | `build-instructions/masterplan/04-integration/INT-009_vision-fallback-recording.md` | Recording fallback logic |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/lib/autoDetectionFailsafe.ts` | CREATE | ~250 |
| `src/types/vision.types.ts` | MODIFY | +25 |
| `src/lib/playbackEngine.ts` | MODIFY | +40 |

### Artifacts

- `AutoDetectionFailsafe` class created
- `FailsafeConfig` interface defined
- `FailsafeResult` interface defined
- Integration hooks for PlaybackEngine

---

## 4. DETAILED SPECIFICATION

### 4.1 Type Definitions

```typescript
// In src/types/vision.types.ts

/**
 * Configuration for auto-detection failsafe
 */
export interface FailsafeConfig {
  /** Whether failsafe is enabled */
  enabled: boolean;
  
  /** Timeout for DOM selector before triggering failsafe (ms) */
  domTimeoutMs: number;
  
  /** Timeout for Vision fallback attempt (ms) */
  visionTimeoutMs: number;
  
  /** Confidence threshold for Vision text matching */
  visionConfidence: number;
  
  /** Whether to log failsafe activations */
  logActivations: boolean;
  
  /** Maximum Vision fallback attempts per step */
  maxVisionAttempts: number;
  
  /** Text patterns to use for Vision fallback (extracted from step) */
  fallbackTextPatterns?: string[];
}

/**
 * Result from failsafe execution
 */
export interface FailsafeResult {
  /** Whether the step ultimately succeeded */
  success: boolean;
  
  /** Which method succeeded: 'dom' | 'vision' | 'none' */
  successMethod: 'dom' | 'vision' | 'none';
  
  /** Whether failsafe was triggered */
  failsafeTriggered: boolean;
  
  /** DOM attempt details */
  domAttempt: {
    attempted: boolean;
    success: boolean;
    error?: string;
    durationMs: number;
  };
  
  /** Vision attempt details */
  visionAttempt: {
    attempted: boolean;
    success: boolean;
    textUsed?: string;
    error?: string;
    durationMs: number;
  };
  
  /** Total execution time */
  totalDurationMs: number;
}

/**
 * Step context for failsafe decision-making
 */
export interface FailsafeStepContext {
  step: Step;
  tabId: number;
  visionEngine: VisionEngine;
  domExecutor: (step: Step, tabId: number) => Promise<{ success: boolean; error?: string }>;
}
```

### 4.2 AutoDetectionFailsafe Class

```typescript
// In src/lib/autoDetectionFailsafe.ts

import { VisionEngine } from './visionEngine';
import { 
  FailsafeConfig, 
  FailsafeResult, 
  FailsafeStepContext,
  Step 
} from '@/types';

/**
 * Default failsafe configuration
 */
const DEFAULT_FAILSAFE_CONFIG: FailsafeConfig = {
  enabled: true,
  domTimeoutMs: 3000,
  visionTimeoutMs: 5000,
  visionConfidence: 0.6,
  logActivations: true,
  maxVisionAttempts: 2
};

/**
 * Auto-detection failsafe system
 * Falls back to Vision when DOM selectors fail
 */
export class AutoDetectionFailsafe {
  private config: FailsafeConfig;
  private activationCount: number = 0;
  private activationLog: Array<{
    timestamp: number;
    stepId: string;
    action: string;
    domError: string;
    visionSuccess: boolean;
  }> = [];

  constructor(config: Partial<FailsafeConfig> = {}) {
    this.config = { ...DEFAULT_FAILSAFE_CONFIG, ...config };
  }

  /**
   * Updates failsafe configuration
   */
  updateConfig(config: Partial<FailsafeConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Gets current configuration
   */
  getConfig(): FailsafeConfig {
    return { ...this.config };
  }

  /**
   * Executes a step with automatic DOM/Vision failsafe
   */
  async executeWithFailsafe(context: FailsafeStepContext): Promise<FailsafeResult> {
    const startTime = performance.now();
    const { step, tabId, visionEngine, domExecutor } = context;

    const result: FailsafeResult = {
      success: false,
      successMethod: 'none',
      failsafeTriggered: false,
      domAttempt: {
        attempted: false,
        success: false,
        durationMs: 0
      },
      visionAttempt: {
        attempted: false,
        success: false,
        durationMs: 0
      },
      totalDurationMs: 0
    };

    // Step 1: Try DOM-based execution first
    const domStart = performance.now();
    result.domAttempt.attempted = true;

    try {
      const domResult = await this.executeWithTimeout(
        () => domExecutor(step, tabId),
        this.config.domTimeoutMs
      );

      result.domAttempt.durationMs = performance.now() - domStart;

      if (domResult.success) {
        result.domAttempt.success = true;
        result.success = true;
        result.successMethod = 'dom';
        result.totalDurationMs = performance.now() - startTime;
        return result;
      } else {
        result.domAttempt.error = domResult.error || 'DOM execution failed';
      }
    } catch (error) {
      result.domAttempt.durationMs = performance.now() - domStart;
      result.domAttempt.error = error instanceof Error 
        ? error.message 
        : 'DOM execution threw exception';
    }

    // Step 2: If DOM failed and failsafe is enabled, try Vision
    if (!this.config.enabled) {
      result.totalDurationMs = performance.now() - startTime;
      return result;
    }

    result.failsafeTriggered = true;
    this.activationCount++;

    if (this.config.logActivations) {
      console.log(`[Failsafe] Triggered for step ${step.id} (${step.action})`);
      console.log(`[Failsafe] DOM error: ${result.domAttempt.error}`);
    }

    // Extract text patterns for Vision fallback
    const fallbackTexts = this.extractFallbackTexts(step);
    
    if (fallbackTexts.length === 0) {
      result.visionAttempt.error = 'No text patterns available for Vision fallback';
      result.totalDurationMs = performance.now() - startTime;
      this.logActivation(step, result.domAttempt.error || '', false);
      return result;
    }

    // Step 3: Attempt Vision-based execution
    const visionStart = performance.now();
    result.visionAttempt.attempted = true;

    for (let attempt = 0; attempt < this.config.maxVisionAttempts; attempt++) {
      for (const text of fallbackTexts) {
        try {
          const visionResult = await this.executeVisionFallback(
            step,
            text,
            visionEngine,
            tabId
          );

          if (visionResult.success) {
            result.visionAttempt.success = true;
            result.visionAttempt.textUsed = text;
            result.visionAttempt.durationMs = performance.now() - visionStart;
            result.success = true;
            result.successMethod = 'vision';
            result.totalDurationMs = performance.now() - startTime;

            if (this.config.logActivations) {
              console.log(`[Failsafe] Vision succeeded using text: "${text}"`);
            }

            this.logActivation(step, result.domAttempt.error || '', true);
            return result;
          }
        } catch (error) {
          result.visionAttempt.error = error instanceof Error 
            ? error.message 
            : 'Vision execution failed';
        }
      }
    }

    result.visionAttempt.durationMs = performance.now() - visionStart;
    result.totalDurationMs = performance.now() - startTime;
    this.logActivation(step, result.domAttempt.error || '', false);
    
    return result;
  }

  /**
   * Executes Vision-based fallback for a step
   */
  private async executeVisionFallback(
    step: Step,
    targetText: string,
    visionEngine: VisionEngine,
    tabId: number
  ): Promise<{ success: boolean; error?: string }> {
    const confidence = this.config.visionConfidence;

    switch (step.action) {
      case 'click': {
        // Find text and click
        const findResult = await visionEngine.findText(targetText, { 
          confidence, 
          tabId 
        });

        if (!findResult.found || !findResult.location) {
          return { success: false, error: `Text "${targetText}" not found` };
        }

        const clickX = findResult.location.x + (findResult.location.width / 2);
        const clickY = findResult.location.y + (findResult.location.height / 2);

        const clickResult = await visionEngine.clickAtCoordinates(clickX, clickY, { tabId });
        return { success: clickResult.success, error: clickResult.error };
      }

      case 'input':
      case 'type': {
        // Find field and type
        const typeResult = await visionEngine.typeText({
          targetText,
          inputText: step.value || '',
          confidence,
          tabId
        });
        return { success: typeResult.success, error: typeResult.error };
      }

      case 'select': {
        // Find dropdown and select
        const selectResult = await visionEngine.selectDropdownOption({
          dropdownLabel: targetText,
          optionText: step.value || '',
          confidence,
          tabId
        });
        return { success: selectResult.success, error: selectResult.error };
      }

      default:
        return { 
          success: false, 
          error: `Vision fallback not implemented for action: ${step.action}` 
        };
    }
  }

  /**
   * Extracts possible text patterns from a step for Vision fallback
   */
  private extractFallbackTexts(step: Step): string[] {
    const texts: string[] = [];

    // Priority 1: Explicit Vision target
    if (step.visionTarget) {
      texts.push(step.visionTarget);
    }

    // Priority 2: Step label
    if (step.label && step.label.trim()) {
      texts.push(step.label);
    }

    // Priority 3: Element text content (from recording)
    if (step.elementText && step.elementText.trim()) {
      texts.push(step.elementText);
    }

    // Priority 4: Placeholder text
    if (step.placeholder && step.placeholder.trim()) {
      texts.push(step.placeholder);
    }

    // Priority 5: aria-label
    if (step.ariaLabel && step.ariaLabel.trim()) {
      texts.push(step.ariaLabel);
    }

    // Priority 6: Button/link text from selector analysis
    if (step.selectorText && step.selectorText.trim()) {
      texts.push(step.selectorText);
    }

    // Use configured fallback patterns
    if (this.config.fallbackTextPatterns) {
      texts.push(...this.config.fallbackTextPatterns);
    }

    // Remove duplicates and empty strings
    return [...new Set(texts)].filter(t => t && t.trim().length > 0);
  }

  /**
   * Executes a function with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      fn()
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Logs a failsafe activation
   */
  private logActivation(
    step: Step, 
    domError: string, 
    visionSuccess: boolean
  ): void {
    this.activationLog.push({
      timestamp: Date.now(),
      stepId: step.id,
      action: step.action,
      domError,
      visionSuccess
    });

    // Keep only last 100 entries
    if (this.activationLog.length > 100) {
      this.activationLog = this.activationLog.slice(-100);
    }
  }

  /**
   * Gets failsafe statistics
   */
  getStats(): {
    totalActivations: number;
    successfulFallbacks: number;
    failedFallbacks: number;
    successRate: number;
    recentActivations: typeof this.activationLog;
  } {
    const successful = this.activationLog.filter(a => a.visionSuccess).length;
    const failed = this.activationLog.filter(a => !a.visionSuccess).length;

    return {
      totalActivations: this.activationCount,
      successfulFallbacks: successful,
      failedFallbacks: failed,
      successRate: this.activationLog.length > 0 
        ? (successful / this.activationLog.length) * 100 
        : 0,
      recentActivations: [...this.activationLog].slice(-10)
    };
  }

  /**
   * Resets failsafe statistics
   */
  resetStats(): void {
    this.activationCount = 0;
    this.activationLog = [];
  }
}

/**
 * Singleton instance for global access
 */
let failsafeInstance: AutoDetectionFailsafe | null = null;

export function getFailsafeInstance(
  config?: Partial<FailsafeConfig>
): AutoDetectionFailsafe {
  if (!failsafeInstance) {
    failsafeInstance = new AutoDetectionFailsafe(config);
  } else if (config) {
    failsafeInstance.updateConfig(config);
  }
  return failsafeInstance;
}
```

### 4.3 PlaybackEngine Integration

```typescript
// In src/lib/playbackEngine.ts - Add to step execution

import { getFailsafeInstance, FailsafeStepContext } from './autoDetectionFailsafe';

// Inside PlaybackEngine class
async executeStep(step: Step): Promise<StepResult> {
  const failsafe = getFailsafeInstance();
  
  // Check if step should use failsafe
  const useFailsafe = this.config.enableFailsafe && 
                      step.recordedVia !== 'vision' &&
                      ['click', 'input', 'type', 'select'].includes(step.action);

  if (useFailsafe) {
    const context: FailsafeStepContext = {
      step,
      tabId: this.activeTabId,
      visionEngine: this.visionEngine,
      domExecutor: async (s, t) => this.executeDomStep(s, t)
    };

    const result = await failsafe.executeWithFailsafe(context);

    return {
      success: result.success,
      stepId: step.id,
      action: step.action,
      error: result.success ? undefined : result.visionAttempt.error || result.domAttempt.error,
      metadata: {
        method: result.successMethod,
        failsafeTriggered: result.failsafeTriggered,
        domDurationMs: result.domAttempt.durationMs,
        visionDurationMs: result.visionAttempt.durationMs
      }
    };
  }

  // Execute without failsafe (Vision steps or failsafe disabled)
  return this.executeStepDirect(step);
}
```

---

## 5. CODE EXAMPLES

### 5.1 Basic Failsafe Usage

```typescript
import { AutoDetectionFailsafe } from '@/lib/autoDetectionFailsafe';
import { VisionEngine } from '@/lib/visionEngine';

const failsafe = new AutoDetectionFailsafe({
  enabled: true,
  domTimeoutMs: 3000,
  visionTimeoutMs: 5000
});

const visionEngine = new VisionEngine();
await visionEngine.initialize();

const result = await failsafe.executeWithFailsafe({
  step: {
    id: 'step-1',
    action: 'click',
    selector: '#submit-button',
    label: 'Submit',
    elementText: 'Submit Form'
  },
  tabId: activeTabId,
  visionEngine,
  domExecutor: async (step, tabId) => {
    // Your DOM-based click logic
    return { success: false, error: 'Element not found' };
  }
});

if (result.success) {
  console.log(`Step succeeded via ${result.successMethod}`);
} else {
  console.log('Step failed completely');
}
```

### 5.2 Global Singleton Pattern

```typescript
import { getFailsafeInstance } from '@/lib/autoDetectionFailsafe';

// Configure once at app startup
const failsafe = getFailsafeInstance({
  enabled: true,
  visionConfidence: 0.7,
  logActivations: true
});

// Use anywhere in app
const currentFailsafe = getFailsafeInstance();
const stats = currentFailsafe.getStats();
console.log(`Failsafe success rate: ${stats.successRate}%`);
```

### 5.3 Custom Fallback Text Patterns

```typescript
const failsafe = new AutoDetectionFailsafe({
  enabled: true,
  fallbackTextPatterns: ['Submit', 'Save', 'Continue', 'Next']
});

// These patterns will be tried if step doesn't have its own text
```

### 5.4 Monitoring Failsafe Performance

```typescript
const failsafe = getFailsafeInstance();

// After playback completes
const stats = failsafe.getStats();

console.log(`Total failsafe activations: ${stats.totalActivations}`);
console.log(`Successful Vision fallbacks: ${stats.successfulFallbacks}`);
console.log(`Failed fallbacks: ${stats.failedFallbacks}`);
console.log(`Success rate: ${stats.successRate.toFixed(1)}%`);

// Recent activations for debugging
stats.recentActivations.forEach(a => {
  console.log(`Step ${a.stepId}: DOM error="${a.domError}", Vision=${a.visionSuccess}`);
});

// Reset for next run
failsafe.resetStats();
```

### 5.5 Disabling Failsafe for Specific Steps

```typescript
// In step definition
const step: Step = {
  id: 'step-1',
  action: 'click',
  selector: '#special-button',
  // This step was recorded via Vision, skip DOM attempt
  recordedVia: 'vision',
  visionTarget: 'Special Button'
};

// PlaybackEngine will skip failsafe for Vision-recorded steps
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** DOM execution attempted first with timeout
- [ ] **AC-2:** Vision fallback triggered on DOM failure
- [ ] **AC-3:** Multiple text patterns tried in priority order
- [ ] **AC-4:** Fallback can be enabled/disabled globally
- [ ] **AC-5:** Activation logging tracks all failsafe events
- [ ] **AC-6:** Statistics available for monitoring
- [ ] **AC-7:** Timeout configurable for both DOM and Vision
- [ ] **AC-8:** PlaybackEngine integrates failsafe seamlessly
- [ ] **AC-9:** Vision-recorded steps bypass DOM attempt
- [ ] **AC-10:** Singleton pattern allows global configuration

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Performance overhead** - Failsafe adds latency on DOM failures
2. **Text availability** - Requires meaningful text in step metadata
3. **Action coverage** - Only click/input/type/select supported

### Patterns to Follow

1. **Fail-fast DOM** - Short timeout before Vision attempt
2. **Priority-based fallback** - Try most specific text first
3. **Transparent operation** - No user intervention required

### Edge Cases

1. **No text patterns** - Cannot fallback, report failure
2. **Multiple matching texts** - Try each until success
3. **Vision also fails** - Report both errors
4. **Rapid successive failures** - May indicate page state issue
5. **Dynamic content** - Text may change between DOM fail and Vision attempt

---

## 8. VERIFICATION COMMANDS

```bash
# Verify file creation
ls -la src/lib/autoDetectionFailsafe.ts

# Verify exports
grep -n "AutoDetectionFailsafe\|getFailsafeInstance" src/lib/autoDetectionFailsafe.ts

# Verify type definitions
grep -n "FailsafeConfig\|FailsafeResult" src/types/vision.types.ts

# Run type check
npm run type-check

# Build extension
npm run build
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Remove new file
rm src/lib/autoDetectionFailsafe.ts

# Revert PlaybackEngine changes
git checkout src/lib/playbackEngine.ts

# Revert type definitions
git checkout src/types/vision.types.ts
```

---

## 10. REFERENCES

- ENG-001: VisionEngine Class
- ENG-006: findText() Function
- ENG-008: clickAtCoordinates() Function
- ENG-009: typeText() Function
- INT-009: Vision Fallback Recording
- Feature Spec: `/future-spec/03_feature-specs.md` Section 4.1

---

*End of Specification ENG-015*
