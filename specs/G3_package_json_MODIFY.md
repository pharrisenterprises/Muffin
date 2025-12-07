# package.json Modifications Specification

**File ID:** G3  
**File Path:** `package.json`  
**Status:** MODIFY  
**Priority:** P0

---

## Purpose

Modify package.json to add new dependencies required for Phase 3 multi-layer recording and CDP-based playback. Includes Tesseract.js for OCR, additional TypeScript types for Chrome APIs, build tool updates, and development dependencies. Ensures all Phase 3 services have required npm packages available.

---

## Current State Analysis

The existing package.json likely has:
- React and React DOM
- TypeScript
- Build tools (webpack or vite)
- Chrome extension types
- Basic utility libraries

---

## Required Modifications

### 1. New Production Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "tesseract.js": "^5.0.4",
    "idb": "^7.1.1",
    "uuid": "^9.0.0"
  }
}
```

#### Dependency Details

| Package | Version | Purpose | Used By |
|---------|---------|---------|---------|
| `react` | ^18.2.0 | UI framework | All pages and components |
| `react-dom` | ^18.2.0 | React DOM renderer | Popup, content script UI |
| `tesseract.js` | ^5.0.4 | OCR text recognition | VisionService |
| `idb` | ^7.1.1 | IndexedDB promise wrapper | TelemetryLogger |
| `uuid` | ^9.0.0 | Unique ID generation | Recording, telemetry |

---

### 2. New Development Dependencies

```json
{
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/chrome": "^0.0.260",
    "@types/uuid": "^9.0.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "vite-plugin-static-copy": "^1.0.0",
    "eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "prettier": "^3.2.0"
  }
}
```

#### Dev Dependency Details

| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | ^5.3.0 | TypeScript compiler |
| `@types/react` | ^18.2.0 | React type definitions |
| `@types/react-dom` | ^18.2.0 | React DOM type definitions |
| `@types/chrome` | ^0.0.260 | Chrome extension API types |
| `@types/uuid` | ^9.0.0 | UUID type definitions |
| `vite` | ^5.0.0 | Build tool |
| `@vitejs/plugin-react` | ^4.2.0 | React plugin for Vite |
| `vite-plugin-static-copy` | ^1.0.0 | Copy static assets |
| `eslint` | ^8.56.0 | Linting |
| `@typescript-eslint/*` | ^6.0.0 | TypeScript ESLint support |
| `prettier` | ^3.2.0 | Code formatting |

---

### 3. Scripts Updates

```json
{
  "scripts": {
    "dev": "vite build --watch --mode development",
    "build": "tsc && vite build",
    "build:prod": "tsc && vite build --mode production",
    "preview": "vite preview",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "format": "prettier --write src/**/*.{ts,tsx,css,json}",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist",
    "test": "vitest run",
    "test:watch": "vitest",
    "package": "npm run build:prod && cd dist && zip -r ../muffin-extension.zip ."
  }
}
```

#### Script Details

| Script | Purpose |
|--------|---------|
| `dev` | Development build with watch mode |
| `build` | Production build with type checking |
| `build:prod` | Production build with optimizations |
| `lint` | Run ESLint on source files |
| `lint:fix` | Auto-fix linting issues |
| `format` | Format code with Prettier |
| `typecheck` | Type check without emitting |
| `clean` | Remove dist directory |
| `test` | Run tests once |
| `test:watch` | Run tests in watch mode |
| `package` | Build and zip for distribution |

---

### 4. Complete package.json

```json
{
  "name": "muffin-extension",
  "version": "2.0.0",
  "description": "AI-powered browser automation with 7-tier fallback strategy system",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite build --watch --mode development",
    "build": "tsc && vite build",
    "build:prod": "tsc && vite build --mode production",
    "preview": "vite preview",
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,css,json}\"",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist",
    "test": "vitest run",
    "test:watch": "vitest",
    "package": "npm run build:prod && cd dist && zip -r ../muffin-extension.zip ."
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "tesseract.js": "^5.0.4",
    "idb": "^7.1.1",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/chrome": "^0.0.260",
    "@types/uuid": "^9.0.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "vite-plugin-static-copy": "^1.0.0",
    "eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint-plugin-react": "^7.33.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "prettier": "^3.2.0",
    "vitest": "^1.2.0"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "browserslist": [
    "last 2 Chrome versions"
  ]
}
```

---

### 5. Tesseract.js Configuration Notes

#### Bundle Size Considerations
Tesseract.js is large (~2MB for worker + WASM + language data). Options:

1. **Lazy Loading (Recommended)**
   - Load Tesseract only when Vision layer is used
   - VisionService handles initialization on demand

2. **CDN Loading (Not for Extensions)**
   - Not viable for extensions due to CSP

3. **Bundled (Current Approach)**
   - Include all files in extension package
   - Larger extension size but reliable offline use

#### Required Files from tesseract.js
```
node_modules/tesseract.js/dist/worker.min.js
node_modules/tesseract.js-core/tesseract-core.wasm.js
```

#### Language Data
```
node_modules/tesseract.js/lang-data/eng.traineddata.gz
```

For additional languages, add to web_accessible_resources:
```
spa.traineddata.gz  // Spanish
fra.traineddata.gz  // French
deu.traineddata.gz  // German
```

---

### 6. IndexedDB Wrapper (idb)

The `idb` package provides a promise-based wrapper around IndexedDB:

```typescript
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface TelemetryDB extends DBSchema {
  events: {
    key: string;
    value: TelemetryEvent;
    indexes: { 'by-runId': string; 'by-timestamp': number };
  };
  runs: {
    key: string;
    value: RunSummary;
  };
}

const db = await openDB<TelemetryDB>('muffin_telemetry', 1, {
  upgrade(db) {
    const eventStore = db.createObjectStore('events', { keyPath: 'id' });
    eventStore.createIndex('by-runId', 'runId');
    eventStore.createIndex('by-timestamp', 'timestamp');
    db.createObjectStore('runs', { keyPath: 'runId' });
  }
});
```

---

### 7. UUID Generation

The `uuid` package provides secure UUID generation:

```typescript
import { v4 as uuidv4 } from 'uuid';

const sessionId = uuidv4();  // e.g., "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"
```

Used for:
- Session IDs
- Action IDs
- Run IDs
- Telemetry event IDs

---

## Installation Commands

### Fresh Install
```bash
npm install
```

### Add New Dependencies Only
```bash
# Production
npm install tesseract.js idb uuid

# Development
npm install -D @types/uuid vite-plugin-static-copy vitest
```

### Update Existing
```bash
npm update
```

---

## Lock File

After modifying package.json, regenerate lock file:

```bash
# npm
rm package-lock.json
npm install

# or yarn
rm yarn.lock
yarn install

# or pnpm
rm pnpm-lock.yaml
pnpm install
```

---

## Acceptance Criteria

- [ ] All production dependencies listed
- [ ] All dev dependencies listed
- [ ] Version set to 2.0.0
- [ ] Scripts for build, lint, test defined
- [ ] Type definitions for all packages
- [ ] Engine requirement (Node 18+) specified
- [ ] `npm install` completes without errors
- [ ] `npm run build` succeeds
- [ ] `npm run typecheck` passes
- [ ] Tesseract.js imports work
- [ ] IDB imports work
- [ ] UUID imports work

---

## Edge Cases

1. **Conflicting peer dependencies**: Check compatibility
2. **Tesseract.js version mismatch**: Pin exact version
3. **Chrome types outdated**: Update @types/chrome
4. **Node version too old**: Enforce with engines
5. **Missing optional deps**: Handle gracefully
6. **Network issues during install**: Use cache
7. **Disk space for Tesseract**: ~100MB node_modules
8. **CI/CD caching**: Cache node_modules properly
9. **Platform-specific deps**: None expected
10. **Security vulnerabilities**: Run npm audit

---

## Estimated Lines

50-70 lines (JSON)
