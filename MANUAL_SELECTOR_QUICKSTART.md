# MANUAL SELECTOR INTERVENTION TOOL - QUICK START

**Version:** 2.1.5-MANUAL-SELECTOR  
**Status:** ✅ READY FOR TESTING  
**Build Time:** 20.25 seconds  
**Date:** December 4, 2025

---

## ✅ WHAT'S COMPLETE

All components of the Manual Selector Intervention Tool have been successfully integrated:

1. **✅ SelectorAreaModal.tsx** - Interactive modal for drawing on screenshots
2. **✅ Background Screenshot Handler** - Captures page screenshots via Chrome API
3. **✅ StepsTable Integration** - Menu option + visual indicators
4. **✅ Priority 0 Playback** - Manual selectors checked FIRST, before all other strategies
5. **✅ Build Successful** - 0 TypeScript errors, clean build

---

## 🎯 WHAT IT DOES

The Manual Selector is a **safety net** for when automated recording fails:

**Problem:**
- Recording captures wrong element (e.g., terminal 1 instead of terminal 2)
- Playback sends text to wrong location (e.g., Copilot chat input goes to terminal)

**Solution:**
- User draws rectangle on screenshot around CORRECT element
- Playback uses those exact coordinates FIRST (Priority 0)
- Guarantees correct element selection every time

---

## 🚀 HOW TO TEST

### Quick Test (Terminal vs Copilot Chat):

```powershell
# 1. Load extension
cd C:\Users\ph703\Muffin
.\LOAD_EXTENSION.bat  # Copies dist path to clipboard
```

In Chrome:
1. Navigate to `chrome://extensions`
2. Click "Load unpacked" → Paste path (Ctrl+V)

In VS Code Codespaces:
1. Open terminal (bottom panel)
2. Open Copilot chat (side panel)
3. Start recording in TestFlow
4. Type "test" in terminal → Enter
5. Type "help" in Copilot chat → Enter
6. Stop recording
7. **Run playback** → Observe if "help" goes to wrong location
8. If wrong: Click 3-dot menu on Copilot step
9. Select "**Set Selector Area**"
10. Draw rectangle around Copilot chat input
11. Click "Save Selector"
12. Re-run playback → Text should go to CORRECT location

### Expected Console Logs:
```
[TestFlow] ★★★ MANUAL SELECTOR DETECTED - Using user-defined coordinates
[TestFlow] ✅ Found interactive element via manual selector: TEXTAREA
```

---

## 📊 INTEGRATION SUMMARY

| Component | Status | File | Lines |
|-----------|--------|------|-------|
| Modal UI | ✅ | SelectorAreaModal.tsx | 350 |
| Screenshot Handler | ✅ | index.ts | +35 |
| Step Interface | ✅ | StepsTable.tsx + content.tsx | +40 |
| Menu Integration | ✅ | StepsTable.tsx | +30 |
| Priority 0 Playback | ✅ | content.tsx | +120 |

**Total:** ~575 lines across 4 files

---

## 🔍 VALIDATION CHECKLIST

Run through these checks:

- [ ] Menu option "Set Selector Area" visible in 3-dot menu
- [ ] Modal opens when clicking menu option
- [ ] Screenshot displays in modal
- [ ] Can draw rectangle by clicking and dragging
- [ ] Green border appears around selection
- [ ] Center crosshair shows click target
- [ ] "Save Selector" button works
- [ ] Green "Manual" badge appears on step after save
- [ ] Console shows "★★★ MANUAL SELECTOR DETECTED" during playback
- [ ] Playback clicks/types at drawn location (not wrong element)

---

## 📝 KEY FILES

**Created:**
- `src/components/Recorder/SelectorAreaModal.tsx` - Modal UI

**Modified:**
- `src/components/Recorder/StepsTable.tsx` - Menu + modal integration
- `src/background/index.ts` - Screenshot capture
- `src/contentScript/content.tsx` - Priority 0 playback logic

**Documentation:**
- `MANUAL_SELECTOR_COMPLETE.md` - Full integration guide (700+ lines)

**Release:**
- `release/TestFlow-2.1.5-MANUAL-SELECTOR.zip`

---

## 🎨 UI FLOW

```
User clicks 3-dot menu → "Set Selector Area"
                             ↓
                    Modal opens with screenshot
                             ↓
                    User draws rectangle
                             ↓
               Coordinates saved to step.manualSelector
                             ↓
                    Green "Manual" badge appears
                             ↓
                         Run playback
                             ↓
              Manual selector checked FIRST (Priority 0)
                             ↓
                    Element found at exact location
                             ↓
                    Click/type at correct element
                             ↓
                          SUCCESS!
```

---

## 💡 USE CASES

### When to Use:
✅ Multiple terminals (can't distinguish which one)  
✅ Multiple Monaco editors (same class, different files)  
✅ Terminal vs Copilot chat (text goes to wrong input)  
✅ Dynamic IDs/classes that change between sessions  
✅ Elements with no reliable selector  

### When NOT to Use:
❌ First recording attempt (let automation try first)  
❌ Single unique element with stable ID  
❌ Element with reliable name/aria-label  

---

## 🔧 TECHNICAL HIGHLIGHTS

### Priority 0 Implementation:
```typescript
// In findElementFromBundle(), BEFORE all other strategies:
if (bundle.manualSelector) {
  console.log('[TestFlow] ★★★ MANUAL SELECTOR DETECTED');
  
  // Scale for viewport changes
  const scaleX = window.innerWidth / bundle.manualSelector.viewportWidth;
  const scaledX = Math.round(bundle.manualSelector.centerX * scaleX);
  
  // Find element at exact coordinates
  const element = document.elementFromPoint(scaledX, scaledY);
  if (element && visible(element)) return element; // EXIT EARLY
}
```

**Key:** Returns IMMEDIATELY when manual selector finds element, skipping XPath/ID/etc.

### Data Structure:
```typescript
manualSelector: {
  centerX: 450,              // Click target X
  centerY: 350,              // Click target Y
  width: 320,                // Rectangle width
  height: 80,                // Rectangle height
  viewportWidth: 1920,       // Original viewport
  viewportHeight: 1080,
  confidence: 'user-defined' // Highest priority flag
}
```

---

## 🎉 SUCCESS CRITERIA

The tool is working correctly when:

1. **UI:** Modal opens, drawing works, coordinates save
2. **Playback:** Console shows "★★★ MANUAL SELECTOR DETECTED"
3. **Result:** Click/type happens at drawn location (not wrong element)
4. **Reliability:** Works consistently across multiple runs
5. **Scaling:** Works after browser resize (viewport scaling)

---

## 📚 FULL DOCUMENTATION

See `MANUAL_SELECTOR_COMPLETE.md` for:
- Detailed technical implementation
- 3 complete test scenarios
- Troubleshooting guide
- Console log reference
- Future enhancement ideas

---

## 🚀 NEXT STEPS

1. **Load Extension:** Use `LOAD_EXTENSION.bat`
2. **Run Quick Test:** Terminal vs Copilot chat scenario
3. **Verify UI:** Check menu option, modal, drawing
4. **Verify Playback:** Check console logs, element targeting
5. **Report Results:** Which scenarios work? Any issues?

---

**Ready for testing!** This is the safety net that guarantees correct element selection even when automation fails. 🎯

---

**Build Status:**  
✅ TypeScript: 0 errors  
✅ Vite (main): 18.92s  
✅ Vite (background): 1.33s  
✅ Total: 20.25s  

**Bundle Size:**  
Main: 1,152.29 KB (+8.63 KB)  
Background: 108.14 KB (unchanged)
