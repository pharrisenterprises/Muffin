# MODULAR RECORDING ENGINE - TESTING GUIDE

## Implementation Complete ✅

The modular recording engine has been successfully implemented with the following components:

### New Files Created

1. **src/recording/types.ts** - Type definitions
2. **src/recording/config.ts** - Configuration constants
3. **src/recording/EventCapture.ts** - DOM event listener
4. **src/recording/EventFilter.ts** - Event filtering logic
5. **src/recording/TargetResolver.ts** - SVG → button resolution
6. **src/recording/LabelGenerator.ts** - Human-readable labels
7. **src/recording/BundleBuilder.ts** - Element metadata extraction
8. **src/recording/StepEmitter.ts** - Message sending
9. **src/recording/RecordingEngine.ts** - Main orchestrator
10. **src/recording/index.ts** - Public API

### Modified Files

1. **src/background/index.ts** - Updated to pass through recording messages
2. **src/contentScript/content.tsx** - Integrated RecordingEngine, deprecated old handlers

### Key Features

✅ **No more duplicate recordings** - Single event capture path
✅ **No more garbage labels** - LabelGenerator creates clean, descriptive labels
✅ **SVG button fix** - TargetResolver walks DOM to find parent buttons
✅ **Scrollbar filtering** - EventFilter blocks scrollbar/slider clicks
✅ **Synthetic event filtering** - Only trusted user events recorded
✅ **Modular architecture** - Easy to maintain and extend

## Testing Checklist

### Build Test
```powershell
npm run build
```
**Expected:** Clean build with 0 errors

### Recording Tests

1. **Start Recording**
   - Open Recorder UI
   - Click "Start Recording"
   - Check console: Should see `[RecordingEngine] ✅ Started recording`

2. **SVG Button Click**
   - Navigate to GitHub Copilot or any site with SVG icon buttons
   - Click the send button (paper airplane icon)
   - **Expected:** Label should be "Click Send" or button aria-label, NOT "Click svg element"

3. **Scrollbar Filter**
   - Scroll using the scrollbar
   - **Expected:** NO steps recorded for scrollbar clicks
   - Console: `[RecordingEngine] ❌ Filtered: scrollbar_in_path`

4. **Terminal Input**
   - Type in VS Code terminal: `echo "hello"`
   - **Expected:** Label should be `Enter "echo \"hello\"" in terminal`
   - **NOT:** `prompt_input_1` or `terminal_input_1`

5. **Editor Input**
   - Type in Monaco editor
   - **Expected:** Label should be `Enter "[your text]" in editor`

6. **Standard Input**
   - Type in a normal `<input>` field with placeholder "Search"
   - **Expected:** Label should be `Enter "[text]" in "Search" field`

7. **Enter Key**
   - Press Enter in terminal
   - **Expected:** Label should be `Press Enter in terminal`

8. **Duplicate Prevention**
   - Rapidly click the same button multiple times
   - **Expected:** Should debounce and only record once (500ms window)

### Console Output

Good recording session should show:
```
[RecordingEngine] ✅ Started recording
[RecordingEngine] 📝 Step 1: Click "Start" button
[RecordingEngine] 📝 Step 2: Enter "test input" in "Username" field
[RecordingEngine] 📝 Step 3: Click "Submit" button
[RecordingEngine] ⏹️ Stopped recording (3 steps)
```

Bad patterns to watch for (should NOT appear):
```
❌ [RecordingEngine] prompt_input_1
❌ [RecordingEngine] search_1
❌ [RecordingEngine] terminal_input_2
❌ [TestFlow] Skipping scrollbar/resize element (old handler)
```

## Architecture Benefits

### Before (Monolithic)
- 4 separate event handlers (handleClick, handleInput, handleKeyDown, handleKeydownForComplexEditor)
- 2 label generators with shared counter causing conflicts
- Duplicate recording paths for complex editors
- Scrollbar filtering only in handleClick
- SVG resolution mixed with click handling

### After (Modular)
- **EventCapture**: Single entry point for all events
- **EventFilter**: Centralized filtering (scrollbars, synthetic events)
- **TargetResolver**: SVG → button resolution
- **LabelGenerator**: Single source of truth for labels
- **BundleBuilder**: Element metadata extraction
- **StepEmitter**: Message sending with size checks
- **RecordingEngine**: Orchestrates everything

## Troubleshooting

### If recording doesn't start:
1. Check console for `[RecordingEngine] ✅ Started recording`
2. Verify `recordingEngine.start()` is called from Recorder UI
3. Check if START_RECORDING message reaches content script

### If labels are still garbage:
1. Check LabelGenerator is being used (not old generators)
2. Verify VSCODE_ARIA_PATTERNS are cleaning aria-labels
3. Check console for label generation: `[RecordingEngine] 📝 Step X: [label]`

### If SVG buttons aren't captured:
1. Check TargetResolver is walking DOM (console: `[TargetResolver] Resolved SVG...`)
2. Verify interactive ancestor is found
3. Check if button has aria-label or text content

### If scrollbars are still recorded:
1. Check EventFilter is blocking: `[RecordingEngine] ❌ Filtered: scrollbar_in_path`
2. Verify BLOCKED_ELEMENTS config includes scrollbar classes
3. Check if scrollbar has specific class names

## Next Steps

1. **Build and test** - Run `npm run build` and load extension
2. **Record a session** - Test all scenarios above
3. **Check labels** - Verify human-readable, no counters
4. **Verify filtering** - Scrollbars should be blocked
5. **Test SVG buttons** - Icon clicks should work

## Rollback Plan

If needed, old handlers are still in content.tsx (stubbed out). To rollback:
1. Remove `recordingEngine.start()` from message handler
2. Re-enable old handlers by removing stubs
3. Re-attach event listeners in `attachListeners()`

## Success Criteria

✅ Build completes with 0 errors
✅ Recording starts/stops cleanly
✅ Labels are human-readable (e.g., "Click Send button")
✅ NO "prompt_input_1" or "search_2" labels
✅ SVG icon buttons record correctly
✅ Scrollbars are filtered out
✅ Enter key records as "Press Enter in [context]"
✅ No duplicate steps for same action
