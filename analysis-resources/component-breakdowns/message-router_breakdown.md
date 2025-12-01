# Message Router Breakdown

## Purpose
**What it does:** Central message-passing hub in the background service worker that routes messages between UI pages, content scripts, and background tasks. Implements request/response pattern for Chrome's message-passing architecture.

**Where it lives:** `src/background/background.ts` (450 lines) - Main message listener

**Why it exists:** Chrome Manifest V3 requires background service workers with no persistent UI. All cross-context communication (popup ↔ content script ↔ background) must use message passing.

## Inputs
**Message Format:**
```typescript
{
  action: string;           // Message type identifier
  payload?: any;            // Action-specific data
  projectId?: number;       // For project-related actions
  id?: number;              // Entity ID
  url?: string;             // For tab operations
  // ... action-specific fields
}
```

**Supported Actions:** 15+ message types including:
- `get_all_projects`, `get_project_by_id`, `create_project`, `update_project`, `delete_project`
- `update_project_fields`, `update_project_csv`
- `openTab`, `closeTab`, `injectContentScript`
- `getTestRunsByProject`, `createTestRun`, `updateTestRun`

## Outputs
**Response Format:**
```typescript
{
  success: boolean;         // Operation result
  data?: any;               // Return data (projects, test runs, etc.)
  projects?: Project[];     // For get_all_projects
  project?: Project;        // For get_project_by_id
  tabId?: number;           // For openTab
  error?: string;           // Error message on failure
}
```

## Internal Architecture
```typescript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message);

  (async () => {
    switch (message.action) {
      case 'get_all_projects': {
        const projects = await db.projects.toArray();
        sendResponse({ success: true, projects });
        break;
      }

      case 'get_project_by_id': {
        const project = await db.projects.get(message.payload.id);
        sendResponse({ success: true, project });
        break;
      }

      case 'create_project': {
        const id = await db.projects.add({
          ...message.payload,
          created_date: Date.now(),
          updated_date: Date.now()
        });
        sendResponse({ success: true, projectId: id });
        break;
      }

      case 'openTab': {
        const tab = await chrome.tabs.create({ url: message.url, active: true });
        // Wait for page load
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          if (tabId === tab.id && info.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            // Inject content script
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['js/content.js']
            }).then(() => {
              sendResponse({ success: true, tabId: tab.id });
            });
          }
        });
        break;
      }

      // ... 12+ more cases
    }
  })().catch(error => {
    sendResponse({ success: false, error: error.message });
  });

  return true; // Keep channel open for async response
});
```

## Critical Dependencies
- **Dexie.js** (`db.projects`, `db.testruns`) - Database operations
- **Chrome APIs:** `chrome.tabs`, `chrome.scripting`, `chrome.runtime`
- **All UI pages** (Dashboard, Recorder, FieldMapper, TestRunner) - Send messages

## Hidden Assumptions
1. **Single message listener** - Only one `onMessage.addListener` registered
2. **Async operations return true** - Keeps channel open for `sendResponse()`
3. **No message timeout** - Assumes responses sent within 30s (Chrome limit)
4. **No message queueing** - Processes messages concurrently
5. **Error responses include success: false** - UI must check success field

## Stability Concerns
1. **Channel closes before async response** - Forgetting `return true` breaks async handlers
2. **No request deduplication** - Rapid clicks send duplicate messages
3. **No rate limiting** - Can flood background worker
4. **No message versioning** - Breaking action changes affect all contexts

## Developer-Must-Know Notes
- **Always return true for async handlers** or response channel closes
- **Message payloads must be JSON-serializable** (no functions, DOM nodes)
- **Background script can restart anytime** (Manifest V3) - no persistent state
- **Debugging:** Check `chrome://extensions` → Service Worker → Inspect
