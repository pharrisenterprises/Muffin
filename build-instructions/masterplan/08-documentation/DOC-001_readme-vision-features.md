# DOC-001: README Vision Features Documentation

> **Build Card:** DOC-001  
> **Category:** Documentation  
> **Dependencies:** ALL implementation specs  
> **Risk Level:** Low  
> **Estimated Lines:** 200-250

---

## 1. PURPOSE

Create comprehensive README documentation for the Vision features added to Muffin Lite. This includes feature overview, installation requirements, usage instructions, configuration options, and troubleshooting tips. This documentation enables users to understand and effectively use the new Vision-based automation capabilities for Copilot workflows.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| Feature Specs | `/future-spec/03_feature-specs.md` | Feature descriptions |
| UX Flows | `/future-spec/02_ux-flows.md` | User workflow descriptions |
| All ENG specs | `build-instructions/masterplan/03-engine/` | Technical capabilities |
| Screenshot | Project Knowledge | UI reference |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Lines |
|------|--------|-------|
| `README.md` | MODIFY | +150 |
| `docs/VISION_FEATURES.md` | CREATE | +200 |

### Artifacts

- Updated README with Vision feature section
- Dedicated Vision features documentation
- Usage examples and screenshots

---

## 4. DETAILED SPECIFICATION

### 4.1 README.md Updates

```markdown
<!-- Add to existing README.md after Features section -->

## 🔮 Vision Features (New!)

Muffin Lite now includes **Vision-based automation** powered by OCR technology. This enables automation of dynamic web interfaces where traditional DOM selectors fail.

### Key Capabilities

- **Vision Recording Fallback** - Automatically captures screen text when DOM selectors are unreliable
- **Conditional Click** - Polls screen for button text (like "Allow" or "Keep") and clicks when found
- **CSV Loop with Vision** - Combine data-driven testing with Vision-based interactions
- **Per-Step Delays** - Configure timing for individual steps
- **Global Delay** - Set default delay between all steps

### Perfect For

- ✅ GitHub Copilot automation (Allow/Keep buttons)
- ✅ Dynamic web applications with changing selectors
- ✅ Modal dialogs and popups
- ✅ Sites with anti-automation measures
- ✅ Complex multi-step workflows

### Quick Start

1. Record your workflow as usual
2. For dynamic elements, use **+ Add Variable → Conditional Click**
3. Configure button texts to watch for (e.g., "Allow", "Keep")
4. Set success text to detect completion (e.g., "committed")
5. Load CSV and run!

📖 See [Vision Features Documentation](docs/VISION_FEATURES.md) for detailed usage.
```

### 4.2 Vision Features Documentation

```markdown
<!-- docs/VISION_FEATURES.md -->

# Muffin Lite Vision Features

Complete guide to using Vision-based automation in Muffin Lite.

## Table of Contents

1. [Overview](#overview)
2. [Requirements](#requirements)
3. [Features](#features)
   - [Vision Recording Fallback](#vision-recording-fallback)
   - [Conditional Click](#conditional-click)
   - [Per-Step Delays](#per-step-delays)
   - [Global Delay](#global-delay)
   - [CSV Loop Start](#csv-loop-start)
4. [Copilot Workflow Example](#copilot-workflow-example)
5. [Configuration Reference](#configuration-reference)
6. [Troubleshooting](#troubleshooting)

---

## Overview

Vision features use Optical Character Recognition (OCR) to read text directly from the screen, enabling automation of interfaces where DOM selectors are unreliable or unavailable.

### How It Works

1. **Screenshot** - Captures the visible browser tab
2. **OCR Processing** - Tesseract.js extracts text and positions
3. **Text Matching** - Finds target text (e.g., "Allow" button)
4. **Coordinate Click** - Clicks at the center of matched text

### When to Use Vision

| Scenario | Use Vision? |
|----------|-------------|
| Static HTML with stable IDs | No - DOM is reliable |
| Dynamic React/Vue apps | Maybe - if selectors change |
| Copilot permission dialogs | Yes - buttons appear dynamically |
| Cross-origin iframes | Yes - can't access DOM |
| Canvas-rendered content | Yes - no DOM elements |

---

## Requirements

### Browser Permissions

Vision features require additional Chrome permissions:

- `tabs` - Access to capture visible tab
- `activeTab` - Access to current tab
- `scripting` - Inject click handlers

These are requested automatically when you first use Vision features.

### Performance Considerations

- OCR processing takes 200-500ms per capture
- Recommended poll interval: 500ms minimum
- Large screens may take longer to process

---

## Features

### Vision Recording Fallback

When you record a click on an element that can't be reliably selected via DOM, Muffin Lite automatically falls back to Vision recording.

**Indicators:**
- Step shows 👁️ Vision badge
- Path field is empty
- Vision target text is stored

**When Fallback Triggers:**
- Element has no ID or stable class
- Multiple elements match selector
- Element is inside iframe
- Element disappears quickly

### Conditional Click

The most powerful Vision feature. Polls the screen for specified button text and clicks when found.

**Adding a Conditional Click:**

1. Click **+ Add Variable**
2. Select **Conditional Click**
3. Configure:
   - **Button Texts**: Text to watch for (e.g., "Allow", "Keep")
   - **Success Text**: Text indicating completion (e.g., "committed")
   - **Timeout**: Maximum wait time in seconds
   - **Poll Interval**: How often to check (milliseconds)

**How It Works:**

```
┌─────────────────────────────────────────────┐
│                                             │
│  Poll Screen (every 500ms)                  │
│       ↓                                     │
│  Found "Allow"? ──Yes──→ Click it           │
│       ↓ No                                  │
│  Found "Keep"? ──Yes──→ Click it            │
│       ↓ No                                  │
│  Found "committed"? ──Yes──→ Success! Done  │
│       ↓ No                                  │
│  Timeout? ──Yes──→ Fail                     │
│       ↓ No                                  │
│  └──→ Poll Again                            │
│                                             │
└─────────────────────────────────────────────┘
```

### Per-Step Delays

Add a delay before any specific step executes.

**Setting a Delay:**

1. Click the **⋮** menu on a step
2. Select **Set Delay Before Step**
3. Enter delay in seconds
4. Click Save

**Indicators:**
- Step shows ⏱️ delay badge with seconds
- Delay applies before step, not after

### Global Delay

Set a default delay between all steps.

**Setting Global Delay:**

1. Find **Delay:** input in toolbar
2. Enter delay in milliseconds
3. Applies to all steps without per-step delay

**Priority:**
- Per-step delay overrides global delay
- Steps with no delay use global delay
- If global is 0, steps execute immediately

### CSV Loop Start

Control which step the CSV loop restarts from on subsequent rows.

**Setting Loop Start:**

1. Find **CSV Loop Start:** dropdown in toolbar
2. Select the step to loop from
3. Steps before loop start only run on row 1

**Example:**
```
Recording with 4 steps, Loop Start = Step 2

Row 1: Step 1 → Step 2 → Step 3 → Step 4
Row 2:          Step 2 → Step 3 → Step 4
Row 3:          Step 2 → Step 3 → Step 4
```

---

## Copilot Workflow Example

Complete example of automating Copilot smart prompt submissions.

### Recording Setup

1. **Step 1: Open Copilot** (event: open)
   - URL: Your codespace URL
   
2. **Step 2: Enter Prompt** (event: input)
   - Path: Copilot input field selector
   - Value: `{{prompt}}`
   
3. **Step 3: Send Message** (event: click)
   - Path: Send button selector
   
4. **Step 4: Wait for Buttons** (event: conditional-click)
   - Button Texts: `Allow`, `Keep`
   - Success Text: `committed`
   - Timeout: 300 seconds
   - Poll Interval: 500ms

### CSV File

```csv
prompt
"Create file: src/Button.tsx with button component"
"Create file: src/Input.tsx with input component"
"Create file: src/utils.ts with helper functions"
```

### Configuration

- **Loop Start:** Step 2 (skip opening Copilot on subsequent rows)
- **Global Delay:** 500ms (give pages time to load)

### Expected Execution

```
Row 1:
  → Open Copilot (Step 1)
  → Enter "Create file: src/Button.tsx..." (Step 2)
  → Click Send (Step 3)
  → Poll for Allow/Keep... Click Allow... Click Keep...
  → Found "committed" - Success!

Row 2:
  → Enter "Create file: src/Input.tsx..." (Step 2)
  → Click Send (Step 3)
  → Poll for Allow/Keep... Click Allow... Click Keep...
  → Found "committed" - Success!

Row 3:
  → Enter "Create file: src/utils.ts..." (Step 2)
  → Click Send (Step 3)
  → Poll for Allow/Keep... Click Allow... Click Keep...
  → Found "committed" - Success!

All 3 prompts committed!
```

---

## Configuration Reference

### Conditional Click Config

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `buttonTexts` | string[] | Required | Text to watch for and click |
| `successText` | string \| null | null | Text indicating completion |
| `timeoutSeconds` | number | 300 | Maximum wait time |
| `pollIntervalMs` | number | 500 | Time between screen checks |
| `confidenceThreshold` | number | 0.7 | OCR confidence minimum (0-1) |

### Recording Config

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `loopStartIndex` | number | 0 | Step index to loop from |
| `globalDelayMs` | number | 0 | Default delay between steps |

### Step Config

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `recordedVia` | 'dom' \| 'vision' | 'dom' | How step was recorded |
| `delaySeconds` | number \| null | null | Per-step delay override |
| `conditionalConfig` | object \| null | null | Conditional click settings |

---

## Troubleshooting

See [Troubleshooting Guide](TROUBLESHOOTING.md) for detailed solutions.

### Quick Fixes

**OCR not finding text:**
- Increase poll interval (give page time to render)
- Lower confidence threshold (0.5-0.6)
- Check text is visible on screen

**Clicks missing target:**
- Text might have moved after OCR
- Reduce poll interval for faster response
- Check for overlapping elements

**Timeout errors:**
- Increase timeout duration
- Verify success text is correct
- Check if workflow is actually completing

**High CPU usage:**
- Increase poll interval (1000ms+)
- Reduce number of conditional clicks
- Close unnecessary browser tabs
```

---

## 5. VISUAL ASSETS

### 5.1 Screenshots to Include

| Screenshot | Description | Location |
|------------|-------------|----------|
| Toolbar with Vision controls | Shows Loop Start, Delay inputs | `docs/images/vision-toolbar.png` |
| Step with Vision badge | Shows 👁️ indicator | `docs/images/vision-badge.png` |
| Conditional Click dialog | Configuration panel | `docs/images/conditional-config.png` |
| Copilot with Allow button | Target UI example | `docs/images/copilot-allow.png` |

### 5.2 Diagrams to Include

| Diagram | Description | Format |
|---------|-------------|--------|
| Vision flow | OCR → Match → Click | Mermaid or ASCII |
| Conditional loop | Poll → Check → Act | Mermaid or ASCII |
| CSV execution | Row by row with loop | Mermaid or ASCII |

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** README updated with Vision features section
- [ ] **AC-2:** Dedicated Vision docs created
- [ ] **AC-3:** All features documented with examples
- [ ] **AC-4:** Copilot workflow example complete
- [ ] **AC-5:** Configuration reference accurate
- [ ] **AC-6:** Troubleshooting section helpful
- [ ] **AC-7:** Screenshots included where helpful
- [ ] **AC-8:** Links between docs work
- [ ] **AC-9:** Markdown renders correctly
- [ ] **AC-10:** Non-technical users can follow guide

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Accuracy** - Must match actual implementation
2. **Clarity** - Understandable by non-developers
3. **Completeness** - Cover all Vision features

### Patterns to Follow

1. **Progressive disclosure** - Overview → Details
2. **Examples first** - Show before explaining
3. **Visual aids** - Screenshots and diagrams

### Edge Cases

1. **Outdated screenshots** - Note version if UI changes
2. **Platform differences** - Note Chrome-specific features
3. **Error messages** - Document common errors

---

## 8. VERIFICATION COMMANDS

```bash
# Verify README updates
grep -n "Vision Features" README.md

# Verify docs created
ls -la docs/VISION_FEATURES.md

# Check markdown links
npm run docs:check-links

# Preview documentation
npm run docs:preview
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Revert README changes
git checkout README.md

# Remove Vision docs
rm docs/VISION_FEATURES.md
```

---

## 10. REFERENCES

- Feature Spec: `/future-spec/03_feature-specs.md`
- UX Flows: `/future-spec/02_ux-flows.md`
- DOC-002: Vision Engine API Docs
- DOC-003: Troubleshooting Guide

---

*End of Specification DOC-001*
