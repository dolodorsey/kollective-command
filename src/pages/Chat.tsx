import { useState, useRef, useEffect } from "react";
import { sendAIMessage, type AIProvider } from "@/lib/api";
import { sendCommand } from "@/lib/commands";
import { Button } from "@/components/ui/button";
import {
  MessageSquare, Bot, Brain, Cpu, User,
  Plus, Calendar, BookMarked, Share2, Send,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const TABS = [
  { key: "notes" as const, label: "You", icon: User, color: "text-primary", provider: null },
  { key: "chatgpt" as const, label: "ChatGPT", icon: Bot, color: "text-status-success", provider: "chatgpt" as AIProvider },
  { key: "gemini" as const, label: "Gemini", icon: Brain, color: "text-status-info", provider: "gemini" as AIProvider },
  { key: "clawbot" as const, label: "Clawbot", icon: Cpu, color: "text-status-purple", provider: "claude" as AIProvider },
];

interface Message {
  role: "user" | "assistant";
  text: string;
  time: string;
  model?: string;
}

const ACTION_BUTTONS = [
  { label: "Convert to Job", icon: Plus, color: "status-success" },
  { label: "Schedule", icon: Calendar, color: "status-warning" },
  { label: "Save Template", icon: BookMarked, color: "status-info" },
  { label: "Send to Social", icon: Share2, color: "status-purple" },
];

const Chat = () => {
  const [tab, setTab] = useState<string>("clawbot");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Record<string, Message[]>>({
    notes: [],
    chatgpt: [],
    gemini: [],
    clawbot: [],
  });
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, tab]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput("");

    const userMsg: Message = { role: "user", text, time: new Date().toISOString() };
    setMessages(prev => ({ ...prev, [tab]: [...(prev[tab] || []), userMsg] }));

    const tabConfig = TABS.find(t => t.key === tab);
    if (!tabConfig?.provider) {
      // Notes tab — just save locally
      return;
    }

    setLoading(true);
    try {
      const system = tab === "clawbot"
        ? "You are Clawbot, the AI execution engine for Kollective Hospitality Group (Dr. Dorsey). You are decisive, structured, and action-oriented. No filler. No motivational fluff. Every response should be executable."
        : "You are an AI assistant for Kollective Hospitality Group. Be concise and action-oriented.";

      const response = await sendAIMessage(tabConfig.provider, text, system);

      const assistantMsg: Message = {
        role: "assistant",
        text: response.response,
        time: new Date().toISOString(),
        model: response.model,
      };
      setMessages(prev => ({ ...prev, [tab]: [...(prev[tab] || []), assistantMsg] }));

      if (!response.success) {
        toast.error(`${tabConfig.label}: ${response.response.slice(0, 100)}`);
      }
    } catch (err) {
      const errMsg: Message = {
        role: "assistant",
        text: "Connection failed. Check n8n workflow status.",
        time: new Date().toISOString(),
      };
      setMessages(prev => ({ ...prev, [tab]: [...(prev[tab] || []), errMsg] }));
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string, text: string) => {
    const cmdMap: Record<string, string> = {
      "Convert to Job": "chat.convert_to_job",
      "Schedule": "chat.schedule",
      "Save Template": "chat.save_template",
      "Send to Social": "chat.send_social",
    };
    await sendCommand(cmdMap[action] || action, { source: tab, text: text.slice(0, 500) });
  };

  const currentMessages = messages[tab] || [];

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col gap-4 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Chat</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border/50 pb-px">
        {TABS.map(t => {
          const TabIcon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-2 rounded-t-md px-4 py-2.5 text-xs font-semibold transition-all",
                active
                  ? `bg-card border border-b-0 border-border/50 ${t.color}`
                  : "text-muted-foreground/50 hover:text-muted-foreground"
              )}
            >
              <TabIcon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Chat Body */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border/50 bg-card">
        <div className="flex-1 overflow-auto p-5">
          <div className="flex flex-col gap-4">
            {currentMessages.length === 0 && (
              <div className="flex flex-1 items-center justify-center py-20">
                <div className="text-center">
                  <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/20" />
                  <p className="mt-3 text-sm text-muted-foreground/40">
                    {tab === "notes" ? "Your private notes and intentions" : `Message ${TABS.find(t => t.key === tab)?.label} — connected via n8n`}
                  </p>
                </div>
              </div>
            )}
            {currentMessages.map((msg, i) => (
              <div key={i} className={cn("flex flex-col gap-1", msg.role === "user" ? "items-end" : "items-start")}>
                <div className={cn(
                  "max-w-[80%] whitespace-pre-wrap rounded-xl px-4 py-3 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "rounded-br-sm bg-primary/10 border border-primary/20 text-foreground"
                    : "rounded-bl-sm bg-secondary border border-border/50 text-foreground"
                )}>
                  {msg.text}
                </div>
                {msg.role === "assistant" && msg.model && (
                  <span className="px-1 text-[9px] text-muted-foreground/30">{msg.model}</span>
                )}
                {msg.role === "assistant" && tab !== "notes" && (
                  <div className="mt-1 flex gap-1.5">
                    {ACTION_BUTTONS.map(a => {
                      const AIcon = a.icon;
                      return (
                        <button
                          key={a.label}
                          onClick={() => handleAction(a.label, msg.text)}
                          className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-semibold transition-all hover:brightness-125"
                          style={{
                            backgroundColor: `hsl(var(--${a.color}) / 0.08)`,
                            color: `hsl(var(--${a.color}))`,
                            borderWidth: 1,
                            borderColor: `hsl(var(--${a.color}) / 0.2)`,
                          }}
                        >
                          <AIcon className="h-3 w-3" />
                          {a.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-start gap-2">
                <div className="rounded-xl rounded-bl-sm border border-border/50 bg-secondary px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-border/50 p-4">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder={`Message ${TABS.find(t => t.key === tab)?.label}...`}
              disabled={loading}
              className="flex-1 rounded-md border border-border/50 bg-input px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-primary/40 disabled:opacity-50"
            />
            <Button onClick={handleSend} size="sm" className="px-4" disabled={loading}>
              {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
