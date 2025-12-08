/**
 * @fileoverview Mouse Capture Layer
 * @description Tracks mouse movement patterns during recording.
 * Layer 3 of 4 in recording capture system.
 * 
 * @module contentScript/layers/MouseCapture
 * @version 1.0.0
 * @since Phase 4
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface MouseCaptureConfig {
  sampleRate: number;
  maxTrailLength: number;
  trailTTL: number;
  enabled: boolean;
}

const DEFAULT_CONFIG: MouseCaptureConfig = {
  sampleRate: 50,
  maxTrailLength: 100,
  trailTTL: 5000,
  enabled: true
};

export interface MousePoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface MouseCaptureResult {
  trail: MousePoint[];
  endpoint: { x: number; y: number };
  duration: number;
  direction?: { dx: number; dy: number };
}

// ============================================================================
// MOUSE CAPTURE CLASS
// ============================================================================

export class MouseCapture {
  private config: MouseCaptureConfig;
  private trail: MousePoint[] = [];
  private lastSampleTime = 0;
  private isTracking = false;
  private boundMouseMove: ((e: MouseEvent) => void) | null = null;

  constructor(config?: Partial<MouseCaptureConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ==========================================================================
  // TRACKING CONTROL
  // ==========================================================================

  startTracking(): void {
    if (this.isTracking || !this.config.enabled) return;

    this.trail = [];
    this.lastSampleTime = 0;
    this.isTracking = true;

    this.boundMouseMove = this.handleMouseMove.bind(this);
    document.addEventListener('mousemove', this.boundMouseMove, { passive: true });

    console.log('[MouseCapture] Tracking started');
  }

  stopTracking(): void {
    if (!this.isTracking) return;

    if (this.boundMouseMove) {
      document.removeEventListener('mousemove', this.boundMouseMove);
      this.boundMouseMove = null;
    }

    this.isTracking = false;
    console.log('[MouseCapture] Tracking stopped');
  }

  reset(): void {
    this.trail = [];
    this.lastSampleTime = 0;
  }

  // ==========================================================================
  // CAPTURE
  // ==========================================================================

  getTrail(): MouseCaptureResult {
    const now = Date.now();

    // Filter out stale points
    const freshTrail = this.trail.filter(
      p => now - p.timestamp < this.config.trailTTL
    );

    // Get endpoint (last point or 0,0)
    const endpoint = freshTrail.length > 0
      ? { x: freshTrail[freshTrail.length - 1].x, y: freshTrail[freshTrail.length - 1].y }
      : { x: 0, y: 0 };

    // Calculate duration
    const duration = freshTrail.length >= 2
      ? freshTrail[freshTrail.length - 1].timestamp - freshTrail[0].timestamp
      : 0;

    // Calculate direction from last few points
    const direction = this.calculateDirection(freshTrail);

    return {
      trail: freshTrail,
      endpoint,
      duration,
      direction
    };
  }

  // ==========================================================================
  // EVENT HANDLING
  // ==========================================================================

  private handleMouseMove(event: MouseEvent): void {
    const now = Date.now();

    // Rate limiting
    if (now - this.lastSampleTime < this.config.sampleRate) return;

    this.lastSampleTime = now;

    // Add point
    this.trail.push({
      x: event.clientX,
      y: event.clientY,
      timestamp: now
    });

    // Trim if too long
    while (this.trail.length > this.config.maxTrailLength) {
      this.trail.shift();
    }

    // Remove stale points
    const cutoff = now - this.config.trailTTL;
    while (this.trail.length > 0 && this.trail[0].timestamp < cutoff) {
      this.trail.shift();
    }
  }

  // ==========================================================================
  // CALCULATIONS
  // ==========================================================================

  private calculateDirection(trail: MousePoint[]): { dx: number; dy: number } | undefined {
    if (trail.length < 3) return undefined;

    // Use last 5 points for direction
    const recentPoints = trail.slice(-5);
    
    if (recentPoints.length < 2) return undefined;

    const first = recentPoints[0];
    const last = recentPoints[recentPoints.length - 1];

    const dx = last.x - first.x;
    const dy = last.y - first.y;

    // Normalize
    const magnitude = Math.sqrt(dx * dx + dy * dy);
    if (magnitude === 0) return undefined;

    return {
      dx: dx / magnitude,
      dy: dy / magnitude
    };
  }

  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================

  updateConfig(config: Partial<MouseCaptureConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): MouseCaptureConfig {
    return { ...this.config };
  }

  isActive(): boolean {
    return this.isTracking;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let instance: MouseCapture | null = null;

export function getMouseCapture(config?: Partial<MouseCaptureConfig>): MouseCapture {
  if (!instance) {
    instance = new MouseCapture(config);
  }
  return instance;
}
