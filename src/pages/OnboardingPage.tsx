import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CodeBlock } from "@/components/CodeBlock";
import { toast } from "sonner";
import { Check, Copy, AlertTriangle, Search } from "lucide-react";

export default function OnboardingPage() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [projectName, setProjectName] = useState("");
  const [saving, setSaving] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const [sdkTab, setSdkTab] = useState<"javascript" | "python">("javascript");

  const apiKey = profile?.api_key ?? "";

  const handleSaveProject = async () => {
    if (!projectName.trim()) {
      toast.error("Please enter a project name");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ project_name: projectName.trim() })
      .eq("id", profile?.id);
    setSaving(false);
    if (error) {
      toast.error("Failed to save project name");
    } else {
      await refreshProfile();
      setStep(2);
    }
  };

  const copyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setKeyCopied(true);
    toast.success("API key copied");
    setTimeout(() => setKeyCopied(false), 2000);
  };

  const jsSnippet = `import { trackAI } from '@khojo/sdk'

const client = trackAI({ apiKey: '${apiKey}' })

await client.track({
  input: userMessage,
  output: aiResponse,
  context: retrievedDocs,   // optional
  prompt: systemPrompt,      // optional
  model: 'gpt-4o',           // optional
  sessionId: conversationId  // optional
})`;

  const pySnippet = `from khojo import track_ai

client = track_ai(api_key="${apiKey}")

client.track(
  input=user_message,
  output=ai_response,
  context=retrieved_docs,   # optional
  prompt=system_prompt,      # optional
  model="gpt-4o",            # optional
  session_id=conversation_id # optional
)`;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
              <Search className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold text-foreground">khojo</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-1">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  s <= step ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted-foreground"
                }`}>
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
              <h2 className="text-lg font-semibold text-foreground">Name your project</h2>
              <p className="text-sm text-muted-foreground mt-1">What are you building?</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project">Project name</Label>
              <Input
                id="project"
                placeholder="My AI App"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
            </div>
            <Button onClick={handleSaveProject} disabled={saving} className="w-full">
              {saving ? "Saving..." : "Continue"}
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Your API key</h2>
              <p className="text-sm text-muted-foreground mt-1">Use this to authenticate SDK calls</p>
            </div>
            <div className="flex items-center gap-2">
              <Input readOnly value={apiKey} className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={copyKey}>
                {keyCopied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-md bg-warning/10 border border-warning/20">
              <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">Store this securely — we won't show it again</p>
            </div>
            <Button onClick={() => setStep(3)} className="w-full">Continue</Button>
          </div>
        )}

        {step === 3 && (
          <div className="rounded-lg border border-border bg-card p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Install the SDK</h2>
              <p className="text-sm text-muted-foreground mt-1">Add one line to start monitoring</p>
            </div>
            <div className="flex gap-1">
              {(["javascript", "python"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setSdkTab(t)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    sdkTab === t
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface-1 text-muted-foreground hover:text-foreground border border-border"
                  }`}
                >
                  {t === "javascript" ? "JavaScript" : "Python"}
                </button>
              ))}
            </div>
            <CodeBlock code={sdkTab === "javascript" ? jsSnippet : pySnippet} />
            <Button onClick={() => navigate("/")} className="w-full">
              Done — open my dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
