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

    // Build chat history if provided, otherwise single-shot.
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

    let streamPromise;
    if (request.conversationHistory && request.conversationHistory.length > 0) {
      const chat = model.startChat({
        history: request.conversationHistory.map((turn) => ({
          role: turn.role,
          parts: [{ text: turn.content }],
        })),
      });
      streamPromise = chat.sendMessageStream(request.userPrompt);
    } else {
      streamPromise = model.generateContentStream(request.userPrompt);
    }

    const stream = await streamPromise;
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

    // Final response — get totals.
    const finalResponse = await stream.response;
    yield {
      delta: "",
      inputTokens: finalResponse.usageMetadata?.promptTokenCount ?? lastInputTokens ?? 0,
      outputTokens: finalResponse.usageMetadata?.candidatesTokenCount ?? lastOutputTokens ?? 0,
      done: true,
    };
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
