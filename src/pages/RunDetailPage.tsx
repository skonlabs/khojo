import { useParams, useNavigate } from "react-router-dom";
import { getRunById } from "@/data/sampleData";
import { FailureBadge } from "@/components/FailureBadge";
import { CodeBlock } from "@/components/CodeBlock";
import { HighlightedOutput } from "@/components/HighlightedOutput";
import { ArrowLeft, Clock, Cpu, FileCode, Tag } from "lucide-react";

export default function RunDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const run = getRunById(id || '');

  if (!run) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Run not found.
        <button onClick={() => navigate('/runs')} className="ml-2 text-primary hover:underline">Back to runs</button>
      </div>
    );
  }

  const hasIssues = run.failureTypes.length > 0;

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground font-mono">{run.id}</h1>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(run.timestamp).toLocaleString()}</span>
            <span className="flex items-center gap-1"><Cpu className="h-3 w-3" /> {run.model}</span>
            <span className="flex items-center gap-1"><FileCode className="h-3 w-3" /> {run.source}</span>
            {run.sessionId && (
              <button
                onClick={() => navigate('/sessions')}
                className="flex items-center gap-1 text-primary hover:underline"
              >
                Session: {run.sessionId}
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-1.5">
          {run.failureTypes.map(ft => <FailureBadge key={ft} type={ft} />)}
          {!hasIssues && <span className="text-sm text-primary font-medium">✓ Pass</span>}
        </div>
      </div>

      {/* Token usage + tags */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex gap-2 text-xs font-mono">
          <span className="bg-surface-1 rounded-md px-3 py-1.5 border border-border text-muted-foreground">
            Input: <span className="text-foreground">{run.tokens.input}t</span>
          </span>
          <span className="bg-surface-1 rounded-md px-3 py-1.5 border border-border text-muted-foreground">
            Output: <span className="text-foreground">{run.tokens.output}t</span>
          </span>
          <span className="bg-surface-1 rounded-md px-3 py-1.5 border border-border text-muted-foreground">
            Total: <span className="text-foreground">{run.tokens.total}t</span>
          </span>
        </div>
        {run.tags && run.tags.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Tag className="h-3 w-3 text-muted-foreground" />
            {run.tags.map(tag => (
              <span key={tag} className="text-xs bg-surface-1 text-muted-foreground rounded px-2 py-0.5 border border-border">{tag}</span>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-5">
        {/* Input */}
        <div>
          <h3 className="text-xs font-medium text-muted-foreground mb-1.5">Input</h3>
          <div className="rounded-md p-3 border border-border bg-surface-1 text-sm font-mono text-foreground whitespace-pre-wrap">
            {run.input}
          </div>
        </div>

        {/* Context */}
        {run.context && (
          <div>
            <h3 className="text-xs font-medium text-muted-foreground mb-1.5">Context (Retrieved)</h3>
            <div className="rounded-md p-3 border border-border bg-surface-1 text-sm font-mono text-foreground whitespace-pre-wrap">
              {run.context}
            </div>
          </div>
        )}

        {/* Output with highlights */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <h3 className="text-xs font-medium text-muted-foreground">Output</h3>
            {hasIssues && run.highlights.length > 0 && (
              <span className="text-[10px] text-muted-foreground bg-surface-2 rounded px-1.5 py-0.5">
                Hover highlights for details
              </span>
            )}
          </div>
          <div className={`rounded-md p-3 border text-sm font-mono ${hasIssues ? 'border-critical/30 bg-critical/5' : 'border-border bg-surface-1'} text-foreground`}>
            <HighlightedOutput text={run.output} highlights={run.highlights} />
          </div>
        </div>

        {/* Highlight legend */}
        {hasIssues && run.highlights.length > 0 && (
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-1.5 rounded-sm bg-[hsl(var(--critical)/0.4)]" /> Incorrect
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-1.5 rounded-sm bg-[hsl(var(--hallucination)/0.4)]" /> Unsupported
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-1.5 rounded-sm bg-[hsl(var(--warning)/0.4)]" /> Repeated
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-1.5 rounded-sm border-b border-dashed border-[hsl(var(--info)/0.5)] bg-[hsl(var(--info)/0.15)]" /> Missing
            </span>
          </div>
        )}

        {/* Diagnosis */}
        {hasIssues && (
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <h3 className="text-sm font-medium text-foreground">Diagnosis</h3>
            <DiagnosisItem emoji="❌" label="What Failed" value={run.whatFailed} />
            <DiagnosisItem emoji="🔍" label="Proof" value={run.whyFailed} />
            <DiagnosisItem emoji="⚠️" label="Root Cause" value={run.rootCause} />
            <div>
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1.5">
                ✅ Suggested Fix
              </span>
              <CodeBlock code={run.fix} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DiagnosisItem({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <div>
      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">{emoji} {label}</span>
      <p className="text-sm text-foreground bg-surface-1 rounded-md p-2.5 border border-border">{value}</p>
    </div>
  );
}
