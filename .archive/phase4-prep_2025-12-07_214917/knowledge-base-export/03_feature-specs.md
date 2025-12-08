# FEATURE SPECIFICATIONS

## FEAT-001: Vision Engine

### Purpose
Enable recording and playback of canvas-based, shadow DOM, and inaccessible elements using OCR text recognition.

### TypeScript Interfaces

```typescript
interface VisionConfig {
  tesseractWorkerUrl: string;
  tesseractLanguage: 'eng' | 'spa' | 'fra' | 'deu';
  screenshotQuality: number; // 0.0-1.0
  devicePixelRatio: number;  // 1x or 2x
  ocrConfidenceThreshold: number; // 0-100
  fuzzyMatchThreshold: number; // 0.0-1.0
}

interface TextResult {
  text: string;
  confidence: number;
  bbox: { x: number; y: number; width: number; height: number };
}

interface ClickTarget {
  x: number;
  y: number;
  text: string;
  confidence: number;
}
```

### Core Functions

```typescript
class VisionService {
  private worker: Tesseract.Worker;
  
  async initialize(): Promise<void> {
    this.worker = await createWorker('eng');
  }
  
  async captureScreenshot(): Promise<string> {
    const canvas = await html2canvas(document.body, { 
      scale: 2,  // 2x DPR for clarity
      logging: false 
    });
    return canvas.toDataURL('image/png');
  }
  
  async extractText(imageData: string): Promise<TextResult[]> {
    const { data } = await this.worker.recognize(imageData);
    return data.words.map(word => ({
      text: word.text,
      confidence: word.confidence,
      bbox: word.bbox
    }));
  }
  
  async click(targetText: string): Promise<ClickTarget | null> {
    const screenshot = await this.captureScreenshot();
    const results = await this.extractText(screenshot);
    
    const match = results.find(r => 
      this.fuzzyMatch(r.text, targetText) && r.confidence > 60
    );
    
    if (match) {
      const centerX = match.bbox.x + match.bbox.width / 2;
      const centerY = match.bbox.y + match.bbox.height / 2;
      
      document.elementFromPoint(centerX, centerY)?.click();
      
      return { x: centerX, y: centerY, text: match.text, confidence: match.confidence };
    }
    
    return null;
  }
  
  async type(targetText: string, inputValue: string): Promise<boolean> {
    const target = await this.click(targetText);
    if (!target) return false;
    
    const element = document.elementFromPoint(target.x, target.y) as HTMLInputElement;
    if (element) {
      element.value = inputValue;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }
    return false;
  }
  
  private fuzzyMatch(text1: string, text2: string): boolean {
    const normalize = (s: string) => s.toLowerCase().trim();
    return normalize(text1).includes(normalize(text2)) || 
           normalize(text2).includes(normalize(text1));
  }
}
```

### Acceptance Criteria

- [ ] Tesseract.js worker initializes without errors
- [ ] Screenshots captured at 2x device pixel ratio
- [ ] OCR extracts text with >95% accuracy for Latin characters
- [ ] Vision click finds elements within 2000ms
- [ ] Vision type finds and fills inputs within 2500ms
- [ ] Fuzzy matching handles case insensitivity and whitespace
- [ ] Vision badge displays in UI for vision-recorded steps
- [ ] Vision steps execute successfully during playback

---

## FEAT-002: Time Delay

### Purpose
Add configurable delays between steps to handle slow page loads, animations, and network latency.

### TypeScript Interfaces

```typescript
interface TimeDelayConfig {
  globalDelay: number;  // 0-10000ms, applied to all steps
  perStepDelays: Map<number, number>;  // stepNumber → delay override
}

interface RecordedStepWithDelay extends RecordedStep {
  delay?: number;  // Per-step override (optional)
}
```

### Implementation

```typescript
class DelayManager {
  private config: TimeDelayConfig;
  
  constructor(globalDelay: number = 0) {
    this.config = {
      globalDelay,
      perStepDelays: new Map()
    };
  }
  
  setGlobalDelay(ms: number): void {
    if (ms < 0 || ms > 10000) {
      throw new Error('Global delay must be 0-10000ms');
    }
    this.config.globalDelay = ms;
  }
  
  setStepDelay(stepNumber: number, ms: number): void {
    if (ms < 0 || ms > 10000) {
      throw new Error('Step delay must be 0-10000ms');
    }
    this.config.perStepDelays.set(stepNumber, ms);
  }
  
  getDelayForStep(step: RecordedStepWithDelay): number {
    // Per-step delay overrides global delay
    if (step.delay !== undefined) {
      return step.delay;
    }
    
    const override = this.config.perStepDelays.get(step.stepNumber);
    if (override !== undefined) {
      return override;
    }
    
    return this.config.globalDelay;
  }
  
  async applyDelay(step: RecordedStepWithDelay): Promise<void> {
    const delay = this.getDelayForStep(step);
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Usage in playback
async function executeStepWithDelay(step: RecordedStepWithDelay, delayManager: DelayManager) {
  // Execute the action
  await executeAction(step);
  
  // Apply delay AFTER action
  await delayManager.applyDelay(step);
}
```

### Acceptance Criteria

- [ ] Global delay UI shows slider (0-10000ms)
- [ ] Global delay applies to all steps by default
- [ ] Per-step delay override editable in step editor
- [ ] Per-step delay overrides global delay when set
- [ ] Delay executes AFTER action completes
- [ ] Delay displays in step list (e.g., "2000ms delay")
- [ ] Delay persists when saving/loading recordings

---

## FEAT-003: CSV Loop

### Purpose
Enable data-driven testing by looping through CSV rows and substituting variables.

### TypeScript Interfaces

```typescript
interface CSVLoopConfig {
  csvData: string[][];  // Parsed CSV rows
  columnMapping: Map<string, string>;  // CSV column → variable name
  loopStartStep: number;  // Step number to loop back to
  currentIteration: number;
  totalIterations: number;
}

interface RecordingWithLoop extends Recording {
  csvLoop?: CSVLoopConfig;
}
```

### Implementation

```typescript
class CSVLoopManager {
  private config: CSVLoopConfig | null = null;
  
  loadCSV(fileContent: string): void {
    const lines = fileContent.split('\n').map(line => line.split(','));
    const headers = lines[0];
    const rows = lines.slice(1).filter(row => row.length === headers.length);
    
    this.config = {
      csvData: rows,
      columnMapping: new Map(),
      loopStartStep: 1,
      currentIteration: 0,
      totalIterations: rows.length
    };
  }
  
  mapColumn(csvColumn: string, variableName: string): void {
    if (!this.config) throw new Error('CSV not loaded');
    this.config.columnMapping.set(csvColumn, variableName);
  }
  
  setLoopStart(stepNumber: number): void {
    if (!this.config) throw new Error('CSV not loaded');
    this.config.loopStartStep = stepNumber;
  }
  
  getCurrentValues(): Map<string, string> {
    if (!this.config) return new Map();
    
    const values = new Map<string, string>();
    const row = this.config.csvData[this.config.currentIteration];
    
    this.config.columnMapping.forEach((variableName, csvColumn) => {
      const columnIndex = this.getColumnIndex(csvColumn);
      values.set(variableName, row[columnIndex]);
    });
    
    return values;
  }
  
  substituteVariables(text: string, values: Map<string, string>): string {
    let result = text;
    values.forEach((value, variableName) => {
      result = result.replace(new RegExp(`{{${variableName}}}`, 'g'), value);
    });
    return result;
  }
  
  incrementIteration(): boolean {
    if (!this.config) return false;
    this.config.currentIteration++;
    return this.config.currentIteration < this.config.totalIterations;
  }
  
  private getColumnIndex(columnName: string): number {
    // Assume first row has headers
    return 0; // Simplified
  }
}

// Usage in playback
async function executeWithLoop(recording: RecordingWithLoop) {
  const loopManager = new CSVLoopManager();
  if (recording.csvLoop) {
    loopManager.loadCSV(recording.csvLoop.csvData);
  }
  
  do {
    const values = loopManager.getCurrentValues();
    
    for (let i = 0; i < recording.steps.length; i++) {
      const step = recording.steps[i];
      
      // Substitute variables in step value
      if (step.value) {
        step.value = loopManager.substituteVariables(step.value, values);
      }
      
      await executeStep(step);
      
      // Check if this is loop end
      if (i === recording.steps.length - 1 && recording.csvLoop) {
        if (!loopManager.incrementIteration()) break;
        i = recording.csvLoop.loopStartStep - 1; // Jump back
      }
    }
  } while (false);
}
```

### Acceptance Criteria

- [ ] CSV file upload UI accepts .csv files
- [ ] CSV parser handles quoted values and commas in data
- [ ] Column mapping UI shows dropdown for each CSV column
- [ ] Loop start marker displays in step list
- [ ] Variable substitution {{varName}} works in type/click actions
- [ ] Playback loops through all CSV rows
- [ ] UI shows current iteration (e.g., "Row 2 of 5")
- [ ] Loop completes after last row

---

## FEAT-004: Conditional Click

### Purpose
Wait for elements to appear before clicking, with configurable timeout and polling.

### TypeScript Interfaces

```typescript
interface ConditionalConfig {
  enabled: boolean;
  targetText: string;
  maxWaitMs: number;  // Default 30000
  pollIntervalMs: number;  // Default 500
}

interface ConditionalClickResult {
  success: boolean;
  attempts: number;
  totalWaitMs: number;
  clickTarget?: ClickTarget;
  error?: string;
}
```

### Implementation

```typescript
class ConditionalClickService {
  private visionService: VisionService;
  
  constructor(visionService: VisionService) {
    this.visionService = visionService;
  }
  
  async waitAndClick(config: ConditionalConfig): Promise<ConditionalClickResult> {
    const startTime = Date.now();
    let attempts = 0;
    
    while (Date.now() - startTime < config.maxWaitMs) {
      attempts++;
      
      try {
        const target = await this.visionService.click(config.targetText);
        
        if (target) {
          return {
            success: true,
            attempts,
            totalWaitMs: Date.now() - startTime,
            clickTarget: target
          };
        }
      } catch (error) {
        console.warn(`Conditional click attempt ${attempts} failed:`, error);
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, config.pollIntervalMs));
    }
    
    return {
      success: false,
      attempts,
      totalWaitMs: Date.now() - startTime,
      error: `Element with text "${config.targetText}" not found after ${config.maxWaitMs}ms`
    };
  }
}

// Usage in step execution
async function executeConditionalStep(step: RecordedStep, config: ConditionalConfig) {
  const service = new ConditionalClickService(visionService);
  const result = await service.waitAndClick(config);
  
  if (!result.success) {
    throw new Error(result.error);
  }
  
  console.log(`Conditional click succeeded after ${result.attempts} attempts (${result.totalWaitMs}ms)`);
}
```

### Acceptance Criteria

- [ ] Conditional click UI shows text input and timeout slider
- [ ] Polling executes every 500ms by default
- [ ] Timeout defaults to 30 seconds
- [ ] Vision service captures screenshot on each poll
- [ ] OCR searches for target text in each screenshot
- [ ] Click executes when text found
- [ ] Timeout error thrown when max wait exceeded
- [ ] UI shows progress (e.g., "Waiting... 5s elapsed")

---

## FEAT-005: CDP Integration (Phase 2)

### Purpose
Add Chrome DevTools Protocol support for Playwright-style semantic locators (getByRole, getByText, etc.).

### TypeScript Interfaces

```typescript
interface CDPService {
  tabId: number;
  attached: boolean;
  
  attach(): Promise<void>;
  detach(): Promise<void>;
  sendCommand<T>(method: string, params?: object): Promise<T>;
}

interface PlaywrightLocators {
  getByRole(role: string, options?: { name?: string; exact?: boolean }): Promise<Element | null>;
  getByText(text: string, options?: { exact?: boolean }): Promise<Element | null>;
  getByLabel(text: string, options?: { exact?: boolean }): Promise<Element | null>;
  getByPlaceholder(text: string, options?: { exact?: boolean }): Promise<Element | null>;
  getByTestId(testId: string): Promise<Element | null>;
}

interface AutoWaitingOptions {
  timeout?: number;  // Default 30000ms
  visible?: boolean;  // Default true
  enabled?: boolean;  // Default true
  stable?: boolean;   // Default true (wait for position to stabilize)
}
```

### CDPService Implementation

```typescript
class CDPServiceImpl implements CDPService {
  tabId: number;
  attached: boolean = false;
  
  constructor(tabId: number) {
    this.tabId = tabId;
  }
  
  async attach(): Promise<void> {
    if (this.attached) return;
    
    await chrome.debugger.attach({ tabId: this.tabId }, '1.3');
    this.attached = true;
    
    // Enable required domains
    await this.sendCommand('DOM.enable');
    await this.sendCommand('Accessibility.enable');
    await this.sendCommand('Runtime.enable');
  }
  
  async detach(): Promise<void> {
    if (!this.attached) return;
    
    await chrome.debugger.detach({ tabId: this.tabId });
    this.attached = false;
  }
  
  async sendCommand<T>(method: string, params?: object): Promise<T> {
    if (!this.attached) {
      throw new Error('CDP not attached. Call attach() first.');
    }
    
    return new Promise((resolve, reject) => {
      chrome.debugger.sendCommand({ tabId: this.tabId }, method, params, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result as T);
        }
      });
    });
  }
}
```

### PlaywrightLocators Implementation

```typescript
class PlaywrightLocatorsImpl implements PlaywrightLocators {
  private cdp: CDPService;
  
  constructor(cdp: CDPService) {
    this.cdp = cdp;
  }
  
  async getByRole(role: string, options: { name?: string } = {}): Promise<Element | null> {
    // Get accessibility tree
    const { nodes } = await this.cdp.sendCommand('Accessibility.getFullAXTree');
    
    // Filter by role
    let candidates = nodes.filter(node => node.role?.value === role);
    
    // Filter by name if provided
    if (options.name) {
      candidates = candidates.filter(node => 
        node.name?.value?.toLowerCase().includes(options.name!.toLowerCase())
      );
    }
    
    if (candidates.length === 0) return null;
    
    // Get DOM node for first candidate
    const axNode = candidates[0];
    const { nodeId } = await this.cdp.sendCommand('DOM.getNodeForBackendNodeId', {
      backendNodeId: axNode.backendDOMNodeId
    });
    
    // Resolve to JS object
    const { object } = await this.cdp.sendCommand('DOM.resolveNode', { nodeId });
    
    return object as unknown as Element;
  }
  
  async getByText(text: string, options: { exact?: boolean } = {}): Promise<Element | null> {
    // Execute JS to find element by text
    const script = `
      Array.from(document.querySelectorAll('*')).find(el => {
        const text = el.textContent?.trim();
        return ${options.exact ? 'text === "' + text + '"' : 'text?.includes("' + text + '")'}; 
      });
    `;
    
    const { result } = await this.cdp.sendCommand('Runtime.evaluate', { expression: script });
    
    return result.objectId ? result as unknown as Element : null;
  }
  
  async getByLabel(text: string): Promise<Element | null> {
    const script = `
      const label = Array.from(document.querySelectorAll('label')).find(l => 
        l.textContent?.toLowerCase().includes("${text.toLowerCase()}")
      );
      label ? document.getElementById(label.getAttribute('for')) : null;
    `;
    
    const { result } = await this.cdp.sendCommand('Runtime.evaluate', { expression: script });
    return result.objectId ? result as unknown as Element : null;
  }
  
  async getByPlaceholder(text: string): Promise<Element | null> {
    const script = `
      document.querySelector('[placeholder*="${text}" i]');
    `;
    
    const { result } = await this.cdp.sendCommand('Runtime.evaluate', { expression: script });
    return result.objectId ? result as unknown as Element : null;
  }
  
  async getByTestId(testId: string): Promise<Element | null> {
    const script = `
      document.querySelector('[data-testid="${testId}"]');
    `;
    
    const { result } = await this.cdp.sendCommand('Runtime.evaluate', { expression: script });
    return result.objectId ? result as unknown as Element : null;
  }
}
```

### Auto-Waiting Service

```typescript
class AutoWaitingService {
  private cdp: CDPService;
  
  async waitFor(element: Element, options: AutoWaitingOptions = {}): Promise<boolean> {
    const timeout = options.timeout ?? 30000;
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (options.visible && !this.isVisible(element)) {
        await this.sleep(100);
        continue;
      }
      
      if (options.enabled && !this.isEnabled(element)) {
        await this.sleep(100);
        continue;
      }
      
      if (options.stable && !await this.isStable(element)) {
        await this.sleep(100);
        continue;
      }
      
      return true;
    }
    
    return false;
  }
  
  private isVisible(element: Element): boolean {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && 
           window.getComputedStyle(element).visibility !== 'hidden';
  }
  
  private isEnabled(element: Element): boolean {
    return !(element as HTMLButtonElement).disabled;
  }
  
  private async isStable(element: Element): Promise<boolean> {
    const rect1 = element.getBoundingClientRect();
    await this.sleep(100);
    const rect2 = element.getBoundingClientRect();
    
    return rect1.top === rect2.top && rect1.left === rect2.left;
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### Manifest Updates

```json
{
  "manifest_version": 3,
  "permissions": [
    "debugger",
    "activeTab",
    "tabs"
  ],
  "host_permissions": [
    "<all_urls>"
  ]
}
```

### Acceptance Criteria

- [ ] chrome.debugger.attach() succeeds for target tab
- [ ] DOM, Accessibility, Runtime domains enabled
- [ ] getByRole finds buttons, links, inputs by role
- [ ] getByText finds elements containing text (case-insensitive)
- [ ] getByLabel finds inputs associated with labels
- [ ] getByPlaceholder finds inputs by placeholder text
- [ ] getByTestId finds elements with data-testid attribute
- [ ] Auto-waiting waits for visible, enabled, stable states
- [ ] chrome.debugger.detach() cleans up on stop/close
- [ ] CDP commands timeout after 30s with error
