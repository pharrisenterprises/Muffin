/**
 * RECORDING ENGINE - PUBLIC EXPORTS
 */

// Types
export * from './types';

// Configuration
export * from './config';

// Pipeline Components
export { EventCapture } from './EventCapture';
export { EventFilter } from './EventFilter';
export { TargetResolver } from './TargetResolver';
export { LabelGenerator } from './LabelGenerator';
export { BundleBuilder } from './BundleBuilder';
export { StepBuilder } from './StepBuilder';
export { StepEmitter } from './StepEmitter';

// Main Engine
export { RecordingEngine, recordingEngine } from './RecordingEngine';
