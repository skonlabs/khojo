import { useState } from "react";
import { FailureBadge } from "@/components/FailureBadge";
import { CodeBlock } from "@/components/CodeBlock";
import { HighlightedOutput } from "@/components/HighlightedOutput";
import { Zap, Loader2 } from "lucide-react";
import type { FailureType, OutputHighlight } from "@/data/sampleData";

interface AnalysisResult {
  failureTypes: FailureType[];
  whatFailed: string;
  whyFailed: string;
  rootCause: string;
  fix: string;
  highlights: OutputHighlight[];
}

const mockAnalyze = (input: string, output: string, context: string): AnalysisResult => {
  // More sophisticated mock analysis
  const results: AnalysisResult = {
    failureTypes: [],
    whatFailed: '',
    whyFailed: '',
    rootCause: '',
    fix: '',
    highlights: [],
  };

  // Check for hallucination by comparing context vs output
  if (context) {
    const contextNumbers = context.match(/\d+/g) || [];
    const outputNumbers = output.match(/\d+/g) || [];
    const mismatchedNums = outputNumbers.filter(n => !contextNumbers.includes(n) && parseInt(n) > 1);

    if (mismatchedNums.length > 0) {
      results.failureTypes.push('hallucination');
      results.whatFailed = `Output contains ${mismatchedNums.length} value(s) not found in context: ${mismatchedNums.slice(0, 3).join(', ')}`;
      results.whyFailed = `Detected factual discrepancies between context and output. Values ${mismatchedNums.slice(0, 3).join(', ')} appear in the output but are not present in the provided context.`;
      results.rootCause = 'Model relied on parametric knowledge instead of provided context. Context may not be positioned optimally in the prompt.';
      results.fix = `- prompt: "Answer the question."
+ prompt: "Answer ONLY using the provided context. Do not add information not present in the context. Quote numbers exactly."`;
      results.highlights = mismatchedNums.slice(0, 5).map(n => ({
        text: n,
        type: 'wrong' as const,
        note: `Value "${n}" not found in context`,
      }));
      return results;
    }
  }

  // Check for verbosity
  const outputWords = output.split(/\s+/).length;
  const inputWords = input.split(/\s+/).length;
  if (outputWords > inputWords * 5 && outputWords > 50) {
    results.failureTypes.push('verbose');
    const ratio = Math.round(outputWords / inputWords);
    results.whatFailed = `Output is ${ratio}x longer than input (${outputWords} words for ${inputWords}-word query) — likely over-generated`;
    results.whyFailed = `Response uses ${outputWords} words for a ${inputWords}-word question. Excessive elaboration detected.`;
    results.rootCause = 'No max_tokens constraint or conciseness instruction in system prompt.';
    results.fix = `+ max_tokens: 200
+ system: "Be concise. Answer in under 100 words unless asked for detail."`;

    // Find repeated phrases
    const sentences = output.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const seen = new Map<string, number>();
    sentences.forEach(s => {
      const words = s.trim().split(/\s+/).slice(0, 4).join(' ').toLowerCase();
      seen.set(words, (seen.get(words) || 0) + 1);
    });
    results.highlights = sentences
      .filter(s => {
        const key = s.trim().split(/\s+/).slice(0, 4).join(' ').toLowerCase();
        return (seen.get(key) || 0) > 1;
      })
      .slice(0, 3)
      .map(s => ({ text: s.trim(), type: 'repeated' as const, note: 'Repetitive content' }));

    return results;
  }

  // Check for incomplete (multi-part question)
  if (input.toLowerCase().includes(' and ')) {
    const parts = input.split(/ and /i);
    if (parts.length >= 2) {
      const secondPart = parts[1].split(/[?.!]/)[0].trim();
      const secondKeywords = secondPart.split(/\s+/).filter(w => w.length > 3);
      const outputLower = output.toLowerCase();
      const missingKeywords = secondKeywords.filter(k => !outputLower.includes(k.toLowerCase()));

      if (missingKeywords.length > secondKeywords.length * 0.5) {
        results.failureTypes.push('incomplete');
        results.whatFailed = `Output only addresses part of the multi-part question. Missing coverage of: "${secondPart}"`;
        results.whyFailed = `The input asks for multiple things but the output primarily covers only the first part. Key terms from the second part are missing: ${missingKeywords.join(', ')}`;
        results.rootCause = 'Model did not plan to address all parts of the query. No instruction to ensure completeness.';
        results.fix = `+ prompt: "Ensure you address ALL parts of the user's question. If they ask for X and Y, include both X and Y."`;
        results.highlights = [{ text: secondPart, type: 'missing' as const, note: 'This part of the question was not addressed' }];
        return results;
      }
    }
  }

  // Default analysis
  if (context) {
    results.failureTypes.push('hallucination');
    results.whatFailed = 'Potential unsupported claims detected — output may contain information not grounded in context';
    results.whyFailed = 'Output may contain information not present in the provided context. Manual verification recommended for factual accuracy.';
    results.rootCause = 'Context grounding may be insufficient in prompt template. Model may be supplementing with parametric knowledge.';
    results.fix = `+ prompt: "Answer ONLY using the provided context. If unsure, say 'I don't have enough information.'"`;
    results.highlights = [];
  } else {
    results.failureTypes.push('inconsistent');
    results.whatFailed = 'Cannot fully verify output without context — potential consistency risk across runs';
    results.whyFailed = 'No context provided to validate against. Output may vary across repeated runs with the same input.';
    results.rootCause = 'Missing context/ground truth for validation. Consider adding retrieved docs or expected output.';
    results.fix = `+ // Add context to your trackAI call:
+ trackAI({ input, output, context: retrievedDocs })`;
    results.highlights = [];
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

  const loadExample = () => {
    setInput('What is the refund policy for premium subscribers?');
    setOutput('Premium subscribers can request a full refund within 30 days of purchase. Simply contact our support team and they will process your refund within 3-5 business days.');
    setContext('Refund Policy: All subscribers, including premium, are eligible for a full refund within 14 days of purchase. Refunds are processed within 7-10 business days.');
    setResult(null);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-semibold text-foreground">Instant Analyzer</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Paste an AI input/output pair — no SDK required.{' '}
          <button onClick={loadExample} className="text-primary hover:underline">Load example →</button>
        </p>
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
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-medium text-foreground">Analysis Result</h3>
            <div className="flex gap-1">
              {result.failureTypes.map(ft => <FailureBadge key={ft} type={ft} />)}
            </div>
          </div>

          <DiagnosisItem emoji="❌" label="What Failed" value={result.whatFailed} />
          <DiagnosisItem emoji="🔍" label="Proof" value={result.whyFailed} />
          <DiagnosisItem emoji="⚠️" label="Root Cause" value={result.rootCause} />

          {/* Highlighted output */}
          {result.highlights.length > 0 && (
            <div>
              <span className="text-xs font-medium text-muted-foreground block mb-1.5">📍 Output with highlights</span>
              <div className="rounded-md p-3 border border-critical/30 bg-critical/5 text-sm font-mono text-foreground">
                <HighlightedOutput text={output} highlights={result.highlights} />
              </div>
            </div>
          )}

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
