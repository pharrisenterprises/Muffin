# INT-005: Vision Get Element Handler

> **Build Card:** INT-005  
> **Category:** Integration Points  
> **Dependencies:** ENG-001, INT-001  
> **Risk Level:** Low  
> **Estimated Lines:** 200-260

---

## 1. PURPOSE

Implement the `VISION_GET_ELEMENT` message handler in the content script that returns information about the DOM element at specified coordinates. This handler supports VisionEngine's need to identify what element exists at OCR-detected text locations, enabling intelligent interaction decisions (click vs. type vs. select) and providing element metadata for debugging and validation.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| Content Script | `src/content/content.tsx` | Message handling structure |
| VisionEngine | `src/lib/visionEngine.ts` | Element detection needs |
| API Contracts | `/future-spec/06_api-contracts.md` | Message payload specification |
| ENG-013 | `build-instructions/masterplan/03-engine/ENG-013_input-handler.md` | Input type detection |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/content/content.tsx` | MODIFY | +100 |
| `src/types/messages.types.ts` | MODIFY | +35 |

### Artifacts

- `VISION_GET_ELEMENT` message handler added
- `VisionGetElementPayload` interface defined
- `VisionGetElementResponse` interface defined
- Element info extraction utilities

---

## 4. DETAILED SPECIFICATION

### 4.1 Type Definitions

```typescript
// In src/types/messages.types.ts

/**
 * Payload for VISION_GET_ELEMENT message
 */
export interface VisionGetElementPayload {
  /** X coordinate (viewport-relative) */
  x: number;
  
  /** Y coordinate (viewport-relative) */
  y: number;
  
  /** Whether to include computed styles */
  includeStyles?: boolean;
  
  /** Whether to include bounding rect */
  includeBounds?: boolean;
  
  /** Whether to traverse shadow DOM */
  piereShadowDom?: boolean;
}

/**
 * Response from VISION_GET_ELEMENT handler
 */
export interface VisionGetElementResponse {
  /** Whether an element was found */
  found: boolean;
  
  /** Element tag name (lowercase) */
  tagName?: string;
  
  /** Element ID attribute */
  id?: string;
  
  /** Element class names */
  classNames?: string[];
  
  /** Input type (for input elements) */
  inputType?: string;
  
  /** Element text content (truncated) */
  textContent?: string;
  
  /** Element value (for inputs) */
  value?: string;
  
  /** Placeholder text */
  placeholder?: string;
  
  /** ARIA label */
  ariaLabel?: string;
  
  /** Whether element is interactive */
  isInteractive: boolean;
  
  /** Whether element is editable */
  isEditable: boolean;
  
  /** Whether element is disabled */
  isDisabled: boolean;
  
  /** Whether element is visible */
  isVisible: boolean;
  
  /** Whether element is in shadow DOM */
  inShadowDom: boolean;
  
  /** Bounding rectangle (if requested) */
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  
  /** Computed styles (if requested) */
  styles?: {
    display: string;
    visibility: string;
    pointerEvents: string;
    cursor: string;
    backgroundColor: string;
    color: string;
  };
  
  /** Suggested action for this element */
  suggestedAction?: 'click' | 'type' | 'select' | 'toggle' | 'none';
  
  /** Error message if failed */
  error?: string;
}
```

### 4.2 Vision Get Element Handler Implementation

```typescript
// In src/content/content.tsx - Add to message handlers

import { 
  VisionGetElementPayload, 
  VisionGetElementResponse 
} from '@/types/messages.types';

/**
 * Handles VISION_GET_ELEMENT messages - returns element info at coordinates
 */
function handleVisionGetElement(
  payload: VisionGetElementPayload,
  sendResponse: (response: VisionGetElementResponse) => void
): boolean {
  const {
    x,
    y,
    includeStyles = false,
    includeBounds = true,
    pierceShadowDom = true
  } = payload;

  const response: VisionGetElementResponse = {
    found: false,
    isInteractive: false,
    isEditable: false,
    isDisabled: false,
    isVisible: false,
    inShadowDom: false
  };

  try {
    // Get element at coordinates
    let element: Element | null;
    
    if (pierceShadowDom) {
      element = getElementAtPointDeep(x, y);
    } else {
      element = document.elementFromPoint(x, y);
    }

    if (!element) {
      response.error = `No element found at (${x}, ${y})`;
      sendResponse(response);
      return true;
    }

    response.found = true;
    response.tagName = element.tagName.toLowerCase();
    response.id = element.id || undefined;
    response.classNames = element.className 
      ? element.className.split(/\s+/).filter(c => c) 
      : [];

    // Check if in shadow DOM
    response.inShadowDom = isInShadowDom(element);

    // Get text content
    response.textContent = getElementTextContent(element);

    // Get element-specific attributes
    if (element instanceof HTMLInputElement) {
      response.inputType = element.type;
      response.value = element.value;
      response.placeholder = element.placeholder || undefined;
      response.isDisabled = element.disabled;
    } else if (element instanceof HTMLTextAreaElement) {
      response.inputType = 'textarea';
      response.value = element.value;
      response.placeholder = element.placeholder || undefined;
      response.isDisabled = element.disabled;
    } else if (element instanceof HTMLSelectElement) {
      response.inputType = 'select';
      response.value = element.value;
      response.isDisabled = element.disabled;
    } else if (element instanceof HTMLButtonElement) {
      response.isDisabled = element.disabled;
    }

    // Get ARIA label
    response.ariaLabel = element.getAttribute('aria-label') || undefined;

    // Determine interactivity
    response.isInteractive = isElementInteractive(element);
    response.isEditable = isElementEditable(element);
    response.isVisible = isElementVisible(element);

    // Get bounding rect
    if (includeBounds) {
      const rect = element.getBoundingClientRect();
      response.bounds = {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height
      };
    }

    // Get computed styles
    if (includeStyles) {
      const computed = window.getComputedStyle(element);
      response.styles = {
        display: computed.display,
        visibility: computed.visibility,
        pointerEvents: computed.pointerEvents,
        cursor: computed.cursor,
        backgroundColor: computed.backgroundColor,
        color: computed.color
      };
    }

    // Suggest action based on element type
    response.suggestedAction = getSuggestedAction(element, response);

  } catch (error) {
    response.error = error instanceof Error ? error.message : 'Get element failed';
  }

  sendResponse(response);
  return true;
}

/**
 * Gets element at point, piercing shadow DOM
 */
function getElementAtPointDeep(x: number, y: number): Element | null {
  let element = document.elementFromPoint(x, y);
  
  if (!element) return null;

  // Traverse into shadow roots
  while (element.shadowRoot) {
    const shadowElement = element.shadowRoot.elementFromPoint(x, y);
    if (!shadowElement || shadowElement === element) break;
    element = shadowElement;
  }

  return element;
}

/**
 * Checks if element is inside a shadow DOM
 */
function isInShadowDom(element: Element): boolean {
  let node: Node | null = element;
  while (node) {
    if (node instanceof ShadowRoot) {
      return true;
    }
    node = node.parentNode;
  }
  return false;
}

/**
 * Gets text content from element (truncated)
 */
function getElementTextContent(element: Element): string {
  // For inputs, return placeholder or label
  if (element instanceof HTMLInputElement) {
    return element.placeholder || '';
  }
  if (element instanceof HTMLTextAreaElement) {
    return element.placeholder || '';
  }
  
  // For buttons and links, get text
  const text = element.textContent?.trim() || '';
  
  // Truncate long text
  if (text.length > 100) {
    return text.substring(0, 100) + '...';
  }
  
  return text;
}

/**
 * Checks if element is interactive (clickable)
 */
function isElementInteractive(element: Element): boolean {
  const interactiveTags = [
    'a', 'button', 'input', 'select', 'textarea',
    'details', 'summary', 'label'
  ];
  
  const tagName = element.tagName.toLowerCase();
  
  // Check tag name
  if (interactiveTags.includes(tagName)) {
    return true;
  }
  
  // Check for click handlers or roles
  if (element.hasAttribute('onclick') ||
      element.hasAttribute('role') && 
      ['button', 'link', 'checkbox', 'radio', 'tab', 'menuitem'].includes(
        element.getAttribute('role') || ''
      )) {
    return true;
  }
  
  // Check tabindex
  if (element.hasAttribute('tabindex') && 
      element.getAttribute('tabindex') !== '-1') {
    return true;
  }
  
  // Check cursor style
  const cursor = window.getComputedStyle(element).cursor;
  if (cursor === 'pointer') {
    return true;
  }
  
  return false;
}

/**
 * Checks if element is editable (can receive text input)
 */
function isElementEditable(element: Element): boolean {
  if (element instanceof HTMLInputElement) {
    const nonEditableTypes = [
      'button', 'submit', 'reset', 'checkbox', 'radio',
      'file', 'image', 'hidden', 'range', 'color'
    ];
    return !nonEditableTypes.includes(element.type);
  }
  
  if (element instanceof HTMLTextAreaElement) {
    return true;
  }
  
  if ((element as HTMLElement).isContentEditable) {
    return true;
  }
  
  return false;
}

/**
 * Checks if element is visible
 */
function isElementVisible(element: Element): boolean {
  const style = window.getComputedStyle(element);
  
  if (style.display === 'none') return false;
  if (style.visibility === 'hidden') return false;
  if (style.opacity === '0') return false;
  
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  
  return true;
}

/**
 * Suggests an action based on element type
 */
function getSuggestedAction(
  element: Element,
  info: VisionGetElementResponse
): 'click' | 'type' | 'select' | 'toggle' | 'none' {
  if (info.isDisabled) return 'none';
  if (!info.isVisible) return 'none';
  
  const tagName = element.tagName.toLowerCase();
  
  // Editable elements -> type
  if (info.isEditable) {
    return 'type';
  }
  
  // Select elements -> select
  if (tagName === 'select') {
    return 'select';
  }
  
  // Checkboxes and radios -> toggle
  if (element instanceof HTMLInputElement) {
    if (element.type === 'checkbox' || element.type === 'radio') {
      return 'toggle';
    }
  }
  
  // Interactive elements -> click
  if (info.isInteractive) {
    return 'click';
  }
  
  return 'none';
}

// Register handler in message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'VISION_GET_ELEMENT') {
    return handleVisionGetElement(message.payload, sendResponse);
  }
  
  // ... other handlers ...
  
  return false;
});
```

---

## 5. CODE EXAMPLES

### 5.1 Basic Element Detection

```typescript
// Get element info at coordinates
chrome.tabs.sendMessage(tabId, {
  type: 'VISION_GET_ELEMENT',
  payload: {
    x: 250,
    y: 400
  }
}, (response) => {
  if (response.found) {
    console.log(`Found: <${response.tagName}>`);
    console.log(`Interactive: ${response.isInteractive}`);
    console.log(`Editable: ${response.isEditable}`);
    console.log(`Suggested action: ${response.suggestedAction}`);
  }
});
```

### 5.2 With Styles and Bounds

```typescript
// Get detailed element info
chrome.tabs.sendMessage(tabId, {
  type: 'VISION_GET_ELEMENT',
  payload: {
    x: 300,
    y: 200,
    includeStyles: true,
    includeBounds: true
  }
}, (response) => {
  if (response.found) {
    console.log(`Bounds: ${response.bounds.width}x${response.bounds.height}`);
    console.log(`Display: ${response.styles.display}`);
    console.log(`Cursor: ${response.styles.cursor}`);
  }
});
```

### 5.3 Input Type Detection

```typescript
// Detect input type for smart interaction
chrome.tabs.sendMessage(tabId, {
  type: 'VISION_GET_ELEMENT',
  payload: { x: 150, y: 300 }
}, (response) => {
  if (response.found && response.inputType) {
    switch (response.inputType) {
      case 'text':
      case 'email':
      case 'password':
        console.log('Text input - use typeText()');
        break;
      case 'checkbox':
      case 'radio':
        console.log('Toggle input - use click()');
        break;
      case 'select':
        console.log('Dropdown - use selectDropdownOption()');
        break;
    }
  }
});
```

### 5.4 Integration in VisionEngine

```typescript
// In VisionEngine - detect input type at coordinates
async detectInputType(
  x: number,
  y: number,
  tabId?: number
): Promise<InputTypeDetectionResult> {
  const targetTabId = tabId ?? await this.getActiveTabId();

  return new Promise((resolve) => {
    chrome.tabs.sendMessage(
      targetTabId,
      {
        type: 'VISION_GET_ELEMENT',
        payload: { x, y, includeStyles: false, includeBounds: false }
      },
      (response: VisionGetElementResponse) => {
        resolve({
          type: mapToInputType(response),
          tagName: response.tagName || '',
          inputType: response.inputType,
          isContentEditable: response.isEditable && !response.inputType,
          isDisabled: response.isDisabled,
          isReadOnly: false, // Would need additional check
          currentValue: response.value
        });
      }
    );
  });
}
```

### 5.5 Shadow DOM Detection

```typescript
// Check if element is in shadow DOM
chrome.tabs.sendMessage(tabId, {
  type: 'VISION_GET_ELEMENT',
  payload: {
    x: 200,
    y: 350,
    pierceShadowDom: true
  }
}, (response) => {
  if (response.inShadowDom) {
    console.log('Element is inside shadow DOM - may need special handling');
  }
});
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** Returns element tag name at coordinates
- [ ] **AC-2:** Returns input type for input elements
- [ ] **AC-3:** Returns text content (truncated)
- [ ] **AC-4:** Correctly identifies interactive elements
- [ ] **AC-5:** Correctly identifies editable elements
- [ ] **AC-6:** Returns bounding rect when requested
- [ ] **AC-7:** Returns computed styles when requested
- [ ] **AC-8:** Pierces shadow DOM when requested
- [ ] **AC-9:** Suggests appropriate action for element
- [ ] **AC-10:** Returns found=false when no element

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Coordinate system** - Viewport-relative coordinates
2. **Shadow DOM** - Requires recursive traversal
3. **Performance** - Style computation can be expensive

### Patterns to Follow

1. **Defensive checks** - Element may not exist
2. **Type narrowing** - Use instanceof for specific element types
3. **Truncation** - Limit text content length

### Edge Cases

1. **Overlapping elements** - Returns topmost element
2. **Invisible elements** - May still be at coordinates
3. **Iframe content** - Cannot access cross-origin
4. **SVG elements** - May have different properties
5. **Custom elements** - May need shadow DOM piercing

---

## 8. VERIFICATION COMMANDS

```bash
# Verify handler registration
grep -n "VISION_GET_ELEMENT" src/content/content.tsx

# Verify type definitions
grep -n "VisionGetElementPayload\|VisionGetElementResponse" src/types/messages.types.ts

# Run type check
npm run type-check

# Build extension
npm run build
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Revert content script changes
git checkout src/content/content.tsx

# Revert type definitions
git checkout src/types/messages.types.ts
```

---

## 10. REFERENCES

- ENG-001: VisionEngine Class
- ENG-013: handleInput() / Input Type Detection
- INT-001: Vision Click Handler
- API Contracts: `/future-spec/06_api-contracts.md`

---

*End of Specification INT-005*
