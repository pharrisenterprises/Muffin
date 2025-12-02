# TST-009: CSV Position Mapping Tests

> **Build Card:** TST-009  
> **Category:** Testing & Validation  
> **Dependencies:** ENG-016, FND-010, FND-011  
> **Risk Level:** Medium  
> **Estimated Lines:** 220-260

---

## 1. PURPOSE

Create comprehensive unit tests for the CSV position mapping functionality. These tests verify that CSV columns are correctly mapped to step variables, the loop start index correctly determines which steps receive CSV data on subsequent rows, variable substitution works in step values, and edge cases like empty cells and missing columns are handled properly. Essential for reliable CSV-driven automation.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| ENG-016 Spec | `build-instructions/masterplan/03-engine/ENG-016_csv-position-mapping.md` | Mapping logic |
| Recording Interface | `src/types/recording.types.ts` | loopStartIndex field |
| Step Interface | `src/types/step.types.ts` | value field with variables |
| CSV Parser | `src/lib/csvParser.ts` | Parsing functions |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/lib/__tests__/csvPositionMapping.test.ts` | CREATE | +200 |
| `src/lib/__tests__/fixtures/csv-data.fixture.ts` | CREATE | +60 |

### Artifacts

- CSV position mapping test suite
- CSV data fixtures for various scenarios
- Variable substitution tests

---

## 4. DETAILED SPECIFICATION

### 4.1 Test File Structure

```typescript
// src/lib/__tests__/csvPositionMapping.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  buildStepToColumnMapping,
  substituteVariables,
  getStepsForRow,
  mapCsvRowToSteps,
} from '../csvPositionMapping';
import {
  simpleCSV,
  multiColumnCSV,
  csvWithEmptyCells,
  csvWithSpecialChars,
  singleRowCSV,
  manyColumnsCSV,
} from './fixtures/csv-data.fixture';

describe('CSV Position Mapping', () => {
  // Test suites defined below...
});
```

### 4.2 CSV Data Fixtures

```typescript
// src/lib/__tests__/fixtures/csv-data.fixture.ts

/**
 * Simple 2-column CSV
 */
export const simpleCSV = {
  headers: ['name', 'email'],
  rows: [
    ['John Doe', 'john@example.com'],
    ['Jane Smith', 'jane@example.com'],
    ['Bob Wilson', 'bob@example.com'],
  ],
};

/**
 * Multi-column CSV with various data types
 */
export const multiColumnCSV = {
  headers: ['firstName', 'lastName', 'email', 'phone', 'amount'],
  rows: [
    ['John', 'Doe', 'john@example.com', '555-1234', '100.00'],
    ['Jane', 'Smith', 'jane@example.com', '555-5678', '250.50'],
    ['Bob', 'Wilson', 'bob@example.com', '555-9012', '75.25'],
  ],
};

/**
 * CSV with empty cells
 */
export const csvWithEmptyCells = {
  headers: ['name', 'email', 'phone'],
  rows: [
    ['John Doe', 'john@example.com', '555-1234'],
    ['Jane Smith', '', '555-5678'],         // Empty email
    ['', 'bob@example.com', ''],            // Empty name and phone
  ],
};

/**
 * CSV with special characters
 */
export const csvWithSpecialChars = {
  headers: ['name', 'description', 'code'],
  rows: [
    ['Test "Quoted"', 'Has, comma', 'A&B'],
    ['Line\nBreak', 'Tab\there', '<script>'],
    ['Unicode: 日本語', 'Emoji: 🎉', '{{var}}'],
  ],
};

/**
 * Single row CSV (no looping)
 */
export const singleRowCSV = {
  headers: ['username', 'password'],
  rows: [
    ['admin', 'secret123'],
  ],
};

/**
 * Many columns CSV
 */
export const manyColumnsCSV = {
  headers: Array.from({ length: 20 }, (_, i) => `col${i + 1}`),
  rows: [
    Array.from({ length: 20 }, (_, i) => `value${i + 1}`),
  ],
};

/**
 * Sample steps for testing
 */
export const sampleSteps = [
  {
    id: 'step-1',
    label: 'Open page',
    event: 'open',
    path: 'https://example.com',
    value: '',
    recordedVia: 'dom',
  },
  {
    id: 'step-2',
    label: 'Enter name',
    event: 'input',
    path: '#name-field',
    value: '{{name}}',
    recordedVia: 'dom',
  },
  {
    id: 'step-3',
    label: 'Enter email',
    event: 'input',
    path: '#email-field',
    value: '{{email}}',
    recordedVia: 'dom',
  },
  {
    id: 'step-4',
    label: 'Submit',
    event: 'click',
    path: '#submit-btn',
    value: '',
    recordedVia: 'dom',
  },
];

/**
 * Steps with loop start at step 2
 */
export const stepsWithLoopStart = {
  steps: sampleSteps,
  loopStartIndex: 1, // Loop starts at "Enter name"
};
```

### 4.3 Column Mapping Tests

```typescript
describe('buildStepToColumnMapping()', () => {
  it('should map step variables to CSV columns', () => {
    const mapping = buildStepToColumnMapping(
      sampleSteps,
      simpleCSV.headers
    );
    
    expect(mapping).toEqual({
      'step-2': { variable: 'name', columnIndex: 0 },
      'step-3': { variable: 'email', columnIndex: 1 },
    });
  });

  it('should handle steps without variables', () => {
    const stepsNoVars = [
      { id: 'step-1', value: '', event: 'click', path: '#btn' },
      { id: 'step-2', value: 'static text', event: 'input', path: '#field' },
    ];
    
    const mapping = buildStepToColumnMapping(stepsNoVars, simpleCSV.headers);
    
    expect(mapping).toEqual({});
  });

  it('should match variable names case-insensitively', () => {
    const steps = [
      { id: 'step-1', value: '{{NAME}}', event: 'input', path: '#field' },
    ];
    
    const mapping = buildStepToColumnMapping(steps, ['name']);
    
    expect(mapping['step-1'].columnIndex).toBe(0);
  });

  it('should handle multiple variables in same step', () => {
    const steps = [
      { id: 'step-1', value: '{{firstName}} {{lastName}}', event: 'input', path: '#field' },
    ];
    
    const mapping = buildStepToColumnMapping(steps, multiColumnCSV.headers);
    
    expect(mapping['step-1']).toBeDefined();
    // Should map to first variable or handle as complex
  });

  it('should return empty mapping for no matching columns', () => {
    const steps = [
      { id: 'step-1', value: '{{nonexistent}}', event: 'input', path: '#field' },
    ];
    
    const mapping = buildStepToColumnMapping(steps, simpleCSV.headers);
    
    expect(mapping).toEqual({});
  });

  it('should handle many columns efficiently', () => {
    const steps = [
      { id: 'step-1', value: '{{col10}}', event: 'input', path: '#field' },
      { id: 'step-2', value: '{{col20}}', event: 'input', path: '#field2' },
    ];
    
    const mapping = buildStepToColumnMapping(steps, manyColumnsCSV.headers);
    
    expect(mapping['step-1'].columnIndex).toBe(9);  // col10 is index 9
    expect(mapping['step-2'].columnIndex).toBe(19); // col20 is index 19
  });
});
```

### 4.4 Variable Substitution Tests

```typescript
describe('substituteVariables()', () => {
  it('should replace single variable with CSV value', () => {
    const result = substituteVariables(
      '{{name}}',
      { name: 'John Doe' }
    );
    
    expect(result).toBe('John Doe');
  });

  it('should replace multiple variables', () => {
    const result = substituteVariables(
      '{{firstName}} {{lastName}}',
      { firstName: 'John', lastName: 'Doe' }
    );
    
    expect(result).toBe('John Doe');
  });

  it('should preserve text around variables', () => {
    const result = substituteVariables(
      'Hello, {{name}}! Your email is {{email}}.',
      { name: 'John', email: 'john@example.com' }
    );
    
    expect(result).toBe('Hello, John! Your email is john@example.com.');
  });

  it('should leave unmatched variables unchanged', () => {
    const result = substituteVariables(
      '{{name}} - {{unknown}}',
      { name: 'John' }
    );
    
    expect(result).toBe('John - {{unknown}}');
  });

  it('should handle empty values', () => {
    const result = substituteVariables(
      '{{name}}',
      { name: '' }
    );
    
    expect(result).toBe('');
  });

  it('should handle special characters in values', () => {
    const result = substituteVariables(
      '{{description}}',
      { description: 'Has, comma and "quotes"' }
    );
    
    expect(result).toBe('Has, comma and "quotes"');
  });

  it('should handle no variables in template', () => {
    const result = substituteVariables(
      'Static text only',
      { name: 'John' }
    );
    
    expect(result).toBe('Static text only');
  });

  it('should be case-insensitive for variable names', () => {
    const result = substituteVariables(
      '{{NAME}} {{Email}}',
      { name: 'John', email: 'john@example.com' }
    );
    
    expect(result).toBe('John john@example.com');
  });
});
```

### 4.5 Loop Start Index Tests

```typescript
describe('getStepsForRow()', () => {
  const { steps, loopStartIndex } = stepsWithLoopStart;

  it('should return all steps for first row', () => {
    const stepsForRow = getStepsForRow(steps, loopStartIndex, 0);
    
    expect(stepsForRow).toHaveLength(4);
    expect(stepsForRow[0].id).toBe('step-1');
  });

  it('should skip steps before loopStartIndex for subsequent rows', () => {
    const stepsForRow = getStepsForRow(steps, loopStartIndex, 1);
    
    expect(stepsForRow).toHaveLength(3);
    expect(stepsForRow[0].id).toBe('step-2'); // Starts at loop start
  });

  it('should handle loopStartIndex of 0 (no skip)', () => {
    const stepsForRow = getStepsForRow(steps, 0, 1);
    
    expect(stepsForRow).toHaveLength(4);
    expect(stepsForRow[0].id).toBe('step-1');
  });

  it('should handle loopStartIndex at last step', () => {
    const stepsForRow = getStepsForRow(steps, 3, 1);
    
    expect(stepsForRow).toHaveLength(1);
    expect(stepsForRow[0].id).toBe('step-4');
  });

  it('should handle loopStartIndex beyond steps length', () => {
    const stepsForRow = getStepsForRow(steps, 10, 1);
    
    expect(stepsForRow).toHaveLength(0);
  });

  it('should return empty array for empty steps', () => {
    const stepsForRow = getStepsForRow([], 0, 0);
    
    expect(stepsForRow).toHaveLength(0);
  });
});
```

### 4.6 Full Mapping Integration Tests

```typescript
describe('mapCsvRowToSteps()', () => {
  it('should map CSV row to steps with substituted values', () => {
    const result = mapCsvRowToSteps(
      sampleSteps,
      simpleCSV.headers,
      simpleCSV.rows[0], // ['John Doe', 'john@example.com']
      0 // Row index
    );
    
    const nameStep = result.find(s => s.id === 'step-2');
    const emailStep = result.find(s => s.id === 'step-3');
    
    expect(nameStep?.value).toBe('John Doe');
    expect(emailStep?.value).toBe('john@example.com');
  });

  it('should not modify steps without variables', () => {
    const result = mapCsvRowToSteps(
      sampleSteps,
      simpleCSV.headers,
      simpleCSV.rows[0],
      0
    );
    
    const openStep = result.find(s => s.id === 'step-1');
    const submitStep = result.find(s => s.id === 'step-4');
    
    expect(openStep?.value).toBe('');
    expect(submitStep?.value).toBe('');
  });

  it('should handle different rows correctly', () => {
    const row1Result = mapCsvRowToSteps(
      sampleSteps,
      simpleCSV.headers,
      simpleCSV.rows[0],
      0
    );
    
    const row2Result = mapCsvRowToSteps(
      sampleSteps,
      simpleCSV.headers,
      simpleCSV.rows[1],
      1
    );
    
    expect(row1Result.find(s => s.id === 'step-2')?.value).toBe('John Doe');
    expect(row2Result.find(s => s.id === 'step-2')?.value).toBe('Jane Smith');
  });

  it('should handle empty cells in CSV', () => {
    const result = mapCsvRowToSteps(
      sampleSteps,
      csvWithEmptyCells.headers,
      csvWithEmptyCells.rows[1], // ['Jane Smith', '', '555-5678']
      1
    );
    
    const emailStep = result.find(s => s.id === 'step-3');
    
    expect(emailStep?.value).toBe('');
  });

  it('should not mutate original steps', () => {
    const originalValue = sampleSteps[1].value;
    
    mapCsvRowToSteps(
      sampleSteps,
      simpleCSV.headers,
      simpleCSV.rows[0],
      0
    );
    
    expect(sampleSteps[1].value).toBe(originalValue);
  });
});
```

### 4.7 Edge Case Tests

```typescript
describe('Edge Cases', () => {
  it('should handle CSV with more columns than variables', () => {
    const steps = [
      { id: 'step-1', value: '{{firstName}}', event: 'input', path: '#field' },
    ];
    
    const result = mapCsvRowToSteps(
      steps,
      multiColumnCSV.headers,
      multiColumnCSV.rows[0],
      0
    );
    
    expect(result[0].value).toBe('John');
  });

  it('should handle CSV with fewer columns than variables', () => {
    const steps = [
      { id: 'step-1', value: '{{name}}', event: 'input', path: '#field' },
      { id: 'step-2', value: '{{nonexistent}}', event: 'input', path: '#field2' },
    ];
    
    const result = mapCsvRowToSteps(
      steps,
      simpleCSV.headers,
      simpleCSV.rows[0],
      0
    );
    
    expect(result[0].value).toBe('John Doe');
    expect(result[1].value).toBe('{{nonexistent}}'); // Unchanged
  });

  it('should handle special characters in CSV values', () => {
    const steps = [
      { id: 'step-1', value: '{{description}}', event: 'input', path: '#field' },
    ];
    
    const result = mapCsvRowToSteps(
      steps,
      csvWithSpecialChars.headers,
      csvWithSpecialChars.rows[0], // ['Test "Quoted"', 'Has, comma', 'A&B']
      0
    );
    
    expect(result[0].value).toBe('Has, comma');
  });

  it('should handle unicode in CSV values', () => {
    const steps = [
      { id: 'step-1', value: '{{name}}', event: 'input', path: '#field' },
    ];
    
    const result = mapCsvRowToSteps(
      steps,
      csvWithSpecialChars.headers,
      csvWithSpecialChars.rows[2], // ['Unicode: 日本語', 'Emoji: 🎉', '{{var}}']
      2
    );
    
    expect(result[0].value).toBe('Unicode: 日本語');
  });

  it('should handle variable-like strings in CSV values', () => {
    const steps = [
      { id: 'step-1', value: '{{code}}', event: 'input', path: '#field' },
    ];
    
    const result = mapCsvRowToSteps(
      steps,
      csvWithSpecialChars.headers,
      csvWithSpecialChars.rows[2], // Contains '{{var}}' as a value
      2
    );
    
    // Should substitute with literal '{{var}}' string
    expect(result[0].value).toBe('{{var}}');
  });

  it('should handle single row CSV (no loop needed)', () => {
    const steps = [
      { id: 'step-1', value: '{{username}}', event: 'input', path: '#user' },
      { id: 'step-2', value: '{{password}}', event: 'input', path: '#pass' },
    ];
    
    const result = mapCsvRowToSteps(
      steps,
      singleRowCSV.headers,
      singleRowCSV.rows[0],
      0
    );
    
    expect(result[0].value).toBe('admin');
    expect(result[1].value).toBe('secret123');
  });

  it('should handle empty CSV row', () => {
    const steps = [
      { id: 'step-1', value: '{{name}}', event: 'input', path: '#field' },
    ];
    
    const result = mapCsvRowToSteps(
      steps,
      simpleCSV.headers,
      ['', ''], // Empty row
      0
    );
    
    expect(result[0].value).toBe('');
  });
});
```

### 4.8 Performance Tests

```typescript
describe('Performance', () => {
  it('should handle large CSV efficiently', () => {
    const largeHeaders = Array.from({ length: 100 }, (_, i) => `col${i}`);
    const largeRow = Array.from({ length: 100 }, (_, i) => `value${i}`);
    const steps = Array.from({ length: 50 }, (_, i) => ({
      id: `step-${i}`,
      value: `{{col${i * 2}}}`,
      event: 'input',
      path: `#field${i}`,
    }));
    
    const start = Date.now();
    
    for (let i = 0; i < 1000; i++) {
      mapCsvRowToSteps(steps, largeHeaders, largeRow, i % 10);
    }
    
    const duration = Date.now() - start;
    
    // Should complete 1000 mappings in under 1 second
    expect(duration).toBeLessThan(1000);
  });

  it('should cache column mapping for repeated calls', () => {
    const mapping1 = buildStepToColumnMapping(sampleSteps, simpleCSV.headers);
    const mapping2 = buildStepToColumnMapping(sampleSteps, simpleCSV.headers);
    
    // Should return equivalent results
    expect(mapping1).toEqual(mapping2);
  });
});
```

---

## 5. TEST EXECUTION

### 5.1 Running Tests

```bash
# Run only CSV mapping tests
npm run test -- csvPositionMapping.test.ts

# Run with coverage
npm run test -- csvPositionMapping.test.ts --coverage

# Run all mapping tests
npm run test -- mapping
```

### 5.2 Expected Output

```
 ✓ CSV Position Mapping
   ✓ buildStepToColumnMapping() (6 tests)
   ✓ substituteVariables() (8 tests)
   ✓ getStepsForRow() (6 tests)
   ✓ mapCsvRowToSteps() (5 tests)
   ✓ Edge Cases (8 tests)
   ✓ Performance (2 tests)

Test Files  1 passed (1)
Tests       35 passed (35)
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** Column mapping builds correctly
- [ ] **AC-2:** Variable substitution works
- [ ] **AC-3:** Case-insensitive matching works
- [ ] **AC-4:** Loop start index respected
- [ ] **AC-5:** Empty cells handled
- [ ] **AC-6:** Special characters preserved
- [ ] **AC-7:** Unicode supported
- [ ] **AC-8:** Original steps not mutated
- [ ] **AC-9:** Performance acceptable
- [ ] **AC-10:** Test coverage > 90%

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Immutability** - Never mutate original steps
2. **Case handling** - Variable names case-insensitive
3. **Performance** - Must handle 1000+ rows

### Patterns to Follow

1. **Deep clone** - Clone steps before modifying
2. **Regex matching** - Use for variable extraction
3. **Index mapping** - Pre-compute column indices

### Edge Cases

1. **No variables** - Return steps unchanged
2. **Missing columns** - Leave variable as-is
3. **Empty values** - Replace with empty string

---

## 8. VERIFICATION COMMANDS

```bash
# Verify test file creation
ls -la src/lib/__tests__/csvPositionMapping.test.ts

# Verify fixtures
ls -la src/lib/__tests__/fixtures/csv-data.fixture.ts

# Run tests
npm run test -- csvPositionMapping.test.ts

# Check coverage
npm run test -- csvPositionMapping.test.ts --coverage
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Remove test file
rm src/lib/__tests__/csvPositionMapping.test.ts

# Remove fixtures
rm src/lib/__tests__/fixtures/csv-data.fixture.ts
```

---

## 10. REFERENCES

- ENG-016: CSV Position Mapping
- FND-010: Step Interface Extension
- FND-011: Recording Interface Extension (loopStartIndex)
- Feature Spec: `/future-spec/03_feature-specs.md` Section 1.1

---

*End of Specification TST-009*
