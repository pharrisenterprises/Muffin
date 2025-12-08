# DOMCapture Content Specification

**File ID:** A3  
**File Path:** `src/contentScript/layers/DOMCapture.ts`  
**Status:** CREATE  
**Priority:** P0

---

## Purpose

Core DOM event capture layer responsible for detecting and capturing user interactions (clicks, inputs, selects, navigation) on web pages. Extracts comprehensive element metadata including selectors, XPath, ARIA attributes, text content, and coordinates. Acts as the primary trigger for the RecordingOrchestrator - when DOMCapture detects an action, it notifies the orchestrator to capture from all layers. This is the foundation of the recording system.

---

## Dependencies

### Uses (imports from)
- `../../lib/utils`: CSS.escape polyfill, debounce utility
- `../../types/strategy`: StrategyType (for selector hints)

### Used By (exports to)
- `../RecordingOrchestrator`: Primary consumer - receives capture notifications
- `../content.tsx`: Lifecycle management (start/stop)

---

## Interfaces
```typescript
/**
 * Configuration for DOMCapture layer
 */
interface DOMCaptureConfig {
  /** Debounce time for rapid events in ms (default: 50) */
  debounceMs: number;
  /** Maximum text content length to capture (default: 500) */
  maxTextLength: number;
  /** Whether to capture scroll events (default: false) */
  captureScroll: boolean;
  /** Whether to capture hover events (default: false) */
  captureHover: boolean;
  /** Selector for elements to ignore (default: '[data-muffin-ignore]') */
  ignoreSelector: string;
  /** Whether to traverse into shadow DOM (default: true) */
  traverseShadowDOM: boolean;
}

/**
 * Complete DOM capture result for an element
 */
interface DOMCaptureResult {
  /** Generated CSS selector */
  selector: string;
  /** Generated XPath */
  xpath: string;
  /** Unique CSS selector if possible */
  uniqueSelector?: string;
  /** Element tag name (lowercase) */
  tagName: string;
  /** Element ID attribute */
  id?: string;
  /** Element class list as array */
  classList: string[];
  /** Element name attribute */
  name?: string;
  /** Input type attribute */
  inputType?: string;
  /** ARIA role (explicit or implicit) */
  role?: string;
  /** Accessible name (aria-label, label text, or computed) */
  accessibleName?: string;
  /** Aria-describedby text */
  accessibleDescription?: string;
  /** Element text content (truncated) */
  textContent?: string;
  /** Inner text (visible text only) */
  innerText?: string;
  /** Placeholder attribute */
  placeholder?: string;
  /** Title attribute */
  title?: string;
  /** Click/event X coordinate relative to viewport */
  x: number;
  /** Click/event Y coordinate relative to viewport */
  y: number;
  /** Element bounding rectangle */
  boundingRect: {
    top: number;
    right: number;
    bottom: number;
    left: number;
    width: number;
    height: number;
  };
  /** All element attributes as key-value map */
  attributes: Record<string, string>;
  /** Whether element is in shadow DOM */
  isInShadowDOM: boolean;
  /** Shadow host chain (if in shadow DOM) */
  shadowHostChain?: string[];
  /** Iframe chain (if in iframe) */
  iframeChain?: Array<{
    src: string;
    id?: string;
    name?: string;
    index: number;
  }>;
  /** Data attributes */
  dataAttributes: Record<string, string>;
  /** Test ID if present (data-testid, data-test-id, data-cy) */
  testId?: string;
  /** Form context if element is in a form */
  formContext?: {
    formId?: string;
    formName?: string;
    formAction?: string;
    fieldIndex: number;
  };
  /** Computed styles relevant for identification */
  computedStyles?: {
    display: string;
    visibility: string;
    position: string;
  };
}

/**
 * Event types that DOMCapture handles
 */
type CapturedEventType = 'click' | 'input' | 'change' | 'select' | 'focus' | 'blur' | 'scroll' | 'submit';

/**
 * Capture event passed to callback
 */
interface DOMCaptureEvent {
  /** Type of event captured */
  eventType: CapturedEventType;
  /** Original DOM event */
  originalEvent: Event;
  /** Target element */
  element: HTMLElement;
  /** Captured DOM data */
  captureResult: DOMCaptureResult;
  /** Input value if applicable */
  value?: string;
  /** Timestamp of capture */
  timestamp: number;
}

/**
 * Layer status
 */
type DOMCaptureStatus = 'idle' | 'ready' | 'capturing' | 'error';
```

---

## Functions
```typescript
/**
 * DOMCapture - Core DOM event capture layer
 */
class DOMCapture {
  private config: DOMCaptureConfig;
  private status: DOMCaptureStatus;
  private eventCallback: ((event: DOMCaptureEvent) => void) | null;
  private boundHandlers: Map<string, EventListener>;
  private lastCaptureTime: number;
  private mutationObserver: MutationObserver | null;

  /**
   * Create new DOMCapture instance
   * @param config - Capture configuration
   */
  constructor(config?: Partial<DOMCaptureConfig>);

  /**
   * Start capturing DOM events
   * Attaches event listeners to document
   */
  start(): void;

  /**
   * Stop capturing DOM events
   * Removes all event listeners
   */
  stop(): void;

  /**
   * Get current layer status
   * @returns Layer status
   */
  getStatus(): DOMCaptureStatus;

  /**
   * Register callback for captured events
   * @param callback - Function called when event captured
   */
  onCapture(callback: (event: DOMCaptureEvent) => void): void;

  /**
   * Capture element data without event (for manual capture)
   * @param element - Element to capture
   * @returns Promise resolving to capture result
   */
  async capture(element: HTMLElement): Promise<DOMCaptureResult>;

  /**
   * Generate CSS selector for element
   * @param element - Target element
   * @returns CSS selector string
   */
  generateSelector(element: HTMLElement): string;

  /**
   * Generate unique CSS selector if possible
   * @param element - Target element
   * @returns Unique selector or undefined
   */
  generateUniqueSelector(element: HTMLElement): string | undefined;

  /**
   * Generate XPath for element
   * @param element - Target element
   * @returns XPath string
   */
  generateXPath(element: HTMLElement): string;

  /**
   * Get accessible name for element
   * @param element - Target element
   * @returns Accessible name or undefined
   */
  getAccessibleName(element: HTMLElement): string | undefined;

  /**
   * Get implicit ARIA role for element
   * @param element - Target element
   * @returns Role string or undefined
   */
  getImplicitRole(element: HTMLElement): string | undefined;

  /**
   * Check if element is in shadow DOM
   * @param element - Target element
   * @returns True if in shadow DOM
   */
  isInShadowDOM(element: HTMLElement): boolean;

  /**
   * Get shadow host chain for element
   * @param element - Target element
   * @returns Array of shadow host selectors
   */
  getShadowHostChain(element: HTMLElement): string[];

  /**
   * Get iframe chain for element
   * @param element - Target element
   * @returns Array of iframe info objects
   */
  getIframeChain(element: HTMLElement): DOMCaptureResult['iframeChain'];

  /**
   * Extract input value safely
   * @param element - Target element
   * @returns Value string or undefined
   */
  extractValue(element: HTMLElement): string | undefined;

  // Private event handlers
  private handleClick(event: MouseEvent): void;
  private handleInput(event: InputEvent): void;
  private handleChange(event: Event): void;
  private handleSubmit(event: SubmitEvent): void;
  private handleKeydown(event: KeyboardEvent): void;

  // Private helper methods
  private shouldCapture(element: HTMLElement): boolean;
  private debounce(fn: Function, ms: number): Function;
  private getAllAttributes(element: HTMLElement): Record<string, string>;
  private getDataAttributes(element: HTMLElement): Record<string, string>;
  private getTestId(element: HTMLElement): string | undefined;
  private getFormContext(element: HTMLElement): DOMCaptureResult['formContext'];
  private getComputedStylesSubset(element: HTMLElement): DOMCaptureResult['computedStyles'];
}

export { DOMCapture, DOMCaptureConfig, DOMCaptureResult, DOMCaptureEvent, CapturedEventType };
```

---

## Key Implementation Details

### Event Listener Setup
```typescript
start(): void {
  if (this.status !== 'idle') {
    console.warn('[DOMCapture] Already started');
    return;
  }

  // Create bound handlers for later removal
  this.boundHandlers.set('click', this.handleClick.bind(this));
  this.boundHandlers.set('input', this.debounce(this.handleInput.bind(this), this.config.debounceMs));
  this.boundHandlers.set('change', this.handleChange.bind(this));
  this.boundHandlers.set('submit', this.handleSubmit.bind(this));
  this.boundHandlers.set('keydown', this.handleKeydown.bind(this));

  // Attach listeners with capture phase to catch before stopPropagation
  document.addEventListener('click', this.boundHandlers.get('click')!, true);
  document.addEventListener('input', this.boundHandlers.get('input')!, true);
  document.addEventListener('change', this.boundHandlers.get('change')!, true);
  document.addEventListener('submit', this.boundHandlers.get('submit')!, true);
  document.addEventListener('keydown', this.boundHandlers.get('keydown')!, true);

  if (this.config.captureScroll) {
    this.boundHandlers.set('scroll', this.debounce(this.handleScroll.bind(this), 100));
    document.addEventListener('scroll', this.boundHandlers.get('scroll')!, true);
  }

  // Set up mutation observer for dynamic content
  this.setupMutationObserver();

  this.status = 'ready';
  console.log('[DOMCapture] Started');
}

stop(): void {
  // Remove all event listeners
  for (const [event, handler] of this.boundHandlers) {
    document.removeEventListener(event, handler, true);
  }
  this.boundHandlers.clear();

  // Disconnect mutation observer
  this.mutationObserver?.disconnect();
  this.mutationObserver = null;

  this.status = 'idle';
  console.log('[DOMCapture] Stopped');
}
```

### Click Handler with Full Capture
```typescript
private handleClick(event: MouseEvent): void {
  const element = event.target as HTMLElement;
  
  // Check if we should capture this element
  if (!this.shouldCapture(element)) {
    return;
  }

  // Debounce rapid clicks
  const now = Date.now();
  if (now - this.lastCaptureTime < this.config.debounceMs) {
    return;
  }
  this.lastCaptureTime = now;

  this.status = 'capturing';

  try {
    const captureResult = this.captureSync(element, event.clientX, event.clientY);
    
    const captureEvent: DOMCaptureEvent = {
      eventType: 'click',
      originalEvent: event,
      element,
      captureResult,
      timestamp: now
    };

    if (this.eventCallback) {
      this.eventCallback(captureEvent);
    }
  } catch (error) {
    console.error('[DOMCapture] Click capture failed:', error);
    this.status = 'error';
  }

  this.status = 'ready';
}
```

### Comprehensive Element Capture
```typescript
async capture(element: HTMLElement): Promise<DOMCaptureResult> {
  const rect = element.getBoundingClientRect();
  
  return {
    selector: this.generateSelector(element),
    xpath: this.generateXPath(element),
    uniqueSelector: this.generateUniqueSelector(element),
    tagName: element.tagName.toLowerCase(),
    id: element.id || undefined,
    classList: Array.from(element.classList),
    name: element.getAttribute('name') || undefined,
    inputType: element.getAttribute('type') || undefined,
    role: element.getAttribute('role') || this.getImplicitRole(element),
    accessibleName: this.getAccessibleName(element),
    accessibleDescription: this.getAccessibleDescription(element),
    textContent: element.textContent?.trim().slice(0, this.config.maxTextLength),
    innerText: (element as HTMLElement).innerText?.trim().slice(0, this.config.maxTextLength),
    placeholder: element.getAttribute('placeholder') || undefined,
    title: element.getAttribute('title') || undefined,
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
    boundingRect: {
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
      width: rect.width,
      height: rect.height
    },
    attributes: this.getAllAttributes(element),
    isInShadowDOM: this.isInShadowDOM(element),
    shadowHostChain: this.isInShadowDOM(element) ? this.getShadowHostChain(element) : undefined,
    iframeChain: this.getIframeChain(element),
    dataAttributes: this.getDataAttributes(element),
    testId: this.getTestId(element),
    formContext: this.getFormContext(element),
    computedStyles: this.getComputedStylesSubset(element)
  };
}
```

### Robust Selector Generation
```typescript
generateSelector(element: HTMLElement): string {
  // Priority 1: ID (if unique)
  if (element.id && document.querySelectorAll(`#${CSS.escape(element.id)}`).length === 1) {
    return `#${CSS.escape(element.id)}`;
  }

  // Priority 2: Test ID
  const testId = this.getTestId(element);
  if (testId) {
    return `[data-testid="${CSS.escape(testId)}"]`;
  }

  // Priority 3: Name attribute (for form elements)
  if (element.getAttribute('name')) {
    const name = element.getAttribute('name')!;
    const selector = `${element.tagName.toLowerCase()}[name="${CSS.escape(name)}"]`;
    if (document.querySelectorAll(selector).length === 1) {
      return selector;
    }
  }

  // Priority 4: Build path from ancestors
  const path: string[] = [];
  let current: HTMLElement | null = element;
  
  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    
    if (current.id) {
      selector = `#${CSS.escape(current.id)}`;
      path.unshift(selector);
      break; // ID is unique anchor point
    }
    
    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).filter(c => 
        !c.startsWith('ng-') && // Ignore Angular classes
        !c.startsWith('_') &&   // Ignore generated classes
        !c.match(/^[a-z]{1,2}\d+/) // Ignore CSS-in-JS hashes
      );
      if (classes.length > 0) {
        selector += '.' + classes.slice(0, 2).map(c => CSS.escape(c)).join('.');
      }
    }
    
    // Add nth-child if not unique
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        child => child.tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }
    }
    
    path.unshift(selector);
    current = current.parentElement;
  }
  
  return path.join(' > ');
}
```

### XPath Generation
```typescript
generateXPath(element: HTMLElement): string {
  // Check for ID first
  if (element.id) {
    return `//*[@id="${element.id}"]`;
  }

  const parts: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let part = current.tagName.toLowerCase();
    
    if (current.id) {
      part = `//*[@id="${current.id}"]`;
      parts.unshift(part);
      break;
    }
    
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        child => child.tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        part += `[${index}]`;
      }
    }
    
    parts.unshift(part);
    current = parent;
  }

  return '//' + parts.join('/');
}
```

### Accessible Name Computation
```typescript
getAccessibleName(element: HTMLElement): string | undefined {
  // Priority 1: aria-label
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel.trim();

  // Priority 2: aria-labelledby
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labels = labelledBy.split(' ')
      .map(id => document.getElementById(id)?.textContent?.trim())
      .filter(Boolean);
    if (labels.length > 0) return labels.join(' ');
  }

  // Priority 3: Associated label (for form elements)
  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label) return label.textContent?.trim();
  }

  // Priority 4: Ancestor label
  const ancestorLabel = element.closest('label');
  if (ancestorLabel && ancestorLabel !== element) {
    return ancestorLabel.textContent?.trim();
  }

  // Priority 5: Title attribute
  const title = element.getAttribute('title');
  if (title) return title.trim();

  // Priority 6: Placeholder (for inputs)
  const placeholder = element.getAttribute('placeholder');
  if (placeholder) return placeholder.trim();

  // Priority 7: Button/link text content
  if (['BUTTON', 'A'].includes(element.tagName)) {
    return element.textContent?.trim().slice(0, 100);
  }

  // Priority 8: Value for submit buttons
  if (element.tagName === 'INPUT' && 
      ['submit', 'button'].includes(element.getAttribute('type') || '')) {
    return element.getAttribute('value')?.trim();
  }

  return undefined;
}
```

### Shadow DOM Detection and Traversal
```typescript
isInShadowDOM(element: HTMLElement): boolean {
  let current: Node | null = element;
  while (current) {
    if (current instanceof ShadowRoot) {
      return true;
    }
    current = current.parentNode;
  }
  return false;
}

getShadowHostChain(element: HTMLElement): string[] {
  const chain: string[] = [];
  let current: Node | null = element;
  
  while (current) {
    if (current instanceof ShadowRoot) {
      const host = current.host as HTMLElement;
      chain.unshift(this.generateSelector(host));
    }
    current = current.parentNode;
  }
  
  return chain;
}
```

### Input Value Extraction
```typescript
extractValue(element: HTMLElement): string | undefined {
  // Input elements
  if (element instanceof HTMLInputElement) {
    const type = element.type.toLowerCase();
    
    // Don't capture passwords
    if (type === 'password') {
      return '[REDACTED]';
    }
    
    // Checkbox/radio: return checked state
    if (type === 'checkbox' || type === 'radio') {
      return element.checked ? 'checked' : 'unchecked';
    }
    
    // File inputs: return filename only
    if (type === 'file') {
      return element.files?.[0]?.name || '';
    }
    
    return element.value;
  }
  
  // Textarea
  if (element instanceof HTMLTextAreaElement) {
    return element.value;
  }
  
  // Select
  if (element instanceof HTMLSelectElement) {
    const selected = Array.from(element.selectedOptions).map(o => o.text);
    return selected.join(', ');
  }
  
  // Contenteditable
  if (element.isContentEditable) {
    return element.textContent || '';
  }
  
  return undefined;
}
```

---

## Integration Points

### With RecordingOrchestrator
```typescript
// In RecordingOrchestrator
class RecordingOrchestrator {
  private domCapture: DOMCapture;
  
  async start(): Promise<void> {
    this.domCapture = new DOMCapture({
      debounceMs: 50,
      maxTextLength: 500,
      captureScroll: false,
      traverseShadowDOM: true
    });
    
    this.domCapture.onCapture(async (event) => {
      // DOM capture triggers full multi-layer capture
      await this.captureAction(event.originalEvent, event.element);
    });
    
    this.domCapture.start();
  }
}
```

### With Page Interceptor (for Shadow DOM)
```typescript
// DOMCapture works with page interceptor for closed shadow roots
// page-interceptor.tsx patches attachShadow to store references

declare global {
  interface Window {
    __muffin_shadow_roots__: Map<Element, ShadowRoot>;
  }
}

// In DOMCapture, access closed shadow roots:
getShadowRoot(element: Element): ShadowRoot | null {
  // Try open shadow root first
  if (element.shadowRoot) {
    return element.shadowRoot;
  }
  
  // Fall back to intercepted closed shadow roots
  return window.__muffin_shadow_roots__?.get(element) || null;
}
```

---

## Acceptance Criteria

- [ ] Captures click events with full element metadata
- [ ] Captures input/change events with debouncing
- [ ] Captures form submit events
- [ ] Captures Enter key on input fields
- [ ] Generates valid CSS selectors for any element
- [ ] Generates valid XPath for any element
- [ ] Detects and traverses shadow DOM
- [ ] Detects and records iframe context
- [ ] Extracts accessible names correctly
- [ ] Extracts test IDs (data-testid, data-test-id, data-cy)
- [ ] Filters ignored elements via ignoreSelector
- [ ] Debounces rapid events within configured threshold
- [ ] Password values are redacted
- [ ] Works in capture phase (before stopPropagation)
- [ ] TypeScript compiles with strict mode, 0 errors
- [ ] Memory-efficient (no leaks on start/stop cycles)

---

## Edge Cases

1. **Dynamically added elements**: MutationObserver tracks DOM changes
2. **Shadow DOM (closed)**: Uses page interceptor for access
3. **Cross-origin iframes**: Cannot capture, record iframe boundary only
4. **SVG elements**: Handle SVGElement vs HTMLElement differences
5. **Canvas clicks**: Capture coordinates, flag for vision capture
6. **Rapid double-clicks**: Debounce but don't lose intentional double-clicks
7. **Right-clicks**: Capture as separate event type
8. **Contenteditable**: Track innerText changes
9. **Custom elements**: Handle hyphenated tag names
10. **Pseudo-elements**: Cannot directly select, capture parent

---

## Estimated Lines

400-500 lines
