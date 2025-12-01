# Iframe Handler Breakdown

## Purpose
**What it does:** Provides cross-frame DOM traversal during both recording and playback. Detects when events occur inside iframes, captures iframe context metadata, and reconstructs iframe navigation paths during replay.

**Where it lives:**
- Recording: `recordEvent()` in `src/contentScript/content.tsx` (iframe chain capture)
- Playback: `getDocumentForBundle()` and `traverseIframesAndShadowRoots()` functions

**Why it exists:** Standard DOM APIs cannot access elements inside iframes due to same-origin security policies. This subsystem bridges frame boundaries to record/replay actions in nested iframes.

## Inputs
**Data Requirements:**

Recording Phase:
```typescript
{
  target: HTMLElement,  // Event target (may be in iframe)
  event: MouseEvent | InputEvent  // Browser event
}
```

Playback Phase:
```typescript
{
  bundle: {
    iframeChain?: IframeInfo[],  // Recorded iframe path
    xpath?: string,               // Element path within final iframe
    // ... other bundle fields
  }
}

interface IframeInfo {
  id?: string;     // iframe element ID
  name?: string;   // iframe name attribute
  index?: number;  // Position among siblings (fallback)
}
```

## Outputs
**Recording Phase:**
- Populates `bundle.iframeChain: IframeInfo[]` - Ordered list from outermost to innermost iframe
- Example: `[{id: 'payment-frame'}, {name: 'card-input', index: 0}]`

**Playback Phase:**
- Returns: `Document` object of target iframe's contentDocument
- Enables element finder to query within correct frame context

## Internal Architecture

### Recording: Iframe Chain Capture
```typescript
function buildIframeChain(element: HTMLElement): IframeInfo[] {
  const chain: IframeInfo[] = [];
  let currentWindow = element.ownerDocument.defaultView;
  
  // Traverse from inner frame to outer
  while (currentWindow && currentWindow !== window.top) {
    const frameElement = currentWindow.frameElement as HTMLIFrameElement;
    
    if (frameElement) {
      const info: IframeInfo = {};
      if (frameElement.id) info.id = frameElement.id;
      if (frameElement.name) info.name = frameElement.name;
      
      // Fallback: position among siblings
      if (!info.id && !info.name) {
        const parent = frameElement.parentElement;
        const iframes = parent?.querySelectorAll('iframe');
        info.index = Array.from(iframes || []).indexOf(frameElement);
      }
      
      chain.unshift(info); // Add to front (outermost first)
    }
    
    currentWindow = currentWindow.parent;
  }
  
  return chain;
}
```

### Playback: Document Context Resolution
```typescript
function getDocumentForBundle(bundle: Bundle): Document {
  // No iframes → use main document
  if (!bundle.iframeChain || bundle.iframeChain.length === 0) {
    return document;
  }
  
  // Traverse iframe chain
  return traverseIframesAndShadowRoots(
    document,
    bundle.iframeChain,
    bundle.shadowHosts || []
  );
}

function traverseIframesAndShadowRoots(
  doc: Document,
  iframeChain: IframeInfo[],
  shadowHosts: string[]
): Document {
  let currentDoc = doc;
  
  // Step through each iframe in chain
  for (const iframeInfo of iframeChain) {
    let iframe: HTMLIFrameElement | null = null;
    
    // Strategy 1: Find by ID
    if (iframeInfo.id) {
      iframe = currentDoc.getElementById(iframeInfo.id) as HTMLIFrameElement;
    }
    
    // Strategy 2: Find by name
    if (!iframe && iframeInfo.name) {
      iframe = currentDoc.querySelector(
        `iframe[name="${iframeInfo.name}"]`
      ) as HTMLIFrameElement;
    }
    
    // Strategy 3: Find by index
    if (!iframe && iframeInfo.index !== undefined) {
      const iframes = currentDoc.querySelectorAll('iframe');
      iframe = iframes[iframeInfo.index] as HTMLIFrameElement;
    }
    
    if (!iframe || !iframe.contentDocument) {
      console.error('❌ Cannot access iframe:', iframeInfo);
      return currentDoc; // Return last valid document
    }
    
    currentDoc = iframe.contentDocument;
  }
  
  // Handle shadow DOM after iframes (if any)
  // ... shadow root traversal logic
  
  return currentDoc;
}
```

## Critical Dependencies
**Upstream:**
- **Event capture system** - Provides target element for iframe detection
- **Bundle creation** - Stores iframe chain with other metadata

**Downstream:**
- **Element finder** - Uses returned document for querySelector/XPath
- **DOM label extraction** - Searches in correct iframe context
- **XPath computation** - Generates paths relative to iframe document

**External:**
- **Browser APIs:**
  - `window.frameElement` - Reference to containing iframe
  - `window.parent` / `window.top` - Frame hierarchy navigation
  - `HTMLIFrameElement.contentDocument` - Cross-frame document access
  - **Same-origin policy** - Blocks cross-origin iframe access

## Hidden Assumptions
1. **Same-origin iframes only** - Cannot access cross-origin frames (security)
2. **Synchronous access** - Assumes iframe.contentDocument immediately available
3. **Iframe loaded at recording time** - May not exist yet during playback
4. **Stable iframe structure** - Assumes same nesting depth between record/replay
5. **ID/name persistence** - Relies on iframe identifiers not changing
6. **No nested shadow DOM in iframes** - Handles separately, not combined traversal
7. **Top window is parent** - Assumes content script runs in main frame
8. **Index-based fallback last resort** - Brittle if iframe order changes

## Stability Concerns
### High-Risk Patterns
1. **Cross-origin iframe blocking**
   ```typescript
   // ❌ Cannot record events in cross-origin iframes
   <iframe src="https://external-payment.com/checkout">
   // SecurityError: Blocked access to contentDocument
   ```

2. **Iframe not loaded during playback**
   ```typescript
   // Recorded in loaded iframe, replayed before iframe loads
   const iframe = document.getElementById('payment-frame');
   iframe.contentDocument; // null if not loaded yet
   → Element finder fails
   ```

3. **Dynamic iframe IDs** (React/Vue components)
   ```typescript
   // Recording: <iframe id="frame-abc123">
   // Playback: <iframe id="frame-xyz789"> // New hash
   → Chain resolution fails
   ```

4. **Iframe order changes**
   ```typescript
   // Recording: iframes = [form-frame, ad-frame, payment-frame]
   // Playback: iframes = [ad-frame, form-frame, payment-frame] // Reordered
   → Index-based fallback finds wrong frame
   ```

### Failure Modes
- **Cross-origin iframe** → Cannot record, silently skips
- **Iframe not found** → Returns main document, element finder searches wrong context
- **Nested iframe depth mismatch** → Stops at wrong level
- **contentDocument null** → Returns parent document, may find wrong element

## Edge Cases
### Input Variations
1. **No iframes** (main document)
   ```typescript
   bundle.iframeChain = undefined;
   getDocumentForBundle(bundle) → document
   ```

2. **Single iframe**
   ```typescript
   bundle.iframeChain = [{id: 'myframe'}];
   → Returns iframe.contentDocument
   ```

3. **Deeply nested iframes** (3+ levels)
   ```typescript
   bundle.iframeChain = [
     {id: 'outer'},
     {name: 'middle'},
     {index: 0} // Innermost
   ];
   → Traverses chain sequentially
   ```

4. **Iframe with no identifiers**
   ```typescript
   <iframe> // No id, name, or distinguishing features
   → Records index-based: {index: 2}
   → Brittle on DOM changes
   ```

5. **Cross-origin iframe**
   ```typescript
   <iframe src="https://ads.com/banner">
   → Cannot access contentDocument
   → Chain capture stops at parent frame
   ```

### Output Variations
- **Success:** Returns correct iframe's `contentDocument`
- **Partial success:** Returns intermediate iframe if innermost not found
- **Failure:** Returns main `document` as fallback

## Developer-Must-Know Notes
### Quick Context
This is the **cross-frame bridge** that makes iframe automation possible. Without it, the recorder would only work in the main document. Most failures here are due to same-origin policy restrictions—there's no workaround for cross-origin iframes in content scripts.

### Common Issues
1. **Why can't I record in payment iframes?**
   - Payment providers use cross-origin iframes for security
   - Browser blocks contentDocument access
   - **Fix:** Cannot be fixed—use direct integration with payment provider APIs

2. **Why does replay fail to find iframe?**
   - Iframe not loaded yet (async)
   - Iframe ID changed (dynamic)
   - **Fix:** Add retry logic with MutationObserver, use stable IDs

3. **Why does it find the wrong element?**
   - Iframe chain invalid, falls back to main document
   - Multiple iframes with same name
   - **Fix:** Ensure unique iframe IDs, validate chain during recording

### Integration Points
**Called By:**
- `recordEvent()` - During click/input recording
- `playAction()` - Before element finding
- `getLabelForTarget()` - For cross-frame label searches

**Calls:**
- `window.frameElement` - Detect iframe context
- `iframe.contentDocument` - Access nested document

### Performance Notes
- **Average execution time:** <1ms for single iframe, <5ms for nested
- **No async delays** - Synchronous iframe traversal
- **Bottleneck:** Multiple querySelector calls per iframe level
- **Optimization:** Cache iframe references during playback session

### Testing Guidance
**Mock Requirements:**
```typescript
// Create nested iframe structure
const iframe = document.createElement('iframe');
iframe.id = 'test-frame';
iframe.srcdoc = '<input id="nested-input">';
document.body.appendChild(iframe);

// Wait for iframe load
iframe.onload = () => {
  const nestedInput = iframe.contentDocument.getElementById('nested-input');
  // Test recording/playback in iframe context
};
```

**Test Cases to Cover:**
1. ✅ Event in main document (no iframes)
2. ✅ Event in single iframe with ID
3. ✅ Event in nested iframes (2+ levels)
4. ✅ Iframe found by name (no ID)
5. ✅ Iframe found by index (no ID/name)
6. ✅ Cross-origin iframe blocked (graceful failure)
7. ✅ Iframe not loaded during playback (contentDocument null)
8. ✅ Iframe order changed (index-based fails)

### Future Improvements
1. **Async iframe loading** - Wait for contentDocument availability
   ```typescript
   async function waitForIframe(id: string, timeout = 5000): Promise<Document> {
     // Poll for iframe.contentDocument !== null
   }
   ```

2. **Iframe stability scoring** - Prefer stable identifiers
   ```typescript
   const score = {
     id: 100,        // Most stable
     name: 75,       // Moderately stable
     index: 25       // Least stable
   };
   ```

3. **Cross-origin iframe messaging** - Use postMessage for external frames
   ```typescript
   // Inject helper script in cross-origin iframe (if allowed)
   iframe.contentWindow.postMessage({action: 'click', selector: '#btn'}, '*');
   ```

4. **Visual iframe selection** - Let user click iframe during recording
   ```typescript
   // Highlight iframe boundaries, user confirms target frame
   ```

5. **Iframe snapshot validation** - Store iframe structure signature
   ```typescript
   // Record: iframe count, IDs, structure hash
   // Playback: Validate structure matches before replay
   ```
