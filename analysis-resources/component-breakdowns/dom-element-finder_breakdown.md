# DOM Element Finder Breakdown

## Purpose
**What it does:** Multi-strategy element location system that attempts to find target DOM elements during test playback using 6+ progressive fallback strategies. Core to the replay engine's robustness against DOM changes between recording and playback.

**Where it lives:** Embedded within `playAction` function in `src/contentScript/content.tsx` (lines ~700-900)

**Why it exists:** Recorded XPath selectors often become invalid between recording and playback due to:
- Dynamic content changes
- Component rerendering
- DOM structure modifications
- Framework-specific element recreation (React, Angular)

## Inputs
**Data Requirements:**
```typescript
{
  bundle: {
    xpath?: string;           // Primary location strategy
    id?: string;              // Fallback #1: Element ID
    name?: string;            // Fallback #2: name attribute
    className?: string;       // Fallback #3: class names
    dataAttrs?: Record<string, string>;  // Fallback #4: data-* attributes
    aria?: string;            // Fallback #5: ARIA label
    placeholder?: string;     // Fallback #6: placeholder text
    tag?: string;             // Element type for validation
    iframeChain?: IframeInfo[];  // Cross-frame navigation
    shadowHosts?: string[];   // Shadow DOM traversal
    isClosedShadow?: boolean; // Closed shadow root flag
  };
}
```

**Dependencies:**
- `document` object for XPath/querySelector
- `getDocumentForBundle()` - iframe/shadow DOM context resolver
- `traverseIframesAndShadowRoots()` - cross-boundary navigation
- Chrome DevTools Protocol for closed shadow roots

## Outputs
**Returns:**
- **Success:** `HTMLElement` - Found target element
- **Failure:** `null` - No element found after all strategies exhausted

**Side Effects:**
- Console warnings for each failed strategy
- May trigger CDP commands for closed shadow roots
- Logs debug information to console

## Internal Architecture

### Execution Flow
```
1. Get document context (iframe/shadow DOM aware)
2. Strategy #1: Try XPath (bundle.xpath)
3. Strategy #2: Try document.getElementById(bundle.id)
4. Strategy #3: Try document.getElementsByName(bundle.name)[0]
5. Strategy #4: Try querySelector by className
6. Strategy #5: Try data-* attribute selectors
7. Strategy #6: Try ARIA label matching
8. Strategy #7: Try placeholder attribute
9. Return null if all fail
```

### Code Structure
```typescript
function playAction(data: StepData) {
  // Get appropriate document context
  const doc = getDocumentForBundle(data.bundle);
  
  let targetElement: HTMLElement | null = null;

  // Strategy 1: XPath
  if (data.bundle.xpath) {
    const xpathResult = doc.evaluate(
      data.bundle.xpath,
      doc,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    targetElement = xpathResult.singleNodeValue as HTMLElement;
  }

  // Strategy 2: ID
  if (!targetElement && data.bundle.id) {
    targetElement = doc.getElementById(data.bundle.id);
  }

  // Strategy 3: Name attribute
  if (!targetElement && data.bundle.name) {
    const namedElements = doc.getElementsByName(data.bundle.name);
    targetElement = namedElements[0] as HTMLElement;
  }

  // Strategy 4: Class names
  if (!targetElement && data.bundle.className) {
    const classes = data.bundle.className.split(' ').filter(Boolean);
    const selector = '.' + classes.join('.');
    targetElement = doc.querySelector(selector);
  }

  // Strategy 5: Data attributes
  if (!targetElement && data.bundle.dataAttrs) {
    for (const [key, value] of Object.entries(data.bundle.dataAttrs)) {
      const selector = `[data-${key}="${value}"]`;
      targetElement = doc.querySelector(selector);
      if (targetElement) break;
    }
  }

  // Strategy 6: ARIA label
  if (!targetElement && data.bundle.aria) {
    targetElement = doc.querySelector(`[aria-label="${data.bundle.aria}"]`);
  }

  // Strategy 7: Placeholder
  if (!targetElement && data.bundle.placeholder) {
    targetElement = doc.querySelector(`[placeholder="${data.bundle.placeholder}"]`);
  }

  if (!targetElement) {
    console.error("❌ Element not found after all strategies");
    return;
  }

  // Execute action on found element
  executeActionOnElement(targetElement, data);
}
```

## Critical Dependencies
**Upstream:**
- **Bundle creation** (recording phase) - Must capture all fallback identifiers
- **getDocumentForBundle()** - Context resolution for iframe/shadow DOM
- **traverseIframesAndShadowRoots()** - Cross-boundary navigation

**Downstream:**
- **humanLikeClick()** - Click action executor
- **setNativeValue()** - Input manipulation (React-safe)
- **notification overlay** - User feedback on failures

**External:**
- **XPath API** (`document.evaluate`) - Primary strategy
- **Chrome DevTools Protocol** - Closed shadow root access

## Hidden Assumptions
1. **Strategies ordered by reliability** - XPath first, attributes last
2. **One element per strategy** - Takes first match (no disambiguation)
3. **Document context stable** - Assumes `getDocumentForBundle()` returns correct context
4. **No timeout between strategies** - Tries all immediately (no delays)
5. **Class selectors space-separated** - Assumes standard class name format
6. **Data attributes prefixed with "data-"** - Follows HTML5 convention
7. **ARIA labels unique** - Doesn't handle duplicate aria-label values
8. **Name attributes for form elements** - Primarily for `<input name="...">`

## Stability Concerns
### High-Risk Patterns
1. **XPath brittleness** - Absolute paths break on DOM structure changes
   ```typescript
   // ❌ Fragile: /html/body/div[3]/form/input[2]
   // ✅ Better: Include ID/class in bundle for fallback
   ```

2. **Class name strategy too broad** - Matches first element with classes
   ```typescript
   // If bundle.className = "form-input active"
   // querySelector('.form-input.active') may find wrong element
   ```

3. **No visual validation** - Doesn't check if found element is visible
   ```typescript
   // May find hidden/offscreen elements with same attributes
   ```

4. **Race conditions** - No wait for element to appear
   ```typescript
   // If element not yet rendered, immediately fails
   // No retry or MutationObserver logic
   ```

### Failure Modes
- **All strategies fail** → Returns null, playback stops
- **Wrong element found** → Executes action on incorrect target
- **Multiple matches** → Takes first, may be wrong instance
- **Element exists but invisible** → Action may fail silently

## Edge Cases
### Input Variations
1. **Empty bundle fields** - All identifiers null/undefined
   ```typescript
   bundle = { tag: 'div' } // No identifying information
   → All strategies skip, returns null
   ```

2. **Special characters in selectors**
   ```typescript
   className: "btn-primary btn:hover" // Colon breaks querySelector
   aria: 'Click "Submit" button' // Quotes not escaped
   ```

3. **Dynamic class names** (React/Vue)
   ```typescript
   className: "css-1a2b3c4 MuiButton-root-xyz"
   → Breaks on rebuild with different hash
   ```

4. **Closed shadow roots**
   ```typescript
   bundle.isClosedShadow = true
   → Regular querySelector fails
   → Requires CDP fallback (may not be injected)
   ```

### Output Variations
- **Strategy #4 succeeds** but element has wrong `tag` → Type mismatch not validated
- **Element found in wrong iframe** → Context resolution bug in `getDocumentForBundle()`
- **Element changes between find and action** → No re-verification before click/input

## Developer-Must-Know Notes
### Quick Context
This is the **most critical fallback system** in the replayer. If this fails, the entire test stops. XPath is fastest but least reliable; data attributes are slowest but most stable.

### Common Issues
1. **Why is XPath failing?**
   - DOM structure changed (div added/removed)
   - Element position changed (different index)
   - **Fix:** Ensure bundle captures ID/class/data-attrs during recording

2. **Why is it finding the wrong element?**
   - Multiple elements with same class name
   - Selector too generic (e.g., `.btn`)
   - **Fix:** Add more specific identifiers to bundle

3. **Element exists but action fails**
   - Element found but not visible/clickable
   - Element inside iframe not detected
   - **Fix:** Add visibility check before action execution

### Integration Points
**Called By:**
- `playAction()` - Main replay loop
- `runStepMessage` handler - Message from background script

**Calls:**
- `getDocumentForBundle()` - Before any strategy executes
- `humanLikeClick()` / `setNativeValue()` - After successful find

### Performance Notes
- **Average execution time:** <10ms (fast strategies first)
- **Worst case:** ~50ms (tries all 7 strategies)
- **No async delays** - Runs synchronously

### Testing Guidance
**Mock Requirements:**
```typescript
// Provide full bundle for robust tests
const mockBundle = {
  xpath: '/html/body/div[1]/input',
  id: 'email-input',
  name: 'email',
  className: 'form-control email-field',
  dataAttrs: { 'test-id': 'email-input' },
  aria: 'Email address',
  placeholder: 'Enter your email',
  tag: 'input'
};
```

**Test Cases to Cover:**
1. ✅ XPath success (primary path)
2. ✅ XPath fails, ID succeeds (fallback #1)
3. ✅ All identifiers fail → returns null
4. ✅ Element in iframe with correct iframeChain
5. ✅ Element in shadow DOM with shadowHosts
6. ✅ Special characters in class names
7. ✅ Multiple elements match className (takes first)

### Future Improvements
1. **Add retry logic** with exponential backoff
2. **Validate element visibility** before returning
3. **Disambiguate multiple matches** using additional context
4. **Cache found elements** for repeated actions
5. **Add MutationObserver** for delayed element appearance
6. **Implement fuzzy matching** for text-based strategies
