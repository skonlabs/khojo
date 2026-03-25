import { useState, useMemo } from "react";
import { issueGroups, sampleRuns, failureTypeConfig, type FailureType } from "@/data/sampleData";
import { FailureBadge } from "@/components/FailureBadge";
import { CodeBlock } from "@/components/CodeBlock";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronDown, ChevronRight, X, AlertTriangle, TrendingUp, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function IssuesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const filterType = searchParams.get('type') as FailureType | null;
  const [expandedGroup, setExpandedGroup] = useState<FailureType | null>(filterType);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [dismissedRuns, setDismissedRuns] = useState<Set<string>>(new Set());
  const [showDismissed, setShowDismissed] = useState(false);
  const [filterConfidence, setFilterConfidence] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  const groups = useMemo(() => {
    let g = filterType ? issueGroups.filter(g => g.type === filterType) : issueGroups;
    return g;
  }, [filterType]);

  const dismissRun = (runId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedRuns(prev => {
      const next = new Set(prev);
      if (next.has(runId)) {
        next.delete(runId);
        toast.info("Issue restored");
      } else {
        next.add(runId);
        toast.success("Issue dismissed — similar issues will be deprioritized");
      }
      return next;
    });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Issues</h1>
          <p className="text-sm text-muted-foreground mt-1">Grouped failure patterns across runs</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Confidence filter */}
          <select
            value={filterConfidence}
            onChange={e => setFilterConfidence(e.target.value as typeof filterConfidence)}
            className="bg-surface-1 border border-border rounded-md px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All confidence</option>
            <option value="high">High only</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Show dismissed toggle */}
          <button
            onClick={() => setShowDismissed(!showDismissed)}
            className={`flex items-center gap-1.5 text-xs rounded-md px-2.5 py-1.5 border border-border transition-colors ${
              showDismissed ? 'bg-surface-2 text-foreground' : 'bg-surface-1 text-muted-foreground hover:text-foreground'
            }`}
          >
            {showDismissed ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            {showDismissed ? 'Showing dismissed' : 'Dismissed hidden'}
          </button>

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
      </div>

      <div className="space-y-2">
        {groups.map(group => {
          const isExpanded = expandedGroup === group.type;
          const groupRuns = group.runs
            .map(id => sampleRuns.find(r => r.id === id)!)
            .filter(Boolean)
            .filter(r => filterConfidence === 'all' || r.confidence === filterConfidence)
            .filter(r => showDismissed || !dismissedRuns.has(r.id));

          if (groupRuns.length === 0 && !isExpanded) return null;

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
                  {dismissedRuns.size > 0 && groupRuns.length < group.runs.length && (
                    <span className="text-[10px] text-muted-foreground">({group.runs.length - groupRuns.length} dismissed)</span>
                  )}
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
                  {groupRuns.length === 0 ? (
                    <div className="p-4 pl-10 text-sm text-muted-foreground">No issues match current filters.</div>
                  ) : (
                    groupRuns.map(run => {
                      const isRunExpanded = expandedRun === run.id;
                      const isDismissed = dismissedRuns.has(run.id);
                      return (
                        <div key={run.id} className={`border-b border-border last:border-b-0 ${isDismissed ? 'opacity-50' : ''}`}>
                          <div className="flex items-center">
                            <button
                              onClick={() => setExpandedRun(isRunExpanded ? null : run.id)}
                              className="flex-1 flex items-center gap-3 p-3 pl-10 hover:bg-surface-1 transition-colors text-left"
                            >
                              {isRunExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                              <span className="text-xs font-mono text-muted-foreground">{run.id}</span>
                              <span className="text-sm text-foreground truncate flex-1">{run.whatFailed}</span>
                              <span className="text-xs font-mono text-muted-foreground">{run.source}</span>
                            </button>
                            <button
                              onClick={(e) => dismissRun(run.id, e)}
                              className="p-2 mr-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
                              title={isDismissed ? 'Restore issue' : 'Dismiss issue'}
                            >
                              {isDismissed ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                            </button>
                          </div>

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
                                View full run with highlighted output →
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
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
