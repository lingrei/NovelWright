import type { LLMRequest, LLMResponse } from "@novelwright/types";

export interface ProviderConfig {
  apiKey: string;
  defaultModel?: string;
  /**
   * Ordered list of models to try as fallback when the primary fails with a retriable error.
   * Default chain (Gemini): gemini-2.5-pro -> gemini-3-pro -> gemini-3-flash -> gemini-2.5-flash.
   * The requested model (per-call or default) is rotated to the front of the chain.
   */
  fallbackChain?: string[];
  /**
   * How many full cycles through the fallback chain before surfacing the error.
   * Default 2.
   */
  fallbackCycles?: number;
}

export interface LLMStreamChunk {
  /** The token / text fragment streamed from the model. */
  delta: string;
  /** Cumulative input token count so far (only set on first chunk usually). */
  inputTokens?: number;
  /** Cumulative output token count up to this chunk. */
  outputTokens?: number;
  /** Whether this is the final chunk. */
  done: boolean;
}

/**
 * Provider-agnostic LLM interface. Implementations: Gemini (now), Claude / OpenAI (later).
 */
export interface LLMProvider {
  readonly name: string;

  /** Single-shot generation, awaits full response. */
  generate(request: LLMRequest): Promise<LLMResponse>;

  /** Streaming generation, yields token-by-token chunks via async iterator. */
  generateStream(request: LLMRequest): AsyncIterable<LLMStreamChunk>;
}
