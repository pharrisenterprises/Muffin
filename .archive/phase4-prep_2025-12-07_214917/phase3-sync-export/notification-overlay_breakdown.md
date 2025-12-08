# Notification Overlay Breakdown

## Purpose
**What it does:** In-page visual feedback system that displays temporary notifications during test playback (step success/failure, element not found, etc.).

**Where it lives:** `showNotification()` function in `src/contentScript/content.tsx`

**Why it exists:** Provides immediate visual feedback to users watching test execution, separate from console logs.

## Inputs
```typescript
showNotification(message: string, type: 'success' | 'error' | 'info')
```

## Outputs
- Fixed-position overlay div at top-right of page
- Auto-dismisses after 3 seconds
- Colored based on type (green=success, red=error, blue=info)

## Internal Architecture
```typescript
function showNotification(message: string, type: 'success' | 'error' | 'info') {
  // Remove existing notification
  const existing = document.getElementById('muffin-notification');
  if (existing) existing.remove();
  
  // Create notification element
  const notification = document.createElement('div');
  notification.id = 'muffin-notification';
  notification.textContent = message;
  
  // Style based on type
  const colors = {
    success: 'background: #10b981; color: white;',
    error: 'background: #ef4444; color: white;',
    info: 'background: #3b82f6; color: white;'
  };
  
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    ${colors[type]}
    font-family: sans-serif;
    font-size: 14px;
    z-index: 999999;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    animation: slideInRight 0.3s ease-out;
  `;
  
  document.body.appendChild(notification);
  
  // Auto-dismiss after 3 seconds
  setTimeout(() => {
    notification.style.animation = 'fadeOut 0.3s ease-out';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}
```

**Usage Examples:**
```typescript
showNotification('✓ Step completed successfully', 'success');
showNotification('❌ Element not found', 'error');
showNotification('⌛ Waiting for element...', 'info');
```

## Critical Dependencies
- **DOM API** - `document.createElement`, `document.body.appendChild`
- **CSS animations** - slideInRight, fadeOut (injected or expected in page)

## Hidden Assumptions
1. **Single notification at a time** - Replaces previous
2. **Body element exists** - Appends to document.body
3. **Z-index sufficient** - 999999 should be above page content
4. **Animation CSS available** - May not animate if CSS missing

## Stability Concerns
- **Page CSS conflicts** - Page styles may override notification
- **No accessibility** - No ARIA attributes, screen reader support
- **Notification overflow** - Rapid calls may flicker (remove/add)
- **Fixed positioning breaks** - On pages with sticky headers

## Edge Cases
- **Page has no body** → appendChild fails
- **CSP blocks inline styles** → Notification invisible
- **Page overrides z-index** → Notification hidden behind content
- **Long messages** → May overflow viewport

## Developer-Must-Know Notes
- Notifications auto-dismiss after 3 seconds
- Only one notification visible at a time
- Positioned top-right (fixed position)
- Used during playback for step feedback
- No notification queue (latest replaces previous)