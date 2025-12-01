# Field Mapper UI Breakdown

## Purpose
**What it does:** CSV field mapping interface that matches CSV columns to recorded step labels for batch test execution.

**Where it lives:** `src/pages/FieldMapper.tsx` (400+ lines)

**Why it exists:** Enables data-driven testing by mapping CSV columns to form fields, allowing single recording to run with multiple data sets.

## Inputs
- **URL param:** `?project=<id>`
- **CSV upload:** User uploads CSV file with test data
- **Recorded steps:** From project.recorded_steps

## Outputs
- `project.parsed_fields`: Field mappings array
- `project.csv_data`: Parsed CSV rows (first 10 for preview)
- Navigation to TestRunner on save

## Internal Architecture
**Key Components:**
- `<FieldMappingTable>` - Shows CSV fields + step label dropdowns
- `<MappingSummary>` - Progress indicator (X/Y fields mapped)
- CSV upload button - PapaParse integration
- Auto-map button - string-similarity algorithm

**Mapping Flow:**
1. User uploads CSV → PapaParse extracts headers
2. Creates field objects: `{ field_name: 'Email', mapped: false, inputvarfields: '' }`
3. User manually selects step label OR clicks "Auto-Map"
4. Auto-map uses string-similarity to match CSV columns to step labels
5. Save button → Updates `project.parsed_fields` in IndexedDB

**Auto-Map Algorithm:**
```typescript
import stringSimilarity from 'string-similarity';

fields.forEach((field) => {
  const normalizedFieldName = field.field_name.toLowerCase().replace(/[\s_]/g, '');
  
  let bestMatch = null;
  let bestScore = 0;
  
  recordedSteps.forEach((step) => {
    const stepName = step.label.toLowerCase().replace(/[\s_]/g, '');
    const score = stringSimilarity.compareTwoStrings(normalizedFieldName, stepName);
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = step;
    }
  });
  
  if (bestScore >= 0.3) {  // 30% threshold
    field.mapped = true;
    field.inputvarfields = bestMatch.label;
  }
});
```

## Critical Dependencies
- **PapaParse** - CSV parsing library
- **string-similarity** - Fuzzy matching algorithm
- **FieldMappingTable** - Mapping UI component

## Hidden Assumptions
1. **CSV has headers** - First row treated as column names
2. **Only first 10 rows stored** - For performance/storage limits
3. **30% similarity threshold** - May need tuning per use case
4. **No validation** - Allows unmapped required fields

## Developer-Must-Know Notes
- Auto-map uses Dice coefficient for string similarity
- Normalizes field names (removes spaces, underscores, lowercases)
- Preview shows first 10 CSV rows in MappingSummary
- Unmapped fields skipped during test execution
- "Run Test" button saves mappings and navigates to TestRunner