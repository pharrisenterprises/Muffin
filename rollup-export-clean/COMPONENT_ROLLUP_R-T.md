# Component Rollup: R through T

This rollup covers 10 components from recorder-ui through test-run-repository, providing comprehensive documentation of the recording interface, state management, routing, shadow DOM traversal, step capture/display, tab lifecycle, test execution, and run persistence subsystems.

---

## 1. Recorder UI

### Purpose
Recording interface for capturing user interactions on target web pages. Displays live step list, recording controls (start/stop/save), and project management. Central user-facing UI for the recording phase.

### Location
- **Primary File**: `src/pages/Recorder.tsx` (500+ lines)
- **Entry Point**: `/recorder?project=<id>` route

### Key Responsibilities
- Display project selection and target URL input
- Initiate recording sessions (open tab, inject scripts)
- Receive and display captured steps in real-time
- Allow step editing, deletion, and reordering
- Save recorded steps to IndexedDB
- Navigate to FieldMapper after save

### API Surface
**URL Parameters:**
- `?project=<id>` - Project identifier for editing existing recording

**Chrome Messages (Received):**
```typescript
{
  type: 'log_event',
  data: {
    eventType: 'click' | 'input' | 'enter',
    xpath: string,
    value: string,
    label: string,
    bundle: Bundle
  }
}
```

**Chrome Messages (Sent):**
```typescript
{
  action: 'update_project',
  id: number,
  payload: {
    recorded_steps: Step[]
  }
}
```

### Architecture
**State Management:**
```typescript
const [steps, setSteps] = useState<Step[]>([]);
const [isRecording, setIsRecording] = useState(false);
const [currentProject, setCurrentProject] = useState<Project | null>(null);
const [targetUrl, setTargetUrl] = useState('');
const [recordingTabId, setRecordingTabId] = useState<number | null>(null);
```

**Recording Flow:**
1. User selects project or creates new one
2. User enters target URL
3. Clicks "Start Recording" → Sends `openTab` message → New tab opens
4. Content script injects → Captures events → Sends `log_event` messages
5. Recorder UI receives messages → Adds to steps array → Updates StepsTable
6. User interacts with target page → Steps accumulate
7. User clicks "Stop Recording" → Sends `closeTab` message
8. User reviews/edits steps in StepsTable
9. User clicks "Save" → Sends `update_project` with steps → Navigates to FieldMapper

**Message Listener:**
```typescript
useEffect(() => {
  const messageListener = (message) => {
    console.log('[RECORDER] Message received:', message.type || message.action, message);
    
    if (message.type === 'log_event') {
      setSteps(prev => [...prev, {
        id: Date.now(),
        event: message.data.eventType,
        xpath: message.data.xpath,
        value: message.data.value || '',
        label: message.data.label || 'Unlabeled',
        bundle: message.data.bundle,
        x: message.data.x,
        y: message.data.y
      }]);
    }
  };
  
  chrome.runtime.onMessage.addListener(messageListener);
  return () => chrome.runtime.onMessage.removeListener(messageListener);
}, []);
```

### Special Cases
- **Project loading**: Fetches existing project data if `?project=<id>` provided
- **Step persistence**: Steps only saved on explicit "Save" click
- **Tab cleanup**: Closes recording tab on stop/unmount
- **Step ID generation**: Uses `Date.now()` for unique IDs

### Dependencies
- **Inbound**: Dashboard (navigation), Content Script (log_event messages)
- **Outbound**: Message Router (tab operations, project updates), StepsTable (display), FieldMapper (navigation)

---

## 2. Redux State Management

### Purpose
Minimal Redux store for global theme state management (dark/light mode toggle). Provides centralized theme state accessible across all components without prop drilling.

### Location
- **Store Config**: `src/redux/store.ts`
- **Theme Slice**: `src/redux/themeSlice.ts`
- **Selectors**: `src/redux/selector/` directory

### Key Responsibilities
- Maintain theme mode state (light/dark)
- Provide theme toggle action
- Expose theme selectors for component access
- Persist theme preference (future enhancement)

### Current Usage
**VERY LIMITED** - Only used for theme management. Most application state is:
- Local component state (useState)
- IndexedDB persistence (projects, test runs)
- React Router state (URL parameters)

### API Surface
**Store Configuration:**
```typescript
import { configureStore } from '@reduxjs/toolkit';
import themeReducer from './themeSlice';

export const store = configureStore({
  reducer: {
    theme: themeReducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

**Theme Slice:**
```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ThemeState {
  mode: 'light' | 'dark';
}

const initialState: ThemeState = {
  mode: 'dark'  // Default dark mode
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    toggleTheme: (state) => {
      state.mode = state.mode === 'light' ? 'dark' : 'light';
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.mode = action.payload;
    }
  }
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;
```

**Selectors:**
```typescript
// src/redux/selector/themeSelector.ts
import { RootState } from '../store';

export const selectThemeMode = (state: RootState) => state.theme.mode;
```

### Architecture
**Usage in Components:**
```typescript
import { useSelector, useDispatch } from 'react-redux';
import { selectThemeMode } from '../redux/selector/themeSelector';
import { toggleTheme } from '../redux/themeSlice';

function Header() {
  const theme = useSelector(selectThemeMode);
  const dispatch = useDispatch();
  
  return (
    <button onClick={() => dispatch(toggleTheme())}>
      {theme === 'dark' ? '🌙' : '☀️'}
    </button>
  );
}
```

### Special Cases
- **Default theme**: Initializes to dark mode
- **No persistence**: Theme resets on extension reload (future enhancement)
- **Minimal Redux usage**: Intentionally limited to avoid over-engineering

### Future Considerations
- **chrome.storage.sync persistence**: Save theme preference across sessions
- **System theme detection**: Match OS dark/light mode preference
- **Additional slices**: Recording state, project selection (if needed)

### Dependencies
- **Library**: `@reduxjs/toolkit`, `react-redux`
- **Inbound**: Header component, Layout component
- **Outbound**: None (leaf node in architecture)

---

## 3. Router Navigation

### Purpose
Defines client-side routing structure for the extension's React UI using React Router v6. Maps URL hash paths to page components and wraps them in a shared Layout component. Centralizes route configuration.

### Location
- **Primary File**: `src/routes/Router.tsx` (~50 lines)
- **Parent Component**: Wrapped by `<HashRouter>` in `src/App.tsx`

### Key Responsibilities
- Define route paths and component mappings
- Apply Layout wrapper to authenticated routes
- Handle initial loading route
- Support query parameters for project context

### API Surface
**Route Definitions:**
```typescript
/ → Loader (initial splash screen)
/dashboard → Dashboard (project list)
/recorder?project=<id> → Recorder (event recording)
/fieldMapper?project=<id> → FieldMapper (CSV mapping)
/testRunner?project=<id> → TestRunner (test execution)
```

**Route Parameters:**
- `?project=<id>` - Project identifier passed to Recorder, FieldMapper, TestRunner

### Architecture
**Hash-Based Routing:**
Chrome extensions use hash-based routing (`#/dashboard`) instead of traditional paths (`/dashboard`) due to `file://` protocol limitations. React Router's `HashRouter` handles this automatically.

**Code Structure:**
```typescript
import { Route, Routes } from "react-router-dom";
import Section from "../pages/Section";
import Loader from "../components/Loader/Loader";
import Dashboard from "../pages/Dashboard";
import Layout from "../pages/Layout";
import Recorder from "../pages/Recorder";
import FieldMapper from "../pages/FieldMapper";
import TestRunner from "../pages/TestRunner";

const Router = () => {
  return (
    <Routes>
      {/* Root route - Initial loading */}
      <Route
        path="/"
        element={
          <Section>
            <Loader />
          </Section>
        }
      />
      
      {/* Authenticated routes with Layout */}
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/recorder" element={<Recorder />} />
        <Route path="/fieldMapper" element={<FieldMapper />} />
        <Route path="/testRunner" element={<TestRunner />} />
      </Route>
    </Routes>
  );
};

export default Router;
```

**Layout Component:**
Provides shared header, sidebar navigation, and content wrapper for all authenticated routes. Uses React Router's `<Outlet />` to render child routes.

### Navigation Patterns
**Programmatic Navigation:**
```typescript
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();

// Navigate with query params
navigate(`/recorder?project=${projectId}`);
navigate(`/fieldMapper?project=${projectId}`);
navigate(`/testRunner?project=${projectId}`);

// Navigate without params
navigate('/dashboard');
```

**URL Parameter Extraction:**
```typescript
import { useSearchParams } from 'react-router-dom';

const [searchParams] = useSearchParams();
const projectId = searchParams.get('project');
```

### Special Cases
- **Initial route**: `/` shows loader, typically redirects to `/dashboard` after initialization
- **Query persistence**: `?project=<id>` maintained across navigation within same project workflow
- **Hash routing**: All paths prefixed with `#` in browser URL bar

### Dependencies
- **Library**: `react-router-dom` v6
- **Inbound**: App.tsx (HashRouter provider)
- **Outbound**: All page components (Dashboard, Recorder, FieldMapper, TestRunner)

---

## 4. Shadow DOM Handler

### Purpose
Enables recording and playback of user interactions with elements inside shadow DOM boundaries (both open and closed shadow roots). Traverses shadow host chains and patches element access for closed shadow roots.

### Location
- **Traversal Logic**: `traverseIframesAndShadowRoots()` in `src/contentScript/content.tsx`
- **Closed Shadow Patch**: `Element.prototype.attachShadow` monkey-patch in `src/contentScript/page-interceptor.tsx`
- **Bundle Metadata**: `bundle.shadowHosts` and `bundle.isClosedShadow` fields

### Key Responsibilities
- **Recording**: Detect shadow host chain when event captured
- **Recording**: Store shadow host XPaths and closed shadow flag in bundle
- **Playback**: Traverse shadow roots to locate target element
- **Playback**: Access closed shadow roots via `__realShadowRoot` property

### API Surface
**Recording Output:**
```typescript
bundle: {
  shadowHosts?: string[],    // XPath chain: [outerHost, ..., innerHost]
  isClosedShadow?: boolean,  // True if any host has closed shadow
  xpath?: string,            // Element path within innermost shadow root
  // ... other bundle fields
}
```

**Playback API:**
```typescript
traverseIframesAndShadowRoots(
  bundle: Bundle,
  startDocument: Document
): Document | ShadowRoot
```

### Architecture
**Recording Phase - Shadow Host Detection:**
```typescript
function detectShadowHost(element: HTMLElement): {
  shadowHosts: string[];
  isClosedShadow: boolean;
} {
  const hosts: string[] = [];
  let current: Node | null = element;
  let isClosedShadow = false;
  
  // Walk up DOM tree looking for shadow roots
  while (current) {
    if (current instanceof ShadowRoot) {
      const host = current.host as HTMLElement;
      hosts.unshift(getXPath(host));  // Prepend (outermost first)
      
      if (current.mode === 'closed') {
        isClosedShadow = true;
      }
      
      current = host.parentNode;
    } else {
      current = current.parentNode;
    }
  }
  
  return { shadowHosts: hosts, isClosedShadow };
}
```

**Playback Phase - Shadow Traversal:**
```typescript
function traverseIframesAndShadowRoots(
  bundle: Bundle,
  startDocument: Document
): Document | ShadowRoot {
  let currentContext: Document | ShadowRoot = startDocument;
  
  // 1. Traverse iframe chain (if present)
  if (bundle.iframeChain) {
    for (const iframeInfo of bundle.iframeChain) {
      const iframe = findIframe(currentContext, iframeInfo);
      if (!iframe?.contentDocument) {
        throw new Error('Cannot access iframe');
      }
      currentContext = iframe.contentDocument;
    }
  }
  
  // 2. Traverse shadow host chain (if present)
  if (bundle.shadowHosts) {
    for (const hostXPath of bundle.shadowHosts) {
      const host = findElementByXPath(currentContext, hostXPath);
      if (!host) {
        throw new Error(`Shadow host not found: ${hostXPath}`);
      }
      
      // Access shadow root (open or closed)
      let shadowRoot = host.shadowRoot;  // Open shadow root
      
      if (!shadowRoot && bundle.isClosedShadow) {
        // Try closed shadow root via monkey-patch
        shadowRoot = (host as any).__realShadowRoot;
      }
      
      if (!shadowRoot) {
        throw new Error('Cannot access closed shadow root');
      }
      
      currentContext = shadowRoot;
    }
  }
  
  return currentContext;
}
```

**Closed Shadow Root Patching (Page Interceptor):**
```typescript
// Runs in page context (not extension isolated world)
const origAttachShadow = Element.prototype.attachShadow;
Element.prototype.attachShadow = function (init) {
  const shadow = origAttachShadow.call(this, init);
  
  if (init.mode === 'closed') {
    // Expose closed shadow root via custom property
    (this as any).__realShadowRoot = shadow;
  }
  
  return shadow;
};
```

### Special Cases
- **Open shadow roots**: Accessible via `host.shadowRoot` property
- **Closed shadow roots**: Require page interceptor monkey-patch
- **Nested shadows**: Traverses multiple levels (shadowRoot → host → shadowRoot → ...)
- **iframe + shadow**: Can traverse both (iframe first, then shadow)
- **Late-bound shadows**: Page interceptor must inject before shadow roots created

### Dependencies
- **Inbound**: EventCapture (recording), PlaybackEngine (playback)
- **Outbound**: Page Interceptor (closed shadow patching), DOM Element Finder (uses returned context)

---

## 5. Step Capture Engine

### Purpose
Event-to-step transformation logic that converts browser events (click, input, keypress) into structured Step objects with full element metadata. Enriches raw events with XPath, label text, element bundle, and iframe/shadow context.

### Location
- **Primary Function**: `recordEvent()` in `src/contentScript/content.tsx`
- **Supporting Functions**: `getXPath()`, `getLabelForTarget()`, `createBundle()`

### Key Responsibilities
- Convert DOM events to structured Step objects
- Extract element metadata (XPath, label, bundle)
- Detect event type (click, input, enter)
- Capture mouse coordinates
- Detect iframe and shadow DOM context
- Send step to Recorder UI

### API Surface
**Input:**
```typescript
MouseEvent | InputEvent | KeyboardEvent → {
  target: HTMLElement,
  type: string,  // 'click', 'input', 'keydown'
  key?: string,  // For keyboard events
  clientX/clientY: number  // Mouse coordinates
}
```

**Output:**
```typescript
Step {
  id: number,              // Timestamp-based ID
  event: 'click' | 'input' | 'enter',
  xpath: string,           // Absolute XPath to element
  value?: string,          // Input value or empty string
  label: string,           // Extracted label or 'Unlabeled'
  bundle: Bundle,          // Full element metadata
  x: number,               // Mouse X coordinate
  y: number                // Mouse Y coordinate
}
```

### Architecture
```typescript
function recordEvent(event: Event) {
  const target = event.target as HTMLElement;
  
  // 1. Extract metadata
  const xpath = getXPath(target);
  const label = getLabelForTarget(target) || 'Unlabeled';
  const bundle = createBundle(target);
  
  // 2. Determine event type
  let eventType: 'click' | 'input' | 'enter';
  let value = '';
  
  if (event.type === 'click') {
    eventType = 'click';
  } else if (event.type === 'input') {
    eventType = 'input';
    value = (target as HTMLInputElement).value;
  } else if (event.type === 'keydown' && (event as KeyboardEvent).key === 'Enter') {
    eventType = 'enter';
  } else {
    return;  // Ignore other events
  }
  
  // 3. Capture coordinates
  const mouseEvent = event as MouseEvent;
  const x = mouseEvent.clientX || 0;
  const y = mouseEvent.clientY || 0;
  
  // 4. Detect iframe/shadow context
  const shadowContext = detectShadowHost(target);
  const iframeContext = detectIframeChain(window);
  
  // 5. Build step object
  const step: Step = {
    id: Date.now(),
    event: eventType,
    xpath,
    value,
    label,
    bundle: {
      ...bundle,
      ...shadowContext,
      ...iframeContext
    },
    x,
    y
  };
  
  // 6. Send to Recorder UI
  chrome.runtime.sendMessage({
    type: 'log_event',
    data: {
      eventType: step.event,
      xpath: step.xpath,
      value: step.value,
      label: step.label,
      bundle: step.bundle,
      x: step.x,
      y: step.y
    }
  });
}
```

### Bundle Structure
```typescript
interface Bundle {
  // Basic element info
  tagName: string;
  id?: string;
  className?: string;
  name?: string;
  type?: string;
  
  // Label extraction
  ariaLabel?: string;
  placeholder?: string;
  title?: string;
  
  // Context
  iframeChain?: IframeInfo[];
  shadowHosts?: string[];
  isClosedShadow?: boolean;
  
  // Additional selectors
  cssSelector?: string;
  textContent?: string;
}
```

### Special Cases
- **Enter key filtering**: Only captures Enter on input fields (form submission)
- **Coordinate fallback**: Sets x=0, y=0 if event has no coordinates
- **Empty values**: Captures empty string for non-input events
- **Bundle completeness**: Always includes full metadata (even if redundant)

### Dependencies
- **Inbound**: EventCapture (click/input listeners), EventFilter (pre-filtering)
- **Outbound**: Recorder UI (log_event messages), DOM utilities (getXPath, getLabelForTarget)

---

## 6. Step Table Management

### Purpose
Interactive step list UI with drag-drop reordering, edit/delete actions, and visual step indicators. Allows users to review, reorder, and modify recorded steps before saving to project.

### Location
- **Primary Component**: `src/components/Recorder/StepsTable.tsx`
- **Parent**: Recorder.tsx

### Key Responsibilities
- Display step list in table format
- Enable drag-drop reordering
- Support inline editing of step values
- Provide delete buttons for individual steps
- Visual indicators for step type (click, input, enter)

### API Surface
**Props:**
```typescript
{
  steps: Step[];
  onUpdateSteps: (steps: Step[]) => void;
  onDeleteStep: (index: number) => void;
}
```

**Step Display:**
```typescript
interface Step {
  id: number;
  event: 'click' | 'input' | 'enter';
  label: string;
  value: string;
  xpath: string;
  bundle: Bundle;
}
```

### Architecture
**react-beautiful-dnd Integration:**
```typescript
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

function StepsTable({ steps, onUpdateSteps, onDeleteStep }) {
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const items = Array.from(steps);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    
    onUpdateSteps(items);
  };
  
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <table>
        <thead>
          <tr>
            <th>Drag</th>
            <th>#</th>
            <th>Event</th>
            <th>Label</th>
            <th>Value</th>
            <th>Actions</th>
          </tr>
        </thead>
        <Droppable droppableId="steps">
          {(provided) => (
            <tbody {...provided.droppableProps} ref={provided.innerRef}>
              {steps.map((step, index) => (
                <Draggable key={step.id} draggableId={String(step.id)} index={index}>
                  {(provided, snapshot) => (
                    <tr
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={snapshot.isDragging ? 'dragging' : ''}
                    >
                      <td {...provided.dragHandleProps}>☰</td>
                      <td>{index + 1}</td>
                      <td>
                        <EventBadge type={step.event} />
                      </td>
                      <td>{step.label}</td>
                      <td>
                        <input
                          value={step.value}
                          onChange={(e) => handleValueEdit(index, e.target.value)}
                        />
                      </td>
                      <td>
                        <button onClick={() => onDeleteStep(index)}>
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </tbody>
          )}
        </Droppable>
      </table>
    </DragDropContext>
  );
}
```

**Inline Editing:**
```typescript
const handleValueEdit = (index: number, newValue: string) => {
  const updatedSteps = [...steps];
  updatedSteps[index].value = newValue;
  onUpdateSteps(updatedSteps);
};
```

### Special Cases
- **Drag handle**: Only ☰ icon triggers drag (not entire row)
- **Visual feedback**: Dragging row gets special styling
- **Placeholder**: Shows drop target position during drag
- **ID requirement**: Each step needs unique `id` for Draggable key
- **Index display**: Shows 1-based index (not 0-based array index)

### Dependencies
- **Library**: `react-beautiful-dnd` (drag-drop)
- **Inbound**: Recorder.tsx (parent)
- **Outbound**: None (pure UI component)

---

## 7. Tab Manager

### Purpose
Manages browser tab lifecycle for test execution - creates tabs, injects content scripts, tracks tab state, and handles tab cleanup. Orchestrates tab creation, script injection, and cleanup.

### Location
- **Primary Logic**: `src/background/background.ts`
- **Message Handlers**: `openTab`, `closeTab`, `injectContentScript`

### Key Responsibilities
- Create new browser tabs for target URLs
- Wait for page load completion
- Inject content scripts after DOM ready
- Track active tab IDs
- Close tabs on test completion or stop
- Handle injection errors gracefully

### API Surface
**Open Tab:**
```typescript
{
  action: 'openTab',
  url: string  // Target URL (e.g., project.target_url)
}

Response: {
  success: boolean;
  tabId?: number;
  error?: string;
}
```

**Close Tab:**
```typescript
{
  action: 'closeTab',
  tabId: number
}

Response: {
  success: boolean;
  error?: string;
}
```

**Inject Content Script:**
```typescript
{
  action: 'injectContentScript',
  tabId: number
}

Response: {
  success: boolean;
  error?: string;
}
```

### Architecture
```typescript
case 'openTab': {
  try {
    // 1. Create new tab
    const tab = await chrome.tabs.create({
      url: message.url,
      active: true  // Bring to foreground
    });

    // 2. Wait for page load
    const onUpdated = (tabId: number, info: chrome.tabs.TabChangeInfo) => {
      if (tabId === tab.id && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(onUpdated);

        // 3. Inject content script
        chrome.scripting.executeScript({
          target: { tabId: tab.id! },
          files: ['js/content.js']
        }).then(() => {
          // 4. Inject page interceptor (for shadow DOM)
          chrome.scripting.executeScript({
            target: { tabId: tab.id! },
            files: ['js/page-interceptor.js'],
            world: 'MAIN'  // Page context
          });
        }).catch((error) => {
          console.error('Script injection failed:', error);
        });
      }
    };

    chrome.tabs.onUpdated.addListener(onUpdated);

    sendResponse({ success: true, tabId: tab.id });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
  break;
}

case 'closeTab': {
  try {
    await chrome.tabs.remove(message.tabId);
    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
  break;
}
```

### Special Cases
- **Load timing**: Waits for `status === 'complete'` before injection
- **Listener cleanup**: Removes onUpdated listener after successful injection
- **Dual injection**: Injects both content.js (isolated) and page-interceptor.js (main world)
- **Error recovery**: Catches injection failures without crashing background worker
- **Tab activation**: New tabs brought to foreground (`active: true`)

### Dependencies
- **Inbound**: Recorder (openTab for recording), TestRunner (openTab for playback)
- **Outbound**: Chrome Tabs API, Chrome Scripting API, Injection Manager

---

## 8. Test Logger

### Purpose
Centralized logging system for test execution with timestamp formatting and log level classification. Provides structured, timestamped logging for debugging test failures and tracking execution flow.

### Location
- **Primary Logic**: `addLog()` function and `logs` state in `src/pages/TestRunner.tsx`
- **Display Component**: TestConsole component

### Key Responsibilities
- Create timestamped log entries
- Classify logs by level (info, success, error, warning)
- Maintain ordered log array
- Format timestamps consistently
- Provide visual distinction by log level

### API Surface
**Logging Function:**
```typescript
addLog(level: 'info' | 'success' | 'error' | 'warning', message: string): void
```

**Log Entry Structure:**
```typescript
interface LogEntry {
  timestamp: string;  // 'HH:mm:ss' format
  level: 'info' | 'success' | 'error' | 'warning';
  message: string;
}
```

### Architecture
```typescript
import { format } from 'date-fns';

const [logs, setLogs] = useState<LogEntry[]>([]);

const addLog = (level: LogEntry['level'], message: string) => {
  const newLog: LogEntry = {
    timestamp: format(new Date(), 'HH:mm:ss'),
    level,
    message
  };
  setLogs(prev => [...prev, newLog]);
};
```

**Usage Examples:**
```typescript
// Test initialization
addLog('info', 'Starting test execution');
addLog('info', `Processing ${csv_data.length} CSV rows`);

// Step execution
addLog('info', `Step ${stepIndex + 1}: ${step.event} on "${step.label}"`);
addLog('success', '✓ Step completed successfully');
addLog('error', `✗ Element not found: ${step.xpath}`);
addLog('warning', 'Skipping step - no CSV value mapped');

// Test completion
addLog('info', `Test completed: ${passedSteps}/${totalSteps} passed`);
```

**TestConsole Display Component:**
```typescript
function TestConsole({ logs }: { logs: LogEntry[] }) {
  const colorMap = {
    info: 'text-blue-500',
    success: 'text-green-500',
    error: 'text-red-500',
    warning: 'text-yellow-500'
  };
  
  return (
    <div className="test-console">
      {logs.map((log, index) => (
        <div key={index} className={`log-entry ${colorMap[log.level]}`}>
          <span className="timestamp">[{log.timestamp}]</span>
          <span className="level">[{log.level.toUpperCase()}]</span>
          <span className="message">{log.message}</span>
        </div>
      ))}
    </div>
  );
}
```

### Special Cases
- **Append-only**: Logs never removed during test run
- **Clear on start**: Logs reset when new test starts
- **No persistence**: Logs exist only in component state (lost on unmount)
- **Auto-scroll**: Console typically scrolls to bottom on new logs

### Dependencies
- **Library**: `date-fns` (format function)
- **Inbound**: TestRunner (all test execution paths)
- **Outbound**: TestConsole component (display)

---

## 9. Test Orchestrator

### Purpose
Core test execution engine that orchestrates CSV row iteration, tab management, step playback, and result aggregation. Coordinates complex multi-step workflow for batch testing.

### Location
- **Primary Function**: `runTest()` async function in `src/pages/TestRunner.tsx` (200+ lines)

### Key Responsibilities
- Iterate through CSV rows (or single empty row if no CSV)
- Create tab for each test iteration
- Map CSV values to step labels
- Execute steps sequentially via content script
- Collect pass/fail results
- Aggregate metrics (total, passed, failed)
- Create test run record in IndexedDB
- Handle stop button (abort execution)

### API Surface
**Input (from Project):**
```typescript
{
  csv_data: any[],          // CSV rows or empty array
  recorded_steps: Step[],   // Recorded step sequence
  parsed_fields: FieldMapping[],  // CSV to label mappings
  target_url: string        // Starting URL
}
```

**Output:**
```typescript
{
  passed_steps: number,
  failed_steps: number,
  total_steps: number,
  duration: number,
  logs: LogEntry[]
}
```

### Architecture
**Execution Algorithm:**
```typescript
async function runTest() {
  isRunningRef.current = true;
  setIsRunning(true);
  setLogs([]);
  
  const startTime = Date.now();
  const { csv_data, recorded_steps, parsed_fields, target_url } = currentProject;
  
  // 1. Build mapping lookup
  const mappingLookup: Record<string, string> = {};
  parsed_fields?.forEach(field => {
    if (field.mapped) {
      mappingLookup[field.field_name] = field.inputvarfields;
    }
  });
  
  // 2. Determine rows (CSV or single empty row)
  const rowsToProcess = csv_data?.length > 0 ? csv_data : [{}];
  
  let totalPassed = 0;
  let totalFailed = 0;
  
  // 3. Iterate CSV rows
  for (let rowIndex = 0; rowIndex < rowsToProcess.length; rowIndex++) {
    if (!isRunningRef.current) break;  // Stop button check
    
    const row = rowsToProcess[rowIndex];
    addLog('info', `--- Row ${rowIndex + 1}/${rowsToProcess.length} ---`);
    
    // 4. Open new tab
    const tabResult = await chrome.runtime.sendMessage({
      action: 'openTab',
      url: target_url
    });
    
    if (!tabResult.success) {
      addLog('error', `Failed to open tab: ${tabResult.error}`);
      totalFailed += recorded_steps.length;
      continue;
    }
    
    const tabId = tabResult.tabId;
    await delay(2000);  // Wait for page load
    
    // 5. Execute steps
    for (let stepIndex = 0; stepIndex < recorded_steps.length; stepIndex++) {
      if (!isRunningRef.current) break;
      
      const step = recorded_steps[stepIndex];
      
      // Map CSV value if applicable
      let stepValue = step.value;
      if (csv_data?.length > 0 && mappingLookup[step.label]) {
        const csvFieldName = mappingLookup[step.label];
        stepValue = row[csvFieldName] || step.value;
      }
      
      addLog('info', `Step ${stepIndex + 1}: ${step.event} on "${step.label}"`);
      
      // Send step to content script
      const result = await chrome.tabs.sendMessage(tabId, {
        action: 'executeStep',
        step: { ...step, value: stepValue }
      });
      
      if (result.success) {
        addLog('success', '✓ Step completed');
        totalPassed++;
      } else {
        addLog('error', `✗ ${result.error}`);
        totalFailed++;
      }
      
      await delay(500);  // Delay between steps
    }
    
    // 6. Close tab
    await chrome.runtime.sendMessage({
      action: 'closeTab',
      tabId
    });
  }
  
  const duration = Date.now() - startTime;
  
  // 7. Save test run
  await chrome.runtime.sendMessage({
    action: 'createTestRun',
    payload: {
      project_id: currentProject.id,
      status: 'completed',
      passed_steps: totalPassed,
      failed_steps: totalFailed,
      total_steps: totalPassed + totalFailed,
      duration,
      created_date: Date.now()
    }
  });
  
  addLog('info', `Test completed: ${totalPassed}/${totalPassed + totalFailed} passed`);
  setIsRunning(false);
  isRunningRef.current = false;
}
```

### Special Cases
- **Stop button**: Uses ref (`isRunningRef`) for immediate check without re-render
- **Empty CSV**: Executes single iteration with original step values
- **CSV mapping**: Only applies if `parsed_fields` configured and CSV provided
- **Tab cleanup**: Always closes tab after row completion
- **Delay timing**: 2000ms for page load, 500ms between steps
- **Error recovery**: Continues to next row if tab creation fails

### Dependencies
- **Inbound**: TestRunner UI (start button)
- **Outbound**: Message Router (openTab, closeTab, createTestRun), Content Script (executeStep), Test Logger (addLog)

---

## 10. Test Run Repository

### Purpose
Manages test execution history in IndexedDB via Dexie.js. Stores metadata for each test run including status, timestamps, and pass/fail metrics. Provides historical tracking for analytics, debugging, and audit trails.

### Location
- **Primary Access**: `db.testruns` from `src/common/services/indexedDB.ts`
- **Table Definition**: Dexie schema configuration

### Key Responsibilities
- Expose typed CRUD operations for test runs
- Handle auto-increment primary key generation
- Support queries by project_id (foreign key)
- Store execution metrics and logs
- Persist test run history across sessions

### API Surface
**CRUD Operations:**
```typescript
db.testruns.add(testrun: TestRun): Promise<number>  // Returns new ID
db.testruns.get(id: number): Promise<TestRun | undefined>
db.testruns.where('project_id').equals(projectId).toArray(): Promise<TestRun[]>
db.testruns.toArray(): Promise<TestRun[]>
db.testruns.update(id: number, changes: Partial<TestRun>): Promise<number>
db.testruns.delete(id: number): Promise<void>
```

**Query Operations:**
```typescript
// Get all runs for a project
db.testruns.where('project_id').equals(projectId).toArray()

// Get recent runs
db.testruns.orderBy('created_date').reverse().limit(10).toArray()

// Get failed runs
db.testruns.where('status').equals('failed').toArray()
```

### Data Structure
**TestRun Schema:**
```typescript
interface TestRun {
  id?: number;              // Auto-increment primary key
  project_id: number;       // Foreign key to projects table (not enforced)
  status: 'pending' | 'running' | 'completed' | 'failed';
  passed_steps?: number;    // Count of successful steps
  failed_steps?: number;    // Count of failed steps
  total_steps?: number;     // Total steps executed
  error_log?: string[];     // Array of error messages
  created_date?: number;    // Start timestamp (ms)
  updated_date?: number;    // Last update timestamp (ms)
  duration?: number;        // Execution time (ms)
}
```

### Architecture
**Dexie Configuration:**
```typescript
import Dexie, { Table } from 'dexie';

class MuffinDatabase extends Dexie {
  testruns!: Table<TestRun>;
  
  constructor() {
    super('MuffinDB');
    this.version(1).stores({
      testruns: '++id, project_id, status, created_date'
    });
  }
}

export const db = new MuffinDatabase();
```

**Usage Example:**
```typescript
// Create test run
const id = await db.testruns.add({
  project_id: 123,
  status: 'running',
  passed_steps: 0,
  failed_steps: 0,
  total_steps: 10,
  created_date: Date.now()
});

// Update with results
await db.testruns.update(id, {
  status: 'completed',
  passed_steps: 8,
  failed_steps: 2,
  duration: 45000,  // 45 seconds
  updated_date: Date.now()
});

// Query runs by project
const runs = await db.testruns
  .where('project_id')
  .equals(123)
  .toArray();
```

### Special Cases
- **Auto-increment**: `++id` in schema generates sequential IDs
- **Indexes**: Created on project_id, status, created_date for fast queries
- **Foreign key**: project_id not enforced (can reference deleted project)
- **Partial updates**: `.update()` only modifies specified fields
- **Status transitions**: pending → running → completed/failed

### Dependencies
- **Library**: `dexie` NPM package
- **Inbound**: Test Orchestrator (create/update), Dashboard (query for history)
- **Outbound**: Browser IndexedDB API

---

## Integration Points

### Recording Workflow
1. **Recorder UI** → User clicks "Start Recording"
2. **Tab Manager** → Opens new tab, injects scripts
3. **Step Capture Engine** → Converts events to steps
4. **Recorder UI** → Displays steps in StepsTable
5. **Step Table Management** → User reorders/edits
6. **Project Repository** → Saves recorded_steps

### Playback Workflow
1. **Test Orchestrator** → Iterates CSV rows
2. **Tab Manager** → Opens tab for each iteration
3. **Test Orchestrator** → Maps CSV values to steps
4. **Content Script** → Executes steps
5. **Shadow DOM Handler** → Traverses shadow roots
6. **Test Logger** → Records results
7. **Test Run Repository** → Persists execution data

### State Management Flow
1. **Redux State Management** → Theme preference
2. **Router Navigation** → URL-based navigation
3. **Local State** → Component-specific (useState)
4. **IndexedDB** → Persistent data (projects, test runs)

### Tab Lifecycle
1. **Tab Manager** → Creates tab
2. **Injection Manager** → Injects content + page scripts
3. **Content Script** → Executes steps
4. **Tab Manager** → Closes tab on completion

---

## Cross-Component Dependencies

### Recording Flow Chain
```
Recorder UI (start)
  → Tab Manager (open tab)
  → Injection Manager (inject scripts)
  → Step Capture Engine (convert events)
  → Step Table Management (display)
  → Project Repository (save)
```

### Playback Flow Chain
```
Test Orchestrator (iterate rows)
  → Tab Manager (open tab)
  → Content Script (execute steps)
  → Shadow DOM Handler (traverse)
  → Test Logger (log results)
  → Test Run Repository (persist)
```

### Navigation Flow
```
Router Navigation (route config)
  → Recorder UI (/recorder)
  → FieldMapper (/fieldMapper)
  → TestRunner (/testRunner)
  → Dashboard (/dashboard)
```

---

## Technology Stack Summary

- **UI Framework**: React (hooks, components, state)
- **State Management**: Redux Toolkit (theme only), React useState (local)
- **Routing**: React Router v6 (HashRouter for Chrome extensions)
- **Database**: Dexie.js (IndexedDB wrapper)
- **Drag-Drop**: react-beautiful-dnd (StepsTable reordering)
- **Date Formatting**: date-fns (timestamp formatting)
- **Message Passing**: Chrome runtime API
- **Tab Management**: Chrome tabs API
- **Script Injection**: Chrome scripting API
- **Shadow DOM**: Monkey-patching, __realShadowRoot custom property
