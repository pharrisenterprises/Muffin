# TST-003: OCR Recognition Tests

> **Build Card:** TST-003  
> **Category:** Testing & Validation  
> **Dependencies:** ENG-004, TST-001, TST-002  
> **Risk Level:** High  
> **Estimated Lines:** 280-330

---

## 1. PURPOSE

Create comprehensive unit tests for the VisionEngine OCR recognition functionality. These tests verify that Tesseract.js correctly processes screenshots, extracts text with accurate bounding boxes, handles various text scenarios (fonts, sizes, colors), and returns properly structured results with confidence scores. Critical for ensuring Vision-based text detection works reliably.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| VisionEngine Class | `src/lib/visionEngine.ts` | recognizeText() method |
| TextResult Interface | `src/types/vision.types.ts` | OCR result structure |
| ENG-004 Spec | `build-instructions/masterplan/03-engine/ENG-004_ocr-text-recognition.md` | OCR requirements |
| TST-001/TST-002 | Testing specs | Mock patterns |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/lib/__tests__/visionEngine.ocr.test.ts` | CREATE | +230 |
| `src/lib/__tests__/mocks/tesseract.mock.ts` | MODIFY | +40 |
| `src/lib/__tests__/fixtures/ocr-results.fixture.ts` | CREATE | +80 |

### Artifacts

- OCR recognition test suite
- Enhanced Tesseract mock with configurable results
- OCR result fixtures for various scenarios

---

## 4. DETAILED SPECIFICATION

### 4.1 Test File Structure

```typescript
// src/lib/__tests__/visionEngine.ocr.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VisionEngine } from '../visionEngine';
import { createMockTesseract, configureMockOcrResult } from './mocks/tesseract.mock';
import { createMockChrome, mockScreenshotDataUrl } from './mocks/chrome.mock';
import {
  simpleTextResult,
  multiLineTextResult,
  buttonTextResult,
  lowConfidenceResult,
  emptyResult,
} from './fixtures/ocr-results.fixture';

// Mock dependencies
vi.stubGlobal('chrome', createMockChrome());
vi.mock('tesseract.js', () => createMockTesseract());

describe('VisionEngine OCR Recognition', () => {
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

### 4.2 OCR Result Fixtures

```typescript
// src/lib/__tests__/fixtures/ocr-results.fixture.ts

import { TesseractResult, Word } from '../../types/tesseract.types';

/**
 * Simple single-line text result
 */
export const simpleTextResult: TesseractResult = {
  data: {
    text: 'Allow',
    confidence: 95.5,
    words: [
      {
        text: 'Allow',
        confidence: 95.5,
        bbox: { x0: 100, y0: 200, x1: 180, y1: 230 },
        baseline: { x0: 100, y0: 228, x1: 180, y1: 228 },
      },
    ],
    lines: [
      {
        text: 'Allow',
        confidence: 95.5,
        bbox: { x0: 100, y0: 200, x1: 180, y1: 230 },
        words: [{ text: 'Allow', confidence: 95.5 }],
      },
    ],
  },
};

/**
 * Multi-line text with multiple words
 */
export const multiLineTextResult: TesseractResult = {
  data: {
    text: 'Click Allow to continue\nOr click Keep to save',
    confidence: 88.2,
    words: [
      { text: 'Click', confidence: 92.0, bbox: { x0: 10, y0: 10, x1: 60, y1: 30 } },
      { text: 'Allow', confidence: 96.5, bbox: { x0: 70, y0: 10, x1: 130, y1: 30 } },
      { text: 'to', confidence: 85.0, bbox: { x0: 140, y0: 10, x1: 160, y1: 30 } },
      { text: 'continue', confidence: 89.0, bbox: { x0: 170, y0: 10, x1: 250, y1: 30 } },
      { text: 'Or', confidence: 80.0, bbox: { x0: 10, y0: 50, x1: 35, y1: 70 } },
      { text: 'click', confidence: 91.0, bbox: { x0: 45, y0: 50, x1: 90, y1: 70 } },
      { text: 'Keep', confidence: 94.5, bbox: { x0: 100, y0: 50, x1: 150, y1: 70 } },
      { text: 'to', confidence: 84.0, bbox: { x0: 160, y0: 50, x1: 180, y1: 70 } },
      { text: 'save', confidence: 88.0, bbox: { x0: 190, y0: 50, x1: 235, y1: 70 } },
    ],
    lines: [
      { text: 'Click Allow to continue', confidence: 90.6, bbox: { x0: 10, y0: 10, x1: 250, y1: 30 } },
      { text: 'Or click Keep to save', confidence: 85.8, bbox: { x0: 10, y0: 50, x1: 235, y1: 70 } },
    ],
  },
};

/**
 * Button-style text (common in Copilot)
 */
export const buttonTextResult: TesseractResult = {
  data: {
    text: 'Allow  Keep  Deny',
    confidence: 93.0,
    words: [
      { text: 'Allow', confidence: 97.0, bbox: { x0: 50, y0: 100, x1: 120, y1: 130 } },
      { text: 'Keep', confidence: 95.0, bbox: { x0: 150, y0: 100, x1: 210, y1: 130 } },
      { text: 'Deny', confidence: 87.0, bbox: { x0: 240, y0: 100, x1: 295, y1: 130 } },
    ],
    lines: [
      { text: 'Allow  Keep  Deny', confidence: 93.0, bbox: { x0: 50, y0: 100, x1: 295, y1: 130 } },
    ],
  },
};

/**
 * Low confidence result (poor image quality)
 */
export const lowConfidenceResult: TesseractResult = {
  data: {
    text: 'A11ow',  // Misread 'l' as '1'
    confidence: 45.0,
    words: [
      { text: 'A11ow', confidence: 45.0, bbox: { x0: 100, y0: 200, x1: 180, y1: 230 } },
    ],
    lines: [
      { text: 'A11ow', confidence: 45.0, bbox: { x0: 100, y0: 200, x1: 180, y1: 230 } },
    ],
  },
};

/**
 * Empty result (no text found)
 */
export const emptyResult: TesseractResult = {
  data: {
    text: '',
    confidence: 0,
    words: [],
    lines: [],
  },
};

/**
 * Special characters result
 */
export const specialCharsResult: TesseractResult = {
  data: {
    text: 'Price: $99.99 (50% off!)',
    confidence: 82.0,
    words: [
      { text: 'Price:', confidence: 88.0, bbox: { x0: 10, y0: 10, x1: 70, y1: 30 } },
      { text: '$99.99', confidence: 79.0, bbox: { x0: 80, y0: 10, x1: 150, y1: 30 } },
      { text: '(50%', confidence: 75.0, bbox: { x0: 160, y0: 10, x1: 210, y1: 30 } },
      { text: 'off!)', confidence: 80.0, bbox: { x0: 220, y0: 10, x1: 270, y1: 30 } },
    ],
    lines: [
      { text: 'Price: $99.99 (50% off!)', confidence: 82.0, bbox: { x0: 10, y0: 10, x1: 270, y1: 30 } },
    ],
  },
};
```

### 4.3 Enhanced Tesseract Mock

```typescript
// Add to src/lib/__tests__/mocks/tesseract.mock.ts

let currentMockResult = simpleTextResult;

export function configureMockOcrResult(result: TesseractResult) {
  currentMockResult = result;
}

export function createMockTesseract() {
  const mockWorker = {
    recognize: vi.fn().mockImplementation((image) => {
      return Promise.resolve(currentMockResult);
    }),
    terminate: vi.fn().mockResolvedValue(undefined),
    load: vi.fn().mockResolvedValue(undefined),
    loadLanguage: vi.fn().mockResolvedValue(undefined),
    initialize: vi.fn().mockResolvedValue(undefined),
    setParameters: vi.fn().mockResolvedValue(undefined),
  };

  return {
    createWorker: vi.fn().mockResolvedValue(mockWorker),
    PSM: { AUTO: 3, SINGLE_BLOCK: 6, SINGLE_LINE: 7 },
    OEM: { LSTM_ONLY: 1 },
  };
}
```

### 4.4 Basic Recognition Tests

```typescript
describe('recognizeText()', () => {
  it('should recognize text from screenshot', async () => {
    configureMockOcrResult(simpleTextResult);
    
    const result = await engine.recognizeText(mockScreenshotDataUrl);
    
    expect(result).toBeDefined();
    expect(result.text).toBe('Allow');
  });

  it('should return words with bounding boxes', async () => {
    configureMockOcrResult(simpleTextResult);
    
    const result = await engine.recognizeText(mockScreenshotDataUrl);
    
    expect(result.words).toHaveLength(1);
    expect(result.words[0]).toEqual({
      text: 'Allow',
      confidence: 95.5,
      bbox: { x0: 100, y0: 200, x1: 180, y1: 230 },
    });
  });

  it('should return overall confidence score', async () => {
    configureMockOcrResult(simpleTextResult);
    
    const result = await engine.recognizeText(mockScreenshotDataUrl);
    
    expect(result.confidence).toBe(95.5);
  });

  it('should handle multi-line text', async () => {
    configureMockOcrResult(multiLineTextResult);
    
    const result = await engine.recognizeText(mockScreenshotDataUrl);
    
    expect(result.text).toContain('Allow');
    expect(result.text).toContain('Keep');
    expect(result.words.length).toBeGreaterThan(1);
  });

  it('should return lines array', async () => {
    configureMockOcrResult(multiLineTextResult);
    
    const result = await engine.recognizeText(mockScreenshotDataUrl);
    
    expect(result.lines).toHaveLength(2);
    expect(result.lines[0].text).toBe('Click Allow to continue');
  });
});
```

### 4.5 Confidence Filtering Tests

```typescript
describe('Confidence Filtering', () => {
  it('should filter words below confidence threshold', async () => {
    configureMockOcrResult(lowConfidenceResult);
    engine = new VisionEngine({ confidenceThreshold: 0.6 });
    await engine.initialize();
    
    const result = await engine.recognizeText(mockScreenshotDataUrl);
    
    // Low confidence word should be filtered
    expect(result.words).toHaveLength(0);
  });

  it('should include words above confidence threshold', async () => {
    configureMockOcrResult(simpleTextResult);
    engine = new VisionEngine({ confidenceThreshold: 0.9 });
    await engine.initialize();
    
    const result = await engine.recognizeText(mockScreenshotDataUrl);
    
    // 95.5% > 90% threshold
    expect(result.words).toHaveLength(1);
  });

  it('should respect custom confidence threshold', async () => {
    configureMockOcrResult(multiLineTextResult);
    engine = new VisionEngine({ confidenceThreshold: 0.85 });
    await engine.initialize();
    
    const result = await engine.recognizeText(mockScreenshotDataUrl);
    
    // Only words with confidence >= 85% should be included
    result.words.forEach(word => {
      expect(word.confidence).toBeGreaterThanOrEqual(85);
    });
  });

  it('should include all words when threshold is 0', async () => {
    configureMockOcrResult(lowConfidenceResult);
    engine = new VisionEngine({ confidenceThreshold: 0 });
    await engine.initialize();
    
    const result = await engine.recognizeText(mockScreenshotDataUrl);
    
    expect(result.words).toHaveLength(1);
  });
});
```

### 4.6 Bounding Box Tests

```typescript
describe('Bounding Boxes', () => {
  it('should return correct bounding box coordinates', async () => {
    configureMockOcrResult(simpleTextResult);
    
    const result = await engine.recognizeText(mockScreenshotDataUrl);
    const bbox = result.words[0].bbox;
    
    expect(bbox.x0).toBe(100);
    expect(bbox.y0).toBe(200);
    expect(bbox.x1).toBe(180);
    expect(bbox.y1).toBe(230);
  });

  it('should calculate center point correctly', async () => {
    configureMockOcrResult(simpleTextResult);
    
    const result = await engine.recognizeText(mockScreenshotDataUrl);
    const center = result.words[0].center;
    
    expect(center.x).toBe(140); // (100 + 180) / 2
    expect(center.y).toBe(215); // (200 + 230) / 2
  });

  it('should calculate dimensions correctly', async () => {
    configureMockOcrResult(simpleTextResult);
    
    const result = await engine.recognizeText(mockScreenshotDataUrl);
    const word = result.words[0];
    
    expect(word.width).toBe(80);  // 180 - 100
    expect(word.height).toBe(30); // 230 - 200
  });

  it('should handle multiple non-overlapping boxes', async () => {
    configureMockOcrResult(buttonTextResult);
    
    const result = await engine.recognizeText(mockScreenshotDataUrl);
    
    expect(result.words).toHaveLength(3);
    
    // Boxes should not overlap
    const [allow, keep, deny] = result.words;
    expect(allow.bbox.x1).toBeLessThan(keep.bbox.x0);
    expect(keep.bbox.x1).toBeLessThan(deny.bbox.x0);
  });
});
```

### 4.7 Error Handling Tests

```typescript
describe('Error Handling', () => {
  it('should throw error if not initialized', async () => {
    const uninitializedEngine = new VisionEngine();
    
    await expect(
      uninitializedEngine.recognizeText(mockScreenshotDataUrl)
    ).rejects.toThrow('VisionEngine not initialized');
  });

  it('should throw error for invalid image data', async () => {
    await expect(
      engine.recognizeText('not-valid-image-data')
    ).rejects.toThrow('Invalid image data');
  });

  it('should throw error for empty image data', async () => {
    await expect(engine.recognizeText('')).rejects.toThrow(
      'Image data required'
    );
  });

  it('should handle Tesseract recognition failure', async () => {
    vi.mocked(engine['worker'].recognize).mockRejectedValueOnce(
      new Error('Recognition failed')
    );
    
    await expect(
      engine.recognizeText(mockScreenshotDataUrl)
    ).rejects.toThrow('Recognition failed');
  });

  it('should return empty result for no text found', async () => {
    configureMockOcrResult(emptyResult);
    
    const result = await engine.recognizeText(mockScreenshotDataUrl);
    
    expect(result.text).toBe('');
    expect(result.words).toHaveLength(0);
    expect(result.confidence).toBe(0);
  });
});
```

### 4.8 Special Cases Tests

```typescript
describe('Special Cases', () => {
  it('should handle special characters', async () => {
    configureMockOcrResult(specialCharsResult);
    
    const result = await engine.recognizeText(mockScreenshotDataUrl);
    
    expect(result.text).toContain('$99.99');
    expect(result.text).toContain('50%');
  });

  it('should preserve whitespace in text', async () => {
    configureMockOcrResult(buttonTextResult);
    
    const result = await engine.recognizeText(mockScreenshotDataUrl);
    
    // Raw text should have spaces between words
    expect(result.text).toMatch(/Allow\s+Keep\s+Deny/);
  });

  it('should handle unicode characters', async () => {
    const unicodeResult = {
      data: {
        text: 'Café résumé',
        confidence: 85.0,
        words: [
          { text: 'Café', confidence: 85.0, bbox: { x0: 10, y0: 10, x1: 60, y1: 30 } },
          { text: 'résumé', confidence: 85.0, bbox: { x0: 70, y0: 10, x1: 140, y1: 30 } },
        ],
        lines: [],
      },
    };
    configureMockOcrResult(unicodeResult);
    
    const result = await engine.recognizeText(mockScreenshotDataUrl);
    
    expect(result.text).toContain('Café');
    expect(result.text).toContain('résumé');
  });

  it('should handle very long text', async () => {
    const longText = 'Word '.repeat(100).trim();
    const longResult = {
      data: {
        text: longText,
        confidence: 80.0,
        words: Array(100).fill(null).map((_, i) => ({
          text: 'Word',
          confidence: 80.0,
          bbox: { x0: i * 50, y0: 10, x1: i * 50 + 40, y1: 30 },
        })),
        lines: [],
      },
    };
    configureMockOcrResult(longResult);
    
    const result = await engine.recognizeText(mockScreenshotDataUrl);
    
    expect(result.words).toHaveLength(100);
  });
});
```

---

## 5. TEST EXECUTION

### 5.1 Running Tests

```bash
# Run only OCR tests
npm run test -- visionEngine.ocr.test.ts

# Run with coverage
npm run test -- visionEngine.ocr.test.ts --coverage

# Run all VisionEngine tests
npm run test -- visionEngine
```

### 5.2 Expected Output

```
 ✓ VisionEngine OCR Recognition
   ✓ recognizeText()
     ✓ should recognize text from screenshot
     ✓ should return words with bounding boxes
     ✓ should return overall confidence score
     ✓ should handle multi-line text
     ✓ should return lines array
   ✓ Confidence Filtering
     ✓ should filter words below confidence threshold
     ✓ should include words above confidence threshold
     ✓ should respect custom confidence threshold
     ✓ should include all words when threshold is 0
   ✓ Bounding Boxes
     ✓ should return correct bounding box coordinates
     ✓ should calculate center point correctly
     ✓ should calculate dimensions correctly
     ✓ should handle multiple non-overlapping boxes
   ✓ Error Handling
     ✓ should throw error if not initialized
     ✓ should throw error for invalid image data
     ✓ should throw error for empty image data
     ✓ should handle Tesseract recognition failure
     ✓ should return empty result for no text found
   ✓ Special Cases
     ✓ should handle special characters
     ✓ should preserve whitespace in text
     ✓ should handle unicode characters
     ✓ should handle very long text

Test Files  1 passed (1)
Tests       22 passed (22)
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** Basic recognition tests pass
- [ ] **AC-2:** Words returned with correct bounding boxes
- [ ] **AC-3:** Confidence scores returned correctly
- [ ] **AC-4:** Confidence filtering works as expected
- [ ] **AC-5:** Multi-line text handled correctly
- [ ] **AC-6:** Error handling tests pass
- [ ] **AC-7:** Special characters handled
- [ ] **AC-8:** Unicode text supported
- [ ] **AC-9:** Fixtures provide realistic test data
- [ ] **AC-10:** Test coverage > 90% for recognizeText

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Mock realism** - Fixtures should match real Tesseract output
2. **Confidence normalization** - Tesseract returns 0-100, may need 0-1
3. **Coordinate system** - Ensure bbox coordinates are consistent

### Patterns to Follow

1. **Configurable mock** - Allow setting expected result per test
2. **Fixture isolation** - Each scenario in separate fixture
3. **Edge case coverage** - Test empty, low confidence, special chars

### Edge Cases

1. **No text detected** - Empty words array
2. **Single character** - Valid result
3. **Overlapping text** - Multiple words same location
4. **Rotated text** - May have unusual bbox

---

## 8. VERIFICATION COMMANDS

```bash
# Verify test file creation
ls -la src/lib/__tests__/visionEngine.ocr.test.ts

# Verify fixtures
ls -la src/lib/__tests__/fixtures/ocr-results.fixture.ts

# Run tests
npm run test -- visionEngine.ocr.test.ts

# Check coverage
npm run test -- visionEngine.ocr.test.ts --coverage
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Remove test file
rm src/lib/__tests__/visionEngine.ocr.test.ts

# Remove fixtures
rm src/lib/__tests__/fixtures/ocr-results.fixture.ts
rmdir src/lib/__tests__/fixtures 2>/dev/null || true
```

---

## 10. REFERENCES

- ENG-004: OCR Text Recognition
- TST-001: VisionEngine Init Tests
- TST-002: Screenshot Capture Tests
- Tesseract.js Output Format: https://github.com/naptha/tesseract.js

---

*End of Specification TST-003*
