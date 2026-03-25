import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CodeBlock } from "@/components/CodeBlock";
import { toast } from "sonner";
import { Copy, Check, Key, Eye, EyeOff, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function SettingsPage() {
  const { profile, refreshProfile, user } = useAuth();
  const [projectName, setProjectName] = useState(profile?.project_name ?? "");
  const [saving, setSaving] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const [keyRevealed, setKeyRevealed] = useState(false);
  const [sdkTab, setSdkTab] = useState<"javascript" | "python" | "curl">("javascript");
  const [deleting, setDeleting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const apiKey = profile?.api_key ?? "";

  const saveProject = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ project_name: projectName.trim() })
      .eq("id", profile?.id);
    setSaving(false);
    if (error) toast.error("Failed to save");
    else {
      toast.success("Project name saved");
      refreshProfile();
    }
  };

  const copyKey = () => {
    navigator.clipboard.writeText(apiKey);
    setKeyCopied(true);
    toast.success("API key copied");
    setTimeout(() => setKeyCopied(false), 2000);
  };

  const regenerateKey = async () => {
    setRegenerating(true);
    const newKey = crypto.randomUUID();
    const { error } = await supabase
      .from("profiles")
      .update({ api_key: newKey })
      .eq("id", profile?.id);
    setRegenerating(false);
    if (error) toast.error("Failed to regenerate key");
    else {
      toast.success("API key regenerated");
      refreshProfile();
      setKeyRevealed(true);
    }
  };

  const deleteAllRuns = async () => {
    setDeleting(true);
    const { error } = await supabase
      .from("runs")
      .delete()
      .eq("user_id", user?.id);
    setDeleting(false);
    if (error) toast.error("Failed to delete runs");
    else toast.success("All runs deleted");
  };

  const maskedKey = `${"•".repeat(Math.max(0, apiKey.length - 8))}${apiKey.slice(-8)}`;

  const jsSnippet = `import { trackAI } from '@khojo/sdk'

const client = trackAI({ apiKey: '${apiKey}' })

await client.track({
  input: userMessage,
  output: aiResponse,
  context: retrievedDocs,
  prompt: systemPrompt,
  model: 'gpt-4o',
  sessionId: conversationId
})`;

  const pySnippet = `from khojo import track_ai

client = track_ai(api_key="${apiKey}")

client.track(
  input=user_message,
  output=ai_response,
  context=retrieved_docs,
  prompt=system_prompt,
  model="gpt-4o",
  session_id=conversation_id
)`;

  const curlSnippet = `curl -X POST https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/ingest \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "input": "What is the refund policy?",
    "output": "Refunds within 30 days...",
    "context": "Policy: 14 day refund window",
    "model": "gpt-4o"
  }'`;

  return (
    <div className="p-6 max-w-3xl mx-auto animate-fade-in space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Project configuration and SDK setup</p>
      </div>

      {/* Project */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h3 className="text-sm font-medium text-foreground">Project</h3>
        <div className="flex items-center gap-2">
          <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="My AI App" className="flex-1" />
          <Button onClick={saveProject} disabled={saving} size="sm">{saving ? "Saving..." : "Save"}</Button>
        </div>
      </div>

      {/* API Key */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Key className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">API Key</h3>
        </div>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-surface-1 rounded-md px-3 py-2 text-sm font-mono text-muted-foreground border border-border truncate">
            {keyRevealed ? apiKey : maskedKey}
          </code>
          <Button variant="outline" size="icon" onClick={() => setKeyRevealed(!keyRevealed)}>
            {keyRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="icon" onClick={copyKey}>
            {keyCopied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs">Regenerate key</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Regenerate API key?</AlertDialogTitle>
              <AlertDialogDescription>
                This will invalidate your current key. Any apps using the old key will stop sending data. Continue?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={regenerateKey} disabled={regenerating}>
                {regenerating ? "Regenerating..." : "Regenerate"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* SDK Setup */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        <div>
          <h3 className="text-sm font-medium text-foreground">SDK Integration</h3>
          <p className="text-xs text-muted-foreground mt-1">Add tracking to your AI calls</p>
        </div>
        <div className="flex gap-1">
          {(["javascript", "python", "curl"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setSdkTab(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                sdkTab === t ? "bg-primary text-primary-foreground" : "bg-surface-1 text-muted-foreground hover:text-foreground border border-border"
              }`}
            >
              {t === "javascript" ? "JavaScript" : t === "python" ? "Python" : "cURL"}
            </button>
          ))}
        </div>
        <CodeBlock code={sdkTab === "javascript" ? jsSnippet : sdkTab === "python" ? pySnippet : curlSnippet} />
      </div>

      {/* Danger zone */}
      <div className="rounded-lg border border-critical/30 bg-critical/5 p-4 space-y-3">
        <h3 className="text-sm font-medium text-critical">Danger zone</h3>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="h-4 w-4" /> Delete all runs
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete all runs?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete all your run data. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={deleteAllRuns} disabled={deleting} className="bg-destructive text-destructive-foreground">
                {deleting ? "Deleting..." : "Delete all"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
