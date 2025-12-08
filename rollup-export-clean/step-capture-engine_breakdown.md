# Step Capture Engine - Component Breakdown

**Last Updated:** December 7, 2025

---

## Purpose
**What it does:** Event-to-step transformation logic that converts raw browser events (click, input, keypress) into structured Step objects with full element metadata. Enriches events with XPath, label text, element bundle, iframe/shadow context, and coordinates.

**Where it lives:** `recordEvent()` function in `src/contentScript/content.tsx` (1450+ lines total file)

**Why it exists:** Raw browser events lack context for reliable playback. This engine enriches events with all metadata needed to uniquely identify and replay interactions.

---

## Inputs
```typescript
MouseEvent | InputEvent | KeyboardEvent → {
  target: HTMLElement,     // Element that triggered event
  type: string,            // 'click', 'input', 'keydown'
  key?: string,            // For keyboard events
  clientX/clientY: number  // Mouse coordinates
}
```

---

## Outputs
```typescript
Step {
  event: 'click' | 'input' | 'enter',  // Normalized event type
  xpath: string,                        // XPath to element
  value?: string,                       // Input value (for input events)
  label: string,                        // Human-readable element label
  bundle: Bundle,                       // Full element metadata
  x: number,                            // Click X coordinate
  y: number,                            // Click Y coordinate
  timestamp: number,                    // Unix timestamp (ms)
  recordedVia?: 'dom'                   // Recording method (default 'dom')
}
```

**Bundle Contents:**
```typescript
Bundle {
  id?: string,                    // Element ID
  name?: string,                  // Name attribute
  class?: string,                 // Class list
  tag?: string,                   // Tag name
  dataAttrs?: Record<string, string>,  // data-* attributes
  ariaLabel?: string,             // aria-label
  iframeChain?: string[],         // XPath chain of iframes
  shadowHosts?: string[],         // XPath chain of shadow hosts
  isClosedShadow?: boolean,       // True if closed shadow root
  // ... additional metadata
}
```

---

## Internal Architecture

### Main Recording Function
```typescript
// content.tsx
function recordEvent(event: Event) {
  const target = event.target as HTMLElement;
  
  // 1. Extract element metadata
  const xpath = getXPath(target);
  const label = getLabelForTarget(target) || 'Unlabeled Element';
  const bundle = createBundle(target);
  
  // 2. Determine normalized event type
  let eventType: 'click' | 'input' | 'enter';
  if (event.type === 'click') {
    eventType = 'click';
  } else if (event.type === 'input') {
    eventType = 'input';
  } else if (event.type === 'keydown' && (event as KeyboardEvent).key === 'Enter') {
    eventType = 'enter';
  } else {
    return;  // Ignore other event types
  }
  
  // 3. Build step object
  const step: Step = {
    event: eventType,
    xpath,
    label,
    bundle,
    value: (target as HTMLInputElement).value || undefined,
    x: (event as MouseEvent).clientX || 0,
    y: (event as MouseEvent).clientY || 0,
    timestamp: Date.now(),
    recordedVia: 'dom'  // Phase 3 field
  };
  
  // 4. Send to recorder UI
  chrome.runtime.sendMessage({
    type: 'log_event',
    data: step
  });
}
```

### Bundle Creation
```typescript
function createBundle(element: HTMLElement): Bundle {
  return {
    id: element.id || undefined,
    name: (element as any).name || undefined,
    class: element.className || undefined,
    tag: element.tagName.toLowerCase(),
    dataAttrs: extractDataAttributes(element),
    ariaLabel: element.getAttribute('aria-label') || undefined,
    placeholder: (element as HTMLInputElement).placeholder || undefined,
    iframeChain: detectIframeChain(element),
    shadowHosts: detectShadowHosts(element),
    isClosedShadow: detectClosedShadow(element),
    // ... additional metadata
  };
}
```

### Event Listener Attachment
```typescript
// content.tsx initialization
document.addEventListener('click', recordEvent, true);  // Capture phase
document.addEventListener('input', recordEvent, true);
document.addEventListener('keydown', recordEvent, true);
```

---

## Critical Dependencies
**Upstream:**
- **Injection Manager** - Injects content script enabling event listeners
- **Recorder UI** - Initiates recording session

**Downstream:**
- **XPath computation** - `getXPath()` generates element locator
- **Label extraction** - `getLabelForTarget()` tries 16 strategies
- **Iframe handler** - `detectIframeChain()` captures cross-frame context
- **Shadow DOM handler** - `detectShadowHosts()` captures shadow context
- **Chrome runtime** - Message passing to recorder UI

**External:**
- **DOM Event API** - addEventListener for click/input/keydown
- **chrome.runtime.sendMessage** - Communication with recorder UI

---

## Hidden Assumptions
1. **Debouncing done elsewhere** - Doesn't prevent duplicate/rapid events
2. **All events recordable** - No filtering by element type or visibility
3. **Synchronous processing** - No await, immediate message send
4. **Target element stable** - Doesn't check if element still in DOM
5. **Capture phase listeners** - Uses `true` flag to catch events early
6. **No event deduplication** - Multiple clicks on same element = multiple steps
7. **Bundle immutable** - Captured at event time, not updated later

---

## Stability Concerns

### High-Risk Patterns
1. **No debouncing**
   ```typescript
   // User double-clicks rapidly
   // → Two 'click' events captured (may be intentional or accidental)
   ```

2. **No filtering**
   ```typescript
   // Captures clicks on <script>, <style>, hidden elements
   // → Noisy recordings with unplayable steps
   ```

3. **Synchronous bundle creation**
   ```typescript
   // Large bundle (deep iframe/shadow chains)
   // → May block event loop briefly
   ```

4. **No error handling**
   ```typescript
   chrome.runtime.sendMessage({ type: 'log_event', data: step });
   // If message fails, event lost (no retry)
   ```

### Failure Modes
- **Recorder UI not listening** - Messages sent but no listener (events lost)
- **XPath computation fails** - Element not found by getXPath() (falls back to '/')
- **Label extraction fails** - Returns 'Unlabeled Element'
- **Bundle creation throws** - Unhandled error stops recording

---

## Edge Cases

### Input Variations
1. **Click on invisible element**
   ```typescript
   <button style="display:none">Hidden</button>
   // Captured but unplayable (element not visible)
   ```

2. **Rapid input events**
   ```typescript
   // User types "hello" → 5 'input' events
   // Each captured separately (verbose)
   ```

3. **Enter key on non-input element**
   ```typescript
   // Enter on <div> → Ignored (not recorded)
   ```

4. **Nested element click**
   ```typescript
   <button><span>Click me</span></button>
   // Event.target = <span>, not <button>
   // XPath points to span
   ```

5. **Dynamic element**
   ```typescript
   // Element created/removed rapidly
   // Captured at event time, may not exist during playback
   ```

---

## Developer-Must-Know Notes
- **Captures EVERY click/input/enter** - Can produce noisy recordings
- **Bundle includes iframe chain and shadow hosts** - For cross-boundary elements
- **Label extraction tries 16 strategies** - See `dom-label-extraction_breakdown.md`
- **Messages sent to background → forwarded to recorder UI**
- **recordedVia: 'dom'** - Phase 3 field enables DOM/Vision routing
- **Capture phase listeners** - Catches events before bubbling
- **No validation** - Doesn't check if element is playable
- **Timestamp precision** - Uses Date.now() (millisecond accuracy)

---

## Phase 3 Integration Points

### Strategy Implementation
| Strategy ID | Relevance | Integration Point |
|-------------|-----------|-------------------|
| **A1** | Critical | Core Recording specification - Main event capture engine |
| **ENG-002** | Critical | StepCaptureEngine transforms events into structured steps |
| **DAT-001** | High | Bundle structure stores all metadata for playback |
| **INT-001** | High | Iframe/shadow detection enables cross-boundary automation |

### Specification Mapping
- **A1** (Core Recording) - Primary event capture mechanism
- **A2** (Shadow DOM) - Bundle includes shadowHosts and isClosedShadow
- **D3** (Cross-frame Automation) - Bundle includes iframeChain
- **E1** (Step Management) - Generated steps stored in project.recorded_steps
- **F1** (Schema Versioning) - recordedVia field added in Phase 3

### Evidence References
- Code: `src/contentScript/content.tsx` lines 200-350 (recordEvent function)
- Code: `src/contentScript/content.tsx` lines 100-200 (createBundle function)
- Test: Manual recording session (Dashboard → Recorder → capture events)
- Docs: Core Recording specification A1 (event capture requirements)

### Integration Risks
1. **Message Flooding:** Rapid events (100+ clicks/sec) may overwhelm background worker
2. **Bundle Size:** Deep iframe/shadow chains create large bundles (may hit message size limit)
3. **No Filtering:** Captures unplayable elements (hidden, disabled, etc.)
4. **No Deduplication:** Multiple identical events create duplicate steps

---

## Related Components
- **Content Script Recorder** (`content-script-recorder_breakdown.md`) - Hosts recordEvent() function
- **Recorder UI** (`recorder-ui_breakdown.md`) - Receives log_event messages
- **XPath Computation** (`xpath-computation_breakdown.md`) - Generates element XPath
- **DOM Label Extraction** (`dom-label-extraction_breakdown.md`) - Extracts human-readable labels
- **Iframe Handler** (`iframe-handler_breakdown.md`) - Detects iframe context
- **Shadow DOM Handler** (`shadow-dom-handler_breakdown.md`) - Detects shadow DOM context
- **Message Router** (`message-router_breakdown.md`) - Routes log_event messages to UI
