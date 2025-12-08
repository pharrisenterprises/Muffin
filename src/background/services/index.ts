/**
 * @fileoverview Services Barrel Export
 * @description Central export point for all background services.
 * Provides singleton getters and type exports.
 * 
 * @module services
 * @version 1.0.0
 * @since Phase 4
 */

// ============================================================================
// CDP SERVICE
// ============================================================================

export {
  CDPService,
  getCDPService,
  type CDPServiceConfig,
  type CDPCommandResult,
  type CDPConnection,
  type PendingCommand,
  type CDPEventListener
} from './CDPService';

// ============================================================================
// ACCESSIBILITY SERVICE
// ============================================================================

export {
  AccessibilityService,
  getAccessibilityService,
  type AccessibilityServiceConfig,
  type RoleMatchOptions,
  type TextMatchOptions,
  type LabelMatchOptions,
  type AXMatchResult,
  type ARIARole
} from './AccessibilityService';

// ============================================================================
// PLAYWRIGHT LOCATORS
// ============================================================================

export {
  PlaywrightLocators,
  getPlaywrightLocators,
  type LocatorResult,
  type LocatorMethod,
  type LocatorOptions,
  type GetByRoleOptions,
  type GetByTextOptions,
  type GetByTestIdOptions
} from './PlaywrightLocators';

// ============================================================================
// AUTO WAITING
// ============================================================================

export {
  AutoWaiting,
  getAutoWaiting,
  type AutoWaitConfig,
  type WaitOptions,
  type ActionabilityState,
  type WaitResult,
  type WaitFailureReason
} from './AutoWaiting';

// ============================================================================
// VISION SERVICE
// ============================================================================

export {
  VisionService,
  getVisionService,
  type VisionServiceConfig,
  type OCRResult,
  type VisionClickTarget,
  type ConditionalClickConfig,
  type ConditionalClickResult,
  type CapturedScreenshot,
  type VisionServiceStatus
} from './VisionService';

// ============================================================================
// TELEMETRY LOGGER
// ============================================================================

export {
  TelemetryLogger,
  getTelemetryLogger,
  type TelemetryLoggerConfig,
  type TelemetryEvent,
  type StrategyEvaluation,
  type StrategyMetrics,
  type RunSummary,
  type TimeRange,
  type TelemetryQueryOptions,
  type ActiveRun
} from './TelemetryLogger';

// ============================================================================
// SERVICE FACTORY
// ============================================================================

import { CDPService, getCDPService } from './CDPService';
import { AccessibilityService, getAccessibilityService } from './AccessibilityService';
import { PlaywrightLocators, getPlaywrightLocators } from './PlaywrightLocators';
import { AutoWaiting, getAutoWaiting } from './AutoWaiting';
import { VisionService, getVisionService } from './VisionService';
import { TelemetryLogger, getTelemetryLogger } from './TelemetryLogger';

/**
 * All service instances.
 */
export interface ServiceInstances {
  cdpService: CDPService;
  accessibilityService: AccessibilityService;
  playwrightLocators: PlaywrightLocators;
  autoWaiting: AutoWaiting;
  visionService: VisionService;
  telemetryLogger: TelemetryLogger;
}

/**
 * Initialize and return all service instances.
 * Services are created with proper dependency injection.
 */
export function createServices(): ServiceInstances {
  // 1. CDP Service (foundation - no dependencies)
  const cdpService = getCDPService();
  cdpService.initialize();

  // 2. Accessibility Service (depends on CDP)
  const accessibilityService = getAccessibilityService(cdpService);

  // 3. Playwright Locators (depends on CDP + Accessibility)
  const playwrightLocators = getPlaywrightLocators(cdpService, accessibilityService);

  // 4. Auto Waiting (depends on CDP + Locators)
  const autoWaiting = getAutoWaiting(cdpService, playwrightLocators);

  // 5. Vision Service (depends on CDP)
  const visionService = getVisionService(cdpService);

  // 6. Telemetry Logger (no dependencies)
  const telemetryLogger = getTelemetryLogger();

  return {
    cdpService,
    accessibilityService,
    playwrightLocators,
    autoWaiting,
    visionService,
    telemetryLogger
  };
}

/**
 * Initialize all services asynchronously.
 * Handles async initialization (Vision OCR, Telemetry IndexedDB).
 */
export async function initializeServices(): Promise<ServiceInstances> {
  const services = createServices();

  // Async initialization
  await Promise.all([
    services.visionService.initialize(),
    services.telemetryLogger.initialize()
  ]);

  console.log('[Services] All services initialized');
  return services;
}

/**
 * Cleanup all services.
 */
export async function shutdownServices(services: ServiceInstances): Promise<void> {
  await services.visionService.shutdown();
  await services.telemetryLogger.close();
  await services.cdpService.cleanup();

  console.log('[Services] All services shut down');
}
