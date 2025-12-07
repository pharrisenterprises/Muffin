# CoordinatesStrategy Content Specification

**File ID:** D4  
**File Path:** `src/background/services/strategies/CoordinatesStrategy.ts`  
**Status:** CREATE  
**Priority:** P1

---

## Purpose

Evaluates coordinate-based fallback strategies during playback. Uses recorded x/y click coordinates to perform actions when all semantic and DOM-based strategies fail. This is the last resort strategy with the lowest confidence (0.60) because coordinates are fragile - they break when page layout changes, window resizes, or elements shift position. However, it provides a guaranteed fallback that can work even when the page structure is completely different from recording. Includes optional element-at-point verification to boost confidence.

---

## Dependencies

### Uses (imports from)
- `../CDPService`: CDPService, CDPCommandResult
- `../../types/strategy`: StrategyType, LocatorStrategy

### Used By (exports to)
- `../DecisionEngine`: Uses for coordinates strategy evaluation
- `../strategies/index`: Re-exports strategy evaluators

---

## Interfaces

```typescript
/**
 * Coordinates strategy evaluator configuration
 */
interface CoordinatesStrategyConfig {
  /** Base confidence for coordinates strategy (default: 0.60) */
  baseConfidence: number;
  /** Confidence boost when element verified at point (default: 0.10) */
  verificationBoost: number;
  /** Whether to verify element at coordinates (default: true) */
  verifyElement: boolean;
  /** Position tolerance for verification in pixels (default: 20) */
  positionTolerance: number;
  /** Viewport boundary padding in pixels (default: 10) */
  viewportPadding: number;
  /** Whether to adjust for scroll position (default: true) */
  adjustForScroll: boolean;
}

/**
 * Coordinates strategy metadata
 */
interface CoordinatesStrategyMetadata {
  /** X coordinate */
  x: number;
  /** Y coordinate */
  y: number;
  /** Original bounding rect of target element */
  boundingRect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Original viewport size when recorded */
  viewport?: {
    width: number;
    height: number;
  };
  /** Original scroll position when recorded */
  scrollPosition?: {
    x: number;
    y: number;
  };
  /** Tag name of original element (for verification) */
  tagName?: string;
  /** Element ID of original element (for verification) */
  elementId?: string;
  /** Classes of original element (for verification) */
  classList?: string[];
}

/**
 * Strategy evaluation result
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
 * Element at point result
 */
interface ElementAtPointResult {
  /** Whether an element was found */
  found: boolean;
  /** Backend node ID */
  backendNodeId?: number;
  /** Node ID */
  nodeId?: number;
  /** Element tag name */
  tagName?: string;
  /** Element ID */
  elementId?: string;
  /** Element classes */
  classList?: string[];
  /** Element bounding rect */
  boundingRect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Viewport information
 */
interface ViewportInfo {
  /** Viewport width */
  width: number;
  /** Viewport height */
  height: number;
  /** Current scroll X */
  scrollX: number;
  /** Current scroll Y */
  scrollY: number;
  /** Device pixel ratio */
  devicePixelRatio: number;
}

/**
 * Coordinate adjustment result
 */
interface AdjustedCoordinates {
  /** Adjusted X coordinate */
  x: number;
  /** Adjusted Y coordinate */
  y: number;
  /** Whether coordinates are within viewport */
  inViewport: boolean;
  /** Adjustment applied */
  adjustment: {
    scrollX: number;
    scrollY: number;
    scaleX: number;
    scaleY: number;
  };
}
```

---

## Functions

```typescript
/**
 * CoordinatesStrategy - Evaluates coordinate-based fallback strategies
 */
class CoordinatesStrategy implements StrategyEvaluator {
  private cdpService: CDPService;
  private config: CoordinatesStrategyConfig;

  /** Strategy types handled by this evaluator */
  readonly handledTypes: StrategyType[] = ['coordinates'];

  /**
   * Create new CoordinatesStrategy instance
   * @param cdpService - CDP service instance
   * @param config - Strategy configuration
   */
  constructor(
    cdpService: CDPService,
    config?: Partial<CoordinatesStrategyConfig>
  );

  /**
   * Check if this evaluator handles a strategy type
   * @param type - Strategy type
   * @returns Whether handled
   */
  handles(type: StrategyType): boolean;

  /**
   * Evaluate a coordinates strategy
   * @param tabId - Target tab
   * @param strategy - Strategy to evaluate
   * @returns Evaluation result
   */
  async evaluate(tabId: number, strategy: LocatorStrategy): Promise<StrategyEvaluationResult>;

  /**
   * Get element at coordinates
   * @param tabId - Target tab
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns Element at point result
   */
  async getElementAtPoint(
    tabId: number,
    x: number,
    y: number
  ): Promise<ElementAtPointResult>;

  /**
   * Get current viewport information
   * @param tabId - Target tab
   * @returns Viewport info
   */
  async getViewportInfo(tabId: number): Promise<ViewportInfo>;

  /**
   * Adjust coordinates for current viewport
   * @param original - Original coordinates from recording
   * @param metadata - Strategy metadata with original viewport
   * @param currentViewport - Current viewport info
   * @returns Adjusted coordinates
   */
  adjustCoordinates(
    original: { x: number; y: number },
    metadata: CoordinatesStrategyMetadata,
    currentViewport: ViewportInfo
  ): AdjustedCoordinates;

  /**
   * Verify element at point matches expected element
   * @param elementAtPoint - Element found at coordinates
   * @param expectedMetadata - Expected element metadata
   * @returns Verification score (0-1)
   */
  verifyElement(
    elementAtPoint: ElementAtPointResult,
    expectedMetadata: CoordinatesStrategyMetadata
  ): number;

  /**
   * Check if coordinates are within viewport
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param viewport - Viewport info
   * @returns Whether in viewport
   */
  isInViewport(x: number, y: number, viewport: ViewportInfo): boolean;

  /**
   * Calculate final confidence based on verification
   * @param verified - Whether element was verified
   * @param verificationScore - Verification score (0-1)
   * @param inViewport - Whether coordinates in viewport
   * @returns Final confidence
   */
  calculateConfidence(
    verified: boolean,
    verificationScore: number,
    inViewport: boolean
  ): number;

  /**
   * Scroll to bring coordinates into view
   * @param tabId - Target tab
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns New scroll position
   */
  async scrollToCoordinates(
    tabId: number,
    x: number,
    y: number
  ): Promise<{ scrollX: number; scrollY: number }>;

  // Private helper methods
  private getNodeInfo(tabId: number, nodeId: number): Promise<ElementAtPointResult>;
  private compareTagNames(tag1: string, tag2: string): boolean;
  private compareClasses(classes1: string[], classes2: string[]): number;
}

export {
  CoordinatesStrategy,
  CoordinatesStrategyConfig,
  CoordinatesStrategyMetadata,
  ElementAtPointResult,
  ViewportInfo,
  AdjustedCoordinates
};
```

---

## Key Implementation Details

### Constructor and Configuration
```typescript
constructor(
  cdpService: CDPService,
  config?: Partial<CoordinatesStrategyConfig>
) {
  this.cdpService = cdpService;
  this.config = {
    baseConfidence: config?.baseConfidence ?? 0.60,
    verificationBoost: config?.verificationBoost ?? 0.10,
    verifyElement: config?.verifyElement ?? true,
    positionTolerance: config?.positionTolerance ?? 20,
    viewportPadding: config?.viewportPadding ?? 10,
    adjustForScroll: config?.adjustForScroll ?? true
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

  // Validate metadata
  const metadata = strategy.metadata as CoordinatesStrategyMetadata | undefined;
  if (!metadata || metadata.x === undefined || metadata.y === undefined) {
    return {
      strategy,
      found: false,
      confidence: 0,
      duration: Date.now() - startTime,
      error: 'Coordinates strategy requires x and y in metadata'
    };
  }

  try {
    // Get current viewport
    const viewport = await this.getViewportInfo(tabId);

    // Adjust coordinates for current viewport
    const adjusted = this.adjustCoordinates(
      { x: metadata.x, y: metadata.y },
      metadata,
      viewport
    );

    let finalX = adjusted.x;
    let finalY = adjusted.y;

    // If not in viewport, try scrolling
    if (!adjusted.inViewport && this.config.adjustForScroll) {
      await this.scrollToCoordinates(tabId, metadata.x, metadata.y);
      
      // Re-get viewport after scroll
      const newViewport = await this.getViewportInfo(tabId);
      const reAdjusted = this.adjustCoordinates(
        { x: metadata.x, y: metadata.y },
        metadata,
        newViewport
      );
      
      finalX = reAdjusted.x;
      finalY = reAdjusted.y;
    }

    // Check final coordinates are in viewport
    const inViewport = this.isInViewport(finalX, finalY, viewport);
    if (!inViewport) {
      return {
        strategy,
        found: false,
        confidence: 0,
        duration: Date.now() - startTime,
        error: 'Coordinates outside viewport after adjustment',
        clickPoint: { x: finalX, y: finalY }
      };
    }

    // Get element at point for verification
    let verified = false;
    let verificationScore = 0;
    let elementAtPoint: ElementAtPointResult | null = null;

    if (this.config.verifyElement) {
      elementAtPoint = await this.getElementAtPoint(tabId, finalX, finalY);
      
      if (elementAtPoint.found) {
        verificationScore = this.verifyElement(elementAtPoint, metadata);
        verified = verificationScore > 0.5;
      }
    }

    // Calculate final confidence
    const confidence = this.calculateConfidence(verified, verificationScore, inViewport);

    return {
      strategy,
      found: true, // Coordinates always "find" a point
      confidence,
      backendNodeId: elementAtPoint?.backendNodeId,
      nodeId: elementAtPoint?.nodeId,
      clickPoint: { x: finalX, y: finalY },
      duration: Date.now() - startTime,
      metadata: {
        adjusted: adjusted.adjustment,
        verified,
        verificationScore,
        elementTagName: elementAtPoint?.tagName
      }
    };

  } catch (error) {
    return {
      strategy,
      found: false,
      confidence: 0,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Coordinates evaluation failed'
    };
  }
}
```

### Get Element at Point
```typescript
async getElementAtPoint(
  tabId: number,
  x: number,
  y: number
): Promise<ElementAtPointResult> {
  try {
    // Use DOM.getNodeForLocation to find element at coordinates
    const result = await this.cdpService.sendCommand(tabId, 'DOM.getNodeForLocation', {
      x: Math.round(x),
      y: Math.round(y),
      includeUserAgentShadowDOM: false,
      ignorePointerEventsNone: true
    });

    if (!result.success || !result.result?.backendNodeId) {
      return { found: false };
    }

    const backendNodeId = result.result.backendNodeId;
    const nodeId = result.result.nodeId;

    // Get node info
    return this.getNodeInfo(tabId, backendNodeId);

  } catch (error) {
    console.error('[CoordinatesStrategy] getElementAtPoint failed:', error);
    return { found: false };
  }
}

private async getNodeInfo(tabId: number, backendNodeId: number): Promise<ElementAtPointResult> {
  try {
    const describeResult = await this.cdpService.sendCommand(tabId, 'DOM.describeNode', {
      backendNodeId,
      depth: 0
    });

    if (!describeResult.success || !describeResult.result?.node) {
      return { found: true, backendNodeId };
    }

    const node = describeResult.result.node;
    const nodeId = node.nodeId;

    // Parse attributes
    const attributes: Record<string, string> = {};
    if (node.attributes) {
      for (let i = 0; i < node.attributes.length; i += 2) {
        attributes[node.attributes[i]] = node.attributes[i + 1];
      }
    }

    // Get bounding rect
    let boundingRect: ElementAtPointResult['boundingRect'];
    if (nodeId) {
      const boxResult = await this.cdpService.getBoxModel(tabId, nodeId);
      if (boxResult.success && boxResult.result) {
        const border = boxResult.result.border;
        const x = Math.min(border[0], border[2], border[4], border[6]);
        const y = Math.min(border[1], border[3], border[5], border[7]);
        const maxX = Math.max(border[0], border[2], border[4], border[6]);
        const maxY = Math.max(border[1], border[3], border[5], border[7]);
        boundingRect = {
          x,
          y,
          width: maxX - x,
          height: maxY - y
        };
      }
    }

    return {
      found: true,
      backendNodeId,
      nodeId,
      tagName: node.nodeName.toLowerCase(),
      elementId: attributes.id,
      classList: attributes.class?.split(/\s+/).filter(Boolean) || [],
      boundingRect
    };

  } catch (error) {
    return { found: true, backendNodeId };
  }
}
```

### Viewport and Coordinate Adjustment
```typescript
async getViewportInfo(tabId: number): Promise<ViewportInfo> {
  try {
    const result = await this.cdpService.sendCommand(tabId, 'Page.getLayoutMetrics');

    if (!result.success || !result.result) {
      // Fallback defaults
      return {
        width: 1920,
        height: 1080,
        scrollX: 0,
        scrollY: 0,
        devicePixelRatio: 1
      };
    }

    const viewport = result.result.visualViewport || result.result.layoutViewport;

    return {
      width: viewport.clientWidth,
      height: viewport.clientHeight,
      scrollX: viewport.pageX || 0,
      scrollY: viewport.pageY || 0,
      devicePixelRatio: result.result.visualViewport?.scale || 1
    };

  } catch (error) {
    console.error('[CoordinatesStrategy] getViewportInfo failed:', error);
    return {
      width: 1920,
      height: 1080,
      scrollX: 0,
      scrollY: 0,
      devicePixelRatio: 1
    };
  }
}

adjustCoordinates(
  original: { x: number; y: number },
  metadata: CoordinatesStrategyMetadata,
  currentViewport: ViewportInfo
): AdjustedCoordinates {
  let x = original.x;
  let y = original.y;
  let scaleX = 1;
  let scaleY = 1;

  // Adjust for scroll position
  if (this.config.adjustForScroll && metadata.scrollPosition) {
    // Account for scroll difference
    const scrollDiffX = currentViewport.scrollX - (metadata.scrollPosition.x || 0);
    const scrollDiffY = currentViewport.scrollY - (metadata.scrollPosition.y || 0);
    
    x -= scrollDiffX;
    y -= scrollDiffY;
  }

  // Adjust for viewport size change (if original viewport recorded)
  if (metadata.viewport) {
    scaleX = currentViewport.width / metadata.viewport.width;
    scaleY = currentViewport.height / metadata.viewport.height;

    // Only scale if significant difference (>10%)
    if (Math.abs(scaleX - 1) > 0.1 || Math.abs(scaleY - 1) > 0.1) {
      // For now, don't scale - it's rarely accurate
      // Coordinates are usually absolute to the element
      scaleX = 1;
      scaleY = 1;
    }
  }

  // Check if in viewport
  const inViewport = this.isInViewport(x, y, currentViewport);

  return {
    x,
    y,
    inViewport,
    adjustment: {
      scrollX: currentViewport.scrollX,
      scrollY: currentViewport.scrollY,
      scaleX,
      scaleY
    }
  };
}

isInViewport(x: number, y: number, viewport: ViewportInfo): boolean {
  const padding = this.config.viewportPadding;
  
  return (
    x >= padding &&
    x <= viewport.width - padding &&
    y >= padding &&
    y <= viewport.height - padding
  );
}
```

### Element Verification
```typescript
verifyElement(
  elementAtPoint: ElementAtPointResult,
  expectedMetadata: CoordinatesStrategyMetadata
): number {
  if (!elementAtPoint.found) {
    return 0;
  }

  let score = 0.5; // Base score for finding any element

  // Tag name match
  if (expectedMetadata.tagName && elementAtPoint.tagName) {
    if (this.compareTagNames(elementAtPoint.tagName, expectedMetadata.tagName)) {
      score += 0.2;
    } else {
      score -= 0.1;
    }
  }

  // ID match
  if (expectedMetadata.elementId && elementAtPoint.elementId) {
    if (elementAtPoint.elementId === expectedMetadata.elementId) {
      score += 0.2; // Strong match
    }
  }

  // Class match
  if (expectedMetadata.classList && elementAtPoint.classList) {
    const classMatch = this.compareClasses(
      elementAtPoint.classList,
      expectedMetadata.classList
    );
    score += classMatch * 0.1;
  }

  // Bounding rect proximity
  if (expectedMetadata.boundingRect && elementAtPoint.boundingRect) {
    const expectedCenter = {
      x: expectedMetadata.boundingRect.x + expectedMetadata.boundingRect.width / 2,
      y: expectedMetadata.boundingRect.y + expectedMetadata.boundingRect.height / 2
    };
    const actualCenter = {
      x: elementAtPoint.boundingRect.x + elementAtPoint.boundingRect.width / 2,
      y: elementAtPoint.boundingRect.y + elementAtPoint.boundingRect.height / 2
    };

    const distance = Math.sqrt(
      Math.pow(expectedCenter.x - actualCenter.x, 2) +
      Math.pow(expectedCenter.y - actualCenter.y, 2)
    );

    if (distance < this.config.positionTolerance) {
      score += 0.1;
    } else if (distance > this.config.positionTolerance * 5) {
      score -= 0.1;
    }
  }

  return Math.max(0, Math.min(1, score));
}

private compareTagNames(tag1: string, tag2: string): boolean {
  return tag1.toLowerCase() === tag2.toLowerCase();
}

private compareClasses(classes1: string[], classes2: string[]): number {
  if (classes1.length === 0 || classes2.length === 0) {
    return 0;
  }

  const set1 = new Set(classes1.map(c => c.toLowerCase()));
  const set2 = new Set(classes2.map(c => c.toLowerCase()));

  let matches = 0;
  for (const cls of set1) {
    if (set2.has(cls)) {
      matches++;
    }
  }

  return matches / Math.max(set1.size, set2.size);
}
```

### Confidence Calculation
```typescript
calculateConfidence(
  verified: boolean,
  verificationScore: number,
  inViewport: boolean
): number {
  let confidence = this.config.baseConfidence;

  // Verification boost
  if (verified) {
    confidence += this.config.verificationBoost * verificationScore;
  }

  // Penalty for out of viewport
  if (!inViewport) {
    confidence *= 0.8;
  }

  // Cap at reasonable maximum for coordinates
  return Math.min(confidence, 0.75);
}
```

### Scroll to Coordinates
```typescript
async scrollToCoordinates(
  tabId: number,
  x: number,
  y: number
): Promise<{ scrollX: number; scrollY: number }> {
  try {
    // Get current viewport to calculate scroll needed
    const viewport = await this.getViewportInfo(tabId);

    // Calculate target scroll position to center the coordinates
    const targetScrollX = Math.max(0, x - viewport.width / 2);
    const targetScrollY = Math.max(0, y - viewport.height / 2);

    // Execute scroll
    await this.cdpService.sendCommand(tabId, 'Runtime.evaluate', {
      expression: `window.scrollTo(${targetScrollX}, ${targetScrollY})`,
      awaitPromise: false
    });

    // Wait for scroll to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Return new scroll position
    const newViewport = await this.getViewportInfo(tabId);
    return {
      scrollX: newViewport.scrollX,
      scrollY: newViewport.scrollY
    };

  } catch (error) {
    console.error('[CoordinatesStrategy] scrollToCoordinates failed:', error);
    return { scrollX: 0, scrollY: 0 };
  }
}
```

---

## Integration Points

### With DecisionEngine
```typescript
// DecisionEngine uses CoordinatesStrategy as last resort
class DecisionEngine {
  private coordinatesStrategy: CoordinatesStrategy;

  async routeToEvaluator(tabId: number, strategy: LocatorStrategy) {
    if (this.coordinatesStrategy.handles(strategy.type)) {
      return this.coordinatesStrategy.evaluate(tabId, strategy);
    }
    // ... other evaluators
  }
}
```

### With FallbackChainGenerator
```typescript
// Coordinates strategy is always added as final fallback
generateCoordinatesStrategy(domData: DOMCaptureResult): StrategyCandidate {
  return {
    type: 'coordinates',
    metadata: {
      x: domData.x,
      y: domData.y,
      boundingRect: domData.boundingRect,
      tagName: domData.tagName,
      elementId: domData.id,
      classList: domData.classList
    },
    source: 'dom',
    rawConfidence: 0.60
  };
}
```

---

## Acceptance Criteria

- [ ] Evaluates coordinates strategies with x/y metadata
- [ ] Gets element at coordinates via CDP
- [ ] Retrieves current viewport information
- [ ] Adjusts coordinates for scroll position
- [ ] Verifies element at point matches expected
- [ ] Calculates confidence with verification boost
- [ ] Scrolls to bring coordinates into viewport
- [ ] Handles out-of-viewport coordinates
- [ ] Returns click point for action execution
- [ ] TypeScript compiles with strict mode, 0 errors

---

## Edge Cases

1. **Coordinates outside page**: Return error
2. **No element at point**: Still return clickable point
3. **Element moved significantly**: Low verification score
4. **Page scrolled since recording**: Adjust coordinates
5. **Viewport resized**: Limited adjustment
6. **Fixed/sticky elements**: May be at coordinates
7. **Overlay covering element**: Click goes to overlay
8. **Iframe at coordinates**: Separate document
9. **Coordinates at (0,0)**: Likely error
10. **Negative coordinates**: Invalid

---

## Estimated Lines

300-350 lines
