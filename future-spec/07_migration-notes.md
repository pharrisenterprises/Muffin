# MUFFIN LITE - MIGRATION NOTES

> **Version:** 2.1 | **Status:** Specification  
> **Purpose:** Document changes from current system to future state and migration strategy

---

## OVERVIEW

This document describes the migration path from the current Muffin extension to Muffin Lite with Vision/OCR capabilities. The migration is designed to be:

1. **Non-breaking** - Existing recordings continue to work
2. **Incremental** - Features can be added in phases
3. **Reversible** - Easy rollback if issues arise

---

## CURRENT STATE SUMMARY

### Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CURRENT MUFFIN                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Recording:     DOM events only                             │
│  Playback:      DOM selectors + XPath                       │
│  Element Find:  Multi-strategy (no Vision)                  │
│  Delays:        None (or hardcoded random)                  │
│  CSV Loop:      Basic (no loop start config)                │
│  Approvals:     Manual handling                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Current Files

| File | Purpose | Lines |
|------|---------|-------|
| `src/contentScript/content.tsx` | Recording + Playback | ~1450 |
| `src/background/background.ts` | Message routing | ~323 |
| `src/common/services/indexedDB.ts` | Database | ~73 |
| `src/pages/Recorder.tsx` | Recording UI | ~400 |
| `src/pages/TestRunner.tsx` | Playback UI | ~400 |
| `src/pages/FieldMapper.tsx` | CSV mapping | ~350 |

### Current Data Model

```typescript
// Current Step interface
interface Step {
  id?: number;
  label: string;
  event: string;
  value?: string;
  selector?: string;
  xpath?: string;
  url?: string;
  timestamp?: number;
  order?: number;
}

// Current Recording (stored in project)
interface Project {
  id?: number;
  projectName: string;
  projectDescription: string;
  redirectUrl?: string;
  capturedFields?: Field[];
  recorded_steps?: Step[];  // Steps stored here
  parsed_fields?: ParsedField[];
  csv_data?: Record<string, string>[];
}
```

---

## FUTURE STATE SUMMARY

### Future Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MUFFIN LITE                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Recording:     DOM events + Vision fallback                │
│  Playback:      DOM + Vision (based on recordedVia)         │
│  Element Find:  Multi-strategy + Vision OCR                 │
│  Delays:        Global (after) + Per-step (before)          │
│  CSV Loop:      Configurable loop start index               │
│  Approvals:     Conditional click with Vision polling       │
│                                                             │
│  NEW: Vision Engine (Tesseract.js)                          │
│  NEW: Content script Vision handlers                        │
│  NEW: Extended Step interface                               │
│  NEW: Recording-level configuration                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### New Files

| File | Purpose | Status |
|------|---------|--------|
| `src/lib/visionEngine.ts` | Tesseract.js wrapper | NEW |
| `src/lib/csvMapping.ts` | Position-based mapping | NEW |
| `src/lib/stepExecutor.ts` | Step execution logic | NEW |
| `src/contentScript/visionHandlers.ts` | Vision commands | NEW |
| `src/lib/api/client.ts` | Type-safe API client | NEW |
| `src/lib/repositories/recordingRepository.ts` | Data access | NEW |

### Modified Files

| File | Changes |
|------|---------|
| `src/contentScript/content.tsx` | Add Vision fallback, import handlers |
| `src/background/background.ts` | Add new message types, Vision screenshot |
| `src/common/services/indexedDB.ts` | Schema v2, new fields |
| `src/pages/Recorder.tsx` | Add delay/loop UI, Vision badges |
| `src/pages/TestRunner.tsx` | Add Vision playback, conditional click |
| `src/components/StepRow.tsx` | Add badges, three-dot menu items |
| `package.json` | Add tesseract.js dependency |
| `manifest.json` | Add permissions, web_accessible_resources |

---

## DETAILED CHANGES

### 1. Step Interface Extension

**Current:**
```typescript
interface Step {
  id?: number;
  label: string;
  event: string;
  value?: string;
  selector?: string;
  xpath?: string;
  url?: string;
  timestamp?: number;
  order?: number;
}
```

**Future:**
```typescript
interface Step {
  // ===== EXISTING (unchanged) =====
  id?: number;
  label: string;
  event: StepEventType;  // Now typed
  value?: string;
  selector?: string;
  xpath?: string;
  url?: string;
  timestamp?: number;
  order?: number;
  
  // ===== NEW FIELDS =====
  recordedVia: 'dom' | 'vision';
  coordinates?: { x: number; y: number; width: number; height: number };
  ocrText?: string;
  confidenceScore?: number;
  delaySeconds?: number;
  conditionalConfig?: ConditionalConfig;
}
```

**Migration:**
- Existing steps get `recordedVia: 'dom'` as default
- All new fields are optional, so existing data works
- No data transformation needed for existing steps

---

### 2. Recording/Project Structure

**Current:** Steps stored in `project.recorded_steps`

**Future:** Steps stored in `recording.steps` with additional config

```typescript
interface Recording {
  // ... existing fields ...
  
  // NEW
  loopStartIndex: number;      // Default: 0
  globalDelayMs: number;       // Default: 0
  conditionalDefaults: {
    searchTerms: string[];     // Default: ['Allow', 'Keep']
    timeoutSeconds: number;    // Default: 120
  };
}
```

**Migration Options:**

**Option A: In-Place Migration (Recommended)**
- Add new fields with defaults to existing projects
- Keep `recorded_steps` in project for backward compatibility
- Gradually migrate to separate Recording table

**Option B: Data Transformation**
- Create new Recording records from project.recorded_steps
- Update project to reference recording ID
- More complex, higher risk

---

### 3. IndexedDB Schema

**Current (v1):**
```typescript
this.version(1).stores({
  projects: '++id, projectName, isPublic',
  bundles: '++id, bundleName, projectId, isPublic',
  testRuns: '++id, bundleId, projectId, status'
});
```

**Future (v2):**
```typescript
this.version(2).stores({
  projects: '++id, projectName, isPublic',
  bundles: '++id, bundleName, projectId, isPublic',
  testRuns: '++id, bundleId, projectId, status',
  recordings: '++id, projectId, name, createdAt'  // NEW TABLE
}).upgrade(tx => {
  // Migrate existing project steps to recordings
  return tx.table('projects').toCollection().modify(project => {
    // Add new fields with defaults
    if (project.recorded_steps) {
      project.recorded_steps = project.recorded_steps.map(step => ({
        ...step,
        recordedVia: step.recordedVia ?? 'dom'
      }));
    }
  });
});
```

---

### 4. Content Script Changes

**Current content.tsx structure:**
```typescript
// ~1450 lines monolithic file
// Recording logic
// Playback logic
// Element finding
// Label extraction
// XPath computation
```

**Future structure:**
```typescript
// content.tsx (reduced, imports from modules)
import { handleVisionClick, handleVisionType, ... } from './visionHandlers';

// Recording: Add Vision fallback
async function recordInput(element: HTMLElement) {
  // Try DOM capture
  const value = getDOMValue(element);
  
  if (value) {
    // DOM recording
    recordStep({ ...step, recordedVia: 'dom' });
  } else {
    // Wait 500ms, retry
    await delay(500);
    const retryValue = getDOMValue(element);
    
    if (retryValue) {
      recordStep({ ...step, recordedVia: 'dom' });
    } else {
      // VISION FALLBACK
      const bounds = element.getBoundingClientRect();
      chrome.runtime.sendMessage({
        type: 'VISION_FALLBACK_TRIGGERED',
        payload: { sessionId, element: { tagName: element.tagName, bounds } }
      });
    }
  }
}
```

**New visionHandlers.ts:**
```typescript
// Vision command handlers (~200 lines)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'VISION_CLICK') { ... }
  if (message.type === 'VISION_TYPE') { ... }
  if (message.type === 'VISION_KEY') { ... }
  if (message.type === 'VISION_SCROLL') { ... }
  if (message.type === 'VISION_GET_ELEMENT') { ... }
});
```

---

### 5. Recorder UI Changes

**Current toolbar:**
```
[Record] [Add Variable] [Export Process] [Export Header CSV]
```

**Future toolbar:**
```
[Record] [+ Add Variable ▼] [Export Process] [Export Header CSV] | CSV Loop Start: [▼] | Delay: [____] ms | [Static ▼]
```

**New "+ Add Variable" dropdown:**
```
+ Add Variable
├── Input Variable (existing)
├── Click Variable (existing)
└── Conditional Click (NEW)
```

**New step row elements:**
- Badge: `📷 Vision` (for vision-recorded steps)
- Badge: `🔁 Loop Start` (for loop start step)
- Badge: `⏱️ 5s` (for steps with delay)
- Badge: `🔍 Conditional` (for conditional click steps)

**New three-dot menu items:**
- Set Delay Before Step (NEW)
- Configure Conditional (NEW, for conditional-click)
- View Vision Data (NEW, for vision-recorded)

---

### 6. TestRunner Changes

**Current playback:**
```typescript
for (const row of csvRows) {
  for (const step of steps) {
    await executeStep(step, row);
    await randomDelay(1000, 3000);
  }
}
```

**Future playback:**
```typescript
// Initialize Vision Engine
await visionEngine.initialize();

// Build position-based mapping
const stepToColumn = buildStepToColumnMapping(steps, parsedFields);

try {
  for (let rowIndex = 0; rowIndex < csvRows.length; rowIndex++) {
    const row = csvRows[rowIndex];
    const isFirstRow = rowIndex === 0;
    
    // Determine steps to execute
    const stepsToExecute = isFirstRow 
      ? steps 
      : steps.slice(loopStartIndex);
    
    for (let i = 0; i < stepsToExecute.length; i++) {
      let step = { ...stepsToExecute[i] };
      const absoluteIndex = isFirstRow ? i : (loopStartIndex + i);
      
      // Inject CSV value
      const column = stepToColumn[absoluteIndex];
      if (column && row[column]) {
        step.value = row[column];
      }
      
      // Per-step delay BEFORE
      if (step.delaySeconds) {
        await delay(step.delaySeconds * 1000);
      }
      
      // Execute based on type
      await executeStep(step);
      
      // Global delay AFTER (if no per-step delay)
      if (!step.delaySeconds && globalDelayMs > 0) {
        await delay(globalDelayMs);
      }
    }
  }
} finally {
  await visionEngine.terminate();
}
```

---

### 7. Manifest.json Changes

**Current:**
```json
{
  "manifest_version": 3,
  "version": "2.0.0",
  "permissions": [
    "activeTab",
    "storage"
  ]
}
```

**Future:**
```json
{
  "manifest_version": 3,
  "version": "2.1.0",
  "permissions": [
    "activeTab",
    "tabs",
    "storage",
    "scripting"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "web_accessible_resources": [
    {
      "resources": ["*.wasm", "*.traineddata"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

---

### 8. Package.json Changes

**Add dependency:**
```json
{
  "dependencies": {
    "tesseract.js": "^5.0.0"
  }
}
```

**Add to devDependencies (if not present):**
```json
{
  "devDependencies": {
    "@types/chrome": "^0.0.263"
  }
}
```

---

## MIGRATION STRATEGY

### Phase 1: Foundation (Non-Breaking)

**Goal:** Add Vision Engine without changing existing functionality

**Steps:**
1. Install tesseract.js dependency
2. Create `src/lib/visionEngine.ts`
3. Create `src/contentScript/visionHandlers.ts`
4. Update manifest.json with new permissions
5. Test Vision Engine in isolation

**Verification:**
- Existing recordings still play
- Vision Engine can capture + OCR
- No regressions

**Rollback:** Remove new files, revert manifest

---

### Phase 2: Recording Enhancement

**Goal:** Add Vision fallback to recording

**Steps:**
1. Add Vision fallback logic to content.tsx
2. Update Step interface with new fields
3. Add default values for new fields
4. Add Vision badge to UI

**Verification:**
- DOM recording still works
- Vision fallback triggers for complex inputs
- Steps display correct badges

**Rollback:** Remove Vision fallback code, badges still harmless

---

### Phase 3: Time Delay Feature

**Goal:** Add configurable delays

**Steps:**
1. Add globalDelayMs to Recording/Project
2. Add delaySeconds to Step
3. Add toolbar delay input
4. Add three-dot menu "Set Delay Before Step"
5. Add delay badge display
6. Implement delay execution logic

**Verification:**
- Global delay works AFTER steps
- Per-step delay works BEFORE step
- Badges display correctly

**Rollback:** Set delays to 0, remove UI elements

---

### Phase 4: CSV Loop Feature

**Goal:** Add configurable loop start

**Steps:**
1. Add loopStartIndex to Recording/Project
2. Add loop start dropdown to toolbar
3. Add loop start badge
4. Implement position-based column mapping
5. Implement row iteration with slice

**Verification:**
- Row 1 executes all steps
- Rows 2+ start from loop index
- CSV values inject correctly

**Rollback:** Set loopStartIndex to 0 (execute all)

---

### Phase 5: Conditional Click Feature

**Goal:** Add approval automation

**Steps:**
1. Add conditionalConfig to Step
2. Add conditionalDefaults to Recording
3. Add "Conditional Click" to + Add Variable menu
4. Add configuration dialog
5. Add conditional badge
6. Implement Vision polling loop
7. Implement auto-detection failsafe

**Verification:**
- Manual conditional click works
- Auto-detection triggers
- Timeout exits cleanly

**Rollback:** Skip conditional steps, continue normally

---

### Phase 6: Integration Testing

**Goal:** Verify all features work together

**Test Scenarios:**
1. Record Copilot prompt with Vision fallback
2. Add per-step delay of 300s
3. Configure loop start at step 3
4. Add conditional click for approvals
5. Run with 3 CSV rows

**Expected Result:**
- Row 1: All steps, Vision input, wait 300s, click approvals
- Rows 2-3: From step 3, loop correctly, approvals handled

---

## BACKWARD COMPATIBILITY

### Existing Recordings

| Feature | Behavior |
|---------|----------|
| Steps without `recordedVia` | Default to `'dom'`, play with DOM logic |
| Steps without `coordinates` | Use selector/xpath as before |
| Steps without `delaySeconds` | No per-step delay, use global |
| Recording without `loopStartIndex` | Default 0, execute all steps |
| Recording without `globalDelayMs` | Default 0, no delay |
| Recording without `conditionalDefaults` | Use hardcoded defaults |

### Data Migration

```typescript
// Automatic migration in Dexie upgrade
this.version(2).upgrade(tx => {
  return tx.table('projects').toCollection().modify(project => {
    // Add defaults to recording config
    project.loopStartIndex = project.loopStartIndex ?? 0;
    project.globalDelayMs = project.globalDelayMs ?? 0;
    project.conditionalDefaults = project.conditionalDefaults ?? {
      searchTerms: ['Allow', 'Keep'],
      timeoutSeconds: 120
    };
    
    // Add recordedVia to all existing steps
    if (project.recorded_steps) {
      project.recorded_steps = project.recorded_steps.map(step => ({
        ...step,
        recordedVia: step.recordedVia ?? 'dom'
      }));
    }
  });
});
```

### API Compatibility

| Endpoint | Status |
|----------|--------|
| Existing message types | Unchanged |
| New message types | Additive only |
| Response format | Extended, not changed |

---

## ROLLBACK PLAN

### Quick Rollback (Per Feature)

| Feature | Rollback Action |
|---------|-----------------|
| Vision Engine | Don't call initialize(), use DOM only |
| Vision Recording | Skip fallback, always use DOM |
| Time Delay | Set delays to 0 |
| CSV Loop | Set loopStartIndex to 0 |
| Conditional Click | Skip conditional steps |

### Full Rollback

1. Revert to previous version branch
2. Data remains compatible (new fields ignored)
3. No data loss

### Emergency Rollback

If critical bug in production:

1. Disable Vision Engine:
   ```typescript
   // In visionEngine.ts
   async initialize(): Promise<void> {
     console.warn('Vision Engine disabled for rollback');
     return; // Skip initialization
   }
   ```

2. Skip new step types:
   ```typescript
   // In step executor
   if (step.event === 'conditional-click') {
     console.warn('Conditional click skipped (rollback mode)');
     return; // Skip step
   }
   ```

---

## TESTING CHECKLIST

### Unit Tests

- [ ] VisionEngine.initialize() / terminate()
- [ ] VisionEngine.captureScreen()
- [ ] VisionEngine.recognizeText()
- [ ] VisionEngine.findText()
- [ ] VisionEngine.clickAtCoordinates()
- [ ] VisionEngine.typeText()
- [ ] VisionEngine.handleDropdown()
- [ ] VisionEngine.waitAndClickButtons()
- [ ] buildStepToColumnMapping()
- [ ] Step validation
- [ ] Recording validation

### Integration Tests

- [ ] Recording with DOM events
- [ ] Recording with Vision fallback
- [ ] Playback with DOM steps
- [ ] Playback with Vision steps
- [ ] Global delay execution
- [ ] Per-step delay execution
- [ ] CSV loop from step 1
- [ ] CSV loop from step N
- [ ] Conditional click basic
- [ ] Conditional click timeout
- [ ] Mixed features together

### E2E Tests

- [ ] Full Copilot automation workflow
- [ ] Multiple CSV rows with loop
- [ ] Approval handling (Allow/Keep)
- [ ] Error recovery

---

## KNOWN LIMITATIONS

### Vision Engine

| Limitation | Impact | Workaround |
|------------|--------|------------|
| Visible tab only | Cannot OCR hidden tabs | Focus tab before capture |
| ~3MB bundle size | Slower initial load | Lazy load on first use |
| ~500-1000ms OCR | Slower than DOM | Cache results when possible |
| Coordinate drift on resize | Wrong click location | Re-capture if window resized |
| Low contrast text | OCR may fail | Adjust confidence threshold |

### Recording

| Limitation | Impact | Workaround |
|------------|--------|------------|
| 500ms fallback delay | Slightly slower recording | Acceptable tradeoff |
| Shadow DOM text | May not capture all text | Use DOM when possible |
| Dynamic content | Text may change | Use flexible search terms |

### Playback

| Limitation | Impact | Workaround |
|------------|--------|------------|
| Vision slower than DOM | Longer playback time | Use DOM steps when possible |
| Scroll-into-view limited | May miss off-screen elements | Manual scroll step |
| Conditional timeout | May wait too long | Adjust timeout per step |

---

## SUPPORT & TROUBLESHOOTING

### Common Issues

**Issue:** Vision Engine fails to initialize
**Cause:** Tesseract.js worker not loaded
**Solution:** Check web_accessible_resources in manifest

**Issue:** OCR returns empty results
**Cause:** Low confidence threshold or blank page
**Solution:** Lower confidenceThreshold or verify page loaded

**Issue:** Click at wrong location
**Cause:** Window resized since recording
**Solution:** Re-record step or adjust coordinates

**Issue:** Conditional click never exits
**Cause:** Timeout too high or text not found
**Solution:** Check search terms match exactly, reduce timeout

**Issue:** CSV values not injecting
**Cause:** Position mapping mismatch
**Solution:** Verify step labels match CSV mappings

### Debug Mode

```typescript
// Enable verbose logging
visionEngine.setConfig({
  confidenceThreshold: 60,
  pollIntervalMs: 1000,
  scrollRetries: 3,
  debug: true  // NEW: Verbose logging
});
```

### Log Locations

| Context | How to View |
|---------|-------------|
| Extension pages | Browser DevTools Console |
| Background script | chrome://extensions → Inspect service worker |
| Content script | Target page DevTools Console |
| Vision Engine | Background script console |

---

## TIMELINE

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1: Foundation | 60 min | None |
| Phase 2: Recording | 45 min | Phase 1 |
| Phase 3: Time Delay | 30 min | None (can parallel) |
| Phase 4: CSV Loop | 45 min | None (can parallel) |
| Phase 5: Conditional | 45 min | Phase 1 |
| Phase 6: Testing | 30 min | All phases |
| **Total** | **~4 hours** | |

---

## SIGN-OFF CHECKLIST

Before release:

- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] E2E tests passing
- [ ] Backward compatibility verified
- [ ] Rollback tested
- [ ] Documentation updated
- [ ] Manifest version bumped
- [ ] Changelog updated
- [ ] Code review complete
- [ ] QA sign-off

---

*End of Migration Notes*
