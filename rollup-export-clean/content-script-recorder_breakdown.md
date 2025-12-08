# Content Script Recorder — Component Breakdown

## Purpose
The content script recorder captures all user interactions (clicks, inputs, keyboard events) on target web pages and converts them into automation steps. It runs in the isolated extension context of injected web pages, attaches event listeners to the DOM (including iframes), extracts human-readable labels for form fields, computes XPath selectors, and bundles element metadata for reliable replay. This is the core "recording" engine that transforms user behavior into automatable steps.

## Inputs
- **DOM Events** (captured via event listeners):
  - `mousedown`: Click events on interactive elements
  - `input`: Text input, textarea changes, checkbox/radio toggles, select dropdowns
  - `keydown`: Enter key press, form submissions

- **User Interactions**:
  - Clicks on buttons, links, form controls, radio buttons, checkboxes
  - Text input into input fields, textareas, contenteditable elements
  - Dropdown selections (native `<select>` and Select2 custom dropdowns)
  - Google autocomplete selections (via page-interceptor messages)

- **Window Messages** (from page-interceptor.tsx):
  - `AUTOCOMPLETE_INPUT`: User typing in Google Maps autocomplete
  - `AUTOCOMPLETE_SELECTION`: User selecting autocomplete suggestion

- **Element Focus State**: `document.activeElement` and iframe-traversed focus

## Outputs
- **Chrome Runtime Messages** (to background.ts):
  - Type: `{ type: "logEvent", data: LogEventData }`
  - **LogEventData** structure:
    ```typescript
    {
      eventType: 'click' | 'input' | 'enter' | 'open',
      xpath: string,
      value?: string,
      label?: string,
      page: string,
      x?: number,
      y?: number,
      bundle?: Bundle
    }
    ```

- **Bundle Object** (element metadata for replay):
  ```typescript
  {
    id?: string,
    name?: string,
    className?: string,
    dataAttrs?: Record<string, string>,
    aria?: string,
    placeholder?: string,
    tag?: string,
    visibleText?: string,
    xpath?: string,
    bounding?: { left, top, width, height },
    iframeChain?: IframeInfo[]
  }
  ```

- **Injected Scripts** (into page context):
  - `js/interceptor.js`: Monitors closed shadow roots, Google autocomplete

## Internal Architecture

### Key Files
- **Primary**: `src/contentScript/content.tsx` (1450 lines) — Main recording logic
- **Supporting**: `src/contentScript/page-interceptor.tsx` — Injected page script

### Major Functions

1. **Event Handlers**:
   - `handleClick(event)`: Processes clicks, detects interactive elements, extracts values
   - `handleInput(event)`: Captures text input, checkbox toggles, select changes
   - `handleKeyDown(event)`: Detects Enter key presses

2. **Label Extraction** (12+ strategies):
   - `getLabelForTarget(target)`: Master label extraction function with cascading fallbacks:
     - Google Forms: `findGFQuestionTitle()` — Extracts question headings
     - Standard HTML: `<label>` parent, `<label for="id">`, aria-labelledby, aria-label
     - Custom frameworks: .form_entity, .form_label selectors
     - Select2 dropdowns: data-select2-id traversal
     - Bootstrap layouts: .row/.col-md-* header matching
     - Table layouts: Previous `<td>` sibling text
     - Fallback: Previous text node, element name attribute

3. **XPath Computation**:
   - `getXPath(element)`: Computes position-based XPath (e.g., `/html/body/div[3]/form/input[2]`)
   - Handles SVG exclusion (SVG elements skipped in path)
   - Counts preceding siblings of same tag for indexing

4. **Element Recording**:
   - `recordElement(el)`: Bundles all element metadata:
     - Attributes: id, name, class, data-*, aria, placeholder, tag
     - Context: XPath, bounding box, visible text, iframe chain
     - Special handling: Select2 original `<select>`, radio/checkbox role targets

5. **Iframe Handling**:
   - `getIframeChain(el)`: Traverses from element to top-level document, collecting iframe hierarchy
   - `serializeIframeChain(chain)`: Converts HTMLIFrameElements to serializable objects
   - `attachToAllIframes(window)`: Recursively attaches listeners to all same-origin iframes

6. **Initialization**:
   - `setupRecorder()`: Main entry point
     - Attaches event listeners to document and body
     - Injects page-interceptor script
     - Starts iframe monitoring
     - Logs initial "open" event

## Critical Dependencies
- **Chrome Extension APIs**:
  - `chrome.runtime.sendMessage()`: Send recorded events to background
  - `chrome.runtime.onMessage`: Receive start/stop recording commands

- **DOM APIs**:
  - `addEventListener()`: Event capture
  - `document.evaluate()`: XPath evaluation
  - `getBoundingClientRect()`: Element positioning
  - `getComputedStyle()`: Visibility checks

## Hidden Assumptions
1. **Same-origin iframes only**: Cannot record in cross-origin iframes
2. **Single recording session**: No concurrent recording support
3. **Synchronous label extraction**: May block for complex DOM trees
4. **No Shadow DOM**: Closed shadow roots require page-interceptor

## Stability Concerns
- **Memory leaks**: Event listeners not cleaned up on navigation
- **Performance**: Label extraction may be slow on large forms (100+ fields)
- **Race conditions**: Rapid user input may miss intermediate states

## Developer-Must-Know Notes
- Recording starts on `START_RECORDING` message from UI
- Events captured with `{ capture: true }` for early interception
- Select2 dropdowns require special data-select2-id traversal
- Google Forms use aria roles instead of standard labels
- XPath uses position-based indexing (brittle to DOM changes)

## Phase 3 Integration Points

### Recording System (Phase 3A)
- **Replacement**: RecordingOrchestrator replaces entire content.tsx recorder
- **Migration**: All 6 event handlers become EvidenceBuffer layer-specific modules
- **Integration**: 
  - `handleClick()` → MouseCapture layer
  - `handleInput()` → DOMCapture layer
  - Label extraction → DOMCapture with accessibility fallback

### Evidence Collection (Phase 3A)
- **Input**: RecordingOrchestrator coordinates multi-layer capture
- **Output**: EvidenceBuffer stores:
  - DOM metadata (current Bundle data)
  - Vision screenshots (new)
  - Mouse trails (new)
  - Network activity (new)
- **Integration**: All evidence timestamped and correlated by step ID

### Strategy System (Phase 3C)
- **Input**: DecisionEngine analyzes recorded evidence quality
- **Output**: Assigns confidence scores to each evidence layer
- **Integration**: Bundle → StrategyTelemetry with quality metrics

### Vision System (Phase 3D)
- **Input**: VisionCapture takes screenshot on every recorded interaction
- **Output**: Screenshot + OCR text stored in EvidenceBuffer
- **Integration**: Vision data used for fallback when DOM locators fail

**Legacy Architecture Issues**:
1. **Monolithic file**: 1450 lines of tightly coupled logic
2. **No evidence scoring**: All locators treated equally
3. **Single-strategy recording**: Only DOM metadata captured
4. **No telemetry**: No data on which locators work in replay

**Phase 3 Improvements**:
1. **Modular layers**: 6 independent capture modules
2. **Evidence scoring**: Real-time confidence metrics
3. **Multi-strategy recording**: 4 evidence types per interaction
4. **Telemetry-driven**: DecisionEngine learns from replay success rates

**Last Updated**: December 7, 2025 — Phase 3 Specification Complete
