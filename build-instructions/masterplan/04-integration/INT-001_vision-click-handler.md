# INT-001: Vision Click Handler

> **Build Card:** INT-001  
> **Category:** Integration Points  
> **Dependencies:** ENG-001, ENG-008  
> **Risk Level:** Low  
> **Estimated Lines:** 280-340

---

## 1. PURPOSE

Implement the `VISION_CLICK` message handler in the content script that receives click coordinates from VisionEngine and executes the click on the page. This handler bridges the gap between Vision-based coordinate detection (in background/offscreen) and DOM interaction (in content script). Supports configurable click types, modifiers, and event simulation.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| Content Script | `src/content/content.tsx` | Message handling structure |
| VisionEngine | `src/lib/visionEngine.ts` | clickAtCoordinates() call format |
| API Contracts | `/future-spec/06_api-contracts.md` | Message payload specification |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/content/content.tsx` | MODIFY | +85 |
| `src/types/messages.types.ts` | MODIFY | +20 |

### Artifacts

- `VISION_CLICK` message handler added
- `VisionClickPayload` interface defined
- `VisionClickResponse` interface defined
- Click simulation utilities

---

## 4. DETAILED SPECIFICATION

### 4.1 Type Definitions

```typescript
// In src/types/messages.types.ts

/**
 * Click type for Vision click handler
 */
export type VisionClickType = 'left' | 'right' | 'middle' | 'double';

/**
 * Payload for VISION_CLICK message
 */
export interface VisionClickPayload {
  /** X coordinate (viewport-relative) */
  x: number;
  
  /** Y coordinate (viewport-relative) */
  y: number;
  
  /** Type of click to perform */
  clickType?: VisionClickType;
  
  /** Modifier keys to hold during click */
  modifiers?: {
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    meta?: boolean;
  };
  
  /** Whether to scroll element into view first */
  scrollIntoView?: boolean;
  
  /** Delay between mousedown and mouseup (ms) */
  holdDurationMs?: number;
  
  /** Whether to dispatch hover events before click */
  dispatchHover?: boolean;
}

/**
 * Response from VISION_CLICK handler
 */
export interface VisionClickResponse {
  success: boolean;
  
  /** Element that was clicked (tag name) */
  clickedElement?: string;
  
  /** Element's text content (truncated) */
  elementText?: string;
  
  /** Actual coordinates where click occurred */
  coordinates?: {
    x: number;
    y: number;
  };
  
  /** Whether element was found at coordinates */
  elementFound: boolean;
  
  /** Error message if failed */
  error?: string;
}
```

### 4.2 Vision Click Handler Implementation

```typescript
// In src/content/content.tsx - Add to message handlers

import { VisionClickPayload, VisionClickResponse } from '@/types/messages.types';

/**
 * Handles VISION_CLICK messages from VisionEngine
 * Executes click at specified coordinates
 */
function handleVisionClick(
  payload: VisionClickPayload,
  sendResponse: (response: VisionClickResponse) => void
): boolean {
  const {
    x,
    y,
    clickType = 'left',
    modifiers = {},
    scrollIntoView = false,
    holdDurationMs = 0,
    dispatchHover = true
  } = payload;

  try {
    // Get element at coordinates
    const element = document.elementFromPoint(x, y) as HTMLElement | null;

    if (!element) {
      sendResponse({
        success: false,
        elementFound: false,
        error: `No element found at coordinates (${x}, ${y})`,
        coordinates: { x, y }
      });
      return true;
    }

    // Optionally scroll element into view
    if (scrollIntoView) {
      element.scrollIntoView({ behavior: 'instant', block: 'center' });
      // Re-get element after scroll as coordinates may have shifted
      const newElement = document.elementFromPoint(x, y) as HTMLElement | null;
      if (newElement && newElement !== element) {
        // Coordinates shifted, use new element
      }
    }

    // Build mouse event options
    const eventOptions: MouseEventInit = {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: x,
      clientY: y,
      screenX: x + window.screenX,
      screenY: y + window.screenY,
      ctrlKey: modifiers.ctrl || false,
      altKey: modifiers.alt || false,
      shiftKey: modifiers.shift || false,
      metaKey: modifiers.meta || false,
      button: getMouseButton(clickType),
      buttons: getMouseButtons(clickType)
    };

    // Dispatch hover events if requested
    if (dispatchHover) {
      const mouseoverEvent = new MouseEvent('mouseover', eventOptions);
      const mouseenterEvent = new MouseEvent('mouseenter', { ...eventOptions, bubbles: false });
      const mousemoveEvent = new MouseEvent('mousemove', eventOptions);
      
      element.dispatchEvent(mouseenterEvent);
      element.dispatchEvent(mouseoverEvent);
      element.dispatchEvent(mousemoveEvent);
    }

    // Execute click based on type
    if (clickType === 'double') {
      executeDoubleClick(element, eventOptions, holdDurationMs);
    } else {
      executeSingleClick(element, eventOptions, holdDurationMs);
    }

    // Get element info for response
    const elementText = getElementText(element);
    const tagName = element.tagName.toLowerCase();

    sendResponse({
      success: true,
      elementFound: true,
      clickedElement: tagName,
      elementText: elementText.substring(0, 100),
      coordinates: { x, y }
    });

  } catch (error) {
    sendResponse({
      success: false,
      elementFound: false,
      error: error instanceof Error ? error.message : 'Click execution failed',
      coordinates: { x, y }
    });
  }

  return true; // Keep message channel open for async response
}

/**
 * Executes a single click (mousedown → mouseup → click)
 */
function executeSingleClick(
  element: HTMLElement,
  eventOptions: MouseEventInit,
  holdDurationMs: number
): void {
  const mousedownEvent = new MouseEvent('mousedown', eventOptions);
  const mouseupEvent = new MouseEvent('mouseup', eventOptions);
  const clickEvent = new MouseEvent('click', eventOptions);

  element.dispatchEvent(mousedownEvent);

  if (holdDurationMs > 0) {
    // Synchronous hold for simplicity (async would require different pattern)
    const start = performance.now();
    while (performance.now() - start < holdDurationMs) {
      // Busy wait - not ideal but keeps it synchronous
    }
  }

  element.dispatchEvent(mouseupEvent);
  element.dispatchEvent(clickEvent);

  // Also try native click for better compatibility
  if (typeof element.click === 'function') {
    try {
      element.click();
    } catch {
      // Native click may fail on some elements, ignore
    }
  }
}

/**
 * Executes a double click
 */
function executeDoubleClick(
  element: HTMLElement,
  eventOptions: MouseEventInit,
  holdDurationMs: number
): void {
  // First click
  executeSingleClick(element, eventOptions, holdDurationMs);
  
  // Brief delay between clicks
  const start = performance.now();
  while (performance.now() - start < 50) {
    // Short delay
  }
  
  // Second click
  executeSingleClick(element, eventOptions, holdDurationMs);
  
  // Double click event
  const dblclickEvent = new MouseEvent('dblclick', eventOptions);
  element.dispatchEvent(dblclickEvent);
}

/**
 * Gets mouse button code for click type
 */
function getMouseButton(clickType: VisionClickType): number {
  switch (clickType) {
    case 'left':
    case 'double':
      return 0;
    case 'middle':
      return 1;
    case 'right':
      return 2;
    default:
      return 0;
  }
}

/**
 * Gets mouse buttons bitmask for click type
 */
function getMouseButtons(clickType: VisionClickType): number {
  switch (clickType) {
    case 'left':
    case 'double':
      return 1;
    case 'middle':
      return 4;
    case 'right':
      return 2;
    default:
      return 1;
  }
}

/**
 * Extracts text content from element
 */
function getElementText(element: HTMLElement): string {
  // For inputs, use value
  if (element instanceof HTMLInputElement) {
    return element.value || element.placeholder || '';
  }
  if (element instanceof HTMLTextAreaElement) {
    return element.value || element.placeholder || '';
  }
  // For buttons, use text content
  if (element instanceof HTMLButtonElement) {
    return element.textContent?.trim() || '';
  }
  // For links, use text content
  if (element instanceof HTMLAnchorElement) {
    return element.textContent?.trim() || element.href || '';
  }
  // For images, use alt text
  if (element instanceof HTMLImageElement) {
    return element.alt || '';
  }
  // Default: use text content
  return element.textContent?.trim() || '';
}

// Register handler in message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'VISION_CLICK') {
    return handleVisionClick(message.payload, sendResponse);
  }
  
  // ... other handlers ...
  
  return false;
});
```

### 4.3 Right-Click Context Menu Handler

```typescript
// Additional handler for right-click (context menu)

/**
 * Handles right-click with context menu
 */
function executeRightClick(
  element: HTMLElement,
  eventOptions: MouseEventInit
): void {
  // Mouse events
  const mousedownEvent = new MouseEvent('mousedown', {
    ...eventOptions,
    button: 2,
    buttons: 2
  });
  const mouseupEvent = new MouseEvent('mouseup', {
    ...eventOptions,
    button: 2,
    buttons: 0
  });
  
  element.dispatchEvent(mousedownEvent);
  element.dispatchEvent(mouseupEvent);
  
  // Context menu event
  const contextMenuEvent = new MouseEvent('contextmenu', {
    ...eventOptions,
    button: 2,
    buttons: 0
  });
  element.dispatchEvent(contextMenuEvent);
}
```

### 4.4 Focus Management

```typescript
/**
 * Ensures element can receive click by managing focus
 */
function prepareElementForClick(element: HTMLElement): void {
  // Check if element is focusable
  const focusableElements = ['INPUT', 'TEXTAREA', 'BUTTON', 'A', 'SELECT'];
  
  if (focusableElements.includes(element.tagName)) {
    // Focus the element first
    element.focus();
  }
  
  // Check if element is in a shadow DOM
  const rootNode = element.getRootNode();
  if (rootNode instanceof ShadowRoot) {
    // Element is in shadow DOM, may need special handling
    console.log('[VisionClick] Element is in shadow DOM');
  }
  
  // Check if element is inside an iframe
  if (window !== window.top) {
    console.log('[VisionClick] Running inside iframe');
  }
}
```

---

## 5. CODE EXAMPLES

### 5.1 Basic Click at Coordinates

```typescript
// From VisionEngine - sending click message
chrome.tabs.sendMessage(tabId, {
  type: 'VISION_CLICK',
  payload: {
    x: 250,
    y: 400
  }
}, (response) => {
  if (response.success) {
    console.log(`Clicked ${response.clickedElement}: "${response.elementText}"`);
  } else {
    console.error(`Click failed: ${response.error}`);
  }
});
```

### 5.2 Right-Click

```typescript
chrome.tabs.sendMessage(tabId, {
  type: 'VISION_CLICK',
  payload: {
    x: 300,
    y: 200,
    clickType: 'right'
  }
});
```

### 5.3 Double-Click

```typescript
chrome.tabs.sendMessage(tabId, {
  type: 'VISION_CLICK',
  payload: {
    x: 150,
    y: 350,
    clickType: 'double'
  }
});
```

### 5.4 Click with Modifiers

```typescript
// Ctrl+Click (often opens in new tab)
chrome.tabs.sendMessage(tabId, {
  type: 'VISION_CLICK',
  payload: {
    x: 200,
    y: 300,
    modifiers: {
      ctrl: true
    }
  }
});

// Shift+Click (often selects range)
chrome.tabs.sendMessage(tabId, {
  type: 'VISION_CLICK',
  payload: {
    x: 200,
    y: 300,
    modifiers: {
      shift: true
    }
  }
});
```

### 5.5 Click with Hover Events

```typescript
// Include hover events for dropdown menus
chrome.tabs.sendMessage(tabId, {
  type: 'VISION_CLICK',
  payload: {
    x: 100,
    y: 50,
    dispatchHover: true,
    holdDurationMs: 100  // Hold briefly for menu triggers
  }
});
```

### 5.6 Integration in VisionEngine

```typescript
// In VisionEngine.clickAtCoordinates()
async clickAtCoordinates(
  x: number,
  y: number,
  options: ClickOptions = {}
): Promise<ClickResult> {
  const tabId = options.tabId ?? await this.getActiveTabId();
  
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(
      tabId,
      {
        type: 'VISION_CLICK',
        payload: {
          x,
          y,
          clickType: options.clickType || 'left',
          modifiers: options.modifiers,
          dispatchHover: options.dispatchHover ?? true
        }
      },
      (response: VisionClickResponse) => {
        if (chrome.runtime.lastError) {
          resolve({
            success: false,
            error: chrome.runtime.lastError.message
          });
        } else {
          resolve({
            success: response.success,
            clickedElement: response.clickedElement,
            error: response.error
          });
        }
      }
    );
  });
}
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** Left-click at coordinates dispatches correct events
- [ ] **AC-2:** Right-click triggers context menu event
- [ ] **AC-3:** Double-click dispatches dblclick event
- [ ] **AC-4:** Middle-click uses correct button code
- [ ] **AC-5:** Modifier keys included in mouse events
- [ ] **AC-6:** Hover events dispatched when requested
- [ ] **AC-7:** Response includes element info
- [ ] **AC-8:** Error returned when no element at coordinates
- [ ] **AC-9:** Native click() called for compatibility
- [ ] **AC-10:** Works with shadow DOM elements

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Coordinate system** - Viewport-relative, not page-relative
2. **Event order** - mouseover → mouseenter → mousedown → mouseup → click
3. **Synchronous response** - Must respond before channel closes

### Patterns to Follow

1. **Event simulation** - Match browser's native event sequence
2. **Defensive coding** - Check element exists before operating
3. **Detailed responses** - Include debugging info in response

### Edge Cases

1. **Element at edge of viewport** - May be partially visible
2. **Overlapping elements** - topmost element receives click
3. **Elements with pointer-events: none** - Click passes through
4. **Disabled elements** - Events still dispatch but may not trigger actions
5. **Shadow DOM** - May require different query method

---

## 8. VERIFICATION COMMANDS

```bash
# Verify handler registration
grep -n "VISION_CLICK" src/content/content.tsx

# Verify type definitions
grep -n "VisionClickPayload\|VisionClickResponse" src/types/messages.types.ts

# Run type check
npm run type-check

# Build extension
npm run build
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Revert content script changes
git checkout src/content/content.tsx

# Revert type definitions
git checkout src/types/messages.types.ts
```

---

## 10. REFERENCES

- ENG-001: VisionEngine Class
- ENG-008: clickAtCoordinates() Function
- API Contracts: `/future-spec/06_api-contracts.md`

---

*End of Specification INT-001*
