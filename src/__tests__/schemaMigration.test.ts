/**
 * Schema Migration Tests (TST-008)
 * 
 * Tests the schema migration system that upgrades legacy recordings
 * (v1/v2) to the Vision-compatible format (v3).
 * 
 * @packageDocumentation
 */

import { describe, it, expect } from 'vitest';
import {
  migrateRecording,
  migrateStep,
  CURRENT_SCHEMA_VERSION,
  recordingNeedsMigration,
  stepNeedsMigration,
  verifyRecordingMigration,
  MIGRATION_DEFAULTS,
} from '../lib/schemaMigration';
import type { Recording } from '../types/vision';

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

/**
 * Creates a v1 (legacy) recording without new Vision fields.
 */
function createV1Recording(overrides: Partial<any> = {}): any {
  return {
    id: 'rec-v1-001',
    name: 'Legacy Recording',
    projectId: 1,
    steps: [
      {
        label: 'Click Button',
        event: 'click',
        selector: '#button1',
        xpath: '//*[@id="button1"]',
      },
      {
        label: 'Enter Text',
        event: 'input',
        selector: '#input1',
        xpath: '//*[@id="input1"]',
        value: 'test value',
      },
    ],
    createdAt: 1704067200000,
    updatedAt: 1704067200000,
    ...overrides,
  };
}

/**
 * Creates a v2 recording with partial Vision fields.
 */
function createV2Recording(overrides: Partial<any> = {}): any {
  return {
    ...createV1Recording(),
    schemaVersion: 2,
    loopStartIndex: 1,
    ...overrides,
  };
}

/**
 * Creates a fully migrated v3 recording.
 */
function createV3Recording(overrides: Partial<Recording> = {}): Recording {
  return {
    id: 'rec-v3-001',
    name: 'Modern Recording',
    projectId: 1,
    schemaVersion: 3,
    loopStartIndex: 0,
    globalDelayMs: 0,
    conditionalDefaults: {
      searchTerms: ['Allow', 'Keep'],
      timeoutSeconds: 120,
      confidenceThreshold: 60,
    },
    steps: [
      {
        label: 'Click Button',
        event: 'click',
        selector: '#button1',
        xpath: '//*[@id="button1"]',
        recordedVia: 'dom',
      },
    ],
    createdAt: 1704067200000,
    updatedAt: 1704067200000,
    ...overrides,
  } as Recording;
}

/**
 * Creates a v1 step without Vision fields.
 */
function createV1Step(overrides: Partial<any> = {}): any {
  return {
    label: 'Input Step',
    event: 'input',
    selector: '#input',
    xpath: '//*[@id="input"]',
    value: 'test',
    ...overrides,
  };
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe('Schema Migration (TST-008)', () => {
  describe('recordingNeedsMigration', () => {
    it('should return true for recordings without schemaVersion', () => {
      const v1 = createV1Recording();
      expect(recordingNeedsMigration(v1)).toBe(true);
    });

    it('should return true for schemaVersion 1', () => {
      const v1 = createV1Recording({ schemaVersion: 1 });
      expect(recordingNeedsMigration(v1)).toBe(true);
    });

    it('should return true for schemaVersion 2', () => {
      const v2 = createV2Recording();
      expect(recordingNeedsMigration(v2)).toBe(true);
    });

    it('should return false for current schema version', () => {
      const v3 = createV3Recording();
      expect(recordingNeedsMigration(v3)).toBe(false);
    });

    it('should return true when loopStartIndex is missing', () => {
      const partial = createV3Recording();
      delete (partial as any).loopStartIndex;
      expect(recordingNeedsMigration(partial)).toBe(true);
    });

    it('should return true when globalDelayMs is missing', () => {
      const partial = createV3Recording();
      delete (partial as any).globalDelayMs;
      expect(recordingNeedsMigration(partial)).toBe(true);
    });

    it('should return true when conditionalDefaults is missing', () => {
      const partial = createV3Recording();
      delete (partial as any).conditionalDefaults;
      expect(recordingNeedsMigration(partial)).toBe(true);
    });

    it('should return true when any step needs migration', () => {
      const rec = createV3Recording({
        steps: [
          { label: 'Test', event: 'click' } as any, // Missing recordedVia
        ],
      });
      expect(recordingNeedsMigration(rec)).toBe(true);
    });
  });

  describe('stepNeedsMigration', () => {
    it('should return true when recordedVia is missing', () => {
      const v1Step = createV1Step();
      expect(stepNeedsMigration(v1Step)).toBe(true);
    });

    it('should return false when recordedVia is present', () => {
      const step = createV1Step({ recordedVia: 'dom' });
      expect(stepNeedsMigration(step)).toBe(false);
    });
  });

  describe('migrateStep', () => {
    it('should add recordedVia: dom as default', () => {
      const v1Step = createV1Step();
      const migrated = migrateStep(v1Step);

      expect(migrated.recordedVia).toBe('dom');
    });

    it('should preserve existing recordedVia value', () => {
      const step = createV1Step({ recordedVia: 'vision' });
      const migrated = migrateStep(step);

      expect(migrated.recordedVia).toBe('vision');
    });

    it('should include delaySeconds if provided', () => {
      const step = createV1Step({ delaySeconds: 5 });
      const migrated = migrateStep(step);

      expect(migrated.delaySeconds).toBe(5);
    });

    it('should not include delaySeconds if not provided', () => {
      const v1Step = createV1Step();
      const migrated = migrateStep(v1Step);

      expect(migrated.delaySeconds).toBeUndefined();
    });

    it('should include conditionalConfig if provided', () => {
      const config = {
        enabled: true,
        searchTerms: ['Accept'],
        timeoutSeconds: 60,
        pollIntervalMs: 1000,
        interactionType: 'click' as const,
      };
      const step = createV1Step({ conditionalConfig: config });
      const migrated = migrateStep(step);

      expect(migrated.conditionalConfig).toEqual(config);
    });

    it('should not include conditionalConfig if not provided', () => {
      const v1Step = createV1Step();
      const migrated = migrateStep(v1Step);

      expect(migrated.conditionalConfig).toBeUndefined();
    });

    it('should preserve all original step fields', () => {
      const v1Step = createV1Step({
        event: 'click',
        selector: '#custom-btn',
        xpath: '//*[@id="custom-btn"]',
        label: 'Custom Button',
      });
      const migrated = migrateStep(v1Step);

      expect(migrated.event).toBe('click');
      expect(migrated.selector).toBe('#custom-btn');
      expect(migrated.xpath).toBe('//*[@id="custom-btn"]');
      expect(migrated.label).toBe('Custom Button');
    });

    it('should normalize event type', () => {
      const step = createV1Step({ event: 'invalid-event' });
      const migrated = migrateStep(step);

      expect(migrated.event).toBe('click'); // Default fallback
    });

    it('should repair negative delaySeconds', () => {
      const step = createV1Step({ delaySeconds: -5 });
      const migrated = migrateStep(step);

      expect(migrated.delaySeconds).toBe(0);
    });

    it('should cap excessive delaySeconds', () => {
      const step = createV1Step({ delaySeconds: 9999 });
      const migrated = migrateStep(step);

      expect(migrated.delaySeconds).toBeLessThanOrEqual(3600);
    });

    it('should handle invalid conditionalConfig', () => {
      const step = createV1Step({ conditionalConfig: 'invalid' as any });
      const migrated = migrateStep(step);

      expect(migrated.conditionalConfig).toBe(null);
    });

    it('should preserve Vision coordinates', () => {
      const coords = { x: 100, y: 200, width: 50, height: 30 };
      const step = createV1Step({ coordinates: coords });
      const migrated = migrateStep(step);

      expect(migrated.coordinates).toEqual(coords);
    });

    it('should preserve ocrText and confidenceScore', () => {
      const step = createV1Step({
        ocrText: 'Submit Button',
        confidenceScore: 95,
      });
      const migrated = migrateStep(step);

      expect(migrated.ocrText).toBe('Submit Button');
      expect(migrated.confidenceScore).toBe(95);
    });
  });

  describe('migrateRecording', () => {
    const projectId = 1;

    it('should set schemaVersion to current version', () => {
      const v1 = createV1Recording();
      const migrated = migrateRecording(v1, projectId);

      expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
      expect(migrated.schemaVersion).toBe(3);
    });

    it('should add loopStartIndex: 0 as default', () => {
      const v1 = createV1Recording();
      const migrated = migrateRecording(v1, projectId);

      expect(migrated.loopStartIndex).toBe(0);
    });

    it('should preserve existing loopStartIndex', () => {
      const v2 = createV2Recording({
        loopStartIndex: 3,
        steps: [
          createV1Step({ label: 'Step 1' }),
          createV1Step({ label: 'Step 2' }),
          createV1Step({ label: 'Step 3' }),
          createV1Step({ label: 'Step 4' }),
        ],
      });
      const migrated = migrateRecording(v2, projectId);

      expect(migrated.loopStartIndex).toBe(3);
    });

    it('should add globalDelayMs: 0 as default', () => {
      const v1 = createV1Recording();
      const migrated = migrateRecording(v1, projectId);

      expect(migrated.globalDelayMs).toBe(0);
    });

    it('should preserve existing globalDelayMs', () => {
      const rec = createV1Recording({ globalDelayMs: 5000 });
      const migrated = migrateRecording(rec, projectId);

      expect(migrated.globalDelayMs).toBe(5000);
    });

    it('should add conditionalDefaults with standard values', () => {
      const v1 = createV1Recording();
      const migrated = migrateRecording(v1, projectId);

      expect(migrated.conditionalDefaults).toEqual({
        searchTerms: ['Allow', 'Keep'],
        timeoutSeconds: 120,
        confidenceThreshold: 60,
      });
    });

    it('should preserve existing conditionalDefaults', () => {
      const defaults = {
        searchTerms: ['Accept', 'Confirm'],
        timeoutSeconds: 60,
        confidenceThreshold: 70,
      };
      const rec = createV1Recording({ conditionalDefaults: defaults });
      const migrated = migrateRecording(rec, projectId);

      expect(migrated.conditionalDefaults).toEqual(defaults);
    });

    it('should migrate all steps', () => {
      const v1 = createV1Recording({
        steps: [
          createV1Step({ label: 'Step 1' }),
          createV1Step({ label: 'Step 2' }),
          createV1Step({ label: 'Step 3' }),
        ],
      });
      const migrated = migrateRecording(v1, projectId);

      expect(migrated.steps).toHaveLength(3);
      migrated.steps.forEach((step) => {
        expect(step.recordedVia).toBe('dom');
      });
    });

    it('should preserve step labels', () => {
      const v1 = createV1Recording({
        steps: [createV1Step({ label: 'unique-step-label' })],
      });
      const migrated = migrateRecording(v1, projectId);

      expect(migrated.steps[0].label).toBe('unique-step-label');
    });

    it('should handle recordings with no steps', () => {
      const v1 = createV1Recording({ steps: [] });
      const migrated = migrateRecording(v1, projectId);

      expect(migrated.steps).toEqual([]);
      expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    });

    it('should preserve all original recording fields', () => {
      const v1 = createV1Recording({
        id: 'custom-id',
        name: 'My Custom Recording',
        projectId: 42,
        createdAt: 1234567890,
      });
      const migrated = migrateRecording(v1, projectId);

      expect(migrated.id).toBe('custom-id');
      expect(migrated.name).toBe('My Custom Recording');
      expect(migrated.projectId).toBe(42);
      expect(migrated.createdAt).toBe(1234567890);
    });

    it('should update updatedAt timestamp', () => {
      const v1 = createV1Recording({ updatedAt: 1000000000 });
      const before = Date.now();
      const migrated = migrateRecording(v1, projectId);
      const after = Date.now();

      expect(migrated.updatedAt).toBeGreaterThanOrEqual(before);
      expect(migrated.updatedAt).toBeLessThanOrEqual(after);
    });

    it('should use provided projectId if missing', () => {
      const v1 = createV1Recording();
      delete v1.projectId;
      const migrated = migrateRecording(v1, 999);

      expect(migrated.projectId).toBe(999);
    });

    it('should preserve parsedFields', () => {
      const parsedFields = ['name', 'email', 'phone'];
      const rec = createV1Recording({ parsedFields });
      const migrated = migrateRecording(rec, projectId);

      expect(migrated.parsedFields).toEqual(parsedFields);
    });

    it('should preserve csvData', () => {
      const csvData = 'name,email\nJohn,john@example.com';
      const rec = createV1Recording({ csvData });
      const migrated = migrateRecording(rec, projectId);

      expect(migrated.csvData).toBe(csvData);
    });
  });

  describe('Idempotency', () => {
    const projectId = 1;

    it('should produce same result when migrated twice', () => {
      const v1 = createV1Recording();
      const firstMigration = migrateRecording(v1, projectId);
      const secondMigration = migrateRecording(firstMigration, projectId);

      // Schema version should be the same
      expect(firstMigration.schemaVersion).toBe(secondMigration.schemaVersion);
      expect(firstMigration.loopStartIndex).toBe(secondMigration.loopStartIndex);
      expect(firstMigration.globalDelayMs).toBe(secondMigration.globalDelayMs);
      expect(firstMigration.steps.length).toBe(secondMigration.steps.length);
    });

    it('should not break already migrated recording', () => {
      const v3 = createV3Recording();
      const migrated = migrateRecording(v3, 1);

      expect(migrated.schemaVersion).toBe(v3.schemaVersion);
      expect(migrated.loopStartIndex).toBe(v3.loopStartIndex);
    });

    it('should preserve Vision fields on re-migration', () => {
      const v3 = createV3Recording({
        steps: [
          {
            label: 'Vision Input',
            event: 'input',
            recordedVia: 'vision',
            delaySeconds: 5,
            conditionalConfig: {
              enabled: true,
              searchTerms: ['OK'],
              timeoutSeconds: 30,
              pollIntervalMs: 500,
              interactionType: 'click',
            },
            coordinates: { x: 100, y: 200, width: 50, height: 20 },
            ocrText: 'OCR captured',
            confidenceScore: 92,
          } as any,
        ],
      });
      const migrated = migrateRecording(v3, 1);

      expect(migrated.steps[0].recordedVia).toBe('vision');
      expect((migrated.steps[0] as any).coordinates).toEqual({
        x: 100,
        y: 200,
        width: 50,
        height: 20,
      });
      expect((migrated.steps[0] as any).ocrText).toBe('OCR captured');
    });
  });

  describe('verifyRecordingMigration', () => {
    it('should pass for valid migrated recording', () => {
      const v3 = createV3Recording();
      const result = verifyRecordingMigration(v3);

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should fail if schemaVersion is wrong', () => {
      const invalid = createV3Recording({ schemaVersion: 2 } as any);
      const result = verifyRecordingMigration(invalid);

      expect(result.valid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should fail if loopStartIndex is not a number', () => {
      const invalid = createV3Recording({ loopStartIndex: 'invalid' as any });
      const result = verifyRecordingMigration(invalid);

      expect(result.valid).toBe(false);
      expect(result.issues.some((e) => e.includes('loopStartIndex'))).toBe(true);
    });

    it('should fail if globalDelayMs is not a number', () => {
      const invalid = createV3Recording({ globalDelayMs: 'invalid' as any });
      const result = verifyRecordingMigration(invalid);

      expect(result.valid).toBe(false);
      expect(result.issues.some((e) => e.includes('globalDelayMs'))).toBe(true);
    });

    it('should fail if conditionalDefaults is missing', () => {
      const invalid = createV3Recording();
      delete (invalid as any).conditionalDefaults;
      const result = verifyRecordingMigration(invalid);

      expect(result.valid).toBe(false);
      expect(result.issues.some((e) => e.includes('conditionalDefaults'))).toBe(
        true
      );
    });

    it('should fail if steps lack recordedVia', () => {
      const invalid = createV3Recording({
        steps: [{ label: 'Test', event: 'click' }] as any,
      });
      const result = verifyRecordingMigration(invalid);

      expect(result.valid).toBe(false);
      expect(result.issues.some((e) => e.includes('recordedVia'))).toBe(true);
    });

    it('should fail if steps lack event', () => {
      const invalid = createV3Recording({
        steps: [{ label: 'Test', recordedVia: 'dom' }] as any,
      });
      const result = verifyRecordingMigration(invalid);

      expect(result.valid).toBe(false);
      expect(result.issues.some((e) => e.includes('event'))).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    const projectId = 1;

    it('should handle undefined steps array', () => {
      const v1 = createV1Recording();
      delete v1.steps;
      const migrated = migrateRecording(v1, projectId);

      expect(migrated.steps).toEqual([]);
    });

    it('should handle null steps array', () => {
      const v1 = createV1Recording({ steps: null });
      const migrated = migrateRecording(v1, projectId);

      expect(migrated.steps).toEqual([]);
    });

    it('should repair negative loopStartIndex', () => {
      const v2 = createV2Recording({ loopStartIndex: -5 });
      const migrated = migrateRecording(v2, projectId);

      expect(migrated.loopStartIndex).toBe(0);
    });

    it('should cap extremely large globalDelayMs', () => {
      const rec = createV1Recording({ globalDelayMs: 999999999 });
      const migrated = migrateRecording(rec, projectId);

      expect(migrated.globalDelayMs).toBeLessThanOrEqual(60000);
    });

    it('should handle loopStartIndex beyond steps length', () => {
      const v2 = createV2Recording({
        loopStartIndex: 100,
        steps: [createV1Step()],
      });
      const migrated = migrateRecording(v2, projectId);

      // Should be clamped to steps.length - 1
      expect(migrated.loopStartIndex).toBe(0);
    });

    it('should handle invalid conditionalDefaults', () => {
      const rec = createV1Recording({
        conditionalDefaults: { invalid: true } as any,
      });
      const migrated = migrateRecording(rec, projectId);

      // Should use defaults
      expect(migrated.conditionalDefaults).toEqual(
        MIGRATION_DEFAULTS.conditionalDefaults
      );
    });

    it('should handle empty searchTerms', () => {
      const rec = createV1Recording({
        conditionalDefaults: {
          searchTerms: [],
          timeoutSeconds: 60,
          confidenceThreshold: 60,
        },
      });
      const migrated = migrateRecording(rec, projectId);

      expect(migrated.conditionalDefaults.searchTerms).toEqual(['Allow', 'Keep']);
    });

    it('should cap excessive timeout', () => {
      const rec = createV1Recording({
        conditionalDefaults: {
          searchTerms: ['OK'],
          timeoutSeconds: 99999,
          confidenceThreshold: 60,
        },
      });
      const migrated = migrateRecording(rec, projectId);

      expect(migrated.conditionalDefaults.timeoutSeconds).toBeLessThanOrEqual(600);
    });
  });

  describe('Backward Compatibility', () => {
    const projectId = 1;

    it('should allow playback of migrated v1 recordings', () => {
      const v1 = createV1Recording({
        steps: [
          {
            label: 'Open Page',
            event: 'open',
            url: 'https://example.com',
          },
          {
            label: 'Click Button',
            event: 'click',
            selector: '#btn',
            xpath: '//*[@id="btn"]',
          },
          {
            label: 'Type Text',
            event: 'input',
            selector: '#in',
            xpath: '//*[@id="in"]',
            value: 'test',
          },
        ],
      });
      const migrated = migrateRecording(v1, projectId);

      // All steps should be playable (have required fields)
      migrated.steps.forEach((step) => {
        expect(step.label).toBeDefined();
        expect(step.event).toBeDefined();
        expect(step.recordedVia).toBe('dom');
      });

      // Recording-level defaults should preserve behavior
      expect(migrated.loopStartIndex).toBe(0); // Execute all steps
      expect(migrated.globalDelayMs).toBe(0); // No delay
    });

    it('should maintain step order after migration', () => {
      const v1 = createV1Recording({
        steps: [
          createV1Step({ label: 'First' }),
          createV1Step({ label: 'Second' }),
          createV1Step({ label: 'Third' }),
        ],
      });
      const migrated = migrateRecording(v1, projectId);

      expect(migrated.steps[0].label).toBe('First');
      expect(migrated.steps[1].label).toBe('Second');
      expect(migrated.steps[2].label).toBe('Third');
    });
  });

  describe('Data Integrity', () => {
    const projectId = 1;

    it('should preserve timestamps', () => {
      const created = 1704067200000;
      const v1 = createV1Recording({ createdAt: created });
      const migrated = migrateRecording(v1, projectId);

      expect(migrated.createdAt).toBe(created);
      expect(migrated.updatedAt).toBeGreaterThan(created);
    });

    it('should preserve recording ID', () => {
      const v1 = createV1Recording({ id: 'unique-recording-id-xyz' });
      const migrated = migrateRecording(v1, projectId);

      expect(migrated.id).toBe('unique-recording-id-xyz');
    });

    it('should preserve project association', () => {
      const v1 = createV1Recording({ projectId: 123 });
      const migrated = migrateRecording(v1, projectId);

      expect(migrated.projectId).toBe(123);
    });

    it('should preserve step selectors and xpaths', () => {
      const v1 = createV1Recording({
        steps: [
          createV1Step({
            selector: '#custom-selector',
            xpath: '//*[@id="custom-selector"]',
          }),
        ],
      });
      const migrated = migrateRecording(v1, projectId);

      expect(migrated.steps[0].selector).toBe('#custom-selector');
      expect(migrated.steps[0].xpath).toBe('//*[@id="custom-selector"]');
    });
  });
});
