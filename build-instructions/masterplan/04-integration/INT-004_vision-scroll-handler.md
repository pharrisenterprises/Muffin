# INT-004: Vision Scroll Handler

> **Build Card:** INT-004  
> **Category:** Integration Points  
> **Dependencies:** ENG-001, ENG-011  
> **Risk Level:** Low  
> **Estimated Lines:** 220-280

---

## 1. PURPOSE

Implement the `VISION_SCROLL` message handler in the content script that receives scroll instructions from VisionEngine and executes page or container scrolling. This handler supports directional scrolling by pixel amount, viewport percentage, or page percentage, enabling automation workflows where target elements are below the fold or require scrolling to access.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| Content Script | `src/content/content.tsx` | Message handling structure |
| VisionEngine | `src/lib/visionEngine.ts` | scroll() call format |
| API Contracts | `/future-spec/06_api-contracts.md` | Message payload specification |
| ENG-011 | `build-instructions/masterplan/03-engine/ENG-011_scroll-function.md` | scroll implementation |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/content/content.tsx` | MODIFY | +90 |
| `src/types/messages.types.ts` | MODIFY | +25 |

### Artifacts

- `VISION_SCROLL` message handler added
- `VISION_GET_VIEWPORT` message handler added
- `VISION_GET_SCROLL_POSITION` message handler added
- `VisionScrollPayload` interface defined
- `VisionScrollResponse` interface defined

---

## 4. DETAILED SPECIFICATION

### 4.1 Type Definitions

```typescript
// In src/types/messages.types.ts

/**
 * Scroll direction
 */
export type ScrollDirection = 'up' | 'down' | 'left' | 'right';

/**
 * Scroll amount unit
 */
export type ScrollUnit = 'pixels' | 'viewport' | 'page';

/**
 * Payload for VISION_SCROLL message
 */
export interface VisionScrollPayload {
  /** Direction to scroll */
  direction: ScrollDirection;
  
  /** Amount to scroll */
  amount: number;
  
  /** Unit for the amount */
  unit?: ScrollUnit;
  
  /** Whether to use smooth scrolling animation */
  smooth?: boolean;
  
  /** CSS selector for scroll container (optional, defaults to window) */
  targetSelector?: string;
}

/**
 * Response from VISION_SCROLL handler
 */
export interface VisionScrollResponse {
  success: boolean;
  
  /** Actual pixels scrolled */
  scrolledBy: {
    x: number;
    y: number;
  };
  
  /** Final scroll position */
  finalPosition: {
    x: number;
    y: number;
  };
  
  /** Whether scroll reached boundary */
  reachedBoundary?: boolean;
  
  /** Error message if failed */
  error?: string;
}

/**
 * Response from VISION_GET_VIEWPORT message
 */
export interface VisionViewportResponse {
  width: number;
  height: number;
  scrollWidth: number;
  scrollHeight: number;
}

/**
 * Response from VISION_GET_SCROLL_POSITION message
 */
export interface VisionScrollPositionResponse {
  x: number;
  y: number;
  maxX: number;
  maxY: number;
}
```

### 4.2 Vision Scroll Handler Implementation

```typescript
// In src/content/content.tsx - Add to message handlers

import { 
  VisionScrollPayload, 
  VisionScrollResponse,
  VisionViewportResponse,
  VisionScrollPositionResponse 
} from '@/types/messages.types';

/**
 * Handles VISION_SCROLL messages - scrolls page or container
 */
async function handleVisionScroll(
  payload: VisionScrollPayload,
  sendResponse: (response: VisionScrollResponse) => void
): Promise<boolean> {
  const {
    direction,
    amount,
    unit = 'pixels',
    smooth = true,
    targetSelector
  } = payload;

  const response: VisionScrollResponse = {
    success: false,
    scrolledBy: { x: 0, y: 0 },
    finalPosition: { x: 0, y: 0 }
  };

  try {
    // Determine scroll target
    let scrollTarget: Element | Window = window;
    
    if (targetSelector) {
      const element = document.querySelector(targetSelector);
      if (!element) {
        response.error = `Scroll target "${targetSelector}" not found`;
        sendResponse(response);
        return true;
      }
      scrollTarget = element;
    }

    // Get current position
    const beforeX = getScrollX(scrollTarget);
    const beforeY = getScrollY(scrollTarget);

    // Calculate pixel amount based on unit
    let pixelAmount = amount;
    
    if (unit === 'viewport') {
      pixelAmount = direction === 'up' || direction === 'down'
        ? amount * window.innerHeight
        : amount * window.innerWidth;
    } else if (unit === 'page') {
      pixelAmount = direction === 'up' || direction === 'down'
        ? amount * document.documentElement.scrollHeight
        : amount * document.documentElement.scrollWidth;
    }

    // Calculate scroll delta
    let deltaX = 0;
    let deltaY = 0;

    switch (direction) {
      case 'up':
        deltaY = -pixelAmount;
        break;
      case 'down':
        deltaY = pixelAmount;
        break;
      case 'left':
        deltaX = -pixelAmount;
        break;
      case 'right':
        deltaX = pixelAmount;
        break;
    }

    // Perform scroll
    const scrollOptions: ScrollToOptions = {
      left: deltaX,
      top: deltaY,
      behavior: smooth ? 'smooth' : 'instant'
    };

    if (scrollTarget === window) {
      window.scrollBy(scrollOptions);
    } else {
      (scrollTarget as Element).scrollBy(scrollOptions);
    }

    // Wait for smooth scroll to complete
    if (smooth) {
      await waitForScrollEnd(scrollTarget, 500);
    }

    // Get final position
    const afterX = getScrollX(scrollTarget);
    const afterY = getScrollY(scrollTarget);

    response.scrolledBy = {
      x: afterX - beforeX,
      y: afterY - beforeY
    };
    response.finalPosition = {
      x: afterX,
      y: afterY
    };

    // Check if we hit a boundary
    const maxScrollX = getMaxScrollX(scrollTarget);
    const maxScrollY = getMaxScrollY(scrollTarget);
    
    response.reachedBoundary = (
      (direction === 'down' && afterY >= maxScrollY) ||
      (direction === 'up' && afterY <= 0) ||
      (direction === 'right' && afterX >= maxScrollX) ||
      (direction === 'left' && afterX <= 0)
    );

    response.success = true;

  } catch (error) {
    response.error = error instanceof Error ? error.message : 'Scroll failed';
  }

  sendResponse(response);
  return true;
}

/**
 * Handles VISION_GET_VIEWPORT messages - returns viewport dimensions
 */
function handleVisionGetViewport(
  sendResponse: (response: VisionViewportResponse) => void
): boolean {
  sendResponse({
    width: window.innerWidth,
    height: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight
  });
  return true;
}

/**
 * Handles VISION_GET_SCROLL_POSITION messages - returns current scroll position
 */
function handleVisionGetScrollPosition(
  sendResponse: (response: VisionScrollPositionResponse) => void
): boolean {
  sendResponse({
    x: window.scrollX,
    y: window.scrollY,
    maxX: document.documentElement.scrollWidth - window.innerWidth,
    maxY: document.documentElement.scrollHeight - window.innerHeight
  });
  return true;
}

/**
 * Gets horizontal scroll position
 */
function getScrollX(target: Element | Window): number {
  if (target === window) {
    return window.scrollX;
  }
  return (target as Element).scrollLeft;
}

/**
 * Gets vertical scroll position
 */
function getScrollY(target: Element | Window): number {
  if (target === window) {
    return window.scrollY;
  }
  return (target as Element).scrollTop;
}

/**
 * Gets maximum horizontal scroll
 */
function getMaxScrollX(target: Element | Window): number {
  if (target === window) {
    return document.documentElement.scrollWidth - window.innerWidth;
  }
  const element = target as Element;
  return element.scrollWidth - element.clientWidth;
}

/**
 * Gets maximum vertical scroll
 */
function getMaxScrollY(target: Element | Window): number {
  if (target === window) {
    return document.documentElement.scrollHeight - window.innerHeight;
  }
  const element = target as Element;
  return element.scrollHeight - element.clientHeight;
}

/**
 * Waits for scroll animation to complete
 */
function waitForScrollEnd(
  target: Element | Window,
  maxWaitMs: number
): Promise<void> {
  return new Promise((resolve) => {
    let lastPosition = target === window ? window.scrollY : (target as Element).scrollTop;
    let samePositionCount = 0;
    const startTime = Date.now();

    const checkInterval = setInterval(() => {
      const currentPosition = target === window 
        ? window.scrollY 
        : (target as Element).scrollTop;

      if (currentPosition === lastPosition) {
        samePositionCount++;
        // If position unchanged for 3 checks (60ms), scroll is done
        if (samePositionCount >= 3) {
          clearInterval(checkInterval);
          resolve();
        }
      } else {
        samePositionCount = 0;
        lastPosition = currentPosition;
      }

      // Timeout fallback
      if (Date.now() - startTime > maxWaitMs) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 20);
  });
}

// Register handlers in message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'VISION_SCROLL':
      handleVisionScroll(message.payload, sendResponse);
      return true; // Async response

    case 'VISION_GET_VIEWPORT':
      return handleVisionGetViewport(sendResponse);

    case 'VISION_GET_SCROLL_POSITION':
      return handleVisionGetScrollPosition(sendResponse);
  }

  return false;
});
```

---

## 5. CODE EXAMPLES

### 5.1 Scroll Down by Pixels

```typescript
// Scroll down 500 pixels
chrome.tabs.sendMessage(tabId, {
  type: 'VISION_SCROLL',
  payload: {
    direction: 'down',
    amount: 500,
    unit: 'pixels',
    smooth: true
  }
}, (response) => {
  console.log(`Scrolled by: ${response.scrolledBy.y}px`);
  console.log(`At position: ${response.finalPosition.y}`);
});
```

### 5.2 Scroll Down by Viewport Percentage

```typescript
// Scroll down half a viewport
chrome.tabs.sendMessage(tabId, {
  type: 'VISION_SCROLL',
  payload: {
    direction: 'down',
    amount: 0.5,
    unit: 'viewport'
  }
});
```

### 5.3 Scroll Up

```typescript
// Scroll up 300 pixels
chrome.tabs.sendMessage(tabId, {
  type: 'VISION_SCROLL',
  payload: {
    direction: 'up',
    amount: 300,
    unit: 'pixels'
  }
});
```

### 5.4 Scroll Within Container

```typescript
// Scroll within a specific container
chrome.tabs.sendMessage(tabId, {
  type: 'VISION_SCROLL',
  payload: {
    direction: 'down',
    amount: 200,
    unit: 'pixels',
    targetSelector: '.chat-messages-container',
    smooth: true
  }
});
```

### 5.5 Horizontal Scroll

```typescript
// Scroll right in a carousel
chrome.tabs.sendMessage(tabId, {
  type: 'VISION_SCROLL',
  payload: {
    direction: 'right',
    amount: 300,
    unit: 'pixels'
  }
});
```

### 5.6 Get Viewport Info

```typescript
// Get viewport dimensions
chrome.tabs.sendMessage(tabId, {
  type: 'VISION_GET_VIEWPORT'
}, (response) => {
  console.log(`Viewport: ${response.width}x${response.height}`);
  console.log(`Page: ${response.scrollWidth}x${response.scrollHeight}`);
});
```

### 5.7 Get Current Scroll Position

```typescript
// Get scroll position
chrome.tabs.sendMessage(tabId, {
  type: 'VISION_GET_SCROLL_POSITION'
}, (response) => {
  console.log(`Position: (${response.x}, ${response.y})`);
  console.log(`Max scroll: (${response.maxX}, ${response.maxY})`);
});
```

### 5.8 Integration in VisionEngine

```typescript
// In VisionEngine.scroll()
async scroll(options: ScrollOptions): Promise<ScrollResult> {
  const targetTabId = options.tabId ?? await this.getActiveTabId();

  return new Promise((resolve) => {
    chrome.tabs.sendMessage(
      targetTabId,
      {
        type: 'VISION_SCROLL',
        payload: {
          direction: options.direction,
          amount: options.amount,
          unit: options.unit || 'pixels',
          smooth: options.smooth ?? true,
          targetSelector: options.targetSelector
        }
      },
      (response: VisionScrollResponse) => {
        resolve({
          success: response.success,
          scrolledBy: response.scrolledBy,
          finalPosition: response.finalPosition,
          error: response.error
        });
      }
    );
  });
}
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** Scroll down moves page content up
- [ ] **AC-2:** Scroll up moves page content down
- [ ] **AC-3:** Scroll left/right work for horizontal scrolling
- [ ] **AC-4:** Pixel unit scrolls exact pixel distance
- [ ] **AC-5:** Viewport unit scrolls proportional to viewport
- [ ] **AC-6:** Page unit scrolls proportional to page height
- [ ] **AC-7:** Smooth scrolling animates the transition
- [ ] **AC-8:** targetSelector scrolls within container
- [ ] **AC-9:** Returns actual scrolled distance
- [ ] **AC-10:** Detects when boundary is reached

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Smooth scroll timing** - Animation duration varies by browser
2. **Container detection** - Selector must match scrollable element
3. **Boundary detection** - Can't scroll past page limits

### Patterns to Follow

1. **Unit conversion** - Convert all units to pixels internally
2. **Position tracking** - Record before/after for accurate delta
3. **Scroll detection** - Poll for scroll end on smooth scroll

### Edge Cases

1. **Already at boundary** - scrolledBy will be zero
2. **Container not scrollable** - May return zero scroll
3. **Dynamic content** - Page height may change during scroll
4. **Sticky elements** - May affect visible area calculation
5. **Iframes** - Scroll affects iframe content only

---

## 8. VERIFICATION COMMANDS

```bash
# Verify handler registration
grep -n "VISION_SCROLL\|VISION_GET_VIEWPORT\|VISION_GET_SCROLL_POSITION" src/content/content.tsx

# Verify type definitions
grep -n "VisionScrollPayload\|VisionScrollResponse" src/types/messages.types.ts

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
- ENG-011: scroll() Function
- API Contracts: `/future-spec/06_api-contracts.md`

---

*End of Specification INT-004*
