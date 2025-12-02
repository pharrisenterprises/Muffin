# ENG-010: Send Keys Function

> **Build Card:** ENG-010  
> **Category:** Core Engine  
> **Dependencies:** ENG-001, INT-003  
> **Risk Level:** Low  
> **Estimated Lines:** 400-480

---

## 1. PURPOSE

Implement the `sendKeys()` function within VisionEngine that sends keyboard shortcuts and special key combinations (Enter, Tab, Escape, Ctrl+A, etc.) to the active element. This enables automation of keyboard-driven workflows like form submission, navigation, and text selection without relying on DOM selectors.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| VisionEngine Class | `src/lib/visionEngine.ts` | Class structure and existing methods |
| Feature Specs | `/future-spec/03_feature-specs.md` | sendKeys behavior requirements |
| API Contracts | `/future-spec/06_api-contracts.md` | Message format for VISION_KEY |
| INT-003 | `build-instructions/masterplan/04-integration/INT-003_vision-key-handler.md` | Message handler interface |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/lib/visionEngine.ts` | MODIFY | +95 |
| `src/types/vision.types.ts` | MODIFY | +35 |
| `src/content/content.tsx` | MODIFY | +60 |

### Artifacts

- `sendKeys()` method added to VisionEngine
- `SendKeysOptions` interface defined
- `SendKeysResult` interface defined
- `KeyDefinition` type for key mappings

---

## 4. DETAILED SPECIFICATION

### 4.1 Type Definitions

```typescript
// In src/types/vision.types.ts

/**
 * Supported special keys for sendKeys()
 */
export type SpecialKey = 
  | 'Enter' | 'Tab' | 'Escape' | 'Backspace' | 'Delete'
  | 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'
  | 'Home' | 'End' | 'PageUp' | 'PageDown'
  | 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6' 
  | 'F7' | 'F8' | 'F9' | 'F10' | 'F11' | 'F12'
  | 'Space';

/**
 * Modifier keys
 */
export type ModifierKey = 'Control' | 'Alt' | 'Shift' | 'Meta';

/**
 * A key can be a special key, modifier, or single character
 */
export type KeyInput = SpecialKey | ModifierKey | string;

export interface SendKeysOptions {
  /** Array of keys to send (modifiers first, then key) */
  keys: KeyInput[];
  
  /** Delay between key down and key up in ms */
  keyHoldMs?: number;
  
  /** Delay after all keys released in ms */
  postDelayMs?: number;
  
  /** Target tab ID (defaults to active tab) */
  tabId?: number;
}

export interface SendKeysResult {
  success: boolean;
  keysSent: KeyInput[];
  error?: string;
  timing: {
    totalMs: number;
  };
}

/**
 * Key code mapping for keyboard events
 */
export interface KeyDefinition {
  key: string;
  code: string;
  keyCode: number;
}
```

### 4.2 Key Code Mappings

```typescript
// In src/lib/visionEngine.ts - Static key mappings

const KEY_DEFINITIONS: Record<string, KeyDefinition> = {
  // Special keys
  Enter: { key: 'Enter', code: 'Enter', keyCode: 13 },
  Tab: { key: 'Tab', code: 'Tab', keyCode: 9 },
  Escape: { key: 'Escape', code: 'Escape', keyCode: 27 },
  Backspace: { key: 'Backspace', code: 'Backspace', keyCode: 8 },
  Delete: { key: 'Delete', code: 'Delete', keyCode: 46 },
  Space: { key: ' ', code: 'Space', keyCode: 32 },
  
  // Arrow keys
  ArrowUp: { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 },
  ArrowDown: { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 },
  ArrowLeft: { key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37 },
  ArrowRight: { key: 'ArrowRight', code: 'ArrowRight', keyCode: 39 },
  
  // Navigation keys
  Home: { key: 'Home', code: 'Home', keyCode: 36 },
  End: { key: 'End', code: 'End', keyCode: 35 },
  PageUp: { key: 'PageUp', code: 'PageUp', keyCode: 33 },
  PageDown: { key: 'PageDown', code: 'PageDown', keyCode: 34 },
  
  // Modifier keys
  Control: { key: 'Control', code: 'ControlLeft', keyCode: 17 },
  Alt: { key: 'Alt', code: 'AltLeft', keyCode: 18 },
  Shift: { key: 'Shift', code: 'ShiftLeft', keyCode: 16 },
  Meta: { key: 'Meta', code: 'MetaLeft', keyCode: 91 },
  
  // Function keys
  F1: { key: 'F1', code: 'F1', keyCode: 112 },
  F2: { key: 'F2', code: 'F2', keyCode: 113 },
  F3: { key: 'F3', code: 'F3', keyCode: 114 },
  F4: { key: 'F4', code: 'F4', keyCode: 115 },
  F5: { key: 'F5', code: 'F5', keyCode: 116 },
  F6: { key: 'F6', code: 'F6', keyCode: 117 },
  F7: { key: 'F7', code: 'F7', keyCode: 118 },
  F8: { key: 'F8', code: 'F8', keyCode: 119 },
  F9: { key: 'F9', code: 'F9', keyCode: 120 },
  F10: { key: 'F10', code: 'F10', keyCode: 121 },
  F11: { key: 'F11', code: 'F11', keyCode: 122 },
  F12: { key: 'F12', code: 'F12', keyCode: 123 },
};

const MODIFIER_KEYS = ['Control', 'Alt', 'Shift', 'Meta'];
```

### 4.3 SendKeys Method Implementation

```typescript
// In src/lib/visionEngine.ts

export class VisionEngine {
  // ... existing properties and methods ...

  /**
   * Sends keyboard shortcuts or special keys to the active element
   * @param options - Configuration for key sending
   * @returns Promise<SendKeysResult>
   */
  async sendKeys(options: SendKeysOptions): Promise<SendKeysResult>;
  async sendKeys(keys: KeyInput[], options?: Partial<SendKeysOptions>): Promise<SendKeysResult>;
  async sendKeys(
    keysOrOptions: KeyInput[] | SendKeysOptions,
    maybeOptions?: Partial<SendKeysOptions>
  ): Promise<SendKeysResult> {
    const startTime = performance.now();
    
    // Normalize arguments
    let keys: KeyInput[];
    let keyHoldMs: number;
    let postDelayMs: number;
    let tabId: number | undefined;
    
    if (Array.isArray(keysOrOptions)) {
      keys = keysOrOptions;
      keyHoldMs = maybeOptions?.keyHoldMs ?? 10;
      postDelayMs = maybeOptions?.postDelayMs ?? 50;
      tabId = maybeOptions?.tabId;
    } else {
      keys = keysOrOptions.keys;
      keyHoldMs = keysOrOptions.keyHoldMs ?? 10;
      postDelayMs = keysOrOptions.postDelayMs ?? 50;
      tabId = keysOrOptions.tabId;
    }

    const result: SendKeysResult = {
      success: false,
      keysSent: [],
      timing: { totalMs: 0 }
    };

    try {
      const targetTabId = tabId ?? await this.getActiveTabId();
      
      // Separate modifiers from regular keys
      const modifiers = keys.filter(k => MODIFIER_KEYS.includes(k as string));
      const regularKeys = keys.filter(k => !MODIFIER_KEYS.includes(k as string));
      
      // Build key definitions for each key
      const keyDefs = keys.map(key => this.getKeyDefinition(key));
      
      // Send to content script
      const response = await this.sendMessageToTab<{ success: boolean; error?: string }>(
        targetTabId,
        {
          type: 'VISION_SEND_KEYS',
          payload: {
            keys: keyDefs,
            modifiers: modifiers.map(m => this.getKeyDefinition(m)),
            regularKeys: regularKeys.map(k => this.getKeyDefinition(k)),
            keyHoldMs,
            postDelayMs
          }
        }
      );

      if (response.success) {
        result.success = true;
        result.keysSent = keys;
        console.log(`[VisionEngine] Sent keys: ${keys.join('+')}`);
      } else {
        result.error = response.error || 'Failed to send keys';
      }

    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error in sendKeys';
      console.error('[VisionEngine] sendKeys error:', result.error);
    }

    result.timing.totalMs = performance.now() - startTime;
    return result;
  }

  /**
   * Gets key definition for a key input
   */
  private getKeyDefinition(key: KeyInput): KeyDefinition {
    // Check if it's a known special key
    if (key in KEY_DEFINITIONS) {
      return KEY_DEFINITIONS[key];
    }
    
    // Single character key
    if (key.length === 1) {
      const upper = key.toUpperCase();
      const keyCode = upper.charCodeAt(0);
      return {
        key: key,
        code: `Key${upper}`,
        keyCode: keyCode
      };
    }
    
    // Unknown key, return as-is
    return {
      key: key,
      code: key,
      keyCode: 0
    };
  }

  /**
   * Helper to send message to tab and get response
   */
  private sendMessageToTab<T>(tabId: number, message: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response as T);
        }
      });
    });
  }
}
```

### 4.4 Content Script Handler

```typescript
// In src/content/content.tsx - Add to message handlers

case 'VISION_SEND_KEYS': {
  const { modifiers, regularKeys, keyHoldMs, postDelayMs } = message.payload;
  
  try {
    const activeElement = document.activeElement || document.body;
    
    // Build modifier state
    const modifierState = {
      ctrlKey: modifiers.some((m: KeyDefinition) => m.key === 'Control'),
      altKey: modifiers.some((m: KeyDefinition) => m.key === 'Alt'),
      shiftKey: modifiers.some((m: KeyDefinition) => m.key === 'Shift'),
      metaKey: modifiers.some((m: KeyDefinition) => m.key === 'Meta')
    };

    // Press modifier keys down
    for (const mod of modifiers) {
      const keydownEvent = new KeyboardEvent('keydown', {
        key: mod.key,
        code: mod.code,
        keyCode: mod.keyCode,
        bubbles: true,
        cancelable: true,
        ...modifierState
      });
      activeElement.dispatchEvent(keydownEvent);
    }

    // Press and release regular keys
    for (const keyDef of regularKeys) {
      // Key down
      const keydownEvent = new KeyboardEvent('keydown', {
        key: keyDef.key,
        code: keyDef.code,
        keyCode: keyDef.keyCode,
        bubbles: true,
        cancelable: true,
        ...modifierState
      });
      activeElement.dispatchEvent(keydownEvent);

      // Key press (for printable characters)
      if (keyDef.key.length === 1) {
        const keypressEvent = new KeyboardEvent('keypress', {
          key: keyDef.key,
          code: keyDef.code,
          keyCode: keyDef.keyCode,
          charCode: keyDef.key.charCodeAt(0),
          bubbles: true,
          cancelable: true,
          ...modifierState
        });
        activeElement.dispatchEvent(keypressEvent);
      }

      // Small delay for key hold
      await new Promise(r => setTimeout(r, keyHoldMs));

      // Key up
      const keyupEvent = new KeyboardEvent('keyup', {
        key: keyDef.key,
        code: keyDef.code,
        keyCode: keyDef.keyCode,
        bubbles: true,
        cancelable: true,
        ...modifierState
      });
      activeElement.dispatchEvent(keyupEvent);
    }

    // Release modifier keys (in reverse order)
    for (const mod of [...modifiers].reverse()) {
      const keyupEvent = new KeyboardEvent('keyup', {
        key: mod.key,
        code: mod.code,
        keyCode: mod.keyCode,
        bubbles: true,
        cancelable: true
      });
      activeElement.dispatchEvent(keyupEvent);
    }

    // Post-delay
    if (postDelayMs > 0) {
      await new Promise(r => setTimeout(r, postDelayMs));
    }

    sendResponse({ success: true });
  } catch (error) {
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Send keys failed' 
    });
  }
  return true;
}
```

---

## 5. CODE EXAMPLES

### 5.1 Basic Usage - Single Keys

```typescript
import { VisionEngine } from '@/lib/visionEngine';

const engine = new VisionEngine();
await engine.initialize();

// Press Enter to submit form
await engine.sendKeys(['Enter']);

// Press Tab to move to next field
await engine.sendKeys(['Tab']);

// Press Escape to close modal
await engine.sendKeys(['Escape']);
```

### 5.2 Keyboard Shortcuts

```typescript
// Select all text (Ctrl+A)
await engine.sendKeys(['Control', 'a']);

// Copy (Ctrl+C)
await engine.sendKeys(['Control', 'c']);

// Paste (Ctrl+V)
await engine.sendKeys(['Control', 'v']);

// Undo (Ctrl+Z)
await engine.sendKeys(['Control', 'z']);

// Save (Ctrl+S)
await engine.sendKeys(['Control', 's']);

// Find (Ctrl+F)
await engine.sendKeys(['Control', 'f']);
```

### 5.3 Complex Combinations

```typescript
// Shift+Tab to go back
await engine.sendKeys(['Shift', 'Tab']);

// Ctrl+Shift+P for command palette
await engine.sendKeys(['Control', 'Shift', 'p']);

// Alt+F4 to close (Windows)
await engine.sendKeys(['Alt', 'F4']);

// Ctrl+Alt+Delete
await engine.sendKeys(['Control', 'Alt', 'Delete']);
```

### 5.4 With Options Object

```typescript
// With explicit options
const result = await engine.sendKeys({
  keys: ['Control', 'Enter'],
  keyHoldMs: 20,
  postDelayMs: 100,
  tabId: activeTabId
});

if (result.success) {
  console.log(`Sent keys: ${result.keysSent.join('+')}`);
  console.log(`Took ${result.timing.totalMs}ms`);
}
```

### 5.5 Integration with typeText for Form Completion

```typescript
// Complete a login form
await engine.typeText({
  targetText: 'Username',
  inputText: 'john.doe'
});

await engine.sendKeys(['Tab']); // Move to password field

await engine.typeText({
  targetText: 'Password',
  inputText: 'secret123'
});

await engine.sendKeys(['Enter']); // Submit form
```

### 5.6 Copilot Workflow Example

```typescript
// After typing smart prompt into Copilot
await engine.typeText({
  targetText: 'Ask Copilot',
  inputText: smartPromptContent
});

// Submit with Ctrl+Enter (Copilot shortcut)
await engine.sendKeys(['Control', 'Enter']);

// Wait for processing, then handle "Allow" buttons
// (handled by conditional click logic)
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** Single special keys work (Enter, Tab, Escape, etc.)
- [ ] **AC-2:** Modifier combinations work (Ctrl+A, Ctrl+C, etc.)
- [ ] **AC-3:** Multiple modifiers work (Ctrl+Shift+P)
- [ ] **AC-4:** Function keys work (F1-F12)
- [ ] **AC-5:** Arrow keys work for navigation
- [ ] **AC-6:** keyHoldMs controls key press duration
- [ ] **AC-7:** postDelayMs adds delay after keys sent
- [ ] **AC-8:** Works with input, textarea, and contenteditable
- [ ] **AC-9:** Returns accurate timing information
- [ ] **AC-10:** Graceful error handling for invalid keys

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Browser security** - Some shortcuts (Ctrl+W, Alt+F4) may be blocked
2. **Platform differences** - Meta key is Cmd on Mac, Win on Windows
3. **Focus required** - Keys sent to activeElement only

### Patterns to Follow

1. **Function overloading** - Support both array and options syntax
2. **Modifier-first ordering** - Modifiers must precede regular keys
3. **Proper event sequence** - keydown → keypress → keyup

### Edge Cases

1. **No focused element** - Send to document.body
2. **Shadow DOM** - May not receive events
3. **Prevented default** - Some sites block certain shortcuts
4. **Rapid succession** - Add small delays between multiple sendKeys calls

---

## 8. VERIFICATION COMMANDS

```bash
# Verify sendKeys method exists
grep -n "sendKeys" src/lib/visionEngine.ts

# Verify content script handler
grep -n "VISION_SEND_KEYS" src/content/content.tsx

# Verify type definitions
grep -n "SendKeysOptions" src/types/vision.types.ts

# Run type check
npm run type-check

# Build extension
npm run build
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Revert VisionEngine changes
git checkout src/lib/visionEngine.ts

# Revert content script changes
git checkout src/content/content.tsx

# Revert type definitions
git checkout src/types/vision.types.ts
```

---

## 10. REFERENCES

- ENG-001: VisionEngine Class
- ENG-009: typeText() Function (uses sendKeys internally)
- INT-003: VISION_KEY Message Handler
- Feature Spec: `/future-spec/03_feature-specs.md` Section 3.3

---

*End of Specification ENG-010*
