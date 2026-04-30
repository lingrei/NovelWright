import type { NextRequest } from "next/server";
import { calculateCost } from "@novelwright/llm-adapter";
import type { Stage } from "@novelwright/prompt-assembler";
import { getPromptAssembler } from "./assembler";
import { getLLMProvider } from "./llm";
import { splitProseAndStructured } from "./structured-stream";

interface RunStageParams {
  stage: Stage;
  userMessage: string;
  conversationHistory?: Parameters<
    ReturnType<typeof getPromptAssembler>["assemble"]
  >[1]["conversationHistory"];
  artifacts?: Omit<
    Parameters<ReturnType<typeof getPromptAssembler>["assemble"]>[1],
    "userMessage" | "conversationHistory"
  >;
}

/**
 * Common SSE handler for any stage that needs prose streaming + trailing structured update.
 * Used by /api/stages/idea, /api/stages/world, etc. — keeps each route file thin.
 */
export async function runStageSSE(req: NextRequest, params: RunStageParams): Promise<Response> {
  let assembler;
  let provider;
  try {
    assembler = getPromptAssembler();
    provider = getLLMProvider();
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Server not configured", details: (err as Error).message }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }

  const assembled = await assembler.assemble(params.stage, {
    userMessage: params.userMessage,
    conversationHistory: params.conversationHistory,
    ...params.artifacts,
  });

  const model = process.env.GEMINI_MODEL || "gemini-2.5-pro";

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        send({ type: "stage-start", stage: params.stage });

        const llmStream = provider.generateStream({
          model,
          systemPrompt: assembled.systemPrompt,
          userPrompt: assembled.userPrompt,
          conversationHistory: assembled.conversationHistory,
          temperature: assembled.temperature,
        });

        let inputTokens = 0;
        let outputTokens = 0;

        for await (const event of splitProseAndStructured(llmStream)) {
          if (event.type === "prose") {
            send({ type: "prose-token", token: event.token });
          } else if (event.type === "structured") {
            send({ type: "structured-update", stage: params.stage, data: event.data });
          } else if (event.type === "usage") {
            inputTokens = event.inputTokens;
            outputTokens = event.outputTokens;
          }
        }

        const cost = calculateCost(model, inputTokens, outputTokens);
        send({
          type: "complete",
          usage: { inputTokens, outputTokens, costUsd: cost },
        });
      } catch (err) {
        send({
          type: "error",
          message: (err as Error).message || "Unknown error during generation",
          recoverable: false,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
