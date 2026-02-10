import { supabase } from './supabase';
import { toast } from 'sonner';

export interface Command {
  command_type: string;
  scope: string;
  payload: Record<string, unknown>;
  requested_by: string;
  idempotency_key: string;
  risk_level: string;
  status: string;
  created_at: string;
}

export async function sendCommand(
  type: string,
  payload: Record<string, unknown> = {},
  riskLevel: string = 'low'
): Promise<Command> {
  const cmd: Command = {
    command_type: type,
    scope: (payload.scope as string) || 'global',
    payload,
    requested_by: 'dr.dorsey',
    idempotency_key: `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    risk_level: riskLevel,
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  try {
    const { error } = await supabase.from('command_log').insert(cmd);
    if (error) throw error;

    fetch('https://drdorsey.app.n8n.cloud/webhook/command-authority', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cmd),
    }).catch(() => {});

    toast.success(`Command sent: ${type}`, { duration: 3500 });
    return cmd;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    toast.error(`Failed: ${message}`, { duration: 3500 });
    throw err;
  }
}
