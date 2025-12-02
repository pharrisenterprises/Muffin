# UI-001: Vision Badge Component

> **Build Card:** UI-001  
> **Category:** UI Components  
> **Dependencies:** FND-010, FND-004  
> **Risk Level:** Low  
> **Estimated Lines:** 180-220

---

## 1. PURPOSE

Implement a reusable `VisionBadge` React component that visually indicates when a step was recorded via Vision (OCR) rather than DOM selectors. This badge displays in the step list UI, helping users understand which steps will use Vision-based execution during playback. Consistent with the existing badge styling patterns in the application.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| Step Interface | `src/types/step.types.ts` | recordedVia field |
| Existing Badges | `src/components/ui/` | Badge styling patterns |
| UI Screenshot | Project Knowledge | Visual reference for badges |
| Tailwind Config | `tailwind.config.js` | Color palette |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/components/badges/VisionBadge.tsx` | CREATE | ~60 |
| `src/components/badges/index.ts` | MODIFY | +5 |
| `src/components/StepRow.tsx` | MODIFY | +15 |

### Artifacts

- `VisionBadge` component created
- Badge exported from badges index
- Integration with StepRow component

---

## 4. DETAILED SPECIFICATION

### 4.1 VisionBadge Component

```typescript
// In src/components/badges/VisionBadge.tsx

import React from 'react';

export interface VisionBadgeProps {
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  
  /** Whether to show tooltip on hover */
  showTooltip?: boolean;
  
  /** Custom tooltip text */
  tooltipText?: string;
  
  /** Additional CSS classes */
  className?: string;
}

/**
 * Badge indicating a step uses Vision-based execution
 */
export const VisionBadge: React.FC<VisionBadgeProps> = ({
  size = 'sm',
  showTooltip = true,
  tooltipText = 'This step uses Vision (OCR) detection',
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

  return (
    <span
      className={`
        inline-flex items-center gap-1
        ${sizeClasses[size]}
        bg-purple-100 text-purple-800
        dark:bg-purple-900 dark:text-purple-200
        rounded-md font-medium
        border border-purple-200 dark:border-purple-700
        ${className}
      `}
      title={showTooltip ? tooltipText : undefined}
    >
      {/* Eye icon for Vision */}
      <svg
        className={iconSizes[size]}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      <span>Vision</span>
    </span>
  );
};

export default VisionBadge;
```

### 4.2 Badge Variants

```typescript
// Additional variant for compact display

export interface VisionBadgeIconOnlyProps {
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  tooltipText?: string;
  className?: string;
}

/**
 * Icon-only version of Vision badge for compact layouts
 */
export const VisionBadgeIconOnly: React.FC<VisionBadgeIconOnlyProps> = ({
  size = 'sm',
  showTooltip = true,
  tooltipText = 'Vision (OCR)',
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
        bg-purple-100 text-purple-700
        dark:bg-purple-900 dark:text-purple-300
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
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    </span>
  );
};
```

### 4.3 Badge Index Export

```typescript
// In src/components/badges/index.ts

export { VisionBadge, VisionBadgeIconOnly } from './VisionBadge';
export type { VisionBadgeProps, VisionBadgeIconOnlyProps } from './VisionBadge';

// Re-export other badges
export { LoopStartBadge } from './LoopStartBadge';
export { DelayBadge } from './DelayBadge';
export { ConditionalBadge } from './ConditionalBadge';
```

### 4.4 StepRow Integration

```typescript
// In src/components/StepRow.tsx - Add Vision badge display

import { VisionBadge, VisionBadgeIconOnly } from './badges';
import { Step } from '@/types/step.types';

interface StepRowProps {
  step: Step;
  index: number;
  isCompact?: boolean;
  // ... other props
}

export const StepRow: React.FC<StepRowProps> = ({
  step,
  index,
  isCompact = false,
  // ... other props
}) => {
  const showVisionBadge = step.recordedVia === 'vision';

  return (
    <div className="step-row flex items-center gap-2 py-2 px-3 border-b">
      {/* Step number */}
      <span className="step-number text-gray-500 w-8">
        {index + 1}
      </span>

      {/* Badges container */}
      <div className="badges-container flex items-center gap-1">
        {/* Loop Start badge (if applicable) */}
        {step.isLoopStart && <LoopStartBadge size="sm" />}
        
        {/* Vision badge */}
        {showVisionBadge && (
          isCompact 
            ? <VisionBadgeIconOnly size="sm" />
            : <VisionBadge size="sm" />
        )}
        
        {/* Delay badge (if applicable) */}
        {step.delayMs && step.delayMs > 0 && (
          <DelayBadge delayMs={step.delayMs} size="sm" />
        )}
        
        {/* Conditional badge (if applicable) */}
        {step.conditionalConfig && <ConditionalBadge size="sm" />}
      </div>

      {/* Step label/action */}
      <div className="step-content flex-1">
        <span className="step-label">{step.label || step.action}</span>
      </div>

      {/* Step actions */}
      <div className="step-actions">
        {/* ... action buttons ... */}
      </div>
    </div>
  );
};
```

---

## 5. CODE EXAMPLES

### 5.1 Basic Usage

```tsx
import { VisionBadge } from '@/components/badges';

// Default small badge
<VisionBadge />

// Medium size
<VisionBadge size="md" />

// Large size with custom tooltip
<VisionBadge 
  size="lg" 
  tooltipText="Step uses OCR to find elements"
/>
```

### 5.2 Icon-Only Badge

```tsx
import { VisionBadgeIconOnly } from '@/components/badges';

// Compact display
<VisionBadgeIconOnly size="sm" />

// In a tight space
<div className="flex items-center gap-0.5">
  <VisionBadgeIconOnly />
  <LoopStartBadgeIconOnly />
  <DelayBadgeIconOnly />
</div>
```

### 5.3 Conditional Rendering

```tsx
// Only show if step uses Vision
{step.recordedVia === 'vision' && (
  <VisionBadge size="sm" />
)}

// Or with action type check
{(step.recordedVia === 'vision' || step.action.startsWith('vision_')) && (
  <VisionBadge />
)}
```

### 5.4 In Step List

```tsx
const StepList: React.FC<{ steps: Step[] }> = ({ steps }) => {
  return (
    <div className="step-list">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center gap-2 py-1">
          <span className="text-sm text-gray-500">{index + 1}</span>
          
          {step.recordedVia === 'vision' && <VisionBadge size="sm" />}
          
          <span className="flex-1">{step.label || step.action}</span>
        </div>
      ))}
    </div>
  );
};
```

### 5.5 With Dark Mode Support

```tsx
// The component already supports dark mode via Tailwind classes
// dark:bg-purple-900 dark:text-purple-200

// In a dark theme context
<div className="dark">
  <VisionBadge /> {/* Automatically uses dark colors */}
</div>
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** VisionBadge renders with eye icon and "Vision" text
- [ ] **AC-2:** Supports sm, md, lg size variants
- [ ] **AC-3:** Shows tooltip on hover by default
- [ ] **AC-4:** Supports custom tooltip text
- [ ] **AC-5:** VisionBadgeIconOnly shows icon only
- [ ] **AC-6:** Purple color scheme distinguishes from other badges
- [ ] **AC-7:** Dark mode support works correctly
- [ ] **AC-8:** Exported from badges index
- [ ] **AC-9:** Integrates with StepRow component
- [ ] **AC-10:** Only displays when recordedVia === 'vision'

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Color consistency** - Use purple to match Vision theme
2. **Size consistency** - Match other badge sizes exactly
3. **Icon clarity** - Eye icon must be recognizable at small sizes

### Patterns to Follow

1. **Tailwind classes** - Use existing design tokens
2. **Dark mode** - Use dark: prefix for theme support
3. **Accessibility** - Include title attribute for tooltips

### Edge Cases

1. **Multiple badges** - Should stack horizontally without overlap
2. **Long step labels** - Badge should not wrap
3. **Very small containers** - Use icon-only variant
4. **No Vision steps** - Badge simply doesn't render

---

## 8. VERIFICATION COMMANDS

```bash
# Verify file creation
ls -la src/components/badges/VisionBadge.tsx

# Verify exports
grep -n "VisionBadge" src/components/badges/index.ts

# Verify StepRow integration
grep -n "VisionBadge" src/components/StepRow.tsx

# Run type check
npm run type-check

# Build extension
npm run build
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Remove new file
rm src/components/badges/VisionBadge.tsx

# Revert index changes
git checkout src/components/badges/index.ts

# Revert StepRow changes
git checkout src/components/StepRow.tsx
```

---

## 10. REFERENCES

- FND-010: Step Interface Extension (recordedVia field)
- FND-004: Type Definitions File
- UI Screenshot: Project screenshot showing badge layout
- Existing badges: LoopStartBadge pattern reference

---

*End of Specification UI-001*
