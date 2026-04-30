/**
 * POST /api/stages/redteam — Independent destructive review of characters after W2.
 *
 * Sub-agent semantics: receives ONLY the artifact files (premise, setting, characters),
 * NOT the main conversation history. The PromptAssembler's stage config enforces this.
 */
import type { NextRequest } from "next/server";
import { z } from "zod";
import { runStageSSE } from "@/lib/server/stage-runner";
import { CharacterSchema, PremiseSchema, SettingSchema } from "@novelwright/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  premise: PremiseSchema.partial(),
  setting: SettingSchema.partial(),
  characters: z.array(CharacterSchema.partial()),
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
    stage: "redteam",
    userMessage:
      "Review the characters above and produce your independent destructive critique. Find what breaks.",
    artifacts: {
      premise: body.premise as never,
      setting: body.setting as never,
      characters: body.characters as never,
    },
  });
}
