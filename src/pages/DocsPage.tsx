import { useState } from "react";
import { Zap, Activity, AlertTriangle, Terminal, Command, Settings, Search, BookOpen, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const docSections = [
  {
    category: "Getting Started",
    items: [
      {
        id: "overview",
        title: "What is khojo?",
        icon: BookOpen,
        content: `khojo is a developer debugging tool for AI outputs. It helps you identify what's broken in your AI responses, understand why it's happening, and fix it immediately.

**Key capabilities:**
- Detect 5 failure types: hallucination, incomplete answers, irrelevant responses, inconsistent behavior, and verbose/token waste
- Get actionable fixes with copy-paste prompts
- Monitor AI runs in real-time via SDK integration
- Analyze outputs instantly without any SDK setup

khojo is NOT an evaluation platform or analytics dashboard — it's a debugger for AI behavior, designed to feel like console logs and error traces for your AI.`,
      },
      {
        id: "instant-analyzer",
        title: "Instant Analyzer (No SDK Required)",
        icon: Zap,
        content: `The Instant Analyzer is the fastest way to debug an AI output — no SDK or integration needed.

**How to use it:**
1. Navigate to **Analyzer** from the sidebar
2. Paste your **Input** (the user query or prompt)
3. Paste the **Output** (the AI's response)
4. Optionally add **Context** (retrieved documents, knowledge base content)
5. Optionally set a **System Prompt** and select a **Model**
6. Click **Analyze**

**What you'll see:**
- ❌ **What failed** — a clear statement of the detected issue
- 🔍 **Proof** — highlighted evidence from the output
- ⚠️ **Root cause** — why this failure is occurring
- ✅ **Suggested fix** — a copy-paste prompt or code change

**Tip:** Click "Load Example" to see a pre-filled hallucination scenario and understand the analysis format.

The Analyzer runs the same 5-check evaluation pipeline as the SDK-based monitoring, so results are consistent across both modes.`,
      },
      {
        id: "onboarding",
        title: "Account Setup & Onboarding",
        icon: Settings,
        content: `**Creating an account:**
1. Click "Create account" on the sign-up page
2. Enter your email and password
3. You'll be redirected to the onboarding flow

**Onboarding steps:**
1. **Name your project** — give your first project a name (e.g., "Customer Support Bot")
2. **API Key** — a unique API key is auto-generated. Copy it and store it securely — it won't be shown again
3. **Install the SDK** (optional) — code snippets for JavaScript, Python, and cURL are provided. You can skip this step and use the Instant Analyzer instead
4. Click **"Done — go to dashboard"** to start using khojo

**Note:** The SDK installation step is optional. You can always set it up later from Project Settings. The Instant Analyzer works without any SDK integration.`,
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
        content: `The Overview dashboard gives you a bird's-eye view of your AI system's health.

**Metrics displayed:**
- **Total Runs** — how many AI calls have been captured
- **Issues Detected** — number of runs with at least one failure
- **Failure Rate** — percentage of runs with issues
- **Avg Tokens** — average token usage across runs
- **Top Failure Type** — the most common failure category

**Charts:**
- Failure distribution breakdown (by type)
- Recent activity timeline

**Quick actions:**
- "Try Instant Analyzer" button for quick debugging
- Click any metric to drill down into the relevant page

**Real-time updates:**
When new runs are ingested via the SDK, the overview updates automatically via Supabase Realtime. You'll see a toast notification when new data arrives.

**Empty state:**
If you have no runs yet, the dashboard shows a "Waiting for your first run..." message with a pulsing indicator and instructions to get started.`,
      },
      {
        id: "issues",
        title: "Issues Detection & Grouping",
        icon: AlertTriangle,
        content: `The Issues page groups detected failures by type and shows their frequency.

**5 failure types detected:**
- 🔴 **Hallucination** — AI states facts not supported by the provided context
- 🟠 **Incomplete** — AI answers only part of the question
- 🔵 **Irrelevant** — AI responds about something the user didn't ask about
- 🟣 **Verbose** — AI over-generates, repeating information or adding unnecessary content
- 🩷 **Inconsistent** — AI gives different answers to the same question across runs

**Prioritization:**
- 🔥 **Critical** — hallucination and frequent failures that need immediate attention
- ⚠️ **Improvements** — verbosity and inconsistency that can be optimized

**Each issue shows:**
- Failure type badge with color coding
- Number of affected runs
- Confidence level (high/medium/low)
- Quick link to affected runs

**Filtering:**
- Filter by failure type
- Filter by confidence level
- Dismiss issues to reduce noise

**Real-time:**
New issues appear automatically as runs are evaluated — no page refresh needed.`,
      },
      {
        id: "runs",
        title: "Run Explorer",
        icon: Terminal,
        content: `The Runs page is a chronological list of every AI call captured by khojo.

**Run list shows:**
- Timestamp (relative, with full datetime on hover)
- Input preview (truncated)
- Model used
- Failure badges (if any detected)
- Token count

**Filtering & search:**
- Search by input text
- Filter by failure type
- Sort by newest/oldest

**Run detail view:**
Click any run to open its full diagnosis page, which includes:
- **Input** — the complete user query
- **Output** — the full AI response with highlighted problem areas
- **Context** — any retrieved documents or knowledge base content
- **System Prompt** — the prompt template used
- **Diagnosis** — detailed failure analysis with proof, root cause, and fix
- **Token breakdown** — input tokens, output tokens, context tokens, total

**Dismissing runs:**
You can dismiss individual runs to mark them as reviewed. Dismissed runs are excluded from issue counts.`,
      },
      {
        id: "sessions",
        title: "Sessions View",
        icon: Command,
        content: `Sessions group related runs by a shared session_id, representing a multi-turn conversation.

**What sessions show:**
- Session ID
- Number of runs in the session
- Time range (first to last run)
- Failure summary across all runs in the session

**Why sessions matter:**
Multi-turn conversations can have issues that only appear in context — for example, the AI contradicting something it said earlier in the conversation. Sessions help you spot these patterns.

**How to create sessions:**
Pass a \`session_id\` in your trackAI() calls:

\`\`\`javascript
await client.track({
  input: userMessage,
  output: aiResponse,
  sessionId: conversationId  // group runs by conversation
})
\`\`\`

**Empty state:**
If no session_ids have been passed, you'll see instructions on how to add them to your SDK calls.`,
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
        content: `Project Settings let you configure each project independently.

**Project name:**
Rename your project at any time. This is displayed in the sidebar project switcher.

**Real-time monitoring toggle:**
- **On** — the /ingest endpoint accepts incoming runs
- **Off** — the API returns 403 and rejects all incoming data. Useful when you want to pause monitoring without removing the SDK

The monitoring status is shown in the sidebar with a green dot (active) or no indicator (paused).

**API Key:**
- View your key (masked by default, click eye icon to reveal)
- Copy to clipboard
- Regenerate — creates a new key and invalidates the old one. A confirmation dialog warns that existing integrations will break

**SDK Integration:**
Code snippets for JavaScript, Python, and cURL are provided with your API key pre-filled. Switch between languages using the tab buttons.

**Danger zone:**
- "Delete all runs" — permanently removes all run data for the project. Requires confirmation.`,
      },
      {
        id: "multi-project",
        title: "Multi-Project Support",
        icon: Search,
        content: `khojo supports multiple projects per account. Each project has its own:
- API key
- Runs and issues
- Monitoring toggle
- Settings

**Creating a project:**
Click the "+" button in the project switcher dropdown in the sidebar.

**Switching projects:**
Use the project switcher dropdown in the sidebar. The active project is shown with a green dot if monitoring is enabled.

**Deleting a project:**
Currently, individual project deletion is not available from the UI. You can delete all runs for a project from Project Settings.

**Data isolation:**
All data (runs, issues, sessions) is scoped to the active project. Switching projects immediately updates all views.`,
      },
    ],
  },
  {
    category: "SDK & Integration",
    items: [
      {
        id: "sdk-setup",
        title: "SDK Setup",
        icon: Terminal,
        content: `The khojo SDK sends your AI call data to the khojo API for analysis.

**JavaScript:**
\`\`\`javascript
import { trackAI } from '@khojo/sdk'

const client = trackAI({ apiKey: 'YOUR_API_KEY' })

await client.track({
  input: userMessage,
  output: aiResponse,
  context: retrievedDocs,   // optional
  prompt: systemPrompt,      // optional
  model: 'gpt-4o',           // optional
  sessionId: conversationId  // optional
})
\`\`\`

**Python:**
\`\`\`python
from khojo import track_ai

client = track_ai(api_key="YOUR_API_KEY")

client.track(
  input=user_message,
  output=ai_response,
  context=retrieved_docs,   # optional
  prompt=system_prompt,      # optional
  model="gpt-4o",            # optional
  session_id=conversation_id # optional
)
\`\`\`

**Required fields:** \`input\` and \`output\` only. Everything else is optional.

**What happens after a track() call:**
1. Data is sent to the /ingest edge function
2. The run is saved to the database
3. The /evaluate function runs 5 heuristic checks
4. Results appear in your dashboard in real-time`,
      },
      {
        id: "api-reference",
        title: "API Reference",
        icon: BookOpen,
        content: `**POST /functions/v1/ingest**

Send AI run data for analysis.

**Headers:**
- \`Authorization: Bearer YOUR_API_KEY\`
- \`Content-Type: application/json\`

**Body:**
\`\`\`json
{
  "input": "string (required)",
  "output": "string (required)",
  "context": "string (optional)",
  "prompt": "string (optional)",
  "model": "string (optional)",
  "session_id": "string (optional)"
}
\`\`\`

**Responses:**
- \`200\` — Run saved and queued for evaluation
- \`400\` — Missing required fields (\`input\` and \`output\`)
- \`401\` — Invalid API key
- \`403\` — Monitoring is disabled for this project

**Evaluation:**
After ingestion, the /evaluate edge function runs 5 heuristic checks:
1. Hallucination detection (requires context)
2. Completeness check
3. Relevance check
4. Consistency check (requires multiple runs)
5. Verbosity/token waste detection

Results are written back to the run record with \`failure_types\`, \`primary_failure\`, \`confidence\`, \`explanation\`, \`proof\`, \`root_cause\`, and \`fix\` fields.`,
      },
    ],
  },
  {
    category: "Navigation & Shortcuts",
    items: [
      {
        id: "command-palette",
        title: "Command Palette (⌘K)",
        icon: Search,
        content: `Press **⌘K** (or **Ctrl+K** on Windows/Linux) to open the command palette.

**Features:**
- Search across all pages by name
- Filter search scope by selecting specific areas (Overview, Issues, Runs, etc.)
- Quick navigation to any page
- Keyboard-friendly — arrow keys to navigate, Enter to select

**Tip:** The command palette is the fastest way to navigate between pages without using the sidebar.`,
      },
      {
        id: "sidebar",
        title: "Sidebar Navigation",
        icon: Activity,
        content: `The sidebar provides access to all major sections:

**Monitor section:**
- Overview — dashboard with metrics and charts
- Issues — grouped failure detection
- Runs — chronological run explorer
- Sessions — multi-turn conversation grouping
- Analyzer — instant AI output debugging

**Config section:**
- Project Settings — API key, monitoring, SDK setup

**Help section:**
- Contact Support — report bugs, request features, or send general feedback
- Docs — this documentation page

**Project switcher:**
At the top of the sidebar, switch between projects or create new ones.

**Collapsing:**
Click the sidebar trigger in the header to collapse to icon-only mode. All navigation remains accessible via icon tooltips.`,
      },
    ],
  },
];

export default function DocsPage() {
  const [activeDoc, setActiveDoc] = useState(docSections[0].items[0].id);

  const activeItem = docSections.flatMap((s) => s.items).find((i) => i.id === activeDoc);

  return (
    <div className="flex h-[calc(100vh-3rem)]">
      {/* Sidebar TOC */}
      <ScrollArea className="w-64 border-r border-border shrink-0">
        <div className="p-4 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Documentation</h2>
          {docSections.map((section) => (
            <div key={section.category}>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
                {section.category}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveDoc(item.id)}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${
                      activeDoc === item.id
                        ? "bg-accent text-accent-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    }`}
                  >
                    <item.icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{item.title}</span>
                    {activeDoc === item.id && <ChevronRight className="h-3 w-3 ml-auto shrink-0" />}
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
              <div className="flex items-center gap-2 mb-4">
                <activeItem.icon className="h-5 w-5 text-primary" />
                <h1 className="text-foreground">{activeItem.title}</h1>
              </div>
              <div className="prose prose-invert prose-sm max-w-none">
                {activeItem.content.split("\n\n").map((block, i) => {
                  if (block.startsWith("```")) {
                    const lines = block.split("\n");
                    const code = lines.slice(1, -1).join("\n");
                    return (
                      <pre key={i} className="bg-surface-1 border border-border rounded-md p-3 text-xs overflow-x-auto">
                        <code>{code}</code>
                      </pre>
                    );
                  }
                  if (block.startsWith("**") && block.includes(":**")) {
                    const parts = block.split("\n");
                    return (
                      <div key={i} className="mb-3">
                        {parts.map((line, j) => {
                          if (line.startsWith("- ")) {
                            const content = line.slice(2);
                            return (
                              <div key={j} className="flex gap-2 text-xs text-muted-foreground ml-2 mb-1">
                                <span className="text-muted-foreground/50">•</span>
                                <span dangerouslySetInnerHTML={{ __html: formatMarkdown(content) }} />
                              </div>
                            );
                          }
                          return (
                            <p key={j} className="text-xs text-foreground mb-1" dangerouslySetInnerHTML={{ __html: formatMarkdown(line) }} />
                          );
                        })}
                      </div>
                    );
                  }
                  const lines = block.split("\n");
                  return (
                    <div key={i} className="mb-3">
                      {lines.map((line, j) => {
                        if (line.startsWith("- ")) {
                          return (
                            <div key={j} className="flex gap-2 text-xs text-muted-foreground ml-2 mb-1">
                              <span className="text-muted-foreground/50">•</span>
                              <span dangerouslySetInnerHTML={{ __html: formatMarkdown(line.slice(2)) }} />
                            </div>
                          );
                        }
                        if (line.match(/^\d+\./)) {
                          return (
                            <div key={j} className="flex gap-2 text-xs text-muted-foreground ml-2 mb-1">
                              <span className="text-muted-foreground/60">{line.match(/^\d+/)?.[0]}.</span>
                              <span dangerouslySetInnerHTML={{ __html: formatMarkdown(line.replace(/^\d+\.\s*/, "")) }} />
                            </div>
                          );
                        }
                        return (
                          <p key={j} className="text-xs text-foreground/80 leading-relaxed" dangerouslySetInnerHTML={{ __html: formatMarkdown(line) }} />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function formatMarkdown(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '<code class="bg-surface-1 px-1 py-0.5 rounded text-[11px] border border-border">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}
