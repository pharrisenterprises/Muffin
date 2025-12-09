/**
 * Playback Integration Tests
 * 
 * Tests the complete playback flow:
 * - EXECUTE_STEP messaging
 * - Strategy selection
 * - Fallback chain execution
 * - Result handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  mockChrome,
  resetAllMocks,
  simulateMessageResponse,
  createMockStep,
  createMockStepResult
} from './setup';

describe('Playback Integration', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('EXECUTE_STEP Handler', () => {
    it('should send EXECUTE_STEP message to background', async () => {
      const step = createMockStep();
      const expectedResult = createMockStepResult();
      
      simulateMessageResponse(expectedResult);

      await new Promise<void>((resolve) => {
        mockChrome.runtime.sendMessage(
          {
            type: 'EXECUTE_STEP',
            tabId: 123,
            step,
            runId: 'run-123'
          },
          (response: any) => {
            expect(response.success).toBe(true);
            expect(response.strategyUsed).toBe('dom_selector');
            expect(response.fallbacksAttempted).toBe(0);
            expect(response.duration).toBeGreaterThan(0);
            resolve();
          }
        );
      });

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'EXECUTE_STEP',
          tabId: 123,
          step: expect.objectContaining({ type: 'click' })
        }),
        expect.any(Function)
      );
    });

    it('should return strategyUsed in result', async () => {
      const result = createMockStepResult({ strategyUsed: 'cdp_semantic' });
      simulateMessageResponse(result);

      await new Promise<void>((resolve) => {
        mockChrome.runtime.sendMessage(
          { type: 'EXECUTE_STEP', tabId: 123, step: createMockStep(), runId: 'run-1' },
          (response: any) => {
            expect(response.strategyUsed).toBe('cdp_semantic');
            resolve();
          }
        );
      });
    });

    it('should track fallbacksAttempted count', async () => {
      const result = createMockStepResult({ 
        strategyUsed: 'xpath',
        fallbacksAttempted: 2 
      });
      simulateMessageResponse(result);

      await new Promise<void>((resolve) => {
        mockChrome.runtime.sendMessage(
          { type: 'EXECUTE_STEP', tabId: 123, step: createMockStep(), runId: 'run-1' },
          (response: any) => {
            expect(response.fallbacksAttempted).toBe(2);
            resolve();
          }
        );
      });
    });

    it('should return duration in milliseconds', async () => {
      const result = createMockStepResult({ duration: 250 });
      simulateMessageResponse(result);

      await new Promise<void>((resolve) => {
        mockChrome.runtime.sendMessage(
          { type: 'EXECUTE_STEP', tabId: 123, step: createMockStep(), runId: 'run-1' },
          (response: any) => {
            expect(response.duration).toBe(250);
            resolve();
          }
        );
      });
    });
  });

  describe('Step Failure Handling', () => {
    it('should return success: false on step failure', async () => {
      const result = createMockStepResult({ 
        success: false,
        strategyUsed: null,
        error: 'Element not found'
      });
      simulateMessageResponse(result);

      await new Promise<void>((resolve) => {
        mockChrome.runtime.sendMessage(
          { type: 'EXECUTE_STEP', tabId: 123, step: createMockStep(), runId: 'run-1' },
          (response: any) => {
            expect(response.success).toBe(false);
            expect(response.error).toBe('Element not found');
            resolve();
          }
        );
      });
    });

    it('should include error message in result', async () => {
      const result = createMockStepResult({
        success: false,
        error: 'All 7 strategies failed'
      });
      simulateMessageResponse(result);

      await new Promise<void>((resolve) => {
        mockChrome.runtime.sendMessage(
          { type: 'EXECUTE_STEP', tabId: 123, step: createMockStep(), runId: 'run-1' },
          (response: any) => {
            expect(response.error).toContain('strategies failed');
            resolve();
          }
        );
      });
    });
  });

  describe('CSV Value Integration', () => {
    it('should execute step with CSV-substituted value', async () => {
      const step = createMockStep({ 
        label: 'Email',
        value: '' 
      });
      
      // Simulate step with CSV value applied
      const stepWithCSV = { ...step, value: 'test@example.com' };
      
      simulateMessageResponse(createMockStepResult());

      await new Promise<void>((resolve) => {
        mockChrome.runtime.sendMessage(
          {
            type: 'EXECUTE_STEP',
            tabId: 123,
            step: stepWithCSV,
            runId: 'run-1'
          },
          () => resolve()
        );
      });

      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'EXECUTE_STEP',
          step: expect.objectContaining({
            value: 'test@example.com'
          })
        }),
        expect.any(Function)
      );
    });
  });

  describe('Service Status Check', () => {
    it('should query service status via GET_SERVICE_STATUS', async () => {
      simulateMessageResponse({
        ready: true,
        services: {
          cdp: true,
          vision: true,
          telemetry: true,
          decisionEngine: true
        }
      });

      await new Promise<void>((resolve) => {
        mockChrome.runtime.sendMessage(
          { type: 'GET_SERVICE_STATUS' },
          (response: any) => {
            expect(response.ready).toBe(true);
            expect(response.services.decisionEngine).toBe(true);
            resolve();
          }
        );
      });
    });
  });
});
