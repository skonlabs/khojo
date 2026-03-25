import { type OutputHighlight } from "@/data/sampleData";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface HighlightedOutputProps {
  text: string;
  highlights: OutputHighlight[];
}

const highlightTypeStyles: Record<OutputHighlight['type'], string> = {
  unsupported: 'bg-[hsl(var(--hallucination)/0.15)] border-b-2 border-[hsl(var(--hallucination)/0.5)] rounded-sm px-0.5 cursor-help',
  wrong: 'bg-[hsl(var(--critical)/0.15)] border-b-2 border-[hsl(var(--critical)/0.5)] rounded-sm px-0.5 cursor-help',
  missing: 'bg-[hsl(var(--info)/0.15)] border-b-2 border-dashed border-[hsl(var(--info)/0.5)] rounded-sm px-0.5 cursor-help',
  repeated: 'bg-[hsl(var(--warning)/0.15)] border-b-2 border-[hsl(var(--warning)/0.5)] rounded-sm px-0.5 cursor-help',
};

const highlightTypeLabels: Record<OutputHighlight['type'], string> = {
  unsupported: '⚠️ Unsupported claim',
  wrong: '❌ Incorrect',
  missing: '🔍 Missing element',
  repeated: '🔁 Repeated/verbose',
};

export function HighlightedOutput({ text, highlights }: HighlightedOutputProps) {
  if (!highlights || highlights.length === 0) {
    return <span className="whitespace-pre-wrap">{text}</span>;
  }

  // Find highlights that exist in the text and apply inline
  const outputHighlights = highlights.filter(h => text.includes(h.text));
  const missingHighlights = highlights.filter(h => !text.includes(h.text) && h.type === 'missing');

  if (outputHighlights.length === 0 && missingHighlights.length === 0) {
    return <span className="whitespace-pre-wrap">{text}</span>;
  }

  // Build segments by finding and marking highlight positions
  type Segment = { text: string; highlight?: OutputHighlight };
  const segments: Segment[] = [];

  // Sort by position in text
  const sorted = outputHighlights
    .map(h => ({ ...h, index: text.indexOf(h.text) }))
    .filter(h => h.index !== -1)
    .sort((a, b) => a.index - b.index);

  let lastEnd = 0;
  for (const h of sorted) {
    if (h.index < lastEnd) continue; // skip overlapping
    if (h.index > lastEnd) {
      segments.push({ text: text.slice(lastEnd, h.index) });
    }
    segments.push({ text: h.text, highlight: h });
    lastEnd = h.index + h.text.length;
  }
  if (lastEnd < text.length) {
    segments.push({ text: text.slice(lastEnd) });
  }

  return (
    <div>
      <div className="whitespace-pre-wrap">
        {segments.map((seg, i) =>
          seg.highlight ? (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <mark className={highlightTypeStyles[seg.highlight.type]}>
                  {seg.text}
                </mark>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                <div className="font-medium mb-0.5">{highlightTypeLabels[seg.highlight.type]}</div>
                <div className="text-muted-foreground">{seg.highlight.note}</div>
              </TooltipContent>
            </Tooltip>
          ) : (
            <span key={i}>{seg.text}</span>
          )
        )}
      </div>
      {missingHighlights.length > 0 && (
        <div className="mt-3 space-y-1">
          {missingHighlights.map((h, i) => (
            <div key={i} className="flex items-center gap-2 text-xs bg-[hsl(var(--info)/0.08)] border border-[hsl(var(--info)/0.2)] rounded-md px-2.5 py-1.5">
              <span className="text-info">🔍 Missing:</span>
              <span className="font-mono text-foreground">{h.text}</span>
              <span className="text-muted-foreground">— {h.note}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
