# Changelog

All notable changes to the Muffin Chrome Extension project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - Vision Enhancement Release - 2024

### Added

#### Vision Engine (Core OCR System)
- **VisionEngine**: Full Tesseract.js OCR integration for text detection and coordinate-based clicking
  - Text search with position-based disambiguation (first, last, nth occurrence)
  - Coordinate-based clicking using OCR-detected text boundaries
  - Iframe-aware coordinate transformation and clicking
  - Shadow DOM penetration for visibility checks
  - Configurable OCR parameters (PSM modes, confidence thresholds)
  - Event system for initialization, search, and click events
  - Performance optimization with worker pooling

#### Conditional Click Automation
- **Conditional Click Steps**: Automated polling for dynamic approval buttons
  - Multi-term search with "approve", "confirm", "accept", "yes", "ok"
  - Configurable max wait time (10-300 seconds, default 60s)
  - Configurable polling interval (100-5000ms, default 500ms)
  - Automatic step skipping when button not found within timeout
  - Step badge rendering: green checkmark (clicked) or gray dash (skipped)
  - Recording UI: Toggle and configure conditional steps via toolbar
  - CSV integration: Per-row search term substitution via `{{buttonText1}}` variables

#### Time Delays
- **Global Recording Delay**: Set default delay (0-10 seconds) applied to all steps
- **Per-Step Delay Override**: Configure individual step delays (0-10 seconds)
- **Execution**: Delays execute before step action, visible in UI with countdown

#### CSV Loop Control
- **Loop Start Index**: Define which step begins CSV iteration (step 0 to step count)
- **Position-Based Column Mapping**: Automatic field assignment by step order (no headers required)
- **Variable Substitution**: `{{variableName}}` replacement in input values and conditional search terms
- **Duplicate Column Handling**: Automatic grouping for repeated field names

#### Recording Enhancements
- **Vision Fallback Mode**: Automatic fallback to Vision when DOM selector fails
- **Enhanced Step Interface**: Added `visionFallback`, `visionSearchPosition`, `delaySeconds`, `conditionalConfig` fields
- **Enhanced Recording Interface**: Added `globalDelaySeconds`, `loopStartIndex`, `conditionalDefaults` fields
- **Badge System**: Visual indicators for Vision fallback, delays, loop start, conditional clicks

#### Data Layer
- **Schema v3**: Vision-compatible schema with automatic migration
- **Migration System**: Backward-compatible migration from v1/v2 to v3
  - Adds new Vision/delay/loop fields with safe defaults
  - Preserves all existing step data and metadata
  - Idempotent (safe to run multiple times)
  - Validation system for data integrity

#### State Management
- **React Hooks**: Custom hooks for Recorder state management
  - `useRecordingConfig`: Manage recording-level config (global delay, loop start, conditional defaults)
  - `useStepConfig`: Manage step-level config (per-step delays, conditional configs)
  - `useRecorderToolbar`: Unified API combining both config hooks

#### Documentation
- **README.md**: 265-line comprehensive user guide with Vision features, installation, usage, and configuration
- **API.md**: 545-line VisionEngine API reference for developers
- **TROUBLESHOOTING.md**: 542-line guide covering common issues, diagnostics, and solutions
- **E2E_TEST_PLAN.md**: Manual testing procedures with 8 scenarios for Vision features
- **E2E_TEST_PROCEDURE.md**: Step-by-step execution guide for manual E2E testing

#### Testing
- **VisionEngine Test Suite**: 38 comprehensive tests covering OCR, search, clicks, iframes, shadow DOM
- **Vision Recording Tests**: 13 tests for Vision fallback mode and recording persistence
- **Schema Migration Tests**: 62 tests for v1/v2→v3 migration, idempotency, validation
- **CSV Mapping Tests**: 49 tests for position-based column mapping, substitution, loop control
- **E2E Workflow Tests**: 23 tests for Copilot automation workflows (9 passing, 14 with timeout)
- **Total Test Coverage**: 162+ automated tests

### Changed

#### Interfaces
- **Step Interface**: Extended with `visionFallback`, `visionSearchPosition`, `delaySeconds`, `conditionalConfig`
- **Recording Interface**: Extended with `globalDelaySeconds`, `loopStartIndex`, `conditionalDefaults`, `schemaVersion`
- **ConditionalConfig Interface**: Defines `maxWaitSeconds`, `pollingIntervalMs`, `searchTerms`

#### Manifest
- **Permissions**: Added `storage` permission for Vision Engine settings
- **Content Scripts**: Added `all_frames: true` for iframe support

#### Content Script
- **VisionEngine Integration**: Injected VisionEngine into content script context
- **Message Handlers**: Added handlers for Vision search, click, and conditional click
- **Iframe Support**: Enhanced iframe detection and coordinate transformation

### Technical Details

#### Dependencies
- **Tesseract.js**: ^5.0.0 (OCR engine)
- **Vite**: 6.4.1 (build system)
- **TypeScript**: 5.0.2 (type safety)
- **Vitest**: Latest (testing framework)

#### File Changes
- **14 New Files**: VisionEngine core, hooks, tests, documentation
- **10 Modified Files**: Step/Recording interfaces, content script, Recorder UI, message handlers
- **Schema**: v3 (Vision-compatible) with migration from v1/v2

#### Build
- Background bundle: ~160KB (includes Tesseract.js worker)
- Content script: Enhanced with Vision capabilities
- Dual Vite config: Standard and background builds

### Migration Notes

#### Automatic Migration
- Existing recordings automatically migrate to schema v3 on load
- Migration adds Vision/delay/loop fields with safe defaults:
  - `visionFallback: false`
  - `visionSearchPosition: "first"`
  - `delaySeconds: undefined`
  - `conditionalConfig: undefined`
  - `globalDelaySeconds: 0`
  - `loopStartIndex: 0`
  - `conditionalDefaults: { maxWaitSeconds: 60, pollingIntervalMs: 500, searchTerms: [...] }`
  - `schemaVersion: 3`
- No manual intervention required
- Migration is idempotent (safe to run multiple times)
- Backward compatibility: v3 recordings can play back v1/v2 steps

#### Breaking Changes
- None. All changes are backward-compatible additions.

---

## [2.0.0] - 2024

### Added
- Core recording and playback functionality
- CSV import and field mapping
- DOM element detection and interaction
- Chrome extension Manifest V3 support
- IndexedDB storage for projects and recordings
- React-based dashboard and recorder UI
- Redux state management
- Background service worker
- Content script injection

### Initial Features
- Click, input, and navigation step recording
- CSS selector-based element targeting
- Variable substitution from CSV data
- Project management (CRUD operations)
- Recording management within projects
- Step editing and reordering
- Playback with step-by-step execution
- Error handling and notifications

---

[2.1.0]: https://github.com/yourusername/muffin/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/yourusername/muffin/releases/tag/v2.0.0
