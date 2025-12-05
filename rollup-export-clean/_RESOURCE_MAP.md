# RESOURCE MAP (MASTER INDEX)

**Last Updated:** December 5, 2025  
**Status:** Complete atomic rollup refresh (4 component rollups + master files)

This file is the single source of truth for understanding the rollup-export-clean library structure.
It must be updated automatically every time analysis documents, breakdowns, or rollup files are added or modified.

---

## DIRECTORY OVERVIEW

- **rollup-export-clean/** — Root folder for consolidated project documentation and component rollups
- **analysis-resources/** — Original detailed breakdowns and analysis documents

---

## MASTER DOCUMENTS

### Primary References

- **MASTER_ROLLUP.md** — **[PRIMARY REFERENCE]** Single comprehensive document containing everything an AI needs to generate code for this project. Includes executive summary, tech stack, architecture, type definitions, conventions, all 40 subsystems, database schema, Chrome integration, utilities, module boundaries, and development guidelines. **Start here for any code generation task.**

- **TECHNICAL_REFERENCE.md** — Detailed technical deep-dive with complete TypeScript interfaces, import patterns, code conventions, error handling, state management, Chrome extension architecture, database schema, file paths, utilities inventory, and integration checklists. Complements MASTER_ROLLUP with implementation-level detail.

### Component Rollups (December 2025)

**Atomic rollup structure** — 4 component rollup documents covering all 40 components in logical groupings:

- **COMPONENT_ROLLUP_A-D.md** — Components A through D (10 components):
  - Background Service Worker, Build Pipeline, Chrome Storage Helper, Conditional Click UI
  - Content Script Recorder, Content Script Replayer, CSV Parser, CSV Position Mapping
  - Dashboard UI, DOM Label Extraction

- **COMPONENT_ROLLUP_F-P.md** — Components F through P (10 components):
  - Field Mapper UI, Field Mapping Engine, Iframe Handler, IndexedDB Storage
  - Injection Manager, Message Router, Notification Overlay, Page Interceptor
  - Project CRUD, Project Repository

- **COMPONENT_ROLLUP_R-T.md** — Components R through T (10 components):
  - Recorder UI, Redux State Management, Router Navigation, Shadow DOM Handler
  - Step Capture Engine, Step Table Management, Tab Manager, Test Logger
  - Test Orchestrator, Test Run Repository

- **COMPONENT_ROLLUP_T-Z.md** — Components T through Z + Vision + Verification (9 components):
  - Test Runner UI, UI Design System, Vision Recording UI, XPath Computation
  - DOM Element Finder, Step Executor, Vision Engine, Vision Content Handlers
  - Schema Migration, Verification Report (40 components confirmed current)

### Analysis Documents

- **00_meta-analysis.md** — Master repo analysis: comprehensive overview, tech stack, architecture, directory structure, dependencies, complexity hotspots, and subsystem boundaries.

- **00_modularization-overview.md** — Complete modularization blueprint defining 9 modules with clear boundaries, dependency map, 18-week build order (40 components), risks/constraints, and 7 architecture contracts.

---

## COMPONENT INVENTORY

**Total Components:** 40 (all verified current as of December 1, 2025)

### Core Infrastructure (7 components)
| Component | Rollup Location | Description |
|-----------|-----------------|-------------|
| background-service-worker | A-D | Central message routing hub in service worker |
| build-pipeline | A-D | Dual Vite build configuration for UI and service worker |
| chrome-storage-helper | A-D | Promise-based wrapper around Chrome storage.sync API |
| injection-manager | F-P | Dynamic content script and page script injection |
| message-router | F-P | Central message-passing hub between UI/content/background |
| tab-manager | R-T | Browser tab lifecycle management for test execution |
| router-navigation | R-T | React Router hash-based navigation configuration |

### Recording Subsystem (8 components)
| Component | Rollup Location | Description |
|-----------|-----------------|-------------|
| content-script-recorder | A-D | Event capture system that records user interactions |
| recorder-ui | R-T | Recording interface with live step display and controls |
| step-capture-engine | R-T | Event-to-step transformation with element metadata |
| step-table-management | R-T | Interactive step list with drag-drop reordering |
| dom-label-extraction | A-D | 12+ strategy label extraction for form fields |
| xpath-computation | T-Z | Position-based XPath generation for elements |
| shadow-dom-handler | R-T | Shadow DOM traversal for recording and playback |
| iframe-handler | F-P | Cross-frame DOM traversal during recording/playback |

### Playback Subsystem (7 components)
| Component | Rollup Location | Description |
|-----------|-----------------|-------------|
| content-script-replayer | A-D | Playback engine that replays recorded steps |
| test-runner-ui | T-Z | Test execution interface with real-time progress |
| test-orchestrator | R-T | Core test execution engine with CSV iteration |
| step-executor | T-Z | Execution router between DOM and Vision pathways |
| dom-element-finder | T-Z | Multi-strategy element location (6+ fallback methods) |
| test-logger | R-T | Centralized logging system with timestamps |
| notification-overlay | F-P | In-page visual feedback during test playback |

### Data & CSV Subsystem (5 components)
| Component | Rollup Location | Description |
|-----------|-----------------|-------------|
| csv-parser | A-D | PapaParse integration for CSV file parsing |
| csv-position-mapping | A-D | Variable substitution algorithm for data-driven testing |
| field-mapper-ui | F-P | CSV column to step label mapping interface |
| field-mapping-engine | F-P | String similarity algorithm for auto-mapping |
| project-repository | F-P | CRUD operations wrapper around Dexie.js for projects |

### Storage & State (4 components)
| Component | Rollup Location | Description |
|-----------|-----------------|-------------|
| indexeddb-storage | F-P | Typed Dexie.js wrapper for projects and test runs |
| test-run-repository | R-T | Test execution history management in IndexedDB |
| redux-state-management | R-T | Minimal Redux store for theme state |
| schema-migration | T-Z | Legacy recording migration to Vision-compatible format |

### UI Components (5 components)
| Component | Rollup Location | Description |
|-----------|-----------------|-------------|
| dashboard-ui | A-D | Main project management interface with CRUD |
| project-crud | F-P | UI components for creating/editing/deleting projects |
| ui-design-system | T-Z | Reusable component library (Radix UI + Tailwind) |
| conditional-click-ui | A-D | Configuration components for conditional steps |
| vision-recording-ui | T-Z | Vision feature UI (badges, loop start, delays) |

### Vision Subsystem (3 components)
| Component | Rollup Location | Description |
|-----------|-----------------|-------------|
| vision-engine | T-Z | Tesseract.js OCR engine for Vision-based automation |
| vision-content-handlers | T-Z | Content script handlers for coordinate-based interactions |
| page-interceptor | F-P | Monkey-patch for closed shadow DOM access |

### Meta Documentation (1 component)
| Component | Rollup Location | Description |
|-----------|-----------------|-------------|
| verification-report | T-Z | Verification of all 40 component breakdowns (Dec 1, 2025) |

---

## NAVIGATION GUIDE

### For Code Generation
1. **Start here:** MASTER_ROLLUP.md (executive summary + all subsystems)
2. **Implementation details:** TECHNICAL_REFERENCE.md (types, patterns, conventions)
3. **Specific component deep-dive:** Appropriate COMPONENT_ROLLUP_*.md file
4. **Original detailed breakdown:** analysis-resources/component-breakdowns/*.md

### For Architecture Understanding
1. **High-level overview:** 00_meta-analysis.md
2. **Module boundaries:** 00_modularization-overview.md
3. **Component relationships:** Integration sections in component rollups
4. **Technology decisions:** Technology Stack section in MASTER_ROLLUP.md

### For Feature Development
1. **Identify affected components:** Use Component Inventory table above
2. **Review component rollup:** Read relevant COMPONENT_ROLLUP_*.md section
3. **Check dependencies:** Review Integration Points and Cross-Component Dependencies
4. **Verify types:** TECHNICAL_REFERENCE.md for TypeScript interfaces
5. **Follow conventions:** Import & Code Conventions in MASTER_ROLLUP.md

---

## ROLLUP GENERATION HISTORY

**December 5, 2025** — Atomic rollup refresh:
- Generated 4 component rollup documents (COMPONENT_ROLLUP_A-D, F-P, R-T, T-Z)
- Covered all 40 verified components in logical groupings
- Total documentation: 3,993 lines across rollups
- Commits: 4 atomic commits (one per chunk)
- Updated RESOURCE_MAP.md with complete navigation structure
| iframe-handler_breakdown.md | Cross-frame DOM traversal system for recording and playback in iframes |
| indexeddb-storage_breakdown.md | Dexie.js wrapper providing CRUD operations for projects and test runs tables |
| injection-manager_breakdown.md | Content script injection orchestration for different execution contexts |
| message-router_breakdown.md | Background script message handler routing 15+ action types between contexts |
| notification-overlay_breakdown.md | In-page visual feedback system displaying temporary notifications during playback |
| page-interceptor_breakdown.md | Shadow DOM monkey patch enabling access to closed shadow roots |
| project-crud_breakdown.md | UI components for creating, editing, and deleting projects via modal dialogs |
| project-repository_breakdown.md | Dexie CRUD wrapper encapsulating all database operations for projects table |
| recorder-ui_breakdown.md | Recording interface displaying live step capture with editing and drag-drop reordering |
| redux-state-management_breakdown.md | Minimal Redux store managing theme state (dark/light mode toggle) |
| router-navigation_breakdown.md | React Router hash-based routing configuration for extension pages |
| shadow-dom-handler_breakdown.md | Shadow DOM traversal system with workarounds for closed shadow roots |
| step-capture-engine_breakdown.md | Event-to-step transformation logic enriching events with XPath, labels, and metadata |
| step-table-management_breakdown.md | Interactive step list with drag-drop reordering and inline editing |
| tab-manager_breakdown.md | Browser tab lifecycle management for test execution (create, inject, cleanup) |
| test-logger_breakdown.md | Centralized logging system with timestamp formatting and log level classification |
| test-orchestrator_breakdown.md | Core test execution engine coordinating CSV iteration, tab management, and step playback |
| test-run-repository_breakdown.md | Dexie CRUD wrapper managing test execution history in IndexedDB |
| test-runner-ui_breakdown.md | Test execution interface with real-time progress, console logs, and results |
| ui-design-system_breakdown.md | Reusable component library built on Radix UI primitives and Tailwind CSS |
| xpath-computation_breakdown.md | Position-based XPath generation algorithm for DOM element identification |

- **analysis-resources/build-instructions/**
  Contains build pipeline designs and environment toolchain notes.

- **analysis-resources/implementation-guides/**
  Contains detailed instructions used during later code-generation phases.

- **analysis-resources/prompts/**
  Contains saved standardized prompts for the automated code-factory system.

- **analysis-resources/references/**
  Contains external and internal reference material required for accurate code generation.

## UPDATE RULES

Every time a new file or folder is created in the analysis-resources tree:
1. Add a new section to this _RESOURCE_MAP.md
2. Add links to the new files
3. Add a description of what those files contain
4. Maintain logical ordering and consistent hierarchy
5. Never remove existing entries without explicit instruction

## USAGE RULES FOR FUTURE PROMPTS

- All analysis prompts MUST save outputs into the correct subfolder.
- All design prompts MUST reference files listed in this map.
- All code-generation prompts MUST reference modularization-plans and implementation-guides.
- All resource updates MUST be mirrored in this map immediately.
