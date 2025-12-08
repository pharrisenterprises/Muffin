# MUFFIN LITE - FUTURE STATE OVERVIEW

> **Version:** 2.1 | **Status:** Specification  
> **Purpose:** Define the target state for Muffin Lite with Vision/OCR capabilities

---

## EXECUTIVE SUMMARY

Muffin Lite transforms the existing TestFlow browser extension by adding **Vision/OCR as the central automation engine**. This enables recording and playback of complex web interactions that traditional DOM-based approaches cannot handle.

### Vision Statement

**"Any element you can see, Muffin Lite can interact with."**

Traditional browser automation fails when:
- Inputs don't fire DOM events (Monaco editors, Copilot prompt cells)
- Elements lack stable selectors (dynamic IDs, shadow DOM)
- Approval workflows require waiting for unpredictable buttons

Vision/OCR solves all these problems with one technology stack.

---

## PROJECT OBJECTIVES

### Primary Objectives

| ID | Objective | Success Metric |
|----|-----------|----------------|
| O1 | Enable Vision-based recording | Copilot prompt cell inputs captured successfully |
| O2 | Enable Vision-based playback | 95%+ element location success rate |
| O3 | Add configurable time delays | Global and per-step delays work correctly |
| O4 | Add CSV loop with configurable start | Multiple rows execute with correct data |
| O5 | Add conditional click automation | Allow/Keep buttons clicked until timeout |

### Secondary Objectives

| ID | Objective | Success Metric |
|----|-----------|----------------|
| S1 | Maintain DOM-based recording | Existing recordings continue to work |
| S2 | Minimize bundle size impact | Tesseract.js adds <5MB to extension |
| S3 | Provide visual feedback | Users see what Vision detects |
| S4 | Handle edge cases gracefully | Scroll-into-view, dropdown expansion |

---

## SCOPE DEFINITION

### In Scope

| Category | Items |
|----------|-------|
| **Vision Engine** | Tesseract.js integration, screenshot capture, OCR processing, coordinate extraction, click execution, keyboard simulation, dropdown handling, scroll detection |
| **Recording** | DOM event capture (existing), Vision fallback for complex inputs, coordinate storage, OCR text storage, confidence scoring |
| **Playback** | Step execution loop, CSV value injection, Vision-based element location, DOM fallback, delay handling |
| **Time Delay** | Global delay setting (toolbar), per-step delay (three-dot menu), delay badges, blocking execution |
| **CSV Loop** | Loop start selection (dropdown), position-based column mapping, row iteration with step slicing |
| **Conditional Click** | Manual step addition, auto-detection failsafe, configurable search terms, configurable timeout, polling loop |
| **UI Updates** | Toolbar additions, three-dot menu options, badges (Vision, Loop Start, Delay, Conditional), config panels |

### Out of Scope

| Category | Items | Reason |
|----------|-------|--------|
| Multi-tab automation | Recording across browser tabs | Complexity; future phase |
| Image recognition | Non-text visual elements | Requires different ML model |
| Cloud OCR | API-based text recognition | Privacy, cost, latency |
| Mobile automation | Touch events, mobile browsers | Different platform |
| Headless mode | Background execution | Requires visible tab for screenshots |

---

## FEATURE SUMMARY

### Feature 1: Vision Engine (Foundation)

**Purpose:** Core engine powering all Vision-based capabilities.

**Key Capabilities:**
- Screenshot capture via `chrome.tabs.captureVisibleTab()`
- OCR text recognition via Tesseract.js
- Coordinate extraction from OCR bounding boxes
- Click execution via `document.elementFromPoint()`
- Keyboard simulation for text input
- Dropdown handling (click → wait → re-scan → click option)
- Scroll-into-view with retry logic

**Technology:** Tesseract.js 5.x (~3MB)

---

### Feature 2: Vision Recording

**Purpose:** Capture inputs that don't fire DOM events.

**Trigger:** DOM recording fails to capture input value after 500ms.

**Data Captured:**
- `recordedVia: 'vision'` flag
- `coordinates: {x, y, width, height}`
- `ocrText: string` (what Vision saw)
- `confidenceScore: number` (0-100)

**UI Indicator:** "📷 Vision" badge on step row.

---

### Feature 3: Time Delay

**Purpose:** Configurable pauses between steps.

**Two Types:**
1. **Global Delay:** Applied AFTER every step (toolbar setting, milliseconds)
2. **Per-Step Delay:** Applied BEFORE specific step (three-dot menu, seconds)

**UI Elements:**
- Toolbar: "Delay:" number input
- Three-dot menu: "Set Delay Before Step"
- Badge: "⏱️ Xs" on steps with per-step delay

---

### Feature 4: CSV Loop

**Purpose:** Execute recording for multiple CSV rows.

**Behavior:**
- Row 1: Execute ALL steps (1 through end)
- Rows 2+: Execute from loop start step to end

**UI Elements:**
- Toolbar: "CSV Loop Start:" dropdown
- Badge: "🔁 Loop Start" on designated step

**Technical:** Position-based column mapping (handles duplicate column names).

---

### Feature 5: Conditional Click

**Purpose:** Auto-click approval buttons until timeout.

**Behavior:**
1. Screenshot → OCR → Search for terms
2. If found → Click → Reset timeout
3. If not found → Wait 1 second → Repeat
4. If timeout expires → Continue to next step

**Defaults:**
- Search terms: `["Allow", "Keep"]`
- Timeout: 120 seconds after last click
- Poll interval: 1000ms

**UI Elements:**
- Add via "+ Add Variable" → "Conditional Click"
- Badge: "🔍 Conditional" on step
- Auto-detection during playback (failsafe)

---

## SUCCESS CRITERIA

### Must Have (P0)

- [ ] Vision Engine initializes and terminates cleanly
- [ ] Screenshot capture works on all pages
- [ ] OCR extracts text with 60%+ confidence
- [ ] Click at coordinates works
- [ ] Type text into focused element works
- [ ] Copilot prompt cell input captured during recording
- [ ] Vision-recorded steps replay correctly
- [ ] Global delay works (AFTER each step)
- [ ] Per-step delay works (BEFORE that step)
- [ ] CSV Loop executes Row 1 completely
- [ ] CSV Loop executes Rows 2+ from loop start
- [ ] Conditional click finds and clicks buttons
- [ ] Conditional click respects timeout

### Should Have (P1)

- [ ] Dropdown handling via Vision
- [ ] Scroll-into-view with retry
- [ ] "📷 Vision" badge displays
- [ ] "⏱️ Xs" delay badge displays
- [ ] "🔁 Loop Start" badge displays
- [ ] "🔍 Conditional" badge displays
- [ ] Conditional click config is editable
- [ ] Auto-detection failsafe works

### Nice to Have (P2)

- [ ] Visual overlay showing OCR results
- [ ] Confidence score display
- [ ] Retry logic for failed Vision clicks
- [ ] Performance metrics logging

---

## TECHNICAL CONSTRAINTS

| Constraint | Impact | Mitigation |
|------------|--------|------------|
| Tesseract.js ~3MB | Increased extension size | Acceptable; no API costs |
| Screenshot requires visible tab | Cannot run headless | Document limitation |
| OCR latency ~500-1000ms | Slower than DOM access | Use DOM first, Vision fallback |
| Coordinate drift on resize | Click misses element | Re-capture on window resize |
| Chrome extension permissions | User must approve | Explain in onboarding |

---

## BUILD PHASES

| Phase | Focus | Duration |
|-------|-------|----------|
| 1 | Vision Engine Foundation | 60 min |
| 2 | Vision Recording | 45 min |
| 3 | Time Delay Feature | 30 min |
| 4 | CSV Loop Feature | 45 min |
| 5 | Conditional Click Feature | 45 min |
| 6 | Integration Testing | 30 min |

**Total Estimated:** ~4 hours

---

## DEPENDENCIES

### External Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| tesseract.js | ^5.0.0 | OCR engine |

### Internal Dependencies

| Component | Depends On |
|-----------|------------|
| Vision Recording | Vision Engine |
| Vision Playback | Vision Engine |
| Conditional Click | Vision Engine |
| CSV Loop | Position Mapping Logic |
| Time Delay | Step Execution Loop |

---

## RISK ASSESSMENT

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| OCR accuracy insufficient | Medium | High | Adjustable confidence threshold |
| Tesseract.js too slow | Low | Medium | Use DOM first, Vision fallback |
| Coordinate drift | Medium | Medium | Re-scan before click |
| Complex dropdowns fail | Medium | Medium | Configurable wait time |
| Extension size too large | Low | Low | Tesseract.js is ~3MB, acceptable |

---

## GLOSSARY

| Term | Definition |
|------|------------|
| Vision Engine | Core Tesseract.js wrapper handling OCR and coordinate extraction |
| DOM Recording | Traditional event-based recording using XPath/selectors |
| Vision Recording | Screenshot + OCR based recording for complex inputs |
| Conditional Click | Polling loop that clicks buttons matching search terms |
| Loop Start | Step index where CSV rows 2+ begin execution |
| Position Mapping | Mapping CSV columns to steps by occurrence order, not label name |

---

*End of Future State Overview*
