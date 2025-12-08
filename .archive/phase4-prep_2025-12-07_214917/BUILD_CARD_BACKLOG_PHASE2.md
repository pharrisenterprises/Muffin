# BUILD CARD BACKLOG: MUFFIN LITE PHASE 2

**Generated:** December 6, 2025  
**Total Cards:** 87  
**Estimated Total Effort:** 55-65 hours  
**Scope:** Complete Phase 2 implementation including CDP, Vision, Decision Engine

---

## MASTER INDEX

### Category 1: Foundation / Architecture (FND) — 12 cards
| ID | Title | Priority | Effort | Dependencies |
|----|-------|----------|--------|--------------|
| FND-001 | Install Tesseract.js | P0 | 10 min | None |
| FND-002 | Update Manifest Permissions | P0 | 10 min | None |
| FND-003 | Create Services Directory Structure | P0 | 5 min | None |
| FND-004 | Create StrategyType Enum | P0 | 15 min | None |
| FND-005 | Create RecordedVia Type | P0 | 10 min | None |
| FND-006 | Create VisionConfig Interface | P0 | 15 min | None |
| FND-007 | Create TextResult Interface | P0 | 10 min | None |
| FND-008 | Create ClickTarget Interface | P0 | 10 min | None |
| FND-009 | Create ConditionalConfig Interface | P0 | 15 min | None |
| FND-010 | Create LocatorStrategy Interface | P0 | 15 min | FND-004 |
| FND-011 | Create FallbackChain Interface | P0 | 15 min | FND-010 |
| FND-012 | Extend Step Interface | P0 | 30 min | FND-005, FND-011 |

### Category 2: Data Layer (DAT) — 8 cards
| ID | Title | Priority | Effort | Dependencies |
|----|-------|----------|--------|--------------|
| DAT-001 | Define Dexie Schema v3 | P0 | 30 min | FND-012 |
| DAT-002 | Implement v1→v3 Migration | P0 | 45 min | DAT-001 |
| DAT-003 | Create Recording Repository | P1 | 30 min | DAT-001 |
| DAT-004 | Create Telemetry Repository | P1 | 30 min | DAT-001 |
| DAT-005 | Create Evidence Buffer Repository | P1 | 30 min | DAT-001 |
| DAT-006 | Implement Default Values Factory | P1 | 20 min | FND-012 |
| DAT-007 | Add Step Validation Utility | P2 | 30 min | FND-012 |
| DAT-008 | Add Migration Rollback Support | P2 | 45 min | DAT-002 |

### Category 3: CDP Infrastructure (CDP) — 10 cards
| ID | Title | Priority | Effort | Dependencies |
|----|-------|----------|--------|--------------|
| CDP-001 | Add Debugger Permission to Manifest | P0 | 10 min | FND-002 |
| CDP-002 | Create CDPService Skeleton | P0 | 2 hrs | CDP-001 |
| CDP-003 | Implement DOM Commands | P0 | 1 hr | CDP-002 |
| CDP-004 | Implement Accessibility Tree Access | P0 | 1.5 hrs | CDP-002 |
| CDP-005 | Implement getByRole Locator | P0 | 2 hrs | CDP-004 |
| CDP-006 | Implement Text/Label/Placeholder Locators | P0 | 1.5 hrs | CDP-003 |
| CDP-007 | Implement Locator Chaining | P1 | 1.5 hrs | CDP-005, CDP-006 |
| CDP-008 | Implement AutoWaiting Service | P0 | 1.5 hrs | CDP-003 |
| CDP-009 | Implement DecisionEngine Core | P0 | 3 hrs | CDP-005, CDP-008 |
| CDP-010 | Integrate CDP with Recording | P0 | 2 hrs | CDP-009 |

### Category 4: Vision Engine (VIS) — 15 cards
| ID | Title | Priority | Effort | Dependencies |
|----|-------|----------|--------|--------------|
| VIS-001 | Create VisionEngine Skeleton | P0 | 30 min | FND-001, FND-006 |
| VIS-002 | Implement Tesseract Worker Init | P0 | 45 min | VIS-001 |
| VIS-003 | Implement Screenshot Capture | P0 | 30 min | VIS-001 |
| VIS-004 | Implement OCR Text Extraction | P0 | 1 hr | VIS-002, VIS-003 |
| VIS-005 | Implement Text Search with Fuzzy Match | P0 | 45 min | VIS-004 |
| VIS-006 | Implement Vision Click | P0 | 1 hr | VIS-005 |
| VIS-007 | Implement Vision Type | P0 | 45 min | VIS-006 |
| VIS-008 | Implement Vision Dropdown | P1 | 45 min | VIS-006 |
| VIS-009 | Implement Conditional Click Polling | P0 | 1.5 hrs | VIS-006 |
| VIS-010 | Add Vision Fallback Trigger Detection | P0 | 1 hr | VIS-001 |
| VIS-011 | Implement Vision Recording Capture | P0 | 1.5 hrs | VIS-010 |
| VIS-012 | Add Coordinate Storage | P0 | 30 min | VIS-011 |
| VIS-013 | Implement Worker Lifecycle Management | P1 | 45 min | VIS-002 |
| VIS-014 | Add Screenshot Caching | P2 | 30 min | VIS-003 |
| VIS-015 | Implement Vision Cleanup | P1 | 30 min | VIS-013 |

### Category 5: Decision Engine (DEC) — 8 cards
| ID | Title | Priority | Effort | Dependencies |
|----|-------|----------|--------|--------------|
| DEC-001 | Create Strategy Evaluator Interface | P0 | 30 min | FND-010 |
| DEC-002 | Implement DOM Strategy Evaluator | P0 | 45 min | DEC-001 |
| DEC-003 | Implement CDP Strategy Evaluator | P0 | 1 hr | DEC-001, CDP-005 |
| DEC-004 | Implement Vision Strategy Evaluator | P0 | 1 hr | DEC-001, VIS-006 |
| DEC-005 | Implement Coordinates Strategy Evaluator | P0 | 30 min | DEC-001 |
| DEC-006 | Implement Parallel Strategy Scoring | P0 | 1.5 hrs | DEC-002 to DEC-005 |
| DEC-007 | Implement Fallback Chain Executor | P0 | 1.5 hrs | DEC-006 |
| DEC-008 | Add Telemetry Logging to Engine | P1 | 45 min | DEC-007, DAT-004 |

### Category 6: Integration Points (INT) — 12 cards
| ID | Title | Priority | Effort | Dependencies |
|----|-------|----------|--------|--------------|
| INT-001 | Add CDP Message Handlers | P0 | 1 hr | CDP-002 |
| INT-002 | Add Vision Message Handlers | P0 | 1 hr | VIS-006 |
| INT-003 | Add Telemetry Message Handlers | P1 | 30 min | DAT-004 |
| INT-004 | Integrate Recording with FallbackChain | P0 | 2 hrs | CDP-010, VIS-011 |
| INT-005 | Integrate Playback with DecisionEngine | P0 | 2 hrs | DEC-007 |
| INT-006 | Add Time Delay Execution | P0 | 45 min | None |
| INT-007 | Add CSV Loop Execution | P0 | 1 hr | None |
| INT-008 | Add Conditional Click Execution | P0 | 1 hr | VIS-009 |
| INT-009 | Wire Vision Fallback to Recording | P0 | 1 hr | VIS-010 |
| INT-010 | Add CDP Cleanup on Tab Close | P1 | 30 min | CDP-002 |
| INT-011 | Add Vision Cleanup on Recording Stop | P1 | 30 min | VIS-015 |
| INT-012 | Implement Evidence Pruning | P2 | 45 min | DAT-005 |

### Category 7: UI Components (UI) — 12 cards
| ID | Title | Priority | Effort | Dependencies |
|----|-------|----------|--------|--------------|
| UI-001 | Create Vision Badge Component | P0 | 30 min | None |
| UI-002 | Create Strategy Indicator Component | P1 | 30 min | None |
| UI-003 | Create Delay Controls Component | P0 | 45 min | None |
| UI-004 | Create Conditional Click Config Panel | P0 | 1 hr | FND-009 |
| UI-005 | Create Telemetry Panel Component | P2 | 1 hr | None |
| UI-006 | Create Fallback Chain Viewer | P2 | 45 min | None |
| UI-007 | Add Vision Badge to StepsTable | P0 | 30 min | UI-001 |
| UI-008 | Add Delay Controls to Recorder | P0 | 30 min | UI-003 |
| UI-009 | Add Conditional Config to Step Menu | P0 | 45 min | UI-004 |
| UI-010 | Add Strategy Indicator to TestRunner | P1 | 30 min | UI-002 |
| UI-011 | Add Telemetry Panel to TestRunner | P2 | 30 min | UI-005 |
| UI-012 | Add Recording Overlay Updates | P1 | 30 min | VIS-011 |

### Category 8: Testing & Validation (TST) — 10 cards
| ID | Title | Priority | Effort | Dependencies |
|----|-------|----------|--------|--------------|
| TST-001 | Unit Tests: CDPService | P0 | 1.5 hrs | CDP-002 |
| TST-002 | Unit Tests: PlaywrightLocators | P0 | 2 hrs | CDP-007 |
| TST-003 | Unit Tests: VisionEngine | P0 | 1.5 hrs | VIS-006 |
| TST-004 | Unit Tests: DecisionEngine | P0 | 2 hrs | DEC-007 |
| TST-005 | Unit Tests: Schema Migration | P0 | 1 hr | DAT-002 |
| TST-006 | Integration Test: Recording Flow | P0 | 2 hrs | INT-004 |
| TST-007 | Integration Test: Playback Flow | P0 | 2 hrs | INT-005 |
| TST-008 | E2E Test: Full Workflow | P1 | 3 hrs | TST-006, TST-007 |
| TST-009 | Manual Test: Complex Sites | P1 | 2 hrs | TST-008 |
| TST-010 | Performance Benchmark Suite | P2 | 2 hrs | TST-008 |

---

## CATEGORY A: FOUNDATION (FND)

### FND-001: Install Tesseract.js
**Priority:** P0 Critical  
**Dependencies:** None  
**Complexity:** Low  
**Status:** 🟢 Ready to Build

**Description:**
Add Tesseract.js v5 to project dependencies.

**Acceptance Criteria:**
- [ ] `npm install tesseract.js` completes successfully
- [ ] Tesseract.js version locked in package.json
- [ ] No build errors after installation

**Implementation:**
```bash
npm install tesseract.js
```

**Notes:**
- Adds ~3MB to bundle size
- Consider lazy loading strategy per **ARCHITECTURE_DECISIONS.md Decision 1** (load at recording start)

---

### FND-002: Update Manifest Permissions
**Priority:** P0 Critical  
**Dependencies:** None  
**Complexity:** Low  
**Status:** 🟢 Ready to Build

**Description:**
Add required Chrome API permissions for CDP and screenshots.

**Acceptance Criteria:**
- [ ] `debugger` permission added
- [ ] `nativeMessaging` permission added (Phase 3)
- [ ] Extension loads without permission errors

**Implementation:**
```json
{
  "permissions": [
    "debugger",
    "nativeMessaging"
  ]
}
```

**Notes:**
- Debugger permission enables CDP APIs
- Native Messaging for Phase 3 storage expansion

---

### FND-003: Create Directory Structure
**Priority:** P0 Critical  
**Dependencies:** None  
**Complexity:** Low  
**Status:** 🟢 Ready to Build

**Description:**
Create new directories for Phase 2 code organization.

**Acceptance Criteria:**
- [ ] `src/types/` directory exists
- [ ] `src/background/services/` directory exists
- [ ] `src/background/services/strategies/` directory exists
- [ ] `src/lib/migrations/` directory exists

**Implementation:**
```bash
mkdir -p src/types
mkdir -p src/background/services/strategies
mkdir -p src/lib/migrations
```

---

### FND-004 to FND-012: Type Definitions
**Priority:** P0 Critical  
**Dependencies:** None  
**Complexity:** Low-Medium  
**Status:** 🟢 Ready to Build

**FND-004: Create strategy.ts**
- RecordedVia enum
- StrategyType enum
- LocatorStrategy interface
- FallbackChain type
- StrategyScore interface

**FND-005: Create vision.ts**
- VisionConfig interface
- TextResult interface
- ClickTarget interface
- ConditionalConfig interface
- ConditionalClickResult interface

**FND-006: Create cdp.ts**
- CDPNode interface
- AXNode interface
- LocatorResult interface
- WaitOptions interface
- ActionabilityState interface

**FND-007: Create telemetry.ts**
- TelemetryRecord interface
- StrategyAttempt interface
- PlaybackMetrics interface

**FND-008: Create evidence.ts**
- EvidenceRecord interface
- EvidenceBuffer interface
- EvidenceType enum

**FND-009: Extend Step Interface**
```typescript
interface RecordedStep extends Step {
  recordedVia?: RecordedVia;
  fallbackChain?: FallbackChain;
  visionData?: {
    targetText: string;
    clickTarget: ClickTarget;
    screenshot?: string;
  };
  coordinates?: { x: number; y: number };
  delay?: number;
  conditionalConfig?: ConditionalConfig | null;
}
```

**FND-010: Extend Recording Interface**
```typescript
interface Recording {
  // ... existing fields
  globalDelayMs?: number;
  loopStartIndex?: number;
  csvData?: string[][];
  columnMapping?: Record<string, number>;
  schemaVersion?: number;
  evidenceBufferId?: string;
}
```

**FND-011: Create Message Action Types**
```typescript
type NewMessageActions =
  | 'CDP_ATTACH'
  | 'CDP_DETACH'
  | 'CDP_COMMAND'
  | 'PLAYWRIGHT_LOCATE'
  | 'VISION_CLICK'
  | 'VISION_TYPE'
  | 'VISION_OCR'
  | 'VISION_CONDITIONAL_CLICK'
  | 'STRATEGY_TELEMETRY'
  | 'EVALUATE_STRATEGIES'
  | 'GENERATE_FALLBACK_CHAIN'
  | 'WAIT_FOR_ACTIONABILITY';
```

**FND-012: Export All Types**
- Consolidate exports in src/types/index.ts
- Ensure backward compatibility

---

## CATEGORY B: DATA LAYER (DAT)

### DAT-001: Define Schema v3
**Priority:** P0 Critical  
**Dependencies:** FND-009, FND-010  
**Complexity:** Medium  
**Status:** 🟢 Ready to Build

**Description:**
Define schema v3 with new Phase 2 fields per **ARCHITECTURE_DECISIONS.md Decision 7** (lazy migration).

**Acceptance Criteria:**
- [ ] RecordedStep schema defined with all optional Phase 2 fields
- [ ] Recording schema includes schemaVersion field
- [ ] Migration path from v1/v2 to v3 documented

**Implementation:**
```typescript
// Schema version in Recording
schemaVersion: 3

// New optional fields in RecordedStep
recordedVia?: RecordedVia
fallbackChain?: FallbackChain
visionData?: {...}
coordinates?: {x, y}
delay?: number
conditionalConfig?: ConditionalConfig | null
```

**Notes:**
- Per Decision 7: Migration happens lazily on recording load
- Old recordings remain functional (backward compatible)

---

### DAT-002: Schema v3 Migration Logic
**Priority:** P0 Critical  
**Dependencies:** DAT-001  
**Complexity:** Medium  
**Status:** 🟡 Blocked by DAT-001

**Description:**
Implement lazy migration per **ARCHITECTURE_DECISIONS.md Decision 7**.

**Acceptance Criteria:**
- [ ] `src/lib/migrations/v3.ts` created
- [ ] Migration runs on recording load if schemaVersion < 3
- [ ] No data loss during migration
- [ ] Migration adds schemaVersion: 3 field

**Implementation:**
```typescript
export function migrateToV3(recording: Recording): Recording {
  if (recording.schemaVersion >= 3) return recording;
  
  return {
    ...recording,
    schemaVersion: 3,
    steps: recording.steps.map(step => ({
      ...step,
      // Existing fields preserved
      // New optional fields undefined (valid)
    }))
  };
}
```

**Notes:**
- Migration is additive only (no deletions)
- Rollback supported (Phase 3 can ignore new fields)

---

### DAT-003 to DAT-008: Repositories
**Priority:** P1 High  
**Dependencies:** DAT-001, DAT-002  
**Complexity:** Medium  
**Status:** 🟡 Blocked by DAT-002

**DAT-003: Recording Repository**
- CRUD operations for recordings
- Schema migration integration
- Evidence buffer linking

**DAT-004: Telemetry Repository**
- Store strategy attempt logs
- Playback metrics aggregation
- Query by recording ID

**DAT-005: Evidence Buffer Management**
- Store evidence records
- Browser storage (50MB) per **ARCHITECTURE_DECISIONS.md Decision 4**
- Pruning strategy (oldest first when full)

**DAT-006: Project Repository Updates**
- Link recordings to projects
- Backward compatibility with existing data

**DAT-007: Test Run Repository**
- Store playback results
- Link to telemetry records
- Aggregate success rates

**DAT-008: Native Host Repository (Phase 3)**
- Local filesystem storage
- Unlimited evidence storage per **Decision 4**
- Graceful browser-only fallback

---

## CATEGORY C: CDP INFRASTRUCTURE (CDP)

### CDP-001: Debugger Permission
**Priority:** P0 Critical  
**Dependencies:** FND-002  
**Complexity:** Low  
**Status:** 🟢 Ready to Build

**Description:**
Verify debugger permission enables CDP APIs.

**Acceptance Criteria:**
- [ ] `chrome.debugger.attach()` succeeds
- [ ] CDP commands execute without errors
- [ ] Debugger icon appears in Chrome toolbar

---

### CDP-002: CDPService Skeleton
**Priority:** P0 Critical  
**Dependencies:** CDP-001, FND-006  
**Complexity:** Medium  
**Status:** 🟡 Blocked by CDP-001

**Description:**
Create CDPService wrapper for chrome.debugger APIs.

**Acceptance Criteria:**
- [ ] `src/background/services/CDPService.ts` created
- [ ] attach(tabId) / detach(tabId) methods
- [ ] sendCommand(method, params) wrapper
- [ ] Error handling for CDP failures

**Implementation:**
```typescript
class CDPService {
  async attach(tabId: number): Promise<void> {
    await chrome.debugger.attach({ tabId }, "1.3");
  }
  
  async sendCommand<T>(tabId: number, method: string, params?: any): Promise<T> {
    return chrome.debugger.sendCommand({ tabId }, method, params);
  }
  
  async detach(tabId: number): Promise<void> {
    await chrome.debugger.detach({ tabId });
  }
}
```

---

### CDP-003: DOM Commands
**Priority:** P1 High  
**Dependencies:** CDP-002  
**Complexity:** Medium  
**Status:** 🟡 Blocked by CDP-002

**Description:**
Implement CDP DOM domain commands (getDocument, querySelector, etc.).

**Acceptance Criteria:**
- [ ] getDocument() retrieves root node
- [ ] querySelector() finds elements by CSS selector
- [ ] getOuterHTML() retrieves element markup
- [ ] getAttributes() retrieves element attributes

---

### CDP-004: Accessibility Service
**Priority:** P1 High  
**Dependencies:** CDP-002  
**Complexity:** Medium  
**Status:** 🟡 Blocked by CDP-002

**Description:**
Implement CDP Accessibility domain for AX tree traversal.

**Acceptance Criteria:**
- [ ] `src/background/services/AccessibilityService.ts` created
- [ ] getFullAXTree() retrieves accessibility tree
- [ ] queryAXTree(nodeId, role, name) finds nodes
- [ ] getAXNodeAttributes(nodeId) retrieves AX properties

**Implementation:**
```typescript
class AccessibilityService {
  constructor(private cdp: CDPService) {}
  
  async getFullAXTree(tabId: number): Promise<AXNode> {
    return this.cdp.sendCommand(tabId, 'Accessibility.getFullAXTree');
  }
  
  async queryAXTree(tabId: number, role?: string, name?: string): Promise<AXNode[]> {
    const tree = await this.getFullAXTree(tabId);
    return this.filterAXNodes(tree, { role, name });
  }
}
```

---

### CDP-005: getByRole Implementation
**Priority:** P1 High  
**Dependencies:** CDP-004  
**Complexity:** High  
**Status:** 🟡 Blocked by CDP-004

**Description:**
Implement Playwright-style getByRole() locator.

**Acceptance Criteria:**
- [ ] `src/background/services/PlaywrightLocators.ts` created
- [ ] getByRole(role, options?) finds element by ARIA role
- [ ] Supports exact/regex name matching
- [ ] Returns LocatorResult with confidence score

**Implementation:**
```typescript
async getByRole(
  tabId: number,
  role: string,
  options?: { name?: string | RegExp; exact?: boolean }
): Promise<LocatorResult | null> {
  const nodes = await this.axService.queryAXTree(tabId, role);
  
  if (options?.name) {
    const filtered = nodes.filter(node => {
      const nodeName = node.name?.value || '';
      if (options.exact) return nodeName === options.name;
      if (options.name instanceof RegExp) return options.name.test(nodeName);
      return nodeName.includes(options.name);
    });
    nodes = filtered;
  }
  
  if (nodes.length === 0) return null;
  
  return {
    node: nodes[0],
    confidence: nodes.length === 1 ? 0.95 : 0.75,
    strategy: 'CDP:getByRole'
  };
}
```

---

### CDP-006: getByText/Label/Placeholder
**Priority:** P1 High  
**Dependencies:** CDP-004, CDP-005  
**Complexity:** High  
**Status:** 🟡 Blocked by CDP-004

**Description:**
Implement remaining Playwright-style semantic locators.

**Acceptance Criteria:**
- [ ] getByText(text) finds element with visible text
- [ ] getByLabel(label) finds form input by label
- [ ] getByPlaceholder(placeholder) finds input by placeholder
- [ ] getByAltText(alt) finds image by alt text
- [ ] getByTitle(title) finds element by title attribute

---

### CDP-007: Locator Chaining
**Priority:** P2 Medium  
**Dependencies:** CDP-005, CDP-006  
**Complexity:** Medium  
**Status:** 🟡 Blocked by CDP-006

**Description:**
Enable chaining locators like Playwright (e.g., `getByRole('button').getByText('Submit')`).

**Acceptance Criteria:**
- [ ] Locator class supports chaining
- [ ] Scoped locators work (search within parent)
- [ ] Confidence scores aggregate correctly

---

### CDP-008: AutoWaiting Implementation
**Priority:** P1 High  
**Dependencies:** CDP-002  
**Complexity:** Medium  
**Status:** 🟡 Blocked by CDP-002

**Description:**
Implement actionability checks per **ARCHITECTURE_DECISIONS.md Decision 3** (120s timeout).

**Acceptance Criteria:**
- [ ] `src/background/services/AutoWaiting.ts` created
- [ ] waitForActionability() polls element state
- [ ] Checks: visible, stable, enabled, not obscured
- [ ] Default timeout 120s (configurable)
- [ ] Returns ActionabilityState

**Implementation:**
```typescript
async waitForActionability(
  tabId: number,
  nodeId: number,
  timeout: number = 120000 // Per Decision 3
): Promise<ActionabilityState> {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    const state = await this.checkActionability(tabId, nodeId);
    if (state.actionable) return state;
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return { actionable: false, reason: 'Timeout' };
}
```

**Notes:**
- 120s timeout covers AI response workflows (Claude, Copilot)
- Poll interval 100ms (balance responsiveness vs CPU)

---

### CDP-009: DecisionEngine Core
**Priority:** P0 Critical  
**Dependencies:** CDP-005, CDP-006, VIS-015 (parallel)  
**Complexity:** High  
**Status:** 🟡 Blocked by CDP-006, VIS-015

**Description:**
Implement strategy scoring and fallback execution per **ARCHITECTURE_DECISIONS.md Decision 5** (full multi-layer, no degradation).

**Acceptance Criteria:**
- [ ] `src/background/services/DecisionEngine.ts` created
- [ ] evaluateStrategies() scores all 7 strategies in parallel
- [ ] Strategies: DOM, CSS, XPath, CDP Semantic, CDP Power, Vision OCR, Coordinates
- [ ] Returns FallbackChain sorted by confidence
- [ ] NO degradation - all strategies always evaluated

**Implementation:**
```typescript
class DecisionEngine {
  async evaluateStrategies(
    tabId: number,
    step: RecordedStep,
    evidence: EvidenceRecord
  ): Promise<FallbackChain> {
    // Per Decision 5: Evaluate ALL strategies in parallel
    const results = await Promise.all([
      this.tryDOMStrategy(tabId, step),
      this.tryCSSStrategy(tabId, step),
      this.tryXPathStrategy(tabId, step),
      this.tryCDPSemanticStrategy(tabId, evidence),
      this.tryCDPPowerStrategy(tabId, evidence),
      this.tryVisionStrategy(tabId, evidence),
      this.tryCoordinatesStrategy(tabId, step)
    ]);
    
    // Sort by confidence descending
    return results
      .filter(r => r !== null)
      .sort((a, b) => b.confidence - a.confidence);
  }
}
```

**Notes:**
- Per Decision 5: Full multi-layer system, NO degradation
- Recording captures ALL evidence (DOM + CDP + Vision + Coordinates)
- Playback tries ALL strategies in confidence order
- Fixed scoring weights (not user-configurable per Decision 6)

---

### CDP-010: Recording Integration
**Priority:** P1 High  
**Dependencies:** CDP-009  
**Complexity:** High  
**Status:** 🟡 Blocked by CDP-009

**Description:**
Capture CDP evidence during recording.

**Acceptance Criteria:**
- [ ] Recording captures AX tree snapshot
- [ ] Recording captures CDP semantic attributes
- [ ] Evidence stored in EvidenceBuffer
- [ ] Evidence linked to RecordedStep via evidenceBufferId

---

## CATEGORY D: VISION ENGINE (VIS)

### VIS-001: VisionEngine Skeleton
**Priority:** P0 Critical  
**Dependencies:** FND-001, FND-005  
**Complexity:** Medium  
**Status:** 🟢 Ready to Build

**Description:**
Create VisionEngine class wrapper for Tesseract.js per **ARCHITECTURE_DECISIONS.md Decision 1**.

**Acceptance Criteria:**
- [ ] `src/lib/visionEngine.ts` created
- [ ] initialize() loads Tesseract worker
- [ ] terminate() cleans up worker
- [ ] Per Decision 1: initialize() called at recording start (not startup, not lazy)

**Implementation:**
```typescript
class VisionEngine {
  private worker: Tesseract.Worker | null = null;
  
  async initialize(): Promise<void> {
    // Per Decision 1: Called at recording start (~2s load time)
    this.worker = await Tesseract.createWorker('eng');
  }
  
  async terminate(): Promise<void> {
    if (this.worker) await this.worker.terminate();
    this.worker = null;
  }
}
```

**Notes:**
- **Decision 1 Update**: Initialize at recording start (~2s during natural setup moment)
- NOT at extension startup (adds unnecessary 2-3s delay)
- NOT lazily (delays first evidence capture during playback)

---

### VIS-002: Screenshot Capture
**Priority:** P0 Critical  
**Dependencies:** VIS-001  
**Complexity:** Low  
**Status:** 🟡 Blocked by VIS-001

**Description:**
Implement screenshot capture via chrome.tabs.captureVisibleTab.

**Acceptance Criteria:**
- [ ] captureScreen(tabId) returns base64 PNG
- [ ] Handles permission errors gracefully
- [ ] Screenshot quality sufficient for OCR

**Implementation:**
```typescript
async captureScreen(tabId: number): Promise<string> {
  return chrome.tabs.captureVisibleTab(tabId, { format: 'png' });
}
```

**Notes:**
- Updated per **ARCHITECTURE_DECISIONS.md Decision 1**: Initialize Tesseract at recording start
- Evidence capture stores screenshots (50MB browser buffer per Decision 4)

---

### VIS-003 to VIS-015: Vision Implementation
**Priority:** P0-P1 Critical-High  
**Dependencies:** VIS-002, various  
**Complexity:** Medium-High  
**Status:** 🟡 Blocked by VIS-002

**VIS-003: OCR Text Recognition**
- recognizeText(screenshot) runs Tesseract.js
- Returns TextResult[] with coordinates
- Confidence threshold 60% per **Decision 2**

**VIS-004: Text Search**
- findText(screenshot, targetText) finds matching text
- Fuzzy matching for minor variations
- Returns ClickTarget with confidence

**VIS-005: Click Target Computation**
- computeClickTarget(textResult) calculates center coordinates
- Adjusts for scroll position
- Validates target is within viewport

**VIS-006: Coordinate-Based Click**
- clickAtCoordinates(tabId, x, y) dispatches click
- Uses CDP Input.dispatchMouseEvent
- Handles iframes and shadow DOM

**VIS-007: Vision Type**
- typeAtFocus(tabId, text) sends keyboard input
- Ensures element is focused first
- Character-by-character with delays

**VIS-008: Vision Key**
- sendKey(tabId, key) sends keyboard shortcuts
- Supports modifiers (Ctrl, Alt, Shift)
- Handles special keys (Enter, Tab, Escape)

**VIS-009: Vision Scroll**
- scrollToText(tabId, text) scrolls until text visible
- Max retries 3 (per Decision 3 rationale)
- OCR after each scroll

**VIS-010: Conditional Click Loop**
- waitAndClickButtons(tabId, config) polls for approval buttons
- Timeout 120s per **Decision 3**
- OCR-based button detection
- Auto-clicks first high-confidence match

**VIS-011: Dropdown Handler**
- handleDropdown(tabId, optionText) opens dropdown
- Waits for options to appear
- Clicks matching option

**VIS-012: Auto-Detection Failsafe**
- detectApprovalButtons(screenshot) scans for common approval patterns
- Patterns: "Accept", "Approve", "Allow", "Confirm", "Continue"
- Fallback to coordinates if OCR fails

**VIS-013: Evidence Capture**
- captureEvidence(step) captures screenshot + OCR during recording
- Stores in EvidenceBuffer (50MB browser, unlimited native host Phase 3)
- Links evidence to step via evidenceBufferId

**VIS-014: Vision Badge**
- UI component shows Vision strategy was used
- Displays confidence score
- Links to evidence viewer

**VIS-015: Vision Playback Integration**
- Integrates Vision strategies into playback loop
- Falls back to Vision if DOM/CDP fail
- Telemetry logging for strategy attempts

**Notes:**
- Per **Decision 2**: OCR confidence threshold 60% (Tesseract.js recommended)
- Per **Decision 3**: Conditional timeout 120s (covers AI response workflows)
- Per **Decision 4**: Evidence storage 50MB browser + Native Host unlimited (Phase 3)

---

## CATEGORY E: DECISION ENGINE (DEC)

### DEC-001: Strategy Evaluator Interface
**Priority:** P0 Critical  
**Dependencies:** FND-004  
**Complexity:** Medium  
**Status:** 🟢 Ready to Build

**Description:**
Define interface for strategy evaluators.

**Acceptance Criteria:**
- [ ] `src/background/services/strategies/StrategyEvaluator.ts` created
- [ ] evaluate() method signature defined
- [ ] Returns StrategyScore with confidence + metadata

**Implementation:**
```typescript
interface StrategyEvaluator {
  evaluate(
    tabId: number,
    step: RecordedStep,
    evidence: EvidenceRecord
  ): Promise<StrategyScore | null>;
}

interface StrategyScore {
  strategy: StrategyType;
  confidence: number; // 0.0 to 1.0
  locator: LocatorResult;
  metadata?: any;
}
```

---

### DEC-002 to DEC-008: Strategy Evaluators
**Priority:** P1 High  
**Dependencies:** DEC-001, CDP-009, VIS-015  
**Complexity:** High  
**Status:** 🟡 Blocked by CDP-009, VIS-015

**DEC-002: DOMStrategy**
- Existing element finder logic
- 7 fallback strategies (ID, name, placeholder, label, etc.)
- Confidence based on selector specificity

**DEC-003: CSSStrategy**
- CSS selector generation
- Confidence based on selector uniqueness
- nth-child fallback

**DEC-004: XPathStrategy**
- XPath generation from step.xpath
- Confidence based on XPath stability
- Sibling/parent fallbacks

**DEC-005: CDPSemanticStrategy**
- Uses getByRole, getByLabel, getByText
- Confidence 0.85-0.95 (high - semantic locators are robust)
- Requires evidence.axTree

**DEC-006: CDPPowerStrategy**
- Uses CDP DOM.querySelector with advanced selectors
- Confidence 0.70-0.85 (medium-high)
- Handles shadow DOM penetration

**DEC-007: VisionStrategy**
- Uses OCR + text matching
- Confidence based on OCR confidence (60% threshold per **Decision 2**)
- Requires evidence.screenshot

**DEC-008: CoordinatesStrategy**
- Absolute fallback using step.coordinates
- Confidence 0.30 (low - fragile to window resize)
- Only used when all else fails

**Notes:**
- Per **Decision 5**: Full multi-layer system - ALL strategies always evaluated
- Per **Decision 6**: Fixed scoring weights (not user-configurable)
- Recording captures ALL evidence types (DOM + CDP + Vision + Coordinates)
- Playback evaluates ALL strategies in parallel, tries in confidence order

---

## CATEGORY F: INTEGRATION (INT)

### INT-001: Message Router Updates
**Priority:** P0 Critical  
**Dependencies:** FND-011  
**Complexity:** Medium  
**Status:** 🟢 Ready to Build

**Description:**
Add 12 new message action handlers to background.ts.

**Acceptance Criteria:**
- [ ] CDP_ATTACH handler implemented
- [ ] CDP_DETACH handler implemented
- [ ] CDP_COMMAND handler implemented
- [ ] PLAYWRIGHT_LOCATE handler implemented
- [ ] VISION_CLICK handler implemented
- [ ] VISION_TYPE handler implemented
- [ ] VISION_OCR handler implemented
- [ ] VISION_CONDITIONAL_CLICK handler implemented
- [ ] STRATEGY_TELEMETRY handler implemented
- [ ] EVALUATE_STRATEGIES handler implemented
- [ ] GENERATE_FALLBACK_CHAIN handler implemented
- [ ] WAIT_FOR_ACTIONABILITY handler implemented

---

### INT-002 to INT-012: Integration Tasks
**Priority:** P1-P2 High-Medium  
**Dependencies:** Various  
**Complexity:** Medium-High  
**Status:** 🟡 Blocked by dependencies

**INT-002: Recording Flow Integration**
- Integrate evidence capture into recorder
- Initialize VisionEngine at recording start (per **Decision 1**)
- Store evidence in EvidenceBuffer (50MB browser per **Decision 4**)

**INT-003: Playback Flow Integration**
- Integrate DecisionEngine into playback
- Parallel strategy evaluation (Promise.all per **Decision 5**)
- Fallback execution in confidence order

**INT-004: Content Script Updates**
- Add Vision handlers to content.tsx
- CDP message forwarding
- Coordinate-based event dispatch

**INT-005: Telemetry Integration**
- Log strategy attempts
- Log playback metrics
- Aggregate success rates

**INT-006: Evidence Buffer Integration**
- Browser storage (50MB) for Phase 2
- Native Host (unlimited) for Phase 3
- Graceful fallback if Native Host unavailable

**INT-007: Schema Migration Integration**
- Load recordings and apply migration if schemaVersion < 3 (per **Decision 7**)
- No-op if schemaVersion >= 3

**INT-008: Fallback Chain Generation**
- Generate fallback chains during recording
- Store in RecordedStep.fallbackChain
- Use during playback if primary strategy fails

**INT-009: Delay Execution**
- Apply globalDelayMs after each step
- Apply step.delay before specific step
- UI feedback during delays

**INT-010: Loop Start Index**
- Slice steps based on loopStartIndex
- Position-based CSV mapping
- Skip login steps in multi-row playback

**INT-011: Conditional Click**
- Poll for approval buttons
- 120s timeout per **Decision 3**
- Auto-click first match

**INT-012: UI Evidence Viewer**
- View screenshots for Vision steps
- View telemetry logs
- View fallback chains

---

## CATEGORY G: UI COMPONENTS (UI)

### UI-001 to UI-012: UI Implementation
**Priority:** P2 Medium  
**Dependencies:** Various  
**Complexity:** Low-Medium  
**Status:** 🟡 Blocked by dependencies

**UI-001: VisionBadge Component**
- Shows "Vision OCR" badge on step row
- Displays confidence score on hover
- Links to evidence viewer

**UI-002: StrategyIndicator Component**
- Shows which strategy was used (DOM, CDP, Vision, etc.)
- Color-coded by confidence (green=high, yellow=medium, red=low)

**UI-003: DelayControls Component**
- Global delay input in toolbar
- Per-step delay in three-dot menu
- Delay badge on step row

**UI-004: ConditionalClickConfig Component**
- Configure conditional click (button labels, timeout, max attempts)
- Preview approval patterns
- Test button detection

**UI-005: TelemetryPanel Component**
- View strategy attempt logs
- View playback metrics
- Filter by recording/step

**UI-006: FallbackChainView Component**
- View generated fallback chain
- Confidence scores per strategy
- Drag to reorder (future)

**UI-007: LoopStartDropdown Component**
- Select loop start index in toolbar
- Step preview on hover
- Loop start badge on selected step

**UI-008: EvidenceViewer Component**
- View screenshot evidence
- View OCR text results
- View CDP AX tree

**UI-009: Recorder Toolbar Updates**
- Add loop start dropdown
- Add global delay input
- Add static recording toggle

**UI-010: Three-Dot Menu Updates**
- Add "Set Delay"
- Add "Configure Conditional Click"
- Add "View Evidence"
- Add "View Telemetry"

**UI-011: StepRow Badge Integration**
- Integrate VisionBadge
- Integrate StrategyIndicator
- Integrate DelayBadge
- Integrate LoopStartBadge
- Integrate ConditionalBadge

**UI-012: TestRunner Updates**
- Initialize VisionEngine before playback
- Show strategy being attempted
- Show delay countdown
- Show conditional click progress

---

## CATEGORY H: TESTING (TST)

### TST-001 to TST-010: Test Coverage
**Priority:** P1 High  
**Dependencies:** ALL Phase 2  
**Complexity:** Medium-High  
**Status:** 🟡 Blocked by Phase 2 completion

**TST-001: Unit Tests - VisionEngine**
- Test OCR recognition accuracy
- Test text search
- Test click target computation
- Mock Tesseract.js

**TST-002: Unit Tests - DecisionEngine**
- Test strategy evaluation logic
- Test confidence scoring
- Test fallback chain generation
- Mock CDP/Vision APIs

**TST-003: Unit Tests - CDPService**
- Test debugger attach/detach
- Test CDP command execution
- Test error handling
- Mock chrome.debugger

**TST-004: Unit Tests - AutoWaiting**
- Test actionability checks
- Test timeout behavior
- Test polling logic
- Mock CDP responses

**TST-005: Integration Tests - Recording**
- Test evidence capture
- Test EvidenceBuffer storage
- Test VisionEngine initialization (at recording start per **Decision 1**)
- Test schema migration

**TST-006: Integration Tests - Playback**
- Test strategy evaluation order (parallel per **Decision 5**)
- Test fallback execution
- Test telemetry logging
- Test delay execution

**TST-007: E2E Tests - Claude.ai**
- Record login + prompt submission
- Playback with multiple strategies
- Verify conditional click on approval
- Full regression (per **Decision 8**)

**TST-008: E2E Tests - Copilot**
- Record prompt input (DOM should fail)
- Verify Vision fallback triggers
- Playback with Vision strategy
- Full regression (per **Decision 8**)

**TST-009: E2E Tests - All Sites**
- Per **ARCHITECTURE_DECISIONS.md Decision 8**: Full regression on ALL sites
- Claude.ai, Google Forms, Google Maps, GitHub, Copilot
- Document any regressions
- No site should be skipped (tool was recently broken)

**TST-010: Performance Tests**
- Measure OCR latency (expect 500-1000ms)
- Measure strategy evaluation time
- Measure evidence buffer memory usage (50MB limit per **Decision 4**)
- Measure Native Host I/O (Phase 3)

**Notes:**
- Per **Decision 8**: ALL sites must pass full regression
- Tool was recently broken - zero tolerance for regressions
- Test coverage required before production

---

## CATEGORY I (PHASE 3): NATIVE MESSAGING HOST (NMH)

**NOTE:** Phase 3 scope - deferred until Phase 2 complete. Included for completeness.

### NMH-001: Native Host Binary
**Priority:** P3 Future  
**Dependencies:** ALL Phase 2  
**Complexity:** Medium  
**Status:** ⏸️ Deferred to Phase 3

**Description:**
Create Native Messaging Host binary for unlimited evidence storage per **ARCHITECTURE_DECISIONS.md Decision 4**.

**Acceptance Criteria:**
- [ ] Native host binary (Node.js or Rust)
- [ ] JSON message protocol (stdin/stdout)
- [ ] Store/retrieve evidence from local filesystem
- [ ] No size limits (unlimited storage)

**Implementation:**
```typescript
// API Contract (Decision 4)
interface NativeHostAPI {
  storeEvidence(recording: string, evidence: EvidenceRecord): Promise<string>;
  retrieveEvidence(id: string): Promise<EvidenceRecord | null>;
  pruneOldEvidence(beforeTimestamp: number): Promise<void>;
}
```

**Notes:**
- Per **Decision 4**: Hybrid approach (50MB browser + unlimited native host)
- Graceful fallback to browser-only if Native Host unavailable
- Phase 2 uses browser storage only (50MB limit)

---

### NMH-002 to NMH-005: Native Host Implementation
**Priority:** P3 Future  
**Dependencies:** NMH-001  
**Complexity:** Medium  
**Status:** ⏸️ Deferred to Phase 3

**NMH-002: Manifest Registration**
- Register native host in Chrome manifest
- Windows/Mac/Linux registry entries
- Installation script

**NMH-003: Evidence API**
- storeEvidence() saves to local filesystem
- retrieveEvidence() loads from filesystem
- Atomic writes (no corruption)

**NMH-004: Pruning Strategy**
- Auto-prune old evidence
- Configurable retention period
- User-triggered cleanup

**NMH-005: Browser Integration**
- EvidenceBuffer detects Native Host availability
- Falls back to browser storage if unavailable
- Seamless user experience

---

## APPENDIX A: ARCHITECTURE DECISIONS REFERENCE

All build cards reference decisions from **ARCHITECTURE_DECISIONS.md**:

1. **Decision 1: Tesseract Loading** → VIS-001, VIS-002, INT-002, TST-005
2. **Decision 2: OCR Confidence** → VIS-003, DEC-007
3. **Decision 3: Conditional Timeout** → VIS-010, INT-011, CDP-008
4. **Decision 4: Evidence Storage** → INT-006, TST-010, NMH-001 to NMH-005
5. **Decision 5: Strategy Degradation** → CDP-009, DEC-002 to DEC-008, INT-003
6. **Decision 6: Scoring Weights** → DEC-002 to DEC-008
7. **Decision 7: Schema Migration** → DAT-001, DAT-002, INT-007
8. **Decision 8: Test Coverage** → TST-007, TST-008, TST-009

---

## APPENDIX B: BUILD SEQUENCE

**Sequential Dependencies:**
```
FND → DAT → CDP/VIS (parallel) → DEC → INT → UI → TST
```

**Minimum Viable Phase 2:**
```
FND-001 to FND-012 → DAT-001, DAT-002 → CDP-001, CDP-002, CDP-009 → INT-005
```

**Full Phase 2:**
All 87 cards in dependency order.

**Phase 3:**
NMH-001 to NMH-005 (after Phase 2 stable).

---

**END OF BUILD CARD BACKLOG**
