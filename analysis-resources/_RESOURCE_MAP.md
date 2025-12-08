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

- **ARCHITECTURE_DECISIONS.md** ⭐ — **[FINALIZED DECISIONS]** Documents 8 approved architectural decisions for Phase 2: (1) Tesseract Loading Strategy (at recording start), (2) OCR Confidence Threshold (60%), (3) Conditional Click Timeout (120s), (4) Evidence Storage Architecture (50MB browser + Native Host Phase 3), (5) Strategy Degradation Policy (NONE - full multi-layer always), (6) Scoring Weight Configuration (fixed, not user-configurable), (7) Schema Migration Strategy (lazy on load), (8) Test Coverage Requirements (ALL sites full regression). Includes detailed rationale, implementation code examples, 7-tier tool arsenal specification, evidence-informed strategy selection algorithm, and Native Messaging Host API contracts. **Required reference for all Phase 2 build cards.**

- **BIDIRECTIONAL_ANALYSIS.md** — Complete gap analysis between current system and Phase 2 target architecture referencing finalized architecture decisions. Documents current system inventory (15 working components needing verification), missing components (11 new), required interface extensions (Step, Recording), manifest changes, message router additions (12 new actions), dependency tree (8 phases), critical paths, risks/mitigations, test site status (5 sites requiring full regression). References ARCHITECTURE_DECISIONS.md for all decision-dependent implementations. Essential for Phase 2 migration planning and Claude-Copilot collaboration.

- **BUILD_CARD_BACKLOG_PHASE2.md** ⭐ — **[87+ BUILD CARDS]** Complete implementation task breakdown for Phase 2 organized into 9 categories: Foundation (FND-001 to FND-012), Data Layer (DAT-001 to DAT-008), CDP Infrastructure (CDP-001 to CDP-010), Vision Engine (VIS-001 to VIS-015), Decision Engine (DEC-001 to DEC-008), Integration (INT-001 to INT-012), UI Components (UI-001 to UI-012), Testing (TST-001 to TST-010), Native Messaging Host Phase 3 (NMH-001 to NMH-005). Each card includes priority, dependencies, complexity, acceptance criteria, implementation code, and notes. Cross-references ARCHITECTURE_DECISIONS.md for decision-dependent cards. Defines sequential build dependencies and minimum viable Phase 2 path. **Primary task tracker for Phase 2 implementation.**

- **PHASE_3_STATUS_TRACKER.md** ⭐ — **[46 SPECIFICATIONS]** Progress tracker for Phase 3 Content Generation. Lists all 46 file specifications to be generated across 8 sections (Section A: Content Script Orchestration 7, Section B: Background CDP Services 5, Section C: Decision Engine 10, Section D: Library Files 4, Section E: Existing Files to Modify 5, Section F: Puppeteer Extension 5, Section G: Puppeteer Runner 8, Section H: Puppeteer UI 2). Tracks completion status, commit status, section progress, and session notes. Organized into 3 generation threads (Core Infrastructure 16, Strategies + Library + Modifications 15, Puppeteer Integration 15). Used to maintain steady progress through the estimated 12-15 continues content generation workflow. References PHASE_3_MANUAL.md for file details and acceptance criteria.

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

## IMPLEMENTATION GUIDES

- **analysis-resources/implementation-guides/**
  Contains phase-specific implementation manuals and guides.
  
  **Files:**
  - **PHASE_3_MANUAL.md** ⭐ — **[December 6, 2025]** Complete content generation plan for Phase 2 Vision Enhancement + Puppeteer integration. Defines 46 files requiring content generation organized into 8 sections (Content Script Orchestration, Background CDP Services, Decision Engine, Library Files, File Modifications, Puppeteer Extension, Puppeteer Runner, UI Components). Includes dependency graph, 3 generation threads, content format templates, critical interfaces, message handlers, architecture decisions, and step-by-step execution workflow. **Primary reference for Phase 3 content generation.**

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

## QUICK REFERENCE: CLAUDE KB UPLOAD FILES

**For Phase 2 Implementation:**
1. **ARCHITECTURE_DECISIONS.md** — Finalized architectural decisions (8 key decisions)
2. **BUILD_CARD_BACKLOG_PHASE2.md** — 87+ build cards with dependencies
3. **knowledge-base-export/MASTER_ROLLUP_PHASE2.md** — Primary code generation reference
4. **BIDIRECTIONAL_ANALYSIS.md** — Gap analysis and dependency tree

**Total Upload Size:** ~300 KB | **Purpose:** Synchronized Claude-Copilot code generation

## IMPLEMENTATION GUIDES

- **analysis-resources/implementation-guides/**
  Contains structured guides for multi-phase code generation and implementation workflows.
  
  **Files:**
  - `PHASE_4_CODE_GENERATION_MANUAL.md` — **[PHASE 4 IMPLEMENTATION GUIDE]** Comprehensive manual for implementing all 46 Phase 3 specifications (42 new files + 8 modifications). Includes 6-week implementation schedule organized by dependency layers, daily task breakdown, smart prompt templates for code generation/testing, code standards (import order, file structure, naming conventions, error handling), integration checkpoints, and troubleshooting guide. Covers all categories: Types (E1-E5), CDP Services (B1-B5), Strategy System (D1-D5, C1-C5, G1, H1, H5), Recording System (A1-A7, H4), and UI Components (F1-F5, G6-G8, H3). **Required reference for Phase 4 code implementation.**

---

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
