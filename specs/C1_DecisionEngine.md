# DecisionEngine Content Specification

**File ID:** C1  
**File Path:** `src/background/services/DecisionEngine.ts`  
**Status:** FIX (existing file with errors)  
**Priority:** P0

---

## Purpose

Central coordinator for the 7-tier strategy evaluation system during playback. Receives a FallbackChain from recorded steps, evaluates ALL strategies in parallel (not sequentially), scores each based on current page state, selects the highest-confidence match, and executes the action. Implements the core principle that fast strategies are *preferred* but not *required* - if Vision has 95% confidence and DOM has 40%, Vision wins. This is the brain of the playback system.

---

## Dependencies

### Uses (imports from)
- `./CDPService`: CDPService for element operations
- `./PlaywrightLocators`: PlaywrightLocators, LocatorResult
- `./AccessibilityService`: AccessibilityService for semantic queries
- `./AutoWaiting`: AutoWaiting for actionability checks
- `./VisionService`: VisionService for OCR strategies
- `./TelemetryLogger`: TelemetryLogger for strategy tracking
- `./strategies/StrategyEvaluator`: StrategyEvaluator interface
- `./strategies/DOMStrategy`: DOMStrategy evaluator
- `./strategies/CDPStrategy`: CDPStrategy evaluator
- `./strategies/VisionStrategy`: VisionStrategy evaluator
- `./strategies/CoordinatesStrategy`: CoordinatesStrategy evaluator
- `../../types/strategy`: StrategyType, LocatorStrategy, FallbackChain
- `../../types/cdp`: CDPNode

### Used By (exports to)
- `../background.ts`: Message handler delegation
- `../../pages/TestRunner.tsx`: Invokes playback execution

---

## Interfaces

```typescript
/**
 * Decision engine configuration
 */
interface DecisionEngineConfig {
  /** Default timeout for strategy evaluation in ms (default: 30000) */
  timeout: number;
  /** Minimum confidence threshold to accept a strategy (default: 0.5) */
  minConfidence: number;
  /** Whether to run strategies in parallel (default: true) */
  parallelEvaluation: boolean;
  /** Maximum strategies to evaluate in parallel (default: 7) */
  maxParallelStrategies: number;
  /** Enable telemetry logging (default: true) */
  enableTelemetry: boolean;
  /** Retry failed strategies (default: true) */
  retryOnFailure: boolean;
  /** Maximum retry attempts (default: 2) */
  maxRetries: number;
}

/**
 * Strategy evaluation result
 */
interface StrategyEvaluationResult {
  /** Strategy that was evaluated */
  strategy: LocatorStrategy;
  /** Whether element was found */
  found: boolean;
  /** Confidence score (0-1) */
  confidence: number;
  /** Backend node ID if found */
  backendNodeId?: number;
  /** Click point if found */
  clickPoint?: { x: number; y: number };
  /** Evaluation duration in ms */
  duration: number;
  /** Error message if failed */
  error?: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Complete evaluation results for all strategies
 */
interface EvaluationResults {
  /** All strategy results */
  results: StrategyEvaluationResult[];
  /** Best strategy (highest confidence that found element) */
  bestStrategy: StrategyEvaluationResult | null;
  /** Total evaluation time */
  totalDuration: number;
  /** Number of strategies evaluated */
  strategiesEvaluated: number;
  /** Number of strategies that found element */
  strategiesSucceeded: number;
}

/**
 * Action execution result
 */
interface ActionExecutionResult {
  /** Whether action succeeded */
  success: boolean;
  /** Strategy that was used */
  usedStrategy: LocatorStrategy;
  /** All evaluation results */
  evaluationResults: EvaluationResults;
  /** Action execution duration */
  executionDuration: number;
  /** Total duration (evaluation + execution) */
  totalDuration: number;
  /** Error message if failed */
  error?: string;
  /** Telemetry ID for tracking */
  telemetryId?: string;
}

/**
 * Action to execute
 */
interface ActionRequest {
  /** Tab ID */
  tabId: number;
  /** Fallback chain from recording */
  fallbackChain: FallbackChain;
  /** Action type */
  actionType: 'click' | 'type' | 'select' | 'hover' | 'scroll';
  /** Value for type/select actions */
  value?: string;
  /** Step index (for telemetry) */
  stepIndex?: number;
  /** Override timeout */
  timeout?: number;
}

/**
 * Strategy weight configuration (fixed, not user-configurable)
 */
interface StrategyWeights {
  cdp_semantic: number;
  cdp_power: number;
  dom_selector: number;
  evidence_scoring: number;
  css_selector: number;
  vision_ocr: number;
  coordinates: number;
}

/**
 * Decision engine status
 */
type DecisionEngineStatus = 'idle' | 'evaluating' | 'executing' | 'error';
```

---

## Functions

```typescript
/**
 * DecisionEngine - Central strategy evaluation and execution
 */
class DecisionEngine {
  private config: DecisionEngineConfig;
  private status: DecisionEngineStatus;
  private cdpService: CDPService;
  private locators: PlaywrightLocators;
  private accessibilityService: AccessibilityService;
  private autoWaiting: AutoWaiting;
  private visionService: VisionService;
  private telemetryLogger: TelemetryLogger;
  
  // Strategy evaluators
  private domStrategy: DOMStrategy;
  private cdpStrategy: CDPStrategy;
  private visionStrategy: VisionStrategy;
  private coordinatesStrategy: CoordinatesStrategy;

  // Fixed strategy weights (Architecture Decision #6)
  private readonly STRATEGY_WEIGHTS: StrategyWeights = {
    cdp_semantic: 0.95,
    cdp_power: 0.90,
    dom_selector: 0.85,
    evidence_scoring: 0.80,
    css_selector: 0.75,
    vision_ocr: 0.70,
    coordinates: 0.60
  };

  /**
   * Create new DecisionEngine instance
   * @param services - Required service instances
   * @param config - Engine configuration
   */
  constructor(
    services: {
      cdpService: CDPService;
      locators: PlaywrightLocators;
      accessibilityService: AccessibilityService;
      autoWaiting: AutoWaiting;
      visionService: VisionService;
      telemetryLogger: TelemetryLogger;
    },
    config?: Partial<DecisionEngineConfig>
  );

  /**
   * Execute an action using the fallback chain
   * @param request - Action request with fallback chain
   * @returns Promise resolving to execution result
   */
  async executeAction(request: ActionRequest): Promise<ActionExecutionResult>;

  /**
   * Evaluate all strategies in a fallback chain
   * @param tabId - Target tab
   * @param fallbackChain - Strategies to evaluate
   * @param timeout - Evaluation timeout
   * @returns Promise resolving to evaluation results
   */
  async evaluateStrategies(
    tabId: number,
    fallbackChain: FallbackChain,
    timeout?: number
  ): Promise<EvaluationResults>;

  /**
   * Evaluate a single strategy
   * @param tabId - Target tab
   * @param strategy - Strategy to evaluate
   * @returns Promise resolving to evaluation result
   */
  async evaluateStrategy(
    tabId: number,
    strategy: LocatorStrategy
  ): Promise<StrategyEvaluationResult>;

  /**
   * Select best strategy from evaluation results
   * @param results - Evaluation results
   * @returns Best strategy or null
   */
  selectBestStrategy(results: EvaluationResults): StrategyEvaluationResult | null;

  /**
   * Execute action on found element
   * @param tabId - Target tab
   * @param backendNodeId - Element backend node ID
   * @param clickPoint - Click coordinates (for vision/coordinates)
   * @param actionType - Action to perform
   * @param value - Value for type/select
   * @returns Promise resolving to success
   */
  async performAction(
    tabId: number,
    backendNodeId: number | undefined,
    clickPoint: { x: number; y: number } | undefined,
    actionType: ActionRequest['actionType'],
    value?: string
  ): Promise<{ success: boolean; error?: string }>;

  /**
   * Get current engine status
   * @returns Engine status
   */
  getStatus(): DecisionEngineStatus;

  /**
   * Get strategy weight
   * @param strategyType - Strategy type
   * @returns Weight (0-1)
   */
  getStrategyWeight(strategyType: StrategyType): number;

  /**
   * Calculate final confidence score
   * @param baseConfidence - Base confidence from evaluator
   * @param strategyType - Strategy type for weight
   * @returns Weighted confidence
   */
  calculateFinalConfidence(baseConfidence: number, strategyType: StrategyType): number;

  // Private methods
  private routeToEvaluator(tabId: number, strategy: LocatorStrategy): Promise<StrategyEvaluationResult>;
  private executeClick(tabId: number, backendNodeId?: number, clickPoint?: { x: number; y: number }): Promise<void>;
  private executeType(tabId: number, backendNodeId: number, value: string): Promise<void>;
  private executeSelect(tabId: number, backendNodeId: number, value: string): Promise<void>;
  private executeHover(tabId: number, backendNodeId?: number, clickPoint?: { x: number; y: number }): Promise<void>;
  private withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T>;
}

export {
  DecisionEngine,
  DecisionEngineConfig,
  StrategyEvaluationResult,
  EvaluationResults,
  ActionExecutionResult,
  ActionRequest,
  StrategyWeights
};
```

---

## Key Implementation Details

### Constructor and Service Injection
```typescript
constructor(
  services: {
    cdpService: CDPService;
    locators: PlaywrightLocators;
    accessibilityService: AccessibilityService;
    autoWaiting: AutoWaiting;
    visionService: VisionService;
    telemetryLogger: TelemetryLogger;
  },
  config?: Partial<DecisionEngineConfig>
) {
  this.cdpService = services.cdpService;
  this.locators = services.locators;
  this.accessibilityService = services.accessibilityService;
  this.autoWaiting = services.autoWaiting;
  this.visionService = services.visionService;
  this.telemetryLogger = services.telemetryLogger;

  this.config = {
    timeout: config?.timeout ?? 30000,
    minConfidence: config?.minConfidence ?? 0.5,
    parallelEvaluation: config?.parallelEvaluation ?? true,
    maxParallelStrategies: config?.maxParallelStrategies ?? 7,
    enableTelemetry: config?.enableTelemetry ?? true,
    retryOnFailure: config?.retryOnFailure ?? true,
    maxRetries: config?.maxRetries ?? 2
  };

  this.status = 'idle';

  // Initialize strategy evaluators
  this.domStrategy = new DOMStrategy(this.cdpService, this.locators);
  this.cdpStrategy = new CDPStrategy(this.cdpService, this.accessibilityService, this.locators);
  this.visionStrategy = new VisionStrategy(this.visionService);
  this.coordinatesStrategy = new CoordinatesStrategy(this.cdpService);
}
```

### Execute Action (Main Entry Point)
```typescript
async executeAction(request: ActionRequest): Promise<ActionExecutionResult> {
  const startTime = Date.now();
  const timeout = request.timeout ?? this.config.timeout;
  let telemetryId: string | undefined;

  this.status = 'evaluating';

  try {
    // Start telemetry
    if (this.config.enableTelemetry) {
      telemetryId = await this.telemetryLogger.startAction({
        stepIndex: request.stepIndex,
        actionType: request.actionType,
        strategyCount: request.fallbackChain.strategies.length
      });
    }

    // Evaluate all strategies
    const evaluationResults = await this.evaluateStrategies(
      request.tabId,
      request.fallbackChain,
      timeout
    );

    // Select best strategy
    const bestStrategy = this.selectBestStrategy(evaluationResults);

    if (!bestStrategy || !bestStrategy.found) {
      // All strategies failed
      const error = 'No strategy found element';
      
      if (this.config.enableTelemetry && telemetryId) {
        await this.telemetryLogger.endAction(telemetryId, {
          success: false,
          error,
          evaluationResults
        });
      }

      return {
        success: false,
        usedStrategy: request.fallbackChain.strategies[0],
        evaluationResults,
        executionDuration: 0,
        totalDuration: Date.now() - startTime,
        error,
        telemetryId
      };
    }

    // Execute the action
    this.status = 'executing';
    const executionStart = Date.now();

    // Wait for element to be actionable (if we have backendNodeId)
    if (bestStrategy.backendNodeId) {
      const waitResult = await this.autoWaiting.waitForActionable(
        request.tabId,
        bestStrategy.backendNodeId,
        { timeout: 5000 }
      );

      if (!waitResult.success) {
        console.warn('[DecisionEngine] Element not actionable:', waitResult.failureReason);
        // Continue anyway - the action might still work
      }

      // Scroll into view if needed
      await this.autoWaiting.scrollIntoViewIfNeeded(request.tabId, bestStrategy.backendNodeId);
    }

    // Perform the action
    const actionResult = await this.performAction(
      request.tabId,
      bestStrategy.backendNodeId,
      bestStrategy.clickPoint,
      request.actionType,
      request.value
    );

    const executionDuration = Date.now() - executionStart;

    // Log telemetry
    if (this.config.enableTelemetry && telemetryId) {
      await this.telemetryLogger.endAction(telemetryId, {
        success: actionResult.success,
        usedStrategy: bestStrategy.strategy.type,
        confidence: bestStrategy.confidence,
        evaluationResults,
        executionDuration,
        error: actionResult.error
      });
    }

    this.status = 'idle';

    return {
      success: actionResult.success,
      usedStrategy: bestStrategy.strategy,
      evaluationResults,
      executionDuration,
      totalDuration: Date.now() - startTime,
      error: actionResult.error,
      telemetryId
    };

  } catch (error) {
    this.status = 'error';
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (this.config.enableTelemetry && telemetryId) {
      await this.telemetryLogger.endAction(telemetryId, {
        success: false,
        error: errorMessage
      });
    }

    return {
      success: false,
      usedStrategy: request.fallbackChain.strategies[0],
      evaluationResults: {
        results: [],
        bestStrategy: null,
        totalDuration: Date.now() - startTime,
        strategiesEvaluated: 0,
        strategiesSucceeded: 0
      },
      executionDuration: 0,
      totalDuration: Date.now() - startTime,
      error: errorMessage,
      telemetryId
    };
  }
}
```

### Parallel Strategy Evaluation
```typescript
async evaluateStrategies(
  tabId: number,
  fallbackChain: FallbackChain,
  timeout?: number
): Promise<EvaluationResults> {
  const startTime = Date.now();
  const effectiveTimeout = timeout ?? this.config.timeout;
  const strategies = fallbackChain.strategies;

  let results: StrategyEvaluationResult[];

  if (this.config.parallelEvaluation) {
    // Evaluate ALL strategies in parallel
    // This is the key design decision - we don't short-circuit
    const evaluationPromises = strategies.map(strategy =>
      this.withTimeout(
        this.evaluateStrategy(tabId, strategy),
        effectiveTimeout,
        `Strategy ${strategy.type}`
      ).catch(error => ({
        strategy,
        found: false,
        confidence: 0,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Evaluation failed'
      } as StrategyEvaluationResult))
    );

    results = await Promise.all(evaluationPromises);
  } else {
    // Sequential evaluation (not recommended)
    results = [];
    for (const strategy of strategies) {
      const result = await this.evaluateStrategy(tabId, strategy);
      results.push(result);
    }
  }

  // Calculate final confidences with strategy weights
  results = results.map(result => ({
    ...result,
    confidence: result.found
      ? this.calculateFinalConfidence(result.confidence, result.strategy.type)
      : 0
  }));

  // Sort by confidence (highest first)
  results.sort((a, b) => b.confidence - a.confidence);

  const successfulResults = results.filter(r => r.found);

  return {
    results,
    bestStrategy: successfulResults[0] || null,
    totalDuration: Date.now() - startTime,
    strategiesEvaluated: results.length,
    strategiesSucceeded: successfulResults.length
  };
}
```

### Single Strategy Evaluation with Routing
```typescript
async evaluateStrategy(
  tabId: number,
  strategy: LocatorStrategy
): Promise<StrategyEvaluationResult> {
  const startTime = Date.now();

  try {
    return await this.routeToEvaluator(tabId, strategy);
  } catch (error) {
    return {
      strategy,
      found: false,
      confidence: 0,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Evaluation failed'
    };
  }
}

private async routeToEvaluator(
  tabId: number,
  strategy: LocatorStrategy
): Promise<StrategyEvaluationResult> {
  const startTime = Date.now();

  switch (strategy.type) {
    case 'dom_selector':
    case 'css_selector':
      return this.domStrategy.evaluate(tabId, strategy);

    case 'cdp_semantic':
    case 'cdp_power':
      return this.cdpStrategy.evaluate(tabId, strategy);

    case 'vision_ocr':
      return this.visionStrategy.evaluate(tabId, strategy);

    case 'coordinates':
      return this.coordinatesStrategy.evaluate(tabId, strategy);

    case 'evidence_scoring':
      // Evidence scoring combines multiple signals
      return this.evaluateEvidenceScoring(tabId, strategy);

    default:
      return {
        strategy,
        found: false,
        confidence: 0,
        duration: Date.now() - startTime,
        error: `Unknown strategy type: ${strategy.type}`
      };
  }
}
```

### Best Strategy Selection
```typescript
selectBestStrategy(results: EvaluationResults): StrategyEvaluationResult | null {
  // Results are already sorted by confidence
  const successfulResults = results.results.filter(r => r.found);

  if (successfulResults.length === 0) {
    return null;
  }

  // Return highest confidence strategy that meets minimum threshold
  const qualified = successfulResults.filter(r => r.confidence >= this.config.minConfidence);

  if (qualified.length === 0) {
    // If nothing meets threshold, use the best available anyway
    console.warn('[DecisionEngine] No strategy met confidence threshold, using best available');
    return successfulResults[0];
  }

  return qualified[0];
}

calculateFinalConfidence(baseConfidence: number, strategyType: StrategyType): number {
  const weight = this.STRATEGY_WEIGHTS[strategyType] ?? 0.5;
  
  // Final confidence = base * weight
  // This means a high-confidence vision result can beat a low-confidence DOM result
  return baseConfidence * weight;
}

getStrategyWeight(strategyType: StrategyType): number {
  return this.STRATEGY_WEIGHTS[strategyType] ?? 0.5;
}
```

### Action Execution
```typescript
async performAction(
  tabId: number,
  backendNodeId: number | undefined,
  clickPoint: { x: number; y: number } | undefined,
  actionType: ActionRequest['actionType'],
  value?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    switch (actionType) {
      case 'click':
        await this.executeClick(tabId, backendNodeId, clickPoint);
        break;

      case 'type':
        if (!backendNodeId) {
          return { success: false, error: 'Type requires element, not coordinates' };
        }
        if (!value) {
          return { success: false, error: 'Type requires value' };
        }
        await this.executeType(tabId, backendNodeId, value);
        break;

      case 'select':
        if (!backendNodeId) {
          return { success: false, error: 'Select requires element' };
        }
        if (!value) {
          return { success: false, error: 'Select requires value' };
        }
        await this.executeSelect(tabId, backendNodeId, value);
        break;

      case 'hover':
        await this.executeHover(tabId, backendNodeId, clickPoint);
        break;

      case 'scroll':
        // Scroll is handled by scrollIntoViewIfNeeded
        break;

      default:
        return { success: false, error: `Unknown action type: ${actionType}` };
    }

    return { success: true };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Action failed'
    };
  }
}

private async executeClick(
  tabId: number,
  backendNodeId?: number,
  clickPoint?: { x: number; y: number }
): Promise<void> {
  let x: number;
  let y: number;

  if (backendNodeId) {
    // Get click point from element
    const point = await this.locators.getClickPoint(tabId, backendNodeId);
    if (!point) {
      throw new Error('Could not get click point for element');
    }
    x = point.x;
    y = point.y;
  } else if (clickPoint) {
    x = clickPoint.x;
    y = clickPoint.y;
  } else {
    throw new Error('Click requires either element or coordinates');
  }

  // Dispatch mouse events via CDP
  await this.cdpService.dispatchMouseEvent(tabId, 'mouseMoved', x, y);
  await this.cdpService.dispatchMouseEvent(tabId, 'mousePressed', x, y, {
    button: 'left',
    clickCount: 1
  });
  await this.cdpService.dispatchMouseEvent(tabId, 'mouseReleased', x, y, {
    button: 'left',
    clickCount: 1
  });
}

private async executeType(
  tabId: number,
  backendNodeId: number,
  value: string
): Promise<void> {
  // Focus the element first
  const resolveResult = await this.cdpService.sendCommand(tabId, 'DOM.describeNode', {
    backendNodeId,
    depth: 0
  });

  if (!resolveResult.success || !resolveResult.result?.node?.nodeId) {
    throw new Error('Could not resolve node for typing');
  }

  await this.cdpService.focusNode(tabId, resolveResult.result.node.nodeId);

  // Clear existing content
  await this.cdpService.sendCommand(tabId, 'Input.insertText', { text: '' });

  // Select all and delete (to clear)
  await this.cdpService.dispatchKeyEvent(tabId, 'keyDown', {
    key: 'a',
    code: 'KeyA',
    modifiers: 2 // Ctrl
  });
  await this.cdpService.dispatchKeyEvent(tabId, 'keyUp', {
    key: 'a',
    code: 'KeyA'
  });
  await this.cdpService.dispatchKeyEvent(tabId, 'keyDown', {
    key: 'Backspace',
    code: 'Backspace'
  });
  await this.cdpService.dispatchKeyEvent(tabId, 'keyUp', {
    key: 'Backspace',
    code: 'Backspace'
  });

  // Type the new value
  await this.cdpService.insertText(tabId, value);
}

private async executeSelect(
  tabId: number,
  backendNodeId: number,
  value: string
): Promise<void> {
  // For select elements, we need to find and click the option
  // This is simplified - full implementation would handle various select types
  
  // Click the select to open it
  const clickPoint = await this.locators.getClickPoint(tabId, backendNodeId);
  if (clickPoint) {
    await this.executeClick(tabId, undefined, clickPoint);
  }

  // Wait for dropdown
  await new Promise(resolve => setTimeout(resolve, 100));

  // Find option with matching text
  const optionResult = await this.locators.getByText(tabId, value, { exact: true });
  if (optionResult.found && optionResult.backendNodeId) {
    await this.executeClick(tabId, optionResult.backendNodeId, undefined);
  } else {
    throw new Error(`Option "${value}" not found in select`);
  }
}
```

### Evidence Scoring Strategy
```typescript
private async evaluateEvidenceScoring(
  tabId: number,
  strategy: LocatorStrategy
): Promise<StrategyEvaluationResult> {
  const startTime = Date.now();

  // Evidence scoring combines multiple signals:
  // 1. Mouse trail endpoint
  // 2. Element attributes match
  // 3. Position stability

  const metadata = strategy.metadata;
  if (!metadata?.endpoint) {
    return {
      strategy,
      found: false,
      confidence: 0,
      duration: Date.now() - startTime,
      error: 'Evidence scoring requires endpoint metadata'
    };
  }

  const { x, y } = metadata.endpoint;

  // Get element at the recorded coordinates
  const elementResult = await this.cdpService.sendCommand(tabId, 'DOM.getNodeForLocation', {
    x: Math.round(x),
    y: Math.round(y),
    includeUserAgentShadowDOM: false
  });

  if (!elementResult.success || !elementResult.result?.backendNodeId) {
    return {
      strategy,
      found: false,
      confidence: 0,
      duration: Date.now() - startTime,
      error: 'No element at recorded coordinates'
    };
  }

  const backendNodeId = elementResult.result.backendNodeId;

  // Verify element attributes if we have them
  let attributeScore = 0.5; // Default
  if (metadata.attributes) {
    const nodeResult = await this.cdpService.sendCommand(tabId, 'DOM.describeNode', {
      backendNodeId,
      depth: 0
    });

    if (nodeResult.success && nodeResult.result?.node) {
      const currentAttrs = this.parseAttributes(nodeResult.result.node.attributes || []);
      const recordedAttrs = metadata.attributes;
      
      // Calculate attribute match percentage
      let matches = 0;
      let total = 0;
      for (const [key, value] of Object.entries(recordedAttrs)) {
        total++;
        if (currentAttrs[key] === value) {
          matches++;
        }
      }
      attributeScore = total > 0 ? matches / total : 0.5;
    }
  }

  const confidence = attributeScore;

  return {
    strategy,
    found: true,
    confidence,
    backendNodeId,
    clickPoint: { x, y },
    duration: Date.now() - startTime
  };
}

private parseAttributes(attrs: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < attrs.length; i += 2) {
    result[attrs[i]] = attrs[i + 1];
  }
  return result;
}
```

### Timeout Wrapper
```typescript
private async withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    )
  ]);
}
```

---

## Integration Points

### With Background Script
```typescript
// background.ts
const decisionEngine = new DecisionEngine({
  cdpService,
  locators,
  accessibilityService,
  autoWaiting,
  visionService,
  telemetryLogger
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'EXECUTE_STEP') {
    decisionEngine.executeAction({
      tabId: message.tabId,
      fallbackChain: message.fallbackChain,
      actionType: message.actionType,
      value: message.value,
      stepIndex: message.stepIndex
    }).then(sendResponse);
    return true;
  }

  if (message.action === 'EVALUATE_STRATEGIES') {
    decisionEngine.evaluateStrategies(message.tabId, message.fallbackChain)
      .then(sendResponse);
    return true;
  }
});
```

### With TestRunner.tsx
```typescript
// TestRunner.tsx sends step execution requests
const executeStep = async (step: Step) => {
  const result = await chrome.runtime.sendMessage({
    action: 'EXECUTE_STEP',
    tabId: currentTabId,
    fallbackChain: step.fallbackChain,
    actionType: step.type,
    value: step.value,
    stepIndex: step.index
  });

  return result;
};
```

---

## Acceptance Criteria

- [ ] executeAction() evaluates all strategies in parallel
- [ ] Strategies scored using fixed weights from STRATEGY_WEIGHTS
- [ ] Best strategy selected by highest weighted confidence
- [ ] Fast strategies preferred but not required (Vision can beat DOM)
- [ ] AutoWaiting called before action execution
- [ ] Telemetry logged for each action
- [ ] Click/Type/Select/Hover actions work correctly
- [ ] Evidence scoring uses mouse trail endpoint
- [ ] Timeout handling prevents hanging
- [ ] Retry logic works for failed strategies
- [ ] TypeScript compiles with strict mode, 0 errors

---

## Edge Cases

1. **All strategies fail**: Return failure with best attempt info
2. **Multiple strategies succeed**: Use highest confidence
3. **Equal confidence**: Prefer higher-weighted strategy type
4. **Vision higher than DOM**: Vision wins (by design)
5. **Element becomes stale**: Re-evaluate strategies
6. **Network changes page**: Handle dynamic content
7. **Modal dialogs**: May block element access
8. **Timeout during evaluation**: Return partial results
9. **CDP detached**: Re-attach and retry
10. **Worker not ready**: Wait for initialization

---

## Estimated Lines

500-600 lines
