# Layers Index Specification

**File ID:** H4  
**File Path:** `src/contentScript/layers/index.ts`  
**Status:** CREATE  
**Priority:** P0

---

## Purpose

Central export file for all capture layer modules in the content script. Provides a single import point for DOMCapture, VisionCapture, MouseCapture, NetworkCapture, and EvidenceBuffer. Simplifies imports for RecordingOrchestrator and ensures consistent layer initialization and lifecycle management.

---

## Dependencies

### Exports (from)
- `./DOMCapture`: DOMCapture class
- `./VisionCapture`: VisionCapture class
- `./MouseCapture`: MouseCapture class
- `./NetworkCapture`: NetworkCapture class
- `./EvidenceBuffer`: EvidenceBuffer class

### Used By (imports to)
- `../RecordingOrchestrator`: Layer initialization
- `../content.tsx`: Content script setup

---

## Complete Implementation

```typescript
/**
 * ============================================================================
 * CAPTURE LAYER EXPORTS
 * ============================================================================
 */

// DOM Capture Layer
export { DOMCapture } from './DOMCapture';
export type {
  DOMCaptureConfig,
  DOMCaptureResult,
  DOMElementInfo,
  SelectorGeneratorOptions
} from './DOMCapture';

// Vision Capture Layer
export { VisionCapture } from './VisionCapture';
export type {
  VisionCaptureConfig,
  VisionCaptureResult,
  ScreenshotResult,
  OCRExtractionResult
} from './VisionCapture';

// Mouse Capture Layer
export { MouseCapture } from './MouseCapture';
export type {
  MouseCaptureConfig,
  MouseCaptureResult,
  MouseTrailPoint,
  MousePatternAnalysis
} from './MouseCapture';

// Network Capture Layer
export { NetworkCapture } from './NetworkCapture';
export type {
  NetworkCaptureConfig,
  NetworkCaptureResult,
  TrackedRequest,
  NetworkState
} from './NetworkCapture';

// Evidence Buffer
export { EvidenceBuffer } from './EvidenceBuffer';
export type {
  EvidenceBufferConfig,
  BufferedAction,
  BufferStatus,
  BufferEvent
} from './EvidenceBuffer';

/**
 * ============================================================================
 * LAYER TYPES
 * ============================================================================
 */

import { LayerType, LayerStatus } from '../../types/recording';

/**
 * Generic capture layer interface
 */
export interface CaptureLayer {
  /** Layer type identifier */
  readonly type: LayerType;
  
  /** Initialize the layer */
  initialize(): Promise<void>;
  
  /** Start capturing */
  start(): void;
  
  /** Stop capturing */
  stop(): void;
  
  /** Pause capturing */
  pause(): void;
  
  /** Resume capturing */
  resume(): void;
  
  /** Get current status */
  getStatus(): LayerStatus;
  
  /** Cleanup resources */
  destroy(): void;
}

/**
 * Layer factory function type
 */
export type LayerFactory<T extends CaptureLayer> = (config?: Partial<LayerConfig>) => T;

/**
 * Generic layer configuration
 */
export interface LayerConfig {
  /** Enable debug logging */
  debug?: boolean;
  /** Layer-specific options */
  [key: string]: unknown;
}

/**
 * Layer initialization result
 */
export interface LayerInitResult {
  /** Layer type */
  type: LayerType;
  /** Whether initialization succeeded */
  success: boolean;
  /** Initialization time (ms) */
  initTime: number;
  /** Error message if failed */
  error?: string;
}

/**
 * ============================================================================
 * LAYER FACTORY
 * ============================================================================
 */

import { DOMCapture } from './DOMCapture';
import { VisionCapture } from './VisionCapture';
import { MouseCapture } from './MouseCapture';
import { NetworkCapture } from './NetworkCapture';
import { EvidenceBuffer } from './EvidenceBuffer';

/**
 * Layer instances container
 */
export interface LayerInstances {
  dom: DOMCapture;
  vision: VisionCapture;
  mouse: MouseCapture;
  network: NetworkCapture;
  buffer: EvidenceBuffer;
}

/**
 * Layer configuration options
 */
export interface LayerFactoryOptions {
  /** DOM capture config */
  dom?: Partial<DOMCaptureConfig>;
  /** Vision capture config */
  vision?: Partial<VisionCaptureConfig>;
  /** Mouse capture config */
  mouse?: Partial<MouseCaptureConfig>;
  /** Network capture config */
  network?: Partial<NetworkCaptureConfig>;
  /** Evidence buffer config */
  buffer?: Partial<EvidenceBufferConfig>;
  /** Layers to enable */
  enabledLayers?: LayerType[];
}

/**
 * Default layer configuration
 */
export const DEFAULT_LAYER_OPTIONS: LayerFactoryOptions = {
  dom: {
    captureStyles: true,
    captureFormContext: true,
    maxSelectorLength: 200,
    preferredSelectorTypes: ['id', 'data-testid', 'aria-label', 'role']
  },
  vision: {
    captureScreenshots: true,
    performOCR: true,
    minOCRConfidence: 60,
    ocrTimeout: 5000,
    screenshotQuality: 0.8
  },
  mouse: {
    maxTrailPoints: 100,
    minPointDistance: 5,
    trailTimeout: 2000,
    detectPatterns: true
  },
  network: {
    trackRequests: true,
    maxRequests: 50,
    requestTimeout: 30000,
    ignorePatterns: [/\.(png|jpg|gif|svg|woff|woff2|ttf)$/i]
  },
  buffer: {
    maxSize: 100,
    flushInterval: 5000,
    persistOnFlush: false,
    generateChainsImmediately: true
  },
  enabledLayers: ['dom', 'vision', 'mouse', 'network']
};

/**
 * Create all layer instances
 */
export function createLayers(
  options: LayerFactoryOptions = {}
): LayerInstances {
  const opts = mergeLayerOptions(DEFAULT_LAYER_OPTIONS, options);

  // Create buffer first (other layers may use it)
  const buffer = new EvidenceBuffer(opts.buffer);

  // Create capture layers
  const dom = new DOMCapture(opts.dom);
  const vision = new VisionCapture(opts.vision);
  const mouse = new MouseCapture(opts.mouse);
  const network = new NetworkCapture(opts.network);

  return {
    dom,
    vision,
    mouse,
    network,
    buffer
  };
}

/**
 * Initialize all layers in parallel
 */
export async function initializeLayers(
  layers: LayerInstances,
  enabledLayers: LayerType[] = ['dom', 'vision', 'mouse', 'network']
): Promise<LayerInitResult[]> {
  const results: LayerInitResult[] = [];

  const initTasks = enabledLayers.map(async (type) => {
    const startTime = Date.now();
    const layer = getLayerByType(layers, type);

    if (!layer) {
      return {
        type,
        success: false,
        initTime: 0,
        error: `Unknown layer type: ${type}`
      };
    }

    try {
      await layer.initialize();
      return {
        type,
        success: true,
        initTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        type,
        success: false,
        initTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Initialization failed'
      };
    }
  });

  // Also initialize buffer
  const bufferStart = Date.now();
  try {
    await layers.buffer.initialize();
    results.push({
      type: 'dom', // Buffer doesn't have its own type, use placeholder
      success: true,
      initTime: Date.now() - bufferStart
    });
  } catch (error) {
    // Buffer init is non-critical
    console.warn('Buffer initialization warning:', error);
  }

  const layerResults = await Promise.all(initTasks);
  results.push(...layerResults);

  return results;
}

/**
 * Start all enabled layers
 */
export function startLayers(
  layers: LayerInstances,
  enabledLayers: LayerType[] = ['dom', 'vision', 'mouse', 'network']
): void {
  for (const type of enabledLayers) {
    const layer = getLayerByType(layers, type);
    if (layer) {
      layer.start();
    }
  }
}

/**
 * Stop all layers
 */
export function stopLayers(layers: LayerInstances): void {
  layers.dom.stop();
  layers.vision.stop();
  layers.mouse.stop();
  layers.network.stop();
}

/**
 * Pause all layers
 */
export function pauseLayers(layers: LayerInstances): void {
  layers.dom.pause();
  layers.vision.pause();
  layers.mouse.pause();
  layers.network.pause();
}

/**
 * Resume all layers
 */
export function resumeLayers(layers: LayerInstances): void {
  layers.dom.resume();
  layers.vision.resume();
  layers.mouse.resume();
  layers.network.resume();
}

/**
 * Get status of all layers
 */
export function getLayerStatuses(layers: LayerInstances): LayerStatus[] {
  return [
    layers.dom.getStatus(),
    layers.vision.getStatus(),
    layers.mouse.getStatus(),
    layers.network.getStatus()
  ];
}

/**
 * Destroy all layers and cleanup
 */
export function destroyLayers(layers: LayerInstances): void {
  layers.dom.destroy();
  layers.vision.destroy();
  layers.mouse.destroy();
  layers.network.destroy();
  layers.buffer.destroy();
}

/**
 * Get layer instance by type
 */
export function getLayerByType(
  layers: LayerInstances,
  type: LayerType
): CaptureLayer | null {
  switch (type) {
    case 'dom':
      return layers.dom;
    case 'vision':
      return layers.vision;
    case 'mouse':
      return layers.mouse;
    case 'network':
      return layers.network;
    default:
      return null;
  }
}

/**
 * ============================================================================
 * CAPTURE UTILITIES
 * ============================================================================
 */

/**
 * Capture data from all layers for a single action
 */
export async function captureAllLayers(
  layers: LayerInstances,
  event: Event,
  target: Element
): Promise<{
  dom: DOMCaptureResult | null;
  vision: VisionCaptureResult | null;
  mouse: MouseCaptureResult | null;
  network: NetworkCaptureResult | null;
}> {
  const [dom, vision, mouse, network] = await Promise.all([
    layers.dom.capture(target).catch(() => null),
    layers.vision.capture().catch(() => null),
    layers.mouse.capture().catch(() => null),
    layers.network.capture().catch(() => null)
  ]);

  return { dom, vision, mouse, network };
}

/**
 * Check if any layer has errors
 */
export function hasLayerErrors(layers: LayerInstances): boolean {
  const statuses = getLayerStatuses(layers);
  return statuses.some(status => status.errorCount > 0);
}

/**
 * Get total capture count across layers
 */
export function getTotalCaptureCount(layers: LayerInstances): number {
  const statuses = getLayerStatuses(layers);
  return statuses.reduce((sum, status) => sum + status.captureCount, 0);
}

/**
 * ============================================================================
 * UTILITY FUNCTIONS
 * ============================================================================
 */

/**
 * Merge layer options with defaults
 */
function mergeLayerOptions(
  defaults: LayerFactoryOptions,
  overrides: LayerFactoryOptions
): LayerFactoryOptions {
  return {
    dom: { ...defaults.dom, ...overrides.dom },
    vision: { ...defaults.vision, ...overrides.vision },
    mouse: { ...defaults.mouse, ...overrides.mouse },
    network: { ...defaults.network, ...overrides.network },
    buffer: { ...defaults.buffer, ...overrides.buffer },
    enabledLayers: overrides.enabledLayers || defaults.enabledLayers
  };
}

/**
 * Layer type to display name
 */
export function getLayerDisplayName(type: LayerType): string {
  const names: Record<LayerType, string> = {
    dom: 'DOM Capture',
    vision: 'Vision Capture',
    mouse: 'Mouse Capture',
    network: 'Network Capture'
  };
  return names[type] || type;
}

/**
 * Layer type to icon
 */
export function getLayerIcon(type: LayerType): string {
  const icons: Record<LayerType, string> = {
    dom: '🌳',
    vision: '👁️',
    mouse: '🖱️',
    network: '🌐'
  };
  return icons[type] || '📦';
}

/**
 * Check if layer type is required
 */
export function isRequiredLayer(type: LayerType): boolean {
  return type === 'dom';
}
```

---

## Usage Examples

### Create and Initialize Layers
```typescript
import { createLayers, initializeLayers, startLayers } from './layers';

// Create layer instances
const layers = createLayers({
  vision: { performOCR: true },
  mouse: { detectPatterns: true }
});

// Initialize all layers
const results = await initializeLayers(layers, ['dom', 'vision', 'mouse']);

// Check for failures
const failed = results.filter(r => !r.success);
if (failed.length > 0) {
  console.warn('Some layers failed to initialize:', failed);
}

// Start capturing
startLayers(layers, ['dom', 'vision', 'mouse']);
```

### Capture Action Data
```typescript
import { captureAllLayers } from './layers';

element.addEventListener('click', async (event) => {
  const data = await captureAllLayers(layers, event, event.target as Element);
  
  // Add to buffer
  layers.buffer.add({
    eventType: 'click',
    domData: data.dom,
    visionData: data.vision,
    mouseData: data.mouse,
    networkData: data.network
  });
});
```

### Get Layer Statuses
```typescript
import { getLayerStatuses, hasLayerErrors } from './layers';

const statuses = getLayerStatuses(layers);
console.log('Layer statuses:', statuses);

if (hasLayerErrors(layers)) {
  console.warn('Some layers have errors');
}
```

### Cleanup
```typescript
import { destroyLayers } from './layers';

// On recording stop or page unload
destroyLayers(layers);
```

---

## Layer Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                        Layer Lifecycle                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  createLayers() ──► initializeLayers() ──► startLayers()        │
│        │                   │                    │                │
│        ▼                   ▼                    ▼                │
│  ┌──────────┐       ┌───────────┐        ┌──────────┐           │
│  │ Created  │ ────► │  Ready    │ ─────► │ Running  │           │
│  └──────────┘       └───────────┘        └──────────┘           │
│                                               │  │               │
│                                    pauseLayers│  │resumeLayers   │
│                                               ▼  │               │
│                                          ┌──────────┐            │
│                                          │ Paused   │            │
│                                          └──────────┘            │
│                                               │                  │
│                                     stopLayers│                  │
│                                               ▼                  │
│                                          ┌──────────┐            │
│                                          │ Stopped  │            │
│                                          └──────────┘            │
│                                               │                  │
│                                   destroyLayers                  │
│                                               ▼                  │
│                                          ┌──────────┐            │
│                                          │Destroyed │            │
│                                          └──────────┘            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Acceptance Criteria

- [ ] All capture layers exported
- [ ] All layer types exported
- [ ] CaptureLayer interface defined
- [ ] createLayers() creates all instances
- [ ] initializeLayers() initializes in parallel
- [ ] startLayers/stopLayers work correctly
- [ ] pauseLayers/resumeLayers work correctly
- [ ] getLayerStatuses() returns all statuses
- [ ] destroyLayers() cleans up properly
- [ ] captureAllLayers() captures from all
- [ ] Utility functions exported
- [ ] No circular dependencies
- [ ] TypeScript compiles with strict mode, 0 errors

---

## Edge Cases

1. **Layer init fails**: Continue with others
2. **Vision takes long to init**: Don't block
3. **Destroy called twice**: Handle gracefully
4. **Capture on destroyed layer**: Return null
5. **Unknown layer type**: Return null
6. **All layers disabled**: Still works
7. **Concurrent captures**: Handle properly
8. **Memory pressure**: Buffer limits apply
9. **Page navigation**: Destroy triggered
10. **Extension reload**: Clean shutdown

---

## Estimated Lines

250-300 lines
