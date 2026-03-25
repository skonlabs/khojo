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

// ── Token estimation ─────────────────────────────────────────────────────────
// Character-based approximation: ~4 characters per token for English text,
// which is more accurate than a word-count heuristic (~3× lower error rate).
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ── Evaluate trigger with retry ───────────────────────────────────────────────
async function triggerEvaluate(
  url: string,
  serviceRoleKey: string,
  runId: string,
  logger: ReturnType<typeof createLogger>,
  maxRetries = 3
): Promise<void> {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${serviceRoleKey}`,
  };
  const body = JSON.stringify({ run_id: runId });

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, { method: "POST", headers, body });
      if (res.ok) {
        logger.info("Evaluate triggered", { run_id: runId, attempt });
        return;
      }
      const text = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${text}`);
    } catch (err) {
      if (attempt === maxRetries) {
        logger.error("Evaluate trigger failed after all retries", {
          run_id: runId,
          attempt,
          error: String(err),
        });
        throw err;
      }
      const backoffMs = Math.pow(2, attempt) * 500;
      logger.warn("Evaluate trigger failed, retrying", {
        run_id: runId,
        attempt,
        backoff_ms: backoffMs,
        error: String(err),
      });
      await new Promise((r) => setTimeout(r, backoffMs));
    }
  }
}

// ── Field size limits ─────────────────────────────────────────────────────────
const MAX_FIELD_BYTES = 50_000; // 50 KB ≈ 12 500 tokens — generous for any real prompt

function fieldTooLarge(value: string | undefined): boolean {
  if (!value) return false;
  return new TextEncoder().encode(value).length > MAX_FIELD_BYTES;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const correlationId = crypto.randomUUID();
  const logger = createLogger(correlationId);

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const apiKey = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!apiKey) {
      logger.warn("Request missing API key");
      return new Response(
        JSON.stringify({ error: "Missing API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Resolve project from API key
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, user_id, monitoring_enabled")
      .eq("api_key", apiKey)
      .maybeSingle();

    if (projectError) {
      logger.error("Project lookup failed", { error: projectError.message });
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!project) {
      logger.warn("Invalid API key used");
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!project.monitoring_enabled) {
      logger.info("Monitoring paused for project", { project_id: project.id });
      return new Response(
        JSON.stringify({ error: "Monitoring is paused for this project" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse and validate body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      logger.warn("Invalid JSON body");
      return new Response(
        JSON.stringify({ error: "Request body must be valid JSON" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const input = typeof body.input === "string" ? body.input : null;
    const output = typeof body.output === "string" ? body.output : null;
    const context = typeof body.context === "string" ? body.context : null;
    const prompt = typeof body.prompt === "string" ? body.prompt : null;
    const model = typeof body.model === "string" ? body.model : null;
    const sessionId =
      typeof body.sessionId === "string"
        ? body.sessionId
        : typeof body.session_id === "string"
        ? body.session_id
        : null;

    if (!input || !output) {
      return new Response(
        JSON.stringify({ error: "input and output are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Enforce per-field size limits
    for (const [field, value] of [
      ["input", input],
      ["output", output],
      ["context", context],
      ["prompt", prompt],
    ] as [string, string | null][]) {
      if (value && fieldTooLarge(value)) {
        logger.warn("Field exceeds size limit", { field, project_id: project.id });
        return new Response(
          JSON.stringify({ error: `Field '${field}' exceeds the 50 KB size limit` }),
          { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Character-based token estimation
    const inputTokens = estimateTokens(input);
    const outputTokens = estimateTokens(output);
    const contextTokens = context ? estimateTokens(context) : 0;
    const totalTokens = inputTokens + outputTokens + contextTokens;

    const { data: run, error: insertError } = await supabase
      .from("runs")
      .insert({
        user_id: project.user_id,
        project_id: project.id,
        input,
        output,
        context: context ?? null,
        prompt: prompt ?? null,
        model: model ?? null,
        session_id: sessionId ?? null,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        context_tokens: contextTokens,
        total_tokens: totalTokens,
      })
      .select("id")
      .single();

    if (insertError || !run) {
      logger.error("Run insert failed", { error: insertError?.message, project_id: project.id });
      return new Response(
        JSON.stringify({ error: "Failed to store run" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logger.info("Run stored", { run_id: run.id, project_id: project.id, total_tokens: totalTokens });

    // Trigger evaluation asynchronously with retry — failure is logged but does NOT
    // affect the 200 response; the client always gets confirmation of receipt.
    const evaluateUrl = `${supabaseUrl}/functions/v1/evaluate`;
    triggerEvaluate(evaluateUrl, serviceRoleKey, run.id, logger).catch((err) => {
      logger.error("Evaluate trigger ultimately failed", { run_id: run.id, error: String(err) });
    });

    return new Response(
      JSON.stringify({ id: run.id, status: "received", correlation_id: correlationId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    logger.error("Unhandled ingest error", { error: String(err) });
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
