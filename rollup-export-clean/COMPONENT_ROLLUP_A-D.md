# Component Rollup: A-D (Chunk 1/5)

**Generated:** December 5, 2025  
**Components:** 10  
**Scope:** background-service-worker through dom-label-extraction

---

## 1. Background Service Worker

**Purpose:** Central message routing hub for Chrome extension. Manages lifecycle, tab operations, and bridges UI ↔ content scripts ↔ IndexedDB.

**Location:** `src/background/background.ts`

**Key Responsibilities:**
- Message routing (30+ action types)
- Tab management (open, close, track, inject scripts)
- IndexedDB proxy (CRUD for projects, steps, test runs)
- Navigation event handling (iframe reinjection)

**Message Actions:**
```
CRUD: add_project, update_project, get_all_projects, delete_project
Steps: update_project_steps, update_project_fields, update_project_csv
Test Runs: createTestRun, updateTestRun, getTestRunsByProject
Tab Control: open_project_url_and_inject, close_opened_tab, openTab
```

**Architecture:**
- State: `openedTabId`, `trackedTabs` (Set)
- Events: `chrome.action.onClicked`, `chrome.runtime.onInstalled`, `chrome.webNavigation.onCommitted`
- Injection: `chrome.scripting.executeScript()` with `allFrames: true`

---

## 2. Build Pipeline

**Purpose:** Dual Vite configuration for separate UI bundle (React pages) and background service worker (ES module).

**Configuration Files:**
- `vite.config.ts` → UI build (popup, pages, dashboard)
- `vite.config.bg.ts` → Background worker
- `scripts/postbuild.js` → Manifest copying

**Build Flow:**
```
npm run build → 
  1. vite build (main UI)
  2. vite build --config vite.config.bg.ts
  3. node scripts/postbuild.js (copy manifest)
```

**Output Structure:**
```
dist/
├── index.html, popup.html, pages.html
├── manifest.json
├── js/
│   ├── main.js (React UI bundle)
│   ├── interceptor.js (page injection)
│   └── replay.js (Google autocomplete)
├── css/main.css
├── background/background.js (service worker)
```

**Key Features:**
- Multi-page HTML generation
- Content script bundling (3 separate scripts)
- Asset optimization (CSS, fonts, icons)
- Manifest V3 compliance (service worker, host permissions)

---

## 3. Chrome Storage Helper

**Purpose:** Promise-based wrapper for `chrome.storage.sync` API with async/await syntax.

**Location:** `src/common/helpers/storageHelper.ts` (~60 lines)

**API:**
```typescript
StorageHelper.get<T>(key: string): Promise<T | null>
StorageHelper.set(key: string, value: any): Promise<void>
StorageHelper.remove(key: string): Promise<void>
StorageHelper.getAll(): Promise<{ [key: string]: any }>
StorageHelper.clear(): Promise<void>
```

**Constraints:**
- Quota: 100KB total, 8KB per item, 512 items max
- Syncs across Chrome instances (if signed in)
- Values must be JSON-serializable

**Error Handling:**
- Returns `null` on errors (graceful degradation)
- Logs errors to console
- No exceptions thrown

---

## 4. Conditional Click UI Components

**Purpose:** UI for configuring conditional click steps with polling, retries, and visibility checks.

**Components:**
- `AddConditionalClickMenu.tsx` → Menu item to add conditional step
- `ConfigureConditionalPanel.tsx` → Configuration dialog
- `ConditionalBadge.tsx` → 🎯 badge display
- `StepRow.tsx` → Badge rendering logic

**Configuration Options:**
```typescript
ConditionalConfig {
  pollInterval: number      // Polling frequency (ms)
  maxRetries: number        // Max attempts before fail
  waitForVisible: boolean   // Wait until element visible
  continueOnFail: boolean   // Continue test if step fails
}
```

**UI Flow:**
1. User clicks "Add Conditional Click" menu
2. Dialog shows configuration form
3. Save creates step with `event: 'conditional-click'`
4. 🎯 badge displays on step row

**State Management:**
- Redux stores `conditionalConfig` on Step object
- UI components read/update via Redux actions

---

## 5. Content Script Recorder

**Purpose:** Captures user interactions (clicks, inputs, keyboard) and converts to automation steps.

**Location:** `src/contentScript/content.tsx` (recorder section)

**Captured Events:**
- `mousedown` → Clicks on interactive elements
- `input` → Text input, checkboxes, radio, select
- `keydown` → Enter key, form submissions

**Event Data:**
```typescript
LogEventData {
  eventType: 'click' | 'input' | 'enter' | 'open'
  xpath: string           // XPath selector
  value?: string          // Input value
  label?: string          // Human-readable field name
  page: string            // URL
  x, y?: number           // Mouse coordinates
  bundle?: Bundle         // Element metadata
}
```

**Bundle Object:** (for replay)
```typescript
Bundle {
  id?, name?, className?, dataAttrs?
  aria?, placeholder?, tag?, visibleText?
  xpath?, bounding?: {left, top, width, height}
  iframeChain?: IframeInfo[]
  shadowHosts?: string[]
  isClosedShadow?: boolean
}
```

**Special Handling:**
- Google autocomplete (via page-interceptor messages)
- Select2 dropdowns (custom element discovery)
- React controlled inputs (dispatchEvent for state sync)
- Iframe traversal (recursively attach listeners)
- Shadow DOM penetration (open + closed)

---

## 6. Content Script Replayer

**Purpose:** Executes recorded steps by finding elements and simulating interactions.

**Location:** `src/contentScript/replay.ts`

**Input Message:**
```typescript
{
  type: "runStep",
  data: {
    event: 'click' | 'input' | 'enter',
    bundle: Bundle,
    value?: string,
    label?: string
  }
}
```

**Element Finding Strategy (Waterfall):**
```
1. ID attribute
2. Name attribute
3. Data attributes (data-testid, data-test, data-cy)
4. ARIA label
5. Placeholder text
6. Visible text match
7. XPath (fallback)
8. Bounding box position match (last resort)
```

**Interaction Simulation:**
- **Click:** `element.click()` + focus + mousedown/up/click events
- **Input:** `element.value = X` + `input`/`change` events (React-compatible)
- **Enter:** `KeyboardEvent('Enter')` dispatch

**Context Handling:**
- Iframe navigation (traverse `iframeChain`)
- Shadow DOM penetration (`shadowHosts` array)
- Closed shadow DOM (`isClosedShadow` flag)

**Response:**
- `sendResponse(true)` → Success
- `sendResponse(false)` → Element not found or error

---

## 7. CSV Parser

**Purpose:** Parses uploaded CSV files using PapaParse library.

**Location:** `handleCSVUpload()` in `src/pages/FieldMapper.tsx`

**Configuration:**
```typescript
Papa.parse(text, {
  header: true,           // First row = column names
  skipEmptyLines: true,   // Ignore blank rows
  dynamicTyping: true     // Auto-convert numbers
})
```

**Input:** `File` object from `<input type="file" accept=".csv">`

**Output:**
```typescript
[
  { 'Email': 'user1@test.com', 'Password': 'pass123' },
  { 'Email': 'user2@test.com', 'Password': 'pass456' },
  ...
]
```

**Processing:**
- Preview limited to first 10 rows
- Headers extracted from first row
- Error handling displays parse failures

---

## 8. CSV Position Mapping

**Purpose:** Maps CSV columns to step variables for data-driven testing loops.

**Location:** `src/lib/csvPositionMapping.ts`

**Core Algorithm:**
```typescript
function buildStepToColumnMapping(
  steps: Step[], 
  csvHeaders: string[]
): Map<string, number>
```

**Variable Syntax:** `{{variableName}}` in step values

**Mapping Strategy:**
1. Extract all `{{variables}}` from steps
2. Match variable names to CSV column headers (case-insensitive)
3. Build Map: variable → column index
4. Substitute values during playback loop

**Example:**
```
CSV Headers: ['Email', 'Password', 'Name']
Step value: "Enter {{email}} in email field"
Mapping: 'email' → column 0
Row 1: email = 'user1@test.com'
Substituted: "Enter user1@test.com in email field"
```

**Loop Integration:**
- `loopStartIndex` defines first step in loop
- Each CSV row executes steps[loopStartIndex...end]
- Variables substituted per row

---

## 9. Dashboard UI

**Purpose:** Main project management interface (list, create, edit, delete projects).

**Location:** `src/pages/Dashboard.tsx` (~300 lines)

**Components:**
- `<CreateProjectDialog>` → New project modal
- `<EditProjectModal>` → Edit existing project
- `<ConfirmationModal>` → Delete confirmation
- `<ProjectStats>` → Summary cards
- Project card grid → Filterable list

**State:**
```typescript
const [projects, setProjects] = useState<ProjectType[]>([]);
const [searchTerm, setSearchTerm] = useState<string>("");
const [isLoading, setIsLoading] = useState<boolean>(true);
```

**Data Flow:**
```
1. useEffect → chrome.runtime.sendMessage('get_all_projects')
2. Receive projects → setProjects()
3. Filter by searchTerm → filteredProjects
4. Render cards with actions (Open Recorder, Edit, Delete)
```

**Navigation:**
- `/recorder?projectId=X` → Recording interface
- `/fieldMapper?projectId=X` → CSV mapping
- `/testRunner?projectId=X` → Test execution

**Assumptions:**
- No pagination (loads all projects)
- Client-side search (in-memory filter)
- Background script always responsive

---

## 10. DOM Label Extraction

**Purpose:** Discovers human-readable labels for form fields using 12+ heuristic strategies.

**Location:** `src/contentScript/content.tsx` (`getLabelForTarget()` function, ~350 lines)

**Strategy Cascade (Priority Order):**
```
1. Google Forms detection (role="heading" in role="listitem")
2. Input inside <label> (labelParent.innerText)
3. <label for="id"> association
4. aria-labelledby reference
5. aria-label attribute
6. Custom form entity (.form-entity .entity-label)
7. Sibling .label-wrapper
8. Preceding sibling with label text
9. Placeholder attribute
10. Button text content
11. Select2 aria-label fallback
12. Semantic guess from context
```

**Special Cases:**
- **Google Forms:** `findGFQuestionTitle(target)` finds question heading
- **Select2:** Traverses `.select2-selection` to original `<select>`
- **Bootstrap:** `.form-group` ancestor → `.control-label`
- **Material UI:** `.MuiFormLabel-root` sibling
- **React Select:** `aria-label` on custom dropdown

**Output Examples:**
- "First Name" → Standard label
- "Email Address" → Aria label
- "Select Country" → Select label
- "Agree to Terms" → Checkbox label

**Fallback:**
- Returns `undefined` if no label found
- Caller uses technical identifier (tag + id/class)

---

## Integration Points

**Message Flow:**
```
User Interaction (Page)
  → Content Script Recorder (LogEvent message)
  → Background Service Worker (routing)
  → Dashboard/Recorder UI (logEvent listener)
  → IndexedDB (stepRepository.create)
```

**Playback Flow:**
```
TestRunner UI (runStep message)
  → Background Service Worker (routing)
  → Content Script Replayer (element finding + simulation)
  → Response (success/failure)
  → TestRunner UI (update step status)
```

**Data-Driven Flow:**
```
CSV Upload → Parser → Field Mapper UI
  → Position Mapping → Step Execution Loop
  → Variable Substitution → Replayer
```

---

## Dependencies

**External Libraries:**
- PapaParse (CSV parsing)
- React Router (navigation)
- date-fns (date formatting)
- Lucide icons (UI icons)
- Shadcn UI (component library)

**Chrome APIs:**
- `chrome.runtime.sendMessage/onMessage`
- `chrome.storage.sync`
- `chrome.tabs` (create, remove)
- `chrome.scripting.executeScript`
- `chrome.webNavigation` (onCommitted, onCompleted)
- `chrome.action.onClicked`

**Internal Dependencies:**
- IndexedDB (Dexie.js) via background proxy
- Redux (state management for UI)
- Custom hooks (useProject, useSteps)

---

**Next:** Chunk 2/5 (Component Breakdowns F-P)
