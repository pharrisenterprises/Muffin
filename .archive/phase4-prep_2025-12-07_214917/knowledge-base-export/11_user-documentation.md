# USER DOCUMENTATION: Muffin Lite V2

## Getting Started

### Installation

1. **Install from Chrome Web Store**
   - Visit: [Chrome Web Store - Muffin Lite V2](#)
   - Click "Add to Chrome"
   - Approve permissions when prompted

2. **Verify Installation**
   - Look for Muffin icon in Chrome toolbar
   - Click icon to open popup
   - You should see the Dashboard view

### Required Permissions

Muffin Lite V2 requires the following permissions:

| Permission | Purpose |
|------------|---------|
| `debugger` | Enables intelligent element detection (CDP) |
| `activeTab` | Records interactions on current tab |
| `tabs` | Manages recordings across multiple tabs |
| `storage` | Saves your recordings and projects |
| `scripting` | Injects recording/playback scripts |
| `<all_urls>` | Works on any website you visit |

---

## Core Concepts

### What is a Recording?
A **recording** is a sequence of user interactions (clicks, typing, navigation) captured on a website. Each interaction is saved as a "step" with multiple fallback strategies for reliable playback.

### What is a Project?
A **project** is a container for one or more recordings. Use projects to organize tests by feature, workflow, or website.

### Multi-Strategy Intelligence
Muffin Lite V2 uses **7 different strategies** to find elements during playback:

1. **CDP Semantic** - Finds elements by role and name (e.g., "button named Submit")
2. **CDP Power** - Finds elements by text, label, or placeholder
3. **DOM Selector** - Uses element IDs and classes
4. **CSS Selector** - Uses CSS paths
5. **Evidence Scoring** - Uses mouse trails and element attributes
6. **Vision Engine** - Uses OCR to read text on screen
7. **Coordinates** - Falls back to click position

This ensures tests work even when websites change.

---

## Features Guide

### 1. Recording a Test

**Step-by-Step:**

1. Click the Muffin icon in Chrome toolbar
2. Click "New Recording" or navigate to Dashboard → "Create Recording"
3. Enter a name (e.g., "Login Flow")
4. Select or create a project
5. Click "Start Recording" (tab will reload)
6. Perform your test steps on the website
7. Click "Stop Recording" when done

**Recording UI Overlay:**

While recording, you'll see an overlay in the bottom-right corner:

```
┌─────────────────────────────┐
│ 🔴 RECORDING                │
│ Steps: 5                    │
│ [Pause] [Stop]              │
└─────────────────────────────┘
```

**What Gets Recorded:**
- ✅ Clicks (left-click, right-click)
- ✅ Typing (input fields, text areas)
- ✅ Navigation (page changes, form submits)
- ✅ Dropdowns (select options)
- ✅ Checkboxes and radio buttons
- ✅ Scrolling (viewport changes)
- ❌ Mouse hover (not captured)
- ❌ Keyboard shortcuts (not captured)

### 2. Playing Back a Test

**Step-by-Step:**

1. Open Dashboard
2. Find your recording in the list
3. Click "Play" button (▶)
4. Select playback speed:
   - **Normal** (1x) - Real-time
   - **Fast** (2x) - Double speed
   - **Slow** (0.5x) - Half speed for debugging
5. Watch the test execute automatically

**Playback UI Overlay:**

```
┌─────────────────────────────┐
│ ▶ PLAYING BACK              │
│ Step 3 of 12                │
│ Strategy: CDP Semantic      │
│ [Pause] [Stop]              │
└─────────────────────────────┘
```

**Success Indicators:**
- ✅ Green checkmarks appear on successful steps
- ⚠️ Yellow warnings indicate fallback strategy used
- ❌ Red X indicates step failure

### 3. Time Delays

Add custom delays between steps for slow-loading pages.

**How to Add:**

1. During recording, click "Add Delay" in overlay
2. Or edit step in Dashboard → "Edit Step" → "Delay Before (ms)"
3. Enter milliseconds (e.g., 2000 = 2 seconds)

**Use Cases:**
- Wait for API responses
- Allow animations to complete
- Let modals fully open

**Example:**
```
Step 5: Click "Submit"
  ├─ Delay Before: 1000ms (wait for form validation)
  └─ Action: click
```

### 4. CSV Data Loop

Run the same test with different data from a CSV file.

**CSV Format:**

```csv
username,password,expectedResult
user1@test.com,Pass123!,success
user2@test.com,WrongPass,error
user3@test.com,Pass456!,success
```

**How to Use:**

1. Create a recording with placeholders (e.g., type "username" in login field)
2. Click "CSV Mode" in Dashboard
3. Upload your CSV file
4. Map CSV columns to recorded steps:
   - Column `username` → Step 2 (type in username field)
   - Column `password` → Step 3 (type in password field)
5. Click "Run CSV Loop"

**Result:**
The test will run 3 times (once per CSV row), using different data each time.

### 5. Conditional Clicks

Click an element only if a condition is met.

**How to Configure:**

1. Select a step in Dashboard
2. Click "Make Conditional"
3. Set condition type:
   - **Element Exists** - Click only if element is found
   - **Element Text Equals** - Click only if text matches
   - **Element Visible** - Click only if element is visible
4. Enter condition value

**Example Use Case:**

```
Step 8: Close Cookie Banner (Conditional)
  ├─ Condition: Element Exists
  ├─ Selector: button[aria-label="Accept Cookies"]
  └─ Action: click (skipped if banner not present)
```

### 6. Vision Engine (OCR Fallback)

When traditional methods fail, Muffin uses OCR to read text on screen.

**When It Activates:**
- Canvas elements (no DOM structure)
- Shadow DOM (inaccessible elements)
- Dynamic content (constantly changing IDs)
- Images with text

**How It Works:**
1. Takes screenshot of viewport
2. Runs OCR (Tesseract.js) to extract text
3. Finds text matching recorded label
4. Clicks detected position

**Visual Indicator:**

During playback, you'll see:
```
👁️ Vision Engine: Searching for "Submit"...
✅ Found at (x: 450, y: 320)
```

### 7. Field Mapping

Map form fields to recorded steps for easy editing.

**How to Use:**

1. Open Dashboard → Select Recording
2. Click "Field Mapper"
3. View all input fields detected
4. Edit values directly:
   - Username: `user@test.com` → `new_user@test.com`
   - Password: `********` → (click to reveal/edit)
5. Click "Save Mapping"

**Result:**
Next playback will use updated values without re-recording.

---

## Dashboard Overview

### Main Screen

```
┌────────────────────────────────────────────────────┐
│ Muffin Lite V2                        [+ New]      │
├────────────────────────────────────────────────────┤
│ Projects                                           │
│ ┌─────────────────────────────────────────────┐  │
│ │ 📁 E-Commerce Tests              [▶] [⚙️]    │  │
│ │   3 recordings · Last run: 2 hrs ago         │  │
│ └─────────────────────────────────────────────┘  │
│                                                    │
│ Recordings                                         │
│ ┌─────────────────────────────────────────────┐  │
│ │ 🎬 Login Flow                    [▶] [✏️] [⋮] │  │
│ │   12 steps · Last run: 5 mins ago · ✅ Pass  │  │
│ ├─────────────────────────────────────────────┤  │
│ │ 🎬 Checkout Process              [▶] [✏️] [⋮] │  │
│ │   24 steps · Last run: 1 hr ago · ❌ Fail    │  │
│ └─────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
```

### Recording Detail View

Click a recording to see:

- **Step List** - All recorded steps with status
- **Playback History** - Past runs with success/fail
- **Field Mapping** - Editable form values
- **CSV Configuration** - Data loop settings
- **Export Options** - Download as JSON

---

## Troubleshooting

### Problem: Recording doesn't start

**Possible Causes:**
- Page not fully loaded
- Extension permissions denied
- Conflicting extension active

**Solutions:**
1. Refresh the page and try again
2. Check `chrome://extensions` - ensure Muffin is enabled
3. Disable other recording extensions temporarily
4. Check browser console for errors (F12 → Console)

### Problem: Playback fails on specific step

**Possible Causes:**
- Website structure changed
- Element not loaded in time
- Element hidden/disabled

**Solutions:**
1. Add a time delay before the failing step
2. Use Vision Engine fallback (edit step → Enable Vision)
3. Re-record the step
4. Check if element has dynamic ID (use CDP locators instead)

### Problem: Vision Engine is slow

**Expected Behavior:**
- Vision OCR takes ~1-2 seconds (normal)
- Only activates when other strategies fail

**Optimization Tips:**
1. Ensure good internet connection (downloads Tesseract model on first use)
2. Close unnecessary Chrome tabs (frees up memory)
3. Disable Vision Engine for fast tests (edit step → Vision: Off)

### Problem: CSV loop not mapping data correctly

**Common Mistakes:**
- CSV column names don't match expected format
- CSV has extra spaces in column names
- Step not configured to accept CSV input

**Solutions:**
1. Verify CSV format (use provided template)
2. Check Field Mapper → ensure columns are mapped
3. Re-upload CSV and re-map columns

### Problem: Extension slows down browser

**Possible Causes:**
- Too many recordings stored
- Large CSV files loaded
- Old telemetry data not cleared

**Solutions:**
1. Delete old recordings (Dashboard → ⋮ → Delete)
2. Clear storage: Settings → Clear Data
3. Restart Chrome
4. Reduce CSV file size (split into smaller files)

---

## Tips & Best Practices

### ✅ Do's

- **Use descriptive names** - "Login with Valid Credentials" not "Test 1"
- **Add delays for slow pages** - Better to wait than fail
- **Record in small chunks** - Easier to debug failures
- **Use CSV loops for data** - Avoid hardcoding test data
- **Enable Vision fallback** - For dynamic websites
- **Test recordings regularly** - Catch breaking changes early

### ❌ Don'ts

- **Don't record sensitive data** - Use placeholders, fill via CSV
- **Don't record on slow connections** - Timing will be off
- **Don't record CAPTCHA flows** - Will always fail on replay
- **Don't record hover actions** - Not supported yet
- **Don't record keyboard shortcuts** - Use explicit clicks instead

### Performance Tips

- **Keep recordings under 50 steps** - Split long flows into multiple recordings
- **Use CDP locators over coordinates** - More reliable and faster
- **Disable Vision Engine for fast tests** - Only use when needed
- **Clear old playback history** - Reduces storage usage

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+R` | Start/Stop Recording |
| `Ctrl+Shift+P` | Play/Pause Playback |
| `Ctrl+Shift+D` | Open Dashboard |
| `Esc` | Stop Recording/Playback |

---

## FAQ

### Q: Does Muffin work on all websites?
**A:** Yes, Muffin works on any website. However, some anti-bot protections (CAPTCHA, Cloudflare) may block automated playback.

### Q: Can I export recordings to other tools?
**A:** Currently, you can export to JSON format. Integration with Selenium/Playwright is planned for Phase 3.

### Q: Is my data stored in the cloud?
**A:** No, all data is stored locally in Chrome's IndexedDB. Nothing is sent to external servers.

### Q: Can I share recordings with my team?
**A:** Export recordings as JSON and share the file. Team members can import via Dashboard → Import.

### Q: What happens if a website blocks Muffin?
**A:** Some websites detect automation tools. Try:
- Slowing down playback speed
- Adding random delays between steps
- Using Vision Engine for critical steps

### Q: Can I test on mobile browsers?
**A:** Not yet. Muffin is Chrome-only. Mobile support is planned for Phase 4.

### Q: How do I report bugs?
**A:** GitHub Issues: [github.com/muffin-lite/issues](#)
Email: support@muffinlite.com

---

## Support

**Documentation:** [docs.muffinlite.com](#)  
**Video Tutorials:** [youtube.com/muffinlite](#)  
**Community Discord:** [discord.gg/muffinlite](#)  
**Email Support:** support@muffinlite.com  

---

## Changelog

### Version 2.0.0 (Phase 2)
- ✨ NEW: Multi-strategy intelligence (7 locator types)
- ✨ NEW: Vision Engine (OCR fallback)
- ✨ NEW: Time delays
- ✨ NEW: CSV data loops
- ✨ NEW: Conditional clicks
- ✨ NEW: CDP integration (getByRole, getByText, etc.)
- 🔧 Improved: Playback reliability
- 🔧 Improved: Dashboard UI

### Version 1.0.0 (Phase 1)
- ✨ Initial release
- Basic recording/playback
- Project management
- Step editing
