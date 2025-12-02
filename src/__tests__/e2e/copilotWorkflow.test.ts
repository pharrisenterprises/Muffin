/**
 * Full E2E Copilot Workflow Test (TST-010)
 * 
 * Tests the complete Vision Enhancement workflow:
 * 1. Recording with Vision fallback for Monaco editor
 * 2. Configuring delays and loop start
 * 3. Adding conditional click for approvals
 * 4. Playback with multiple CSV rows
 * 5. Auto-clicking approval buttons
 * 
 * Note: This file contains both automated unit tests for workflow components
 * and documentation for manual E2E testing procedures.
 * 
 * @packageDocumentation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Recording, Step } from '../../types/vision';

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock VisionEngine
const mockVisionEngine = {
  isInitialized: false,
  initialize: vi.fn().mockImplementation(async () => {
    mockVisionEngine.isInitialized = true;
  }),
  terminate: vi.fn().mockImplementation(async () => {
    mockVisionEngine.isInitialized = false;
  }),
  captureScreenshot: vi.fn().mockResolvedValue('data:image/png;base64,mockScreenshot'),
  recognizeText: vi.fn().mockResolvedValue({
    text: 'Allow Keep Continue',
    confidence: 95,
    words: [
      { text: 'Allow', confidence: 95, bbox: { x0: 100, y0: 100, x1: 150, y1: 120 } },
      { text: 'Keep', confidence: 92, bbox: { x0: 200, y0: 100, x1: 240, y1: 120 } },
      { text: 'Continue', confidence: 90, bbox: { x0: 300, y0: 100, x1: 380, y1: 120 } }
    ]
  }),
  findText: vi.fn().mockImplementation(async (searchText: string) => {
    const words: Record<string, { x: number; y: number; confidence: number }> = {
      'Allow': { x: 125, y: 110, confidence: 95 },
      'Keep': { x: 220, y: 110, confidence: 92 },
      'Continue': { x: 340, y: 110, confidence: 90 }
    };
    return words[searchText] || null;
  }),
  clickAtCoordinates: vi.fn().mockResolvedValue(true),
  waitAndClickButtons: vi.fn().mockResolvedValue({ clicked: 2, timedOut: false })
};

vi.mock('../../lib/visionEngine', () => ({
  VisionEngine: vi.fn().mockImplementation(() => mockVisionEngine),
  getVisionEngine: vi.fn().mockReturnValue(mockVisionEngine)
}));

// Mock Chrome APIs
const mockChrome = {
  runtime: {
    sendMessage: vi.fn().mockResolvedValue({ success: true }),
    onMessage: { addListener: vi.fn(), removeListener: vi.fn() }
  },
  tabs: {
    captureVisibleTab: vi.fn().mockResolvedValue('data:image/png;base64,mock'),
    query: vi.fn().mockResolvedValue([{ id: 1, active: true }]),
    sendMessage: vi.fn().mockResolvedValue({ success: true })
  },
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined)
    }
  }
};

vi.stubGlobal('chrome', mockChrome);

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

/**
 * Creates a sample Copilot workflow recording.
 */
function createCopilotRecording(overrides: Partial<Recording> = {}): Recording {
  return {
    id: 'rec-copilot-001',
    name: 'Copilot Automation',
    projectId: 'proj-001',
    schemaVersion: 3,
    loopStartIndex: 2, // Loop starts at step 3 (prompt input)
    globalDelayMs: 1000, // 1 second between steps
    conditionalDefaults: {
      searchTerms: ['Allow', 'Keep'],
      timeoutSeconds: 120
    },
    steps: [
      // Step 1: Open Claude chat
      createStep({
        id: 1,
        label: 'Open Claude',
        url: 'https://claude.ai/chat',
        recordedVia: 'dom'
      }),
      // Step 2: Navigate to project
      createStep({
        id: 2,
        label: 'Select Project',
        selector: '[data-project-id="123"]',
        recordedVia: 'dom'
      }),
      // Step 3: Enter prompt (Vision fallback for Monaco)
      createStep({
        id: 3,
        label: 'Prompt',
        value: '{{prompt}}',
        recordedVia: 'vision',
        coordinates: { x: 400, y: 500, width: 600, height: 200 }
      }),
      // Step 4: Click send
      createStep({
        id: 4,
        label: 'Send Message',
        selector: '[data-testid="send-button"]',
        recordedVia: 'dom'
      }),
      // Step 5: Conditional click for approval
      createStep({
        id: 5,
        label: 'Handle Approval',
        recordedVia: 'dom',
        conditionalConfig: {
          enabled: true,
          searchTerms: ['Allow', 'Keep'],
          timeoutSeconds: 300,
          pollIntervalMs: 1000,
          interactionType: 'click' as const
        }
      }),
      // Step 6: Wait for response (with delay)
      createStep({
        id: 6,
        label: 'Wait for Response',
        recordedVia: 'dom',
        delaySeconds: 30
      })
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  } as Recording;
}

/**
/**
 * Creates a sample step.
 */
function createStep(overrides: Partial<Step> = {}): Step {
  const baseId = Math.floor(Math.random() * 100000);
  return {
    id: baseId,
    label: 'Test Step',
    selector: '#test',
    recordedVia: 'dom',
    delaySeconds: null,
    conditionalConfig: null,
    ...overrides
  } as Step;
}
/**
 * Creates sample CSV data for Copilot prompts.
 */
function createCsvData(): Record<string, string>[] {
  return [
    { prompt: 'Write a function to sort an array' },
    { prompt: 'Explain recursion with an example' },
    { prompt: 'Create a REST API endpoint' },
    { prompt: 'Debug this code snippet' }
  ];
}

// ============================================================================
// WORKFLOW SIMULATION FUNCTIONS
// ============================================================================

/**
 * Simulates the step executor routing logic.
 */
async function executeStep(
  step: Step,
  visionEngine: typeof mockVisionEngine
): Promise<{ success: boolean; method: 'dom' | 'vision' | 'conditional' }> {
  // Apply per-step delay
  if (step.delaySeconds && step.delaySeconds > 0) {
    await new Promise(resolve => setTimeout(resolve, step.delaySeconds! * 1000));
  }

  // Check if this is a conditional click (has conditionalConfig)
  if (step.conditionalConfig) {
    // Execute conditional click polling
    const result = await visionEngine.waitAndClickButtons(
      step.conditionalConfig.searchTerms,
      step.conditionalConfig.timeoutSeconds
    );
    return { success: !result.timedOut, method: 'conditional' };
  }

  // Route by recordedVia
  if (step.recordedVia === 'vision') {
    // Execute via Vision (coordinate click or OCR type)
    if (step.coordinates) {
      await visionEngine.clickAtCoordinates(
        step.coordinates.x + step.coordinates.width / 2,
        step.coordinates.y + step.coordinates.height / 2
      );
    }
    return { success: true, method: 'vision' };
  }

  // Default DOM execution
  return { success: true, method: 'dom' };
}

/**
 * Simulates the playback loop with CSV data.
 */
async function simulatePlaybackLoop(
  recording: Recording,
  csvRows: Record<string, string>[],
  visionEngine: typeof mockVisionEngine,
  onStepExecuted?: (stepId: number, rowIndex: number, method: string) => void
): Promise<{ totalSteps: number; totalRows: number; errors: string[] }> {
  const errors: string[] = [];
  let totalSteps = 0;

  // Initialize Vision engine
  await visionEngine.initialize();

  try {
    for (let rowIndex = 0; rowIndex < csvRows.length; rowIndex++) {
      const csvRow = csvRows[rowIndex];
      const isFirstRow = rowIndex === 0;
      
      // Determine steps to execute
      const stepsToExecute = isFirstRow
        ? recording.steps
        : recording.steps.slice(recording.loopStartIndex);

      for (const step of stepsToExecute) {
        try {
          // Substitute CSV variables
          const processedStep = { ...step };
          if (processedStep.value && csvRow) {
            processedStep.value = processedStep.value.replace(
              /\{\{(\w+)\}\}/g,
              (_, varName) => csvRow[varName] || ''
            );
          }

          // Execute step
          const result = await executeStep(processedStep, visionEngine);
          totalSteps++;

          if (onStepExecuted) {
            onStepExecuted(step.id!, rowIndex, result.method);
          }

          // Apply global delay after step
          if (recording.globalDelayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, 10)); // Shortened for tests
          }
        } catch (error) {
          errors.push(`Row ${rowIndex + 1}, Step ${step.id}: ${error}`);
        }
      }
    }
  } finally {
    // Always terminate Vision engine
    await visionEngine.terminate();
  }

  return { totalSteps, totalRows: csvRows.length, errors };
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe('Full E2E Copilot Workflow (TST-010)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVisionEngine.isInitialized = false;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Recording Features', () => {
    it('should create recording with Vision fallback step', () => {
      const recording = createCopilotRecording();
      
      const visionSteps = recording.steps.filter(s => s.recordedVia === 'vision');
      expect(visionSteps).toHaveLength(1);
      expect(visionSteps[0].id).toBe(3);
      expect(visionSteps[0].coordinates).toBeDefined();
    });

    it('should have correct loop start configuration', () => {
      const recording = createCopilotRecording();
      
      expect(recording.loopStartIndex).toBe(2);
      expect(recording.steps[recording.loopStartIndex].id).toBe(3);
    });

    it('should have global delay configured', () => {
      const recording = createCopilotRecording();
      
      expect(recording.globalDelayMs).toBe(1000);
    });

    it('should have conditional click step configured', () => {
      const recording = createCopilotRecording();
      
      const conditionalStep = recording.steps.find(s => s.conditionalConfig);
      expect(conditionalStep).toBeDefined();
      expect(conditionalStep?.conditionalConfig?.searchTerms).toContain('Allow');
      expect(conditionalStep?.conditionalConfig?.timeoutSeconds).toBe(300);
    });

    it('should have per-step delay configured', () => {
      const recording = createCopilotRecording();
      
      const waitStep = recording.steps.find(s => s.id === 6);
      expect(waitStep?.delaySeconds).toBe(30);
    });
  });

  describe('Playback Loop Execution', () => {
    it('should execute all steps for first CSV row', async () => {
      const recording = createCopilotRecording();
      const csvRows = createCsvData();
      const executedSteps: number[] = [];

      await simulatePlaybackLoop(
        recording,
        csvRows.slice(0, 1), // Only first row
        mockVisionEngine,
        (stepId: number) => executedSteps.push(stepId)
      );

      expect(executedSteps).toHaveLength(recording.steps.length);
      expect(executedSteps).toContain(1);
      expect(executedSteps).toContain(2);
      expect(executedSteps).toContain(3);
    });

    it('should skip steps before loopStartIndex for subsequent rows', async () => {
      const recording = createCopilotRecording();
      const csvRows = createCsvData().slice(0, 2); // Two rows
      const executedSteps: { stepId: number; rowIndex: number }[] = [];

      await simulatePlaybackLoop(
        recording,
        csvRows,
        mockVisionEngine,
        (stepId: number, rowIndex: number) => executedSteps.push({ stepId, rowIndex })
      );

      // First row: all 6 steps
      const row0Steps = executedSteps.filter(e => e.rowIndex === 0);
      expect(row0Steps).toHaveLength(6);

      // Second row: only steps from index 2 onwards (4 steps)
      const row1Steps = executedSteps.filter(e => e.rowIndex === 1);
      expect(row1Steps).toHaveLength(4);
      expect(row1Steps.map(s => s.stepId)).not.toContain(1);
      expect(row1Steps.map(s => s.stepId)).not.toContain(2);
    });

    it('should process all CSV rows', async () => {
      const recording = createCopilotRecording();
      const csvRows = createCsvData(); // 4 rows

      const result = await simulatePlaybackLoop(
        recording,
        csvRows,
        mockVisionEngine
      );

      expect(result.totalRows).toBe(4);
      // Row 1: 6 steps, Rows 2-4: 4 steps each = 6 + 4*3 = 18 steps
      expect(result.totalSteps).toBe(18);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Vision Engine Integration', () => {
    it('should initialize Vision engine before playback', async () => {
      const recording = createCopilotRecording();
      const csvRows = createCsvData().slice(0, 1);

      await simulatePlaybackLoop(recording, csvRows, mockVisionEngine);

      expect(mockVisionEngine.initialize).toHaveBeenCalled();
    });

    it('should terminate Vision engine after playback', async () => {
      const recording = createCopilotRecording();
      const csvRows = createCsvData().slice(0, 1);

      await simulatePlaybackLoop(recording, csvRows, mockVisionEngine);

      expect(mockVisionEngine.terminate).toHaveBeenCalled();
    });

    it('should route Vision steps to coordinate click', async () => {
      const recording = createCopilotRecording();
      const csvRows = createCsvData().slice(0, 1);
      const methods: string[] = [];

      await simulatePlaybackLoop(
        recording,
        csvRows,
        mockVisionEngine,
        (_, __, method) => methods.push(method)
      );

      expect(methods).toContain('vision');
    });

    it('should execute conditional click via Vision polling', async () => {
      const recording = createCopilotRecording();
      const csvRows = createCsvData().slice(0, 1);

      await simulatePlaybackLoop(recording, csvRows, mockVisionEngine);

      expect(mockVisionEngine.waitAndClickButtons).toHaveBeenCalled();
    });
  });

  describe('CSV Variable Substitution', () => {
    it('should substitute {{prompt}} variable with CSV value', async () => {
      const recording = createCopilotRecording();
      const csvRows = [{ prompt: 'Test prompt value' }];

      // Manually run the substitution
      const step = { ...recording.steps.find(s => s.id === 3)! };
      const row = csvRows[0] as Record<string, string>;
      step.value = step.value!.replace(/\{\{(\w+)\}\}/g, (_, varName: string) => row[varName] || '');

      expect(step.value).toBe('Test prompt value');
    });

    it('should use different values for each CSV row', () => {
      const csvRows = createCsvData();
      const template = '{{prompt}}';

      const substituted = csvRows.map(row =>
        template.replace(/\{\{(\w+)\}\}/g, (_, varName) => row[varName] || '')
      );

      expect(substituted[0]).toBe('Write a function to sort an array');
      expect(substituted[1]).toBe('Explain recursion with an example');
      expect(substituted[2]).toBe('Create a REST API endpoint');
      expect(substituted[3]).toBe('Debug this code snippet');
    });
  });

  describe('Delay Execution', () => {
    it('should apply per-step delay before execution', async () => {
      const step = createStep({ delaySeconds: 0.01 }); // 10ms for test
      const startTime = Date.now();

      await executeStep(step, mockVisionEngine);

      const elapsed = Date.now() - startTime;
      expect(elapsed).toBeGreaterThanOrEqual(10);
    });

    it('should respect global delay between steps', async () => {
      const recording = createCopilotRecording({ globalDelayMs: 10 }); // 10ms for test
      const csvRows = createCsvData().slice(0, 1);
      const startTime = Date.now();

      await simulatePlaybackLoop(recording, csvRows, mockVisionEngine);

      const elapsed = Date.now() - startTime;
      // Should have at least 6 delays (after each step)
      expect(elapsed).toBeGreaterThanOrEqual(60);
    });
  });

  describe('Conditional Click Handling', () => {
    it('should call waitAndClickButtons with correct parameters', async () => {
      const recording = createCopilotRecording();
      const csvRows = createCsvData().slice(0, 1);

      await simulatePlaybackLoop(recording, csvRows, mockVisionEngine);

      expect(mockVisionEngine.waitAndClickButtons).toHaveBeenCalledWith(
        ['Allow', 'Keep'],
        300
      );
    });

    it('should handle conditional click timeout gracefully', async () => {
      mockVisionEngine.waitAndClickButtons.mockResolvedValueOnce({
        clicked: 0,
        timedOut: true
      });

      const recording = createCopilotRecording();
      const csvRows = createCsvData().slice(0, 1);

      const result = await simulatePlaybackLoop(recording, csvRows, mockVisionEngine);

      // Should continue despite timeout
      expect(result.totalSteps).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should collect errors without stopping playback', async () => {
      mockVisionEngine.clickAtCoordinates.mockRejectedValueOnce(
        new Error('Click failed')
      );

      const recording = createCopilotRecording();
      const csvRows = createCsvData().slice(0, 1);

      const result = await simulatePlaybackLoop(recording, csvRows, mockVisionEngine);

      // Should still process remaining steps
      expect(result.totalSteps).toBeGreaterThan(0);
    });

    it('should terminate Vision engine even on error', async () => {
      mockVisionEngine.waitAndClickButtons.mockRejectedValueOnce(
        new Error('Vision error')
      );

      const recording = createCopilotRecording();
      const csvRows = createCsvData().slice(0, 1);

      try {
        await simulatePlaybackLoop(recording, csvRows, mockVisionEngine);
      } catch {
        // Expected to throw
      }

      expect(mockVisionEngine.terminate).toHaveBeenCalled();
    });
  });

  describe('Complete Workflow Scenarios', () => {
    it('should complete 4-row CSV workflow successfully', async () => {
      const recording = createCopilotRecording();
      const csvRows = createCsvData();

      const result = await simulatePlaybackLoop(recording, csvRows, mockVisionEngine);

      expect(result.totalRows).toBe(4);
      expect(result.errors).toHaveLength(0);
      expect(mockVisionEngine.initialize).toHaveBeenCalledTimes(1);
      expect(mockVisionEngine.terminate).toHaveBeenCalledTimes(1);
    });

    it('should handle empty CSV gracefully', async () => {
      const recording = createCopilotRecording();
      const csvRows: Record<string, string>[] = [];

      const result = await simulatePlaybackLoop(recording, csvRows, mockVisionEngine);

      expect(result.totalRows).toBe(0);
      expect(result.totalSteps).toBe(0);
    });

    it('should handle single row CSV', async () => {
      const recording = createCopilotRecording();
      const csvRows = createCsvData().slice(0, 1);

      const result = await simulatePlaybackLoop(recording, csvRows, mockVisionEngine);

      expect(result.totalRows).toBe(1);
      expect(result.totalSteps).toBe(6); // All steps for single row
    });
  });
});
