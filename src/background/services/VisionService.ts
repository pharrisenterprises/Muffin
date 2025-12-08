/**
 * @fileoverview Vision Service
 * @description Background-side OCR operations using Tesseract.js.
 * Provides vision-based element location for the vision_ocr strategy.
 * Handles screenshot capture, text recognition, and conditional clicks.
 * 
 * @module services/VisionService
 * @version 1.0.0
 * @since Phase 4
 */

import { createWorker, type Worker } from 'tesseract.js';
import { CDPService, getCDPService } from './CDPService';
import type { LocatorStrategy } from '../../types';

// ============================================================================
// SECTION 1: TYPE DEFINITIONS
// ============================================================================

/**
 * Vision service configuration.
 */
export interface VisionServiceConfig {
  /** OCR confidence threshold 0-100 (default: 60) */
  confidenceThreshold: number;
  /** Tesseract language (default: 'eng') */
  language: string;
  /** OCR timeout in ms (default: 5000) */
  ocrTimeout: number;
  /** Cache TTL in ms (default: 2000) */
  cacheTtlMs: number;
  /** Max concurrent OCR operations (default: 2) */
  maxConcurrent: number;
  /** Pre-initialize worker (default: true) */
  preInitialize: boolean;
}

const DEFAULT_CONFIG: VisionServiceConfig = {
  confidenceThreshold: 60,
  language: 'eng',
  ocrTimeout: 5000,
  cacheTtlMs: 2000,
  maxConcurrent: 2,
  preInitialize: true
};

/**
 * OCR result with location data.
 */
export interface OCRResult {
  text: string;
  confidence: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  words: Array<{
    text: string;
    confidence: number;
    bbox: { x: number; y: number; width: number; height: number };
  }>;
  lineIndex: number;
}

/**
 * Vision click target.
 */
export interface VisionClickTarget {
  found: boolean;
  clickPoint?: { x: number; y: number };
  matchedText?: string;
  confidence: number;
  allMatches: OCRResult[];
  processingTime: number;
  error?: string;
}

/**
 * Conditional click configuration.
 */
export interface ConditionalClickConfig {
  searchTerms: string[];
  timeoutSeconds: number;
  pollIntervalMs: number;
  interactionType: 'click' | 'type' | 'dropdown';
  typeValue?: string;
}

/**
 * Conditional click result.
 */
export interface ConditionalClickResult {
  success: boolean;
  matchedTerm?: string;
  attempts: number;
  totalWaitTime: number;
  clickPoint?: { x: number; y: number };
  error?: string;
}

/**
 * Captured screenshot with metadata.
 */
export interface CapturedScreenshot {
  data: string;
  width: number;
  height: number;
  scale: number;
  timestamp: number;
  tabId: number;
}

/**
 * Cached OCR result.
 */
interface CachedOCR {
  screenshotId: string;
  results: OCRResult[];
  cachedAt: number;
  tabId: number;
}

/**
 * Vision service status.
 */
export type VisionServiceStatus = 'idle' | 'initializing' | 'ready' | 'processing' | 'error';

// ============================================================================
// SECTION 2: VISION SERVICE CLASS
// ============================================================================

export class VisionService {
  private config: VisionServiceConfig;
  private status: VisionServiceStatus = 'idle';
  private worker: Worker | null = null;
  private initPromise: Promise<void> | null = null;
  private ocrCache: Map<string, CachedOCR> = new Map();
  private processingQueue: Map<string, Promise<OCRResult[]>> = new Map();
  private concurrentCount = 0;
  private cdpService: CDPService | null = null;

  constructor(config?: Partial<VisionServiceConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (this.config.preInitialize) {
      this.initialize().catch(err => {
        console.error('[VisionService] Pre-initialization failed:', err);
      });
    }
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  async initialize(): Promise<void> {
    if (this.status === 'ready') return;

    if (this.initPromise) {
      return this.initPromise;
    }

    this.status = 'initializing';

    this.initPromise = (async () => {
      try {
        this.worker = await createWorker(this.config.language);
        this.status = 'ready';
        console.log('[VisionService] Initialized successfully');
      } catch (error) {
        this.status = 'error';
        console.error('[VisionService] Initialization failed:', error);
        throw error;
      }
    })();

    return this.initPromise;
  }

  async shutdown(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
    this.status = 'idle';
    this.ocrCache.clear();
    this.processingQueue.clear();
    this.initPromise = null;
    console.log('[VisionService] Shut down');
  }

  getStatus(): VisionServiceStatus {
    return this.status;
  }

  isReady(): boolean {
    return this.status === 'ready';
  }

  // ==========================================================================
  // SCREENSHOT CAPTURE
  // ==========================================================================

  async captureScreenshot(tabId: number): Promise<CapturedScreenshot> {
    const cdp = this.cdpService ?? getCDPService();

    // Ensure CDP is attached
    if (!cdp.isAttached(tabId)) {
      await cdp.attach(tabId);
    }

    const result = await cdp.captureScreenshot(tabId, { format: 'png' });

    if (!result.success || !result.result) {
      throw new Error(result.error ?? 'Screenshot capture failed');
    }

    // Get viewport dimensions
    const layoutResult = await cdp.sendCommand<{
      visualViewport: { clientWidth: number; clientHeight: number; scale: number };
    }>(tabId, 'Page.getLayoutMetrics');

    const viewport = layoutResult.result?.visualViewport ?? {
      clientWidth: 1920,
      clientHeight: 1080,
      scale: 1
    };

    return {
      data: result.result,
      width: viewport.clientWidth,
      height: viewport.clientHeight,
      scale: viewport.scale,
      timestamp: Date.now(),
      tabId
    };
  }

  // ==========================================================================
  // OCR OPERATIONS
  // ==========================================================================

  async performOCR(screenshot: CapturedScreenshot): Promise<OCRResult[]> {
    await this.initialize();

    if (!this.worker) {
      throw new Error('Vision service not initialized');
    }

    // Check cache
    const screenshotId = this.generateScreenshotId(screenshot);
    const cached = this.getCachedResults(screenshotId);
    if (cached) {
      return cached;
    }

    // Check if already processing
    const existing = this.processingQueue.get(screenshotId);
    if (existing) {
      return existing;
    }

    // Respect concurrency limit
    while (this.concurrentCount >= this.config.maxConcurrent) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.concurrentCount++;
    this.status = 'processing';

    const processPromise = (async (): Promise<OCRResult[]> => {
      try {
        const imageData = `data:image/png;base64,${screenshot.data}`;
        const { data } = await this.worker!.recognize(imageData);

        const results: OCRResult[] = data.lines.map((line, lineIndex) => ({
          text: line.text.trim(),
          confidence: line.confidence,
          bbox: this.scaleCoordinates(
            {
              x: line.bbox.x0,
              y: line.bbox.y0,
              width: line.bbox.x1 - line.bbox.x0,
              height: line.bbox.y1 - line.bbox.y0
            },
            screenshot.scale
          ),
          words: line.words.map(word => ({
            text: word.text,
            confidence: word.confidence,
            bbox: this.scaleCoordinates(
              {
                x: word.bbox.x0,
                y: word.bbox.y0,
                width: word.bbox.x1 - word.bbox.x0,
                height: word.bbox.y1 - word.bbox.y0
              },
              screenshot.scale
            )
          })),
          lineIndex
        }));

        // Cache results
        this.cacheResults(screenshotId, screenshot.tabId, results);

        return results;
      } finally {
        this.concurrentCount--;
        this.processingQueue.delete(screenshotId);
        if (this.concurrentCount === 0) {
          this.status = 'ready';
        }
      }
    })();

    this.processingQueue.set(screenshotId, processPromise);
    return processPromise;
  }

  async analyzeTab(tabId: number, useCache = true): Promise<OCRResult[]> {
    if (!useCache) {
      this.clearCache(tabId);
    }

    const screenshot = await this.captureScreenshot(tabId);
    return this.performOCR(screenshot);
  }

  // ==========================================================================
  // TEXT FINDING
  // ==========================================================================

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

    try {
      const results = await this.analyzeTab(tabId, options?.useCache ?? true);

      const matches = results.filter(
        r =>
          r.confidence >= this.config.confidenceThreshold &&
          this.matchText(r.text, searchText, options?.exact ?? false, options?.caseSensitive ?? false)
      );

      if (matches.length > 0) {
        const best = this.selectBestMatch(matches, searchText, options?.exact ?? false);

        return {
          found: true,
          clickPoint: {
            x: best.bbox.x + best.bbox.width / 2,
            y: best.bbox.y + best.bbox.height / 2
          },
          matchedText: best.text,
          confidence: best.confidence,
          allMatches: matches,
          processingTime: Date.now() - startTime
        };
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
        error: error instanceof Error ? error.message : 'Find text failed'
      };
    }
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
        const matches = results.filter(
          r =>
            r.confidence >= this.config.confidenceThreshold &&
            this.matchText(r.text, term, options?.exact ?? false, options?.caseSensitive ?? false)
        );

        if (matches.length > 0) {
          const best = matches[0];
          return {
            found: true,
            clickPoint: {
              x: best.bbox.x + best.bbox.width / 2,
              y: best.bbox.y + best.bbox.height / 2
            },
            matchedText: term,
            confidence: best.confidence,
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

  // ==========================================================================
  // VISION ACTIONS
  // ==========================================================================

  async visionClick(
    tabId: number,
    searchText: string,
    options?: {
      exact?: boolean;
      caseSensitive?: boolean;
      offsetX?: number;
      offsetY?: number;
    }
  ): Promise<{ success: boolean; clickPoint?: { x: number; y: number }; error?: string }> {
    const target = await this.findText(tabId, searchText, {
      exact: options?.exact,
      caseSensitive: options?.caseSensitive,
      useCache: false
    });

    if (!target.found || !target.clickPoint) {
      return { success: false, error: target.error ?? `Text "${searchText}" not found` };
    }

    const clickX = target.clickPoint.x + (options?.offsetX ?? 0);
    const clickY = target.clickPoint.y + (options?.offsetY ?? 0);

    await this.performClick(tabId, clickX, clickY);

    return { success: true, clickPoint: { x: clickX, y: clickY } };
  }

  async visionType(
    tabId: number,
    searchText: string,
    value: string
  ): Promise<{ success: boolean; error?: string }> {
    const clickResult = await this.visionClick(tabId, searchText, { offsetX: 50 });

    if (!clickResult.success) {
      return { success: false, error: clickResult.error };
    }

    await this.performType(tabId, value);

    return { success: true };
  }

  async conditionalClick(
    tabId: number,
    config: ConditionalClickConfig
  ): Promise<ConditionalClickResult> {
    const startTime = Date.now();
    const timeoutMs = config.timeoutSeconds * 1000;
    let attempts = 0;

    while (Date.now() - startTime < timeoutMs) {
      attempts++;
      this.clearCache(tabId);

      const result = await this.findAnyText(tabId, config.searchTerms, {
        exact: false,
        caseSensitive: false
      });

      if (result.found && result.clickPoint) {
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

      await new Promise(resolve => setTimeout(resolve, config.pollIntervalMs));
    }

    return {
      success: false,
      attempts,
      totalWaitTime: Date.now() - startTime,
      error: `Text not found after ${config.timeoutSeconds}s (${attempts} attempts)`
    };
  }

  // ==========================================================================
  // STRATEGY EVALUATION
  // ==========================================================================

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

    const metadata = strategy.metadata as Record<string, unknown> | undefined;
    const targetText = metadata?.targetText as string | undefined;

    if (!targetText) {
      return { success: false, confidence: 0 };
    }

    const result = await this.findText(tabId, targetText, {
      exact: false,
      caseSensitive: false,
      useCache: true
    });

    if (result.found && result.clickPoint) {
      return {
        success: true,
        confidence: result.confidence / 100,
        clickPoint: result.clickPoint,
        matchedText: result.matchedText
      };
    }

    return { success: false, confidence: 0 };
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private async performClick(tabId: number, x: number, y: number): Promise<void> {
    const cdp = this.cdpService ?? getCDPService();

    await cdp.dispatchMouseEvent(tabId, 'mousePressed', x, y, { button: 'left', clickCount: 1 });
    await cdp.dispatchMouseEvent(tabId, 'mouseReleased', x, y, { button: 'left', clickCount: 1 });
  }

  private async performType(tabId: number, text: string): Promise<void> {
    const cdp = this.cdpService ?? getCDPService();
    await cdp.insertText(tabId, text);
  }

  private matchText(value: string, pattern: string, exact: boolean, caseSensitive: boolean): boolean {
    if (!value) return false;

    const v = caseSensitive ? value : value.toLowerCase();
    const p = caseSensitive ? pattern : pattern.toLowerCase();

    return exact ? v.trim() === p.trim() : v.includes(p);
  }

  private selectBestMatch(matches: OCRResult[], searchText: string, _exact: boolean): OCRResult {
    return matches.sort((a, b) => {
      const aExact = a.text.toLowerCase().trim() === searchText.toLowerCase().trim();
      const bExact = b.text.toLowerCase().trim() === searchText.toLowerCase().trim();

      if (aExact && !bExact) return -1;
      if (bExact && !aExact) return 1;

      return b.confidence - a.confidence;
    })[0];
  }

  private generateScreenshotId(screenshot: CapturedScreenshot): string {
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
    this.pruneCache();
  }

  private pruneCache(): void {
    const cutoff = Date.now() - this.config.cacheTtlMs * 2;
    for (const [key, value] of Array.from(this.ocrCache)) {
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
      for (const [key, value] of Array.from(this.ocrCache)) {
        if (value.tabId === tabId) {
          this.ocrCache.delete(key);
        }
      }
    } else {
      this.ocrCache.clear();
    }
  }

  setCDPService(cdp: CDPService): void {
    this.cdpService = cdp;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let instance: VisionService | null = null;

export function getVisionService(cdpService?: CDPService): VisionService {
  if (!instance) {
    instance = new VisionService();
    if (cdpService) {
      instance.setCDPService(cdpService);
    }
  }
  return instance;
}
