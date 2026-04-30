import type { NextRequest } from "next/server";
import { z } from "zod";
import { runStageSSE } from "@/lib/server/stage-runner";
import { ConversationTurnSchema } from "@novelwright/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  userMessage: z.string().min(1),
  conversationHistory: z.array(ConversationTurnSchema).optional(),
  premise: z.unknown().optional(),
  setting: z.unknown().optional(),
  characters: z.unknown().optional(),
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

  return runStageSSE(req, {
    stage: "characters",
    userMessage: body.userMessage,
    conversationHistory: body.conversationHistory,
    artifacts: {
      premise: body.premise as never,
      setting: body.setting as never,
      characters: body.characters as never,
    },
  });
}
