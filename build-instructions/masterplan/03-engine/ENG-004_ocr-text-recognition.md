# ENG-004: OCR TEXT RECOGNITION SPECIFICATION

> **Build Card:** ENG-004  
> **Category:** Engine / Core  
> **Dependencies:** ENG-002 (Worker init), ENG-003 (Screenshot capture)  
> **Risk Level:** Medium  
> **Estimated Lines:** ~450

---

## 1. PURPOSE

This specification implements the core OCR text recognition functionality for the VisionEngine. This is the heart of the Vision system, responsible for:

1. **Text recognition** - Extract text from screenshots using Tesseract.js
2. **Result transformation** - Convert Tesseract output to TextResult format
3. **Confidence filtering** - Filter results by confidence threshold
4. **Bounding box calculation** - Compute accurate element positions
5. **Performance optimization** - Efficient OCR processing

This implements the `recognizeText()` and `scanViewport()` method stubs from ENG-001.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| ENG-001 | VisionEngine shell | Method signatures |
| ENG-002 | Worker initialization | Worker access |
| ENG-003 | Screenshot capture | Image input |
| FND-006 | TextResult interface | Output format |
| Tesseract.js Docs | npm package | recognize() API |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `src/lib/visionEngine.ts` | MODIFY | Implement OCR methods |
| `src/lib/ocrProcessor.ts` | CREATE | OCR processing utilities |

### Implementation Details

| Method | Status | Description |
|--------|--------|-------------|
| `recognizeText()` | IMPLEMENT | Full implementation |
| `scanViewport()` | IMPLEMENT | Full implementation |
| `processOcrResult()` | ADD | Transform Tesseract output |

---

## 4. DETAILED SPECIFICATION

### 4.1 OCR Processor Utilities

Create `src/lib/ocrProcessor.ts`:

```typescript
/**
 * @fileoverview OCR processing utilities
 * @module lib/ocrProcessor
 * 
 * Provides utilities for processing Tesseract.js OCR results
 * and transforming them into the application's TextResult format.
 */

import type { TextResult } from '@/types';
import type { RecognizeResult, Word, Line, Block } from 'tesseract.js';

/**
 * Options for processing OCR results
 */
export interface OcrProcessingOptions {
  /** Minimum confidence threshold (0-100) */
  confidenceThreshold: number;
  /** Device pixel ratio for coordinate scaling */
  devicePixelRatio?: number;
  /** Merge words into lines */
  mergeWords?: boolean;
  /** Filter out single-character results */
  filterSingleChars?: boolean;
  /** Minimum word length */
  minWordLength?: number;
}

/**
 * Raw word data from Tesseract
 */
interface TesseractWord {
  text: string;
  confidence: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
}

/**
 * Transforms a Tesseract word into a TextResult
 * @param word - Tesseract word object
 * @param dpr - Device pixel ratio for scaling
 * @returns TextResult object
 */
export function wordToTextResult(
  word: TesseractWord,
  dpr: number = 1
): TextResult {
  const x = word.bbox.x0 / dpr;
  const y = word.bbox.y0 / dpr;
  const width = (word.bbox.x1 - word.bbox.x0) / dpr;
  const height = (word.bbox.y1 - word.bbox.y0) / dpr;

  return {
    text: word.text,
    confidence: word.confidence,
    bounds: {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(width),
      height: Math.round(height),
      centerX: Math.round(x + width / 2),
      centerY: Math.round(y + height / 2),
    },
  };
}

/**
 * Processes raw Tesseract recognition results into TextResults
 * @param result - Raw Tesseract RecognizeResult
 * @param options - Processing options
 * @returns Array of TextResult objects
 */
export function processRecognizeResult(
  result: RecognizeResult,
  options: OcrProcessingOptions
): TextResult[] {
  const {
    confidenceThreshold,
    devicePixelRatio = 1,
    mergeWords = false,
    filterSingleChars = true,
    minWordLength = 1,
  } = options;

  const textResults: TextResult[] = [];

  // Access words from the result data
  const data = result.data;
  
  if (!data || !data.words) {
    console.warn('[OcrProcessor] No words in OCR result');
    return [];
  }

  if (mergeWords) {
    // Process by lines instead of individual words
    return processLines(data.lines || [], options);
  }

  // Process individual words
  for (const word of data.words) {
    // Skip low confidence results
    if (word.confidence < confidenceThreshold) {
      continue;
    }

    // Skip single characters if configured
    const text = word.text.trim();
    if (filterSingleChars && text.length === 1 && !/[a-zA-Z0-9]/.test(text)) {
      continue;
    }

    // Skip words below minimum length
    if (text.length < minWordLength) {
      continue;
    }

    // Skip empty text
    if (!text) {
      continue;
    }

    const textResult = wordToTextResult(
      {
        text,
        confidence: word.confidence,
        bbox: word.bbox,
      },
      devicePixelRatio
    );

    textResults.push(textResult);
  }

  return textResults;
}

/**
 * Processes lines instead of individual words
 * Useful for matching multi-word phrases
 * @param lines - Tesseract line objects
 * @param options - Processing options
 * @returns Array of TextResult objects
 */
function processLines(
  lines: Line[],
  options: OcrProcessingOptions
): TextResult[] {
  const {
    confidenceThreshold,
    devicePixelRatio = 1,
  } = options;

  const textResults: TextResult[] = [];

  for (const line of lines) {
    // Calculate average confidence for line
    const avgConfidence = line.confidence;
    
    if (avgConfidence < confidenceThreshold) {
      continue;
    }

    const text = line.text.trim();
    if (!text) {
      continue;
    }

    const textResult = wordToTextResult(
      {
        text,
        confidence: avgConfidence,
        bbox: line.bbox,
      },
      devicePixelRatio
    );

    textResults.push(textResult);
  }

  return textResults;
}

/**
 * Merges adjacent words that likely form a phrase
 * @param words - Array of TextResults
 * @param maxGap - Maximum horizontal gap to merge (pixels)
 * @returns Merged TextResults
 */
export function mergeAdjacentWords(
  words: TextResult[],
  maxGap: number = 20
): TextResult[] {
  if (words.length === 0) return [];

  // Sort by Y then X position
  const sorted = [...words].sort((a, b) => {
    const yDiff = a.bounds.y - b.bounds.y;
    if (Math.abs(yDiff) > 10) return yDiff;
    return a.bounds.x - b.bounds.x;
  });

  const merged: TextResult[] = [];
  let current = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];

    // Check if on same line (Y within tolerance)
    const sameLine = Math.abs(next.bounds.y - current.bounds.y) < 10;
    
    // Check if horizontally adjacent
    const gap = next.bounds.x - (current.bounds.x + current.bounds.width);
    const adjacent = gap >= 0 && gap <= maxGap;

    if (sameLine && adjacent) {
      // Merge words
      current = {
        text: current.text + ' ' + next.text,
        confidence: Math.min(current.confidence, next.confidence),
        bounds: {
          x: current.bounds.x,
          y: Math.min(current.bounds.y, next.bounds.y),
          width: (next.bounds.x + next.bounds.width) - current.bounds.x,
          height: Math.max(current.bounds.height, next.bounds.height),
          centerX: 0, // Recalculate below
          centerY: 0,
        },
      };
      // Recalculate center
      current.bounds.centerX = current.bounds.x + current.bounds.width / 2;
      current.bounds.centerY = current.bounds.y + current.bounds.height / 2;
    } else {
      // Save current and start new
      merged.push(current);
      current = next;
    }
  }

  // Don't forget the last one
  merged.push(current);

  return merged;
}

/**
 * Filters TextResults by confidence threshold
 * @param results - TextResults to filter
 * @param threshold - Minimum confidence
 * @returns Filtered results
 */
export function filterByConfidence(
  results: TextResult[],
  threshold: number
): TextResult[] {
  return results.filter((r) => r.confidence >= threshold);
}

/**
 * Sorts TextResults by position (top-to-bottom, left-to-right)
 * @param results - TextResults to sort
 * @returns Sorted results
 */
export function sortByPosition(results: TextResult[]): TextResult[] {
  return [...results].sort((a, b) => {
    const yDiff = a.bounds.y - b.bounds.y;
    if (Math.abs(yDiff) > 10) return yDiff;
    return a.bounds.x - b.bounds.x;
  });
}

/**
 * Sorts TextResults by confidence (highest first)
 * @param results - TextResults to sort
 * @returns Sorted results
 */
export function sortByConfidence(results: TextResult[]): TextResult[] {
  return [...results].sort((a, b) => b.confidence - a.confidence);
}

/**
 * Deduplicates overlapping TextResults
 * Keeps the highest confidence result when boxes overlap
 * @param results - TextResults to deduplicate
 * @param overlapThreshold - Overlap ratio to consider duplicate (0-1)
 * @returns Deduplicated results
 */
export function deduplicateResults(
  results: TextResult[],
  overlapThreshold: number = 0.5
): TextResult[] {
  const sorted = sortByConfidence(results);
  const kept: TextResult[] = [];

  for (const result of sorted) {
    const overlaps = kept.some((k) => 
      calculateOverlap(result.bounds, k.bounds) >= overlapThreshold
    );
    
    if (!overlaps) {
      kept.push(result);
    }
  }

  return kept;
}

/**
 * Calculates overlap ratio between two bounding boxes
 * @param a - First bounds
 * @param b - Second bounds
 * @returns Overlap ratio (0-1)
 */
function calculateOverlap(
  a: TextResult['bounds'],
  b: TextResult['bounds']
): number {
  const xOverlap = Math.max(0,
    Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
  );
  const yOverlap = Math.max(0,
    Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
  );
  
  const intersectionArea = xOverlap * yOverlap;
  const aArea = a.width * a.height;
  const bArea = b.width * b.height;
  const smallerArea = Math.min(aArea, bArea);
  
  return smallerArea > 0 ? intersectionArea / smallerArea : 0;
}

/**
 * Gets OCR statistics from results
 * @param results - TextResults to analyze
 * @returns Statistics object
 */
export function getOcrStats(results: TextResult[]): {
  totalWords: number;
  averageConfidence: number;
  minConfidence: number;
  maxConfidence: number;
  boundingArea: { minX: number; minY: number; maxX: number; maxY: number };
} {
  if (results.length === 0) {
    return {
      totalWords: 0,
      averageConfidence: 0,
      minConfidence: 0,
      maxConfidence: 0,
      boundingArea: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
    };
  }

  let totalConfidence = 0;
  let minConfidence = 100;
  let maxConfidence = 0;
  let minX = Infinity, minY = Infinity;
  let maxX = 0, maxY = 0;

  for (const result of results) {
    totalConfidence += result.confidence;
    minConfidence = Math.min(minConfidence, result.confidence);
    maxConfidence = Math.max(maxConfidence, result.confidence);
    
    minX = Math.min(minX, result.bounds.x);
    minY = Math.min(minY, result.bounds.y);
    maxX = Math.max(maxX, result.bounds.x + result.bounds.width);
    maxY = Math.max(maxY, result.bounds.y + result.bounds.height);
  }

  return {
    totalWords: results.length,
    averageConfidence: Math.round(totalConfidence / results.length),
    minConfidence,
    maxConfidence,
    boundingArea: { minX, minY, maxX, maxY },
  };
}
```

### 4.2 VisionEngine OCR Implementation

Update `src/lib/visionEngine.ts` - replace the `recognizeText()` and `scanViewport()` stubs:

```typescript
// Add imports
import {
  processRecognizeResult,
  filterByConfidence,
  sortByPosition,
  deduplicateResults,
  getOcrStats,
  type OcrProcessingOptions,
} from './ocrProcessor';

// Replace recognizeText() method
/**
 * Performs OCR on an image and returns text results
 * 
 * @param image - Base64 image data or ScreenshotResult
 * @param options - Recognition options
 * @returns Array of TextResult objects
 * @throws Error if OCR fails or engine not initialized
 * 
 * @example
 * ```typescript
 * const screenshot = await engine.captureScreenshot();
 * const results = await engine.recognizeText(screenshot);
 * 
 * for (const result of results) {
 *   console.log(`"${result.text}" at (${result.bounds.centerX}, ${result.bounds.centerY})`);
 * }
 * ```
 */
async recognizeText(
  image: string | ScreenshotResult,
  options: RecognizeOptions = {}
): Promise<TextResult[]> {
  this.ensureReady();

  const startTime = performance.now();
  
  try {
    // Extract image data
    let imageData: string;
    let dpr = 1;
    
    if (typeof image === 'string') {
      imageData = image;
    } else {
      imageData = image.data;
      // Try to get DPR from cached screenshot
      const cached = this.getLastScreenshot();
      if (cached) {
        // Approximate DPR based on image dimensions vs viewport
        // This is a fallback; actual DPR should come from capture
      }
    }

    // Ensure image has data URL prefix for Tesseract
    const dataUrl = imageData.startsWith('data:')
      ? imageData
      : `data:image/png;base64,${imageData}`;

    this.emit('ocrStart', { operation: 'recognize' });

    // Perform OCR
    const worker = this.getWorker();
    const result = await worker.recognize(dataUrl);

    // Process results
    const processingOptions: OcrProcessingOptions = {
      confidenceThreshold: options.confidenceThreshold ?? this.config.confidenceThreshold,
      devicePixelRatio: dpr,
      mergeWords: false,
      filterSingleChars: true,
      minWordLength: 1,
    };

    let textResults = processRecognizeResult(result, processingOptions);

    // Sort by position
    textResults = sortByPosition(textResults);

    // Deduplicate overlapping results
    textResults = deduplicateResults(textResults, 0.5);

    // Cache results
    this.cacheResults(textResults);
    this.incrementOperationCount();

    const duration = Math.round(performance.now() - startTime);
    const stats = getOcrStats(textResults);

    // Record operation for metrics
    visionStateStorage.recordOperation(duration);

    this.emit('ocrComplete', {
      operation: 'recognize',
      resultCount: textResults.length,
      duration,
      stats,
    });

    console.log('[VisionEngine] OCR complete', {
      words: textResults.length,
      duration: `${duration}ms`,
      avgConfidence: stats.averageConfidence,
    });

    return textResults;

  } catch (error) {
    const message = error instanceof Error ? error.message : 'OCR recognition failed';
    
    this.emit('ocrError', { operation: 'recognize', error: message });
    
    throw new Error(`OCR recognition failed: ${message}`);
  }
}

// Replace scanViewport() method
/**
 * Captures screenshot and performs OCR in one operation
 * This is the most common workflow for Vision operations
 * 
 * @param options - Recognition options
 * @returns Array of TextResult objects
 * @throws Error if capture or OCR fails
 * 
 * @example
 * ```typescript
 * const results = await engine.scanViewport();
 * const allowButton = results.find(r => r.text.includes('Allow'));
 * ```
 */
async scanViewport(options: RecognizeOptions = {}): Promise<TextResult[]> {
  this.ensureReady();

  const startTime = performance.now();

  try {
    this.emit('ocrStart', { operation: 'scanViewport' });

    // Check cache first if not skipping
    if (!options.skipCache) {
      const cachedResults = this.getLastResults();
      const cachedScreenshot = this.getLastScreenshot();
      
      // Use cache if screenshot is recent (within 500ms)
      if (cachedResults && cachedScreenshot && 
          Date.now() - cachedScreenshot.timestamp < 500) {
        console.log('[VisionEngine] Using cached scan results');
        return cachedResults;
      }
    }

    // Capture screenshot
    const screenshot = await this.captureScreenshot({
      region: options.region,
    });

    // Perform OCR
    const results = await this.recognizeText(screenshot, options);

    const duration = Math.round(performance.now() - startTime);

    this.emit('ocrComplete', {
      operation: 'scanViewport',
      resultCount: results.length,
      duration,
    });

    return results;

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Viewport scan failed';
    
    this.emit('ocrError', { operation: 'scanViewport', error: message });
    
    throw new Error(`Viewport scan failed: ${message}`);
  }
}

// Add helper method for quick text check
/**
 * Quickly checks if any of the search terms are visible
 * More efficient than full findText when you just need existence check
 * 
 * @param searchTerms - Terms to search for
 * @param options - Recognition options
 * @returns True if any term is found
 */
async isTextVisible(
  searchTerms: string[],
  options: RecognizeOptions = {}
): Promise<boolean> {
  const results = await this.scanViewport(options);
  
  const lowerTerms = searchTerms.map((t) => t.toLowerCase());
  
  return results.some((result) => {
    const lowerText = result.text.toLowerCase();
    return lowerTerms.some((term) => lowerText.includes(term));
  });
}

// Add method to get all text on screen
/**
 * Gets all visible text as a single string
 * Useful for debugging or full-page text extraction
 * 
 * @param options - Recognition options
 * @returns Concatenated text content
 */
async getAllText(options: RecognizeOptions = {}): Promise<string> {
  const results = await this.scanViewport(options);
  return results.map((r) => r.text).join(' ');
}
```

---

## 5. CODE EXAMPLES

### 5.1 Basic OCR Recognition

```typescript
import { VisionEngine } from '@/lib/visionEngine';

const engine = new VisionEngine();
await engine.initialize();

// Capture and recognize in one step
const results = await engine.scanViewport();

console.log(`Found ${results.length} text elements`);
for (const result of results) {
  console.log(`"${result.text}" (${result.confidence}%)`);
}
```

### 5.2 OCR with Custom Threshold

```typescript
// Only get high-confidence results
const results = await engine.scanViewport({
  confidenceThreshold: 80,
});

// Or recognize from existing screenshot
const screenshot = await engine.captureScreenshot();
const results2 = await engine.recognizeText(screenshot, {
  confidenceThreshold: 70,
});
```

### 5.3 Check for Text Visibility

```typescript
// Quick existence check
const hasAllowButton = await engine.isTextVisible(['Allow', 'Keep']);

if (hasAllowButton) {
  console.log('Approval button detected!');
}
```

### 5.4 Get All Page Text

```typescript
// Extract all visible text
const pageText = await engine.getAllText();
console.log('Page content:', pageText);
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** `recognizeText()` extracts text from images
- [ ] **AC-2:** TextResult objects have correct bounds
- [ ] **AC-3:** Confidence filtering works correctly
- [ ] **AC-4:** `scanViewport()` captures and recognizes
- [ ] **AC-5:** Results are sorted by position
- [ ] **AC-6:** Duplicate overlapping results are removed
- [ ] **AC-7:** Cache prevents redundant OCR
- [ ] **AC-8:** Events are emitted during OCR
- [ ] **AC-9:** Operation metrics are recorded
- [ ] **AC-10:** TypeScript compiles without errors

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Worker required** - OCR needs initialized worker
2. **Image format** - Must be valid data URL for Tesseract
3. **Performance** - OCR is CPU-intensive, avoid redundant calls

### Patterns to Follow

1. **Result caching** - Cache recent results
2. **Confidence filtering** - Apply threshold early
3. **Coordinate scaling** - Account for DPR

### Edge Cases

1. **No text found** - Return empty array
2. **Low confidence page** - Return what's available
3. **Large images** - May take longer to process

---

## 8. VERIFICATION COMMANDS

```bash
# Verify files exist
ls -la src/lib/ocrProcessor.ts

# Run type check
npm run type-check

# Build and test manually
npm run build
# Test OCR on various web pages
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Revert to stub implementations
# Replace recognizeText() and scanViewport() with original stubs

# Remove processor file
rm src/lib/ocrProcessor.ts
```

---

## 10. REFERENCES

- [Tesseract.js recognize()](https://github.com/naptha/tesseract.js/blob/master/docs/api.md#recognize)
- FND-006: TextResult Interface
- ENG-001: VisionEngine Class Shell
- ENG-003: Screenshot Capture

---

*End of Specification ENG-004*
