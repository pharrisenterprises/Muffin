# Vision Engine API Documentation

> Complete API reference for the VisionEngine class and related types.

**Build Card:** DOC-002  
**Version:** 2.1.0

---

## Table of Contents

1. [VisionEngine Class](#visionengine-class)
2. [Configuration](#configuration)
3. [Core Methods](#core-methods)
4. [Search Methods](#search-methods)
5. [Interaction Methods](#interaction-methods)
6. [Conditional Click](#conditional-click)
7. [Types](#types)
8. [Events](#events)
9. [Usage Examples](#usage-examples)

---

## VisionEngine Class

The `VisionEngine` class provides OCR-based automation capabilities using Tesseract.js.

### Import

```typescript
import { VisionEngine } from '../lib/visionEngine';
import type { VisionConfig, ConditionalConfig } from '../types/vision';
```

### Constructor

```typescript
const engine = new VisionEngine(config?: Partial<VisionConfig>);
```

**Parameters:**
- `config` (optional): Partial configuration object

---

## Configuration

### VisionConfig

```typescript
interface VisionConfig {
  /** OCR confidence threshold (0-1). Default: 0.6 */
  confidenceThreshold: number;
  
  /** Polling interval for conditional clicks (ms). Default: 500 */
  pollIntervalMs: number;
  
  /** Number of scroll attempts. Default: 3 */
  scrollRetries: number;
  
  /** Use SIMD optimization. Default: true */
  useSIMD: boolean;
  
  /** Tesseract language. Default: 'eng' */
  language: string;
  
  /** Enable debug logging. Default: false */
  debugMode: boolean;
}
```

### Default Configuration

```typescript
const DEFAULT_VISION_CONFIG: VisionConfig = {
  confidenceThreshold: 60,
  pollIntervalMs: 500,
  scrollRetries: 3,
  useSIMD: true,
  language: 'eng',
  debugMode: false,
};
```

---

## Core Methods

### initialize()

Initialize the Tesseract.js worker. Must be called before using other methods.

```typescript
async initialize(): Promise<void>
```

**Example:**
```typescript
const engine = new VisionEngine();
await engine.initialize();
console.log('Engine ready:', engine.isInitialized);
```

**Throws:** Error if initialization fails

---

### terminate()

Terminate the Tesseract.js worker and clean up resources.

```typescript
async terminate(): Promise<void>
```

**Example:**
```typescript
await engine.terminate();
// Engine can be re-initialized after termination
```

---

### isInitialized

Property indicating whether the engine is initialized.

```typescript
get isInitialized(): boolean
```

---

### captureScreenshot()

Capture a screenshot of the current visible tab.

```typescript
async captureScreenshot(tabId?: number): Promise<Screenshot>
```

**Parameters:**
- `tabId` (optional): Specific tab to capture. Defaults to current tab.

**Returns:** Screenshot object

```typescript
interface Screenshot {
  dataUrl: string;      // Base64 PNG data URL
  width: number;        // Image width in pixels
  height: number;       // Image height in pixels
  timestamp: number;    // Capture timestamp
}
```

**Example:**
```typescript
const screenshot = await engine.captureScreenshot();
console.log('Captured:', screenshot.width, 'x', screenshot.height);
```

---

### recognizeText()

Perform OCR on image data.

```typescript
async recognizeText(imageData: string): Promise<TextResult[]>
```

**Parameters:**
- `imageData`: Base64 data URL of image

**Returns:** Array of TextResult objects

```typescript
interface TextResult {
  text: string;         // Recognized word
  confidence: number;   // Confidence score (0-100)
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
```

---

## Search Methods

### findText()

Find the first occurrence of text on screen.

```typescript
async findText(
  searchTerms: string[],
  options?: FindTextOptions
): Promise<ClickTarget | null>
```

**Parameters:**
- `searchTerms`: Array of text strings to search for
- `options` (optional): Search options

```typescript
interface FindTextOptions {
  caseSensitive?: boolean;  // Default: false
  partialMatch?: boolean;   // Default: true
}
```

**Returns:** ClickTarget or null if not found

```typescript
interface ClickTarget {
  text: string;
  confidence: number;
  x: number;
  y: number;
}
```

**Example:**
```typescript
const target = await engine.findText(['Submit', 'Send']);
if (target) {
  console.log('Found at:', target.x, target.y);
}
```

---

## Interaction Methods

### clickAtCoordinates()

Click at specific coordinates.

```typescript
async clickAtCoordinates(
  x: number,
  y: number,
  tabId: number
): Promise<boolean>
```

**Returns:** `true` if click was successful

**Example:**
```typescript
const success = await engine.clickAtCoordinates(150, 300, tabId);
if (success) {
  console.log('Click successful');
}
```

---

### findTextAndClick()

Find text and click on it.

```typescript
async findTextAndClick(
  searchTerms: string[],
  tabId: number
): Promise<FindAndClickResult>
```

**Returns:** FindAndClickResult

```typescript
interface FindAndClickResult {
  found: boolean;
  clicked: boolean;
  text?: string;
  x?: number;
  y?: number;
}
```

**Example:**
```typescript
const result = await engine.findTextAndClick(['Allow'], tabId);
if (result.clicked) {
  console.log('Successfully clicked', result.text);
}
```

---

### typeText()

Type text into the currently focused element.

```typescript
async typeText(text: string, tabId: number): Promise<boolean>
```

**Returns:** `true` if typing was successful

---

## Conditional Click

### waitAndClickButtons()

Poll for and click approval buttons. This is the primary method for automated approval handling.

```typescript
async waitAndClickButtons(
  config: ConditionalConfig,
  tabId: number,
  onButtonClick?: (text: string, count: number) => void
): Promise<ConditionalClickResult>
```

**Parameters:**

```typescript
interface ConditionalConfig {
  /** Button texts to search for */
  searchTerms: string[];
  
  /** Exit condition text (optional) */
  successText: string | null;
  
  /** Maximum wait time in seconds */
  timeoutSeconds: number;
  
  /** Polling interval in milliseconds */
  pollIntervalMs: number;
  
  /** Minimum OCR confidence (0-100) */
  confidenceThreshold: number;
}
```

**Returns:**

```typescript
interface ConditionalClickResult {
  /** Number of buttons clicked */
  buttonsClicked: number;
  
  /** Whether timeout was reached */
  timedOut: boolean;
  
  /** Whether success text was found */
  successTextFound: boolean;
  
  /** Total duration in milliseconds */
  durationMs: number;
  
  /** Texts that were clicked */
  clickedTexts: string[];
}
```

**Example:**
```typescript
const result = await engine.waitAndClickButtons(
  {
    searchTerms: ['Allow', 'Continue', 'Accept'],
    successText: 'committed',
    timeoutSeconds: 120,
    pollIntervalMs: 500,
    confidenceThreshold: 60,
  },
  tabId,
  (text, count) => {
    console.log(`Clicked "${text}" (${count} total)`);
  }
);

console.log('Clicked', result.buttonsClicked, 'buttons');
console.log('Timed out:', result.timedOut);
```

---

## Types

### Complete Type Exports

```typescript
// From src/types/vision.ts
export type {
  VisionConfig,
  Screenshot,
  TextResult,
  ClickTarget,
  FindTextOptions,
  FindAndClickResult,
  ConditionalConfig,
  ConditionalClickResult,
};
```

---

## Events

The VisionEngine extends EventEmitter and emits the following events:

| Event | Payload | Description |
|-------|---------|-------------|
| `initialized` | void | Engine initialized |
| `screenshot` | Screenshot | Screenshot captured |
| `ocr-complete` | TextResult[] | OCR completed |
| `click` | { x, y } | Click performed |
| `conditionalStart` | ConditionalConfig | Conditional polling started |
| `conditionalClick` | { text, x, y } | Conditional button clicked |
| `conditionalComplete` | ConditionalClickResult | Conditional polling completed |
| `error` | Error | Error occurred |

**Example:**
```typescript
engine.on('conditionalClick', ({ text, x, y }) => {
  console.log(`Clicked "${text}" at (${x}, ${y})`);
});

engine.on('error', (error) => {
  console.error('Vision error:', error.message);
});
```

---

## Usage Examples

### Basic OCR

```typescript
import { VisionEngine } from '../lib/visionEngine';

async function performOCR() {
  const engine = new VisionEngine();
  
  try {
    await engine.initialize();
    
    // Capture and recognize
    const screenshot = await engine.captureScreenshot();
    const results = await engine.recognizeText(screenshot.dataUrl);
    
    console.log('Words found:', results.length);
    results.forEach(result => {
      console.log(`"${result.text}" (${result.confidence}%)`);
    });
    
  } finally {
    await engine.terminate();
  }
}
```

---

### Click Automation

```typescript
async function clickButton(buttonText: string, tabId: number) {
  const engine = new VisionEngine({ confidenceThreshold: 70 });
  
  try {
    await engine.initialize();
    
    const result = await engine.findTextAndClick([buttonText], tabId);
    
    if (result.clicked) {
      console.log('Success!');
    } else if (result.found) {
      console.log('Found but click failed');
    } else {
      console.log('Button not found');
    }
    
  } finally {
    await engine.terminate();
  }
}
```

---

### Approval Automation

```typescript
async function handleApprovals(tabId: number) {
  const engine = new VisionEngine();
  
  try {
    await engine.initialize();
    
    const result = await engine.waitAndClickButtons(
      {
        searchTerms: ['Allow', 'Continue', 'Keep'],
        successText: 'Changes saved',
        timeoutSeconds: 300, // 5 minutes
        pollIntervalMs: 1000,
        confidenceThreshold: 60,
      },
      tabId
    );
    
    if (result.successTextFound) {
      console.log('Completed successfully');
    } else if (result.timedOut) {
      console.log('Timed out after clicking', result.buttonsClicked, 'buttons');
    }
    
  } finally {
    await engine.terminate();
  }
}
```

---

### Configuration Customization

```typescript
// Custom configuration for challenging OCR scenarios
const engine = new VisionEngine({
  confidenceThreshold: 50,  // Lower threshold for difficult fonts
  pollIntervalMs: 2000,     // Slower polling for heavy pages
  language: 'eng+fra',      // Multi-language support
  debugMode: true,          // Enable detailed logging
});

await engine.initialize();

// Use engine...

await engine.terminate();
```

---

**Last Updated:** v2.1.0
