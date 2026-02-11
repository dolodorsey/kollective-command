import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Key, Check, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const N8N_BASE = "https://drdorsey.app.n8n.cloud";

interface KeyConfig {
  provider: string;
  label: string;
  prefix: string;
  placeholder: string;
  docUrl: string;
}

const KEYS: KeyConfig[] = [
  { provider: "claude", label: "Claude (Anthropic)", prefix: "sk-ant-", placeholder: "sk-ant-api03-...", docUrl: "https://console.anthropic.com/settings/keys" },
  { provider: "chatgpt", label: "ChatGPT (OpenAI)", prefix: "sk-", placeholder: "sk-proj-...", docUrl: "https://platform.openai.com/api-keys" },
  { provider: "gemini", label: "Gemini (Google)", prefix: "AIza", placeholder: "AIzaSy...", docUrl: "https://aistudio.google.com/apikey" },
];

const OAUTH_SERVICES = [
  { name: "Gmail", status: "connected", note: "OAuth configured in n8n", icon: "📧" },
  { name: "Google Sheets", status: "connected", note: "OAuth configured in n8n", icon: "📊" },
  { name: "Google Drive", status: "connected", note: "OAuth configured in n8n", icon: "📁" },
  { name: "Instagram", status: "not_connected", note: "Requires Meta Business OAuth in n8n", icon: "📸" },
  { name: "TikTok", status: "not_connected", note: "Requires TikTok Business OAuth in n8n", icon: "🎵" },
  { name: "X / Twitter", status: "not_connected", note: "Requires X API v2 OAuth in n8n", icon: "🐦" },
  { name: "Facebook", status: "not_connected", note: "Requires Meta Business OAuth in n8n", icon: "👤" },
];

const Settings = () => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  const handleSave = async (provider: string) => {
    const key = values[provider];
    if (!key?.trim()) return;

    setSaving(prev => ({ ...prev, [provider]: true }));
    try {
      const res = await fetch(`${N8N_BASE}/webhook/update-api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, api_key: key.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSaved(prev => ({ ...prev, [provider]: true }));
          setValues(prev => ({ ...prev, [provider]: "" }));
          toast.success(`${provider} key updated`);
          setTimeout(() => setSaved(prev => ({ ...prev, [provider]: false })), 3000);
        } else {
          toast.error(data.error || "Failed to save");
        }
      } else {
        toast.error("Failed to reach key manager");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(prev => ({ ...prev, [provider]: false }));
    }
  };

  return (
    <div className="max-w-3xl space-y-8 animate-fade-in">
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>

      {/* API Keys */}
      <div className="rounded-lg border border-border/50 bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Key className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">AI API Keys</h2>
        </div>
        <p className="mb-6 text-xs text-muted-foreground">
          Keys are stored securely in Supabase and used by n8n workflows. Paste new keys here when they expire.
        </p>
        <div className="space-y-4">
          {KEYS.map(k => (
            <div key={k.provider} className="flex items-center gap-3">
              <div className="w-40 shrink-0">
                <p className="text-sm font-medium text-foreground">{k.label}</p>
                <a href={k.docUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-primary/60 hover:text-primary">
                  Get key <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
              <input
                type="password"
                value={values[k.provider] || ""}
                onChange={e => setValues(prev => ({ ...prev, [k.provider]: e.target.value }))}
                placeholder={k.placeholder}
                className="flex-1 rounded-md border border-border/50 bg-input px-3 py-2 font-mono text-xs text-foreground outline-none placeholder:text-muted-foreground/30 focus:border-primary/40"
              />
              <Button
                size="sm"
                onClick={() => handleSave(k.provider)}
                disabled={!values[k.provider]?.trim() || saving[k.provider]}
                className="w-20"
              >
                {saving[k.provider] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> 
                  : saved[k.provider] ? <Check className="h-3.5 w-3.5" />
                  : "Save"}
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Platform Connections */}
      <div className="rounded-lg border border-border/50 bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">Platform Connections</h2>
        <p className="mb-6 text-xs text-muted-foreground">
          OAuth connections are managed in n8n. Open n8n to authorize new platforms.
        </p>
        <div className="space-y-3">
          {OAUTH_SERVICES.map(s => (
            <div key={s.name} className="flex items-center gap-3 rounded-md border border-border/30 bg-secondary/30 p-3">
              <span className="text-lg">{s.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{s.name}</p>
                <p className="text-[10px] text-muted-foreground">{s.note}</p>
              </div>
              <StatusBadge variant={s.status === "connected" ? "success" : "default"}>
                {s.status === "connected" ? "Connected" : "Not Connected"}
              </StatusBadge>
              {s.status !== "connected" && (
                <a href="https://drdorsey.app.n8n.cloud" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="text-xs">
                    Open n8n <ExternalLink className="ml-1 h-3 w-3" />
                  </Button>
                </a>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="rounded-lg border border-border/50 bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">Quick Links</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "n8n Dashboard", url: "https://drdorsey.app.n8n.cloud", desc: "Workflow automation" },
            { label: "Supabase", url: "https://supabase.com/dashboard/project/dzlmtvodpyhetvektfuo", desc: "Database & API" },
            { label: "GitHub Repo", url: "https://github.com/dolodorsey/kollective-command", desc: "Source code" },
            { label: "Lovable", url: "https://lovable.dev/projects/2899d633-c73f-43a0-b0db-b1a03be0886c", desc: "Frontend builder" },
          ].map(link => (
            <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-md border border-border/50 bg-secondary/30 p-3 transition-colors hover:border-primary/30">
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{link.label}</p>
                <p className="text-[10px] text-muted-foreground">{link.desc}</p>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Settings;
