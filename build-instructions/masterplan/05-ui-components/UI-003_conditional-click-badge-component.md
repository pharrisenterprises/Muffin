# UI-003: Conditional Click Badge Component

> **Build Card:** UI-003  
> **Category:** UI Components  
> **Dependencies:** FND-010, ENG-014  
> **Risk Level:** Low  
> **Estimated Lines:** 200-250

---

## 1. PURPOSE

Implement a reusable `ConditionalClickBadge` React component that visually indicates when a step uses conditional click polling (the `waitAndClickButtons` Vision feature). This badge displays on steps that have a `conditionalConfig` property, helping users identify which steps will actively monitor the screen for specific button texts and click them automatically during playback.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| Step Interface | `src/types/step.types.ts` | conditionalConfig field |
| ENG-014 | `build-instructions/masterplan/03-engine/ENG-014_wait-and-click-buttons.md` | Conditional click config |
| Existing Badges | `src/components/badges/` | Badge styling patterns |
| Tailwind Config | `tailwind.config.js` | Color palette |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/components/badges/ConditionalClickBadge.tsx` | CREATE | ~90 |
| `src/components/badges/index.ts` | MODIFY | +5 |
| `src/components/StepRow.tsx` | MODIFY | +10 |

### Artifacts

- `ConditionalClickBadge` component created
- `ConditionalClickBadgeExpanded` component for details view
- Badge exported from badges index
- Integration with StepRow component

---

## 4. DETAILED SPECIFICATION

### 4.1 ConditionalClickBadge Component

```typescript
// In src/components/badges/ConditionalClickBadge.tsx

import React from 'react';
import { ConditionalClickConfig } from '@/types/step.types';

export interface ConditionalClickBadgeProps {
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  
  /** Whether to show tooltip on hover */
  showTooltip?: boolean;
  
  /** Custom tooltip text */
  tooltipText?: string;
  
  /** Conditional config for expanded details */
  config?: ConditionalClickConfig;
  
  /** Additional CSS classes */
  className?: string;
}

/**
 * Badge indicating a step uses conditional click polling
 * Orange/amber color to indicate active monitoring behavior
 */
export const ConditionalClickBadge: React.FC<ConditionalClickBadgeProps> = ({
  size = 'sm',
  showTooltip = true,
  tooltipText,
  config,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-sm',
    lg: 'px-2.5 py-1.5 text-base'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  // Build tooltip from config if not provided
  const defaultTooltip = config
    ? `Watches for: ${config.buttonTexts.join(', ')}`
    : 'Polls screen and clicks matching buttons';

  return (
    <span
      className={`
        inline-flex items-center gap-1
        ${sizeClasses[size]}
        bg-amber-100 text-amber-800
        dark:bg-amber-900 dark:text-amber-200
        rounded-md font-medium
        border border-amber-200 dark:border-amber-700
        ${className}
      `}
      title={showTooltip ? (tooltipText || defaultTooltip) : undefined}
    >
      {/* Target/crosshair icon for conditional click */}
      <svg
        className={iconSizes[size]}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="3" />
        <line x1="12" y1="2" x2="12" y2="6" />
        <line x1="12" y1="18" x2="12" y2="22" />
        <line x1="2" y1="12" x2="6" y2="12" />
        <line x1="18" y1="12" x2="22" y2="12" />
      </svg>
      <span>Auto-Click</span>
    </span>
  );
};

export default ConditionalClickBadge;
```

### 4.2 Icon-Only Variant

```typescript
export interface ConditionalClickBadgeIconOnlyProps {
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  tooltipText?: string;
  className?: string;
}

/**
 * Icon-only version for compact layouts
 */
export const ConditionalClickBadgeIconOnly: React.FC<ConditionalClickBadgeIconOnlyProps> = ({
  size = 'sm',
  showTooltip = true,
  tooltipText = 'Conditional Auto-Click',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-7 h-7'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <span
      className={`
        inline-flex items-center justify-center
        ${sizeClasses[size]}
        bg-amber-100 text-amber-700
        dark:bg-amber-900 dark:text-amber-300
        rounded-full
        ${className}
      `}
      title={showTooltip ? tooltipText : undefined}
    >
      <svg
        className={iconSizes[size]}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="3" />
        <line x1="12" y1="2" x2="12" y2="6" />
        <line x1="12" y1="18" x2="12" y2="22" />
        <line x1="2" y1="12" x2="6" y2="12" />
        <line x1="18" y1="12" x2="22" y2="12" />
      </svg>
    </span>
  );
};
```

### 4.3 Expanded Details Badge

```typescript
/**
 * Expanded version showing conditional click configuration details
 */
export const ConditionalClickBadgeExpanded: React.FC<{
  config: ConditionalClickConfig;
  className?: string;
}> = ({ config, className = '' }) => {
  const formatTimeout = (ms: number): string => {
    if (ms >= 60000) {
      return `${Math.round(ms / 60000)}m`;
    }
    return `${Math.round(ms / 1000)}s`;
  };

  return (
    <div
      className={`
        inline-flex flex-col gap-1 p-2
        bg-amber-50 dark:bg-amber-900/30
        border border-amber-200 dark:border-amber-700
        rounded-lg text-xs
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-1 text-amber-800 dark:text-amber-200 font-medium">
        <svg
          className="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="3" />
          <line x1="12" y1="2" x2="12" y2="6" />
          <line x1="12" y1="18" x2="12" y2="22" />
          <line x1="2" y1="12" x2="6" y2="12" />
          <line x1="18" y1="12" x2="22" y2="12" />
        </svg>
        <span>Conditional Click</span>
      </div>

      {/* Button texts */}
      <div className="text-gray-600 dark:text-gray-400">
        <span className="font-medium">Watching: </span>
        <span className="text-amber-700 dark:text-amber-300">
          {config.buttonTexts.map((text, i) => (
            <span key={i}>
              {i > 0 && ', '}
              "{text}"
            </span>
          ))}
        </span>
      </div>

      {/* Success text */}
      {config.successText && (
        <div className="text-gray-600 dark:text-gray-400">
          <span className="font-medium">Until: </span>
          <span className="text-green-600 dark:text-green-400">
            "{config.successText}"
          </span>
        </div>
      )}

      {/* Timeout */}
      <div className="text-gray-500 dark:text-gray-500">
        Timeout: {formatTimeout(config.timeoutMs)}
        {config.maxClicks && ` • Max: ${config.maxClicks} clicks`}
      </div>
    </div>
  );
};
```

### 4.4 Badge Index Export

```typescript
// In src/components/badges/index.ts

export { 
  ConditionalClickBadge, 
  ConditionalClickBadgeIconOnly,
  ConditionalClickBadgeExpanded 
} from './ConditionalClickBadge';

export type { 
  ConditionalClickBadgeProps, 
  ConditionalClickBadgeIconOnlyProps 
} from './ConditionalClickBadge';
```

### 4.5 StepRow Integration

```typescript
// In src/components/StepRow.tsx - Add Conditional Click badge display

import { ConditionalClickBadge } from './badges';
import { Step } from '@/types/step.types';

interface StepRowProps {
  step: Step;
  index: number;
  isCompact?: boolean;
  isExpanded?: boolean;
  // ... other props
}

export const StepRow: React.FC<StepRowProps> = ({
  step,
  index,
  isCompact = false,
  isExpanded = false,
  // ... other props
}) => {
  const hasConditionalClick = !!step.conditionalConfig;

  return (
    <div className="step-row flex items-center gap-2 py-2 px-3 border-b">
      {/* Step number */}
      <span className="step-number text-gray-500 w-8">
        {index + 1}
      </span>

      {/* Badges container */}
      <div className="badges-container flex items-center gap-1">
        {/* Other badges... */}
        
        {/* Conditional Click badge */}
        {hasConditionalClick && (
          isCompact
            ? <ConditionalClickBadgeIconOnly size="sm" />
            : <ConditionalClickBadge 
                size="sm" 
                config={step.conditionalConfig}
              />
        )}
      </div>

      {/* Step content */}
      <div className="step-content flex-1">
        <span className="step-label">{step.label || step.action}</span>
        
        {/* Expanded details */}
        {isExpanded && hasConditionalClick && (
          <ConditionalClickBadgeExpanded 
            config={step.conditionalConfig!}
            className="mt-2"
          />
        )}
      </div>
    </div>
  );
};
```

---

## 5. CODE EXAMPLES

### 5.1 Basic Usage

```tsx
import { ConditionalClickBadge } from '@/components/badges';

// Default small badge
<ConditionalClickBadge />

// With config for tooltip
<ConditionalClickBadge 
  config={{
    buttonTexts: ['Allow', 'Keep'],
    successText: 'committed',
    timeoutMs: 120000
  }}
/>

// Medium size
<ConditionalClickBadge size="md" />
```

### 5.2 Icon-Only Badge

```tsx
import { ConditionalClickBadgeIconOnly } from '@/components/badges';

// Compact display
<ConditionalClickBadgeIconOnly size="sm" />
```

### 5.3 Expanded Details View

```tsx
import { ConditionalClickBadgeExpanded } from '@/components/badges';

// Show full configuration
<ConditionalClickBadgeExpanded 
  config={{
    buttonTexts: ['Allow', 'Keep'],
    successText: 'committed',
    timeoutMs: 120000,
    maxClicks: 50
  }}
/>

// Renders:
// [Target Icon] Conditional Click
// Watching: "Allow", "Keep"
// Until: "committed"
// Timeout: 2m • Max: 50 clicks
```

### 5.4 Conditional Rendering

```tsx
// Only show if step has conditional config
{step.conditionalConfig && (
  <ConditionalClickBadge config={step.conditionalConfig} />
)}

// Or check action type
{step.action === 'conditional_click' && (
  <ConditionalClickBadge />
)}
```

### 5.5 In Step List with Expansion

```tsx
const [expandedStep, setExpandedStep] = useState<string | null>(null);

{steps.map((step, index) => (
  <div 
    key={step.id}
    onClick={() => setExpandedStep(step.id === expandedStep ? null : step.id)}
  >
    <div className="flex items-center gap-2">
      <span>{index + 1}</span>
      {step.conditionalConfig && <ConditionalClickBadge size="sm" />}
      <span>{step.label}</span>
    </div>
    
    {expandedStep === step.id && step.conditionalConfig && (
      <ConditionalClickBadgeExpanded config={step.conditionalConfig} />
    )}
  </div>
))}
```

### 5.6 Copilot Workflow Display

```tsx
// Special display for Copilot automation steps
const CopilotStepBadge: React.FC<{ step: Step }> = ({ step }) => {
  if (step.conditionalConfig?.buttonTexts.includes('Allow')) {
    return (
      <div className="flex items-center gap-1">
        <ConditionalClickBadge size="sm" />
        <span className="text-xs text-gray-500">
          (Copilot)
        </span>
      </div>
    );
  }
  return null;
};
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** ConditionalClickBadge renders with target icon and "Auto-Click" text
- [ ] **AC-2:** Supports sm, md, lg size variants
- [ ] **AC-3:** Shows button texts in tooltip when config provided
- [ ] **AC-4:** Amber/orange color scheme indicates active behavior
- [ ] **AC-5:** ConditionalClickBadgeIconOnly shows icon only
- [ ] **AC-6:** ConditionalClickBadgeExpanded shows full config details
- [ ] **AC-7:** Dark mode support works correctly
- [ ] **AC-8:** Exported from badges index
- [ ] **AC-9:** Integrates with StepRow when conditionalConfig present
- [ ] **AC-10:** Formats timeout in human-readable format

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Color scheme** - Amber/orange indicates active/polling behavior
2. **Config display** - Truncate long button text lists
3. **Timeout formatting** - Show minutes for > 60s

### Patterns to Follow

1. **Consistent sizing** - Match other badge sizes
2. **Progressive disclosure** - Basic badge → expanded on click
3. **Meaningful tooltips** - Show what buttons are being watched

### Edge Cases

1. **No config provided** - Show generic tooltip
2. **Many button texts** - Truncate list in tooltip
3. **Very long timeout** - Format as minutes
4. **No success text** - Hide "Until" section in expanded view

---

## 8. VERIFICATION COMMANDS

```bash
# Verify file creation
ls -la src/components/badges/ConditionalClickBadge.tsx

# Verify exports
grep -n "ConditionalClickBadge" src/components/badges/index.ts

# Verify StepRow integration
grep -n "conditionalConfig\|ConditionalClickBadge" src/components/StepRow.tsx

# Run type check
npm run type-check

# Build extension
npm run build
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Remove new file
rm src/components/badges/ConditionalClickBadge.tsx

# Revert index changes
git checkout src/components/badges/index.ts

# Revert StepRow changes
git checkout src/components/StepRow.tsx
```

---

## 10. REFERENCES

- FND-010: Step Interface Extension (conditionalConfig field)
- ENG-014: Wait and Click Buttons
- UI-001: Vision Badge Component (pattern reference)
- Feature Spec: `/future-spec/03_feature-specs.md` Section 2

---

*End of Specification UI-003*
