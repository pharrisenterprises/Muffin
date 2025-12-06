# DETAILED FEATURE SPECIFICATIONS

## Feature Index

| ID | Feature | Priority | Status |
|----|---------|----------|--------|
| FEAT-001 | Recording Orchestrator | P0 | NEW |
| FEAT-002 | DOM Event Layer (Layer A) | P0 | FIX |
| FEAT-003 | Vision Layer (Layer B) | P0 | ENHANCE |
| FEAT-004 | Mouse Tracking Layer (Layer C) | P1 | NEW |
| FEAT-005 | Network Interception Layer (Layer D) | P1 | NEW |
| FEAT-006 | Decision Engine | P0 | NEW |
| FEAT-007 | Evidence Buffer | P0 | NEW |
| FEAT-008 | Save as Approved | P1 | NEW |
| FEAT-009 | Enhanced Add Variable | P2 | ENHANCE |
| FEAT-010 | Element Picker Overlay | P2 | NEW |
| FEAT-011 | Multi-Strategy Playback | P0 | ENHANCE |
| FEAT-012 | Vision Verification | P2 | NEW |

---

## FEAT-001: Recording Orchestrator

### Purpose
Central coordinator that manages all recording layers, handles lifecycle events, and routes captured data to the Decision Engine.

### Responsibilities
1. Initialize all layers on recording start
2. Monitor layer health and handle failures
3. Coordinate evidence capture timing
4. Route user actions to appropriate handlers
5. Trigger Decision Engine for step creation
6. Clean shutdown on recording stop

### Interface

```typescript
interface RecordingOrchestrator {
  // Lifecycle
  startRecording(config: RecordingConfig): Promise<void>;
  stopRecording(): Promise<Recording>;
  pauseRecording(): void;
  resumeRecording(): void;
  
  // Layer Management
  getLayerStatus(): LayerStatusMap;
  restartLayer(layerId: LayerType): Promise<void>;
  
  // Event Handling
  onUserAction(action: UserAction): Promise<void>;
  
  // State
  isRecording: boolean;
  currentRecording: Recording | null;
}

interface RecordingConfig {
  processName: string;
  captureScreenshots: boolean;  // Always true for V2
  trackMouse: boolean;          // Always true for V2
  interceptNetwork: boolean;    // Always true for V2
  screenshotInterval: number;   // Default: 500ms
}

interface LayerStatusMap {
  dom: LayerStatus;
  vision: LayerStatus;
  mouse: LayerStatus;
  network: LayerStatus;
}

interface LayerStatus {
  active: boolean;
  healthy: boolean;
  lastActivity: number;
  errorCount: number;
}

type LayerType = 'dom' | 'vision' | 'mouse' | 'network';
```

### State Machine

```
                    ┌─────────────┐
                    │    IDLE     │
                    └──────┬──────┘
                           │ startRecording()
                           ▼
                    ┌─────────────┐
          ┌─────────│ INITIALIZING│
          │         └──────┬──────┘
          │                │ all layers ready
          │                ▼
          │         ┌─────────────┐
          │    ┌────│  RECORDING  │◄────┐
          │    │    └──────┬──────┘     │
          │    │           │            │
          │    │ pause()   │ resume()   │
          │    │           ▼            │
          │    │    ┌─────────────┐     │
          │    └───►│   PAUSED    │─────┘
          │         └─────────────┘
          │                │
          │ error          │ stopRecording()
          ▼                ▼
   ┌─────────────┐  ┌─────────────┐
   │    ERROR    │  │  FINALIZING │
   └─────────────┘  └──────┬──────┘
                           │ cleanup complete
                           ▼
                    ┌─────────────┐
                    │    IDLE     │
                    └─────────────┘
```

### Message Flow

```
Background Script                    Content Script
      │                                    │
      │◄── START_RECORDING ───────────────│
      │                                    │
      ├── INIT_LAYER_A (DOM) ────────────►│
      ├── INIT_LAYER_B (Vision) ─────────►│
      ├── INIT_LAYER_C (Mouse) ──────────►│
      ├── INIT_LAYER_D (Network) ────────►│
      │                                    │
      │◄── LAYERS_READY ──────────────────│
      │                                    │
      │◄── USER_ACTION (click) ───────────│
      │                                    │
      ├── CAPTURE_EVIDENCE ──────────────►│
      │                                    │
      │◄── EVIDENCE_BUNDLE ───────────────│
      │                                    │
      ├── [Decision Engine processes]      │
      │                                    │
      ├── STEP_CREATED ──────────────────►│
      │                                    │
      │◄── STOP_RECORDING ────────────────│
      │                                    │
      ├── SHUTDOWN_LAYERS ───────────────►│
      │                                    │
      │◄── LAYERS_STOPPED ────────────────│
      │                                    │
      └── RECORDING_COMPLETE ────────────►│
```

### Error Handling

| Error Scenario | Response |
|----------------|----------|
| Layer fails to initialize | Log error, continue with remaining layers |
| Layer crashes during recording | Mark layer unhealthy, continue recording |
| All layers fail | Pause recording, notify user |
| Evidence capture timeout | Use available evidence, flag low confidence |

---

## FEAT-002: DOM Event Layer (Layer A)

### Purpose
Capture DOM events (click, input, keydown) with full element context including selectors, XPath, and element properties.

### Current Issues to Fix
1. START_RECORDING message not reaching content script
2. Event listeners not attaching reliably
3. No confirmation of listener attachment

### Interface

```typescript
interface DOMEventLayer {
  // Lifecycle
  initialize(): Promise<void>;
  shutdown(): void;
  
  // Status
  isActive: boolean;
  listenerCount: number;
  
  // Event Callbacks
  onCapture: (data: DOMCaptureData) => void;
}

interface DOMCaptureData {
  type: 'click' | 'input' | 'keydown' | 'change';
  timestamp: number;
  element: ElementBundle;
  value?: string;          // For input events
  key?: string;            // For keydown events
  coordinates: {
    viewport: { x: number; y: number };
    page: { x: number; y: number };
  };
}

interface ElementBundle {
  // Identification
  id: string | null;
  tagName: string;
  className: string;
  name: string | null;
  
  // Selectors
  xpath: string;
  cssSelector: string;
  dataAttributes: Record<string, string>;
  
  // Content
  textContent: string;
  innerText: string;
  ariaLabel: string | null;
  placeholder: string | null;
  
  // Position
  boundingRect: DOMRect;
  
  // Hierarchy
  parentInfo: {
    tagName: string;
    id: string | null;
    className: string;
  };
}
```

### Event Capture Flow

```
Document Event Listener
        │
        │ click/input/keydown
        ▼
┌───────────────────────────────────────┐
│  Filter: Is this a recordable event?  │
│  ├── Ignore extension UI events       │
│  ├── Ignore hidden elements           │
│  └── Ignore duplicate events (100ms)  │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│  Extract Element Bundle               │
│  ├── Get all identifiers              │
│  ├── Generate XPath                   │
│  ├── Generate CSS selector            │
│  ├── Capture text content             │
│  └── Get bounding rect                │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│  Build DOMCaptureData                 │
│  └── Send to Orchestrator             │
└───────────────────────────────────────┘
```

### XPath Generation Rules

```typescript
function generateXPath(element: Element): string {
  // Priority order:
  // 1. ID-based (if unique and stable)
  if (element.id && !isDynamicId(element.id)) {
    return `//*[@id="${element.id}"]`;
  }
  
  // 2. Data attribute based
  const dataAttr = findStableDataAttribute(element);
  if (dataAttr) {
    return `//*[@${dataAttr.name}="${dataAttr.value}"]`;
  }
  
  // 3. Aria label based
  if (element.ariaLabel) {
    return `//*[@aria-label="${element.ariaLabel}"]`;
  }
  
  // 4. Text content based (for buttons/links)
  if (isClickableWithText(element)) {
    return `//${element.tagName.toLowerCase()}[contains(text(),"${truncate(element.textContent, 30)}")]`;
  }
  
  // 5. Full path (fallback)
  return buildFullPath(element);
}

function isDynamicId(id: string): boolean {
  // Detect patterns like: "ember123", "react-uid-456", ":r0:"
  return /[\d]{3,}|^:r\d+:|ember\d+|uid[-_]\d+/i.test(id);
}
```

---

## FEAT-003: Vision Layer (Layer B)

### Purpose
Continuous visual capture with OCR for text-based element targeting and verification.

### Modes of Operation

| Mode | Trigger | Frequency | Purpose |
|------|---------|-----------|---------|
| Interval | Timer | Every 500ms | Background state tracking |
| On-Demand | User action | Immediate | Capture at action moment |
| Region | Decision Engine | As needed | OCR specific area |

### Interface

```typescript
interface VisionLayer {
  // Lifecycle
  initialize(): Promise<void>;
  shutdown(): void;
  
  // Capture
  captureScreenshot(): Promise<Screenshot>;
  captureRegion(rect: DOMRect): Promise<Screenshot>;
  
  // OCR
  runOCR(screenshot: Screenshot): Promise<OCRResult>;
  runRegionOCR(screenshot: Screenshot, rect: DOMRect): Promise<OCRResult>;
  
  // Search
  findText(text: string): Promise<TextLocation[]>;
  
  // Configuration
  setInterval(ms: number): void;
  
  // Callbacks
  onScreenshotCaptured: (screenshot: Screenshot) => void;
}

interface Screenshot {
  id: string;
  timestamp: number;
  dataUrl: string;           // Base64 image
  dimensions: { width: number; height: number };
  viewport: { scrollX: number; scrollY: number };
}

interface OCRResult {
  screenshotId: string;
  timestamp: number;
  fullText: string;
  blocks: TextBlock[];
}

interface TextBlock {
  text: string;
  confidence: number;        // 0-100
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface TextLocation {
  text: string;
  confidence: number;
  coordinates: { x: number; y: number };  // Center point
  boundingBox: DOMRect;
}
```

### Screenshot Interval Logic

```typescript
class VisionLayer {
  private intervalId: number | null = null;
  private lastCapture: number = 0;
  private minInterval = 500;  // ms
  
  startIntervalCapture() {
    this.intervalId = setInterval(async () => {
      const screenshot = await this.captureScreenshot();
      await this.evidenceBuffer.store({
        type: 'screenshot',
        data: screenshot,
        usedInFinal: false  // Mark as unused initially
      });
    }, this.minInterval);
  }
  
  async captureOnAction(): Promise<Screenshot> {
    // Capture immediately, skip if too recent
    const now = Date.now();
    if (now - this.lastCapture < 100) {
      return this.getLastScreenshot();
    }
    
    const screenshot = await this.captureScreenshot();
    this.lastCapture = now;
    
    // This one is action-related, more likely to be used
    await this.evidenceBuffer.store({
      type: 'screenshot',
      data: screenshot,
      actionRelated: true,
      usedInFinal: false
    });
    
    return screenshot;
  }
}
```

### OCR Integration

```typescript
// Using Tesseract.js
import Tesseract from 'tesseract.js';

class OCREngine {
  private worker: Tesseract.Worker | null = null;
  
  async initialize() {
    this.worker = await Tesseract.createWorker('eng');
  }
  
  async recognize(imageData: string): Promise<OCRResult> {
    if (!this.worker) throw new Error('OCR not initialized');
    
    const result = await this.worker.recognize(imageData);
    
    return {
      fullText: result.data.text,
      blocks: result.data.words.map(word => ({
        text: word.text,
        confidence: word.confidence,
        boundingBox: {
          x: word.bbox.x0,
          y: word.bbox.y0,
          width: word.bbox.x1 - word.bbox.x0,
          height: word.bbox.y1 - word.bbox.y0
        }
      }))
    };
  }
  
  async findText(screenshot: Screenshot, searchText: string): Promise<TextLocation[]> {
    const ocr = await this.recognize(screenshot.dataUrl);
    
    const matches = ocr.blocks.filter(block => 
      block.text.toLowerCase().includes(searchText.toLowerCase())
    );
    
    return matches.map(match => ({
      text: match.text,
      confidence: match.confidence,
      coordinates: {
        x: match.boundingBox.x + match.boundingBox.width / 2,
        y: match.boundingBox.y + match.boundingBox.height / 2
      },
      boundingBox: match.boundingBox
    }));
  }
}
```

---

## FEAT-004: Mouse Tracking Layer (Layer C)

### Purpose
Track mouse movements for evidence correlation and coordinate-based targeting.

### Capture Strategy

```
CONTINUOUS (Low Priority)              EVENT-RELATED (High Priority)
┌─────────────────────────┐           ┌─────────────────────────┐
│ Sample every 100ms      │           │ 1 second before click   │
│ Store in rolling buffer │           │ Click coordinates       │
│ Max 1000 points         │           │ Hover dwell time        │
│ Discard on save         │           │ May be used for step    │
└─────────────────────────┘           └─────────────────────────┘
```

### Interface

```typescript
interface MouseTrackingLayer {
  // Lifecycle
  initialize(): Promise<void>;
  shutdown(): void;
  
  // Tracking
  getCurrentPosition(): MousePosition;
  getRecentTrail(durationMs: number): MousePosition[];
  getHoverDwell(element: Element): number;  // ms
  
  // Callbacks
  onMouseDown: (data: MouseEventData) => void;
  onMouseUp: (data: MouseEventData) => void;
}

interface MousePosition {
  timestamp: number;
  viewport: { x: number; y: number };
  page: { x: number; y: number };
  target?: {
    tagName: string;
    id: string | null;
    className: string;
  };
}

interface MouseEventData {
  type: 'mousedown' | 'mouseup' | 'click';
  position: MousePosition;
  button: number;  // 0=left, 1=middle, 2=right
  trail: MousePosition[];  // Recent movement path
  dwellTime: number;       // Time hovering before click
}
```

### Rolling Buffer Implementation

```typescript
class MouseTracker {
  private buffer: MousePosition[] = [];
  private maxSize = 1000;
  private sampleInterval = 100;  // ms
  private lastSample = 0;
  
  constructor() {
    document.addEventListener('mousemove', this.handleMove.bind(this));
    document.addEventListener('mousedown', this.handleDown.bind(this));
  }
  
  private handleMove(event: MouseEvent) {
    const now = Date.now();
    if (now - this.lastSample < this.sampleInterval) return;
    
    this.lastSample = now;
    this.buffer.push({
      timestamp: now,
      viewport: { x: event.clientX, y: event.clientY },
      page: { x: event.pageX, y: event.pageY },
      target: this.getTargetInfo(event.target as Element)
    });
    
    // Keep buffer size limited
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }
  
  getRecentTrail(durationMs: number): MousePosition[] {
    const cutoff = Date.now() - durationMs;
    return this.buffer.filter(p => p.timestamp >= cutoff);
  }
  
  calculateDwellTime(clickPosition: MousePosition): number {
    // Find how long mouse was near this position before clicking
    const threshold = 20;  // pixels
    let dwellStart = clickPosition.timestamp;
    
    for (let i = this.buffer.length - 1; i >= 0; i--) {
      const p = this.buffer[i];
      const distance = Math.hypot(
        p.viewport.x - clickPosition.viewport.x,
        p.viewport.y - clickPosition.viewport.y
      );
      
      if (distance > threshold) break;
      dwellStart = p.timestamp;
    }
    
    return clickPosition.timestamp - dwellStart;
  }
}
```

---

## FEAT-005: Network Interception Layer (Layer D)

### Purpose
Intercept network requests to correlate user actions with API calls.

### Scope

| Intercept | Purpose |
|-----------|---------|
| fetch() calls | Modern API requests |
| XMLHttpRequest | Legacy API requests |
| GraphQL mutations | State-changing operations |

### Interface

```typescript
interface NetworkInterceptionLayer {
  // Lifecycle
  initialize(): Promise<void>;
  shutdown(): void;
  
  // Query
  getRecentRequests(durationMs: number): NetworkRequest[];
  getRequestsAfter(timestamp: number): NetworkRequest[];
  findCorrelatedRequest(action: UserAction): NetworkRequest | null;
  
  // Callbacks
  onRequest: (request: NetworkRequest) => void;
}

interface NetworkRequest {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  type: 'fetch' | 'xhr' | 'graphql';
  
  // GraphQL specific
  graphql?: {
    operationType: 'query' | 'mutation' | 'subscription';
    operationName: string;
    variables: Record<string, any>;
  };
  
  // Response (when available)
  response?: {
    status: number;
    statusText: string;
    duration: number;
  };
  
  // Correlation
  correlatedActionId?: string;
}
```

### Interception Implementation

```typescript
class NetworkInterceptor {
  private requests: NetworkRequest[] = [];
  private maxRequests = 500;
  
  initialize() {
    this.interceptFetch();
    this.interceptXHR();
  }
  
  private interceptFetch() {
    const originalFetch = window.fetch;
    
    window.fetch = async (input, init) => {
      const request = this.buildRequest(input, init, 'fetch');
      this.requests.push(request);
      
      const startTime = Date.now();
      try {
        const response = await originalFetch(input, init);
        request.response = {
          status: response.status,
          statusText: response.statusText,
          duration: Date.now() - startTime
        };
        return response;
      } catch (error) {
        request.response = { status: 0, statusText: 'Error', duration: Date.now() - startTime };
        throw error;
      }
    };
  }
  
  private buildRequest(input: RequestInfo | URL, init: RequestInit | undefined, type: 'fetch' | 'xhr'): NetworkRequest {
    const url = typeof input === 'string' ? input : input.toString();
    const method = init?.method || 'GET';
    const body = init?.body;
    
    const request: NetworkRequest = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      method,
      url,
      type
    };
    
    // Detect GraphQL
    if (body && (url.includes('graphql') || url.includes('/api'))) {
      try {
        const parsed = JSON.parse(body as string);
        if (parsed.query) {
          request.type = 'graphql';
          request.graphql = {
            operationType: this.detectOperationType(parsed.query),
            operationName: parsed.operationName || 'anonymous',
            variables: parsed.variables || {}
          };
        }
      } catch {}
    }
    
    return request;
  }
  
  findCorrelatedRequest(action: UserAction): NetworkRequest | null {
    // Find requests within 500ms after the action
    const windowStart = action.timestamp;
    const windowEnd = action.timestamp + 500;
    
    const candidates = this.requests.filter(r => 
      r.timestamp >= windowStart && 
      r.timestamp <= windowEnd &&
      r.type === 'graphql' &&
      r.graphql?.operationType === 'mutation'
    );
    
    // Return the first mutation (most likely related)
    return candidates[0] || null;
  }
}
```

---

## FEAT-006: Decision Engine

### Purpose
Analyze evidence from all layers and select the optimal recording/playback strategy.

### Scoring Algorithm

```typescript
interface DecisionEngine {
  // Main decision method
  evaluateEvidence(evidence: EvidenceBundle): DecisionResult;
  
  // Scoring
  scoreDOMEvidence(dom: DOMCaptureData): StrategyScore;
  scoreVisionEvidence(vision: OCRResult, target: string): StrategyScore;
  scoreCoordinates(coords: MousePosition): StrategyScore;
  scoreNetworkCorrelation(request: NetworkRequest | null): StrategyScore;
  
  // Verification
  verifyStrategy(strategy: Strategy, screenshot: Screenshot): Promise<boolean>;
}

interface EvidenceBundle {
  dom: DOMCaptureData | null;
  vision: {
    screenshot: Screenshot;
    ocr: OCRResult;
  };
  mouse: MouseEventData;
  network: NetworkRequest | null;
  timestamp: number;
}

interface StrategyScore {
  strategy: StrategyType;
  score: number;           // 0-100
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  data: any;               // Strategy-specific data
}

interface DecisionResult {
  selectedStrategy: Strategy;
  confidence: number;
  fallbackChain: Strategy[];
  reasoning: string;
  verified: boolean;
  evidenceUsed: string[];  // IDs of evidence items used
}

type StrategyType = 'dom-id' | 'dom-selector' | 'dom-xpath' | 'vision-text' | 'coordinates' | 'network';
```

### Scoring Rules

```typescript
class DecisionEngine {
  scoreDOMEvidence(dom: DOMCaptureData | null): StrategyScore {
    if (!dom) {
      return { strategy: 'dom-id', score: 0, confidence: 'low', reasoning: 'No DOM data', data: null };
    }
    
    const element = dom.element;
    
    // Best case: Stable ID
    if (element.id && !this.isDynamicId(element.id)) {
      return {
        strategy: 'dom-id',
        score: 95,
        confidence: 'high',
        reasoning: `Stable ID found: ${element.id}`,
        data: { selector: `#${element.id}` }
      };
    }
    
    // Good: Data attribute
    const dataAttr = this.findStableDataAttribute(element.dataAttributes);
    if (dataAttr) {
      return {
        strategy: 'dom-selector',
        score: 90,
        confidence: 'high',
        reasoning: `Data attribute found: ${dataAttr}`,
        data: { selector: `[${dataAttr}]` }
      };
    }
    
    // Okay: Aria label
    if (element.ariaLabel) {
      return {
        strategy: 'dom-selector',
        score: 85,
        confidence: 'high',
        reasoning: `Aria label found: ${element.ariaLabel}`,
        data: { selector: `[aria-label="${element.ariaLabel}"]` }
      };
    }
    
    // Fallback: XPath
    return {
      strategy: 'dom-xpath',
      score: 70 - (this.countPositionalIndices(element.xpath) * 10),
      confidence: 'medium',
      reasoning: `Using XPath: ${element.xpath}`,
      data: { xpath: element.xpath }
    };
  }
  
  scoreVisionEvidence(ocr: OCRResult, targetText: string): StrategyScore {
    const matches = ocr.blocks.filter(b => 
      b.text.toLowerCase().includes(targetText.toLowerCase())
    );
    
    if (matches.length === 0) {
      return { strategy: 'vision-text', score: 0, confidence: 'low', reasoning: 'Text not found', data: null };
    }
    
    if (matches.length === 1 && matches[0].confidence > 80) {
      return {
        strategy: 'vision-text',
        score: 85,
        confidence: 'high',
        reasoning: `Unique text match: "${targetText}" at (${matches[0].boundingBox.x}, ${matches[0].boundingBox.y})`,
        data: { text: targetText, location: matches[0] }
      };
    }
    
    // Multiple matches - lower confidence
    return {
      strategy: 'vision-text',
      score: 60,
      confidence: 'medium',
      reasoning: `${matches.length} text matches found, using highest confidence`,
      data: { text: targetText, location: matches.sort((a, b) => b.confidence - a.confidence)[0] }
    };
  }
  
  evaluateEvidence(evidence: EvidenceBundle): DecisionResult {
    const scores = [
      this.scoreDOMEvidence(evidence.dom),
      this.scoreVisionEvidence(evidence.vision.ocr, evidence.dom?.element.textContent || ''),
      this.scoreCoordinates(evidence.mouse.position),
      this.scoreNetworkCorrelation(evidence.network)
    ].filter(s => s.score > 0);
    
    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);
    
    const selected = scores[0];
    const fallbacks = scores.slice(1);
    
    return {
      selectedStrategy: this.buildStrategy(selected),
      confidence: selected.score,
      fallbackChain: fallbacks.map(s => this.buildStrategy(s)),
      reasoning: selected.reasoning,
      verified: false,  // Will be set after verification
      evidenceUsed: []  // Will be populated
    };
  }
}
```

---

## FEAT-007: Evidence Buffer

### Purpose
Temporary storage for all captured evidence during recording, with cleanup on save/discard.

### Storage Strategy

```
┌─────────────────────────────────────────────────────────────┐
│  IndexedDB: "muffin_evidence"                               │
│  ├── Store: "screenshots" (Blob storage)                    │
│  ├── Store: "ocr_results" (JSON)                            │
│  ├── Store: "mouse_events" (JSON)                           │
│  ├── Store: "network_requests" (JSON)                       │
│  └── Store: "dom_captures" (JSON)                           │
└─────────────────────────────────────────────────────────────┘
```

### Interface

```typescript
interface EvidenceBuffer {
  // Store
  storeScreenshot(data: Screenshot): Promise<string>;
  storeOCR(data: OCRResult): Promise<string>;
  storeMouseEvent(data: MouseEventData): Promise<string>;
  storeNetworkRequest(data: NetworkRequest): Promise<string>;
  storeDOMCapture(data: DOMCaptureData): Promise<string>;
  
  // Query
  getEvidence(id: string): Promise<EvidenceItem>;
  queryByType(type: EvidenceType): Promise<EvidenceItem[]>;
  queryByTimeRange(start: number, end: number): Promise<EvidenceItem[]>;
  queryByStepId(stepId: string): Promise<EvidenceItem[]>;
  
  // Linking
  linkToStep(evidenceId: string, stepId: string): Promise<void>;
  markAsUsed(evidenceId: string): Promise<void>;
  
  // Cleanup
  getUsedEvidence(): Promise<EvidenceItem[]>;
  getUnusedEvidence(): Promise<EvidenceItem[]>;
  deleteUnused(): Promise<number>;  // Returns count deleted
  clearAll(): Promise<void>;
  
  // Stats
  getStats(): Promise<BufferStats>;
}

interface EvidenceItem {
  id: string;
  type: EvidenceType;
  recordingId: string;
  stepId: string | null;
  timestamp: number;
  usedInFinal: boolean;
  sizeBytes: number;
  data: any;
}

interface BufferStats {
  totalItems: number;
  usedItems: number;
  unusedItems: number;
  totalSizeBytes: number;
  byType: Record<EvidenceType, { count: number; sizeBytes: number }>;
}

type EvidenceType = 'screenshot' | 'ocr' | 'mouse' | 'network' | 'dom';
```

---

## FEAT-008: Save as Approved

### Purpose
Finalize recording by pruning unused evidence and saving minimal data.

### Workflow

```typescript
async function saveAsApproved(recording: Recording): Promise<SaveResult> {
  // 1. Get buffer stats before
  const statsBefore = await evidenceBuffer.getStats();
  
  // 2. Get only used evidence
  const usedEvidence = await evidenceBuffer.getUsedEvidence();
  
  // 3. Attach evidence to steps
  for (const step of recording.steps) {
    const stepEvidence = usedEvidence.filter(e => e.stepId === step.id);
    step.attachedEvidence = stepEvidence.map(e => ({
      type: e.type,
      data: e.type === 'screenshot' ? compressImage(e.data) : e.data
    }));
  }
  
  // 4. Calculate final size
  const finalSize = calculateSize(recording);
  
  // 5. Save to Chrome Storage
  await chrome.storage.local.set({
    [`recording_${recording.id}`]: recording
  });
  
  // 6. Clear evidence buffer
  const deletedCount = await evidenceBuffer.deleteUnused();
  await evidenceBuffer.clearAll();
  
  // 7. Return result
  return {
    success: true,
    recordingId: recording.id,
    stepCount: recording.steps.length,
    finalSizeBytes: finalSize,
    evidencePruned: statsBefore.unusedItems,
    bytesSaved: statsBefore.totalSizeBytes - finalSize
  };
}
```

---

## FEAT-009: Enhanced Add Variable

### Purpose
Allow users to manually add steps with visual element selection.

### Modal Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Step Type | Dropdown | Yes | click, input, keypress, scroll, wait |
| Target URL | Text | No | URL to open for element selection |
| Element Selection | Button | Yes | Launches picker |
| Step Label | Text | Yes | User-friendly name |
| Input Value | Text | Conditional | Required for input/keypress types |
| Wait Time | Number | Conditional | Required for wait type |

### Element Picker Data Capture

```typescript
interface PickerResult {
  // Element identification
  selector: string;
  xpath: string;
  
  // Position
  coordinates: { x: number; y: number };
  boundingRect: DOMRect;
  
  // Content
  textContent: string;
  ariaLabel: string | null;
  
  // Visual
  regionScreenshot: string;  // Base64, cropped to element
}
```

---

## FEAT-010: Element Picker Overlay

### Purpose
Visual overlay on target page for manual element selection.

### UI Components

```
┌─────────────────────────────────────────────────────────────────┐
│  FLOATING TOOLBAR (position: fixed, top: 10px, center)          │
│  ╔═══════════════════════════════════════════════════════════╗ │
│  ║  🎯 Click an element to select it                         ║ │
│  ║  [Cancel]                              [Confirm Selection] ║ │
│  ╚═══════════════════════════════════════════════════════════╝ │
│                                                                 │
│  HIGHLIGHT OVERLAY (follows mouse)                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [Blue border around hovered element]                   │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │  Tag: BUTTON                                     │   │   │
│  │  │  ID: submit-btn                                  │   │   │
│  │  │  Text: "Submit Form"                             │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Interaction Flow

```typescript
class ElementPicker {
  private overlay: HTMLDivElement;
  private infoBox: HTMLDivElement;
  private selectedElement: Element | null = null;
  
  activate() {
    this.createOverlay();
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('click', this.handleClick, { capture: true });
  }
  
  handleMouseMove = (event: MouseEvent) => {
    const element = document.elementFromPoint(event.clientX, event.clientY);
    if (element && element !== this.overlay) {
      this.highlightElement(element);
      this.showInfoBox(element);
    }
  };
  
  handleClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    const element = document.elementFromPoint(event.clientX, event.clientY);
    if (element && element !== this.overlay) {
      this.selectedElement = element;
      this.captureElementData(element);
    }
  };
  
  async captureElementData(element: Element): Promise<PickerResult> {
    const rect = element.getBoundingClientRect();
    
    return {
      selector: this.generateSelector(element),
      xpath: this.generateXPath(element),
      coordinates: {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2
      },
      boundingRect: rect,
      textContent: element.textContent?.trim() || '',
      ariaLabel: element.getAttribute('aria-label'),
      regionScreenshot: await this.captureRegion(rect)
    };
  }
}
```

---

## FEAT-011: Multi-Strategy Playback

### Purpose
Execute steps using fallback chain when primary strategy fails.

### Execution Flow

```typescript
async function executeStep(step: RecordedStep): Promise<StepResult> {
  const strategies = [step.primaryStrategy, ...step.fallbackChain];
  
  for (const strategy of strategies) {
    const result = await attemptStrategy(strategy, step);
    
    if (result.success) {
      return {
        success: true,
        strategyUsed: strategy.type,
        attemptCount: strategies.indexOf(strategy) + 1
      };
    }
    
    console.log(`Strategy ${strategy.type} failed: ${result.error}`);
  }
  
  return {
    success: false,
    error: 'All strategies exhausted',
    attemptCount: strategies.length
  };
}

async function attemptStrategy(strategy: Strategy, step: RecordedStep): Promise<AttemptResult> {
  switch (strategy.type) {
    case 'dom-id':
    case 'dom-selector':
      return await attemptDOMStrategy(strategy.data.selector, step);
      
    case 'dom-xpath':
      return await attemptXPathStrategy(strategy.data.xpath, step);
      
    case 'vision-text':
      return await attemptVisionStrategy(strategy.data.text, step);
      
    case 'coordinates':
      return await attemptCoordinateStrategy(strategy.data.coordinates, step);
      
    default:
      return { success: false, error: 'Unknown strategy type' };
  }
}
```

---

## FEAT-012: Vision Verification

### Purpose
Optionally verify that playback actions target the correct elements.

### Verification Process

```typescript
async function verifyAction(step: RecordedStep, actualElement: Element): Promise<VerificationResult> {
  // 1. Capture current screenshot
  const screenshot = await visionLayer.captureScreenshot();
  
  // 2. Get element region
  const rect = actualElement.getBoundingClientRect();
  
  // 3. OCR the region
  const ocrResult = await visionLayer.runRegionOCR(screenshot, rect);
  
  // 4. Compare with expected
  const expectedText = step.expectedText || step.label;
  const actualText = ocrResult.fullText.trim();
  
  const similarity = calculateSimilarity(expectedText, actualText);
  
  return {
    verified: similarity > 0.8,
    expectedText,
    actualText,
    similarity,
    screenshot: screenshot.id
  };
}
```
