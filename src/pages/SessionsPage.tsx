import { getSessions } from "@/data/sampleData";
import { FailureBadge } from "@/components/FailureBadge";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight, MessageSquare, AlertTriangle } from "lucide-react";
import { useState } from "react";

export default function SessionsPage() {
  const navigate = useNavigate();
  const sessions = getSessions();
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Sessions</h1>
        <p className="text-sm text-muted-foreground mt-1">Grouped runs by session — detect multi-turn issues</p>
      </div>

      <div className="space-y-2">
        {Array.from(sessions.entries()).map(([sessionId, runs]) => {
          const isExpanded = expanded === sessionId;
          const issueCount = runs.filter(r => r.failureTypes.length > 0).length;
          const totalTokens = runs.reduce((sum, r) => sum + r.tokens.total, 0);

          // Detect multi-turn issues
          const allFailureTypes = new Set(runs.flatMap(r => r.failureTypes));
          const hasRepeatingIssue = runs.filter(r => r.failureTypes.length > 0).length > 1;

          return (
            <div key={sessionId} className="rounded-lg border border-border bg-card overflow-hidden">
              <button
                onClick={() => setExpanded(isExpanded ? null : sessionId)}
                className="w-full flex items-center justify-between p-4 hover:bg-surface-1 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-mono font-medium text-foreground">{sessionId}</span>
                  <span className="text-xs text-muted-foreground">{runs.length} runs</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs font-mono text-muted-foreground">{totalTokens}t total</span>
                </div>
                <div className="flex items-center gap-2">
                  {hasRepeatingIssue && (
                    <span className="flex items-center gap-1 text-[10px] bg-warning/10 text-warning rounded px-1.5 py-0.5 border border-warning/20">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      Multi-turn issues
                    </span>
                  )}
                  {issueCount > 0 && (
                    <span className="text-xs text-critical font-mono">{issueCount} issue{issueCount > 1 ? 's' : ''}</span>
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-border">
                  {runs.map((run, i) => (
                    <button
                      key={run.id}
                      onClick={() => navigate(`/runs/${run.id}`)}
                      className="w-full flex items-center gap-3 p-3 pl-12 border-b border-border last:border-b-0 hover:bg-surface-1 transition-colors text-left"
                    >
                      <span className="text-xs text-muted-foreground font-mono w-5">{i + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-foreground truncate">{run.input}</div>
                        {run.failureTypes.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-0.5 truncate">{run.whatFailed}</div>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {run.failureTypes.length > 0 ? (
                          run.failureTypes.map(ft => <FailureBadge key={ft} type={ft} />)
                        ) : (
                          <span className="text-xs text-primary">✓</span>
                        )}
                      </div>
                      <span className="text-xs font-mono text-muted-foreground shrink-0">{run.tokens.total}t</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
