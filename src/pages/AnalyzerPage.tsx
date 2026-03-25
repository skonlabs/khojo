import { useState } from "react";
import { FailureBadge } from "@/components/FailureBadge";
import { CodeBlock } from "@/components/CodeBlock";
import { Zap, Loader2 } from "lucide-react";
import type { FailureType } from "@/data/sampleData";

interface AnalysisResult {
  failureTypes: FailureType[];
  whatFailed: string;
  whyFailed: string;
  rootCause: string;
  fix: string;
}

const mockAnalyze = (input: string, output: string, context: string): AnalysisResult | null => {
  if (!input.trim() || !output.trim()) return null;

  // Simple heuristic mock analysis
  const results: AnalysisResult = {
    failureTypes: [],
    whatFailed: '',
    whyFailed: '',
    rootCause: '',
    fix: '',
  };

  if (context && output.toLowerCase().includes('30 day') && context.toLowerCase().includes('14 day')) {
    results.failureTypes.push('hallucination');
    results.whatFailed = 'Output contains claims that contradict the provided context';
    results.whyFailed = 'Detected factual discrepancy between context and output.';
    results.rootCause = 'Model relied on parametric knowledge instead of provided context.';
    results.fix = `- prompt: "Answer the question."\n+ prompt: "Answer ONLY using the provided context. Do not add information not present in the context."`;
    return results;
  }

  if (output.length > input.length * 5) {
    results.failureTypes.push('verbose');
    results.whatFailed = `Output is ${Math.round(output.length / input.length)}x longer than input — likely over-generated`;
    results.whyFailed = `Output contains ${output.split(' ').length} words for a ${input.split(' ').length}-word question.`;
    results.rootCause = 'No max_tokens or conciseness instruction in prompt.';
    results.fix = `+ max_tokens: 200\n+ system: "Be concise. Answer in under 100 words unless asked for detail."`;
    return results;
  }

  if (input.toLowerCase().includes(' and ') && !output.toLowerCase().includes(input.split(' and ')[1]?.split(' ')[0] || '')) {
    results.failureTypes.push('incomplete');
    results.whatFailed = 'Output only addresses part of the multi-part question';
    results.whyFailed = 'The input asks for multiple things but the output only covers one part.';
    results.rootCause = 'Model did not plan to address all parts of the query.';
    results.fix = `+ prompt: "Ensure you address ALL parts of the user's question."`;
    return results;
  }

  // Default: check for basic issues
  if (context) {
    results.failureTypes.push('hallucination');
    results.whatFailed = 'Potential unsupported claims detected in output';
    results.whyFailed = 'Output may contain information not present in the provided context. Manual verification recommended.';
    results.rootCause = 'Context grounding may be insufficient in prompt template.';
    results.fix = `+ prompt: "Answer ONLY using the provided context. If unsure, say 'I don't have enough information.'"`;
  } else {
    results.failureTypes.push('inconsistent');
    results.whatFailed = 'Cannot verify output without context — potential consistency risk';
    results.whyFailed = 'No context provided to validate against. Output may vary across runs.';
    results.rootCause = 'Missing context/ground truth for validation.';
    results.fix = `+ // Add context to your trackAI call:\n+ trackAI({ input, output, context: retrievedDocs })`;
  }

  return results;
};

export default function AnalyzerPage() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [context, setContext] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = () => {
    setLoading(true);
    setResult(null);
    setTimeout(() => {
      const analysis = mockAnalyze(input, output, context);
      setResult(analysis);
      setLoading(false);
    }, 800);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold text-foreground">Instant Analyzer</h1>
        </div>
        <p className="text-sm text-muted-foreground">Paste an AI input/output pair. No SDK required.</p>
      </div>

      <div className="space-y-4 mb-6">
        <Field label="Input (user query)" value={input} onChange={setInput} placeholder="What is the refund policy?" />
        <Field label="Output (AI response)" value={output} onChange={setOutput} placeholder="Our refund policy allows returns within 30 days..." rows={5} />
        <Field label="Context (optional — retrieved docs, ground truth)" value={context} onChange={setContext} placeholder="Refund Policy: Full refund within 14 days of purchase..." rows={3} />

        <button
          onClick={handleAnalyze}
          disabled={!input.trim() || !output.trim() || loading}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          Analyze
        </button>
      </div>

      {result && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-4 animate-fade-in">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-foreground">Analysis Result</h3>
            <div className="flex gap-1">
              {result.failureTypes.map(ft => <FailureBadge key={ft} type={ft} />)}
            </div>
          </div>

          <DiagnosisItem emoji="❌" label="What Failed" value={result.whatFailed} />
          <DiagnosisItem emoji="🔍" label="Proof" value={result.whyFailed} />
          <DiagnosisItem emoji="⚠️" label="Root Cause" value={result.rootCause} />
          <div>
            <span className="text-xs font-medium text-muted-foreground block mb-1.5">✅ Suggested Fix</span>
            <CodeBlock code={result.fix} />
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, rows = 2 }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; rows?: number }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground block mb-1.5">{label}</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full bg-surface-1 border border-border rounded-md p-3 text-sm font-mono text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
      />
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
