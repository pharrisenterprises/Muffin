# tsconfig.json Specification

**File ID:** G5  
**File Path:** `tsconfig.json`  
**Status:** CREATE (or MODIFY if exists)  
**Priority:** P0

---

## Purpose

Configure TypeScript compiler for the Chrome extension with strict type checking, proper module resolution, path aliases matching Vite config, and Chrome extension-specific settings. Ensures type safety across all Phase 3 services, proper IDE support, and correct compilation output.

---

## Dependencies

### Enables
- Type checking for all TypeScript files
- IDE IntelliSense and autocompletion
- Path alias resolution
- Strict null checking

### Related Files
- `vite.config.ts`: Path aliases must match
- `package.json`: TypeScript version

---

## Complete Configuration

```json
{
  "compilerOptions": {
    // Language and Environment
    "target": "ESNext",
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "useDefineForClassFields": true,
    
    // Strict Type Checking
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    
    // Additional Checks
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": false,
    
    // Module Resolution
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@types/*": ["src/types/*"],
      "@services/*": ["src/background/services/*"],
      "@components/*": ["src/components/*"],
      "@pages/*": ["src/pages/*"],
      "@layers/*": ["src/contentScript/layers/*"]
    },
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    
    // Emit
    "declaration": false,
    "declarationMap": false,
    "sourceMap": true,
    "noEmit": true,
    "isolatedModules": true,
    
    // JSX
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    
    // Other
    "skipLibCheck": true,
    "allowJs": false,
    "types": ["chrome", "node"]
  },
  
  "include": [
    "src/**/*.ts",
    "src/**/*.tsx",
    "vite.config.ts"
  ],
  
  "exclude": [
    "node_modules",
    "dist",
    "**/*.test.ts",
    "**/*.spec.ts"
  ],
  
  "references": []
}
```

---

## Configuration Sections

### Language and Environment

```json
{
  "target": "ESNext",
  "lib": ["ESNext", "DOM", "DOM.Iterable"],
  "module": "ESNext",
  "moduleResolution": "bundler"
}
```

| Option | Value | Reason |
|--------|-------|--------|
| `target` | ESNext | Chrome supports latest JS |
| `lib` | ESNext, DOM | Browser APIs + modern JS |
| `module` | ESNext | ES modules for Vite |
| `moduleResolution` | bundler | Vite/Rollup resolution |

---

### Strict Type Checking

```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "strictFunctionTypes": true,
  "strictBindCallApply": true,
  "strictPropertyInitialization": true,
  "noImplicitThis": true,
  "alwaysStrict": true
}
```

All strict checks enabled for maximum type safety:
- No implicit `any` types
- Null/undefined must be explicitly handled
- Function parameter types strictly checked
- Class properties must be initialized

---

### Additional Checks

```json
{
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noImplicitReturns": true,
  "noFallthroughCasesInSwitch": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitOverride": true
}
```

| Option | Effect |
|--------|--------|
| `noUnusedLocals` | Error on unused variables |
| `noUnusedParameters` | Error on unused function parameters |
| `noImplicitReturns` | All code paths must return |
| `noFallthroughCasesInSwitch` | Require break/return in switch |
| `noUncheckedIndexedAccess` | Array access may return undefined |
| `noImplicitOverride` | Require `override` keyword |

---

### Path Aliases

```json
{
  "baseUrl": ".",
  "paths": {
    "@/*": ["src/*"],
    "@types/*": ["src/types/*"],
    "@services/*": ["src/background/services/*"],
    "@components/*": ["src/components/*"],
    "@pages/*": ["src/pages/*"],
    "@layers/*": ["src/contentScript/layers/*"]
  }
}
```

**Must match vite.config.ts aliases!**

Usage examples:
```typescript
// Instead of: import { FallbackChain } from '../../../types/strategy';
import { FallbackChain } from '@types/strategy';

// Instead of: import { CDPService } from '../services/CDPService';
import { CDPService } from '@services/CDPService';

// Instead of: import { DOMCapture } from '../layers/DOMCapture';
import { DOMCapture } from '@layers/DOMCapture';
```

---

### Module Resolution

```json
{
  "resolveJsonModule": true,
  "allowSyntheticDefaultImports": true,
  "esModuleInterop": true,
  "forceConsistentCasingInFileNames": true
}
```

| Option | Effect |
|--------|--------|
| `resolveJsonModule` | Import JSON files |
| `allowSyntheticDefaultImports` | Default import from CommonJS |
| `esModuleInterop` | Proper CommonJS interop |
| `forceConsistentCasingInFileNames` | Case-sensitive imports |

---

### Emit Configuration

```json
{
  "declaration": false,
  "declarationMap": false,
  "sourceMap": true,
  "noEmit": true,
  "isolatedModules": true
}
```

| Option | Value | Reason |
|--------|-------|--------|
| `noEmit` | true | Vite handles compilation |
| `isolatedModules` | true | Required for Vite/esbuild |
| `sourceMap` | true | Debug support |
| `declaration` | false | Not publishing types |

---

### JSX Configuration

```json
{
  "jsx": "react-jsx",
  "jsxImportSource": "react"
}
```

React 17+ automatic JSX transform - no need to import React in every file.

```typescript
// This works without: import React from 'react';
function Component() {
  return <div>Hello</div>;
}
```

---

### Type Definitions

```json
{
  "types": ["chrome", "node"]
}
```

Includes:
- `@types/chrome`: Chrome extension APIs
- `@types/node`: Node.js types (for build tools)

---

## Include/Exclude

### Include
```json
{
  "include": [
    "src/**/*.ts",
    "src/**/*.tsx",
    "vite.config.ts"
  ]
}
```

All TypeScript source files and build config.

### Exclude
```json
{
  "exclude": [
    "node_modules",
    "dist",
    "**/*.test.ts",
    "**/*.spec.ts"
  ]
}
```

Excludes dependencies, output, and test files (tests have separate config).

---

## Type Declaration Files

### Chrome Extension Types
The `@types/chrome` package provides types for:
- `chrome.runtime.*`
- `chrome.tabs.*`
- `chrome.storage.*`
- `chrome.debugger.*`

### Custom Type Declarations

Create `src/types/global.d.ts` for custom globals:

```typescript
// src/types/global.d.ts

// Environment variables
declare const __DEV__: boolean;

// Tesseract.js module augmentation
declare module 'tesseract.js' {
  export function createWorker(
    lang?: string,
    oem?: number,
    options?: Partial<WorkerOptions>
  ): Promise<Worker>;
  
  export interface Worker {
    recognize(image: ImageLike): Promise<RecognizeResult>;
    terminate(): Promise<void>;
  }
  
  export interface RecognizeResult {
    data: {
      text: string;
      confidence: number;
      blocks: Block[];
    };
  }
  
  // ... additional types
}

// Chrome debugger API extensions
declare namespace chrome.debugger {
  interface Debuggee {
    tabId?: number;
    extensionId?: string;
    targetId?: string;
  }
}

// IndexedDB extensions
interface IDBObjectStore {
  getAll(query?: IDBValidKey | IDBKeyRange, count?: number): IDBRequest<any[]>;
}
```

---

## Test Configuration

Create separate `tsconfig.test.json` for tests:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "types": ["chrome", "node", "vitest/globals"]
  },
  "include": [
    "src/**/*.ts",
    "src/**/*.tsx",
    "src/**/*.test.ts",
    "src/**/*.spec.ts",
    "tests/**/*.ts"
  ]
}
```

---

## VS Code Integration

### Settings (.vscode/settings.json)
```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

### Extensions Recommendations (.vscode/extensions.json)
```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss"
  ]
}
```

---

## Common Type Issues and Fixes

### 1. Chrome API Not Found
```typescript
// Error: Cannot find name 'chrome'
// Fix: Ensure @types/chrome is installed and "chrome" in types array
```

### 2. Implicit Any in Event Handlers
```typescript
// Error: Parameter 'e' implicitly has 'any' type
// Fix: Type the event
const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => { ... };
```

### 3. Object Index Access
```typescript
// Error: Element implicitly has 'any' type because expression...
// Fix: Use proper typing or type assertion
const value = obj[key as keyof typeof obj];
```

### 4. Null Checks
```typescript
// Error: Object is possibly 'null'
// Fix: Add null check or use optional chaining
const result = element?.textContent ?? '';
```

### 5. Async Function Return
```typescript
// Error: Function lacks ending return statement
// Fix: Ensure all paths return or add explicit return
async function fetch(): Promise<Data | null> {
  if (condition) return data;
  return null; // Must have this
}
```

---

## Acceptance Criteria

- [ ] All strict checks enabled
- [ ] Path aliases match vite.config.ts
- [ ] Chrome types available
- [ ] JSX configured for React 17+
- [ ] No emit (Vite handles build)
- [ ] Isolated modules enabled
- [ ] `npm run typecheck` passes with 0 errors
- [ ] VS Code IntelliSense works
- [ ] Path aliases resolve in IDE
- [ ] Chrome APIs have proper types

---

## Edge Cases

1. **Circular type references**: Use `type` instead of `interface`
2. **Missing return type**: Add explicit annotations
3. **Event handler types**: Use React event types
4. **Promise type inference**: Annotate async functions
5. **Index signatures**: Use `Record<K, V>` or mapped types
6. **Optional chaining with functions**: `obj?.method?.()`
7. **Type narrowing in closures**: Use type guards
8. **Generic constraints**: Specify properly
9. **Conditional types**: Test all branches
10. **Module augmentation**: Use `declare module`

---

## Estimated Lines

60-80 lines (JSON)
