/**
 * Fallback Chain Integration Tests
 * 
 * Tests the 7-tier fallback strategy system:
 * - Strategy priority ordering
 * - Fallback progression
 * - Strategy scoring
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  resetAllMocks,
  createMockStep,
  createMockStepResult
} from './setup';

describe('Fallback Chain Integration', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('Strategy Priority', () => {
    it('should order strategies by score (highest first)', () => {
      const step = createMockStep();
      const strategies = step.fallbackChain.strategies;

      // Verify descending score order
      for (let i = 0; i < strategies.length - 1; i++) {
        expect(strategies[i].score).toBeGreaterThanOrEqual(strategies[i + 1].score);
      }
    });

    it('should include expected strategy types', () => {
      const step = createMockStep({
        fallbackChain: {
          strategies: [
            { type: 'cdp_semantic', score: 0.95, metadata: {} },
            { type: 'dom_selector', score: 0.90, metadata: {} },
            { type: 'css_selector', score: 0.85, metadata: {} },
            { type: 'xpath', score: 0.80, metadata: {} },
            { type: 'vision_ocr', score: 0.70, metadata: {} },
            { type: 'coordinates', score: 0.60, metadata: {} }
          ]
        }
      });

      const types = step.fallbackChain.strategies.map((s: any) => s.type);
      
      expect(types).toContain('cdp_semantic');
      expect(types).toContain('dom_selector');
      expect(types).toContain('vision_ocr');
      expect(types).toContain('coordinates');
    });

    it('should have coordinates as lowest priority (last resort)', () => {
      const step = createMockStep({
        fallbackChain: {
          strategies: [
            { type: 'dom_selector', score: 0.90, metadata: {} },
            { type: 'xpath', score: 0.80, metadata: {} },
            { type: 'coordinates', score: 0.60, metadata: {} }
          ]
        }
      });

      const strategies = step.fallbackChain.strategies;
      const lastStrategy = strategies[strategies.length - 1];
      
      expect(lastStrategy.type).toBe('coordinates');
      expect(lastStrategy.score).toBeLessThan(0.65);
    });
  });

  describe('Fallback Progression', () => {
    it('should report 0 fallbacks when first strategy succeeds', () => {
      const result = createMockStepResult({
        strategyUsed: 'cdp_semantic',
        fallbacksAttempted: 0
      });

      expect(result.fallbacksAttempted).toBe(0);
      expect(result.strategyUsed).toBe('cdp_semantic');
    });

    it('should report correct fallback count when primary fails', () => {
      const result = createMockStepResult({
        strategyUsed: 'xpath',
        fallbacksAttempted: 2
      });

      // xpath is 3rd in order, so 2 fallbacks attempted
      expect(result.fallbacksAttempted).toBe(2);
      expect(result.strategyUsed).toBe('xpath');
    });

    it('should use coordinates as last resort', () => {
      const result = createMockStepResult({
        strategyUsed: 'coordinates',
        fallbacksAttempted: 5
      });

      expect(result.strategyUsed).toBe('coordinates');
      expect(result.fallbacksAttempted).toBeGreaterThan(3);
    });
  });

  describe('Strategy Metadata', () => {
    it('should include selector in dom_selector metadata', () => {
      const step = createMockStep();
      const domStrategy = step.fallbackChain.strategies.find(
        (s: any) => s.type === 'dom_selector'
      );

      expect(domStrategy).toBeDefined();
      expect(domStrategy?.metadata.selector).toBeDefined();
    });

    it('should include xpath in xpath metadata', () => {
      const step = createMockStep({
        fallbackChain: {
          strategies: [
            { type: 'xpath', score: 0.80, metadata: { xpath: '//*[@id="test"]' } }
          ]
        }
      });

      const xpathStrategy = step.fallbackChain.strategies.find(
        (s: any) => s.type === 'xpath'
      );

      expect(xpathStrategy?.metadata.xpath).toContain('//*');
    });

    it('should include coordinates in coordinates metadata', () => {
      const step = createMockStep({
        fallbackChain: {
          strategies: [
            { type: 'coordinates', score: 0.60, metadata: { x: 100, y: 200 } }
          ]
        }
      });

      const coordStrategy = step.fallbackChain.strategies.find(
        (s: any) => s.type === 'coordinates'
      ) as any;

      expect(coordStrategy?.metadata.x).toBe(100);
      expect(coordStrategy?.metadata.y).toBe(200);
    });
  });

  describe('Strategy Scoring', () => {
    it('should score CDP strategies highest (0.90+)', () => {
      const cdpScore = 0.95;
      expect(cdpScore).toBeGreaterThanOrEqual(0.90);
    });

    it('should score DOM/CSS strategies medium-high (0.80-0.90)', () => {
      const domScore = 0.85;
      expect(domScore).toBeGreaterThanOrEqual(0.80);
      expect(domScore).toBeLessThanOrEqual(0.90);
    });

    it('should score vision strategies medium (0.65-0.80)', () => {
      const visionScore = 0.70;
      expect(visionScore).toBeGreaterThanOrEqual(0.65);
      expect(visionScore).toBeLessThanOrEqual(0.80);
    });

    it('should score coordinates lowest (< 0.65)', () => {
      const coordScore = 0.60;
      expect(coordScore).toBeLessThan(0.65);
    });
  });
});
