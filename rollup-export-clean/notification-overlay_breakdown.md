# Notification Overlay - Component Breakdown

**Last Updated:** December 7, 2025

---

## Purpose
**What it does:** Creates temporary in-page visual feedback overlays during test playback. Displays step execution status (success/error/info) as colored notification boxes in the top-right corner of the page.

**Where it lives:** `showNotification()` function in `src/contentScript/replayer.tsx` (content script)

**Why it exists:** Provides real-time visual feedback to users watching automated tests execute. Confirms each step's success/failure without requiring console monitoring.

---

## Inputs
```typescript
showNotification(
  message: string,
  type: 'success' | 'error' | 'info' = 'info'
): void
```

**Examples:**
```typescript
showNotification('✓ Clicked "Submit" button', 'success');
showNotification('✗ Element not found: #username', 'error');
showNotification('ℹ Waiting for page load...', 'info');
```

---

## Outputs
**Visual Overlay:**
- Fixed-position div at top-right corner
- Colored border/background based on type:
  - **success:** Green border, light green background
  - **error:** Red border, light red background
  - **info:** Blue border, light blue background
- Auto-dismisses after 3 seconds

**DOM Structure:**
```html
<div id="muffin-notification" style="...">
  ✓ Clicked "Submit" button
</div>
```

---

## Internal Architecture

### Implementation
```typescript
// replayer.tsx
function showNotification(
  message: string,
  type: 'success' | 'error' | 'info' = 'info'
): void {
  // Remove existing notification
  const existing = document.getElementById('muffin-notification');
  if (existing) {
    existing.remove();
  }

  // Create new notification div
  const notif = document.createElement('div');
  notif.id = 'muffin-notification';
  notif.textContent = message;

  // Style based on type
  const colors = {
    success: { border: '#10b981', bg: '#d1fae5' },
    error: { border: '#ef4444', bg: '#fee2e2' },
    info: { border: '#3b82f6', bg: '#dbeafe' }
  };

  notif.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border: 2px solid ${colors[type].border};
    background: ${colors[type].bg};
    border-radius: 8px;
    font-family: system-ui, sans-serif;
    font-size: 14px;
    z-index: 999999;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    max-width: 400px;
    word-wrap: break-word;
  `;

  document.body.appendChild(notif);

  // Auto-dismiss after 3 seconds
  setTimeout(() => {
    if (notif.parentNode) {
      notif.remove();
    }
  }, 3000);
}
```

### Usage During Playback
```typescript
// replayer.tsx playback loop
for (const step of steps) {
  try {
    // Execute step
    await executeStep(step);
    
    // Show success notification
    showNotification(
      `✓ ${step.event}: ${step.label}`,
      'success'
    );
    
    await delay(globalDelayMs);
  } catch (error) {
    // Show error notification
    showNotification(
      `✗ Failed to ${step.event} on ${step.label}: ${error.message}`,
      'error'
    );
    break;
  }
}
```

---

## Critical Dependencies
**Upstream:**
- **replayer.tsx** - Calls showNotification() during playback
- **Test execution logic** - Determines success/error status

**Downstream:**
- **DOM API** - createElement, appendChild, remove
- **document.body** - Attachment point for notification

**External:**
- None (pure DOM manipulation, no libraries)

---

## Hidden Assumptions
1. **document.body exists** - Assumes page has body element
2. **z-index 999999 sufficient** - Assumes no site elements have higher z-index
3. **Fixed positioning safe** - Assumes page doesn't override fixed positioning
4. **3-second duration** - Hardcoded, no user customization
5. **Top-right placement** - Hardcoded position (may overlap site UI)
6. **Single notification** - Previous notification removed (no queuing)
7. **No React/framework** - Plain DOM manipulation (runs in content script context)

---

## Stability Concerns

### High-Risk Patterns
1. **Z-index collision**
   ```typescript
   // Site has modal with z-index: 9999999
   // → Notification hidden behind modal
   ```

2. **document.body null during page load**
   ```typescript
   showNotification('Loading...');
   // If called before body exists → throws error
   ```

3. **Rapid consecutive calls**
   ```typescript
   showNotification('Step 1');
   showNotification('Step 2');  // Immediately removes Step 1
   // → User doesn't see first notification
   ```

4. **Long messages overflow viewport**
   ```typescript
   showNotification('Very long error message with stack trace...');
   // → May extend off-screen
   ```

### Failure Modes
- **Body not available** - Throws error on appendChild()
- **CSS conflicts** - Site's !important rules may override styles
- **Mobile viewport** - Fixed top-right may not work on small screens
- **Notification removal race** - setTimeout may fire after navigation

---

## Edge Cases

### Input Variations
1. **Empty message**
   ```typescript
   showNotification('');  // Shows blank notification box
   ```

2. **Very long message**
   ```typescript
   showNotification('Lorem ipsum...'.repeat(100));
   // max-width: 400px prevents full overflow
   ```

3. **HTML in message**
   ```typescript
   showNotification('<script>alert("xss")</script>');
   // textContent (not innerHTML) prevents XSS
   ```

4. **Invalid type**
   ```typescript
   showNotification('Test', 'warning');  // TypeScript error
   // Falls back to 'info' default
   ```

5. **Called during page navigation**
   ```typescript
   showNotification('Loading...');
   window.location.href = 'https://example.com';
   // Notification lost after navigation
   ```

---

## Developer-Must-Know Notes
- **No framework dependencies** - Pure DOM manipulation for minimal overhead
- **XSS-safe** - Uses `textContent` not `innerHTML`
- **No queuing** - Multiple rapid calls only show latest notification
- **Hardcoded position** - Top-right corner may conflict with site UI elements
- **Auto-dismiss** - 3-second timeout not configurable
- **Content script context** - Runs in isolated world, doesn't pollute page globals
- **Visual only** - No logging to console or file

---

## Phase 3 Integration Points

### Strategy Implementation
| Strategy ID | Relevance | Integration Point |
|-------------|-----------|-------------------|
| **ENG-008** | High | PlaybackEngine calls showNotification() for each step execution |
| **UI-011** | Medium | Delay configuration affects notification display timing |
| **TST-009** | High | Success/error notifications critical for test result validation |

### Specification Mapping
- **G4** (Playback Engine) - Visual feedback during test execution
- **G5** (Error Handling) - Error notifications surface failures to user
- **H2** (User Experience) - Real-time status updates improve observability

### Evidence References
- Code: `src/contentScript/replayer.tsx` lines 15-55 (showNotification function)
- Visual: Screenshot in test documentation showing notification overlay
- Test: Manual verification during playback (visible in browser)

### Integration Risks
1. **Z-Index Conflicts:** Site modals/overlays may hide notifications (z-index < 999999)
2. **Mobile Breakage:** Fixed positioning may not work on small viewports
3. **Rapid Steps:** Fast playback (globalDelayMs=0) may flash notifications too quickly
4. **Page Navigation:** Notifications lost during page transitions (not persisted)

---

## Related Components
- **Content Script Replayer** (`content-script-replayer_breakdown.md`) - Main caller of showNotification()
- **Step Executor** (`step-executor_breakdown.md`) - Determines success/error for notification type
- **Test Logger** (`test-logger_breakdown.md`) - Parallel logging system (console-based)
- **Playback Engine** (`test-orchestrator_breakdown.md`) - Orchestrates playback triggering notifications
