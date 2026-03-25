import { useState } from "react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Activity, AlertTriangle, Terminal, Zap, Settings, Command, BookOpen, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const pages = [
  { name: "Overview", path: "/", icon: Activity },
  { name: "Issues", path: "/issues", icon: AlertTriangle },
  { name: "Runs", path: "/runs", icon: Terminal },
  { name: "Sessions", path: "/sessions", icon: Command },
  { name: "Analyzer", path: "/analyzer", icon: Zap },
  { name: "Project Settings", path: "/settings", icon: Settings },
  { name: "Docs", path: "/docs", icon: BookOpen },
];

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);

  const toggleArea = (path: string) => {
    setSelectedAreas((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  const handleSelect = (path: string) => {
    navigate(path);
    onOpenChange(false);
    setSelectedAreas([]);
  };

  const filteredPages =
    selectedAreas.length > 0
      ? pages.filter((p) => selectedAreas.includes(p.path))
      : pages;

  return (
    <CommandDialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setSelectedAreas([]); }}>
      <CommandInput placeholder="Search pages..." />

      {/* Area filter chips */}
      <div className="flex flex-wrap gap-1.5 px-3 py-2 border-b border-border">
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest mr-1 self-center">Scope:</span>
        {pages.map((page) => (
          <button
            key={page.path}
            onClick={() => toggleArea(page.path)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border transition-colors ${
              selectedAreas.includes(page.path)
                ? "bg-primary/15 border-primary/30 text-primary"
                : "bg-surface-1 border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {selectedAreas.includes(page.path) && <Check className="h-2.5 w-2.5" />}
            {page.name}
          </button>
        ))}
      </div>

      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading={selectedAreas.length > 0 ? `Results in ${selectedAreas.length} area(s)` : "Pages"}>
          {filteredPages.map((page) => (
            <CommandItem
              key={page.path}
              onSelect={() => handleSelect(page.path)}
              className="flex items-center gap-2"
            >
              <page.icon className="h-4 w-4 text-muted-foreground" />
              <span>{page.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
