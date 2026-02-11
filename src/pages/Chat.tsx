import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { sendCommand } from "@/lib/commands";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import {
  MessageSquare, Bot, Brain, Cpu, User,
  Plus, Calendar, BookMarked, Share2, Send,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "notes", label: "You", icon: User, color: "text-primary" },
  { key: "chatgpt", label: "ChatGPT", icon: Bot, color: "text-status-success" },
  { key: "gemini", label: "Gemini", icon: Brain, color: "text-status-info" },
  { key: "clawbot", label: "Clawbot", icon: Cpu, color: "text-status-purple" },
] as const;

interface Message {
  role: "user" | "assistant";
  text: string;
  time: string;
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
  const [messages, setMessages] = useState<Record<string, Message[]>>({
    notes: [],
    chatgpt: [],
    gemini: [],
    clawbot: [
      { role: "user", text: "Generate 5 IG captions for the Espresso DC event on April 17", time: new Date().toISOString() },
      { role: "assistant", text: "Here are 5 captions for the April 17 Espresso event in DC:\n\n1. DC, the espresso is calling. April 17.\n2. One night. One city. No sleep required.\n3. Espresso hits different in the District.\n4. Your invite just got served.\n5. April 17 — the only date that matters.", time: new Date().toISOString() },
    ],
  });
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, tab]);

  const handleSend = () => {
    if (!input.trim()) return;
    const msg: Message = { role: "user", text: input.trim(), time: new Date().toISOString() };
    setMessages(prev => ({
      ...prev,
      [tab]: [...(prev[tab] || []), msg],
    }));
    setInput("");
  };

  const handleAction = async (action: string, text: string) => {
    if (action === "Convert to Job") {
      await sendCommand("chat.convert_to_job", { source: tab, text: text.slice(0, 200) });
    } else if (action === "Schedule") {
      await sendCommand("chat.schedule", { source: tab, text: text.slice(0, 200) });
    } else if (action === "Save Template") {
      await sendCommand("chat.save_template", { source: tab, text: text.slice(0, 200) });
    } else if (action === "Send to Social") {
      await sendCommand("chat.send_social", { source: tab, text: text.slice(0, 200) });
    }
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
        {/* Messages */}
        <div className="flex-1 overflow-auto p-5">
          <div className="flex flex-col gap-4">
            {currentMessages.length === 0 && (
              <div className="flex flex-1 items-center justify-center py-20">
                <div className="text-center">
                  <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/20" />
                  <p className="mt-3 text-sm text-muted-foreground/40">
                    {tab === "notes" ? "Your private notes and intentions" : `Start a conversation with ${TABS.find(t => t.key === tab)?.label}`}
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
                {msg.role === "assistant" && (
                  <div className="mt-1 flex gap-1.5">
                    {ACTION_BUTTONS.map(a => {
                      const AIcon = a.icon;
                      return (
                        <button
                          key={a.label}
                          onClick={() => handleAction(a.label, msg.text)}
                          className={cn(
                            "flex items-center gap-1 rounded px-2 py-1 text-[10px] font-semibold transition-all",
                            `bg-${a.color}/10 text-${a.color} border border-${a.color}/20 hover:bg-${a.color}/20`
                          )}
                          style={{
                            backgroundColor: `hsl(var(--${a.color}) / 0.08)`,
                            color: `hsl(var(--${a.color}))`,
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
              className="flex-1 rounded-md border border-border/50 bg-input px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/40 focus:border-primary/40"
            />
            <Button onClick={handleSend} size="sm" className="px-4">
              <Send className="mr-1.5 h-3.5 w-3.5" />
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
