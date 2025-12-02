# ENG-017: Step Executor Module

> **Build Card:** ENG-017  
> **Category:** Core Engine  
> **Dependencies:** ENG-001 through ENG-014, INT-001 through INT-008  
> **Risk Level:** High  
> **Estimated Lines:** 480-560

---

## 1. PURPOSE

Implement a unified step executor module that consolidates all step execution logic into a single, maintainable module. This executor handles both DOM-based and Vision-based steps, applies delays, manages CSV variable substitution, and integrates with the auto-detection failsafe system. Serves as the central orchestration point for all step types during playback.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| VisionEngine | `src/lib/visionEngine.ts` | All Vision methods |
| PlaybackEngine | `src/lib/playbackEngine.ts` | Current step execution |
| AutoDetectionFailsafe | `src/lib/autoDetectionFailsafe.ts` | Failsafe integration |
| CSVPositionMapper | `src/lib/csvPositionMapper.ts` | Variable substitution |
| Architecture Spec | `/future-spec/04_architecture.md` | Executor pattern |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/lib/stepExecutors.ts` | CREATE | ~350 |
| `src/lib/stepExecutorRegistry.ts` | CREATE | ~80 |
| `src/types/executor.types.ts` | CREATE | ~60 |
| `src/lib/playbackEngine.ts` | MODIFY | +30 |

### Artifacts

- Individual executor functions for each step type
- `StepExecutorRegistry` for dynamic executor lookup
- `ExecutionContext` interface for shared state
- Unified `executeStep()` entry point

---

## 4. DETAILED SPECIFICATION

### 4.1 Type Definitions

```typescript
// In src/types/executor.types.ts

import { Step } from './step.types';
import { VisionEngine } from '@/lib/visionEngine';
import { CSVPositionMapper } from '@/lib/csvPositionMapper';

/**
 * Result from executing a single step
 */
export interface StepExecutionResult {
  success: boolean;
  stepId: string;
  action: string;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
  duration: number;
  method: 'dom' | 'vision' | 'hybrid' | 'skipped';
  metadata?: Record<string, unknown>;
}

/**
 * Context passed to all step executors
 */
export interface ExecutionContext {
  /** Active browser tab ID */
  tabId: number;
  
  /** VisionEngine instance (may be null if not initialized) */
  visionEngine: VisionEngine | null;
  
  /** CSV mapper for variable substitution */
  csvMapper: CSVPositionMapper | null;
  
  /** Current CSV row index */
  currentRowIndex: number;
  
  /** Whether Vision is available and initialized */
  visionAvailable: boolean;
  
  /** Whether failsafe is enabled */
  failsafeEnabled: boolean;
  
  /** Abort signal for cancellation */
  abortSignal?: AbortSignal;
  
  /** Callback for progress updates */
  onProgress?: (progress: StepProgress) => void;
  
  /** Global delay settings */
  globalDelayMs: number;
  
  /** Recording-level settings */
  recordingSettings: {
    loopStartIndex: number;
    defaultConfidence: number;
  };
}

/**
 * Progress update during step execution
 */
export interface StepProgress {
  stepId: string;
  phase: 'starting' | 'executing' | 'waiting' | 'complete' | 'failed';
  message?: string;
  percentComplete?: number;
}

/**
 * Step executor function signature
 */
export type StepExecutor = (
  step: Step,
  context: ExecutionContext
) => Promise<StepExecutionResult>;

/**
 * Registry entry for step executors
 */
export interface ExecutorRegistryEntry {
  /** Actions this executor handles */
  actions: string[];
  
  /** The executor function */
  executor: StepExecutor;
  
  /** Whether this executor supports Vision */
  supportsVision: boolean;
  
  /** Whether this executor supports DOM */
  supportsDom: boolean;
}
```

### 4.2 Step Executor Registry

```typescript
// In src/lib/stepExecutorRegistry.ts

import { StepExecutor, ExecutorRegistryEntry } from '@/types/executor.types';
import { Step } from '@/types/step.types';

/**
 * Registry for step executors
 * Maps action types to their executor functions
 */
export class StepExecutorRegistry {
  private executors: Map<string, ExecutorRegistryEntry> = new Map();
  private defaultExecutor: StepExecutor | null = null;

  /**
   * Registers an executor for specific actions
   */
  register(entry: ExecutorRegistryEntry): void {
    entry.actions.forEach(action => {
      this.executors.set(action.toLowerCase(), entry);
    });
  }

  /**
   * Sets the default executor for unknown actions
   */
  setDefault(executor: StepExecutor): void {
    this.defaultExecutor = executor;
  }

  /**
   * Gets the executor for a step
   */
  getExecutor(step: Step): ExecutorRegistryEntry | null {
    const action = step.action.toLowerCase();
    return this.executors.get(action) || null;
  }

  /**
   * Gets the default executor
   */
  getDefault(): StepExecutor | null {
    return this.defaultExecutor;
  }

  /**
   * Checks if an action has a registered executor
   */
  hasExecutor(action: string): boolean {
    return this.executors.has(action.toLowerCase());
  }

  /**
   * Lists all registered actions
   */
  listActions(): string[] {
    return [...this.executors.keys()];
  }
}

// Singleton instance
let registryInstance: StepExecutorRegistry | null = null;

export function getExecutorRegistry(): StepExecutorRegistry {
  if (!registryInstance) {
    registryInstance = new StepExecutorRegistry();
  }
  return registryInstance;
}
```

### 4.3 Individual Step Executors

```typescript
// In src/lib/stepExecutors.ts

import { Step } from '@/types/step.types';
import { 
  StepExecutionResult, 
  ExecutionContext,
  StepExecutor 
} from '@/types/executor.types';
import { getExecutorRegistry } from './stepExecutorRegistry';

// ============================================================
// DOM-BASED EXECUTORS
// ============================================================

/**
 * Executes a DOM-based click action
 */
export async function executeDomClick(
  step: Step,
  context: ExecutionContext
): Promise<StepExecutionResult> {
  const startTime = performance.now();
  
  try {
    const response = await sendMessageToTab(context.tabId, {
      type: 'EXECUTE_CLICK',
      payload: {
        selector: step.selector,
        xpath: step.xpath,
        frameId: step.frameId
      }
    });

    return {
      success: response.success,
      stepId: step.id,
      action: 'click',
      error: response.error,
      duration: performance.now() - startTime,
      method: 'dom'
    };
  } catch (error) {
    return {
      success: false,
      stepId: step.id,
      action: 'click',
      error: error instanceof Error ? error.message : 'DOM click failed',
      duration: performance.now() - startTime,
      method: 'dom'
    };
  }
}

/**
 * Executes a DOM-based input/type action
 */
export async function executeDomInput(
  step: Step,
  context: ExecutionContext
): Promise<StepExecutionResult> {
  const startTime = performance.now();
  
  // Substitute CSV variables
  let value = step.value || '';
  if (context.csvMapper && value.includes('{{')) {
    const result = context.csvMapper.substitute(value, { 
      rowIndex: context.currentRowIndex 
    });
    value = result.value;
  }

  try {
    const response = await sendMessageToTab(context.tabId, {
      type: 'EXECUTE_INPUT',
      payload: {
        selector: step.selector,
        xpath: step.xpath,
        value,
        clearFirst: step.clearFirst ?? true,
        frameId: step.frameId
      }
    });

    return {
      success: response.success,
      stepId: step.id,
      action: 'input',
      error: response.error,
      duration: performance.now() - startTime,
      method: 'dom',
      metadata: { valueLength: value.length }
    };
  } catch (error) {
    return {
      success: false,
      stepId: step.id,
      action: 'input',
      error: error instanceof Error ? error.message : 'DOM input failed',
      duration: performance.now() - startTime,
      method: 'dom'
    };
  }
}

/**
 * Executes a DOM-based select action
 */
export async function executeDomSelect(
  step: Step,
  context: ExecutionContext
): Promise<StepExecutionResult> {
  const startTime = performance.now();
  
  let value = step.value || '';
  if (context.csvMapper && value.includes('{{')) {
    const result = context.csvMapper.substitute(value, { 
      rowIndex: context.currentRowIndex 
    });
    value = result.value;
  }

  try {
    const response = await sendMessageToTab(context.tabId, {
      type: 'EXECUTE_SELECT',
      payload: {
        selector: step.selector,
        value,
        frameId: step.frameId
      }
    });

    return {
      success: response.success,
      stepId: step.id,
      action: 'select',
      error: response.error,
      duration: performance.now() - startTime,
      method: 'dom'
    };
  } catch (error) {
    return {
      success: false,
      stepId: step.id,
      action: 'select',
      error: error instanceof Error ? error.message : 'DOM select failed',
      duration: performance.now() - startTime,
      method: 'dom'
    };
  }
}

// ============================================================
// VISION-BASED EXECUTORS
// ============================================================

/**
 * Executes a Vision-based click action
 */
export async function executeVisionClick(
  step: Step,
  context: ExecutionContext
): Promise<StepExecutionResult> {
  const startTime = performance.now();
  
  if (!context.visionEngine || !context.visionAvailable) {
    return {
      success: false,
      stepId: step.id,
      action: 'vision_click',
      error: 'VisionEngine not available',
      duration: performance.now() - startTime,
      method: 'vision'
    };
  }

  const targetText = step.visionTarget || step.elementText || step.label || '';
  
  if (!targetText) {
    return {
      success: false,
      stepId: step.id,
      action: 'vision_click',
      error: 'No vision target text specified',
      duration: performance.now() - startTime,
      method: 'vision'
    };
  }

  try {
    const findResult = await context.visionEngine.findText(targetText, {
      confidence: step.visionConfidence || context.recordingSettings.defaultConfidence,
      tabId: context.tabId
    });

    if (!findResult.found || !findResult.location) {
      return {
        success: false,
        stepId: step.id,
        action: 'vision_click',
        error: `Text "${targetText}" not found`,
        duration: performance.now() - startTime,
        method: 'vision'
      };
    }

    const clickX = findResult.location.x + (findResult.location.width / 2) + (step.visionOffsetX || 0);
    const clickY = findResult.location.y + (findResult.location.height / 2) + (step.visionOffsetY || 0);

    const clickResult = await context.visionEngine.clickAtCoordinates(clickX, clickY, {
      tabId: context.tabId
    });

    return {
      success: clickResult.success,
      stepId: step.id,
      action: 'vision_click',
      error: clickResult.error,
      duration: performance.now() - startTime,
      method: 'vision',
      metadata: {
        targetText,
        coordinates: { x: clickX, y: clickY }
      }
    };
  } catch (error) {
    return {
      success: false,
      stepId: step.id,
      action: 'vision_click',
      error: error instanceof Error ? error.message : 'Vision click failed',
      duration: performance.now() - startTime,
      method: 'vision'
    };
  }
}

/**
 * Executes a Vision-based type action
 */
export async function executeVisionType(
  step: Step,
  context: ExecutionContext
): Promise<StepExecutionResult> {
  const startTime = performance.now();
  
  if (!context.visionEngine || !context.visionAvailable) {
    return {
      success: false,
      stepId: step.id,
      action: 'vision_type',
      error: 'VisionEngine not available',
      duration: performance.now() - startTime,
      method: 'vision'
    };
  }

  const targetText = step.visionTarget || step.label || '';
  let inputText = step.value || '';
  
  // CSV substitution
  if (context.csvMapper && inputText.includes('{{')) {
    const result = context.csvMapper.substitute(inputText, { 
      rowIndex: context.currentRowIndex 
    });
    inputText = result.value;
  }

  try {
    const typeResult = await context.visionEngine.typeText({
      targetText,
      inputText,
      typeDelayMs: step.typeDelayMs || 50,
      clearFirst: step.clearFirst ?? true,
      offsetX: step.visionOffsetX || 100,
      offsetY: step.visionOffsetY || 0,
      confidence: step.visionConfidence || context.recordingSettings.defaultConfidence,
      tabId: context.tabId
    });

    return {
      success: typeResult.success,
      stepId: step.id,
      action: 'vision_type',
      error: typeResult.error,
      duration: performance.now() - startTime,
      method: 'vision',
      metadata: {
        targetText,
        charactersTyped: typeResult.charactersTyped
      }
    };
  } catch (error) {
    return {
      success: false,
      stepId: step.id,
      action: 'vision_type',
      error: error instanceof Error ? error.message : 'Vision type failed',
      duration: performance.now() - startTime,
      method: 'vision'
    };
  }
}

/**
 * Executes a conditional click (polling for buttons)
 */
export async function executeConditionalClick(
  step: Step,
  context: ExecutionContext
): Promise<StepExecutionResult> {
  const startTime = performance.now();
  
  if (!context.visionEngine || !context.visionAvailable) {
    return {
      success: false,
      stepId: step.id,
      action: 'conditional_click',
      error: 'VisionEngine not available',
      duration: performance.now() - startTime,
      method: 'vision'
    };
  }

  const config = step.conditionalConfig;
  if (!config) {
    return {
      success: false,
      stepId: step.id,
      action: 'conditional_click',
      error: 'No conditional configuration',
      duration: performance.now() - startTime,
      method: 'vision'
    };
  }

  try {
    const result = await context.visionEngine.waitAndClickButtons({
      buttonTexts: config.buttonTexts,
      successText: config.successText,
      timeoutMs: config.timeoutMs,
      pollIntervalMs: config.pollIntervalMs || 500,
      maxClicks: config.maxClicks,
      confidence: config.confidence || 0.7,
      postClickDelayMs: config.postClickDelayMs || 500,
      tabId: context.tabId,
      abortSignal: context.abortSignal,
      onProgress: (progress) => {
        context.onProgress?.({
          stepId: step.id,
          phase: progress.phase === 'success' ? 'complete' : 'executing',
          message: `Clicks: ${progress.clickCount}, Phase: ${progress.phase}`
        });
      }
    });

    return {
      success: result.success,
      stepId: step.id,
      action: 'conditional_click',
      error: result.error,
      duration: performance.now() - startTime,
      method: 'vision',
      metadata: {
        reason: result.reason,
        totalClicks: result.totalClicks,
        clickHistory: result.clickHistory
      }
    };
  } catch (error) {
    return {
      success: false,
      stepId: step.id,
      action: 'conditional_click',
      error: error instanceof Error ? error.message : 'Conditional click failed',
      duration: performance.now() - startTime,
      method: 'vision'
    };
  }
}

// ============================================================
// SPECIAL EXECUTORS
// ============================================================

/**
 * Executes a page navigation action
 */
export async function executeNavigate(
  step: Step,
  context: ExecutionContext
): Promise<StepExecutionResult> {
  const startTime = performance.now();
  
  let url = step.url || step.value || '';
  
  // CSV substitution
  if (context.csvMapper && url.includes('{{')) {
    const result = context.csvMapper.substitute(url, { 
      rowIndex: context.currentRowIndex 
    });
    url = result.value;
  }

  try {
    await chrome.tabs.update(context.tabId, { url });
    
    // Wait for page load
    await waitForPageLoad(context.tabId, 30000);

    return {
      success: true,
      stepId: step.id,
      action: 'navigate',
      duration: performance.now() - startTime,
      method: 'dom',
      metadata: { url }
    };
  } catch (error) {
    return {
      success: false,
      stepId: step.id,
      action: 'navigate',
      error: error instanceof Error ? error.message : 'Navigation failed',
      duration: performance.now() - startTime,
      method: 'dom'
    };
  }
}

/**
 * Executes a delay/wait action
 */
export async function executeDelay(
  step: Step,
  context: ExecutionContext
): Promise<StepExecutionResult> {
  const startTime = performance.now();
  const delayMs = step.delayMs || step.value ? parseInt(String(step.value), 10) : 1000;

  await new Promise(resolve => setTimeout(resolve, delayMs));

  return {
    success: true,
    stepId: step.id,
    action: 'delay',
    duration: performance.now() - startTime,
    method: 'dom',
    metadata: { delayMs }
  };
}

/**
 * Executes a keyboard action
 */
export async function executeKeyboard(
  step: Step,
  context: ExecutionContext
): Promise<StepExecutionResult> {
  const startTime = performance.now();
  
  const keys = step.keys || (step.value ? [step.value] : []);
  
  if (context.visionEngine && context.visionAvailable) {
    try {
      const result = await context.visionEngine.sendKeys(keys as string[], {
        tabId: context.tabId
      });

      return {
        success: result.success,
        stepId: step.id,
        action: 'keyboard',
        error: result.error,
        duration: performance.now() - startTime,
        method: 'vision',
        metadata: { keys }
      };
    } catch (error) {
      return {
        success: false,
        stepId: step.id,
        action: 'keyboard',
        error: error instanceof Error ? error.message : 'Keyboard action failed',
        duration: performance.now() - startTime,
        method: 'vision'
      };
    }
  }

  // Fallback to DOM-based keyboard
  try {
    const response = await sendMessageToTab(context.tabId, {
      type: 'EXECUTE_KEYBOARD',
      payload: { keys }
    });

    return {
      success: response.success,
      stepId: step.id,
      action: 'keyboard',
      error: response.error,
      duration: performance.now() - startTime,
      method: 'dom',
      metadata: { keys }
    };
  } catch (error) {
    return {
      success: false,
      stepId: step.id,
      action: 'keyboard',
      error: error instanceof Error ? error.message : 'Keyboard action failed',
      duration: performance.now() - startTime,
      method: 'dom'
    };
  }
}

// ============================================================
// UNIFIED EXECUTOR
// ============================================================

/**
 * Main entry point for step execution
 * Routes to appropriate executor based on step configuration
 */
export async function executeStep(
  step: Step,
  context: ExecutionContext
): Promise<StepExecutionResult> {
  const startTime = performance.now();

  // Check abort signal
  if (context.abortSignal?.aborted) {
    return {
      success: false,
      stepId: step.id,
      action: step.action,
      skipped: true,
      skipReason: 'Playback aborted',
      duration: 0,
      method: 'skipped'
    };
  }

  // Report starting
  context.onProgress?.({
    stepId: step.id,
    phase: 'starting',
    message: `Executing ${step.action}`
  });

  // Determine execution method
  const useVision = step.recordedVia === 'vision' || 
                    step.action.startsWith('vision_') ||
                    step.action === 'conditional_click';

  let result: StepExecutionResult;

  if (useVision) {
    result = await executeVisionStep(step, context);
  } else {
    result = await executeDomStep(step, context);
  }

  // Apply per-step delay if specified
  const stepDelay = step.delayMs || 0;
  const globalDelay = context.globalDelayMs || 0;
  const effectiveDelay = stepDelay > 0 ? stepDelay : globalDelay;

  if (effectiveDelay > 0 && result.success) {
    context.onProgress?.({
      stepId: step.id,
      phase: 'waiting',
      message: `Waiting ${effectiveDelay}ms`
    });
    await new Promise(resolve => setTimeout(resolve, effectiveDelay));
  }

  // Report completion
  context.onProgress?.({
    stepId: step.id,
    phase: result.success ? 'complete' : 'failed',
    message: result.error
  });

  return result;
}

/**
 * Executes a Vision-type step
 */
async function executeVisionStep(
  step: Step,
  context: ExecutionContext
): Promise<StepExecutionResult> {
  switch (step.action) {
    case 'vision_click':
    case 'click':
      return executeVisionClick(step, context);
    case 'vision_type':
    case 'input':
    case 'type':
      return executeVisionType(step, context);
    case 'conditional_click':
      return executeConditionalClick(step, context);
    default:
      return {
        success: false,
        stepId: step.id,
        action: step.action,
        error: `Unknown vision action: ${step.action}`,
        duration: 0,
        method: 'vision'
      };
  }
}

/**
 * Executes a DOM-type step
 */
async function executeDomStep(
  step: Step,
  context: ExecutionContext
): Promise<StepExecutionResult> {
  switch (step.action) {
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
        error: `Unknown action: ${step.action}`,
        duration: 0,
        method: 'dom'
      };
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

async function sendMessageToTab(
  tabId: number,
  message: unknown
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ success: false, error: chrome.runtime.lastError.message });
      } else {
        resolve(response || { success: false, error: 'No response' });
      }
    });
  });
}

async function waitForPageLoad(tabId: number, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Page load timeout'));
    }, timeoutMs);

    const listener = (
      updatedTabId: number,
      changeInfo: chrome.tabs.TabChangeInfo
    ) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };

    chrome.tabs.onUpdated.addListener(listener);
  });
}

// ============================================================
// REGISTRY INITIALIZATION
// ============================================================

export function initializeExecutorRegistry(): void {
  const registry = getExecutorRegistry();

  registry.register({
    actions: ['click'],
    executor: executeDomClick,
    supportsVision: true,
    supportsDom: true
  });

  registry.register({
    actions: ['input', 'type'],
    executor: executeDomInput,
    supportsVision: true,
    supportsDom: true
  });

  registry.register({
    actions: ['select'],
    executor: executeDomSelect,
    supportsVision: true,
    supportsDom: true
  });

  registry.register({
    actions: ['navigate', 'open'],
    executor: executeNavigate,
    supportsVision: false,
    supportsDom: true
  });

  registry.register({
    actions: ['delay', 'wait'],
    executor: executeDelay,
    supportsVision: false,
    supportsDom: true
  });

  registry.register({
    actions: ['keyboard', 'keypress'],
    executor: executeKeyboard,
    supportsVision: true,
    supportsDom: true
  });

  registry.register({
    actions: ['conditional_click'],
    executor: executeConditionalClick,
    supportsVision: true,
    supportsDom: false
  });

  registry.register({
    actions: ['vision_click'],
    executor: executeVisionClick,
    supportsVision: true,
    supportsDom: false
  });

  registry.register({
    actions: ['vision_type'],
    executor: executeVisionType,
    supportsVision: true,
    supportsDom: false
  });
}
```

---

## 5. CODE EXAMPLES

### 5.1 Basic Step Execution

```typescript
import { executeStep, initializeExecutorRegistry } from '@/lib/stepExecutors';
import { VisionEngine } from '@/lib/visionEngine';

// Initialize registry
initializeExecutorRegistry();

// Create context
const context: ExecutionContext = {
  tabId: activeTabId,
  visionEngine: new VisionEngine(),
  csvMapper: null,
  currentRowIndex: 0,
  visionAvailable: true,
  failsafeEnabled: true,
  globalDelayMs: 500,
  recordingSettings: {
    loopStartIndex: 0,
    defaultConfidence: 0.6
  }
};

// Execute a step
const result = await executeStep(clickStep, context);
console.log(`Step ${result.stepId}: ${result.success ? 'passed' : 'failed'} via ${result.method}`);
```

### 5.2 With Progress Callback

```typescript
const context: ExecutionContext = {
  // ... other properties
  onProgress: (progress) => {
    console.log(`[${progress.stepId}] ${progress.phase}: ${progress.message || ''}`);
    updateUI(progress);
  }
};

await executeStep(step, context);
```

### 5.3 With CSV Variables

```typescript
import { CSVPositionMapper } from '@/lib/csvPositionMapper';

const csvMapper = CSVPositionMapper.fromCSVString(csvContent);

const context: ExecutionContext = {
  tabId: activeTabId,
  visionEngine,
  csvMapper,
  currentRowIndex: 2, // Third data row
  // ... rest
};

// Step value "{{email}}" will be substituted
const step = {
  id: 'input-1',
  action: 'input',
  value: '{{email}}',
  selector: '#email-field'
};

await executeStep(step, context);
```

### 5.4 Conditional Click Execution

```typescript
const conditionalStep: Step = {
  id: 'conditional-1',
  action: 'conditional_click',
  conditionalConfig: {
    buttonTexts: ['Allow', 'Keep'],
    successText: 'committed',
    timeoutMs: 120000,
    pollIntervalMs: 500
  }
};

const result = await executeStep(conditionalStep, context);
console.log(`Clicked ${result.metadata?.totalClicks} buttons`);
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** DOM click executor works correctly
- [ ] **AC-2:** DOM input executor substitutes CSV variables
- [ ] **AC-3:** Vision click executor finds and clicks text
- [ ] **AC-4:** Vision type executor types with substitution
- [ ] **AC-5:** Conditional click executor polls and clicks
- [ ] **AC-6:** Navigate executor handles page loads
- [ ] **AC-7:** Delay executor waits correct duration
- [ ] **AC-8:** Keyboard executor sends key combinations
- [ ] **AC-9:** Progress callbacks fire at correct phases
- [ ] **AC-10:** Abort signal stops execution

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Executor isolation** - Each executor should be independent
2. **Error handling** - Always return result, never throw
3. **Context immutability** - Don't modify context object

### Patterns to Follow

1. **Strategy pattern** - Executors selected by action type
2. **Registry pattern** - Dynamic executor lookup
3. **Result objects** - Consistent return structure

### Edge Cases

1. **Unknown action** - Return error result, don't crash
2. **Missing VisionEngine** - Skip vision steps gracefully
3. **Tab closed** - Handle chrome.runtime errors
4. **Rapid execution** - Respect delays between steps

---

## 8. VERIFICATION COMMANDS

```bash
# Verify file creation
ls -la src/lib/stepExecutors.ts
ls -la src/lib/stepExecutorRegistry.ts
ls -la src/types/executor.types.ts

# Verify exports
grep -n "executeStep\|initializeExecutorRegistry" src/lib/stepExecutors.ts

# Run type check
npm run type-check

# Build extension
npm run build
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Remove new files
rm src/lib/stepExecutors.ts
rm src/lib/stepExecutorRegistry.ts
rm src/types/executor.types.ts

# Revert PlaybackEngine changes
git checkout src/lib/playbackEngine.ts
```

---

## 10. REFERENCES

- ENG-001 through ENG-014: VisionEngine methods
- ENG-015: Auto-detection failsafe
- ENG-016: CSV position mapping
- INT-001 through INT-008: Message handlers
- Architecture Spec: `/future-spec/04_architecture.md`

---

*End of Specification ENG-017*
