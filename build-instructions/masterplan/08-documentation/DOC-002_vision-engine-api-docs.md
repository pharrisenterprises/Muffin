# DOC-002: Vision Engine API Documentation

> **Build Card:** DOC-002  
> **Category:** Documentation  
> **Dependencies:** ENG-001 to ENG-015  
> **Risk Level:** Low  
> **Estimated Lines:** 280-320

---

## 1. PURPOSE

Create comprehensive API documentation for the VisionEngine class and related modules. This documentation enables developers to understand, extend, and integrate with the Vision system. Includes method signatures, parameter descriptions, return types, usage examples, and error handling guidance.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| VisionEngine Class | `src/lib/visionEngine.ts` | All public methods |
| Type Definitions | `src/types/vision.types.ts` | All interfaces |
| ENG-001 to ENG-015 | `build-instructions/masterplan/03-engine/` | Implementation details |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `docs/api/VISION_ENGINE.md` | CREATE | +250 |
| `docs/api/VISION_TYPES.md` | CREATE | +100 |
| `docs/api/index.md` | CREATE | +30 |

### Artifacts

- VisionEngine API reference
- Type definitions reference
- API documentation index

---

## 4. DETAILED SPECIFICATION

### 4.1 API Documentation Index

```markdown
<!-- docs/api/index.md -->

# Muffin Lite API Documentation

## Vision System

- [VisionEngine](VISION_ENGINE.md) - Core OCR and click automation
- [Vision Types](VISION_TYPES.md) - TypeScript interfaces and types

## Core System

- [PlaybackEngine](PLAYBACK_ENGINE.md) - Recording playback
- [RecordingEngine](RECORDING_ENGINE.md) - Step recording
- [StorageService](STORAGE_SERVICE.md) - Data persistence

## Message Handlers

- [Vision Handlers](VISION_HANDLERS.md) - Content script handlers
- [DOM Handlers](DOM_HANDLERS.md) - DOM interaction handlers
```

### 4.2 VisionEngine API Reference

```markdown
<!-- docs/api/VISION_ENGINE.md -->

# VisionEngine API Reference

The VisionEngine class provides OCR-based screen reading and Vision-based click automation.

## Table of Contents

- [Constructor](#constructor)
- [Lifecycle Methods](#lifecycle-methods)
- [Screenshot Methods](#screenshot-methods)
- [OCR Methods](#ocr-methods)
- [Text Search Methods](#text-search-methods)
- [Click Methods](#click-methods)
- [Conditional Click Methods](#conditional-click-methods)
- [Events](#events)
- [Error Handling](#error-handling)

---

## Constructor

### `new VisionEngine(config?)`

Creates a new VisionEngine instance.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `config` | `VisionConfig` | No | See below | Configuration options |

**Default Configuration:**

```typescript
{
  language: 'eng',
  confidenceThreshold: 0.6,
  debugMode: false,
  workerPath: undefined,  // Uses CDN
  langPath: undefined,    // Uses CDN
}
```

**Example:**

```typescript
import { VisionEngine } from '@/lib/visionEngine';

// Default configuration
const engine = new VisionEngine();

// Custom configuration
const engine = new VisionEngine({
  confidenceThreshold: 0.8,
  debugMode: true,
});
```

---

## Lifecycle Methods

### `initialize(): Promise<void>`

Initializes the Tesseract.js OCR worker. Must be called before using OCR methods.

**Returns:** `Promise<void>`

**Throws:**
- `Error` if Tesseract fails to load
- `Error` if language files unavailable

**Example:**

```typescript
const engine = new VisionEngine();
await engine.initialize();
console.log(engine.isInitialized); // true
```

---

### `terminate(): Promise<void>`

Terminates the OCR worker and releases resources.

**Returns:** `Promise<void>`

**Example:**

```typescript
await engine.terminate();
console.log(engine.isInitialized); // false
```

---

### `isInitialized: boolean`

Read-only property indicating initialization state.

**Example:**

```typescript
if (!engine.isInitialized) {
  await engine.initialize();
}
```

---

## Screenshot Methods

### `captureScreenshot(tabId?, options?): Promise<Screenshot>`

Captures a screenshot of the visible browser tab.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `tabId` | `number` | No | Active tab | Specific tab to capture |
| `options` | `ScreenshotOptions` | No | `{}` | Capture options |

**ScreenshotOptions:**

```typescript
interface ScreenshotOptions {
  format?: 'png' | 'jpeg';
  quality?: number;  // 0-100, JPEG only
}
```

**Returns:** `Promise<Screenshot>`

```typescript
interface Screenshot {
  dataUrl: string;
  base64Data: string;
  mimeType: string;
  width: number;
  height: number;
  timestamp: number;
  toImageData(): Promise<ImageData>;
  toBlob(): Promise<Blob>;
}
```

**Throws:**
- `Error` if not initialized
- `Error` if tab capture fails
- `Error` if tab not found

**Example:**

```typescript
const screenshot = await engine.captureScreenshot();
console.log(`Captured ${screenshot.width}x${screenshot.height}`);

// With options
const jpeg = await engine.captureScreenshot(undefined, {
  format: 'jpeg',
  quality: 80,
});
```

---

## OCR Methods

### `recognizeText(imageData): Promise<OcrResult>`

Performs OCR on image data and returns recognized text.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `imageData` | `string \| ImageData` | Yes | Data URL, base64, or ImageData |

**Returns:** `Promise<OcrResult>`

```typescript
interface OcrResult {
  text: string;
  confidence: number;
  words: WordResult[];
  lines: LineResult[];
}

interface WordResult {
  text: string;
  confidence: number;
  bbox: BoundingBox;
  center: Point;
  width: number;
  height: number;
}

interface BoundingBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
```

**Throws:**
- `Error` if not initialized
- `Error` if invalid image data
- `Error` if OCR fails

**Example:**

```typescript
const screenshot = await engine.captureScreenshot();
const result = await engine.recognizeText(screenshot.dataUrl);

console.log(`Found: ${result.text}`);
console.log(`Confidence: ${result.confidence}%`);

for (const word of result.words) {
  console.log(`"${word.text}" at (${word.center.x}, ${word.center.y})`);
}
```

---

## Text Search Methods

### `findText(searchText, options?): Promise<FindTextResult>`

Captures screen and finds specified text.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `searchText` | `string \| RegExp` | Yes | - | Text to find |
| `options` | `FindTextOptions` | No | `{}` | Search options |

**FindTextOptions:**

```typescript
interface FindTextOptions {
  caseSensitive?: boolean;      // Default: false
  matchMode?: 'exact' | 'contains' | 'startsWith' | 'endsWith' | 'regex';
  fuzzyMatch?: boolean;         // Default: false
  fuzzyThreshold?: number;      // Default: 0.8
  preferHighConfidence?: boolean;
  tabId?: number;
}
```

**Returns:** `Promise<FindTextResult>`

```typescript
interface FindTextResult {
  found: boolean;
  text: string | null;
  confidence: number | null;
  bbox: BoundingBox | null;
  clickX: number | null;
  clickY: number | null;
}
```

**Throws:**
- `Error` if not initialized
- `Error` if searchText is empty

**Example:**

```typescript
// Simple search
const result = await engine.findText('Allow');
if (result.found) {
  console.log(`Found at (${result.clickX}, ${result.clickY})`);
}

// Case-sensitive search
const result = await engine.findText('Allow', { caseSensitive: true });

// Fuzzy matching for OCR errors
const result = await engine.findText('Allow', {
  fuzzyMatch: true,
  fuzzyThreshold: 0.7,
});
```

---

### `findAllText(searchText, options?): Promise<FindTextResult[]>`

Finds all occurrences of specified text.

**Parameters:** Same as `findText()`

**Returns:** `Promise<FindTextResult[]>`

**Example:**

```typescript
const results = await engine.findAllText('Allow');
console.log(`Found ${results.length} occurrences`);

for (const result of results) {
  console.log(`  at (${result.clickX}, ${result.clickY})`);
}
```

---

## Click Methods

### `clickAt(x, y, options?): Promise<ClickResult>`

Clicks at specified screen coordinates.

**Parameters:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `x` | `number` | Yes | - | X coordinate |
| `y` | `number` | Yes | - | Y coordinate |
| `options` | `ClickOptions` | No | `{}` | Click options |

**ClickOptions:**

```typescript
interface ClickOptions {
  button?: 'left' | 'right' | 'middle';
  clickCount?: number;
  modifiers?: ('ctrl' | 'shift' | 'alt' | 'meta')[];
  tabId?: number;
  scaleForDPR?: boolean;
  viewportOffset?: { x: number; y: number };
}
```

**Returns:** `Promise<ClickResult>`

```typescript
interface ClickResult {
  success: boolean;
  clickedAt: { x: number; y: number };
  timestamp: number;
  error?: string;
}
```

**Throws:**
- `Error` if not initialized
- `Error` if coordinates are invalid (negative or NaN)

**Example:**

```typescript
// Simple click
const result = await engine.clickAt(100, 200);

// Right-click
await engine.clickAt(100, 200, { button: 'right' });

// Double-click
await engine.clickAt(100, 200, { clickCount: 2 });

// Ctrl+click
await engine.clickAt(100, 200, { modifiers: ['ctrl'] });
```

---

### `findTextAndClick(searchText, options?): Promise<FindAndClickResult>`

Finds text and clicks at its center.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `searchText` | `string` | Yes | Text to find and click |
| `options` | `FindTextOptions & ClickOptions` | No | Combined options |

**Returns:** `Promise<FindAndClickResult>`

```typescript
interface FindAndClickResult {
  found: boolean;
  clicked: boolean;
  clickedAt: { x: number; y: number } | null;
  confidence: number | null;
  error?: string;
}
```

**Example:**

```typescript
const result = await engine.findTextAndClick('Allow');
if (result.clicked) {
  console.log('Clicked Allow button');
}
```

---

## Conditional Click Methods

### `waitAndClickButtons(config): Promise<ConditionalClickResult>`

Polls screen for button text and clicks when found. Stops when success text is detected or timeout.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `config` | `ConditionalClickConfig` | Yes | Polling configuration |

**ConditionalClickConfig:**

```typescript
interface ConditionalClickConfig {
  buttonTexts: string[];
  successText: string | null;
  timeoutSeconds: number;
  pollIntervalMs: number;
  confidenceThreshold: number;
  signal?: AbortSignal;
  onProgress?: (event: ProgressEvent) => void;
  onButtonClick?: (event: ButtonClickEvent) => void;
}
```

**Returns:** `Promise<ConditionalClickResult>`

```typescript
interface ConditionalClickResult {
  success: boolean;
  buttonsClicked: string[];
  totalClicks: number;
  successTextFound: boolean;
  terminationReason: 'success_text' | 'timeout' | 'aborted';
  pollCount: number;
  elapsedSeconds: number;
}
```

**Example:**

```typescript
const result = await engine.waitAndClickButtons({
  buttonTexts: ['Allow', 'Keep'],
  successText: 'committed',
  timeoutSeconds: 300,
  pollIntervalMs: 500,
  confidenceThreshold: 0.7,
  onProgress: (e) => console.log(`Poll ${e.pollCount}...`),
  onButtonClick: (e) => console.log(`Clicked: ${e.buttonText}`),
});

if (result.success) {
  console.log(`Completed! Clicked ${result.totalClicks} buttons.`);
} else {
  console.log(`Failed: ${result.terminationReason}`);
}
```

**Abort Example:**

```typescript
const controller = new AbortController();

// Abort after 10 seconds
setTimeout(() => controller.abort(), 10000);

const result = await engine.waitAndClickButtons({
  buttonTexts: ['Allow'],
  successText: 'done',
  timeoutSeconds: 300,
  pollIntervalMs: 500,
  confidenceThreshold: 0.7,
  signal: controller.signal,
});

if (result.terminationReason === 'aborted') {
  console.log('Operation was aborted');
}
```

---

## Events

VisionEngine extends EventEmitter and emits the following events:

| Event | Payload | Description |
|-------|---------|-------------|
| `initialized` | `void` | OCR worker ready |
| `terminated` | `void` | OCR worker stopped |
| `error` | `Error` | Error occurred |
| `screenshot` | `Screenshot` | Screenshot captured |
| `ocr:start` | `{ imageSize: number }` | OCR processing started |
| `ocr:complete` | `OcrResult` | OCR processing complete |
| `click` | `ClickResult` | Click executed |

**Example:**

```typescript
engine.on('initialized', () => {
  console.log('VisionEngine ready');
});

engine.on('error', (error) => {
  console.error('VisionEngine error:', error);
});

engine.on('click', (result) => {
  console.log(`Clicked at (${result.clickedAt.x}, ${result.clickedAt.y})`);
});
```

---

## Error Handling

### Error Types

| Error Message | Cause | Solution |
|---------------|-------|----------|
| `VisionEngine not initialized` | Method called before `initialize()` | Call `await engine.initialize()` first |
| `Invalid coordinates` | Negative or NaN coordinates | Ensure valid numbers |
| `Tab capture failed` | Chrome permission denied | Check extension permissions |
| `OCR failed` | Tesseract error | Check image data validity |
| `Search text required` | Empty search string | Provide non-empty text |

### Safe Usage Pattern

```typescript
const engine = new VisionEngine();

try {
  await engine.initialize();
  
  const result = await engine.findTextAndClick('Allow');
  if (!result.found) {
    console.log('Text not found on screen');
  }
  
} catch (error) {
  console.error('Vision operation failed:', error);
} finally {
  await engine.terminate();
}
```

---

## Performance Tips

1. **Reuse engine** - Initialize once, use many times
2. **Increase poll interval** - 500ms minimum recommended
3. **Use confidence threshold** - Filter low-quality matches
4. **Terminate when done** - Release Tesseract worker
5. **Avoid rapid captures** - OCR is CPU-intensive
```

### 4.3 Vision Types Reference

```markdown
<!-- docs/api/VISION_TYPES.md -->

# Vision Types Reference

TypeScript interfaces and types for the Vision system.

## Configuration Types

### VisionConfig

```typescript
interface VisionConfig {
  language?: string;
  confidenceThreshold?: number;
  debugMode?: boolean;
  workerPath?: string;
  langPath?: string;
}
```

### ConditionalClickConfig

```typescript
interface ConditionalClickConfig {
  buttonTexts: string[];
  successText: string | null;
  timeoutSeconds: number;
  pollIntervalMs: number;
  confidenceThreshold: number;
}
```

## Result Types

### OcrResult

```typescript
interface OcrResult {
  text: string;
  confidence: number;
  words: WordResult[];
  lines: LineResult[];
}
```

### FindTextResult

```typescript
interface FindTextResult {
  found: boolean;
  text: string | null;
  confidence: number | null;
  bbox: BoundingBox | null;
  clickX: number | null;
  clickY: number | null;
}
```

### ClickResult

```typescript
interface ClickResult {
  success: boolean;
  clickedAt: { x: number; y: number };
  timestamp: number;
  error?: string;
}
```

### ConditionalClickResult

```typescript
interface ConditionalClickResult {
  success: boolean;
  buttonsClicked: string[];
  totalClicks: number;
  successTextFound: boolean;
  terminationReason: 'success_text' | 'timeout' | 'aborted';
  pollCount: number;
  elapsedSeconds: number;
}
```

## Geometry Types

### BoundingBox

```typescript
interface BoundingBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
```

### Point

```typescript
interface Point {
  x: number;
  y: number;
}
```

## Step Types

### RecordedVia

```typescript
type RecordedVia = 'dom' | 'vision';
```

### VisionTarget

```typescript
interface VisionTarget {
  text: string;
  bbox: BoundingBox;
  confidence: number;
  screenshotRegion?: string;
  clickOffset?: Point;
  fallbackReason?: string;
}
```
```

---

## 5. ACCEPTANCE CRITERIA

- [ ] **AC-1:** All public methods documented
- [ ] **AC-2:** All parameters described with types
- [ ] **AC-3:** Return types documented
- [ ] **AC-4:** Usage examples provided
- [ ] **AC-5:** Error handling documented
- [ ] **AC-6:** Events documented
- [ ] **AC-7:** Types reference complete
- [ ] **AC-8:** Code examples are correct
- [ ] **AC-9:** Links between docs work
- [ ] **AC-10:** Developers can use as reference

---

## 6. IMPLEMENTATION NOTES

### Constraints

1. **Accuracy** - Must match actual implementation
2. **Completeness** - Document all public API
3. **Examples** - Working code examples

### Patterns to Follow

1. **Consistent format** - Same structure for all methods
2. **Type tables** - Clear parameter/return docs
3. **Copy-paste examples** - Ready to use code

---

## 7. VERIFICATION COMMANDS

```bash
# Verify docs created
ls -la docs/api/VISION_ENGINE.md
ls -la docs/api/VISION_TYPES.md

# Check for broken links
npm run docs:check-links

# Verify code examples compile
npm run docs:verify-examples
```

---

## 8. ROLLBACK PROCEDURE

```bash
# Remove API docs
rm -rf docs/api/
```

---

## 9. REFERENCES

- ENG-001 to ENG-015: VisionEngine Implementation
- DOC-001: README Vision Features
- DOC-003: Troubleshooting Guide

---

*End of Specification DOC-002*
