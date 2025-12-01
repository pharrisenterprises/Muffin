# Page Interceptor — Component Breakdown

## Purpose
The page interceptor (`page-interceptor.tsx`) runs in the page context (not extension isolated world) to intercept and expose closed shadow DOM roots, specifically targeting Google Maps autocomplete components. It monkey-patches `Element.prototype.attachShadow` to capture closed shadow roots before they become inaccessible, exposes internal input elements for automation, and relays user interactions back to the content script via window.postMessage.

## Inputs
- **Shadow Root Creation**: Intercepts all `element.attachShadow({mode: "closed"})` calls
- **User Interactions** inside closed shadow roots:
  - Input events in autocomplete fields
  - Clicks on suggestion list items (`<li role="option">`)

## Outputs
- **Exposed Shadow Roots**: `element.__realShadowRoot` property added to host elements
- **Exposed Input Elements**: `element.__autocompleteInput` property for direct access
- **Window Messages** (to content script):
  - `{ type: "AUTOCOMPLETE_INPUT", value, xpath, label }`: User typing
  - `{ type: "AUTOCOMPLETE_SELECTION", text, xpath }`: Suggestion selected

## Internal Architecture

### Key File
- **Single file**: `src/contentScript/page-interceptor.tsx` (~120 lines)
- **Execution context**: Page context (injected via `<script>` tag)

### Main Components

1. **Shadow Root Interceptor**:
   ```typescript
   const origAttachShadow = Element.prototype.attachShadow;
   Element.prototype.attachShadow = function (init) {
     const shadow = origAttachShadow.call(this, init);
     if (init.mode === "closed") {
       (this as any).__realShadowRoot = shadow;
       if (this.tagName === "GMP-PLACE-AUTOCOMPLETE") {
         monitorAutocomplete(this, shadow);
       }
     }
     return shadow;
   };
   ```

2. **Autocomplete Monitor**:
   - `monitorAutocomplete(host, shadow)`:
     - Searches for `<input>` inside shadow root
     - If not found, sets up MutationObserver for lazy loading
     - Once found, calls `setupListeners()`

3. **Event Listeners**:
   - `setupListeners(host, input, shadow)`:
     - **Input listener**: Posts AUTOCOMPLETE_INPUT messages
     - **Click listener** (on shadow root): Captures clicks on `<li role="option">`, posts AUTOCOMPLETE_SELECTION

4. **XPath Helper**:
   - `getXPath(element)`:
     - Custom XPath computation that handles shadow boundaries
     - Walks up to shadow host, continues XPath computation outside shadow

## Critical Dependencies

### Browser APIs
- `Element.prototype.attachShadow`: Monkey-patched method
- `ShadowRoot`: Used to query shadow DOM
- `MutationObserver`: Watches for lazy-loaded inputs
- `window.postMessage()`: Communication with content script
- `Element.closest()`: Finds ancestor elements

### Assumptions
- Runs in **page context** (has access to page's prototypes)
- Loaded **before** shadow roots are created (injected early by content script)
- Google Maps uses `<gmp-place-autocomplete>` tag name
- Autocomplete input always has `<input>` element eventually

## Hidden Assumptions

1. **Injection Timing**:
   - **Assumption**: Page-interceptor injected before any shadow roots created
   - **Risk**: If shadow roots created synchronously in <head>, may miss them

2. **Google Maps Tag Name**:
   - **Hardcoded**: `this.tagName === "GMP-PLACE-AUTOCOMPLETE"`
   - **Risk**: Google changes tag name, detection breaks

3. **Input Element Presence**:
   - **Assumption**: Autocomplete shadow always contains `<input>` element
   - **Risk**: Google redesigns component, querySelector fails

4. **Message Target**:
   - **Pattern**: `window.postMessage(..., "*")`
   - **Risk**: Any page script can listen to messages (low security concern for this use case)

5. **XPath Uniqueness**:
   - **Assumption**: XPath computed here matches XPath computed by content script
   - **Risk**: Discrepancies cause element mismatch during replay

## Stability Concerns

1. **Monkey Patch Fragility**:
   - **Risk**: Other scripts may also patch `attachShadow`, causing conflicts
   - **Impact**: Last patcher wins, previous patches overwritten
   - **Mitigation**: Save original method before patching

2. **Timing Issues**:
   - **Risk**: MutationObserver may not trigger if input added synchronously
   - **Impact**: Listeners not attached, events not captured

3. **Memory Leaks**:
   - **Risk**: `__realShadowRoot` and `__autocompleteInput` properties never cleaned up
   - **Impact**: Shadow roots retained in memory indefinitely

4. **Cross-Page Persistence**:
   - **Risk**: Interceptor script re-injected on every page load
   - **Impact**: Multiple instances running simultaneously (low concern, IIFE prevents conflicts)

## Edge Cases

1. **Multiple Autocomplete Widgets**:
   - **Handling**: Each widget gets own `__realShadowRoot` property
   - **Edge**: If multiple autocompletes on same page, XPath may be ambiguous

2. **Lazy-Loaded Inputs**:
   - **Handling**: MutationObserver waits for input to appear
   - **Edge**: If input never appears (Google changes structure), listeners never attached

3. **Open Shadow Roots**:
   - **Handling**: Ignored (only closed roots need interception)
   - **Edge**: Some Google components may use open roots, no special handling needed

4. **Non-Google Shadow Roots**:
   - **Handling**: `__realShadowRoot` added to all closed roots, but monitoring only for GMP tags
   - **Edge**: Other closed shadow roots exposed but not monitored (benign)

## Developer-Must-Know Notes

1. **Injection Method**:
   - **How**: Content script creates `<script src="chrome-extension://...">`, appends to page
   - **Why**: Page context required to modify page's prototypes
   - **Pattern**:
     ```typescript
     const s = document.createElement("script");
     s.src = chrome.runtime.getURL("js/interceptor.js");
     s.onload = () => s.remove();
     document.head.appendChild(s);
     ```

2. **Communication Flow**:
   - Page-interceptor (page context) → window.postMessage → Content script (extension context) → chrome.runtime.sendMessage → Background
   - **Why**: Cannot directly access chrome.runtime from page context

3. **Shadow Root Exposure**:
   - **Property**: `element.__realShadowRoot`
   - **Purpose**: Allows content script to query inside closed shadow roots
   - **Security**: No security risk; extension controls both scripts

4. **MutationObserver Pattern**:
   - **Why**: Google may load autocomplete lazily (after page load)
   - **Pattern**: Observe `{ childList: true, subtree: true }`, disconnect on success

5. **XPath in Shadow DOM**:
   - **Challenge**: XPath crosses shadow boundary
   - **Solution**: When reaching shadow host, call `getRootNode()`, continue XPath from host's parent

6. **Performance Impact**:
   - **Minimal**: Monkey patch adds ~1ms overhead per shadow root creation
   - **Event listeners**: Only attached to Google autocomplete components

7. **Testing Considerations**:
   - **Test page**: Must include Google Maps Places API
   - **Verify**: Check `element.__realShadowRoot` exists after shadow root creation
   - **Simulate**: Manually fire input events, verify window.postMessage calls

8. **Debugging Tips**:
   - Console logs in page-interceptor visible in page's console (not extension console)
   - Check Network tab for Google Maps API script loading
   - Use `$0.__realShadowRoot` in DevTools after selecting element
