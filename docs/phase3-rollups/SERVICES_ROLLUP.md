# Phase 3 Background Services Rollup

**Generated:** December 7, 2025  
**Included Specs:** B1-B5, C1-C5, G1, H1 (12 specifications)  
**Purpose:** Complete background service layer including CDP services, decision engine, action execution, and service integration

---

## Table of Contents

### CDP Services (B1-B5)
- [B1: CDPService](#b1-cdpservice) - Chrome Debugger Protocol wrapper
- [B2: AccessibilityService](#b2-accessibilityservice) - Accessibility tree access
- [B3: PlaywrightLocators](#b3-playwrightlocators) - Playwright-style locators
- [B4: AutoWaiting](#b4-autowaiting) - Auto-waiting for actionability
- [B5: VisionService](#b5-visionservice) - Vision OCR service

### Decision Engine (C1-C5)
- [C1: DecisionEngine](#c1-decisionengine) - Strategy selection and execution
- [C2: FallbackChainGenerator](#c2-fallbackchaingenerator) - Chain generation orchestration
- [C3: StrategyScorer](#c3-strategyscorer) - Confidence scoring algorithm
- [C4: StrategyChainBuilder](#c4-strategychainbuilder) - Chain construction logic
- [C5: TelemetryLogger](#c5-telemetrylogger) - Telemetry and metrics

### Action Execution & Integration
- [G1: ActionExecutor](#g1-actionexecutor) - CDP input dispatch
- [H1: Services Index](#h1-services-index) - Service exports

---

## B1: CDPService
**File:** `src/background/services/CDPService.ts`  
**Status:** CREATE  
**Priority:** P0

### Purpose
Chrome Debugger Protocol wrapper service. Manages debugger attachment/detachment, command execution, event subscriptions, and connection lifecycle. Central gateway for all CDP operations.

### Key Responsibilities
- Attach/detach debugger to tabs
- Execute CDP commands with type safety
- Subscribe to CDP events (DOM, network, etc.)
- Manage connection state and error recovery
- Handle multi-tab scenarios

### Core Methods
```typescript
class CDPService {
  async attach(tabId: number): Promise<boolean>
  async detach(tabId: number): Promise<void>
  async sendCommand<T>(tabId: number, method: string, params?: object): Promise<T>
  addEventListener(tabId: number, event: string, handler: Function): void
  removeEventListener(tabId: number, event: string, handler: Function): void
}
```

### Dependencies
- **Uses:** CDPConnection, CDPCommandResult (E2)
- **Used By:** AccessibilityService, PlaywrightLocators, AutoWaiting, strategy evaluators

---

## B2: AccessibilityService
**File:** `src/background/services/AccessibilityService.ts`  
**Status:** CREATE  
**Priority:** P0

### Purpose
Accessibility tree querying service. Uses CDP's Accessibility domain to extract semantic information (roles, names, labels) for generating high-confidence Playwright-style locators.

### Key Responsibilities
- Query accessibility tree for tab
- Extract role, name, label from AX nodes
- Map DOM nodes to AX nodes
- Build semantic locator candidates
- Cache AX tree for performance

### Core Methods
```typescript
class AccessibilityService {
  async getAXTree(tabId: number): Promise<AXNode[]>
  async getAXNodeForDOMNode(tabId: number, nodeId: number): Promise<AXNode | null>
  async findByRole(tabId: number, role: string, name?: string): Promise<AXNode[]>
  extractSemanticInfo(axNode: AXNode): SemanticInfo
}
```

### CDP Commands Used
- `Accessibility.getFullAXTree` - Get complete accessibility tree
- `Accessibility.queryAXTree` - Query specific nodes

### Dependencies
- **Uses:** CDPService (B1), AXNode types (E2)
- **Used By:** PlaywrightLocators (B3), CDPStrategy (D2)

---

## B3: PlaywrightLocators
**File:** `src/background/services/PlaywrightLocators.ts`  
**Status:** CREATE  
**Priority:** P0

### Purpose
Generates Playwright-style semantic locators (getByRole, getByText, getByLabel, getByPlaceholder). Uses AccessibilityService to build high-confidence CDP-based strategies.

### Key Responsibilities
- Generate getByRole(role, { name }) locators
- Generate getByText, getByLabel, getByPlaceholder
- Rank locator quality by specificity
- Test locator uniqueness
- Build cdp_semantic and cdp_power strategies

### Locator Types
```typescript
// cdp_semantic (Priority 1 - 0.95 confidence)
getByRole('button', { name: 'Submit' })
getByRole('textbox', { name: 'Email' })

// cdp_power (Priority 2 - 0.90 confidence)
getByText('Click here')
getByLabel('Username')
getByPlaceholder('Enter email')
```

### Core Methods
```typescript
class PlaywrightLocators {
  async generateForNode(tabId: number, nodeId: number): Promise<LocatorStrategy[]>
  async testLocator(tabId: number, locator: string): Promise<boolean>
  rankLocators(locators: LocatorStrategy[]): LocatorStrategy[]
}
```

### Dependencies
- **Uses:** AccessibilityService (B2), CDPService (B1)
- **Used By:** FallbackChainGenerator (C2), CDPStrategy (D2)

---

## B4: AutoWaiting
**File:** `src/background/services/AutoWaiting.ts`  
**Status:** CREATE  
**Priority:** P0

### Purpose
Playwright-inspired auto-waiting for element actionability. Waits for elements to be visible, enabled, stable (not moving), and in viewport before actions. Prevents flaky tests.

### Actionability Checks
1. **Attached** - Element exists in DOM
2. **Visible** - Not `display:none` or `visibility:hidden`
3. **Stable** - Bounding box hasn't changed for 100ms
4. **Enabled** - Not disabled or readonly
5. **In Viewport** - At least partially visible

### Core Methods
```typescript
class AutoWaiting {
  async waitForActionable(tabId: number, nodeId: number, timeout = 5000): Promise<boolean>
  async isVisible(tabId: number, nodeId: number): Promise<boolean>
  async isStable(tabId: number, nodeId: number): Promise<boolean>
  async isEnabled(tabId: number, nodeId: number): Promise<boolean>
}
```

### Dependencies
- **Uses:** CDPService (B1), BoxModel types (E2)
- **Used By:** ActionExecutor (G1), DecisionEngine (C1)

---

## B5: VisionService
**File:** `src/background/services/VisionService.ts`  
**Status:** CREATE  
**Priority:** P0

### Purpose
Tesseract.js OCR integration service. Captures screenshots via CDP, performs OCR, extracts text, and builds vision_ocr strategies. Runs in background context.

### Key Responsibilities
- Initialize Tesseract.js worker
- Capture screenshots via CDP Page.captureScreenshot
- Perform OCR on full page or regions
- Extract text with confidence scores and bounding boxes
- Build vision_ocr strategies from OCR results
- Cache OCR results for performance

### Core Methods
```typescript
class VisionService {
  async initialize(): Promise<void>
  async captureScreenshot(tabId: number): Promise<string>
  async performOCR(imageData: string, region?: VisionRegion): Promise<OCRResult[]>
  async findTextMatch(results: OCRResult[], targetText: string): Promise<VisionMatch | null>
  async terminate(): Promise<void>
}
```

### Dependencies
- **Uses:** CDPService (B1), VisionConfig, OCRResult (E4)
- **Used By:** VisionCapture (A4), VisionStrategy (D3)

---

## C1: DecisionEngine
**File:** `src/background/services/DecisionEngine.ts`  
**Status:** CREATE  
**Priority:** P0

### Purpose
Core playback engine that executes FallbackChains during test runs. Attempts strategies in priority order, falls back on failures, logs telemetry, and returns final result.

### Execution Flow
1. Load FallbackChain for step
2. Attempt first strategy (highest confidence)
3. If success → log telemetry, return success
4. If failure → try next strategy
5. Repeat until success or all strategies exhausted
6. Return final result with telemetry

### Confidence Weights
```typescript
const STRATEGY_WEIGHTS = {
  cdp_semantic: 0.95,      // Highest confidence
  cdp_power: 0.90,
  dom_selector: 0.85,
  evidence_scoring: 0.80,
  css_selector: 0.75,
  vision_ocr: 0.70,
  coordinates: 0.60        // Last resort
};
```

### Core Methods
```typescript
class DecisionEngine {
  async executeStep(step: TestStep, context: ExecutionContext): Promise<ExecutionResult>
  async tryStrategy(strategy: LocatorStrategy, action: Action): Promise<StrategyResult>
  selectNextStrategy(chain: FallbackChain, attempted: StrategyType[]): LocatorStrategy | null
}
```

### Dependencies
- **Uses:** FallbackChain, StrategyType (E1), TelemetryLogger (C5)
- **Used By:** TestOrchestrator, TestRunner UI

---

## C2: FallbackChainGenerator
**File:** `src/background/services/FallbackChainGenerator.ts`  
**Status:** CREATE  
**Priority:** P0

### Purpose
Orchestrates generation of FallbackChains during recording. Collects evidence from all 4 capture layers, runs all 5 strategy evaluators, scores candidates, builds diversity-optimized chains.

### Generation Process
1. Receive BufferedAction from EvidenceBuffer
2. Run DOMStrategy → extract dom_selector, css_selector
3. Run CDPStrategy → extract cdp_semantic, cdp_power
4. Run EvidenceScoring → extract evidence_scoring
5. Run VisionStrategy → extract vision_ocr
6. Run CoordinatesStrategy → extract coordinates
7. Score all candidates (StrategyScorer)
8. Build chain (StrategyChainBuilder)
9. Return FallbackChain (5-7 strategies)

### Core Methods
```typescript
class FallbackChainGenerator {
  async generateChain(action: BufferedAction, context: GenerationContext): Promise<FallbackChain>
  async runAllEvaluators(action: BufferedAction): Promise<StrategyCandidate[]>
  filterAndRank(candidates: StrategyCandidate[]): StrategyCandidate[]
}
```

### Dependencies
- **Uses:** All strategy evaluators (D1-D5), StrategyScorer (C3), StrategyChainBuilder (C4)
- **Used By:** RecordingOrchestrator (A1), background service worker (F3)

---

## C3: StrategyScorer
**File:** `src/background/services/StrategyScorer.ts`  
**Status:** CREATE  
**Priority:** P0

### Purpose
Assigns confidence scores to strategy candidates during chain generation. Considers evidence quality, selector specificity, uniqueness, and strategy category.

### Scoring Factors
1. **Base Confidence** - Strategy type weight (0.60-0.95)
2. **Evidence Quality** - Quality of capture data
3. **Selector Specificity** - ID > data-testid > role > class > tag
4. **Uniqueness** - Does selector match single element?
5. **Stability** - Is selector brittle or resilient?

### Scoring Algorithm
```typescript
score = baseWeight * evidenceQuality * specificityBonus * uniquenessBonus
```

### Core Methods
```typescript
class StrategyScorer {
  scoreCandidate(candidate: StrategyCandidate, evidence: Evidence): number
  calculateEvidenceQuality(candidate: StrategyCandidate): number
  calculateSpecificity(selector: string): number
  testUniqueness(selector: string, context: DOMContext): boolean
}
```

### Dependencies
- **Uses:** StrategyCandidate, StrategyType (E1)
- **Used By:** FallbackChainGenerator (C2)

---

## C4: StrategyChainBuilder
**File:** `src/background/services/StrategyChainBuilder.ts`  
**Status:** CREATE  
**Priority:** P0

### Purpose
Builds optimized FallbackChains from scored candidates. Selects 5-7 strategies ensuring diversity across categories, good confidence distribution, and fallback coverage.

### Chain Optimization Goals
1. **Coverage** - At least one strategy from each category (semantic, dom, vision, coordinates)
2. **Diversity** - Avoid redundant similar strategies
3. **Confidence Distribution** - Good spread from high to low confidence
4. **Length** - 5-7 strategies (not too short, not too long)

### Selection Algorithm
1. Start with highest-confidence strategy
2. Add next-best strategy if different category
3. Continue until 5-7 strategies or candidates exhausted
4. Ensure at least: 1 semantic, 1 dom, 1 vision, 1 coordinates

### Core Methods
```typescript
class StrategyChainBuilder {
  buildChain(candidates: StrategyCandidate[]): FallbackChain
  selectDiverseStrategies(candidates: StrategyCandidate[]): LocatorStrategy[]
  validateChain(chain: FallbackChain): boolean
}
```

### Dependencies
- **Uses:** FallbackChain, LocatorStrategy, StrategyType (E1)
- **Used By:** FallbackChainGenerator (C2)

---

## C5: TelemetryLogger
**File:** `src/background/services/TelemetryLogger.ts`  
**Status:** CREATE  
**Priority:** P0

### Purpose
IndexedDB-based telemetry logging for strategy execution metrics, recording sessions, playback runs, and performance data. Enables analytics and system optimization.

### Logged Events
- Strategy execution (type, success, duration, confidence)
- Recording sessions (duration, action count, layer stats)
- Playback runs (success rate, fallback usage, errors)
- Performance metrics (chain generation time, OCR time, etc.)

### Core Methods
```typescript
class TelemetryLogger {
  async logStrategyExecution(telemetry: StrategyTelemetry): Promise<void>
  async logRecordingSession(telemetry: RecordingTelemetry): Promise<void>
  async logPlaybackRun(telemetry: PlaybackTelemetry): Promise<void>
  async getMetrics(filters: MetricsFilter): Promise<Metrics>
  async clearOldEvents(beforeTimestamp: number): Promise<void>
}
```

### Storage Schema
```typescript
// IndexedDB table: telemetry_events
interface TelemetryEvent {
  id: string;
  timestamp: number;
  eventType: string;
  data: StrategyTelemetry | RecordingTelemetry | PlaybackTelemetry;
}
```

### Dependencies
- **Uses:** TelemetryEvent, StrategyTelemetry (E5), Dexie.js
- **Used By:** DecisionEngine (C1), RecordingOrchestrator (A1), TestOrchestrator

---

## G1: ActionExecutor
**File:** `src/background/services/ActionExecutor.ts`  
**Status:** CREATE  
**Priority:** P0

### Purpose
CDP-based action execution service. Dispatches mouse clicks, keyboard input, and other actions using Chrome DevTools Protocol. Works with DecisionEngine to execute strategies.

### Supported Actions
- Click (mouse down + up)
- Type (keyboard events)
- Select (dropdown selection)
- Hover (mouse move)
- Scroll (scroll into view)

### Execution Flow
1. Wait for element actionability (AutoWaiting)
2. Scroll element into viewport if needed
3. Dispatch CDP Input.dispatchMouseEvent or Input.dispatchKeyEvent
4. Wait for action completion
5. Return success/failure

### Core Methods
```typescript
class ActionExecutor {
  async click(tabId: number, nodeId: number): Promise<boolean>
  async type(tabId: number, nodeId: number, text: string): Promise<boolean>
  async select(tabId: number, nodeId: number, value: string): Promise<boolean>
  async scrollIntoView(tabId: number, nodeId: number): Promise<void>
}
```

### Dependencies
- **Uses:** CDPService (B1), AutoWaiting (B4), CDPInputEvent (E2)
- **Used By:** DecisionEngine (C1)

---

## H1: Services Index
**File:** `src/background/services/index.ts`  
**Status:** CREATE  
**Priority:** P0

### Purpose
Central export file for all background services. Provides single import point for CDP services, decision engine, strategy evaluators, and utilities.

### Implementation
```typescript
/**
 * ============================================================================
 * BACKGROUND SERVICES EXPORTS
 * ============================================================================
 */

// CDP Services
export { CDPService } from './CDPService';
export { AccessibilityService } from './AccessibilityService';
export { PlaywrightLocators } from './PlaywrightLocators';
export { AutoWaiting } from './AutoWaiting';
export { VisionService } from './VisionService';

// Decision Engine
export { DecisionEngine } from './DecisionEngine';
export { FallbackChainGenerator } from './FallbackChainGenerator';
export { StrategyScorer } from './StrategyScorer';
export { StrategyChainBuilder } from './StrategyChainBuilder';
export { TelemetryLogger } from './TelemetryLogger';

// Action Execution
export { ActionExecutor } from './ActionExecutor';

// Strategy Evaluators (re-export from strategies/)
export * from './strategies';
```

### Dependencies
- **Exports To:** background.ts, TestOrchestrator, all background consumers

---

## Service Architecture

### Service Layers

```
┌─────────────────────────────────────────┐
│   Decision Engine Layer (C1-C5)        │
│   - DecisionEngine                      │
│   - FallbackChainGenerator              │
│   - StrategyScorer                      │
│   - StrategyChainBuilder                │
│   - TelemetryLogger                     │
└────────────────┬────────────────────────┘
                 │
┌────────────────┴────────────────────────┐
│   CDP Services Layer (B1-B5)           │
│   - CDPService                          │
│   - AccessibilityService                │
│   - PlaywrightLocators                  │
│   - AutoWaiting                         │
│   - VisionService                       │
└────────────────┬────────────────────────┘
                 │
┌────────────────┴────────────────────────┐
│   Action Execution Layer (G1)          │
│   - ActionExecutor                      │
└─────────────────────────────────────────┘
```

### Service Dependencies

**CDPService (B1)** → Foundation for all CDP operations
└─> AccessibilityService (B2)
└─> PlaywrightLocators (B3)
└─> AutoWaiting (B4)
└─> VisionService (B5)

**FallbackChainGenerator (C2)** → Orchestrates chain generation
├─> PlaywrightLocators (B3)
├─> All Strategy Evaluators (D1-D5)
├─> StrategyScorer (C3)
└─> StrategyChainBuilder (C4)

**DecisionEngine (C1)** → Orchestrates playback
├─> ActionExecutor (G1)
├─> AutoWaiting (B4)
└─> TelemetryLogger (C5)

---

## Implementation Order

### Week 2: CDP Foundation
1. **B1** - CDPService (foundation)
2. **B2** - AccessibilityService
3. **B3** - PlaywrightLocators
4. **B4** - AutoWaiting
5. **B5** - VisionService

**Verification:** CDP attaches to tab, queries DOM

### Week 3: Chain Generation
6. **C3** - StrategyScorer
7. **C4** - StrategyChainBuilder
8. **C2** - FallbackChainGenerator (after D1-D5)

### Week 4: Execution & Telemetry
9. **G1** - ActionExecutor
10. **C5** - TelemetryLogger
11. **C1** - DecisionEngine
12. **H1** - Services index

**Verification:** Execute full playback with fallback and telemetry

---

## Success Criteria

- [ ] All 12 service files created in `src/background/services/`
- [ ] CDP debugger attaches/detaches successfully
- [ ] Accessibility tree queries work
- [ ] Playwright locators generate correctly
- [ ] Auto-waiting prevents flaky actions
- [ ] Vision OCR extracts text
- [ ] Chain generation produces 5-7 strategies
- [ ] Decision engine executes chains with fallback
- [ ] Telemetry logs to IndexedDB
- [ ] Action executor dispatches CDP events
- [ ] H1 exports all services

---

**Status:** Ready for implementation  
**Next Step:** Implement B1-B5 (CDP foundation), then C1-C5 (decision engine)
