import { useState } from "react";
import { Zap, Activity, AlertTriangle, Terminal, Command, Settings, Search, BookOpen, ChevronRight, Code, Eye, Wrench, HelpCircle, Clock, CheckCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

// ——————————————————————————————————————————————
// Documentation data
// ——————————————————————————————————————————————

interface DocSection {
  category: string;
  items: DocItem[];
}

interface DocItem {
  id: string;
  title: string;
  icon: any;
  blocks: Block[];
}

type Block =
  | { type: "text"; content: string }
  | { type: "heading"; content: string }
  | { type: "subheading"; content: string }
  | { type: "mockup"; variant: "overview" | "analyzer" | "issues" | "run-detail"; caption?: string }
  | { type: "code"; lang: string; code: string }
  | { type: "list"; items: string[] }
  | { type: "numbered"; items: string[] }
  | { type: "callout"; variant: "info" | "warning" | "tip" | "example"; content: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "divider" };

const docSections: DocSection[] = [
  {
    category: "Getting Started",
    items: [
      {
        id: "what-is-khojo",
        title: "What is khojo?",
        icon: BookOpen,
        blocks: [
          { type: "text", content: "khojo is a developer debugging tool for AI outputs. Think of it as **console.log + error traces, but for your AI behavior**." },
          { type: "heading", content: "Why do you need this?" },
          { type: "text", content: "AI models hallucinate, give incomplete answers, ignore context, and waste tokens — but they don't throw errors. Your app looks \"fine\" while returning wrong information to users. khojo catches these invisible failures automatically." },
          { type: "callout", variant: "example", content: "**Example:** Your chatbot says \"Refunds are available within 30 days\" but your policy document says 14 days. No error is thrown. Users get wrong info. khojo detects this hallucination in real-time." },
          { type: "heading", content: "What does khojo detect?" },
          { type: "table", headers: ["Failure Type", "What It Means", "When It Happens"], rows: [
            ["🟣 Hallucination", "AI states facts not in context", "RAG, document Q&A, support bots"],
            ["🟠 Incomplete", "AI answers only part of the question", "Multi-part questions, complex queries"],
            ["🔵 Irrelevant", "AI responds about something else", "Poor retrieval, prompt drift"],
            ["🩷 Inconsistent", "Same input → different answers", "Non-deterministic configs, missing seeds"],
            ["🟢 Verbose", "AI over-generates, repeats itself", "No max_tokens, no conciseness instruction"],
          ]},
          { type: "heading", content: "Two ways to use khojo" },
          { type: "table", headers: ["Method", "Setup Time", "Best For"], rows: [
            ["Instant Analyzer", "0 seconds", "Quick debugging, testing prompt changes, one-off checks"],
            ["SDK Integration", "2 minutes", "Continuous monitoring, production tracking, trend analysis"],
          ]},
          { type: "callout", variant: "tip", content: "**Start with the Instant Analyzer** — paste any input/output pair, click Analyze, and see results immediately. No account, no SDK, no setup." },
        ],
      },
      {
        id: "quickstart",
        title: "5-Minute Quickstart",
        icon: Zap,
        blocks: [
          { type: "text", content: "Get from zero to debugging in under 5 minutes." },
          { type: "heading", content: "Step 1: Try Instant Analyzer (30 seconds)" },
          { type: "text", content: "The fastest way to see khojo in action — no SDK required." },
          { type: "numbered", items: [
            "Navigate to **Analyzer** in the sidebar (or click \"Try Instant Analyzer\" on the Overview)",
            "Paste your **Input** — the user query or prompt",
            "Paste the **Output** — what your AI actually returned",
            "Optionally add **Context** — the documents or knowledge base the AI should have used",
            "Click **Analyze**",
          ]},
          { type: "mockup", variant: "analyzer", caption: "The Instant Analyzer detects a hallucination — the AI said \"30 days\" but the context says \"14 days\"" },
          { type: "callout", variant: "tip", content: "Click **\"Load Example\"** to see a pre-filled hallucination scenario and understand the output format." },
          { type: "heading", content: "Step 2: Read the diagnosis" },
          { type: "text", content: "Every analysis returns four sections:" },
          { type: "table", headers: ["Section", "What It Tells You", "How To Use It"], rows: [
            ["❌ What Failed", "Clear statement of the issue", "Understand the problem at a glance"],
            ["🔍 Proof", "Evidence from the output/context", "Verify the detection is correct"],
            ["⚠️ Root Cause", "Why this is happening", "Know what to fix in your code"],
            ["✅ Suggested Fix", "Copy-paste prompt/code change", "Apply the fix immediately"],
          ]},
          { type: "heading", content: "Step 3: Set up continuous monitoring (optional)" },
          { type: "text", content: "Once you've validated khojo catches real issues, add the SDK to monitor automatically:" },
          { type: "code", lang: "javascript", code: `import { trackAI } from '@khojo/sdk'

const client = trackAI({ apiKey: 'YOUR_API_KEY' })

// Add this one line after every AI call:
await client.track({
  input: userMessage,
  output: aiResponse,
  context: retrievedDocs,   // optional — enables hallucination detection
  model: 'gpt-4o',           // optional — shown in dashboard
  sessionId: conversationId  // optional — groups multi-turn conversations
})` },
          { type: "callout", variant: "info", content: "The SDK is optional. The Instant Analyzer uses the exact same detection pipeline — you just have to paste manually instead of auto-capturing." },
        ],
      },
      {
        id: "onboarding",
        title: "Account Setup",
        icon: Settings,
        blocks: [
          { type: "heading", content: "When to create an account" },
          { type: "text", content: "You need an account to: save run history, track trends over time, use the SDK for auto-capture, and manage multiple projects." },
          { type: "heading", content: "Sign up flow" },
          { type: "numbered", items: [
            "Click **\"Create account\"** — enter email and password",
            "**Name your project** — e.g. \"Customer Support Bot\", \"RAG Pipeline\"",
            "**Copy your API key** — store it securely. You won't see it again (you can regenerate in Settings)",
            "Choose your path: **Instant Analyzer** (recommended first) or **SDK setup**",
          ]},
          { type: "callout", variant: "warning", content: "**Store your API key immediately.** It's shown only once during onboarding. If lost, you can regenerate one in Project Settings, but this invalidates the old key." },
          { type: "heading", content: "What happens behind the scenes" },
          { type: "list", items: [
            "A **profile** is created automatically via database trigger",
            "A **project** is created with a unique API key and monitoring enabled by default",
            "You're redirected to the dashboard, ready to start debugging",
          ]},
        ],
      },
    ],
  },
  {
    category: "Core Features",
    items: [
      {
        id: "overview-dashboard",
        title: "Overview Dashboard",
        icon: Activity,
        blocks: [
          { type: "heading", content: "When to use the Overview" },
          { type: "text", content: "Open the Overview when you want a quick health check of your AI system. It answers: \"How are things going overall? Are issues getting better or worse?\"" },
          { type: "mockup", variant: "overview", caption: "The Overview shows total runs, failure rate, token usage, and trend charts at a glance" },
          { type: "heading", content: "Key metrics explained" },
          { type: "table", headers: ["Metric", "What It Means", "Good Target"], rows: [
            ["Total Runs", "Number of AI calls captured", "Depends on your volume"],
            ["Failure Rate", "% of runs with at least one issue", "< 10%"],
            ["Avg Tokens/Run", "Average tokens consumed per call", "Depends on use case"],
            ["Hallucination Rate", "% of runs with hallucinated content", "< 5%"],
            ["Token Waste", "% of runs flagged as verbose", "< 15%"],
            ["Pending Eval", "Runs not yet evaluated", "0 (should process quickly)"],
          ]},
          { type: "heading", content: "Charts" },
          { type: "list", items: [
            "**Failure Breakdown** — bar chart showing count of each failure type. Focus on the tallest bar first.",
            "**Failure Trend** — line chart showing failure rate and hallucination rate over time. You want these lines going down.",
          ]},
          { type: "heading", content: "Quick actions" },
          { type: "list", items: [
            "**\"Try Instant Analyzer\"** — jump directly to debugging without needing run data",
            "**\"Pause/Enable monitoring\"** — toggle real-time data capture on/off",
            "**Click any top issue** — opens the full run diagnosis view",
          ]},
          { type: "callout", variant: "info", content: "The Overview updates in **real-time** via Supabase Realtime. When new runs arrive, metrics and charts refresh automatically — no page reload needed." },
        ],
      },
      {
        id: "instant-analyzer",
        title: "Instant Analyzer",
        icon: Zap,
        blocks: [
          { type: "heading", content: "What is the Instant Analyzer?" },
          { type: "text", content: "A zero-setup debugging tool. Paste any AI input/output pair, click Analyze, and instantly see what's broken, why, and how to fix it. **No SDK, no integration, no account required.**" },
          { type: "heading", content: "When to use it" },
          { type: "list", items: [
            "You're **testing a new prompt** and want to verify the output quality",
            "A user reported a **bad AI response** and you want to understand why",
            "You're **comparing models** (GPT-4o vs Claude) on the same input",
            "You want to **quickly check** if a prompt change actually fixed an issue",
            "You're evaluating a **RAG pipeline** and want to validate retrieval quality",
          ]},
          { type: "heading", content: "How to use it" },
          { type: "mockup", variant: "analyzer", caption: "Paste input, output, and context → click Analyze → get actionable diagnosis" },
          { type: "heading", content: "Fields explained" },
          { type: "table", headers: ["Field", "Required?", "What To Put Here", "Why It Matters"], rows: [
            ["Input", "Yes", "The user's question or query", "Needed to check relevance and completeness"],
            ["Output", "Yes", "The AI's actual response", "This is what gets analyzed for failures"],
            ["Context", "No", "Retrieved documents, knowledge base content", "Enables hallucination detection — without context, khojo can't verify facts"],
            ["System Prompt", "No", "Your prompt template", "Helps generate more specific fix suggestions"],
            ["Model", "No", "Which model generated this output", "Included in root cause analysis"],
          ]},
          { type: "callout", variant: "warning", content: "**Context is critical for hallucination detection.** Without context, khojo can only check completeness, relevance, and verbosity. If you're debugging a RAG pipeline, always include the retrieved documents." },
          { type: "heading", content: "Example: Catching a hallucination" },
          { type: "code", lang: "text", code: `Input:   "What is the refund policy for premium subscribers?"

Context: "Refund Policy: All subscribers, including premium, are eligible
          for a full refund within 14 days of purchase. Refunds are
          processed within 7-10 business days."

Output:  "Premium subscribers can request a full refund within 30 days
          of purchase. Simply contact our support team and they will
          process your refund within 3-5 business days."` },
          { type: "text", content: "khojo detects **two hallucinations**: \"30 days\" (should be 14) and \"3-5 business days\" (should be 7-10)." },
        ],
      },
      {
        id: "issues",
        title: "Issues & Failure Detection",
        icon: AlertTriangle,
        blocks: [
          { type: "heading", content: "When to use the Issues page" },
          { type: "text", content: "Use Issues when you want to see **what's broken across all your runs**, not just one. It groups failures by type and lets you prioritize what to fix first." },
          { type: "mockup", variant: "issues", caption: "Issues table with failure type badges, confidence levels, and dismiss actions" },
          { type: "heading", content: "How issues are prioritized" },
          { type: "table", headers: ["Priority", "Failure Types", "Why"], rows: [
            ["🔥 Critical", "Hallucination, high-frequency failures", "Users are getting wrong information — fix immediately"],
            ["⚠️ Improvement", "Verbose, Inconsistent", "Not wrong, but wasteful or unpredictable — fix when you can"],
          ]},
          { type: "heading", content: "Filtering issues" },
          { type: "list", items: [
            "**By failure type** — Focus on one category at a time (e.g., all hallucinations)",
            "**By confidence** — Show only high-confidence detections to reduce noise",
            "**Hide dismissed** — Toggle to exclude issues you've already reviewed",
            "**Search** — Find issues related to specific user queries",
          ]},
          { type: "heading", content: "Dismissing issues" },
          { type: "text", content: "Click **\"Dismiss\"** on any issue to mark it as reviewed. Dismissed issues are excluded from counts on the Overview. You can restore dismissed issues anytime." },
          { type: "callout", variant: "tip", content: "**Workflow tip:** Filter by \"hallucination\" + \"high\" confidence first. These are the most dangerous issues — users are getting factually wrong information." },
          { type: "heading", content: "The 5 failure types in detail" },
          { type: "subheading", content: "🟣 Hallucination" },
          { type: "text", content: "The AI states facts that are not supported by the provided context." },
          { type: "code", lang: "text", code: `Context: "Refund within 14 days"
Output:  "Refund within 30 days"   ← hallucinated value

How to fix: Add context grounding to your prompt:
  "Answer ONLY using the provided context. Do not add
   information not present in the context."` },
          { type: "subheading", content: "🟠 Incomplete" },
          { type: "text", content: "The AI answers only part of a multi-part question." },
          { type: "code", lang: "text", code: `Input:  "Explain causes AND solutions for high latency"
Output: "High latency is caused by..."  ← no solutions mentioned

How to fix: Add completeness instruction:
  "Ensure you address ALL parts of the user's question."` },
          { type: "subheading", content: "🔵 Irrelevant" },
          { type: "text", content: "The AI responds about something the user didn't ask about." },
          { type: "code", lang: "text", code: `Input:  "What is the refund policy?"
Output: "Our shipping times are..."  ← completely off-topic

How to fix: Check your retrieval pipeline — the wrong 
documents may be getting passed as context.` },
          { type: "subheading", content: "🩷 Inconsistent" },
          { type: "text", content: "Same input produces different outputs across runs." },
          { type: "code", lang: "text", code: `Run 1 → "The limit is 10 items"
Run 2 → "The limit is 25 items"  ← contradiction

How to fix: Set temperature to 0, add seed parameter,
or include explicit values in your prompt.` },
          { type: "subheading", content: "🟢 Verbose" },
          { type: "text", content: "The AI over-generates, repeating content or adding unnecessary detail." },
          { type: "code", lang: "text", code: `Input:  "What's 2+2?" (4 words)
Output: 200+ words explaining arithmetic theory

How to fix: Set max_tokens and add:
  "Be concise. Answer in under 100 words unless asked."` },
        ],
      },
      {
        id: "runs",
        title: "Run Explorer & Diagnosis",
        icon: Terminal,
        blocks: [
          { type: "heading", content: "When to use the Run Explorer" },
          { type: "text", content: "Use Runs when you want to inspect **individual AI calls** in detail — see exactly what went in, what came out, and what went wrong." },
          { type: "heading", content: "Run list" },
          { type: "list", items: [
            "Each row shows: timestamp, input preview, token count, model, and failure badge",
            "✅ Green check = no issues detected",
            "Colored badge = failure detected (click to see full diagnosis)",
            "Search and filter by failure type",
          ]},
          { type: "heading", content: "Run diagnosis view" },
          { type: "text", content: "Click any run to open its full diagnosis. This is the most detailed view in khojo." },
          { type: "mockup", variant: "run-detail", caption: "Full run diagnosis with highlighted output, proof sections, and copy-paste fix" },
          { type: "heading", content: "What you see in a diagnosis" },
          { type: "table", headers: ["Section", "What It Shows", "How To Use It"], rows: [
            ["Token pills", "Input/Output/Total token breakdown", "Spot token waste — high output:input ratio = verbose"],
            ["Input", "The full user query", "Understand what was asked"],
            ["Output (highlighted)", "Full AI response with problem areas marked", "Hover highlights for details — red = incorrect, orange = repeated, blue = missing"],
            ["Context (collapsible)", "The documents/knowledge passed to the AI", "Verify the right docs were retrieved"],
            ["❌ What Failed", "Clear failure statement", "Understand the problem instantly"],
            ["🔍 Proof", "Specific evidence from the output", "Verify the detection is accurate"],
            ["⚠️ Root Cause", "Why the failure happened", "Know exactly what to change"],
            ["✅ Suggested Fix", "Diff-style code change", "Copy and apply immediately"],
          ]},
          { type: "heading", content: "Output highlighting" },
          { type: "text", content: "The output text has color-coded highlights:" },
          { type: "table", headers: ["Color", "Meaning", "Example"], rows: [
            ["🔴 Red", "Unsupported claim (hallucination)", "\"30 days\" when context says 14"],
            ["🟠 Orange", "Repeated content (verbosity)", "Same sentence appearing twice"],
            ["🔵 Blue dashed", "Missing keyword (incompleteness)", "\"solutions\" expected but not found"],
          ]},
          { type: "callout", variant: "tip", content: "**Copy fix workflow:** Read the diagnosis → verify it's accurate → click \"Copy fix\" → paste into your prompt/code → re-run and verify." },
        ],
      },
      {
        id: "sessions",
        title: "Sessions View",
        icon: Command,
        blocks: [
          { type: "heading", content: "When to use Sessions" },
          { type: "text", content: "Use Sessions to debug **multi-turn conversations** — when a chatbot contradicts itself across turns, or context gets lost mid-conversation." },
          { type: "heading", content: "How sessions work" },
          { type: "text", content: "Runs with the same `session_id` are grouped together, showing the full conversation flow." },
          { type: "code", lang: "javascript", code: `// Pass sessionId to group related runs
await client.track({
  input: userMessage,
  output: aiResponse,
  sessionId: conversationId  // same ID for all turns
})` },
          { type: "heading", content: "What sessions reveal" },
          { type: "list", items: [
            "**Context degradation** — later turns lose information from earlier ones",
            "**Contradictions** — the AI says one thing in turn 2 and the opposite in turn 5",
            "**Escalating failures** — small issues compound across a conversation",
            "**Session-level metrics** — total failures, run count, and time range per conversation",
          ]},
          { type: "callout", variant: "info", content: "No session_id? Runs appear in the \"Ungrouped\" section at the bottom. Add session_id to your trackAI calls to enable conversation-level debugging." },
        ],
      },
    ],
  },
  {
    category: "Configuration",
    items: [
      {
        id: "project-settings",
        title: "Project Settings",
        icon: Settings,
        blocks: [
          { type: "heading", content: "When to use Project Settings" },
          { type: "text", content: "Go here when you need to manage your API key, toggle monitoring, view SDK snippets, or clean up run data." },
          { type: "heading", content: "Settings sections" },
          { type: "subheading", content: "Project name" },
          { type: "text", content: "Rename your project anytime. The name appears in the sidebar project switcher." },
          { type: "subheading", content: "Real-time monitoring toggle" },
          { type: "text", content: "Controls whether the `/ingest` API accepts new runs." },
          { type: "table", headers: ["State", "What Happens", "When To Use"], rows: [
            ["✅ On (Live)", "SDK sends data → runs appear in dashboard", "Normal operation"],
            ["⏸ Off (Paused)", "API returns 403 → no new data captured", "Maintenance, cost control, debugging the debugger"],
          ]},
          { type: "subheading", content: "API Key management" },
          { type: "list", items: [
            "**View** — masked by default, click eye icon to reveal",
            "**Copy** — click copy button, shows checkmark for 2 seconds",
            "**Regenerate** — creates new key, invalidates old one. **Warning:** all apps using the old key will stop sending data",
          ]},
          { type: "subheading", content: "SDK Integration snippets" },
          { type: "text", content: "Pre-filled code snippets with your API key for JavaScript, Python, and cURL." },
          { type: "subheading", content: "Danger zone" },
          { type: "text", content: "**Delete all runs** — permanently removes all run data for this project. Cannot be undone. Requires confirmation." },
        ],
      },
      {
        id: "multi-project",
        title: "Multi-Project Support",
        icon: Search,
        blocks: [
          { type: "heading", content: "When to use multiple projects" },
          { type: "text", content: "Create separate projects when you have **different AI products** or **environments** (staging vs production) that should be tracked independently." },
          { type: "heading", content: "Example setup" },
          { type: "table", headers: ["Project", "Use Case", "Monitoring"], rows: [
            ["Customer Support Bot", "Production chatbot", "✅ Live"],
            ["RAG Pipeline (staging)", "Testing retrieval changes", "✅ Live"],
            ["Experiment: Claude 3.5", "Model comparison", "⏸ Paused"],
          ]},
          { type: "heading", content: "How to manage projects" },
          { type: "list", items: [
            "**Create** — click \"+\" in the project switcher dropdown",
            "**Switch** — click any project name in the dropdown to make it active",
            "**Rename** — click the pencil icon next to the project name",
            "**Delete** — click the trash icon (only available if you have 2+ projects)",
          ]},
          { type: "callout", variant: "info", content: "Each project has its own API key, runs, issues, and monitoring toggle. Switching projects immediately updates all views — data is fully isolated." },
          { type: "heading", content: "Monitoring status indicators" },
          { type: "list", items: [
            "🟢 **Green dot** in sidebar = monitoring is active (Live)",
            "No indicator = monitoring is paused",
            "You can also toggle monitoring from the Overview page header",
          ]},
        ],
      },
    ],
  },
  {
    category: "SDK & Integration",
    items: [
      {
        id: "sdk-setup",
        title: "SDK Setup Guide",
        icon: Code,
        blocks: [
          { type: "heading", content: "When to use the SDK" },
          { type: "text", content: "Use the SDK when you want to **automatically capture every AI call** in your app without manual paste-and-analyze. Best for production monitoring." },
          { type: "heading", content: "JavaScript / TypeScript" },
          { type: "code", lang: "javascript", code: `import { trackAI } from '@khojo/sdk'

// Initialize with your API key (from Project Settings)
const client = trackAI({ apiKey: 'your-api-key-here' })

// After every AI call, add this:
const response = await openai.chat.completions.create({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: userMessage }],
})

await client.track({
  input: userMessage,
  output: response.choices[0].message.content,
  context: retrievedDocs,   // optional — from your RAG pipeline
  prompt: systemPrompt,      // optional — your prompt template
  model: 'gpt-4o',           // optional — tracked in dashboard
  sessionId: conversationId  // optional — groups conversation turns
})` },
          { type: "heading", content: "Python" },
          { type: "code", lang: "python", code: `from khojo import track_ai

# Initialize
client = track_ai(api_key="your-api-key-here")

# After every AI call:
response = openai.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": user_message}],
)

client.track(
    input=user_message,
    output=response.choices[0].message.content,
    context=retrieved_docs,    # optional
    prompt=system_prompt,       # optional
    model="gpt-4o",             # optional
    session_id=conversation_id  # optional
)` },
          { type: "heading", content: "cURL (for testing)" },
          { type: "code", lang: "bash", code: `curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/ingest \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "input": "What is the refund policy?",
    "output": "Refunds within 30 days...",
    "context": "Policy: 14 day refund window",
    "model": "gpt-4o"
  }'` },
          { type: "heading", content: "Required vs optional fields" },
          { type: "table", headers: ["Field", "Required", "Type", "Impact"], rows: [
            ["input", "✅ Yes", "string", "Needed for all analysis"],
            ["output", "✅ Yes", "string", "This is what gets analyzed"],
            ["context", "No", "string", "Enables hallucination detection"],
            ["prompt", "No", "string", "Better fix suggestions"],
            ["model", "No", "string", "Shown in dashboard, included in analysis"],
            ["sessionId", "No", "string", "Groups runs into conversations"],
          ]},
          { type: "callout", variant: "warning", content: "**Always pass context** if you're using RAG or retrieval. Without it, khojo cannot detect hallucinations — the most critical failure type." },
        ],
      },
      {
        id: "api-reference",
        title: "API Reference",
        icon: BookOpen,
        blocks: [
          { type: "heading", content: "POST /functions/v1/ingest" },
          { type: "text", content: "Send AI run data for analysis." },
          { type: "heading", content: "Authentication" },
          { type: "code", lang: "text", code: `Authorization: Bearer YOUR_API_KEY` },
          { type: "heading", content: "Response codes" },
          { type: "table", headers: ["Code", "Meaning", "When"], rows: [
            ["200", "Run saved and queued for evaluation", "Everything is working"],
            ["400", "Missing required fields", "input or output is missing from the request body"],
            ["401", "Invalid API key", "The API key doesn't match any project"],
            ["403", "Monitoring disabled", "The project has monitoring turned off in Settings"],
          ]},
          { type: "heading", content: "Evaluation pipeline" },
          { type: "text", content: "After ingestion, the `/evaluate` edge function automatically runs 5 heuristic checks:" },
          { type: "numbered", items: [
            "**Hallucination detection** — compares output claims against context (requires context)",
            "**Completeness check** — verifies all parts of the question are addressed",
            "**Relevance check** — ensures the output matches the input topic",
            "**Consistency check** — compares against previous runs with similar input",
            "**Verbosity detection** — flags excessive output length and repetition",
          ]},
          { type: "callout", variant: "info", content: "If evaluation fails, the run is still saved — it just shows \"Evaluation pending\" in the UI. Evaluation can be retried later." },
        ],
      },
    ],
  },
  {
    category: "Navigation & Help",
    items: [
      {
        id: "keyboard-shortcuts",
        title: "Keyboard Shortcuts",
        icon: Search,
        blocks: [
          { type: "table", headers: ["Shortcut", "Action"], rows: [
            ["⌘K / Ctrl+K", "Open command palette — search and navigate to any page"],
          ]},
          { type: "heading", content: "Command palette features" },
          { type: "list", items: [
            "Search all pages by name",
            "Select **scope filters** to narrow search to specific areas",
            "Keyboard-friendly — arrow keys to navigate, Enter to select",
          ]},
        ],
      },
      {
        id: "troubleshooting",
        title: "Troubleshooting",
        icon: Wrench,
        blocks: [
          { type: "heading", content: "Common issues" },
          { type: "subheading", content: "\"No runs appear in the dashboard\"" },
          { type: "list", items: [
            "Check that monitoring is **enabled** (green dot in sidebar)",
            "Verify your API key is correct (Project Settings → reveal key)",
            "Ensure your SDK call includes both `input` and `output`",
            "Check the API response — 403 means monitoring is off, 401 means wrong key",
          ]},
          { type: "subheading", content: "\"Evaluation pending\" on a run" },
          { type: "text", content: "The evaluation edge function may have failed or timed out. The run data is safe — only the analysis is missing. Refresh or wait for the next evaluation cycle." },
          { type: "subheading", content: "\"No hallucinations detected\" but output is clearly wrong" },
          { type: "list", items: [
            "Did you provide **context**? Without context, khojo cannot verify factual claims",
            "Is the hallucination numeric? khojo currently focuses on numeric mismatches — semantic hallucinations may require context keywords",
          ]},
          { type: "subheading", content: "\"Connection error\" banner" },
          { type: "text", content: "khojo can't reach Supabase. Check your internet connection. The app will retry automatically." },
        ],
      },
    ],
  },
];

// ——————————————————————————————————————————————
// Rendering
// ——————————————————————————————————————————————

export default function DocsPage() {
  const [activeDoc, setActiveDoc] = useState(docSections[0].items[0].id);
  const activeItem = docSections.flatMap((s) => s.items).find((i) => i.id === activeDoc);

  return (
    <div className="flex h-[calc(100vh-3rem)]">
      {/* Sidebar TOC */}
      <ScrollArea className="w-56 border-r border-border shrink-0">
        <div className="p-3 space-y-3">
          <h3 className="text-foreground px-1">Docs</h3>
          {docSections.map((section) => (
            <div key={section.category}>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1 px-1">{section.category}</p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveDoc(item.id)}
                    className={`w-full flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors ${
                      activeDoc === item.id
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    }`}
                  >
                    <item.icon className="h-3 w-3 shrink-0" />
                    <span className="truncate">{item.title}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 max-w-3xl mx-auto animate-fade-in">
          {activeItem && (
            <>
              <div className="flex items-center gap-2 mb-5">
                <activeItem.icon className="h-4 w-4 text-primary" />
                <h1 className="text-foreground">{activeItem.title}</h1>
              </div>
              <div className="space-y-4">
                {activeItem.blocks.map((block, i) => (
                  <BlockRenderer key={i} block={block} />
                ))}
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function BlockRenderer({ block }: { block: Block }) {
  switch (block.type) {
    case "text":
      return <p className="text-xs text-foreground/80 leading-relaxed" dangerouslySetInnerHTML={{ __html: md(block.content) }} />;

    case "heading":
      return <h2 className="text-foreground mt-5 mb-1">{block.content}</h2>;

    case "subheading":
      return <h3 className="text-foreground mt-3 mb-1">{block.content}</h3>;

    case "mockup":
      return (
        <div className="my-3">
          <MockupDiagram variant={block.variant} />
          {block.caption && (
            <p className="text-[11px] text-muted-foreground mt-1.5 italic">{block.caption}</p>
          )}
        </div>
      );

    case "code":
      return (
        <pre className="bg-surface-1 border border-border rounded-md p-3 text-[11px] overflow-x-auto leading-relaxed">
          <code className="text-foreground/80">{block.code}</code>
        </pre>
      );

    case "list":
      return (
        <div className="space-y-1 ml-1">
          {block.items.map((item, i) => (
            <div key={i} className="flex gap-2 text-xs text-foreground/80">
              <span className="text-muted-foreground/50 shrink-0">•</span>
              <span dangerouslySetInnerHTML={{ __html: md(item) }} />
            </div>
          ))}
        </div>
      );

    case "numbered":
      return (
        <div className="space-y-1.5 ml-1">
          {block.items.map((item, i) => (
            <div key={i} className="flex gap-2 text-xs text-foreground/80">
              <span className="text-primary font-medium shrink-0 w-4 text-right">{i + 1}.</span>
              <span dangerouslySetInnerHTML={{ __html: md(item) }} />
            </div>
          ))}
        </div>
      );

    case "callout": {
      const styles = {
        info: "bg-info/5 border-info/20 text-info",
        warning: "bg-warning/5 border-warning/20 text-warning",
        tip: "bg-primary/5 border-primary/20 text-primary",
        example: "bg-hallucination/5 border-hallucination/20 text-hallucination",
      };
      const icons = { info: "ℹ️", warning: "⚠️", tip: "💡", example: "📋" };
      return (
        <div className={`rounded-md border p-3 text-xs leading-relaxed ${styles[block.variant]}`}>
          <span dangerouslySetInnerHTML={{ __html: `${icons[block.variant]} ${md(block.content)}` }} />
        </div>
      );
    }

    case "table":
      return (
        <div className="rounded-md border border-border overflow-hidden my-2">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-surface-1 border-b border-border">
                {block.headers.map((h, i) => (
                  <th key={i} className="text-left p-2 font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  {row.map((cell, j) => (
                    <td key={j} className="p-2 text-foreground/80" dangerouslySetInnerHTML={{ __html: md(cell) }} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "divider":
      return <hr className="border-border my-4" />;

    default:
      return null;
  }
}

function md(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '<code class="bg-surface-1 px-1 py-0.5 rounded text-[10px] border border-border font-mono">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong class='text-foreground'>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}
