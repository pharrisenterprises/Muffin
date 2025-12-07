# Types Index Specification

**File ID:** H2  
**File Path:** `src/types/index.ts`  
**Status:** CREATE  
**Priority:** P0

---

## Purpose

Central export file for all TypeScript types used across the extension. Provides a single import point for strategy types, CDP types, recording types, vision types, and telemetry types. Simplifies imports throughout the codebase and ensures consistent type usage across all modules.

---

## Dependencies

### Exports (from)
- `./strategy`: All strategy-related types
- `./cdp`: All CDP-related types
- `./recording`: All recording-related types
- `./vision`: All vision-related types
- `./telemetry`: All telemetry-related types

### Used By (imports to)
- All source files that need type definitions
- Background services
- Content script modules
- UI components

---

## Complete Implementation

```typescript
/**
 * ============================================================================
 * STRATEGY TYPES
 * ============================================================================
 */

export {
  // Core types
  StrategyType,
  StrategyCategory,
  LocatorStrategy,
  StrategyMetadata,
  
  // Metadata types
  CDPSemanticMetadata,
  CDPPowerMetadata,
  DOMSelectorMetadata,
  CSSSelectorMetadata,
  EvidenceScoringMetadata,
  VisionOCRMetadata,
  CoordinatesMetadata,
  
  // Chain types
  FallbackChain,
  
  // Action types
  CapturedAction,
  ActionEventType,
  DOMCaptureData,
  VisionCaptureData,
  MouseCaptureData,
  NetworkCaptureData,
  
  // Evaluation types
  StrategyEvaluationResult,
  EvaluationResults,
  
  // Constants
  STRATEGY_WEIGHTS,
  STRATEGY_CATEGORIES,
  
  // Type guards
  isCDPSemanticMetadata,
  isCDPPowerMetadata,
  isVisionOCRMetadata,
  isCoordinatesMetadata,
  isEvidenceScoringMetadata,
  
  // Utility functions
  getStrategyCategory,
  getStrategyWeight,
  createEmptyFallbackChain,
  sortStrategiesByConfidence
} from './strategy';

/**
 * ============================================================================
 * CDP TYPES
 * ============================================================================
 */

export {
  // Connection types
  CDPDebuggee,
  CDPConnection,
  PendingCommand,
  CDPEventListener,
  CDPCommandResult,
  
  // DOM types
  CDPNode,
  BackendNode,
  NodeId,
  BackendNodeId,
  RemoteObjectId,
  
  // Box model types
  BoxModel,
  ShapeOutsideInfo,
  BoundingRect,
  Quad,
  
  // Accessibility types
  AXNode,
  AXNodeId,
  AXProperty,
  AXPropertyName,
  AXValue,
  AXValueType,
  AXValueValue,
  AXRelatedNode,
  AXValueSource,
  AXValueSourceType,
  AXValueNativeSourceType,
  
  // Input types
  MouseEventType,
  MouseButton,
  KeyEventType,
  InputModifiers,
  MouseEventParams,
  KeyEventParams,
  
  // Page types
  LayoutViewport,
  VisualViewport,
  LayoutMetrics,
  ScreenshotParams,
  
  // Runtime types
  RemoteObject,
  RemoteObjectType,
  RemoteObjectSubtype,
  ObjectPreview,
  PropertyPreview,
  EntryPreview,
  CustomPreview,
  
  // Utility functions
  parseAttributes,
  getAccessibleName,
  getAccessibleRole,
  getAXProperty,
  quadToBoundingRect,
  getCenterPoint,
  modifiersToBitmask
} from './cdp';

/**
 * ============================================================================
 * RECORDING TYPES
 * ============================================================================
 */

export {
  // State types
  RecordingState,
  RecordingMode,
  RecordingConfig,
  RecordingSession,
  RecordingError,
  RecordingErrorCode,
  
  // Layer types
  LayerType,
  LayerStatus,
  LayerInitResult,
  
  // DOM capture types
  DOMCaptureResult,
  DOMElementInfo,
  ComputedStylesSubset,
  FormContext,
  ShadowDOMInfo,
  IframeInfo,
  
  // Vision capture types
  VisionLayerConfig,
  VisionCaptureResult,
  OCRTextResult,
  OCRWordResult,
  
  // Mouse capture types
  MouseLayerConfig,
  MouseCaptureResult,
  MouseTrailPoint,
  MousePattern,
  HesitationPoint,
  
  // Network capture types
  NetworkLayerConfig,
  NetworkCaptureResult,
  NetworkRequest,
  ResourceType,
  PageLoadState,
  
  // Buffer types
  BufferConfig,
  BufferStatus,
  BufferedAction,
  
  // Message types
  RecordingMessageType,
  RecordingMessage,
  StartRecordingPayload,
  ToggleLayerPayload,
  RecordingActionPayload,
  
  // Default configs
  DEFAULT_RECORDING_CONFIG,
  DEFAULT_VISION_CONFIG,
  DEFAULT_MOUSE_CONFIG,
  DEFAULT_NETWORK_CONFIG,
  DEFAULT_BUFFER_CONFIG,
  
  // Utility functions
  generateSessionId,
  generateActionId,
  isLayerRequired,
  getDefaultLayerConfig,
  estimateActionMemory
} from './recording';

/**
 * ============================================================================
 * VISION TYPES
 * ============================================================================
 */

export {
  // Service types
  VisionServiceConfig,
  VisionServiceState,
  TesseractLanguage,
  TesseractLoggerConfig,
  
  // Screenshot types
  CapturedScreenshot,
  ScreenshotFormat,
  ScreenshotOptions,
  
  // OCR result types
  OCRResult,
  OCRWord,
  OCRSymbol,
  OCRPageResult,
  OCRBlock,
  OCRBlockType,
  OCRParagraph,
  OCRLine,
  
  // Text matching types
  VisionClickTarget,
  VisionMatch,
  VisionMatchType,
  TextSearchOptions,
  
  // Conditional click types
  ConditionalClickConfig,
  VisionInteractionType,
  ConditionalClickResult,
  
  // Cache types
  CachedOCR,
  OCRCacheStats,
  
  // Tesseract types
  TesseractWorkerStatus,
  TesseractJobStatus,
  TesseractParams,
  TesseractPSM,
  TesseractOEM,
  
  // Default config
  DEFAULT_VISION_SERVICE_CONFIG,
  
  // Utility functions
  getBboxCenter,
  isPointInBbox,
  calculateBboxOverlap,
  expandBbox,
  scaleBbox,
  filterByConfidence,
  findNearestOCRResult,
  parseTesseractOutput
} from './vision';

/**
 * ============================================================================
 * TELEMETRY TYPES
 * ============================================================================
 */

export {
  // Event types
  TelemetryEvent,
  StrategyEvaluation,
  TelemetryContext,
  TelemetryEventType,
  
  // Metrics types
  StrategyMetrics,
  StrategyMetricsTimeSeries,
  MetricsBucket,
  StrategyHealth,
  HealthStatus,
  HealthFactor,
  
  // Run types
  RunSummary,
  RunStatus,
  FailureReason,
  FailureCategory,
  ActiveRun,
  
  // Query types
  TimeRange,
  PredefinedTimeRange,
  TelemetryQueryOptions,
  TelemetrySortField,
  TelemetryQueryResult,
  
  // Analytics types
  DashboardSummary,
  DomainStats,
  PerformanceTrend,
  StrategyComparison,
  
  // Export types
  ExportFormat,
  ExportOptions,
  ExportResult,
  
  // Config types
  TelemetryLoggerConfig,
  
  // Default config
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

/**
 * ============================================================================
 * CONVENIENCE TYPE ALIASES
 * ============================================================================
 */

/**
 * Strategy type with its weight
 */
export interface WeightedStrategy {
  type: StrategyType;
  weight: number;
}

/**
 * Element location result (common across strategies)
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
 * Action execution context
 */
export interface ActionContext {
  tabId: number;
  stepIndex: number;
  runId: string;
  timeout: number;
}

/**
 * Service health check result
 */
export interface ServiceHealthCheck {
  service: string;
  healthy: boolean;
  latency?: number;
  error?: string;
  lastCheck: number;
}

/**
 * ============================================================================
 * TYPE UTILITIES
 * ============================================================================
 */

/**
 * Make all properties of T optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Extract the resolved type from a Promise
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T;

/**
 * Make specific properties required
 */
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Omit properties from T that are in K
 */
export type StrictOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

/**
 * Create a type with only the specified keys from T
 */
export type PickByType<T, Value> = {
  [P in keyof T as T[P] extends Value ? P : never]: T[P];
};

/**
 * Assert that a value is defined (non-null, non-undefined)
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message?: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message || 'Value is null or undefined');
  }
}

/**
 * Type guard for checking if value is not null/undefined
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Type guard for checking if value is an object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Type guard for checking if value has a specific property
 */
export function hasProperty<K extends string>(
  value: unknown,
  key: K
): value is Record<K, unknown> {
  return isObject(value) && key in value;
}
```

---

## Usage Examples

### Import All Strategy Types
```typescript
import {
  StrategyType,
  FallbackChain,
  LocatorStrategy,
  STRATEGY_WEIGHTS
} from '../types';
```

### Import CDP Types
```typescript
import {
  CDPNode,
  AXNode,
  BoxModel,
  parseAttributes
} from '../types';
```

### Import Recording Types
```typescript
import {
  RecordingState,
  DOMCaptureResult,
  MouseCaptureResult,
  DEFAULT_RECORDING_CONFIG
} from '../types';
```

### Import Vision Types
```typescript
import {
  OCRResult,
  VisionClickTarget,
  ConditionalClickConfig
} from '../types';
```

### Import Telemetry Types
```typescript
import {
  TelemetryEvent,
  RunSummary,
  StrategyMetrics
} from '../types';
```

### Use Type Utilities
```typescript
import { DeepPartial, isDefined, assertDefined } from '../types';

function processConfig(config: DeepPartial<RecordingConfig>) {
  // ...
}

const value = maybeNull;
if (isDefined(value)) {
  // value is now non-null
}

assertDefined(criticalValue, 'Critical value must be defined');
// criticalValue is now guaranteed non-null
```

---

## Import Patterns

### Single Module Import
```typescript
// Import everything from types
import * as Types from '../types';

const strategy: Types.StrategyType = 'cdp_semantic';
```

### Destructured Import
```typescript
// Import specific types
import { StrategyType, FallbackChain, CDPNode } from '../types';
```

### Type-Only Import
```typescript
// Import types without runtime code
import type { StrategyType, FallbackChain } from '../types';
```

---

## Acceptance Criteria

- [ ] All strategy types exported
- [ ] All CDP types exported
- [ ] All recording types exported
- [ ] All vision types exported
- [ ] All telemetry types exported
- [ ] Default configs exported
- [ ] Utility functions exported
- [ ] Type guards exported
- [ ] Convenience type aliases defined
- [ ] Type utilities (DeepPartial, etc.) defined
- [ ] No circular dependencies
- [ ] TypeScript compiles with strict mode, 0 errors

---

## Edge Cases

1. **Circular imports**: Avoided by exporting from separate files
2. **Name collisions**: Use explicit re-exports
3. **Large bundle**: Tree shaking removes unused
4. **Type-only imports**: Support with `import type`
5. **Missing exports**: Compile error catches
6. **Duplicate exports**: TypeScript error
7. **Default export confusion**: Only named exports
8. **Version mismatches**: Single source of truth
9. **IDE performance**: Barrel file handled well
10. **Runtime vs type**: Clear separation

---

## Estimated Lines

200-250 lines
