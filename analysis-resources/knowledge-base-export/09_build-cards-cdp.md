# BUILD CARDS: CDP INTEGRATION

## Implementation Order

```
CDP-001 (10m) → CDP-002 (2h) → CDP-003 (1h) → CDP-004 (1.5h)
                                    ↓               ↓
                             CDP-005 (2h) ← CDP-006 (1.5h)
                                    ↓
                             CDP-007 (1.5h)
                                    ↓
                          ┌────────┴────────┐
                          ↓                 ↓
                    CDP-008 (1.5h)   CDP-009 (3h)
                          ↓                 ↓
                          └────────┬────────┘
                                   ↓
                            CDP-010 (2h)
```

**Critical Path:** CDP-001 → CDP-002 → CDP-004 → CDP-005 → CDP-009 → CDP-010
**Total Estimated Time:** 16.5 hours

---

## CDP-001: Add Debugger Permission

**Effort:** 10 minutes  
**Risk:** Low  
**Dependencies:** None  

### Purpose
Add `debugger` permission to manifest for CDP access.

### Files to Modify
- `public/manifest.json`

### Implementation

```json
{
  "manifest_version": 3,
  "name": "Muffin Lite V2",
  "version": "2.0.0",
  "permissions": [
    "debugger",
    "activeTab",
    "tabs",
    "storage",
    "scripting"
  ],
  "host_permissions": [
    "<all_urls>"
  ]
}
```

### Acceptance Criteria
- [ ] Build completes without errors
- [ ] Extension loads in Chrome
- [ ] `chrome://extensions` shows debugger permission
- [ ] Permission warning displays on install

---

## CDP-002: CDPService Skeleton

**Effort:** 2 hours  
**Risk:** Medium  
**Dependencies:** CDP-001  

### Purpose
Core service for managing debugger attachment and CDP command execution.

### Files to Create
- `src/background/services/CDPService.ts`
- `src/background/services/types.ts`

### Implementation

```typescript
// types.ts
export interface CDPTarget {
  tabId: number;
}

export interface CDPCommandResult<T = any> {
  result: T;
  error?: string;
}

// CDPService.ts
export class CDPService {
  private attachedTabs = new Set<number>();
  private commandQueue = new Map<number, Promise<any>>();
  
  async attach(tabId: number): Promise<void> {
    if (this.attachedTabs.has(tabId)) {
      console.log(`[CDP] Already attached to tab ${tabId}`);
      return;
    }
    
    try {
      await chrome.debugger.attach({ tabId }, '1.3');
      this.attachedTabs.add(tabId);
      
      // Enable required domains
      await this.sendCommand(tabId, 'DOM.enable');
      await this.sendCommand(tabId, 'Accessibility.enable');
      await this.sendCommand(tabId, 'Runtime.enable');
      
      console.log(`[CDP] Attached to tab ${tabId}`);
    } catch (error) {
      console.error(`[CDP] Failed to attach to tab ${tabId}:`, error);
      throw error;
    }
  }
  
  async detach(tabId: number): Promise<void> {
    if (!this.attachedTabs.has(tabId)) return;
    
    try {
      await chrome.debugger.detach({ tabId });
      this.attachedTabs.delete(tabId);
      this.commandQueue.delete(tabId);
      
      console.log(`[CDP] Detached from tab ${tabId}`);
    } catch (error) {
      console.error(`[CDP] Failed to detach from tab ${tabId}:`, error);
    }
  }
  
  async sendCommand<T = any>(
    tabId: number,
    method: string,
    params?: object
  ): Promise<T> {
    if (!this.attachedTabs.has(tabId)) {
      throw new Error(`CDP not attached to tab ${tabId}. Call attach() first.`);
    }
    
    return new Promise((resolve, reject) => {
      chrome.debugger.sendCommand({ tabId }, method, params, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(result as T);
        }
      });
    });
  }
  
  isAttached(tabId: number): boolean {
    return this.attachedTabs.has(tabId);
  }
  
  getAttachedTabs(): number[] {
    return Array.from(this.attachedTabs);
  }
}

export const cdpService = new CDPService();
```

### Acceptance Criteria
- [ ] `attach()` successfully attaches debugger
- [ ] `sendCommand()` executes CDP commands
- [ ] `detach()` cleans up connection
- [ ] `isAttached()` returns correct state
- [ ] Errors thrown when command sent to unattached tab
- [ ] Multiple attach calls to same tab don't error

---

## CDP-003: DOM Commands

**Effort:** 1 hour  
**Risk:** Low  
**Dependencies:** CDP-002  

### Purpose
Helper methods for common DOM operations via CDP.

### Files to Modify
- `src/background/services/CDPService.ts`

### Implementation

```typescript
export class CDPService {
  // ... existing code ...
  
  async getDocument(tabId: number): Promise<any> {
    return this.sendCommand(tabId, 'DOM.getDocument', { depth: -1 });
  }
  
  async querySelector(tabId: number, selector: string): Promise<any> {
    const { root } = await this.getDocument(tabId);
    return this.sendCommand(tabId, 'DOM.querySelector', {
      nodeId: root.nodeId,
      selector
    });
  }
  
  async querySelectorAll(tabId: number, selector: string): Promise<any> {
    const { root } = await this.getDocument(tabId);
    return this.sendCommand(tabId, 'DOM.querySelectorAll', {
      nodeId: root.nodeId,
      selector
    });
  }
  
  async getNodeForBackendNodeId(tabId: number, backendNodeId: number): Promise<any> {
    return this.sendCommand(tabId, 'DOM.getNodeForBackendNodeId', {
      backendNodeId
    });
  }
  
  async resolveNode(tabId: number, nodeId: number): Promise<any> {
    return this.sendCommand(tabId, 'DOM.resolveNode', { nodeId });
  }
}
```

### Acceptance Criteria
- [ ] `getDocument()` returns root node
- [ ] `querySelector()` finds single element
- [ ] `querySelectorAll()` finds multiple elements
- [ ] `resolveNode()` converts nodeId to JS object

---

## CDP-004: Accessibility Tree

**Effort:** 1.5 hours  
**Risk:** Medium  
**Dependencies:** CDP-002  

### Purpose
Query accessibility tree for semantic element search.

### Files to Create
- `src/background/services/AccessibilityService.ts`

### Implementation

```typescript
import { CDPService } from './CDPService';

export interface AXNode {
  nodeId: string;
  role: { type: string; value: string };
  name?: { type: string; value: string };
  description?: { type: string; value: string };
  backendDOMNodeId: number;
  children?: AXNode[];
}

export class AccessibilityService {
  constructor(private cdp: CDPService) {}
  
  async getFullTree(tabId: number): Promise<{ nodes: AXNode[] }> {
    if (!this.cdp.isAttached(tabId)) {
      await this.cdp.attach(tabId);
    }
    
    return this.cdp.sendCommand(tabId, 'Accessibility.getFullAXTree');
  }
  
  async findByRole(tabId: number, role: string, name?: string): Promise<AXNode[]> {
    const { nodes } = await this.getFullTree(tabId);
    
    let candidates = nodes.filter(n => n.role?.value === role);
    
    if (name) {
      const lowerName = name.toLowerCase();
      candidates = candidates.filter(n => 
        n.name?.value?.toLowerCase().includes(lowerName)
      );
    }
    
    return candidates;
  }
  
  async findByName(tabId: number, name: string): Promise<AXNode[]> {
    const { nodes } = await this.getFullTree(tabId);
    const lowerName = name.toLowerCase();
    
    return nodes.filter(n => 
      n.name?.value?.toLowerCase().includes(lowerName)
    );
  }
}

export const accessibilityService = new AccessibilityService(cdpService);
```

### Acceptance Criteria
- [ ] `getFullTree()` returns accessibility nodes
- [ ] `findByRole()` filters by role
- [ ] `findByRole()` with name filters by both
- [ ] `findByName()` finds nodes by accessible name

---

## CDP-005: getByRole Locator

**Effort:** 2 hours  
**Risk:** Medium  
**Dependencies:** CDP-003, CDP-004  

### Purpose
Playwright-style `getByRole()` locator.

### Files to Create
- `src/background/services/PlaywrightLocators.ts`

### Implementation

```typescript
import { CDPService } from './CDPService';
import { AccessibilityService, AXNode } from './AccessibilityService';

export interface LocatorOptions {
  name?: string;
  exact?: boolean;
}

export interface LocatorResult {
  found: boolean;
  element?: any;
  axNode?: AXNode;
  confidence: number;
  duration: number;
}

export class PlaywrightLocators {
  constructor(
    private cdp: CDPService,
    private axService: AccessibilityService
  ) {}
  
  async getByRole(
    tabId: number,
    role: string,
    options: LocatorOptions = {}
  ): Promise<LocatorResult> {
    const startTime = Date.now();
    
    try {
      const candidates = await this.axService.findByRole(tabId, role, options.name);
      
      if (candidates.length === 0) {
        return {
          found: false,
          confidence: 0,
          duration: Date.now() - startTime
        };
      }
      
      const axNode = candidates[0];
      const { nodeId } = await this.cdp.getNodeForBackendNodeId(
        tabId,
        axNode.backendDOMNodeId
      );
      
      const { object } = await this.cdp.resolveNode(tabId, nodeId);
      
      return {
        found: true,
        element: object,
        axNode,
        confidence: 0.95,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        found: false,
        confidence: 0,
        duration: Date.now() - startTime
      };
    }
  }
}

export const playwrightLocators = new PlaywrightLocators(
  cdpService,
  accessibilityService
);
```

### Acceptance Criteria
- [ ] Finds button by role: `getByRole('button')`
- [ ] Finds with name: `getByRole('button', { name: 'Submit' })`
- [ ] Returns LocatorResult with confidence
- [ ] Returns element as CDP object
- [ ] Returns found=false when not found

---

## CDP-006: Text/Label/Placeholder Locators

**Effort:** 1.5 hours  
**Risk:** Low  
**Dependencies:** CDP-005  

### Purpose
Additional Playwright-style locators: getByText, getByLabel, getByPlaceholder.

### Files to Modify
- `src/background/services/PlaywrightLocators.ts`

### Implementation

```typescript
export class PlaywrightLocators {
  // ... existing code ...
  
  async getByText(tabId: number, text: string, options: LocatorOptions = {}): Promise<LocatorResult> {
    const startTime = Date.now();
    
    try {
      const script = options.exact
        ? `Array.from(document.querySelectorAll('*')).find(el => el.textContent?.trim() === "${text}")`
        : `Array.from(document.querySelectorAll('*')).find(el => el.textContent?.trim().includes("${text}"))`;
      
      const { result } = await this.cdp.sendCommand(tabId, 'Runtime.evaluate', {
        expression: script,
        returnByValue: false
      });
      
      return {
        found: !!result.objectId,
        element: result,
        confidence: 0.90,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return { found: false, confidence: 0, duration: Date.now() - startTime };
    }
  }
  
  async getByLabel(tabId: number, text: string): Promise<LocatorResult> {
    const startTime = Date.now();
    
    try {
      const script = `
        const label = Array.from(document.querySelectorAll('label')).find(l => 
          l.textContent?.toLowerCase().includes("${text.toLowerCase()}")
        );
        label ? document.getElementById(label.getAttribute('for')) : null;
      `;
      
      const { result } = await this.cdp.sendCommand(tabId, 'Runtime.evaluate', {
        expression: script
      });
      
      return {
        found: !!result.objectId,
        element: result,
        confidence: 0.92,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return { found: false, confidence: 0, duration: Date.now() - startTime };
    }
  }
  
  async getByPlaceholder(tabId: number, text: string): Promise<LocatorResult> {
    const startTime = Date.now();
    
    try {
      const { nodeId } = await this.cdp.querySelector(tabId, `[placeholder*="${text}" i]`);
      
      if (nodeId === 0) {
        return { found: false, confidence: 0, duration: Date.now() - startTime };
      }
      
      const { object } = await this.cdp.resolveNode(tabId, nodeId);
      
      return {
        found: true,
        element: object,
        confidence: 0.93,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return { found: false, confidence: 0, duration: Date.now() - startTime };
    }
  }
  
  async getByTestId(tabId: number, testId: string): Promise<LocatorResult> {
    const startTime = Date.now();
    
    try {
      const { nodeId } = await this.cdp.querySelector(tabId, `[data-testid="${testId}"]`);
      
      if (nodeId === 0) {
        return { found: false, confidence: 0, duration: Date.now() - startTime };
      }
      
      const { object } = await this.cdp.resolveNode(tabId, nodeId);
      
      return {
        found: true,
        element: object,
        confidence: 0.95,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return { found: false, confidence: 0, duration: Date.now() - startTime };
    }
  }
}
```

### Acceptance Criteria
- [ ] `getByText()` finds elements by text content
- [ ] `getByLabel()` finds inputs by associated label
- [ ] `getByPlaceholder()` finds inputs by placeholder
- [ ] `getByTestId()` finds elements by data-testid
- [ ] All return LocatorResult with confidence

---

## CDP-007: Locator Chaining

**Effort:** 1.5 hours  
**Risk:** Medium  
**Dependencies:** CDP-006  

### Purpose
Chain multiple locators for precise targeting: `getByRole('dialog').getByText('OK')`.

### Files to Modify
- `src/background/services/PlaywrightLocators.ts`

### Implementation

```typescript
export interface ChainedLocator {
  type: 'role' | 'text' | 'label' | 'placeholder' | 'testId';
  value: string;
  options?: LocatorOptions;
}

export class PlaywrightLocators {
  // ... existing code ...
  
  async chain(tabId: number, locators: ChainedLocator[]): Promise<LocatorResult> {
    if (locators.length === 0) {
      return { found: false, confidence: 0, duration: 0 };
    }
    
    const startTime = Date.now();
    let context: any = null;
    
    for (const locator of locators) {
      const result = await this.locate(tabId, locator, context);
      
      if (!result.found) {
        return {
          found: false,
          confidence: 0,
          duration: Date.now() - startTime
        };
      }
      
      context = result.element;
    }
    
    return {
      found: true,
      element: context,
      confidence: 0.88,
      duration: Date.now() - startTime
    };
  }
  
  private async locate(
    tabId: number,
    locator: ChainedLocator,
    context?: any
  ): Promise<LocatorResult> {
    switch (locator.type) {
      case 'role':
        return this.getByRole(tabId, locator.value, locator.options);
      case 'text':
        return this.getByText(tabId, locator.value, locator.options);
      case 'label':
        return this.getByLabel(tabId, locator.value);
      case 'placeholder':
        return this.getByPlaceholder(tabId, locator.value);
      case 'testId':
        return this.getByTestId(tabId, locator.value);
      default:
        return { found: false, confidence: 0, duration: 0 };
    }
  }
}
```

### Acceptance Criteria
- [ ] Chain executes locators in order
- [ ] First locator failure stops chain
- [ ] All locators success returns final element
- [ ] Confidence calculated from chain length

---

## CDP-008: AutoWaiting Service

**Effort:** 1.5 hours  
**Risk:** Low  
**Dependencies:** CDP-002  

### Purpose
Intelligent auto-waiting for element states (visible, enabled, stable).

### Files to Create
- `src/background/services/AutoWaiting.ts`

### Implementation

```typescript
export interface WaitOptions {
  timeout?: number;
  visible?: boolean;
  enabled?: boolean;
  stable?: boolean;
}

export class AutoWaitingService {
  private readonly DEFAULT_TIMEOUT = 30000;
  
  async waitFor(element: Element, options: WaitOptions = {}): Promise<boolean> {
    const timeout = options.timeout ?? this.DEFAULT_TIMEOUT;
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (options.visible !== false && !this.isVisible(element)) {
        await this.sleep(100);
        continue;
      }
      
      if (options.enabled !== false && !this.isEnabled(element)) {
        await this.sleep(100);
        continue;
      }
      
      if (options.stable !== false && !await this.isStable(element)) {
        await this.sleep(100);
        continue;
      }
      
      return true;
    }
    
    return false;
  }
  
  private isVisible(element: Element): boolean {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== 'hidden' &&
      style.display !== 'none'
    );
  }
  
  private isEnabled(element: Element): boolean {
    return !(element as HTMLButtonElement | HTMLInputElement).disabled;
  }
  
  private async isStable(element: Element): Promise<boolean> {
    const rect1 = element.getBoundingClientRect();
    await this.sleep(100);
    const rect2 = element.getBoundingClientRect();
    
    return rect1.top === rect2.top && rect1.left === rect2.left;
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const autoWaitingService = new AutoWaitingService();
```

### Acceptance Criteria
- [ ] Waits for element to be visible
- [ ] Waits for element to be enabled
- [ ] Waits for element position to stabilize
- [ ] Returns false on timeout
- [ ] Default timeout is 30 seconds

---

## CDP-009: DecisionEngine Integration

**Effort:** 3 hours  
**Risk:** High  
**Dependencies:** CDP-005, CDP-006, CDP-007, CDP-008  

### Purpose
Integrate CDP locators into decision engine for strategy evaluation.

### Files to Create
- `src/background/services/DecisionEngine.ts`

### Implementation

```typescript
import { PlaywrightLocators } from './PlaywrightLocators';
import { AutoWaitingService } from './AutoWaiting';

export interface ScoredStrategy {
  type: StrategyType;
  confidence: number;
  speed: number;
  metadata?: any;
}

export class DecisionEngine {
  constructor(
    private locators: PlaywrightLocators,
    private autoWaiting: AutoWaitingService
  ) {}
  
  async evaluateStrategies(step: RecordedStep, tabId: number): Promise<ScoredStrategy[]> {
    const strategies: ScoredStrategy[] = [];
    
    // 1. DOM Selector
    if (step.selector) {
      strategies.push({
        type: 'dom_selector',
        confidence: 0.85,
        speed: 10,
        metadata: { selector: step.selector }
      });
    }
    
    // 2. CSS Selector
    if (step.xpath) {
      strategies.push({
        type: 'css_selector',
        confidence: 0.80,
        speed: 15,
        metadata: { xpath: step.xpath }
      });
    }
    
    // 3. CDP Semantic (getByRole)
    if (step.fallbackChain?.strategies.some(s => s.type === 'cdp_semantic')) {
      const cdpStrategy = step.fallbackChain.strategies.find(s => s.type === 'cdp_semantic');
      strategies.push({
        type: 'cdp_semantic',
        confidence: 0.95,
        speed: 50,
        metadata: cdpStrategy.metadata
      });
    }
    
    // 4. CDP Power (getByText/Label/Placeholder)
    if (step.fallbackChain?.strategies.some(s => s.type === 'cdp_power')) {
      const cdpStrategy = step.fallbackChain.strategies.find(s => s.type === 'cdp_power');
      strategies.push({
        type: 'cdp_power',
        confidence: 0.90,
        speed: 100,
        metadata: cdpStrategy.metadata
      });
    }
    
    // 5. Evidence Scoring
    if (step.mouseTrailAtCapture) {
      strategies.push({
        type: 'evidence_scoring',
        confidence: 0.88,
        speed: 500
      });
    }
    
    // 6. Vision OCR
    if (step.visionData) {
      strategies.push({
        type: 'vision_ocr',
        confidence: 0.92,
        speed: 2000,
        metadata: step.visionData
      });
    }
    
    // 7. Coordinates (fallback)
    if (step.visionData?.clickTarget) {
      strategies.push({
        type: 'coordinates',
        confidence: 0.60,
        speed: 5,
        metadata: step.visionData.clickTarget
      });
    }
    
    // Sort by confidence DESC
    return strategies.sort((a, b) => b.confidence - a.confidence);
  }
  
  selectBestStrategy(strategies: ScoredStrategy[]): StrategyType {
    if (strategies.length === 0) return 'coordinates';
    return strategies[0].type;
  }
  
  async executeWithFallback(
    step: RecordedStep,
    tabId: number
  ): Promise<ExecutionResult> {
    const strategies = await this.evaluateStrategies(step, tabId);
    
    for (let i = 0; i < strategies.length; i++) {
      const strategy = strategies[i];
      
      try {
        const result = await this.executeStrategy(strategy, step, tabId);
        
        if (result.success) {
          return {
            success: true,
            strategyUsed: strategy.type,
            confidence: strategy.confidence,
            attemptNumber: i + 1,
            duration: result.duration
          };
        }
      } catch (error) {
        console.warn(`Strategy ${strategy.type} failed:`, error);
        continue;
      }
    }
    
    return {
      success: false,
      error: 'All strategies failed',
      attemptNumber: strategies.length
    };
  }
  
  private async executeStrategy(
    strategy: ScoredStrategy,
    step: RecordedStep,
    tabId: number
  ): Promise<{ success: boolean; duration: number }> {
    const startTime = Date.now();
    
    switch (strategy.type) {
      case 'cdp_semantic': {
        const result = await this.locators.getByRole(
          tabId,
          strategy.metadata.role,
          { name: strategy.metadata.name }
        );
        
        if (result.found) {
          await this.autoWaiting.waitFor(result.element);
          // Execute action on element
          return { success: true, duration: Date.now() - startTime };
        }
        
        return { success: false, duration: Date.now() - startTime };
      }
      
      case 'cdp_power': {
        if (strategy.metadata.text) {
          const result = await this.locators.getByText(tabId, strategy.metadata.text);
          if (result.found) {
            await this.autoWaiting.waitFor(result.element);
            return { success: true, duration: Date.now() - startTime };
          }
        }
        return { success: false, duration: Date.now() - startTime };
      }
      
      // ... other strategies ...
      
      default:
        return { success: false, duration: 0 };
    }
  }
}

export const decisionEngine = new DecisionEngine(
  playwrightLocators,
  autoWaitingService
);
```

### Acceptance Criteria
- [ ] Evaluates all 7 strategy types
- [ ] Sorts strategies by confidence
- [ ] Executes highest confidence first
- [ ] Falls back to next strategy on failure
- [ ] Logs telemetry for each attempt
- [ ] Returns ExecutionResult with details

---

## CDP-010: Recording Integration

**Effort:** 2 hours  
**Risk:** Medium  
**Dependencies:** CDP-009  

### Purpose
Generate CDP strategies during recording to populate fallback chains.

### Files to Modify
- `src/contentScript/RecordingOrchestrator.ts`

### Implementation

```typescript
export class RecordingOrchestrator {
  async generateFallbackChain(element: HTMLElement): Promise<FallbackChain> {
    const strategies: LocatorStrategy[] = [];
    
    // 1. DOM Selector
    if (element.id) {
      strategies.push({
        type: 'dom_selector',
        selector: `#${element.id}`,
        confidence: 0.85
      });
    }
    
    // 2. CDP Semantic
    const role = element.getAttribute('role') || this.getImplicitRole(element);
    if (role) {
      const name = element.textContent?.trim() || element.getAttribute('aria-label');
      strategies.push({
        type: 'cdp_semantic',
        confidence: 0.95,
        metadata: { role, name }
      });
    }
    
    // 3. CDP Power
    const text = element.textContent?.trim();
    if (text && text.length < 50) {
      strategies.push({
        type: 'cdp_power',
        confidence: 0.90,
        metadata: { text }
      });
    }
    
    // 4. Vision (if needed)
    if (this.needsVision(element)) {
      const visionData = await this.captureVisionData(element);
      strategies.push({
        type: 'vision_ocr',
        confidence: 0.92,
        metadata: visionData
      });
    }
    
    // Sort by confidence
    strategies.sort((a, b) => b.confidence - a.confidence);
    
    return {
      strategies,
      primaryStrategy: strategies[0]?.type ?? 'dom_selector',
      recordedAt: Date.now()
    };
  }
  
  private getImplicitRole(element: HTMLElement): string | null {
    const tagName = element.tagName.toLowerCase();
    const roleMap: Record<string, string> = {
      'button': 'button',
      'a': 'link',
      'input': 'textbox',
      'select': 'combobox',
      'textarea': 'textbox'
    };
    return roleMap[tagName] || null;
  }
  
  private needsVision(element: HTMLElement): boolean {
    return element.tagName === 'CANVAS' || this.isInShadowDOM(element);
  }
  
  private isInShadowDOM(element: HTMLElement): boolean {
    let current = element;
    while (current) {
      if (current.getRootNode() instanceof ShadowRoot) {
        return true;
      }
      current = current.parentElement as HTMLElement;
    }
    return false;
  }
}
```

### Acceptance Criteria
- [ ] Generates fallback chain for every recorded step
- [ ] Includes CDP strategies when applicable
- [ ] Sorts strategies by confidence
- [ ] Captures vision data for canvas/shadow DOM
- [ ] Stores fallback chain in RecordedStep
