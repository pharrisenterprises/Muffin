export interface ScoringResult {
  score: number;
  reasoning: string[];
  error?: string;
}

export async function safeScoreAll(
  scorers: Array<{
    name: string;
    weight: number;
    scorer: () => Promise<ScoringResult> | ScoringResult;
  }>
): Promise<{
  scores: Record<string, number>;
  totalScore: number;
  reasoning: string[];
  errors: string[];
}> {
  const scores: Record<string, number> = {};
  const reasoning: string[] = [];
  const errors: string[] = [];
  let totalScore = 0;
  let totalWeight = 0;
  
  for (const { name, weight, scorer } of scorers) {
    try {
      const result = await scorer();
      scores[name] = result.score;
      reasoning.push(...result.reasoning);
      totalScore += result.score * weight;
      totalWeight += weight;
      if (result.error) errors.push(`${name}: ${result.error}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      scores[name] = 0.5;
      reasoning.push(`${name}: Error - using neutral score`);
      errors.push(`${name}: ${errorMessage}`);
      totalScore += 0.5 * weight;
      totalWeight += weight;
    }
  }
  
  return {
    scores,
    totalScore: totalWeight > 0 ? totalScore / totalWeight : 0.5,
    reasoning,
    errors
  };
}
