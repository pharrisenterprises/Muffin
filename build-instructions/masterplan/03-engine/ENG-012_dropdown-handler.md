# ENG-012: Dropdown Handler

> **Build Card:** ENG-012  
> **Category:** Core Engine  
> **Dependencies:** ENG-001, ENG-006, ENG-008  
> **Risk Level:** Medium  
> **Estimated Lines:** 420-500

---

## 1. PURPOSE

Implement the `selectDropdownOption()` function within VisionEngine that handles dropdown/select menu interactions using Vision-based detection. This function locates a dropdown by its label text, clicks to open it, then finds and clicks the desired option from the expanded menu. Essential for automating form fills with select elements when DOM selectors are unreliable.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| VisionEngine Class | `src/lib/visionEngine.ts` | Class structure and existing methods |
| Feature Specs | `/future-spec/03_feature-specs.md` | Dropdown behavior requirements |
| ENG-006 | `build-instructions/masterplan/03-engine/ENG-006_find-text-function.md` | findText() for locating elements |
| ENG-008 | `build-instructions/masterplan/03-engine/ENG-008_click-at-coordinates.md` | clickAtCoordinates() for clicking |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/lib/visionEngine.ts` | MODIFY | +130 |
| `src/types/vision.types.ts` | MODIFY | +35 |

### Artifacts

- `selectDropdownOption()` method added to VisionEngine
- `DropdownOptions` interface defined
- `DropdownResult` interface defined

---

## 4. DETAILED SPECIFICATION

### 4.1 Type Definitions

```typescript
// In src/types/vision.types.ts

export interface DropdownOptions {
  /** Text label of the dropdown field */
  dropdownLabel: string;
  
  /** Option text to select from the dropdown */
  optionText: string;
  
  /** Offset from label to dropdown trigger (pixels) */
  triggerOffsetX?: number;
  triggerOffsetY?: number;
  
  /** Delay after opening dropdown before searching for option (ms) */
  openDelayMs?: number;
  
  /** Maximum time to wait for dropdown to open (ms) */
  openTimeoutMs?: number;
  
  /** Confidence threshold for text matching */
  confidence?: number;
  
  /** Tab ID for targeting specific tab */
  tabId?: number;
}

export interface DropdownResult {
  success: boolean;
  dropdownFound: boolean;
  dropdownOpened: boolean;
  optionFound: boolean;
  optionSelected: boolean;
  dropdownLocation?: { x: number; y: number };
  optionLocation?: { x: number; y: number };
  error?: string;
  timing: {
    findDropdownMs: number;
    openDropdownMs: number;
    findOptionMs: number;
    selectOptionMs: number;
    totalMs: number;
  };
}

/**
 * Dropdown type hint for different UI patterns
 */
export type DropdownType = 
  | 'native'       // HTML <select> element
  | 'custom'       // Custom dropdown (React Select, MUI, etc.)
  | 'autocomplete' // Searchable/autocomplete dropdown
  | 'auto';        // Auto-detect based on behavior
```

### 4.2 SelectDropdownOption Method Implementation

```typescript
// In src/lib/visionEngine.ts

export class VisionEngine {
  // ... existing properties and methods ...

  /**
   * Selects an option from a dropdown menu using Vision
   * @param options - Configuration for dropdown selection
   * @returns Promise<DropdownResult>
   */
  async selectDropdownOption(options: DropdownOptions): Promise<DropdownResult> {
    const startTime = performance.now();
    const {
      dropdownLabel,
      optionText,
      triggerOffsetX = 150,
      triggerOffsetY = 0,
      openDelayMs = 300,
      openTimeoutMs = 2000,
      confidence = 0.6,
      tabId
    } = options;

    const result: DropdownResult = {
      success: false,
      dropdownFound: false,
      dropdownOpened: false,
      optionFound: false,
      optionSelected: false,
      timing: {
        findDropdownMs: 0,
        openDropdownMs: 0,
        findOptionMs: 0,
        selectOptionMs: 0,
        totalMs: 0
      }
    };

    try {
      const targetTabId = tabId ?? await this.getActiveTabId();

      // Step 1: Find the dropdown label
      const findStart = performance.now();
      const labelResult = await this.findText(dropdownLabel, { 
        confidence, 
        tabId: targetTabId 
      });
      result.timing.findDropdownMs = performance.now() - findStart;

      if (!labelResult.found || !labelResult.location) {
        result.error = `Dropdown label "${dropdownLabel}" not found`;
        result.timing.totalMs = performance.now() - startTime;
        return result;
      }

      result.dropdownFound = true;
      
      // Calculate dropdown trigger position
      const triggerX = labelResult.location.x + (labelResult.location.width / 2) + triggerOffsetX;
      const triggerY = labelResult.location.y + (labelResult.location.height / 2) + triggerOffsetY;
      result.dropdownLocation = { x: triggerX, y: triggerY };

      // Step 2: Click to open the dropdown
      const openStart = performance.now();
      const clickResult = await this.clickAtCoordinates(triggerX, triggerY, { 
        tabId: targetTabId 
      });
      
      if (!clickResult.success) {
        result.error = `Failed to click dropdown at (${triggerX}, ${triggerY})`;
        result.timing.totalMs = performance.now() - startTime;
        return result;
      }

      // Wait for dropdown to open
      await this.delay(openDelayMs);
      result.timing.openDropdownMs = performance.now() - openStart;

      // Step 3: Wait for and find the option in opened dropdown
      const optionStart = performance.now();
      const optionResult = await this.waitForText(optionText, {
        timeoutMs: openTimeoutMs,
        pollIntervalMs: 100,
        confidence,
        tabId: targetTabId
      });
      result.timing.findOptionMs = performance.now() - optionStart;

      if (!optionResult.found || !optionResult.location) {
        result.dropdownOpened = true; // Assume it opened since click succeeded
        result.error = `Option "${optionText}" not found in dropdown`;
        
        // Try to close dropdown by pressing Escape
        await this.sendKeys(['Escape'], { tabId: targetTabId });
        
        result.timing.totalMs = performance.now() - startTime;
        return result;
      }

      result.dropdownOpened = true;
      result.optionFound = true;
      
      // Calculate option center
      const optionX = optionResult.location.x + (optionResult.location.width / 2);
      const optionY = optionResult.location.y + (optionResult.location.height / 2);
      result.optionLocation = { x: optionX, y: optionY };

      // Step 4: Click the option
      const selectStart = performance.now();
      const selectResult = await this.clickAtCoordinates(optionX, optionY, { 
        tabId: targetTabId 
      });
      result.timing.selectOptionMs = performance.now() - selectStart;

      if (!selectResult.success) {
        result.error = `Failed to click option at (${optionX}, ${optionY})`;
        result.timing.totalMs = performance.now() - startTime;
        return result;
      }

      result.optionSelected = true;
      result.success = true;
      
      console.log(`[VisionEngine] Selected "${optionText}" from dropdown "${dropdownLabel}"`);

    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Unknown dropdown error';
      console.error('[VisionEngine] selectDropdownOption error:', result.error);
    }

    result.timing.totalMs = performance.now() - startTime;
    return result;
  }

  /**
   * Waits for text to appear on screen (with polling)
   * @param text - Text to wait for
   * @param options - Wait configuration
   * @returns Promise with findText result
   */
  async waitForText(
    text: string,
    options: {
      timeoutMs?: number;
      pollIntervalMs?: number;
      confidence?: number;
      tabId?: number;
    } = {}
  ): Promise<FindTextResult> {
    const {
      timeoutMs = 5000,
      pollIntervalMs = 200,
      confidence = 0.6,
      tabId
    } = options;

    const startTime = performance.now();
    let lastResult: FindTextResult = {
      found: false,
      text,
      timing: { totalMs: 0 }
    };

    while (performance.now() - startTime < timeoutMs) {
      lastResult = await this.findText(text, { confidence, tabId });
      
      if (lastResult.found) {
        return lastResult;
      }

      await this.delay(pollIntervalMs);
    }

    lastResult.error = `Text "${text}" not found within ${timeoutMs}ms`;
    return lastResult;
  }
}
```

### 4.3 Handling Different Dropdown Types

```typescript
// In src/lib/visionEngine.ts - Additional helper methods

export class VisionEngine {
  // ... existing methods ...

  /**
   * Selects from a native HTML <select> dropdown
   * Uses keyboard navigation as backup
   */
  async selectNativeDropdown(
    dropdownLabel: string,
    optionText: string,
    options: Partial<DropdownOptions> = {}
  ): Promise<DropdownResult> {
    const result = await this.selectDropdownOption({
      dropdownLabel,
      optionText,
      ...options
    });

    // If Vision-based selection failed, try keyboard navigation
    if (!result.success && result.dropdownOpened) {
      console.log('[VisionEngine] Trying keyboard navigation for native select');
      
      // Type first few characters to jump to option
      const firstChars = optionText.substring(0, 2).toLowerCase();
      for (const char of firstChars) {
        await this.sendKeys([char], { tabId: options.tabId });
        await this.delay(50);
      }
      
      // Press Enter to confirm
      await this.sendKeys(['Enter'], { tabId: options.tabId });
      
      result.success = true;
      result.optionSelected = true;
    }

    return result;
  }

  /**
   * Selects from a searchable/autocomplete dropdown
   * Types to filter then selects
   */
  async selectAutocompleteOption(
    inputLabel: string,
    searchText: string,
    optionText?: string,
    options: Partial<DropdownOptions> = {}
  ): Promise<DropdownResult> {
    const startTime = performance.now();
    const targetTabId = options.tabId ?? await this.getActiveTabId();

    const result: DropdownResult = {
      success: false,
      dropdownFound: false,
      dropdownOpened: false,
      optionFound: false,
      optionSelected: false,
      timing: {
        findDropdownMs: 0,
        openDropdownMs: 0,
        findOptionMs: 0,
        selectOptionMs: 0,
        totalMs: 0
      }
    };

    try {
      // Type into the autocomplete field
      const typeResult = await this.typeText({
        targetText: inputLabel,
        inputText: searchText,
        clearFirst: true,
        typeDelayMs: 30,
        tabId: targetTabId
      });

      if (!typeResult.success) {
        result.error = `Failed to type into autocomplete: ${typeResult.error}`;
        result.timing.totalMs = performance.now() - startTime;
        return result;
      }

      result.dropdownFound = true;
      result.dropdownOpened = true;

      // Wait for suggestions to appear
      await this.delay(options.openDelayMs || 500);

      // Find and click the option (use optionText if different from searchText)
      const targetOption = optionText || searchText;
      const optionResult = await this.waitForText(targetOption, {
        timeoutMs: options.openTimeoutMs || 3000,
        confidence: options.confidence || 0.6,
        tabId: targetTabId
      });

      if (!optionResult.found || !optionResult.location) {
        result.error = `Option "${targetOption}" not found in suggestions`;
        await this.sendKeys(['Escape'], { tabId: targetTabId });
        result.timing.totalMs = performance.now() - startTime;
        return result;
      }

      result.optionFound = true;

      // Click the option
      const clickX = optionResult.location.x + (optionResult.location.width / 2);
      const clickY = optionResult.location.y + (optionResult.location.height / 2);
      
      const clickResult = await this.clickAtCoordinates(clickX, clickY, {
        tabId: targetTabId
      });

      if (clickResult.success) {
        result.success = true;
        result.optionSelected = true;
      } else {
        result.error = 'Failed to click suggestion';
      }

    } catch (error) {
      result.error = error instanceof Error ? error.message : 'Autocomplete error';
    }

    result.timing.totalMs = performance.now() - startTime;
    return result;
  }
}
```

---

## 5. CODE EXAMPLES

### 5.1 Basic Dropdown Selection

```typescript
import { VisionEngine } from '@/lib/visionEngine';

const engine = new VisionEngine();
await engine.initialize();

// Select "California" from a "State" dropdown
const result = await engine.selectDropdownOption({
  dropdownLabel: 'State',
  optionText: 'California',
  triggerOffsetX: 200,  // Adjust based on form layout
  openDelayMs: 300
});

if (result.success) {
  console.log('Selected California');
} else {
  console.error('Failed:', result.error);
}
```

### 5.2 Native Select Element

```typescript
// For HTML <select> elements
const result = await engine.selectNativeDropdown(
  'Country',
  'United States'
);

// Status breakdown
console.log('Dropdown found:', result.dropdownFound);
console.log('Dropdown opened:', result.dropdownOpened);
console.log('Option found:', result.optionFound);
console.log('Option selected:', result.optionSelected);
```

### 5.3 Autocomplete/Searchable Dropdown

```typescript
// For searchable dropdowns (React Select, MUI Autocomplete, etc.)
const result = await engine.selectAutocompleteOption(
  'Search cities',     // Input label
  'San Fran',          // Search text
  'San Francisco, CA', // Full option text to click
  {
    openDelayMs: 500,  // Wait for API results
    openTimeoutMs: 3000
  }
);
```

### 5.4 Multiple Dropdown Selections

```typescript
// Fill a form with multiple dropdowns
const fields = [
  { label: 'Country', option: 'United States' },
  { label: 'State', option: 'California' },
  { label: 'City', option: 'Los Angeles' }
];

for (const field of fields) {
  const result = await engine.selectDropdownOption({
    dropdownLabel: field.label,
    optionText: field.option,
    triggerOffsetX: 150
  });
  
  if (!result.success) {
    console.error(`Failed to select ${field.option} for ${field.label}`);
    break;
  }
  
  // Small delay between selections
  await new Promise(r => setTimeout(r, 200));
}
```

### 5.5 Integration with Step Execution

```typescript
// In stepExecutors.ts
export async function executeVisionDropdown(
  step: Step,
  context: ExecutionContext
): Promise<StepResult> {
  const { visionEngine, csvData, currentRow } = context;
  
  // Substitute CSV variables
  let optionText = step.visionDropdownOption || '';
  if (csvData && currentRow !== undefined) {
    optionText = substituteVariables(optionText, csvData[currentRow]);
  }
  
  const result = await visionEngine.selectDropdownOption({
    dropdownLabel: step.visionTarget || '',
    optionText,
    triggerOffsetX: step.visionOffsetX || 150,
    triggerOffsetY: step.visionOffsetY || 0,
    openDelayMs: step.dropdownOpenDelayMs || 300,
    openTimeoutMs: step.dropdownTimeoutMs || 2000,
    confidence: step.visionConfidence || 0.6,
    tabId: context.tabId
  });
  
  return {
    success: result.success,
    stepId: step.id,
    action: 'vision_dropdown',
    error: result.error,
    metadata: {
      dropdownOpened: result.dropdownOpened,
      optionSelected: result.optionSelected,
      timing: result.timing
    }
  };
}
```

### 5.6 With CSV Data Substitution

```typescript
// CSV row: { state: "Texas", city: "Austin" }
const csvRow = csvData[currentRowIndex];

await engine.selectDropdownOption({
  dropdownLabel: 'State',
  optionText: csvRow.state,  // "Texas"
  triggerOffsetX: 200
});

await engine.selectDropdownOption({
  dropdownLabel: 'City',
  optionText: csvRow.city,   // "Austin"
  triggerOffsetX: 200
});
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** Locates dropdown by label text via OCR
- [ ] **AC-2:** Clicks to open dropdown menu
- [ ] **AC-3:** Waits appropriate time for dropdown to expand
- [ ] **AC-4:** Finds option text within opened dropdown
- [ ] **AC-5:** Clicks option to select it
- [ ] **AC-6:** Returns detailed status (found, opened, selected)
- [ ] **AC-7:** Handles native HTML `<select>` elements
- [ ] **AC-8:** Handles custom dropdowns (React Select, MUI, etc.)
- [ ] **AC-9:** selectAutocompleteOption() works for searchable dropdowns
- [ ] **AC-10:** Closes dropdown (Escape) if option not found

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Timing sensitivity** - Dropdowns need time to animate open
2. **Option visibility** - May need to scroll within dropdown
3. **Z-index issues** - Dropdown overlays must be on top

### Patterns to Follow

1. **Progressive status** - Track each phase separately
2. **Fallback strategies** - Keyboard nav if click fails
3. **Cleanup on failure** - Close dropdown before returning

### Edge Cases

1. **Already open dropdown** - Should still find option
2. **Duplicate option text** - May click wrong one
3. **Disabled options** - Click may not register
4. **Virtualized lists** - Option may not be in DOM until scrolled
5. **Multi-select dropdowns** - May need different handling
6. **Dropdown off-screen** - May need scroll first

---

## 8. VERIFICATION COMMANDS

```bash
# Verify dropdown methods exist
grep -n "selectDropdownOption\|selectAutocompleteOption" src/lib/visionEngine.ts

# Verify waitForText helper
grep -n "waitForText" src/lib/visionEngine.ts

# Verify type definitions
grep -n "DropdownOptions\|DropdownResult" src/types/vision.types.ts

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

# Revert type definitions
git checkout src/types/vision.types.ts
```

---

## 10. REFERENCES

- ENG-001: VisionEngine Class
- ENG-006: findText() Function
- ENG-008: clickAtCoordinates() Function
- ENG-009: typeText() Function (used by autocomplete)
- Feature Spec: `/future-spec/03_feature-specs.md` Section 3.5

---

*End of Specification ENG-012*
