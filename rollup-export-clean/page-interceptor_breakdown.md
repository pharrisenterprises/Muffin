# Page Interceptor - Component Breakdown

**Last Updated:** December 7, 2025

---

## Purpose
**What it does:** Monkey patches `Element.prototype.attachShadow` to intercept closed shadow root creation. Exposes closed shadow roots via custom `__realShadowRoot` property for automation. Enables recording/playback of elements inside closed shadow DOM (e.g., Google Maps autocomplete).

**Where it lives:** `src/contentScript/page-interceptor.tsx` (injected into **MAIN** world, not ISOLATED)

**Why it exists:** Closed shadow roots (mode='closed') hide `element.shadowRoot` from external scripts. This blocks automation of components like `<gmp-place-autocomplete>`. The interceptor preserves access for content scripts via `window.postMessage`.

---

## Inputs
**Shadow Root Creation:**
```typescript
// Application code creates shadow root
customElement.attachShadow({ mode: 'closed' });
```

**Content Script Queries:**
```typescript
// Content script needs to access closed shadow root
const host = document.querySelector('gmp-place-autocomplete');
const shadowRoot = host.__realShadowRoot;  // Exposed by interceptor
```

---

## Outputs
**Enhanced Element:**
```typescript
element.__realShadowRoot: ShadowRoot | null  // Custom property
```

**postMessage Events:**
```typescript
window.postMessage({
  type: 'CLOSED_SHADOW_DETECTED',
  hostXPath: '/html/body/gmp-place-autocomplete',
  timestamp: 1234567890
}, '*');
```

---

## Internal Architecture

### Monkey Patch Implementation
```typescript
// page-interceptor.tsx
(function() {
  // Store original method
  const originalAttachShadow = Element.prototype.attachShadow;

  // WeakMap to store closed shadow roots
  const closedShadowRoots = new WeakMap<Element, ShadowRoot>();

  // Override attachShadow
  Element.prototype.attachShadow = function(init: ShadowRootInit): ShadowRoot {
    // Call original to create shadow root
    const shadowRoot = originalAttachShadow.call(this, init);

    // If closed mode, store reference
    if (init.mode === 'closed') {
      closedShadowRoots.set(this, shadowRoot);
      
      // Expose via custom property
      Object.defineProperty(this, '__realShadowRoot', {
        get: () => closedShadowRoots.get(this),
        enumerable: false,
        configurable: true
      });

      // Notify content script
      window.postMessage({
        type: 'CLOSED_SHADOW_DETECTED',
        hostXPath: getXPath(this),
        timestamp: Date.now()
      }, '*');
    }

    return shadowRoot;
  };
})();
```

### Google Maps Autocomplete Targeting
```typescript
// Specific use case: Google Places Autocomplete
// <gmp-place-autocomplete> creates closed shadow root
const autocomplete = document.querySelector('gmp-place-autocomplete');

// Without interceptor:
autocomplete.shadowRoot;  // null (closed mode)

// With interceptor:
autocomplete.__realShadowRoot;  // ShadowRoot instance
```

### Content Script Integration
```typescript
// content.tsx
window.addEventListener('message', (event) => {
  if (event.data.type === 'CLOSED_SHADOW_DETECTED') {
    console.log('Closed shadow root detected:', event.data.hostXPath);
    // Update bundle.isClosedShadow flag
  }
});

// During element finding
function findElement(bundle) {
  let context = document;
  
  if (bundle.shadowHosts) {
    // Traverse shadow roots
    for (const hostXPath of bundle.shadowHosts) {
      const host = evaluateXPath(hostXPath, context);
      
      if (bundle.isClosedShadow && host.__realShadowRoot) {
        context = host.__realShadowRoot;  // Use intercepted root
      } else {
        context = host.shadowRoot;  // Normal open shadow
      }
    }
  }
  
  return evaluateXPath(bundle.xpath, context);
}
```

---

## Critical Dependencies
**Upstream:**
- **Injection Manager** (`injection-manager_breakdown.md`) - Must inject with `world: 'MAIN'`
- **Shadow DOM Handler** (`shadow-dom-handler_breakdown.md`) - Consumes `__realShadowRoot`

**Downstream:**
- **Element.prototype.attachShadow** - Native browser API being patched
- **window.postMessage** - Communication channel to content script

**External:**
- **WeakMap** - Prevents memory leaks by allowing GC of removed elements
- **Object.defineProperty** - Creates non-enumerable `__realShadowRoot`

---

## Hidden Assumptions
1. **Injected before DOM creation** - Must patch before any shadow roots created
2. **Single interception** - Assumes no other scripts patch attachShadow
3. **Same-origin only** - Cannot intercept cross-origin iframes
4. **WeakMap persistence** - Assumes elements not GC'd during session
5. **postMessage listener active** - Content script must be listening
6. **MAIN world injection** - ISOLATED world cannot access page prototypes
7. **XPath stability** - Assumes host XPath valid for identification

---

## Stability Concerns

### High-Risk Patterns
1. **Injection timing race**
   ```typescript
   // If shadow roots created BEFORE interceptor loads
   document.createElement('my-component').attachShadow({ mode: 'closed' });
   // → Not intercepted, stays closed
   ```

2. **Conflicting monkey patches**
   ```typescript
   // Site or library also patches attachShadow
   Element.prototype.attachShadow = function(init) {
     // Their patch runs AFTER ours
     // → May override our interceptor
   };
   ```

3. **WeakMap GC timing**
   ```typescript
   const host = document.querySelector('gmp-place-autocomplete');
   host.remove();  // Element removed from DOM
   // WeakMap entry may be GC'd
   host.__realShadowRoot;  // May return undefined
   ```

4. **postMessage flooding**
   ```typescript
   // Site creates 100+ closed shadow roots on page load
   // → 100+ postMessage events
   ```

### Failure Modes
- **Late injection** - Shadow roots created before patch are not intercepted
- **Patch collision** - Other scripts overriding attachShadow break interceptor
- **ISOLATED world injection** - Wrong injection context blocks prototype access
- **postMessage blocked** - Some CSP policies may block postMessage

---

## Edge Cases

### Input Variations
1. **Open shadow root created**
   ```typescript
   element.attachShadow({ mode: 'open' });
   // Interceptor does nothing, shadowRoot already accessible
   ```

2. **Closed shadow root removed/readded**
   ```typescript
   const host = document.createElement('div');
   host.attachShadow({ mode: 'closed' });
   host.remove();  // WeakMap entry may be GC'd
   document.body.appendChild(host);
   host.__realShadowRoot;  // May be undefined
   ```

3. **Multiple closed shadows per page**
   ```typescript
   // 50 custom elements with closed shadows
   // → 50 postMessage events, 50 WeakMap entries
   ```

4. **Shadow root created dynamically**
   ```typescript
   // Component lazy-loaded 5 seconds after page load
   setTimeout(() => {
     element.attachShadow({ mode: 'closed' });
   }, 5000);
   // → Intercepted if page-interceptor still active
   ```

5. **Cross-origin iframe**
   ```typescript
   // Cannot inject into cross-origin iframe
   // → Closed shadows in iframe not intercepted
   ```

---

## Developer-Must-Know Notes
- **MUST inject into MAIN world** - ISOLATED world cannot patch page prototypes
- **Must inject early** - Before any shadow roots created (use `run_at: 'document_start'`)
- **WeakMap prevents leaks** - Allows GC of removed elements
- **postMessage security** - Uses `'*'` target origin (no security filtering)
- **Google Maps specific** - Primary use case is `<gmp-place-autocomplete>`
- **Prototype pollution** - Adds `__realShadowRoot` to all elements (non-enumerable)
- **No rollback** - Cannot un-patch once executed

---

## Phase 3 Integration Points

### Strategy Implementation
| Strategy ID | Relevance | Integration Point |
|-------------|-----------|-------------------|
| **A2** | Critical | Shadow DOM Recording specification requires closed shadow access |
| **ENG-003** | Critical | DOMElementFinder depends on `__realShadowRoot` for closed shadow queries |
| **INT-002** | High | Cross-frame shadow detection relies on postMessage events |

### Specification Mapping
- **A2** (Shadow DOM Recording) - Enables automation of closed shadow roots
- **D4** (Complex UI Elements) - Google Maps autocomplete requires this interceptor
- **E2** (Element Detection) - Fallback strategies need closed shadow access

### Evidence References
- Code: `src/contentScript/page-interceptor.tsx` lines 1-80 (full implementation)
- Test: Google Maps test case (autocomplete interactions)
- Docs: Shadow DOM strategy document (references closed shadow workaround)

### Integration Risks
1. **Timing Dependency:** Late injection misses early shadow root creation (no retroactive interception)
2. **Patch Collision:** Sites with own attachShadow patches may override/break interceptor
3. **Security Exposure:** `__realShadowRoot` exposes internals that components intended to hide
4. **Performance:** postMessage events for every closed shadow may impact load time

---

## Related Components
- **Injection Manager** (`injection-manager_breakdown.md`) - Injects page-interceptor with `world: 'MAIN'`
- **Shadow DOM Handler** (`shadow-dom-handler_breakdown.md`) - Consumes `__realShadowRoot` property
- **DOM Element Finder** (`dom-element-finder_breakdown.md`) - Queries within closed shadow contexts
- **Content Script Recorder** (`content-script-recorder_breakdown.md`) - Listens for `CLOSED_SHADOW_DETECTED` messages
