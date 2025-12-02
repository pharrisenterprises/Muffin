/**
 * ConditionalBadge Component
 * 
 * Displays a badge indicating a conditional click step.
 * These steps wait for and click buttons matching search terms.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ConditionalBadgeProps {
  /** Timeout duration in seconds (optional) */
  timeout?: number;
  /** Search terms being watched for */
  searchTerms?: string[];
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md';
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * ConditionalBadge - Indicates a conditional click step.
 * 
 * @example
 * ```tsx
 * <ConditionalBadge timeout={120} searchTerms={['Allow', 'Keep']} />
 * ```
 */
export function ConditionalBadge({ 
  timeout,
  searchTerms,
  className = '',
  size = 'sm' 
}: ConditionalBadgeProps): JSX.Element {
  const sizeClasses = size === 'sm' 
    ? 'px-1.5 py-0.5 text-xs' 
    : 'px-2 py-1 text-sm';

  const baseClasses = `
    inline-flex items-center gap-1 
    rounded-full font-medium
    bg-orange-100 text-orange-700
    dark:bg-orange-900 dark:text-orange-200
    ${sizeClasses}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  // Build tooltip text
  let tooltipText = 'Waits for and clicks buttons matching search terms';
  if (searchTerms && searchTerms.length > 0) {
    tooltipText += `: "${searchTerms.join('", "')}"`;
  }
  if (timeout) {
    tooltipText += `. Timeout: ${timeout}s`;
  }

  // Build display text
  const displayText = timeout ? `Wait ${timeout}s` : 'Conditional';

  return (
    <span 
      className={baseClasses}
      title={tooltipText}
      role="status"
      aria-label="Conditional click step"
    >
      <span aria-hidden="true">🎯</span>
      <span>{displayText}</span>
    </span>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ConditionalBadge;
