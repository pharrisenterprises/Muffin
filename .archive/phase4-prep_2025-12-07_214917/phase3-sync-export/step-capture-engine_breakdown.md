# Step Capture Engine Breakdown

## Purpose
**What it does:** Event-to-step transformation logic that converts browser events (click, input, keypress) into structured Step objects with full element metadata.

**Where it lives:** `recordEvent()` function in `src/contentScript/content.tsx`

**Why it exists:** Raw browser events lack context for reliable playback. This engine enriches events with XPath, label text, element bundle, iframe/shadow context.

## Inputs
```typescript
MouseEvent | InputEvent | KeyboardEvent → {
  target: HTMLElement,
  type: string,  // 'click', 'input', 'keydown'
  key?: string,  // For keyboard events
  x/y: number    // Mouse coordinates
}
```

## Outputs
```typescript
Step {
  event: 'click' | 'input' | 'enter',
  xpath: string,
  value?: string,
  label: string,
  bundle: Bundle,  // Full element metadata
  x/y: number
}
```

## Internal Architecture
```typescript
function recordEvent(event: Event) {
  const target = event.target as HTMLElement;
  
  // 1. Extract metadata
  const xpath = getXPath(target);
  const label = getLabelForTarget(target) || 'Unlabeled';
  const bundle = createBundle(target);
  
  // 2. Determine event type
  let eventType;
  if (event.type === 'click') eventType = 'click';
  else if (event.type === 'input') eventType = 'input';
  else if (event.type === 'keydown' && event.key === 'Enter') eventType = 'enter';
  
  // 3. Build step object
  const step: Step = {
    event: eventType,
    xpath,
    label,
    bundle,
    value: (target as HTMLInputElement).value || undefined,
    x: (event as MouseEvent).clientX,
    y: (event as MouseEvent).clientY,
    timestamp: Date.now()
  };
  
  // 4. Send to recorder UI
  chrome.runtime.sendMessage({
    type: 'log_event',
    data: step
  });
}
```

## Critical Dependencies
- **XPath computation** - `getXPath()`
- **Label extraction** - `getLabelForTarget()`
- **Bundle creation** - Captures ID, class, data-attrs, iframe chain, shadow hosts
- **Chrome runtime** - Message passing to recorder UI

## Hidden Assumptions
1. **Debouncing done elsewhere** - Doesn't prevent duplicate events
2. **All events recordable** - No filtering by element type
3. **Synchronous processing** - No await, immediate message send
4. **Target element stable** - Doesn't check if element still in DOM

## Developer-Must-Know Notes
- Captures EVERY click/input/enter - can produce noisy recordings
- Bundle includes iframe chain and shadow hosts for cross-boundary elements
- Label extraction tries 16 strategies (see dom-label-extraction_breakdown.md)
- Messages sent to background → forwarded to recorder UI page