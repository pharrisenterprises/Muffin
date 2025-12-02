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
| columnMapping | `Map<string, number>` | Step executor | Variable → column index |
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

### Variable Substitution

```typescript
function substituteVariables(
  step: Step,
  csvRow: string[],
  columnMapping: Map<string, number>
): Step {
  
  const substituted = { ...step };
  
  // Substitute in value
  if (step.value) {
    substituted.value = replaceVariables(
      step.value, 
      csvRow, 
      columnMapping
    );
  }
  
  // Substitute in conditionalConfig
  if (step.conditionalConfig) {
    substituted.conditionalConfig = {
      ...step.conditionalConfig,
      buttonTexts: step.conditionalConfig.buttonTexts.map(
        text => replaceVariables(text, csvRow, columnMapping)
      ),
      successText: step.conditionalConfig.successText 
        ? replaceVariables(step.conditionalConfig.successText, csvRow, columnMapping)
        : null
    };
  }
  
  return substituted;
}

function replaceVariables(
  text: string,
  csvRow: string[],
  columnMapping: Map<string, number>
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    const columnIndex = columnMapping.get(varName.toLowerCase());
    if (columnIndex !== undefined && columnIndex < csvRow.length) {
      return csvRow[columnIndex] || '';
    }
    return match; // Leave unchanged if not found
  });
}
```

### Loop Start Implementation

```typescript
function getStepsForRow(
  steps: Step[],
  loopStartIndex: number,
  rowIndex: number
): Step[] {
  
  if (rowIndex === 0) {
    // First row: execute all steps
    return steps;
  } else {
    // Subsequent rows: skip setup steps
    return steps.slice(loopStartIndex);
  }
}
```

### CSV Row Mapping

```typescript
function mapCsvRowToSteps(
  steps: Step[],
  csvRow: string[],
  columnMapping: Map<string, number>
): Step[] {
  
  return steps.map(step => 
    substituteVariables(step, csvRow, columnMapping)
  );
}
```

## Dependencies

### Internal Dependencies
- **Step Executor** (ENG-017): Uses substituted steps
- **Playback Engine** (ENG-008): Loop iteration
- **CSV Parser**: Provides parsed CSV data

### Type Dependencies
- **Step** (FND-010): Step interface
- **Recording** (FND-011): Recording with loopStartIndex
- **ConditionalConfig** (FND-008): Button text substitution

## Hidden Assumptions

1. **Case-Insensitive**: Variables and headers matched without case
2. **First Row Headers**: CSV first row is headers
3. **Column Order**: Matters for positional mapping
4. **Missing Columns**: Variables left unchanged ({{var}})
5. **Empty Cells**: Substituted as empty string
6. **Unicode Support**: Works with UTF-8 CSV
7. **No Escaping**: {{}} not escaped in CSV values
8. **Immutability**: Original steps not modified
9. **Caching**: Column mapping built once, reused
10. **Loop Start 0**: All steps for all rows (original behavior)

## Stability Concerns

### High Risk
1. **Memory**: Large CSV files consume memory
2. **Performance**: Per-row substitution may be slow

### Medium Risk
1. **Variable Collision**: {{Name}} vs {{name}} both match "name"
2. **Missing Variables**: Silent failure leaves {{var}}

### Low Risk
1. **Regex**: Well-tested pattern
2. **Array Slicing**: Standard operation

## Edge Cases

1. **No Variables**: Mapping is empty, no substitution
2. **Variable Not in CSV**: Left as {{var}} unchanged
3. **Empty CSV Cell**: Substitutes to ""
4. **More Columns Than Variables**: Extra columns ignored
5. **More Variables Than Columns**: Unmapped variables unchanged
6. **Special Characters in CSV**: Preserved in substitution
7. **Unicode in CSV**: Works correctly
8. **Variable-Like Text**: Non-{{}} text preserved
9. **Single Row CSV**: Loops once
10. **Empty CSV Row**: All variables become ""
11. **Loop Start Beyond Length**: All steps skipped for rows >0
12. **Loop Start 0**: All steps for every row
13. **Loop Start at Last Step**: Only last step loops

## Developer Notes

### Testing Strategy
- **Unit Tests** (TST-009): All functions tested
  - buildStepToColumnMapping: 6 tests
  - substituteVariables: 8 tests
  - getStepsForRow: 6 tests
  - mapCsvRowToSteps: 5 tests
  - Edge cases: 8 tests
  - Performance: 2 tests
- **Fixtures**: 6 CSV scenarios (simple, multi-column, empty cells, special chars, single row, many columns)

### Common Pitfalls
1. **Case Sensitivity**: Always lowercase for comparison
2. **Mutating Steps**: Use spread operator
3. **Column Index Off-by-One**: Headers are row 0
4. **Empty String vs Null**: Use || '' for missing values
5. **Caching Mapping**: Don't rebuild per-row

### Performance Tips
1. **Cache Column Mapping**: Build once per recording
2. **Avoid Recompiling Regex**: Use constant pattern
3. **Batch Substitution**: Don't iterate twice
4. **Early Exit**: Check for variables before looping

### Integration Points
- **Playback Loop**: Calls getStepsForRow per iteration (ENG-008)
- **Step Executor**: Calls substituteVariables per step (ENG-017)
- **CSV Upload UI**: Provides CSV data
- **Loop Start UI**: Sets loopStartIndex (UI-002, UI-004, UI-007)

## Specification References

- ENG-016: CSV position mapping
- ENG-017: Step executor module (uses substitution)
- ENG-008: Playback engine integration (loop iteration)
- TST-009: CSV position mapping tests
- TST-010: Full Copilot workflow test (CSV loop)
- UI-002, UI-004, UI-007: Loop start UI components
- FND-011: Recording interface (loopStartIndex)
