# ENG-011: Scroll Function

> **Build Card:** ENG-011  
> **Category:** Core Engine  
> **Dependencies:** ENG-001, INT-004  
> **Risk Level:** Low  
> **Estimated Lines:** 380-450

---

## 1. PURPOSE

Implement the `scroll()` function within VisionEngine that enables Vision-based scrolling to bring off-screen elements into view. This function supports scrolling by pixel amount, percentage of viewport, or to specific text found via OCR. Essential for automating workflows where target elements are below the fold or require scrolling to access.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| VisionEngine Class | `src/lib/visionEngine.ts` | Class structure and existing methods |
| Feature Specs | `/future-spec/03_feature-specs.md` | scroll behavior requirements |
| API Contracts | `/future-spec/06_api-contracts.md` | Message format for VISION_SCROLL |
| INT-004 | `build-instructions/masterplan/04-integration/INT-004_vision-scroll-handler.md` | Message handler interface |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/lib/visionEngine.ts` | MODIFY | +110 |
| `src/types/vision.types.ts` | MODIFY | +30 |
| `src/content/content.tsx` | MODIFY | +55 |

### Artifacts

- `scroll()` method added to VisionEngine
- `scrollToText()` convenience method added
- `ScrollOptions` interface defined
- `ScrollResult` interface defined

---

## 4. DETAILED SPECIFICATION

### 4.1 Type Definitions

```typescript
// In src/types/vision.types.ts

/**
 * Scroll direction
 */
export type ScrollDirection = 'up' | 'down' | 'left' | 'right';

/**
 * Scroll amount unit
 */
export type ScrollUnit = 'pixels' | 'viewport' | 'page';

export interface ScrollOptions {
  /** Direction to scroll */
  direction: ScrollDirection;
  
  /** Amount to scroll */
  amount: number;
  
  /** Unit for the amount */
  unit?: ScrollUnit;
  
  /** Whether to use smooth scrolling */
  smooth?: boolean;
  
  /** Target element selector (optional, defaults to window) */
  targetSelector?: string;
  
  /** Tab ID for targeting specific tab */
  tabId?: number;
}

export interface ScrollToTextOptions {
  /** Text to scroll to (found via OCR) */
  targetText: string;
  
  /** Padding from viewport edge in pixels */
  padding?: number;
  
  /** Maximum scroll attempts before giving up */
  maxAttempts?: number;
  
  /** Confidence threshold for text matching */
  confidence?: number;
  
  /** Tab ID for targeting specific tab */
  tabId?: number;
}

export interface ScrollResult {
  success: boolean;
  scrolledBy: {
    x: number;
    y: number;
  };
  finalPosition: {
    x: number;
    y: number;
  };
  textFound?: boolean;
  attempts?: number;
  error?: string;
  timing: {
    totalMs: number;
  };
}
```

### 4.2 Scroll Method Implementation

```typescript
// In src/lib/visionEngine.ts

export class VisionEngine {
  // ... existing properties and methods ...

  /**
   * Scrolls the page in a specified direction by a specified amount
   * @param options - Scroll configuration
   * @returns Promise<ScrollResult>
   */
  async scroll(options: ScrollOptions): Promise<ScrollResult> {
    const startTime = performance.now();
    const {
      direction,
      amount,
      unit = 'pixels',
      smooth = true,
      targetSelector,
      tabId
    } = options;

    const result: ScrollResult = {
      success: false,
      scrolledBy: { x: 0, y: 0 },
      finalPosition: { x: 0, y: 0 },
      timing: { totalMs: 0 }
    };

    try {
      const targetTabId = tabId ?? await this.getActiveTabId();

      const response = await this.sendMessageToTab<{
        success: boolean;
        scrolledBy: { x: number; y: number };
        finalPosition: { x: number; y: number };
        error?: string;
      }>(targetTabId, {
        type: 'VISION_SCROLL',
        payload: {
          direction,
          amount,
          unit,
          smooth,
          targetSelector
        }
      });

      if (response.success) {
        result.success = true;
        result.scrolledBy = response.scrolledBy;
        result.finalPosition = response.finalPosition;
        console.log(`[VisionEngine] Scrolled ${direction} by ${amount} ${unit}`);
      } else {
        result.error = response.error || 'Scroll failed';
      }

    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown scroll error';
      console.error('[VisionEngine] scroll error:', result.error);
    }

    result.timing.totalMs = performance.now() - startTime;
    return result;
  }

  /**
   * Scrolls until specified text is visible on screen
   * @param options - Scroll to text configuration
   * @returns Promise<ScrollResult>
   */
  async scrollToText(options: ScrollToTextOptions): Promise<ScrollResult> {
    const startTime = performance.now();
    const {
      targetText,
      padding = 100,
      maxAttempts = 10,
      confidence = 0.6,
      tabId
    } = options;

    const result: ScrollResult = {
      success: false,
      scrolledBy: { x: 0, y: 0 },
      finalPosition: { x: 0, y: 0 },
      textFound: false,
      attempts: 0,
      timing: { totalMs: 0 }
    };

    try {
      const targetTabId = tabId ?? await this.getActiveTabId();
      let totalScrolledY = 0;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        result.attempts = attempt;

        // Check if text is visible
        const findResult = await this.findText(targetText, { 
          confidence, 
          tabId: targetTabId 
        });

        if (findResult.found && findResult.location) {
          // Text found - check if it's in viewport
          const viewportHeight = await this.getViewportHeight(targetTabId);
          const textY = findResult.location.y;

          if (textY >= padding && textY <= viewportHeight - padding) {
            // Text is visible within padding
            result.success = true;
            result.textFound = true;
            result.scrolledBy = { x: 0, y: totalScrolledY };
            console.log(`[VisionEngine] Found "${targetText}" after ${attempt} scroll(s)`);
            break;
          } else if (textY < padding) {
            // Text is above viewport, scroll up
            const scrollAmount = padding - textY + 50;
            await this.scroll({
              direction: 'up',
              amount: scrollAmount,
              unit: 'pixels',
              tabId: targetTabId
            });
            totalScrolledY -= scrollAmount;
          } else {
            // Text is below viewport, scroll down
            const scrollAmount = textY - viewportHeight + padding + 50;
            await this.scroll({
              direction: 'down',
              amount: scrollAmount,
              unit: 'pixels',
              tabId: targetTabId
            });
            totalScrolledY += scrollAmount;
          }
        } else {
          // Text not found, scroll down to reveal more content
          const scrollAmount = 300;
          const scrollResult = await this.scroll({
            direction: 'down',
            amount: scrollAmount,
            unit: 'pixels',
            tabId: targetTabId
          });
          totalScrolledY += scrollResult.scrolledBy.y;

          // Check if we've hit the bottom (no scroll occurred)
          if (scrollResult.scrolledBy.y === 0) {
            result.error = `Text "${targetText}" not found after scrolling to bottom`;
            break;
          }
        }

        // Small delay between scroll attempts
        await this.delay(200);
      }

      if (!result.success && !result.error) {
        result.error = `Text "${targetText}" not found after ${maxAttempts} attempts`;
      }

      // Get final scroll position
      const finalPos = await this.getScrollPosition(targetTabId);
      result.finalPosition = finalPos;

    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown scrollToText error';
      console.error('[VisionEngine] scrollToText error:', result.error);
    }

    result.timing.totalMs = performance.now() - startTime;
    return result;
  }

  /**
   * Gets viewport height for a tab
   */
  private async getViewportHeight(tabId: number): Promise<number> {
    const response = await this.sendMessageToTab<{ height: number }>(tabId, {
      type: 'VISION_GET_VIEWPORT'
    });
    return response.height;
  }

  /**
   * Gets current scroll position
   */
  private async getScrollPosition(tabId: number): Promise<{ x: number; y: number }> {
    const response = await this.sendMessageToTab<{ x: number; y: number }>(tabId, {
      type: 'VISION_GET_SCROLL_POSITION'
    });
    return response;
  }
}
```

### 4.3 Content Script Handlers

```typescript
// In src/content/content.tsx - Add to message handlers

case 'VISION_SCROLL': {
  const { direction, amount, unit, smooth, targetSelector } = message.payload;
  
  try {
    // Determine scroll target
    const scrollTarget = targetSelector 
      ? document.querySelector(targetSelector) 
      : window;
    
    if (targetSelector && !scrollTarget) {
      sendResponse({ success: false, error: `Selector "${targetSelector}" not found` });
      return true;
    }

    // Calculate pixel amount
    let pixelAmount = amount;
    if (unit === 'viewport') {
      pixelAmount = amount * window.innerHeight;
    } else if (unit === 'page') {
      pixelAmount = amount * document.documentElement.scrollHeight;
    }

    // Get current position
    const beforeX = window.scrollX;
    const beforeY = window.scrollY;

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
    if (scrollTarget === window) {
      window.scrollBy({
        left: deltaX,
        top: deltaY,
        behavior: smooth ? 'smooth' : 'instant'
      });
    } else {
      (scrollTarget as Element).scrollBy({
        left: deltaX,
        top: deltaY,
        behavior: smooth ? 'smooth' : 'instant'
      });
    }

    // Wait for smooth scroll to complete
    if (smooth) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Get final position
    const afterX = window.scrollX;
    const afterY = window.scrollY;

    sendResponse({
      success: true,
      scrolledBy: {
        x: afterX - beforeX,
        y: afterY - beforeY
      },
      finalPosition: {
        x: afterX,
        y: afterY
      }
    });
  } catch (error) {
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Scroll failed'
    });
  }
  return true;
}

case 'VISION_GET_VIEWPORT': {
  sendResponse({
    height: window.innerHeight,
    width: window.innerWidth
  });
  return true;
}

case 'VISION_GET_SCROLL_POSITION': {
  sendResponse({
    x: window.scrollX,
    y: window.scrollY
  });
  return true;
}
```

---

## 5. CODE EXAMPLES

### 5.1 Basic Directional Scrolling

```typescript
import { VisionEngine } from '@/lib/visionEngine';

const engine = new VisionEngine();
await engine.initialize();

// Scroll down 500 pixels
await engine.scroll({
  direction: 'down',
  amount: 500,
  unit: 'pixels'
});

// Scroll up half a viewport
await engine.scroll({
  direction: 'up',
  amount: 0.5,
  unit: 'viewport'
});

// Scroll down one full page
await engine.scroll({
  direction: 'down',
  amount: 1,
  unit: 'page'
});
```

### 5.2 Scroll to Specific Text

```typescript
// Scroll until "Submit" button is visible
const result = await engine.scrollToText({
  targetText: 'Submit',
  padding: 100,
  maxAttempts: 10
});

if (result.success) {
  console.log(`Found text after ${result.attempts} scrolls`);
  // Now safe to click it
  await engine.clickAtText('Submit');
}
```

### 5.3 Scrolling Within a Container

```typescript
// Scroll within a specific scrollable container
await engine.scroll({
  direction: 'down',
  amount: 200,
  unit: 'pixels',
  targetSelector: '.chat-messages-container',
  smooth: true
});
```

### 5.4 Horizontal Scrolling

```typescript
// Scroll right in a carousel
await engine.scroll({
  direction: 'right',
  amount: 300,
  unit: 'pixels'
});

// Scroll left
await engine.scroll({
  direction: 'left',
  amount: 300,
  unit: 'pixels'
});
```

### 5.5 Integration with Step Execution

```typescript
// In stepExecutors.ts
export async function executeVisionScroll(
  step: Step,
  context: ExecutionContext
): Promise<StepResult> {
  const { visionEngine } = context;
  
  // If step has scrollToText, use that
  if (step.visionScrollToText) {
    const result = await visionEngine.scrollToText({
      targetText: step.visionScrollToText,
      padding: step.visionScrollPadding || 100,
      maxAttempts: step.visionScrollMaxAttempts || 10,
      tabId: context.tabId
    });
    
    return {
      success: result.success,
      stepId: step.id,
      action: 'vision_scroll_to_text',
      error: result.error,
      metadata: {
        textFound: result.textFound,
        attempts: result.attempts
      }
    };
  }
  
  // Otherwise use directional scroll
  const result = await visionEngine.scroll({
    direction: step.scrollDirection || 'down',
    amount: step.scrollAmount || 300,
    unit: step.scrollUnit || 'pixels',
    smooth: step.scrollSmooth ?? true,
    tabId: context.tabId
  });
  
  return {
    success: result.success,
    stepId: step.id,
    action: 'vision_scroll',
    error: result.error,
    metadata: {
      scrolledBy: result.scrolledBy
    }
  };
}
```

### 5.6 Copilot Workflow - Scrolling to Find Buttons

```typescript
// After Copilot generates files, scroll to find "Allow" button
const scrollResult = await engine.scrollToText({
  targetText: 'Allow',
  padding: 150,
  maxAttempts: 15
});

if (scrollResult.success) {
  // Button is now visible, click it
  await engine.clickAtText('Allow');
}
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** scroll() moves page in specified direction
- [ ] **AC-2:** Pixel amounts scroll exact pixel distance
- [ ] **AC-3:** Viewport units scroll proportional to viewport height
- [ ] **AC-4:** Page units scroll proportional to page height
- [ ] **AC-5:** Smooth scrolling animates the scroll
- [ ] **AC-6:** targetSelector allows scrolling within containers
- [ ] **AC-7:** scrollToText() finds text and scrolls it into view
- [ ] **AC-8:** scrollToText() respects padding from viewport edges
- [ ] **AC-9:** scrollToText() stops at maxAttempts if text not found
- [ ] **AC-10:** Returns accurate scrolledBy and finalPosition values

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Smooth scroll timing** - 300ms wait may need adjustment per site
2. **Container scrolling** - Requires valid CSS selector
3. **OCR after scroll** - Brief delay needed for page to settle

### Patterns to Follow

1. **Unit conversion** - Convert all units to pixels internally
2. **Idempotent checks** - Don't scroll if already at target
3. **Bounded attempts** - Prevent infinite scroll loops

### Edge Cases

1. **Already at bottom** - scrolledBy.y === 0 indicates no more content
2. **Dynamic content** - New content may load during scroll
3. **Sticky headers** - May obscure scrolled-to content
4. **Infinite scroll pages** - May never find text if not loaded
5. **Horizontal overflow** - Some containers only scroll horizontally

---

## 8. VERIFICATION COMMANDS

```bash
# Verify scroll methods exist
grep -n "scroll\|scrollToText" src/lib/visionEngine.ts

# Verify content script handlers
grep -n "VISION_SCROLL\|VISION_GET_VIEWPORT" src/content/content.tsx

# Verify type definitions
grep -n "ScrollOptions\|ScrollResult" src/types/vision.types.ts

# Run type check
npm run type-check

# Build extension
npm run build
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Revert VisionEngine changes
git checkout src/lib/visionEngine.ts

# Revert content script changes
git checkout src/content/content.tsx

# Revert type definitions
git checkout src/types/vision.types.ts
```

---

## 10. REFERENCES

- ENG-001: VisionEngine Class
- ENG-006: findText() Function (used by scrollToText)
- INT-004: VISION_SCROLL Message Handler
- Feature Spec: `/future-spec/03_feature-specs.md` Section 3.4

---

*End of Specification ENG-011*
