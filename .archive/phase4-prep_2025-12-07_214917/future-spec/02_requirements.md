# FUNCTIONAL & NON-FUNCTIONAL REQUIREMENTS

## 1. Functional Requirements

### FR-001: Recording Orchestrator
**Priority:** P0 - Critical

The system MUST coordinate multiple evidence capture layers simultaneously during recording.

| Requirement | Description |
|-------------|-------------|
| FR-001.1 | Orchestrator initializes all layers on START_RECORDING |
| FR-001.2 | Orchestrator maintains layer health/status |
| FR-001.3 | Orchestrator routes events to appropriate layers |
| FR-001.4 | Orchestrator triggers Decision Engine on user action |
| FR-001.5 | Orchestrator handles layer failures gracefully |
| FR-001.6 | Orchestrator shuts down all layers on STOP_RECORDING |

**Acceptance Criteria:**
- [ ] All 4 layers start within 500ms of record button click
- [ ] Layer failure does not crash other layers
- [ ] Orchestrator logs all state transitions

---

### FR-002: DOM Event Layer (Layer A)
**Priority:** P0 - Critical

The system MUST capture DOM events as the primary recording method.

| Requirement | Description |
|-------------|-------------|
| FR-002.1 | Capture click events with full element bundle |
| FR-002.2 | Capture input/change events with values |
| FR-002.3 | Capture keydown events (Enter, Tab, Escape) |
| FR-002.4 | Generate stable XPath for each element |
| FR-002.5 | Generate CSS selector fallbacks |
| FR-002.6 | Capture element bounding rect (x, y, width, height) |
| FR-002.7 | Store text content and aria-label |

**Acceptance Criteria:**
- [ ] Standard button clicks captured with selector
- [ ] Input fields capture typed values
- [ ] XPath generation succeeds for 90%+ elements

---

### FR-003: Vision Layer (Layer B)
**Priority:** P0 - Critical

The system MUST continuously capture visual state during recording.

| Requirement | Description |
|-------------|-------------|
| FR-003.1 | Capture screenshot on configurable interval (default 500ms) |
| FR-003.2 | Capture screenshot immediately on user action |
| FR-003.3 | Run OCR on screenshots to extract text + coordinates |
| FR-003.4 | Store OCR results in Evidence Buffer |
| FR-003.5 | Provide text-to-coordinate lookup API |
| FR-003.6 | Support region-specific OCR (not full page) |

**Acceptance Criteria:**
- [ ] Screenshots captured at configured interval
- [ ] OCR extracts text with bounding boxes
- [ ] Text search returns coordinates within 10px accuracy

---

### FR-004: Mouse Tracking Layer (Layer C)
**Priority:** P1 - High

The system MUST track mouse movements for evidence correlation.

| Requirement | Description |
|-------------|-------------|
| FR-004.1 | Track mouse position at 50ms intervals during events |
| FR-004.2 | Calculate hover dwell time on elements |
| FR-004.3 | Record mouse path leading to click |
| FR-004.4 | Store click coordinates (viewport and page) |
| FR-004.5 | Correlate mouse position with screenshot frames |

**Acceptance Criteria:**
- [ ] Mouse trail captured for 1 second before each click
- [ ] Dwell time calculated for hover > 200ms
- [ ] Coordinates stored in Evidence Buffer

---

### FR-005: Network Interception Layer (Layer D)
**Priority:** P1 - High

The system MUST intercept network requests for state correlation.

| Requirement | Description |
|-------------|-------------|
| FR-005.1 | Intercept all fetch/XHR requests |
| FR-005.2 | Capture GraphQL mutations separately |
| FR-005.3 | Correlate requests to user actions (within 500ms) |
| FR-005.4 | Store request/response summaries (not full payloads) |
| FR-005.5 | Identify state-changing requests vs reads |

**Acceptance Criteria:**
- [ ] GraphQL mutations logged with operation name
- [ ] Network activity correlated to preceding user action
- [ ] Payload summaries under 1KB each

---

### FR-006: Decision Engine
**Priority:** P0 - Critical

The system MUST automatically select optimal recording/playback strategy.

| Requirement | Description |
|-------------|-------------|
| FR-006.1 | Score each evidence type (DOM, Vision, Mouse, Network) |
| FR-006.2 | Select highest-confidence strategy |
| FR-006.3 | Generate fallback chain ordered by score |
| FR-006.4 | Use Vision to verify selected strategy |
| FR-006.5 | Auto-fallback if verification fails |
| FR-006.6 | Minimum confidence threshold: 70% |

**Scoring Weights:**
| Strategy | Base Weight | Modifiers |
|----------|-------------|-----------|
| DOM (ID selector) | 95 | -10 if dynamic ID |
| DOM (stable class) | 85 | -5 per additional match |
| DOM (XPath) | 75 | -10 if positional indices |
| Vision (exact text) | 80 | -10 if multiple matches |
| Vision (partial text) | 60 | -20 if ambiguous |
| Coordinates | 50 | -20 if element moves |
| Network correlation | 40 | +20 if unique mutation |

**Acceptance Criteria:**
- [ ] Confidence score calculated for each strategy
- [ ] Top strategy verified before acceptance
- [ ] Fallback executes on verification failure

---

### FR-007: Evidence Buffer
**Priority:** P0 - Critical

The system MUST temporarily store all captured evidence.

| Requirement | Description |
|-------------|-------------|
| FR-007.1 | Store evidence in IndexedDB during recording |
| FR-007.2 | Tag evidence with step association |
| FR-007.3 | Mark evidence as "used" when applied to step |
| FR-007.4 | Provide query API for Decision Engine |
| FR-007.5 | Clear unused evidence on "Save as Approved" |
| FR-007.6 | Clear all evidence on "Discard Recording" |

**Data Schema:**
```typescript
interface EvidenceItem {
  id: string;
  recordingId: string;
  stepId: string | null;
  type: 'screenshot' | 'ocr' | 'mouse' | 'network' | 'dom';
  timestamp: number;
  usedInFinal: boolean;
  data: any;  // Type-specific payload
}
```

**Acceptance Criteria:**
- [ ] Evidence persists across page navigations
- [ ] Query by type, stepId, timestamp range
- [ ] Cleanup removes only unused evidence

---

### FR-008: Save as Approved Workflow
**Priority:** P1 - High

The system MUST prune evidence on recording approval.

| Requirement | Description |
|-------------|-------------|
| FR-008.1 | Add "Save as Approved" button to Recorder UI |
| FR-008.2 | On save, identify all evidence where usedInFinal=true |
| FR-008.3 | Attach used evidence to corresponding steps |
| FR-008.4 | Delete all unused evidence from IndexedDB |
| FR-008.5 | Save pruned recording to Chrome Storage |
| FR-008.6 | Confirm save with success message |

**Acceptance Criteria:**
- [ ] Saved recording size < 500KB typical
- [ ] Unused screenshots deleted
- [ ] Recording playable after save

---

### FR-009: Enhanced Add Variable
**Priority:** P2 - Medium

The system MUST allow manual step creation with visual picker.

| Requirement | Description |
|-------------|-------------|
| FR-009.1 | Modal dialog for manual step configuration |
| FR-009.2 | URL input to open target page |
| FR-009.3 | "Launch Element Picker" opens page in new tab |
| FR-009.4 | Picker overlay highlights elements on hover |
| FR-009.5 | Click captures selector, xpath, coordinates, region screenshot |
| FR-009.6 | Return captured data to modal |
| FR-009.7 | Event type selection (click, input, keypress, scroll) |
| FR-009.8 | Optional input value field |

**Acceptance Criteria:**
- [ ] User can select any visible element
- [ ] Captured data sufficient for playback
- [ ] Modal shows preview of selected element

---

### FR-010: Multi-Strategy Playback
**Priority:** P0 - Critical

The system MUST attempt multiple strategies during playback.

| Requirement | Description |
|-------------|-------------|
| FR-010.1 | Read step's selected strategy and fallback chain |
| FR-010.2 | Attempt primary strategy first |
| FR-010.3 | On failure, attempt next fallback |
| FR-010.4 | Continue until success or chain exhausted |
| FR-010.5 | Log each attempt with result |
| FR-010.6 | Vision verification optional per step |

**Acceptance Criteria:**
- [ ] DOM failure triggers Vision fallback
- [ ] Vision failure triggers Coordinate fallback
- [ ] All attempts logged for debugging

---

### FR-011: Vision Verification (Playback)
**Priority:** P2 - Medium

The system MUST optionally verify actions with Vision.

| Requirement | Description |
|-------------|-------------|
| FR-011.1 | After action, capture screenshot |
| FR-011.2 | OCR the expected element region |
| FR-011.3 | Verify text matches expected |
| FR-011.4 | If mismatch, trigger fallback |
| FR-011.5 | Configurable: on/off per recording |

**Acceptance Criteria:**
- [ ] Verification catches wrong-element clicks
- [ ] Performance impact < 500ms per step
- [ ] Can be disabled for speed

---

## 2. Non-Functional Requirements

### NFR-001: Performance
| Metric | Requirement |
|--------|-------------|
| Screenshot capture | < 100ms |
| OCR processing | < 1000ms |
| Decision Engine | < 200ms |
| Memory (recording) | < 200MB |
| Storage (temp evidence) | < 100MB |
| Storage (saved recording) | < 1MB |

### NFR-002: Reliability
| Metric | Requirement |
|--------|-------------|
| Recording success rate | > 95% |
| Playback success rate | > 90% |
| Layer crash isolation | 100% |
| Data loss on crash | 0% |

### NFR-003: Usability
| Metric | Requirement |
|--------|-------------|
| User configuration | Zero required |
| Visual feedback | Recording status only |
| Error messages | User-friendly |
| Learning curve | < 5 minutes |

### NFR-004: Compatibility
| Metric | Requirement |
|--------|-------------|
| Chrome version | 88+ |
| Standard websites | 100% |
| Canvas elements | 80%+ |
| Shadow DOM | 80%+ |
| Cross-origin iframes | Best effort |
