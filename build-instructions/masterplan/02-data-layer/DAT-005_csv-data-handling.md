# DAT-005: CSV DATA HANDLING UPDATES SPECIFICATION

> **Build Card:** DAT-005  
> **Category:** Data Layer  
> **Dependencies:** DAT-003 (Recording Repository), FND-011 (Recording extension)  
> **Risk Level:** Low  
> **Estimated Lines:** ~420

---

## 1. PURPOSE

This specification defines updates to CSV data handling for compatibility with Vision features, specifically the loop start index functionality. The updates include:

1. **Loop-aware row processing** - Skip initial steps for rows 2+
2. **Variable substitution** - Replace placeholders in step values
3. **CSV validation** - Ensure required columns exist
4. **Row iteration utilities** - Helpers for CSV-driven automation
5. **Integration with delaySeconds** - Apply delays during CSV processing

These updates ensure CSV-driven automation works correctly with the new loopStartIndex and per-step delay features.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| FND-011 | Recording extension | loopStartIndex, globalDelayMs |
| DAT-003 | Recording repository | Recording access patterns |
| Feature Specs | `/future-spec/03_feature-specs.md` | CSV loop requirements |
| Existing CSV Logic | Current codebase | Current CSV handling |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `src/lib/csvUtils.ts` | CREATE | CSV utilities and helpers |
| `src/lib/variableSubstitution.ts` | CREATE | Variable replacement logic |

### Exported Functions

| Function | Description |
|----------|-------------|
| `parseCSV` | Parse CSV string to array of objects |
| `validateCSVForRecording` | Check CSV has required columns |
| `getRowsIterator` | Get iterator for CSV rows |
| `substituteVariables` | Replace {{var}} in step values |
| `getStepsForRow` | Get steps to execute for a row |
| `calculateTotalIterations` | Calculate total step executions |

---

## 4. DETAILED SPECIFICATION

### 4.1 Loop Start Index Behavior

The `loopStartIndex` property controls which steps execute for each CSV row:

```
Recording Steps: [Open, Login, Search, Fill Form, Submit]
                   0      1       2        3         4
                              ↑
                        loopStartIndex = 2

CSV Data:
┌─────────┬──────────────────────────────────────────────────┐
│ Row     │ Steps Executed                                   │
├─────────┼──────────────────────────────────────────────────┤
│ Row 1   │ Open → Login → Search → Fill Form → Submit      │
│         │ (All steps: 0, 1, 2, 3, 4)                       │
├─────────┼──────────────────────────────────────────────────┤
│ Row 2   │ Search → Fill Form → Submit                      │
│         │ (From loopStartIndex: 2, 3, 4)                   │
├─────────┼──────────────────────────────────────────────────┤
│ Row 3   │ Search → Fill Form → Submit                      │
│         │ (From loopStartIndex: 2, 3, 4)                   │
└─────────┴──────────────────────────────────────────────────┘
```

### 4.2 CSV Utilities

Create `src/lib/csvUtils.ts`:

```typescript
/**
 * @fileoverview CSV utilities for automation playback
 * @module lib/csvUtils
 * 
 * Provides utilities for parsing, validating, and iterating
 * over CSV data in the context of recording playback.
 */

import type { Recording, Step, ParsedField } from '@/types';

/**
 * Options for CSV parsing
 */
export interface CSVParseOptions {
  /** Delimiter character (default: ',') */
  delimiter?: string;
  /** Whether first row contains headers (default: true) */
  hasHeaders?: boolean;
  /** Skip empty rows (default: true) */
  skipEmpty?: boolean;
  /** Trim whitespace from values (default: true) */
  trimValues?: boolean;
}

/**
 * Result of CSV validation
 */
export interface CSVValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  rowCount: number;
  columnCount: number;
  headers: string[];
  missingColumns: string[];
  unmappedColumns: string[];
}

/**
 * Row iteration context
 */
export interface RowContext {
  /** Zero-based row index */
  rowIndex: number;
  /** One-based row number (for display) */
  rowNumber: number;
  /** Total number of rows */
  totalRows: number;
  /** Whether this is the first row */
  isFirstRow: boolean;
  /** Whether this is the last row */
  isLastRow: boolean;
  /** Current row data */
  data: Record<string, string>;
}

/**
 * Parses a CSV string into an array of objects
 * @param csvString - Raw CSV content
 * @param options - Parse options
 * @returns Array of row objects with column names as keys
 */
export function parseCSV(
  csvString: string,
  options: CSVParseOptions = {}
): Record<string, string>[] {
  const {
    delimiter = ',',
    hasHeaders = true,
    skipEmpty = true,
    trimValues = true,
  } = options;

  const lines = csvString.split(/\r?\n/);
  
  if (lines.length === 0) {
    return [];
  }

  // Parse header row
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine, delimiter).map((h) =>
    trimValues ? h.trim() : h
  );

  if (!hasHeaders) {
    // Generate numeric headers
    const numHeaders = headers.map((_, i) => `column_${i + 1}`);
    // Include first line as data
    const rows: Record<string, string>[] = [];
    
    for (const line of lines) {
      if (skipEmpty && line.trim() === '') continue;
      
      const values = parseCSVLine(line, delimiter);
      const row: Record<string, string> = {};
      
      numHeaders.forEach((header, i) => {
        row[header] = trimValues ? (values[i] || '').trim() : (values[i] || '');
      });
      
      rows.push(row);
    }
    
    return rows;
  }

  // Parse data rows
  const rows: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    
    if (skipEmpty && line.trim() === '') continue;
    
    const values = parseCSVLine(line, delimiter);
    const row: Record<string, string> = {};
    
    headers.forEach((header, j) => {
      row[header] = trimValues ? (values[j] || '').trim() : (values[j] || '');
    });
    
    rows.push(row);
  }

  return rows;
}

/**
 * Parses a single CSV line handling quoted values
 * @param line - CSV line
 * @param delimiter - Field delimiter
 * @returns Array of values
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else if (char === '"') {
        // End of quoted field
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        // Start of quoted field
        inQuotes = true;
      } else if (char === delimiter) {
        // End of field
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  
  // Add last field
  values.push(current);
  
  return values;
}

/**
 * Validates CSV data against a recording's parsed fields
 * @param csvData - Parsed CSV data
 * @param recording - Recording with parsed fields
 * @returns Validation result
 */
export function validateCSVForRecording(
  csvData: Record<string, string>[],
  recording: Recording
): CSVValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missingColumns: string[] = [];
  const unmappedColumns: string[] = [];

  if (csvData.length === 0) {
    errors.push('CSV file is empty');
    return {
      valid: false,
      errors,
      warnings,
      rowCount: 0,
      columnCount: 0,
      headers: [],
      missingColumns,
      unmappedColumns,
    };
  }

  const headers = Object.keys(csvData[0]);
  const headerSet = new Set(headers);

  // Check for required columns based on parsed fields
  if (recording.parsedFields) {
    for (const field of recording.parsedFields) {
      if (field.mapped && !headerSet.has(field.field_name)) {
        missingColumns.push(field.field_name);
        errors.push(`Missing required column: ${field.field_name}`);
      }
    }

    // Find unmapped columns
    const mappedColumns = new Set(
      recording.parsedFields
        .filter((f) => f.mapped)
        .map((f) => f.field_name)
    );
    
    for (const header of headers) {
      if (!mappedColumns.has(header)) {
        unmappedColumns.push(header);
      }
    }

    if (unmappedColumns.length > 0) {
      warnings.push(`Unmapped columns: ${unmappedColumns.join(', ')}`);
    }
  }

  // Check for empty rows
  let emptyRowCount = 0;
  csvData.forEach((row, index) => {
    const hasData = Object.values(row).some((v) => v.trim() !== '');
    if (!hasData) {
      emptyRowCount++;
      warnings.push(`Row ${index + 1} is empty`);
    }
  });

  if (emptyRowCount > 0) {
    warnings.push(`${emptyRowCount} empty row(s) will be skipped`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    rowCount: csvData.length,
    columnCount: headers.length,
    headers,
    missingColumns,
    unmappedColumns,
  };
}

/**
 * Gets steps to execute for a given row
 * @param recording - Recording with steps and loopStartIndex
 * @param rowIndex - Zero-based row index
 * @returns Array of steps to execute
 */
export function getStepsForRow(recording: Recording, rowIndex: number): Step[] {
  if (rowIndex === 0) {
    // First row: execute all steps
    return recording.steps;
  }
  
  // Subsequent rows: start from loopStartIndex
  return recording.steps.slice(recording.loopStartIndex);
}

/**
 * Gets the step indices to execute for a given row
 * @param recording - Recording
 * @param rowIndex - Zero-based row index
 * @returns Array of step indices
 */
export function getStepIndicesForRow(
  recording: Recording,
  rowIndex: number
): number[] {
  const stepCount = recording.steps.length;
  
  if (rowIndex === 0) {
    return Array.from({ length: stepCount }, (_, i) => i);
  }
  
  const startIndex = recording.loopStartIndex;
  return Array.from({ length: stepCount - startIndex }, (_, i) => startIndex + i);
}

/**
 * Creates an iterator for CSV rows with context
 * @param csvData - Parsed CSV data
 * @returns Generator yielding row context
 */
export function* getRowsIterator(
  csvData: Record<string, string>[]
): Generator<RowContext> {
  const totalRows = csvData.length;
  
  for (let i = 0; i < totalRows; i++) {
    yield {
      rowIndex: i,
      rowNumber: i + 1,
      totalRows,
      isFirstRow: i === 0,
      isLastRow: i === totalRows - 1,
      data: csvData[i],
    };
  }
}

/**
 * Calculates total number of step executions for a recording with CSV
 * @param recording - Recording with steps
 * @param rowCount - Number of CSV rows
 * @returns Total step executions
 */
export function calculateTotalIterations(
  recording: Recording,
  rowCount: number
): number {
  if (rowCount === 0) return 0;
  
  const totalSteps = recording.steps.length;
  const loopSteps = totalSteps - recording.loopStartIndex;
  
  // First row: all steps
  // Subsequent rows: loop steps only
  return totalSteps + loopSteps * (rowCount - 1);
}

/**
 * Estimates execution time based on steps and delays
 * @param recording - Recording with steps and delays
 * @param rowCount - Number of CSV rows
 * @returns Estimated milliseconds
 */
export function estimateExecutionTime(
  recording: Recording,
  rowCount: number
): number {
  if (rowCount === 0) return 0;
  
  // Base execution time per step (estimated)
  const baseStepTime = 500; // 500ms per step
  
  // Calculate total steps
  const totalIterations = calculateTotalIterations(recording, rowCount);
  let totalTime = totalIterations * baseStepTime;
  
  // Add delays
  for (let row = 0; row < rowCount; row++) {
    const steps = getStepsForRow(recording, row);
    
    for (const step of steps) {
      const delayMs = step.delaySeconds
        ? step.delaySeconds * 1000
        : recording.globalDelayMs;
      totalTime += delayMs;
    }
  }
  
  return totalTime;
}

/**
 * Gets column headers from CSV data
 * @param csvData - Parsed CSV data
 * @returns Array of headers
 */
export function getHeaders(csvData: Record<string, string>[]): string[] {
  if (csvData.length === 0) return [];
  return Object.keys(csvData[0]);
}

/**
 * Gets a specific column's values
 * @param csvData - Parsed CSV data
 * @param columnName - Column name
 * @returns Array of values
 */
export function getColumn(
  csvData: Record<string, string>[],
  columnName: string
): string[] {
  return csvData.map((row) => row[columnName] || '');
}

/**
 * Filters out empty rows
 * @param csvData - Parsed CSV data
 * @returns Filtered data
 */
export function filterEmptyRows(
  csvData: Record<string, string>[]
): Record<string, string>[] {
  return csvData.filter((row) =>
    Object.values(row).some((v) => v.trim() !== '')
  );
}
```

### 4.3 Variable Substitution

Create `src/lib/variableSubstitution.ts`:

```typescript
/**
 * @fileoverview Variable substitution for step values
 * @module lib/variableSubstitution
 * 
 * Handles replacement of {{variable}} placeholders in step values
 * with actual data from CSV rows.
 */

import type { Step } from '@/types';

/**
 * Pattern for matching variables: {{variableName}}
 */
const VARIABLE_PATTERN = /\{\{([^}]+)\}\}/g;

/**
 * Result of variable extraction
 */
export interface VariableInfo {
  /** Original placeholder including braces */
  placeholder: string;
  /** Variable name without braces */
  name: string;
  /** Start index in string */
  start: number;
  /** End index in string */
  end: number;
}

/**
 * Extracts all variable placeholders from a string
 * @param text - Text to scan
 * @returns Array of variable info
 */
export function extractVariables(text: string): VariableInfo[] {
  const variables: VariableInfo[] = [];
  let match: RegExpExecArray | null;
  
  // Reset regex state
  VARIABLE_PATTERN.lastIndex = 0;
  
  while ((match = VARIABLE_PATTERN.exec(text)) !== null) {
    variables.push({
      placeholder: match[0],
      name: match[1].trim(),
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  
  return variables;
}

/**
 * Substitutes variables in a string with values from data
 * @param text - Text containing {{variables}}
 * @param data - Object with variable values
 * @param options - Substitution options
 * @returns Text with variables replaced
 */
export function substituteVariables(
  text: string,
  data: Record<string, string>,
  options: {
    /** Keep unmatched variables as-is (default: false, replaces with empty) */
    keepUnmatched?: boolean;
    /** Case-insensitive variable matching (default: false) */
    caseInsensitive?: boolean;
  } = {}
): string {
  const { keepUnmatched = false, caseInsensitive = false } = options;
  
  // Create lookup map
  const dataMap = new Map<string, string>();
  for (const [key, value] of Object.entries(data)) {
    const lookupKey = caseInsensitive ? key.toLowerCase() : key;
    dataMap.set(lookupKey, value);
  }
  
  return text.replace(VARIABLE_PATTERN, (match, varName) => {
    const lookupName = caseInsensitive ? varName.trim().toLowerCase() : varName.trim();
    const value = dataMap.get(lookupName);
    
    if (value !== undefined) {
      return value;
    }
    
    return keepUnmatched ? match : '';
  });
}

/**
 * Substitutes variables in a step's value field
 * @param step - Step with value to substitute
 * @param data - Variable data
 * @returns New step with substituted value
 */
export function substituteStepVariables(
  step: Step,
  data: Record<string, string>
): Step {
  if (!step.value) {
    return step;
  }
  
  const substitutedValue = substituteVariables(step.value, data);
  
  if (substitutedValue === step.value) {
    return step; // No changes
  }
  
  return {
    ...step,
    value: substitutedValue,
  };
}

/**
 * Substitutes variables in all steps
 * @param steps - Array of steps
 * @param data - Variable data
 * @returns New array with substituted steps
 */
export function substituteAllSteps(
  steps: Step[],
  data: Record<string, string>
): Step[] {
  return steps.map((step) => substituteStepVariables(step, data));
}

/**
 * Gets all unique variable names used in steps
 * @param steps - Array of steps
 * @returns Set of variable names
 */
export function getUsedVariables(steps: Step[]): Set<string> {
  const variables = new Set<string>();
  
  for (const step of steps) {
    if (step.value) {
      const extracted = extractVariables(step.value);
      extracted.forEach((v) => variables.add(v.name));
    }
  }
  
  return variables;
}

/**
 * Validates that all variables in steps have corresponding data columns
 * @param steps - Array of steps
 * @param availableColumns - Available column names
 * @returns Validation result
 */
export function validateVariables(
  steps: Step[],
  availableColumns: string[]
): {
  valid: boolean;
  missingVariables: string[];
  unusedColumns: string[];
} {
  const usedVariables = getUsedVariables(steps);
  const columnSet = new Set(availableColumns);
  
  const missingVariables: string[] = [];
  for (const varName of usedVariables) {
    if (!columnSet.has(varName)) {
      missingVariables.push(varName);
    }
  }
  
  const unusedColumns: string[] = [];
  for (const column of availableColumns) {
    if (!usedVariables.has(column)) {
      unusedColumns.push(column);
    }
  }
  
  return {
    valid: missingVariables.length === 0,
    missingVariables,
    unusedColumns,
  };
}

/**
 * Preview substitution for a single step
 * @param step - Step to preview
 * @param data - Sample data
 * @returns Original and substituted values
 */
export function previewSubstitution(
  step: Step,
  data: Record<string, string>
): {
  original: string | undefined;
  substituted: string | undefined;
  variables: VariableInfo[];
} {
  const original = step.value;
  const variables = original ? extractVariables(original) : [];
  const substituted = original ? substituteVariables(original, data) : undefined;
  
  return { original, substituted, variables };
}
```

---

## 5. CODE EXAMPLES

### 5.1 Parsing and Validating CSV

```typescript
import { parseCSV, validateCSVForRecording } from '@/lib/csvUtils';

const csvString = `name,email,company
John,john@example.com,Acme
Jane,jane@example.com,Globex`;

const csvData = parseCSV(csvString);
console.log(csvData);
// [
//   { name: 'John', email: 'john@example.com', company: 'Acme' },
//   { name: 'Jane', email: 'jane@example.com', company: 'Globex' }
// ]

const validation = validateCSVForRecording(csvData, recording);
if (!validation.valid) {
  console.error('CSV validation failed:', validation.errors);
}
```

### 5.2 Processing Rows with Loop Start

```typescript
import { getStepsForRow, getRowsIterator } from '@/lib/csvUtils';

// Recording has 5 steps, loopStartIndex = 2
for (const rowContext of getRowsIterator(csvData)) {
  const steps = getStepsForRow(recording, rowContext.rowIndex);
  
  console.log(`Row ${rowContext.rowNumber}: executing ${steps.length} steps`);
  // Row 1: executing 5 steps
  // Row 2: executing 3 steps
  // Row 3: executing 3 steps
  
  for (const step of steps) {
    await executeStep(step, rowContext.data);
  }
}
```

### 5.3 Variable Substitution

```typescript
import { substituteVariables, substituteAllSteps } from '@/lib/variableSubstitution';

const template = 'Hello {{name}}, your email is {{email}}';
const data = { name: 'John', email: 'john@example.com' };

const result = substituteVariables(template, data);
console.log(result); // 'Hello John, your email is john@example.com'

// Substitute all steps at once
const substitutedSteps = substituteAllSteps(recording.steps, data);
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** `src/lib/csvUtils.ts` is created with all utilities
- [ ] **AC-2:** `parseCSV` correctly handles quoted values and delimiters
- [ ] **AC-3:** `validateCSVForRecording` identifies missing columns
- [ ] **AC-4:** `getStepsForRow` returns correct steps based on loopStartIndex
- [ ] **AC-5:** `getRowsIterator` provides correct context for each row
- [ ] **AC-6:** `src/lib/variableSubstitution.ts` is created
- [ ] **AC-7:** `substituteVariables` replaces all {{placeholders}}
- [ ] **AC-8:** `getUsedVariables` extracts all variable names from steps
- [ ] **AC-9:** `validateVariables` identifies missing variables
- [ ] **AC-10:** TypeScript compiles without errors

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **CSV parsing** - Handle quoted values with embedded commas
2. **Variable names** - Case-sensitive by default
3. **Empty values** - Replace missing variables with empty string

### Patterns to Follow

1. **Immutable operations** - Return new arrays, don't mutate
2. **Generator for iteration** - Memory-efficient row processing
3. **Validation before execution** - Check CSV before running

### Edge Cases

1. **Empty CSV** - Return empty array, validation fails
2. **Missing columns** - Report in validation errors
3. **Unmatched variables** - Replace with empty string

---

## 8. VERIFICATION COMMANDS

```bash
# Verify files exist
ls -la src/lib/csvUtils.ts
ls -la src/lib/variableSubstitution.ts

# Run type check
npm run type-check
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Remove CSV utilities
rm src/lib/csvUtils.ts
rm src/lib/variableSubstitution.ts
```

---

## 10. REFERENCES

- FND-011: Recording Interface Extension
- DAT-003: Recording Repository
- Feature Specs: `/future-spec/03_feature-specs.md`

---

*End of Specification DAT-005*
