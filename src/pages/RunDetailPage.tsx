import { useParams, useNavigate } from "react-router-dom";
import { useRun } from "@/hooks/useRuns";
import { FailureBadge, ConfidenceBadge } from "@/components/FailureBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { ArrowLeft, XCircle, AlertTriangle, CheckCircle, Copy, Check, ChevronDown, ChevronRight, Search } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
    const { error } = await supabase.from("runs").update({ dismissed: !run.dismissed } as any).eq("id", run.id);
    if (error) toast.error("Failed");
    else { toast.success(run.dismissed ? "Restored" : "Dismissed"); refetch(); }
  };

  const highlightedOutput = useMemo(() => {
    if (!run) return null;
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

    if (highlights.length === 0) return <span>{text}</span>;

    highlights.sort((a, b) => a.start - b.start);
    const parts: JSX.Element[] = [];
    let lastEnd = 0;

    for (const h of highlights) {
      if (h.start > lastEnd) parts.push(<span key={lastEnd}>{text.slice(lastEnd, h.start)}</span>);
      const cls = h.type === "error" ? "highlight-error" : "bg-purple-500/15 border-b-2 border-purple-500/50 px-0.5 rounded-sm";
      parts.push(<mark key={h.start} className={cls}>{text.slice(h.start, h.end)}</mark>);
      lastEnd = h.end;
    }
    if (lastEnd < text.length) parts.push(<span key={lastEnd}>{text.slice(lastEnd)}</span>);
    return <>{parts}</>;
  }, [run]);

  if (isLoading) {
    return <div className="p-6 space-y-4 animate-fade-in"><Skeleton className="h-8 w-48" /><div className="grid grid-cols-1 lg:grid-cols-5 gap-4"><div className="lg:col-span-3 space-y-4"><Skeleton className="h-32" /><Skeleton className="h-48" /></div><div className="lg:col-span-2 space-y-4"><Skeleton className="h-24" /><Skeleton className="h-24" /></div></div></div>;
  }

  if (!run) return <div className="p-6"><p className="text-muted-foreground">Run not found</p></div>;

  const outputRatio = run.input_tokens > 0 ? (run.output_tokens / run.input_tokens).toFixed(1) : "0";

  return (
    <div className="p-6 animate-fade-in">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Issues
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Input</label>
            <div className="mt-1 rounded-lg bg-surface-1 border border-border p-4 text-sm text-foreground select-all whitespace-pre-wrap">{run.input}</div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Output</label>
            <div className="mt-1 rounded-lg bg-surface-1 border border-border p-4 text-sm text-foreground whitespace-pre-wrap">{highlightedOutput}</div>
          </div>
          {run.context && (
            <Collapsible open={contextOpen} onOpenChange={setContextOpen}>
              <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                {contextOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                <span className="uppercase tracking-widest font-medium">Context</span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-1 rounded-lg bg-surface-1 border border-border p-4 text-xs text-muted-foreground whitespace-pre-wrap">{run.context}</div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {run.primary_failure && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-2">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-critical" />
                <span className="text-sm font-semibold text-foreground capitalize">{run.primary_failure}</span>
                <ConfidenceBadge level={run.confidence} />
              </div>
              {run.explanation && <p className="text-sm text-muted-foreground">{run.explanation}</p>}
            </div>
          )}

          {run.proof && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2"><Search className="h-4 w-4 text-muted-foreground" /><h3 className="text-sm font-medium text-foreground">Proof</h3></div>
              {run.proof.missing_keywords && run.proof.missing_keywords.length > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground">Expected in output:</span>
                  <div className="flex flex-wrap gap-1 mt-1">{run.proof.missing_keywords.map((k, i) => <span key={i} className="text-xs bg-surface-2 text-muted-foreground rounded px-2 py-0.5 border border-border">{k}</span>)}</div>
                </div>
              )}
              {run.proof.unsupported_claims && run.proof.unsupported_claims.length > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground">Claims not in context:</span>
                  <div className="flex flex-wrap gap-1 mt-1">{run.proof.unsupported_claims.map((c, i) => <span key={i} className="text-xs bg-critical/10 text-critical rounded px-2 py-0.5 border border-critical/30">{c}</span>)}</div>
                </div>
              )}
              {run.proof.repeated_chunks && run.proof.repeated_chunks.length > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground">Repeated content:</span>
                  <div className="flex flex-wrap gap-1 mt-1">{run.proof.repeated_chunks.map((c, i) => <span key={i} className="text-xs bg-purple-500/10 text-purple-400 rounded px-2 py-0.5 border border-purple-500/30 truncate max-w-full">{c.slice(0, 50)}…</span>)}</div>
                </div>
              )}
              {(!run.proof.missing_keywords?.length && !run.proof.unsupported_claims?.length && !run.proof.repeated_chunks?.length) && <p className="text-xs text-muted-foreground">No specific proof extracted — low confidence detection</p>}
            </div>
          )}

          {run.root_cause && (
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-1"><AlertTriangle className="h-4 w-4 text-warning" /><h3 className="text-sm font-medium text-foreground">Root cause</h3></div>
              <p className="text-sm text-muted-foreground">{run.root_cause}</p>
            </div>
          )}

          {run.fix && (
            <div className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-success" /><h3 className="text-sm font-medium text-foreground">Recommended fix</h3></div>
              <div className="bg-surface-1 rounded-md p-3 text-sm font-mono text-foreground border border-border whitespace-pre-wrap">{run.fix}</div>
              <Button onClick={copyFix} className="w-full">{fixCopied ? <><Check className="h-4 w-4" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy fix</>}</Button>
            </div>
          )}

          <div className="rounded-lg border border-border bg-card p-4 space-y-3">
            <h3 className="text-sm font-medium text-foreground">Token usage</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Input tokens</span><span className="font-mono text-foreground">{run.input_tokens.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Output tokens</span><span className="font-mono text-foreground">{run.output_tokens.toLocaleString()}</span></div>
              {run.context_tokens > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Context tokens</span><span className="font-mono text-foreground">{run.context_tokens.toLocaleString()}</span></div>}
              <div className="flex justify-between border-t border-border pt-2"><span className="text-foreground font-medium">Total</span><span className="font-mono text-foreground font-medium">{run.total_tokens.toLocaleString()}</span></div>
            </div>
            <div className="h-2 rounded-full bg-surface-2 overflow-hidden flex">
              <div className="bg-info h-full" style={{ width: `${(run.input_tokens / run.total_tokens) * 100}%` }} />
              <div className="bg-warning h-full" style={{ width: `${(run.output_tokens / run.total_tokens) * 100}%` }} />
            </div>
            {run.failure_types?.includes("verbose") && <p className="text-xs text-warning flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Output is {outputRatio}x longer than input</p>}
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <Button variant={run.dismissed ? "outline" : "destructive"} className="w-full" onClick={toggleDismiss}>{run.dismissed ? "Restore this issue" : "Dismiss this issue"}</Button>
            {run.dismissed && <p className="text-xs text-muted-foreground text-center mt-2">This issue is dismissed</p>}
            {!run.evaluated_at && <p className="text-xs text-warning text-center mt-2">Evaluation pending</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
