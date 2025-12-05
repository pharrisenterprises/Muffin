# Component Rollup: T-Z + Vision + Verification

This rollup covers the final 9 components from test-runner-ui through xpath-computation, plus Vision subsystems (engine, UI, content handlers), schema migration, step executor, and the verification report covering all 40 components.

---

## 1. Test Runner UI

### Purpose
Test execution interface displaying real-time progress, step status, console logs, and test results. Central user-facing UI for test playback phase.

### Location
- **Primary File**: `src/pages/TestRunner.tsx` (600+ lines)
- **Entry Point**: `/testRunner?project=<id>` route

### Key Responsibilities
- Display project test configuration
- Start/stop test execution
- Show real-time step status (pending → running → passed/failed)
- Display console logs with timestamps
- Show test results summary (passed/failed counts, duration)
- Query and display test run history from IndexedDB

### API Surface
**URL Parameters:**
- `?project=<id>` - Project identifier for test execution

**State Management:**
```typescript
const [testSteps, setTestSteps] = useState<TestStep[]>([]);
const [isRunning, setIsRunning] = useState(false);
const [progress, setProgress] = useState(0);
const [logs, setLogs] = useState<LogEntry[]>([]);
const [testRuns, setTestRuns] = useState<TestRun[]>([]);
const isRunningRef = useRef(false);  // Prevent race conditions
```

### Architecture
**Key Components:**
- `<TestSteps>` - Step list with status indicators (pending/running/passed/failed)
- `<TestConsole>` - Real-time log output with timestamps and color coding
- `<TestResults>` - Final test summary (metrics, duration)
- `<TestHistory>` - Previous test runs from IndexedDB
- Progress bar - Visual indicator (X/Y steps completed)

**Execution Flow (delegates to Test Orchestrator):**
1. User clicks "Run Test" → Calls `runTest()` function
2. Initialize steps array from `project.recorded_steps`
3. For each CSV row (or single run if no CSV):
   - Open new tab with `target_url`
   - Inject content script
   - Execute steps sequentially
   - Update step status in real-time
   - Close tab after completion
4. Display final results
5. Save test run to IndexedDB

**Status Updates:**
```typescript
interface TestStep {
  id: number;
  status: 'pending' | 'running' | 'passed' | 'failed';
  event: string;
  label: string;
  value: string;
  error?: string;
}

// Update step status
setTestSteps(prev => prev.map((step, idx) =>
  idx === currentStepIndex
    ? { ...step, status: 'passed' }
    : step
));
```

### Special Cases
- **Stop button**: Uses `isRunningRef` for immediate check without re-render delay
- **Progress calculation**: `(completedSteps / totalSteps) * 100`
- **Log persistence**: Logs cleared on new test start
- **History refresh**: Queries test runs on mount and after completion

### Dependencies
- **Inbound**: FieldMapper (navigation after mapping), Dashboard (navigation from project list)
- **Outbound**: Test Orchestrator (runTest logic), Test Logger (addLog), Test Run Repository (save results)

---

## 2. UI Design System

### Purpose
Reusable UI component library built on Radix UI primitives + Tailwind CSS styling. Provides consistent design language, accessibility, and responsive layouts across all pages.

### Location
- **Primary Directory**: `src/components/Ui/` (20+ component files)
- **Utilities**: `src/lib/utils.ts` (cn helper for className merging)

### Key Responsibilities
- Provide accessible UI primitives (buttons, inputs, dialogs)
- Enforce consistent styling via Tailwind classes
- Handle responsive design patterns
- Support theme variants (light/dark mode)
- Maintain design tokens (colors, spacing, typography)

### Components Inventory
**Primitives (Radix UI based):**
- `Button` - button.tsx (variants: default, destructive, outline, ghost, link)
- `Input` - input.tsx (text inputs with focus states)
- `Card` - card.tsx (CardHeader, CardTitle, CardContent, CardFooter)
- `Dialog` - dialog.tsx (Modal overlays with backdrop)
- `Select` - select.tsx (Dropdown selectors)
- `Tabs` - tabs.tsx (TabsList, TabsTrigger, TabsContent)
- `Badge` - badge.jsx (Status indicators, color variants)
- `Progress` - progress.tsx (Progress bars)
- `Alert` - alert.tsx (Notification banners)

**Layout:**
- `Separator` - separator.tsx (Horizontal/vertical dividers)
- `ScrollArea` - scroll-area.tsx (Custom scrollbars)
- `Resizable` - resizable.tsx (Split panes with drag handles)
- `Sidebar` - sidebar.tsx (Navigation sidebar with collapse)

**Forms:**
- `Label` - label.tsx (Accessible form labels)
- `Radio` - radio-group.tsx (Radio button groups)
- `Dropdown` - dropdown-menu.tsx (Context menus)
- `Popover` - popover.tsx (Floating tooltips)

### Architecture
**Component Pattern (Button Example):**
```typescript
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-blue-500 text-white hover:bg-blue-600",
        destructive: "bg-red-500 text-white hover:bg-red-600",
        outline: "border border-input bg-background hover:bg-accent",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-blue-500 underline-offset-4 hover:underline"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
```

**Usage Example:**
```typescript
import { Button } from '@/components/Ui/button';

<Button variant="default" size="lg" onClick={handleClick}>
  Start Recording
</Button>

<Button variant="destructive" size="sm">
  Delete Project
</Button>
```

### Special Cases
- **Class Variance Authority (CVA)**: Manages variant combinations
- **cn utility**: Merges Tailwind classes, handles conflicts
- **Radix UI primitives**: Provides accessibility (ARIA attributes, keyboard navigation)
- **Slot pattern**: Allows polymorphic components (change underlying element)
- **Theme integration**: Uses CSS variables for dark/light mode

### Dependencies
- **Libraries**: `@radix-ui/*`, `class-variance-authority`, `tailwindcss`
- **Inbound**: All UI pages and components
- **Outbound**: None (leaf components)

---

## 3. Vision Recording UI

### Purpose
UI components for Vision features including badges, loop start controls, delay inputs, and visual indicators for Vision-recorded steps. Provides configuration interface for Vision-based automation.

### Location
- **Components Directory**: `src/components/recorder/`
- **Key Files**: VisionBadge.tsx, LoopStartDropdown.tsx, GlobalDelayInput.tsx, DelayBadge.tsx, SetDelayMenuItem.tsx

### Key Responsibilities
- Display Vision step indicators (👁️ badge)
- Allow loop start step selection
- Configure global delay timing
- Set per-step delay overrides
- Show Vision fallback reasons

### API Surface
**Vision Badge:**
```typescript
interface VisionBadgeProps {
  step: Step;
}

function VisionBadge({ step }: Props) {
  if (step.recordedVia !== 'vision') return null;
  
  const reason = step.visionFallbackReason || 'Manual Vision recording';
  
  return (
    <Tooltip title={reason}>
      <Badge variant="vision">👁️</Badge>
    </Tooltip>
  );
}
```

**Loop Start Dropdown:**
```typescript
interface LoopStartDropdownProps {
  steps: Step[];
  currentLoopStart: number;
  onChange: (index: number) => void;
}

function LoopStartDropdown({ steps, currentLoopStart, onChange }) {
  return (
    <Select value={currentLoopStart} onValueChange={onChange}>
      <SelectTrigger>Loop Start: Step {currentLoopStart + 1}</SelectTrigger>
      <SelectContent>
        {steps.map((step, index) => (
          <SelectItem key={index} value={index}>
            Step {index + 1}: {step.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

**Global Delay Input:**
```typescript
interface GlobalDelayInputProps {
  delayMs: number;
  onChange: (ms: number) => void;
}

function GlobalDelayInput({ delayMs, onChange }) {
  return (
    <Input
      type="number"
      value={delayMs}
      onChange={(e) => onChange(Number(e.target.value))}
      placeholder="Global delay (ms)"
      min={0}
      step={100}
    />
  );
}
```

**Delay Badge:**
```typescript
function DelayBadge({ delaySeconds }: { delaySeconds: number | null }) {
  if (!delaySeconds) return null;
  
  return (
    <Badge variant="secondary">
      ⏱️ {delaySeconds}s
    </Badge>
  );
}
```

### Architecture
**Component Locations:**
```
src/components/recorder/
  ├── VisionBadge.tsx       - 👁️ indicator for Vision steps
  ├── LoopStartDropdown.tsx - Select loop start step
  ├── GlobalDelayInput.tsx  - Set global delay (ms)
  ├── DelayBadge.tsx        - ⏱️ indicator for delays
  └── SetDelayMenuItem.tsx  - Context menu for per-step delay
```

### Special Cases
- **Vision badge visibility**: Only shown if `step.recordedVia === 'vision'`
- **Loop start validation**: Ensures index within step array bounds
- **Delay units**: Global delay in milliseconds, per-step in seconds
- **Fallback reasons**: Displays why Vision was used (DOM failure, manual selection)

### Dependencies
- **Inbound**: Recorder UI (step table), TestRunner (configuration display)
- **Outbound**: UI Design System (Badge, Select, Input components)

---

## 4. XPath Computation

### Purpose
Generates position-based XPath expressions for DOM elements during event recording. Creates absolute paths from document root to target element using tag names and positional indices. Provides primary location strategy for element replay.

### Location
- **Primary Function**: `getXPath()` in `src/contentScript/content.tsx` (~50 lines)

### Key Responsibilities
- Traverse from target element to document root
- Generate tag-based path segments
- Calculate sibling position indices (1-based)
- Handle iframe and shadow DOM contexts
- Return absolute XPath string

### API Surface
**Function Signature:**
```typescript
function getXPath(element: HTMLElement): string
```

**Example Outputs:**
```typescript
// Button in 2nd div
getXPath(button) → "/html/body/div[2]/button"

// 3rd input in form
getXPath(input) → "/html/body/form/input[3]"

// Element in shadow DOM (relative to shadow root)
getXPath(shadowElement) → "/div[2]/span[1]"
```

### Algorithm
```typescript
function getXPath(element: HTMLElement): string {
  if (!element) return '';
  
  // Base case: document element
  if (element.tagName === 'HTML') return '/html';
  if (element.tagName === 'BODY') return '/html/body';
  
  const parts: string[] = [];
  let current: HTMLElement | null = element;
  
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    // Get tag name (lowercase)
    let tag = current.tagName.toLowerCase();
    
    // Calculate sibling index (1-based)
    let index = 1;
    let sibling = current.previousSibling;
    
    while (sibling) {
      if (sibling.nodeType === Node.ELEMENT_NODE &&
          (sibling as HTMLElement).tagName === current.tagName) {
        index++;
      }
      sibling = sibling.previousSibling;
    }
    
    // Add index only if not first of type
    const totalSiblings = Array.from(current.parentNode?.children || [])
      .filter(el => el.tagName === current.tagName).length;
    
    if (totalSiblings > 1) {
      parts.unshift(`${tag}[${index}]`);
    } else {
      parts.unshift(tag);
    }
    
    // Move to parent
    current = current.parentNode as HTMLElement;
    
    // Stop at shadow root or iframe boundary
    if (current instanceof ShadowRoot || current instanceof Document) {
      break;
    }
  }
  
  return '/' + parts.join('/');
}
```

### Special Cases
- **1-based indexing**: XPath uses 1-based indices (not 0-based arrays)
- **Index omission**: Skips `[1]` if element is only child of its type
- **Shadow DOM**: Stops at shadow root boundary (relative path within shadow)
- **Iframe context**: Generates path within iframe's document
- **Brittle by design**: XPath breaks if DOM structure changes (intentional trade-off)

### Dependencies
- **Inbound**: Step Capture Engine (recording), Bundle creation
- **Outbound**: DOM API (tagName, parentNode, previousSibling)

---

## 5. DOM Element Finder

### Purpose
Multi-strategy element location system that attempts to find target DOM elements during test playback using 6+ progressive fallback strategies. Core to the replay engine's robustness against DOM changes between recording and playback.

### Location
- **Primary Logic**: Embedded in `playAction()` function in `src/contentScript/content.tsx` (lines ~700-900)
- **Integration**: Evidence-based scoring system (Batch 10-13)

### Key Responsibilities
- Attempt XPath location (primary strategy)
- Fallback to ID selector
- Fallback to name attribute
- Fallback to className
- Fallback to data-* attributes
- Fallback to ARIA label
- Fallback to placeholder text
- Integrate with Evidence-based scoring (last resort)

### API Surface
**Input (Bundle Structure):**
```typescript
interface Bundle {
  xpath?: string;           // Primary strategy
  id?: string;              // Fallback #1
  name?: string;            // Fallback #2
  className?: string;       // Fallback #3
  dataAttrs?: Record<string, string>;  // Fallback #4
  aria?: string;            // Fallback #5
  placeholder?: string;     // Fallback #6
  tagName?: string;         // Element type validation
  iframeChain?: IframeInfo[];
  shadowHosts?: string[];
  isClosedShadow?: boolean;
}
```

**Output:**
- **Success**: `HTMLElement` - Found target element
- **Failure**: `null` - No element found after all strategies

### Architecture
**Progressive Fallback Algorithm:**
```typescript
async function findElement(bundle: Bundle): Promise<HTMLElement | null> {
  // 0. Get correct document context (iframe/shadow DOM)
  const context = await getDocumentForBundle(bundle);
  
  // Strategy 1: XPath
  if (bundle.xpath) {
    try {
      const result = context.evaluate(
        bundle.xpath,
        context,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      );
      if (result.singleNodeValue) {
        console.log('[FINDER] ✓ Found by XPath');
        return result.singleNodeValue as HTMLElement;
      }
    } catch (error) {
      console.warn('[FINDER] XPath failed:', error);
    }
  }
  
  // Strategy 2: ID
  if (bundle.id) {
    const element = context.getElementById(bundle.id);
    if (element) {
      console.log('[FINDER] ✓ Found by ID');
      return element;
    }
  }
  
  // Strategy 3: Name attribute
  if (bundle.name) {
    const element = context.querySelector(`[name="${bundle.name}"]`);
    if (element) {
      console.log('[FINDER] ✓ Found by name');
      return element as HTMLElement;
    }
  }
  
  // Strategy 4: Class name
  if (bundle.className) {
    const elements = context.getElementsByClassName(bundle.className);
    if (elements.length === 1) {
      console.log('[FINDER] ✓ Found by className (unique)');
      return elements[0] as HTMLElement;
    }
  }
  
  // Strategy 5: Data attributes
  if (bundle.dataAttrs) {
    for (const [key, value] of Object.entries(bundle.dataAttrs)) {
      const element = context.querySelector(`[data-${key}="${value}"]`);
      if (element) {
        console.log('[FINDER] ✓ Found by data attribute');
        return element as HTMLElement;
      }
    }
  }
  
  // Strategy 6: ARIA label
  if (bundle.aria) {
    const element = context.querySelector(`[aria-label="${bundle.aria}"]`);
    if (element) {
      console.log('[FINDER] ✓ Found by ARIA label');
      return element as HTMLElement;
    }
  }
  
  // Strategy 7: Placeholder
  if (bundle.placeholder) {
    const element = context.querySelector(`[placeholder="${bundle.placeholder}"]`);
    if (element) {
      console.log('[FINDER] ✓ Found by placeholder');
      return element as HTMLElement;
    }
  }
  
  // Strategy 8: Evidence-based scoring (Batch 10-13)
  console.log('[FINDER] All selectors failed, trying evidence-based scoring...');
  const evidenceResult = await evidenceAggregator.findElement(
    bundle,
    previousSteps
  );
  
  if (evidenceResult.success && evidenceResult.element) {
    console.log('[FINDER] ✓ Found by evidence scoring');
    return evidenceResult.element;
  }
  
  console.error('[FINDER] ✗ All strategies failed');
  return null;
}
```

### Special Cases
- **Unique className**: Only uses class if exactly one match found
- **Data attribute prefix**: Automatically adds `data-` prefix
- **Context-aware**: Uses correct document (main, iframe, or shadow root)
- **Evidence scoring**: Last resort, most robust but slowest
- **Logging**: Each strategy logs success/failure for debugging

### Dependencies
- **Inbound**: PlaybackEngine (step execution)
- **Outbound**: Evidence Aggregator (Batch 10-13), Iframe Handler, Shadow DOM Handler

---

## 6. Step Executor

### Purpose
Routes step execution between DOM and Vision pathways. Handles per-step delays, global delays, conditional clicks, and CSV variable substitution during playback. Central routing logic for test execution.

### Location
- **Primary File**: `src/lib/stepExecutor.ts`
- **Integration**: Called by Test Orchestrator

### Key Responsibilities
- Apply delay timing (per-step or global)
- Substitute CSV variables in step values
- Route to DOM or Vision execution path
- Handle conditional click logic
- Return step result with success/error

### API Surface
**Input:**
```typescript
interface StepExecutorInput {
  step: Step;
  recording: Recording;
  csvRow?: CSVRow;
}
```

**Output:**
```typescript
interface StepResult {
  success: boolean;
  error?: string;
}
```

### Architecture
**Execution Router:**
```typescript
async function executeStep(
  step: Step, 
  recording: Recording, 
  csvRow?: CSVRow
): Promise<StepResult> {
  
  // 1. Apply delay
  if (step.delaySeconds) {
    await delay(step.delaySeconds * 1000);
  } else if (recording.globalDelayMs) {
    await delay(recording.globalDelayMs);
  }
  
  // 2. Substitute CSV variables
  const substitutedStep = substituteVariables(step, csvRow);
  
  // 3. Route by recordedVia
  if (step.recordedVia === 'vision') {
    return await executeVisionStep(substitutedStep, recording);
  } else {
    return await executeDomStep(substitutedStep);
  }
}

function substituteVariables(step: Step, csvRow?: CSVRow): Step {
  if (!csvRow) return step;
  
  let value = step.value;
  
  // Replace {{variable}} with CSV values
  Object.entries(csvRow).forEach(([key, val]) => {
    value = value.replace(new RegExp(`{{${key}}}`, 'g'), val);
  });
  
  return { ...step, value };
}

async function executeDomStep(step: Step): Promise<StepResult> {
  // Send to content script
  const result = await chrome.tabs.sendMessage(tabId, {
    action: 'executeStep',
    step
  });
  return result;
}

async function executeVisionStep(step: Step, recording: Recording): Promise<StepResult> {
  // Delegate to Vision Engine
  if (step.conditionalConfig) {
    return await visionEngine.conditionalClick(step.conditionalConfig);
  } else if (step.visionCoordinates) {
    return await visionEngine.click(step.visionCoordinates.x, step.visionCoordinates.y);
  }
  return { success: false, error: 'Invalid Vision step configuration' };
}
```

### Special Cases
- **Delay precedence**: Per-step delay overrides global delay
- **Variable syntax**: `{{variableName}}` replaced with CSV values
- **Conditional clicks**: Uses Vision polling until button appears
- **Error propagation**: Returns errors to Test Orchestrator for logging

### Dependencies
- **Inbound**: Test Orchestrator (runTest loop)
- **Outbound**: Content Script (DOM execution), Vision Engine (Vision execution)

---

## 7. Vision Engine

### Purpose
Core OCR and Vision-based automation engine using Tesseract.js. Provides screenshot capture, text recognition, text search, coordinate-based clicking, conditional polling, and Vision-driven playback capabilities.

### Location
- **Primary Class**: `src/lib/visionEngine.ts`
- **Types**: `src/types/vision.types.ts`

### Key Responsibilities
- Initialize Tesseract.js worker
- Capture screenshots via Chrome API
- Perform OCR text recognition
- Search text by string or regex
- Click at specific coordinates
- Conditional click with polling
- Handle Vision-recorded steps

### API Surface
**Class Interface:**
```typescript
class VisionEngine extends EventEmitter {
  // Lifecycle
  async initialize(): Promise<void>
  async terminate(): Promise<void>
  
  // Screenshot
  async captureScreenshot(tabId: number): Promise<Screenshot>
  
  // OCR
  async recognizeText(imageData: string | ImageData): Promise<OcrResult>
  
  // Search
  async findText(text: string | RegExp, imageData: string): Promise<FindTextResult>
  
  // Click
  async click(x: number, y: number, tabId: number): Promise<ClickResult>
  
  // Conditional
  async conditionalClick(config: ConditionalConfig): Promise<ConditionalClickResult>
}
```

**Types:**
```typescript
interface Screenshot {
  dataUrl: string;  // Base64 PNG
  width: number;
  height: number;
  timestamp: number;
}

interface OcrResult {
  text: string;
  words: {
    text: string;
    bbox: { x0: number; y0: number; x1: number; y1: number };
    confidence: number;
  }[];
}

interface FindTextResult {
  found: boolean;
  matches: {
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }[];
}

interface ConditionalConfig {
  buttonTexts: string[];
  successText?: string;
  maxAttempts: number;
  pollIntervalMs: number;
}
```

### Architecture
**Initialization:**
```typescript
async initialize() {
  this.worker = await Tesseract.createWorker('eng');
  await this.worker.setParameters({
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ',
  });
  this.isInit = true;
}
```

**Conditional Click Algorithm:**
```typescript
async conditionalClick(config: ConditionalConfig): Promise<ConditionalClickResult> {
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    // 1. Capture screenshot
    const screenshot = await this.captureScreenshot(tabId);
    
    // 2. Run OCR
    const ocrResult = await this.recognizeText(screenshot.dataUrl);
    
    // 3. Search for button texts
    for (const buttonText of config.buttonTexts) {
      const found = await this.findText(buttonText, screenshot.dataUrl);
      
      if (found.matches.length > 0) {
        // 4. Click first match
        const match = found.matches[0];
        const centerX = match.x + match.width / 2;
        const centerY = match.y + match.height / 2;
        
        await this.click(centerX, centerY, tabId);
        
        // 5. Check for success text
        if (config.successText) {
          await delay(1000);
          const newScreenshot = await this.captureScreenshot(tabId);
          const successFound = await this.findText(config.successText, newScreenshot.dataUrl);
          
          if (successFound.found) {
            return { success: true, clickedButton: buttonText, attempts: attempt };
          }
        } else {
          return { success: true, clickedButton: buttonText, attempts: attempt };
        }
      }
    }
    
    // 6. Wait before retry
    await delay(config.pollIntervalMs);
  }
  
  return { success: false, error: 'No matching button found', attempts: config.maxAttempts };
}
```

### Special Cases
- **Worker lifecycle**: Must initialize before use, terminate after
- **Screenshot API**: Uses `chrome.tabs.captureVisibleTab()`
- **Coordinate translation**: Converts OCR bounding boxes to click coordinates
- **Polling strategy**: Retries until button found or max attempts reached
- **Text confidence**: Uses Tesseract confidence scores for match quality

### Dependencies
- **Library**: Tesseract.js (OCR engine)
- **Inbound**: Step Executor (Vision step routing), Test Orchestrator
- **Outbound**: Vision Content Handlers (coordinate clicks), Chrome Tabs API (screenshots)

---

## 8. Vision Content Handlers

### Purpose
Content script message handlers for Vision-based interactions. Provides coordinate-based clicking, typing, keyboard shortcuts, scrolling, and element inspection within the webpage context.

### Location
- **Primary File**: `src/contentScript/visionHandlers.ts`
- **Integration**: Registered in content.tsx message listener

### Key Responsibilities
- Handle `VISION_CLICK` messages (click at coordinates)
- Handle `VISION_TYPE` messages (type text at active element)
- Handle `VISION_KEY` messages (keyboard shortcuts)
- Handle `VISION_SCROLL` messages (scroll up/down)
- Handle `VISION_GET_ELEMENT` messages (inspect element at coordinates)

### API Surface
**Message Handlers:**
```typescript
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
      handleGetElement(message.x, message.y, sendResponse);
      return true;
  }
});
```

### Architecture
**Click Handler:**
```typescript
function handleVisionClick(x: number, y: number, sendResponse: Function) {
  try {
    // 1. Get element at coordinates
    const element = document.elementFromPoint(x, y) as HTMLElement;
    
    if (!element) {
      sendResponse({ success: false, error: 'No element at coordinates' });
      return;
    }
    
    // 2. Simulate click
    element.click();
    
    // 3. Dispatch mouse events (for frameworks)
    const clickEvent = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y
    });
    element.dispatchEvent(clickEvent);
    
    sendResponse({ success: true, element: element.tagName });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}
```

**Type Handler:**
```typescript
function handleVisionType(text: string, sendResponse: Function) {
  try {
    const activeElement = document.activeElement as HTMLInputElement;
    
    if (!activeElement || !('value' in activeElement)) {
      sendResponse({ success: false, error: 'No input focused' });
      return;
    }
    
    // Set value
    activeElement.value = text;
    
    // Dispatch input event (for React/Vue)
    const inputEvent = new Event('input', { bubbles: true });
    activeElement.dispatchEvent(inputEvent);
    
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}
```

**Keyboard Handler:**
```typescript
function handleVisionKey(key: string, sendResponse: Function) {
  try {
    const keyEvent = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true
    });
    document.dispatchEvent(keyEvent);
    
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}
```

### Special Cases
- **Coordinate accuracy**: Uses `elementFromPoint()` for precise targeting
- **Event dispatching**: Triggers both native click and synthetic events for framework compatibility
- **Focus requirement**: Type handler requires active input element
- **Scrolling**: Uses `window.scrollBy()` for consistent behavior

### Dependencies
- **Inbound**: Vision Engine (VISION_* messages)
- **Outbound**: DOM API (elementFromPoint, click, dispatchEvent)

---

## 9. Schema Migration

### Purpose
Migrates legacy recordings (schema v1) to Vision-compatible format (schema v3). Adds defaults for `recordedVia`, `loopStartIndex`, `globalDelayMs`, `conditionalConfig`, and `delaySeconds`. Ensures backward compatibility.

### Location
- **Primary File**: `src/lib/schemaMigration.ts`
- **Migration Modules**: `src/lib/migrations/`

### Key Responsibilities
- Detect schema version
- Apply progressive migrations
- Add default values for new fields
- Repair invalid configurations
- Verify backward compatibility
- Log migration results

### API Surface
**Migration Function:**
```typescript
function migrateRecording(recording: Recording): Recording
```

**Migration Pipeline:**
```typescript
function migrateRecording(recording: Recording): Recording {
  let migrated = { ...recording };
  
  // Stage 1: Add defaults
  migrated = migrateRecordedVia(migrated);        // MIG-001: Add 'dom' default
  migrated = migrateLoopStartIndex(migrated);     // MIG-002: Add 0 default
  migrated = migrateGlobalDelayMs(migrated);      // MIG-003: Add 0 default
  migrated = migrateConditionalDefaults(migrated); // MIG-004: Add null defaults
  
  // Stage 2: Repair invalid values
  migrated = repairLoopStartIndex(migrated);
  migrated = repairGlobalDelayMs(migrated);
  migrated = repairConditionalDefaults(migrated);
  
  // Stage 3: Update schema version
  migrated.schemaVersion = 3;
  
  // Stage 4: Verify compatibility
  const report = verifyBackwardCompatibility(migrated);
  if (!report.compatible) {
    console.error('Migration failed:', report.errors);
  }
  
  return migrated;
}
```

**Individual Migrations:**
```typescript
// MIG-001: RecordedVia
function migrateRecordedVia(recording: Recording): Recording {
  if (!recording.steps) return recording;
  
  return {
    ...recording,
    steps: recording.steps.map(step => ({
      ...step,
      recordedVia: step.recordedVia || 'dom'
    }))
  };
}

// MIG-002: LoopStartIndex
function migrateLoopStartIndex(recording: Recording): Recording {
  return {
    ...recording,
    loopStartIndex: recording.loopStartIndex ?? 0
  };
}

// MIG-003: GlobalDelayMs
function migrateGlobalDelayMs(recording: Recording): Recording {
  return {
    ...recording,
    globalDelayMs: recording.globalDelayMs ?? 0
  };
}

// MIG-004: Conditional Defaults
function migrateConditionalDefaults(recording: Recording): Recording {
  if (!recording.steps) return recording;
  
  return {
    ...recording,
    steps: recording.steps.map(step => ({
      ...step,
      conditionalConfig: step.conditionalConfig || null,
      delaySeconds: step.delaySeconds ?? null
    }))
  };
}
```

### Special Cases
- **Nullish coalescing**: Uses `??` to preserve explicit 0 values
- **Step-level defaults**: Applies to each step in array
- **Schema version**: Updates from 1 → 3 (no v2 in production)
- **Compatibility verification**: Ensures old playback code still works

### Dependencies
- **Inbound**: IndexedDB load operations, Project Repository
- **Outbound**: Recording schema types

---

## 10. Verification Report

### Purpose
Documents comprehensive verification of all 40 component breakdowns against current codebase. Confirms accuracy, coverage, and currency of documentation.

### Location
- **Report File**: `analysis-resources/component-breakdowns/00_VERIFICATION_REPORT.md`

### Coverage Summary
**Total Components Verified:** 40 breakdowns (all current as of Dec 1, 2025)

**Core Content Scripts (3):**
- ✅ content-script-recorder → `src/contentScript/content.tsx` (recording functions)
- ✅ content-script-replayer → `src/contentScript/content.tsx` (playback functions) + `replay.ts`
- ✅ page-interceptor → `src/contentScript/page-interceptor.tsx`

**Background Infrastructure (4):**
- ✅ background-service-worker → `src/background/background.ts`
- ✅ message-router → Message handling in `background.ts`
- ✅ tab-manager → Tab management in `background.ts`
- ✅ injection-manager → Script injection in `background.ts`

**DOM Manipulation Utilities (6):**
- ✅ dom-element-finder → Functions in `content.tsx`
- ✅ dom-label-extraction → `getLabelForTarget()` in `content.tsx`
- ✅ xpath-computation → `getXPath()` in `content.tsx`
- ✅ iframe-handler → Iframe traversal in `content.tsx`
- ✅ shadow-dom-handler → Shadow DOM traversal in `content.tsx`
- ✅ notification-overlay → Notification functions in `content.tsx`

**Data Layer (4):**
- ✅ indexeddb-storage → `src/common/services/indexedDB.ts`
- ✅ project-repository → Dexie CRUD in `indexedDB.ts`
- ✅ test-run-repository → TestRun methods in `indexedDB.ts`
- ✅ chrome-storage-helper → `src/common/helpers/storageHelper.ts`

**UI Pages (4):**
- ✅ dashboard-ui → `src/pages/Dashboard.tsx` + components
- ✅ recorder-ui → `src/pages/Recorder.tsx` + components
- ✅ field-mapper-ui → `src/pages/FieldMapper.tsx` + components
- ✅ test-runner-ui → `src/pages/TestRunner.tsx` + components

**UI Components (3):**
- ✅ project-crud → Dashboard CRUD modals
- ✅ step-table-management → StepsTable component
- ✅ ui-design-system → shadcn/ui components library

**CSV & Testing (3):**
- ✅ csv-parser → PapaParse integration
- ✅ csv-position-mapping → Variable substitution
- ✅ field-mapping-engine → Auto-mapping algorithm

**Routing & State (3):**
- ✅ router-navigation → React Router configuration
- ✅ redux-state-management → Theme Redux slice
- ✅ test-logger → Logging system

**Vision Subsystem (4):**
- ✅ vision-engine → Tesseract.js OCR engine
- ✅ vision-content-handlers → Content script handlers
- ✅ vision-recording-ui → Vision UI components
- ✅ conditional-click-ui → Conditional click components

**Execution & Testing (3):**
- ✅ test-orchestrator → Test execution loop
- ✅ step-executor → Execution router
- ✅ step-capture-engine → Event transformation

**Infrastructure (3):**
- ✅ build-pipeline → Vite configuration
- ✅ schema-migration → Recording migration
- ✅ chrome-storage-helper → Storage wrapper

### Verification Status
- **Date Verified:** December 1, 2025
- **Source Files Analyzed:** 85 TypeScript files in `src/`
- **Accuracy:** All breakdowns reflect current implementation
- **Coverage:** Complete system documentation
- **Currency:** Up-to-date with latest codebase changes

---

## Integration Summary

### Complete Component Dependency Graph

**Recording Flow:**
```
Recorder UI
  → Tab Manager (open tab)
  → Injection Manager (inject scripts)
  → EventCapture (click/input events)
  → EventFilter (filter decisions)
  → Step Capture Engine (convert to steps)
  → XPath Computation (generate paths)
  → DOM Label Extraction (find labels)
  → Shadow DOM Handler (traverse shadows)
  → Iframe Handler (traverse iframes)
  → Step Table Management (display)
  → Project Repository (save)
```

**Playback Flow:**
```
Test Orchestrator
  → Tab Manager (open tab)
  → Step Executor (route execution)
  → DOM Element Finder (locate elements)
    → XPath (strategy 1)
    → ID/Name/Class (strategies 2-4)
    → Evidence Aggregator (last resort)
  → Vision Engine (Vision steps)
    → Vision Content Handlers (coordinate clicks)
  → Shadow DOM Handler (traverse shadows)
  → Iframe Handler (traverse iframes)
  → Test Logger (log results)
  → Test Run Repository (persist)
```

**Vision Recording Flow:**
```
Recorder UI
  → Vision fallback trigger
  → Vision Engine (screenshot + OCR)
  → Vision Recording UI (display badges)
  → Step Capture Engine (add vision metadata)
  → Project Repository (save with recordedVia: 'vision')
```

**Vision Playback Flow:**
```
Test Orchestrator
  → Step Executor (detect recordedVia: 'vision')
  → Vision Engine (conditionalClick or coordinate click)
  → Vision Content Handlers (VISION_CLICK message)
  → DOM (elementFromPoint + click)
```

### Technology Stack

**Frontend:**
- React 18 (UI framework)
- React Router v6 (navigation)
- Redux Toolkit (theme state)
- Tailwind CSS (styling)
- Radix UI (accessible primitives)
- react-beautiful-dnd (drag-drop)
- date-fns (date formatting)

**Backend/Logic:**
- TypeScript (type safety)
- Dexie.js (IndexedDB wrapper)
- Tesseract.js (OCR engine)
- PapaParse (CSV parsing)
- string-similarity (field mapping)

**Chrome APIs:**
- chrome.tabs (tab management)
- chrome.scripting (script injection)
- chrome.runtime (message passing)
- chrome.storage (persistence)

**Build Tools:**
- Vite (bundler)
- TypeScript compiler
- PostCSS (Tailwind processing)

---

## Project Statistics

- **Total Components Documented:** 40
- **Total Source Files:** 207 (.ts/.tsx/.js/.jsx)
- **Component Breakdown Files:** 40 markdown files
- **Rollup Documents:** 4 chunks + master files
- **Documentation Lines:** 3,600+ (across all rollups)
- **Architecture Depth:** 6 layers (UI → Router → Logic → Storage → Browser API → DOM)
