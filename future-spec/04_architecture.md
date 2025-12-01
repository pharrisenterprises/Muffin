# MUFFIN LITE - FUTURE SYSTEM ARCHITECTURE

> **Version:** 2.1 | **Status:** Specification  
> **Purpose:** Define the technical architecture for Muffin Lite with Vision capabilities

---

## ARCHITECTURE OVERVIEW

### High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CHROME EXTENSION                                   │
│                          (Manifest V3)                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         EXTENSION PAGES                                 │ │
│  │                         (React + Vite)                                  │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │ │
│  │  │  Dashboard   │  │   Recorder   │  │ Field Mapper │  │ Test Runner│  │ │
│  │  │    Page      │  │    Page      │  │    Page      │  │    Page    │  │ │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘  │ │
│  │         │                 │                 │                │         │ │
│  │         └─────────────────┴─────────────────┴────────────────┘         │ │
│  │                                    │                                    │ │
│  │                                    ▼                                    │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐  │ │
│  │  │                      SHARED LIBRARIES                             │  │ │
│  │  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐  │  │ │
│  │  │  │ Vision Engine  │  │  UI Components │  │  State Management  │  │  │ │
│  │  │  │ (Tesseract.js) │  │  (shadcn/ui)   │  │  (React Context)   │  │  │ │
│  │  │  └────────────────┘  └────────────────┘  └────────────────────┘  │  │ │
│  │  └──────────────────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
│                                    │ chrome.runtime.sendMessage              │
│                                    ▼                                         │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                      SERVICE WORKER (Background)                        │ │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐   │ │
│  │  │ Message Router │  │  Tab Manager   │  │  IndexedDB (Dexie.js)  │   │ │
│  │  └────────────────┘  └────────────────┘  └────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
│                                    │ chrome.tabs.sendMessage                 │
│                                    ▼                                         │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                      CONTENT SCRIPTS                                    │ │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐   │ │
│  │  │    Recorder    │  │    Replayer    │  │   Vision Handlers      │   │ │
│  │  │  (DOM Events)  │  │ (Step Executor)│  │ (Click/Type/Scroll)    │   │ │
│  │  └────────────────┘  └────────────────┘  └────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                         │
│                                    ▼                                         │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         TARGET WEB PAGE                                 │ │
│  │                      (User's Browser Tab)                               │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## COMPONENT ARCHITECTURE

### Layer 1: Extension Pages (UI Layer)

```
src/pages/
├── Dashboard.tsx          # Project management
├── Recorder.tsx           # Recording interface (MODIFIED)
├── FieldMapper.tsx        # CSV mapping interface
├── TestRunner.tsx         # Playback interface (MODIFIED)
└── Layout.tsx             # Shared layout wrapper
```

#### Recorder.tsx Modifications

```typescript
// NEW: Imports
import { visionEngine } from '../lib/visionEngine';

// NEW: State additions
const [globalDelayMs, setGlobalDelayMs] = useState<number>(0);
const [loopStartIndex, setLoopStartIndex] = useState<number>(0);

// NEW: Toolbar additions
<ToolbarSection>
  <LoopStartDropdown 
    steps={steps}
    value={loopStartIndex}
    onChange={setLoopStartIndex}
  />
  <DelayInput
    value={globalDelayMs}
    onChange={setGlobalDelayMs}
  />
</ToolbarSection>

// NEW: Step row modifications
<StepRow
  step={step}
  badges={[
    step.recordedVia === 'vision' && <VisionBadge />,
    step.delaySeconds && <DelayBadge seconds={step.delaySeconds} />,
    index === loopStartIndex && loopStartIndex > 0 && <LoopStartBadge />,
    step.event === 'conditional-click' && <ConditionalBadge />,
  ]}
  menuItems={[
    { label: 'Edit Label', action: () => {} },
    { label: 'Set Delay Before Step', action: () => openDelayDialog(index) },
    { label: 'Configure Conditional', action: () => openConditionalDialog(index) },
    step.recordedVia === 'vision' && { label: 'View Vision Data', action: () => {} },
    { label: 'Delete Step', action: () => deleteStep(index) },
  ]}
/>
```

#### TestRunner.tsx Modifications

```typescript
// NEW: Imports
import { visionEngine } from '../lib/visionEngine';
import { buildStepToColumnMapping } from '../lib/csvMapping';
import { executeStepWithDelay, executeConditionalClick } from '../lib/stepExecutor';

// NEW: Playback function
async function runPlayback() {
  // Initialize Vision Engine
  await visionEngine.initialize();
  
  try {
    const stepToColumn = buildStepToColumnMapping(steps, parsedFields);
    
    for (let rowIndex = 0; rowIndex < csvRows.length; rowIndex++) {
      const currentRow = csvRows[rowIndex];
      const isFirstRow = rowIndex === 0;
      
      const stepsToExecute = isFirstRow
        ? steps
        : steps.slice(recording.loopStartIndex);
      
      for (let i = 0; i < stepsToExecute.length; i++) {
        let step = { ...stepsToExecute[i] };
        const absoluteIndex = isFirstRow ? i : (recording.loopStartIndex + i);
        
        // Inject CSV value
        const csvColumn = stepToColumn[absoluteIndex];
        if (csvColumn && currentRow[csvColumn]) {
          step.value = currentRow[csvColumn];
        }
        
        // Execute with delay
        await executeStepWithDelay(step, recording.globalDelayMs);
      }
    }
  } finally {
    await visionEngine.terminate();
  }
}
```

---

### Layer 2: Shared Libraries

```
src/lib/
├── visionEngine.ts        # NEW: Tesseract.js wrapper
├── csvMapping.ts          # NEW: Position-based mapping
├── stepExecutor.ts        # NEW: Step execution with delays
└── utils.ts               # Existing utilities
```

#### visionEngine.ts Structure

```typescript
// Singleton pattern for global access
class VisionEngine {
  private worker: Tesseract.Worker | null = null;
  private initialized: boolean = false;
  private config: VisionConfig = {
    confidenceThreshold: 60,
    pollIntervalMs: 1000,
    scrollRetries: 3
  };

  // Lifecycle
  async initialize(): Promise<void> { /* ... */ }
  async terminate(): Promise<void> { /* ... */ }

  // OCR
  async captureScreen(): Promise<string> { /* ... */ }
  async recognizeText(imageDataUrl: string): Promise<TextResult[]> { /* ... */ }

  // Search
  async findText(searchTerms: string[]): Promise<ClickTarget | null> { /* ... */ }

  // Interaction (delegates to content script)
  async clickAtCoordinates(x: number, y: number): Promise<boolean> { /* ... */ }
  async typeText(text: string): Promise<boolean> { /* ... */ }
  async clickAndType(x: number, y: number, text: string): Promise<boolean> { /* ... */ }

  // Complex operations
  async handleDropdown(trigger: string, option: string): Promise<boolean> { /* ... */ }
  async waitAndClickButtons(terms: string[], timeout: number): Promise<Result> { /* ... */ }
}

export const visionEngine = new VisionEngine();
```

#### csvMapping.ts Structure

```typescript
export interface ParsedField {
  field_name: string;
  inputvarfields: string;
  mapped: boolean;
}

export function buildStepToColumnMapping(
  steps: Step[],
  csvFields: ParsedField[]
): Record<number, string> {
  // Group columns by target label
  // Map each step index to specific column by occurrence order
  // Return { stepIndex: columnName }
}

export function injectCSVValue(
  step: Step,
  stepIndex: number,
  currentRow: Record<string, string>,
  stepToColumn: Record<number, string>
): Step {
  // Clone step
  // Look up column for this index
  // Inject value if found
  // Return modified step
}
```

#### stepExecutor.ts Structure

```typescript
export async function executeStep(step: Step): Promise<void> {
  switch (step.event) {
    case 'open':
      await executeNavigation(step);
      break;
    case 'input':
      await executeInput(step);
      break;
    case 'click':
      await executeClick(step);
      break;
    case 'dropdown':
      await executeDropdown(step);
      break;
    case 'conditional-click':
      await executeConditionalClick(step);
      break;
  }
}

export async function executeStepWithDelay(
  step: Step,
  globalDelayMs: number
): Promise<void> {
  // Per-step delay BEFORE
  if (step.delaySeconds) {
    await delay(step.delaySeconds * 1000);
  }
  
  // Execute
  await executeStep(step);
  
  // Global delay AFTER (if no per-step)
  if (!step.delaySeconds && globalDelayMs > 0) {
    await delay(globalDelayMs);
  }
}

async function executeInput(step: Step): Promise<void> {
  if (step.recordedVia === 'vision' && step.coordinates) {
    // Vision-based input
    await visionEngine.clickAndType(
      step.coordinates.x,
      step.coordinates.y,
      step.value || ''
    );
  } else {
    // DOM-based input (existing logic)
    await sendToContentScript('INPUT', step);
  }
}

async function executeClick(step: Step): Promise<void> {
  if (step.recordedVia === 'vision' && step.coordinates) {
    await visionEngine.clickAtCoordinates(
      step.coordinates.x,
      step.coordinates.y
    );
  } else {
    await sendToContentScript('CLICK', step);
  }
}

async function executeConditionalClick(step: Step): Promise<void> {
  const config = step.conditionalConfig || defaultConditionalConfig;
  await visionEngine.waitAndClickButtons(
    config.searchTerms,
    config.timeoutSeconds
  );
}
```

---

### Layer 3: Service Worker (Background)

```
src/background/
├── background.ts          # Message router (MODIFIED)
└── indexedDB.ts           # Dexie.js wrapper (MODIFIED)
```

#### Message Router Additions

```typescript
// NEW: Vision-related message types
type MessageType = 
  | 'VISION_SCREENSHOT'      // Capture visible tab
  | 'VISION_INJECT_SCRIPT'   // Ensure content script loaded
  | 'GET_RECORDING'          // Load recording with new fields
  | 'SAVE_RECORDING'         // Save recording with new fields
  // ... existing types
  ;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    
    case 'VISION_SCREENSHOT':
      chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
        sendResponse({ success: true, dataUrl });
      });
      return true;
    
    case 'VISION_INJECT_SCRIPT':
      chrome.scripting.executeScript({
        target: { tabId: message.tabId },
        files: ['contentScript.js']
      }).then(() => {
        sendResponse({ success: true });
      });
      return true;
    
    // ... existing handlers
  }
});
```

#### IndexedDB Schema Updates

```typescript
// Dexie schema version increment
class MuffinDatabase extends Dexie {
  recordings!: Table<Recording>;
  projects!: Table<Project>;

  constructor() {
    super('MuffinLiteDB');
    
    // Version 2: Add Vision fields
    this.version(2).stores({
      recordings: '++id, projectId, name, createdAt',
      projects: '++id, name, createdAt'
    });
  }
}

// Extended Recording interface
interface Recording {
  id?: number;
  projectId: number;
  name: string;
  steps: Step[];
  startUrl: string;
  createdAt: Date;
  updatedAt?: Date;
  
  // NEW: Vision and loop fields
  loopStartIndex: number;
  globalDelayMs: number;
  conditionalDefaults: {
    searchTerms: string[];
    timeoutSeconds: number;
  };
}

// Extended Step interface
interface Step {
  id?: number;
  label: string;
  event: 'open' | 'input' | 'click' | 'dropdown' | 'conditional-click';
  value?: string;
  selector?: string;
  xpath?: string;
  url?: string;
  timestamp?: number;
  order?: number;
  
  // NEW: Vision fields
  recordedVia: 'dom' | 'vision';
  coordinates?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  ocrText?: string;
  confidenceScore?: number;
  
  // NEW: Delay field
  delaySeconds?: number;
  
  // NEW: Conditional config
  conditionalConfig?: {
    enabled: boolean;
    searchTerms: string[];
    timeoutSeconds: number;
    pollIntervalMs: number;
    interactionType: 'click' | 'dropdown' | 'input';
    dropdownOption?: string;
  };
}
```

---

### Layer 4: Content Scripts

```
src/contentScript/
├── content.tsx            # Main entry (MODIFIED)
├── recorder.ts            # DOM recording logic
├── replayer.ts            # Step execution logic
└── visionHandlers.ts      # NEW: Vision command handlers
```

#### visionHandlers.ts Structure

```typescript
// Message listener for Vision commands
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  
  switch (message.type) {
    
    case 'VISION_CLICK':
      handleVisionClick(message.x, message.y, sendResponse);
      return true;
    
    case 'VISION_TYPE':
      handleVisionType(message.text, sendResponse);
      return true;
    
    case 'VISION_KEY':
      handleVisionKey(message.key, sendResponse);
      return true;
    
    case 'VISION_SCROLL':
      handleVisionScroll(message.direction, sendResponse);
      return true;
    
    case 'VISION_GET_ELEMENT':
      handleVisionGetElement(message.x, message.y, sendResponse);
      return true;
  }
});

function handleVisionClick(x: number, y: number, sendResponse: Function) {
  try {
    const element = document.elementFromPoint(x, y);
    
    if (element) {
      element.scrollIntoView({ behavior: 'instant', block: 'center' });
      
      ['mousedown', 'mouseup', 'click'].forEach(eventType => {
        element.dispatchEvent(new MouseEvent(eventType, {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: x,
          clientY: y,
          button: 0
        }));
      });
      
      sendResponse({ success: true, element: element.tagName });
    } else {
      sendResponse({ success: false, error: 'No element at coordinates' });
    }
  } catch (error) {
    sendResponse({ success: false, error: String(error) });
  }
}

function handleVisionType(text: string, sendResponse: Function) {
  try {
    const activeElement = document.activeElement as HTMLElement;
    
    if (!activeElement) {
      sendResponse({ success: false, error: 'No active element' });
      return;
    }
    
    // Input/Textarea
    if (activeElement instanceof HTMLInputElement || 
        activeElement instanceof HTMLTextAreaElement) {
      activeElement.value = text;
      activeElement.dispatchEvent(new Event('input', { bubbles: true }));
      activeElement.dispatchEvent(new Event('change', { bubbles: true }));
      sendResponse({ success: true });
      return;
    }
    
    // Contenteditable
    if (activeElement.isContentEditable) {
      document.execCommand('selectAll');
      document.execCommand('delete');
      document.execCommand('insertText', false, text);
      sendResponse({ success: true });
      return;
    }
    
    // Fallback: keyboard simulation
    for (const char of text) {
      activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
      activeElement.dispatchEvent(new KeyboardEvent('keypress', { key: char, bubbles: true }));
      activeElement.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
    }
    
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: String(error) });
  }
}

function handleVisionKey(key: string, sendResponse: Function) {
  try {
    const activeElement = document.activeElement || document.body;
    
    // Parse key combo (e.g., "Control+a")
    const parts = key.split('+');
    const mainKey = parts.pop() || '';
    const modifiers = {
      ctrlKey: parts.includes('Control'),
      shiftKey: parts.includes('Shift'),
      altKey: parts.includes('Alt'),
      metaKey: parts.includes('Meta')
    };
    
    activeElement.dispatchEvent(new KeyboardEvent('keydown', {
      key: mainKey,
      bubbles: true,
      ...modifiers
    }));
    
    // Handle special commands
    if (key === 'Control+a') document.execCommand('selectAll');
    if (key === 'Delete' || key === 'Backspace') document.execCommand('delete');
    
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: String(error) });
  }
}

function handleVisionScroll(direction: 'up' | 'down', sendResponse: Function) {
  const amount = direction === 'down' ? 500 : -500;
  window.scrollBy({ top: amount, behavior: 'smooth' });
  sendResponse({ success: true });
}

function handleVisionGetElement(x: number, y: number, sendResponse: Function) {
  const element = document.elementFromPoint(x, y);
  
  if (element) {
    const rect = element.getBoundingClientRect();
    sendResponse({
      success: true,
      tagName: element.tagName,
      id: element.id,
      className: element.className,
      bounds: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
    });
  } else {
    sendResponse({ success: false });
  }
}
```

---

## DATA FLOW DIAGRAMS

### Recording Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RECORDING DATA FLOW                                │
└─────────────────────────────────────────────────────────────────────────────┘

User Interaction
      │
      ▼
┌──────────────┐
│ Content      │
│ Script       │
│ (recorder.ts)│
└──────┬───────┘
       │
       │ DOM Event Captured
       ▼
┌──────────────────────────────────────────────────────────────────┐
│                        DECISION POINT                             │
│                                                                   │
│   ┌─────────────────────┐         ┌─────────────────────┐        │
│   │   Value Captured?   │   No    │   Wait 500ms        │        │
│   │   (via DOM)         ├────────▶│   Check Again       │        │
│   └──────────┬──────────┘         └──────────┬──────────┘        │
│              │ Yes                           │                    │
│              │                               │ Still No Value     │
│              ▼                               ▼                    │
│   ┌─────────────────────┐         ┌─────────────────────┐        │
│   │   Create DOM Step   │         │   VISION FALLBACK   │        │
│   │   recordedVia: 'dom'│         │   recordedVia:      │        │
│   │                     │         │   'vision'          │        │
│   └──────────┬──────────┘         └──────────┬──────────┘        │
│              │                               │                    │
│              │                               ▼                    │
│              │                    ┌─────────────────────┐        │
│              │                    │ Get Bounding Box    │        │
│              │                    │ Request Screenshot  │        │
│              │                    │ Run OCR             │        │
│              │                    │ Store Coordinates   │        │
│              │                    └──────────┬──────────┘        │
│              │                               │                    │
│              └───────────────┬───────────────┘                    │
│                              │                                    │
└──────────────────────────────┼────────────────────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ chrome.runtime      │
                    │ .sendMessage        │
                    │ (LOG_STEP)          │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Background Script   │
                    │ Forwards to UI      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Recorder Page       │
                    │ Updates State       │
                    │ Displays Step       │
                    └─────────────────────┘
```

### Playback Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PLAYBACK DATA FLOW                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐
│ TestRunner Page     │
│ User Clicks "Play"  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Initialize Vision   │
│ Engine              │
│ (Tesseract worker)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Build Step-to-Column│
│ Mapping             │
│ (Position-based)    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                        CSV ROW LOOP                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  For each row in csvRows:                                  │  │
│  │                                                            │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │ Determine Steps to Execute                          │  │  │
│  │  │ isFirstRow ? allSteps : steps.slice(loopStartIndex) │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                          │                                 │  │
│  │                          ▼                                 │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │                    STEP LOOP                         │  │  │
│  │  │  ┌───────────────────────────────────────────────┐  │  │  │
│  │  │  │ 1. Clone Step                                 │  │  │  │
│  │  │  │ 2. Calculate Absolute Index                   │  │  │  │
│  │  │  │ 3. Inject CSV Value (if mapped)               │  │  │  │
│  │  │  │ 4. Execute Per-Step Delay (if set)            │  │  │  │
│  │  │  │ 5. Execute Step (DOM or Vision)               │  │  │  │
│  │  │  │ 6. Execute Global Delay (if no per-step)      │  │  │  │
│  │  │  └───────────────────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────┐
│ Terminate Vision    │
│ Engine              │
│ (Cleanup worker)    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Display Results     │
│ Log Summary         │
└─────────────────────┘
```

---

## FILE STRUCTURE (COMPLETE)

```
muffin-lite/
├── manifest.json                    # Chrome extension manifest (MODIFIED)
├── package.json                     # Dependencies (MODIFIED: +tesseract.js)
├── vite.config.ts                   # Vite configuration
├── tsconfig.json                    # TypeScript configuration
├── tailwind.config.js               # Tailwind configuration
│
├── public/
│   ├── index.html
│   ├── pages.html
│   ├── popup.html
│   └── icons/
│       ├── icon16.png
│       ├── icon48.png
│       └── icon128.png
│
├── src/
│   ├── main.tsx                     # React entry point
│   ├── App.tsx                      # Root component with router
│   │
│   ├── pages/
│   │   ├── Dashboard.tsx            # Project management
│   │   ├── Recorder.tsx             # Recording interface (MODIFIED)
│   │   ├── FieldMapper.tsx          # CSV mapping
│   │   ├── TestRunner.tsx           # Playback interface (MODIFIED)
│   │   └── Layout.tsx               # Shared layout
│   │
│   ├── components/
│   │   ├── ui/                      # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── badge.tsx
│   │   │   └── ...
│   │   │
│   │   ├── Dashboard/
│   │   │   ├── ProjectCard.tsx
│   │   │   └── CreateProjectDialog.tsx
│   │   │
│   │   ├── Recorder/
│   │   │   ├── RecorderToolbar.tsx  # MODIFIED: Add delay, loop controls
│   │   │   ├── StepRow.tsx          # MODIFIED: Add badges, menu items
│   │   │   ├── StepsTable.tsx
│   │   │   ├── DelayDialog.tsx      # NEW: Per-step delay dialog
│   │   │   ├── ConditionalDialog.tsx# NEW: Conditional config dialog
│   │   │   ├── VisionBadge.tsx      # NEW: 📷 Vision badge
│   │   │   ├── DelayBadge.tsx       # NEW: ⏱️ Xs badge
│   │   │   ├── LoopStartBadge.tsx   # NEW: 🔁 Loop Start badge
│   │   │   └── ConditionalBadge.tsx # NEW: 🔍 Conditional badge
│   │   │
│   │   ├── Mapper/
│   │   │   ├── FieldMappingTable.tsx
│   │   │   └── MappingSummary.tsx
│   │   │
│   │   └── Runner/
│   │       ├── TestConsole.tsx
│   │       ├── TestProgress.tsx
│   │       └── TestResults.tsx
│   │
│   ├── lib/
│   │   ├── visionEngine.ts          # NEW: Tesseract.js wrapper
│   │   ├── csvMapping.ts            # NEW: Position-based mapping
│   │   ├── stepExecutor.ts          # NEW: Step execution with delays
│   │   └── utils.ts                 # Existing utilities
│   │
│   ├── background/
│   │   ├── background.ts            # Service worker (MODIFIED)
│   │   └── indexedDB.ts             # Dexie.js wrapper (MODIFIED)
│   │
│   ├── contentScript/
│   │   ├── content.tsx              # Main entry (MODIFIED)
│   │   ├── recorder.ts              # DOM recording
│   │   ├── replayer.ts              # Step execution
│   │   └── visionHandlers.ts        # NEW: Vision command handlers
│   │
│   ├── types/
│   │   └── index.ts                 # Type definitions (MODIFIED)
│   │
│   └── routes/
│       └── Router.tsx               # React Router configuration
│
└── future-spec/                     # Specification documents
    ├── 00_future-overview.md
    ├── 01_requirements.md
    ├── 02_ux-flows.md
    ├── 03_feature-specs.md
    ├── 04_architecture.md
    ├── 05_data-layer.md
    ├── 06_api-contracts.md
    └── 07_migration-notes.md
```

---

## MANIFEST.JSON UPDATES

```json
{
  "manifest_version": 3,
  "name": "Muffin Lite",
  "version": "2.1.0",
  "description": "Browser automation with Vision/OCR capabilities",
  
  "permissions": [
    "activeTab",
    "tabs",
    "storage",
    "scripting"
  ],
  
  "host_permissions": [
    "<all_urls>"
  ],
  
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["contentScript.js"],
      "run_at": "document_idle"
    }
  ],
  
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  
  "web_accessible_resources": [
    {
      "resources": ["*.wasm", "*.traineddata"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

---

## PACKAGE.JSON UPDATES

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.24.0",
    "dexie": "^4.0.11",
    "papaparse": "^5.5.3",
    "string-similarity": "^4.0.4",
    "tesseract.js": "^5.0.0",
    "@hello-pangea/dnd": "^18.0.1",
    "date-fns": "^4.1.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  }
}
```

---

*End of Architecture Specification*
