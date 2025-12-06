# ARCHITECTURE DECISIONS: MUFFIN LITE PHASE 2

**Finalized:** December 6, 2025  
**Status:** APPROVED - Use these decisions for all code generation

---

## Decision Summary Table

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Tesseract Loading | **At Recording Start** | Vision captures evidence for ALL recordings. Load when "Record" clicked - fast startup preserved, ready for full capture. |
| 2 | OCR Confidence Threshold | **60%** | Tesseract.js recommended balance between accuracy and coverage. |
| 3 | Conditional Timeout Default | **120 seconds** | Covers AI response workflows (Claude/Copilot can take 30-90s). User can override per-step. |
| 4 | Evidence Storage | **50MB browser + Native Host (unlimited)** | Browser has 50MB buffer. Native Messaging Host offloads to local filesystem for unlimited storage. Graceful fallback if host not installed. |
| 5 | Strategy Degradation | **NONE - Full Multi-Layer Always** | All 7 strategies always available. Never skip layers. DOM/XPath first (fast), then CDP, then Vision, then Coordinates. |
| 6 | Strategy Scoring Weights | **Fixed** | Simplicity first. Configurable weights deferred to future release. |
| 7 | Schema Migration | **Lazy on Load** | Migrate each recording when accessed. Better UX than blocking startup. |
| 8 | Test Sites | **ALL - Full Regression Required** | Tool was recently broken. Must verify: Claude.ai, GitHub, Google Forms, Google Maps, Copilot. |

---

## Decision 1: Tesseract Loading Strategy

**Choice:** Load Tesseract.js worker when user clicks "Start Recording"

**NOT Startup:** Would add 2-3 seconds to every extension load, even when user just wants to view recordings.

**NOT Lazy (first Vision use):** Would delay first evidence capture. Since we capture evidence for ALL recordings, this creates unpredictable delays.

**AT RECORDING START:** Best of both worlds:
- Extension loads fast (no Tesseract overhead)
- Worker ready before any user actions need capturing
- ~2 second load happens during natural "setup" moment
- Subsequent captures are instant

**Implementation:**
```typescript
// In recording start handler
async function startRecording() {
  // Initialize Vision engine FIRST
  await visionEngine.initialize(); // ~2 seconds
  
  // Then start capturing
  isRecording = true;
  // ... rest of recording setup
}
```

---

## Decision 2: OCR Confidence Threshold

**Choice:** 60%

**Rationale:**
- 50% too permissive: False matches on partial text
- 70% too strict: Misses valid text in low-contrast areas, small fonts
- 60% is Tesseract.js documentation recommended threshold

**Implementation:**
```typescript
const DEFAULT_OCR_CONFIDENCE = 60;
```

---

## Decision 3: Conditional Click Timeout

**Choice:** 120 seconds (2 minutes)

**Rationale:**
- 60s too short: AI responses (Claude, Copilot) can take 30-90 seconds
- 300s too long: User waits 5 minutes for obvious failures
- 120s covers most AI workflows while failing reasonably fast

**User Override:** Per-step timeout configurable in UI

**Implementation:**
```typescript
const DEFAULT_CONDITIONAL_TIMEOUT_MS = 120000;
```

---

## Decision 4: Evidence Storage Architecture

**Choice:** Hybrid browser + local storage

### Browser Storage (Default)
- 50MB IndexedDB buffer for evidence
- Auto-prunes oldest when limit reached
- Works without any additional installation

### Native Messaging Host (Enhanced - Phase 3)
- Node.js application running locally
- Receives evidence via chrome.runtime.sendNativeMessage()
- Stores to local filesystem (UNLIMITED)
- Path: `C:\Users\{user}\MuffinData\evidence\`

### Flow:
```
Evidence Captured
       │
       ▼
┌──────────────────────────────────┐
│ Native Host Installed?           │
│                                  │
│ YES: Send to host, store locally │
│ NO:  Store in browser (50MB max) │
└──────────────────────────────────┘
```

### Why Both?
- Browser-only works out of box (no setup required)
- Power users can install host for unlimited storage
- Never lose evidence due to storage limits

---

## Decision 5: Full Multi-Layer System (NO DEGRADATION)

**Choice:** All 7 strategies ALWAYS available. Never skip. Never degrade.

### The 7-Tier Tool Arsenal (ALL ALWAYS ACTIVE)

| Tier | Strategy | Speed | Confidence | When Best |
|------|----------|-------|------------|-----------|
| 1 | DOM ID Selector | 5ms | 0.85 | Stable IDs present |
| 2 | CSS Selector | 10ms | 0.75 | Class-based selection |
| 3 | XPath | 15ms | 0.70 | Complex DOM navigation |
| 4 | CDP Semantic (getByRole) | 50ms | 0.95 | ARIA roles present |
| 5 | CDP Power (getByText) | 50ms | 0.90 | Text content stable |
| 6 | Vision OCR | 2000ms | 0.80 | Visual identification |
| 7 | Coordinates | 5ms | 0.60 | Last resort fallback |

### Recording Flow (Capture ALL Evidence)
```
User clicks element
        │
        ├──► DOM: Capture selector, xpath, attributes
        ├──► CDP: Capture role, name, accessibility info
        ├──► Vision: Screenshot + OCR + coordinates
        └──► Mouse: Click position, hover duration
        
        ALL stored in FallbackChain (nothing skipped)
```

### Playback Flow (Score ALL, Try in Order)
```
Step to Execute
        │
        ▼
   PARALLEL EVALUATION (Promise.all)
        │
        ├──► DOM Strategy    → Confidence: 0.XX
        ├──► XPath Strategy  → Confidence: 0.XX
        ├──► CDP Semantic    → Confidence: 0.XX
        ├──► CDP Power       → Confidence: 0.XX
        ├──► Vision Strategy → Confidence: 0.XX
        └──► Coordinates     → Confidence: 0.XX
        
        ▼
   Sort by confidence (highest first)
        │
        ▼
   Try each until success (or all fail)
```

### Why No Degradation?
- Original DOM/XPath code PRESERVED (no changes to working code)
- CDP and Vision are ADDITIVE layers
- If CDP unavailable (debugger permission denied), DOM still works
- If Vision fails, coordinates still available
- User always has maximum chance of success

---

## Decision 6: Strategy Scoring Weights

**Choice:** Fixed weights (not user-configurable)

**Rationale:**
- Configurable weights add UI complexity
- Users don't understand what weights mean
- Our testing determines optimal weights
- Can add "Advanced Settings" in future if requested

**Default Weights:**
```typescript
const STRATEGY_WEIGHTS = {
  cdp_semantic: 1.0,    // Highest priority when available
  cdp_power: 0.95,
  dom_selector: 0.85,
  vision_ocr: 0.80,
  css_selector: 0.75,
  xpath: 0.70,
  coordinates: 0.60     // Last resort
};
```

---

## Decision 7: Schema Migration Timing

**Choice:** Lazy migration (on first access)

**NOT Immediate:** Blocking migration on extension update could timeout on large datasets, frustrates users.

**Lazy Migration:**
- Each recording migrated when first loaded
- Spread work over time
- If one recording fails, others still work
- Progress visible per-recording

**Implementation:**
```typescript
async function loadRecording(id: string): Promise<Recording> {
  const raw = await db.recordings.get(id);
  
  if (raw.schemaVersion < CURRENT_SCHEMA_VERSION) {
    const migrated = await migrateRecording(raw);
    await db.recordings.put(migrated);
    return migrated;
  }
  
  return raw;
}
```

---

## Decision 8: Test Site Coverage

**Choice:** ALL sites - Full regression required

### Current Status (NEEDS VERIFICATION)
| Site | Previous Status | Needs Testing |
|------|-----------------|---------------|
| Claude.ai | Was working, may be broken | ✅ Full regression |
| GitHub | Unknown | ✅ Full test |
| Google Forms | Was working, may be broken | ✅ Full regression |
| Google Maps | Fixed with Vision | ✅ Verify still works |
| Copilot | NOT WORKING | ✅ PRIMARY FOCUS |

### Why Full Regression?
- Tool was recently broken before Phase 2 work began
- Changes to recording/playback could affect all sites
- Cannot assume anything still works
- Must verify baseline before adding new features

### Test Plan
1. **Phase 2 Complete:** Run all build cards
2. **Baseline Test:** Test original functionality on all sites
3. **Identify Regressions:** Document what broke
4. **Fix Regressions:** Priority over new features
5. **Copilot Focus:** Primary target for new CDP features

---

## How Decision Engine Uses Evidence

### Evidence Types and Usage

| Evidence | Captured When | Used For |
|----------|---------------|----------|
| **Screenshot** | Every step | Visual comparison - is page in same state? |
| **OCR Text** | Every step | Find same text if element moved |
| **Coordinates** | Every click | Last-resort click position |
| **Surrounding Text** | Every step | Spatial context ("Submit" near "Cancel") |
| **DOM Selector** | Every step | Fast primary lookup |
| **XPath** | Every step | Structural fallback |
| **CDP Role/Name** | Every step | Semantic identification |
| **Mouse Trail** | Continuous | Navigation path context |

### Evidence-Informed Strategy Selection

```
During Playback:
┌─────────────────────────────────────────────────────────────┐
│ Step: Click "Submit" button                                  │
│ Recorded Evidence:                                           │
│   - selector: "#submit-btn"                                  │
│   - xpath: "/html/body/form/button[2]"                      │
│   - cdpRole: "button", cdpName: "Submit"                    │
│   - visionText: "Submit" at {x: 450, y: 320}                │
│   - coordinates: {x: 475, y: 335}                           │
│   - surroundingText: ["Cancel", "Submit", "Help"]           │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ Decision Engine Evaluation:                                  │
│                                                              │
│ 1. DOM: document.querySelector("#submit-btn")               │
│    Result: Found! Confidence: 0.85                          │
│                                                              │
│ 2. CDP: getByRole("button", {name: "Submit"})              │
│    Result: Found! Confidence: 0.95                          │
│                                                              │
│ 3. Vision: OCR search for "Submit"                          │
│    Result: Found at {x: 452, y: 318}                        │
│    Confidence: 0.88 (position similar to recorded)          │
│                                                              │
│ 4. Coordinates: Click at {x: 475, y: 335}                   │
│    Result: Always available. Confidence: 0.60               │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
         Winner: CDP (0.95) - Try first
         Fallback order: DOM (0.85) → Vision (0.88) → Coords (0.60)
```

### Why Evidence Makes Playback Smarter

**Without Evidence (old approach):**
- Try selector → fail → try xpath → fail → give up

**With Evidence (new approach):**
- Compare current page to recorded screenshot (same state?)
- Try CDP semantic (survives CSS changes)
- Try Vision OCR (survives DOM restructuring)
- Use spatial context (button was near "Cancel" text)
- Coordinates as absolute last resort

---

## Native Messaging Host Specification (Phase 3)

### Purpose
Offload evidence storage from browser to local filesystem for unlimited capacity.

### Architecture
```
Chrome Extension
       │
       │ chrome.runtime.sendNativeMessage()
       ▼
Native Messaging Host (Node.js)
       │
       │ fs.writeFile()
       ▼
Local Filesystem
C:\Users\{user}\MuffinData\
├── evidence\
│   ├── recording-{id}\
│   │   ├── step-001-screenshot.png
│   │   ├── step-001-ocr.json
│   │   ├── step-001-dom.json
│   │   └── step-001-cdp.json
│   └── recording-{id}\
└── approved\  (pruned, minimal data)
```

### API Contract
```typescript
// Extension → Host
interface EvidenceStoreRequest {
  action: 'store';
  recordingId: string;
  stepId: string;
  evidence: {
    screenshot: string;  // base64
    ocr: TextResult[];
    dom: DOMEvidence;
    cdp: CDPEvidence;
    coordinates: { x: number; y: number };
  };
}

// Host → Extension
interface EvidenceStoreResponse {
  success: boolean;
  path?: string;
  error?: string;
}

// Extension → Host
interface EvidenceQueryRequest {
  action: 'query';
  recordingId: string;
  stepId?: string;
}

// Host → Extension
interface EvidenceQueryResponse {
  success: boolean;
  evidence?: Evidence[];
  error?: string;
}

// Extension → Host
interface EvidencePruneRequest {
  action: 'prune';
  recordingId: string;
  keepApproved: boolean;
}
```

### Installation
- Separate installer (MSI for Windows, DMG for Mac)
- Registers native messaging host manifest
- Creates MuffinData directory
- One-time setup

### Graceful Fallback
```typescript
async function storeEvidence(evidence: Evidence): Promise<void> {
  try {
    // Try native host first
    await chrome.runtime.sendNativeMessage('com.muffin.evidence', {
      action: 'store',
      ...evidence
    });
  } catch (error) {
    // Fallback to browser storage
    await browserEvidenceBuffer.store(evidence);
  }
}
```

---

## Summary: What This Means for Code Generation

1. **VisionEngine.initialize()** called in startRecording(), not constructor
2. **ALL evidence captured** for every step, every recording
3. **Decision Engine** scores ALL strategies in parallel
4. **No degradation** - all strategies always available
5. **Native Host** is Phase 3, but architecture supports it now
6. **Full regression testing** required on ALL sites
7. **Copilot** is primary focus for new CDP features

---

**END OF ARCHITECTURE DECISIONS**
