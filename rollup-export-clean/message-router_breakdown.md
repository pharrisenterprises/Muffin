# Message Router - Component Breakdown

**Last Updated:** December 7, 2025

---

## Purpose
**What it does:** Central message-passing hub in the background service worker. Routes 15+ message types between UI pages (Dashboard, Recorder, TestRunner), content scripts (recorder/replayer), and storage layer (IndexedDB/chrome.storage).

**Where it lives:** `src/background/background.ts` - Main `chrome.runtime.onMessage.addListener()`

**Why it exists:** Chrome extensions use message passing for cross-context communication. This router decouples components and provides single point of control for all async operations.

---

## Inputs
**Message Format:**
```typescript
{
  action: string,  // Message type identifier
  data?: any,      // Optional payload
  tabId?: number   // For tab-specific operations
}
```

**Supported Actions (15+ message types):**
- `get_all_projects` - Fetch project list
- `create_project` - Create new project
- `update_project` - Update existing project
- `delete_project` - Delete project
- `get_project` - Fetch single project by ID
- `start_recording` - Begin recording session
- `stop_recording` - End recording session
- `log_event` - Event captured by content script
- `openTab` - Open URL in new tab
- `executePlayback` - Start test playback
- `getCSVData` - Fetch parsed CSV for project
- `updateFieldMapping` - Update CSV-to-field mappings
- And more...

---

## Outputs
**Response Format:**
```typescript
{
  success: boolean,
  data?: any,       // Result payload
  error?: string    // Error message if failed
}
```

**Side Effects:**
- Database writes (IndexedDB)
- Tab creation/closure
- Content script injection
- Storage updates (chrome.storage.local)

---

## Internal Architecture

### Main Router Pattern
```typescript
// background.ts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      let response;
      
      switch (message.action) {
        case 'get_all_projects':
          response = await db.projects.toArray();
          break;
        
        case 'create_project':
          const id = await db.projects.add(message.data);
          response = { success: true, projectId: id };
          break;
        
        case 'update_project':
          await db.projects.put(message.data);
          response = { success: true };
          break;
        
        case 'delete_project':
          await db.projects.delete(message.data.id);
          response = { success: true };
          break;
        
        case 'start_recording':
          const tab = await chrome.tabs.create({ url: message.data.url });
          await injectRecordingScript(tab.id);
          response = { success: true, tabId: tab.id };
          break;
        
        case 'log_event':
          // Forward to Recorder UI page
          chrome.runtime.sendMessage({
            type: 'log_event',
            data: message.data
          });
          response = { success: true };
          break;
        
        case 'openTab':
          await chrome.tabs.create({ url: message.data.url });
          response = { success: true };
          break;
        
        case 'executePlayback':
          // Inject replayer.js and trigger playback
          await chrome.scripting.executeScript({
            target: { tabId: message.data.tabId },
            files: ['replayer.js']
          });
          response = { success: true };
          break;
        
        default:
          response = { success: false, error: 'Unknown action' };
      }
      
      sendResponse(response);
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  })();
  
  return true;  // Keep message channel open for async response
});
```

### Key Implementation Detail: `return true`
**Critical:** The `return true` at the end keeps the message channel open for async operations. Without it, `sendResponse()` fails after the listener returns.

---

## Critical Dependencies
**Upstream:**
- **Dashboard.tsx** - Sends CRUD messages for projects
- **Recorder.tsx** - Sends start/stop recording, log_event messages
- **FieldMapper.tsx** - Sends CSV/field mapping updates
- **TestRunner.tsx** - Sends playback execution messages
- **content.tsx** - Sends log_event during recording
- **replayer.tsx** - Sends playback status updates

**Downstream:**
- **indexedDB.ts** - Database operations via Dexie
- **chrome.tabs API** - Tab management
- **chrome.scripting API** - Content script injection
- **chrome.storage.local** - Settings persistence

**External:**
- **chrome.runtime.onMessage** - Message listener API
- **chrome.runtime.sendMessage** - Message sending API

---

## Hidden Assumptions
1. **Single background worker** - Only one instance processes messages
2. **Async handlers safe** - All DB operations wrapped in try/catch
3. **Sender validation skipped** - No authentication/authorization checks
4. **Message ordering** - Assumes messages processed in order (not guaranteed)
5. **No rate limiting** - Content script can flood with log_event messages
6. **Return true required** - All async handlers must return true
7. **Error serialization** - Assumes error.message is string

---

## Stability Concerns

### High-Risk Patterns
1. **Missing `return true` for async handlers**
   ```typescript
   chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
     const result = await someAsyncOperation();
     sendResponse(result);
     // Missing: return true;
     // → sendResponse() fails silently
   });
   ```

2. **Unhandled async errors**
   ```typescript
   case 'risky_operation':
     await db.projects.delete(id);  // If throws, no catch
     sendResponse({ success: true });
   ```

3. **Message flooding from content script**
   ```typescript
   // content.tsx rapid events
   for (let i = 0; i < 1000; i++) {
     chrome.runtime.sendMessage({ action: 'log_event', data: {...} });
   }
   // → Background worker overwhelmed
   ```

4. **Race conditions on DB writes**
   ```typescript
   // Two tabs update same project simultaneously
   await db.projects.put(project1);  // Tab A
   await db.projects.put(project2);  // Tab B
   // Last write wins, one change lost
   ```

### Failure Modes
- **Background worker restart** - Messages lost during restart
- **sendResponse after listener returns** - Silent failure if no `return true`
- **Unknown action** - Returns error but doesn't log for debugging
- **DB connection lost** - IndexedDB errors not retried

---

## Edge Cases

### Input Variations
1. **Malformed message** (missing `action` field)
   ```typescript
   chrome.runtime.sendMessage({ data: {...} });  // No action
   // Falls through to default case → error response
   ```

2. **Message with invalid tabId**
   ```typescript
   { action: 'executePlayback', data: { tabId: 99999 } }
   // chrome.scripting.executeScript throws → caught by try/catch
   ```

3. **Concurrent project updates**
   ```typescript
   // Two components update same project
   // Last sendMessage wins, earlier changes lost
   ```

4. **log_event during non-recording session**
   ```typescript
   // Content script sends event, but Recorder UI closed
   // chrome.runtime.sendMessage forwards but no listener → silent drop
   ```

5. **Message sent before background worker ready**
   ```typescript
   // Extension startup race condition
   // Message arrives before listener registered → lost
   ```

---

## Developer-Must-Know Notes
- **MUST return true** for all async message handlers (keeps channel open)
- All DB operations wrapped in async IIFE to use await
- No sender validation - any context can send any message
- log_event messages forwarded directly to Recorder UI (no buffering)
- Background service worker can terminate - messages during restart are lost
- Error responses include raw error.message (may leak stack traces)
- No message queuing - rapid messages processed as they arrive

---

## Phase 3 Integration Points

### Strategy Implementation
| Strategy ID | Relevance | Integration Point |
|-------------|-----------|-------------------|
| **ENG-008** | Critical | PlaybackEngine sends `executePlayback` messages through this router |
| **DAT-003** | Critical | All project CRUD operations routed through background to IndexedDB |
| **INT-001** | High | IframeHandler log_event messages routed to Recorder UI |
| **MIG-001** | Medium | Migration happens before `get_project` response |

### Specification Mapping
- **A1** (Core Recording) - `log_event` routing enables real-time step display
- **B2** (CSV Integration) - `getCSVData` / `updateFieldMapping` messages
- **D2** (Project Management) - All CRUD actions route through background
- **G4** (Playback Engine) - `executePlayback` triggers replayer injection

### Evidence References
- Code: `src/background/background.ts` lines 20-180 (main message listener)
- Test: Chrome DevTools → Service Workers → Inspect → Network tab (message flow)
- Logs: Console messages in background worker context

### Integration Risks
1. **Message Loss:** Background worker restart drops in-flight messages
2. **Race Conditions:** Concurrent DB writes from multiple tabs may corrupt data
3. **Flooding:** Rapid log_event messages from content script may overwhelm worker
4. **No Auth:** Any extension context can trigger any action (no sender validation)

---

## Related Components
- **Background Service Worker** (`background-service-worker_breakdown.md`) - Hosts this message router
- **Content Script Recorder** (`content-script-recorder_breakdown.md`) - Sends `log_event` messages
- **Dashboard UI** (`dashboard-ui_breakdown.md`) - Sends project CRUD messages
- **Recorder UI** (`recorder-ui_breakdown.md`) - Receives forwarded `log_event` messages
- **Project Repository** (`project-repository_breakdown.md`) - Database operations called by router
- **Injection Manager** (`injection-manager_breakdown.md`) - Triggered by `start_recording` message
