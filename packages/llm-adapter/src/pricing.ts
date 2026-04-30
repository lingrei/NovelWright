/**
 * Per-model token pricing (USD per 1M tokens) used to compute cost ticker values.
 * Source: Google AI pricing pages, late 2025. Update when models change.
 *
 * If a requested model isn't in this table, falls back to gemini-2.5-pro pricing
 * to avoid silent zero-cost reporting.
 */

export interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  // Gemini 2.5 Pro — current Google flagship
  "gemini-2.5-pro": {
    inputPerMillion: 1.25,
    outputPerMillion: 5.0,
  },
  // Gemini 3 Pro / 3.1 Pro — placeholder; update when official pricing released
  "gemini-3-pro": {
    inputPerMillion: 2.0,
    outputPerMillion: 8.0,
  },
  "gemini-3.1-pro": {
    inputPerMillion: 2.0,
    outputPerMillion: 8.0,
  },
  // Lighter models for cheap tasks
  "gemini-2.5-flash": {
    inputPerMillion: 0.075,
    outputPerMillion: 0.3,
  },
};

const FALLBACK = MODEL_PRICING["gemini-2.5-pro"]!;

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing = MODEL_PRICING[model] ?? FALLBACK;
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMillion;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillion;
  return inputCost + outputCost;
}
