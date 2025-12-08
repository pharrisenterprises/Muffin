# CSV Position Mapping Breakdown

## Purpose

Maps CSV column positions to step variables for data-driven automation. Enables looping through CSV rows with variable substitution in step values and conditional click configurations.

## Key Files

| File | Location | Purpose |
|------|----------|----------|
| CSV Mapping | `src/lib/csvPositionMapping.ts` | Column-to-variable mapping |
| CSV Parser | `src/lib/csvParser.ts` | CSV file parsing |

## Inputs

| Input | Type | Source | Purpose |
|-------|------|--------|----------|
| steps | `Step[]` | Recording | Steps with variables |
| csvData | `CSVData` | File upload | Parsed CSV with headers |
| loopStartIndex | `number` | Recording | First step for loop |
| rowIndex | `number` | Playback loop | Current CSV row |

## Outputs

| Output | Type | Destination | Content |
|--------|------|-------------|----------|
| columnMapping | `Map<string, number>` | Step executor | Variable  column index |
| substitutedSteps | `Step[]` | Step executor | Steps with {{vars}} replaced |
| stepsForRow | `Step[]` | Playback loop | Filtered steps for row |

## Internal Architecture

### Column Mapping Algorithm

```typescript
function buildStepToColumnMapping(
  steps: Step[], 
  csvHeaders: string[]
): Map<string, number> {
  
  const mapping = new Map<string, number>();
  
  // Extract all variables from steps
  const variables = new Set<string>();
  steps.forEach(step => {
    if (step.value) {
      const matches = step.value.matchAll(/\{\{(\w+)\}\}/g);
      for (const match of matches) {
        variables.add(match[1].toLowerCase());
      }
    }
    if (step.conditionalConfig?.buttonTexts) {
      step.conditionalConfig.buttonTexts.forEach(text => {
        const matches = text.matchAll(/\{\{(\w+)\}\}/g);
        for (const match of matches) {
          variables.add(match[1].toLowerCase());
        }
      });
    }
  });
  
  // Map variables to CSV column indices
  variables.forEach(varName => {
    const columnIndex = csvHeaders.findIndex(
      header => header.toLowerCase() === varName
    );
    if (columnIndex !== -1) {
      mapping.set(varName, columnIndex);
    }
  });
  
  return mapping;
}
```

## Phase 3 Integration Points

### Test Runner (Phase 3F)
- **Input**: CSV rows iterated during batch test execution
- **Output**: Each row becomes variable substitution context
- **Integration**: LoopStartIndex determines which steps use CSV data

### Variable Substitution (Phase 3G)
- **Input**: CSV columns mapped to {{variable}} placeholders
- **Output**: Step values replaced with row data
- **Integration**: buildStepToColumnMapping() creates variablecolumn index map

**Last Updated**: December 7, 2025  Phase 3 Specification Complete
