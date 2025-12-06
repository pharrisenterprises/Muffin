# MIGRATION NOTES

## Migration Overview

Phase 2 introduces Chrome DevTools Protocol (CDP) integration with Playwright-style locators and a 7-tier decision engine. This requires manifest updates, new dependencies, and breaking changes to data schemas.

## Completed Phases (1-6)

### Phase 1: Vision Engine ✅
- Tesseract.js integration
- Screenshot capture + OCR
- Vision click/type/dropdown
- Vision badge UI

### Phase 2: Time Delays ✅
- Global delay slider
- Per-step delay overrides
- Delay execution logic

### Phase 3: CSV Loop ✅
- CSV file upload
- Column mapping
- Loop start marker
- Variable substitution

### Phase 4: Conditional Click ✅
- Polling logic
- Timeout handling
- Vision integration

### Phase 5: UI Polish ✅
- Step badges
- Progress indicators
- Error messages

### Phase 6: Bug Fixes ✅
- Recording flow fixes
- Playback stability
- Evidence capture

## Phase 7: CDP Integration (NEW)

### Step 1: Add Debugger Permission (10 min)

**Files to Modify:**
- `public/manifest.json`

**Code:**
```json
{
  "permissions": [
    "debugger",
    "activeTab",
    "tabs"
  ]
}
```

**Verification:**
- Build extension
- Load in Chrome
- Check `chrome://extensions` shows debugger permission

---

### Step 2: CDPService Skeleton (2 hours)

**Files to Create:**
- `src/background/services/CDPService.ts`

**Code:**
```typescript
export class CDPService {
  private attachedTabs = new Set<number>();
  
  async attach(tabId: number): Promise<void> {
    if (this.attachedTabs.has(tabId)) return;
    
    await chrome.debugger.attach({ tabId }, '1.3');
    this.attachedTabs.add(tabId);
    
    // Enable domains
    await this.sendCommand(tabId, 'DOM.enable');
    await this.sendCommand(tabId, 'Accessibility.enable');
    await this.sendCommand(tabId, 'Runtime.enable');
  }
  
  async detach(tabId: number): Promise<void> {
    if (!this.attachedTabs.has(tabId)) return;
    
    await chrome.debugger.detach({ tabId });
    this.attachedTabs.delete(tabId);
  }
  
  async sendCommand<T>(tabId: number, method: string, params?: object): Promise<T> {
    if (!this.attachedTabs.has(tabId)) {
      throw new Error('CDP not attached');
    }
    
    return new Promise((resolve, reject) => {
      chrome.debugger.sendCommand({ tabId }, method, params, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result as T);
        }
      });
    });
  }
  
  isAttached(tabId: number): boolean {
    return this.attachedTabs.has(tabId);
  }
}

export const cdpService = new CDPService();
```

**Estimated Time:** 2 hours

---

### Step 3: DOM Commands (1 hour)

**Files to Modify:**
- `src/background/services/CDPService.ts`

**Add Methods:**
```typescript
async getDocument(tabId: number) {
  return this.sendCommand(tabId, 'DOM.getDocument');
}

async querySelector(tabId: number, selector: string) {
  const { root } = await this.getDocument(tabId);
  return this.sendCommand(tabId, 'DOM.querySelector', {
    nodeId: root.nodeId,
    selector
  });
}
```

**Estimated Time:** 1 hour

---

### Step 4: Accessibility Tree (1.5 hours)

**Files to Create:**
- `src/background/services/AccessibilityService.ts`

**Code:**
```typescript
export class AccessibilityService {
  constructor(private cdp: CDPService) {}
  
  async getFullTree(tabId: number) {
    return this.cdp.sendCommand(tabId, 'Accessibility.getFullAXTree');
  }
  
  async findByRole(tabId: number, role: string, name?: string) {
    const { nodes } = await this.getFullTree(tabId);
    
    let candidates = nodes.filter(n => n.role?.value === role);
    
    if (name) {
      candidates = candidates.filter(n => 
        n.name?.value?.toLowerCase().includes(name.toLowerCase())
      );
    }
    
    return candidates;
  }
}
```

**Estimated Time:** 1.5 hours

---

### Step 5: getByRole Locator (2 hours)

**Files to Create:**
- `src/background/services/PlaywrightLocators.ts`

**Code:**
```typescript
export class PlaywrightLocators {
  constructor(
    private cdp: CDPService,
    private axService: AccessibilityService
  ) {}
  
  async getByRole(
    tabId: number,
    role: string,
    options: { name?: string } = {}
  ): Promise<LocatorResult> {
    const candidates = await this.axService.findByRole(tabId, role, options.name);
    
    if (candidates.length === 0) {
      return { found: false, confidence: 0, duration: 0 };
    }
    
    const axNode = candidates[0];
    const { nodeId } = await this.cdp.sendCommand(tabId, 'DOM.getNodeForBackendNodeId', {
      backendNodeId: axNode.backendDOMNodeId
    });
    
    const { object } = await this.cdp.sendCommand(tabId, 'DOM.resolveNode', { nodeId });
    
    return {
      found: true,
      element: object,
      axNode,
      confidence: 0.95,
      duration: 0
    };
  }
}
```

**Estimated Time:** 2 hours

---

### Step 6: Text/Label/Placeholder Locators (1.5 hours)

**Files to Modify:**
- `src/background/services/PlaywrightLocators.ts`

**Add Methods:**
```typescript
async getByText(tabId: number, text: string) {
  const script = `
    Array.from(document.querySelectorAll('*')).find(el => 
      el.textContent?.trim().includes("${text}")
    );
  `;
  
  const { result } = await this.cdp.sendCommand(tabId, 'Runtime.evaluate', {
    expression: script
  });
  
  return {
    found: !!result.objectId,
    element: result,
    confidence: 0.90,
    duration: 0
  };
}

async getByLabel(tabId: number, text: string) {
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
    duration: 0
  };
}

async getByPlaceholder(tabId: number, text: string) {
  const selector = `[placeholder*="${text}" i]`;
  const { nodeId } = await this.cdp.querySelector(tabId, selector);
  
  return {
    found: nodeId > 0,
    confidence: 0.93,
    duration: 0
  };
}
```

**Estimated Time:** 1.5 hours

---

### Step 7: Locator Chaining (1.5 hours)

**Add Method:**
```typescript
async chain(tabId: number, locators: LocatorConfig[]): Promise<LocatorResult> {
  let context: Element | null = null;
  
  for (const locator of locators) {
    const result = await this.locate(tabId, locator, context);
    if (!result.found) return result;
    context = result.element;
  }
  
  return { found: true, element: context!, confidence: 0.88, duration: 0 };
}
```

**Estimated Time:** 1.5 hours

---

### Step 8: AutoWaiting Service (1.5 hours)

**Files to Create:**
- `src/background/services/AutoWaiting.ts`

**Code:**
```typescript
export class AutoWaitingService {
  async waitForVisible(element: Element, timeout: number = 30000): Promise<boolean> {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      if (this.isVisible(element)) return true;
      await this.sleep(100);
    }
    
    return false;
  }
  
  private isVisible(element: Element): boolean {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

**Estimated Time:** 1.5 hours

---

### Step 9: DecisionEngine Integration (3 hours)

**Files to Create:**
- `src/background/services/DecisionEngine.ts`

**Code:**
```typescript
export class DecisionEngine {
  async evaluateStrategies(step: RecordedStep): Promise<ScoredStrategy[]> {
    const strategies: ScoredStrategy[] = [];
    
    // Score DOM
    if (step.selector) {
      strategies.push({
        type: 'dom_selector',
        confidence: 0.85,
        speed: 10
      });
    }
    
    // Score CDP
    if (step.fallbackChain.strategies.some(s => s.type === 'cdp_semantic')) {
      strategies.push({
        type: 'cdp_semantic',
        confidence: 0.95,
        speed: 50
      });
    }
    
    // Score Vision
    if (step.visionData) {
      strategies.push({
        type: 'vision_ocr',
        confidence: 0.92,
        speed: 2000
      });
    }
    
    // Sort by confidence DESC
    return strategies.sort((a, b) => b.confidence - a.confidence);
  }
  
  selectBestStrategy(strategies: ScoredStrategy[]): StrategyType {
    return strategies[0]?.type ?? 'coordinates';
  }
}
```

**Estimated Time:** 3 hours

---

### Step 10: Recording Integration (2 hours)

**Files to Modify:**
- `src/contentScript/RecordingOrchestrator.ts`

**Add CDP Strategy Generation:**
```typescript
async generateCDPStrategies(element: Element): Promise<LocatorStrategy[]> {
  const strategies: LocatorStrategy[] = [];
  
  // Try getByRole
  const role = element.getAttribute('role');
  if (role) {
    strategies.push({
      type: 'cdp_semantic',
      metadata: { role },
      confidence: 0.95
    });
  }
  
  // Try getByText
  const text = element.textContent?.trim();
  if (text && text.length < 50) {
    strategies.push({
      type: 'cdp_power',
      metadata: { text },
      confidence: 0.90
    });
  }
  
  return strategies;
}
```

**Estimated Time:** 2 hours

---

## Breaking Changes

### Data Schema Changes

| Table | Field | Change | Migration |
|-------|-------|--------|-----------|
| `recordings` | `evidenceBufferId` | Added | Set to `null` for old recordings |
| `recordings` | `globalDelay` | Added | Default to `0` |
| `steps` | `fallbackChain` | Added | Generate from existing selectors |
| `steps` | `recordedVia` | Added | Default to `'dom'` |

### API Changes

| Endpoint | Old | New | Breaking? |
|----------|-----|-----|-----------|
| `EXECUTE_STEP` | Single strategy | Fallback chain | ❌ No (backward compatible) |
| `VISION_CLICK` | Returns boolean | Returns `ClickTarget` | ✅ Yes |
| CDP methods | N/A | New | ❌ No (additive) |

### Manifest Changes

```json
// OLD
{
  "permissions": ["activeTab", "tabs", "storage"]
}

// NEW
{
  "permissions": ["debugger", "activeTab", "tabs", "storage"]
}
```

**Impact:** Users must re-approve permissions on update

---

## Rollback Strategy

### If CDP Integration Fails:

1. **Revert Manifest:**
   ```bash
   git checkout v1.0.0 -- public/manifest.json
   ```

2. **Disable CDP Code:**
   ```typescript
   const CDP_ENABLED = false; // Feature flag
   
   if (CDP_ENABLED) {
     await cdpService.attach(tabId);
   }
   ```

3. **Rebuild:**
   ```bash
   npm run build
   ```

4. **Deploy Hotfix:**
   - Package old version
   - Submit to Chrome Web Store
   - Mark as urgent update

### If Data Migration Fails:

1. **Export User Data:**
   ```typescript
   const backup = await db.recordings.toArray();
   console.log(JSON.stringify(backup));
   ```

2. **Downgrade DB Schema:**
   ```typescript
   await db.version(2).stores({
     recordings: '++id, name, url'
   });
   ```

3. **Re-import Data:**
   ```typescript
   await db.recordings.bulkPut(backup);
   ```

---

## Post-Migration Verification

### Automated Checks

- [ ] CDP attach/detach works without errors
- [ ] getByRole finds semantic elements
- [ ] getByText finds text content
- [ ] Decision Engine selects highest confidence
- [ ] Fallback chain executes in order
- [ ] Telemetry logs strategy usage
- [ ] Old recordings still play back

### Manual Checks

- [ ] Record new workflow with CDP
- [ ] Verify CDP strategies in fallback chain
- [ ] Play back on changed page
- [ ] Confirm auto-healing works
- [ ] Check Chrome debugger indicator appears
- [ ] Verify debugger detaches on stop

### Performance Checks

- [ ] CDP locators < 50ms (95th percentile)
- [ ] No memory leaks after 100 steps
- [ ] Debugger detaches on tab close
- [ ] Extension doesn't slow down browser
