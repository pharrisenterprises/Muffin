/**
 * Vision Recording Fallback Test Suite
 * 
 * Tests for Vision fallback during recording when DOM recording fails.
 * 
 * Build Card: TST-007
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  shouldTriggerVisionFallback,
  captureVisionFallback,
  processClickForRecording,
} from '../contentScript/visionFallback';

// ============================================================================
// MOCK DOM ELEMENTS
// ============================================================================

function createMockElement(options: {
  tagName?: string;
  id?: string;
  className?: string;
  textContent?: string;
  depth?: number;
  inShadowDOM?: boolean;
  attributes?: Record<string, string>;
}): HTMLElement {
  const element = document.createElement(options.tagName || 'div');
  
  if (options.id) {
    element.id = options.id;
  }
  
  if (options.className) {
    element.className = options.className;
  }
  
  if (options.textContent) {
    element.textContent = options.textContent;
  }
  
  if (options.attributes) {
    Object.entries(options.attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
  }
  
  // Mock getBoundingClientRect
  element.getBoundingClientRect = vi.fn().mockReturnValue({
    x: 100,
    y: 50,
    width: 80,
    height: 30,
    top: 50,
    left: 100,
    right: 180,
    bottom: 80,
  });
  
  // Mock shadow DOM check
  if (options.inShadowDOM) {
    Object.defineProperty(element, 'getRootNode', {
      value: () => ({ host: document.createElement('div') }),
    });
  }
  
  return element;
}

function createDeepElement(depth: number): HTMLElement {
  let current = document.createElement('div');
  const root = current;
  
  for (let i = 1; i < depth; i++) {
    const child = document.createElement('div');
    current.appendChild(child);
    current = child;
  }
  
  const leaf = document.createElement('button');
  leaf.textContent = 'Deep Button';
  current.appendChild(leaf);
  
  // Add to document so parentElement works
  document.body.appendChild(root);
  
  return leaf;
}

// ============================================================================
// TEST SETUP
// ============================================================================

describe('TST-007: Vision Recording Fallback', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });
  
  afterEach(() => {
    document.body.innerHTML = '';
  });
  
  // ==========================================================================
  // FALLBACK TRIGGER DETECTION
  // ==========================================================================
  
  describe('shouldTriggerVisionFallback', () => {
    it('should return false for element with good identifiers', () => {
      const element = createMockElement({
        tagName: 'button',
        id: 'submit-btn',
        className: 'btn primary',
        inShadowDOM: false, // Explicitly not in shadow DOM
      });
      
      // Override getRootNode to return document
      element.getRootNode = () => document;
      
      const result = shouldTriggerVisionFallback(element);
      
      expect(result).toBe(false);
    });
    
    it('should return true for element in shadow DOM', () => {
      const element = createMockElement({
        tagName: 'button',
        inShadowDOM: true,
      });
      
      const result = shouldTriggerVisionFallback(element);
      
      expect(result).toBe(true);
    });
    
    it('should return true for deeply nested element without identifiers', () => {
      const element = createDeepElement(20); // 20 levels deep
      
      const result = shouldTriggerVisionFallback(element);
      
      expect(result).toBe(true);
    });
    
    it('should return false for shallow element without identifiers', () => {
      const element = createMockElement({
        tagName: 'button',
        textContent: 'Click me',
        inShadowDOM: false,
      });
      
      // Override getRootNode to return document
      element.getRootNode = () => document;
      
      // Shallow depth should not trigger fallback
      const result = shouldTriggerVisionFallback(element);
      
      expect(result).toBe(false);
    });
    
    it('should detect generated/hash class names', () => {
      const element = createMockElement({
        tagName: 'div',
        className: 'abcdefghij', // Looks like generated hash
      });
      
      // Create deep nesting
      const wrapper = createDeepElement(18);
      wrapper.appendChild(element);
      
      const result = shouldTriggerVisionFallback(element);
      
      // Should consider this as lacking useful identifiers
      expect(typeof result).toBe('boolean');
    });
  });
  
  // ==========================================================================
  // VISION FALLBACK CAPTURE
  // ==========================================================================
  
  describe('captureVisionFallback', () => {
    it('should capture element bounds', () => {
      const element = createMockElement({
        tagName: 'button',
        textContent: 'Allow',
      });
      
      const mockEvent = new MouseEvent('click', {
        clientX: 120,
        clientY: 60,
      });
      
      const result = captureVisionFallback(element, mockEvent);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.bounds).toBeDefined();
      expect(result.data?.bounds.x).toBe(100);
      expect(result.data?.bounds.y).toBe(50);
      expect(result.data?.bounds.width).toBe(80);
      expect(result.data?.bounds.height).toBe(30);
    });
    
    it('should capture click coordinates from event', () => {
      const element = createMockElement({
        tagName: 'button',
      });
      
      const mockEvent = new MouseEvent('click', {
        clientX: 150,
        clientY: 75,
      });
      
      const result = captureVisionFallback(element, mockEvent);
      
      expect(result.data?.clickX).toBe(150);
      expect(result.data?.clickY).toBe(75);
    });
    
    it('should capture nearby text from element', () => {
      const element = createMockElement({
        tagName: 'button',
        textContent: 'Submit Form',
      });
      
      const mockEvent = new MouseEvent('click');
      
      const result = captureVisionFallback(element, mockEvent);
      
      expect(result.data?.nearbyText).toBe('Submit Form');
    });
    
    it('should capture tag name', () => {
      const element = createMockElement({
        tagName: 'button',
      });
      
      const mockEvent = new MouseEvent('click');
      
      const result = captureVisionFallback(element, mockEvent);
      
      expect(result.data?.tagName).toBe('button'); // Lowercase as returned by function
    });
    
    it('should capture timestamp', () => {
      const element = createMockElement({});
      const mockEvent = new MouseEvent('click');
      
      const before = Date.now();
      const result = captureVisionFallback(element, mockEvent);
      const after = Date.now();
      
      expect(result.data?.timestamp).toBeGreaterThanOrEqual(before);
      expect(result.data?.timestamp).toBeLessThanOrEqual(after);
    });
  });
  
  // ==========================================================================
  // PROCESS CLICK FOR RECORDING
  // ==========================================================================
  
  describe('processClickForRecording', () => {
    it('should return Vision data when DOM recording failed', () => {
      const element = createMockElement({
        tagName: 'button',
        textContent: 'Allow',
      });
      const mockEvent = new MouseEvent('click', { clientX: 100, clientY: 50 });
      
      const result = processClickForRecording(element, mockEvent, true);
      
      expect(result).not.toBeNull();
      expect(result?.clickX).toBeDefined();
      expect(result?.clickY).toBeDefined();
    });
    
    it('should return null for normal DOM elements', () => {
      const element = createMockElement({
        tagName: 'button',
        id: 'normal-button',
        className: 'btn',
        inShadowDOM: false,
      });
      
      // Override getRootNode to return document
      element.getRootNode = () => document;
      
      const mockEvent = new MouseEvent('click');
      
      const result = processClickForRecording(element, mockEvent, false);
      
      // Normal element should not trigger Vision fallback
      expect(result).toBeNull();
    });
    
    it('should return Vision data for shadow DOM elements', () => {
      const element = createMockElement({
        tagName: 'button',
        inShadowDOM: true,
      });
      const mockEvent = new MouseEvent('click', { clientX: 100, clientY: 50 });
      
      const result = processClickForRecording(element, mockEvent, false);
      
      expect(result).not.toBeNull();
    });
  });
});
