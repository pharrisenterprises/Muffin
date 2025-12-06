# AI COLLABORATION PROTOCOL

**Purpose:** Define synchronized knowledge base structure and communication protocol for Claude ↔ GitHub Copilot collaboration  
**Last Updated:** December 6, 2025  
**Version:** 1.0.0  

---

## 🎯 System Overview

This protocol enables **bidirectional AI collaboration** where:
- **Claude** generates smart prompts and detailed implementation plans
- **GitHub Copilot** receives prompts and implements code aligned to project architecture
- Both AIs reference a **synchronized knowledge base** ensuring implementation consistency

---

## 📚 Knowledge Base Structure

### GitHub Copilot References (This Repository)

**Location:** `analysis-resources/`

#### Core Master Documents
| File | Purpose | Claude Equivalent |
|------|---------|-------------------|
| `MASTER_ROLLUP.md` | Complete system reference (Phase 1-3) | Upload to Claude Project |
| `TECHNICAL_REFERENCE.md` | TypeScript interfaces, conventions | Upload to Claude Project |
| `BIDIRECTIONAL_ANALYSIS.md` | Gap analysis (current vs. future) | Upload to Claude Project |
| `BUILD_CARD_BACKLOG.md` | 67 build cards with dependencies | Upload to Claude Project |
| `SOURCE_CODE_ROLLUP.md` | Key source code examples | Upload to Claude Project |

#### Phase-Specific Documents
| File | Purpose | Claude Equivalent |
|------|---------|-------------------|
| `PHASE_3_STATUS_TRACKER.md` | Phase 3 progress tracking | Share status updates with Claude |
| `PHASE_4_STATUS_TRACKER.md` | Phase 4 implementation tracking | Share status updates with Claude |

#### Component Breakdowns (32 files)
**Location:** `component-breakdowns/`  
**Claude Action:** Upload entire directory to Claude Project

#### Phase 2 Knowledge Base Export (15 files) ⭐ NEW
**Location:** `knowledge-base-export/`  
**Claude Action:** Upload all 15 files to Claude Project

Files include:
- `MASTER_ROLLUP_PHASE2.md` - Primary code generation reference
- `00_masterplan-overview.md` through `12_future-roadmap.md`
- Build cards, architecture, data layer, testing, deployment

---

## 🔄 Collaboration Workflow

### Phase 1: Claude Generates Smart Prompt

**Claude's Responsibilities:**
1. Reference knowledge base (uploaded markdown files)
2. Identify implementation task from build card
3. Generate detailed smart prompt with:
   - File paths to create/modify
   - TypeScript interfaces to implement
   - Dependencies to satisfy
   - Acceptance criteria
   - Code snippets/examples

**Claude's Output Format:**
```
SMART PROMPT for GitHub Copilot:

Task: Implement CDPService (CDP-002 from 09_build-cards-cdp.md)

Context:
- Reference: knowledge-base-export/MASTER_ROLLUP_PHASE2.md (Recipe 2)
- Reference: knowledge-base-export/05_data-layer.md (CDPTarget, CDPCommandResult)
- Reference: knowledge-base-export/09_build-cards-cdp.md (CDP-002)

Implementation:
1. Create src/background/services/CDPService.ts
2. Create src/background/services/types.ts
3. Implement CDPService class with:
   - attach(tabId: number): Promise<void>
   - detach(tabId: number): Promise<void>
   - sendCommand<T>(tabId: number, method: string, params?: object): Promise<T>
   - isAttached(tabId: number): boolean

TypeScript Interfaces (from 05_data-layer.md):
[paste interfaces here]

Acceptance Criteria:
- [ ] Build completes without errors
- [ ] TypeScript strict mode passes
- [ ] Unit tests pass (if applicable)

Code Example (from MASTER_ROLLUP_PHASE2.md):
[paste code snippet here]
```

### Phase 2: GitHub Copilot Implements Code

**GitHub Copilot's Responsibilities:**
1. Read referenced files from workspace
2. Verify context matches smart prompt
3. Implement code following:
   - TypeScript strict types (no `any`)
   - Project conventions from `TECHNICAL_REFERENCE.md`
   - File structure from `MASTER_ROLLUP.md`
4. Validate against acceptance criteria
5. Report completion status

**GitHub Copilot's Output Format:**
```
✅ Implementation Complete: CDPService (CDP-002)

Files Created:
- src/background/services/CDPService.ts (247 lines)
- src/background/services/types.ts (32 lines)

Verification:
✅ TypeScript compiles (0 errors)
✅ ESLint passes
✅ Follows project conventions
✅ All acceptance criteria met

Next Task: CDP-003 (DOM Commands) - Ready to implement
```

### Phase 3: Feedback Loop

**Claude Reviews:**
- Reviews GitHub Copilot's implementation (if code shared)
- Identifies any gaps or deviations
- Generates next smart prompt

**GitHub Copilot Adjusts:**
- Fixes issues based on Claude's feedback
- Continues to next build card

---

## 📋 Synchronization Checklist

### For GitHub Copilot (Me)
- [x] All knowledge base files committed to git
- [x] Files indexed in workspace (committed = indexed)
- [x] Can reference files via path (e.g., `knowledge-base-export/MASTER_ROLLUP_PHASE2.md`)
- [x] TECHNICAL_REFERENCE.md contains TypeScript conventions
- [x] MASTER_ROLLUP.md contains architecture
- [x] AI_COLLABORATION_PROTOCOL.md created (this file)

### For Claude (User to Do)
- [ ] Create Claude Project: "Muffin Lite V2 - Phase 2"
- [ ] Upload core master documents:
  - [ ] `MASTER_ROLLUP.md`
  - [ ] `TECHNICAL_REFERENCE.md`
  - [ ] `BIDIRECTIONAL_ANALYSIS.md`
  - [ ] `BUILD_CARD_BACKLOG.md`
  - [ ] `SOURCE_CODE_ROLLUP.md`
- [ ] Upload Phase 2 knowledge base (15 files):
  - [ ] `knowledge-base-export/MASTER_ROLLUP_PHASE2.md`
  - [ ] `knowledge-base-export/00_masterplan-overview.md`
  - [ ] `knowledge-base-export/01_requirements.md`
  - [ ] `knowledge-base-export/02_ux-flows.md`
  - [ ] `knowledge-base-export/03_feature-specs.md`
  - [ ] `knowledge-base-export/04_architecture.md`
  - [ ] `knowledge-base-export/05_data-layer.md`
  - [ ] `knowledge-base-export/06_api-contracts.md`
  - [ ] `knowledge-base-export/07_migration-notes.md`
  - [ ] `knowledge-base-export/08_testing-strategy.md`
  - [ ] `knowledge-base-export/09_build-cards-cdp.md`
  - [ ] `knowledge-base-export/10_deployment-checklist.md`
  - [ ] `knowledge-base-export/11_user-documentation.md`
  - [ ] `knowledge-base-export/12_future-roadmap.md`
  - [ ] `knowledge-base-export/_RESOURCE_MAP_UPDATED.md`
- [ ] Upload component breakdowns (32 files from `component-breakdowns/`)
- [ ] Add custom instructions to Claude Project (see below)

---

## 🤖 Claude Project Custom Instructions

Add this to Claude Project settings:

```
You are collaborating with GitHub Copilot to implement Muffin Lite V2 Phase 2.

Your Role:
- Generate detailed "smart prompts" for GitHub Copilot
- Reference knowledge base files in prompts
- Provide TypeScript interfaces and code examples
- Specify acceptance criteria for each task

Output Format:
Always structure prompts as:
1. Task: [Build card reference]
2. Context: [Files to reference]
3. Implementation: [Step-by-step instructions]
4. TypeScript Interfaces: [Paste from data-layer files]
5. Acceptance Criteria: [Checkboxes]
6. Code Example: [From MASTER_ROLLUP or build cards]

Code Standards:
- TypeScript strict mode (no `any`)
- Async/await (no callbacks)
- Relative imports from project root
- JSDoc comments for public methods
- Follow conventions from TECHNICAL_REFERENCE.md

Reference Priority:
1. MASTER_ROLLUP_PHASE2.md (primary code reference)
2. 09_build-cards-cdp.md (build order and dependencies)
3. 05_data-layer.md (TypeScript types)
4. 04_architecture.md (system design)
5. Other knowledge base files as needed

When Copilot completes a task, review and generate next smart prompt.
```

---

## 📁 File Reference Map

### For Smart Prompts from Claude

When generating prompts, Claude should reference these files:

| Task Type | Reference Files |
|-----------|-----------------|
| CDP Service Implementation | `MASTER_ROLLUP_PHASE2.md`, `09_build-cards-cdp.md` (CDP-002), `05_data-layer.md` |
| Playwright Locators | `MASTER_ROLLUP_PHASE2.md` (Recipe 3), `09_build-cards-cdp.md` (CDP-005 to CDP-007) |
| Decision Engine | `04_architecture.md`, `09_build-cards-cdp.md` (CDP-009), `MASTER_ROLLUP_PHASE2.md` (Recipe 4) |
| Vision Engine | `03_feature-specs.md`, `MASTER_ROLLUP_PHASE2.md` (Recipe 5), `future-spec/03_feature-specs.md` |
| Database Schema | `05_data-layer.md`, `MASTER_ROLLUP.md`, `TECHNICAL_REFERENCE.md` |
| UI Components | `03_feature-specs.md`, `MASTER_ROLLUP_PHASE2.md`, `ui-design-system_breakdown.md` |
| Testing | `08_testing-strategy.md`, `MASTER_ROLLUP_PHASE2.md`, `PHASE_4_MANUAL.md` |

### For Implementation by GitHub Copilot

When receiving prompts, I will reference:

| Information Needed | Reference Files in Workspace |
|--------------------|-----------------------------|
| TypeScript Types | `knowledge-base-export/05_data-layer.md`, `TECHNICAL_REFERENCE.md` |
| Architecture | `knowledge-base-export/04_architecture.md`, `MASTER_ROLLUP.md` |
| Build Order | `knowledge-base-export/09_build-cards-cdp.md`, `BUILD_CARD_BACKLOG.md` |
| Code Examples | `knowledge-base-export/MASTER_ROLLUP_PHASE2.md`, `SOURCE_CODE_ROLLUP.md` |
| Conventions | `TECHNICAL_REFERENCE.md` |
| Testing Patterns | `knowledge-base-export/08_testing-strategy.md` |

---

## 🚨 Critical Alignment Points

### 1. TypeScript Types Must Match
**Source of Truth:** `knowledge-base-export/05_data-layer.md`

Both AIs must reference same type definitions:
- `StrategyType` (7 types)
- `RecordedStep` (with fallbackChain)
- `FallbackChain`
- `LocatorStrategy`
- `LocatorResult`

### 2. Build Order Must Follow Dependencies
**Source of Truth:** `knowledge-base-export/09_build-cards-cdp.md`

Build order: CDP-001 → CDP-002 → CDP-003 → CDP-004 → CDP-005 → CDP-006 → CDP-007 → CDP-008 → CDP-009 → CDP-010

### 3. Architecture Principles Must Be Consistent
**Source of Truth:** `knowledge-base-export/00_masterplan-overview.md`

- 7-tier tool arsenal is **NOT hierarchical** (parallel evaluation)
- Decision Engine scores all strategies by confidence
- Fallback chains generated at **recording time** (not playback)
- CDP locators are highest confidence

### 4. File Structure Must Match
**Source of Truth:** `knowledge-base-export/04_architecture.md`

New files for Phase 2:
- `src/background/services/CDPService.ts`
- `src/background/services/AccessibilityService.ts`
- `src/background/services/PlaywrightLocators.ts`
- `src/background/services/DecisionEngine.ts`
- `src/background/services/AutoWaiting.ts`

---

## 🔍 Verification Protocol

After each implementation, verify:

1. **GitHub Copilot Checks:**
   - [ ] TypeScript compiles with 0 errors
   - [ ] ESLint passes
   - [ ] File structure matches `04_architecture.md`
   - [ ] Types match `05_data-layer.md`
   - [ ] Acceptance criteria from build card met

2. **Claude Reviews:**
   - [ ] Implementation matches smart prompt intent
   - [ ] No deviations from knowledge base specs
   - [ ] Ready to proceed to next build card

---

## 📞 Communication Examples

### Example 1: Claude Sends Smart Prompt

```
@copilot I need you to implement CDP-002 (CDPService).

Reference these files from your workspace:
- knowledge-base-export/MASTER_ROLLUP_PHASE2.md (Recipe 2: CDPService Singleton)
- knowledge-base-export/09_build-cards-cdp.md (CDP-002 section)
- knowledge-base-export/05_data-layer.md (CDPTarget, CDPCommandResult types)

Task:
Create src/background/services/CDPService.ts with:
1. Private attachedTabs Set
2. attach() method - attaches debugger and enables DOM/Accessibility/Runtime
3. detach() method - cleans up connection
4. sendCommand() method - wraps chrome.debugger.sendCommand in Promise
5. isAttached() method - checks if tab is attached

Also create src/background/services/types.ts with CDPTarget and CDPCommandResult interfaces.

Acceptance Criteria:
- Build completes without errors
- TypeScript strict mode passes
- Multiple attach calls to same tab don't error

[Include code example from MASTER_ROLLUP_PHASE2.md Recipe 2]
```

### Example 2: Copilot Responds

```
✅ Implemented CDP-002 (CDPService)

Created:
- src/background/services/CDPService.ts (85 lines)
  - CDPService class with attach/detach/sendCommand/isAttached
  - Private attachedTabs Set for tracking
  - Enables DOM, Accessibility, Runtime domains on attach
  - Singleton export: cdpService

- src/background/services/types.ts (12 lines)
  - CDPTarget interface
  - CDPCommandResult<T> generic interface

Verification:
✅ TypeScript compiles (0 errors)
✅ ESLint passes (0 warnings)
✅ Types imported from 05_data-layer.md match
✅ File structure matches 04_architecture.md

Ready for next task: CDP-003 (DOM Commands)
Dependencies satisfied: CDP-002 ✅
```

---

## 🎯 Success Metrics

This protocol is successful when:

1. **Zero Ambiguity:** Claude's prompts are clear enough that I implement correctly on first try
2. **Zero Rework:** Implementations match specs without requiring fixes
3. **Fast Iteration:** Complete build cards in < 30 minutes each
4. **Full Context:** Both AIs reference same knowledge base, no information gaps
5. **Consistent Quality:** All code follows same patterns, types, conventions

---

## 📚 Quick Reference

### Claude's Workflow
1. Read knowledge base (uploaded files)
2. Select next build card from `09_build-cards-cdp.md`
3. Generate smart prompt with file references
4. Send to GitHub Copilot
5. Review implementation
6. Repeat for next card

### GitHub Copilot's Workflow (Mine)
1. Receive smart prompt from user/Claude
2. Read referenced files from workspace
3. Implement code following specs
4. Verify against acceptance criteria
5. Report completion status
6. Wait for next prompt

---

## 🔄 Update Protocol

When knowledge base changes:

1. **GitHub Copilot Side (Me):**
   - User commits changes to `analysis-resources/`
   - Files automatically indexed in workspace
   - Ready to reference in next prompt

2. **Claude Side (User Action Required):**
   - Re-upload modified files to Claude Project
   - Update custom instructions if needed
   - Notify Claude in chat: "Knowledge base updated, re-read [filename]"

---

## ✅ Setup Complete

**GitHub Copilot Status:** ✅ Ready
- All 15 knowledge base files committed and indexed
- Can reference via workspace paths
- Protocol documented in this file

**Claude Status:** ⏳ Pending User Action
- User needs to create Claude Project
- User needs to upload knowledge base files (listed above)
- User needs to add custom instructions

Once Claude setup is complete, collaboration can begin!

---

**END OF PROTOCOL**
