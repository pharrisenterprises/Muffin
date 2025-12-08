# Step Table Management Breakdown

## Purpose
**What it does:** Interactive step list UI with drag-drop reordering, edit/delete actions, and visual step indicators.

**Where it lives:** `src/components/Recorder/StepsTable.tsx`

**Why it exists:** Users need to review, reorder, and modify recorded steps before saving to project.

## Inputs
```typescript
steps: Step[];
onUpdateSteps: (steps: Step[]) => void;
onDeleteStep: (index: number) => void;
```

## Outputs
- Reordered step array (via drag-drop)
- Deleted steps (via delete button)
- Edited step values (inline editing)

## Internal Architecture
**react-beautiful-dnd Integration:**
```typescript
<DragDropContext onDragEnd={handleDragEnd}>
  <Droppable droppableId="steps">
    {(provided) => (
      <tbody {...provided.droppableProps} ref={provided.innerRef}>
        {steps.map((step, index) => (
          <Draggable key={step.id} draggableId={step.id} index={index}>
            {(provided) => (
              <tr ref={provided.innerRef} {...provided.draggableProps}>
                <td {...provided.dragHandleProps}>☰</td>
                <td>{index + 1}</td>
                <td>{step.event}</td>
                <td>{step.label}</td>
                <td><input value={step.value} /></td>
                <td><button onClick={() => onDeleteStep(index)}>🗑️</button></td>
              </tr>
            )}
          </Draggable>
        ))}
      </tbody>
    )}
  </Droppable>
</DragDropContext>
```

## Critical Dependencies
- **react-beautiful-dnd** - Drag-drop library
- **Lucide icons** - UI icons

## Hidden Assumptions
1. **Each step has unique ID** - Required for Draggable key
2. **Reordering doesn't validate** - Allows invalid test sequences
3. **Inline editing limited** - Only value field editable

## Developer-Must-Know Notes
- Drag handle (☰) in first column for reordering
- Step index auto-updates after reorder
- Delete confirmation not implemented (instant delete)
- No undo/redo functionality