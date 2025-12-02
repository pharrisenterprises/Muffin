# TST-005: Coordinate Click Tests

> **Build Card:** TST-005  
> **Category:** Testing & Validation  
> **Dependencies:** ENG-006, ENG-008, TST-003, TST-004  
> **Risk Level:** Medium  
> **Estimated Lines:** 280-320

---

## 1. PURPOSE

Create comprehensive unit tests for coordinate-based clicking functionality in the VisionEngine. These tests verify that the `clickAtCoordinates()` function correctly calculates click positions from OCR bounding boxes, handles various coordinate systems (viewport vs document), simulates mouse events accurately, and integrates properly with the Vision-based automation flow. Critical for ensuring Vision-detected text can be reliably clicked.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| VisionEngine Class | `src/lib/visionEngine.ts` | clickAtCoordinates() method |
| ENG-006 Spec | `build-instructions/masterplan/03-engine/ENG-006_coordinate-clicking.md` | Click requirements |
| ENG-008 Spec | `build-instructions/masterplan/03-engine/ENG-008_playback-engine-integration.md` | Integration patterns |
| TST-004 | FindText tests | OCR fixtures and mocks |
| ClickTarget Interface | `src/types/vision.types.ts` | Click target structure |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/lib/__tests__/visionEngine.clickCoordinates.test.ts` | CREATE | +240 |
| `src/lib/__tests__/fixtures/click-scenarios.fixture.ts` | CREATE | +60 |
| `src/lib/__tests__/mocks/dom.mock.ts` | MODIFY | +30 |

### Artifacts

- Coordinate click test suite
- Click scenario fixtures
- DOM event simulation helpers

---

## 4. DETAILED SPECIFICATION

### 4.1 Test File Structure

```typescript
// src/lib/__tests__/visionEngine.clickCoordinates.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VisionEngine } from '../visionEngine';
import { createMockTesseract } from './mocks/tesseract.mock';
import { createMockChrome } from './mocks/chrome.mock';
import { createMockDocument, captureMouseEvents } from './mocks/dom.mock';
import {
  centerButtonTarget,
  offsetButtonTarget,
  scrolledViewportTarget,
  nestedIframeTarget,
  multiWordButtonTarget,
} from './fixtures/click-scenarios.fixture';

// Mock dependencies
vi.stubGlobal('chrome', createMockChrome());
vi.mock('tesseract.js', () => createMockTesseract());

describe('VisionEngine Coordinate Click', () => {
  let engine: VisionEngine;
  let mockDocument: ReturnType<typeof createMockDocument>;
  let eventCapture: ReturnType<typeof captureMouseEvents>;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockDocument = createMockDocument();
    eventCapture = captureMouseEvents(mockDocument);
    vi.stubGlobal('document', mockDocument);
    
    engine = new VisionEngine();
    await engine.initialize();
  });

  afterEach(async () => {
    await engine.terminate();
    vi.unstubAllGlobals();
  });

  describe('Basic Coordinate Clicking', () => {
    it('should click at exact coordinates from OCR bbox', async () => {
      const target = centerButtonTarget; // { x: 150, y: 100 }
      
      const result = await engine.clickAtCoordinates(target);

      expect(result.success).toBe(true);
      expect(eventCapture.getLastClick()).toEqual({
        x: 150,
        y: 100,
        button: 0, // Left click
      });
    });

    it('should calculate center of bounding box', async () => {
      // Bbox: x0: 100, y0: 80, x1: 200, y1: 120
      // Expected center: x: 150, y: 100
      const target = { x: 150, y: 100, confidence: 0.92 };
      
      await engine.clickAtCoordinates(target);

      const click = eventCapture.getLastClick();
      expect(click.x).toBe(150);
      expect(click.y).toBe(100);
    });

    it('should handle zero coordinates', async () => {
      const target = { x: 0, y: 0, confidence: 0.85 };
      
      const result = await engine.clickAtCoordinates(target);

      expect(result.success).toBe(true);
      expect(eventCapture.getLastClick()).toMatchObject({ x: 0, y: 0 });
    });

    it('should reject negative coordinates', async () => {
      const target = { x: -10, y: 50, confidence: 0.90 };
      
      const result = await engine.clickAtCoordinates(target);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/invalid coordinates/i);
      expect(eventCapture.getClickCount()).toBe(0);
    });
  });

  describe('Mouse Event Sequence', () => {
    it('should dispatch mousedown, mouseup, click events in order', async () => {
      const target = { x: 100, y: 100, confidence: 0.88 };
      
      await engine.clickAtCoordinates(target);

      const events = eventCapture.getEventSequence();
      expect(events).toEqual([
        { type: 'mousedown', x: 100, y: 100 },
        { type: 'mouseup', x: 100, y: 100 },
        { type: 'click', x: 100, y: 100 },
      ]);
    });

    it('should set bubbles: true for all mouse events', async () => {
      const target = { x: 150, y: 150, confidence: 0.91 };
      
      await engine.clickAtCoordinates(target);

      const events = eventCapture.getAllEvents();
      events.forEach(event => {
        expect(event.bubbles).toBe(true);
      });
    });

    it('should set cancelable: true for all mouse events', async () => {
      const target = { x: 200, y: 200, confidence: 0.87 };
      
      await engine.clickAtCoordinates(target);

      const events = eventCapture.getAllEvents();
      events.forEach(event => {
        expect(event.cancelable).toBe(true);
      });
    });

    it('should use left button (button: 0)', async () => {
      const target = { x: 120, y: 80, confidence: 0.93 };
      
      await engine.clickAtCoordinates(target);

      const events = eventCapture.getAllEvents();
      events.forEach(event => {
        expect(event.button).toBe(0);
      });
    });
  });

  describe('Viewport vs Document Coordinates', () => {
    it('should handle viewport coordinates correctly', async () => {
      mockDocument.setScrollOffset({ x: 0, y: 0 });
      const target = { x: 100, y: 100, confidence: 0.90 };
      
      await engine.clickAtCoordinates(target);

      expect(eventCapture.getLastClick()).toMatchObject({ x: 100, y: 100 });
    });

    it('should adjust for vertical scroll offset', async () => {
      mockDocument.setScrollOffset({ x: 0, y: 300 });
      const target = scrolledViewportTarget; // x: 150, y: 400 (document coords)
      
      await engine.clickAtCoordinates(target);

      // Click should be at viewport position (document - scroll)
      const click = eventCapture.getLastClick();
      expect(click.x).toBe(150);
      expect(click.y).toBe(100); // 400 - 300 scroll offset
    });

    it('should adjust for horizontal scroll offset', async () => {
      mockDocument.setScrollOffset({ x: 200, y: 0 });
      const target = { x: 350, y: 100, confidence: 0.89 };
      
      await engine.clickAtCoordinates(target);

      const click = eventCapture.getLastClick();
      expect(click.x).toBe(150); // 350 - 200 scroll offset
      expect(click.y).toBe(100);
    });

    it('should handle both horizontal and vertical scroll', async () => {
      mockDocument.setScrollOffset({ x: 100, y: 200 });
      const target = { x: 300, y: 500, confidence: 0.91 };
      
      await engine.clickAtCoordinates(target);

      const click = eventCapture.getLastClick();
      expect(click.x).toBe(200); // 300 - 100
      expect(click.y).toBe(300); // 500 - 200
    });
  });

  describe('Element Targeting', () => {
    it('should dispatch events to element at coordinates', async () => {
      const buttonElement = mockDocument.createElement('button');
      mockDocument.setElementAtPoint(150, 100, buttonElement);
      
      const target = { x: 150, y: 100, confidence: 0.94 };
      
      await engine.clickAtCoordinates(target);

      const targetElement = eventCapture.getLastEventTarget();
      expect(targetElement).toBe(buttonElement);
    });

    it('should handle clicks on nested elements', async () => {
      const span = mockDocument.createElement('span');
      const button = mockDocument.createElement('button');
      button.appendChild(span);
      mockDocument.setElementAtPoint(100, 100, span);
      
      const target = { x: 100, y: 100, confidence: 0.88 };
      
      await engine.clickAtCoordinates(target);

      // Events should bubble from span to button
      const events = eventCapture.getAllEvents();
      expect(events[0].target).toBe(span);
      expect(events[0].bubbles).toBe(true);
    });

    it('should use document.body as fallback if no element found', async () => {
      mockDocument.setElementAtPoint(500, 500, null); // Out of bounds
      
      const target = { x: 500, y: 500, confidence: 0.80 };
      
      await engine.clickAtCoordinates(target);

      const targetElement = eventCapture.getLastEventTarget();
      expect(targetElement).toBe(mockDocument.body);
    });
  });

  describe('Error Handling', () => {
    it('should return error if coordinates are out of viewport bounds', async () => {
      mockDocument.setViewportSize({ width: 800, height: 600 });
      const target = { x: 1000, y: 700, confidence: 0.85 };
      
      const result = await engine.clickAtCoordinates(target);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/out of bounds/i);
    });

    it('should return error if element dispatch fails', async () => {
      const errorElement = mockDocument.createElement('button');
      vi.spyOn(errorElement, 'dispatchEvent').mockImplementation(() => {
        throw new Error('Dispatch failed');
      });
      mockDocument.setElementAtPoint(100, 100, errorElement);
      
      const target = { x: 100, y: 100, confidence: 0.90 };
      
      const result = await engine.clickAtCoordinates(target);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/dispatch failed/i);
    });

    it('should handle missing confidence gracefully', async () => {
      const target = { x: 150, y: 150 }; // No confidence field
      
      const result = await engine.clickAtCoordinates(target as any);

      expect(result.success).toBe(true);
      expect(eventCapture.getLastClick()).toMatchObject({ x: 150, y: 150 });
    });

    it('should validate coordinates are numbers', async () => {
      const target = { x: '150' as any, y: 100, confidence: 0.88 };
      
      const result = await engine.clickAtCoordinates(target);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/invalid coordinate type/i);
    });
  });

  describe('Integration with FindText', () => {
    it('should click on text found by findText()', async () => {
      // Simulate findText returning a target
      const searchResult = await engine.findText('Allow');
      expect(searchResult.found).toBe(true);
      
      const clickResult = await engine.clickAtCoordinates(searchResult.target!);

      expect(clickResult.success).toBe(true);
      const click = eventCapture.getLastClick();
      expect(click.x).toBeGreaterThan(0);
      expect(click.y).toBeGreaterThan(0);
    });

    it('should handle multi-word button text', async () => {
      const target = multiWordButtonTarget; // "Create file" button
      
      const result = await engine.clickAtCoordinates(target);

      expect(result.success).toBe(true);
      expect(eventCapture.getLastClick()).toMatchObject({
        x: target.x,
        y: target.y,
      });
    });
  });

  describe('Performance', () => {
    it('should click within 50ms', async () => {
      const target = { x: 100, y: 100, confidence: 0.90 };
      const start = performance.now();
      
      await engine.clickAtCoordinates(target);
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(50);
    });

    it('should handle rapid successive clicks', async () => {
      const targets = [
        { x: 100, y: 100, confidence: 0.90 },
        { x: 200, y: 200, confidence: 0.88 },
        { x: 300, y: 300, confidence: 0.92 },
      ];
      
      for (const target of targets) {
        const result = await engine.clickAtCoordinates(target);
        expect(result.success).toBe(true);
      }

      expect(eventCapture.getClickCount()).toBe(3);
    });
  });

  describe('Return Value Structure', () => {
    it('should return success: true with clicked coordinates', async () => {
      const target = { x: 150, y: 100, confidence: 0.91 };
      
      const result = await engine.clickAtCoordinates(target);

      expect(result).toMatchObject({
        success: true,
        x: 150,
        y: 100,
        timestamp: expect.any(Number),
      });
    });

    it('should return success: false with error on failure', async () => {
      const target = { x: -50, y: 100, confidence: 0.85 };
      
      const result = await engine.clickAtCoordinates(target);

      expect(result).toMatchObject({
        success: false,
        error: expect.any(String),
      });
      expect(result.x).toBeUndefined();
      expect(result.y).toBeUndefined();
    });

    it('should include timestamp in result', async () => {
      const target = { x: 100, y: 100, confidence: 0.90 };
      const beforeTime = Date.now();
      
      const result = await engine.clickAtCoordinates(target);
      
      const afterTime = Date.now();
      expect(result.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(result.timestamp).toBeLessThanOrEqual(afterTime);
    });
  });
});
```

---

### 4.2 Click Scenario Fixtures

```typescript
// src/lib/__tests__/fixtures/click-scenarios.fixture.ts

import { ClickTarget } from '../../../types/vision.types';

/**
 * Standard button in center of viewport
 */
export const centerButtonTarget: ClickTarget = {
  x: 150,
  y: 100,
  confidence: 0.92,
  text: 'Allow',
};

/**
 * Button with offset coordinates
 */
export const offsetButtonTarget: ClickTarget = {
  x: 450,
  y: 320,
  confidence: 0.88,
  text: 'Keep',
};

/**
 * Button in scrolled viewport (document coordinates)
 */
export const scrolledViewportTarget: ClickTarget = {
  x: 150,
  y: 400, // 300px scroll offset expected
  confidence: 0.90,
  text: 'Submit',
};

/**
 * Button inside nested iframe
 */
export const nestedIframeTarget: ClickTarget = {
  x: 200,
  y: 150,
  confidence: 0.85,
  text: 'Confirm',
};

/**
 * Multi-word button text
 */
export const multiWordButtonTarget: ClickTarget = {
  x: 300,
  y: 200,
  confidence: 0.91,
  text: 'Create file',
};
```

---

### 4.3 DOM Mock Enhancements

```typescript
// Add to src/lib/__tests__/mocks/dom.mock.ts

export function captureMouseEvents(mockDocument: any) {
  const events: any[] = [];
  const originalAddEventListener = mockDocument.addEventListener;

  mockDocument.addEventListener = vi.fn((type: string, listener: any) => {
    if (type.startsWith('mouse') || type === 'click') {
      originalAddEventListener.call(mockDocument, type, (event: any) => {
        events.push({
          type: event.type,
          x: event.clientX,
          y: event.clientY,
          button: event.button,
          bubbles: event.bubbles,
          cancelable: event.cancelable,
          target: event.target,
        });
        listener(event);
      });
    }
  });

  return {
    getAllEvents: () => events,
    getLastClick: () => events.filter(e => e.type === 'click').pop(),
    getLastEventTarget: () => events[events.length - 1]?.target,
    getEventSequence: () => events.map(e => ({ type: e.type, x: e.x, y: e.y })),
    getClickCount: () => events.filter(e => e.type === 'click').length,
  };
}

export function createMockDocument() {
  let scrollX = 0;
  let scrollY = 0;
  let viewportWidth = 1024;
  let viewportHeight = 768;
  const elementMap = new Map<string, Element>();

  const body = {
    dispatchEvent: vi.fn(),
  };

  return {
    body,
    createElement: vi.fn((tag: string) => ({
      tagName: tag.toUpperCase(),
      dispatchEvent: vi.fn(),
      appendChild: vi.fn(),
    })),
    elementFromPoint: vi.fn((x: number, y: number) => {
      const key = `${x},${y}`;
      return elementMap.get(key) || body;
    }),
    addEventListener: vi.fn(),
    get scrollLeft() { return scrollX; },
    get scrollTop() { return scrollY; },
    get documentElement() {
      return {
        clientWidth: viewportWidth,
        clientHeight: viewportHeight,
      };
    },
    setScrollOffset: (offset: { x: number; y: number }) => {
      scrollX = offset.x;
      scrollY = offset.y;
    },
    setViewportSize: (size: { width: number; height: number }) => {
      viewportWidth = size.width;
      viewportHeight = size.height;
    },
    setElementAtPoint: (x: number, y: number, element: Element | null) => {
      const key = `${x},${y}`;
      if (element) {
        elementMap.set(key, element);
      } else {
        elementMap.delete(key);
      }
    },
  };
}
```

---

## 5. ACCEPTANCE CRITERIA

### Core Functionality
- ✅ Click at exact coordinates from ClickTarget
- ✅ Calculate center of bounding box
- ✅ Dispatch mousedown → mouseup → click sequence
- ✅ Handle viewport vs document coordinates
- ✅ Adjust for scroll offset (horizontal and vertical)

### Error Handling
- ✅ Reject negative coordinates
- ✅ Reject out-of-viewport coordinates
- ✅ Validate coordinate types (numbers only)
- ✅ Handle missing elements gracefully
- ✅ Return structured error messages

### Event Simulation
- ✅ Set bubbles: true for all events
- ✅ Set cancelable: true for all events
- ✅ Use button: 0 (left click)
- ✅ Target correct element at coordinates
- ✅ Fallback to document.body if no element

### Integration
- ✅ Works with findText() results
- ✅ Handles multi-word button text
- ✅ Supports rapid successive clicks
- ✅ Click completes within 50ms

### Return Structure
- ✅ Returns { success: true, x, y, timestamp } on success
- ✅ Returns { success: false, error } on failure
- ✅ Includes accurate timestamp

---

## 6. VALIDATION COMMANDS

```bash
# Run coordinate click tests
npm test visionEngine.clickCoordinates.test.ts

# Run with coverage
npm test -- --coverage visionEngine.clickCoordinates.test.ts

# Verify test completeness (should be 20+ tests)
npm test visionEngine.clickCoordinates.test.ts -- --reporter=verbose | grep -c "✓"

# Check for timing issues
npm test visionEngine.clickCoordinates.test.ts -- --reporter=verbose --bail
```

---

## 7. DEPENDENCIES

### Build Order
1. ✅ ENG-006: Coordinate clicking implementation
2. ✅ ENG-008: Playback engine integration
3. ✅ TST-003: OCR recognition tests (for fixtures)
4. ✅ TST-004: FindText accuracy tests (for integration)
5. 🔄 **TST-005** (this card)

### Required Before
- VisionEngine class with clickAtCoordinates() method
- ClickTarget interface defined
- DOM mock utilities
- Test fixtures from TST-004

### Enables
- TST-006: Conditional click loop tests
- INT-001: Vision click handler integration tests
- Full playback engine testing

---

## 8. RISK MITIGATION

| Risk | Impact | Mitigation |
|------|--------|------------|
| Coordinate system confusion (viewport vs document) | High | Explicit test cases for both, scroll offset tests |
| Event dispatch failures | Medium | Mock error scenarios, validate event sequence |
| Flaky timing tests | Medium | Use fake timers, avoid real delays |
| Browser API differences | Low | Mock all browser APIs, isolate VisionEngine logic |

---

## 9. IMPLEMENTATION NOTES

### Test Organization
- Group by functionality: basic clicks, mouse events, coordinate systems, errors
- Use descriptive test names: "should click at exact coordinates from OCR bbox"
- Each test should be independent and atomic

### Mock Strategy
- Mock document, createElement, elementFromPoint
- Capture all dispatched events for verification
- Simulate scroll offsets and viewport sizes
- Use spy functions to verify method calls

### Performance Considerations
- Clicks should complete in <50ms
- Use fake timers for controlled testing
- Avoid real DOM operations (use mocks)
- Test rapid successive clicks (stress test)

### Coverage Goals
- 100% line coverage for clickAtCoordinates()
- All error paths tested
- All coordinate system edge cases covered
- Integration with findText() verified

---

## 10. COMPLETION CHECKLIST

- [ ] Create `visionEngine.clickCoordinates.test.ts`
- [ ] Create `click-scenarios.fixture.ts`
- [ ] Update `dom.mock.ts` with event capture
- [ ] Write 20+ test cases covering all scenarios
- [ ] Verify all tests pass (green)
- [ ] Achieve >95% code coverage
- [ ] Document any discovered bugs or edge cases
- [ ] Commit with message: "TST-005: Coordinate click tests"

---

**Status:** ⬜ Pending  
**Assignee:** [Unassigned]  
**Estimated Duration:** 2-3 hours  
**Actual Duration:** _TBD_

---

*End of TST-005 Specification*
