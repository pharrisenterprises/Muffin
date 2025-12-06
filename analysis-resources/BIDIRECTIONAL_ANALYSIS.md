# BIDIRECTIONAL ANALYSIS: CURRENT vs PHASE 2 TARGET

**Generated:** December 6, 2025  
**Purpose:** Complete gap analysis with approved architecture decisions

---

## 1. CURRENT SYSTEM INVENTORY

### 1.1 Working Components (Need Regression Testing)
| Component | File | Status |
|-----------|------|--------|
| Background Service Worker | src/background/background.ts | ⚠️ Needs verification |
| Message Router (30+ actions) | src/background/background.ts | ⚠️ Needs verification |
| Content Script Recorder | src/contentScript/content.tsx | ⚠️ Needs verification |
| Content Script Replayer | src/contentScript/content.tsx | ⚠️ Needs verification |
| Page Interceptor (Shadow DOM) | src/contentScript/pageInterceptor.ts | ⚠️ Needs verification |
| IndexedDB via Dexie.js (v1) | src/common/services/indexedDB.ts | ⚠️ Needs verification |
| DOM Element Finder (7 fallbacks) | src/lib/elementFinder.ts | ⚠️ Needs verification |
| XPath Computation | src/lib/xpathUtils.ts | ⚠️ Needs verification |
| Label Extraction (16 heuristics) | src/lib/labelExtractor.ts | ⚠️ Needs verification |
| Dashboard UI | src/pages/Dashboard.tsx | ⚠️ Needs verification |
| Recorder UI | src/pages/Recorder.tsx | ⚠️ Needs verification |
| Field Mapper UI | src/pages/FieldMapper.tsx | ⚠️ Needs verification |
| Test Runner UI | src/pages/TestRunner.tsx | ⚠️ Needs verification |

**NOTE:** Tool was recently broken. All components marked for regression testing.

### 1.2 Missing Components (Phase 2 Scope)
| Component | Target Location | Complexity |
|-----------|-----------------|------------|
| CDPService | src/background/services/CDPService.ts | Medium |
| AccessibilityService | src/background/services/AccessibilityService.ts | Medium |
| PlaywrightLocators | src/background/services/PlaywrightLocators.ts | High |
| DecisionEngine | src/background/services/DecisionEngine.ts | High |
| AutoWaiting | src/background/services/AutoWaiting.ts | Medium |
| VisionEngine (enhanced) | src/lib/visionEngine.ts | High |
| FallbackChain Generator | src/lib/fallbackChainGenerator.ts | Medium |
| TelemetryLogger | src/lib/telemetryLogger.ts | Low |
| EvidenceBuffer | src/lib/evidenceBuffer.ts | Medium |
| Schema v3 Migration | src/lib/migrations/v3.ts | Medium |
| Native Messaging Host | separate/native-host/ | Medium (Phase 3) |
| **Recording Repository** | `repositories/` | Data access abstraction | LOW |

---

### 1.3 What Must CHANGE (Modifications Required)

| Component | Current State | Required Change | Impact |
|-----------|---------------|-----------------|--------|
---

## 2. WHAT MUST BE CREATED

### 2.1 New Type Definitions
```
src/types/
├── strategy.ts      (StrategyType, RecordedVia, LocatorStrategy, FallbackChain)
├── vision.ts        (VisionConfig, TextResult, ClickTarget, ConditionalConfig)
├── cdp.ts           (CDPNode, AXNode, LocatorResult, WaitOptions)
├── telemetry.ts     (TelemetryRecord, StrategyAttempt)
└── evidence.ts      (EvidenceRecord, EvidenceBuffer)
```

### 2.2 New Services
```
src/background/services/
├── CDPService.ts           (chrome.debugger wrapper)
├── AccessibilityService.ts (AX tree traversal)
├── PlaywrightLocators.ts   (getByRole, getByText, etc.)
├── DecisionEngine.ts       (strategy scoring and execution)
├── AutoWaiting.ts          (actionability checks)
└── strategies/
    ├── StrategyEvaluator.ts (interface)
    ├── DOMStrategy.ts
    ├── CDPStrategy.ts
    ├── VisionStrategy.ts
    └── CoordinatesStrategy.ts
```

### 2.3 New Libraries
```
src/lib/
├── visionEngine.ts         (Tesseract.js wrapper - enhanced)
├── evidenceBuffer.ts       (browser storage + native host)
├── fallbackChainGenerator.ts
├── telemetryLogger.ts
└── migrations/
    └── v3.ts               (schema migration)
```

### 2.4 New UI Components
```
src/components/
├── VisionBadge.tsx
├── StrategyIndicator.tsx
├── DelayControls.tsx
├── ConditionalClickConfig.tsx
├── TelemetryPanel.tsx
└── FallbackChainView.tsx
```

---

## 3. WHAT MUST CHANGE

### 3.1 Step Interface Extension
```typescript
// CURRENT
interface Step {
  id?: number;
  label: string;
  event: string;
  value?: string;
  selector?: string;
  xpath?: string;
  timestamp?: number;
}

// PHASE 2 (backward compatible - new fields optional)
interface RecordedStep extends Step {
  // New fields
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

### 3.2 Recording Interface Extension
```typescript
// CURRENT
interface Recording {
  id: string;
  name: string;
  steps: Step[];
  createdAt: number;
}

// PHASE 2 (backward compatible)
interface Recording {
  id: string;
  name: string;
  steps: RecordedStep[];
  createdAt: number;
  // New fields
  globalDelayMs?: number;
  loopStartIndex?: number;
  csvData?: string[][];
  columnMapping?: Record<string, number>;
  schemaVersion?: number;
  evidenceBufferId?: string;
}
```

### 3.3 Manifest Changes
```json
{
  "permissions": [
    "activeTab",
    "tabs",
    "scripting",
    "storage",
    "debugger",           // NEW: Required for CDP
    "nativeMessaging"     // NEW: Required for Native Host (Phase 3)
  ]
}
```

### 3.4 Message Router Additions
```typescript
// New message actions (12 total)
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

---

## 4. DEPENDENCY TREE

```
Phase A: Foundation
├── FND-001: Install Tesseract.js
├── FND-002: Update Manifest
├── FND-003: Create Directory Structure
└── FND-004 to FND-012: Type Definitions

Phase B: Data Layer
├── DAT-001: Schema v3 Definition
├── DAT-002: Migration Logic
└── DAT-003 to DAT-008: Repositories

Phase C: CDP Infrastructure (depends on A, B)
├── CDP-001: Debugger Permission
├── CDP-002: CDPService Skeleton
├── CDP-003: DOM Commands
├── CDP-004: Accessibility Service
├── CDP-005: getByRole
├── CDP-006: getByText/Label/Placeholder
├── CDP-007: Locator Chaining
├── CDP-008: AutoWaiting
├── CDP-009: DecisionEngine Core
└── CDP-010: Recording Integration

Phase D: Vision Engine (parallel with C)
├── VIS-001 to VIS-015: Vision implementation

Phase E: Decision Engine (depends on C, D)
├── DEC-001 to DEC-008: Strategy evaluators and scoring

Phase F: Integration (depends on E)
├── INT-001 to INT-012: Wiring everything together

Phase G: UI (parallel with F)
├── UI-001 to UI-012: New components

Phase H: Testing (depends on F, G)
├── TST-001 to TST-010: Unit, integration, E2E

Phase 3 (Future): Native Messaging Host
├── NMH-001 to NMH-005: Local storage enhancement
```

---

## 5. CRITICAL PATHS

### Minimum Viable Phase 2
```
FND-001 → FND-012 → DAT-001 → DAT-002 → CDP-001 → CDP-002 → CDP-009 → INT-005
```
This gives us: Types + Schema + CDPService + DecisionEngine + Playback Integration

### Full Phase 2
All 87 build cards in sequence per dependency tree.

### Phase 3 (Future)
Native Messaging Host for unlimited evidence storage.

---

## 6. RISKS AND MITIGATIONS

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| CDP API changes | Low | High | Pin to Chrome API version, monitor changelogs |
| Tesseract performance | Medium | Medium | Lazy loading, worker termination, caching |
| Memory pressure | Medium | High | Evidence pruning, Native Host offload |
| Schema migration failure | Low | Critical | Backup before migration, rollback support |
| Regression in existing features | High | High | Full regression testing on all sites |
| Copilot DOM resistance | High | Medium | CDP semantic locators, Vision fallback |

---

## 7. TEST SITE STATUS

| Site | Previous Status | Current Status | Priority |
|------|-----------------|----------------|----------|
| Claude.ai | ✅ Was working | ⚠️ Needs verification | High |
| Google Forms | ✅ Was working | ⚠️ Needs verification | High |
| Google Maps | ✅ Fixed with Vision | ⚠️ Needs verification | Medium |
| GitHub | ❓ Unknown | ❓ Needs testing | Medium |
| Copilot | ❌ Not working | ❌ PRIMARY FOCUS | Critical |

**Action:** Full regression test suite required after Phase 2 build complete.

---

**END OF BIDIRECTIONAL ANALYSIS**
