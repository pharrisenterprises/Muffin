# VisionStrategy Content Specification

**File ID:** D3  
**File Path:** `src/background/services/strategies/VisionStrategy.ts`  
**Status:** CREATE  
**Priority:** P1

---

## Purpose

Evaluates vision-based OCR strategies (vision_ocr) during playback. Uses the VisionService to capture screenshots, perform OCR via Tesseract.js, and locate elements by their visible text content. This strategy serves as a powerful fallback when DOM-based strategies fail due to dynamic content, iframe boundaries, or canvas-rendered elements. Confidence ranges from 0.70-0.90 based on OCR quality. Essential for resilient automation that works even when page structure changes dramatically.

---

## Dependencies

### Uses (imports from)
- `../VisionService`: VisionService, VisionClickTarget, OCRResult
- `../../types/strategy`: StrategyType, LocatorStrategy

### Used By (exports to)
- `../DecisionEngine`: Uses for vision strategy evaluation
- `../strategies/index`: Re-exports strategy evaluators

---

## Interfaces

```typescript
/**
 * Vision strategy evaluator configuration
 */
interface VisionStrategyConfig {
  /** Minimum OCR confidence to accept (0-100, default: 60) */
  minOCRConfidence: number;
  /** Whether to use cached OCR results (default: true) */
  useCache: boolean;
  /** Timeout for OCR operations in ms (default: 5000) */
  ocrTimeout: number;
  /** Fuzzy text matching threshold (0-1, default: 0.8) */
  fuzzyMatchThreshold: number;
  /** Whether to try multiple text variations (default: true) */
  tryVariations: boolean;
  /** Maximum text length to search (default: 100) */
  maxTextLength: number;
}

/**
 * Vision strategy metadata
 */
interface VisionStrategyMetadata {
  /** Target text to find */
  targetText: string;
  /** Original OCR confidence when recorded (0-100) */
  ocrConfidence?: number;
  /** Bounding box from recording */
  textBbox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Whether to use exact match (default: false) */
  exact?: boolean;
  /** Whether match is case sensitive (default: false) */
  caseSensitive?: boolean;
  /** Alternative text variations */
  variations?: string[];
}

/**
 * Strategy evaluation result
 */
interface StrategyEvaluationResult {
  strategy: LocatorStrategy;
  found: boolean;
  confidence: number;
  backendNodeId?: number;
  nodeId?: number;
  clickPoint?: { x: number; y: number };
  duration: number;
  matchCount?: number;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Text match result
 */
interface TextMatchResult {
  /** Whether text was found */
  found: boolean;
  /** Matched OCR result */
  match?: OCRResult;
  /** Match quality score (0-1) */
  matchQuality: number;
  /** How text was matched */
  matchType: 'exact' | 'contains' | 'fuzzy' | 'variation';
  /** Original search text */
  searchText: string;
  /** Actual matched text */
  matchedText?: string;
}

/**
 * Text variation for fuzzy matching
 */
interface TextVariation {
  /** Variation text */
  text: string;
  /** Variation type */
  type: 'original' | 'lowercase' | 'uppercase' | 'trimmed' | 'normalized' | 'custom';
  /** Priority (higher = try first) */
  priority: number;
}
```

---

## Functions

```typescript
/**
 * VisionStrategy - Evaluates vision-based OCR strategies
 */
class VisionStrategy implements StrategyEvaluator {
  private visionService: VisionService;
  private config: VisionStrategyConfig;

  /** Strategy types handled by this evaluator */
  readonly handledTypes: StrategyType[] = ['vision_ocr'];

  /**
   * Create new VisionStrategy instance
   * @param visionService - Vision service instance
   * @param config - Strategy configuration
   */
  constructor(
    visionService: VisionService,
    config?: Partial<VisionStrategyConfig>
  );

  /**
   * Check if this evaluator handles a strategy type
   * @param type - Strategy type
   * @returns Whether handled
   */
  handles(type: StrategyType): boolean;

  /**
   * Evaluate a vision OCR strategy
   * @param tabId - Target tab
   * @param strategy - Strategy to evaluate
   * @returns Evaluation result
   */
  async evaluate(tabId: number, strategy: LocatorStrategy): Promise<StrategyEvaluationResult>;

  /**
   * Find text using OCR
   * @param tabId - Target tab
   * @param targetText - Text to find
   * @param options - Search options
   * @returns Text match result
   */
  async findText(
    tabId: number,
    targetText: string,
    options?: {
      exact?: boolean;
      caseSensitive?: boolean;
      useCache?: boolean;
    }
  ): Promise<TextMatchResult>;

  /**
   * Find text with fuzzy matching
   * @param tabId - Target tab
   * @param targetText - Text to find
   * @param threshold - Similarity threshold
   * @returns Text match result
   */
  async findTextFuzzy(
    tabId: number,
    targetText: string,
    threshold?: number
  ): Promise<TextMatchResult>;

  /**
   * Try multiple text variations
   * @param tabId - Target tab
   * @param variations - Text variations to try
   * @returns Best match result
   */
  async tryVariations(
    tabId: number,
    variations: TextVariation[]
  ): Promise<TextMatchResult>;

  /**
   * Generate text variations for matching
   * @param text - Original text
   * @returns Array of variations
   */
  generateVariations(text: string): TextVariation[];

  /**
   * Calculate match confidence
   * @param ocrConfidence - OCR confidence (0-100)
   * @param matchQuality - Match quality (0-1)
   * @param matchType - How match was found
   * @returns Final confidence (0-1)
   */
  calculateConfidence(
    ocrConfidence: number,
    matchQuality: number,
    matchType: TextMatchResult['matchType']
  ): number;

  /**
   * Verify match is in expected location
   * @param match - OCR match result
   * @param expectedBbox - Expected bounding box from recording
   * @param tolerance - Position tolerance in pixels
   * @returns Whether position matches
   */
  verifyPosition(
    match: OCRResult,
    expectedBbox: VisionStrategyMetadata['textBbox'],
    tolerance?: number
  ): boolean;

  /**
   * Calculate text similarity using Levenshtein distance
   * @param text1 - First text
   * @param text2 - Second text
   * @returns Similarity score (0-1)
   */
  calculateSimilarity(text1: string, text2: string): number;

  // Private helper methods
  private normalizeText(text: string): string;
  private matchExact(ocrResults: OCRResult[], searchText: string, caseSensitive: boolean): OCRResult | null;
  private matchContains(ocrResults: OCRResult[], searchText: string, caseSensitive: boolean): OCRResult | null;
  private matchFuzzy(ocrResults: OCRResult[], searchText: string, threshold: number): { result: OCRResult; similarity: number } | null;
  private ocrResultToClickPoint(result: OCRResult): { x: number; y: number };
}

export {
  VisionStrategy,
  VisionStrategyConfig,
  VisionStrategyMetadata,
  TextMatchResult,
  TextVariation
};
```

---

## Key Implementation Details

### Constructor and Configuration
```typescript
constructor(
  visionService: VisionService,
  config?: Partial<VisionStrategyConfig>
) {
  this.visionService = visionService;
  this.config = {
    minOCRConfidence: config?.minOCRConfidence ?? 60,
    useCache: config?.useCache ?? true,
    ocrTimeout: config?.ocrTimeout ?? 5000,
    fuzzyMatchThreshold: config?.fuzzyMatchThreshold ?? 0.8,
    tryVariations: config?.tryVariations ?? true,
    maxTextLength: config?.maxTextLength ?? 100
  };
}

handles(type: StrategyType): boolean {
  return this.handledTypes.includes(type);
}
```

### Main Evaluate Method
```typescript
async evaluate(tabId: number, strategy: LocatorStrategy): Promise<StrategyEvaluationResult> {
  const startTime = Date.now();

  // Validate metadata
  const metadata = strategy.metadata as VisionStrategyMetadata | undefined;
  if (!metadata?.targetText) {
    return {
      strategy,
      found: false,
      confidence: 0,
      duration: Date.now() - startTime,
      error: 'Vision strategy requires targetText in metadata'
    };
  }

  // Validate text length
  if (metadata.targetText.length > this.config.maxTextLength) {
    return {
      strategy,
      found: false,
      confidence: 0,
      duration: Date.now() - startTime,
      error: `Target text too long (${metadata.targetText.length} > ${this.config.maxTextLength})`
    };
  }

  try {
    // Check if VisionService is ready
    if (!this.visionService.isReady()) {
      await this.visionService.initialize();
    }

    // First try exact/contains match
    let matchResult = await this.findText(tabId, metadata.targetText, {
      exact: metadata.exact,
      caseSensitive: metadata.caseSensitive,
      useCache: this.config.useCache
    });

    // If not found and variations enabled, try variations
    if (!matchResult.found && this.config.tryVariations) {
      const variations = metadata.variations
        ? metadata.variations.map((v, i) => ({ text: v, type: 'custom' as const, priority: 10 - i }))
        : this.generateVariations(metadata.targetText);

      matchResult = await this.tryVariations(tabId, variations);
    }

    // If still not found, try fuzzy matching
    if (!matchResult.found) {
      matchResult = await this.findTextFuzzy(
        tabId,
        metadata.targetText,
        this.config.fuzzyMatchThreshold
      );
    }

    if (!matchResult.found || !matchResult.match) {
      return {
        strategy,
        found: false,
        confidence: 0,
        duration: Date.now() - startTime,
        error: `Text "${metadata.targetText}" not found on page`
      };
    }

    // Verify position if we have expected bbox
    let positionBonus = 0;
    if (metadata.textBbox && this.verifyPosition(matchResult.match, metadata.textBbox)) {
      positionBonus = 0.05; // Boost confidence if position matches
    }

    // Calculate final confidence
    const confidence = Math.min(
      this.calculateConfidence(
        matchResult.match.confidence,
        matchResult.matchQuality,
        matchResult.matchType
      ) + positionBonus,
      0.95 // Cap at 0.95
    );

    // Get click point
    const clickPoint = this.ocrResultToClickPoint(matchResult.match);

    return {
      strategy,
      found: true,
      confidence,
      clickPoint,
      duration: Date.now() - startTime,
      matchCount: 1,
      metadata: {
        matchType: matchResult.matchType,
        matchedText: matchResult.matchedText,
        ocrConfidence: matchResult.match.confidence,
        bbox: matchResult.match.bbox
      }
    };

  } catch (error) {
    return {
      strategy,
      found: false,
      confidence: 0,
      duration: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Vision evaluation failed'
    };
  }
}
```

### Text Finding Methods
```typescript
async findText(
  tabId: number,
  targetText: string,
  options?: {
    exact?: boolean;
    caseSensitive?: boolean;
    useCache?: boolean;
  }
): Promise<TextMatchResult> {
  const exact = options?.exact ?? false;
  const caseSensitive = options?.caseSensitive ?? false;
  const useCache = options?.useCache ?? this.config.useCache;

  // Get OCR results
  const ocrResults = await this.visionService.analyzeTab(tabId, useCache);

  // Filter by minimum confidence
  const validResults = ocrResults.filter(r => r.confidence >= this.config.minOCRConfidence);

  if (validResults.length === 0) {
    return {
      found: false,
      matchQuality: 0,
      matchType: 'exact',
      searchText: targetText
    };
  }

  // Try exact match first
  const exactMatch = this.matchExact(validResults, targetText, caseSensitive);
  if (exactMatch) {
    return {
      found: true,
      match: exactMatch,
      matchQuality: 1.0,
      matchType: 'exact',
      searchText: targetText,
      matchedText: exactMatch.text
    };
  }

  // Try contains match if not exact only
  if (!exact) {
    const containsMatch = this.matchContains(validResults, targetText, caseSensitive);
    if (containsMatch) {
      return {
        found: true,
        match: containsMatch,
        matchQuality: 0.9,
        matchType: 'contains',
        searchText: targetText,
        matchedText: containsMatch.text
      };
    }
  }

  return {
    found: false,
    matchQuality: 0,
    matchType: 'exact',
    searchText: targetText
  };
}

private matchExact(
  ocrResults: OCRResult[],
  searchText: string,
  caseSensitive: boolean
): OCRResult | null {
  const normalizedSearch = caseSensitive ? searchText.trim() : searchText.toLowerCase().trim();

  for (const result of ocrResults) {
    const normalizedOcr = caseSensitive ? result.text.trim() : result.text.toLowerCase().trim();
    if (normalizedOcr === normalizedSearch) {
      return result;
    }
  }

  return null;
}

private matchContains(
  ocrResults: OCRResult[],
  searchText: string,
  caseSensitive: boolean
): OCRResult | null {
  const normalizedSearch = caseSensitive ? searchText.trim() : searchText.toLowerCase().trim();

  // First look for results that contain the search text
  for (const result of ocrResults) {
    const normalizedOcr = caseSensitive ? result.text.trim() : result.text.toLowerCase().trim();
    if (normalizedOcr.includes(normalizedSearch)) {
      return result;
    }
  }

  // Then check if search text contains any result (for partial OCR)
  for (const result of ocrResults) {
    const normalizedOcr = caseSensitive ? result.text.trim() : result.text.toLowerCase().trim();
    if (normalizedSearch.includes(normalizedOcr) && normalizedOcr.length >= 3) {
      return result;
    }
  }

  return null;
}
```

### Fuzzy Matching
```typescript
async findTextFuzzy(
  tabId: number,
  targetText: string,
  threshold?: number
): Promise<TextMatchResult> {
  const fuzzyThreshold = threshold ?? this.config.fuzzyMatchThreshold;

  // Get fresh OCR results (don't use cache for fuzzy matching)
  const ocrResults = await this.visionService.analyzeTab(tabId, false);

  const validResults = ocrResults.filter(r => r.confidence >= this.config.minOCRConfidence);

  const fuzzyMatch = this.matchFuzzy(validResults, targetText, fuzzyThreshold);

  if (fuzzyMatch) {
    return {
      found: true,
      match: fuzzyMatch.result,
      matchQuality: fuzzyMatch.similarity,
      matchType: 'fuzzy',
      searchText: targetText,
      matchedText: fuzzyMatch.result.text
    };
  }

  return {
    found: false,
    matchQuality: 0,
    matchType: 'fuzzy',
    searchText: targetText
  };
}

private matchFuzzy(
  ocrResults: OCRResult[],
  searchText: string,
  threshold: number
): { result: OCRResult; similarity: number } | null {
  const normalizedSearch = this.normalizeText(searchText);
  let bestMatch: { result: OCRResult; similarity: number } | null = null;

  for (const result of ocrResults) {
    const normalizedOcr = this.normalizeText(result.text);
    const similarity = this.calculateSimilarity(normalizedSearch, normalizedOcr);

    if (similarity >= threshold) {
      if (!bestMatch || similarity > bestMatch.similarity) {
        bestMatch = { result, similarity };
      }
    }
  }

  return bestMatch;
}

calculateSimilarity(text1: string, text2: string): number {
  if (text1 === text2) return 1.0;
  if (text1.length === 0 || text2.length === 0) return 0;

  const maxLen = Math.max(text1.length, text2.length);
  const distance = this.levenshteinDistance(text1, text2);

  return 1 - (distance / maxLen);
}

private levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;

  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[m][n];
}
```

### Text Variations
```typescript
generateVariations(text: string): TextVariation[] {
  const variations: TextVariation[] = [
    { text: text, type: 'original', priority: 10 },
    { text: text.toLowerCase(), type: 'lowercase', priority: 9 },
    { text: text.toUpperCase(), type: 'uppercase', priority: 8 },
    { text: text.trim(), type: 'trimmed', priority: 7 },
    { text: this.normalizeText(text), type: 'normalized', priority: 6 }
  ];

  // Add variation without special characters
  const alphanumericOnly = text.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  if (alphanumericOnly !== text && alphanumericOnly.length >= 3) {
    variations.push({ text: alphanumericOnly, type: 'normalized', priority: 5 });
  }

  // Add variation with collapsed whitespace
  const collapsedWhitespace = text.replace(/\s+/g, ' ').trim();
  if (collapsedWhitespace !== text) {
    variations.push({ text: collapsedWhitespace, type: 'normalized', priority: 4 });
  }

  // Sort by priority (highest first)
  return variations.sort((a, b) => b.priority - a.priority);
}

async tryVariations(
  tabId: number,
  variations: TextVariation[]
): Promise<TextMatchResult> {
  // Sort by priority
  const sorted = [...variations].sort((a, b) => b.priority - a.priority);

  for (const variation of sorted) {
    const result = await this.findText(tabId, variation.text, {
      exact: false,
      caseSensitive: false,
      useCache: true
    });

    if (result.found) {
      return {
        ...result,
        matchType: 'variation',
        searchText: variation.text
      };
    }
  }

  return {
    found: false,
    matchQuality: 0,
    matchType: 'variation',
    searchText: variations[0]?.text || ''
  };
}

private normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '');
}
```

### Confidence Calculation
```typescript
calculateConfidence(
  ocrConfidence: number,
  matchQuality: number,
  matchType: TextMatchResult['matchType']
): number {
  // Base confidence from OCR (normalized to 0-1)
  const ocrFactor = ocrConfidence / 100;

  // Match type factor
  let matchTypeFactor: number;
  switch (matchType) {
    case 'exact':
      matchTypeFactor = 1.0;
      break;
    case 'contains':
      matchTypeFactor = 0.95;
      break;
    case 'variation':
      matchTypeFactor = 0.90;
      break;
    case 'fuzzy':
      matchTypeFactor = 0.85;
      break;
    default:
      matchTypeFactor = 0.80;
  }

  // Combined confidence
  // Weight: OCR confidence 40%, match quality 40%, match type 20%
  const confidence = (ocrFactor * 0.4) + (matchQuality * 0.4) + (matchTypeFactor * 0.2);

  // Scale to vision_ocr range (0.70 - 0.90)
  return 0.70 + (confidence * 0.20);
}
```

### Position Verification
```typescript
verifyPosition(
  match: OCRResult,
  expectedBbox: VisionStrategyMetadata['textBbox'],
  tolerance: number = 100
): boolean {
  if (!expectedBbox) return false;

  const matchCenterX = match.bbox.x + match.bbox.width / 2;
  const matchCenterY = match.bbox.y + match.bbox.height / 2;

  const expectedCenterX = expectedBbox.x + expectedBbox.width / 2;
  const expectedCenterY = expectedBbox.y + expectedBbox.height / 2;

  const distanceX = Math.abs(matchCenterX - expectedCenterX);
  const distanceY = Math.abs(matchCenterY - expectedCenterY);

  return distanceX <= tolerance && distanceY <= tolerance;
}

private ocrResultToClickPoint(result: OCRResult): { x: number; y: number } {
  return {
    x: result.bbox.x + result.bbox.width / 2,
    y: result.bbox.y + result.bbox.height / 2
  };
}
```

---

## Integration Points

### With DecisionEngine
```typescript
// DecisionEngine uses VisionStrategy
class DecisionEngine {
  private visionStrategy: VisionStrategy;

  async routeToEvaluator(tabId: number, strategy: LocatorStrategy) {
    if (this.visionStrategy.handles(strategy.type)) {
      return this.visionStrategy.evaluate(tabId, strategy);
    }
    // ... other evaluators
  }
}
```

### With VisionService
```typescript
// VisionStrategy delegates OCR to VisionService
async evaluate(tabId: number, strategy: LocatorStrategy) {
  // VisionService handles screenshot + Tesseract
  const ocrResults = await this.visionService.analyzeTab(tabId);
  // ... process results
}
```

---

## Acceptance Criteria

- [ ] Evaluates vision_ocr strategies using VisionService
- [ ] Exact text matching works
- [ ] Contains text matching works
- [ ] Fuzzy text matching with configurable threshold
- [ ] Text variations generated and tried
- [ ] Position verification provides confidence boost
- [ ] Confidence calculated from OCR + match quality
- [ ] Returns click point at text center
- [ ] Handles VisionService not ready
- [ ] Respects minimum OCR confidence
- [ ] TypeScript compiles with strict mode, 0 errors

---

## Edge Cases

1. **VisionService not initialized**: Initialize on demand
2. **No OCR results**: Return not found
3. **All results below confidence**: Return not found
4. **Very short text (<3 chars)**: May have false positives
5. **Very long text**: Truncate search
6. **Special characters**: Normalize for matching
7. **Multiple matches**: Use highest confidence
8. **Rotated text**: May not match
9. **Low quality screenshot**: Lower OCR confidence
10. **Text across line breaks**: May be split in OCR

---

## Estimated Lines

350-400 lines
