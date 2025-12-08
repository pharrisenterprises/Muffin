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
        entryFileNames: "js/[name].js",
        chunkFileNames: "js/[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          if (/\.(woff|woff2|eot|ttf|otf)$/.test(assetInfo.name)) {
            return "fonts/[name][extname]";
          }
          if (/\.css$/.test(assetInfo.name)) {
            return "css/[name][extname]";
          }
          return "[name][extname]";
        }
      }
    }
  }
});
```

### Background Service Worker Build (`vite.config.bg.ts`)
```typescript
export default defineConfig({
  build: {
    emptyOutDir: false, // Don't clear dist/ (main build already created it)
    sourcemap: true,
    minify: "terser",
    terserOptions: {
      keep_classnames: true,
      keep_fnames: true
    },
    
    lib: {
      entry: path.resolve(__dirname, "src/background/background.ts"),
      name: "Background",
      formats: ["es"], // ES module format required for Manifest V3
      fileName: () => "background/background.js"
    },
    
    rollupOptions: {
      output: {
        inlineDynamicImports: true // Bundle all imports into single file
      }
    }
  }
});
```

### Post-Build Script (`scripts/postbuild.js`)
```javascript
const fs = require('fs');
const path = require('path');

// Copy manifest.json to dist/
const manifestSrc = path.resolve(__dirname, '../public/manifest.json');
const manifestDest = path.resolve(__dirname, '../dist/manifest.json');

fs.copyFileSync(manifestSrc, manifestDest);
console.log('✅ Copied manifest.json to dist/');
```

## Critical Dependencies
- **Vite 5.0**: Build tool and dev server
- **@vitejs/plugin-react**: React + JSX transform
- **vite-plugin-html**: Multi-page HTML generation
- **vite-plugin-static-copy**: Asset copying
- **terser**: Code minification
- **TypeScript 5.3**: Type checking

## Hidden Assumptions
1. **Sequential builds required**: Must run `build` before `build:bg`
2. **No watch mode coordination**: Dev mode only watches UI, not background
3. **Manifest not validated**: No schema validation on build
4. **Source maps enabled**: Adds ~30% to bundle size (remove for production)

## Stability Concerns
- **Build order dependency**: `build:bg` fails if `dist/` doesn't exist
- **Module resolution**: Background worker cannot use `chrome.*` types without polyfill
- **Dynamic imports**: Background worker bundles all imports (no code splitting)

## Developer-Must-Know Notes
- Use `npm run build:all` for complete build (runs both configs + postbuild)
- Dev server (`npm run dev`) only serves UI pages, not background worker
- Content scripts bundled as separate entries to avoid React runtime overhead
- Fonts extracted to separate directory for CSP compliance
- Terser preserves class/function names for better error messages

## Phase 3 Integration Points

### Recording System (Phase 3A)
- **Build Target**: `src/recording/index.ts` exports RecordingOrchestrator
- **Bundle**: Compiled into main.js for content script injection
- **Output**: Evidence buffers bundled with step capture logic

### CDP Services (Phase 3B)
- **Build Target**: `src/services/cdp/` directory
- **Bundle**: Included in background.js for CDP protocol access
- **Output**: Accessibility tree and Playwright locator services

### Decision Engine (Phase 3C)
- **Build Target**: `src/services/decision/` directory
- **Bundle**: Bundled into main.js for real-time strategy scoring
- **Output**: Fallback chain generator and strategy scorer

### Strategy Evaluators (Phase 3D)
- **Build Target**: `src/services/strategies/` directory
- **Bundle**: Included in both main.js and background.js
- **Output**: 7-tier fallback system with telemetry

### Type Definitions (Phase 3E)
- **Build Target**: `src/types/` directory
- **Bundle**: Compiled away (TypeScript types only)
- **Output**: Type safety across all modules

### UI Components (Phase 3F)
- **Build Target**: `src/components/` and `src/pages/`
- **Bundle**: Compiled into main.js with React runtime
- **Output**: TestRunner, Recorder UI with strategy badges

### Configuration (Phase 3G)
- **Build Target**: `manifest.json`, `package.json`, `vite.config.ts`
- **Bundle**: Manifest copied to dist/, configs used at build time
- **Output**: Extension manifest with required permissions

**Build Performance**:
- Main UI build: ~15-20s (React + UI components)
- Background build: ~5-8s (service worker only)
- Total build time: ~25-30s with type checking

**Bundle Sizes** (minified):
- main.js: ~400KB (React + UI + recording logic)
- background.js: ~150KB (service worker + IndexedDB)
- interceptor.js: ~5KB (page context script)
- replay.js: ~3KB (Google autocomplete handler)

**Last Updated**: December 7, 2025 — Phase 3 Specification Complete
