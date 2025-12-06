/**
 * CSV Position Mapping Utility
 * 
 * Provides position-based mapping for CSV columns to step values.
 * Handles duplicate column names by mapping by occurrence order.
 * 
 * Key Concept:
 * When a CSV has multiple columns with the same header (e.g., "Search"),
 * this utility maps each step to the correct column based on the ORDER
 * of occurrence, not just the column name.
 * 
 * Example:
 * CSV: Search, Search, Search
 * Steps: Step 1 (Search), Step 4 (Search), Step 7 (Search)
 * Result: Step 1 → Search_0, Step 4 → Search_1, Step 7 → Search_2
 */

import type { Step, Recording, ParsedField } from '../types/vision';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Mapping from step index to CSV column name.
 */
export interface StepToColumnMapping {
  [stepIndex: number]: string;
}

/**
 * Mapping from label to array of column names.
 */
export interface LabelToColumnsMapping {
  [label: string]: string[];
}

/**
 * Result of CSV variable substitution.
 */
export interface SubstitutionResult {
  /** The modified step with substituted values */
  step: Step;
  /** Whether any substitution was made */
  substituted: boolean;
  /** The column name used for substitution (if any) */
  columnUsed?: string;
  /** The original value before substitution */
  originalValue?: string;
}

// ============================================================================
// COLUMN MAPPING FUNCTIONS
// ============================================================================

/**
 * Build a mapping from labels to their CSV columns.
 * Preserves column order for position-based mapping.
 * 
 * @param parsedFields - Array of parsed field mappings from CSV upload
 * @returns Mapping from label (lowercase) to array of column names
 */
export function buildLabelToColumnsMapping(
  parsedFields: ParsedField[] | undefined
): LabelToColumnsMapping {
  if (!parsedFields || parsedFields.length === 0) {
    return {};
  }

  const mapping: LabelToColumnsMapping = {};

  // Sort by columnIndex to preserve CSV column order
  const sorted = [...parsedFields].sort((a, b) => a.columnIndex - b.columnIndex);

  for (const field of sorted) {
    const targetLabel = field.targetLabel?.toLowerCase().trim();
    const columnName = field.columnName;

    if (!targetLabel || !columnName) continue;

    if (!mapping[targetLabel]) {
      mapping[targetLabel] = [];
    }
    mapping[targetLabel].push(columnName);
  }

  return mapping;
}

/**
 * Build a mapping from step index to specific CSV column.
 * Uses occurrence order to handle duplicate labels.
 * 
 * @param steps - Array of recording steps
 * @param labelToColumns - Mapping from labels to column arrays
 * @returns Mapping from step index to column name
 */
export function buildStepToColumnMapping(
  steps: Step[],
  labelToColumns: LabelToColumnsMapping
): StepToColumnMapping {
  const mapping: StepToColumnMapping = {};
  const globalUsedColumns: Set<string> = new Set();  // Track ALL used columns globally
  const labelUsageCount: Record<string, number> = {};  // Track per-label usage

  steps.forEach((step, index) => {
    const label = step.label?.toLowerCase().trim();
    if (!label) {
      console.warn(`[CSV Mapping] Step ${index} has no label - skipping`);
      return;
    }

    const availableColumns = labelToColumns[label] || [];
    
    if (availableColumns.length === 0) {
      console.warn(`[CSV Mapping] No columns available for step ${index} (label: "${label}")`);
      return;
    }
    
    // Get current usage count for this label
    const usageCount = labelUsageCount[label] || 0;
    
    // Find the next column that:
    // 1. Belongs to this label's available columns
    // 2. Hasn't been used globally yet
    let columnToUse: string | null = null;
    
    for (let i = usageCount; i < availableColumns.length; i++) {
      const candidateColumn = availableColumns[i];
      if (!globalUsedColumns.has(candidateColumn)) {
        columnToUse = candidateColumn;
        labelUsageCount[label] = i + 1;  // Update for next use
        break;
      }
    }
    
    if (columnToUse) {
      mapping[index] = columnToUse;
      globalUsedColumns.add(columnToUse);  // Mark as globally used
      console.log(`[CSV Mapping] Step ${index} ("${label}") → column "${columnToUse}"`);
    } else {
      console.warn(`[CSV Mapping] No available column for step ${index} (label: "${label}") - all columns used`);
    }
  });

  return mapping;
}

/**
 * Build complete column mapping from recording.
 * Convenience function that combines label and step mapping.
 * 
 * @param recording - The recording with steps and parsed fields
 * @returns Step to column mapping
 */
export function buildColumnMappingFromRecording(
  recording: Pick<Recording, 'steps' | 'parsedFields'>
): StepToColumnMapping {
  const labelToColumns = buildLabelToColumnsMapping(recording.parsedFields);
  return buildStepToColumnMapping(recording.steps, labelToColumns);
}

// ============================================================================
// CSV ROW MAPPING FUNCTIONS
// ============================================================================

/**
 * Build a mapping from column name to row value index.
 * Used for fast lookup during substitution.
 * 
 * @param headers - CSV header row
 * @returns Map from column name to index
 */
export function buildColumnIndexMap(headers: string[]): Map<string, number> {
  const map = new Map<string, number>();
  
  headers.forEach((header, index) => {
    // For duplicate headers, keep the first occurrence
    // (columns should already be uniquely named like Search_0, Search_1)
    if (!map.has(header)) {
      map.set(header, index);
    }
  });

  return map;
}

/**
 * Get value from CSV row by column name.
 * 
 * @param row - CSV data row
 * @param columnName - Name of the column
 * @param columnIndexMap - Pre-built column index map
 * @returns Value at column, or undefined if not found
 */
export function getRowValue(
  row: string[],
  columnName: string,
  columnIndexMap: Map<string, number>
): string | undefined {
  const index = columnIndexMap.get(columnName);
  if (index === undefined || index >= row.length) {
    return undefined;
  }
  return row[index];
}

// ============================================================================
// VARIABLE SUBSTITUTION
// ============================================================================

/**
 * Substitute CSV values into a step's value field.
 * 
 * @param step - The step to substitute
 * @param stepIndex - Index of the step in the recording
 * @param csvRow - Current CSV row values
 * @param stepToColumn - Mapping from step index to column name
 * @param columnIndexMap - Mapping from column name to row index
 * @returns Substitution result with modified step
 */
export function substituteStepValue(
  step: Step,
  stepIndex: number,
  csvRow: string[],
  stepToColumn: StepToColumnMapping,
  columnIndexMap: Map<string, number>
): SubstitutionResult {
  const columnName = stepToColumn[stepIndex];
  
  if (!columnName) {
    return { step, substituted: false };
  }

  const value = getRowValue(csvRow, columnName, columnIndexMap);
  
  if (value === undefined) {
    return { step, substituted: false };
  }

  // Clone step and substitute value
  const modifiedStep: Step = {
    ...step,
    value,
  };

  return {
    step: modifiedStep,
    substituted: true,
    columnUsed: columnName,
    originalValue: step.value,
  };
}

/**
 * Substitute {{variable}} placeholders in text with CSV values.
 * 
 * @param text - Text containing {{variable}} placeholders
 * @param csvRow - Current CSV row values
 * @param columnIndexMap - Mapping from column name to row index
 * @returns Text with variables replaced
 */
export function substituteVariables(
  text: string,
  csvRow: string[],
  columnIndexMap: Map<string, number>
): string {
  if (!text || !text.includes('{{')) {
    return text;
  }

  return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    // Try exact match first
    let value = getRowValue(csvRow, varName, columnIndexMap);
    
    // Try case-insensitive match
    if (value === undefined) {
      const lowerVarName = varName.toLowerCase();
      for (const [columnName, index] of columnIndexMap.entries()) {
        if (columnName.toLowerCase() === lowerVarName) {
          value = csvRow[index];
          break;
        }
      }
    }

    return value ?? match; // Return original {{var}} if not found
  });
}

/**
 * Substitute variables in conditional config search terms.
 * 
 * @param searchTerms - Array of search terms
 * @param csvRow - Current CSV row values
 * @param columnIndexMap - Mapping from column name to row index
 * @returns Array with substituted search terms
 */
export function substituteSearchTerms(
  searchTerms: string[],
  csvRow: string[],
  columnIndexMap: Map<string, number>
): string[] {
  return searchTerms.map(term => substituteVariables(term, csvRow, columnIndexMap));
}

// ============================================================================
// LOOP STEP FUNCTIONS
// ============================================================================

/**
 * Get steps for a specific CSV row iteration.
 * First row gets all steps; subsequent rows skip setup steps.
 * 
 * @param steps - All recording steps
 * @param loopStartIndex - Index where loop begins
 * @param rowIndex - Current CSV row index (0-based)
 * @returns Steps to execute for this row
 */
export function getStepsForRow(
  steps: Step[],
  loopStartIndex: number,
  rowIndex: number
): Step[] {
  if (rowIndex === 0) {
    // First row: execute all steps
    return steps;
  } else {
    // B-41: Handle -1 (no loop mode) - skip all rows after first
    if (loopStartIndex < 0) {
      return [];
    }
    // Subsequent rows: skip setup steps (execute from loop start)
    return steps.slice(loopStartIndex);
  }
}

/**
 * Calculate the absolute step index for mapping lookup.
 * 
 * @param relativeIndex - Index within the current step array
 * @param loopStartIndex - Loop start index
 * @param rowIndex - Current row index
 * @returns Absolute index in the original steps array
 */
export function getAbsoluteStepIndex(
  relativeIndex: number,
  loopStartIndex: number,
  rowIndex: number
): number {
  if (rowIndex === 0) {
    return relativeIndex;
  } else {
    return loopStartIndex + relativeIndex;
  }
}

// ============================================================================
// COMPLETE ROW PROCESSING
// ============================================================================

/**
 * Process steps for a single CSV row.
 * Applies substitutions and returns steps ready for execution.
 * 
 * @param recording - The recording
 * @param csvRow - Current CSV row values
 * @param rowIndex - Current row index
 * @param stepToColumn - Pre-built step to column mapping
 * @param columnIndexMap - Pre-built column index map
 * @returns Array of steps with substituted values
 */
export function processStepsForRow(
  recording: Recording,
  csvRow: string[],
  rowIndex: number,
  stepToColumn: StepToColumnMapping,
  columnIndexMap: Map<string, number>
): Step[] {
  const stepsForRow = getStepsForRow(
    recording.steps,
    recording.loopStartIndex,
    rowIndex
  );

  return stepsForRow.map((step, relativeIndex) => {
    const absoluteIndex = getAbsoluteStepIndex(
      relativeIndex,
      recording.loopStartIndex,
      rowIndex
    );

    const result = substituteStepValue(
      step,
      absoluteIndex,
      csvRow,
      stepToColumn,
      columnIndexMap
    );

    return result.step;
  });
}

// ============================================================================
// DEBUG HELPERS
// ============================================================================

/**
 * Log the column mapping for debugging.
 */
export function logColumnMapping(
  labelToColumns: LabelToColumnsMapping,
  stepToColumn: StepToColumnMapping
): void {
  console.log('[CSV Mapping] Label → Columns:', labelToColumns);
  console.log('[CSV Mapping] Step Index → Column:', stepToColumn);
}
