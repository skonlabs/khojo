import { cn } from "@/lib/utils";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import React from "react";

interface CodeBlockProps {
  code: string;
  className?: string;
  showCopy?: boolean;
}

export const CodeBlock = React.forwardRef<HTMLDivElement, CodeBlockProps>(
  ({ code, className, showCopy = true }, ref) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
      navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    };

    return (
      <div ref={ref} className={cn("relative group rounded-md bg-surface-1 border border-border", className)}>
        {showCopy && (
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 p-1.5 rounded-md bg-surface-2 border border-border opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
          >
            {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
          </button>
        )}
        <pre className="p-3 text-xs font-mono overflow-x-auto text-foreground leading-relaxed whitespace-pre-wrap">
          {code.split('\n').map((line, i) => {
            const isAdd = line.startsWith('+');
            const isRemove = line.startsWith('-');
            return (
              <div
                key={i}
                className={cn(
                  "px-1 -mx-1 rounded-sm",
                  isAdd && "bg-primary/10 text-primary",
                  isRemove && "bg-destructive/10 text-destructive"
                )}
              >
                {line}
              </div>
            );
          })}
        </pre>
      </div>
    );
  }
);

CodeBlock.displayName = "CodeBlock";
