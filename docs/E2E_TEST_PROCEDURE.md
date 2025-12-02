# TST-010: Full Copilot Workflow E2E Test Procedure

> **Build Card:** TST-010  
> **Type:** Manual End-to-End Test  
> **Dependencies:** All implemented features  
> **Estimated Time:** 30 minutes

---

## Prerequisites

1. Extension built and loaded in Chrome
2. Access to Claude.ai or similar Copilot-style interface
3. Test CSV file with 3+ rows prepared
4. Chrome DevTools available for debugging

---

## Test Environment Setup

### 1. Build Extension
```bash
npm run build
```

### 2. Load Extension in Chrome
1. Navigate to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist` folder

### 3. Prepare Test CSV

Create `test-data.csv`:
```csv
Prompt,Expected
"Write a haiku about testing","Should generate haiku"
"Explain recursion simply","Should explain recursion"
"List 3 programming languages","Should list languages"
```

---

## Test Scenarios

### Scenario 1: Vision Fallback Recording

**Objective:** Verify Vision fallback triggers for complex inputs

**Steps:**
1. Open Claude.ai chat interface
2. Click the extension icon → Open Recorder
3. Click "Record" button
4. Navigate to the prompt input area
5. Click in the Monaco editor / complex input field
6. Type a test prompt
7. Click "Stop Recording"

**Expected Results:**
- [ ] Step captured with `recordedVia: 'vision'` if Monaco editor
- [ ] Step has Vision badge (👁️) in UI
- [ ] Coordinates captured correctly
- [ ] OCR text captured (if available)

**Verification:**
```javascript
// In DevTools console, check step data:
// step.recordedVia === 'vision'
// step.coordinates !== undefined
```

---

### Scenario 2: Time Delay Configuration

**Objective:** Verify global and per-step delays work correctly

**Steps:**
1. Open existing recording or create new one
2. Set "Global Delay" to 2000ms in toolbar
3. Click three-dot menu on Step 2
4. Select "Set Delay Before Step"
5. Enter 5 seconds
6. Save and run playback

**Expected Results:**
- [ ] Global delay input accepts value
- [ ] Per-step delay badge (⏱️ 5s) appears on Step 2
- [ ] During playback, 5s delay occurs BEFORE Step 2
- [ ] 2s delay occurs AFTER other steps

**Timing Verification:**
- Step 1 executes → 2s pause → Step 2 waits 5s → executes → 2s pause → Step 3

---

### Scenario 3: CSV Loop Configuration

**Objective:** Verify loop start and CSV iteration

**Steps:**
1. Open recording with 4 steps
2. Set "CSV Loop Start" dropdown to "Loop from Step 3"
3. Verify Loop Start badge (🔁) appears on Step 3
4. Upload test CSV with 3 rows
5. Run playback

**Expected Results:**
- [ ] Row 1: Executes Steps 1, 2, 3, 4 (all steps)
- [ ] Row 2: Executes Steps 3, 4 only (from loop start)
- [ ] Row 3: Executes Steps 3, 4 only
- [ ] CSV values substitute correctly in each row

**Console Verification:**
```
Row 1: Executing steps 1-4
Row 2: Executing steps 3-4 (loop start)
Row 3: Executing steps 3-4 (loop start)
```

---

### Scenario 4: Conditional Click

**Objective:** Verify approval button automation

**Steps:**
1. Open recording
2. Click "+ Add Conditional" button
3. Configure:
   - Search Terms: "Allow, Continue, Accept"
   - Timeout: 60 seconds
   - Poll Interval: 1000ms
4. Save the conditional step
5. Run playback on a page that shows approval dialogs

**Expected Results:**
- [ ] Conditional step added with 🎯 badge
- [ ] During playback, Vision polling starts
- [ ] When "Allow" button appears, it's clicked automatically
- [ ] Polling continues until timeout or success

**Log Verification:**
```
[Conditional] Polling for: Allow, Continue, Accept
[Conditional] Found "Allow" at (x, y)
[Conditional] Clicked button
[Conditional] Buttons clicked: 1
```

---

### Scenario 5: Full Workflow Integration

**Objective:** Verify all features work together

**Steps:**
1. Create new recording on Claude.ai:
   - Step 1: Open page (https://claude.ai/chat)
   - Step 2: Click new chat (may use Vision)
   - Step 3: Enter prompt (Vision fallback for Monaco)
   - Step 4: Click send button
2. Configure:
   - Global delay: 1000ms
   - Per-step delay: 300s on Step 4 (wait for response)
   - Loop start: Step 3
   - Add conditional click for "Allow" buttons
3. Upload CSV with 3 different prompts
4. Run full playback

**Expected Results:**
- [ ] Recording captures all steps correctly
- [ ] Vision fallback triggers where needed
- [ ] Delays are respected
- [ ] CSV values substitute correctly
- [ ] Conditional clicks handle any approval dialogs
- [ ] All 3 prompts are submitted successfully

---

## Regression Checks

### DOM Recording Still Works
- [ ] Standard buttons record with DOM
- [ ] Standard inputs record with DOM
- [ ] XPath selectors are valid

### Legacy Recordings Compatible
- [ ] Old recordings load without error
- [ ] Old recordings play back correctly
- [ ] No migration errors in console

### Performance
- [ ] OCR completes in < 3 seconds
- [ ] Extension doesn't freeze during playback
- [ ] Memory usage is reasonable

---

## Issue Reporting Template

If any test fails, document:
```markdown
### Issue: [Brief Description]

**Test Scenario:** [Number and name]
**Step Failed:** [Which step]
**Expected:** [What should happen]
**Actual:** [What actually happened]
**Console Errors:** [Any errors]
**Screenshots:** [If applicable]
**Reproducible:** Yes/No
```

---

## Sign-off

| Test Scenario | Pass/Fail | Tester | Date |
|---------------|-----------|--------|------|
| Vision Fallback Recording | | | |
| Time Delay Configuration | | | |
| CSV Loop Configuration | | | |
| Conditional Click | | | |
| Full Workflow Integration | | | |
| Regression Checks | | | |

**Overall Status:** [ ] PASS [ ] FAIL

**Notes:**
```
```

---

*Last Updated: December 2, 2025*
