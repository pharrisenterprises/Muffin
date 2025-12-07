# popup.html Specification

**File ID:** G6  
**File Path:** `src/pages/popup.html`  
**Status:** CREATE (or MODIFY if exists)  
**Priority:** P1

---

## Purpose

HTML entry point for the Chrome extension popup that hosts the React application. Contains minimal HTML structure, references the bundled JavaScript and CSS, and provides the root element for React mounting. Serves as the container for Recorder, TestRunner, and all popup UI components.

---

## Dependencies

### Loads
- `popup.js`: Bundled React application
- `popup.css`: Extracted CSS (if separate)

### Hosts
- `Recorder.tsx`: Recording UI
- `TestRunner.tsx`: Playback UI
- `Analytics.tsx`: Telemetry dashboard
- All popup components

---

## Complete HTML

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="script-src 'self'; object-src 'self';">
  <title>Muffin - Browser Automation</title>
  <link rel="stylesheet" href="popup.css">
  <style>
    /* Critical CSS - prevents flash of unstyled content */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    html, body {
      width: 400px;
      min-height: 500px;
      max-height: 600px;
      overflow: hidden;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #1f2937;
      background-color: #ffffff;
    }
    
    #root {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    
    /* Loading state */
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 16px;
    }
    
    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #e5e7eb;
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .loading-text {
      color: #6b7280;
      font-size: 14px;
    }
    
    /* Error state */
    .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 24px;
      text-align: center;
      gap: 12px;
    }
    
    .error-icon {
      font-size: 48px;
    }
    
    .error-title {
      font-size: 16px;
      font-weight: 600;
      color: #dc2626;
    }
    
    .error-message {
      font-size: 13px;
      color: #6b7280;
    }
    
    .error-retry {
      margin-top: 8px;
      padding: 8px 16px;
      background: #6366f1;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
    }
    
    .error-retry:hover {
      background: #4f46e5;
    }
    
    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      body {
        color: #f3f4f6;
        background-color: #1f2937;
      }
      
      .loading-spinner {
        border-color: #374151;
        border-top-color: #818cf8;
      }
      
      .loading-text {
        color: #9ca3af;
      }
      
      .error-message {
        color: #9ca3af;
      }
    }
  </style>
</head>
<body>
  <div id="root">
    <!-- Initial loading state (replaced by React) -->
    <div class="loading-container" id="initial-loader">
      <div class="loading-spinner"></div>
      <div class="loading-text">Loading Muffin...</div>
    </div>
  </div>
  
  <!-- Error fallback (shown if JS fails to load) -->
  <noscript>
    <div class="error-container">
      <div class="error-icon">⚠️</div>
      <div class="error-title">JavaScript Required</div>
      <div class="error-message">
        Muffin requires JavaScript to run. Please enable JavaScript in your browser settings.
      </div>
    </div>
  </noscript>
  
  <!-- Main application bundle -->
  <script type="module" src="popup.js"></script>
  
  <!-- Error handling for script load failure -->
  <script>
    window.onerror = function(msg, url, lineNo, columnNo, error) {
      console.error('Muffin error:', msg, error);
      
      var root = document.getElementById('root');
      if (root) {
        root.innerHTML = 
          '<div class="error-container">' +
            '<div class="error-icon">❌</div>' +
            '<div class="error-title">Failed to Load</div>' +
            '<div class="error-message">' + (msg || 'An unexpected error occurred') + '</div>' +
            '<button class="error-retry" onclick="location.reload()">Retry</button>' +
          '</div>';
      }
      
      return false;
    };
    
    // Remove loader when React mounts
    window.addEventListener('DOMContentLoaded', function() {
      // Give React a moment to mount
      setTimeout(function() {
        var loader = document.getElementById('initial-loader');
        if (loader && loader.parentNode) {
          // Check if React has mounted something else
          var root = document.getElementById('root');
          if (root && root.children.length > 1) {
            loader.remove();
          }
        }
      }, 100);
    });
  </script>
</body>
</html>
```

---

## Structure Details

### Head Section

#### Meta Tags
```html
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="script-src 'self'; object-src 'self';">
```

- UTF-8 encoding for international characters
- Viewport for proper scaling
- CSP header for additional security (supplements manifest CSP)

#### Title
```html
<title>Muffin - Browser Automation</title>
```

Shown in Chrome's popup window title bar.

#### Stylesheets
```html
<link rel="stylesheet" href="popup.css">
```

External CSS bundle from Vite build.

#### Critical CSS
Inline styles for:
- Prevent FOUC (flash of unstyled content)
- Loading spinner animation
- Error state styling
- Dark mode support

---

### Body Section

#### Root Element
```html
<div id="root">
  <div class="loading-container" id="initial-loader">
    <div class="loading-spinner"></div>
    <div class="loading-text">Loading Muffin...</div>
  </div>
</div>
```

- React mounts to `#root`
- Initial loader shown until React renders
- Loader removed programmatically after mount

#### Noscript Fallback
```html
<noscript>
  <div class="error-container">...</div>
</noscript>
```

Fallback for JavaScript-disabled browsers (unlikely in extension context).

#### Script Loading
```html
<script type="module" src="popup.js"></script>
```

- `type="module"` for ES modules
- Matches Vite output configuration

#### Error Handling
```html
<script>
  window.onerror = function(msg, url, lineNo, columnNo, error) { ... };
</script>
```

Catches uncaught errors and displays user-friendly message.

---

## Dimensions

### Popup Size
```css
html, body {
  width: 400px;
  min-height: 500px;
  max-height: 600px;
}
```

Chrome extension popup constraints:
- Width: 400px (comfortable for UI)
- Min height: 500px (enough for main content)
- Max height: 600px (Chrome's limit is ~600px)

### Responsive Behavior
The popup has fixed width but flexible height within constraints.

---

## React Entry Point

### popup.tsx
```typescript
// src/pages/popup.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './popup.css';

// Remove initial loader
const loader = document.getElementById('initial-loader');
if (loader) {
  loader.remove();
}

// Mount React app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error('Root element not found');
}
```

---

## Dark Mode Support

### CSS Media Query
```css
@media (prefers-color-scheme: dark) {
  body {
    color: #f3f4f6;
    background-color: #1f2937;
  }
  /* ... */
}
```

Automatically matches system preference.

### React Integration
Components should also respect dark mode:
```typescript
// In React components
const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
```

---

## Loading States

### Initial Load
1. HTML loads instantly
2. Loading spinner shown
3. popup.js fetched and executed
4. React mounts and replaces loader

### Service Initialization
```typescript
// In App.tsx
const [servicesReady, setServicesReady] = useState(false);

useEffect(() => {
  chrome.runtime.sendMessage({ action: 'GET_SERVICE_STATUS' })
    .then(response => {
      setServicesReady(response.status.initialized);
    });
}, []);

if (!servicesReady) {
  return <LoadingScreen message="Initializing services..." />;
}
```

---

## Error Handling

### Script Load Failure
```javascript
window.onerror = function(msg, url, lineNo, columnNo, error) {
  // Display error UI
  root.innerHTML = '<div class="error-container">...</div>';
};
```

### React Error Boundary
```typescript
// In App.tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorDisplay error={this.state.error} onRetry={() => location.reload()} />;
    }
    return this.props.children;
  }
}
```

---

## Accessibility

### ARIA Attributes
```html
<div id="root" role="application" aria-label="Muffin Browser Automation">
```

### Focus Management
- First focusable element receives focus on open
- Tab order follows logical flow
- Escape key closes popup

### Screen Reader Support
- Loading states announced
- Error messages have proper roles
- Interactive elements labeled

---

## Build Output

### Vite Processing
Input: `src/pages/popup.html`
Output: `dist/popup.html`

The static copy plugin copies this file to dist.

### Referenced Files
After build, these files must exist in dist/:
- `popup.html` (this file)
- `popup.js` (bundled React app)
- `popup.css` (extracted styles)

---

## Browser Testing

### Local Development
```bash
# Build extension
npm run build

# Load in Chrome
# 1. Open chrome://extensions
# 2. Enable Developer mode
# 3. Click "Load unpacked"
# 4. Select dist/ folder
# 5. Click extension icon to open popup
```

### Debugging
```bash
# Right-click popup -> Inspect
# Opens DevTools for popup context
```

---

## Acceptance Criteria

- [ ] HTML structure valid (W3C validator)
- [ ] Root element present for React mount
- [ ] Loading spinner displays initially
- [ ] Loader removed after React mounts
- [ ] Error handler catches script failures
- [ ] Noscript fallback present
- [ ] Dark mode styles work
- [ ] Popup dimensions correct (400x500-600)
- [ ] CSP meta tag present
- [ ] Script loads as ES module
- [ ] CSS link references correct file
- [ ] Builds and copies to dist correctly

---

## Edge Cases

1. **Slow script load**: Loading spinner visible
2. **Script fails to load**: Error message shown
3. **React mount fails**: Error boundary catches
4. **Dark mode toggle**: Responds to system change
5. **Very slow services**: Extended loading state
6. **Popup reopened quickly**: Clean state each time
7. **Multiple popups**: Each has own context
8. **Extension update**: Popup reloads with new version
9. **Memory pressure**: Popup may be unloaded
10. **Zoom levels**: CSS handles scaling

---

## Estimated Lines

120-150 lines (HTML + inline CSS + inline JS)
