import { useState, useMemo } from "react";
import { useRuns, Run } from "@/hooks/useRuns";
import { FailureBadge, ConfidenceBadge } from "@/components/FailureBadge";
import { timeAgo } from "@/lib/timeAgo";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight } from "lucide-react";

const FAILURE_TYPES = ["hallucination", "incomplete", "irrelevant", "inconsistent", "verbose"];
const CONFIDENCE_LEVELS = ["high", "medium", "low"];
const PAGE_SIZE = 25;

export default function IssuesPage() {
  const { data: runs, isLoading, refetch } = useRuns();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [confidenceFilter, setConfidenceFilter] = useState("all");
  const [hideDismissed, setHideDismissed] = useState(true);
  const [page, setPage] = useState(1);

  const issues = useMemo(() => {
    if (!runs) return [];
    let filtered = runs.filter((r) => r.primary_failure);
    if (hideDismissed) filtered = filtered.filter((r) => !r.dismissed);
    if (typeFilter !== "all") filtered = filtered.filter((r) => r.failure_types?.includes(typeFilter));
    if (confidenceFilter !== "all") filtered = filtered.filter((r) => r.confidence === confidenceFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter((r) => r.input.toLowerCase().includes(q));
    }
    return filtered;
  }, [runs, typeFilter, confidenceFilter, search, hideDismissed]);

  const totalPages = Math.ceil(issues.length / PAGE_SIZE);
  const paged = issues.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const dismissRun = async (run: Run) => {
    const { error } = await supabase.from("runs").update({ dismissed: !run.dismissed }).eq("id", run.id);
    if (error) {
      toast.error("Failed to update");
      console.error(JSON.stringify({ level: "error", message: "dismissRun failed", run_id: run.id, error: error.message }));
    } else {
      toast.success(run.dismissed ? "Restored" : "Dismissed");
      refetch();
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 animate-fade-in">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!runs || runs.filter((r) => r.primary_failure).length === 0) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3 max-w-md">
          <h2 className="text-foreground">No issues detected yet</h2>
          <p className="text-sm text-muted-foreground">Add the SDK to your app and run it to start seeing data.</p>
          <div className="bg-surface-1 rounded-lg p-4 border border-border text-left">
            <code className="text-xs font-mono text-muted-foreground">npm install @khojo/sdk</code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center gap-2">
        <h1 className="text-foreground">All issues</h1>
        <span className="text-xs bg-surface-2 text-muted-foreground rounded-full px-2 py-0.5">{issues.length}</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="Search by input..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-64" />
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All failure types</SelectItem>
            {FAILURE_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={confidenceFilter} onValueChange={(v) => { setConfidenceFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All confidence</SelectItem>
            {CONFIDENCE_LEVELS.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch id="hide-dismissed" checked={hideDismissed} onCheckedChange={setHideDismissed} />
          <Label htmlFor="hide-dismissed" className="text-xs text-muted-foreground">Hide dismissed</Label>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-1">
              <th className="text-left p-3 font-medium text-muted-foreground">Input</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Failure</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Confidence</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Tokens</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Time</th>
              <th className="text-left p-3 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paged.map((run) => (
              <tr key={run.id} className={`hover:bg-surface-1 transition-colors ${run.dismissed ? "opacity-50" : ""}`}>
                <td className="p-3"><button onClick={() => navigate(`/runs/${run.id}`)} className="text-foreground hover:text-primary text-left truncate max-w-[300px] block">{run.input.slice(0, 60)}{run.input.length > 60 ? "…" : ""}</button></td>
                <td className="p-3">{run.primary_failure && <FailureBadge type={run.primary_failure} />}</td>
                <td className="p-3"><ConfidenceBadge level={run.confidence} /></td>
                <td className="p-3 text-muted-foreground font-mono text-xs">{run.total_tokens.toLocaleString()}</td>
                <td className="p-3 text-muted-foreground text-xs" title={run.timestamp}>{timeAgo(run.timestamp)}</td>
                <td className="p-3"><Button variant="ghost" size="sm" className="text-xs" onClick={() => dismissRun(run)}>{run.dismissed ? "Restore" : "Dismiss"}</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, issues.length)} of {issues.length} issues</span>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-3 w-3" /> Prev</Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next <ChevronRight className="h-3 w-3" /></Button>
        </div>
      </div>
    </div>
  );
}
