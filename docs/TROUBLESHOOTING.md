# Troubleshooting Guide

> Common issues and solutions for the Muffin Chrome Extension.

**Build Card:** DOC-003  
**Version:** 2.1.0

---

## Table of Contents

1. [Installation Issues](#installation-issues)
2. [Recording Issues](#recording-issues)
3. [Playback Issues](#playback-issues)
4. [Vision/OCR Issues](#visionocr-issues)
5. [Conditional Click Issues](#conditional-click-issues)
6. [CSV Loop Issues](#csv-loop-issues)
7. [Performance Issues](#performance-issues)
8. [Error Messages](#error-messages)

---

## Installation Issues

### Extension Won't Load

**Symptoms:**
- Chrome shows "Manifest file is missing or unreadable"
- Extension appears grayed out in chrome://extensions

**Solutions:**
1. Verify build completed successfully:
   ```bash
   npm run build
   ```
2. Check that `release/` directory exists and contains `manifest.json`
3. Load the `release/` directory, not the root project directory
4. Check Chrome console for specific manifest errors
5. Ensure you're using Chrome/Edge (Manifest V3 required)

---

### Tesseract.js Fails to Load

**Symptoms:**
- Vision features not working
- Console error: "Failed to load Tesseract.js worker"

**Solutions:**
1. Check internet connection (traineddata downloads from CDN)
2. Verify CSP in `manifest.json` allows Tesseract CDN:
   ```json
   "content_security_policy": {
     "extension_pages": "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'"
   }
   ```
3. Clear browser cache and reload extension
4. Check browser console for blocked resources

---

### Build Errors

**Symptoms:**
- `npm run build` fails with TypeScript errors

**Solutions:**
1. Install dependencies:
   ```bash
   npm install
   ```
2. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```
3. Check Node.js version (requires 16+):
   ```bash
   node --version
   ```
4. Run TypeScript check:
   ```bash
   npm run type-check
   ```

---

## Recording Issues

### Steps Not Captured

**Symptoms:**
- Clicking elements doesn't record steps
- Some interactions are missed

**Solutions:**
1. Verify recording is started (green badge on extension icon)
2. Check that element is in the main document (not iframe)
3. For iframes, ensure same-origin policy allows access
4. Check browser console for recorder errors
5. Try enabling Vision fallback for problematic elements

---

### Vision Fallback Not Triggering

**Symptoms:**
- Shadow DOM elements record as DOM
- Expected 👁️ Vision badge not appearing

**Solutions:**
1. Verify element is truly in Shadow DOM:
   ```javascript
   element.getRootNode() !== document
   ```
2. Check nesting depth (must be >15 levels)
3. Verify Vision Engine is initialized
4. Check console for Vision errors
5. Try manual Vision recording with Shift+Click

---

### Recorded Coordinates Incorrect

**Symptoms:**
- Vision clicks miss the target during playback
- Clicks happen in wrong location

**Solutions:**
1. Ensure window size matches recording:
   - Vision coordinates are viewport-relative
   - Use same browser zoom level
2. Check if element moved between recording and playback
3. Try recording with stable page layout
4. Use DOM recording instead of Vision when possible

---

### CSV Upload Fails

**Symptoms:**
- "Failed to parse CSV" error
- CSV file won't upload

**Solutions:**
1. Verify CSV format (UTF-8, comma-separated)
2. Check for proper headers in first row
3. Remove special characters from column names
4. Use standard CSV encoding (no BOM)
5. Try with simplified test CSV:
   ```csv
   name,email,phone
   John,john@example.com,555-0100
   Jane,jane@example.com,555-0101
   ```

---

## Playback Issues

### Steps Execute Too Fast

**Symptoms:**
- Playback fails due to race conditions
- Elements not ready when clicked

**Solutions:**
1. Add global delay:
   - Open recording settings
   - Set "Global Delay" to 1000ms or higher
2. Add per-step delay:
   - Click ⏱️ icon on slow steps
   - Set custom delay
3. Use conditional clicks for dynamic content
4. Check network timing (slow API responses)

---

### "Element Not Found" Errors

**Symptoms:**
- Playback stops with "Could not find element"
- Works during recording but not playback

**Solutions:**
1. Check if element identifiers changed:
   - Dynamic IDs
   - Session-specific attributes
2. Try recording with Vision fallback (Shift+Click)
3. Increase delays for slow-loading elements
4. Verify page URL matches recording
5. Check if element is in iframe (not supported)

---

### Vision Clicks Fail

**Symptoms:**
- Vision steps (👁️) fail during playback
- "Could not find text" error

**Solutions:**
1. Verify window size matches recording
2. Check if text changed (dynamic content)
3. Increase confidence threshold tolerance:
   - Vision settings → Lower confidence
4. Use OCR-friendly fonts when possible
5. Check screenshot timing (element may not be rendered)

---

## Vision/OCR Issues

### Text Not Recognized

**Symptoms:**
- OCR returns no results
- Expected text not found

**Solutions:**
1. Check font characteristics:
   - Very small fonts (<10px) have poor accuracy
   - Stylized fonts harder to recognize
   - Low contrast reduces accuracy
2. Lower confidence threshold:
   - Vision settings → 50% instead of 60%
3. Try alternative search terms (synonyms)
4. Verify language setting (default: 'eng')
5. Check element visibility:
   ```javascript
   // Element must be fully rendered
   element.getBoundingClientRect().width > 0
   ```

---

### Wrong Element Clicked

**Symptoms:**
- OCR finds text but clicks wrong instance
- Clicks similar text on page

**Solutions:**
1. Use more specific search terms
2. Add context words to narrow match
3. Check for duplicate text on page
4. Consider using DOM recording instead
5. Verify click coordinates in recorded step

---

### OCR Performance Slow

**Symptoms:**
- Vision steps take 5-10 seconds
- Browser becomes unresponsive

**Solutions:**
1. Enable SIMD optimization:
   - Vision settings → "Use SIMD" ✓
2. Reduce viewport size (less pixels to scan)
3. Use selective OCR (specific regions)
4. Check CPU usage (heavy parallel tasks)
5. Consider DOM recording for non-shadow elements

---

## Conditional Click Issues

### Buttons Not Clicked

**Symptoms:**
- Conditional step (🎯) times out
- Buttons visible but not clicked

**Solutions:**
1. Check search terms match exactly:
   ```typescript
   searchTerms: ['Allow', 'Continue']  // Case-insensitive
   ```
2. Lower confidence threshold:
   - Settings → 50% for difficult fonts
3. Increase timeout:
   - Settings → 300 seconds for slow workflows
4. Verify button text is selectable/visible
5. Check console for Vision errors

---

### Stops Too Early

**Symptoms:**
- Conditional click stops before success text appears
- Only clicks 1-2 buttons then exits

**Solutions:**
1. Verify success text configuration:
   ```typescript
   successText: 'Changes saved'  // Must match exactly
   ```
2. Check if success text is in viewport
3. Try without success text (timeout-based)
4. Increase polling interval:
   - Settings → 1000ms for heavy pages
5. Check for interfering popups/overlays

---

### Timeout Reached

**Symptoms:**
- "Timed out" error after waiting full duration
- No buttons clicked

**Solutions:**
1. Verify search terms are correct
2. Check if buttons load dynamically (increase timeout)
3. Lower confidence threshold
4. Verify buttons are in main document (not iframe)
5. Try manual playback to debug specific step

---

## CSV Loop Issues

### Wrong Steps Execute

**Symptoms:**
- Non-loop steps repeat with CSV data
- Loop doesn't cover intended range

**Solutions:**
1. Verify loop start index:
   - Click 🔁 icon on first loop step
   - Check step number is correct
2. Ensure loop steps are after loop start
3. Check step ordering in recording
4. Review step badges in editor

---

### Values Not Substituting

**Symptoms:**
- Literal "{{columnName}}" appears instead of data
- Variables not replaced

**Solutions:**
1. Verify CSV has matching column header:
   ```csv
   firstName,lastName,email
   John,Doe,john@example.com
   ```
2. Check variable syntax:
   - Correct: `{{firstName}}`
   - Incorrect: `{firstName}`, `$firstName`
3. Verify mapping in "Map Fields" dialog
4. Check console for substitution errors
5. Test with simple single-column CSV

---

### Loop Doesn't Repeat

**Symptoms:**
- Executes only first CSV row
- Loop start marker not working

**Solutions:**
1. Verify loop start is configured:
   - 🔁 badge visible on step
   - `loopStartIndex` set in recording
2. Check CSV has multiple rows (>1 data row)
3. Verify CSV uploaded successfully
4. Check for errors in CSV parsing (console)

---

## Performance Issues

### Extension Slow/Laggy

**Symptoms:**
- UI freezes when opening
- High memory usage

**Solutions:**
1. Clear old recordings:
   - Recordings manager → Delete unused
2. Reduce CSV size (<1000 rows)
3. Clear browser storage:
   ```javascript
   // In console
   chrome.storage.local.clear()
   ```
4. Check Chrome task manager (Shift+Esc)
5. Restart browser

---

### Playback Very Slow

**Symptoms:**
- Each step takes multiple seconds
- Total playback time excessive

**Solutions:**
1. Reduce global delay (Settings → 500ms)
2. Remove unnecessary per-step delays
3. Disable Vision for DOM-recordable elements
4. Check network timing (API calls)
5. Close other tabs/extensions

---

### High CPU Usage

**Symptoms:**
- Fan spins up during Vision recording/playback
- Browser becomes unresponsive

**Solutions:**
1. Limit Vision usage:
   - Only use for Shadow DOM elements
   - Prefer DOM recording when possible
2. Enable SIMD optimization
3. Increase polling interval (1000ms)
4. Close unused Chrome tabs
5. Check for other CPU-intensive extensions

---

## Error Messages

### "Worker already terminated"

**Cause:** Attempting to use VisionEngine after termination

**Solution:** Re-initialize engine:
```typescript
await engine.initialize();
```

---

### "Screenshot capture failed"

**Cause:** Tab not accessible or closed

**Solutions:**
1. Verify tab still exists
2. Check tab permissions (chrome:// pages blocked)
3. Ensure not in incognito without permission
4. Try refreshing page and re-recording

---

### "Confidence too low"

**Cause:** OCR couldn't find text with sufficient confidence

**Solutions:**
1. Lower confidence threshold (Settings → 50%)
2. Use clearer fonts/higher contrast
3. Zoom in on target element
4. Try alternative search terms

---

### "Migration failed"

**Cause:** Recording has invalid v1/v2 schema

**Solutions:**
1. Check recording version in console:
   ```javascript
   recording.version
   ```
2. Manually fix negative values
3. Re-record with v2.1.0
4. Export and reimport recording

---

### "CSV mapping failed"

**Cause:** Column headers don't match placeholders

**Solutions:**
1. Verify column names match:
   - CSV: `firstName`
   - Placeholder: `{{firstName}}`
2. Check for typos/case sensitivity
3. Remove special characters from headers
4. Use "Map Fields" to manually assign

---

### "Conditional click timeout"

**Cause:** Success text not found within timeout

**Solutions:**
1. Increase timeout (Settings → 300s)
2. Verify success text spelling
3. Check if text appears in viewport
4. Try without success text (iterate only)
5. Check console for Vision errors

---

## Getting Help

If issues persist after trying these solutions:

1. **Check Console Logs:**
   - Open DevTools (F12)
   - Check Console and Network tabs
   - Look for red error messages

2. **Export Debug Info:**
   - Recording → Export → Save JSON
   - Include in bug report

3. **Enable Debug Mode:**
   ```typescript
   const engine = new VisionEngine({ debugMode: true });
   ```

4. **Test with Minimal Example:**
   - Try on simple test page
   - Isolate specific failing step
   - Record screen capture if possible

5. **Review Documentation:**
   - [README.md](../README.md)
   - [API.md](./API.md)
   - [E2E_TEST_PROCEDURE.md](./E2E_TEST_PROCEDURE.md)

---

**Last Updated:** v2.1.0
