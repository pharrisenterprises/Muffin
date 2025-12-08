# Content Script Replayer — Component Breakdown

## Purpose
The content script replayer executes recorded automation steps on web pages by finding target elements and simulating user interactions. It reconstructs the DOM context from recorded bundles (using XPath, IDs, attributes, bounding boxes), handles React's controlled inputs, navigates iframe chains and shadow DOM, and provides human-like interaction simulation. This is the "playback" engine that transforms recorded steps back into actual user actions.

## Inputs
- **Chrome Runtime Messages** (from TestRunner UI):
  - Type: `{ type: "runStep", data: { event, bundle, value, label } }`
  - **event**: 'click' | 'input' | 'enter'
  - **bundle**: Element metadata from recording (Bundle interface)
  - **value**: Input text, select option, button label
  - **label**: Human-readable field name (for notifications)

- **Bundle Object** (from recorded step):
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
    iframeChain?: IframeInfo[],
    shadowHosts?: string[],
    isClosedShadow?: boolean
  }
  ```

- **Action Object**:
  ```typescript
  {
    type: 'click' | 'input' | 'enter',
    value?: string,
    xpath?: string
  }
  ```

## Outputs
- **Chrome Runtime Message Responses**:
  - `sendResponse(true)`: Action succeeded
  - `sendResponse(false)`: Action failed (element not found or interaction error)

- **DOM Modifications**:
  - Form inputs populated with values
  - Buttons/links clicked
  - Enter keys dispatched
  - Select dropdowns changed

- **In-Page Notifications**:
  - `updateNotification({ label, value, status })`: Creates fixed-position overlay showing step progress

- **Window Messages** (for Google autocomplete):
  - Type: `{ type: "REPLAY_AUTOCOMPLETE", actions: [...] }`
  - Sent to replay.ts in page context

## Internal Architecture

### Key Files
- **Primary**: `src/contentScript/content.tsx` — playAction() function (~200 lines)
- **Supporting**: `src/contentScript/replay.ts` — Google autocomplete replay

### Major Functions

1. **Element Finding** (Multi-Fallback Strategy):
   - `findElementFromBundle(bundle, {timeout})`: Master finder with 6+ strategies:
     - **XPath**: Primary strategy with shadow DOM traversal
     - **ID**: Exact match with CSS.escape
     - **Name**: getElementsByName or querySelectorAll([name])
     - **Aria**: aria-labelledby attribute match
     - **Placeholder**: placeholder attribute match
     - **Fuzzy Text**: Text similarity match (>40% threshold)
     - **Bounding Box**: Proximity to recorded position (<200px)
     - **Data Attributes**: Exact match on data-* attrs

2. **Action Executors**:
   - `playAction(bundle, action)`: Main orchestrator
     - Calls `findElementFromBundle()`
     - Routes to specific action handler (click/input/enter)
     - Handles special cases (Google autocomplete, Select2, contenteditable)

   - `focusAndSetValue(element, value)`: React-safe input setter
     - Uses property descriptor setter to bypass React control
     - Dispatches InputEvent and change event for React hooks
     - Handles contenteditable via `document.execCommand('insertText')`

   - `humanClick(element)`: Simulates realistic click sequence
     - Fires: mouseover → mousemove → mousedown → mouseup → click

3. **Iframe Navigation**:
   - `getDocumentFromIframeChain(chain)`: Traverses iframe hierarchy
     - Matches iframes by id → name → index
     - Returns target document or null if iframe missing

4. **Shadow DOM Traversal**:
   - `resolveXPathInShadow(hostOrRoot, path)`: Custom XPath resolver
     - Splits XPath into segments
     - Manually traverses children matching tag names
     - Automatically dives into open shadow roots
     - Handles `__realShadowRoot` for closed roots (from interceptor)

5. **Visibility Management**:
   - `temporarilyShow(el)`: Unhides display:none ancestors
     - Walks up DOM tree, sets display:block
     - Returns restore function to revert changes

6. **Notification System**:
   - `ensureNotificationBox()`: Creates/retrieves fixed overlay div
   - `updateNotification({label, value, status})`: Updates overlay content
     - status: "loading" (blue), "success" (green), "error" (red)

### Data Flow (Replay)
```
TestRunner sends { type: "runStep", data: {bundle, action} }
  ↓
handleRuntimeMessage() in content script
  ↓
updateNotification("loading")
  ↓
playAction(bundle, action)
  ↓
findElementFromBundle(bundle)
  ├─ Try XPath with shadow DOM resolution
  ├─ Try ID + attribute scoring
  ├─ Try name/aria/placeholder
  ├─ Try fuzzy text match
  └─ Try bounding box proximity
  ↓
Element found → Execute action
  ├─ click: humanClick() or focusAndSetValue() for selects
  ├─ input: focusAndSetValue() + special handling for Select2
  └─ enter: focusAndSetValue() + KeyboardEvent dispatch
  ↓
updateNotification("success" or "error")
  ↓
sendResponse(true/false)
```

## Critical Dependencies

### Browser APIs
- **DOM APIs**: document.evaluate (XPath), querySelector, getBoundingClientRect, dispatchEvent
- **Events**: MouseEvent, InputEvent, KeyboardEvent, Event constructors
- **Property Descriptors**: Object.getOwnPropertyDescriptor for React bypass
- **Window APIs**: window.postMessage (for autocomplete), document.execCommand (for contenteditable)

### Chrome Extension APIs
- `chrome.runtime.onMessage.addListener`: Receives replay commands
- `chrome.runtime.sendMessage`: Sends responses back to TestRunner

### Internal Dependencies
- **Element Finder Logic**: Complex multi-fallback strategy in findElementFromBundle()
- **Bundle Structure**: Assumes specific Bundle interface from recorder
- **Iframe Chain Serialization**: Must match serialization from recorder

### External Libraries
- None (vanilla JS/TypeScript + Chrome APIs)

## Hidden Assumptions

1. **React Controlled Inputs**:
   - Assumes React uses property setter on HTMLInputElement.prototype.value
   - Pattern: `Object.getOwnPropertyDescriptor(proto, "value")?.set`
   - **Risk**: React internals may change

2. **XPath Resolution Order**:
   - XPath tried first, even if ID exists
   - **Assumption**: XPath is most reliable due to position-based uniqueness

3. **Visibility Check**:
   - `visible(el)` checks: display !== 'none', visibility !== 'hidden', opacity !== '0'
   - **Assumption**: These are only invisibility mechanisms
   - **Miss**: `clip`, `transform: scale(0)`, off-screen positioning

4. **Bounding Box Proximity**:
   - 200px threshold for "close enough"
   - **Assumption**: Elements don't move >200px between record/replay

5. **Fuzzy Text Match**:
   - 0.4 similarity threshold (40%)
   - **Assumption**: 40% word overlap is "good enough"

6. **Iframe Availability**:
   - `getDocumentFromIframeChain()` assumes iframe still exists
   - **Risk**: Dynamic iframes may be removed/recreated

7. **Closed Shadow Root Hack**:
   - Relies on page-interceptor exposing `__realShadowRoot`
   - **Assumption**: Interceptor loaded before shadow roots created

8. **Google Autocomplete Tag**:
   - Hardcoded check: `bundleTag === "gmp-place-autocomplete"`
   - **Assumption**: Google uses this exact tag name

## Stability Concerns

1. **Element Finding Failure**:
   - **Risk**: All 6+ strategies fail if DOM structure changed significantly
   - **Impact**: Test step fails, execution halts
   - **Mitigation**: Timeout + retry (150ms intervals, 2s total)

2. **Race Conditions**:
   - **React State Update**: 50ms delay after input to let React reconcile
   - **Risk**: 50ms may not be enough for complex React apps
   - **Impact**: Next step executes before state update, finds stale value

3. **Iframe Traversal Failure**:
   - **Risk**: Iframe removed, renamed, or reordered
   - **Impact**: `getDocumentFromIframeChain()` returns null, action fails

4. **Shadow DOM Limitations**:
   - **Closed Roots**: Requires interceptor (may fail if shadow root created early)
   - **Nested Shadows**: Complex traversal may hit edge cases

5. **XPath Hardcoded Fixes**:
   - **Code smell**: `if (bundle.xpath === "/html/body/div[3]...") xpathToUse = "/html/body/div[4]..."`
   - **Risk**: Brittle workaround for specific site, breaks on updates

6. **Property Descriptor Nullability**:
   - **Risk**: `desc?.set` may be undefined in non-standard environments
   - **Impact**: Falls back to direct assignment `element.value = value` (doesn't trigger React)

7. **Event Dispatching Assumptions**:
   - **Risk**: Not all frameworks respond to InputEvent + change
   - **Impact**: Some inputs may not trigger validation/callbacks

## Edge Cases

1. **Select2 Dropdowns**:
   - **Handling**: Detects `.select2-results__option`, finds real `<select>`, updates value
   - **Edge**: If Select2 structure changes, detection breaks

2. **Contenteditable (x.com/Twitter)**:
   - **Handling**: Detects `contenteditable="true"` or id containing "placeholder"
   - **Uses**: `document.execCommand('insertText')` instead of property setter
   - **Edge**: Draft.js and other rich text editors have complex state

3. **Radio/Checkbox Groups**:
   - **Handling**: Finds all options in `[role="list"]`, matches by aria-label
   - **Edge**: Non-standard radio groups may not have role attributes

4. **Button vs. Input[type=button]**:
   - **Handling**: Enter key dispatch + humanClick() for buttons
   - **Edge**: Some buttons styled as links may not respond

5. **Dynamic Content Loading**:
   - **Handling**: 2s timeout with 150ms retry intervals
   - **Edge**: Slow networks or heavy pages may exceed timeout

6. **Modal Overlays**:
   - **Handling**: `temporarilyShow()` unhides ancestors
   - **Edge**: z-index, pointer-events:none, modal backdrops may still block

7. **Closed Shadow Roots**:
   - **Handling**: Falls back to host element interaction
   - **Edge**: Host element click may not propagate to shadow content

8. **Cross-Origin Iframes**:
   - **Handling**: Cannot access, skip
   - **Edge**: Silently fails, no error message to user

## Developer-Must-Know Notes

1. **React Controlled Input Bypass**:
   - **Why**: React intercepts `onChange`, ignores programmatic value changes
   - **How**: Directly call property setter on prototype
   - **Pattern**:
     ```typescript
     const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
     if (setter) setter.call(element, value);
     element.dispatchEvent(new InputEvent("input", {bubbles: true}));
     ```

2. **Human-Like Interactions**:
   - **Why**: Anti-bot detection, framework expectations
   - **How**: Fire event sequence: mouseover → mousemove → mousedown → mouseup → click
   - **Trade-off**: Slower execution, more realistic

3. **XPath in Shadow DOM**:
   - **Problem**: `document.evaluate()` doesn't traverse shadow boundaries
   - **Solution**: Manual XPath parsing + shadow root traversal
   - **Implementation**: `resolveXPathInShadow()` splits path, walks children

4. **Notification Overlay**:
   - **Purpose**: User feedback during test execution
   - **Implementation**: Fixed position div, z-index 999999, styled inline
   - **Limitation**: Only one notification at a time (updates replace previous)

5. **Iframe Chain Reconstruction**:
   - **Pattern**: Serialize during record, deserialize during replay
   - **Example**: `[{id: "frame1"}, {name: "inner", index: 0}]`
   - **Replay**: `doc.getElementById("frame1").contentDocument.querySelector('iframe[name="inner"]').contentDocument`

6. **Visibility Toggle**:
   - **Why**: Elements must be visible for dispatchEvent to work properly
   - **Pattern**: Temporarily set display:block, execute action, restore display:none
   - **Caveat**: May cause brief flash on screen

7. **Google Autocomplete Special Path**:
   - **Why**: Closed shadow DOM, complex interaction
   - **Solution**: Separate replay.ts script in page context
   - **Message flow**: content script → window.postMessage → replay.ts → shadow root

8. **Timeout Strategy**:
   - **Default**: 2000ms total timeout
   - **Retry**: Every 150ms
   - **Pattern**: `if (Date.now() - start < timeout) { await sleep(150); return findElement(...) }`

9. **Error Handling Philosophy**:
   - **Silent Failures**: Most errors logged to console, return false
   - **User Notification**: updateNotification("error") shows in overlay
   - **sendResponse**: Always called (true/false) to keep message channel open

10. **Performance Considerations**:
    - **findElementFromBundle()**: Expensive (6+ DOM queries)
    - **Optimization**: Early returns on success
    - **Trade-off**: Fallback strategies ensure high success rate at cost of speed

11. **Testing Strategy**:
    - **Unit test**: Element finders with mock DOMs
    - **Integration test**: Record/replay on real pages
    - **Stress test**: Rapidly changing DOM, slow networks

12. **Debugging Tips**:
    - Check notification overlay for step-by-step feedback
    - Console errors show which fallback strategy succeeded
    - Use Chrome DevTools → Performance to profile slow findElement calls
