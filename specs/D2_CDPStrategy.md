# CDPStrategy Content Specification

**File ID:** D2  
**File Path:** `src/background/services/strategies/CDPStrategy.ts`  
**Status:** CREATE  
**Priority:** P1

---

## Purpose

Evaluates CDP-based semantic locator strategies (cdp_semantic, cdp_power) during playback. Uses the Chrome Accessibility Tree to find elements by ARIA role, accessible name, labels, placeholders, and text content - mirroring Playwright's getByRole, getByLabel, getByText, and getByPlaceholder methods. These strategies have the highest confidence (0.95 and 0.90) because they target elements the way users and assistive technologies perceive them, making them resilient to CSS/DOM changes.

---

## Dependencies

### Uses (imports from)
- `../CDPService`: CDPService, CDPCommandResult, AXNode
- `../AccessibilityService`: AccessibilityService, AXMatchResult, RoleMatchOptions
- `../PlaywrightLocators`: PlaywrightLocators, LocatorResult
- `../../types/strategy`: StrategyType, LocatorStrategy

### Used By (exports to)
- `../DecisionEngine`: Uses for CDP strategy evaluation
- `../strategies/index`: Re-exports strategy evaluators

---

## Interfaces

```typescript
/**
 * CDP strategy evaluator configuration
 */
interface CDPStrategyConfig {
  /** Timeout for accessibility queries in ms (default: 5000) */
  queryTimeout: number;
  /** Whether to use exact text matching (default: false) */
  exactMatch: boolean;
  /** Whether to include hidden elements (default: false) */
  includeHidden: boolean;
  /** Minimum role match confidence (default: 0.7) */
  minRoleConfidence: number;
  /** Minimum text match confidence (default: 0.6) */
  minTextConfidence: number;
}

/**
 * CDP semantic strategy metadata
 */
interface CDPSemanticMetadata {
  /** ARIA role to match */
  role: string;
  /** Accessible name to match (optional) */
  name?: string;
  /** Match exact name (default: false) */
  exact?: boolean;
  /** Element states to match */
  states?: {
    checked?: boolean;
    disabled?: boolean;
    expanded?: boolean;
    pressed?: boolean;
    selected?: boolean;
  };
  /** Heading level (1-6) for heading role */
  level?: number;
}

/**
 * CDP power strategy metadata
 */
interface CDPPowerMetadata {
  /** Text content to match */
  text?: string;
  /** Label text to match */
  label?: string;
  /** Placeholder text to match */
  placeholder?: string;
  /** Test ID to match */
  testId?: string;
  /** Alt text to match (for images) */
  altText?: string;
  /** Title attribute to match */
  title?: string;
  /** Match exact text (default: false) */
  exact?: boolean;
}

/**
 * Strategy evaluation result (reused from DOMStrategy)
 */
interface StrategyEvaluationResult {
  strategy: LocatorStrategy;
  found: boolean;
  confidence: number;
  backendNodeId?: number;
  nodeId?: number;
  clickPoint?: { x: number; y: number };
  duration: number;
  matchCount?: number;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Locator method used
 */
type CDPLocatorMethod = 
  | 'getByRole'
  | 'getByText'
  | 'getByLabel'
  | 'getByPlaceholder'
  | 'getByTestId'
  | 'getByAltText'
  | 'getByTitle';
```

---

## Functions

```typescript
/**
 * CDPStrategy - Evaluates CDP-based semantic locator strategies
 */
class CDPStrategy implements StrategyEvaluator {
  private cdpService: CDPService;
  private accessibilityService: AccessibilityService;
  private locators: PlaywrightLocators;
  private config: CDPStrategyConfig;

  /** Strategy types handled by this evaluator */
  readonly handledTypes: StrategyType[] = ['cdp_semantic', 'cdp_power'];

  /**
   * Create new CDPStrategy instance
   * @param cdpService - CDP service instance
   * @param accessibilityService - Accessibility service instance
   * @param locators - Playwright locators instance
   * @param config - Strategy configuration
   */
  constructor(
    cdpService: CDPService,
    accessibilityService: AccessibilityService,
    locators: PlaywrightLocators,
    config?: Partial<CDPStrategyConfig>
  );

  /**
   * Check if this evaluator handles a strategy type
   * @param type - Strategy type
   * @returns Whether handled
   */
  handles(type: StrategyType): boolean;

  /**
   * Evaluate a CDP strategy
   * @param tabId - Target tab
   * @param strategy - Strategy to evaluate
   * @returns Evaluation result
   */
  async evaluate(tabId: number, strategy: LocatorStrategy): Promise<StrategyEvaluationResult>;

  /**
   * Evaluate CDP semantic strategy (role + name)
   * @param tabId - Target tab
   * @param strategy - Strategy with semantic metadata
   * @returns Evaluation result
   */
  async evaluateSemantic(
    tabId: number,
    strategy: LocatorStrategy
  ): Promise<StrategyEvaluationResult>;

  /**
   * Evaluate CDP power strategy (text/label/placeholder)
   * @param tabId - Target tab
   * @param strategy - Strategy with power metadata
   * @returns Evaluation result
   */
  async evaluatePower(
    tabId: number,
    strategy: LocatorStrategy
  ): Promise<StrategyEvaluationResult>;

  /**
   * Evaluate using getByRole
   * @param tabId - Target tab
   * @param role - ARIA role
   * @param options - Role options
   * @returns Evaluation result
   */
  async evaluateByRole(
    tabId: number,
    role: string,
    options?: {
      name?: string;
      exact?: boolean;
      states?: CDPSemanticMetadata['states'];
      level?: number;
    }
  ): Promise<StrategyEvaluationResult>;

  /**
   * Evaluate using getByText
   * @param tabId - Target tab
   * @param text - Text to match
   * @param exact - Exact match
   * @returns Evaluation result
   */
  async evaluateByText(
    tabId: number,
    text: string,
    exact?: boolean
  ): Promise<StrategyEvaluationResult>;

  /**
   * Evaluate using getByLabel
   * @param tabId - Target tab
   * @param label - Label text
   * @param exact - Exact match
   * @returns Evaluation result
   */
  async evaluateByLabel(
    tabId: number,
    label: string,
    exact?: boolean
  ): Promise<StrategyEvaluationResult>;

  /**
   * Evaluate using getByPlaceholder
   * @param tabId - Target tab
   * @param placeholder - Placeholder text
   * @param exact - Exact match
   * @returns Evaluation result
   */
  async evaluateByPlaceholder(
    tabId: number,
    placeholder: string,
    exact?: boolean
  ): Promise<StrategyEvaluationResult>;

  /**
   * Evaluate using getByTestId
   * @param tabId - Target tab
   * @param testId - Test ID
   * @returns Evaluation result
   */
  async evaluateByTestId(
    tabId: number,
    testId: string
  ): Promise<StrategyEvaluationResult>;

  /**
   * Get the best locator method for metadata
   * @param metadata - Strategy metadata
   * @returns Best method and argument
   */
  selectBestMethod(metadata: CDPPowerMetadata): {
    method: CDPLocatorMethod;
    arg: string;
  } | null;

  // Private helper methods
  private buildRoleOptions(metadata: CDPSemanticMetadata): RoleMatchOptions;
  private locatorResultToEvaluation(
    result: LocatorResult,
    strategy: LocatorStrategy,
    startTime: number,
    method: CDPLocatorMethod
  ): StrategyEvaluationResult;
  private calculateSemanticConfidence(hasRole: boolean, hasName: boolean, matchCount: number): number;
}

export {
  CDPStrategy,
  CDPStrategyConfig,
  CDPSemanticMetadata,
  CDPPowerMetadata,
  CDPLocatorMethod
};
```

---

## Key Implementation Details

### Constructor and Configuration
```typescript
constructor(
  cdpService: CDPService,
  accessibilityService: AccessibilityService,
  locators: PlaywrightLocators,
  config?: Partial<CDPStrategyConfig>
) {
  this.cdpService = cdpService;
  this.accessibilityService = accessibilityService;
  this.locators = locators;
  this.config = {
    queryTimeout: config?.queryTimeout ?? 5000,
    exactMatch: config?.exactMatch ?? false,
    includeHidden: config?.includeHidden ?? false,
    minRoleConfidence: config?.minRoleConfidence ?? 0.7,
    minTextConfidence: config?.minTextConfidence ?? 0.6
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

  if (!strategy.metadata) {
    return {
      strategy,
      found: false,
      confidence: 0,
      duration: Date.now() - startTime,
      error: 'CDP strategy requires metadata'
    };
  }

  try {
    if (strategy.type === 'cdp_semantic') {
      return await this.evaluateSemantic(tabId, strategy);
    } else if (strategy.type === 'cdp_power') {
      return await this.evaluatePower(tabId, strategy);
    } else {
      return {
        strategy,
        found: false,
        confidence: 0,
        duration: Date.now() - startTime,
        error: `Unknown CDP strategy type: ${strategy.type}`
      };
    }
  } catch (error) {
    return {
      strategy,
      found: false,
      confidence: 0,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'CDP evaluation failed'
    };
  }
}
```

### Semantic Strategy Evaluation
```typescript
async evaluateSemantic(
  tabId: number,
  strategy: LocatorStrategy
): Promise<StrategyEvaluationResult> {
  const startTime = Date.now();
  const metadata = strategy.metadata as CDPSemanticMetadata;

  if (!metadata.role) {
    return {
      strategy,
      found: false,
      confidence: 0,
      duration: Date.now() - startTime,
      error: 'CDP semantic strategy requires role'
    };
  }

  // Build role options
  const roleOptions = this.buildRoleOptions(metadata);

  // Use PlaywrightLocators.getByRole
  const result = await this.locators.getByRole(tabId, metadata.role, {
    name: metadata.name,
    exact: metadata.exact ?? this.config.exactMatch,
    checked: metadata.states?.checked,
    disabled: metadata.states?.disabled,
    expanded: metadata.states?.expanded,
    pressed: metadata.states?.pressed,
    selected: metadata.states?.selected,
    level: metadata.level,
    includeHidden: this.config.includeHidden
  });

  if (!result.found) {
    return {
      strategy,
      found: false,
      confidence: 0,
      duration: Date.now() - startTime,
      error: result.error || `No element with role "${metadata.role}"${metadata.name ? ` and name "${metadata.name}"` : ''}`
    };
  }

  // Calculate confidence based on match quality
  const confidence = this.calculateSemanticConfidence(
    true,
    !!metadata.name,
    result.matchCount
  );

  return {
    strategy,
    found: true,
    confidence,
    backendNodeId: result.backendNodeId,
    nodeId: result.nodeId,
    clickPoint: result.boundingBox ? {
      x: result.boundingBox.x + result.boundingBox.width / 2,
      y: result.boundingBox.y + result.boundingBox.height / 2
    } : undefined,
    duration: Date.now() - startTime,
    matchCount: result.matchCount,
    metadata: {
      method: 'getByRole',
      role: metadata.role,
      name: metadata.name
    }
  };
}

private buildRoleOptions(metadata: CDPSemanticMetadata): RoleMatchOptions {
  return {
    role: metadata.role as any,
    name: metadata.name,
    exact: metadata.exact,
    includeHidden: this.config.includeHidden,
    checked: metadata.states?.checked,
    disabled: metadata.states?.disabled,
    expanded: metadata.states?.expanded,
    pressed: metadata.states?.pressed,
    selected: metadata.states?.selected,
    level: metadata.level
  };
}

private calculateSemanticConfidence(
  hasRole: boolean,
  hasName: boolean,
  matchCount: number
): number {
  // Base confidence for semantic strategy
  let confidence = 0.95;

  // Role without name is less specific
  if (!hasName) {
    confidence = 0.80;
  }

  // Multiple matches reduce confidence
  if (matchCount > 1) {
    confidence -= Math.min(0.15 * Math.log2(matchCount), 0.25);
  }

  return Math.max(confidence, this.config.minRoleConfidence);
}
```

### Power Strategy Evaluation
```typescript
async evaluatePower(
  tabId: number,
  strategy: LocatorStrategy
): Promise<StrategyEvaluationResult> {
  const startTime = Date.now();
  const metadata = strategy.metadata as CDPPowerMetadata;

  // Select best method based on available metadata
  const methodSelection = this.selectBestMethod(metadata);
  if (!methodSelection) {
    return {
      strategy,
      found: false,
      confidence: 0,
      duration: Date.now() - startTime,
      error: 'CDP power strategy requires at least one of: text, label, placeholder, testId'
    };
  }

  const { method, arg } = methodSelection;
  const exact = metadata.exact ?? this.config.exactMatch;

  // Execute the appropriate method
  let result: LocatorResult;

  switch (method) {
    case 'getByText':
      result = await this.evaluateByText(tabId, arg, exact);
      break;
    case 'getByLabel':
      result = await this.evaluateByLabel(tabId, arg, exact);
      break;
    case 'getByPlaceholder':
      result = await this.evaluateByPlaceholder(tabId, arg, exact);
      break;
    case 'getByTestId':
      result = await this.evaluateByTestId(tabId, arg);
      break;
    case 'getByAltText':
      result = await this.locators.getByAltText(tabId, arg, { exact });
      break;
    case 'getByTitle':
      result = await this.locators.getByTitle(tabId, arg, { exact });
      break;
    default:
      return {
        strategy,
        found: false,
        confidence: 0,
        duration: Date.now() - startTime,
        error: `Unknown method: ${method}`
      };
  }

  return this.locatorResultToEvaluation(result, strategy, startTime, method);
}

selectBestMethod(metadata: CDPPowerMetadata): {
  method: CDPLocatorMethod;
  arg: string;
} | null {
  // Priority order: testId > label > placeholder > text > altText > title
  // TestId is most reliable
  if (metadata.testId) {
    return { method: 'getByTestId', arg: metadata.testId };
  }

  // Label is very reliable for form elements
  if (metadata.label) {
    return { method: 'getByLabel', arg: metadata.label };
  }

  // Placeholder is good for inputs
  if (metadata.placeholder) {
    return { method: 'getByPlaceholder', arg: metadata.placeholder };
  }

  // Text content
  if (metadata.text) {
    return { method: 'getByText', arg: metadata.text };
  }

  // Alt text for images
  if (metadata.altText) {
    return { method: 'getByAltText', arg: metadata.altText };
  }

  // Title attribute
  if (metadata.title) {
    return { method: 'getByTitle', arg: metadata.title };
  }

  return null;
}
```

### Individual Method Implementations
```typescript
async evaluateByText(
  tabId: number,
  text: string,
  exact?: boolean
): Promise<StrategyEvaluationResult> {
  const startTime = Date.now();
  
  const result = await this.locators.getByText(tabId, text, {
    exact: exact ?? this.config.exactMatch,
    includeHidden: this.config.includeHidden
  });

  return this.locatorResultToEvaluation(result, { type: 'cdp_power' } as LocatorStrategy, startTime, 'getByText');
}

async evaluateByLabel(
  tabId: number,
  label: string,
  exact?: boolean
): Promise<StrategyEvaluationResult> {
  const startTime = Date.now();

  const result = await this.locators.getByLabel(tabId, label, {
    exact: exact ?? this.config.exactMatch,
    includeHidden: this.config.includeHidden
  });

  return this.locatorResultToEvaluation(result, { type: 'cdp_power' } as LocatorStrategy, startTime, 'getByLabel');
}

async evaluateByPlaceholder(
  tabId: number,
  placeholder: string,
  exact?: boolean
): Promise<StrategyEvaluationResult> {
  const startTime = Date.now();

  const result = await this.locators.getByPlaceholder(tabId, placeholder, {
    exact: exact ?? this.config.exactMatch,
    includeHidden: this.config.includeHidden
  });

  return this.locatorResultToEvaluation(result, { type: 'cdp_power' } as LocatorStrategy, startTime, 'getByPlaceholder');
}

async evaluateByTestId(
  tabId: number,
  testId: string
): Promise<StrategyEvaluationResult> {
  const startTime = Date.now();

  const result = await this.locators.getByTestId(tabId, testId, {
    exact: true, // Test IDs should always be exact
    includeHidden: this.config.includeHidden
  });

  // Test IDs get highest confidence
  const evaluation = this.locatorResultToEvaluation(
    result,
    { type: 'cdp_power' } as LocatorStrategy,
    startTime,
    'getByTestId'
  );

  if (evaluation.found) {
    evaluation.confidence = 0.95; // Boost confidence for test IDs
  }

  return evaluation;
}
```

### Result Conversion
```typescript
private locatorResultToEvaluation(
  result: LocatorResult,
  strategy: LocatorStrategy,
  startTime: number,
  method: CDPLocatorMethod
): StrategyEvaluationResult {
  if (!result.found) {
    return {
      strategy,
      found: false,
      confidence: 0,
      duration: Date.now() - startTime,
      error: result.error || 'Element not found',
      metadata: { method }
    };
  }

  // Calculate confidence based on method and match count
  let confidence = result.confidence;

  // Adjust based on method reliability
  switch (method) {
    case 'getByTestId':
      confidence = Math.max(confidence, 0.95);
      break;
    case 'getByRole':
      confidence = Math.max(confidence, 0.90);
      break;
    case 'getByLabel':
      confidence = Math.max(confidence, 0.88);
      break;
    case 'getByPlaceholder':
      confidence = Math.max(confidence, 0.85);
      break;
    case 'getByText':
      confidence = Math.max(confidence, 0.80);
      break;
    default:
      confidence = Math.max(confidence, 0.75);
  }

  // Reduce confidence for multiple matches
  if (result.matchCount > 1) {
    confidence -= Math.min(0.1 * Math.log2(result.matchCount), 0.2);
  }

  return {
    strategy,
    found: true,
    confidence: Math.max(confidence, this.config.minTextConfidence),
    backendNodeId: result.backendNodeId,
    nodeId: result.nodeId,
    clickPoint: result.boundingBox ? {
      x: result.boundingBox.x + result.boundingBox.width / 2,
      y: result.boundingBox.y + result.boundingBox.height / 2
    } : undefined,
    duration: Date.now() - startTime,
    matchCount: result.matchCount,
    metadata: { method }
  };
}
```

---

## Integration Points

### With DecisionEngine
```typescript
// DecisionEngine uses CDPStrategy
class DecisionEngine {
  private cdpStrategy: CDPStrategy;

  async routeToEvaluator(tabId: number, strategy: LocatorStrategy) {
    if (this.cdpStrategy.handles(strategy.type)) {
      return this.cdpStrategy.evaluate(tabId, strategy);
    }
    // ... other evaluators
  }
}
```

### With AccessibilityService
```typescript
// CDPStrategy delegates role queries to AccessibilityService
async evaluateSemantic(tabId: number, strategy: LocatorStrategy) {
  // AccessibilityService provides AX tree traversal
  const matches = await this.accessibilityService.getByRole(tabId, {
    role: metadata.role,
    name: metadata.name
  });
  
  // ... process matches
}
```

---

## Acceptance Criteria

- [ ] Evaluates cdp_semantic strategies with role + name
- [ ] Evaluates cdp_power strategies with text/label/placeholder
- [ ] getByRole uses AccessibilityService
- [ ] getByText finds elements by content
- [ ] getByLabel finds inputs by associated label
- [ ] getByPlaceholder finds inputs by placeholder
- [ ] getByTestId finds elements by data-testid
- [ ] Supports exact vs contains matching
- [ ] Calculates confidence based on match quality
- [ ] Penalizes multiple matches
- [ ] Returns click point coordinates
- [ ] TypeScript compiles with strict mode, 0 errors

---

## Edge Cases

1. **No role in metadata**: Return error for semantic
2. **Empty text/label**: Skip that method
3. **Multiple matches**: Lower confidence
4. **Hidden elements**: Configurable inclusion
5. **No accessible name**: Role-only match has lower confidence
6. **Generic roles**: Lower confidence for generic/presentation
7. **State mismatch**: No match if states don't match
8. **Heading without level**: Match any heading
9. **Text with special characters**: Handle properly
10. **Computed name from labelledby**: Resolved by AX tree

---

## Estimated Lines

350-400 lines
