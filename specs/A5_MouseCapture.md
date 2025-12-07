# MouseCapture Content Specification

**File ID:** A5  
**File Path:** `src/contentScript/layers/MouseCapture.ts`  
**Status:** CREATE  
**Priority:** P0

---

## Purpose

Mouse trail capture layer that tracks mouse movement patterns leading up to user actions. Records a rolling buffer of mouse positions with timestamps, enabling the "Evidence Scoring" strategy to verify element identity based on user intent trajectory. When the DOM changes between recording and playback, the mouse trail provides additional evidence about which element the user intended to interact with, even if selectors no longer match.

---

## Dependencies

### Uses (imports from)
- `../../types/strategy`: MouseTrailData (if defined)

### Used By (exports to)
- `../RecordingOrchestrator`: Retrieves mouse trail during action capture
- `../EvidenceBuffer`: Stores trail data for evidence scoring
- `../../lib/mouseTrailAnalyzer`: Analyzes trails during playback

---

## Interfaces

```typescript
/**
 * Configuration for MouseCapture layer
 */
interface MouseCaptureConfig {
  /** Enable mouse capture (default: true) */
  enabled: boolean;
  /** Sample rate in ms - capture position every N ms (default: 50) */
  sampleRateMs: number;
  /** Maximum trail length in points (default: 100) */
  maxTrailLength: number;
  /** Trail retention time in ms (default: 5000) */
  retentionTimeMs: number;
  /** Minimum movement threshold in pixels to record (default: 3) */
  movementThreshold: number;
  /** Whether to capture during scroll (default: true) */
  captureOnScroll: boolean;
  /** Whether to capture hover patterns (default: false) */
  captureHover: boolean;
}

/**
 * Single point in mouse trail
 */
interface MousePoint {
  /** X coordinate relative to viewport */
  x: number;
  /** Y coordinate relative to viewport */
  y: number;
  /** Timestamp when position recorded */
  timestamp: number;
  /** Optional velocity (pixels per second) */
  velocity?: number;
  /** Optional acceleration */
  acceleration?: number;
  /** Whether mouse button was pressed */
  isPressed?: boolean;
}

/**
 * Complete mouse trail result
 */
interface MouseCaptureResult {
  /** Array of mouse positions leading to action */
  trail: MousePoint[];
  /** Final click/action position */
  endpoint: {
    x: number;
    y: number;
  };
  /** Total trail duration in ms */
  duration: number;
  /** Total distance traveled in pixels */
  totalDistance: number;
  /** Average velocity in pixels/second */
  averageVelocity: number;
  /** Trail pattern classification */
  pattern: TrailPattern;
  /** Hesitation points (where mouse paused) */
  hesitationPoints: MousePoint[];
  /** Direction changes (potential targets considered) */
  directionChanges: number;
}

/**
 * Trail pattern classifications
 */
type TrailPattern = 
  | 'direct'      // Straight path to target
  | 'curved'      // Smooth curve to target
  | 'searching'   // Exploratory movement before settling
  | 'hesitant'    // Multiple pauses before action
  | 'corrective'  // Overshoot and correction
  | 'unknown';    // Unclassified pattern

/**
 * Hesitation detection result
 */
interface HesitationInfo {
  /** Point where hesitation occurred */
  point: MousePoint;
  /** Duration of hesitation in ms */
  duration: number;
  /** Element under cursor during hesitation (if detectable) */
  elementUnder?: string;
}

/**
 * Layer status
 */
type MouseCaptureStatus = 'idle' | 'ready' | 'capturing' | 'error' | 'disabled';
```

---

## Functions

```typescript
/**
 * MouseCapture - Mouse trail tracking layer
 */
class MouseCapture {
  private config: MouseCaptureConfig;
  private status: MouseCaptureStatus;
  private trail: MousePoint[];
  private lastPoint: MousePoint | null;
  private lastSampleTime: number;
  private boundHandlers: Map<string, EventListener>;
  private cleanupInterval: number | null;

  /**
   * Create new MouseCapture instance
   * @param config - Capture configuration
   */
  constructor(config?: Partial<MouseCaptureConfig>);

  /**
   * Start capturing mouse movements
   */
  start(): void;

  /**
   * Stop capturing mouse movements
   */
  stop(): void;

  /**
   * Get current layer status
   * @returns Layer status
   */
  getStatus(): MouseCaptureStatus;

  /**
   * Get current trail and clear buffer
   * Called when action is captured
   * @returns Mouse capture result
   */
  getTrail(): MouseCaptureResult;

  /**
   * Peek at current trail without clearing
   * @returns Current trail data
   */
  peekTrail(): MouseCaptureResult;

  /**
   * Get trail points within time window
   * @param windowMs - Time window in ms from now
   * @returns Trail points within window
   */
  getTrailWindow(windowMs: number): MousePoint[];

  /**
   * Clear the trail buffer
   */
  clearTrail(): void;

  /**
   * Add a manual point to the trail
   * Used for synthetic events or corrections
   * @param point - Point to add
   */
  addPoint(point: MousePoint): void;

  /**
   * Get the last recorded position
   * @returns Last mouse point or null
   */
  getLastPosition(): MousePoint | null;

  /**
   * Analyze trail pattern
   * @param trail - Trail to analyze
   * @returns Pattern classification
   */
  analyzePattern(trail: MousePoint[]): TrailPattern;

  /**
   * Find hesitation points in trail
   * @param trail - Trail to analyze
   * @param thresholdMs - Minimum hesitation duration (default: 200)
   * @returns Array of hesitation info
   */
  findHesitations(trail: MousePoint[], thresholdMs?: number): HesitationInfo[];

  /**
   * Calculate trail metrics
   * @param trail - Trail to measure
   * @returns Trail metrics
   */
  calculateMetrics(trail: MousePoint[]): {
    totalDistance: number;
    averageVelocity: number;
    directionChanges: number;
    duration: number;
  };

  // Private event handlers
  private handleMouseMove(event: MouseEvent): void;
  private handleMouseDown(event: MouseEvent): void;
  private handleMouseUp(event: MouseEvent): void;
  private handleScroll(event: Event): void;

  // Private helper methods
  private shouldSample(event: MouseEvent): boolean;
  private calculateVelocity(current: MousePoint, previous: MousePoint): number;
  private calculateAcceleration(current: MousePoint, previous: MousePoint): number;
  private pruneOldPoints(): void;
  private distanceBetween(p1: MousePoint, p2: MousePoint): number;
  private angleBetween(p1: MousePoint, p2: MousePoint, p3: MousePoint): number;
}

export { MouseCapture, MouseCaptureConfig, MouseCaptureResult, MousePoint, TrailPattern, HesitationInfo };
```

---

## Key Implementation Details

### Event Listener Setup
```typescript
start(): void {
  if (this.status !== 'idle') {
    console.warn('[MouseCapture] Already started');
    return;
  }

  if (!this.config.enabled) {
    this.status = 'disabled';
    return;
  }

  // Create bound handlers
  this.boundHandlers.set('mousemove', this.handleMouseMove.bind(this));
  this.boundHandlers.set('mousedown', this.handleMouseDown.bind(this));
  this.boundHandlers.set('mouseup', this.handleMouseUp.bind(this));

  // Attach listeners
  document.addEventListener('mousemove', this.boundHandlers.get('mousemove')!, { passive: true });
  document.addEventListener('mousedown', this.boundHandlers.get('mousedown')!, { passive: true });
  document.addEventListener('mouseup', this.boundHandlers.get('mouseup')!, { passive: true });

  if (this.config.captureOnScroll) {
    this.boundHandlers.set('scroll', this.handleScroll.bind(this));
    document.addEventListener('scroll', this.boundHandlers.get('scroll')!, { passive: true, capture: true });
  }

  // Start cleanup interval to prune old points
  this.cleanupInterval = window.setInterval(() => {
    this.pruneOldPoints();
  }, this.config.retentionTimeMs / 2);

  this.status = 'ready';
  console.log('[MouseCapture] Started');
}

stop(): void {
  // Remove all event listeners
  for (const [event, handler] of this.boundHandlers) {
    document.removeEventListener(event, handler);
  }
  this.boundHandlers.clear();

  // Clear cleanup interval
  if (this.cleanupInterval !== null) {
    clearInterval(this.cleanupInterval);
    this.cleanupInterval = null;
  }

  // Clear trail
  this.trail = [];
  this.lastPoint = null;

  this.status = 'idle';
  console.log('[MouseCapture] Stopped');
}
```

### Mouse Move Handler with Sampling
```typescript
private handleMouseMove(event: MouseEvent): void {
  if (!this.shouldSample(event)) {
    return;
  }

  const now = Date.now();
  const point: MousePoint = {
    x: event.clientX,
    y: event.clientY,
    timestamp: now,
    isPressed: event.buttons > 0
  };

  // Calculate velocity and acceleration if we have previous point
  if (this.lastPoint) {
    point.velocity = this.calculateVelocity(point, this.lastPoint);
    
    if (this.trail.length >= 2) {
      const prevPrevPoint = this.trail[this.trail.length - 2];
      point.acceleration = this.calculateAcceleration(point, this.lastPoint);
    }
  }

  // Add to trail
  this.trail.push(point);
  this.lastPoint = point;
  this.lastSampleTime = now;

  // Enforce max trail length
  if (this.trail.length > this.config.maxTrailLength) {
    this.trail.shift();
  }
}

private shouldSample(event: MouseEvent): boolean {
  const now = Date.now();

  // Check sample rate
  if (now - this.lastSampleTime < this.config.sampleRateMs) {
    return false;
  }

  // Check movement threshold
  if (this.lastPoint) {
    const distance = Math.sqrt(
      Math.pow(event.clientX - this.lastPoint.x, 2) +
      Math.pow(event.clientY - this.lastPoint.y, 2)
    );
    if (distance < this.config.movementThreshold) {
      return false;
    }
  }

  return true;
}
```

### Get Trail with Metrics
```typescript
getTrail(): MouseCaptureResult {
  const trail = [...this.trail];
  const endpoint = this.lastPoint 
    ? { x: this.lastPoint.x, y: this.lastPoint.y }
    : { x: 0, y: 0 };

  const metrics = this.calculateMetrics(trail);
  const pattern = this.analyzePattern(trail);
  const hesitationPoints = this.findHesitations(trail).map(h => h.point);

  const result: MouseCaptureResult = {
    trail,
    endpoint,
    duration: metrics.duration,
    totalDistance: metrics.totalDistance,
    averageVelocity: metrics.averageVelocity,
    pattern,
    hesitationPoints,
    directionChanges: metrics.directionChanges
  };

  // Clear trail after retrieval
  this.trail = [];

  return result;
}

calculateMetrics(trail: MousePoint[]): {
  totalDistance: number;
  averageVelocity: number;
  directionChanges: number;
  duration: number;
} {
  if (trail.length < 2) {
    return { totalDistance: 0, averageVelocity: 0, directionChanges: 0, duration: 0 };
  }

  let totalDistance = 0;
  let directionChanges = 0;
  let prevAngle: number | null = null;

  for (let i = 1; i < trail.length; i++) {
    // Calculate distance
    totalDistance += this.distanceBetween(trail[i - 1], trail[i]);

    // Calculate direction changes
    if (i >= 2) {
      const angle = this.angleBetween(trail[i - 2], trail[i - 1], trail[i]);
      // Significant direction change is > 45 degrees
      if (Math.abs(angle) > Math.PI / 4) {
        directionChanges++;
      }
    }
  }

  const duration = trail[trail.length - 1].timestamp - trail[0].timestamp;
  const averageVelocity = duration > 0 ? (totalDistance / duration) * 1000 : 0;

  return { totalDistance, averageVelocity, directionChanges, duration };
}
```

### Pattern Analysis
```typescript
analyzePattern(trail: MousePoint[]): TrailPattern {
  if (trail.length < 3) {
    return 'unknown';
  }

  const metrics = this.calculateMetrics(trail);
  const hesitations = this.findHesitations(trail);

  // Direct: Few direction changes, high velocity, no hesitations
  if (metrics.directionChanges <= 2 && hesitations.length === 0 && metrics.averageVelocity > 500) {
    return 'direct';
  }

  // Hesitant: Multiple hesitation points
  if (hesitations.length >= 2) {
    return 'hesitant';
  }

  // Searching: Many direction changes, lower velocity
  if (metrics.directionChanges >= 5 && metrics.averageVelocity < 300) {
    return 'searching';
  }

  // Corrective: Overshoot detection (movement past target then back)
  const endpoint = trail[trail.length - 1];
  const maxDistanceFromEnd = Math.max(...trail.map(p => this.distanceBetween(p, endpoint)));
  const directDistance = this.distanceBetween(trail[0], endpoint);
  if (maxDistanceFromEnd > directDistance * 1.3) {
    return 'corrective';
  }

  // Curved: Smooth arc to target
  if (metrics.directionChanges <= 4 && metrics.directionChanges > 1) {
    return 'curved';
  }

  return 'unknown';
}
```

### Hesitation Detection
```typescript
findHesitations(trail: MousePoint[], thresholdMs: number = 200): HesitationInfo[] {
  const hesitations: HesitationInfo[] = [];

  if (trail.length < 2) {
    return hesitations;
  }

  let hesitationStart: MousePoint | null = null;
  let hesitationDuration = 0;

  for (let i = 1; i < trail.length; i++) {
    const timeDelta = trail[i].timestamp - trail[i - 1].timestamp;
    const distance = this.distanceBetween(trail[i], trail[i - 1]);
    
    // Low movement = potential hesitation
    const isLowMovement = distance < this.config.movementThreshold * 2;

    if (isLowMovement) {
      if (!hesitationStart) {
        hesitationStart = trail[i - 1];
        hesitationDuration = timeDelta;
      } else {
        hesitationDuration += timeDelta;
      }
    } else {
      // End of hesitation
      if (hesitationStart && hesitationDuration >= thresholdMs) {
        hesitations.push({
          point: hesitationStart,
          duration: hesitationDuration,
          elementUnder: this.getElementAtPoint(hesitationStart.x, hesitationStart.y)
        });
      }
      hesitationStart = null;
      hesitationDuration = 0;
    }
  }

  // Check final hesitation
  if (hesitationStart && hesitationDuration >= thresholdMs) {
    hesitations.push({
      point: hesitationStart,
      duration: hesitationDuration,
      elementUnder: this.getElementAtPoint(hesitationStart.x, hesitationStart.y)
    });
  }

  return hesitations;
}

private getElementAtPoint(x: number, y: number): string | undefined {
  const element = document.elementFromPoint(x, y);
  if (element) {
    // Return a simple identifier
    if (element.id) return `#${element.id}`;
    if (element.className) return `.${element.className.split(' ')[0]}`;
    return element.tagName.toLowerCase();
  }
  return undefined;
}
```

### Utility Methods
```typescript
private distanceBetween(p1: MousePoint, p2: MousePoint): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

private angleBetween(p1: MousePoint, p2: MousePoint, p3: MousePoint): number {
  // Calculate angle at p2 between p1-p2 and p2-p3
  const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

  const dot = v1.x * v2.x + v1.y * v2.y;
  const cross = v1.x * v2.y - v1.y * v2.x;

  return Math.atan2(cross, dot);
}

private calculateVelocity(current: MousePoint, previous: MousePoint): number {
  const distance = this.distanceBetween(current, previous);
  const timeDelta = current.timestamp - previous.timestamp;
  return timeDelta > 0 ? (distance / timeDelta) * 1000 : 0; // pixels per second
}

private calculateAcceleration(current: MousePoint, previous: MousePoint): number {
  if (!current.velocity || !previous.velocity) return 0;
  const timeDelta = current.timestamp - previous.timestamp;
  return timeDelta > 0 ? ((current.velocity - previous.velocity) / timeDelta) * 1000 : 0;
}

private pruneOldPoints(): void {
  const cutoff = Date.now() - this.config.retentionTimeMs;
  this.trail = this.trail.filter(p => p.timestamp > cutoff);
}
```

---

## Integration Points

### With RecordingOrchestrator
```typescript
// In RecordingOrchestrator
class RecordingOrchestrator {
  private mouseCapture: MouseCapture | null;

  async start(): Promise<void> {
    if (this.config.enableMouse) {
      this.mouseCapture = new MouseCapture({
        enabled: true,
        sampleRateMs: 50,
        maxTrailLength: 100,
        retentionTimeMs: 5000
      });
      this.mouseCapture.start();
    }
  }

  async captureAction(event: Event, element: HTMLElement): Promise<CapturedAction> {
    const mouseData = this.mouseCapture?.getTrail();
    
    // Include in captured action
    const action: CapturedAction = {
      // ...other data
      mouseData
    };
  }
}
```

### With mouseTrailAnalyzer (Playback)
```typescript
// In mouseTrailAnalyzer.ts
import { MouseCaptureResult, MousePoint } from '../contentScript/layers/MouseCapture';

export function findTargetFromTrail(
  trail: MouseCaptureResult,
  candidates: HTMLElement[]
): HTMLElement | null {
  // Use endpoint and hesitation points to identify intended target
  const endpoint = trail.endpoint;
  
  // Find element closest to endpoint
  let closest: HTMLElement | null = null;
  let minDistance = Infinity;
  
  for (const candidate of candidates) {
    const rect = candidate.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distance = Math.sqrt(
      Math.pow(endpoint.x - centerX, 2) + 
      Math.pow(endpoint.y - centerY, 2)
    );
    
    if (distance < minDistance) {
      minDistance = distance;
      closest = candidate;
    }
  }
  
  return closest;
}
```

---

## Acceptance Criteria

- [ ] Captures mouse movement at configured sample rate
- [ ] Respects movement threshold (ignores micro-movements)
- [ ] Maintains rolling buffer of max trail length
- [ ] Auto-prunes points older than retention time
- [ ] getTrail() returns complete metrics and clears buffer
- [ ] peekTrail() returns data without clearing
- [ ] Pattern analysis correctly classifies trail types
- [ ] Hesitation detection finds pauses >= threshold
- [ ] Velocity and acceleration calculated correctly
- [ ] Event listeners use passive mode (no scroll jank)
- [ ] Memory efficient (bounded buffer size)
- [ ] TypeScript compiles with strict mode, 0 errors
- [ ] Works during page scroll
- [ ] Clean start/stop lifecycle with no memory leaks

---

## Edge Cases

1. **No movement before click**: Return empty trail with endpoint only
2. **Very fast movement**: May miss samples, use velocity interpolation
3. **Page scroll during trail**: Coordinates are viewport-relative, may shift
4. **Touch devices**: May not have mouse events, handle gracefully
5. **Multiple monitors**: Coordinates may exceed viewport bounds
6. **Iframe boundaries**: Trail stops at iframe edge
7. **Mouse leaving window**: Last known position preserved
8. **Right-click context menu**: Track but don't clear on context menu
9. **Drag operations**: Continuous mouse-down movement
10. **Tab switching**: Trail should reset on tab blur

---

## Estimated Lines

280-350 lines
