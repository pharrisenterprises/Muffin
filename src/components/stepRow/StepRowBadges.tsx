/**
 * StepRowBadges Component
 * 
 * Renders all applicable badges for a step row:
 * - Vision badge (if recordedVia === 'vision')
 * - Loop Start badge (if step index === loopStartIndex)
 * - Delay badge (if step has delaySeconds)
 * - Conditional badge (if event === 'conditional-click')
 * 
 * Build Card: UI-010
 */

import { VisionBadge } from '../badges/VisionBadge';
import { LoopStartBadge } from '../badges/LoopStartBadge';
import { DelayBadge } from '../badges/DelayBadge';
import { ConditionalBadge } from '../badges/ConditionalBadge';
import type { Step } from '../../types/vision';

// ============================================================================
// TYPES
// ============================================================================

export interface StepRowBadgesProps {
  /** The step to render badges for */
  step: Step;
  /** Index of this step in the recording */
  stepIndex: number;
  /** The loop start index from the recording */
  loopStartIndex: number;
  /** Additional CSS classes for the container */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Renders all applicable badges for a step row.
 * Badge order: Vision → Loop Start → Conditional → Delay
 */
export function StepRowBadges({
  step,
  stepIndex,
  loopStartIndex,
  className = '',
}: StepRowBadgesProps): JSX.Element {
  // Determine which badges to show
  const showVision = step.recordedVia === 'vision';
  const showLoopStart = stepIndex === loopStartIndex && loopStartIndex > 0;
  const showConditional = step.event === 'conditional-click';
  const showDelay = typeof step.delaySeconds === 'number' && step.delaySeconds > 0;
  
  // Don't render container if no badges
  if (!showVision && !showLoopStart && !showConditional && !showDelay) {
    return <></>;
  }
  
  return (
    <div 
      className={`
        inline-flex items-center gap-1 flex-wrap
        ${className}
      `.trim()}
      role="group"
      aria-label="Step indicators"
    >
      {/* Vision Badge */}
      {showVision && (
        <VisionBadge />
      )}
      
      {/* Loop Start Badge */}
      {showLoopStart && (
        <LoopStartBadge />
      )}
      
      {/* Conditional Badge */}
      {showConditional && step.conditionalConfig && (
        <ConditionalBadge 
          timeout={step.conditionalConfig.timeoutSeconds}
          searchTerms={step.conditionalConfig.searchTerms}
        />
      )}
      
      {/* Delay Badge */}
      {showDelay && (
        <DelayBadge 
          seconds={step.delaySeconds!}
        />
      )}
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default StepRowBadges;
