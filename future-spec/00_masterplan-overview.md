# MUFFIN LITE V2: MULTI-LAYER INTELLIGENT RECORDING SYSTEM

## Executive Summary

Muffin Lite V2 transforms the existing DOM-based recording extension into a multi-layer intelligent automation system. The core innovation is **simultaneous evidence capture** across four parallel layers (DOM, Vision, Mouse, Network), processed by a **Decision Engine** that automatically selects the optimal recording/playback strategy for each step.

### The Promise
Users click "Record," perform their workflow, and the system *just works* - regardless of whether they're interacting with:
- Standard web elements (DOM)
- Canvas-based applications (Codespaces terminals)
- Shadow DOM components (Monaco editor)
- Cross-origin iframes (embedded tools)
- Dynamic SPAs (React/Vue apps)

### The Magic (Behind the Scenes)
While users see simple "Recording..." status, four systems work in parallel:
1. **Layer A (DOM)**: Captures selectors, XPaths, element bundles
2. **Layer B (Vision)**: Continuous screenshots + OCR for text-based targeting
3. **Layer C (Mouse)**: Movement patterns, hover dwell, click coordinates
4. **Layer D (Network)**: GraphQL/API correlation for state tracking

A **Recording Orchestrator** manages all layers. A **Decision Engine** evaluates evidence and selects the best strategy. Users never configure anything - the system self-heals.

## Project Objectives

1. **Fix Broken Recording**: Resolve START_RECORDING message flow failure
2. **Build Multi-Layer Capture**: Four parallel evidence streams
3. **Build Decision Engine**: Intelligent strategy selection
4. **Build Recording Orchestrator**: Layer coordination and lifecycle
5. **Implement Evidence Buffer**: Temporary storage with pruning
6. **Add "Save as Approved"**: Data management on recording completion
7. **Enhance Add Variable**: Visual element picker for manual steps
8. **Enable Vision Verification**: Real-time playback validation

## Scope Boundaries

### IN SCOPE
- All four evidence layers (DOM, Vision, Mouse, Network)
- Decision Engine with confidence scoring
- Recording Orchestrator
- Evidence Buffer with IndexedDB
- Save/Approve workflow with data pruning
- Enhanced Add Variable with region picker
- Multi-strategy playback executor
- Vision verification during playback

### OUT OF SCOPE (Future Phases)
- Cloud sync of recordings
- Team collaboration features
- Recording versioning/branching
- AI-powered step suggestions
- Cross-browser support (Chrome only)

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Recording success rate | ~60% | 95%+ |
| Playback success rate | ~50% | 90%+ |
| Canvas/Shadow DOM support | 0% | 80%+ |
| User configuration required | Many clicks | Zero |
| Evidence capture coverage | DOM only | 4 layers |
