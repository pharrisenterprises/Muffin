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

1. **Google Forms Detection**:
   - **Pattern**: `if (window.location.hostname === "docs.google.com" && pathname.startsWith("/forms"))`
   - **Strategy**: `findGFQuestionTitle(target)` finds `[role="heading"]` in ancestor `[role="listitem"]`
   - **Priority**: Highest (checked first)

2. **Input Inside `<label>`**:
   - **Pattern**: `target.closest("label")`
   - **Extract**: `labelParent.innerText.replace(/\*/g, "").trim()`
   - **Example**: `<label>Name: <input></label>` → "Name:"

3. **Label with `for` Attribute**:
   - **Pattern**: `document.querySelector(`label[for="${target.id}"]`)`
   - **Extract**: `labelByFor.textContent.trim()`
   - **Example**: `<label for="email">Email</label> <input id="email">` → "Email"

4. **ARIA Labeled By**:
   - **Pattern**: `target.getAttribute("aria-labelledby")`
   - **Extract**: `document.getElementById(labelledBy).textContent`
   - **Example**: `<span id="lbl">Phone</span> <input aria-labelledby="lbl">` → "Phone"

5. **ARIA Label**:
   - **Pattern**: `target.getAttribute("aria-label")`
   - **Extract**: Direct attribute value
   - **Example**: `<button aria-label="Submit Form">` → "Submit Form"

6. **Custom Form Entity**:
   - **Pattern**: `target.closest(".form_entity")` → `.querySelector(".form_label")`
   - **Extract**: Form label text
   - **Framework**: Custom form libraries (Jotform-style)

7. **Select2 Dropdown**:
   - **Pattern**: `target.closest('[role="listbox"]') && target.getAttribute('data-select2-id')`
   - **Strategy**: Trace `data-select2-id` → `[role="combobox"]` → original `<select>` → placeholder or parent `.label`
   - **Complexity**: 3-step DOM traversal

8. **Bootstrap Row Header Matching**:
   - **Pattern**: Input in `.row` → find first `.row` in `.modal-body` → match `.col-md-3` column index
   - **Extract**: Header row's corresponding column text
   - **Example**: Table-like layouts with header row

9. **Bootstrap Data Role**:
   - **Pattern**: `.row[data-role='add-property-info']` → `.col-md-2` sibling
   - **Extract**: Label column text

10. **Bootstrap Property Values**:
    - **Pattern**: Parent has `data-role="property-values"` → previous sibling `.col-md-2`
    - **Extract**: Label from preceding column

11. **Generic Bootstrap Column**:
    - **Pattern**: `.row` → find current `.col-md-*` → check previous sibling is `.col-md-2` or `.col-md-3`
    - **Extract**: Previous column text

12. **Column Header Matching**:
    - **Pattern**: Find current `.col-md-*` → find parent `.row` → find previous sibling `.row` (header row) → match column index
    - **Extract**: Header row's corresponding column

13. **Generic Container Labels**:
    - **Pattern**: `target.closest("div, td, th, span, p, section")` → query for `.form_label`, `.field-label`, `.label`, `.question`, `[role='heading']`
    - **Extract**: Special label element text or last `<label>` in container

14. **Previous Sibling Text**:
    - **Pattern**: Walk `previousSibling` nodes, check for TEXT_NODE or ELEMENT_NODE with text
    - **Extract**: First non-empty text

15. **Table Cell Context**:
    - **Pattern**: `target.closest("tr")` → find `<td>` index → extract previous `<td>` text
    - **Extract**: Previous cell text (row header pattern)

16. **Final Fallbacks**:
    - **input/select/textarea**: `name` attribute, `data-role` attribute, `value` attribute
    - **button/anchor**: `innerText`
    - **Ultimate**: `undefined`

### Helper Functions

- `getOriginalSelect(el)`: Traces Select2 spans back to original `<select>` element
- `findGFQuestionTitle(target)`: Google Forms-specific label extraction
- `getNodeText(el)`: Safely extracts and trims textContent, removes asterisks

## Critical Dependencies

### DOM APIs
- `Element.closest()`: Ancestor traversal
- `Element.querySelector()`, `querySelectorAll()`: Descendant queries
- `document.getElementById()`, `getElementsByName()`: Global queries
- `Node.previousSibling`, `Node.parentElement`: DOM traversal
- `element.textContent`, `innerText`, `getAttribute()`

### Browser APIs
- `window.location.hostname`, `window.location.pathname`: Site detection

### Assumptions
- HTML follows semantic patterns (labels near inputs)
- CSS class names indicate structure (`.form_label`, `.col-md-3`)
- Frameworks use consistent naming (Bootstrap, Google Forms, Select2)

## Hidden Assumptions

1. **Strategy Order Matters**:
   - More specific strategies (Google Forms) before generic (sibling text)
   - **Assumption**: Order optimized for most common patterns

2. **Asterisk Removal**:
   - All text cleaned: `.replace(/\*/g, "")`
   - **Assumption**: Asterisks always indicate "required" markers, never part of label

3. **Bootstrap Class Names**:
   - Hardcoded: `.col-md-2`, `.col-md-3`, `.modal-body`, `.row`
   - **Assumption**: Sites use standard Bootstrap grid system

4. **Google Forms DOM Structure**:
   - Depends on: `[role="heading"]`, `[role="listitem"]`, `[role="radio"]`, `.M7eMe`
   - **Assumption**: Google doesn't change their DOM structure

5. **Select2 Data Attributes**:
   - Relies on: `data-select2-id`, `[role="combobox"]`, `[role="listbox"]`
   - **Assumption**: Select2 library structure remains stable

6. **Last Label Wins**:
   - If multiple labels in container, takes last one
   - **Assumption**: Last label is closest/most relevant

7. **Text Node Trimming**:
   - All extracted text trimmed (`.trim()`)
   - **Assumption**: Whitespace not significant in labels

## Stability Concerns

1. **Framework Version Changes**:
   - **Risk**: Bootstrap 5 → 6, Select2 updates, Google Forms redesigns break selectors
   - **Impact**: Label extraction fails, falls back to generic strategies
   - **Mitigation**: Layered fallbacks provide resilience

2. **CSS Selector Brittleness**:
   - **Risk**: Custom themes override Bootstrap class names
   - **Impact**: Column matching strategies fail

3. **Overly Specific Patterns**:
   - **Risk**: Strategies too tailored to specific sites
   - **Example**: `.form_entity` may only work on Jotform
   - **Impact**: Useless on other sites

4. **Performance**:
   - **Risk**: 12+ DOM queries per element (expensive)
   - **Impact**: Slow on pages with many form fields
   - **Mitigation**: Early returns on success

5. **Memory/Caching**:
   - **Risk**: No caching; same element queried multiple times
   - **Impact**: Redundant computation
   - **Recommendation**: Cache results by element reference

## Edge Cases

1. **Multiple Labels**:
   - **Handling**: Returns first match in strategy order
   - **Edge**: Element has both `<label>` and `aria-label`; `<label>` wins

2. **Empty Labels**:
   - **Handling**: `.trim()` returns empty string → continue to next strategy
   - **Edge**: Label exists but has no text (icon-only)

3. **Nested Labels**:
   - **Handling**: `closest()` finds nearest ancestor
   - **Edge**: Nested `<label>` tags (invalid HTML) → first ancestor wins

4. **Dynamic Content**:
   - **Handling**: Queries DOM at capture time
   - **Edge**: Label added after input via JS → not found if queried too early

5. **Shadow DOM**:
   - **Handling**: `closest()` stops at shadow boundary
   - **Edge**: Label outside shadow, input inside → not found

6. **Non-English Text**:
   - **Handling**: Extracts text as-is
   - **Edge**: RTL languages, special characters preserved

7. **Very Long Labels**:
   - **Handling**: No truncation
   - **Edge**: Multi-paragraph labels extracted in full

8. **Invisible Labels**:
   - **Handling**: No visibility check; extracts even if `display:none`
   - **Edge**: Screen-reader-only labels included

## Developer-Must-Know Notes

1. **Adding New Strategies**:
   - **Where**: Insert in `getLabelForTarget()` function
   - **Order**: Place specific patterns before generic fallbacks
   - **Pattern**:
     ```typescript
     // Case N: New framework detection
     const customLabel = target.closest(".my-framework-field")?.querySelector(".my-label");
     if (customLabel?.textContent?.trim()) {
       return customLabel.textContent.trim();
     }
     ```

2. **Google Forms Special Handling**:
   - **Why**: Google Forms uses complex role-based structure
   - **Detection**: Hostname + pathname check
   - **Strategy**: Traverse to `[role="listitem"]` container, find `[role="heading"]`

3. **Select2 Complexity**:
   - **Why**: Select2 hides original `<select>`, creates custom dropdown
   - **Challenge**: Must trace generated elements back to original
   - **Pattern**: `data-select2-id` attribute links generated UI to original select

4. **Bootstrap Grid Matching**:
   - **Why**: Layouts use header rows for column labels
   - **Pattern**: Match column index in current row to column in header row
   - **Caveat**: Assumes consistent column counts

5. **Performance Optimization**:
   - **Current**: Early return on first match
   - **Opportunity**: Cache results in WeakMap<HTMLElement, string>
   - **Trade-off**: Memory vs. CPU

6. **Testing Strategy**:
   - **Unit test**: Mock DOMs for each strategy
   - **Integration test**: Real page samples (Google Forms, Bootstrap forms, etc.)
   - **Regression test**: Snapshot tests for known label patterns

7. **Debugging Tips**:
   - Add console.log at each strategy to see which one matched
   - Use Chrome DevTools → Elements → Properties to inspect element attributes
   - Test in isolation: `getLabelForTarget(document.querySelector("#myInput"))`

8. **Internationalization**:
   - **Current**: No i18n; extracts text as-is
   - **Future**: Consider normalizing (e.g., lowercase) for comparison

9. **Accessibility**:
   - **Good**: Checks aria-label and aria-labelledby
   - **Better**: Could check aria-describedby for additional context

10. **Code Smell**:
    - **Issue**: 350-line function with 16 return statements
    - **Recommendation**: Refactor to strategy pattern (array of finder functions)
    - **Pattern**:
      ```typescript
      const strategies = [
        findGoogleFormsLabel,
        findLabelParent,
        findLabelFor,
        findAriaLabel,
        // ...
      ];
      for (const strategy of strategies) {
        const label = strategy(target);
        if (label) return label;
      }
      ```
