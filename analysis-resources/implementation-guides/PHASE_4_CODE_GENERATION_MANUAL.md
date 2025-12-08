# PHASE_4_CODE_GENERATION_MANUAL.md

**Version:** 1.0  
**Generated:** December 7, 2025  
**Project:** Muffin Chrome Extension  
**Scope:** Multi-Layer Recording + 7-Tier Fallback Strategy System

---

## Table of Contents

1. [Overview](#1-overview)
2. [Implementation Order](#2-implementation-order)
3. [Implementation Details](#3-implementation-details)
4. [Smart Prompt Templates](#4-smart-prompt-templates)
5. [Code Standards](#5-code-standards)
6. [Testing Requirements](#6-testing-requirements)
7. [Integration Checkpoints](#7-integration-checkpoints)
8. [Troubleshooting](#8-troubleshooting)

---

# 1. Overview

## 1.1 What We're Building

Phase 4 implements 46 specifications across 6 weeks:

| Category | New Files | Modified Files | Est. Lines |
|----------|-----------|----------------|------------|
| Types (E) | 6 | 0 | ~2,000 |
| CDP Services (B) | 5 | 0 | ~1,800 |
| Decision Engine (C) | 5 | 0 | ~1,800 |
| Strategies (D) | 5 | 0 | ~1,500 |
| Recording (A) | 7 | 1 | ~2,500 |
| UI (F, G, H) | 14 | 7 | ~4,000 |
| **TOTAL** | **42** | **8** | **~13,600** |

## 1.2 Architecture Summary

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          RECORDING FLOW                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  User Action → content.tsx (A7) → RecordingOrchestrator (A1)            │
│                                           │                              │
│                    ┌──────────────────────┼──────────────────────┐       │
│                    ▼                      ▼                      ▼       │
│              DOMCapture (A3)      VisionCapture (A4)     MouseCapture   │
│                    │                      │               (A5)  │       │
│                    └──────────────────────┼──────────────────────┘       │
│                                           ▼                              │
│                                   EvidenceBuffer (A2)                    │
│                                           │                              │
│                                           ▼                              │
│                              FallbackChainGenerator (C2)                 │
│                                           │                              │
│                                           ▼                              │
│                                      Storage                             │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                          PLAYBACK FLOW                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  TestRunner (F1) → background.ts (F3) → DecisionEngine (C1)             │
│                                              │                           │
│                    ┌─────────────────────────┼─────────────────────┐     │
│                    ▼                         ▼                     ▼     │
│              CDPStrategy (D2)        VisionStrategy (D3)    DOMStrategy │
│                    │                         │                (D1) │    │
│                    └─────────────────────────┼─────────────────────┘     │
│                                              ▼                           │
│                                      ActionExecutor (G1)                 │
│                                              │                           │
│                                              ▼                           │
│                                      TelemetryLogger (C5)                │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## 1.3 Key Principles

1. **Specs are source of truth** - Each spec file contains complete implementation details
2. **Types first** - Always implement types before services that use them
3. **Dependency order** - Follow the critical path exactly
4. **Test alongside** - Write tests as you implement, not after
5. **Integrate incrementally** - Verify each component before moving on

---

# 2. Implementation Order

## 2.1 Critical Path

```
Week 1: Foundation (No Dependencies)
├── E1: types/strategy.ts
├── E2: types/cdp.ts
├── E3: types/recording.ts
├── E4: types/vision.ts
├── E5: types/telemetry.ts
├── H2: types/index.ts
├── G2: manifest.json [MODIFY]
├── G3: package.json [MODIFY]
├── G4: vite.config.ts [MODIFY]
└── G5: tsconfig.json [MODIFY]

Week 2: CDP Services (Depends on E1, E2)
├── B1: CDPService.ts
├── B2: AccessibilityService.ts (depends on B1)
├── B3: PlaywrightLocators.ts (depends on B1, B2)
├── B4: AutoWaiting.ts (depends on B1)
└── B5: VisionService.ts (depends on E4)

Week 3: Strategy System (Depends on B1-B5, E1)
├── D1: DOMStrategy.ts
├── D2: CDPStrategy.ts (depends on B1, B2, B3)
├── D3: VisionStrategy.ts (depends on B5)
├── D4: CoordinatesStrategy.ts (depends on B1)
├── D5: EvidenceScoring.ts (depends on B1)
├── H5: strategies/index.ts
├── C3: StrategyScorer.ts
├── C4: StrategyChainBuilder.ts
├── C2: FallbackChainGenerator.ts (depends on C3, C4)
├── C5: TelemetryLogger.ts (depends on E5)
├── G1: ActionExecutor.ts (depends on B1, B4)
├── C1: DecisionEngine.ts (depends on D1-D5, G1, C5)
└── H1: services/index.ts

Week 4: Recording System (Depends on E3)
├── A3: DOMCapture.ts
├── A4: VisionCapture.ts
├── A5: MouseCapture.ts
├── A6: NetworkCapture.ts
├── A2: EvidenceBuffer.ts (depends on A3-A6)
├── H4: layers/index.ts
├── A1: RecordingOrchestrator.ts (depends on A2-A6)
└── A7: content.tsx [MODIFY]

Week 5: UI Components (Depends on E1, E3)
├── F4: StrategyBadge.tsx
├── F5: LayerIndicator.tsx
├── H3: components/index.ts
├── G6: popup.html
├── G8: popup.css
├── G7: App.tsx
├── F2: Recorder.tsx [MODIFY]
└── F1: TestRunner.tsx [MODIFY]

Week 6: Integration (Depends on all above)
├── F3: background.ts [MODIFY]
├── H6: IMPLEMENTATION_CHECKLIST.md
└── Integration Testing
```

## 2.2 Daily Implementation Schedule

### Week 1: Foundation

| Day | Spec | File | Est. Time |
|-----|------|------|-----------|
| 1.1 | E1 | src/types/strategy.ts | 2-3 hrs |
| 1.2 | E2 | src/types/cdp.ts | 2-3 hrs |
| 1.3 | E3 | src/types/recording.ts | 3-4 hrs |
| 1.4 | E4 | src/types/vision.ts | 2-3 hrs |
| 1.5 | E5 | src/types/telemetry.ts | 2-3 hrs |
| 1.6 | H2 | src/types/index.ts | 1 hr |
| 1.7 | G2-G5 | Config files | 2 hrs |

**Checkpoint:** `npm run typecheck` passes with 0 errors

### Week 2: CDP Services

| Day | Spec | File | Dependencies |
|-----|------|------|--------------|
| 2.1 | B1 | src/background/services/CDPService.ts | E2 |
| 2.2 | B2 | src/background/services/AccessibilityService.ts | B1, E2 |
| 2.3 | B3 | src/background/services/PlaywrightLocators.ts | B1, B2 |
| 2.4 | B4 | src/background/services/AutoWaiting.ts | B1 |
| 2.5 | B5 | src/background/services/VisionService.ts | E4 |

**Checkpoint:** CDP attaches to tab, queries DOM successfully

### Week 3: Strategy System

| Day | Spec | File | Dependencies |
|-----|------|------|--------------|
| 3.1 | D1 | strategies/DOMStrategy.ts | B1, E1 |
| 3.2 | D2 | strategies/CDPStrategy.ts | B1, B2, B3 |
| 3.3 | D3 | strategies/VisionStrategy.ts | B5 |
| 3.4 | D4, D5 | strategies/CoordinatesStrategy.ts, EvidenceScoring.ts | B1 |
| 3.5 | H5, C3, C4 | strategies/index.ts, StrategyScorer.ts, StrategyChainBuilder.ts | D1-D5 |
| 3.6 | C2, C5 | FallbackChainGenerator.ts, TelemetryLogger.ts | C3, C4, E5 |
| 3.7 | G1, C1, H1 | ActionExecutor.ts, DecisionEngine.ts, services/index.ts | All above |

**Checkpoint:** Can generate fallback chain from mock data, evaluate strategies

### Week 4: Recording System

| Day | Spec | File | Dependencies |
|-----|------|------|--------------|
| 4.1 | A3 | layers/DOMCapture.ts | E3 |
| 4.2 | A4 | layers/VisionCapture.ts | E3, E4 |
| 4.3 | A5 | layers/MouseCapture.ts | E3 |
| 4.4 | A6 | layers/NetworkCapture.ts | E3 |
| 4.5 | A2, H4 | layers/EvidenceBuffer.ts, layers/index.ts | A3-A6 |
| 4.6 | A1 | RecordingOrchestrator.ts | A2-A6, H4 |
| 4.7 | A7 | content.tsx [MODIFY] | A1 |

**Checkpoint:** Recording captures data from all 4 layers

### Week 5: UI Components

| Day | Spec | File | Dependencies |
|-----|------|------|--------------|
| 5.1 | F4 | components/StrategyBadge.tsx | E1 |
| 5.2 | F5 | components/LayerIndicator.tsx | E3 |
| 5.3 | H3 | components/index.ts | F4, F5 |
| 5.4 | G6, G8 | popup.html, popup.css | - |
| 5.5 | G7 | App.tsx | H3 |
| 5.6 | F2 | Recorder.tsx [MODIFY] | F4, F5 |
| 5.7 | F1 | TestRunner.tsx [MODIFY] | F4 |

**Checkpoint:** UI renders, layer indicators show status

### Week 6: Integration

| Day | Task | Files |
|-----|------|-------|
| 6.1 | F3 | background.ts [MODIFY] - wire all services |
| 6.2 | Integration Test 1 | Recording flow end-to-end |
| 6.3 | Integration Test 2 | Playback with fallback |
| 6.4 | Integration Test 3 | Vision OCR fallback |
| 6.5 | Bug fixes and polish | Various |

**Checkpoint:** All integration tests pass

---

# 3. Implementation Details

## 3.1 Types (E1-E5, H2)

### E1: Strategy Types
```
Spec: specs/E1_types_strategy.md
Target: src/types/strategy.ts
Action: NEW
Est. Lines: 300-350

Key Exports:
- StrategyType (union type)
- LocatorStrategy (interface)
- FallbackChain (interface)
- STRATEGY_WEIGHTS (const)
- Type guards for each strategy metadata type

Dependencies: None
Dependents: All strategy evaluators, DecisionEngine, UI components
```

### E2: CDP Types
```
Spec: specs/E2_types_cdp.md
Target: src/types/cdp.ts
Action: NEW
Est. Lines: 350-400

Key Exports:
- CDPNode, AXNode, BoxModel interfaces
- Input event types (MouseEventParams, KeyEventParams)
- Utility functions (parseAttributes, getCenterPoint)

Dependencies: None
Dependents: CDPService, AccessibilityService, all CDP-based strategies
```

### E3: Recording Types
```
Spec: specs/E3_types_recording.md
Target: src/types/recording.ts
Action: NEW
Est. Lines: 450-500

Key Exports:
- RecordingState, LayerType, LayerStatus
- DOMCaptureResult, VisionCaptureResult, MouseCaptureResult, NetworkCaptureResult
- BufferedAction, RecordingConfig
- Message types for content ↔ background

Dependencies: E1 (imports FallbackChain)
Dependents: All capture layers, RecordingOrchestrator, UI
```

### E4: Vision Types
```
Spec: specs/E4_types_vision.md
Target: src/types/vision.ts
Action: NEW
Est. Lines: 300-350

Key Exports:
- OCRResult, OCRWord, VisionClickTarget
- VisionServiceConfig, TesseractParams
- Utility functions (getBboxCenter, calculateBboxOverlap)

Dependencies: None
Dependents: VisionService, VisionStrategy, VisionCapture
```

### E5: Telemetry Types
```
Spec: specs/E5_types_telemetry.md
Target: src/types/telemetry.ts
Action: NEW
Est. Lines: 300-350

Key Exports:
- TelemetryEvent, StrategyEvaluation
- RunSummary, StrategyMetrics
- TimeRange, TelemetryQueryOptions

Dependencies: E1 (imports StrategyType)
Dependents: TelemetryLogger, DecisionEngine, Analytics UI
```

### H2: Types Index
```
Spec: specs/H2_types_index.md
Target: src/types/index.ts
Action: NEW
Est. Lines: 200-250

Key Exports:
- Re-exports all types from E1-E5
- Convenience type aliases
- Type utilities (DeepPartial, isDefined, assertDefined)

Dependencies: E1-E5
Dependents: All source files
```

---

## 3.2 CDP Services (B1-B5)

### B1: CDPService
```
Spec: specs/B1_CDPService.md
Target: src/background/services/CDPService.ts
Action: NEW
Est. Lines: 400-450

Key Methods:
- attach(tabId): Promise<void>
- detach(tabId): Promise<void>
- sendCommand(tabId, method, params): Promise<T>
- on(tabId, event, callback): void
- getDocument(tabId): Promise<CDPNode>

Dependencies: E2 (CDP types)
Dependents: All CDP-based services (B2, B3, B4), strategies, ActionExecutor

Integration Points:
- chrome.debugger API
- Background service worker lifecycle
```

### B2: AccessibilityService
```
Spec: specs/B2_AccessibilityService.md
Target: src/background/services/AccessibilityService.ts
Action: NEW
Est. Lines: 300-350

Key Methods:
- getFullAXTree(tabId): Promise<AXNode[]>
- getAXNodeByBackendId(tabId, backendNodeId): Promise<AXNode>
- findByRole(tabId, role, options): Promise<AXNode[]>
- getAccessibleName(node): string

Dependencies: B1 (CDPService), E2 (AXNode types)
Dependents: CDPStrategy, PlaywrightLocators
```

### B3: PlaywrightLocators
```
Spec: specs/B3_PlaywrightLocators.md
Target: src/background/services/PlaywrightLocators.ts
Action: NEW
Est. Lines: 350-400

Key Methods:
- getByRole(tabId, role, options): Promise<LocatorResult>
- getByText(tabId, text, options): Promise<LocatorResult>
- getByLabel(tabId, label): Promise<LocatorResult>
- getByPlaceholder(tabId, placeholder): Promise<LocatorResult>
- getByTestId(tabId, testId): Promise<LocatorResult>

Dependencies: B1 (CDPService), B2 (AccessibilityService)
Dependents: CDPStrategy (cdp_power type)
```

### B4: AutoWaiting
```
Spec: specs/B4_AutoWaiting.md
Target: src/background/services/AutoWaiting.ts
Action: NEW
Est. Lines: 250-300

Key Methods:
- waitForElement(tabId, backendNodeId, options): Promise<boolean>
- isActionable(tabId, backendNodeId): Promise<ActionabilityResult>
- waitForNavigation(tabId, options): Promise<void>
- waitForNetworkIdle(tabId, options): Promise<void>

Dependencies: B1 (CDPService)
Dependents: ActionExecutor, DecisionEngine
```

### B5: VisionService
```
Spec: specs/B5_VisionService.md
Target: src/background/services/VisionService.ts
Action: NEW
Est. Lines: 400-450

Key Methods:
- initialize(): Promise<void>
- captureScreenshot(tabId): Promise<string>
- performOCR(imageData): Promise<OCRResult>
- findTextOnScreen(tabId, text): Promise<VisionClickTarget[]>
- terminate(): void

Dependencies: E4 (vision types), tesseract.js
Dependents: VisionStrategy, VisionCapture

Integration Points:
- Tesseract.js worker management
- Screenshot caching
```

---

## 3.3 Strategy System (D1-D5, C1-C5, G1, H1, H5)

### D1: DOMStrategy
```
Spec: specs/D1_DOMStrategy.md
Target: src/background/services/strategies/DOMStrategy.ts
Action: NEW
Est. Lines: 250-300

Handles: dom_selector, css_selector strategy types
Weight: 0.85 (dom), 0.75 (css)

Key Methods:
- evaluate(tabId, strategy): Promise<StrategyEvaluationResult>
- findBySelector(tabId, selector): Promise<ElementResult>
```

### D2: CDPStrategy
```
Spec: specs/D2_CDPStrategy.md
Target: src/background/services/strategies/CDPStrategy.ts
Action: NEW
Est. Lines: 350-400

Handles: cdp_semantic, cdp_power strategy types
Weight: 0.95 (semantic), 0.90 (power)

Key Methods:
- evaluate(tabId, strategy): Promise<StrategyEvaluationResult>
- findBySemantic(tabId, metadata): Promise<ElementResult>
- findByPowerLocator(tabId, metadata): Promise<ElementResult>

Dependencies: B1, B2, B3
```

### D3: VisionStrategy
```
Spec: specs/D3_VisionStrategy.md
Target: src/background/services/strategies/VisionStrategy.ts
Action: NEW
Est. Lines: 300-350

Handles: vision_ocr strategy type
Weight: 0.70

Key Methods:
- evaluate(tabId, strategy): Promise<StrategyEvaluationResult>
- findByOCR(tabId, text): Promise<ElementResult>

Dependencies: B5 (VisionService)
```

### D4: CoordinatesStrategy
```
Spec: specs/D4_CoordinatesStrategy.md
Target: src/background/services/strategies/CoordinatesStrategy.ts
Action: NEW
Est. Lines: 200-250

Handles: coordinates strategy type
Weight: 0.60 (lowest - last resort)

Key Methods:
- evaluate(tabId, strategy): Promise<StrategyEvaluationResult>
- verifyAtPoint(tabId, x, y, expectedTag): Promise<boolean>

Dependencies: B1 (CDPService)
```

### D5: EvidenceScoring
```
Spec: specs/D5_EvidenceScoring.md
Target: src/background/services/strategies/EvidenceScoring.ts
Action: NEW
Est. Lines: 350-400

Handles: evidence_scoring strategy type
Weight: 0.80

Key Methods:
- evaluate(tabId, strategy): Promise<StrategyEvaluationResult>
- scoreCandidate(candidate, evidence): number
- findCandidatesNearPoint(tabId, point): Promise<Candidate[]>

Dependencies: B1, E1, E3 (mouse trail types)
```

### C1: DecisionEngine
```
Spec: specs/C1_DecisionEngine.md
Target: src/background/services/DecisionEngine.ts
Action: NEW
Est. Lines: 450-500

Key Methods:
- executeStep(tabId, step, runId): Promise<StepResult>
- evaluateChain(tabId, chain): Promise<EvaluationResults>
- selectBestStrategy(results): StrategyEvaluationResult
- executeAction(tabId, result, action): Promise<boolean>

Dependencies: D1-D5, G1, C5
Dependents: TestRunner (via background.ts)
```

### C2: FallbackChainGenerator
```
Spec: specs/C2_FallbackChainGenerator.md
Target: src/background/services/FallbackChainGenerator.ts
Action: NEW
Est. Lines: 350-400

Key Methods:
- generateChain(capturedAction): FallbackChain
- scoreStrategies(action): ScoredStrategy[]
- buildChain(scored): FallbackChain

Dependencies: C3 (StrategyScorer), C4 (StrategyChainBuilder)
Dependents: EvidenceBuffer (during recording)
```

### C3: StrategyScorer
```
Spec: specs/C3_StrategyScorer.md
Target: src/background/services/StrategyScorer.ts
Action: NEW
Est. Lines: 200-250

Key Methods:
- scoreAll(capturedAction): ScoredStrategy[]
- scoreCDPSemantic(action): number
- scoreDOMSelector(action): number
- scoreVisionOCR(action): number
```

### C4: StrategyChainBuilder
```
Spec: specs/C4_StrategyChainBuilder.md
Target: src/background/services/StrategyChainBuilder.ts
Action: NEW
Est. Lines: 200-250

Key Methods:
- build(scoredStrategies, maxStrategies): FallbackChain
- createStrategy(type, action, score): LocatorStrategy
```

### C5: TelemetryLogger
```
Spec: specs/C5_TelemetryLogger.md
Target: src/background/services/TelemetryLogger.ts
Action: NEW
Est. Lines: 350-400

Key Methods:
- logEvent(event): Promise<void>
- startRun(runId): void
- endRun(runId, status): Promise<RunSummary>
- getStrategyMetrics(options): Promise<StrategyMetrics>
- query(options): Promise<TelemetryEvent[]>

Dependencies: E5, IndexedDB (idb library)
```

### G1: ActionExecutor
```
Spec: specs/G1_ActionExecutor.md
Target: src/background/services/ActionExecutor.ts
Action: NEW
Est. Lines: 400-450

Key Methods:
- execute(tabId, action, target): Promise<ActionResult>
- executeClick(tabId, point): Promise<void>
- executeType(tabId, nodeId, text): Promise<void>
- executeSelect(tabId, nodeId, value): Promise<void>
- moveMouse(tabId, from, to): Promise<void>

Dependencies: B1 (CDPService), B4 (AutoWaiting)
```

### H1: Services Index
```
Spec: specs/H1_integration_index.md
Target: src/background/services/index.ts
Action: NEW
Est. Lines: 250-300

Key Exports:
- createServices(options): Promise<Services>
- disposeServices(services): Promise<void>
- All service classes
- Factory functions

Dependencies: All B, C, D, G1 specs
```

### H5: Strategies Index
```
Spec: specs/H5_strategies_index.md
Target: src/background/services/strategies/index.ts
Action: NEW
Est. Lines: 300-350

Key Exports:
- StrategyEvaluator interface
- createStrategyEvaluators(deps): StrategyEvaluators
- findEvaluatorForType(evaluators, type): StrategyEvaluator
- All strategy classes
```

---

## 3.4 Recording System (A1-A7, H4)

### A1: RecordingOrchestrator
```
Spec: specs/A1_RecordingOrchestrator.md
Target: src/contentScript/RecordingOrchestrator.ts
Action: NEW
Est. Lines: 400-450

Key Methods:
- startRecording(config): void
- stopRecording(): RecordingSession
- pauseRecording(): void
- resumeRecording(): void
- handleUserAction(event): void

Dependencies: A2-A6, H4
Dependents: content.tsx
```

### A2: EvidenceBuffer
```
Spec: specs/A2_EvidenceBuffer.md
Target: src/contentScript/layers/EvidenceBuffer.ts
Action: NEW
Est. Lines: 300-350

Key Methods:
- add(action): void
- flush(): BufferedAction[]
- getStatus(): BufferStatus
- generateChain(action): Promise<FallbackChain>

Dependencies: E3, FallbackChainGenerator (via message)
```

### A3: DOMCapture
```
Spec: specs/A3_DOMCapture.md
Target: src/contentScript/layers/DOMCapture.ts
Action: NEW
Est. Lines: 350-400

Key Methods:
- capture(element): DOMCaptureResult
- generateSelectors(element): SelectorSet
- getElementInfo(element): DOMElementInfo
- getXPath(element): string  // Preserved from Phase 2!

Integration: Contains existing getXPath() and getLabelForTarget() logic
```

### A4: VisionCapture
```
Spec: specs/A4_VisionCapture.md
Target: src/contentScript/layers/VisionCapture.ts
Action: NEW
Est. Lines: 300-350

Key Methods:
- capture(): Promise<VisionCaptureResult>
- requestScreenshot(): Promise<string>
- requestOCR(screenshot, region): Promise<OCRResult>

Integration: Communicates with VisionService via background messages
```

### A5: MouseCapture
```
Spec: specs/A5_MouseCapture.md
Target: src/contentScript/layers/MouseCapture.ts
Action: NEW
Est. Lines: 300-350

Key Methods:
- startTracking(): void
- stopTracking(): MouseCaptureResult
- analyzePattern(trail): MousePattern
- getTrail(): MouseTrailPoint[]
```

### A6: NetworkCapture
```
Spec: specs/A6_NetworkCapture.md
Target: src/contentScript/layers/NetworkCapture.ts
Action: NEW
Est. Lines: 250-300

Key Methods:
- startMonitoring(): void
- stopMonitoring(): NetworkCaptureResult
- getRecentRequests(): TrackedRequest[]
- isNetworkIdle(): boolean
```

### H4: Layers Index
```
Spec: specs/H4_layers_index.md
Target: src/contentScript/layers/index.ts
Action: NEW
Est. Lines: 250-300

Key Exports:
- createLayers(options): LayerInstances
- initializeLayers(layers): Promise<LayerInitResult[]>
- startLayers/stopLayers/pauseLayers/resumeLayers
- All layer classes
```

### A7: content.tsx Modifications
```
Spec: specs/A7_content_tsx_MODIFY.md
Target: src/contentScript/content.tsx
Action: MODIFY
Est. Changes: 150-200 lines added/modified

Changes:
- Import RecordingOrchestrator
- Add V2 message handlers (START_RECORDING_V2, etc.)
- Delegate to orchestrator for multi-layer recording
- Keep existing V1 handlers for backward compatibility
```

---

## 3.5 UI Components (F1-F5, G6-G8, H3)

### F4: StrategyBadge
```
Spec: specs/F4_StrategyBadge.md
Target: src/components/StrategyBadge.tsx
Action: NEW
Est. Lines: 200-250

Components:
- StrategyBadge (single strategy indicator)
- StrategyBadgeList (horizontal list)
- StrategyLegend (all strategies with descriptions)
```

### F5: LayerIndicator
```
Spec: specs/F5_LayerIndicator.md
Target: src/components/LayerIndicator.tsx
Action: NEW
Est. Lines: 300-350

Components:
- LayerIndicator (single layer status)
- LayerStatusBar (all layers horizontal)
- LayerConfigPanel (toggle layers on/off)
```

### H3: Components Index
```
Spec: specs/H3_components_index.md
Target: src/components/index.ts
Action: NEW
Est. Lines: 300-350

Exports:
- All UI components (F4, F5, existing)
- Composite components (ConfidenceMeter, StatusDot, etc.)
- Custom hooks (useDebounce, useInterval, useToggle)
```

### G6: popup.html
```
Spec: specs/G6_popup_html.md
Target: src/pages/popup.html
Action: NEW
Est. Lines: 120-150

Structure:
- Root div for React mount
- Critical CSS inline
- Script module loading
```

### G7: App.tsx
```
Spec: specs/G7_App_tsx.md
Target: src/pages/App.tsx
Action: NEW
Est. Lines: 400-500

Components:
- Tab navigation (Record, Run, Tests, Settings)
- Service status indicator
- Error boundary
```

### G8: popup.css
```
Spec: specs/G8_popup_css.md
Target: src/pages/popup.css
Action: NEW
Est. Lines: 600-700

Sections:
- CSS variables (colors, spacing, typography)
- Component styles
- Dark mode support
- Animations
```

### F1: TestRunner.tsx Modifications
```
Spec: specs/F1_TestRunner_tsx_MODIFY.md
Target: src/pages/TestRunner.tsx
Action: MODIFY

Changes:
- Add strategy badges to step display
- Show which strategy succeeded
- Display fallback attempts on hover/expand
```

### F2: Recorder.tsx Modifications
```
Spec: specs/F2_Recorder_tsx_MODIFY.md
Target: src/pages/Recorder.tsx
Action: MODIFY

Changes:
- Add layer indicators
- V2 recording mode toggle
- Layer configuration panel
```

### F3: background.ts Modifications
```
Spec: specs/F3_background_ts_MODIFY.md
Target: src/background/background.ts
Action: MODIFY

Changes:
- Initialize all services on startup
- Add V2 message handlers
- Wire DecisionEngine to TestRunner requests
```

---

# 4. Smart Prompt Templates

## 4.1 Standard Code Generation Prompt

```
═══════════════════════════════════════════════════════════════════════════════
IMPLEMENT: [Spec ID] - [Component Name]
═══════════════════════════════════════════════════════════════════════════════

Read specification: specs/[SPEC_ID]_[name].md

Create file: [exact target path]

REQUIREMENTS:
1. Follow the spec EXACTLY - all interfaces, methods, and logic as specified
2. Use existing patterns from the codebase (check similar files)
3. Include all imports from the "Dependencies" section
4. Implement all methods listed in "Key Methods"
5. Handle all edge cases from "Edge Cases" section
6. Match estimated line count: [N] lines

TYPE IMPORTS:
```typescript
import { [types] } from '../types';
// or
import { [types] } from '../../types';
```

IMPLEMENTATION ORDER:
1. Imports (types first, then dependencies, then relative)
2. Constants and configuration
3. Interfaces (if not in types/)
4. Main class/function implementation
5. Helper functions
6. Exports

AFTER IMPLEMENTATION:
1. Verify TypeScript compiles: `npm run typecheck`
2. Run relevant tests if they exist
3. Commit with message: "Implement [Spec ID]: [Component Name]"

═══════════════════════════════════════════════════════════════════════════════
```

## 4.2 Modification Prompt (for MODIFY files)

```
═══════════════════════════════════════════════════════════════════════════════
MODIFY: [Spec ID] - [File Name]
═══════════════════════════════════════════════════════════════════════════════

Read specification: specs/[SPEC_ID]_[name]_MODIFY.md
Read current file: [target path]

MODIFICATION REQUIREMENTS:
1. Preserve ALL existing functionality
2. Add new imports at top (maintain grouping)
3. Add new code in sections marked by spec
4. Do NOT remove or break existing features
5. Maintain backward compatibility where specified

CHANGES TO MAKE:
[List from spec's "Modifications" section]

INTEGRATION POINTS:
[List from spec's "Integration Points" section]

VERIFICATION:
1. Existing tests still pass
2. New functionality works
3. No TypeScript errors

COMMIT: "Modify [Spec ID]: [description of changes]"
═══════════════════════════════════════════════════════════════════════════════
```

## 4.3 Test Generation Prompt

```
═══════════════════════════════════════════════════════════════════════════════
TEST: [Spec ID] - [Component Name]
═══════════════════════════════════════════════════════════════════════════════

Implementation file: [source path]
Test file: [source path with .test.ts extension]

GENERATE TESTS FOR:
1. All public methods
2. All edge cases listed in spec
3. Error handling paths
4. Integration points

TEST STRUCTURE:
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { [Component] } from './[component]';

describe('[Component]', () => {
  describe('[method]', () => {
    it('should [expected behavior]', () => {
      // Arrange
      // Act
      // Assert
    });
  });
});
```

MOCKING:
- Mock chrome.* APIs
- Mock CDP responses
- Mock IndexedDB for telemetry

COMMIT: "Add tests for [Spec ID]: [Component Name]"
═══════════════════════════════════════════════════════════════════════════════
```

## 4.4 Batch Implementation Prompt

```
═══════════════════════════════════════════════════════════════════════════════
BATCH IMPLEMENT: [Category] Types/Services/Components
═══════════════════════════════════════════════════════════════════════════════

Implement the following specs in order:

1. [Spec ID]: [path] 
2. [Spec ID]: [path]
3. [Spec ID]: [path]
...

FOR EACH FILE:
1. Read the spec from specs/
2. Create/modify the target file
3. Verify no TypeScript errors
4. Commit individually

AFTER ALL COMPLETE:
1. Run full typecheck: `npm run typecheck`
2. Run tests: `npm test`
3. Report status

═══════════════════════════════════════════════════════════════════════════════
```

---

# 5. Code Standards

## 5.1 Import Order

```typescript
// 1. Node/built-in modules (rare in browser extension)
import { EventEmitter } from 'events';

// 2. External packages
import { createWorker } from 'tesseract.js';
import { openDB } from 'idb';

// 3. Type imports (separate line)
import type { CDPNode, AXNode } from '../types';

// 4. Internal absolute imports
import { CDPService } from '../services/CDPService';

// 5. Internal relative imports
import { parseAttributes } from './utils';

// 6. Type-only relative imports
import type { LocalConfig } from './types';
```

## 5.2 File Structure

```typescript
/**
 * [Component Name]
 * 
 * [Brief description]
 * 
 * @spec [Spec ID]
 * @see specs/[spec file]
 */

// ============================================================================
// IMPORTS
// ============================================================================

import { ... } from '...';

// ============================================================================
// TYPES (if not in types/)
// ============================================================================

interface LocalType { ... }

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG = { ... };

// ============================================================================
// MAIN IMPLEMENTATION
// ============================================================================

export class ComponentName {
  // Private fields first
  private field: Type;
  
  // Constructor
  constructor(config: Config) { ... }
  
  // Public methods (in order of importance)
  public async mainMethod(): Promise<Result> { ... }
  
  // Private methods
  private helperMethod(): void { ... }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function localHelper(): void { ... }

// ============================================================================
// EXPORTS
// ============================================================================

export { ComponentName };
export type { LocalType };
```

## 5.3 Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Files (classes) | PascalCase.ts | `CDPService.ts` |
| Files (types) | lowercase.ts | `strategy.ts` |
| Files (utils) | camelCase.ts | `parseAttributes.ts` |
| Classes | PascalCase | `class CDPService` |
| Interfaces | PascalCase | `interface LocatorStrategy` |
| Types | PascalCase | `type StrategyType` |
| Functions | camelCase | `function parseAttributes()` |
| Constants | UPPER_SNAKE | `const DEFAULT_TIMEOUT` |
| Private fields | camelCase with _ | `private _connection` |
| React components | PascalCase.tsx | `StrategyBadge.tsx` |

## 5.4 Error Handling

```typescript
// Use typed errors
class CDPError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly tabId?: number
  ) {
    super(message);
    this.name = 'CDPError';
  }
}

// Always catch and rethrow with context
try {
  await cdpService.sendCommand(tabId, 'DOM.getDocument');
} catch (error) {
  throw new CDPError(
    `Failed to get document: ${error.message}`,
    'DOM_ERROR',
    tabId
  );
}

// Return Result types for expected failures
type Result<T, E = Error> = 
  | { success: true; value: T }
  | { success: false; error: E };
```

## 5.5 Async Patterns

```typescript
// Use async/await, not raw Promises
// ✅ Good
async function getData(): Promise<Data> {
  const result = await fetchData();
  return processData(result);
}

// ❌ Bad
function getData(): Promise<Data> {
  return fetchData().then(result => processData(result));
}

// Handle concurrent operations with Promise.all
const [dom, vision, mouse] = await Promise.all([
  domCapture.capture(element),
  visionCapture.capture(),
  mouseCapture.capture()
]);

// Use Promise.allSettled for non-critical parallel operations
const results = await Promise.allSettled([
  optionalService1.init(),
  optionalService2.init()
]);
```

---

# 6. Testing Requirements

## 6.1 Test File Location

```
src/
├── types/
│   ├── strategy.ts
│   └── strategy.test.ts        ← Same directory
├── background/
│   └── services/
│       ├── CDPService.ts
│       └── CDPService.test.ts  ← Same directory
├── components/
│   ├── StrategyBadge.tsx
│   └── StrategyBadge.test.tsx  ← Same directory
```

## 6.2 Minimum Coverage Requirements

| Category | Min Coverage | Priority Tests |
|----------|--------------|----------------|
| Types (E) | Type guards only | Type guard functions |
| Services (B) | 70% | Public methods, error handling |
| Strategies (D) | 80% | evaluate() method, edge cases |
| Decision Engine (C) | 80% | executeStep(), selectBestStrategy() |
| Recording (A) | 70% | capture() methods, orchestration |
| UI Components (F) | 60% | Render tests, user interactions |

## 6.3 Test Patterns

### Unit Test
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CDPService } from './CDPService';

// Mock chrome API
vi.mock('chrome', () => ({
  debugger: {
    attach: vi.fn(),
    detach: vi.fn(),
    sendCommand: vi.fn()
  }
}));

describe('CDPService', () => {
  let service: CDPService;
  
  beforeEach(() => {
    vi.clearAllMocks();
    service = new CDPService();
  });
  
  describe('attach', () => {
    it('should attach debugger to tab', async () => {
      chrome.debugger.attach.mockResolvedValue(undefined);
      
      await service.attach(123);
      
      expect(chrome.debugger.attach).toHaveBeenCalledWith(
        { tabId: 123 },
        '1.3'
      );
    });
    
    it('should throw if already attached', async () => {
      await service.attach(123);
      
      await expect(service.attach(123)).rejects.toThrow('Already attached');
    });
  });
});
```

### Integration Test
```typescript
describe('Recording Flow', () => {
  it('should capture action with all layers', async () => {
    // Setup
    const orchestrator = new RecordingOrchestrator(config);
    await orchestrator.startRecording();
    
    // Simulate user action
    const mockEvent = createMockClickEvent();
    await orchestrator.handleUserAction(mockEvent);
    
    // Verify
    const session = await orchestrator.stopRecording();
    expect(session.actionCount).toBe(1);
    expect(session.actions[0].domData).toBeDefined();
    expect(session.actions[0].visionData).toBeDefined();
    expect(session.actions[0].mouseData).toBeDefined();
    expect(session.actions[0].fallbackChain.strategies.length).toBeGreaterThan(0);
  });
});
```

### Component Test
```typescript
import { render, screen } from '@testing-library/react';
import { StrategyBadge } from './StrategyBadge';

describe('StrategyBadge', () => {
  it('renders with correct icon and color', () => {
    render(<StrategyBadge type="cdp_semantic" confidence={0.95} />);
    
    expect(screen.getByText('🎯')).toBeInTheDocument();
    expect(screen.getByText('95%')).toBeInTheDocument();
  });
  
  it('shows tooltip on hover', async () => {
    render(<StrategyBadge type="cdp_semantic" showTooltip />);
    
    await userEvent.hover(screen.getByRole('button'));
    
    expect(screen.getByText('CDP Semantic')).toBeInTheDocument();
  });
});
```

## 6.4 Mock Utilities

Create `src/test/mocks.ts`:
```typescript
// Chrome API mocks
export const mockChrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: { addListener: vi.fn() }
  },
  debugger: {
    attach: vi.fn(),
    detach: vi.fn(),
    sendCommand: vi.fn(),
    onEvent: { addListener: vi.fn() }
  },
  tabs: {
    captureVisibleTab: vi.fn()
  }
};

// CDP response mocks
export const mockCDPResponses = {
  document: { nodeId: 1, backendNodeId: 1, nodeName: 'HTML' },
  axTree: [{ nodeId: '1', role: { value: 'button' }, name: { value: 'Submit' } }]
};

// Setup function
export function setupMocks() {
  vi.stubGlobal('chrome', mockChrome);
}
```

---

# 7. Integration Checkpoints

## 7.1 Checkpoint 1: Types Complete (End of Week 1)

```bash
# Verify
npm run typecheck  # Must pass with 0 errors

# Test imports work
# Create temporary test file:
import { 
  StrategyType, 
  CDPNode, 
  RecordingState, 
  OCRResult, 
  TelemetryEvent 
} from './types';
```

**Success Criteria:**
- [ ] All type files created (E1-E5, H2)
- [ ] No TypeScript errors
- [ ] Types can be imported from `./types`

## 7.2 Checkpoint 2: CDP Services Work (End of Week 2)

```typescript
// Manual test in extension
const cdp = new CDPService();
await cdp.attach(tabId);
const doc = await cdp.sendCommand(tabId, 'DOM.getDocument');
console.log('Document:', doc);  // Should show root node

const ax = new AccessibilityService(cdp);
const tree = await ax.getFullAXTree(tabId);
console.log('AX Tree:', tree);  // Should show accessibility nodes
```

**Success Criteria:**
- [ ] CDP attaches without error
- [ ] Can query DOM via CDP
- [ ] Can query accessibility tree
- [ ] VisionService initializes Tesseract

## 7.3 Checkpoint 3: Strategies Evaluate (End of Week 3)

```typescript
// Test strategy evaluation
const evaluators = createStrategyEvaluators(deps);
const mockStrategy: LocatorStrategy = {
  type: 'dom_selector',
  selector: '#test-button',
  confidence: 0.85
};

const result = await evaluators.dom.evaluate(tabId, mockStrategy);
console.log('Result:', result);  // Should find or not find element
```

**Success Criteria:**
- [ ] All 5 strategy evaluators work
- [ ] FallbackChainGenerator creates valid chains
- [ ] DecisionEngine evaluates chain in order
- [ ] TelemetryLogger stores events

## 7.4 Checkpoint 4: Recording Captures (End of Week 4)

```typescript
// Test recording
orchestrator.startRecording({ enableAllLayers: true });
// Click something on page
// ...
const session = orchestrator.stopRecording();
console.log('Actions:', session.actions);
// Each action should have:
// - domData (selectors, element info)
// - visionData (OCR text if available)
// - mouseData (trail points)
// - fallbackChain (5-7 strategies)
```

**Success Criteria:**
- [ ] DOMCapture generates selectors
- [ ] VisionCapture requests screenshots
- [ ] MouseCapture tracks cursor
- [ ] EvidenceBuffer combines data
- [ ] FallbackChain generated for each action

## 7.5 Checkpoint 5: UI Displays (End of Week 5)

**Success Criteria:**
- [ ] Popup opens with tabs
- [ ] Layer indicators show status
- [ ] Strategy badges display correctly
- [ ] Recorder shows V2 mode option
- [ ] TestRunner shows strategy details

## 7.6 Checkpoint 6: Full Integration (End of Week 6)

### Integration Test 1: Record and Playback
```
1. Open extension
2. Navigate to test page
3. Click Record (V2 mode)
4. Click a button, type in input, select dropdown
5. Stop recording
6. Verify 3 actions with fallback chains
7. Modify page (change button ID)
8. Play recording
9. Verify button click still works (fell back to different strategy)
```

### Integration Test 2: Vision Fallback
```
1. Record click on text element
2. Completely restructure DOM (remove IDs, change classes)
3. Keep same visible text
4. Play recording
5. Verify Vision OCR finds text and clicks correctly
```

### Integration Test 3: Telemetry
```
1. Run multiple test recordings
2. Open analytics
3. Verify strategy success rates displayed
4. Verify run history visible
```

---

# 8. Troubleshooting

## 8.1 Common Issues

### TypeScript Errors After Adding Types

```bash
# Clear cache and rebuild
rm -rf node_modules/.cache
npm run typecheck
```

### CDP Attach Fails

```typescript
// Check if already attached
chrome.debugger.attach({ tabId }, '1.3', () => {
  if (chrome.runtime.lastError) {
    console.error('Attach error:', chrome.runtime.lastError.message);
    // Common: "Another debugger is already attached"
    // Solution: Close DevTools on that tab
  }
});
```

### Tesseract Worker Won't Load

```typescript
// Ensure WASM files are in web_accessible_resources
// Check manifest.json has:
"web_accessible_resources": [{
  "resources": ["tesseract-worker.js", "tesseract-core.wasm.js", "*.traineddata.gz"],
  "matches": ["<all_urls>"]
}]
```

### Recording Doesn't Capture

```typescript
// Verify content script injected
console.log('Content script loaded:', !!window.__MUFFIN_RECORDER__);

// Check message handler registered
chrome.runtime.onMessage.addListener((msg) => {
  console.log('Received:', msg);
});
```

### Strategy Chain Empty

```typescript
// Debug chain generation
const chain = generator.generateChain(action);
console.log('Scored strategies:', generator._lastScores);
console.log('Built chain:', chain);
// Check if capture data is complete
console.log('DOM data:', action.domData);
console.log('Vision data:', action.visionData);
```

## 8.2 Debug Mode

Add to `RecordingOrchestrator`:
```typescript
private debug(message: string, data?: unknown) {
  if (this.config.debug) {
    console.log(`[Muffin:Recording] ${message}`, data);
  }
}
```

Add to `DecisionEngine`:
```typescript
private debug(message: string, data?: unknown) {
  if (this.config.debug) {
    console.log(`[Muffin:Decision] ${message}`, data);
  }
}
```

## 8.3 Performance Monitoring

```typescript
// Wrap slow operations
const startTime = performance.now();
const result = await visionService.performOCR(screenshot);
const duration = performance.now() - startTime;
console.log(`OCR took ${duration}ms`);

// Alert if too slow
if (duration > 3000) {
  console.warn('OCR performance degraded');
}
```

---

# Appendix A: File Checklist

## New Files (39)

```
[ ] src/types/strategy.ts (E1)
[ ] src/types/cdp.ts (E2)
[ ] src/types/recording.ts (E3)
[ ] src/types/vision.ts (E4)
[ ] src/types/telemetry.ts (E5)
[ ] src/types/index.ts (H2)
[ ] src/background/services/CDPService.ts (B1)
[ ] src/background/services/AccessibilityService.ts (B2)
[ ] src/background/services/PlaywrightLocators.ts (B3)
[ ] src/background/services/AutoWaiting.ts (B4)
[ ] src/background/services/VisionService.ts (B5)
[ ] src/background/services/DecisionEngine.ts (C1)
[ ] src/background/services/FallbackChainGenerator.ts (C2)
[ ] src/background/services/StrategyScorer.ts (C3)
[ ] src/background/services/StrategyChainBuilder.ts (C4)
[ ] src/background/services/TelemetryLogger.ts (C5)
[ ] src/background/services/ActionExecutor.ts (G1)
[ ] src/background/services/index.ts (H1)
[ ] src/background/services/strategies/DOMStrategy.ts (D1)
[ ] src/background/services/strategies/CDPStrategy.ts (D2)
[ ] src/background/services/strategies/VisionStrategy.ts (D3)
[ ] src/background/services/strategies/CoordinatesStrategy.ts (D4)
[ ] src/background/services/strategies/EvidenceScoring.ts (D5)
[ ] src/background/services/strategies/index.ts (H5)
[ ] src/contentScript/RecordingOrchestrator.ts (A1)
[ ] src/contentScript/layers/EvidenceBuffer.ts (A2)
[ ] src/contentScript/layers/DOMCapture.ts (A3)
[ ] src/contentScript/layers/VisionCapture.ts (A4)
[ ] src/contentScript/layers/MouseCapture.ts (A5)
[ ] src/contentScript/layers/NetworkCapture.ts (A6)
[ ] src/contentScript/layers/index.ts (H4)
[ ] src/components/StrategyBadge.tsx (F4)
[ ] src/components/LayerIndicator.tsx (F5)
[ ] src/components/index.ts (H3)
[ ] src/pages/popup.html (G6)
[ ] src/pages/App.tsx (G7)
[ ] src/pages/popup.css (G8)
[ ] docs/IMPLEMENTATION_CHECKLIST.md (H6)
```

## Modified Files (8)

```
[ ] src/contentScript/content.tsx (A7)
[ ] src/pages/TestRunner.tsx (F1)
[ ] src/pages/Recorder.tsx (F2)
[ ] src/background/background.ts (F3)
[ ] manifest.json (G2)
[ ] package.json (G3)
[ ] vite.config.ts (G4)
[ ] tsconfig.json (G5)
```

---

# Appendix B: Quick Reference

## Strategy Types and Weights

| Type | Weight | Evaluator | Use Case |
|------|--------|-----------|----------|
| cdp_semantic | 0.95 | CDPStrategy | Accessibility tree match |
| cdp_power | 0.90 | CDPStrategy | Playwright-style locators |
| dom_selector | 0.85 | DOMStrategy | ID, data-testid, name |
| evidence_scoring | 0.80 | EvidenceScoring | Mouse trail + attributes |
| css_selector | 0.75 | DOMStrategy | CSS selectors |
| vision_ocr | 0.70 | VisionStrategy | OCR text match |
| coordinates | 0.60 | CoordinatesStrategy | X,Y fallback |

## Layer Types

| Layer | Required | Purpose |
|-------|----------|---------|
| dom | Yes | Element info, selectors |
| vision | No | Screenshot, OCR |
| mouse | No | Cursor trail analysis |
| network | No | Request monitoring |

## Message Types (V2)

| Message | Direction | Purpose |
|---------|-----------|---------|
| START_RECORDING_V2 | UI → Content | Begin multi-layer recording |
| STOP_RECORDING_V2 | UI → Content | Stop and return session |
| RECORDING_ACTION_V2 | Content → Background | New action captured |
| EXECUTE_STEP_V2 | UI → Background | Run step with fallback |

---

**End of Phase 4 Code Generation Manual**
