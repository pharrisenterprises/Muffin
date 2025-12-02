# FND-006: TEXTRESULT INTERFACE SPECIFICATION

> **Build Card:** FND-006  
> **Category:** Foundation / Architecture  
> **Dependencies:** FND-004 (Type definitions file must exist)  
> **Risk Level:** Low  
> **Estimated Lines:** ~400

---

## 1. PURPOSE

This specification provides detailed documentation and implementation guidance for the `TextResult` interface. The TextResult interface represents the output of an OCR (Optical Character Recognition) operation, containing:

1. **Recognized text** - The text string extracted from the image
2. **Confidence score** - How confident the OCR engine is in the result
3. **Bounding box** - The exact pixel coordinates where the text was found

This interface is fundamental to the Vision Engine's text searching capabilities. Every OCR scan produces an array of TextResult objects, which are then filtered and searched to find target elements.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| Type Definitions | `src/types/vision.ts` | TextResult interface |
| Data Layer Spec | `/future-spec/05_data-layer.md` | TextResult definition |
| API Contracts | `/future-spec/06_api-contracts.md` | OCR result format |
| Tesseract.js Docs | npm package | Recognition result structure |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `src/types/vision.ts` | VERIFY | TextResult already defined in FND-004 |
| `src/lib/textResultUtils.ts` | CREATE | Utility functions for TextResult |

### Exports from textResultUtils.ts

| Export Name | Type | Description |
|-------------|------|-------------|
| `createTextResult` | function | Factory for TextResult objects |
| `filterByConfidence` | function | Filter results by confidence threshold |
| `findTextMatch` | function | Find first matching text |
| `findAllTextMatches` | function | Find all matching texts |
| `sortByPosition` | function | Sort results by screen position |
| `calculateBoundsCenter` | function | Compute center coordinates |

---

## 4. DETAILED SPECIFICATION

### 4.1 Interface Definition (Reference)

The TextResult interface from `src/types/vision.ts`:

```typescript
export interface TextResult {
  /** The recognized text string */
  text: string;

  /** Confidence score from 0-100 */
  confidence: number;

  /** Bounding box coordinates in viewport pixels */
  bounds: {
    /** Left edge X coordinate */
    x: number;
    /** Top edge Y coordinate */
    y: number;
    /** Width of the bounding box */
    width: number;
    /** Height of the bounding box */
    height: number;
    /** Computed center X coordinate */
    centerX: number;
    /** Computed center Y coordinate */
    centerY: number;
  };
}
```

### 4.2 Property Specifications

#### 4.2.1 text

| Attribute | Value |
|-----------|-------|
| Type | `string` |
| Required | Yes |
| Constraints | Non-empty after trimming |

**Description:**
The text string recognized by Tesseract.js OCR. This is the actual content extracted from the screenshot at the location specified by `bounds`.

**Characteristics:**
- May contain whitespace (leading, trailing, internal)
- May include special characters depending on OCR accuracy
- Case-sensitive (preserves original case)
- May be a single word or multiple words

**Common Values:**

| Context | Example Values |
|---------|----------------|
| Buttons | "Submit", "Cancel", "Allow", "Keep" |
| Labels | "Username:", "Email Address" |
| Links | "Click here", "Learn more" |
| Errors | "Invalid input", "Required field" |

#### 4.2.2 confidence

| Attribute | Value |
|-----------|-------|
| Type | `number` |
| Required | Yes |
| Minimum | `0` |
| Maximum | `100` |
| Unit | Percentage |

**Description:**
The OCR engine's confidence in the accuracy of the recognized text. Higher values indicate more reliable recognition.

**Confidence Ranges:**

| Range | Interpretation | Reliability |
|-------|----------------|-------------|
| 90-100 | Very high | Extremely reliable |
| 75-89 | High | Reliable for most uses |
| 60-74 | Moderate | Use with caution |
| 40-59 | Low | May contain errors |
| 0-39 | Very low | Likely incorrect |

**Factors Affecting Confidence:**
- Font clarity and size
- Image resolution and quality
- Background contrast
- Text orientation
- Special characters or unusual fonts

#### 4.2.3 bounds

| Attribute | Value |
|-----------|-------|
| Type | `object` |
| Required | Yes |

**Description:**
The bounding box defining the rectangular area where the text was detected. All coordinates are in viewport pixels relative to the top-left corner of the captured screenshot.

**Sub-properties:**

| Property | Type | Description |
|----------|------|-------------|
| `x` | number | Left edge X coordinate (pixels from left) |
| `y` | number | Top edge Y coordinate (pixels from top) |
| `width` | number | Width of bounding box (pixels) |
| `height` | number | Height of bounding box (pixels) |
| `centerX` | number | Horizontal center: `x + (width / 2)` |
| `centerY` | number | Vertical center: `y + (height / 2)` |

**Coordinate System:**

```
(0,0) ─────────────────────────────► X
  │
  │   ┌─────────────────┐
  │   │ (x, y)          │
  │   │    ┌───────┐    │
  │   │    │ TEXT  │    │  height
  │   │    └───────┘    │
  │   │         (centerX, centerY)
  │   └─────────────────┘
  │          width
  ▼
  Y
```

**Why centerX and centerY?**
- Click operations target the center of elements
- Pre-computed values avoid repeated calculations
- Simplifies coordinate-based clicking logic

---

### 4.3 Mapping from Tesseract.js

Tesseract.js returns recognition results in a specific format. The Vision Engine transforms this into TextResult objects:

```typescript
// Tesseract.js raw result structure (simplified)
interface TesseractWord {
  text: string;
  confidence: number;
  bbox: {
    x0: number;  // Left edge
    y0: number;  // Top edge
    x1: number;  // Right edge
    y1: number;  // Bottom edge
  };
}

// Transformation function
function toTextResult(word: TesseractWord): TextResult {
  const width = word.bbox.x1 - word.bbox.x0;
  const height = word.bbox.y1 - word.bbox.y0;
  
  return {
    text: word.text,
    confidence: word.confidence,
    bounds: {
      x: word.bbox.x0,
      y: word.bbox.y0,
      width,
      height,
      centerX: word.bbox.x0 + width / 2,
      centerY: word.bbox.y0 + height / 2,
    },
  };
}
```

---

### 4.4 Utility Functions

Create `src/lib/textResultUtils.ts`:

```typescript
/**
 * @fileoverview Utility functions for TextResult operations
 * @module lib/textResultUtils
 */

import { TextResult, ClickTarget } from '@/types';

/**
 * Creates a TextResult with computed center coordinates
 * @param text - Recognized text
 * @param confidence - Confidence score (0-100)
 * @param x - Left edge X coordinate
 * @param y - Top edge Y coordinate
 * @param width - Bounding box width
 * @param height - Bounding box height
 * @returns Complete TextResult object
 */
export function createTextResult(
  text: string,
  confidence: number,
  x: number,
  y: number,
  width: number,
  height: number
): TextResult {
  return {
    text,
    confidence,
    bounds: {
      x,
      y,
      width,
      height,
      centerX: x + width / 2,
      centerY: y + height / 2,
    },
  };
}

/**
 * Calculates center coordinates from bounds
 * @param bounds - Partial bounds with x, y, width, height
 * @returns Object with centerX and centerY
 */
export function calculateBoundsCenter(bounds: {
  x: number;
  y: number;
  width: number;
  height: number;
}): { centerX: number; centerY: number } {
  return {
    centerX: bounds.x + bounds.width / 2,
    centerY: bounds.y + bounds.height / 2,
  };
}

/**
 * Filters TextResult array by minimum confidence threshold
 * @param results - Array of TextResult objects
 * @param threshold - Minimum confidence (0-100)
 * @returns Filtered array with only results meeting threshold
 */
export function filterByConfidence(
  results: TextResult[],
  threshold: number
): TextResult[] {
  return results.filter((r) => r.confidence >= threshold);
}

/**
 * Finds the first TextResult matching any of the search terms
 * @param results - Array of TextResult objects
 * @param searchTerms - Terms to search for (case-insensitive)
 * @param options - Search options
 * @returns First matching TextResult or null
 */
export function findTextMatch(
  results: TextResult[],
  searchTerms: string[],
  options: {
    caseSensitive?: boolean;
    exactMatch?: boolean;
    minConfidence?: number;
  } = {}
): TextResult | null {
  const {
    caseSensitive = false,
    exactMatch = false,
    minConfidence = 0,
  } = options;

  // Pre-filter by confidence
  const filtered = results.filter((r) => r.confidence >= minConfidence);

  for (const result of filtered) {
    const resultText = caseSensitive ? result.text : result.text.toLowerCase();

    for (const term of searchTerms) {
      const searchText = caseSensitive ? term : term.toLowerCase();

      if (exactMatch) {
        if (resultText.trim() === searchText.trim()) {
          return result;
        }
      } else {
        if (resultText.includes(searchText)) {
          return result;
        }
      }
    }
  }

  return null;
}

/**
 * Finds all TextResults matching any of the search terms
 * @param results - Array of TextResult objects
 * @param searchTerms - Terms to search for (case-insensitive)
 * @param options - Search options
 * @returns Array of matching TextResult objects
 */
export function findAllTextMatches(
  results: TextResult[],
  searchTerms: string[],
  options: {
    caseSensitive?: boolean;
    exactMatch?: boolean;
    minConfidence?: number;
  } = {}
): TextResult[] {
  const {
    caseSensitive = false,
    exactMatch = false,
    minConfidence = 0,
  } = options;

  const filtered = results.filter((r) => r.confidence >= minConfidence);
  const matches: TextResult[] = [];

  for (const result of filtered) {
    const resultText = caseSensitive ? result.text : result.text.toLowerCase();

    for (const term of searchTerms) {
      const searchText = caseSensitive ? term : term.toLowerCase();

      const isMatch = exactMatch
        ? resultText.trim() === searchText.trim()
        : resultText.includes(searchText);

      if (isMatch) {
        matches.push(result);
        break; // Avoid duplicates if multiple terms match same result
      }
    }
  }

  return matches;
}

/**
 * Sorts TextResult array by screen position (top-to-bottom, left-to-right)
 * @param results - Array of TextResult objects
 * @returns New sorted array
 */
export function sortByPosition(results: TextResult[]): TextResult[] {
  return [...results].sort((a, b) => {
    // First sort by Y position (top to bottom)
    const yDiff = a.bounds.y - b.bounds.y;
    if (Math.abs(yDiff) > 10) {
      // Allow 10px tolerance for same "row"
      return yDiff;
    }
    // Then sort by X position (left to right)
    return a.bounds.x - b.bounds.x;
  });
}

/**
 * Sorts TextResult array by confidence (highest first)
 * @param results - Array of TextResult objects
 * @returns New sorted array
 */
export function sortByConfidence(results: TextResult[]): TextResult[] {
  return [...results].sort((a, b) => b.confidence - a.confidence);
}

/**
 * Converts a TextResult to a ClickTarget
 * @param result - TextResult to convert
 * @returns ClickTarget with center coordinates
 */
export function toClickTarget(result: TextResult): ClickTarget {
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
 * Checks if two TextResults overlap significantly
 * @param a - First TextResult
 * @param b - Second TextResult
 * @param overlapThreshold - Minimum overlap ratio (0-1) to consider overlapping
 * @returns True if results overlap
 */
export function resultsOverlap(
  a: TextResult,
  b: TextResult,
  overlapThreshold: number = 0.5
): boolean {
  const aLeft = a.bounds.x;
  const aRight = a.bounds.x + a.bounds.width;
  const aTop = a.bounds.y;
  const aBottom = a.bounds.y + a.bounds.height;

  const bLeft = b.bounds.x;
  const bRight = b.bounds.x + b.bounds.width;
  const bTop = b.bounds.y;
  const bBottom = b.bounds.y + b.bounds.height;

  // Calculate intersection
  const xOverlap = Math.max(0, Math.min(aRight, bRight) - Math.max(aLeft, bLeft));
  const yOverlap = Math.max(0, Math.min(aBottom, bBottom) - Math.max(aTop, bTop));
  const intersectionArea = xOverlap * yOverlap;

  // Calculate areas
  const aArea = a.bounds.width * a.bounds.height;
  const bArea = b.bounds.width * b.bounds.height;
  const smallerArea = Math.min(aArea, bArea);

  // Check if intersection is significant relative to smaller box
  return intersectionArea / smallerArea >= overlapThreshold;
}

/**
 * Removes duplicate/overlapping results, keeping highest confidence
 * @param results - Array of TextResult objects
 * @param overlapThreshold - Overlap ratio to consider duplicate
 * @returns Deduplicated array
 */
export function deduplicateResults(
  results: TextResult[],
  overlapThreshold: number = 0.5
): TextResult[] {
  // Sort by confidence first (highest first)
  const sorted = sortByConfidence(results);
  const kept: TextResult[] = [];

  for (const result of sorted) {
    // Check if this result overlaps with any already-kept result
    const overlaps = kept.some((k) => resultsOverlap(result, k, overlapThreshold));
    if (!overlaps) {
      kept.push(result);
    }
  }

  return kept;
}
```

---

## 5. CODE EXAMPLES

### 5.1 Basic Usage

```typescript
import { createTextResult, filterByConfidence } from '@/lib/textResultUtils';

// Create a TextResult
const result = createTextResult('Allow', 85, 100, 200, 60, 24);
console.log(result.bounds.centerX); // 130
console.log(result.bounds.centerY); // 212

// Filter by confidence
const allResults: TextResult[] = [
  createTextResult('Allow', 85, 100, 200, 60, 24),
  createTextResult('Maybe', 45, 100, 250, 60, 24),
  createTextResult('Keep', 72, 200, 200, 50, 24),
];

const highConfidence = filterByConfidence(allResults, 60);
console.log(highConfidence.length); // 2 (Allow and Keep)
```

### 5.2 Finding Text Matches

```typescript
import { findTextMatch, findAllTextMatches } from '@/lib/textResultUtils';

const ocrResults: TextResult[] = [/* ... from OCR scan ... */];

// Find first "Allow" or "Keep" button
const target = findTextMatch(ocrResults, ['Allow', 'Keep'], {
  minConfidence: 60,
});

if (target) {
  console.log(`Found "${target.text}" at (${target.bounds.centerX}, ${target.bounds.centerY})`);
}

// Find ALL "Allow" buttons (for conditional click)
const allAllowButtons = findAllTextMatches(ocrResults, ['Allow'], {
  minConfidence: 60,
});
console.log(`Found ${allAllowButtons.length} Allow buttons`);
```

### 5.3 Converting to ClickTarget

```typescript
import { findTextMatch, toClickTarget } from '@/lib/textResultUtils';

const result = findTextMatch(ocrResults, ['Submit']);

if (result) {
  const clickTarget = toClickTarget(result);
  await visionEngine.clickAtCoordinates(clickTarget.x, clickTarget.y);
}
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** TextResult interface exists in `src/types/vision.ts`
- [ ] **AC-2:** `src/lib/textResultUtils.ts` is created with all utilities
- [ ] **AC-3:** `createTextResult()` correctly computes centerX and centerY
- [ ] **AC-4:** `filterByConfidence()` filters results correctly
- [ ] **AC-5:** `findTextMatch()` returns first matching result or null
- [ ] **AC-6:** `findAllTextMatches()` returns all matching results
- [ ] **AC-7:** `sortByPosition()` sorts top-to-bottom, left-to-right
- [ ] **AC-8:** `toClickTarget()` converts TextResult to ClickTarget
- [ ] **AC-9:** All functions have complete JSDoc documentation
- [ ] **AC-10:** TypeScript compiles without errors

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Immutable operations** - Sort and filter return new arrays, don't mutate
2. **Null safety** - Handle empty arrays and no-match cases
3. **Coordinate precision** - Use floating-point for center calculations

### Patterns to Follow

1. **Pure functions** - No side effects in utility functions
2. **Options objects** - Use objects for optional parameters
3. **Early return** - Return null/empty early for edge cases

### Edge Cases

1. **Empty results array** - Return null or empty array appropriately
2. **Zero-dimension bounds** - Handle width=0 or height=0
3. **Negative coordinates** - May occur with scroll offsets

---

## 8. VERIFICATION COMMANDS

```bash
# Verify file exists
ls -la src/lib/textResultUtils.ts

# Run type check
npm run type-check

# Test createTextResult center calculation
npx ts-node -e "
  const { createTextResult } = require('./src/lib/textResultUtils');
  const r = createTextResult('Test', 80, 100, 200, 60, 24);
  console.log('centerX:', r.bounds.centerX, '(expected: 130)');
  console.log('centerY:', r.bounds.centerY, '(expected: 212)');
"
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Remove the utilities file
rm src/lib/textResultUtils.ts

# Verify types still compile
npm run type-check
```

---

## 10. REFERENCES

- [Tesseract.js Recognition Result](https://github.com/naptha/tesseract.js/blob/master/docs/api.md#recognize)
- FND-004: Type Definitions File
- Data Layer Spec: `/future-spec/05_data-layer.md`

---

*End of Specification FND-006*
