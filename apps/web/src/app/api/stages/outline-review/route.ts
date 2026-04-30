/**
 * POST /api/stages/outline-review — Independent Producer + Editor review of the plot after W3.
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { runStageSSE } from "@/lib/server/stage-runner";
import {
  CharacterSchema,
  PremiseSchema,
  SettingSchema,
  StorySchema,
} from "@novelwright/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  premise: PremiseSchema.partial(),
  setting: SettingSchema.partial(),
  characters: z.array(CharacterSchema.partial()),
  story: StorySchema.partial(),
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
    stage: "outline-review",
    userMessage:
      "Review the plot above as Producer (commercial) + Editor (craft) and produce your independent verdict.",
    artifacts: {
      premise: body.premise as never,
      setting: body.setting as never,
      characters: body.characters as never,
      story: body.story as never,
    },
  });
}
