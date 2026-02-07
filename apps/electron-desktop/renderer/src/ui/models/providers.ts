export type ModelProvider = "anthropic" | "google" | "openai" | "openrouter" | "zai" | "minimax";

export type ModelProviderInfo = {
  id: ModelProvider;
  name: string;
  description: string;
  recommended?: boolean;
  placeholder: string;
  helpUrl?: string;
  helpText?: string;
};

export const PROVIDER_ICONS: Record<ModelProvider, string> = {
  anthropic: "anthropic.svg",
  // Note: filename kept as-is to match assets folder.
  openai: "opeanai.svg",
  google: "gemini.svg",
  minimax: "minimax.svg",
  zai: "zai.svg",
  openrouter: "openrouter.svg",
};

export function resolveProviderIconUrl(provider: ModelProvider): string {
  // Resolve relative to renderer's index.html (renderer/dist/index.html -> ../../assets/)
  return new URL(
    `../../assets/ai-providers/${PROVIDER_ICONS[provider]}`,
    document.baseURI
  ).toString();
}

export const MODEL_PROVIDERS: ModelProviderInfo[] = [
  {
    id: "anthropic",
    name: "Anthropic (Claude)",
    description:
      "Claude models with excellent reasoning, coding, and instruction-following capabilities.",
    recommended: true,
    placeholder: "sk-ant-...",
    helpUrl: "https://console.anthropic.com/settings/keys",
    helpText: "Get your API key from the Anthropic Console.",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    description: "Access to 200+ models from multiple providers through a single API.",
    recommended: true,
    placeholder: "sk-or-...",
    helpUrl: "https://openrouter.ai/keys",
    helpText: "Get your API key from OpenRouter.",
  },
  {
    id: "google",
    name: "Google (Gemini)",
    description: "Gemini models with strong multimodal understanding and large context windows.",
    placeholder: "AIza...",
    helpUrl: "https://aistudio.google.com/apikey",
    helpText: "Get your API key from Google AI Studio.",
  },
  {
    id: "openai",
    name: "OpenAI (GPT)",
    description: "GPT models with broad capabilities and extensive tool use support.",
    placeholder: "sk-...",
    helpUrl: "https://platform.openai.com/api-keys",
    helpText: "Get your API key from the OpenAI Platform.",
  },
  {
    id: "zai",
    name: "Z.ai (GLM)",
    description: "Budget-friendly models built for efficient, scalable AI workloads.",
    placeholder: "sk-...",
    helpUrl: "https://z.ai/manage-apikey/apikey-list",
    helpText: "Get your API key from the Z.AI Platform.",
  },
  {
    id: "minimax",
    name: "MiniMax",
    description: "Models designed for strong conversational AI and creative generation.",
    placeholder: "sk-...",
    helpUrl: "https://platform.minimax.io/user-center/basic-information/interface-key",
    helpText: "Get your API key from the MiniMax Platform.",
  },
];

export const MODEL_PROVIDER_BY_ID: Record<ModelProvider, ModelProviderInfo> = {
  anthropic: MODEL_PROVIDERS.find((p) => p.id === "anthropic")!,
  openrouter: MODEL_PROVIDERS.find((p) => p.id === "openrouter")!,
  google: MODEL_PROVIDERS.find((p) => p.id === "google")!,
  openai: MODEL_PROVIDERS.find((p) => p.id === "openai")!,
  zai: MODEL_PROVIDERS.find((p) => p.id === "zai")!,
  minimax: MODEL_PROVIDERS.find((p) => p.id === "minimax")!,
};
