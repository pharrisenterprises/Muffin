/**
 * CSV Position Mapping Tests (TST-009)
 * 
 * Tests the position-based CSV column mapping system that handles
 * duplicate column names and step labels correctly.
 * 
 * Key scenarios:
 * - Duplicate column names (Papa.parse adds _0, _1 suffixes)
 * - Duplicate step labels mapping to correct columns
 * - Loop start index affecting step execution
 * - Variable substitution in step values
 * 
 * @packageDocumentation
 */

import { describe, it, expect } from 'vitest';
import {
  buildLabelToColumnsMapping,
  buildStepToColumnMapping,
  buildColumnMappingFromRecording,
  buildColumnIndexMap,
  getRowValue,
  substituteStepValue,
  substituteVariables,
  substituteSearchTerms,
  getStepsForRow,
  getAbsoluteStepIndex,
  processStepsForRow,
  type LabelToColumnsMapping,
  type StepToColumnMapping,
} from '../lib/csvPositionMapping';
import type { Step, Recording, ParsedField } from '../types/vision';

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

/**
 * Creates a mock step for testing.
 */
function createStep(overrides: Partial<Step> = {}): Step {
  return {
    id: Math.floor(Math.random() * 100000),
    label: 'Test Input',
    event: 'input',
    selector: '#input',
    xpath: '//*[@id="input"]',
    value: '',
    recordedVia: 'dom',
    ...overrides,
  } as Step;
}

/**
 * Creates a mock ParsedField (CSV field mapping).
 */
function createParsedField(
  columnName: string,
  targetLabel: string,
  columnIndex: number,
  stepIndices: number[] = [0]
): ParsedField {
  return {
    columnName,
    targetLabel,
    columnIndex,
    stepIndices
  };
}

/**
 * Creates a mock recording.
 */
function createRecording(overrides: Partial<Recording> = {}): Recording {
  return {
    id: 'test-rec',
    name: 'Test Recording',
    projectId: 1,
    schemaVersion: 3,
    loopStartIndex: 0,
    globalDelayMs: 0,
    conditionalDefaults: {
      searchTerms: ['Allow'],
      timeoutSeconds: 120,
      confidenceThreshold: 60,
    },
    steps: [],
    parsedFields: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  } as Recording;
}

// ============================================================================
// buildLabelToColumnsMapping TESTS
// ============================================================================

describe('buildLabelToColumnsMapping', () => {
  it('should map single label to single column', () => {
    const fields: ParsedField[] = [
      createParsedField('Name', 'Name', 0),
    ];

    const mapping = buildLabelToColumnsMapping(fields);

    expect(mapping['name']).toEqual(['Name']);
  });

  it('should handle duplicate labels with position-based mapping', () => {
    const fields: ParsedField[] = [
      createParsedField('Search_0', 'Search', 0),
      createParsedField('Search_1', 'Search', 1),
      createParsedField('Search_2', 'Search', 2),
    ];

    const mapping = buildLabelToColumnsMapping(fields);

    expect(mapping['search']).toEqual(['Search_0', 'Search_1', 'Search_2']);
  });

  it('should sort by columnIndex to preserve order', () => {
    const fields: ParsedField[] = [
      createParsedField('Field_2', 'Test', 2),
      createParsedField('Field_0', 'Test', 0),
      createParsedField('Field_1', 'Test', 1),
    ];

    const mapping = buildLabelToColumnsMapping(fields);

    expect(mapping['test']).toEqual(['Field_0', 'Field_1', 'Field_2']);
  });

  it('should handle mixed labels correctly', () => {
    const fields: ParsedField[] = [
      createParsedField('Name', 'Name', 0),
      createParsedField('Search_0', 'Search', 1),
      createParsedField('Search_1', 'Search', 2),
      createParsedField('Email', 'Email', 3),
    ];

    const mapping = buildLabelToColumnsMapping(fields);

    expect(mapping['name']).toEqual(['Name']);
    expect(mapping['search']).toEqual(['Search_0', 'Search_1']);
    expect(mapping['email']).toEqual(['Email']);
  });

  it('should return empty mapping for empty fields', () => {
    const mapping = buildLabelToColumnsMapping([]);

    expect(Object.keys(mapping)).toHaveLength(0);
  });

  it('should return empty mapping for undefined', () => {
    const mapping = buildLabelToColumnsMapping(undefined);

    expect(Object.keys(mapping)).toHaveLength(0);
  });

  it('should skip fields with empty labels', () => {
    const fields: ParsedField[] = [
      createParsedField('Column1', '', 0),
      createParsedField('Column2', 'Valid', 1),
    ];

    const mapping = buildLabelToColumnsMapping(fields);

    expect(mapping['valid']).toEqual(['Column2']);
    expect(mapping['']).toBeUndefined();
  });

  it('should normalize labels to lowercase', () => {
    const fields: ParsedField[] = [
      createParsedField('Col1', 'Search', 0),
      createParsedField('Col2', 'SEARCH', 1),
      createParsedField('Col3', 'search', 2),
    ];

    const mapping = buildLabelToColumnsMapping(fields);

    expect(mapping['search']).toEqual(['Col1', 'Col2', 'Col3']);
  });
});

// ============================================================================
// buildStepToColumnMapping TESTS
// ============================================================================

describe('buildStepToColumnMapping', () => {
  it('should map single step to single column', () => {
    const steps: Step[] = [createStep({ label: 'Name' })];
    const labelToColumns: LabelToColumnsMapping = {
      name: ['Name'],
    };

    const mapping = buildStepToColumnMapping(steps, labelToColumns);

    expect(mapping[0]).toBe('Name');
  });

  it('should handle duplicate labels with position-based mapping', () => {
    const steps: Step[] = [
      createStep({ label: 'Search' }),
      createStep({ label: 'Search' }),
      createStep({ label: 'Search' }),
    ];
    const labelToColumns: LabelToColumnsMapping = {
      search: ['Search_0', 'Search_1', 'Search_2'],
    };

    const mapping = buildStepToColumnMapping(steps, labelToColumns);

    expect(mapping[0]).toBe('Search_0');
    expect(mapping[1]).toBe('Search_1');
    expect(mapping[2]).toBe('Search_2');
  });

  it('should handle mixed labels correctly', () => {
    const steps: Step[] = [
      createStep({ label: 'Name' }),
      createStep({ label: 'Search' }),
      createStep({ label: 'Search' }),
      createStep({ label: 'Email' }),
    ];
    const labelToColumns: LabelToColumnsMapping = {
      name: ['Name'],
      search: ['Search_0', 'Search_1'],
      email: ['Email'],
    };

    const mapping = buildStepToColumnMapping(steps, labelToColumns);

    expect(mapping[0]).toBe('Name');
    expect(mapping[1]).toBe('Search_0');
    expect(mapping[2]).toBe('Search_1');
    expect(mapping[3]).toBe('Email');
  });

  it('should skip steps without labels', () => {
    const steps: Step[] = [
      createStep({ label: '', event: 'open' }),
      createStep({ label: 'Name' }),
      createStep({ label: '', event: 'click' }),
      createStep({ label: 'Email' }),
    ];
    const labelToColumns: LabelToColumnsMapping = {
      name: ['Name'],
      email: ['Email'],
    };

    const mapping = buildStepToColumnMapping(steps, labelToColumns);

    expect(mapping[0]).toBeUndefined();
    expect(mapping[1]).toBe('Name');
    expect(mapping[2]).toBeUndefined();
    expect(mapping[3]).toBe('Email');
  });

  it('should handle more steps than columns', () => {
    const steps: Step[] = [
      createStep({ label: 'Search' }),
      createStep({ label: 'Search' }),
      createStep({ label: 'Search' }),
      createStep({ label: 'Search' }),
    ];
    const labelToColumns: LabelToColumnsMapping = {
      search: ['Search_0', 'Search_1'],
    };

    const mapping = buildStepToColumnMapping(steps, labelToColumns);

    expect(mapping[0]).toBe('Search_0');
    expect(mapping[1]).toBe('Search_1');
    expect(mapping[2]).toBeUndefined();
    expect(mapping[3]).toBeUndefined();
  });

  it('should handle case-insensitive label matching', () => {
    const steps: Step[] = [
      createStep({ label: 'Search' }),
      createStep({ label: 'SEARCH' }),
      createStep({ label: 'search' }),
    ];
    const labelToColumns: LabelToColumnsMapping = {
      search: ['Search_0', 'Search_1', 'Search_2'],
    };

    const mapping = buildStepToColumnMapping(steps, labelToColumns);

    expect(mapping[0]).toBe('Search_0');
    expect(mapping[1]).toBe('Search_1');
    expect(mapping[2]).toBe('Search_2');
  });

  it('should return empty mapping for empty steps', () => {
    const steps: Step[] = [];
    const labelToColumns: LabelToColumnsMapping = {
      name: ['Name'],
    };

    const mapping = buildStepToColumnMapping(steps, labelToColumns);

    expect(Object.keys(mapping)).toHaveLength(0);
  });
});

// ============================================================================
// buildColumnMappingFromRecording TESTS
// ============================================================================

describe('buildColumnMappingFromRecording', () => {
  it('should build complete mapping from recording', () => {
    const recording = createRecording({
      steps: [
        createStep({ label: 'Name' }),
        createStep({ label: 'Search' }),
        createStep({ label: 'Search' }),
      ],
      parsedFields: [
        createParsedField('Name', 'Name', 0),
        createParsedField('Search_0', 'Search', 1),
        createParsedField('Search_1', 'Search', 2),
      ],
    });

    const mapping = buildColumnMappingFromRecording(recording);

    expect(mapping[0]).toBe('Name');
    expect(mapping[1]).toBe('Search_0');
    expect(mapping[2]).toBe('Search_1');
  });

  it('should handle recording without parsed fields', () => {
    const recording = createRecording({
      steps: [createStep({ label: 'Test' })],
      parsedFields: undefined,
    });

    const mapping = buildColumnMappingFromRecording(recording);

    expect(Object.keys(mapping)).toHaveLength(0);
  });
});

// ============================================================================
// buildColumnIndexMap TESTS
// ============================================================================

describe('buildColumnIndexMap', () => {
  it('should build index map from headers', () => {
    const headers = ['Name', 'Email', 'Phone'];

    const map = buildColumnIndexMap(headers);

    expect(map.get('Name')).toBe(0);
    expect(map.get('Email')).toBe(1);
    expect(map.get('Phone')).toBe(2);
  });

  it('should handle duplicate headers (keep first)', () => {
    const headers = ['Search', 'Search', 'Search'];

    const map = buildColumnIndexMap(headers);

    expect(map.get('Search')).toBe(0);
    expect(map.size).toBe(1);
  });

  it('should handle empty headers', () => {
    const map = buildColumnIndexMap([]);

    expect(map.size).toBe(0);
  });
});

// ============================================================================
// getRowValue TESTS
// ============================================================================

describe('getRowValue', () => {
  const headers = ['Name', 'Email', 'Phone'];
  const row = ['Alice', 'alice@example.com', '555-0100'];
  const map = buildColumnIndexMap(headers);

  it('should get value by column name', () => {
    expect(getRowValue(row, 'Name', map)).toBe('Alice');
    expect(getRowValue(row, 'Email', map)).toBe('alice@example.com');
    expect(getRowValue(row, 'Phone', map)).toBe('555-0100');
  });

  it('should return undefined for non-existent column', () => {
    expect(getRowValue(row, 'Missing', map)).toBeUndefined();
  });

  it('should return undefined for index out of range', () => {
    const shortRow = ['Alice'];
    expect(getRowValue(shortRow, 'Email', map)).toBeUndefined();
  });
});

// ============================================================================
// substituteStepValue TESTS
// ============================================================================

describe('substituteStepValue', () => {
  const headers = ['Search_0', 'Search_1'];
  const row = ['cats', 'dogs'];
  const columnMap = buildColumnIndexMap(headers);
  const stepToColumn: StepToColumnMapping = {
    0: 'Search_0',
    1: 'Search_1',
  };

  it('should substitute step value from CSV', () => {
    const step = createStep({ label: 'Search', value: '' });

    const result = substituteStepValue(step, 0, row, stepToColumn, columnMap);

    expect(result.substituted).toBe(true);
    expect(result.step.value).toBe('cats');
    expect(result.columnUsed).toBe('Search_0');
  });

  it('should not substitute if no column mapping', () => {
    const step = createStep({ label: 'NoMap', value: 'original' });

    const result = substituteStepValue(step, 5, row, stepToColumn, columnMap);

    expect(result.substituted).toBe(false);
    expect(result.step.value).toBe('original');
  });

  it('should not substitute if value not found in row', () => {
    const step = createStep({ label: 'Search' });
    const shortRow: string[] = [];

    const result = substituteStepValue(step, 0, shortRow, stepToColumn, columnMap);

    expect(result.substituted).toBe(false);
  });

  it('should preserve original value in result', () => {
    const step = createStep({ label: 'Search', value: 'original' });

    const result = substituteStepValue(step, 0, row, stepToColumn, columnMap);

    expect(result.originalValue).toBe('original');
  });

  it('should not mutate original step', () => {
    const step = createStep({ label: 'Search', value: 'original' });
    const originalValue = step.value;

    substituteStepValue(step, 0, row, stepToColumn, columnMap);

    expect(step.value).toBe(originalValue);
  });
});

// ============================================================================
// substituteVariables TESTS
// ============================================================================

describe('substituteVariables', () => {
  const headers = ['name', 'greeting', 'place'];
  const row = ['World', 'Hello', 'Wonderland'];
  const columnMap = buildColumnIndexMap(headers);

  it('should substitute single variable', () => {
    const text = 'Hello {{name}}!';

    const result = substituteVariables(text, row, columnMap);

    expect(result).toBe('Hello World!');
  });

  it('should substitute multiple variables', () => {
    const text = '{{greeting}} {{name}}, welcome to {{place}}!';

    const result = substituteVariables(text, row, columnMap);

    expect(result).toBe('Hello World, welcome to Wonderland!');
  });

  it('should leave unmatched variables unchanged', () => {
    const text = 'Hello {{name}}, your code is {{code}}';

    const result = substituteVariables(text, row, columnMap);

    expect(result).toBe('Hello World, your code is {{code}}');
  });

  it('should handle text without variables', () => {
    const text = 'No variables here';

    const result = substituteVariables(text, row, columnMap);

    expect(result).toBe('No variables here');
  });

  it('should handle empty text', () => {
    const result = substituteVariables('', row, columnMap);

    expect(result).toBe('');
  });

  it('should handle adjacent variables', () => {
    const text = '{{greeting}}{{name}}{{place}}';

    const result = substituteVariables(text, row, columnMap);

    expect(result).toBe('HelloWorldWonderland');
  });

  it('should handle case-insensitive variable matching', () => {
    const text = 'Value: {{NAME}}';

    const result = substituteVariables(text, row, columnMap);

    expect(result).toBe('Value: World');
  });
});

// ============================================================================
// substituteSearchTerms TESTS
// ============================================================================

describe('substituteSearchTerms', () => {
  const headers = ['btn1', 'btn2'];
  const row = ['Allow', 'Continue'];
  const columnMap = buildColumnIndexMap(headers);

  it('should substitute variables in search terms', () => {
    const terms = ['{{btn1}}', '{{btn2}}', 'Keep'];

    const result = substituteSearchTerms(terms, row, columnMap);

    expect(result).toEqual(['Allow', 'Continue', 'Keep']);
  });

  it('should handle terms without variables', () => {
    const terms = ['Static', 'Terms'];

    const result = substituteSearchTerms(terms, row, columnMap);

    expect(result).toEqual(['Static', 'Terms']);
  });
});

// ============================================================================
// getStepsForRow TESTS
// ============================================================================

describe('getStepsForRow', () => {
  const allSteps: Step[] = [
    createStep({ id: 1, label: 'Open' }),
    createStep({ id: 2, label: 'Login' }),
    createStep({ id: 3, label: 'Navigate' }),
    createStep({ id: 4, label: 'Search' }),
    createStep({ id: 5, label: 'Submit' }),
  ];

  it('should return all steps for first row (row 0)', () => {
    const steps = getStepsForRow(allSteps, 3, 0);

    expect(steps).toHaveLength(5);
    expect(steps.map((s) => s.id)).toEqual([1, 2, 3, 4, 5]);
  });

  it('should return steps from loopStartIndex for subsequent rows', () => {
    const steps = getStepsForRow(allSteps, 3, 1);

    expect(steps).toHaveLength(2);
    expect(steps.map((s) => s.id)).toEqual([4, 5]);
  });

  it('should handle loopStartIndex of 0 (all steps every row)', () => {
    const steps = getStepsForRow(allSteps, 0, 2);

    expect(steps).toHaveLength(5);
  });

  it('should handle loopStartIndex at last step', () => {
    const steps = getStepsForRow(allSteps, 4, 1);

    expect(steps).toHaveLength(1);
    expect(steps[0].id).toBe(5);
  });

  it('should return empty array if loopStartIndex exceeds steps length', () => {
    const steps = getStepsForRow(allSteps, 10, 1);

    expect(steps).toHaveLength(0);
  });
});

// ============================================================================
// getAbsoluteStepIndex TESTS
// ============================================================================

describe('getAbsoluteStepIndex', () => {
  it('should return relative index for first row', () => {
    expect(getAbsoluteStepIndex(0, 3, 0)).toBe(0);
    expect(getAbsoluteStepIndex(2, 3, 0)).toBe(2);
  });

  it('should add loop start offset for subsequent rows', () => {
    expect(getAbsoluteStepIndex(0, 3, 1)).toBe(3);
    expect(getAbsoluteStepIndex(1, 3, 1)).toBe(4);
    expect(getAbsoluteStepIndex(2, 3, 2)).toBe(5);
  });
});

// ============================================================================
// processStepsForRow TESTS
// ============================================================================

describe('processStepsForRow', () => {
  it('should process first row with all steps', () => {
    const recording = createRecording({
      steps: [
        createStep({ label: 'Search', value: '' }),
        createStep({ label: 'Search', value: '' }),
      ],
      parsedFields: [
        createParsedField('Search_0', 'Search', 0),
        createParsedField('Search_1', 'Search', 1),
      ],
      loopStartIndex: 0,
    });

    const row = ['cats', 'dogs'];
    const headers = ['Search_0', 'Search_1'];
    const stepToColumn = buildColumnMappingFromRecording(recording);
    const columnMap = buildColumnIndexMap(headers);

    const result = processStepsForRow(recording, row, 0, stepToColumn, columnMap);

    expect(result).toHaveLength(2);
    expect(result[0].value).toBe('cats');
    expect(result[1].value).toBe('dogs');
  });

  it('should process subsequent rows from loop start', () => {
    const recording = createRecording({
      steps: [
        createStep({ label: 'Setup', value: '' }),
        createStep({ label: 'Search', value: '' }),
        createStep({ label: 'Search', value: '' }),
      ],
      parsedFields: [
        createParsedField('Search_0', 'Search', 0),
        createParsedField('Search_1', 'Search', 1),
      ],
      loopStartIndex: 1,
    });

    const row = ['birds', 'fish'];
    const headers = ['Search_0', 'Search_1'];
    const stepToColumn = buildColumnMappingFromRecording(recording);
    const columnMap = buildColumnIndexMap(headers);

    const result = processStepsForRow(recording, row, 1, stepToColumn, columnMap);

    // Should only have 2 steps (skipped setup)
    expect(result).toHaveLength(2);
    expect(result[0].value).toBe('birds');
    expect(result[1].value).toBe('fish');
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('CSV Position Mapping Integration', () => {
  describe('Duplicate column scenario (6 Search columns)', () => {
    const steps: Step[] = [
      createStep({ id: 1, event: 'open', label: '' }),
      createStep({ id: 2, event: 'input', label: 'Search' }),
      createStep({ id: 3, event: 'input', label: 'Search' }),
      createStep({ id: 4, event: 'open', label: '' }),
      createStep({ id: 5, event: 'input', label: 'Search' }),
      createStep({ id: 6, event: 'input', label: 'Search' }),
      createStep({ id: 7, event: 'open', label: '' }),
      createStep({ id: 8, event: 'input', label: 'Search' }),
      createStep({ id: 9, event: 'input', label: 'Search' }),
      createStep({ id: 10, event: 'open', label: '' }),
    ];

    const parsedFields: ParsedField[] = [
      createParsedField('Search_0', 'Search', 0),
      createParsedField('Search_1', 'Search', 1),
      createParsedField('Search_2', 'Search', 2),
      createParsedField('Search_3', 'Search', 3),
      createParsedField('Search_4', 'Search', 4),
      createParsedField('Search_5', 'Search', 5),
    ];

    it('should build correct position mapping', () => {
      const recording = createRecording({ steps, parsedFields });
      const mapping = buildColumnMappingFromRecording(recording);

      expect(mapping[0]).toBeUndefined();
      expect(mapping[1]).toBe('Search_0');
      expect(mapping[2]).toBe('Search_1');
      expect(mapping[3]).toBeUndefined();
      expect(mapping[4]).toBe('Search_2');
      expect(mapping[5]).toBe('Search_3');
      expect(mapping[6]).toBeUndefined();
      expect(mapping[7]).toBe('Search_4');
      expect(mapping[8]).toBe('Search_5');
      expect(mapping[9]).toBeUndefined();
    });

    it('should inject correct values for row 1', () => {
      const recording = createRecording({
        steps,
        parsedFields,
        loopStartIndex: 3,
      });
      const row = ['cat', 'cat', 'chimp', 'chimp', 'mirror', 'mirror'];
      const headers = ['Search_0', 'Search_1', 'Search_2', 'Search_3', 'Search_4', 'Search_5'];
      
      const stepToColumn = buildColumnMappingFromRecording(recording);
      const columnMap = buildColumnIndexMap(headers);
      const result = processStepsForRow(recording, row, 0, stepToColumn, columnMap);

      // Find steps by ID
      const step2 = result.find((s) => s.id === 2);
      const step3 = result.find((s) => s.id === 3);
      const step5 = result.find((s) => s.id === 5);
      const step6 = result.find((s) => s.id === 6);
      const step8 = result.find((s) => s.id === 8);
      const step9 = result.find((s) => s.id === 9);

      expect(step2?.value).toBe('cat');
      expect(step3?.value).toBe('cat');
      expect(step5?.value).toBe('chimp');
      expect(step6?.value).toBe('chimp');
      expect(step8?.value).toBe('mirror');
      expect(step9?.value).toBe('mirror');
    });
  });

  describe('Performance', () => {
    it('should handle large number of steps efficiently', () => {
      const stepCount = 100;
      const steps: Step[] = Array.from({ length: stepCount }, (_, i) =>
        createStep({ label: `Field${i}` })
      );
      const parsedFields: ParsedField[] = Array.from({ length: stepCount }, (_, i) =>
        createParsedField(`Field${i}`, `Field${i}`, i)
      );

      const recording = createRecording({ steps, parsedFields });

      const start = performance.now();
      const mapping = buildColumnMappingFromRecording(recording);
      const elapsed = performance.now() - start;

      expect(Object.keys(mapping)).toHaveLength(stepCount);
      expect(elapsed).toBeLessThan(100);
    });
  });
});
