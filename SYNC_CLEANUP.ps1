# KNOWLEDGE SYNC CLEANUP SCRIPT
# Purpose: Archive old Phase 3/4 manuals and install new Phase 3 manual
# Date: December 6, 2025

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  KNOWLEDGE SYNC CLEANUP" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create archive directory
Write-Host "[1/6] Creating archive directory..." -ForegroundColor Yellow
$archiveDir = "analysis-resources\implementation-guides\archive"
if (!(Test-Path $archiveDir)) {
    New-Item -ItemType Directory -Path $archiveDir -Force | Out-Null
    Write-Host "  ✓ Created: $archiveDir" -ForegroundColor Green
} else {
    Write-Host "  ✓ Archive directory already exists" -ForegroundColor Green
}
Write-Host ""

# Step 2: Archive old Phase 3 manual
Write-Host "[2/6] Archiving old Phase 3 manual..." -ForegroundColor Yellow
$oldPhase3 = "analysis-resources\implementation-guides\PHASE_3_MANUAL.md"
$archivedPhase3 = "$archiveDir\PHASE_3_MANUAL_OLD_Dec2.md"

if (Test-Path $oldPhase3) {
    # Check if it's the old one (should contain "December 2" in first 20 lines)
    $firstLines = Get-Content $oldPhase3 -TotalCount 20 | Out-String
    if ($firstLines -match "December 2") {
        Move-Item -Path $oldPhase3 -Destination $archivedPhase3 -Force
        Write-Host "  ✓ Archived: PHASE_3_MANUAL.md → PHASE_3_MANUAL_OLD_Dec2.md" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ Existing Phase 3 manual is not from Dec 2 - skipping archive" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ⚠ No Phase 3 manual found to archive" -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Archive old Phase 4 manual
Write-Host "[3/6] Archiving old Phase 4 manual..." -ForegroundColor Yellow
$oldPhase4 = "analysis-resources\implementation-guides\PHASE_4_MANUAL.md"
$archivedPhase4 = "$archiveDir\PHASE_4_MANUAL_OLD_Dec2.md"

if (Test-Path $oldPhase4) {
    Move-Item -Path $oldPhase4 -Destination $archivedPhase4 -Force
    Write-Host "  ✓ Archived: PHASE_4_MANUAL.md → PHASE_4_MANUAL_OLD_Dec2.md" -ForegroundColor Green
} else {
    Write-Host "  ⚠ No Phase 4 manual found to archive" -ForegroundColor Yellow
}
Write-Host ""

# Step 4: Install new Phase 3 manual
Write-Host "[4/6] Installing new Phase 3 manual..." -ForegroundColor Yellow
$newPhase3Source = "$env:USERPROFILE\Downloads\PHASE_3_MANUAL (1).md"
$newPhase3Dest = "analysis-resources\implementation-guides\PHASE_3_MANUAL.md"

if (Test-Path $newPhase3Source) {
    Copy-Item -Path $newPhase3Source -Destination $newPhase3Dest -Force
    Write-Host "  ✓ Installed: PHASE_3_MANUAL.md (December 6, 2025)" -ForegroundColor Green
    
    # Verify installation
    $verifyLines = Get-Content $newPhase3Dest -TotalCount 20 | Out-String
    if ($verifyLines -match "December 6") {
        Write-Host "  ✓ Verified: New manual is December 6, 2025 version" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ WARNING: Installed manual may not be correct version" -ForegroundColor Red
    }
} else {
    Write-Host "  ✗ ERROR: New Phase 3 manual not found in Downloads" -ForegroundColor Red
    Write-Host "    Expected: $newPhase3Source" -ForegroundColor Red
}
Write-Host ""

# Step 5: Create archive README
Write-Host "[5/6] Creating archive README..." -ForegroundColor Yellow
$archiveReadme = "$archiveDir\README.md"
$readmeContent = @"
# ARCHIVED PHASE MANUALS

**Archive Date:** December 6, 2025  
**Reason:** Project evolved beyond original scope

---

## Why These Are Archived

These manuals were created on **December 2, 2025** and covered only **Vision Enhancement** features:
- Phase 3: Vision Enhancement SPEC generation (67 smart prompts)
- Phase 4: Vision Enhancement CODE generation (74 build cards)

The project has since evolved to include:
- ✅ Phase 2 CDP Integration (Chrome DevTools Protocol)
- ✅ Multi-Strategy System (7-tier parallel evaluation)
- ✅ Decision Engine with fallback chains
- ✅ Puppeteer export functionality

## Current Manual

**Active Manual:** ``../PHASE_3_MANUAL.md`` (December 6, 2025)  
**Scope:** Phase 2 CDP + Multi-Strategy + Vision + Puppeteer

## When to Use Archived Manuals

- ❌ **NEVER** for current development
- ✅ Only if reverting to pre-CDP codebase (commit before Phase 2)
- ✅ Historical reference to understand feature evolution
- ✅ Comparison study (what changed between Dec 2 and Dec 6)

## Files in This Archive

| File | Date | Scope | Lines |
|------|------|-------|-------|
| PHASE_3_MANUAL_OLD_Dec2.md | Dec 2, 2025 | Vision Enhancement specs | ~800 |
| PHASE_4_MANUAL_OLD_Dec2.md | Dec 2, 2025 | Vision Enhancement code | ~1500 |

## Restoration Instructions

If you need to restore an archived manual (NOT RECOMMENDED):

``````powershell
# Restore Phase 3 manual (Dec 2)
Copy-Item archive\PHASE_3_MANUAL_OLD_Dec2.md ..\PHASE_3_MANUAL.md

# Restore Phase 4 manual (Dec 2)
Copy-Item archive\PHASE_4_MANUAL_OLD_Dec2.md ..\PHASE_4_MANUAL.md
``````

**WARNING:** This will overwrite current manuals. Make sure you know what you're doing!

---

**Last Updated:** December 6, 2025
"@

Set-Content -Path $archiveReadme -Value $readmeContent -Force
Write-Host "  ✓ Created: archive/README.md" -ForegroundColor Green
Write-Host ""

# Step 6: Display summary
Write-Host "[6/6] Summary" -ForegroundColor Yellow
Write-Host ""
Write-Host "  ARCHIVED FILES:" -ForegroundColor Cyan
if (Test-Path $archivedPhase3) {
    $phase3Size = (Get-Item $archivedPhase3).Length
    Write-Host "    • PHASE_3_MANUAL_OLD_Dec2.md ($([math]::Round($phase3Size/1KB, 1)) KB)" -ForegroundColor White
}
if (Test-Path $archivedPhase4) {
    $phase4Size = (Get-Item $archivedPhase4).Length
    Write-Host "    • PHASE_4_MANUAL_OLD_Dec2.md ($([math]::Round($phase4Size/1KB, 1)) KB)" -ForegroundColor White
}
Write-Host ""

Write-Host "  CURRENT FILES:" -ForegroundColor Cyan
if (Test-Path $newPhase3Dest) {
    $newSize = (Get-Item $newPhase3Dest).Length
    Write-Host "    • PHASE_3_MANUAL.md (Dec 6, 2025) ($([math]::Round($newSize/1KB, 1)) KB)" -ForegroundColor White
}
Write-Host ""

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  CLEANUP COMPLETE" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host "1. Review: analysis-resources\KNOWLEDGE_SYNC_STATUS.md" -ForegroundColor White
Write-Host "2. Git commit: git add . && git commit -m 'refactor: Archive old Phase 3/4 manuals, install new Phase 3 manual'" -ForegroundColor White
Write-Host "3. Verify Claude KB: Paste sync check prompt from KNOWLEDGE_SYNC_STATUS.md" -ForegroundColor White
Write-Host "4. Upload new manual to Claude Knowledge Base" -ForegroundColor White
Write-Host ""
