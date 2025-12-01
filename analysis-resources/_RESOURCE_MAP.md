# RESOURCE MAP (MASTER INDEX)

This file is the single source of truth for understanding the analysis-resource library structure.
It must be updated automatically every time any analysis prompt, breakdown prompt, or design prompt adds new files or subfolders.

## DIRECTORY OVERVIEW

- **analysis-resources/**
  Root folder for all analysis, architecture mapping, breakdowns, and planning documents.

- **analysis-resources/project-analysis/**
  Holds outputs from the initial repo analysis phase.
  
  **Files:**
  - `00_meta-analysis.md` — Master repo analysis: comprehensive overview, tech stack, architecture, directory structure, dependencies, complexity hotspots, and subsystem boundaries for future rebuild.

- **analysis-resources/component-breakdowns/**
  Contains deep-dive documents for specific components/subsystems.
  Format: `<component-name>_breakdown.md`
  
  **Files (32 total):**
  - `background-service-worker_breakdown.md` — Central message routing hub in service worker, handles 15+ action types
  - `build-pipeline_breakdown.md` — Dual Vite build configuration for UI + background service worker
  - `chrome-storage-helper_breakdown.md` — Promise-based wrapper for Chrome storage.sync API
  - `content-script-recorder_breakdown.md` — Event capture system for recording user interactions
  - `content-script-replayer_breakdown.md` — Playback engine that replays recorded steps
  - `csv-parser_breakdown.md` — PapaParse integration for CSV file parsing
  - `dashboard-ui_breakdown.md` — Main project management interface with card grid
  - `dom-element-finder_breakdown.md` — Multi-strategy element location (6+ fallback methods)
  - `dom-label-extraction_breakdown.md` — 16-strategy label extraction for form fields
  - `field-mapper-ui_breakdown.md` — CSV column to step label mapping interface
  - `field-mapping-engine_breakdown.md` — String similarity algorithm for auto-mapping
  - `iframe-handler_breakdown.md` — Cross-frame DOM traversal for iframe support
  - `indexeddb-storage_breakdown.md` — Dexie.js wrapper for projects/testruns tables
  - `injection-manager_breakdown.md` — Content script injection orchestration
  - `message-router_breakdown.md` — Background script message handler (15+ actions)
  - `notification-overlay_breakdown.md` — In-page visual feedback during test execution
  - `page-interceptor_breakdown.md` — Shadow DOM monkey patch for closed shadow roots
  - `project-crud_breakdown.md` — Create/edit/delete project UI components
  - `project-repository_breakdown.md` — Dexie CRUD wrapper for projects table
  - `recorder-ui_breakdown.md` — Recording interface with live step display
  - `redux-state-management_breakdown.md` — Minimal Redux store (theme state only)
  - `router-navigation_breakdown.md` — React Router hash-based routing configuration
  - `shadow-dom-handler_breakdown.md` — Shadow DOM traversal + closed shadow workarounds
  - `step-capture-engine_breakdown.md` — Event-to-step transformation logic
  - `step-table-management_breakdown.md` — Drag-drop step reordering table component
  - `tab-manager_breakdown.md` — Browser tab lifecycle management for tests
  - `test-logger_breakdown.md` — Timestamped logging system for test execution
  - `test-orchestrator_breakdown.md` — Core test execution engine (CSV iteration + playback)
  - `test-run-repository_breakdown.md` — Dexie CRUD wrapper for testruns table
  - `test-runner-ui_breakdown.md` — Test execution interface with real-time progress
  - `ui-design-system_breakdown.md` — Radix UI + Tailwind component library
  - `xpath-computation_breakdown.md` — Position-based XPath generation algorithm

- **analysis-resources/modularization-plans/**
  Holds modular re-architecture plans for future rebuilding steps.

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
