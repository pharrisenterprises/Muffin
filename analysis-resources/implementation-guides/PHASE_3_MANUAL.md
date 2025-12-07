# PHASE 3 MANUAL: Muffin Lite V2 Vision Enhancement + Puppeteer

**Version:** 1.0  
**Generated:** December 6, 2025  
**Project:** Muffin Lite V2.0 Phase 2  
**Purpose:** Organize and plan content generation for all required files

---

## 1. EXECUTIVE SUMMARY

### What This Manual Does
This manual defines the complete content generation plan for Phase 2 Vision Enhancement. It lists every file that needs content, organizes them into generation threads, and provides Smart Prompt templates for Phase 4 code generation.

### Current State Assessment
| Status | Count | Description |
|--------|-------|-------------|
| ✅ Working | 23 | No changes needed |
| ⚠️ Has Errors | 6 | Need fixes |
| ❌ Missing | 33 | Need creation |
| 📝 Modify | 7 | Need additions |
| **TOTAL** | **69** | **46 need content generation** |

### Content Generation Scope
- 46 files require content generation
- Organized into 8 logical sections
- 3 generation threads
- Estimated 12-15 continues total

---

## 2. COMPLETE FILE INVENTORY

### Section A: Content Script Orchestration (7 files)

| ID | File Path | Status | Purpose |
|----|-----------|--------|---------|
| A1 | `src/contentScript/RecordingOrchestrator.ts` | ❌ CREATE | Coordinates all 4 capture layers, generates FallbackChains |
| A2 | `src/contentScript/EvidenceBuffer.ts` | ❌ CREATE | Temporary storage during recording (~70MB → 250KB) |
| A3 | `src/contentScript/layers/DOMCapture.ts` | ❌ CREATE | DOM event capture (clicks, inputs, selects) |
| A4 | `src/contentScript/layers/VisionCapture.ts` | ❌ CREATE | Screenshot + OCR capture for each step |
| A5 | `src/contentScript/layers/MouseCapture.ts` | ❌ CREATE | Mouse trail tracking for evidence scoring |
| A6 | `src/contentScript/layers/NetworkCapture.ts` | ❌ CREATE | Network request capture for context |
| A7 | `src/contentScript/content.tsx` | 📝 MODIFY | Integrate RecordingOrchestrator and layers |

### Section B: Background CDP Services (5 files)

| ID | File Path | Status | Purpose |
|----|-----------|--------|---------|
| B1 | `src/background/services/CDPService.ts` | ⚠️ FIX | Chrome DevTools Protocol attach/detach/sendCommand |
| B2 | `src/background/services/AccessibilityService.ts` | ⚠️ FIX | Accessibility tree access via CDP |
| B3 | `src/background/services/PlaywrightLocators.ts` | ⚠️ FIX | getByRole, getByText, getByLabel, getByTestId |
| B4 | `src/background/services/AutoWaiting.ts` | ⚠️ FIX | Wait for actionable, visible, stable |
| B5 | `src/background/services/VisionService.ts` | ❌ CREATE | Background-side vision operations |

### Section C: Decision Engine (10 files)

| ID | File Path | Status | Purpose |
|----|-----------|--------|---------|
| C1 | `src/background/services/DecisionEngine.ts` | ⚠️ FIX | Core decision engine - parallel scoring |
| C2 | `src/background/services/FallbackChainGenerator.ts` | ❌ CREATE | Build strategy chains at recording time |
| C3 | `src/background/services/TelemetryLogger.ts` | ❌ CREATE | Log strategy attempts/success/failure |
| C4 | `src/background/services/StrategyScorer.ts` | ❌ CREATE | Score strategies with confidence weights |
| C5 | `src/background/services/StrategyChainBuilder.ts` | ❌ CREATE | Build ordered fallback chain from scores |
| C6 | `src/background/services/strategies/StrategyEvaluator.ts` | ❌ CREATE | Interface for all strategy evaluators |
| C7 | `src/background/services/strategies/DOMStrategy.ts` | ❌ CREATE | DOM selector evaluation |
| C8 | `src/background/services/strategies/CDPStrategy.ts` | ❌ CREATE | CDP semantic evaluation |
| C9 | `src/background/services/strategies/VisionStrategy.ts` | ❌ CREATE | Vision OCR evaluation |
| C10 | `src/background/services/strategies/CoordinatesStrategy.ts` | ❌ CREATE | XY coordinates fallback |

### Section D: Library Files (4 files)

| ID | File Path | Status | Purpose |
|----|-----------|--------|---------|
| D1 | `src/lib/visionEngine.ts` | ⚠️ FIX | Tesseract.js integration, OCR, screenshot |
| D2 | `src/lib/migrations/v3.ts` | ❌ CREATE | Schema v1→v3 migration logic |
| D3 | `src/lib/mouseTrailAnalyzer.ts` | ❌ CREATE | Analyze mouse trails for evidence scoring |
| D4 | `src/lib/schemaMigration.ts` | ⚠️ FIX | Add CURRENT_SCHEMA_VERSION export |

### Section E: Existing Files to Modify (5 files)

| ID | File Path | Status | Purpose |
|----|-----------|--------|---------|
| E1 | `src/common/services/indexedDB.ts` | 📝 MODIFY | Extend Step/Project interfaces, schema v3 |
| E2 | `src/background/background.ts` | 📝 MODIFY | Add 15+ message handlers |
| E3 | `src/pages/Recorder.tsx` | 📝 MODIFY | Add badges, delay controls, loop start, export button |
| E4 | `src/pages/TestRunner.tsx` | 📝 MODIFY | Add telemetry, strategy indicators |
| E5 | `public/manifest.json` | 📝 MODIFY | Add debugger permission |

### Section F: Puppeteer Extension Integration (5 files)

| ID | File Path | Status | Purpose |
|----|-----------|--------|---------|
| F1 | `src/lib/puppeteer/PuppeteerConnector.ts` | ❌ CREATE | Bridge to connect via puppeteer-core |
| F2 | `src/lib/puppeteer/ScriptExporter.ts` | ❌ CREATE | Export recording to Puppeteer script |
| F3 | `src/lib/puppeteer/LocatorTranslator.ts` | ❌ CREATE | Map strategies to Puppeteer locators |
| F4 | `src/lib/puppeteer/ExportFormat.ts` | ❌ CREATE | JSON schema for exported recordings |
| F5 | `src/lib/puppeteer/index.ts` | ❌ CREATE | Barrel exports |

### Section G: Puppeteer External Runner (8 files)

| ID | File Path | Status | Purpose |
|----|-----------|--------|---------|
| G1 | `puppeteer-runner/package.json` | ❌ CREATE | Standalone Node.js package definition |
| G2 | `puppeteer-runner/tsconfig.json` | ❌ CREATE | TypeScript configuration |
| G3 | `puppeteer-runner/src/index.ts` | ❌ CREATE | CLI entry point |
| G4 | `puppeteer-runner/src/TestExecutor.ts` | ❌ CREATE | Runs recordings via Puppeteer |
| G5 | `puppeteer-runner/src/RecordingLoader.ts` | ❌ CREATE | Loads exported recordings |
| G6 | `puppeteer-runner/src/StrategyExecutor.ts` | ❌ CREATE | Executes each strategy type |
| G7 | `puppeteer-runner/src/VisionAdapter.ts` | ❌ CREATE | Vision/OCR for Puppeteer |
| G8 | `puppeteer-runner/src/types.ts` | ❌ CREATE | Shared types |

### Section H: Puppeteer UI Components (2 files)

| ID | File Path | Status | Purpose |
|----|-----------|--------|---------|
| H1 | `src/components/export/PuppeteerExportButton.tsx` | ❌ CREATE | "Export to Puppeteer" button |
| H2 | `src/components/export/ExportOptionsDialog.tsx` | ❌ CREATE | Export configuration dialog |

---

## 3. DEPENDENCY GRAPH

```
                    ┌─────────────────────────────────┐
                    │         Types (Working)          │
                    │  strategy.ts, vision.ts, cdp.ts │
                    └───────────────┬─────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            │                       │                       │
            ▼                       ▼                       ▼
┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
│  Content Script   │   │  Background CDP   │   │   Library Files   │
│  Orchestration    │   │    Services       │   │                   │
│  (Section A)      │   │   (Section B)     │   │   (Section D)     │
└─────────┬─────────┘   └─────────┬─────────┘   └─────────┬─────────┘
          │                       │                       │
          └───────────────────────┼───────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────────┐
                    │        Decision Engine          │
                    │         (Section C)             │
                    └───────────────┬─────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            │                       │                       │
            ▼                       ▼                       ▼
┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
│  Existing Files   │   │    Puppeteer      │   │   Puppeteer UI    │
│   to Modify       │   │  External Runner  │   │    Components     │
│  (Section E)      │   │   (Section G)     │   │   (Section H)     │
└───────────────────┘   └───────────────────┘   └───────────────────┘
```

---

## 4. GENERATION THREADS

### Thread 1: Core Infrastructure (16 files)
**Scope:** Sections A + B + C (partial)  
**Focus:** Recording orchestration, CDP services, Decision Engine core  
**Estimated Continues:** 5-6

| Order | ID | File | Priority |
|-------|-----|------|----------|
| 1 | A1 | RecordingOrchestrator.ts | P0 |
| 2 | A2 | EvidenceBuffer.ts | P0 |
| 3 | A3 | DOMCapture.ts | P0 |
| 4 | A4 | VisionCapture.ts | P0 |
| 5 | A5 | MouseCapture.ts | P0 |
| 6 | A6 | NetworkCapture.ts | P1 |
| 7 | B1 | CDPService.ts (FIX) | P0 |
| 8 | B2 | AccessibilityService.ts (FIX) | P0 |
| 9 | B3 | PlaywrightLocators.ts (FIX) | P0 |
| 10 | B4 | AutoWaiting.ts (FIX) | P0 |
| 11 | B5 | VisionService.ts | P0 |
| 12 | C1 | DecisionEngine.ts (FIX) | P0 |
| 13 | C2 | FallbackChainGenerator.ts | P0 |
| 14 | C3 | TelemetryLogger.ts | P1 |
| 15 | C4 | StrategyScorer.ts | P0 |
| 16 | C5 | StrategyChainBuilder.ts | P0 |

### Thread 2: Strategies + Library + Modifications (15 files)
**Scope:** Section C (strategies) + D + E  
**Focus:** Strategy evaluators, library utilities, existing file modifications  
**Estimated Continues:** 4-5

| Order | ID | File | Priority |
|-------|-----|------|----------|
| 1 | C6 | StrategyEvaluator.ts | P0 |
| 2 | C7 | DOMStrategy.ts | P0 |
| 3 | C8 | CDPStrategy.ts | P0 |
| 4 | C9 | VisionStrategy.ts | P0 |
| 5 | C10 | CoordinatesStrategy.ts | P0 |
| 6 | D1 | visionEngine.ts (FIX) | P0 |
| 7 | D2 | migrations/v3.ts | P0 |
| 8 | D3 | mouseTrailAnalyzer.ts | P1 |
| 9 | D4 | schemaMigration.ts (FIX) | P0 |
| 10 | E1 | indexedDB.ts (MODIFY) | P0 |
| 11 | E2 | background.ts (MODIFY) | P0 |
| 12 | E3 | Recorder.tsx (MODIFY) | P0 |
| 13 | E4 | TestRunner.tsx (MODIFY) | P1 |
| 14 | E5 | manifest.json (MODIFY) | P0 |

### Thread 3: Puppeteer Integration (15 files)
**Scope:** Sections F + G + H  
**Focus:** Puppeteer export, external runner, UI components  
**Estimated Continues:** 4-5

| Order | ID | File | Priority |
|-------|-----|------|----------|
| 1 | F1 | PuppeteerConnector.ts | P1 |
| 2 | F2 | ScriptExporter.ts | P1 |
| 3 | F3 | LocatorTranslator.ts | P1 |
| 4 | F4 | ExportFormat.ts | P1 |
| 5 | F5 | puppeteer/index.ts | P1 |
| 6 | G1 | package.json | P1 |
| 7 | G2 | tsconfig.json | P1 |
| 8 | G3 | index.ts (CLI) | P1 |
| 9 | G4 | TestExecutor.ts | P1 |
| 10 | G5 | RecordingLoader.ts | P1 |
| 11 | G6 | StrategyExecutor.ts | P1 |
| 12 | G7 | VisionAdapter.ts | P1 |
| 13 | G8 | types.ts | P1 |
| 14 | H1 | PuppeteerExportButton.tsx | P2 |
| 15 | H2 | ExportOptionsDialog.tsx | P2 |

---

## 5. CONTENT GENERATION FORMAT

Each file's content will be generated using this template:

```
────────────────────────────────────────
FILE: [File Path]
────────────────────────────────────────

## Purpose
[2-3 sentence description of what this file does]

## Dependencies
### Uses (imports from)
- [file]: [what it imports]

### Used By (exports to)
- [file]: [what it exports]

## Interfaces
[Complete TypeScript interface definitions]

## Functions
[Complete function signatures with JSDoc comments]

## Key Implementation Details
[Critical logic, patterns, edge cases]

## Integration Points
[How this connects to other components]

## Acceptance Criteria
- [ ] [Specific testable criterion]
- [ ] [Specific testable criterion]

## Estimated Lines
[Number]
```

---

## 6. CRITICAL INTERFACES REFERENCE

### Core Types (Already Working - Reference Only)

```typescript
// From src/types/strategy.ts
type StrategyType = 
  | 'dom_selector'
  | 'css_selector'
  | 'cdp_semantic'
  | 'cdp_power'
  | 'evidence_scoring'
  | 'vision_ocr'
  | 'coordinates';

type RecordedVia = 'dom' | 'vision' | 'manual';

interface LocatorStrategy {
  type: StrategyType;
  selector?: string;
  confidence: number;
  metadata?: {
    role?: string;
    text?: string;
    label?: string;
    placeholder?: string;
    testId?: string;
    coordinates?: { x: number; y: number };
  };
}

interface FallbackChain {
  strategies: LocatorStrategy[];
  primaryStrategy: StrategyType;
  recordedAt: number;
}
```

```typescript
// From src/types/vision.ts
interface VisionConfig {
  enabled: boolean;
  confidenceThreshold: number; // 0-100, default 60
  pollIntervalMs: number; // default 1000
  language: string; // default 'eng'
}

interface ConditionalConfig {
  enabled: boolean;
  searchTerms: string[];
  timeoutSeconds: number; // default 120
  pollIntervalMs: number; // default 1000
  interactionType: 'click' | 'type' | 'dropdown';
}
```

```typescript
// From src/types/cdp.ts
interface CDPNode {
  nodeId: number;
  backendNodeId: number;
  nodeType: number;
  nodeName: string;
  localName: string;
  nodeValue: string;
  attributes?: string[];
}

interface AXNode {
  nodeId: string;
  role: { type: string; value: string };
  name?: { type: string; value: string };
  description?: { type: string; value: string };
  value?: { type: string; value: string };
  properties?: AXProperty[];
  backendDOMNodeId: number;
}

interface LocatorResult {
  found: boolean;
  element?: Element;
  cdpNode?: CDPNode;
  axNode?: AXNode;
  confidence: number;
  duration: number;
}

interface WaitOptions {
  timeout?: number; // Default 30000
  visible?: boolean; // Default true
  enabled?: boolean; // Default true
  stable?: boolean; // Default true
}
```

---

## 7. MESSAGE HANDLERS REFERENCE

### New Message Actions Required for background.ts

| Action | Handler Purpose | Section |
|--------|-----------------|---------|
| `CDP_ATTACH` | Attach chrome.debugger to tab | B |
| `CDP_DETACH` | Detach chrome.debugger | B |
| `CDP_COMMAND` | Send CDP command | B |
| `PLAYWRIGHT_LOCATE` | Find element via Playwright locator | B |
| `VISION_CLICK` | Click via OCR | B |
| `VISION_TYPE` | Type via OCR | B |
| `VISION_OCR` | Extract text via OCR | B |
| `VISION_CONDITIONAL_CLICK` | Polling click with OCR | B |
| `STRATEGY_TELEMETRY` | Log strategy usage | C |
| `GENERATE_FALLBACK_CHAIN` | Build chain at recording | C |
| `EVALUATE_STRATEGIES` | Score all strategies | C |
| `WAIT_FOR_ACTIONABILITY` | Auto-wait checks | B |
| `START_RECORDING_V2` | Start multi-layer recording | A |
| `STOP_RECORDING_V2` | Stop and return evidence | A |
| `EXPORT_PUPPETEER` | Generate Puppeteer script | F |

---

## 8. ARCHITECTURE DECISIONS (Must Follow)

These 8 decisions are FINAL and must be followed:

| # | Decision | Choice |
|---|----------|--------|
| 1 | Tesseract Loading | At Recording Start (~2s during setup) |
| 2 | OCR Confidence Threshold | 60% |
| 3 | Conditional Click Timeout | 120 seconds |
| 4 | Evidence Storage | 50MB browser + Native Host (Phase 3) |
| 5 | Strategy Degradation | NONE - Full 7-tier always evaluated |
| 6 | Scoring Weights | Fixed (not user-configurable) |
| 7 | Schema Migration | Lazy on load |
| 8 | Test Coverage | ALL sites - full regression required |

### Strategy Confidence Weights (Fixed)

```typescript
const STRATEGY_WEIGHTS = {
  cdp_semantic: 0.95,    // Highest priority when available
  cdp_power: 0.90,
  dom_selector: 0.85,
  evidence_scoring: 0.80,
  css_selector: 0.75,
  vision_ocr: 0.70,
  coordinates: 0.60      // Last resort
};
```

---

## 9. PUPPETEER STRATEGY MAPPING

| Muffin Strategy | Puppeteer Equivalent | Confidence |
|-----------------|---------------------|------------|
| `dom_selector` | `page.$('#id')`, `page.$('.class')` | 0.85 |
| `css_selector` | `page.$(selector)` | 0.75 |
| `cdp_semantic` | `page.getByRole('button', { name: 'X' })` | 0.95 |
| `cdp_power` | `page.getByText()`, `page.getByLabel()` | 0.90 |
| `evidence_scoring` | Custom: analyze DOM + coordinates | 0.80 |
| `vision_ocr` | `page.screenshot()` + Tesseract.js | 0.70-0.90 |
| `coordinates` | `page.mouse.click(x, y)` | 0.60 |

---

## 10. PUPPETEER RUNNER ARCHITECTURE

```
puppeteer-runner/
├── package.json           # Dependencies: puppeteer, tesseract.js, commander
├── tsconfig.json          # TypeScript config
├── src/
│   ├── index.ts           # CLI: muffin-run <recording.json> [options]
│   ├── TestExecutor.ts    # Main execution loop
│   ├── RecordingLoader.ts # Parse exported JSON
│   ├── StrategyExecutor.ts # Execute each strategy type
│   ├── VisionAdapter.ts   # Tesseract integration for Puppeteer
│   └── types.ts           # Shared type definitions
└── README.md              # Usage documentation
```

### CLI Usage

```bash
# Install
npm install -g @muffin/puppeteer-runner

# Run recording
muffin-run recording.json --headless --timeout 30000

# Run with CSV data
muffin-run recording.json --csv data.csv --loop-start 3

# Generate report
muffin-run recording.json --report results.json
```

---

## 11. CONTENT GENERATION EXECUTION

### Pre-Generation Checklist

- [ ] This manual uploaded to Claude Knowledge Base
- [ ] Start NEW Claude thread for content generation
- [ ] Have Copilot ready in VS Code

### Generation Prompt (Paste in NEW Thread)

```
You are now executing Phase 3 Content Generation.

Read PHASE_3_MANUAL.md from your Knowledge Base.

Your task: Generate detailed content for each file listed in the manual.

Rules:
1. Generate content for 3-4 files per "continue"
2. Use the content format from Section 5
3. Follow dependency order from Section 4
4. Include complete interface definitions
5. Include complete function signatures
6. Include implementation details for complex logic
7. Do NOT write actual code - this is content specification

Start with Thread 1, files A1-A4.

Say "ready" and I will say "continue" to begin.
```

### Expected Workflow

1. Claude says "ready"
2. You say "continue"
3. Claude outputs content for 3-4 files
4. Repeat until all 46 files complete
5. Download complete content document
6. Upload to Claude KB for Phase 4

---

## 12. ACCEPTANCE CRITERIA SUMMARY

### Thread 1 Complete When:
- [ ] All 6 orchestration files have content
- [ ] All 5 CDP service files have content (including fixes)
- [ ] All 5 core Decision Engine files have content

### Thread 2 Complete When:
- [ ] All 5 strategy evaluator files have content
- [ ] All 4 library files have content (including fixes)
- [ ] All 5 modification files have content

### Thread 3 Complete When:
- [ ] All 5 Puppeteer extension files have content
- [ ] All 8 Puppeteer runner files have content
- [ ] All 2 Puppeteer UI files have content

### Phase 3 Complete When:
- [ ] All 46 files have content specifications
- [ ] Content document downloaded
- [ ] Content document uploaded to Claude KB
- [ ] Ready for Phase 4 code generation

---

## 13. APPENDIX: FILES NOT REQUIRING CONTENT

These 23 files are working correctly and need no changes:

```
src/types/strategy.ts ✅
src/types/vision.ts ✅
src/types/cdp.ts ✅
src/types/index.ts ✅
src/lib/repositories/telemetryRepository.ts ✅
src/lib/repositories/evidenceRepository.ts ✅
src/lib/repositories/index.ts ✅
src/lib/factories/defaultValues.ts ✅
src/lib/factories/index.ts ✅
src/lib/validation/stepValidator.ts ✅
src/lib/validation/index.ts ✅
src/lib/csvPositionMapping.ts ✅
src/components/recorder/VisionBadge.tsx ✅
src/components/recorder/StrategyIndicator.tsx ✅
src/components/recorder/DelayControls.tsx ✅
src/components/recorder/DelayBadge.tsx ✅
src/components/recorder/LoopStartBadge.tsx ✅
src/components/recorder/ConditionalBadge.tsx ✅
src/components/recorder/ConditionalClickConfig.tsx ✅
src/components/recorder/TelemetryPanel.tsx ✅
src/components/recorder/FallbackChainView.tsx ✅
src/components/recorder/index.ts ✅
src/lib/schemaMigration.ts ✅ (needs minor fix only)
```

---

## 14. APPENDIX: 7-TIER TOOL ARSENAL

The Decision Engine evaluates ALL strategies in parallel (not hierarchically):

| Tier | Strategy | Speed Target | Best For |
|------|----------|--------------|----------|
| 1 | DOM Selector | <10ms | Standard elements with stable IDs/classes |
| 2 | CSS Selector | <15ms | Elements with reliable CSS paths |
| 3 | CDP Semantic (getByRole) | <50ms | Accessible elements (buttons, links, inputs) |
| 4 | CDP Power (getByText/Label) | <100ms | Elements identifiable by visible text |
| 5 | Evidence Scoring | <500ms | Changed DOM, uses mouse trail + attributes |
| 6 | Vision (OCR) | <2000ms | Canvas/shadow DOM, inaccessible elements |
| 7 | Coordinates | <5ms | Last resort, brittle but guaranteed |

**Key Principle:** Fast strategies are *preferred* but not *required*. If Vision has 95% confidence and DOM has 40%, Vision wins.

---

## 15. APPENDIX: RECORDING FLOW

```
USER CLICKS "RECORD"
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│              RECORDING ORCHESTRATOR                      │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Start All Layers in Parallel:                   │    │
│  │  ├─ Layer A (DOM): DOMCapture.start()          │    │
│  │  ├─ Layer B (Vision): VisionCapture.start()    │    │
│  │  ├─ Layer C (Mouse): MouseCapture.start()      │    │
│  │  └─ Layer D (Network): NetworkCapture.start()  │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
        │
        ▼
USER PERFORMS ACTION (click, type, select)
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│  PARALLEL CAPTURE                                        │
│  ├─ DOMCapture: selector, xpath, attributes             │
│  ├─ VisionCapture: screenshot, OCR text                 │
│  ├─ MouseCapture: trail coordinates                     │
│  └─ NetworkCapture: recent requests                     │
└─────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│  FALLBACK CHAIN GENERATOR                                │
│  ├─ Score each strategy                                  │
│  ├─ Sort by confidence                                   │
│  └─ Build ordered chain                                  │
└─────────────────────────────────────────────────────────┘
        │
        ▼
STORE IN EVIDENCE BUFFER → DISPLAY IN RECORDER UI
```

---

## 16. APPENDIX: PLAYBACK FLOW

```
USER CLICKS "PLAY"
        │
        ▼
LOAD RECORDING FROM INDEXEDDB
        │
        ▼
FOR EACH STEP:
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│              DECISION ENGINE                             │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Evaluate ALL strategies in parallel:            │    │
│  │  ├─ DOMStrategy.evaluate()                      │    │
│  │  ├─ CDPStrategy.evaluate()                      │    │
│  │  ├─ VisionStrategy.evaluate()                   │    │
│  │  └─ CoordinatesStrategy.evaluate()              │    │
│  └─────────────────────────────────────────────────┘    │
│                         │                                │
│                         ▼                                │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Sort by confidence, try highest first           │    │
│  │  ├─ Success? → Log telemetry → Next step       │    │
│  │  └─ Failure? → Try next strategy               │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
        │
        ▼
ALL STEPS COMPLETE → SHOW RESULTS
```

---

**END OF PHASE 3 MANUAL**

---

## NEXT STEPS

1. **Download this manual** using the link below
2. **Upload to Claude Knowledge Base**
3. **Start NEW Claude thread**
4. **Paste the Generation Prompt from Section 11**
5. **Say "continue"** to begin content generation

The content generation phase will produce detailed specifications for all 46 files, which you then use in Phase 4 for code generation via Smart Prompts to Copilot.
