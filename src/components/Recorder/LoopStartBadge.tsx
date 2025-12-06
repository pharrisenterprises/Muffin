// src/components/recorder/LoopStartBadge.tsx
interface LoopStartBadgeProps {
  className?: string;
}

export function LoopStartBadge({ className = "" }: LoopStartBadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-cyan-100 text-cyan-700 ${className}`}>
      🔁 Loop Start
    </span>
  );
}

export default LoopStartBadge;
