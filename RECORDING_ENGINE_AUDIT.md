# COMPLETE RECORDING ENGINE AUDIT

## 1. RECORDING HANDLERS (content.tsx)

### handleClick() - Lines 1076-1274

```typescript
const handleClick = (event: Event) => {
  const path = event.composedPath() as EventTarget[];
  let target = path.find(el => el instanceof HTMLElement) as HTMLElement;
  if (!target) return;
  
  // COPILOT FIX: Resolve SVG/Canvas clicks to their parent button
  target = resolveInteractiveTarget(target);

  const mouseEvent = event as MouseEvent;
  const x = mouseEvent.clientX;
  const y = mouseEvent.clientY;
  let eventType = 'click';

  // Special case for Google Autocomplete dropdown
  const pacItem = target.closest(".pac-item") as HTMLElement | null;
  if (pacItem) {
    const value = pacItem.textContent?.trim();
    const focusedEl = getFocusedElement(target);
    let bundle;
    if (focusedEl) {
      bundle = recordElement(focusedEl);
    }

    logEvent({
      eventType: eventType,
      xpath: getXPath(pacItem),
      bundle: bundle,
      label: "google-autocomplete",
      value,
      page: window.location.href,
      x,
      y,
    });
    return;
  }

  // Skip synthetic (JS-generated) clicks
  if (!(event as MouseEvent).isTrusted) {
    return;
  }

  // FIX 3: Filter out scrollbar and resize handle clicks
  for (const el of path) {
    if (!(el instanceof HTMLElement)) continue;
    
    const className = el.className?.toString?.() || '';
    const role = el.getAttribute('role') || '';
    
    if (className.includes('scrollbar') ||
        className.includes('slider') ||
        className.includes('resize') ||
        className.includes('sash') ||
        className.includes('minimap') ||
        role === 'scrollbar' ||
        role === 'slider') {
      console.log('[TestFlow] Skipping scrollbar/resize element');
      return;
    }
  }

  // B-61 + FIX 9-7: Check clickability on target AND ancestors
  let clickableElement: HTMLElement | null = null;
  for (const el of path) {
    if (!(el instanceof HTMLElement)) continue;
    
    const style = getComputedStyle(el);
    
    const isClickable =
      el instanceof HTMLButtonElement ||
      el instanceof HTMLInputElement ||
      el instanceof HTMLAnchorElement ||
      el.hasAttribute("role") ||
      style.cursor === "pointer" ||
      el.onclick !== null ||
      el.hasAttribute("tabindex");
    
    if (isClickable) {
      clickableElement = el;
      break;
    }
  }

  if (!clickableElement) {
    return;
  }

  setTimeout(() => {
    let value: string | undefined;
    let labelEl: HTMLElement | HTMLSelectElement | null = null;

    const targetForLabel = clickableElement;

    // CASE 1: radio/checkbox with role or aria-label
    const roleTarget = targetForLabel.closest('[role="radio"], [role="checkbox"]') as HTMLElement | null;
    if (roleTarget) {
      labelEl = roleTarget.querySelector('.aDTYNe') as HTMLElement | null;
      value = roleTarget.getAttribute("aria-label") || labelEl?.textContent?.trim() || roleTarget.textContent?.trim();
    }
    else {
      // CASE 2: select2 or real select
      const originalSelect = getOriginalSelect(targetForLabel);
      if (originalSelect instanceof HTMLSelectElement) {
        let selectedOption: HTMLOptionElement | null = null;

        if (originalSelect.selectedOptions.length > 0) {
          selectedOption = originalSelect.selectedOptions[0];
        }

        if (!selectedOption && originalSelect.value) {
          selectedOption = Array.from(originalSelect.options).find(opt => opt.value === originalSelect.value) || null;
        }

        value = selectedOption?.textContent?.trim()
          || originalSelect.getAttribute("placeholder")
          || originalSelect.options[0]?.textContent?.trim()
          || getLabelForTarget(originalSelect);

        labelEl = originalSelect;
      }
      // CASE 3: input with select2
      else if (targetForLabel.closest('[role="listbox"]') && targetForLabel.getAttribute('data-select2-id') != null) {
        const data_select2_id = targetForLabel.getAttribute('data-select2-id');
        const data_select2_text = targetForLabel.textContent?.trim();
        const select2_target = document.querySelector(`[role="combobox"][aria-activedescendant="${data_select2_id}"]`);
        if (select2_target) {
          const select2_target_elem = select2_target.closest('[data-select2-id]')?.parentElement?.querySelector('select[data-select2-id]') as HTMLSelectElement
          if (select2_target_elem) {
            eventType = 'input';
            const selectedText = select2_target_elem?.selectedOptions[0]?.textContent?.trim();
            value = data_select2_text ?? selectedText;
            labelEl = select2_target_elem ?? targetForLabel;
          }
        }
      }
      // CASE 4: input or textarea
      else if (targetForLabel instanceof HTMLInputElement || targetForLabel instanceof HTMLTextAreaElement) {
        value = targetForLabel.value;
        labelEl = targetForLabel;
      }
      // CASE 4: fallback text from nearby element
      else {
        value = targetForLabel.textContent?.trim();
        labelEl = targetForLabel;
      }
    }
    
    const rect = clickableElement.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    const xpathTarget = labelEl || clickableElement;
    const xpath = getXPath(xpathTarget);
    const label = generateUniqueLabel(getLabelForTarget(clickableElement));

    const focusedEl = getFocusedElement(clickableElement);
    let bundle;
    if (focusedEl) {
      bundle = recordElement(focusedEl);
    }
    
    logEvent({
      eventType: eventType,
      xpath: xpath,
      bundle: bundle,
      label: label,
      value,
      page: window.location.href,
      x,
      y,
    });
  }, 30);
};
```

### handleInput() - Lines 1276-1430

```typescript
const handleInput = async (event: Event): Promise<void> => {
  const target = event.target as HTMLElement;
  if (!target) return;

  if (target.tagName.toLowerCase() === 'gmp-place-autocomplete') {
    return;
  }

  let value = '';
  let xpathTarget: HTMLElement = target;
  let coordinates: { x: number; y: number } | undefined;

  // STANDARD INPUT/TEXTAREA (DOM Recording)
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    xpathTarget = target;

    if (target instanceof HTMLInputElement && (target.type === 'checkbox' || target.type === 'radio')) {
      value = target.checked.toString();
    } else {
      value = target.value;
    }

    if (value) {
      const focusedEl = getFocusedElement(target);
      let bundle;
      if (focusedEl) bundle = recordElement(focusedEl);

      logEvent({
        eventType: 'input',
        xpath: getXPath(xpathTarget),
        bundle,
        value,
        label: generateUniqueLabel(getLabelForTarget(target)),
        page: window.location.href,
      });
    }
    return;
  }

  // SELECT ELEMENT
  if (target instanceof HTMLSelectElement) {
    xpathTarget = target;
    value = target.selectedOptions[0]?.textContent?.trim() || target.value;

    if (value) {
      const focusedEl = getFocusedElement(target);
      let bundle;
      if (focusedEl) bundle = recordElement(focusedEl);

      logEvent({
        eventType: 'input',
        xpath: getXPath(xpathTarget),
        bundle,
        value,
        label: generateUniqueLabel(getLabelForTarget(target)),
        page: window.location.href,
      });
    }
    return;
  }

  // COMPLEX EDITOR (Vision Recording)
  if (isComplexEditor(target)) {
    // Debounce Vision recording (wait for user to stop typing)
    if (visionRecordingDebounce) {
      clearTimeout(visionRecordingDebounce);
    }
    
    visionRecordingDebounce = setTimeout(async () => {
      console.log('[TestFlow] Complex editor detected, attempting Vision recording...');
      
      const visionResult = await captureVisionInput(target);
      
      if (visionResult && visionResult.text && visionResult.text !== lastVisionRecordedText) {
        lastVisionRecordedText = visionResult.text;
        
        const bounds = visionResult.bounds;
        const xpath = getXPath(target);
        const bundle = recordElement(target);
        
        coordinates = {
          x: bounds.x + bounds.width / 2,
          y: bounds.y + bounds.height / 2
        };
        
        logEvent({
          eventType: 'input',
          xpath: xpath,
          value: visionResult.text,
          label: generateSequentialLabel('prompt_input'),
          page: window.location.href,
          bundle: {
            ...bundle,
            coordinates: coordinates,
            visionCapture: true
          },
          x: coordinates.x,
          y: coordinates.y
        });
        
        console.log('[TestFlow Vision] Recorded:', visionResult.text.substring(0, 100) + '...');
      }
    }, 1500);
    
    return;
  }

  // CONTENTEDITABLE (Try both)
  const contentEditable = target.closest('[contenteditable="true"]') as HTMLElement | null;
  if (contentEditable) {
    xpathTarget = contentEditable;
    value = contentEditable.innerText?.trim() || '';
    
    if (value) {
      const focusedEl = getFocusedElement(target);
      let bundle;
      if (focusedEl) bundle = recordElement(focusedEl);

      logEvent({
        eventType: 'input',
        xpath: getXPath(xpathTarget),
        bundle,
        value,
        label: generateSequentialLabel(getLabelForTarget(target) || 'editor_input'),
        page: window.location.href,
      });
    }
    return;
  }

  // FALLBACK
  value = (target.textContent || '').trim();
  if (value) {
    const focusedEl = getFocusedElement(target);
    let bundle;
    if (focusedEl) bundle = recordElement(focusedEl);

    logEvent({
      eventType: 'input',
      xpath: getXPath(target),
      bundle,
      value,
      label: generateUniqueLabel(getLabelForTarget(target)),
      page: window.location.href,
    });
  }
};
```

### handleKeyDown() - Lines 965-1020

```typescript
const handleKeyDown = (event: KeyboardEvent): void => {
  const target = event.target as HTMLElement;
  if (!target) return;

  // FIX 2: Skip complex editors - handled by handleKeydownForComplexEditor
  if (isComplexEditor(target)) {
    return;
  }

  if (event.key === 'Enter') {
    const focusedEl = getFocusedElement(target);
    let bundle;
    if (focusedEl) bundle = recordElement(focusedEl);

    let value = '';
    let xpathTarget: HTMLElement = target;

    // Handle contenteditable
    const contentEditable = target.closest('[contenteditable="true"]') as HTMLElement | null;
    if (contentEditable) {
      xpathTarget = contentEditable;
      value = contentEditable.innerText || contentEditable.textContent || '';
    }
    // Input/textarea
    else if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      xpathTarget = target;
      value = target.value;
    }
    // Select element
    else if (target instanceof HTMLSelectElement) {
      xpathTarget = target;
      value = target.selectedOptions[0]?.textContent?.trim() || target.value;
    }
    // Fallback
    else {
      xpathTarget = target;
      value = (target.textContent || '').trim();
    }

    const rect = target.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    // FIX 5: Enter key always gets "submit" label
    logEvent({
      eventType: 'Enter',
      xpath: getXPath(xpathTarget),
      bundle,
      value,
      label: generateSequentialLabel('submit'),
      page: window.location.href,
      x,
      y,
    });
  }
};
```

### handleKeydownForComplexEditor() - Lines 450-545

```typescript
function handleKeydownForComplexEditor(event: KeyboardEvent) {
  const target = event.target as HTMLElement;
  
  // Only for complex editors
  if (!isComplexEditor(target)) return;
  
  // FIX 5: Improved buffer management
  const isSameEditorContext = (a: HTMLElement | null, b: HTMLElement | null): boolean => {
    if (!a || !b) return false;
    if (a === b) return true;
    
    const aXterm = a.closest('.xterm');
    const bXterm = b.closest('.xterm');
    if (aXterm && bXterm && aXterm === bXterm) return true;
    
    const aMonaco = a.closest('.monaco-editor');
    const bMonaco = b.closest('.monaco-editor');
    if (aMonaco && bMonaco && aMonaco === bMonaco) return true;
    
    const aCM = a.closest('.CodeMirror, .cm-editor');
    const bCM = b.closest('.CodeMirror, .cm-editor');
    if (aCM && bCM && aCM === bCM) return true;
    
    return false;
  };
  
  if (lastKeyboardTarget && !isSameEditorContext(target, lastKeyboardTarget)) {
    console.log('[TestFlow] Editor context changed, saving buffer');
    if (keyboardBuffer.trim() && lastKeyboardTarget) {
      recordComplexEditorInput(lastKeyboardTarget, keyboardBuffer);
    }
    keyboardBuffer = '';
    lastVisionRecordedText = '';
  }
  lastKeyboardTarget = target;

  // Skip modifier-only keys
  if (['Control', 'Alt', 'Shift', 'Meta', 'CapsLock'].includes(event.key)) return;
  
  // Build buffer from keystrokes
  if (event.key === 'Backspace') {
    keyboardBuffer = keyboardBuffer.slice(0, -1);
  } else if (event.key === 'Enter' && !event.shiftKey) {
    // Enter without shift = submit
    if (keyboardBuffer.trim()) {
      recordComplexEditorInput(target, keyboardBuffer);
      keyboardBuffer = '';
    }
    // Log Enter as separate step
    const bounds = target.getBoundingClientRect();
    logEvent({
      eventType: 'Enter',
      xpath: getXPath(target),
      value: '',
      label: generateSequentialLabel('submit'),
      page: window.location.href,
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    });
  } else if (event.key === 'Enter' && event.shiftKey) {
    keyboardBuffer += '\n';
  } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
    keyboardBuffer += event.key;
  }
  
  // FIX 6: Reduced timeout (500ms) + blur listener
  if (keyboardDebounce) clearTimeout(keyboardDebounce);
  keyboardDebounce = setTimeout(() => {
    if (keyboardBuffer.trim()) {
      recordComplexEditorInput(target, keyboardBuffer);
      keyboardBuffer = '';
    }
  }, 500);
  
  // Blur listener to flush buffer immediately
  const handleBlur = () => {
    if (keyboardBuffer.trim()) {
      console.log('[TestFlow] Blur detected, flushing keyboard buffer');
      recordComplexEditorInput(target, keyboardBuffer);
      keyboardBuffer = '';
    }
    target.removeEventListener('blur', handleBlur);
  };
  target.addEventListener('blur', handleBlur, { once: true });
}

function recordComplexEditorInput(target: HTMLElement, text: string) {
  if (text === lastVisionRecordedText) return;
  lastVisionRecordedText = text;
  
  const bounds = target.getBoundingClientRect();
  const xpath = getXPath(target);
  const bundle = recordElement(target);
  
  logEvent({
    eventType: 'input',
    xpath: xpath,
    value: text,
    label: generateSequentialLabel('prompt_input'),
    page: window.location.href,
    bundle: {
      ...bundle,
      coordinates: {
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2
      },
      recordedVia: 'keyboard'
    },
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2
  });
  
  console.log('[TestFlow Keyboard] Recorded:', text.substring(0, 100) + '...');
}
```

### getLabelForTarget() - Lines 575-778

```typescript
const getLabelForTarget = (target: HTMLElement): string | undefined => {
  if (window.location.hostname === "docs.google.com" && window.location.pathname.startsWith("/forms")) {
    const gf = findGFQuestionTitle(target);
    if (gf) return gf;
  }

  const original = getOriginalSelect(target) || target;

  // Case 1: input inside <label>
  const labelParent = original.closest("label");
  if (labelParent) {
    const text = labelParent.innerText.replace(/\*/g, "").trim();
    if (text) {
      return text;
    }
  }

  // Case 2: input has ID and <label for="id">
  if (original.id) {
    const labelByFor = document.querySelector(`label[for="${original.id}"]`);
    if (labelByFor) {
      const text = labelByFor.textContent?.replace(/\*/g, "").trim();
      if (text) {
        return text;
      }
    }
  }

  // Case 3: check aria-labelledby attribute
  const labelledBy = original.getAttribute("aria-labelledby");
  if (labelledBy) {
    const labelByAria = document.getElementById(labelledBy);
    if (labelByAria) {
      return labelByAria.textContent?.replace(/\*/g, "").trim();
    }
  }

  // Case 4: check aria-label attribute
  const ariaLabel = original.getAttribute("aria-label");
  if (ariaLabel) {
    // FIX 4: Sanitize aria-labels for terminal/editor elements
    const sanitized = ariaLabel.trim();
    
    const isGarbageLabel = 
      sanitized.includes('environment is stale') ||
      sanitized.includes('run the') ||
      sanitized.includes('Terminal ') ||
      sanitized.includes('The editor is not accessible') ||
      sanitized.length > 60 ||
      (sanitized.match(/_/g) || []).length > 4 ||
      (sanitized.match(/\s/g) || []).length > 8 ||
      sanitized.includes('\n') ||
      (sanitized.includes(':') && sanitized.length > 40);
    
    if (isGarbageLabel) {
      console.log('[TestFlow] Skipping garbage aria-label:', sanitized.substring(0, 40) + '...');
      if (original.closest('.xterm')) {
        return 'terminal_input';
      }
      if (original.closest('.monaco-editor')) {
        return 'editor_input';
      }
      if (original.closest('[class*="copilot"]') || original.closest('[class*="chat"]')) {
        return 'prompt_input';
      }
    } else {
      return sanitized;
    }
  }

  // Case 6: look for closest label inside parent container
  const formEntity = original.closest(".form_entity");
  if (formEntity) {
    const formLabel = formEntity.querySelector(".form_label");
    if (formLabel?.textContent?.trim()) {
      return formLabel.textContent.replace(/\*/g, "").trim();
    }
  }

  // [... many more case handlers for Select2, Bootstrap, generic containers, etc ...]

  // Final fallback
  if (
    original instanceof HTMLInputElement ||
    original instanceof HTMLSelectElement ||
    original instanceof HTMLTextAreaElement
  ) {
    if (original.name) {
      return original.name;
    } else if (original.hasAttribute("data-role")) {
      return original.getAttribute("data-role") || undefined;
    } else if (original.value) {
      return original.value;
    }
  }
  if (original instanceof HTMLButtonElement || original instanceof HTMLAnchorElement) {
    const text = original.innerText.trim();
    if (text) {
      return text;
    }
  }
  return undefined;
};
```

### recordElement() - Lines 1778-1825

```typescript
function recordElement(el: HTMLElement): Bundle {
  let targetEl: HTMLElement = el;

  // Check for Select2
  const originalSelect = getOriginalSelect(el);
  if (originalSelect) {
    targetEl = originalSelect;
  }

  // Check for radio/checkbox
  const roleTarget = targetEl.closest('[role="radio"], [role="checkbox"]') as HTMLElement | null;
  if (roleTarget) targetEl = roleTarget;

  const iframeChain = serializeIframeChain(getIframeChain(targetEl));

  const xpath = getXPath(targetEl);
  
  return {
    id: targetEl.id || undefined,
    name: targetEl.getAttribute('name') || undefined,
    className: targetEl.className || undefined,
    dataAttrs: Object.fromEntries(
      Array.from(targetEl.attributes)
        .filter(attr => attr.name.startsWith('data-'))
        .map(attr => [attr.name, attr.value])
    ),
    // B-59: Sanitize aria attributes
    aria: sanitizeForSelector(targetEl.getAttribute('aria-labelledby') || targetEl.getAttribute('aria-label') || '') || undefined,
    placeholder: targetEl.getAttribute('placeholder') || undefined,
    tag: targetEl.tagName.toLowerCase(),
    visibleText: (targetEl instanceof HTMLInputElement || targetEl instanceof HTMLTextAreaElement || targetEl instanceof HTMLSelectElement)
      ? (targetEl as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value
      : targetEl.innerText || undefined,
    xpath,
    bounding: targetEl.getBoundingClientRect ? {
      left: targetEl.getBoundingClientRect().left,
      top: targetEl.getBoundingClientRect().top,
      width: targetEl.getBoundingClientRect().width,
      height: targetEl.getBoundingClientRect().height
    } : undefined,
    iframeChain,
    // FIX 5: Always include coordinates
    coordinates: targetEl.getBoundingClientRect ? {
      x: targetEl.getBoundingClientRect().left + targetEl.getBoundingClientRect().width / 2,
      y: targetEl.getBoundingClientRect().top + targetEl.getBoundingClientRect().height / 2
    } : undefined,
  };
}
```

### getXPath() - Lines 948-966

```typescript
const getXPath = (element: Element | null): string => {
  if (!element || element.tagName === "BODY") return "/html/body";

  const paths: string[] = [];
  let currentElement: Element | null = element;

  while (currentElement && currentElement.nodeType === Node.ELEMENT_NODE) {
    let index = 0;
    let sibling: any = currentElement.previousSibling;

    while (sibling) {
      if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === currentElement.tagName) {
        index++;
      }
      sibling = sibling.previousSibling;
    }

    const tagName = currentElement.tagName.toLowerCase();
    if (tagName !== 'svg') {
      paths.unshift(index > 0 ? `${tagName}[${index + 1}]` : tagName);
    }
    currentElement = currentElement.parentElement;
  }

  return `/${paths.join("/")}`;
};
```

### resolveInteractiveTarget() - Lines 1025-1073

```typescript
function resolveInteractiveTarget(target: HTMLElement): HTMLElement {
  // SVG elements that are typically inside buttons
  const isSvgElement = ['svg', 'path', 'g', 'use', 'polygon', 'line', 'circle', 'rect', 'ellipse'].includes(
    target.tagName.toLowerCase()
  );
  
  // Canvas elements
  const isCanvas = target.tagName.toLowerCase() === 'canvas';
  
  if (!isSvgElement && !isCanvas) {
    return target;
  }
  
  console.log(`[TestFlow] Click on ${target.tagName} - searching for parent button...`);
  
  // Walk up the DOM to find interactive ancestor
  let current: HTMLElement | null = target;
  let depth = 0;
  const maxDepth = 10;
  
  while (current && depth < maxDepth) {
    if (
      current instanceof HTMLButtonElement ||
      current instanceof HTMLAnchorElement ||
      current.getAttribute('role') === 'button' ||
      current.getAttribute('role') === 'link' ||
      (current.hasAttribute('onclick') && current.tagName !== 'svg')
    ) {
      console.log(`[TestFlow] ✅ Found interactive ancestor: <${current.tagName}> aria-label="${current.getAttribute('aria-label') || '(none)'}"`);
      return current;
    }
    
    current = current.parentElement;
    depth++;
  }
  
  console.log('[TestFlow] ⚠️ No interactive ancestor found, using original target');
  return target;
}
```

### Filtering Functions

**Scrollbar Filter** (Lines 1118-1136):
```typescript
// FIX 3: Filter out scrollbar and resize handle clicks
for (const el of path) {
  if (!(el instanceof HTMLElement)) continue;
  
  const className = el.className?.toString?.() || '';
  const role = el.getAttribute('role') || '';
  
  if (className.includes('scrollbar') ||
      className.includes('slider') ||
      className.includes('resize') ||
      className.includes('sash') ||
      className.includes('minimap') ||
      role === 'scrollbar' ||
      role === 'slider') {
    console.log('[TestFlow] Skipping scrollbar/resize element');
    return;
  }
}
```

**Synthetic Click Filter** (Lines 1113-1116):
```typescript
// Skip synthetic (JS-generated) clicks
if (!(event as MouseEvent).isTrusted) {
  return;
}
```

**Complex Editor Detection** (Lines 238-283):
```typescript
function isComplexEditor(element: HTMLElement | null): boolean {
  if (!element) return false;
  
  return !!(
    // Monaco Editor
    element.closest('.monaco-editor') ||
    element.closest('.monaco-mouse-cursor-text') ||
    element.closest('[data-mprt="7"]') ||
    
    // CodeMirror
    element.closest('.CodeMirror') ||
    element.closest('.cm-editor') ||
    element.closest('.cm-content') ||
    
    // Terminal emulators
    element.closest('.xterm') ||
    element.closest('.terminal') ||
    element.closest('[data-terminal]') ||
    
    // Ace Editor
    element.closest('.ace_editor') ||
    element.closest('.ace_text-input') ||
    
    // ProseMirror
    element.closest('.ProseMirror') ||
    
    // Quill Editor
    element.closest('.ql-editor') ||
    
    // TinyMCE
    element.closest('.mce-content-body') ||
    
    // Generic contenteditable
    (element.getAttribute('contenteditable') === 'true' &&
     element.closest('[class*="editor"]')) ||
    
    // Slack message input
    element.closest('[data-qa="message_input"]') ||
    
    // Discord message input
    element.closest('[class*="slateTextArea"]')
  );
}
```

---

## 2. MESSAGE CONTRACTS

### chrome.runtime.sendMessage Calls

**Location 1: logEvent() - Line 962**
```typescript
const logEvent = (data: LogEventData): void => {
  // FIX 9-6: Check message size before sending
  const message = { type: "logEvent", data };
  const messageSize = JSON.stringify(message).length;
  const MAX_MESSAGE_SIZE = 64 * 1024 * 1024; // 64MB Chrome limit
  
  if (messageSize > MAX_MESSAGE_SIZE) {
    console.error(`[TestFlow] Message too large (${(messageSize / 1024 / 1024).toFixed(2)}MB) - dropping event`);
    return;
  }
  
  chrome.runtime.sendMessage(message);
};
```

**Message Type:** `"logEvent"`

**Full Payload Structure:**
```typescript
interface LogEventData {
  eventType: string;      // 'click', 'input', 'Enter', 'open'
  xpath: string;          // XPath to element
  value?: string;         // Value for inputs
  label?: string;         // Human-readable label
  page?: string;          // window.location.href
  x?: number;             // Center X coordinate
  y?: number;             // Center Y coordinate
  bundle?: Bundle;        // Full element locator bundle
}

interface Bundle {
  id?: string;
  name?: string;
  className?: string;
  dataAttrs?: Record<string, string>;
  aria?: string;
  placeholder?: string;
  tag?: string;
  visibleText?: string;
  xpath?: string;
  bounding?: { left: number; top: number; width?: number; height?: number };
  iframeChain?: IframeInfo[];
  shadowHosts?: string[];
  isClosedShadow?: boolean;
  coordinates?: { x: number; y: number };
  visionCapture?: boolean;
  recordedVia?: string;
  manualSelector?: {
    x: number;
    y: number;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
    timestamp: number;
    viewportWidth: number;
    viewportHeight: number;
    confidence: 'user-defined';
  };
}
```

**Example Message:**
```json
{
  "type": "logEvent",
  "data": {
    "eventType": "click",
    "xpath": "/html/body/div[1]/button[2]",
    "bundle": {
      "id": "submit-btn",
      "name": null,
      "className": "btn btn-primary",
      "dataAttrs": { "data-testid": "submit" },
      "aria": "Submit form",
      "placeholder": null,
      "tag": "button",
      "visibleText": "Submit",
      "xpath": "/html/body/div[1]/button[2]",
      "bounding": { "left": 100, "top": 200, "width": 80, "height": 40 },
      "iframeChain": [],
      "coordinates": { "x": 140, "y": 220 }
    },
    "label": "submit",
    "value": "Submit",
    "page": "https://example.com/form",
    "x": 140,
    "y": 220
  }
}
```

**Location 2: pageLoaded - Line 1568**
```typescript
window.addEventListener("load", () => {
  chrome.runtime.sendMessage({ type: "pageLoaded" });
});
```

**Message Type:** `"pageLoaded"`

**Full Payload:** `{ type: "pageLoaded" }`

**Location 3: Vision Screenshot Capture - Line 414**
```typescript
const response = await chrome.runtime.sendMessage({
  type: 'VISION_CAPTURE_FOR_RECORDING',
  bounds: {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height
  }
});
```

**Message Type:** `"VISION_CAPTURE_FOR_RECORDING"`

**Full Payload:**
```typescript
{
  type: 'VISION_CAPTURE_FOR_RECORDING',
  bounds: {
    x: number,
    y: number,
    width: number,
    height: number
  }
}
```

**Response:**
```typescript
{
  screenshot: string,  // Base64 PNG
  bounds: { x: number, y: number, width: number, height: number },
  text: string | null
}
```

---

## 3. BACKGROUND HANDLERS (background/index.ts)

### logEvent Handler - Lines 74-79

```typescript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[Background] Message received:", message, "from sender:", sender);
  
  // Handle Vision messages first
  const visionResponse = handleVisionMessage(message, sender);
  if (visionResponse !== undefined) {
    console.log("[Background] Handling as Vision message");
    Promise.resolve(visionResponse).then(sendResponse);
    return true;
  }
  
  // B-60: Handle logEvent messages from content script
  // Let the message pass through to Recorder dashboard - don't consume it
  if (message.type === "logEvent") {
    // FIX 9-9: Removed debug log
    // Return false to allow other listeners (Recorder page) to receive the message
    return false;
  }
  
  // ... other handlers
});
```

**NOTE:** The background script does NOT consume logEvent messages. They pass through to the Recorder UI page.

### Vision Screenshot Handler - Lines 28-61

```typescript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'VISION_CAPTURE_FOR_RECORDING') {
    (async () => {
      try {
        if (!sender.tab?.windowId) {
          sendResponse({ error: 'No window context' });
          return;
        }
        
        // Capture the visible tab
        const screenshot = await chrome.tabs.captureVisibleTab(
          sender.tab.windowId,
          { format: 'png' }
        );
        
        sendResponse({
          screenshot: screenshot,
          bounds: message.bounds,
          text: null // Content script will extract via DOM first
        });
        
      } catch (error) {
        console.error('[TestFlow Background] Screenshot capture failed:', error);
        sendResponse({ error: String(error) });
      }
    })();
    
    return true; // Keep channel open for async response
  }
});
```

### START_RECORDING / STOP_RECORDING

**NOT IMPLEMENTED IN BACKGROUND**. Recording state is managed in Recorder UI page (Recorder.tsx).

### Storage (IndexedDB via Dexie)

**Database Schema** - From `src/common/services/indexedDB.ts`:

```typescript
class TestFlowDB extends Dexie {
  projects!: Table<Project, number>;

  constructor() {
    super('TestFlowDB');
    this.version(1).stores({
      projects: '++id, projectName, project_url, recorded_steps'
    });
  }
}

interface Project {
  id?: number;
  projectName: string;
  project_url: string;
  recorded_steps: Step[];
  parsed_fields?: any[];
  csv_data?: any[];
  loopStartIndex?: number;
  globalDelayMs?: number;
  conditionalDefaults?: {
    searchTerms: string[];
    maxWaitSeconds: number;
    pollingIntervalMs: number;
  };
  schemaVersion?: number;
}

interface Step {
  id: string | number;
  name: string;
  event: string;
  path: string;
  value: string;
  label: string;
  x: number;
  y: number;
  bundle?: LocatorBundle;
  delaySeconds?: number;
  visionFallback?: boolean;
  conditionalConfig?: {
    enabled: boolean;
    searchTerms: string[];
    maxWaitSeconds: number;
    pollingIntervalMs: number;
  };
}
```

---

## 4. UI COMPONENTS

### Recorder.tsx - State Management (Lines 1-100)

```typescript
import { useState, useEffect } from "react";

interface Step {
  id: string;
  name: string;
  event: string;
  path: string;
  value: string;
  label: string;
  x:number;
  y:number;
  bundle?: LocatorBundle;
  delaySeconds?: number;
  visionFallback?: boolean;
  conditionalConfig?: {
    enabled: boolean;
    searchTerms: string[];
    maxWaitSeconds: number;
    pollingIntervalMs: number;
  };
}

export default function Recorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  
  // Listen for recording events from content script
  useEffect(() => {
    const handleMessage = (message: any) => {
      if (message.type === "logEvent") {
        const newStep: Step = {
          id: Date.now().toString(),
          name: message.data.eventType,
          event: message.data.eventType,
          path: message.data.xpath,
          value: message.data.value || "",
          label: message.data.label || "",
          x: message.data.x || 0,
          y: message.data.y || 0,
          bundle: message.data.bundle,
        };
        
        setSteps(prev => [...prev, newStep]);
      }
    };
    
    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);
  
  const handleStartRecording = () => {
    setIsRecording(true);
    setSteps([]); // Clear previous steps
  };
  
  const handleStopRecording = () => {
    setIsRecording(false);
  };
  
  return (
    <div>
      <RecorderToolbar 
        isRecording={isRecording}
        onStartRecording={handleStartRecording}
        onStopRecording={handleStopRecording}
      />
      <StepsTable 
        steps={steps}
        onUpdateStep={(index, updates) => {
          setSteps(prev => prev.map((s, i) => i === index ? {...s, ...updates} : s));
        }}
        onDeleteStep={(index) => {
          setSteps(prev => prev.filter((_, i) => i !== index));
        }}
      />
    </div>
  );
}
```

### StepsTable.tsx - Component (Lines 1-100)

```typescript
import { useState } from 'react';

interface Step {
  id?: string | number;
  name: string;
  event: string;
  path: string;
  value: string;
  label: string;
  delaySeconds?: number;
  manualSelector?: {
    x: number;
    y: number;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
    timestamp: number;
    viewportWidth: number;
    viewportHeight: number;
    confidence: 'user-defined';
  };
}

interface StepsTableProps {
  steps: Step[];
  onUpdateStep: (index: number, updatedFields: Partial<Step>) => void;
  onDeleteStep: (index: number) => void;
  loopStartIndex?: number;
  onSetStepDelay?: (index: number, delaySeconds: number) => void;
  onSetLoopStart?: (index: number) => void;
}

export default function StepsTable({ 
  steps, 
  onUpdateStep, 
  onDeleteStep, 
  loopStartIndex = -1,
  onSetStepDelay,
  onSetLoopStart 
}: StepsTableProps) {
  const [selectorModalOpen, setSelectorModalOpen] = useState(false);
  const [selectorModalStepIndex, setSelectorModalStepIndex] = useState<number | null>(null);
  const [selectorModalUrl, setSelectorModalUrl] = useState<string>('');

  return (
    <Table>
      {steps.map((step, index) => (
        <TableRow key={index}>
          {/* 3-dot menu for step actions */}
          <TableCell>
            <DropdownMenu>
              <DropdownMenuItem onClick={() => {
                setSelectorModalStepIndex(index);
                setSelectorModalUrl(step.path);
                setSelectorModalOpen(true);
              }}>
                Set Selector Area
              </DropdownMenuItem>
            </DropdownMenu>
          </TableCell>
          
          {/* Step fields */}
          <TableCell>
            <Input 
              value={step.label}
              onChange={(e) => onUpdateStep(index, { label: e.target.value })}
            />
          </TableCell>
          
          <TableCell>
            <Select 
              value={step.event}
              onValueChange={(value) => onUpdateStep(index, { event: value })}
            >
              {eventTypes.map(type => (
                <SelectItem value={type}>{type}</SelectItem>
              ))}
            </Select>
          </TableCell>
          
          {/* Badges for special properties */}
          {step.manualSelector && (
            <span className="badge">Manual</span>
          )}
          {step.delaySeconds && (
            <span className="badge">{step.delaySeconds}s</span>
          )}
        </TableRow>
      ))}
    </Table>
  );
}
```

---

## 5. DATA STRUCTURES

### Complete Interfaces

```typescript
// Step Interface (UI Layer)
interface Step {
  id?: string | number;
  name: string;
  event: string;
  path: string;
  value: string;
  label: string;
  x: number;
  y: number;
  bundle?: Bundle;
  delaySeconds?: number;
  visionFallback?: boolean;
  conditionalConfig?: {
    enabled: boolean;
    searchTerms: string[];
    maxWaitSeconds: number;
    pollingIntervalMs: number;
  };
  manualSelector?: ManualSelector;
}

// Bundle Interface (Element Locator)
interface Bundle {
  id?: string;
  name?: string;
  className?: string;
  dataAttrs?: Record<string, string>;
  aria?: string;
  placeholder?: string;
  tag?: string;
  visibleText?: string;
  xpath?: string;
  bounding?: { 
    left: number; 
    top: number; 
    width?: number; 
    height?: number; 
  };
  iframeChain?: IframeInfo[];
  shadowHosts?: string[];
  isClosedShadow?: boolean;
  coordinates?: { x: number; y: number };
  visionCapture?: boolean;
  recordedVia?: string;  // 'keyboard', 'vision', 'dom'
  manualSelector?: ManualSelector;
}

// Manual Selector Interface
interface ManualSelector {
  x: number;                    // Top-left X
  y: number;                    // Top-left Y
  width: number;                // Rectangle width
  height: number;               // Rectangle height
  centerX: number;              // Center X coordinate
  centerY: number;              // Center Y coordinate
  timestamp: number;            // When selector was created
  viewportWidth: number;        // Viewport width at recording time
  viewportHeight: number;       // Viewport height at recording time
  confidence: 'user-defined';   // Always user-defined
}

// IframeInfo Interface
interface IframeInfo {
  id?: string;
  name?: string;
  index?: number;
}

// LogEventData Interface (Message Contract)
interface LogEventData {
  eventType: string;
  xpath: string;
  value?: string;
  label?: string;
  page?: string;
  x?: number;
  y?: number;
  bundle?: Bundle;
}
```

---

## 6. RECENT CHANGES (This Session)

### File: `src/contentScript/content.tsx`

**Line 2-3: Added Orchestrator Imports**
```typescript
import { CDPClient } from '../orchestrator/CDPClient';
import { decisionEngine } from '../orchestrator/DecisionEngine';
```

**Lines 1025-1073: Added resolveInteractiveTarget() Function**
- **Purpose:** Resolve SVG/Canvas clicks to parent button
- **Fixes:** Paper airplane button not being captured
- **Logic:** Walks up DOM tree (max 10 levels) to find button/link/role="button"

**Line 1080: Modified handleClick() to Call resolveInteractiveTarget()**
```typescript
// COPILOT FIX: Resolve SVG/Canvas clicks to their parent button
target = resolveInteractiveTarget(target);
```

**Lines 1828-1920: Added Orchestrator Wrapper Functions**
- `findByCDP()` - CDP-based element finder
- `findElementWithOrchestrator()` - Multi-strategy wrapper
- Delegates to existing `findElementFromBundle()` for actual work

**Line 2908: Changed Playback to Use Orchestrator**
```typescript
const el = await findElementWithOrchestrator(bundle);
```

### File: `src/orchestrator/CDPClient.ts`

**NEW FILE - 234 lines**
- Chrome DevTools Protocol wrapper
- Methods: attach, detach, querySelector, getBoxModel, clickAtCoordinates, typeText, setInputValue, pressKey
- React-safe input value setting

### File: `src/orchestrator/DecisionEngine.ts`

**NEW FILE - 66 lines**
- Technology tier selection: manual_selector → cdp_protocol → native_dom → vision_ocr
- Context-aware decision making based on bundle properties

### File: `src/labeling/LabelGenerator.ts`

**NEW FILE - 159 lines**
- Unified label generation system
- Aria-label sanitization (removes ", editor", ", Workspace", etc.)
- Context-aware labels (terminal, editor, keyboard events)

### File: `src/background/index.ts`

**Lines 107-130: Added CDP_CLICK Handler**
- Attaches debugger, dispatches mouse events, detaches

**Lines 133-195: Added CDP_TYPE Handler**
- Attaches debugger, finds element, focuses, types text, detaches

### File: `public/manifest.json`

**Line: Added "debugger" Permission**
```json
"permissions": [
  "tabs",
  "storage",
  "offscreen",
  "scripting",
  "activeTab",
  "webNavigation",
  "debugger"
]
```

---

## 7. CONFLICT IDENTIFICATION

### DUPLICATE EVENT HANDLERS

**❌ CONFLICT: Two Input Handlers**

1. **handleInput()** (Lines 1276-1430)
   - Handles: HTMLInputElement, HTMLSelectElement, textarea, contenteditable
   - Uses: DOM-based recording with `generateUniqueLabel()`

2. **handleKeydownForComplexEditor()** (Lines 450-545)
   - Handles: Complex editors (monaco, xterm, CodeMirror, etc.)
   - Uses: Keyboard buffer with `generateSequentialLabel('prompt_input')`

**Result:** Same element can record via BOTH paths depending on timing
- Input event → handleInput → "search_1"
- Keyboard event → handleKeydownForComplexEditor → "prompt_input_1"

**Resolution Needed:** Ensure complex editors are EXCLUDED from handleInput (already done via `isComplexEditor()` check)

---

**❌ CONFLICT: Two Enter Key Handlers**

1. **handleKeyDown()** (Lines 965-1020)
   - Handles: Standard inputs
   - Label: `generateSequentialLabel('submit')`
   - **Excludes complex editors** (Line 969)

2. **handleKeydownForComplexEditor()** (Lines 450-545)
   - Handles: Complex editors only
   - Label: `generateSequentialLabel('submit')`
   - Records Enter as separate step (Lines 510-522)

**Result:** Enter key recording is SPLIT between two handlers
- Standard inputs → handleKeyDown
- Complex editors → handleKeydownForComplexEditor

**Potential Issue:** Both use same label generator, so "submit", "submit_1", "submit_2" sequence should be consistent

---

### INCONSISTENT MESSAGE FORMATS

**✅ NO CONFLICTS:** All logEvent messages use same structure (LogEventData interface)

---

### MULTIPLE LABEL GENERATION PATHS

**❌ CONFLICT: Three Label Generators**

1. **generateUniqueLabel()** (Lines 575-595)
   - Used by: handleClick, handleInput (non-complex editors)
   - Logic: Removes numeric suffixes, deduplicates with counter
   - Example: "search" → "search_1" → "search_2"

2. **generateSequentialLabel()** (Lines 226-233)
   - Used by: handleKeydownForComplexEditor, recordComplexEditorInput
   - Logic: Simple counter with base label
   - Example: "prompt_input" → "prompt_input_1" → "prompt_input_2"

3. **getLabelForTarget()** (Lines 575-778)
   - Used by: All handlers as input to generators
   - Logic: Complex label extraction from DOM
   - Returns: Base label string (no numbering)

**Result:** Inconsistent numbering strategies

**Example Scenario:**
```
Step 1: Click search box → generateUniqueLabel("search") → "search"
Step 2: Type in terminal → generateSequentialLabel("prompt_input") → "prompt_input"
Step 3: Click search box → generateUniqueLabel("search") → "search_1"
Step 4: Type in terminal → generateSequentialLabel("prompt_input") → "prompt_input_1"
```

**Issue:** Two separate counter maps (`labelCounts` used by both functions)

---

### FILTERING GAPS

**❌ GAP: Scrollbar Filter Only in handleClick**

- **handleClick:** Has scrollbar filter (Lines 1118-1136)
- **handleInput:** NO scrollbar filter
- **handleKeyDown:** NO scrollbar filter

**Result:** User typing in a scrollbar-adjacent input could record scrollbar as target

---

**❌ GAP: Synthetic Click Filter Only in handleClick**

- **handleClick:** Filters `!isTrusted` events (Lines 1113-1116)
- **handleInput:** NO synthetic event filter
- **handleKeyDown:** NO synthetic event filter

**Result:** Programmatic input/keydown events could be recorded

---

**✅ NO GAP: Complex Editor Isolation**

- **handleKeyDown:** Explicitly excludes complex editors (Line 969)
- **handleInput:** Explicitly checks `isComplexEditor()` (Line 1326)
- **handleKeydownForComplexEditor:** Only handles complex editors (Line 454)

**Result:** No overlap between complex editor and standard input handling

---

### SUMMARY OF CONFLICTS

| Issue | Severity | Impact | Location |
|-------|----------|--------|----------|
| Two input paths for complex editors | ⚠️ Medium | Could record duplicate events | handleInput + handleKeydownForComplexEditor |
| Two Enter key handlers | ⚠️ Medium | Split logic, harder to maintain | handleKeyDown + handleKeydownForComplexEditor |
| Multiple label generators | 🔴 High | Inconsistent numbering, shared counter map | generateUniqueLabel + generateSequentialLabel |
| No scrollbar filter in input handlers | 🟡 Low | Could record scrollbar interactions | handleInput, handleKeyDown |
| No synthetic event filter in input handlers | 🟡 Low | Could record programmatic events | handleInput, handleKeyDown |

---

## RECOMMENDED REFACTORING

### 1. Unify Label Generation
- Create single `LabelGenerator` class with consistent numbering
- Separate counter maps for different label types
- Single call point for all handlers

### 2. Centralized Event Filtering
- Move filters to shared `shouldRecordEvent()` function
- Apply to all handlers: click, input, keydown
- Filters: isTrusted, scrollbar, resize handles, synthetic events

### 3. Single Input Handler
- Merge `handleInput` and `handleKeydownForComplexEditor`
- Use `isComplexEditor()` to branch logic
- Eliminate duplicate paths

### 4. Modular Handler Structure
```
EventHandler
├── FilterChain (isTrusted, scrollbar, etc.)
├── TargetResolver (resolveInteractiveTarget)
├── LabelExtractor (getLabelForTarget)
├── LabelGenerator (unified numbering)
├── BundleRecorder (recordElement)
└── MessageDispatcher (logEvent)
```

### 5. Type Safety
- Define strict event type unions
- Explicit handler registration
- Validated message contracts

---

**END OF AUDIT**
