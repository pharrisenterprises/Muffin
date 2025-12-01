# RESOURCE MAP (MASTER INDEX)

This file is the single source of truth for understanding the analysis-resource library structure.
It must be updated automatically every time any analysis prompt, breakdown prompt, or design prompt adds new files or subfolders.

## DIRECTORY OVERVIEW

- **analysis-resources/**
  Root folder for all analysis, architecture mapping, breakdowns, and planning documents.

## MASTER DOCUMENTS

- **MASTER_ROLLUP.md** — **[PRIMARY REFERENCE]** Single comprehensive document containing everything an AI needs to generate code for this project. Includes executive summary, tech stack, architecture, type definitions, conventions, all 32 subsystems, database schema, Chrome integration, utilities, module boundaries, and development guidelines. **Start here for any code generation task.**

- **TECHNICAL_REFERENCE.md** — Detailed technical deep-dive with complete TypeScript interfaces, import patterns, code conventions, error handling, state management, Chrome extension architecture, database schema, file paths, utilities inventory, and integration checklists. Complements MASTER_ROLLUP with implementation-level detail.

- **BIDIRECTIONAL_ANALYSIS.md** — Complete gap analysis between current system and future Vision-enabled state. Documents what exists, what's missing, what must change, dependency trees, build sequence, architecture gaps, risks, and invention requirements. Essential for migration planning.

- **BUILD_CARD_BACKLOG.md** — Comprehensive backlog of 67 build cards organized into 8 categories (Foundation, Data Layer, Core Engine, Integration, UI, Testing, Migration, Documentation). Each card includes purpose, inputs, outputs, acceptance criteria, dependencies, and risk level. Provides recommended execution order and parallelization opportunities for ~4-5 hour build timeline.

- **analysis-resources/project-analysis/**
  Holds outputs from the initial repo analysis phase.
  
  **Files:**
  - `00_meta-analysis.md` — Master repo analysis: comprehensive overview, tech stack, architecture, directory structure, dependencies, complexity hotspots, and subsystem boundaries for future rebuild.

- **analysis-resources/component-breakdowns/**
  Contains deep-dive documents for specific components/subsystems.
  Format: `<component-name>_breakdown.md`
  
  **Files:**
  - `00_VERIFICATION_REPORT.md` — Verification report confirming all 32 component breakdowns are current and accurately reflect the codebase (verified 2025-12-01).

- **analysis-resources/modularization-plans/**
  Holds modular re-architecture blueprints defining module boundaries, dependencies, build order, and contracts.
  
  **Files:**
  - `00_modularization-overview.md` — Complete modularization blueprint defining 9 modules with clear boundaries, dependency map, 18-week build order (30 components), risks/constraints, and 7 architecture contracts (ElementBundle, Step, FieldMapping, Action Messages, TestConfig, Repository Operations, UI Props).

## Component Breakdowns

| File | Description |
|------|-------------|
| background-service-worker_breakdown.md | Central message routing hub in service worker managing lifecycle and cross-context communication |
| build-pipeline_breakdown.md | Dual Vite build configuration for React UI and ES module service worker |
| chrome-storage-helper_breakdown.md | Promise-based wrapper around Chrome storage.sync API for persistent key-value storage |
| content-script-recorder_breakdown.md | Event capture system that records user interactions with full element metadata |
| content-script-replayer_breakdown.md | Playback engine that replays recorded steps with multi-strategy element finding |
| csv-parser_breakdown.md | PapaParse integration for parsing CSV files into structured test data |
| dashboard-ui_breakdown.md | Main project management interface with card grid, search, and CRUD operations |
| dom-element-finder_breakdown.md | Multi-strategy element location system with 6+ progressive fallback methods |
| dom-label-extraction_breakdown.md | 16-strategy label extraction system for form fields and interactive elements |
| field-mapper-ui_breakdown.md | CSV column to step label mapping interface with auto-mapping and manual editing |
| field-mapping-engine_breakdown.md | String similarity algorithm for automatic mapping of CSV columns to step labels |
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

## Future Specs

- **future-spec/**
  Contains complete technical specifications for Muffin Lite enhancement (Vision/OCR capabilities). Defines requirements, architecture, data models, API contracts, and migration strategy for adding Tesseract.js-based automation.
  
  **Files:**
  - `_INDEX.md` — Master index with navigation by role (Product/Design/Dev/QA), feature summary, build phases, key interfaces, and file change summary. **Start here for Phase 3 implementation.**
  - `00_future-overview.md` — Executive summary, vision statement ("Any element you can see, Muffin Lite can interact with"), project objectives, 5 feature summary (Vision Engine, Vision Recording, Time Delay, CSV Loop, Conditional Click), success criteria, technical constraints, build phases, dependencies, risk assessment, and glossary.
  - `01_requirements.md` — Complete requirements specification: 29 functional requirements (FR-101 to FR-505 across 5 features), 14 non-functional requirements (NFR-101 to NFR-503), and requirements traceability matrix linking each requirement to architecture components.
  - `02_ux-flows.md` — User experience flows and wireframes: 6 complete user journeys with ASCII diagrams (Recording with Vision Fallback, Time Delay Configuration, CSV Loop Configuration, Conditional Click Setup, Complete Playback, Step Editing). Includes screen state mockups and error states.
  - `03_feature-specs.md` — Detailed technical specifications for all 5 features with class structures, method specifications, TypeScript interfaces, content script handlers, and testing requirements. Defines Vision Engine API, recording fallback logic, delay execution, position-based CSV mapping, and conditional polling loop.
  - `04_architecture.md` — System architecture and component design: high-level diagram, 4-layer architecture (Extension Pages, Shared Libraries, Service Worker, Content Scripts), data flow diagrams, complete file structure with 14 new files and 10 modified files, manifest.json updates, package.json updates. Includes Tesseract.js integration architecture.
  - `05_data-layer.md` — Data models, schemas, and storage patterns: IndexedDB schema v2 with migration, 8 TypeScript interface definitions (Project, Recording, Step, ConditionalConfig, ParsedField, TestRun, UserPreferences, LogEntry), repository pattern implementations (RecordingRepository with 15+ methods, TestRunRepository with 9+ methods), validation functions, and sample data with all new Vision fields.
  - `06_api-contracts.md` — Internal APIs and message contracts: Chrome extension message architecture, 40+ message type definitions (Extension Page ↔ Background, Background ↔ Content Script, Content Script ↔ Background), VisionEngine class interface with 15+ methods, MessageRouter implementation, APIClient wrapper with type-safe methods, usage examples, and error codes.
  - `07_migration-notes.md` — Migration strategy and rollback plan: current vs future state comparison, detailed file-by-file changes, 6-phase migration strategy (Foundation 60min, Recording 45min, Time Delay 30min, CSV Loop 45min, Conditional Click 45min, Integration Testing 30min), backward compatibility strategy, rollback procedures, testing checklist, known limitations, troubleshooting guide, and timeline.

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
