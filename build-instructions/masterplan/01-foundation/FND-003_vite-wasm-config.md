# FND-003: VITE WASM CONFIGURATION SPECIFICATION

> **Build Card:** FND-003  
> **Category:** Foundation / Architecture  
> **Dependencies:** FND-001 (Tesseract.js must be installed)  
> **Risk Level:** Low  
> **Estimated Lines:** ~500

---

## 1. PURPOSE

This specification defines the Vite build configuration required to properly handle Tesseract.js WebAssembly (WASM) assets in the Muffin Lite Chrome extension. Without proper configuration, the build process will either:

1. Fail to include WASM files in the output
2. Incorrectly bundle WASM as JavaScript (causing runtime failures)
3. Break WASM file paths in the production build

Tesseract.js relies on WASM binaries for OCR processing. These binaries must be:
- Copied to the build output directory
- Accessible at runtime via correct paths
- Not transformed or bundled by Vite's JavaScript processing

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| Current vite.config.ts | `/vite.config.ts` | Existing build configuration |
| Current vite.config.bg.ts | `/vite.config.bg.ts` | Background script config (if separate) |
| Tesseract.js docs | npm package | WASM loading behavior |
| Architecture Spec | `/future-spec/04_architecture.md` | File structure requirements |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `vite.config.ts` | MODIFY | Add WASM handling configuration |
| `vite.config.bg.ts` | MODIFY | Add WASM exclusion (if applicable) |

### Build Output Changes

| Output Location | Contents |
|-----------------|----------|
| `dist/tesseract-core.wasm` | Main WASM binary |
| `dist/tesseract-core-simd.wasm` | SIMD-optimized WASM binary |
| `dist/eng.traineddata` | English language model |

---

## 4. DETAILED SPECIFICATION

### 4.1 WASM Loading Strategy

Tesseract.js v5.x supports two WASM loading strategies:

| Strategy | Description | Pros | Cons |
|----------|-------------|------|------|
| CDN (Default) | Load from unpkg/jsdelivr | No config needed | Requires internet, CORS issues |
| Local Bundle | Bundle with extension | Works offline, no CORS | Requires Vite config |

**Selected Strategy: Local Bundle**

For a Chrome extension, local bundling is required because:
1. Extensions should work offline
2. CDN loading may be blocked by Content Security Policy
3. Users expect bundled, self-contained extensions

### 4.2 Vite Configuration Changes

#### 4.2.1 Install Required Plugin

First, install the vite-plugin-static-copy plugin:

```bash
npm install vite-plugin-static-copy --save-dev
```

This plugin copies static assets (WASM files) to the build output without transformation.

#### 4.2.2 Main Configuration Update

Update `vite.config.ts` with the following changes:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          // Copy Tesseract.js WASM files
          src: 'node_modules/tesseract.js-core/tesseract-core*.wasm',
          dest: '.'
        },
        {
          // Copy language trained data
          src: 'node_modules/tesseract.js/lang-data/eng.traineddata',
          dest: '.'
        }
      ]
    })
  ],
  
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        pages: path.resolve(__dirname, 'pages.html'),
        popup: path.resolve(__dirname, 'popup.html'),
      },
      output: {
        // Ensure WASM files are not processed as JS
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.wasm')) {
            return '[name][extname]';
          }
          if (assetInfo.name?.endsWith('.traineddata')) {
            return '[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    },
    // Ensure WASM is treated as asset, not code
    assetsInlineLimit: 0,
  },
  
  optimizeDeps: {
    // Exclude tesseract.js from dependency optimization
    exclude: ['tesseract.js']
  },
  
  // Configure WASM MIME type for dev server
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  }
});
```

### 4.3 Configuration Explanation

#### 4.3.1 viteStaticCopy Plugin

```typescript
viteStaticCopy({
  targets: [
    {
      src: 'node_modules/tesseract.js-core/tesseract-core*.wasm',
      dest: '.'
    },
    {
      src: 'node_modules/tesseract.js/lang-data/eng.traineddata',
      dest: '.'
    }
  ]
})
```

**Purpose:** Copies WASM and language files from node_modules to build output

**Files Copied:**
- `tesseract-core.wasm` - Standard WASM binary (~2MB)
- `tesseract-core-simd.wasm` - SIMD-optimized binary (~2MB)
- `tesseract-core-simd-lstm.wasm` - LSTM model binary (~1MB)
- `eng.traineddata` - English language model (~1MB)

#### 4.3.2 assetFileNames Configuration

```typescript
assetFileNames: (assetInfo) => {
  if (assetInfo.name?.endsWith('.wasm')) {
    return '[name][extname]';
  }
  if (assetInfo.name?.endsWith('.traineddata')) {
    return '[name][extname]';
  }
  return 'assets/[name]-[hash][extname]';
}
```

**Purpose:** Prevents Vite from adding hash to WASM filenames

**Why Needed:** Tesseract.js expects specific filenames. Adding hashes breaks loading:
- ❌ `tesseract-core-abc123.wasm` (won't load)
- ✅ `tesseract-core.wasm` (loads correctly)

#### 4.3.3 assetsInlineLimit

```typescript
assetsInlineLimit: 0
```

**Purpose:** Prevents Vite from inlining small assets as base64

**Why Needed:** WASM files must remain as separate binary files, never inlined as JavaScript strings.

#### 4.3.4 optimizeDeps.exclude

```typescript
optimizeDeps: {
  exclude: ['tesseract.js']
}
```

**Purpose:** Prevents Vite from pre-bundling tesseract.js during development

**Why Needed:** Pre-bundling can break dynamic WASM imports and worker creation.

#### 4.3.5 Server Headers (Development)

```typescript
server: {
  headers: {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp'
  }
}
```

**Purpose:** Enable SharedArrayBuffer for WASM threading in development

**Why Needed:** Tesseract.js can use multi-threading via SharedArrayBuffer, which requires these CORS headers.

### 4.4 Background Script Configuration

If using a separate `vite.config.bg.ts` for background script builds, add WASM exclusion:

```typescript
// vite.config.bg.ts
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/background/background.ts'),
      name: 'background',
      formats: ['iife'],
      fileName: () => 'background.js'
    },
    rollupOptions: {
      external: ['tesseract.js'],
      output: {
        globals: {
          'tesseract.js': 'Tesseract'
        }
      }
    },
    outDir: 'dist',
    emptyOutDir: false
  }
});
```

**Note:** The background service worker typically doesn't need direct Tesseract.js access. OCR runs in the extension page context, not the service worker.

### 4.5 Tesseract Worker Path Configuration

At runtime, configure Tesseract.js to find WASM files in the extension directory:

```typescript
// src/lib/visionEngine.ts (preview - full implementation in ENG-002)
import Tesseract from 'tesseract.js';

const getWorkerPath = () => {
  // In Chrome extension context, use extension URL
  if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
    return {
      workerPath: chrome.runtime.getURL('tesseract-worker.min.js'),
      corePath: chrome.runtime.getURL('tesseract-core.wasm'),
      langPath: chrome.runtime.getURL(''),
    };
  }
  // Fallback for development
  return {};
};

export async function createTesseractWorker() {
  const paths = getWorkerPath();
  
  const worker = await Tesseract.createWorker('eng', 1, {
    ...paths,
    logger: (m) => console.log('[Tesseract]', m.status, m.progress),
  });
  
  return worker;
}
```

### 4.6 Alternative: Manual Copy Script

If vite-plugin-static-copy causes issues, use a manual copy script:

```json
// package.json
{
  "scripts": {
    "copy:wasm": "node scripts/copy-wasm.js",
    "build": "npm run copy:wasm && vite build",
    "build:all": "npm run build && npm run build:bg"
  }
}
```

```javascript
// scripts/copy-wasm.js
const fs = require('fs');
const path = require('path');

const filesToCopy = [
  {
    src: 'node_modules/tesseract.js-core/tesseract-core.wasm',
    dest: 'dist/tesseract-core.wasm'
  },
  {
    src: 'node_modules/tesseract.js-core/tesseract-core-simd.wasm',
    dest: 'dist/tesseract-core-simd.wasm'
  },
  {
    src: 'node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm',
    dest: 'dist/tesseract-core-simd-lstm.wasm'
  },
  {
    src: 'node_modules/tesseract.js/lang-data/eng.traineddata',
    dest: 'dist/eng.traineddata'
  }
];

// Ensure dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
}

filesToCopy.forEach(({ src, dest }) => {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`✓ Copied ${path.basename(src)} to dist/`);
  } else {
    console.warn(`✗ Source not found: ${src}`);
  }
});

console.log('WASM copy complete.');
```

---

## 5. CODE EXAMPLES

### 5.1 Complete vite.config.ts

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/tesseract.js-core/tesseract-core*.wasm',
          dest: '.'
        },
        {
          src: 'node_modules/tesseract.js/lang-data/eng.traineddata',
          dest: '.'
        }
      ]
    })
  ],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        pages: path.resolve(__dirname, 'pages.html'),
        popup: path.resolve(__dirname, 'popup.html'),
      },
      output: {
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || '';
          if (name.endsWith('.wasm') || name.endsWith('.traineddata')) {
            return '[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      }
    },
    assetsInlineLimit: 0,
    sourcemap: process.env.NODE_ENV === 'development',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production',
      },
    },
  },
  
  optimizeDeps: {
    exclude: ['tesseract.js']
  },
  
  server: {
    port: 5173,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  }
});
```

### 5.2 Build Verification Script

```typescript
// scripts/verify-wasm-build.ts
import fs from 'fs';
import path from 'path';

const distDir = path.join(__dirname, '..', 'dist');

const requiredFiles = [
  'tesseract-core.wasm',
  'tesseract-core-simd.wasm',
  'eng.traineddata'
];

console.log('Verifying WASM build output...\n');

let allPresent = true;

requiredFiles.forEach(file => {
  const filePath = path.join(distDir, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`✓ ${file} (${sizeMB} MB)`);
  } else {
    console.log(`✗ ${file} - MISSING`);
    allPresent = false;
  }
});

console.log('\n' + (allPresent ? '✓ All WASM files present' : '✗ Some WASM files missing'));
process.exit(allPresent ? 0 : 1);
```

### 5.3 Runtime WASM Path Resolution

```typescript
// src/lib/wasmPaths.ts
export function getWasmPaths(): {
  workerPath: string;
  corePath: string;
  langPath: string;
} {
  // Chrome extension context
  if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
    return {
      workerPath: chrome.runtime.getURL('assets/tesseract-worker.min.js'),
      corePath: chrome.runtime.getURL('tesseract-core-simd.wasm'),
      langPath: chrome.runtime.getURL(''),
    };
  }
  
  // Development/test context
  return {
    workerPath: '/tesseract-worker.min.js',
    corePath: '/tesseract-core-simd.wasm',
    langPath: '/',
  };
}

export function isWasmSupported(): boolean {
  try {
    if (typeof WebAssembly === 'object' &&
        typeof WebAssembly.instantiate === 'function') {
      const module = new WebAssembly.Module(
        Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00)
      );
      return module instanceof WebAssembly.Module;
    }
  } catch (e) {
    // WASM not supported
  }
  return false;
}
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** `npm install vite-plugin-static-copy --save-dev` completes successfully
- [ ] **AC-2:** `vite.config.ts` includes viteStaticCopy plugin configuration
- [ ] **AC-3:** `npm run build` completes without WASM-related errors
- [ ] **AC-4:** `dist/` directory contains `tesseract-core.wasm` after build
- [ ] **AC-5:** `dist/` directory contains `tesseract-core-simd.wasm` after build
- [ ] **AC-6:** `dist/` directory contains `eng.traineddata` after build
- [ ] **AC-7:** WASM files have original names (no hash appended)
- [ ] **AC-8:** Extension loads in Chrome without WASM loading errors
- [ ] **AC-9:** Tesseract worker initializes successfully at runtime

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **WASM files must not be transformed** - They must be copied as binary, not processed
2. **Filenames must be preserved** - Tesseract.js expects specific filenames
3. **Files must be web-accessible** - Requires manifest.json web_accessible_resources (FND-002)
4. **No CDN fallback in production** - All assets must be bundled locally

### Patterns to Follow

1. **Static copy for binary assets** - Use vite-plugin-static-copy for WASM/binary files
2. **Exclude from optimization** - Prevent Vite from pre-bundling tesseract.js
3. **Conditional paths** - Use chrome.runtime.getURL in extension context

### Edge Cases

1. **SIMD not supported**
   - Tesseract.js falls back to non-SIMD WASM automatically
   - Both WASM variants must be present

2. **SharedArrayBuffer unavailable**
   - Threading falls back to single-threaded mode
   - Performance reduced but functionality preserved

3. **Development vs Production paths**
   - Use environment detection for path resolution
   - Vite dev server serves from root, production from dist/

---

## 8. VERIFICATION COMMANDS

```bash
# Install the static copy plugin
npm install vite-plugin-static-copy --save-dev

# Run build
npm run build

# Verify WASM files in output
ls -la dist/*.wasm
ls -la dist/*.traineddata

# Check file sizes (should be ~2MB for WASM, ~1MB for traineddata)
du -h dist/tesseract-core.wasm
du -h dist/tesseract-core-simd.wasm
du -h dist/eng.traineddata

# Verify no hash in filenames
ls dist/ | grep -E "tesseract.*[a-f0-9]{8}\.wasm" && echo "ERROR: Hash found in WASM filename" || echo "OK: No hash in WASM filenames"

# Load extension in Chrome and check console for WASM errors
# (Manual step - load unpacked extension and open DevTools)
```

---

## 9. ROLLBACK PROCEDURE

If configuration causes build failures:

```bash
# Restore previous config
git checkout HEAD~1 -- vite.config.ts

# Remove plugin if causing issues
npm uninstall vite-plugin-static-copy

# Rebuild with previous config
npm run build
```

---

## 10. TROUBLESHOOTING

### Issue: "Cannot find module 'vite-plugin-static-copy'"

**Cause:** Plugin not installed  
**Solution:** `npm install vite-plugin-static-copy --save-dev`

### Issue: WASM files not in dist/ after build

**Cause:** viteStaticCopy not configured correctly  
**Solution:** Verify src paths match actual node_modules structure

### Issue: "Failed to load WASM module" at runtime

**Cause:** WASM paths incorrect or files not web-accessible  
**Solution:** 
1. Check manifest.json has web_accessible_resources for *.wasm
2. Verify chrome.runtime.getURL returns correct paths

### Issue: Build fails with "Cannot bundle WASM"

**Cause:** Vite trying to process WASM as JavaScript  
**Solution:** Ensure optimizeDeps.exclude includes 'tesseract.js'

### Issue: WASM files have hash in filename

**Cause:** assetFileNames not configured correctly  
**Solution:** Verify the assetFileNames function checks for .wasm extension

### Issue: "SharedArrayBuffer is not defined"

**Cause:** Missing CORS headers in development  
**Solution:** Add server.headers configuration for COOP/COEP

---

## 11. REFERENCES

- [Vite Static Assets](https://vitejs.dev/guide/assets.html)
- [vite-plugin-static-copy](https://www.npmjs.com/package/vite-plugin-static-copy)
- [Tesseract.js WASM Loading](https://github.com/naptha/tesseract.js/blob/master/docs/local-installation.md)
- [Chrome Extension WASM](https://developer.chrome.com/docs/extensions/mv3/intro/mv3-migration/#wasm)

---

*End of Specification FND-003*
