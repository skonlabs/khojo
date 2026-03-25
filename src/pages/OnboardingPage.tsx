import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CodeBlock } from "@/components/CodeBlock";
import { toast } from "sonner";
import { Check, Copy, AlertTriangle, Search, Zap } from "lucide-react";

type Platform = "windows" | "macos-intel" | "macos-apple" | "linux";
type SdkTab = "javascript" | "python";

const PLATFORM_LABELS: Record<Platform, string> = {
  windows: "Windows",
  "macos-intel": "macOS Intel",
  "macos-apple": "macOS Apple Silicon",
  linux: "Linux",
};

function getInstallCommand(platform: Platform, tab: SdkTab): string {
  if (tab === "javascript") {
    return "npm install @khojo/sdk";
  }
  switch (platform) {
    case "windows":
      return "pip install khojo\n# or: py -m pip install khojo\n# recommended: python -m venv .venv && .venv\\Scripts\\activate && pip install khojo";
    case "macos-intel":
      return "pip3 install khojo\n# recommended: python3 -m venv .venv && source .venv/bin/activate && pip install khojo";
    case "macos-apple":
      return "pip3 install khojo\n# recommended: python3 -m venv .venv && source .venv/bin/activate && pip install khojo\n# Native arm64 wheels are used automatically on Apple Silicon";
    case "linux":
      return "pip3 install khojo\n# recommended: python3 -m venv .venv && source .venv/bin/activate && pip install khojo";
  }
}

function getPlatformNote(platform: Platform, tab: SdkTab): string | null {
  if (tab === "javascript") {
    if (platform === "windows") return "Requires Node.js ≥ 18 — run in PowerShell or Command Prompt.";
    if (platform === "macos-apple") return "Install the arm64 Node.js binary from nodejs.org for best performance.";
    return null;
  }
  if (platform === "windows") return "Requires Python 3.8+. During installation, check 'Add to PATH'.";
  if (platform === "macos-intel") return "Requires Python 3.8+. Install via python.org or: brew install python@3";
  if (platform === "macos-apple") return "Requires Python 3.8+. Homebrew and pyenv provide native arm64 builds.";
  if (platform === "linux") return "Requires Python 3.8+. Install pip: sudo apt install python3-pip or sudo dnf install python3-pip";
  return null;
}

export default function OnboardingPage() {
  const { user, refreshProjects } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [projectName, setProjectName] = useState("");
  const [saving, setSaving] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const [sdkTab, setSdkTab] = useState<SdkTab>("javascript");
  const [platform, setPlatform] = useState<Platform>("macos-apple");
  const [createdApiKey, setCreatedApiKey] = useState("");

  const handleSaveProject = async () => {
    if (!projectName.trim()) {
      toast.error("Please enter a project name");
      return;
    }
    if (!user) return;
    setSaving(true);
    const { data, error } = await supabase
      .from("projects")
      .insert({ user_id: user.id, name: projectName.trim() })
      .select("api_key")
      .single();
    setSaving(false);
    if (error) {
      toast.error("Failed to create project");
      console.error(JSON.stringify({ level: "error", message: "handleSaveProject failed", error: error.message }));
    } else if (data) {
      setCreatedApiKey(data.api_key);
      await refreshProjects();
      setStep(2);
    }
  };

  const copyKey = () => {
    navigator.clipboard.writeText(createdApiKey).catch(() => toast.error("Clipboard access denied"));
    setKeyCopied(true);
    toast.success("API key copied");
    setTimeout(() => setKeyCopied(false), 2000);
  };

  const installCommand = getInstallCommand(platform, sdkTab);
  const platformNote = getPlatformNote(platform, sdkTab);

  const jsSnippet = `import { trackAI } from '@khojo/sdk'

const client = trackAI({ apiKey: '${createdApiKey || "YOUR_API_KEY"}' })

await client.track({
  input: userMessage,
  output: aiResponse,
  context: retrievedDocs,   // optional
  prompt: systemPrompt,      // optional
  model: 'gpt-4o',           // optional
  sessionId: conversationId  // optional
})`;

  const pySnippet = `from khojo import track_ai

client = track_ai(api_key="${createdApiKey || "YOUR_API_KEY"}")

client.track(
  input=user_message,
  output=ai_response,
  context=retrieved_docs,    # optional
  prompt=system_prompt,       # optional
  model="gpt-4o",             # optional
  session_id=conversation_id  # optional
)`;

  const usageSnippet = sdkTab === "javascript" ? jsSnippet : pySnippet;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
              <Search className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground">khojo</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-1">
                <div
                  className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    s <= step ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted-foreground"
                  }`}
                >
                  {s < step ? <Check className="h-3 w-3" /> : s}
                </div>
                {s < 3 && <div className={`w-8 h-px ${s < step ? "bg-primary" : "bg-border"}`} />}
              </div>
            ))}
          </div>
        </div>

        {step === 1 && (
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <div>
              <h2 className="text-foreground">Name your project</h2>
              <p className="text-sm text-muted-foreground mt-1">What are you building?</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project">Project name</Label>
              <Input
                id="project"
                placeholder="My AI App"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveProject()}
              />
            </div>
            <Button onClick={handleSaveProject} disabled={saving} className="w-full">
              {saving ? "Creating..." : "Continue"}
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <div>
              <h2 className="text-foreground">Your API key</h2>
              <p className="text-sm text-muted-foreground mt-1">Use this to authenticate SDK calls</p>
            </div>
            <div className="flex items-center gap-2">
              <Input readOnly value={createdApiKey} className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={copyKey}>
                {keyCopied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-md bg-warning/10 border border-warning/20">
              <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">Store this key securely — treat it like a password. Do not commit it to source control.</p>
            </div>
            <Button onClick={() => setStep(3)} className="w-full">Continue</Button>
          </div>
        )}

        {step === 3 && (
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <div>
              <h2 className="text-foreground">Get started</h2>
              <p className="text-sm text-muted-foreground mt-1">Choose how you want to debug your AI outputs</p>
            </div>

            {/* Instant Analyzer */}
            <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Quick start — No SDK needed</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Paste any AI input/output pair and instantly see what's broken, why, and how to fix it.
              </p>
              <Button onClick={() => navigate("/analyzer")} variant="default" className="w-full">
                <Zap className="h-4 w-4 mr-1" /> Try Instant Analyzer
              </Button>
            </div>

            {/* SDK setup */}
            <div className="rounded-lg border border-border bg-surface-1 p-4 space-y-3">
              <div>
                <h3 className="text-sm font-medium text-foreground">Optional — SDK for real-time monitoring</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Add one call to your app to automatically capture and analyse every AI interaction.
                </p>
              </div>

              {/* Platform selector */}
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Platform</p>
                <div className="flex flex-wrap gap-1">
                  {(Object.keys(PLATFORM_LABELS) as Platform[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPlatform(p)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        platform === p
                          ? "bg-primary text-primary-foreground"
                          : "bg-surface-2 text-muted-foreground hover:text-foreground border border-border"
                      }`}
                    >
                      {PLATFORM_LABELS[p]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language tab */}
              <div className="flex gap-1">
                {(["javascript", "python"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setSdkTab(t)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      sdkTab === t
                        ? "bg-primary text-primary-foreground"
                        : "bg-surface-2 text-muted-foreground hover:text-foreground border border-border"
                    }`}
                  >
                    {t === "javascript" ? "JavaScript / TypeScript" : "Python"}
                  </button>
                ))}
              </div>

              {/* Platform note */}
              {platformNote && (
                <div className="flex items-start gap-2 p-2 rounded-md bg-info/10 border border-info/20 text-xs text-muted-foreground">
                  <span className="shrink-0">ℹ️</span>
                  <span>{platformNote}</span>
                </div>
              )}

              {/* Install */}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Installation</p>
                <CodeBlock code={installCommand} />
              </div>

              {/* Usage */}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Usage</p>
                <CodeBlock code={usageSnippet} />
              </div>
            </div>

            <Button variant="outline" onClick={() => navigate("/")} className="w-full">
              Open my dashboard →
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
