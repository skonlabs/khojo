import { useState } from "react";
import { FailureBadge } from "@/components/FailureBadge";
import { CodeBlock } from "@/components/CodeBlock";
import { HighlightedOutput } from "@/components/HighlightedOutput";
import { Zap } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ── Constants ────────────────────────────────────────────────────────────────
const MAX_FIELD_CHARS = 40_000; // ~10 000 tokens — generous limit for client-side

const MODELS = [
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4-turbo",
  "gpt-3.5-turbo",
  "claude-opus-4-6",
  "claude-sonnet-4-6",
  "claude-haiku-4-5",
  "claude-3.5-sonnet",
  "claude-3-haiku",
  "gemini-1.5-pro",
  "gemini-pro",
];

// ── Shared text utilities (mirrors backend logic) ────────────────────────────
const STOPWORDS = new Set([
  "the","a","an","is","are","was","were","be","been","being","of","to","in",
  "it","and","or","but","for","with","on","at","by","from","as","into","about",
  "that","this","these","those","i","you","he","she","we","they","me","him",
  "her","us","them","my","your","his","its","our","their","what","which","who",
  "whom","do","does","did","has","have","had","will","would","shall","should",
  "may","might","can","could","not","no","so","if","then","than","too","very",
  "just","also","how","when","where","why","all","each","every","both","few",
  "more","most","other","some","such","only","own","same","still","between",
  "up","out","over","after","before","through","during","above","below","under",
  "again","further","once","here","there",
]);

function getContentWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter((w) => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

function wordFrequencyMap(words: string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const w of words) map.set(w, (map.get(w) ?? 0) + 1);
  return map;
}

// ── Types ────────────────────────────────────────────────────────────────────
interface OutputHighlight {
  text: string;
  type: "wrong" | "repeated" | "missing";
  note: string;
}

interface DetectedFailure {
  type: string;
  whatFailed: string;
  whyFailed: string;
  rootCause: string;
  fix: string;
  highlights: OutputHighlight[];
  signals: number;
}

interface AnalysisResult {
  failures: DetectedFailure[];
  primaryFailure: DetectedFailure | null;
  confidence: "high" | "medium" | "low" | null;
}

// ── Detector 1: Hallucination ────────────────────────────────────────────────
function detectHallucination(
  output: string,
  context: string,
  prompt: string,
  model: string
): DetectedFailure | null {
  const ctxNorm = context.toLowerCase().replace(/,/g, "");

  // Numbers & measurements
  const numPattern =
    /\b\d[\d,]*(?:\.\d+)?\s*(?:%|percent|k\b|m\b|billion|million|thousand|days?|hours?|months?|years?|usd|\$|€|£|km|miles?|weeks?|seconds?|minutes?)?/gi;
  const rawNums = output.match(numPattern) ?? [];
  const outputNums = [
    ...new Set(rawNums.map((n) => n.replace(/,/g, "").toLowerCase().trim())),
  ].filter((n) => {
    const num = parseFloat(n);
    return !isNaN(num) && num > 1;
  });
  const unsupportedNums = outputNums.filter((n) => !ctxNorm.includes(n));

  // Dates
  const datePattern =
    /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:,?\s+\d{4})?|\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\b\d{4}\b/gi;
  const outputDates = [...new Set((output.match(datePattern) ?? []).map((d) => d.toLowerCase()))];
  const unsupportedDates = outputDates.filter((d) => !ctxNorm.includes(d));

  // Multi-word proper nouns — all parts must be missing from context
  const properNounPattern = /(?:[A-Z][a-z]{1,}(?:\s+[A-Z][a-z]+){1,4})/g;
  const outputProperNouns = [...new Set(output.match(properNounPattern) ?? [])];
  const unsupportedProperNouns = outputProperNouns.filter((noun) => {
    const parts = noun.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    return parts.length >= 2 && parts.every((w) => !ctxNorm.includes(w));
  });

  // Quoted strings
  const quotedPattern = /"([^"]{5,})"|'([^']{5,})'/g;
  const unsupportedQuoted: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = quotedPattern.exec(output)) !== null) {
    const q = (m[1] || m[2]).toLowerCase();
    if (!ctxNorm.includes(q)) unsupportedQuoted.push(q);
  }

  const allUnsupported = [
    ...unsupportedNums.slice(0, 5),
    ...unsupportedDates.slice(0, 3),
    ...unsupportedProperNouns.slice(0, 4).map((n) => n.toLowerCase()),
    ...unsupportedQuoted.slice(0, 3),
  ];

  const totalClaims =
    outputNums.length +
    outputDates.length +
    outputProperNouns.length +
    unsupportedQuoted.length;
  const totalUnsupported =
    unsupportedNums.length +
    unsupportedDates.length +
    unsupportedProperNouns.length +
    unsupportedQuoted.length;

  if (totalClaims === 0 || allUnsupported.length < 2) return null;

  const ratio = totalUnsupported / totalClaims;
  if (ratio < 0.3) return null;

  let signals = 1;
  if (ratio > 0.55) signals = 2;
  if (unsupportedNums.length >= 2 || ratio > 0.75) signals = Math.min(signals + 1, 3);

  const highlights: OutputHighlight[] = allUnsupported.slice(0, 5).map((term) => ({
    text: term,
    type: "wrong" as const,
    note: `"${term}" not found in context`,
  }));

  const fixBase = "Answer ONLY using the provided context. Do not add information not present in the context. If the answer is not available, say so explicitly.";
  const fix = prompt
    ? `- prompt: "${prompt.slice(0, 50)}..."\n+ prompt: "${prompt.slice(0, 40)}... ${fixBase}"`
    : `+ system: "${fixBase}"`;

  return {
    type: "hallucination",
    whatFailed: `Output contains ${allUnsupported.length} claim(s) not grounded in context (${Math.round(ratio * 100)}% of verifiable claims are unverified): ${allUnsupported.slice(0, 3).join(", ")}`,
    whyFailed: `Model (${model}) drew on parametric training knowledge instead of the provided context. ${totalUnsupported} of ${totalClaims} verifiable claim(s) could not be traced back to the context.`,
    rootCause: prompt
      ? `System prompt "${prompt.slice(0, 60)}..." does not enforce context grounding. Model (${model}) relied on prior knowledge.`
      : `Model (${model}) relied on prior knowledge — no system prompt to enforce context grounding.`,
    fix,
    highlights,
    signals,
  };
}

// ── Detector 2: Incomplete ────────────────────────────────────────────────────
function detectIncomplete(
  input: string,
  output: string,
  prompt: string,
  model: string
): DetectedFailure | null {
  const inputLower = input.toLowerCase();
  const outputWordCount = output.split(/\s+/).filter(Boolean).length;
  const inputWordCount = input.split(/\s+/).filter(Boolean).length;

  const questionSegments = input
    .split(/\?/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length >= 4);

  const connectorPattern =
    /\b(?:and also|as well as|in addition(?:\s+to)?|furthermore|additionally|besides|moreover|along with)\b/i;
  const simpleConnectorPattern = /\b(?:also|and)\s+(?:what|how|why|when|where|which)\b/i;
  const numberedPattern = /\b(?:1[.)]\s|2[.)]\s|first[,\s]|second[,\s]|third[,\s])/i;

  const hasMultipleParts =
    connectorPattern.test(input) ||
    simpleConnectorPattern.test(input) ||
    numberedPattern.test(input);

  const questionWordCount = [
    "what", "how", "why", "when", "where", "which", "who",
  ].filter((w) => inputLower.includes(w)).length;

  const isShortOutput = outputWordCount < inputWordCount * 0.4 && outputWordCount < 100;

  let uncoveredSubQuestions = 0;
  const missingParts: string[] = [];

  if (questionSegments.length >= 2) {
    for (const sq of questionSegments.slice(0, 5)) {
      const sqWords = getContentWords(sq);
      if (sqWords.length < 2) continue;
      const outputLower = output.toLowerCase();
      const matched = sqWords.filter((w) => outputLower.includes(w)).length;
      if (matched / sqWords.length < 0.4) {
        uncoveredSubQuestions++;
        missingParts.push(sq.slice(0, 70));
      }
    }
  }

  let signals = 0;
  if (hasMultipleParts) signals++;
  if (questionWordCount >= 2) signals++;
  if (isShortOutput) signals++;
  if (uncoveredSubQuestions >= 1) signals++;

  if (signals < 2) return null;
  if (!isShortOutput && uncoveredSubQuestions === 0) return null;

  const highlights: OutputHighlight[] = missingParts.map((part) => ({
    text: part.slice(0, 60),
    type: "missing" as const,
    note: "This part of the question was not adequately addressed",
  }));

  const fix = prompt
    ? `- prompt: "${prompt.slice(0, 50)}..."\n+ prompt: "${prompt.slice(0, 40)}... Ensure you address ALL parts of the user's question."`
    : `+ system: "Ensure you address ALL parts of the user's question. Number your responses to match each part."`;

  return {
    type: "incomplete",
    whatFailed: `Output only partially responds to a multi-part query (${outputWordCount} words for a ${inputWordCount}-word query${uncoveredSubQuestions > 0 ? `, ${uncoveredSubQuestions} sub-question(s) not adequately addressed` : ""}).`,
    whyFailed: `Input contains ${questionWordCount > 1 ? `${questionWordCount} question words` : ""}${hasMultipleParts ? (questionWordCount > 1 ? " and " : "") + "multi-part connectors" : ""}, but output only covers part of it.`,
    rootCause: prompt
      ? `Prompt "${prompt.slice(0, 50)}..." does not instruct ${model} to address all parts.`
      : `Model (${model}) did not plan to address all sub-questions. No prompt enforcing completeness.`,
    fix,
    highlights,
    signals: Math.min(signals, 3),
  };
}

// ── Detector 3: Irrelevant ────────────────────────────────────────────────────
function detectIrrelevant(
  input: string,
  output: string,
  model: string
): DetectedFailure | null {
  const inputWords = getContentWords(input);
  const outputWords = getContentWords(output);

  if (inputWords.length < 3 || outputWords.length < 3) return null;

  const inputFreq = wordFrequencyMap(inputWords);
  const sortedInputWords = [...inputFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w);

  const topN = Math.max(5, Math.min(20, Math.ceil(sortedInputWords.length * 0.3)));
  const keyInputWords = sortedInputWords.slice(0, topN);

  const outputWordSet = new Set(outputWords);
  const matchCount = keyInputWords.filter((w) => outputWordSet.has(w)).length;
  const coverageRatio = matchCount / keyInputWords.length;
  const jaccard = jaccardSimilarity(inputWords, outputWords);
  const missingKeyWords = keyInputWords.filter((w) => !outputWordSet.has(w));

  if (coverageRatio >= 0.25 || jaccard >= 0.15) return null;

  let signals = 1;
  if (coverageRatio < 0.1 && jaccard < 0.08) signals = 2;
  if (matchCount === 0 && inputWords.length >= 5) signals = 3;

  const highlights: OutputHighlight[] = missingKeyWords.slice(0, 5).map((kw) => ({
    text: kw,
    type: "missing" as const,
    note: `Key term "${kw}" from the input is absent in the output`,
  }));

  return {
    type: "irrelevant",
    whatFailed: `Output addresses different content from what was asked (${Math.round(coverageRatio * 100)}% keyword coverage, ${Math.round(jaccard * 100)}% Jaccard similarity). Missing key terms: ${missingKeyWords.slice(0, 4).join(", ")}.`,
    whyFailed: `Only ${matchCount} of ${keyInputWords.length} key input words appear in the output. The model (${model}) interpreted the request differently.`,
    rootCause: `Unclear or ambiguous input — model interpreted the request differently from intent.`,
    fix: `Restate the core question explicitly at the top of your prompt.\n+ "Specifically address the following: ${input.slice(0, 80)}..."`,
    highlights,
    signals,
  };
}

// ── Detector 4: Verbose ───────────────────────────────────────────────────────
function detectVerbose(
  input: string,
  output: string,
  model: string
): DetectedFailure | null {
  const outputWordCount = output.split(/\s+/).filter(Boolean).length;
  const inputWordCount = input.split(/\s+/).filter(Boolean).length;

  if (outputWordCount < 50) return null;

  const outputWords = output.split(/\s+/).filter(Boolean);
  const repeatedChunks: string[] = [];

  for (const windowSize of [5, 10, 15]) {
    if (outputWords.length < windowSize * 2) continue;
    const seen = new Map<string, number>();
    for (let i = 0; i <= outputWords.length - windowSize; i++) {
      const chunk = outputWords.slice(i, i + windowSize).join(" ").toLowerCase();
      const count = (seen.get(chunk) ?? 0) + 1;
      seen.set(chunk, count);
      if (count === 2 && chunk.length > 15) repeatedChunks.push(chunk);
    }
    if (repeatedChunks.length >= 2) break;
  }

  const sentences = output
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length >= 5);
  const sentenceSigs = new Map<string, number>();
  let repeatedSentences = 0;
  const repeatedSentenceTexts: string[] = [];
  for (const s of sentences) {
    const sig = s.split(/\s+/).slice(0, 4).join(" ").toLowerCase();
    const count = (sentenceSigs.get(sig) ?? 0) + 1;
    sentenceSigs.set(sig, count);
    if (count === 2) {
      repeatedSentences++;
      repeatedSentenceTexts.push(s.slice(0, 60));
    }
  }

  const isExcessivelyLong = outputWordCount > inputWordCount * 5 && outputWordCount > 100;
  const isVeryLong = outputWordCount > inputWordCount * 3 && outputWordCount > 150;
  const hasRepetition = repeatedChunks.length >= 2 || repeatedSentences >= 1;

  if (!isExcessivelyLong && !hasRepetition && !isVeryLong) return null;

  let signals = 0;
  if (isVeryLong) signals++;
  if (isExcessivelyLong) signals++;
  if (hasRepetition) signals++;

  if (signals === 0) return null;

  const ratio = Math.round(outputWordCount / Math.max(inputWordCount, 1));
  const highlights: OutputHighlight[] = [
    ...repeatedChunks.slice(0, 2).map((c) => ({
      text: c,
      type: "repeated" as const,
      note: "Repeated phrase detected",
    })),
    ...repeatedSentenceTexts.slice(0, 2).map((s) => ({
      text: s,
      type: "repeated" as const,
      note: "Repeated sentence opening detected",
    })),
  ];

  return {
    type: "verbose",
    whatFailed: `Output is ${ratio}× the length of the input (${outputWordCount} words for a ${inputWordCount}-word query) with ${repeatedChunks.length + repeatedSentences} repetition instance(s).`,
    whyFailed: `Response uses ${outputWordCount} words for a ${inputWordCount}-word question. ${hasRepetition ? "Repeated phrases/sentences detected." : "Excessive elaboration detected."}`,
    rootCause: `No max_tokens constraint or conciseness instruction. Model: ${model}.`,
    fix: `+ max_tokens: ${Math.ceil(inputWordCount * 2.5)}\n+ system: "Be concise. Respond in under ${Math.ceil(inputWordCount * 2)} words. Do not repeat points."`,
    highlights,
    signals: Math.min(signals, 3),
  };
}

// ── Main analysis entry point ─────────────────────────────────────────────────
function analyze(
  input: string,
  output: string,
  context: string,
  prompt: string,
  model: string
): AnalysisResult {
  const failures: DetectedFailure[] = [];

  // Run all applicable detectors
  if (context) {
    const h = detectHallucination(output, context, prompt, model);
    if (h) failures.push(h);
  }

  const inc = detectIncomplete(input, output, prompt, model);
  if (inc) failures.push(inc);

  const irr = detectIrrelevant(input, output, model);
  if (irr) failures.push(irr);

  const verb = detectVerbose(input, output, model);
  if (verb) failures.push(verb);

  // If no specific failure detected and context is provided, flag potential
  // context-grounding issue as low-confidence hallucination risk
  if (failures.length === 0 && context) {
    failures.push({
      type: "hallucination",
      whatFailed: "Potential unsupported claims — output could not be fully verified against context",
      whyFailed: "No specific numerical or named-entity discrepancies were found, but the output may still contain unverifiable claims.",
      rootCause: `Context grounding may be insufficient${prompt ? ` in prompt: "${prompt.slice(0, 50)}..."` : ""}. Model: ${model}.`,
      fix: `+ system: "Answer ONLY using the provided context. If unsure, say 'I don't have enough information.'"`,
      highlights: [],
      signals: 1,
    });
  } else if (failures.length === 0 && !context) {
    failures.push({
      type: "inconsistent",
      whatFailed: "Cannot fully verify without context — potential consistency risk",
      whyFailed: "No context was provided to validate output claims against.",
      rootCause: `Missing context/ground truth for validation. Model: ${model}.`,
      fix: `+ // Add context to your trackAI call:\n+ trackAI({ input, output, context: retrievedDocs })`,
      highlights: [],
      signals: 1,
    });
  }

  const priority = ["hallucination", "incomplete", "irrelevant", "inconsistent", "verbose"];
  const primaryFailure =
    failures.find((f) => f.type === priority.find((p) => failures.some((ff) => ff.type === p))) ??
    failures[0] ??
    null;

  const totalSignals = failures.reduce((s, f) => s + f.signals, 0);
  const confidence =
    failures.length === 0
      ? null
      : totalSignals >= 4
      ? "high"
      : totalSignals >= 2
      ? "medium"
      : "low";

  return { failures, primaryFailure, confidence };
}

// ── Component ────────────────────────────────────────────────────────────────
export default function AnalyzerPage() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [context, setContext] = useState("");
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("gpt-4o");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleAnalyze = () => {
    setValidationError(null);

    if (!input.trim() || !output.trim()) return;

    // Size validation
    for (const [label, value] of [
      ["Input", input],
      ["Output", output],
      ["Context", context],
      ["System prompt", prompt],
    ]) {
      if (value.length > MAX_FIELD_CHARS) {
        setValidationError(
          `${label} exceeds the ${(MAX_FIELD_CHARS / 1000).toFixed(0)} K character limit. Please shorten it.`
        );
        return;
      }
    }

    setResult(analyze(input, output, context, prompt, model));
  };

  const loadExample = () => {
    setInput("What is the refund policy for premium subscribers?");
    setOutput(
      "Premium subscribers can request a full refund within 30 days of purchase. Simply contact our support team and they will process your refund within 3-5 business days."
    );
    setContext(
      "Refund Policy: All subscribers, including premium, are eligible for a full refund within 14 days of purchase. Refunds are processed within 7-10 business days."
    );
    setPrompt("Answer the user's question comprehensively.");
    setModel("gpt-4o");
    setResult(null);
    setValidationError(null);
  };

  const primaryHighlights = result?.primaryFailure?.highlights ?? [];

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="h-5 w-5 text-primary" />
          <h1 className="text-foreground">Instant Analyzer</h1>
        </div>
        <p className="text-muted-foreground">
          Paste an AI input/output pair — no SDK required. Get immediate failure detection.{" "}
          <button onClick={loadExample} className="text-primary hover:underline">
            Load example →
          </button>
        </p>
      </div>

      <div className="space-y-4 mb-6">
        <Field
          label="Input (user query)"
          value={input}
          onChange={setInput}
          placeholder="What is the refund policy?"
        />
        <Field
          label="Output (AI response)"
          value={output}
          onChange={setOutput}
          placeholder="Our refund policy allows returns within 30 days..."
          rows={5}
        />
        <Field
          label="Context (optional — retrieved docs, ground truth)"
          value={context}
          onChange={setContext}
          placeholder="Refund Policy: Full refund within 14 days of purchase..."
          rows={3}
        />
        <Field
          label="System prompt (optional)"
          value={prompt}
          onChange={setPrompt}
          placeholder="Answer the user's question comprehensively."
          rows={2}
        />

        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">Model</label>
          <Select value={model} onValueChange={setModel}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODELS.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {validationError && (
          <p className="text-sm text-critical bg-critical/10 border border-critical/30 rounded-md px-3 py-2">
            {validationError}
          </p>
        )}

        <button
          onClick={handleAnalyze}
          disabled={!input.trim() || !output.trim()}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Zap className="h-4 w-4" />
          Analyze
        </button>
      </div>

      {result && result.primaryFailure && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-4 animate-fade-in">
          {/* Header */}
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-foreground">Analysis Result</h3>
            <div className="flex gap-1 flex-wrap">
              {result.failures.map((f) => (
                <FailureBadge key={f.type} type={f.type} />
              ))}
            </div>
            {result.confidence && (
              <span
                className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${
                  result.confidence === "high"
                    ? "bg-critical/15 text-critical"
                    : result.confidence === "medium"
                    ? "bg-warning/15 text-warning"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {result.confidence} confidence
              </span>
            )}
            <span className="text-xs text-muted-foreground">Model: {model}</span>
          </div>

          <DiagnosisItem emoji="❌" label="What Failed" value={result.primaryFailure.whatFailed} />
          <DiagnosisItem emoji="🔍" label="Proof" value={result.primaryFailure.whyFailed} />
          <DiagnosisItem emoji="⚠️" label="Root Cause" value={result.primaryFailure.rootCause} />

          {primaryHighlights.length > 0 && (
            <div>
              <span className="text-xs text-muted-foreground block mb-1.5">
                📍 Output with highlights
              </span>
              <div className="rounded-md p-3 border border-critical/30 bg-critical/5">
                <HighlightedOutput text={output} highlights={primaryHighlights} />
              </div>
            </div>
          )}

          <div>
            <span className="text-xs text-muted-foreground block mb-1.5">✅ Suggested Fix</span>
            <CodeBlock code={result.primaryFailure.fix} />
          </div>

          {/* Secondary failures */}
          {result.failures.length > 1 && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">
                Also detected ({result.failures.length - 1} additional):
              </p>
              <div className="space-y-2">
                {result.failures
                  .filter((f) => f !== result.primaryFailure)
                  .map((f) => (
                    <div
                      key={f.type}
                      className="rounded-md border border-border bg-surface-1 p-3 space-y-1"
                    >
                      <div className="flex items-center gap-2">
                        <FailureBadge type={f.type} />
                      </div>
                      <p className="text-xs text-foreground">{f.whatFailed}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  rows = 2,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  rows?: number;
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground block mb-1.5">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full bg-surface-1 border border-border rounded-md p-3 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
      />
    </div>
  );
}

function DiagnosisItem({
  emoji,
  label,
  value,
}: {
  emoji: string;
  label: string;
  value: string;
}) {
  return (
    <div>
      <span className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
        {emoji} {label}
      </span>
      <p className="text-foreground bg-surface-1 rounded-md p-2.5 border border-border">{value}</p>
    </div>
  );
}
