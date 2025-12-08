# UI Design System - Component Breakdown

**Last Updated:** December 7, 2025

---

## Purpose
**What it does:** Provides reusable, accessible, and styled UI components built on Radix UI primitives with Tailwind CSS styling. Ensures consistent design language across entire Chrome extension (popup, dashboard, recorder, test runner).

**Where it lives:** `src/components/ui/` (20+ component files)

**Why it exists:** Eliminates duplicate styling code, ensures WCAG accessibility compliance (Radix primitives), and accelerates UI development with pre-built variants (primary/secondary buttons, default/destructive badges, etc.).

---

## Inputs
**Component Props (varies by component):**
```typescript
// Button example
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;  // Radix composition pattern
}

// Input example
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  // No custom props, extends native input attributes
}

// Dialog example
interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}
```

---

## Outputs
**Rendered React Components:**
- `<Button>` - Clickable actions (primary, secondary, destructive, outline, ghost, link)
- `<Input>` - Text fields (default, error, disabled states)
- `<Card>` - Content containers (header, content, footer sections)
- `<Dialog>` - Modal overlays (alert, confirm, form dialogs)
- `<Select>` - Dropdown menus (native <select> replacement)
- `<Tabs>` - Tab navigation (horizontal, vertical)
- `<Badge>` - Status indicators (default, secondary, destructive, outline)
- `<Progress>` - Progress bars (percentage-based)
- `<Alert>` - Notification banners (info, warning, error, success)
- `<Table>` - Data tables (header, body, footer)
- `<Tooltip>` - Hover tooltips (keyboard accessible)
- `<Checkbox>` - Checkbox inputs (checked, unchecked, indeterminate)
- `<RadioGroup>` - Radio button groups (single selection)
- `<Switch>` - Toggle switches (on/off states)
- `<Label>` - Form labels (accessibility-linked)
- `<Separator>` - Visual dividers (horizontal, vertical)
- `<ScrollArea>` - Custom scrollbars (Radix ScrollArea)
- `<Avatar>` - User avatars (image, fallback, initials)
- `<DropdownMenu>` - Context menus (nested, icons, shortcuts)
- `<Popover>` - Popover panels (positioned, closeable)

---

## Internal Architecture

### Technology Stack
1. **Radix UI** - Unstyled, accessible primitives
   - `@radix-ui/react-dialog` - Modal overlays
   - `@radix-ui/react-select` - Dropdown menus
   - `@radix-ui/react-tabs` - Tab navigation
   - `@radix-ui/react-tooltip` - Hover tooltips
   - 15+ other primitives

2. **Tailwind CSS** - Utility-first styling
   ```typescript
   // Example: Button component
   <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded" />
   ```

3. **Class Variance Authority (CVA)** - Variant management
   ```typescript
   const buttonVariants = cva(
     "inline-flex items-center justify-center rounded-md font-medium transition-colors",
     {
       variants: {
         variant: {
           default: "bg-primary text-primary-foreground hover:bg-primary/90",
           destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
           outline: "border border-input hover:bg-accent hover:text-accent-foreground",
         },
         size: {
           default: "h-10 px-4 py-2",
           sm: "h-9 rounded-md px-3",
           lg: "h-11 rounded-md px-8",
           icon: "h-10 w-10"
         }
       },
       defaultVariants: {
         variant: "default",
         size: "default"
       }
     }
   );
   ```

4. **cn() Utility** - Class merging with conflict resolution
   ```typescript
   import { clsx } from 'clsx';
   import { twMerge } from 'tailwind-merge';
   
   export function cn(...inputs: ClassValue[]) {
     return twMerge(clsx(inputs));
   }
   
   // Usage: Merge user-provided classes without conflicts
   <Button className={cn("mt-4", props.className)} />
   ```

### Component Pattern (Example: Button)
```typescript
// src/components/ui/button.tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
```

### Key Patterns

#### 1. asChild Pattern (Radix Composition)
```typescript
// Renders as anchor tag instead of button
<Button asChild>
  <a href="/dashboard">Go to Dashboard</a>
</Button>

// Output: <a href="/dashboard" class="button-classes">Go to Dashboard</a>
```

#### 2. Ref Forwarding
```typescript
const inputRef = useRef<HTMLInputElement>(null);

// Component can be controlled externally
<Input ref={inputRef} placeholder="Enter name" />

// Focus programmatically
inputRef.current?.focus();
```

#### 3. Compound Components (Dialog example)
```typescript
<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirm Action</DialogTitle>
      <DialogDescription>This action cannot be undone.</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button variant="destructive">Delete</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Critical Dependencies
**Upstream:**
- **All UI pages** - Dashboard, Recorder, TestRunner, FieldMapper, etc.
- **Feature components** - ProjectCard, StepTable, TestConsole, etc.

**Downstream:**
- **Radix UI** - 15+ primitive component packages (@radix-ui/react-*)
- **Tailwind CSS** - Utility classes (bg-*, text-*, hover:*, etc.)
- **Class Variance Authority** - Variant management (cva)
- **tailwind-merge** - Class conflict resolution
- **clsx** - Conditional class names

**External:**
- **lucide-react** - Icon library (used in many components)

---

## Hidden Assumptions
1. **Tailwind configured** - Requires tailwind.config.js with design tokens
2. **No @/ import alias in Muffin** - Uses relative paths (../lib/utils)
3. **Radix primitives unstyled** - Must wrap with Tailwind classes
4. **cn() merges right-to-left** - User classes override defaults
5. **Focus management automatic** - Radix handles keyboard navigation
6. **Dark mode supported** - Tailwind dark: variant conditionals
7. **No runtime theming** - Colors defined at build time (CSS variables)

---

## Stability Concerns

### High-Risk Patterns
1. **Class conflicts without cn()**
   ```typescript
   // BAD: Last class wins (padding overridden)
   <Button className="px-2 px-4" />  // px-4 ignored by specificity
   
   // GOOD: twMerge resolves conflicts
   <Button className={cn("px-2", props.className)} />  // User px-4 overrides px-2
   ```

2. **Missing ref forwarding**
   ```typescript
   // BAD: Can't focus input from parent
   const Input = (props) => <input {...props} />;
   
   // GOOD: forwardRef enables external control
   const Input = React.forwardRef((props, ref) => <input ref={ref} {...props} />);
   ```

3. **asChild misuse**
   ```typescript
   // BAD: Button renders as div (wrong semantics)
   <Button asChild><div>Click me</div></Button>
   
   // GOOD: Button renders as anchor (correct)
   <Button asChild><a href="#">Click me</a></Button>
   ```

### Failure Modes
- **Missing Tailwind classes** - Component unstyled (Radix primitives have no default styles)
- **Import path errors** - `@/lib/utils` fails (Muffin uses relative imports)
- **Radix peer dependency mismatch** - Version conflicts cause runtime errors
- **Dark mode broken** - Missing dark: variants in Tailwind config

---

## Edge Cases

### Input Variations
1. **Nested asChild**
   ```typescript
   // Only immediate child replaced
   <Button asChild>
     <a><span>Text</span></a>  // <a> replaces <button>, <span> preserved
   </Button>
   ```

2. **Disabled with asChild**
   ```typescript
   // Disabled state passed to child element
   <Button asChild disabled>
     <a href="#">Link</a>  // Renders: <a disabled href="#">Link</a>
   </Button>
   ```

3. **Custom variant**
   ```typescript
   // Undefined variant falls back to default
   <Button variant="custom">Click</Button>  // TypeScript error, renders as default
   ```

4. **className override**
   ```typescript
   // User classes merged with variant classes
   <Button className="bg-red-500">Click</Button>  // Red overrides default blue
   ```

5. **Uncontrolled Dialog**
   ```typescript
   // No open/onOpenChange props, Radix manages state internally
   <Dialog>
     <DialogTrigger>Open</DialogTrigger>
     <DialogContent>Content</DialogContent>
   </Dialog>
   ```

---

## Developer-Must-Know Notes

### Common Issues
1. **Q: Why are components unstyled?**
   - **A:** Missing Tailwind CSS import in root CSS file
   - **Fix:** `@import 'tailwindcss/base'; @import 'tailwindcss/components'; @import 'tailwindcss/utilities';`

2. **Q: Why does dark mode not work?**
   - **A:** Missing `darkMode: 'class'` in tailwind.config.js
   - **Fix:** Add `darkMode: 'class'` to config, toggle `<html class="dark">`

3. **Q: How do I customize colors?**
   - **A:** Edit `tailwind.config.js` theme.extend.colors
   ```typescript
   theme: {
     extend: {
       colors: {
         primary: 'hsl(var(--primary))',
         destructive: 'hsl(var(--destructive))',
       }
     }
   }
   ```

4. **Q: Why can't I focus Input from parent?**
   - **A:** Component must use `React.forwardRef` for ref forwarding

### Performance Tips
- **Bundle size** - Each Radix primitive adds ~5KB (tree-shakeable)
- **CSS purge** - Tailwind removes unused classes in production
- **Icon loading** - Import only needed icons from lucide-react
- **No runtime CSS** - All styles compiled at build time

---

## Phase 3 Integration Points

### Strategy Implementation
| Strategy ID | Relevance | Integration Point |
|-------------|-----------|-------------------|
| **UI-010** | Critical | Design System IS the foundation for consistent UI |
| **UI-011** | High | Components provide real-time feedback (Progress, Badge, Alert) |
| **ENG-014** | Medium | Accessible components ensure WCAG compliance |

### Specification Mapping
- **H2** (User Experience) - Consistent, accessible UI components
- **UI-010** (Design System) - Centralized styling and variants
- **UI-011** (Real-time Feedback) - Progress bars, badges, alerts

### Evidence References
- Code: `src/components/ui/` directory (20+ component files)
- Docs: Radix UI documentation (https://www.radix-ui.com/)
- Styling: Tailwind CSS classes in component implementations

### Integration Risks
1. **Import Path Errors:** Muffin uses relative imports (not @/ alias), component examples may fail
2. **Version Conflicts:** Radix peer dependencies must match (React 18+)
3. **Dark Mode Incomplete:** Some custom components missing dark: variants
4. **Accessibility Gaps:** Custom components may bypass Radix primitives (lose keyboard navigation)

---

## Recommendations for Future Enhancement

### 1. Convert to @/ Alias
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}

// Component imports
import { cn } from "@/lib/utils";  // Instead of ../../lib/utils
```

### 2. Add Component Storybook
```typescript
// button.stories.tsx
export const Primary = () => <Button variant="default">Primary</Button>;
export const Destructive = () => <Button variant="destructive">Delete</Button>;
```

### 3. Implement Design Tokens
```css
/* globals.css */
:root {
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
}
```

### 4. Add Component Tests
```typescript
import { render, screen } from '@testing-library/react';
import { Button } from './button';

test('renders button with text', () => {
  render(<Button>Click me</Button>);
  expect(screen.getByText('Click me')).toBeInTheDocument();
});
```

### 5. Extract Common Patterns
```typescript
// src/lib/component-utils.ts
export function createVariantComponent<T>(
  baseClasses: string,
  variants: Record<string, Record<string, string>>
) {
  return cva(baseClasses, { variants });
}
```

---

## Related Components
- **All UI Pages** - Dashboard, Recorder, TestRunner, FieldMapper, Popup
- **Custom Feature Components** - ProjectCard, StepTable, TestConsole, TestResults
- **Utils** - cn() class merger (`src/lib/utils.ts`)
- **Tailwind Config** (`tailwind.config.js`) - Design tokens and theme
- **CSS Globals** (`src/css/index.css`) - Base styles and Tailwind imports
