import { sampleRuns } from "@/data/sampleData";
import { FailureBadge } from "@/components/FailureBadge";
import { useNavigate } from "react-router-dom";

export default function RunsPage() {
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Runs</h1>
        <p className="text-sm text-muted-foreground mt-1">All captured AI runs</p>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-[80px_1fr_auto_100px_80px] gap-3 px-4 py-2.5 bg-surface-1 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <span>ID</span>
          <span>Input</span>
          <span>Issues</span>
          <span>Source</span>
          <span className="text-right">Tokens</span>
        </div>
        {sampleRuns.map(run => (
          <button
            key={run.id}
            onClick={() => navigate(`/runs/${run.id}`)}
            className="w-full grid grid-cols-[80px_1fr_auto_100px_80px] gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-surface-1 transition-colors text-left items-center"
          >
            <span className="text-xs font-mono text-muted-foreground">{run.id.replace('run-', '#')}</span>
            <span className="text-sm text-foreground truncate">{run.input}</span>
            <div className="flex gap-1">
              {run.failureTypes.length > 0 ? (
                run.failureTypes.map(ft => <FailureBadge key={ft} type={ft} />)
              ) : (
                <span className="text-xs text-primary font-medium">✓ Pass</span>
              )}
            </div>
            <span className="text-xs font-mono text-muted-foreground truncate">{run.source}</span>
            <span className="text-xs font-mono text-muted-foreground text-right">{run.tokens.total}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
