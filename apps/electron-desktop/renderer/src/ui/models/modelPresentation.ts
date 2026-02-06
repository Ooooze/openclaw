export type ModelEntry = {
  id: string;
  name: string;
  provider: string;
  contextWindow?: number;
  reasoning?: boolean;
};

export type ModelTier = "ultra" | "pro" | "fast";

// Exact model IDs for each tier - only these specific models get badges
// (except OpenRouter and Google, which can be name/ID matched to handle dynamic IDs).
const MODEL_TIERS: Record<string, Record<ModelTier, string>> = {
  anthropic: {
    ultra: "claude-opus-4-5",
    pro: "claude-sonnet-4-5",
    fast: "claude-haiku-4-5",
  },
  google: {
    ultra: "gemini-2.5-pro",
    pro: "gemini-2.5-flash",
    fast: "gemini-3-flash-preview",
  },
  openai: {
    ultra: "gpt-5.2-pro",
    pro: "gpt-5.2",
    fast: "gpt-5-mini",
  },
  openrouter: {
    ultra: "",
    pro: "",
    fast: "",
  },
};

export const TIER_INFO: Record<ModelTier, { label: string; description: string }> = {
  ultra: {
    label: "Ultra",
    description: "Most capable. Best for complex reasoning, analysis, and creative tasks. Highest cost.",
  },
  pro: {
    label: "Pro",
    description: "Balanced. Great for coding, writing, and everyday tasks. Moderate cost.",
  },
  fast: {
    label: "Fast",
    description: "Quickest responses. Ideal for simple tasks and high-volume use. Lowest cost.",
  },
};

const TIER_ORDER: ModelTier[] = ["ultra", "pro", "fast"];
const TIER_PRIORITY: Record<ModelTier, number> = { ultra: 0, pro: 1, fast: 2 };

function normalizeTierMatchText(text: string): string {
  return text.toLowerCase().replaceAll(/[\s_-]+/g, " ").trim();
}

export function getModelTier(model: ModelEntry): ModelTier | null {
  const providerTiers = MODEL_TIERS[model.provider];
  if (!providerTiers) {
    return null;
  }

  const haystack = normalizeTierMatchText(`${model.id} ${model.name}`);

  if (model.provider === "openrouter") {
    // OpenRouter model IDs can vary by sub-provider; match by stable name/ID fragments.
    if (haystack.includes("trinity large preview")) {
      return "ultra";
    }
    if (haystack.includes("kimi") && (haystack.includes("2.5") || haystack.includes("k2.5"))) {
      return "pro";
    }
    // OpenRouter can prefix IDs with sub-provider (e.g. "google/gemini-3-flash-preview").
    if (haystack.includes("gemini 3 flash") && haystack.includes("preview")) {
      return "fast";
    }
  }

  if (model.provider === "google") {
    // "Gemini 3 Flash Preview" should always show as FAST, even if the UI name varies slightly.
    if (haystack.includes("gemini 3 flash") && haystack.includes("preview")) {
      return "fast";
    }
  }

  for (const tier of TIER_ORDER) {
    const exactId = providerTiers[tier];
    if (exactId && model.id === exactId) {
      return tier;
    }
  }
  return null;
}

function formatContextWindow(ctx: number | undefined): string {
  if (!ctx) {
    return "";
  }
  if (ctx >= 1_000_000) {
    return `${(ctx / 1_000_000).toFixed(1)}M`;
  }
  if (ctx >= 1_000) {
    return `${Math.round(ctx / 1_000)}K`;
  }
  return String(ctx);
}

export function formatModelMeta(model: ModelEntry): string | null {
  const parts: string[] = [];
  if (model.contextWindow) {
    parts.push(`ctx ${formatContextWindow(model.contextWindow)}`);
  }
  if (model.reasoning) {
    parts.push("reasoning");
  }
  return parts.length ? parts.join(" · ") : null;
}

export function sortModelsByProviderTierName(models: ModelEntry[]): ModelEntry[] {
  return models.slice().sort((a, b) => {
    const p = a.provider.localeCompare(b.provider);
    if (p !== 0) {
      return p;
    }
    const tierA = getModelTier(a);
    const tierB = getModelTier(b);
    if (tierA && tierB) {
      return TIER_PRIORITY[tierA] - TIER_PRIORITY[tierB];
    }
    if (tierA) {
      return -1;
    }
    if (tierB) {
      return 1;
    }
    return a.name.localeCompare(b.name);
  });
}

