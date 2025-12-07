# VisionService Content Specification

**File ID:** B5  
**File Path:** `src/background/services/VisionService.ts`  
**Status:** CREATE  
**Priority:** P0

---

## Purpose

Background-side vision service that coordinates OCR operations, screenshot management, and vision-based element location. Acts as the bridge between the content script's VisionCapture layer and the decision engine's vision_ocr strategy. Handles Tesseract.js worker management in the background context, performs text matching for conditional clicks, and provides vision-based element finding during playback when DOM strategies fail. This service enables the "Vision OCR" fallback strategy (confidence 0.70-0.90).

---

## Dependencies

### Uses (imports from)
- `tesseract.js`: createWorker, Worker, RecognizeResult
- `./CDPService`: CDPService for screenshot capture
- `../../types/vision`: VisionConfig, OCRResult, ConditionalConfig
- `../../types/strategy`: LocatorStrategy

### Used By (exports to)
- `./DecisionEngine`: Uses for vision_ocr strategy evaluation
- `./strategies/VisionStrategy`: Delegates OCR operations
- `../background.ts`: Message handler delegation

---

## Interfaces

```typescript
/**
 * Vision service configuration
 */
interface VisionServiceConfig {
  /** Default OCR confidence threshold 0-100 (default: 60) */
  confidenceThreshold: number;
  /** Tesseract language (default: 'eng') */
  language: string;
  /** OCR timeout in ms (default: 5000) */
  ocrTimeout: number;
  /** Cache OCR results for this many ms (default: 2000) */
  cacheTtlMs: number;
  /** Maximum concurrent OCR operations (default: 2) */
  maxConcurrent: number;
  /** Pre-initialize worker on service start (default: true) */
  preInitialize: boolean;
}

/**
 * OCR result with location data
 */
interface OCRResult {
  /** Detected text */
  text: string;
  /** Confidence score 0-100 */
  confidence: number;
  /** Bounding box in screenshot coordinates */
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Word-level breakdown */
  words: Array<{
    text: string;
    confidence: number;
    bbox: { x: number; y: number; width: number; height: number };
  }>;
  /** Line index in page */
  lineIndex: number;
}

/**
 * Vision click target
 */
interface VisionClickTarget {
  /** Whether target was found */
  found: boolean;
  /** Click coordinates (center of text bbox) */
  clickPoint?: {
    x: number;
    y: number;
  };
  /** Matched text */
  matchedText?: string;
  /** Match confidence */
  confidence: number;
  /** All matching results */
  allMatches: OCRResult[];
  /** Processing time in ms */
  processingTime: number;
  /** Error message if not found */
  error?: string;
}

/**
 * Conditional click configuration
 */
interface ConditionalClickConfig {
  /** Text to search for */
  searchTerms: string[];
  /** Maximum wait time in seconds */
  timeoutSeconds: number;
  /** Poll interval in ms */
  pollIntervalMs: number;
  /** Action to perform when found */
  interactionType: 'click' | 'type' | 'dropdown';
  /** Value to type (if interactionType is 'type') */
  typeValue?: string;
}

/**
 * Conditional click result
 */
interface ConditionalClickResult {
  /** Whether text was found and clicked */
  success: boolean;
  /** Text that was matched */
  matchedTerm?: string;
  /** Number of poll attempts */
  attempts: number;
  /** Total time waited in ms */
  totalWaitTime: number;
  /** Final click coordinates */
  clickPoint?: { x: number; y: number };
  /** Error message */
  error?: string;
}

/**
 * Screenshot with metadata
 */
interface CapturedScreenshot {
  /** Base64 image data */
  data: string;
  /** Image dimensions */
  width: number;
  height: number;
  /** Device pixel ratio */
  scale: number;
  /** Capture timestamp */
  timestamp: number;
  /** Tab ID */
  tabId: number;
}

/**
 * Cached OCR result
 */
interface CachedOCR {
  /** Screenshot hash/ID */
  screenshotId: string;
  /** OCR results */
  results: OCRResult[];
  /** Cache timestamp */
  cachedAt: number;
  /** Tab ID */
  tabId: number;
}

/**
 * Vision service status
 */
type VisionServiceStatus = 'idle' | 'initializing' | 'ready' | 'processing' | 'error';
```

---

## Functions

```typescript
/**
 * VisionService - Background-side OCR and vision operations
 */
class VisionService {
  private config: VisionServiceConfig;
  private status: VisionServiceStatus;
  private worker: Tesseract.Worker | null;
  private initPromise: Promise<void> | null;
  private ocrCache: Map<string, CachedOCR>;
  private processingQueue: Map<string, Promise<OCRResult[]>>;
  private concurrentCount: number;

  /**
   * Create new VisionService instance
   * @param config - Service configuration
   */
  constructor(config?: Partial<VisionServiceConfig>);

  /**
   * Initialize Tesseract worker
   * Called automatically on first use or explicitly for pre-warming
   * @returns Promise resolving when ready
   */
  async initialize(): Promise<void>;

  /**
   * Shut down the service and release resources
   */
  async shutdown(): Promise<void>;

  /**
   * Get current service status
   * @returns Service status
   */
  getStatus(): VisionServiceStatus;

  /**
   * Check if service is ready
   * @returns Whether service is ready
   */
  isReady(): boolean;

  /**
   * Capture screenshot of a tab
   * @param tabId - Target tab
   * @returns Promise resolving to captured screenshot
   */
  async captureScreenshot(tabId: number): Promise<CapturedScreenshot>;

  /**
   * Perform OCR on a screenshot
   * @param screenshot - Screenshot to analyze
   * @returns Promise resolving to OCR results
   */
  async performOCR(screenshot: CapturedScreenshot): Promise<OCRResult[]>;

  /**
   * Perform OCR on a tab (capture + analyze)
   * @param tabId - Target tab
   * @param useCache - Whether to use cached results (default: true)
   * @returns Promise resolving to OCR results
   */
  async analyzeTab(tabId: number, useCache?: boolean): Promise<OCRResult[]>;

  /**
   * Find text in a tab using OCR
   * @param tabId - Target tab
   * @param searchText - Text to find
   * @param options - Search options
   * @returns Promise resolving to vision click target
   */
  async findText(
    tabId: number,
    searchText: string,
    options?: {
      exact?: boolean;
      caseSensitive?: boolean;
      useCache?: boolean;
    }
  ): Promise<VisionClickTarget>;

  /**
   * Find any of multiple texts
   * @param tabId - Target tab
   * @param searchTerms - Texts to search for
   * @param options - Search options
   * @returns Promise resolving to first match
   */
  async findAnyText(
    tabId: number,
    searchTerms: string[],
    options?: {
      exact?: boolean;
      caseSensitive?: boolean;
    }
  ): Promise<VisionClickTarget>;

  /**
   * Vision-based click
   * @param tabId - Target tab
   * @param searchText - Text to click on
   * @param options - Click options
   * @returns Promise resolving to click result
   */
  async visionClick(
    tabId: number,
    searchText: string,
    options?: {
      exact?: boolean;
      caseSensitive?: boolean;
      offsetX?: number;
      offsetY?: number;
    }
  ): Promise<{ success: boolean; clickPoint?: { x: number; y: number }; error?: string }>;

  /**
   * Vision-based type (find field and type)
   * @param tabId - Target tab
   * @param searchText - Text to identify field
   * @param value - Value to type
   * @returns Promise resolving to type result
   */
  async visionType(
    tabId: number,
    searchText: string,
    value: string
  ): Promise<{ success: boolean; error?: string }>;

  /**
   * Conditional click - poll until text appears then click
   * @param tabId - Target tab
   * @param config - Conditional click configuration
   * @returns Promise resolving to conditional click result
   */
  async conditionalClick(
    tabId: number,
    config: ConditionalClickConfig
  ): Promise<ConditionalClickResult>;

  /**
   * Extract all text from a tab
   * @param tabId - Target tab
   * @returns Promise resolving to extracted text
   */
  async extractText(tabId: number): Promise<string>;

  /**
   * Verify text exists on page
   * @param tabId - Target tab
   * @param text - Text to verify
   * @returns Promise resolving to boolean
   */
  async verifyText(tabId: number, text: string): Promise<boolean>;

  /**
   * Get text near coordinates
   * @param tabId - Target tab
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param radius - Search radius in pixels
   * @returns Promise resolving to nearest text
   */
  async getTextNearPoint(
    tabId: number,
    x: number,
    y: number,
    radius?: number
  ): Promise<OCRResult | null>;

  /**
   * Clear OCR cache
   * @param tabId - Tab ID (or all if not specified)
   */
  clearCache(tabId?: number): void;

  /**
   * Evaluate vision strategy from FallbackChain
   * @param tabId - Target tab
   * @param strategy - Vision strategy to evaluate
   * @returns Promise resolving to evaluation result
   */
  async evaluateStrategy(
    tabId: number,
    strategy: LocatorStrategy
  ): Promise<{
    success: boolean;
    confidence: number;
    clickPoint?: { x: number; y: number };
    matchedText?: string;
  }>;

  // Private methods
  private createWorker(): Promise<Tesseract.Worker>;
  private processOCRResult(result: Tesseract.RecognizeResult): OCRResult[];
  private matchText(ocrText: string, searchText: string, exact: boolean, caseSensitive: boolean): boolean;
  private findBestMatch(results: OCRResult[], searchText: string, exact: boolean): OCRResult | null;
  private generateScreenshotId(screenshot: CapturedScreenshot): string;
  private getCachedResults(screenshotId: string): OCRResult[] | null;
  private cacheResults(screenshotId: string, tabId: number, results: OCRResult[]): void;
  private pruneCache(): void;
  private scaleCoordinates(bbox: OCRResult['bbox'], scale: number): OCRResult['bbox'];
}

export {
  VisionService,
  VisionServiceConfig,
  OCRResult,
  VisionClickTarget,
  ConditionalClickConfig,
  ConditionalClickResult,
  CapturedScreenshot
};
```

---

## Key Implementation Details

### Initialization with Worker Management
```typescript
constructor(config?: Partial<VisionServiceConfig>) {
  this.config = {
    confidenceThreshold: config?.confidenceThreshold ?? 60,
    language: config?.language ?? 'eng',
    ocrTimeout: config?.ocrTimeout ?? 5000,
    cacheTtlMs: config?.cacheTtlMs ?? 2000,
    maxConcurrent: config?.maxConcurrent ?? 2,
    preInitialize: config?.preInitialize ?? true
  };
  this.status = 'idle';
  this.worker = null;
  this.initPromise = null;
  this.ocrCache = new Map();
  this.processingQueue = new Map();
  this.concurrentCount = 0;

  // Pre-initialize if configured
  if (this.config.preInitialize) {
    this.initialize().catch(err => {
      console.error('[VisionService] Pre-initialization failed:', err);
    });
  }
}

async initialize(): Promise<void> {
  if (this.status === 'ready') {
    return;
  }

  if (this.initPromise) {
    return this.initPromise;
  }

  this.status = 'initializing';
  console.log('[VisionService] Initializing Tesseract worker...');

  this.initPromise = (async () => {
    try {
      const startTime = Date.now();
      this.worker = await this.createWorker();
      this.status = 'ready';
      console.log(`[VisionService] Ready in ${Date.now() - startTime}ms`);
    } catch (error) {
      this.status = 'error';
      console.error('[VisionService] Initialization failed:', error);
      throw error;
    }
  })();

  return this.initPromise;
}

private async createWorker(): Promise<Tesseract.Worker> {
  const worker = await createWorker(this.config.language, 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && m.progress > 0) {
        // Progress logging if needed
      }
    }
  });

  // Optimize for speed
  await worker.setParameters({
    tessedit_pageseg_mode: '3', // Automatic page segmentation
    tessedit_char_whitelist: '', // Allow all characters
    preserve_interword_spaces: '1'
  });

  return worker;
}

async shutdown(): Promise<void> {
  if (this.worker) {
    await this.worker.terminate();
    this.worker = null;
  }
  this.status = 'idle';
  this.initPromise = null;
  this.ocrCache.clear();
  this.processingQueue.clear();
  console.log('[VisionService] Shut down');
}
```

### Screenshot Capture
```typescript
async captureScreenshot(tabId: number): Promise<CapturedScreenshot> {
  return new Promise((resolve, reject) => {
    chrome.tabs.captureVisibleTab(
      undefined, // Current window
      { format: 'png', quality: 100 },
      async (dataUrl) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        if (!dataUrl) {
          reject(new Error('No screenshot data returned'));
          return;
        }

        // Get image dimensions
        const img = new Image();
        img.onload = () => {
          // Get device pixel ratio from tab
          chrome.tabs.get(tabId, (tab) => {
            const scale = window.devicePixelRatio || 1;
            resolve({
              data: dataUrl,
              width: img.width,
              height: img.height,
              scale,
              timestamp: Date.now(),
              tabId
            });
          });
        };
        img.onerror = () => reject(new Error('Failed to load screenshot'));
        img.src = dataUrl;
      }
    );
  });
}
```

### OCR Processing with Caching
```typescript
async performOCR(screenshot: CapturedScreenshot): Promise<OCRResult[]> {
  // Check cache first
  const screenshotId = this.generateScreenshotId(screenshot);
  const cached = this.getCachedResults(screenshotId);
  if (cached) {
    return cached;
  }

  // Check if already processing this screenshot
  const pending = this.processingQueue.get(screenshotId);
  if (pending) {
    return pending;
  }

  // Ensure initialized
  await this.initialize();

  if (!this.worker) {
    throw new Error('Tesseract worker not available');
  }

  // Check concurrent limit
  while (this.concurrentCount >= this.config.maxConcurrent) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  this.concurrentCount++;
  this.status = 'processing';

  const processingPromise = (async () => {
    try {
      // Run OCR with timeout
      const ocrPromise = this.worker!.recognize(screenshot.data);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('OCR timeout')), this.config.ocrTimeout)
      );

      const result = await Promise.race([ocrPromise, timeoutPromise]);
      const ocrResults = this.processOCRResult(result);

      // Scale coordinates from screenshot space to viewport space
      const scaledResults = ocrResults.map(r => ({
        ...r,
        bbox: this.scaleCoordinates(r.bbox, screenshot.scale),
        words: r.words.map(w => ({
          ...w,
          bbox: this.scaleCoordinates(w.bbox, screenshot.scale)
        }))
      }));

      // Cache results
      this.cacheResults(screenshotId, screenshot.tabId, scaledResults);

      return scaledResults;

    } finally {
      this.concurrentCount--;
      this.processingQueue.delete(screenshotId);
      if (this.concurrentCount === 0) {
        this.status = 'ready';
      }
    }
  })();

  this.processingQueue.set(screenshotId, processingPromise);
  return processingPromise;
}

private processOCRResult(result: Tesseract.RecognizeResult): OCRResult[] {
  const ocrResults: OCRResult[] = [];
  let lineIndex = 0;

  for (const block of result.data.blocks || []) {
    for (const paragraph of block.paragraphs || []) {
      for (const line of paragraph.lines || []) {
        const words = (line.words || []).map(word => ({
          text: word.text,
          confidence: word.confidence,
          bbox: {
            x: word.bbox.x0,
            y: word.bbox.y0,
            width: word.bbox.x1 - word.bbox.x0,
            height: word.bbox.y1 - word.bbox.y0
          }
        }));

        ocrResults.push({
          text: line.text.trim(),
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

  return ocrResults;
}
```

### Find Text Implementation
```typescript
async findText(
  tabId: number,
  searchText: string,
  options?: {
    exact?: boolean;
    caseSensitive?: boolean;
    useCache?: boolean;
  }
): Promise<VisionClickTarget> {
  const startTime = Date.now();
  const exact = options?.exact ?? false;
  const caseSensitive = options?.caseSensitive ?? false;

  try {
    // Get OCR results
    const results = await this.analyzeTab(tabId, options?.useCache ?? true);

    // Find matches
    const matches = results.filter(r =>
      r.confidence >= this.config.confidenceThreshold &&
      this.matchText(r.text, searchText, exact, caseSensitive)
    );

    if (matches.length === 0) {
      return {
        found: false,
        confidence: 0,
        allMatches: [],
        processingTime: Date.now() - startTime,
        error: `Text "${searchText}" not found on page`
      };
    }

    // Find best match (highest confidence)
    const bestMatch = this.findBestMatch(matches, searchText, exact);
    if (!bestMatch) {
      return {
        found: false,
        confidence: 0,
        allMatches: matches,
        processingTime: Date.now() - startTime,
        error: 'No match met confidence threshold'
      };
    }

    // Calculate click point (center of bbox)
    const clickPoint = {
      x: bestMatch.bbox.x + bestMatch.bbox.width / 2,
      y: bestMatch.bbox.y + bestMatch.bbox.height / 2
    };

    return {
      found: true,
      clickPoint,
      matchedText: bestMatch.text,
      confidence: bestMatch.confidence,
      allMatches: matches,
      processingTime: Date.now() - startTime
    };

  } catch (error) {
    return {
      found: false,
      confidence: 0,
      allMatches: [],
      processingTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Vision search failed'
    };
  }
}

private matchText(
  ocrText: string,
  searchText: string,
  exact: boolean,
  caseSensitive: boolean
): boolean {
  let text = ocrText.trim();
  let search = searchText.trim();

  if (!caseSensitive) {
    text = text.toLowerCase();
    search = search.toLowerCase();
  }

  if (exact) {
    return text === search;
  }

  return text.includes(search);
}

private findBestMatch(
  results: OCRResult[],
  searchText: string,
  exact: boolean
): OCRResult | null {
  if (results.length === 0) return null;

  // Sort by confidence and exactness of match
  return results.sort((a, b) => {
    // Prefer exact matches
    const aExact = a.text.toLowerCase() === searchText.toLowerCase();
    const bExact = b.text.toLowerCase() === searchText.toLowerCase();
    if (aExact && !bExact) return -1;
    if (bExact && !aExact) return 1;

    // Then by confidence
    return b.confidence - a.confidence;
  })[0];
}
```

### Conditional Click (Polling)
```typescript
async conditionalClick(
  tabId: number,
  config: ConditionalClickConfig
): Promise<ConditionalClickResult> {
  const startTime = Date.now();
  const timeoutMs = config.timeoutSeconds * 1000;
  let attempts = 0;

  while (Date.now() - startTime < timeoutMs) {
    attempts++;

    // Clear cache to get fresh screenshot
    this.clearCache(tabId);

    // Try to find any of the search terms
    const result = await this.findAnyText(tabId, config.searchTerms, {
      exact: false,
      caseSensitive: false
    });

    if (result.found && result.clickPoint) {
      // Found the text - perform the interaction
      if (config.interactionType === 'click') {
        await this.performClick(tabId, result.clickPoint.x, result.clickPoint.y);
      } else if (config.interactionType === 'type' && config.typeValue) {
        await this.performClick(tabId, result.clickPoint.x, result.clickPoint.y);
        await this.performType(tabId, config.typeValue);
      }

      return {
        success: true,
        matchedTerm: result.matchedText,
        attempts,
        totalWaitTime: Date.now() - startTime,
        clickPoint: result.clickPoint
      };
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, config.pollIntervalMs));
  }

  return {
    success: false,
    attempts,
    totalWaitTime: Date.now() - startTime,
    error: `Text not found after ${config.timeoutSeconds}s (${attempts} attempts)`
  };
}

async findAnyText(
  tabId: number,
  searchTerms: string[],
  options?: { exact?: boolean; caseSensitive?: boolean }
): Promise<VisionClickTarget> {
  const startTime = Date.now();

  try {
    const results = await this.analyzeTab(tabId, false);

    for (const term of searchTerms) {
      const matches = results.filter(r =>
        r.confidence >= this.config.confidenceThreshold &&
        this.matchText(r.text, term, options?.exact ?? false, options?.caseSensitive ?? false)
      );

      if (matches.length > 0) {
        const bestMatch = matches[0];
        return {
          found: true,
          clickPoint: {
            x: bestMatch.bbox.x + bestMatch.bbox.width / 2,
            y: bestMatch.bbox.y + bestMatch.bbox.height / 2
          },
          matchedText: term,
          confidence: bestMatch.confidence,
          allMatches: matches,
          processingTime: Date.now() - startTime
        };
      }
    }

    return {
      found: false,
      confidence: 0,
      allMatches: [],
      processingTime: Date.now() - startTime
    };

  } catch (error) {
    return {
      found: false,
      confidence: 0,
      allMatches: [],
      processingTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Search failed'
    };
  }
}
```

### Evaluate Strategy for Decision Engine
```typescript
async evaluateStrategy(
  tabId: number,
  strategy: LocatorStrategy
): Promise<{
  success: boolean;
  confidence: number;
  clickPoint?: { x: number; y: number };
  matchedText?: string;
}> {
  if (strategy.type !== 'vision_ocr') {
    return { success: false, confidence: 0 };
  }

  const targetText = strategy.metadata?.targetText;
  if (!targetText) {
    return { success: false, confidence: 0, matchedText: undefined };
  }

  const result = await this.findText(tabId, targetText, {
    exact: false,
    caseSensitive: false,
    useCache: true
  });

  if (result.found && result.clickPoint) {
    return {
      success: true,
      confidence: result.confidence / 100, // Normalize to 0-1
      clickPoint: result.clickPoint,
      matchedText: result.matchedText
    };
  }

  return {
    success: false,
    confidence: 0
  };
}
```

### Helper Methods
```typescript
private generateScreenshotId(screenshot: CapturedScreenshot): string {
  // Simple hash based on timestamp and tab
  return `${screenshot.tabId}-${screenshot.timestamp}`;
}

private getCachedResults(screenshotId: string): OCRResult[] | null {
  const cached = this.ocrCache.get(screenshotId);
  if (cached && Date.now() - cached.cachedAt < this.config.cacheTtlMs) {
    return cached.results;
  }
  return null;
}

private cacheResults(screenshotId: string, tabId: number, results: OCRResult[]): void {
  this.ocrCache.set(screenshotId, {
    screenshotId,
    results,
    cachedAt: Date.now(),
    tabId
  });

  // Prune old cache entries
  this.pruneCache();
}

private pruneCache(): void {
  const cutoff = Date.now() - this.config.cacheTtlMs * 2;
  for (const [key, value] of this.ocrCache) {
    if (value.cachedAt < cutoff) {
      this.ocrCache.delete(key);
    }
  }
}

private scaleCoordinates(
  bbox: { x: number; y: number; width: number; height: number },
  scale: number
): { x: number; y: number; width: number; height: number } {
  return {
    x: bbox.x / scale,
    y: bbox.y / scale,
    width: bbox.width / scale,
    height: bbox.height / scale
  };
}

clearCache(tabId?: number): void {
  if (tabId !== undefined) {
    for (const [key, value] of this.ocrCache) {
      if (value.tabId === tabId) {
        this.ocrCache.delete(key);
      }
    }
  } else {
    this.ocrCache.clear();
  }
}
```

---

## Integration Points

### With Background Script
```typescript
// background.ts message handlers
const visionService = new VisionService({ preInitialize: true });

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'VISION_CLICK') {
    visionService.visionClick(message.tabId, message.searchText, message.options)
      .then(sendResponse);
    return true;
  }

  if (message.action === 'VISION_TYPE') {
    visionService.visionType(message.tabId, message.searchText, message.value)
      .then(sendResponse);
    return true;
  }

  if (message.action === 'VISION_OCR') {
    visionService.analyzeTab(message.tabId)
      .then(results => sendResponse({ results }));
    return true;
  }

  if (message.action === 'VISION_CONDITIONAL_CLICK') {
    visionService.conditionalClick(message.tabId, message.config)
      .then(sendResponse);
    return true;
  }
});
```

### With DecisionEngine
```typescript
// DecisionEngine evaluates vision_ocr strategy
class DecisionEngine {
  constructor(private visionService: VisionService) {}

  async evaluateVisionStrategy(tabId: number, strategy: LocatorStrategy) {
    return this.visionService.evaluateStrategy(tabId, strategy);
  }
}
```

---

## Acceptance Criteria

- [ ] Tesseract worker initializes correctly in background context
- [ ] captureScreenshot() captures visible tab
- [ ] performOCR() extracts text with bounding boxes
- [ ] findText() locates text with configurable matching
- [ ] findAnyText() finds first match from multiple terms
- [ ] conditionalClick() polls until text appears
- [ ] OCR cache prevents redundant processing
- [ ] Confidence threshold filters low-quality matches
- [ ] Coordinates correctly scaled for device pixel ratio
- [ ] evaluateStrategy() integrates with FallbackChain
- [ ] Concurrent OCR operations limited
- [ ] TypeScript compiles with strict mode, 0 errors

---

## Edge Cases

1. **No text on page**: Return empty results, not error
2. **Low confidence OCR**: Filter out below threshold
3. **Overlapping text**: Return all matches, let caller decide
4. **Non-Latin text**: Configure appropriate language
5. **Rotated/skewed text**: Tesseract handles up to ~45°
6. **Very small text**: May not be recognized
7. **Dark mode**: OCR works on inverted colors
8. **High DPI displays**: Scale coordinates correctly
9. **Tab not visible**: Cannot capture screenshot
10. **Worker crash**: Re-initialize on next request

---

## Estimated Lines

400-480 lines
