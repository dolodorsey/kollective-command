const N8N_BASE = 'https://drdorsey.app.n8n.cloud';

export const AI_ENDPOINTS = {
  claude: `${N8N_BASE}/webhook/ai-chat-claude`,
  chatgpt: `${N8N_BASE}/webhook/ai-chat-chatgpt`,
  gemini: `${N8N_BASE}/webhook/ai-chat-gemini`,
  meta: `${N8N_BASE}/webhook/meta-social`,
} as const;

export type AIProvider = keyof typeof AI_ENDPOINTS;

export interface AIResponse {
  success: boolean;
  provider: string;
  response: string;
  model: string;
}

export async function sendAIMessage(
  provider: AIProvider,
  message: string,
  system?: string
): Promise<AIResponse> {
  const endpoint = AI_ENDPOINTS[provider];
  if (!endpoint) throw new Error(`Unknown provider: ${provider}`);

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, system }),
    });

    if (!res.ok) {
      return {
        success: false,
        provider,
        response: `API returned ${res.status}. Check billing/credentials.`,
        model: 'error',
      };
    }

    const data = await res.json();
    return data as AIResponse;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error';
    return {
      success: false,
      provider,
      response: `Connection failed: ${msg}`,
      model: 'error',
    };
  }
}

export async function sendMetaAction(action: string, params: Record<string, unknown> = {}) {
  const res = await fetch(AI_ENDPOINTS.meta, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...params }),
  });
  return res.json();
}
