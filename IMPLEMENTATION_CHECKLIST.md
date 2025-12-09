# Muffin Phase 4 Implementation Checklist

## Overview

Phase 4 implements the **7-Tier Intelligent Playback System** with multi-layer recording,
strategy-based element location, and comprehensive telemetry.

---

## Core Services

### Background Services (`src/background/services/`)

| Service | File | Status | Description |
|---------|------|--------|-------------|
| CDPService | CDPService.ts | ✅ | Chrome DevTools Protocol integration |
| VisionService | VisionService.ts | ✅ | Screenshot capture and OCR |
| DecisionEngine | DecisionEngine.ts | ✅ | 7-tier fallback orchestration |
| TelemetryLogger | TelemetryLogger.ts | ✅ | Metrics and run history |
| ActionExecutor | ActionExecutor.ts | ✅ | Step execution |
| AutoWaiting | AutoWaiting.ts | ✅ | Smart wait conditions |

### Strategy Evaluators (`src/background/services/strategies/`)

| Strategy | Priority | Confidence | Description |
|----------|----------|------------|-------------|
| CDP Semantic | 1 | 0.95 | Playwright-style role/name locators |
| CDP Power | 2 | 0.92 | Accessibility tree queries |
| DOM Selector | 3 | 0.90 | ID-based selectors |
| CSS Selector | 4 | 0.85 | CSS path selectors |
| XPath | 5 | 0.80 | XPath expressions |
| Vision OCR | 6 | 0.70 | Text recognition fallback |
| Coordinates | 7 | 0.60 | Screen position (last resort) |

---

## Recording System

### Content Script (`src/contentScript/`)

| Component | File | Status | Description |
|-----------|------|--------|-------------|
| RecordingOrchestrator | RecordingOrchestrator.ts | ✅ | Multi-layer recording coordinator |
| content.tsx | content.tsx | ✅ | V1/V2 message handlers |

### Capture Layers

| Layer | Default | Description |
|-------|---------|-------------|
| DOM | ✅ On | Selectors, XPath, attributes |
| Vision | ❌ Off | Screenshots for OCR |
| Mouse | ✅ On | Movement patterns |
| Network | ❌ Off | Request tracking |

---

## UI Components (`src/components/`)

| Component | File | Status | Description |
|-----------|------|--------|-------------|
| StrategyBadge | StrategyBadge.tsx | ✅ | Strategy type indicator |
| LayerIndicator | LayerIndicator.tsx | ✅ | Recording layer status |
| StrategyChart | StrategyChart.tsx | ✅ | Strategy performance chart |
| RunHistory | RunHistory.tsx | ✅ | Recent runs list |

---

## Pages (`src/pages/`)

| Page | File | Status | Description |
|------|------|--------|-------------|
| Recorder | Recorder.tsx | ✅ | V1/V2 recording UI |
| TestRunner | TestRunner.tsx | ✅ | Strategy-aware playback |
| Analytics | Analytics.tsx | ✅ | Telemetry dashboard |

---

## Message Handlers

### Background → Content Script

| Message | Handler | Description |
|---------|---------|-------------|
| START_RECORDING | V1 | Basic recording |
| STOP_RECORDING | V1 | Stop basic recording |
| START_RECORDING_V2 | V2 | Multi-layer recording |
| STOP_RECORDING_V2 | V2 | Stop with session data |
| PAUSE_RECORDING_V2 | V2 | Pause capture |
| RESUME_RECORDING_V2 | V2 | Resume capture |

### UI → Background

| Message | Handler | Description |
|---------|---------|-------------|
| EXECUTE_STEP | Background | Run step with fallback chain |
| GET_SERVICE_STATUS | Background | Check service availability |
| GET_ANALYTICS | Background | Fetch telemetry data |
| ATTACH_CDP | Background | Attach debugger to tab |
| DETACH_CDP | Background | Detach debugger |

---

## Type Definitions (`src/types/`)

| File | Exports |
|------|---------|
| index.ts | All shared types |
| analytics.ts | StrategyMetrics, RunSummary, DashboardData |
| strategy.ts | StrategyType, StepResult, FallbackChain |
| recording.ts | RecordedStep, RecordingSession |

---

## Tests (`src/__tests__/integration/`)

| Test File | Coverage |
|-----------|----------|
| setup.ts | Chrome API mocks |
| recording.test.ts | V1/V2 recording flow |
| playback.test.ts | EXECUTE_STEP, strategies |
| fallback.test.ts | 7-tier fallback chain |
| messaging.test.ts | Chrome messaging |

---

## MVS v8.0 Compliance

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Label counter reset | ✅ | resetLabelSequence() on START_RECORDING |
| CSV header trimming | ✅ | .trim() in TestRunner |
| Case-insensitive matching | ✅ | .toLowerCase() comparison |
| File input type display | ✅ | Special handling in Recorder |
| Duplicate label handling | ✅ | Sequence numbering |

---

## Verification Commands

```powershell
# TypeScript check
npx tsc --noEmit

# Run tests
npm test

# Build extension
npm run build

# Load in Chrome
# 1. chrome://extensions
# 2. Developer mode ON
# 3. Load unpacked → dist/
```

---

## Completion Status

- [x] Phase 1: Foundation (Prompts 1-10)
- [x] Phase 2: Recording (Prompts 11-20)
- [x] Phase 3: Playback (Prompts 21-30)
- [x] Phase 4: Intelligence (Prompts 31-46)

**Phase 4 Complete: ✅**
