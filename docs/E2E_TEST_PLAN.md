# E2E Test Plan: Copilot Workflow

> **Test Card:** TST-010  
> **Category:** End-to-End Testing  
> **Risk Level:** High  
> **Last Updated:** December 2025

---

## 1. PURPOSE

This document provides the manual testing procedure for verifying the complete Copilot automation workflow with all Vision Enhancement features.

---

## 2. PREREQUISITES

### Environment Setup
- [ ] Chrome browser (v120+)
- [ ] Extension loaded in developer mode
- [ ] Access to Claude.ai with active project
- [ ] Test CSV file with 3-4 rows of prompts

### Test CSV File
Create `test-prompts.csv`:
```csv
Prompt
Write a function to calculate factorial
Explain the difference between let and const
Create a simple REST API in Node.js
Debug this sorting algorithm
```

---

## 3. TEST SCENARIOS

### Scenario 1: Record Copilot Prompt Input

**Objective:** Verify Vision fallback triggers for Monaco editor input.

**Steps:**
1. Open Claude.ai and navigate to a project
2. Click the extension icon → "Record"
3. Click in the prompt input area (Monaco editor)
4. Type a test prompt: "Hello Claude"
5. Click the send button
6. Stop recording

**Expected Results:**
- [ ] Recording captures all interactions
- [ ] Prompt input step has `recordedVia: 'vision'`
- [ ] Step shows Vision badge (👁️) in step table
- [ ] Coordinates captured for the input area
- [ ] Send click has `recordedVia: 'dom'`

**Verification:**
```javascript
// In browser console, check step data:
const steps = /* get from extension storage */;
const promptStep = steps.find(s => s.label.includes('prompt'));
console.log('recordedVia:', promptStep.recordedVia); // Should be 'vision'
console.log('coordinates:', promptStep.coordinates); // Should have x, y, width, height
```

---

### Scenario 2: Configure Time Delays

**Objective:** Verify global and per-step delays work correctly.

**Steps:**
1. Open the recording from Scenario 1
2. Set Global Delay to 5000ms (5 seconds) in toolbar
3. Click three-dot menu on prompt step
4. Select "Set Delay Before Step"
5. Enter 10 seconds
6. Save changes

**Expected Results:**
- [ ] Global delay input shows 5000
- [ ] Delay badge (⏱️ 10s) appears on prompt step
- [ ] Recording `globalDelayMs = 5000`
- [ ] Step `delaySeconds = 10`

---

### Scenario 3: Configure CSV Loop Start

**Objective:** Verify loop start configuration.

**Steps:**
1. Open the recording from Scenario 2
2. Click "CSV Loop Start" dropdown in toolbar
3. Select "Loop from Step 3" (prompt input)
4. Verify the Loop Start badge appears

**Expected Results:**
- [ ] Dropdown shows all steps
- [ ] Selected step shows "🔄 Loop Start" badge
- [ ] Recording `loopStartIndex = 2` (0-indexed)

---

### Scenario 4: Add Conditional Click

**Objective:** Verify conditional click configuration for approval handling.

**Steps:**
1. Open the recording from Scenario 3
2. Click "+ Add Variable" button
3. Select "Conditional Click"
4. Configure:
   - Search Terms: "Allow, Keep, Continue"
   - Timeout: 120 seconds
5. Save the step

**Expected Results:**
- [ ] New step appears in step table
- [ ] Step shows "🔍 Conditional" badge
- [ ] `conditionalConfig` saved with correct values
- [ ] Step type is `conditional-click`

---

### Scenario 5: CSV Data Upload

**Objective:** Verify CSV mapping for prompt variable.

**Steps:**
1. Navigate to Field Mapper page
2. Upload test-prompts.csv
3. Map "Prompt" column to the prompt input step
4. Save mapping

**Expected Results:**
- [ ] CSV parsed correctly (4 data rows)
- [ ] Column mapped to correct step
- [ ] Mapping preview shows substituted values

---

### Scenario 6: Full Playback Test

**Objective:** Verify complete workflow execution.

**Steps:**
1. Navigate to Test Runner page
2. Select the configured recording
3. Click "Run Test"
4. Observe execution for all 4 CSV rows

**Expected Results:**

**Row 1 (All Steps):**
- [ ] Opens Claude.ai
- [ ] Navigates to project
- [ ] Enters first prompt via Vision click
- [ ] Clicks send button
- [ ] Conditional click polls for approval buttons
- [ ] Global delay applied after each step

**Rows 2-4 (Loop Steps Only):**
- [ ] Skips open and navigation steps
- [ ] Enters row's prompt via Vision
- [ ] Clicks send
- [ ] Conditional click handles approvals
- [ ] Uses different CSV value each row

**Console Logs Should Show:**
```
🔄 Processing CSV row 1/4
📍 Step 0: Executing via DOM
📍 Step 1: Executing via DOM
📍 Step 2: Executing via Vision (coordinates: 400, 500)
📍 Step 3: Executing via DOM
📍 Step 4: Conditional click polling...
✅ Clicked "Allow" button
⏱️ Waiting 5000ms (global delay)

🔄 Processing CSV row 2/4
📍 Step 2: Executing via Vision (skipped steps 0-1)
...
```

---

### Scenario 7: Approval Button Auto-Click

**Objective:** Verify conditional click detects and clicks approval buttons.

**Steps:**
1. During playback, observe when Claude shows an approval dialog
2. Note the conditional click polling behavior
3. Verify button is clicked automatically

**Expected Results:**
- [ ] Polling logs visible in console
- [ ] "Allow" or "Keep" button detected via OCR
- [ ] Button clicked automatically
- [ ] Click count logged
- [ ] Timeout exits cleanly if no buttons found

---

### Scenario 8: Rollback Verification

**Objective:** Verify existing recordings still work without new features.

**Steps:**
1. Create a simple recording (open + click + type)
2. Do NOT add any Vision features
3. Run playback

**Expected Results:**
- [ ] Recording works exactly as before
- [ ] No delays applied (`globalDelayMs = 0`)
- [ ] All steps execute (`loopStartIndex = 0`)
- [ ] No conditional polling occurs
- [ ] No Vision fallback triggered

---

## 4. ERROR HANDLING TESTS

### Test: Invalid Coordinates
- Create step with coordinates outside viewport
- **Expected:** Graceful error, continue to next step

### Test: OCR Failure
- Test with page containing no recognizable text
- **Expected:** Timeout, log warning, continue

### Test: Tab Closed During Playback
- Close target tab mid-playback
- **Expected:** Error logged, playback stops gracefully

### Test: Network Timeout
- Disconnect network during playback
- **Expected:** Error logged, retry logic (if implemented), or graceful stop

---

## 5. PERFORMANCE BENCHMARKS

| Operation | Target | Actual |
|-----------|--------|--------|
| Extension load | < 2s | |
| Screenshot capture | < 500ms | |
| OCR recognition | < 2s | |
| Step execution | < 100ms | |
| Conditional poll cycle | < 1s | |
| Vision engine init | < 3s | |

---

## 6. SIGN-OFF CHECKLIST

### Functional Requirements
- [ ] Vision recording fallback works
- [ ] CSV loop executes correctly
- [ ] Delays apply as configured
- [ ] Conditional clicks trigger
- [ ] All CSV rows process
- [ ] Approval buttons auto-clicked

### Non-Functional Requirements
- [ ] No console errors
- [ ] Performance within targets
- [ ] Memory usage stable
- [ ] Rollback verified

### Documentation
- [ ] Test results documented
- [ ] Issues logged with steps to reproduce
- [ ] Screenshots captured for failures

---

## 7. TEST EXECUTION LOG

| Date | Tester | Scenario | Result | Notes |
|------|--------|----------|--------|-------|
| | | 1. Record Copilot | | |
| | | 2. Time Delays | | |
| | | 3. CSV Loop Start | | |
| | | 4. Conditional Click | | |
| | | 5. CSV Upload | | |
| | | 6. Full Playback | | |
| | | 7. Auto-Click | | |
| | | 8. Rollback | | |

---

**Tester:** _________________  
**Date:** _________________  
**Build Version:** _________________  
**Overall Result:** ☐ PASS ☐ FAIL
