# DOM Label Extraction — Component Breakdown

## Purpose
DOM label extraction is a subsystem within the content script recorder that discovers human-readable labels for form fields and interactive elements. It implements 12+ cascading heuristic strategies to extract labels from various HTML patterns (standard forms, Bootstrap layouts, Google Forms, Select2 dropdowns, custom frameworks). The goal is to provide meaningful field names ("First Name", "Email Address") instead of technical identifiers (input#field_42) for user-facing automation steps.

## Inputs
- **HTMLElement**: Target form element (input, select, textarea, button, etc.)
- **Document Context**: Surrounding DOM structure for label discovery
- **Window Location**: Used to detect special cases (e.g., docs.google.com/forms)

## Outputs
- **string | undefined**: Human-readable label text
  - Examples: "First Name", "Email Address", "Select Country", "Agree to Terms"
  - `undefined` if no label found after all strategies exhausted

## Internal Architecture

### Key Function
- **Primary**: `getLabelForTarget(target: HTMLElement): string | undefined`
  - Location: `src/contentScript/content.tsx` (~350 lines of function)
  - Implements 12+ strategies in specific fallback order

### Label Extraction Strategies

1. **Google Forms Detection**: `findGFQuestionTitle(target)` finds `[role="heading"]` in ancestor `[role="listitem"]`
2. **Input Inside `<label>`**: `target.closest("label")` → extract innerText
3. **Label with `for` Attribute**: `document.querySelector('label[for="' + target.id + '"]')`
4. **ARIA Labeled By**: `target.getAttribute("aria-labelledby")` → getElementById
5. **ARIA Label**: `target.getAttribute("aria-label")` direct value
6. **Custom Form Entity**: `.form_entity` → `.form_label` (Jotform-style)
7. **Select2 Dropdown**: Trace `data-select2-id` to original `<select>`
8. **Bootstrap Row Header Matching**: Match column index to header row
9. **Bootstrap Data Role**: `.row[data-role='add-property-info']` patterns
10. **Generic Bootstrap Column**: Previous sibling `.col-md-2` or `.col-md-3`
11. **Column Header Matching**: Match current column to header row column
12. **Generic Container Labels**: `.form_label`, `.field-label`, `.label`, `.question`
13. **Previous Sibling Text**: Walk previousSibling for TEXT_NODE
14. **Table Cell Context**: Previous `<td>` text in row
15. **Final Fallbacks**: `name` attribute, `data-role`, `value`, `innerText`

## Critical Dependencies

### DOM APIs
- `Element.closest()`: Ancestor traversal
- `Element.querySelector()`, `querySelectorAll()`: Descendant queries
- `document.getElementById()`, `getElementsByName()`: Global queries
- `Node.previousSibling`, `Node.parentElement`: DOM traversal

### Assumptions
- HTML follows semantic patterns (labels near inputs)
- CSS class names indicate structure (`.form_label`, `.col-md-3`)
- Frameworks use consistent naming (Bootstrap, Google Forms, Select2)

## Hidden Assumptions

1. **Strategy Order Matters**: More specific strategies (Google Forms) before generic (sibling text)
2. **Asterisk Removal**: All text cleaned: `.replace(/\*/g, "")` assumes asterisks indicate "required"
3. **Bootstrap Class Names**: Hardcoded: `.col-md-2`, `.col-md-3`, `.modal-body`, `.row`
4. **Google Forms DOM Structure**: Depends on `[role="heading"]`, `[role="listitem"]`
5. **Select2 Data Attributes**: Relies on `data-select2-id`, `[role="combobox"]`
6. **Last Label Wins**: If multiple labels in container, takes last one

## Stability Concerns

1. **Framework Version Changes**: Bootstrap 5 → 6, Select2 updates, Google Forms redesigns break selectors
2. **CSS Selector Brittleness**: Custom themes override Bootstrap class names
3. **Overly Specific Patterns**: `.form_entity` may only work on Jotform
4. **Performance**: 12+ DOM queries per element (expensive on large forms)
5. **No Caching**: Same element queried multiple times

## Developer-Must-Know Notes

1. **Adding New Strategies**: Insert in `getLabelForTarget()` before generic fallbacks
2. **Google Forms Special Handling**: Uses role-based structure traversal
3. **Select2 Complexity**: Must trace generated elements back to original `<select>`
4. **Bootstrap Grid Matching**: Matches column index in current row to header row
5. **Performance Optimization**: Early return on first match; could cache in WeakMap
6. **Code Smell**: 350-line function with 16 return statements—consider refactoring to strategy pattern

## Phase 3 Integration Points

### Recording System (Phase 3A)
- **Replacement**: DOMCapture layer uses enhanced label extraction
- **Migration**: All 15 strategies become modular LabelStrategy classes
- **Integration**: RecordingOrchestrator coordinates label extraction with other evidence

### CDP Services (Phase 3B)
- **Input**: AccessibilityService provides ARIA tree as fallback
- **Output**: Playwright-style accessibility labels supplement DOM strategies
- **Integration**: Label extraction tries CDP accessibility before generic fallbacks

### Strategy System (Phase 3C)
- **Input**: DecisionEngine scores label quality (confidence 0.0-1.0)
- **Output**: High-confidence labels used for step display and matching
- **Integration**: Label confidence affects overall step reliability score

**Legacy Issues**:
1. **Monolithic function**: 350 lines of tightly coupled logic
2. **No confidence scoring**: All labels treated equally
3. **Framework-specific hacks**: Google Forms, Select2, Bootstrap hardcoded
4. **No accessibility fallback**: Doesn't use CDP accessibility tree

**Phase 3 Improvements**:
1. **Modular strategies**: 15 independent LabelStrategy classes
2. **Confidence scoring**: Each label has quality metric (exact match=1.0, sibling text=0.3)
3. **Framework detection**: Dynamic detection instead of hardcoded checks
4. **Accessibility integration**: CDP accessibility tree as high-confidence source

**Last Updated**: December 7, 2025 — Phase 3 Specification Complete
