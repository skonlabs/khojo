import { useParams, useNavigate } from "react-router-dom";
import { getRunById } from "@/data/sampleData";
import { FailureBadge } from "@/components/FailureBadge";
import { CodeBlock } from "@/components/CodeBlock";
import { ArrowLeft, Clock, Cpu, FileCode } from "lucide-react";

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

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground font-mono">{run.id}</h1>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(run.timestamp).toLocaleString()}</span>
            <span className="flex items-center gap-1"><Cpu className="h-3 w-3" /> {run.model}</span>
            <span className="flex items-center gap-1"><FileCode className="h-3 w-3" /> {run.source}</span>
          </div>
        </div>
        <div className="flex gap-1.5">
          {run.failureTypes.map(ft => <FailureBadge key={ft} type={ft} />)}
          {run.failureTypes.length === 0 && <span className="text-sm text-primary font-medium">✓ Pass</span>}
        </div>
      </div>

      {/* Token usage */}
      <div className="flex gap-4 mb-6 text-xs font-mono">
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

      <div className="space-y-5">
        {/* Input */}
        <Section title="Input" mono>
          {run.input}
        </Section>

        {/* Context */}
        {run.context && (
          <Section title="Context (Retrieved)" mono>
            {run.context}
          </Section>
        )}

        {/* Output */}
        <Section title="Output" mono highlight={run.failureTypes.length > 0}>
          {run.output}
        </Section>

        {/* Diagnosis */}
        {run.failureTypes.length > 0 && (
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

function Section({ title, children, mono, highlight }: { title: string; children: React.ReactNode; mono?: boolean; highlight?: boolean }) {
  return (
    <div>
      <h3 className="text-xs font-medium text-muted-foreground mb-1.5">{title}</h3>
      <div className={`rounded-md p-3 border text-sm whitespace-pre-wrap ${mono ? 'font-mono text-xs' : ''} ${highlight ? 'border-critical/30 bg-critical/5' : 'border-border bg-surface-1'} text-foreground`}>
        {children}
      </div>
    </div>
  );
}

function DiagnosisItem({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <div>
      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
        {emoji} {label}
      </span>
      <p className="text-sm text-foreground bg-surface-1 rounded-md p-2.5 border border-border">{value}</p>
    </div>
  );
}
