import { useState } from "react";
import { CodeBlock } from "@/components/CodeBlock";
import { Copy, Check } from "lucide-react";

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
    "source": "chat_handler.ts:42",
    "tags": ["support"]
  }'`,
};

export default function SettingsPage() {
  const [tab, setTab] = useState<'javascript' | 'python' | 'curl'>('javascript');
  const [keyCopied, setKeyCopied] = useState(false);
  const apiKey = 'kj_sk_1a2b3c4d5e6f7g8h9i0j';

  const copyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setKeyCopied(true);
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
        <h3 className="text-sm font-medium text-foreground mb-3">API Key</h3>
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
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-medium text-foreground mb-3">SDK Integration</h3>
        <p className="text-sm text-muted-foreground mb-4">Add one line to start monitoring. Async, non-blocking.</p>

        <div className="flex gap-1 mb-3">
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

        <CodeBlock code={sdkSnippets[tab]} />
      </div>
    </div>
  );
}
