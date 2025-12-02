# FND-002: MANIFEST PERMISSIONS SPECIFICATION

> **Build Card:** FND-002  
> **Category:** Foundation / Architecture  
> **Dependencies:** None  
> **Risk Level:** Low  
> **Estimated Lines:** ~480

---

## 1. PURPOSE

This specification defines the required updates to the Chrome extension manifest.json file to support Muffin Lite's Vision capabilities. The manifest must be updated to include permissions necessary for:

1. **Tab capture** - Taking screenshots of web pages for OCR processing
2. **Scripting injection** - Injecting content scripts for Vision-based interactions
3. **Cross-origin access** - Accessing any website the user navigates to
4. **WASM resource loading** - Making Tesseract.js WASM files accessible to web pages

Without these permissions, the Vision Engine cannot capture screenshots, recognize text, or execute Vision-based clicks and typing actions.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| Current manifest.json | `/manifest.json` | Existing permissions structure |
| Architecture Spec | `/future-spec/04_architecture.md` | Complete manifest template (lines 846-892) |
| Migration Notes | `/future-spec/07_migration-notes.md` | Manifest change requirements |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `manifest.json` | MODIFY | Add Vision-related permissions and resources |

### Changes Summary

| Section | Change Type | Description |
|---------|-------------|-------------|
| `version` | UPDATE | Bump from current to "2.1.0" |
| `description` | UPDATE | Add "Vision/OCR capabilities" mention |
| `permissions` | ADD | Add "tabs", "scripting" |
| `host_permissions` | ADD | New section with "<all_urls>" |
| `web_accessible_resources` | ADD | New section for WASM files |

---

## 4. DETAILED SPECIFICATION

### 4.1 Version Update

The manifest version must be incremented to indicate the new Vision capabilities:

```json
{
  "version": "2.1.0"
}
```

**Version Rationale:**
- Major: 2 (no breaking changes to existing features)
- Minor: 1 (new Vision features added)
- Patch: 0 (fresh feature release)

### 4.2 Description Update

Update the description to reflect new capabilities:

```json
{
  "description": "Browser automation with Vision/OCR capabilities"
}
```

### 4.3 Permissions Array

The `permissions` array must include these entries:

```json
{
  "permissions": [
    "activeTab",
    "tabs",
    "storage",
    "scripting"
  ]
}
```

#### Permission Explanations

| Permission | Purpose | Required For |
|------------|---------|--------------|
| `activeTab` | Access to currently active tab | Basic extension functionality |
| `tabs` | Query and interact with browser tabs | Screenshot capture, tab management |
| `storage` | Access to chrome.storage API | IndexedDB for recordings (existing) |
| `scripting` | Programmatic script injection | Injecting Vision handlers into pages |

#### Security Implications

- `tabs` permission allows reading tab URLs and titles across all tabs
- `scripting` permission allows injecting scripts into any page matching host_permissions
- Both are necessary for Vision functionality but represent elevated privileges
- Users will see permission warnings during installation

### 4.4 Host Permissions

Add a new `host_permissions` section:

```json
{
  "host_permissions": [
    "<all_urls>"
  ]
}
```

#### Why `<all_urls>`?

The Vision Engine must:
1. Capture screenshots of any website the user automates
2. Inject content scripts to execute Vision-based clicks
3. Access DOM elements across any domain

Without `<all_urls>`, the extension would require users to manually grant access to each domain, which would break the user experience for automation tools.

#### Alternative Approaches (Not Recommended)

| Approach | Why Not Used |
|----------|--------------|
| Specific domain list | Users automate unpredictable websites |
| Optional permissions | Requires complex runtime permission flow |
| activeTab only | Insufficient for programmatic injection |

### 4.5 Web Accessible Resources

Add a new `web_accessible_resources` section for WASM files:

```json
{
  "web_accessible_resources": [
    {
      "resources": [
        "*.wasm",
        "*.traineddata"
      ],
      "matches": [
        "<all_urls>"
      ]
    }
  ]
}
```

#### Resource Explanations

| Resource Pattern | Purpose |
|------------------|---------|
| `*.wasm` | Tesseract.js WASM binaries (tesseract-core.wasm, etc.) |
| `*.traineddata` | OCR language model files (eng.traineddata) |

#### Why Web Accessible?

Tesseract.js loads WASM files dynamically. In Chrome extensions, these files must be explicitly declared as web accessible for the library to load them from the extension's context.

Without this declaration, Tesseract.js initialization fails with:
```
Error: Failed to load WASM binary
```

### 4.6 Complete Manifest Template

The complete updated manifest.json should look like:

```json
{
  "manifest_version": 3,
  "name": "Muffin Lite",
  "version": "2.1.0",
  "description": "Browser automation with Vision/OCR capabilities",
  
  "permissions": [
    "activeTab",
    "tabs",
    "storage",
    "scripting"
  ],
  
  "host_permissions": [
    "<all_urls>"
  ],
  
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["contentScript.js"],
      "run_at": "document_idle"
    }
  ],
  
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  
  "web_accessible_resources": [
    {
      "resources": ["*.wasm", "*.traineddata"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

### 4.7 Manifest V3 Compliance

All changes maintain Manifest V3 compliance:

| Requirement | Status | Notes |
|-------------|--------|-------|
| manifest_version: 3 | ✓ | Already compliant |
| Service worker background | ✓ | No changes needed |
| No remote code | ✓ | WASM is bundled, not remote |
| Declarative permissions | ✓ | All permissions declared upfront |

---

## 5. CODE EXAMPLES

### 5.1 Diff View of Changes

```diff
{
  "manifest_version": 3,
  "name": "Muffin Lite",
-  "version": "2.0.0",
+  "version": "2.1.0",
-  "description": "Browser automation tool",
+  "description": "Browser automation with Vision/OCR capabilities",
  
  "permissions": [
    "activeTab",
+    "tabs",
    "storage",
+    "scripting"
  ],
  
+  "host_permissions": [
+    "<all_urls>"
+  ],
+  
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["contentScript.js"],
      "run_at": "document_idle"
    }
  ],
  
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
-  }
+  },
+  
+  "web_accessible_resources": [
+    {
+      "resources": ["*.wasm", "*.traineddata"],
+      "matches": ["<all_urls>"]
+    }
+  ]
}
```

### 5.2 Permission Verification Script

Use this script to verify manifest permissions after update:

```javascript
// verify-manifest.js (development utility)
const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

const requiredPermissions = ['activeTab', 'tabs', 'storage', 'scripting'];
const requiredHostPermissions = ['<all_urls>'];
const requiredResources = ['*.wasm', '*.traineddata'];

console.log('Manifest Verification Report');
console.log('============================\n');

// Check version
console.log(`Version: ${manifest.version}`);
const versionParts = manifest.version.split('.');
if (parseInt(versionParts[0]) >= 2 && parseInt(versionParts[1]) >= 1) {
  console.log('✓ Version is 2.1.0 or higher\n');
} else {
  console.log('✗ Version should be 2.1.0 or higher\n');
}

// Check permissions
console.log('Permissions:');
requiredPermissions.forEach(perm => {
  if (manifest.permissions && manifest.permissions.includes(perm)) {
    console.log(`  ✓ ${perm}`);
  } else {
    console.log(`  ✗ ${perm} MISSING`);
  }
});

// Check host_permissions
console.log('\nHost Permissions:');
requiredHostPermissions.forEach(hp => {
  if (manifest.host_permissions && manifest.host_permissions.includes(hp)) {
    console.log(`  ✓ ${hp}`);
  } else {
    console.log(`  ✗ ${hp} MISSING`);
  }
});

// Check web_accessible_resources
console.log('\nWeb Accessible Resources:');
if (manifest.web_accessible_resources && manifest.web_accessible_resources.length > 0) {
  const resources = manifest.web_accessible_resources[0].resources || [];
  requiredResources.forEach(res => {
    if (resources.includes(res)) {
      console.log(`  ✓ ${res}`);
    } else {
      console.log(`  ✗ ${res} MISSING`);
    }
  });
} else {
  console.log('  ✗ web_accessible_resources section MISSING');
}

console.log('\n============================');
console.log('Verification complete.');
```

### 5.3 Chrome Extension Load Test

After modifying the manifest, test loading in Chrome:

1. Navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the extension's dist folder
5. Verify no errors appear

Expected result: Extension loads without permission errors or manifest warnings.

### 5.4 Runtime Permission Check

Add this utility to verify permissions at runtime:

```typescript
// src/lib/permissionCheck.ts
export async function verifyVisionPermissions(): Promise<{
  hasAllPermissions: boolean;
  missing: string[];
}> {
  const required = ['tabs', 'scripting', 'activeTab', 'storage'];
  const missing: string[] = [];
  
  for (const permission of required) {
    const hasPermission = await chrome.permissions.contains({
      permissions: [permission]
    });
    if (!hasPermission) {
      missing.push(permission);
    }
  }
  
  // Check host permissions
  const hasHostPermission = await chrome.permissions.contains({
    origins: ['<all_urls>']
  });
  if (!hasHostPermission) {
    missing.push('host:<all_urls>');
  }
  
  return {
    hasAllPermissions: missing.length === 0,
    missing
  };
}
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** manifest.json `version` is "2.1.0"
- [ ] **AC-2:** manifest.json `description` mentions "Vision/OCR capabilities"
- [ ] **AC-3:** `permissions` array contains: "activeTab", "tabs", "storage", "scripting"
- [ ] **AC-4:** `host_permissions` array contains: "<all_urls>"
- [ ] **AC-5:** `web_accessible_resources` includes "*.wasm" and "*.traineddata"
- [ ] **AC-6:** Extension loads in Chrome without manifest errors
- [ ] **AC-7:** Extension loads in Chrome without permission warnings (beyond expected user prompts)
- [ ] **AC-8:** JSON syntax is valid (no trailing commas, proper formatting)
- [ ] **AC-9:** All existing functionality still works after manifest update

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Manifest V3 required** - Do not use Manifest V2 syntax
2. **No remote code loading** - All resources must be bundled
3. **Declarative permissions** - All permissions must be in manifest, not requested at runtime
4. **JSON format** - No comments allowed in manifest.json

### Patterns to Follow

1. **Alphabetical ordering** - Keep permission arrays alphabetically sorted for maintainability
2. **Minimal permissions** - Only request permissions actually needed
3. **Clear descriptions** - Update description to accurately reflect capabilities

### Edge Cases

1. **Existing custom permissions**
   - If manifest already has custom permissions, preserve them
   - Merge new permissions with existing, avoiding duplicates

2. **Different manifest structure**
   - If manifest uses different formatting, maintain consistent style
   - Ensure all required fields are present regardless of order

3. **Missing sections**
   - If `host_permissions` section doesn't exist, create it
   - If `web_accessible_resources` section doesn't exist, create it

---

## 8. VERIFICATION COMMANDS

```bash
# Validate JSON syntax
cat manifest.json | python -m json.tool > /dev/null && echo "JSON Valid" || echo "JSON Invalid"

# Alternative: Use Node.js
node -e "JSON.parse(require('fs').readFileSync('manifest.json'))" && echo "JSON Valid"

# Check for required permissions (grep-based quick check)
grep -q '"tabs"' manifest.json && echo "✓ tabs permission" || echo "✗ tabs permission"
grep -q '"scripting"' manifest.json && echo "✓ scripting permission" || echo "✗ scripting permission"
grep -q '"host_permissions"' manifest.json && echo "✓ host_permissions section" || echo "✗ host_permissions section"
grep -q '"web_accessible_resources"' manifest.json && echo "✓ web_accessible_resources section" || echo "✗ web_accessible_resources section"

# Build and load test
npm run build
# Then manually load in Chrome to verify
```

---

## 9. ROLLBACK PROCEDURE

If the manifest changes cause issues:

```bash
# Restore previous manifest from git
git checkout HEAD~1 -- manifest.json

# Or restore from backup
cp manifest.json.backup manifest.json

# Rebuild extension
npm run build
```

**Pre-modification backup:**
```bash
# Create backup before making changes
cp manifest.json manifest.json.backup
```

---

## 10. SECURITY CONSIDERATIONS

### Permission Escalation

The new permissions represent a significant capability increase:

| Permission | Security Impact | Mitigation |
|------------|-----------------|------------|
| `tabs` | Can read all tab URLs/titles | Only used for screenshot capture |
| `scripting` | Can inject code into pages | Scripts are bundled, not dynamic |
| `<all_urls>` | Access to all websites | Required for automation use case |

### User Consent

When users install or update the extension, Chrome will display:

```
"Muffin Lite" wants to:
- Read and change all your data on all websites
- Read your browsing history
```

This is expected and necessary for the automation features.

### Data Handling

- Screenshots are processed locally (Tesseract.js runs in-browser)
- No screenshot data is transmitted externally
- OCR results are stored only in local IndexedDB

---

## 11. CHROME WEB STORE CONSIDERATIONS

If publishing to Chrome Web Store:

1. **Permission justification required** - Prepare explanation for `<all_urls>` usage
2. **Privacy policy update** - Document screenshot capture capability
3. **Review timeline** - Broad permissions may trigger manual review

### Justification Template

```
This extension requires access to all websites because:
1. It is a browser automation tool that must work on any site the user chooses
2. Screenshot capture is needed for Vision/OCR-based element detection
3. Content script injection is required for simulating user interactions
4. All processing occurs locally - no data is transmitted to external servers
```

---

## 12. TROUBLESHOOTING

### Issue: "Extension manifest must request permission to access this host"

**Cause:** host_permissions not correctly configured  
**Solution:** Verify `host_permissions` array contains `"<all_urls>"`

### Issue: "Cannot load WASM module"

**Cause:** web_accessible_resources not configured  
**Solution:** Add web_accessible_resources section with *.wasm pattern

### Issue: "Permission denied for chrome.tabs API"

**Cause:** "tabs" not in permissions array  
**Solution:** Add "tabs" to permissions array

### Issue: Extension won't load - "Invalid manifest"

**Cause:** JSON syntax error (likely trailing comma)  
**Solution:** Validate JSON with `json.tool` or online validator

### Issue: Extension loads but Vision features don't work

**Cause:** May be missing "scripting" permission  
**Solution:** Verify all four required permissions are present

---

## 13. REFERENCES

- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/manifest/)
- [Chrome Extension Permissions](https://developer.chrome.com/docs/extensions/mv3/declare_permissions/)
- [Host Permissions](https://developer.chrome.com/docs/extensions/mv3/match_patterns/)
- [Web Accessible Resources](https://developer.chrome.com/docs/extensions/mv3/manifest/web_accessible_resources/)

---

*End of Specification FND-002*
