/**
 * POST /api/stages/idea — Phase 0 Idea Engine.
 * Streams agent prose + emits structured-update for Premise Card population.
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { runStageSSE } from "@/lib/server/stage-runner";
import { ConversationTurnSchema } from "@novelwright/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Loose validation: artifacts are typed end-to-end on the client; we don't
// re-validate their internal structure on the wire. Strict nested schemas
// cause 400s when a partially-built artifact has missing fields, which is the
// normal mid-construction state.
const RequestSchema = z.object({
  userMessage: z.string().min(1),
  conversationHistory: z.array(ConversationTurnSchema).optional(),
  premise: z.unknown().optional(),
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
    stage: "idea",
    userMessage: body.userMessage,
    conversationHistory: body.conversationHistory,
    artifacts: { premise: body.premise as never },
  });
}
