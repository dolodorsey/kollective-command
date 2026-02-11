import { useState, useEffect, useRef } from "react";
import { Search, Play, Calendar, MessageSquare, Radio } from "lucide-react";
import { sendCommand } from "@/lib/commands";
import { cn } from "@/lib/utils";

const MODES = [
  { key: "run", label: "Run", icon: Play, color: "text-status-success" },
  { key: "schedule", label: "Schedule", icon: Calendar, color: "text-status-warning" },
  { key: "ask", label: "Ask", icon: MessageSquare, color: "text-status-info" },
  { key: "broadcast", label: "Broadcast", icon: Radio, color: "text-status-purple" },
] as const;

interface CommandBarProps {
  onNavigate?: (page: string) => void;
}

export function CommandBar({ onNavigate }: CommandBarProps) {
  const [mode, setMode] = useState<string>("run");
  const [input, setInput] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setFocused(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") {
        setFocused(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleSubmit = async () => {
    if (!input.trim()) return;
    if (mode === "run") {
      await sendCommand(input.trim(), {}, "low");
    } else if (mode === "ask" && onNavigate) {
      onNavigate("/chat");
    }
    setInput("");
  };

  return (
    <div className={cn(
      "flex items-center gap-2 rounded-lg border px-3 py-2 transition-all duration-200",
      focused ? "border-primary/40 shadow-gold-glow bg-input" : "border-border/50 bg-input/50"
    )}>
      <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
      <input
        ref={inputRef}
        value={input}
        onChange={e => setInput(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        onKeyDown={e => e.key === "Enter" && handleSubmit()}
        placeholder="Run command..."
        className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/40"
      />
      <div className="flex gap-1">
        {MODES.map(m => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            className={cn(
              "rounded px-2 py-1 text-[10px] font-semibold transition-all",
              mode === m.key
                ? `${m.color} bg-current/10 border border-current/20`
                : "text-muted-foreground/40 hover:text-muted-foreground"
            )}
            style={mode === m.key ? { backgroundColor: `hsl(var(--status-${m.key === 'run' ? 'success' : m.key === 'schedule' ? 'warning' : m.key === 'ask' ? 'info' : 'purple'}) / 0.1)` } : {}}
          >
            {m.label}
          </button>
        ))}
      </div>
      <span className="rounded border border-border/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground/40">⌘K</span>
    </div>
  );
}
