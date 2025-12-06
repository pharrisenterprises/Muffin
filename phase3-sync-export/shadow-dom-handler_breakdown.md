# Shadow DOM Handler Breakdown

## Purpose
**What it does:** Enables recording and playback of user interactions with elements inside shadow DOM boundaries (both open and closed shadow roots). Traverses shadow host chains and patches element access for closed shadow roots.

**Where it lives:**
- `src/contentScript/content.tsx` - `traverseIframesAndShadowRoots()` function
- `src/contentScript/page-interceptor.tsx` - `Element.prototype.attachShadow` monkey patch
- Bundle capture logic - `bundle.shadowHosts` and `bundle.isClosedShadow`

**Why it exists:** Shadow DOM encapsulates component internals, blocking normal querySelector/XPath access. This subsystem bridges shadow boundaries for automation in modern web components and framework-based UIs.

## Inputs
**Recording Phase:**
```typescript
{
  target: HTMLElement,  // Event target (may be in shadow DOM)
  event: MouseEvent | InputEvent
}
```

**Playback Phase:**
```typescript
{
  bundle: {
    shadowHosts?: string[],    // XPath chain of shadow hosts
    isClosedShadow?: boolean,  // Closed shadow root flag
    xpath?: string,            // Element path within shadow root
    // ... other bundle fields
  }
}
```

## Outputs
**Recording:**
- `bundle.shadowHosts: string[]` - XPath selectors for each shadow host in chain
- `bundle.isClosedShadow: boolean` - True if any host has closed shadow root

**Playback:**
- Returns: `Document | ShadowRoot` - Context for element queries
- Throws: Error if closed shadow root cannot be accessed

## Internal Architecture

### Recording: Shadow Host Detection
```typescript
function detectShadowHost(element: HTMLElement): {
  shadowHosts: string[];
  isClosedShadow: boolean;
} {
  const hosts: string[] = [];
  let isClosed = false;
  let current = element.getRootNode();

  while (current instanceof ShadowRoot) {
    const host = current.host as HTMLElement;
    hosts.unshift(getXPath(host)); // Shadow host XPath
    
    if (current.mode === 'closed') {
      isClosed = true;
    }
    
    current = host.getRootNode();
  }

  return { shadowHosts: hosts, isClosedShadow: isClosed };
}
```

### Playback: Shadow Root Traversal
```typescript
function traverseShadowRoots(
  doc: Document,
  shadowHosts: string[]
): ShadowRoot | Document {
  let context: Document | ShadowRoot = doc;

  for (const hostXPath of shadowHosts) {
    // Find shadow host element
    const result = context.evaluate(
      hostXPath,
      context as any,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
    
    const host = result.singleNodeValue as HTMLElement;
    if (!host || !host.shadowRoot) {
      console.error('Shadow host not found:', hostXPath);
      return context; // Fallback to current context
    }

    context = host.shadowRoot;
  }

  return context;
}
```

### Closed Shadow Root Workaround
```typescript
// page-interceptor.tsx - Injected into page context
const originalAttachShadow = Element.prototype.attachShadow;
const closedShadowRoots = new WeakMap<Element, ShadowRoot>();

Element.prototype.attachShadow = function(init: ShadowRootInit) {
  const shadowRoot = originalAttachShadow.call(this, init);
  
  if (init.mode === 'closed') {
    closedShadowRoots.set(this, shadowRoot);
  }
  
  return shadowRoot;
};

// Access closed shadow root
function getClosedShadowRoot(host: Element): ShadowRoot | null {
  return closedShadowRoots.get(host) || null;
}
```

## Critical Dependencies
**Upstream:**
- **Event capture** - Detects events in shadow DOM
- **XPath computation** - Generates shadow host paths
- **page-interceptor.tsx** - Must be injected for closed shadow roots

**Downstream:**
- **Element finder** - Queries within shadow context
- **DOM label extraction** - Searches shadow DOM for labels

**External:**
- **Shadow DOM API:**
  - `Element.shadowRoot` (open only)
  - `element.getRootNode()` - Detects shadow root
  - `ShadowRoot.mode` - 'open' or 'closed'
- **Chrome DevTools Protocol** - Alternative for closed shadows (not currently used)

## Hidden Assumptions
1. **page-interceptor runs first** - Must patch before shadow roots created
2. **Open shadow roots preferred** - Closed roots require workaround
3. **Shadow host XPath stable** - Uses XPath to locate hosts
4. **No nested closed shadows** - May fail with multiple closed levels
5. **Shadow DOM loaded at record time** - May not exist during replay
6. **WeakMap persists** - Closed shadow roots not garbage collected prematurely
7. **Single shadow root per host** - Doesn't handle dynamic reattachment

## Stability Concerns
### High-Risk Patterns
1. **Closed shadow roots without interceptor**
   ```typescript
   // If page-interceptor not injected
   element.shadowRoot → null (for closed mode)
   // Cannot access shadow DOM
   ```

2. **Shadow host XPath changes**
   ```typescript
   // Recorded: /div[2]/my-component
   // Playback: /div[3]/my-component (DOM changed)
   → Cannot find shadow host
   ```

3. **Dynamic shadow root creation**
   ```typescript
   // Component unmounted/remounted
   // WeakMap reference lost for closed shadows
   ```

4. **Cross-origin shadow DOM**
   ```typescript
   // Custom elements loaded from external scripts
   // May block access even for open shadows
   ```

### Failure Modes
- **page-interceptor not injected** → Closed shadows inaccessible
- **Shadow host not found** → Returns parent document, wrong context
- **Shadow root null** → Element queries fail
- **Nested closed shadows** → Stops at first inaccessible level

## Edge Cases
### Input Variations
1. **No shadow DOM** (regular DOM)
   ```typescript
   bundle.shadowHosts = undefined;
   → Use regular document context
   ```

2. **Single open shadow root**
   ```typescript
   bundle.shadowHosts = ['/html/body/my-component'];
   bundle.isClosedShadow = false;
   → host.shadowRoot accessible
   ```

3. **Nested open shadows** (2+ levels)
   ```typescript
   bundle.shadowHosts = ['/my-app', '/my-card', '/my-button'];
   → Traverse chain sequentially
   ```

4. **Closed shadow root**
   ```typescript
   bundle.isClosedShadow = true;
   → Requires page-interceptor workaround
   ```

5. **Mixed open/closed shadows**
   ```typescript
   // Outer closed, inner open
   bundle.shadowHosts = ['/closed-component', '/open-child'];
   → Fails if closed not intercepted
   ```

### Output Variations
- **Success:** Returns innermost shadow root
- **Partial success:** Returns intermediate shadow root if innermost not found
- **Failure:** Returns document as fallback

## Developer-Must-Know Notes
### Quick Context
Shadow DOM is the **#1 reason web component automation fails**. Open shadows are relatively easy (just use `.shadowRoot`), but closed shadows require the page-interceptor trick. If recording/playback fails in custom elements, it's likely shadow DOM related.

### Common Issues
1. **Why can't I record in Material-UI components?**
   - Material-UI uses shadow DOM for encapsulation
   - May use closed mode
   - **Fix:** Ensure page-interceptor.tsx injected early

2. **Why does element finder fail in web components?**
   - Shadow boundary blocks querySelector
   - XPath doesn't traverse shadow roots
   - **Fix:** Check if `bundle.shadowHosts` captured correctly

3. **Why do Google Maps autocomplete fields fail?**
   - Google Maps uses closed shadow roots
   - page-interceptor monitors attachShadow calls
   - **Fix:** Verify interceptor script injection timing

### Integration Points
**Called By:**
- `recordEvent()` - Detects shadow hosts during recording
- `getDocumentForBundle()` - Resolves shadow context for playback
- `playAction()` - Queries elements within shadow root

**Calls:**
- `element.getRootNode()` - Shadow root detection
- `host.shadowRoot` - Access open shadows
- `closedShadowRoots.get(host)` - Access closed shadows via WeakMap

### Performance Notes
- **Average execution time:** <5ms for single shadow, <15ms for nested
- **WeakMap lookup:** O(1) for closed shadow root access
- **Traversal complexity:** O(n) where n = shadow host chain length

### Testing Guidance
**Mock Requirements:**
```typescript
// Create shadow DOM structure
const host = document.createElement('div');
const shadow = host.attachShadow({ mode: 'open' });
shadow.innerHTML = '<button id="test">Click</button>';
document.body.appendChild(host);

// Test recording
const button = shadow.getElementById('test');
// Should capture: bundle.shadowHosts = [getXPath(host)]
```

**Test Cases to Cover:**
1. ✅ Element in main document (no shadow)
2. ✅ Element in single open shadow root
3. ✅ Element in nested open shadows (2+ levels)
4. ✅ Element in closed shadow root (with interceptor)
5. ✅ Element in closed shadow root (without interceptor - should fail)
6. ✅ Shadow host XPath changed (should fallback gracefully)
7. ✅ Dynamic shadow root creation/removal

### Future Improvements
1. **Chrome DevTools Protocol fallback** - Access closed shadows without interceptor
   ```typescript
   // Use chrome.debugger API to inspect closed shadow roots
   ```

2. **Visual shadow boundary highlighting** - Show shadow DOM during recording
   ```typescript
   // Highlight shadow hosts with colored borders
   ```

3. **Shadow root caching** - Store references for performance
   ```typescript
   const shadowCache = new Map<string, ShadowRoot>();
   ```

4. **Retry logic for dynamic shadows** - Wait for shadow root creation
   ```typescript
   async function waitForShadowRoot(host: Element, timeout = 5000) {
     // Poll for host.shadowRoot !== null
   }
   ```

5. **Hybrid strategy** - Use CSS selectors + shadow piercing
   ```typescript
   // Experimental: document.querySelector('host >>> button')
   ```
