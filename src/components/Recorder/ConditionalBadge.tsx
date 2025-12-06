// src/components/recorder/ConditionalBadge.tsx
import React from "react";

interface ConditionalBadgeProps {
  timeoutSeconds?: number;
  className?: string;
}

export function ConditionalBadge({ timeoutSeconds, className = "" }: ConditionalBadgeProps) {
  const label = timeoutSeconds ? `🔍 ${timeoutSeconds}s` : "🔍 Conditional";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700 ${className}`}>
      {label}
    </span>
  );
}

export default ConditionalBadge;
