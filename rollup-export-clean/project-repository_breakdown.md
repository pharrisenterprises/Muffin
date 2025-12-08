# Project Repository - Component Breakdown

**Last Updated:** December 7, 2025

---

## Purpose
**What it does:** Data access layer for the `projects` table in IndexedDB. Provides type-safe CRUD operations wrapper around Dexie.js, encapsulating all project database interactions.

**Where it lives:** `src/common/services/indexedDB.ts` - `db.projects` table accessor

**Why it exists:** Separates database logic from UI components. Provides centralized, consistent API for project operations across Dashboard, Recorder, FieldMapper, and TestRunner.

---

## Inputs
**Project Schema:**
```typescript
interface Project {
  id?: number;                    // Auto-increment primary key
  name: string;                   // Project title (required)
  description?: string;           // Optional description
  target_url?: string;            // Starting URL for test execution
  recorded_steps?: Step[];        // Array of captured interactions
  parsed_fields?: FieldMapping[]; // CSV column to field mappings
  csv_data?: any[];               // Parsed CSV rows for batch testing
  status?: 'draft' | 'recording' | 'mapping' | 'testing' | 'completed';
  created_date?: number;          // Unix timestamp (milliseconds)
  updated_date?: number;          // Unix timestamp (milliseconds)
}
```

---

## Outputs
**CRUD Operations:**
```typescript
// Create
db.projects.add(project: Project): Promise<number>  // Returns new ID

// Read
db.projects.get(id: number): Promise<Project | undefined>
db.projects.toArray(): Promise<Project[]>

// Update
db.projects.put(project: Project): Promise<number>  // Returns ID

// Delete
db.projects.delete(id: number): Promise<void>

// Query
db.projects.where('status').equals('draft').toArray(): Promise<Project[]>
db.projects.orderBy('created_date').reverse().toArray(): Promise<Project[]>
```

---

## Internal Architecture

### Dexie Table Configuration
```typescript
// indexedDB.ts
import Dexie, { Table } from 'dexie';

export interface Project {
  id?: number;
  name: string;
  description?: string;
  target_url?: string;
  recorded_steps?: any[];
  parsed_fields?: any[];
  csv_data?: any[];
  status?: string;
  created_date?: number;
  updated_date?: number;
}

export class AppDatabase extends Dexie {
  projects!: Table<Project>;
  testruns!: Table<TestRun>;

  constructor() {
    super('MuffinDB');
    this.version(1).stores({
      projects: '++id, name, status, created_date, updated_date',
      testruns: '++id, project_id, status, created_date'
    });
  }
}

export const db = new AppDatabase();
```

**Index Explanation:**
- `++id` - Auto-increment primary key
- `name` - Indexed for search/sorting
- `status` - Indexed for filtering (draft/recording/etc)
- `created_date`, `updated_date` - Indexed for sorting by date

### Usage Patterns

#### Create Project
```typescript
const projectId = await db.projects.add({
  name: 'Login Test',
  description: 'Test login flow with valid credentials',
  target_url: 'https://example.com/login',
  status: 'draft',
  created_date: Date.now(),
  updated_date: Date.now()
});
console.log('Created project ID:', projectId);
```

#### Read Project
```typescript
const project = await db.projects.get(projectId);
if (project) {
  console.log('Project name:', project.name);
}
```

#### Update Project (Add Steps)
```typescript
const project = await db.projects.get(projectId);
await db.projects.put({
  ...project,
  recorded_steps: [...steps],
  status: 'recording',
  updated_date: Date.now()
});
```

#### Delete Project
```typescript
await db.projects.delete(projectId);
```

#### Query Projects
```typescript
// Get all draft projects
const drafts = await db.projects
  .where('status')
  .equals('draft')
  .toArray();

// Get recent projects (last 30 days)
const recent = await db.projects
  .where('created_date')
  .above(Date.now() - 30 * 24 * 60 * 60 * 1000)
  .toArray();

// Get all projects sorted by name
const sorted = await db.projects
  .orderBy('name')
  .toArray();
```

---

## Critical Dependencies
**Upstream:**
- **Dashboard.tsx** - Lists/creates/deletes projects
- **Recorder.tsx** - Updates `recorded_steps` array
- **FieldMapper.tsx** - Updates `parsed_fields` and `csv_data`
- **TestRunner.tsx** - Reads project for test execution
- **background.ts** - Message handler proxy for DB operations

**Downstream:**
- **Dexie.js** - IndexedDB wrapper library (v3.x)
- **IndexedDB API** - Browser storage engine

**External:**
- **dexie** npm package - Reactive IndexedDB wrapper

---

## Hidden Assumptions
1. **Auto-increment IDs** - Primary key managed by Dexie, cannot be set manually
2. **No foreign key constraints** - TestRuns reference projects by ID but no DB enforcement
3. **JSON serialization** - Complex objects (steps, fields, csv_data) stored as JSON blobs
4. **No schema migrations** - Version 1 only, breaking changes require data wipe
5. **Single database** - All users share same DB (no multi-tenancy)
6. **No soft deletes** - DELETE removes data permanently (no undo)
7. **Timestamps in milliseconds** - `Date.now()` used, not Date objects
8. **Status field unindexed for IN queries** - Querying multiple statuses requires OR logic

---

## Stability Concerns

### High-Risk Patterns
1. **No schema versioning strategy**
   ```typescript
   // Adding new field requires version bump
   this.version(2).stores({
     projects: '++id, name, status, created_date, updated_date, new_field'
   }).upgrade(tx => {
     // Must migrate existing data
     return tx.projects.toCollection().modify(project => {
       project.new_field = defaultValue;
     });
   });
   ```

2. **Large arrays stored as JSON**
   ```typescript
   project.recorded_steps = [...1000 steps];  // May hit 100KB quota
   // IndexedDB has storage limits, large projects may fail
   ```

3. **No backup mechanism**
   ```typescript
   // User clears browser data → All projects lost
   // Should export to JSON or cloud backup
   ```

4. **Concurrent write conflicts**
   ```typescript
   // Tab A: await db.projects.put({ id: 1, steps: [...old] });
   // Tab B: await db.projects.put({ id: 1, steps: [...new] });
   // Last write wins, Tab A changes lost (no optimistic locking)
   ```

5. **Unbounded csv_data growth**
   ```typescript
   project.csv_data = [...10000 rows];  // May exhaust memory/storage
   ```

### Failure Modes
- **Storage quota exceeded** - IndexedDB throws QuotaExceededError
- **Database corruption** - Browser crash during write may corrupt DB
- **Schema mismatch** - Manual DB edits break type safety
- **Missing migration** - Adding fields without version bump loses data

---

## Edge Cases

### Input Variations
1. **Empty name**
   ```typescript
   db.projects.add({ name: '' });  // Allowed but invalid
   ```

2. **No required fields**
   ```typescript
   db.projects.add({ name: 'Test' });  // Missing optional fields → undefined
   ```

3. **Negative timestamps**
   ```typescript
   db.projects.add({ name: 'Test', created_date: -1 });  // Allowed
   ```

4. **Null vs undefined**
   ```typescript
   { description: undefined }  // Not stored
   { description: null }       // Stored as null
   ```

5. **Circular references in steps**
   ```typescript
   const step = { event: 'click', ref: null };
   step.ref = step;  // Circular
   db.projects.add({ name: 'Test', recorded_steps: [step] });
   // Throws during JSON serialization
   ```

---

## Developer-Must-Know Notes
- **Version 1 schema only** - No migrations implemented (breaking changes require data wipe)
- **Auto-increment IDs** - Cannot manually set project ID
- **put() requires full object** - Missing fields will be deleted (use spread operator)
- **toArray() loads all into memory** - Large datasets may cause performance issues
- **Dexie uses Promises** - All operations are async
- **IndexedDB per-origin** - Separate databases for localhost vs production domain
- **Browser DevTools** - Inspect IndexedDB in Application tab → Storage → IndexedDB

---

## Phase 3 Integration Points

### Strategy Implementation
| Strategy ID | Relevance | Integration Point |
|-------------|-----------|-------------------|
| **DAT-003** | Critical | StorageService wraps Project Repository for all data operations |
| **MIG-001** | Critical | Schema migration runs on `get()` to add `recordedVia` field |
| **D2** | Critical | Project Management specification defines full CRUD lifecycle |

### Specification Mapping
- **D2** (Project Management) - Database schema for test project storage
- **B1** (Recording Workflow) - Stores recorded_steps during capture
- **B2** (CSV Integration) - Stores parsed_fields and csv_data for batch testing
- **G4** (Playback Engine) - Reads projects for test execution

### Evidence References
- Code: `src/common/services/indexedDB.ts` lines 1-80 (database schema + initialization)
- Schema: `projects` table definition with 10 fields (id, name, description, etc.)
- Test: Manual verification in Chrome DevTools → Application → IndexedDB → MuffinDB

### Integration Risks
1. **No Migrations:** Adding fields requires version bump + manual data migration (breaking change risk)
2. **Quota Exceeded:** Large recorded_steps or csv_data arrays may hit storage limits
3. **Write Conflicts:** Multi-tab concurrent edits may lose data (last write wins)
4. **Schema Drift:** TypeScript types may diverge from actual DB schema over time

---

## Related Components
- **IndexedDB Storage** (`indexeddb-storage_breakdown.md`) - Lower-level Dexie configuration
- **Project CRUD** (`project-crud_breakdown.md`) - UI components calling these operations
- **Message Router** (`message-router_breakdown.md`) - Proxies CRUD messages from UI to repository
- **Schema Migration** (`schema-migration_breakdown.md`) - Runs on project load to upgrade schema
- **Dashboard UI** (`dashboard-ui_breakdown.md`) - Primary consumer of project list
