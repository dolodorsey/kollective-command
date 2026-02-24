import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { DIVISIONS, BRAND_EMAILS, AI_AGENTS, DATA_SOURCES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, Bot, Database, Settings2, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const Settings = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState("agents");

  const { data: config = [] } = useQuery({
    queryKey: ["mcp-config"],
    queryFn: async () => {
      try {
        const { data } = await supabase.from("mcp_core_config").select("*").order("config_key");
        return data || [];
      } catch { return []; }
    },
  });

  const authorityColor = (a: string) => {
    if (a === 'top') return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (a === 'high') return 'bg-blue-100 text-blue-800 border-blue-200';
    if (a === 'standard') return 'bg-gray-100 text-gray-700 border-gray-200';
    return 'bg-gray-50 text-gray-500 border-gray-200';
  };

  const emailsByDiv = DIVISIONS.map(d => ({
    ...d,
    accounts: Object.entries(BRAND_EMAILS).filter(([, v]) => v.division === d.key && v.email),
  })).filter(d => d.accounts.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="h-8 w-8 p-0"><ChevronLeft className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="agents"><Bot className="h-3 w-3 mr-1" /> AI Agents ({AI_AGENTS.length})</TabsTrigger>
          <TabsTrigger value="accounts"><Mail className="h-3 w-3 mr-1" /> Accounts ({Object.keys(BRAND_EMAILS).length})</TabsTrigger>
          <TabsTrigger value="sources"><Database className="h-3 w-3 mr-1" /> Data Sources</TabsTrigger>
          <TabsTrigger value="config"><Settings2 className="h-3 w-3 mr-1" /> System Config</TabsTrigger>
        </TabsList>

        <TabsContent value="agents" className="mt-4">
          <div className="space-y-3">
            {AI_AGENTS.map((agent, i) => (
              <div key={i} className="p-4 bg-white border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold">{agent.name[0]}</div>
                    <div>
                      <div className="font-semibold text-sm">{agent.name}</div>
                      <div className="text-xs text-muted-foreground">{agent.role} — {agent.brand}</div>
                    </div>
                  </div>
                  <Badge className={authorityColor(agent.authority)}>{agent.authority}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{agent.owns}</p>
                {agent.email && <p className="text-xs font-mono text-blue-600 mt-1">{agent.email}</p>}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="accounts" className="mt-4">
          <div className="space-y-6">
            {emailsByDiv.map(d => (
              <div key={d.key}>
                <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <span>{d.icon}</span> {d.name}
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody>
                      {d.accounts.map(([name, info]) => (
                        <tr key={name} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="p-2 font-medium w-1/3">{name}</td>
                          <td className="p-2 font-mono text-xs text-blue-600">{info.email}</td>
                          <td className="p-2 font-mono text-xs text-purple-600">{info.ig ? `@${info.ig}` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sources" className="mt-4">
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b"><tr>
                <th className="text-left p-3 font-medium">Source</th>
                <th className="text-left p-3 font-medium">Link</th>
              </tr></thead>
              <tbody>
                {Object.entries(DATA_SOURCES).map(([name, url]) => (
                  <tr key={name} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{name}</td>
                    <td className="p-3"><a href={url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs font-mono truncate block max-w-md">{url}</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="config" className="mt-4">
          {config.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">No system config entries found.</p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b"><tr>
                  <th className="text-left p-3 font-medium">Key</th>
                  <th className="text-left p-3 font-medium">Value</th>
                </tr></thead>
                <tbody>
                  {config.map((c: any) => (
                    <tr key={c.id || c.config_key} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-mono text-xs">{c.config_key || '—'}</td>
                      <td className="p-3 text-xs max-w-md truncate">
                        {(() => {
                          try {
                            const val = c.config_value;
                            if (val === null || val === undefined) return '—';
                            if (typeof val === 'string') return val;
                            return JSON.stringify(val).slice(0, 200);
                          } catch { return '—'; }
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
