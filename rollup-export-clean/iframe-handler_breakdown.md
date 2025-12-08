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
1. **Cross-origin iframe blocking** - Cannot record events in cross-origin iframes
2. **Iframe not loaded during playback** - contentDocument null before iframe loads
3. **Dynamic iframe IDs** - React/Vue components generate new IDs on each render
4. **Iframe order changes** - Index-based fallback finds wrong frame

### Failure Modes
- **Cross-origin iframe** → Cannot record, silently skips
- **Iframe not found** → Returns main document, element finder searches wrong context
- **Nested iframe depth mismatch** → Stops at wrong level
- **contentDocument null** → Returns parent document, may find wrong element

## Developer-Must-Know Notes
- This is the **cross-frame bridge** that makes iframe automation possible
- Most failures are due to same-origin policy restrictions—no workaround for cross-origin iframes
- Average execution time: <1ms for single iframe, <5ms for nested
- No async delays - synchronous iframe traversal

## Phase 3 Integration Points

### Recording System (Phase 3A)
- **Migration**: IframeCapture layer becomes independent module
- **Integration**: RecordingOrchestrator coordinates iframe detection with other evidence
- **Enhancement**: Detects cross-origin iframes and warns user during recording

### Test Execution (Phase 3F)
- **Input**: SelfHealingPlaybackEngine uses iframe chain for context resolution
- **Output**: Correct document context for element finding
- **Integration**: HealingOrchestrator validates iframe structure before attempting healing

### Strategy System (Phase 3C)
- **Input**: DecisionEngine considers iframe depth in strategy selection
- **Output**: Iframe-aware strategies prioritized (CDP can access cross-origin frames)
- **Integration**: CDPStrategy used as fallback for cross-origin iframe automation

**Legacy Issues**:
1. **Cross-origin blocking**: Cannot record/replay in payment iframes
2. **No retry logic**: Fails immediately if iframe not loaded
3. **Index-based brittleness**: Iframe order changes break playback

**Phase 3 Improvements**:
1. **CDP fallback**: Use Chrome DevTools Protocol for cross-origin frame access
2. **Async loading**: Wait for iframe.contentDocument with timeout
3. **Iframe fingerprinting**: Record structure signature for validation
4. **Visual selection**: Let user confirm target iframe during recording

**Last Updated**: December 7, 2025 — Phase 3 Specification Complete
