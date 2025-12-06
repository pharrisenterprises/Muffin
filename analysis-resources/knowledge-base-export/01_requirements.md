# REQUIREMENTS SPECIFICATION

## Functional Requirements

### FR-100 Series: Vision Engine

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-101 | System shall use Tesseract.js 4.0+ for OCR text extraction | P0 | ✅ Complete |
| FR-102 | System shall capture screenshots at 2x device pixel ratio for clarity | P0 | ✅ Complete |
| FR-103 | System shall support vision-based click with fuzzy text matching | P0 | ✅ Complete |
| FR-104 | System shall support vision-based type with element lookup | P0 | ✅ Complete |
| FR-105 | System shall support vision-based dropdown selection | P1 | ✅ Complete |
| FR-106 | System shall implement conditional click with polling (max 30s) | P1 | ✅ Complete |
| FR-107 | System shall provide UI badges to indicate vision-recorded steps | P2 | ✅ Complete |

### FR-200 Series: Core Features

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-201 | System shall support global time delay (0-10000ms) applied to all steps | P0 | ✅ Complete |
| FR-202 | System shall support per-step time delay override | P0 | ✅ Complete |
| FR-203 | System shall support CSV loop with column-to-variable mapping | P1 | ✅ Complete |
| FR-204 | System shall support loop start markers at any step in recording | P1 | ✅ Complete |
| FR-205 | System shall preserve recording integrity when editing steps | P0 | ✅ Complete |
| FR-206 | System shall support manual variable injection via "Add Variable" | P2 | ✅ Complete |
| FR-207 | System shall export recordings as JSON with schema version | P2 | ✅ Complete |

### FR-300 Series: CDP Integration (Phase 2)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-301 | System shall attach chrome.debugger to target tab for CDP access | P0 | 🚧 Phase 2 |
| FR-302 | System shall implement CDPService for DOM/Accessibility tree access | P0 | 🚧 Phase 2 |
| FR-303 | System shall implement Playwright-style locators (role, text, label, placeholder) | P0 | 🚧 Phase 2 |
| FR-304 | System shall support locator chaining (e.g., `getByRole('button').getByText('Submit')`) | P1 | 🚧 Phase 2 |
| FR-305 | System shall implement auto-waiting (visible, enabled, stable) before actions | P0 | 🚧 Phase 2 |
| FR-306 | System shall detach debugger gracefully on recording stop/tab close | P0 | 🚧 Phase 2 |

### FR-400 Series: Decision Engine (Phase 2)

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-401 | Decision Engine shall evaluate all strategies simultaneously (not hierarchical) | P0 | 🚧 Phase 2 |
| FR-402 | Decision Engine shall score strategies based on confidence (0-1 scale) | P0 | 🚧 Phase 2 |
| FR-403 | Decision Engine shall select highest-confidence strategy regardless of speed | P0 | 🚧 Phase 2 |
| FR-404 | Decision Engine shall log telemetry (strategy used, confidence, duration) | P1 | 🚧 Phase 2 |
| FR-405 | Decision Engine shall support strategy exclusion (user-disabled strategies) | P2 | 🚧 Phase 2 |

## Non-Functional Requirements

### NFR-100 Series: Performance

| ID | Requirement | Target | Measurement |
|----|-------------|--------|-------------|
| NFR-101 | DOM Selector strategy execution | <10ms | 95th percentile |
| NFR-102 | CSS Selector strategy execution | <15ms | 95th percentile |
| NFR-103 | CDP Semantic locator execution | <50ms | 95th percentile |
| NFR-104 | CDP Power locator execution | <100ms | 95th percentile |
| NFR-105 | Evidence Scoring execution | <500ms | 95th percentile |
| NFR-106 | Vision OCR execution | <2000ms | 95th percentile |
| NFR-107 | Coordinate fallback execution | <5ms | 95th percentile |
| NFR-108 | Recording lag (user click to UI feedback) | <50ms | 99th percentile |

### NFR-200 Series: Reliability

| ID | Requirement | Target | Measurement |
|----|-------------|--------|-------------|
| NFR-201 | Playback success rate on unchanged pages | >98% | Per 100 steps |
| NFR-202 | Playback success rate on changed pages | >90% | Per 100 steps |
| NFR-203 | Evidence buffer pruning success | 100% | Data integrity check |
| NFR-204 | Vision OCR accuracy for Latin characters | >95% | Character-level accuracy |

### NFR-300 Series: Compatibility

| ID | Requirement | Target | Status |
|----|-------------|--------|--------|
| NFR-301 | Chrome browser support | v120+ | ✅ |
| NFR-302 | Manifest V3 compliance | 100% | ✅ |
| NFR-303 | IndexedDB quota management | <100MB per origin | ✅ |
| NFR-304 | Shadow DOM traversal support | Open + intercepted closed | ✅ |

## Constraints

1. **Chrome-only**: No Firefox/Safari support in Phase 2 (CDP is Chrome-specific)
2. **Single-tab**: One active recording per browser session (debugger limitation)
3. **IndexedDB**: 50-100MB storage limit (browser-dependent, must prune evidence)
4. **OCR Language**: English/Latin alphabet only (Tesseract.js limitation)
5. **Network CORS**: Cannot capture cross-origin network requests

## Acceptance Criteria

### Recording Phase
- [ ] User clicks "Start Recording"
- [ ] All 4 evidence layers activate (DOM, Vision, Mouse, Network)
- [ ] User performs workflow (clicks, types, selects)
- [ ] Evidence Buffer stores ~70MB of data temporarily
- [ ] User clicks "Stop Recording"
- [ ] Recording Orchestrator stops all layers gracefully
- [ ] UI displays "Save as Approved" button

### Playback Phase
- [ ] User clicks "Play" on a recording
- [ ] Decision Engine evaluates all strategies for first step
- [ ] Highest-confidence strategy executes
- [ ] If strategy fails, next-highest executes (fallback)
- [ ] Vision verification validates execution (optional)
- [ ] Telemetry logs strategy success/failure
- [ ] Test completes with summary report

### Save as Approved
- [ ] User clicks "Save as Approved"
- [ ] Evidence Buffer prunes unused data
- [ ] Project size reduces from ~70MB to ~250KB
- [ ] Fallback chains preserved in RecordedStep
- [ ] IndexedDB evidence deleted

## Priority Legend

- **P0**: Must-have for Phase 2 MVP
- **P1**: Should-have for Phase 2 release
- **P2**: Nice-to-have, can defer to Phase 3
