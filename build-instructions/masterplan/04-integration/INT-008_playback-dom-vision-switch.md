# INT-008: Playback DOM/Vision Switch

> **Build Card:** INT-008  
> **Category:** Integration Points  
> **Dependencies:** ENG-001, ENG-017, FND-010  
> **Risk Level:** High  
> **Estimated Lines:** 350-420

---

## 1. PURPOSE

Implement the DOM/Vision execution switch logic within PlaybackEngine that intelligently routes each step to either DOM-based or Vision-based execution based on the step's `recordedVia` property and runtime conditions. This is the core routing mechanism that enables seamless mixing of DOM and Vision steps within a single recording, with automatic fallback capabilities.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| PlaybackEngine | `src/lib/playbackEngine.ts` | Current playback flow |
| Step Interface | `src/types/step.types.ts` | recordedVia field |
| VisionEngine | `src/lib/visionEngine.ts` | Vision execution methods |
| Step Executors | `src/lib/stepExecutors.ts` | DOM and Vision executors |
| Architecture Spec | `/future-spec/04_architecture.md` | Routing requirements |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/lib/playbackEngine.ts` | MODIFY | +150 |
| `src/lib/executionRouter.ts` | CREATE | ~120 |
| `src/types/execution.types.ts` | MODIFY | +25 |

### Artifacts

- `ExecutionRouter` class created
- Routing logic integrated into PlaybackEngine
- `ExecutionMode` type defined
- Fallback chain implementation

---

## 4. DETAILED SPECIFICATION

### 4.1 Type Definitions

```typescript
// In src/types/execution.types.ts

/**
 * Execution mode for a step
 */
export type ExecutionMode = 'dom' | 'vision' | 'auto';

/**
 * Routing decision for step execution
 */
export interface RoutingDecision {
  /** Primary execution mode */
  primaryMode: ExecutionMode;
  
  /** Whether fallback is enabled */
  fallbackEnabled: boolean;
  
  /** Fallback mode if primary fails */
  fallbackMode?: ExecutionMode;
  
  /** Reason for this routing decision */
  reason: string;
  
  /** Confidence in this decision (0-1) */
  confidence: number;
}

/**
 * Configuration for execution routing
 */
export interface RoutingConfig {
  /** Default mode when step doesn't specify */
  defaultMode: ExecutionMode;
  
  /** Whether to enable automatic fallback */
  enableFallback: boolean;
  
  /** Timeout for DOM execution before fallback (ms) */
  domTimeoutMs: number;
  
  /** Timeout for Vision execution (ms) */
  visionTimeoutMs: number;
  
  /** Whether Vision is available/initialized */
  visionAvailable: boolean;
  
  /** Force specific mode for all steps */
  forceMode?: ExecutionMode;
}

/**
 * Execution attempt result
 */
export interface ExecutionAttempt {
  mode: ExecutionMode;
  success: boolean;
  duration: number;
  error?: string;
}

/**
 * Combined execution result with routing info
 */
export interface RoutedExecutionResult {
  success: boolean;
  stepId: string;
  primaryAttempt: ExecutionAttempt;
  fallbackAttempt?: ExecutionAttempt;
  finalMode: ExecutionMode;
  totalDuration: number;
  error?: string;
}
```

### 4.2 ExecutionRouter Class

```typescript
// In src/lib/executionRouter.ts

import { Step } from '@/types/step.types';
import { 
  ExecutionMode, 
  RoutingDecision, 
  RoutingConfig,
  RoutedExecutionResult,
  ExecutionAttempt 
} from '@/types/execution.types';
import { StepExecutionResult, ExecutionContext } from '@/types/executor.types';
import { 
  executeDomClick, 
  executeDomInput, 
  executeDomSelect,
  executeVisionClick,
  executeVisionType,
  executeConditionalClick,
  executeNavigate,
  executeDelay,
  executeKeyboard
} from './stepExecutors';

/**
 * Default routing configuration
 */
const DEFAULT_ROUTING_CONFIG: RoutingConfig = {
  defaultMode: 'dom',
  enableFallback: true,
  domTimeoutMs: 3000,
  visionTimeoutMs: 5000,
  visionAvailable: false
};

/**
 * Routes step execution between DOM and Vision modes
 */
export class ExecutionRouter {
  private config: RoutingConfig;
  private executionStats: {
    domSuccess: number;
    domFail: number;
    visionSuccess: number;
    visionFail: number;
    fallbacksTriggered: number;
  };

  constructor(config: Partial<RoutingConfig> = {}) {
    this.config = { ...DEFAULT_ROUTING_CONFIG, ...config };
    this.executionStats = {
      domSuccess: 0,
      domFail: 0,
      visionSuccess: 0,
      visionFail: 0,
      fallbacksTriggered: 0
    };
  }

  /**
   * Updates routing configuration
   */
  updateConfig(config: Partial<RoutingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Determines routing decision for a step
   */
  getRoutingDecision(step: Step): RoutingDecision {
    // Check for forced mode
    if (this.config.forceMode) {
      return {
        primaryMode: this.config.forceMode,
        fallbackEnabled: false,
        reason: `Forced mode: ${this.config.forceMode}`,
        confidence: 1.0
      };
    }

    // Check step's recordedVia property
    if (step.recordedVia === 'vision') {
      return {
        primaryMode: 'vision',
        fallbackEnabled: this.config.enableFallback,
        fallbackMode: 'dom',
        reason: 'Step recorded via Vision',
        confidence: 0.95
      };
    }

    if (step.recordedVia === 'dom') {
      return {
        primaryMode: 'dom',
        fallbackEnabled: this.config.enableFallback && this.config.visionAvailable,
        fallbackMode: 'vision',
        reason: 'Step recorded via DOM',
        confidence: 0.95
      };
    }

    // Check action type for Vision-only actions
    if (this.isVisionOnlyAction(step.action)) {
      return {
        primaryMode: 'vision',
        fallbackEnabled: false,
        reason: `Action "${step.action}" requires Vision`,
        confidence: 1.0
      };
    }

    // Check action type for DOM-only actions
    if (this.isDomOnlyAction(step.action)) {
      return {
        primaryMode: 'dom',
        fallbackEnabled: false,
        reason: `Action "${step.action}" requires DOM`,
        confidence: 1.0
      };
    }

    // Check if step has Vision target
    if (step.visionTarget && !step.selector) {
      return {
        primaryMode: 'vision',
        fallbackEnabled: false,
        reason: 'Step has visionTarget but no selector',
        confidence: 0.9
      };
    }

    // Check if step has DOM selector
    if (step.selector && !step.visionTarget) {
      return {
        primaryMode: 'dom',
        fallbackEnabled: this.config.enableFallback && this.config.visionAvailable,
        fallbackMode: 'vision',
        reason: 'Step has selector but no visionTarget',
        confidence: 0.9
      };
    }

    // Both available - use default with fallback
    return {
      primaryMode: this.config.defaultMode,
      fallbackEnabled: this.config.enableFallback,
      fallbackMode: this.config.defaultMode === 'dom' ? 'vision' : 'dom',
      reason: 'Using default mode with fallback',
      confidence: 0.7
    };
  }

  /**
   * Executes a step with routing
   */
  async executeWithRouting(
    step: Step,
    context: ExecutionContext
  ): Promise<RoutedExecutionResult> {
    const startTime = performance.now();
    const decision = this.getRoutingDecision(step);

    const result: RoutedExecutionResult = {
      success: false,
      stepId: step.id,
      primaryAttempt: {
        mode: decision.primaryMode,
        success: false,
        duration: 0
      },
      finalMode: decision.primaryMode,
      totalDuration: 0
    };

    // Execute primary mode
    const primaryStart = performance.now();
    const primaryResult = await this.executeInMode(
      step,
      context,
      decision.primaryMode
    );
    result.primaryAttempt = {
      mode: decision.primaryMode,
      success: primaryResult.success,
      duration: performance.now() - primaryStart,
      error: primaryResult.error
    };

    // Update stats
    this.updateStats(decision.primaryMode, primaryResult.success);

    if (primaryResult.success) {
      result.success = true;
      result.finalMode = decision.primaryMode;
      result.totalDuration = performance.now() - startTime;
      return result;
    }

    // Try fallback if enabled
    if (decision.fallbackEnabled && decision.fallbackMode) {
      console.log(`[ExecutionRouter] Primary ${decision.primaryMode} failed, trying ${decision.fallbackMode} fallback`);
      this.executionStats.fallbacksTriggered++;

      const fallbackStart = performance.now();
      const fallbackResult = await this.executeInMode(
        step,
        context,
        decision.fallbackMode
      );
      result.fallbackAttempt = {
        mode: decision.fallbackMode,
        success: fallbackResult.success,
        duration: performance.now() - fallbackStart,
        error: fallbackResult.error
      };

      // Update stats
      this.updateStats(decision.fallbackMode, fallbackResult.success);

      if (fallbackResult.success) {
        result.success = true;
        result.finalMode = decision.fallbackMode;
      } else {
        result.error = `Both modes failed. Primary: ${result.primaryAttempt.error}. Fallback: ${fallbackResult.error}`;
      }
    } else {
      result.error = primaryResult.error;
    }

    result.totalDuration = performance.now() - startTime;
    return result;
  }

  /**
   * Executes step in specified mode
   */
  private async executeInMode(
    step: Step,
    context: ExecutionContext,
    mode: ExecutionMode
  ): Promise<StepExecutionResult> {
    const action = step.action.toLowerCase();

    // Vision-only actions
    if (mode === 'vision' || this.isVisionOnlyAction(action)) {
      return this.executeVisionAction(step, context);
    }

    // DOM-only actions
    if (mode === 'dom' || this.isDomOnlyAction(action)) {
      return this.executeDomAction(step, context);
    }

    // Auto mode - try to determine best approach
    if (mode === 'auto') {
      if (step.selector) {
        return this.executeDomAction(step, context);
      }
      if (step.visionTarget) {
        return this.executeVisionAction(step, context);
      }
      return this.executeDomAction(step, context);
    }

    return {
      success: false,
      stepId: step.id,
      action: step.action,
      error: `Unknown execution mode: ${mode}`,
      duration: 0,
      method: 'dom'
    };
  }

  /**
   * Executes DOM-based action
   */
  private async executeDomAction(
    step: Step,
    context: ExecutionContext
  ): Promise<StepExecutionResult> {
    const action = step.action.toLowerCase();

    switch (action) {
      case 'click':
        return executeDomClick(step, context);
      case 'input':
      case 'type':
        return executeDomInput(step, context);
      case 'select':
        return executeDomSelect(step, context);
      case 'navigate':
      case 'open':
        return executeNavigate(step, context);
      case 'delay':
      case 'wait':
        return executeDelay(step, context);
      case 'keyboard':
      case 'keypress':
        return executeKeyboard(step, context);
      default:
        return {
          success: false,
          stepId: step.id,
          action: step.action,
          error: `Unknown DOM action: ${action}`,
          duration: 0,
          method: 'dom'
        };
    }
  }

  /**
   * Executes Vision-based action
   */
  private async executeVisionAction(
    step: Step,
    context: ExecutionContext
  ): Promise<StepExecutionResult> {
    if (!context.visionAvailable || !context.visionEngine) {
      return {
        success: false,
        stepId: step.id,
        action: step.action,
        error: 'VisionEngine not available',
        duration: 0,
        method: 'vision'
      };
    }

    const action = step.action.toLowerCase();

    switch (action) {
      case 'click':
      case 'vision_click':
        return executeVisionClick(step, context);
      case 'input':
      case 'type':
      case 'vision_type':
        return executeVisionType(step, context);
      case 'conditional_click':
        return executeConditionalClick(step, context);
      case 'keyboard':
      case 'keypress':
        return executeKeyboard(step, context);
      default:
        return {
          success: false,
          stepId: step.id,
          action: step.action,
          error: `Unknown Vision action: ${action}`,
          duration: 0,
          method: 'vision'
        };
    }
  }

  /**
   * Checks if action requires Vision only
   */
  private isVisionOnlyAction(action: string): boolean {
    const visionOnlyActions = [
      'conditional_click',
      'vision_click',
      'vision_type',
      'vision_scroll',
      'vision_dropdown'
    ];
    return visionOnlyActions.includes(action.toLowerCase());
  }

  /**
   * Checks if action requires DOM only
   */
  private isDomOnlyAction(action: string): boolean {
    const domOnlyActions = [
      'navigate',
      'open',
      'delay',
      'wait'
    ];
    return domOnlyActions.includes(action.toLowerCase());
  }

  /**
   * Updates execution statistics
   */
  private updateStats(mode: ExecutionMode, success: boolean): void {
    if (mode === 'dom') {
      success ? this.executionStats.domSuccess++ : this.executionStats.domFail++;
    } else if (mode === 'vision') {
      success ? this.executionStats.visionSuccess++ : this.executionStats.visionFail++;
    }
  }

  /**
   * Gets execution statistics
   */
  getStats(): typeof this.executionStats {
    return { ...this.executionStats };
  }

  /**
   * Resets execution statistics
   */
  resetStats(): void {
    this.executionStats = {
      domSuccess: 0,
      domFail: 0,
      visionSuccess: 0,
      visionFail: 0,
      fallbacksTriggered: 0
    };
  }
}

// Singleton instance
let routerInstance: ExecutionRouter | null = null;

export function getExecutionRouter(config?: Partial<RoutingConfig>): ExecutionRouter {
  if (!routerInstance) {
    routerInstance = new ExecutionRouter(config);
  } else if (config) {
    routerInstance.updateConfig(config);
  }
  return routerInstance;
}
```

### 4.3 PlaybackEngine Integration

```typescript
// In src/lib/playbackEngine.ts - Add routing integration

import { ExecutionRouter, getExecutionRouter } from './executionRouter';
import { RoutedExecutionResult, RoutingConfig } from '@/types/execution.types';

export class PlaybackEngine {
  private router: ExecutionRouter;
  private visionEngine: VisionEngine | null = null;

  constructor(config: PlaybackConfig) {
    // ... existing initialization ...
    
    this.router = getExecutionRouter({
      defaultMode: config.defaultExecutionMode || 'dom',
      enableFallback: config.enableFallback ?? true,
      domTimeoutMs: config.domTimeoutMs || 3000,
      visionTimeoutMs: config.visionTimeoutMs || 5000,
      visionAvailable: false
    });
  }

  /**
   * Initializes Vision capabilities
   */
  async initializeVision(): Promise<boolean> {
    try {
      this.visionEngine = new VisionEngine();
      await this.visionEngine.initialize();
      
      this.router.updateConfig({ visionAvailable: true });
      console.log('[PlaybackEngine] Vision initialized');
      return true;
    } catch (error) {
      console.error('[PlaybackEngine] Vision init failed:', error);
      this.router.updateConfig({ visionAvailable: false });
      return false;
    }
  }

  /**
   * Executes a step using the router
   */
  async executeStep(step: Step): Promise<RoutedExecutionResult> {
    const context: ExecutionContext = {
      tabId: this.activeTabId,
      visionEngine: this.visionEngine,
      csvMapper: this.csvMapper,
      currentRowIndex: this.currentRowIndex,
      visionAvailable: this.visionEngine !== null,
      failsafeEnabled: this.config.enableFallback,
      abortSignal: this.abortController?.signal,
      onProgress: this.progressCallback,
      globalDelayMs: this.recording?.globalDelayMs || 500,
      recordingSettings: {
        loopStartIndex: this.recording?.loopStartIndex || 0,
        defaultConfidence: 0.6
      }
    };

    return this.router.executeWithRouting(step, context);
  }

  /**
   * Gets routing statistics
   */
  getExecutionStats(): ReturnType<ExecutionRouter['getStats']> {
    return this.router.getStats();
  }
}
```

---

## 5. CODE EXAMPLES

### 5.1 Basic Routing Usage

```typescript
import { ExecutionRouter } from '@/lib/executionRouter';

const router = new ExecutionRouter({
  defaultMode: 'dom',
  enableFallback: true,
  visionAvailable: true
});

// Get routing decision for a step
const decision = router.getRoutingDecision(step);
console.log(`Will execute via ${decision.primaryMode} (${decision.reason})`);
```

### 5.2 Execute with Routing

```typescript
const result = await router.executeWithRouting(step, context);

if (result.success) {
  console.log(`Step succeeded via ${result.finalMode}`);
} else {
  console.log(`Primary (${result.primaryAttempt.mode}): ${result.primaryAttempt.error}`);
  if (result.fallbackAttempt) {
    console.log(`Fallback (${result.fallbackAttempt.mode}): ${result.fallbackAttempt.error}`);
  }
}
```

### 5.3 Force Vision Mode

```typescript
router.updateConfig({ forceMode: 'vision' });

// All steps will now use Vision regardless of recordedVia
const result = await router.executeWithRouting(step, context);
```

### 5.4 Disable Fallback

```typescript
router.updateConfig({ enableFallback: false });

// Steps will only try their primary mode, no fallback
const decision = router.getRoutingDecision(step);
console.log(`Fallback enabled: ${decision.fallbackEnabled}`); // false
```

### 5.5 Check Statistics

```typescript
// After running multiple steps
const stats = router.getStats();

console.log(`DOM: ${stats.domSuccess} success, ${stats.domFail} fail`);
console.log(`Vision: ${stats.visionSuccess} success, ${stats.visionFail} fail`);
console.log(`Fallbacks triggered: ${stats.fallbacksTriggered}`);

const domSuccessRate = stats.domSuccess / (stats.domSuccess + stats.domFail) * 100;
console.log(`DOM success rate: ${domSuccessRate.toFixed(1)}%`);
```

### 5.6 PlaybackEngine Usage

```typescript
const engine = new PlaybackEngine(config);

// Initialize Vision for hybrid execution
await engine.initializeVision();

// Execute steps - routing is automatic
for (const step of recording.steps) {
  const result = await engine.executeStep(step);
  
  if (!result.success) {
    console.error(`Step ${step.id} failed via ${result.finalMode}`);
    break;
  }
}

// Check overall stats
const stats = engine.getExecutionStats();
console.log('Execution stats:', stats);
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** Routes steps with recordedVia='vision' to Vision
- [ ] **AC-2:** Routes steps with recordedVia='dom' to DOM
- [ ] **AC-3:** Routes conditional_click to Vision only
- [ ] **AC-4:** Routes navigate/delay to DOM only
- [ ] **AC-5:** Falls back from DOM to Vision on failure
- [ ] **AC-6:** Falls back from Vision to DOM on failure
- [ ] **AC-7:** Respects forceMode configuration
- [ ] **AC-8:** Respects enableFallback configuration
- [ ] **AC-9:** Tracks execution statistics
- [ ] **AC-10:** Integrates with PlaybackEngine

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Vision availability** - Must check before routing to Vision
2. **Action compatibility** - Some actions only work in one mode
3. **Fallback timeout** - Should add combined timeout limit

### Patterns to Follow

1. **Strategy pattern** - Executor selection based on mode
2. **Chain of responsibility** - Primary → Fallback
3. **Statistics tracking** - Monitor mode success rates

### Edge Cases

1. **Vision not initialized** - Skip Vision-only steps
2. **Both modes fail** - Report comprehensive error
3. **Missing selector and visionTarget** - Use default mode
4. **Rapid fallback cycles** - May indicate page issue
5. **Mode change mid-recording** - Handle gracefully

---

## 8. VERIFICATION COMMANDS

```bash
# Verify ExecutionRouter exists
ls -la src/lib/executionRouter.ts

# Verify exports
grep -n "ExecutionRouter\|getExecutionRouter" src/lib/executionRouter.ts

# Verify PlaybackEngine integration
grep -n "router\|executeWithRouting" src/lib/playbackEngine.ts

# Run type check
npm run type-check

# Build extension
npm run build
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Remove new file
rm src/lib/executionRouter.ts

# Revert PlaybackEngine changes
git checkout src/lib/playbackEngine.ts

# Revert type definitions
git checkout src/types/execution.types.ts
```

---

## 10. REFERENCES

- ENG-001: VisionEngine Class
- ENG-017: Step Executor Module
- ENG-015: Auto-Detection Failsafe
- FND-010: Step Interface Extension (recordedVia)
- Architecture Spec: `/future-spec/04_architecture.md`

---

*End of Specification INT-008*
