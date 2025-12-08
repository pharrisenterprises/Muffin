# Dashboard UI Breakdown

## Purpose
**What it does:** Main project management interface displaying project cards, search, creation dialog, and project CRUD operations.

**Where it lives:** `src/pages/Dashboard.tsx` (300+ lines)

**Why it exists:** Entry point for users to manage automation projects - create, view, edit, delete, and navigate to recorder/mapper/runner.

## Inputs
- IndexedDB projects (via background message proxy)
- User interactions (search, create, edit, delete, open recorder)

## Outputs
- Project list with cards showing name, description, status, dates
- Navigation to `/recorder`, `/fieldMapper`, `/testRunner` with project ID
- Project mutations (create, update, delete) reflected in IndexedDB

## Internal Architecture
**Key Components:**
- `<CreateProjectDialog>` - Modal for new project creation
- `<EditProjectModal>` - Modal for editing existing project
- `<ConfirmationModal>` - Delete confirmation dialog
- `<ProjectStats>` - Summary cards (total projects, test runs, etc.)
- Project card grid - Filterable by search term

**State Management:**
```typescript
const [projects, setProjects] = useState<ProjectType[]>([]);
const [searchTerm, setSearchTerm] = useState<string>("");
const [isLoading, setIsLoading] = useState<boolean>(true);
```

**Data Flow:**
1. `useEffect` → `chrome.runtime.sendMessage('get_all_projects')`
2. Receive projects → Update state
3. Filter by search term → `filteredProjects`
4. Render project cards with actions (Open Recorder, Edit, Delete)

## Critical Dependencies
- **Chrome runtime messaging** - `chrome.runtime.sendMessage`
- **React Router** - `Link` component for navigation
- **date-fns** - Date formatting
- **Lucide icons** - UI icons
- **Shadcn UI components** - Card, Button, Input, etc.

## Hidden Assumptions
1. **Projects load on mount** - Expects background script responsive
2. **No pagination** - Loads all projects at once
3. **Search is client-side** - Filters in memory, not DB query
4. **No real-time updates** - Manual reload needed for changes from other tabs

## Stability Concerns
- **Large project lists** - No virtualization, may lag with 100+ projects
- **Search performance** - Linear scan through all projects
- **No optimistic UI** - Waits for background response before updating

## Developer-Must-Know Notes
- Projects displayed in card grid (responsive: 3 cols desktop, 2 tablet, 1 mobile)
- Search filters by name and description (case-insensitive)
- Status badge colors: draft=blue, recording=yellow, testing=orange, completed=green
- Clicking "Open Recorder" navigates to `/recorder?project={id}`

## Phase 3 Integration Points

### Recording System (Phase 3A)
- **Input**: "Open Recorder" button navigates with project ID
- **Output**: Recorder page loads project and begins recording session
- **Integration**: RecordingOrchestrator initialized with project context

### Test Execution (Phase 3F)
- **Input**: "Run Test" button navigates to TestRunner with project ID
- **Output**: TestRunner loads recorded steps and begins playback
- **Integration**: SelfHealingPlaybackEngine initialized with project data

### Project CRUD (Phase 3G)
- **Input**: User creates/edits/deletes projects
- **Output**: IndexedDB operations via background service worker
- **Integration**: All changes persist in ProjectDatabase

**Last Updated**: December 7, 2025 — Phase 3 Specification Complete
