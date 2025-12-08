# Build Pipeline Breakdown

## Purpose
**What it does:** Dual Vite build configuration that compiles the extension into two separate bundles: (1) React UI for popup/pages and (2) ES module service worker for background script. Handles multi-page HTML generation, content script bundling, and asset organization.

**Where it lives:**
- `vite.config.ts` - Main UI build (React + pages)
- `vite.config.bg.ts` - Background service worker build
- `scripts/postbuild.js` - Post-build manifest copying

**Why it exists:** Chrome Manifest V3 requires separate compilation for different extension contexts (UI pages, background worker, content scripts). Standard single-entry bundlers don't handle this complexity.

## Inputs
**Source Files:**
```
src/
├── main.tsx           → React app entry
├── background/
│   └── background.ts  → Service worker
├── contentScript/
│   ├── content.tsx    → Main content script
│   ├── page-interceptor.tsx → Injected script
│   └── replay.ts      → Google autocomplete handler
public/
├── index.html         → Dashboard page template
├── popup.html         → Extension popup template
├── pages.html         → Additional pages template
└── manifest.json      → Extension manifest
```

**Build Commands:**
```bash
npm run build         # Main UI build
npm run build:bg      # Background worker build
npm run postbuild     # Manifest copy
```

## Outputs
**Build Artifacts:**
```
dist/
├── index.html                 # Dashboard page
├── popup.html                 # Popup page
├── pages.html                 # Additional pages
├── manifest.json              # Extension manifest (copied)
├── js/
│   ├── main.js                # React UI bundle
│   ├── interceptor.js         # Page interceptor
│   └── replay.js              # Google autocomplete
├── css/
│   └── [name].css             # Extracted CSS
├── fonts/
│   └── *.woff2                # Font files
└── background/
    └── background.js          # Service worker (ES module)
```

## Internal Architecture

### Main UI Build (`vite.config.ts`)
```typescript
export default defineConfig({
  plugins: [
    react(), // React + JSX transform
    
    createHtmlPlugin({
      minify: true,
      pages: [
        {
          entry: "../src/main.tsx",
          filename: "index.html",
          template: "public/index.html"
        },
        {
          entry: "../src/main.tsx",
          filename: "popup.html",
          template: "public/popup.html"
        },
        {
          entry: "../src/main.tsx",
          filename: "pages.html",
          template: "public/pages.html"
        }
      ]
    }),
    
    viteStaticCopy({ targets: [] })
  ],
  
  build: {
    sourcemap: true,
    minify: "terser",
    terserOptions: {
      keep_classnames: true, // Preserve class names for debugging
      keep_fnames: true      // Preserve function names
    },
    
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "src/main.tsx"),
        interceptor: path.resolve(__dirname, "src/contentScript/page-interceptor.tsx"),
        replay: path.resolve(__dirname, "src/contentScript/replay.ts")
      },
      output: {
        // Asset organization by file type
        assetFileNames: (assetInfo) => {
          if (/\.css$/.test(assetInfo.name)) return "css/[name][extname]";
          if (/\.woff2?$/.test(assetInfo.name)) return "fonts/[name][extname]";
          if (/\.(png|jpe?g|gif|svg)$/.test(assetInfo.name)) return "images/[name][extname]";
          return "[name][extname]";
        },
        chunkFileNames: "js/[name].js",
        entryFileNames: "js/[name].js"
      }
    }
  },
  
  esbuild: {
    keepNames: true // Additional name preservation
  },
  
  resolve: {
    alias: {
      "@assets": path.resolve(__dirname, "src/assets")
    }
  }
});
```

### Background Build (`vite.config.bg.ts`)
```typescript
export default defineConfig({
  publicDir: false, // Don't copy public/ folder twice
  
  build: {
    outDir: "dist/background",
    emptyOutDir: false, // Don't wipe main build
    
    lib: {
      entry: path.resolve(__dirname, "src/background/background.ts"),
      formats: ["es"], // ES module for MV3
      fileName: () => "background.js"
    },
    
    rollupOptions: {
      input: path.resolve(__dirname, "src/background/background.ts"),
      output: {
        format: "es",
        entryFileNames: "[name].js"
      }
    }
  }
});
```

### Build Execution Flow
```
1. npm run build
   ├── Vite compiles React UI
   ├── Generates index.html, popup.html, pages.html
   ├── Bundles main.js, interceptor.js, replay.js
   └── Extracts CSS to css/ folder

2. npm run build:bg
   ├── Vite compiles background.ts in library mode
   ├── Outputs ES module to dist/background/background.js
   └── Skips public/ folder copying

3. npm run postbuild (scripts/postbuild.js)
   └── Copies public/manifest.json to dist/manifest.json
```

## Critical Dependencies
**Build Tools:**
- **Vite 6** - Core bundler
- **@vitejs/plugin-react-swc** - React + SWC compiler (faster than Babel)
- **vite-plugin-html** - Multi-page HTML generation
- **vite-plugin-static-copy** - Asset copying (unused currently)
- **Rollup** - Underlying bundler (via Vite)

**Runtime Dependencies:**
- **React 18** - UI framework
- **TailwindCSS** - Styling (processed via PostCSS)
- **Dexie.js** - IndexedDB (bundled with UI)

## Hidden Assumptions
1. **Two-phase build** - Main build must run before background build
2. **Separate output dirs** - background/ folder isolated from main dist/
3. **No code splitting** - All UI code in single main.js bundle
4. **Manifest not bundled** - Copied manually via postbuild script
5. **Content script not bundled separately** - content.tsx compiled with UI
6. **Service worker ES modules** - MV3 requires "type": "module"
7. **Name preservation for debugging** - Terser keeps function/class names
8. **No environment variables** - No .env file processing

## Stability Concerns
### High-Risk Patterns
1. **Build order dependency** - Background build must not clear main dist/
   ```typescript
   // vite.config.bg.ts
   emptyOutDir: false // ⚠️ Critical - don't wipe main build
   ```

2. **Manifest out of sync** - Manual copy can forget updates
   ```bash
   # Change in public/manifest.json
   # Forget to rebuild → dist/manifest.json outdated
   ```

3. **Content script bundling confusion** - content.tsx in main build, not separate
   ```typescript
   // content.tsx compiled as part of main bundle
   // NOT a separate entry → may bloat bundle size
   ```

4. **Path alias resolution** - `@assets` alias in source, not in build output
   ```typescript
   // Works in source: import img from '@assets/logo.png'
   // Build resolves to absolute path
   ```

### Failure Modes
- **Build order wrong** → background/ folder wiped by main build
- **postbuild not run** → manifest.json missing in dist/
- **Terser strips names** → Debugging impossible in production
- **Asset paths broken** → CSS/fonts not found (wrong output path)

## Edge Cases
### Input Variations
1. **New HTML page** - Must add to `createHtmlPlugin` pages array
2. **New content script** - Must add to `rollupOptions.input`
3. **New asset type** - Must add pattern to `assetFileNames`
4. **Environment-specific builds** - No built-in dev/prod distinction

### Build Scenarios
1. **Clean build** (no dist/ folder)
   ```bash
   rm -rf dist && npm run build && npm run build:bg && npm run postbuild
   ```

2. **Incremental build** (dist/ exists)
   ```bash
   npm run build # Overwrites main files
   npm run build:bg # Adds background/background.js
   ```

3. **Dev server** (no background build)
   ```bash
   npm run dev # Only runs main Vite config
   # Background script not available in dev mode
   ```

## Developer-Must-Know Notes
### Quick Context
This is a **multi-context Chrome extension build**. Most extensions use a single bundler, but this project needs React UI (pages/popup), service worker (background), and multiple content scripts. The two-config approach is necessary for MV3 compatibility.

### Common Issues
1. **Why is background.js missing after build?**
   - Forgot to run `npm run build:bg`
   - **Fix:** Add to build script: `"build": "vite build && vite build --config vite.config.bg.ts"`

2. **Why is manifest.json not in dist/?**
   - postbuild script not executed
   - **Fix:** Run `npm run postbuild` or add to package.json scripts

3. **Why are function names mangled in production?**
   - Terser minification enabled
   - Config has `keep_fnames: true` but may not work for all cases
   - **Fix:** Check terserOptions, consider disabling minify for debugging builds

4. **Why is the bundle so large?**
   - Content script compiled with main UI bundle
   - All React components included even if not used
   - **Fix:** Consider code splitting or separate content script build

### Integration Points
**Input Sources:**
- `src/main.tsx` - React app
- `src/background/background.ts` - Service worker
- `src/contentScript/*.tsx` - Content scripts
- `public/*.html` - Page templates
- `public/manifest.json` - Extension manifest

**Output Consumers:**
- `dist/manifest.json` - Chrome extension loader
- Browser extension system - Loads HTML pages, background script, content scripts

### Performance Notes
- **Average build time:** ~10s for main UI, ~2s for background
- **Bundle sizes:**
  - main.js: ~500KB (React + UI components)
  - background.js: ~20KB (message router only)
  - interceptor.js: ~5KB (shadow DOM patch)
- **Optimization opportunities:**
  - Code splitting for large UI pages
  - Tree shaking for unused components
  - Lazy loading for secondary routes

### Testing Guidance
**Build Validation:**
```bash
# 1. Clean build
rm -rf dist
npm run build && npm run build:bg && npm run postbuild

# 2. Check output structure
ls dist/ # Should have index.html, popup.html, pages.html, manifest.json
ls dist/js/ # Should have main.js, interceptor.js, replay.js
ls dist/background/ # Should have background.js

# 3. Validate manifest
cat dist/manifest.json | jq '.background.service_worker' # Should be "background/background.js"

# 4. Test in Chrome
chrome://extensions → Load unpacked → Select dist/ folder
```

**Test Cases:**
1. ✅ Clean build produces all files
2. ✅ Incremental build doesn't break
3. ✅ Background script loads in Chrome
4. ✅ UI pages render correctly
5. ✅ Content scripts inject properly
6. ✅ Asset paths resolve (CSS, fonts)
7. ✅ Sourcemaps generated for debugging

### Future Improvements
1. **Unified build script** - Single command for all builds
   ```json
   "build": "vite build && vite build --config vite.config.bg.ts && npm run postbuild"
   ```

2. **Content script separation** - Reduce main bundle size
   ```typescript
   // New vite.config.content.ts
   // Build content.tsx separately from main UI
   ```

3. **Environment variables** - Dev/prod configurations
   ```typescript
   // Use import.meta.env.MODE for build variants
   ```

4. **Watch mode for background** - Dev experience improvement
   ```bash
   # Concurrent builds: npm-run-all or turbo
   npm run dev:all # Watches both UI and background
   ```

5. **Build validation** - Post-build checks
   ```typescript
   // Validate manifest paths, check file sizes, lint output
   ```

6. **Hot module replacement** - Dev server with background script
   ```typescript
   // Use chrome.runtime.reload() on file changes
   ```
