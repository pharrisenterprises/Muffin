# RESOURCE MAP (MASTER INDEX)

This file is the single source of truth for understanding the analysis-resource library structure.
It must be updated automatically every time any analysis prompt, breakdown prompt, or design prompt adds new files or subfolders.

## DIRECTORY OVERVIEW

- **analysis-resources/**
  Root folder for all analysis, architecture mapping, breakdowns, and planning documents.

## MASTER DOCUMENTS

- **MASTER_ROLLUP.md** — **[PRIMARY REFERENCE]** Single comprehensive document containing everything an AI needs to generate code for this project. Includes executive summary, tech stack, architecture, type definitions, conventions, all 32 subsystems, database schema, Chrome integration, utilities, module boundaries, and development guidelines. **Start here for any code generation task.**

- **TECHNICAL_REFERENCE.md** — Detailed technical deep-dive with complete TypeScript interfaces, import patterns, code conventions, error handling, state management, Chrome extension architecture, database schema, file paths, utilities inventory, and integration checklists. Complements MASTER_ROLLUP with implementation-level detail.

- **SOURCE_CODE_ROLLUP.md** — Key source code examples from critical files (type definitions, IndexedDB schema, Chrome Storage Helper, background message router, Redux store, React Router, build configs, and Phase 3 Vision type specifications). Provides implementation context and patterns for code generation.

- **BIDIRECTIONAL_ANALYSIS.md** — Complete gap analysis between current system and Phase 2 target architecture (CDP integration, multi-strategy intelligence, Vision Engine). Documents what exists, what's missing, what must change, what must be replaced, what must be extended, dependency trees, build sequence (43-53 hours estimated), architecture gaps, integration risks, timing/race conditions, invention requirements (10 new services), new message actions (12+), new UI components (6), file inventory (20+ new files), and build card cross-reference. Essential for Phase 2 migration planning and Claude-Copilot collaboration.

- **PHASE_3_STATUS_TRACKER.md** — Progress tracker for Phase 3 Specification Generation. Lists all 74 specification files to be generated across 8 categories (FND 11, DAT 6, ENG 18, INT 9, UI 12, TST 10, MIG 5, DOC 3). Tracks completion status, commit status, category progress, and session notes. Used to maintain steady progress through the 4-5 hour specification generation workflow.

- **PHASE_4_STATUS_TRACKER.md** — Progress tracker for Phase 4 Code Implementation. Lists all 74 implementations to be generated across 11 dependency layers (Layer 0: Foundation 4, Layer 1: Types 5, Layer 2: Extended 2, Layer 3: Data Foundation 2, Layer 4: Data Complete 4, Layer 5: Engine Foundation 3, Layer 6: Engine Methods 16, Layer 7: Integration 9, Layer 8: UI 11, Layer 9: Testing 10, Layer 10: Migration 5, Layer 11: Documentation 3). Tracks implementation status, test results, commit status, and layer progress. Used to ensure strict dependency ordering during 4-5 hour implementation workflow.

## PROJECT ANALYSIS

- **analysis-resources/project-analysis/**
  Holds outputs from the initial repo analysis phase.
  
  **Files:**
  - `00_meta-analysis.md` — Master repo analysis: comprehensive overview, tech stack, architecture, directory structure, dependencies, complexity hotspots, and subsystem boundaries for future rebuild.
  - `00_project-summary.md` — Project summary
  - `01_stack-breakdown.md` — Technology stack breakdown
  - `02_architecture-map.md` — Architecture mapping
  - `03_folder-structure.md` — Directory structure analysis
  - `04_dependencies.md` — Dependency analysis

## MODULARIZATION PLANS

- **analysis-resources/modularization-plans/**
  Holds modular re-architecture blueprints defining module boundaries, dependencies, build order, and contracts.
  
  **Files:**
  - `00_modularization-overview.md` — Complete modularization blueprint defining 9 modules with clear boundaries, dependency map, 18-week build order (30 components), risks/constraints, and 7 architecture contracts (ElementBundle, Step, FieldMapping, Action Messages, TestConfig, Repository Operations, UI Props).

## COMPONENT BREAKDOWNS

- **analysis-resources/component-breakdowns/**
  Contains deep-dive documents for specific components/subsystems. Format: `<component-name>_breakdown.md`

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
| recorder-ui_breakdown.md | Recording interface UI component |
| redux-state-management_breakdown.md | Minimal Redux store managing theme state (dark/light mode toggle) |
| router-navigation_breakdown.md | React Router hash-based routing configuration for extension pages |
| shadow-dom-handler_breakdown.md | Shadow DOM traversal system with workarounds for closed shadow roots |
| step-capture-engine_breakdown.md | Event-to-step transformation logic enriching events with XPath, labels, and metadata |
| step-table-management_breakdown.md | Step table management component |
| tab-manager_breakdown.md | Tab management utilities |
| test-logger_breakdown.md | Test execution logging system |
| test-orchestrator_breakdown.md | Test orchestration engine |
| test-run-repository_breakdown.md | Dexie CRUD wrapper managing test execution history in IndexedDB |
| test-runner-ui_breakdown.md | Test execution interface with real-time progress, console logs, and results |
| ui-design-system_breakdown.md | Reusable component library built on Radix UI primitives and Tailwind CSS |
| xpath-computation_breakdown.md | XPath generation and computation utilities |

## BUILD INSTRUCTIONS

- **analysis-resources/build-instructions/**
  Contains build pipeline designs and environment toolchain notes.
  
  **Files:**
  - `BUILD_DEPENDENCY_MAP.md` — Build dependency mapping
  - `BUILD_PLAN.md` — Build execution plan
## KNOWLEDGE BASE EXPORT

- **analysis-resources/knowledge-base-export/** ⭐
  **Phase 2 Knowledge Base Export for Claude Projects** — Complete set of 15 markdown files documenting Phase 2 multi-strategy intelligent recording system with CDP integration. Designed for upload to Claude Knowledge Base for AI-assisted code generation.
  
  **Files:**
  - `_RESOURCE_MAP_UPDATED.md` — Directory index with file inventory, upload strategy, document relationships, AI prompt examples, and search keywords
  - `00_masterplan-overview.md` — Executive summary, 7-tier arsenal, objectives, scope, architecture philosophy, success metrics
  - `01_requirements.md` — Functional requirements (FR-100 to FR-400), non-functional requirements (NFR-100 to NFR-300), acceptance criteria
  - `02_ux-flows.md` — 7 complete ASCII flow diagrams (Recording, Vision Fallback, Playback, Time Delay, CSV Loop, Conditional Click, UI States)
  - `03_feature-specs.md` — 5 detailed feature specifications (Vision Engine, Time Delay, CSV Loop, Conditional Click, CDP Integration) with TypeScript code
  - `04_architecture.md` — System architecture diagram, component details (CDPService, PlaywrightLocators, DecisionEngine), CDP domains, file structure
  - `05_data-layer.md` — TypeScript types (StrategyType, RecordedVia, LocatorStrategy, FallbackChain), Dexie.js v3 schema, migration strategy
  - `06_api-contracts.md` — Message protocol (MessageAction, Vision/CDP API contracts), message router, error codes
  - `07_migration-notes.md` — Migration overview, Phase 7 CDP integration with 10 detailed steps, breaking changes, rollback strategy
  - `08_testing-strategy.md` — Testing overview (Unit/Integration/E2E/Manual), coverage targets, CDP test examples, manual checklists
  - `09_build-cards-cdp.md` — 10 implementation build cards (CDP-001 to CDP-010) with implementation code, dependencies, estimated time
  - `10_deployment-checklist.md` — Pre-deployment checklist, deployment stages (Alpha/Beta/Production), post-deployment monitoring, rollback procedures
  - `11_user-documentation.md` — Getting started, features guide (Recording, Playback, Time Delays, CSV Loop, Conditional Clicks, Vision Engine, Field Mapping), troubleshooting, FAQ
  - `12_future-roadmap.md` — Phases 3-6 (Advanced Recording, Mobile/Cross-Browser, Collaboration/CI-CD, AI Features), technical debt, community requests
  - `MASTER_ROLLUP_PHASE2.md` — Primary code generation reference with implementation recipes, TypeScript types, UI components, database schema, testing examples, common pitfalls
  
  **Total:** 15 files | ~217 KB | Ready for Claude Knowledge Base upload

## IMPLEMENTATION GUIDES

- **analysis-resources/implementation-guides/**
  Contains detailed instructions used during later code-generation phases.
  
  **Files:**
  - `CDP_BUILD_GUIDE.md` — CDP integration build guide
  - `DECISION_ENGINE_BUILD_GUIDE.md` — Decision Engine implementation guide
  - `VISION_BUILD_GUIDE.md` — Vision Engine build guide

## PROMPTS

- **analysis-resources/prompts/**
  Contains saved standardized prompts for the automated code-factory system.
  
  **Files:**
  - `VISION_SMART_PROMPT.md` — Smart prompt template for Vision implementation

## REFERENCES

- **analysis-resources/references/**
  Contains external and internal reference material required for accurate code generation.
  
  **Files:**
  - `AI_COLLABORATION_PROTOCOL.md` ⭐ — Bidirectional AI collaboration protocol defining synchronized knowledge base structure and communication workflow for Claude ↔ GitHub Copilot. Includes smart prompt format, implementation workflow, file reference map, verification protocol, and setup checklists for both AI systems.

## FUTURE SPECIFICATIONS

- **future-spec/**
  Contains complete technical specifications for Muffin Lite enhancement (Vision/OCR capabilities). Defines requirements, architecture, data models, API contracts, and migration strategy for adding Tesseract.js-based automation.
  
  **Files:**
  - `_INDEX.md` — Master index with navigation by role (Product/Design/Dev/QA), feature summary, build phases, key interfaces, and file change summary
  - `00_future-overview.md` — Executive summary, vision statement, project objectives, feature summary, success criteria, technical constraints
  - `00_masterplan-overview.md` — Master plan overview
  - `01_architecture-diagram.md` — Architecture diagram
  - `01_requirements.md` — Complete requirements specification with functional and non-functional requirements
  - `02_requirements.md` — Requirements (alternate version)
  - `02_ux-flows.md` — User experience flows and wireframes with ASCII diagrams
  - `03_feature-specs.md` — Detailed technical specifications for all features with TypeScript interfaces
  - `03_ux-flows.md` — UX flows (alternate version)
  - `04_architecture.md` — System architecture and component design with file structure
  - `04_feature-specs.md` — Feature specifications (alternate version)
  - `05_data-layer.md` — Data models, schemas, storage patterns, TypeScript interfaces, repository implementations
  - `06_api-contracts.md` — Internal APIs and message contracts with Chrome extension message architecture
  - `07_migration-notes.md` — Migration strategy and rollback plan with phase-by-phase implementation

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
