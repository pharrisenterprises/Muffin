// ═══════════════════════════════════════════════════════════════════════════
// SELF-HEALING PLAYBACK SYSTEM - PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

// Types
export * from './self-healing-types';

// Configuration
export * from './self-healing-config';

// Screenshot Comparison
export {
  ScreenshotComparator,
  createScreenshotComparator
} from './ScreenshotComparator';

// Drift Detection
export {
  ElementDriftDetector,
  createElementDriftDetector
} from './ElementDriftDetector';

// Element Graph
export {
  ElementGraphCapture,
  createElementGraphCapture
} from './ElementGraphCapture';

export {
  GraphBasedFinder,
  createGraphBasedFinder
} from './GraphBasedFinder';

// Troubleshooter
export {
  PlaybackTroubleshooter,
  createPlaybackTroubleshooter
} from './PlaybackTroubleshooter';

// Main Engine
export {
  SelfHealingPlaybackEngine,
  createSelfHealingPlaybackEngine
} from './SelfHealingPlaybackEngine';

// Evidence System (Batch 10)
export * from './evidence';
