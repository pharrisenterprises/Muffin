# Step Table Management - Component Breakdown

**Last Updated:** December 7, 2025

---

## Purpose
**What it does:** Interactive step list UI component with drag-drop reordering, edit/delete actions, and visual step indicators. Displays captured steps in real-time during recording sessions.

**Where it lives:** `src/components/Recorder/StepsTable.tsx`

**Why it exists:** Users need to review, reorder, and modify recorded steps before saving to project. Provides visual feedback and interaction controls for step management.

---

## Inputs
```typescript
{
  steps: Step[],                      // Array of recorded steps
  onUpdateSteps: (steps: Step[]) => void,  // Callback for reordering
  onDeleteStep: (index: number) => void,   // Callback for deletion
  onEditStep?: (index: number, step: Step) => void  // Optional edit callback
}
```

**Step Interface:**
```typescript
interface Step {
  id: number | string,   // Unique identifier (required for Draggable key)
  event: string,         // 'click', 'input', 'enter'
  label: string,         // Human-readable element label
  xpath: string,         // Element XPath
  value?: string,        // Input value (editable)
  timestamp: number,     // Capture timestamp
  // ... additional fields
}
```

---

## Outputs
- **Reordered step array** - Via `onUpdateSteps()` callback after drag-drop
- **Deleted steps** - Via `onDeleteStep()` callback on delete button click
- **Edited step values** - Via inline input editing (if implemented)

---

## Internal Architecture

### react-beautiful-dnd Integration
```typescript
// StepsTable.tsx
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

export default function StepsTable({ steps, onUpdateSteps, onDeleteStep }) {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;  // Dropped outside list

    const reordered = Array.from(steps);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);

    onUpdateSteps(reordered);  // Trigger parent update
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="steps">
        {(provided) => (
          <table>
            <thead>
              <tr>
                <th>⋮⋮</th>  {/* Drag handle */}
                <th>#</th>
                <th>Event</th>
                <th>Label</th>
                <th>Value</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody {...provided.droppableProps} ref={provided.innerRef}>
              {steps.map((step, index) => (
                <Draggable
                  key={step.id}
                  draggableId={String(step.id)}
                  index={index}
                >
                  {(provided) => (
                    <tr
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="hover:bg-gray-50"
                    >
                      <td {...provided.dragHandleProps}>
                        ☰  {/* Drag handle */}
                      </td>
                      <td>{index + 1}</td>
                      <td>
                        {step.event === 'click' && '🖱️'}
                        {step.event === 'input' && '⌨️'}
                        {step.event === 'enter' && '⏎'}
                        {step.event}
                      </td>
                      <td>{step.label}</td>
                      <td>
                        <input
                          type="text"
                          value={step.value || ''}
                          onChange={(e) => handleEditValue(index, e.target.value)}
                          className="border px-2 py-1 rounded"
                        />
                      </td>
                      <td>
                        <button
                          onClick={() => onDeleteStep(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </tbody>
          </table>
        )}
      </Droppable>
    </DragDropContext>
  );
}
```

### Edit Value Handler (if implemented)
```typescript
const handleEditValue = (index: number, newValue: string) => {
  const updated = [...steps];
  updated[index] = { ...updated[index], value: newValue };
  onUpdateSteps(updated);
};
```

---

## Critical Dependencies
**Upstream:**
- **Recorder.tsx** - Passes steps array and callbacks

**Downstream:**
- **react-beautiful-dnd** - Drag-drop library
- **Lucide icons** (optional) - UI icons for actions

**External:**
- **react-beautiful-dnd** (npm) - DnD library by Atlassian
- **Tailwind CSS** - Styling classes

---

## Hidden Assumptions
1. **Each step has unique ID** - Required for Draggable key (critical)
2. **Reordering doesn't validate** - Allows invalid test sequences (e.g., submit before fill)
3. **Inline editing limited** - Only value field editable, not xpath/label
4. **Delete confirmation not implemented** - Instant delete (no undo)
5. **No undo/redo** - Cannot revert drag-drop or delete operations
6. **Single table instance** - Doesn't support multiple simultaneous step lists
7. **ID stability** - Assumes step IDs never change after creation

---

## Stability Concerns

### High-Risk Patterns
1. **Missing step ID**
   ```typescript
   steps = [{ event: 'click', label: 'Button' }];  // No id field
   // Draggable key=undefined → React error
   ```

2. **Duplicate step IDs**
   ```typescript
   steps = [{ id: 1, ... }, { id: 1, ... }];  // Duplicate IDs
   // Drag-drop breaks, React warnings
   ```

3. **Reordering validation missing**
   ```typescript
   // User drags "Submit" step before "Fill Username"
   // → Invalid test sequence, no warning
   ```

4. **Long step lists**
   ```typescript
   steps.length === 500;  // 500 rows
   // DOM virtualization not implemented → Performance degradation
   ```

### Failure Modes
- **Missing ID field** - Draggable throws error
- **Duplicate IDs** - Drag-drop behavior undefined
- **Parent doesn't update** - onUpdateSteps() not called, steps out of sync
- **Delete during drag** - Race condition if delete happens mid-drag

---

## Edge Cases

### Input Variations
1. **Empty steps array**
   ```typescript
   steps = [];
   // Shows table header, no rows (valid)
   ```

2. **Single step**
   ```typescript
   steps = [{ id: 1, event: 'click', label: 'Button' }];
   // Drag-drop disabled (nothing to reorder)
   ```

3. **Step with no value**
   ```typescript
   step = { event: 'click', label: 'Button', value: undefined };
   // Input shows empty string
   ```

4. **Step with very long label**
   ```typescript
   step.label = 'A'.repeat(1000);
   // May overflow table cell, no truncation
   ```

5. **Rapid drag-drop operations**
   ```typescript
   // User drags multiple steps quickly
   // React may batch updates, final order correct
   ```

6. **Delete while editing value**
   ```typescript
   // User typing in input field, clicks delete
   // Input loses focus, step deleted (may lose unsaved changes)
   ```

---

## Developer-Must-Know Notes
- **Drag handle (☰) required** - First column provides drag interaction area
- **Step index auto-updates** - Display index recalculated after reorder
- **Delete confirmation NOT implemented** - Instant delete (UX improvement needed)
- **No undo/redo** - Cannot revert operations (feature gap)
- **Inline editing** - Value field editable via input (if implemented)
- **Performance concern** - 100+ steps may lag (no virtualization)
- **react-beautiful-dnd** - Mature DnD library, handles edge cases well
- **Unique IDs critical** - Step IDs must be unique and stable

**Testing Checklist:**
- [ ] Drag step up
- [ ] Drag step down
- [ ] Drag to first position
- [ ] Drag to last position
- [ ] Delete first step
- [ ] Delete last step
- [ ] Delete while editing value
- [ ] Edit value, then drag
- [ ] 100+ steps (performance test)

---

## Phase 3 Integration Points

### Strategy Implementation
| Strategy ID | Relevance | Integration Point |
|-------------|-----------|-------------------|
| **E1** | High | Step Management specification - Edit/delete/reorder operations |
| **UI-001** | High | Recording status indicators and visual feedback |
| **A1** | Medium | Core Recording displays captured steps in real-time |

### Specification Mapping
- **E1** (Step Management) - UI for reviewing and modifying recorded steps
- **B1** (Recording Workflow) - Step table bridges recording and mapping phases
- **H2** (User Experience) - Interactive controls improve recording workflow

### Evidence References
- Code: `src/components/Recorder/StepsTable.tsx` (full component)
- UI: Screenshot of recording interface with step table
- Test: Manual drag-drop testing (reorder steps, delete, edit values)

### Integration Risks
1. **Missing IDs:** Steps without unique IDs break drag-drop (React key errors)
2. **Performance:** Large step lists (100+) may lag without virtualization
3. **No Validation:** Reordering allows invalid test sequences (no constraint checking)
4. **No Undo:** Accidental delete or reorder cannot be reverted (UX gap)

---

## Recommendations for Future Enhancement
1. **Add delete confirmation:**
   ```typescript
   <ConfirmationModal
     message="Delete this step?"
     onConfirm={() => onDeleteStep(index)}
   />
   ```

2. **Implement undo/redo:**
   ```typescript
   const [history, setHistory] = useState<Step[][]>([]);
   // Push state on each operation, pop on undo
   ```

3. **Add step validation:**
   ```typescript
   function validateStepOrder(steps: Step[]): ValidationResult {
     // Check for invalid sequences (e.g., submit before fill)
   }
   ```

4. **Virtualize long lists:**
   ```typescript
   import { FixedSizeList } from 'react-window';
   // Render only visible rows for 1000+ steps
   ```

---

## Related Components
- **Recorder UI** (`recorder-ui_breakdown.md`) - Parent component managing steps array
- **Step Capture Engine** (`step-capture-engine_breakdown.md`) - Generates steps displayed in table
- **Content Script Recorder** (`content-script-recorder_breakdown.md`) - Sends log_event messages populating table
- **Project Repository** (`project-repository_breakdown.md`) - Saves reordered steps to IndexedDB
