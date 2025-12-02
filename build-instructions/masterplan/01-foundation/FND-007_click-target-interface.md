# FND-007: CLICKTARGET INTERFACE SPECIFICATION

> **Build Card:** FND-007  
> **Category:** Foundation / Architecture  
> **Dependencies:** FND-004 (Type definitions file must exist)  
> **Risk Level:** Low  
> **Estimated Lines:** ~380

---

## 1. PURPOSE

This specification provides detailed documentation and implementation guidance for the `ClickTarget` interface. The ClickTarget interface represents a target location for Vision-based click operations, containing:

1. **Center coordinates** - The exact X/Y position to click
2. **Dimensions** - Width and height for debugging/visualization
3. **Metadata** - Matched text and confidence score for verification

ClickTarget is the output of text searching operations and the input to click operations. It bridges the gap between OCR recognition (TextResult) and user interaction (clicking).

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| Type Definitions | `src/types/vision.ts` | ClickTarget interface |
| Data Layer Spec | `/future-spec/05_data-layer.md` | ClickTarget definition |
| API Contracts | `/future-spec/06_api-contracts.md` | Click operation inputs |
| TextResult Utils | `src/lib/textResultUtils.ts` | toClickTarget function |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `src/types/vision.ts` | VERIFY | ClickTarget already defined in FND-004 |
| `src/lib/clickTargetUtils.ts` | CREATE | Utility functions for ClickTarget |

### Exports from clickTargetUtils.ts

| Export Name | Type | Description |
|-------------|------|-------------|
| `createClickTarget` | function | Factory for ClickTarget objects |
| `isValidClickTarget` | function | Validates target coordinates |
| `adjustForScroll` | function | Adjusts coordinates for scroll offset |
| `scaleClickTarget` | function | Scales coordinates for DPI |
| `clickTargetToString` | function | Debug string representation |
| `areTargetsEqual` | function | Compare two targets |

---

## 4. DETAILED SPECIFICATION

### 4.1 Interface Definition (Reference)

The ClickTarget interface from `src/types/vision.ts`:

```typescript
export interface ClickTarget {
  /** Center X coordinate to click */
  x: number;

  /** Center Y coordinate to click */
  y: number;

  /** Width of the target element (for debugging) */
  width?: number;

  /** Height of the target element (for debugging) */
  height?: number;

  /** The text that was matched */
  matchedText?: string;

  /** Confidence score of the match */
  confidence?: number;
}
```

### 4.2 Property Specifications

#### 4.2.1 x (Required)

| Attribute | Value |
|-----------|-------|
| Type | `number` |
| Required | Yes |
| Unit | Pixels |
| Origin | Top-left of viewport |

**Description:**
The horizontal coordinate (in pixels) where the click should occur. This is typically the center X coordinate of the matched text element.

**Valid Range:**
- Minimum: 0 (left edge of viewport)
- Maximum: `window.innerWidth` (right edge of viewport)

**Considerations:**
- Values outside viewport may indicate scrolling is needed
- Negative values are invalid for clicking
- Sub-pixel values are rounded by browsers

#### 4.2.2 y (Required)

| Attribute | Value |
|-----------|-------|
| Type | `number` |
| Required | Yes |
| Unit | Pixels |
| Origin | Top-left of viewport |

**Description:**
The vertical coordinate (in pixels) where the click should occur. This is typically the center Y coordinate of the matched text element.

**Valid Range:**
- Minimum: 0 (top edge of viewport)
- Maximum: `window.innerHeight` (bottom edge of viewport)

**Considerations:**
- Values below viewport may require scrolling
- Negative values are invalid for clicking
- Account for fixed headers/footers that may overlay the target

#### 4.2.3 width (Optional)

| Attribute | Value |
|-----------|-------|
| Type | `number` |
| Required | No |
| Unit | Pixels |

**Description:**
The width of the target element's bounding box. Used for debugging, visualization, and calculating click tolerance zones.

**Use Cases:**
- Drawing highlight rectangles during debugging
- Calculating if a click is "close enough" to target
- Logging for troubleshooting

#### 4.2.4 height (Optional)

| Attribute | Value |
|-----------|-------|
| Type | `number` |
| Required | No |
| Unit | Pixels |

**Description:**
The height of the target element's bounding box. Used alongside width for debugging and visualization.

#### 4.2.5 matchedText (Optional)

| Attribute | Value |
|-----------|-------|
| Type | `string` |
| Required | No |

**Description:**
The OCR text that was matched to create this click target. Stored for:
- Logging and debugging
- Verification that the correct element was found
- User feedback in UI

**Example Values:**
- `"Allow"` - Button text that was matched
- `"Submit Form"` - Multi-word match
- `"✓ Accept"` - Text with special characters

#### 4.2.6 confidence (Optional)

| Attribute | Value |
|-----------|-------|
| Type | `number` |
| Required | No |
| Range | 0-100 |

**Description:**
The OCR confidence score from the TextResult that produced this target. Useful for:
- Logging match quality
- Deciding whether to proceed with low-confidence matches
- Debugging OCR issues

---

### 4.3 Relationship to TextResult

ClickTarget is derived from TextResult through coordinate extraction:

```
TextResult                          ClickTarget
┌─────────────────────┐            ┌─────────────────────┐
│ text: "Allow"       │            │ x: 130              │
│ confidence: 85      │  ────►     │ y: 212              │
│ bounds: {           │            │ width: 60           │
│   x: 100            │            │ height: 24          │
│   y: 200            │            │ matchedText: "Allow"│
│   width: 60         │            │ confidence: 85      │
│   height: 24        │            └─────────────────────┘
│   centerX: 130      │
│   centerY: 212      │
│ }                   │
└─────────────────────┘
```

The conversion extracts `centerX` and `centerY` as the primary click coordinates.

---

### 4.4 Utility Functions

Create `src/lib/clickTargetUtils.ts`:

```typescript
/**
 * @fileoverview Utility functions for ClickTarget operations
 * @module lib/clickTargetUtils
 */

import { ClickTarget, TextResult } from '@/types';

/**
 * Creates a ClickTarget from coordinates
 * @param x - Center X coordinate
 * @param y - Center Y coordinate
 * @param options - Optional metadata
 * @returns ClickTarget object
 */
export function createClickTarget(
  x: number,
  y: number,
  options: {
    width?: number;
    height?: number;
    matchedText?: string;
    confidence?: number;
  } = {}
): ClickTarget {
  return {
    x,
    y,
    ...options,
  };
}

/**
 * Creates a ClickTarget from a TextResult
 * @param result - TextResult from OCR
 * @returns ClickTarget with center coordinates
 */
export function fromTextResult(result: TextResult): ClickTarget {
  return {
    x: result.bounds.centerX,
    y: result.bounds.centerY,
    width: result.bounds.width,
    height: result.bounds.height,
    matchedText: result.text,
    confidence: result.confidence,
  };
}

/**
 * Validates that a ClickTarget has valid coordinates for clicking
 * @param target - ClickTarget to validate
 * @param viewportWidth - Current viewport width
 * @param viewportHeight - Current viewport height
 * @returns Validation result with any errors
 */
export function isValidClickTarget(
  target: ClickTarget,
  viewportWidth: number = window.innerWidth,
  viewportHeight: number = window.innerHeight
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check x coordinate
  if (typeof target.x !== 'number' || isNaN(target.x)) {
    errors.push('x coordinate must be a valid number');
  } else if (target.x < 0) {
    errors.push('x coordinate cannot be negative');
  } else if (target.x > viewportWidth) {
    errors.push(`x coordinate (${target.x}) exceeds viewport width (${viewportWidth})`);
  }

  // Check y coordinate
  if (typeof target.y !== 'number' || isNaN(target.y)) {
    errors.push('y coordinate must be a valid number');
  } else if (target.y < 0) {
    errors.push('y coordinate cannot be negative');
  } else if (target.y > viewportHeight) {
    errors.push(`y coordinate (${target.y}) exceeds viewport height (${viewportHeight})`);
  }

  // Check optional dimensions if provided
  if (target.width !== undefined && target.width <= 0) {
    errors.push('width must be positive if provided');
  }
  if (target.height !== undefined && target.height <= 0) {
    errors.push('height must be positive if provided');
  }

  // Check confidence if provided
  if (target.confidence !== undefined) {
    if (target.confidence < 0 || target.confidence > 100) {
      errors.push('confidence must be between 0 and 100');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Checks if a ClickTarget is within the current viewport
 * @param target - ClickTarget to check
 * @param viewportWidth - Current viewport width
 * @param viewportHeight - Current viewport height
 * @returns True if target is within viewport
 */
export function isInViewport(
  target: ClickTarget,
  viewportWidth: number = window.innerWidth,
  viewportHeight: number = window.innerHeight
): boolean {
  return (
    target.x >= 0 &&
    target.x <= viewportWidth &&
    target.y >= 0 &&
    target.y <= viewportHeight
  );
}

/**
 * Adjusts ClickTarget coordinates for scroll offset
 * @param target - Original ClickTarget
 * @param scrollX - Horizontal scroll offset (window.scrollX)
 * @param scrollY - Vertical scroll offset (window.scrollY)
 * @returns New ClickTarget with adjusted coordinates
 */
export function adjustForScroll(
  target: ClickTarget,
  scrollX: number,
  scrollY: number
): ClickTarget {
  return {
    ...target,
    x: target.x - scrollX,
    y: target.y - scrollY,
  };
}

/**
 * Converts page coordinates to viewport coordinates
 * @param target - ClickTarget with page coordinates
 * @returns ClickTarget with viewport coordinates
 */
export function pageToViewport(target: ClickTarget): ClickTarget {
  return adjustForScroll(target, window.scrollX, window.scrollY);
}

/**
 * Converts viewport coordinates to page coordinates
 * @param target - ClickTarget with viewport coordinates
 * @returns ClickTarget with page coordinates
 */
export function viewportToPage(target: ClickTarget): ClickTarget {
  return {
    ...target,
    x: target.x + window.scrollX,
    y: target.y + window.scrollY,
  };
}

/**
 * Scales ClickTarget coordinates for device pixel ratio
 * @param target - Original ClickTarget
 * @param dpr - Device pixel ratio (window.devicePixelRatio)
 * @returns Scaled ClickTarget
 */
export function scaleClickTarget(
  target: ClickTarget,
  dpr: number = window.devicePixelRatio
): ClickTarget {
  return {
    ...target,
    x: target.x * dpr,
    y: target.y * dpr,
    width: target.width ? target.width * dpr : undefined,
    height: target.height ? target.height * dpr : undefined,
  };
}

/**
 * Unscales ClickTarget coordinates from device pixel ratio
 * @param target - Scaled ClickTarget
 * @param dpr - Device pixel ratio
 * @returns Unscaled ClickTarget
 */
export function unscaleClickTarget(
  target: ClickTarget,
  dpr: number = window.devicePixelRatio
): ClickTarget {
  return {
    ...target,
    x: target.x / dpr,
    y: target.y / dpr,
    width: target.width ? target.width / dpr : undefined,
    height: target.height ? target.height / dpr : undefined,
  };
}

/**
 * Creates a debug string representation of a ClickTarget
 * @param target - ClickTarget to stringify
 * @returns Human-readable string
 */
export function clickTargetToString(target: ClickTarget): string {
  const parts = [`(${Math.round(target.x)}, ${Math.round(target.y)})`];

  if (target.width && target.height) {
    parts.push(`${target.width}x${target.height}`);
  }

  if (target.matchedText) {
    parts.push(`"${target.matchedText}"`);
  }

  if (target.confidence !== undefined) {
    parts.push(`${target.confidence}%`);
  }

  return parts.join(' ');
}

/**
 * Compares two ClickTargets for equality
 * @param a - First ClickTarget
 * @param b - Second ClickTarget
 * @param tolerance - Pixel tolerance for coordinate comparison
 * @returns True if targets are equal within tolerance
 */
export function areTargetsEqual(
  a: ClickTarget,
  b: ClickTarget,
  tolerance: number = 1
): boolean {
  const xEqual = Math.abs(a.x - b.x) <= tolerance;
  const yEqual = Math.abs(a.y - b.y) <= tolerance;
  return xEqual && yEqual;
}

/**
 * Calculates the distance between two ClickTargets
 * @param a - First ClickTarget
 * @param b - Second ClickTarget
 * @returns Euclidean distance in pixels
 */
export function distanceBetween(a: ClickTarget, b: ClickTarget): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Finds the closest ClickTarget to a reference point
 * @param targets - Array of ClickTargets to search
 * @param reference - Reference point (x, y)
 * @returns Closest target or null if array is empty
 */
export function findClosest(
  targets: ClickTarget[],
  reference: { x: number; y: number }
): ClickTarget | null {
  if (targets.length === 0) return null;

  let closest = targets[0];
  let minDistance = distanceBetween(closest, reference as ClickTarget);

  for (let i = 1; i < targets.length; i++) {
    const dist = distanceBetween(targets[i], reference as ClickTarget);
    if (dist < minDistance) {
      minDistance = dist;
      closest = targets[i];
    }
  }

  return closest;
}

/**
 * Offsets a ClickTarget by a specified amount
 * @param target - Original ClickTarget
 * @param offsetX - Horizontal offset
 * @param offsetY - Vertical offset
 * @returns New ClickTarget with offset applied
 */
export function offsetTarget(
  target: ClickTarget,
  offsetX: number,
  offsetY: number
): ClickTarget {
  return {
    ...target,
    x: target.x + offsetX,
    y: target.y + offsetY,
  };
}

/**
 * Gets the bounding rectangle for a ClickTarget
 * Useful for drawing highlights or checking overlaps
 * @param target - ClickTarget with optional width/height
 * @returns Bounding rectangle or null if dimensions not available
 */
export function getBoundingRect(
  target: ClickTarget
): { left: number; top: number; right: number; bottom: number } | null {
  if (target.width === undefined || target.height === undefined) {
    return null;
  }

  const halfWidth = target.width / 2;
  const halfHeight = target.height / 2;

  return {
    left: target.x - halfWidth,
    top: target.y - halfHeight,
    right: target.x + halfWidth,
    bottom: target.y + halfHeight,
  };
}
```

---

## 5. CODE EXAMPLES

### 5.1 Basic Usage

```typescript
import { createClickTarget, clickTargetToString } from '@/lib/clickTargetUtils';

// Create a simple click target
const target = createClickTarget(150, 300);
console.log(clickTargetToString(target)); // "(150, 300)"

// Create with full metadata
const buttonTarget = createClickTarget(150, 300, {
  width: 80,
  height: 32,
  matchedText: 'Submit',
  confidence: 92,
});
console.log(clickTargetToString(buttonTarget)); // "(150, 300) 80x32 "Submit" 92%"
```

### 5.2 Converting from TextResult

```typescript
import { fromTextResult } from '@/lib/clickTargetUtils';
import { findTextMatch } from '@/lib/textResultUtils';

const ocrResults: TextResult[] = [/* ... */];
const match = findTextMatch(ocrResults, ['Allow']);

if (match) {
  const clickTarget = fromTextResult(match);
  console.log(`Click at ${clickTarget.x}, ${clickTarget.y}`);
}
```

### 5.3 Validation Before Clicking

```typescript
import { isValidClickTarget, isInViewport } from '@/lib/clickTargetUtils';

const target: ClickTarget = { x: 500, y: 800 };

const validation = isValidClickTarget(target);
if (!validation.valid) {
  console.error('Invalid target:', validation.errors);
  return;
}

if (!isInViewport(target)) {
  console.log('Target outside viewport, scrolling needed');
  // Scroll to target...
}

// Safe to click
await click(target.x, target.y);
```

### 5.4 Handling Scroll and DPI

```typescript
import { adjustForScroll, scaleClickTarget } from '@/lib/clickTargetUtils';

// OCR gives coordinates relative to full page
const pageTarget: ClickTarget = { x: 500, y: 2000 };

// Adjust for current scroll position
const viewportTarget = adjustForScroll(
  pageTarget,
  window.scrollX,
  window.scrollY
);

// Scale for high-DPI displays
const scaledTarget = scaleClickTarget(viewportTarget);

// Now click at correct position
simulateClick(scaledTarget.x, scaledTarget.y);
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** ClickTarget interface exists in `src/types/vision.ts`
- [ ] **AC-2:** `src/lib/clickTargetUtils.ts` is created with all utilities
- [ ] **AC-3:** `createClickTarget()` creates valid ClickTarget objects
- [ ] **AC-4:** `fromTextResult()` correctly extracts center coordinates
- [ ] **AC-5:** `isValidClickTarget()` catches invalid coordinates
- [ ] **AC-6:** `isInViewport()` correctly checks viewport bounds
- [ ] **AC-7:** `adjustForScroll()` correctly adjusts for scroll offset
- [ ] **AC-8:** `scaleClickTarget()` correctly handles DPI scaling
- [ ] **AC-9:** All functions have complete JSDoc documentation
- [ ] **AC-10:** TypeScript compiles without errors

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Immutable operations** - All functions return new objects
2. **Viewport awareness** - Coordinates relative to current viewport
3. **DPI handling** - Account for devicePixelRatio on high-DPI displays

### Patterns to Follow

1. **Optional metadata** - Width, height, text are optional
2. **Validation before use** - Always validate before clicking
3. **Coordinate transforms** - Chain transforms for complex scenarios

### Edge Cases

1. **Off-screen targets** - Validate and scroll before clicking
2. **High-DPI displays** - Scale coordinates appropriately
3. **Scrolled pages** - Adjust for scroll offset

---

## 8. VERIFICATION COMMANDS

```bash
# Verify file exists
ls -la src/lib/clickTargetUtils.ts

# Run type check
npm run type-check

# Test createClickTarget
npx ts-node -e "
  const { createClickTarget, clickTargetToString } = require('./src/lib/clickTargetUtils');
  const t = createClickTarget(100, 200, { matchedText: 'Test' });
  console.log(clickTargetToString(t));
"
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Remove the utilities file
rm src/lib/clickTargetUtils.ts

# Verify types still compile
npm run type-check
```

---

## 10. REFERENCES

- FND-004: Type Definitions File
- FND-006: TextResult Interface
- Data Layer Spec: `/future-spec/05_data-layer.md`

---

*End of Specification FND-007*
