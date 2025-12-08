# Recorder UI - Component Breakdown

**Last Updated:** December 7, 2025

---

## Purpose
**What it does:** Recording interface for capturing user interactions on target web pages. Displays live step list, recording controls (start/stop/save), and step management (edit/delete/reorder).

**Where it lives:** `src/pages/Recorder.tsx` (500+ lines)

**Why it exists:** User-facing UI for the recording phase—initiates recording sessions, displays captured steps in real-time, allows step editing, and saves to project before progressing to field mapping.

---

## Inputs
- **URL query param:** `?project=<id>` - Project to record into
- **Chrome messages:** `log_event` messages from content script during recording
- **User actions:**
  - Enter target URL
  - Click "Start Recording" button
  - Interact with target page (captured by content script)
  - Click "Stop Recording" button
  - Edit/delete steps in table
  - Drag-drop to reorder steps
  - Click "Save" to persist changes

---

## Outputs
- **Real-time step list** - Updates as events captured
- **Updated project in IndexedDB** - Saved with `recorded_steps` array
- **Navigation to FieldMapper** - On save, redirects to `/fieldMapper?project=<id>`

---

## Internal Architecture

### State Management
```typescript
// Recorder.tsx
const [steps, setSteps] = useState<Step[]>([]);
const [isRecording, setIsRecording] = useState(false);
const [currentProject, setCurrentProject] = useState<Project | null>(null);
const [targetUrl, setTargetUrl] = useState('');
const [recordingTabId, setRecordingTabId] = useState<number | null>(null);
```

### Recording Flow
```
1. User enters target URL in input field
2. Clicks "Start Recording" button
   → Sends message to background: { action: 'start_recording', url }
   → Background opens new tab with URL
   → Background injects content script
3. Content script captures events (clicks, inputs, keypresses)
   → Sends { type: 'log_event', data: step } messages
4. Recorder UI receives messages → Appends to steps array → Updates StepsTable
5. User clicks "Stop Recording"
   → Closes target tab
   → setIsRecording(false)
6. User clicks "Save"
   → Sends { action: 'update_project', data: { ...project, recorded_steps: steps } }
   → Navigates to FieldMapper
```

### Message Listener
```typescript
// Recorder.tsx
useEffect(() => {
  const messageListener = (message: any) => {
    if (message.type === 'log_event') {
      setSteps((prev) => [
        ...prev,
        {
          id: Date.now(),
          event: message.data.eventType,
          xpath: message.data.xpath,
          value: message.data.value,
          label: message.data.label,
          bundle: message.data.bundle,
          timestamp: Date.now()
        }
      ]);
    }
  };

  chrome.runtime.onMessage.addListener(messageListener);
  
  return () => {
    chrome.runtime.onMessage.removeListener(messageListener);
  };
}, []);
```

### Save Handler
```typescript
const handleSave = async () => {
  if (!currentProject) return;

  // Update project with recorded steps
  await chrome.runtime.sendMessage({
    action: 'update_project',
    data: {
      ...currentProject,
      recorded_steps: steps,
      status: 'mapping',
      updated_date: Date.now()
    }
  });

  // Navigate to Field Mapper
  navigate(`/fieldMapper?project=${currentProject.id}`);
};
```

---

## Critical Dependencies
**Upstream:**
- **Dashboard.tsx** - Navigates to Recorder with `?project=<id>`
- **content.tsx** - Sends `log_event` messages during recording
- **background.ts** - Handles `start_recording` / `update_project` messages

**Downstream:**
- **RecorderToolbar** - Start/stop/save buttons component
- **StepsTable** - Displays captured steps with drag-drop reordering
- **LogPanel** - Shows recording logs/warnings (optional)
- **React Router** - Navigation to FieldMapper

**External:**
- **chrome.runtime.onMessage** - Receives log_event messages
- **chrome.runtime.sendMessage** - Sends start/update messages
- **React DnD** - Drag-and-drop step reordering (via StepsTable)

---

## Hidden Assumptions
1. **Single recording session** - Cannot record multiple projects simultaneously
2. **Steps persist in memory** - Lost on page refresh until saved
3. **Content script sends all events** - No filtering on content script side
4. **One target tab** - Recording only works in single tab at a time
5. **Message listener active** - Must be mounted to receive log_event messages
6. **Project ID in URL** - Assumes `?project=<id>` always present
7. **Auto-save not implemented** - Steps lost on browser crash before manual save

---

## Stability Concerns

### High-Risk Patterns
1. **Memory leak potential**
   ```typescript
   // If listener not cleaned up properly
   useEffect(() => {
     chrome.runtime.onMessage.addListener(messageListener);
     // Missing return cleanup → Duplicate listeners on re-render
   }, []);
   ```

2. **Race conditions on rapid events**
   ```typescript
   // Content script fires 10 click events in 1 second
   // setSteps called 10 times → May batch incorrectly
   ```

3. **No auto-save**
   ```typescript
   // User records 100 steps, browser crashes
   // All steps lost (no periodic save to IndexedDB)
   ```

4. **Tab management issues**
   ```typescript
   // User manually closes recording tab
   // Recorder UI doesn't detect → isRecording stays true
   ```

5. **Long recordings lag UI**
   ```typescript
   // 500+ steps in array
   // StepsTable re-renders on every new step → Performance degradation
   ```

### Failure Modes
- **Content script injection fails** - No feedback to user (recording appears to start but no events captured)
- **Message listener removed prematurely** - Events lost during recording
- **Invalid project ID** - URL param typo causes no project loaded (silent failure)
- **Browser tab closed** - Recording session lost, no recovery

---

## Edge Cases

### Input Variations
1. **Recording started twice**
   ```typescript
   // User clicks "Start Recording" twice
   // Second start overwrites first session (steps lost)
   ```

2. **Invalid project ID in URL**
   ```typescript
   // ?project=9999 (doesn't exist)
   // currentProject stays null → Save button disabled
   ```

3. **Content script injection fails**
   ```typescript
   // CSP blocks injection or special URL (chrome://)
   // No events captured, but UI shows "Recording..."
   ```

4. **Rapid step creation**
   ```typescript
   // User clicks 50 times rapidly
   // 50 log_event messages arrive quickly
   // StepsTable may lag during render
   ```

5. **Page navigation during recording**
   ```typescript
   // User navigates target page to different domain
   // Content script may not persist → Events stop
   ```

---

## Developer-Must-Know Notes
- **Listens to ALL log_event messages** - No sender validation (security risk if malicious extension sends events)
- **Steps displayed in StepsTable** - Uses `react-beautiful-dnd` for drag-drop
- **Clicking "Next: Map Fields"** - Saves project AND navigates to `/fieldMapper`
- **Recording status** - Red dot indicator in toolbar when `isRecording === true`
- **Each step includes:**
  - `event` type (click/input/enter)
  - `label` (extracted text)
  - `xpath` (element locator)
  - `value` (input value)
  - `bundle` (full element metadata for playback)
- **No step validation** - Duplicate steps, empty labels allowed
- **Performance concern** - 100+ steps may slow UI (no virtualization)

---

## Phase 3 Integration Points

### Strategy Implementation
| Strategy ID | Relevance | Integration Point |
|-------------|-----------|-------------------|
| **A1** | Critical | Core Recording specification - UI for event capture workflow |
| **ENG-002** | Critical | StepCaptureEngine generates steps displayed in this UI |
| **DAT-003** | High | Saves recorded_steps to Project Repository on Save button |
| **UI-001** | High | Recording status indicators and step table management |

### Specification Mapping
- **A1** (Core Recording) - Primary UI for recording phase workflow
- **B1** (Recording Workflow) - Record → Map → Execute lifecycle starts here
- **E1** (Step Management) - Edit/delete/reorder operations on captured steps
- **H2** (User Experience) - Real-time feedback during recording session

### Evidence References
- Code: `src/pages/Recorder.tsx` lines 1-500 (full component implementation)
- UI: Screenshot of recording interface with step table
- Test: Manual recording flow (Dashboard → Recorder → FieldMapper)

### Integration Risks
1. **Message Flooding:** Rapid events (100+ clicks/sec) may overwhelm UI state updates
2. **Memory Leaks:** Improper listener cleanup on unmount can cause duplicate event handlers
3. **No Auto-Save:** Browser crash before manual save loses all recorded steps
4. **Single Tab Limit:** Cannot record multiple projects concurrently (architectural constraint)

---

## Related Components
- **Content Script Recorder** (`content-script-recorder_breakdown.md`) - Sends log_event messages to this UI
- **Step Table Management** (`step-table-management_breakdown.md`) - Interactive step list with drag-drop
- **Step Capture Engine** (`step-capture-engine_breakdown.md`) - Generates step objects displayed here
- **Project Repository** (`project-repository_breakdown.md`) - Database layer for saving recorded_steps
- **Dashboard UI** (`dashboard-ui_breakdown.md`) - Navigates to Recorder on "Record" button
- **Field Mapper UI** (`field-mapper-ui_breakdown.md`) - Next step in workflow after recording
