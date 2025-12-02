# INT-006: Screenshot Message Handler

> **Build Card:** INT-006  
> **Category:** Integration Points  
> **Dependencies:** ENG-001, ENG-003  
> **Risk Level:** Medium  
> **Estimated Lines:** 240-300

---

## 1. PURPOSE

Implement the `VISION_SCREENSHOT` message handler in the background script that captures screenshots of the active tab for OCR processing. This handler uses Chrome's `tabs.captureVisibleTab` API to capture the visible viewport and returns the image data as a base64-encoded PNG or data URL. Screenshots are the foundation of all Vision-based detection.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| Background Script | `src/background/background.ts` | Message handling structure |
| VisionEngine | `src/lib/visionEngine.ts` | Screenshot capture needs |
| API Contracts | `/future-spec/06_api-contracts.md` | Message payload specification |
| ENG-003 | `build-instructions/masterplan/03-engine/ENG-003_screenshot-capture.md` | Screenshot capture implementation |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/background/background.ts` | MODIFY | +85 |
| `src/types/messages.types.ts` | MODIFY | +25 |

### Artifacts

- `VISION_SCREENSHOT` message handler added
- `VisionScreenshotPayload` interface defined
- `VisionScreenshotResponse` interface defined
- Screenshot capture utilities

---

## 4. DETAILED SPECIFICATION

### 4.1 Type Definitions

```typescript
// In src/types/messages.types.ts

/**
 * Image format for screenshot capture
 */
export type ScreenshotFormat = 'png' | 'jpeg';

/**
 * Payload for VISION_SCREENSHOT message
 */
export interface VisionScreenshotPayload {
  /** Tab ID to capture (defaults to active tab) */
  tabId?: number;
  
  /** Image format */
  format?: ScreenshotFormat;
  
  /** JPEG quality (0-100, only for jpeg format) */
  quality?: number;
  
  /** Whether to return as data URL or raw base64 */
  asDataUrl?: boolean;
  
  /** Optional region to crop (viewport coordinates) */
  cropRegion?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Response from VISION_SCREENSHOT handler
 */
export interface VisionScreenshotResponse {
  success: boolean;
  
  /** Base64 image data or data URL */
  imageData?: string;
  
  /** Image dimensions */
  dimensions?: {
    width: number;
    height: number;
  };
  
  /** Format of the captured image */
  format?: ScreenshotFormat;
  
  /** Size of image data in bytes (approximate) */
  sizeBytes?: number;
  
  /** Capture timestamp */
  timestamp?: number;
  
  /** Error message if failed */
  error?: string;
}
```

### 4.2 Screenshot Handler Implementation

```typescript
// In src/background/background.ts - Add to message handlers

import { 
  VisionScreenshotPayload, 
  VisionScreenshotResponse 
} from '@/types/messages.types';

/**
 * Handles VISION_SCREENSHOT messages - captures tab screenshot
 */
async function handleVisionScreenshot(
  payload: VisionScreenshotPayload,
  sender: chrome.runtime.MessageSender
): Promise<VisionScreenshotResponse> {
  const {
    tabId,
    format = 'png',
    quality = 92,
    asDataUrl = true,
    cropRegion
  } = payload;

  const response: VisionScreenshotResponse = {
    success: false
  };

  try {
    // Determine target tab
    let targetTabId = tabId;
    
    if (!targetTabId) {
      // Get active tab in current window
      const [activeTab] = await chrome.tabs.query({ 
        active: true, 
        currentWindow: true 
      });
      
      if (!activeTab?.id) {
        response.error = 'No active tab found';
        return response;
      }
      
      targetTabId = activeTab.id;
    }

    // Get the tab's window ID for capture
    const tab = await chrome.tabs.get(targetTabId);
    
    if (!tab.windowId) {
      response.error = 'Tab has no window';
      return response;
    }

    // Capture options
    const captureOptions: chrome.tabs.CaptureVisibleTabOptions = {
      format: format,
      quality: format === 'jpeg' ? quality : undefined
    };

    // Capture the visible tab
    const dataUrl = await chrome.tabs.captureVisibleTab(
      tab.windowId,
      captureOptions
    );

    if (!dataUrl) {
      response.error = 'Screenshot capture returned empty';
      return response;
    }

    // Process the captured image
    let imageData = dataUrl;
    let dimensions: { width: number; height: number } | undefined;

    // If crop region specified, crop the image
    if (cropRegion) {
      const cropResult = await cropImage(dataUrl, cropRegion);
      imageData = cropResult.dataUrl;
      dimensions = { width: cropRegion.width, height: cropRegion.height };
    } else {
      // Get dimensions from the image
      dimensions = await getImageDimensions(dataUrl);
    }

    // Convert to raw base64 if requested
    if (!asDataUrl) {
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64Match = imageData.match(/^data:image\/\w+;base64,(.+)$/);
      if (base64Match) {
        imageData = base64Match[1];
      }
    }

    // Calculate approximate size
    const sizeBytes = Math.round((imageData.length * 3) / 4);

    response.success = true;
    response.imageData = imageData;
    response.dimensions = dimensions;
    response.format = format;
    response.sizeBytes = sizeBytes;
    response.timestamp = Date.now();

  } catch (error) {
    response.error = error instanceof Error ? error.message : 'Screenshot capture failed';
    
    // Handle specific Chrome errors
    if (response.error.includes('cannot be captured')) {
      response.error = 'Tab cannot be captured (may be a chrome:// or protected page)';
    }
  }

  return response;
}

/**
 * Crops an image to specified region using OffscreenCanvas
 */
async function cropImage(
  dataUrl: string,
  region: { x: number; y: number; width: number; height: number }
): Promise<{ dataUrl: string }> {
  // Create image from data URL
  const img = await loadImage(dataUrl);
  
  // Create offscreen canvas for cropping
  const canvas = new OffscreenCanvas(region.width, region.height);
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Draw cropped region
  ctx.drawImage(
    img,
    region.x, region.y, region.width, region.height,  // Source
    0, 0, region.width, region.height                  // Destination
  );

  // Convert back to data URL
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  const arrayBuffer = await blob.arrayBuffer();
  const base64 = arrayBufferToBase64(arrayBuffer);
  
  return { dataUrl: `data:image/png;base64,${base64}` };
}

/**
 * Loads an image from data URL
 */
function loadImage(dataUrl: string): Promise<ImageBitmap> {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const bitmap = await createImageBitmap(blob);
      resolve(bitmap);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Gets image dimensions from data URL
 */
async function getImageDimensions(
  dataUrl: string
): Promise<{ width: number; height: number }> {
  const bitmap = await loadImage(dataUrl);
  return { width: bitmap.width, height: bitmap.height };
}

/**
 * Converts ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Register handler in message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'VISION_SCREENSHOT') {
    handleVisionScreenshot(message.payload, sender)
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

### 4.3 Alternative: Using Offscreen Document (MV3)

```typescript
// For Manifest V3 with offscreen document support
// In src/background/background.ts

/**
 * Captures screenshot using offscreen document (MV3 alternative)
 */
async function captureWithOffscreen(
  tabId: number,
  format: ScreenshotFormat
): Promise<string> {
  // Ensure offscreen document exists
  await ensureOffscreenDocument();

  // Get tab's window
  const tab = await chrome.tabs.get(tabId);
  
  // Capture visible tab
  const dataUrl = await chrome.tabs.captureVisibleTab(
    tab.windowId!,
    { format }
  );

  return dataUrl;
}

/**
 * Ensures offscreen document is created
 */
async function ensureOffscreenDocument(): Promise<void> {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT' as chrome.runtime.ContextType]
  });

  if (existingContexts.length === 0) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['CLIPBOARD' as chrome.offscreen.Reason],
      justification: 'Image processing for Vision OCR'
    });
  }
}
```

### 4.4 Rate Limiting

```typescript
/**
 * Rate limiter for screenshot captures
 */
class ScreenshotRateLimiter {
  private lastCapture: number = 0;
  private minIntervalMs: number = 100; // Max 10 captures per second

  async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastCapture;
    
    if (elapsed < this.minIntervalMs) {
      await new Promise(resolve => 
        setTimeout(resolve, this.minIntervalMs - elapsed)
      );
    }
    
    this.lastCapture = Date.now();
  }
}

const screenshotLimiter = new ScreenshotRateLimiter();

// Use in handler:
async function handleVisionScreenshot(payload: VisionScreenshotPayload): Promise<VisionScreenshotResponse> {
  await screenshotLimiter.throttle();
  // ... rest of handler
}
```

---

## 5. CODE EXAMPLES

### 5.1 Basic Screenshot Capture

```typescript
// Capture active tab screenshot
chrome.runtime.sendMessage({
  type: 'VISION_SCREENSHOT',
  payload: {}
}, (response) => {
  if (response.success) {
    console.log(`Captured ${response.dimensions.width}x${response.dimensions.height}`);
    console.log(`Size: ${(response.sizeBytes / 1024).toFixed(1)} KB`);
    // Use response.imageData for OCR
  } else {
    console.error(`Capture failed: ${response.error}`);
  }
});
```

### 5.2 Capture Specific Tab

```typescript
// Capture a specific tab
chrome.runtime.sendMessage({
  type: 'VISION_SCREENSHOT',
  payload: {
    tabId: specificTabId,
    format: 'png'
  }
});
```

### 5.3 JPEG with Quality Setting

```typescript
// Capture as JPEG for smaller size
chrome.runtime.sendMessage({
  type: 'VISION_SCREENSHOT',
  payload: {
    format: 'jpeg',
    quality: 80  // 80% quality
  }
});
```

### 5.4 Capture with Crop Region

```typescript
// Capture only a portion of the screen
chrome.runtime.sendMessage({
  type: 'VISION_SCREENSHOT',
  payload: {
    cropRegion: {
      x: 100,
      y: 200,
      width: 400,
      height: 300
    }
  }
});
```

### 5.5 Get Raw Base64 (No Data URL Prefix)

```typescript
// Get raw base64 for direct use with Tesseract
chrome.runtime.sendMessage({
  type: 'VISION_SCREENSHOT',
  payload: {
    asDataUrl: false
  }
}, (response) => {
  if (response.success) {
    // response.imageData is raw base64, not data URL
    const imageBuffer = base64ToArrayBuffer(response.imageData);
    // Use with Tesseract
  }
});
```

### 5.6 Integration in VisionEngine

```typescript
// In VisionEngine.captureScreenshot()
async captureScreenshot(options: ScreenshotOptions = {}): Promise<ScreenshotResult> {
  const {
    tabId,
    format = 'png',
    quality = 92,
    cropRegion
  } = options;

  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        type: 'VISION_SCREENSHOT',
        payload: {
          tabId,
          format,
          quality,
          asDataUrl: true,
          cropRegion
        }
      },
      (response: VisionScreenshotResponse) => {
        if (chrome.runtime.lastError) {
          resolve({
            success: false,
            error: chrome.runtime.lastError.message
          });
        } else {
          resolve({
            success: response.success,
            imageData: response.imageData,
            dimensions: response.dimensions,
            error: response.error
          });
        }
      }
    );
  });
}
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** Captures visible tab as PNG by default
- [ ] **AC-2:** Supports JPEG format with quality setting
- [ ] **AC-3:** Returns image as data URL by default
- [ ] **AC-4:** Returns raw base64 when asDataUrl=false
- [ ] **AC-5:** Returns image dimensions
- [ ] **AC-6:** Supports capturing specific tab by ID
- [ ] **AC-7:** Supports crop region
- [ ] **AC-8:** Returns meaningful error for protected pages
- [ ] **AC-9:** Handles rate limiting gracefully
- [ ] **AC-10:** Returns timestamp of capture

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Protected pages** - Cannot capture chrome://, edge://, etc.
2. **Permission required** - Needs `activeTab` or `tabs` permission
3. **Window context** - Must capture from tab's window

### Patterns to Follow

1. **Async/await** - Use promises for Chrome APIs
2. **Error mapping** - Convert Chrome errors to user-friendly messages
3. **Rate limiting** - Prevent excessive captures

### Edge Cases

1. **Tab not found** - Return clear error
2. **Protected URLs** - Handle permission errors
3. **Tab loading** - May capture incomplete page
4. **Multiple monitors** - Captures visible portion only
5. **Zoom levels** - May affect coordinates

---

## 8. VERIFICATION COMMANDS

```bash
# Verify handler registration
grep -n "VISION_SCREENSHOT" src/background/background.ts

# Verify type definitions
grep -n "VisionScreenshotPayload\|VisionScreenshotResponse" src/types/messages.types.ts

# Verify manifest permissions
grep -n "activeTab\|tabs" manifest.json

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
- ENG-003: Screenshot Capture
- FND-002: Manifest Permissions
- API Contracts: `/future-spec/06_api-contracts.md`

---

*End of Specification INT-006*
