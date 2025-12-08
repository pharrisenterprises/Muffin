# Muffin Lite Technical Reference

**Purpose:** Comprehensive technical reference for Vision-based automation development.

**Last Updated:** 2025-12-02 (Phase 3 Complete)  
**Repository:** Muffin Chrome Extension (Manifest V3)  
**Schema Version:** 3

---

## Table of Contents

1. [TypeScript Type Definitions](#typescript-type-definitions)
2. [Import Patterns](#import-patterns)
3. [Code Conventions](#code-conventions)
4. [Error Handling Patterns](#error-handling-patterns)
5. [State Management](#state-management)
6. [File Path Reference](#file-path-reference)
7. [Utilities Reference](#utilities-reference)

---

## TypeScript Type Definitions

### Vision Engine Types (`src/types/vision.ts`)

#### VisionConfig Interface

```typescript
export interface VisionConfig {
  /** OCR confidence threshold (0-100), default 60 */
  confidenceThreshold: number;
  /** Milliseconds between OCR scans, default 1000 */
  pollIntervalMs: number;
  /** Scroll attempts for off-screen elements, default 3 */
  scrollRetries: number;
  /** Use SIMD-optimized WASM, default true */
  useSIMD?: boolean;
  /** Language code for OCR, default 'eng' */
  language?: string;
  /** Enable debug logging, default false */
  debugMode?: boolean;
  /** Custom Tesseract worker path */
  workerPath?: string;
  /** Custom language data path */
  langPath?: string;
}

export const DEFAULT_VISION_CONFIG: VisionConfig = {
  confidenceThreshold: 60,
  pollIntervalMs: 1000,
  scrollRetries: 3,
  useSIMD: true,
  language: 'eng',
  debugMode: false,
};
```

#### OCR Result Types

```typescript
export interface TextResult {
  text: string;
  confidence: number;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
  };
}

export interface OcrResult {
  text: string;
  confidence: number;
  words: WordResult[];
  lines: LineResult[];
}

export interface WordResult {
  text: string;
  confidence: number;
  bbox: BoundingBox;
  center: Point;
  width: number;
  height: number;
}

export interface BoundingBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface FindTextResult {
  found: boolean;
  text: string | null;
  confidence: number | null;
  bbox: BoundingBox | null;
  clickX: number | null;
  clickY: number | null;
}
```

#### Conditional Click Types

```typescript
export interface ConditionalConfig {
  /** Button texts to search for (case-insensitive) */
  buttonTexts: string[];
  /** Success text to detect (stops polling) */
  successText: string | null;
  /** Timeout in seconds since last click */
  timeoutSeconds: number;
  /** Milliseconds between scans */
  pollIntervalMs: number;
  /** OCR confidence threshold for matches */
  confidenceThreshold: number;
}

export interface ConditionalClickResult {
  success: boolean;
  buttonsClicked: string[];
  totalClicks: number;
  successTextFound: boolean;
  terminationReason: 'success_text' | 'timeout' | 'aborted';
  pollCount: number;
  elapsedSeconds: number;
}
```

#### Step Types

```typescript
export type RecordedVia = 'dom' | 'vision';

export type StepEventType =
  | 'open'              // Navigate to URL
  | 'input'             // Type text
  | 'click'             // Click element
  | 'dropdown'          // Select option
  | 'conditional-click' // Poll and click
  ;

export interface StepCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Step {
  id: string;
  label: string;
  event: StepEventType;
  value?: string;
  selector?: string;
  xpath?: string;
  url?: string;
  timestamp?: number;
  order?: number;
  
  // Vision fields
  recordedVia: RecordedVia;
  coordinates?: StepCoordinates;
  ocrText?: string;
  confidenceScore?: number;
  
  // Delay field
  delaySeconds?: number | null;
  
  // Conditional field
  conditionalConfig?: ConditionalConfig | null;
}
```

#### Recording Types

```typescript
export interface Recording {
  id?: number;
  projectId: number;
  name: string;
  description?: string;
  url: string;
  steps: Step[];
  createdAt: number;
  updatedAt?: number;
  
  // Schema version
  schemaVersion: number;
  
  // CSV loop
  loopStartIndex: number;
  
  // Delays
  globalDelayMs: number;
  
  // Conditional defaults (optional)
  conditionalDefaults?: RecordingConditionalDefaults;
  
  // CSV mapping
  parsedFields?: ParsedField[];
  csvData?: string[][];
}

export interface RecordingConditionalDefaults {
  searchTerms: string[];
  timeoutSeconds: number;
}

export interface ParsedField {
  field_name: string;
  inputvarfields: string;
  mapped: boolean;
}
```

#### Screenshot Types

```typescript
export interface Screenshot {
  dataUrl: string;
  base64Data: string;
  mimeType: string;
  width: number;
  height: number;
  timestamp: number;
  toImageData(): Promise<ImageData>;
  toBlob(): Promise<Blob>;
}

export interface ScreenshotOptions {
  format?: 'png' | 'jpeg';
  quality?: number; // 0-100, JPEG only
}
```

#### Click Types

```typescript
export interface ClickResult {
  success: boolean;
  clickedAt: { x: number; y: number };
  timestamp: number;
  error?: string;
}

export interface ClickOptions {
  button?: 'left' | 'right' | 'middle';
  clickCount?: number;
  modifiers?: ('ctrl' | 'shift' | 'alt' | 'meta')[];
  tabId?: number;
  scaleForDPR?: boolean;
  viewportOffset?: { x: number; y: number };
}

export interface FindAndClickResult {
  found: boolean;
  clicked: boolean;
  clickedAt: { x: number; y: number } | null;
  confidence: number | null;
  error?: string;
}
```

### Legacy Core Types (`src/pages/content.tsx`)

```typescript
export interface Bundle {
  id?: number;
  bundleName: string;
  bundleDescription: string;
  csvColumns: string[];
  isPublic: boolean;
  csvData?: string[][];
  projectId: number;
  projectName?: string;
}

export interface Project {
  id?: number;
  projectName: string;
  projectDescription: string;
  redirectUrl?: string;
  capturedFields?: Field[];
  isPublic?: boolean;
  bundleName?: string;
}

export interface Field {
  id: string;
  name: string;
  value?: string;
  order?: number;
  type?: string;
  xpath?: string;
  selector?: string;
  required?: boolean;
  csvColumn?: string;
  element?: HTMLElement;
  mappingId?: string;
}
```

---

## Import Patterns

All imports use **relative paths** - no `@/` aliases:

```typescript
// ✅ CORRECT - Relative imports
import { Button } from "../../components/ui/button"
import { cn } from "../../lib/utils"
import { VisionEngine } from "../lib/visionEngine"
import { VisionConfig, Step, Recording } from "../types/vision"

// ❌ WRONG - Alias imports
import { Button } from "@/components/ui/button"
import { VisionEngine } from "@/lib/visionEngine"
```

### Common Import Paths

```typescript
// Vision Engine
import { VisionEngine } from '../lib/visionEngine';

// Types
import { 
  VisionConfig, 
  Step, 
  Recording, 
  ConditionalConfig 
} from '../types/vision';

// Step Executor
import { executeStep } from '../lib/stepExecutor';

// CSV Mapping
import { 
  buildStepToColumnMapping, 
  substituteVariables 
} from '../lib/csvPositionMapping';

// Schema Migration
import { migrateRecording } from '../lib/schemaMigration';

// Storage
import { StorageService } from '../lib/storageService';
```

---

## Code Conventions

### Naming Conventions
- **Components:** PascalCase (e.g., `VisionBadge`, `ConditionalClickPanel`)
- **Functions:** camelCase (e.g., `executeStep`, `captureScreenshot`)
- **Constants:** UPPER_SNAKE_CASE (e.g., `DEFAULT_VISION_CONFIG`)
- **Interfaces:** PascalCase (e.g., `VisionConfig`, `Step`)
- **Types:** PascalCase (e.g., `RecordedVia`, `StepEventType`)
- **Files:** kebab-case (e.g., `vision-engine.ts`, `csv-position-mapping.ts`)

### Export Patterns
- **Pages:** Default export
- **Components:** Named export
- **Utilities:** Named export
- **Classes:** Named export (e.g., `export class VisionEngine`)

### Async/Await Patterns
```typescript
// ✅ CORRECT - Always use try/catch with async
async function executeStep(step: Step): Promise<StepResult> {
  try {
    const result = await visionEngine.clickAt(step.coordinates.x, step.coordinates.y);
    return { success: true, result };
  } catch (error) {
    console.error('Step execution failed:', error);
    return { success: false, error: String(error) };
  }
}

// ✅ CORRECT - Check initialization
if (!visionEngine.isInitialized) {
  await visionEngine.initialize();
}
```

---

## Error Handling Patterns

### VisionEngine Errors

```typescript
// Check initialization before use
try {
  if (!visionEngine.isInitialized) {
    await visionEngine.initialize();
  }
  const result = await visionEngine.findText('Allow');
} catch (error) {
  if (error.message === 'VisionEngine not initialized') {
    // Handle initialization failure
  } else if (error.message === 'Tab capture failed') {
    // Handle screenshot failure
  } else if (error.message === 'OCR failed') {
    // Handle Tesseract failure
  }
}
```

### Chrome Message Passing Errors

```typescript
// Always check chrome.runtime.lastError
chrome.tabs.sendMessage(tabId, message, (response) => {
  if (chrome.runtime.lastError) {
    console.error('Message failed:', chrome.runtime.lastError.message);
    return;
  }
  // Process response
});
```

### Migration Errors

```typescript
// Verify compatibility after migration
const report = verifyBackwardCompatibility(original, migrated);
if (!report.compatible) {
  console.warn('Migration issues:', formatCompatibilityReport(report));
  // Handle incompatibility
}
```

### CSV Parsing Errors

```typescript
// Validate CSV structure
try {
  const mapping = buildStepToColumnMapping(steps, csvHeaders);
  if (mapping.size === 0) {
    console.warn('No variables found in steps or CSV headers do not match');
  }
} catch (error) {
  console.error('CSV mapping failed:', error);
}
```

---

## State Management

### Redux Store Structure

```typescript
interface RootState {
  recordings: {
    current: Recording | null;
    list: Recording[];
    loading: boolean;
  };
  playback: {
    isPlaying: boolean;
    currentStepIndex: number;
    csvRowIndex: number;
    progress: number;
  };
  vision: {
    isInitialized: boolean;
    config: VisionConfig;
  };
}
```

### Redux Actions

```typescript
// Recording actions
dispatch({ type: 'recordings/setCurrent', payload: recording });
dispatch({ type: 'recordings/updateStep', payload: { stepId, updates } });
dispatch({ type: 'recordings/addStep', payload: newStep });

// Playback actions
dispatch({ type: 'playback/start', payload: { recordingId } });
dispatch({ type: 'playback/pause' });
dispatch({ type: 'playback/setProgress', payload: { stepIndex, rowIndex } });

// Vision actions
dispatch({ type: 'vision/setConfig', payload: config });
dispatch({ type: 'vision/setInitialized', payload: true });
```

---

## File Path Reference

### Core Engine Files

| File | Location | Purpose |
|------|----------|---------|
| VisionEngine | `src/lib/visionEngine.ts` | OCR engine class |
| Step Executor | `src/lib/stepExecutor.ts` | Step routing |
| Playback Engine | `src/lib/playbackEngine.ts` | Recording playback |
| CSV Mapping | `src/lib/csvPositionMapping.ts` | CSV variable substitution |
| Schema Migration | `src/lib/schemaMigration.ts` | Recording migration |

### Migration Files

| File | Location | Purpose |
|------|----------|---------|
| RecordedVia Migration | `src/lib/migrations/migrateRecordedVia.ts` | Adds 'dom' default |
| LoopStartIndex Migration | `src/lib/migrations/migrateLoopStartIndex.ts` | Adds 0 default |
| GlobalDelayMs Migration | `src/lib/migrations/migrateGlobalDelay.ts` | Adds 0 default |
| Conditional Defaults | `src/lib/migrations/migrateConditionalDefaults.ts` | Adds null defaults |
| Compatibility Verification | `src/lib/migrations/verifyBackwardCompatibility.ts` | Validates migrations |

### Content Script Files

| File | Location | Purpose |
|------|----------|---------|
| Vision Handlers | `src/contentScript/visionHandlers.ts` | Vision message handlers |
| DOM Handlers | `src/contentScript/domHandlers.ts` | DOM message handlers |

### UI Component Files

| File | Location | Purpose |
|------|----------|---------|
| Vision Badge | `src/components/recorder/VisionBadge.tsx` | 👁️ badge |
| Conditional Badge | `src/components/recorder/ConditionalBadge.tsx` | 🎯 badge |
| Delay Badge | `src/components/recorder/DelayBadge.tsx` | ⏱️ badge |
| Loop Start Badge | `src/components/recorder/LoopStartBadge.tsx` | 🔁 badge |
| Loop Start Dropdown | `src/components/recorder/LoopStartDropdown.tsx` | Loop start selector |
| Global Delay Input | `src/components/recorder/GlobalDelayInput.tsx` | Global delay control |
| Add Conditional Menu | `src/components/recorder/AddConditionalClickMenu.tsx` | Add conditional step |
| Configure Conditional Panel | `src/components/recorder/ConfigureConditionalPanel.tsx` | Config dialog |

### Type Definition Files

| File | Location | Purpose |
|------|----------|---------|
| Vision Types | `src/types/vision.ts` | All Vision interfaces |
| Type Index | `src/types/index.ts` | Type exports |

### Test Files

| File | Location | Purpose |
|------|----------|---------|
| VisionEngine Init | `src/lib/__tests__/visionEngineInit.test.ts` | Initialization tests |
| Screenshot Capture | `src/lib/__tests__/screenshotCapture.test.ts` | Screenshot tests |
| OCR Recognition | `src/lib/__tests__/ocrRecognition.test.ts` | OCR tests |
| Find Text Accuracy | `src/lib/__tests__/findTextAccuracy.test.ts` | Search tests |
| Conditional Click Loop | `src/lib/__tests__/conditionalClickLoop.test.ts` | Polling tests |
| CSV Position Mapping | `src/lib/__tests__/csvPositionMapping.test.ts` | CSV tests |
| Schema Migration | `src/lib/__tests__/schemaMigration.test.ts` | Migration tests |
| Full Copilot Workflow | `src/lib/__tests__/e2e/copilotWorkflow.test.ts` | E2E tests |

---

## Utilities Reference

### VisionEngine Methods

```typescript
// Lifecycle
await visionEngine.initialize();
await visionEngine.terminate();

// Screenshot
const screenshot = await visionEngine.captureScreenshot(tabId);

// OCR
const ocrResult = await visionEngine.recognizeText(imageData);

// Search
const found = await visionEngine.findText('Allow', { caseSensitive: false });
const allMatches = await visionEngine.findAllText('Button');

// Click
await visionEngine.clickAt(100, 200, { button: 'left' });
await visionEngine.findTextAndClick('Submit');

// Conditional
const result = await visionEngine.waitAndClickButtons({
  buttonTexts: ['Allow', 'Keep'],
  successText: 'committed',
  timeoutSeconds: 120,
  pollIntervalMs: 500,
  confidenceThreshold: 0.7,
});
```

### CSV Position Mapping

```typescript
// Build column mapping
const mapping = buildStepToColumnMapping(steps, csvHeaders);

// Substitute variables
const substitutedStep = substituteVariables(step, csvRow, mapping);

// Get steps for current row
const stepsForRow = getStepsForRow(steps, loopStartIndex, rowIndex);

// Map entire CSV row
const mappedSteps = mapCsvRowToSteps(steps, csvRow, mapping);
```

### Schema Migration

```typescript
// Migrate recording
const migrated = migrateRecording(recording);

// Migrate and verify
const { recording: migrated, report } = migrateAndVerify(recording, {
  throwOnIncompatible: false
});

// Individual migrations
const withRecordedVia = migrateAllStepsRecordedVia(steps);
const withLoopStart = migrateLoopStartIndex(recording);
const withGlobalDelay = migrateGlobalDelayMs(recording);
const withConditionals = migrateAllStepsConditionalDefaults(steps);

// Verification
const report = verifyBackwardCompatibility(original, migrated);
console.log(formatCompatibilityReport(report));
```

### Storage Service

```typescript
// Save recording with migration
await storageService.saveRecording(recording);

// Load recording (auto-migrates)
const recording = await storageService.loadRecording(id);

// List recordings
const recordings = await storageService.listRecordings(projectId);
```

### Legacy Utilities

```typescript
// StorageHelper - Chrome storage wrapper
import { StorageHelper } from '../helpers/storageHelper';

// Class name merging
import { cn } from '../lib/utils';
const className = cn('base-class', { 'active': isActive });

// Page URL generation
import { createPageUrl } from '../helpers/urlHelper';
const url = createPageUrl('recorder.html', { projectId: 123 });
```

---

## Chrome Extension Architecture

### Message Flow

```
UI Component
  ↓ chrome.runtime.sendMessage
Background Service Worker
  ↓ chrome.tabs.sendMessage
Content Script
  ↓ Execution
  ↑ Response
Background
  ↑ chrome.runtime.sendMessage response
UI Component
```

### Vision Message Types

```typescript
// VISION_CLICK
chrome.tabs.sendMessage(tabId, {
  type: 'VISION_CLICK',
  x: 100,
  y: 200
});

// VISION_TYPE
chrome.tabs.sendMessage(tabId, {
  type: 'VISION_TYPE',
  text: 'Hello World'
});

// VISION_KEY
chrome.tabs.sendMessage(tabId, {
  type: 'VISION_KEY',
  key: 'Control+A'
});

// VISION_SCROLL
chrome.tabs.sendMessage(tabId, {
  type: 'VISION_SCROLL',
  direction: 'down'
});

// VISION_GET_ELEMENT
chrome.tabs.sendMessage(tabId, {
  type: 'VISION_GET_ELEMENT',
  x: 100,
  y: 200
});
```

### Database Schema (IndexedDB via Dexie.js)

**Tables:**
- `projects`: Project metadata
- `bundles`: CSV test bundles
- `testRuns`: Test execution history
- `recordings`: Step recordings (schemaVersion: 3)

**Recording Schema v3 Fields:**
- `schemaVersion`: 3
- `loopStartIndex`: 0 (default)
- `globalDelayMs`: 0 (default)
- `steps[].recordedVia`: 'dom' | 'vision'
- `steps[].conditionalConfig`: null (default)
- `steps[].delaySeconds`: null (default)

---

*Last updated: 2025-12-02 after Phase 3 completion*

