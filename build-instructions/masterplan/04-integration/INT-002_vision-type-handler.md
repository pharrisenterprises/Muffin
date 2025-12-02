# INT-002: Vision Type Handler

> **Build Card:** INT-002  
> **Category:** Integration Points  
> **Dependencies:** ENG-001, ENG-009  
> **Risk Level:** Low  
> **Estimated Lines:** 300-360

---

## 1. PURPOSE

Implement the `VISION_TYPE` message handler in the content script that receives typing instructions from VisionEngine and executes text input on the currently focused element. This handler supports character-by-character typing, paste operations, and proper event dispatching to ensure compatibility with reactive frameworks (React, Vue, Angular) that listen for input events.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| Content Script | `src/content/content.tsx` | Message handling structure |
| VisionEngine | `src/lib/visionEngine.ts` | typeText() call format |
| API Contracts | `/future-spec/06_api-contracts.md` | Message payload specification |
| ENG-009 | `build-instructions/masterplan/03-engine/ENG-009_type-text-function.md` | typeText implementation |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/content/content.tsx` | MODIFY | +120 |
| `src/types/messages.types.ts` | MODIFY | +30 |

### Artifacts

- `VISION_TYPE` message handler added
- `VISION_TYPE_CHAR` message handler added
- `VisionTypePayload` interface defined
- `VisionTypeResponse` interface defined
- Input event simulation utilities

---

## 4. DETAILED SPECIFICATION

### 4.1 Type Definitions

```typescript
// In src/types/messages.types.ts

/**
 * Typing mode for Vision type handler
 */
export type VisionTypeMode = 
  | 'character'  // Type one character at a time
  | 'paste'      // Paste entire value at once
  | 'replace';   // Replace entire value (like setting .value)

/**
 * Payload for VISION_TYPE message (full text input)
 */
export interface VisionTypePayload {
  /** Full text to type */
  text: string;
  
  /** How to input the text */
  mode?: VisionTypeMode;
  
  /** Whether to clear existing content first */
  clearFirst?: boolean;
  
  /** Delay between characters in character mode (ms) */
  charDelayMs?: number;
  
  /** Whether to dispatch all input events */
  dispatchEvents?: boolean;
  
  /** Whether to blur after typing */
  blurAfter?: boolean;
}

/**
 * Payload for VISION_TYPE_CHAR message (single character)
 */
export interface VisionTypeCharPayload {
  /** Single character to type */
  char: string;
}

/**
 * Response from VISION_TYPE handler
 */
export interface VisionTypeResponse {
  success: boolean;
  
  /** Number of characters typed */
  charactersTyped: number;
  
  /** Total characters requested */
  totalCharacters: number;
  
  /** Element that received input */
  targetElement?: string;
  
  /** Whether element was found and focusable */
  elementFocused: boolean;
  
  /** Final value of the element */
  finalValue?: string;
  
  /** Error message if failed */
  error?: string;
}
```

### 4.2 Vision Type Handler Implementation

```typescript
// In src/content/content.tsx - Add to message handlers

import { 
  VisionTypePayload, 
  VisionTypeCharPayload,
  VisionTypeResponse 
} from '@/types/messages.types';

/**
 * Handles VISION_TYPE messages - types full text into active element
 */
async function handleVisionType(
  payload: VisionTypePayload,
  sendResponse: (response: VisionTypeResponse) => void
): Promise<boolean> {
  const {
    text,
    mode = 'character',
    clearFirst = true,
    charDelayMs = 0,
    dispatchEvents = true,
    blurAfter = false
  } = payload;

  const response: VisionTypeResponse = {
    success: false,
    charactersTyped: 0,
    totalCharacters: text.length,
    elementFocused: false
  };

  try {
    // Get currently focused element
    const activeElement = document.activeElement as HTMLElement;

    if (!activeElement) {
      response.error = 'No active element focused';
      sendResponse(response);
      return true;
    }

    // Verify it's an input-capable element
    const isInput = activeElement instanceof HTMLInputElement;
    const isTextarea = activeElement instanceof HTMLTextAreaElement;
    const isContentEditable = activeElement.isContentEditable;

    if (!isInput && !isTextarea && !isContentEditable) {
      response.error = `Element ${activeElement.tagName} cannot receive text input`;
      sendResponse(response);
      return true;
    }

    response.elementFocused = true;
    response.targetElement = activeElement.tagName.toLowerCase();

    // Clear existing content if requested
    if (clearFirst) {
      await clearElementContent(activeElement);
    }

    // Type based on mode
    switch (mode) {
      case 'character':
        response.charactersTyped = await typeCharacterByCharacter(
          activeElement,
          text,
          charDelayMs,
          dispatchEvents
        );
        break;

      case 'paste':
        response.charactersTyped = await pasteText(
          activeElement,
          text,
          dispatchEvents
        );
        break;

      case 'replace':
        response.charactersTyped = await replaceValue(
          activeElement,
          text,
          dispatchEvents
        );
        break;
    }

    // Get final value
    response.finalValue = getElementValue(activeElement);

    // Blur if requested
    if (blurAfter) {
      activeElement.blur();
    }

    response.success = response.charactersTyped === text.length;

  } catch (error) {
    response.error = error instanceof Error ? error.message : 'Type operation failed';
  }

  sendResponse(response);
  return true;
}

/**
 * Handles VISION_TYPE_CHAR messages - types single character
 */
function handleVisionTypeChar(
  payload: VisionTypeCharPayload,
  sendResponse: (response: { success: boolean; error?: string }) => void
): boolean {
  const { char } = payload;

  try {
    const activeElement = document.activeElement as HTMLElement;

    if (!activeElement) {
      sendResponse({ success: false, error: 'No active element' });
      return true;
    }

    // Type the character
    typeCharacterIntoElement(activeElement, char);
    sendResponse({ success: true });

  } catch (error) {
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Type char failed'
    });
  }

  return true;
}

/**
 * Clears content from an element
 */
async function clearElementContent(element: HTMLElement): Promise<void> {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    // Select all and delete
    element.select();
    document.execCommand('delete', false);
    
    // Fallback: directly set value
    if (element.value.length > 0) {
      element.value = '';
      dispatchInputEvents(element);
    }
  } else if (element.isContentEditable) {
    // For contenteditable, select all and delete
    document.execCommand('selectAll', false);
    document.execCommand('delete', false);
    
    // Fallback
    if (element.textContent && element.textContent.length > 0) {
      element.textContent = '';
      dispatchInputEvents(element);
    }
  }
}

/**
 * Types text character by character
 */
async function typeCharacterByCharacter(
  element: HTMLElement,
  text: string,
  delayMs: number,
  dispatchEvents: boolean
): Promise<number> {
  let typed = 0;

  for (const char of text) {
    typeCharacterIntoElement(element, char, dispatchEvents);
    typed++;

    if (delayMs > 0 && typed < text.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  return typed;
}

/**
 * Types a single character into an element
 */
function typeCharacterIntoElement(
  element: HTMLElement,
  char: string,
  dispatchEvents: boolean = true
): void {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    // Get current cursor position
    const start = element.selectionStart ?? element.value.length;
    const end = element.selectionEnd ?? element.value.length;

    // Insert character at cursor position
    const before = element.value.substring(0, start);
    const after = element.value.substring(end);
    element.value = before + char + after;

    // Move cursor after inserted character
    const newPosition = start + char.length;
    element.selectionStart = newPosition;
    element.selectionEnd = newPosition;

    // Dispatch events
    if (dispatchEvents) {
      dispatchKeyboardEvents(element, char);
      dispatchInputEvents(element);
    }

  } else if (element.isContentEditable) {
    // Use execCommand for contenteditable
    document.execCommand('insertText', false, char);

    if (dispatchEvents) {
      dispatchKeyboardEvents(element, char);
      dispatchInputEvents(element);
    }
  }
}

/**
 * Pastes text using clipboard simulation
 */
async function pasteText(
  element: HTMLElement,
  text: string,
  dispatchEvents: boolean
): Promise<number> {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const start = element.selectionStart ?? element.value.length;
    const end = element.selectionEnd ?? element.value.length;

    const before = element.value.substring(0, start);
    const after = element.value.substring(end);
    element.value = before + text + after;

    element.selectionStart = start + text.length;
    element.selectionEnd = start + text.length;

  } else if (element.isContentEditable) {
    document.execCommand('insertText', false, text);
  }

  if (dispatchEvents) {
    // Dispatch paste event
    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: new DataTransfer()
    });
    element.dispatchEvent(pasteEvent);

    dispatchInputEvents(element);
  }

  return text.length;
}

/**
 * Replaces entire value directly
 */
async function replaceValue(
  element: HTMLElement,
  text: string,
  dispatchEvents: boolean
): Promise<number> {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    element.value = text;
    element.selectionStart = text.length;
    element.selectionEnd = text.length;

  } else if (element.isContentEditable) {
    element.textContent = text;
    
    // Move cursor to end
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(element);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  if (dispatchEvents) {
    dispatchInputEvents(element);
  }

  return text.length;
}

/**
 * Dispatches keyboard events for a character
 */
function dispatchKeyboardEvents(element: HTMLElement, char: string): void {
  const keyboardEventInit: KeyboardEventInit = {
    key: char,
    code: getKeyCode(char),
    keyCode: char.charCodeAt(0),
    charCode: char.charCodeAt(0),
    bubbles: true,
    cancelable: true
  };

  const keydownEvent = new KeyboardEvent('keydown', keyboardEventInit);
  const keypressEvent = new KeyboardEvent('keypress', keyboardEventInit);
  const keyupEvent = new KeyboardEvent('keyup', keyboardEventInit);

  element.dispatchEvent(keydownEvent);
  element.dispatchEvent(keypressEvent);
  element.dispatchEvent(keyupEvent);
}

/**
 * Dispatches input and change events
 */
function dispatchInputEvents(element: HTMLElement): void {
  // Input event (for reactive frameworks)
  const inputEvent = new InputEvent('input', {
    bubbles: true,
    cancelable: true,
    inputType: 'insertText'
  });
  element.dispatchEvent(inputEvent);

  // Change event
  const changeEvent = new Event('change', {
    bubbles: true,
    cancelable: true
  });
  element.dispatchEvent(changeEvent);
}

/**
 * Gets key code for a character
 */
function getKeyCode(char: string): string {
  if (char.length === 1) {
    const upper = char.toUpperCase();
    if (upper >= 'A' && upper <= 'Z') {
      return `Key${upper}`;
    }
    if (char >= '0' && char <= '9') {
      return `Digit${char}`;
    }
  }
  
  // Special characters
  const specialCodes: Record<string, string> = {
    ' ': 'Space',
    '\n': 'Enter',
    '\t': 'Tab',
    '.': 'Period',
    ',': 'Comma',
    '/': 'Slash',
    '\\': 'Backslash',
    '-': 'Minus',
    '=': 'Equal',
    '[': 'BracketLeft',
    ']': 'BracketRight',
    ';': 'Semicolon',
    "'": 'Quote',
    '`': 'Backquote'
  };

  return specialCodes[char] || 'Unidentified';
}

/**
 * Gets the value of an element
 */
function getElementValue(element: HTMLElement): string {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return element.value;
  }
  if (element.isContentEditable) {
    return element.textContent || '';
  }
  return '';
}

// Register handlers in message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'VISION_TYPE':
      handleVisionType(message.payload, sendResponse);
      return true; // Async response

    case 'VISION_TYPE_CHAR':
      return handleVisionTypeChar(message.payload, sendResponse);
  }

  return false;
});
```

---

## 5. CODE EXAMPLES

### 5.1 Type Full Text (Character Mode)

```typescript
// From VisionEngine - sending type message
chrome.tabs.sendMessage(tabId, {
  type: 'VISION_TYPE',
  payload: {
    text: 'john.doe@example.com',
    mode: 'character',
    clearFirst: true,
    charDelayMs: 30
  }
}, (response) => {
  if (response.success) {
    console.log(`Typed ${response.charactersTyped} chars into ${response.targetElement}`);
  } else {
    console.error(`Type failed: ${response.error}`);
  }
});
```

### 5.2 Paste Mode (Fast Input)

```typescript
// For long text, paste is faster
chrome.tabs.sendMessage(tabId, {
  type: 'VISION_TYPE',
  payload: {
    text: longPromptContent,
    mode: 'paste',
    clearFirst: true
  }
});
```

### 5.3 Replace Mode (Direct Value Set)

```typescript
// Fastest method - directly set value
chrome.tabs.sendMessage(tabId, {
  type: 'VISION_TYPE',
  payload: {
    text: 'new value',
    mode: 'replace',
    clearFirst: false  // Not needed for replace
  }
});
```

### 5.4 Single Character Input

```typescript
// Type single character (used by VisionEngine.typeText internally)
chrome.tabs.sendMessage(tabId, {
  type: 'VISION_TYPE_CHAR',
  payload: {
    char: 'a'
  }
}, (response) => {
  if (!response.success) {
    console.error(`Failed to type 'a': ${response.error}`);
  }
});
```

### 5.5 Type with Blur After

```typescript
// Type and then blur (triggers validation)
chrome.tabs.sendMessage(tabId, {
  type: 'VISION_TYPE',
  payload: {
    text: 'test@example.com',
    mode: 'character',
    clearFirst: true,
    blurAfter: true  // Triggers onblur validation
  }
});
```

### 5.6 Integration in VisionEngine

```typescript
// In VisionEngine - typeText implementation
async typeText(options: TypeTextOptions): Promise<TypeTextResult> {
  // ... find and click target first ...

  // Send type message
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(
      targetTabId,
      {
        type: 'VISION_TYPE',
        payload: {
          text: options.inputText,
          mode: options.typeMode || 'character',
          clearFirst: options.clearFirst ?? true,
          charDelayMs: options.typeDelayMs || 50,
          dispatchEvents: true
        }
      },
      (response: VisionTypeResponse) => {
        resolve({
          success: response.success,
          charactersTyped: response.charactersTyped,
          totalCharacters: response.totalCharacters,
          error: response.error
        });
      }
    );
  });
}
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** Character mode types one character at a time
- [ ] **AC-2:** Paste mode inserts all text at once
- [ ] **AC-3:** Replace mode sets value directly
- [ ] **AC-4:** clearFirst clears existing content
- [ ] **AC-5:** charDelayMs controls typing speed
- [ ] **AC-6:** Input events dispatched for React/Vue compatibility
- [ ] **AC-7:** Works with HTMLInputElement
- [ ] **AC-8:** Works with HTMLTextAreaElement
- [ ] **AC-9:** Works with contenteditable elements
- [ ] **AC-10:** blurAfter triggers blur event

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Focus required** - Element must be focused before typing
2. **Event order** - keydown → keypress → input → keyup → change
3. **Async handlers** - Character mode needs async for delays

### Patterns to Follow

1. **Event simulation** - Match browser's native event sequence
2. **Cursor management** - Maintain proper selection state
3. **Framework compatibility** - Dispatch events for React/Vue/Angular

### Edge Cases

1. **Password fields** - Type normally, value hidden
2. **Number inputs** - Non-numeric chars may be rejected
3. **Max length** - Input may truncate at maxlength
4. **Readonly/disabled** - Check before typing
5. **Shadow DOM inputs** - May need different handling

---

## 8. VERIFICATION COMMANDS

```bash
# Verify handler registration
grep -n "VISION_TYPE\|VISION_TYPE_CHAR" src/content/content.tsx

# Verify type definitions
grep -n "VisionTypePayload\|VisionTypeResponse" src/types/messages.types.ts

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
- ENG-009: typeText() Function
- API Contracts: `/future-spec/06_api-contracts.md`

---

*End of Specification INT-002*
