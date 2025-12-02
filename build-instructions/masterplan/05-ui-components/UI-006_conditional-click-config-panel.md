# UI-006: Conditional Click Config Panel

> **Build Card:** UI-006  
> **Category:** UI Components  
> **Dependencies:** FND-010, ENG-014  
> **Risk Level:** Medium  
> **Estimated Lines:** 350-420

---

## 1. PURPOSE

Implement a `ConditionalClickConfigPanel` React component that provides a full configuration interface for setting up conditional click steps. This panel allows users to specify button texts to watch for, success text to end polling, timeout duration, and other polling parameters. Used when adding or editing a conditional click step in the recording.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| Step Interface | `src/types/step.types.ts` | ConditionalClickConfig type |
| ENG-014 | `build-instructions/masterplan/03-engine/ENG-014_wait-and-click-buttons.md` | Config options |
| Feature Specs | `/future-spec/03_feature-specs.md` | Copilot workflow requirements |
| UI Patterns | `src/components/ui/` | Form styling patterns |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `src/components/panels/ConditionalClickConfigPanel.tsx` | CREATE | ~220 |
| `src/components/panels/index.ts` | MODIFY | +5 |
| `src/components/StepEditor.tsx` | MODIFY | +20 |

### Artifacts

- `ConditionalClickConfigPanel` component created
- `CopilotPresetButton` for quick setup
- Panel exported from panels index
- Integration with StepEditor

---

## 4. DETAILED SPECIFICATION

### 4.1 ConditionalClickConfigPanel Component

```typescript
// In src/components/panels/ConditionalClickConfigPanel.tsx

import React, { useState, useCallback } from 'react';
import { ConditionalClickConfig } from '@/types/step.types';

export interface ConditionalClickConfigPanelProps {
  /** Current configuration */
  config: ConditionalClickConfig;
  
  /** Callback when configuration changes */
  onChange: (config: ConditionalClickConfig) => void;
  
  /** Whether panel is disabled */
  disabled?: boolean;
  
  /** Whether to show Copilot preset button */
  showCopilotPreset?: boolean;
  
  /** Additional CSS classes */
  className?: string;
}

/** Default configuration values */
const DEFAULT_CONFIG: ConditionalClickConfig = {
  buttonTexts: [],
  successText: '',
  timeoutMs: 120000,
  pollIntervalMs: 500,
  maxClicks: undefined,
  confidence: 0.7,
  postClickDelayMs: 500
};

/** Copilot-specific preset configuration */
const COPILOT_PRESET: ConditionalClickConfig = {
  buttonTexts: ['Allow', 'Keep'],
  successText: 'committed',
  timeoutMs: 120000,
  pollIntervalMs: 500,
  maxClicks: 100,
  confidence: 0.7,
  postClickDelayMs: 500
};

/**
 * Configuration panel for conditional click steps
 */
export const ConditionalClickConfigPanel: React.FC<ConditionalClickConfigPanelProps> = ({
  config,
  onChange,
  disabled = false,
  showCopilotPreset = true,
  className = ''
}) => {
  // Local state for button text input
  const [newButtonText, setNewButtonText] = useState('');

  // Handle adding a button text
  const handleAddButtonText = useCallback(() => {
    if (newButtonText.trim() && !config.buttonTexts.includes(newButtonText.trim())) {
      onChange({
        ...config,
        buttonTexts: [...config.buttonTexts, newButtonText.trim()]
      });
      setNewButtonText('');
    }
  }, [newButtonText, config, onChange]);

  // Handle removing a button text
  const handleRemoveButtonText = useCallback((index: number) => {
    onChange({
      ...config,
      buttonTexts: config.buttonTexts.filter((_, i) => i !== index)
    });
  }, [config, onChange]);

  // Handle input key press (Enter to add)
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddButtonText();
    }
  };

  // Apply Copilot preset
  const applyCopilotPreset = () => {
    onChange(COPILOT_PRESET);
  };

  // Update a specific field
  const updateField = <K extends keyof ConditionalClickConfig>(
    field: K,
    value: ConditionalClickConfig[K]
  ) => {
    onChange({ ...config, [field]: value });
  };

  return (
    <div className={`conditional-click-config-panel space-y-4 ${className}`}>
      {/* Header with Copilot preset */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Conditional Click Configuration
        </h3>
        
        {showCopilotPreset && (
          <button
            type="button"
            onClick={applyCopilotPreset}
            disabled={disabled}
            className="
              inline-flex items-center gap-1.5
              px-3 py-1.5
              text-xs font-medium
              bg-gradient-to-r from-blue-500 to-purple-500
              text-white
              rounded-md
              hover:from-blue-600 hover:to-purple-600
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all
            "
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            Use Copilot Preset
          </button>
        )}
      </div>

      {/* Button Texts Section */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
          Button Texts to Click
          <span className="text-gray-500 font-normal ml-1">
            (will click any button containing these texts)
          </span>
        </label>
        
        {/* Current button texts */}
        <div className="flex flex-wrap gap-2">
          {config.buttonTexts.map((text, index) => (
            <span
              key={index}
              className="
                inline-flex items-center gap-1
                px-2 py-1
                bg-amber-100 dark:bg-amber-900
                text-amber-800 dark:text-amber-200
                text-xs rounded-md
              "
            >
              "{text}"
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveButtonText(index)}
                  className="ml-1 text-amber-600 hover:text-amber-800 dark:text-amber-400"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </span>
          ))}
          
          {config.buttonTexts.length === 0 && (
            <span className="text-xs text-gray-400 italic">
              No button texts added
            </span>
          )}
        </div>

        {/* Add button text input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newButtonText}
            onChange={(e) => setNewButtonText(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={disabled}
            placeholder="Enter button text (e.g., Allow)"
            className="
              flex-1 px-3 py-1.5
              text-sm
              bg-white dark:bg-gray-800
              border border-gray-300 dark:border-gray-600
              rounded-md
              focus:ring-2 focus:ring-amber-500 focus:border-amber-500
              disabled:opacity-50
            "
          />
          <button
            type="button"
            onClick={handleAddButtonText}
            disabled={disabled || !newButtonText.trim()}
            className="
              px-3 py-1.5
              text-sm font-medium
              bg-amber-500 text-white
              rounded-md
              hover:bg-amber-600
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            Add
          </button>
        </div>
      </div>

      {/* Success Text */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
          Success Text
          <span className="text-gray-500 font-normal ml-1">
            (stop clicking when this text appears)
          </span>
        </label>
        <input
          type="text"
          value={config.successText || ''}
          onChange={(e) => updateField('successText', e.target.value)}
          disabled={disabled}
          placeholder="e.g., committed, success, complete"
          className="
            w-full px-3 py-1.5
            text-sm
            bg-white dark:bg-gray-800
            border border-gray-300 dark:border-gray-600
            rounded-md
            focus:ring-2 focus:ring-green-500 focus:border-green-500
            disabled:opacity-50
          "
        />
      </div>

      {/* Timing Settings */}
      <div className="grid grid-cols-2 gap-4">
        {/* Timeout */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            Timeout
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={config.timeoutMs / 1000}
              onChange={(e) => updateField('timeoutMs', parseFloat(e.target.value) * 1000)}
              disabled={disabled}
              min={1}
              max={600}
              className="
                w-20 px-2 py-1.5
                text-sm text-center
                bg-white dark:bg-gray-800
                border border-gray-300 dark:border-gray-600
                rounded-md
                disabled:opacity-50
              "
            />
            <span className="text-xs text-gray-500">seconds</span>
          </div>
        </div>

        {/* Poll Interval */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            Poll Interval
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={config.pollIntervalMs}
              onChange={(e) => updateField('pollIntervalMs', parseInt(e.target.value, 10))}
              disabled={disabled}
              min={100}
              max={5000}
              step={100}
              className="
                w-20 px-2 py-1.5
                text-sm text-center
                bg-white dark:bg-gray-800
                border border-gray-300 dark:border-gray-600
                rounded-md
                disabled:opacity-50
              "
            />
            <span className="text-xs text-gray-500">ms</span>
          </div>
        </div>
      </div>

      {/* Advanced Settings */}
      <details className="group">
        <summary className="cursor-pointer text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
          Advanced Settings
        </summary>
        
        <div className="mt-3 space-y-4 pl-2 border-l-2 border-gray-200 dark:border-gray-700">
          {/* Max Clicks */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Max Clicks
              <span className="text-gray-500 font-normal ml-1">(optional limit)</span>
            </label>
            <input
              type="number"
              value={config.maxClicks || ''}
              onChange={(e) => updateField('maxClicks', e.target.value ? parseInt(e.target.value, 10) : undefined)}
              disabled={disabled}
              min={1}
              placeholder="No limit"
              className="
                w-24 px-2 py-1.5
                text-sm
                bg-white dark:bg-gray-800
                border border-gray-300 dark:border-gray-600
                rounded-md
                disabled:opacity-50
              "
            />
          </div>

          {/* Confidence Threshold */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              OCR Confidence: {(config.confidence * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              value={config.confidence}
              onChange={(e) => updateField('confidence', parseFloat(e.target.value))}
              disabled={disabled}
              min={0.5}
              max={0.95}
              step={0.05}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
          </div>

          {/* Post-Click Delay */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Delay After Click
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={config.postClickDelayMs}
                onChange={(e) => updateField('postClickDelayMs', parseInt(e.target.value, 10))}
                disabled={disabled}
                min={0}
                max={5000}
                step={100}
                className="
                  w-20 px-2 py-1.5
                  text-sm text-center
                  bg-white dark:bg-gray-800
                  border border-gray-300 dark:border-gray-600
                  rounded-md
                  disabled:opacity-50
                "
              />
              <span className="text-xs text-gray-500">ms</span>
            </div>
          </div>
        </div>
      </details>

      {/* Configuration Summary */}
      <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md text-xs text-gray-600 dark:text-gray-400">
        <strong>Summary:</strong> Will watch screen for 
        {config.buttonTexts.length > 0 
          ? ` "${config.buttonTexts.join('", "')}"` 
          : ' (no buttons specified)'
        }
        {config.successText && ` until "${config.successText}" appears`}
        {!config.successText && ` for ${config.timeoutMs / 1000}s`}
        {config.maxClicks && ` (max ${config.maxClicks} clicks)`}
        .
      </div>
    </div>
  );
};

export default ConditionalClickConfigPanel;
```

### 4.2 Panels Index Export

```typescript
// In src/components/panels/index.ts

export { ConditionalClickConfigPanel } from './ConditionalClickConfigPanel';
export type { ConditionalClickConfigPanelProps } from './ConditionalClickConfigPanel';
```

### 4.3 StepEditor Integration

```typescript
// In src/components/StepEditor.tsx

import { ConditionalClickConfigPanel } from './panels';
import { Step, ConditionalClickConfig } from '@/types/step.types';

interface StepEditorProps {
  step: Step;
  onStepChange: (step: Step) => void;
  // ... other props
}

export const StepEditor: React.FC<StepEditorProps> = ({
  step,
  onStepChange,
  // ... other props
}) => {
  // Handle conditional config changes
  const handleConditionalConfigChange = (config: ConditionalClickConfig) => {
    onStepChange({
      ...step,
      conditionalConfig: config
    });
  };

  return (
    <div className="step-editor p-4 space-y-4">
      {/* Basic step fields */}
      {/* ... */}

      {/* Conditional Click Configuration */}
      {step.action === 'conditional_click' && (
        <ConditionalClickConfigPanel
          config={step.conditionalConfig || {
            buttonTexts: [],
            successText: '',
            timeoutMs: 120000,
            pollIntervalMs: 500,
            confidence: 0.7,
            postClickDelayMs: 500
          }}
          onChange={handleConditionalConfigChange}
        />
      )}

      {/* Other step-specific fields */}
      {/* ... */}
    </div>
  );
};
```

---

## 5. CODE EXAMPLES

### 5.1 Basic Usage

```tsx
import { ConditionalClickConfigPanel } from '@/components/panels';

const [config, setConfig] = useState<ConditionalClickConfig>({
  buttonTexts: [],
  successText: '',
  timeoutMs: 120000,
  pollIntervalMs: 500,
  confidence: 0.7,
  postClickDelayMs: 500
});

<ConditionalClickConfigPanel
  config={config}
  onChange={setConfig}
/>
```

### 5.2 With Copilot Preset

```tsx
// User clicks "Use Copilot Preset" button
// Config automatically becomes:
{
  buttonTexts: ['Allow', 'Keep'],
  successText: 'committed',
  timeoutMs: 120000,
  pollIntervalMs: 500,
  maxClicks: 100,
  confidence: 0.7,
  postClickDelayMs: 500
}
```

### 5.3 Custom Configuration

```tsx
// Manual configuration for different use case
<ConditionalClickConfigPanel
  config={{
    buttonTexts: ['Accept', 'OK', 'Continue'],
    successText: 'Success',
    timeoutMs: 30000,
    pollIntervalMs: 1000,
    maxClicks: 10,
    confidence: 0.8,
    postClickDelayMs: 300
  }}
  onChange={handleConfigChange}
  showCopilotPreset={false}  // Hide Copilot preset for non-Copilot use
/>
```

### 5.4 In Modal Dialog

```tsx
const AddConditionalStepModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: ConditionalClickConfig) => void;
}> = ({ isOpen, onClose, onSave }) => {
  const [config, setConfig] = useState<ConditionalClickConfig>(DEFAULT_CONFIG);

  const handleSave = () => {
    if (config.buttonTexts.length > 0) {
      onSave(config);
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <h2 className="text-lg font-medium mb-4">Add Conditional Click Step</h2>
        
        <ConditionalClickConfigPanel
          config={config}
          onChange={setConfig}
        />
        
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={config.buttonTexts.length === 0}
            className="btn-primary"
          >
            Add Step
          </button>
        </div>
      </div>
    </Modal>
  );
};
```

### 5.5 Validation Display

```tsx
// Show validation errors
const ConfigWithValidation: React.FC = () => {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  
  const errors = validateConfig(config);

  return (
    <div>
      <ConditionalClickConfigPanel
        config={config}
        onChange={setConfig}
      />
      
      {errors.length > 0 && (
        <div className="mt-2 text-xs text-red-600">
          {errors.map((error, i) => (
            <p key={i}>• {error}</p>
          ))}
        </div>
      )}
    </div>
  );
};

function validateConfig(config: ConditionalClickConfig): string[] {
  const errors: string[] = [];
  if (config.buttonTexts.length === 0) {
    errors.push('At least one button text is required');
  }
  if (config.timeoutMs < 1000) {
    errors.push('Timeout must be at least 1 second');
  }
  return errors;
}
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** Can add multiple button texts to watch
- [ ] **AC-2:** Can remove individual button texts
- [ ] **AC-3:** Enter key adds new button text
- [ ] **AC-4:** Success text input works correctly
- [ ] **AC-5:** Timeout displayed and editable in seconds
- [ ] **AC-6:** Poll interval editable in milliseconds
- [ ] **AC-7:** "Use Copilot Preset" applies correct config
- [ ] **AC-8:** Advanced settings collapsible section works
- [ ] **AC-9:** Confidence slider updates value
- [ ] **AC-10:** Configuration summary updates dynamically

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Button text uniqueness** - Don't allow duplicate texts
2. **Minimum timeout** - At least 1 second
3. **Poll interval range** - 100ms to 5000ms

### Patterns to Follow

1. **Controlled inputs** - All values from props
2. **Collapsible sections** - Hide advanced options by default
3. **Clear feedback** - Summary shows what will happen

### Edge Cases

1. **Empty button texts** - Don't allow adding empty strings
2. **Very long button text** - May need truncation in display
3. **Zero timeout** - Invalid, enforce minimum
4. **No success text** - Valid, will run until timeout
5. **Rapid text additions** - Clear input after each add

---

## 8. VERIFICATION COMMANDS

```bash
# Verify file creation
ls -la src/components/panels/ConditionalClickConfigPanel.tsx

# Verify exports
grep -n "ConditionalClickConfigPanel" src/components/panels/index.ts

# Verify StepEditor integration
grep -n "ConditionalClickConfigPanel\|conditionalConfig" src/components/StepEditor.tsx

# Run type check
npm run type-check

# Build extension
npm run build
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Remove new file
rm src/components/panels/ConditionalClickConfigPanel.tsx

# Revert index changes
git checkout src/components/panels/index.ts

# Revert StepEditor changes
git checkout src/components/StepEditor.tsx
```

---

## 10. REFERENCES

- FND-010: Step Interface Extension (ConditionalClickConfig)
- ENG-014: Wait and Click Buttons
- UI-003: Conditional Click Badge Component
- Feature Spec: `/future-spec/03_feature-specs.md` Section 2

---

*End of Specification UI-006*
