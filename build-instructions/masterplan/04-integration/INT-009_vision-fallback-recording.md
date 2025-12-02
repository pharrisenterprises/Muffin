# INT-009: Vision Fallback Recording

> **Build Card:** INT-009  
> **Category:** Integration Points  
> **Dependencies:** ENG-001, ENG-006, FND-010  
> **Risk Level:** Medium  
> **Estimated Lines:** 320-380

---

## 1. PURPOSE

Implement the Vision fallback mechanism during recording that automatically captures Vision-based targeting information when DOM selectors fail or are unreliable. This ensures recordings remain playable even when DOM structures change, by storing both selector-based and Vision-based targeting data for each step. The recorder detects problematic selectors in real-time and supplements them with OCR-derived text targets.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| Recording Logic | `src/lib/recorder.ts` | Current recording flow |
| VisionEngine | `src/lib/visionEngine.ts` | OCR text detection |
| Step Interface | `src/types/step.types.ts` | visionTarget, elementText fields |
| Feature Specs | `/future-spec/03_feature-specs.md` | Fallback recording requirements |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/lib/visionFallbackRecorder.ts` | CREATE | ~200 |
| `src/lib/recorder.ts` | MODIFY | +60 |
| `src/types/recording.types.ts` | MODIFY | +15 |

### Artifacts

- `VisionFallbackRecorder` class created
- Integration with main Recorder
- Selector quality assessment
- Automatic visionTarget population

---

## 4. DETAILED SPECIFICATION

### 4.1 Type Definitions

```typescript
// In src/types/recording.types.ts

/**
 * Selector quality assessment result
 */
export interface SelectorQualityAssessment {
  /** Overall quality score (0-1) */
  score: number;
  
  /** Whether selector is considered reliable */
  isReliable: boolean;
  
  /** Issues found with the selector */
  issues: SelectorIssue[];
  
  /** Recommendation for Vision fallback */
  recommendVisionFallback: boolean;
}

/**
 * Types of selector issues
 */
export type SelectorIssue = 
  | 'dynamic-id'           // ID looks auto-generated
  | 'deep-nesting'         // Too many levels deep
  | 'index-based'          // Relies on :nth-child
  | 'class-soup'           // Too many classes
  | 'no-semantic'          // No semantic identifiers
  | 'framework-internal'   // Framework-specific classes
  | 'position-dependent';  // Depends on sibling position

/**
 * Vision fallback data captured during recording
 */
export interface VisionFallbackData {
  /** Text content for Vision targeting */
  visionTarget: string;
  
  /** Alternative text targets */
  alternativeTargets: string[];
  
  /** Element's visible text */
  elementText: string;
  
  /** Nearby label text */
  labelText?: string;
  
  /** Placeholder text (for inputs) */
  placeholder?: string;
  
  /** ARIA label */
  ariaLabel?: string;
  
  /** Confidence that Vision can locate this */
  visionConfidence: number;
  
  /** Screenshot region for reference */
  screenshotRegion?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
```

### 4.2 VisionFallbackRecorder Class

```typescript
// In src/lib/visionFallbackRecorder.ts

import { VisionEngine } from './visionEngine';
import { 
  SelectorQualityAssessment, 
  SelectorIssue,
  VisionFallbackData 
} from '@/types/recording.types';
import { Step } from '@/types/step.types';

/**
 * Patterns indicating dynamic/unreliable IDs
 */
const DYNAMIC_ID_PATTERNS = [
  /^[a-f0-9]{8,}$/i,           // Hex strings
  /^\d+$/,                      // Pure numbers
  /^:r[a-z0-9]+:$/,            // React IDs
  /^ember\d+$/,                // Ember IDs
  /^ng-\d+$/,                  // Angular IDs
  /^vue-\d+$/,                 // Vue IDs
  /^[a-z]+-[a-f0-9-]{36}$/i,   // UUID-based
  /_[a-z0-9]{6,}$/i,           // Trailing hash
  /^js-/,                      // JS-prefixed
  /^data-v-/,                  // Vue scoped
];

/**
 * Framework-internal class patterns
 */
const FRAMEWORK_CLASS_PATTERNS = [
  /^css-[a-z0-9]+$/,           // CSS-in-JS
  /^sc-[a-z]+$/,               // Styled Components
  /^emotion-/,                 // Emotion
  /^MuiButton/,                // MUI
  /^chakra-/,                  // Chakra UI
  /^ant-/,                     // Ant Design
  /^tw-/,                      // Tailwind
  /^_[A-Z]/,                   // CSS Modules
];

/**
 * Handles Vision fallback capture during recording
 */
export class VisionFallbackRecorder {
  private visionEngine: VisionEngine | null = null;
  private isEnabled: boolean = true;
  private captureScreenshots: boolean = false;

  constructor(options: { 
    enabled?: boolean; 
    captureScreenshots?: boolean 
  } = {}) {
    this.isEnabled = options.enabled ?? true;
    this.captureScreenshots = options.captureScreenshots ?? false;
  }

  /**
   * Initializes VisionEngine for fallback recording
   */
  async initialize(): Promise<boolean> {
    if (!this.isEnabled) return false;

    try {
      this.visionEngine = new VisionEngine();
      await this.visionEngine.initialize();
      console.log('[VisionFallbackRecorder] Initialized');
      return true;
    } catch (error) {
      console.warn('[VisionFallbackRecorder] Failed to initialize:', error);
      return false;
    }
  }

  /**
   * Terminates VisionEngine
   */
  async terminate(): Promise<void> {
    if (this.visionEngine) {
      await this.visionEngine.terminate();
      this.visionEngine = null;
    }
  }

  /**
   * Assesses quality of a CSS selector
   */
  assessSelectorQuality(selector: string): SelectorQualityAssessment {
    const issues: SelectorIssue[] = [];
    let score = 1.0;

    // Check for dynamic IDs
    const idMatch = selector.match(/#([a-zA-Z0-9_-]+)/);
    if (idMatch) {
      const id = idMatch[1];
      if (DYNAMIC_ID_PATTERNS.some(pattern => pattern.test(id))) {
        issues.push('dynamic-id');
        score -= 0.3;
      }
    }

    // Check nesting depth
    const nestingDepth = (selector.match(/\s+/g) || []).length;
    if (nestingDepth > 5) {
      issues.push('deep-nesting');
      score -= 0.2;
    }

    // Check for index-based selectors
    if (selector.includes(':nth-child') || selector.includes(':nth-of-type')) {
      issues.push('index-based');
      score -= 0.25;
    }

    // Check for class soup
    const classCount = (selector.match(/\./g) || []).length;
    if (classCount > 4) {
      issues.push('class-soup');
      score -= 0.15;
    }

    // Check for framework-internal classes
    const classes = selector.match(/\.([a-zA-Z0-9_-]+)/g) || [];
    const frameworkClasses = classes.filter(cls => 
      FRAMEWORK_CLASS_PATTERNS.some(pattern => pattern.test(cls.substring(1)))
    );
    if (frameworkClasses.length > 0) {
      issues.push('framework-internal');
      score -= 0.2;
    }

    // Check for semantic identifiers
    const hasSemanticId = /\[(data-testid|data-cy|data-test|aria-label|name)/.test(selector);
    const hasSemanticTag = /^(button|input|select|textarea|a|form)\b/.test(selector);
    if (!hasSemanticId && !hasSemanticTag && !idMatch) {
      issues.push('no-semantic');
      score -= 0.1;
    }

    // Normalize score
    score = Math.max(0, Math.min(1, score));

    return {
      score,
      isReliable: score >= 0.6,
      issues,
      recommendVisionFallback: score < 0.7
    };
  }

  /**
   * Captures Vision fallback data for an element
   */
  async captureVisionFallback(
    element: HTMLElement,
    tabId: number
  ): Promise<VisionFallbackData | null> {
    if (!this.isEnabled) return null;

    try {
      const fallbackData: VisionFallbackData = {
        visionTarget: '',
        alternativeTargets: [],
        elementText: '',
        visionConfidence: 0
      };

      // Get element's text content
      fallbackData.elementText = this.getElementText(element);

      // Get placeholder (for inputs)
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        fallbackData.placeholder = element.placeholder || undefined;
      }

      // Get ARIA label
      fallbackData.ariaLabel = element.getAttribute('aria-label') || undefined;

      // Get associated label text
      fallbackData.labelText = this.getAssociatedLabel(element);

      // Determine best Vision target
      const targets = this.rankVisionTargets(fallbackData);
      if (targets.length > 0) {
        fallbackData.visionTarget = targets[0];
        fallbackData.alternativeTargets = targets.slice(1, 4);
      }

      // Validate with VisionEngine if available
      if (this.visionEngine && fallbackData.visionTarget) {
        const findResult = await this.visionEngine.findText(fallbackData.visionTarget, {
          tabId,
          confidence: 0.5
        });

        fallbackData.visionConfidence = findResult.found 
          ? (findResult.matchedResult?.confidence || 0.7)
          : 0.3;

        // If primary target not found, try alternatives
        if (!findResult.found && fallbackData.alternativeTargets.length > 0) {
          for (const altTarget of fallbackData.alternativeTargets) {
            const altResult = await this.visionEngine.findText(altTarget, {
              tabId,
              confidence: 0.5
            });
            if (altResult.found) {
              // Swap to better target
              fallbackData.alternativeTargets.unshift(fallbackData.visionTarget);
              fallbackData.visionTarget = altTarget;
              fallbackData.visionConfidence = altResult.matchedResult?.confidence || 0.6;
              break;
            }
          }
        }
      }

      // Capture screenshot region if enabled
      if (this.captureScreenshots && this.visionEngine) {
        const rect = element.getBoundingClientRect();
        fallbackData.screenshotRegion = {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        };
      }

      return fallbackData;

    } catch (error) {
      console.warn('[VisionFallbackRecorder] Failed to capture fallback:', error);
      return null;
    }
  }

  /**
   * Gets element's visible text content
   */
  private getElementText(element: HTMLElement): string {
    // For inputs, get value or placeholder
    if (element instanceof HTMLInputElement) {
      if (element.type === 'submit' || element.type === 'button') {
        return element.value || '';
      }
      return element.placeholder || '';
    }

    if (element instanceof HTMLTextAreaElement) {
      return element.placeholder || '';
    }

    // For buttons, get text content
    if (element instanceof HTMLButtonElement) {
      return element.textContent?.trim() || '';
    }

    // For links
    if (element instanceof HTMLAnchorElement) {
      return element.textContent?.trim() || '';
    }

    // Default: text content
    return element.textContent?.trim().substring(0, 100) || '';
  }

  /**
   * Gets associated label text for form elements
   */
  private getAssociatedLabel(element: HTMLElement): string | undefined {
    // Check for explicit label via 'for' attribute
    if (element.id) {
      const label = document.querySelector(`label[for="${element.id}"]`);
      if (label) {
        return label.textContent?.trim();
      }
    }

    // Check for wrapping label
    const parentLabel = element.closest('label');
    if (parentLabel) {
      // Get label text excluding input value
      const clone = parentLabel.cloneNode(true) as HTMLElement;
      const inputs = clone.querySelectorAll('input, select, textarea');
      inputs.forEach(input => input.remove());
      return clone.textContent?.trim();
    }

    // Check for aria-labelledby
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
      const labelElement = document.getElementById(labelledBy);
      if (labelElement) {
        return labelElement.textContent?.trim();
      }
    }

    // Check for preceding sibling text
    const prevSibling = element.previousElementSibling;
    if (prevSibling && prevSibling.tagName === 'LABEL') {
      return prevSibling.textContent?.trim();
    }

    return undefined;
  }

  /**
   * Ranks potential Vision targets by reliability
   */
  private rankVisionTargets(data: VisionFallbackData): string[] {
    const candidates: Array<{ text: string; priority: number }> = [];

    // ARIA label - highest priority
    if (data.ariaLabel && data.ariaLabel.length >= 2) {
      candidates.push({ text: data.ariaLabel, priority: 1 });
    }

    // Associated label
    if (data.labelText && data.labelText.length >= 2) {
      candidates.push({ text: data.labelText, priority: 2 });
    }

    // Placeholder
    if (data.placeholder && data.placeholder.length >= 2) {
      candidates.push({ text: data.placeholder, priority: 3 });
    }

    // Element text
    if (data.elementText && data.elementText.length >= 2) {
      // Penalize very long text
      const priority = data.elementText.length > 30 ? 5 : 4;
      candidates.push({ text: data.elementText, priority });
    }

    // Sort by priority and return texts
    return candidates
      .sort((a, b) => a.priority - b.priority)
      .map(c => c.text)
      .filter((text, index, self) => self.indexOf(text) === index); // Dedupe
  }

  /**
   * Enhances a recorded step with Vision fallback data
   */
  async enhanceStepWithVision(
    step: Step,
    element: HTMLElement,
    tabId: number
  ): Promise<Step> {
    // Assess selector quality
    const assessment = step.selector 
      ? this.assessSelectorQuality(step.selector)
      : { score: 0, isReliable: false, issues: [], recommendVisionFallback: true };

    // Always capture fallback data for redundancy
    const fallbackData = await this.captureVisionFallback(element, tabId);

    if (fallbackData) {
      step.visionTarget = fallbackData.visionTarget;
      step.elementText = fallbackData.elementText;
      step.placeholder = fallbackData.placeholder;
      step.ariaLabel = fallbackData.ariaLabel;
      step.labelText = fallbackData.labelText;
      step.visionConfidence = fallbackData.visionConfidence;

      // Mark as needing Vision if selector is unreliable
      if (assessment.recommendVisionFallback || !assessment.isReliable) {
        step.selectorQuality = assessment.score;
        step.selectorIssues = assessment.issues;
      }
    }

    return step;
  }
}

// Singleton instance
let fallbackRecorderInstance: VisionFallbackRecorder | null = null;

export function getVisionFallbackRecorder(
  options?: { enabled?: boolean; captureScreenshots?: boolean }
): VisionFallbackRecorder {
  if (!fallbackRecorderInstance) {
    fallbackRecorderInstance = new VisionFallbackRecorder(options);
  }
  return fallbackRecorderInstance;
}
```

### 4.3 Recorder Integration

```typescript
// In src/lib/recorder.ts - Add Vision fallback integration

import { getVisionFallbackRecorder, VisionFallbackRecorder } from './visionFallbackRecorder';

export class Recorder {
  private visionFallback: VisionFallbackRecorder;

  constructor(config: RecorderConfig) {
    // ... existing initialization ...
    
    this.visionFallback = getVisionFallbackRecorder({
      enabled: config.enableVisionFallback ?? true,
      captureScreenshots: config.captureScreenshots ?? false
    });
  }

  async startRecording(): Promise<void> {
    // ... existing start logic ...
    
    // Initialize Vision fallback
    await this.visionFallback.initialize();
  }

  async stopRecording(): Promise<Recording> {
    // ... existing stop logic ...
    
    // Terminate Vision fallback
    await this.visionFallback.terminate();
    
    return this.recording;
  }

  /**
   * Records an action with Vision fallback enhancement
   */
  async recordAction(
    action: string,
    element: HTMLElement,
    value?: string
  ): Promise<Step> {
    // Create base step
    const step: Step = {
      id: this.generateStepId(),
      action,
      selector: this.generateSelector(element),
      xpath: this.generateXPath(element),
      value,
      timestamp: Date.now(),
      recordedVia: 'dom'
    };

    // Enhance with Vision fallback data
    const enhancedStep = await this.visionFallback.enhanceStepWithVision(
      step,
      element,
      this.activeTabId
    );

    // Add to recording
    this.recording.steps.push(enhancedStep);

    return enhancedStep;
  }
}
```

---

## 5. CODE EXAMPLES

### 5.1 Assess Selector Quality

```typescript
import { VisionFallbackRecorder } from '@/lib/visionFallbackRecorder';

const recorder = new VisionFallbackRecorder();

// Check a dynamic ID selector
const assessment1 = recorder.assessSelectorQuality('#r4f7g3h2');
console.log(assessment1);
// { score: 0.7, isReliable: true, issues: ['dynamic-id'], recommendVisionFallback: true }

// Check a reliable selector
const assessment2 = recorder.assessSelectorQuality('button[data-testid="submit"]');
console.log(assessment2);
// { score: 1.0, isReliable: true, issues: [], recommendVisionFallback: false }
```

### 5.2 Capture Vision Fallback

```typescript
const fallbackRecorder = getVisionFallbackRecorder();
await fallbackRecorder.initialize();

const element = document.querySelector('#login-button') as HTMLElement;
const fallbackData = await fallbackRecorder.captureVisionFallback(element, tabId);

console.log(fallbackData);
// {
//   visionTarget: 'Log In',
//   alternativeTargets: ['Sign In', 'Login'],
//   elementText: 'Log In',
//   ariaLabel: 'Log in to your account',
//   visionConfidence: 0.85
// }
```

### 5.3 Enhance Step with Vision

```typescript
const step: Step = {
  id: 'step-1',
  action: 'click',
  selector: 'div.css-abc123 > button:nth-child(2)',
  recordedVia: 'dom'
};

const enhancedStep = await fallbackRecorder.enhanceStepWithVision(
  step,
  buttonElement,
  tabId
);

console.log(enhancedStep);
// Now includes: visionTarget, elementText, selectorQuality, selectorIssues
```

### 5.4 Full Recording Flow

```typescript
const recorder = new Recorder({
  enableVisionFallback: true
});

await recorder.startRecording();

// User clicks button
const step = await recorder.recordAction('click', buttonElement);

// Step automatically has Vision fallback data
console.log(step.visionTarget);      // 'Submit'
console.log(step.selectorQuality);   // 0.65
console.log(step.selectorIssues);    // ['dynamic-id', 'framework-internal']

await recorder.stopRecording();
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** Assesses selector quality with score 0-1
- [ ] **AC-2:** Identifies dynamic/auto-generated IDs
- [ ] **AC-3:** Identifies framework-internal classes
- [ ] **AC-4:** Captures element text for Vision targeting
- [ ] **AC-5:** Captures associated label text
- [ ] **AC-6:** Captures placeholder and ARIA label
- [ ] **AC-7:** Validates Vision targets with OCR
- [ ] **AC-8:** Ranks Vision targets by reliability
- [ ] **AC-9:** Enhances steps with Vision fallback data
- [ ] **AC-10:** Integrates with Recorder automatically

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Performance** - OCR validation adds latency during recording
2. **Text availability** - Some elements have no usable text
3. **False positives** - Selector assessment is heuristic

### Patterns to Follow

1. **Defensive capture** - Always capture fallback even for good selectors
2. **Validation** - Use OCR to verify Vision targets
3. **Ranking** - Prefer shorter, more specific text targets

### Edge Cases

1. **Icon-only buttons** - No text, need aria-label
2. **Dynamic text** - Text may change, use label instead
3. **Shadow DOM** - May not find associated labels
4. **Iframes** - Text in different document context
5. **Invisible elements** - May not appear in OCR

---

## 8. VERIFICATION COMMANDS

```bash
# Verify file creation
ls -la src/lib/visionFallbackRecorder.ts

# Verify exports
grep -n "VisionFallbackRecorder\|getVisionFallbackRecorder" src/lib/visionFallbackRecorder.ts

# Verify Recorder integration
grep -n "visionFallback\|enhanceStepWithVision" src/lib/recorder.ts

# Run type check
npm run type-check

# Build extension
npm run build
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Remove new file
rm src/lib/visionFallbackRecorder.ts

# Revert Recorder changes
git checkout src/lib/recorder.ts

# Revert type definitions
git checkout src/types/recording.types.ts
```

---

## 10. REFERENCES

- ENG-001: VisionEngine Class
- ENG-006: findText() Function
- FND-010: Step Interface Extension
- ENG-015: Auto-Detection Failsafe
- Feature Spec: `/future-spec/03_feature-specs.md` Section 4.2

---

*End of Specification INT-009*
