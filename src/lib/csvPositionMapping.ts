// src/lib/csvPositionMapping.ts
export interface ParsedField {
  field_name: string;
  inputvarfields?: string;
  original_index: number;
}

export interface StepColumnMapping {
  stepIndex: number;
  columnName: string;
  label: string;
}

export function buildStepToColumnMapping(
  steps: Array<{ label?: string; event?: string }>,
  csvFields: ParsedField[]
): Record<number, string> {
  const labelToColumns: Record<string, string[]> = {};
  csvFields.forEach(field => {
    if (field.inputvarfields && field.field_name) {
      if (!labelToColumns[field.inputvarfields]) {
        labelToColumns[field.inputvarfields] = [];
      }
      labelToColumns[field.inputvarfields].push(field.field_name);
    }
  });
  const stepToColumn: Record<number, string> = {};
  const counters: Record<string, number> = {};
  steps.forEach((step, index) => {
    if (step.label && labelToColumns[step.label]) {
      const counter = counters[step.label] || 0;
      const columns = labelToColumns[step.label];
      if (counter < columns.length) {
        stepToColumn[index] = columns[counter];
      }
      counters[step.label] = counter + 1;
    }
  });
  return stepToColumn;
}

export function getColumnValueForStep(
  stepIndex: number,
  rowData: Record<string, string>,
  mapping: Record<number, string>
): string | null {
  const columnName = mapping[stepIndex];
  if (!columnName) return null;
  return rowData[columnName] ?? null;
}

// Additional exports needed by other modules
export function substituteSearchTerms(
  searchTerms: string[],
  rowData: Record<string, string>,
  mapping: Record<number, string>,
  stepIndex: number
): string[] {
  return searchTerms.map(term => {
    const value = getColumnValueForStep(stepIndex, rowData, mapping);
    return value ? term.replace(/\{\{.*?\}\}/g, value) : term;
  });
}

export { StepColumnMapping as LabelToColumnsMapping };

export function getMappingDetails(
  steps: Array<{ label?: string; event?: string }>,
  csvFields: ParsedField[]
): StepColumnMapping[] {
  const mapping = buildStepToColumnMapping(steps, csvFields);
  return Object.entries(mapping).map(([stepIndex, columnName]) => ({
    stepIndex: parseInt(stepIndex, 10),
    columnName,
    label: steps[parseInt(stepIndex, 10)]?.label || ""
  }));
}
