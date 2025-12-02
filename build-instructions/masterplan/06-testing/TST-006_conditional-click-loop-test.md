# TST-006: Conditional Click Loop Tests

> **Build Card:** TST-006  
> **Category:** Testing & Validation  
> **Dependencies:** ENG-014, TST-004, TST-005  
> **Risk Level:** High  
> **Estimated Lines:** 320-380

---

## 1. PURPOSE

Create comprehensive unit tests for the conditional click polling loop functionality. These tests verify that the `waitAndClickButtons()` function correctly polls for button text, clicks when found, handles multiple button texts, respects timeout settings, detects success conditions, and properly terminates. Critical for automating Copilot's Allow/Keep button workflows where buttons appear unpredictably.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| VisionEngine Class | `src/lib/visionEngine.ts` | waitAndClickButtons() method |
| ConditionalClickConfig | `src/types/vision.types.ts` | Config interface |
| ENG-014 Spec | `build-instructions/masterplan/03-engine/ENG-014_wait-and-click-buttons.md` | Polling requirements |
| TST-004/TST-005 | Previous tests | Mock patterns |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/lib/__tests__/visionEngine.conditionalClick.test.ts` | CREATE | +280 |
| `src/lib/__tests__/mocks/tesseract.mock.ts` | MODIFY | +30 |
| `src/lib/__tests__/fixtures/conditional-scenarios.fixture.ts` | CREATE | +80 |

### Artifacts

- Conditional click loop test suite
- Time-based mock sequence helper
- Polling scenario fixtures

---

## 4. DETAILED SPECIFICATION

### 4.1 Test File Structure

```typescript
// src/lib/__tests__/visionEngine.conditionalClick.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VisionEngine } from '../visionEngine';
import { 
  createMockTesseract, 
  configureMockOcrResult,
  configureMockOcrSequence,
} from './mocks/tesseract.mock';
import { createMockChrome } from './mocks/chrome.mock';
import {
  noButtonsResult,
  allowButtonResult,
  keepButtonResult,
  allowAndKeepResult,
  successTextResult,
  buttonAppearsAfterDelaySequence,
  multipleButtonClicksSequence,
} from './fixtures/conditional-scenarios.fixture';

// Mock dependencies
vi.stubGlobal('chrome', createMockChrome());
vi.mock('tesseract.js', () => createMockTesseract());

// Use fake timers for polling tests
vi.useFakeTimers();

describe('VisionEngine Conditional Click Loop', () => {
  let engine: VisionEngine;

  beforeEach(async () => {
    vi.clearAllMocks();
    engine = new VisionEngine();
    await engine.initialize();
  });

  afterEach(async () => {
    await engine.terminate();
    vi.clearAllTimers();
  });

  // Test suites defined below...
});
```

### 4.2 Conditional Scenario Fixtures

```typescript
// src/lib/__tests__/fixtures/conditional-scenarios.fixture.ts

import { TesseractResult } from '../../types/tesseract.types';

/**
 * No buttons visible - initial state or after clicking
 */
export const noButtonsResult: TesseractResult = {
  data: {
    text: 'Copilot is processing your request...',
    confidence: 90.0,
    words: [
      { text: 'Copilot', confidence: 92.0, bbox: { x0: 20, y0: 20, x1: 100, y1: 45 } },
      { text: 'is', confidence: 88.0, bbox: { x0: 110, y0: 20, x1: 130, y1: 45 } },
      { text: 'processing', confidence: 91.0, bbox: { x0: 140, y0: 20, x1: 240, y1: 45 } },
      { text: 'your', confidence: 89.0, bbox: { x0: 250, y0: 20, x1: 295, y1: 45 } },
      { text: 'request...', confidence: 87.0, bbox: { x0: 305, y0: 20, x1: 390, y1: 45 } },
    ],
    lines: [],
  },
};

/**
 * Allow button visible
 */
export const allowButtonResult: TesseractResult = {
  data: {
    text: 'Copilot wants to edit file.ts\n\nAllow',
    confidence: 93.0,
    words: [
      { text: 'Copilot', confidence: 94.0, bbox: { x0: 20, y0: 20, x1: 100, y1: 45 } },
      { text: 'wants', confidence: 92.0, bbox: { x0: 110, y0: 20, x1: 165, y1: 45 } },
      { text: 'to', confidence: 88.0, bbox: { x0: 175, y0: 20, x1: 195, y1: 45 } },
      { text: 'edit', confidence: 91.0, bbox: { x0: 205, y0: 20, x1: 250, y1: 45 } },
      { text: 'file.ts', confidence: 89.0, bbox: { x0: 260, y0: 20, x1: 330, y1: 45 } },
      { text: 'Allow', confidence: 97.0, bbox: { x0: 150, y0: 100, x1: 220, y1: 130 } },
    ],
    lines: [],
  },
};

/**
 * Keep button visible
 */
export const keepButtonResult: TesseractResult = {
  data: {
    text: 'Changes ready to commit\n\nKeep',
    confidence: 92.0,
    words: [
      { text: 'Changes', confidence: 93.0, bbox: { x0: 20, y0: 20, x1: 100, y1: 45 } },
      { text: 'ready', confidence: 91.0, bbox: { x0: 110, y0: 20, x1: 165, y1: 45 } },
      { text: 'to', confidence: 88.0, bbox: { x0: 175, y0: 20, x1: 195, y1: 45 } },
      { text: 'commit', confidence: 94.0, bbox: { x0: 205, y0: 20, x1: 275, y1: 45 } },
      { text: 'Keep', confidence: 96.0, bbox: { x0: 150, y0: 100, x1: 210, y1: 130 } },
    ],
    lines: [],
  },
};

/**
 * Both Allow and Keep buttons visible
 */
export const allowAndKeepResult: TesseractResult = {
  data: {
    text: 'Review changes\n\nAllow    Keep',
    confidence: 94.0,
    words: [
      { text: 'Review', confidence: 92.0, bbox: { x0: 20, y0: 20, x1: 90, y1: 45 } },
      { text: 'changes', confidence: 91.0, bbox: { x0: 100, y0: 20, x1: 180, y1: 45 } },
      { text: 'Allow', confidence: 97.0, bbox: { x0: 100, y0: 100, x1: 170, y1: 130 } },
      { text: 'Keep', confidence: 96.0, bbox: { x0: 200, y0: 100, x1: 260, y1: 130 } },
    ],
    lines: [],
  },
};

/**
 * Success text visible (commit completed)
 */
export const successTextResult: TesseractResult = {
  data: {
    text: 'Changes committed successfully',
    confidence: 95.0,
    words: [
      { text: 'Changes', confidence: 94.0, bbox: { x0: 20, y0: 20, x1: 100, y1: 45 } },
      { text: 'committed', confidence: 96.0, bbox: { x0: 110, y0: 20, x1: 210, y1: 45 } },
      { text: 'successfully', confidence: 95.0, bbox: { x0: 220, y0: 20, x1: 340, y1: 45 } },
    ],
    lines: [],
  },
};

/**
 * Sequence: Button appears after 3 polls
 */
export const buttonAppearsAfterDelaySequence: TesseractResult[] = [
  noButtonsResult,
  noButtonsResult,
  noButtonsResult,
  allowButtonResult,
];

/**
 * Sequence: Multiple buttons need clicking
 */
export const multipleButtonClicksSequence: TesseractResult[] = [
  allowButtonResult,      // Poll 1: Allow visible, click it
  noButtonsResult,        // Poll 2: Processing
  keepButtonResult,       // Poll 3: Keep visible, click it
  noButtonsResult,        // Poll 4: Processing
  successTextResult,      // Poll 5: Success!
];

/**
 * Sequence: Buttons keep appearing (stress test)
 */
export const manyButtonsSequence: TesseractResult[] = [
  allowButtonResult,
  noButtonsResult,
  allowButtonResult,
  noButtonsResult,
  keepButtonResult,
  noButtonsResult,
  allowButtonResult,
  noButtonsResult,
  keepButtonResult,
  successTextResult,
];
```

### 4.3 Enhanced Tesseract Mock for Sequences

```typescript
// Add to src/lib/__tests__/mocks/tesseract.mock.ts

let mockResultSequence: TesseractResult[] = [];
let sequenceIndex = 0;

export function configureMockOcrSequence(sequence: TesseractResult[]) {
  mockResultSequence = [...sequence];
  sequenceIndex = 0;
}

export function createMockTesseract() {
  const mockWorker = {
    recognize: vi.fn().mockImplementation((image) => {
      if (mockResultSequence.length > 0) {
        const result = mockResultSequence[sequenceIndex];
        sequenceIndex = Math.min(sequenceIndex + 1, mockResultSequence.length - 1);
        return Promise.resolve(result);
      }
      return Promise.resolve(currentMockResult);
    }),
    terminate: vi.fn().mockResolvedValue(undefined),
    load: vi.fn().mockResolvedValue(undefined),
    loadLanguage: vi.fn().mockResolvedValue(undefined),
    initialize: vi.fn().mockResolvedValue(undefined),
    setParameters: vi.fn().mockResolvedValue(undefined),
  };

  return {
    createWorker: vi.fn().mockResolvedValue(mockWorker),
    PSM: { AUTO: 3, SINGLE_BLOCK: 6, SINGLE_LINE: 7 },
    OEM: { LSTM_ONLY: 1 },
  };
}

export function resetMockSequence() {
  mockResultSequence = [];
  sequenceIndex = 0;
}
```

### 4.4 Basic Polling Tests

```typescript
describe('waitAndClickButtons()', () => {
  const defaultConfig = {
    buttonTexts: ['Allow', 'Keep'],
    successText: 'committed',
    timeoutSeconds: 300,
    pollIntervalMs: 500,
    confidenceThreshold: 0.7,
  };

  it('should immediately click if button is visible', async () => {
    configureMockOcrResult(allowButtonResult);
    
    const resultPromise = engine.waitAndClickButtons(defaultConfig);
    await vi.advanceTimersByTimeAsync(100);
    const result = await resultPromise;
    
    expect(result.success).toBe(true);
    expect(result.buttonsClicked).toContain('Allow');
  });

  it('should poll until button appears', async () => {
    configureMockOcrSequence(buttonAppearsAfterDelaySequence);
    
    const resultPromise = engine.waitAndClickButtons(defaultConfig);
    
    // Advance through polls
    await vi.advanceTimersByTimeAsync(500);  // Poll 1: no button
    await vi.advanceTimersByTimeAsync(500);  // Poll 2: no button
    await vi.advanceTimersByTimeAsync(500);  // Poll 3: no button
    await vi.advanceTimersByTimeAsync(500);  // Poll 4: Allow found!
    
    const result = await resultPromise;
    
    expect(result.success).toBe(true);
    expect(result.buttonsClicked).toContain('Allow');
    expect(result.pollCount).toBe(4);
  });

  it('should click multiple buttons in sequence', async () => {
    configureMockOcrSequence(multipleButtonClicksSequence);
    
    const resultPromise = engine.waitAndClickButtons(defaultConfig);
    
    // Advance through sequence
    for (let i = 0; i < 5; i++) {
      await vi.advanceTimersByTimeAsync(500);
    }
    
    const result = await resultPromise;
    
    expect(result.success).toBe(true);
    expect(result.buttonsClicked).toContain('Allow');
    expect(result.buttonsClicked).toContain('Keep');
    expect(result.totalClicks).toBe(2);
  });

  it('should terminate when success text is found', async () => {
    configureMockOcrSequence(multipleButtonClicksSequence);
    
    const resultPromise = engine.waitAndClickButtons(defaultConfig);
    
    // Advance to success
    for (let i = 0; i < 6; i++) {
      await vi.advanceTimersByTimeAsync(500);
    }
    
    const result = await resultPromise;
    
    expect(result.success).toBe(true);
    expect(result.successTextFound).toBe(true);
    expect(result.terminationReason).toBe('success_text');
  });

  it('should respect poll interval', async () => {
    configureMockOcrSequence([noButtonsResult, noButtonsResult, allowButtonResult]);
    const customConfig = { ...defaultConfig, pollIntervalMs: 1000 };
    
    const resultPromise = engine.waitAndClickButtons(customConfig);
    
    // At 500ms, should not have found button yet
    await vi.advanceTimersByTimeAsync(500);
    expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
    
    // At 1000ms, second poll happens
    await vi.advanceTimersByTimeAsync(500);
    expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
    
    // At 2000ms, third poll finds button
    await vi.advanceTimersByTimeAsync(1000);
    
    const result = await resultPromise;
    expect(result.success).toBe(true);
  });
});
```

### 4.5 Timeout Tests

```typescript
describe('Timeout Handling', () => {
  it('should timeout if button never appears', async () => {
    configureMockOcrResult(noButtonsResult);
    const config = {
      buttonTexts: ['Allow'],
      successText: null,
      timeoutSeconds: 5,
      pollIntervalMs: 500,
      confidenceThreshold: 0.7,
    };
    
    const resultPromise = engine.waitAndClickButtons(config);
    
    // Advance past timeout
    await vi.advanceTimersByTimeAsync(6000);
    
    const result = await resultPromise;
    
    expect(result.success).toBe(false);
    expect(result.terminationReason).toBe('timeout');
    expect(result.buttonsClicked).toHaveLength(0);
  });

  it('should report time elapsed at timeout', async () => {
    configureMockOcrResult(noButtonsResult);
    const config = {
      buttonTexts: ['Allow'],
      successText: null,
      timeoutSeconds: 10,
      pollIntervalMs: 500,
      confidenceThreshold: 0.7,
    };
    
    const resultPromise = engine.waitAndClickButtons(config);
    await vi.advanceTimersByTimeAsync(11000);
    
    const result = await resultPromise;
    
    expect(result.elapsedSeconds).toBeGreaterThanOrEqual(10);
  });

  it('should complete before timeout if success found', async () => {
    configureMockOcrSequence([noButtonsResult, allowButtonResult, successTextResult]);
    const config = {
      buttonTexts: ['Allow'],
      successText: 'committed',
      timeoutSeconds: 300,
      pollIntervalMs: 500,
      confidenceThreshold: 0.7,
    };
    
    const resultPromise = engine.waitAndClickButtons(config);
    
    // Only advance 1.5 seconds
    await vi.advanceTimersByTimeAsync(1500);
    
    const result = await resultPromise;
    
    expect(result.success).toBe(true);
    expect(result.elapsedSeconds).toBeLessThan(5);
  });

  it('should handle zero timeout (immediate check only)', async () => {
    configureMockOcrResult(noButtonsResult);
    const config = {
      buttonTexts: ['Allow'],
      successText: null,
      timeoutSeconds: 0,
      pollIntervalMs: 500,
      confidenceThreshold: 0.7,
    };
    
    const result = await engine.waitAndClickButtons(config);
    
    expect(result.success).toBe(false);
    expect(result.pollCount).toBe(1);
  });
});
```

### 4.6 Button Text Matching Tests

```typescript
describe('Button Text Matching', () => {
  it('should match any button in buttonTexts array', async () => {
    configureMockOcrResult(keepButtonResult);
    const config = {
      buttonTexts: ['Allow', 'Keep', 'Accept'],
      successText: null,
      timeoutSeconds: 10,
      pollIntervalMs: 500,
      confidenceThreshold: 0.7,
    };
    
    const resultPromise = engine.waitAndClickButtons(config);
    await vi.advanceTimersByTimeAsync(100);
    
    const result = await resultPromise;
    
    expect(result.success).toBe(true);
    expect(result.buttonsClicked).toContain('Keep');
  });

  it('should click first matching button when multiple visible', async () => {
    configureMockOcrResult(allowAndKeepResult);
    const config = {
      buttonTexts: ['Allow', 'Keep'],
      successText: null,
      timeoutSeconds: 10,
      pollIntervalMs: 500,
      confidenceThreshold: 0.7,
    };
    
    const resultPromise = engine.waitAndClickButtons(config);
    await vi.advanceTimersByTimeAsync(100);
    
    const result = await resultPromise;
    
    expect(result.success).toBe(true);
    // Should click Allow (first in buttonTexts)
    expect(result.buttonsClicked[0]).toBe('Allow');
  });

  it('should be case-insensitive for button matching', async () => {
    configureMockOcrResult(allowButtonResult);
    const config = {
      buttonTexts: ['allow', 'KEEP'],
      successText: null,
      timeoutSeconds: 10,
      pollIntervalMs: 500,
      confidenceThreshold: 0.7,
    };
    
    const resultPromise = engine.waitAndClickButtons(config);
    await vi.advanceTimersByTimeAsync(100);
    
    const result = await resultPromise;
    
    expect(result.success).toBe(true);
    expect(result.buttonsClicked).toHaveLength(1);
  });

  it('should respect confidence threshold for buttons', async () => {
    // Create result with low confidence button
    const lowConfidenceButtonResult = {
      data: {
        text: 'Allow',
        confidence: 50.0,
        words: [
          { text: 'Allow', confidence: 50.0, bbox: { x0: 100, y0: 100, x1: 170, y1: 130 } },
        ],
        lines: [],
      },
    };
    configureMockOcrResult(lowConfidenceButtonResult);
    
    const config = {
      buttonTexts: ['Allow'],
      successText: null,
      timeoutSeconds: 2,
      pollIntervalMs: 500,
      confidenceThreshold: 0.7,
    };
    
    const resultPromise = engine.waitAndClickButtons(config);
    await vi.advanceTimersByTimeAsync(3000);
    
    const result = await resultPromise;
    
    // Should timeout because button confidence too low
    expect(result.success).toBe(false);
    expect(result.terminationReason).toBe('timeout');
  });
});
```

### 4.7 Success Text Detection Tests

```typescript
describe('Success Text Detection', () => {
  it('should stop polling when success text found', async () => {
    configureMockOcrResult(successTextResult);
    const config = {
      buttonTexts: ['Allow'],
      successText: 'committed',
      timeoutSeconds: 300,
      pollIntervalMs: 500,
      confidenceThreshold: 0.7,
    };
    
    const resultPromise = engine.waitAndClickButtons(config);
    await vi.advanceTimersByTimeAsync(100);
    
    const result = await resultPromise;
    
    expect(result.success).toBe(true);
    expect(result.successTextFound).toBe(true);
    expect(result.pollCount).toBe(1);
  });

  it('should use contains matching for success text', async () => {
    configureMockOcrResult(successTextResult);
    const config = {
      buttonTexts: ['Allow'],
      successText: 'commit', // Partial match
      timeoutSeconds: 300,
      pollIntervalMs: 500,
      confidenceThreshold: 0.7,
    };
    
    const resultPromise = engine.waitAndClickButtons(config);
    await vi.advanceTimersByTimeAsync(100);
    
    const result = await resultPromise;
    
    expect(result.success).toBe(true);
    expect(result.successTextFound).toBe(true);
  });

  it('should continue if successText is null', async () => {
    configureMockOcrSequence([allowButtonResult, noButtonsResult, noButtonsResult]);
    const config = {
      buttonTexts: ['Allow'],
      successText: null,  // No success text - rely on timeout
      timeoutSeconds: 2,
      pollIntervalMs: 500,
      confidenceThreshold: 0.7,
    };
    
    const resultPromise = engine.waitAndClickButtons(config);
    await vi.advanceTimersByTimeAsync(3000);
    
    const result = await resultPromise;
    
    // Should timeout but still report clicks
    expect(result.buttonsClicked).toContain('Allow');
    expect(result.terminationReason).toBe('timeout');
  });

  it('should prioritize success text over button clicking', async () => {
    // Success text AND button visible - should stop, not click
    const successWithButtonResult = {
      data: {
        text: 'committed successfully\n\nAllow',
        confidence: 94.0,
        words: [
          { text: 'committed', confidence: 95.0, bbox: { x0: 20, y0: 20, x1: 120, y1: 45 } },
          { text: 'successfully', confidence: 93.0, bbox: { x0: 130, y0: 20, x1: 250, y1: 45 } },
          { text: 'Allow', confidence: 97.0, bbox: { x0: 100, y0: 100, x1: 170, y1: 130 } },
        ],
        lines: [],
      },
    };
    configureMockOcrResult(successWithButtonResult);
    
    const config = {
      buttonTexts: ['Allow'],
      successText: 'committed',
      timeoutSeconds: 300,
      pollIntervalMs: 500,
      confidenceThreshold: 0.7,
    };
    
    const resultPromise = engine.waitAndClickButtons(config);
    await vi.advanceTimersByTimeAsync(100);
    
    const result = await resultPromise;
    
    expect(result.success).toBe(true);
    expect(result.successTextFound).toBe(true);
    // Should NOT click the button since success was found
    expect(chrome.tabs.sendMessage).not.toHaveBeenCalled();
  });
});
```

### 4.8 Abort and Cleanup Tests

```typescript
describe('Abort and Cleanup', () => {
  it('should support abort signal', async () => {
    configureMockOcrResult(noButtonsResult);
    const controller = new AbortController();
    
    const config = {
      buttonTexts: ['Allow'],
      successText: null,
      timeoutSeconds: 300,
      pollIntervalMs: 500,
      confidenceThreshold: 0.7,
      signal: controller.signal,
    };
    
    const resultPromise = engine.waitAndClickButtons(config);
    
    // Abort after 1 second
    await vi.advanceTimersByTimeAsync(1000);
    controller.abort();
    await vi.advanceTimersByTimeAsync(100);
    
    const result = await resultPromise;
    
    expect(result.success).toBe(false);
    expect(result.terminationReason).toBe('aborted');
  });

  it('should cleanup polling on abort', async () => {
    configureMockOcrResult(noButtonsResult);
    const controller = new AbortController();
    
    const config = {
      buttonTexts: ['Allow'],
      successText: null,
      timeoutSeconds: 300,
      pollIntervalMs: 500,
      confidenceThreshold: 0.7,
      signal: controller.signal,
    };
    
    engine.waitAndClickButtons(config);
    
    await vi.advanceTimersByTimeAsync(1000);
    const pollCountBefore = vi.getTimerCount();
    
    controller.abort();
    await vi.advanceTimersByTimeAsync(100);
    
    const pollCountAfter = vi.getTimerCount();
    
    // Polling timer should be cleared
    expect(pollCountAfter).toBeLessThan(pollCountBefore);
  });

  it('should emit progress events', async () => {
    configureMockOcrSequence([noButtonsResult, allowButtonResult]);
    const progressEvents: any[] = [];
    
    const config = {
      buttonTexts: ['Allow'],
      successText: null,
      timeoutSeconds: 300,
      pollIntervalMs: 500,
      confidenceThreshold: 0.7,
      onProgress: (event: any) => progressEvents.push(event),
    };
    
    const resultPromise = engine.waitAndClickButtons(config);
    await vi.advanceTimersByTimeAsync(1500);
    await resultPromise;
    
    expect(progressEvents.length).toBeGreaterThan(0);
    expect(progressEvents[0]).toHaveProperty('pollCount');
    expect(progressEvents[0]).toHaveProperty('elapsedMs');
  });

  it('should emit click events', async () => {
    configureMockOcrResult(allowButtonResult);
    const clickEvents: any[] = [];
    
    const config = {
      buttonTexts: ['Allow'],
      successText: null,
      timeoutSeconds: 300,
      pollIntervalMs: 500,
      confidenceThreshold: 0.7,
      onButtonClick: (event: any) => clickEvents.push(event),
    };
    
    const resultPromise = engine.waitAndClickButtons(config);
    await vi.advanceTimersByTimeAsync(100);
    await resultPromise;
    
    expect(clickEvents).toHaveLength(1);
    expect(clickEvents[0].buttonText).toBe('Allow');
    expect(clickEvents[0].coordinates).toBeDefined();
  });
});
```

---

## 5. TEST EXECUTION

### 5.1 Running Tests

```bash
# Run only conditional click tests
npm run test -- visionEngine.conditionalClick.test.ts

# Run with coverage
npm run test -- visionEngine.conditionalClick.test.ts --coverage

# Run all VisionEngine tests
npm run test -- visionEngine
```

### 5.2 Expected Output

```
 ✓ VisionEngine Conditional Click Loop
   ✓ waitAndClickButtons() (5 tests)
   ✓ Timeout Handling (4 tests)
   ✓ Button Text Matching (4 tests)
   ✓ Success Text Detection (4 tests)
   ✓ Abort and Cleanup (4 tests)

Test Files  1 passed (1)
Tests       21 passed (21)
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** Basic polling tests pass
- [ ] **AC-2:** Button appears after delay handled
- [ ] **AC-3:** Multiple button clicks work
- [ ] **AC-4:** Timeout correctly terminates
- [ ] **AC-5:** Success text detection works
- [ ] **AC-6:** Button text matching is case-insensitive
- [ ] **AC-7:** Confidence threshold respected
- [ ] **AC-8:** Abort signal stops polling
- [ ] **AC-9:** Progress events emitted
- [ ] **AC-10:** Test coverage > 90% for waitAndClickButtons

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Fake timers** - Required for testing polling
2. **Sequence mocking** - Must support result sequences
3. **Async coordination** - Timer advancement with promises

### Patterns to Follow

1. **Timer mocking** - Use vi.useFakeTimers()
2. **Sequence fixtures** - Pre-defined OCR result sequences
3. **Event capture** - Callbacks for progress tracking

### Edge Cases

1. **Rapid button appearance** - Button found on first poll
2. **Button disappears** - Was visible, now gone
3. **Multiple success texts** - Any match should work

---

## 8. VERIFICATION COMMANDS

```bash
# Verify test file creation
ls -la src/lib/__tests__/visionEngine.conditionalClick.test.ts

# Verify fixtures
ls -la src/lib/__tests__/fixtures/conditional-scenarios.fixture.ts

# Run tests
npm run test -- visionEngine.conditionalClick.test.ts

# Check coverage
npm run test -- visionEngine.conditionalClick.test.ts --coverage
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Remove test file
rm src/lib/__tests__/visionEngine.conditionalClick.test.ts

# Remove fixtures
rm src/lib/__tests__/fixtures/conditional-scenarios.fixture.ts

# Revert mock changes
git checkout src/lib/__tests__/mocks/tesseract.mock.ts
```

---

## 10. REFERENCES

- ENG-014: Wait and Click Buttons
- TST-004: FindText Accuracy Tests
- TST-005: Coordinate Click Tests
- Feature Spec: `/future-spec/03_feature-specs.md` Section 2

---

*End of Specification TST-006*
