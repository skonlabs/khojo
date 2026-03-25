export const failureColors: Record<string, { bg: string; text: string; border: string; label: string }> = {
  hallucination: {
    bg: "bg-hallucination/10",
    text: "text-hallucination",
    border: "border-hallucination/30",
    label: "Hallucination",
  },
  incomplete: {
    bg: "bg-incomplete/10",
    text: "text-incomplete",
    border: "border-incomplete/30",
    label: "Incomplete",
  },
  irrelevant: {
    bg: "bg-irrelevant/10",
    text: "text-irrelevant",
    border: "border-irrelevant/30",
    label: "Irrelevant",
  },
  inconsistent: {
    bg: "bg-inconsistent/10",
    text: "text-inconsistent",
    border: "border-inconsistent/30",
    label: "Inconsistent",
  },
  verbose: {
    bg: "bg-verbose/10",
    text: "text-verbose",
    border: "border-verbose/30",
    label: "Verbose",
  },
};

export function getFailureStyle(type: string) {
  return failureColors[type] ?? { bg: "bg-muted", text: "text-muted-foreground", border: "border-border", label: type };
}

export const confidenceColors: Record<string, string> = {
  high: "bg-success/10 text-success border-success/30",
  medium: "bg-warning/10 text-warning border-warning/30",
  low: "bg-muted text-muted-foreground border-border",
};
