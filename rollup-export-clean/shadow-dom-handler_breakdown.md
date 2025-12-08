# Shadow DOM Handler - Component Breakdown

**Last Updated:** December 7, 2025

---

## Purpose
**What it does:** Enables recording and playback of user interactions with elements inside shadow DOM boundaries (both open and closed shadow roots). Traverses shadow host chains and uses page-interceptor to access closed shadow roots.

**Where it lives:**
- `src/contentScript/content.tsx` - `traverseIframesAndShadowRoots()` function
- `src/contentScript/page-interceptor.tsx` - `Element.prototype.attachShadow` monkey patch
- Bundle capture logic - `bundle.shadowHosts` and `bundle.isClosedShadow` fields

**Why it exists:** Shadow DOM encapsulates component internals, blocking normal `querySelector`/XPath access. This subsystem bridges shadow boundaries for automation in modern web components and framework-based UIs (Google Maps, Salesforce Lightning, etc.).

---

## Inputs
**Recording Phase:**
```typescript
{
  target: HTMLElement,  // Event target (may be inside shadow DOM)
  event: MouseEvent | InputEvent
}
```

**Playback Phase:**
```typescript
{
  bundle: {
    shadowHosts?: string[],    // XPath chain of shadow hosts
    isClosedShadow?: boolean,  // True if any host has closed shadow
    xpath?: string,            // Element path within shadow root
    // ... other bundle fields
  }
}
```

---

## Outputs
**Recording:**
- `bundle.shadowHosts: string[]` - XPath selectors for each shadow host in chain
- `bundle.isClosedShadow: boolean` - True if any host has closed shadow root

**Playback:**
- Returns: `Document | ShadowRoot` - Context for element queries
- Throws: Error if closed shadow root cannot be accessed

---

## Internal Architecture

### Recording: Shadow Host Detection
```typescript
// content.tsx
function detectShadowHost(element: HTMLElement): {
  shadowHosts: string[];
  isClosedShadow: boolean;
} {
  const hosts: string[] = [];
  let isClosed = false;
  let current = element.getRootNode();

  // Traverse up shadow tree
  while (current instanceof ShadowRoot) {
    const host = current.host as HTMLElement;
    hosts.unshift(getXPath(host));  // Shadow host XPath
    
    if (current.mode === 'closed') {
      isClosed = true;
    }
    
    current = host.getRootNode();
  }

  return { shadowHosts: hosts, isClosedShadow: isClosed };
}

// Usage during event capture
function captureEvent(event: Event) {
  const target = event.target as HTMLElement;
  const { shadowHosts, isClosedShadow } = detectShadowHost(target);
  
  const bundle = {
    xpath: getXPath(target),
    shadowHosts,
    isClosedShadow,
    // ... other bundle fields
  };
  
  sendToRecorder(bundle);
}
```

### Playback: Shadow Root Traversal
```typescript
// replayer.tsx
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
    if (!host) {
      console.error('Shadow host not found:', hostXPath);
      return context;  // Fallback to current context
    }

    // Access shadow root
    if (host.shadowRoot) {
      context = host.shadowRoot;  // Open shadow
    } else if (host.__realShadowRoot) {
      context = host.__realShadowRoot;  // Closed shadow (from interceptor)
    } else {
      console.error('Shadow root not accessible:', hostXPath);
      return context;
    }
  }

  return context;
}

// Usage during playback
function findElement(bundle: Bundle): HTMLElement | null {
  let context: Document | ShadowRoot = document;

  // Traverse iframes first (if any)
  if (bundle.iframeChain) {
    context = traverseIframes(context, bundle.iframeChain);
  }

  // Then traverse shadow roots
  if (bundle.shadowHosts && bundle.shadowHosts.length > 0) {
    context = traverseShadowRoots(context, bundle.shadowHosts);
  }

  // Finally, find element within shadow root
  return evaluateXPath(bundle.xpath, context);
}
```

### Closed Shadow Root Access (via page-interceptor)
```typescript
// page-interceptor.tsx (injected into MAIN world)
const originalAttachShadow = Element.prototype.attachShadow;
const closedShadowRoots = new WeakMap<Element, ShadowRoot>();

Element.prototype.attachShadow = function(init: ShadowRootInit) {
  const shadowRoot = originalAttachShadow.call(this, init);
  
  if (init.mode === 'closed') {
    closedShadowRoots.set(this, shadowRoot);
    
    // Expose via custom property for content script
    Object.defineProperty(this, '__realShadowRoot', {
      get: () => closedShadowRoots.get(this),
      enumerable: false,
      configurable: true
    });
  }
  
  return shadowRoot;
};
```

---

## Critical Dependencies
**Upstream:**
- **Event capture** - Detects events in shadow DOM
- **XPath computation** - Generates shadow host paths
- **page-interceptor.tsx** - Must be injected for closed shadow roots

**Downstream:**
- **Element finder** (DOM Element Finder) - Queries within shadow context
- **DOM label extraction** - Searches shadow DOM for labels

**External:**
- **Shadow DOM API:**
  - `Element.shadowRoot` (open only)
  - `element.getRootNode()` - Detects shadow root
  - `ShadowRoot.mode` - 'open' or 'closed'
  - `ShadowRoot.host` - Host element reference

---

## Hidden Assumptions
1. **page-interceptor runs first** - Must patch before any shadow roots created
2. **Open shadow roots preferred** - Closed roots require workaround
3. **Shadow host XPath stable** - Uses XPath to locate hosts (may break on DOM changes)
4. **No nested closed shadows** - May fail with multiple closed levels
5. **Shadow DOM loaded at record time** - May not exist during replay
6. **WeakMap persists** - Closed shadow roots not garbage collected prematurely
7. **Single shadow root per host** - Doesn't handle dynamic reattachment
8. **Same-origin only** - Cannot access cross-origin shadow DOM

---

## Stability Concerns

### High-Risk Patterns
1. **Closed shadow roots without interceptor**
   ```typescript
   // If page-interceptor not injected or runs late
   element.shadowRoot → null (for closed mode)
   // Cannot access shadow DOM, playback fails
   ```

2. **Shadow host XPath changes**
   ```typescript
   // Recorded: /div[2]/my-component
   // Playback: /div[3]/my-component (DOM structure changed)
   → Cannot find shadow host, playback fails
   ```

3. **Dynamic shadow root creation**
   ```typescript
   // Component unmounted/remounted after recording
   // WeakMap reference lost for closed shadows
   ```

4. **Nested closed shadows** (multiple levels)
   ```typescript
   // First closed shadow accessible via __realShadowRoot
   // Second closed shadow inside first → Not exposed
   ```

### Failure Modes
- **page-interceptor not injected** - Closed shadows inaccessible
- **Shadow host not found** - Returns parent document, wrong context (element not found)
- **Shadow root null** - Element queries fail
- **Late interceptor injection** - Early shadow roots not intercepted

---

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
   → host.shadowRoot accessible directly
   ```

3. **Nested open shadows** (2+ levels)
   ```typescript
   bundle.shadowHosts = ['/my-app', '/my-card', '/my-button'];
   bundle.isClosedShadow = false;
   → Traverse chain via shadowRoot property
   ```

4. **Single closed shadow root**
   ```typescript
   bundle.shadowHosts = ['/html/body/gmp-place-autocomplete'];
   bundle.isClosedShadow = true;
   → Use host.__realShadowRoot (from interceptor)
   ```

5. **Mixed open/closed shadows**
   ```typescript
   bundle.shadowHosts = ['/my-app', '/closed-component', '/open-component'];
   bundle.isClosedShadow = true;
   → First host open, second closed, third open
   ```

6. **Shadow root removed/readded**
   ```typescript
   const host = document.querySelector('my-component');
   host.remove();  // WeakMap entry may be GC'd
   document.body.appendChild(host);
   host.__realShadowRoot;  // May be undefined
   ```

---

## Developer-Must-Know Notes
- **page-interceptor CRITICAL** - Must inject into MAIN world before shadow roots created
- **Traversal order** - Iframes first, then shadow roots, then final XPath
- **Closed shadow workaround** - Uses `__realShadowRoot` custom property
- **WeakMap prevents leaks** - Allows GC of removed shadow hosts
- **XPath stability** - Shadow host XPath must remain stable across sessions
- **Google Maps specific** - Primary use case is `<gmp-place-autocomplete>` closed shadow
- **No fallback for late shadows** - Closed shadows created before interceptor are lost
- **Open shadows easy** - Direct `shadowRoot` access, no interceptor needed

---

## Phase 3 Integration Points

### Strategy Implementation
| Strategy ID | Relevance | Integration Point |
|-------------|-----------|-------------------|
| **A2** | Critical | Shadow DOM Recording specification requires closed shadow access |
| **ENG-003** | Critical | DOMElementFinder uses traverseShadowRoots() for element location |
| **INT-002** | High | Cross-frame shadow detection relies on shadowHosts chain |
| **D4** | Critical | Complex UI Elements (Google Maps) require closed shadow support |

### Specification Mapping
- **A2** (Shadow DOM Recording) - Enables automation of closed shadow roots
- **D4** (Complex UI Elements) - Google Maps autocomplete requires closed shadow access
- **E2** (Element Detection) - Fallback strategies need shadow context traversal
- **H3** (Data Integrity) - Bundle captures complete shadow host chain

### Evidence References
- Code: `src/contentScript/content.tsx` (detectShadowHost function)
- Code: `src/contentScript/replayer.tsx` (traverseShadowRoots function)
- Code: `src/contentScript/page-interceptor.tsx` (attachShadow monkey patch)
- Test: Google Maps test case (autocomplete interactions in closed shadow)
- Docs: Shadow DOM strategy document (Phase 3 specification A2)

### Integration Risks
1. **Timing Dependency:** Late interceptor injection misses early shadow root creation
2. **XPath Brittleness:** Shadow host XPath may break on DOM structure changes
3. **Nested Closed Shadows:** Multiple levels of closed shadows not fully supported
4. **Security Exposure:** `__realShadowRoot` exposes internals components intended to hide

---

## Related Components
- **Page Interceptor** (`page-interceptor_breakdown.md`) - Monkey patches attachShadow for closed shadows
- **Injection Manager** (`injection-manager_breakdown.md`) - Injects page-interceptor with `world: 'MAIN'`
- **DOM Element Finder** (`dom-element-finder_breakdown.md`) - Uses traverseShadowRoots() for element queries
- **Content Script Recorder** (`content-script-recorder_breakdown.md`) - Calls detectShadowHost() during event capture
- **Iframe Handler** (`iframe-handler_breakdown.md`) - Works with shadow handler for complex nested scenarios
