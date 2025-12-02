# FND-005: VISIONCONFIG INTERFACE SPECIFICATION

> **Build Card:** FND-005  
> **Category:** Foundation / Architecture  
> **Dependencies:** FND-004 (Type definitions file must exist)  
> **Risk Level:** Low  
> **Estimated Lines:** ~420

---

## 1. PURPOSE

This specification provides detailed documentation and implementation guidance for the `VisionConfig` interface. While the interface is defined in FND-004, this specification elaborates on:

1. **Property semantics** - Exact meaning and valid ranges for each property
2. **Default value rationale** - Why each default was chosen
3. **Usage patterns** - How to use configuration in different scenarios
4. **Validation rules** - How to validate configuration objects
5. **Runtime configuration** - How to modify configuration at runtime

The VisionConfig interface controls the behavior of the Vision Engine's OCR operations, including confidence thresholds, polling intervals, and retry behavior.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| Type Definitions | `src/types/vision.ts` | VisionConfig interface |
| Data Layer Spec | `/future-spec/05_data-layer.md` | Configuration requirements |
| Feature Specs | `/future-spec/03_feature-specs.md` | User-facing config options |
| Architecture Spec | `/future-spec/04_architecture.md` | VisionEngine class usage |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `src/types/vision.ts` | VERIFY | VisionConfig already defined in FND-004 |
| `src/lib/visionConfig.ts` | CREATE | Configuration utilities and validation |

### Exports from visionConfig.ts

| Export Name | Type | Description |
|-------------|------|-------------|
| `createVisionConfig` | function | Factory with validation |
| `validateVisionConfig` | function | Validation utility |
| `mergeVisionConfig` | function | Safe config merging |
| `VISION_CONFIG_LIMITS` | const | Min/max value constraints |

---

## 4. DETAILED SPECIFICATION

### 4.1 Interface Definition (Reference)

The VisionConfig interface from `src/types/vision.ts`:

```typescript
export interface VisionConfig {
  confidenceThreshold: number;
  pollIntervalMs: number;
  scrollRetries: number;
  useSIMD?: boolean;
  language?: string;
}

export const DEFAULT_VISION_CONFIG: VisionConfig = {
  confidenceThreshold: 60,
  pollIntervalMs: 1000,
  scrollRetries: 3,
  useSIMD: true,
  language: 'eng',
};
```

### 4.2 Property Specifications

#### 4.2.1 confidenceThreshold

| Attribute | Value |
|-----------|-------|
| Type | `number` |
| Required | Yes |
| Default | `60` |
| Minimum | `0` |
| Maximum | `100` |
| Unit | Percentage |

**Description:**
The minimum OCR confidence score required to consider a text match valid. Tesseract.js returns a confidence value (0-100) for each recognized word. This threshold filters out low-confidence matches.

**Value Guidelines:**

| Range | Behavior | Use Case |
|-------|----------|----------|
| 0-30 | Very permissive | Debugging, capturing all text |
| 31-50 | Permissive | Poor quality images, handwriting |
| 51-70 | Balanced | **Recommended for most uses** |
| 71-85 | Strict | High-quality screenshots |
| 86-100 | Very strict | Only perfect matches |

**Example Impact:**

```
OCR Result: "Allow" with confidence 72

confidenceThreshold: 60 → MATCH (72 >= 60)
confidenceThreshold: 75 → NO MATCH (72 < 75)
```

**Rationale for Default (60):**
- Balances accuracy with coverage
- Works well with typical web page screenshots
- Accounts for font variations and anti-aliasing
- Tested against common UI text patterns

#### 4.2.2 pollIntervalMs

| Attribute | Value |
|-----------|-------|
| Type | `number` |
| Required | Yes |
| Default | `1000` |
| Minimum | `100` |
| Maximum | `30000` |
| Unit | Milliseconds |

**Description:**
Time between consecutive OCR scans during polling operations (conditional clicks, element searching). Lower values increase responsiveness but consume more CPU.

**Value Guidelines:**

| Value | Behavior | Use Case |
|-------|----------|----------|
| 100-250 | Very fast | Real-time tracking |
| 251-500 | Fast | Responsive UIs |
| 501-1000 | Balanced | **Recommended** |
| 1001-2000 | Conservative | Background tasks |
| 2001-5000 | Slow | Long-running waits |

**Performance Impact:**

```
pollIntervalMs: 500 with 120s timeout
= 240 OCR scans maximum
= Higher CPU usage

pollIntervalMs: 2000 with 120s timeout
= 60 OCR scans maximum
= Lower CPU usage
```

**Rationale for Default (1000):**
- One scan per second is responsive enough for approval buttons
- Minimal CPU impact during long polling sessions
- Matches typical human reaction time expectations

#### 4.2.3 scrollRetries

| Attribute | Value |
|-----------|-------|
| Type | `number` |
| Required | Yes |
| Default | `3` |
| Minimum | `0` |
| Maximum | `10` |
| Unit | Count |

**Description:**
Number of scroll attempts when searching for text not visible in the current viewport. Each retry scrolls the page and performs a new OCR scan.

**Scroll Behavior:**

```
Scroll Sequence:
1. Scan current viewport
2. If not found, scroll down ~80% of viewport height
3. Scan again
4. Repeat up to scrollRetries times
5. After all retries, optionally scroll back to top
```

**Value Guidelines:**

| Value | Behavior | Use Case |
|-------|----------|----------|
| 0 | No scrolling | Fixed viewport elements |
| 1-2 | Minimal | Short pages |
| 3-5 | Standard | **Recommended** |
| 6-10 | Extensive | Very long pages |

**Rationale for Default (3):**
- Covers typical "below the fold" content
- Approximately 3 viewport heights of content
- Prevents infinite scrolling on infinitely-scrolling pages

#### 4.2.4 useSIMD (Optional)

| Attribute | Value |
|-----------|-------|
| Type | `boolean` |
| Required | No |
| Default | `true` |

**Description:**
Whether to use SIMD (Single Instruction, Multiple Data) optimized WASM binary if available. SIMD provides significant performance improvements on supported browsers.

**Browser Support:**
- Chrome 91+ ✓
- Firefox 89+ ✓
- Safari 16.4+ ✓
- Edge 91+ ✓

**Performance Impact:**
- SIMD enabled: ~2-3x faster OCR processing
- SIMD disabled: Standard performance (fallback)

**When to Disable:**
- Testing non-SIMD fallback behavior
- Debugging WASM issues
- Older browser support required

#### 4.2.5 language (Optional)

| Attribute | Value |
|-----------|-------|
| Type | `string` |
| Required | No |
| Default | `'eng'` |

**Description:**
Tesseract language code for OCR recognition. Determines which trained data file to load.

**Available Languages:**

| Code | Language | File Size |
|------|----------|-----------|
| `eng` | English | ~1MB |
| `spa` | Spanish | ~1MB |
| `fra` | French | ~1MB |
| `deu` | German | ~1MB |
| `chi_sim` | Chinese (Simplified) | ~2MB |
| `jpn` | Japanese | ~2MB |

**Note:** Additional languages require downloading corresponding `.traineddata` files.

---

### 4.3 Configuration Utilities

Create `src/lib/visionConfig.ts`:

```typescript
/**
 * @fileoverview Vision configuration utilities
 * @module lib/visionConfig
 */

import { VisionConfig, DEFAULT_VISION_CONFIG } from '@/types';

/**
 * Configuration value limits for validation
 */
export const VISION_CONFIG_LIMITS = {
  confidenceThreshold: { min: 0, max: 100 },
  pollIntervalMs: { min: 100, max: 30000 },
  scrollRetries: { min: 0, max: 10 },
} as const;

/**
 * Validation error for configuration
 */
export interface ConfigValidationError {
  property: keyof VisionConfig;
  message: string;
  value: unknown;
}

/**
 * Validation result
 */
export interface ConfigValidationResult {
  valid: boolean;
  errors: ConfigValidationError[];
}

/**
 * Validates a VisionConfig object
 * @param config - Configuration to validate
 * @returns Validation result with any errors
 */
export function validateVisionConfig(
  config: Partial<VisionConfig>
): ConfigValidationResult {
  const errors: ConfigValidationError[] = [];

  // Validate confidenceThreshold
  if (config.confidenceThreshold !== undefined) {
    const { min, max } = VISION_CONFIG_LIMITS.confidenceThreshold;
    if (
      typeof config.confidenceThreshold !== 'number' ||
      isNaN(config.confidenceThreshold)
    ) {
      errors.push({
        property: 'confidenceThreshold',
        message: 'Must be a number',
        value: config.confidenceThreshold,
      });
    } else if (config.confidenceThreshold < min || config.confidenceThreshold > max) {
      errors.push({
        property: 'confidenceThreshold',
        message: `Must be between ${min} and ${max}`,
        value: config.confidenceThreshold,
      });
    }
  }

  // Validate pollIntervalMs
  if (config.pollIntervalMs !== undefined) {
    const { min, max } = VISION_CONFIG_LIMITS.pollIntervalMs;
    if (
      typeof config.pollIntervalMs !== 'number' ||
      isNaN(config.pollIntervalMs)
    ) {
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

  // Validate scrollRetries
  if (config.scrollRetries !== undefined) {
    const { min, max } = VISION_CONFIG_LIMITS.scrollRetries;
    if (
      typeof config.scrollRetries !== 'number' ||
      !Number.isInteger(config.scrollRetries)
    ) {
      errors.push({
        property: 'scrollRetries',
        message: 'Must be an integer',
        value: config.scrollRetries,
      });
    } else if (config.scrollRetries < min || config.scrollRetries > max) {
      errors.push({
        property: 'scrollRetries',
        message: `Must be between ${min} and ${max}`,
        value: config.scrollRetries,
      });
    }
  }

  // Validate useSIMD
  if (config.useSIMD !== undefined && typeof config.useSIMD !== 'boolean') {
    errors.push({
      property: 'useSIMD',
      message: 'Must be a boolean',
      value: config.useSIMD,
    });
  }

  // Validate language
  if (config.language !== undefined) {
    if (typeof config.language !== 'string') {
      errors.push({
        property: 'language',
        message: 'Must be a string',
        value: config.language,
      });
    } else if (config.language.length === 0) {
      errors.push({
        property: 'language',
        message: 'Cannot be empty',
        value: config.language,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Creates a validated VisionConfig with defaults for missing values
 * @param overrides - Partial configuration to merge with defaults
 * @returns Complete, validated configuration
 * @throws Error if validation fails
 */
export function createVisionConfig(
  overrides: Partial<VisionConfig> = {}
): VisionConfig {
  const validation = validateVisionConfig(overrides);

  if (!validation.valid) {
    const errorMessages = validation.errors
      .map((e) => `${e.property}: ${e.message} (got ${JSON.stringify(e.value)})`)
      .join('; ');
    throw new Error(`Invalid VisionConfig: ${errorMessages}`);
  }

  return {
    ...DEFAULT_VISION_CONFIG,
    ...overrides,
  };
}

/**
 * Merges configuration updates with existing config
 * Validates the result before returning
 * @param current - Current configuration
 * @param updates - Updates to apply
 * @returns Merged configuration
 * @throws Error if merged result is invalid
 */
export function mergeVisionConfig(
  current: VisionConfig,
  updates: Partial<VisionConfig>
): VisionConfig {
  const merged = { ...current, ...updates };
  const validation = validateVisionConfig(merged);

  if (!validation.valid) {
    const errorMessages = validation.errors
      .map((e) => `${e.property}: ${e.message}`)
      .join('; ');
    throw new Error(`Invalid merged config: ${errorMessages}`);
  }

  return merged;
}

/**
 * Clamps a confidence threshold to valid range
 * @param value - Value to clamp
 * @returns Clamped value
 */
export function clampConfidenceThreshold(value: number): number {
  const { min, max } = VISION_CONFIG_LIMITS.confidenceThreshold;
  return Math.max(min, Math.min(max, value));
}

/**
 * Clamps a poll interval to valid range
 * @param value - Value to clamp
 * @returns Clamped value
 */
export function clampPollInterval(value: number): number {
  const { min, max } = VISION_CONFIG_LIMITS.pollIntervalMs;
  return Math.max(min, Math.min(max, value));
}

/**
 * Preset configurations for common scenarios
 */
export const VISION_CONFIG_PRESETS = {
  /**
   * Fast, responsive scanning for interactive UIs
   */
  fast: createVisionConfig({
    confidenceThreshold: 50,
    pollIntervalMs: 250,
    scrollRetries: 2,
  }),

  /**
   * Balanced settings for general use
   */
  balanced: createVisionConfig({
    confidenceThreshold: 60,
    pollIntervalMs: 1000,
    scrollRetries: 3,
  }),

  /**
   * Conservative settings for long-running tasks
   */
  conservative: createVisionConfig({
    confidenceThreshold: 70,
    pollIntervalMs: 2000,
    scrollRetries: 5,
  }),

  /**
   * High accuracy settings for precise matching
   */
  precise: createVisionConfig({
    confidenceThreshold: 80,
    pollIntervalMs: 500,
    scrollRetries: 3,
  }),
} as const;
```

---

## 5. CODE EXAMPLES

### 5.1 Basic Usage

```typescript
import { createVisionConfig, DEFAULT_VISION_CONFIG } from '@/lib/visionConfig';

// Use defaults
const config1 = createVisionConfig();
console.log(config1.confidenceThreshold); // 60

// Override specific values
const config2 = createVisionConfig({
  confidenceThreshold: 75,
  pollIntervalMs: 500,
});
console.log(config2.confidenceThreshold); // 75
console.log(config2.scrollRetries); // 3 (default)
```

### 5.2 Validation

```typescript
import { validateVisionConfig } from '@/lib/visionConfig';

// Valid config
const result1 = validateVisionConfig({
  confidenceThreshold: 70,
});
console.log(result1.valid); // true

// Invalid config
const result2 = validateVisionConfig({
  confidenceThreshold: 150, // Out of range
  pollIntervalMs: -100,     // Negative
});
console.log(result2.valid); // false
console.log(result2.errors); // Array of errors
```

### 5.3 Using Presets

```typescript
import { VISION_CONFIG_PRESETS } from '@/lib/visionConfig';

// Use preset for fast UI interaction
const visionEngine = new VisionEngine(VISION_CONFIG_PRESETS.fast);

// Use preset for background processing
const backgroundEngine = new VisionEngine(VISION_CONFIG_PRESETS.conservative);
```

### 5.4 Runtime Configuration Updates

```typescript
import { mergeVisionConfig } from '@/lib/visionConfig';

class VisionEngine {
  private config: VisionConfig;

  updateConfig(updates: Partial<VisionConfig>): void {
    // Safely merge with validation
    this.config = mergeVisionConfig(this.config, updates);
  }
}
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** VisionConfig interface exists in `src/types/vision.ts`
- [ ] **AC-2:** DEFAULT_VISION_CONFIG constant is exported
- [ ] **AC-3:** `src/lib/visionConfig.ts` is created with all utilities
- [ ] **AC-4:** `createVisionConfig()` returns valid config with defaults
- [ ] **AC-5:** `validateVisionConfig()` catches invalid values
- [ ] **AC-6:** `mergeVisionConfig()` safely merges configurations
- [ ] **AC-7:** VISION_CONFIG_LIMITS defines min/max for all numeric props
- [ ] **AC-8:** VISION_CONFIG_PRESETS provides common configurations
- [ ] **AC-9:** All functions have complete JSDoc documentation
- [ ] **AC-10:** TypeScript compiles without errors

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Immutable defaults** - DEFAULT_VISION_CONFIG should never be mutated
2. **Validation required** - All config creation must validate inputs
3. **Type safety** - Use strict types, avoid `any`

### Patterns to Follow

1. **Factory pattern** - Use `createVisionConfig()` for instantiation
2. **Fail fast** - Throw on invalid config rather than silently correcting
3. **Presets for common cases** - Provide tested preset configurations

### Edge Cases

1. **Partial updates** - Only specified properties should be updated
2. **Boundary values** - Test min/max boundary conditions
3. **Type coercion** - Reject string numbers ("60" vs 60)

---

## 8. VERIFICATION COMMANDS

```bash
# Verify file exists
ls -la src/lib/visionConfig.ts

# Run type check
npm run type-check

# Run tests (if available)
npm run test -- --grep "visionConfig"

# Verify exports
npx ts-node -e "
  const vc = require('./src/lib/visionConfig');
  console.log('createVisionConfig:', typeof vc.createVisionConfig);
  console.log('validateVisionConfig:', typeof vc.validateVisionConfig);
  console.log('VISION_CONFIG_PRESETS:', Object.keys(vc.VISION_CONFIG_PRESETS));
"
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Remove the config utilities file
rm src/lib/visionConfig.ts

# Verify types still compile
npm run type-check
```

---

## 10. REFERENCES

- [Tesseract.js Configuration](https://github.com/naptha/tesseract.js#tesseract-parameters)
- FND-004: Type Definitions File
- Data Layer Spec: `/future-spec/05_data-layer.md`

---

*End of Specification FND-005*
