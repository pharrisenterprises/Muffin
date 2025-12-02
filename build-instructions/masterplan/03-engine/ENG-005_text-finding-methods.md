# ENG-005: TEXT FINDING METHODS SPECIFICATION

> **Build Card:** ENG-005  
> **Category:** Engine / Core  
> **Dependencies:** ENG-004 (OCR text recognition)  
> **Risk Level:** Low  
> **Estimated Lines:** ~400

---

## 1. PURPOSE

This specification implements the text finding methods for the VisionEngine. These methods search OCR results for specific text and return clickable targets:

1. **findText()** - Find first occurrence of any search term
2. **findAllText()** - Find all occurrences of search terms
3. **Matching options** - Case sensitivity, exact match, partial match
4. **Result ranking** - Order by confidence, position, or relevance
5. **Scroll support** - Find text that may require scrolling

This implements the `findText()` and `findAllText()` method stubs from ENG-001.

---

## 2. INPUTS / REQUIRED REFERENCES

| Reference | Location | What to Extract |
|-----------|----------|-----------------|
| ENG-001 | VisionEngine shell | Method signatures |
| ENG-004 | OCR recognition | scanViewport() method |
| FND-006 | TextResult interface | Input format |
| FND-007 | ClickTarget interface | Output format |
| textResultUtils.ts | Utility library | Helper functions |

---

## 3. OUTPUT

### Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `src/lib/visionEngine.ts` | MODIFY | Implement find methods |
| `src/lib/textMatcher.ts` | CREATE | Text matching utilities |

### Implementation Details

| Method | Status | Description |
|--------|--------|-------------|
| `findText()` | IMPLEMENT | Full implementation |
| `findAllText()` | IMPLEMENT | Full implementation |
| `findTextWithScroll()` | ADD | Find with scroll support |

---

## 4. DETAILED SPECIFICATION

### 4.1 Text Matcher Utilities

Create `src/lib/textMatcher.ts`:

```typescript
/**
 * @fileoverview Text matching utilities for Vision text finding
 * @module lib/textMatcher
 * 
 * Provides utilities for matching search terms against OCR results
 * with support for various matching modes.
 */

import type { TextResult, ClickTarget } from '@/types';

/**
 * Text matching options
 */
export interface MatchOptions {
  /** Case-sensitive matching (default: false) */
  caseSensitive?: boolean;
  /** Require exact match, not substring (default: false) */
  exactMatch?: boolean;
  /** Minimum confidence threshold */
  minConfidence?: number;
  /** Match whole words only (default: false) */
  wholeWord?: boolean;
}

/**
 * Match result with additional metadata
 */
export interface MatchResult {
  /** The matched TextResult */
  textResult: TextResult;
  /** Which search term matched */
  matchedTerm: string;
  /** Match score (for ranking) */
  score: number;
  /** Index of matched term in search array */
  termIndex: number;
}

/**
 * Checks if a text matches a search term
 * @param text - Text to check
 * @param term - Search term
 * @param options - Match options
 * @returns True if matches
 */
export function textMatches(
  text: string,
  term: string,
  options: MatchOptions = {}
): boolean {
  const {
    caseSensitive = false,
    exactMatch = false,
    wholeWord = false,
  } = options;

  let haystack = text;
  let needle = term;

  // Handle case sensitivity
  if (!caseSensitive) {
    haystack = haystack.toLowerCase();
    needle = needle.toLowerCase();
  }

  // Trim for comparison
  haystack = haystack.trim();
  needle = needle.trim();

  if (exactMatch) {
    return haystack === needle;
  }

  if (wholeWord) {
    // Use word boundary matching
    const regex = new RegExp(`\\b${escapeRegex(needle)}\\b`, caseSensitive ? '' : 'i');
    return regex.test(text);
  }

  // Default: substring match
  return haystack.includes(needle);
}

/**
 * Escapes special regex characters
 * @param str - String to escape
 * @returns Escaped string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Finds all matching TextResults for given search terms
 * @param results - OCR results to search
 * @param searchTerms - Terms to search for
 * @param options - Match options
 * @returns Array of match results
 */
export function findMatches(
  results: TextResult[],
  searchTerms: string[],
  options: MatchOptions = {}
): MatchResult[] {
  const { minConfidence = 0 } = options;
  const matches: MatchResult[] = [];

  for (const result of results) {
    // Skip if below confidence threshold
    if (result.confidence < minConfidence) {
      continue;
    }

    // Check against each search term
    for (let termIndex = 0; termIndex < searchTerms.length; termIndex++) {
      const term = searchTerms[termIndex];

      if (textMatches(result.text, term, options)) {
        // Calculate match score
        const score = calculateMatchScore(result, term, termIndex, options);

        matches.push({
          textResult: result,
          matchedTerm: term,
          score,
          termIndex,
        });

        // Only match once per result (use first matching term)
        break;
      }
    }
  }

  return matches;
}

/**
 * Calculates a match score for ranking
 * Higher score = better match
 * @param result - The matched TextResult
 * @param term - The matched term
 * @param termIndex - Index of term in search array
 * @param options - Match options
 * @returns Score (0-100)
 */
function calculateMatchScore(
  result: TextResult,
  term: string,
  termIndex: number,
  options: MatchOptions
): number {
  let score = result.confidence;

  // Bonus for exact match
  const textNorm = options.caseSensitive ? result.text.trim() : result.text.trim().toLowerCase();
  const termNorm = options.caseSensitive ? term.trim() : term.trim().toLowerCase();
  
  if (textNorm === termNorm) {
    score += 20; // Exact match bonus
  }

  // Bonus for earlier terms in search array (prioritized)
  score += (10 - Math.min(termIndex, 10)) * 2;

  // Penalty for very long text (likely a sentence, not a button)
  if (result.text.length > 30) {
    score -= 10;
  }

  // Bonus for reasonable button-like dimensions
  const { width, height } = result.bounds;
  if (width >= 30 && width <= 300 && height >= 15 && height <= 60) {
    score += 10;
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Finds the best match from a list of matches
 * @param matches - Match results to rank
 * @returns Best match or null
 */
export function findBestMatch(matches: MatchResult[]): MatchResult | null {
  if (matches.length === 0) {
    return null;
  }

  // Sort by score descending
  const sorted = [...matches].sort((a, b) => b.score - a.score);
  return sorted[0];
}

/**
 * Converts a TextResult to a ClickTarget
 * @param result - TextResult to convert
 * @param matchedTerm - Optional matched term for metadata
 * @returns ClickTarget
 */
export function toClickTarget(
  result: TextResult,
  matchedTerm?: string
): ClickTarget {
  return {
    x: result.bounds.centerX,
    y: result.bounds.centerY,
    width: result.bounds.width,
    height: result.bounds.height,
    matchedText: result.text,
    confidence: result.confidence,
  };
}

/**
 * Converts multiple TextResults to ClickTargets
 * @param results - TextResults to convert
 * @returns Array of ClickTargets
 */
export function toClickTargets(results: TextResult[]): ClickTarget[] {
  return results.map((r) => toClickTarget(r));
}

/**
 * Ranks matches by priority
 * @param matches - Matches to rank
 * @param priorityTerms - Terms that should be prioritized
 * @returns Ranked matches
 */
export function rankMatches(
  matches: MatchResult[],
  priorityTerms?: string[]
): MatchResult[] {
  return [...matches].sort((a, b) => {
    // Priority terms come first
    if (priorityTerms) {
      const aPriority = priorityTerms.includes(a.matchedTerm);
      const bPriority = priorityTerms.includes(b.matchedTerm);
      if (aPriority && !bPriority) return -1;
      if (!aPriority && bPriority) return 1;
    }

    // Then by score
    return b.score - a.score;
  });
}

/**
 * Groups matches by their matched term
 * @param matches - Matches to group
 * @returns Map of term to matches
 */
export function groupByTerm(
  matches: MatchResult[]
): Map<string, MatchResult[]> {
  const groups = new Map<string, MatchResult[]>();

  for (const match of matches) {
    const existing = groups.get(match.matchedTerm) || [];
    existing.push(match);
    groups.set(match.matchedTerm, existing);
  }

  return groups;
}

/**
 * Filters matches to only include the best match per term
 * @param matches - Matches to filter
 * @returns Best match for each term
 */
export function bestMatchPerTerm(matches: MatchResult[]): MatchResult[] {
  const groups = groupByTerm(matches);
  const best: MatchResult[] = [];

  for (const [_, groupMatches] of groups) {
    const bestInGroup = findBestMatch(groupMatches);
    if (bestInGroup) {
      best.push(bestInGroup);
    }
  }

  return rankMatches(best);
}
```

### 4.2 VisionEngine Text Finding Implementation

Update `src/lib/visionEngine.ts` - replace the `findText()` and `findAllText()` stubs:

```typescript
// Add imports
import {
  findMatches,
  findBestMatch,
  toClickTarget,
  toClickTargets,
  rankMatches,
  type MatchOptions,
  type MatchResult,
} from './textMatcher';

// Replace findText() method
/**
 * Finds the first occurrence of any search term in the viewport
 * 
 * @param searchTerms - Terms to search for (checked in order)
 * @param options - Search options
 * @returns ClickTarget if found, null otherwise
 * 
 * @example
 * ```typescript
 * const target = await engine.findText(['Allow', 'Keep', 'Accept']);
 * if (target) {
 *   console.log(`Found "${target.matchedText}" at (${target.x}, ${target.y})`);
 * }
 * ```
 */
async findText(
  searchTerms: string[],
  options: Omit<FindTextOptions, 'searchTerms'> = {}
): Promise<ClickTarget | null> {
  this.ensureReady();

  if (searchTerms.length === 0) {
    console.warn('[VisionEngine] findText called with empty search terms');
    return null;
  }

  try {
    // Scan viewport for text
    const ocrResults = await this.scanViewport({
      confidenceThreshold: options.confidenceThreshold,
      region: options.region,
      skipCache: options.skipCache,
    });

    if (ocrResults.length === 0) {
      console.log('[VisionEngine] No text found in viewport');
      return null;
    }

    // Find matches
    const matchOptions: MatchOptions = {
      caseSensitive: options.caseSensitive ?? false,
      exactMatch: options.exactMatch ?? false,
      minConfidence: options.confidenceThreshold ?? this.config.confidenceThreshold,
    };

    const matches = findMatches(ocrResults, searchTerms, matchOptions);

    if (matches.length === 0) {
      console.log('[VisionEngine] No matches found for:', searchTerms);
      return null;
    }

    // Find best match
    const bestMatch = findBestMatch(matches);
    
    if (!bestMatch) {
      return null;
    }

    const clickTarget = toClickTarget(bestMatch.textResult, bestMatch.matchedTerm);

    console.log('[VisionEngine] Found text:', {
      text: clickTarget.matchedText,
      term: bestMatch.matchedTerm,
      confidence: clickTarget.confidence,
      position: `(${clickTarget.x}, ${clickTarget.y})`,
      score: bestMatch.score,
    });

    return clickTarget;

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Text search failed';
    console.error('[VisionEngine] findText error:', message);
    throw new Error(`Text search failed: ${message}`);
  }
}

// Replace findAllText() method
/**
 * Finds all occurrences of search terms in the viewport
 * 
 * @param searchTerms - Terms to search for
 * @param options - Search options
 * @returns Array of ClickTargets (empty if none found)
 * 
 * @example
 * ```typescript
 * const targets = await engine.findAllText(['Allow', 'Keep']);
 * console.log(`Found ${targets.length} matching elements`);
 * 
 * for (const target of targets) {
 *   console.log(`"${target.matchedText}" at (${target.x}, ${target.y})`);
 * }
 * ```
 */
async findAllText(
  searchTerms: string[],
  options: Omit<FindTextOptions, 'searchTerms'> = {}
): Promise<ClickTarget[]> {
  this.ensureReady();

  if (searchTerms.length === 0) {
    console.warn('[VisionEngine] findAllText called with empty search terms');
    return [];
  }

  try {
    // Scan viewport for text
    const ocrResults = await this.scanViewport({
      confidenceThreshold: options.confidenceThreshold,
      region: options.region,
      skipCache: options.skipCache,
    });

    if (ocrResults.length === 0) {
      console.log('[VisionEngine] No text found in viewport');
      return [];
    }

    // Find matches
    const matchOptions: MatchOptions = {
      caseSensitive: options.caseSensitive ?? false,
      exactMatch: options.exactMatch ?? false,
      minConfidence: options.confidenceThreshold ?? this.config.confidenceThreshold,
    };

    let matches = findMatches(ocrResults, searchTerms, matchOptions);

    if (matches.length === 0) {
      console.log('[VisionEngine] No matches found for:', searchTerms);
      return [];
    }

    // Rank matches
    matches = rankMatches(matches);

    // Apply limit if specified
    if (options.maxResults && options.maxResults > 0) {
      matches = matches.slice(0, options.maxResults);
    }

    // Convert to ClickTargets
    const clickTargets = matches.map((m) => 
      toClickTarget(m.textResult, m.matchedTerm)
    );

    console.log('[VisionEngine] Found all text:', {
      terms: searchTerms,
      matchCount: clickTargets.length,
    });

    return clickTargets;

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Text search failed';
    console.error('[VisionEngine] findAllText error:', message);
    throw new Error(`Text search failed: ${message}`);
  }
}

// Add new method for finding with scroll
/**
 * Finds text with scroll support
 * Scrolls through the page to find text that may be below the fold
 * 
 * @param searchTerms - Terms to search for
 * @param options - Search options
 * @returns ClickTarget if found, null otherwise
 */
async findTextWithScroll(
  searchTerms: string[],
  options: Omit<FindTextOptions, 'searchTerms'> & {
    maxScrolls?: number;
    scrollDirection?: 'down' | 'up';
  } = {}
): Promise<ClickTarget | null> {
  this.ensureReady();

  const maxScrolls = options.maxScrolls ?? this.config.scrollRetries;
  const scrollDirection = options.scrollDirection ?? 'down';

  // First check current viewport
  let target = await this.findText(searchTerms, { ...options, skipCache: true });
  if (target) {
    return target;
  }

  // Scroll and search
  for (let scroll = 0; scroll < maxScrolls; scroll++) {
    console.log(`[VisionEngine] Scroll attempt ${scroll + 1}/${maxScrolls}`);

    // Scroll the page
    await this.scrollPage(scrollDirection);

    // Wait for content to settle
    await this.sleep(300);

    // Search again
    target = await this.findText(searchTerms, { ...options, skipCache: true });
    if (target) {
      return target;
    }
  }

  console.log('[VisionEngine] Text not found after scrolling');
  return null;
}

// Add helper method for scrolling
/**
 * Scrolls the page in the specified direction
 * @param direction - Scroll direction
 * @param tabId - Tab to scroll (defaults to active)
 */
private async scrollPage(
  direction: 'down' | 'up' = 'down',
  tabId?: number
): Promise<void> {
  const targetTabId = tabId || (await this.getActiveTabId());
  
  await chrome.scripting.executeScript({
    target: { tabId: targetTabId },
    func: (dir: string) => {
      const scrollAmount = window.innerHeight * 0.8;
      window.scrollBy({
        top: dir === 'down' ? scrollAmount : -scrollAmount,
        behavior: 'smooth',
      });
    },
    args: [direction],
  });
}

// Add sleep helper
/**
 * Sleeps for specified milliseconds
 * @param ms - Milliseconds to sleep
 */
private sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

---

## 5. CODE EXAMPLES

### 5.1 Basic Text Finding

```typescript
import { VisionEngine } from '@/lib/visionEngine';

const engine = new VisionEngine();
await engine.initialize();

// Find first match
const target = await engine.findText(['Allow', 'Keep', 'Accept']);
if (target) {
  console.log(`Found: ${target.matchedText}`);
}

// Find all matches
const allTargets = await engine.findAllText(['Allow', 'Keep']);
console.log(`Found ${allTargets.length} buttons`);
```

### 5.2 Advanced Matching Options

```typescript
// Case-sensitive exact match
const target = await engine.findText(['Submit'], {
  caseSensitive: true,
  exactMatch: true,
});

// High confidence only
const highConfTarget = await engine.findText(['Allow'], {
  confidenceThreshold: 85,
});

// Limited results
const topThree = await engine.findAllText(['button'], {
  maxResults: 3,
});
```

### 5.3 Finding with Scroll

```typescript
// Search with scrolling if not found
const target = await engine.findTextWithScroll(['Terms and Conditions'], {
  maxScrolls: 5,
  scrollDirection: 'down',
});

if (target) {
  console.log('Found after scrolling!');
}
```

### 5.4 Using Match Results

```typescript
const targets = await engine.findAllText(['Allow', 'Deny', 'Skip']);

// Process each target
for (const target of targets) {
  console.log({
    text: target.matchedText,
    position: `(${target.x}, ${target.y})`,
    size: `${target.width}x${target.height}`,
    confidence: target.confidence,
  });
}
```

---

## 6. ACCEPTANCE CRITERIA

- [ ] **AC-1:** `findText()` returns first matching ClickTarget
- [ ] **AC-2:** `findAllText()` returns all matching ClickTargets
- [ ] **AC-3:** Case-insensitive matching works by default
- [ ] **AC-4:** Case-sensitive matching works when enabled
- [ ] **AC-5:** Exact match mode works correctly
- [ ] **AC-6:** Results are ranked by score
- [ ] **AC-7:** `findTextWithScroll()` scrolls and searches
- [ ] **AC-8:** maxResults limits output correctly
- [ ] **AC-9:** Returns null/empty for no matches
- [ ] **AC-10:** TypeScript compiles without errors

---

## 7. IMPLEMENTATION NOTES

### Constraints

1. **Order matters** - Earlier search terms have higher priority
2. **Single match per result** - Each OCR result matches once
3. **Confidence threshold** - Applies before matching

### Patterns to Follow

1. **Score-based ranking** - Combine confidence with match quality
2. **Early termination** - Stop at first match for findText
3. **Cache utilization** - Use cached OCR results when fresh

### Edge Cases

1. **Empty search terms** - Return null/empty
2. **No OCR results** - Return null/empty
3. **All low confidence** - Return null/empty if below threshold

---

## 8. VERIFICATION COMMANDS

```bash
# Verify files exist
ls -la src/lib/textMatcher.ts

# Run type check
npm run type-check

# Build and test
npm run build
```

---

## 9. ROLLBACK PROCEDURE

```bash
# Revert to stub implementations
# Replace findText() and findAllText() with original stubs

# Remove matcher file
rm src/lib/textMatcher.ts
```

---

## 10. REFERENCES

- FND-006: TextResult Interface
- FND-007: ClickTarget Interface
- ENG-001: VisionEngine Class Shell
- ENG-004: OCR Text Recognition

---

*End of Specification ENG-005*
