# MUFFIN LITE - PHASE 3 MANUAL
# SPECIFICATION GENERATION

> **Project:** Muffin Lite Vision Enhancement  
> **Generated:** December 2025  
> **Total Prompts:** 67 Smart Prompts  
> **Estimated Duration:** ~4-5 hours  
> **Status:** Ready for Execution

---

## 1. OVERVIEW

### Purpose of Phase 3

Phase 3 transforms the Build Card Backlog into **complete, implementation-ready specification files**. Each specification contains enough detail that a developer (or AI agent) can implement the feature without additional clarification.

### What Will Be Produced

- **67 specification files** organized by category
- Each file: 400-600 lines of complete, detailed content
- NO placeholders, NO TODOs, NO "TBD" sections
- All acceptance criteria explicit and testable

### Workflow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  CLAUDE (🟣)    │ ──▶ │  USER COPIES    │ ──▶ │  COPILOT (🟦)   │
│ Generates Smart │     │  Smart Prompt   │     │  Creates file   │
│ Prompt          │     │  to Copilot     │     │  and commits    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                                               │
         └───────────── Say "continue" ◀─────────────────┘
```

**Repeat until all 67 prompts complete.**

---

## 2. DIRECTORY STRUCTURE

All Phase 3 outputs go to:

```
/build-instructions/masterplan/
│
├── _PHASE_3_STATUS_TRACKER.md          # Progress tracking
├── _INDEX.md                            # Master index of all specs
│
├── 01-foundation/                       # FND-001 through FND-011
│   ├── FND-001_tesseract-installation.md
│   ├── FND-002_manifest-permissions.md
│   ├── FND-003_vite-wasm-config.md
│   ├── FND-004_type-definitions-file.md
│   ├── FND-005_vision-config-interface.md
│   ├── FND-006_text-result-interface.md
│   ├── FND-007_click-target-interface.md
│   ├── FND-008_conditional-config-interface.md
│   ├── FND-009_conditional-result-interface.md
│   ├── FND-010_step-interface-extension.md
│   └── FND-011_recording-interface-extension.md
│
├── 02-data-layer/                       # DAT-001 through DAT-006
│   ├── DAT-001_indexeddb-schema-v2.md
│   ├── DAT-002_schema-migration-logic.md
│   ├── DAT-003_recording-repository.md
│   ├── DAT-004_step-validation-utility.md
│   ├── DAT-005_recording-validation-utility.md
│   └── DAT-006_default-values-factory.md
│
├── 03-engine/                           # ENG-001 through ENG-018
│   ├── ENG-001_vision-engine-class.md
│   ├── ENG-002_tesseract-initialization.md
│   ├── ENG-003_screenshot-capture.md
│   ├── ENG-004_ocr-recognition.md
│   ├── ENG-005_confidence-filtering.md
│   ├── ENG-006_find-text-function.md
│   ├── ENG-007_find-all-text-function.md
│   ├── ENG-008_click-at-coordinates.md
│   ├── ENG-009_type-text-function.md
│   ├── ENG-010_send-keys-function.md
│   ├── ENG-011_scroll-function.md
│   ├── ENG-012_dropdown-handler.md
│   ├── ENG-013_input-handler.md
│   ├── ENG-014_wait-and-click-buttons.md
│   ├── ENG-015_auto-detection-failsafe.md
│   ├── ENG-016_csv-position-mapping.md
│   ├── ENG-017_step-executor-module.md
│   └── ENG-018_delay-execution-logic.md
│
├── 04-integration/                      # INT-001 through INT-009
│   ├── INT-001_vision-click-handler.md
│   ├── INT-002_vision-type-handler.md
│   ├── INT-003_vision-key-handler.md
│   ├── INT-004_vision-scroll-handler.md
│   ├── INT-005_vision-get-element-handler.md
│   ├── INT-006_screenshot-message-handler.md
│   ├── INT-007_inject-script-handler.md
│   ├── INT-008_playback-dom-vision-switch.md
│   └── INT-009_vision-fallback-recording.md
│
├── 05-ui-components/                    # UI-001 through UI-012
│   ├── UI-001_vision-badge-component.md
│   ├── UI-002_loop-start-badge-component.md
│   ├── UI-003_delay-badge-component.md
│   ├── UI-004_conditional-badge-component.md
│   ├── UI-005_delay-dialog-component.md
│   ├── UI-006_conditional-config-dialog.md
│   ├── UI-007_loop-start-dropdown.md
│   ├── UI-008_global-delay-input.md
│   ├── UI-009_add-conditional-click-menu.md
│   ├── UI-010_step-row-badge-display.md
│   ├── UI-011_set-delay-menu-item.md
│   └── UI-012_configure-conditional-menu.md
│
├── 06-testing/                          # TST-001 through TST-010
│   ├── TST-001_vision-engine-init-test.md
│   ├── TST-002_screenshot-capture-test.md
│   ├── TST-003_ocr-recognition-test.md
│   ├── TST-004_find-text-accuracy-test.md
│   ├── TST-005_coordinate-click-test.md
│   ├── TST-006_conditional-click-loop-test.md
│   ├── TST-007_vision-recording-fallback-test.md
│   ├── TST-008_schema-migration-test.md
│   ├── TST-009_csv-position-mapping-test.md
│   └── TST-010_full-copilot-workflow-test.md
│
├── 07-migration/                        # MIG-001 through MIG-005
│   ├── MIG-001_recorded-via-default.md
│   ├── MIG-002_loop-start-index-default.md
│   ├── MIG-003_global-delay-default.md
│   ├── MIG-004_conditional-defaults.md
│   └── MIG-005_backward-compatibility-verify.md
│
└── 08-documentation/                    # DOC-001 through DOC-003
    ├── DOC-001_readme-vision-features.md
    ├── DOC-002_vision-engine-api-docs.md
    └── DOC-003_troubleshooting-guide.md
```

---

## 3. COMPLETE FILE REGISTRY

### Category 1: Foundation / Architecture (FND)

| Prompt ID | File Path | Description | References |
|-----------|-----------|-------------|------------|
| 3-FND-001 | `01-foundation/FND-001_tesseract-installation.md` | Install Tesseract.js dependency | package.json, 04_architecture.md |
| 3-FND-002 | `01-foundation/FND-002_manifest-permissions.md` | Update manifest permissions | manifest.json, 04_architecture.md |
| 3-FND-003 | `01-foundation/FND-003_vite-wasm-config.md` | Configure Vite for WASM assets | vite.config.ts, 04_architecture.md |
| 3-FND-004 | `01-foundation/FND-004_type-definitions-file.md` | Create Vision types file | 05_data-layer.md |
| 3-FND-005 | `01-foundation/FND-005_vision-config-interface.md` | VisionConfig interface | 05_data-layer.md, 06_api-contracts.md |
| 3-FND-006 | `01-foundation/FND-006_text-result-interface.md` | TextResult interface | 05_data-layer.md |
| 3-FND-007 | `01-foundation/FND-007_click-target-interface.md` | ClickTarget interface | 05_data-layer.md |
| 3-FND-008 | `01-foundation/FND-008_conditional-config-interface.md` | ConditionalConfig interface | 05_data-layer.md, 03_feature-specs.md |
| 3-FND-009 | `01-foundation/FND-009_conditional-result-interface.md` | ConditionalClickResult interface | 05_data-layer.md |
| 3-FND-010 | `01-foundation/FND-010_step-interface-extension.md` | Extend Step interface with Vision fields | 05_data-layer.md, BIDIRECTIONAL_ANALYSIS.md |
| 3-FND-011 | `01-foundation/FND-011_recording-interface-extension.md` | Extend Recording interface | 05_data-layer.md, BIDIRECTIONAL_ANALYSIS.md |

### Category 2: Data Layer (DAT)

| Prompt ID | File Path | Description | References |
|-----------|-----------|-------------|------------|
| 3-DAT-001 | `02-data-layer/DAT-001_indexeddb-schema-v2.md` | IndexedDB schema version 2 | indexedDB.ts, 05_data-layer.md, 07_migration-notes.md |
| 3-DAT-002 | `02-data-layer/DAT-002_schema-migration-logic.md` | Schema migration v1→v2 | 05_data-layer.md, 07_migration-notes.md |
| 3-DAT-003 | `02-data-layer/DAT-003_recording-repository.md` | Recording data access layer | 05_data-layer.md, 06_api-contracts.md |
| 3-DAT-004 | `02-data-layer/DAT-004_step-validation-utility.md` | Step validation utility | FND-010 |
| 3-DAT-005 | `02-data-layer/DAT-005_recording-validation-utility.md` | Recording validation utility | FND-011 |
| 3-DAT-006 | `02-data-layer/DAT-006_default-values-factory.md` | Default values factory | FND-010, FND-011 |

### Category 3: Core Engine Components (ENG)

| Prompt ID | File Path | Description | References |
|-----------|-----------|-------------|------------|
| 3-ENG-001 | `03-engine/ENG-001_vision-engine-class.md` | VisionEngine class structure | 04_architecture.md, 06_api-contracts.md |
| 3-ENG-002 | `03-engine/ENG-002_tesseract-initialization.md` | Tesseract.js worker init | 04_architecture.md |
| 3-ENG-003 | `03-engine/ENG-003_screenshot-capture.md` | captureScreen() function | 06_api-contracts.md |
| 3-ENG-004 | `03-engine/ENG-004_ocr-recognition.md` | recognizeText() function | 06_api-contracts.md |
| 3-ENG-005 | `03-engine/ENG-005_confidence-filtering.md` | Confidence threshold filtering | VisionConfig |
| 3-ENG-006 | `03-engine/ENG-006_find-text-function.md` | findText() function | 06_api-contracts.md |
| 3-ENG-007 | `03-engine/ENG-007_find-all-text-function.md` | findAllText() function | 06_api-contracts.md |
| 3-ENG-008 | `03-engine/ENG-008_click-at-coordinates.md` | clickAtCoordinates() function | 06_api-contracts.md |
| 3-ENG-009 | `03-engine/ENG-009_type-text-function.md` | typeText() function | 06_api-contracts.md |
| 3-ENG-010 | `03-engine/ENG-010_send-keys-function.md` | sendKeys() function | 06_api-contracts.md |
| 3-ENG-011 | `03-engine/ENG-011_scroll-function.md` | scrollPage() function | 06_api-contracts.md |
| 3-ENG-012 | `03-engine/ENG-012_dropdown-handler.md` | handleDropdown() function | 03_feature-specs.md |
| 3-ENG-013 | `03-engine/ENG-013_input-handler.md` | handleInput() with Vision | 03_feature-specs.md |
| 3-ENG-014 | `03-engine/ENG-014_wait-and-click-buttons.md` | waitAndClickButtons() polling | 03_feature-specs.md, 06_api-contracts.md |
| 3-ENG-015 | `03-engine/ENG-015_auto-detection-failsafe.md` | Auto-detection during playback | 03_feature-specs.md |
| 3-ENG-016 | `03-engine/ENG-016_csv-position-mapping.md` | Position-based CSV mapping | 03_feature-specs.md, 05_data-layer.md |
| 3-ENG-017 | `03-engine/ENG-017_step-executor-module.md` | Unified step executor | 04_architecture.md |
| 3-ENG-018 | `03-engine/ENG-018_delay-execution-logic.md` | Global and per-step delays | 03_feature-specs.md |

### Category 4: Integration Points (INT)

| Prompt ID | File Path | Description | References |
|-----------|-----------|-------------|------------|
| 3-INT-001 | `04-integration/INT-001_vision-click-handler.md` | VISION_CLICK message handler | content.tsx, 06_api-contracts.md |
| 3-INT-002 | `04-integration/INT-002_vision-type-handler.md` | VISION_TYPE message handler | content.tsx, 06_api-contracts.md |
| 3-INT-003 | `04-integration/INT-003_vision-key-handler.md` | VISION_KEY message handler | content.tsx, 06_api-contracts.md |
| 3-INT-004 | `04-integration/INT-004_vision-scroll-handler.md` | VISION_SCROLL message handler | content.tsx, 06_api-contracts.md |
| 3-INT-005 | `04-integration/INT-005_vision-get-element-handler.md` | VISION_GET_ELEMENT handler | content.tsx, 06_api-contracts.md |
| 3-INT-006 | `04-integration/INT-006_screenshot-message-handler.md` | VISION_SCREENSHOT in background | background.ts, 04_architecture.md |
| 3-INT-007 | `04-integration/INT-007_inject-script-handler.md` | VISION_INJECT_SCRIPT handler | background.ts |
| 3-INT-008 | `04-integration/INT-008_playback-dom-vision-switch.md` | DOM/Vision execution switch | 04_architecture.md |
| 3-INT-009 | `04-integration/INT-009_vision-fallback-recording.md` | Vision fallback during recording | 03_feature-specs.md, 02_ux-flows.md |

### Category 5: UI Components (UI)

| Prompt ID | File Path | Description | References |
|-----------|-----------|-------------|------------|
| 3-UI-001 | `05-ui-components/UI-001_vision-badge-component.md` | VisionBadge component | 02_ux-flows.md |
| 3-UI-002 | `05-ui-components/UI-002_loop-start-badge-component.md` | LoopStartBadge component | 02_ux-flows.md |
| 3-UI-003 | `05-ui-components/UI-003_delay-badge-component.md` | DelayBadge component | 02_ux-flows.md |
| 3-UI-004 | `05-ui-components/UI-004_conditional-badge-component.md` | ConditionalBadge component | 02_ux-flows.md |
| 3-UI-005 | `05-ui-components/UI-005_delay-dialog-component.md` | DelayDialog modal | 02_ux-flows.md |
| 3-UI-006 | `05-ui-components/UI-006_conditional-config-dialog.md` | ConditionalConfigDialog modal | 02_ux-flows.md, 03_feature-specs.md |
| 3-UI-007 | `05-ui-components/UI-007_loop-start-dropdown.md` | Loop start dropdown in toolbar | Recorder.tsx, 02_ux-flows.md |
| 3-UI-008 | `05-ui-components/UI-008_global-delay-input.md` | Global delay input in toolbar | Recorder.tsx, 02_ux-flows.md |
| 3-UI-009 | `05-ui-components/UI-009_add-conditional-click-menu.md` | Add Conditional Click menu item | Recorder.tsx |
| 3-UI-010 | `05-ui-components/UI-010_step-row-badge-display.md` | StepRow badge rendering logic | StepRow component |
| 3-UI-011 | `05-ui-components/UI-011_set-delay-menu-item.md` | "Set Delay Before Step" menu | StepRow three-dot menu |
| 3-UI-012 | `05-ui-components/UI-012_configure-conditional-menu.md` | "Configure Conditional" menu | StepRow three-dot menu |

### Category 6: Testing & Validation (TST)

| Prompt ID | File Path | Description | References |
|-----------|-----------|-------------|------------|
| 3-TST-001 | `06-testing/TST-001_vision-engine-init-test.md` | VisionEngine initialization tests | ENG-002 |
| 3-TST-002 | `06-testing/TST-002_screenshot-capture-test.md` | Screenshot capture tests | ENG-003 |
| 3-TST-003 | `06-testing/TST-003_ocr-recognition-test.md` | OCR recognition tests | ENG-004 |
| 3-TST-004 | `06-testing/TST-004_find-text-accuracy-test.md` | findText accuracy tests | ENG-006 |
| 3-TST-005 | `06-testing/TST-005_coordinate-click-test.md` | Coordinate click tests | INT-002, ENG-008 |
| 3-TST-006 | `06-testing/TST-006_conditional-click-loop-test.md` | Conditional click polling tests | ENG-014 |
| 3-TST-007 | `06-testing/TST-007_vision-recording-fallback-test.md` | Vision fallback recording tests | INT-009 |
| 3-TST-008 | `06-testing/TST-008_schema-migration-test.md` | Schema migration tests | DAT-002 |
| 3-TST-009 | `06-testing/TST-009_csv-position-mapping-test.md` | CSV position mapping tests | ENG-016 |
| 3-TST-010 | `06-testing/TST-010_full-copilot-workflow-test.md` | Full E2E Copilot workflow test | ALL |

### Category 7: Migration Tasks (MIG)

| Prompt ID | File Path | Description | References |
|-----------|-----------|-------------|------------|
| 3-MIG-001 | `07-migration/MIG-001_recorded-via-default.md` | Add recordedVia default to steps | DAT-002 |
| 3-MIG-002 | `07-migration/MIG-002_loop-start-index-default.md` | Add loopStartIndex default | DAT-002 |
| 3-MIG-003 | `07-migration/MIG-003_global-delay-default.md` | Add globalDelayMs default | DAT-002 |
| 3-MIG-004 | `07-migration/MIG-004_conditional-defaults.md` | Add conditionalDefaults | DAT-002 |
| 3-MIG-005 | `07-migration/MIG-005_backward-compatibility-verify.md` | Verify backward compatibility | MIG-001 to MIG-004 |

### Category 8: Documentation (DOC)

| Prompt ID | File Path | Description | References |
|-----------|-----------|-------------|------------|
| 3-DOC-001 | `08-documentation/DOC-001_readme-vision-features.md` | Update README with Vision | TST-010 |
| 3-DOC-002 | `08-documentation/DOC-002_vision-engine-api-docs.md` | Vision Engine API documentation | ENG-001 to ENG-015 |
| 3-DOC-003 | `08-documentation/DOC-003_troubleshooting-guide.md` | Troubleshooting guide | TST-010 |

---

## 4. SMART PROMPT TEMPLATE

Every Smart Prompt generated by Claude will follow this exact format:

---

**COPY FROM HERE ↓**

---

**PROMPT [ID]: [TITLE IN CAPS]**

## Instructions for Copilot

Copy the content between the CONTENT START and CONTENT END markers below.
Create the file at the specified path.
Then run the commit command.

**File path:** `/build-instructions/masterplan/[category]/[filename].md`

---

## CONTENT START

```markdown
# [SPECIFICATION TITLE]

> **Build Card:** [ID]  
> **Category:** [Category Name]  
> **Dependencies:** [List of prerequisite card IDs]  
> **Risk Level:** [Low/Medium/High]  
> **Estimated Lines:** [400-600]

---

## 1. PURPOSE

[One-paragraph description of what this specification accomplishes]

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| [Reference 1] | [File path] | [Specific section/data] |
| [Reference 2] | [File path] | [Specific section/data] |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| [File path] | CREATE/MODIFY | ~[estimated] |

### Artifacts

- [List of artifacts produced]

---

## 4. DETAILED SPECIFICATION

### 4.1 [Major Section]

[Detailed content - NO PLACEHOLDERS]

### 4.2 [Major Section]

[Detailed content - NO PLACEHOLDERS]

### 4.3 [Major Section]

[Detailed content - NO PLACEHOLDERS]

---

## 5. CODE EXAMPLES

```typescript
// Complete, runnable code examples
// NO PLACEHOLDERS like "// implement here"
// All functions fully implemented
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] [Specific, testable criterion 1]
- [ ] [Specific, testable criterion 2]
- [ ] [Specific, testable criterion 3]
- [ ] [Specific, testable criterion 4]
- [ ] [Specific, testable criterion 5]

---

## 7. IMPLEMENTATION NOTES

### Constraints

- [Constraint 1]
- [Constraint 2]

### Patterns to Follow

- [Pattern 1]
- [Pattern 2]

### Edge Cases

- [Edge case 1 and how to handle]
- [Edge case 2 and how to handle]

---

## 8. VERIFICATION COMMANDS

```bash
# Commands to verify implementation
npm run type-check
npm run test -- [specific test]
```

---

## 9. ROLLBACK PROCEDURE

[How to revert if something goes wrong]

---

*End of Specification*
```

## CONTENT END

---

## Commit Command

```bash
git add /build-instructions/masterplan/[category]/[filename].md
git commit -m "Phase 3: Add [ID] - [Short description]"
```

---

**COPY TO HERE ↑**

---

## 5. CONTENT REQUIREMENTS

### For Type Definition Specs (FND-004 through FND-011)

Each spec MUST contain:
- Complete interface definition with JSDoc comments
- All properties with types and descriptions
- Default values documented
- Export statements
- Usage examples
- Type guards if applicable

### For Engine Component Specs (ENG-001 through ENG-018)

Each spec MUST contain:
- Complete function signatures
- Algorithm description (step-by-step)
- Error handling strategy
- Timeout handling
- Return value documentation
- Integration points
- Complete code examples (not stubs)

### For Integration Specs (INT-001 through INT-009)

Each spec MUST contain:
- Message type definition
- Handler function signature
- Content script vs background script location
- Message flow diagram (ASCII)
- Complete implementation code
- Error response format

### For UI Component Specs (UI-001 through UI-012)

Each spec MUST contain:
- Component props interface
- Complete JSX structure
- Tailwind CSS classes
- Event handlers
- State management
- Accessibility attributes
- Complete code (not fragments)

### For Testing Specs (TST-001 through TST-010)

Each spec MUST contain:
- Test file location
- Test framework (Vitest)
- Complete test cases
- Mock setup
- Assertion patterns
- Coverage targets

### For Migration Specs (MIG-001 through MIG-005)

Each spec MUST contain:
- Data transformation logic
- Rollback procedure
- Verification queries
- Edge cases

### For Documentation Specs (DOC-001 through DOC-003)

Each spec MUST contain:
- Complete markdown content
- Code examples
- Screenshots/diagrams (described)
- User-facing language

---

## 6. QUALITY GATES

Every specification file must pass these checks:

| Gate | Requirement |
|------|-------------|
| ☐ Line Count | 400-600 lines (complete content) |
| ☐ No Placeholders | Zero instances of "TODO", "TBD", "implement here", "[...]" |
| ☐ All Sections | Every required section is filled |
| ☐ Code Complete | All code examples are runnable, not stubs |
| ☐ References Valid | All referenced files exist |
| ☐ Acceptance Criteria | 5+ specific, testable criteria |
| ☐ Commit Command | Matches actual file path |
| ☐ Dependencies Listed | All prerequisite cards identified |

**If any gate fails, regenerate the prompt before proceeding.**

---

## 7. EXECUTION SEQUENCE

### Dependency Layers

Prompts must be executed in dependency order. Execute all prompts in a layer before moving to the next.

```
LAYER 0: No Dependencies (Execute First)
├── FND-001  Tesseract Installation
├── FND-002  Manifest Permissions
├── FND-003  Vite WASM Config
└── FND-004  Type Definitions File

LAYER 1: Depends on FND-004
├── FND-005  VisionConfig Interface
├── FND-006  TextResult Interface
├── FND-007  ClickTarget Interface
├── FND-008  ConditionalConfig Interface
└── FND-009  ConditionalClickResult Interface

LAYER 2: Depends on FND-008
├── FND-010  Step Interface Extension
└── FND-011  Recording Interface Extension

LAYER 3: Depends on FND-010, FND-011
├── DAT-001  IndexedDB Schema v2
└── DAT-004  Step Validation

LAYER 4: Depends on DAT-001
├── DAT-002  Schema Migration
├── DAT-003  Recording Repository
├── DAT-005  Recording Validation
└── DAT-006  Default Values Factory

LAYER 5: Depends on Layer 4
├── ENG-001  VisionEngine Class
├── ENG-016  CSV Position Mapping
└── UI-005   DelayDialog Component

LAYER 6: Depends on ENG-001
├── ENG-002 through ENG-015  (Engine methods)
└── INT-001 through INT-007  (Message handlers)

LAYER 7: Depends on Layer 6
├── INT-008  DOM/Vision Switch
├── INT-009  Vision Fallback
└── ENG-017  Step Executor

LAYER 8: UI Components (Depends on Interfaces)
├── UI-001 through UI-004  (Badges)
├── UI-006  ConditionalConfigDialog
├── UI-007 through UI-012  (Toolbar/Menu)

LAYER 9: Testing (Depends on Implementation)
├── TST-001 through TST-010

LAYER 10: Migration (Depends on DAT-002)
├── MIG-001 through MIG-005

LAYER 11: Documentation (Final)
├── DOC-001 through DOC-003
```

### Parallelization Opportunities

Within each layer, these groups can be done in parallel:

- **FND-005 through FND-009** - All type interfaces
- **UI-001 through UI-004** - All badge components
- **MIG-001 through MIG-004** - All migration defaults

---

## 8. STATUS TRACKER TEMPLATE

Create this file at:
`/build-instructions/masterplan/_PHASE_3_STATUS_TRACKER.md`

```markdown
# PHASE 3 STATUS TRACKER

> **Started:** [Date]  
> **Last Updated:** [Date]  
> **Completed:** 0 / 67

---

## LAYER 0: Foundation (No Dependencies)

| Prompt ID | File | Status | Date | Notes |
|-----------|------|--------|------|-------|
| 3-FND-001 | FND-001_tesseract-installation.md | ⬜ Pending | | |
| 3-FND-002 | FND-002_manifest-permissions.md | ⬜ Pending | | |
| 3-FND-003 | FND-003_vite-wasm-config.md | ⬜ Pending | | |
| 3-FND-004 | FND-004_type-definitions-file.md | ⬜ Pending | | |

## LAYER 1: Type Interfaces

| Prompt ID | File | Status | Date | Notes |
|-----------|------|--------|------|-------|
| 3-FND-005 | FND-005_vision-config-interface.md | ⬜ Pending | | |
| 3-FND-006 | FND-006_text-result-interface.md | ⬜ Pending | | |
| 3-FND-007 | FND-007_click-target-interface.md | ⬜ Pending | | |
| 3-FND-008 | FND-008_conditional-config-interface.md | ⬜ Pending | | |
| 3-FND-009 | FND-009_conditional-result-interface.md | ⬜ Pending | | |

## LAYER 2: Extended Interfaces

| Prompt ID | File | Status | Date | Notes |
|-----------|------|--------|------|-------|
| 3-FND-010 | FND-010_step-interface-extension.md | ⬜ Pending | | |
| 3-FND-011 | FND-011_recording-interface-extension.md | ⬜ Pending | | |

## LAYER 3: Data Layer Foundation

| Prompt ID | File | Status | Date | Notes |
|-----------|------|--------|------|-------|
| 3-DAT-001 | DAT-001_indexeddb-schema-v2.md | ⬜ Pending | | |
| 3-DAT-004 | DAT-004_step-validation-utility.md | ⬜ Pending | | |

## LAYER 4: Data Layer Complete

| Prompt ID | File | Status | Date | Notes |
|-----------|------|--------|------|-------|
| 3-DAT-002 | DAT-002_schema-migration-logic.md | ⬜ Pending | | |
| 3-DAT-003 | DAT-003_recording-repository.md | ⬜ Pending | | |
| 3-DAT-005 | DAT-005_recording-validation-utility.md | ⬜ Pending | | |
| 3-DAT-006 | DAT-006_default-values-factory.md | ⬜ Pending | | |

## LAYER 5: Engine Foundation

| Prompt ID | File | Status | Date | Notes |
|-----------|------|--------|------|-------|
| 3-ENG-001 | ENG-001_vision-engine-class.md | ⬜ Pending | | |
| 3-ENG-016 | ENG-016_csv-position-mapping.md | ⬜ Pending | | |
| 3-UI-005 | UI-005_delay-dialog-component.md | ⬜ Pending | | |

## LAYER 6: Engine Methods & Handlers

| Prompt ID | File | Status | Date | Notes |
|-----------|------|--------|------|-------|
| 3-ENG-002 | ENG-002_tesseract-initialization.md | ⬜ Pending | | |
| 3-ENG-003 | ENG-003_screenshot-capture.md | ⬜ Pending | | |
| 3-ENG-004 | ENG-004_ocr-recognition.md | ⬜ Pending | | |
| 3-ENG-005 | ENG-005_confidence-filtering.md | ⬜ Pending | | |
| 3-ENG-006 | ENG-006_find-text-function.md | ⬜ Pending | | |
| 3-ENG-007 | ENG-007_find-all-text-function.md | ⬜ Pending | | |
| 3-ENG-008 | ENG-008_click-at-coordinates.md | ⬜ Pending | | |
| 3-ENG-009 | ENG-009_type-text-function.md | ⬜ Pending | | |
| 3-ENG-010 | ENG-010_send-keys-function.md | ⬜ Pending | | |
| 3-ENG-011 | ENG-011_scroll-function.md | ⬜ Pending | | |
| 3-ENG-012 | ENG-012_dropdown-handler.md | ⬜ Pending | | |
| 3-ENG-013 | ENG-013_input-handler.md | ⬜ Pending | | |
| 3-ENG-014 | ENG-014_wait-and-click-buttons.md | ⬜ Pending | | |
| 3-ENG-015 | ENG-015_auto-detection-failsafe.md | ⬜ Pending | | |
| 3-INT-001 | INT-001_vision-click-handler.md | ⬜ Pending | | |
| 3-INT-002 | INT-002_vision-type-handler.md | ⬜ Pending | | |
| 3-INT-003 | INT-003_vision-key-handler.md | ⬜ Pending | | |
| 3-INT-004 | INT-004_vision-scroll-handler.md | ⬜ Pending | | |
| 3-INT-005 | INT-005_vision-get-element-handler.md | ⬜ Pending | | |
| 3-INT-006 | INT-006_screenshot-message-handler.md | ⬜ Pending | | |
| 3-INT-007 | INT-007_inject-script-handler.md | ⬜ Pending | | |

## LAYER 7: Integration

| Prompt ID | File | Status | Date | Notes |
|-----------|------|--------|------|-------|
| 3-INT-008 | INT-008_playback-dom-vision-switch.md | ⬜ Pending | | |
| 3-INT-009 | INT-009_vision-fallback-recording.md | ⬜ Pending | | |
| 3-ENG-017 | ENG-017_step-executor-module.md | ⬜ Pending | | |
| 3-ENG-018 | ENG-018_delay-execution-logic.md | ⬜ Pending | | |

## LAYER 8: UI Components

| Prompt ID | File | Status | Date | Notes |
|-----------|------|--------|------|-------|
| 3-UI-001 | UI-001_vision-badge-component.md | ⬜ Pending | | |
| 3-UI-002 | UI-002_loop-start-badge-component.md | ⬜ Pending | | |
| 3-UI-003 | UI-003_delay-badge-component.md | ⬜ Pending | | |
| 3-UI-004 | UI-004_conditional-badge-component.md | ⬜ Pending | | |
| 3-UI-006 | UI-006_conditional-config-dialog.md | ⬜ Pending | | |
| 3-UI-007 | UI-007_loop-start-dropdown.md | ⬜ Pending | | |
| 3-UI-008 | UI-008_global-delay-input.md | ⬜ Pending | | |
| 3-UI-009 | UI-009_add-conditional-click-menu.md | ⬜ Pending | | |
| 3-UI-010 | UI-010_step-row-badge-display.md | ⬜ Pending | | |
| 3-UI-011 | UI-011_set-delay-menu-item.md | ⬜ Pending | | |
| 3-UI-012 | UI-012_configure-conditional-menu.md | ⬜ Pending | | |

## LAYER 9: Testing

| Prompt ID | File | Status | Date | Notes |
|-----------|------|--------|------|-------|
| 3-TST-001 | TST-001_vision-engine-init-test.md | ⬜ Pending | | |
| 3-TST-002 | TST-002_screenshot-capture-test.md | ⬜ Pending | | |
| 3-TST-003 | TST-003_ocr-recognition-test.md | ⬜ Pending | | |
| 3-TST-004 | TST-004_find-text-accuracy-test.md | ⬜ Pending | | |
| 3-TST-005 | TST-005_coordinate-click-test.md | ⬜ Pending | | |
| 3-TST-006 | TST-006_conditional-click-loop-test.md | ⬜ Pending | | |
| 3-TST-007 | TST-007_vision-recording-fallback-test.md | ⬜ Pending | | |
| 3-TST-008 | TST-008_schema-migration-test.md | ⬜ Pending | | |
| 3-TST-009 | TST-009_csv-position-mapping-test.md | ⬜ Pending | | |
| 3-TST-010 | TST-010_full-copilot-workflow-test.md | ⬜ Pending | | |

## LAYER 10: Migration

| Prompt ID | File | Status | Date | Notes |
|-----------|------|--------|------|-------|
| 3-MIG-001 | MIG-001_recorded-via-default.md | ⬜ Pending | | |
| 3-MIG-002 | MIG-002_loop-start-index-default.md | ⬜ Pending | | |
| 3-MIG-003 | MIG-003_global-delay-default.md | ⬜ Pending | | |
| 3-MIG-004 | MIG-004_conditional-defaults.md | ⬜ Pending | | |
| 3-MIG-005 | MIG-005_backward-compatibility-verify.md | ⬜ Pending | | |

## LAYER 11: Documentation

| Prompt ID | File | Status | Date | Notes |
|-----------|------|--------|------|-------|
| 3-DOC-001 | DOC-001_readme-vision-features.md | ⬜ Pending | | |
| 3-DOC-002 | DOC-002_vision-engine-api-docs.md | ⬜ Pending | | |
| 3-DOC-003 | DOC-003_troubleshooting-guide.md | ⬜ Pending | | |

---

## STATUS KEY

| Symbol | Meaning |
|--------|---------|
| ⬜ | Pending |
| 🔄 | In Progress |
| ✅ | Complete |
| ❌ | Blocked |
| ⚠️ | Needs Review |

---

*Last updated: [timestamp]*
```

---

## 9. EXECUTION INSTRUCTIONS

### Starting Phase 3

1. **Ensure Prerequisites**
   - Phase 1 rollups in Claude Knowledge Base
   - Phase 2 specs in Claude Knowledge Base
   - BIDIRECTIONAL_ANALYSIS.md in Claude Knowledge Base
   - BUILD_CARD_BACKLOG.md in Claude Knowledge Base

2. **Load This Manual**
   - Upload to Claude Project Knowledge
   - Commit to repo at `/analysis-resources/implementation-guides/PHASE_3_MANUAL.md`

3. **Create Status Tracker**
   - Copy Section 8 template
   - Commit to `/build-instructions/masterplan/_PHASE_3_STATUS_TRACKER.md`

4. **Begin Generation**
   - Say to Claude: `continue`
   - Or request specific prompt: `Generate 3-FND-001`

### During Execution

**For Each Prompt:**

1. Claude generates Smart Prompt
2. You copy EVERYTHING between markers
3. Paste into Copilot
4. Copilot creates file and commits
5. Update status tracker: ⬜ → ✅
6. Return to Claude, say `continue`

**If Prompt Fails Quality Gate:**

- Tell Claude: `Regenerate [ID] - [issue]`
- Example: `Regenerate 3-FND-005 - missing code examples`

**If You Need to Stop:**

- Note last completed prompt ID
- Resume with: `continue from [ID]`

---

## 10. COMPLETION CRITERIA

Phase 3 is complete when:

| Criterion | Check |
|-----------|-------|
| All 67 prompts generated | Status tracker shows 67 ✅ |
| All files committed | `git log` shows 67+ commits |
| Directory structure complete | All folders created per Section 2 |
| No pending dependencies | Layer 11 complete |
| Quality gates passed | No TODOs, TBDs, or placeholders |

---

**END OF PHASE 3 MANUAL**

---

*When ready to begin, say: `continue`*
