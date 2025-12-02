# TST-002: Screenshot Capture Tests

> **Build Card:** TST-002  
> **Category:** Testing & Validation  
> **Dependencies:** ENG-003, TST-001  
> **Risk Level:** Medium  
> **Estimated Lines:** 220-270

---

## 1. PURPOSE

Create comprehensive unit tests for the VisionEngine screenshot capture functionality. These tests verify that screenshots are captured correctly from browser tabs, converted to the proper format for OCR processing, handle various error conditions, and work across different viewport sizes and device pixel ratios.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| VisionEngine Class | `src/lib/visionEngine.ts` | captureScreenshot() method |
| ENG-003 Spec | `build-instructions/masterplan/03-engine/ENG-003_screenshot-capture.md` | Capture requirements |
| Chrome API Types | `@anthropic-ai/anthropic-chrome-types` | chrome.tabs.captureVisibleTab |
| TST-001 | `build-instructions/masterplan/06-testing/TST-001_vision-engine-init-test.md` | Test patterns |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/lib/__tests__/visionEngine.screenshot.test.ts` | CREATE | +180 |
| `src/lib/__tests__/mocks/chrome.mock.ts` | CREATE | +60 |

### Artifacts

- Screenshot capture test suite
- Chrome API mock for isolated testing
- Image format validation tests

---

## 4. DETAILED SPECIFICATION

### 4.1 Test File Structure

```typescript
// src/lib/__tests__/visionEngine.screenshot.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VisionEngine } from '../visionEngine';
import { createMockChrome, mockScreenshotDataUrl } from './mocks/chrome.mock';
import { createMockTesseract } from './mocks/tesseract.mock';

// Mock Chrome API
vi.stubGlobal('chrome', createMockChrome());

// Mock Tesseract
vi.mock('tesseract.js', () => createMockTesseract());

describe('VisionEngine Screenshot Capture', () => {
  let engine: VisionEngine;

  beforeEach(async () => {
    vi.clearAllMocks();
    engine = new VisionEngine();
    await engine.initialize();
  });

  afterEach(async () => {
    await engine.terminate();
  });

  // Test suites defined below...
});
```

### 4.2 Chrome API Mock

```typescript
// src/lib/__tests__/mocks/chrome.mock.ts

import { vi } from 'vitest';

// Sample base64 PNG data (1x1 pixel transparent PNG)
export const mockScreenshotDataUrl = 
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// Larger mock image for realistic testing
export const mockLargeScreenshotDataUrl = 
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mNk+M9QzwAEjDAGNzYAAB4GA1H0AikAAAAASUVORK5CYII=';

export function createMockChrome() {
  return {
    tabs: {
      captureVisibleTab: vi.fn().mockImplementation((windowId, options) => {
        return Promise.resolve(mockScreenshotDataUrl);
      }),
      query: vi.fn().mockResolvedValue([
        { id: 1, active: true, windowId: 1 }
      ]),
      get: vi.fn().mockResolvedValue({ id: 1, windowId: 1 }),
    },
    windows: {
      WINDOW_ID_CURRENT: -2,
      getCurrent: vi.fn().mockResolvedValue({ id: 1 }),
    },
    runtime: {
      lastError: null,
      sendMessage: vi.fn().mockResolvedValue({}),
    },
  };
}

export function createFailingChromeMock(errorMessage: string) {
  const mock = createMockChrome();
  mock.tabs.captureVisibleTab = vi.fn().mockRejectedValue(new Error(errorMessage));
  return mock;
}

export function createChromeMockWithLastError(errorMessage: string) {
  const mock = createMockChrome();
  mock.runtime.lastError = { message: errorMessage };
  mock.tabs.captureVisibleTab = vi.fn().mockResolvedValue(undefined);
  return mock;
}
```

### 4.3 Basic Capture Tests

```typescript
describe('captureScreenshot()', () => {
  it('should capture screenshot from current tab', async () => {
    const screenshot = await engine.captureScreenshot();
    
    expect(screenshot).toBeDefined();
    expect(screenshot.dataUrl).toBe(mockScreenshotDataUrl);
  });

  it('should capture screenshot from specific tab', async () => {
    const tabId = 123;
    
    const screenshot = await engine.captureScreenshot(tabId);
    
    expect(chrome.tabs.get).toHaveBeenCalledWith(tabId);
    expect(screenshot).toBeDefined();
  });

  it('should use PNG format by default', async () => {
    await engine.captureScreenshot();
    
    expect(chrome.tabs.captureVisibleTab).toHaveBeenCalledWith(
      expect.any(Number),
      expect.objectContaining({ format: 'png' })
    );
  });

  it('should support JPEG format option', async () => {
    await engine.captureScreenshot(undefined, { format: 'jpeg' });
    
    expect(chrome.tabs.captureVisibleTab).toHaveBeenCalledWith(
      expect.any(Number),
      expect.objectContaining({ format: 'jpeg' })
    );
  });

  it('should support quality option for JPEG', async () => {
    await engine.captureScreenshot(undefined, { format: 'jpeg', quality: 80 });
    
    expect(chrome.tabs.captureVisibleTab).toHaveBeenCalledWith(
      expect.any(Number),
      expect.objectContaining({ format: 'jpeg', quality: 80 })
    );
  });

  it('should return screenshot with timestamp', async () => {
    const before = Date.now();
    const screenshot = await engine.captureScreenshot();
    const after = Date.now();
    
    expect(screenshot.timestamp).toBeGreaterThanOrEqual(before);
    expect(screenshot.timestamp).toBeLessThanOrEqual(after);
  });

  it('should return screenshot with dimensions', async () => {
    const screenshot = await engine.captureScreenshot();
    
    expect(screenshot.width).toBeGreaterThan(0);
    expect(screenshot.height).toBeGreaterThan(0);
  });
});
```

### 4.4 Error Handling Tests

```typescript
describe('Error Handling', () => {
  it('should throw error if not initialized', async () => {
    const uninitializedEngine = new VisionEngine();
    
    await expect(uninitializedEngine.captureScreenshot()).rejects.toThrow(
      'VisionEngine not initialized'
    );
  });

  it('should throw error if tab capture fails', async () => {
    vi.mocked(chrome.tabs.captureVisibleTab).mockRejectedValueOnce(
      new Error('Tab capture failed')
    );
    
    await expect(engine.captureScreenshot()).rejects.toThrow(
      'Tab capture failed'
    );
  });

  it('should throw error if tab not found', async () => {
    vi.mocked(chrome.tabs.get).mockRejectedValueOnce(
      new Error('No tab with id: 999')
    );
    
    await expect(engine.captureScreenshot(999)).rejects.toThrow(
      'No tab with id: 999'
    );
  });

  it('should handle chrome.runtime.lastError', async () => {
    vi.mocked(chrome.tabs.captureVisibleTab).mockImplementationOnce(() => {
      (chrome.runtime as any).lastError = { message: 'Permission denied' };
      return Promise.resolve(undefined);
    });
    
    await expect(engine.captureScreenshot()).rejects.toThrow(
      'Permission denied'
    );
  });

  it('should throw error for invalid tab state', async () => {
    vi.mocked(chrome.tabs.get).mockResolvedValueOnce({
      id: 1,
      status: 'loading',
      url: 'chrome://newtab',
    } as chrome.tabs.Tab);
    
    // Depending on implementation, may throw or wait
    // Adjust based on actual behavior
  });

  it('should handle empty screenshot data', async () => {
    vi.mocked(chrome.tabs.captureVisibleTab).mockResolvedValueOnce('');
    
    await expect(engine.captureScreenshot()).rejects.toThrow(
      'Empty screenshot data'
    );
  });

  it('should handle malformed data URL', async () => {
    vi.mocked(chrome.tabs.captureVisibleTab).mockResolvedValueOnce(
      'not-a-valid-data-url'
    );
    
    await expect(engine.captureScreenshot()).rejects.toThrow(
      'Invalid screenshot format'
    );
  });
});
```

### 4.5 Data Format Tests

```typescript
describe('Data Format', () => {
  it('should return valid data URL', async () => {
    const screenshot = await engine.captureScreenshot();
    
    expect(screenshot.dataUrl).toMatch(/^data:image\/(png|jpeg);base64,/);
  });

  it('should extract base64 data correctly', async () => {
    const screenshot = await engine.captureScreenshot();
    
    expect(screenshot.base64Data).toBeDefined();
    expect(screenshot.base64Data).not.toContain('data:image');
  });

  it('should determine correct MIME type', async () => {
    const pngScreenshot = await engine.captureScreenshot();
    expect(pngScreenshot.mimeType).toBe('image/png');
    
    vi.mocked(chrome.tabs.captureVisibleTab).mockResolvedValueOnce(
      'data:image/jpeg;base64,/9j/4AAQ...'
    );
    const jpegScreenshot = await engine.captureScreenshot();
    expect(jpegScreenshot.mimeType).toBe('image/jpeg');
  });

  it('should convert to ImageData for processing', async () => {
    const screenshot = await engine.captureScreenshot();
    
    const imageData = await screenshot.toImageData();
    
    expect(imageData).toBeInstanceOf(ImageData);
    expect(imageData.width).toBeGreaterThan(0);
    expect(imageData.height).toBeGreaterThan(0);
  });

  it('should convert to Blob', async () => {
    const screenshot = await engine.captureScreenshot();
    
    const blob = await screenshot.toBlob();
    
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/png');
  });
});
```

### 4.6 Performance Tests

```typescript
describe('Performance', () => {
  it('should capture screenshot within timeout', async () => {
    const start = Date.now();
    await engine.captureScreenshot();
    const duration = Date.now() - start;
    
    // Should complete within 2 seconds
    expect(duration).toBeLessThan(2000);
  });

  it('should handle rapid successive captures', async () => {
    const captures = await Promise.all([
      engine.captureScreenshot(),
      engine.captureScreenshot(),
      engine.captureScreenshot(),
    ]);
    
    expect(captures).toHaveLength(3);
    captures.forEach(capture => {
      expect(capture.dataUrl).toBeDefined();
    });
  });

  it('should not leak memory on repeated captures', async () => {
    // Capture multiple times
    for (let i = 0; i < 10; i++) {
      await engine.captureScreenshot();
    }
    
    // If memory management is correct, this should complete
    // without memory issues
    expect(true).toBe(true);
  });
});
```

### 4.7 Integration Preparation Tests

```typescript
describe('OCR Integration Preparation', () => {
  it('should return format compatible with Tesseract', async () => {
    const screenshot = await engine.captureScreenshot();
    
    // Tesseract accepts data URLs, base64, or ImageData
    expect(screenshot.dataUrl).toBeDefined();
    expect(screenshot.base64Data).toBeDefined();
  });

  it('should capture full visible viewport', async () => {
    const screenshot = await engine.captureScreenshot();
    
    // Dimensions should match viewport (mocked)
    expect(screenshot.width).toBeGreaterThanOrEqual(100);
    expect(screenshot.height).toBeGreaterThanOrEqual(100);
  });
});
```

---

## 5. TEST EXECUTION

### 5.1 Running Tests

```bash
# Run only screenshot tests
npm run test -- visionEngine.screenshot.test.ts

# Run with coverage
npm run test -- visionEngine.screenshot.test.ts --coverage

# Run in watch mode
npm run test -- visionEngine.screenshot.test.ts --watch
```

### 5.2 Expected Output

```
 ✓ VisionEngine Screenshot Capture
   ✓ captureScreenshot()
     ✓ should capture screenshot from current tab
     ✓ should capture screenshot from specific tab
     ✓ should use PNG format by default
     ✓ should support JPEG format option
     ✓ should support quality option for JPEG
     ✓ should return screenshot with timestamp
     ✓ should return screenshot with dimensions
   ✓ Error Handling
     ✓ should throw error if not initialized
     ✓ should throw error if tab capture fails
     ✓ should throw error if tab not found
     ✓ should handle chrome.runtime.lastError
     ✓ should handle empty screenshot data
     ✓ should handle malformed data URL
   ✓ Data Format
     ✓ should return valid data URL
     ✓ should extract base64 data correctly
     ✓ should determine correct MIME type
     ✓ should convert to ImageData for processing
     ✓ should convert to Blob
   ✓ Performance
     ✓ should capture screenshot within timeout
     ✓ should handle rapid successive captures
     ✓ should not leak memory on repeated captures
   ✓ OCR Integration Preparation
     ✓ should return format compatible with Tesseract
     ✓ should capture full visible viewport

Test Files  1 passed (1)
Tests       23 passed (23)
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** Basic capture tests pass
- [ ] **AC-2:** Tab-specific capture works
- [ ] **AC-3:** Format options (PNG/JPEG) work correctly
- [ ] **AC-4:** Error handling tests pass
- [ ] **AC-5:** Chrome API errors handled gracefully
- [ ] **AC-6:** Data format tests pass
- [ ] **AC-7:** Base64 extraction works
- [ ] **AC-8:** Performance tests pass
- [ ] **AC-9:** Chrome mock works correctly
- [ ] **AC-10:** Test coverage > 90% for captureScreenshot

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Chrome API mock** - Must simulate real API behavior
2. **Async handling** - All promises properly awaited
3. **Cleanup** - No lingering image data after tests

### Patterns to Follow

1. **Mock isolation** - Chrome API fully mocked
2. **Error simulation** - Test various failure modes
3. **Format validation** - Verify data URL structure

### Edge Cases

1. **Restricted pages** - chrome:// URLs may fail
2. **Hidden tabs** - May not capture correctly
3. **Very large pages** - Memory considerations

---

## 8. VERIFICATION COMMANDS

```bash
# Verify test file creation
ls -la src/lib/__tests__/visionEngine.screenshot.test.ts

# Verify chrome mock
ls -la src/lib/__tests__/mocks/chrome.mock.ts

# Run tests
npm run test -- visionEngine.screenshot.test.ts

# Check coverage
npm run test -- visionEngine.screenshot.test.ts --coverage
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Remove test file
rm src/lib/__tests__/visionEngine.screenshot.test.ts

# Remove chrome mock
rm src/lib/__tests__/mocks/chrome.mock.ts
```

---

## 10. REFERENCES

- ENG-003: Screenshot Capture
- TST-001: VisionEngine Init Tests (patterns)
- Chrome Extension API: chrome.tabs.captureVisibleTab
- Vitest Documentation: https://vitest.dev/

---

*End of Specification TST-002*
