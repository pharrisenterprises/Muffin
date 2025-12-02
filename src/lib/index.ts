/**
 * Library Exports
 * 
 * Central export point for all library modules.
 */

// Vision Engine
export * from './visionEngine';

// Step Executor (ENG-017, ENG-018)
export * from './stepExecutor';

// CSV Position Mapping (ENG-016)
export * from './csvPositionMapping';

// Playback Engine
export * from './playbackEngine';

// Schema Migration (MIG-001 to MIG-005)
export {
  MIGRATION_DEFAULTS,
  migrateStep,
  migrateRecording,
  stepNeedsMigration,
  recordingNeedsMigration,
  verifyRecordingMigration
} from './schemaMigration';

// Defaults
export * from './defaults';
