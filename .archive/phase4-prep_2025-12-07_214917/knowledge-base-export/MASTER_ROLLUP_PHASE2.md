# MASTER ROLLUP: Phase 2 Implementation Guide

**Purpose:** Primary reference for code generation tools (Claude, GPT-4, GitHub Copilot)  
**Last Updated:** January 2024  
**Version:** 2.0.0  

---

## 🎯 Quick Reference

### What is This?
Comprehensive implementation guide for **Muffin Lite V2 Phase 2**: Multi-strategy intelligent recording system with CDP integration, Vision Engine, and 7-tier decision engine.

### Target Audience
- AI code assistants generating implementation code
- Developers implementing Phase 2 features
- Code reviewers validating implementation

### Key Files to Read First
1. `00_masterplan-overview.md` - High-level architecture
2. `01_requirements.md` - Functional requirements
3. `09_build-cards-cdp.md` - Implementation order
4. This file - Quick implementation recipes

---

## 🏗️ Architecture Overview

### Core Philosophy
**Evidence-Based, Not Hierarchical**

The 7-tier system is NOT a waterfall. All strategies run in parallel, scored by confidence. The Decision Engine selects the best strategy for each step.

### 7-Tier Tool Arsenal

```
┌──────────────────────────────────────────────────────┐
│  1. CDP Semantic    [getByRole, getByTestId]        │
│  2. CDP Power       [getByText, getByLabel]          │
│  3. DOM Selector    [#id, .class]                    │
│  4. CSS Selector    [div > input[name="user"]]       │
│  5. Evidence Score  [mouseTrail + attributes]        │
│  6. Vision OCR      [Tesseract.js screenshot]        │
│  7. Coordinates     [x, y fallback]                  │
└──────────────────────────────────────────────────────┘
```

### Decision Flow

```
Recording Capture
    ↓
Generate Fallback Chain (all 7 strategies)
    ↓
Store in RecordedStep.fallbackChain
    ↓
Playback Starts
    ↓
Decision Engine Evaluates All Strategies
    ↓
Sort by Confidence Score
    ↓
Try Highest Confidence First
    ↓
Success? → Log telemetry → Done
    ↓
Failure? → Try Next Strategy → Repeat
    ↓
All Failed? → Log error → Stop
```

---

## 📦 Tech Stack

### Core Technologies
- **Chrome Extension:** Manifest V3
- **Frontend:** React 18 + TypeScript + Vite
- **State:** Redux Toolkit
- **Database:** Dexie.js (IndexedDB wrapper)
- **CDP:** Chrome Debugger Protocol (`chrome.debugger` API)
- **OCR:** Tesseract.js 4.x
- **Build:** Vite 5.x, Rollup

### Key Dependencies
```json
{
  "react": "^18.2.0",
  "typescript": "^5.3.0",
  "dexie": "^3.2.4",
  "tesseract.js": "^4.1.1",
  "@reduxjs/toolkit": "^1.9.7",
  "vite": "^5.0.0"
}
```

---

## 🔧 Implementation Recipes

### Recipe 1: Add CDP Permission

**File:** `public/manifest.json`

```json
{
  "manifest_version": 3,
  "permissions": [
    "debugger",
    "activeTab",
    "tabs",
    "storage",
    "scripting"
  ]
}
```

### Recipe 2: CDPService Singleton

**File:** `src/background/services/CDPService.ts`

```typescript
export class CDPService {
  private attachedTabs = new Set<number>();
  
  async attach(tabId: number): Promise<void> {
    if (this.attachedTabs.has(tabId)) return;
    
    await chrome.debugger.attach({ tabId }, '1.3');
    this.attachedTabs.add(tabId);
    
    await this.sendCommand(tabId, 'DOM.enable');
    await this.sendCommand(tabId, 'Accessibility.enable');
    await this.sendCommand(tabId, 'Runtime.enable');
  }
  
  async sendCommand<T>(tabId: number, method: string, params?: object): Promise<T> {
    return new Promise((resolve, reject) => {
      chrome.debugger.sendCommand({ tabId }, method, params, (result) => {
        chrome.runtime.lastError ? reject(chrome.runtime.lastError) : resolve(result as T);
      });
    });
  }
}

export const cdpService = new CDPService();
```

### Recipe 3: getByRole Locator

**File:** `src/background/services/PlaywrightLocators.ts`

```typescript
export class PlaywrightLocators {
  async getByRole(tabId: number, role: string, options: { name?: string } = {}): Promise<LocatorResult> {
    const candidates = await this.axService.findByRole(tabId, role, options.name);
    
    if (candidates.length === 0) {
      return { found: false, confidence: 0, duration: 0 };
    }
    
    const axNode = candidates[0];
    const { nodeId } = await this.cdp.getNodeForBackendNodeId(tabId, axNode.backendDOMNodeId);
    const { object } = await this.cdp.resolveNode(tabId, nodeId);
    
    return { found: true, element: object, axNode, confidence: 0.95 };
  }
}
```

### Recipe 4: Decision Engine Scoring

**File:** `src/background/services/DecisionEngine.ts`

```typescript
async evaluateStrategies(step: RecordedStep, tabId: number): Promise<ScoredStrategy[]> {
  const strategies: ScoredStrategy[] = [];
  
  // CDP Semantic (highest confidence)
  if (step.fallbackChain?.strategies.some(s => s.type === 'cdp_semantic')) {
    strategies.push({ type: 'cdp_semantic', confidence: 0.95, speed: 50 });
  }
  
  // Vision OCR (high confidence, slow)
  if (step.visionData) {
    strategies.push({ type: 'vision_ocr', confidence: 0.92, speed: 2000 });
  }
  
  // Coordinates (low confidence, fast)
  if (step.visionData?.clickTarget) {
    strategies.push({ type: 'coordinates', confidence: 0.60, speed: 5 });
  }
  
  return strategies.sort((a, b) => b.confidence - a.confidence);
}
```

### Recipe 5: Vision Engine Activation

**File:** `src/background/services/VisionEngine.ts`

```typescript
async clickByOCR(tabId: number, targetText: string): Promise<VisionResult> {
  // 1. Capture screenshot
  const screenshot = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
  
  // 2. Run OCR
  const { data: { words } } = await Tesseract.recognize(screenshot, 'eng');
  
  // 3. Find matching text
  const match = words.find(w => w.text.toLowerCase().includes(targetText.toLowerCase()));
  
  if (!match) {
    return { success: false, error: 'Text not found in OCR' };
  }
  
  // 4. Click detected position
  const clickX = match.bbox.x0 + (match.bbox.x1 - match.bbox.x0) / 2;
  const clickY = match.bbox.y0 + (match.bbox.y1 - match.bbox.y0) / 2;
  
  await this.clickAtCoordinates(tabId, clickX, clickY);
  
  return { success: true, confidence: match.confidence / 100 };
}
```

### Recipe 6: Fallback Chain Generation

**File:** `src/contentScript/RecordingOrchestrator.ts`

```typescript
async generateFallbackChain(element: HTMLElement): Promise<FallbackChain> {
  const strategies: LocatorStrategy[] = [];
  
  // 1. CDP Semantic
  const role = element.getAttribute('role') || this.getImplicitRole(element);
  if (role) {
    strategies.push({
      type: 'cdp_semantic',
      confidence: 0.95,
      metadata: { role, name: element.textContent?.trim() }
    });
  }
  
  // 2. DOM Selector
  if (element.id) {
    strategies.push({
      type: 'dom_selector',
      selector: `#${element.id}`,
      confidence: 0.85
    });
  }
  
  // 3. Vision (if needed)
  if (this.needsVision(element)) {
    const visionData = await this.captureVisionData(element);
    strategies.push({
      type: 'vision_ocr',
      confidence: 0.92,
      metadata: visionData
    });
  }
  
  return { strategies, primaryStrategy: strategies[0]?.type ?? 'dom_selector' };
}
```

### Recipe 7: TypeScript Types

**File:** `src/common/types.ts`

```typescript
export type StrategyType = 
  | 'cdp_semantic'
  | 'cdp_power'
  | 'dom_selector'
  | 'css_selector'
  | 'evidence_scoring'
  | 'vision_ocr'
  | 'coordinates';

export interface RecordedStep {
  id: string;
  action: 'click' | 'type' | 'navigate' | 'select' | 'delay';
  selector?: string;
  xpath?: string;
  visionData?: VisionData;
  fallbackChain: FallbackChain;
  mouseTrailAtCapture?: MouseTrail;
  timestamp: number;
}

export interface FallbackChain {
  strategies: LocatorStrategy[];
  primaryStrategy: StrategyType;
  recordedAt: number;
}

export interface LocatorStrategy {
  type: StrategyType;
  confidence: number;
  speed?: number;
  selector?: string;
  metadata?: any;
}

export interface LocatorResult {
  found: boolean;
  element?: any;
  confidence: number;
  duration: number;
}
```

---

## 🎨 UI Components

### Recording Overlay

**File:** `src/components/RecordingOverlay.tsx`

```tsx
export function RecordingOverlay({ stepCount, onStop, onPause }: Props) {
  return (
    <div className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded shadow-lg">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
        <span className="font-bold">RECORDING</span>
      </div>
      <div className="text-sm mt-2">Steps: {stepCount}</div>
      <div className="flex gap-2 mt-2">
        <button onClick={onPause} className="px-3 py-1 bg-white text-red-500 rounded">Pause</button>
        <button onClick={onStop} className="px-3 py-1 bg-white text-red-500 rounded">Stop</button>
      </div>
    </div>
  );
}
```

### Playback Overlay

**File:** `src/components/PlaybackOverlay.tsx`

```tsx
export function PlaybackOverlay({ currentStep, totalSteps, strategyUsed, onStop }: Props) {
  return (
    <div className="fixed bottom-4 right-4 bg-blue-500 text-white p-4 rounded shadow-lg">
      <div className="flex items-center gap-2">
        <PlayIcon className="w-4 h-4" />
        <span className="font-bold">PLAYING BACK</span>
      </div>
      <div className="text-sm mt-2">Step {currentStep} of {totalSteps}</div>
      <div className="text-xs mt-1">Strategy: {strategyUsed}</div>
      <button onClick={onStop} className="mt-2 px-3 py-1 bg-white text-blue-500 rounded">Stop</button>
    </div>
  );
}
```

---

## 📊 Database Schema

### Dexie.js Schema (v3)

**File:** `src/common/db.ts`

```typescript
import Dexie, { Table } from 'dexie';

export interface Recording {
  id: string;
  name: string;
  projectId: string;
  steps: RecordedStep[];
  createdAt: number;
  lastRun?: number;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
}

export interface TestRun {
  id: string;
  recordingId: string;
  startTime: number;
  endTime?: number;
  status: 'running' | 'passed' | 'failed';
  strategyTelemetry: StrategyTelemetry[];
}

export interface StrategyTelemetry {
  stepId: string;
  strategyUsed: StrategyType;
  confidence: number;
  duration: number;
  attemptNumber: number;
  success: boolean;
}

class MuffinDatabase extends Dexie {
  recordings!: Table<Recording>;
  projects!: Table<Project>;
  testRuns!: Table<TestRun>;
  
  constructor() {
    super('MuffinLiteV2');
    
    this.version(3).stores({
      recordings: 'id, projectId, createdAt, lastRun',
      projects: 'id, createdAt',
      testRuns: 'id, recordingId, startTime, status'
    });
  }
}

export const db = new MuffinDatabase();
```

---

## 🧪 Testing Approach

### Unit Test Example

**File:** `src/background/services/__tests__/CDPService.test.ts`

```typescript
describe('CDPService', () => {
  it('attaches debugger to tab', async () => {
    const tabId = 123;
    await cdpService.attach(tabId);
    
    expect(chrome.debugger.attach).toHaveBeenCalledWith({ tabId }, '1.3');
    expect(cdpService.isAttached(tabId)).toBe(true);
  });
  
  it('sends CDP commands', async () => {
    const tabId = 123;
    await cdpService.attach(tabId);
    
    const result = await cdpService.sendCommand(tabId, 'DOM.getDocument');
    
    expect(chrome.debugger.sendCommand).toHaveBeenCalledWith(
      { tabId },
      'DOM.getDocument',
      undefined,
      expect.any(Function)
    );
  });
});
```

### Integration Test Example

**File:** `src/background/services/__tests__/DecisionEngine.integration.test.ts`

```typescript
describe('DecisionEngine Integration', () => {
  it('executes CDP locator on real page', async () => {
    const tabId = await createTestTab('https://example.com');
    await cdpService.attach(tabId);
    
    const step: RecordedStep = {
      id: '1',
      action: 'click',
      fallbackChain: {
        strategies: [
          { type: 'cdp_semantic', confidence: 0.95, metadata: { role: 'button', name: 'Submit' } }
        ],
        primaryStrategy: 'cdp_semantic'
      }
    };
    
    const result = await decisionEngine.executeWithFallback(step, tabId);
    
    expect(result.success).toBe(true);
    expect(result.strategyUsed).toBe('cdp_semantic');
    expect(result.confidence).toBeGreaterThan(0.9);
  });
});
```

---

## 🚀 Build & Deploy

### Build Commands

```powershell
# Development build
npm run dev

# Production build
npm run build

# Run tests
npm test

# Lint
npm run lint

# Type check
npm run type-check
```

### Build Output Structure

```
release/
├── manifest.json
├── background.js (service worker)
├── contentScript.js (injected into pages)
├── popup.html + popup.js (extension popup)
├── pages.html + pages.js (Dashboard)
├── icon/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
└── fonts/
```

---

## 📋 Implementation Checklist

### Phase 2 Core (MVP)
- [ ] CDP-001: Add debugger permission
- [ ] CDP-002: CDPService skeleton
- [ ] CDP-003: DOM commands
- [ ] CDP-004: Accessibility tree
- [ ] CDP-005: getByRole locator
- [ ] CDP-006: Text/Label/Placeholder locators
- [ ] CDP-007: Locator chaining
- [ ] CDP-008: AutoWaiting service
- [ ] CDP-009: Decision Engine integration
- [ ] CDP-010: Recording integration

### Phase 2 Extended
- [ ] Vision Engine with Tesseract.js
- [ ] Time delay UI + storage
- [ ] CSV loop parser + mapping UI
- [ ] Conditional click logic
- [ ] Telemetry dashboard
- [ ] Migration script (v2 → v3)

---

## 🔍 Common Pitfalls

### Pitfall 1: CDP Attach/Detach Leaks
**Problem:** Forgetting to detach debugger causes memory leaks

**Solution:**
```typescript
chrome.tabs.onRemoved.addListener(async (tabId) => {
  if (cdpService.isAttached(tabId)) {
    await cdpService.detach(tabId);
  }
});
```

### Pitfall 2: Vision Engine Timeout
**Problem:** OCR takes too long, blocks UI

**Solution:** Run in Web Worker with timeout
```typescript
const ocrWorker = new Worker('/workers/ocr.worker.js');
const result = await Promise.race([
  ocrWorker.recognize(screenshot),
  timeout(5000) // 5s max
]);
```

### Pitfall 3: Fallback Chain Missing
**Problem:** Old recordings don't have fallbackChain

**Solution:** Migration function
```typescript
async function migrateRecording(recording: Recording): Promise<Recording> {
  for (const step of recording.steps) {
    if (!step.fallbackChain) {
      step.fallbackChain = {
        strategies: [
          { type: 'dom_selector', confidence: 0.85, selector: step.selector }
        ],
        primaryStrategy: 'dom_selector'
      };
    }
  }
  return recording;
}
```

---

## 📚 Related Files

| File | Purpose |
|------|---------|
| `00_masterplan-overview.md` | Executive summary |
| `01_requirements.md` | FR/NFR specifications |
| `02_ux-flows.md` | ASCII flow diagrams |
| `03_feature-specs.md` | Detailed feature specs |
| `04_architecture.md` | System architecture |
| `05_data-layer.md` | TypeScript types + DB schema |
| `06_api-contracts.md` | Message protocol |
| `07_migration-notes.md` | v2 → v3 migration |
| `08_testing-strategy.md` | Test plans |
| `09_build-cards-cdp.md` | Implementation build cards |
| `10_deployment-checklist.md` | Deployment steps |
| `11_user-documentation.md` | User guide |
| `12_future-roadmap.md` | Phases 3-6 |

---

## 🎯 Success Criteria

### Phase 2 Goals
- [ ] CDP locators functional for 90% of elements
- [ ] Vision Engine activates correctly for canvas/shadow DOM
- [ ] Decision Engine selects correct strategy > 95% of time
- [ ] Playback success rate > 90% (vs. 70% in Phase 1)
- [ ] No regressions (Phase 1 features still work)

### Performance Targets
- CDP attach: < 200ms
- getByRole: < 50ms
- getByText: < 100ms
- Vision OCR: < 2s
- Full playback (10 steps): < 15s

---

## 🤝 Code Generation Tips

### For Claude/GPT-4:
1. **Always include TypeScript types** - Don't use `any`
2. **Use async/await, not callbacks** - Cleaner code
3. **Add error handling** - Try/catch around CDP calls
4. **Include JSDoc comments** - Helps with autocomplete
5. **Use functional components (React)** - No class components

### Example Prompt:
```
Generate a TypeScript function that uses CDPService to find 
an element by role and name. Include error handling and return 
a LocatorResult. Use the getByRole pattern from PlaywrightLocators.
```

---

## 📞 Contact

**GitHub:** [github.com/muffin-lite](#)  
**Documentation:** [docs.muffinlite.com](#)  
**Support:** support@muffinlite.com  

---

**END OF MASTER ROLLUP**
