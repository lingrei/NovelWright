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
 * - Transient 503/429/UNAVAILABLE errors auto-retry with exponential backoff.
 *   Google's flagship models often hit demand spikes; this keeps the user flow alive.
 */
export class GeminiProvider implements LLMProvider {
  readonly name = "gemini";
  private readonly client: GoogleGenerativeAI;
  private readonly defaultModel: string;

  constructor(config: ProviderConfig) {
    if (!config.apiKey || config.apiKey.trim() === "") {
      throw new Error("[GeminiProvider] apiKey is required");
    }
    this.client = new GoogleGenerativeAI(config.apiKey);
    this.defaultModel = config.defaultModel ?? "gemini-2.5-pro";
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    return withRetry(() => this.generateOnce(request));
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
    // Retry the *initial* stream creation only (where 503s happen).
    // Once tokens start flowing we don't restart — partial output is delivered.
    const stream = await withRetry(() => this.openStream(request));

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
 * Retry transient Google API errors (503 high demand, 429 rate limit, UNAVAILABLE).
 * Exponential backoff: ~1.5s, ~3s, ~6s. Surfaces non-transient errors immediately.
 */
async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 4): Promise<T> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isRetriable(err) || attempt === maxAttempts - 1) {
        throw err;
      }
      const delayMs = 1500 * Math.pow(2, attempt) + Math.random() * 500;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Retry exhausted");
}

function isRetriable(err: unknown): boolean {
  const msg = (err as { message?: string })?.message ?? String(err);
  return /\b(503|429|500)\b|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|temporarily|overloaded|deadline exceeded/i.test(
    msg,
  );
}
