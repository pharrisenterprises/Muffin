/**
 * DelayBadge Component
 * 
 * Displays a badge showing the delay before a step executes.
 * Shows the delay duration in seconds.
 * 
 * Build Card: UI-003
 */

// ============================================================================
// TYPES
// ============================================================================

export interface DelayBadgeProps {
  /** Delay duration in seconds */
  seconds: number;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md';
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * DelayBadge - Shows delay before step execution.
 * 
 * @example
 * ```tsx
 * <DelayBadge seconds={5} />
 * ```
 */
export function DelayBadge({ 
  seconds, 
  className = '',
  size = 'sm' 
}: DelayBadgeProps): JSX.Element {
  // Don't render if no delay
  if (!seconds || seconds <= 0) {
    return <></>;
  }

  const sizeClasses = size === 'sm' 
    ? 'px-1.5 py-0.5 text-xs' 
    : 'px-2 py-1 text-sm';

  const baseClasses = `
    inline-flex items-center gap-1 
    rounded-full font-medium
    bg-yellow-100 text-yellow-700
    dark:bg-yellow-900 dark:text-yellow-200
    ${sizeClasses}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  // Format display based on duration
  const displayText = seconds >= 60 
    ? `${Math.floor(seconds / 60)}m ${seconds % 60}s`
    : `${seconds}s`;

  return (
    <span 
      className={baseClasses}
      title={`Wait ${seconds} seconds before executing this step`}
      role="status"
      aria-label={`${seconds} second delay`}
    >
      <span aria-hidden="true">⏱️</span>
      <span>{displayText}</span>
    </span>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default DelayBadge;
