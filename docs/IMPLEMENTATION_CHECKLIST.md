# Phase 3 Implementation Checklist

**File ID:** H6  
**File Path:** `docs/IMPLEMENTATION_CHECKLIST.md`  
**Status:** CREATE  
**Priority:** P0

---

## Purpose

Master implementation checklist for Phase 3 multi-layer recording and 7-tier fallback strategy system. Provides ordered implementation sequence, dependency tracking, verification steps, and integration testing guidance. Use this document to track progress and ensure all components are properly implemented and connected.

---

## Implementation Order

Components must be implemented in dependency order. Earlier components are dependencies for later ones.

### Phase 3.1: Foundation (Week 1)

#### 3.1.1 Type Definitions (No Dependencies)
| # | File | Spec | Status | Notes |
|---|------|------|--------|-------|
| 1 | `src/types/strategy.ts` | E1 | ☐ | Core strategy types, weights, type guards |
| 2 | `src/types/cdp.ts` | E2 | ☐ | CDP protocol types |
| 3 | `src/types/recording.ts` | E3 | ☐ | Recording state and layer types |
| 4 | `src/types/vision.ts` | E4 | ☐ | Vision/OCR types |
| 5 | `src/types/telemetry.ts` | E5 | ☐ | Telemetry event types |
| 6 | `src/types/index.ts` | H2 | ☐ | Central type exports |

**Verification:** `npm run typecheck` passes with 0 errors

#### 3.1.2 Build Configuration (No Dependencies)
| # | File | Spec | Status | Notes |
|---|------|------|--------|-------|
| 7 | `package.json` | G3 | ☐ | Add tesseract.js, idb, uuid |
| 8 | `tsconfig.json` | G5 | ☐ | Strict mode, path aliases |
| 9 | `vite.config.ts` | G4 | ☐ | Entry points, asset copying |
| 10 | `manifest.json` | G2 | ☐ | Debugger permission, service worker |

**Verification:** `npm install && npm run build` succeeds

---

### Phase 3.2: Core Services (Week 2)

#### 3.2.1 CDP Foundation
| # | File | Spec | Status | Notes |
|---|------|------|--------|-------|
| 11 | `src/background/services/CDPService.ts` | B1 | ☐ | Chrome debugger wrapper |
| 12 | `src/background/services/AccessibilityService.ts` | B2 | ☐ | AX tree access |
| 13 | `src/background/services/PlaywrightLocators.ts` | B3 | ☐ | Role/text/label locators |
| 14 | `src/background/services/AutoWaiting.ts` | B4 | ☐ | Actionability checks |

**Verification:** Manual test - attach debugger to tab, query DOM

#### 3.2.2 Vision Services
| # | File | Spec | Status | Notes |
|---|------|------|--------|-------|
| 15 | `src/background/services/VisionService.ts` | C1 | ☐ | Tesseract.js OCR |

**Verification:** Manual test - capture screenshot, extract text

#### 3.2.3 Telemetry
| # | File | Spec | Status | Notes |
|---|------|------|--------|-------|
| 16 | `src/background/services/TelemetryLogger.ts` | D1 | ☐ | IndexedDB storage |

**Verification:** Manual test - log event, query metrics

---

### Phase 3.3: Strategy System (Week 3)

#### 3.3.1 Strategy Evaluators
| # | File | Spec | Status | Notes |
|---|------|------|--------|-------|
| 17 | `src/background/services/strategies/DOMStrategy.ts` | D2 | ☐ | DOM/CSS selectors |
| 18 | `src/background/services/strategies/CDPStrategy.ts` | D3 | ☐ | Semantic/Power locators |
| 19 | `src/background/services/strategies/VisionStrategy.ts` | D4 | ☐ | OCR text matching |
| 20 | `src/background/services/strategies/CoordinatesStrategy.ts` | D4 | ☐ | X,Y fallback |
| 21 | `src/background/services/strategies/EvidenceScoring.ts` | D5 | ☐ | Mouse trail + attributes |
| 22 | `src/background/services/strategies/index.ts` | H5 | ☐ | Strategy exports |

**Verification:** Unit test each evaluator with mock CDP

#### 3.3.2 Chain Generation
| # | File | Spec | Status | Notes |
|---|------|------|--------|-------|
| 23 | `src/background/services/StrategyScorer.ts` | C3 | ☐ | Confidence scoring |
| 24 | `src/background/services/StrategyChainBuilder.ts` | C3 | ☐ | Chain construction |
| 25 | `src/background/services/FallbackChainGenerator.ts` | C2 | ☐ | Orchestrates generation |

**Verification:** Generate chain from mock capture data

#### 3.3.3 Decision Engine
| # | File | Spec | Status | Notes |
|---|------|------|--------|-------|
| 26 | `src/background/services/ActionExecutor.ts` | G1 | ☐ | CDP input dispatch |
| 27 | `src/background/services/DecisionEngine.ts` | C1 | ☐ | Strategy orchestration |
| 28 | `src/background/services/index.ts` | H1 | ☐ | Service exports |

**Verification:** Execute mock action on test page

---

### Phase 3.4: Recording System (Week 4)

#### 3.4.1 Capture Layers
| # | File | Spec | Status | Notes |
|---|------|------|--------|-------|
| 29 | `src/contentScript/layers/DOMCapture.ts` | A3 | ☐ | Element info capture |
| 30 | `src/contentScript/layers/VisionCapture.ts` | A4 | ☐ | Screenshot + OCR request |
| 31 | `src/contentScript/layers/MouseCapture.ts` | A5 | ☐ | Mouse trail tracking |
| 32 | `src/contentScript/layers/NetworkCapture.ts` | A6 | ☐ | Request monitoring |
| 33 | `src/contentScript/layers/EvidenceBuffer.ts` | A2 | ☐ | Action buffering |
| 34 | `src/contentScript/layers/index.ts` | H4 | ☐ | Layer exports |

**Verification:** Each layer captures data independently

#### 3.4.2 Recording Orchestrator
| # | File | Spec | Status | Notes |
|---|------|------|--------|-------|
| 35 | `src/contentScript/RecordingOrchestrator.ts` | A1 | ☐ | Multi-layer coordination |
| 36 | `src/contentScript/content.tsx` (MODIFY) | A7 | ☐ | Message handling |

**Verification:** Record click action with all layers

---

### Phase 3.5: UI Components (Week 5)

#### 3.5.1 Shared Components
| # | File | Spec | Status | Notes |
|---|------|------|--------|-------|
| 37 | `src/components/StrategyBadge.tsx` | F4 | ☐ | Strategy type badges |
| 38 | `src/components/LayerIndicator.tsx` | F5 | ☐ | Layer status display |
| 39 | `src/components/index.ts` | H3 | ☐ | Component exports |

**Verification:** Components render correctly in isolation

#### 3.5.2 Popup UI
| # | File | Spec | Status | Notes |
|---|------|------|--------|-------|
| 40 | `src/pages/popup.html` | G6 | ☐ | HTML entry point |
| 41 | `src/pages/popup.css` | G8 | ☐ | All popup styles |
| 42 | `src/pages/App.tsx` | G7 | ☐ | Main app shell |
| 43 | `src/pages/Recorder.tsx` (MODIFY) | F2 | ☐ | Recording UI |
| 44 | `src/pages/TestRunner.tsx` (MODIFY) | F1 | ☐ | Playback UI |

**Verification:** Popup opens, tabs navigate

---

### Phase 3.6: Integration (Week 6)

#### 3.6.1 Background Script
| # | File | Spec | Status | Notes |
|---|------|------|--------|-------|
| 45 | `src/background/background.ts` (MODIFY) | F3 | ☐ | Service initialization |

**Verification:** All services initialize on extension load

#### 3.6.2 Final Integration
| # | File | Spec | Status | Notes |
|---|------|------|--------|-------|
| 46 | `docs/IMPLEMENTATION_CHECKLIST.md` | H6 | ☐ | This file |

**Verification:** Full end-to-end test passes

---

## Integration Test Scenarios

### Test 1: Basic Recording Flow
```
1. Load extension
2. Navigate to test page
3. Click Record button
4. Perform: click button, type in input, select dropdown
5. Click Stop
6. Verify: 3 actions captured with fallback chains
7. Verify: Each action has 5-7 strategies
8. Verify: Layer indicators show captures
```

### Test 2: Playback with Strategy Fallback
```
1. Load saved recording
2. Modify test page (change element ID)
3. Click Play
4. Verify: First strategy (cdp_semantic) fails
5. Verify: Second strategy (dom_selector) succeeds
6. Verify: Action completes successfully
7. Verify: Telemetry logs fallback
```

### Test 3: Vision OCR Playback
```
1. Record click on text element
2. Modify page (change element structure, keep text)
3. Playback
4. Verify: DOM strategies fail
5. Verify: Vision OCR finds text
6. Verify: Click succeeds at OCR location
```

### Test 4: Coordinates Fallback
```
1. Record action
2. Completely replace target element
3. Playback
4. Verify: All locator strategies fail
5. Verify: Coordinates strategy used
6. Verify: Warning shown to user
```

### Test 5: Telemetry Dashboard
```
1. Run 5 test recordings
2. Open Analytics tab
3. Verify: Strategy metrics displayed
4. Verify: Success rates calculated
5. Verify: Run history shown
```

---

## Verification Commands

### Type Checking
```bash
npm run typecheck
# Expected: 0 errors
```

### Build
```bash
npm run build
# Expected: dist/ contains all files
```

### Lint
```bash
npm run lint
# Expected: 0 errors, 0 warnings
```

### Extension Load Test
```bash
# 1. Open chrome://extensions
# 2. Enable Developer mode
# 3. Load unpacked: select dist/
# 4. Verify: No errors in console
# 5. Verify: Extension icon appears
# 6. Verify: Popup opens
```

---

## File Count Summary

| Category | Count | Status |
|----------|-------|--------|
| Type Definitions | 6 | ☐ |
| Build Config | 4 | ☐ |
| Background Services | 12 | ☐ |
| Strategy Evaluators | 6 | ☐ |
| Content Script Layers | 6 | ☐ |
| UI Components | 4 | ☐ |
| Popup Pages | 5 | ☐ |
| Index Files | 4 | ☐ |
| **Total** | **47** | ☐ |

---

## Dependency Graph

```
                    ┌─────────────────────────────────────┐
                    │           types/*.ts                 │
                    │  (strategy, cdp, recording, vision,  │
                    │   telemetry)                         │
                    └─────────────────────────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    ▼                                   ▼
        ┌───────────────────┐               ┌───────────────────┐
        │    CDPService     │               │   VisionService   │
        └───────────────────┘               └───────────────────┘
                    │                                   │
        ┌───────────┼───────────┐                       │
        ▼           ▼           ▼                       │
┌─────────────┐ ┌─────────┐ ┌─────────┐                │
│Accessibility│ │Playwright│ │AutoWait │                │
│  Service    │ │ Locators │ │         │                │
└─────────────┘ └─────────┘ └─────────┘                │
        │           │           │                       │
        └───────────┼───────────┘                       │
                    ▼                                   │
        ┌───────────────────┐                           │
        │ Strategy Evaluators│◄──────────────────────────┘
        │ (DOM, CDP, Vision, │
        │  Coords, Evidence) │
        └───────────────────┘
                    │
                    ▼
        ┌───────────────────┐       ┌───────────────────┐
        │  DecisionEngine   │◄──────│  TelemetryLogger  │
        └───────────────────┘       └───────────────────┘
                    │
                    ▼
        ┌───────────────────┐
        │  ActionExecutor   │
        └───────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
┌───────────────┐       ┌───────────────┐
│  background.ts │       │  TestRunner   │
└───────────────┘       └───────────────┘


        ┌───────────────────────────────────────┐
        │          Content Script               │
        ├───────────────────────────────────────┤
        │ ┌─────────────────────────────────┐   │
        │ │     RecordingOrchestrator       │   │
        │ └─────────────────────────────────┘   │
        │         │       │       │       │     │
        │         ▼       ▼       ▼       ▼     │
        │     ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
        │     │ DOM │ │Visn │ │Mouse│ │ Net │   │
        │     └─────┘ └─────┘ └─────┘ └─────┘   │
        │               │                       │
        │               ▼                       │
        │       ┌─────────────┐                 │
        │       │EvidenceBuffer│                │
        │       └─────────────┘                 │
        └───────────────────────────────────────┘
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Tesseract.js slow init | Lazy load, show progress |
| CDP detach on navigate | Re-attach automatically |
| Large recording files | Limit buffer size, compress |
| Strategy chain too long | Cap at 7 strategies |
| Vision OCR inaccurate | Confidence threshold 60% |
| Coordinates drift | Always last resort, warn user |
| Service worker sleep | Keep-alive pattern |
| Memory leaks | Proper cleanup on destroy |

---

## Success Criteria

### Functional
- [ ] Record actions with all 4 capture layers
- [ ] Generate 7-tier fallback chains
- [ ] Playback with automatic strategy selection
- [ ] Fall through chain on failures
- [ ] Log telemetry for all executions
- [ ] Display strategy usage in UI

### Performance
- [ ] Recording adds < 50ms latency per action
- [ ] Chain generation < 200ms
- [ ] Strategy evaluation < 100ms average
- [ ] Vision OCR < 3s with caching
- [ ] UI responsive during playback

### Quality
- [ ] TypeScript strict mode: 0 errors
- [ ] ESLint: 0 errors
- [ ] No console errors in production
- [ ] All specs implemented per documentation

---

## Completion Sign-Off

| Phase | Completed | Date | Verified By |
|-------|-----------|------|-------------|
| 3.1 Foundation | ☐ | | |
| 3.2 Core Services | ☐ | | |
| 3.3 Strategy System | ☐ | | |
| 3.4 Recording System | ☐ | | |
| 3.5 UI Components | ☐ | | |
| 3.6 Integration | ☐ | | |
| **Full Release** | ☐ | | |

---

**Phase 3 Specification Generation Complete: 46/46 files specified**
