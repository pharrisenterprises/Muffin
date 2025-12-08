# MUFFIN LITE - DATA LAYER SPECIFICATION

> **Version:** 2.1 | **Status:** Specification  
> **Purpose:** Define data models, schemas, and storage patterns for Muffin Lite

---

## STORAGE OVERVIEW

### Storage Technologies

| Technology | Purpose | Location |
|------------|---------|----------|
| **IndexedDB (Dexie.js)** | Primary data storage | Background script |
| **Chrome Storage Sync** | User preferences | Extension-wide |
| **Memory** | Runtime state | React components |

### Data Categories

| Category | Storage | Persistence |
|----------|---------|-------------|
| Projects | IndexedDB | Permanent |
| Recordings | IndexedDB | Permanent |
| Test Runs | IndexedDB | Permanent |
| CSV Data | IndexedDB (with recording) | Permanent |
| User Preferences | Chrome Storage Sync | Cross-device |
| Playback State | React State | Session only |
| Vision Engine State | Class Instance | Session only |

---

## INDEXEDDB SCHEMA

### Database Configuration

```typescript
import Dexie, { Table } from 'dexie';

class MuffinLiteDatabase extends Dexie {
  projects!: Table<Project>;
  recordings!: Table<Recording>;
  testRuns!: Table<TestRun>;

  constructor() {
    super('MuffinLiteDB');
    
    // Version 1: Base schema
    this.version(1).stores({
      projects: '++id, name, createdAt',
      recordings: '++id, projectId, name, createdAt',
      testRuns: '++id, recordingId, projectId, status, createdAt'
    });
    
    // Version 2: Vision and loop fields (NEW)
    this.version(2).stores({
      projects: '++id, name, createdAt',
      recordings: '++id, projectId, name, createdAt',
      testRuns: '++id, recordingId, projectId, status, createdAt'
    }).upgrade(tx => {
      // Migrate existing recordings to include new fields
      return tx.table('recordings').toCollection().modify(recording => {
        recording.loopStartIndex = recording.loopStartIndex ?? 0;
        recording.globalDelayMs = recording.globalDelayMs ?? 0;
        recording.conditionalDefaults = recording.conditionalDefaults ?? {
          searchTerms: ['Allow', 'Keep'],
          timeoutSeconds: 120
        };
        
        // Migrate steps to include recordedVia
        if (recording.steps) {
          recording.steps = recording.steps.map((step: any) => ({
            ...step,
            recordedVia: step.recordedVia ?? 'dom'
          }));
        }
      });
    });
  }
}

export const db = new MuffinLiteDatabase();
```

---

## TYPE DEFINITIONS

### Project

```typescript
/**
 * A project is a container for recordings.
 * Users organize their automation scripts by project.
 */
interface Project {
  /** Auto-incremented primary key */
  id?: number;
  
  /** User-defined project name */
  name: string;
  
  /** Optional project description */
  description?: string;
  
  /** Target website URL (informational) */
  targetUrl?: string;
  
  /** Whether project is shared/public */
  isPublic: boolean;
  
  /** Creation timestamp */
  createdAt: Date;
  
  /** Last update timestamp */
  updatedAt?: Date;
}

// Default values
const defaultProject: Omit<Project, 'id'> = {
  name: '',
  description: '',
  targetUrl: '',
  isPublic: false,
  createdAt: new Date()
};
```

### Recording

```typescript
/**
 * A recording is a sequence of steps that can be replayed.
 * Contains all configuration for playback including delays and loops.
 */
interface Recording {
  /** Auto-incremented primary key */
  id?: number;
  
  /** Foreign key to parent project */
  projectId: number;
  
  /** User-defined recording name */
  name: string;
  
  /** Optional recording description */
  description?: string;
  
  /** Array of recorded steps */
  steps: Step[];
  
  /** URL where recording started */
  startUrl: string;
  
  /** Creation timestamp */
  createdAt: Date;
  
  /** Last update timestamp */
  updatedAt?: Date;
  
  // ===== NEW: Loop Configuration =====
  
  /**
   * Index where loop starts for CSV rows 2+
   * Row 1 always executes all steps (0 to end)
   * Rows 2+ execute from this index to end
   * Default: 0 (execute all steps for every row)
   */
  loopStartIndex: number;
  
  // ===== NEW: Delay Configuration =====
  
  /**
   * Global delay applied AFTER each step (milliseconds)
   * Only applies if step has no per-step delay
   * Default: 0 (no delay)
   */
  globalDelayMs: number;
  
  // ===== NEW: Conditional Defaults =====
  
  /**
   * Default configuration for conditional click steps
   * Can be overridden at step level
   */
  conditionalDefaults: {
    /** Text to search for on screen */
    searchTerms: string[];
    
    /** Seconds to wait after last click before timeout */
    timeoutSeconds: number;
  };
  
  // ===== CSV Data (Optional) =====
  
  /** Parsed CSV column mappings */
  parsedFields?: ParsedField[];
  
  /** Raw CSV data rows */
  csvData?: Record<string, string>[];
}

// Default values
const defaultRecording: Omit<Recording, 'id' | 'projectId'> = {
  name: '',
  description: '',
  steps: [],
  startUrl: '',
  createdAt: new Date(),
  loopStartIndex: 0,
  globalDelayMs: 0,
  conditionalDefaults: {
    searchTerms: ['Allow', 'Keep'],
    timeoutSeconds: 120
  }
};
```

### Step

```typescript
/**
 * A step represents a single user action in a recording.
 * Extended with Vision and delay capabilities.
 */
interface Step {
  /** Unique identifier within recording */
  id: string;
  
  /** Human-readable label for the step */
  label: string;
  
  /** Type of action */
  event: StepEventType;
  
  /** Input value for input/type events */
  value?: string;
  
  /** CSS selector for element */
  selector?: string;
  
  /** XPath for element */
  xpath?: string;
  
  /** URL for navigation events */
  url?: string;
  
  /** Timestamp when recorded */
  timestamp?: number;
  
  /** Order in sequence */
  order?: number;
  
  // ===== NEW: Recording Method =====
  
  /**
   * How this step was recorded
   * - 'dom': Standard DOM event capture
   * - 'vision': Vision/OCR fallback was used
   */
  recordedVia: 'dom' | 'vision';
  
  // ===== NEW: Vision Data =====
  
  /**
   * Element coordinates (for Vision-recorded steps)
   * Used for Vision-based playback
   */
  coordinates?: {
    /** Left edge X position */
    x: number;
    /** Top edge Y position */
    y: number;
    /** Element width */
    width: number;
    /** Element height */
    height: number;
  };
  
  /**
   * Text recognized by OCR at the coordinates
   * Useful for debugging and verification
   */
  ocrText?: string;
  
  /**
   * OCR confidence score (0-100)
   * Higher is more confident
   */
  confidenceScore?: number;
  
  // ===== NEW: Time Delay =====
  
  /**
   * Delay in seconds to wait BEFORE this step executes
   * Overrides global delay for this step
   */
  delaySeconds?: number;
  
  // ===== NEW: Conditional Click Configuration =====
  
  /**
   * Configuration for conditional-click event type
   * Defines polling behavior for approval buttons
   */
  conditionalConfig?: ConditionalConfig;
}

/** Allowed step event types */
type StepEventType = 
  | 'open'              // Navigate to URL
  | 'input'             // Type text into field
  | 'click'             // Click element
  | 'dropdown'          // Select dropdown option (Vision)
  | 'conditional-click' // Poll and click until timeout
  ;

// Default values for new step
const defaultStep: Omit<Step, 'id'> = {
  label: '',
  event: 'click',
  recordedVia: 'dom',
  timestamp: Date.now()
};
```

### ConditionalConfig

```typescript
/**
 * Configuration for conditional click steps.
 * Defines how the Vision polling loop behaves.
 */
interface ConditionalConfig {
  /** Whether conditional logic is enabled */
  enabled: boolean;
  
  /** Text to search for on screen (case-insensitive) */
  searchTerms: string[];
  
  /** Seconds to wait after last click before exiting */
  timeoutSeconds: number;
  
  /** Milliseconds between screen scans */
  pollIntervalMs: number;
  
  /** Type of interaction when text is found */
  interactionType: 'click' | 'dropdown' | 'input';
  
  /** For dropdown type: option text to select */
  dropdownOption?: string;
  
  /** For input type: text to enter */
  inputValue?: string;
}

// Default conditional config
const defaultConditionalConfig: ConditionalConfig = {
  enabled: true,
  searchTerms: ['Allow', 'Keep'],
  timeoutSeconds: 120,
  pollIntervalMs: 1000,
  interactionType: 'click'
};
```

### ParsedField

```typescript
/**
 * Maps a CSV column to a step label.
 * Used for position-based column mapping.
 */
interface ParsedField {
  /** CSV column name (may include suffix like _1, _2) */
  field_name: string;
  
  /** Target step label to map to */
  inputvarfields: string;
  
  /** Whether mapping is active */
  mapped: boolean;
}
```

### TestRun

```typescript
/**
 * Records the result of a playback execution.
 * Stores success/failure counts and logs.
 */
interface TestRun {
  /** Auto-incremented primary key */
  id?: number;
  
  /** Foreign key to recording */
  recordingId: number;
  
  /** Foreign key to project */
  projectId: number;
  
  /** Recording name (denormalized for display) */
  recordingName: string;
  
  /** Project name (denormalized for display) */
  projectName: string;
  
  /** Total CSV rows processed */
  totalRows: number;
  
  /** Rows completed successfully */
  successfulRows: number;
  
  /** Rows that failed */
  failedRows: number;
  
  /** Total steps executed */
  totalSteps: number;
  
  /** Steps completed successfully */
  successfulSteps: number;
  
  /** Steps that failed */
  failedSteps: number;
  
  /** Execution start time */
  startTime: Date;
  
  /** Execution end time */
  endTime?: Date;
  
  /** Current status */
  status: TestRunStatus;
  
  /** Detailed execution logs */
  logs: LogEntry[];
  
  // ===== NEW: Vision Statistics =====
  
  /** Number of conditional buttons clicked */
  conditionalButtonsClicked?: number;
  
  /** Number of Vision-based steps executed */
  visionStepsExecuted?: number;
}

type TestRunStatus = 
  | 'pending'    // Not started
  | 'running'    // In progress
  | 'completed'  // Finished successfully
  | 'failed'     // Finished with errors
  | 'stopped'    // Manually stopped
  ;

interface LogEntry {
  /** Log timestamp */
  timestamp: Date;
  
  /** Log level */
  level: 'info' | 'success' | 'warning' | 'error';
  
  /** Log message */
  message: string;
  
  /** CSV row index (0-based) */
  rowIndex?: number;
  
  /** Step index (0-based) */
  stepIndex?: number;
  
  /** Additional data */
  details?: Record<string, any>;
}
```

---

## CHROME STORAGE SYNC SCHEMA

```typescript
/**
 * User preferences stored in Chrome Storage Sync.
 * Synced across devices when user is logged into Chrome.
 */
interface UserPreferences {
  /** UI theme preference */
  theme: 'light' | 'dark' | 'system';
  
  /** Default global delay for new recordings (ms) */
  defaultGlobalDelayMs: number;
  
  /** Default conditional search terms */
  defaultSearchTerms: string[];
  
  /** Default conditional timeout (seconds) */
  defaultTimeoutSeconds: number;
  
  /** OCR confidence threshold (0-100) */
  ocrConfidenceThreshold: number;
  
  /** Whether to show Vision fallback notifications */
  showVisionNotifications: boolean;
  
  /** Whether to enable auto-detection failsafe */
  enableAutoDetection: boolean;
}

// Default preferences
const defaultPreferences: UserPreferences = {
  theme: 'system',
  defaultGlobalDelayMs: 0,
  defaultSearchTerms: ['Allow', 'Keep'],
  defaultTimeoutSeconds: 120,
  ocrConfidenceThreshold: 60,
  showVisionNotifications: true,
  enableAutoDetection: true
};

// Storage helper
class PreferencesStorage {
  private static KEY = 'userPreferences';
  
  static async get(): Promise<UserPreferences> {
    return new Promise((resolve) => {
      chrome.storage.sync.get(this.KEY, (result) => {
        resolve({ ...defaultPreferences, ...result[this.KEY] });
      });
    });
  }
  
  static async set(prefs: Partial<UserPreferences>): Promise<void> {
    const current = await this.get();
    return new Promise((resolve) => {
      chrome.storage.sync.set({
        [this.KEY]: { ...current, ...prefs }
      }, resolve);
    });
  }
}
```

---

## DATA ACCESS PATTERNS

### Repository Pattern

```typescript
// src/lib/repositories/recordingRepository.ts

import { db } from '../background/indexedDB';
import { Recording, Step } from '../types';

export class RecordingRepository {
  
  /**
   * Get all recordings for a project
   */
  static async getByProject(projectId: number): Promise<Recording[]> {
    return db.recordings
      .where('projectId')
      .equals(projectId)
      .toArray();
  }
  
  /**
   * Get a single recording by ID
   */
  static async getById(id: number): Promise<Recording | undefined> {
    return db.recordings.get(id);
  }
  
  /**
   * Create a new recording
   */
  static async create(recording: Omit<Recording, 'id'>): Promise<number> {
    return db.recordings.add({
      ...recording,
      createdAt: new Date(),
      loopStartIndex: recording.loopStartIndex ?? 0,
      globalDelayMs: recording.globalDelayMs ?? 0,
      conditionalDefaults: recording.conditionalDefaults ?? {
        searchTerms: ['Allow', 'Keep'],
        timeoutSeconds: 120
      }
    });
  }
  
  /**
   * Update an existing recording
   */
  static async update(id: number, changes: Partial<Recording>): Promise<void> {
    await db.recordings.update(id, {
      ...changes,
      updatedAt: new Date()
    });
  }
  
  /**
   * Delete a recording
   */
  static async delete(id: number): Promise<void> {
    await db.recordings.delete(id);
  }
  
  /**
   * Add a step to a recording
   */
  static async addStep(recordingId: number, step: Step): Promise<void> {
    const recording = await this.getById(recordingId);
    if (!recording) throw new Error('Recording not found');
    
    await this.update(recordingId, {
      steps: [...recording.steps, step]
    });
  }
  
  /**
   * Update a step in a recording
   */
  static async updateStep(
    recordingId: number, 
    stepId: string, 
    changes: Partial<Step>
  ): Promise<void> {
    const recording = await this.getById(recordingId);
    if (!recording) throw new Error('Recording not found');
    
    const steps = recording.steps.map(step =>
      step.id === stepId ? { ...step, ...changes } : step
    );
    
    await this.update(recordingId, { steps });
  }
  
  /**
   * Delete a step from a recording
   */
  static async deleteStep(recordingId: number, stepId: string): Promise<void> {
    const recording = await this.getById(recordingId);
    if (!recording) throw new Error('Recording not found');
    
    const steps = recording.steps.filter(step => step.id !== stepId);
    
    await this.update(recordingId, { steps });
  }
  
  /**
   * Update loop start index
   */
  static async setLoopStart(recordingId: number, index: number): Promise<void> {
    await this.update(recordingId, { loopStartIndex: index });
  }
  
  /**
   * Update global delay
   */
  static async setGlobalDelay(recordingId: number, delayMs: number): Promise<void> {
    await this.update(recordingId, { globalDelayMs: delayMs });
  }
  
  /**
   * Update step delay
   */
  static async setStepDelay(
    recordingId: number, 
    stepId: string, 
    delaySeconds: number
  ): Promise<void> {
    await this.updateStep(recordingId, stepId, { delaySeconds });
  }
  
  /**
   * Update conditional defaults
   */
  static async setConditionalDefaults(
    recordingId: number,
    defaults: { searchTerms: string[]; timeoutSeconds: number }
  ): Promise<void> {
    await this.update(recordingId, { conditionalDefaults: defaults });
  }
  
  /**
   * Save CSV mappings and data
   */
  static async saveCSVData(
    recordingId: number,
    parsedFields: ParsedField[],
    csvData: Record<string, string>[]
  ): Promise<void> {
    await this.update(recordingId, { parsedFields, csvData });
  }
}
```

### TestRun Repository

```typescript
// src/lib/repositories/testRunRepository.ts

import { db } from '../background/indexedDB';
import { TestRun, LogEntry } from '../types';

export class TestRunRepository {
  
  /**
   * Get all test runs for a recording
   */
  static async getByRecording(recordingId: number): Promise<TestRun[]> {
    return db.testRuns
      .where('recordingId')
      .equals(recordingId)
      .reverse()
      .sortBy('createdAt');
  }
  
  /**
   * Get all test runs for a project
   */
  static async getByProject(projectId: number): Promise<TestRun[]> {
    return db.testRuns
      .where('projectId')
      .equals(projectId)
      .reverse()
      .sortBy('createdAt');
  }
  
  /**
   * Create a new test run
   */
  static async create(testRun: Omit<TestRun, 'id'>): Promise<number> {
    return db.testRuns.add({
      ...testRun,
      startTime: new Date(),
      status: 'pending',
      logs: []
    });
  }
  
  /**
   * Update test run status
   */
  static async updateStatus(id: number, status: TestRunStatus): Promise<void> {
    const updates: Partial<TestRun> = { status };
    
    if (status === 'completed' || status === 'failed' || status === 'stopped') {
      updates.endTime = new Date();
    }
    
    await db.testRuns.update(id, updates);
  }
  
  /**
   * Add a log entry
   */
  static async addLog(id: number, entry: LogEntry): Promise<void> {
    const testRun = await db.testRuns.get(id);
    if (!testRun) throw new Error('TestRun not found');
    
    await db.testRuns.update(id, {
      logs: [...testRun.logs, { ...entry, timestamp: new Date() }]
    });
  }
  
  /**
   * Update statistics
   */
  static async updateStats(
    id: number, 
    stats: Partial<Pick<TestRun, 
      'successfulRows' | 'failedRows' | 
      'successfulSteps' | 'failedSteps' |
      'conditionalButtonsClicked' | 'visionStepsExecuted'
    >>
  ): Promise<void> {
    await db.testRuns.update(id, stats);
  }
  
  /**
   * Delete a test run
   */
  static async delete(id: number): Promise<void> {
    await db.testRuns.delete(id);
  }
}
```

---

## DATA VALIDATION

### Step Validation

```typescript
// src/lib/validation/stepValidation.ts

import { Step, StepEventType } from '../types';

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateStep(step: Step): ValidationResult {
  const errors: string[] = [];
  
  // Required fields
  if (!step.id) {
    errors.push('Step ID is required');
  }
  
  if (!step.label || step.label.trim() === '') {
    errors.push('Step label is required');
  }
  
  if (!step.event) {
    errors.push('Step event type is required');
  }
  
  // Event-specific validation
  switch (step.event) {
    case 'open':
      if (!step.url) {
        errors.push('URL is required for open events');
      }
      break;
      
    case 'input':
      if (step.recordedVia === 'dom' && !step.selector && !step.xpath) {
        errors.push('Selector or XPath is required for DOM input events');
      }
      if (step.recordedVia === 'vision' && !step.coordinates) {
        errors.push('Coordinates are required for Vision input events');
      }
      break;
      
    case 'click':
      if (step.recordedVia === 'dom' && !step.selector && !step.xpath) {
        errors.push('Selector or XPath is required for DOM click events');
      }
      if (step.recordedVia === 'vision' && !step.coordinates) {
        errors.push('Coordinates are required for Vision click events');
      }
      break;
      
    case 'dropdown':
      if (!step.conditionalConfig?.dropdownOption) {
        errors.push('Dropdown option is required for dropdown events');
      }
      break;
      
    case 'conditional-click':
      if (!step.conditionalConfig) {
        errors.push('Conditional config is required for conditional-click events');
      } else {
        if (!step.conditionalConfig.searchTerms?.length) {
          errors.push('At least one search term is required');
        }
        if (step.conditionalConfig.timeoutSeconds <= 0) {
          errors.push('Timeout must be greater than 0');
        }
      }
      break;
  }
  
  // Delay validation
  if (step.delaySeconds !== undefined && step.delaySeconds < 0) {
    errors.push('Delay cannot be negative');
  }
  
  // Vision data validation
  if (step.recordedVia === 'vision') {
    if (step.coordinates) {
      if (step.coordinates.x < 0 || step.coordinates.y < 0) {
        errors.push('Coordinates cannot be negative');
      }
      if (step.coordinates.width <= 0 || step.coordinates.height <= 0) {
        errors.push('Dimensions must be positive');
      }
    }
    if (step.confidenceScore !== undefined) {
      if (step.confidenceScore < 0 || step.confidenceScore > 100) {
        errors.push('Confidence score must be between 0 and 100');
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

### Recording Validation

```typescript
// src/lib/validation/recordingValidation.ts

import { Recording } from '../types';
import { validateStep } from './stepValidation';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  stepErrors: Map<string, string[]>;
}

export function validateRecording(recording: Recording): ValidationResult {
  const errors: string[] = [];
  const stepErrors = new Map<string, string[]>();
  
  // Required fields
  if (!recording.name || recording.name.trim() === '') {
    errors.push('Recording name is required');
  }
  
  if (!recording.projectId) {
    errors.push('Project ID is required');
  }
  
  // Steps validation
  if (!recording.steps || recording.steps.length === 0) {
    errors.push('At least one step is required');
  } else {
    recording.steps.forEach((step, index) => {
      const result = validateStep(step);
      if (!result.valid) {
        stepErrors.set(step.id || `step-${index}`, result.errors);
      }
    });
  }
  
  // Loop start validation
  if (recording.loopStartIndex < 0) {
    errors.push('Loop start index cannot be negative');
  }
  if (recording.loopStartIndex >= recording.steps.length) {
    errors.push('Loop start index exceeds number of steps');
  }
  
  // Delay validation
  if (recording.globalDelayMs < 0) {
    errors.push('Global delay cannot be negative');
  }
  
  // Conditional defaults validation
  if (recording.conditionalDefaults) {
    if (recording.conditionalDefaults.timeoutSeconds <= 0) {
      errors.push('Default timeout must be greater than 0');
    }
  }
  
  return {
    valid: errors.length === 0 && stepErrors.size === 0,
    errors,
    stepErrors
  };
}
```

---

## DATA MIGRATION

### Migration from Version 1 to Version 2

```typescript
// src/lib/migrations/v1ToV2.ts

import { db } from '../background/indexedDB';

export async function migrateV1ToV2(): Promise<void> {
  console.log('Starting migration from v1 to v2...');
  
  // Migrate recordings
  const recordings = await db.recordings.toArray();
  
  for (const recording of recordings) {
    const updates: Partial<Recording> = {};
    
    // Add new fields with defaults
    if (recording.loopStartIndex === undefined) {
      updates.loopStartIndex = 0;
    }
    
    if (recording.globalDelayMs === undefined) {
      updates.globalDelayMs = 0;
    }
    
    if (!recording.conditionalDefaults) {
      updates.conditionalDefaults = {
        searchTerms: ['Allow', 'Keep'],
        timeoutSeconds: 120
      };
    }
    
    // Migrate steps
    if (recording.steps) {
      updates.steps = recording.steps.map(step => ({
        ...step,
        recordedVia: step.recordedVia ?? 'dom'
      }));
    }
    
    // Apply updates
    if (Object.keys(updates).length > 0) {
      await db.recordings.update(recording.id!, updates);
    }
  }
  
  console.log(`Migrated ${recordings.length} recordings to v2`);
}
```

---

## SAMPLE DATA

### Sample Recording with All Features

```typescript
const sampleRecording: Recording = {
  id: 1,
  projectId: 1,
  name: 'Copilot Automation with Approvals',
  description: 'Automates Copilot prompts with approval handling',
  startUrl: 'https://claude.ai/chat',
  createdAt: new Date('2025-12-01T10:00:00Z'),
  updatedAt: new Date('2025-12-01T12:00:00Z'),
  
  // Loop configuration
  loopStartIndex: 2,  // Loop starts at step 3 (0-indexed)
  
  // Delay configuration
  globalDelayMs: 1000,  // 1 second after each step
  
  // Conditional defaults
  conditionalDefaults: {
    searchTerms: ['Allow', 'Keep', 'Continue'],
    timeoutSeconds: 120
  },
  
  // Steps
  steps: [
    // Step 1: Open page (DOM)
    {
      id: 'step-1',
      label: 'Open Claude',
      event: 'open',
      url: 'https://claude.ai/chat',
      recordedVia: 'dom',
      timestamp: 1701423600000
    },
    
    // Step 2: Login (DOM) - skipped in loop
    {
      id: 'step-2',
      label: 'Login Button',
      event: 'click',
      selector: '#login-button',
      xpath: '/html/body/div[1]/button',
      recordedVia: 'dom',
      timestamp: 1701423601000
    },
    
    // Step 3: Prompt input (Vision) - loop starts here
    {
      id: 'step-3',
      label: 'Write your prompt to Claude',
      event: 'input',
      value: 'continue',  // Will be replaced by CSV
      recordedVia: 'vision',
      coordinates: {
        x: 245,
        y: 380,
        width: 400,
        height: 32
      },
      ocrText: 'Message Claude...',
      confidenceScore: 87,
      timestamp: 1701423602000
    },
    
    // Step 4: Submit (DOM)
    {
      id: 'step-4',
      label: 'Send message',
      event: 'click',
      selector: 'button[aria-label="Send message"]',
      xpath: '/html/body/div[2]/div/div/div/div/div/button',
      recordedVia: 'dom',
      timestamp: 1701423603000
    },
    
    // Step 5: Wait for approvals (Conditional)
    {
      id: 'step-5',
      label: 'Handle Approvals',
      event: 'conditional-click',
      recordedVia: 'vision',
      delaySeconds: 300,  // Wait 5 minutes max
      conditionalConfig: {
        enabled: true,
        searchTerms: ['Allow', 'Keep'],
        timeoutSeconds: 120,
        pollIntervalMs: 1000,
        interactionType: 'click'
      },
      timestamp: 1701423604000
    }
  ],
  
  // CSV mappings
  parsedFields: [
    { field_name: 'prompt', inputvarfields: 'Write your prompt to Claude', mapped: true }
  ],
  
  // CSV data
  csvData: [
    { prompt: 'continue' },
    { prompt: 'explain this code' },
    { prompt: 'fix the bug' }
  ]
};
```

---

*End of Data Layer Specification*
