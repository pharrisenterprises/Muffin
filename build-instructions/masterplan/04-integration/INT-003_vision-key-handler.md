# INT-003: Vision Key Handler

> **Build Card:** INT-003  
> **Category:** Integration Points  
> **Dependencies:** ENG-001, ENG-010  
> **Risk Level:** Low  
> **Estimated Lines:** 250-300

---

## 1. PURPOSE

Implement the `VISION_SEND_KEYS` message handler in the content script that receives keyboard shortcut instructions from VisionEngine and dispatches the appropriate keyboard events. This handler enables automation of keyboard-driven interactions like form submission (Enter), navigation (Tab), text selection (Ctrl+A), and application shortcuts without relying on DOM selectors.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| Content Script | `src/content/content.tsx` | Message handling structure |
| VisionEngine | `src/lib/visionEngine.ts` | sendKeys() call format |
| API Contracts | `/future-spec/06_api-contracts.md` | Message payload specification |
| ENG-010 | `build-instructions/masterplan/03-engine/ENG-010_send-keys-function.md` | sendKeys implementation |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/content/content.tsx` | MODIFY | +95 |
| `src/types/messages.types.ts` | MODIFY | +25 |

### Artifacts

- `VISION_SEND_KEYS` message handler added
- `VisionSendKeysPayload` interface defined
- `VisionSendKeysResponse` interface defined
- Key event dispatch utilities

---

## 4. DETAILED SPECIFICATION

### 4.1 Type Definitions

```typescript
// In src/types/messages.types.ts

/**
 * Key definition for keyboard events
 */
export interface KeyDefinition {
  /** Key value (e.g., 'Enter', 'a', 'Control') */
  key: string;
  
  /** Key code (e.g., 'Enter', 'KeyA', 'ControlLeft') */
  code: string;
  
  /** Legacy keyCode number */
  keyCode: number;
}

/**
 * Payload for VISION_SEND_KEYS message
 */
export interface VisionSendKeysPayload {
  /** All key definitions in order */
  keys: KeyDefinition[];
  
  /** Modifier keys (Control, Alt, Shift, Meta) */
  modifiers: KeyDefinition[];
  
  /** Non-modifier keys */
  regularKeys: KeyDefinition[];
  
  /** Duration to hold key down (ms) */
  keyHoldMs?: number;
  
  /** Delay after releasing all keys (ms) */
  postDelayMs?: number;
}

/**
 * Response from VISION_SEND_KEYS handler
 */
export interface VisionSendKeysResponse {
  success: boolean;
  
  /** Keys that were sent */
  keysSent: string[];
  
  /** Element that received the keys */
  targetElement?: string;
  
  /** Error message if failed */
  error?: string;
}
```

### 4.2 Vision Send Keys Handler Implementation

```typescript
// In src/content/content.tsx - Add to message handlers

import { 
  VisionSendKeysPayload, 
  VisionSendKeysResponse,
  KeyDefinition 
} from '@/types/messages.types';

/**
 * Handles VISION_SEND_KEYS messages - dispatches keyboard events
 */
async function handleVisionSendKeys(
  payload: VisionSendKeysPayload,
  sendResponse: (response: VisionSendKeysResponse) => void
): Promise<boolean> {
  const {
    modifiers = [],
    regularKeys = [],
    keyHoldMs = 10,
    postDelayMs = 50
  } = payload;

  const response: VisionSendKeysResponse = {
    success: false,
    keysSent: []
  };

  try {
    // Get target element (active element or body)
    const targetElement = document.activeElement || document.body;
    response.targetElement = targetElement.tagName.toLowerCase();

    // Build modifier state for events
    const modifierState = buildModifierState(modifiers);

    // Step 1: Press down all modifier keys
    for (const mod of modifiers) {
      const keydownEvent = createKeyboardEvent('keydown', mod, modifierState);
      targetElement.dispatchEvent(keydownEvent);
      response.keysSent.push(mod.key);
    }

    // Step 2: Press and release each regular key
    for (const keyDef of regularKeys) {
      // Key down
      const keydownEvent = createKeyboardEvent('keydown', keyDef, modifierState);
      targetElement.dispatchEvent(keydownEvent);

      // Key press (for printable characters)
      if (isPrintableKey(keyDef.key)) {
        const keypressEvent = createKeyboardEvent('keypress', keyDef, modifierState);
        targetElement.dispatchEvent(keypressEvent);
      }

      // Hold delay
      if (keyHoldMs > 0) {
        await delay(keyHoldMs);
      }

      // Key up
      const keyupEvent = createKeyboardEvent('keyup', keyDef, modifierState);
      targetElement.dispatchEvent(keyupEvent);

      response.keysSent.push(keyDef.key);
    }

    // Step 3: Release all modifier keys (in reverse order)
    for (const mod of [...modifiers].reverse()) {
      const keyupEvent = createKeyboardEvent('keyup', mod, {
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false
      });
      targetElement.dispatchEvent(keyupEvent);
    }

    // Post-release delay
    if (postDelayMs > 0) {
      await delay(postDelayMs);
    }

    response.success = true;

  } catch (error) {
    response.error = error instanceof Error ? error.message : 'Send keys failed';
  }

  sendResponse(response);
  return true;
}

/**
 * Builds modifier state object from modifier key definitions
 */
function buildModifierState(modifiers: KeyDefinition[]): ModifierState {
  return {
    ctrlKey: modifiers.some(m => m.key === 'Control'),
    altKey: modifiers.some(m => m.key === 'Alt'),
    shiftKey: modifiers.some(m => m.key === 'Shift'),
    metaKey: modifiers.some(m => m.key === 'Meta')
  };
}

interface ModifierState {
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
}

/**
 * Creates a keyboard event with proper properties
 */
function createKeyboardEvent(
  type: 'keydown' | 'keypress' | 'keyup',
  keyDef: KeyDefinition,
  modifiers: ModifierState
): KeyboardEvent {
  return new KeyboardEvent(type, {
    key: keyDef.key,
    code: keyDef.code,
    keyCode: keyDef.keyCode,
    which: keyDef.keyCode,
    charCode: type === 'keypress' ? keyDef.key.charCodeAt(0) : 0,
    bubbles: true,
    cancelable: true,
    composed: true,
    view: window,
    ...modifiers
  });
}

/**
 * Checks if a key produces a printable character
 */
function isPrintableKey(key: string): boolean {
  // Single character keys are printable
  if (key.length === 1) {
    return true;
  }
  
  // Space is printable
  if (key === ' ' || key === 'Space') {
    return true;
  }
  
  // Special keys that are not printable
  const nonPrintable = [
    'Enter', 'Tab', 'Escape', 'Backspace', 'Delete',
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'Home', 'End', 'PageUp', 'PageDown',
    'Control', 'Alt', 'Shift', 'Meta',
    'F1', 'F2', 'F3', 'F4', 'F5', 'F6',
    'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
    'Insert', 'PrintScreen', 'ScrollLock', 'Pause',
    'CapsLock', 'NumLock'
  ];
  
  return !nonPrintable.includes(key);
}

/**
 * Simple delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Register handler in message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'VISION_SEND_KEYS') {
    handleVisionSendKeys(message.payload, sendResponse);
    return true; // Async response
  }
  
  // ... other handlers ...
  
  return false;
});
```

### 4.3 Special Key Handling

```typescript
/**
 * Handles special keys that may have side effects
 */
function handleSpecialKey(
  key: string,
  targetElement: Element,
  modifiers: ModifierState
): void {
  // Enter key - may submit forms
  if (key === 'Enter' && !modifiers.shiftKey) {
    if (targetElement instanceof HTMLInputElement) {
      const form = targetElement.form;
      if (form) {
        // Check if form should be submitted
        const submitEvent = new Event('submit', {
          bubbles: true,
          cancelable: true
        });
        form.dispatchEvent(submitEvent);
      }
    }
  }

  // Tab key - may change focus
  if (key === 'Tab') {
    // Let the browser handle focus change
    // The keydown event should trigger native tab behavior
  }

  // Escape key - may close modals
  if (key === 'Escape') {
    // Dispatch escape to document for modal handlers
    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'Escape',
      code: 'Escape',
      keyCode: 27,
      bubbles: true,
      cancelable: true
    }));
  }
}
```

### 4.4 Clipboard Shortcut Handling

```typescript
/**
 * Handles clipboard shortcuts (Ctrl+C, Ctrl+V, Ctrl+X)
 */
async function handleClipboardShortcut(
  key: string,
  targetElement: Element,
  modifiers: ModifierState
): Promise<boolean> {
  if (!modifiers.ctrlKey && !modifiers.metaKey) {
    return false;
  }

  const lowerKey = key.toLowerCase();

  // Ctrl+A - Select all
  if (lowerKey === 'a') {
    if (targetElement instanceof HTMLInputElement || 
        targetElement instanceof HTMLTextAreaElement) {
      targetElement.select();
      return true;
    }
    if (targetElement.isContentEditable || targetElement === document.body) {
      document.execCommand('selectAll', false);
      return true;
    }
  }

  // Ctrl+C - Copy
  if (lowerKey === 'c') {
    document.execCommand('copy');
    return true;
  }

  // Ctrl+X - Cut
  if (lowerKey === 'x') {
    document.execCommand('cut');
    return true;
  }

  // Ctrl+V - Paste
  if (lowerKey === 'v') {
    document.execCommand('paste');
    return true;
  }

  return false;
}
```

---

## 5. CODE EXAMPLES

### 5.1 Press Enter

```typescript
// From VisionEngine - sending Enter key
chrome.tabs.sendMessage(tabId, {
  type: 'VISION_SEND_KEYS',
  payload: {
    keys: [{ key: 'Enter', code: 'Enter', keyCode: 13 }],
    modifiers: [],
    regularKeys: [{ key: 'Enter', code: 'Enter', keyCode: 13 }],
    keyHoldMs: 10,
    postDelayMs: 50
  }
}, (response) => {
  console.log(`Enter key sent: ${response.success}`);
});
```

### 5.2 Press Tab

```typescript
// Tab to next field
chrome.tabs.sendMessage(tabId, {
  type: 'VISION_SEND_KEYS',
  payload: {
    keys: [{ key: 'Tab', code: 'Tab', keyCode: 9 }],
    modifiers: [],
    regularKeys: [{ key: 'Tab', code: 'Tab', keyCode: 9 }]
  }
});
```

### 5.3 Ctrl+A (Select All)

```typescript
chrome.tabs.sendMessage(tabId, {
  type: 'VISION_SEND_KEYS',
  payload: {
    keys: [
      { key: 'Control', code: 'ControlLeft', keyCode: 17 },
      { key: 'a', code: 'KeyA', keyCode: 65 }
    ],
    modifiers: [{ key: 'Control', code: 'ControlLeft', keyCode: 17 }],
    regularKeys: [{ key: 'a', code: 'KeyA', keyCode: 65 }]
  }
});
```

### 5.4 Ctrl+Enter (Submit Shortcut)

```typescript
// Common submit shortcut in chat applications
chrome.tabs.sendMessage(tabId, {
  type: 'VISION_SEND_KEYS',
  payload: {
    keys: [
      { key: 'Control', code: 'ControlLeft', keyCode: 17 },
      { key: 'Enter', code: 'Enter', keyCode: 13 }
    ],
    modifiers: [{ key: 'Control', code: 'ControlLeft', keyCode: 17 }],
    regularKeys: [{ key: 'Enter', code: 'Enter', keyCode: 13 }]
  }
});
```

### 5.5 Shift+Tab (Reverse Tab)

```typescript
chrome.tabs.sendMessage(tabId, {
  type: 'VISION_SEND_KEYS',
  payload: {
    keys: [
      { key: 'Shift', code: 'ShiftLeft', keyCode: 16 },
      { key: 'Tab', code: 'Tab', keyCode: 9 }
    ],
    modifiers: [{ key: 'Shift', code: 'ShiftLeft', keyCode: 16 }],
    regularKeys: [{ key: 'Tab', code: 'Tab', keyCode: 9 }]
  }
});
```

### 5.6 Escape Key

```typescript
// Close modal or cancel operation
chrome.tabs.sendMessage(tabId, {
  type: 'VISION_SEND_KEYS',
  payload: {
    keys: [{ key: 'Escape', code: 'Escape', keyCode: 27 }],
    modifiers: [],
    regularKeys: [{ key: 'Escape', code: 'Escape', keyCode: 27 }]
  }
});
```

### 5.7 Integration in VisionEngine

```typescript
// In VisionEngine.sendKeys()
async sendKeys(
  keys: KeyInput[],
  options: { tabId?: number; keyHoldMs?: number; postDelayMs?: number } = {}
): Promise<SendKeysResult> {
  const targetTabId = options.tabId ?? await this.getActiveTabId();
  
  // Separate modifiers from regular keys
  const modifiers = keys.filter(k => MODIFIER_KEYS.includes(k as string))
    .map(k => this.getKeyDefinition(k));
  const regularKeys = keys.filter(k => !MODIFIER_KEYS.includes(k as string))
    .map(k => this.getKeyDefinition(k));

  return new Promise((resolve) => {
    chrome.tabs.sendMessage(
      targetTabId,
      {
        type: 'VISION_SEND_KEYS',
        payload: {
          keys: keys.map(k => this.getKeyDefinition(k)),
          modifiers,
          regularKeys,
          keyHoldMs: options.keyHoldMs || 10,
          postDelayMs: options.postDelayMs || 50
        }
      },
      (response: VisionSendKeysResponse) => {
        resolve({
          success: response.success,
          keysSent: keys,
          error: response.error
        });
      }
    );
  });
}
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** Single special keys work (Enter, Tab, Escape)
- [ ] **AC-2:** Modifier combinations work (Ctrl+A, Ctrl+C)
- [ ] **AC-3:** Multiple modifiers work (Ctrl+Shift+P)
- [ ] **AC-4:** Modifiers press before and release after regular keys
- [ ] **AC-5:** keyHoldMs delays between down and up
- [ ] **AC-6:** postDelayMs delays after all keys released
- [ ] **AC-7:** Events bubble to parent elements
- [ ] **AC-8:** Works on input elements
- [ ] **AC-9:** Works on contenteditable elements
- [ ] **AC-10:** Works on document.body

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Browser security** - Some shortcuts may be blocked
2. **Platform differences** - Meta key behavior varies (Cmd/Win)
3. **Focus context** - Events go to activeElement

### Patterns to Follow

1. **Event sequence** - keydown → keypress → keyup
2. **Modifier management** - Press first, release last
3. **Async delays** - Use promises for timing

### Edge Cases

1. **No focused element** - Send to document.body
2. **Prevented default** - Some sites block shortcuts
3. **Shadow DOM** - May not receive events
4. **Iframes** - Content script must be in same frame
5. **Rapid key sequences** - Add small delays

---

## 8. VERIFICATION COMMANDS

```bash
# Verify handler registration
grep -n "VISION_SEND_KEYS" src/content/content.tsx

# Verify type definitions
grep -n "VisionSendKeysPayload\|VisionSendKeysResponse" src/types/messages.types.ts

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
- ENG-010: sendKeys() Function
- API Contracts: `/future-spec/06_api-contracts.md`

---

*End of Specification INT-003*
