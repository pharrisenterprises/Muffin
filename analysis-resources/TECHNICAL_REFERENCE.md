# Muffin Technical Reference

**Purpose:** Comprehensive technical reference for AI-assisted code generation.

**Last Updated:** 2025-01-23  
**Repository:** Muffin Chrome Extension (Manifest V3)

---

## TypeScript Type Definitions

### Core Types (src/pages/content.tsx)

```typescript
export interface Bundle {
  id?: number;
  bundleName: string;
  bundleDescription: string;
  csvColumns: string[];
  isPublic: boolean;
  csvData?: string[][];
  projectId: number;
  projectName?: string;
}

export interface Project {
  id?: number;
  projectName: string;
  projectDescription: string;
  redirectUrl?: string;
  capturedFields?: Field[];
  isPublic?: boolean;
  bundleName?: string;
}

export interface Field {
  id: string;
  name: string;
  value?: string;
  order?: number;
  type?: string;
  xpath?: string;
  selector?: string;
  required?: boolean;
  csvColumn?: string;
  element?: HTMLElement;
  mappingId?: string;
}
```

## Import Patterns

All imports use **relative paths** - no `@/` aliases:

```typescript
// ✅ CORRECT
import { Button } from "../../components/ui/button"
import { cn } from "../../lib/utils"

// ❌ WRONG
import { Button } from "@/components/ui/button"
```

## Code Conventions

- Components: PascalCase
- Functions: camelCase
- Constants: UPPER_SNAKE_CASE
- Pages: Default export
- Components: Named export

## Chrome Extension Architecture

Message flow:
```
UI → chrome.runtime.sendMessage → Background → IndexedDB
```

Always check `chrome.runtime.lastError` after message passing.

## Database Schema

Tables: projects, bundles, testRuns

All operations via background script using Dexie.js.

## Utilities

- `StorageHelper` - Chrome storage wrapper
- `cn()` - Tailwind class merging
- `createPageUrl()` - Generate extension page URLs

