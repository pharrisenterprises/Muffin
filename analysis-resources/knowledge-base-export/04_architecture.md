# ARCHITECTURE

## High-Level System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CHROME EXTENSION                              │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐                │
│  │   Popup     │  │   Dashboard   │  │   Pages     │                │
│  │   (React)   │  │   (React)     │  │   (React)   │                │
│  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘                │
│         │                │                   │                        │
│         └────────────────┼───────────────────┘                        │
│                          │                                            │
│                 ┌────────▼────────┐                                  │
│                 │ Shared Libraries │                                  │
│                 │ - Dexie.js (DB)  │                                  │
│                 │ - Utils          │                                  │
│                 │ - Types          │                                  │
│                 └────────┬─────────┘                                  │
│                          │                                            │
│         ┌────────────────┼────────────────┐                          │
│         │                │                │                          │
│    ┌────▼─────┐   ┌─────▼──────┐  ┌──────▼──────┐                  │
│    │  Service  │   │   Content   │  │   Content   │                  │
│    │  Worker   │   │   Script    │  │   Script    │                  │
│    │(Background)│  │   (Tab A)   │  │   (Tab B)   │                  │
│    └───────────┘   └─────────────┘  └─────────────┘                  │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. CDPService

**Purpose:** Manage Chrome DevTools Protocol connection lifecycle

**Location:** `src/background/services/CDPService.ts`

**Key Methods:**
```typescript
class CDPService {
  async attach(tabId: number): Promise<void>
  async detach(tabId: number): Promise<void>
  async sendCommand<T>(tabId: number, method: string, params?: object): Promise<T>
  isAttached(tabId: number): boolean
}
```

**Usage:**
```typescript
const cdp = new CDPService();
await cdp.attach(tabId);
const result = await cdp.sendCommand(tabId, 'DOM.getDocument');
await cdp.detach(tabId);
```

---

### 2. PlaywrightLocators

**Purpose:** Playwright-style semantic element location

**Location:** `src/background/services/PlaywrightLocators.ts`

**Key Methods:**
```typescript
class PlaywrightLocators {
  async getByRole(role: string, options?: LocatorOptions): Promise<LocatorResult>
  async getByText(text: string, options?: LocatorOptions): Promise<LocatorResult>
  async getByLabel(text: string): Promise<LocatorResult>
  async getByPlaceholder(text: string): Promise<LocatorResult>
  async getByTestId(testId: string): Promise<LocatorResult>
  async chain(locators: LocatorResult[]): Promise<Element | null>
}
```

---

### 3. DecisionEngine

**Purpose:** Multi-strategy evaluation and selection

**Location:** `src/background/services/DecisionEngine.ts`

**Key Methods:**
```typescript
class DecisionEngine {
  async evaluateStrategies(step: RecordedStep): Promise<ScoredStrategy[]>
  selectBestStrategy(strategies: ScoredStrategy[]): StrategyType
  async executeWithFallback(step: RecordedStep): Promise<ExecutionResult>
  logTelemetry(result: ExecutionResult): void
}
```

**Strategy Scoring:**
```typescript
function scoreStrategy(strategy: StrategyType, context: Context): number {
  let score = 0;
  
  // Base confidence from strategy type
  score += getBaseConfidence(strategy);
  
  // Element stability bonus
  if (context.elementStable) score += 0.1;
  
  // Previous success bonus
  if (context.previouslySucceeded) score += 0.15;
  
  // Speed penalty for slow strategies
  if (strategy === 'vision_ocr' && score < 0.9) score -= 0.05;
  
  return Math.min(1.0, Math.max(0.0, score));
}
```

---

### 4. AutoWaiting

**Purpose:** Intelligent wait conditions before actions

**Location:** `src/background/services/AutoWaiting.ts`

**Key Methods:**
```typescript
class AutoWaitingService {
  async waitForVisible(element: Element, timeout: number): Promise<boolean>
  async waitForEnabled(element: Element, timeout: number): Promise<boolean>
  async waitForStable(element: Element, timeout: number): Promise<boolean>
  async waitForAll(element: Element, options: WaitOptions): Promise<boolean>
}
```

## CDP Domains

| Domain | Purpose | Key Commands |
|--------|---------|--------------|
| **DOM** | DOM tree access | `getDocument`, `querySelector`, `getNodeFor

BackendNodeId` |
| **Accessibility** | Accessibility tree | `getFullAXTree`, `getPartialAXTree` |
| **Network** | Network events | `enable`, `setRequestInterception` |
| **Runtime** | JavaScript execution | `evaluate`, `callFunctionOn` |
| **Page** | Page lifecycle | `navigate`, `reload`, `captureScreenshot` |

## Locator Types

| Type | Implementation | Speed | Example |
|------|---------------|-------|---------|
| **DOM Selector** | `querySelector` | <10ms | `#submit-btn` |
| **CSS Selector** | `querySelector` | <15ms | `.btn.primary` |
| **CDP Semantic** | `getByRole` | <50ms | `getByRole('button', {name: 'Submit'})` |
| **CDP Power** | `getByText/Label/Placeholder` | <100ms | `getByText('Submit')` |
| **Evidence** | Multi-evidence scoring | <500ms | Mouse trail + DOM + Visual |
| **Vision OCR** | Tesseract.js | <2000ms | OCR text match + click coords |
| **Coordinates** | Absolute position | <5ms | `(450, 320)` |

## Scoring Algorithm

```typescript
interface EvidenceScores {
  spatial: number;   // Mouse trajectory (weight 0.25)
  sequence: number;  // Step patterns (weight 0.20)
  visual: number;    // Screenshot match (weight 0.15)
  dom: number;       // Selector quality (weight 0.25)
  history: number;   // Past success (weight 0.15)
}

function calculateTotalScore(scores: EvidenceScores): number {
  return (scores.spatial * 0.25) +
         (scores.sequence * 0.20) +
         (scores.visual * 0.15) +
         (scores.dom * 0.25) +
         (scores.history * 0.15);
}
```

## Data Flow

### Recording Flow
```
User Action → Content Script → Recording Engine → Strategy Generator
           ↓                                               ↓
    Event Capture                                  Score All Strategies
           ↓                                               ↓
    Evidence Layers (DOM/Vision/Mouse/Network)     Build Fallback Chain
           ↓                                               ↓
    Evidence Buffer (IndexedDB)                    Store in RecordedStep
```

### Playback Flow
```
RecordedStep → Decision Engine → Load Fallback Chain
                      ↓
              Try Strategy #1 (highest confidence)
                      ↓
              Success? → Log Telemetry → Next Step
                      ↓ No
              Try Strategy #2
                      ↓
              Success? → Log Telemetry → Next Step
                      ↓ No
              ... repeat until success or all strategies exhausted
```

## File Structure

```
src/
├── background/
│   ├── background.ts
│   └── services/
│       ├── CDPService.ts
│       ├── PlaywrightLocators.ts
│       ├── DecisionEngine.ts
│       ├── AutoWaiting.ts
│       └── VisionService.ts
├── contentScript/
│   ├── content.tsx
│   ├── RecordingOrchestrator.ts
│   ├── EvidenceBuffer.ts
│   └── layers/
│       ├── DOMCapture.ts
│       ├── VisionCapture.ts
│       ├── MouseCapture.ts
│       └── NetworkCapture.ts
├── common/
│   ├── types.ts
│   ├── db.ts (Dexie)
│   └── utils.ts
├── components/ (React UI)
├── popup/
├── dashboard/
└── pages/
```

## Manifest Configuration

```json
{
  "manifest_version": 3,
  "name": "Muffin Lite V2",
  "version": "2.0.0",
  "permissions": [
    "debugger",
    "activeTab",
    "tabs",
    "storage",
    "scripting"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "run_at": "document_start"
  }],
  "action": {
    "default_popup": "popup.html"
  }
}
```

## Package.json Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "dexie": "^3.2.0",
    "tesseract.js": "^4.0.0",
    "html2canvas": "^1.4.0"
  },
  "devDependencies": {
    "@types/chrome": "^0.0.246",
    "typescript": "^5.0.0",
    "vite": "^4.0.0",
    "@vitejs/plugin-react": "^4.0.0"
  }
}
```
