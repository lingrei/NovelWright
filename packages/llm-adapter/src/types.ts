import type { LLMRequest, LLMResponse } from "@novelwright/types";

export interface ProviderConfig {
  apiKey: string;
  defaultModel?: string;
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
