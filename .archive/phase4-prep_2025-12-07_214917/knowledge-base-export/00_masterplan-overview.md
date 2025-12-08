# MUFFIN LITE V2: PHASE 2 MASTERPLAN

## Executive Summary

Muffin Lite V2 is a Chrome extension for browser automation that combines multi-layer intelligent recording with a 7-tier decision engine. It enables users to record workflows once and play them back reliably, even when pages change, by capturing evidence across DOM, Vision (OCR), Mouse trajectory, and Network layers.

### What Muffin Lite Does
- **Records** user interactions with multi-strategy capture
- **Stores** evidence from 4 parallel layers (DOM, Vision, Mouse, Network)
- **Decides** optimal playback strategy using 7-tier decision engine
- **Plays back** tests with automatic fallback when elements break
- **Heals** broken tests using evidence-based element resolution

### Core Innovation
**Simultaneous evidence capture** across four layers, processed by a Decision Engine that scores and selects strategies based on confidence, not rigid hierarchies.

## Core Capabilities

| Capability | Description | Status |
|------------|-------------|--------|
| **Vision Engine** | Tesseract.js OCR for canvas/shadow DOM | ✅ Implemented |
| **Time Delay** | Global and per-step delays for stability | ✅ Implemented |
| **CSV Loop** | Iterate tests with external data | ✅ Implemented |
| **Conditional Click** | Wait-for-element with polling | ✅ Implemented |
| **CDP Integration** | Chrome DevTools Protocol for Playwright-style locators | 🚧 Phase 2 |
| **7-Tier Locators** | Role, Text, Label, Placeholder, Test ID, Selector, Coordinates | 🚧 Phase 2 |
| **Decision Engine** | Multi-evidence scoring for strategy selection | 🚧 Phase 2 |

## 7-Tier Tool Arsenal

The Decision Engine does NOT follow a strict hierarchy. Instead, it scores all available strategies and selects the highest-confidence option.

| Tier | Strategy | Speed Target | Best For |
|------|----------|--------------|----------|
| **1** | DOM Selector | <10ms | Standard web elements with stable IDs/classes |
| **2** | CSS Selector | <15ms | Elements with reliable CSS paths |
| **3** | CDP Semantic (getByRole) | <50ms | Accessible elements (buttons, links, inputs) |
| **4** | CDP Power (getByText/Label/Placeholder) | <100ms | Elements identifiable by visible text |
| **5** | Evidence Scoring | <500ms | Changed DOM, uses mouse trail + visual context |
| **6** | Vision (OCR) | <2000ms | Canvas/shadow DOM, inaccessible elements |
| **7** | Coordinates | <5ms | Last resort, brittle but guaranteed |

**Key Principle:** Fast strategies (1-2) are *preferred* but not *required*. If a slow strategy (6) has 95% confidence and fast strategy (1) has 40% confidence, Vision wins.

## Project Objectives

1. **Fix Critical Bugs**: Resolve START_RECORDING message flow failure
2. **Build Multi-Layer Capture**: Implement 4 parallel evidence streams (DOM, Vision, Mouse, Network)
3. **Build Decision Engine**: Intelligent strategy selection with confidence scoring (not hierarchy)
4. **Build Recording Orchestrator**: Coordinate layer lifecycles and async capture
5. **Implement Evidence Buffer**: Temporary IndexedDB storage (~70MB during recording → 250KB after pruning)
6. **Add "Save as Approved"**: User-triggered data management workflow
7. **Enhance Add Variable**: Visual element picker for manual step insertion
8. **Enable Vision Verification**: Real-time playback validation using screenshots

## Scope

### ✅ IN SCOPE
- All four evidence layers (DOM, Vision, Mouse, Network)
- Decision Engine with multi-evidence scoring
- Recording Orchestrator for layer coordination
- Evidence Buffer with IndexedDB (temporary storage)
- Save/Approve workflow with aggressive pruning
- Enhanced Add Variable with visual region picker
- Multi-strategy playback executor with fallback
- Vision verification during playback
- CDP integration (Playwright-style locators)
- 7-tier tool arsenal (not a hierarchy!)

### ❌ OUT OF SCOPE (Future Phases)
- Cloud sync of recordings
- Team collaboration features
- Recording versioning/branching
- AI-powered step suggestions
- Cross-browser support (Chrome only for Phase 2)
- Auto-generate test assertions
- Performance profiling/analytics

## Architecture Philosophy

### Decision Engine: NOT A Hierarchy

**Common Misconception:**
"The Decision Engine tries DOM first, then CSS, then CDP, then Vision, etc."

**Reality:**
The Decision Engine evaluates ALL available strategies simultaneously and selects the one with the highest confidence score.

**Example Scenario:**
```
Button changed from <button id="submit"> to <button>Submit</button>

Strategy Evaluation:
├─ DOM Selector (#submit): ❌ 0% confidence (ID removed)
├─ CSS Selector (.submit-btn): ❌ 0% confidence (class removed)
├─ CDP getByRole('button', {name: 'Submit'}): ✅ 95% confidence
├─ Evidence Scoring: ✅ 88% confidence (mouse trail + previous steps)
├─ Vision OCR: ✅ 92% confidence (finds "Submit" text)
└─ Coordinates: ✅ 60% confidence (same position)

Decision: Use CDP getByRole (95% > 92% > 88% > 60%)
Speed: 50ms (acceptable for 95% confidence)
```

**Why This Matters for UX:**
- Users never see "try DOM, fail, try CSS, fail..." delays
- System picks the *best* strategy immediately
- Fast strategies win when confident, slow strategies win when necessary
- No rigid fallback chains that waste time

## Key Technologies

| Technology | Purpose | Version |
|------------|---------|---------|
| **TypeScript** | Type safety, interfaces | 5.0+ |
| **React** | UI components (popup, dashboard) | 18.2+ |
| **Vite** | Build system | 4.0+ |
| **Dexie.js** | IndexedDB wrapper | 3.2+ |
| **Tesseract.js** | OCR engine for Vision layer | 4.0+ |
| **Chrome DevTools Protocol** | Playwright-style locators | Native |
| **Chrome Extension APIs** | Core functionality | Manifest V3 |

## Success Metrics

| Metric | Current (Phase 1) | Target (Phase 2) | Measurement |
|--------|-------------------|------------------|-------------|
| **Recording success rate** | ~60% | 95%+ | % recordings that complete without errors |
| **Playback success rate** | ~50% | 90%+ | % tests that run successfully on first try |
| **Canvas/Shadow DOM support** | 0% | 80%+ | % interactions with inaccessible elements |
| **User configuration required** | High (many clicks) | Zero | Steps to configure fallback strategies |
| **Evidence capture coverage** | DOM only (1 layer) | 4 layers | Number of evidence sources captured |
| **Auto-healing rate** | ~40% | 85%+ | % broken steps that self-heal |
| **Average playback speed** | ~200ms/step | <150ms/step | Time per step execution |
| **False positive rate** | ~5% | <2% | % incorrect elements selected |
| **Evidence storage (post-prune)** | N/A | <300KB per project | Storage after "Save as Approved" |

## Document Purpose

This masterplan serves as:
1. **Executive overview** for stakeholders
2. **Scope definition** for development team
3. **Philosophy guide** for architectural decisions
4. **Success criteria** for QA validation
5. **Upload artifact** for Claude Knowledge Base

**Next Steps:** Review requirements (01_requirements.md) and architecture (04_architecture.md)
