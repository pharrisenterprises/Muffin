# VisionCapture Content Specification

**File ID:** A4  
**File Path:** `src/contentScript/layers/VisionCapture.ts`  
**Status:** CREATE  
**Priority:** P0

---

## Purpose

Vision capture layer responsible for taking screenshots and performing OCR (Optical Character Recognition) using Tesseract.js. Captures visual state of the page at the moment of user interaction, extracts text near click points, and provides vision-based element identification for scenarios where DOM-based selectors fail (canvas elements, closed shadow DOM, dynamically rendered content). Enables the "Vision OCR" strategy in the 7-tier fallback chain.

---

## Dependencies

### Uses (imports from)
- `tesseract.js`: Tesseract worker, createWorker, recognize
- `../../types/vision`: VisionConfig, TextResult, VisionCaptureResult
- `../../lib/visionEngine`: VisionEngine class (shared utilities)

### Used By (exports to)
- `../RecordingOrchestrator`: Captures vision data during recording
- `../EvidenceBuffer`: Stores screenshots and OCR results

---

## Interfaces

```typescript
/**
 * Configuration for VisionCapture layer
 */
interface VisionCaptureConfig {
  /** Enable vision capture (default: true) */
  enabled: boolean;
  /** OCR confidence threshold 0-100 (default: 60) */
  confidenceThreshold: number;
  /** Tesseract language (default: 'eng') */
  language: string;
  /** Screenshot quality 0-1 (default: 0.8) */
  screenshotQuality: number;
  /** Region capture padding in pixels (default: 50) */
  regionPadding: number;
  /** Maximum screenshot dimension (default: 1920) */
  maxDimension: number;
  /** Timeout for OCR in ms (default: 5000) */
  ocrTimeout: number;
  /** Whether to capture full page or visible viewport (default: 'viewport') */
  captureMode: 'viewport' | 'fullpage' | 'element';
  /** Device pixel ratio override (default: window.devicePixelRatio) */
  devicePixelRatio?: number;
}

/**
 * OCR text result with position
 */
interface OCRTextResult {
  /** Detected text */
  text: string;
  /** Confidence score 0-100 */
  confidence: number;
  /** Bounding box in page coordinates */
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Word-level results for precise targeting */
  words?: Array<{
    text: string;
    confidence: number;
    bbox: { x: number; y: number; width: number; height: number };
  }>;
}

/**
 * Complete vision capture result
 */
interface VisionCaptureResult {
  /** Screenshot as base64 data URL */
  screenshot: string;
  /** Screenshot dimensions */
  dimensions: {
    width: number;
    height: number;
    scale: number;
  };
  /** OCR text near click point */
  ocrText?: string;
  /** OCR confidence 0-100 */
  confidence: number;
  /** Bounding box of detected text */
  textBbox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** All OCR results (for evidence) */
  allTextResults?: OCRTextResult[];
  /** Raw Tesseract result (pruned on save) */
  rawOcrResult?: any;
  /** Capture timestamp */
  timestamp: number;
  /** Time taken for capture + OCR in ms */
  processingTime: number;
}

/**
 * Region of interest for targeted capture
 */
interface CaptureRegion {
  /** X coordinate of region center */
  x: number;
  /** Y coordinate of region center */
  y: number;
  /** Region width */
  width: number;
  /** Region height */
  height: number;
}

/**
 * Layer status
 */
type VisionCaptureStatus = 'idle' | 'initializing' | 'ready' | 'capturing' | 'processing' | 'error' | 'disabled';
```

---

## Functions

```typescript
/**
 * VisionCapture - Screenshot and OCR capture layer
 */
class VisionCapture {
  private config: VisionCaptureConfig;
  private status: VisionCaptureStatus;
  private worker: Tesseract.Worker | null;
  private lastScreenshot: string | null;
  private lastCaptureResult: VisionCaptureResult | null;
  private initPromise: Promise<void> | null;

  /**
   * Create new VisionCapture instance
   * @param config - Capture configuration
   */
  constructor(config?: Partial<VisionCaptureConfig>);

  /**
   * Initialize Tesseract worker
   * Should be called at recording start (~2s initialization)
   * @returns Promise resolving when worker ready
   */
  async initialize(): Promise<void>;

  /**
   * Start the vision capture layer
   * Calls initialize() if not already done
   */
  async start(): Promise<void>;

  /**
   * Stop the vision capture layer
   * Terminates Tesseract worker to free memory
   */
  async stop(): Promise<void>;

  /**
   * Get current layer status
   * @returns Layer status
   */
  getStatus(): VisionCaptureStatus;

  /**
   * Capture screenshot and perform OCR
   * @param clickPoint - Optional click coordinates to focus OCR
   * @returns Promise resolving to capture result
   */
  async capture(clickPoint?: { x: number; y: number }): Promise<VisionCaptureResult>;

  /**
   * Capture screenshot only (no OCR)
   * Faster for evidence collection
   * @returns Promise resolving to screenshot data URL
   */
  async captureScreenshot(): Promise<string>;

  /**
   * Capture specific region of the page
   * @param region - Region to capture
   * @returns Promise resolving to capture result
   */
  async captureRegion(region: CaptureRegion): Promise<VisionCaptureResult>;

  /**
   * Perform OCR on provided image
   * @param imageData - Base64 image or ImageData
   * @returns Promise resolving to OCR results
   */
  async performOCR(imageData: string | ImageData): Promise<OCRTextResult[]>;

  /**
   * Find text in last screenshot
   * @param searchText - Text to find
   * @param fuzzyMatch - Allow fuzzy matching (default: true)
   * @returns Promise resolving to matching text result or null
   */
  async findText(searchText: string, fuzzyMatch?: boolean): Promise<OCRTextResult | null>;

  /**
   * Get text near a point in last screenshot
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param radius - Search radius in pixels (default: 100)
   * @returns Promise resolving to nearest text result or null
   */
  async getTextNearPoint(x: number, y: number, radius?: number): Promise<OCRTextResult | null>;

  /**
   * Get the last captured screenshot
   * @returns Screenshot data URL or null
   */
  getLastScreenshot(): string | null;

  /**
   * Get the last capture result
   * @returns Last capture result or null
   */
  getLastCaptureResult(): VisionCaptureResult | null;

  /**
   * Check if vision capture is available
   * @returns True if Tesseract loaded and ready
   */
  isAvailable(): boolean;

  // Private methods
  private async createWorker(): Promise<Tesseract.Worker>;
  private async captureVisibleTab(): Promise<string>;
  private async captureCanvas(canvas: HTMLCanvasElement): Promise<string>;
  private cropImage(imageData: string, region: CaptureRegion): Promise<string>;
  private scaleImage(imageData: string, maxDimension: number): Promise<string>;
  private findNearestText(results: OCRTextResult[], x: number, y: number, radius: number): OCRTextResult | null;
  private fuzzyMatch(text1: string, text2: string, threshold?: number): boolean;
  private calculateDistance(x1: number, y1: number, x2: number, y2: number): number;
}

export { VisionCapture, VisionCaptureConfig, VisionCaptureResult, OCRTextResult, CaptureRegion };
```

---

## Key Implementation Details

### Tesseract Worker Initialization
```typescript
async initialize(): Promise<void> {
  if (this.status === 'ready' || this.status === 'initializing') {
    return this.initPromise || Promise.resolve();
  }

  if (!this.config.enabled) {
    this.status = 'disabled';
    return;
  }

  this.status = 'initializing';
  console.log('[VisionCapture] Initializing Tesseract worker...');
  const startTime = Date.now();

  this.initPromise = (async () => {
    try {
      this.worker = await createWorker(this.config.language, 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            console.log(`[VisionCapture] OCR progress: ${Math.round(m.progress * 100)}%`);
          }
        },
        errorHandler: (err) => {
          console.error('[VisionCapture] Tesseract error:', err);
        }
      });

      // Configure for speed over accuracy
      await this.worker.setParameters({
        tessedit_pageseg_mode: '3', // Fully automatic page segmentation
        tessedit_char_whitelist: '', // Allow all characters
        preserve_interword_spaces: '1'
      });

      this.status = 'ready';
      console.log(`[VisionCapture] Initialized in ${Date.now() - startTime}ms`);
    } catch (error) {
      console.error('[VisionCapture] Initialization failed:', error);
      this.status = 'error';
      throw error;
    }
  })();

  return this.initPromise;
}

async stop(): Promise<void> {
  if (this.worker) {
    await this.worker.terminate();
    this.worker = null;
  }
  this.status = 'idle';
  this.lastScreenshot = null;
  this.lastCaptureResult = null;
  console.log('[VisionCapture] Stopped');
}
```

### Full Capture with OCR
```typescript
async capture(clickPoint?: { x: number; y: number }): Promise<VisionCaptureResult> {
  if (this.status !== 'ready') {
    await this.initialize();
  }

  const startTime = Date.now();
  this.status = 'capturing';

  try {
    // 1. Capture screenshot
    const screenshot = await this.captureVisibleTab();
    this.lastScreenshot = screenshot;

    // 2. Get dimensions
    const img = await this.loadImage(screenshot);
    const dimensions = {
      width: img.width,
      height: img.height,
      scale: this.config.devicePixelRatio || window.devicePixelRatio
    };

    // 3. Perform OCR with timeout
    this.status = 'processing';
    let allTextResults: OCRTextResult[] = [];
    let ocrText: string | undefined;
    let textBbox: VisionCaptureResult['textBbox'];
    let confidence = 0;
    let rawOcrResult: any;

    try {
      const ocrPromise = this.performOCR(screenshot);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('OCR timeout')), this.config.ocrTimeout)
      );

      allTextResults = await Promise.race([ocrPromise, timeoutPromise]);

      // 4. Find text near click point if provided
      if (clickPoint && allTextResults.length > 0) {
        const nearest = this.findNearestText(
          allTextResults,
          clickPoint.x * dimensions.scale,
          clickPoint.y * dimensions.scale,
          this.config.regionPadding * dimensions.scale
        );

        if (nearest && nearest.confidence >= this.config.confidenceThreshold) {
          ocrText = nearest.text;
          textBbox = nearest.bbox;
          confidence = nearest.confidence;
        }
      } else if (allTextResults.length > 0) {
        // No click point - use highest confidence result
        const best = allTextResults.reduce((a, b) => 
          a.confidence > b.confidence ? a : b
        );
        if (best.confidence >= this.config.confidenceThreshold) {
          ocrText = best.text;
          textBbox = best.bbox;
          confidence = best.confidence;
        }
      }
    } catch (ocrError) {
      console.warn('[VisionCapture] OCR failed or timed out:', ocrError);
      // Continue without OCR data
    }

    const result: VisionCaptureResult = {
      screenshot,
      dimensions,
      ocrText,
      confidence,
      textBbox,
      allTextResults,
      rawOcrResult,
      timestamp: Date.now(),
      processingTime: Date.now() - startTime
    };

    this.lastCaptureResult = result;
    this.status = 'ready';

    console.log(`[VisionCapture] Capture complete in ${result.processingTime}ms`);
    return result;

  } catch (error) {
    console.error('[VisionCapture] Capture failed:', error);
    this.status = 'error';
    throw error;
  }
}
```

### Screenshot Capture via Chrome API
```typescript
private async captureVisibleTab(): Promise<string> {
  return new Promise((resolve, reject) => {
    // Request screenshot from background script
    chrome.runtime.sendMessage(
      {
        action: 'CAPTURE_SCREENSHOT',
        options: {
          format: 'png',
          quality: Math.round(this.config.screenshotQuality * 100)
        }
      },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (response?.error) {
          reject(new Error(response.error));
          return;
        }
        if (response?.screenshot) {
          resolve(response.screenshot);
        } else {
          reject(new Error('No screenshot in response'));
        }
      }
    );
  });
}
```

### OCR Processing
```typescript
async performOCR(imageData: string | ImageData): Promise<OCRTextResult[]> {
  if (!this.worker) {
    throw new Error('Tesseract worker not initialized');
  }

  const result = await this.worker.recognize(imageData);
  const results: OCRTextResult[] = [];

  // Process lines for block-level results
  for (const block of result.data.blocks || []) {
    for (const paragraph of block.paragraphs || []) {
      for (const line of paragraph.lines || []) {
        const words = line.words?.map(word => ({
          text: word.text,
          confidence: word.confidence,
          bbox: {
            x: word.bbox.x0,
            y: word.bbox.y0,
            width: word.bbox.x1 - word.bbox.x0,
            height: word.bbox.y1 - word.bbox.y0
          }
        })) || [];

        results.push({
          text: line.text.trim(),
          confidence: line.confidence,
          bbox: {
            x: line.bbox.x0,
            y: line.bbox.y0,
            width: line.bbox.x1 - line.bbox.x0,
            height: line.bbox.y1 - line.bbox.y0
          },
          words
        });
      }
    }
  }

  return results;
}
```

### Find Text Near Click Point
```typescript
private findNearestText(
  results: OCRTextResult[],
  x: number,
  y: number,
  radius: number
): OCRTextResult | null {
  let nearest: OCRTextResult | null = null;
  let minDistance = Infinity;

  for (const result of results) {
    // Calculate center of text bbox
    const centerX = result.bbox.x + result.bbox.width / 2;
    const centerY = result.bbox.y + result.bbox.height / 2;

    // Calculate distance from click point to text center
    const distance = this.calculateDistance(x, y, centerX, centerY);

    // Check if within radius and closer than current nearest
    if (distance <= radius && distance < minDistance) {
      minDistance = distance;
      nearest = result;
    }
  }

  return nearest;
}

private calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}
```

### Fuzzy Text Matching
```typescript
async findText(searchText: string, fuzzyMatch: boolean = true): Promise<OCRTextResult | null> {
  if (!this.lastCaptureResult?.allTextResults) {
    return null;
  }

  const normalizedSearch = searchText.toLowerCase().trim();

  for (const result of this.lastCaptureResult.allTextResults) {
    const normalizedResult = result.text.toLowerCase().trim();

    // Exact match
    if (normalizedResult === normalizedSearch) {
      return result;
    }

    // Contains match
    if (normalizedResult.includes(normalizedSearch)) {
      return result;
    }

    // Fuzzy match using Levenshtein distance
    if (fuzzyMatch && this.fuzzyMatch(normalizedResult, normalizedSearch, 0.8)) {
      return result;
    }
  }

  return null;
}

private fuzzyMatch(text1: string, text2: string, threshold: number = 0.8): boolean {
  const maxLength = Math.max(text1.length, text2.length);
  if (maxLength === 0) return true;

  const distance = this.levenshteinDistance(text1, text2);
  const similarity = 1 - distance / maxLength;

  return similarity >= threshold;
}

private levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}
```

---

## Integration Points

### With RecordingOrchestrator
```typescript
// In RecordingOrchestrator
class RecordingOrchestrator {
  private visionCapture: VisionCapture | null;

  async start(): Promise<void> {
    if (this.config.enableVision) {
      this.visionCapture = new VisionCapture({
        enabled: true,
        confidenceThreshold: this.config.visionConfig.confidenceThreshold || 60,
        language: this.config.visionConfig.language || 'eng',
        ocrTimeout: 5000
      });
      
      // Initialize Tesseract at recording start (~2s)
      await this.visionCapture.start();
    }
  }

  async captureAction(event: Event, element: HTMLElement): Promise<CapturedAction> {
    const clickPoint = event instanceof MouseEvent 
      ? { x: event.clientX, y: event.clientY }
      : undefined;

    const [domData, visionData] = await Promise.all([
      this.domCapture.capture(element),
      this.visionCapture?.capture(clickPoint)
    ]);

    // ... rest of capture
  }
}
```

### With Background Script (Screenshot Capture)
```typescript
// In background.ts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'CAPTURE_SCREENSHOT') {
    chrome.tabs.captureVisibleTab(
      sender.tab?.windowId,
      { format: 'png', quality: message.options?.quality || 100 },
      (dataUrl) => {
        if (chrome.runtime.lastError) {
          sendResponse({ error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ screenshot: dataUrl });
        }
      }
    );
    return true; // Async response
  }
});
```

### With EvidenceBuffer
```typescript
// Store screenshot with action
const visionResult = await this.visionCapture.capture(clickPoint);
const screenshotBlob = await fetch(visionResult.screenshot).then(r => r.blob());
await this.evidenceBuffer.store(action, screenshotBlob);
```

---

## Acceptance Criteria

- [ ] Tesseract worker initializes within 3 seconds
- [ ] Screenshots capture visible viewport correctly
- [ ] OCR extracts text with >= 60% confidence threshold
- [ ] findText() returns correct bounding boxes
- [ ] getTextNearPoint() finds text within specified radius
- [ ] Fuzzy matching handles minor OCR errors
- [ ] OCR timeout (5s) prevents hanging
- [ ] Worker terminates cleanly on stop()
- [ ] Works with device pixel ratios > 1
- [ ] Handles pages with no text gracefully
- [ ] Memory efficient (single screenshot kept)
- [ ] TypeScript compiles with strict mode, 0 errors

---

## Edge Cases

1. **No text on page**: Return empty results, don't error
2. **Non-Latin text**: Configure language appropriately
3. **Rotated text**: Tesseract handles up to 45° rotation
4. **Very small text**: May not be recognized, use larger region
5. **Image-heavy pages**: OCR may be slow, respect timeout
6. **High DPI displays**: Scale coordinates correctly
7. **Scrolled viewport**: Capture only visible area
8. **Canvas content**: Capture works, OCR depends on text rendering
9. **Dark mode**: OCR works on inverted colors
10. **PDF viewers**: May need special handling

---

## Estimated Lines

350-400 lines
