# KNOWLEDGE SYNC STATUS

**Last Updated:** December 6, 2025  
**Purpose:** Track synchronization between GitHub Copilot and Claude Knowledge Base

---

## 📊 CURRENT STATUS

| Resource | GitHub Copilot | Claude KB | Status |
|----------|----------------|-----------|--------|
| Phase 3 Manual | ✅ Dec 6, 2025 (NEW) | ⚠️ VERIFY | Action Required |
| Phase 4 Manual | 🗄️ ARCHIVED (Dec 2) | ⚠️ CHECK | Should be removed |
| Component Rollups | ✅ rollup-export-clean/ | ⚠️ VERIFY | 6 files |
| Phase 2 Master Rollup | ✅ knowledge-base-export/ | ⚠️ VERIFY | 15 files |
| Architecture Decisions | ✅ ARCHITECTURE_DECISIONS.md | ⚠️ VERIFY | 8 decisions |
| Build Card Backlog | ✅ BUILD_CARD_BACKLOG_PHASE2.md | ⚠️ VERIFY | 87 cards |

### Legend
- ✅ = Current and synchronized
- ⚠️ = Needs verification or upload
- ❌ = Missing or outdated
- 🗄️ = Archived (safe keeping)

---

## 🎯 CURRENT BUILD SCOPE (December 6, 2025)

### Phase 1: Core Recording/Playback ✅ COMPLETE
- Basic DOM selector recording
- XPath-based playback
- IndexedDB storage
- Project CRUD operations

### Phase 2: CDP Integration + Multi-Strategy 🔄 IN PROGRESS
- Chrome DevTools Protocol (CDP) integration
- Accessibility tree access
- Playwright-style locators (getByRole, getByText, etc.)
- Decision Engine with parallel strategy evaluation
- 7-tier strategy system:
  1. DOM Selector
  2. CSS Selector
  3. CDP Semantic (getByRole)
  4. CDP Power (getByText/Label)
  5. Evidence Scoring
  6. Vision OCR
  7. Coordinates (last resort)

### Phase 3: Current Build Implementation 🎯 ACTIVE NOW
**Scope:** Content generation for 46 files across 8 sections
- Recording orchestration (multi-layer capture)
- Background CDP services
- Decision Engine (parallel strategy scoring)
- Strategy evaluators
- Vision Engine enhancements
- Puppeteer export functionality
- Puppeteer external runner CLI
- UI components and modifications

**Reference Manual:** `PHASE_3_MANUAL.md` (December 6, 2025)

---

## 🗄️ ARCHIVED MANUALS (Safe Keeping)

### Why Archived?
Old manuals covered only "Vision Enhancement" features from December 2, 2025. The project has since evolved to include Phase 2 CDP integration, making those manuals outdated and potentially confusing for AI builders.

### Archived Files
| File | Date | Scope | Archive Location |
|------|------|-------|------------------|
| PHASE_3_MANUAL_OLD_Dec2.md | Dec 2, 2025 | Vision Enhancement SPEC generation | implementation-guides/archive/ |
| PHASE_4_MANUAL_OLD_Dec2.md | Dec 2, 2025 | Vision Enhancement CODE generation | implementation-guides/archive/ |

### When to Use Archived Manuals
- ❌ Never for current development
- ✅ Only if reverting to pre-CDP codebase
- ✅ Historical reference for understanding evolution

---

## 🔍 CLAUDE KNOWLEDGE BASE VERIFICATION

### Sync Check Prompt for Claude

Paste this into Claude to verify alignment:

```
KNOWLEDGE SYNC CHECK

Please review your Knowledge Base and confirm:

1. What Phase 3 manual do you have? 
   - CORRECT: "PHASE 3 MANUAL: Muffin Lite V2 Vision Enhancement + Puppeteer" dated December 6, 2025
   - WRONG: Any manual dated December 2, 2025

2. What Phase 4 manual do you have?
   - CORRECT: NONE (Phase 4 not started yet)
   - WRONG: Any Phase 4 manual

3. Do you have these CURRENT files:
   - rollup-export-clean/COMPONENT_ROLLUP_A-D.md
   - rollup-export-clean/COMPONENT_ROLLUP_F-P.md
   - rollup-export-clean/COMPONENT_ROLLUP_R-T.md
   - rollup-export-clean/COMPONENT_ROLLUP_T-Z.md
   - rollup-export-clean/MASTER_ROLLUP.md
   - rollup-export-clean/TECHNICAL_REFERENCE.md
   - knowledge-base-export/MASTER_ROLLUP_PHASE2.md (and 14 other Phase 2 files)
   - ARCHITECTURE_DECISIONS.md
   - BUILD_CARD_BACKLOG_PHASE2.md

4. What is the current build scope according to your KB?
   - CORRECT: Phase 2 CDP Integration + Multi-Strategy System + Vision Enhancement + Puppeteer Export
   - WRONG: Vision Enhancement only

If any answers are wrong, respond with:
"KNOWLEDGE BASE OUT OF SYNC - Please upload [missing files]"
```

### Expected Claude Response

```
KNOWLEDGE SYNC VERIFIED ✅

1. Phase 3 Manual: December 6, 2025 ✅
2. Phase 4 Manual: None (not started) ✅
3. Current Files: All 6 component rollups + 15 Phase 2 files + Architecture Decisions + Build Card Backlog ✅
4. Build Scope: Phase 2 CDP + Multi-Strategy + Vision + Puppeteer ✅

Knowledge Base is synchronized. Ready for code generation.
```

---

## 📤 CLAUDE UPLOAD CHECKLIST

### Priority Files (Upload First)

| Order | File | Purpose | Verification Test |
|-------|------|---------|-------------------|
| 1 | `PHASE_3_MANUAL.md` (Dec 6) | Primary build reference | Ask Claude: "How many files need content generation?" Expected: "46 files" |
| 2 | `ARCHITECTURE_DECISIONS.md` | 8 finalized decisions | Ask: "What is Decision #5?" Expected: "Strategy Degradation: NONE - Full 7-tier always" |
| 3 | `BUILD_CARD_BACKLOG_PHASE2.md` | 87 build cards | Ask: "How many CDP build cards?" Expected: "17 cards (CDP-001 to CDP-017)" |
| 4 | `knowledge-base-export/MASTER_ROLLUP_PHASE2.md` | Phase 2 reference | Ask: "What are the 5 recipes?" Expected: List 5 recipes |
| 5 | `rollup-export-clean/*.md` (6 files) | Component breakdowns | Ask: "What components are in Section A?" Expected: List RecordingOrchestrator, EvidenceBuffer, etc. |
| 6 | `BIDIRECTIONAL_ANALYSIS.md` | Gap analysis | Ask: "How many gaps identified?" Expected: Specific number |

### Secondary Files (Upload After Priority)

- All 15 Phase 2 knowledge-base-export files
- All 32 component breakdown files (if needed for deep dives)
- TECHNICAL_REFERENCE.md (TypeScript conventions)

---

## 🔄 SYNC MAINTENANCE

### After Uploading to Claude

1. **Run Sync Check Prompt** (see above)
2. **Update this file** with verification results
3. **Update AI_COLLABORATION_PROTOCOL.md** if needed
4. **Commit changes** to git

### Before Starting New Build Phase

1. **Check this file** for current status
2. **Verify Claude KB** with sync check prompt
3. **Archive old manuals** if creating new phase
4. **Update phase scope** in this file

### When AI Generates Wrong Code

**Possible Causes:**
- ❌ Claude has old manual (Dec 2) instead of new (Dec 6)
- ❌ Claude missing current component rollups
- ❌ Copilot referencing archived manuals
- ❌ File path references out of date

**Solution:**
1. Run sync check prompt with Claude
2. Check Copilot workspace for archived files
3. Re-upload missing files to Claude
4. Update this status file

---

## 📋 GITHUB COPILOT REFERENCE GUARD

### What Copilot Should Reference

✅ **USE THESE:**
- `analysis-resources/implementation-guides/PHASE_3_MANUAL.md` (Dec 6, 2025)
- `analysis-resources/ARCHITECTURE_DECISIONS.md`
- `analysis-resources/BUILD_CARD_BACKLOG_PHASE2.md`
- `rollup-export-clean/COMPONENT_ROLLUP_*.md` (6 files)
- `knowledge-base-export/MASTER_ROLLUP_PHASE2.md` (15 files)

❌ **DO NOT USE:**
- `analysis-resources/implementation-guides/archive/PHASE_3_MANUAL_OLD_Dec2.md`
- `analysis-resources/implementation-guides/archive/PHASE_4_MANUAL_OLD_Dec2.md`
- Any file in `archive/` folder
- Any reference to "Vision Enhancement only" scope

### How to Verify Copilot References

Ask Copilot:
```
What Phase 3 manual are you using? Please show me the date and first 5 lines.
```

Expected response should show December 6, 2025 manual.

---

## 🛡️ SAFETY MEASURES

### Archive Strategy
- ✅ Old manuals MOVED to archive/ (not deleted)
- ✅ Can revert if needed: `git checkout <commit> -- <file>`
- ✅ Git history preserved
- ✅ Archive folder in .gitignore? NO - keep in git for team

### Sync Recovery Plan

**If Claude and Copilot Get Out of Sync:**

1. **Stop all code generation**
2. **Run sync check prompt** with Claude
3. **Identify missing/outdated files** in Claude KB
4. **Re-upload priority files** (see checklist above)
5. **Verify with test questions**
6. **Resume code generation**

---

## 📝 NOTES

### Why This System Exists
AI collaboration requires both agents (Claude and Copilot) to reference the **same source of truth**. When manuals get outdated or phases change, misalignment causes:
- Wrong code generation (using old specs)
- Missing features (old manual doesn't include them)
- Conflicting implementations (one AI uses new spec, other uses old)

### Best Practices
1. **Always update this file** when changing phase structure
2. **Always run sync check** before major code generation
3. **Always archive old manuals** (don't delete)
4. **Always verify with test questions** after uploading to Claude
5. **Keep git history clean** with descriptive commit messages

---

**Last Sync Verification:** PENDING - Run Claude sync check prompt
**Next Review Date:** After Phase 3 content generation complete
