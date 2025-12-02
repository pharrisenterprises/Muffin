# ENG-013: Input Handler

> **Build Card:** ENG-013  
> **Category:** Core Engine  
> **Dependencies:** ENG-001, ENG-006, ENG-008, ENG-009  
> **Risk Level:** Medium  
> **Estimated Lines:** 400-480

---

## 1. PURPOSE

Implement the `handleInput()` unified function within VisionEngine that intelligently handles various input field types using Vision-based detection. This function auto-detects the input type (text field, textarea, checkbox, radio button, file input, date picker) and executes the appropriate interaction. Provides a single entry point for form field automation regardless of field type.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| VisionEngine Class | `src/lib/visionEngine.ts` | Class structure and existing methods |
| Feature Specs | `/future-spec/03_feature-specs.md` | Input handling requirements |
| ENG-006 | `build-instructions/masterplan/03-engine/ENG-006_find-text-function.md` | findText() for locating elements |
| ENG-009 | `build-instructions/masterplan/03-engine/ENG-009_type-text-function.md` | typeText() for text inputs |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/lib/visionEngine.ts` | MODIFY | +150 |
| `src/types/vision.types.ts` | MODIFY | +45 |
| `src/content/content.tsx` | MODIFY | +40 |

### Artifacts

- `handleInput()` method added to VisionEngine
- `InputOptions` interface defined
- `InputResult` interface defined
- `InputType` enum for field type detection

---

## 4. DETAILED SPECIFICATION

### 4.1 Type Definitions

```typescript
// In src/types/vision.types.ts

/**
 * Detected input field types
 */
export type InputType = 
  | 'text'        // Standard text input
  | 'textarea'    // Multi-line text
  | 'password'    // Password field
  | 'email'       // Email input
  | 'number'      // Numeric input
  | 'tel'         // Phone number
  | 'url'         // URL input
  | 'search'      // Search field
  | 'checkbox'    // Checkbox
  | 'radio'       // Radio button
  | 'file'        // File upload
  | 'date'        // Date picker
  | 'time'        // Time picker
  | 'datetime'    // DateTime picker
  | 'range'       // Slider
  | 'color'       // Color picker
  | 'select'      // Dropdown (delegates to selectDropdownOption)
  | 'contenteditable' // Rich text / contenteditable
  | 'unknown';    // Could not determine

export interface InputOptions {
  /** Label text to find the input field */
  fieldLabel: string;
  
  /** Value to enter/select */
  value: string | boolean | number;
  
  /** Force specific input type (skip auto-detection) */
  inputType?: InputType;
  
  /** Offset from label to input field */
  offsetX?: number;
  offsetY?: number;
  
  /** For text inputs: delay between keystrokes */
  typeDelayMs?: number;
  
  /** For text inputs: clear before typing */
  clearFirst?: boolean;
  
  /** For checkboxes: desired state (true=checked, false=unchecked) */
  desiredState?: boolean;
  
  /** For radio buttons: click even if appears selected */
  forceClick?: boolean;
  
  /** Confidence threshold for text matching */
  confidence?: number;
  
  /** Tab ID for targeting specific tab */
  tabId?: number;
}

export interface InputResult {
  success: boolean;
  fieldFound: boolean;
  detectedType: InputType;
  actionPerformed: string;
  previousValue?: string | boolean;
  newValue?: string | boolean;
  error?: string;
  timing: {
    detectMs: number;
    actionMs: number;
    totalMs: number;
  };
}

/**
 * Result from DOM input type detection
 */
export interface InputTypeDetectionResult {
  type: InputType;
  tagName: string;
  inputType?: string;
  isContentEditable: boolean;
  isDisabled: boolean;
  isReadOnly: boolean;
  currentValue?: string | boolean;
}
```

### 4.2 HandleInput Method Implementation

```typescript
// In src/lib/visionEngine.ts

export class VisionEngine {
  // ... existing properties and methods ...

  /**
   * Handles input to various field types using Vision detection
   * @param options - Configuration for input handling
   * @returns Promise<InputResult>
   */
  async handleInput(options: InputOptions): Promise<InputResult> {
    const startTime = performance.now();
    const {
      fieldLabel,
      value,
      inputType,
      offsetX = 100,
      offsetY = 0,
      typeDelayMs = 50,
      clearFirst = true,
      desiredState,
      forceClick = false,
      confidence = 0.6,
      tabId
    } = options;

    const result: InputResult = {
      success: false,
      fieldFound: false,
      detectedType: 'unknown',
      actionPerformed: 'none',
      timing: {
        detectMs: 0,
        actionMs: 0,
        totalMs: 0
      }
    };

    try {
      const targetTabId = tabId ?? await this.getActiveTabId();

      // Step 1: Find the field label
      const detectStart = performance.now();
      const labelResult = await this.findText(fieldLabel, { 
        confidence, 
        tabId: targetTabId 
      });

      if (!labelResult.found || !labelResult.location) {
        result.error = `Field label "${fieldLabel}" not found`;
        result.timing.totalMs = performance.now() - startTime;
        return result;
      }

      result.fieldFound = true;

      // Calculate input field position
      const inputX = labelResult.location.x + (labelResult.location.width / 2) + offsetX;
      const inputY = labelResult.location.y + (labelResult.location.height / 2) + offsetY;

      // Step 2: Detect input type (or use provided type)
      let detectedType: InputType = inputType || 'unknown';
      
      if (!inputType) {
        const typeInfo = await this.detectInputType(inputX, inputY, targetTabId);
        detectedType = typeInfo.type;
        result.previousValue = typeInfo.currentValue;
        
        if (typeInfo.isDisabled) {
          result.error = 'Input field is disabled';
          result.timing.totalMs = performance.now() - startTime;
          return result;
        }
        
        if (typeInfo.isReadOnly) {
          result.error = 'Input field is read-only';
          result.timing.totalMs = performance.now() - startTime;
          return result;
        }
      }
      
      result.detectedType = detectedType;
      result.timing.detectMs = performance.now() - detectStart;

      // Step 3: Execute appropriate action based on type
      const actionStart = performance.now();
      
      switch (detectedType) {
        case 'text':
        case 'textarea':
        case 'password':
        case 'email':
        case 'number':
        case 'tel':
        case 'url':
        case 'search':
        case 'contenteditable': {
          // Text-based input
          const typeResult = await this.typeText({
            targetText: fieldLabel,
            inputText: String(value),
            typeDelayMs,
            clearFirst,
            offsetX,
            offsetY,
            confidence,
            tabId: targetTabId
          });
          
          result.success = typeResult.success;
          result.actionPerformed = 'type';
          result.newValue = String(value);
          result.error = typeResult.error;
          break;
        }

        case 'checkbox': {
          // Checkbox - toggle or set to desired state
          const checkResult = await this.handleCheckbox(
            inputX, 
            inputY, 
            typeof desiredState === 'boolean' ? desiredState : Boolean(value),
            targetTabId
          );
          
          result.success = checkResult.success;
          result.actionPerformed = checkResult.actionTaken;
          result.previousValue = checkResult.wasChecked;
          result.newValue = checkResult.isNowChecked;
          result.error = checkResult.error;
          break;
        }

        case 'radio': {
          // Radio button - click to select
          const clickResult = await this.clickAtCoordinates(inputX, inputY, {
            tabId: targetTabId
          });
          
          result.success = clickResult.success;
          result.actionPerformed = 'click';
          result.newValue = true;
          result.error = clickResult.error;
          break;
        }

        case 'select': {
          // Dropdown - delegate to selectDropdownOption
          const dropdownResult = await this.selectDropdownOption({
            dropdownLabel: fieldLabel,
            optionText: String(value),
            triggerOffsetX: offsetX,
            triggerOffsetY: offsetY,
            confidence,
            tabId: targetTabId
          });
          
          result.success = dropdownResult.success;
          result.actionPerformed = 'select';
          result.newValue = String(value);
          result.error = dropdownResult.error;
          break;
        }

        case 'date':
        case 'time':
        case 'datetime': {
          // Date/time pickers - click and type
          await this.clickAtCoordinates(inputX, inputY, { tabId: targetTabId });
          await this.delay(100);
          
          // Clear and type the date value
          await this.sendKeys(['Control', 'a'], { tabId: targetTabId });
          await this.delay(50);
          
          const typeResult = await this.typeText({
            targetText: fieldLabel,
            inputText: String(value),
            typeDelayMs: 30,
            clearFirst: false, // Already cleared with Ctrl+A
            offsetX,
            offsetY,
            tabId: targetTabId
          });
          
          result.success = typeResult.success;
          result.actionPerformed = 'date-input';
          result.newValue = String(value);
          result.error = typeResult.error;
          break;
        }

        case 'file': {
          // File inputs require special handling
          result.success = false;
          result.actionPerformed = 'none';
          result.error = 'File inputs require manual interaction or DOM-based approach';
          break;
        }

        case 'range': {
          // Slider - complex, requires position calculation
          result.success = false;
          result.actionPerformed = 'none';
          result.error = 'Range/slider inputs not yet supported via Vision';
          break;
        }

        case 'color': {
          // Color picker - complex native dialog
          result.success = false;
          result.actionPerformed = 'none';
          result.error = 'Color picker inputs not yet supported via Vision';
          break;
        }

        default: {
          // Unknown type - attempt to click and type
          await this.clickAtCoordinates(inputX, inputY, { tabId: targetTabId });
          await this.delay(100);
          
          const typeResult = await this.typeText({
            targetText: fieldLabel,
            inputText: String(value),
            typeDelayMs,
            clearFirst,
            offsetX,
            offsetY,
            tabId: targetTabId
          });
          
          result.success = typeResult.success;
          result.actionPerformed = 'type-fallback';
          result.newValue = String(value);
          result.error = typeResult.error;
        }
      }

      result.timing.actionMs = performance.now() - actionStart;

    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown input error';
      console.error('[VisionEngine] handleInput error:', result.error);
    }

    result.timing.totalMs = performance.now() - startTime;
    return result;
  }

  /**
   * Detects the type of input at given coordinates
   */
  private async detectInputType(
    x: number, 
    y: number, 
    tabId: number
  ): Promise<InputTypeDetectionResult> {
    const response = await this.sendMessageToTab<InputTypeDetectionResult>(tabId, {
      type: 'VISION_DETECT_INPUT_TYPE',
      payload: { x, y }
    });
    return response;
  }

  /**
   * Handles checkbox interaction
   */
  private async handleCheckbox(
    x: number,
    y: number,
    desiredState: boolean,
    tabId: number
  ): Promise<{
    success: boolean;
    wasChecked: boolean;
    isNowChecked: boolean;
    actionTaken: string;
    error?: string;
  }> {
    const response = await this.sendMessageToTab<{
      success: boolean;
      wasChecked: boolean;
      isNowChecked: boolean;
      actionTaken: string;
      error?: string;
    }>(tabId, {
      type: 'VISION_HANDLE_CHECKBOX',
      payload: { x, y, desiredState }
    });
    return response;
  }
}
```

### 4.3 Content Script Handlers

```typescript
// In src/content/content.tsx - Add to message handlers

case 'VISION_DETECT_INPUT_TYPE': {
  const { x, y } = message.payload;
  
  try {
    const element = document.elementFromPoint(x, y) as HTMLElement;
    
    if (!element) {
      sendResponse({ type: 'unknown', tagName: '', isContentEditable: false, isDisabled: false, isReadOnly: false });
      return true;
    }

    const tagName = element.tagName.toLowerCase();
    let inputType: InputType = 'unknown';
    let currentValue: string | boolean | undefined;

    if (tagName === 'input') {
      const input = element as HTMLInputElement;
      const type = input.type.toLowerCase();
      
      switch (type) {
        case 'text':
        case 'password':
        case 'email':
        case 'number':
        case 'tel':
        case 'url':
        case 'search':
          inputType = type as InputType;
          currentValue = input.value;
          break;
        case 'checkbox':
          inputType = 'checkbox';
          currentValue = input.checked;
          break;
        case 'radio':
          inputType = 'radio';
          currentValue = input.checked;
          break;
        case 'file':
          inputType = 'file';
          break;
        case 'date':
        case 'time':
        case 'datetime-local':
          inputType = type === 'datetime-local' ? 'datetime' : type as InputType;
          currentValue = input.value;
          break;
        case 'range':
          inputType = 'range';
          currentValue = input.value;
          break;
        case 'color':
          inputType = 'color';
          currentValue = input.value;
          break;
        default:
          inputType = 'text';
          currentValue = input.value;
      }

      sendResponse({
        type: inputType,
        tagName,
        inputType: type,
        isContentEditable: false,
        isDisabled: input.disabled,
        isReadOnly: input.readOnly,
        currentValue
      });
    } else if (tagName === 'textarea') {
      const textarea = element as HTMLTextAreaElement;
      sendResponse({
        type: 'textarea',
        tagName,
        isContentEditable: false,
        isDisabled: textarea.disabled,
        isReadOnly: textarea.readOnly,
        currentValue: textarea.value
      });
    } else if (tagName === 'select') {
      const select = element as HTMLSelectElement;
      sendResponse({
        type: 'select',
        tagName,
        isContentEditable: false,
        isDisabled: select.disabled,
        isReadOnly: false,
        currentValue: select.value
      });
    } else if (element.isContentEditable) {
      sendResponse({
        type: 'contenteditable',
        tagName,
        isContentEditable: true,
        isDisabled: false,
        isReadOnly: false,
        currentValue: element.textContent || ''
      });
    } else {
      sendResponse({
        type: 'unknown',
        tagName,
        isContentEditable: false,
        isDisabled: false,
        isReadOnly: false
      });
    }
  } catch (error) {
    sendResponse({
      type: 'unknown',
      tagName: '',
      isContentEditable: false,
      isDisabled: false,
      isReadOnly: false
    });
  }
  return true;
}

case 'VISION_HANDLE_CHECKBOX': {
  const { x, y, desiredState } = message.payload;
  
  try {
    const element = document.elementFromPoint(x, y) as HTMLInputElement;
    
    if (!element || element.type !== 'checkbox') {
      sendResponse({ success: false, error: 'No checkbox at coordinates' });
      return true;
    }

    const wasChecked = element.checked;
    
    // Only click if state needs to change
    if (wasChecked !== desiredState) {
      element.click();
    }

    sendResponse({
      success: true,
      wasChecked,
      isNowChecked: element.checked,
      actionTaken: wasChecked === desiredState ? 'none-already-correct' : 'clicked'
    });
  } catch (error) {
    sendResponse({
      success: false,
      wasChecked: false,
      isNowChecked: false,
      actionTaken: 'none',
      error: error instanceof Error ? error.message : 'Checkbox handling failed'
    });
  }
  return true;
}
```

---

## 5. CODE EXAMPLES

### 5.1 Basic Text Input

```typescript
import { VisionEngine } from '@/lib/visionEngine';

const engine = new VisionEngine();
await engine.initialize();

// Fill a text field
const result = await engine.handleInput({
  fieldLabel: 'Username',
  value: 'john.doe',
  clearFirst: true
});

if (result.success) {
  console.log(`Filled ${result.detectedType} field with "${result.newValue}"`);
}
```

### 5.2 Checkbox Handling

```typescript
// Check a checkbox
await engine.handleInput({
  fieldLabel: 'I agree to terms',
  value: true,
  desiredState: true  // Ensures it ends up checked
});

// Uncheck a checkbox
await engine.handleInput({
  fieldLabel: 'Subscribe to newsletter',
  value: false,
  desiredState: false  // Ensures it ends up unchecked
});
```

### 5.3 Radio Button Selection

```typescript
// Select a radio option
await engine.handleInput({
  fieldLabel: 'Express Shipping',
  value: true,
  inputType: 'radio'  // Hint that it's a radio button
});
```

### 5.4 Date Input

```typescript
// Enter a date
await engine.handleInput({
  fieldLabel: 'Start Date',
  value: '2025-01-15',
  inputType: 'date'
});
```

### 5.5 Complete Form Fill

```typescript
// Fill entire form using handleInput for all fields
const formData = [
  { fieldLabel: 'First Name', value: 'John' },
  { fieldLabel: 'Last Name', value: 'Doe' },
  { fieldLabel: 'Email', value: 'john@example.com' },
  { fieldLabel: 'Phone', value: '555-1234' },
  { fieldLabel: 'State', value: 'California', inputType: 'select' as InputType },
  { fieldLabel: 'Subscribe', value: true, inputType: 'checkbox' as InputType },
  { fieldLabel: 'Agree to Terms', value: true, desiredState: true }
];

for (const field of formData) {
  const result = await engine.handleInput({
    ...field,
    offsetX: 150,
    typeDelayMs: 30
  });
  
  if (!result.success) {
    console.error(`Failed on ${field.fieldLabel}: ${result.error}`);
    break;
  }
  
  console.log(`${field.fieldLabel}: ${result.detectedType} -> ${result.actionPerformed}`);
  await new Promise(r => setTimeout(r, 100));
}
```

### 5.6 Integration with Step Execution

```typescript
// In stepExecutors.ts
export async function executeVisionInput(
  step: Step,
  context: ExecutionContext
): Promise<StepResult> {
  const { visionEngine, csvData, currentRow } = context;
  
  // Substitute CSV variables
  let value = step.value || '';
  if (csvData && currentRow !== undefined) {
    value = substituteVariables(value, csvData[currentRow]);
  }
  
  const result = await visionEngine.handleInput({
    fieldLabel: step.visionTarget || '',
    value,
    inputType: step.visionInputType,
    offsetX: step.visionOffsetX || 100,
    offsetY: step.visionOffsetY || 0,
    typeDelayMs: step.typeDelayMs || 50,
    clearFirst: step.clearFirst ?? true,
    desiredState: step.checkboxDesiredState,
    confidence: step.visionConfidence || 0.6,
    tabId: context.tabId
  });
  
  return {
    success: result.success,
    stepId: step.id,
    action: `vision_input_${result.detectedType}`,
    error: result.error,
    metadata: {
      detectedType: result.detectedType,
      actionPerformed: result.actionPerformed,
      previousValue: result.previousValue,
      newValue: result.newValue
    }
  };
}
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** Detects text input fields and types into them
- [ ] **AC-2:** Detects textarea fields and types multi-line text
- [ ] **AC-3:** Detects checkboxes and sets to desired state
- [ ] **AC-4:** Detects radio buttons and clicks to select
- [ ] **AC-5:** Detects dropdowns and delegates to selectDropdownOption
- [ ] **AC-6:** Detects date/time pickers and enters values
- [ ] **AC-7:** Reports detected type in result
- [ ] **AC-8:** Reports previous and new values
- [ ] **AC-9:** Handles disabled/readonly fields gracefully
- [ ] **AC-10:** Falls back to click-and-type for unknown types

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Type detection accuracy** - DOM inspection required
2. **Coordinate precision** - Must hit actual input, not label
3. **Custom components** - May not behave like native inputs

### Patterns to Follow

1. **Type detection first** - Know what you're dealing with
2. **Delegate to specialized methods** - typeText, selectDropdownOption
3. **State awareness** - Check before toggling checkboxes

### Edge Cases

1. **Hidden inputs** - Cannot interact via Vision
2. **Custom checkboxes** - CSS-styled divs acting as checkboxes
3. **Masked inputs** - Credit card, phone number formatters
4. **Auto-completing inputs** - May show dropdown after typing
5. **Required fields** - Validation may block form submission
6. **Dynamic labels** - Labels that change or animate

---

## 8. VERIFICATION COMMANDS

```bash
# Verify handleInput method exists
grep -n "handleInput" src/lib/visionEngine.ts

# Verify content script handlers
grep -n "VISION_DETECT_INPUT_TYPE\|VISION_HANDLE_CHECKBOX" src/content/content.tsx

# Verify type definitions
grep -n "InputOptions\|InputResult\|InputType" src/types/vision.types.ts

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
- ENG-008: clickAtCoordinates() Function
- ENG-009: typeText() Function
- ENG-012: selectDropdownOption() Function
- Feature Spec: `/future-spec/03_feature-specs.md` Section 3.6

---

*End of Specification ENG-013*
