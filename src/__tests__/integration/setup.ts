/**
 * Integration Test Setup
 * 
 * Provides mocks for Chrome APIs and test utilities
 */

import { vi } from 'vitest';

// ═══════════════════════════════════════════════════════════════════════════════
// CHROME API MOCKS
// ═══════════════════════════════════════════════════════════════════════════════

export const mockChrome = {
  runtime: {
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    },
    lastError: null as { message: string } | null,
    getURL: vi.fn((path: string) => `chrome-extension://mock-id/${path}`)
  },
  tabs: {
    query: vi.fn(),
    sendMessage: vi.fn(),
    captureVisibleTab: vi.fn(),
    get: vi.fn(),
    onActivated: {
      addListener: vi.fn()
    },
    onRemoved: {
      addListener: vi.fn()
    }
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn()
    },
    sync: {
      get: vi.fn(),
      set: vi.fn()
    }
  },
  debugger: {
    attach: vi.fn(),
    detach: vi.fn(),
    sendCommand: vi.fn()
  }
};

// Install mock globally
(globalThis as any).chrome = mockChrome;

// ═══════════════════════════════════════════════════════════════════════════════
// TEST UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

export function resetAllMocks() {
  vi.clearAllMocks();
  mockChrome.runtime.lastError = null;
}

export function simulateMessageResponse(response: any) {
  mockChrome.runtime.sendMessage.mockImplementation(
    (_message: any, callback?: (response: any) => void) => {
      if (callback) {
        setTimeout(() => callback(response), 0);
      }
      return Promise.resolve(response);
    }
  );
}

export function simulateTabsQuery(tabs: any[]) {
  mockChrome.tabs.query.mockResolvedValue(tabs);
}

export function simulateTabSendMessage(response: any) {
  mockChrome.tabs.sendMessage.mockImplementation(
    (_tabId: number, _message: any, callback?: (response: any) => void) => {
      if (callback) {
        setTimeout(() => callback(response), 0);
      }
    }
  );
}

export function simulateChromeError(message: string) {
  mockChrome.runtime.lastError = { message };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK DATA FACTORIES
// ═══════════════════════════════════════════════════════════════════════════════

export function createMockStep(overrides: Partial<any> = {}) {
  return {
    type: 'click',
    label: 'Submit Button',
    value: '',
    xpath: '//*[@id="submit"]',
    timestamp: Date.now(),
    fallbackChain: {
      strategies: [
        { type: 'dom_selector', score: 0.95, metadata: { selector: '#submit' } },
        { type: 'css_selector', score: 0.85, metadata: { selector: 'button.submit' } },
        { type: 'xpath', score: 0.80, metadata: { xpath: '//*[@id="submit"]' } }
      ]
    },
    ...overrides
  };
}

export function createMockStepResult(overrides: Partial<any> = {}) {
  return {
    success: true,
    strategyUsed: 'dom_selector',
    fallbacksAttempted: 0,
    duration: 150,
    error: undefined,
    ...overrides
  };
}

export function createMockSession(actionCount: number = 3) {
  return {
    id: `session-${Date.now()}`,
    startTime: Date.now() - 10000,
    endTime: Date.now(),
    actions: Array.from({ length: actionCount }, (_, i) => ({
      id: `action-${i}`,
      action: {
        type: 'click',
        label: `Button ${i + 1}`,
        timestamp: Date.now() - (actionCount - i) * 1000
      },
      domCapture: {
        selectors: { css: `#btn-${i}`, xpath: `//*[@id="btn-${i}"]` },
        tagName: 'button'
      },
      fallbackChain: {
        strategies: [
          { type: 'dom_selector', score: 0.95, metadata: {} }
        ]
      }
    })),
    config: {
      enableDOM: true,
      enableVision: false,
      enableMouse: true,
      enableNetwork: false
    }
  };
}

export function createMockLayerStatus() {
  return {
    dom: { active: true, captureCount: 5 },
    vision: { active: false, captureCount: 0 },
    mouse: { active: true, captureCount: 5 },
    network: { active: false, captureCount: 0 }
  };
}
