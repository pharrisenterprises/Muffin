# AutoWaiting Content Specification

**File ID:** B4  
**File Path:** `src/background/services/AutoWaiting.ts`  
**Status:** FIX (existing file with errors)  
**Priority:** P0

---

## Purpose

Implements Playwright-style auto-waiting that ensures elements are actionable before performing operations. Automatically waits for elements to be visible, enabled, stable (not animating), and ready to receive events. This prevents flaky tests caused by timing issues and eliminates the need for explicit sleep() calls. Integrates with CDP to monitor element state and provides configurable timeout and polling options. Essential for reliable playback of recorded actions.

---

## Dependencies

### Uses (imports from)
- `./CDPService`: CDPService, CDPCommandResult
- `./PlaywrightLocators`: PlaywrightLocators, LocatorResult
- `../../types/cdp`: CDPNode, BoxModel

### Used By (exports to)
- `./DecisionEngine`: Uses for actionability checks before executing actions
- `../background.ts`: Message handler delegation
- `./strategies/*`: Strategy evaluators use for element validation

---

## Interfaces

```typescript
/**
 * Auto-waiting configuration
 */
interface AutoWaitConfig {
  /** Default timeout in ms (default: 30000) */
  timeout: number;
  /** Polling interval in ms (default: 100) */
  pollingInterval: number;
  /** Whether to wait for visibility (default: true) */
  waitForVisible: boolean;
  /** Whether to wait for enabled state (default: true) */
  waitForEnabled: boolean;
  /** Whether to wait for stability (default: true) */
  waitForStable: boolean;
  /** Stability threshold in ms - element must not move for this duration (default: 100) */
  stabilityThreshold: number;
  /** Whether to wait for network idle (default: false) */
  waitForNetworkIdle: boolean;
  /** Network idle threshold in ms (default: 500) */
  networkIdleThreshold: number;
}

/**
 * Wait options for individual operations
 */
interface WaitOptions {
  /** Timeout in ms (overrides default) */
  timeout?: number;
  /** Wait for visibility */
  visible?: boolean;
  /** Wait for enabled state */
  enabled?: boolean;
  /** Wait for stability */
  stable?: boolean;
  /** Wait for element to be attached to DOM */
  attached?: boolean;
  /** Wait for element to be editable (for inputs) */
  editable?: boolean;
  /** Wait for element to receive pointer events */
  receivesPointerEvents?: boolean;
}

/**
 * Actionability state of an element
 */
interface ActionabilityState {
  /** Whether element is attached to DOM */
  attached: boolean;
  /** Whether element is visible */
  visible: boolean;
  /** Whether element is enabled (not disabled) */
  enabled: boolean;
  /** Whether element is stable (not animating) */
  stable: boolean;
  /** Whether element receives pointer events */
  receivesPointerEvents: boolean;
  /** Whether element is editable (for inputs) */
  editable: boolean;
  /** Whether element is in viewport */
  inViewport: boolean;
  /** Bounding box */
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Last position (for stability check) */
  lastPosition?: { x: number; y: number };
  /** Position change timestamp */
  positionChangedAt?: number;
}

/**
 * Wait result
 */
interface WaitResult {
  /** Whether wait succeeded */
  success: boolean;
  /** Final actionability state */
  state: ActionabilityState;
  /** Time waited in ms */
  waitedMs: number;
  /** Reason for failure (if any) */
  failureReason?: WaitFailureReason;
  /** Error message */
  error?: string;
}

/**
 * Reasons why wait might fail
 */
type WaitFailureReason =
  | 'timeout'
  | 'detached'
  | 'hidden'
  | 'disabled'
  | 'unstable'
  | 'not_editable'
  | 'covered'
  | 'outside_viewport'
  | 'node_not_found';

/**
 * Element stability tracking
 */
interface StabilityTracker {
  /** Element backend node ID */
  backendNodeId: number;
  /** Position history */
  positionHistory: Array<{
    x: number;
    y: number;
    timestamp: number;
  }>;
  /** Whether currently stable */
  isStable: boolean;
  /** Timestamp when became stable */
  stableSince?: number;
}
```

---

## Functions

```typescript
/**
 * AutoWaiting - Playwright-style auto-wait functionality
 */
class AutoWaiting {
  private cdpService: CDPService;
  private locators: PlaywrightLocators;
  private config: AutoWaitConfig;
  private stabilityTrackers: Map<number, StabilityTracker>;

  /**
   * Create new AutoWaiting instance
   * @param cdpService - CDP service instance
   * @param locators - Playwright locators instance
   * @param config - Wait configuration
   */
  constructor(
    cdpService: CDPService,
    locators: PlaywrightLocators,
    config?: Partial<AutoWaitConfig>
  );

  /**
   * Wait for element to be actionable (visible, enabled, stable)
   * @param tabId - Target tab
   * @param backendNodeId - Element backend node ID
   * @param options - Wait options
   * @returns Promise resolving to wait result
   */
  async waitForActionable(
    tabId: number,
    backendNodeId: number,
    options?: WaitOptions
  ): Promise<WaitResult>;

  /**
   * Wait for element to be visible
   * @param tabId - Target tab
   * @param backendNodeId - Element backend node ID
   * @param timeout - Timeout in ms
   * @returns Promise resolving to wait result
   */
  async waitForVisible(
    tabId: number,
    backendNodeId: number,
    timeout?: number
  ): Promise<WaitResult>;

  /**
   * Wait for element to be enabled
   * @param tabId - Target tab
   * @param backendNodeId - Element backend node ID
   * @param timeout - Timeout in ms
   * @returns Promise resolving to wait result
   */
  async waitForEnabled(
    tabId: number,
    backendNodeId: number,
    timeout?: number
  ): Promise<WaitResult>;

  /**
   * Wait for element to be stable (not animating)
   * @param tabId - Target tab
   * @param backendNodeId - Element backend node ID
   * @param timeout - Timeout in ms
   * @returns Promise resolving to wait result
   */
  async waitForStable(
    tabId: number,
    backendNodeId: number,
    timeout?: number
  ): Promise<WaitResult>;

  /**
   * Wait for element to be attached to DOM
   * @param tabId - Target tab
   * @param backendNodeId - Element backend node ID
   * @param timeout - Timeout in ms
   * @returns Promise resolving to wait result
   */
  async waitForAttached(
    tabId: number,
    backendNodeId: number,
    timeout?: number
  ): Promise<WaitResult>;

  /**
   * Wait for element to be editable
   * @param tabId - Target tab
   * @param backendNodeId - Element backend node ID
   * @param timeout - Timeout in ms
   * @returns Promise resolving to wait result
   */
  async waitForEditable(
    tabId: number,
    backendNodeId: number,
    timeout?: number
  ): Promise<WaitResult>;

  /**
   * Wait for element to receive pointer events (not covered)
   * @param tabId - Target tab
   * @param backendNodeId - Element backend node ID
   * @param timeout - Timeout in ms
   * @returns Promise resolving to wait result
   */
  async waitForReceivesPointerEvents(
    tabId: number,
    backendNodeId: number,
    timeout?: number
  ): Promise<WaitResult>;

  /**
   * Wait for network to be idle
   * @param tabId - Target tab
   * @param idleThreshold - Idle threshold in ms
   * @param timeout - Timeout in ms
   * @returns Promise resolving to success boolean
   */
  async waitForNetworkIdle(
    tabId: number,
    idleThreshold?: number,
    timeout?: number
  ): Promise<boolean>;

  /**
   * Wait for page load state
   * @param tabId - Target tab
   * @param state - Load state to wait for
   * @param timeout - Timeout in ms
   * @returns Promise resolving to success boolean
   */
  async waitForLoadState(
    tabId: number,
    state: 'load' | 'domcontentloaded' | 'networkidle',
    timeout?: number
  ): Promise<boolean>;

  /**
   * Wait for a function to return true
   * @param tabId - Target tab
   * @param fn - Function to poll
   * @param timeout - Timeout in ms
   * @returns Promise resolving to function result
   */
  async waitForFunction<T>(
    tabId: number,
    fn: () => Promise<T | null>,
    timeout?: number
  ): Promise<T | null>;

  /**
   * Get current actionability state of element
   * @param tabId - Target tab
   * @param backendNodeId - Element backend node ID
   * @returns Promise resolving to actionability state
   */
  async getActionabilityState(
    tabId: number,
    backendNodeId: number
  ): Promise<ActionabilityState>;

  /**
   * Check if element is currently actionable
   * @param tabId - Target tab
   * @param backendNodeId - Element backend node ID
   * @param options - Check options
   * @returns Promise resolving to boolean
   */
  async isActionable(
    tabId: number,
    backendNodeId: number,
    options?: WaitOptions
  ): Promise<boolean>;

  /**
   * Scroll element into view if needed
   * @param tabId - Target tab
   * @param backendNodeId - Element backend node ID
   * @returns Promise resolving when scrolled
   */
  async scrollIntoViewIfNeeded(
    tabId: number,
    backendNodeId: number
  ): Promise<void>;

  // Private helper methods
  private poll<T>(
    fn: () => Promise<T | null>,
    predicate: (result: T | null) => boolean,
    timeout: number,
    interval: number
  ): Promise<T | null>;

  private checkVisibility(tabId: number, backendNodeId: number): Promise<boolean>;
  private checkEnabled(tabId: number, backendNodeId: number): Promise<boolean>;
  private checkStability(tabId: number, backendNodeId: number): Promise<boolean>;
  private checkAttached(tabId: number, backendNodeId: number): Promise<boolean>;
  private checkEditable(tabId: number, backendNodeId: number): Promise<boolean>;
  private checkReceivesPointerEvents(tabId: number, backendNodeId: number): Promise<boolean>;
  private checkInViewport(tabId: number, backendNodeId: number): Promise<boolean>;
  private getElementAtPoint(tabId: number, x: number, y: number): Promise<number | null>;
  private updateStabilityTracker(backendNodeId: number, x: number, y: number): void;
}

export {
  AutoWaiting,
  AutoWaitConfig,
  WaitOptions,
  WaitResult,
  ActionabilityState,
  WaitFailureReason
};
```

---

## Key Implementation Details

### Constructor and Configuration
```typescript
constructor(
  cdpService: CDPService,
  locators: PlaywrightLocators,
  config?: Partial<AutoWaitConfig>
) {
  this.cdpService = cdpService;
  this.locators = locators;
  this.config = {
    timeout: config?.timeout ?? 30000,
    pollingInterval: config?.pollingInterval ?? 100,
    waitForVisible: config?.waitForVisible ?? true,
    waitForEnabled: config?.waitForEnabled ?? true,
    waitForStable: config?.waitForStable ?? true,
    stabilityThreshold: config?.stabilityThreshold ?? 100,
    waitForNetworkIdle: config?.waitForNetworkIdle ?? false,
    networkIdleThreshold: config?.networkIdleThreshold ?? 500
  };
  this.stabilityTrackers = new Map();
}
```

### Main Wait for Actionable
```typescript
async waitForActionable(
  tabId: number,
  backendNodeId: number,
  options?: WaitOptions
): Promise<WaitResult> {
  const timeout = options?.timeout ?? this.config.timeout;
  const startTime = Date.now();

  const shouldWaitFor = {
    visible: options?.visible ?? this.config.waitForVisible,
    enabled: options?.enabled ?? this.config.waitForEnabled,
    stable: options?.stable ?? this.config.waitForStable,
    attached: options?.attached ?? true,
    editable: options?.editable ?? false,
    receivesPointerEvents: options?.receivesPointerEvents ?? true
  };

  try {
    const result = await this.poll(
      async () => {
        const state = await this.getActionabilityState(tabId, backendNodeId);
        
        // Check each required condition
        if (shouldWaitFor.attached && !state.attached) {
          return { state, ready: false, reason: 'detached' as WaitFailureReason };
        }
        if (shouldWaitFor.visible && !state.visible) {
          return { state, ready: false, reason: 'hidden' as WaitFailureReason };
        }
        if (shouldWaitFor.enabled && !state.enabled) {
          return { state, ready: false, reason: 'disabled' as WaitFailureReason };
        }
        if (shouldWaitFor.stable && !state.stable) {
          return { state, ready: false, reason: 'unstable' as WaitFailureReason };
        }
        if (shouldWaitFor.editable && !state.editable) {
          return { state, ready: false, reason: 'not_editable' as WaitFailureReason };
        }
        if (shouldWaitFor.receivesPointerEvents && !state.receivesPointerEvents) {
          return { state, ready: false, reason: 'covered' as WaitFailureReason };
        }

        return { state, ready: true };
      },
      (result) => result !== null && result.ready,
      timeout,
      this.config.pollingInterval
    );

    const waitedMs = Date.now() - startTime;

    if (result && result.ready) {
      return {
        success: true,
        state: result.state,
        waitedMs
      };
    }

    return {
      success: false,
      state: result?.state ?? this.getDefaultState(),
      waitedMs,
      failureReason: result?.reason ?? 'timeout',
      error: `Element not actionable after ${waitedMs}ms: ${result?.reason ?? 'timeout'}`
    };

  } catch (error) {
    return {
      success: false,
      state: this.getDefaultState(),
      waitedMs: Date.now() - startTime,
      failureReason: 'node_not_found',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

### Get Actionability State
```typescript
async getActionabilityState(
  tabId: number,
  backendNodeId: number
): Promise<ActionabilityState> {
  const state: ActionabilityState = {
    attached: false,
    visible: false,
    enabled: true,
    stable: true,
    receivesPointerEvents: false,
    editable: false,
    inViewport: false
  };

  try {
    // Check if attached
    state.attached = await this.checkAttached(tabId, backendNodeId);
    if (!state.attached) {
      return state;
    }

    // Get bounding box (also checks visibility)
    const boundingBox = await this.locators.getBoundingBox(tabId, backendNodeId);
    if (boundingBox && boundingBox.width > 0 && boundingBox.height > 0) {
      state.boundingBox = boundingBox;
      state.visible = await this.checkVisibility(tabId, backendNodeId);
    }

    // Check enabled state
    state.enabled = await this.checkEnabled(tabId, backendNodeId);

    // Check stability
    state.stable = await this.checkStability(tabId, backendNodeId);

    // Check if in viewport
    state.inViewport = await this.checkInViewport(tabId, backendNodeId);

    // Check receives pointer events (not covered by another element)
    if (state.boundingBox && state.visible) {
      state.receivesPointerEvents = await this.checkReceivesPointerEvents(tabId, backendNodeId);
    }

    // Check editable (for input elements)
    state.editable = await this.checkEditable(tabId, backendNodeId);

    return state;

  } catch (error) {
    console.error('[AutoWaiting] Error getting actionability state:', error);
    return state;
  }
}
```

### Check Visibility
```typescript
private async checkVisibility(tabId: number, backendNodeId: number): Promise<boolean> {
  try {
    // Resolve to nodeId first
    const resolveResult = await this.cdpService.sendCommand(tabId, 'DOM.describeNode', {
      backendNodeId,
      depth: 0
    });

    if (!resolveResult.success || !resolveResult.result?.node?.nodeId) {
      return false;
    }

    const nodeId = resolveResult.result.node.nodeId;

    // Get computed style
    const styleResult = await this.cdpService.sendCommand(tabId, 'CSS.getComputedStyleForNode', {
      nodeId
    });

    if (!styleResult.success || !styleResult.result?.computedStyle) {
      return false;
    }

    const styles = styleResult.result.computedStyle;
    const getStyle = (name: string): string => {
      const prop = styles.find((s: any) => s.name === name);
      return prop?.value || '';
    };

    // Check visibility-related styles
    const display = getStyle('display');
    const visibility = getStyle('visibility');
    const opacity = parseFloat(getStyle('opacity') || '1');

    if (display === 'none') return false;
    if (visibility === 'hidden' || visibility === 'collapse') return false;
    if (opacity === 0) return false;

    // Check bounding box has dimensions
    const boxResult = await this.cdpService.getBoxModel(tabId, nodeId);
    if (!boxResult.success || !boxResult.result) {
      return false;
    }

    const { width, height } = boxResult.result;
    return width > 0 && height > 0;

  } catch (error) {
    console.error('[AutoWaiting] checkVisibility error:', error);
    return false;
  }
}
```

### Check Enabled
```typescript
private async checkEnabled(tabId: number, backendNodeId: number): Promise<boolean> {
  try {
    // Get node attributes
    const resolveResult = await this.cdpService.sendCommand(tabId, 'DOM.describeNode', {
      backendNodeId,
      depth: 0
    });

    if (!resolveResult.success || !resolveResult.result?.node) {
      return false;
    }

    const node = resolveResult.result.node;
    const nodeId = node.nodeId;

    // Get attributes
    const attrsResult = await this.cdpService.getAttributes(tabId, nodeId);
    if (attrsResult.success && attrsResult.result) {
      // Check for disabled attribute
      if ('disabled' in attrsResult.result) {
        return false;
      }
    }

    // Check aria-disabled
    const ariaDisabled = attrsResult.result?.['aria-disabled'];
    if (ariaDisabled === 'true') {
      return false;
    }

    // Check if inside a disabled fieldset
    // This would require traversing ancestors - simplified for now
    
    return true;

  } catch (error) {
    console.error('[AutoWaiting] checkEnabled error:', error);
    return true; // Assume enabled on error
  }
}
```

### Check Stability (Not Animating)
```typescript
private async checkStability(tabId: number, backendNodeId: number): Promise<boolean> {
  try {
    const boundingBox = await this.locators.getBoundingBox(tabId, backendNodeId);
    if (!boundingBox) {
      return false;
    }

    const currentPos = { x: boundingBox.x, y: boundingBox.y };
    
    // Update stability tracker
    let tracker = this.stabilityTrackers.get(backendNodeId);
    if (!tracker) {
      tracker = {
        backendNodeId,
        positionHistory: [],
        isStable: false
      };
      this.stabilityTrackers.set(backendNodeId, tracker);
    }

    const now = Date.now();
    tracker.positionHistory.push({ ...currentPos, timestamp: now });

    // Keep only recent history
    const cutoff = now - this.config.stabilityThreshold * 2;
    tracker.positionHistory = tracker.positionHistory.filter(p => p.timestamp > cutoff);

    // Check if position has been stable for threshold duration
    if (tracker.positionHistory.length < 2) {
      tracker.isStable = false;
      return false;
    }

    const oldest = tracker.positionHistory[0];
    const positionChanged = tracker.positionHistory.some(p => 
      Math.abs(p.x - oldest.x) > 1 || Math.abs(p.y - oldest.y) > 1
    );

    if (!positionChanged && now - oldest.timestamp >= this.config.stabilityThreshold) {
      tracker.isStable = true;
      tracker.stableSince = oldest.timestamp;
      return true;
    }

    tracker.isStable = false;
    return false;

  } catch (error) {
    console.error('[AutoWaiting] checkStability error:', error);
    return true; // Assume stable on error
  }
}
```

### Check Receives Pointer Events
```typescript
private async checkReceivesPointerEvents(
  tabId: number,
  backendNodeId: number
): Promise<boolean> {
  try {
    const clickPoint = await this.locators.getClickPoint(tabId, backendNodeId);
    if (!clickPoint) {
      return false;
    }

    // Get element at the click point
    const elementAtPoint = await this.getElementAtPoint(tabId, clickPoint.x, clickPoint.y);
    if (elementAtPoint === null) {
      return false;
    }

    // Check if it's the same element or a child of it
    if (elementAtPoint === backendNodeId) {
      return true;
    }

    // Check if element at point is a descendant
    const resolveResult = await this.cdpService.sendCommand(tabId, 'DOM.describeNode', {
      backendNodeId: elementAtPoint,
      depth: 0,
      pierce: true
    });

    if (!resolveResult.success) {
      return false;
    }

    // For now, if a different element is at the point, assume covered
    // A more thorough check would verify the element hierarchy
    return false;

  } catch (error) {
    console.error('[AutoWaiting] checkReceivesPointerEvents error:', error);
    return false;
  }
}

private async getElementAtPoint(tabId: number, x: number, y: number): Promise<number | null> {
  try {
    const result = await this.cdpService.sendCommand(tabId, 'DOM.getNodeForLocation', {
      x: Math.round(x),
      y: Math.round(y),
      includeUserAgentShadowDOM: false,
      ignorePointerEventsNone: true
    });

    if (result.success && result.result?.backendNodeId) {
      return result.result.backendNodeId;
    }

    return null;
  } catch (error) {
    return null;
  }
}
```

### Check Editable
```typescript
private async checkEditable(tabId: number, backendNodeId: number): Promise<boolean> {
  try {
    const resolveResult = await this.cdpService.sendCommand(tabId, 'DOM.describeNode', {
      backendNodeId,
      depth: 0
    });

    if (!resolveResult.success || !resolveResult.result?.node) {
      return false;
    }

    const node = resolveResult.result.node;
    const tagName = node.nodeName.toLowerCase();

    // Check if it's an editable element type
    const editableElements = ['input', 'textarea', 'select'];
    if (editableElements.includes(tagName)) {
      // Check for readonly
      const nodeId = node.nodeId;
      const attrsResult = await this.cdpService.getAttributes(tabId, nodeId);
      
      if (attrsResult.success && attrsResult.result) {
        if ('readonly' in attrsResult.result) {
          return false;
        }
      }
      
      // Also check enabled
      return await this.checkEnabled(tabId, backendNodeId);
    }

    // Check contenteditable
    const nodeId = node.nodeId;
    const attrsResult = await this.cdpService.getAttributes(tabId, nodeId);
    
    if (attrsResult.success && attrsResult.result) {
      const contentEditable = attrsResult.result.contenteditable;
      if (contentEditable === 'true' || contentEditable === '') {
        return true;
      }
    }

    return false;

  } catch (error) {
    console.error('[AutoWaiting] checkEditable error:', error);
    return false;
  }
}
```

### Generic Polling Function
```typescript
private async poll<T>(
  fn: () => Promise<T | null>,
  predicate: (result: T | null) => boolean,
  timeout: number,
  interval: number
): Promise<T | null> {
  const startTime = Date.now();
  let lastResult: T | null = null;

  while (Date.now() - startTime < timeout) {
    try {
      lastResult = await fn();
      
      if (predicate(lastResult)) {
        return lastResult;
      }
    } catch (error) {
      // Continue polling on error
      console.warn('[AutoWaiting] Poll iteration error:', error);
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  return lastResult;
}
```

### Scroll Into View If Needed
```typescript
async scrollIntoViewIfNeeded(tabId: number, backendNodeId: number): Promise<void> {
  try {
    // Check if already in viewport
    const inViewport = await this.checkInViewport(tabId, backendNodeId);
    if (inViewport) {
      return;
    }

    // Get nodeId
    const resolveResult = await this.cdpService.sendCommand(tabId, 'DOM.describeNode', {
      backendNodeId,
      depth: 0
    });

    if (!resolveResult.success || !resolveResult.result?.node?.nodeId) {
      return;
    }

    // Scroll into view
    await this.cdpService.scrollIntoView(tabId, resolveResult.result.node.nodeId);

    // Wait a bit for scroll animation
    await new Promise(resolve => setTimeout(resolve, 100));

  } catch (error) {
    console.error('[AutoWaiting] scrollIntoViewIfNeeded error:', error);
  }
}

private async checkInViewport(tabId: number, backendNodeId: number): Promise<boolean> {
  try {
    const boundingBox = await this.locators.getBoundingBox(tabId, backendNodeId);
    if (!boundingBox) {
      return false;
    }

    // Get viewport dimensions
    const layoutResult = await this.cdpService.sendCommand(tabId, 'Page.getLayoutMetrics');
    if (!layoutResult.success || !layoutResult.result) {
      return false;
    }

    const viewport = layoutResult.result.visualViewport || layoutResult.result.layoutViewport;
    if (!viewport) {
      return false;
    }

    // Check if element is within viewport
    const viewportWidth = viewport.clientWidth;
    const viewportHeight = viewport.clientHeight;

    return (
      boundingBox.x >= 0 &&
      boundingBox.y >= 0 &&
      boundingBox.x + boundingBox.width <= viewportWidth &&
      boundingBox.y + boundingBox.height <= viewportHeight
    );

  } catch (error) {
    return false;
  }
}
```

---

## Integration Points

### With DecisionEngine
```typescript
// DecisionEngine uses AutoWaiting before executing actions
class DecisionEngine {
  constructor(private autoWaiting: AutoWaiting) {}

  async executeAction(tabId: number, backendNodeId: number, action: string): Promise<ActionResult> {
    // Wait for element to be actionable
    const waitResult = await this.autoWaiting.waitForActionable(tabId, backendNodeId, {
      timeout: 30000,
      visible: true,
      enabled: true,
      stable: true
    });

    if (!waitResult.success) {
      return {
        success: false,
        error: `Element not actionable: ${waitResult.failureReason}`
      };
    }

    // Scroll into view if needed
    await this.autoWaiting.scrollIntoViewIfNeeded(tabId, backendNodeId);

    // Execute the action...
  }
}
```

### With Background Script
```typescript
// background.ts message handlers
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'WAIT_FOR_ACTIONABILITY') {
    autoWaiting.waitForActionable(message.tabId, message.backendNodeId, message.options)
      .then(sendResponse);
    return true;
  }

  if (message.action === 'CHECK_ACTIONABILITY') {
    autoWaiting.isActionable(message.tabId, message.backendNodeId, message.options)
      .then(sendResponse);
    return true;
  }
});
```

---

## Acceptance Criteria

- [ ] waitForActionable() waits for all actionability conditions
- [ ] waitForVisible() correctly detects visibility
- [ ] waitForEnabled() detects disabled elements
- [ ] waitForStable() detects animating elements
- [ ] waitForEditable() works for inputs and contenteditable
- [ ] waitForReceivesPointerEvents() detects covered elements
- [ ] Polling respects timeout configuration
- [ ] scrollIntoViewIfNeeded() scrolls when necessary
- [ ] getActionabilityState() returns accurate state
- [ ] Stability tracking works across multiple checks
- [ ] Network idle detection works (optional)
- [ ] TypeScript compiles with strict mode, 0 errors

---

## Edge Cases

1. **Element removed during wait**: Detect and return detached
2. **Element becomes covered**: Detect overlay dialogs/tooltips
3. **CSS animations**: Track position changes over time
4. **Transform animations**: Account for CSS transforms
5. **Sticky/fixed elements**: Handle different positioning contexts
6. **Scroll containers**: Element visible in container but not viewport
7. **Zero-size elements**: Report as not visible
8. **Opacity animations**: Track opacity changes
9. **Iframe elements**: Different coordinate systems
10. **Shadow DOM elements**: Accessibility tree may differ

---

## Estimated Lines

400-480 lines
