# TST-004: FindText Accuracy Tests

> **Build Card:** TST-004  
> **Category:** Testing & Validation  
> **Dependencies:** ENG-006, TST-003  
> **Risk Level:** High  
> **Estimated Lines:** 300-350

---

## 1. PURPOSE

Create comprehensive unit tests for the VisionEngine `findText()` function accuracy. These tests verify that text search correctly locates target strings within OCR results, handles partial matches, case sensitivity options, fuzzy matching, and returns accurate click coordinates. Critical for ensuring Vision-based automation can reliably locate UI elements like "Allow" and "Keep" buttons.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| VisionEngine Class | `src/lib/visionEngine.ts` | findText() method |
| TextResult Interface | `src/types/vision.types.ts` | Search result structure |
| ENG-006 Spec | `build-instructions/masterplan/03-engine/ENG-006_find-text-function.md` | FindText requirements |
| TST-003 | OCR tests | Mock patterns and fixtures |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/lib/__tests__/visionEngine.findText.test.ts` | CREATE | +260 |
| `src/lib/__tests__/fixtures/ocr-results.fixture.ts` | MODIFY | +50 |

### Artifacts

- FindText accuracy test suite
- Additional OCR fixtures for search scenarios
- Fuzzy matching test cases

---

## 4. DETAILED SPECIFICATION

### 4.1 Test File Structure

```typescript
// src/lib/__tests__/visionEngine.findText.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VisionEngine } from '../visionEngine';
import { createMockTesseract, configureMockOcrResult } from './mocks/tesseract.mock';
import { createMockChrome } from './mocks/chrome.mock';
import {
  buttonTextResult,
  multiLineTextResult,
  copilotDialogResult,
  similarWordsResult,
  mixedCaseResult,
} from './fixtures/ocr-results.fixture';

// Mock dependencies
vi.stubGlobal('chrome', createMockChrome());
vi.mock('tesseract.js', () => createMockTesseract());

describe('VisionEngine FindText Accuracy', () => {
  let engine: VisionEngine;

  beforeEach(async () => {
    vi.clearAllMocks();
    engine = new VisionEngine();
    await engine.initialize();
  });

  afterEach(async () => {
    await engine.terminate();
  });

  // Test suites defined below...
});
```

### 4.2 Additional OCR Fixtures

```typescript
// Add to src/lib/__tests__/fixtures/ocr-results.fixture.ts

/**
 * Copilot-style dialog with Allow/Keep buttons
 */
export const copilotDialogResult: TesseractResult = {
  data: {
    text: 'Copilot wants to create a file\n\nAllow    Keep    Deny',
    confidence: 91.0,
    words: [
      { text: 'Copilot', confidence: 94.0, bbox: { x0: 20, y0: 20, x1: 100, y1: 45 } },
      { text: 'wants', confidence: 92.0, bbox: { x0: 110, y0: 20, x1: 165, y1: 45 } },
      { text: 'to', confidence: 88.0, bbox: { x0: 175, y0: 20, x1: 195, y1: 45 } },
      { text: 'create', confidence: 90.0, bbox: { x0: 205, y0: 20, x1: 270, y1: 45 } },
      { text: 'a', confidence: 85.0, bbox: { x0: 280, y0: 20, x1: 295, y1: 45 } },
      { text: 'file', confidence: 93.0, bbox: { x0: 305, y0: 20, x1: 350, y1: 45 } },
      { text: 'Allow', confidence: 97.0, bbox: { x0: 50, y0: 100, x1: 120, y1: 130 } },
      { text: 'Keep', confidence: 96.0, bbox: { x0: 160, y0: 100, x1: 220, y1: 130 } },
      { text: 'Deny', confidence: 89.0, bbox: { x0: 260, y0: 100, x1: 315, y1: 130 } },
    ],
    lines: [
      { text: 'Copilot wants to create a file', confidence: 90.3, bbox: { x0: 20, y0: 20, x1: 350, y1: 45 } },
      { text: 'Allow    Keep    Deny', confidence: 94.0, bbox: { x0: 50, y0: 100, x1: 315, y1: 130 } },
    ],
  },
};

/**
 * Similar words that could be confused
 */
export const similarWordsResult: TesseractResult = {
  data: {
    text: 'Allow Allow Allowed Allowing',
    confidence: 85.0,
    words: [
      { text: 'Allow', confidence: 70.0, bbox: { x0: 10, y0: 10, x1: 60, y1: 30 } },  // Misread 'Allow'
      { text: 'Allow', confidence: 95.0, bbox: { x0: 70, y0: 10, x1: 130, y1: 30 } },
      { text: 'Allowed', confidence: 88.0, bbox: { x0: 140, y0: 10, x1: 220, y1: 30 } },
      { text: 'Allowing', confidence: 86.0, bbox: { x0: 230, y0: 10, x1: 320, y1: 30 } },
    ],
    lines: [],
  },
};

/**
 * Mixed case text
 */
export const mixedCaseResult: TesseractResult = {
  data: {
    text: 'ALLOW allow Allow aLLoW',
    confidence: 88.0,
    words: [
      { text: 'ALLOW', confidence: 92.0, bbox: { x0: 10, y0: 10, x1: 70, y1: 30 } },
      { text: 'allow', confidence: 90.0, bbox: { x0: 80, y0: 10, x1: 135, y1: 30 } },
      { text: 'Allow', confidence: 94.0, bbox: { x0: 145, y0: 10, x1: 205, y1: 30 } },
      { text: 'aLLoW', confidence: 78.0, bbox: { x0: 215, y0: 10, x1: 275, y1: 30 } },
    ],
    lines: [],
  },
};

/**
 * Multiple instances of same text
 */
export const duplicateTextResult: TesseractResult = {
  data: {
    text: 'Allow Allow Allow',
    confidence: 93.0,
    words: [
      { text: 'Allow', confidence: 95.0, bbox: { x0: 10, y0: 10, x1: 70, y1: 30 } },
      { text: 'Allow', confidence: 94.0, bbox: { x0: 100, y0: 10, x1: 160, y1: 30 } },
      { text: 'Allow', confidence: 90.0, bbox: { x0: 190, y0: 10, x1: 250, y1: 30 } },
    ],
    lines: [],
  },
};

/**
 * Text with OCR errors (common misreads)
 */
export const ocrErrorsResult: TesseractResult = {
  data: {
    text: 'A11ow Al1ow AIlow',  // 1 instead of l, I instead of l
    confidence: 65.0,
    words: [
      { text: 'A11ow', confidence: 55.0, bbox: { x0: 10, y0: 10, x1: 70, y1: 30 } },
      { text: 'Al1ow', confidence: 60.0, bbox: { x0: 80, y0: 10, x1: 140, y1: 30 } },
      { text: 'AIlow', confidence: 58.0, bbox: { x0: 150, y0: 10, x1: 210, y1: 30 } },
    ],
    lines: [],
  },
};
```

### 4.3 Exact Match Tests

```typescript
describe('Exact Match', () => {
  it('should find exact text match', async () => {
    configureMockOcrResult(copilotDialogResult);
    
    const result = await engine.findText('Allow');
    
    expect(result.found).toBe(true);
    expect(result.text).toBe('Allow');
  });

  it('should return correct bounding box for match', async () => {
    configureMockOcrResult(copilotDialogResult);
    
    const result = await engine.findText('Allow');
    
    expect(result.bbox).toEqual({ x0: 50, y0: 100, x1: 120, y1: 130 });
  });

  it('should return click coordinates at center of match', async () => {
    configureMockOcrResult(copilotDialogResult);
    
    const result = await engine.findText('Allow');
    
    expect(result.clickX).toBe(85);  // (50 + 120) / 2
    expect(result.clickY).toBe(115); // (100 + 130) / 2
  });

  it('should find text anywhere on screen', async () => {
    configureMockOcrResult(copilotDialogResult);
    
    const result = await engine.findText('Copilot');
    
    expect(result.found).toBe(true);
    expect(result.bbox.y0).toBe(20); // Top of screen
  });

  it('should return confidence of matched word', async () => {
    configureMockOcrResult(copilotDialogResult);
    
    const result = await engine.findText('Allow');
    
    expect(result.confidence).toBe(97.0);
  });

  it('should return not found for non-existent text', async () => {
    configureMockOcrResult(copilotDialogResult);
    
    const result = await engine.findText('Submit');
    
    expect(result.found).toBe(false);
    expect(result.bbox).toBeNull();
    expect(result.clickX).toBeNull();
    expect(result.clickY).toBeNull();
  });
});
```

### 4.4 Case Sensitivity Tests

```typescript
describe('Case Sensitivity', () => {
  it('should be case-insensitive by default', async () => {
    configureMockOcrResult(mixedCaseResult);
    
    const result = await engine.findText('allow');
    
    expect(result.found).toBe(true);
  });

  it('should match uppercase search to lowercase text', async () => {
    configureMockOcrResult(mixedCaseResult);
    
    const result = await engine.findText('ALLOW');
    
    expect(result.found).toBe(true);
  });

  it('should respect caseSensitive option when true', async () => {
    configureMockOcrResult(mixedCaseResult);
    
    const result = await engine.findText('allow', { caseSensitive: true });
    
    expect(result.found).toBe(true);
    expect(result.text).toBe('allow');
    expect(result.bbox).toEqual({ x0: 80, y0: 10, x1: 135, y1: 30 });
  });

  it('should not match different case when caseSensitive is true', async () => {
    configureMockOcrResult(copilotDialogResult);
    
    const result = await engine.findText('allow', { caseSensitive: true });
    
    expect(result.found).toBe(false);
  });

  it('should find best confidence match when multiple case variants exist', async () => {
    configureMockOcrResult(mixedCaseResult);
    
    const result = await engine.findText('allow');
    
    // Should return highest confidence match (94% for 'Allow')
    expect(result.confidence).toBe(94.0);
  });
});
```

### 4.5 Multiple Matches Tests

```typescript
describe('Multiple Matches', () => {
  it('should return first match by default', async () => {
    configureMockOcrResult(duplicateTextResult);
    
    const result = await engine.findText('Allow');
    
    expect(result.found).toBe(true);
    expect(result.bbox.x0).toBe(10); // First instance
  });

  it('should return highest confidence match when option set', async () => {
    configureMockOcrResult(duplicateTextResult);
    
    const result = await engine.findText('Allow', { preferHighConfidence: true });
    
    expect(result.confidence).toBe(95.0);
    expect(result.bbox.x0).toBe(10); // First one has highest confidence
  });

  it('should find all matches with findAllText', async () => {
    configureMockOcrResult(duplicateTextResult);
    
    const results = await engine.findAllText('Allow');
    
    expect(results).toHaveLength(3);
    expect(results[0].bbox.x0).toBe(10);
    expect(results[1].bbox.x0).toBe(100);
    expect(results[2].bbox.x0).toBe(190);
  });

  it('should return empty array when no matches found', async () => {
    configureMockOcrResult(copilotDialogResult);
    
    const results = await engine.findAllText('NonExistent');
    
    expect(results).toHaveLength(0);
  });

  it('should filter by confidence threshold', async () => {
    configureMockOcrResult(duplicateTextResult);
    
    const results = await engine.findAllText('Allow', { minConfidence: 0.93 });
    
    expect(results).toHaveLength(2); // Only 95% and 94% match
  });
});
```

### 4.6 Partial Match Tests

```typescript
describe('Partial Matching', () => {
  it('should not match partial text by default', async () => {
    configureMockOcrResult(similarWordsResult);
    
    const result = await engine.findText('Allow');
    
    // Should match exact 'Allow', not 'Allowed' or 'Allowing'
    expect(result.found).toBe(true);
    expect(result.text).toBe('Allow');
  });

  it('should support contains matching', async () => {
    configureMockOcrResult(similarWordsResult);
    
    const result = await engine.findText('Allow', { matchMode: 'contains' });
    
    expect(result.found).toBe(true);
    // Could match 'Allow', 'Allowed', or 'Allowing'
  });

  it('should support startsWith matching', async () => {
    configureMockOcrResult(similarWordsResult);
    
    const results = await engine.findAllText('Allow', { matchMode: 'startsWith' });
    
    // Should match 'Allow', 'Allowed', 'Allowing' but not something like 'DisAllow'
    expect(results.length).toBeGreaterThanOrEqual(3);
  });

  it('should support endsWith matching', async () => {
    configureMockOcrResult(similarWordsResult);
    
    const results = await engine.findAllText('ing', { matchMode: 'endsWith' });
    
    expect(results).toHaveLength(1); // Only 'Allowing'
  });

  it('should support regex matching', async () => {
    configureMockOcrResult(similarWordsResult);
    
    const results = await engine.findAllText(/Allow(ed|ing)?/, { matchMode: 'regex' });
    
    expect(results.length).toBeGreaterThanOrEqual(3);
  });
});
```

### 4.7 Fuzzy Matching Tests

```typescript
describe('Fuzzy Matching', () => {
  it('should find text with minor OCR errors when fuzzy enabled', async () => {
    configureMockOcrResult(ocrErrorsResult);
    
    const result = await engine.findText('Allow', { fuzzyMatch: true });
    
    expect(result.found).toBe(true);
  });

  it('should not match OCR errors without fuzzy matching', async () => {
    configureMockOcrResult(ocrErrorsResult);
    
    const result = await engine.findText('Allow', { fuzzyMatch: false });
    
    expect(result.found).toBe(false);
  });

  it('should respect fuzzy threshold', async () => {
    configureMockOcrResult(ocrErrorsResult);
    
    const result = await engine.findText('Allow', { 
      fuzzyMatch: true, 
      fuzzyThreshold: 0.9 // Strict
    });
    
    // 'A11ow' vs 'Allow' = 3/5 chars match = 60%, below 90%
    expect(result.found).toBe(false);
  });

  it('should find close matches with lenient threshold', async () => {
    configureMockOcrResult(ocrErrorsResult);
    
    const result = await engine.findText('Allow', { 
      fuzzyMatch: true, 
      fuzzyThreshold: 0.6 
    });
    
    expect(result.found).toBe(true);
  });

  it('should prefer exact match over fuzzy match', async () => {
    // Mix of exact and fuzzy matches
    const mixedResult = {
      data: {
        text: 'A11ow Allow',
        confidence: 85.0,
        words: [
          { text: 'A11ow', confidence: 80.0, bbox: { x0: 10, y0: 10, x1: 70, y1: 30 } },
          { text: 'Allow', confidence: 75.0, bbox: { x0: 80, y0: 10, x1: 140, y1: 30 } },
        ],
        lines: [],
      },
    };
    configureMockOcrResult(mixedResult);
    
    const result = await engine.findText('Allow', { fuzzyMatch: true });
    
    // Should prefer exact match even with lower confidence
    expect(result.text).toBe('Allow');
    expect(result.bbox.x0).toBe(80);
  });
});
```

### 4.8 Edge Cases Tests

```typescript
describe('Edge Cases', () => {
  it('should handle empty search string', async () => {
    configureMockOcrResult(copilotDialogResult);
    
    await expect(engine.findText('')).rejects.toThrow(
      'Search text required'
    );
  });

  it('should handle whitespace-only search', async () => {
    configureMockOcrResult(copilotDialogResult);
    
    await expect(engine.findText('   ')).rejects.toThrow(
      'Search text required'
    );
  });

  it('should handle single character search', async () => {
    configureMockOcrResult(copilotDialogResult);
    
    const result = await engine.findText('a', { matchMode: 'contains' });
    
    // Should find 'a' in various words
    expect(result.found).toBe(true);
  });

  it('should handle very long search string', async () => {
    configureMockOcrResult(copilotDialogResult);
    
    const longText = 'Copilot wants to create a file';
    const result = await engine.findText(longText);
    
    // May need line-level matching for long strings
    expect(result.found).toBe(true);
  });

  it('should handle special regex characters in search', async () => {
    const specialResult = {
      data: {
        text: 'Price: $99.99',
        confidence: 85.0,
        words: [
          { text: '$99.99', confidence: 85.0, bbox: { x0: 10, y0: 10, x1: 80, y1: 30 } },
        ],
        lines: [],
      },
    };
    configureMockOcrResult(specialResult);
    
    // $ and . are regex special chars
    const result = await engine.findText('$99.99');
    
    expect(result.found).toBe(true);
  });

  it('should handle no OCR results', async () => {
    configureMockOcrResult({
      data: { text: '', confidence: 0, words: [], lines: [] }
    });
    
    const result = await engine.findText('Allow');
    
    expect(result.found).toBe(false);
  });

  it('should timeout on long search', async () => {
    configureMockOcrResult(copilotDialogResult);
    
    // Simulate slow search (implementation dependent)
    const result = await engine.findText('Allow', { timeout: 5000 });
    
    expect(result.found).toBe(true);
  });
});
```

### 4.9 Copilot-Specific Tests

```typescript
describe('Copilot Button Detection', () => {
  it('should find Allow button in Copilot dialog', async () => {
    configureMockOcrResult(copilotDialogResult);
    
    const result = await engine.findText('Allow');
    
    expect(result.found).toBe(true);
    expect(result.confidence).toBeGreaterThan(90);
  });

  it('should find Keep button in Copilot dialog', async () => {
    configureMockOcrResult(copilotDialogResult);
    
    const result = await engine.findText('Keep');
    
    expect(result.found).toBe(true);
    expect(result.clickX).toBe(190); // Center of Keep button
  });

  it('should differentiate Allow from other buttons', async () => {
    configureMockOcrResult(copilotDialogResult);
    
    const allow = await engine.findText('Allow');
    const deny = await engine.findText('Deny');
    
    expect(allow.bbox.x0).not.toBe(deny.bbox.x0);
    expect(allow.clickX).toBeLessThan(deny.clickX);
  });

  it('should find buttons with high confidence', async () => {
    configureMockOcrResult(copilotDialogResult);
    
    const allow = await engine.findText('Allow');
    const keep = await engine.findText('Keep');
    
    expect(allow.confidence).toBeGreaterThan(95);
    expect(keep.confidence).toBeGreaterThan(95);
  });
});
```

---

## 5. TEST EXECUTION

### 5.1 Running Tests

```bash
# Run only findText tests
npm run test -- visionEngine.findText.test.ts

# Run with coverage
npm run test -- visionEngine.findText.test.ts --coverage

# Run all VisionEngine tests
npm run test -- visionEngine
```

### 5.2 Expected Output

```
 ✓ VisionEngine FindText Accuracy
   ✓ Exact Match (6 tests)
   ✓ Case Sensitivity (5 tests)
   ✓ Multiple Matches (5 tests)
   ✓ Partial Matching (5 tests)
   ✓ Fuzzy Matching (5 tests)
   ✓ Edge Cases (7 tests)
   ✓ Copilot Button Detection (4 tests)

Test Files  1 passed (1)
Tests       37 passed (37)
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** Exact match tests pass
- [ ] **AC-2:** Click coordinates calculated correctly
- [ ] **AC-3:** Case sensitivity options work
- [ ] **AC-4:** Multiple matches handled correctly
- [ ] **AC-5:** Partial matching modes work
- [ ] **AC-6:** Fuzzy matching finds OCR errors
- [ ] **AC-7:** Edge cases handled gracefully
- [ ] **AC-8:** Copilot buttons detected reliably
- [ ] **AC-9:** Confidence filtering works
- [ ] **AC-10:** Test coverage > 90% for findText

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Performance** - Search should be fast (<100ms)
2. **Accuracy** - Prefer precision over recall
3. **Copilot focus** - Must work for Allow/Keep buttons

### Patterns to Follow

1. **Exact match first** - Always try exact before fuzzy
2. **Highest confidence** - Return best match when multiple
3. **Clear not-found** - Explicit false when not found

### Edge Cases

1. **Similar words** - Don't confuse Allow with Allowed
2. **OCR errors** - Handle common misreads (l/1, O/0)
3. **Multiple instances** - Consistent ordering

---

## 8. VERIFICATION COMMANDS

```bash
# Verify test file creation
ls -la src/lib/__tests__/visionEngine.findText.test.ts

# Verify fixtures updated
grep -n "copilotDialogResult" src/lib/__tests__/fixtures/ocr-results.fixture.ts

# Run tests
npm run test -- visionEngine.findText.test.ts

# Check coverage
npm run test -- visionEngine.findText.test.ts --coverage
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Remove test file
rm src/lib/__tests__/visionEngine.findText.test.ts

# Revert fixture changes
git checkout src/lib/__tests__/fixtures/ocr-results.fixture.ts
```

---

## 10. REFERENCES

- ENG-006: FindText Function
- ENG-007: FindAllText Function
- TST-003: OCR Recognition Tests
- Feature Spec: `/future-spec/03_feature-specs.md` Section 2

---

*End of Specification TST-004*
