# Injection Manager Breakdown

## Purpose
**What it does:** Handles dynamic injection of content scripts and page-context scripts into target tabs. Ensures correct execution context (content vs page) for different script types.

**Where it lives:** 
- `src/background/background.ts` - `chrome.scripting.executeScript` calls
- Manifest content_scripts configuration
- Programmatic injection logic

**Why it exists:** Chrome extensions have multiple execution contexts (isolated world, page context). Different automation tasks require different injection strategies.

## Inputs
**Injection Types:**
1. **Content Script** (isolated world) - `content.js`
2. **Page Interceptor** (page context) - `page-interceptor.js`
3. **Google Replay** (page context) - `replay.js`

## Outputs
- Content scripts injected into tab's isolated world
- Page scripts injected into main page context
- Scripts have appropriate permissions and DOM access

## Internal Architecture
**Manifest Configuration:**
```json
{
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["js/content.js"],
      "run_at": "document_end"
    }
  ]
}
```

**Programmatic Injection:**
```typescript
// Inject content script after tab creation
chrome.scripting.executeScript({
  target: { tabId: tab.id },
  files: ['js/content.js']
});

// Inject page-context script
chrome.scripting.executeScript({
  target: { tabId: tab.id },
  files: ['js/page-interceptor.js'],
  world: 'MAIN'  // Page context, not isolated world
});
```

## Critical Dependencies
- **Chrome Scripting API** (`chrome.scripting.executeScript`)
- **Manifest permissions** (`scripting`, `activeTab`)
- **Build output** - Scripts must be in dist/js/

## Hidden Assumptions
1. **All tabs injectable** - Assumes no chrome:// or extension:// URLs
2. **Scripts bundled correctly** - Assumes Vite build outputs to correct paths
3. **No CSP conflicts** - Page CSP doesn't block inline scripts
4. **DOM ready timing** - `document_end` assumes DOM parsed

## Stability Concerns
1. **CSP blocking** - Strict Content Security Policy prevents injection
2. **Cross-origin restrictions** - Cannot inject into chrome:// pages
3. **Race conditions** - Page navigation during injection
4. **Multiple injections** - Same script injected twice causes conflicts

## Developer-Must-Know Notes
- **Use `world: 'MAIN'` for page-context access** (closed shadow roots)
- **Content scripts run in isolated world** (no access to page JS)
- **Injection fails silently** on restricted pages
- **Check tab.url before injection** to avoid chrome:// pages
