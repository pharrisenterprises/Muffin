# vite.config.ts Specification

**File ID:** G4  
**File Path:** `vite.config.ts`  
**Status:** CREATE (or MODIFY if exists)  
**Priority:** P0

---

## Purpose

Configure Vite build tool for the Chrome extension with multiple entry points (background, content script, popup), proper output structure, asset copying for Tesseract.js resources, and Chrome extension-specific optimizations. Ensures the build produces a valid extension package in the dist/ directory ready for loading in Chrome.

---

## Dependencies

### Enables
- All TypeScript source files compilation
- Asset bundling and optimization
- Tesseract.js resource copying
- Manifest and icon copying

### Required Packages
- `vite`: Build tool
- `@vitejs/plugin-react`: React support
- `vite-plugin-static-copy`: Asset copying

---

## Complete Configuration

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        // Manifest and icons
        {
          src: 'manifest.json',
          dest: '.'
        },
        {
          src: 'icons/*',
          dest: 'icons'
        },
        // Tesseract.js worker and WASM
        {
          src: 'node_modules/tesseract.js/dist/worker.min.js',
          dest: '.',
          rename: 'tesseract-worker.js'
        },
        {
          src: 'node_modules/tesseract.js-core/tesseract-core.wasm.js',
          dest: '.'
        },
        // Tesseract language data
        {
          src: 'node_modules/tesseract.js/lang-data/eng.traineddata.gz',
          dest: '.'
        },
        // HTML files
        {
          src: 'src/pages/popup.html',
          dest: '.',
          rename: 'popup.html'
        }
      ]
    })
  ],

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: process.env.NODE_ENV === 'development',
    minify: process.env.NODE_ENV === 'production',
    
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background/background.ts'),
        contentScript: resolve(__dirname, 'src/contentScript/content.tsx'),
        popup: resolve(__dirname, 'src/pages/popup.tsx')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        // Prevent code splitting for extension compatibility
        manualChunks: undefined
      }
    },

    // Chrome extension specific
    target: 'esnext',
    modulePreload: false,
    cssCodeSplit: false
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@types': resolve(__dirname, 'src/types'),
      '@services': resolve(__dirname, 'src/background/services'),
      '@components': resolve(__dirname, 'src/components'),
      '@pages': resolve(__dirname, 'src/pages')
    }
  },

  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    '__DEV__': process.env.NODE_ENV !== 'production'
  },

  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'uuid'],
    exclude: ['tesseract.js']
  },

  // Development server (for popup testing)
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173
    }
  }
});
```

---

## Entry Points Configuration

### Background Script
```typescript
input: {
  background: resolve(__dirname, 'src/background/background.ts')
}
```

Output: `dist/background.js`

Key considerations:
- Must be a single file (no code splitting)
- Service worker format
- ES modules enabled

### Content Script
```typescript
input: {
  contentScript: resolve(__dirname, 'src/contentScript/content.tsx')
}
```

Output: `dist/contentScript.js`

Key considerations:
- Runs in page context
- No code splitting allowed
- CSS bundled separately

### Popup
```typescript
input: {
  popup: resolve(__dirname, 'src/pages/popup.tsx')
}
```

Output: `dist/popup.js`

Key considerations:
- React application
- Can have separate chunks (loaded locally)
- Needs HTML entry point

---

## Asset Copying

### Manifest and Icons
```typescript
{
  src: 'manifest.json',
  dest: '.'
},
{
  src: 'icons/*',
  dest: 'icons'
}
```

Copies:
- `manifest.json` → `dist/manifest.json`
- `icons/*.png` → `dist/icons/*.png`

### Tesseract.js Resources
```typescript
{
  src: 'node_modules/tesseract.js/dist/worker.min.js',
  dest: '.',
  rename: 'tesseract-worker.js'
},
{
  src: 'node_modules/tesseract.js-core/tesseract-core.wasm.js',
  dest: '.'
},
{
  src: 'node_modules/tesseract.js/lang-data/eng.traineddata.gz',
  dest: '.'
}
```

Copies:
- Tesseract worker → `dist/tesseract-worker.js`
- WASM core → `dist/tesseract-core.wasm.js`
- Language data → `dist/eng.traineddata.gz`

### HTML Files
```typescript
{
  src: 'src/pages/popup.html',
  dest: '.',
  rename: 'popup.html'
}
```

---

## Build Modes

### Development
```bash
npm run dev
# or
vite build --watch --mode development
```

Configuration:
- Source maps enabled
- No minification
- Watch mode for rebuilds
- Debug logging enabled

### Production
```bash
npm run build:prod
# or
vite build --mode production
```

Configuration:
- No source maps
- Full minification
- Tree shaking
- Optimized chunks

---

## Output Structure

```
dist/
├── background.js           # Background service worker
├── contentScript.js        # Content script
├── contentScript.css       # Content script styles
├── popup.js                # Popup React app
├── popup.html              # Popup HTML
├── manifest.json           # Extension manifest
├── tesseract-worker.js     # Tesseract OCR worker
├── tesseract-core.wasm.js  # Tesseract WASM
├── eng.traineddata.gz      # English OCR data
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── assets/                 # Additional assets
│   └── *.css              # Extracted CSS
└── chunks/                 # Code chunks (popup only)
    └── *.js
```

---

## Path Aliases

```typescript
resolve: {
  alias: {
    '@': resolve(__dirname, 'src'),
    '@types': resolve(__dirname, 'src/types'),
    '@services': resolve(__dirname, 'src/background/services'),
    '@components': resolve(__dirname, 'src/components'),
    '@pages': resolve(__dirname, 'src/pages')
  }
}
```

Usage in code:
```typescript
import { FallbackChain } from '@types/strategy';
import { CDPService } from '@services/CDPService';
import { StrategyBadge } from '@components/StrategyBadge';
```

---

## Chrome Extension Specifics

### No Module Preload
```typescript
modulePreload: false
```
Chrome extensions don't support modulepreload links.

### Single File Output
```typescript
manualChunks: undefined
```
Prevents automatic code splitting for background and content scripts.

### CSS Handling
```typescript
cssCodeSplit: false
```
Keeps CSS in single file for content script.

### Target
```typescript
target: 'esnext'
```
Modern Chrome supports latest JavaScript features.

---

## Environment Variables

### Definition
```typescript
define: {
  'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  '__DEV__': process.env.NODE_ENV !== 'production'
}
```

### Usage in Code
```typescript
if (__DEV__) {
  console.log('Debug info:', data);
}

if (process.env.NODE_ENV === 'production') {
  // Production-only code
}
```

---

## Dependency Optimization

### Include
```typescript
optimizeDeps: {
  include: ['react', 'react-dom', 'uuid']
}
```
Pre-bundle these for faster dev starts.

### Exclude
```typescript
optimizeDeps: {
  exclude: ['tesseract.js']
}
```
Don't pre-bundle Tesseract (loaded separately as web worker).

---

## Alternative: Webpack Configuration

If using Webpack instead of Vite:

```javascript
// webpack.config.js
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: process.env.NODE_ENV || 'development',
  entry: {
    background: './src/background/background.ts',
    contentScript: './src/contentScript/content.tsx',
    popup: './src/pages/popup.tsx'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: '.' },
        { from: 'icons', to: 'icons' },
        { from: 'node_modules/tesseract.js/dist/worker.min.js', to: 'tesseract-worker.js' },
        { from: 'node_modules/tesseract.js-core/tesseract-core.wasm.js', to: '.' },
        { from: 'node_modules/tesseract.js/lang-data/eng.traineddata.gz', to: '.' },
        { from: 'src/pages/popup.html', to: 'popup.html' }
      ]
    })
  ],
  devtool: process.env.NODE_ENV === 'development' ? 'source-map' : false
};
```

---

## Acceptance Criteria

- [ ] All three entry points configured (background, contentScript, popup)
- [ ] Output files named correctly for manifest
- [ ] Tesseract resources copied to dist
- [ ] Manifest and icons copied to dist
- [ ] Source maps in development only
- [ ] Minification in production only
- [ ] Path aliases working
- [ ] CSS extracted properly
- [ ] `npm run build` produces valid extension
- [ ] Extension loads in Chrome without errors
- [ ] Background script initializes
- [ ] Content script injects
- [ ] Popup opens and renders

---

## Edge Cases

1. **Missing Tesseract files**: Copy plugin fails gracefully
2. **Large bundle size**: Monitor and optimize
3. **Circular dependencies**: Vite handles, but watch for issues
4. **CSS in content script**: Properly scoped
5. **Hot reload limitations**: Not available for extension
6. **Watch mode on Windows**: Path normalization
7. **Node modules path**: Different on CI
8. **Source map size**: Can be large
9. **Tree shaking aggressive**: Test all code paths
10. **WASM loading**: CSP must allow

---

## Estimated Lines

80-120 lines
