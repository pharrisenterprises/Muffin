# PHASE 4: CODE GENERATION MANUAL

> **Project:** Muffin Lite Vision Enhancement  
> **Generated:** December 2, 2025  
> **Total Implementations:** 67 Build Cards  
> **Estimated Duration:** 4-5 hours  
> **Schema Version:** v1 → v3

---

## TABLE OF CONTENTS

1. [Core Principles](#1-core-principles)
2. [Implementation Order](#2-implementation-order)
3. [Dependency Graph](#3-dependency-graph)
4. [Implementation Details by Category](#4-implementation-details-by-category)
5. [Smart Prompt Template](#5-smart-prompt-template)
6. [Code Standards Reminder](#6-code-standards-reminder)
7. [Testing Requirements](#7-testing-requirements)
8. [Status Tracker Template](#8-status-tracker-template)
9. [Error Handling & Rollback](#9-error-handling--rollback)

---

## 1. CORE PRINCIPLES

### The Division of Labor

| Actor | Responsibility |
|-------|----------------|
| **Claude** | Generates COMPLETE code embedded in prompts |
| **Copilot** | Creates files, runs tests, commits if passing |

**Critical Rules:**
- ✅ Claude generates ALL implementation code
- ✅ Copilot creates files exactly as specified
- ✅ Tests MUST pass before commit
- ❌ Copilot does NOT modify or generate code
- ❌ Never commit failing tests

### Pre-Implementation Checklist

Before starting any implementation:

```
□ Verify repo is up-to-date (git pull)
□ Verify all Phase 3 specs are in knowledge base
□ Verify TECHNICAL_REFERENCE.md is accessible
□ Confirm schema version target (v3)
□ Backup existing recordings (optional but recommended)
```

---

## 2. IMPLEMENTATION ORDER

### Critical Path Overview

The implementation follows strict dependency layers. Complete ALL items in a layer before moving to the next.

```
LAYER 0: Foundation Setup (No Dependencies)
    ↓
LAYER 1: Type Interfaces (Depends on LAYER 0)
    ↓
LAYER 2: Extended Interfaces (Depends on LAYER 1)
    ↓
LAYER 3: Data Layer Foundation (Depends on LAYER 2)
    ↓
LAYER 4: Data Layer Complete (Depends on LAYER 3)
    ↓
LAYER 5: Engine Foundation (Depends on LAYER 4)
    ↓
LAYER 6: Engine Methods & Handlers (Depends on LAYER 5)
    ↓
LAYER 7: Integration Points (Depends on LAYER 6)
    ↓
LAYER 8: UI Components (Depends on Interfaces)
    ↓
LAYER 9: Testing (Depends on Implementation)
    ↓
LAYER 10: Migration (Depends on DAT-002)
    ↓
LAYER 11: Documentation (Final)
```

### Recommended First 10 Cards

Execute these cards first to establish the foundation:

| Order | Card ID | Title | Reason |
|-------|---------|-------|--------|
| 1 | FND-001 | Install Tesseract.js | Required dependency |
| 2 | FND-002 | Update Manifest Permissions | Required for APIs |
| 3 | FND-004 | Create Type Definitions File | Foundation for all types |
| 4 | FND-005 | Define VisionConfig Interface | Needed by VisionEngine |
| 5 | FND-006 | Define TextResult Interface | Needed by OCR methods |
| 6 | FND-007 | Define ClickTarget Interface | Needed by search methods |
| 7 | FND-008 | Define ConditionalConfig Interface | Needed by Step |
| 8 | FND-010 | Extend Step Interface | Core data model change |
| 9 | FND-011 | Extend Recording Interface | Core data model change |
| 10 | ENG-001 | Create VisionEngine Skeleton | Start core implementation |

**After first 10:** Continue with DAT-001, DAT-002 (schema), then ENG-002 through ENG-006 (OCR core).

---

## 3. DEPENDENCY GRAPH

### Layer 0: Foundation Setup (No Dependencies)

| Card ID | Description | Files | Est. Time |
|---------|-------------|-------|-----------|
| FND-001 | Install Tesseract.js | `package.json` | 5 min |
| FND-002 | Update Manifest Permissions | `manifest.json` | 5 min |
| FND-003 | Configure Vite for WASM | `vite.config.ts` | 10 min |
| FND-004 | Create Type Definitions File | `src/types/vision.ts` | 5 min |

### Layer 1: Type Interfaces (Depends on FND-004)

| Card ID | Description | Files | Est. Time |
|---------|-------------|-------|-----------|
| FND-005 | VisionConfig Interface | `src/types/vision.ts` | 5 min |
| FND-006 | TextResult Interface | `src/types/vision.ts` | 5 min |
| FND-007 | ClickTarget Interface | `src/types/vision.ts` | 5 min |
| FND-008 | ConditionalConfig Interface | `src/types/vision.ts` | 5 min |
| FND-009 | ConditionalClickResult Interface | `src/types/vision.ts` | 5 min |

**Parallelizable:** Yes - All can be done simultaneously

### Layer 2: Extended Interfaces (Depends on FND-008)

| Card ID | Description | Files | Est. Time |
|---------|-------------|-------|-----------|
| FND-010 | Extend Step Interface | `src/types/vision.ts` | 15 min |
| FND-011 | Extend Recording Interface | `src/types/vision.ts` | 15 min |

### Layer 3: Data Layer Foundation (Depends on FND-010, FND-011)

| Card ID | Description | Files | Est. Time |
|---------|-------------|-------|-----------|
| DAT-001 | IndexedDB Schema v2 | `src/background/indexedDB.ts` | 20 min |
| DAT-004 | Step Validation Utility | `src/lib/validation/stepValidation.ts` | 15 min |

### Layer 4: Data Layer Complete (Depends on DAT-001)

| Card ID | Description | Files | Est. Time |
|---------|-------------|-------|-----------|
| DAT-002 | Schema Migration Logic | `src/lib/schemaMigration.ts` | 25 min |
| DAT-003 | Recording Repository | `src/lib/repositories/recordingRepository.ts` | 20 min |
| DAT-005 | Recording Validation | `src/lib/validation/recordingValidation.ts` | 15 min |
| DAT-006 | Default Values Factory | `src/lib/defaults.ts` | 10 min |

### Layer 5: Engine Foundation (Depends on Layer 4)

| Card ID | Description | Files | Est. Time |
|---------|-------------|-------|-----------|
| ENG-001 | VisionEngine Class Skeleton | `src/lib/visionEngine.ts` | 20 min |
| ENG-016 | CSV Position Mapping | `src/lib/csvPositionMapping.ts` | 20 min |
| UI-005 | DelayDialog Component | `src/components/dialogs/DelayDialog.tsx` | 15 min |

### Layer 6: Engine Methods (Depends on ENG-001)

| Card ID | Description | Files | Est. Time |
|---------|-------------|-------|-----------|
| ENG-002 | Tesseract Initialization | `src/lib/visionEngine.ts` | 15 min |
| ENG-003 | Screenshot Capture | `src/lib/visionEngine.ts` | 10 min |
| ENG-004 | OCR Recognition | `src/lib/visionEngine.ts` | 15 min |
| ENG-005 | Confidence Filtering | `src/lib/visionEngine.ts` | 10 min |
| ENG-006 | findText Function | `src/lib/visionEngine.ts` | 15 min |
| ENG-007 | findAllText Function | `src/lib/visionEngine.ts` | 10 min |
| ENG-008 | clickAtCoordinates | `src/lib/visionEngine.ts` | 10 min |
| ENG-009 | typeText Function | `src/lib/visionEngine.ts` | 10 min |
| ENG-010 | sendKeys Function | `src/lib/visionEngine.ts` | 10 min |
| ENG-011 | scroll Function | `src/lib/visionEngine.ts` | 10 min |
| ENG-012 | Dropdown Handler | `src/lib/visionEngine.ts` | 15 min |
| ENG-013 | Input Handler | `src/lib/visionEngine.ts` | 10 min |
| ENG-014 | waitAndClickButtons | `src/lib/visionEngine.ts` | 20 min |
| ENG-015 | Auto-Detection Failsafe | `src/lib/visionEngine.ts` | 15 min |
| ENG-017 | Step Executor Module | `src/lib/stepExecutor.ts` | 20 min |
| ENG-018 | Delay Execution Logic | `src/lib/stepExecutor.ts` | 10 min |

### Layer 7: Integration Points (Depends on Layer 6)

| Card ID | Description | Files | Est. Time |
|---------|-------------|-------|-----------|
| INT-001 | VISION_CLICK Handler | `src/contentScript/visionHandlers.ts` | 10 min |
| INT-002 | VISION_TYPE Handler | `src/contentScript/visionHandlers.ts` | 10 min |
| INT-003 | VISION_KEY Handler | `src/contentScript/visionHandlers.ts` | 10 min |
| INT-004 | VISION_SCROLL Handler | `src/contentScript/visionHandlers.ts` | 10 min |
| INT-005 | VISION_GET_ELEMENT Handler | `src/contentScript/visionHandlers.ts` | 10 min |
| INT-006 | Screenshot Message Handler | `src/background/background.ts` | 10 min |
| INT-007 | Inject Script Handler | `src/background/background.ts` | 10 min |
| INT-008 | DOM/Vision Switch | `src/lib/playbackEngine.ts` | 15 min |
| INT-009 | Vision Fallback Recording | `src/contentScript/recorder.ts` | 20 min |

### Layer 8: UI Components (Depends on Interfaces)

| Card ID | Description | Files | Est. Time |
|---------|-------------|-------|-----------|
| UI-001 | VisionBadge Component | `src/components/recorder/VisionBadge.tsx` | 10 min |
| UI-002 | LoopStartBadge Component | `src/components/recorder/LoopStartBadge.tsx` | 10 min |
| UI-003 | DelayBadge Component | `src/components/recorder/DelayBadge.tsx` | 10 min |
| UI-004 | ConditionalBadge Component | `src/components/recorder/ConditionalBadge.tsx` | 10 min |
| UI-006 | ConditionalConfigDialog | `src/components/dialogs/ConditionalConfigDialog.tsx` | 20 min |
| UI-007 | Loop Start Dropdown | `src/pages/Recorder.tsx` (modify) | 15 min |
| UI-008 | Global Delay Input | `src/pages/Recorder.tsx` (modify) | 10 min |
| UI-009 | Add Conditional Click Menu | `src/pages/Recorder.tsx` (modify) | 15 min |
| UI-010 | StepRow Badge Display | `src/components/Recorder/StepRow.tsx` (modify) | 15 min |
| UI-011 | Set Delay Menu Item | `src/components/Recorder/StepRow.tsx` (modify) | 10 min |
| UI-012 | Configure Conditional Menu | `src/components/Recorder/StepRow.tsx` (modify) | 10 min |

**Parallelizable:** UI-001 through UI-004 can be done simultaneously

### Layer 9: Testing (Depends on Implementation)

| Card ID | Description | Files | Est. Time |
|---------|-------------|-------|-----------|
| TST-001 | VisionEngine Init Test | `src/__tests__/visionEngine.test.ts` | 15 min |
| TST-002 | Screenshot Capture Test | `src/__tests__/visionEngine.test.ts` | 10 min |
| TST-003 | OCR Recognition Test | `src/__tests__/visionEngine.test.ts` | 15 min |
| TST-004 | findText Accuracy Test | `src/__tests__/visionEngine.test.ts` | 15 min |
| TST-005 | Coordinate Click Test | `src/__tests__/visionEngine.test.ts` | 10 min |
| TST-006 | Conditional Click Loop Test | `src/__tests__/conditionalClick.test.ts` | 20 min |
| TST-007 | Vision Recording Fallback Test | `src/__tests__/visionRecording.test.ts` | 15 min |
| TST-008 | Schema Migration Test | `src/__tests__/schemaMigration.test.ts` | 15 min |
| TST-009 | CSV Position Mapping Test | `src/__tests__/csvMapping.test.ts` | 15 min |
| TST-010 | Full Copilot Workflow E2E | Manual testing procedure | 30 min |

### Layer 10: Migration (Depends on DAT-002)

| Card ID | Description | Files | Est. Time |
|---------|-------------|-------|-----------|
| MIG-001 | recordedVia Default | `src/lib/schemaMigration.ts` | 10 min |
| MIG-002 | loopStartIndex Default | `src/lib/schemaMigration.ts` | 10 min |
| MIG-003 | globalDelayMs Default | `src/lib/schemaMigration.ts` | 10 min |
| MIG-004 | conditionalDefaults | `src/lib/schemaMigration.ts` | 10 min |
| MIG-005 | Backward Compatibility Verify | Manual verification | 15 min |

**Parallelizable:** MIG-001 through MIG-004 are done together in DAT-002

### Layer 11: Documentation (Final)

| Card ID | Description | Files | Est. Time |
|---------|-------------|-------|-----------|
| DOC-001 | README Vision Features | `README.md` | 20 min |
| DOC-002 | Vision Engine API Docs | `docs/API.md` | 30 min |
| DOC-003 | Troubleshooting Guide | `docs/TROUBLESHOOTING.md` | 20 min |

---

## 4. IMPLEMENTATION DETAILS BY CATEGORY

### Category 1: Foundation / Architecture (FND)

#### FND-001: Install Tesseract.js Dependency

**Source Spec:** `build-instructions/masterplan/01-foundation/FND-001_tesseract-installation.md`

**Files to Create/Modify:**
- `package.json` (MODIFY)

**Implementation:**
```bash
npm install tesseract.js --save
```

**Verification Commands:**
```bash
npm ls tesseract.js
npm run build
```

**Acceptance Criteria:**
- [ ] tesseract.js ^5.0.0 in dependencies
- [ ] npm run build succeeds
- [ ] No peer dependency warnings

---

#### FND-002: Update Manifest Permissions

**Source Spec:** `build-instructions/masterplan/01-foundation/FND-002_manifest-permissions.md`

**Files to Create/Modify:**
- `manifest.json` (MODIFY)

**Integration Points:**
- Chrome APIs: tabs, scripting, captureVisibleTab

**Code Pattern:**
```json
{
  "permissions": ["activeTab", "tabs", "storage", "scripting"],
  "host_permissions": ["<all_urls>"],
  "web_accessible_resources": [{
    "resources": ["*.wasm", "*.traineddata"],
    "matches": ["<all_urls>"]
  }]
}
```

**Acceptance Criteria:**
- [ ] Extension loads without errors
- [ ] Version bumped to 2.1.0
- [ ] No permission warnings in console

---

#### FND-004: Create Type Definitions File

**Source Spec:** `build-instructions/masterplan/01-foundation/FND-004_type-definitions-file.md`

**Files to Create:**
- `src/types/vision.ts` (CREATE)
- `src/types/index.ts` (CREATE or MODIFY)

**Code Pattern:**
```typescript
// src/types/vision.ts
export interface VisionConfig {
  confidenceThreshold: number;  // 0-100, default 60
  pollIntervalMs: number;       // default 1000
  scrollRetries: number;        // default 3
  useSIMD?: boolean;            // default true
  language?: string;            // default 'eng'
  debugMode?: boolean;          // default false
}

// ... additional interfaces
```

**Acceptance Criteria:**
- [ ] TypeScript compiles without errors
- [ ] Types importable from `../types/vision`
- [ ] JSDoc comments on all interfaces

---

#### FND-010: Extend Step Interface

**Source Spec:** `build-instructions/masterplan/01-foundation/FND-010_step-interface-extension.md`

**Files to Modify:**
- `src/types/vision.ts` (or existing Step location)

**Integration Points:**
- Current Step interface in `src/pages/content.tsx`
- StepRow component rendering
- Replayer execution logic

**New Fields:**
```typescript
interface Step {
  // === EXISTING FIELDS ===
  id?: number;
  label: string;
  event: StepEventType;
  value?: string;
  selector?: string;
  xpath?: string;
  url?: string;
  timestamp?: number;
  order?: number;
  
  // === NEW FIELDS (Phase 3) ===
  recordedVia: 'dom' | 'vision';
  coordinates?: { x: number; y: number; width: number; height: number };
  ocrText?: string;
  confidenceScore?: number;
  delaySeconds?: number;
  conditionalConfig?: ConditionalConfig | null;
}

type StepEventType = 'open' | 'input' | 'click' | 'dropdown' | 'conditional-click';
```

**Acceptance Criteria:**
- [ ] All new fields are optional (backward compatible)
- [ ] recordedVia defaults to 'dom' for existing steps
- [ ] TypeScript compiles without errors

---

### Category 2: Data Layer (DAT)

#### DAT-001: IndexedDB Schema v2

**Source Spec:** `build-instructions/masterplan/02-data-layer/DAT-001_indexeddb-schema-v2.md`

**Files to Modify:**
- `src/background/indexedDB.ts`

**Integration Points:**
- Dexie.js database instance
- All repository operations
- Schema migration logic

**Code Pattern:**
```typescript
this.version(2).stores({
  projects: '++id, projectName, isPublic',
  bundles: '++id, bundleName, projectId, isPublic',
  testRuns: '++id, bundleId, projectId, status',
  recordings: '++id, projectId, name, createdAt'
}).upgrade(tx => {
  return tx.table('projects').toCollection().modify(project => {
    project.loopStartIndex = project.loopStartIndex ?? 0;
    project.globalDelayMs = project.globalDelayMs ?? 0;
    project.conditionalDefaults = project.conditionalDefaults ?? {
      searchTerms: ['Allow', 'Keep'],
      timeoutSeconds: 120
    };
  });
});
```

**Acceptance Criteria:**
- [ ] Schema version incremented to 2
- [ ] Upgrade function handles v1 → v2 migration
- [ ] Existing data preserved after upgrade

---

#### DAT-002: Schema Migration Logic

**Source Spec:** `build-instructions/masterplan/02-data-layer/DAT-002_schema-migration-logic.md`

**Files to Create:**
- `src/lib/schemaMigration.ts` (CREATE)

**Integration Points:**
- Called by StorageService.loadRecording()
- Called by IndexedDB upgrade function
- Uses FND-010, FND-011 interfaces

**Key Functions:**
```typescript
export function migrateRecording(recording: any): Recording {
  // Ensure immutability
  const migrated = { ...recording };
  
  // Add defaults for new fields
  migrated.schemaVersion = 3;
  migrated.loopStartIndex = recording.loopStartIndex ?? 0;
  migrated.globalDelayMs = recording.globalDelayMs ?? 0;
  migrated.conditionalDefaults = recording.conditionalDefaults ?? {
    searchTerms: ['Allow', 'Keep'],
    timeoutSeconds: 120
  };
  
  // Migrate steps
  migrated.steps = (recording.steps || []).map(migrateStep);
  
  return migrated;
}

export function migrateStep(step: any): Step {
  return {
    ...step,
    recordedVia: step.recordedVia ?? 'dom',
    delaySeconds: step.delaySeconds ?? null,
    conditionalConfig: step.conditionalConfig ?? null
  };
}
```

**Acceptance Criteria:**
- [ ] Migration is idempotent (running twice = no change)
- [ ] Original data not mutated
- [ ] All defaults preserve existing behavior
- [ ] Tests pass for edge cases

---

### Category 3: Core Engine (ENG)

#### ENG-001: VisionEngine Class Skeleton

**Source Spec:** `build-instructions/masterplan/03-engine/ENG-001_vision-engine-class.md`

**Files to Create:**
- `src/lib/visionEngine.ts` (CREATE)

**Integration Points:**
- Tesseract.js worker management
- Chrome tabs API for screenshots
- Content script message handlers

**Class Structure:**
```typescript
import { EventEmitter } from 'events';
import Tesseract from 'tesseract.js';
import type { VisionConfig, TextResult, ClickTarget } from '../types/vision';

export class VisionEngine extends EventEmitter {
  private worker: Tesseract.Worker | null = null;
  private isInit: boolean = false;
  private config: VisionConfig;
  
  constructor(config?: Partial<VisionConfig>) {
    super();
    this.config = { ...DEFAULT_VISION_CONFIG, ...config };
  }
  
  // Lifecycle
  async initialize(): Promise<void> { /* ENG-002 */ }
  async terminate(): Promise<void> { /* ENG-002 */ }
  get isInitialized(): boolean { return this.isInit; }
  
  // Screenshot
  async captureScreenshot(tabId?: number): Promise<Screenshot> { /* ENG-003 */ }
  
  // OCR
  async recognizeText(imageData: string | ImageData): Promise<OcrResult> { /* ENG-004 */ }
  
  // Search
  async findText(searchText: string | RegExp): Promise<ClickTarget | null> { /* ENG-006 */ }
  async findAllText(searchText: string | RegExp): Promise<ClickTarget[]> { /* ENG-007 */ }
  
  // Click
  async clickAt(x: number, y: number): Promise<ClickResult> { /* ENG-008 */ }
  
  // Conditional
  async waitAndClickButtons(config: ConditionalConfig): Promise<ConditionalClickResult> { /* ENG-014 */ }
}

export const DEFAULT_VISION_CONFIG: VisionConfig = {
  confidenceThreshold: 60,
  pollIntervalMs: 1000,
  scrollRetries: 3,
  useSIMD: true,
  language: 'eng',
  debugMode: false
};
```

**Acceptance Criteria:**
- [ ] Class instantiates without errors
- [ ] All method stubs present
- [ ] DEFAULT_VISION_CONFIG exported
- [ ] TypeScript compiles

---

#### ENG-014: waitAndClickButtons (Conditional Click)

**Source Spec:** `build-instructions/masterplan/03-engine/ENG-014_wait-and-click-buttons.md`

**Files to Modify:**
- `src/lib/visionEngine.ts`

**Integration Points:**
- Uses findText() method (ENG-006)
- Uses clickAt() method (ENG-008)
- Called by Step Executor (ENG-017)

**Code Pattern:**
```typescript
async waitAndClickButtons(config: ConditionalConfig): Promise<ConditionalClickResult> {
  const startTime = Date.now();
  const timeout = config.timeoutSeconds * 1000;
  let buttonsClicked = 0;
  
  while (Date.now() - startTime < timeout) {
    // Capture fresh screenshot
    const screenshot = await this.captureScreenshot();
    const ocrResult = await this.recognizeText(screenshot.dataUrl);
    
    // Search for any matching button text
    for (const term of config.searchTerms) {
      const target = await this.findText(term);
      if (target && target.confidence >= this.config.confidenceThreshold) {
        await this.clickAt(target.center.x, target.center.y);
        buttonsClicked++;
        
        // Wait for UI to update
        await this.sleep(500);
        break;
      }
    }
    
    // Check for success text if provided
    if (config.successText) {
      const successTarget = await this.findText(config.successText);
      if (successTarget) {
        return { buttonsClicked, timedOut: false, duration: Date.now() - startTime };
      }
    }
    
    await this.sleep(this.config.pollIntervalMs);
  }
  
  return { buttonsClicked, timedOut: true, duration: Date.now() - startTime };
}
```

**Acceptance Criteria:**
- [ ] Polls at configured interval
- [ ] Clicks all matching buttons found
- [ ] Exits on timeout
- [ ] Returns accurate button count
- [ ] Handles success text exit condition

---

### Category 4: Integration Points (INT)

#### INT-001: VISION_CLICK Handler

**Source Spec:** `build-instructions/masterplan/04-integration/INT-001_vision-click-handler.md`

**Files to Create:**
- `src/contentScript/visionHandlers.ts` (CREATE)

**Integration Points:**
- Chrome runtime message listener
- Document.elementFromPoint API
- MouseEvent dispatch

**Code Pattern:**
```typescript
// src/contentScript/visionHandlers.ts

export function handleVisionClick(x: number, y: number): { success: boolean; element?: string } {
  try {
    const element = document.elementFromPoint(x, y);
    if (!element) {
      return { success: false };
    }
    
    // Scroll into view if needed
    element.scrollIntoView({ block: 'center', behavior: 'instant' });
    
    // Dispatch mouse events
    const events = ['mousedown', 'mouseup', 'click'];
    events.forEach(eventType => {
      const event = new MouseEvent(eventType, {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: x,
        clientY: y
      });
      element.dispatchEvent(event);
    });
    
    return { success: true, element: element.tagName };
  } catch (error) {
    console.error('Vision click failed:', error);
    return { success: false };
  }
}

// Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'VISION_CLICK') {
    const result = handleVisionClick(message.x, message.y);
    sendResponse(result);
    return true;
  }
});
```

**Acceptance Criteria:**
- [ ] Element found at coordinates
- [ ] Click events dispatched in correct order
- [ ] Returns element tagName on success
- [ ] Handles errors gracefully

---

### Category 5: UI Components (UI)

#### UI-001: VisionBadge Component

**Source Spec:** `build-instructions/masterplan/05-ui-components/UI-001_vision-badge-component.md`

**Files to Create:**
- `src/components/recorder/VisionBadge.tsx` (CREATE)

**Integration Points:**
- StepRow component
- Tailwind CSS classes
- cn() utility from `src/lib/utils`

**Code Pattern:**
```typescript
// src/components/recorder/VisionBadge.tsx

import { cn } from '../../lib/utils';

interface VisionBadgeProps {
  className?: string;
}

export function VisionBadge({ className }: VisionBadgeProps) {
  return (
    <span className={cn(
      "px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700",
      className
    )}>
      👁️ Vision
    </span>
  );
}
```

**Acceptance Criteria:**
- [ ] Renders purple badge with eye emoji
- [ ] Accepts className prop for customization
- [ ] No hydration errors

---

#### UI-006: ConditionalConfigDialog Component

**Source Spec:** `build-instructions/masterplan/05-ui-components/UI-006_conditional-config-dialog.md`

**Files to Create:**
- `src/components/dialogs/ConditionalConfigDialog.tsx` (CREATE)

**Integration Points:**
- Radix UI Dialog component
- ConditionalConfig interface (FND-008)
- Recorder.tsx state management

**Code Pattern:**
```typescript
// src/components/dialogs/ConditionalConfigDialog.tsx

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import type { ConditionalConfig } from '../../types/vision';

interface ConditionalConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialConfig?: ConditionalConfig;
  onSave: (config: ConditionalConfig) => void;
}

export function ConditionalConfigDialog({
  open,
  onOpenChange,
  initialConfig,
  onSave
}: ConditionalConfigDialogProps) {
  const [searchTerms, setSearchTerms] = useState(
    initialConfig?.searchTerms?.join(', ') || 'Allow, Keep'
  );
  const [timeout, setTimeout] = useState(
    initialConfig?.timeoutSeconds?.toString() || '120'
  );
  const [interactionType, setInteractionType] = useState<'click' | 'dropdown' | 'input'>(
    initialConfig?.interactionType || 'click'
  );
  const [dropdownOption, setDropdownOption] = useState(
    initialConfig?.dropdownOption || ''
  );
  
  const handleSave = () => {
    const config: ConditionalConfig = {
      searchTerms: searchTerms.split(',').map(s => s.trim()).filter(Boolean),
      timeoutSeconds: parseInt(timeout) || 120,
      interactionType,
      dropdownOption: interactionType === 'dropdown' ? dropdownOption : undefined
    };
    onSave(config);
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configure Conditional Click</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <Label>Search Terms (comma-separated)</Label>
            <Input
              value={searchTerms}
              onChange={e => setSearchTerms(e.target.value)}
              placeholder="Allow, Keep, Continue"
            />
          </div>
          
          <div>
            <Label>Timeout (seconds)</Label>
            <Input
              type="number"
              min="1"
              max="3600"
              value={timeout}
              onChange={e => setTimeout(e.target.value)}
            />
          </div>
          
          {/* Additional fields... */}
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Acceptance Criteria:**
- [ ] Modal opens and closes correctly
- [ ] All 4 config fields present
- [ ] Dropdown option shows conditionally
- [ ] Parses comma-separated terms correctly
- [ ] Calls onSave with valid config

---

## 5. SMART PROMPT TEMPLATE

Use this template for ALL code generation prompts sent to Claude.

---

**PROMPT P4-[ID]: [MODULE NAME]**

### Instructions for Copilot

Create the files listed below, run tests, and commit ONLY if all tests pass.

---

### Files to Create

| # | Path | Action |
|---|------|--------|
| 1 | `/src/[path]/[file].ts` | CREATE |
| 2 | `/src/__tests__/[file].test.ts` | CREATE |

---

### FILE 1: [file].ts

```typescript
/**
 * [Module Name]
 * 
 * Purpose: [One-line description]
 * Build Card: [ID]
 * Dependencies: [List]
 */

// COMPLETE IMPLEMENTATION CODE HERE
// No placeholders or TODO comments
// All functions fully implemented
```

---

### FILE 2: [file].test.ts

```typescript
/**
 * Tests for [Module Name]
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { [exports] } from '../[path]/[file]';

describe('[ModuleName]', () => {
  beforeEach(() => {
    // Setup
  });
  
  afterEach(() => {
    // Cleanup
  });
  
  it('should [test case 1]', () => {
    // Test implementation
  });
  
  it('should [test case 2]', () => {
    // Test implementation
  });
});
```

---

### Verification Commands

```bash
# Type checking
npm run type-check

# Run specific tests
npm run test -- [test-file-pattern]

# Build verification
npm run build
```

---

### Commit Command (ONLY if tests pass)

```bash
git add [files]
git commit -m "feat(vision): [P4-ID] [Short description]"
```

---

### Rollback Command (if needed)

```bash
git checkout HEAD -- [files]
```

---

## 6. CODE STANDARDS REMINDER

### Import Patterns

**All imports use relative paths. NO `@/` aliases.**

```typescript
// ✅ CORRECT - Relative imports
import { Button } from "../../components/ui/button";
import { cn } from "../../lib/utils";
import { VisionEngine } from "../lib/visionEngine";
import { VisionConfig, Step } from "../types/vision";

// ❌ WRONG - Alias imports
import { Button } from "@/components/ui/button";
import { VisionEngine } from "@/lib/visionEngine";
```

### Common Import Paths

```typescript
// Vision Engine
import { VisionEngine } from '../lib/visionEngine';

// Types
import { 
  VisionConfig, 
  Step, 
  Recording, 
  ConditionalConfig 
} from '../types/vision';

// Step Executor
import { executeStep } from '../lib/stepExecutor';

// CSV Mapping
import { 
  buildStepToColumnMapping, 
  substituteVariables 
} from '../lib/csvPositionMapping';

// Schema Migration
import { migrateRecording } from '../lib/schemaMigration';

// UI Components
import { cn } from '../lib/utils';
import { Button } from '../components/ui/button';
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `VisionBadge`, `ConditionalClickPanel` |
| Functions | camelCase | `executeStep`, `captureScreenshot` |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_VISION_CONFIG` |
| Interfaces | PascalCase | `VisionConfig`, `Step` |
| Types | PascalCase | `RecordedVia`, `StepEventType` |
| Files | kebab-case | `vision-engine.ts`, `csv-position-mapping.ts` |

### Export Patterns

| Type | Pattern |
|------|---------|
| Pages | Default export |
| Components | Named export |
| Utilities | Named export |
| Classes | Named export |
| Constants | Named export |

### Async/Await Patterns

```typescript
// ✅ CORRECT - Always use try/catch with async
async function executeStep(step: Step): Promise<StepResult> {
  try {
    const result = await visionEngine.clickAt(step.coordinates.x, step.coordinates.y);
    return { success: true, result };
  } catch (error) {
    console.error('Step execution failed:', error);
    return { success: false, error: String(error) };
  }
}

// ✅ CORRECT - Check initialization before use
if (!visionEngine.isInitialized) {
  await visionEngine.initialize();
}
```

### Error Handling

```typescript
// VisionEngine errors
class VisionError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'VisionError';
  }
}

// Usage
throw new VisionError(
  'OCR confidence below threshold',
  'OCR_LOW_CONFIDENCE',
  true
);
```

---

## 7. TESTING REQUIREMENTS

### Test File Naming and Location

| Source File | Test File |
|-------------|-----------|
| `src/lib/visionEngine.ts` | `src/__tests__/visionEngine.test.ts` |
| `src/lib/stepExecutor.ts` | `src/__tests__/stepExecutor.test.ts` |
| `src/lib/schemaMigration.ts` | `src/__tests__/schemaMigration.test.ts` |
| `src/lib/csvPositionMapping.ts` | `src/__tests__/csvMapping.test.ts` |
| `src/components/recorder/VisionBadge.tsx` | `src/__tests__/components/VisionBadge.test.tsx` |

### Minimum Test Coverage Per Category

| Category | Min Coverage | Focus Areas |
|----------|--------------|-------------|
| Foundation (FND) | 80% | Type validation, defaults |
| Data Layer (DAT) | 90% | Migration correctness, validation |
| Engine (ENG) | 85% | OCR accuracy, click reliability |
| Integration (INT) | 75% | Message handling, error cases |
| UI (UI) | 70% | Render, props, user interaction |

### Test Categories

#### Unit Tests (Required for all ENG, DAT)

```typescript
describe('VisionEngine', () => {
  describe('initialize', () => {
    it('should create Tesseract worker', async () => {});
    it('should reject if already initialized', async () => {});
    it('should emit ready event', async () => {});
  });
  
  describe('captureScreenshot', () => {
    it('should return base64 PNG data', async () => {});
    it('should capture current tab by default', async () => {});
  });
  
  describe('findText', () => {
    it('should find exact text matches', async () => {});
    it('should return null for no matches', async () => {});
    it('should filter by confidence threshold', async () => {});
  });
});
```

#### Integration Tests (Required for INT)

```typescript
describe('Vision Content Handlers', () => {
  it('should click element at coordinates', async () => {
    // Inject content script
    // Send VISION_CLICK message
    // Verify element was clicked
  });
  
  it('should type text in active element', async () => {
    // Focus input element
    // Send VISION_TYPE message
    // Verify text was entered
  });
});
```

#### E2E Tests (Manual for TST-010)

**Test Procedure:**

1. **Setup:**
   - Load extension in Chrome
   - Open claude.ai/chat
   - Create new project

2. **Recording Test:**
   - Click Record
   - Navigate to Copilot prompt input
   - Verify Vision fallback triggers for Monaco editor
   - Enter test prompt
   - Click send
   - Stop recording
   - Verify step has `recordedVia: 'vision'`

3. **Playback Test:**
   - Add 3 CSV rows with different prompts
   - Set loop start to step 3
   - Set global delay to 1000ms
   - Add conditional click for "Allow"
   - Run test
   - Verify all rows execute correctly
   - Verify delays applied
   - Verify conditional clicks handled

4. **Expected Results:**
   - [ ] All 3 prompts submitted
   - [ ] Delays visible between steps
   - [ ] Approval buttons clicked when found

### Test Utilities

```typescript
// src/__tests__/utils/mockChrome.ts
export function mockChromeAPIs() {
  global.chrome = {
    tabs: {
      captureVisibleTab: jest.fn().mockResolvedValue('data:image/png;base64,...'),
      query: jest.fn().mockResolvedValue([{ id: 1 }])
    },
    runtime: {
      sendMessage: jest.fn(),
      onMessage: { addListener: jest.fn() }
    },
    storage: {
      sync: { get: jest.fn(), set: jest.fn() }
    }
  } as any;
}

// src/__tests__/utils/mockTesseract.ts
export function mockTesseract() {
  return {
    createWorker: jest.fn().mockResolvedValue({
      loadLanguage: jest.fn(),
      initialize: jest.fn(),
      recognize: jest.fn().mockResolvedValue({
        data: {
          words: [
            { text: 'Allow', confidence: 95, bbox: { x0: 100, y0: 100, x1: 150, y1: 120 } }
          ]
        }
      }),
      terminate: jest.fn()
    })
  };
}
```

---

## 8. STATUS TRACKER TEMPLATE

Create this file at: `/build-instructions/masterplan/_PHASE_4_STATUS_TRACKER.md`

```markdown
# PHASE 4 STATUS TRACKER

> **Started:** [Date]
> **Last Updated:** [Date]
> **Completed:** 0 / 67

---

## LAYER 0: Foundation Setup

| Card ID | File | Status | Tested | Committed | Notes |
|---------|------|--------|--------|-----------|-------|
| FND-001 | package.json | ⬜ Pending | ⬜ | ⬜ | |
| FND-002 | manifest.json | ⬜ Pending | ⬜ | ⬜ | |
| FND-003 | vite.config.ts | ⬜ Pending | ⬜ | ⬜ | |
| FND-004 | src/types/vision.ts | ⬜ Pending | ⬜ | ⬜ | |

## LAYER 1: Type Interfaces

| Card ID | File | Status | Tested | Committed | Notes |
|---------|------|--------|--------|-----------|-------|
| FND-005 | VisionConfig | ⬜ Pending | ⬜ | ⬜ | |
| FND-006 | TextResult | ⬜ Pending | ⬜ | ⬜ | |
| FND-007 | ClickTarget | ⬜ Pending | ⬜ | ⬜ | |
| FND-008 | ConditionalConfig | ⬜ Pending | ⬜ | ⬜ | |
| FND-009 | ConditionalClickResult | ⬜ Pending | ⬜ | ⬜ | |

## LAYER 2: Extended Interfaces

| Card ID | File | Status | Tested | Committed | Notes |
|---------|------|--------|--------|-----------|-------|
| FND-010 | Step Interface | ⬜ Pending | ⬜ | ⬜ | |
| FND-011 | Recording Interface | ⬜ Pending | ⬜ | ⬜ | |

## LAYER 3-4: Data Layer

| Card ID | File | Status | Tested | Committed | Notes |
|---------|------|--------|--------|-----------|-------|
| DAT-001 | IndexedDB Schema | ⬜ Pending | ⬜ | ⬜ | |
| DAT-002 | Schema Migration | ⬜ Pending | ⬜ | ⬜ | |
| DAT-003 | Recording Repository | ⬜ Pending | ⬜ | ⬜ | |
| DAT-004 | Step Validation | ⬜ Pending | ⬜ | ⬜ | |
| DAT-005 | Recording Validation | ⬜ Pending | ⬜ | ⬜ | |
| DAT-006 | Defaults Factory | ⬜ Pending | ⬜ | ⬜ | |

## LAYER 5-6: Engine

| Card ID | File | Status | Tested | Committed | Notes |
|---------|------|--------|--------|-----------|-------|
| ENG-001 | VisionEngine Skeleton | ⬜ Pending | ⬜ | ⬜ | |
| ENG-002 | Tesseract Init | ⬜ Pending | ⬜ | ⬜ | |
| ENG-003 | Screenshot Capture | ⬜ Pending | ⬜ | ⬜ | |
| ENG-004 | OCR Recognition | ⬜ Pending | ⬜ | ⬜ | |
| ENG-005 | Confidence Filter | ⬜ Pending | ⬜ | ⬜ | |
| ENG-006 | findText | ⬜ Pending | ⬜ | ⬜ | |
| ENG-007 | findAllText | ⬜ Pending | ⬜ | ⬜ | |
| ENG-008 | clickAtCoordinates | ⬜ Pending | ⬜ | ⬜ | |
| ENG-009 | typeText | ⬜ Pending | ⬜ | ⬜ | |
| ENG-010 | sendKeys | ⬜ Pending | ⬜ | ⬜ | |
| ENG-011 | scroll | ⬜ Pending | ⬜ | ⬜ | |
| ENG-012 | Dropdown Handler | ⬜ Pending | ⬜ | ⬜ | |
| ENG-013 | Input Handler | ⬜ Pending | ⬜ | ⬜ | |
| ENG-014 | waitAndClickButtons | ⬜ Pending | ⬜ | ⬜ | |
| ENG-015 | Auto-Detection | ⬜ Pending | ⬜ | ⬜ | |
| ENG-016 | CSV Position Mapping | ⬜ Pending | ⬜ | ⬜ | |
| ENG-017 | Step Executor | ⬜ Pending | ⬜ | ⬜ | |
| ENG-018 | Delay Execution | ⬜ Pending | ⬜ | ⬜ | |

## LAYER 7: Integration

| Card ID | File | Status | Tested | Committed | Notes |
|---------|------|--------|--------|-----------|-------|
| INT-001 | VISION_CLICK | ⬜ Pending | ⬜ | ⬜ | |
| INT-002 | VISION_TYPE | ⬜ Pending | ⬜ | ⬜ | |
| INT-003 | VISION_KEY | ⬜ Pending | ⬜ | ⬜ | |
| INT-004 | VISION_SCROLL | ⬜ Pending | ⬜ | ⬜ | |
| INT-005 | VISION_GET_ELEMENT | ⬜ Pending | ⬜ | ⬜ | |
| INT-006 | Screenshot Handler | ⬜ Pending | ⬜ | ⬜ | |
| INT-007 | Inject Script | ⬜ Pending | ⬜ | ⬜ | |
| INT-008 | DOM/Vision Switch | ⬜ Pending | ⬜ | ⬜ | |
| INT-009 | Vision Fallback | ⬜ Pending | ⬜ | ⬜ | |

## LAYER 8: UI Components

| Card ID | File | Status | Tested | Committed | Notes |
|---------|------|--------|--------|-----------|-------|
| UI-001 | VisionBadge | ⬜ Pending | ⬜ | ⬜ | |
| UI-002 | LoopStartBadge | ⬜ Pending | ⬜ | ⬜ | |
| UI-003 | DelayBadge | ⬜ Pending | ⬜ | ⬜ | |
| UI-004 | ConditionalBadge | ⬜ Pending | ⬜ | ⬜ | |
| UI-005 | DelayDialog | ⬜ Pending | ⬜ | ⬜ | |
| UI-006 | ConditionalConfigDialog | ⬜ Pending | ⬜ | ⬜ | |
| UI-007 | Loop Start Dropdown | ⬜ Pending | ⬜ | ⬜ | |
| UI-008 | Global Delay Input | ⬜ Pending | ⬜ | ⬜ | |
| UI-009 | Add Conditional Menu | ⬜ Pending | ⬜ | ⬜ | |
| UI-010 | StepRow Badges | ⬜ Pending | ⬜ | ⬜ | |
| UI-011 | Set Delay Menu | ⬜ Pending | ⬜ | ⬜ | |
| UI-012 | Configure Conditional Menu | ⬜ Pending | ⬜ | ⬜ | |

## LAYER 9: Testing

| Card ID | Description | Status | Notes |
|---------|-------------|--------|-------|
| TST-001 | VisionEngine Init | ⬜ Pending | |
| TST-002 | Screenshot Capture | ⬜ Pending | |
| TST-003 | OCR Recognition | ⬜ Pending | |
| TST-004 | findText Accuracy | ⬜ Pending | |
| TST-005 | Coordinate Click | ⬜ Pending | |
| TST-006 | Conditional Loop | ⬜ Pending | |
| TST-007 | Vision Fallback | ⬜ Pending | |
| TST-008 | Schema Migration | ⬜ Pending | |
| TST-009 | CSV Mapping | ⬜ Pending | |
| TST-010 | Full E2E | ⬜ Pending | |

## LAYER 10: Migration

| Card ID | Description | Status | Notes |
|---------|-------------|--------|-------|
| MIG-001 | recordedVia Default | ⬜ Pending | |
| MIG-002 | loopStartIndex Default | ⬜ Pending | |
| MIG-003 | globalDelayMs Default | ⬜ Pending | |
| MIG-004 | conditionalDefaults | ⬜ Pending | |
| MIG-005 | Compatibility Verify | ⬜ Pending | |

## LAYER 11: Documentation

| Card ID | Description | Status | Notes |
|---------|-------------|--------|-------|
| DOC-001 | README Update | ⬜ Pending | |
| DOC-002 | API Documentation | ⬜ Pending | |
| DOC-003 | Troubleshooting | ⬜ Pending | |

---

## Status Legend

- ⬜ Pending - Not started
- 🔄 In Progress - Currently working
- ✅ Complete - Finished and verified
- ❌ Blocked - Cannot proceed
- ⏸️ Paused - Temporarily stopped

---

## Session Notes

### Session 1: [Date]
- Started: [Time]
- Completed: [Cards]
- Issues: [Notes]

### Session 2: [Date]
- Started: [Time]
- Completed: [Cards]
- Issues: [Notes]
```

---

## 9. ERROR HANDLING & ROLLBACK

### If Tests Fail

**DO NOT COMMIT.** Follow this procedure:

1. **Capture the error:**
   ```bash
   npm run test 2>&1 | tee test-error.log
   ```

2. **Report to Claude with:**
   - Error message
   - Test file name
   - Expected vs actual behavior
   - Stack trace

3. **Claude provides fix:**
   - Updated code
   - Explanation of issue

4. **Apply fix and retest:**
   ```bash
   npm run test -- [test-file]
   ```

5. **Only commit when all tests pass**

### If Type Errors Occur

```bash
# Check what's wrong
npm run type-check

# Common fixes:
# 1. Missing import
import { MissingType } from '../types/vision';

# 2. Wrong import path
# ❌ import from '@/types/vision'
# ✅ import from '../types/vision'

# 3. Missing dependency prompt
# Execute prerequisite card first
```

### Rollback Procedures

#### Single File Rollback
```bash
git checkout HEAD -- src/lib/visionEngine.ts
```

#### Entire Feature Rollback
```bash
# Create rollback branch
git checkout -b rollback-vision-engine

# Reset to before Vision changes
git reset --hard [commit-before-vision]

# Or revert specific commits
git revert [commit-hash]
```

#### Emergency Disable (Without Rollback)

```typescript
// In visionEngine.ts
async initialize(): Promise<void> {
  console.warn('Vision Engine disabled for emergency rollback');
  this.isInit = false;
  return;
}

// In stepExecutor.ts
if (step.event === 'conditional-click') {
  console.warn('Conditional click skipped (rollback mode)');
  return { success: true, skipped: true };
}
```

### Known Limitations & Workarounds

| Limitation | Impact | Workaround |
|------------|--------|------------|
| Visible tab only for OCR | Cannot OCR hidden tabs | Focus tab before capture |
| ~3MB bundle size increase | Slower initial load | Lazy load on first use |
| ~500-1000ms OCR latency | Slower than DOM methods | Use DOM when possible |
| Cross-origin iframe blocked | Cannot access some iframes | Use DOM fallback |
| Closed shadow DOM invisible | Cannot query closed roots | Record via Vision instead |

---

## APPENDIX A: FILE STRUCTURE REFERENCE

### New Files to Create

```
src/
├── lib/
│   ├── visionEngine.ts          # ENG-001 through ENG-015
│   ├── stepExecutor.ts          # ENG-017, ENG-018
│   ├── csvPositionMapping.ts    # ENG-016
│   ├── schemaMigration.ts       # DAT-002, MIG-001 to MIG-004
│   ├── defaults.ts              # DAT-006
│   ├── repositories/
│   │   └── recordingRepository.ts  # DAT-003
│   └── validation/
│       ├── stepValidation.ts    # DAT-004
│       └── recordingValidation.ts  # DAT-005
├── types/
│   ├── vision.ts                # FND-004 through FND-011
│   └── index.ts                 # Re-exports
├── contentScript/
│   └── visionHandlers.ts        # INT-001 through INT-005
├── components/
│   ├── recorder/
│   │   ├── VisionBadge.tsx      # UI-001
│   │   ├── LoopStartBadge.tsx   # UI-002
│   │   ├── DelayBadge.tsx       # UI-003
│   │   └── ConditionalBadge.tsx # UI-004
│   └── dialogs/
│       ├── DelayDialog.tsx      # UI-005
│       └── ConditionalConfigDialog.tsx  # UI-006
└── __tests__/
    ├── visionEngine.test.ts
    ├── stepExecutor.test.ts
    ├── schemaMigration.test.ts
    ├── csvMapping.test.ts
    ├── conditionalClick.test.ts
    └── visionRecording.test.ts
```

### Files to Modify

```
├── package.json                 # FND-001
├── manifest.json                # FND-002
├── vite.config.ts               # FND-003
├── src/background/
│   ├── background.ts            # INT-006, INT-007
│   └── indexedDB.ts             # DAT-001
├── src/contentScript/
│   └── recorder.ts              # INT-009
├── src/pages/
│   └── Recorder.tsx             # UI-007, UI-008, UI-009
└── src/components/Recorder/
    └── StepRow.tsx              # UI-010, UI-011, UI-012
```

---

## APPENDIX B: QUICK REFERENCE CARDS

### Card: VisionConfig Defaults

```typescript
const DEFAULT_VISION_CONFIG: VisionConfig = {
  confidenceThreshold: 60,    // 0-100
  pollIntervalMs: 1000,       // ms between OCR scans
  scrollRetries: 3,           // attempts for off-screen
  useSIMD: true,              // SIMD-optimized WASM
  language: 'eng',            // OCR language
  debugMode: false            // verbose logging
};
```

### Card: Step Defaults (New Fields)

```typescript
const DEFAULT_STEP_FIELDS = {
  recordedVia: 'dom' as const,
  coordinates: undefined,
  ocrText: undefined,
  confidenceScore: undefined,
  delaySeconds: undefined,
  conditionalConfig: null
};
```

### Card: Recording Defaults (New Fields)

```typescript
const DEFAULT_RECORDING_FIELDS = {
  schemaVersion: 3,
  loopStartIndex: 0,
  globalDelayMs: 0,
  conditionalDefaults: {
    searchTerms: ['Allow', 'Keep'],
    timeoutSeconds: 120
  }
};
```

### Card: Message Types

```typescript
type VisionMessageType =
  | 'VISION_CLICK'       // { type, x, y }
  | 'VISION_TYPE'        // { type, text }
  | 'VISION_KEY'         // { type, key, modifiers? }
  | 'VISION_SCROLL'      // { type, direction, amount? }
  | 'VISION_GET_ELEMENT' // { type, x, y }
  | 'VISION_SCREENSHOT'  // { type } -> returns dataUrl
  | 'VISION_INJECT_SCRIPT'; // { type, tabId }
```

---

*End of Phase 4 Code Generation Manual*

**Version:** 1.0  
**Last Updated:** December 2, 2025  
**Total Cards:** 67  
**Total Estimated Time:** 4-5 hours
