import { useMemo } from "react";
import { useRuns } from "@/hooks/useRuns";
import { FailureBadge } from "@/components/FailureBadge";
import { timeAgo } from "@/lib/timeAgo";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight, CheckCircle } from "lucide-react";

export default function SessionsPage() {
  const { data: runs, isLoading } = useRuns();
  const navigate = useNavigate();

  const sessions = useMemo(() => {
    if (!runs) return { grouped: [], ungrouped: [] };
    const map: Record<string, typeof runs> = {};
    const ungrouped: typeof runs = [];
    for (const r of runs) {
      if (r.session_id) {
        if (!map[r.session_id]) map[r.session_id] = [];
        map[r.session_id].push(r);
      } else {
        ungrouped.push(r);
      }
    }
    const grouped = Object.entries(map)
      .map(([id, sessionRuns]) => {
        const sorted = sessionRuns.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
        const failures = sorted.filter((r) => r.failure_types?.length > 0).length;
        return { id, runs: sorted, count: sorted.length, failures, timeRange: `${timeAgo(sorted[0].timestamp)} – ${timeAgo(sorted[sorted.length - 1].timestamp)}` };
      })
      .sort((a, b) => b.runs[0].timestamp.localeCompare(a.runs[0].timestamp));
    return { grouped, ungrouped };
  }, [runs]);

  if (isLoading) {
    return <div className="p-6 space-y-4 animate-fade-in"><Skeleton className="h-8 w-32" />{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>;
  }

  if (sessions.grouped.length === 0 && sessions.ungrouped.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3 max-w-md">
          <h2 className="text-foreground">No sessions yet</h2>
          <p className="text-sm text-muted-foreground">Pass a <code className="bg-surface-1 px-1 rounded text-xs font-mono">session_id</code> in your trackAI() calls to group related runs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <h1 className="text-xl font-semibold text-foreground">Sessions</h1>
      <div className="space-y-3">
        {sessions.grouped.map((session) => (
          <Collapsible key={session.id}>
            <CollapsibleTrigger className="w-full rounded-lg border border-border bg-card p-4 hover:bg-surface-1 transition-colors flex items-center justify-between group text-left">
              <div className="flex items-center gap-3">
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
                <div>
                  <div className="text-sm font-medium text-foreground font-mono">{session.id.length > 24 ? `${session.id.slice(0, 24)}…` : session.id}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{session.count} runs · {session.failures} failures · {session.timeRange}</div>
                </div>
              </div>
              {session.failures > 0 && <span className="text-xs bg-critical/10 text-critical rounded-full px-2 py-0.5 border border-critical/30">{session.failures} issues</span>}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="ml-7 mt-1 rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
                {session.runs.map((run) => (
                  <button key={run.id} onClick={() => navigate(`/runs/${run.id}`)} className="w-full flex items-center gap-3 p-3 hover:bg-surface-1 transition-colors text-left">
                    <span className="text-xs text-muted-foreground shrink-0 w-16" title={run.timestamp}>{timeAgo(run.timestamp)}</span>
                    <span className="text-sm text-foreground truncate flex-1">{run.input.slice(0, 80)}{run.input.length > 80 ? "…" : ""}</span>
                    {run.primary_failure ? <FailureBadge type={run.primary_failure} /> : <CheckCircle className="h-4 w-4 text-success shrink-0" />}
                  </button>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ))}
        {sessions.ungrouped.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-2 mt-6">Ungrouped runs</h2>
            <div className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
              {sessions.ungrouped.map((run) => (
                <button key={run.id} onClick={() => navigate(`/runs/${run.id}`)} className="w-full flex items-center gap-3 p-3 hover:bg-surface-1 transition-colors text-left">
                  <span className="text-xs text-muted-foreground shrink-0 w-16">{timeAgo(run.timestamp)}</span>
                  <span className="text-sm text-foreground truncate flex-1">{run.input.slice(0, 80)}{run.input.length > 80 ? "…" : ""}</span>
                  {run.primary_failure ? <FailureBadge type={run.primary_failure} /> : <CheckCircle className="h-4 w-4 text-success shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
