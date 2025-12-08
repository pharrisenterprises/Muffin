# Modularization Plan - Muffin Chrome Extension

**Generated:** December 7, 2025  
**Purpose:** Define clear module boundaries, dependencies, and refactoring strategy for improved maintainability and testability (Phase 3 Integration Complete)

---

## 1. Purpose of Modularization

### Current Challenges

The Muffin codebase has evolved organically, resulting in several architectural issues:

1. **Monolithic Content Script (1450 lines)**
   - `src/contentScript/content.tsx` combines recording, playback, DOM utilities, label extraction, and XPath generation
   - Difficult to test individual features in isolation
   - Changes to recording logic risk breaking playback functionality

2. **Business Logic Embedded in UI Components**
   - `TestRunner.tsx` contains test orchestration logic (CSV iteration, step execution, result aggregation)
   - `FieldMapper.tsx` contains auto-mapping algorithm and CSV parsing
   - UI and business logic tightly coupled, preventing reuse

3. **No Clear Module Boundaries**
   - Unclear where to add new element-finding strategies
   - Label extraction heuristics hardcoded with no extension mechanism
   - DOM manipulation utilities scattered across content script

4. **Testing Challenges**
   - Pure functions (element finding, label extraction) mixed with side effects (Chrome messaging)
   - Cannot unit test DOM automation without full Chrome environment
   - No mocking layer for Chrome APIs

### Benefits of Modularization

**For Developers:**
- **Clear ownership:** Each module has defined responsibilities
- **Easier onboarding:** New developers understand one module at a time
- **Parallel development:** Teams can work on recording vs playback independently
- **Testability:** Pure functions can be unit tested without Chrome mocks

**For Code Quality:**
- **Reusability:** DOM automation utilities can be extracted into standalone library
- **Extensibility:** New element-finding strategies can be added via plugins
- **Maintainability:** Bugs isolated to specific modules
- **Type safety:** Explicit interfaces between modules prevent implicit coupling

**For Performance:**
- **Lazy loading:** Load field mapping engine only when needed
- **Code splitting:** Reduce initial bundle size
- **Tree shaking:** Remove unused code more effectively

---

## 2. Identified Subsystems

Based on current codebase analysis (85 TypeScript files), the following subsystems have been identified:

### Core Automation (Pure Library - No Chrome APIs)

#### Module 1: DOM Element Finder
- **Current Location:** Functions in `src/contentScript/content.tsx`
- **Purpose:** Locate elements using multiple fallback strategies
- **Key Functions:** `findElementFromBundle()`, strategy implementations
- **Complexity:** Very High (200+ lines, 7 strategies)

#### Module 2: Label Extraction
- **Current Location:** Functions in `src/contentScript/content.tsx`
- **Purpose:** Extract human-readable labels from form fields
- **Key Functions:** `getLabelForTarget()`, 16+ extraction heuristics
- **Complexity:** High (150+ lines)

#### Module 3: XPath Computation
- **Current Location:** Functions in `src/contentScript/content.tsx`
- **Purpose:** Generate position-based XPath for elements
- **Key Functions:** `getXPath()`, path generation logic
- **Complexity:** Medium (50+ lines)

#### Module 4: DOM Traversal
- **Current Location:** Functions in `src/contentScript/content.tsx`
- **Purpose:** Navigate iframes and shadow DOM
- **Key Functions:** Iframe chain building, shadow host traversal
- **Complexity:** Medium

### Content Scripts (Chrome Extension Context)

#### Module 5: Recording Engine
- **Current Location:** Recording functions in `src/contentScript/content.tsx`
- **Purpose:** Capture user interactions on web pages
- **Key Functions:** Event listeners, `recordElement()`, step creation
- **Complexity:** High (500+ lines)

#### Module 6: Playback Engine
- **Current Location:** Playback functions in `src/contentScript/content.tsx` + `replay.ts`
- **Purpose:** Replay recorded steps with element finding
- **Key Functions:** `playAction()`, `findElementFromBundle()`, notification display
- **Complexity:** High (600+ lines)

#### Module 7: Shadow DOM Interceptor
- **Current Location:** `src/contentScript/page-interceptor.tsx`
- **Purpose:** Intercept closed shadow root creation
- **Key Functions:** `attachShadow` monkey patch
- **Complexity:** Low (standalone, 50 lines)

### Background Services

#### Module 8: Message Router
- **Current Location:** `src/background/background.ts` (chrome.runtime.onMessage listener)
- **Purpose:** Route 20+ action types between contexts
- **Key Functions:** Action handlers, message dispatching
- **Complexity:** Medium (323 lines total in background.ts)

#### Module 9: Tab Manager
- **Current Location:** Functions in `src/background/background.ts`
- **Purpose:** Browser tab lifecycle management
- **Key Functions:** `chrome.tabs.create()`, script injection, tab tracking
- **Complexity:** Low

### Data Layer

#### Module 10: IndexedDB Service
- **Current Location:** `src/common/services/indexedDB.ts`
- **Purpose:** Persistent storage for projects and test runs
- **Key Functions:** Dexie wrapper, CRUD operations
- **Complexity:** Low (73 lines, well-structured)
- **Status:** ✅ Already modular

#### Module 11: Project Repository
- **Current Location:** Methods in `src/common/services/indexedDB.ts`
- **Purpose:** CRUD operations for projects table
- **Key Functions:** `addProject()`, `updateProject()`, `getAllProjects()`, `deleteProject()`
- **Complexity:** Low
- **Status:** ✅ Already modular (within indexedDB.ts)

#### Module 12: TestRun Repository
- **Current Location:** Methods in `src/common/services/indexedDB.ts`
- **Purpose:** CRUD operations for test runs table
- **Key Functions:** `createTestRun()`, `updateTestRun()`, `getTestRunsByProject()`
- **Complexity:** Low
- **Status:** ✅ Already modular (within indexedDB.ts)

#### Module 13: Chrome Storage Helper
- **Current Location:** `src/common/helpers/storageHelper.ts`
- **Purpose:** Promise-based Chrome storage.sync wrapper
- **Key Functions:** `get()`, `set()`, `remove()`, `getAll()`, `clear()`
- **Complexity:** Low
- **Status:** ✅ Already modular

### Business Logic

#### Module 14: CSV Parser
- **Current Location:** Inline in `FieldMapper.tsx` and `TestRunner.tsx`
- **Purpose:** Parse CSV files using PapaParse
- **Key Functions:** File reading, parsing configuration, error handling
- **Complexity:** Low (should be extracted)

#### Module 15: Field Mapping Engine
- **Current Location:** Inline in `FieldMapper.tsx`
- **Purpose:** Auto-map CSV columns to step labels using string similarity
- **Key Functions:** `autoMapFields()`, normalization, Dice coefficient scoring
- **Complexity:** Medium (should be extracted)

#### Module 16: Test Orchestrator
- **Current Location:** Inline in `TestRunner.tsx`
- **Purpose:** Coordinate test execution, CSV iteration, result aggregation
- **Key Functions:** Test loop, step execution, progress tracking, result compilation
- **Complexity:** High (400+ lines, should be extracted)

#### Module 17: Step Capture Engine
- **Current Location:** Functions in `src/contentScript/content.tsx`
- **Purpose:** Transform raw events into structured Step objects
- **Key Functions:** Bundle creation, metadata enrichment
- **Complexity:** Medium

### UI Layer (Keep as-is)

#### Module 18: Dashboard UI
- **Current Location:** `src/pages/Dashboard.tsx`, `src/components/Dashboard/*`
- **Purpose:** Project management interface
- **Files:** Dashboard.tsx (342 lines) + 4 component files
- **Status:** ✅ Good structure

#### Module 19: Recorder UI
- **Current Location:** `src/pages/Recorder.tsx`, `src/components/Recorder/*`
- **Purpose:** Recording interface with step list
- **Files:** Recorder.tsx (400 lines) + 3 component files
- **Status:** ✅ Good structure

#### Module 20: Field Mapper UI
- **Current Location:** `src/pages/FieldMapper.tsx`, `src/components/Mapper/*`
- **Purpose:** CSV mapping interface
- **Files:** FieldMapper.tsx (350 lines) + 4 component files
- **Status:** ⚠️ Should extract business logic

#### Module 21: Test Runner UI
- **Current Location:** `src/pages/TestRunner.tsx`, `src/components/Runner/*`
- **Purpose:** Test execution interface
- **Files:** TestRunner.tsx (400 lines) + 3 component files
- **Status:** ⚠️ Should extract orchestration logic

#### Module 22: UI Design System
- **Current Location:** `src/components/Ui/*`
- **Purpose:** Reusable shadcn/ui components
- **Files:** 30+ component files (Button, Card, Input, Dialog, etc.)
- **Status:** ✅ Excellent structure

### Infrastructure

#### Module 23: Router
- **Current Location:** `src/routes/Router.tsx`, `src/App.tsx`
- **Purpose:** Hash-based routing for extension pages
- **Status:** ✅ Already modular

#### Module 24: Redux Store
- **Current Location:** `src/redux/*`
- **Purpose:** Global state (theme, header, user)
- **Status:** ✅ Already modular (minimal usage is appropriate)

#### Module 25: Build Pipeline
- **Current Location:** `vite.config.ts`, `vite.config.bg.ts`, `scripts/postbuild.js`
- **Purpose:** Dual build configuration for UI and background
- **Status:** ✅ Already modular

---

## 3. Proposed Module Boundaries

### Priority 1: Extract DOM Automation Core (Weeks 1-2)

**New Module:** `@muffin/dom-automation`

**Exports:**
```typescript
// Element Finding
export function findElement(bundle: ElementBundle, options?: FindOptions): Promise<HTMLElement | null>;
export function findElementSync(bundle: ElementBundle): HTMLElement | null;

// Label Extraction
export function extractLabel(element: HTMLElement): string | undefined;
export function extractLabelWithStrategies(element: HTMLElement, strategies: LabelStrategy[]): string | undefined;

// XPath
export function computeXPath(element: HTMLElement): string;
export function evaluateXPath(xpath: string, doc?: Document): HTMLElement | null;

// DOM Traversal
export function traverseIframes(chain: IframeInfo[], startDoc?: Document): Document | null;
export function traverseShadowRoots(hostPath: string[], startDoc?: Document): ShadowRoot | Document | null;

// Bundle Creation
export function createElementBundle(element: HTMLElement): ElementBundle;
```

**Dependencies:** None (pure DOM APIs)

**Consumers:** Recording Engine, Playback Engine

**Testing:** 100% unit test coverage required

**Location:** Keep in `src/lib/dom-automation/` (no separate package needed yet)

---

### Priority 2: Split Content Script (Weeks 3-4)

**Module A:** `src/contentScript/recorder.ts`
```typescript
export function startRecording(window: Window): RecordingSession;
export function stopRecording(session: RecordingSession): void;
export function getRecordedSteps(session: RecordingSession): Step[];
export function attachEventListeners(doc: Document): CleanupFn;
```

**Module B:** `src/contentScript/replayer.ts`
```typescript
export function executeStep(step: Step, options?: ExecuteOptions): Promise<StepResult>;
export function executeAction(element: HTMLElement, action: Action): Promise<void>;
export function showNotification(message: string, type: NotificationType): void;
```

**Module C:** `src/contentScript/page-interceptor.ts`
- Keep as-is (already separate)

**Shared:** `src/contentScript/types.ts`
- Move all interfaces (Bundle, Step, IframeInfo, etc.)

---

### Priority 3: Extract Business Logic (Weeks 5-6)

**Module D:** `src/lib/csv-parser.ts`
```typescript
export async function parseCSV(file: File): Promise<ParsedCSV>;
export async function previewCSV(file: File, rowLimit: number): Promise<CSVRow[]>;
export function validateCSV(data: ParsedCSV): ValidationResult;
```

**Module E:** `src/lib/field-mapping.ts`
```typescript
export function autoMapFields(csvHeaders: string[], stepLabels: string[], threshold?: number): FieldMapping[];
export function normalizeString(str: string): string;
export function calculateSimilarity(a: string, b: string): number;
export function validateMapping(mapping: FieldMapping, steps: Step[]): ValidationResult;
```

**Module F:** `src/lib/test-orchestrator.ts`
```typescript
export async function executeTest(config: TestConfig): Promise<TestResult>;
export async function executeBatch(config: BatchConfig): Promise<BatchResult>;
export function subscribeToProgress(callback: ProgressCallback): UnsubscribeFn;
```

---

## 4. Dependency Map

### Layer 0: Pure Utilities (No Dependencies)

```
DOM Automation Core
    ├─ Element Finding Strategies
    ├─ Label Extraction Heuristics
    ├─ XPath Computation
    └─ DOM Traversal (iframe, shadow DOM)

CSV Parser (PapaParse wrapper)

Field Mapping Engine (string-similarity wrapper)
```

### Layer 1: Chrome Extension Primitives

```
Chrome Storage Helper
    └─ Chrome storage.sync API

IndexedDB Service
    └─ Dexie.js

Message Router (in background.ts)
    └─ Chrome runtime API

Tab Manager (in background.ts)
    └─ Chrome tabs API + scripting API
```

### Layer 2: Content Scripts

```
Recording Engine
    ├─ DOM Automation Core
    ├─ Chrome runtime API (sendMessage)
    └─ Content Script Types

Playback Engine
    ├─ DOM Automation Core
    ├─ Chrome runtime API (sendMessage)
    └─ Content Script Types

Page Interceptor
    └─ DOM prototype manipulation
```

### Layer 3: Business Logic

```
Test Orchestrator
    ├─ Playback Engine (via messaging)
    ├─ Field Mapping Engine
    ├─ Tab Manager (via messaging)
    └─ Chrome runtime API

Step Capture Engine
    ├─ DOM Automation Core
    └─ Recording Engine
```

### Layer 4: UI Components

```
Dashboard UI
    ├─ Message Router (via chrome.runtime.sendMessage)
    ├─ UI Design System
    └─ React Router

Recorder UI
    ├─ Message Router
    ├─ UI Design System
    ├─ @hello-pangea/dnd
    └─ Recording Engine (via messaging)

Field Mapper UI
    ├─ Message Router
    ├─ UI Design System
    ├─ CSV Parser
    └─ Field Mapping Engine

Test Runner UI
    ├─ Message Router
    ├─ UI Design System
    ├─ Test Orchestrator (inline, should extract)
    └─ Playback Engine (via messaging)
```

### Dependency Flow Diagram

```
┌─────────────────────────────────────────────┐
│ Layer 4: UI Pages (Dashboard, Recorder,    │
│           FieldMapper, TestRunner)          │
└──────────────────┬──────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────┐
│ Layer 3: Business Logic (Test Orchestrator,│
│           CSV Parser, Field Mapping)        │
└──────────────────┬──────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────┐
│ Layer 2: Content Scripts (Recording,       │
│           Playback, Interceptor)            │
└──────────────────┬──────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────┐
│ Layer 1: Chrome APIs (Message Router,      │
│           Storage, IndexedDB, Tab Manager)  │
└──────────────────┬──────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────┐
│ Layer 0: Pure Utilities (DOM Automation    │
│           Core, String Utils, XPath)        │
└─────────────────────────────────────────────┘
```

---

## 5. Recommended Build Order

### Phase 1: Foundation (Weeks 1-2)

**Goal:** Extract pure utilities with zero Chrome API dependencies

1. **Create `src/lib/dom-automation/` directory**
   - Move element finding logic from `content.tsx`
   - Move label extraction logic
   - Move XPath computation
   - Move iframe/shadow DOM traversal
   - Create comprehensive test suite (Vitest + jsdom)

2. **Create `src/lib/csv-parser.ts`**
   - Extract CSV parsing from `FieldMapper.tsx` and `TestRunner.tsx`
   - Wrap PapaParse with consistent API
   - Add error handling and validation

3. **Create `src/lib/field-mapping.ts`**
   - Extract auto-mapping logic from `FieldMapper.tsx`
   - Normalize string-similarity usage
   - Add configurable threshold

**Success Criteria:**
- ✅ All extracted modules have 80%+ test coverage
- ✅ No Chrome API imports in Layer 0 modules
- ✅ Content script still works (no regressions)

---

### Phase 2: Content Script Split (Weeks 3-4)

**Goal:** Separate recording and playback into distinct modules

4. **Create `src/contentScript/types.ts`**
   - Move all interfaces (Bundle, Step, IframeInfo, LogEventData, etc.)
   - Create shared type definitions

5. **Create `src/contentScript/recorder.ts`**
   - Extract recording functions from `content.tsx`
   - Import from `dom-automation` module
   - Keep Chrome messaging

6. **Create `src/contentScript/replayer.ts`**
   - Extract playback functions from `content.tsx`
   - Import from `dom-automation` module
   - Keep Chrome messaging

7. **Update `src/contentScript/content.tsx`**
   - Become thin orchestrator
   - Import from `recorder.ts` and `replayer.ts`
   - Handle message routing only

**Success Criteria:**
- ✅ Recording works independently
- ✅ Playback works independently
- ✅ `content.tsx` reduced to <300 lines
- ✅ No duplicate code between recorder and replayer

---

### Phase 3: Business Logic Extraction (Weeks 5-6)

**Goal:** Remove business logic from UI components

8. **Create `src/lib/test-orchestrator.ts`**
   - Extract test execution logic from `TestRunner.tsx`
   - Create `executeTest()` function
   - Implement progress callbacks
   - Handle CSV iteration
   - Aggregate results

9. **Update `FieldMapper.tsx`**
   - Use `csv-parser` module
   - Use `field-mapping` module
   - Reduce to pure UI (no business logic)

10. **Update `TestRunner.tsx`**
    - Use `test-orchestrator` module
    - Reduce to pure UI (subscribe to progress)
    - Display results only

**Success Criteria:**
- ✅ Business logic can be tested without React
- ✅ UI components reduced by 30%+ lines
- ✅ Clear separation of concerns

---

### Phase 4: Background Refactor (Weeks 7-8)

**Goal:** Improve message router architecture

11. **Create `src/background/message-handlers.ts`**
    - Extract action handlers from `background.ts`
    - Create handler registry pattern
    - Type-safe action dispatching

12. **Create `src/background/tab-manager.ts`**
    - Extract tab management functions
    - Isolate script injection logic

13. **Update `src/background/background.ts`**
    - Become thin orchestrator
    - Use handler registry
    - Use tab manager

**Success Criteria:**
- ✅ Background script reduced to <150 lines
- ✅ Adding new actions is simple (register handler)
- ✅ Tab management isolated and testable

---

### Phase 5: Testing & Documentation (Weeks 9-10)

**Goal:** Comprehensive testing and documentation

14. **Add unit tests for all modules**
    - DOM automation (Vitest + jsdom)
    - CSV parser (Vitest)
    - Field mapping (Vitest)
    - Test orchestrator (Vitest + mocks)

15. **Add integration tests**
    - Recording flow (Playwright)
    - Playback flow (Playwright)
    - E2E test execution (Playwright)

16. **Update documentation**
    - API documentation for each module
    - Architecture diagrams
    - Migration guide for future contributors

**Success Criteria:**
- ✅ 80%+ overall code coverage
- ✅ All critical paths have integration tests
- ✅ Documentation complete

---

## 6. Risks & Constraints

### Technical Risks

#### 1. **Content Script Bundling**
- **Risk:** Splitting `content.tsx` may increase bundle size
- **Impact:** Slower injection, higher memory usage
- **Mitigation:** 
  - Use Vite code splitting
  - Lazy load non-critical modules
  - Measure bundle size before/after

#### 2. **Shared State Between Modules**
- **Risk:** Recording and playback may share state (e.g., `isRecording` flag)
- **Impact:** Race conditions, bugs
- **Mitigation:**
  - Use message-based state machine
  - Background script manages state
  - Content scripts are stateless

#### 3. **Type Compatibility**
- **Risk:** Moving types to separate file may break existing code
- **Impact:** TypeScript compilation errors
- **Mitigation:**
  - Create types module first
  - Update imports incrementally
  - Use TypeScript compiler to find all usages

#### 4. **Chrome API Mocking Complexity**
- **Risk:** Testing modules with Chrome APIs requires complex mocks
- **Impact:** Tests fragile, hard to maintain
- **Mitigation:**
  - Extract pure functions first (no mocking needed)
  - Use dependency injection for Chrome APIs
  - Create reusable mock library

### Architectural Constraints

#### 1. **Manifest V3 Service Worker**
- **Constraint:** Background script terminates unpredictably
- **Impact:** Cannot hold state in memory
- **Solution:** Persist all state to IndexedDB or chrome.storage

#### 2. **Content Script Context Isolation**
- **Constraint:** Content scripts run in isolated world
- **Impact:** Cannot access page JavaScript directly
- **Solution:** Keep page-interceptor separate (MAIN world context)

#### 3. **No Dynamic Imports in Content Scripts**
- **Constraint:** Chrome restricts dynamic imports in content scripts
- **Impact:** Cannot lazy load modules
- **Solution:** Bundle all content script code together

#### 4. **React in Content Scripts (Current)**
- **Constraint:** `content.tsx` imports React (unnecessary overhead)
- **Impact:** 120KB+ bundle size
- **Solution:** Refactor to vanilla TypeScript (no React in content scripts)

### Migration Risks

#### 1. **Breaking Changes for Users**
- **Risk:** Refactoring may break existing recorded tests
- **Impact:** Users must re-record all tests
- **Mitigation:**
  - Add `bundleVersion` field to Step objects
  - Support legacy formats during transition
  - Provide migration tool if needed

#### 2. **Development Velocity**
- **Risk:** Refactoring slows feature development
- **Impact:** No new features for 10 weeks
- **Mitigation:**
  - Do refactoring in phases (can pause between phases)
  - Allow feature work on non-refactored modules
  - Use feature branches

#### 3. **Testing Coverage Gaps**
- **Risk:** Refactored code without tests may introduce bugs
- **Impact:** Regressions not caught
- **Mitigation:**
  - Write tests BEFORE refactoring
  - Use test-driven refactoring approach
  - Keep integration tests running throughout

---

## 7. Architecture Contracts

### Contract 1: ElementBundle (Core Interface)

```typescript
/**
 * Universal element identification data structure
 * Used by both recording and playback engines
 */
interface ElementBundle {
  // Primary identifiers
  xpath?: string;                        // Position-based XPath
  id?: string;                           // Element ID
  name?: string;                         // Name attribute
  
  // Fallback identifiers
  className?: string;                    // Space-separated classes
  dataAttrs?: Record<string, string>;    // data-* attributes
  aria?: string;                         // ARIA label
  placeholder?: string;                  // Placeholder text
  tag?: string;                          // Tag name (input, button, etc.)
  visibleText?: string;                  // Trimmed inner text
  
  // Context information
  iframeChain?: IframeInfo[];            // Nested iframe path
  shadowHosts?: string[];                // Shadow host XPath chain
  isClosedShadow?: boolean;              // Closed shadow root flag
  
  // Metadata
  bounding?: BoundingBox;                // Position/size
}

interface IframeInfo {
  id?: string;
  name?: string;
  index?: number;
}

interface BoundingBox {
  left: number;
  top: number;
  width?: number;
  height?: number;
}
```

**Invariants:**
- At least one identifier must be non-null
- `iframeChain` ordered outermost to innermost
- `shadowHosts` ordered outermost to innermost
- `dataAttrs` keys do NOT include "data-" prefix

**Versioning:**
- Add `bundleVersion: number` field (default 1)
- Increment on breaking changes
- Support legacy versions indefinitely

---

### Contract 2: Step (Recording/Playback)

```typescript
/**
 * Atomic unit of user interaction
 */
interface Step {
  id: string;                            // Unique ID (UUID or timestamp)
  event: 'click' | 'input' | 'enter';    // Action type
  label?: string;                        // Human-readable label
  value?: string;                        // Input value (for 'input' events)
  bundle: ElementBundle;                 // Element identification
  x?: number;                            // Mouse X coordinate (for 'click')
  y?: number;                            // Mouse Y coordinate (for 'click')
  timestamp?: number;                    // Capture time (ms since epoch)
}
```

**Invariants:**
- `id` is unique within a project
- `event` is one of three allowed values
- `bundle` must have at least one identifier
- `value` only for `input` events
- `x`, `y` only for `click` events

---

### Contract 3: FieldMapping (CSV Mapping)

```typescript
/**
 * Maps CSV column header to step label
 */
interface FieldMapping {
  field_name: string;                    // CSV column header (exact match)
  mapped: boolean;                       // Is field mapped?
  inputvarfields: string;                // Step label (empty if not mapped)
}
```

**Invariants:**
- `field_name` matches CSV header exactly (case-sensitive)
- `mapped` is true IFF `inputvarfields` is non-empty
- N:1 allowed (multiple fields to one label)
- 1:N NOT allowed (one field to multiple labels)

---

### Contract 4: TestConfig (Test Orchestrator)

```typescript
/**
 * Configuration for test execution
 */
interface TestConfig {
  project: Project;                      // Project with recorded_steps
  csvData?: CSVRow[];                    // CSV rows (empty = single run)
  mappings: FieldMapping[];              // Field mappings
  options?: TestOptions;                 // Execution options
}

interface TestOptions {
  closeTabAfterTest?: boolean;           // Clean up tabs (default: false)
  stopOnFirstFailure?: boolean;          // Abort on error (default: false)
  delayBetweenSteps?: number;            // Milliseconds (default: 1000-3000 random)
  maxRetries?: number;                   // Retry failed steps (default: 0)
  onProgress?: ProgressCallback;         // Progress updates
  onStepComplete?: StepCompleteCallback; // Step-level hooks
}

interface TestResult {
  status: 'completed' | 'failed' | 'stopped';
  passedSteps: number;
  failedSteps: number;
  skippedSteps: number;
  duration: number;                      // Milliseconds
  errors: string[];                      // Error messages
}
```

**Invariants:**
- `project.recorded_steps` must be non-empty
- `csvData` rows must match at least one mapping (if provided)
- `mappings` must reference valid step labels
- `onProgress` called after each step (if provided)

---

### Contract 5: Chrome Message Actions

```typescript
/**
 * Type-safe message passing between contexts
 */
type ActionType = 
  | 'add_project'
  | 'update_project'
  | 'get_all_projects'
  | 'delete_project'
  | 'get_project_by_id'
  | 'update_project_steps'
  | 'update_project_fields'
  | 'update_project_csv'
  | 'create_testrun'
  | 'get_testruns'
  | 'openTab'
  | 'close_opened_tab'
  | 'openDashBoard'
  | 'startRecording'
  | 'stopRecording'
  | 'runStep'
  | 'logEvent'
  | 'stepComplete';

interface ActionMessage<T extends ActionType> {
  action: T;
  payload?: ActionPayload<T>;
}

interface ActionResponse<T extends ActionType> {
  success: boolean;
  data?: ResponseData<T>;
  error?: string;
}
```

**Invariants:**
- All messages have `action` field
- All responses have `success` field
- Async handlers return `true` to keep channel open
- Errors populate `error` string

---

## 8. Success Metrics

### Code Quality Metrics

- **Cyclomatic Complexity:** Reduce average from 15 to <10
- **File Size:** No file >500 lines (currently `content.tsx` is 1450)
- **Test Coverage:** Achieve 80%+ coverage (currently 0%)
- **Bundle Size:** Keep content script <300KB (currently ~400KB with React)

### Developer Experience Metrics

- **Onboarding Time:** New developer productive in <3 days (currently ~1 week)
- **Build Time:** Keep under 10 seconds for dev builds
- **PR Size:** Average PR <300 lines (currently 500+)
- **Code Review Time:** <2 hours per PR (currently 4+ hours)

### Reliability Metrics

- **Element Finding Success Rate:** >95% on first attempt
- **Test Execution Reliability:** >99% for stable tests
- **Extension Crash Rate:** <0.1% of sessions
- **Data Loss Rate:** 0% (no lost projects or test runs)

---

## Conclusion

This modularization plan provides a clear roadmap for refactoring Muffin into well-defined, loosely-coupled modules over a 10-week period. The phased approach minimizes risk by:

1. **Extracting pure utilities first** (no Chrome APIs, easy to test)
2. **Splitting content script second** (high-risk but high-value)
3. **Extracting business logic third** (improves UI components)
4. **Refactoring background fourth** (low-risk, improves maintainability)
5. **Adding tests throughout** (prevents regressions)

**Key Benefits:**
- ✅ Easier testing and maintenance
- ✅ Clearer code ownership
- ✅ Better performance (code splitting)
- ✅ Improved type safety
- ✅ Simplified onboarding

**Next Steps:**
1. Review this plan with team
2. Create GitHub issues for each phase
3. Set up Vitest testing infrastructure
4. Begin Phase 1: DOM Automation Core extraction

---

## Phase 3 Integration Considerations

**Status:** Phase 3 Specifications Complete (46 documents: A1-H6)

### Phase 3 Modularization Impacts
The Phase 3 multi-layer recording system introduces additional complexity that should inform modularization priorities:

#### 1. Enhanced Element Finding Module
- **7-Tier Selector Strategy:** Requires extensible strategy pattern implementation
- **Multi-Context Support:** Must handle main window, iframes, shadow DOMs simultaneously
- **Validation Integration:** Element finding must support pre-execution validation (TST-009)

#### 2. Recording Engine Enhancements
- **Multi-Layer Capture:** Extract `MultiLayerRecorder` as separate module from monolithic content script
- **Context Management:** `ContextTracker` should be separate utility (tracks iframe chains, shadow root paths)
- **Event Aggregation:** Central event bus for cross-context recording

#### 3. Playback Engine Improvements
- **Strategy Pattern:** Each tier in 7-tier fallback = separate strategy class
- **Retry Logic:** Extract retry/backoff logic into reusable `RetryManager`
- **Error Recovery:** `ErrorRecoveryService` module for automatic fallback handling

#### 4. Validation Framework
- **New Module:** `ValidationEngine` for real-time step validation
- **Dependencies:** DOM Automation Core, Element Finding Strategies
- **Integration:** Hooks into Recording Engine and Playback Engine

#### 5. Recommended Module Additions (Phase 3)
```typescript
src/lib/
├── dom-automation/           # Phase 1 (existing plan)
├── selector-strategies/      # NEW: 7-tier fallback strategies
│   ├── IDStrategy.ts
│   ├── DataTestIdStrategy.ts
│   ├── AriaLabelStrategy.ts
│   ├── NameStrategy.ts
│   ├── XPathStrategy.ts
│   ├── TextSimilarityStrategy.ts
│   └── PositionStrategy.ts
├── multi-layer-recording/    # NEW: Cross-context capture
│   ├── ContextTracker.ts
│   ├── EventAggregator.ts
│   └── MultiLayerRecorder.ts
├── validation/               # NEW: Step validation framework
│   ├── ValidationEngine.ts
│   ├── ElementValidator.ts
│   └── StepValidator.ts
└── error-recovery/           # NEW: Automatic fallback handling
    ├── RetryManager.ts
    ├── ErrorRecoveryService.ts
    └── FallbackStrategies.ts
```

### Updated Build Order (with Phase 3)

**Phase 1-3:** Follow existing plan (DOM Automation, Content Script Split, Business Logic)

**Phase 4 (NEW):** Phase 3 System Integration (Weeks 7-8)
1. Extract 7-tier selector strategies
2. Build ValidationEngine module
3. Implement MultiLayerRecorder
4. Add RetryManager and ErrorRecoveryService
5. Integrate validation hooks into Recording and Playback engines

**Phase 5:** Background Refactoring (Week 9)
**Phase 6:** CI/CD and Documentation (Week 10)

### Success Metrics (Phase 3)
- ✅ 7-tier fallback successfully modularized (100% strategy coverage)
- ✅ Multi-layer recording supports ≥3 simultaneous contexts
- ✅ Validation framework reduces playback errors by ≥40%
- ✅ Error recovery automatically falls back without user intervention
- ✅ Test coverage ≥80% for all Phase 3 modules

### Related Documentation
- **Component Breakdowns:** 40 files with Phase 3 integration points
- **Specifications:** 46 Phase 3 specs (A1-H6) in `analysis-resources/references/`
- **Technical Reference:** `TECHNICAL_REFERENCE.md` with Phase 3 architecture patterns
