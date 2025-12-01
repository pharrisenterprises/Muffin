# MUFFIN LITE - BIDIRECTIONAL ANALYSIS

> **Generated:** December 2025  
> **Purpose:** Complete gap analysis between current system and future Vision-enabled state  
> **Status:** Analysis Only (No Solutions)

---

## 1. CURRENT vs FUTURE — DELTA MAP

### 1.1 What Exists Today (CURRENT)

| Component | Location | Status | Lines |
|-----------|----------|--------|-------|
| DOM Event Recording | `content.tsx` | ✅ Exists | ~500 |
| DOM Element Finding (7 strategies) | `content.tsx` | ✅ Exists | ~200 |
| Label Extraction (16 heuristics) | `content.tsx` | ✅ Exists | ~150 |
| XPath Computation | `content.tsx` | ✅ Exists | ~50 |
| Shadow DOM Interception | `page-interceptor.tsx` | ✅ Exists | ~50 |
| Iframe Traversal | `content.tsx` | ✅ Exists | ~100 |
| DOM Playback | `content.tsx` | ✅ Exists | ~400 |
| IndexedDB Storage (Dexie) | `indexedDB.ts` | ✅ Exists | ~73 |
| Background Message Router | `background.ts` | ✅ Exists | ~323 |
| Recorder UI (React) | `Recorder.tsx` | ✅ Exists | ~400 |
| TestRunner UI (React) | `TestRunner.tsx` | ✅ Exists | ~400 |
| FieldMapper UI (React) | `FieldMapper.tsx` | ✅ Exists | ~350 |
| CSV Parsing (PapaParse) | Various | ✅ Exists | Integrated |
| Auto-Mapping (string-similarity) | FieldMapper | ✅ Exists | Integrated |
| Step Reordering (DnD) | StepTable | ✅ Exists | Integrated |
| Notification Overlay | content.tsx | ✅ Exists | ~50 |

---

### 1.2 What is MISSING (Must Be Invented)

| Component | Location | Purpose | Complexity |
|-----------|----------|---------|------------|
| **Vision Engine** | `src/lib/visionEngine.ts` | Tesseract.js OCR wrapper | HIGH |
| **Screenshot Capture** | Vision Engine | `chrome.tabs.captureVisibleTab` | LOW |
| **OCR Text Recognition** | Vision Engine | Extract text + coordinates | HIGH |
| **Vision Click** | `visionHandlers.ts` | Click at coordinates | MEDIUM |
| **Vision Type** | `visionHandlers.ts` | Type into focused element | MEDIUM |
| **Vision Key** | `visionHandlers.ts` | Send keyboard shortcuts | MEDIUM |
| **Vision Scroll** | `visionHandlers.ts` | Scroll to find elements | LOW |
| **Conditional Click Loop** | Vision Engine | Poll + click until timeout | HIGH |
| **Dropdown Handler** | Vision Engine | Click → wait → click option | MEDIUM |
| **Scroll-to-Find** | Vision Engine | Scroll + OCR retry loop | MEDIUM |
| **Position-Based CSV Mapping** | `csvMapping.ts` | Map by occurrence order | MEDIUM |
| **Step Executor** | `stepExecutor.ts` | Unified step execution | MEDIUM |
| **API Client** | `api/client.ts` | Type-safe message wrapper | MEDIUM |
| **Recording Repository** | `repositories/` | Data access abstraction | LOW |

---

### 1.3 What Must CHANGE (Modifications Required)

| Component | Current State | Required Change | Impact |
|-----------|---------------|-----------------|--------|
| **Step Interface** | 9 fields, DOM-only | Add 7 new fields (recordedVia, coordinates, ocrText, confidenceScore, delaySeconds, conditionalConfig) | HIGH - Schema change |
| **Recording Interface** | Steps only | Add loopStartIndex, globalDelayMs, conditionalDefaults | MEDIUM |
| **content.tsx** | 1450 lines monolithic | Add Vision fallback trigger, import handlers | HIGH |
| **background.ts** | 20+ action types | Add 5+ Vision message types | MEDIUM |
| **indexedDB.ts** | Schema v1 | Schema v2 with migration | MEDIUM |
| **Recorder.tsx** | Basic toolbar | Add loop dropdown, delay input, badges | HIGH |
| **TestRunner.tsx** | Simple row iteration | Add Vision Engine init, delay logic, conditional | HIGH |
| **StepRow.tsx** | Basic display | Add 4 badge types, new menu items | MEDIUM |
| **manifest.json** | Basic permissions | Add tabs, scripting, host_permissions, web_accessible_resources | LOW |
| **package.json** | No OCR | Add tesseract.js ~3MB | LOW |

---

### 1.4 What Must Be REPLACED

| Component | Current | Replacement | Reason |
|-----------|---------|-------------|--------|
| **Random Delays** | Hardcoded 1000-3000ms | Configurable global + per-step | User control needed |
| **Simple Row Iteration** | All steps every row | Loop start index slice | Skip login steps |
| **Manual Approval Clicks** | User intervention | Automated conditional polling | Core use case |
| **DOM-Only Recording** | Fails on Monaco/Copilot | DOM + Vision fallback | Complex editors |

---

### 1.5 What Must Be EXTENDED

| Component | Current Capability | Extension Required |
|-----------|-------------------|-------------------|
| **Element Finding** | 7 DOM strategies | +1 Vision/coordinate strategy |
| **Step Events** | click, input, enter, open | +dropdown, +conditional-click |
| **Toolbar Controls** | Record, Add Variable, Export | +Loop Start, +Delay, +Static toggle |
| **Three-Dot Menu** | Edit, Delete | +Set Delay, +Configure Conditional, +View Vision Data |
| **Add Variable** | Input, Click | +Conditional Click |
| **Message Types** | 20 existing | +VISION_CLICK, +VISION_TYPE, +VISION_KEY, +VISION_SCROLL, etc. |

---

### 1.6 What is ALREADY COMPATIBLE (No Changes Needed)

| Component | Reason |
|-----------|--------|
| **Dashboard UI** | Project management unchanged |
| **React Component Library** | Radix UI/shadcn already supports new patterns |
| **Redux Store** | Minimal state (theme only), not affected |
| **CSS/Tailwind** | Styling system adequate |
| **Build System** | Vite handles new dependencies |
| **Notification Overlay** | Reusable for Vision feedback |
| **XPath Computation** | Still used for DOM steps |
| **Label Extraction** | Still used for DOM steps |

---

### 1.7 What is INCOMPATIBLE (Needs Redesign)

| Component | Incompatibility | Required Redesign |
|-----------|-----------------|-------------------|
| **CSV Column Mapping** | Header-name based, duplicates add _1, _2 suffix | Position-based algorithm (map by step index occurrence) |
| **Playback Loop** | Executes all steps every row | Must slice based on loopStartIndex |
| **Delay Logic** | None or random | Structured: global AFTER, per-step BEFORE |
| **Step Type System** | Loose string typing | Strict union type for event field |
| **Value Injection** | By label match | By absolute step index |

---

## 2. DEPENDENCY TREE

### 2.1 Feature Dependencies

```
Vision Engine (FOUNDATION - Must Build First)
├── Vision Recording (depends on Vision Engine)
│   └── UI Badges (depends on Vision Recording)
├── Vision Playback (depends on Vision Engine)
│   └── DOM/Vision Execution Switch (depends on Vision Playback)
├── Conditional Click (depends on Vision Engine)
│   └── Auto-Detection Failsafe (depends on Conditional Click)
└── Dropdown Handler (depends on Vision Engine)

Time Delay (INDEPENDENT - Can Parallel)
├── Global Delay Config
├── Per-Step Delay Config
├── Delay Execution Logic
└── Delay Badges

CSV Loop (INDEPENDENT - Can Parallel)
├── Loop Start Index Config
├── Position-Based Mapping
├── Row Iteration Slice Logic
└── Loop Start Badge
```

### 2.2 Component Dependencies

```
Layer 0 (No Dependencies):
├── Type Definitions (Step, Recording, ConditionalConfig)
├── csvMapping.ts (pure algorithm)
└── Validation utilities

Layer 1 (Depends on Layer 0):
├── visionEngine.ts (depends on Types)
├── stepExecutor.ts (depends on Types)
└── recordingRepository.ts (depends on Types, Dexie)

Layer 2 (Depends on Layer 1):
├── visionHandlers.ts (depends on visionEngine messaging)
├── content.tsx modifications (depends on visionHandlers)
└── background.ts modifications (depends on new message types)

Layer 3 (Depends on Layer 2):
├── Recorder.tsx modifications (depends on all new features)
├── TestRunner.tsx modifications (depends on Vision Engine, delays, loops)
└── StepRow.tsx modifications (depends on new Step fields)
```

### 2.3 Build Sequence Implications

**MUST BUILD SEQUENTIALLY:**
1. Vision Engine (all Vision features depend on it)
2. Vision Handlers (playback depends on handlers)
3. Vision Recording (needs handlers working)

**CAN BUILD IN PARALLEL:**
- Time Delay (independent data model changes)
- CSV Loop (independent iteration logic)
- UI Badges (can stub while features incomplete)

---

## 3. BUILD SEQUENCE (Macro Roadmap)

### Phase 1: Foundation (60 min) — NON-PARALLELIZABLE
| Order | Task | Dependencies | Risk |
|-------|------|--------------|------|
| 1.1 | Install tesseract.js | None | LOW |
| 1.2 | Create visionEngine.ts skeleton | tesseract.js | MEDIUM |
| 1.3 | Implement captureScreen() | Chrome tabs API | LOW |
| 1.4 | Implement recognizeText() | Tesseract worker | HIGH |
| 1.5 | Implement findText() | recognizeText | MEDIUM |
| 1.6 | Implement clickAtCoordinates() | findText | MEDIUM |
| 1.7 | Create visionHandlers.ts | visionEngine | MEDIUM |
| 1.8 | Update manifest.json | None | LOW |
| **GATE** | **Vision Engine works in isolation** | | |

### Phase 2: Recording Enhancement (45 min) — DEPENDS ON PHASE 1
| Order | Task | Dependencies | Risk |
|-------|------|--------------|------|
| 2.1 | Extend Step interface | None | LOW |
| 2.2 | Add Vision fallback trigger | Step interface | HIGH |
| 2.3 | Capture coordinates + OCR text | visionEngine | MEDIUM |
| 2.4 | Add Vision badge to UI | Step interface | LOW |
| **GATE** | **Can record Copilot prompt input** | | |

### Phase 3: Time Delay (30 min) — CAN PARALLEL WITH 4
| Order | Task | Dependencies | Risk |
|-------|------|--------------|------|
| 3.1 | Add globalDelayMs to Recording | None | LOW |
| 3.2 | Add delaySeconds to Step | None | LOW |
| 3.3 | Add toolbar delay input | UI only | LOW |
| 3.4 | Add three-dot menu delay option | UI only | LOW |
| 3.5 | Implement delay execution | Step changes | LOW |
| 3.6 | Add delay badge | UI only | LOW |
| **GATE** | **Delays work correctly** | | |

### Phase 4: CSV Loop (45 min) — CAN PARALLEL WITH 3
| Order | Task | Dependencies | Risk |
|-------|------|--------------|------|
| 4.1 | Add loopStartIndex to Recording | None | LOW |
| 4.2 | Add loop start dropdown | UI only | LOW |
| 4.3 | Implement position-based mapping | Algorithm | MEDIUM |
| 4.4 | Implement row iteration slice | loopStartIndex | MEDIUM |
| 4.5 | Add loop start badge | UI only | LOW |
| **GATE** | **Multiple rows execute correctly** | | |

### Phase 5: Conditional Click (45 min) — DEPENDS ON PHASE 1
| Order | Task | Dependencies | Risk |
|-------|------|--------------|------|
| 5.1 | Add conditionalConfig to Step | None | LOW |
| 5.2 | Add conditionalDefaults to Recording | None | LOW |
| 5.3 | Add Conditional Click to + Add Variable | UI only | LOW |
| 5.4 | Create config dialog | UI only | MEDIUM |
| 5.5 | Implement waitAndClickButtons() | visionEngine | HIGH |
| 5.6 | Implement auto-detection failsafe | waitAndClickButtons | MEDIUM |
| 5.7 | Add conditional badge | UI only | LOW |
| **GATE** | **Approval buttons auto-clicked** | | |

### Phase 6: Integration (30 min) — DEPENDS ON ALL
| Order | Task | Dependencies | Risk |
|-------|------|--------------|------|
| 6.1 | Full Copilot workflow test | All features | HIGH |
| 6.2 | Multiple CSV rows test | All features | MEDIUM |
| 6.3 | Edge case testing | All features | MEDIUM |
| 6.4 | Timeout adjustment | Testing results | LOW |
| **GATE** | **Production ready** | | |

---

## 4. ARCHITECTURE GAPS & RISKS

### 4.1 Missing Data Models

| Gap | Impact | Location |
|-----|--------|----------|
| `ConditionalConfig` interface | Cannot store conditional settings | Types |
| `VisionConfig` interface | Cannot configure OCR thresholds | Types |
| `TextResult` interface | Cannot type OCR results | Types |
| `ClickTarget` interface | Cannot type click targets | Types |
| `ConditionalClickResult` interface | Cannot type polling results | Types |
| Extended `Recording` interface | Cannot store loop/delay config | Types |
| Schema v2 migration | Old recordings incompatible | IndexedDB |

### 4.2 Integration Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Tesseract.js 3MB bundle** | HIGH | Slower initial load | Lazy load on first use |
| **OCR latency (500-1000ms)** | HIGH | Slower playback | Accept tradeoff, cache when possible |
| **Coordinate drift on resize** | MEDIUM | Wrong click location | Warn user, re-record |
| **Shadow DOM text invisible to OCR** | HIGH | Cannot capture some text | Fall back to DOM |
| **Cross-origin iframe blocking** | MEDIUM | Cannot access some frames | Document limitation |
| **Chrome permission rejection** | LOW | Extension broken | Test permissions early |
| **Tesseract worker crash** | LOW | Playback fails | Try/catch, reinitialize |

### 4.3 Timing/Race Conditions

| Condition | Scenario | Risk Level |
|-----------|----------|------------|
| **Vision fallback timeout** | User types very slowly, 500ms expires before input | MEDIUM |
| **Screenshot during animation** | OCR captures mid-transition state | MEDIUM |
| **Conditional polling vs page load** | Button appears during OCR processing | LOW |
| **Global vs per-step delay overlap** | Logic unclear which applies | LOW (spec defined) |
| **DOM event fires during Vision capture** | Double-recording possible | MEDIUM |
| **Service worker termination** | Mid-OCR background dies | MEDIUM |

### 4.4 State Management Issues

| Issue | Current State | Future Concern |
|-------|---------------|----------------|
| **Vision Engine lifecycle** | N/A | Must init before playback, terminate after |
| **Recording session state** | isRecording flag | Add Vision fallback pending state |
| **Playback progress** | Row/step counters | Add conditional click counter |
| **OCR worker state** | N/A | Must track initialized/busy/terminated |
| **Delay countdown** | N/A | UI feedback during long delays |

---

## 5. INVENTION REQUIRED LIST

### 5.1 Core Inventions (No Existing Code)

| # | Invention | Complexity | Est. Lines |
|---|-----------|------------|------------|
| 1 | **VisionEngine class** | HIGH | ~400 |
| 2 | **Tesseract.js integration** | HIGH | ~100 |
| 3 | **OCR result filtering** | MEDIUM | ~50 |
| 4 | **Coordinate-based click dispatch** | MEDIUM | ~30 |
| 5 | **Keyboard event simulation** | MEDIUM | ~40 |
| 6 | **Conditional polling loop** | HIGH | ~80 |
| 7 | **Dropdown visual handling** | MEDIUM | ~40 |
| 8 | **Scroll-to-find algorithm** | MEDIUM | ~50 |
| 9 | **Position-based column mapping** | MEDIUM | ~60 |
| 10 | **Vision fallback trigger logic** | HIGH | ~80 |
| 11 | **Step execution with delays** | MEDIUM | ~50 |
| 12 | **Row iteration with slice** | LOW | ~30 |
| 13 | **Auto-detection failsafe** | MEDIUM | ~40 |
| 14 | **Vision data capture (coords/OCR)** | MEDIUM | ~50 |

### 5.2 UI Inventions (No Existing Components)

| # | Invention | Complexity | Est. Lines |
|---|-----------|------------|------------|
| 15 | **Loop Start Dropdown** | LOW | ~40 |
| 16 | **Global Delay Input** | LOW | ~30 |
| 17 | **Per-Step Delay Dialog** | LOW | ~50 |
| 18 | **Conditional Config Dialog** | MEDIUM | ~100 |
| 19 | **Vision Badge Component** | LOW | ~20 |
| 20 | **Loop Start Badge Component** | LOW | ~20 |
| 21 | **Delay Badge Component** | LOW | ~20 |
| 22 | **Conditional Badge Component** | LOW | ~20 |
| 23 | **View Vision Data Panel** | LOW | ~40 |

### 5.3 Infrastructure Inventions

| # | Invention | Complexity | Est. Lines |
|---|-----------|------------|------------|
| 24 | **VISION_CLICK message handler** | LOW | ~30 |
| 25 | **VISION_TYPE message handler** | LOW | ~40 |
| 26 | **VISION_KEY message handler** | MEDIUM | ~50 |
| 27 | **VISION_SCROLL message handler** | LOW | ~20 |
| 28 | **VISION_GET_ELEMENT handler** | LOW | ~30 |
| 29 | **Schema v2 migration** | MEDIUM | ~40 |
| 30 | **API client wrapper** | MEDIUM | ~150 |

**Total Estimated New Code: ~1,800 lines**

---

## 6. SUMMARY FOR HUMAN REVIEW

### 6.1 Most Urgent Gaps

| Priority | Gap | Reason |
|----------|-----|--------|
| **P0** | Vision Engine implementation | ALL Vision features depend on it |
| **P0** | Step interface extension | ALL features need new fields |
| **P0** | Schema v2 migration | Backward compatibility required |
| **P1** | Vision fallback recording | Core use case (Copilot) |
| **P1** | Conditional click polling | Core use case (approvals) |
| **P2** | Position-based CSV mapping | Duplicate headers fail currently |
| **P2** | Delay configuration UI | User control over timing |

### 6.2 Biggest Risks

| Risk | Severity | Likelihood | Notes |
|------|----------|------------|-------|
| **Tesseract.js OCR accuracy** | HIGH | MEDIUM | May fail on low contrast, small text |
| **Bundle size bloat (3MB+)** | MEDIUM | HIGH | Unavoidable with Tesseract |
| **Coordinate drift** | HIGH | MEDIUM | Window resize breaks recordings |
| **Service worker termination** | MEDIUM | LOW | Long OCR may exceed timeout |
| **Cross-origin restrictions** | MEDIUM | MEDIUM | Some sites block screenshots |
| **Complex editor support** | HIGH | MEDIUM | Monaco/Copilot may resist Vision |

### 6.3 Questions Requiring Human Decision

| # | Question | Options | Recommendation |
|---|----------|---------|----------------|
| 1 | **Should Vision Engine lazy-load?** | (A) Load on startup, (B) Load on first use | B - reduces initial bundle |
| 2 | **What OCR confidence threshold?** | 50%, 60%, 70% | 60% (spec default) |
| 3 | **How long for Vision fallback timeout?** | 300ms, 500ms, 1000ms | 500ms (spec default) |
| 4 | **Should scroll-to-find be configurable?** | Fixed 3 retries vs user setting | Fixed (simpler) |
| 5 | **Auto-detection on EVERY step or opt-in?** | Always vs enabled flag | Always (spec default) |
| 6 | **Store screenshots for debugging?** | Yes (storage cost) vs No (privacy) | No (spec default) |
| 7 | **Support Vision recording in iframes?** | Full support vs main frame only | Main frame only (simpler) |
| 8 | **What happens if Vision Engine fails to init?** | Block playback vs DOM-only fallback | DOM-only fallback |

---

## APPENDIX A: FILE CHANGE SUMMARY

### New Files (14)
```
src/lib/visionEngine.ts           # ~400 lines
src/lib/csvMapping.ts             # ~60 lines
src/lib/stepExecutor.ts           # ~100 lines
src/lib/api/client.ts             # ~150 lines
src/lib/repositories/recordingRepository.ts  # ~80 lines
src/lib/validation/stepValidation.ts         # ~60 lines
src/lib/validation/recordingValidation.ts    # ~40 lines
src/contentScript/visionHandlers.ts          # ~200 lines
src/components/badges/VisionBadge.tsx        # ~20 lines
src/components/badges/LoopBadge.tsx          # ~20 lines
src/components/badges/DelayBadge.tsx         # ~20 lines
src/components/badges/ConditionalBadge.tsx   # ~20 lines
src/components/dialogs/DelayDialog.tsx       # ~50 lines
src/components/dialogs/ConditionalDialog.tsx # ~100 lines
```

### Modified Files (10)
```
src/contentScript/content.tsx     # +100 lines (Vision fallback)
src/background/background.ts      # +50 lines (new message types)
src/common/services/indexedDB.ts  # +40 lines (schema v2)
src/pages/Recorder.tsx            # +80 lines (toolbar, badges)
src/pages/TestRunner.tsx          # +150 lines (Vision playback)
src/components/StepRow.tsx        # +60 lines (badges, menu)
src/types/index.ts                # +100 lines (new interfaces)
package.json                      # +1 dependency
manifest.json                     # +10 lines (permissions)
vite.config.ts                    # possible WASM config
```

---

## APPENDIX B: CURRENT SYSTEM KNOWN ISSUES

These existing issues in the current system should be considered during migration:

1. **Monolithic content.tsx** (1450 lines) - makes modification risky
2. **No schema versioning** - migration must add versioning
3. **Steps stored in project.recorded_steps** - future uses separate Recording table
4. **No TypeScript strict mode** - type errors may surface
5. **Unused dependencies** (Firebase, Axios, jQuery) - should clean up
6. **No unit tests** - cannot verify non-regression
7. **React in content scripts** - unnecessary overhead (120KB+)

---

*End of Bidirectional Analysis*
