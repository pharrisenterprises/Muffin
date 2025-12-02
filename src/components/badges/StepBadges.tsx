/**
 * StepBadges Component
 * 
 * Composite component that renders all applicable badges for a step.
 * Handles the logic of which badges to show based on step properties.
 */

import type { Step } from '../../types/vision';
import { VisionBadge } from './VisionBadge';
import { LoopStartBadge } from './LoopStartBadge';
import { DelayBadge } from './DelayBadge';
import { ConditionalBadge } from './ConditionalBadge';

// ============================================================================
// TYPES
// ============================================================================

export interface StepBadgesProps {
  /** The step to display badges for */
  step: Step;
  /** Index of this step in the recording */
  stepIndex: number;
  /** The loop start index from recording settings */
  loopStartIndex?: number;
  /** Additional CSS classes for the container */
  className?: string;
  /** Size variant for all badges */
  size?: 'sm' | 'md';
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * StepBadges - Renders all applicable badges for a step.
 * 
 * Badge order: Vision → Loop Start → Conditional → Delay
 * 
 * @example
 * ```tsx
 * <StepBadges 
 *   step={step} 
 *   stepIndex={0} 
 *   loopStartIndex={2} 
 * />
 * ```
 */
export function StepBadges({
  step,
  stepIndex,
  loopStartIndex = 0,
  className = '',
  size = 'sm',
}: StepBadgesProps): JSX.Element {
  const badges: JSX.Element[] = [];

  // Vision badge - if step was recorded via Vision/OCR
  if (step.recordedVia === 'vision') {
    badges.push(
      <VisionBadge 
        key="vision" 
        size={size}
        reason={step.ocrText ? `OCR matched: "${step.ocrText}"` : undefined}
      />
    );
  }

  // Loop Start badge - if this is the loop start step
  if (stepIndex === loopStartIndex && loopStartIndex > 0) {
    badges.push(
      <LoopStartBadge key="loop" size={size} />
    );
  }

  // Conditional badge - if this is a conditional-click step
  if (step.event === 'conditional-click' && step.conditionalConfig) {
    badges.push(
      <ConditionalBadge 
        key="conditional" 
        size={size}
        timeout={step.conditionalConfig.timeoutSeconds}
        searchTerms={step.conditionalConfig.searchTerms}
      />
    );
  }

  // Delay badge - if step has a delay
  if (step.delaySeconds && step.delaySeconds > 0) {
    badges.push(
      <DelayBadge 
        key="delay" 
        size={size}
        seconds={step.delaySeconds} 
      />
    );
  }

  // Return empty fragment if no badges
  if (badges.length === 0) {
    return <></>;
  }

  return (
    <div 
      className={`inline-flex items-center gap-1 flex-wrap ${className}`}
      role="group"
      aria-label="Step badges"
    >
      {badges}
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default StepBadges;
