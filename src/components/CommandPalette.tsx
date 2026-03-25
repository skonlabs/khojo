import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Activity, AlertTriangle, Terminal, Zap, Settings, Command } from "lucide-react";
import { useNavigate } from "react-router-dom";

const pages = [
  { name: "Overview", path: "/", icon: Activity },
  { name: "Issues", path: "/issues", icon: AlertTriangle },
  { name: "Runs", path: "/runs", icon: Terminal },
  { name: "Sessions", path: "/sessions", icon: Command },
  { name: "Analyzer", path: "/analyzer", icon: Zap },
  { name: "Project Settings", path: "/settings", icon: Settings },
];

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();

  const handleSelect = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages, runs, issues..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Pages">
          {pages.map((page) => (
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
