# Muffin Technical Reference

**Purpose:** Comprehensive technical reference for AI-assisted code generation.

**Last Updated:** December 7, 2025  
**Repository:** Muffin Chrome Extension (Manifest V3)  
**Status:** Phase 3 Integration Complete

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

---

## Phase 3 Integration Summary

**Status:** Phase 3 Specifications Complete (46 documents: A1-H6)

### Key Phase 3 Enhancements
- **7-Tier Selector Strategy:** ID → data-testid → aria-label → name → XPath → text similarity → position
- **Multi-Layer Recording:** Simultaneous capture across main window, iframes, shadow DOMs
- **Validation Framework:** Real-time step validation (TST-009) during recording and pre-execution
- **Error Recovery:** Automatic fallback strategies with retry logic (ENG-008)
- **CSV Integration:** Enhanced data-driven testing with variable substitution (ENG-016)

### Architecture Patterns (Phase 3)
- **Strategy Pattern:** Element finding uses pluggable strategy classes (ENG-007)
- **Observer Pattern:** Multi-layer recording uses event aggregation across contexts
- **Retry Pattern:** Playback engine implements exponential backoff for transient failures
- **Validation Chain:** Steps validated through multi-stage pipeline before execution

### Related Documentation
- **Component Breakdowns:** 40 files in `component-breakdowns/` with Phase 3 integration details
- **Meta-Analysis:** `00_meta-analysis.md` with Phase 3 system overview
- **Modularization Plans:** `00_modularization-overview.md` with Phase 3 refactoring strategy
- **Specifications:** 46 Phase 3 specs (A1-H6) defining system requirements

