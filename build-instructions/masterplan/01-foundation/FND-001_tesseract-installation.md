# FND-001: TESSERACT.JS INSTALLATION SPECIFICATION

> **Build Card:** FND-001  
> **Category:** Foundation / Architecture  
> **Dependencies:** None (First card - no prerequisites)  
> **Risk Level:** Low  
> **Estimated Lines:** ~450

---

## 1. PURPOSE

This specification defines the installation and configuration of Tesseract.js as the core OCR (Optical Character Recognition) library for Muffin Lite's Vision capabilities. Tesseract.js enables the extension to recognize text on screen, which is fundamental to all Vision-based features including finding text elements, conditional clicking, and DOM fallback recording.

Tesseract.js was selected because:
- Pure JavaScript implementation (no native binaries required)
- Works in browser environments including Chrome extensions
- Supports WASM for performance optimization
- Actively maintained with good documentation
- MIT licensed for commercial use

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| Current package.json | `/package.json` | Existing dependencies structure |
| Architecture Spec | `/future-spec/04_architecture.md` | Tesseract.js version requirement (^5.0.0) |
| Migration Notes | `/future-spec/07_migration-notes.md` | Bundle size considerations |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `package.json` | MODIFY | Add tesseract.js dependency |
| `package-lock.json` | AUTO-GENERATED | Lock file updated by npm |

### Artifacts Produced

- Updated dependency tree with tesseract.js v5.x
- WASM files will be installed in node_modules (used at runtime)
- TypeScript type definitions included (@types not needed - bundled)

---

## 4. DETAILED SPECIFICATION

### 4.1 Dependency Details

**Package:** tesseract.js  
**Version:** ^5.0.0 (latest stable major version)  
**Registry:** npm (https://www.npmjs.com/package/tesseract.js)  
**License:** Apache-2.0  
**Bundle Impact:** ~3MB added to extension (WASM + trained data)

#### Version Rationale

Version 5.x was chosen because:
1. Native ESM support (required for Vite bundling)
2. Improved WASM initialization for extension environments
3. Better TypeScript support with bundled types
4. Simplified worker management API
5. Reduced memory footprint compared to v4.x

#### Peer Dependencies

Tesseract.js v5.0.0 has no required peer dependencies. It bundles:
- tesseract.js-core (WASM binaries)
- Language trained data (eng.traineddata)

### 4.2 Installation Command

The installation must use `--save` (or no flag, which defaults to save in npm 5+) to ensure the package is added to `dependencies`, not `devDependencies`.

```bash
npm install tesseract.js@^5.0.0
```

**CRITICAL:** Do NOT use `--save-dev` or `-D` flag. Tesseract.js is a runtime dependency required in the production build.

### 4.3 Expected package.json Changes

Before installation, the dependencies section may look like:

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.24.0",
    "dexie": "^4.0.11",
    "papaparse": "^5.5.3",
    "string-similarity": "^4.0.4",
    "@hello-pangea/dnd": "^18.0.1",
    "date-fns": "^4.1.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  }
}
```

After installation, it should include:

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.24.0",
    "dexie": "^4.0.11",
    "papaparse": "^5.5.3",
    "string-similarity": "^4.0.4",
    "tesseract.js": "^5.0.0",
    "@hello-pangea/dnd": "^18.0.1",
    "date-fns": "^4.1.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  }
}
```

### 4.4 Installed File Structure

After installation, the following structure will exist in `node_modules/tesseract.js/`:

```
node_modules/tesseract.js/
├── package.json
├── dist/
│   ├── tesseract.esm.min.js      # ESM entry (used by Vite)
│   ├── tesseract.min.js          # UMD entry (fallback)
│   └── worker.min.js             # Web Worker script
├── src/                          # TypeScript source
└── types/                        # Type definitions
```

Additionally, `tesseract.js-core` is installed as a dependency:

```
node_modules/tesseract.js-core/
├── tesseract-core-simd.wasm      # WASM binary (SIMD optimized)
├── tesseract-core.wasm           # WASM binary (fallback)
└── tesseract-core-simd-lstm.wasm # LSTM model WASM
```

### 4.5 TypeScript Integration

Tesseract.js v5.x includes bundled TypeScript definitions. No additional `@types` package is required.

Verify types are available by checking that this import resolves without errors:

```typescript
import Tesseract from 'tesseract.js';
import type { Worker, RecognizeResult, Block, Line, Word } from 'tesseract.js';
```

### 4.6 Build Verification

After installation, verify the build still succeeds:

```bash
npm run build
```

Expected output should show:
- No TypeScript compilation errors
- Bundle generated successfully
- No missing module errors

### 4.7 Bundle Size Analysis

Run bundle analysis to confirm tesseract.js is included correctly:

```bash
npm run build -- --report
```

Or manually check the dist folder size. Expected increase: ~3-4MB total for:
- Main library code: ~500KB
- WASM binaries: ~2MB
- Default language data: ~1MB

---

## 5. CODE EXAMPLES

### 5.1 Basic Import Verification

Create a temporary test file to verify the installation works:

```typescript
// test-tesseract.ts (temporary, do not commit)
import Tesseract from 'tesseract.js';

async function testTesseractImport() {
  console.log('Tesseract.js imported successfully');
  console.log('Version info:', Tesseract);
  
  // Verify createWorker is available
  if (typeof Tesseract.createWorker === 'function') {
    console.log('createWorker function is available');
  } else {
    console.error('createWorker function NOT found');
  }
}

testTesseractImport();
```

### 5.2 Type Verification

Verify TypeScript types are working:

```typescript
// type-check-tesseract.ts (temporary, do not commit)
import Tesseract, { 
  Worker,
  RecognizeResult,
  Page,
  Block,
  Paragraph,
  Line,
  Word,
  Symbol
} from 'tesseract.js';

// This should compile without errors
type WorkerType = Worker;
type ResultType = RecognizeResult;

// Verify configuration types
const config: Partial<Tesseract.WorkerOptions> = {
  logger: (m) => console.log(m),
  errorHandler: (e) => console.error(e),
};

console.log('Type definitions verified');
```

### 5.3 Minimal Worker Creation Test

This code can be used to verify Tesseract.js initializes correctly:

```typescript
// worker-test.ts (temporary, do not commit)
import Tesseract from 'tesseract.js';

async function createTestWorker() {
  try {
    console.log('Creating Tesseract worker...');
    
    const worker = await Tesseract.createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });
    
    console.log('Worker created successfully!');
    
    // Clean up
    await worker.terminate();
    console.log('Worker terminated.');
    
    return true;
  } catch (error) {
    console.error('Failed to create worker:', error);
    return false;
  }
}

createTestWorker().then((success) => {
  console.log('Test result:', success ? 'PASS' : 'FAIL');
});
```

### 5.4 Package.json Script Addition (Optional)

Consider adding a verification script to package.json:

```json
{
  "scripts": {
    "verify:tesseract": "node -e \"const t = require('tesseract.js'); console.log('Tesseract.js version:', require('tesseract.js/package.json').version);\""
  }
}
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** `npm install tesseract.js` command completes without errors
- [ ] **AC-2:** `package.json` contains `"tesseract.js": "^5.0.0"` in dependencies (not devDependencies)
- [ ] **AC-3:** `npm run build` completes successfully after installation
- [ ] **AC-4:** TypeScript can import from 'tesseract.js' without type errors
- [ ] **AC-5:** `node_modules/tesseract.js` directory exists with expected structure
- [ ] **AC-6:** `node_modules/tesseract.js-core` directory exists (WASM binaries)
- [ ] **AC-7:** Bundle size increases by approximately 3-4MB (within 5MB tolerance)
- [ ] **AC-8:** No new security vulnerabilities introduced (npm audit)

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Must be runtime dependency** - tesseract.js must be in `dependencies`, not `devDependencies`, as it's required at runtime in the built extension
2. **Version pinning** - Use caret (^) version to allow patch updates but prevent breaking changes from major version bumps
3. **No modifications to installed files** - Never modify files in node_modules; any customization should be in wrapper code

### Patterns to Follow

1. **Standard npm workflow** - Use standard npm install commands; avoid yarn or pnpm unless project already uses them
2. **Lock file commitment** - Commit package-lock.json after installation for reproducible builds
3. **Clean install verification** - After committing, verify with `npm ci` that installation is reproducible

### Edge Cases

1. **Network failure during install**
   - Retry the install command
   - If persistent, check npm registry availability
   - Consider using `npm install --prefer-offline` if package was previously installed

2. **Version conflict with existing dependencies**
   - Run `npm ls tesseract.js` to check for conflicts
   - If conflicts exist, may need to update conflicting packages
   - Document any required peer dependency updates

3. **Insufficient disk space**
   - tesseract.js requires ~50MB in node_modules
   - Clear npm cache if needed: `npm cache clean --force`

4. **Corporate proxy/firewall blocking WASM download**
   - WASM files are downloaded during npm install
   - If blocked, may need to configure npm proxy settings
   - Alternative: manually download and place WASM files

---

## 8. VERIFICATION COMMANDS

```bash
# Install the package
npm install tesseract.js@^5.0.0

# Verify package.json was updated
cat package.json | grep tesseract

# Verify node_modules structure
ls -la node_modules/tesseract.js/
ls -la node_modules/tesseract.js-core/

# Run type check
npm run type-check

# Run build to verify no breaking changes
npm run build

# Check for security vulnerabilities
npm audit

# Verify import works (requires ts-node or similar)
npx ts-node -e "import T from 'tesseract.js'; console.log('OK');"
```

---

## 9. ROLLBACK PROCEDURE

If the installation causes issues, rollback with:

```bash
# Remove the package
npm uninstall tesseract.js

# Restore previous package-lock.json from git
git checkout package.json package-lock.json

# Reinstall previous dependencies
npm ci
```

---

## 10. SECURITY CONSIDERATIONS

### Vulnerability Assessment

Before finalizing installation, verify no known vulnerabilities:

```bash
npm audit
```

If vulnerabilities are found in tesseract.js or its dependencies:
1. Check if a patched version exists
2. Evaluate severity (critical/high should block deployment)
3. Document any accepted risks with justification

### Supply Chain Security

- Verify package authenticity on npmjs.com
- Check download counts and maintenance activity
- Review recent commits on GitHub repository
- Consider using `npm audit signatures` for verification

---

## 11. POST-INSTALLATION TASKS

After successful installation, the following cards can proceed:

| Dependent Card | Can Now Start | Reason |
|----------------|---------------|--------|
| FND-003 | Yes | Vite WASM configuration requires tesseract.js to be installed |
| ENG-002 | Yes | Tesseract worker initialization depends on the library being available |

---

## 12. TROUBLESHOOTING

### Issue: "Cannot find module 'tesseract.js'"

**Cause:** Package not installed correctly  
**Solution:**
```bash
rm -rf node_modules
npm install
```

### Issue: "Type definitions not found"

**Cause:** TypeScript not recognizing bundled types  
**Solution:** Ensure tsconfig.json has:
```json
{
  "compilerOptions": {
    "moduleResolution": "bundler"
  }
}
```

### Issue: Build fails with WASM errors

**Cause:** Vite not configured for WASM (addressed in FND-003)  
**Solution:** This is expected until FND-003 is complete. Proceed with FND-003 next.

### Issue: npm audit shows vulnerabilities

**Cause:** Transitive dependency has known vulnerability  
**Solution:**
1. Run `npm audit fix` for automatic fixes
2. If fix unavailable, document in security exceptions
3. Monitor for updates

---

## 13. REFERENCES

- [Tesseract.js GitHub Repository](https://github.com/naptha/tesseract.js)
- [Tesseract.js npm Package](https://www.npmjs.com/package/tesseract.js)
- [Tesseract.js Documentation](https://tesseract.projectnaptha.com/)
- [Chrome Extension WASM Support](https://developer.chrome.com/docs/extensions/mv3/intro/mv3-migration/#wasm)

---

*End of Specification FND-001*
