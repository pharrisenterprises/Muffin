/**
 * VisionBadge Component
 * 
 * Displays a badge indicating a step was recorded using Vision/OCR.
 * Shows on steps where recordedVia === 'vision'.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface VisionBadgeProps {
  /** Additional CSS classes */
  className?: string;
  /** Tooltip text explaining why Vision was used */
  reason?: string;
  /** Size variant */
  size?: 'sm' | 'md';
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * VisionBadge - Indicates a Vision-recorded step.
 * 
 * @example
 * ```tsx
 * <VisionBadge reason="DOM selector failed" />
 * ```
 */
export function VisionBadge({ 
  className = '', 
  reason,
  size = 'sm' 
}: VisionBadgeProps): JSX.Element {
  const sizeClasses = size === 'sm' 
    ? 'px-1.5 py-0.5 text-xs' 
    : 'px-2 py-1 text-sm';

  const baseClasses = `
    inline-flex items-center gap-1 
    rounded-full font-medium
    bg-purple-100 text-purple-700
    dark:bg-purple-900 dark:text-purple-200
    ${sizeClasses}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <span 
      className={baseClasses}
      title={reason || 'Recorded using Vision/OCR'}
      role="status"
      aria-label="Vision recorded step"
    >
      <span aria-hidden="true">👁️</span>
      <span>Vision</span>
    </span>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default VisionBadge;
