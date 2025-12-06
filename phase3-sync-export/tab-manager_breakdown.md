# Tab Manager Breakdown

## Purpose
**What it does:** Manages browser tab lifecycle for test execution - creates tabs, injects content scripts, tracks tab state, and handles tab cleanup.

**Where it lives:** `src/background/background.ts` - `openTab` and `closeTab` message handlers

**Why it exists:** Test playback requires fresh browser tabs with injected content scripts. This subsystem orchestrates tab creation, script injection, and cleanup.

## Inputs
```typescript
{
  action: 'openTab',
  url: string;  // Target URL (e.g., project.target_url)
}

{
  action: 'closeTab',
  tabId: number;
}
```

## Outputs
```typescript
{
  success: boolean;
  tabId?: number;      // For openTab
  error?: string;
}
```

## Internal Architecture
```typescript
case 'openTab': {
  // 1. Create new tab
  const tab = await chrome.tabs.create({
    url: message.url,
    active: true  // Bring to foreground
  });

  // 2. Wait for page load
  chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
    if (tabId === tab.id && info.status === 'complete') {
      chrome.tabs.onUpdated.removeListener(listener);

      // 3. Inject content script
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['js/content.js']
      }).then(() => {
        sendResponse({ success: true, tabId: tab.id });
      }).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    }
  });
  break;
}

case 'closeTab': {
  await chrome.tabs.remove(message.tabId);
  sendResponse({ success: true });
  break;
}
```

## Critical Dependencies
- **Chrome Tabs API** (`chrome.tabs.create`, `chrome.tabs.remove`, `chrome.tabs.onUpdated`)
- **Chrome Scripting API** (`chrome.scripting.executeScript`)
- **content.js** - Must be compiled and available in dist/js/

## Hidden Assumptions
1. **Content script available** - `js/content.js` must exist in build output
2. **Page loads within timeout** - No explicit timeout on `onUpdated` listener
3. **Single injection per tab** - Assumes content script not already injected
4. **Tab remains open** - Caller responsible for tab cleanup
5. **No cross-origin restrictions** - Assumes target URL allows script injection

## Stability Concerns
1. **Listener leak** - If page never loads, listener never removed
2. **Injection timing** - `status: 'complete'` may fire before DOM ready
3. **Tab closed before injection** - User manually closes tab before script injected
4. **Multiple openTab calls** - Creates multiple tabs concurrently

## Edge Cases
1. **Invalid URL** → chrome.tabs.create fails
2. **Page redirect** → May fire multiple 'complete' events
3. **Cross-origin iframe navigation** → Content script can't access
4. **Tab already has content script** → Re-injection may cause conflicts

## Developer-Must-Know Notes
- **Always wait for tab load** before injecting scripts
- **Remove listeners after use** to prevent memory leaks
- **Tab IDs are numbers** not strings
- **Content script persists** until tab closed or page navigated
