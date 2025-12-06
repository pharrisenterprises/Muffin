# Test Run Repository Breakdown

## Purpose
**What it does:** Manages test execution history in IndexedDB via Dexie.js. Stores metadata for each test run including status, timestamps, and pass/fail metrics.

**Where it lives:** `db.testruns` table in `src/common/services/indexedDB.ts`

**Why it exists:** Provides historical tracking of test executions for analytics, debugging, and audit trails. Links test runs to parent projects.

## Inputs
**TestRun Schema:**
```typescript
interface TestRun {
  id?: number;              // Auto-increment primary key
  project_id: number;       // Foreign key to projects table (not enforced)
  status: 'pending' | 'running' | 'completed' | 'failed';
  passed_steps?: number;    // Count of successful steps
  failed_steps?: number;    // Count of failed steps
  error_log?: string[];     // Array of error messages
  created_date?: number;    // Start timestamp (ms)
  updated_date?: number;    // Last update timestamp (ms)
  duration?: number;        // Execution time (ms)
}
```

## Outputs
**CRUD Operations:**
- `db.testruns.add(testrun)` → `Promise<number>` (new run ID)
- `db.testruns.get(id)` → `Promise<TestRun | undefined>`
- `db.testruns.where('project_id').equals(pid).toArray()` → `Promise<TestRun[]>`
- `db.testruns.put(testrun)` → `Promise<number>` (update status/metrics)
- `db.testruns.delete(id)` → `Promise<void>`

## Internal Architecture
**Dexie Table Configuration:**
```typescript
// In indexedDB.ts
export interface TestRun {
  id?: number;
  project_id: number;
  status: string;
  passed_steps?: number;
  failed_steps?: number;
  error_log?: string[];
  created_date?: number;
  updated_date?: number;
  duration?: number;
}

export class AppDatabase extends Dexie {
  projects!: Table<Project>;
  testruns!: Table<TestRun>;

  constructor() {
    super('MuffinDB');
    this.version(1).stores({
      projects: '++id, name, status, created_date, updated_date',
      testruns: '++id, project_id, status, created_date'  // project_id indexed
    });
  }
}
```

**Usage Pattern:**
```typescript
// TestRunner.tsx - Create test run
const runId = await db.testruns.add({
  project_id: currentProject.id,
  status: 'pending',
  passed_steps: 0,
  failed_steps: 0,
  created_date: Date.now()
});

// Update during execution
await db.testruns.put({
  id: runId,
  status: 'running',
  passed_steps: 5,
  failed_steps: 1,
  updated_date: Date.now()
});

// Complete execution
await db.testruns.put({
  id: runId,
  status: 'completed',
  passed_steps: 10,
  failed_steps: 2,
  duration: Date.now() - startTime,
  updated_date: Date.now()
});

// Load test history for project
const history = await db.testruns
  .where('project_id')
  .equals(projectId)
  .reverse()  // Newest first
  .limit(50)
  .toArray();
```

## Critical Dependencies
**Upstream:**
- **TestRunner.tsx** - Creates/updates test runs during execution
- **Dashboard.tsx** - Displays test run stats (via background message proxy)
- **background.ts** - Message handler for cross-context DB access

**Downstream:**
- **Dexie.js** - IndexedDB wrapper
- **IndexedDB API** - Browser storage

## Hidden Assumptions
1. **No foreign key enforcement** - project_id may reference deleted project
2. **Status transitions unvalidated** - Can go from 'completed' back to 'pending'
3. **No orphan cleanup** - Deleting project doesn't cascade to testruns
4. **Error log unbounded** - error_log array can grow indefinitely
5. **Single test run per execution** - No multi-row CSV batching tracked separately
6. **Timestamps in milliseconds** - Date.now() not Date objects
7. **No retention policy** - Old test runs never auto-deleted

## Stability Concerns
### High-Risk Patterns
1. **Orphaned test runs** - Project deleted but runs remain
   ```typescript
   await db.projects.delete(projectId);
   // testruns with project_id still exist → broken reference
   ```

2. **Unbounded error logs** - Large arrays hit storage quota
   ```typescript
   testRun.error_log = [...1000 errors]; // May exceed IndexedDB limits
   ```

3. **No status validation**
   ```typescript
   await db.testruns.put({ id: 1, status: 'INVALID' }); // Typo
   → Stored as-is, UI may break
   ```

4. **project_id type mismatch**
   ```typescript
   await db.testruns.add({ project_id: 'abc' }); // String not number
   → Query by number fails: .where('project_id').equals(123)
   ```

## Edge Cases
1. **Missing project_id** (not nullable in schema but not enforced)
   ```typescript
   await db.testruns.add({ status: 'pending' }); // No project_id
   → May cause downstream errors
   ```

2. **Negative step counts**
   ```typescript
   await db.testruns.put({ passed_steps: -5 }); // Invalid
   → No validation, stored as-is
   ```

3. **Duration exceeds max safe integer**
   ```typescript
   duration: Date.now() - veryOldStartTime; // Overflow?
   ```

## Developer-Must-Know Notes
**Common Issues:**
1. **Why are test runs showing for wrong project?**
   - project_id mismatch (string vs number)
   - **Fix:** Ensure `parseInt(projectId)` when querying

2. **Why aren't old test runs being deleted?**
   - No automatic cleanup
   - **Fix:** Implement retention policy (e.g., keep last 100 runs)

3. **How do I delete all runs for a project?**
   ```typescript
   const runs = await db.testruns.where('project_id').equals(pid).toArray();
   await Promise.all(runs.map(run => db.testruns.delete(run.id)));
   ```

**Integration:** TestRunner creates/updates runs during playback, Dashboard/history views query for display

**Performance:**
- **project_id indexed** → Fast queries by project (O(log n))
- **created_date indexed** → Fast sorting by date
- **No compound indexes** → Filtering by status + project_id = full scan

**Future Improvements:**
- Add cascade delete (remove runs when project deleted)
- Implement retention policy (auto-delete old runs)
- Add status enum validation
- Compress error_log (deduplicate, limit size)
- Add test run export feature
- Implement compound index: `[project_id+created_date]`
