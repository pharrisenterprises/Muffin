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
   - `initContentScript()`: Entry point called on component mount
     - Logs "open" event (page load)
     - Attaches listeners to main document
     - Injects page-interceptor script
     - Attaches listeners to all iframes
     - Registers runtime message listener

### Data Flow (Recording)
```
User clicks button
  ↓
handleClick() captures event
  ↓
Checks if element is clickable (button, link, role, cursor:pointer)
  ↓
Extracts value (button text, input value, select option)
  ↓
getLabelForTarget() → "First Name" (human-readable)
  ↓
recordElement() → Bundle with id, xpath, bounding, etc.
  ↓
logEvent() → chrome.runtime.sendMessage({type: "logEvent", data})
  ↓
Background forwards to Recorder UI
  ↓
Recorder appends to steps array
```

## Critical Dependencies

### Browser APIs
- **DOM APIs**: `document.addEventListener`, `element.getBoundingClientRect()`, `element.closest()`, `element.querySelector()`
- **Chrome Extension APIs**: `chrome.runtime.sendMessage()`, `chrome.runtime.getURL()`, `chrome.runtime.onMessage.addListener()`
- **Window APIs**: `window.location`, `window.top`, `window.postMessage()`

### Internal Dependencies
- **Label Extraction Logic**: 12+ cascading strategies hardcoded in `getLabelForTarget()`
- **XPath Library**: Custom `getXPath()` implementation (position-based)
- **Iframe Chain Serialization**: Custom logic for cross-frame element addressing

### External Libraries
- None (vanilla JS/TypeScript + Chrome APIs)

### Assumptions
- Content script runs in isolated extension context (not page context)
- Same-origin policy allows iframe access (cross-origin iframes ignored)
- Page-interceptor script must be injected for closed shadow roots

## Hidden Assumptions

1. **Capture Phase Event Listening**:
   - All listeners use `capture: true` (third argument)
   - Assumption: Ensures events are seen before page handlers can stopPropagation()

2. **30ms Delay for Click Handling**:
   - `setTimeout(() => { ... }, 30)` in `handleClick()`
   - Assumption: Allows DOM updates (e.g., Select2 opening) to complete before extracting value

3. **Trusted Events Only**:
   - `if (!(event as MouseEvent).isTrusted) return;`
   - Assumption: Ignores programmatic clicks to avoid duplicate recording

4. **Single Active Focus**:
   - `getFocusedElement()` returns single element
   - Assumption: Only one element has focus at a time

5. **Label Extraction Order Matters**:
   - 12+ strategies in specific fallback order
   - Assumption: More specific strategies (Google Forms) come before generic fallbacks

6. **XPath Uniqueness**:
   - Position-based XPath assumed unique per page state
   - Assumption: Page structure doesn't change dramatically during recording

7. **Iframe Same-Origin**:
   - `attachToAllIframes()` only works for same-origin iframes
   - Assumption: Cross-origin iframes are not automation targets

## Stability Concerns

1. **Label Extraction Fragility**:
   - **Risk**: Hardcoded CSS selectors (`.form_entity`, `.col-md-3`, `.label`) brittle across websites
   - **Impact**: Wrong labels extracted on unknown frameworks
   - **Recommendation**: Make label strategies pluggable/configurable

2. **XPath Positional Brittleness**:
   - **Risk**: Position-based XPath breaks if elements added/removed
   - **Impact**: Replay fails if DOM structure changes
   - **Recommendation**: Prefer ID/name/aria when available (already done as fallback)

3. **Race Conditions**:
   - **Click Delay**: 30ms setTimeout may not be enough for slow DOM updates
   - **Iframe Injection**: Listeners attached immediately; dynamic iframes may be missed
   - **Impact**: Events recorded with incomplete data

4. **Event Handler Leaks**:
   - **Risk**: `removeListeners()` only called on component unmount
   - **Impact**: In long-running sessions, orphaned listeners accumulate
   - **Recommendation**: Use AbortController for cleanup

5. **Cross-Origin Iframe Blind Spots**:
   - **Risk**: Cannot attach listeners to cross-origin iframes
   - **Impact**: User interactions inside cross-origin content (ads, embedded widgets) not recorded

6. **Synthetic Event Filtering**:
   - **Risk**: `!event.isTrusted` filters out legitimate programmatic interactions
   - **Impact**: Some frameworks (React) use synthetic events; may miss interactions

## Edge Cases

1. **Google Forms**:
   - **Handling**: Special `findGFQuestionTitle()` function
   - **Edge**: Assumes specific DOM structure (`[role="heading"]`, `.M7eMe`)

2. **Select2 Dropdowns**:
   - **Handling**: Traces `data-select2-id` back to original `<select>`
   - **Edge**: If Select2 structure changes, extraction breaks

3. **Contenteditable Elements**:
   - **Handling**: Extracts `innerText` or `textContent`
   - **Edge**: Rich text editors (TinyMCE, CKEditor) may have complex nested structure

4. **Shadow DOM (Closed)**:
   - **Handling**: Requires page-interceptor to expose `__realShadowRoot`
   - **Edge**: If interceptor not loaded, closed shadow roots inaccessible

5. **Rapid Consecutive Events**:
   - **Handling**: Each event logged separately
   - **Edge**: Fast typing creates many input events (could be debounced)

6. **Modal Dialogs**:
   - **Handling**: Modal elements captured like any other
   - **Edge**: If modal removes previous DOM, XPath may become invalid

7. **Dynamic Iframes**:
   - **Handling**: `webNavigation.onCommitted` triggers reinjection
   - **Edge**: Iframes added after page load may miss initial attachment

8. **Nested Iframes**:
   - **Handling**: Recursively attaches to all nested iframes
   - **Edge**: Deep nesting (5+ levels) may hit performance limits

## Developer-Must-Know Notes

1. **Content Script Execution Context**:
   - Runs in **isolated world** (separate from page JS)
   - Cannot access page's global variables or functions
   - Must use `window.postMessage()` to communicate with page context

2. **Event Listener Capture Phase**:
   - `addEventListener(..., true)` uses capture phase
   - **Why**: Ensures extension sees event before page can cancel it
   - **Trade-off**: May capture more events than intended

3. **Label Extraction is Heuristic**:
   - No single "correct" way to extract labels
   - Strategies ordered from specific to generic
   - **New framework support**: Add strategy at beginning of `getLabelForTarget()`

4. **XPath as Primary Selector**:
   - XPath used even when ID exists (for consistency)
   - **Replay**: XPath tried first, then fallback to ID/name/aria
   - **Why**: XPath works universally, IDs can be duplicated

5. **Bundle is Replay Contract**:
   - Bundle object contains ALL info needed for replay
   - **Critical fields**: xpath, tag, id, name, aria, placeholder
   - **Replay strategy**: Try xpath → ID → name → aria → bounding box → fuzzy text

6. **Iframe Chain Serialization**:
   - Cannot send HTMLIFrameElement via chrome.runtime.sendMessage
   - Serialize to `{ id, name, index }` for replay reconstruction
   - **Replay**: Use `getDocumentFromIframeChain()` to navigate back to iframe

7. **Google Autocomplete Special Case**:
   - Closed shadow DOM requires interceptor injection
   - Messages routed via `window.postMessage()` → content script → background
   - **Replay**: Separate replay.ts script handles autocomplete actions

8. **Performance Considerations**:
   - `getLabelForTarget()` is expensive (12+ DOM queries)
   - Called on every click/input event
   - **Optimization**: Cache label results per element (not implemented)

9. **Debugging Tips**:
   - Check `chrome.runtime.lastError` if messages not reaching background
   - Use Chrome DevTools → Sources → Content Scripts to set breakpoints
   - Console logs in content script visible in inspected page's console

10. **Testing Strategy**:
    - Unit test label extraction strategies independently
    - Integration test: Load sample pages, simulate events, verify messages
    - Cross-browser testing: Chromium vs. Chrome behavior may differ
