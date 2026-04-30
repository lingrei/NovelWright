import type {
  Character,
  ConversationTurn,
  FourDState,
  Premise,
  Setting,
  Story,
} from "@novelwright/types";

/**
 * The stages the assembler knows how to build prompts for.
 * Maps roughly to .claude/commands/*.md, but with finer granularity for the web flow.
 */
export type Stage =
  // Plan view sub-steps (visible to user, conversational)
  | "idea" // idea-engine.md
  | "world" // story-engine.md + voice-engine.md (Section 1)
  | "characters" // character-engine.md + voice-engine.md (Section 2)
  | "plot" // plot-structure.md + narrative-dynamics.md
  // Sub-agents (independent context, no main conversation history)
  | "redteam" // redteam-agent.md
  | "outline-review" // outline-review-agent.md
  | "chunk-review" // review-agent.md (invisible in Write phase)
  | "full-audit" // full-audit.md (invisible in Write phase)
  // Write phase internal sub-steps (orchestrator-driven, invisible to user)
  | "write-plan" // chunk-planner.md
  | "write-prose" // camera-os.md + writing.md
  | "write-consolidate"; // consolidation-engine.md

export interface AssemblyContext {
  /** Latest user message in the conversation. */
  userMessage: string;
  /** Conversation history for stages that maintain it. NOT passed to sub-agents. */
  conversationHistory?: ConversationTurn[];

  /** Project artifacts available at the time of assembly. */
  premise?: Premise;
  setting?: Setting;
  characters?: Character[];
  story?: Story;
  state?: FourDState;
  /** Last 50–100 lines of _Draft.md, used for continuity in Write phase. */
  draftTail?: string;

  /** Per-Chunk context for Write phase. */
  currentChunkIndex?: number;

  /** Optional override of expected output structure. */
  expectedOutputDescription?: string;
}

export interface AssembledPrompt {
  /** The full system prompt sent to the model. */
  systemPrompt: string;
  /** The user-facing prompt for this turn. */
  userPrompt: string;
  /** Conversation history mapped to LLM API format (omitted for sub-agents). */
  conversationHistory?: Array<{ role: "user" | "model"; content: string }>;
  /** Recommended temperature for this stage. */
  temperature: number;
  /** Approximate input token count for cost forecasting (rough estimate). */
  approximateInputTokens: number;
}
