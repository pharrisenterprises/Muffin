// ═══════════════════════════════════════════════════════════════════════════
// ELEMENT GRAPH CAPTURE - Capture Relationships During Recording
// ═══════════════════════════════════════════════════════════════════════════

import type {
  ElementGraph,
  ElementNode,
  ElementRelationship,
  BoundingBox
} from './self-healing-types';
import { GRAPH_FIND_CONFIG } from './self-healing-config';

export class ElementGraphCapture {
  private config = GRAPH_FIND_CONFIG;
  
  /**
   * Capture element graph during recording
   */
  capture(element: HTMLElement): ElementGraph {
    const targetNode = this.createNode(element, 'target');
    
    return {
      target: targetNode,
      parents: this.captureParents(element),
      siblings: this.captureSiblings(element),
      children: this.captureChildren(element),
      nearby: this.captureNearby(element),
      landmarks: this.captureLandmarks()
    };
  }
  
  /**
   * Capture minimal graph (faster)
   */
  captureMinimal(element: HTMLElement): ElementGraph {
    const targetNode = this.createNode(element, 'target');
    
    return {
      target: targetNode,
      parents: this.captureParents(element).slice(0, 3),
      siblings: this.captureSiblings(element).slice(0, 5),
      children: [],
      nearby: [],
      landmarks: this.captureLandmarks()
    };
  }
  
  // Private capture methods
  
  private captureParents(element: HTMLElement): ElementNode[] {
    const parents: ElementNode[] = [];
    let current = element.parentElement;
    let depth = 0;
    
    while (current && depth < this.config.MAX_PARENT_DEPTH) {
      if (current.nodeType !== Node.ELEMENT_NODE) {
        current = current.parentElement;
        continue;
      }
      
      parents.push(this.createNode(current, depth === 0 ? 'parent' : 'ancestor'));
      current = current.parentElement;
      depth++;
    }
    
    return parents;
  }
  
  private captureSiblings(element: HTMLElement): ElementNode[] {
    const siblings: ElementNode[] = [];
    const parent = element.parentElement;
    if (!parent) return siblings;
    
    let count = 0;
    for (let i = 0; i < parent.children.length && count < this.config.MAX_SIBLINGS; i++) {
      const sibling = parent.children[i] as HTMLElement;
      if (sibling === element || !this.isVisible(sibling)) continue;
      siblings.push(this.createNode(sibling, 'sibling'));
      count++;
    }
    
    return siblings;
  }
  
  private captureChildren(element: HTMLElement): ElementNode[] {
    const children: ElementNode[] = [];
    
    for (let i = 0; i < element.children.length && i < 10; i++) {
      const child = element.children[i] as HTMLElement;
      if (!this.isVisible(child)) continue;
      children.push(this.createNode(child, 'child'));
    }
    
    return children;
  }
  
  private captureNearby(element: HTMLElement): ElementNode[] {
    const targetBounds = this.getBounds(element);
    const targetCenter = {
      x: targetBounds.x + targetBounds.width / 2,
      y: targetBounds.y + targetBounds.height / 2
    };
    
    const candidates = document.querySelectorAll(
      'button, a, input, select, textarea, [role="button"], label'
    );
    
    const withDistance: Array<{ node: ElementNode; distance: number }> = [];
    
    candidates.forEach(el => {
      const htmlEl = el as HTMLElement;
      if (htmlEl === element || !this.isVisible(htmlEl)) return;
      
      const bounds = this.getBounds(htmlEl);
      const center = {
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2
      };
      
      const distance = Math.sqrt(
        Math.pow(center.x - targetCenter.x, 2) +
        Math.pow(center.y - targetCenter.y, 2)
      );
      
      if (distance <= this.config.NEARBY_DISTANCE) {
        const node = this.createNode(htmlEl, 'nearby');
        node.distanceFromTarget = distance;
        withDistance.push({ node, distance });
      }
    });
    
    withDistance.sort((a, b) => a.distance - b.distance);
    return withDistance.slice(0, this.config.MAX_NEARBY).map(w => w.node);
  }
  
  private captureLandmarks(): ElementNode[] {
    const landmarks: ElementNode[] = [];
    
    for (const selector of this.config.LANDMARK_SELECTORS) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element && this.isVisible(element)) {
        landmarks.push(this.createNode(element, 'landmark'));
      }
    }
    
    return landmarks;
  }
  
  // Helper methods
  
  private createNode(element: HTMLElement, relationship: ElementRelationship): ElementNode {
    return {
      nodeId: this.generateNodeId(),
      relationship,
      tagName: element.tagName.toLowerCase(),
      text: this.getElementText(element).substring(0, 100),
      attributes: {
        id: element.id || undefined,
        className: element.className || undefined,
        name: element.getAttribute('name') || undefined,
        ariaLabel: element.getAttribute('aria-label') || undefined,
        role: element.getAttribute('role') || undefined,
        dataTestId: element.dataset.testid || undefined
      },
      bounds: this.getBounds(element),
      selector: this.generateSelector(element),
      isStable: this.isStableElement(element)
    };
  }
  
  private generateNodeId(): string {
    return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private getElementText(element: HTMLElement): string {
    return element.innerText?.trim() ||
           element.textContent?.trim() ||
           element.getAttribute('aria-label') ||
           '';
  }
  
  private getBounds(element: HTMLElement): BoundingBox {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
      width: rect.width,
      height: rect.height
    };
  }
  
  private isVisible(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      parseFloat(style.opacity) > 0 &&
      rect.width > 0 &&
      rect.height > 0
    );
  }
  
  private isStableElement(element: HTMLElement): boolean {
    if (element.id && !element.id.match(/^\d+$/) && !element.id.match(/^react-/)) {
      return true;
    }
    
    if (element.dataset.testid) return true;
    
    const stableTags = this.config.STABLE_INDICATORS.tags;
    if (stableTags.includes(element.tagName.toLowerCase())) return true;
    
    const role = element.getAttribute('role');
    if (role && this.config.STABLE_INDICATORS.roles.includes(role)) return true;
    
    return false;
  }
  
  private generateSelector(element: HTMLElement): string {
    if (element.id) return `#${element.id}`;
    if (element.dataset.testid) return `[data-testid="${element.dataset.testid}"]`;
    
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(' ').filter(c => c.length > 0);
      if (classes.length > 0) {
        const selector = '.' + classes.join('.');
        if (document.querySelectorAll(selector).length === 1) {
          return selector;
        }
      }
    }
    
    let index = 1;
    let sibling = element.previousElementSibling;
    while (sibling) {
      if (sibling.tagName === element.tagName) index++;
      sibling = sibling.previousElementSibling;
    }
    
    return `${element.tagName.toLowerCase()}:nth-of-type(${index})`;
  }
}

export function createElementGraphCapture(): ElementGraphCapture {
  return new ElementGraphCapture();
}
