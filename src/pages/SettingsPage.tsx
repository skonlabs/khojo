import { useState } from "react";
import { CodeBlock } from "@/components/CodeBlock";
import { Copy, Check, Key } from "lucide-react";
import { toast } from "sonner";

const sdkSnippets = {
  javascript: `import { trackAI } from '@khojo/sdk';

// Add to your AI call handler
const response = await openai.chat.completions.create({...});

trackAI({
  input: userMessage,
  output: response.choices[0].message.content,
  context: retrievedDocs,
  prompt: systemPrompt,
  model: 'gpt-4o',
  temperature: 0.7,
  source: 'chat_handler.ts:42',
  metadata: { userId: user.id },
  expected: expectedOutput,       // optional ground truth
  tags: ['support', 'billing'],
  sessionId: conversationId,
});`,
  python: `from khojo import track_ai

# Add to your AI call handler
response = openai.chat.completions.create(...)

track_ai(
    input=user_message,
    output=response.choices[0].message.content,
    context=retrieved_docs,
    prompt=system_prompt,
    model="gpt-4o",
    temperature=0.7,
    source="chat_handler.py:42",
    metadata={"user_id": user.id},
    expected=expected_output,     # optional ground truth
    tags=["support", "billing"],
    session_id=conversation_id,
)`,
  curl: `curl -X POST https://api.khojo.dev/v1/track \\
  -H "Authorization: Bearer kj_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "input": "What is the refund policy?",
    "output": "Refunds within 30 days...",
    "context": "Policy: 14 day refund window",
    "model": "gpt-4o",
    "temperature": 0.7,
    "source": "chat_handler.ts:42",
    "metadata": { "userId": "usr_123" },
    "tags": ["support"],
    "sessionId": "sess-abc"
  }'`,
};

const installSnippets = {
  javascript: 'npm install @khojo/sdk',
  python: 'pip install khojo',
  curl: '# No installation needed — use cURL directly',
};

export default function SettingsPage() {
  const [tab, setTab] = useState<'javascript' | 'python' | 'curl'>('javascript');
  const [keyCopied, setKeyCopied] = useState(false);
  const apiKey = 'kj_sk_1a2b3c4d5e6f7g8h9i0j';

  const copyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setKeyCopied(true);
    toast.success("API key copied to clipboard");
    setTimeout(() => setKeyCopied(false), 2000);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">SDK setup and configuration</p>
      </div>

      {/* API Key */}
      <div className="rounded-lg border border-border bg-card p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Key className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">API Key</h3>
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-surface-1 rounded-md px-3 py-2 text-sm font-mono text-muted-foreground border border-border">
            {apiKey.slice(0, 8)}{'•'.repeat(16)}
          </code>
          <button onClick={copyKey} className="p-2 rounded-md bg-surface-1 border border-border hover:bg-surface-2 text-muted-foreground hover:text-foreground transition-colors">
            {keyCopied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* SDK Install */}
      <div className="rounded-lg border border-border bg-card p-4 mb-6">
        <h3 className="text-sm font-medium text-foreground mb-1">SDK Integration</h3>
        <p className="text-sm text-muted-foreground mb-4">Add one line to start monitoring. Async, non-blocking, supports sampling and test mode.</p>

        <div className="flex gap-1 mb-4">
          {(['javascript', 'python', 'curl'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                tab === t ? 'bg-primary text-primary-foreground' : 'bg-surface-1 text-muted-foreground hover:text-foreground border border-border'
              }`}
            >
              {t === 'javascript' ? 'JavaScript' : t === 'python' ? 'Python' : 'cURL'}
            </button>
          ))}
        </div>

        {/* Install command */}
        <div className="mb-3">
          <span className="text-xs font-medium text-muted-foreground block mb-1.5">1. Install</span>
          <CodeBlock code={installSnippets[tab]} />
        </div>

        {/* Usage */}
        <div>
          <span className="text-xs font-medium text-muted-foreground block mb-1.5">2. Add to your AI handler</span>
          <CodeBlock code={sdkSnippets[tab]} />
        </div>
      </div>

      {/* SDK options */}
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-medium text-foreground mb-3">SDK Options</h3>
        <div className="grid grid-cols-2 gap-3">
          <OptionCard name="sampling" description="Track only a percentage of runs" example="sampling: 0.1  // 10% of runs" />
          <OptionCard name="testMode" description="Log locally without sending to API" example="testMode: true" />
          <OptionCard name="async" description="Non-blocking by default" example="// trackAI never blocks your response" />
          <OptionCard name="tags" description="Categorize runs for filtering" example='tags: ["support", "billing"]' />
        </div>
      </div>
    </div>
  );
}

function OptionCard({ name, description, example }: { name: string; description: string; example: string }) {
  return (
    <div className="bg-surface-1 rounded-md p-3 border border-border">
      <div className="text-sm font-mono text-primary mb-1">{name}</div>
      <div className="text-xs text-muted-foreground mb-2">{description}</div>
      <code className="text-[10px] font-mono text-foreground/70">{example}</code>
    </div>
  );
}
