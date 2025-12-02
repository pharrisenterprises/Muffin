/**
 * VisionEngine - Core OCR and Vision-based Automation Engine
 * 
 * Provides screenshot capture, text recognition, text search,
 * coordinate-based clicking, and conditional polling capabilities.
 * 
 * Uses Tesseract.js for OCR processing.
 * 
 * @example
 * ```typescript
 * import { visionEngine } from './lib/visionEngine';
 * 
 * await visionEngine.initialize();
 * const screenshot = await visionEngine.captureScreenshot();
 * const results = await visionEngine.recognizeText(screenshot);
 * const target = await visionEngine.findText(['Allow', 'Keep']);
 * if (target) {
 *   await visionEngine.clickAtCoordinates(target.x, target.y);
 * }
 * await visionEngine.terminate();
 * ```
 */

import Tesseract from 'tesseract.js';
import type {
  VisionConfig,
  TextResult,
  ClickTarget,
  ConditionalClickResult,
  ConditionalConfig,
  QuickScanResult,
} from '../types/vision';
import { DEFAULT_VISION_CONFIG } from './defaults';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Screenshot result from capture.
 */
export interface Screenshot {
  /** Base64-encoded PNG data URL */
  dataUrl: string;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** Timestamp when captured */
  timestamp: number;
}

/**
 * Options for text search.
 */
export interface FindTextOptions {
  /** Use case-insensitive matching. Default: true */
  caseSensitive?: boolean;
  /** Use partial/substring matching. Default: true */
  partialMatch?: boolean;
  /** Minimum confidence threshold override */
  confidenceThreshold?: number;
  /** Maximum results to return (for findAllText) */
  maxResults?: number;
}

/**
 * Event types emitted by VisionEngine.
 */
export type VisionEngineEvent =
  | 'initialized'
  | 'terminated'
  | 'screenshot'
  | 'ocr-complete'
  | 'text-found'
  | 'click'
  | 'conditionalStart'
  | 'conditionalClick'
  | 'conditionalComplete'
  | 'quickScanClick'
  | 'error';

// ============================================================================
// VISION ENGINE CLASS
// ============================================================================

/**
 * VisionEngine class for OCR-based automation.
 * 
 * Singleton pattern - use the exported `visionEngine` instance.
 */
export class VisionEngine {
  private worker: Tesseract.Worker | null = null;
  private isInit: boolean = false;
  private config: VisionConfig;
  private lastScreenshot: Screenshot | null = null;
  private lastOcrResults: TextResult[] = [];
  private eventListeners: Map<VisionEngineEvent, Set<(...args: unknown[]) => void>> = new Map();

  constructor(config?: Partial<VisionConfig>) {
    this.config = { ...DEFAULT_VISION_CONFIG, ...config };
  }

  // ==========================================================================
  // LIFECYCLE METHODS
  // ==========================================================================

  /**
   * Initialize the Vision Engine.
   * Creates and configures the Tesseract.js worker.
   * 
   * Safe to call multiple times - will no-op if already initialized.
   */
  async initialize(): Promise<void> {
    if (this.isInit) {
      this.log('Already initialized, skipping');
      return;
    }

    this.log('Initializing Vision Engine...');

    try {
      // Create Tesseract worker with English language
      this.worker = await Tesseract.createWorker(this.config.language || 'eng', 1, {
        logger: this.config.debugMode 
          ? (m) => this.log(`[Tesseract] ${m.status}: ${Math.round((m.progress || 0) * 100)}%`)
          : undefined,
      });

      this.isInit = true;
      this.emit('initialized');
      this.log('Vision Engine ready ✓');
    } catch (error) {
      this.logError('Failed to initialize Vision Engine', error);
      throw new Error(`VisionEngine initialization failed: ${error}`);
    }
  }

  /**
   * Terminate the Vision Engine.
   * Releases the Tesseract.js worker and cleans up resources.
   * 
   * Safe to call multiple times - will no-op if not initialized.
   */
  async terminate(): Promise<void> {
    if (!this.isInit || !this.worker) {
      this.log('Not initialized, skipping termination');
      return;
    }

    this.log('Terminating Vision Engine...');

    try {
      await this.worker.terminate();
      this.worker = null;
      this.isInit = false;
      this.lastScreenshot = null;
      this.lastOcrResults = [];
      this.emit('terminated');
      this.log('Vision Engine terminated ✓');
    } catch (error) {
      this.logError('Error during termination', error);
      // Still mark as terminated even if cleanup fails
      this.worker = null;
      this.isInit = false;
    }
  }

  /**
   * Check if the engine is initialized and ready.
   */
  get isInitialized(): boolean {
    return this.isInit;
  }

  /**
   * Get current configuration.
   */
  getConfig(): VisionConfig {
    return { ...this.config };
  }

  /**
   * Update configuration.
   */
  setConfig(config: Partial<VisionConfig>): void {
    this.config = { ...this.config, ...config };
    this.log(`Config updated: ${JSON.stringify(config)}`);
  }

  // ==========================================================================
  // SCREENSHOT METHODS
  // ==========================================================================

  /**
   * Capture a screenshot of the visible tab.
   * 
   * @param tabId - Optional tab ID. Uses active tab if not specified.
   * @returns Screenshot data including base64 data URL
   */
  async captureScreenshot(tabId?: number): Promise<Screenshot> {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const captureOptions: chrome.tabs.CaptureVisibleTabOptions = {
        format: 'png',
        quality: 100,
      };

      const handleCapture = (dataUrl: string | undefined) => {
        if (chrome.runtime.lastError) {
          const error = chrome.runtime.lastError.message || 'Unknown capture error';
          this.logError('Screenshot capture failed', error);
          reject(new Error(`Screenshot capture failed: ${error}`));
          return;
        }

        if (!dataUrl) {
          reject(new Error('Screenshot capture returned empty data'));
          return;
        }

        // Get image dimensions
        const img = new Image();
        img.onload = () => {
          const screenshot: Screenshot = {
            dataUrl,
            width: img.width,
            height: img.height,
            timestamp: Date.now(),
          };

          this.lastScreenshot = screenshot;
          this.emit('screenshot', screenshot);
          this.log(`Screenshot captured: ${img.width}x${img.height}`);
          resolve(screenshot);
        };
        img.onerror = () => {
          // Still return screenshot even if we can't get dimensions
          const screenshot: Screenshot = {
            dataUrl,
            width: 0,
            height: 0,
            timestamp: Date.now(),
          };
          this.lastScreenshot = screenshot;
          resolve(screenshot);
        };
        img.src = dataUrl;
      };

      // Capture the visible tab
      if (tabId !== undefined) {
        // For specific tab, we need to get the window ID first
        chrome.tabs.get(tabId, (tab) => {
          if (chrome.runtime.lastError || !tab.windowId) {
            reject(new Error('Could not get tab window'));
            return;
          }
          chrome.tabs.captureVisibleTab(tab.windowId, captureOptions, handleCapture);
        });
      } else {
        // Capture current window's visible tab
        chrome.tabs.captureVisibleTab(captureOptions, handleCapture);
      }
    });
  }

  /**
   * Get the last captured screenshot.
   */
  getLastScreenshot(): Screenshot | null {
    return this.lastScreenshot;
  }

  // ==========================================================================
  // OCR METHODS
  // ==========================================================================

  /**
   * Perform OCR on an image and extract text with positions.
   * 
   * @param imageData - Base64 data URL or Screenshot object
   * @returns Array of text results with positions and confidence
   */
  async recognizeText(imageData: string | Screenshot): Promise<TextResult[]> {
    this.ensureInitialized();

    const dataUrl = typeof imageData === 'string' ? imageData : imageData.dataUrl;

    this.log('Starting OCR recognition...');
    const startTime = Date.now();

    try {
      const result = await this.worker!.recognize(dataUrl);
      const words = result.data.words || [];

      // Convert Tesseract results to our format
      const textResults: TextResult[] = words
        .map((word): TextResult | null => {
          const confidence = word.confidence;
          const bbox = word.bbox;

          // Skip low-confidence results
          if (confidence < this.config.confidenceThreshold) {
            return null;
          }

          // Skip empty or whitespace-only text
          const text = word.text.trim();
          if (!text) {
            return null;
          }

          const width = bbox.x1 - bbox.x0;
          const height = bbox.y1 - bbox.y0;

          return {
            text,
            confidence,
            bounds: {
              x: bbox.x0,
              y: bbox.y0,
              width,
              height,
              centerX: bbox.x0 + width / 2,
              centerY: bbox.y0 + height / 2,
            },
          };
        })
        .filter((r): r is TextResult => r !== null);

      this.lastOcrResults = textResults;
      const duration = Date.now() - startTime;
      this.log(`OCR complete: ${textResults.length} words found in ${duration}ms`);
      this.emit('ocr-complete', textResults);

      return textResults;
    } catch (error) {
      this.logError('OCR recognition failed', error);
      throw new Error(`OCR recognition failed: ${error}`);
    }
  }

  /**
   * Get the last OCR results.
   */
  getLastOcrResults(): TextResult[] {
    return [...this.lastOcrResults];
  }

  // ==========================================================================
  // TEXT SEARCH METHODS
  // ==========================================================================

  /**
   * Find the first occurrence of text matching any of the search terms.
   * 
   * @param searchTerms - Array of text strings to search for
   * @param options - Search options
   * @returns Click target with coordinates, or null if not found
   */
  async findText(
    searchTerms: string[],
    options: FindTextOptions = {}
  ): Promise<ClickTarget | null> {
    this.ensureInitialized();

    const {
      caseSensitive = false,
      partialMatch = true,
      confidenceThreshold = this.config.confidenceThreshold,
    } = options;

    // Capture and recognize if we don't have recent results
    const screenshot = await this.captureScreenshot();
    const results = await this.recognizeText(screenshot);

    // Filter by confidence threshold override
    const filteredResults = results.filter(r => r.confidence >= confidenceThreshold);

    // Search for matching text
    for (const term of searchTerms) {
      const normalizedTerm = caseSensitive ? term : term.toLowerCase();

      for (const result of filteredResults) {
        const normalizedText = caseSensitive ? result.text : result.text.toLowerCase();

        const matches = partialMatch
          ? normalizedText.includes(normalizedTerm) || normalizedTerm.includes(normalizedText)
          : normalizedText === normalizedTerm;

        if (matches) {
          const target: ClickTarget = {
            text: result.text,
            x: result.bounds.centerX,
            y: result.bounds.centerY,
            confidence: result.confidence,
          };

          this.log(`Found text "${result.text}" at (${target.x}, ${target.y})`);
          this.emit('text-found', target);
          return target;
        }
      }
    }

    this.log(`Text not found: ${searchTerms.join(', ')}`);
    return null;
  }

  /**
   * Find all occurrences of text matching any of the search terms.
   * 
   * @param searchTerms - Array of text strings to search for
   * @param options - Search options
   * @returns Array of click targets
   */
  async findAllText(
    searchTerms: string[],
    options: FindTextOptions = {}
  ): Promise<ClickTarget[]> {
    this.ensureInitialized();

    const {
      caseSensitive = false,
      partialMatch = true,
      confidenceThreshold = this.config.confidenceThreshold,
      maxResults = 100,
    } = options;

    // Capture and recognize
    const screenshot = await this.captureScreenshot();
    const results = await this.recognizeText(screenshot);

    // Filter by confidence threshold
    const filteredResults = results.filter(r => r.confidence >= confidenceThreshold);

    const targets: ClickTarget[] = [];

    for (const term of searchTerms) {
      if (targets.length >= maxResults) break;

      const normalizedTerm = caseSensitive ? term : term.toLowerCase();

      for (const result of filteredResults) {
        if (targets.length >= maxResults) break;

        const normalizedText = caseSensitive ? result.text : result.text.toLowerCase();

        const matches = partialMatch
          ? normalizedText.includes(normalizedTerm) || normalizedTerm.includes(normalizedText)
          : normalizedText === normalizedTerm;

        if (matches) {
          // Avoid duplicates at same position
          const isDuplicate = targets.some(
            t => Math.abs(t.x - result.bounds.centerX) < 10 &&
                 Math.abs(t.y - result.bounds.centerY) < 10
          );

          if (!isDuplicate) {
            targets.push({
              text: result.text,
              x: result.bounds.centerX,
              y: result.bounds.centerY,
              confidence: result.confidence,
            });
          }
        }
      }
    }

    this.log(`Found ${targets.length} matches for: ${searchTerms.join(', ')}`);
    return targets;
  }

  /**
   * Search for text with scrolling if not immediately visible.
   * 
   * @param searchTerms - Text to search for
   * @param tabId - Tab ID for sending scroll commands
   * @returns Click target or null if not found after all scroll attempts
   */
  async findTextWithScroll(
    searchTerms: string[],
    tabId: number
  ): Promise<ClickTarget | null> {
    this.ensureInitialized();

    // Try without scrolling first
    let target = await this.findText(searchTerms);
    if (target) return target;

    // Try scrolling down
    for (let i = 0; i < this.config.scrollRetries; i++) {
      this.log(`Scroll attempt ${i + 1}/${this.config.scrollRetries}`);
      
      await this.sendScrollCommand(tabId, 'down');
      await this.delay(500); // Wait for scroll animation
      
      target = await this.findText(searchTerms);
      if (target) return target;
    }

    // Scroll back to top and try scrolling up (in case we started mid-page)
    await this.sendScrollCommand(tabId, 'top');
    await this.delay(500);

    this.log('Text not found after scrolling');
    return null;
  }

  // ==========================================================================
  // INTERACTION METHODS (via Content Script)
  // ==========================================================================

  /**
   * Click at specific screen coordinates.
   * Sends a message to the content script to perform the click.
   * 
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param tabId - Tab ID where click should occur
   * @returns True if click was successful
   */
  async clickAtCoordinates(x: number, y: number, tabId: number): Promise<boolean> {
    this.log(`Clicking at (${x}, ${y}) in tab ${tabId}`);

    return new Promise((resolve) => {
      chrome.tabs.sendMessage(
        tabId,
        { type: 'VISION_CLICK', x, y },
        (response) => {
          if (chrome.runtime.lastError) {
            this.logError('Click failed', chrome.runtime.lastError.message);
            resolve(false);
            return;
          }

          const success = response?.success === true;
          if (success) {
            this.emit('click', { x, y, tabId });
          }
          resolve(success);
        }
      );
    });
  }

  /**
   * Type text into the currently focused element.
   * 
   * @param text - Text to type
   * @param tabId - Tab ID
   * @returns True if typing was successful
   */
  async typeText(text: string, tabId: number): Promise<boolean> {
    this.log(`Typing "${text.substring(0, 20)}..." in tab ${tabId}`);

    return new Promise((resolve) => {
      chrome.tabs.sendMessage(
        tabId,
        { type: 'VISION_TYPE', text },
        (response) => {
          if (chrome.runtime.lastError) {
            this.logError('Type failed', chrome.runtime.lastError.message);
            resolve(false);
            return;
          }

          resolve(response?.success === true);
        }
      );
    });
  }

  /**
   * Send keyboard keys/shortcuts.
   * 
   * @param key - Key to send (e.g., 'Enter', 'Tab', 'Escape')
   * @param tabId - Tab ID
   * @param modifiers - Optional modifier keys
   * @returns True if key was sent successfully
   */
  async sendKeys(
    key: string,
    tabId: number,
    modifiers?: { ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean }
  ): Promise<boolean> {
    this.log(`Sending key "${key}" in tab ${tabId}`);

    return new Promise((resolve) => {
      chrome.tabs.sendMessage(
        tabId,
        {
          type: 'VISION_KEY',
          key,
          modifiers: {
            ctrlKey: modifiers?.ctrl || false,
            shiftKey: modifiers?.shift || false,
            altKey: modifiers?.alt || false,
            metaKey: modifiers?.meta || false,
          },
        },
        (response) => {
          if (chrome.runtime.lastError) {
            this.logError('SendKeys failed', chrome.runtime.lastError.message);
            resolve(false);
            return;
          }

          resolve(response?.success === true);
        }
      );
    });
  }

  /**
   * Click at coordinates and then type text.
   * 
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param text - Text to type after clicking
   * @param tabId - Tab ID
   * @returns True if both click and type succeeded
   */
  async clickAndType(x: number, y: number, text: string, tabId: number): Promise<boolean> {
    const clicked = await this.clickAtCoordinates(x, y, tabId);
    if (!clicked) return false;

    // Small delay to let focus settle
    await this.delay(100);

    return await this.typeText(text, tabId);
  }

  // ==========================================================================
  // CONDITIONAL CLICK (POLLING LOOP)
  // ==========================================================================

  /**
   * Wait for and click buttons matching search terms.
   * Polls the screen repeatedly until timeout.
   * 
   * This is the core method for handling dynamic approval dialogs (ENG-014).
   * Resets timeout after each successful click.
   * 
   * @param config - Conditional click configuration
   * @param tabId - Tab ID for clicking
   * @param onButtonClick - Optional callback when a button is clicked
   * @returns Result with count of buttons clicked and timeout status
   */
  async waitAndClickButtons(
    config: ConditionalConfig,
    tabId: number,
    onButtonClick?: (text: string, count: number) => void
  ): Promise<ConditionalClickResult> {
    this.ensureInitialized();

    const {
      searchTerms,
      timeoutSeconds,
      pollIntervalMs,
    } = config;

    const startTime = Date.now();
    let lastClickTime = Date.now();
    let buttonsClicked = 0;
    const clickedTexts: string[] = [];

    this.log(`Starting conditional polling for: ${searchTerms.join(', ')}`);
    this.log(`Timeout: ${timeoutSeconds}s after last click, Poll interval: ${pollIntervalMs}ms`);

    // Emit start event
    this.emit('conditionalStart', {
      buttonTexts: searchTerms,
      timeoutSeconds,
    });

    while (true) {
      // Check timeout (time since last successful click)
      const timeSinceLastClick = (Date.now() - lastClickTime) / 1000;
      if (timeSinceLastClick >= timeoutSeconds) {
        this.log(`Conditional timeout after ${buttonsClicked} clicks`);
        
        // Emit complete event
        this.emit('conditionalComplete', {
          buttonsClicked: clickedTexts,
          terminationReason: 'timeout',
          duration: Date.now() - startTime,
        });
        
        return {
          buttonsClicked,
          timedOut: true,
          duration: Date.now() - startTime,
          clickedTexts,
        };
      }

      // Search for button
      const target = await this.findText(searchTerms);

      if (target) {
        // Click the found button
        const clicked = await this.clickAtCoordinates(target.x, target.y, tabId);

        if (clicked) {
          buttonsClicked++;
          lastClickTime = Date.now(); // Reset timeout on successful click
          clickedTexts.push(target.text);

          this.log(`Clicked button "${target.text}" (${buttonsClicked} total)`);
          
          // Emit click event
          this.emit('conditionalClick', {
            buttonText: target.text,
            clickCount: buttonsClicked,
          });
          
          onButtonClick?.(target.text, buttonsClicked);

          // Small delay after click before next poll (let UI update)
          await this.delay(500);
        }
      } else {
        const remaining = Math.round(timeoutSeconds - timeSinceLastClick);
        this.log(`No buttons found. Timeout in ${remaining}s`);
      }

      // Wait before next poll
      await this.delay(pollIntervalMs);
    }
  }

  // ==========================================================================
  // AUTO-DETECTION FAILSAFE (ENG-015)
  // ==========================================================================

  /**
   * Quick scan for approval buttons and click if found.
   * This is a single-attempt scan (no polling) used as a failsafe
   * between steps during playback.
   * 
   * @param searchTerms - Button texts to search for (e.g., ["Allow", "Keep", "Continue"])
   * @param tabId - Tab ID for clicking
   * @param confidenceThreshold - Minimum confidence for match (default: use config)
   * @returns Result indicating if a button was found and clicked
   */
  async quickScanAndClick(
    searchTerms: string[],
    tabId: number,
    confidenceThreshold?: number
  ): Promise<QuickScanResult> {
    if (!this.isInit) {
      return { found: false, clicked: false };
    }
    
    const threshold = confidenceThreshold ?? this.config.confidenceThreshold;
    
    this.log(`Quick scan for: ${searchTerms.join(', ')}`);
    
    try {
      // Capture screenshot
      const screenshot = await this.captureScreenshot(tabId);
      
      // Run OCR
      const ocrResults = await this.recognizeText(screenshot.dataUrl);
      
      // Search for any matching button text
      for (const searchTerm of searchTerms) {
        const searchLower = searchTerm.toLowerCase();
        
        // Find matching word with sufficient confidence
        const match = ocrResults.find(
          result => result.text.toLowerCase().includes(searchLower) &&
                    result.confidence >= threshold
        );
        
        if (match) {
          // Calculate click coordinates (center of bounding box)
          const clickX = match.bounds.x + match.bounds.width / 2;
          const clickY = match.bounds.y + match.bounds.height / 2;
          
          this.log(`Quick scan found "${searchTerm}" at (${clickX}, ${clickY})`);
          
          // Click the button
          const clicked = await this.clickAtCoordinates(clickX, clickY, tabId);
          
          if (clicked) {
            this.log(`Quick scan clicked "${searchTerm}"`);
            
            // Emit event for monitoring
            this.emit('quickScanClick', {
              buttonText: searchTerm,
              matchedText: match.text,
              confidence: match.confidence,
            });
            
            // Brief pause for UI to respond
            await this.delay(300);
            
            return {
              found: true,
              clicked: true,
              buttonText: searchTerm,
              matchedText: match.text,
              confidence: match.confidence,
            };
          } else {
            this.logError(`Quick scan found but failed to click "${searchTerm}"`);
            return {
              found: true,
              clicked: false,
              buttonText: searchTerm,
              matchedText: match.text,
              confidence: match.confidence,
              error: 'Click failed',
            };
          }
        }
      }
      
      // No matching buttons found
      this.log('Quick scan: no buttons found');
      return {
        found: false,
        clicked: false,
      };
      
    } catch (error) {
      this.logError('Quick scan error', error);
      return {
        found: false,
        clicked: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Run auto-detection failsafe using recording's conditional defaults.
   * Called after each step completes, before global delay.
   * 
   * @param conditionalDefaults - The recording's default conditional config
   * @param tabId - Tab ID for clicking
   * @returns Result of quick scan
   */
  async runAutoDetection(
    conditionalDefaults: ConditionalConfig | null | undefined,
    tabId: number
  ): Promise<QuickScanResult> {
    // Skip if no defaults configured or not initialized
    if (!this.isInit || !conditionalDefaults || !conditionalDefaults.searchTerms?.length) {
      return { found: false, clicked: false };
    }
    
    this.log('Running auto-detection failsafe');
    
    return this.quickScanAndClick(
      conditionalDefaults.searchTerms,
      tabId,
      this.config.confidenceThreshold
    );
  }

  /**
   * Quick single-attempt detection and click (legacy method).
   * Maintained for backward compatibility.
   * 
   * @param searchTerms - Button text to look for
   * @param tabId - Tab ID
   * @returns True if a button was found and clicked
   */
  async quickDetectAndClick(searchTerms: string[], tabId: number): Promise<boolean> {
    const result = await this.quickScanAndClick(searchTerms, tabId);
    return result.clicked;
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Send scroll command to content script.
   */
  private async sendScrollCommand(
    tabId: number,
    direction: 'up' | 'down' | 'top' | 'bottom'
  ): Promise<void> {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(
        tabId,
        { type: 'VISION_SCROLL', direction, amount: 500 },
        () => {
          if (chrome.runtime.lastError) {
            this.logError('Scroll failed', chrome.runtime.lastError.message);
          }
          resolve();
        }
      );
    });
  }

  /**
   * Ensure the engine is initialized before use.
   */
  private ensureInitialized(): void {
    if (!this.isInit || !this.worker) {
      throw new Error('VisionEngine not initialized. Call initialize() first.');
    }
  }

  /**
   * Promise-based delay helper.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Log a message (respects debugMode).
   */
  private log(message: string): void {
    if (this.config.debugMode) {
      console.log(`[VisionEngine] ${message}`);
    }
  }

  /**
   * Log an error.
   */
  private logError(message: string, error?: unknown): void {
    console.error(`[VisionEngine] ${message}`, error);
    this.emit('error', { message, error });
  }

  // ==========================================================================
  // EVENT EMITTER METHODS
  // ==========================================================================

  /**
   * Add event listener.
   */
  on(event: VisionEngineEvent, listener: (...args: unknown[]) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);
  }

  /**
   * Remove event listener.
   */
  off(event: VisionEngineEvent, listener: (...args: unknown[]) => void): void {
    this.eventListeners.get(event)?.delete(listener);
  }

  /**
   * Emit event to listeners.
   */
  private emit(event: VisionEngineEvent, ...args: unknown[]): void {
    this.eventListeners.get(event)?.forEach((listener) => {
      try {
        listener(...args);
      } catch (error) {
        console.error(`[VisionEngine] Event listener error for ${event}:`, error);
      }
    });
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/**
 * Singleton VisionEngine instance.
 * Use this for global access throughout the extension.
 */
export const visionEngine = new VisionEngine();
