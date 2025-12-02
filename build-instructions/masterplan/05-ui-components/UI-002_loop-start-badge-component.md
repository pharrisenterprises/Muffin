# UI-002: Loop Start Badge Component

> **Build Card:** UI-002  
> **Category:** UI Components  
> **Dependencies:** FND-011, FND-004  
> **Risk Level:** Low  
> **Estimated Lines:** 180-220

---

## 1. PURPOSE

Implement a reusable `LoopStartBadge` React component that visually indicates the step where CSV loop iteration begins. When a recording has a `loopStartIndex` set, this badge displays on the corresponding step, clearly showing users that playback will return to this step for each subsequent CSV row. Matches the visual style shown in the project screenshot.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| Recording Interface | `src/types/recording.types.ts` | loopStartIndex field |
| UI Screenshot | Project Knowledge | Visual reference showing "Loop Start" badge |
| Existing Badges | `src/components/ui/` | Badge styling patterns |
| Tailwind Config | `tailwind.config.js` | Color palette |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/components/badges/LoopStartBadge.tsx` | CREATE | ~70 |
| `src/components/badges/index.ts` | MODIFY | +5 |
| `src/components/StepRow.tsx` | MODIFY | +10 |

### Artifacts

- `LoopStartBadge` component created
- Badge exported from badges index
- Integration with StepRow component

---

## 4. DETAILED SPECIFICATION

### 4.1 LoopStartBadge Component

```typescript
// In src/components/badges/LoopStartBadge.tsx

import React from 'react';

export interface LoopStartBadgeProps {
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
 * Badge indicating the loop start point for CSV iteration
 * Matches the teal/cyan color scheme from the UI screenshot
 */
export const LoopStartBadge: React.FC<LoopStartBadgeProps> = ({
  size = 'sm',
  showTooltip = true,
  tooltipText = 'CSV loop restarts from this step',
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
        bg-teal-100 text-teal-800
        dark:bg-teal-900 dark:text-teal-200
        rounded-md font-medium
        border border-teal-200 dark:border-teal-700
        ${className}
      `}
      title={showTooltip ? tooltipText : undefined}
    >
      {/* Loop/refresh icon */}
      <svg
        className={iconSizes[size]}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M17 2l4 4-4 4" />
        <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
        <path d="M7 22l-4-4 4-4" />
        <path d="M21 13v1a4 4 0 0 1-4 4H3" />
      </svg>
      <span>Loop Start</span>
    </span>
  );
};

export default LoopStartBadge;
```

### 4.2 Icon-Only Variant

```typescript
// Additional compact variant

export interface LoopStartBadgeIconOnlyProps {
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  tooltipText?: string;
  className?: string;
}

/**
 * Icon-only version of Loop Start badge for compact layouts
 */
export const LoopStartBadgeIconOnly: React.FC<LoopStartBadgeIconOnlyProps> = ({
  size = 'sm',
  showTooltip = true,
  tooltipText = 'Loop Start',
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
        bg-teal-100 text-teal-700
        dark:bg-teal-900 dark:text-teal-300
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
        <path d="M17 2l4 4-4 4" />
        <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
        <path d="M7 22l-4-4 4-4" />
        <path d="M21 13v1a4 4 0 0 1-4 4H3" />
      </svg>
    </span>
  );
};
```

### 4.3 Alternative Play Icon Variant

```typescript
/**
 * Alternative badge with play icon indicating loop start point
 * Matches the exact style from the project screenshot
 */
export const LoopStartBadgeAlt: React.FC<LoopStartBadgeProps> = ({
  size = 'sm',
  showTooltip = true,
  tooltipText = 'Loop starts here for each CSV row',
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
        bg-cyan-600 text-white
        dark:bg-cyan-700
        rounded font-medium
        ${className}
      `}
      title={showTooltip ? tooltipText : undefined}
    >
      {/* Play/arrow icon */}
      <svg
        className={iconSizes[size]}
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path d="M8 5v14l11-7z" />
      </svg>
      <span>Loop Start</span>
    </span>
  );
};
```

### 4.4 Badge Index Export

```typescript
// In src/components/badges/index.ts

export { 
  LoopStartBadge, 
  LoopStartBadgeIconOnly,
  LoopStartBadgeAlt 
} from './LoopStartBadge';

export type { 
  LoopStartBadgeProps, 
  LoopStartBadgeIconOnlyProps 
} from './LoopStartBadge';
```

### 4.5 StepRow Integration

```typescript
// In src/components/StepRow.tsx - Add Loop Start badge display

import { LoopStartBadge } from './badges';
import { Step } from '@/types/step.types';

interface StepRowProps {
  step: Step;
  index: number;
  loopStartIndex?: number;
  isCompact?: boolean;
  // ... other props
}

export const StepRow: React.FC<StepRowProps> = ({
  step,
  index,
  loopStartIndex,
  isCompact = false,
  // ... other props
}) => {
  // Determine if this step is the loop start
  const isLoopStartStep = loopStartIndex !== undefined && index === loopStartIndex;

  return (
    <div className="step-row flex items-center gap-2 py-2 px-3 border-b">
      {/* Step number */}
      <span className="step-number text-gray-500 w-8">
        {index + 1}
      </span>

      {/* Badges container */}
      <div className="badges-container flex items-center gap-1">
        {/* Loop Start badge - shows on the step that starts the loop */}
        {isLoopStartStep && (
          isCompact
            ? <LoopStartBadgeIconOnly size="sm" />
            : <LoopStartBadge size="sm" />
        )}
        
        {/* Other badges... */}
      </div>

      {/* Step content */}
      <div className="step-content flex-1">
        <span className="step-label">{step.label || step.action}</span>
      </div>
    </div>
  );
};
```

### 4.6 Recording-Level Integration

```typescript
// In src/components/StepList.tsx - Pass loopStartIndex to rows

import { Recording } from '@/types/recording.types';

interface StepListProps {
  recording: Recording;
  // ... other props
}

export const StepList: React.FC<StepListProps> = ({
  recording,
  // ... other props
}) => {
  return (
    <div className="step-list">
      {recording.steps.map((step, index) => (
        <StepRow
          key={step.id}
          step={step}
          index={index}
          loopStartIndex={recording.loopStartIndex}
        />
      ))}
    </div>
  );
};
```

---

## 5. CODE EXAMPLES

### 5.1 Basic Usage

```tsx
import { LoopStartBadge } from '@/components/badges';

// Default small badge
<LoopStartBadge />

// Medium size
<LoopStartBadge size="md" />

// Without tooltip
<LoopStartBadge showTooltip={false} />
```

### 5.2 Icon-Only Badge

```tsx
import { LoopStartBadgeIconOnly } from '@/components/badges';

// Compact circular badge
<LoopStartBadgeIconOnly size="sm" />
```

### 5.3 Alternative Style (Matching Screenshot)

```tsx
import { LoopStartBadgeAlt } from '@/components/badges';

// Cyan filled badge matching UI screenshot
<LoopStartBadgeAlt size="sm" />
```

### 5.4 Conditional Rendering in Step List

```tsx
const StepList: React.FC<{ recording: Recording }> = ({ recording }) => {
  return (
    <div className="step-list">
      {recording.steps.map((step, index) => (
        <div key={step.id} className="flex items-center gap-2 py-1">
          <span className="text-sm text-gray-500 w-6">{index + 1}</span>
          
          {/* Show Loop Start badge on the designated step */}
          {index === recording.loopStartIndex && (
            <LoopStartBadge size="sm" />
          )}
          
          <span className="flex-1">{step.label || step.action}</span>
        </div>
      ))}
    </div>
  );
};
```

### 5.5 With Loop Start Dropdown Selection

```tsx
// When user selects loop start from dropdown
const handleLoopStartChange = (stepIndex: number) => {
  setRecording(prev => ({
    ...prev,
    loopStartIndex: stepIndex
  }));
};

// Visual feedback shows badge on selected step
{recording.steps.map((step, index) => (
  <div key={step.id} className="flex items-center">
    {index === recording.loopStartIndex && <LoopStartBadge />}
    <span>{step.label}</span>
  </div>
))}
```

### 5.6 In Toolbar Display

```tsx
// Show loop start info in toolbar
const LoopInfo: React.FC<{ recording: Recording }> = ({ recording }) => {
  if (recording.loopStartIndex === undefined) {
    return <span className="text-gray-400">No loop configured</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <LoopStartBadge size="sm" />
      <span className="text-sm">
        from Step {recording.loopStartIndex + 1}
      </span>
    </div>
  );
};
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** LoopStartBadge renders with loop icon and "Loop Start" text
- [ ] **AC-2:** Supports sm, md, lg size variants
- [ ] **AC-3:** Shows tooltip on hover by default
- [ ] **AC-4:** Teal/cyan color scheme matches UI screenshot
- [ ] **AC-5:** LoopStartBadgeIconOnly shows icon only
- [ ] **AC-6:** LoopStartBadgeAlt matches exact screenshot style
- [ ] **AC-7:** Dark mode support works correctly
- [ ] **AC-8:** Exported from badges index
- [ ] **AC-9:** Integrates with StepRow using loopStartIndex
- [ ] **AC-10:** Only displays on the step matching loopStartIndex

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Color scheme** - Use teal/cyan to match screenshot
2. **Position** - Badge appears before other badges in step row
3. **Single badge** - Only one step can have Loop Start badge

### Patterns to Follow

1. **Screenshot reference** - Match the exact visual from project screenshot
2. **Consistent sizing** - Match other badge component sizes
3. **Index-based display** - Compare step index to loopStartIndex

### Edge Cases

1. **No loop start set** - Badge doesn't render anywhere
2. **Loop start at step 0** - Badge on first step
3. **Loop start index out of range** - Don't crash, just don't show
4. **Recording with no steps** - Handle gracefully

---

## 8. VERIFICATION COMMANDS

```bash
# Verify file creation
ls -la src/components/badges/LoopStartBadge.tsx

# Verify exports
grep -n "LoopStartBadge" src/components/badges/index.ts

# Verify StepRow integration
grep -n "loopStartIndex\|LoopStartBadge" src/components/StepRow.tsx

# Run type check
npm run type-check

# Build extension
npm run build
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Remove new file
rm src/components/badges/LoopStartBadge.tsx

# Revert index changes
git checkout src/components/badges/index.ts

# Revert StepRow changes
git checkout src/components/StepRow.tsx
```

---

## 10. REFERENCES

- FND-011: Recording Interface Extension (loopStartIndex field)
- FND-004: Type Definitions File
- UI Screenshot: Project screenshot showing "Loop Start" badge on Step 1
- Feature Spec: `/future-spec/03_feature-specs.md` Section 1.1

---

*End of Specification UI-002*
