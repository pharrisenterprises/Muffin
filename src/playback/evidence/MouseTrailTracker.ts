// =============================================================================
// BATCH 10: Mouse Trail Tracker
// Purpose: Track mouse movements during recording for spatial evidence
// =============================================================================

import type { MouseTrailPoint, EvidenceConfig } from './types';

const DEFAULT_CONFIG: Partial<EvidenceConfig> = {
  mouseTrailMaxPoints: 200,
  mouseTrailThrottleMs: 50
};

/**
 * Tracks mouse movements during recording.
 * Used during playback to verify element location based on how user approached it.
 */
export class MouseTrailTracker {
  private trail: MouseTrailPoint[] = [];
  private isTracking: boolean = false;
  private config: Partial<EvidenceConfig>;
  private scrollOffset: { x: number; y: number } = { x: 0, y: 0 };
  private lastTimestamp: number = 0;
  
  constructor(config: Partial<EvidenceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleScroll = this.handleScroll.bind(this);
  }
  
  // ===========================================================================
  // PUBLIC API
  // ===========================================================================
  
  /**
   * Start tracking mouse movements
   * Call when recording starts
   */
  startTracking(): void {
    if (this.isTracking) return;
    
    this.isTracking = true;
    this.trail = [];
    this.scrollOffset = { x: window.scrollX, y: window.scrollY };
    
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('scroll', this.handleScroll, true);
  }
  
  /**
   * Stop tracking mouse movements
   * Call when recording stops
   */
  stopTracking(): void {
    this.isTracking = false;
    
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('scroll', this.handleScroll, true);
  }
  
  /**
   * Get snapshot of current mouse trail
   * Call when capturing a step
   */
  getTrailSnapshot(): MouseTrailPoint[] {
    return [...this.trail];
  }
  
  /**
   * Get recent trail (last N points)
   */
  getRecentTrail(count: number = 50): MouseTrailPoint[] {
    return this.trail.slice(-count);
  }
  
  /**
   * Analyze if mouse trajectory led toward an element
   * Returns 0-1 score indicating how directly mouse approached element
   */
  analyzeTrajectoryToElement(
    elementBounds: { x: number; y: number; width: number; height: number },
    trail: MouseTrailPoint[]
  ): number {
    if (trail.length < 5) return 0.5; // Not enough data
    
    const elementCenter = {
      x: elementBounds.x + elementBounds.width / 2,
      y: elementBounds.y + elementBounds.height / 2
    };
    
    // Get last 20 points (1 second at 50ms throttle)
    const recentTrail = trail.slice(-20);
    
    // Check if distances to element decreased over time (approaching)
    let approachingCount = 0;
    let totalComparisons = 0;
    
    for (let i = 1; i < recentTrail.length; i++) {
      const prevDist = this.distance(recentTrail[i - 1], elementCenter);
      const currDist = this.distance(recentTrail[i], elementCenter);
      
      if (currDist < prevDist) {
        approachingCount++;
      }
      totalComparisons++;
    }
    
    // Calculate approach ratio
    const approachRatio = totalComparisons > 0 
      ? approachingCount / totalComparisons 
      : 0.5;
    
    // Check if final position is near element
    const lastPoint = recentTrail[recentTrail.length - 1];
    const finalDistance = this.distance(lastPoint, elementCenter);
    const maxExpectedDistance = Math.max(elementBounds.width, elementBounds.height) * 2;
    const proximityScore = Math.max(0, 1 - (finalDistance / maxExpectedDistance));
    
    // Combine approach + proximity
    return approachRatio * 0.6 + proximityScore * 0.4;
  }
  
  /**
   * Check if mouse hovered/dwelled over an element
   * Dwell time indicates intentional targeting
   */
  analyzeDwellTime(
    elementBounds: { x: number; y: number; width: number; height: number },
    trail: MouseTrailPoint[]
  ): { dwellMs: number; dwellScore: number } {
    let dwellMs = 0;
    let inBounds = false;
    let entryTimestamp = 0;
    
    for (const point of trail) {
      const isInside = this.pointInBounds(point, elementBounds);
      
      if (isInside && !inBounds) {
        // Entered bounds
        inBounds = true;
        entryTimestamp = point.timestamp;
      } else if (!isInside && inBounds) {
        // Left bounds
        dwellMs += point.timestamp - entryTimestamp;
        inBounds = false;
      }
    }
    
    // If still in bounds at end
    if (inBounds && trail.length > 0) {
      dwellMs += trail[trail.length - 1].timestamp - entryTimestamp;
    }
    
    // Score: 100ms = 0.5, 300ms = 0.8, 500ms+ = 1.0
    const dwellScore = Math.min(1, dwellMs / 500);
    
    return { dwellMs, dwellScore };
  }
  
  /**
   * Reset tracker state
   */
  reset(): void {
    this.trail = [];
    this.scrollOffset = { x: 0, y: 0 };
    this.lastTimestamp = 0;
  }
  
  /**
   * Get tracking state
   */
  getState(): { isTracking: boolean; pointCount: number } {
    return {
      isTracking: this.isTracking,
      pointCount: this.trail.length
    };
  }
  
  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================
  
  private handleMouseMove(e: MouseEvent): void {
    const now = Date.now();
    
    // Throttle to configured interval
    if (now - this.lastTimestamp < this.config.mouseTrailThrottleMs!) {
      return;
    }
    
    this.lastTimestamp = now;
    
    // Store absolute position (adjusted for scroll)
    this.trail.push({
      x: e.clientX + this.scrollOffset.x,
      y: e.clientY + this.scrollOffset.y,
      timestamp: now
    });
    
    // Keep only maxPoints
    if (this.trail.length > this.config.mouseTrailMaxPoints!) {
      this.trail.shift();
    }
  }
  
  private handleScroll(): void {
    this.scrollOffset = { x: window.scrollX, y: window.scrollY };
  }
  
  private distance(
    point: { x: number; y: number },
    target: { x: number; y: number }
  ): number {
    return Math.sqrt(
      Math.pow(point.x - target.x, 2) + 
      Math.pow(point.y - target.y, 2)
    );
  }
  
  private pointInBounds(
    point: { x: number; y: number },
    bounds: { x: number; y: number; width: number; height: number }
  ): boolean {
    return (
      point.x >= bounds.x &&
      point.x <= bounds.x + bounds.width &&
      point.y >= bounds.y &&
      point.y <= bounds.y + bounds.height
    );
  }
  
  // ===========================================================================
  // SCROLL COMPENSATION (Batch 11)
  // ===========================================================================
  
  /**
   * Get current scroll position
   * Call this when capturing a step to store scroll context
   */
  getScrollPosition(): { x: number; y: number } {
    return {
      x: window.scrollX,
      y: window.scrollY
    };
  }
  
  /**
   * Analyze trajectory with scroll compensation
   * Adjusts element position for scroll difference between recording and playback
   */
  analyzeTrajectoryWithScroll(
    elementBounds: { x: number; y: number; width: number; height: number },
    trail: MouseTrailPoint[],
    recordedScroll: { x: number; y: number },
    currentScroll: { x: number; y: number }
  ): number {
    if (trail.length < 5) return 0.5;
    
    // Calculate scroll delta
    const scrollDeltaX = currentScroll.x - recordedScroll.x;
    const scrollDeltaY = currentScroll.y - recordedScroll.y;
    
    // Adjust element position for scroll difference
    const adjustedBounds = {
      x: elementBounds.x - scrollDeltaX,
      y: elementBounds.y - scrollDeltaY,
      width: elementBounds.width,
      height: elementBounds.height
    };
    
    // Use existing trajectory analysis with adjusted bounds
    return this.analyzeTrajectoryToElement(adjustedBounds, trail);
  }
}

// Factory function
export function createMouseTrailTracker(
  config?: Partial<EvidenceConfig>
): MouseTrailTracker {
  return new MouseTrailTracker(config);
}
