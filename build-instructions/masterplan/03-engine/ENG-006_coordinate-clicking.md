# ENG-006: COORDINATE-BASED CLICKING SPECIFICATION

> **Build Card:** ENG-006  
> **Category:** Engine / Core  
> **Dependencies:** ENG-005 (Text finding methods)  
> **Risk Level:** Medium  
> **Estimated Lines:** ~420

---

## 1. PURPOSE

This specification implements coordinate-based clicking for the VisionEngine. Unlike DOM-based clicking that targets elements by selector, Vision clicking uses screen coordinates:

1. **Coordinate clicking** - Click at specific (x, y) viewport position
2. **Text-based clicking** - Find text then click its center
3. **Click simulation** - Dispatch realistic mouse events
4. **Click types** - Support left, right, and double clicks
5. **Offset support** - Click with offset from center

This implements the `clickAtCoordinates()` and `clickAtText()` method stubs from ENG-001.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| ENG-001 | VisionEngine shell | Method signatures |
| ENG-005 | Text finding | findText() method |
| FND-007 | ClickTarget interface | Target format |
| Content Script Spec | Architecture docs | Event dispatch |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `src/lib/visionEngine.ts` | MODIFY | Implement click methods |
| `src/lib/clickSimulator.ts` | CREATE | Click simulation utilities |
| `src/content/visionClickHandler.ts` | CREATE | Content script click handler |

### Implementation Details

| Method | Status | Description |
|--------|--------|-------------|
| `clickAtCoordinates()` | IMPLEMENT | Full implementation |
| `clickAtText()` | IMPLEMENT | Full implementation |
| `simulateClick()` | ADD | Low-level click dispatch |

---

## 4. DETAILED SPECIFICATION

### 4.1 Click Simulator Utilities

Create `src/lib/clickSimulator.ts`:

```typescript
/**
 * @fileoverview Click simulation utilities
 * @module lib/clickSimulator
 * 
 * Provides utilities for simulating mouse clicks at specific
 * coordinates within a web page.
 */

/**
 * Click types supported
 */
export type ClickType = 'left' | 'right' | 'double' | 'middle';

/**
 * Mouse button mapping
 */
export const MOUSE_BUTTONS: Record<ClickType, number> = {
  left: 0,
  middle: 1,
  right: 2,
  double: 0, // Double click uses left button
};

/**
 * Options for click simulation
 */
export interface ClickOptions {
  /** Type of click */
  clickType?: ClickType;
  /** X offset from target center */
  offsetX?: number;
  /** Y offset from target center */
  offsetY?: number;
  /** Delay between mousedown and mouseup (ms) */
  clickDuration?: number;
  /** Whether to dispatch hover events first */
  simulateHover?: boolean;
  /** Whether to focus element before click */
  focusFirst?: boolean;
}

/**
 * Result of a click operation
 */
export interface ClickResult {
  /** Whether click was dispatched */
  success: boolean;
  /** Actual click coordinates */
  coordinates: { x: number; y: number };
  /** Element that was clicked (if any) */
  elementTag?: string;
  /** Element text content (truncated) */
  elementText?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * Creates mouse event init options
 * @param x - Client X coordinate
 * @param y - Client Y coordinate
 * @param button - Mouse button
 * @returns MouseEventInit object
 */
export function createMouseEventInit(
  x: number,
  y: number,
  button: number = 0
): MouseEventInit {
  return {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: x,
    clientY: y,
    screenX: x + window.screenX,
    screenY: y + window.screenY,
    button,
    buttons: button === 0 ? 1 : button === 2 ? 2 : 4,
    relatedTarget: null,
  };
}

/**
 * Gets the element at specific coordinates
 * @param x - Client X coordinate
 * @param y - Client Y coordinate
 * @returns Element at coordinates or null
 */
export function getElementAtPoint(x: number, y: number): Element | null {
  return document.elementFromPoint(x, y);
}

/**
 * Dispatches a sequence of mouse events for a click
 * @param element - Target element
 * @param x - Client X coordinate
 * @param y - Client Y coordinate
 * @param options - Click options
 * @returns Click result
 */
export async function dispatchClickEvents(
  element: Element,
  x: number,
  y: number,
  options: ClickOptions = {}
): Promise<ClickResult> {
  const {
    clickType = 'left',
    clickDuration = 50,
    simulateHover = true,
    focusFirst = true,
  } = options;

  const button = MOUSE_BUTTONS[clickType];
  const eventInit = createMouseEventInit(x, y, button);

  try {
    // Simulate hover sequence
    if (simulateHover) {
      element.dispatchEvent(new MouseEvent('mouseenter', eventInit));
      element.dispatchEvent(new MouseEvent('mouseover', eventInit));
      element.dispatchEvent(new MouseEvent('mousemove', eventInit));
    }

    // Focus if focusable
    if (focusFirst && element instanceof HTMLElement && typeof element.focus === 'function') {
      try {
        element.focus();
      } catch {
        // Ignore focus errors
      }
    }

    // Dispatch click events
    element.dispatchEvent(new MouseEvent('mousedown', eventInit));

    // Small delay to simulate real click
    await sleep(clickDuration);

    element.dispatchEvent(new MouseEvent('mouseup', eventInit));
    element.dispatchEvent(new MouseEvent('click', eventInit));

    // Handle double click
    if (clickType === 'double') {
      await sleep(50);
      element.dispatchEvent(new MouseEvent('mousedown', eventInit));
      await sleep(clickDuration);
      element.dispatchEvent(new MouseEvent('mouseup', eventInit));
      element.dispatchEvent(new MouseEvent('click', eventInit));
      element.dispatchEvent(new MouseEvent('dblclick', eventInit));
    }

    // Handle right click (context menu)
    if (clickType === 'right') {
      element.dispatchEvent(new MouseEvent('contextmenu', eventInit));
    }

    return {
      success: true,
      coordinates: { x, y },
      elementTag: element.tagName.toLowerCase(),
      elementText: getElementText(element),
    };

  } catch (error) {
    return {
      success: false,
      coordinates: { x, y },
      error: error instanceof Error ? error.message : 'Click dispatch failed',
    };
  }
}

/**
 * Gets truncated text content from an element
 * @param element - Element to get text from
 * @param maxLength - Maximum text length
 * @returns Truncated text
 */
function getElementText(element: Element, maxLength: number = 50): string {
  const text = element.textContent?.trim() || '';
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + '...';
}

/**
 * Sleeps for specified milliseconds
 * @param ms - Milliseconds to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Performs a click at specific coordinates
 * Main entry point for click simulation
 * @param x - Client X coordinate
 * @param y - Client Y coordinate
 * @param options - Click options
 * @returns Click result
 */
export async function clickAtPoint(
  x: number,
  y: number,
  options: ClickOptions = {}
): Promise<ClickResult> {
  // Apply offsets
  const finalX = x + (options.offsetX || 0);
  const finalY = y + (options.offsetY || 0);

  // Find element at coordinates
  const element = getElementAtPoint(finalX, finalY);

  if (!element) {
    return {
      success: false,
      coordinates: { x: finalX, y: finalY },
      error: 'No element found at coordinates',
    };
  }

  // Dispatch click events
  return dispatchClickEvents(element, finalX, finalY, options);
}

/**
 * Scrolls element into view if needed
 * @param x - Target X coordinate
 * @param y - Target Y coordinate
 * @returns Adjusted coordinates after scroll
 */
export async function ensureInView(
  x: number,
  y: number
): Promise<{ x: number; y: number; scrolled: boolean }> {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Check if in viewport
  if (x >= 0 && x < viewportWidth && y >= 0 && y < viewportHeight) {
    return { x, y, scrolled: false };
  }

  // Need to scroll
  const scrollX = x < 0 ? x - 100 : x >= viewportWidth ? x - viewportWidth + 100 : 0;
  const scrollY = y < 0 ? y - 100 : y >= viewportHeight ? y - viewportHeight + 100 : 0;

  window.scrollBy({
    left: scrollX,
    top: scrollY,
    behavior: 'smooth',
  });

  // Wait for scroll
  await sleep(300);

  // Recalculate position
  return {
    x: x - scrollX,
    y: y - scrollY,
    scrolled: true,
  };
}

/**
 * Validates coordinates are within reasonable bounds
 * @param x - X coordinate
 * @param y - Y coordinate
 * @returns True if valid
 */
export function validateCoordinates(x: number, y: number): boolean {
  // Check for NaN or Infinity
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return false;
  }

  // Check for negative (viewport coordinates should be positive)
  if (x < 0 || y < 0) {
    return false;
  }

  // Check for unreasonably large values
  const maxDimension = 10000;
  if (x > maxDimension || y > maxDimension) {
    return false;
  }

  return true;
}
```

### 4.2 Content Script Click Handler

Create `src/content/visionClickHandler.ts`:

```typescript
/**
 * @fileoverview Vision click handler for content scripts
 * @module content/visionClickHandler
 * 
 * Handles click commands from the background script
 * executed in the context of web pages.
 */

import {
  clickAtPoint,
  ensureInView,
  validateCoordinates,
  type ClickOptions,
  type ClickResult,
} from '@/lib/clickSimulator';

/**
 * Click command from background script
 */
export interface ClickCommand {
  type: 'vision-click';
  x: number;
  y: number;
  options?: ClickOptions;
}

/**
 * Handles a click command
 * @param command - Click command
 * @returns Click result
 */
export async function handleClickCommand(
  command: ClickCommand
): Promise<ClickResult> {
  const { x, y, options = {} } = command;

  // Validate coordinates
  if (!validateCoordinates(x, y)) {
    return {
      success: false,
      coordinates: { x, y },
      error: `Invalid coordinates: (${x}, ${y})`,
    };
  }

  // Ensure target is in view
  const adjusted = await ensureInView(x, y);

  // Perform click
  const result = await clickAtPoint(adjusted.x, adjusted.y, options);

  // Add scroll info to result
  if (adjusted.scrolled) {
    console.log('[VisionClick] Scrolled to bring target into view');
  }

  return result;
}

/**
 * Registers message listener for click commands
 */
export function registerClickHandler(): void {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === 'vision-click') {
      handleClickCommand(message)
        .then(sendResponse)
        .catch((error) => {
          sendResponse({
            success: false,
            coordinates: { x: message.x, y: message.y },
            error: error.message,
          });
        });
      
      // Return true to indicate async response
      return true;
    }
  });
}

// Auto-register when script loads
registerClickHandler();
```

### 4.3 VisionEngine Click Implementation

Update `src/lib/visionEngine.ts` - replace the click method stubs:

```typescript
// Add imports
import type { ClickResult } from './clickSimulator';

// Replace clickAtCoordinates() method
/**
 * Clicks at specific viewport coordinates
 * 
 * @param x - X coordinate (viewport)
 * @param y - Y coordinate (viewport)
 * @param options - Click options
 * @throws Error if click fails
 * 
 * @example
 * ```typescript
 * await engine.clickAtCoordinates(150, 300);
 * 
 * // Right click
 * await engine.clickAtCoordinates(150, 300, { clickType: 'right' });
 * 
 * // Click with offset
 * await engine.clickAtCoordinates(150, 300, { offsetX: 10, offsetY: 5 });
 * ```
 */
async clickAtCoordinates(
  x: number,
  y: number,
  options: {
    clickType?: 'left' | 'right' | 'double';
    offsetX?: number;
    offsetY?: number;
    tabId?: number;
  } = {}
): Promise<void> {
  const { clickType = 'left', offsetX = 0, offsetY = 0, tabId } = options;

  // Validate coordinates
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0) {
    throw new Error(`Invalid coordinates: (${x}, ${y})`);
  }

  const targetTabId = tabId || (await this.getActiveTabId());

  try {
    // Send click command to content script
    const results = await chrome.scripting.executeScript({
      target: { tabId: targetTabId },
      func: async (clickX: number, clickY: number, clickOptions: any) => {
        // This runs in the content script context
        const finalX = clickX + (clickOptions.offsetX || 0);
        const finalY = clickY + (clickOptions.offsetY || 0);

        const element = document.elementFromPoint(finalX, finalY);
        if (!element) {
          return { success: false, error: 'No element at coordinates' };
        }

        const eventInit: MouseEventInit = {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: finalX,
          clientY: finalY,
          button: clickOptions.clickType === 'right' ? 2 : 0,
        };

        // Dispatch events
        element.dispatchEvent(new MouseEvent('mousedown', eventInit));
        await new Promise((r) => setTimeout(r, 50));
        element.dispatchEvent(new MouseEvent('mouseup', eventInit));
        element.dispatchEvent(new MouseEvent('click', eventInit));

        if (clickOptions.clickType === 'double') {
          await new Promise((r) => setTimeout(r, 50));
          element.dispatchEvent(new MouseEvent('mousedown', eventInit));
          element.dispatchEvent(new MouseEvent('mouseup', eventInit));
          element.dispatchEvent(new MouseEvent('click', eventInit));
          element.dispatchEvent(new MouseEvent('dblclick', eventInit));
        }

        if (clickOptions.clickType === 'right') {
          element.dispatchEvent(new MouseEvent('contextmenu', eventInit));
        }

        return {
          success: true,
          elementTag: element.tagName.toLowerCase(),
          elementText: (element.textContent || '').slice(0, 50),
        };
      },
      args: [x, y, { clickType, offsetX, offsetY }],
    });

    const result = results[0]?.result;

    if (!result?.success) {
      throw new Error(result?.error || 'Click failed');
    }

    console.log('[VisionEngine] Clicked at coordinates:', {
      x: x + offsetX,
      y: y + offsetY,
      element: result.elementTag,
      text: result.elementText,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Click failed';
    throw new Error(`Click at (${x}, ${y}) failed: ${message}`);
  }
}

// Replace clickAtText() method
/**
 * Finds text and clicks on it
 * Combines findText() and clickAtCoordinates()
 * 
 * @param searchTerms - Terms to search for
 * @param options - Search and click options
 * @returns ClickTarget that was clicked, or null if not found
 * 
 * @example
 * ```typescript
 * const clicked = await engine.clickAtText(['Allow', 'Accept']);
 * if (clicked) {
 *   console.log(`Clicked on "${clicked.matchedText}"`);
 * }
 * ```
 */
async clickAtText(
  searchTerms: string[],
  options: Omit<ClickAtTextOptions, 'searchTerms'> = {}
): Promise<ClickTarget | null> {
  this.ensureReady();

  // Find the text first
  const target = await this.findText(searchTerms, {
    confidenceThreshold: options.confidenceThreshold,
    caseSensitive: options.caseSensitive,
    exactMatch: options.exactMatch,
    region: options.region,
    skipCache: options.skipCache,
  });

  if (!target) {
    console.log('[VisionEngine] Text not found, cannot click:', searchTerms);
    return null;
  }

  try {
    // Click at the target coordinates
    await this.clickAtCoordinates(target.x, target.y, {
      clickType: options.clickType,
      offsetX: options.offsetX,
      offsetY: options.offsetY,
    });

    console.log('[VisionEngine] Clicked on text:', {
      text: target.matchedText,
      position: `(${target.x}, ${target.y})`,
    });

    return target;

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Click failed';
    console.error('[VisionEngine] clickAtText failed:', message);
    throw new Error(`Click at text "${searchTerms.join('", "')}" failed: ${message}`);
  }
}

// Add convenience method for clicking all matches
/**
 * Finds all matching text and clicks each one
 * Useful for clicking multiple similar buttons
 * 
 * @param searchTerms - Terms to search for
 * @param options - Search and click options
 * @returns Array of clicked targets
 */
async clickAllText(
  searchTerms: string[],
  options: Omit<ClickAtTextOptions, 'searchTerms'> & {
    delayBetweenClicks?: number;
  } = {}
): Promise<ClickTarget[]> {
  this.ensureReady();

  const { delayBetweenClicks = 500, ...findOptions } = options;

  // Find all matching text
  const targets = await this.findAllText(searchTerms, findOptions);

  if (targets.length === 0) {
    console.log('[VisionEngine] No text found to click:', searchTerms);
    return [];
  }

  const clicked: ClickTarget[] = [];

  for (const target of targets) {
    try {
      await this.clickAtCoordinates(target.x, target.y, {
        clickType: options.clickType,
        offsetX: options.offsetX,
        offsetY: options.offsetY,
      });

      clicked.push(target);

      // Delay between clicks
      if (delayBetweenClicks > 0 && target !== targets[targets.length - 1]) {
        await this.sleep(delayBetweenClicks);
      }

    } catch (error) {
      console.warn('[VisionEngine] Failed to click target:', target.matchedText, error);
      // Continue with other targets
    }
  }

  console.log('[VisionEngine] Clicked all text:', {
    found: targets.length,
    clicked: clicked.length,
  });

  return clicked;
}
```

---

## 5. CODE EXAMPLES

### 5.1 Basic Coordinate Clicking

```typescript
import { VisionEngine } from '@/lib/visionEngine';

const engine = new VisionEngine();

// Click at specific coordinates
await engine.clickAtCoordinates(200, 350);

// Right click
await engine.clickAtCoordinates(200, 350, { clickType: 'right' });

// Double click
await engine.clickAtCoordinates(200, 350, { clickType: 'double' });

// Click with offset
await engine.clickAtCoordinates(200, 350, { offsetX: 10, offsetY: -5 });
```

### 5.2 Text-Based Clicking

```typescript
// Find and click text
const clicked = await engine.clickAtText(['Allow', 'Accept', 'Continue']);

if (clicked) {
  console.log(`Clicked: ${clicked.matchedText}`);
  console.log(`At: (${clicked.x}, ${clicked.y})`);
  console.log(`Confidence: ${clicked.confidence}%`);
}
```

### 5.3 Click All Matches

```typescript
// Click all "Dismiss" buttons on the page
const dismissed = await engine.clickAllText(['Dismiss', 'Close', 'X'], {
  delayBetweenClicks: 300,
});

console.log(`Clicked ${dismissed.length} buttons`);
```

### 5.4 Advanced Click Options

```typescript
// Case-sensitive exact match with offset
const clicked = await engine.clickAtText(['Submit'], {
  caseSensitive: true,
  exactMatch: true,
  offsetX: 0,
  offsetY: 5,  // Click slightly below center
  clickType: 'left',
});
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** `clickAtCoordinates()` dispatches click events
- [ ] **AC-2:** Left, right, and double clicks work
- [ ] **AC-3:** Offset parameters adjust click position
- [ ] **AC-4:** `clickAtText()` finds and clicks text
- [ ] **AC-5:** `clickAllText()` clicks multiple targets
- [ ] **AC-6:** Invalid coordinates throw clear errors
- [ ] **AC-7:** Click events bubble correctly
- [ ] **AC-8:** Element info returned after click
- [ ] **AC-9:** Works across different tab contexts
- [ ] **AC-10:** TypeScript compiles without errors

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Content script required** - Clicks must run in page context
2. **Viewport coordinates** - All coordinates are viewport-relative
3. **Element detection** - Uses elementFromPoint()

### Patterns to Follow

1. **Event sequence** - mousedown → mouseup → click
2. **Async dispatch** - Small delays between events
3. **Error recovery** - Continue clicking other targets on failure

### Edge Cases

1. **No element at point** - Return/throw clear error
2. **Element not visible** - May need scroll
3. **Overlapping elements** - Clicks topmost element

---

## 8. VERIFICATION COMMANDS

```bash
# Verify files exist
ls -la src/lib/clickSimulator.ts
ls -la src/content/visionClickHandler.ts

# Run type check
npm run type-check

# Build and test clicking manually
npm run build
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Revert to stub implementations
# Replace click methods with original stubs

# Remove new files
rm src/lib/clickSimulator.ts
rm src/content/visionClickHandler.ts
```

---

## 10. REFERENCES

- [MouseEvent MDN](https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent)
- [elementFromPoint MDN](https://developer.mozilla.org/en-US/docs/Web/API/Document/elementFromPoint)
- ENG-001: VisionEngine Class Shell
- ENG-005: Text Finding Methods

---

*End of Specification ENG-006*
