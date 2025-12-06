# CLAUDE UPLOAD CHECKLIST

**Generated:** December 6, 2025  
**Purpose:** Ensure complete synchronization between Claude KB and Copilot workspace

---

## UPLOAD CHECKLIST

### Files to Upload to Claude Knowledge Base

| # | File | Size | Status |
|---|------|------|--------|
| 1 | `ARCHITECTURE_DECISIONS.md` | ~14.5 KB | ⬜ Not uploaded |
| 2 | `BUILD_CARD_BACKLOG_PHASE2.md` | ~45 KB | ⬜ Not uploaded |
| 3 | `knowledge-base-export/MASTER_ROLLUP_PHASE2.md` | ~217 KB | ⬜ Not uploaded |
| 4 | `BIDIRECTIONAL_ANALYSIS.md` | ~25 KB | ⬜ Not uploaded |

**Total Size:** ~301.5 KB

---

## PRE-UPLOAD VERIFICATION

Before uploading files to Claude Knowledge Base:

- [ ] All 4 files exist in workspace
- [ ] All files are committed to git
- [ ] _RESOURCE_MAP.md references all files
- [ ] No syntax errors in markdown
- [ ] Code blocks use proper fencing (```)
- [ ] File paths are correct (relative to workspace root)

---

## UPLOAD PROCEDURE

### Step 1: Access Claude Knowledge Base
1. Open Claude.ai
2. Navigate to project settings
3. Select "Knowledge" tab
4. Click "Add file" button

### Step 2: Upload Files in Order
1. Upload `ARCHITECTURE_DECISIONS.md` first (establishes decision foundation)
2. Upload `BUILD_CARD_BACKLOG_PHASE2.md` second (references decisions)
3. Upload `knowledge-base-export/MASTER_ROLLUP_PHASE2.md` third (primary reference)
4. Upload `BIDIRECTIONAL_ANALYSIS.md` fourth (gap analysis)

### Step 3: Verify Upload
- [ ] All 4 files appear in Knowledge list
- [ ] File sizes match expected values
- [ ] No upload errors reported
- [ ] Files are searchable in Claude

---

## POST-UPLOAD VERIFICATION

### Test 1: Reference Check
Ask Claude:
```
What is Decision 5 from ARCHITECTURE_DECISIONS.md?
```

**Expected Answer:**
"Decision 5: Strategy Degradation Policy - NONE. Full multi-layer system with all 7 strategies always evaluated. No degradation. Recording captures ALL evidence types. Playback evaluates ALL strategies in parallel and tries them in confidence order."

---

### Test 2: Build Card Query
Ask Claude:
```
What are the dependencies for VIS-001?
```

**Expected Answer:**
"VIS-001 (VisionEngine Skeleton) depends on FND-001 (Install Tesseract.js) and FND-005 (Create vision.ts types). Priority P0 Critical. Status: Ready to Build."

---

### Test 3: Cross-Reference Test
Ask Claude:
```
Which build cards reference Decision 1 (Tesseract Loading)?
```

**Expected Answer:**
"VIS-001, VIS-002, INT-002, TST-005. Decision 1 specifies Tesseract should initialize at recording start (~2s during natural setup moment), not at extension startup or lazily."

---

### Test 4: Code Generation Test
Ask Claude:
```
Generate a smart prompt for implementing CDP-002 (CDPService Skeleton).
```

**Expected Answer:**
Smart prompt should include:
- Task description from BUILD_CARD_BACKLOG_PHASE2.md
- Context from ARCHITECTURE_DECISIONS.md
- Implementation code from BUILD_CARD_BACKLOG_PHASE2.md
- Type definitions from MASTER_ROLLUP_PHASE2.md
- Acceptance criteria from BUILD_CARD_BACKLOG_PHASE2.md
- Code example matching TypeScript patterns in rollup

---

## SYNC CONFIRMATION

After all tests pass:

- [ ] Claude can reference ARCHITECTURE_DECISIONS.md
- [ ] Claude can reference BUILD_CARD_BACKLOG_PHASE2.md
- [ ] Claude can reference MASTER_ROLLUP_PHASE2.md
- [ ] Claude can reference BIDIRECTIONAL_ANALYSIS.md
- [ ] Claude can cross-reference between files
- [ ] Claude can generate smart prompts for build cards
- [ ] Smart prompts match GitHub Copilot's workspace context

**If all checks pass:** ✅ SYNC COMPLETE

**If any checks fail:** ⚠️ Re-upload failed file(s) and retry tests

---

## TROUBLESHOOTING

### Issue: Claude can't find file
**Solution:** Verify file name exactly matches upload (case-sensitive)

### Issue: Claude gives outdated information
**Solution:** Delete old version from Knowledge, re-upload new version

### Issue: Smart prompt missing context
**Solution:** Verify MASTER_ROLLUP_PHASE2.md is uploaded (primary reference)

### Issue: Cross-references broken
**Solution:** Verify all 4 files uploaded (dependencies required)

---

## MAINTENANCE

### When to Re-Sync

Re-upload files when:
- Architecture decisions change
- Build cards are added/modified
- MASTER_ROLLUP_PHASE2.md is updated
- Gap analysis changes

### Version Control

Track uploads in git commit messages:
```bash
git commit -m "Knowledge base sync: Upload 4 files to Claude [YYYY-MM-DD]"
```

---

**END OF CHECKLIST**
