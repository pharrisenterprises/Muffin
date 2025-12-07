# types/vision.ts Content Specification

**File ID:** E4  
**File Path:** `src/types/vision.ts`  
**Status:** CREATE  
**Priority:** P1

---

## Purpose

Defines all TypeScript types and interfaces for the Vision subsystem including OCR operations, screenshot handling, and visual element location. Consolidates vision-related types used by VisionService (background), VisionCapture (content), and VisionStrategy (playback). Includes Tesseract.js result types, screenshot metadata, text matching types, and conditional click configurations. Ensures type safety for all vision-based operations.

---

## Dependencies

### Uses (imports from)
- `./recording`: BoundingRect

### Used By (exports to)
- `../background/services/VisionService`: All vision types
- `../contentScript/layers/VisionCapture`: Capture types
- `../background/services/strategies/VisionStrategy`: Strategy types

---

## Type Definitions

```typescript
import { BoundingRect } from './recording';

/**
 * ============================================================================
 * VISION SERVICE TYPES
 * ============================================================================
 */

/**
 * Vision service configuration
 */
export interface VisionServiceConfig {
  /** Minimum OCR confidence threshold (0-100, default: 60) */
  confidenceThreshold: number;
  /** OCR language (default: 'eng') */
  language: TesseractLanguage;
  /** OCR timeout in ms (default: 5000) */
  ocrTimeout: number;
  /** Cache TTL in ms (default: 2000) */
  cacheTtlMs: number;
  /** Maximum concurrent OCR operations (default: 2) */
  maxConcurrent: number;
  /** Whether to pre-initialize Tesseract (default: true) */
  preInitialize: boolean;
  /** Tesseract worker path */
  workerPath?: string;
  /** Core path for Tesseract WASM */
  corePath?: string;
  /** Logger configuration */
  logger?: TesseractLoggerConfig;
}

/**
 * Default vision service config
 */
export const DEFAULT_VISION_SERVICE_CONFIG: VisionServiceConfig = {
  confidenceThreshold: 60,
  language: 'eng',
  ocrTimeout: 5000,
  cacheTtlMs: 2000,
  maxConcurrent: 2,
  preInitialize: true
};

/**
 * Tesseract language codes
 */
export type TesseractLanguage =
  | 'eng'   // English
  | 'spa'   // Spanish
  | 'fra'   // French
  | 'deu'   // German
  | 'ita'   // Italian
  | 'por'   // Portuguese
  | 'nld'   // Dutch
  | 'pol'   // Polish
  | 'rus'   // Russian
  | 'jpn'   // Japanese
  | 'chi_sim'  // Chinese Simplified
  | 'chi_tra'  // Chinese Traditional
  | 'kor'   // Korean
  | 'ara'   // Arabic
  | string; // Allow other languages

/**
 * Tesseract logger configuration
 */
export interface TesseractLoggerConfig {
  /** Whether logging is enabled */
  enabled: boolean;
  /** Log level */
  level: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Vision service state
 */
export interface VisionServiceState {
  /** Whether Tesseract worker is initialized */
  initialized: boolean;
  /** Whether currently processing */
  processing: boolean;
  /** Current operation count */
  activeOperations: number;
  /** Last operation timestamp */
  lastOperation?: number;
  /** Total operations performed */
  totalOperations: number;
  /** Error count */
  errorCount: number;
  /** Average processing time (ms) */
  averageProcessingTime: number;
}

/**
 * ============================================================================
 * SCREENSHOT TYPES
 * ============================================================================
 */

/**
 * Captured screenshot
 */
export interface CapturedScreenshot {
  /** Base64-encoded image data */
  data: string;
  /** Image format */
  format: ScreenshotFormat;
  /** Image width in pixels */
  width: number;
  /** Image height in pixels */
  height: number;
  /** Device pixel ratio (for scaling) */
  scale: number;
  /** Capture timestamp */
  timestamp: number;
  /** Source tab ID */
  tabId: number;
  /** Screenshot ID for caching */
  id?: string;
}

/**
 * Screenshot format
 */
export type ScreenshotFormat = 'png' | 'jpeg' | 'webp';

/**
 * Screenshot options
 */
export interface ScreenshotOptions {
  /** Image format (default: 'png') */
  format?: ScreenshotFormat;
  /** Quality for jpeg/webp (0-100, default: 80) */
  quality?: number;
  /** Region to capture (full viewport if not specified) */
  region?: BoundingRect;
  /** Whether to capture full page (not just viewport) */
  fullPage?: boolean;
}

/**
 * ============================================================================
 * OCR RESULT TYPES
 * ============================================================================
 */

/**
 * Complete OCR result from Tesseract
 */
export interface OCRResult {
  /** Recognized text */
  text: string;
  /** Overall confidence (0-100) */
  confidence: number;
  /** Bounding box */
  bbox: BoundingRect;
  /** Individual words */
  words: OCRWord[];
  /** Line index in page */
  lineIndex: number;
  /** Block index in page */
  blockIndex?: number;
  /** Paragraph index in block */
  paragraphIndex?: number;
}

/**
 * OCR word result
 */
export interface OCRWord {
  /** Word text */
  text: string;
  /** Confidence (0-100) */
  confidence: number;
  /** Bounding box */
  bbox: BoundingRect;
  /** Character-level results (if available) */
  symbols?: OCRSymbol[];
  /** Word baseline */
  baseline?: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
  /** Whether word is from dictionary */
  isFromDictionary?: boolean;
  /** Whether word is numeric */
  isNumeric?: boolean;
}

/**
 * OCR symbol (character) result
 */
export interface OCRSymbol {
  /** Character */
  text: string;
  /** Confidence (0-100) */
  confidence: number;
  /** Bounding box */
  bbox: BoundingRect;
}

/**
 * OCR page result (complete Tesseract output)
 */
export interface OCRPageResult {
  /** Full page text */
  text: string;
  /** Page confidence */
  confidence: number;
  /** All blocks */
  blocks: OCRBlock[];
  /** Processing time in ms */
  processingTime: number;
  /** Screenshot ID */
  screenshotId?: string;
  /** Timestamp */
  timestamp: number;
}

/**
 * OCR block (region of page)
 */
export interface OCRBlock {
  /** Block text */
  text: string;
  /** Confidence */
  confidence: number;
  /** Bounding box */
  bbox: BoundingRect;
  /** Block type */
  blockType: OCRBlockType;
  /** Paragraphs in block */
  paragraphs: OCRParagraph[];
}

/**
 * OCR block types
 */
export type OCRBlockType =
  | 'text'
  | 'image'
  | 'separator'
  | 'table'
  | 'equation'
  | 'unknown';

/**
 * OCR paragraph
 */
export interface OCRParagraph {
  /** Paragraph text */
  text: string;
  /** Confidence */
  confidence: number;
  /** Bounding box */
  bbox: BoundingRect;
  /** Lines in paragraph */
  lines: OCRLine[];
}

/**
 * OCR line
 */
export interface OCRLine {
  /** Line text */
  text: string;
  /** Confidence */
  confidence: number;
  /** Bounding box */
  bbox: BoundingRect;
  /** Words in line */
  words: OCRWord[];
  /** Baseline information */
  baseline?: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
}

/**
 * ============================================================================
 * TEXT MATCHING TYPES
 * ============================================================================
 */

/**
 * Vision click target (result of text search)
 */
export interface VisionClickTarget {
  /** Whether target was found */
  found: boolean;
  /** Click point coordinates */
  clickPoint?: {
    x: number;
    y: number;
  };
  /** Matched text */
  matchedText?: string;
  /** Match confidence (0-100) */
  confidence?: number;
  /** All matches found */
  allMatches?: VisionMatch[];
  /** Processing time in ms */
  processingTime: number;
  /** Error if search failed */
  error?: string;
}

/**
 * Vision match result
 */
export interface VisionMatch {
  /** Matched text */
  text: string;
  /** OCR confidence (0-100) */
  confidence: number;
  /** Bounding box */
  bbox: BoundingRect;
  /** Center point */
  center: {
    x: number;
    y: number;
  };
  /** Match type */
  matchType: VisionMatchType;
  /** Similarity score (for fuzzy matches) */
  similarity?: number;
}

/**
 * Vision match types
 */
export type VisionMatchType =
  | 'exact'       // Exact text match
  | 'contains'    // Text contains search term
  | 'fuzzy'       // Fuzzy/approximate match
  | 'regex'       // Regex pattern match
  | 'prefix'      // Starts with search term
  | 'suffix';     // Ends with search term

/**
 * Text search options
 */
export interface TextSearchOptions {
  /** Exact match (default: false) */
  exact?: boolean;
  /** Case sensitive (default: false) */
  caseSensitive?: boolean;
  /** Fuzzy match threshold (0-1, default: 0.8) */
  fuzzyThreshold?: number;
  /** Return all matches (default: false, returns best match) */
  returnAll?: boolean;
  /** Maximum matches to return */
  maxMatches?: number;
  /** Search region (full screen if not specified) */
  searchRegion?: BoundingRect;
  /** Minimum OCR confidence to consider */
  minConfidence?: number;
}

/**
 * ============================================================================
 * CONDITIONAL CLICK TYPES
 * ============================================================================
 */

/**
 * Conditional click configuration
 */
export interface ConditionalClickConfig {
  /** Text(s) to search for */
  searchTerms: string[];
  /** Maximum time to wait in seconds */
  timeoutSeconds: number;
  /** Polling interval in ms */
  pollIntervalMs: number;
  /** Type of interaction to perform */
  interactionType: VisionInteractionType;
  /** Value to type (for 'type' interaction) */
  typeValue?: string;
  /** Click offset from text center */
  clickOffset?: {
    x: number;
    y: number;
  };
  /** Whether to stop on first match */
  stopOnFirstMatch?: boolean;
}

/**
 * Vision interaction types
 */
export type VisionInteractionType =
  | 'click'
  | 'doubleClick'
  | 'rightClick'
  | 'type'
  | 'hover';

/**
 * Conditional click result
 */
export interface ConditionalClickResult {
  /** Whether operation succeeded */
  success: boolean;
  /** Text that was found */
  foundText?: string;
  /** Click coordinates used */
  clickedAt?: {
    x: number;
    y: number;
  };
  /** Number of attempts made */
  attempts: number;
  /** Total time spent in ms */
  totalTime: number;
  /** Error if failed */
  error?: string;
}

/**
 * ============================================================================
 * CACHE TYPES
 * ============================================================================
 */

/**
 * Cached OCR result
 */
export interface CachedOCR {
  /** Screenshot ID */
  screenshotId: string;
  /** OCR results */
  results: OCRResult[];
  /** Full page result */
  pageResult?: OCRPageResult;
  /** Cache timestamp */
  cachedAt: number;
  /** Expiration timestamp */
  expiresAt: number;
  /** Tab ID */
  tabId: number;
}

/**
 * OCR cache statistics
 */
export interface OCRCacheStats {
  /** Number of cached entries */
  entryCount: number;
  /** Cache hit count */
  hits: number;
  /** Cache miss count */
  misses: number;
  /** Hit rate (0-1) */
  hitRate: number;
  /** Estimated memory usage */
  memoryUsage: number;
}

/**
 * ============================================================================
 * TESSERACT WORKER TYPES
 * ============================================================================
 */

/**
 * Tesseract worker status
 */
export interface TesseractWorkerStatus {
  /** Whether worker is ready */
  ready: boolean;
  /** Current job status */
  jobStatus?: TesseractJobStatus;
  /** Progress (0-1) */
  progress?: number;
  /** Status message */
  message?: string;
}

/**
 * Tesseract job status
 */
export type TesseractJobStatus =
  | 'idle'
  | 'loading'
  | 'initializing'
  | 'recognizing'
  | 'complete'
  | 'error';

/**
 * Tesseract recognition parameters
 */
export interface TesseractParams {
  /** Language */
  lang: TesseractLanguage;
  /** Page segmentation mode */
  tessedit_pageseg_mode: TesseractPSM;
  /** OCR engine mode */
  tessedit_ocr_engine_mode?: TesseractOEM;
  /** Character whitelist */
  tessedit_char_whitelist?: string;
  /** Character blacklist */
  tessedit_char_blacklist?: string;
  /** Whether to preserve interword spaces */
  preserve_interword_spaces?: '0' | '1';
}

/**
 * Tesseract Page Segmentation Modes
 */
export type TesseractPSM =
  | 0   // Orientation and script detection only
  | 1   // Automatic page segmentation with OSD
  | 2   // Automatic page segmentation, no OSD or OCR
  | 3   // Fully automatic page segmentation, no OSD (default)
  | 4   // Assume a single column of text
  | 5   // Assume a single uniform block of vertically aligned text
  | 6   // Assume a single uniform block of text
  | 7   // Treat the image as a single text line
  | 8   // Treat the image as a single word
  | 9   // Treat the image as a single word in a circle
  | 10  // Treat the image as a single character
  | 11  // Sparse text
  | 12  // Sparse text with OSD
  | 13; // Raw line

/**
 * Tesseract OCR Engine Modes
 */
export type TesseractOEM =
  | 0   // Legacy engine only
  | 1   // Neural nets LSTM engine only
  | 2   // Legacy + LSTM engines
  | 3;  // Default, based on what is available

/**
 * ============================================================================
 * UTILITY FUNCTIONS
 * ============================================================================
 */

/**
 * Get center point of bounding box
 */
export function getBboxCenter(bbox: BoundingRect): { x: number; y: number } {
  return {
    x: bbox.x + bbox.width / 2,
    y: bbox.y + bbox.height / 2
  };
}

/**
 * Check if point is inside bounding box
 */
export function isPointInBbox(
  point: { x: number; y: number },
  bbox: BoundingRect
): boolean {
  return (
    point.x >= bbox.x &&
    point.x <= bbox.x + bbox.width &&
    point.y >= bbox.y &&
    point.y <= bbox.y + bbox.height
  );
}

/**
 * Calculate overlap between two bounding boxes
 */
export function calculateBboxOverlap(a: BoundingRect, b: BoundingRect): number {
  const xOverlap = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const yOverlap = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  const overlapArea = xOverlap * yOverlap;
  const aArea = a.width * a.height;
  const bArea = b.width * b.height;
  return overlapArea / Math.min(aArea, bArea);
}

/**
 * Expand bounding box by padding
 */
export function expandBbox(bbox: BoundingRect, padding: number): BoundingRect {
  return {
    x: bbox.x - padding,
    y: bbox.y - padding,
    width: bbox.width + padding * 2,
    height: bbox.height + padding * 2
  };
}

/**
 * Scale bounding box by device pixel ratio
 */
export function scaleBbox(bbox: BoundingRect, scale: number): BoundingRect {
  return {
    x: bbox.x / scale,
    y: bbox.y / scale,
    width: bbox.width / scale,
    height: bbox.height / scale
  };
}

/**
 * Filter OCR results by confidence
 */
export function filterByConfidence(
  results: OCRResult[],
  minConfidence: number
): OCRResult[] {
  return results.filter(r => r.confidence >= minConfidence);
}

/**
 * Find OCR result nearest to point
 */
export function findNearestOCRResult(
  results: OCRResult[],
  point: { x: number; y: number }
): OCRResult | null {
  if (results.length === 0) return null;

  let nearest: OCRResult | null = null;
  let minDistance = Infinity;

  for (const result of results) {
    const center = getBboxCenter(result.bbox);
    const distance = Math.sqrt(
      Math.pow(center.x - point.x, 2) +
      Math.pow(center.y - point.y, 2)
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearest = result;
    }
  }

  return nearest;
}

/**
 * Convert Tesseract raw output to OCRResult array
 */
export function parseTesseractOutput(data: any): OCRResult[] {
  const results: OCRResult[] = [];

  if (!data?.blocks) return results;

  let lineIndex = 0;

  for (const block of data.blocks) {
    for (const paragraph of block.paragraphs || []) {
      for (const line of paragraph.lines || []) {
        const words: OCRWord[] = (line.words || []).map((word: any) => ({
          text: word.text,
          confidence: word.confidence,
          bbox: {
            x: word.bbox.x0,
            y: word.bbox.y0,
            width: word.bbox.x1 - word.bbox.x0,
            height: word.bbox.y1 - word.bbox.y0
          }
        }));

        results.push({
          text: line.text,
          confidence: line.confidence,
          bbox: {
            x: line.bbox.x0,
            y: line.bbox.y0,
            width: line.bbox.x1 - line.bbox.x0,
            height: line.bbox.y1 - line.bbox.y0
          },
          words,
          lineIndex: lineIndex++
        });
      }
    }
  }

  return results;
}
```

---

## Usage Examples

### Working with OCR Results
```typescript
import { OCRResult, filterByConfidence, findNearestOCRResult } from '../types/vision';

function findTextNearClick(results: OCRResult[], clickPoint: { x: number; y: number }): string {
  const filtered = filterByConfidence(results, 60);
  const nearest = findNearestOCRResult(filtered, clickPoint);
  return nearest?.text || '';
}
```

### Conditional Click
```typescript
import { ConditionalClickConfig, VisionClickTarget } from '../types/vision';

const config: ConditionalClickConfig = {
  searchTerms: ['Submit', 'Save', 'Continue'],
  timeoutSeconds: 10,
  pollIntervalMs: 500,
  interactionType: 'click',
  stopOnFirstMatch: true
};
```

---

## Acceptance Criteria

- [ ] VisionServiceConfig with all options
- [ ] CapturedScreenshot with metadata
- [ ] Complete OCR result hierarchy (page → block → paragraph → line → word → symbol)
- [ ] VisionClickTarget for text search results
- [ ] TextSearchOptions with matching modes
- [ ] ConditionalClickConfig for polling operations
- [ ] Cache types for OCR result caching
- [ ] Tesseract worker and parameter types
- [ ] Utility functions for bbox operations
- [ ] TypeScript compiles with strict mode, 0 errors

---

## Edge Cases

1. **Empty OCR results**: Return empty array
2. **Zero confidence**: Still valid result
3. **Overlapping bounding boxes**: Handle in UI
4. **Very small text**: May have low confidence
5. **Rotated text**: Bbox may not be accurate
6. **Multi-language**: Support combined languages
7. **Special characters**: Properly escaped
8. **Large screenshots**: Memory considerations
9. **Cache expiration**: Clean up expired entries
10. **Worker initialization failure**: Handle gracefully

---

## Estimated Lines

350-400 lines
