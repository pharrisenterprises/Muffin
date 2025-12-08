# Field Mapping Engine Breakdown

## Purpose
**What it does:** Intelligent matching algorithm that automatically maps CSV column names to recorded step labels using string similarity scoring.

**Where it lives:** `autoMapFields()` function in `src/pages/FieldMapper.tsx`

**Why it exists:** Manual mapping is tedious for 20+ fields. Auto-mapping speeds up workflow using fuzzy string matching.

## Inputs
```typescript
fields: [
  { field_name: 'User Email', mapped: false, inputvarfields: '' },
  { field_name: 'pwd', mapped: false, inputvarfields: '' },
  ...
]

recordedSteps: [
  { label: 'Email Address', ... },
  { label: 'Password', ... },
  ...
]
```

## Outputs
```typescript
fields: [
  { field_name: 'User Email', mapped: true, inputvarfields: 'Email Address' },  // 0.75 similarity
  { field_name: 'pwd', mapped: true, inputvarfields: 'Password' },  // 0.6 similarity
  ...
]
```

## Internal Architecture
**Algorithm:**
```typescript
import stringSimilarity from 'string-similarity';

function autoMapFields() {
  fields.forEach((field, index) => {
    if (field.mapped) return;  // Skip already mapped
    
    // Normalize field name
    const normalizedFieldName = field.field_name
      .toLowerCase()
      .replace(/[\s_]/g, '');  // Remove spaces, underscores
    
    let bestMatch = null;
    let bestScore = 0;
    
    // Find best matching step label
    recordedSteps.forEach((step) => {
      const stepName = step.label
        .toLowerCase()
        .replace(/[\s_]/g, '');
      
      const score = stringSimilarity.compareTwoStrings(
        normalizedFieldName,
        stepName
      );
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = step;
      }
    });
    
    // Match if similarity >= 30%
    if (bestMatch && bestScore >= 0.3) {
      updateFieldMapping(index, {
        mapped: true,
        inputvarfields: bestMatch.label
      });
    }
  });
}
```

**String Similarity (Dice Coefficient):**
- Compares character bigrams
- Score 0.0 = no match, 1.0 = exact match
- Example: `compareTwoStrings('email', 'emailaddress')` → 0.56

## Critical Dependencies
- **string-similarity** - Dice coefficient algorithm
- **Field/Step state** - useState hooks

## Hidden Assumptions
1. **30% threshold** - Hardcoded, may need tuning
2. **Best match wins** - Doesn't handle ties
3. **Already mapped skipped** - Manual mappings preserved
4. **Case-insensitive** - 'Email' matches 'email'
5. **Space/underscore agnostic** - 'user_name' matches 'User Name'

## Stability Concerns
- **False positives** - Low threshold may match unrelated fields
- **False negatives** - High threshold may miss valid matches
- **Ambiguous labels** - 'Input 1', 'Input 2' may match same CSV column

## Edge Cases
- **Exact match** → score = 1.0, always maps
- **No similar labels** → All scores < 0.3, no mapping
- **Duplicate step labels** → First match wins
- **Special characters** → Preserved in comparison (`'Email*'` != `'Email'`)

## Developer-Must-Know Notes
- Uses Dice coefficient (not Levenshtein distance)
- Normalization: lowercase, remove spaces/underscores
- Threshold tunable: increase for stricter, decrease for looser
- Manual mappings NOT overwritten by auto-map
- Unmapped fields shown in red in FieldMappingTable