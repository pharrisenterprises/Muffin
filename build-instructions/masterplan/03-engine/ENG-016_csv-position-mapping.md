# ENG-016: CSV Position Mapping

> **Build Card:** ENG-016  
> **Category:** Core Engine  
> **Dependencies:** FND-010, FND-011, DAT-001  
> **Risk Level:** Low  
> **Estimated Lines:** 350-420

---

## 1. PURPOSE

Implement the CSV position-based mapping system that substitutes variables in step values based on CSV column positions rather than header names. This enables automation workflows where CSV headers may vary but column positions remain consistent. The system supports both named (`{{columnName}}`) and positional (`{{$1}}`, `{{$2}}`) variable syntax, with automatic mapping between the two.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| Step Interface | `src/types/step.types.ts` | Step value field |
| Recording Interface | `src/types/recording.types.ts` | CSV data structure |
| Feature Specs | `/future-spec/03_feature-specs.md` | CSV variable requirements |
| Data Layer Spec | `/future-spec/05_data-layer.md` | CSV storage format |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/lib/csvPositionMapper.ts` | CREATE | ~200 |
| `src/types/csv.types.ts` | CREATE | ~50 |
| `src/lib/playbackEngine.ts` | MODIFY | +25 |

### Artifacts

- `CSVPositionMapper` class created
- `CSVMapping` interface defined
- Variable substitution utilities
- Position-to-name mapping functions

---

## 4. DETAILED SPECIFICATION

### 4.1 Type Definitions

```typescript
// In src/types/csv.types.ts

/**
 * Represents a parsed CSV file with headers and data rows
 */
export interface ParsedCSV {
  /** Column headers (first row) */
  headers: string[];
  
  /** Data rows (excluding header) */
  rows: string[][];
  
  /** Number of columns */
  columnCount: number;
  
  /** Number of data rows (excluding header) */
  rowCount: number;
}

/**
 * Mapping between position and name for CSV columns
 */
export interface CSVColumnMapping {
  /** Zero-based position index */
  position: number;
  
  /** One-based position for display ({{$1}}, {{$2}}) */
  displayPosition: number;
  
  /** Header name (if available) */
  headerName: string;
  
  /** Normalized key for lookup */
  normalizedKey: string;
}

/**
 * Complete CSV mapping configuration
 */
export interface CSVMapping {
  /** All column mappings */
  columns: CSVColumnMapping[];
  
  /** Quick lookup by position */
  byPosition: Map<number, CSVColumnMapping>;
  
  /** Quick lookup by header name (case-insensitive) */
  byName: Map<string, CSVColumnMapping>;
}

/**
 * Options for variable substitution
 */
export interface SubstitutionOptions {
  /** Current row index (zero-based) */
  rowIndex: number;
  
  /** Whether to throw on missing variables */
  strict?: boolean;
  
  /** Default value for missing variables */
  defaultValue?: string;
  
  /** Whether to trim whitespace from values */
  trimValues?: boolean;
}

/**
 * Result of variable substitution
 */
export interface SubstitutionResult {
  /** The substituted string */
  value: string;
  
  /** Variables that were substituted */
  substituted: Array<{
    variable: string;
    position: number;
    value: string;
  }>;
  
  /** Variables that were not found */
  missing: string[];
  
  /** Whether all variables were resolved */
  complete: boolean;
}
```

### 4.2 CSVPositionMapper Class

```typescript
// In src/lib/csvPositionMapper.ts

import { 
  ParsedCSV, 
  CSVMapping, 
  CSVColumnMapping,
  SubstitutionOptions,
  SubstitutionResult 
} from '@/types/csv.types';

/**
 * Variable pattern matching
 * Supports: {{columnName}}, {{$1}}, {{$2}}, etc.
 */
const VARIABLE_PATTERN = /\{\{(\$?\w+)\}\}/g;
const POSITION_PATTERN = /^\$(\d+)$/;

/**
 * CSV Position Mapper
 * Handles variable substitution using both named and positional references
 */
export class CSVPositionMapper {
  private csv: ParsedCSV;
  private mapping: CSVMapping;

  constructor(csv: ParsedCSV) {
    this.csv = csv;
    this.mapping = this.buildMapping(csv.headers);
  }

  /**
   * Builds column mapping from headers
   */
  private buildMapping(headers: string[]): CSVMapping {
    const columns: CSVColumnMapping[] = headers.map((header, index) => ({
      position: index,
      displayPosition: index + 1,
      headerName: header,
      normalizedKey: this.normalizeKey(header)
    }));

    const byPosition = new Map<number, CSVColumnMapping>();
    const byName = new Map<string, CSVColumnMapping>();

    columns.forEach(col => {
      byPosition.set(col.position, col);
      byPosition.set(col.displayPosition, col); // Also map 1-based
      byName.set(col.normalizedKey, col);
      byName.set(col.headerName.toLowerCase(), col);
    });

    return { columns, byPosition, byName };
  }

  /**
   * Normalizes a header key for consistent lookup
   */
  private normalizeKey(header: string): string {
    return header
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  }

  /**
   * Gets the CSV mapping configuration
   */
  getMapping(): CSVMapping {
    return this.mapping;
  }

  /**
   * Gets a value by column position (1-based)
   */
  getValueByPosition(position: number, rowIndex: number): string | undefined {
    const zeroBasedPos = position - 1;
    if (zeroBasedPos < 0 || zeroBasedPos >= this.csv.columnCount) {
      return undefined;
    }
    if (rowIndex < 0 || rowIndex >= this.csv.rowCount) {
      return undefined;
    }
    return this.csv.rows[rowIndex][zeroBasedPos];
  }

  /**
   * Gets a value by column name
   */
  getValueByName(name: string, rowIndex: number): string | undefined {
    const mapping = this.mapping.byName.get(name.toLowerCase()) ||
                    this.mapping.byName.get(this.normalizeKey(name));
    
    if (!mapping) {
      return undefined;
    }
    
    return this.getValueByPosition(mapping.displayPosition, rowIndex);
  }

  /**
   * Resolves a variable reference to its value
   */
  resolveVariable(variable: string, rowIndex: number): string | undefined {
    // Check if it's a positional reference (e.g., $1, $2)
    const posMatch = variable.match(POSITION_PATTERN);
    if (posMatch) {
      const position = parseInt(posMatch[1], 10);
      return this.getValueByPosition(position, rowIndex);
    }

    // Otherwise treat as column name
    return this.getValueByName(variable, rowIndex);
  }

  /**
   * Substitutes all variables in a string
   */
  substitute(template: string, options: SubstitutionOptions): SubstitutionResult {
    const { rowIndex, strict = false, defaultValue = '', trimValues = true } = options;
    
    const result: SubstitutionResult = {
      value: template,
      substituted: [],
      missing: [],
      complete: true
    };

    // No variables in template
    if (!template.includes('{{')) {
      return result;
    }

    result.value = template.replace(VARIABLE_PATTERN, (match, variable) => {
      const rawValue = this.resolveVariable(variable, rowIndex);
      
      if (rawValue === undefined) {
        result.missing.push(variable);
        result.complete = false;
        
        if (strict) {
          throw new Error(`CSV variable "${variable}" not found`);
        }
        
        return defaultValue;
      }

      const value = trimValues ? rawValue.trim() : rawValue;
      
      // Find position for reporting
      const mapping = this.mapping.byName.get(variable.toLowerCase()) ||
                      this.mapping.byName.get(this.normalizeKey(variable));
      const position = mapping?.displayPosition || 0;

      result.substituted.push({
        variable,
        position,
        value
      });

      return value;
    });

    return result;
  }

  /**
   * Substitutes variables in all step values for a row
   */
  substituteStepValues(
    step: { value?: string; [key: string]: unknown },
    rowIndex: number,
    options: Partial<SubstitutionOptions> = {}
  ): { step: typeof step; result: SubstitutionResult } {
    const substitutedStep = { ...step };
    let combinedResult: SubstitutionResult = {
      value: '',
      substituted: [],
      missing: [],
      complete: true
    };

    // Substitute main value
    if (step.value && typeof step.value === 'string') {
      const result = this.substitute(step.value, { rowIndex, ...options });
      substitutedStep.value = result.value;
      combinedResult = this.mergeResults(combinedResult, result);
    }

    // Check for other string fields that might have variables
    const stringFields = ['inputText', 'visionTarget', 'optionText'];
    for (const field of stringFields) {
      if (step[field] && typeof step[field] === 'string') {
        const result = this.substitute(step[field] as string, { rowIndex, ...options });
        (substitutedStep as Record<string, unknown>)[field] = result.value;
        combinedResult = this.mergeResults(combinedResult, result);
      }
    }

    return { step: substitutedStep, result: combinedResult };
  }

  /**
   * Merges two substitution results
   */
  private mergeResults(a: SubstitutionResult, b: SubstitutionResult): SubstitutionResult {
    return {
      value: b.value, // Use latest value
      substituted: [...a.substituted, ...b.substituted],
      missing: [...new Set([...a.missing, ...b.missing])],
      complete: a.complete && b.complete
    };
  }

  /**
   * Gets all variable references in a template
   */
  static extractVariables(template: string): string[] {
    const matches = template.matchAll(VARIABLE_PATTERN);
    return [...matches].map(m => m[1]);
  }

  /**
   * Checks if a string contains CSV variables
   */
  static hasVariables(template: string): boolean {
    return VARIABLE_PATTERN.test(template);
  }

  /**
   * Creates a mapper from raw CSV string
   */
  static fromCSVString(csvString: string): CSVPositionMapper {
    const lines = csvString.trim().split('\n');
    if (lines.length === 0) {
      throw new Error('CSV is empty');
    }

    const headers = CSVPositionMapper.parseCSVLine(lines[0]);
    const rows = lines.slice(1).map(line => CSVPositionMapper.parseCSVLine(line));

    return new CSVPositionMapper({
      headers,
      rows,
      columnCount: headers.length,
      rowCount: rows.length
    });
  }

  /**
   * Parses a single CSV line (handles quoted values)
   */
  static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current); // Don't forget last field
    return result;
  }

  /**
   * Gets row count
   */
  getRowCount(): number {
    return this.csv.rowCount;
  }

  /**
   * Gets column count
   */
  getColumnCount(): number {
    return this.csv.columnCount;
  }

  /**
   * Gets all headers
   */
  getHeaders(): string[] {
    return [...this.csv.headers];
  }

  /**
   * Gets a specific row as an object
   */
  getRowAsObject(rowIndex: number): Record<string, string> {
    if (rowIndex < 0 || rowIndex >= this.csv.rowCount) {
      return {};
    }

    const row = this.csv.rows[rowIndex];
    const obj: Record<string, string> = {};

    this.csv.headers.forEach((header, index) => {
      obj[header] = row[index] || '';
      // Also add positional keys
      obj[`$${index + 1}`] = row[index] || '';
    });

    return obj;
  }
}
```

### 4.3 PlaybackEngine Integration

```typescript
// In src/lib/playbackEngine.ts - Add CSV variable substitution

import { CSVPositionMapper } from './csvPositionMapper';

// Inside PlaybackEngine class
private csvMapper: CSVPositionMapper | null = null;

/**
 * Loads CSV data for variable substitution
 */
loadCSV(csvData: ParsedCSV): void {
  this.csvMapper = new CSVPositionMapper(csvData);
  console.log(`[PlaybackEngine] Loaded CSV with ${csvData.rowCount} rows, ${csvData.columnCount} columns`);
}

/**
 * Substitutes CSV variables in a step
 */
private substituteCSVVariables(step: Step, rowIndex: number): Step {
  if (!this.csvMapper) {
    return step;
  }

  const { step: substitutedStep, result } = this.csvMapper.substituteStepValues(
    step,
    rowIndex,
    { strict: false, defaultValue: '' }
  );

  if (result.substituted.length > 0) {
    console.log(`[PlaybackEngine] Substituted ${result.substituted.length} variables in step ${step.id}`);
  }

  if (result.missing.length > 0) {
    console.warn(`[PlaybackEngine] Missing variables in step ${step.id}: ${result.missing.join(', ')}`);
  }

  return substitutedStep as Step;
}
```

---

## 5. CODE EXAMPLES

### 5.1 Basic Variable Substitution

```typescript
import { CSVPositionMapper } from '@/lib/csvPositionMapper';

// Create mapper from parsed CSV
const mapper = new CSVPositionMapper({
  headers: ['name', 'email', 'phone'],
  rows: [
    ['John Doe', 'john@example.com', '555-1234'],
    ['Jane Smith', 'jane@example.com', '555-5678']
  ],
  columnCount: 3,
  rowCount: 2
});

// Named variable substitution
const result1 = mapper.substitute(
  'Hello {{name}}, your email is {{email}}',
  { rowIndex: 0 }
);
console.log(result1.value); // "Hello John Doe, your email is john@example.com"

// Positional variable substitution
const result2 = mapper.substitute(
  'Name: {{$1}}, Email: {{$2}}, Phone: {{$3}}',
  { rowIndex: 1 }
);
console.log(result2.value); // "Name: Jane Smith, Email: jane@example.com, Phone: 555-5678"
```

### 5.2 From CSV String

```typescript
const csvString = `name,email,password
john,john@test.com,pass123
jane,jane@test.com,pass456`;

const mapper = CSVPositionMapper.fromCSVString(csvString);

console.log(mapper.getHeaders()); // ['name', 'email', 'password']
console.log(mapper.getRowCount()); // 2

// Get row as object
const row = mapper.getRowAsObject(0);
console.log(row); 
// { name: 'john', email: 'john@test.com', password: 'pass123', '$1': 'john', '$2': 'john@test.com', '$3': 'pass123' }
```

### 5.3 Step Value Substitution

```typescript
const step = {
  id: 'step-1',
  action: 'input',
  value: '{{email}}',
  visionTarget: 'Email Address'
};

const { step: substituted, result } = mapper.substituteStepValues(step, 0);

console.log(substituted.value); // "john@example.com"
console.log(result.substituted); // [{ variable: 'email', position: 2, value: 'john@example.com' }]
```

### 5.4 Mixed Named and Positional Variables

```typescript
// CSV: prompt,status,notes
// Row 0: "Create login form","pending","urgent"

const template = 'Task: {{$1}} ({{status}}) - {{$3}}';
const result = mapper.substitute(template, { rowIndex: 0 });
console.log(result.value); // "Task: Create login form (pending) - urgent"
```

### 5.5 Integration with Playback Loop

```typescript
// In playback loop
const csvMapper = new CSVPositionMapper(loadedCSV);
const loopStartIndex = recording.loopStartIndex || 0;

for (let rowIndex = 0; rowIndex < csvMapper.getRowCount(); rowIndex++) {
  console.log(`Processing CSV row ${rowIndex + 1}/${csvMapper.getRowCount()}`);
  
  // Execute steps, skipping to loopStartIndex for rows > 0
  const startStep = rowIndex === 0 ? 0 : loopStartIndex;
  
  for (let stepIndex = startStep; stepIndex < recording.steps.length; stepIndex++) {
    const originalStep = recording.steps[stepIndex];
    
    // Substitute CSV variables
    const { step: substitutedStep } = csvMapper.substituteStepValues(
      originalStep,
      rowIndex
    );
    
    // Execute substituted step
    await executeStep(substitutedStep);
  }
}
```

### 5.6 Checking for Variables

```typescript
// Check if template has variables
const hasVars = CSVPositionMapper.hasVariables('Hello {{name}}'); // true
const noVars = CSVPositionMapper.hasVariables('Hello world'); // false

// Extract all variables
const vars = CSVPositionMapper.extractVariables('{{name}} - {{$1}} - {{email}}');
console.log(vars); // ['name', '$1', 'email']
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** Named variables `{{columnName}}` substitute correctly
- [ ] **AC-2:** Positional variables `{{$1}}`, `{{$2}}` substitute correctly
- [ ] **AC-3:** Case-insensitive header matching works
- [ ] **AC-4:** Missing variables return default value (non-strict mode)
- [ ] **AC-5:** Missing variables throw error (strict mode)
- [ ] **AC-6:** Quoted CSV values parsed correctly
- [ ] **AC-7:** Row-as-object includes both named and positional keys
- [ ] **AC-8:** Multiple variables in single template work
- [ ] **AC-9:** Empty values handled gracefully
- [ ] **AC-10:** Integration with PlaybackEngine works

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Header uniqueness** - Duplicate headers may cause issues
2. **Column count consistency** - Rows should match header count
3. **Memory efficiency** - Large CSVs loaded entirely into memory

### Patterns to Follow

1. **Immutable steps** - Return new step objects, don't mutate
2. **Dual indexing** - Support both 0-based and 1-based positions
3. **Normalization** - Consistent key formatting for lookups

### Edge Cases

1. **Empty CSV** - Throw error
2. **Missing columns in row** - Return empty string
3. **Special characters in values** - Handle commas, quotes
4. **Unicode in headers** - Normalize consistently
5. **Very long values** - No truncation, handle memory

---

## 8. VERIFICATION COMMANDS

```bash
# Verify file creation
ls -la src/lib/csvPositionMapper.ts
ls -la src/types/csv.types.ts

# Verify exports
grep -n "CSVPositionMapper\|substitute" src/lib/csvPositionMapper.ts

# Verify type definitions
grep -n "ParsedCSV\|CSVMapping\|SubstitutionResult" src/types/csv.types.ts

# Run type check
npm run type-check

# Build extension
npm run build
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Remove new files
rm src/lib/csvPositionMapper.ts
rm src/types/csv.types.ts

# Revert PlaybackEngine changes
git checkout src/lib/playbackEngine.ts
```

---

## 10. REFERENCES

- FND-010: Step Interface Extension
- FND-011: Recording Interface Extension
- DAT-001: IndexedDB Schema v2
- Feature Spec: `/future-spec/03_feature-specs.md` Section 1.3
- Data Layer Spec: `/future-spec/05_data-layer.md` Section 3

---

*End of Specification ENG-016*
