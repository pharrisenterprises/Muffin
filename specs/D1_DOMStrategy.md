# DOMStrategy Content Specification

**File ID:** D1  
**File Path:** `src/background/services/strategies/DOMStrategy.ts`  
**Status:** CREATE  
**Priority:** P1

---

## Purpose

Evaluates DOM-based locator strategies (dom_selector, css_selector) during playback. Takes a strategy from the FallbackChain, executes the CSS selector or XPath against the current page state via CDP, and returns whether the element was found along with a confidence score. Handles selector validation, multiple matches, and shadow DOM traversal. One of the core strategy evaluators used by DecisionEngine.

---

## Dependencies

### Uses (imports from)
- `../CDPService`: CDPService, CDPCommandResult, CDPNode
- `../PlaywrightLocators`: PlaywrightLocators, LocatorResult
- `../../types/strategy`: StrategyType, LocatorStrategy
- `../../types/cdp`: BoxModel

### Used By (exports to)
- `../DecisionEngine`: Uses for DOM strategy evaluation
- `../strategies/index`: Re-exports strategy evaluators

---

## Interfaces

```typescript
/**
 * DOM strategy evaluator configuration
 */
interface DOMStrategyConfig {
  /** Timeout for selector queries in ms (default: 5000) */
  queryTimeout: number;
  /** Whether to validate selector syntax (default: true) */
  validateSelector: boolean;
  /** Whether to traverse shadow DOM (default: true) */
  traverseShadowDOM: boolean;
  /** Maximum elements to check for uniqueness (default: 10) */
  maxUniquenessCheck: number;
  /** Confidence penalty for multiple matches (default: 0.2) */
  multipleMatchPenalty: number;
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
  /** Node ID for current session */
  nodeId?: number;
  /** Click point if found */
  clickPoint?: { x: number; y: number };
  /** Evaluation duration in ms */
  duration: number;
  /** Number of matches found */
  matchCount?: number;
  /** Error message if failed */
  error?: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Selector validation result
 */
interface SelectorValidation {
  /** Whether selector is valid */
  valid: boolean;
  /** Selector type detected */
  type: 'css' | 'xpath' | 'unknown';
  /** Issues found */
  issues: string[];
  /** Normalized selector */
  normalized: string;
}

/**
 * Strategy evaluator interface (shared by all strategy types)
 */
interface StrategyEvaluator {
  /** Strategy types this evaluator handles */
  readonly handledTypes: StrategyType[];

  /**
   * Evaluate a strategy
   * @param tabId - Target tab
   * @param strategy - Strategy to evaluate
   * @returns Evaluation result
   */
  evaluate(tabId: number, strategy: LocatorStrategy): Promise<StrategyEvaluationResult>;

  /**
   * Check if this evaluator handles a strategy type
   * @param type - Strategy type
   * @returns Whether handled
   */
  handles(type: StrategyType): boolean;
}
```

---

## Functions

```typescript
/**
 * DOMStrategy - Evaluates DOM-based locator strategies
 */
class DOMStrategy implements StrategyEvaluator {
  private cdpService: CDPService;
  private locators: PlaywrightLocators;
  private config: DOMStrategyConfig;

  /** Strategy types handled by this evaluator */
  readonly handledTypes: StrategyType[] = ['dom_selector', 'css_selector'];

  /**
   * Create new DOMStrategy instance
   * @param cdpService - CDP service instance
   * @param locators - Playwright locators instance
   * @param config - Strategy configuration
   */
  constructor(
    cdpService: CDPService,
    locators: PlaywrightLocators,
    config?: Partial<DOMStrategyConfig>
  );

  /**
   * Check if this evaluator handles a strategy type
   * @param type - Strategy type
   * @returns Whether handled
   */
  handles(type: StrategyType): boolean;

  /**
   * Evaluate a DOM/CSS selector strategy
   * @param tabId - Target tab
   * @param strategy - Strategy to evaluate
   * @returns Evaluation result
   */
  async evaluate(tabId: number, strategy: LocatorStrategy): Promise<StrategyEvaluationResult>;

  /**
   * Evaluate a CSS selector
   * @param tabId - Target tab
   * @param selector - CSS selector
   * @param strategy - Original strategy
   * @returns Evaluation result
   */
  async evaluateCSSSelector(
    tabId: number,
    selector: string,
    strategy: LocatorStrategy
  ): Promise<StrategyEvaluationResult>;

  /**
   * Evaluate an XPath expression
   * @param tabId - Target tab
   * @param xpath - XPath expression
   * @param strategy - Original strategy
   * @returns Evaluation result
   */
  async evaluateXPath(
    tabId: number,
    xpath: string,
    strategy: LocatorStrategy
  ): Promise<StrategyEvaluationResult>;

  /**
   * Validate a selector string
   * @param selector - Selector to validate
   * @returns Validation result
   */
  validateSelector(selector: string): SelectorValidation;

  /**
   * Check if selector is XPath
   * @param selector - Selector string
   * @returns Whether it's XPath
   */
  isXPath(selector: string): boolean;

  /**
   * Get element count for selector (uniqueness check)
   * @param tabId - Target tab
   * @param selector - CSS selector
   * @returns Number of matching elements
   */
  async getMatchCount(tabId: number, selector: string): Promise<number>;

  /**
   * Calculate confidence based on match count
   * @param matchCount - Number of matches
   * @param baseConfidence - Base confidence from strategy
   * @returns Adjusted confidence
   */
  calculateConfidence(matchCount: number, baseConfidence: number): number;

  /**
   * Try to find element in shadow DOM
   * @param tabId - Target tab
   * @param selector - CSS selector
   * @returns Backend node ID if found
   */
  async findInShadowDOM(tabId: number, selector: string): Promise<number | null>;

  /**
   * Get click point for element
   * @param tabId - Target tab
   * @param nodeId - Node ID
   * @returns Click coordinates
   */
  async getClickPoint(tabId: number, nodeId: number): Promise<{ x: number; y: number } | null>;

  // Private helper methods
  private normalizeSelector(selector: string): string;
  private executeXPathQuery(tabId: number, xpath: string): Promise<number[]>;
  private nodeIdToBackendNodeId(tabId: number, nodeId: number): Promise<number | null>;
}

export {
  DOMStrategy,
  DOMStrategyConfig,
  StrategyEvaluationResult,
  SelectorValidation,
  StrategyEvaluator
};
```

---

## Key Implementation Details

### Constructor and Configuration
```typescript
constructor(
  cdpService: CDPService,
  locators: PlaywrightLocators,
  config?: Partial<DOMStrategyConfig>
) {
  this.cdpService = cdpService;
  this.locators = locators;
  this.config = {
    queryTimeout: config?.queryTimeout ?? 5000,
    validateSelector: config?.validateSelector ?? true,
    traverseShadowDOM: config?.traverseShadowDOM ?? true,
    maxUniquenessCheck: config?.maxUniquenessCheck ?? 10,
    multipleMatchPenalty: config?.multipleMatchPenalty ?? 0.2
  };
}

handles(type: StrategyType): boolean {
  return this.handledTypes.includes(type);
}
```

### Main Evaluate Method
```typescript
async evaluate(tabId: number, strategy: LocatorStrategy): Promise<StrategyEvaluationResult> {
  const startTime = Date.now();

  // Must have a selector
  if (!strategy.selector) {
    return {
      strategy,
      found: false,
      confidence: 0,
      duration: Date.now() - startTime,
      error: 'Strategy missing selector'
    };
  }

  // Validate selector if enabled
  if (this.config.validateSelector) {
    const validation = this.validateSelector(strategy.selector);
    if (!validation.valid) {
      return {
        strategy,
        found: false,
        confidence: 0,
        duration: Date.now() - startTime,
        error: `Invalid selector: ${validation.issues.join(', ')}`
      };
    }
  }

  // Route to appropriate evaluator
  if (this.isXPath(strategy.selector)) {
    return this.evaluateXPath(tabId, strategy.selector, strategy);
  } else {
    return this.evaluateCSSSelector(tabId, strategy.selector, strategy);
  }
}
```

### CSS Selector Evaluation
```typescript
async evaluateCSSSelector(
  tabId: number,
  selector: string,
  strategy: LocatorStrategy
): Promise<StrategyEvaluationResult> {
  const startTime = Date.now();
  const normalizedSelector = this.normalizeSelector(selector);

  try {
    // Get document root
    const docResult = await this.cdpService.getDocument(tabId);
    if (!docResult.success || !docResult.result) {
      return {
        strategy,
        found: false,
        confidence: 0,
        duration: Date.now() - startTime,
        error: 'Failed to get document'
      };
    }

    // Query for element
    const queryResult = await this.cdpService.querySelector(
      tabId,
      normalizedSelector,
      docResult.result.nodeId
    );

    if (!queryResult.success || !queryResult.result) {
      // Try shadow DOM if enabled
      if (this.config.traverseShadowDOM) {
        const shadowNodeId = await this.findInShadowDOM(tabId, normalizedSelector);
        if (shadowNodeId) {
          return this.buildSuccessResult(tabId, shadowNodeId, strategy, startTime, {
            foundInShadowDOM: true
          });
        }
      }

      return {
        strategy,
        found: false,
        confidence: 0,
        duration: Date.now() - startTime,
        error: 'Element not found'
      };
    }

    const nodeId = queryResult.result;

    // Check for multiple matches (uniqueness)
    const matchCount = await this.getMatchCount(tabId, normalizedSelector);

    // Get backend node ID
    const backendNodeId = await this.nodeIdToBackendNodeId(tabId, nodeId);
    if (!backendNodeId) {
      return {
        strategy,
        found: false,
        confidence: 0,
        duration: Date.now() - startTime,
        error: 'Failed to get backend node ID'
      };
    }

    // Calculate confidence
    const baseConfidence = strategy.confidence ?? 0.85;
    const adjustedConfidence = this.calculateConfidence(matchCount, baseConfidence);

    // Get click point
    const clickPoint = await this.getClickPoint(tabId, nodeId);

    return {
      strategy,
      found: true,
      confidence: adjustedConfidence,
      backendNodeId,
      nodeId,
      clickPoint: clickPoint || undefined,
      duration: Date.now() - startTime,
      matchCount,
      metadata: {
        selectorType: 'css',
        normalizedSelector
      }
    };

  } catch (error) {
    return {
      strategy,
      found: false,
      confidence: 0,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'CSS selector evaluation failed'
    };
  }
}
```

### XPath Evaluation
```typescript
async evaluateXPath(
  tabId: number,
  xpath: string,
  strategy: LocatorStrategy
): Promise<StrategyEvaluationResult> {
  const startTime = Date.now();

  try {
    // Execute XPath query
    const nodeIds = await this.executeXPathQuery(tabId, xpath);

    if (nodeIds.length === 0) {
      return {
        strategy,
        found: false,
        confidence: 0,
        duration: Date.now() - startTime,
        error: 'XPath found no elements'
      };
    }

    const nodeId = nodeIds[0];
    const matchCount = nodeIds.length;

    // Get backend node ID
    const backendNodeId = await this.nodeIdToBackendNodeId(tabId, nodeId);
    if (!backendNodeId) {
      return {
        strategy,
        found: false,
        confidence: 0,
        duration: Date.now() - startTime,
        error: 'Failed to get backend node ID'
      };
    }

    // Calculate confidence
    const baseConfidence = strategy.confidence ?? 0.80;
    const adjustedConfidence = this.calculateConfidence(matchCount, baseConfidence);

    // Get click point
    const clickPoint = await this.getClickPoint(tabId, nodeId);

    return {
      strategy,
      found: true,
      confidence: adjustedConfidence,
      backendNodeId,
      nodeId,
      clickPoint: clickPoint || undefined,
      duration: Date.now() - startTime,
      matchCount,
      metadata: {
        selectorType: 'xpath'
      }
    };

  } catch (error) {
    return {
      strategy,
      found: false,
      confidence: 0,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'XPath evaluation failed'
    };
  }
}

private async executeXPathQuery(tabId: number, xpath: string): Promise<number[]> {
  // Use Runtime.evaluate to execute XPath
  const result = await this.cdpService.sendCommand(tabId, 'Runtime.evaluate', {
    expression: `
      (function() {
        const result = document.evaluate(
          ${JSON.stringify(xpath)},
          document,
          null,
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
          null
        );
        const nodes = [];
        for (let i = 0; i < result.snapshotLength; i++) {
          nodes.push(result.snapshotItem(i));
        }
        return nodes;
      })()
    `,
    returnByValue: false
  });

  if (!result.success || !result.result?.result?.objectId) {
    return [];
  }

  // Get node IDs from the returned array
  const propsResult = await this.cdpService.sendCommand(tabId, 'Runtime.getProperties', {
    objectId: result.result.result.objectId
  });

  if (!propsResult.success || !propsResult.result?.result) {
    return [];
  }

  const nodeIds: number[] = [];
  for (const prop of propsResult.result.result) {
    if (prop.value?.objectId && prop.name !== 'length') {
      // Request node for this object
      const nodeResult = await this.cdpService.sendCommand(tabId, 'DOM.requestNode', {
        objectId: prop.value.objectId
      });
      if (nodeResult.success && nodeResult.result?.nodeId) {
        nodeIds.push(nodeResult.result.nodeId);
      }
    }
  }

  return nodeIds;
}
```

### Selector Validation
```typescript
validateSelector(selector: string): SelectorValidation {
  const issues: string[] = [];
  let type: 'css' | 'xpath' | 'unknown' = 'unknown';

  if (this.isXPath(selector)) {
    type = 'xpath';
    // Basic XPath validation
    if (!selector.startsWith('/') && !selector.startsWith('(')) {
      issues.push('XPath should start with / or (');
    }
  } else {
    type = 'css';
    // CSS selector validation
    try {
      // Try to use the browser's built-in validation
      document.createElement('div').querySelector(selector);
    } catch (e) {
      issues.push(`Invalid CSS selector syntax: ${(e as Error).message}`);
    }

    // Check for potentially unstable patterns
    if (/\[\d+\]/.test(selector)) {
      issues.push('Contains positional index which may be unstable');
    }
  }

  return {
    valid: issues.length === 0,
    type,
    issues,
    normalized: this.normalizeSelector(selector)
  };
}

isXPath(selector: string): boolean {
  // XPath expressions start with / or // or (
  return /^(\/|\.\/|\()/.test(selector.trim());
}

private normalizeSelector(selector: string): string {
  // Trim whitespace
  let normalized = selector.trim();

  // Remove unnecessary whitespace in combinators
  normalized = normalized.replace(/\s*>\s*/g, ' > ');
  normalized = normalized.replace(/\s*\+\s*/g, ' + ');
  normalized = normalized.replace(/\s*~\s*/g, ' ~ ');

  // Collapse multiple spaces
  normalized = normalized.replace(/\s+/g, ' ');

  return normalized;
}
```

### Shadow DOM Traversal
```typescript
async findInShadowDOM(tabId: number, selector: string): Promise<number | null> {
  try {
    // Use Runtime.evaluate to search shadow roots
    const result = await this.cdpService.sendCommand(tabId, 'Runtime.evaluate', {
      expression: `
        (function findInShadowRoots(root, selector) {
          // Check direct children
          const found = root.querySelector(selector);
          if (found) return found;

          // Check shadow roots
          const elements = root.querySelectorAll('*');
          for (const el of elements) {
            if (el.shadowRoot) {
              const shadowFound = findInShadowRoots(el.shadowRoot, selector);
              if (shadowFound) return shadowFound;
            }
          }
          return null;
        })(document, ${JSON.stringify(selector)})
      `,
      returnByValue: false
    });

    if (!result.success || !result.result?.result?.objectId) {
      return null;
    }

    // Convert to node ID
    const nodeResult = await this.cdpService.sendCommand(tabId, 'DOM.requestNode', {
      objectId: result.result.result.objectId
    });

    if (nodeResult.success && nodeResult.result?.nodeId) {
      return await this.nodeIdToBackendNodeId(tabId, nodeResult.result.nodeId);
    }

    return null;
  } catch (error) {
    console.error('[DOMStrategy] Shadow DOM search failed:', error);
    return null;
  }
}
```

### Confidence Calculation
```typescript
calculateConfidence(matchCount: number, baseConfidence: number): number {
  if (matchCount === 1) {
    // Unique match - full confidence
    return baseConfidence;
  }

  if (matchCount === 0) {
    // No match - zero confidence
    return 0;
  }

  // Multiple matches - apply penalty
  // More matches = lower confidence
  const penalty = Math.min(
    this.config.multipleMatchPenalty * Math.log2(matchCount),
    0.4 // Cap penalty at 0.4
  );

  return Math.max(baseConfidence - penalty, 0.3);
}

async getMatchCount(tabId: number, selector: string): Promise<number> {
  try {
    const docResult = await this.cdpService.getDocument(tabId);
    if (!docResult.success || !docResult.result) {
      return 0;
    }

    const queryResult = await this.cdpService.querySelectorAll(
      tabId,
      selector,
      docResult.result.nodeId
    );

    if (!queryResult.success || !queryResult.result) {
      return 0;
    }

    return Math.min(queryResult.result.length, this.config.maxUniquenessCheck);
  } catch {
    return 0;
  }
}
```

### Helper Methods
```typescript
async getClickPoint(tabId: number, nodeId: number): Promise<{ x: number; y: number } | null> {
  try {
    const boxResult = await this.cdpService.getBoxModel(tabId, nodeId);
    if (!boxResult.success || !boxResult.result) {
      return null;
    }

    const border = boxResult.result.border;
    // border is [x1,y1, x2,y2, x3,y3, x4,y4]
    const x = (border[0] + border[2] + border[4] + border[6]) / 4;
    const y = (border[1] + border[3] + border[5] + border[7]) / 4;

    return { x, y };
  } catch {
    return null;
  }
}

private async nodeIdToBackendNodeId(tabId: number, nodeId: number): Promise<number | null> {
  try {
    const result = await this.cdpService.sendCommand(tabId, 'DOM.describeNode', {
      nodeId,
      depth: 0
    });

    if (result.success && result.result?.node?.backendNodeId) {
      return result.result.node.backendNodeId;
    }
    return null;
  } catch {
    return null;
  }
}

private async buildSuccessResult(
  tabId: number,
  backendNodeId: number,
  strategy: LocatorStrategy,
  startTime: number,
  additionalMetadata?: Record<string, any>
): Promise<StrategyEvaluationResult> {
  // Resolve to node ID for click point
  const resolveResult = await this.cdpService.sendCommand(tabId, 'DOM.describeNode', {
    backendNodeId,
    depth: 0
  });

  let clickPoint: { x: number; y: number } | undefined;
  let nodeId: number | undefined;

  if (resolveResult.success && resolveResult.result?.node?.nodeId) {
    nodeId = resolveResult.result.node.nodeId;
    clickPoint = (await this.getClickPoint(tabId, nodeId)) || undefined;
  }

  return {
    strategy,
    found: true,
    confidence: strategy.confidence ?? 0.85,
    backendNodeId,
    nodeId,
    clickPoint,
    duration: Date.now() - startTime,
    matchCount: 1,
    metadata: additionalMetadata
  };
}
```

---

## Integration Points

### With DecisionEngine
```typescript
// DecisionEngine uses DOMStrategy
class DecisionEngine {
  private domStrategy: DOMStrategy;

  async routeToEvaluator(tabId: number, strategy: LocatorStrategy) {
    if (this.domStrategy.handles(strategy.type)) {
      return this.domStrategy.evaluate(tabId, strategy);
    }
    // ... other evaluators
  }
}
```

### With Strategy Index
```typescript
// src/background/services/strategies/index.ts
export { DOMStrategy } from './DOMStrategy';
export { CDPStrategy } from './CDPStrategy';
export { VisionStrategy } from './VisionStrategy';
export { CoordinatesStrategy } from './CoordinatesStrategy';
export type { StrategyEvaluator, StrategyEvaluationResult } from './DOMStrategy';
```

---

## Acceptance Criteria

- [ ] Evaluates CSS selectors via CDP
- [ ] Evaluates XPath expressions
- [ ] Validates selector syntax
- [ ] Detects XPath vs CSS automatically
- [ ] Traverses shadow DOM when enabled
- [ ] Calculates confidence based on match count
- [ ] Penalizes non-unique selectors
- [ ] Returns backend node ID for found elements
- [ ] Returns click point coordinates
- [ ] Handles timeout appropriately
- [ ] TypeScript compiles with strict mode, 0 errors

---

## Edge Cases

1. **Invalid selector syntax**: Return validation error
2. **No matches**: Return found: false
3. **Multiple matches**: Apply confidence penalty
4. **Shadow DOM element**: Search recursively
5. **Detached element**: Handle stale node IDs
6. **Iframe element**: Different document context
7. **SVG element**: May have different box model
8. **Hidden element**: Still findable by selector
9. **Dynamic ID in selector**: Lower confidence
10. **Very long selector**: May timeout

---

## Estimated Lines

350-400 lines
