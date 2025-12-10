/**
 * @fileoverview Types Index - Central export for all TypeScript types
 * @description Provides a single import point for all type definitions.
 * Simplifies imports throughout the codebase.
 * 
 * @module types/index
 * @version 1.0.0
 * @since Phase 4
 * 
 * @example
 * // Import specific types
 * import { StrategyType, CDPNode, RecordingState } from '../types';
 * 
 * // Import everything
 * import * as Types from '../types';
 */

// ============================================================================
// STRATEGY TYPES
// Re-export everything from strategy.ts
// ============================================================================

export {
  // Core types
  type StrategyType,
  type StrategyCategory,
  type LocatorStrategy,
  type StrategyMetadata,
  type ActionEventType,
  
  // Metadata types
  type CDPSemanticMetadata,
  type CDPPowerMetadata,
  type DOMSelectorMetadata,
  type CSSSelectorMetadata,
  type EvidenceScoringMetadata,
  type VisionOCRMetadata,
  type CoordinatesMetadata,
  
  // Chain types
  type FallbackChain,
  
  // Capture data types
  type CapturedAction,
  type DOMCaptureData,
  type VisionCaptureData,
  type MouseCaptureData,
  type NetworkCaptureData,
  
  // Evaluation types
  type StrategyEvaluationResult,
  type EvaluationResults,
  
  // Constants
  STRATEGY_WEIGHTS,
  STRATEGY_CATEGORIES,
  
  // Type guards
  isCDPSemanticMetadata,
  isCDPPowerMetadata,
  isDOMSelectorMetadata,
  isCSSSelectorMetadata,
  isEvidenceScoringMetadata,
  isVisionOCRMetadata,
  isCoordinatesMetadata,
  
  // Utility functions
  getStrategyCategory,
  getStrategyWeight,
  createEmptyFallbackChain,
  sortStrategiesByConfidence,
  sortStrategiesByWeight,
  calculateCombinedScore,
  sortStrategiesByCombinedScore,
  isValidStrategyType,
  getAllStrategyTypes
} from './strategy';

// ============================================================================
// CDP TYPES
// Re-export everything from cdp.ts
// ============================================================================

export {
  // Connection types
  type CDPConnection,
  type PendingCommand,
  type CDPEventListener,
  type CDPConnectionState,
  type CDPCommandResult,
  
  // DOM types
  type CDPNode,
  type BackendNode,
  type NodeId,
  type BackendNodeId,
  type RemoteObjectId,
  
  // Box model types
  type BoxModel,
  type ShapeOutsideInfo,
  type BoundingRect,
  type Quad,
  
  // Accessibility types
  type AXNode,
  type AXProperty,
  type AXPropertyName,
  type AXValue,
  type AXValueType,
  type AXRelatedNode,
  type AXValueSource,
  
  // Input types
  type MouseEventType,
  type MouseButton,
  type KeyEventType,
  type InputModifiers,
  type MouseEventParams,
  type KeyEventParams,
  
  // Page types
  type LayoutViewport,
  type VisualViewport,
  type LayoutMetrics,
  type ScreenshotParams,
  
  // Runtime types
  type RemoteObject,
  type RemoteObjectType,
  type RemoteObjectSubtype,
  type ObjectPreview,
  type PropertyPreview,
  type EntryPreview,
  
  // Locator types
  type LocatorResult,
  type WaitOptions,
  DEFAULT_WAIT_OPTIONS,
  
  // Utility functions
  parseAttributes,
  getAccessibleName,
  getAccessibleRole,
  getAXProperty,
  quadToBoundingRect,
  getCenterPoint,
  modifiersToBitmask
} from './cdp';

// ============================================================================
// RECORDING TYPES
// Re-export everything from recording.ts
// ============================================================================

export {
  // State types
  type RecordingSessionState,
  type RecordingState,
  type RecordingStatus,
  type RecordingSession,
  type RecordingError,
  type RecordingOrchestratorConfig,
  
  // Layer types
  type CaptureLayer,
  type DOMCaptureConfig,
  type VisionCaptureConfig,
  type MouseCaptureConfig,
  type NetworkCaptureConfig,
  
  // Capture result types
  type BaseCaptureResult,
  type DOMCaptureResult,
  type VisionCaptureResult,
  type OCRResult,
  type MouseCaptureResult,
  type MouseTrailPoint,
  type NetworkCaptureResult,
  
  // Buffer types
  type BufferConfig,
  type BufferMetadata,
  
  // Action types
  type CapturedAction as RecordingCapturedAction,
  type ActionType,
  type RecordingEventType,
  type RecordingEvent,
  
  // Default configs
  DEFAULT_RECORDING_CONFIG,
  DEFAULT_BUFFER_CONFIG
} from './recording';

// ============================================================================
// VISION TYPES
// Re-export everything from vision.ts
// ============================================================================

export * from './vision';

// ============================================================================
// TELEMETRY TYPES
// Re-export everything from telemetry.ts
// ============================================================================

export {
  // Event types
  type TelemetryEvent,
  type StrategyEvaluation,
  type TelemetryContext,
  type TelemetryEventType,
  
  // Metrics types
  type StrategyMetrics,
  type StrategyMetricsTimeSeries,
  type MetricsBucket,
  type StrategyHealth,
  type HealthStatus,
  type HealthFactor,
  
  // Run types
  type RunSummary,
  type RunStatus,
  type FailureReason,
  type FailureCategory,
  type ActiveRun,
  
  // Query types
  type TimeRange,
  type PredefinedTimeRange,
  type TelemetryQueryOptions,
  type TelemetrySortField,
  type TelemetryQueryResult,
  
  // Analytics types
  type DashboardSummary,
  type DomainStats,
  type PerformanceTrend,
  type StrategyComparison,
  
  // Export types
  type ExportFormat,
  type ExportOptions,
  type ExportResult,
  
  // Config types
  type TelemetryLoggerConfig,
  DEFAULT_TELEMETRY_CONFIG,
  
  // Utility functions
  generateTelemetryId,
  generateRunId,
  predefinedToTimeRange,
  calculateSuccessRate,
  getHealthStatus,
  calculateHealthScore,
  groupEventsByRun,
  calculateMetricsFromEvents,
  createEmptyMetrics
} from './telemetry';

// ============================================================================
// CONVENIENCE TYPE ALIASES
// ============================================================================

import type { StrategyType } from './strategy';
import type { BoundingRect } from './cdp';

/**
 * Strategy type with its weight.
 */
export interface WeightedStrategy {
  type: StrategyType;
  weight: number;
}

/**
 * Element location result (common across strategies).
 */
export interface ElementLocation {
  found: boolean;
  backendNodeId?: number;
  nodeId?: number;
  clickPoint?: { x: number; y: number };
  boundingRect?: BoundingRect;
  confidence: number;
}

/**
 * Action execution context.
 */
export interface ActionContext {
  tabId: number;
  stepIndex: number;
  runId: string;
  timeout: number;
}

/**
 * Service health check result.
 */
export interface ServiceHealthCheck {
  service: string;
  healthy: boolean;
  latency?: number;
  error?: string;
  lastCheck: number;
}

// ============================================================================
// TYPE UTILITIES
// ============================================================================

/**
 * Make all properties of T optional recursively.
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Make specific properties required.
 */
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Omit properties from T that are in K (stricter than Omit).
 */
export type StrictOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

/**
 * Create a type with only properties of a specific type.
 */
export type PickByType<T, Value> = {
  [P in keyof T as T[P] extends Value ? P : never]: T[P];
};

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Assert that a value is defined (non-null, non-undefined).
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message?: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message ?? 'Value is null or undefined');
  }
}

/**
 * Type guard for checking if value is not null/undefined.
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Type guard for checking if value is an object.
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard for checking if value has a specific property.
 */
export function hasProperty<K extends string>(
  value: unknown,
  key: K
): value is Record<K, unknown> {
  return isObject(value) && key in value;
}

// ═══════════════════════════════════════════════════════════════════════════════
// START FIX SP-A2 (Part B)
// ═══════════════════════════════════════════════════════════════════════════════

// ============================================================================
// VERIFICATION TYPES
// Re-export everything from verification.ts
// ============================================================================

export {
  // Status types
  type VerificationStatus,
  type SessionStatus,
  
  // Step types
  type StepVerificationState,
  type StrategyTestSummary,
  
  // Repair types
  type StepRepair,
  type RepairType,
  
  // Session types
  type VerificationSession,
  type VerificationSummary,
  
  // Event types
  type VerificationProgressEvent,
  type VerificationProgressCallback,
  
  // Helper functions
  needsRepair,
  isActionableStep,
  canSaveSession
} from './verification';

// ═══════════════════════════════════════════════════════════════════════════════
// END FIX SP-A2 (Part B)
// ═══════════════════════════════════════════════════════════════════════════════
