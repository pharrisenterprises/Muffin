/**
 * LoopStartBadge Component
 * 
 * Displays a badge indicating the step where CSV loop iteration begins.
 * Steps before this index are only executed on the first row.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface LoopStartBadgeProps {
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md';
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * LoopStartBadge - Indicates the loop start point.
 * 
 * @example
 * ```tsx
 * <LoopStartBadge />
 * ```
 */
export function LoopStartBadge({ 
  className = '',
  size = 'sm' 
}: LoopStartBadgeProps): JSX.Element {
  const sizeClasses = size === 'sm' 
    ? 'px-1.5 py-0.5 text-xs' 
    : 'px-2 py-1 text-sm';

  const baseClasses = `
    inline-flex items-center gap-1 
    rounded-full font-medium
    bg-blue-100 text-blue-700
    dark:bg-blue-900 dark:text-blue-200
    ${sizeClasses}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <span 
      className={baseClasses}
      title="CSV loop starts from this step. Previous steps run only on first row."
      role="status"
      aria-label="Loop start point"
    >
      <span aria-hidden="true">🔄</span>
      <span>Loop Start</span>
    </span>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default LoopStartBadge;
