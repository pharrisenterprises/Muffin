# MUFFIN LITE - FUTURE SPECIFICATION INDEX

> **Version:** 2.1 | **Status:** Complete  
> **Generated:** December 2025  
> **Purpose:** Master index for all future-spec documentation

---

## SPECIFICATION STATUS

| # | File | Description | Status |
|---|------|-------------|--------|
| 0 | [00_future-overview.md](./00_future-overview.md) | Executive summary, objectives, scope | ✅ Complete |
| 1 | [01_requirements.md](./01_requirements.md) | Functional and non-functional requirements | ✅ Complete |
| 2 | [02_ux-flows.md](./02_ux-flows.md) | User journeys, screen flows, wireframes | ✅ Complete |
| 3 | [03_feature-specs.md](./03_feature-specs.md) | Detailed feature specifications with code | ✅ Complete |
| 4 | [04_architecture.md](./04_architecture.md) | System architecture and component design | ✅ Complete |
| 5 | [05_data-layer.md](./05_data-layer.md) | Data models, schemas, storage patterns | ✅ Complete |
| 6 | [06_api-contracts.md](./06_api-contracts.md) | Internal APIs, message formats, contracts | ✅ Complete |
| 7 | [07_migration-notes.md](./07_migration-notes.md) | Migration strategy and rollback plan | ✅ Complete |

---

## QUICK NAVIGATION

### By Role

**For Product/Design:**
- Start with [00_future-overview.md](./00_future-overview.md) for scope
- Review [02_ux-flows.md](./02_ux-flows.md) for user experience

**For Development:**
- Start with [04_architecture.md](./04_architecture.md) for system design
- Reference [03_feature-specs.md](./03_feature-specs.md) for implementation details
- Use [05_data-layer.md](./05_data-layer.md) for data models
- Use [06_api-contracts.md](./06_api-contracts.md) for message formats

**For QA/Testing:**
- Review [01_requirements.md](./01_requirements.md) for acceptance criteria
- Check [07_migration-notes.md](./07_migration-notes.md) for test checklist

**For Migration:**
- Follow [07_migration-notes.md](./07_migration-notes.md) for step-by-step guide

---

## FEATURE SUMMARY

### Vision Engine (Foundation)
- **Purpose:** Tesseract.js OCR for text recognition and coordinate-based interaction
- **Spec:** [03_feature-specs.md#feature-1-vision-engine](./03_feature-specs.md)
- **API:** [06_api-contracts.md#vision-engine-api](./06_api-contracts.md)

### Vision Recording
- **Purpose:** Fallback to Vision when DOM events fail (Copilot, Monaco, etc.)
- **Spec:** [03_feature-specs.md#feature-2-vision-recording](./03_feature-specs.md)
- **UX:** [02_ux-flows.md#flow-1-recording-with-vision-fallback](./02_ux-flows.md)

### Time Delay
- **Purpose:** Configurable pauses (global AFTER, per-step BEFORE)
- **Spec:** [03_feature-specs.md#feature-3-time-delay](./03_feature-specs.md)
- **UX:** [02_ux-flows.md#flow-2-configuring-time-delay](./02_ux-flows.md)

### CSV Loop
- **Purpose:** Execute subset of steps for rows 2+ with position-based mapping
- **Spec:** [03_feature-specs.md#feature-4-csv-loop](./03_feature-specs.md)
- **UX:** [02_ux-flows.md#flow-3-configuring-csv-loop](./02_ux-flows.md)

### Conditional Click
- **Purpose:** Poll and click approval buttons until timeout
- **Spec:** [03_feature-specs.md#feature-5-conditional-click](./03_feature-specs.md)
- **UX:** [02_ux-flows.md#flow-4-adding-conditional-click](./02_ux-flows.md)

---

## BUILD PHASES

| Phase | Duration | Description | Reference |
|-------|----------|-------------|-----------|
| 1 | 60 min | Vision Engine Foundation | [04_architecture.md](./04_architecture.md) |
| 2 | 45 min | Vision Recording | [03_feature-specs.md](./03_feature-specs.md) |
| 3 | 30 min | Time Delay Feature | [03_feature-specs.md](./03_feature-specs.md) |
| 4 | 45 min | CSV Loop Feature | [03_feature-specs.md](./03_feature-specs.md) |
| 5 | 45 min | Conditional Click Feature | [03_feature-specs.md](./03_feature-specs.md) |
| 6 | 30 min | Integration Testing | [07_migration-notes.md](./07_migration-notes.md) |
| **Total** | **~4 hours** | | |

---

## KEY INTERFACES

### Step (Extended)
```typescript
interface Step {
  // Existing
  id: string;
  label: string;
  event: 'open' | 'input' | 'click' | 'dropdown' | 'conditional-click';
  value?: string;
  selector?: string;
  xpath?: string;
  url?: string;
  
  // NEW
  recordedVia: 'dom' | 'vision';
  coordinates?: { x: number; y: number; width: number; height: number };
  ocrText?: string;
  confidenceScore?: number;
  delaySeconds?: number;
  conditionalConfig?: ConditionalConfig;
}
```

### Recording (Extended)
```typescript
interface Recording {
  // Existing
  id?: number;
  projectId: number;
  name: string;
  steps: Step[];
  startUrl: string;
  
  // NEW
  loopStartIndex: number;      // Default: 0
  globalDelayMs: number;       // Default: 0
  conditionalDefaults: {
    searchTerms: string[];     // Default: ['Allow', 'Keep']
    timeoutSeconds: number;    // Default: 120
  };
}
```

---

## FILES TO CREATE/MODIFY

### New Files (6)
| File | Purpose |
|------|---------|
| `src/lib/visionEngine.ts` | Tesseract.js wrapper (~400 lines) |
| `src/lib/csvMapping.ts` | Position-based column mapping |
| `src/lib/stepExecutor.ts` | Step execution logic |
| `src/contentScript/visionHandlers.ts` | Vision command handlers |
| `src/lib/api/client.ts` | Type-safe API client |
| `src/lib/repositories/recordingRepository.ts` | Data access layer |

### Modified Files (8)
| File | Changes |
|------|---------|
| `src/contentScript/content.tsx` | Add Vision fallback |
| `src/background/background.ts` | Add new message types |
| `src/common/services/indexedDB.ts` | Schema v2 |
| `src/pages/Recorder.tsx` | Add toolbar controls, badges |
| `src/pages/TestRunner.tsx` | Add Vision playback |
| `src/components/StepRow.tsx` | Add badges, menu items |
| `package.json` | Add tesseract.js |
| `manifest.json` | Add permissions |

---

## SUCCESS CRITERIA

### P0 (Must Have)
- [ ] Vision Engine initializes and captures screenshots
- [ ] OCR recognizes text with 60%+ confidence
- [ ] Vision fallback triggers for complex inputs
- [ ] Global delay works AFTER each step
- [ ] Per-step delay works BEFORE specific step
- [ ] CSV loop executes from configured start index
- [ ] Conditional click polls and clicks until timeout

### P1 (Should Have)
- [ ] Vision badge displays on Vision-recorded steps
- [ ] Loop start badge displays correctly
- [ ] Delay badge shows seconds
- [ ] Conditional badge indicates configuration
- [ ] Auto-detection failsafe triggers

### P2 (Nice to Have)
- [ ] View Vision Data in three-dot menu
- [ ] Confidence score displayed
- [ ] Scroll-into-view with retries
- [ ] Dropdown handling via Vision

---

## RELATED DOCUMENTS

| Document | Location | Purpose |
|----------|----------|---------|
| Build Spec v2 | `MUFFIN_LITE_VISION_BUILD_SPEC_v2.md` | Complete implementation guide |
| Master Rollup | `analysis-resources/MASTER_ROLLUP.md` | Current system reference |
| Technical Reference | `analysis-resources/TECHNICAL_REFERENCE.md` | Current implementation details |
| Resource Map | `analysis-resources/_RESOURCE_MAP.md` | Documentation index |

---

## NEXT STEPS

After Phase 2 (Masterplan Breakdown) is complete:

1. **Phase 3: Specification Generation**
   - Generate detailed implementation specs from these documents
   - Create Smart Prompts for Copilot execution

2. **Phase 4: Code Generation**
   - Execute Smart Prompts to create/modify files
   - Run tests after each prompt

3. **Phase 5: Testing & Finalization**
   - Integration testing
   - E2E testing
   - Documentation updates

---

*End of Future Specification Index*
