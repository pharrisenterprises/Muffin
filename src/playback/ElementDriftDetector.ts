// ═══════════════════════════════════════════════════════════════════════════
// ELEMENT DRIFT DETECTOR - Detect Position and Size Changes
// ═══════════════════════════════════════════════════════════════════════════

import type {
  DriftDetectionResult,
  DriftType,
  DriftDirection,
  SizeChange,
  DriftCorrection,
  BoundingBox
} from './self-healing-types';
import type { RecordedStep } from '../recording/types';
import { DRIFT_THRESHOLDS } from './self-healing-config';

export class ElementDriftDetector {
  private thresholds = DRIFT_THRESHOLDS;
  
  /**
   * Detect drift between recorded and current state
   */
  detect(step: RecordedStep, currentElement?: HTMLElement): DriftDetectionResult {
    const originalBounds = (step as any).bundle?.bounding;
    
    if (!originalBounds) {
      return this.createNoDriftResult(originalBounds);
    }
    
    if (!currentElement) {
      return {
        driftDetected: true,
        driftType: 'disappeared',
        originalBounds,
        driftDistance: Infinity,
        stillInteractable: false,
        confidence: 0.9
      };
    }
    
    const currentBounds = this.getBounds(currentElement);
    
    if (currentBounds.width < this.thresholds.MIN_ELEMENT_SIZE ||
        currentBounds.height < this.thresholds.MIN_ELEMENT_SIZE) {
      return {
        driftDetected: true,
        driftType: 'disappeared',
        originalBounds,
        currentBounds,
        driftDistance: Infinity,
        stillInteractable: false,
        confidence: 0.7
      };
    }
    
    const driftDistance = this.calculateDistance(originalBounds, currentBounds);
    const sizeChange = this.calculateSizeChange(originalBounds, currentBounds);
    
    const hasPositionDrift = driftDistance > this.thresholds.POSITION_MAX;
    const hasSizeDrift = Math.abs(sizeChange.percentChange) > this.thresholds.SIZE_CHANGE_MAX;
    
    let driftType: DriftType = 'none';
    if (hasPositionDrift && hasSizeDrift) driftType = 'both';
    else if (hasPositionDrift) driftType = 'position';
    else if (hasSizeDrift) driftType = 'size';
    
    const stillInteractable = this.isInteractable(currentElement);
    
    let correction: DriftCorrection | undefined;
    if (driftType !== 'none' && stillInteractable) {
      correction = this.generateCorrection(step, currentElement, currentBounds, driftType);
    }
    
    return {
      driftDetected: driftType !== 'none',
      driftType,
      originalBounds,
      currentBounds,
      driftDistance,
      driftDirection: this.calculateDirection(originalBounds, currentBounds),
      sizeChange: hasSizeDrift ? sizeChange : undefined,
      stillInteractable,
      correction,
      confidence: this.calculateConfidence(driftDistance, sizeChange, stillInteractable)
    };
  }
  
  /**
   * Find element that may have drifted
   */
  findDriftedElement(step: RecordedStep): HTMLElement | null {
    const originalBounds = (step as any).bundle?.bounding;
    if (!originalBounds) return null;
    
    const candidates = this.findCandidates(step);
    
    const scored = candidates.map(element => {
      const bounds = this.getBounds(element);
      const distance = this.calculateDistance(originalBounds, bounds);
      const textMatch = this.textSimilarity(step.label, this.getElementText(element));
      
      return {
        element,
        distance,
        textMatch,
        score: this.calculateCandidateScore(distance, textMatch)
      };
    });
    
    scored.sort((a, b) => b.score - a.score);
    
    if (scored.length > 0 && scored[0].distance <= this.thresholds.SEARCH_RADIUS) {
      return scored[0].element;
    }
    
    return null;
  }
  
  /**
   * Check if element at expected position
   */
  isAtExpectedPosition(element: HTMLElement, expectedBounds: BoundingBox): boolean {
    const currentBounds = this.getBounds(element);
    const distance = this.calculateDistance(expectedBounds, currentBounds);
    return distance <= this.thresholds.POSITION_MAX;
  }
  
  // Private methods
  
  private getBounds(element: HTMLElement): BoundingBox {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
      width: rect.width,
      height: rect.height
    };
  }
  
  private calculateDistance(bounds1: BoundingBox, bounds2: BoundingBox): number {
    const center1 = { x: bounds1.x + bounds1.width / 2, y: bounds1.y + bounds1.height / 2 };
    const center2 = { x: bounds2.x + bounds2.width / 2, y: bounds2.y + bounds2.height / 2 };
    return Math.sqrt(Math.pow(center1.x - center2.x, 2) + Math.pow(center1.y - center2.y, 2));
  }
  
  private calculateSizeChange(original: BoundingBox, current: BoundingBox): SizeChange {
    const widthChange = current.width - original.width;
    const heightChange = current.height - original.height;
    const originalArea = original.width * original.height;
    const currentArea = current.width * current.height;
    const percentChange = ((currentArea - originalArea) / originalArea) * 100;
    
    return { widthChange, heightChange, percentChange };
  }
  
  private calculateDirection(original: BoundingBox, current: BoundingBox): DriftDirection {
    const deltaX = current.x - original.x;
    const deltaY = current.y - original.y;
    
    return {
      horizontal: deltaX > 10 ? 'right' : deltaX < -10 ? 'left' : 'none',
      vertical: deltaY > 10 ? 'down' : deltaY < -10 ? 'up' : 'none',
      deltaX,
      deltaY
    };
  }
  
  private isInteractable(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      parseFloat(style.opacity) > 0 &&
      !element.hasAttribute('disabled') &&
      style.pointerEvents !== 'none'
    );
  }
  
  private generateCorrection(
    step: RecordedStep,
    element: HTMLElement,
    currentBounds: BoundingBox,
    driftType: DriftType
  ): DriftCorrection {
    const selector = this.generateSelector(element);
    
    return {
      correctedBounds: currentBounds,
      correctedSelector: selector !== step.selector ? selector : undefined,
      method: selector !== step.selector ? 'both' : 'bounds-adjust',
      confidence: driftType === 'position' ? 0.8 : 0.6
    };
  }
  
  private findCandidates(step: RecordedStep): HTMLElement[] {
    const candidates: HTMLElement[] = [];
    const tags = this.getTagsForAction(step.event);
    
    for (const tag of tags) {
      const elements = document.getElementsByTagName(tag);
      for (let i = 0; i < elements.length; i++) {
        const el = elements[i] as HTMLElement;
        if (this.isInteractable(el)) {
          candidates.push(el);
        }
      }
    }
    
    return candidates;
  }
  
  private getTagsForAction(action: string): string[] {
    const tagMap: Record<string, string[]> = {
      'click': ['button', 'a', 'input', 'span', 'div'],
      'input': ['input', 'textarea'],
      'change': ['input', 'select', 'textarea'],
      'select': ['select', 'input']
    };
    return tagMap[action] || ['button', 'a', 'input', 'span', 'div'];
  }
  
  private getElementText(element: HTMLElement): string {
    return element.innerText?.trim() || 
           element.textContent?.trim() || 
           element.getAttribute('aria-label') ||
           element.getAttribute('placeholder') ||
           '';
  }
  
  private textSimilarity(str1: string, str2: string): number {
    if (!str1 || !str2) return 0;
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    if (s1 === s2) return 1;
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;
    
    const bigrams1 = new Set<string>();
    const bigrams2 = new Set<string>();
    
    for (let i = 0; i < s1.length - 1; i++) bigrams1.add(s1.substring(i, i + 2));
    for (let i = 0; i < s2.length - 1; i++) bigrams2.add(s2.substring(i, i + 2));
    
    let matches = 0;
    for (const bigram of bigrams1) {
      if (bigrams2.has(bigram)) matches++;
    }
    
    return (2 * matches) / (bigrams1.size + bigrams2.size);
  }
  
  private calculateCandidateScore(distance: number, textMatch: number): number {
    const distanceScore = Math.max(0, 1 - (distance / this.thresholds.SEARCH_RADIUS));
    return (distanceScore * 0.6) + (textMatch * 0.4);
  }
  
  private calculateConfidence(
    distance: number,
    sizeChange: SizeChange,
    stillInteractable: boolean
  ): number {
    let confidence = 0.9;
    
    if (distance > this.thresholds.POSITION_MAX) {
      confidence -= Math.min(0.3, (distance / 200) * 0.3);
    }
    
    if (Math.abs(sizeChange.percentChange) > this.thresholds.SIZE_CHANGE_MAX) {
      confidence -= 0.1;
    }
    
    if (!stillInteractable) {
      confidence -= 0.2;
    }
    
    return Math.max(0.3, confidence);
  }
  
  private generateSelector(element: HTMLElement): string {
    if (element.id) return `#${element.id}`;
    if (element.dataset.testid) return `[data-testid="${element.dataset.testid}"]`;
    
    const parts: string[] = [];
    let current: HTMLElement | null = element;
    
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let index = 1;
      let sibling = current.previousElementSibling;
      while (sibling) {
        if (sibling.tagName === current.tagName) index++;
        sibling = sibling.previousElementSibling;
      }
      parts.unshift(`${current.tagName.toLowerCase()}[${index}]`);
      current = current.parentElement;
    }
    
    return '/' + parts.join('/');
  }
  
  private createNoDriftResult(bounds?: BoundingBox): DriftDetectionResult {
    return {
      driftDetected: false,
      driftType: 'none',
      originalBounds: bounds || { x: 0, y: 0, width: 0, height: 0 },
      driftDistance: 0,
      stillInteractable: true,
      confidence: 1
    };
  }
}

export function createElementDriftDetector(): ElementDriftDetector {
  return new ElementDriftDetector();
}
