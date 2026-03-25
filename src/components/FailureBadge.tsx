import { getFailureStyle } from "@/lib/failureColors";

export function FailureBadge({ type }: { type: string }) {
  const style = getFailureStyle(type);
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${style.bg} ${style.text} ${style.border}`}>
      {style.label}
    </span>
  );
}

export function ConfidenceBadge({ level }: { level: string | null }) {
  if (!level) return null;
  const colors: Record<string, string> = {
    high: "bg-success/10 text-success border-success/30",
    medium: "bg-warning/10 text-warning border-warning/30",
    low: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${colors[level] ?? colors.low}`}>
      {level}
    </span>
  );
}
