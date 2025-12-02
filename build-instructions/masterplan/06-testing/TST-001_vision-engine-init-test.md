# TST-001: VisionEngine Initialization Tests

> **Build Card:** TST-001  
> **Category:** Testing & Validation  
> **Dependencies:** ENG-001, ENG-002  
> **Risk Level:** Medium  
> **Estimated Lines:** 250-300

---

## 1. PURPOSE

Create comprehensive unit tests for VisionEngine initialization. These tests verify that the VisionEngine class instantiates correctly, initializes Tesseract.js OCR worker properly, handles initialization failures gracefully, and manages the singleton pattern if applicable. Critical for ensuring Vision-based automation has a reliable foundation.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| VisionEngine Class | `src/lib/visionEngine.ts` | Class structure and initialize() method |
| VisionConfig Interface | `src/types/vision.types.ts` | Configuration options |
| ENG-001 Spec | `build-instructions/masterplan/03-engine/ENG-001_vision-engine-skeleton.md` | Expected class structure |
| ENG-002 Spec | `build-instructions/masterplan/03-engine/ENG-002_tesseract-initialization.md` | Tesseract init requirements |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/lib/__tests__/visionEngine.init.test.ts` | CREATE | +200 |
| `src/lib/__tests__/mocks/tesseract.mock.ts` | CREATE | +50 |

### Artifacts

- VisionEngine initialization test suite
- Tesseract.js mock for isolated testing
- Error handling test cases

---

## 4. DETAILED SPECIFICATION

### 4.1 Test File Structure

```typescript
// src/lib/__tests__/visionEngine.init.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VisionEngine } from '../visionEngine';
import { createMockTesseract } from './mocks/tesseract.mock';

// Mock Tesseract.js
vi.mock('tesseract.js', () => createMockTesseract());

describe('VisionEngine Initialization', () => {
  let engine: VisionEngine;

  beforeEach(() => {
    // Reset any singleton state if applicable
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Cleanup: terminate engine if initialized
    if (engine?.isInitialized) {
      await engine.terminate();
    }
  });

  // Test suites defined below...
});
```

### 4.2 Constructor Tests

```typescript
describe('Constructor', () => {
  it('should create instance with default configuration', () => {
    engine = new VisionEngine();
    
    expect(engine).toBeInstanceOf(VisionEngine);
    expect(engine.isInitialized).toBe(false);
  });

  it('should create instance with custom configuration', () => {
    const config = {
      language: 'eng',
      confidenceThreshold: 0.8,
      debugMode: true,
    };
    
    engine = new VisionEngine(config);
    
    expect(engine).toBeInstanceOf(VisionEngine);
    expect(engine.config.confidenceThreshold).toBe(0.8);
    expect(engine.config.debugMode).toBe(true);
  });

  it('should apply default values for missing config options', () => {
    engine = new VisionEngine({ language: 'eng' });
    
    expect(engine.config.language).toBe('eng');
    expect(engine.config.confidenceThreshold).toBe(0.6); // Default
    expect(engine.config.debugMode).toBe(false); // Default
  });

  it('should not initialize Tesseract in constructor', () => {
    const tesseractSpy = vi.spyOn(Tesseract, 'createWorker');
    
    engine = new VisionEngine();
    
    expect(tesseractSpy).not.toHaveBeenCalled();
  });
});
```

### 4.3 Initialize Method Tests

```typescript
describe('initialize()', () => {
  it('should initialize Tesseract worker successfully', async () => {
    engine = new VisionEngine();
    
    await engine.initialize();
    
    expect(engine.isInitialized).toBe(true);
  });

  it('should create worker with correct language', async () => {
    const tesseractSpy = vi.spyOn(Tesseract, 'createWorker');
    engine = new VisionEngine({ language: 'eng+spa' });
    
    await engine.initialize();
    
    expect(tesseractSpy).toHaveBeenCalledWith(
      expect.objectContaining({ langPath: expect.any(String) })
    );
  });

  it('should resolve immediately if already initialized', async () => {
    engine = new VisionEngine();
    
    await engine.initialize();
    const start = Date.now();
    await engine.initialize(); // Second call
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(10); // Should be near-instant
    expect(engine.isInitialized).toBe(true);
  });

  it('should handle concurrent initialization calls', async () => {
    engine = new VisionEngine();
    
    // Call initialize multiple times concurrently
    const [result1, result2, result3] = await Promise.all([
      engine.initialize(),
      engine.initialize(),
      engine.initialize(),
    ]);
    
    // All should succeed and engine should be initialized once
    expect(engine.isInitialized).toBe(true);
  });

  it('should throw error if Tesseract fails to load', async () => {
    // Mock Tesseract to fail
    vi.mocked(Tesseract.createWorker).mockRejectedValueOnce(
      new Error('Failed to load Tesseract worker')
    );
    
    engine = new VisionEngine();
    
    await expect(engine.initialize()).rejects.toThrow(
      'Failed to load Tesseract worker'
    );
    expect(engine.isInitialized).toBe(false);
  });

  it('should emit initialization event on success', async () => {
    engine = new VisionEngine();
    const eventSpy = vi.fn();
    engine.on('initialized', eventSpy);
    
    await engine.initialize();
    
    expect(eventSpy).toHaveBeenCalledTimes(1);
  });

  it('should emit error event on failure', async () => {
    vi.mocked(Tesseract.createWorker).mockRejectedValueOnce(
      new Error('Init failed')
    );
    
    engine = new VisionEngine();
    const errorSpy = vi.fn();
    engine.on('error', errorSpy);
    
    await expect(engine.initialize()).rejects.toThrow();
    
    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Init failed' })
    );
  });
});
```

### 4.4 Terminate Method Tests

```typescript
describe('terminate()', () => {
  it('should terminate Tesseract worker', async () => {
    engine = new VisionEngine();
    await engine.initialize();
    
    await engine.terminate();
    
    expect(engine.isInitialized).toBe(false);
  });

  it('should handle terminate when not initialized', async () => {
    engine = new VisionEngine();
    
    // Should not throw
    await expect(engine.terminate()).resolves.not.toThrow();
  });

  it('should allow re-initialization after terminate', async () => {
    engine = new VisionEngine();
    await engine.initialize();
    await engine.terminate();
    
    await engine.initialize();
    
    expect(engine.isInitialized).toBe(true);
  });

  it('should emit terminated event', async () => {
    engine = new VisionEngine();
    await engine.initialize();
    const eventSpy = vi.fn();
    engine.on('terminated', eventSpy);
    
    await engine.terminate();
    
    expect(eventSpy).toHaveBeenCalledTimes(1);
  });

  it('should cleanup resources on terminate', async () => {
    engine = new VisionEngine();
    await engine.initialize();
    
    const workerTerminateSpy = vi.spyOn(engine['worker'], 'terminate');
    
    await engine.terminate();
    
    expect(workerTerminateSpy).toHaveBeenCalled();
  });
});
```

### 4.5 Tesseract Mock

```typescript
// src/lib/__tests__/mocks/tesseract.mock.ts

import { vi } from 'vitest';

export function createMockTesseract() {
  const mockWorker = {
    recognize: vi.fn().mockResolvedValue({
      data: {
        text: 'Mock OCR Result',
        words: [
          {
            text: 'Mock',
            confidence: 95,
            bbox: { x0: 10, y0: 10, x1: 50, y1: 30 },
          },
          {
            text: 'OCR',
            confidence: 92,
            bbox: { x0: 55, y0: 10, x1: 85, y1: 30 },
          },
          {
            text: 'Result',
            confidence: 88,
            bbox: { x0: 90, y0: 10, x1: 140, y1: 30 },
          },
        ],
        confidence: 91.67,
      },
    }),
    terminate: vi.fn().mockResolvedValue(undefined),
    load: vi.fn().mockResolvedValue(undefined),
    loadLanguage: vi.fn().mockResolvedValue(undefined),
    initialize: vi.fn().mockResolvedValue(undefined),
    setParameters: vi.fn().mockResolvedValue(undefined),
  };

  return {
    createWorker: vi.fn().mockResolvedValue(mockWorker),
    PSM: {
      AUTO: 3,
      SINGLE_BLOCK: 6,
      SINGLE_LINE: 7,
    },
    OEM: {
      LSTM_ONLY: 1,
      TESSERACT_LSTM_COMBINED: 2,
    },
  };
}

export function createFailingMockTesseract(errorMessage: string) {
  return {
    createWorker: vi.fn().mockRejectedValue(new Error(errorMessage)),
    PSM: { AUTO: 3 },
    OEM: { LSTM_ONLY: 1 },
  };
}
```

### 4.6 Edge Case Tests

```typescript
describe('Edge Cases', () => {
  it('should handle missing language files gracefully', async () => {
    vi.mocked(Tesseract.createWorker).mockRejectedValueOnce(
      new Error('Language file not found: xyz')
    );
    
    engine = new VisionEngine({ language: 'xyz' });
    
    await expect(engine.initialize()).rejects.toThrow('Language file not found');
  });

  it('should handle network timeout during initialization', async () => {
    vi.mocked(Tesseract.createWorker).mockImplementationOnce(() => {
      return new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Network timeout')), 100);
      });
    });
    
    engine = new VisionEngine();
    
    await expect(engine.initialize()).rejects.toThrow('Network timeout');
  });

  it('should handle out of memory errors', async () => {
    vi.mocked(Tesseract.createWorker).mockRejectedValueOnce(
      new Error('Out of memory')
    );
    
    engine = new VisionEngine();
    
    await expect(engine.initialize()).rejects.toThrow('Out of memory');
    expect(engine.isInitialized).toBe(false);
  });

  it('should maintain state consistency after failed init', async () => {
    vi.mocked(Tesseract.createWorker).mockRejectedValueOnce(
      new Error('Init failed')
    );
    
    engine = new VisionEngine();
    
    await expect(engine.initialize()).rejects.toThrow();
    
    // State should be clean for retry
    expect(engine.isInitialized).toBe(false);
    expect(engine['initializationPromise']).toBeNull();
  });
});
```

---

## 5. TEST EXECUTION

### 5.1 Running Tests

```bash
# Run only VisionEngine init tests
npm run test -- visionEngine.init.test.ts

# Run with coverage
npm run test -- visionEngine.init.test.ts --coverage

# Run in watch mode
npm run test -- visionEngine.init.test.ts --watch
```

### 5.2 Expected Output

```
 ✓ VisionEngine Initialization
   ✓ Constructor
     ✓ should create instance with default configuration
     ✓ should create instance with custom configuration
     ✓ should apply default values for missing config options
     ✓ should not initialize Tesseract in constructor
   ✓ initialize()
     ✓ should initialize Tesseract worker successfully
     ✓ should create worker with correct language
     ✓ should resolve immediately if already initialized
     ✓ should handle concurrent initialization calls
     ✓ should throw error if Tesseract fails to load
     ✓ should emit initialization event on success
     ✓ should emit error event on failure
   ✓ terminate()
     ✓ should terminate Tesseract worker
     ✓ should handle terminate when not initialized
     ✓ should allow re-initialization after terminate
     ✓ should emit terminated event
     ✓ should cleanup resources on terminate
   ✓ Edge Cases
     ✓ should handle missing language files gracefully
     ✓ should handle network timeout during initialization
     ✓ should handle out of memory errors
     ✓ should maintain state consistency after failed init

Test Files  1 passed (1)
Tests       20 passed (20)
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** All constructor tests pass
- [ ] **AC-2:** Initialization success tests pass
- [ ] **AC-3:** Initialization failure tests pass
- [ ] **AC-4:** Concurrent initialization handled correctly
- [ ] **AC-5:** Terminate tests pass
- [ ] **AC-6:** Re-initialization after terminate works
- [ ] **AC-7:** Event emission tests pass
- [ ] **AC-8:** Edge case tests pass
- [ ] **AC-9:** Tesseract mock works correctly
- [ ] **AC-10:** Test coverage > 90% for initialize/terminate

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Mock isolation** - Tests must not require actual Tesseract
2. **Async handling** - All async operations properly awaited
3. **Cleanup** - Engine terminated after each test

### Patterns to Follow

1. **AAA pattern** - Arrange, Act, Assert
2. **Isolated tests** - Each test independent
3. **Descriptive names** - Test names explain scenario

### Edge Cases

1. **Memory cleanup** - Verify no memory leaks
2. **Worker lifecycle** - Proper create/terminate
3. **Error recovery** - State clean after failure

---

## 8. VERIFICATION COMMANDS

```bash
# Verify test file creation
ls -la src/lib/__tests__/visionEngine.init.test.ts

# Verify mock file creation
ls -la src/lib/__tests__/mocks/tesseract.mock.ts

# Run tests
npm run test -- visionEngine.init.test.ts

# Check coverage
npm run test -- visionEngine.init.test.ts --coverage
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Remove test files
rm src/lib/__tests__/visionEngine.init.test.ts
rm src/lib/__tests__/mocks/tesseract.mock.ts
rmdir src/lib/__tests__/mocks 2>/dev/null || true
```

---

## 10. REFERENCES

- ENG-001: VisionEngine Skeleton
- ENG-002: Tesseract Initialization
- Vitest Documentation: https://vitest.dev/
- Tesseract.js API: https://github.com/naptha/tesseract.js

---

*End of Specification TST-001*
