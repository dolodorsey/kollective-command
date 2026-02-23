import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { DATA_SOURCES, AI_AGENTS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Database, Bot, Key } from "lucide-react";

const Settings = () => {
  const { data: config = [] } = useQuery({
    queryKey: ["config"],
    queryFn: async () => {
      const { data } = await supabase.from("mcp_core_config").select("config_key, config_value").limit(50);
      return data || [];
    },
  });

  const { data: dataSources = [] } = useQuery({
    queryKey: ["data-sources"],
    queryFn: async () => {
      const { data } = await supabase.from("data_sources").select("*").order("source_name");
      return data || [];
    },
  });

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">Settings & Data Sources</h1>

      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4"><Database className="h-5 w-5" /> Google Sheet Sources</h2>
        <p className="text-sm text-muted-foreground mb-3">Click any link to open the source spreadsheet. If a link is wrong, update it here.</p>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3 font-medium">Source Name</th>
                <th className="text-left p-3 font-medium">Link</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(DATA_SOURCES).map(([name, url]) => (
                <tr key={name} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{name}</td>
                  <td className="p-3">
                    <a href={url as string} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1 text-xs">
                      Open in Google Sheets <ExternalLink className="h-3 w-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4"><Bot className="h-5 w-5" /> AI Agents</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {AI_AGENTS.map(agent => (
            <div key={agent.name} className="border rounded-lg p-4 bg-white">
              <div className="font-semibold">{agent.name}</div>
              <div className="text-xs text-muted-foreground">{agent.role} — {agent.brand}</div>
              {agent.email && <div className="text-xs text-blue-600 mt-1">{agent.email}</div>}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4"><Key className="h-5 w-5" /> System Config</h2>
        <div className="text-xs text-muted-foreground mb-2">{config.length} config entries stored</div>
        <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b sticky top-0">
              <tr>
                <th className="text-left p-3 font-medium">Key</th>
                <th className="text-left p-3 font-medium">Preview</th>
              </tr>
            </thead>
            <tbody>
              {config.map((c: any) => (
                <tr key={c.config_key} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-mono text-xs">{c.config_key}</td>
                  <td className="p-3 text-xs text-muted-foreground truncate max-w-[400px]">
                    {typeof c.config_value === 'string' ? c.config_value.substring(0, 80) : JSON.stringify(c.config_value).substring(0, 80)}...
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Settings;
