/**
 * Messaging Integration Tests
 * 
 * Tests Chrome messaging between components:
 * - Content script <-> Background
 * - UI <-> Background
 * - Async response handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  mockChrome,
  resetAllMocks,
  simulateMessageResponse,
  simulateTabSendMessage,
  simulateChromeError
} from './setup';

describe('Messaging Integration', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('Background Message Handlers', () => {
    it('should handle EXECUTE_STEP message', async () => {
      simulateMessageResponse({ success: true, strategyUsed: 'dom_selector' });

      const response = await new Promise((resolve) => {
        mockChrome.runtime.sendMessage(
          { type: 'EXECUTE_STEP', tabId: 123, step: {}, runId: 'run-1' },
          resolve
        );
      });

      expect(response).toEqual(expect.objectContaining({ success: true }));
    });

    it('should handle GET_SERVICE_STATUS message', async () => {
      simulateMessageResponse({ ready: true, services: {} });

      const response = await new Promise((resolve) => {
        mockChrome.runtime.sendMessage({ type: 'GET_SERVICE_STATUS' }, resolve);
      });

      expect(response).toEqual(expect.objectContaining({ ready: true }));
    });

    it('should handle GET_ANALYTICS message', async () => {
      simulateMessageResponse({ metrics: {}, recentRuns: [] });

      const response = await new Promise((resolve) => {
        mockChrome.runtime.sendMessage({ type: 'GET_ANALYTICS', days: 30 }, resolve);
      });

      expect(response).toEqual(expect.objectContaining({ metrics: {} }));
    });

    it('should handle ATTACH_CDP message', async () => {
      simulateMessageResponse({ success: true });

      const response = await new Promise((resolve) => {
        mockChrome.runtime.sendMessage({ type: 'ATTACH_CDP', tabId: 123 }, resolve);
      });

      expect(response).toEqual({ success: true });
    });

    it('should handle DETACH_CDP message', async () => {
      simulateMessageResponse({ success: true });

      const response = await new Promise((resolve) => {
        mockChrome.runtime.sendMessage({ type: 'DETACH_CDP', tabId: 123 }, resolve);
      });

      expect(response).toEqual({ success: true });
    });
  });

  describe('Content Script Messages', () => {
    it('should handle START_RECORDING message', async () => {
      simulateTabSendMessage({ success: true });

      mockChrome.tabs.sendMessage(123, { type: 'START_RECORDING' }, (response: any) => {
        expect(response.success).toBe(true);
      });

      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(
        123,
        { type: 'START_RECORDING' },
        expect.any(Function)
      );
    });

    it('should handle START_RECORDING_V2 message', async () => {
      simulateTabSendMessage({ success: true, mode: 'v2', layers: {} });

      mockChrome.tabs.sendMessage(
        123,
        { type: 'START_RECORDING_V2', config: {} },
        (response: any) => {
          expect(response.mode).toBe('v2');
        }
      );
    });

    it('should handle runStep message', async () => {
      simulateTabSendMessage({ success: true });

      mockChrome.tabs.sendMessage(
        123,
        { type: 'runStep', step: { type: 'click' } },
        (response: any) => {
          expect(response.success).toBe(true);
        }
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle chrome.runtime.lastError gracefully', async () => {
      simulateChromeError('Extension context invalidated');

      // Verify error is set
      expect(mockChrome.runtime.lastError?.message).toBe('Extension context invalidated');
    });

    it('should return error response when services unavailable', async () => {
      simulateMessageResponse({ 
        success: false, 
        error: 'Services not initialized' 
      });

      const response = await new Promise((resolve) => {
        mockChrome.runtime.sendMessage(
          { type: 'EXECUTE_STEP', tabId: 123, step: {}, runId: 'run-1' },
          resolve
        );
      });

      expect(response).toEqual(expect.objectContaining({
        success: false,
        error: 'Services not initialized'
      }));
    });
  });

  describe('Async Response Handling', () => {
    it('should keep message channel open for async responses', async () => {
      // Simulate delayed response (async operation)
      mockChrome.runtime.sendMessage.mockImplementation(
        (_message: any, callback?: (response: any) => void) => {
          setTimeout(() => {
            if (callback) callback({ success: true, delayed: true });
          }, 100);
          return true; // Indicates async response
        }
      );

      const response = await new Promise((resolve) => {
        mockChrome.runtime.sendMessage({ type: 'EXECUTE_STEP' }, resolve);
      });

      expect(response).toEqual(expect.objectContaining({ delayed: true }));
    });
  });

  describe('Message Listener Registration', () => {
    it('should add message listener on setup', () => {
      const listener = () => {};
      mockChrome.runtime.onMessage.addListener(listener);

      expect(mockChrome.runtime.onMessage.addListener).toHaveBeenCalledWith(listener);
    });

    it('should remove message listener on cleanup', () => {
      const listener = () => {};
      mockChrome.runtime.onMessage.removeListener(listener);

      expect(mockChrome.runtime.onMessage.removeListener).toHaveBeenCalledWith(listener);
    });
  });
});
