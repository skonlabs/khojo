import { useParams, useNavigate } from "react-router-dom";
import { useRun } from "@/hooks/useRuns";
import { FailureBadge, ConfidenceBadge } from "@/components/FailureBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { ArrowLeft, AlertTriangle, CheckCircle, Copy, Check, ChevronDown, ChevronRight, Clock, Cpu, Link2, Search } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { timeAgo } from "@/lib/timeAgo";

export default function RunDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: run, isLoading, refetch } = useRun(id);
  const [fixCopied, setFixCopied] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);

  const copyFix = () => {
    if (!run?.fix) return;
    navigator.clipboard.writeText(run.fix);
    setFixCopied(true);
    toast.success("Fix copied!");
    setTimeout(() => setFixCopied(false), 2000);
  };

  const toggleDismiss = async () => {
    if (!run) return;
    const { error } = await supabase.from("runs").update({ dismissed: !run.dismissed }).eq("id", run.id);
    if (error) {
      toast.error("Failed to update");
      console.error(JSON.stringify({ level: "error", message: "toggleDismiss failed", run_id: run.id, error: error.message }));
    } else {
      toast.success(run.dismissed ? "Restored" : "Dismissed");
      refetch();
    }
  };

  const highlightedOutput = useMemo(() => {
    if (!run) return { element: null, hasHighlights: false };
    const text = run.output;
    const highlights: { start: number; end: number; type: string }[] = [];

    if (run.proof?.unsupported_claims) {
      for (const claim of run.proof.unsupported_claims) {
        const idx = text.toLowerCase().indexOf(claim.toLowerCase());
        if (idx >= 0) highlights.push({ start: idx, end: idx + claim.length, type: "error" });
      }
    }
    if (run.proof?.repeated_chunks) {
      for (const chunk of run.proof.repeated_chunks) {
        const idx = text.toLowerCase().indexOf(chunk.toLowerCase());
        if (idx >= 0) highlights.push({ start: idx, end: idx + chunk.length, type: "repeated" });
      }
    }

    if (highlights.length === 0) return { element: <span>{text}</span>, hasHighlights: false };

    // Sort by start position, then deduplicate overlapping ranges by keeping
    // whichever ends later (prevents slicing out-of-bounds on overlapping proof).
    highlights.sort((a, b) => a.start - b.start);
    const deduped: typeof highlights = [];
    for (const h of highlights) {
      const prev = deduped[deduped.length - 1];
      if (prev && h.start < prev.end) {
        // Overlapping — extend the previous range to cover both
        prev.end = Math.max(prev.end, h.end);
      } else {
        deduped.push({ ...h });
      }
    }

    const parts: JSX.Element[] = [];
    let lastEnd = 0;

    for (const h of deduped) {
      // Clamp values defensively to the text bounds
      const start = Math.max(0, Math.min(h.start, text.length));
      const end = Math.max(start, Math.min(h.end, text.length));
      if (start > lastEnd) parts.push(<span key={lastEnd}>{text.slice(lastEnd, start)}</span>);
      const cls = h.type === "error"
        ? "highlight-error cursor-help"
        : "bg-[hsl(var(--warning)/0.15)] border-b-2 border-[hsl(var(--warning)/0.5)] px-0.5 rounded-sm cursor-help";
      parts.push(<mark key={start} className={cls} title={h.type === "error" ? "Unsupported claim" : "Repeated content"}>{text.slice(start, end)}</mark>);
      lastEnd = end;
    }
    if (lastEnd < text.length) parts.push(<span key={lastEnd}>{text.slice(lastEnd)}</span>);
    return { element: <>{parts}</>, hasHighlights: true };
  }, [run]);

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-4 animate-fade-in">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-96" />
        <Skeleton className="h-32" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!run) return <div className="p-6"><p className="text-muted-foreground">Run not found</p></div>;

  const outputRatio = run.input_tokens > 0 ? (run.output_tokens / run.input_tokens).toFixed(1) : "0";
  const shortId = run.id.slice(0, 8);

  // Parse fix into diff lines
  const fixLines = run.fix?.split("\n").map(line => {
    if (line.startsWith("+ ")) return { type: "add" as const, text: line };
    if (line.startsWith("- ")) return { type: "remove" as const, text: line };
    return { type: "neutral" as const, text: line };
  });

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-foreground font-mono">run-{shortId}</h1>
        {run.primary_failure && <FailureBadge type={run.primary_failure} />}
      </div>

      {/* Metadata row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mb-4">
        <span className="flex items-center gap-1" title={run.timestamp}>
          <Clock className="h-3 w-3" /> {new Date(run.timestamp).toLocaleString()}
        </span>
        {run.model && (
          <span className="flex items-center gap-1">
            <Cpu className="h-3 w-3" /> {run.model}
          </span>
        )}
        {run.session_id && (
          <button
            onClick={() => navigate("/sessions")}
            className="flex items-center gap-1 text-primary hover:underline"
          >
            <Link2 className="h-3 w-3" /> Session: {run.session_id.length > 12 ? `${run.session_id.slice(0, 12)}…` : run.session_id}
          </button>
        )}
        {run.confidence && <ConfidenceBadge level={run.confidence} />}
        {!run.evaluated_at && <span className="text-warning">⏳ Evaluation pending</span>}
      </div>

      {/* Token pills */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-1 border border-border px-3 py-1.5 text-xs font-mono text-foreground">
          Input: <strong>{run.input_tokens.toLocaleString()}t</strong>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-1 border border-border px-3 py-1.5 text-xs font-mono text-foreground">
          Output: <strong>{run.output_tokens.toLocaleString()}t</strong>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-1 border border-border px-3 py-1.5 text-xs font-mono text-foreground">
          Total: <strong>{run.total_tokens.toLocaleString()}t</strong>
        </span>
        {run.failure_types?.includes("verbose") && (
          <span className="inline-flex items-center gap-1 text-xs text-warning">
            <AlertTriangle className="h-3 w-3" /> {outputRatio}x output/input ratio
          </span>
        )}
      </div>

      {/* Input */}
      <div className="mb-4">
        <label className="text-xs text-muted-foreground font-medium block mb-1.5">Input</label>
        <div className="rounded-lg bg-surface-1 border border-border p-4 text-sm font-mono text-foreground whitespace-pre-wrap">
          {run.input}
        </div>
      </div>

      {/* Output with highlights */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-1.5">
          <label className="text-xs text-muted-foreground font-medium">Output</label>
          {highlightedOutput.hasHighlights && (
            <span className="text-[10px] text-muted-foreground bg-surface-2 rounded px-2 py-0.5 border border-border">
              Hover highlights for details
            </span>
          )}
        </div>
        <div className="rounded-lg bg-surface-1 border border-border p-4 text-sm font-mono text-foreground whitespace-pre-wrap">
          {highlightedOutput.element}

          {/* Missing keywords shown inline at bottom of output */}
          {run.proof?.missing_keywords && run.proof.missing_keywords.length > 0 && (
            <div className="mt-3 space-y-1">
              {run.proof.missing_keywords.map((k, i) => (
                <div key={i} className="flex items-center gap-2 text-xs bg-[hsl(var(--info)/0.08)] border border-[hsl(var(--info)/0.2)] rounded-md px-2.5 py-1.5">
                  <span className="text-info">🔍 Missing:</span>
                  <span className="font-mono font-medium text-foreground">{k}</span>
                  <span className="text-muted-foreground">— Expected in output but absent</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Highlight legend */}
      {(highlightedOutput.hasHighlights || (run.proof?.missing_keywords?.length ?? 0) > 0) && (
        <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground mb-6">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-critical" /> Incorrect</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-hallucination" /> Unsupported</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-warning" /> Repeated</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-info" /> Missing</span>
        </div>
      )}

      {/* Context (collapsible) */}
      {run.context && (
        <div className="mb-6">
          <Collapsible open={contextOpen} onOpenChange={setContextOpen}>
            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium">
              {contextOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Context
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-1.5 rounded-lg bg-surface-1 border border-border p-4 text-sm font-mono text-muted-foreground whitespace-pre-wrap">
                {run.context}
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {/* Diagnosis section */}
      {run.primary_failure && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-5 mb-4">
          <h2 className="text-foreground">Diagnosis</h2>

          {/* What Failed */}
          {run.explanation && (
            <div>
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1.5">❌ What Failed</span>
              <p className="text-sm text-foreground bg-surface-1 rounded-md p-3 border border-border">{run.explanation}</p>
            </div>
          )}

          {/* Proof */}
          {run.proof && (
            <div>
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1.5">🔍 Proof</span>
              <div className="text-sm text-foreground bg-surface-1 rounded-md p-3 border border-border space-y-2">
                {run.proof.unsupported_claims && run.proof.unsupported_claims.length > 0 && (
                  <p>Output contains unsupported claims: {run.proof.unsupported_claims.map((c, i) => (
                    <span key={i} className="inline-block bg-critical/10 text-critical rounded px-1.5 py-0.5 text-xs font-mono mx-0.5 border border-critical/30">{c}</span>
                  ))}</p>
                )}
                {run.proof.missing_keywords && run.proof.missing_keywords.length > 0 && (
                  <p>Expected keywords missing from output: {run.proof.missing_keywords.map((k, i) => (
                    <span key={i} className="inline-block bg-info/10 text-info rounded px-1.5 py-0.5 text-xs font-mono mx-0.5 border border-info/30">{k}</span>
                  ))}</p>
                )}
                {run.proof.repeated_chunks && run.proof.repeated_chunks.length > 0 && (
                  <p>Repeated content detected in output.</p>
                )}
                {(!run.proof.missing_keywords?.length && !run.proof.unsupported_claims?.length && !run.proof.repeated_chunks?.length) && (
                  <p className="text-muted-foreground">Low confidence detection — no specific proof extracted.</p>
                )}
              </div>
            </div>
          )}

          {/* Root Cause */}
          {run.root_cause && (
            <div>
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1.5">⚠️ Root Cause</span>
              <p className="text-sm text-foreground bg-surface-1 rounded-md p-3 border border-border">{run.root_cause}</p>
            </div>
          )}

          {/* Suggested Fix with diff highlighting */}
          {run.fix && fixLines && (
            <div>
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1.5">✅ Suggested Fix</span>
              <div className="rounded-md border border-border overflow-hidden text-sm font-mono">
                {fixLines.map((line, i) => (
                  <div
                    key={i}
                    className={`px-3 py-1 ${
                      line.type === "remove"
                        ? "bg-critical/10 text-critical"
                        : line.type === "add"
                        ? "bg-success/10 text-success"
                        : "bg-surface-1 text-foreground"
                    }`}
                  >
                    {line.text}
                  </div>
                ))}
              </div>
              <Button onClick={copyFix} variant="outline" size="sm" className="mt-2 w-full">
                {fixCopied ? <><Check className="h-4 w-4" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy fix</>}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button variant={run.dismissed ? "outline" : "destructive"} size="sm" onClick={toggleDismiss}>
          {run.dismissed ? "Restore this issue" : "Dismiss this issue"}
        </Button>
        {run.dismissed && <span className="text-xs text-muted-foreground">This issue is currently dismissed</span>}
      </div>
    </div>
  );
}
