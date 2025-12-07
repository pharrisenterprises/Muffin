# manifest.json Modifications Specification

**File ID:** G2  
**File Path:** `manifest.json`  
**Status:** MODIFY  
**Priority:** P0

---

## Purpose

Modify the Chrome extension manifest to support Phase 3 multi-layer recording and CDP-based playback. Updates include adding debugger permission for CDP access, enabling service worker for background script, declaring content script injection patterns, and ensuring proper permissions for screenshot capture, storage, and tab access. Critical for extension functionality.

---

## Current State Analysis

The existing manifest.json likely has:
- Basic permissions for tabs and storage
- Content script declaration
- Popup page configuration
- Basic extension metadata

---

## Dependencies

### Enables
- `./background/background.ts`: Service worker with CDP access
- `./contentScript/content.tsx`: Content script injection
- `./pages/*`: Extension pages

### Required By
- All extension functionality depends on proper manifest configuration

---

## Required Modifications

### 1. Full Manifest Structure

```json
{
  "manifest_version": 3,
  "name": "Muffin",
  "version": "2.0.0",
  "description": "AI-powered browser automation with 7-tier fallback strategy system",
  
  "permissions": [
    "activeTab",
    "tabs",
    "storage",
    "debugger",
    "scripting",
    "webNavigation"
  ],
  
  "optional_permissions": [
    "clipboardRead",
    "clipboardWrite"
  ],
  
  "host_permissions": [
    "<all_urls>"
  ],
  
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["contentScript.js"],
      "css": ["contentScript.css"],
      "run_at": "document_idle",
      "all_frames": true
    }
  ],
  
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "32": "icons/icon32.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    },
    "default_title": "Muffin - Browser Automation"
  },
  
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  
  "web_accessible_resources": [
    {
      "resources": [
        "tesseract-worker.js",
        "tesseract-core.wasm.js",
        "eng.traineddata.gz"
      ],
      "matches": ["<all_urls>"]
    }
  ],
  
  "content_security_policy": {
    "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
  },
  
  "minimum_chrome_version": "100"
}
```

---

## Permission Details

### Required Permissions

| Permission | Purpose | Used By |
|------------|---------|---------|
| `activeTab` | Access to active tab for recording/playback | RecordingOrchestrator, DecisionEngine |
| `tabs` | Query and manage tabs | Background script, TestRunner |
| `storage` | Save recordings, telemetry, settings | TelemetryLogger, Storage handlers |
| `debugger` | CDP access for DOM, Accessibility, Input | CDPService, all strategy evaluators |
| `scripting` | Inject content scripts dynamically | Background script |
| `webNavigation` | Track page navigation events | NetworkCapture, AutoWaiting |

### Optional Permissions

| Permission | Purpose | When Requested |
|------------|---------|----------------|
| `clipboardRead` | Paste from clipboard in playback | Type action with clipboard content |
| `clipboardWrite` | Copy test results | Export functionality |

### Host Permissions

```json
"host_permissions": ["<all_urls>"]
```

Required for:
- Content script injection on any page
- CDP attachment to any tab
- Screenshot capture from any origin
- Cross-origin iframe access

---

## Background Service Worker

```json
"background": {
  "service_worker": "background.js",
  "type": "module"
}
```

### Key Points
- Manifest V3 requires service worker (not persistent background page)
- `"type": "module"` enables ES module imports
- Service worker may be terminated when idle
- Must handle reinitialization on wake

### Build Output
The build process must compile `src/background/background.ts` to `dist/background.js`.

---

## Content Scripts

```json
"content_scripts": [
  {
    "matches": ["<all_urls>"],
    "js": ["contentScript.js"],
    "css": ["contentScript.css"],
    "run_at": "document_idle",
    "all_frames": true
  }
]
```

### Configuration Options

| Option | Value | Reason |
|--------|-------|--------|
| `matches` | `<all_urls>` | Record/playback on any website |
| `run_at` | `document_idle` | Ensure DOM is ready |
| `all_frames` | `true` | Support iframe recording |

### Build Output
- `src/contentScript/content.tsx` → `dist/contentScript.js`
- `src/contentScript/content.css` → `dist/contentScript.css`

---

## Web Accessible Resources

```json
"web_accessible_resources": [
  {
    "resources": [
      "tesseract-worker.js",
      "tesseract-core.wasm.js",
      "eng.traineddata.gz"
    ],
    "matches": ["<all_urls>"]
  }
]
```

### Tesseract.js Resources
Required for Vision OCR functionality:
- `tesseract-worker.js`: Web worker for OCR processing
- `tesseract-core.wasm.js`: WebAssembly OCR engine
- `eng.traineddata.gz`: English language training data

### Resource Locations
These files should be copied to `dist/` during build from:
- `node_modules/tesseract.js/dist/`
- `node_modules/tesseract.js-core/`

---

## Content Security Policy

```json
"content_security_policy": {
  "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
}
```

### CSP Requirements
- `'self'`: Allow scripts from extension origin
- `'wasm-unsafe-eval'`: Required for Tesseract.js WebAssembly execution
- `object-src 'self'`: Restrict object/embed to extension origin

### Security Considerations
- No `unsafe-eval` to prevent script injection
- No remote script loading
- WASM evaluation restricted to Tesseract only

---

## Extension Pages

### Popup
```json
"action": {
  "default_popup": "popup.html",
  "default_icon": {...},
  "default_title": "Muffin - Browser Automation"
}
```

The popup serves as the main UI entry point, containing:
- Recorder.tsx
- TestRunner.tsx
- Settings/Analytics access

### Build Output
- `src/pages/popup.html` → `dist/popup.html`
- React app bundle → `dist/popup.js`

---

## Version Update

```json
"version": "2.0.0"
```

Increment to 2.0.0 for Phase 3 release:
- Major version bump indicates breaking changes
- New recording format (FallbackChain)
- New playback system (DecisionEngine)
- Backward compatibility with V1 recordings maintained

---

## Minimum Chrome Version

```json
"minimum_chrome_version": "100"
```

Required for:
- Full CDP support via chrome.debugger
- Manifest V3 service worker stability
- Modern JavaScript features
- WebAssembly support

---

## Build Configuration Updates

### webpack.config.js or vite.config.ts

Ensure the build configuration:

1. **Outputs correct file names**
```javascript
entry: {
  background: './src/background/background.ts',
  contentScript: './src/contentScript/content.tsx',
  popup: './src/pages/popup.tsx'
}
```

2. **Copies Tesseract resources**
```javascript
// Copy plugin configuration
new CopyPlugin({
  patterns: [
    { from: 'node_modules/tesseract.js/dist/worker.min.js', to: 'tesseract-worker.js' },
    { from: 'node_modules/tesseract.js-core/tesseract-core.wasm.js', to: 'tesseract-core.wasm.js' },
    { from: 'node_modules/tesseract.js/lang-data/eng.traineddata.gz', to: 'eng.traineddata.gz' },
    { from: 'manifest.json', to: 'manifest.json' },
    { from: 'icons', to: 'icons' }
  ]
})
```

3. **Generates proper module format**
```javascript
output: {
  filename: '[name].js',
  path: path.resolve(__dirname, 'dist'),
  module: true
}
```

---

## Migration Notes

### From Manifest V2
If upgrading from V2:
1. Replace `"background": { "scripts": [...] }` with service worker
2. Move `"web_accessible_resources"` to new format with matches
3. Update permissions (some may need to be host_permissions)
4. Remove deprecated `"browser_action"` (use `"action"`)

### Service Worker Considerations
1. No DOM access in service worker
2. Use chrome.storage instead of localStorage
3. Handle service worker termination gracefully
4. Keep-alive patterns for long operations

---

## Acceptance Criteria

- [ ] `debugger` permission declared for CDP access
- [ ] Service worker configuration correct
- [ ] Content script injected on all URLs
- [ ] Tesseract resources web accessible
- [ ] CSP allows WASM execution
- [ ] All required permissions declared
- [ ] Host permissions cover all URLs
- [ ] Version updated to 2.0.0
- [ ] Minimum Chrome version specified
- [ ] Build outputs match manifest references
- [ ] Extension loads without manifest errors
- [ ] Debugger attaches successfully
- [ ] Content script injects properly

---

## Edge Cases

1. **Corporate policies blocking debugger**: Warn user
2. **Missing host permission**: Request on first use
3. **WASM blocked by enterprise**: Fallback or error
4. **Tesseract files missing**: Check on startup
5. **Content script already injected**: Handle idempotently
6. **Service worker terminated**: Reinitialize on wake
7. **Incognito mode**: May need separate permission
8. **Chrome updates**: Monitor for API changes
9. **Extension update**: Handle storage migration
10. **Permission revoked**: Graceful degradation

---

## Estimated Lines

60-80 lines (JSON)
