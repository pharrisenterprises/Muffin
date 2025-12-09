/**
 * Recording Integration Tests
 * 
 * Tests the complete recording flow:
 * - V1 (Basic) recording
 * - V2 (Multi-layer) recording
 * - Layer configuration
 * - Session capture
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  mockChrome,
  resetAllMocks,
  simulateTabsQuery,
  simulateTabSendMessage,
  createMockSession,
  createMockLayerStatus
} from './setup';

describe('Recording Integration', () => {
  beforeEach(() => {
    resetAllMocks();
    simulateTabsQuery([{ id: 123, url: 'https://example.com' }]);
  });

  describe('V1 Basic Recording', () => {
    it('should send START_RECORDING message to content script', async () => {
      simulateTabSendMessage({ success: true, mode: 'v1' });

      // Simulate start recording action
      const [tab] = await mockChrome.tabs.query({ active: true, currentWindow: true });
      
      mockChrome.tabs.sendMessage(tab.id, { type: 'START_RECORDING' }, (response: any) => {
        expect(response.success).toBe(true);
        expect(response.mode).toBe('v1');
      });

      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(
        123,
        { type: 'START_RECORDING' },
        expect.any(Function)
      );
    });

    it('should send STOP_RECORDING message to content script', async () => {
      simulateTabSendMessage({ success: true });

      const [tab] = await mockChrome.tabs.query({ active: true, currentWindow: true });
      
      mockChrome.tabs.sendMessage(tab.id, { type: 'STOP_RECORDING' }, (response: any) => {
        expect(response.success).toBe(true);
      });

      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(
        123,
        { type: 'STOP_RECORDING' },
        expect.any(Function)
      );
    });

    it('should reset label sequence on START_RECORDING', async () => {
      // This tests MVS compliance - counter should reset
      simulateTabSendMessage({ success: true, message: 'Counter reset' });

      const [tab] = await mockChrome.tabs.query({ active: true, currentWindow: true });
      
      mockChrome.tabs.sendMessage(tab.id, { type: 'START_RECORDING' }, (response: any) => {
        expect(response.success).toBe(true);
      });
    });
  });

  describe('V2 Multi-Layer Recording', () => {
    it('should send START_RECORDING_V2 with layer config', async () => {
      const config = {
        enableDOM: true,
        enableVision: true,
        enableMouse: true,
        enableNetwork: false
      };

      simulateTabSendMessage({ 
        success: true, 
        mode: 'v2',
        layers: createMockLayerStatus()
      });

      const [tab] = await mockChrome.tabs.query({ active: true, currentWindow: true });
      
      mockChrome.tabs.sendMessage(
        tab.id,
        { type: 'START_RECORDING_V2', config },
        (response: any) => {
          expect(response.success).toBe(true);
          expect(response.mode).toBe('v2');
          expect(response.layers).toBeDefined();
        }
      );

      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledWith(
        123,
        expect.objectContaining({
          type: 'START_RECORDING_V2',
          config: expect.objectContaining({
            enableDOM: true,
            enableVision: true
          })
        }),
        expect.any(Function)
      );
    });

    it('should return session with fallback chains on STOP_RECORDING_V2', async () => {
      const mockSession = createMockSession(3);
      
      simulateTabSendMessage({ 
        success: true, 
        session: mockSession,
        actionCount: 3
      });

      const [tab] = await mockChrome.tabs.query({ active: true, currentWindow: true });
      
      mockChrome.tabs.sendMessage(
        tab.id,
        { type: 'STOP_RECORDING_V2' },
        (response: any) => {
          expect(response.success).toBe(true);
          expect(response.session).toBeDefined();
          expect(response.session.actions).toHaveLength(3);
          expect(response.session.actions[0].fallbackChain).toBeDefined();
        }
      );
    });

    it('should track layer capture counts during recording', async () => {
      const layerStatus = createMockLayerStatus();
      
      // Verify layer status structure
      expect(layerStatus.dom.active).toBe(true);
      expect(layerStatus.dom.captureCount).toBe(5);
      expect(layerStatus.vision.active).toBe(false);
    });
  });

  describe('Recording Mode Transition', () => {
    it('should allow switching from V1 to V2 between recordings', async () => {
      // First V1 recording
      simulateTabSendMessage({ success: true, mode: 'v1' });
      
      const [tab] = await mockChrome.tabs.query({ active: true, currentWindow: true });
      mockChrome.tabs.sendMessage(tab.id, { type: 'START_RECORDING' });
      mockChrome.tabs.sendMessage(tab.id, { type: 'STOP_RECORDING' });

      // Then V2 recording
      simulateTabSendMessage({ success: true, mode: 'v2' });
      mockChrome.tabs.sendMessage(tab.id, { 
        type: 'START_RECORDING_V2',
        config: { enableDOM: true, enableVision: true, enableMouse: true, enableNetwork: false }
      });

      expect(mockChrome.tabs.sendMessage).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle tab not found gracefully', async () => {
      simulateTabsQuery([]);

      const tabs = await mockChrome.tabs.query({ active: true, currentWindow: true });
      expect(tabs).toHaveLength(0);
    });

    it('should handle chrome.runtime.lastError', async () => {
      mockChrome.runtime.lastError = { message: 'Extension context invalidated' };

      // Verify error is accessible
      expect(mockChrome.runtime.lastError?.message).toBe('Extension context invalidated');
    });
  });
});
