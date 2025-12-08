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

1. **Single Database Version**: Schema never needs migration (risky for future changes)
2. **Auto-Increment IDs**: IDs never manually set, always auto-generated
3. **Unsorted getAllProjects()**: Returns projects in insertion order
4. **No Cascading Deletes**: deleteProject() doesn't delete associated test runs
5. **String Status**: Not enum, UI enforces valid values
6. **Any-Typed Arrays**: Runtime code knows actual structure (no type safety)

## Stability Concerns

1. **No Schema Migrations**: Adding fields requires new version + migration code
2. **No Data Validation**: Invalid data can be written
3. **No Error Handling**: Dexie errors propagate as rejected promises
4. **No Soft Deletes**: Accidentally deleted projects unrecoverable
5. **No Uniqueness Constraints**: Duplicate project names allowed
6. **IndexedDB Quota**: Large CSV files may exceed browser quota

## Developer-Must-Know Notes

1. **Dexie Table API**: `.add()`, `.update()`, `.delete()`, `.get()`, `.toArray()`, `.where()`
2. **Index Performance**: All fields in stores() string are indexed (fast queries)
3. **Transaction Isolation**: Read-committed isolation, concurrent writes serialized
4. **Promise Chaining**: All methods return Promises
5. **Storage Limits**: Chrome ~60% disk, Firefox 10%, Safari 1GB
6. **Debugging**: Chrome DevTools → Application → Storage → IndexedDB → ProjectDatabase
7. **Export Singleton**: `DB` instance shared across extension
8. **Background Only**: Only background script should access DB (UI uses messages)

## Phase 3 Integration Points

### Recording System (Phase 3A)
- **Input**: RecordingOrchestrator saves evidence buffers to IndexedDB
- **Output**: EvidenceBuffer data persisted with each recorded step
- **Integration**: New schema fields:
  - `recorded_steps[].evidence`: { dom, vision, mouse, network }
  - `recorded_steps[].confidence_scores`: Strategy quality metrics

### Test Execution (Phase 3F)
- **Input**: TestRun records include strategy telemetry
- **Output**: Performance data for DecisionEngine learning
- **Integration**: New TestRun fields:
  - `strategy_usage`: { dom: 15, cdp: 3, vision: 2 }
  - `healing_attempts`: { step_id, original_strategy, healed_strategy }

### Telemetry Repository (Phase 3D)
- **Input**: TelemetryLogger writes strategy performance to IndexedDB
- **Output**: Historical data for strategy optimization
- **Integration**: New `telemetry` table:
  - Schema: `++id, project_id, step_id, strategy_type, success, timestamp`
  - Enables DecisionEngine to learn optimal strategies per project

**Schema Migration Plan** (Phase 3):
```typescript
this.version(2).stores({
  projects: "++id, name, description, target_url, status, created_date, updated_date",
  testRuns: "++id, project_id, status, start_time, end_time, total_steps, passed_steps, failed_steps",
  evidence: "++id, project_id, step_id, layer_type, timestamp", // New
  telemetry: "++id, project_id, step_id, strategy_type, success, timestamp" // New
}).upgrade(tx => {
  // Migrate recorded_steps from projects to evidence table
  return tx.table("projects").toCollection().modify(project => {
    if (project.recorded_steps) {
      project.recorded_steps.forEach(step => {
        tx.table("evidence").add({
          project_id: project.id,
          step_id: step.id,
          layer_type: 'dom',
          timestamp: step.timestamp,
          data: step.bundle
        });
      });
    }
  });
});
```

**Last Updated**: December 7, 2025 — Phase 3 Specification Complete
