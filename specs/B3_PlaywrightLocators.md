# PlaywrightLocators Content Specification

**File ID:** B3  
**File Path:** `src/background/services/PlaywrightLocators.ts`  
**Status:** FIX (existing file with errors)  
**Priority:** P0

---

## Purpose

Implements Playwright-style locator methods (getByRole, getByText, getByLabel, getByPlaceholder, getByTestId) for element location during playback. Bridges the gap between recorded FallbackChain strategies and actual DOM element retrieval by providing semantic, user-centric element location that mirrors how Playwright and Testing Library find elements. This service enables the `cdp_semantic` and `cdp_power` strategies which have the highest confidence scores (0.95 and 0.90).

---

## Dependencies

### Uses (imports from)
- `./CDPService`: CDPService, CDPCommandResult, CDPNode
- `./AccessibilityService`: AccessibilityService, AXMatchResult, RoleMatchOptions
- `../../types/cdp`: AXNode, BoxModel
- `../../types/strategy`: LocatorStrategy, StrategyType

### Used By (exports to)
- `./DecisionEngine`: Uses locators for strategy evaluation
- `./AutoWaiting`: Uses locators with wait conditions
- `../background.ts`: Message handler delegation

---

## Interfaces

```typescript
/**
 * Locator result with element information
 */
interface LocatorResult {
  /** Whether element was found */
  found: boolean;
  /** Backend node ID for CDP operations */
  backendNodeId?: number;
  /** Node ID for current session */
  nodeId?: number;
  /** Element bounding box */
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Confidence score (0-1) */
  confidence: number;
  /** Time taken to locate in ms */
  duration: number;
  /** Locator method used */
  method: LocatorMethod;
  /** Number of matches found */
  matchCount: number;
  /** Error message if not found */
  error?: string;
}

/**
 * Locator methods available
 */
type LocatorMethod =
  | 'getByRole'
  | 'getByText'
  | 'getByLabel'
  | 'getByPlaceholder'
  | 'getByTestId'
  | 'getByAltText'
  | 'getByTitle'
  | 'locator'; // CSS/XPath fallback

/**
 * Common locator options
 */
interface LocatorOptions {
  /** Exact text match (default: false) */
  exact?: boolean;
  /** Include hidden elements (default: false) */
  includeHidden?: boolean;
  /** Timeout in ms (default: 5000) */
  timeout?: number;
}

/**
 * getByRole specific options
 */
interface GetByRoleOptions extends LocatorOptions {
  /** Accessible name to match */
  name?: string | RegExp;
  /** Match checked state */
  checked?: boolean;
  /** Match disabled state */
  disabled?: boolean;
  /** Match expanded state */
  expanded?: boolean;
  /** Match pressed state */
  pressed?: boolean;
  /** Match selected state */
  selected?: boolean;
  /** Heading level (1-6) */
  level?: number;
}

/**
 * getByText specific options
 */
interface GetByTextOptions extends LocatorOptions {
  /** Match substring (default: true if not exact) */
  substring?: boolean;
}

/**
 * getByTestId specific options
 */
interface GetByTestIdOptions extends LocatorOptions {
  /** Test ID attribute name (default: 'data-testid') */
  testIdAttribute?: string;
}

/**
 * Locator chain for filtering
 */
interface LocatorChain {
  /** Base locator */
  base: PlaywrightLocator;
  /** Filter operations */
  filters: LocatorFilter[];
}

/**
 * Filter operation
 */
interface LocatorFilter {
  /** Filter type */
  type: 'first' | 'last' | 'nth' | 'filter' | 'has' | 'hasText';
  /** Filter argument */
  arg?: number | string | RegExp | PlaywrightLocator;
}

/**
 * Playwright-style locator object
 */
interface PlaywrightLocator {
  /** Locator method */
  method: LocatorMethod;
  /** Method argument (role, text, etc.) */
  arg: string;
  /** Method options */
  options?: Record<string, any>;
}
```

---

## Functions

```typescript
/**
 * PlaywrightLocators - Playwright-style element location
 */
class PlaywrightLocators {
  private cdpService: CDPService;
  private accessibilityService: AccessibilityService;

  /**
   * Create new PlaywrightLocators instance
   * @param cdpService - CDP service instance
   * @param accessibilityService - Accessibility service instance
   */
  constructor(cdpService: CDPService, accessibilityService: AccessibilityService);

  /**
   * Find element by ARIA role
   * @param tabId - Target tab
   * @param role - ARIA role to match
   * @param options - Role options
   * @returns Promise resolving to locator result
   */
  async getByRole(
    tabId: number,
    role: string,
    options?: GetByRoleOptions
  ): Promise<LocatorResult>;

  /**
   * Find element by text content
   * @param tabId - Target tab
   * @param text - Text to match
   * @param options - Text options
   * @returns Promise resolving to locator result
   */
  async getByText(
    tabId: number,
    text: string | RegExp,
    options?: GetByTextOptions
  ): Promise<LocatorResult>;

  /**
   * Find element by associated label
   * @param tabId - Target tab
   * @param label - Label text to match
   * @param options - Locator options
   * @returns Promise resolving to locator result
   */
  async getByLabel(
    tabId: number,
    label: string | RegExp,
    options?: LocatorOptions
  ): Promise<LocatorResult>;

  /**
   * Find element by placeholder attribute
   * @param tabId - Target tab
   * @param placeholder - Placeholder text to match
   * @param options - Locator options
   * @returns Promise resolving to locator result
   */
  async getByPlaceholder(
    tabId: number,
    placeholder: string | RegExp,
    options?: LocatorOptions
  ): Promise<LocatorResult>;

  /**
   * Find element by test ID attribute
   * @param tabId - Target tab
   * @param testId - Test ID to match
   * @param options - Test ID options
   * @returns Promise resolving to locator result
   */
  async getByTestId(
    tabId: number,
    testId: string | RegExp,
    options?: GetByTestIdOptions
  ): Promise<LocatorResult>;

  /**
   * Find element by alt text (images)
   * @param tabId - Target tab
   * @param altText - Alt text to match
   * @param options - Locator options
   * @returns Promise resolving to locator result
   */
  async getByAltText(
    tabId: number,
    altText: string | RegExp,
    options?: LocatorOptions
  ): Promise<LocatorResult>;

  /**
   * Find element by title attribute
   * @param tabId - Target tab
   * @param title - Title to match
   * @param options - Locator options
   * @returns Promise resolving to locator result
   */
  async getByTitle(
    tabId: number,
    title: string | RegExp,
    options?: LocatorOptions
  ): Promise<LocatorResult>;

  /**
   * Find element by CSS selector or XPath
   * @param tabId - Target tab
   * @param selector - CSS selector or XPath
   * @returns Promise resolving to locator result
   */
  async locator(tabId: number, selector: string): Promise<LocatorResult>;

  /**
   * Execute a locator strategy from FallbackChain
   * @param tabId - Target tab
   * @param strategy - Locator strategy to execute
   * @returns Promise resolving to locator result
   */
  async executeStrategy(
    tabId: number,
    strategy: LocatorStrategy
  ): Promise<LocatorResult>;

  /**
   * Find all matching elements (not just first)
   * @param tabId - Target tab
   * @param method - Locator method
   * @param arg - Method argument
   * @param options - Method options
   * @returns Promise resolving to array of results
   */
  async findAll(
    tabId: number,
    method: LocatorMethod,
    arg: string,
    options?: Record<string, any>
  ): Promise<LocatorResult[]>;

  /**
   * Get element bounding box
   * @param tabId - Target tab
   * @param backendNodeId - Backend node ID
   * @returns Promise resolving to bounding box
   */
  async getBoundingBox(
    tabId: number,
    backendNodeId: number
  ): Promise<{ x: number; y: number; width: number; height: number } | null>;

  /**
   * Get element center point for clicking
   * @param tabId - Target tab
   * @param backendNodeId - Backend node ID
   * @returns Promise resolving to center coordinates
   */
  async getClickPoint(
    tabId: number,
    backendNodeId: number
  ): Promise<{ x: number; y: number } | null>;

  /**
   * Check if element is visible
   * @param tabId - Target tab
   * @param backendNodeId - Backend node ID
   * @returns Promise resolving to visibility
   */
  async isVisible(tabId: number, backendNodeId: number): Promise<boolean>;

  /**
   * Check if element is enabled
   * @param tabId - Target tab
   * @param backendNodeId - Backend node ID
   * @returns Promise resolving to enabled state
   */
  async isEnabled(tabId: number, backendNodeId: number): Promise<boolean>;

  // Private helper methods
  private buildResult(
    found: boolean,
    method: LocatorMethod,
    startTime: number,
    data?: Partial<LocatorResult>
  ): LocatorResult;

  private matchTextPattern(value: string, pattern: string | RegExp, exact: boolean): boolean;

  private querySelectorWithText(
    tabId: number,
    selector: string,
    text: string | RegExp,
    exact: boolean
  ): Promise<number | null>;
}

export {
  PlaywrightLocators,
  LocatorResult,
  LocatorMethod,
  LocatorOptions,
  GetByRoleOptions,
  GetByTextOptions,
  GetByTestIdOptions,
  PlaywrightLocator,
  LocatorChain
};
```

---

## Key Implementation Details

### getByRole Implementation
```typescript
async getByRole(
  tabId: number,
  role: string,
  options?: GetByRoleOptions
): Promise<LocatorResult> {
  const startTime = Date.now();

  try {
    // Use AccessibilityService for semantic role matching
    const matches = await this.accessibilityService.getByRole(tabId, {
      role: role as any,
      name: options?.name,
      exact: options?.exact,
      includeHidden: options?.includeHidden,
      checked: options?.checked,
      disabled: options?.disabled,
      expanded: options?.expanded,
      pressed: options?.pressed,
      selected: options?.selected,
      level: options?.level
    });

    if (matches.length === 0) {
      return this.buildResult(false, 'getByRole', startTime, {
        error: `No element with role "${role}"${options?.name ? ` and name "${options.name}"` : ''} found`,
        matchCount: 0
      });
    }

    // Use first match
    const match = matches[0];
    const boundingBox = await this.getBoundingBox(tabId, match.backendNodeId);

    return this.buildResult(true, 'getByRole', startTime, {
      backendNodeId: match.backendNodeId,
      boundingBox: boundingBox || undefined,
      confidence: match.confidence,
      matchCount: matches.length
    });

  } catch (error) {
    return this.buildResult(false, 'getByRole', startTime, {
      error: error instanceof Error ? error.message : 'getByRole failed',
      matchCount: 0
    });
  }
}
```

### getByText Implementation
```typescript
async getByText(
  tabId: number,
  text: string | RegExp,
  options?: GetByTextOptions
): Promise<LocatorResult> {
  const startTime = Date.now();

  try {
    // First try AccessibilityService
    const axMatches = await this.accessibilityService.getByText(tabId, {
      text,
      exact: options?.exact,
      includeHidden: options?.includeHidden
    });

    if (axMatches.length > 0) {
      const match = axMatches[0];
      const boundingBox = await this.getBoundingBox(tabId, match.backendNodeId);

      return this.buildResult(true, 'getByText', startTime, {
        backendNodeId: match.backendNodeId,
        boundingBox: boundingBox || undefined,
        confidence: match.confidence,
        matchCount: axMatches.length
      });
    }

    // Fallback to DOM query with text matching
    const textStr = text instanceof RegExp ? text.source : text;
    const nodeId = await this.querySelectorWithText(
      tabId,
      '*', // All elements
      text,
      options?.exact ?? false
    );

    if (nodeId) {
      // Get backend node ID
      const nodeResult = await this.cdpService.sendCommand(tabId, 'DOM.describeNode', {
        nodeId,
        depth: 0
      });

      if (nodeResult.success && nodeResult.result?.node?.backendNodeId) {
        const backendNodeId = nodeResult.result.node.backendNodeId;
        const boundingBox = await this.getBoundingBox(tabId, backendNodeId);

        return this.buildResult(true, 'getByText', startTime, {
          backendNodeId,
          nodeId,
          boundingBox: boundingBox || undefined,
          confidence: 0.80,
          matchCount: 1
        });
      }
    }

    return this.buildResult(false, 'getByText', startTime, {
      error: `No element with text "${textStr}" found`,
      matchCount: 0
    });

  } catch (error) {
    return this.buildResult(false, 'getByText', startTime, {
      error: error instanceof Error ? error.message : 'getByText failed',
      matchCount: 0
    });
  }
}
```

### getByLabel Implementation
```typescript
async getByLabel(
  tabId: number,
  label: string | RegExp,
  options?: LocatorOptions
): Promise<LocatorResult> {
  const startTime = Date.now();

  try {
    // Use AccessibilityService for label matching
    const matches = await this.accessibilityService.getByLabel(tabId, {
      label,
      exact: options?.exact
    });

    if (matches.length > 0) {
      const match = matches[0];
      const boundingBox = await this.getBoundingBox(tabId, match.backendNodeId);

      return this.buildResult(true, 'getByLabel', startTime, {
        backendNodeId: match.backendNodeId,
        boundingBox: boundingBox || undefined,
        confidence: 0.90,
        matchCount: matches.length
      });
    }

    // Fallback: Find label element, then find associated input
    const labelStr = label instanceof RegExp ? label.source : label;
    const docResult = await this.cdpService.getDocument(tabId);
    if (!docResult.success || !docResult.result) {
      throw new Error('Failed to get document');
    }

    // Find label containing text
    const labelsResult = await this.cdpService.querySelectorAll(
      tabId,
      'label',
      docResult.result.nodeId
    );

    if (labelsResult.success && labelsResult.result) {
      for (const labelNodeId of labelsResult.result) {
        const htmlResult = await this.cdpService.getOuterHTML(tabId, labelNodeId);
        if (!htmlResult.success) continue;

        const labelText = this.extractTextFromHTML(htmlResult.result || '');
        if (this.matchTextPattern(labelText, label, options?.exact ?? false)) {
          // Found matching label - get the "for" attribute or nested input
          const attrsResult = await this.cdpService.getAttributes(tabId, labelNodeId);
          
          if (attrsResult.success && attrsResult.result?.for) {
            // Find input by ID
            const inputResult = await this.cdpService.querySelector(
              tabId,
              `#${CSS.escape(attrsResult.result.for)}`
            );

            if (inputResult.success && inputResult.result) {
              const nodeResult = await this.cdpService.sendCommand(tabId, 'DOM.describeNode', {
                nodeId: inputResult.result,
                depth: 0
              });

              if (nodeResult.success && nodeResult.result?.node?.backendNodeId) {
                const backendNodeId = nodeResult.result.node.backendNodeId;
                const boundingBox = await this.getBoundingBox(tabId, backendNodeId);

                return this.buildResult(true, 'getByLabel', startTime, {
                  backendNodeId,
                  boundingBox: boundingBox || undefined,
                  confidence: 0.85,
                  matchCount: 1
                });
              }
            }
          }

          // Check for nested input
          const nestedInput = await this.cdpService.querySelector(
            tabId,
            'input, select, textarea',
            labelNodeId
          );

          if (nestedInput.success && nestedInput.result) {
            const nodeResult = await this.cdpService.sendCommand(tabId, 'DOM.describeNode', {
              nodeId: nestedInput.result,
              depth: 0
            });

            if (nodeResult.success && nodeResult.result?.node?.backendNodeId) {
              const backendNodeId = nodeResult.result.node.backendNodeId;
              const boundingBox = await this.getBoundingBox(tabId, backendNodeId);

              return this.buildResult(true, 'getByLabel', startTime, {
                backendNodeId,
                boundingBox: boundingBox || undefined,
                confidence: 0.85,
                matchCount: 1
              });
            }
          }
        }
      }
    }

    return this.buildResult(false, 'getByLabel', startTime, {
      error: `No element with label "${labelStr}" found`,
      matchCount: 0
    });

  } catch (error) {
    return this.buildResult(false, 'getByLabel', startTime, {
      error: error instanceof Error ? error.message : 'getByLabel failed',
      matchCount: 0
    });
  }
}
```

### getByPlaceholder Implementation
```typescript
async getByPlaceholder(
  tabId: number,
  placeholder: string | RegExp,
  options?: LocatorOptions
): Promise<LocatorResult> {
  const startTime = Date.now();

  try {
    const placeholderStr = placeholder instanceof RegExp ? placeholder.source : placeholder;
    
    // Build CSS selector for placeholder attribute
    const selector = placeholder instanceof RegExp
      ? '[placeholder]' // Match any, then filter
      : options?.exact
        ? `[placeholder="${CSS.escape(placeholderStr)}"]`
        : `[placeholder*="${CSS.escape(placeholderStr)}"]`;

    const docResult = await this.cdpService.getDocument(tabId);
    if (!docResult.success || !docResult.result) {
      throw new Error('Failed to get document');
    }

    const nodesResult = await this.cdpService.querySelectorAll(
      tabId,
      selector,
      docResult.result.nodeId
    );

    if (!nodesResult.success || !nodesResult.result?.length) {
      return this.buildResult(false, 'getByPlaceholder', startTime, {
        error: `No element with placeholder "${placeholderStr}" found`,
        matchCount: 0
      });
    }

    // Filter by regex if needed
    let matchingNodeId = nodesResult.result[0];
    let matchCount = nodesResult.result.length;

    if (placeholder instanceof RegExp) {
      for (const nodeId of nodesResult.result) {
        const attrsResult = await this.cdpService.getAttributes(tabId, nodeId);
        if (attrsResult.success && attrsResult.result?.placeholder) {
          if (placeholder.test(attrsResult.result.placeholder)) {
            matchingNodeId = nodeId;
            break;
          }
        }
      }
    }

    // Get backend node ID
    const nodeResult = await this.cdpService.sendCommand(tabId, 'DOM.describeNode', {
      nodeId: matchingNodeId,
      depth: 0
    });

    if (nodeResult.success && nodeResult.result?.node?.backendNodeId) {
      const backendNodeId = nodeResult.result.node.backendNodeId;
      const boundingBox = await this.getBoundingBox(tabId, backendNodeId);

      return this.buildResult(true, 'getByPlaceholder', startTime, {
        backendNodeId,
        nodeId: matchingNodeId,
        boundingBox: boundingBox || undefined,
        confidence: 0.85,
        matchCount
      });
    }

    return this.buildResult(false, 'getByPlaceholder', startTime, {
      error: 'Failed to get node details',
      matchCount: 0
    });

  } catch (error) {
    return this.buildResult(false, 'getByPlaceholder', startTime, {
      error: error instanceof Error ? error.message : 'getByPlaceholder failed',
      matchCount: 0
    });
  }
}
```

### getByTestId Implementation
```typescript
async getByTestId(
  tabId: number,
  testId: string | RegExp,
  options?: GetByTestIdOptions
): Promise<LocatorResult> {
  const startTime = Date.now();
  const testIdAttr = options?.testIdAttribute ?? 'data-testid';

  try {
    const testIdStr = testId instanceof RegExp ? testId.source : testId;

    // Try common test ID attribute names
    const attributes = [testIdAttr, 'data-test-id', 'data-test', 'data-cy'];
    
    const docResult = await this.cdpService.getDocument(tabId);
    if (!docResult.success || !docResult.result) {
      throw new Error('Failed to get document');
    }

    for (const attr of attributes) {
      const selector = testId instanceof RegExp
        ? `[${attr}]`
        : options?.exact
          ? `[${attr}="${CSS.escape(testIdStr)}"]`
          : `[${attr}*="${CSS.escape(testIdStr)}"]`;

      const nodesResult = await this.cdpService.querySelectorAll(
        tabId,
        selector,
        docResult.result.nodeId
      );

      if (nodesResult.success && nodesResult.result?.length) {
        let matchingNodeId = nodesResult.result[0];

        // Filter by regex if needed
        if (testId instanceof RegExp) {
          for (const nodeId of nodesResult.result) {
            const attrsResult = await this.cdpService.getAttributes(tabId, nodeId);
            if (attrsResult.success && attrsResult.result?.[attr]) {
              if (testId.test(attrsResult.result[attr])) {
                matchingNodeId = nodeId;
                break;
              }
            }
          }
        }

        const nodeResult = await this.cdpService.sendCommand(tabId, 'DOM.describeNode', {
          nodeId: matchingNodeId,
          depth: 0
        });

        if (nodeResult.success && nodeResult.result?.node?.backendNodeId) {
          const backendNodeId = nodeResult.result.node.backendNodeId;
          const boundingBox = await this.getBoundingBox(tabId, backendNodeId);

          return this.buildResult(true, 'getByTestId', startTime, {
            backendNodeId,
            nodeId: matchingNodeId,
            boundingBox: boundingBox || undefined,
            confidence: 0.95, // Test IDs are very reliable
            matchCount: nodesResult.result.length
          });
        }
      }
    }

    return this.buildResult(false, 'getByTestId', startTime, {
      error: `No element with test ID "${testIdStr}" found`,
      matchCount: 0
    });

  } catch (error) {
    return this.buildResult(false, 'getByTestId', startTime, {
      error: error instanceof Error ? error.message : 'getByTestId failed',
      matchCount: 0
    });
  }
}
```

### executeStrategy Implementation
```typescript
async executeStrategy(
  tabId: number,
  strategy: LocatorStrategy
): Promise<LocatorResult> {
  const startTime = Date.now();

  switch (strategy.type) {
    case 'cdp_semantic':
      // Use getByRole with metadata
      if (strategy.metadata?.role) {
        return this.getByRole(tabId, strategy.metadata.role, {
          name: strategy.metadata.name,
          exact: false
        });
      }
      break;

    case 'cdp_power':
      // Try getByText, getByLabel, getByPlaceholder in order
      if (strategy.metadata?.text) {
        const textResult = await this.getByText(tabId, strategy.metadata.text);
        if (textResult.found) return textResult;
      }
      if (strategy.metadata?.label) {
        const labelResult = await this.getByLabel(tabId, strategy.metadata.label);
        if (labelResult.found) return labelResult;
      }
      if (strategy.metadata?.placeholder) {
        const placeholderResult = await this.getByPlaceholder(tabId, strategy.metadata.placeholder);
        if (placeholderResult.found) return placeholderResult;
      }
      if (strategy.metadata?.testId) {
        const testIdResult = await this.getByTestId(tabId, strategy.metadata.testId);
        if (testIdResult.found) return testIdResult;
      }
      break;

    case 'dom_selector':
    case 'css_selector':
      // Use CSS selector
      if (strategy.selector) {
        return this.locator(tabId, strategy.selector);
      }
      break;

    default:
      // Unknown strategy type
      break;
  }

  return this.buildResult(false, 'locator', startTime, {
    error: `Strategy type "${strategy.type}" not supported or missing data`,
    matchCount: 0
  });
}
```

### Helper Methods
```typescript
private buildResult(
  found: boolean,
  method: LocatorMethod,
  startTime: number,
  data?: Partial<LocatorResult>
): LocatorResult {
  return {
    found,
    method,
    duration: Date.now() - startTime,
    confidence: data?.confidence ?? (found ? 0.85 : 0),
    matchCount: data?.matchCount ?? (found ? 1 : 0),
    backendNodeId: data?.backendNodeId,
    nodeId: data?.nodeId,
    boundingBox: data?.boundingBox,
    error: data?.error
  };
}

async getBoundingBox(
  tabId: number,
  backendNodeId: number
): Promise<{ x: number; y: number; width: number; height: number } | null> {
  // First get nodeId from backendNodeId
  const resolveResult = await this.cdpService.sendCommand(tabId, 'DOM.describeNode', {
    backendNodeId,
    depth: 0
  });

  if (!resolveResult.success || !resolveResult.result?.node?.nodeId) {
    return null;
  }

  const nodeId = resolveResult.result.node.nodeId;
  const boxResult = await this.cdpService.getBoxModel(tabId, nodeId);

  if (!boxResult.success || !boxResult.result) {
    return null;
  }

  const border = boxResult.result.border;
  // border is [x1,y1, x2,y2, x3,y3, x4,y4] - get bounding rect
  const x = Math.min(border[0], border[2], border[4], border[6]);
  const y = Math.min(border[1], border[3], border[5], border[7]);
  const maxX = Math.max(border[0], border[2], border[4], border[6]);
  const maxY = Math.max(border[1], border[3], border[5], border[7]);

  return {
    x,
    y,
    width: maxX - x,
    height: maxY - y
  };
}

async getClickPoint(
  tabId: number,
  backendNodeId: number
): Promise<{ x: number; y: number } | null> {
  const box = await this.getBoundingBox(tabId, backendNodeId);
  if (!box) return null;

  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2
  };
}

private matchTextPattern(value: string, pattern: string | RegExp, exact: boolean): boolean {
  if (!value) return false;

  if (pattern instanceof RegExp) {
    return pattern.test(value);
  }

  const normalizedValue = value.toLowerCase().trim();
  const normalizedPattern = pattern.toLowerCase().trim();

  return exact
    ? normalizedValue === normalizedPattern
    : normalizedValue.includes(normalizedPattern);
}

private extractTextFromHTML(html: string): string {
  // Simple text extraction - strip tags
  return html.replace(/<[^>]*>/g, '').trim();
}
```

---

## Integration Points

### With DecisionEngine
```typescript
// DecisionEngine uses PlaywrightLocators for strategy evaluation
class DecisionEngine {
  constructor(private locators: PlaywrightLocators) {}

  async evaluateStrategy(tabId: number, strategy: LocatorStrategy): Promise<StrategyResult> {
    const result = await this.locators.executeStrategy(tabId, strategy);
    
    return {
      success: result.found,
      confidence: result.confidence,
      backendNodeId: result.backendNodeId,
      duration: result.duration
    };
  }
}
```

### With Background Script
```typescript
// background.ts message handlers
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'PLAYWRIGHT_LOCATE') {
    const { method, arg, options, tabId } = message;
    
    switch (method) {
      case 'getByRole':
        locators.getByRole(tabId, arg, options).then(sendResponse);
        break;
      case 'getByText':
        locators.getByText(tabId, arg, options).then(sendResponse);
        break;
      case 'getByLabel':
        locators.getByLabel(tabId, arg, options).then(sendResponse);
        break;
      // ... other methods
    }
    return true;
  }
});
```

---

## Acceptance Criteria

- [ ] getByRole() finds elements by ARIA role and name
- [ ] getByText() finds elements by visible text content
- [ ] getByLabel() finds form inputs by associated label
- [ ] getByPlaceholder() finds inputs by placeholder attribute
- [ ] getByTestId() finds elements by data-testid (and variants)
- [ ] getByAltText() finds images by alt attribute
- [ ] getByTitle() finds elements by title attribute
- [ ] locator() works with CSS selectors and XPath
- [ ] executeStrategy() routes to correct method based on strategy type
- [ ] Regex patterns supported for all text matching
- [ ] Exact vs contains matching works correctly
- [ ] getBoundingBox() returns accurate element dimensions
- [ ] getClickPoint() returns center of element
- [ ] TypeScript compiles with strict mode, 0 errors

---

## Edge Cases

1. **Multiple matches**: Return first, include count in result
2. **No matches**: Return found: false with helpful error
3. **Hidden elements**: Excluded by default, configurable
4. **Detached elements**: Handle gracefully
5. **Dynamic content**: Results may change between calls
6. **Iframe elements**: Requires separate CDP target
7. **Shadow DOM**: Accessibility tree includes shadow content
8. **SVG elements**: May have different bounding box behavior
9. **Transformed elements**: Account for CSS transforms in coordinates
10. **Scrolled elements**: Coordinates relative to viewport

---

## Estimated Lines

450-550 lines
