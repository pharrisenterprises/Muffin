# Component Rollup: F through P

This rollup covers 10 components from field-mapper-ui through project-repository, providing comprehensive documentation of data-driven testing, DOM traversal, storage, messaging, and project management subsystems.

---

## 1. Field Mapper UI

### Purpose
CSV field mapping interface that matches CSV columns to recorded step labels for batch test execution. Enables data-driven testing by mapping CSV columns to form fields, allowing single recording to run with multiple data sets.

### Location
- **Primary File**: `src/pages/FieldMapper.tsx` (400+ lines)
- **Entry Point**: Accessed via `/field-mapper?project=<id>` route

### Key Responsibilities
- CSV file upload and parsing (PapaParse integration)
- Manual field-to-label mapping via dropdowns
- Automated mapping using string-similarity algorithm
- Mapping persistence to IndexedDB
- Navigation to TestRunner on completion

### API Surface
**URL Parameters:**
- `?project=<id>` - Project identifier for loading recorded steps

**Data Structures:**
```typescript
{
  parsed_fields: [
    { field_name: 'Email', mapped: boolean, inputvarfields: 'Email Address' }
  ],
  csv_data: any[]  // First 10 rows for preview
}
```

### Architecture
**Components:**
- `<FieldMappingTable>` - Displays CSV fields with step label dropdowns
- `<MappingSummary>` - Progress indicator (X/Y fields mapped)
- CSV upload button - Triggers PapaParse
- Auto-map button - Invokes field-mapping-engine algorithm

**Flow:**
1. User uploads CSV → PapaParse extracts headers
2. Creates field objects: `{ field_name: 'Email', mapped: false, inputvarfields: '' }`
3. User manually selects step label OR clicks "Auto-Map"
4. Auto-map uses string-similarity for fuzzy matching
5. Save button → Updates `project.parsed_fields` and `project.csv_data` in IndexedDB

### Dependencies
- **Inbound**: Dashboard (navigation after recording), IndexedDB (project data)
- **Outbound**: Field-Mapping-Engine (auto-map algorithm), TestRunner (navigation)

---

## 2. Field Mapping Engine

### Purpose
Intelligent matching algorithm that automatically maps CSV column names to recorded step labels using string similarity scoring. Reduces manual mapping time for large datasets (20+ fields).

### Location
- **Primary Function**: `autoMapFields()` in `src/pages/FieldMapper.tsx`
- **Library**: `string-similarity` NPM package (Sørensen–Dice coefficient)

### Key Responsibilities
- Normalize CSV column names (lowercase, remove spaces/underscores)
- Normalize step labels (same normalization)
- Calculate similarity scores for all field/label pairs
- Auto-assign best matches above threshold

### API Surface
**Inputs:**
```typescript
fields: [{ field_name: 'User Email', mapped: false, inputvarfields: '' }]
recordedSteps: [{ label: 'Email Address', ... }]
```

**Outputs:**
```typescript
fields: [{ field_name: 'User Email', mapped: true, inputvarfields: 'Email Address' }]
```

### Algorithm Details
```typescript
import stringSimilarity from 'string-similarity';

function autoMapFields() {
  fields.forEach((field, index) => {
    if (field.mapped) return;  // Skip already mapped
    
    const normalizedFieldName = field.field_name
      .toLowerCase()
      .replace(/[\s_]/g, '');
    
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
    
    if (bestScore > 0.4) {  // Threshold
      fields[index].mapped = true;
      fields[index].inputvarfields = bestMatch.label;
    }
  });
}
```

### Special Cases
- **Threshold**: 0.4 similarity score minimum for auto-mapping
- **Normalization**: Removes spaces, underscores, case differences
- **Skips**: Already-mapped fields to preserve manual corrections
- **Fails gracefully**: Leaves unmapped if no good match found

---

## 3. Iframe Handler

### Purpose
Provides cross-frame DOM traversal during both recording and playback. Detects when events occur inside iframes, captures iframe context metadata, and reconstructs iframe navigation paths during replay.

### Location
- **Recording**: `recordEvent()` in `src/contentScript/content.tsx` (iframe chain capture)
- **Playback**: `getDocumentForBundle()` and `traverseIframesAndShadowRoots()` functions

### Key Responsibilities
- **Recording**: Detect iframe boundaries when event captured
- **Recording**: Build iframe chain from outermost to innermost frame
- **Recording**: Store iframe identifiers (id, name, index) in bundle
- **Playback**: Traverse iframe chain to locate target document
- **Playback**: Handle missing iframes (graceful failure)

### API Surface
**Recording Output:**
```typescript
bundle: {
  iframeChain?: IframeInfo[],  // Ordered list from root to target
  // ... other bundle fields
}

interface IframeInfo {
  id?: string;     // iframe element ID
  name?: string;   // iframe name attribute
  index?: number;  // Position among siblings (fallback)
}
```

**Playback Input:**
```typescript
getDocumentForBundle(bundle: Bundle): Document
```

### Architecture
**Recording Phase:**
1. Event fires → Check if `window !== window.top` (inside iframe)
2. Walk up `window.parent` chain to build iframe path
3. For each frame, extract: `id`, `name`, or compute `index`
4. Store as `bundle.iframeChain: [outermost, ..., innermost]`

**Playback Phase:**
1. Start with `document` (root)
2. For each `IframeInfo` in chain:
   - Query iframes: `document.querySelectorAll('iframe')`
   - Match by `id` (preferred) → `name` → `index`
   - Access `iframe.contentDocument`
   - Continue traversal in child document
3. Return final document for element finding

### Special Cases
- **Same-origin policy**: Only works if iframes share origin with parent
- **Lazy-loaded iframes**: May fail if iframe not yet rendered
- **Dynamic iframe IDs**: Falls back to name, then index
- **Cross-origin iframes**: Cannot access contentDocument (security restriction)

### Dependencies
- **Inbound**: EventCapture (recording), PlaybackEngine (replay)
- **Outbound**: DOM Element Finder (provides document context)

---

## 4. IndexedDB Storage

### Purpose
Typed, Promise-based wrapper around browser IndexedDB using Dexie.js. Defines database schema for projects and test runs, exposes CRUD operations, ensures data persistence across browser sessions. Single source of truth for all automation project data.

### Location
- **Primary File**: `src/common/services/indexedDB.ts` (250+ lines)
- **Tables**: `projects`, `testRuns`

### Key Responsibilities
- Define database schema and indexes
- Provide typed CRUD operations for projects
- Provide typed CRUD operations for test runs
- Handle database migrations and versioning
- Expose promise-based API for async operations

### API Surface
**Project CRUD:**
```typescript
db.projects.add(project: Project): Promise<number>
db.projects.get(id: number): Promise<Project | undefined>
db.projects.toArray(): Promise<Project[]>
db.projects.put(project: Project): Promise<number>
db.projects.update(id: number, changes: Partial<Project>): Promise<number>
db.projects.delete(id: number): Promise<void>
```

**TestRun CRUD:**
```typescript
db.testRuns.add(run: TestRun): Promise<number>
db.testRuns.where('project_id').equals(projectId).toArray(): Promise<TestRun[]>
db.testRuns.update(id: number, changes: Partial<TestRun>): Promise<number>
```

### Data Structures
**Project Schema:**
```typescript
interface Project {
  id?: number;               // Auto-increment primary key
  name: string;              // Project title
  description?: string;      // Optional description
  target_url?: string;       // Starting URL
  recorded_steps?: Step[];   // Captured interactions
  parsed_fields?: FieldMapping[];  // CSV mappings
  csv_data?: any[];          // CSV data rows
  status?: 'draft' | 'recording' | 'mapping' | 'testing' | 'completed';
  created_date?: number;     // Timestamp
  updated_date?: number;     // Timestamp
}
```

**TestRun Schema:**
```typescript
interface TestRun {
  id?: number;
  project_id: number;
  status: string;
  start_time: string;
  end_time?: string;
  total_steps: number;
  passed_steps: number;
  failed_steps: number;
  test_results: any[];
  logs: string;
}
```

### Architecture
**Dexie Configuration:**
```typescript
import Dexie, { Table } from 'dexie';

class MuffinDatabase extends Dexie {
  projects!: Table<Project>;
  testRuns!: Table<TestRun>;
  
  constructor() {
    super('MuffinDB');
    this.version(1).stores({
      projects: '++id, name, status, created_date',
      testRuns: '++id, project_id, status, start_time'
    });
  }
}

export const db = new MuffinDatabase();
```

### Special Cases
- **Auto-increment IDs**: `++id` syntax in schema
- **Indexes**: Created on frequently queried fields (name, status, project_id)
- **Version management**: `this.version(N)` for schema migrations
- **Promise-based**: All operations return promises (async/await friendly)

### Dependencies
- **Library**: `dexie` NPM package
- **Inbound**: Message Router (background.ts), all UI pages
- **Outbound**: Browser IndexedDB API

---

## 5. Injection Manager

### Purpose
Handles dynamic injection of content scripts and page-context scripts into target tabs. Ensures correct execution context (content isolated world vs. page main world) for different script types.

### Location
- **Primary Logic**: `src/background/background.ts` (openTab handler)
- **Manifest Config**: `public/manifest.json` (content_scripts)
- **Scripts**: `content.js`, `page-interceptor.js`, `replay.js`

### Key Responsibilities
- Inject content script into isolated world on tab creation
- Inject page interceptor into main world for shadow DOM access
- Inject Google replay script for Maps autocomplete playback
- Handle injection timing (document_end, document_idle)
- Manage injection failures gracefully

### API Surface
**Programmatic Injection:**
```typescript
chrome.scripting.executeScript({
  target: { tabId: tab.id },
  files: ['js/content.js']
});

chrome.scripting.executeScript({
  target: { tabId: tab.id },
  files: ['js/page-interceptor.js'],
  world: 'MAIN'  // Page context
});
```

**Manifest Configuration:**
```json
{
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["js/content.js"],
      "run_at": "document_end"
    }
  ]
}
```

### Architecture
**Injection Types:**
1. **Content Script** (isolated world):
   - Purpose: Recording/playback engine
   - Context: Extension isolated world (cannot access page variables)
   - Timing: document_end (DOM ready, before window.load)

2. **Page Interceptor** (main world):
   - Purpose: Monkey-patch attachShadow for closed shadow roots
   - Context: Main page context (access to page variables)
   - Timing: Before shadow roots created (early injection)

3. **Google Replay** (main world):
   - Purpose: Interact with Google Maps autocomplete API
   - Context: Main page context (access to Google's libraries)
   - Timing: During playback of Google Maps steps

**Injection Flow:**
```typescript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openTab') {
    chrome.tabs.create({ url: message.url }, (tab) => {
      setTimeout(() => {
        // Inject content script
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['js/content.js']
        });
        
        // Inject page interceptor
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['js/page-interceptor.js'],
          world: 'MAIN'
        });
        
        sendResponse({ tabId: tab.id });
      }, 1000);
    });
  }
});
```

### Special Cases
- **Timeout delay**: 1000ms delay before injection to ensure DOM ready
- **World isolation**: Content script cannot access page variables, page script cannot use chrome.* APIs
- **Injection order**: Page interceptor must inject before shadow roots created
- **Dynamic injection**: For specific features (Google replay) rather than all tabs

---

## 6. Message Router

### Purpose
Central message-passing hub in the background service worker that routes messages between UI pages, content scripts, and background tasks. Implements request/response pattern for Chrome's message-passing architecture.

### Location
- **Primary File**: `src/background/background.ts` (450+ lines)
- **Listener**: `chrome.runtime.onMessage.addListener()`

### Key Responsibilities
- Route messages from UI pages to background tasks
- Route messages from content scripts to UI pages
- Invoke IndexedDB operations based on message action
- Coordinate tab management (open, close, inject)
- Handle test run lifecycle (create, update, query)
- Return responses via sendResponse callback

### API Surface
**Message Format:**
```typescript
{
  action: string;           // Message type identifier
  payload?: any;            // Action-specific data
  projectId?: number;       // For project operations
  id?: number;              // Entity ID
  url?: string;             // For tab operations
}
```

**Supported Actions:**
- `get_all_projects`, `get_project_by_id`
- `create_project`, `update_project`, `delete_project`
- `update_project_fields`, `update_project_csv`
- `openTab`, `closeTab`, `injectContentScript`
- `getTestRunsByProject`, `createTestRun`, `updateTestRun`

**Response Format:**
```typescript
{
  success: boolean;         // Operation result
  data?: any;               // Return data
  projects?: Project[];     // For get_all_projects
  project?: Project;        // For get_project_by_id
  tabId?: number;           // For openTab
  error?: string;           // Error message
}
```

### Architecture
```typescript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[BACKGROUND] Message:', message.action || message.type);

  (async () => {
    try {
      switch (message.action) {
        case 'get_all_projects': {
          const projects = await db.projects.toArray();
          sendResponse({ success: true, projects });
          break;
        }
        
        case 'create_project': {
          const id = await db.projects.add(message.payload);
          sendResponse({ success: true, data: id });
          break;
        }
        
        case 'openTab': {
          const tab = await chrome.tabs.create({ url: message.url });
          await injectContentScript(tab.id);
          sendResponse({ success: true, tabId: tab.id });
          break;
        }
        
        // ... 15+ more cases
      }
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  })();
  
  return true;  // Keep channel open for async response
});
```

### Special Cases
- **Async wrapper**: IIFE with async/await to handle promises
- **Return true**: Required to keep message channel open for async sendResponse
- **Error handling**: Try-catch wrapper for all operations
- **Logging**: Console logs all incoming messages for debugging

### Dependencies
- **Inbound**: Dashboard, Recorder, FieldMapper, TestRunner, ContentScript
- **Outbound**: IndexedDB, Chrome Tabs API, Chrome Scripting API

---

## 7. Notification Overlay

### Purpose
In-page visual feedback system that displays temporary notifications during test playback (step success/failure, element not found, etc.). Provides immediate visual feedback separate from console logs.

### Location
- **Primary Function**: `showNotification()` in `src/contentScript/content.tsx`
- **Invoked by**: PlaybackEngine during step execution

### Key Responsibilities
- Display success/error/info messages on page
- Auto-dismiss after 3 seconds
- Style based on notification type
- Remove existing notification before showing new one
- High z-index to appear above page content

### API Surface
```typescript
showNotification(message: string, type: 'success' | 'error' | 'info'): void
```

### Architecture
```typescript
function showNotification(message: string, type: 'success' | 'error' | 'info') {
  // Remove existing notification
  const existing = document.getElementById('muffin-notification');
  if (existing) existing.remove();
  
  // Create notification element
  const notification = document.createElement('div');
  notification.id = 'muffin-notification';
  notification.textContent = message;
  
  // Style based on type
  const colors = {
    success: 'background: #10b981; color: white;',
    error: 'background: #ef4444; color: white;',
    info: 'background: #3b82f6; color: white;'
  };
  
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    ${colors[type]}
    font-family: sans-serif;
    font-size: 14px;
    z-index: 999999;
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    animation: slideInRight 0.3s ease-out;
  `;
  
  document.body.appendChild(notification);
  
  // Auto-dismiss after 3 seconds
  setTimeout(() => notification.remove(), 3000);
}
```

### Special Cases
- **Z-index**: 999999 to appear above all page content
- **Single notification**: Only one visible at a time (removes existing)
- **Animation**: CSS slideInRight animation for smooth entry
- **No dependencies**: Pure DOM manipulation, no libraries
- **Safe injection**: Checks for body element before appending

### Dependencies
- **Inbound**: PlaybackEngine (success/error notifications)
- **Outbound**: DOM API only

---

## 8. Page Interceptor

### Purpose
Runs in page context (not extension isolated world) to intercept and expose closed shadow DOM roots, specifically targeting Google Maps autocomplete components. Monkey-patches `Element.prototype.attachShadow` to capture closed shadow roots before they become inaccessible.

### Location
- **Primary File**: `src/contentScript/page-interceptor.tsx` (~120 lines)
- **Execution Context**: Page main world (injected via `<script>` tag)

### Key Responsibilities
- Intercept all `attachShadow({mode: "closed"})` calls
- Store shadow root reference on host element (`__realShadowRoot`)
- Monitor Google Maps autocomplete shadow roots
- Expose internal input elements (`__autocompleteInput`)
- Relay user interactions to content script via window.postMessage

### API Surface
**Exposed Properties:**
```typescript
element.__realShadowRoot: ShadowRoot  // Closed shadow root reference
element.__autocompleteInput: HTMLInputElement  // Autocomplete input
```

**Window Messages:**
```typescript
window.postMessage({
  type: "AUTOCOMPLETE_INPUT",
  value: string,
  xpath: string,
  label: string
}, "*");

window.postMessage({
  type: "AUTOCOMPLETE_SELECTION",
  text: string,
  xpath: string
}, "*");
```

### Architecture
**Shadow Root Interceptor:**
```typescript
const origAttachShadow = Element.prototype.attachShadow;
Element.prototype.attachShadow = function (init) {
  const shadow = origAttachShadow.call(this, init);
  
  if (init.mode === "closed") {
    (this as any).__realShadowRoot = shadow;
    
    if (this.tagName === "GMP-PLACE-AUTOCOMPLETE") {
      monitorAutocomplete(this, shadow);
    }
  }
  
  return shadow;
};
```

**Autocomplete Monitor:**
```typescript
function monitorAutocomplete(host, shadow) {
  const input = shadow.querySelector('input');
  
  if (input) {
    setupListeners(host, input, shadow);
  } else {
    // Lazy loading - wait for input to appear
    const observer = new MutationObserver(() => {
      const input = shadow.querySelector('input');
      if (input) {
        setupListeners(host, input, shadow);
        observer.disconnect();
      }
    });
    observer.observe(shadow, { childList: true, subtree: true });
  }
}

function setupListeners(host, input, shadow) {
  host.__autocompleteInput = input;
  
  // Listen for user input
  input.addEventListener('input', (e) => {
    window.postMessage({
      type: "AUTOCOMPLETE_INPUT",
      value: input.value,
      xpath: getXPath(host),
      label: getLabelForElement(host)
    }, "*");
  });
  
  // Listen for suggestion selection
  shadow.addEventListener('click', (e) => {
    if (e.target.matches('li[role="option"]')) {
      window.postMessage({
        type: "AUTOCOMPLETE_SELECTION",
        text: e.target.textContent,
        xpath: getXPath(host)
      }, "*");
    }
  });
}
```

### Special Cases
- **Page context**: Cannot use chrome.* APIs (security restriction)
- **window.postMessage**: Only communication method to content script
- **Lazy loading**: MutationObserver handles inputs added after shadow root creation
- **Google-specific**: Targets `gmp-place-autocomplete` custom element
- **XPath computation**: Must duplicate getXPath logic (no shared utils in page context)

### Dependencies
- **Inbound**: Injection Manager (injected into page)
- **Outbound**: Content Script (via window.postMessage), DOM API

---

## 9. Project CRUD

### Purpose
UI components and logic for creating, editing, and deleting projects through modal dialogs. Encapsulates project mutation logic in reusable components separate from Dashboard list view.

### Location
- **Create Dialog**: `src/components/Dashboard/CreateProjectDialog.tsx`
- **Edit Modal**: `src/components/Dashboard/EditProjectModal.tsx`
- **Delete Confirmation**: `src/components/Dashboard/ConfirmationModal.tsx`

### Key Responsibilities
- Render project creation form (name, description)
- Render project edit form (pre-populated with existing data)
- Send messages to background for CRUD operations
- Handle success/error states
- Trigger parent component refresh after mutations

### API Surface
**CreateProjectDialog Props:**
```typescript
{
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}
```

**EditProjectModal Props:**
```typescript
{
  open: boolean;
  onClose: () => void;
  projectData?: { id: number, name: string, description: string };
  onSave: (updatedProject: Partial<Project>) => Promise<void>;
}
```

**ConfirmationModal Props:**
```typescript
{
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}
```

### Architecture
**Create Flow:**
```typescript
const [name, setName] = useState('');
const [description, setDescription] = useState('');

const handleCreate = () => {
  chrome.runtime.sendMessage({
    action: 'create_project',
    payload: {
      name,
      description,
      status: 'draft',
      created_date: Date.now(),
      updated_date: Date.now()
    }
  }, (response) => {
    if (response.success) {
      onSuccess();  // Refresh project list
      onClose();
    }
  });
};
```

**Edit Flow:**
```typescript
useEffect(() => {
  if (projectData) {
    setName(projectData.name);
    setDescription(projectData.description);
  }
}, [projectData]);

const handleSave = async () => {
  await onSave({
    id: projectData.id,
    name,
    description,
    updated_date: Date.now()
  });
  onClose();
};
```

**Delete Flow:**
```typescript
const handleDelete = () => {
  chrome.runtime.sendMessage({
    action: 'delete_project',
    id: projectId
  }, (response) => {
    if (response.success) {
      onConfirm();  // Refresh and close
    }
  });
};
```

### Special Cases
- **Optimistic UI**: Shows success state immediately, reverses on error
- **Validation**: Ensures name is non-empty before creation
- **Timestamp management**: Sets created_date and updated_date automatically
- **Status initialization**: New projects default to 'draft' status

### Dependencies
- **Inbound**: Dashboard (parent component)
- **Outbound**: Message Router (background.ts), IndexedDB (via messages)

---

## 10. Project Repository

### Purpose
Provides CRUD operations wrapper around Dexie.js for the `projects` table in IndexedDB. Encapsulates all database interactions for project management with type-safe interfaces. Single source of truth for project data.

### Location
- **Primary Access**: `db.projects` from `src/common/services/indexedDB.ts`
- **Table Definition**: Dexie schema configuration

### Key Responsibilities
- Expose typed CRUD operations for projects
- Handle auto-increment primary key generation
- Support partial updates via `.update()`
- Provide query methods (get, toArray, where)
- Ensure data consistency across sessions

### API Surface
**CRUD Operations:**
```typescript
db.projects.add(project: Project): Promise<number>  // Returns new ID
db.projects.get(id: number): Promise<Project | undefined>
db.projects.toArray(): Promise<Project[]>
db.projects.put(project: Project): Promise<number>  // Upsert
db.projects.update(id: number, changes: Partial<Project>): Promise<number>
db.projects.delete(id: number): Promise<void>
```

**Query Operations:**
```typescript
db.projects.where('name').equals('My Project').first()
db.projects.where('status').equals('completed').toArray()
db.projects.orderBy('created_date').reverse().toArray()
```

### Data Structure
**Project Schema:**
```typescript
interface Project {
  id?: number;               // Auto-increment primary key
  name: string;              // Project title
  description?: string;      // Optional description
  target_url?: string;       // Starting URL
  recorded_steps?: Step[];   // Captured interactions
  parsed_fields?: FieldMapping[];  // CSV mappings
  csv_data?: any[];          // CSV data rows
  status?: 'draft' | 'recording' | 'mapping' | 'testing' | 'completed';
  created_date?: number;     // Timestamp
  updated_date?: number;     // Timestamp
}
```

### Architecture
**Dexie Configuration:**
```typescript
import Dexie, { Table } from 'dexie';

class MuffinDatabase extends Dexie {
  projects!: Table<Project>;
  
  constructor() {
    super('MuffinDB');
    this.version(1).stores({
      projects: '++id, name, status, created_date'
    });
  }
}

export const db = new MuffinDatabase();
```

**Usage Example:**
```typescript
// Create
const id = await db.projects.add({
  name: 'Login Test',
  description: 'Test login flow',
  status: 'draft',
  created_date: Date.now()
});

// Read
const project = await db.projects.get(id);
const allProjects = await db.projects.toArray();

// Update
await db.projects.update(id, {
  status: 'recording',
  updated_date: Date.now()
});

// Delete
await db.projects.delete(id);
```

### Special Cases
- **Auto-increment**: `++id` in schema generates sequential IDs
- **Indexes**: Created on name, status, created_date for fast queries
- **Partial updates**: `.update()` only modifies specified fields
- **Upsert**: `.put()` inserts if ID doesn't exist, updates if it does
- **Type safety**: TypeScript interfaces ensure compile-time checks

### Dependencies
- **Library**: `dexie` NPM package
- **Inbound**: Message Router, all UI pages (via message passing)
- **Outbound**: Browser IndexedDB API

---

## Integration Points

### Field Mapping Workflow
1. **Dashboard** → User creates project → **Project-Repository** stores
2. **Recorder** → User records steps → **Project-Repository** updates `recorded_steps`
3. **Field-Mapper-UI** → User uploads CSV → **Field-Mapping-Engine** auto-maps → **Project-Repository** stores `parsed_fields` and `csv_data`
4. **TestRunner** → Reads mappings → Executes batch tests

### Recording/Playback Flow
1. **Injection-Manager** → Injects content script and page interceptor
2. **Page-Interceptor** → Monitors shadow roots → Posts messages to content
3. **Content Script** → Captures events → Uses **Iframe-Handler** for cross-frame
4. **Message-Router** → Routes to background → **IndexedDB-Storage** persists

### UI Communication
1. **Dashboard/Recorder/FieldMapper/TestRunner** → Sends messages to **Message-Router**
2. **Message-Router** → Invokes **IndexedDB-Storage** operations
3. **IndexedDB-Storage** → Returns data → **Message-Router** sends response
4. UI pages → Update state with response data

### Playback Feedback
1. **PlaybackEngine** → Step execution result
2. **Notification-Overlay** → Displays in-page message
3. Console logs → Developer visibility
4. **TestRun-Repository** → Stores results

---

## Cross-Component Dependencies

### Data Flow: Project Lifecycle
```
Dashboard (create) 
  → Project-Repository (store)
  → Recorder (update steps)
  → Field-Mapper-UI (map fields)
  → Field-Mapping-Engine (auto-map)
  → TestRunner (execute)
```

### Script Injection Chain
```
Message-Router (openTab)
  → Injection-Manager (inject scripts)
  → Content Script (isolated world)
  → Page-Interceptor (main world)
```

### Storage Architecture
```
All UI Pages
  → Message-Router
  → IndexedDB-Storage (db.projects, db.testRuns)
  → Dexie.js
  → Browser IndexedDB
```

### Notification Flow
```
PlaybackEngine
  → Notification-Overlay (success/error)
  → DOM (fixed overlay)
  → Auto-dismiss (3s timeout)
```

---

## Technology Stack Summary

- **UI Framework**: React (components, hooks, state)
- **Database**: Dexie.js (IndexedDB wrapper)
- **String Matching**: string-similarity (Sørensen–Dice coefficient)
- **CSV Parsing**: PapaParse (handled in Field-Mapper-UI)
- **Message Passing**: Chrome runtime API
- **Script Injection**: Chrome scripting API
- **DOM Traversal**: Native querySelector, XPath, iframe traversal
- **Shadow DOM**: Monkey-patching, MutationObserver
