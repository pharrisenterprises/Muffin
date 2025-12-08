# Injection Manager - Component Breakdown

**Last Updated:** December 7, 2025

---

## Purpose
**What it does:** Manages dynamic programmatic injection of content scripts into target tabs using Chrome's scripting API. Controls when and how recording/playback scripts are injected into web pages.

**Where it lives:** `src/background/background.ts` (injection logic) + `public/manifest.json` (declarative content_scripts config)

**Why it exists:** Manifest V3 requires explicit content script injection. This module bridges the gap between user-initiated recording sessions and the content scripts that capture/replay events.

---

## Inputs
**From Background Service Worker:**
```typescript
{
  tabId: number,              // Target tab for injection
  files: string[],            // ['content.js'] or ['replayer.js']
  world: 'MAIN' | 'ISOLATED'  // Execution context
}
```

**From Manifest.json:**
```json
{
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "run_at": "document_end"
  }]
}
```

---

## Outputs
**Injection Confirmation:**
- Chrome scripting API returns injected script references
- Content script becomes active in target tab
- Message channel established for communication

**Execution Contexts:**
- **ISOLATED** (default) - Secure content script sandbox, Chrome API access
- **MAIN** - Page context for `attachShadow` monkey patching (page-interceptor.tsx)

---

## Internal Architecture

### Programmatic Injection (Recording)
```typescript
// background.ts
async function injectRecordingScript(tabId: number) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['content.js'],
    world: 'ISOLATED'  // Content script sandbox
  });
  
  // Also inject page interceptor for closed shadow roots
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['page-interceptor.js'],
    world: 'MAIN'  // Page context for monkey patching
  });
}
```

### Declarative Injection (Manifest)
```json
{
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "run_at": "document_end",
    "all_frames": true
  }]
}
```

**Key Difference:**
- **Declarative:** Auto-injects on page load (good for passive recording)
- **Programmatic:** Injects on demand (good for controlled test execution)

### Injection Flow
```
1. User clicks "Start Recording" in Recorder.tsx
2. Recorder sends message to background.ts: { action: 'start_recording', url: '...' }
3. background.ts creates new tab with URL
4. On tab load complete, background.ts calls injectRecordingScript(tabId)
5. Content script activates, begins event capture
6. Content script sends 'log_event' messages back to Recorder UI
```

---

## Critical Dependencies
**Upstream:**
- **Recorder.tsx** - Initiates recording sessions
- **TestRunner.tsx** - Initiates playback sessions
- **background.ts** - Message routing hub

**Downstream:**
- **content.tsx** - Main content script for recording
- **replayer.tsx** - Content script for playback
- **page-interceptor.tsx** - Page context script for closed shadow DOM

**External:**
- **chrome.scripting.executeScript()** - Manifest V3 injection API
- **manifest.json content_scripts** - Declarative injection config

---

## Hidden Assumptions
1. **Injection timing** - Assumes page DOM fully loaded at `document_end`
2. **MAIN world safety** - Assumes page-interceptor won't conflict with site scripts
3. **All frames flag** - Assumes iframes need content scripts (may over-inject)
4. **Single injection per tab** - Doesn't check if already injected
5. **Script availability** - Assumes content.js/replayer.js built and available
6. **Same-origin policy** - Cannot inject into chrome:// or file:// URLs
7. **Permissions granted** - Requires `scripting` and `activeTab` permissions

---

## Stability Concerns

### High-Risk Patterns
1. **Double injection race condition**
   ```typescript
   // If declarative + programmatic both run
   // → Two content scripts active, duplicate events
   ```

2. **Injection before DOM ready**
   ```typescript
   // Tab loading state check missing
   if (tab.status !== 'complete') { /* wait */ }
   ```

3. **MAIN world script conflicts**
   ```typescript
   // page-interceptor.tsx monkey patches Element.prototype.attachShadow
   // If site has own patch → collision
   ```

4. **Permission errors silenced**
   ```typescript
   try {
     await chrome.scripting.executeScript(...);
   } catch (e) {
     // No error handling → silent failure
   }
   ```

### Failure Modes
- **Cannot access chrome-extension:// URLs** - Injection blocked for extension pages
- **Cannot access file:// URLs** - Requires "Allow access to file URLs" setting
- **Content Security Policy (CSP) blocking** - Some sites block script injection
- **Script not found** - If build pipeline fails, injection throws error

---

## Edge Cases

### Input Variations
1. **Tab already has content script** (declarative injection)
   - Programmatic injection creates duplicate → Need injection check

2. **Tab navigates during injection**
   - Script injected into old page → Lost on navigation

3. **Multiple iframes present**
   - `all_frames: true` injects into each → N content scripts per tab

4. **Dynamic iframe creation**
   - Declarative injection may miss late-added iframes

5. **Special URLs** (chrome://, about:, data:)
   - Injection fails silently → No error handling

---

## Developer-Must-Know Notes
- **world: 'MAIN'** required for `Element.prototype.attachShadow` patching (closed shadow roots)
- **world: 'ISOLATED'** required for Chrome API access (message passing, storage)
- **all_frames: true** ensures iframe automation works but increases overhead
- Current implementation has NO de-duplication check (may inject twice)
- Injection errors not surfaced to user (silent failures)
- CSP-protected sites (banking, government) may block injection entirely

---

## Phase 3 Integration Points

### Strategy Implementation
| Strategy ID | Relevance | Integration Point |
|-------------|-----------|-------------------|
| **MIG-001** | Critical | Ensures `recordedVia` field present for DOM vs Vision routing |
| **ENG-008** | High | PlaybackEngine relies on injection for replayer.js deployment |
| **INT-001** | High | IframeHandler assumes content scripts injected in all frames |

### Specification Mapping
- **A1** (Core Recording) - Injection triggers event capture system
- **A2** (Shadow DOM) - MAIN world injection enables closed shadow root access
- **D3** (Cross-frame) - `all_frames: true` enables iframe automation
- **G4** (Playback Engine) - Injection deploys replayer.js for test execution

### Evidence References
- Code: `src/background/background.ts` lines 45-67 (injectRecordingScript)
- Config: `public/manifest.json` lines 12-18 (content_scripts declaration)
- Test: Manual verification in Chrome DevTools → Content Scripts panel

### Integration Risks
1. **Race Condition:** Declarative + programmatic injection may create duplicate event listeners
2. **CSP Bypass:** Sites with strict Content-Security-Policy may block injection
3. **MAIN World Conflicts:** page-interceptor.tsx monkey patch may collide with site scripts

---

## Related Components
- **Background Service Worker** (`background-service-worker_breakdown.md`) - Message routing hub that triggers injections
- **Content Script Recorder** (`content-script-recorder_breakdown.md`) - Script being injected for event capture
- **Content Script Replayer** (`content-script-replayer_breakdown.md`) - Script being injected for playback
- **Shadow DOM Handler** (`shadow-dom-handler_breakdown.md`) - Depends on MAIN world injection for closed shadow roots
- **Iframe Handler** (`iframe-handler_breakdown.md`) - Relies on `all_frames: true` injection config
