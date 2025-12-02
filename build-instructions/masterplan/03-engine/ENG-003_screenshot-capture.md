# ENG-003: SCREENSHOT CAPTURE SPECIFICATION

> **Build Card:** ENG-003  
> **Category:** Engine / Core  
> **Dependencies:** ENG-001 (VisionEngine shell), ENG-002 (Worker init)  
> **Risk Level:** Low  
> **Estimated Lines:** ~380

---

## 1. PURPOSE

This specification implements screenshot capture functionality for the VisionEngine. Screenshots are the input for OCR processing. The implementation must:

1. **Capture visible tab** - Use Chrome's tab capture API
2. **Handle DPI scaling** - Account for high-DPI displays
3. **Support regions** - Capture specific viewport regions
4. **Cache results** - Avoid redundant captures
5. **Error handling** - Handle permission and capture failures

This implements the `captureScreenshot()` method stub from ENG-001.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| ENG-001 | VisionEngine shell | Method signature |
| Chrome API Docs | developer.chrome.com | tabs.captureVisibleTab |
| FND-002 | Manifest permissions | Required permissions |
| Architecture Spec | `/future-spec/04_architecture.md` | Capture flow |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `src/lib/visionEngine.ts` | MODIFY | Implement captureScreenshot() |
| `src/lib/screenshotUtils.ts` | CREATE | Screenshot utility functions |

### Implementation Details

| Method | Status | Description |
|--------|--------|-------------|
| `captureScreenshot()` | IMPLEMENT | Full implementation |
| `captureRegion()` | ADD | Capture specific region |
| `getScreenshotHash()` | ADD | Hash for caching |

---

## 4. DETAILED SPECIFICATION

### 4.1 Screenshot Utilities

Create `src/lib/screenshotUtils.ts`:

```typescript
/**
 * @fileoverview Screenshot capture utilities
 * @module lib/screenshotUtils
 * 
 * Provides utilities for capturing and processing screenshots
 * from Chrome tabs for OCR processing.
 */

/**
 * Screenshot capture options
 */
export interface CaptureOptions {
  /** Image format */
  format?: 'png' | 'jpeg';
  /** JPEG quality (0-100), only used for jpeg format */
  quality?: number;
  /** Tab ID to capture (defaults to active tab) */
  tabId?: number;
  /** Window ID containing the tab */
  windowId?: number;
}

/**
 * Region specification for partial screenshots
 */
export interface CaptureRegion {
  /** Left edge X coordinate */
  x: number;
  /** Top edge Y coordinate */
  y: number;
  /** Region width */
  width: number;
  /** Region height */
  height: number;
}

/**
 * Screenshot result with metadata
 */
export interface ScreenshotData {
  /** Base64-encoded image data (without data URL prefix) */
  data: string;
  /** Full data URL for display */
  dataUrl: string;
  /** Image width in pixels */
  width: number;
  /** Image height in pixels */
  height: number;
  /** Device pixel ratio at capture time */
  devicePixelRatio: number;
  /** Timestamp when captured */
  timestamp: number;
  /** Image format */
  format: 'png' | 'jpeg';
  /** Hash for caching/comparison */
  hash: string;
}

/**
 * Captures the visible area of a tab
 * @param options - Capture options
 * @returns Screenshot data
 * @throws Error if capture fails
 */
export async function captureVisibleTab(
  options: CaptureOptions = {}
): Promise<ScreenshotData> {
  const { format = 'png', quality = 92 } = options;

  try {
    // Determine which tab to capture
    let windowId: number | undefined = options.windowId;
    
    if (!windowId && options.tabId) {
      // Get window ID from tab
      const tab = await chrome.tabs.get(options.tabId);
      windowId = tab.windowId;
    }

    // Capture the visible tab
    const dataUrl = await chrome.tabs.captureVisibleTab(windowId, {
      format,
      quality: format === 'jpeg' ? quality : undefined,
    });

    // Extract base64 data (remove data URL prefix)
    const base64Data = dataUrl.split(',')[1];

    // Get image dimensions
    const dimensions = await getImageDimensions(dataUrl);

    // Get device pixel ratio from active tab
    const dpr = await getDevicePixelRatio(options.tabId);

    // Generate hash for caching
    const hash = await generateImageHash(base64Data);

    return {
      data: base64Data,
      dataUrl,
      width: dimensions.width,
      height: dimensions.height,
      devicePixelRatio: dpr,
      timestamp: Date.now(),
      format,
      hash,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown capture error';
    
    // Provide helpful error messages
    if (message.includes('cannot be captured')) {
      throw new Error(
        'Cannot capture this tab. Chrome system pages (chrome://, ' +
        'chrome-extension://, etc.) cannot be captured.'
      );
    }
    
    if (message.includes('permission')) {
      throw new Error(
        'Screenshot permission denied. Ensure the extension has the ' +
        '"activeTab" or "tabs" permission.'
      );
    }
    
    throw new Error(`Screenshot capture failed: ${message}`);
  }
}

/**
 * Gets image dimensions from a data URL
 * @param dataUrl - Image data URL
 * @returns Width and height
 */
export function getImageDimensions(
  dataUrl: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image for dimension calculation'));
    };
    
    img.src = dataUrl;
  });
}

/**
 * Gets the device pixel ratio from a tab
 * @param tabId - Tab ID (uses active tab if not specified)
 * @returns Device pixel ratio
 */
export async function getDevicePixelRatio(tabId?: number): Promise<number> {
  try {
    // Execute script in tab to get DPR
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId || (await getActiveTabId()) },
      func: () => window.devicePixelRatio,
    });
    
    return results[0]?.result || 1;
  } catch {
    // Default to 1 if we can't get DPR
    return 1;
  }
}

/**
 * Gets the active tab ID
 * @returns Active tab ID
 * @throws Error if no active tab
 */
export async function getActiveTabId(): Promise<number> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (!tab?.id) {
    throw new Error('No active tab found');
  }
  
  return tab.id;
}

/**
 * Generates a hash for an image (for caching)
 * Uses a simple hash suitable for cache keys
 * @param base64Data - Base64 image data
 * @returns Hash string
 */
export async function generateImageHash(base64Data: string): Promise<string> {
  // Use SubtleCrypto for hashing if available
  if (crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      // Only hash first 10KB for performance
      const sample = base64Data.slice(0, 10240);
      const data = encoder.encode(sample);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
    } catch {
      // Fall through to simple hash
    }
  }
  
  // Simple hash fallback
  let hash = 0;
  const sample = base64Data.slice(0, 10240);
  for (let i = 0; i < sample.length; i++) {
    const char = sample.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Crops a screenshot to a specific region
 * @param screenshot - Original screenshot data
 * @param region - Region to crop
 * @returns Cropped screenshot data
 */
export async function cropScreenshot(
  screenshot: ScreenshotData,
  region: CaptureRegion
): Promise<ScreenshotData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = async () => {
      try {
        // Create canvas for cropping
        const canvas = document.createElement('canvas');
        canvas.width = region.width;
        canvas.height = region.height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }
        
        // Draw cropped region
        ctx.drawImage(
          img,
          region.x, region.y, region.width, region.height,
          0, 0, region.width, region.height
        );
        
        // Get cropped data URL
        const format = screenshot.format;
        const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
        const dataUrl = canvas.toDataURL(mimeType, 0.92);
        const data = dataUrl.split(',')[1];
        const hash = await generateImageHash(data);
        
        resolve({
          data,
          dataUrl,
          width: region.width,
          height: region.height,
          devicePixelRatio: screenshot.devicePixelRatio,
          timestamp: Date.now(),
          format,
          hash,
        });
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image for cropping'));
    };
    
    img.src = screenshot.dataUrl;
  });
}

/**
 * Scales coordinates from CSS pixels to actual pixels
 * @param x - X coordinate in CSS pixels
 * @param y - Y coordinate in CSS pixels
 * @param dpr - Device pixel ratio
 * @returns Scaled coordinates
 */
export function scaleCoordinates(
  x: number,
  y: number,
  dpr: number
): { x: number; y: number } {
  return {
    x: Math.round(x * dpr),
    y: Math.round(y * dpr),
  };
}

/**
 * Unscales coordinates from actual pixels to CSS pixels
 * @param x - X coordinate in actual pixels
 * @param y - Y coordinate in actual pixels
 * @param dpr - Device pixel ratio
 * @returns Unscaled coordinates
 */
export function unscaleCoordinates(
  x: number,
  y: number,
  dpr: number
): { x: number; y: number } {
  return {
    x: Math.round(x / dpr),
    y: Math.round(y / dpr),
  };
}

/**
 * Checks if a tab can be captured
 * @param tabId - Tab ID to check
 * @returns True if capturable
 */
export async function isTabCapturable(tabId: number): Promise<boolean> {
  try {
    const tab = await chrome.tabs.get(tabId);
    
    if (!tab.url) return false;
    
    // Chrome internal pages cannot be captured
    const url = tab.url;
    if (url.startsWith('chrome://') ||
        url.startsWith('chrome-extension://') ||
        url.startsWith('devtools://') ||
        url.startsWith('edge://') ||
        url.startsWith('about:')) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}
```

### 4.2 VisionEngine Screenshot Implementation

Update `src/lib/visionEngine.ts` - replace the `captureScreenshot()` stub:

```typescript
// Add imports
import {
  captureVisibleTab,
  cropScreenshot,
  isTabCapturable,
  type ScreenshotData,
  type CaptureRegion,
} from './screenshotUtils';

// Update ScreenshotResult type to match ScreenshotData
// (or use ScreenshotData directly - they should be compatible)

// Replace captureScreenshot() method
/**
 * Captures a screenshot of the current viewport
 * 
 * @param options - Capture options
 * @returns Screenshot result with base64 data and metadata
 * @throws Error if capture fails or tab cannot be captured
 * 
 * @example
 * ```typescript
 * const screenshot = await engine.captureScreenshot();
 * console.log(`Captured ${screenshot.width}x${screenshot.height} image`);
 * ```
 */
async captureScreenshot(options: {
  tabId?: number;
  format?: 'png' | 'jpeg';
  quality?: number;
  region?: CaptureRegion;
} = {}): Promise<ScreenshotResult> {
  // Don't require ready status for screenshot capture
  // (can capture without OCR being ready)
  
  const { tabId, format = 'png', quality = 92, region } = options;

  try {
    // Check if tab can be captured
    if (tabId) {
      const capturable = await isTabCapturable(tabId);
      if (!capturable) {
        throw new Error(
          'This tab cannot be captured. Chrome internal pages and ' +
          'extension pages are not supported.'
        );
      }
    }

    this.emit('ocrStart', { operation: 'screenshot' });

    // Capture the visible tab
    let screenshot = await captureVisibleTab({
      tabId,
      format,
      quality,
    });

    // Crop to region if specified
    if (region) {
      screenshot = await cropScreenshot(screenshot, region);
    }

    // Cache the screenshot
    this.cacheScreenshot({
      data: screenshot.data,
      width: screenshot.width,
      height: screenshot.height,
      timestamp: screenshot.timestamp,
      format: screenshot.format,
    });

    console.log('[VisionEngine] Screenshot captured', {
      width: screenshot.width,
      height: screenshot.height,
      dpr: screenshot.devicePixelRatio,
      format: screenshot.format,
    });

    return {
      data: screenshot.data,
      width: screenshot.width,
      height: screenshot.height,
      timestamp: screenshot.timestamp,
      format: screenshot.format,
    };

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Screenshot capture failed';
    
    this.emit('ocrError', { operation: 'screenshot', error: message });
    
    throw new Error(message);
  }
}

// Add new method for capturing with caching
/**
 * Captures screenshot with cache check
 * Returns cached screenshot if recent enough
 * 
 * @param maxAge - Maximum age in ms for cached screenshot (default: 1000)
 * @param options - Capture options
 * @returns Screenshot result
 */
async captureScreenshotCached(
  maxAge: number = 1000,
  options: {
    tabId?: number;
    format?: 'png' | 'jpeg';
    region?: CaptureRegion;
  } = {}
): Promise<ScreenshotResult> {
  const cached = this.getLastScreenshot();
  
  if (cached && Date.now() - cached.timestamp < maxAge) {
    console.log('[VisionEngine] Using cached screenshot');
    return cached;
  }
  
  return this.captureScreenshot(options);
}

// Add method to capture and get viewport info
/**
 * Gets viewport information from the active tab
 * @param tabId - Tab ID (uses active tab if not specified)
 * @returns Viewport dimensions
 */
async getViewportInfo(tabId?: number): Promise<{
  width: number;
  height: number;
  devicePixelRatio: number;
  scrollX: number;
  scrollY: number;
}> {
  try {
    const targetTabId = tabId || (await this.getActiveTabId());
    
    const results = await chrome.scripting.executeScript({
      target: { tabId: targetTabId },
      func: () => ({
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
      }),
    });
    
    return results[0]?.result || {
      width: 0,
      height: 0,
      devicePixelRatio: 1,
      scrollX: 0,
      scrollY: 0,
    };
  } catch (error) {
    throw new Error(`Failed to get viewport info: ${error}`);
  }
}

// Helper method
/**
 * Gets the active tab ID
 * @returns Active tab ID
 */
private async getActiveTabId(): Promise<number> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    throw new Error('No active tab found');
  }
  return tab.id;
}
```

---

## 5. CODE EXAMPLES

### 5.1 Basic Screenshot Capture

```typescript
import { VisionEngine } from '@/lib/visionEngine';

const engine = new VisionEngine();

// Capture doesn't require initialization
const screenshot = await engine.captureScreenshot();
console.log(`Size: ${screenshot.width}x${screenshot.height}`);
console.log(`Format: ${screenshot.format}`);
```

### 5.2 Capture Specific Region

```typescript
const screenshot = await engine.captureScreenshot({
  region: {
    x: 100,
    y: 100,
    width: 400,
    height: 300,
  },
});
```

### 5.3 Using Cache

```typescript
// First call captures fresh screenshot
const screenshot1 = await engine.captureScreenshotCached(2000);

// Second call within 2 seconds returns cached
const screenshot2 = await engine.captureScreenshotCached(2000);

// Same reference if cached
console.log(screenshot1.timestamp === screenshot2.timestamp); // true
```

### 5.4 Get Viewport Info

```typescript
const viewport = await engine.getViewportInfo();
console.log(`Viewport: ${viewport.width}x${viewport.height}`);
console.log(`DPR: ${viewport.devicePixelRatio}`);
console.log(`Scroll: ${viewport.scrollX}, ${viewport.scrollY}`);
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** `captureScreenshot()` captures visible tab content
- [ ] **AC-2:** PNG and JPEG formats are supported
- [ ] **AC-3:** Region cropping works correctly
- [ ] **AC-4:** Device pixel ratio is detected
- [ ] **AC-5:** Screenshot caching works correctly
- [ ] **AC-6:** Non-capturable tabs throw clear error
- [ ] **AC-7:** `getViewportInfo()` returns correct dimensions
- [ ] **AC-8:** Screenshots are cached for later retrieval
- [ ] **AC-9:** Events are emitted on capture
- [ ] **AC-10:** TypeScript compiles without errors

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Chrome API limitations** - Can't capture chrome:// pages
2. **Permission required** - Needs activeTab or tabs permission
3. **DPI awareness** - Coordinates must account for DPR

### Patterns to Follow

1. **Cache recent** - Avoid redundant captures
2. **Clear errors** - Explain why capture failed
3. **Metadata included** - Return dimensions and DPR

### Edge Cases

1. **System pages** - Return clear error message
2. **No active tab** - Handle gracefully
3. **High DPI displays** - Scale coordinates correctly

---

## 8. VERIFICATION COMMANDS

```bash
# Verify files exist
ls -la src/lib/screenshotUtils.ts

# Run type check
npm run type-check

# Build and test manually
npm run build
# Load extension, capture screenshots from various pages
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Revert to stub implementation
# Replace captureScreenshot() with original stub from ENG-001

# Remove utilities file
rm src/lib/screenshotUtils.ts
```

---

## 10. REFERENCES

- [Chrome tabs.captureVisibleTab](https://developer.chrome.com/docs/extensions/reference/tabs/#method-captureVisibleTab)
- [Chrome scripting API](https://developer.chrome.com/docs/extensions/reference/scripting/)
- ENG-001: VisionEngine Class Shell
- FND-002: Manifest Permissions

---

*End of Specification ENG-003*
