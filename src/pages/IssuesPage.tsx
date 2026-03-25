import { useState } from "react";
import { issueGroups, sampleRuns, failureTypeConfig, type FailureType } from "@/data/sampleData";
import { FailureBadge } from "@/components/FailureBadge";
import { CodeBlock } from "@/components/CodeBlock";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronDown, ChevronRight, X, AlertTriangle, TrendingUp } from "lucide-react";

export default function IssuesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const filterType = searchParams.get('type') as FailureType | null;
  const [expandedGroup, setExpandedGroup] = useState<FailureType | null>(filterType);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);

  const groups = filterType
    ? issueGroups.filter(g => g.type === filterType)
    : issueGroups;

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Issues</h1>
          <p className="text-sm text-muted-foreground mt-1">Grouped failure patterns across runs</p>
        </div>
        {filterType && (
          <button
            onClick={() => navigate('/issues')}
            className="flex items-center gap-1.5 text-xs text-muted-foreground bg-surface-1 rounded-md px-2.5 py-1.5 border border-border hover:bg-surface-2"
          >
            <FailureBadge type={filterType} />
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="space-y-2">
        {groups.map(group => {
          const isExpanded = expandedGroup === group.type;
          const config = failureTypeConfig[group.type];
          const groupRuns = group.runs.map(id => sampleRuns.find(r => r.id === id)!).filter(Boolean);

          return (
            <div key={group.type} className="rounded-lg border border-border bg-card overflow-hidden">
              <button
                onClick={() => setExpandedGroup(isExpanded ? null : group.type)}
                className="w-full flex items-center justify-between p-4 hover:bg-surface-1 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  <FailureBadge type={group.type} />
                  <span className="text-sm font-medium text-foreground">{group.count} cases</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className={`text-xs font-mono ${group.priority === 'critical' ? 'text-critical' : 'text-warning'}`}>
                    {group.affectedPercentage}% of runs
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {group.priority === 'critical' ? (
                    <span className="flex items-center gap-1 text-xs text-critical">
                      <AlertTriangle className="h-3 w-3" /> Critical
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-warning">
                      <TrendingUp className="h-3 w-3" /> Improvement
                    </span>
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-border">
                  {groupRuns.map(run => {
                    const isRunExpanded = expandedRun === run.id;
                    return (
                      <div key={run.id} className="border-b border-border last:border-b-0">
                        <button
                          onClick={() => setExpandedRun(isRunExpanded ? null : run.id)}
                          className="w-full flex items-center gap-3 p-3 pl-10 hover:bg-surface-1 transition-colors text-left"
                        >
                          {isRunExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                          <span className="text-xs font-mono text-muted-foreground">{run.id}</span>
                          <span className="text-sm text-foreground truncate flex-1">{run.whatFailed}</span>
                          <span className="text-xs font-mono text-muted-foreground">{run.source}</span>
                        </button>

                        {isRunExpanded && (
                          <div className="px-10 pb-4 space-y-3 animate-fade-in">
                            <IssueDetail label="❌ What Failed" value={run.whatFailed} />
                            <IssueDetail label="🔍 Proof" value={run.whyFailed} />
                            <IssueDetail label="⚠️ Root Cause" value={run.rootCause} />
                            <div>
                              <span className="text-xs font-medium text-muted-foreground block mb-1.5">✅ Fix</span>
                              <CodeBlock code={run.fix} />
                            </div>
                            <button
                              onClick={() => navigate(`/runs/${run.id}`)}
                              className="text-xs text-primary hover:underline"
                            >
                              View full run →
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IssueDetail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs font-medium text-muted-foreground block mb-1">{label}</span>
      <p className="text-sm text-foreground bg-surface-1 rounded-md p-2.5 border border-border">{value}</p>
    </div>
  );
}
