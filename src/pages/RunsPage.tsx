import { useState, useMemo } from "react";
import { useRuns } from "@/hooks/useRuns";
import { FailureBadge } from "@/components/FailureBadge";
import { timeAgo } from "@/lib/timeAgo";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle } from "lucide-react";

export default function RunsPage() {
  const { data: runs, isLoading } = useRuns();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const filtered = useMemo(() => {
    if (!runs) return [];
    let result = [...runs];
    if (typeFilter !== "all") result = result.filter((r) => r.failure_types?.includes(typeFilter));
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((r) => r.input.toLowerCase().includes(q) || r.output.toLowerCase().includes(q));
    }
    return result;
  }, [runs, typeFilter, search]);

  if (isLoading) {
    return <div className="p-6 space-y-4 animate-fade-in"><Skeleton className="h-8 w-32" /><Skeleton className="h-64" /></div>;
  }

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <h1 className="text-xl font-semibold text-foreground">Runs</h1>
      <div className="flex gap-3">
        <Input placeholder="Search runs..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-64" />
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {["hallucination", "incomplete", "irrelevant", "inconsistent", "verbose"].map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No runs found</div>
        ) : (
          filtered.map((run) => (
            <button key={run.id} onClick={() => navigate(`/runs/${run.id}`)} className="w-full flex items-center gap-3 p-3 hover:bg-surface-1 transition-colors text-left">
              <span className="text-xs text-muted-foreground shrink-0 w-16" title={run.timestamp}>{timeAgo(run.timestamp)}</span>
              <span className="text-sm text-foreground truncate flex-1">{run.input.slice(0, 80)}{run.input.length > 80 ? "…" : ""}</span>
              <span className="text-xs font-mono text-muted-foreground shrink-0">{run.total_tokens}t</span>
              {run.model && <span className="text-xs bg-surface-2 text-muted-foreground rounded px-1.5 py-0.5 shrink-0">{run.model}</span>}
              {run.primary_failure ? <FailureBadge type={run.primary_failure} /> : <CheckCircle className="h-4 w-4 text-success shrink-0" />}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
