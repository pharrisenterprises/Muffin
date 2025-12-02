# MUFFIN LITE - DETAILED FEATURE SPECIFICATIONS

> **Version:** 2.1 | **Status:** Specification  
> **Purpose:** Complete technical specifications for each feature

---

## FEATURE 1: VISION ENGINE

### 1.1 Overview

The Vision Engine is the foundational component that enables all Vision-based capabilities in Muffin Lite. It wraps Tesseract.js for OCR and provides high-level methods for screenshot capture, text recognition, and element interaction.

### 1.2 Component Location

```
src/lib/visionEngine.ts
```

### 1.3 Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| tesseract.js | ^5.0.0 | OCR text recognition |
| Chrome APIs | - | Screenshot capture, tab messaging |

### 1.4 Type Definitions

```typescript
// Text recognition result from OCR
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

// Target for click operations
export interface ClickTarget {
  text: string;
  x: number;
  y: number;
  confidence: number;
}

// Engine configuration
export interface VisionConfig {
  confidenceThreshold: number;  // Default: 60
  pollIntervalMs: number;       // Default: 1000
  scrollRetries: number;        // Default: 3
}

// Conditional click result
export interface ConditionalClickResult {
  buttonsClicked: number;
  timedOut: boolean;
}
```

### 1.5 Class Structure

```typescript
export class VisionEngine {
  // Private state
  private worker: Tesseract.Worker | null;
  private initialized: boolean;
  private config: VisionConfig;

  // Lifecycle methods
  async initialize(): Promise<void>;
  async terminate(): Promise<void>;
  setConfig(config: Partial<VisionConfig>): void;

  // Core OCR methods
  async captureScreen(): Promise<string>;
  async recognizeText(imageDataUrl: string): Promise<TextResult[]>;

  // Search methods
  async findText(searchTerms: string[]): Promise<ClickTarget | null>;
  async findAllText(searchTerm: string): Promise<ClickTarget[]>;
  async captureInputAtCoordinates(x: number, y: number, width: number, height: number): Promise<string>;

  // Interaction methods
  async clickAtCoordinates(x: number, y: number): Promise<boolean>;
  async clickText(searchTerms: string[]): Promise<boolean>;
  async typeText(text: string): Promise<boolean>;
  async clickAndType(x: number, y: number, text: string): Promise<boolean>;
  async sendKeys(keys: string[]): Promise<void>;

  // Complex interactions
  async handleDropdown(triggerText: string, optionText: string, waitMs?: number): Promise<boolean>;
  async scrollToFind(searchTerms: string[]): Promise<ClickTarget | null>;

  // Conditional click loop
  async waitAndClickButtons(
    searchTerms: string[],
    timeoutSeconds: number,
    onButtonClick?: (text: string, count: number) => void
  ): Promise<ConditionalClickResult>;
}

// Singleton export
export const visionEngine: VisionEngine;
```

### 1.6 Method Specifications

#### initialize()
- **Purpose:** Start Tesseract.js worker
- **Preconditions:** None
- **Postconditions:** Worker ready, initialized = true
- **Error Handling:** Throw if worker creation fails
- **Logging:** "🔬 Initializing Vision Engine..." and "✅ Vision Engine ready"

#### terminate()
- **Purpose:** Clean up Tesseract.js worker
- **Preconditions:** None (safe to call when not initialized)
- **Postconditions:** Worker terminated, initialized = false
- **Logging:** "🔬 Vision Engine terminated"

#### captureScreen()
- **Purpose:** Capture visible browser tab as PNG
- **Returns:** Base64 data URL
- **API Used:** `chrome.tabs.captureVisibleTab(null, { format: 'png' })`
- **Error Handling:** Reject with chrome.runtime.lastError message

#### recognizeText(imageDataUrl)
- **Purpose:** Extract text and coordinates from image
- **Input:** Base64 PNG data URL
- **Returns:** Array of TextResult objects
- **Filter:** Only results with confidence >= config.confidenceThreshold
- **Error Handling:** Throw if worker not initialized

#### findText(searchTerms)
- **Purpose:** Find first matching text on screen
- **Input:** Array of search terms
- **Process:** Screenshot → OCR → Search
- **Matching:** Case-insensitive substring
- **Returns:** ClickTarget or null

#### clickAtCoordinates(x, y)
- **Purpose:** Click element at coordinates
- **Input:** Pixel coordinates
- **Process:** Send VISION_CLICK message to content script
- **Returns:** Boolean success

#### clickAndType(x, y, text)
- **Purpose:** Click to focus, clear, then type
- **Process:**
  1. clickAtCoordinates(x, y)
  2. Wait 100ms
  3. sendKeys(['Control+a', 'Delete'])
  4. typeText(text)
- **Returns:** Boolean success

#### handleDropdown(triggerText, optionText, waitMs)
- **Purpose:** Interact with dropdown menus
- **Process:**
  1. clickText([triggerText])
  2. Wait waitMs (default 500)
  3. clickText([optionText])
- **Returns:** Boolean success
- **Logging:** Log each step's success/failure

#### waitAndClickButtons(searchTerms, timeoutSeconds, onButtonClick)
- **Purpose:** Polling loop for conditional clicks
- **Process:**
  1. Record start time
  2. Loop:
     - Screenshot → OCR → Search
     - If found: click, reset timer, call callback
     - If not found: wait pollIntervalMs
     - If timeout exceeded: exit
- **Returns:** { buttonsClicked, timedOut }
- **Logging:** Log each scan and click

### 1.7 Content Script Handlers

The Vision Engine sends messages to content scripts for DOM operations:

```typescript
// Message types
type VisionMessage =
  | { type: 'VISION_CLICK'; x: number; y: number }
  | { type: 'VISION_TYPE'; text: string }
  | { type: 'VISION_KEY'; key: string }
  | { type: 'VISION_SCROLL'; direction: 'up' | 'down' }
  | { type: 'VISION_GET_ELEMENT'; x: number; y: number };
```

#### VISION_CLICK Handler
```typescript
// Process:
// 1. document.elementFromPoint(x, y)
// 2. element.scrollIntoView({ behavior: 'instant', block: 'center' })
// 3. Dispatch mousedown, mouseup, click events
// Response: { success: boolean, element?: string }
```

#### VISION_TYPE Handler
```typescript
// Process:
// 1. Get document.activeElement
// 2. If input/textarea: set value, dispatch input/change
// 3. If contenteditable: use execCommand('insertText')
// 4. Else: dispatch keydown/keypress/keyup for each char
// Response: { success: boolean }
```

#### VISION_KEY Handler
```typescript
// Process:
// 1. Parse key (e.g., "Control+a" → ctrl modifier + 'a')
// 2. Dispatch keydown with modifiers
// 3. Handle special commands (selectAll, delete)
// Response: { success: boolean }
```

---

## FEATURE 2: VISION RECORDING

### 2.1 Overview

Vision Recording extends the existing DOM-based recorder with a fallback mechanism that uses the Vision Engine to capture inputs that don't fire standard DOM events.

### 2.2 Component Location

```
src/contentScript/content.tsx (modified)
src/contentScript/recorder.ts (if extracted)
```

### 2.3 Trigger Conditions

Vision fallback activates when:

1. **Input event fires but value is empty**
   - Element received input event
   - After 500ms delay, element.value is still empty
   - Common in: Monaco editors, custom input components

2. **Contenteditable without value property**
   - Element has contenteditable="true"
   - No standard value property exists
   - Common in: Rich text editors, Copilot prompt cells

3. **Shadow DOM blocks access**
   - Element is inside closed shadow root
   - Standard DOM queries fail
   - Vision provides coordinate-based alternative

### 2.4 Vision Recording Data Structure

```typescript
interface VisionRecordedStep extends Step {
  // Flag indicating Vision was used
  recordedVia: 'vision';
  
  // Bounding box of the element
  coordinates: {
    x: number;      // Left edge
    y: number;      // Top edge
    width: number;  // Element width
    height: number; // Element height
  };
  
  // Text recognized at those coordinates
  ocrText: string;
  
  // OCR confidence score (0-100)
  confidenceScore: number;
}
```

### 2.5 Recording Process

```
┌─────────────────────────────────────────────────────────────────┐
│                    VISION RECORDING PROCESS                      │
└─────────────────────────────────────────────────────────────────┘

    User Interaction
          │
          ▼
    ┌──────────────┐
    │  DOM Event   │
    │   Captured   │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐     Yes    ┌──────────────┐
    │ Value        ├───────────▶│  DOM Step    │
    │ Captured?    │            │  Created     │
    └──────┬───────┘            └──────────────┘
           │ No
           ▼
    ┌──────────────┐
    │ Wait 500ms   │
    │ (debounce)   │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐     Yes    ┌──────────────┐
    │ Value now    ├───────────▶│  DOM Step    │
    │ available?   │            │  Created     │
    └──────┬───────┘            └──────────────┘
           │ No
           ▼
    ┌──────────────┐
    │   VISION     │
    │  FALLBACK    │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ Get element  │
    │ bounding box │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ Screenshot   │
    │ + OCR        │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ Extract text │
    │ at coords    │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ Vision Step  │
    │ Created      │
    └──────────────┘
```

### 2.6 UI Indicators

#### Vision Badge
- **Display:** "📷 Vision" pill badge
- **Location:** Step row, after label text
- **Color:** Subtle background (e.g., blue-100)
- **Condition:** Show when step.recordedVia === 'vision'

#### Three-Dot Menu Addition
- **Menu Item:** "📷 View Vision Data"
- **Action:** Opens dialog showing:
  - Coordinates: (x, y, width, height)
  - OCR Text: What Vision captured
  - Confidence: Percentage score

---

## FEATURE 3: TIME DELAY

### 3.1 Overview

Time Delay provides configurable pauses between steps, supporting both a global delay (applied to all steps) and per-step delays (applied to specific steps).

### 3.2 Data Model Extensions

```typescript
// Recording-level (global delay)
interface Recording {
  // ... existing fields
  globalDelayMs: number;  // Default: 0
}

// Step-level (per-step delay)
interface Step {
  // ... existing fields
  delaySeconds?: number;  // Optional, in seconds
}
```

### 3.3 UI Components

#### Global Delay Input (Toolbar)
```typescript
interface GlobalDelayInputProps {
  value: number;
  onChange: (ms: number) => void;
}

// Location: Recorder toolbar
// Label: "Delay:"
// Suffix: "ms"
// Input type: number
// Min: 0
// Max: 999999
// Width: ~80px
```

#### Per-Step Delay Dialog
```typescript
interface DelayDialogProps {
  isOpen: boolean;
  currentDelay: number | undefined;
  onSave: (seconds: number) => void;
  onCancel: () => void;
}

// Fields:
// - Label: "Delay (seconds):"
// - Input type: number
// - Min: 0
// - Max: 3600
// - Help text: "This delay will execute BEFORE this step runs."
```

#### Delay Badge
```typescript
interface DelayBadgeProps {
  seconds: number;
}

// Display: "⏱️ {seconds}s"
// Example: "⏱️ 5s"
// Condition: Show when step.delaySeconds > 0
```

### 3.4 Execution Logic

```typescript
async function executeStepWithDelay(
  step: Step,
  globalDelayMs: number
): Promise<void> {
  
  // 1. Per-step delay BEFORE (if set)
  if (step.delaySeconds && step.delaySeconds > 0) {
    console.log(`⏳ Per-step delay: ${step.delaySeconds}s`);
    await new Promise(resolve => 
      setTimeout(resolve, step.delaySeconds * 1000)
    );
  }
  
  // 2. Execute the step
  await executeStep(step);
  
  // 3. Global delay AFTER (only if no per-step delay)
  if (!step.delaySeconds && globalDelayMs > 0) {
    console.log(`⏳ Global delay: ${globalDelayMs}ms`);
    await new Promise(resolve => 
      setTimeout(resolve, globalDelayMs)
    );
  }
}
```

### 3.5 Delay Precedence Rules

| Scenario | Per-Step Delay | Global Delay | Result |
|----------|---------------|--------------|--------|
| Neither set | undefined | 0 | No delay |
| Global only | undefined | 1000 | 1000ms AFTER step |
| Per-step only | 5 | 0 | 5s BEFORE step |
| Both set | 5 | 1000 | 5s BEFORE step (global skipped) |

---

## FEATURE 4: CSV LOOP

### 4.1 Overview

CSV Loop enables executing a recording multiple times with different data, where the first row executes all steps and subsequent rows start from a configurable loop start position.

### 4.2 Data Model Extensions

```typescript
interface Recording {
  // ... existing fields
  loopStartIndex: number;  // Default: 0 (Step 1)
}
```

### 4.3 UI Components

#### Loop Start Dropdown (Toolbar)
```typescript
interface LoopStartDropdownProps {
  steps: Step[];
  value: number;
  onChange: (index: number) => void;
}

// Location: Recorder toolbar
// Label: "CSV Loop Start:"
// Options: Generated from steps array
//   - "Loop from Step 1" (index 0)
//   - "Loop from Step 2" (index 1)
//   - ... etc
// Default: "Loop from Step 1"
```

#### Loop Start Badge
```typescript
interface LoopStartBadgeProps {
  isLoopStart: boolean;
}

// Display: "🔁 Loop Start"
// Condition: Show when step index === recording.loopStartIndex
// Note: Only visible when loopStartIndex > 0
```

### 4.4 Position-Based Column Mapping

#### Problem Statement
When CSV has duplicate column headers (e.g., "Search", "Search", "Search"), Papa.parse adds suffixes:
- Column 1: "Search" → "Search"
- Column 2: "Search" → "Search_1"
- Column 3: "Search" → "Search_2"

When recording has multiple steps with same label, we must map by position, not name.

#### Mapping Algorithm

```typescript
function buildStepToColumnMapping(
  steps: Step[],
  csvFields: ParsedField[]
): Record<number, string> {
  
  // Step 1: Group CSV columns by target label
  const labelToColumns: Record<string, string[]> = {};
  
  csvFields.forEach(field => {
    if (field.inputvarfields && field.field_name) {
      if (!labelToColumns[field.inputvarfields]) {
        labelToColumns[field.inputvarfields] = [];
      }
      labelToColumns[field.inputvarfields].push(field.field_name);
    }
  });
  
  // Example result:
  // { "Search": ["Search", "Search_1", "Search_2"] }

  // Step 2: Map each step index to its specific column
  const stepToColumn: Record<number, string> = {};
  const counters: Record<string, number> = {};

  steps.forEach((step, index) => {
    if (step.label && labelToColumns[step.label]) {
      const counter = counters[step.label] || 0;
      const columns = labelToColumns[step.label];
      
      if (counter < columns.length) {
        stepToColumn[index] = columns[counter];
      }
      
      counters[step.label] = counter + 1;
    }
  });
  
  // Example result:
  // { 2: "Search", 5: "Search_1", 8: "Search_2" }

  return stepToColumn;
}
```

### 4.5 Row Iteration Logic

```typescript
async function executeWithCSVLoop(
  recording: Recording,
  csvRows: Record<string, string>[]
): Promise<void> {
  
  const { steps, loopStartIndex } = recording;
  const stepToColumn = buildStepToColumnMapping(steps, parsedFields);
  
  for (let rowIndex = 0; rowIndex < csvRows.length; rowIndex++) {
    const currentRow = csvRows[rowIndex];
    const isFirstRow = rowIndex === 0;
    
    console.log(`\n📄 ROW ${rowIndex + 1} of ${csvRows.length}`);
    
    // Determine which steps to execute
    const stepsToExecute = isFirstRow
      ? steps                          // All steps for row 1
      : steps.slice(loopStartIndex);   // From loop start for rows 2+
    
    for (let i = 0; i < stepsToExecute.length; i++) {
      // Clone step to avoid mutation
      let step = { ...stepsToExecute[i] };
      
      // Calculate absolute index for mapping lookup
      const absoluteIndex = isFirstRow ? i : (loopStartIndex + i);
      
      // Inject CSV value if mapped
      const csvColumn = stepToColumn[absoluteIndex];
      if (csvColumn && currentRow[csvColumn] !== undefined) {
        step.value = currentRow[csvColumn];
        console.log(`💉 CSV: "${step.value}"`);
      }
      
      // Execute step
      await executeStepWithDelay(step, recording.globalDelayMs);
    }
  }
}
```

### 4.6 Execution Examples

#### Example 1: Loop from Step 3

```
Recording Steps:
  Step 0: open page
  Step 1: login
  Step 2: navigate to form    ← Loop Start
  Step 3: fill field
  Step 4: submit

CSV Rows:
  Row 1: { field: "cat" }
  Row 2: { field: "dog" }
  Row 3: { field: "bird" }

Execution:
  Row 1: Steps 0, 1, 2, 3, 4 (ALL)
  Row 2: Steps 2, 3, 4 (from loop start)
  Row 3: Steps 2, 3, 4 (from loop start)
```

#### Example 2: Loop from Step 1 (Default)

```
Recording Steps:
  Step 0: open page           ← Loop Start (default)
  Step 1: fill field
  Step 2: submit

CSV Rows:
  Row 1: { field: "cat" }
  Row 2: { field: "dog" }

Execution:
  Row 1: Steps 0, 1, 2 (ALL)
  Row 2: Steps 0, 1, 2 (ALL - same as row 1)
```

---

## FEATURE 5: CONDITIONAL CLICK

### 5.1 Overview

Conditional Click enables automated approval workflows by polling the screen for specific buttons and clicking them until they stop appearing or a timeout is reached.

### 5.2 Data Model Extensions

```typescript
interface Step {
  // ... existing fields
  
  // Conditional click configuration
  conditionalConfig?: {
    enabled: boolean;
    searchTerms: string[];      // Text to search for
    timeoutSeconds: number;     // Seconds since last click
    pollIntervalMs: number;     // Time between scans
    interactionType: 'click' | 'dropdown' | 'input';
    dropdownOption?: string;    // For dropdown type
  };
}

interface Recording {
  // ... existing fields
  
  // Default values for conditional clicks
  conditionalDefaults: {
    searchTerms: string[];      // Default: ['Allow', 'Keep']
    timeoutSeconds: number;     // Default: 120
  };
}
```

### 5.3 UI Components

#### Add Variable Menu Option
```typescript
// Location: "+ Add Variable" button dropdown
// Option: "Conditional Click"
// Action: Opens ConditionalConfigDialog
```

#### Conditional Config Dialog
```typescript
interface ConditionalConfigDialogProps {
  isOpen: boolean;
  config?: ConditionalConfig;
  onSave: (config: ConditionalConfig) => void;
  onCancel: () => void;
}

// Fields:
// 1. Search Terms
//    - Type: text input
//    - Format: comma-separated
//    - Default: "Allow, Keep"
//    - Help: "Text to search for on screen"
//
// 2. Timeout
//    - Type: number input
//    - Unit: seconds
//    - Default: 120
//    - Help: "Seconds to wait after last click before continuing"
//
// 3. Interaction Type
//    - Type: dropdown
//    - Options: "Click", "Dropdown", "Input"
//    - Default: "Click"
//
// 4. Dropdown Option (conditional)
//    - Shown when: Interaction Type === "Dropdown"
//    - Type: text input
//    - Help: "Option text to select after clicking dropdown"
```

#### Conditional Badge
```typescript
interface ConditionalBadgeProps {
  timeoutSeconds: number;
}

// Display: "🔍 Conditional" or "🔍 Wait ⏱️ 120s"
// Condition: Show when step.event === 'conditional-click'
```

### 5.4 Execution Logic

```typescript
async function executeConditionalClick(
  step: Step,
  defaults: { searchTerms: string[]; timeoutSeconds: number }
): Promise<void> {
  
  // Merge step config with defaults
  const config = step.conditionalConfig || {
    enabled: true,
    searchTerms: defaults.searchTerms,
    timeoutSeconds: defaults.timeoutSeconds,
    pollIntervalMs: 1000,
    interactionType: 'click' as const
  };
  
  console.log(`🔍 Conditional click: ${config.searchTerms.join(', ')}`);
  console.log(`⏱️ Timeout: ${config.timeoutSeconds}s`);
  
  // Execute polling loop
  const result = await visionEngine.waitAndClickButtons(
    config.searchTerms,
    config.timeoutSeconds,
    (text, count) => {
      console.log(`✅ Clicked "${text}" (#${count})`);
    }
  );
  
  console.log(`📊 Result: ${result.buttonsClicked} buttons clicked`);
  console.log(`⏱️ Timed out: ${result.timedOut}`);
}
```

### 5.5 Auto-Detection Failsafe

In addition to explicit conditional click steps, the system can automatically detect and click approval buttons as a failsafe:

```typescript
async function executeStepWithAutoDetect(
  step: Step,
  conditionalDefaults: { searchTerms: string[]; timeoutSeconds: number }
): Promise<void> {
  
  // Execute the step normally
  await executeStep(step);
  
  // Auto-detect failsafe (quick single scan)
  if (step.event !== 'conditional-click') {
    const target = await visionEngine.findText(conditionalDefaults.searchTerms);
    
    if (target) {
      console.log(`🔍 Auto-detected: "${target.text}"`);
      await visionEngine.clickAtCoordinates(target.x, target.y);
    }
  }
}
```

### 5.6 Interaction Type Behaviors

#### Click (Default)
```typescript
// Simple click at coordinates
await visionEngine.clickAtCoordinates(target.x, target.y);
```

#### Dropdown
```typescript
// Click trigger, wait, click option
await visionEngine.handleDropdown(
  target.text,           // Trigger text
  config.dropdownOption, // Option text
  500                    // Wait ms
);
```

#### Input
```typescript
// Click to focus, then type
await visionEngine.clickAndType(
  target.x,
  target.y,
  config.inputValue || ''
);
```

---

## FEATURE INTERACTION MATRIX

| Feature | Vision Engine | Recording | Playback | UI |
|---------|--------------|-----------|----------|-----|
| **Vision Engine** | - | Provides fallback | Provides interaction | None |
| **Vision Recording** | Uses OCR | Extends recorder | Stores Vision data | Badge, menu |
| **Time Delay** | None | Stores delaySeconds | Executes delays | Toolbar, dialog |
| **CSV Loop** | None | Stores loopStartIndex | Iterates rows | Dropdown, badge |
| **Conditional Click** | Uses polling | Stores config | Executes loop | Dialog, badge |

---

## TESTING REQUIREMENTS

### Vision Engine Tests
- [ ] Initialize and terminate cleanly
- [ ] Screenshot captures visible tab
- [ ] OCR extracts text with coordinates
- [ ] findText returns correct coordinates
- [ ] clickAtCoordinates dispatches events
- [ ] typeText inputs into focused element
- [ ] handleDropdown selects option
- [ ] waitAndClickButtons respects timeout

### Vision Recording Tests
- [ ] DOM recording still works
- [ ] Vision fallback triggers on complex inputs
- [ ] Coordinates captured correctly
- [ ] OCR text captured correctly
- [ ] Vision badge displays

### Time Delay Tests
- [ ] Global delay input saves value
- [ ] Per-step delay dialog works
- [ ] Delay badge displays
- [ ] Global delay executes AFTER step
- [ ] Per-step delay executes BEFORE step
- [ ] Per-step overrides global

### CSV Loop Tests
- [ ] Loop start dropdown shows all steps
- [ ] Loop start badge displays
- [ ] Row 1 executes all steps
- [ ] Rows 2+ execute from loop start
- [ ] Position mapping handles duplicates
- [ ] CSV values inject correctly

### Conditional Click Tests
- [ ] Add via "+ Add Variable" works
- [ ] Config dialog saves values
- [ ] Conditional badge displays
- [ ] Polling finds buttons
- [ ] Clicks reset timeout
- [ ] Timeout exits loop
- [ ] Auto-detection works

---

*End of Feature Specifications*
