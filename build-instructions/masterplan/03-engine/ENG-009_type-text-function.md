# ENG-009: Type Text Function

> **Build Card:** ENG-009  
> **Category:** Core Engine  
> **Dependencies:** ENG-001, ENG-006, INT-002  
> **Risk Level:** Medium  
> **Estimated Lines:** 450-550

---

## 1. PURPOSE

Implement the `typeText()` function within VisionEngine that enables Vision-based text input. This function locates a target field using OCR, clicks to focus it, and then types the specified text character by character with configurable delays. This is essential for automating form fills when DOM selectors are unavailable or unreliable.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| VisionEngine Class | `src/lib/visionEngine.ts` | Class structure and existing methods |
| Feature Specs | `/future-spec/03_feature-specs.md` | typeText behavior requirements |
| API Contracts | `/future-spec/06_api-contracts.md` | Message format for VISION_TYPE |
| INT-002 | `build-instructions/masterplan/04-integration/INT-002_vision-type-handler.md` | Message handler interface |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/lib/visionEngine.ts` | MODIFY | +120 |
| `src/types/vision.types.ts` | MODIFY | +25 |

### Artifacts

- `typeText()` method added to VisionEngine
- `TypeTextOptions` interface defined
- `TypeTextResult` interface defined

---

## 4. DETAILED SPECIFICATION

### 4.1 TypeText Options Interface

```typescript
// In src/types/vision.types.ts

export interface TypeTextOptions {
  /** Text to search for (field label or placeholder) */
  targetText: string;
  
  /** Text to type into the field */
  inputText: string;
  
  /** Delay between keystrokes in milliseconds */
  typeDelayMs?: number;
  
  /** Whether to clear field before typing */
  clearFirst?: boolean;
  
  /** Offset from found text center (for label → input scenarios) */
  offsetX?: number;
  offsetY?: number;
  
  /** Confidence threshold for text matching */
  confidence?: number;
  
  /** Tab ID for targeting specific tab */
  tabId?: number;
}

export interface TypeTextResult {
  success: boolean;
  targetFound: boolean;
  targetLocation?: { x: number; y: number };
  charactersTyped: number;
  totalCharacters: number;
  error?: string;
  timing: {
    searchMs: number;
    clickMs: number;
    typingMs: number;
    totalMs: number;
  };
}
```

### 4.2 TypeText Method Implementation

```typescript
// In src/lib/visionEngine.ts

export class VisionEngine {
  // ... existing properties and methods ...

  /**
   * Types text into a field located via OCR
   * @param options - Configuration for text typing
   * @returns Promise<TypeTextResult>
   */
  async typeText(options: TypeTextOptions): Promise<TypeTextResult> {
    const startTime = performance.now();
    const {
      targetText,
      inputText,
      typeDelayMs = 50,
      clearFirst = true,
      offsetX = 100,
      offsetY = 0,
      confidence = 0.6,
      tabId
    } = options;

    const result: TypeTextResult = {
      success: false,
      targetFound: false,
      charactersTyped: 0,
      totalCharacters: inputText.length,
      timing: {
        searchMs: 0,
        clickMs: 0,
        typingMs: 0,
        totalMs: 0
      }
    };

    try {
      // Step 1: Find target text using OCR
      const searchStart = performance.now();
      const findResult = await this.findText(targetText, { confidence, tabId });
      result.timing.searchMs = performance.now() - searchStart;

      if (!findResult.found || !findResult.location) {
        result.error = `Target text "${targetText}" not found on screen`;
        result.timing.totalMs = performance.now() - startTime;
        return result;
      }

      result.targetFound = true;
      
      // Calculate click position (offset from label to input field)
      const clickX = findResult.location.x + (findResult.location.width / 2) + offsetX;
      const clickY = findResult.location.y + (findResult.location.height / 2) + offsetY;
      result.targetLocation = { x: clickX, y: clickY };

      // Step 2: Click to focus the input field
      const clickStart = performance.now();
      const clickResult = await this.clickAtCoordinates(clickX, clickY, { tabId });
      result.timing.clickMs = performance.now() - clickStart;

      if (!clickResult.success) {
        result.error = `Failed to click at coordinates (${clickX}, ${clickY})`;
        result.timing.totalMs = performance.now() - startTime;
        return result;
      }

      // Step 3: Clear existing content if requested
      if (clearFirst) {
        await this.sendKeys(['Control', 'a'], { tabId });
        await this.delay(50);
      }

      // Step 4: Type text character by character
      const typeStart = performance.now();
      for (let i = 0; i < inputText.length; i++) {
        const char = inputText[i];
        await this.typeCharacter(char, tabId);
        result.charactersTyped++;
        
        if (typeDelayMs > 0 && i < inputText.length - 1) {
          await this.delay(typeDelayMs);
        }
      }
      result.timing.typingMs = performance.now() - typeStart;

      result.success = true;
      result.timing.totalMs = performance.now() - startTime;
      
      console.log(`[VisionEngine] Typed ${result.charactersTyped} characters into "${targetText}"`);
      return result;

    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown error during typeText';
      result.timing.totalMs = performance.now() - startTime;
      console.error('[VisionEngine] typeText error:', result.error);
      return result;
    }
  }

  /**
   * Types a single character via content script injection
   * @param char - Character to type
   * @param tabId - Target tab ID
   */
  private async typeCharacter(char: string, tabId?: number): Promise<void> {
    const targetTabId = tabId ?? await this.getActiveTabId();
    
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(
        targetTabId,
        {
          type: 'VISION_TYPE_CHAR',
          payload: { char }
        },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response?.success) {
            resolve();
          } else {
            reject(new Error(response?.error || 'Failed to type character'));
          }
        }
      );
    });
  }

  /**
   * Simple delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 4.3 Content Script Handler for Character Typing

```typescript
// In src/content/content.tsx - Add to message handlers

case 'VISION_TYPE_CHAR': {
  const { char } = message.payload;
  
  try {
    // Get the currently focused element
    const activeElement = document.activeElement as HTMLElement;
    
    if (!activeElement) {
      sendResponse({ success: false, error: 'No active element' });
      return true;
    }

    // For input/textarea elements, modify value directly
    if (activeElement instanceof HTMLInputElement || 
        activeElement instanceof HTMLTextAreaElement) {
      const start = activeElement.selectionStart ?? activeElement.value.length;
      const end = activeElement.selectionEnd ?? activeElement.value.length;
      
      // Insert character at cursor position
      const before = activeElement.value.substring(0, start);
      const after = activeElement.value.substring(end);
      activeElement.value = before + char + after;
      
      // Move cursor after inserted character
      activeElement.selectionStart = start + 1;
      activeElement.selectionEnd = start + 1;
      
      // Dispatch input event for React/Vue/Angular compatibility
      activeElement.dispatchEvent(new Event('input', { bubbles: true }));
      activeElement.dispatchEvent(new Event('change', { bubbles: true }));
      
      sendResponse({ success: true });
    } 
    // For contenteditable elements
    else if (activeElement.isContentEditable) {
      document.execCommand('insertText', false, char);
      sendResponse({ success: true });
    }
    // Fallback: dispatch keyboard events
    else {
      const keydownEvent = new KeyboardEvent('keydown', {
        key: char,
        code: `Key${char.toUpperCase()}`,
        bubbles: true,
        cancelable: true
      });
      const keypressEvent = new KeyboardEvent('keypress', {
        key: char,
        code: `Key${char.toUpperCase()}`,
        bubbles: true,
        cancelable: true
      });
      const keyupEvent = new KeyboardEvent('keyup', {
        key: char,
        code: `Key${char.toUpperCase()}`,
        bubbles: true,
        cancelable: true
      });
      
      activeElement.dispatchEvent(keydownEvent);
      activeElement.dispatchEvent(keypressEvent);
      activeElement.dispatchEvent(keyupEvent);
      
      sendResponse({ success: true });
    }
  } catch (error) {
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Type char failed' 
    });
  }
  return true;
}
```

### 4.4 Special Character Handling

```typescript
// In src/lib/visionEngine.ts - Helper for special keys

/**
 * Maps special characters to their key codes
 */
private getKeyInfo(char: string): { key: string; code: string; shiftKey: boolean } {
  const shiftChars: Record<string, string> = {
    '!': '1', '@': '2', '#': '3', '$': '4', '%': '5',
    '^': '6', '&': '7', '*': '8', '(': '9', ')': '0',
    '_': '-', '+': '=', '{': '[', '}': ']', '|': '\\',
    ':': ';', '"': "'", '<': ',', '>': '.', '?': '/',
    '~': '`'
  };

  const isUpperCase = char !== char.toLowerCase() && char === char.toUpperCase();
  const needsShift = isUpperCase || char in shiftChars;
  
  let baseChar = char;
  if (char in shiftChars) {
    baseChar = shiftChars[char];
  } else if (isUpperCase) {
    baseChar = char.toLowerCase();
  }

  return {
    key: char,
    code: baseChar.length === 1 ? `Key${baseChar.toUpperCase()}` : baseChar,
    shiftKey: needsShift
  };
}
```

---

## 5. CODE EXAMPLES

### 5.1 Basic Usage

```typescript
import { VisionEngine } from '@/lib/visionEngine';

const engine = new VisionEngine();
await engine.initialize();

// Type into a field labeled "Username"
const result = await engine.typeText({
  targetText: 'Username',
  inputText: 'john.doe@example.com',
  typeDelayMs: 30,
  clearFirst: true
});

if (result.success) {
  console.log(`Typed ${result.charactersTyped} characters in ${result.timing.totalMs}ms`);
} else {
  console.error('Failed:', result.error);
}
```

### 5.2 With CSV Variable Substitution

```typescript
// During playback with CSV data
const csvRow = { email: 'user@test.com', password: 'secret123' };

const emailResult = await engine.typeText({
  targetText: 'Email',
  inputText: csvRow.email,
  offsetX: 150,  // Adjust for label-to-input distance
  offsetY: 0
});

const passwordResult = await engine.typeText({
  targetText: 'Password',
  inputText: csvRow.password,
  offsetX: 150
});
```

### 5.3 Typing into Copilot Prompt Field

```typescript
// For Copilot automation scenario
const promptResult = await engine.typeText({
  targetText: 'Ask Copilot',  // Placeholder text in prompt
  inputText: smartPromptContent,
  typeDelayMs: 10,  // Faster for long prompts
  clearFirst: true,
  offsetX: 0,       // Prompt field is at the text location
  offsetY: 0
});

if (promptResult.success) {
  // Now click submit
  await engine.clickAtText('Submit');
}
```

### 5.4 Integration with Step Execution

```typescript
// In stepExecutors.ts
export async function executeVisionType(
  step: Step,
  context: ExecutionContext
): Promise<StepResult> {
  const { visionEngine, csvData, currentRow } = context;
  
  // Substitute CSV variables in input text
  let inputText = step.value || '';
  if (csvData && currentRow !== undefined) {
    inputText = substituteVariables(inputText, csvData[currentRow]);
  }
  
  const result = await visionEngine.typeText({
    targetText: step.visionTarget || '',
    inputText,
    typeDelayMs: step.typeDelayMs || 50,
    clearFirst: step.clearFirst ?? true,
    offsetX: step.visionOffsetX || 100,
    offsetY: step.visionOffsetY || 0,
    confidence: step.visionConfidence || 0.6,
    tabId: context.tabId
  });
  
  return {
    success: result.success,
    stepId: step.id,
    action: 'vision_type',
    error: result.error,
    metadata: {
      charactersTyped: result.charactersTyped,
      timing: result.timing
    }
  };
}
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** typeText() locates target field via OCR
- [ ] **AC-2:** Click focuses the correct input field
- [ ] **AC-3:** Text is typed character by character
- [ ] **AC-4:** typeDelayMs controls speed between keystrokes
- [ ] **AC-5:** clearFirst=true clears existing content
- [ ] **AC-6:** offsetX/offsetY adjust click position from label
- [ ] **AC-7:** Special characters (!, @, #, etc.) typed correctly
- [ ] **AC-8:** Works with input, textarea, and contenteditable
- [ ] **AC-9:** Timing metrics accurately reported
- [ ] **AC-10:** Returns meaningful error when target not found

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Character-by-character** - Required for reactive frameworks
2. **Framework agnostic** - Must trigger input/change events
3. **Configurable delays** - Different sites need different speeds

### Patterns to Follow

1. **Async/await** - All operations are promises
2. **Defensive defaults** - All options have sensible defaults
3. **Detailed timing** - Track each phase separately

### Edge Cases

1. **Hidden inputs** - May fail to click, return clear error
2. **Autocomplete dropdowns** - May need delay before continuing
3. **Shadow DOM inputs** - May require alternative injection
4. **Long text** - Consider progress reporting for 1000+ chars
5. **Tab changes** - Verify tab is still active before typing

---

## 8. VERIFICATION COMMANDS

```bash
# Verify VisionEngine has typeText method
grep -n "typeText" src/lib/visionEngine.ts

# Verify content script handler
grep -n "VISION_TYPE_CHAR" src/content/content.tsx

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
- ENG-006: findText() Function
- INT-002: VISION_TYPE Message Handler
- Feature Spec: `/future-spec/03_feature-specs.md` Section 3.2

---

*End of Specification ENG-009*
