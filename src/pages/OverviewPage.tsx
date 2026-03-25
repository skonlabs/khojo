import { issueGroups, failureTypeConfig, getFailedRuns, sampleRuns } from "@/data/sampleData";
import { FailureBadge } from "@/components/FailureBadge";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Flame, TrendingUp, Zap, ArrowRight } from "lucide-react";

export default function OverviewPage() {
  const navigate = useNavigate();
  const failedRuns = getFailedRuns();
  const totalRuns = sampleRuns.length;
  const failureRate = Math.round((failedRuns.length / totalRuns) * 100);

  const criticalGroups = issueGroups.filter(g => g.priority === 'critical');
  const improvementGroups = issueGroups.filter(g => g.priority === 'improvement');

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Real-time AI output monitoring</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatCard label="Total Runs" value={totalRuns.toString()} icon={<Zap className="h-4 w-4" />} />
        <StatCard label="Failed Runs" value={failedRuns.length.toString()} icon={<AlertTriangle className="h-4 w-4" />} accent />
        <StatCard label="Failure Rate" value={`${failureRate}%`} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Issue Types" value={issueGroups.filter(g => g.count > 0).length.toString()} icon={<Flame className="h-4 w-4" />} />
      </div>

      {/* Critical issues */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Flame className="h-4 w-4 text-critical" />
          <h2 className="text-sm font-medium text-foreground">Needs Attention Now</h2>
        </div>
        <div className="space-y-2">
          {criticalGroups.map(group => {
            const config = failureTypeConfig[group.type];
            return (
              <button
                key={group.type}
                onClick={() => navigate(`/issues?type=${group.type}`)}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors text-left group"
              >
                <div className="flex items-center gap-3">
                  <FailureBadge type={group.type} />
                  <span className="text-sm text-foreground">{group.count} cases</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-critical font-mono">{group.affectedPercentage}% of runs</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Improvements */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-warning" />
          <h2 className="text-sm font-medium text-foreground">Can Improve</h2>
        </div>
        <div className="space-y-2">
          {improvementGroups.map(group => (
            <button
              key={group.type}
              onClick={() => navigate(`/issues?type=${group.type}`)}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-card border border-border hover:border-warning/30 transition-colors text-left group"
            >
              <div className="flex items-center gap-3">
                <FailureBadge type={group.type} />
                <span className="text-sm text-foreground">{group.count} cases</span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-warning font-mono">{group.affectedPercentage}% of runs</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </button>
          ))}
        </div>
      </div>

      {/* Recent failed runs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-foreground">Recent Issues</h2>
          <button onClick={() => navigate('/runs')} className="text-xs text-primary hover:underline">
            View all runs →
          </button>
        </div>
        <div className="space-y-1.5">
          {failedRuns.slice(0, 5).map(run => (
            <button
              key={run.id}
              onClick={() => navigate(`/runs/${run.id}`)}
              className="w-full flex items-center gap-3 p-2.5 rounded-md bg-card border border-border hover:border-primary/30 transition-colors text-left"
            >
              <span className="text-xs font-mono text-muted-foreground shrink-0">{run.id}</span>
              <span className="text-sm text-foreground truncate flex-1">{run.input}</span>
              <div className="flex gap-1 shrink-0">
                {run.failureTypes.map(ft => (
                  <FailureBadge key={ft} type={ft} />
                ))}
              </div>
              <span className="text-xs font-mono text-muted-foreground shrink-0">{run.tokens.total}t</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, accent }: { label: string; value: string; icon: React.ReactNode; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-card border border-border p-4">
      <div className="flex items-center gap-2 mb-2 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <span className={`text-2xl font-semibold ${accent ? 'text-critical' : 'text-foreground'}`}>
        {value}
      </span>
    </div>
  );
}
