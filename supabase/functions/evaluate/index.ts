import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Structured logger ────────────────────────────────────────────────────────
function createLogger(correlationId: string) {
  const log = (level: string, message: string, data?: Record<string, unknown>) => {
    const entry = { level, correlationId, message, timestamp: new Date().toISOString(), ...data };
    if (level === "error") console.error(JSON.stringify(entry));
    else if (level === "warn") console.warn(JSON.stringify(entry));
    else console.log(JSON.stringify(entry));
  };
  return {
    info: (msg: string, data?: Record<string, unknown>) => log("info", msg, data),
    warn: (msg: string, data?: Record<string, unknown>) => log("warn", msg, data),
    error: (msg: string, data?: Record<string, unknown>) => log("error", msg, data),
  };
}

// ── Text utilities ────────────────────────────────────────────────────────────
const STOPWORDS = new Set([
  "the","a","an","is","are","was","were","be","been","being","of","to","in",
  "it","and","or","but","for","with","on","at","by","from","as","into","about",
  "that","this","these","those","i","you","he","she","we","they","me","him",
  "her","us","them","my","your","his","its","our","their","what","which","who",
  "whom","do","does","did","has","have","had","will","would","shall","should",
  "may","might","can","could","not","no","so","if","then","than","too","very",
  "just","also","how","when","where","why","all","each","every","both","few",
  "more","most","other","some","such","only","own","same","still","between",
  "up","out","over","after","before","through","during","above","below",
  "under","again","further","once","here","there",
]);

function getContentWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
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

interface FailureResult {
  type: string;
  explanation: string;
  root_cause: string;
  fix: string;
  proof: {
    missing_keywords: string[];
    unsupported_claims: string[];
    repeated_chunks: string[];
  };
  signals: number;
}

// ── Detector 1: Hallucination ─────────────────────────────────────────────────
// Extracts multiple types of factual claims (numbers, dates, proper nouns, quoted
// strings) from the output and checks each against the context. Requires ≥2
// unsupported claims AND ≥30 % missing ratio to avoid false positives.
function detectHallucination(output: string, context: string): FailureResult | null {
  const ctxNorm = context.toLowerCase().replace(/,/g, "");

  // 1. Numbers & measurements — strip commas before comparison
  const numPattern = /\b\d[\d,]*(?:\.\d+)?\s*(?:%|percent|k\b|m\b|billion|million|thousand|days?|hours?|months?|years?|usd|\$|€|£|km|miles?|weeks?|seconds?|minutes?)?/gi;
  const rawOutputNums = output.match(numPattern) ?? [];
  const outputNums = [
    ...new Set(rawOutputNums.map((n) => n.replace(/,/g, "").toLowerCase().trim())),
  ].filter((n) => {
    const num = parseFloat(n);
    return !isNaN(num) && num > 1;
  });
  const unsupportedNums = outputNums.filter((n) => !ctxNorm.includes(n));

  // 2. Dates
  const datePattern =
    /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:,?\s+\d{4})?|\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\b\d{4}\b/gi;
  const outputDates = [
    ...new Set((output.match(datePattern) ?? []).map((d) => d.toLowerCase())),
  ];
  const unsupportedDates = outputDates.filter((d) => !ctxNorm.includes(d));

  // 3. Multi-word proper noun phrases — all constituent words must be absent
  const properNounPattern = /(?:[A-Z][a-z]{1,}(?:\s+[A-Z][a-z]+){1,4})/g;
  const outputProperNouns = [...new Set(output.match(properNounPattern) ?? [])];
  const unsupportedProperNouns = outputProperNouns.filter((noun) => {
    const parts = noun.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    return parts.length >= 2 && parts.every((w) => !ctxNorm.includes(w));
  });

  // 4. Quoted strings
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
  if (ratio < 0.30) return null;

  let signals = 1;
  if (ratio > 0.55) signals = 2;
  if (unsupportedNums.length >= 2 || ratio > 0.75) signals = Math.min(signals + 1, 3);

  return {
    type: "hallucination",
    explanation: `Output contains ${allUnsupported.length} claim(s) not grounded in the provided context (${Math.round(ratio * 100)}% of verifiable claims are unverified).`,
    root_cause:
      "Model drew on parametric training knowledge instead of the provided context",
    fix: "Answer ONLY using the provided context. Do not add information not present in the context. If the answer is not available, say so explicitly.",
    proof: {
      missing_keywords: [],
      unsupported_claims: allUnsupported.slice(0, 10),
      repeated_chunks: [],
    },
    signals,
  };
}

// ── Detector 2: Incomplete ─────────────────────────────────────────────────────
// Detects multi-part queries by counting question marks, numbered/bulleted items,
// and explicit connectors. Verifies per-sub-question keyword coverage in output.
function detectIncomplete(input: string, output: string): FailureResult | null {
  const inputLower = input.toLowerCase();
  const outputWordCount = output.split(/\s+/).filter(Boolean).length;
  const inputWordCount = input.split(/\s+/).filter(Boolean).length;

  // Sub-question extraction via question marks
  const questionSegments = input
    .split(/\?/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length >= 4);

  // Multi-part structural signals
  const connectorPattern =
    /\b(?:and also|as well as|in addition(?:\s+to)?|furthermore|additionally|besides|moreover|along with)\b/i;
  const simpleConnectorPattern = /\b(?:also|and)\s+(?:what|how|why|when|where|which)\b/i;
  const numberedPattern = /\b(?:1[.)]\s|2[.)]\s|first[,\s]|second[,\s]|third[,\s])/i;
  const bulletPattern = /(?:^|\n)\s*[-•*]\s*\w/;

  const hasConnector = connectorPattern.test(input) || simpleConnectorPattern.test(input);
  const hasNumbered = numberedPattern.test(input);
  const hasBullets = bulletPattern.test(input);
  const hasMultipleParts = hasConnector || hasNumbered || hasBullets;

  const questionWordCount = ["what", "how", "why", "when", "where", "which", "who", "whose"].filter(
    (w) => inputLower.includes(w)
  ).length;

  const isShortOutput = outputWordCount < inputWordCount * 0.4 && outputWordCount < 100;

  // Per-sub-question coverage check
  let uncoveredSubQuestions = 0;
  const missingParts: string[] = [];

  if (questionSegments.length >= 2) {
    for (const sq of questionSegments.slice(0, 5)) {
      const sqWords = getContentWords(sq);
      if (sqWords.length < 2) continue;
      const outputLower = output.toLowerCase();
      const matched = sqWords.filter((w) => outputLower.includes(w)).length;
      if (matched / sqWords.length < 0.40) {
        uncoveredSubQuestions++;
        missingParts.push(sq.slice(0, 70));
      }
    }
  }

  // Signal accumulation — require ≥2 independent signals
  let signals = 0;
  if (hasMultipleParts) signals++;
  if (questionWordCount >= 2) signals++;
  if (isShortOutput) signals++;
  if (uncoveredSubQuestions >= 1) signals++;

  if (signals < 2) return null;
  if (!isShortOutput && uncoveredSubQuestions === 0) return null;

  return {
    type: "incomplete",
    explanation: `Input contained multiple parts but output only partially responds (${outputWordCount} words for a ${inputWordCount}-word multi-part query, ${uncoveredSubQuestions} sub-question(s) not adequately addressed).`,
    root_cause:
      "Weak prompt constraints — model did not plan to address every sub-question before responding",
    fix: "Break your prompt into explicitly numbered tasks and add: 'Address ALL numbered parts below. For each, provide a complete answer before moving to the next.'",
    proof: {
      missing_keywords: missingParts.slice(0, 3),
      unsupported_claims: [],
      repeated_chunks: [],
    },
    signals: Math.min(signals, 3),
  };
}

// ── Detector 3: Irrelevant ─────────────────────────────────────────────────────
// Uses frequency-weighted keyword coverage combined with Jaccard similarity.
// Both metrics must be below their thresholds to avoid false positives.
function detectIrrelevant(input: string, output: string): FailureResult | null {
  const inputWords = getContentWords(input);
  const outputWords = getContentWords(output);

  if (inputWords.length < 3 || outputWords.length < 3) return null;

  const inputFreq = wordFrequencyMap(inputWords);
  const sortedInputWords = [...inputFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w);

  // Use top 30 % of unique input words (min 5, max 20)
  const topN = Math.max(5, Math.min(20, Math.ceil(sortedInputWords.length * 0.3)));
  const keyInputWords = sortedInputWords.slice(0, topN);

  const outputWordSet = new Set(outputWords);
  const matchCount = keyInputWords.filter((w) => outputWordSet.has(w)).length;
  const coverageRatio = matchCount / keyInputWords.length;

  const jaccard = jaccardSimilarity(inputWords, outputWords);
  const missingKeyWords = keyInputWords.filter((w) => !outputWordSet.has(w));

  // Both metrics must fail their threshold
  if (coverageRatio >= 0.25 || jaccard >= 0.15) return null;

  let signals = 1;
  if (coverageRatio < 0.10 && jaccard < 0.08) signals = 2;
  if (matchCount === 0 && inputWords.length >= 5) signals = 3;

  return {
    type: "irrelevant",
    explanation: `Output addresses different content from what was asked (${Math.round(coverageRatio * 100)}% key-word coverage, ${Math.round(jaccard * 100)}% Jaccard similarity with input).`,
    root_cause:
      "Unclear or ambiguous input prompt — model interpreted the request differently from intent",
    fix: "Restate the question clearly and explicitly. Lead with the core topic, be specific about scope, and avoid ambiguous pronouns.",
    proof: {
      missing_keywords: missingKeyWords.slice(0, 8),
      unsupported_claims: [],
      repeated_chunks: [],
    },
    signals,
  };
}

// ── Detector 4: Inconsistent ──────────────────────────────────────────────────
// Normalises input before matching (case, whitespace, punctuation) and uses
// Jaccard similarity + length ratio to compare outputs across runs.
async function detectInconsistent(
  run: { id: string; user_id: string; input: string; output: string },
  supabase: ReturnType<typeof createClient>
): Promise<FailureResult | null> {
  const normalizedInput = normalizeText(run.input);
  const outputWords = getContentWords(run.output);
  const outputWordCount = run.output.split(/\s+/).filter(Boolean).length;

  // Fetch recent runs for same user (normalised match done in JS for flexibility)
  const { data: recentRuns } = await supabase
    .from("runs")
    .select("id, input, output")
    .eq("user_id", run.user_id)
    .neq("id", run.id)
    .order("timestamp", { ascending: false })
    .limit(30);

  if (!recentRuns || recentRuns.length === 0) return null;

  const matchingRuns = recentRuns.filter(
    (r: { input: string }) => normalizeText(r.input) === normalizedInput
  );
  if (matchingRuns.length === 0) return null;

  let inconsistentCount = 0;
  const totalCompared = matchingRuns.slice(0, 10).length;

  for (const other of matchingRuns.slice(0, 10)) {
    const otherWordCount = (other.output as string).split(/\s+/).filter(Boolean).length;
    const otherWords = getContentWords(other.output as string);

    const jaccard = jaccardSimilarity(outputWords, otherWords);
    const lengthRatio =
      Math.min(outputWordCount, otherWordCount) / Math.max(outputWordCount, otherWordCount, 1);

    if (jaccard < 0.25 || lengthRatio < 0.40) {
      inconsistentCount++;
    }
  }

  if (inconsistentCount === 0) return null;

  const inconsistencyRate = inconsistentCount / totalCompared;
  let signals = 1;
  if (inconsistencyRate > 0.50) signals = 2;
  if (inconsistencyRate > 0.75) signals = 3;

  return {
    type: "inconsistent",
    explanation: `The same input produced significantly different outputs in ${inconsistentCount} of ${totalCompared} comparable run(s) (${Math.round(inconsistencyRate * 100)}% inconsistency rate).`,
    root_cause:
      "High temperature or non-deterministic sampling producing unstable outputs for identical inputs",
    fix: "Set temperature to 0 for tasks requiring consistent outputs. Add a seed parameter if your model supports it. Enforce an explicit output format.",
    proof: { missing_keywords: [], unsupported_claims: [], repeated_chunks: [] },
    signals,
  };
}

// ── Detector 5: Verbose ────────────────────────────────────────────────────────
// Multi-granularity repetition check (5 / 10 / 15-word sliding windows +
// sentence-level opening signatures) combined with a conservative length ratio.
function detectVerbose(input: string, output: string): FailureResult | null {
  const outputWordCount = output.split(/\s+/).filter(Boolean).length;
  const inputWordCount = input.split(/\s+/).filter(Boolean).length;

  if (outputWordCount < 50) return null;

  const outputWords = output.split(/\s+/).filter(Boolean);
  const repeatedChunks: string[] = [];

  // Sliding window repetition at multiple granularities
  for (const windowSize of [5, 10, 15]) {
    if (outputWords.length < windowSize * 2) continue;
    const seen = new Map<string, number>();
    for (let i = 0; i <= outputWords.length - windowSize; i++) {
      const chunk = outputWords
        .slice(i, i + windowSize)
        .join(" ")
        .toLowerCase();
      const count = (seen.get(chunk) ?? 0) + 1;
      seen.set(chunk, count);
      if (count === 2 && chunk.length > 15) {
        repeatedChunks.push(chunk);
      }
    }
    if (repeatedChunks.length >= 2) break;
  }

  // Sentence-level opening signature repetition
  const sentences = output
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length >= 5);
  const sentenceSigs = new Map<string, number>();
  let repeatedSentences = 0;
  for (const s of sentences) {
    const sig = s.split(/\s+/).slice(0, 4).join(" ").toLowerCase();
    const count = (sentenceSigs.get(sig) ?? 0) + 1;
    sentenceSigs.set(sig, count);
    if (count === 2) repeatedSentences++;
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

  return {
    type: "verbose",
    explanation: `Output is ${ratio}× the length of the input with ${repeatedChunks.length + repeatedSentences} repetition instance(s) detected.`,
    root_cause:
      "No length or conciseness constraint in the prompt — model over-generates without a stopping criterion",
    fix: `Add explicit constraints:\n- system: "Be concise. Respond in under ${Math.ceil(inputWordCount * 2)} words. Do not repeat points."\n- max_tokens: ${Math.ceil(inputWordCount * 2.5)}`,
    proof: {
      missing_keywords: [],
      unsupported_claims: [],
      repeated_chunks: repeatedChunks.slice(0, 5),
    },
    signals: Math.min(signals, 3),
  };
}

// ── Main handler ──────────────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const correlationId = crypto.randomUUID();
  const logger = createLogger(correlationId);

  try {
    const body = await req.json().catch(() => ({}));
    const { run_id } = body;

    if (!run_id) {
      logger.warn("Missing run_id in request body");
      return new Response(JSON.stringify({ error: "run_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logger.info("Evaluation started", { run_id });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: run, error: fetchError } = await supabase
      .from("runs")
      .select("*")
      .eq("id", run_id)
      .single();

    if (fetchError || !run) {
      logger.error("Run not found", { run_id, error: fetchError?.message });
      return new Response(JSON.stringify({ error: "Run not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logger.info("Run fetched", { run_id, has_context: !!run.context });

    const failures: FailureResult[] = [];

    // Run all detectors with individual error isolation
    try {
      const incomplete = detectIncomplete(run.input, run.output);
      if (incomplete) {
        failures.push(incomplete);
        logger.info("Incomplete detected", { signals: incomplete.signals });
      }
    } catch (e) {
      logger.error("Incomplete detector failed", { error: String(e) });
    }

    try {
      if (run.context) {
        const hallucination = detectHallucination(run.output, run.context);
        if (hallucination) {
          failures.push(hallucination);
          logger.info("Hallucination detected", { signals: hallucination.signals });
        }
      }
    } catch (e) {
      logger.error("Hallucination detector failed", { error: String(e) });
    }

    try {
      const irrelevant = detectIrrelevant(run.input, run.output);
      if (irrelevant) {
        failures.push(irrelevant);
        logger.info("Irrelevant detected", { signals: irrelevant.signals });
      }
    } catch (e) {
      logger.error("Irrelevant detector failed", { error: String(e) });
    }

    try {
      const inconsistent = await detectInconsistent(
        { id: run.id, user_id: run.user_id, input: run.input, output: run.output },
        supabase
      );
      if (inconsistent) {
        failures.push(inconsistent);
        logger.info("Inconsistent detected", { signals: inconsistent.signals });
      }
    } catch (e) {
      logger.error("Inconsistent detector failed", { error: String(e) });
    }

    try {
      const verbose = detectVerbose(run.input, run.output);
      if (verbose) {
        failures.push(verbose);
        logger.info("Verbose detected", { signals: verbose.signals });
      }
    } catch (e) {
      logger.error("Verbose detector failed", { error: String(e) });
    }

    // Priority order for primary failure selection
    const priority = ["hallucination", "incomplete", "irrelevant", "inconsistent", "verbose"];
    const failureTypes = failures.map((f) => f.type);
    const primaryFailure = priority.find((p) => failureTypes.includes(p)) ?? null;
    const primary = failures.find((f) => f.type === primaryFailure);

    // Confidence from total signals
    const totalSignals = failures.reduce((s, f) => s + f.signals, 0);
    const confidence: string | null =
      failures.length === 0
        ? null
        : totalSignals >= 4
        ? "high"
        : totalSignals >= 2
        ? "medium"
        : "low";

    // Merge proof across all failures
    const mergedProof = {
      missing_keywords: [] as string[],
      unsupported_claims: [] as string[],
      repeated_chunks: [] as string[],
    };
    for (const f of failures) {
      mergedProof.missing_keywords.push(...f.proof.missing_keywords);
      mergedProof.unsupported_claims.push(...f.proof.unsupported_claims);
      mergedProof.repeated_chunks.push(...f.proof.repeated_chunks);
    }

    const { error: updateError } = await supabase
      .from("runs")
      .update({
        failure_types: failureTypes,
        primary_failure: primaryFailure,
        explanation: primary?.explanation ?? null,
        root_cause: primary?.root_cause ?? null,
        fix: primary?.fix ?? null,
        confidence,
        proof: mergedProof,
        evaluated_at: new Date().toISOString(),
      })
      .eq("id", run_id);

    if (updateError) {
      logger.error("Failed to update run with evaluation results", {
        run_id,
        error: updateError.message,
      });
      return new Response(JSON.stringify({ error: "Failed to store evaluation" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logger.info("Evaluation complete", {
      run_id,
      failure_count: failures.length,
      primary_failure: primaryFailure,
      confidence,
    });

    return new Response(
      JSON.stringify({ run_id, failure_types: failureTypes, primary_failure: primaryFailure, confidence }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    logger.error("Unhandled evaluation error", { error: String(err) });
    return new Response(JSON.stringify({ error: "Evaluation failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
