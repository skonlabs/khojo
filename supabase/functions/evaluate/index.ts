import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const STOPWORDS = new Set([
  "the","a","an","is","are","was","were","be","been","being","of","to","in",
  "it","and","or","but","for","with","on","at","by","from","as","into","about",
  "that","this","these","those","i","you","he","she","we","they","me","him",
  "her","us","them","my","your","his","its","our","their","what","which","who",
  "whom","do","does","did","has","have","had","will","would","shall","should",
  "may","might","can","could","not","no","so","if","then","than","too","very",
  "just","also","how","when","where","why","all","each","every","both","few",
  "more","most","other","some","such","only","own","same","still","between",
]);

function getContentWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function wordOverlap(a: string[], b: string[]): number {
  const setB = new Set(b);
  return a.filter((w) => setB.has(w)).length;
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { run_id } = await req.json();
    if (!run_id) {
      return new Response(JSON.stringify({ error: "run_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: run, error } = await supabase
      .from("runs")
      .select("*")
      .eq("id", run_id)
      .single();

    if (error || !run) {
      return new Response(JSON.stringify({ error: "Run not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const failures: FailureResult[] = [];
    const inputWords = getContentWords(run.input);
    const outputWords = getContentWords(run.output);
    const inputWordCount = run.input.split(/\s+/).length;
    const outputWordCount = run.output.split(/\s+/).length;

    // 1. Incomplete answer
    const multiPartIndicators = ["and", "also", "as well as", "in addition"];
    const questionWords = ["what", "how", "why", "when", "where", "which"];
    const inputLower = run.input.toLowerCase();
    const hasMultipleParts = multiPartIndicators.some((w) => inputLower.includes(w));
    const questionCount = questionWords.filter((w) => inputLower.includes(w)).length;
    const isShortOutput = outputWordCount < inputWordCount * 0.4;

    if ((hasMultipleParts || questionCount > 1) && isShortOutput) {
      failures.push({
        type: "incomplete",
        explanation:
          "The input asked for multiple components but the output only partially responds.",
        root_cause: "Weak or ambiguous prompt constraints",
        fix: "Answer fully. Address every part of the question including all steps, edge cases, and conditions mentioned.",
        proof: { missing_keywords: [], unsupported_claims: [], repeated_chunks: [] },
        signals: (hasMultipleParts ? 1 : 0) + (questionCount > 1 ? 1 : 0) + (isShortOutput ? 1 : 0),
      });
    }

    // 2. Hallucination (only if context provided)
    if (run.context) {
      const contextLower = run.context.toLowerCase();
      // Extract distinctive terms: capitalized words, numbers, quoted strings
      const distinctiveTerms = run.output.match(
        /(?:[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]+)*|\d+(?:\.\d+)?(?:\s*%|\s*days?|\s*hours?|\s*minutes?)?|"[^"]+"|'[^']+')/g
      ) ?? [];
      const unique = [...new Set(distinctiveTerms.map((t) => t.toLowerCase().replace(/['"]/g, "")))];

      if (unique.length > 0) {
        const missing = unique.filter((t) => !contextLower.includes(t));
        const missingRatio = missing.length / unique.length;

        if (missingRatio > 0.3) {
          failures.push({
            type: "hallucination",
            explanation:
              "The output contains claims that don't appear to be grounded in the provided context.",
            root_cause:
              "Model drew on external training knowledge instead of the provided context",
            fix: "Answer only using the provided context. Do not add information from outside the context. If the answer isn't in the context, say so.",
            proof: {
              missing_keywords: [],
              unsupported_claims: missing.slice(0, 10),
              repeated_chunks: [],
            },
            signals: missingRatio > 0.5 ? 2 : 1,
          });
        }
      }
    }

    // 3. Irrelevant answer
    const topInputWords = inputWords.slice(0, 5);
    if (topInputWords.length > 0) {
      const matchCount = wordOverlap(topInputWords, outputWords);
      if (matchCount < 2) {
        failures.push({
          type: "irrelevant",
          explanation: "The output doesn't appear to address what was asked.",
          root_cause: "Unclear or ambiguous input prompt",
          fix: "Restate the question clearly at the top of your prompt. Be explicit about what you want the model to focus on.",
          proof: {
            missing_keywords: topInputWords.filter((w) => !outputWords.includes(w)),
            unsupported_claims: [],
            repeated_chunks: [],
          },
          signals: matchCount === 0 ? 2 : 1,
        });
      }
    }

    // 4. Inconsistent behavior
    const { data: similarRuns } = await supabase
      .from("runs")
      .select("id, output")
      .eq("user_id", run.user_id)
      .eq("input", run.input)
      .neq("id", run.id)
      .limit(10);

    if (similarRuns && similarRuns.length >= 1) {
      let inconsistentCount = 0;
      for (const other of similarRuns) {
        const otherWordCount = other.output.split(/\s+/).length;
        const lengthDiff = Math.abs(outputWordCount - otherWordCount) / Math.max(outputWordCount, otherWordCount);
        const otherContentWords = getContentWords(other.output);
        const overlap = wordOverlap(outputWords, otherContentWords);
        const overlapRatio = overlap / Math.max(outputWords.length, 1);

        if (lengthDiff > 0.5 || overlapRatio < 0.3) {
          inconsistentCount++;
        }
      }

      if (inconsistentCount >= 1) {
        failures.push({
          type: "inconsistent",
          explanation:
            "The same input produced significantly different outputs across multiple runs.",
          root_cause: "High temperature setting or non-deterministic sampling",
          fix: "Set temperature to 0 or near-0 for tasks requiring consistent outputs. Consider adding seed parameters if your model supports them.",
          proof: { missing_keywords: [], unsupported_claims: [], repeated_chunks: [] },
          signals: inconsistentCount >= 2 ? 2 : 1,
        });
      }
    }

    // 5. Token waste (over-generation)
    const repeatedChunks: string[] = [];
    if (outputWordCount > 20) {
      const words = run.output.split(/\s+/);
      const chunks: string[] = [];
      for (let i = 0; i <= words.length - 20; i += 10) {
        chunks.push(words.slice(i, i + 20).join(" ").toLowerCase());
      }
      const seen = new Set<string>();
      for (const chunk of chunks) {
        if (seen.has(chunk)) {
          repeatedChunks.push(chunk);
        }
        seen.add(chunk);
      }
    }

    const isVerbose = outputWordCount > inputWordCount * 3;

    if (isVerbose || repeatedChunks.length > 0) {
      failures.push({
        type: "verbose",
        explanation:
          "The output is significantly longer than the input warranted, with possible repetition.",
        root_cause: "No length or conciseness constraint in the prompt",
        fix: "Add an explicit length constraint: 'Respond in under [N] words. Be direct and concise. Do not repeat points.'",
        proof: {
          missing_keywords: [],
          unsupported_claims: [],
          repeated_chunks: repeatedChunks.slice(0, 5),
        },
        signals: (isVerbose ? 1 : 0) + (repeatedChunks.length > 0 ? 1 : 0),
      });
    }

    // Determine primary failure (priority order)
    const priority = ["hallucination", "incomplete", "irrelevant", "inconsistent", "verbose"];
    const failureTypes = failures.map((f) => f.type);
    const primaryFailure =
      priority.find((p) => failureTypes.includes(p)) ?? null;
    const primary = failures.find((f) => f.type === primaryFailure);

    // Determine confidence
    const totalSignals = failures.reduce((s, f) => s + f.signals, 0);
    const confidence: string | null =
      failures.length === 0
        ? null
        : totalSignals >= 3
        ? "high"
        : totalSignals >= 2
        ? "medium"
        : "low";

    // Merge proof
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
      console.error("Update error:", updateError);
    }

    return new Response(
      JSON.stringify({
        run_id,
        failure_types: failureTypes,
        primary_failure: primaryFailure,
        confidence,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Evaluate error:", err);
    return new Response(
      JSON.stringify({ error: "Evaluation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
