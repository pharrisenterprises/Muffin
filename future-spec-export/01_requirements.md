# MUFFIN LITE - REQUIREMENTS SPECIFICATION

> **Version:** 2.1 | **Status:** Specification  
> **Purpose:** Define functional and non-functional requirements for Muffin Lite

---

## FUNCTIONAL REQUIREMENTS

### FR-100: Vision Engine

#### FR-101: Screenshot Capture
- **Description:** System shall capture visible browser tab as PNG image
- **Input:** Active browser tab
- **Output:** Base64-encoded PNG data URL
- **API:** `chrome.tabs.captureVisibleTab(null, { format: 'png' })`
- **Error Handling:** Reject promise with error message if capture fails
- **Priority:** P0

#### FR-102: OCR Text Recognition
- **Description:** System shall extract text and coordinates from screenshot
- **Input:** Base64 PNG data URL
- **Output:** Array of TextResult objects containing:
  - `text: string` - Recognized text
  - `confidence: number` - 0-100 confidence score
  - `bounds: {x, y, width, height, centerX, centerY}` - Pixel coordinates
- **Technology:** Tesseract.js 5.x with English language pack
- **Filter:** Only return results with confidence >= 60 (configurable)
- **Priority:** P0

#### FR-103: Text Search
- **Description:** System shall find text on screen matching search terms
- **Input:** Array of search terms (strings)
- **Output:** ClickTarget object or null if not found
  - `text: string` - Matched text
  - `x: number` - Center X coordinate
  - `y: number` - Center Y coordinate
  - `confidence: number` - OCR confidence
- **Matching:** Case-insensitive substring match
- **Priority:** P0

#### FR-104: Click at Coordinates
- **Description:** System shall click element at specified coordinates
- **Input:** `x: number`, `y: number` (pixel coordinates)
- **Process:**
  1. Send message to content script
  2. Content script calls `document.elementFromPoint(x, y)`
  3. Dispatch mousedown, mouseup, click events
- **Output:** Boolean success/failure
- **Priority:** P0

#### FR-105: Type Text
- **Description:** System shall type text into currently focused element
- **Input:** `text: string`
- **Process:**
  1. Send message to content script
  2. Content script identifies active element
  3. For input/textarea: Set value, dispatch input/change events
  4. For contenteditable: Use execCommand or KeyboardEvent simulation
- **Output:** Boolean success/failure
- **Priority:** P0

#### FR-106: Click and Type
- **Description:** System shall click to focus, then type text
- **Input:** `x: number`, `y: number`, `text: string`
- **Process:**
  1. Click at coordinates (FR-104)
  2. Wait 100ms for focus
  3. Send Ctrl+A, Delete to clear
  4. Type text (FR-105)
- **Output:** Boolean success/failure
- **Priority:** P0

#### FR-107: Dropdown Handling
- **Description:** System shall interact with dropdown menus visually
- **Input:** `triggerText: string`, `optionText: string`, `waitMs: number`
- **Process:**
  1. Find and click trigger text
  2. Wait specified milliseconds (default 500)
  3. Re-scan screen with OCR
  4. Find and click option text
- **Output:** Boolean success/failure
- **Priority:** P1

#### FR-108: Scroll Into View
- **Description:** System shall scroll to find off-screen elements
- **Input:** Array of search terms
- **Process:**
  1. Search for text (FR-103)
  2. If not found, scroll down 500px
  3. Wait 500ms
  4. Repeat up to 3 times (configurable)
- **Output:** ClickTarget or null
- **Priority:** P1

#### FR-109: Conditional Click Loop
- **Description:** System shall poll for buttons and click until timeout
- **Input:**
  - `searchTerms: string[]` - Text to find
  - `timeoutSeconds: number` - Seconds since last click before exit
  - `onButtonClick?: callback` - Optional progress callback
- **Process:**
  1. Screenshot and OCR
  2. Search for any term
  3. If found: click, reset timer, increment counter
  4. If not found: wait 1 second
  5. If timeout exceeded: exit loop
- **Output:** `{ buttonsClicked: number, timedOut: boolean }`
- **Priority:** P0

---

### FR-200: Vision Recording

#### FR-201: DOM Recording Primary
- **Description:** System shall continue using DOM events as primary recording method
- **Events Captured:** click, input, change, keydown (Enter)
- **Data Captured:** XPath, selector, ID, classes, value, label
- **Priority:** P0

#### FR-202: Vision Fallback Trigger
- **Description:** System shall use Vision when DOM fails to capture input
- **Trigger Conditions:**
  - Input event fired but value is empty after 500ms
  - Element is contenteditable without standard value property
  - Element is within shadow DOM that blocks access
- **Priority:** P0

#### FR-203: Vision Recording Data
- **Description:** When Vision fallback triggers, system shall capture:
  - `recordedVia: 'vision'` - Flag indicating Vision was used
  - `coordinates: {x, y, width, height}` - Element bounding box
  - `ocrText: string` - Text recognized at those coordinates
  - `confidenceScore: number` - OCR confidence (0-100)
- **Priority:** P0

#### FR-204: Vision Badge Display
- **Description:** Steps recorded via Vision shall display "📷 Vision" badge
- **Location:** Step row, after label
- **Style:** Small pill badge with camera emoji
- **Priority:** P1

---

### FR-300: Time Delay

#### FR-301: Global Delay Setting
- **Description:** User shall configure delay applied after every step
- **UI Location:** Recorder toolbar
- **Input:** Number field labeled "Delay:"
- **Unit:** Milliseconds
- **Default:** 0 (no delay)
- **Range:** 0 to 999999
- **Priority:** P0

#### FR-302: Per-Step Delay Setting
- **Description:** User shall configure delay before specific steps
- **UI Location:** Three-dot menu on step row
- **Menu Item:** "Set Delay Before Step"
- **Input:** Dialog with number field
- **Unit:** Seconds
- **Default:** None (use global)
- **Range:** 0 to 3600
- **Priority:** P0

#### FR-303: Delay Badge Display
- **Description:** Steps with per-step delay shall display "⏱️ Xs" badge
- **Location:** Step row, after label
- **Format:** Clock emoji + delay value + "s"
- **Example:** "⏱️ 5s"
- **Priority:** P1

#### FR-304: Global Delay Execution
- **Description:** Global delay shall execute AFTER each step completes
- **Condition:** Only if step has no per-step delay
- **Behavior:** Blocking wait using async/await
- **Priority:** P0

#### FR-305: Per-Step Delay Execution
- **Description:** Per-step delay shall execute BEFORE step starts
- **Behavior:** Blocking wait using async/await
- **Priority:** P0

---

### FR-400: CSV Loop

#### FR-401: Loop Start Selection
- **Description:** User shall select which step begins the loop for rows 2+
- **UI Location:** Recorder toolbar
- **Control:** Dropdown labeled "CSV Loop Start:"
- **Options:** "Loop from Step 1", "Loop from Step 2", ... "Loop from Step N"
- **Default:** "Loop from Step 1" (index 0)
- **Priority:** P0

#### FR-402: Loop Start Badge Display
- **Description:** Designated loop start step shall display "🔁 Loop Start" badge
- **Location:** Step row, after label
- **Style:** Small pill badge with loop emoji
- **Priority:** P1

#### FR-403: Row 1 Full Execution
- **Description:** First CSV row shall execute ALL steps (1 through end)
- **Priority:** P0

#### FR-404: Rows 2+ Partial Execution
- **Description:** Rows 2+ shall execute from loop start step to end
- **Implementation:** `steps.slice(loopStartIndex)`
- **Priority:** P0

#### FR-405: Position-Based Column Mapping
- **Description:** CSV columns shall map to steps by position, not label name
- **Problem Solved:** Multiple columns with same name (e.g., "Search", "Search", "Search")
- **Algorithm:**
  1. Group CSV columns by target label
  2. For each step with that label, assign next available column
  3. Use column order from CSV file
- **Priority:** P0

#### FR-406: CSV Value Injection
- **Description:** Mapped CSV values shall replace step values during playback
- **Process:**
  1. Look up column for step index
  2. Get value from current row
  3. Clone step object
  4. Assign value to clone
  5. Execute clone
- **Priority:** P0

---

### FR-500: Conditional Click

#### FR-501: Manual Step Addition
- **Description:** User shall add conditional click steps via "+ Add Variable"
- **UI Location:** Recorder toolbar button
- **Menu Option:** "Conditional Click"
- **Result:** New step with `event: 'conditional-click'`
- **Priority:** P0

#### FR-502: Conditional Config Panel
- **Description:** User shall configure conditional click settings
- **Fields:**
  - Search Terms: Text input (comma-separated)
  - Timeout: Number input (seconds)
  - Interaction Type: Dropdown (click, dropdown, input)
- **Defaults:**
  - Search Terms: "Allow, Keep"
  - Timeout: 120
  - Interaction Type: "click"
- **Priority:** P0

#### FR-503: Conditional Badge Display
- **Description:** Conditional click steps shall display "🔍 Conditional" badge
- **Location:** Step row, after label
- **Priority:** P1

#### FR-504: Auto-Detection Failsafe
- **Description:** System shall auto-detect approval buttons during playback
- **Trigger:** After any step, before global delay
- **Search Terms:** Use recording's conditionalDefaults
- **Behavior:** Quick scan (one attempt), click if found
- **Priority:** P1

#### FR-505: Conditional Execution
- **Description:** Conditional click steps shall use Vision polling loop (FR-109)
- **Process:**
  1. Read step's conditionalConfig
  2. Call waitAndClickButtons()
  3. Log buttons clicked and timeout status
  4. Continue to next step
- **Priority:** P0

---

## NON-FUNCTIONAL REQUIREMENTS

### NFR-100: Performance

#### NFR-101: OCR Latency
- **Requirement:** OCR processing shall complete within 2000ms
- **Measurement:** Time from screenshot to results array
- **Priority:** P0

#### NFR-102: Click Response Time
- **Requirement:** Vision click shall execute within 100ms of coordinate receipt
- **Measurement:** Time from message receipt to event dispatch
- **Priority:** P0

#### NFR-103: Extension Load Time
- **Requirement:** Extension popup shall open within 500ms
- **Measurement:** Time from icon click to UI render
- **Priority:** P1

#### NFR-104: Memory Usage
- **Requirement:** Tesseract worker shall use less than 200MB RAM
- **Measurement:** Chrome task manager during OCR
- **Priority:** P1

---

### NFR-200: Reliability

#### NFR-201: OCR Accuracy
- **Requirement:** OCR shall correctly identify 95% of standard UI text
- **Conditions:** Standard fonts, sufficient contrast, no rotation
- **Priority:** P0

#### NFR-202: Click Accuracy
- **Requirement:** Vision clicks shall hit intended element 95% of time
- **Conditions:** Element visible, not obscured, coordinates accurate
- **Priority:** P0

#### NFR-203: Error Recovery
- **Requirement:** System shall handle errors gracefully without crashing
- **Behaviors:**
  - Log error to console
  - Continue to next step (where appropriate)
  - Display user-friendly error message
- **Priority:** P0

#### NFR-204: Worker Cleanup
- **Requirement:** Tesseract worker shall terminate cleanly after use
- **Trigger:** Playback complete, recording stopped, extension unloaded
- **Priority:** P0

---

### NFR-300: Usability

#### NFR-301: Badge Visibility
- **Requirement:** Step badges shall be visible without horizontal scrolling
- **Priority:** P1

#### NFR-302: Config Accessibility
- **Requirement:** All settings shall be reachable within 2 clicks
- **Priority:** P1

#### NFR-303: Error Messages
- **Requirement:** Error messages shall explain what went wrong and suggest fixes
- **Priority:** P1

#### NFR-304: Progress Feedback
- **Requirement:** Long-running operations shall show progress indication
- **Examples:** OCR processing, conditional click polling
- **Priority:** P1

---

### NFR-400: Compatibility

#### NFR-401: Chrome Version
- **Requirement:** Extension shall work on Chrome 100+
- **Priority:** P0

#### NFR-402: Manifest V3
- **Requirement:** Extension shall comply with Manifest V3 requirements
- **Priority:** P0

#### NFR-403: Existing Recordings
- **Requirement:** Recordings created before Vision features shall continue to work
- **Priority:** P0

---

### NFR-500: Security

#### NFR-501: Local Processing
- **Requirement:** All OCR processing shall occur locally (no external APIs)
- **Priority:** P0

#### NFR-502: Screenshot Privacy
- **Requirement:** Screenshots shall not be transmitted or stored permanently
- **Priority:** P0

#### NFR-503: Permission Scope
- **Requirement:** Extension shall request minimum necessary permissions
- **Permissions:** activeTab, tabs, storage, scripting
- **Priority:** P0

---

## REQUIREMENTS TRACEABILITY

| Requirement | Feature | Test Case |
|-------------|---------|-----------|
| FR-101 | Vision Engine | TC-101 |
| FR-102 | Vision Engine | TC-102 |
| FR-103 | Vision Engine | TC-103 |
| FR-104 | Vision Engine | TC-104 |
| FR-105 | Vision Engine | TC-105 |
| FR-106 | Vision Engine | TC-106 |
| FR-107 | Vision Engine | TC-107 |
| FR-108 | Vision Engine | TC-108 |
| FR-109 | Vision Engine | TC-109 |
| FR-201 | Recording | TC-201 |
| FR-202 | Recording | TC-202 |
| FR-203 | Recording | TC-203 |
| FR-204 | Recording | TC-204 |
| FR-301 | Time Delay | TC-301 |
| FR-302 | Time Delay | TC-302 |
| FR-303 | Time Delay | TC-303 |
| FR-304 | Time Delay | TC-304 |
| FR-305 | Time Delay | TC-305 |
| FR-401 | CSV Loop | TC-401 |
| FR-402 | CSV Loop | TC-402 |
| FR-403 | CSV Loop | TC-403 |
| FR-404 | CSV Loop | TC-404 |
| FR-405 | CSV Loop | TC-405 |
| FR-406 | CSV Loop | TC-406 |
| FR-501 | Conditional Click | TC-501 |
| FR-502 | Conditional Click | TC-502 |
| FR-503 | Conditional Click | TC-503 |
| FR-504 | Conditional Click | TC-504 |
| FR-505 | Conditional Click | TC-505 |

---

*End of Requirements Specification*
