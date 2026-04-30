import { GoogleGenerativeAI } from "@google/generative-ai";
import type { LLMRequest, LLMResponse } from "@novelwright/types";
import type { LLMProvider, LLMStreamChunk, ProviderConfig } from "../types";

/**
 * Gemini provider — wraps @google/generative-ai SDK.
 *
 * Notes:
 * - SystemPrompt is mapped to systemInstruction at model construction time.
 * - Conversation history is mapped to chat history (alternating user/model turns).
 * - Streaming uses generateContentStream which yields chunks with text() accessor.
 * - Transient 503/429/UNAVAILABLE errors trigger silent fallback through a model chain.
 *   Default chain: 2.5-pro → 3-pro → 3-flash → 2.5-flash, 2 full cycles before surfacing error.
 */
export class GeminiProvider implements LLMProvider {
  readonly name = "gemini";
  private readonly client: GoogleGenerativeAI;
  private readonly defaultModel: string;
  private readonly fallbackChain: string[];
  private readonly fallbackCycles: number;

  constructor(config: ProviderConfig) {
    if (!config.apiKey || config.apiKey.trim() === "") {
      throw new Error("[GeminiProvider] apiKey is required");
    }
    this.client = new GoogleGenerativeAI(config.apiKey);
    this.defaultModel = config.defaultModel ?? "gemini-2.5-pro";
    this.fallbackChain = config.fallbackChain ?? [
      "gemini-2.5-pro",
      "gemini-3-pro",
      "gemini-3-flash",
      "gemini-2.5-flash",
    ];
    this.fallbackCycles = config.fallbackCycles ?? 2;
  }

  /** Builds the chain to attempt for a given request, starting from the requested model if it's in the chain. */
  private buildAttemptChain(requestedModel: string | undefined): string[] {
    const requested = requestedModel || this.defaultModel;
    const chain = [...this.fallbackChain];
    // If the requested model is in the chain, rotate it to the front so we try it first.
    const idx = chain.indexOf(requested);
    if (idx > 0) {
      const rotated = chain.slice(idx).concat(chain.slice(0, idx));
      return rotated;
    }
    if (idx === -1) {
      // Requested model isn't in chain — try it first, then fall back to chain
      return [requested, ...chain];
    }
    return chain;
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const chain = this.buildAttemptChain(request.model);
    return withModelChain(chain, this.fallbackCycles, (model) =>
      this.generateOnce({ ...request, model }),
    );
  }

  private async generateOnce(request: LLMRequest): Promise<LLMResponse> {
    const model = this.client.getGenerativeModel({
      model: request.model || this.defaultModel,
      systemInstruction: request.systemPrompt,
      generationConfig: {
        temperature: request.temperature,
        ...(request.maxOutputTokens != null && {
          maxOutputTokens: request.maxOutputTokens,
        }),
      },
    });

    if (request.conversationHistory && request.conversationHistory.length > 0) {
      const chat = model.startChat({
        history: request.conversationHistory.map((turn) => ({
          role: turn.role,
          parts: [{ text: turn.content }],
        })),
      });
      const result = await chat.sendMessage(request.userPrompt);
      const response = result.response;
      return {
        content: response.text(),
        usage: {
          inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
          outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
        },
        finishReason: mapFinishReason(response.candidates?.[0]?.finishReason),
      };
    }

    const result = await model.generateContent(request.userPrompt);
    const response = result.response;
    return {
      content: response.text(),
      usage: {
        inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
      },
      finishReason: mapFinishReason(response.candidates?.[0]?.finishReason),
    };
  }

  async *generateStream(request: LLMRequest): AsyncIterable<LLMStreamChunk> {
    // Try each model in the fallback chain. Once a stream's first byte arrives,
    // we commit to that model — partial output is delivered, not restarted.
    const chain = this.buildAttemptChain(request.model);
    const stream = await withModelChain(chain, this.fallbackCycles, (model) =>
      this.openStream({ ...request, model }),
    );

    let lastInputTokens: number | undefined;
    let lastOutputTokens: number | undefined;

    for await (const chunk of stream.stream) {
      const text = chunk.text();
      const usage = chunk.usageMetadata;
      if (usage) {
        lastInputTokens = usage.promptTokenCount;
        lastOutputTokens = usage.candidatesTokenCount;
      }
      yield {
        delta: text,
        inputTokens: lastInputTokens,
        outputTokens: lastOutputTokens,
        done: false,
      };
    }

    const finalResponse = await stream.response;
    yield {
      delta: "",
      inputTokens: finalResponse.usageMetadata?.promptTokenCount ?? lastInputTokens ?? 0,
      outputTokens: finalResponse.usageMetadata?.candidatesTokenCount ?? lastOutputTokens ?? 0,
      done: true,
    };
  }

  private async openStream(request: LLMRequest) {
    const model = this.client.getGenerativeModel({
      model: request.model || this.defaultModel,
      systemInstruction: request.systemPrompt,
      generationConfig: {
        temperature: request.temperature,
        ...(request.maxOutputTokens != null && {
          maxOutputTokens: request.maxOutputTokens,
        }),
      },
    });

    if (request.conversationHistory && request.conversationHistory.length > 0) {
      const chat = model.startChat({
        history: request.conversationHistory.map((turn) => ({
          role: turn.role,
          parts: [{ text: turn.content }],
        })),
      });
      return chat.sendMessageStream(request.userPrompt);
    }
    return model.generateContentStream(request.userPrompt);
  }
}

function mapFinishReason(reason: string | undefined): "stop" | "max_tokens" | "safety" | "error" {
  if (!reason) return "stop";
  switch (reason) {
    case "STOP":
      return "stop";
    case "MAX_TOKENS":
      return "max_tokens";
    case "SAFETY":
    case "RECITATION":
      return "safety";
    default:
      return "error";
  }
}

/**
 * Try a fallback chain of models, cycling through up to `cycles` times.
 *
 * On retriable error (503/429/UNAVAILABLE/etc): silently move to the next model.
 * On non-retriable error (auth, malformed request, safety block): surface immediately.
 *
 * After exhausting all models × cycles, throws the last retriable error.
 *
 * Brief delay between model attempts (300ms) and longer delay between cycles (2s)
 * gives Google's load-balancers a chance to recover.
 */
async function withModelChain<T>(
  models: string[],
  cycles: number,
  fn: (model: string) => Promise<T>,
): Promise<T> {
  let lastErr: unknown = null;
  for (let cycle = 0; cycle < cycles; cycle++) {
    for (let i = 0; i < models.length; i++) {
      const model = models[i]!;
      try {
        return await fn(model);
      } catch (err) {
        lastErr = err;
        if (!isRetriable(err)) {
          throw err;
        }
        // Brief inter-model delay (Google load balancers prefer this over hammering).
        if (i < models.length - 1 || cycle < cycles - 1) {
          await sleep(300 + Math.random() * 200);
        }
      }
    }
    // Cycle complete — slightly longer pause before retrying the chain.
    if (cycle < cycles - 1) {
      await sleep(1800 + Math.random() * 600);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Model fallback chain exhausted");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetriable(err: unknown): boolean {
  const msg = (err as { message?: string })?.message ?? String(err);
  return /\b(503|429|500)\b|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|temporarily|overloaded|deadline exceeded/i.test(
    msg,
  );
}
