# Project CRUD Breakdown

## Purpose
**What it does:** UI components and logic for creating, editing, and deleting projects through modal dialogs.

**Where it lives:** 
- `src/components/Dashboard/CreateProjectDialog.tsx` - New project form
- `src/components/Dashboard/EditProjectModal.tsx` - Edit project form
- `src/components/Dashboard/ConfirmationModal.tsx` - Delete confirmation

**Why it exists:** Encapsulates project mutation logic in reusable dialog components separate from Dashboard list view.

## Inputs
**CreateProjectDialog:**
```typescript
{
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}
```

**EditProjectModal:**
```typescript
{
  open: boolean;
  onClose: () => void;
  projectData?: { id, name, description };
  onSave: (updatedProject) => Promise<void>;
}
```

## Outputs
- `onSuccess` callback after creation
- `onSave` callback with updated project data
- `onConfirm` callback for delete confirmation

## Internal Architecture
**CreateProjectDialog Flow:**
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
      onSuccess();  // Refresh Dashboard list
      onClose();
    }
  });
};
```

**EditProjectModal Flow:**
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

## Critical Dependencies
- **Shadcn Dialog** - Modal container
- **Shadcn Input** - Form fields
- **Chrome runtime** - Message passing for DB operations

## Hidden Assumptions
1. **Name required** - No validation, allows empty names
2. **Description optional** - Defaults to empty string
3. **Status always 'draft'** - New projects start in draft
4. **No duplicate name checking** - Allows identical project names

## Stability Concerns
- **No client-side validation** - Empty names, special characters allowed
- **No loading states** - Button enabled during save, allows double-submit
- **No error handling** - Failed creates/updates fail silently

## Developer-Must-Know Notes
- Dialogs use Shadcn's `<Dialog>` component (accessible, keyboard nav)
- Form inputs are controlled components (useState)
- Success callback triggers Dashboard reload
- Delete uses two-step confirmation (ConfirmationModal)
