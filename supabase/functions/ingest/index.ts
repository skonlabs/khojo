import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const apiKey = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Missing API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Look up project by API key
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, user_id, monitoring_enabled")
      .eq("api_key", apiKey)
      .maybeSingle();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check monitoring status
    if (!project.monitoring_enabled) {
      return new Response(
        JSON.stringify({ error: "Monitoring is paused for this project" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();

    if (!body.input || !body.output) {
      return new Response(
        JSON.stringify({ error: "input and output are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Token estimation
    const inputTokens = Math.ceil(body.input.split(" ").length / 0.75);
    const outputTokens = Math.ceil(body.output.split(" ").length / 0.75);
    const contextTokens = body.context
      ? Math.ceil(body.context.split(" ").length / 0.75)
      : 0;
    const totalTokens = inputTokens + outputTokens + contextTokens;

    const { data: run, error: insertError } = await supabase
      .from("runs")
      .insert({
        user_id: project.user_id,
        project_id: project.id,
        input: body.input,
        output: body.output,
        context: body.context ?? null,
        prompt: body.prompt ?? null,
        model: body.model ?? null,
        session_id: body.sessionId ?? body.session_id ?? null,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        context_tokens: contextTokens,
        total_tokens: totalTokens,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to insert run" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Trigger evaluation asynchronously
    const evaluateUrl = `${supabaseUrl}/functions/v1/evaluate`;
    fetch(evaluateUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ run_id: run.id }),
    }).catch((e) => console.error("Evaluate trigger failed:", e));

    return new Response(
      JSON.stringify({ id: run.id, status: "received" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Ingest error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
