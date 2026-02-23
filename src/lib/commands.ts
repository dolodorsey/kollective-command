import { supabase } from './supabase';
import { toast } from 'sonner';

const N8N_BASE = "https://drdorsey.app.n8n.cloud";

const COMMAND_ROUTES: Record<string, string> = {
  "brand.scrape_leads": "/webhook/scrape-leads",
  "scrape.&.enrich.leads": "/webhook/scrape-leads",
  "scrape_leads": "/webhook/scrape-leads",
};

export interface Command {
  command_type: string;
  scope?: string;
  target_key?: string;
  payload?: Record<string, unknown>;
}

export async function sendCommand(
  command_type: string,
  payload?: Record<string, unknown>,
  scope?: string,
  target_key?: string
) {
  try {
    const webhook = COMMAND_ROUTES[command_type] || "/webhook/execute-command";
    const res = await fetch(`${N8N_BASE}${webhook}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command_type, scope: scope || 'global', target_key, payload }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        toast.success(`Command sent: ${command_type}`);
        return data;
      }
    }
    
    // Fallback: log directly to Supabase
    const { error } = await supabase.from('command_log').insert({
      command_type,
      scope: scope || 'global',
      target_key,
      payload,
      status: 'queued',
      executed_at: new Date().toISOString(),
    });
    
    if (!error) {
      toast.success(`Command queued: ${command_type}`);
    } else {
      toast.error('Failed to send command');
    }
  } catch {
    // Offline fallback
    const { error } = await supabase.from('command_log').insert({
      command_type,
      scope: scope || 'global',
      target_key,
      payload,
      status: 'queued',
      executed_at: new Date().toISOString(),
    });
    if (!error) toast.success(`Command queued: ${command_type}`);
    else toast.error('Command failed');
  }
}

export async function killCommand(commandId: string) {
  await supabase.from('command_log').update({ status: 'killed' }).eq('id', commandId);
  toast.success('Command killed');
}

export async function retryCommand(commandId: string) {
  await supabase.from('command_log').update({ status: 'retrying' }).eq('id', commandId);
  toast.success('Command retrying');
}
