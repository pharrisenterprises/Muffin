/**
 * VisionEngine Test Suite
 * 
 * Tests for VisionEngine initialization, screenshot capture,
 * OCR recognition, text finding, and coordinate clicking.
 * 
 * Build Cards: TST-001, TST-002, TST-003, TST-004, TST-005
 * 
 * - TST-001: VisionEngine initialization and lifecycle tests
 * - TST-002: Screenshot capture tests with mock Chrome APIs
 * - TST-003: OCR recognition tests with mock Tesseract.js
 * - TST-004: findText accuracy tests for text search
 * - TST-005: Coordinate click tests with message passing
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VisionEngine } from '../lib/visionEngine';
import { 
  resetAllMocks, 
  mockTesseractWorker, 
  mockChromeTabs,
  createMockOcrResult,
} from './setup';

// ============================================================================
// TST-001: VISIONENGINE INITIALIZATION TEST
// ============================================================================

describe('TST-001: VisionEngine Initialization', () => {
  let engine: VisionEngine;

  beforeEach(() => {
    resetAllMocks();
    engine = new VisionEngine();
  });

  afterEach(async () => {
    if (engine.isInitialized) {
      await engine.terminate();
    }
  });

  it('should initialize without errors', async () => {
    await expect(engine.initialize()).resolves.not.toThrow();
  });

  it('should set isInitialized to true after initialization', async () => {
    expect(engine.isInitialized).toBe(false);
    await engine.initialize();
    expect(engine.isInitialized).toBe(true);
  });

  it('should be safe to call initialize multiple times', async () => {
    await engine.initialize();
    await expect(engine.initialize()).resolves.not.toThrow();
    expect(engine.isInitialized).toBe(true);
  });

  it('should terminate without errors', async () => {
    await engine.initialize();
    await expect(engine.terminate()).resolves.not.toThrow();
  });

  it('should set isInitialized to false after termination', async () => {
    await engine.initialize();
    await engine.terminate();
    expect(engine.isInitialized).toBe(false);
  });

  it('should be safe to call terminate multiple times', async () => {
    await engine.initialize();
    await engine.terminate();
    await expect(engine.terminate()).resolves.not.toThrow();
  });

  it('should allow re-initialization after termination', async () => {
    await engine.initialize();
    await engine.terminate();
    await expect(engine.initialize()).resolves.not.toThrow();
    expect(engine.isInitialized).toBe(true);
  });

  it('should call Tesseract worker terminate on cleanup', async () => {
    await engine.initialize();
    await engine.terminate();
    expect(mockTesseractWorker.terminate).toHaveBeenCalled();
  });
});

// ============================================================================
// TST-002: SCREENSHOT CAPTURE TEST
// ============================================================================

describe('TST-002: Screenshot Capture', () => {
  let engine: VisionEngine;

  beforeEach(async () => {
    resetAllMocks();
    engine = new VisionEngine();
    await engine.initialize();
  });

  afterEach(async () => {
    await engine.terminate();
  });

  it('should capture screenshot successfully', async () => {
    const screenshot = await engine.captureScreenshot();
    expect(screenshot).toBeDefined();
    expect(screenshot.dataUrl).toContain('data:image/png;base64');
  });

  it('should call chrome.tabs.captureVisibleTab', async () => {
    await engine.captureScreenshot();
    expect(mockChromeTabs.captureVisibleTab).toHaveBeenCalled();
  });

  it('should capture specific tab when tabId provided', async () => {
    mockChromeTabs.get.mockImplementationOnce((_tabId: number, callback: any) => {
      callback({ id: 42, windowId: 5 });
    });
    await engine.captureScreenshot(42);
    expect(mockChromeTabs.get).toHaveBeenCalledWith(42, expect.any(Function));
  });

  it('should include timestamp in screenshot result', async () => {
    const before = Date.now();
    const screenshot = await engine.captureScreenshot();
    const after = Date.now();
    
    expect(screenshot.timestamp).toBeGreaterThanOrEqual(before);
    expect(screenshot.timestamp).toBeLessThanOrEqual(after);
  });

  it('should store last screenshot', async () => {
    const screenshot = await engine.captureScreenshot();
    const lastScreenshot = engine.getLastScreenshot();
    
    expect(lastScreenshot).toBeDefined();
    expect(lastScreenshot?.dataUrl).toBe(screenshot.dataUrl);
  });

  it('should throw if not initialized', async () => {
    await engine.terminate();
    await expect(engine.captureScreenshot()).rejects.toThrow();
  });
});

// ============================================================================
// TST-003: OCR RECOGNITION TEST
// ============================================================================

describe('TST-003: OCR Recognition', () => {
  let engine: VisionEngine;

  beforeEach(async () => {
    resetAllMocks();
    engine = new VisionEngine();
    await engine.initialize();
  });

  afterEach(async () => {
    await engine.terminate();
  });

  it('should recognize text from image', async () => {
    const results = await engine.recognizeText('data:image/png;base64,mockData');
    
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
  });

  it('should call Tesseract recognize', async () => {
    await engine.recognizeText('data:image/png;base64,mockData');
    expect(mockTesseractWorker.recognize).toHaveBeenCalled();
  });

  it('should return text results with confidence scores', async () => {
    const ocrResult = await engine.recognizeText('data:image/png;base64,mockData');
    
    expect(ocrResult.results.length).toBeGreaterThan(0);
    ocrResult.results.forEach(result => {
      expect(result.text).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });
  });

  it('should return bounding boxes for each word', async () => {
    const ocrResult = await engine.recognizeText('data:image/png;base64,mockData');
    
    ocrResult.results.forEach(result => {
      expect(result.bbox).toBeDefined();
      expect(result.bbox.x).toBeDefined();
      expect(result.bbox.y).toBeDefined();
      expect(result.bbox.width).toBeGreaterThan(0);
      expect(result.bbox.height).toBeGreaterThan(0);
    });
  });

  it('should filter results by confidence threshold', async () => {
    mockTesseractWorker.recognize.mockResolvedValueOnce(
      createMockOcrResult([
        { text: 'High', x: 100, y: 50, confidence: 95 },
        { text: 'Low', x: 200, y: 50, confidence: 30 },
      ])
    );

    // Default threshold is 60%
    const ocrResult = await engine.recognizeText('data:image/png;base64,mockData');
    
    expect(ocrResult.results.some(r => r.text === 'High')).toBe(true);
    expect(ocrResult.results.some(r => r.text === 'Low')).toBe(false);
  });

  it('should store last OCR results', async () => {
    await engine.recognizeText('data:image/png;base64,mockData');
    const lastResult = engine.getLastOcrResult();
    
    expect(lastResult).toBeDefined();
    expect(lastResult?.results).toBeDefined();
    expect(Array.isArray(lastResult?.results)).toBe(true);
  });

  it('should throw if not initialized', async () => {
    await engine.terminate();
    await expect(engine.recognizeText('data:image/png;base64,mockData')).rejects.toThrow();
  });
});

// ============================================================================
// TST-004: FINDTEXT ACCURACY TEST
// ============================================================================

describe('TST-004: findText Accuracy', () => {
  let engine: VisionEngine;

  beforeEach(async () => {
    resetAllMocks();
    engine = new VisionEngine();
    await engine.initialize();
  });

  afterEach(async () => {
    await engine.terminate();
  });

  it('should find exact text match', async () => {
    const result = await engine.findText('Allow');
    
    expect(result).not.toBeNull();
    expect(result?.text).toBe('Allow');
  });

  it('should return click coordinates for found text', async () => {
    const result = await engine.findText('Allow');
    
    expect(result).not.toBeNull();
    expect(result?.x).toBeDefined();
    expect(result?.y).toBeDefined();
  });

  it('should find case-insensitive match by default', async () => {
    mockTesseractWorker.recognize.mockResolvedValueOnce(
      createMockOcrResult([
        { text: 'ALLOW', x: 100, y: 50, confidence: 95 },
      ])
    );

    const result = await engine.findText('allow');
    expect(result).not.toBeNull();
  });

  it('should find partial match by default', async () => {
    mockTesseractWorker.recognize.mockResolvedValueOnce(
      createMockOcrResult([
        { text: 'AllowAccess', x: 100, y: 50, confidence: 95 },
      ])
    );

    const result = await engine.findText('Allow');
    expect(result).not.toBeNull();
  });

  it('should return null when text not found', async () => {
    mockTesseractWorker.recognize.mockResolvedValueOnce(
      createMockOcrResult([
        { text: 'Different', x: 100, y: 50, confidence: 95 },
      ])
    );

    const result = await engine.findText('Allow');
    expect(result).toBeNull();
  });

  it('should find first matching term from array', async () => {
    mockTesseractWorker.recognize.mockResolvedValueOnce(
      createMockOcrResult([
        { text: 'Keep', x: 100, y: 50, confidence: 95 },
        { text: 'Allow', x: 200, y: 50, confidence: 90 },
      ])
    );

    const result = await engine.findText('Allow');
    // Should find first term in search array that matches
    expect(result).not.toBeNull();
  });

  it('should include confidence score in result', async () => {
    const result = await engine.findText('Allow');
    
    expect(result).not.toBeNull();
    expect(result?.confidence).toBeDefined();
    expect(result?.confidence).toBeGreaterThan(0);
  });

  it('should throw if not initialized', async () => {
    await engine.terminate();
    await expect(engine.findText('Allow')).rejects.toThrow();
  });
});

// ============================================================================
// TST-005: COORDINATE CLICK TEST
// ============================================================================

describe('TST-005: Coordinate Click', () => {
  let engine: VisionEngine;

  beforeEach(async () => {
    resetAllMocks();
    engine = new VisionEngine();
    await engine.initialize();
  });

  afterEach(async () => {
    await engine.terminate();
  });

  it('should click at specified coordinates', async () => {
    mockChromeTabs.sendMessage.mockImplementationOnce((_tabId, _message, callback) => {
      if (callback) callback({ success: true });
    });
    
    const result = await engine.clickAtCoordinates(100, 50, 1);
    expect(result).toBe(true);
  });

  it('should send VISION_CLICK message to content script', async () => {
    await engine.clickAtCoordinates(150, 75, 1);
    
    expect(mockChromeTabs.sendMessage).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        type: 'VISION_CLICK',
        x: 150,
        y: 75,
      }),
      expect.any(Function)
    );
  });

  it('should return false if click fails', async () => {
    mockChromeTabs.sendMessage.mockImplementationOnce((_tabId, _message, callback) => {
      callback({ success: false, error: 'No element at coordinates' });
    });
    
    const result = await engine.clickAtCoordinates(999, 999, 1);
    expect(result).toBe(false);
  });

  it('should handle chrome.runtime.lastError', async () => {
    mockChromeTabs.sendMessage.mockImplementationOnce((_tabId, _message, callback) => {
      (chrome.runtime as any).lastError = { message: 'Tab not found' };
      callback(undefined);
      (chrome.runtime as any).lastError = null;
    });
    
    const result = await engine.clickAtCoordinates(100, 50, 999);
    expect(result).toBe(false);
  });
});

// ============================================================================
// ADDITIONAL TESTS: TYPE TEXT
// ============================================================================

describe('VisionEngine: typeText', () => {
  let engine: VisionEngine;

  beforeEach(async () => {
    resetAllMocks();
    engine = new VisionEngine();
    await engine.initialize();
  });

  afterEach(async () => {
    await engine.terminate();
  });

  it('should type text successfully', async () => {
    mockChromeTabs.sendMessage.mockImplementationOnce((_tabId, _message, callback) => {
      if (callback) callback({ success: true });
    });
    
    const result = await engine.typeText(1, 'Hello World');
    expect(result).toBe(true);
  });

  it('should send VISION_TYPE message', async () => {
    await engine.typeText(1, 'Test input');
    
    expect(mockChromeTabs.sendMessage).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        type: 'VISION_TYPE',
        text: 'Test input',
      }),
      expect.any(Function)
    );
  });
});

// ============================================================================
// ADDITIONAL TESTS: CONFIGURATION
// ============================================================================

describe('VisionEngine: Configuration', () => {
  let engine: VisionEngine;

  beforeEach(async () => {
    resetAllMocks();
    engine = new VisionEngine();
    await engine.initialize();
  });

  afterEach(async () => {
    await engine.terminate();
  });

  it('should return default configuration', () => {
    const config = engine.getConfig();
    
    expect(config.confidenceThreshold).toBe(60);
    expect(config.pollIntervalMs).toBe(1000);
    expect(config.language).toBe('eng');
  });

  it('should allow updating configuration', () => {
    engine.setConfig({ confidenceThreshold: 80 });
    
    const config = engine.getConfig();
    expect(config.confidenceThreshold).toBe(80);
  });

  it('should preserve other config values when updating', () => {
    engine.setConfig({ confidenceThreshold: 80 });
    
    const config = engine.getConfig();
    expect(config.pollIntervalMs).toBe(1000); // Unchanged
    expect(config.language).toBe('eng'); // Unchanged
  });
});
