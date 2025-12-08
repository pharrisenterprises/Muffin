# IndexedDB Storage — Component Breakdown

## Purpose
The IndexedDB storage layer (`indexedDB.ts`) provides a typed, Promise-based wrapper around browser IndexedDB using Dexie.js. It defines the database schema for projects and test runs, exposes CRUD operations, and ensures data persistence across browser sessions. This is the single source of truth for all automation project data.

## Inputs
- **Database Operations** (from background service worker):
  - `addProject(project)`: Create new project
  - `updateProject(id, updates)`: Partial project update
  - `getAllProjects()`: Retrieve all projects
  - `deleteProject(id)`: Remove project
  - `createTestRun(run)`: Create test run record
  - `updateTestRun(id, updates)`: Update test run
  - `getTestRunsByProject(projectId)`: Query test runs by project

- **Data Objects**:
  - **Project**:
    ```typescript
    {
      id?: number,
      name: string,
      description: string,
      target_url: string,
      status: string,
      created_date: number,
      updated_date: number,
      recorded_steps?: any[],
      parsed_fields?: any[],
      csv_data?: any[]
    }
    ```
  - **TestRun**:
    ```typescript
    {
      id?: number,
      project_id: number,
      status: string,
      start_time: string,
      end_time?: string,
      total_steps: number,
      passed_steps: number,
      failed_steps: number,
      test_results: any[],
      logs: string
    }
    ```

## Outputs
- **Promise<number>**: Auto-incremented ID for new records
- **Promise<Project[]>**: Array of all projects
- **Promise<TestRun[]>**: Array of test runs (sorted by start_time, descending)
- **Promise<void>**: For delete operations
- **Promise<number>**: Count of updated records

## Internal Architecture

### Key File
- **Single file**: `src/common/services/indexedDB.ts` (~80 lines)

### Class Structure

```typescript
class ProjectDB extends Dexie {
  public projects!: Table<Project, number>;
  public testRuns!: Table<TestRun, number>;

  constructor() {
    super("ProjectDatabase");
    this.version(1).stores({
      projects: "++id, name, description, target_url, status, created_date, updated_date, recorded_steps, parsed_fields, csv_data",
      testRuns: "++id, project_id, status, start_time, end_time, total_steps, passed_steps, failed_steps"
    });
  }
}
```

### Methods

1. **Project Methods**:
   - `addProject(project)`: Adds project, returns auto-incremented ID
   - `updateProject(id, updates)`: Partial update using Dexie's `.update()`
   - `getAllProjects()`: Returns all projects as array (unsorted)
   - `deleteProject(projectId)`: Hard delete by ID

2. **TestRun Methods**:
   - `createTestRun(run)`: Adds test run, returns ID
   - `updateTestRun(id, updates)`: Partial update
   - `getTestRunsByProject(projectId)`:
     - Queries by `project_id` index
     - Sorts by `start_time` descending (most recent first)
     - Uses `.reverse()` and `.sortBy()`

### Singleton Export
```typescript
export const DB = new ProjectDB();
```

## Critical Dependencies

### External Libraries
- **Dexie.js** (v4.0.11): IndexedDB wrapper
  - Provides: Table abstraction, Promise-based API, query methods, indexing

### Browser APIs
- **IndexedDB**: Browser's local database (via Dexie abstraction)

### Type Dependencies
- **Project** and **TestRun** interfaces defined in same file
- **any[]** used for complex fields (recorded_steps, parsed_fields, csv_data, test_results)

## Hidden Assumptions

1. **Single Database Version**:
   - **Current**: Version 1
   - **Assumption**: Schema never needs migration
   - **Risk**: Future schema changes require migration logic

2. **Auto-Increment IDs**:
   - **Pattern**: `++id` in schema
   - **Assumption**: IDs never manually set, always auto-generated
   - **Risk**: If ID manually provided, may conflict with auto-increment

3. **Unsorted getAllProjects()**:
   - **Returns**: Projects in insertion order (IndexedDB default)
   - **Assumption**: UI handles sorting (currently sorts by updated_date in Dashboard)

4. **No Cascading Deletes**:
   - **deleteProject()** doesn't delete associated test runs
   - **Assumption**: TestRuns orphaned or cleaned up separately
   - **Risk**: Data inconsistency if test runs reference deleted projects

5. **String Status**:
   - **status** field is string, not enum
   - **Assumption**: UI enforces valid values ("draft", "ready", "running", "completed")
   - **Risk**: Typos cause unexpected behavior

6. **Any-Typed Arrays**:
   - **recorded_steps**, **parsed_fields**, **csv_data**, **test_results** all `any[]`
   - **Assumption**: Runtime code knows actual structure
   - **Risk**: Type safety lost, runtime errors possible

## Stability Concerns

1. **No Schema Migrations**:
   - **Risk**: Adding fields or changing structure requires new version
   - **Impact**: Existing data inaccessible without migration code
   - **Recommendation**: Implement Dexie migration hooks

2. **No Data Validation**:
   - **Risk**: Invalid data can be written (e.g., negative step counts, malformed URLs)
   - **Impact**: UI may crash when reading invalid data
   - **Recommendation**: Add validation layer before write

3. **No Error Handling**:
   - **Risk**: Dexie errors propagate as rejected promises
   - **Impact**: Background script must catch all errors
   - **Current**: Background wraps in try/catch, sends error messages to UI

4. **No Soft Deletes**:
   - **Risk**: Accidentally deleted projects unrecoverable
   - **Impact**: User loses work
   - **Recommendation**: Add `deleted` boolean flag instead of hard delete

5. **No Uniqueness Constraints**:
   - **Risk**: Duplicate project names allowed
   - **Impact**: Confusing UI, no way to distinguish projects
   - **Recommendation**: Add unique index on name (or compound key)

6. **IndexedDB Quota**:
   - **Risk**: Large CSV files or many test runs may exceed quota
   - **Impact**: Write operations fail silently
   - **Recommendation**: Monitor storage usage, implement cleanup strategy

## Edge Cases

1. **Empty Database**:
   - **Handling**: `getAllProjects()` returns empty array
   - **UI**: Shows "No projects yet" message

2. **Concurrent Updates**:
   - **Handling**: Dexie handles transaction isolation
   - **Edge**: Last write wins if two updates to same project

3. **Large CSV Data**:
   - **Handling**: No size limit in code
   - **Edge**: May hit browser quota (typically 50MB-2GB depending on browser)

4. **Special Characters in Fields**:
   - **Handling**: IndexedDB stores raw strings
   - **Edge**: XPath with quotes, backslashes stored correctly

5. **Deleted Project with Active Test Runs**:
   - **Handling**: Test runs remain (orphaned)
   - **Edge**: `getTestRunsByProject()` may reference deleted project

6. **Time Zone Issues**:
   - **Handling**: start_time and end_time stored as strings
   - **Edge**: Time zone conversions handled by UI (date-fns)

## Developer-Must-Know Notes

1. **Dexie Table API**:
   - **Equivalent**: Dexie `Table` ≈ SQL table
   - **Operations**: `.add()`, `.update()`, `.delete()`, `.get()`, `.toArray()`, `.where()`
   - **Queries**: `.where("field").equals(value)`, `.sortBy("field")`

2. **Index Performance**:
   - **Indexed fields**: All fields in stores() string (name, status, etc.)
   - **Fast queries**: Queries on indexed fields use B-tree lookup
   - **Slow queries**: Non-indexed fields require full table scan

3. **Transaction Isolation**:
   - **Dexie default**: Read-committed isolation
   - **Concurrent writes**: Serialized automatically
   - **Read-write conflict**: Later transaction waits for earlier to complete

4. **Promise Chaining**:
   - **Pattern**: All methods return Promises
   - **Background usage**: `.then(result => sendResponse(...)).catch(err => sendResponse({error}))`

5. **Schema Evolution**:
   - **Current**: Version 1, no migrations
   - **Future**: `this.version(2).stores({...}).upgrade(tx => { /* migration */ })`
   - **Recommendation**: Plan for v2 with proper types for arrays

6. **Storage Limits**:
   - **Chrome**: ~60% of available disk space (persistent storage)
   - **Firefox**: 10% of total disk space (default)
   - **Safari**: 1GB limit
   - **Check**: `navigator.storage.estimate()`

7. **Export Singleton Pattern**:
   - **`export const DB = new ProjectDB()`**: Single instance shared across extension
   - **Background only**: Only background script should access DB (UI goes through messages)

8. **Debugging**:
   - **Chrome DevTools**: Application → Storage → IndexedDB → ProjectDatabase
   - **Inspect**: View projects and testRuns tables, edit records manually
   - **Clear**: Right-click → Delete database

9. **Testing Strategy**:
   - **Mock Dexie**: Use `Dexie.delete("ProjectDatabase")` before each test
   - **Seed data**: Create test projects/runs in beforeEach()
   - **Assertions**: Check returned IDs, query results, counts

10. **Type Safety Recommendations**:
    - Define proper interfaces for recorded_steps, parsed_fields, csv_data
    - Use TypeScript generics: `Table<Project, number>` already typed
    - Consider: `recorded_steps: RecordedStep[]` instead of `any[]`
