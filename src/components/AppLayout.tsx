import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { CommandPalette } from "@/components/CommandPalette";
import { useState, useEffect } from "react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCmdOpen(prev => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center justify-between border-b border-border px-4 shrink-0">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            </div>
            <button
              onClick={() => setCmdOpen(true)}
              className="flex items-center gap-2 text-xs text-muted-foreground bg-surface-1 hover:bg-surface-2 rounded-md px-3 py-1.5 border border-border transition-colors"
            >
              <span>Search</span>
              <kbd className="font-mono text-[10px] bg-surface-2 rounded px-1.5 py-0.5 border border-border">⌘K</kbd>
            </button>
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </SidebarProvider>
  );
}
