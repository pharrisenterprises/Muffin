# Project Repository Breakdown

## Purpose
**What it does:** Provides CRUD operations wrapper around Dexie.js for the `projects` table in IndexedDB. Encapsulates all database interactions for project management with type-safe interfaces.

**Where it lives:** Part of `src/common/services/indexedDB.ts` via `db.projects` table accessor

**Why it exists:** Separates data access logic from UI components. Provides consistent API for project operations across Dashboard, Recorder, FieldMapper, and TestRunner.

## Inputs
**Project Schema:**
```typescript
interface Project {
  id?: number;               // Auto-increment primary key
  name: string;              // Project title
  description?: string;      // Optional description
  target_url?: string;       // Starting URL for tests
  recorded_steps?: Step[];   // Array of captured interactions
  parsed_fields?: FieldMapping[];  // CSV to field mappings
  csv_data?: any[];          // CSV rows for batch testing
  status?: 'draft' | 'recording' | 'mapping' | 'testing' | 'completed';
  created_date?: number;     // Timestamp
  updated_date?: number;     // Timestamp
}
```

## Outputs
**CRUD Operations:**
- `db.projects.add(project)` → `Promise<number>` (new project ID)
- `db.projects.get(id)` → `Promise<Project | undefined>`
- `db.projects.toArray()` → `Promise<Project[]>` (all projects)
- `db.projects.put(project)` → `Promise<number>` (update)
- `db.projects.delete(id)` → `Promise<void>`

## Internal Architecture
**Dexie Table Configuration:**
```typescript
// In indexedDB.ts
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

**Usage Pattern:**
```typescript
// Create project
const projectId = await db.projects.add({
  name: 'Login Test',
  description: 'Test login flow',
  status: 'draft',
  created_date: Date.now(),
  updated_date: Date.now()
});

// Read project
const project = await db.projects.get(projectId);

// Update project
await db.projects.put({
  ...project,
  recorded_steps: [...steps],
  updated_date: Date.now()
});

// Delete project
await db.projects.delete(projectId);

// List all projects
const allProjects = await db.projects.toArray();

// Query by status
const draftProjects = await db.projects
  .where('status')
  .equals('draft')
  .toArray();
```

## Critical Dependencies
**Upstream:**
- **Dashboard.tsx** - Lists/creates/deletes projects
- **Recorder.tsx** - Updates recorded_steps
- **FieldMapper.tsx** - Updates parsed_fields and csv_data
- **TestRunner.tsx** - Reads project for execution
- **background.ts** - Message handler proxy for DB operations

**Downstream:**
- **Dexie.js** - IndexedDB wrapper library
- **IndexedDB API** - Browser storage engine

## Hidden Assumptions
1. **Auto-increment IDs** - Primary key managed by Dexie
2. **No foreign key constraints** - TestRuns reference projects by ID but no DB enforcement
3. **JSON serialization** - Complex objects (steps, fields, csv_data) stored as JSON
4. **No schema migrations** - Version 1 only, breaking changes require data wipe
5. **Single database** - All users share same DB (no multi-tenancy)
6. **No soft deletes** - DELETE removes data permanently
7. **Timestamps in milliseconds** - Date.now() used, not Date objects
8. **Status field unindexed** - Queries by status are full table scans

## Stability Concerns
### High-Risk Patterns
1. **No schema versioning strategy**
   ```typescript
   // Adding new field requires version bump
   this.version(2).stores({ projects: '++id, ..., new_field' })
   // Existing data may not migrate
   ```

2. **Large arrays stored as JSON** - recorded_steps can grow unbounded
   ```typescript
   project.recorded_steps = [...1000 steps]  // May hit storage quota
   ```

3. **No backup mechanism** - Data loss on browser storage clear
   ```typescript
   // User clears site data → All projects lost
   ```

4. **Concurrent write conflicts** - Multiple tabs can corrupt data
   ```typescript
   // Tab A: await db.projects.put({ id: 1, steps: [...old] })
   // Tab B: await db.projects.put({ id: 1, steps: [...new] })
   // Last write wins, Tab A changes lost
   ```

## Edge Cases
1. **Missing ID on update**
   ```typescript
   await db.projects.put({ name: 'Test' }); // No id
   → Adds new project instead of updating
   ```

2. **Duplicate names allowed**
   ```typescript
   await db.projects.add({ name: 'Test 1' });
   await db.projects.add({ name: 'Test 1' }); // No unique constraint
   ```

3. **Status typos**
   ```typescript
   await db.projects.add({ status: 'DRAFT' }); // Should be 'draft'
   → No validation, stored as-is
   ```

## Developer-Must-Know Notes
**Common Issues:**
1. **Why is my project not updating?**
   - Forgot to include `id` field in `put()` call
   - **Fix:** Always spread existing project: `{...project, newField: value}`

2. **Why did I lose project data?**
   - Browser storage cleared (incognito mode, storage quota exceeded)
   - **Fix:** Implement export/import feature

3. **How do I query projects efficiently?**
   - Use indexed fields: `id`, `name`, `status`, `created_date`
   - Avoid filters on unindexed fields (parsed_fields, csv_data)

**Integration:** Called via `chrome.runtime.sendMessage` from UI pages → background.ts → db.projects

**Performance:** O(1) for get/put/delete by ID, O(n) for toArray() and status queries

**Future Improvements:**
- Add schema migrations
- Implement soft deletes (deleted_at field)
- Add unique constraints (name per user)
- Paginate toArray() for large datasets
- Add project export/import (JSON backup)
