# DOC-003: Troubleshooting Guide

> **Build Card:** DOC-003  
> **Category:** Documentation  
> **Dependencies:** ALL implementation specs, TST-010  
> **Risk Level:** Low  
> **Estimated Lines:** 250-300

---

## 1. PURPOSE

Create a comprehensive troubleshooting guide for Vision features in Muffin Lite. This documentation helps users diagnose and resolve common issues with OCR recognition, conditional clicks, timing problems, and integration failures. Includes error messages, causes, solutions, and debugging techniques.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| TST-010 | `build-instructions/masterplan/06-testing/TST-010_full-copilot-workflow-test.md` | Common failure scenarios |
| Error Handling | All ENG specs | Error messages and causes |
| DOC-001 | `build-instructions/masterplan/08-documentation/DOC-001_readme-vision-features.md` | Feature context |
| DOC-002 | `build-instructions/masterplan/08-documentation/DOC-002_vision-engine-api-docs.md` | API error reference |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `docs/TROUBLESHOOTING.md` | CREATE | +280 |

### Artifacts

- Comprehensive troubleshooting guide
- Error message reference
- Debugging techniques
- FAQ section

---

## 4. DETAILED SPECIFICATION

### 4.1 Troubleshooting Guide Content

```markdown
<!-- docs/TROUBLESHOOTING.md -->

# Muffin Lite Troubleshooting Guide

Solutions for common issues with Vision-based automation.

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [OCR Recognition Issues](#ocr-recognition-issues)
3. [Conditional Click Problems](#conditional-click-problems)
4. [Timing and Delay Issues](#timing-and-delay-issues)
5. [CSV Loop Problems](#csv-loop-problems)
6. [Extension and Permission Errors](#extension-and-permission-errors)
7. [Performance Issues](#performance-issues)
8. [Error Message Reference](#error-message-reference)
9. [Debugging Techniques](#debugging-techniques)
10. [FAQ](#faq)

---

## Quick Diagnostics

### Is Vision Working?

Run this quick check:

1. Open the Muffin Lite extension
2. Go to any webpage with visible text
3. Click **+ Add Variable → Conditional Click**
4. Set Button Text to a word visible on screen
5. Set Timeout to 5 seconds
6. Click **Test** (if available) or run playback

**Expected:** The word should be found and clicked within seconds.

### Diagnostic Checklist

| Check | How to Verify | Fix |
|-------|--------------|-----|
| Extension loaded | Icon visible in toolbar | Reinstall extension |
| Permissions granted | No permission errors | Re-enable in chrome://extensions |
| Tab accessible | Not a chrome:// page | Use regular webpage |
| VisionEngine initialized | No "not initialized" errors | Restart extension |
| OCR working | Text found on test | Check OCR section below |

---

## OCR Recognition Issues

### Problem: Text Not Found

**Symptoms:**
- Conditional click times out
- "Text not found" in logs
- findText() returns `found: false`

**Possible Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Text not visible on screen | Scroll to make text visible |
| Text in image/canvas | Vision can read images, ensure high contrast |
| Text too small | Zoom in browser (Ctrl/Cmd +) |
| Low contrast text | Adjust page styles if possible |
| Text in iframe | May work, but slower |
| Non-English text | Configure language in VisionEngine |
| OCR confidence too low | Lower `confidenceThreshold` to 0.5 |

**Debugging Steps:**

```typescript
// 1. Capture screenshot and check OCR output
const screenshot = await engine.captureScreenshot();
const result = await engine.recognizeText(screenshot.dataUrl);
console.log('All text found:', result.text);
console.log('Words:', result.words.map(w => `${w.text} (${w.confidence}%)`));

// 2. Check if your target text appears
const target = 'Allow';
const found = result.words.find(w => 
  w.text.toLowerCase().includes(target.toLowerCase())
);
console.log('Target found:', found);
```

---

### Problem: Wrong Text Clicked

**Symptoms:**
- Click lands on wrong element
- Multiple similar texts on page
- Click coordinates seem off

**Possible Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Multiple matches | Use more specific text |
| Text moved after OCR | Reduce poll interval |
| Device pixel ratio | Enable `scaleForDPR` option |
| Viewport offset | Check scroll position |
| OCR bounding box inaccurate | Lower confidence threshold |

**Debugging Steps:**

```typescript
// Find all matches and check positions
const results = await engine.findAllText('Allow');
console.log(`Found ${results.length} matches:`);
results.forEach((r, i) => {
  console.log(`  ${i}: "${r.text}" at (${r.clickX}, ${r.clickY}) conf: ${r.confidence}`);
});
```

---

### Problem: OCR Misreading Text

**Symptoms:**
- Text recognized incorrectly (e.g., "A11ow" instead of "Allow")
- Low confidence scores
- Fuzzy matching needed

**Common OCR Mistakes:**

| Actual | Misread As | Reason |
|--------|-----------|--------|
| `l` (lowercase L) | `1` (one) | Similar appearance |
| `O` (letter O) | `0` (zero) | Similar appearance |
| `I` (letter I) | `l`, `1` | Font dependent |
| `rn` | `m` | Kerning |
| `vv` | `w` | Kerning |

**Solutions:**

1. **Enable fuzzy matching:**
```typescript
const result = await engine.findText('Allow', {
  fuzzyMatch: true,
  fuzzyThreshold: 0.7,  // 70% similarity
});
```

2. **Add multiple variations:**
```typescript
const config = {
  buttonTexts: ['Allow', 'A11ow', 'AIlow'],  // Common misreads
  // ...
};
```

3. **Increase image quality:**
   - Zoom browser to 100% or higher
   - Avoid browser zoom below 100%
   - Use high-contrast themes

---

## Conditional Click Problems

### Problem: Timeout Before Button Found

**Symptoms:**
- "Timeout" termination reason
- Button never clicked
- Success text never found

**Possible Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Button text incorrect | Verify exact text on screen |
| Button appears briefly | Decrease poll interval to 200ms |
| Button in different tab | Ensure correct tab is active |
| Button in popup/modal | May need to wait for modal |
| Timeout too short | Increase `timeoutSeconds` |
| Page still loading | Add delay before conditional step |

**Debugging:**

```typescript
// Add progress callback to see what's happening
const result = await engine.waitAndClickButtons({
  buttonTexts: ['Allow', 'Keep'],
  successText: 'committed',
  timeoutSeconds: 60,
  pollIntervalMs: 500,
  confidenceThreshold: 0.6,
  onProgress: (e) => {
    console.log(`Poll #${e.pollCount} at ${e.elapsedMs}ms`);
    console.log(`  Screen text: ${e.screenText?.substring(0, 100)}...`);
  },
});
```

---

### Problem: Button Clicked But Nothing Happens

**Symptoms:**
- Click reported as successful
- UI doesn't respond
- Need to click again

**Possible Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Click coordinates wrong | Check bounding box accuracy |
| Element needs focus first | Add a preliminary click |
| Element is disabled | Wait for element to be enabled |
| Click intercepted | Check for overlay elements |
| Double-click required | Set `clickCount: 2` |

---

### Problem: Clicks Too Fast

**Symptoms:**
- Multiple buttons clicked rapidly
- UI can't keep up
- Some clicks missed

**Solutions:**

1. **Increase poll interval:**
```typescript
pollIntervalMs: 1000,  // Check every second instead of 500ms
```

2. **Add global delay:**
```typescript
recording.globalDelayMs = 500;  // 500ms between all steps
```

3. **Add per-step delay:**
```typescript
step.delaySeconds = 2;  // Wait 2 seconds before this step
```

---

## Timing and Delay Issues

### Problem: Steps Execute Too Fast

**Symptoms:**
- Page not loaded before next step
- Elements not ready
- Intermittent failures

**Solutions:**

| Solution | How |
|----------|-----|
| Global delay | Set `Delay: 500` in toolbar |
| Per-step delay | Right-click step → Set Delay |
| Conditional wait | Use conditional click with success text |

---

### Problem: Automation Too Slow

**Symptoms:**
- Workflow takes too long
- Unnecessary waiting
- Timeout on slow operations

**Solutions:**

1. **Reduce delays where safe:**
   - Global delay: 0-200ms for fast sites
   - Poll interval: 300-500ms for responsive UIs

2. **Optimize loop start:**
   - Set loop start to skip redundant setup steps

3. **Use success text:**
   - Stops polling immediately when done
   - Don't rely only on timeout

---

## CSV Loop Problems

### Problem: Loop Doesn't Skip Steps

**Symptoms:**
- All steps run for every row
- Setup steps repeat unnecessarily
- Loop Start setting ignored

**Solutions:**

1. Verify `loopStartIndex` is set correctly (not 0)
2. Check that Loop Start dropdown shows correct step
3. Ensure recording is saved after changing Loop Start

---

### Problem: CSV Values Not Substituting

**Symptoms:**
- `{{variable}}` appears literally
- Wrong values in fields
- Some rows work, others don't

**Possible Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Variable name mismatch | Match CSV header exactly (case-insensitive) |
| Missing column | Add column to CSV |
| Empty cell in CSV | Check for empty values |
| Special characters | Escape quotes in CSV |

---

## Extension and Permission Errors

### Error: "Extension context invalidated"

**Cause:** Extension was reloaded or updated during operation.

**Solution:**
1. Refresh the page
2. Restart the workflow

---

### Error: "Cannot access chrome:// URLs"

**Cause:** Chrome doesn't allow extensions to capture these pages.

**Solution:**
- Use regular webpages for testing
- Avoid chrome://, edge://, about: URLs

---

### Error: "Tab capture failed"

**Cause:** Permission denied or tab not accessible.

**Solutions:**
1. Check extension permissions in chrome://extensions
2. Reload the extension
3. Try a different tab
4. Restart Chrome

---

## Performance Issues

### Problem: High CPU Usage

**Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Poll interval too low | Increase to 500ms+ |
| Too many conditional clicks | Reduce or combine |
| Large screenshots | Close unnecessary tabs |
| Memory leak | Restart extension periodically |

---

### Problem: OCR Slow

**Typical OCR Times:**
- First recognition: 500-1000ms (worker initialization)
- Subsequent: 200-500ms
- Large screens: 500-800ms

**Optimization:**
1. Use smaller viewport if possible
2. Increase poll interval
3. Reduce number of OCR calls

---

## Error Message Reference

| Error | Cause | Solution |
|-------|-------|----------|
| `VisionEngine not initialized` | `initialize()` not called | Restart extension |
| `Invalid coordinates` | Negative or NaN values | Check bounding box |
| `Tab capture failed` | Permission or access issue | Check permissions |
| `OCR failed` | Tesseract error | Check image data |
| `Search text required` | Empty search string | Provide text to find |
| `Invalid image data` | Corrupted screenshot | Retry capture |
| `Element not clickable` | Click blocked | Check for overlays |
| `Timeout` | Operation exceeded time limit | Increase timeout |

---

## Debugging Techniques

### Enable Debug Mode

```typescript
const engine = new VisionEngine({
  debugMode: true,
});
```

This logs:
- Screenshot capture times
- OCR processing times
- All text found
- Click coordinates
- Polling progress

---

### Check Console Logs

1. Open DevTools (F12)
2. Go to Console tab
3. Filter by "Vision" or "Muffin"
4. Look for errors and warnings

---

### Test OCR Manually

```typescript
// In browser console (if engine exposed)
const result = await engine.recognizeText(await engine.captureScreenshot().then(s => s.dataUrl));
console.log(result.words);
```

---

### Verify Click Coordinates

```typescript
// Before clicking, log the target
const found = await engine.findText('Allow');
console.log('Will click at:', found.clickX, found.clickY);
console.log('Bounding box:', found.bbox);
```

---

## FAQ

### Q: Can Vision work on any website?

**A:** Most websites work. Exceptions:
- Chrome internal pages (chrome://)
- Pages requiring authentication (if not logged in)
- Some heavily obfuscated sites

---

### Q: Why is fuzzy matching needed?

**A:** OCR isn't perfect. Common fonts can be misread (l vs 1, O vs 0). Fuzzy matching finds close matches.

---

### Q: How do I automate Copilot specifically?

**A:** See the [Copilot Workflow Example](VISION_FEATURES.md#copilot-workflow-example) in Vision Features documentation.

---

### Q: Can I use Vision with existing recordings?

**A:** Yes! Existing recordings are automatically migrated. They'll use DOM by default, but you can add conditional clicks.

---

### Q: What languages does OCR support?

**A:** English by default. Configure `language` option for others (e.g., 'eng+spa' for English+Spanish).

---

### Q: How do I report a bug?

**A:** Include:
1. Error message (full text)
2. Steps to reproduce
3. Browser version
4. Screenshot if possible
5. Console logs

---

## Still Stuck?

1. **Check GitHub Issues** - Someone may have solved it
2. **Enable Debug Mode** - Get detailed logs
3. **Simplify** - Test with minimal workflow
4. **Ask for Help** - Open a new issue with details
```

---

## 5. ACCEPTANCE CRITERIA

- [ ] **AC-1:** Quick diagnostics section useful
- [ ] **AC-2:** OCR issues comprehensively covered
- [ ] **AC-3:** Conditional click problems addressed
- [ ] **AC-4:** Timing issues explained
- [ ] **AC-5:** CSV loop problems covered
- [ ] **AC-6:** Permission errors documented
- [ ] **AC-7:** Performance tips included
- [ ] **AC-8:** Error message reference complete
- [ ] **AC-9:** Debugging techniques practical
- [ ] **AC-10:** FAQ answers common questions

---

## 6. IMPLEMENTATION NOTES

### Constraints

1. **User-friendly** - Non-technical language where possible
2. **Actionable** - Clear solutions, not just explanations
3. **Searchable** - Users can find their specific issue

### Patterns to Follow

1. **Problem → Cause → Solution** format
2. **Tables for quick scanning**
3. **Code examples for developers**

### Edge Cases

1. **Undocumented errors** - Provide generic debugging steps
2. **Platform differences** - Note Chrome-specific behavior
3. **Version changes** - Keep updated with releases

---

## 7. VERIFICATION COMMANDS

```bash
# Verify docs created
ls -la docs/TROUBLESHOOTING.md

# Check for broken links
npm run docs:check-links

# Word count (should be substantial)
wc -w docs/TROUBLESHOOTING.md
```

---

## 8. ROLLBACK PROCEDURE

```bash
# Remove troubleshooting guide
rm docs/TROUBLESHOOTING.md
```

---

## 9. REFERENCES

- DOC-001: README Vision Features
- DOC-002: Vision Engine API Docs
- TST-010: Full Copilot Workflow Test
- All error handling in ENG specs

---

*End of Specification DOC-003*
