# SOURCE CODE ROLLUP

Generated: December 2, 2025

This document contains source code examples from key files to provide implementation context.

## Key Type Definitions

### Project Types (src/pages/content.tsx)

```typescript
export interface Project {
  id?: number;
  projectName: string;
  projectDescription: string;
  redirectUrl?: string;
  capturedFields?: Field[];
  isPublic?: boolean;
  bundleName?: string;
}

export interface Bundle {
  id?: number;
  bundleName: string;
  bundleDescription: string;
  csvColumns: string[];
  csvData?: string[][];
  projectId: number;
  projectName?: string;
  isPublic: boolean;
}

export interface Field {
  id: string;
  name: string;
  value?: string;
  order?: number;
  type?: string;
  xpath?: string;
  selector?: string;
  required?: boolean;
  csvColumn?: string;
  element?: HTMLElement;
  mappingId?: string;
}

export interface TestRun {
  id?: number;
  bundleId: number;
  projectId: number;
  bundleName: string;
  projectName: string;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  startTime: string;
  endTime?: string;
  status: "pending" | "running" | "completed" | "failed" | "partial";
  logs?: LogEntry[];
}

export interface LogEntry {
  timestamp: string;
  level: "info" | "error" | "warning" | "success";
  message: string;
  iteration?: number;
  details?: any;
}

export interface Step {
  id?: number;
  stepType: string;
  targetElement?: string;
  value?: string;
  timestamp?: number;
  xpath?: string;
  order?: number;
  url?: string;
  selector?: string;
}
```

### Content Script Types (src/contentScript/types.ts)

```typescript
export interface TestStep {
  type: "click" | "type" | "navigate" | "select" | "wait" | "submit" | "hover" | "scroll";
  selector?: string;
  xpath?: string;
  value?: string;
  url?: string;
  timestamp: number;
  targetElement?: {
    tagName: string;
    id?: string;
    className?: string;
    textContent?: string;
    attributes?: Record<string, string>;
  };
}

export interface RecordingSession {
  id: string;
  projectId: number;
  steps: TestStep[];
  startTime: number;
  endTime?: number;
  status: "recording" | "paused" | "completed";
}

export interface ElementInfo {
  xpath: string;
  cssSelector: string;
  tagName: string;
  id?: string;
  className?: string;
  textContent?: string;
  attributes: Record<string, string>;
}
```

## IndexedDB Configuration

### Database Schema (src/background/indexedDB.ts)

```typescript
import Dexie, { Table } from "dexie";

export interface IProject {
  id?: number;
  projectName: string;
  projectDescription: string;
  redirectUrl?: string;
  capturedFields?: IField[];
  isPublic?: boolean;
  bundleName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IBundle {
  id?: number;
  bundleName: string;
  bundleDescription: string;
  csvColumns: string[];
  csvData: string[][];
  projectId: number;
  projectName?: string;
  isPublic: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ITestRun {
  id?: number;
  bundleId: number;
  projectId: number;
  bundleName: string;
  projectName: string;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  startTime: string;
  endTime?: string;
  status: "pending" | "running" | "completed" | "failed" | "partial";
  logs: ILogEntry[];
}

class MuffinDatabase extends Dexie {
  projects!: Table<IProject>;
  bundles!: Table<IBundle>;
  testRuns!: Table<ITestRun>;

  constructor() {
    super("MuffinDB");
    this.version(1).stores({
      projects: "++id, projectName, isPublic",
      bundles: "++id, bundleName, projectId, isPublic",
      testRuns: "++id, bundleId, projectId, status"
    });
  }
}

export const db = new MuffinDatabase();
```

## Chrome Storage Helper

### StorageHelper (src/common/helpers/StorageHelper.ts)

```typescript
export class StorageHelper {
  static async get<T>(key: string): Promise<T | undefined> {
    return new Promise((resolve) => {
      chrome.storage.sync.get([key], (result) => {
        if (chrome.runtime.lastError) {
          console.error("Storage get error:", chrome.runtime.lastError);
          resolve(undefined);
          return;
        }
        resolve(result[key] as T | undefined);
      });
    });
  }

  static async set<T>(key: string, value: T): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
          console.error("Storage set error:", chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }
        resolve();
      });
    });
  }

  static async remove(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.remove([key], () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve();
      });
    });
  }

  static async clear(): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.clear(() => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve();
      });
    });
  }
}
```

## Utility Functions

### Tailwind Class Merging (src/lib/utils.ts)

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Extension URL Helper (src/utils.ts)

```typescript
export const createPageUrl = (page: string): string => {
  return chrome.runtime.getURL(`${page}.html`);
};
```

## Background Service Worker

### Message Router Pattern (src/background/background.ts - excerpt)

```typescript
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Project operations
  if (message.type === "GET_PROJECTS") {
    db.projects.toArray().then(projects => {
      sendResponse({ success: true, data: projects });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep channel open for async
  }

  if (message.type === "SAVE_PROJECT") {
    const project = message.data;
    db.projects.put(project).then(id => {
      sendResponse({ success: true, data: { id } });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }

  if (message.type === "DELETE_PROJECT") {
    db.projects.delete(message.id).then(() => {
      sendResponse({ success: true });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }

  // Bundle operations
  if (message.type === "GET_BUNDLES") {
    db.bundles.toArray().then(bundles => {
      sendResponse({ success: true, data: bundles });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }

  if (message.type === "SAVE_BUNDLE") {
    const bundle = message.data;
    db.bundles.put(bundle).then(id => {
      sendResponse({ success: true, data: { id } });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }

  // Test run operations
  if (message.type === "SAVE_TEST_RUN") {
    const testRun = message.data;
    db.testRuns.put(testRun).then(id => {
      sendResponse({ success: true, data: { id } });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }

  if (message.type === "GET_TEST_RUNS") {
    db.testRuns.toArray().then(testRuns => {
      sendResponse({ success: true, data: testRuns });
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
});
```

## Redux Store Configuration

### Store Setup (src/redux/store.ts)

```typescript
import { configureStore } from "@reduxjs/toolkit";
import themeReducer from "./slices/themeSlice";
import headerReducer from "./slices/headerSlice";

export const store = configureStore({
  reducer: {
    theme: themeReducer,
    header: headerReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### Theme Slice (src/redux/slices/themeSlice.ts)

```typescript
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type Theme = "light" | "dark" | "system";

interface ThemeState {
  theme: Theme;
}

const initialState: ThemeState = {
  theme: "system",
};

const themeSlice = createSlice({
  name: "theme",
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<Theme>) => {
      state.theme = action.payload;
    },
  },
});

export const { setTheme } = themeSlice.actions;
export default themeSlice.reducer;
```

## React Router Configuration

### Routes (src/routes/index.tsx)

```typescript
import { createHashRouter } from "react-router-dom";
import Dashboard from "../pages/content";
import RecorderPage from "../pages/recorderPage";
import TestRunnerPage from "../pages/testRunnerPage";
import FieldMapperPage from "../pages/fieldMapperPage";

export const router = createHashRouter([
  {
    path: "/",
    element: <Dashboard />,
  },
  {
    path: "/recorder",
    element: <RecorderPage />,
  },
  {
    path: "/test-runner",
    element: <TestRunnerPage />,
  },
  {
    path: "/field-mapper",
    element: <FieldMapperPage />,
  },
]);
```

## Build Configuration

### Vite Config for UI (vite.config.ts - excerpt)

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "release",
    rollupOptions: {
      input: {
        index: resolve(__dirname, "public/index.html"),
        pages: resolve(__dirname, "public/pages.html"),
        popup: resolve(__dirname, "public/popup.html"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        assetFileNames: "[name].[ext]",
      },
    },
  },
});
```

### Vite Config for Background (vite.config.bg.ts - excerpt)

```typescript
import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    outDir: "release",
    lib: {
      entry: resolve(__dirname, "src/background/background.ts"),
      formats: ["es"],
      fileName: () => "background.js",
    },
    rollupOptions: {
      output: {
        format: "es",
      },
    },
  },
});
```

## Phase 3 Vision Types (Specification-Defined)

### Vision Engine Types (from FND-004 spec)

```typescript
// Note: These are SPECIFICATION-DEFINED types from Phase 3
// Implementation is pending

interface VisionConfig {
  confidenceThreshold: number;      // Default: 0.6
  pollIntervalMs: number;            // Default: 1000
  scrollRetries: number;             // Default: 3
  useSIMD: boolean;                  // Default: true
  language: string;                  // Default: 'eng'
}

interface TextResult {
  text: string;
  confidence: number;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
  };
}

interface ConditionalConfig {
  enabled: boolean;
  searchTerms: string[];             // ["Allow", "Keep", "Continue"]
  timeoutSeconds: number;            // Default: 120
  pollIntervalMs: number;            // Default: 1000
  interactionType: 'click' | 'type';
}

type RecordedVia = 'dom' | 'vision';

interface StepCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Extended Step interface (Phase 3)
interface Step {
  // Existing fields
  id?: number;
  stepType: string;
  targetElement?: string;
  value?: string;
  timestamp?: number;
  xpath?: string;
  order?: number;
  url?: string;
  selector?: string;
  
  // Phase 3 additions
  recordedVia: RecordedVia;          // 'dom' or 'vision'
  coordinates?: StepCoordinates;     // If recordedVia === 'vision'
  ocrText?: string;                  // Matched OCR text
  confidenceScore?: number;          // OCR confidence
  delaySeconds?: number;             // Per-step delay
  conditionalConfig?: ConditionalConfig | null;
}

// Extended Recording interface (Phase 3)
interface Recording {
  id?: number;
  projectId: number;
  steps: Step[];
  schemaVersion: 3;                  // Phase 3 schema
  loopStartIndex: number;            // Default: 0
  globalDelayMs: number;             // Default: 0
  conditionalDefaults: {
    timeoutSeconds: number;
    pollIntervalMs: number;
    confidenceThreshold: number;
  };
  parsedFields?: ParsedField[];
  csvData?: string[][];
}
```

### Vision Content Handler Types (from INT-001 to INT-005 specs)

```typescript
// Vision message types
type VisionMessageType =
  | 'VISION_CLICK'
  | 'VISION_TYPE'
  | 'VISION_KEY'
  | 'VISION_SCROLL'
  | 'VISION_GET_ELEMENT';

interface VisionClickMessage {
  type: 'VISION_CLICK';
  x: number;
  y: number;
}

interface VisionTypeMessage {
  type: 'VISION_TYPE';
  text: string;
}

interface VisionKeyMessage {
  type: 'VISION_KEY';
  key: string;
  modifiers?: {
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    metaKey?: boolean;
  };
}

interface VisionScrollMessage {
  type: 'VISION_SCROLL';
  direction: 'up' | 'down';
  amount?: number;  // Default: 500px
}

interface VisionGetElementMessage {
  type: 'VISION_GET_ELEMENT';
  x: number;
  y: number;
}
```

---

**Last Updated:** December 2, 2025  
**Status:** Phase 3 specifications complete, implementation pending  
**Schema Version:** Current v1, Phase 3 targeting v3
