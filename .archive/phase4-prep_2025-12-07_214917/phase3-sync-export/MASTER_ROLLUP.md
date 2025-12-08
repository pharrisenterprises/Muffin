# MASTER ROLLUP — Project Reference

Generated: December 2, 2025

## 1. Project Overview

Muffin is a Chrome extension (Manifest V3) for recording, mapping, and replaying web form interactions with CSV-driven test data iteration. Phase 3 adds Vision/OCR automation via Tesseract.js for DOM-fallback recording and conditional click polling.

## 2. Tech Stack

- **Language:** TypeScript 5.0.2
- **Framework:** React 18.2.0
- **Build tool:** Vite 6.3.5
- **State:** Redux Toolkit 2.2.5
- **Database:** Dexie.js 4.0.11 (IndexedDB)
- **UI:** Radix UI + shadcn/ui + Tailwind CSS 3.4.16
- **Routing:** React Router DOM 7.1.1
- **Key libraries:** PapaParse (CSV), string-similarity (fuzzy matching), @hello-pangea/dnd (drag-drop), Tesseract.js 5.0+ (OCR)

## 3. Project Structure

```
/workspaces/Muffin/
├── public/                    # Static assets, manifest.json
├── src/
│   ├── pages/                 # Page components
│   ├── components/            # UI components
│   ├── background/            # Service worker + IndexedDB
│   ├── contentScript/         # Recorder + Replayer
│   ├── redux/                 # Minimal global state
│   ├── common/                # Shared utilities
│   ├── lib/                   # Utils (cn, etc.)
│   └── routes/                # React Router config
├── analysis-resources/        # Documentation
│   ├── component-breakdowns/  # 39 component breakdowns
│   ├── build-instructions/    # Phase 3 specs (74 files)
│   └── TECHNICAL_REFERENCE.md
├── vite.config.ts             # UI build
├── vite.config.bg.ts          # Background build
└── package.json
```

## 4. Component Summary

| Component | Purpose | Key File |
|-----------|---------|----------|
| **Background Service Worker** | Message routing hub | `src/background/background.ts` |
| **IndexedDB Storage** | Dexie wrapper, CRUD ops | `src/background/indexedDB.ts` |
| **Content Script Recorder** | Event capture, step recording | `src/contentScript/recorder.ts` |
| **Content Script Replayer** | Step playback engine | `src/contentScript/replayer.ts` |
| **Dashboard UI** | Project management | `src/pages/content.tsx` |
| **Recorder UI** | Recording interface | `src/pages/recorderPage.tsx` |
| **Test Runner UI** | Test execution interface | `src/pages/testRunnerPage.tsx` |
| **Field Mapper UI** | CSV-to-field mapping | `src/pages/fieldMapperPage.tsx` |
| **Field Mapping Engine** | String similarity matching | `src/components/Mapper/` |
| **DOM Element Finder** | Multi-strategy element location | Content scripts |
| **Shadow DOM Handler** | Shadow root traversal | Content scripts |
| **Iframe Handler** | Cross-frame DOM access | Content scripts |
| **Chrome Storage Helper** | Promise wrapper for storage | `src/common/helpers/StorageHelper.ts` |
| **Build Pipeline** | Dual Vite build | `vite.config.ts`, `vite.config.bg.ts` |
| **UI Design System** | shadcn/ui + Radix components | `src/components/ui/` |
| **Redux State Management** | Theme, header, user state | `src/redux/` |
| **Router Navigation** | Hash-based routing | `src/routes/` |
| **Vision Engine** | Tesseract OCR wrapper | Phase 3 spec: ENG-001 to ENG-007 |
| **Step Executor** | DOM/Vision routing, delays | Phase 3 spec: ENG-017 |
| **CSV Position Mapping** | Variable substitution | Phase 3 spec: ENG-016 |
| **Schema Migration** | v1 → v3 migration pipeline | Phase 3 spec: MIG-001 to MIG-005 |
| **Vision Content Handlers** | VISION_CLICK, TYPE, KEY, etc. | Phase 3 spec: INT-001 to INT-005 |
| **Conditional Click UI** | Config panel, badges | Phase 3 spec: UI-001 to UI-004 |
| **Vision Recording UI** | Badges, dropdowns, delays | Phase 3 spec: UI-005 to UI-012 |

## 5. Build Order

### Phase 3 Implementation Order (74 specs):

**Foundation (11):**
1. Type definitions (Vision, Conditional, Recording v3)
2. Constants (delays, confidence, timeouts)
3. Error classes (VisionError, ConditionalError)

**Data Layer (6):**
4. Schema v3 definition (loopStartIndex, globalDelayMs, recordedVia)
5. Database service updates
6. Storage service extensions

**Core Engine (18):**
7. VisionEngine initialization
8. Screenshot capture
9. OCR recognition
10. Text finding methods
11. Coordinate clicking
12. Conditional click loop
13. CSV position mapping
14. Step executor (DOM/Vision routing)
15. Delay execution logic

**Integration (9):**
16. Vision content handlers (5 message types)
17. Playback DOM/Vision switch
18. Vision fallback recording

**UI Components (12):**
19. Vision badges
20. Conditional click config panel
21. Loop start dropdown
22. Global delay input
23. Per-step delay menu

**Migration (5):**
24. recordedVia default migration
25. loopStartIndex default migration
26. globalDelayMs default migration
27. Conditional defaults migration
28. Backward compatibility verification

**Testing (10):**
29. Unit tests (engine, migration, CSV)
30. Integration tests (handlers, executor)
31. E2E test (full workflow)

**Documentation (3):**
32. Type reference
33. Component breakdowns
34. Integration guide

## 6. Phase 3 Specs Summary

- **Total specs created:** 74
- **Location:** `build-instructions/masterplan/`
- **Categories:** Foundation (11), Data Layer (6), Core Engine (18), Integration (9), UI Components (12), Testing (10), Migration (5), Documentation (3)
- **Status:** 100% complete (specifications only, implementation pending)
- **Schema version:** 3 (adds loopStartIndex, globalDelayMs, recordedVia, conditionalConfig, delaySeconds)

## 7. Key File Paths

| Concern | Path |
|---------|------|
| **Background Worker** | `src/background/background.ts` |
| **IndexedDB Schema** | `src/background/indexedDB.ts` |
| **Content Recorder** | `src/contentScript/recorder.ts` |
| **Content Replayer** | `src/contentScript/replayer.ts` |
| **Main Dashboard** | `src/pages/content.tsx` |
| **Storage Helper** | `src/common/helpers/StorageHelper.ts` |
| **Tailwind Utils** | `src/lib/utils.ts` |
| **Phase 3 Specs** | `build-instructions/masterplan/` (8 folders, 74 files) |
| **Component Breakdowns** | `analysis-resources/component-breakdowns/` (39 files) |
| **Technical Reference** | `analysis-resources/TECHNICAL_REFERENCE.md` |

## 8. Key Dependencies

```
VisionEngine (Phase 3)
  └─→ Step Executor
       └─→ CSV Position Mapping
       └─→ Content Handlers (Vision)
            └─→ Replayer
                 └─→ Background Worker
                      └─→ IndexedDB

UI Components
  └─→ Chrome Storage Helper
  └─→ Background Worker (messages)
  └─→ React Router
  └─→ Redux Store (minimal)
```

## 9. Import Convention

**All imports use relative paths. NO `@/` aliases configured.**

```typescript
// ✅ CORRECT
import { Button } from "../../components/ui/button"
import { cn } from "../../lib/utils"

// ❌ WRONG
import { Button } from "@/components/ui/button"
```

## 10. Database Schema

**Tables:**
- `projects` — Project metadata, captured fields
- `bundles` — CSV data, columns, project association
- `testRuns` — Execution results, logs, timestamps

**Schema v3 (Phase 3):**
- Recording: `schemaVersion: 3`, `loopStartIndex: 0`, `globalDelayMs: 0`
- Step: `recordedVia: 'dom'|'vision'`, `conditionalConfig: null`, `delaySeconds: null`

## 11. Message Types

**Project:** GET_PROJECTS, SAVE_PROJECT, DELETE_PROJECT, UPDATE_PROJECT  
**Bundle:** GET_BUNDLES, SAVE_BUNDLE, DELETE_BUNDLE, GET_BUNDLE_BY_ID  
**Test:** SAVE_TEST_RUN, GET_TEST_RUNS, UPDATE_TEST_RUN  
**Recording:** START_RECORDING, STOP_RECORDING, GET_RECORDING_STATE  
**Vision (Phase 3):** VISION_CLICK, VISION_TYPE, VISION_KEY, VISION_SCROLL, VISION_GET_ELEMENT

## 12. Documentation Resources

- **TECHNICAL_REFERENCE.md** — Complete type definitions, patterns, utilities
- **component-breakdowns/** — 39 detailed component breakdowns
- **build-instructions/masterplan/** — 74 Phase 3 specifications
- **_RESOURCE_MAP.md** — Documentation index
- **PHASE_3_STATUS_TRACKER.md** — Phase 3 progress tracker

---

**Last Updated:** December 2, 2025  
**Phase 3 Status:** Specifications complete (74/74)  
**Implementation Status:** Phase 3 pending implementation
