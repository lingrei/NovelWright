/**
 * POST /api/write/run — Write phase orchestrator (in-process).
 *
 * Runs the multi-Chunk loop: PLAN → WRITE → CONSOLIDATE for each Chunk.
 * Streams prose-tokens to client (the manuscript), plus per-Chunk progress events.
 *
 * v1 simplifications:
 *   - One LLM call per Chunk (no Batch splitting yet — Batch is a v1.5 quality enhancement)
 *   - No invisible Chunk Reviewer sub-agent (deferred to v1.5)
 *   - No Full Audit sub-agent (deferred to v1.5)
 *   - Single in-process orchestrator (Fly.io split deferred to v1.5; works fine for short stories)
 *
 * The user only sees prose accumulating + a thin progress indicator.
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { calculateCost } from "@novelwright/llm-adapter";
import { getPromptAssembler } from "@/lib/server/assembler";
import { getLLMProvider } from "@/lib/server/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // Vercel cap; for genuinely long projects we'd move to Fly.io (v1.5).

const RequestSchema = z.object({
  premise: z.unknown(),
  setting: z.unknown(),
  characters: z.unknown(),
  story: z
    .object({
      chunks: z.array(z.unknown()).optional(),
    })
    .passthrough(),
});

export async function POST(req: NextRequest) {
  let body;
  try {
    body = RequestSchema.parse(await req.json());
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Invalid request body", details: (err as Error).message }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  if (!body.story.chunks || body.story.chunks.length === 0) {
    return new Response(
      JSON.stringify({ error: "Story has no chunks defined" }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  const assembler = getPromptAssembler();
  const provider = getLLMProvider();
  const model = process.env.GEMINI_MODEL || "gemini-2.5-pro";

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let draftTail = "";
      const chunkOutputs: Array<{ index: number; title: string; prose: string }> = [];

      try {
        send({ type: "phase-start", phase: "write", chunkIndex: 0 });

        const chunks = (body.story.chunks ?? []) as Array<Record<string, unknown>>;
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          if (!chunk) continue;

          send({
            type: "chunk-start",
            chunkIndex: (chunk.index as number) ?? i + 1,
            title: (chunk.title as string) ?? `Chunk ${i + 1}`,
            targetWords: (chunk.targetWords as number) ?? 2000,
          });

          // Build a per-Chunk write-prose prompt with the chunk's plan + draft tail for continuity
          const userMessage = buildChunkUserMessage(chunk, draftTail, i);

          const assembled = await assembler.assemble("write-prose", {
            userMessage,
            currentChunkIndex: (chunk.index as number) ?? i + 1,
            premise: body.premise as never,
            setting: body.setting as never,
            characters: body.characters as never,
            story: body.story as never,
            draftTail,
          });

          const llmStream = provider.generateStream({
            model,
            systemPrompt: assembled.systemPrompt,
            userPrompt: assembled.userPrompt,
            temperature: assembled.temperature,
          });

          let chunkProse = "";
          let chunkInputTokens = 0;
          let chunkOutputTokens = 0;

          for await (const piece of llmStream) {
            if (piece.delta) {
              chunkProse += piece.delta;
              send({ type: "prose-token", token: piece.delta });
            }
            if (piece.inputTokens != null) chunkInputTokens = piece.inputTokens;
            if (piece.outputTokens != null) chunkOutputTokens = piece.outputTokens;
          }

          totalInputTokens += chunkInputTokens;
          totalOutputTokens += chunkOutputTokens;
          chunkOutputs.push({
            index: (chunk.index as number) ?? i + 1,
            title: (chunk.title as string) ?? `Chunk ${i + 1}`,
            prose: chunkProse,
          });

          // Update draft tail (last 600 chars roughly) for next Chunk continuity
          draftTail = (draftTail + "\n\n" + chunkProse).slice(-2000);

          send({
            type: "chunk-end",
            chunkIndex: (chunk.index as number) ?? i + 1,
            wordCount: chunkProse.split(/\s+/).filter(Boolean).length,
          });

          // Per-chunk cost update
          const runningCost = calculateCost(model, totalInputTokens, totalOutputTokens);
          send({
            type: "cost-update",
            inputTokens: totalInputTokens,
            outputTokens: totalOutputTokens,
            totalUsd: runningCost,
          });
        }

        const totalCost = calculateCost(model, totalInputTokens, totalOutputTokens);
        const totalWords = chunkOutputs.reduce(
          (sum, c) => sum + c.prose.split(/\s+/).filter(Boolean).length,
          0,
        );
        send({
          type: "complete",
          totalWords,
          totalCost,
          chunks: chunkOutputs,
        });
      } catch (err) {
        send({
          type: "error",
          message: (err as Error).message || "Unknown error during Write phase",
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

function buildChunkUserMessage(chunk: unknown, draftTail: string, index: number): string {
  const c = chunk as Record<string, unknown>;
  const parts: string[] = [];
  parts.push(`# Write Chunk ${(c.index as number) ?? index + 1}: ${(c.title as string) ?? "Untitled"}`);

  if (c.timeline) parts.push(`**Timeline:** ${c.timeline}`);
  if (c.intensityTier != null) parts.push(`**Intensity Tier:** ${c.intensityTier}`);
  if (c.targetWords) parts.push(`**Target word count:** ~${c.targetWords}`);
  if (c.focus) parts.push(`**Focus:** ${c.focus}`);
  if (c.stateFlow) parts.push(`**State Flow:**\n${c.stateFlow}`);

  if (Array.isArray(c.beats) && c.beats.length > 0) {
    parts.push(`\n## Beats to cover\n`);
    for (const beat of c.beats as Array<Record<string, unknown>>) {
      parts.push(
        `- **Beat ${beat.number ?? "?"}** (Dilation ${beat.dilation ?? "?"}): ${beat.content ?? ""} — Focus: ${beat.focus ?? ""}`,
      );
    }
  }

  if (c.emotionCurve) {
    const ec = c.emotionCurve as Record<string, unknown>;
    parts.push(
      `\n## Emotion Curve\nEntry: ${ec.entry ?? ""} → Peak (${ec.peakBeat ?? "?"} at ${ec.peakPositionPct ?? "?"}%) → Exit: ${ec.exit ?? ""}${ec.interrupted ? " (interrupted)" : ""}`,
    );
  }

  if (Array.isArray(c.anchorPoints) && c.anchorPoints.length > 0) {
    parts.push(`\n## Anchor Behaviors in this Chunk`);
    for (const ap of c.anchorPoints as Array<Record<string, unknown>>) {
      parts.push(`- ${ap.anchorName}: ${ap.stateInChunk}`);
    }
  }

  if (draftTail) {
    parts.push(`\n## Last lines of previous Chunk (continue seamlessly)\n${draftTail}`);
  }

  parts.push(
    `\n## Task\nWrite the prose for this Chunk now. Pure prose only — no metadata, no markdown headings. Continue seamlessly from the previous Chunk if applicable. End with a Shutter Cut (filmable physical image). Respect Camera_OS rules.`,
  );

  return parts.join("\n\n");
}
