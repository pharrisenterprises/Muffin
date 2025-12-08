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
     - Traverses shadow boundaries manually
     - Falls back to querySelector for shadow content

5. **Special Case Handlers**:
   - `handleGoogleAutocomplete()`: Detects Google Maps autocomplete
     - Posts message to replay.ts in page context
     - Waits for autocomplete dropdown injection
   
   - `handleSelect2()`: Detects Select2 dropdowns
     - Clicks .select2-selection to open dropdown
     - Waits for results container
     - Finds option by text match

## Critical Dependencies
- **Chrome Extension APIs**:
  - `chrome.runtime.onMessage`: Receive playback commands
  - `chrome.runtime.sendMessage`: Report playback results

- **DOM APIs**:
  - `document.evaluate()`: XPath evaluation
  - `querySelector()`: CSS selector fallback
  - `dispatchEvent()`: Event simulation
  - `Object.getOwnPropertyDescriptor()`: React input setter bypass

## Hidden Assumptions
1. **Same-origin iframes**: Cannot traverse cross-origin frames
2. **Synchronous execution**: Steps execute sequentially, no parallelism
3. **No retry logic**: Single attempt per fallback strategy
4. **React 16+**: Property descriptor technique specific to React

## Stability Concerns
- **Timing issues**: Fast execution may not wait for page dynamics
- **React version dependence**: Input setter may break in React 19+
- **XPath brittleness**: Position-based XPath fails if DOM structure changes
- **No healing**: No fallback if all strategies fail

## Developer-Must-Know Notes
- XPath evaluated first (highest priority)
- Bounding box match has 200px tolerance (loose matching)
- contenteditable uses deprecated `execCommand` (may need update)
- Google autocomplete requires page-context script (CSP bypass)
- Select2 detection uses `.select2-selection` class

## Phase 3 Integration Points

### Test Execution (Phase 3F)
- **Replacement**: SelfHealingPlaybackEngine replaces playAction()
- **Migration**: All fallback strategies become StrategyEvaluators
- **Integration**:
  - XPath → DOMStrategy
  - Bounding box → VisionStrategy
  - Fuzzy text → VisionStrategy with OCR

### Strategy System (Phase 3C)
- **Input**: DecisionEngine selects optimal strategy per step
- **Output**: FallbackChain with 7-tier priority
- **Integration**: Each findElement strategy becomes StrategyEvaluator

### Self-Healing (Phase 3F)
- **Input**: HealingOrchestrator attempts repair on failure
- **Output**: AlternativeSelector found via AI vision
- **Integration**: Replaces manual fallback chain with intelligent healing

### Evidence Scoring (Phase 3D)
- **Input**: EvidenceScorer ranks locator quality
- **Output**: Confidence scores for each strategy attempt
- **Integration**: Telemetry tracks which strategies succeed/fail

**Legacy Architecture Issues**:
1. **Sequential fallback**: Wastes time trying invalid strategies
2. **No learning**: Same fallback order every time
3. **Binary results**: No partial matches or confidence scores
4. **No vision fallback**: Text matching limited to DOM attributes

**Phase 3 Improvements**:
1. **Parallel evaluation**: All strategies scored simultaneously
2. **Telemetry-driven**: DecisionEngine learns optimal strategy per step type
3. **Confidence scoring**: Each locator has quality metric (0.0-1.0)
4. **Vision fallback**: OCR + screenshot comparison as ultimate fallback

**Element Finding Flow** (Current):
```
1. Try XPath
2. Try ID
3. Try name
4. Try aria
5. Try placeholder
6. Try fuzzy text
7. Try bounding box
8. Return null (failure)
```

**Element Finding Flow** (Phase 3):
```
1. DecisionEngine analyzes step evidence
2. Score all strategies in parallel:
   - DOMStrategy (XPath, ID, name, aria)
   - CDPStrategy (accessibility tree)
   - VisionStrategy (OCR + screenshot)
3. Execute highest-confidence strategy
4. If failure, try next in FallbackChain
5. If all fail, invoke HealingOrchestrator
6. AI vision suggests alternative locator
```

**Last Updated**: December 7, 2025 — Phase 3 Specification Complete
