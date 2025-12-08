# CSV Parser Breakdown

## Purpose
**What it does:** Parses uploaded CSV files into structured data using PapaParse library.

**Where it lives:** `handleCSVUpload()` function in `src/pages/FieldMapper.tsx`

**Why it exists:** Converts CSV files into JSON format for batch test data injection.

## Inputs
```typescript
File {  // From <input type="file" accept=".csv" />
  name: string,
  size: number,
  type: 'text/csv'
}
```

## Outputs
```typescript
[
  { 'Email': 'user1@test.com', 'Password': 'pass123', ... },
  { 'Email': 'user2@test.com', 'Password': 'pass456', ... },
  ...
]
```

## Internal Architecture
```typescript
const handleCSVUpload = async (file: File) => {
  const text = await file.text();
  
  const result = Papa.parse(text, {
    header: true,           // First row = column names
    skipEmptyLines: true,   // Ignore blank rows
    dynamicTyping: true     // Auto-convert numbers
  });
  
  if (result.errors.length > 0) {
    setError('Error parsing CSV: ' + result.errors[0].message);
    return;
  }
  
  const rows = result.data.slice(0, 10);  // Preview only first 10
  const headers = Object.keys(rows[0]);
  
  setFields(headers.map(h => ({
    field_name: h,
    mapped: false,
    inputvarfields: ''
  })));
  
  setCsvData(rows);
};
```

## Critical Dependencies
- **PapaParse** - CSV parsing library
- **File API** - `file.text()` reads file content

## Hidden Assumptions
1. **Header row required** - No CSV without headers
2. **Comma delimiter** - Doesn't support TSV, semicolon-delimited
3. **UTF-8 encoding** - May break with other encodings
4. **In-memory parsing** - Large files (>10MB) may freeze UI

## Edge Cases
- **Empty CSV** → result.data = [], no fields created
- **No header row** → Treats first data row as headers
- **Special characters in headers** → Stored as-is (may break matching)
- **Quoted commas** → PapaParse handles correctly

## Developer-Must-Know Notes
- Only first 10 rows stored (reduces storage/preview lag)
- PapaParse auto-detects delimiters (comma, tab, pipe)
- Errors displayed via `setError()` state
- Full CSV data NOT stored - only preview rows
- For large datasets, consider streaming parse: `Papa.parse(file, { worker: true })`

## Phase 3 Integration Points

### Field Mapping (Phase 3G)
- **Input**: Parsed CSV headers become field mapping options
- **Output**: Field names matched to step labels
- **Integration**: AutoMapFields algorithm uses CSV headers

### Test Runner (Phase 3F)
- **Input**: CSV rows iterated during batch test execution
- **Output**: Each row becomes variable substitution context
- **Integration**: LoopStartIndex determines which steps use CSV data

### Variable Substitution (Phase 3G)
- **Input**: CSV columns mapped to {{variable}} placeholders
- **Output**: Step values replaced with row data
- **Integration**: buildStepToColumnMapping() creates variable→column index map

**CSV Format Example**:
```csv
Email,Password,FirstName,LastName
user1@test.com,pass123,John,Doe
user2@test.com,pass456,Jane,Smith
```

**Parsed Output**:
```javascript
[
  { Email: 'user1@test.com', Password: 'pass123', FirstName: 'John', LastName: 'Doe' },
  { Email: 'user2@test.com', Password: 'pass456', FirstName: 'Jane', LastName: 'Smith' }
]
```

**Variable Substitution**:
```javascript
// Step value: "{{Email}}"
// Column mapping: { 'email': 0 }
// Current row: ['user1@test.com', 'pass123', 'John', 'Doe']
// Result: "user1@test.com"
```

**Last Updated**: December 7, 2025 — Phase 3 Specification Complete
