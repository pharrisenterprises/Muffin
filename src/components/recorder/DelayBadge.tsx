// src/components/recorder/DelayBadge.tsx
interface DelayBadgeProps {
  delaySeconds: number | null | undefined;
  className?: string;
}

export function DelayBadge({ delaySeconds, className = "" }: DelayBadgeProps) {
  if (!delaySeconds) return null;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-700 ${className}`}>
      ⏱️ {delaySeconds}s
    </span>
  );
}

export default DelayBadge;
