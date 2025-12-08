# Background Service Worker — Component Breakdown

## Purpose
The background service worker (`background.ts`) is the central message routing hub for the Chrome extension. It manages the extension's lifecycle, handles all communication between UI pages and content scripts, orchestrates tab management, and serves as the bridge to IndexedDB storage. This component ensures persistent operation according to Manifest V3 requirements (service worker model vs. persistent background pages).

## Inputs
- **Chrome Runtime Messages** from extension pages and content scripts:
  - `add_project`: Create new automation project
  - `update_project`: Update project metadata (name, description, target_url)
  - `get_all_projects`: Retrieve all projects from IndexedDB
  - `delete_project`: Remove project by ID
  - `get_project_by_id`: Fetch single project details
  - `open_project_url_and_inject`: Open target URL and inject content script
  - `update_project_steps`: Save recorded steps array
  - `update_project_fields`: Save parsed field mappings
  - `update_project_csv`: Save CSV data
  - `createTestRun`: Create new test run record
  - `updateTestRun`: Update test run status/results
  - `getTestRunsByProject`: Retrieve test history for project
  - `openTab`: Open arbitrary URL with content script injection
  - `close_opened_tab`: Close currently tracked tab
  - `openDashBoard`: Open extension dashboard page

- **Chrome Extension Events**:
  - `chrome.action.onClicked`: User clicks extension icon
  - `chrome.runtime.onInstalled`: Extension installed/updated
  - `chrome.webNavigation.onCommitted`: Page navigation detected (main frame or iframe)
  - `chrome.webNavigation.onCompleted`: Page load completed

- **IndexedDB Responses**: Asynchronous results from Dexie.js operations

## Outputs
- **Chrome Runtime Message Responses**:
  - Success/failure objects: `{ success: true/false, data?, error? }`
  - Project data, test run data, operation confirmations

- **Chrome Tab Operations**:
  - `chrome.tabs.create()`: Opens new tabs with target URLs
  - `chrome.tabs.remove()`: Closes tracked tabs
  - `chrome.scripting.executeScript()`: Injects content scripts into tabs

- **State Updates**:
  - `openedTabId` (module-level): Tracks currently opened tab
  - `trackedTabs` (Set): Tracks all tabs requiring script reinjection

- **Console Logs**: Diagnostic messages for tab injection, navigation events

## Internal Architecture

### Key Files
- **Single file**: `src/background/background.ts` (450 lines)

### Main Components

1. **Storage Persistence Manager**:
   - `ensurePersistentStorage()`: Requests persistent storage quota on service worker startup
   - Prevents storage eviction in low-disk scenarios

2. **Message Router**:
   - Single `chrome.runtime.onMessage.addListener()` with 15+ action handlers
   - Pattern: `if (message.action === "...")`
   - Returns `true` to keep sendResponse callback alive for async operations

3. **Tab Manager**:
   - `openedTabId`: Tracks single "opened" tab (for recorder)
   - `trackedTabs`: Set of tab IDs requiring automatic content script reinjection
   - `injectMain(tabId, callback?)`: Helper function to inject main.js into tab with error handling

4. **Navigation Monitors**:
   - `chrome.webNavigation.onCommitted`: Reinjects scripts on navigation (handles SPAs, iframes)
   - `chrome.webNavigation.onCompleted`: Secondary injection trigger for dynamic content

5. **Lifecycle Handlers**:
   - `chrome.action.onClicked`: Opens dashboard on icon click
   - `chrome.runtime.onInstalled`: Opens dashboard with #dashboard hash on first install

### Data Flow
```
UI Page → chrome.runtime.sendMessage({action, payload})
  ↓
Background listener checks action
  ↓
Calls DB.method() (IndexedDB via Dexie)
  ↓
.then(result => sendResponse({success: true, result}))
  ↓
UI Page receives response in callback
```

### Tab Injection Flow
```
UI requests "open_project_url_and_inject"
  ↓
Background calls chrome.tabs.create(url)
  ↓
Tab created → injectMain(tabId)
  ↓
chrome.scripting.executeScript({files: ["js/main.js"], allFrames: true})
  ↓
Content script loaded in tab + all iframes
```

## Critical Dependencies
- **Dexie.js**: IndexedDB wrapper (via `src/common/services/indexedDB.ts`)
- **Chrome Extension APIs**:
  - `chrome.runtime`: Message passing
  - `chrome.tabs`: Tab management
  - `chrome.scripting`: Content script injection
  - `chrome.webNavigation`: Navigation tracking
  - `chrome.action`: Extension icon clicks
  - `chrome.storage.local`: Persistent storage quota

## Hidden Assumptions
1. **Service worker lifespan**: May terminate after 30s inactivity (Manifest V3)
2. **Same-origin iframes**: Cannot inject into cross-origin frames
3. **Single opened tab**: Only one tab tracked for recorder at a time
4. **No offline queue**: Messages fail if service worker terminated

## Stability Concerns
- **Service worker termination**: May lose in-flight messages during termination
- **Tab tracking accuracy**: `trackedTabs` not persisted, lost on service worker restart
- **Race conditions**: Rapid navigation may trigger duplicate script injections

## Developer-Must-Know Notes
- All `chrome.runtime.sendMessage` handlers must return `true` for async responses
- Content scripts injected with `allFrames: true` for iframe support
- Tab injection errors logged but not exposed to UI
- `ensurePersistentStorage()` prevents data loss on low storage
- Navigation listeners trigger on both main frame and iframe navigations

## Phase 3 Integration Points

### Recording System (Phase 3A)
- **Input**: Receives `logEvent` messages from RecordingOrchestrator
- **Output**: Forwards to Dashboard/Recorder UI
- **Integration**: Message router handles multi-layer evidence capture

### Test Execution (Phase 3F)
- **Input**: Receives `runStep` messages from TestRunner
- **Output**: Routes to SelfHealingPlaybackEngine in content script
- **Integration**: Handles step-by-step execution coordination

### Vision System (Phase 3D)
- **Input**: Receives `captureScreenshot` messages from VisionCapture
- **Output**: Coordinates CDP screenshot capture via chrome.debugger
- **Integration**: Manages vision evidence collection

### Strategy System (Phase 3C)
- **Input**: Receives strategy telemetry from DecisionEngine
- **Output**: Stores in TelemetryRepository via IndexedDB
- **Integration**: Persists fallback chain performance data

**Last Updated**: December 7, 2025 — Phase 3 Specification Complete
