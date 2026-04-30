import type { NextRequest } from "next/server";
import { z } from "zod";
import { runStageSSE } from "@/lib/server/stage-runner";
import {
  CharacterSchema,
  ConversationTurnSchema,
  PremiseSchema,
  SettingSchema,
  StorySchema,
} from "@novelwright/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  userMessage: z.string().min(1),
  conversationHistory: z.array(ConversationTurnSchema).optional(),
  premise: PremiseSchema.partial().optional(),
  setting: SettingSchema.partial().optional(),
  characters: z.array(CharacterSchema.partial()).optional(),
  story: StorySchema.partial().optional(),
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
    stage: "plot",
    userMessage: body.userMessage,
    conversationHistory: body.conversationHistory,
    artifacts: {
      premise: body.premise as never,
      setting: body.setting as never,
      characters: body.characters as never,
      story: body.story as never,
    },
  });
}
