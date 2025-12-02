# FND-008: CONDITIONALCONFIG INTERFACE SPECIFICATION

> **Build Card:** FND-008  
> **Category:** Foundation / Architecture  
> **Dependencies:** FND-004 (Type definitions file must exist)  
> **Risk Level:** Low  
> **Estimated Lines:** ~450

---

## 1. PURPOSE

This specification provides detailed documentation and implementation guidance for the `ConditionalConfig` interface. The ConditionalConfig interface defines the configuration for conditional click operations, which are used to:

1. **Poll for approval buttons** - Continuously scan for "Allow", "Keep", etc.
2. **Handle dynamic content** - Wait for elements that appear asynchronously
3. **Automate approval workflows** - Click buttons as they appear during AI interactions

Conditional clicks are a core feature of Muffin Lite's Vision capabilities, enabling automation of workflows that require waiting for and clicking approval buttons (like those in Claude.ai's computer use feature).

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| Type Definitions | `src/types/vision.ts` | ConditionalConfig interface |
| Data Layer Spec | `/future-spec/05_data-layer.md` | ConditionalConfig definition |
| Feature Specs | `/future-spec/03_feature-specs.md` | Conditional click requirements |
| Build Card Backlog | `BUILD_CARD_BACKLOG.md` | FND-008 details |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `src/types/vision.ts` | VERIFY | ConditionalConfig already defined in FND-004 |
| `src/lib/conditionalConfigUtils.ts` | CREATE | Utility functions for ConditionalConfig |

### Exports from conditionalConfigUtils.ts

| Export Name | Type | Description |
|-------------|------|-------------|
| `createConditionalConfig` | function | Factory with validation |
| `validateConditionalConfig` | function | Validation utility |
| `mergeWithDefaults` | function | Merge config with recording defaults |
| `CONDITIONAL_CONFIG_LIMITS` | const | Min/max value constraints |
| `COMMON_SEARCH_TERMS` | const | Pre-defined search term sets |

---

## 4. DETAILED SPECIFICATION

### 4.1 Interface Definition (Reference)

The ConditionalConfig interface from `src/types/vision.ts`:

```typescript
export interface ConditionalConfig {
  enabled: boolean;
  searchTerms: string[];
  timeoutSeconds: number;
  pollIntervalMs: number;
  interactionType: 'click' | 'type' | 'scroll';
  typeText?: string;
  dropdownOption?: string;
}

export const DEFAULT_CONDITIONAL_CONFIG: ConditionalConfig = {
  enabled: false,
  searchTerms: ['Allow', 'Keep'],
  timeoutSeconds: 120,
  pollIntervalMs: 1000,
  interactionType: 'click',
};
```

### 4.2 Property Specifications

#### 4.2.1 enabled

| Attribute | Value |
|-----------|-------|
| Type | `boolean` |
| Required | Yes |
| Default | `false` |

**Description:**
Whether conditional click behavior is active for this step. When disabled, the step executes as a normal click without polling.

**Behavior:**
- `true`: Vision Engine polls for searchTerms until found or timeout
- `false`: Step behaves as standard click (uses selector/coordinates directly)

**Use Cases:**
- Enable for approval button handling
- Disable for deterministic UI elements

#### 4.2.2 searchTerms

| Attribute | Value |
|-----------|-------|
| Type | `string[]` |
| Required | Yes |
| Minimum Items | 1 |
| Maximum Items | 20 |

**Description:**
Array of text strings to search for on screen. OCR scans the viewport and matches against these terms. Any match triggers the configured interaction.

**Matching Behavior:**
- Case-insensitive by default
- Partial matching (term must be contained in OCR result)
- First match wins (stops scanning for that poll cycle)
- All matches are clicked if multiple found in one scan

**Common Search Terms:**

| Context | Suggested Terms |
|---------|-----------------|
| Claude.ai approvals | `['Allow', 'Keep', 'Allow for this chat']` |
| Generic confirmations | `['OK', 'Confirm', 'Yes', 'Accept']` |
| Form submissions | `['Submit', 'Send', 'Continue']` |
| Cookie banners | `['Accept', 'Accept All', 'Allow']` |

**Best Practices:**
- Use specific terms to avoid false positives
- Order by priority (most important first)
- Include variations ("Allow" and "Allow for this chat")
- Avoid single letters or common words

#### 4.2.3 timeoutSeconds

| Attribute | Value |
|-----------|-------|
| Type | `number` |
| Required | Yes |
| Default | `120` |
| Minimum | `1` |
| Maximum | `3600` (1 hour) |
| Unit | Seconds |

**Description:**
Maximum time to continue polling after the last successful click. The timeout resets each time a match is found and clicked.

**Timeout Behavior:**

```
Timeline Example (timeoutSeconds: 120):

0s    - Start polling
30s   - Found "Allow", clicked, RESET TIMER
45s   - Found "Keep", clicked, RESET TIMER
165s  - No matches for 120s since last click
165s  - TIMEOUT: Stop polling, proceed to next step
```

**Value Guidelines:**

| Value | Use Case |
|-------|----------|
| 30-60 | Quick confirmations, known timing |
| 120 | **Default** - Most approval workflows |
| 300 | Long AI processing (5 minutes) |
| 600+ | Extended operations, manual intervention possible |

#### 4.2.4 pollIntervalMs

| Attribute | Value |
|-----------|-------|
| Type | `number` |
| Required | Yes |
| Default | `1000` |
| Minimum | `250` |
| Maximum | `10000` |
| Unit | Milliseconds |

**Description:**
Time between OCR scans during polling. Controls responsiveness vs CPU usage tradeoff.

**Performance Impact:**

| Interval | OCR Scans/Min | CPU Usage | Responsiveness |
|----------|---------------|-----------|----------------|
| 250ms | 240 | High | Very fast |
| 500ms | 120 | Medium | Fast |
| 1000ms | 60 | Low | **Balanced** |
| 2000ms | 30 | Very Low | Slow |

**Recommendation:**
Use 1000ms (1 second) for most cases. Approval buttons typically appear and remain visible for several seconds, so sub-second scanning is unnecessary.

#### 4.2.5 interactionType

| Attribute | Value |
|-----------|-------|
| Type | `'click' \| 'type' \| 'scroll'` |
| Required | Yes |
| Default | `'click'` |

**Description:**
The type of interaction to perform when a match is found.

**Interaction Types:**

| Type | Behavior | Use Case |
|------|----------|----------|
| `click` | Click at center of matched text | **Default** - Buttons, links |
| `type` | Click then type `typeText` | Input fields with labels |
| `scroll` | Scroll to bring match into view | Navigation, lazy loading |

#### 4.2.6 typeText (Optional)

| Attribute | Value |
|-----------|-------|
| Type | `string` |
| Required | Only when `interactionType: 'type'` |

**Description:**
Text to type after clicking the matched element. Used for filling input fields identified by their label text.

**Example:**
```typescript
{
  enabled: true,
  searchTerms: ['Username:', 'Email:'],
  interactionType: 'type',
  typeText: 'user@example.com',
  // ... other config
}
```

#### 4.2.7 dropdownOption (Optional)

| Attribute | Value |
|-----------|-------|
| Type | `string` |
| Required | Only for dropdown event type |

**Description:**
For dropdown/select interactions, the option text to select after opening the dropdown.

**Workflow:**
1. Find and click the dropdown trigger (searchTerms)
2. Wait for dropdown options to appear
3. Find and click the dropdownOption text

---

### 4.3 Utility Functions

Create `src/lib/conditionalConfigUtils.ts`:

```typescript
/**
 * @fileoverview Utility functions for ConditionalConfig operations
 * @module lib/conditionalConfigUtils
 */

import { ConditionalConfig, DEFAULT_CONDITIONAL_CONFIG } from '@/types';

/**
 * Configuration value limits for validation
 */
export const CONDITIONAL_CONFIG_LIMITS = {
  searchTerms: { minItems: 1, maxItems: 20, maxLength: 100 },
  timeoutSeconds: { min: 1, max: 3600 },
  pollIntervalMs: { min: 250, max: 10000 },
} as const;

/**
 * Common search term presets for different scenarios
 */
export const COMMON_SEARCH_TERMS = {
  /** Claude.ai approval buttons */
  claudeApprovals: ['Allow', 'Keep', 'Allow for this chat', 'Allow once'],
  
  /** Generic confirmation dialogs */
  confirmations: ['OK', 'Confirm', 'Yes', 'Accept', 'Continue'],
  
  /** Form submission buttons */
  submissions: ['Submit', 'Send', 'Save', 'Next', 'Finish'],
  
  /** Cookie consent banners */
  cookieConsent: ['Accept', 'Accept All', 'Accept Cookies', 'Allow All'],
  
  /** Dismissal buttons */
  dismissals: ['Close', 'Cancel', 'Dismiss', 'Skip', 'Not Now'],
} as const;

/**
 * Validation error for configuration
 */
export interface ConditionalConfigValidationError {
  property: keyof ConditionalConfig | 'searchTerms[]';
  message: string;
  value: unknown;
}

/**
 * Validation result
 */
export interface ConditionalConfigValidationResult {
  valid: boolean;
  errors: ConditionalConfigValidationError[];
}

/**
 * Validates a ConditionalConfig object
 * @param config - Configuration to validate
 * @returns Validation result with any errors
 */
export function validateConditionalConfig(
  config: Partial<ConditionalConfig>
): ConditionalConfigValidationResult {
  const errors: ConditionalConfigValidationError[] = [];

  // Validate enabled
  if (config.enabled !== undefined && typeof config.enabled !== 'boolean') {
    errors.push({
      property: 'enabled',
      message: 'Must be a boolean',
      value: config.enabled,
    });
  }

  // Validate searchTerms
  if (config.searchTerms !== undefined) {
    if (!Array.isArray(config.searchTerms)) {
      errors.push({
        property: 'searchTerms',
        message: 'Must be an array',
        value: config.searchTerms,
      });
    } else {
      const { minItems, maxItems, maxLength } = CONDITIONAL_CONFIG_LIMITS.searchTerms;
      
      if (config.searchTerms.length < minItems) {
        errors.push({
          property: 'searchTerms',
          message: `Must have at least ${minItems} item(s)`,
          value: config.searchTerms.length,
        });
      }
      
      if (config.searchTerms.length > maxItems) {
        errors.push({
          property: 'searchTerms',
          message: `Cannot exceed ${maxItems} items`,
          value: config.searchTerms.length,
        });
      }

      // Validate individual terms
      config.searchTerms.forEach((term, index) => {
        if (typeof term !== 'string') {
          errors.push({
            property: 'searchTerms[]',
            message: `Item at index ${index} must be a string`,
            value: term,
          });
        } else if (term.trim().length === 0) {
          errors.push({
            property: 'searchTerms[]',
            message: `Item at index ${index} cannot be empty`,
            value: term,
          });
        } else if (term.length > maxLength) {
          errors.push({
            property: 'searchTerms[]',
            message: `Item at index ${index} exceeds max length of ${maxLength}`,
            value: term.length,
          });
        }
      });
    }
  }

  // Validate timeoutSeconds
  if (config.timeoutSeconds !== undefined) {
    const { min, max } = CONDITIONAL_CONFIG_LIMITS.timeoutSeconds;
    if (typeof config.timeoutSeconds !== 'number' || isNaN(config.timeoutSeconds)) {
      errors.push({
        property: 'timeoutSeconds',
        message: 'Must be a number',
        value: config.timeoutSeconds,
      });
    } else if (config.timeoutSeconds < min || config.timeoutSeconds > max) {
      errors.push({
        property: 'timeoutSeconds',
        message: `Must be between ${min} and ${max} seconds`,
        value: config.timeoutSeconds,
      });
    }
  }

  // Validate pollIntervalMs
  if (config.pollIntervalMs !== undefined) {
    const { min, max } = CONDITIONAL_CONFIG_LIMITS.pollIntervalMs;
    if (typeof config.pollIntervalMs !== 'number' || isNaN(config.pollIntervalMs)) {
      errors.push({
        property: 'pollIntervalMs',
        message: 'Must be a number',
        value: config.pollIntervalMs,
      });
    } else if (config.pollIntervalMs < min || config.pollIntervalMs > max) {
      errors.push({
        property: 'pollIntervalMs',
        message: `Must be between ${min}ms and ${max}ms`,
        value: config.pollIntervalMs,
      });
    }
  }

  // Validate interactionType
  if (config.interactionType !== undefined) {
    const validTypes = ['click', 'type', 'scroll'];
    if (!validTypes.includes(config.interactionType)) {
      errors.push({
        property: 'interactionType',
        message: `Must be one of: ${validTypes.join(', ')}`,
        value: config.interactionType,
      });
    }
  }

  // Validate typeText (required if interactionType is 'type')
  if (config.interactionType === 'type' && !config.typeText) {
    errors.push({
      property: 'typeText',
      message: 'Required when interactionType is "type"',
      value: config.typeText,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Creates a validated ConditionalConfig with defaults for missing values
 * @param overrides - Partial configuration to merge with defaults
 * @returns Complete, validated configuration
 * @throws Error if validation fails
 */
export function createConditionalConfig(
  overrides: Partial<ConditionalConfig> = {}
): ConditionalConfig {
  const merged = {
    ...DEFAULT_CONDITIONAL_CONFIG,
    ...overrides,
  };

  const validation = validateConditionalConfig(merged);

  if (!validation.valid) {
    const errorMessages = validation.errors
      .map((e) => `${e.property}: ${e.message}`)
      .join('; ');
    throw new Error(`Invalid ConditionalConfig: ${errorMessages}`);
  }

  return merged;
}

/**
 * Merges step-level config with recording-level defaults
 * Step values take precedence over recording defaults
 * @param stepConfig - Step-level configuration (may be partial)
 * @param recordingDefaults - Recording-level default values
 * @returns Merged configuration
 */
export function mergeWithDefaults(
  stepConfig: Partial<ConditionalConfig> | undefined,
  recordingDefaults: { searchTerms: string[]; timeoutSeconds: number }
): ConditionalConfig {
  return createConditionalConfig({
    enabled: stepConfig?.enabled ?? false,
    searchTerms: stepConfig?.searchTerms ?? recordingDefaults.searchTerms,
    timeoutSeconds: stepConfig?.timeoutSeconds ?? recordingDefaults.timeoutSeconds,
    pollIntervalMs: stepConfig?.pollIntervalMs ?? DEFAULT_CONDITIONAL_CONFIG.pollIntervalMs,
    interactionType: stepConfig?.interactionType ?? DEFAULT_CONDITIONAL_CONFIG.interactionType,
    typeText: stepConfig?.typeText,
    dropdownOption: stepConfig?.dropdownOption,
  });
}

/**
 * Checks if a ConditionalConfig is effectively enabled and valid
 * @param config - Configuration to check
 * @returns True if enabled and has valid search terms
 */
export function isActiveConditionalConfig(
  config: ConditionalConfig | undefined
): config is ConditionalConfig {
  return (
    config !== undefined &&
    config.enabled === true &&
    config.searchTerms.length > 0 &&
    config.timeoutSeconds > 0
  );
}

/**
 * Estimates the maximum number of OCR scans for a configuration
 * @param config - Configuration to analyze
 * @returns Maximum number of scans before timeout
 */
export function estimateMaxScans(config: ConditionalConfig): number {
  const timeoutMs = config.timeoutSeconds * 1000;
  return Math.ceil(timeoutMs / config.pollIntervalMs);
}

/**
 * Creates a configuration for Claude.ai approval handling
 * @param timeoutSeconds - Custom timeout (default: 120)
 * @returns Pre-configured ConditionalConfig
 */
export function createClaudeApprovalConfig(
  timeoutSeconds: number = 120
): ConditionalConfig {
  return createConditionalConfig({
    enabled: true,
    searchTerms: [...COMMON_SEARCH_TERMS.claudeApprovals],
    timeoutSeconds,
    pollIntervalMs: 1000,
    interactionType: 'click',
  });
}

/**
 * Converts configuration to a human-readable summary
 * @param config - Configuration to summarize
 * @returns Human-readable string
 */
export function configToString(config: ConditionalConfig): string {
  if (!config.enabled) {
    return 'Conditional: Disabled';
  }

  const terms = config.searchTerms.slice(0, 3).join(', ');
  const suffix = config.searchTerms.length > 3 
    ? ` +${config.searchTerms.length - 3} more` 
    : '';
  
  return `Conditional: "${terms}${suffix}" (${config.timeoutSeconds}s timeout)`;
}
```

---

## 5. CODE EXAMPLES

### 5.1 Basic Usage

```typescript
import { 
  createConditionalConfig, 
  COMMON_SEARCH_TERMS 
} from '@/lib/conditionalConfigUtils';

// Create with defaults
const config1 = createConditionalConfig({ enabled: true });
console.log(config1.searchTerms); // ['Allow', 'Keep']

// Create with custom terms
const config2 = createConditionalConfig({
  enabled: true,
  searchTerms: COMMON_SEARCH_TERMS.claudeApprovals,
  timeoutSeconds: 300,
});
```

### 5.2 Validation

```typescript
import { validateConditionalConfig } from '@/lib/conditionalConfigUtils';

// Valid config
const result1 = validateConditionalConfig({
  enabled: true,
  searchTerms: ['Allow'],
});
console.log(result1.valid); // true

// Invalid config
const result2 = validateConditionalConfig({
  enabled: true,
  searchTerms: [], // Empty!
  timeoutSeconds: -5, // Negative!
});
console.log(result2.valid); // false
console.log(result2.errors); // Array of errors
```

### 5.3 Merging with Recording Defaults

```typescript
import { mergeWithDefaults } from '@/lib/conditionalConfigUtils';

const recordingDefaults = {
  searchTerms: ['Allow', 'Keep', 'Continue'],
  timeoutSeconds: 180,
};

// Step with partial override
const stepConfig = { enabled: true, timeoutSeconds: 60 };

const merged = mergeWithDefaults(stepConfig, recordingDefaults);
console.log(merged.searchTerms); // ['Allow', 'Keep', 'Continue'] (from recording)
console.log(merged.timeoutSeconds); // 60 (from step)
```

### 5.4 Pre-built Claude Configuration

```typescript
import { createClaudeApprovalConfig } from '@/lib/conditionalConfigUtils';

// Quick setup for Claude.ai approvals
const claudeConfig = createClaudeApprovalConfig(300); // 5 minute timeout
console.log(claudeConfig.searchTerms); 
// ['Allow', 'Keep', 'Allow for this chat', 'Allow once']
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** ConditionalConfig interface exists in `src/types/vision.ts`
- [ ] **AC-2:** DEFAULT_CONDITIONAL_CONFIG constant is exported
- [ ] **AC-3:** `src/lib/conditionalConfigUtils.ts` is created with all utilities
- [ ] **AC-4:** `createConditionalConfig()` returns valid config with defaults
- [ ] **AC-5:** `validateConditionalConfig()` catches all invalid inputs
- [ ] **AC-6:** `mergeWithDefaults()` correctly prioritizes step over recording
- [ ] **AC-7:** COMMON_SEARCH_TERMS provides useful presets
- [ ] **AC-8:** CONDITIONAL_CONFIG_LIMITS defines all constraints
- [ ] **AC-9:** All functions have complete JSDoc documentation
- [ ] **AC-10:** TypeScript compiles without errors

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **At least one search term** - Empty searchTerms array is invalid
2. **Positive timeout** - Must be at least 1 second
3. **Reasonable poll interval** - Between 250ms and 10s

### Patterns to Follow

1. **Factory with validation** - Use createConditionalConfig for instantiation
2. **Preset configurations** - Provide common scenarios as presets
3. **Merge hierarchy** - Step config > Recording defaults > Global defaults

### Edge Cases

1. **Empty search terms** - Validation error
2. **Very long terms** - Limit to 100 characters each
3. **type without typeText** - Validation error

---

## 8. VERIFICATION COMMANDS

```bash
# Verify file exists
ls -la src/lib/conditionalConfigUtils.ts

# Run type check
npm run type-check

# Test createConditionalConfig
npx ts-node -e "
  const { createConditionalConfig, configToString } = require('./src/lib/conditionalConfigUtils');
  const c = createConditionalConfig({ enabled: true });
  console.log(configToString(c));
"
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Remove the utilities file
rm src/lib/conditionalConfigUtils.ts

# Verify types still compile
npm run type-check
```

---

## 10. REFERENCES

- FND-004: Type Definitions File
- Feature Specs: `/future-spec/03_feature-specs.md`
- Data Layer Spec: `/future-spec/05_data-layer.md`

---

*End of Specification FND-008*
