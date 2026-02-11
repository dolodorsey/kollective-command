import { useState, useRef, useEffect } from "react";
import { sendCommand } from "@/lib/commands";
import { sendAIMessage, type AIResponse } from "@/lib/ai";
import { Button } from "@/components/ui/button";
import {
  MessageSquare, Bot, Brain, Cpu, User,
  Plus, Calendar, BookMarked, Share2, Send,
  Loader2, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const TABS = [
  { key: "notes", label: "You", icon: User, color: "text-primary", desc: "Private notes & intent" },
  { key: "chatgpt", label: "ChatGPT", icon: Bot, color: "text-status-success", desc: "OpenAI GPT-4o" },
  { key: "gemini", label: "Gemini", icon: Brain, color: "text-status-info", desc: "Google Gemini 2.0" },
  { key: "clawbot", label: "Clawbot", icon: Cpu, color: "text-status-purple", desc: "Your AI operator" },
] as const;

interface Message {
  role: "user" | "assistant" | "system";
  text: string;
  time: string;
  provider?: string;
  model?: string;
  error?: boolean;
}

const ACTION_BUTTONS = [
  { label: "Convert to Job", icon: Plus, color: "success" },
  { label: "Schedule", icon: Calendar, color: "warning" },
  { label: "Save Template", icon: BookMarked, color: "info" },
  { label: "Send to Social", icon: Share2, color: "purple" },
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
    const userMsg: Message = { role: "user", text: input.trim(), time: new Date().toISOString() };
    
    setMessages(prev => ({ ...prev, [tab]: [...(prev[tab] || []), userMsg] }));
    const currentInput = input.trim();
    setInput("");

    if (tab === "notes") return; // Notes are local only

    setLoading(true);
    try {
      const result = await sendAIMessage(tab, currentInput);
      
      const assistantMsg: Message = {
        role: "assistant",
        text: result.success ? result.response : (result.error || "No response received"),
        time: new Date().toISOString(),
        provider: result.provider,
        model: result.model,
        error: !result.success,
      };
      
      setMessages(prev => ({ ...prev, [tab]: [...(prev[tab] || []), assistantMsg] }));
      
      if (!result.success) {
        toast.error(`${tab} error: ${result.error}`);
      }
    } catch (err) {
      const errMsg: Message = {
        role: "assistant",
        text: "Connection failed. Check n8n workflow status.",
        time: new Date().toISOString(),
        error: true,
      };
      setMessages(prev => ({ ...prev, [tab]: [...(prev[tab] || []), errMsg] }));
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string, text: string) => {
    try {
      await sendCommand(`chat.${action.toLowerCase().replace(/ /g, '_')}`, { 
        source: tab, 
        text: text.slice(0, 500),
        provider: tab,
      });
      toast.success(`${action}: sent to command queue`);
    } catch {
      toast.error(`Failed to ${action.toLowerCase()}`);
    }
  };

  const currentMessages = messages[tab] || [];
  const currentTab = TABS.find(t => t.key === tab);

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col gap-4 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Chat</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border/50 pb-px">
        {TABS.map(t => {
          const TabIcon = t.icon;
          const active = tab === t.key;
          const msgCount = (messages[t.key] || []).length;
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
              {msgCount > 0 && !active && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px]">{msgCount}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Chat Body */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-border/50 bg-card">
        {/* Messages */}
        <div className="flex-1 overflow-auto p-5">
          <div className="flex flex-col gap-4">
            {currentMessages.length === 0 && (
              <div className="flex flex-1 items-center justify-center py-20">
                <div className="text-center">
                  <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/20" />
                  <p className="mt-3 text-sm text-muted-foreground/50">
                    {tab === "notes" ? "Your private notes and intentions — stays local" : `Start a conversation with ${currentTab?.label}`}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/30">{currentTab?.desc}</p>
                </div>
              </div>
            )}
            {currentMessages.map((msg, i) => (
              <div key={i} className={cn("flex flex-col gap-1", msg.role === "user" ? "items-end" : "items-start")}>
                <div className={cn(
                  "max-w-[80%] whitespace-pre-wrap rounded-xl px-4 py-3 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "rounded-br-sm border border-primary/20 bg-primary/10 text-foreground"
                    : msg.error
                    ? "rounded-bl-sm border border-status-error/20 bg-status-error/5 text-foreground"
                    : "rounded-bl-sm border border-border/50 bg-secondary text-foreground"
                )}>
                  {msg.error && <AlertCircle className="mb-1 inline-block h-3.5 w-3.5 text-status-error" />}
                  {msg.text}
                </div>
                {msg.role === "assistant" && !msg.error && (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {ACTION_BUTTONS.map(a => {
                      const AIcon = a.icon;
                      return (
                        <button
                          key={a.label}
                          onClick={() => handleAction(a.label, msg.text)}
                          className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-semibold transition-all hover:opacity-80"
                          style={{
                            backgroundColor: `hsl(var(--status-${a.color}) / 0.08)`,
                            color: `hsl(var(--status-${a.color}))`,
                            border: `1px solid hsl(var(--status-${a.color}) / 0.2)`,
                          }}
                        >
                          <AIcon className="h-3 w-3" />
                          {a.label}
                        </button>
                      );
                    })}
                  </div>
                )}
                {msg.model && !msg.error && (
                  <span className="mt-0.5 text-[9px] text-muted-foreground/30">{msg.model}</span>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-start gap-2">
                <div className="flex items-center gap-2 rounded-xl rounded-bl-sm border border-border/50 bg-secondary px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
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
              placeholder={tab === "notes" ? "Write a note..." : `Message ${currentTab?.label}...`}
              disabled={loading}
              className="flex-1 rounded-md border border-border/50 bg-input px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-primary/40 disabled:opacity-50"
            />
            <Button onClick={handleSend} size="sm" className="px-4" disabled={loading || !input.trim()}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1.5 h-3.5 w-3.5" />}
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
