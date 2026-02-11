const N8N_BASE = "https://drdorsey.app.n8n.cloud";

export interface AIResponse {
  success: boolean;
  provider: string;
  response: string;
  model: string;
  error?: string;
}

const PROVIDER_ENDPOINTS: Record<string, string> = {
  claude: `${N8N_BASE}/webhook/ai-chat-claude`,
  chatgpt: `${N8N_BASE}/webhook/ai-chat-chatgpt`,
  gemini: `${N8N_BASE}/webhook/ai-chat-gemini`,
  clawbot: `${N8N_BASE}/webhook/ai-chat-claude`, // Clawbot uses Claude with custom system prompt
};

const CLAWBOT_SYSTEM = `You are Clawbot, the AI operator for Kollective Hospitality Group — a multi-brand empire spanning food (Casper Group), events (HugLife), services (Umbrella Group), products (Bodegea), art (Opulence Designs), and more. 47 brands total across 8 divisions.

You are decisive, concise, and action-oriented. You think in systems, workflows, and scale. When asked to generate content, you write like a human — not corporate, not robotic. When asked to plan, you think in automation hooks and repeatable processes.

Current context: February 2026. HugLife event season launches April 17 with Espresso in DC. World Cup activations run June-July across Atlanta, Houston, and LA.`;

export async function sendAIMessage(
  provider: string,
  message: string,
  system?: string
): Promise<AIResponse> {
  const endpoint = PROVIDER_ENDPOINTS[provider];
  if (!endpoint) {
    return { success: false, provider, response: '', model: '', error: `Unknown provider: ${provider}` };
  }

  const body: Record<string, string> = { message };
  if (provider === 'clawbot') {
    body.system = system || CLAWBOT_SYSTEM;
  } else if (system) {
    body.system = system;
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return { success: false, provider, response: '', model: '', error: `HTTP ${res.status}` };
    }

    const data = await res.json();
    
    if (data.response === 'Error' || !data.response) {
      return { 
        success: false, provider, response: '', model: data.model || '', 
        error: 'API key expired or invalid. Update keys in n8n.' 
      };
    }

    return {
      success: true,
      provider: data.provider || provider,
      response: data.response,
      model: data.model || 'unknown',
    };
  } catch (err) {
    return { 
      success: false, provider, response: '', model: '',
      error: err instanceof Error ? err.message : 'Network error'
    };
  }
}

export const AI_PROVIDERS = [
  { key: 'clawbot', label: 'Clawbot', description: 'Your AI operator (Claude-powered)' },
  { key: 'chatgpt', label: 'ChatGPT', description: 'OpenAI GPT-4o' },
  { key: 'gemini', label: 'Gemini', description: 'Google Gemini 2.0 Flash' },
  { key: 'claude', label: 'Claude', description: 'Anthropic Claude Sonnet' },
] as const;
