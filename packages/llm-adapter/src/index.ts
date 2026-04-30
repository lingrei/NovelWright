/**
 * @novelwright/llm-adapter — Provider-agnostic LLM interface.
 *
 * The web app and orchestrator only depend on the LLMProvider interface.
 * Swapping Gemini for Claude / OpenAI is a one-file change in implementation.
 */

export type { LLMRequest, LLMResponse } from "@novelwright/types";
export { GeminiProvider } from "./providers/gemini";
export type { LLMProvider, LLMStreamChunk, ProviderConfig } from "./types";
export { calculateCost, MODEL_PRICING } from "./pricing";
