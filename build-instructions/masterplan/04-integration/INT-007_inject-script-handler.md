# INT-007: Inject Script Handler

> **Build Card:** INT-007  
> **Category:** Integration Points  
> **Dependencies:** ENG-001, FND-002  
> **Risk Level:** Medium  
> **Estimated Lines:** 220-280

---

## 1. PURPOSE

Implement the `VISION_INJECT_SCRIPT` message handler in the background script that dynamically injects scripts or code into target tabs. This handler enables VisionEngine to inject helper functions, event listeners, or coordination scripts into pages that don't have the content script pre-loaded, supporting advanced automation scenarios like cross-frame communication and dynamic content handling.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| Background Script | `src/background/background.ts` | Message handling structure |
| VisionEngine | `src/lib/visionEngine.ts` | Script injection needs |
| Manifest | `manifest.json` | scripting permission |
| API Contracts | `/future-spec/06_api-contracts.md` | Message payload specification |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/background/background.ts` | MODIFY | +95 |
| `src/types/messages.types.ts` | MODIFY | +30 |

### Artifacts

- `VISION_INJECT_SCRIPT` message handler added
- `VisionInjectScriptPayload` interface defined
- `VisionInjectScriptResponse` interface defined
- Script injection utilities

---

## 4. DETAILED SPECIFICATION

### 4.1 Type Definitions

```typescript
// In src/types/messages.types.ts

/**
 * Injection target for script
 */
export type InjectionTarget = 'page' | 'content' | 'all-frames';

/**
 * Injection timing
 */
export type InjectionTiming = 'document_start' | 'document_end' | 'document_idle';

/**
 * Payload for VISION_INJECT_SCRIPT message
 */
export interface VisionInjectScriptPayload {
  /** Tab ID to inject into */
  tabId: number;
  
  /** JavaScript code to inject */
  code?: string;
  
  /** Path to script file to inject */
  file?: string;
  
  /** Function to inject and execute */
  func?: (...args: unknown[]) => unknown;
  
  /** Arguments to pass to function */
  args?: unknown[];
  
  /** Target context for injection */
  target?: InjectionTarget;
  
  /** Specific frame IDs to inject into */
  frameIds?: number[];
  
  /** World to inject into (MAIN or ISOLATED) */
  world?: 'MAIN' | 'ISOLATED';
  
  /** When to inject relative to page load */
  injectImmediately?: boolean;
}

/**
 * Response from VISION_INJECT_SCRIPT handler
 */
export interface VisionInjectScriptResponse {
  success: boolean;
  
  /** Results from script execution (per frame) */
  results?: Array<{
    frameId: number;
    result: unknown;
    error?: string;
  }>;
  
  /** Number of frames injected into */
  framesInjected?: number;
  
  /** Error message if failed */
  error?: string;
}
```

### 4.2 Inject Script Handler Implementation

```typescript
// In src/background/background.ts - Add to message handlers

import { 
  VisionInjectScriptPayload, 
  VisionInjectScriptResponse 
} from '@/types/messages.types';

/**
 * Handles VISION_INJECT_SCRIPT messages - injects scripts into tabs
 */
async function handleVisionInjectScript(
  payload: VisionInjectScriptPayload
): Promise<VisionInjectScriptResponse> {
  const {
    tabId,
    code,
    file,
    func,
    args = [],
    target = 'content',
    frameIds,
    world = 'ISOLATED',
    injectImmediately = true
  } = payload;

  const response: VisionInjectScriptResponse = {
    success: false
  };

  try {
    // Validate we have something to inject
    if (!code && !file && !func) {
      response.error = 'Must provide code, file, or func to inject';
      return response;
    }

    // Verify tab exists and is accessible
    const tab = await chrome.tabs.get(tabId);
    
    if (!tab) {
      response.error = `Tab ${tabId} not found`;
      return response;
    }

    // Check if URL is injectable
    if (tab.url && isProtectedUrl(tab.url)) {
      response.error = `Cannot inject into protected URL: ${tab.url}`;
      return response;
    }

    // Build injection target
    const injectionTarget: chrome.scripting.InjectionTarget = {
      tabId
    };

    // Set frame targeting
    if (frameIds && frameIds.length > 0) {
      injectionTarget.frameIds = frameIds;
    } else if (target === 'all-frames') {
      injectionTarget.allFrames = true;
    } else {
      // Default to main frame only
      injectionTarget.frameIds = [0];
    }

    // Build script injection options
    let injectionResults: chrome.scripting.InjectionResult[];

    if (func) {
      // Inject function
      injectionResults = await chrome.scripting.executeScript({
        target: injectionTarget,
        func: func as () => unknown,
        args: args,
        world: world as chrome.scripting.ExecutionWorld,
        injectImmediately
      });
    } else if (code) {
      // Inject code string
      injectionResults = await chrome.scripting.executeScript({
        target: injectionTarget,
        func: createCodeWrapper(code),
        world: world as chrome.scripting.ExecutionWorld,
        injectImmediately
      });
    } else if (file) {
      // Inject file
      injectionResults = await chrome.scripting.executeScript({
        target: injectionTarget,
        files: [file],
        world: world as chrome.scripting.ExecutionWorld,
        injectImmediately
      });
    } else {
      response.error = 'No injection source provided';
      return response;
    }

    // Process results
    response.results = injectionResults.map(result => ({
      frameId: result.frameId,
      result: result.result,
      error: result.error?.message
    }));

    response.framesInjected = injectionResults.length;
    response.success = injectionResults.every(r => !r.error);

    if (!response.success) {
      const errors = response.results
        .filter(r => r.error)
        .map(r => `Frame ${r.frameId}: ${r.error}`)
        .join('; ');
      response.error = `Some frames failed: ${errors}`;
    }

  } catch (error) {
    response.error = error instanceof Error ? error.message : 'Script injection failed';
    
    // Handle specific Chrome errors
    if (response.error.includes('Cannot access')) {
      response.error = 'Cannot access this page (protected or cross-origin)';
    }
  }

  return response;
}

/**
 * Creates a wrapper function to execute code string
 */
function createCodeWrapper(code: string): () => unknown {
  return new Function(code) as () => unknown;
}

/**
 * Checks if URL is protected from injection
 */
function isProtectedUrl(url: string): boolean {
  const protectedPrefixes = [
    'chrome://',
    'chrome-extension://',
    'edge://',
    'about:',
    'data:',
    'javascript:',
    'file://'  // May be allowed with permissions
  ];

  return protectedPrefixes.some(prefix => url.startsWith(prefix));
}

// Register handler in message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'VISION_INJECT_SCRIPT') {
    handleVisionInjectScript(message.payload)
      .then(sendResponse)
      .catch(error => {
        sendResponse({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      });
    return true; // Async response
  }
  
  // ... other handlers ...
  
  return false;
});
```

### 4.3 Helper Script Library

```typescript
// Pre-built helper functions that can be injected

/**
 * Helper to highlight element at coordinates (for debugging)
 */
export function highlightElementAtPoint(x: number, y: number): void {
  const element = document.elementFromPoint(x, y);
  if (element) {
    const originalOutline = (element as HTMLElement).style.outline;
    (element as HTMLElement).style.outline = '3px solid red';
    setTimeout(() => {
      (element as HTMLElement).style.outline = originalOutline;
    }, 2000);
  }
}

/**
 * Helper to scroll element into center of viewport
 */
export function scrollToCenter(selector: string): boolean {
  const element = document.querySelector(selector);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return true;
  }
  return false;
}

/**
 * Helper to wait for element to appear
 */
export function waitForElement(
  selector: string,
  timeoutMs: number = 5000
): Promise<Element | null> {
  return new Promise((resolve) => {
    const existing = document.querySelector(selector);
    if (existing) {
      resolve(existing);
      return;
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeoutMs);
  });
}

/**
 * Helper to get all text content on page
 */
export function getAllPageText(): string {
  return document.body.innerText;
}

/**
 * Helper to check if page has finished loading
 */
export function isPageReady(): boolean {
  return document.readyState === 'complete';
}
```

### 4.4 MAIN World Injection (Page Context)

```typescript
/**
 * Injects into MAIN world to access page's JavaScript context
 * Useful for interacting with page's own scripts/variables
 */
async function injectIntoMainWorld(
  tabId: number,
  code: string
): Promise<VisionInjectScriptResponse> {
  return handleVisionInjectScript({
    tabId,
    code,
    world: 'MAIN',  // Access page's JS context
    target: 'page'
  });
}

// Example: Check if React is on page
const checkReact = `
  if (typeof React !== 'undefined') {
    return { hasReact: true, version: React.version };
  }
  return { hasReact: false };
`;
```

---

## 5. CODE EXAMPLES

### 5.1 Inject Code String

```typescript
// Inject simple code to get page title
chrome.runtime.sendMessage({
  type: 'VISION_INJECT_SCRIPT',
  payload: {
    tabId: activeTabId,
    code: 'return document.title;'
  }
}, (response) => {
  if (response.success) {
    console.log('Page title:', response.results[0].result);
  }
});
```

### 5.2 Inject Function with Arguments

```typescript
// Inject function to highlight element
chrome.runtime.sendMessage({
  type: 'VISION_INJECT_SCRIPT',
  payload: {
    tabId: activeTabId,
    func: (x: number, y: number) => {
      const el = document.elementFromPoint(x, y);
      if (el) {
        (el as HTMLElement).style.outline = '3px solid red';
        return el.tagName;
      }
      return null;
    },
    args: [250, 400]
  }
}, (response) => {
  console.log('Highlighted:', response.results[0].result);
});
```

### 5.3 Inject into All Frames

```typescript
// Inject into all frames on page
chrome.runtime.sendMessage({
  type: 'VISION_INJECT_SCRIPT',
  payload: {
    tabId: activeTabId,
    code: 'return window.location.href;',
    target: 'all-frames'
  }
}, (response) => {
  console.log(`Injected into ${response.framesInjected} frames`);
  response.results.forEach(r => {
    console.log(`Frame ${r.frameId}: ${r.result}`);
  });
});
```

### 5.4 Inject Script File

```typescript
// Inject a script file from extension
chrome.runtime.sendMessage({
  type: 'VISION_INJECT_SCRIPT',
  payload: {
    tabId: activeTabId,
    file: 'scripts/visionHelpers.js'
  }
});
```

### 5.5 MAIN World Injection

```typescript
// Access page's JavaScript context
chrome.runtime.sendMessage({
  type: 'VISION_INJECT_SCRIPT',
  payload: {
    tabId: activeTabId,
    code: `
      // Access page's global variables
      if (typeof angular !== 'undefined') {
        return { framework: 'Angular', version: angular.version.full };
      }
      if (typeof React !== 'undefined') {
        return { framework: 'React', version: React.version };
      }
      if (typeof Vue !== 'undefined') {
        return { framework: 'Vue', version: Vue.version };
      }
      return { framework: 'Unknown' };
    `,
    world: 'MAIN'
  }
});
```

### 5.6 Integration in VisionEngine

```typescript
// In VisionEngine - inject helper script
async injectHelperScript(tabId: number): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        type: 'VISION_INJECT_SCRIPT',
        payload: {
          tabId,
          file: 'scripts/visionContentHelper.js',
          world: 'ISOLATED',
          injectImmediately: true
        }
      },
      (response: VisionInjectScriptResponse) => {
        resolve(response.success);
      }
    );
  });
}

// Run custom detection script
async runDetectionScript(tabId: number, code: string): Promise<unknown> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        type: 'VISION_INJECT_SCRIPT',
        payload: {
          tabId,
          code,
          world: 'ISOLATED'
        }
      },
      (response: VisionInjectScriptResponse) => {
        if (response.success && response.results?.[0]) {
          resolve(response.results[0].result);
        } else {
          resolve(null);
        }
      }
    );
  });
}
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** Injects code string and returns result
- [ ] **AC-2:** Injects function with arguments
- [ ] **AC-3:** Injects script file from extension
- [ ] **AC-4:** Supports targeting specific frame IDs
- [ ] **AC-5:** Supports injection into all frames
- [ ] **AC-6:** Supports MAIN world (page context)
- [ ] **AC-7:** Supports ISOLATED world (extension context)
- [ ] **AC-8:** Returns per-frame results
- [ ] **AC-9:** Handles protected URLs gracefully
- [ ] **AC-10:** Reports injection errors clearly

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Permission required** - Needs `scripting` permission in manifest
2. **Protected pages** - Cannot inject into chrome:// etc.
3. **Cross-origin frames** - May require additional permissions

### Patterns to Follow

1. **World isolation** - Use ISOLATED for extension code
2. **Error aggregation** - Collect errors from all frames
3. **Result mapping** - Return results per frame

### Edge Cases

1. **Tab navigating** - Injection may fail mid-navigation
2. **Frame removed** - Frame may disappear before injection
3. **CSP restrictions** - Some pages block script injection
4. **Sandboxed frames** - May have restricted capabilities
5. **PDF viewer** - Chrome's PDF viewer blocks injection

---

## 8. VERIFICATION COMMANDS

```bash
# Verify handler registration
grep -n "VISION_INJECT_SCRIPT" src/background/background.ts

# Verify type definitions
grep -n "VisionInjectScriptPayload\|VisionInjectScriptResponse" src/types/messages.types.ts

# Verify manifest permissions
grep -n "scripting" manifest.json

# Run type check
npm run type-check

# Build extension
npm run build
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Revert background script changes
git checkout src/background/background.ts

# Revert type definitions
git checkout src/types/messages.types.ts
```

---

## 10. REFERENCES

- ENG-001: VisionEngine Class
- FND-002: Manifest Permissions
- API Contracts: `/future-spec/06_api-contracts.md`
- Chrome Scripting API: `chrome.scripting.executeScript`

---

*End of Specification INT-007*
