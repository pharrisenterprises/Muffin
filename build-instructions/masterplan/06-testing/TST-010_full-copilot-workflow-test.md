# TST-010: Full Copilot Workflow Test

> **Build Card:** TST-010  
> **Category:** Testing & Validation  
> **Dependencies:** ALL previous specs  
> **Risk Level:** High  
> **Estimated Lines:** 350-420

---

## 1. PURPOSE

Create comprehensive end-to-end integration tests that validate the complete Copilot automation workflow. These tests verify that all components work together: recording a prompt submission, playing back with CSV loop, detecting and clicking Allow/Keep buttons via Vision, waiting for commit confirmation, and advancing to the next CSV row. This is the ultimate validation that Muffin Lite achieves its core objective.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| All ENG specs | `build-instructions/masterplan/03-engine/` | VisionEngine functionality |
| All INT specs | `build-instructions/masterplan/04-integration/` | Integration handlers |
| All UI specs | `build-instructions/masterplan/05-ui-components/` | UI components |
| Feature Specs | `/future-spec/03_feature-specs.md` | Complete workflow requirements |
| Screenshot | Project Knowledge | Visual reference of workflow |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/lib/__tests__/e2e/copilotWorkflow.test.ts` | CREATE | +300 |
| `src/lib/__tests__/e2e/helpers/workflowTestUtils.ts` | CREATE | +80 |
| `src/lib/__tests__/fixtures/copilot-workflow.fixture.ts` | CREATE | +70 |

### Artifacts

- Full E2E workflow test suite
- Workflow test helper utilities
- Copilot-specific fixtures

---

## 4. DETAILED SPECIFICATION

### 4.1 Test File Structure

```typescript
// src/lib/__tests__/e2e/copilotWorkflow.test.ts

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { VisionEngine } from '../../visionEngine';
import { PlaybackEngine } from '../../playbackEngine';
import { RecordingEngine } from '../../recordingEngine';
import { 
  createMockTesseract, 
  configureMockOcrSequence,
  resetMockSequence,
} from '../mocks/tesseract.mock';
import { createMockChrome } from '../mocks/chrome.mock';
import {
  copilotPromptRecording,
  smartPromptsCSV,
  copilotOcrSequence,
  expectedWorkflowEvents,
} from '../fixtures/copilot-workflow.fixture';
import {
  createWorkflowTestHarness,
  waitForEvent,
  collectEvents,
} from './helpers/workflowTestUtils';

// Mock dependencies
vi.stubGlobal('chrome', createMockChrome());
vi.mock('tesseract.js', () => createMockTesseract());

// Use fake timers for controlled test execution
vi.useFakeTimers();

describe('Full Copilot Workflow E2E', () => {
  let visionEngine: VisionEngine;
  let playbackEngine: PlaybackEngine;
  let harness: ReturnType<typeof createWorkflowTestHarness>;

  beforeAll(async () => {
    visionEngine = new VisionEngine();
    await visionEngine.initialize();
  });

  afterAll(async () => {
    await visionEngine.terminate();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSequence();
    playbackEngine = new PlaybackEngine({ visionEngine });
    harness = createWorkflowTestHarness(playbackEngine);
  });

  afterEach(() => {
    vi.clearAllTimers();
    harness.cleanup();
  });

  // Test suites defined below...
});
```

### 4.2 Workflow Fixtures

```typescript
// src/lib/__tests__/fixtures/copilot-workflow.fixture.ts

import { Recording, Step } from '../../../types';

/**
 * Recording that mimics submitting a prompt to Copilot
 */
export const copilotPromptRecording: Recording = {
  id: 'rec-copilot-001',
  name: 'Submit Smart Prompt to Copilot',
  url: 'https://github.com/codespaces',
  loopStartIndex: 1, // Loop from "Enter prompt" step
  globalDelayMs: 500,
  schemaVersion: 3,
  steps: [
    {
      id: 'step-001',
      label: 'Open Copilot chat',
      event: 'open',
      path: 'https://github.com/codespaces',
      value: '',
      recordedVia: 'dom',
      delaySeconds: null,
      conditionalConfig: null,
    },
    {
      id: 'step-002',
      label: 'Enter prompt',
      event: 'input',
      path: '/html/body/div[2]/div/div[3]/div/div/div/div/div[2]',
      value: '{{prompt}}',
      recordedVia: 'dom',
      delaySeconds: null,
      conditionalConfig: null,
    },
    {
      id: 'step-003',
      label: 'Send message',
      event: 'click',
      path: '/html/body/div[2]/div/div[3]/div/div/div/div/div[2]/button',
      value: '',
      recordedVia: 'dom',
      delaySeconds: null,
      conditionalConfig: null,
    },
    {
      id: 'step-004',
      label: 'Wait for Allow/Keep buttons',
      event: 'conditional-click',
      path: '',
      value: '',
      recordedVia: 'vision',
      delaySeconds: null,
      conditionalConfig: {
        buttonTexts: ['Allow', 'Keep'],
        successText: 'committed',
        timeoutSeconds: 300,
        pollIntervalMs: 500,
        confidenceThreshold: 0.7,
      },
    },
  ],
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

/**
 * CSV with smart prompts to submit
 */
export const smartPromptsCSV = {
  headers: ['prompt'],
  rows: [
    ['Create the following file: src/components/Button.tsx with a simple button component'],
    ['Create the following file: src/components/Input.tsx with a text input component'],
    ['Create the following file: src/utils/helpers.ts with common helper functions'],
  ],
};

/**
 * OCR sequence simulating Copilot response flow
 * For each prompt: processing → Allow button → processing → Keep button → committed
 */
export const copilotOcrSequence = [
  // Row 1: First prompt
  { text: 'Processing your request...', words: [] },
  { text: 'Processing your request...', words: [] },
  { 
    text: 'Copilot wants to create Button.tsx\n\nAllow', 
    words: [
      { text: 'Allow', confidence: 97, bbox: { x0: 150, y0: 100, x1: 220, y1: 130 } }
    ] 
  },
  { text: 'Creating file...', words: [] },
  { 
    text: 'File created. Save changes?\n\nKeep', 
    words: [
      { text: 'Keep', confidence: 96, bbox: { x0: 150, y0: 100, x1: 210, y1: 130 } }
    ] 
  },
  { text: 'Changes committed successfully', words: [] },
  
  // Row 2: Second prompt
  { text: 'Processing your request...', words: [] },
  { 
    text: 'Copilot wants to create Input.tsx\n\nAllow', 
    words: [
      { text: 'Allow', confidence: 95, bbox: { x0: 150, y0: 100, x1: 220, y1: 130 } }
    ] 
  },
  { text: 'Creating file...', words: [] },
  { 
    text: 'File created. Save changes?\n\nKeep', 
    words: [
      { text: 'Keep', confidence: 94, bbox: { x0: 150, y0: 100, x1: 210, y1: 130 } }
    ] 
  },
  { text: 'Changes committed successfully', words: [] },
  
  // Row 3: Third prompt
  { text: 'Processing your request...', words: [] },
  { 
    text: 'Copilot wants to create helpers.ts\n\nAllow\n\nAllow', 
    words: [
      { text: 'Allow', confidence: 97, bbox: { x0: 150, y0: 100, x1: 220, y1: 130 } },
      { text: 'Allow', confidence: 96, bbox: { x0: 150, y0: 150, x1: 220, y1: 180 } }
    ] 
  },
  { text: 'Creating file...', words: [] },
  { 
    text: 'File created. Save changes?\n\nKeep', 
    words: [
      { text: 'Keep', confidence: 95, bbox: { x0: 150, y0: 100, x1: 210, y1: 130 } }
    ] 
  },
  { text: 'Changes committed successfully', words: [] },
];

/**
 * Expected events during workflow execution
 */
export const expectedWorkflowEvents = {
  row1: {
    stepsExecuted: 4,
    allowClicks: 1,
    keepClicks: 1,
    successTextFound: true,
  },
  row2: {
    stepsExecuted: 3, // Skips step 1 due to loopStartIndex
    allowClicks: 1,
    keepClicks: 1,
    successTextFound: true,
  },
  row3: {
    stepsExecuted: 3,
    allowClicks: 2, // Two Allow buttons
    keepClicks: 1,
    successTextFound: true,
  },
};
```

### 4.3 Workflow Test Helpers

```typescript
// src/lib/__tests__/e2e/helpers/workflowTestUtils.ts

import { PlaybackEngine } from '../../../playbackEngine';
import { EventEmitter } from 'events';

export interface WorkflowTestHarness {
  events: any[];
  errors: any[];
  rowsCompleted: number;
  cleanup: () => void;
}

export function createWorkflowTestHarness(
  playbackEngine: PlaybackEngine
): WorkflowTestHarness {
  const events: any[] = [];
  const errors: any[] = [];
  let rowsCompleted = 0;

  const handlers = {
    'step:start': (e: any) => events.push({ type: 'step:start', ...e }),
    'step:complete': (e: any) => events.push({ type: 'step:complete', ...e }),
    'step:error': (e: any) => errors.push(e),
    'row:start': (e: any) => events.push({ type: 'row:start', ...e }),
    'row:complete': (e: any) => {
      rowsCompleted++;
      events.push({ type: 'row:complete', ...e });
    },
    'conditional:click': (e: any) => events.push({ type: 'conditional:click', ...e }),
    'conditional:success': (e: any) => events.push({ type: 'conditional:success', ...e }),
    'playback:complete': (e: any) => events.push({ type: 'playback:complete', ...e }),
  };

  Object.entries(handlers).forEach(([event, handler]) => {
    playbackEngine.on(event, handler);
  });

  return {
    events,
    errors,
    get rowsCompleted() { return rowsCompleted; },
    cleanup: () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        playbackEngine.off(event, handler);
      });
    },
  };
}

export async function waitForEvent(
  emitter: EventEmitter,
  eventName: string,
  timeout: number = 5000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for event: ${eventName}`));
    }, timeout);

    emitter.once(eventName, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

export function collectEvents(
  emitter: EventEmitter,
  eventNames: string[]
): { events: any[]; stop: () => void } {
  const events: any[] = [];
  const handlers: Map<string, Function> = new Map();

  eventNames.forEach(name => {
    const handler = (data: any) => events.push({ event: name, data });
    handlers.set(name, handler);
    emitter.on(name, handler as any);
  });

  return {
    events,
    stop: () => {
      handlers.forEach((handler, name) => {
        emitter.off(name, handler as any);
      });
    },
  };
}

export function countEventsByType(events: any[], type: string): number {
  return events.filter(e => e.type === type).length;
}

export function getConditionalClicks(events: any[]): any[] {
  return events.filter(e => e.type === 'conditional:click');
}
```

### 4.4 Complete Workflow Tests

```typescript
describe('Complete Workflow Execution', () => {
  it('should execute full recording with CSV and conditional clicks', async () => {
    configureMockOcrSequence(copilotOcrSequence);
    
    const resultPromise = playbackEngine.runWithCSV(
      copilotPromptRecording,
      smartPromptsCSV
    );
    
    // Advance through all timers (polling, delays, etc.)
    await vi.runAllTimersAsync();
    
    const result = await resultPromise;
    
    expect(result.success).toBe(true);
    expect(result.rowsProcessed).toBe(3);
    expect(result.totalStepsExecuted).toBeGreaterThan(0);
  });

  it('should process all CSV rows', async () => {
    configureMockOcrSequence(copilotOcrSequence);
    
    const resultPromise = playbackEngine.runWithCSV(
      copilotPromptRecording,
      smartPromptsCSV
    );
    
    await vi.runAllTimersAsync();
    await resultPromise;
    
    expect(harness.rowsCompleted).toBe(3);
  });

  it('should skip initial steps on subsequent rows', async () => {
    configureMockOcrSequence(copilotOcrSequence);
    
    const resultPromise = playbackEngine.runWithCSV(
      copilotPromptRecording,
      smartPromptsCSV
    );
    
    await vi.runAllTimersAsync();
    await resultPromise;
    
    // Row 1: 4 steps, Rows 2-3: 3 steps each (skip step 1)
    const stepStarts = harness.events.filter(e => e.type === 'step:start');
    expect(stepStarts.length).toBe(4 + 3 + 3); // 10 total
  });

  it('should substitute CSV values into prompts', async () => {
    configureMockOcrSequence(copilotOcrSequence);
    
    const resultPromise = playbackEngine.runWithCSV(
      copilotPromptRecording,
      smartPromptsCSV
    );
    
    await vi.runAllTimersAsync();
    await resultPromise;
    
    // Check that input steps received CSV values
    const inputSteps = harness.events.filter(
      e => e.type === 'step:start' && e.step?.event === 'input'
    );
    
    expect(inputSteps[0].step.value).toContain('Button.tsx');
    expect(inputSteps[1].step.value).toContain('Input.tsx');
    expect(inputSteps[2].step.value).toContain('helpers.ts');
  });
});
```

### 4.5 Conditional Click Tests

```typescript
describe('Conditional Click Behavior', () => {
  it('should click Allow buttons when they appear', async () => {
    configureMockOcrSequence(copilotOcrSequence);
    
    const resultPromise = playbackEngine.runWithCSV(
      copilotPromptRecording,
      smartPromptsCSV
    );
    
    await vi.runAllTimersAsync();
    await resultPromise;
    
    const allowClicks = harness.events.filter(
      e => e.type === 'conditional:click' && e.buttonText === 'Allow'
    );
    
    // Row 1: 1 Allow, Row 2: 1 Allow, Row 3: 2 Allows
    expect(allowClicks.length).toBe(4);
  });

  it('should click Keep buttons when they appear', async () => {
    configureMockOcrSequence(copilotOcrSequence);
    
    const resultPromise = playbackEngine.runWithCSV(
      copilotPromptRecording,
      smartPromptsCSV
    );
    
    await vi.runAllTimersAsync();
    await resultPromise;
    
    const keepClicks = harness.events.filter(
      e => e.type === 'conditional:click' && e.buttonText === 'Keep'
    );
    
    expect(keepClicks.length).toBe(3); // One per row
  });

  it('should detect success text and stop polling', async () => {
    configureMockOcrSequence(copilotOcrSequence);
    
    const resultPromise = playbackEngine.runWithCSV(
      copilotPromptRecording,
      smartPromptsCSV
    );
    
    await vi.runAllTimersAsync();
    await resultPromise;
    
    const successEvents = harness.events.filter(
      e => e.type === 'conditional:success'
    );
    
    expect(successEvents.length).toBe(3); // One per row
    successEvents.forEach(e => {
      expect(e.successText).toContain('committed');
    });
  });

  it('should handle multiple buttons in single poll', async () => {
    // Row 3 has two Allow buttons visible at once
    configureMockOcrSequence(copilotOcrSequence);
    
    const resultPromise = playbackEngine.runWithCSV(
      copilotPromptRecording,
      smartPromptsCSV
    );
    
    await vi.runAllTimersAsync();
    await resultPromise;
    
    // Verify both buttons were clicked in row 3
    const row3Events = harness.events.filter(
      e => e.rowIndex === 2 && e.type === 'conditional:click'
    );
    
    expect(row3Events.filter(e => e.buttonText === 'Allow').length).toBe(2);
  });
});
```

### 4.6 Loop and Timing Tests

```typescript
describe('Loop and Timing Behavior', () => {
  it('should respect global delay between steps', async () => {
    configureMockOcrSequence(copilotOcrSequence);
    
    const stepTimestamps: number[] = [];
    playbackEngine.on('step:complete', (e) => {
      stepTimestamps.push(e.timestamp);
    });
    
    const resultPromise = playbackEngine.runWithCSV(
      copilotPromptRecording,
      smartPromptsCSV
    );
    
    await vi.runAllTimersAsync();
    await resultPromise;
    
    // Check delays between consecutive steps
    for (let i = 1; i < stepTimestamps.length; i++) {
      const delay = stepTimestamps[i] - stepTimestamps[i - 1];
      expect(delay).toBeGreaterThanOrEqual(copilotPromptRecording.globalDelayMs);
    }
  });

  it('should respect poll interval for conditional clicks', async () => {
    configureMockOcrSequence([
      { text: 'Processing...', words: [] },
      { text: 'Processing...', words: [] },
      { text: 'Processing...', words: [] },
      { text: 'Allow', words: [{ text: 'Allow', confidence: 97, bbox: { x0: 100, y0: 100, x1: 170, y1: 130 } }] },
      { text: 'committed', words: [] },
    ]);
    
    const singleRowCSV = { headers: ['prompt'], rows: [['Test prompt']] };
    
    const pollTimestamps: number[] = [];
    playbackEngine.on('conditional:poll', (e) => {
      pollTimestamps.push(e.timestamp);
    });
    
    const resultPromise = playbackEngine.runWithCSV(
      copilotPromptRecording,
      singleRowCSV
    );
    
    await vi.runAllTimersAsync();
    await resultPromise;
    
    // Check poll intervals
    for (let i = 1; i < pollTimestamps.length; i++) {
      const interval = pollTimestamps[i] - pollTimestamps[i - 1];
      expect(interval).toBeGreaterThanOrEqual(
        copilotPromptRecording.steps[3].conditionalConfig!.pollIntervalMs
      );
    }
  });

  it('should advance to next row after success', async () => {
    configureMockOcrSequence(copilotOcrSequence);
    
    const rowEvents: any[] = [];
    playbackEngine.on('row:start', (e) => rowEvents.push({ type: 'start', ...e }));
    playbackEngine.on('row:complete', (e) => rowEvents.push({ type: 'complete', ...e }));
    
    const resultPromise = playbackEngine.runWithCSV(
      copilotPromptRecording,
      smartPromptsCSV
    );
    
    await vi.runAllTimersAsync();
    await resultPromise;
    
    // Verify row sequence
    expect(rowEvents[0]).toMatchObject({ type: 'start', rowIndex: 0 });
    expect(rowEvents[1]).toMatchObject({ type: 'complete', rowIndex: 0 });
    expect(rowEvents[2]).toMatchObject({ type: 'start', rowIndex: 1 });
    expect(rowEvents[3]).toMatchObject({ type: 'complete', rowIndex: 1 });
    expect(rowEvents[4]).toMatchObject({ type: 'start', rowIndex: 2 });
    expect(rowEvents[5]).toMatchObject({ type: 'complete', rowIndex: 2 });
  });
});
```

### 4.7 Error Handling Tests

```typescript
describe('Error Handling', () => {
  it('should handle timeout on conditional click', async () => {
    // OCR never returns a button
    configureMockOcrSequence([
      { text: 'Processing...', words: [] },
      { text: 'Processing...', words: [] },
      { text: 'Processing...', words: [] },
      // No button ever appears
    ]);
    
    const shortTimeoutRecording = {
      ...copilotPromptRecording,
      steps: copilotPromptRecording.steps.map((s, i) => 
        i === 3 ? { ...s, conditionalConfig: { ...s.conditionalConfig!, timeoutSeconds: 2 } } : s
      ),
    };
    
    const singleRowCSV = { headers: ['prompt'], rows: [['Test prompt']] };
    
    const resultPromise = playbackEngine.runWithCSV(
      shortTimeoutRecording,
      singleRowCSV
    );
    
    await vi.runAllTimersAsync();
    const result = await resultPromise;
    
    expect(harness.errors.length).toBeGreaterThan(0);
    expect(harness.errors[0].reason).toContain('timeout');
  });

  it('should continue to next row on step error with continueOnError', async () => {
    configureMockOcrSequence(copilotOcrSequence);
    
    // Simulate DOM step failure
    vi.mocked(chrome.tabs.sendMessage).mockRejectedValueOnce(
      new Error('Element not found')
    );
    
    const resultPromise = playbackEngine.runWithCSV(
      copilotPromptRecording,
      smartPromptsCSV,
      { continueOnError: true }
    );
    
    await vi.runAllTimersAsync();
    const result = await resultPromise;
    
    // Should still process all rows
    expect(harness.rowsCompleted).toBe(3);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should abort all rows on error without continueOnError', async () => {
    configureMockOcrSequence(copilotOcrSequence);
    
    // Simulate failure on first step
    vi.mocked(chrome.tabs.sendMessage).mockRejectedValueOnce(
      new Error('Tab closed')
    );
    
    const resultPromise = playbackEngine.runWithCSV(
      copilotPromptRecording,
      smartPromptsCSV,
      { continueOnError: false }
    );
    
    await vi.runAllTimersAsync();
    const result = await resultPromise;
    
    expect(result.success).toBe(false);
    expect(harness.rowsCompleted).toBe(0);
  });

  it('should handle VisionEngine failure gracefully', async () => {
    // Simulate OCR failure
    vi.mocked(visionEngine['worker'].recognize).mockRejectedValueOnce(
      new Error('OCR service unavailable')
    );
    
    const singleRowCSV = { headers: ['prompt'], rows: [['Test prompt']] };
    
    const resultPromise = playbackEngine.runWithCSV(
      copilotPromptRecording,
      singleRowCSV
    );
    
    await vi.runAllTimersAsync();
    
    expect(harness.errors.length).toBeGreaterThan(0);
  });
});
```

### 4.8 Progress Reporting Tests

```typescript
describe('Progress Reporting', () => {
  it('should emit progress events with accurate counts', async () => {
    configureMockOcrSequence(copilotOcrSequence);
    
    const progressEvents: any[] = [];
    playbackEngine.on('progress', (e) => progressEvents.push(e));
    
    const resultPromise = playbackEngine.runWithCSV(
      copilotPromptRecording,
      smartPromptsCSV
    );
    
    await vi.runAllTimersAsync();
    await resultPromise;
    
    // Should have progress updates
    expect(progressEvents.length).toBeGreaterThan(0);
    
    // Final progress should show completion
    const lastProgress = progressEvents[progressEvents.length - 1];
    expect(lastProgress.currentRow).toBe(3);
    expect(lastProgress.totalRows).toBe(3);
  });

  it('should report step progress within each row', async () => {
    configureMockOcrSequence(copilotOcrSequence);
    
    const stepProgressEvents: any[] = [];
    playbackEngine.on('step:progress', (e) => stepProgressEvents.push(e));
    
    const resultPromise = playbackEngine.runWithCSV(
      copilotPromptRecording,
      smartPromptsCSV
    );
    
    await vi.runAllTimersAsync();
    await resultPromise;
    
    // Check step progress for row 1 (4 steps)
    const row1Steps = stepProgressEvents.filter(e => e.rowIndex === 0);
    expect(row1Steps.length).toBe(4);
    
    // Check step progress for row 2 (3 steps - loop start)
    const row2Steps = stepProgressEvents.filter(e => e.rowIndex === 1);
    expect(row2Steps.length).toBe(3);
  });

  it('should report button clicks in progress', async () => {
    configureMockOcrSequence(copilotOcrSequence);
    
    const resultPromise = playbackEngine.runWithCSV(
      copilotPromptRecording,
      smartPromptsCSV
    );
    
    await vi.runAllTimersAsync();
    const result = await resultPromise;
    
    expect(result.stats.totalAllowClicks).toBe(4);
    expect(result.stats.totalKeepClicks).toBe(3);
    expect(result.stats.totalConditionalClicks).toBe(7);
  });
});
```

### 4.9 Abort and Cleanup Tests

```typescript
describe('Abort and Cleanup', () => {
  it('should stop execution when aborted', async () => {
    configureMockOcrSequence(copilotOcrSequence);
    
    const controller = new AbortController();
    
    const resultPromise = playbackEngine.runWithCSV(
      copilotPromptRecording,
      smartPromptsCSV,
      { signal: controller.signal }
    );
    
    // Let first row complete, then abort
    await vi.advanceTimersByTimeAsync(5000);
    controller.abort();
    await vi.advanceTimersByTimeAsync(1000);
    
    const result = await resultPromise;
    
    expect(result.aborted).toBe(true);
    expect(harness.rowsCompleted).toBeLessThan(3);
  });

  it('should cleanup VisionEngine polling on abort', async () => {
    configureMockOcrSequence([
      { text: 'Processing...', words: [] },
      { text: 'Processing...', words: [] },
      // Would poll forever
    ]);
    
    const controller = new AbortController();
    
    const singleRowCSV = { headers: ['prompt'], rows: [['Test']] };
    
    playbackEngine.runWithCSV(
      copilotPromptRecording,
      singleRowCSV,
      { signal: controller.signal }
    );
    
    await vi.advanceTimersByTimeAsync(2000);
    const timersBefore = vi.getTimerCount();
    
    controller.abort();
    await vi.advanceTimersByTimeAsync(100);
    
    const timersAfter = vi.getTimerCount();
    
    expect(timersAfter).toBeLessThan(timersBefore);
  });

  it('should emit cleanup event on completion', async () => {
    configureMockOcrSequence(copilotOcrSequence);
    
    let cleanupEmitted = false;
    playbackEngine.on('cleanup', () => { cleanupEmitted = true; });
    
    const resultPromise = playbackEngine.runWithCSV(
      copilotPromptRecording,
      smartPromptsCSV
    );
    
    await vi.runAllTimersAsync();
    await resultPromise;
    
    expect(cleanupEmitted).toBe(true);
  });
});
```

---

## 5. TEST EXECUTION

### 5.1 Running Tests

```bash
# Run only E2E workflow tests
npm run test -- copilotWorkflow.test.ts

# Run with coverage
npm run test -- copilotWorkflow.test.ts --coverage

# Run all E2E tests
npm run test -- e2e
```

### 5.2 Expected Output

```
 ✓ Full Copilot Workflow E2E
   ✓ Complete Workflow Execution (4 tests)
   ✓ Conditional Click Behavior (4 tests)
   ✓ Loop and Timing Behavior (3 tests)
   ✓ Error Handling (4 tests)
   ✓ Progress Reporting (3 tests)
   ✓ Abort and Cleanup (3 tests)

Test Files  1 passed (1)
Tests       21 passed (21)
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** Complete workflow executes successfully
- [ ] **AC-2:** All CSV rows processed
- [ ] **AC-3:** Loop start index skips correctly
- [ ] **AC-4:** CSV substitution works
- [ ] **AC-5:** Allow buttons clicked
- [ ] **AC-6:** Keep buttons clicked
- [ ] **AC-7:** Success text stops polling
- [ ] **AC-8:** Errors handled gracefully
- [ ] **AC-9:** Progress reported accurately
- [ ] **AC-10:** Abort stops execution cleanly

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Fake timers** - Required for controlled execution
2. **Sequence mocking** - Complex OCR sequences
3. **Event ordering** - Verify correct event sequence

### Patterns to Follow

1. **Test harness** - Centralized event collection
2. **Async coordination** - Proper timer advancement
3. **Fixture isolation** - Separate fixtures per scenario

### Edge Cases

1. **Empty CSV** - Should complete immediately
2. **Single row** - No looping needed
3. **All errors** - Should report all failures

---

## 8. VERIFICATION COMMANDS

```bash
# Verify test file creation
ls -la src/lib/__tests__/e2e/copilotWorkflow.test.ts

# Verify helpers
ls -la src/lib/__tests__/e2e/helpers/workflowTestUtils.ts

# Verify fixtures
ls -la src/lib/__tests__/fixtures/copilot-workflow.fixture.ts

# Run tests
npm run test -- copilotWorkflow.test.ts

# Check coverage
npm run test -- copilotWorkflow.test.ts --coverage
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Remove test files
rm -rf src/lib/__tests__/e2e/
rm src/lib/__tests__/fixtures/copilot-workflow.fixture.ts
```

---

## 10. REFERENCES

- All ENG specs (ENG-001 to ENG-018)
- All INT specs (INT-001 to INT-009)
- Feature Spec: `/future-spec/03_feature-specs.md`
- Screenshot: Project Knowledge (Copilot workflow)

---

*End of Specification TST-010*
