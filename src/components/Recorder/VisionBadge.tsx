// src/components/recorder/VisionBadge.tsx
import React from "react";

interface VisionBadgeProps {
  className?: string;
  showTooltip?: boolean;
  reason?: string;
}

export function VisionBadge({ className = "", showTooltip = true, reason }: VisionBadgeProps) {
  const badge = (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700 ${className}`}>
      👁️ Vision
    </span>
  );
  if (showTooltip && reason) {
    return <span title={reason}>{badge}</span>;
  }
  return badge;
}

export default VisionBadge;
