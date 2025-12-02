/**
 * Test Setup
 * 
 * Configures the test environment with mocks for Chrome APIs
 * and other browser-specific functionality.
 */

import { vi } from 'vitest';

// ============================================================================
// CHROME API MOCKS
// ============================================================================

/**
 * Mock chrome.tabs API
 */
const mockChromeTabs = {
  captureVisibleTab: vi.fn().mockImplementation((_windowIdOrOptions: any, optionsOrCallback?: any, callback?: any) => {
    // Handle overload: (windowId, options, callback) or (options, callback)
    const cb = callback || (typeof optionsOrCallback === 'function' ? optionsOrCallback : undefined);
    if (cb) {
      setTimeout(() => cb('data:image/png;base64,mockImageData'), 0);
    }
  }),
  get: vi.fn().mockImplementation((tabId: number, callback: any) => {
    if (callback) {
      setTimeout(() => callback({ id: tabId, windowId: 1, url: 'https://example.com' }), 0);
    }
  }),
  sendMessage: vi.fn().mockImplementation((_tabId: number, _message: any, callback?: any) => {
    if (callback) {
      setTimeout(() => callback({ success: true }), 0);
    }
  }),
  update: vi.fn().mockResolvedValue({ id: 1 }),
  query: vi.fn().mockResolvedValue([{ id: 1, active: true }]),
};

/**
 * Mock chrome.runtime API
 */
const mockChromeRuntime = {
  sendMessage: vi.fn().mockResolvedValue({ success: true }),
  onMessage: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
  lastError: null,
};

/**
 * Mock chrome.scripting API
 */
const mockChromeScripting = {
  executeScript: vi.fn().mockResolvedValue([{ result: true }]),
};

/**
 * Mock chrome.storage API
 */
const mockChromeStorage = {
  local: {
    get: vi.fn().mockResolvedValue({}),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  },
};

/**
 * Complete mock chrome object
 */
const mockChrome = {
  tabs: mockChromeTabs,
  runtime: mockChromeRuntime,
  scripting: mockChromeScripting,
  storage: mockChromeStorage,
};

// Assign to global
(globalThis as any).chrome = mockChrome;

// ============================================================================
// TESSERACT MOCK
// ============================================================================

/**
 * Mock Tesseract.js worker
 */
export const mockTesseractWorker = {
  recognize: vi.fn().mockResolvedValue({
    data: {
      text: 'Mock OCR Text',
      confidence: 95,
      words: [
        {
          text: 'Allow',
          confidence: 98,
          bbox: { x0: 100, y0: 50, x1: 150, y1: 70 },
        },
        {
          text: 'Keep',
          confidence: 96,
          bbox: { x0: 200, y0: 50, x1: 250, y1: 70 },
        },
        {
          text: 'Cancel',
          confidence: 94,
          bbox: { x0: 300, y0: 50, x1: 360, y1: 70 },
        },
      ],
    },
  }),
  terminate: vi.fn().mockResolvedValue(undefined),
  load: vi.fn().mockResolvedValue(undefined),
  loadLanguage: vi.fn().mockResolvedValue(undefined),
  initialize: vi.fn().mockResolvedValue(undefined),
};

/**
 * Mock Tesseract module
 */
vi.mock('tesseract.js', () => ({
  default: {
    createWorker: vi.fn().mockResolvedValue(mockTesseractWorker),
  },
  createWorker: vi.fn().mockResolvedValue(mockTesseractWorker),
}));

// ============================================================================
// IMAGE API MOCK
// ============================================================================

/**
 * Mock Image class for dimensions
 */
class MockImage {
  width = 1920;
  height = 1080;
  onload: (() => void) | null = null;
  onerror: ((error: Error) => void) | null = null;
  src = '';

  constructor() {
    // Simulate async image load
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
}

(globalThis as any).Image = MockImage;

// ============================================================================
// DOM MOCKS
// ============================================================================

/**
 * Mock document.elementFromPoint
 */
document.elementFromPoint = vi.fn().mockReturnValue({
  tagName: 'BUTTON',
  textContent: 'Click Me',
  getBoundingClientRect: () => ({
    x: 100,
    y: 50,
    width: 100,
    height: 40,
    top: 50,
    left: 100,
    right: 200,
    bottom: 90,
  }),
  dispatchEvent: vi.fn().mockReturnValue(true),
  scrollIntoView: vi.fn(),
  focus: vi.fn(),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Reset all mocks between tests.
 */
export function resetAllMocks(): void {
  vi.clearAllMocks();
  mockChromeTabs.captureVisibleTab.mockImplementation((_windowIdOrOptions: any, optionsOrCallback?: any, callback?: any) => {
    const cb = callback || (typeof optionsOrCallback === 'function' ? optionsOrCallback : undefined);
    if (cb) {
      setTimeout(() => cb('data:image/png;base64,mockImageData'), 0);
    }
  });
  mockChromeTabs.get.mockImplementation((tabId: number, callback: any) => {
    if (callback) {
      setTimeout(() => callback({ id: tabId, windowId: 1, url: 'https://example.com' }), 0);
    }
  });
  mockChromeTabs.sendMessage.mockImplementation((_tabId: number, _message: any, callback?: any) => {
    if (callback) {
      setTimeout(() => callback({ success: true }), 0);
    }
  });
  mockTesseractWorker.recognize.mockResolvedValue({
    data: {
      text: 'Mock OCR Text',
      confidence: 95,
      words: [
        { text: 'Allow', confidence: 98, bbox: { x0: 100, y0: 50, x1: 150, y1: 70 } },
        { text: 'Keep', confidence: 96, bbox: { x0: 200, y0: 50, x1: 250, y1: 70 } },
      ],
    },
  });
}

/**
 * Create mock screenshot data.
 */
export function createMockScreenshot(width = 1920, height = 1080): string {
  return `data:image/png;base64,mockImageData_${width}x${height}`;
}

/**
 * Create mock OCR result with specific words.
 */
export function createMockOcrResult(words: Array<{ text: string; x: number; y: number; confidence: number }>) {
  return {
    data: {
      text: words.map(w => w.text).join(' '),
      confidence: words.reduce((sum, w) => sum + w.confidence, 0) / words.length,
      words: words.map(w => ({
        text: w.text,
        confidence: w.confidence,
        bbox: { x0: w.x, y0: w.y, x1: w.x + 50, y1: w.y + 20 },
      })),
    },
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  mockChrome,
  mockChromeTabs,
  mockChromeRuntime,
  mockChromeScripting,
};
