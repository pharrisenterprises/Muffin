# Test Run Repository - Component Breakdown

**Last Updated:** December 7, 2025

---

## Purpose
**What it does:** Manages test execution history in IndexedDB via Dexie.js. Stores metadata for each test run including status, timestamps, pass/fail metrics, and error logs.

**Where it lives:** `db.testruns` table in `src/common/services/indexedDB.ts`

**Why it exists:** Provides historical tracking of test executions for analytics, debugging, audit trails, and trend analysis. Links test runs to parent projects.

---

## Inputs
**TestRun Schema:**
```typescript
interface TestRun {
  id?: number;              // Auto-increment primary key
  project_id: number;       // Foreign key to projects table (not enforced by DB)
  status: 'pending' | 'running' | 'completed' | 'failed';
  passed_steps?: number;    // Count of successful steps
  failed_steps?: number;    // Count of failed steps
  error_log?: string[];     // Array of error messages
  created_date?: number;    // Start timestamp (milliseconds)
  updated_date?: number;    // Last update timestamp (milliseconds)
  duration?: number;        // Execution time (milliseconds)
}
```

---

## Outputs
**CRUD Operations:**
```typescript
// Create
db.testruns.add(testrun: TestRun): Promise<number>  // Returns new run ID

// Read
db.testruns.get(id: number): Promise<TestRun | undefined>
db.testruns.where('project_id').equals(projectId).toArray(): Promise<TestRun[]>

// Update
db.testruns.put(testrun: TestRun): Promise<number>  // Returns ID

// Delete
db.testruns.delete(id: number): Promise<void>

// Query by status
db.testruns.where('status').equals('completed').toArray(): Promise<TestRun[]>

// Recent runs
db.testruns.orderBy('created_date').reverse().limit(50).toArray(): Promise<TestRun[]>
```

---

## Internal Architecture

### Dexie Table Configuration
```typescript
// indexedDB.ts
import Dexie, { Table } from 'dexie';

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
      testruns: '++id, project_id, status, created_date'
    });
  }
}

export const db = new AppDatabase();
```

**Index Strategy:**
- `++id` - Auto-increment primary key
- `project_id` - **Indexed** for fast project-based queries
- `status` - **Indexed** for filtering by completion state
- `created_date` - **Indexed** for chronological sorting

### Usage Pattern (Test Execution Lifecycle)

#### 1. Create Test Run (Test Start)
```typescript
// TestRunner.tsx - Beginning of runTest()
const runId = await db.testruns.add({
  project_id: currentProject.id,
  status: 'pending',
  passed_steps: 0,
  failed_steps: 0,
  error_log: [],
  created_date: Date.now(),
  updated_date: Date.now()
});
```

#### 2. Update During Execution
```typescript
// After each step
await db.testruns.put({
  ...currentTestRun,
  status: 'running',
  passed_steps: passedCount,
  failed_steps: failedCount,
  error_log: [...errorLog, newError],
  updated_date: Date.now()
});
```

#### 3. Complete Execution
```typescript
// End of runTest()
await db.testruns.put({
  ...currentTestRun,
  status: failedSteps > 0 ? 'failed' : 'completed',
  passed_steps: finalPassedCount,
  failed_steps: finalFailedCount,
  duration: Date.now() - startTime,
  updated_date: Date.now()
});
```

#### 4. Load Test History
```typescript
// Dashboard or TestRunner history view
const history = await db.testruns
  .where('project_id')
  .equals(projectId)
  .reverse()  // Newest first
  .limit(50)   // Last 50 runs
  .toArray();

// Display in table:
history.forEach(run => {
  console.log(`Run ${run.id}: ${run.status}, ${run.passed_steps}/${run.failed_steps}, ${run.duration}ms`);
});
```

---

## Critical Dependencies
**Upstream:**
- **TestRunner.tsx** - Creates/updates test runs during execution
- **Dashboard.tsx** - Displays test run stats
- **background.ts** - Message handler proxy for cross-context DB access

**Downstream:**
- **Dexie.js** - IndexedDB wrapper library
- **IndexedDB API** - Browser storage engine

**External:**
- **dexie** (npm) - Reactive IndexedDB wrapper

---

## Hidden Assumptions
1. **No foreign key enforcement** - project_id may reference deleted project (orphan risk)
2. **Status transitions unvalidated** - Can go from 'completed' back to 'pending' (no state machine)
3. **No orphan cleanup** - Deleting project doesn't cascade to testruns
4. **Error log unbounded** - error_log array can grow indefinitely (storage quota risk)
5. **Single test run per execution** - No batch tracking (each CSV row not tracked separately)
6. **Timestamps in milliseconds** - Date.now() not Date objects (consistency with projects table)
7. **No retention policy** - Old test runs never auto-deleted (accumulation)

---

## Stability Concerns

### High-Risk Patterns
1. **Orphaned test runs**
   ```typescript
   await db.projects.delete(projectId);
   // testruns with this project_id still exist → Broken references
   // Queries: .where('project_id').equals(projectId) return data
   ```

2. **Unbounded error logs**
   ```typescript
   testRun.error_log = [...Array(10000).keys()].map(i => `Error ${i}`);
   await db.testruns.put(testRun);
   // May hit IndexedDB storage quota (~50MB per origin)
   ```

3. **No status validation**
   ```typescript
   await db.testruns.put({ id: 1, status: 'INVALID_STATUS' });  // Typo
   // Stored as-is, UI may break on render
   ```

4. **Type mismatch on project_id**
   ```typescript
   await db.testruns.add({ project_id: 'abc' as any });  // String instead of number
   // Query fails: .where('project_id').equals(123) won't find it
   ```

### Failure Modes
- **Storage quota exceeded** - Large error_log arrays hit limits
- **Query performance** - Unindexed compound queries (status + project_id) slow
- **Orphan accumulation** - Deleted projects leave testruns behind
- **Memory exhaustion** - Loading 10,000+ runs into memory crashes UI

---

## Edge Cases

### Input Variations
1. **Missing project_id** (schema says required but not enforced)
   ```typescript
   await db.testruns.add({ status: 'pending' } as any);  // No project_id
   // Stored successfully, breaks queries later
   ```

2. **Negative step counts**
   ```typescript
   await db.testruns.put({ passed_steps: -5, failed_steps: -2 });
   // No validation, stored as-is (invalid data)
   ```

3. **Duration overflow**
   ```typescript
   duration: Date.now() - veryOldStartTime;  // May exceed MAX_SAFE_INTEGER
   // Unlikely but possible for very long-running tests
   ```

4. **Empty error_log**
   ```typescript
   error_log: [];  // vs error_log: undefined
   // Both valid, but serialization differs
   ```

5. **Concurrent updates**
   ```typescript
   // Two tabs update same test run simultaneously
   await db.testruns.put({ id: 1, passed_steps: 5 });  // Tab A
   await db.testruns.put({ id: 1, passed_steps: 7 });  // Tab B
   // Last write wins, Tab A changes lost
   ```

---

## Developer-Must-Know Notes

### Common Issues
1. **Q: Why are test runs showing for wrong project?**
   - **A:** project_id type mismatch (string vs number)
   - **Fix:** `parseInt(projectId)` when querying

2. **Q: Why aren't old test runs being deleted?**
   - **A:** No automatic cleanup implemented
   - **Fix:** Implement retention policy (e.g., keep last 100 runs per project)

3. **Q: How do I delete all runs for a project?**
   ```typescript
   const runs = await db.testruns.where('project_id').equals(projectId).toArray();
   await Promise.all(runs.map(run => db.testruns.delete(run.id!)));
   ```

4. **Q: Why is loading test history slow?**
   - **A:** No compound index for common query patterns
   - **Fix:** Add compound index: `testruns: '++id, [project_id+created_date]'`

### Performance Tips
- **project_id indexed** → O(log n) query by project
- **created_date indexed** → Fast chronological sorting
- **No compound indexes** → `status + project_id` filter = full table scan
- **Limit results** → Use `.limit(50)` for pagination

---

## Phase 3 Integration Points

### Strategy Implementation
| Strategy ID | Relevance | Integration Point |
|-------------|-----------|-------------------|
| **DAT-003** | Critical | StorageService wraps Test Run Repository for persistence |
| **TST-009** | Critical | Test result validation relies on passed/failed metrics |
| **G4** | High | PlaybackEngine creates/updates test runs during execution |

### Specification Mapping
- **D2** (Project Management) - Test run history linked to projects
- **G4** (Playback Engine) - Stores execution results for analytics
- **H3** (Data Integrity) - Historical audit trail for test executions

### Evidence References
- Code: `src/common/services/indexedDB.ts` lines 40-60 (testruns table schema)
- Schema: Dexie version 1 stores definition
- Test: Manual verification in Chrome DevTools → IndexedDB → MuffinDB → testruns

### Integration Risks
1. **Orphan Accumulation:** Deleted projects leave testruns behind (no cascade delete)
2. **Storage Quota:** Large error_log arrays may hit IndexedDB limits
3. **Type Safety:** project_id type mismatch causes query failures
4. **Performance:** Unindexed compound queries slow with large datasets

---

## Recommendations for Future Enhancement

### 1. Add Cascade Delete
```typescript
// When deleting project
await db.projects.delete(projectId);
const orphanedRuns = await db.testruns.where('project_id').equals(projectId).toArray();
await Promise.all(orphanedRuns.map(run => db.testruns.delete(run.id!)));
```

### 2. Implement Retention Policy
```typescript
// Keep last 100 runs per project
const runs = await db.testruns
  .where('project_id')
  .equals(projectId)
  .reverse()
  .toArray();

const toDelete = runs.slice(100);  // Older than 100th
await Promise.all(toDelete.map(run => db.testruns.delete(run.id!)));
```

### 3. Add Status Enum Validation
```typescript
const VALID_STATUSES = ['pending', 'running', 'completed', 'failed'] as const;
type TestRunStatus = typeof VALID_STATUSES[number];

function validateStatus(status: string): TestRunStatus {
  if (!VALID_STATUSES.includes(status as any)) {
    throw new Error(`Invalid status: ${status}`);
  }
  return status as TestRunStatus;
}
```

### 4. Compress Error Logs
```typescript
// Deduplicate identical errors
error_log: Array.from(new Set(errorMessages)).slice(0, 100);  // Max 100 unique
```

### 5. Add Compound Index
```typescript
this.version(2).stores({
  testruns: '++id, project_id, status, created_date, [project_id+created_date]'
});
```

---

## Related Components
- **IndexedDB Storage** (`indexeddb-storage_breakdown.md`) - Dexie configuration layer
- **Test Orchestrator** (`test-orchestrator_breakdown.md`) - Creates/updates test runs
- **Test Runner UI** (`test-runner-ui_breakdown.md`) - Displays test history
- **Project Repository** (`project-repository_breakdown.md`) - Parent table relationship
- **Dashboard UI** (`dashboard-ui_breakdown.md`) - Shows project-level test stats
