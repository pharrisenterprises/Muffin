# UI Design System Breakdown

## Purpose
**What it does:** Reusable UI component library built on Radix UI primitives + Tailwind CSS styling. Provides consistent design language across all pages.

**Where it lives:** `src/components/Ui/` directory (20+ component files)

**Why it exists:** Eliminates duplicated styling, ensures accessibility, provides responsive design system.

## Components Inventory
**Primitives (Radix UI based):**
- `Button` - button.tsx
- `Input` - input.tsx
- `Card` - card.tsx (CardHeader, CardTitle, CardContent)
- `Dialog` - dialog.tsx (Modal container)
- `Select` - select.tsx (Dropdown)
- `Tabs` - tabs.tsx (TabsList, TabsTrigger, TabsContent)
- `Badge` - badge.jsx (Status indicators)
- `Progress` - progress.tsx (Progress bars)
- `Alert` - alert.tsx (Notifications)

**Layout:**
- `Separator` - separator.tsx (Dividers)
- `ScrollArea` - scroll-area.tsx (Custom scrollbars)
- `Resizable` - resizable.tsx (Split panes)
- `Sidebar` - sidebar.tsx (Navigation sidebar)

**Forms:**
- `Label` - label.tsx
- `Radio` - radio-group.tsx
- `Dropdown` - dropdown-menu.tsx
- `Popover` - popover.tsx

## Internal Architecture
**Component Pattern:**
```typescript
// button.tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md",
  {
    variants: {
      variant: {
        default: "bg-blue-500 text-white hover:bg-blue-600",
        destructive: "bg-red-500 text-white hover:bg-red-600",
        outline: "border border-input bg-background hover:bg-accent",
        ghost: "hover:bg-accent hover:text-accent-foreground"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
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
```

## Critical Dependencies
- **Radix UI** - Accessible component primitives
- **Tailwind CSS** - Utility-first styling
- **class-variance-authority** - Variant management
- **clsx** + **tailwind-merge** - Class name merging

## Hidden Assumptions
1. **Tailwind configured** - Requires tailwind.config.js
2. **Dark mode ready** - Uses dark: prefix classes
3. **Accessible by default** - Radix handles ARIA attributes
4. **Responsive** - Mobile-first breakpoints

## Developer-Must-Know Notes
- **Variants defined with CVA** (class-variance-authority)
- **cn() utility merges class names** - Handles conflicts
- **asChild pattern** - Renders as child element (for Link components)
- **Ref forwarding** - All components support refs
- **Theme customization** - Edit tailwind.config.js for colors/spacing
- **Import from @/components/Ui** not relative paths