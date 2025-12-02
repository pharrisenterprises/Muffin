# TST-007: Vision Recording Fallback Tests

> **Build Card:** TST-007  
> **Category:** Testing & Validation  
> **Dependencies:** INT-009, ENG-001, TST-001  
> **Risk Level:** Medium  
> **Estimated Lines:** 200-240

---

## 1. PURPOSE

Create comprehensive unit tests for the Vision recording fallback functionality. These tests verify that when DOM-based recording fails (element not found, selector unreliable, dynamic content), the system correctly falls back to Vision-based recording, captures the appropriate screen region, and stores the step with `recordedVia: 'vision'`. Essential for ensuring robust recording on complex web applications like Copilot.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| INT-009 Spec | `build-instructions/masterplan/04-integration/INT-009_vision-fallback-recording.md` | Fallback logic |
| RecordingEngine | `src/lib/recordingEngine.ts` | Recording methods |
| Step Interface | `src/types/step.types.ts` | recordedVia field |
| TST-001 | VisionEngine init tests | Mock patterns |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/lib/__tests__/recordingEngine.fallback.test.ts` | CREATE | +180 |
| `src/lib/__tests__/mocks/dom.mock.ts` | CREATE | +50 |

### Artifacts

- Vision fallback recording test suite
- DOM interaction mock helpers
- Fallback trigger scenario tests

---

## 4. DETAILED SPECIFICATION

### 4.1 Test File Structure

```typescript
// src/lib/__tests__/recordingEngine.fallback.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RecordingEngine } from '../recordingEngine';
import { VisionEngine } from '../visionEngine';
import { createMockTesseract, configureMockOcrResult } from './mocks/tesseract.mock';
import { createMockChrome } from './mocks/chrome.mock';
import { 
  createMockDom, 
  simulateElementNotFound,
  simulateDynamicContent,
  simulateIframeContent,
} from './mocks/dom.mock';
import { allowButtonResult } from './fixtures/ocr-results.fixture';

// Mock dependencies
vi.stubGlobal('chrome', createMockChrome());
vi.mock('tesseract.js', () => createMockTesseract());

describe('Vision Recording Fallback', () => {
  let recordingEngine: RecordingEngine;
  let visionEngine: VisionEngine;

  beforeEach(async () => {
    vi.clearAllMocks();
    visionEngine = new VisionEngine();
    await visionEngine.initialize();
    recordingEngine = new RecordingEngine({ visionEngine });
  });

  afterEach(async () => {
    await visionEngine.terminate();
  });

  // Test suites defined below...
});
```

### 4.2 DOM Mock Helpers

```typescript
// src/lib/__tests__/mocks/dom.mock.ts

import { vi } from 'vitest';

export interface MockElement {
  tagName: string;
  id?: string;
  className?: string;
  innerText?: string;
  getBoundingClientRect: () => DOMRect;
  closest: (selector: string) => MockElement | null;
  matches: (selector: string) => boolean;
}

export function createMockDom() {
  return {
    querySelector: vi.fn().mockImplementation((selector: string) => {
      return createMockElement('button', { innerText: 'Allow' });
    }),
    querySelectorAll: vi.fn().mockReturnValue([]),
    elementFromPoint: vi.fn().mockImplementation((x: number, y: number) => {
      return createMockElement('button', { innerText: 'Allow' });
    }),
  };
}

export function createMockElement(
  tagName: string, 
  props: Partial<MockElement> = {}
): MockElement {
  return {
    tagName,
    id: props.id || '',
    className: props.className || '',
    innerText: props.innerText || '',
    getBoundingClientRect: () => ({
      x: 100,
      y: 100,
      width: 80,
      height: 30,
      top: 100,
      right: 180,
      bottom: 130,
      left: 100,
      toJSON: () => ({}),
    }),
    closest: vi.fn().mockReturnValue(null),
    matches: vi.fn().mockReturnValue(true),
    ...props,
  };
}

export function simulateElementNotFound() {
  return {
    querySelector: vi.fn().mockReturnValue(null),
    querySelectorAll: vi.fn().mockReturnValue([]),
    elementFromPoint: vi.fn().mockReturnValue(null),
  };
}

export function simulateDynamicContent() {
  let callCount = 0;
  return {
    querySelector: vi.fn().mockImplementation((selector: string) => {
      callCount++;
      // Element exists on first call, gone on second
      return callCount === 1 ? createMockElement('button') : null;
    }),
    querySelectorAll: vi.fn().mockReturnValue([]),
    elementFromPoint: vi.fn().mockReturnValue(null),
  };
}

export function simulateIframeContent() {
  return {
    querySelector: vi.fn().mockReturnValue(null),
    querySelectorAll: vi.fn().mockReturnValue([]),
    elementFromPoint: vi.fn().mockImplementation(() => {
      const iframe = createMockElement('iframe');
      // Simulates cross-origin iframe - can't access content
      return iframe;
    }),
  };
}

export function simulateUnreliableSelector() {
  return {
    querySelector: vi.fn().mockImplementation((selector: string) => {
      // Returns different elements for same selector
      return createMockElement('button', { 
        innerText: Math.random() > 0.5 ? 'Allow' : 'Deny' 
      });
    }),
    querySelectorAll: vi.fn().mockReturnValue([
      createMockElement('button', { innerText: 'Allow' }),
      createMockElement('button', { innerText: 'Deny' }),
      createMockElement('button', { innerText: 'Keep' }),
    ]),
    elementFromPoint: vi.fn().mockReturnValue(null),
  };
}
```

### 4.3 Fallback Trigger Tests

```typescript
describe('Fallback Triggers', () => {
  it('should use Vision when DOM element not found', async () => {
    vi.stubGlobal('document', simulateElementNotFound());
    configureMockOcrResult(allowButtonResult);
    
    const step = await recordingEngine.recordClick({ x: 150, y: 115 });
    
    expect(step.recordedVia).toBe('vision');
    expect(step.path).toBe(''); // No DOM path
    expect(step.visionTarget).toBeDefined();
  });

  it('should use Vision when selector matches multiple elements', async () => {
    vi.stubGlobal('document', simulateUnreliableSelector());
    configureMockOcrResult(allowButtonResult);
    
    const step = await recordingEngine.recordClick({ x: 150, y: 115 });
    
    expect(step.recordedVia).toBe('vision');
  });

  it('should use Vision for iframe content', async () => {
    vi.stubGlobal('document', simulateIframeContent());
    configureMockOcrResult(allowButtonResult);
    
    const step = await recordingEngine.recordClick({ x: 150, y: 115 });
    
    expect(step.recordedVia).toBe('vision');
  });

  it('should use Vision when element disappears quickly', async () => {
    vi.stubGlobal('document', simulateDynamicContent());
    configureMockOcrResult(allowButtonResult);
    
    // First verification succeeds, second fails
    const step = await recordingEngine.recordClick({ x: 150, y: 115 });
    
    expect(step.recordedVia).toBe('vision');
  });

  it('should use DOM when element is stable', async () => {
    vi.stubGlobal('document', createMockDom());
    
    const step = await recordingEngine.recordClick({ x: 150, y: 115 });
    
    expect(step.recordedVia).toBe('dom');
    expect(step.path).toBeTruthy();
  });
});
```

### 4.4 Vision Data Capture Tests

```typescript
describe('Vision Data Capture', () => {
  beforeEach(() => {
    vi.stubGlobal('document', simulateElementNotFound());
    configureMockOcrResult(allowButtonResult);
  });

  it('should capture text at click location', async () => {
    const step = await recordingEngine.recordClick({ x: 185, y: 115 });
    
    expect(step.visionTarget).toBeDefined();
    expect(step.visionTarget.text).toBe('Allow');
  });

  it('should capture bounding box', async () => {
    const step = await recordingEngine.recordClick({ x: 185, y: 115 });
    
    expect(step.visionTarget.bbox).toEqual({
      x0: 150, y0: 100, x1: 220, y1: 130
    });
  });

  it('should capture confidence score', async () => {
    const step = await recordingEngine.recordClick({ x: 185, y: 115 });
    
    expect(step.visionTarget.confidence).toBe(97.0);
  });

  it('should capture screenshot region', async () => {
    const step = await recordingEngine.recordClick({ x: 185, y: 115 });
    
    expect(step.visionTarget.screenshotRegion).toBeDefined();
    // Should be base64 image data
    expect(step.visionTarget.screenshotRegion).toMatch(/^data:image\//);
  });

  it('should store click coordinates relative to text', async () => {
    const step = await recordingEngine.recordClick({ x: 185, y: 115 });
    
    expect(step.visionTarget.clickOffset).toBeDefined();
    expect(step.visionTarget.clickOffset.x).toBe(0); // Center
    expect(step.visionTarget.clickOffset.y).toBe(0); // Center
  });
});
```

### 4.5 Step Structure Tests

```typescript
describe('Step Structure', () => {
  beforeEach(() => {
    vi.stubGlobal('document', simulateElementNotFound());
    configureMockOcrResult(allowButtonResult);
  });

  it('should create valid step with vision recording', async () => {
    const step = await recordingEngine.recordClick({ x: 185, y: 115 });
    
    expect(step).toMatchObject({
      id: expect.any(String),
      event: 'click',
      recordedVia: 'vision',
      label: expect.any(String),
      timestamp: expect.any(Number),
    });
  });

  it('should generate label from detected text', async () => {
    const step = await recordingEngine.recordClick({ x: 185, y: 115 });
    
    expect(step.label).toContain('Allow');
  });

  it('should set path to empty for vision steps', async () => {
    const step = await recordingEngine.recordClick({ x: 185, y: 115 });
    
    expect(step.path).toBe('');
  });

  it('should include fallback reason', async () => {
    const step = await recordingEngine.recordClick({ x: 185, y: 115 });
    
    expect(step.visionTarget.fallbackReason).toBe('element_not_found');
  });

  it('should be playable by VisionEngine', async () => {
    const step = await recordingEngine.recordClick({ x: 185, y: 115 });
    
    // Verify step has all required fields for vision playback
    expect(step.recordedVia).toBe('vision');
    expect(step.visionTarget.text).toBeDefined();
    expect(step.visionTarget.bbox).toBeDefined();
  });
});
```

### 4.6 Fallback Decision Tests

```typescript
describe('Fallback Decision Logic', () => {
  it('should prefer DOM when available and reliable', async () => {
    vi.stubGlobal('document', createMockDom());
    
    const step = await recordingEngine.recordClick({ x: 150, y: 115 });
    
    expect(step.recordedVia).toBe('dom');
  });

  it('should check selector uniqueness before using DOM', async () => {
    const mockDom = createMockDom();
    mockDom.querySelectorAll = vi.fn().mockReturnValue([
      createMockElement('button'),
      createMockElement('button'),
    ]);
    vi.stubGlobal('document', mockDom);
    configureMockOcrResult(allowButtonResult);
    
    const step = await recordingEngine.recordClick({ x: 150, y: 115 });
    
    // Multiple matches = unreliable = use Vision
    expect(step.recordedVia).toBe('vision');
  });

  it('should validate element visibility before using DOM', async () => {
    const hiddenElement = createMockElement('button', { innerText: 'Allow' });
    hiddenElement.getBoundingClientRect = () => ({
      x: 0, y: 0, width: 0, height: 0,
      top: 0, right: 0, bottom: 0, left: 0,
      toJSON: () => ({}),
    });
    
    const mockDom = createMockDom();
    mockDom.elementFromPoint = vi.fn().mockReturnValue(hiddenElement);
    vi.stubGlobal('document', mockDom);
    configureMockOcrResult(allowButtonResult);
    
    const step = await recordingEngine.recordClick({ x: 150, y: 115 });
    
    // Zero-size element = hidden = use Vision
    expect(step.recordedVia).toBe('vision');
  });

  it('should fallback if selector generation fails', async () => {
    const mockDom = createMockDom();
    // Element with no identifiable attributes
    mockDom.elementFromPoint = vi.fn().mockReturnValue(
      createMockElement('div', { id: '', className: '' })
    );
    vi.stubGlobal('document', mockDom);
    configureMockOcrResult(allowButtonResult);
    
    const step = await recordingEngine.recordClick({ x: 150, y: 115 });
    
    expect(step.recordedVia).toBe('vision');
    expect(step.visionTarget.fallbackReason).toBe('selector_unreliable');
  });
});
```

### 4.7 Error Handling Tests

```typescript
describe('Error Handling', () => {
  it('should handle Vision engine not initialized', async () => {
    vi.stubGlobal('document', simulateElementNotFound());
    const uninitializedVision = new VisionEngine();
    const engine = new RecordingEngine({ visionEngine: uninitializedVision });
    
    await expect(
      engine.recordClick({ x: 150, y: 115 })
    ).rejects.toThrow('VisionEngine not initialized');
  });

  it('should handle OCR failure during fallback', async () => {
    vi.stubGlobal('document', simulateElementNotFound());
    vi.mocked(visionEngine['worker'].recognize).mockRejectedValueOnce(
      new Error('OCR failed')
    );
    
    await expect(
      recordingEngine.recordClick({ x: 150, y: 115 })
    ).rejects.toThrow('OCR failed');
  });

  it('should handle no text found at click location', async () => {
    vi.stubGlobal('document', simulateElementNotFound());
    configureMockOcrResult({
      data: { text: '', confidence: 0, words: [], lines: [] }
    });
    
    const step = await recordingEngine.recordClick({ x: 150, y: 115 });
    
    // Should still create step but mark as vision with no target
    expect(step.recordedVia).toBe('vision');
    expect(step.visionTarget.text).toBe('');
    expect(step.label).toContain('Click at');
  });

  it('should handle screenshot capture failure', async () => {
    vi.stubGlobal('document', simulateElementNotFound());
    vi.mocked(chrome.tabs.captureVisibleTab).mockRejectedValueOnce(
      new Error('Screenshot failed')
    );
    
    await expect(
      recordingEngine.recordClick({ x: 150, y: 115 })
    ).rejects.toThrow('Screenshot failed');
  });
});
```

### 4.8 Integration Tests

```typescript
describe('Integration with Recording Flow', () => {
  it('should emit fallback event when Vision used', async () => {
    vi.stubGlobal('document', simulateElementNotFound());
    configureMockOcrResult(allowButtonResult);
    
    const fallbackEvents: any[] = [];
    recordingEngine.on('fallback', (event) => fallbackEvents.push(event));
    
    await recordingEngine.recordClick({ x: 150, y: 115 });
    
    expect(fallbackEvents).toHaveLength(1);
    expect(fallbackEvents[0].reason).toBe('element_not_found');
  });

  it('should include fallback count in recording stats', async () => {
    vi.stubGlobal('document', simulateElementNotFound());
    configureMockOcrResult(allowButtonResult);
    
    await recordingEngine.recordClick({ x: 150, y: 115 });
    await recordingEngine.recordClick({ x: 200, y: 115 });
    
    const stats = recordingEngine.getStats();
    
    expect(stats.visionFallbackCount).toBe(2);
  });

  it('should work with mixed DOM and Vision steps', async () => {
    // First click: DOM works
    vi.stubGlobal('document', createMockDom());
    const step1 = await recordingEngine.recordClick({ x: 100, y: 100 });
    
    // Second click: Vision fallback
    vi.stubGlobal('document', simulateElementNotFound());
    configureMockOcrResult(allowButtonResult);
    const step2 = await recordingEngine.recordClick({ x: 185, y: 115 });
    
    expect(step1.recordedVia).toBe('dom');
    expect(step2.recordedVia).toBe('vision');
  });
});
```

---

## 5. TEST EXECUTION

### 5.1 Running Tests

```bash
# Run only fallback tests
npm run test -- recordingEngine.fallback.test.ts

# Run with coverage
npm run test -- recordingEngine.fallback.test.ts --coverage

# Run all recording tests
npm run test -- recordingEngine
```

### 5.2 Expected Output

```
 ✓ Vision Recording Fallback
   ✓ Fallback Triggers (5 tests)
   ✓ Vision Data Capture (5 tests)
   ✓ Step Structure (5 tests)
   ✓ Fallback Decision Logic (4 tests)
   ✓ Error Handling (4 tests)
   ✓ Integration with Recording Flow (3 tests)

Test Files  1 passed (1)
Tests       26 passed (26)
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** Fallback triggers when element not found
- [ ] **AC-2:** Fallback triggers for unreliable selectors
- [ ] **AC-3:** Vision data captured correctly
- [ ] **AC-4:** Step structure valid for playback
- [ ] **AC-5:** DOM preferred when reliable
- [ ] **AC-6:** Selector uniqueness checked
- [ ] **AC-7:** Error handling tests pass
- [ ] **AC-8:** Fallback events emitted
- [ ] **AC-9:** Mixed DOM/Vision recording works
- [ ] **AC-10:** Test coverage > 90% for fallback logic

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **DOM access** - Must mock document object
2. **Timing** - Fallback decision should be fast
3. **Data capture** - Must capture enough for reliable playback

### Patterns to Follow

1. **Mock isolation** - Separate DOM mock helpers
2. **Scenario simulation** - Realistic failure scenarios
3. **Event verification** - Check fallback events emitted

### Edge Cases

1. **Shadow DOM** - May require special handling
2. **SVG elements** - Different selector strategies
3. **Canvas content** - Always requires Vision

---

## 8. VERIFICATION COMMANDS

```bash
# Verify test file creation
ls -la src/lib/__tests__/recordingEngine.fallback.test.ts

# Verify DOM mock
ls -la src/lib/__tests__/mocks/dom.mock.ts

# Run tests
npm run test -- recordingEngine.fallback.test.ts

# Check coverage
npm run test -- recordingEngine.fallback.test.ts --coverage
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Remove test file
rm src/lib/__tests__/recordingEngine.fallback.test.ts

# Remove DOM mock
rm src/lib/__tests__/mocks/dom.mock.ts
```

---

## 10. REFERENCES

- INT-009: Vision Fallback Recording
- ENG-001: VisionEngine Skeleton
- FND-010: Step Interface Extension (recordedVia field)
- Feature Spec: `/future-spec/03_feature-specs.md` Section 3

---

*End of Specification TST-007*
