/**
 * Dice coefficient for string similarity (0-1)
 */
export function diceCoefficient(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  
  const aLower = a.toLowerCase().trim();
  const bLower = b.toLowerCase().trim();
  if (aLower === bLower) return 1;
  if (aLower.length < 2 || bLower.length < 2) return 0;
  
  const getBigrams = (str: string): Set<string> => {
    const bigrams = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.substring(i, i + 2));
    }
    return bigrams;
  };
  
  const aBigrams = getBigrams(aLower);
  const bBigrams = getBigrams(bLower);
  
  let matches = 0;
  aBigrams.forEach(bg => { if (bBigrams.has(bg)) matches++; });
  
  return (2 * matches) / (aBigrams.size + bBigrams.size);
}

/**
 * Fuzzy match with tiered scoring
 */
export function fuzzyMatch(a: string, b: string): number {
  if (!a || !b) return 0;
  const aLower = a.toLowerCase().trim();
  const bLower = b.toLowerCase().trim();
  if (aLower === bLower) return 1.0;
  if (aLower.includes(bLower) || bLower.includes(aLower)) return 0.8;
  return diceCoefficient(aLower, bLower);
}

/**
 * Find best match from candidates
 */
export function findBestMatch(
  target: string,
  candidates: string[]
): { match: string | null; score: number; index: number } {
  let bestScore = 0, bestMatch: string | null = null, bestIndex = -1;
  candidates.forEach((candidate, index) => {
    const score = fuzzyMatch(target, candidate);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = candidate;
      bestIndex = index;
    }
  });
  return { match: bestMatch, score: bestScore, index: bestIndex };
}
