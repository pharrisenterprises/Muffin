# Integration Index Specification

**File ID:** H1  
**File Path:** `src/background/services/index.ts`  
**Status:** CREATE  
**Priority:** P0

---

## Purpose

Central export file for all background services. Provides a single import point for DecisionEngine, CDPService, VisionService, and all other Phase 3 services. Simplifies imports throughout the codebase, ensures consistent service initialization order, and provides factory functions for creating properly configured service instances.

---

## Dependencies

### Exports (from)
- `./CDPService`: CDPService
- `./AccessibilityService`: AccessibilityService
- `./PlaywrightLocators`: PlaywrightLocators
- `./AutoWaiting`: AutoWaiting
- `./VisionService`: VisionService
- `./DecisionEngine`: DecisionEngine
- `./TelemetryLogger`: TelemetryLogger
- `./FallbackChainGenerator`: FallbackChainGenerator
- `./StrategyScorer`: StrategyScorer
- `./StrategyChainBuilder`: StrategyChainBuilder
- `./ActionExecutor`: ActionExecutor
- `./strategies/*`: All strategy evaluators

### Used By (imports to)
- `../background.ts`: Service initialization
- Test files: Service mocking

---

## Complete Implementation

```typescript
/**
 * ============================================================================
 * SERVICE EXPORTS
 * ============================================================================
 */

// Core CDP Services
export { CDPService } from './CDPService';
export type { CDPServiceConfig } from './CDPService';

export { AccessibilityService } from './AccessibilityService';
export type { AccessibilityServiceConfig } from './AccessibilityService';

export { PlaywrightLocators } from './PlaywrightLocators';
export type { LocatorResult, RoleOptions } from './PlaywrightLocators';

export { AutoWaiting } from './AutoWaiting';
export type { AutoWaitingConfig, ActionabilityResult } from './AutoWaiting';

// Vision Services
export { VisionService } from './VisionService';
export type { VisionServiceConfig } from './VisionService';

// Decision Engine
export { DecisionEngine } from './DecisionEngine';
export type { DecisionEngineConfig, ExecutionResult } from './DecisionEngine';

// Telemetry
export { TelemetryLogger } from './TelemetryLogger';
export type { TelemetryLoggerConfig } from './TelemetryLogger';

// Chain Generation
export { FallbackChainGenerator } from './FallbackChainGenerator';
export type { FallbackChainGeneratorConfig, GenerationResult } from './FallbackChainGenerator';

export { StrategyScorer } from './StrategyScorer';
export type { ScoringFactors } from './StrategyScorer';

export { StrategyChainBuilder } from './StrategyChainBuilder';
export type { ChainBuilderConfig, DiversityAnalysis } from './StrategyChainBuilder';

// Action Execution
export { ActionExecutor } from './ActionExecutor';
export type { ActionExecutorConfig, ActionRequest, ActionResult } from './ActionExecutor';

/**
 * ============================================================================
 * STRATEGY EVALUATOR EXPORTS
 * ============================================================================
 */

export { DOMStrategy } from './strategies/DOMStrategy';
export { CDPStrategy } from './strategies/CDPStrategy';
export { VisionStrategy } from './strategies/VisionStrategy';
export { CoordinatesStrategy } from './strategies/CoordinatesStrategy';
export { EvidenceScoring } from './strategies/EvidenceScoring';

// Strategy evaluator interface
export type { StrategyEvaluator } from './strategies/StrategyEvaluator';

/**
 * ============================================================================
 * SERVICE FACTORY
 * ============================================================================
 */

/**
 * Service instances container
 */
export interface ServiceInstances {
  cdpService: CDPService;
  accessibilityService: AccessibilityService;
  playwrightLocators: PlaywrightLocators;
  autoWaiting: AutoWaiting;
  visionService: VisionService;
  decisionEngine: DecisionEngine;
  telemetryLogger: TelemetryLogger;
  chainGenerator: FallbackChainGenerator;
  actionExecutor: ActionExecutor;
}

/**
 * Service configuration options
 */
export interface ServiceFactoryOptions {
  /** CDP service config */
  cdp?: Partial<CDPServiceConfig>;
  /** Accessibility service config */
  accessibility?: Partial<AccessibilityServiceConfig>;
  /** Auto-waiting config */
  autoWaiting?: Partial<AutoWaitingConfig>;
  /** Vision service config */
  vision?: Partial<VisionServiceConfig>;
  /** Decision engine config */
  decisionEngine?: Partial<DecisionEngineConfig>;
  /** Telemetry config */
  telemetry?: Partial<TelemetryLoggerConfig>;
  /** Chain generator config */
  chainGenerator?: Partial<FallbackChainGeneratorConfig>;
  /** Action executor config */
  actionExecutor?: Partial<ActionExecutorConfig>;
  /** Whether to skip async initialization */
  skipAsyncInit?: boolean;
}

/**
 * Default service configurations
 */
export const DEFAULT_SERVICE_OPTIONS: ServiceFactoryOptions = {
  cdp: {
    retryAttempts: 3,
    retryDelayMs: 100,
    commandTimeout: 30000,
    debugLogging: false
  },
  accessibility: {
    cacheTtlMs: 1000,
    includeIgnored: false,
    maxDepth: 100
  },
  autoWaiting: {
    timeout: 30000,
    pollingInterval: 100,
    stabilityThreshold: 100
  },
  vision: {
    confidenceThreshold: 60,
    language: 'eng',
    ocrTimeout: 5000,
    cacheTtlMs: 2000,
    preInitialize: true
  },
  decisionEngine: {
    timeout: 30000,
    minConfidence: 0.5,
    parallelEvaluation: true,
    enableTelemetry: true,
    retryOnFailure: true,
    maxRetries: 2
  },
  telemetry: {
    enabled: true,
    maxEvents: 10000,
    retentionDays: 30,
    batchSize: 10,
    flushIntervalMs: 5000
  },
  chainGenerator: {
    minConfidence: 0.3,
    maxStrategies: 7,
    alwaysIncludeCoordinates: true,
    alwaysGenerateVision: true,
    generateEvidenceScoring: true
  },
  actionExecutor: {
    clickDelay: 50,
    typeDelay: 50,
    moveBeforeClick: true,
    mouseMoveSteps: 10,
    focusBeforeType: true,
    clearBeforeType: true,
    scrollMargin: 100,
    verifyAfterAction: true,
    timeout: 30000
  }
};

/**
 * Create all service instances with proper dependency injection
 */
export async function createServices(
  options: ServiceFactoryOptions = {}
): Promise<ServiceInstances> {
  const opts = mergeOptions(DEFAULT_SERVICE_OPTIONS, options);

  // 1. Create CDP Service (foundation)
  const cdpService = new CDPService(opts.cdp);

  // 2. Create Accessibility Service (depends on CDP)
  const accessibilityService = new AccessibilityService(
    cdpService,
    opts.accessibility
  );

  // 3. Create Playwright Locators (depends on CDP, Accessibility)
  const playwrightLocators = new PlaywrightLocators(
    cdpService,
    accessibilityService
  );

  // 4. Create Auto-Waiting (depends on CDP)
  const autoWaiting = new AutoWaiting(cdpService, opts.autoWaiting);

  // 5. Create Vision Service (independent, async init)
  const visionService = new VisionService(opts.vision);

  // 6. Create Telemetry Logger
  const telemetryLogger = new TelemetryLogger(opts.telemetry);

  // 7. Create Chain Generator components
  const strategyScorer = new StrategyScorer();
  const chainBuilder = new StrategyChainBuilder();
  const chainGenerator = new FallbackChainGenerator(
    strategyScorer,
    chainBuilder,
    opts.chainGenerator
  );

  // 8. Create Action Executor (depends on CDP, AutoWaiting)
  const actionExecutor = new ActionExecutor(
    cdpService,
    autoWaiting,
    opts.actionExecutor
  );

  // 9. Create Decision Engine (depends on everything)
  const decisionEngine = new DecisionEngine(
    {
      cdpService,
      accessibilityService,
      playwrightLocators,
      autoWaiting,
      visionService,
      telemetryLogger,
      actionExecutor
    },
    opts.decisionEngine
  );

  // Async initialization (unless skipped)
  if (!options.skipAsyncInit) {
    await Promise.all([
      telemetryLogger.initialize(),
      visionService.initialize().catch(err => {
        console.warn('Vision service init warning:', err);
      })
    ]);
  }

  return {
    cdpService,
    accessibilityService,
    playwrightLocators,
    autoWaiting,
    visionService,
    decisionEngine,
    telemetryLogger,
    chainGenerator,
    actionExecutor
  };
}

/**
 * Create services synchronously (for testing)
 */
export function createServicesSync(
  options: ServiceFactoryOptions = {}
): ServiceInstances {
  const opts = mergeOptions(DEFAULT_SERVICE_OPTIONS, { ...options, skipAsyncInit: true });

  const cdpService = new CDPService(opts.cdp);
  const accessibilityService = new AccessibilityService(cdpService, opts.accessibility);
  const playwrightLocators = new PlaywrightLocators(cdpService, accessibilityService);
  const autoWaiting = new AutoWaiting(cdpService, opts.autoWaiting);
  const visionService = new VisionService(opts.vision);
  const telemetryLogger = new TelemetryLogger(opts.telemetry);
  const strategyScorer = new StrategyScorer();
  const chainBuilder = new StrategyChainBuilder();
  const chainGenerator = new FallbackChainGenerator(strategyScorer, chainBuilder, opts.chainGenerator);
  const actionExecutor = new ActionExecutor(cdpService, autoWaiting, opts.actionExecutor);
  const decisionEngine = new DecisionEngine(
    { cdpService, accessibilityService, playwrightLocators, autoWaiting, visionService, telemetryLogger, actionExecutor },
    opts.decisionEngine
  );

  return {
    cdpService,
    accessibilityService,
    playwrightLocators,
    autoWaiting,
    visionService,
    decisionEngine,
    telemetryLogger,
    chainGenerator,
    actionExecutor
  };
}

/**
 * Dispose all services (cleanup)
 */
export async function disposeServices(services: ServiceInstances): Promise<void> {
  const cleanupTasks: Promise<void>[] = [];

  // Flush telemetry
  if (services.telemetryLogger) {
    cleanupTasks.push(
      services.telemetryLogger.flush().catch(() => {})
    );
  }

  // Terminate vision worker
  if (services.visionService) {
    cleanupTasks.push(
      services.visionService.terminate().catch(() => {})
    );
  }

  // Close telemetry DB
  if (services.telemetryLogger) {
    cleanupTasks.push(
      services.telemetryLogger.close().catch(() => {})
    );
  }

  await Promise.all(cleanupTasks);
}

/**
 * Deep merge options
 */
function mergeOptions(
  defaults: ServiceFactoryOptions,
  overrides: ServiceFactoryOptions
): Required<ServiceFactoryOptions> {
  const result: any = { ...defaults };

  for (const key of Object.keys(overrides) as (keyof ServiceFactoryOptions)[]) {
    if (overrides[key] !== undefined) {
      if (typeof overrides[key] === 'object' && !Array.isArray(overrides[key])) {
        result[key] = { ...(defaults[key] || {}), ...overrides[key] };
      } else {
        result[key] = overrides[key];
      }
    }
  }

  return result as Required<ServiceFactoryOptions>;
}

/**
 * ============================================================================
 * STRATEGY EVALUATOR FACTORY
 * ============================================================================
 */

/**
 * Create all strategy evaluators
 */
export function createStrategyEvaluators(
  cdpService: CDPService,
  accessibilityService: AccessibilityService,
  playwrightLocators: PlaywrightLocators,
  visionService: VisionService
): StrategyEvaluator[] {
  return [
    new DOMStrategy(cdpService),
    new CDPStrategy(cdpService, accessibilityService, playwrightLocators),
    new VisionStrategy(visionService),
    new CoordinatesStrategy(cdpService),
    new EvidenceScoring(cdpService)
  ];
}

/**
 * ============================================================================
 * TYPE RE-EXPORTS (Convenience)
 * ============================================================================
 */

// Re-export commonly used types from types module
export type {
  StrategyType,
  LocatorStrategy,
  FallbackChain,
  StrategyEvaluationResult,
  CapturedAction
} from '../../types/strategy';

export type {
  TelemetryEvent,
  StrategyMetrics,
  RunSummary
} from '../../types/telemetry';

export type {
  RecordingState,
  RecordingConfig,
  LayerStatus
} from '../../types/recording';
```

---

## Usage Examples

### Basic Service Creation
```typescript
import { createServices, ServiceInstances } from './services';

// Create all services with defaults
const services = await createServices();

// Use services
await services.cdpService.attach(tabId);
const result = await services.decisionEngine.executeAction(request);
```

### Custom Configuration
```typescript
import { createServices } from './services';

const services = await createServices({
  vision: {
    confidenceThreshold: 70,
    ocrTimeout: 10000
  },
  decisionEngine: {
    timeout: 60000,
    maxRetries: 3
  }
});
```

### Individual Service Imports
```typescript
import {
  CDPService,
  DecisionEngine,
  VisionService,
  TelemetryLogger
} from './services';

// Create individual services manually
const cdpService = new CDPService({ debugLogging: true });
```

### Strategy Evaluators
```typescript
import {
  createStrategyEvaluators,
  DOMStrategy,
  CDPStrategy
} from './services';

// Create all evaluators
const evaluators = createStrategyEvaluators(
  cdpService,
  accessibilityService,
  playwrightLocators,
  visionService
);

// Or individual
const domStrategy = new DOMStrategy(cdpService);
```

### Cleanup
```typescript
import { createServices, disposeServices } from './services';

const services = await createServices();

// ... use services ...

// Cleanup on shutdown
await disposeServices(services);
```

---

## Service Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│                        DecisionEngine                            │
│  (orchestrates all strategy evaluation and action execution)     │
└─────────────────────────────────────────────────────────────────┘
         │           │            │           │           │
         ▼           ▼            ▼           ▼           ▼
┌─────────────┐ ┌─────────┐ ┌──────────┐ ┌─────────┐ ┌──────────┐
│ ActionExec  │ │AutoWait │ │LocatorPW │ │ Vision  │ │Telemetry │
└─────────────┘ └─────────┘ └──────────┘ └─────────┘ └──────────┘
         │           │            │
         └───────────┼────────────┘
                     ▼
              ┌─────────────┐
              │  CDPService │
              │ (foundation)│
              └─────────────┘
                     │
                     ▼
            ┌───────────────┐
            │AccessibilitySvc│
            └───────────────┘
```

---

## Acceptance Criteria

- [ ] All services exported
- [ ] All service types exported
- [ ] createServices() initializes all services in order
- [ ] createServicesSync() works without await
- [ ] disposeServices() cleans up properly
- [ ] Default options defined for all services
- [ ] Options merging works correctly
- [ ] Strategy evaluators factory works
- [ ] Type re-exports available
- [ ] No circular dependencies
- [ ] TypeScript compiles with strict mode, 0 errors

---

## Edge Cases

1. **Vision init fails**: Continue with warning
2. **Telemetry DB fails**: Continue without persistence
3. **Partial options**: Merge with defaults
4. **Double initialization**: Handle idempotently
5. **Dispose called twice**: Handle gracefully
6. **Service reference after dispose**: May error
7. **Sync creation for tests**: No async init
8. **Missing optional dependencies**: Handle nulls
9. **Circular imports**: Avoided by structure
10. **Tree shaking**: Individual exports work

---

## Estimated Lines

250-300 lines
