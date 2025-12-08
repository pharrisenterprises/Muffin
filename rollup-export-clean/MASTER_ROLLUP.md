# MASTER ROLLUP - Muffin Chrome Extension

**Purpose:** Single comprehensive reference document containing everything an AI assistant needs to generate code that integrates seamlessly with this project.

**Last Updated:** December 7, 2025  
**Repository:** Muffin Chrome Extension (Manifest V3)  
**Status:** Complete atomic rollup refresh (Phase 3 Integration Complete)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Technology Stack](#technology-stack)
3. [Architecture Overview](#architecture-overview)
4. [Project Structure](#project-structure)
5. [Core Type Definitions](#core-type-definitions)
6. [Import & Code Conventions](#import--code-conventions)
7. [Component Subsystems](#component-subsystems)
8. [Database Schema](#database-schema)
9. [Chrome Extension Integration](#chrome-extension-integration)
10. [Utilities & Helpers](#utilities--helpers)
11. [Module Boundaries & Dependencies](#module-boundaries--dependencies)
12. [Development Guidelines](#development-guidelines)

---

## Executive Summary

**Muffin** is a Chrome extension (Manifest V3) for recording, mapping, and replaying web form interactions with CSV-driven test data iteration.

**Core Capabilities:**
- Record user interactions as replayable steps
- Map CSV columns to form fields with fuzzy matching
- Execute automated form filling across multiple data rows
- Multi-strategy element location (XPath, ID, text similarity, position)
- Shadow DOM and iframe penetration
- Test execution history with detailed logging

**Primary Use Case:** Data-driven testing and form automation for web applications.

**Key Differentiators:**
- Manifest V3 service worker architecture
- IndexedDB as single source of truth (via background script)
- Multi-strategy element finding with progressive fallback
- Shadow DOM interception via prototype patching
- CSV-driven test data iteration

---

## Technology Stack

### Core Technologies

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Language** | TypeScript | 5.0.2 | Type-safe development |
| **Framework** | React | 18.2.0 | UI components |
| **Extension** | Chrome Manifest V3 | - | Service worker architecture |
| **Build Tool** | Vite | 6.3.5 | Development & bundling |
| **State** | Redux Toolkit | 2.2.5 | Minimal global state (theme, header) |
| **Database** | Dexie.js | 4.0.11 | IndexedDB wrapper |
| **UI Library** | Radix UI + shadcn/ui | - | Component primitives |
| **Styling** | Tailwind CSS | 3.4.16 | Utility-first CSS |
| **Routing** | React Router DOM | 7.1.1 | Hash-based routing |

### Key Libraries

| Library | Purpose |
|---------|---------|
| **PapaParse** | CSV parsing |
| **string-similarity** | Fuzzy field matching |
| **@hello-pangea/dnd** | Drag-and-drop step reordering |
| **date-fns** | Date formatting |
| **clsx + tailwind-merge** | Conditional class merging |

### Build Configuration

- **Dual Vite configs:** `vite.config.ts` (UI), `vite.config.bg.ts` (background)
- **UI build:** React SPA with React Router
- **Background build:** ES module service worker (no React)
- **Output:** `release/` directory with manifest.json, HTML pages, bundled JS

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Chrome Extension                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌──────────────┐      ┌───────────┐ │
│  │   UI Pages   │◄────►│  Background  │◄────►│  Content  │ │
│  │  (React SPA) │      │   Service    │      │  Scripts  │ │
│  │              │      │   Worker     │      │           │ │
│  └──────────────┘      └──────────────┘      └───────────┘ │
│         │                      │                     │       │
│         │                      │                     │       │
│         │              ┌───────▼───────┐             │       │
│         │              │   IndexedDB   │             │       │
│         │              │  (Dexie.js)   │             │       │
│         │              └───────────────┘             │       │
│         │                                            │       │
│         └────────────────────────────────────────────┼──────►│
│                    Chrome Storage                    │       │
│                                                       │       │
│                                              ┌────────▼─────┐│
│                                              │  Target Page ││
│                                              │  (DOM/Forms) ││
│                                              └──────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

**Recording Flow:**
```
User Interaction → Content Script Recorder → Background Script → IndexedDB (projects table)
```

**Playback Flow:**
```
UI Trigger → Background Script → Content Script Replayer → DOM Manipulation → Results → IndexedDB (testRuns table)
```

**Data Access:**
```
UI Components → chrome.runtime.sendMessage → Background Script → Dexie Operations → IndexedDB
                                           ← Response ←
```

### Key Architectural Patterns

1. **Message Passing:** All communication via Chrome message passing API
2. **Centralized Storage:** IndexedDB accessed only through background script
3. **Multi-Strategy Element Finding:** 6+ progressive fallback methods for DOM element location
4. **Shadow DOM Penetration:** Prototype patching to access closed shadow roots
5. **CSV Iteration:** Loop through CSV rows, replacing step values per iteration

---

## Project Structure

```
/workspaces/Muffin/
├── public/                          # Static assets
│   ├── manifest.json                # Chrome extension manifest
│   ├── index.html, pages.html       # Entry points
│   ├── popup.html                   # Extension popup
│   └── icon/, fonts/                # Assets
├── src/
│   ├── main.tsx                     # React entry point
│   ├── App.tsx                      # App wrapper
│   ├── pages/                       # Page components (7 files)
│   │   ├── content.tsx              # Dashboard (main)
│   │   ├── recorderPage.tsx         # Recording interface
│   │   ├── testRunnerPage.tsx       # Test execution interface
│   │   ├── fieldMapperPage.tsx      # CSV mapping interface
│   │   └── Pages/                   # Bundle pages
│   ├── components/                  # UI components (50+ files)
│   │   ├── ui/                      # shadcn/ui components
│   │   ├── Dashboard/               # Dashboard components
│   │   ├── Mapper/                  # Field mapping components
│   │   └── ...
│   ├── background/                  # Service worker
│   │   ├── background.ts            # Message router + orchestration
│   │   └── indexedDB.ts             # Dexie database definition
│   ├── contentScript/               # Content scripts
│   │   ├── types.ts                 # Shared types
│   │   ├── recorder.ts              # Recording logic
│   │   └── replayer.ts              # Playback logic
│   ├── redux/                       # Redux store (minimal)
│   │   ├── store.ts
│   │   ├── hooks.ts
│   │   └── slices/                  # Theme, header, user
│   ├── common/                      # Shared utilities
│   │   ├── helpers/                 # StorageHelper, etc.
│   │   └── services/
│   ├── lib/                         # Utility functions
│   │   └── utils.ts                 # cn() for Tailwind
│   └── routes/                      # React Router config
├── analysis-resources/              # Documentation
│   ├── MASTER_ROLLUP.md            # This file
│   ├── TECHNICAL_REFERENCE.md      # Technical deep-dive
│   ├── _RESOURCE_MAP.md            # Documentation index
│   ├── project-analysis/           # Meta-analysis
│   ├── component-breakdowns/       # 32 component breakdowns
│   └── modularization-plans/       # Refactoring blueprints
├── vite.config.ts                  # Vite config (UI)
├── vite.config.bg.ts               # Vite config (background)
├── tailwind.config.js              # Tailwind configuration
├── tsconfig.json                   # TypeScript config
└── package.json                    # Dependencies
```

**Total Files:** 85 TypeScript/React files

---

## Core Type Definitions

### Primary Data Types (src/pages/content.tsx)

```typescript
export interface Project {
  id?: number;
  projectName: string;
  projectDescription: string;
  redirectUrl?: string;
  capturedFields?: Field[];
  isPublic?: boolean;
  bundleName?: string;
}

export interface Bundle {
  id?: number;
  bundleName: string;
  bundleDescription: string;
  csvColumns: string[];
  csvData?: string[][];
  projectId: number;
  projectName?: string;
  isPublic: boolean;
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

export interface TestRun {
  id?: number;
  bundleId: number;
  projectId: number;
  bundleName: string;
  projectName: string;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  startTime: string;
  endTime?: string;
  status: "pending" | "running" | "completed" | "failed" | "partial";
  logs?: LogEntry[];
}

export interface LogEntry {
  timestamp: string;
  level: "info" | "error" | "warning" | "success";
  message: string;
  iteration?: number;
  details?: any;
}

export interface Step {
  id?: number;
  stepType: string;
  targetElement?: string;
  value?: string;
  timestamp?: number;
  xpath?: string;
  order?: number;
  url?: string;
  selector?: string;
}
```

### Content Script Types (src/contentScript/types.ts)

```typescript
export interface TestStep {
  type: "click" | "type" | "navigate" | "select" | "wait" | "submit" | "hover" | "scroll";
  selector?: string;
  xpath?: string;
  value?: string;
  url?: string;
  timestamp: number;
  targetElement?: {
    tagName: string;
    id?: string;
    className?: string;
    textContent?: string;
    attributes?: Record<string, string>;
  };
}

export interface RecordingSession {
  id: string;
  projectId: number;
  steps: TestStep[];
  startTime: number;
  endTime?: number;
  status: "recording" | "paused" | "completed";
}

export interface ElementInfo {
  xpath: string;
  cssSelector: string;
  tagName: string;
  id?: string;
  className?: string;
  textContent?: string;
  attributes: Record<string, string>;
}
```

### IndexedDB Schema Types (src/background/indexedDB.ts)

```typescript
export interface IProject {
  id?: number;
  projectName: string;
  projectDescription: string;
  redirectUrl?: string;
  capturedFields?: IField[];
  isPublic?: boolean;
  bundleName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IBundle {
  id?: number;
  bundleName: string;
  bundleDescription: string;
  csvColumns: string[];
  csvData: string[][];
  projectId: number;
  projectName?: string;
  isPublic: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ITestRun {
  id?: number;
  bundleId: number;
  projectId: number;
  bundleName: string;
  projectName: string;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  startTime: string;
  endTime?: string;
  status: "pending" | "running" | "completed" | "failed" | "partial";
  logs: ILogEntry[];
}
```

---

## Import & Code Conventions

### Import Pattern (CRITICAL)

**All imports use relative paths. NO path aliases (`@/`) are configured.**

```typescript
// ✅ CORRECT
import { Button } from "../../components/ui/button"
import { cn } from "../../lib/utils"
import { Project, Bundle } from "../content"
import { StorageHelper } from "../../common/helpers/StorageHelper"

// ❌ WRONG - Will fail
import { Button } from "@/components/ui/button"
```

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `Dashboard`, `DataTable` |
| Functions | camelCase | `handleClick`, `fetchProjects` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_ATTEMPTS` |
| Interfaces/Types | PascalCase | `Project`, `FieldMapping` |
| Variables | camelCase | `projectName`, `isRecording` |

### Export Patterns

```typescript
// Pages: Default export
export default function Dashboard() {}

// Reusable components: Named export
export function DataTable() {}

// shadcn/ui components: Named exports
export { Button, buttonVariants }
```

### File Organization

```typescript
// 1. Imports (grouped)
import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "../../components/ui/button"

// 2. Types/Interfaces
interface Props {
  projectId: number
}

// 3. Component
export default function MyPage({ projectId }: Props) {
  // State declarations
  const [data, setData] = useState([])
  
  // Effects
  useEffect(() => {}, [])
  
  // Handlers
  const handleClick = () => {}
  
  // Render
  return <div>...</div>
}
```

---

## Component Subsystems

### 32 Core Subsystems

| Subsystem | Purpose | Key Files |
|-----------|---------|-----------|
| **Background Service Worker** | Central message routing hub | `src/background/background.ts` |
| **Build Pipeline** | Dual Vite build (UI + worker) | `vite.config.ts`, `vite.config.bg.ts` |
| **Chrome Storage Helper** | Promise wrapper for chrome.storage | `src/common/helpers/StorageHelper.ts` |
| **Content Script Recorder** | Event capture & step recording | `src/contentScript/recorder.ts` |
| **Content Script Replayer** | Step playback engine | `src/contentScript/replayer.ts` |
| **CSV Parser** | PapaParse integration | Components using Papa.parse |
| **Dashboard UI** | Main project management | `src/pages/content.tsx` |
| **DOM Element Finder** | Multi-strategy element location | Content scripts |
| **DOM Label Extraction** | 16-strategy label extraction | Content scripts |
| **Field Mapper UI** | CSV to field mapping interface | `src/pages/fieldMapperPage.tsx` |
| **Field Mapping Engine** | String similarity matching | `src/components/Mapper/` |
| **Iframe Handler** | Cross-frame DOM traversal | Content scripts |
| **IndexedDB Storage** | Dexie wrapper | `src/background/indexedDB.ts` |
| **Injection Manager** | Content script injection | Background script |
| **Message Router** | Background message handling | `src/background/background.ts` |
| **Notification Overlay** | In-page visual feedback | Content scripts |
| **Page Interceptor** | Shadow DOM monkey patch | Content scripts |
| **Project CRUD** | Project management UI | `src/components/Dashboard/` |
| **Project Repository** | Dexie CRUD operations | `src/background/indexedDB.ts` |
| **Recorder UI** | Recording interface | `src/pages/recorderPage.tsx` |
| **Redux State Management** | Minimal global state | `src/redux/` |
| **Router Navigation** | React Router config | `src/routes/` |
| **Shadow DOM Handler** | Shadow root traversal | Content scripts |
| **Step Capture Engine** | Event → step transformation | Content scripts |
| **Step Table Management** | Interactive step list | `src/components/` |
| **Tab Manager** | Browser tab lifecycle | Background script |
| **Test Logger** | Centralized logging | Content scripts |
| **Test Orchestrator** | Test execution engine | Background script |
| **Test Run Repository** | Test history CRUD | `src/background/indexedDB.ts` |
| **Test Runner UI** | Test execution interface | `src/pages/testRunnerPage.tsx` |
| **UI Design System** | shadcn/ui + Radix | `src/components/ui/` |
| **XPath Computation** | Position-based XPath | Content scripts |

*Detailed breakdowns available in `analysis-resources/component-breakdowns/`*

---

## Database Schema

### Dexie Configuration

```typescript
class MuffinDatabase extends Dexie {
  projects!: Table<IProject>
  bundles!: Table<IBundle>
  testRuns!: Table<ITestRun>

  constructor() {
    super("MuffinDB")
    this.version(1).stores({
      projects: "++id, projectName, isPublic",
      bundles: "++id, bundleName, projectId, isPublic",
      testRuns: "++id, bundleId, projectId, status"
    })
  }
}
```

### Tables

**projects:**
- Primary key: `++id` (auto-increment)
- Indexed: `projectName`, `isPublic`
- Contains: Project metadata, captured fields, redirect URL

**bundles:**
- Primary key: `++id` (auto-increment)
- Indexed: `bundleName`, `projectId`, `isPublic`
- Contains: CSV data, columns, project association

**testRuns:**
- Primary key: `++id` (auto-increment)
- Indexed: `bundleId`, `projectId`, `status`
- Contains: Execution results, logs, timestamps, success/failure counts

### Data Access Pattern

```typescript
// All IndexedDB access goes through background script
chrome.runtime.sendMessage({ type: "GET_PROJECTS" }, (response) => {
  if (chrome.runtime.lastError) {
    console.error(chrome.runtime.lastError)
    return
  }
  const projects = response.data
})
```

---

## Chrome Extension Integration

### Message Types

**Project Operations:**
- `GET_PROJECTS` - Fetch all projects
- `SAVE_PROJECT` - Create/update project
- `DELETE_PROJECT` - Remove project
- `UPDATE_PROJECT` - Partial update

**Bundle Operations:**
- `GET_BUNDLES` - Fetch bundles
- `SAVE_BUNDLE` - Create bundle with CSV
- `DELETE_BUNDLE` - Remove bundle
- `GET_BUNDLE_BY_ID` - Single bundle fetch

**Test Operations:**
- `SAVE_TEST_RUN` - Store test results
- `GET_TEST_RUNS` - Fetch execution history
- `UPDATE_TEST_RUN` - Update run status

**Recording Operations:**
- `START_RECORDING` - Inject recorder
- `STOP_RECORDING` - Finalize recording
- `GET_RECORDING_STATE` - Check status

**Content Script:**
- `INJECT_CONTENT_SCRIPT` - Programmatic injection

### Message Pattern

```typescript
// Sender (UI)
chrome.runtime.sendMessage(
  { type: "GET_PROJECTS" },
  (response) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError)
      return
    }
    handleData(response.data)
  }
)

// Receiver (Background)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_PROJECTS") {
    db.projects.toArray().then(projects => {
      sendResponse({ success: true, data: projects })
    })
    return true // Keep channel open for async
  }
})
```

### Error Handling

```typescript
// Always check chrome.runtime.lastError
chrome.runtime.sendMessage({ type: "ACTION" }, (response) => {
  if (chrome.runtime.lastError) {
    console.error("Message failed:", chrome.runtime.lastError.message)
    return
  }
  // Process response
})

// Use toast for user feedback
import { toast } from "../../components/ui/use-toast"

try {
  await saveProject(data)
  toast({ title: "Success", description: "Project saved" })
} catch (error) {
  toast({ 
    title: "Error", 
    description: error.message,
    variant: "destructive"
  })
}
```

---

## Utilities & Helpers

### StorageHelper (Chrome Storage API)

```typescript
// src/common/helpers/StorageHelper.ts
export class StorageHelper {
  static async get<T>(key: string): Promise<T | undefined>
  static async set<T>(key: string, value: T): Promise<void>
  static async remove(key: string): Promise<void>
  static async clear(): Promise<void>
  static async getMultiple<T>(keys: string[]): Promise<Record<string, T>>
}

// Usage
import { StorageHelper } from "../../common/helpers/StorageHelper"
await StorageHelper.set("currentProject", project)
const project = await StorageHelper.get<Project>("currentProject")
```

### cn() - Tailwind Class Merging

```typescript
// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Usage
import { cn } from "../../lib/utils"
<div className={cn("base-class", isActive && "active-class", className)} />
```

### createPageUrl() - Extension Page URLs

```typescript
// src/utils.ts
export const createPageUrl = (page: string): string => {
  return chrome.runtime.getURL(`${page}.html`)
}

// Usage
chrome.tabs.create({ url: createPageUrl("pages") }) // Open dashboard
chrome.tabs.create({ url: createPageUrl("recorderPage") }) // Open recorder
```

### Common Helpers

```typescript
// src/common/helpers/commonHelpers.ts
export function generateId(): string
export function formatTimestamp(timestamp: number): string
export function isValidEmail(email: string): boolean
export function deepClone<T>(obj: T): T
```

---

## Module Boundaries & Dependencies

### Proposed Modularization (9 Modules)

**Layer 0: Foundation**
1. **@muffin/types** - All TypeScript interfaces
2. **@muffin/utils** - Common utilities (StorageHelper, cn, etc.)

**Layer 1: Core Services**
3. **@muffin/storage** - IndexedDB wrapper (Dexie)
4. **@muffin/chrome-bridge** - Message passing abstractions

**Layer 2: Domain Logic**
5. **@muffin/recorder** - Recording engine
6. **@muffin/replayer** - Playback engine
7. **@muffin/mapper** - Field mapping engine

**Layer 3: Background**
8. **@muffin/background** - Service worker orchestration

**Layer 4: UI**
9. **@muffin/ui** - React components + pages

### Dependency Map

```
@muffin/ui
  ├─→ @muffin/chrome-bridge
  ├─→ @muffin/types
  └─→ @muffin/utils

@muffin/background
  ├─→ @muffin/storage
  ├─→ @muffin/recorder
  ├─→ @muffin/replayer
  ├─→ @muffin/chrome-bridge
  └─→ @muffin/types

@muffin/recorder
  ├─→ @muffin/types
  └─→ @muffin/utils

@muffin/replayer
  ├─→ @muffin/types
  ├─→ @muffin/mapper
  └─→ @muffin/utils

@muffin/mapper
  ├─→ @muffin/types
  └─→ @muffin/utils

@muffin/storage
  ├─→ @muffin/types
  └─→ @muffin/utils

@muffin/chrome-bridge
  └─→ @muffin/types
```

*Full modularization plan: `analysis-resources/modularization-plans/00_modularization-overview.md`*

---

## Development Guidelines

### Adding a New Page

1. Create in `src/pages/` with default export
2. Add route in `src/routes/index.tsx`
3. Add HTML file in `public/` (if standalone)
4. Update `manifest.json` if needed
5. Use relative imports (no `@/`)

### Adding a New Component

1. Create in `src/components/` with PascalCase name
2. Use named export (or default for pages)
3. Use relative imports
4. Use `cn()` for conditional classes
5. Follow shadcn/ui pattern for UI components

### Adding Chrome Message Handler

1. Add message type constant
2. Add handler in `src/background/background.ts`
3. Use `sendResponse()` for async operations
4. Return `true` to keep channel open
5. Check `chrome.runtime.lastError` in sender

### Adding IndexedDB Table

1. Add interface in `src/background/indexedDB.ts`
2. Update `MuffinDatabase` class
3. Increment database version
4. Add migration if needed
5. Update stores definition

### State Management Rules

**Use Redux ONLY for:**
- Theme (dark/light/system)
- Header visibility
- User authentication state

**Use Local State for:**
- Component-specific data
- Form inputs
- Loading states
- Selected items

**Use Chrome Storage for:**
- Cross-session persistence
- User preferences
- Extension settings

### Testing Checklist

- [ ] Test in Chrome with `npm run dev`
- [ ] Test message passing between contexts
- [ ] Test IndexedDB operations
- [ ] Test content script injection
- [ ] Test in iframes and shadow DOM
- [ ] Build with `npm run build`
- [ ] Test production bundle in Chrome

---

## Quick Reference

### Navigation

```typescript
import { useNavigate } from "react-router-dom"
const navigate = useNavigate()
navigate("/dashboard")
```

### Load Data from IndexedDB

```typescript
chrome.runtime.sendMessage({ type: "GET_PROJECTS" }, (response) => {
  if (chrome.runtime.lastError) {
    console.error(chrome.runtime.lastError)
    return
  }
  setProjects(response.data || [])
})
```

### Parse CSV

```typescript
import Papa from "papaparse"
Papa.parse(file, {
  header: true,
  complete: (results) => {
    const columns = results.meta.fields || []
    const data = results.data
  }
})
```

### Show Toast

```typescript
import { toast } from "../../components/ui/use-toast"
toast({ title: "Success", description: "Done" })
toast({ title: "Error", description: "Failed", variant: "destructive" })
```

### Format Date

```typescript
import { format } from "date-fns"
const formatted = format(new Date(), "MMM dd, yyyy HH:mm")
```

### Find Element by XPath

```typescript
function getElementByXPath(xpath: string): HTMLElement | null {
  const result = document.evaluate(
    xpath, document, null,
    XPathResult.FIRST_ORDERED_NODE_TYPE, null
  )
  return result.singleNodeValue as HTMLElement | null
}
```

---

## Documentation Resources

**Comprehensive References:**
- `analysis-resources/TECHNICAL_REFERENCE.md` - Full technical deep-dive
- `analysis-resources/project-analysis/00_meta-analysis.md` - Complete repo analysis
- `analysis-resources/modularization-plans/00_modularization-overview.md` - Refactoring blueprint
- `analysis-resources/component-breakdowns/` - 32 detailed component breakdowns
- `analysis-resources/_RESOURCE_MAP.md` - Documentation index

**Key Documents:**
- Stack breakdown, architecture map, folder structure, dependencies
- Implementation guides, build instructions
- Standardized prompts for code generation

---

## Phase 3 Integration Summary

**Status:** Phase 3 Specifications Complete (46 documents: A1-H6)

### Phase 3 System Overview
Phase 3 introduces a comprehensive multi-layer recording system with advanced selector strategies, validation framework, and robust error handling. The system implements a 7-tier element identification fallback strategy ensuring maximum reliability across diverse web applications.

### Key Phase 3 Components
- **46 Specifications:** Complete coverage (Architecture, Data, Engineering, Frontend, General, Test, HTML, UI specs)
- **7-Tier Selector Strategy:** ID → data-testid → aria-label → name → XPath → text similarity → position fallback
- **Multi-Layer Recording:** Simultaneous capture at multiple context levels (main window, iframes, shadow DOMs)
- **Validation Framework:** Real-time step validation during recording and pre-execution validation
- **Error Recovery:** Automatic fallback strategies, retry logic, comprehensive error tracking

### Integration Points
| Component | Phase 3 Relevance | Implementation Status |
|-----------|-------------------|----------------------|
| Content Script Recorder | ENG-001, ENG-007 | ✅ Multi-layer capture ready |
| DOM Element Finder | ENG-007, TST-009 | ✅ 7-tier fallback implemented |
| Test Orchestrator | ENG-008, DAT-003 | ✅ Playback engine integrated |
| Field Mapping Engine | ENG-016, DAT-002 | ✅ CSV iteration supported |
| Test Runner UI | UI-011, UI-010 | ✅ Real-time feedback implemented |

### Phase 3 Architecture Patterns
- **Strategy Pattern:** Element finding uses pluggable strategy classes (7 tiers)
- **Observer Pattern:** Multi-layer recording uses event aggregation across contexts
- **Retry Pattern:** Playback engine implements exponential backoff for transient failures
- **Validation Chain:** Steps validated through multi-stage pipeline before execution

### Related Documentation
- **Component Breakdowns:** 40 files in `component-breakdowns/` with Phase 3 integration details
- **Meta-Analysis:** `00_meta-analysis.md` with Phase 3 system overview
- **Modularization Plans:** `00_modularization-overview.md` with Phase 3 refactoring strategy
- **Technical Reference:** `TECHNICAL_REFERENCE.md` with Phase 3 conventions and patterns

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-12-01 | Initial atomic rollup refresh |
| 1.1.0 | 2025-12-07 | Phase 3 integration complete (46 specifications, 40 component breakdowns updated) |

---

## End of Master Rollup

**This document should be the first reference for any AI assistant working on this project.**

**For detailed technical specifications, see `TECHNICAL_REFERENCE.md`**  
**For component-specific details, see `component-breakdowns/`**  
**For refactoring plans, see `modularization-plans/`**

**Last Updated:** December 7, 2025  
**Maintained By:** Muffin Development Team
