# DATA LAYER

## Core Types

```typescript
// Strategy Types
type StrategyType = 
  | 'dom_selector'
  | 'css_selector'
  | 'cdp_semantic'
  | 'cdp_power'
  | 'evidence_scoring'
  | 'vision_ocr'
  | 'coordinates';

type RecordedVia = 'dom' | 'vision' | 'manual';

type EventType = 'click' | 'type' | 'select' | 'hover' | 'navigate';

// Locator Strategy
interface LocatorStrategy {
  type: StrategyType;
  selector?: string;
  confidence: number;
  metadata?: {
    role?: string;
    text?: string;
    label?: string;
    placeholder?: string;
    testId?: string;
    coordinates?: { x: number; y: number };
  };
}

// Fallback Chain
interface FallbackChain {
  strategies: LocatorStrategy[];
  primaryStrategy: StrategyType;
  recordedAt: number;
}

// Strategy Attempt (Telemetry)
interface StrategyAttempt {
  strategy: StrategyType;
  success: boolean;
  duration: number;
  confidence: number;
  error?: string;
  attemptNumber: number;
}

// Coordinates
interface Coordinates {
  x: number;
  y: number;
  timestamp: number;
}
```

## Vision Types

```typescript
interface VisionConfig {
  enabled: boolean;
  tesseractWorkerUrl: string;
  language: 'eng' | 'spa' | 'fra';
  screenshotQuality: number; // 0.0-1.0
  devicePixelRatio: number;
  ocrConfidenceThreshold: number; // 0-100
  fuzzyMatchThreshold: number; // 0.0-1.0
}

interface TextResult {
  text: string;
  confidence: number;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface ClickTarget {
  x: number;
  y: number;
  text: string;
  confidence: number;
  timestamp: number;
}

interface ConditionalConfig {
  enabled: boolean;
  targetText: string;
  maxWaitMs: number; // Default 30000
  pollIntervalMs: number; // Default 500
}

interface ConditionalClickResult {
  success: boolean;
  attempts: number;
  totalWaitMs: number;
  clickTarget?: ClickTarget;
  error?: string;
}
```

## CDP Types

```typescript
interface CDPNode {
  nodeId: number;
  backendNodeId: number;
  nodeType: number;
  nodeName: string;
  localName: string;
  nodeValue: string;
  attributes?: string[];
}

interface AXNode {
  nodeId: string;
  role: { type: string; value: string };
  name?: { type: string; value: string };
  description?: { type: string; value: string };
  value?: { type: string; value: string };
  properties?: AXProperty[];
  backendDOMNodeId: number;
}

interface AXProperty {
  name: string;
  value: { type: string; value: any };
}

interface LocatorResult {
  found: boolean;
  element?: Element;
  cdpNode?: CDPNode;
  axNode?: AXNode;
  confidence: number;
  duration: number;
}

interface WaitOptions {
  timeout?: number; // Default 30000
  visible?: boolean; // Default true
  enabled?: boolean; // Default true
  stable?: boolean; // Default true
}
```

## Extended Step Interface

```typescript
interface RecordedStep {
  // Core fields
  id: string;
  stepNumber: number;
  event: EventType;
  url: string;
  timestamp: number;
  
  // Element identification
  selector?: string;
  xpath?: string;
  bundle?: LocatorBundle;
  
  // Action data
  value?: string; // For type/select events
  label: string;
  labelConfidence: number;
  
  // Phase 2 additions
  recordedVia: RecordedVia;
  fallbackChain: FallbackChain;
  evidenceBufferId?: string;
  
  // Vision data
  visionData?: {
    targetText: string;
    clickTarget: ClickTarget;
    screenshot?: string; // Base64
  };
  
  // Conditional click
  conditionalConfig?: ConditionalConfig;
  
  // Time delay
  delay?: number; // Per-step override
  
  // CSV loop
  isLoopStart?: boolean;
  
  // Telemetry
  attempts?: StrategyAttempt[];
}
```

## Extended Recording Interface

```typescript
interface Recording {
  // Core fields
  id: string;
  name: string;
  url: string;
  createdAt: number;
  updatedAt: number;
  
  // Steps
  steps: RecordedStep[];
  
  // Phase 2 additions
  globalDelay: number; // 0-10000ms
  
  // CSV Loop
  csvLoop?: {
    enabled: boolean;
    csvData: string[][]; // Parsed CSV
    columnMapping: Map<string, string>; // Column → Variable
    loopStartStep: number;
  };
  
  // Evidence buffer reference
  evidenceBufferId?: string;
  evidencePruned: boolean; // True after "Save as Approved"
  
  // Statistics
  stats: {
    totalSteps: number;
    domSteps: number;
    visionSteps: number;
    manualSteps: number;
    averageConfidence: number;
  };
}
```

## Database Schema (Dexie.js v3)

```typescript
import Dexie, { Table } from 'dexie';

class MuffinDatabase extends Dexie {
  recordings!: Table<Recording>;
  evidenceBuffer!: Table<EvidenceRecord>;
  telemetry!: Table<TelemetryRecord>;
  
  constructor() {
    super('MuffinDB');
    
    this.version(3).stores({
      recordings: '++id, name, url, createdAt, updatedAt',
      evidenceBuffer: '++id, stepId, recordingId, timestamp',
      telemetry: '++id, recordingId, stepId, timestamp'
    });
  }
}

const db = new MuffinDatabase();
```

## Telemetry Schema

```typescript
interface TelemetryRecord {
  id?: number;
  recordingId: string;
  stepId: string;
  timestamp: number;
  
  // Execution details
  strategyUsed: StrategyType;
  confidence: number;
  duration: number;
  success: boolean;
  attemptNumber: number;
  
  // Failures
  failedStrategies?: StrategyType[];
  error?: string;
  
  // Context
  url: string;
  viewport: { width: number; height: number };
  userAgent: string;
}
```

## Evidence Buffer Schema

```typescript
interface EvidenceRecord {
  id?: number;
  stepId: string;
  recordingId: string;
  timestamp: number;
  
  // Multi-layer evidence
  evidence: {
    dom: {
      snapshot: string; // HTML
      selector: string;
      xpath: string;
    };
    vision: {
      screenshot: string; // Base64
      ocrResults: TextResult[];
    };
    mouse: {
      trail: Coordinates[];
      clickPosition: Coordinates;
    };
    network: {
      requests: NetworkRequest[];
      responses: NetworkResponse[];
    };
  };
  
  // Storage metadata
  size: number; // Bytes
  compressed: boolean;
}

interface NetworkRequest {
  url: string;
  method: string;
  timestamp: number;
  headers?: Record<string, string>;
}

interface NetworkResponse {
  url: string;
  status: number;
  timestamp: number;
}
```

## Migration Strategy

### Version 1 → Version 2
- Add `recordedVia` field to steps
- Add `fallbackChain` field to steps
- Add `globalDelay` to recordings

### Version 2 → Version 3 (Phase 2)
- Add `evidenceBuffer` table
- Add `telemetry` table
- Add `evidenceBufferId` to recordings
- Add `evidencePruned` flag to recordings
- Add `csvLoop` to recordings
- Add `conditionalConfig` to steps

### Migration Function

```typescript
db.version(3).stores({
  recordings: '++id, name, url, createdAt, updatedAt',
  evidenceBuffer: '++id, stepId, recordingId, timestamp',
  telemetry: '++id, recordingId, stepId, timestamp'
}).upgrade(async tx => {
  // Migrate recordings
  await tx.table('recordings').toCollection().modify(recording => {
    recording.globalDelay = recording.globalDelay ?? 0;
    recording.evidencePruned = false;
    recording.stats = {
      totalSteps: recording.steps.length,
      domSteps: recording.steps.filter(s => s.recordedVia === 'dom').length,
      visionSteps: recording.steps.filter(s => s.recordedVia === 'vision').length,
      manualSteps: recording.steps.filter(s => s.recordedVia === 'manual').length,
      averageConfidence: 0
    };
  });
  
  // Migrate steps
  await tx.table('recordings').toCollection().modify(recording => {
    recording.steps = recording.steps.map(step => ({
      ...step,
      recordedVia: step.recordedVia ?? 'dom',
      fallbackChain: step.fallbackChain ?? {
        strategies: [],
        primaryStrategy: 'dom_selector',
        recordedAt: Date.now()
      }
    }));
  });
});
```

## Default Values Factory

```typescript
function createDefaultRecording(): Recording {
  return {
    id: crypto.randomUUID(),
    name: 'Untitled Recording',
    url: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    steps: [],
    globalDelay: 0,
    evidencePruned: false,
    stats: {
      totalSteps: 0,
      domSteps: 0,
      visionSteps: 0,
      manualSteps: 0,
      averageConfidence: 0
    }
  };
}

function createDefaultStep(stepNumber: number): RecordedStep {
  return {
    id: crypto.randomUUID(),
    stepNumber,
    event: 'click',
    url: window.location.href,
    timestamp: Date.now(),
    label: '',
    labelConfidence: 0,
    recordedVia: 'dom',
    fallbackChain: {
      strategies: [],
      primaryStrategy: 'dom_selector',
      recordedAt: Date.now()
    }
  };
}
```
