import { useState } from "react";
import { useAuth, Project } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Plus, Pencil, Trash2, Radio } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function ProjectSwitcher() {
  const { user, projects, activeProject, setActiveProjectId, refreshProjects } = useAuth();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);

  const handleCreate = async () => {
    if (!newName.trim() || !user) return;
    const { error } = await supabase.from("projects").insert({
      user_id: user.id,
      name: newName.trim(),
    } as any);
    if (error) toast.error("Failed to create project");
    else {
      toast.success("Project created");
      setNewName("");
      setCreating(false);
      await refreshProjects();
    }
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    const { error } = await supabase.from("projects").update({ name: editName.trim() } as any).eq("id", id);
    if (error) toast.error("Failed to rename");
    else {
      toast.success("Renamed");
      setEditingId(null);
      await refreshProjects();
    }
  };

  const handleDelete = async () => {
    if (!deleteProject) return;
    const { error } = await supabase.from("projects").delete().eq("id", deleteProject.id);
    if (error) toast.error("Failed to delete project");
    else {
      toast.success("Project deleted");
      setDeleteProject(null);
      await refreshProjects();
    }
  };

  if (!activeProject) return null;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent transition-colors text-left">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground truncate">{activeProject.name}</div>
              <div className="flex items-center gap-1 mt-0.5">
                {activeProject.monitoring_enabled ? (
                  <span className="flex items-center gap-1 text-[10px] text-success"><Radio className="h-2.5 w-2.5" /> Live</span>
                ) : (
                  <span className="text-[10px] text-muted-foreground">Paused</span>
                )}
              </div>
            </div>
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <div className="space-y-1">
            {projects.map((p) => (
              <div key={p.id} className="flex items-center gap-1">
                {editingId === p.id ? (
                  <div className="flex-1 flex gap-1">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-7 text-xs"
                      onKeyDown={(e) => e.key === "Enter" && handleRename(p.id)}
                      autoFocus
                    />
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleRename(p.id)}>
                      <Check className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => { setActiveProjectId(p.id); setOpen(false); }}
                      className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors text-left ${
                        p.id === activeProject.id ? "bg-accent text-accent-foreground" : "hover:bg-accent/50 text-foreground"
                      }`}
                    >
                      <span className="truncate flex-1">{p.name}</span>
                      {p.monitoring_enabled ? (
                        <Radio className="h-3 w-3 text-success shrink-0" />
                      ) : (
                        <span className="text-[10px] text-muted-foreground shrink-0">off</span>
                      )}
                    </button>
                    <button
                      onClick={() => { setEditingId(p.id); setEditName(p.name); }}
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    {projects.length > 1 && (
                      <button
                        onClick={() => setDeleteProject(p)}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="border-t border-border mt-2 pt-2">
            {creating ? (
              <div className="flex gap-1">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Project name"
                  className="h-7 text-xs"
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  autoFocus
                />
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleCreate}>
                  <Check className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> New project
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <AlertDialog open={!!deleteProject} onOpenChange={(v) => !v && setDeleteProject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteProject?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this project and all its runs. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
