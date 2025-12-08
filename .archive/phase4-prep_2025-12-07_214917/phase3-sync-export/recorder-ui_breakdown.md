# Recorder UI Breakdown

## Purpose
**What it does:** Recording interface for capturing user interactions on target web pages. Displays live step list, recording controls (start/stop/save), and project management.

**Where it lives:** `src/pages/Recorder.tsx` (500+ lines)

**Why it exists:** User-facing UI for the recording phase—initiates recording sessions, displays captured steps in real-time, allows editing/deleting steps, and saves to project.

## Inputs
- **URL query param:** `?project=<id>` - Project to record into
- **Chrome messages:** `log_event` messages from content script
- **User actions:** Start/stop recording, edit steps, save project, navigate to mapper

## Outputs
- Real-time step list updates (via `log_event` messages)
- Updated project in IndexedDB with `recorded_steps`
- Navigation to FieldMapper on save

## Internal Architecture
**State Management:**
```typescript
const [steps, setSteps] = useState<Step[]>([]);
const [isRecording, setIsRecording] = useState(false);
const [currentProject, setCurrentProject] = useState<Project | null>(null);
const [targetUrl, setTargetUrl] = useState('');
```

**Recording Flow:**
1. User enters target URL
2. Clicks "Start Recording" → Opens new tab with URL
3. Content script injects → Captures events → Sends `log_event` messages
4. Recorder UI receives messages → Adds to steps array → Updates table
5. User clicks "Stop Recording" → Closes target tab
6. User clicks "Save" → Sends `update_project` message with steps

**Message Listener:**
```typescript
useEffect(() => {
  const messageListener = (message) => {
    if (message.type === 'log_event') {
      setSteps(prev => [...prev, {
        id: Date.now(),
        event: message.data.eventType,
        xpath: message.data.xpath,
        value: message.data.value,
        label: message.data.label,
        bundle: message.data.bundle
      }]);
    }
  };
  
  chrome.runtime.onMessage.addListener(messageListener);
  return () => chrome.runtime.onMessage.removeListener(messageListener);
}, []);
```

## Critical Dependencies
- **RecorderToolbar** - Start/stop/save buttons
- **StepsTable** - Displays captured steps with drag-drop reordering
- **LogPanel** - Shows recording logs/warnings
- **Chrome runtime** - Message passing from content script
- **React DnD** - Drag-and-drop step reordering

## Hidden Assumptions
1. **Single recording session** - Can't record multiple projects simultaneously
2. **Steps persist in memory** - Lost on page refresh until saved
3. **Content script sends all events** - No filtering on content script side
4. **One target tab** - Recording only works in single tab at a time

## Stability Concerns
- **Memory leak potential** - Message listener not cleaned up properly
- **Race conditions** - Messages arrive out of order during rapid interactions
- **No auto-save** - Steps lost on browser crash before saving
- **Tab management** - User can manually close recording tab, breaks session

## Edge Cases
- **Recording started twice** - Second start overwrites first session
- **Invalid project ID** - URL param typo, fails silently
- **Content script injection fails** - No feedback to user
- **Long recording sessions** - 100+ steps may lag UI

## Developer-Must-Know Notes
- Recorder listens to ALL `log_event` messages (no sender validation)
- Steps displayed in `<StepsTable>` with drag-drop using react-beautiful-dnd
- Clicking "Next: Map Fields" saves project and navigates to `/fieldMapper`
- Recording status shown in toolbar (red dot = recording)
- Each step has: event type, label, xpath, value, bundle (full element metadata)
