# Modularization Blueprint: Muffin Test Automation Platform

**Created:** December 1, 2025  
**Purpose:** Define clear module boundaries, dependencies, and build order for future refactoring/rebuilding  
**Based on:** 32 component breakdowns + meta-analysis

---

## 1. Purpose of Modularization

### Why Muffin Benefits from Modular Architecture

**Current State Challenges:**
- **Monolithic content script** (1450+ lines in content.tsx) with recording + playback + DOM utilities tightly coupled
- **Unclear boundaries** between UI components and business logic (e.g., TestRunner contains orchestration logic)
- **Cross-cutting concerns** scattered (logging, error handling, element finding strategies)
- **Difficult testing** due to tight coupling between DOM manipulation, Chrome APIs, and UI state
- **Code duplication** across similar subsystems (project-repository vs test-run-repository)
- **Hard to extend** new automation strategies (e.g., adding visual selector fallback requires changes in multiple files)

**Benefits of Modularization:**

1. **Independent Development**: Teams can work on recording engine vs. playback engine vs. UI without conflicts
2. **Reusability**: DOM manipulation utilities (element finder, label extraction, iframe handler) can be extracted into standalone packages
3. **Testability**: Pure functions with defined contracts enable unit testing without Chrome API mocks
4. **Maintainability**: Clear ownership boundaries reduce cognitive load (e.g., "CSV parsing module owns all PapaParse logic")
5. **Extensibility**: New element finding strategies or label extraction heuristics can be added via plugin system
6. **Performance**: Lazy loading of modules (e.g., field-mapping-engine only loaded when needed)
7. **Type Safety**: Explicit interfaces between modules prevent implicit coupling through shared mutable state

**Strategic Goals:**
- Separate **Chrome extension concerns** (messaging, tabs, storage) from **pure business logic** (element finding, label extraction)
- Extract **DOM automation primitives** into reusable library (usable outside Chrome extensions)
- Create **clear data flow** from recording → mapping → playback with immutable contracts
- Enable **incremental migration** (old code can coexist with modularized code during transition)

---

## 2. Identified Subsystems

Based on 32 component breakdowns, grouped by functional domain:

### **Core Recording Engine**
1. **content-script-recorder** - Captures user interactions (click, input, keypress) with full element metadata
2. **step-capture-engine** - Transforms raw browser events into structured Step objects with enriched data
3. **dom-label-extraction** - Extracts human-readable labels for form fields using 16 cascading strategies
4. **xpath-computation** - Generates position-based XPath expressions for element identification

### **Core Playback Engine**
5. **content-script-replayer** - Replays recorded steps with multi-strategy element finding and action execution
6. **dom-element-finder** - Locates target elements using 6+ progressive fallback strategies (XPath, ID, class, data-attrs, ARIA, placeholder)
7. **test-orchestrator** - Coordinates CSV iteration, tab management, step execution, and result aggregation

### **DOM Manipulation Primitives**
8. **iframe-handler** - Cross-frame DOM traversal for recording/playback in nested iframes
9. **shadow-dom-handler** - Shadow DOM traversal with workarounds for closed shadow roots
10. **page-interceptor** - Monkey patches `Element.prototype.attachShadow` to track closed shadow roots

### **Data Management**
11. **indexeddb-storage** - Dexie.js wrapper providing singleton database instance
12. **project-repository** - CRUD operations for projects table (create, read, update, delete projects)
13. **test-run-repository** - CRUD operations for test runs table (execution history tracking)

### **Field Mapping & CSV Processing**
14. **csv-parser** - PapaParse integration for parsing CSV files into structured data
15. **field-mapping-engine** - String similarity algorithm for automatic CSV column to step label matching
16. **field-mapper-ui** - User interface for manual and automatic field mapping

### **Test Execution**
17. **test-runner-ui** - User interface displaying real-time test progress, logs, and results
18. **test-logger** - Centralized logging system with timestamp formatting and log level classification
19. **notification-overlay** - In-page visual feedback during test playback (success/error notifications)

### **Chrome Extension Infrastructure**
20. **background-service-worker** - Central message routing hub managing lifecycle and cross-context communication
21. **message-router** - Routes 15+ action types between UI pages, content scripts, and background tasks
22. **tab-manager** - Browser tab lifecycle management (create, inject scripts, cleanup)
23. **injection-manager** - Content script injection orchestration for different execution contexts

### **UI Components**
24. **dashboard-ui** - Main project management interface with card grid, search, and CRUD operations
25. **recorder-ui** - Recording interface displaying live step capture with editing capabilities
26. **project-crud** - Modal dialogs for creating, editing, and deleting projects
27. **step-table-management** - Interactive step list with drag-drop reordering and inline editing

### **Supporting Infrastructure**
28. **router-navigation** - React Router hash-based routing configuration for extension pages
29. **redux-state-management** - Minimal Redux store (currently only theme state)
30. **ui-design-system** - Reusable component library built on Radix UI + Tailwind CSS
31. **chrome-storage-helper** - Promise-based wrapper around Chrome storage.sync API
32. **build-pipeline** - Dual Vite build configuration for UI and background service worker

---

## 3. Proposed Module Boundaries

### **Module 1: DOM Automation Core** (Pure Library - No Chrome APIs)

**Purpose:** Reusable DOM manipulation primitives usable in any JavaScript context.

**External Interface:**
```typescript
// Element Finding
export function findElement(bundle: ElementBundle, doc: Document): HTMLElement | null;
export function findElementWithStrategies(strategies: FindStrategy[], bundle: ElementBundle): HTMLElement | null;

// Label Extraction
export function extractLabel(element: HTMLElement): string | undefined;
export function extractLabelWithStrategies(strategies: LabelStrategy[], element: HTMLElement): string | undefined;

// XPath
export function computeXPath(element: HTMLElement): string;
export function evaluateXPath(xpath: string, doc: Document): HTMLElement | null;

// Frame Handling
export function buildIframeChain(element: HTMLElement): IframeInfo[];
export function traverseIframes(doc: Document, chain: IframeInfo[]): Document;

// Shadow DOM
export function buildShadowHostChain(element: HTMLElement): string[];
export function traverseShadowRoots(doc: Document, shadowHosts: string[]): ShadowRoot | Document;

// Element Bundle
export function createElementBundle(element: HTMLElement): ElementBundle;
```

**Internal Details (Private):**
- Individual label extraction strategies (Google Forms, Bootstrap, Select2, ARIA, etc.)
- Individual element finding strategies (ID, class, data-attrs, placeholder, etc.)
- XPath generation algorithm
- Shadow root detection logic
- Iframe context resolution

**Coupling Rules:**
- ✅ **MAY** depend on: Pure TypeScript utilities, DOM APIs (document, element, window)
- ❌ **MUST NOT** depend on: Chrome APIs, React, Redux, IndexedDB, UI components
- ❌ **MUST NOT** have side effects (logging, storage, network calls)

**Contracts:**
- All functions pure (no global state mutation)
- Synchronous execution (no async/await)
- Browser-native types only (HTMLElement, Document, ShadowRoot)

---

### **Module 2: Recording Engine** (Chrome Extension - Content Script)

**Purpose:** Capture user interactions and transform into structured steps.

**External Interface:**
```typescript
// Event Recording
export function startRecording(targetWindow: Window): RecordingSession;
export function stopRecording(session: RecordingSession): void;

// Step Management
export function getRecordedSteps(session: RecordingSession): Step[];
export function clearSteps(session: RecordingSession): void;

// Event Handling
export type EventHandler = (event: Event) => void;
export function attachEventListeners(doc: Document, handler: EventHandler): CleanupFn;
```

**Internal Details:**
- Event listeners (click, input, keydown, change)
- Debouncing logic (prevent duplicate events)
- Step validation (filter invalid/empty steps)
- Message sending to recorder UI

**Coupling Rules:**
- ✅ **MAY** depend on: DOM Automation Core, Chrome runtime API (sendMessage)
- ❌ **MUST NOT** depend on: IndexedDB, React components, background service worker logic

**Contracts:**
- Steps emitted as immutable objects
- Event listeners cleaned up on stopRecording
- No DOM mutation (observation only)

---

### **Module 3: Playback Engine** (Chrome Extension - Content Script)

**Purpose:** Replay recorded steps with robust element finding and action execution.

**External Interface:**
```typescript
// Playback Control
export function startPlayback(steps: Step[], options: PlaybackOptions): PlaybackSession;
export function stopPlayback(session: PlaybackSession): void;
export function pausePlayback(session: PlaybackSession): void;
export function resumePlayback(session: PlaybackSession): void;

// Step Execution
export function executeStep(step: Step, prevStep?: Step): Promise<StepResult>;
export function executeAction(element: HTMLElement, action: Action): Promise<void>;

// Notifications
export function showNotification(message: string, type: NotificationType): void;
```

**Internal Details:**
- Element finding fallback chain
- Action execution (click, input, enter)
- React-safe input manipulation (setNativeValue)
- Delay injection (human-like timing)
- Error recovery strategies

**Coupling Rules:**
- ✅ **MAY** depend on: DOM Automation Core, Chrome runtime API (sendMessage)
- ❌ **MUST NOT** depend on: Recording engine, IndexedDB, UI components

**Contracts:**
- Steps executed sequentially (no parallel execution)
- Each step returns success/failure status
- Element not found = failed step (not exception)

---

### **Module 4: Data Persistence Layer**

**Purpose:** Abstract IndexedDB operations behind repository pattern.

**External Interface:**
```typescript
// Project Repository
export interface ProjectRepository {
  create(project: Omit<Project, 'id'>): Promise<number>;
  getById(id: number): Promise<Project | undefined>;
  getAll(): Promise<Project[]>;
  update(project: Project): Promise<void>;
  delete(id: number): Promise<void>;
  query(filter: ProjectFilter): Promise<Project[]>;
}

// TestRun Repository
export interface TestRunRepository {
  create(testRun: Omit<TestRun, 'id'>): Promise<number>;
  getById(id: number): Promise<TestRun | undefined>;
  getByProjectId(projectId: number): Promise<TestRun[]>;
  update(testRun: TestRun): Promise<void>;
  delete(id: number): Promise<void>;
}

// Database Factory
export function createDatabase(): Promise<Database>;
export function getDatabaseInstance(): Database;
```

**Internal Details:**
- Dexie.js configuration
- Schema versioning
- Index definitions
- Migration logic (future)

**Coupling Rules:**
- ✅ **MAY** depend on: Dexie.js, TypeScript types
- ❌ **MUST NOT** depend on: Chrome APIs (beyond storage), UI components, business logic

**Contracts:**
- All operations return Promises
- IDs are auto-incremented numbers
- Timestamps in milliseconds (Date.now())
- No cascading deletes (caller responsibility)

---

### **Module 5: Field Mapping Engine**

**Purpose:** Match CSV columns to recorded step labels using fuzzy string matching.

**External Interface:**
```typescript
// Auto-Mapping
export function autoMapFields(
  csvHeaders: string[],
  stepLabels: string[],
  threshold?: number
): FieldMapping[];

// Manual Mapping
export function createMapping(csvHeader: string, stepLabel: string): FieldMapping;
export function validateMapping(mapping: FieldMapping, steps: Step[]): ValidationResult;

// CSV Parsing
export function parseCSV(file: File): Promise<ParsedCSV>;
export function previewCSV(file: File, rowLimit: number): Promise<CSVRow[]>;
```

**Internal Details:**
- String normalization (lowercase, strip spaces/underscores)
- Dice coefficient algorithm (via string-similarity)
- Similarity threshold tuning
- PapaParse configuration

**Coupling Rules:**
- ✅ **MAY** depend on: PapaParse, string-similarity library
- ❌ **MUST NOT** depend on: React, Chrome APIs, IndexedDB, UI components

**Contracts:**
- CSV must have header row
- Mappings are 1:1 (one CSV column to one step label)
- Unmapped fields allowed (skipped during execution)

---

### **Module 6: Test Orchestrator**

**Purpose:** Coordinate end-to-end test execution with CSV iteration.

**External Interface:**
```typescript
// Test Execution
export function executeTest(config: TestConfig): Promise<TestResult>;
export function executeBatch(config: BatchTestConfig): Promise<BatchResult>;

// Lifecycle Hooks
export type BeforeStepHook = (step: Step, context: ExecutionContext) => Promise<void>;
export type AfterStepHook = (step: Step, result: StepResult, context: ExecutionContext) => Promise<void>;

// Progress Tracking
export type ProgressCallback = (progress: TestProgress) => void;
export function subscribeToProgress(callback: ProgressCallback): UnsubscribeFn;
```

**Internal Details:**
- CSV row iteration logic
- Tab creation/cleanup
- Content script injection
- Step execution loop
- Result aggregation
- Error recovery

**Coupling Rules:**
- ✅ **MAY** depend on: Chrome tabs API, Chrome runtime API, Field Mapping Engine, Data Persistence Layer
- ❌ **MUST NOT** depend on: UI components (callbacks for progress updates only)

**Contracts:**
- Test execution is sequential (one row at a time)
- Failed steps don't stop execution (continue to next)
- Tab cleanup is caller responsibility (optional)

---

### **Module 7: Message Bus** (Chrome Extension Infrastructure)

**Purpose:** Central message routing with type-safe action dispatching.

**External Interface:**
```typescript
// Action Registration
export function registerHandler<T extends ActionType>(
  action: T,
  handler: ActionHandler<T>
): void;

// Message Sending
export function sendAction<T extends ActionType>(
  action: T,
  payload: ActionPayload<T>
): Promise<ActionResponse<T>>;

// Listener Management
export function startMessageBus(): void;
export function stopMessageBus(): void;
```

**Internal Details:**
- Action type registry
- Handler routing map
- Response channel management
- Error handling (failed handlers)

**Coupling Rules:**
- ✅ **MAY** depend on: Chrome runtime API, TypeScript types
- ❌ **MUST NOT** depend on: Business logic (handlers injected by modules)

**Contracts:**
- All actions have type-safe payloads
- Handlers registered before messages sent
- Async handlers must return Promises
- Always return `true` from listener to keep channel open

---

### **Module 8: UI Layer** (React Components)

**Purpose:** User-facing interfaces for dashboard, recorder, mapper, runner.

**External Interface:**
```typescript
// Page Components (exported from React Router)
export const Dashboard: React.FC;
export const Recorder: React.FC;
export const FieldMapper: React.FC;
export const TestRunner: React.FC;

// Shared UI Components
export { Button, Card, Input, Dialog, Select, Tabs, Badge, Progress, Alert } from './Ui';

// Hooks
export function useProject(projectId: number): [Project | null, boolean, Error | null];
export function useTestRuns(projectId: number): [TestRun[], boolean, Error | null];
export function useRecording(): RecordingControls;
```

**Internal Details:**
- Page-specific state management (useState, useEffect)
- Form handling
- Navigation (React Router)
- Component composition

**Coupling Rules:**
- ✅ **MAY** depend on: Message Bus (via sendAction), UI Design System, React Router
- ❌ **MUST NOT** depend on: Chrome APIs directly (use Message Bus), IndexedDB directly (use Message Bus), Content script logic

**Contracts:**
- All Chrome API calls via Message Bus
- All IndexedDB operations via Message Bus (background proxy)
- UI components are presentational (minimal logic)

---

### **Module 9: Build System**

**Purpose:** Compile and bundle extension for multiple contexts.

**External Interface:**
```bash
# Development
npm run dev           # Start dev server
npm run dev:bg        # Watch background script

# Production
npm run build         # Build UI + content scripts
npm run build:bg      # Build background service worker
npm run postbuild     # Copy manifest

# Combined
npm run build:all     # Build everything
```

**Internal Details:**
- Vite configuration (dual configs)
- TypeScript compilation
- Asset optimization (CSS, fonts, images)
- Source map generation
- Manifest copying

**Coupling Rules:**
- ✅ **MAY** depend on: Vite, TypeScript, PostCSS, Tailwind
- ❌ **MUST NOT** depend on: Application code (build system is independent)

**Contracts:**
- Output to `dist/` directory
- Background script as ES module (MV3 requirement)
- Content scripts bundled separately from UI
- Source maps enabled for debugging

---

## 4. Dependency Map

### **Layer 0: Foundation (No Dependencies)**

**DOM Automation Core**
- Depends on: None (pure library)
- Depended on by: Recording Engine, Playback Engine, Field Mapping Engine
- Critical integration points: ElementBundle interface, findElement function, extractLabel function

**Build System**
- Depends on: None (infrastructure)
- Depended on by: All modules (compilation)
- Critical integration points: Vite configs, output directory structure

---

### **Layer 1: Chrome Extension Primitives**

**Message Bus**
- Depends on: Chrome runtime API
- Depended on by: UI Layer, Test Orchestrator, Recording Engine, Playback Engine
- Critical integration points: Action type definitions, sendAction function

**Data Persistence Layer**
- Depends on: Dexie.js, IndexedDB API
- Depended on by: UI Layer (via Message Bus), Test Orchestrator
- Critical integration points: ProjectRepository interface, TestRunRepository interface

**Chrome Storage Helper**
- Depends on: Chrome storage API
- Depended on by: Redux State Management (potentially), UI components
- Critical integration points: StorageHelper.get/set methods

---

### **Layer 2: Business Logic**

**Recording Engine**
- Depends on: DOM Automation Core, Message Bus
- Depended on by: Recorder UI
- Critical integration points: startRecording function, Step type definition

**Playback Engine**
- Depends on: DOM Automation Core, Message Bus
- Depended on by: Test Orchestrator
- Critical integration points: executeStep function, StepResult type

**Field Mapping Engine**
- Depends on: PapaParse, string-similarity library
- Depended on by: Field Mapper UI, Test Orchestrator
- Critical integration points: autoMapFields function, FieldMapping type

**Page Interceptor** (Special Case)
- Depends on: None (injected into page context)
- Depended on by: Shadow DOM Handler, Playback Engine
- Critical integration points: Closed shadow root WeakMap

---

### **Layer 3: Orchestration**

**Test Orchestrator**
- Depends on: Playback Engine, Field Mapping Engine, Message Bus, Data Persistence Layer, Tab Manager
- Depended on by: Test Runner UI
- Critical integration points: executeTest function, TestConfig type, ProgressCallback

**Tab Manager**
- Depends on: Chrome tabs API, Chrome scripting API, Injection Manager
- Depended on by: Test Orchestrator
- Critical integration points: openTab function, closeTab function

**Injection Manager**
- Depends on: Chrome scripting API
- Depended on by: Tab Manager, Background Service Worker
- Critical integration points: Script injection configuration

---

### **Layer 4: User Interface**

**UI Design System**
- Depends on: Radix UI, Tailwind CSS, class-variance-authority
- Depended on by: All UI components
- Critical integration points: Button, Card, Input, Dialog components

**Dashboard UI**
- Depends on: UI Design System, Message Bus, React Router
- Depended on by: None (top-level page)
- Critical integration points: Project CRUD operations via Message Bus

**Recorder UI**
- Depends on: UI Design System, Message Bus, Recording Engine (via Message Bus), Step Table Management
- Depended on by: None (top-level page)
- Critical integration points: log_event message listener

**Field Mapper UI**
- Depends on: UI Design System, Message Bus, Field Mapping Engine, CSV Parser
- Depended on by: None (top-level page)
- Critical integration points: CSV upload, field mapping table

**Test Runner UI**
- Depends on: UI Design System, Message Bus, Test Orchestrator (via Message Bus), Test Logger
- Depended on by: None (top-level page)
- Critical integration points: runTest function invocation, progress updates

**Project CRUD**
- Depends on: UI Design System, Message Bus
- Depended on by: Dashboard UI
- Critical integration points: Create/Edit/Delete dialogs

**Step Table Management**
- Depends on: UI Design System, react-beautiful-dnd
- Depended on by: Recorder UI
- Critical integration points: Drag-drop event handling

---

### **Layer 5: Application Shell**

**Background Service Worker**
- Depends on: Message Bus, Data Persistence Layer, Tab Manager
- Depended on by: All contexts (message routing hub)
- Critical integration points: chrome.runtime.onMessage listener

**Router Navigation**
- Depends on: React Router, UI pages
- Depended on by: Application entry point (App.tsx)
- Critical integration points: HashRouter, route definitions

**Redux State Management**
- Depends on: Redux Toolkit, React-Redux
- Depended on by: UI components (theme state)
- Critical integration points: store, theme slice

---

### **Dependency Flow Diagram**

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: UI Pages (Dashboard, Recorder, FieldMapper, Runner)│
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Test Orchestrator + Tab Manager                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Recording Engine + Playback Engine + Field Mapping │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Message Bus + Data Persistence Layer               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 0: DOM Automation Core (Pure Library)                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Recommended Build Order

### **Phase 1: Foundation (Weeks 1-2)**

1. **DOM Automation Core** (Pure Library)
   - Rationale: Zero dependencies, reusable across all modules
   - Deliverables: Element finder, label extractor, XPath generator, iframe/shadow handlers
   - Success criteria: 100% unit test coverage, no Chrome API dependencies

2. **Build System** (Refactor)
   - Rationale: Must compile modules correctly before building higher layers
   - Deliverables: Unified build command, module bundling config, dev server setup
   - Success criteria: `npm run build:all` produces working extension

3. **Data Persistence Layer** (Repository Pattern)
   - Rationale: Independent of UI and business logic, required by many modules
   - Deliverables: ProjectRepository, TestRunRepository, Database factory
   - Success criteria: CRUD operations work via Promise-based API

---

### **Phase 2: Infrastructure (Weeks 3-4)**

4. **Message Bus** (Type-Safe Actions)
   - Rationale: Required for all cross-context communication
   - Deliverables: Action registry, handler routing, sendAction function
   - Success criteria: UI → Background → Content script message flow works

5. **Chrome Storage Helper** (Wrapper)
   - Rationale: Minimal utility, quick to implement
   - Deliverables: Promise-based get/set/remove/clear methods
   - Success criteria: Theme preference persists across sessions

6. **Page Interceptor** (Special Case)
   - Rationale: Must run early, minimal dependencies
   - Deliverables: attachShadow monkey patch, WeakMap storage
   - Success criteria: Closed shadow roots accessible during replay

---

### **Phase 3: Recording Pipeline (Weeks 5-7)**

7. **Recording Engine** (Content Script)
   - Rationale: Depends on DOM Automation Core + Message Bus
   - Deliverables: Event listeners, step capture, message sending
   - Success criteria: Click/input/enter events captured with full bundles

8. **Step Capture Engine** (Transformation Logic)
   - Rationale: Transforms raw events into Step objects
   - Deliverables: Event-to-step mapping, bundle enrichment
   - Success criteria: Steps include XPath, label, iframe chain, shadow hosts

9. **Recorder UI** (React Page)
   - Rationale: Displays recorded steps in real-time
   - Deliverables: Recording controls, step list, save/edit functionality
   - Success criteria: Steps displayed immediately after capture

10. **Step Table Management** (UI Component)
    - Rationale: Used by Recorder UI for drag-drop
    - Deliverables: Draggable step rows, inline editing
    - Success criteria: Steps can be reordered and deleted

---

### **Phase 4: Playback Pipeline (Weeks 8-10)**

11. **Playback Engine** (Content Script)
    - Rationale: Depends on DOM Automation Core + Message Bus
    - Deliverables: Element finding, action execution, notification system
    - Success criteria: Steps replay successfully with fallback strategies

12. **Test Logger** (Logging System)
    - Rationale: Required by Test Orchestrator for progress tracking
    - Deliverables: addLog function, LogEntry type, timestamp formatting
    - Success criteria: Logs displayed in TestConsole with color coding

13. **Notification Overlay** (In-Page Feedback)
    - Rationale: Used by Playback Engine for user feedback
    - Deliverables: showNotification function, auto-dismiss logic
    - Success criteria: Notifications appear during playback

14. **Test Orchestrator** (Execution Coordinator)
    - Rationale: Depends on Playback Engine, Tab Manager, Field Mapping Engine
    - Deliverables: executeTest function, CSV iteration, result aggregation
    - Success criteria: Multi-row CSV tests execute sequentially

15. **Test Runner UI** (React Page)
    - Rationale: Displays test execution progress
    - Deliverables: Progress bar, console logs, step status, test history
    - Success criteria: Real-time updates during execution

---

### **Phase 5: Field Mapping (Weeks 11-12)**

16. **CSV Parser** (PapaParse Wrapper)
    - Rationale: Standalone utility, no dependencies on other modules
    - Deliverables: parseCSV function, preview function
    - Success criteria: CSV files parsed into JSON arrays

17. **Field Mapping Engine** (Auto-Mapping)
    - Rationale: Depends on string-similarity library
    - Deliverables: autoMapFields function, similarity scoring
    - Success criteria: 80%+ accuracy on common field names (email, password, name)

18. **Field Mapper UI** (React Page)
    - Rationale: Depends on CSV Parser + Field Mapping Engine
    - Deliverables: CSV upload, mapping table, auto-map button
    - Success criteria: Users can map CSV columns to step labels

---

### **Phase 6: Application Shell (Weeks 13-14)**

19. **Tab Manager** (Chrome Tabs API Wrapper)
    - Rationale: Required by Test Orchestrator
    - Deliverables: openTab, closeTab, injection coordination
    - Success criteria: Tabs created/closed reliably during tests

20. **Injection Manager** (Script Injection)
    - Rationale: Required by Tab Manager
    - Deliverables: Content script injection, page-context injection
    - Success criteria: Scripts injected into correct contexts

21. **Background Service Worker** (Message Router)
    - Rationale: Central hub for all contexts
    - Deliverables: Message routing, IndexedDB proxy, tab lifecycle management
    - Success criteria: All message types routed correctly

22. **Router Navigation** (React Router Config)
    - Rationale: Required for multi-page navigation
    - Deliverables: Route definitions, HashRouter wrapper
    - Success criteria: Navigation between pages works

---

### **Phase 7: UI Components (Weeks 15-16)**

23. **UI Design System** (Component Library)
    - Rationale: Used by all UI pages
    - Deliverables: Button, Card, Input, Dialog, Select, Tabs, Badge, Progress, Alert
    - Success criteria: Components work across Dashboard, Recorder, FieldMapper, TestRunner

24. **Dashboard UI** (Project Management)
    - Rationale: Entry point for users
    - Deliverables: Project cards, search, create/edit/delete dialogs
    - Success criteria: Projects listed, created, edited, deleted

25. **Project CRUD** (UI Modals)
    - Rationale: Used by Dashboard UI
    - Deliverables: CreateProjectDialog, EditProjectModal, ConfirmationModal
    - Success criteria: Projects created/edited via forms

26. **Redux State Management** (Theme State)
    - Rationale: Minimal global state
    - Deliverables: Theme slice, store configuration
    - Success criteria: Theme toggles between light/dark

---

### **Phase 8: Polish & Optimization (Weeks 17-18)**

27. **Error Handling** (Cross-Cutting Concern)
    - Rationale: Improve reliability across all modules
    - Deliverables: Try-catch wrappers, error boundaries, retry logic
    - Success criteria: Graceful degradation when steps fail

28. **Performance Optimization**
    - Rationale: Reduce bundle size, improve load times
    - Deliverables: Code splitting, lazy loading, tree shaking
    - Success criteria: Initial load <2s, background script <100KB

29. **Documentation**
    - Rationale: Enable future maintenance
    - Deliverables: API docs, architecture diagrams, migration guides
    - Success criteria: New developers onboard in <1 week

30. **Testing Suite**
    - Rationale: Prevent regressions
    - Deliverables: Unit tests (Jest), integration tests (Playwright), E2E tests
    - Success criteria: 80%+ code coverage

---

## 6. Risks & Constraints

### **Technical Debt Blocking Modularity**

1. **Monolithic content.tsx (1450 lines)**
   - **Risk:** Recording + Playback + DOM utilities tightly coupled
   - **Impact:** Cannot extract individual modules without breaking functionality
   - **Mitigation:** Incremental refactor using Adapter pattern (wrap existing functions in new interfaces)
   - **Timeline:** Phase 3-4 (8 weeks)

2. **Global state in content script**
   - **Risk:** Shared mutable state between recording and playback (e.g., `isRecording` flag)
   - **Impact:** Race conditions, unpredictable behavior
   - **Mitigation:** Use message-based state machine (background manages state, content scripts stateless)
   - **Timeline:** Phase 3 (Week 5)

3. **Implicit dependencies via Chrome messaging**
   - **Risk:** No type safety, action types hardcoded as strings
   - **Impact:** Breaking changes not caught at compile time
   - **Mitigation:** Introduce ActionType enum + type guards in Message Bus
   - **Timeline:** Phase 2 (Week 3)

4. **IndexedDB access from UI components**
   - **Risk:** Direct Dexie calls in React components (bypassing background proxy)
   - **Impact:** Violates Manifest V3 best practices, hard to test
   - **Mitigation:** Enforce all DB access via Message Bus (background proxy)
   - **Timeline:** Phase 2 (Week 4)

---

### **Potential Breakages During Refactor**

1. **XPath generation changes**
   - **Risk:** Refactoring xpath-computation may produce different XPaths
   - **Impact:** Existing recorded tests may not replay correctly
   - **Mitigation:** Version Step objects (add `schemaVersion` field), support legacy XPath format
   - **Timeline:** Phase 3 (Week 6)

2. **Element finding strategy order**
   - **Risk:** Changing fallback order may find different elements
   - **Impact:** Tests replay differently than recorded
   - **Mitigation:** Store strategy index in bundle (record which strategy was used)
   - **Timeline:** Phase 4 (Week 8)

3. **Label extraction strategy changes**
   - **Risk:** New label extraction heuristics may change recorded labels
   - **Impact:** Field mappings break (CSV columns no longer match)
   - **Mitigation:** Store label extraction version in bundle, allow re-extraction
   - **Timeline:** Phase 3 (Week 7)

4. **Message format changes**
   - **Risk:** Changing action payloads breaks existing message handlers
   - **Impact:** Background ↔ Content script communication fails
   - **Mitigation:** Use message versioning (add `version` field to all messages)
   - **Timeline:** Phase 2 (Week 3)

---

### **Tight Couplings to Address**

1. **TestRunner UI + Test Orchestrator**
   - **Current:** Orchestration logic embedded in React component (runTest function in TestRunner.tsx)
   - **Problem:** Cannot reuse orchestration logic, hard to test
   - **Solution:** Extract Test Orchestrator to separate module, TestRunner subscribes to progress via callbacks
   - **Timeline:** Phase 4 (Week 10)

2. **FieldMapper UI + Field Mapping Engine**
   - **Current:** Auto-mapping algorithm embedded in UI component
   - **Problem:** Cannot reuse algorithm, no unit tests
   - **Solution:** Extract autoMapFields to Field Mapping Engine, FieldMapper calls via pure function
   - **Timeline:** Phase 5 (Week 11)

3. **Content Script Recorder + DOM Automation Core**
   - **Current:** Label extraction and XPath generation inline in event handlers
   - **Problem:** Duplication with Playback Engine, hard to test
   - **Solution:** Extract to DOM Automation Core, both engines import functions
   - **Timeline:** Phase 1 (Week 1)

4. **Background Service Worker + Data Persistence Layer**
   - **Current:** Dexie calls inline in message handlers
   - **Problem:** Cannot mock DB for testing, violates SRP
   - **Solution:** Inject repositories into message handlers, use dependency injection
   - **Timeline:** Phase 2 (Week 4)

---

### **Chrome Extension Constraints**

1. **Manifest V3 Service Worker Lifecycle**
   - **Risk:** Background service worker can terminate at any time
   - **Impact:** In-memory state (e.g., recording session) lost
   - **Mitigation:** Persist all state to IndexedDB or chrome.storage, stateless handlers
   - **Timeline:** Ongoing (all phases)

2. **Content Script Injection Timing**
   - **Risk:** Page load may complete before content script injected
   - **Impact:** Recording starts late, misses initial page state
   - **Mitigation:** Use `run_at: "document_start"` in manifest, add MutationObserver fallback
   - **Timeline:** Phase 3 (Week 5)

3. **Cross-Origin Iframe Restrictions**
   - **Risk:** Cannot access contentDocument of cross-origin iframes
   - **Impact:** Recording/playback fails in cross-origin iframes
   - **Mitigation:** Document limitation, provide user guidance (use same-origin test environments)
   - **Timeline:** N/A (not solvable)

4. **Closed Shadow Root Access**
   - **Risk:** Page Interceptor must run before shadow roots created
   - **Impact:** If injected late, closed shadow roots inaccessible
   - **Mitigation:** Inject page-interceptor.js as early as possible, use `world: "MAIN"`
   - **Timeline:** Phase 2 (Week 4)

---

### **Build System Constraints**

1. **Dual Vite Configs**
   - **Risk:** Background script and UI have separate builds, easy to forget one
   - **Impact:** Broken extension (background not updated)
   - **Mitigation:** Single `build:all` command that runs both, CI/CD pipeline validation
   - **Timeline:** Phase 1 (Week 2)

2. **Content Script Bundling**
   - **Risk:** Content scripts bundled with UI (increases bundle size)
   - **Impact:** Slower page load, larger extension package
   - **Mitigation:** Separate content script entry points in Vite config
   - **Timeline:** Phase 1 (Week 2)

3. **React in Content Scripts**
   - **Risk:** Content.tsx imports React (120KB overhead)
   - **Impact:** Slow injection, high memory usage
   - **Mitigation:** Refactor content script to vanilla JS/TS, only use React in UI pages
   - **Timeline:** Phase 8 (Week 17)

---

### **Data Migration Risks**

1. **IndexedDB Schema Changes**
   - **Risk:** No migration strategy (only version 1)
   - **Impact:** Users lose data on schema updates
   - **Mitigation:** Implement Dexie upgrade hooks, add schema versioning
   - **Timeline:** Phase 1 (Week 2)

2. **Recorded Step Format Changes**
   - **Risk:** Bundle structure may evolve (new fields added)
   - **Impact:** Old recordings incompatible with new playback engine
   - **Mitigation:** Add `bundleVersion` field, support legacy formats
   - **Timeline:** Phase 3-4 (Weeks 6-8)

3. **CSV Mapping Format Changes**
   - **Risk:** FieldMapping structure may change
   - **Impact:** Users must re-map CSV fields
   - **Mitigation:** Store mapping version, provide migration tool
   - **Timeline:** Phase 5 (Week 12)

---

## 7. Architecture Contracts

### **Contract 1: ElementBundle (DOM Automation Core)**

**Purpose:** Unified data structure for element identification across recording and playback.

**Schema:**
```typescript
interface ElementBundle {
  // Primary identifier
  xpath?: string;                        // Position-based XPath

  // Fallback identifiers
  id?: string;                           // Element ID
  name?: string;                         // Name attribute
  className?: string;                    // Space-separated classes
  dataAttrs?: Record<string, string>;    // data-* attributes
  aria?: string;                         // ARIA label
  placeholder?: string;                  // Placeholder text
  tag?: string;                          // Tag name (input, button, div)
  visibleText?: string;                  // Inner text content

  // Context information
  iframeChain?: IframeInfo[];            // Nested iframe path
  shadowHosts?: string[];                // Shadow host XPath chain
  isClosedShadow?: boolean;              // Closed shadow root flag

  // Metadata
  bounding?: BoundingBox;                // Element position/size
}

interface IframeInfo {
  id?: string;                           // Iframe element ID
  name?: string;                         // Iframe name attribute
  index?: number;                        // Position among siblings
}

interface BoundingBox {
  left: number;
  top: number;
  width?: number;
  height?: number;
}
```

**Invariants:**
- At least one identifier field must be non-null (xpath, id, name, className)
- iframeChain ordered outermost to innermost
- shadowHosts ordered outermost to innermost
- dataAttrs keys do NOT include "data-" prefix (stored as `{ testid: "btn" }` not `{ "data-testid": "btn" }`)

**Versioning:**
- Add `bundleVersion: number` field (default 1)
- Increment version on breaking changes
- Support legacy versions indefinitely

---

### **Contract 2: Step (Recording/Playback)**

**Purpose:** Atomic unit of user interaction.

**Schema:**
```typescript
interface Step {
  id: string;                            // Unique identifier (UUID or timestamp)
  event: 'click' | 'input' | 'enter';    // Action type
  label?: string;                        // Human-readable label
  value?: string;                        // Input value (for 'input' events)
  bundle: ElementBundle;                 // Element identification
  x?: number;                            // Mouse X coordinate
  y?: number;                            // Mouse Y coordinate
  timestamp?: number;                    // Capture time (ms since epoch)
}
```

**Invariants:**
- `id` is unique within a project
- `event` is one of the three allowed values
- `bundle` must have at least one identifier
- `value` only populated for `input` events
- `x` and `y` only populated for `click` events

**Validation Rules:**
- `label` should be extracted during recording (not during playback)
- `timestamp` used for sequencing (not wall clock time)

---

### **Contract 3: FieldMapping (CSV Mapping)**

**Purpose:** Map CSV column headers to step labels.

**Schema:**
```typescript
interface FieldMapping {
  field_name: string;                    // CSV column header
  mapped: boolean;                       // Is this field mapped?
  inputvarfields: string;                // Step label (empty if not mapped)
}
```

**Invariants:**
- `field_name` matches CSV header exactly (case-sensitive)
- `mapped` is true IFF `inputvarfields` is non-empty
- Multiple fields CAN map to same step label (N:1 allowed)
- One field CANNOT map to multiple labels (1:N not allowed)

**Usage Rules:**
- Auto-mapping sets `mapped = true` if similarity >= threshold
- Manual mapping always sets `mapped = true`
- Unmapped fields skipped during test execution

---

### **Contract 4: Action Messages (Message Bus)**

**Purpose:** Type-safe message passing between contexts.

**Schema:**
```typescript
// Action Types (Enum)
enum ActionType {
  GET_ALL_PROJECTS = 'get_all_projects',
  GET_PROJECT_BY_ID = 'get_project_by_id',
  CREATE_PROJECT = 'create_project',
  UPDATE_PROJECT = 'update_project',
  DELETE_PROJECT = 'delete_project',
  OPEN_TAB = 'openTab',
  CLOSE_TAB = 'closeTab',
  RUN_STEP = 'runStep',
  LOG_EVENT = 'log_event',
  // ... 15+ total
}

// Generic Message Format
interface ActionMessage<T extends ActionType> {
  action: T;
  payload?: ActionPayload<T>;
}

// Generic Response Format
interface ActionResponse<T extends ActionType> {
  success: boolean;
  data?: ResponseData<T>;
  error?: string;
}

// Example: GET_PROJECT_BY_ID
interface GetProjectByIdPayload {
  id: number;
}

interface GetProjectByIdResponse {
  success: boolean;
  project?: Project;
  error?: string;
}
```

**Invariants:**
- All messages have `action` field
- All responses have `success` field
- Error messages populate `error` string
- Async handlers return `true` to keep channel open

**Versioning:**
- Add `version: number` field to messages (default 1)
- Background service worker supports multiple versions
- Deprecate old versions after 3 releases

---

### **Contract 5: TestConfig (Test Orchestrator)**

**Purpose:** Configuration for test execution.

**Schema:**
```typescript
interface TestConfig {
  project: Project;                      // Project to execute
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
- `csvData` rows must match at least one mapping
- `mappings` must reference valid step labels
- `onProgress` called for each step (if provided)

**Execution Flow:**
1. Validate TestConfig (throw if invalid)
2. Open tab with `project.target_url`
3. Inject content script
4. For each CSV row:
   a. Map CSV values to step labels
   b. Execute steps sequentially
   c. Call `onProgress` after each step
   d. Aggregate results
5. Close tab (if `closeTabAfterTest = true`)
6. Return TestResult

---

### **Contract 6: Repository Operations (Data Persistence)**

**Purpose:** CRUD operations for projects and test runs.

**Interface:**
```typescript
// Project Repository
interface ProjectRepository {
  // Create
  create(project: Omit<Project, 'id'>): Promise<number>;
  
  // Read
  getById(id: number): Promise<Project | undefined>;
  getAll(): Promise<Project[]>;
  query(filter: ProjectFilter): Promise<Project[]>;
  
  // Update
  update(project: Project): Promise<void>;
  
  // Delete
  delete(id: number): Promise<void>;
}

// TestRun Repository
interface TestRunRepository {
  // Create
  create(testRun: Omit<TestRun, 'id'>): Promise<number>;
  
  // Read
  getById(id: number): Promise<TestRun | undefined>;
  getByProjectId(projectId: number): Promise<TestRun[]>;
  
  // Update
  update(testRun: TestRun): Promise<void>;
  
  // Delete
  delete(id: number): Promise<void>;
}
```

**Invariants:**
- `create` returns auto-incremented ID
- `getById` returns `undefined` if not found (does NOT throw)
- `update` throws if ID not found
- `delete` is idempotent (no error if ID not found)
- All operations return Promises (async)

**Error Handling:**
- Network errors: Reject Promise with error message
- Quota exceeded: Reject with "QUOTA_EXCEEDED" error
- Constraint violations: Reject with descriptive error

---

### **Contract 7: UI Component Props (Design System)**

**Purpose:** Consistent prop interfaces for reusable components.

**Schema:**
```typescript
// Button
interface ButtonProps {
  variant?: 'default' | 'destructive' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  asChild?: boolean;                     // Render as child element
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

// Input
interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number';
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  error?: string;                        // Error message
}

// Card
interface CardProps {
  children: React.ReactNode;
  className?: string;
}

// Dialog
interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}
```

**Invariants:**
- All components forward refs (using `React.forwardRef`)
- All components accept `className` for Tailwind overrides
- Controlled components (value + onChange) preferred over uncontrolled
- Boolean props default to `false`

**Styling:**
- Use CVA (class-variance-authority) for variants
- Tailwind classes merged with `cn()` utility
- Dark mode supported via `dark:` prefix

---

## Summary

This modularization blueprint provides a **clear path forward** for refactoring the Muffin codebase into well-defined, loosely-coupled modules. The 7-phase build order ensures **incremental progress** with working software at each stage, minimizing risk of breaking changes.

**Key Takeaways:**
1. **DOM Automation Core** is the foundation—extract first
2. **Message Bus** enables type-safe communication—implement early
3. **Test Orchestrator** coordinates execution—isolate from UI
4. **Repository Pattern** abstracts IndexedDB—enforce in Phase 2
5. **18-week timeline** with clear milestones and success criteria

**Next Steps:**
- Review this blueprint with team
- Create GitHub issues for each phase
- Set up CI/CD pipeline for module builds
- Begin Phase 1: DOM Automation Core extraction
