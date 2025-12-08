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
  ↓
trackedTabs.add(tabId) for reinjection
```

## Critical Dependencies

### Chrome APIs
- `chrome.runtime` (messaging, getURL, onInstalled)
- `chrome.tabs` (create, remove)
- `chrome.scripting` (executeScript)
- `chrome.webNavigation` (onCommitted, onCompleted)
- `chrome.action` (onClicked)
- `navigator.storage` (persist, persisted)

### Internal Dependencies
- `DB` from `../common/services/indexedDB`: All database operations
- Manifest V3 service worker environment (no DOM, no persistent state between activations)

### External Libraries
- None (pure Chrome APIs + IndexedDB wrapper)

## Hidden Assumptions

1. **Single Opened Tab**: Assumes only one tab is "opened" for recording at a time (openedTabId is scalar, not array)

2. **Synchronous Message Handling**: Each action handler assumes it will complete before service worker sleeps (Manifest V3 service workers can sleep after 30s of inactivity)

3. **Tab Tracking Persistence**: `trackedTabs` Set is in-memory only; lost if service worker restarts (Chrome may wake/sleep service workers)

4. **Script Injection Timing**: Assumes `allFrames: true` will inject into all existing iframes; may miss dynamically added iframes

5. **Error Swallowing**: Many handlers silently log errors to console but don't propagate to UI

6. **Message Protocol Consistency**: Assumes all messages follow `{action, payload}` structure; no TypeScript discriminated unions

## Stability Concerns

1. **Service Worker Lifecycle**:
   - **Risk**: Service worker may sleep after 30s inactivity (Manifest V3)
   - **Impact**: In-memory state (`openedTabId`, `trackedTabs`) lost
   - **Mitigation**: Should persist trackedTabs to chrome.storage.session

2. **Race Conditions**:
   - **Injection Race**: `chrome.webNavigation.onCommitted` and `onCompleted` both inject scripts → potential double injection
   - **Tab Close Race**: If tab closes before injection completes, `chrome.runtime.lastError` occurs

3. **No Type Safety**:
   - **Risk**: Message actions are strings, no compile-time validation
   - **Impact**: Typos cause silent failures (action not recognized)
   - **Recommendation**: Use discriminated union types

4. **No Request Validation**:
   - **Risk**: No schema validation on `message.payload`
   - **Impact**: Malformed payloads cause runtime errors in DB operations

5. **Error Handling Gaps**:
   - Some handlers don't return proper error responses
   - `sendResponse()` may not be called in all error paths

6. **Manifest V3 Limitations**:
   - Cannot access DOM or use XMLHttpRequest
   - Limited to fetch() for network requests
   - Service worker may be killed at any time

## Edge Cases

1. **Rapid Tab Navigation**:
   - User navigates quickly → multiple `onCommitted` events → multiple injections
   - **Handling**: Each injection overwrites previous (acceptable, but wasteful)

2. **Cross-Origin Iframes**:
   - Content script injection fails for cross-origin iframes
   - **Handling**: `chrome.runtime.lastError` logged but not fatal

3. **Tab Closed During Injection**:
   - Tab removed before `executeScript` callback fires
   - **Handling**: Error logged, callback checks `chrome.runtime.lastError`

4. **Extension Updated Mid-Session**:
   - Service worker restarted, in-memory state lost
   - **Handling**: No recovery mechanism for `trackedTabs`

5. **IndexedDB Transaction Failures**:
   - Quota exceeded, browser in private mode
   - **Handling**: Error passed to sendResponse, but no retry logic

6. **Multiple Extension Pages Open**:
   - Multiple dashboards/recorders send concurrent messages
   - **Handling**: No message queuing; handled serially by event loop

7. **Tab ID Reuse**:
   - Browser may reuse tab IDs after tab closure
   - **Handling**: `trackedTabs.add()` doesn't check if tab still exists

## Developer-Must-Know Notes

1. **Manifest V3 Service Worker Model**:
   - Service workers are **ephemeral** (can sleep/wake)
   - **Do NOT** rely on module-level variables for long-term state
   - Use `chrome.storage.session` for ephemeral state
   - Use `chrome.storage.local` for persistent state

2. **Content Script Injection Scope**:
   - `allFrames: true` injects into all same-origin iframes
   - Does NOT inject into cross-origin iframes (security restriction)
   - Dynamically added iframes require reinjection (handled by `onCommitted`)

3. **Message Response Timing**:
   - **MUST** return `true` from message listener for async responses
   - `sendResponse()` must be called before listener returns if async
   - Forgetting `return true` causes "message port closed" errors

4. **Tab Tracking Pattern**:
   - `openedTabId`: Single tab for recording (legacy pattern)
   - `trackedTabs`: Set of tabs requiring reinjection (better pattern)
   - Consider migrating `openedTabId` into `trackedTabs` Set

5. **Injection Helper Pattern**:
   - `injectMain(tabId, callback?)` centralizes injection logic
   - Always checks `chrome.runtime.lastError` in callback
   - Logs injection success/failure for debugging

6. **Navigation Handling**:
   - `onCommitted`: Fires on navigation start (use for early injection)
   - `onCompleted`: Fires on page load complete (use for dynamic content)
   - Both are hooked to ensure coverage of SPAs and dynamic iframes

7. **Database Access Pattern**:
   - All DB operations are async (return Promises)
   - Background is single source of truth for DB operations
   - UI pages never access DB directly (all via messages)

8. **Error Propagation**:
   - Catch blocks use `sendResponse({ success: false, error: err.message })`
   - Some handlers lack proper error handling (legacy code)
   - Always check `response.success` in UI code

9. **Testing Considerations**:
   - Service workers cannot use `window` or `document`
   - Use `chrome.debugger` API for testing content script injection
   - Mock `chrome` APIs when unit testing

10. **Performance Notes**:
    - Each message round-trip adds ~5-10ms latency
    - Batch operations when possible (e.g., bulk step updates)
    - IndexedDB operations are async but generally <5ms for single record CRUD
