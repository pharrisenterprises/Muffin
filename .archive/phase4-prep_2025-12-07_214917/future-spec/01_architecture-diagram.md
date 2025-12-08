# ARCHITECTURE DIAGRAM: MULTI-LAYER RECORDING SYSTEM

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           MUFFIN LITE V2                                 │
│                     Multi-Layer Recording System                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                              UI LAYER                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  Recorder.tsx                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │
│  │ Start Record │  │ Add Variable │  │ Save/Discard │                 │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                 │
│         │                  │                  │                          │
│         ▼                  ▼                  ▼                          │
└─────────┼──────────────────┼──────────────────┼──────────────────────────┘
          │                  │                  │
          │                  │                  │
┌─────────▼──────────────────▼──────────────────▼──────────────────────────┐
│                        BACKGROUND SERVICE WORKER                          │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                   RECORDING ORCHESTRATOR                         │    │
│  │  - Coordinates all 4 layers                                      │    │
│  │  - Manages lifecycle (start/stop/save)                           │    │
│  │  - Routes events to Decision Engine                              │    │
│  └────────────┬──────────────────────────────────┬──────────────────┘    │
│               │                                   │                       │
│               ▼                                   ▼                       │
│  ┌────────────────────────┐        ┌──────────────────────────────┐    │
│  │   DECISION ENGINE      │        │     EVIDENCE BUFFER          │    │
│  │  - Scores strategies   │◄──────►│  - IndexedDB (temporary)     │    │
│  │  - Selects best method │        │  - 4 layer data streams      │    │
│  │  - Builds fallback chain│        │  - Tagged by stepId          │    │
│  └────────────────────────┘        └──────────────────────────────┘    │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
          │                  │                  │                  │
          │                  │                  │                  │
          ▼                  ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        CONTENT SCRIPT (Target Page)                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │   LAYER A    │  │   LAYER B    │  │   LAYER C    │  │  LAYER D   │ │
│  │     DOM      │  │    VISION    │  │    MOUSE     │  │  NETWORK   │ │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤  ├────────────┤ │
│  │ • Selectors  │  │ • Screenshots│  │ • Positions  │  │ • GraphQL  │ │
│  │ • XPath      │  │ • OCR data   │  │ • Trails     │  │ • REST API │ │
│  │ • Bundles    │  │ • Text match │  │ • Hover time │  │ • Fetch    │ │
│  │ • Shadow DOM │  │ • Regions    │  │ • Click (x,y)│  │ • WebSocket│ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬─────┘ │
│         │                  │                  │                  │       │
│         └──────────────────┴──────────────────┴──────────────────┘       │
│                                   │                                       │
│                                   ▼                                       │
│                    ┌──────────────────────────────┐                      │
│                    │   EVENT AGGREGATOR           │                      │
│                    │  - Correlates 4 layer data   │                      │
│                    │  - Timestamps everything     │                      │
│                    │  - Sends to Background       │                      │
│                    └──────────────────────────────┘                      │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

## Data Flow During Recording

```
USER ACTION (Click button)
        │
        ▼
┌───────────────────────────────────────┐
│  LAYER A: DOM Capture                 │
│  - querySelector('#submit-btn')       │
│  - XPath: /html/body/div[2]/button    │
│  - Bundle: {id, class, aria}          │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│  LAYER B: Vision Capture              │
│  - Screenshot of viewport             │
│  - OCR: "Submit" text at (500, 300)   │
│  - Region: {x:480, y:285, w:80, h:40} │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│  LAYER C: Mouse Capture               │
│  - Movement: [(490,290), (500,300)]   │
│  - Hover duration: 150ms              │
│  - Click coordinates: (500, 300)      │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│  LAYER D: Network Capture             │
│  - POST /api/submit triggered         │
│  - Timestamp correlation              │
│  - Response: 200 OK                   │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│  EVENT AGGREGATOR                     │
│  Bundles all 4 layers into:           │
│  {                                    │
│    stepId: "step_001",                │
│    timestamp: 1733500000,             │
│    domData: {...},                    │
│    visionData: {...},                 │
│    mouseData: {...},                  │
│    networkData: {...}                 │
│  }                                    │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│  RECORDING ORCHESTRATOR               │
│  - Stores in Evidence Buffer          │
│  - Passes to Decision Engine          │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│  DECISION ENGINE                      │
│  Scores each layer:                   │
│  - DOM: 95 (ID selector, unique)      │
│  - Vision: 85 (OCR match, stable)     │
│  - Mouse: 70 (coordinates valid)      │
│  - Network: 60 (indirect correlation) │
│                                       │
│  Selected: DOM (95 confidence)        │
│  Fallback: [Vision, Mouse, Network]   │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│  EVIDENCE BUFFER (IndexedDB)          │
│  Stores complete evidence:            │
│  - stepId: "step_001"                 │
│  - selectedStrategy: "dom"            │
│  - confidence: 95                     │
│  - allLayers: [domData, visionData...] │
│  - usedInFinal: false (not yet saved) │
└───────────────────────────────────────┘
```

## Save/Approve Data Flow

```
USER CLICKS "SAVE"
        │
        ▼
┌───────────────────────────────────────┐
│  RECORDING ORCHESTRATOR               │
│  Triggers saveApprovedRecording()     │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│  EVIDENCE PRUNING                     │
│  Query: usedInFinal === true          │
│                                       │
│  BEFORE:                              │
│  - 100 screenshots (50MB)             │
│  - 500 mouse positions (2MB)          │
│  - 200 DOM snapshots (10MB)           │
│  - 50 network logs (3MB)              │
│  Total: ~65MB                         │
│                                       │
│  AFTER:                               │
│  - 2 screenshots (1MB) [Vision steps] │
│  - 10 selectors (50KB) [DOM steps]    │
│  - 2 coordinates (1KB) [Coord steps]  │
│  Total: ~1MB                          │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│  APPROVED RECORDING                   │
│  Saved to chrome.storage.local        │
│  {                                    │
│    id: "rec_001",                     │
│    steps: [                           │
│      {                                │
│        strategy: "dom",               │
│        selector: "#submit-btn",       │
│        evidence: {...} // minimal     │
│      }                                │
│    ]                                  │
│  }                                    │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│  EVIDENCE BUFFER CLEANUP              │
│  await evidenceBuffer.clear()         │
│  - All temporary data wiped           │
│  - IndexedDB quota freed              │
└───────────────────────────────────────┘
```

## Playback Architecture

```
USER CLICKS "RUN TEST"
        │
        ▼
┌───────────────────────────────────────┐
│  TEST ORCHESTRATOR                    │
│  Loads approved recording steps       │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│  STEP EXECUTOR                        │
│  For each step:                       │
│  - Routes by selectedStrategy         │
│  - Applies fallback chain if fails    │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│  STRATEGY EXECUTION                   │
│                                       │
│  if (strategy === 'dom') {            │
│    element = findBySelector()         │
│    if (!element) {                    │
│      fallback to 'vision'             │
│    }                                  │
│  }                                    │
│                                       │
│  if (strategy === 'vision') {         │
│    screenshot = capture()             │
│    match = ocrFind(targetText)        │
│    click(match.x, match.y)            │
│  }                                    │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│  VISION VERIFICATION (Optional)       │
│  - Screenshot after action            │
│  - Verify expected result appeared    │
│  - Log confidence score               │
└───────────────────────────────────────┘
```

## Component Dependencies

```
┌──────────────────────────────────────────┐
│         RECORDING ORCHESTRATOR            │
│         (Central Coordinator)             │
└────┬─────────────────────────────────┬───┘
     │                                 │
     ├─────────────┬───────────────────┼────────────┐
     │             │                   │            │
     ▼             ▼                   ▼            ▼
┌─────────┐  ┌──────────┐  ┌──────────────┐  ┌─────────┐
│ Layer A │  │ Layer B  │  │   Layer C    │  │ Layer D │
│  (DOM)  │  │ (Vision) │  │   (Mouse)    │  │(Network)│
└─────────┘  └──────────┘  └──────────────┘  └─────────┘
     │             │                   │            │
     └─────────────┴───────────────────┴────────────┘
                   │
                   ▼
          ┌─────────────────┐
          │ DECISION ENGINE │
          └────────┬─────────┘
                   │
                   ▼
          ┌─────────────────┐
          │EVIDENCE BUFFER  │
          └─────────────────┘
```

## Module Boundaries

| Module | Responsibilities | Dependencies |
|--------|------------------|--------------|
| **Recording Orchestrator** | Lifecycle, coordination, event routing | All 4 layers, Decision Engine, Evidence Buffer |
| **Decision Engine** | Strategy scoring, selection, verification | Evidence Buffer, Vision Engine |
| **Evidence Buffer** | Temporary storage, pruning, cleanup | IndexedDB, Dexie.js |
| **Layer A (DOM)** | Selector capture, XPath, shadow DOM | Content script APIs |
| **Layer B (Vision)** | Screenshots, OCR, region detection | Vision Engine, Tesseract.js |
| **Layer C (Mouse)** | Movement tracking, coordinates, hover | Content script mouse events |
| **Layer D (Network)** | GraphQL/REST interception, correlation | Fetch/XHR monkey-patching |
| **Step Executor** | Playback routing, fallback handling | All strategy executors |
| **Vision Verification** | Real-time validation during playback | Vision Engine |
