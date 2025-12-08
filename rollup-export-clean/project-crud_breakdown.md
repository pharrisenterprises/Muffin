# Project CRUD - Component Breakdown

**Last Updated:** December 7, 2025

---

## Purpose
**What it does:** UI components for creating, editing, and deleting projects in the Dashboard. Three Shadcn Dialog components provide modal interfaces for project management operations.

**Where it lives:** 
- `src/components/Dashboard/CreateProjectDialog.tsx`
- `src/components/Dashboard/EditProjectModal.tsx`
- `src/components/Dashboard/ConfirmationModal.tsx`

**Why it exists:** Separates project CRUD UI logic from Dashboard main component. Provides reusable dialog components with consistent Shadcn styling.

---

## Inputs

### CreateProjectDialog
```typescript
{
  open: boolean,
  onOpenChange: (open: boolean) => void
}
```

### EditProjectModal
```typescript
{
  project: Project,
  open: boolean,
  onOpenChange: (open: boolean) => void
}
```

### ConfirmationModal
```typescript
{
  open: boolean,
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel: () => void
}
```

---

## Outputs

### CreateProjectDialog
- New project created in IndexedDB
- Dashboard refreshes to show new project

### EditProjectModal
- Existing project updated in IndexedDB
- Dashboard refreshes to reflect changes

### ConfirmationModal
- User confirmation triggers callback
- Modal closes on confirm/cancel

---

## Internal Architecture

### CreateProjectDialog
```typescript
// CreateProjectDialog.tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function CreateProjectDialog({ open, onOpenChange }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetUrl, setTargetUrl] = useState('');

  const handleCreate = async () => {
    const project = {
      name,
      description,
      target_url: targetUrl,
      status: 'draft',
      created_date: Date.now(),
      updated_date: Date.now()
    };

    // Send to background for IndexedDB insert
    chrome.runtime.sendMessage({
      action: 'create_project',
      data: project
    }, (response) => {
      if (response.success) {
        onOpenChange(false);  // Close dialog
        // Dashboard will auto-refresh
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Input
            placeholder="Project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Input
            placeholder="Target URL"
            value={targetUrl}
            onChange={(e) => setTargetUrl(e.target.value)}
          />
          
          <Button onClick={handleCreate}>Create Project</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### EditProjectModal
```typescript
// EditProjectModal.tsx (similar structure to Create)
export default function EditProjectModal({ project, open, onOpenChange }) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || '');
  const [targetUrl, setTargetUrl] = useState(project.target_url || '');

  const handleUpdate = async () => {
    const updatedProject = {
      ...project,
      name,
      description,
      target_url: targetUrl,
      updated_date: Date.now()
    };

    chrome.runtime.sendMessage({
      action: 'update_project',
      data: updatedProject
    }, (response) => {
      if (response.success) {
        onOpenChange(false);
      }
    });
  };

  return <Dialog>...</Dialog>;
}
```

### ConfirmationModal
```typescript
// ConfirmationModal.tsx
export default function ConfirmationModal({
  open,
  title,
  message,
  onConfirm,
  onCancel
}) {
  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        <p>{message}</p>
        
        <div className="flex gap-2">
          <Button onClick={onConfirm} variant="destructive">
            Confirm
          </Button>
          <Button onClick={onCancel} variant="outline">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Critical Dependencies
**Upstream:**
- **Dashboard.tsx** - Opens/closes dialogs, refreshes after operations
- **Shadcn UI** - Dialog, Input, Button components

**Downstream:**
- **chrome.runtime.sendMessage** - Sends CRUD actions to background
- **Message Router** (`message-router_breakdown.md`) - Processes DB operations

**External:**
- **@radix-ui/react-dialog** - Underlying dialog primitive
- **React state hooks** - useState for form inputs

---

## Hidden Assumptions
1. **No validation** - Empty name/URL allowed (should validate)
2. **Background message succeeds** - No error handling for failed messages
3. **Dashboard auto-refreshes** - Assumes parent component reloads project list
4. **Controlled inputs** - Uses useState for all form fields
5. **No loading state** - Button doesn't show loading spinner during save
6. **Single dialog at once** - Doesn't handle multiple dialogs open
7. **Modal dismissal on backdrop click** - Default Radix behavior enabled

---

## Stability Concerns

### High-Risk Patterns
1. **No input validation**
   ```typescript
   <Input value={name} />  // Can submit empty name
   // Should validate: name.trim().length > 0
   ```

2. **No error handling**
   ```typescript
   chrome.runtime.sendMessage({ action: 'create_project' }, (response) => {
     // If response.success === false, no feedback to user
   });
   ```

3. **No loading state**
   ```typescript
   <Button onClick={handleCreate}>Create Project</Button>
   // User can click multiple times during save
   ```

4. **Race condition on rapid edits**
   ```typescript
   // User clicks Save, immediately opens Edit again
   // Second edit may use stale project data
   ```

### Failure Modes
- **Background worker offline** - sendMessage fails silently
- **Duplicate project names** - No uniqueness constraint
- **Invalid URL format** - No URL validation
- **Long names/descriptions** - No character limits (may break UI)

---

## Edge Cases

### Input Variations
1. **Empty name**
   ```typescript
   name = '';  // Allowed, creates unnamed project
   ```

2. **Very long name**
   ```typescript
   name = 'A'.repeat(1000);  // No limit, may break card layout
   ```

3. **Invalid URL**
   ```typescript
   target_url = 'not-a-url';  // Allowed, will fail during recording
   ```

4. **Special characters in name**
   ```typescript
   name = '<script>alert("xss")</script>';  // Stored as-is
   ```

5. **Dialog closed before save**
   ```typescript
   // User types name, clicks outside dialog → Lost data
   ```

---

## Developer-Must-Know Notes
- **No validation logic** - All inputs accepted as-is (major UX gap)
- **No error UI** - Failed saves have no user feedback
- **No loading states** - Buttons don't disable during operations
- **Shadcn/Radix** - Uses Radix UI Dialog primitive under the hood
- **Controlled components** - All inputs use React state
- **Background messaging** - Relies on message router for DB ops
- **Auto-refresh dependency** - Dashboard must listen for project changes

---

## Phase 3 Integration Points

### Strategy Implementation
| Strategy ID | Relevance | Integration Point |
|-------------|-----------|-------------------|
| **DAT-003** | Critical | All CRUD operations route through Project Repository |
| **UI-001** | High | Dashboard UI orchestrates dialog state management |
| **D2** | High | Project Management specification defines these operations |

### Specification Mapping
- **D2** (Project Management) - CRUD operations for test project lifecycle
- **H1** (UI Design System) - Shadcn Dialog components for consistent styling
- **B1** (Recording Workflow) - Create → Record → Map → Execute flow starts here

### Evidence References
- Code: `src/components/Dashboard/CreateProjectDialog.tsx` (full component)
- Code: `src/components/Dashboard/EditProjectModal.tsx` (full component)
- Code: `src/components/Dashboard/ConfirmationModal.tsx` (full component)
- UI: Dashboard screenshot showing project cards with edit/delete buttons

### Integration Risks
1. **No Validation:** Empty/invalid data allowed → Breaks downstream recording/playback
2. **Silent Failures:** Background message errors not surfaced to user
3. **Race Conditions:** Rapid create/edit operations may conflict in IndexedDB
4. **Missing Constraints:** No uniqueness check on project names (duplicate names allowed)

---

## Related Components
- **Dashboard UI** (`dashboard-ui_breakdown.md`) - Parent component managing dialog state
- **Project Repository** (`project-repository_breakdown.md`) - Database layer for CRUD operations
- **Message Router** (`message-router_breakdown.md`) - Routes create_project/update_project messages
- **Recorder UI** (`recorder-ui_breakdown.md`) - Consumes created projects for recording
