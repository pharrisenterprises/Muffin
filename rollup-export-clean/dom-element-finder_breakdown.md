# DOM Element Finder Breakdown

## Purpose
**What it does:** Multi-strategy element location system that attempts to find target DOM elements during test playback using 6+ progressive fallback strategies. Core to the replay engine's robustness against DOM changes between recording and playback.

**Where it lives:** Embedded within `playAction` function in `src/contentScript/content.tsx` (lines ~700-900)

**Why it exists:** Recorded XPath selectors often become invalid between recording and playback due to:
- Dynamic content changes
- Component rerendering
- DOM structure modifications
- Framework-specific element recreation (React, Angular)

## Inputs
**Data Requirements:**
```typescript
{
  bundle: {
    xpath?: string;           // Primary location strategy
    id?: string;              // Fallback #1: Element ID
    name?: string;            // Fallback #2: name attribute
    className?: string;       // Fallback #3: class names
    dataAttrs?: Record<string, string>;  // Fallback #4: data-* attributes
    aria?: string;            // Fallback #5: ARIA label
    placeholder?: string;     // Fallback #6: placeholder text
    tag?: string;             // Element type for validation
    iframeChain?: IframeInfo[];  // Cross-frame navigation
    shadowHosts?: string[];   // Shadow DOM traversal
    isClosedShadow?: boolean; // Closed shadow root flag
  };
}
```

## Outputs
**Returns:**
- **Success:** `HTMLElement` - Found target element
- **Failure:** `null` - No element found after all strategies exhausted

**Side Effects:**
- Console warnings for each failed strategy
- May trigger CDP commands for closed shadow roots
- Logs debug information to console

## Internal Architecture

### Execution Flow
```
1. Get document context (iframe/shadow DOM aware)
2. Strategy #1: Try XPath (bundle.xpath)
3. Strategy #2: Try document.getElementById(bundle.id)
4. Strategy #3: Try document.getElementsByName(bundle.name)[0]
5. Strategy #4: Try querySelector by className
6. Strategy #5: Try data-* attribute selectors
7. Strategy #6: Try ARIA label matching
8. Strategy #7: Try placeholder attribute
9. Return null if all fail
```

## Critical Dependencies
**Upstream:**
- **Bundle creation** (recording phase) - Must capture all fallback identifiers
- **getDocumentForBundle()** - Context resolution for iframe/shadow DOM
- **traverseIframesAndShadowRoots()** - Cross-boundary navigation

**Downstream:**
- **humanLikeClick()** - Click action executor
- **setNativeValue()** - Input manipulation (React-safe)
- **notification overlay** - User feedback on failures

**External:**
- **XPath API** (`document.evaluate`) - Primary strategy
- **Chrome DevTools Protocol** - Closed shadow root access

## Hidden Assumptions
1. **Strategies ordered by reliability** - XPath first, attributes last
2. **One element per strategy** - Takes first match (no disambiguation)
3. **Document context stable** - Assumes `getDocumentForBundle()` returns correct context
4. **No timeout between strategies** - Tries all immediately (no delays)
5. **Class selectors space-separated** - Assumes standard class name format
6. **Data attributes prefixed with "data-"** - Follows HTML5 convention
7. **ARIA labels unique** - Doesn't handle duplicate aria-label values
8. **Name attributes for form elements** - Primarily for `<input name="...">`

## Stability Concerns
### High-Risk Patterns
1. **XPath brittleness** - Absolute paths break on DOM structure changes
2. **Class name strategy too broad** - Matches first element with classes
3. **No visual validation** - Doesn't check if found element is visible
4. **Race conditions** - No wait for element to appear

### Failure Modes
- **All strategies fail** → Returns null, playback stops
- **Wrong element found** → Executes action on incorrect target
- **Multiple matches** → Takes first, may be wrong instance
- **Element exists but invisible** → Action may fail silently

## Developer-Must-Know Notes
- This is the **most critical fallback system** in the replayer
- XPath is fastest but least reliable; data attributes are slowest but most stable
- No async delays - runs synchronously
- Average execution time: <10ms (fast strategies first)

## Phase 3 Integration Points

### Strategy System (Phase 3C)
- **Replacement**: Each fallback strategy becomes StrategyEvaluator
- **Migration**: 
  - XPath → DOMStrategy
  - ID/name/aria → DOMStrategy with different locator types
  - Bounding box → VisionStrategy with screenshot comparison
- **Integration**: DecisionEngine scores all strategies in parallel

### Self-Healing (Phase 3F)
- **Input**: HealingOrchestrator attempts repair on failure
- **Output**: AlternativeSelector found via AI vision
- **Integration**: Replaces sequential fallback with intelligent healing

### Evidence Scoring (Phase 3D)
- **Input**: EvidenceScorer ranks locator quality during recording
- **Output**: Confidence scores for each strategy (0.0-1.0)
- **Integration**: High-confidence strategies tried first during playback

**Legacy Issues**:
1. **Sequential fallback**: Wastes time trying invalid strategies
2. **No learning**: Same fallback order every time
3. **Binary results**: No partial matches or confidence scores
4. **No vision fallback**: Text matching limited to DOM attributes

**Phase 3 Improvements**:
1. **Parallel evaluation**: All strategies scored simultaneously
2. **Telemetry-driven**: DecisionEngine learns optimal strategy per step type
3. **Confidence scoring**: Each locator has quality metric (0.0-1.0)
4. **Vision fallback**: OCR + screenshot comparison as ultimate fallback

**Last Updated**: December 7, 2025 — Phase 3 Specification Complete
