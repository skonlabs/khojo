import { FailureType, failureTypeConfig } from "@/data/sampleData";
import { cn } from "@/lib/utils";

interface FailureBadgeProps {
  type: FailureType;
  className?: string;
}

export function FailureBadge({ type, className }: FailureBadgeProps) {
  const config = failureTypeConfig[type];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border",
        config.bgClass,
        config.colorClass,
        config.borderClass,
        className
      )}
    >
      <span>{config.emoji}</span>
      <span>{config.label}</span>
    </span>
  );
}
