# MUFFIN LITE - BUILD CARD BACKLOG

> **Generated:** December 2025  
> **Total Cards:** 67  
> **Estimated Build Time:** ~4-5 hours  
> **Status:** Ready for Execution

---

## MASTER INDEX

### Category 1: Foundation / Architecture (FND)
| ID | Title | Risk | Dependencies |
|----|-------|------|--------------|
| FND-001 | Install Tesseract.js Dependency | Low | None |
| FND-002 | Update Manifest Permissions | Low | None |
| FND-003 | Configure Vite for WASM Assets | Low | FND-001 |
| FND-004 | Create Type Definitions File | Low | None |
| FND-005 | Define VisionConfig Interface | Low | FND-004 |
| FND-006 | Define TextResult Interface | Low | FND-004 |
| FND-007 | Define ClickTarget Interface | Low | FND-004 |
| FND-008 | Define ConditionalConfig Interface | Low | FND-004 |
| FND-009 | Define ConditionalClickResult Interface | Low | FND-004 |
| FND-010 | Extend Step Interface | Medium | FND-004, FND-008 |
| FND-011 | Extend Recording Interface | Medium | FND-004, FND-008 |

### Category 2: Data Layer (DAT)
| ID | Title | Risk | Dependencies |
|----|-------|------|--------------|
| DAT-001 | Create IndexedDB Schema v2 | Medium | FND-010, FND-011 |
| DAT-002 | Implement Schema Migration Logic | Medium | DAT-001 |
| DAT-003 | Create Recording Repository | Low | DAT-001 |
| DAT-004 | Create Step Validation Utility | Low | FND-010 |
| DAT-005 | Create Recording Validation Utility | Low | FND-011 |
| DAT-006 | Add Default Values Factory | Low | FND-010, FND-011 |

### Category 3: Core Engine Components (ENG)
| ID | Title | Risk | Dependencies |
|----|-------|------|--------------|
| ENG-001 | Create VisionEngine Class Skeleton | Medium | FND-005, FND-006, FND-007 |
| ENG-002 | Implement Tesseract Worker Initialization | High | ENG-001, FND-001 |
| ENG-003 | Implement captureScreen Method | Medium | ENG-001 |
| ENG-004 | Implement recognizeText Method | High | ENG-002 |
| ENG-005 | Implement OCR Result Filtering | Medium | ENG-004, FND-005 |
| ENG-006 | Implement findText Method | Medium | ENG-004, ENG-005 |
| ENG-007 | Implement findAllText Method | Low | ENG-006 |
| ENG-008 | Implement clickAtCoordinates Method | Medium | ENG-001 |
| ENG-009 | Implement typeText Method | Medium | ENG-001 |
| ENG-010 | Implement clickAndType Method | Low | ENG-008, ENG-009 |
| ENG-011 | Implement sendKeys Method | Medium | ENG-001 |
| ENG-012 | Implement handleDropdown Method | Medium | ENG-006, ENG-008 |
| ENG-013 | Implement scrollToFind Method | Medium | ENG-006 |
| ENG-014 | Implement waitAndClickButtons Method | High | ENG-006, ENG-008, FND-009 |
| ENG-015 | Implement VisionEngine Termination | Low | ENG-002 |
| ENG-016 | Create csvMapping Utility | Medium | FND-010 |
| ENG-017 | Create stepExecutor Module | Medium | FND-010, ENG-001 |
| ENG-018 | Implement Delay Execution Logic | Low | ENG-017 |

### Category 4: Integration Points (INT)
| ID | Title | Risk | Dependencies |
|----|-------|------|--------------|
| INT-001 | Create visionHandlers.ts File | Low | None |
| INT-002 | Implement VISION_CLICK Handler | Medium | INT-001 |
| INT-003 | Implement VISION_TYPE Handler | Medium | INT-001 |
| INT-004 | Implement VISION_KEY Handler | Medium | INT-001 |
| INT-005 | Implement VISION_SCROLL Handler | Low | INT-001 |
| INT-006 | Implement VISION_GET_ELEMENT Handler | Low | INT-001 |
| INT-007 | Add Vision Message Types to Background | Medium | INT-001 |
| INT-008 | Connect VisionEngine to Content Script | High | ENG-001, INT-002, INT-003 |
| INT-009 | Add Vision Fallback to Recording | High | INT-008, ENG-003, ENG-004 |
| INT-010 | Add Vision Playback Execution Path | High | INT-008, ENG-017 |
| INT-011 | Create API Client Wrapper | Medium | INT-007 |

### Category 5: UI Components (UI)
| ID | Title | Risk | Dependencies |
|----|-------|------|--------------|
| UI-001 | Create VisionBadge Component | Low | None |
| UI-002 | Create LoopStartBadge Component | Low | None |
| UI-003 | Create DelayBadge Component | Low | None |
| UI-004 | Create ConditionalBadge Component | Low | None |
| UI-005 | Create DelayDialog Component | Low | None |
| UI-006 | Create ConditionalConfigDialog Component | Medium | FND-008 |
| UI-007 | Add Loop Start Dropdown to Toolbar | Low | FND-011 |
| UI-008 | Add Global Delay Input to Toolbar | Low | FND-011 |
| UI-009 | Add Conditional Click to Add Variable Menu | Low | UI-006 |
| UI-010 | Update StepRow with Badge Display | Medium | UI-001, UI-002, UI-003, UI-004 |
| UI-011 | Add Three-Dot Menu: Set Delay | Low | UI-005 |
| UI-012 | Add Three-Dot Menu: Configure Conditional | Low | UI-006 |
| UI-013 | Add Three-Dot Menu: View Vision Data | Low | FND-010 |
| UI-014 | Update Recorder.tsx State Management | Medium | FND-011, UI-007, UI-008 |
| UI-015 | Update TestRunner.tsx with Vision Playback | High | ENG-017, INT-010, ENG-014 |

### Category 6: Testing & Validation (TST)
| ID | Title | Risk | Dependencies |
|----|-------|------|--------------|
| TST-001 | Test VisionEngine Initialization | Medium | ENG-002 |
| TST-002 | Test Screenshot Capture | Low | ENG-003 |
| TST-003 | Test OCR Recognition | High | ENG-004 |
| TST-004 | Test findText Accuracy | Medium | ENG-006 |
| TST-005 | Test Coordinate Click | Medium | INT-002, ENG-008 |
| TST-006 | Test Conditional Click Loop | High | ENG-014 |
| TST-007 | Test Vision Recording Fallback | High | INT-009 |
| TST-008 | Test Schema Migration | Medium | DAT-002 |
| TST-009 | Test CSV Position Mapping | Medium | ENG-016 |
| TST-010 | Test Full Copilot Workflow | High | ALL |

### Category 7: Migration Tasks (MIG)
| ID | Title | Risk | Dependencies |
|----|-------|------|--------------|
| MIG-001 | Add recordedVia Default to Existing Steps | Low | DAT-002 |
| MIG-002 | Add loopStartIndex Default to Recordings | Low | DAT-002 |
| MIG-003 | Add globalDelayMs Default to Recordings | Low | DAT-002 |
| MIG-004 | Add conditionalDefaults to Recordings | Low | DAT-002 |
| MIG-005 | Verify Backward Compatibility | Medium | MIG-001 to MIG-004 |

### Category 8: Documentation (DOC)
| ID | Title | Risk | Dependencies |
|----|-------|------|--------------|
| DOC-001 | Update README with Vision Features | Low | TST-010 |
| DOC-002 | Document Vision Engine API | Low | ENG-001 to ENG-015 |
| DOC-003 | Create Troubleshooting Guide | Low | TST-010 |

---

*[Build card details truncated for brevity - full document contains detailed specifications for all 67 cards]*

---

# RECOMMENDED FIRST 10 CARDS

Execute these cards first to establish foundation:

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

*End of Build Card Backlog*
