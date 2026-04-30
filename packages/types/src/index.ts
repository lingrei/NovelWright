/**
 * @novelwright/types — Shared Zod schemas for artifacts, state, and runtime contracts.
 *
 * This package is the single source of truth for data shapes across the web app and
 * the orchestrator. Every artifact stored in IndexedDB or sent over SSE is validated
 * against one of these schemas.
 */

import { z } from "zod";

// ============================================================================
// Project — top-level container
// ============================================================================

export const PhaseSchema = z.enum(["plan", "write", "done"]);
export type Phase = z.infer<typeof PhaseSchema>;

export const PlanSubStepSchema = z.enum(["idea", "world", "characters", "plot"]);
export type PlanSubStep = z.infer<typeof PlanSubStepSchema>;

export const WriteSubStepSchema = z.enum(["plan", "write", "review", "consolidate"]);
export type WriteSubStep = z.infer<typeof WriteSubStepSchema>;

export const ProjectSettingsSchema = z.object({
  model: z.string().default("gemini-2.5-pro"),
  costCapUsd: z.number().positive().default(20),
  outputLanguage: z.literal("en").default("en"),
});
export type ProjectSettings = z.infer<typeof ProjectSettingsSchema>;

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  currentPhase: PhaseSchema,
  currentPlanSubStep: PlanSubStepSchema.optional(),
  currentChunkIndex: z.number().int().nonnegative().optional(),
  settings: ProjectSettingsSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Project = z.infer<typeof ProjectSchema>;

// ============================================================================
// Premise — Phase 0 / Idea sub-step output
// ============================================================================

export const PremiseSchema = z.object({
  hook: z.string().min(1),
  coreDesire: z.string().min(1),
  conflictDriver: z.string().min(1),
  structuralLayer: z.string().min(1),
  protagonistPositioning: z.string().min(1),
  climaxShape: z.string().min(1),
  derivationChainTrace: z.string().min(1),
});
export type Premise = z.infer<typeof PremiseSchema>;

// ============================================================================
// World — W1 output (part of _Setting.md)
// ============================================================================

export const NarrativeVoiceSchema = z.object({
  narrator: z.string(),
  languageStyle: z.string(),
  allowedLensModes: z.array(z.enum(["PHYSICAL", "SUBJECTIVE", "NARRATOR"])),
});
export type NarrativeVoice = z.infer<typeof NarrativeVoiceSchema>;

export const WorldRuleSchema = z.object({
  id: z.string(),
  rule: z.string(),
  serves: z.string(),
  lossIfRemoved: z.string(),
  derivationStatus: z.enum(["verified", "weak", "unjustified"]).default("verified"),
});
export type WorldRule = z.infer<typeof WorldRuleSchema>;

export const ProjectOverviewSchema = z.object({
  typeLength: z.string(),
  timeline: z.string(),
  tone: z.string(),
});
export type ProjectOverview = z.infer<typeof ProjectOverviewSchema>;

export const SettingSchema = z.object({
  premise: PremiseSchema,
  narrativeVoice: NarrativeVoiceSchema,
  worldRules: z.array(WorldRuleSchema),
  overview: ProjectOverviewSchema,
});
export type Setting = z.infer<typeof SettingSchema>;

// ============================================================================
// Characters — W2 output (part of _Setting.md)
// ============================================================================

export const AnchorBehaviorSchema = z.object({
  name: z.string(),
  phase1: z.string(),
  phase3: z.string(),
  phase5: z.string(),
});
export type AnchorBehavior = z.infer<typeof AnchorBehaviorSchema>;

export const VoiceDNASchema = z.object({
  rhythm: z.string(),
  vocabulary: z.string(),
  signaturePattern: z.string(),
  notes: z.string().optional(),
});
export type VoiceDNA = z.infer<typeof VoiceDNASchema>;

export const PhysicalPresenceTraitSchema = z.object({
  trait: z.string(),
  physicalQuality: z.string(),
  narrativeFunction: z.string(),
  changeTrajectory: z.string(),
});
export type PhysicalPresenceTrait = z.infer<typeof PhysicalPresenceTraitSchema>;

export const CharacterSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  desirePositioning: z.object({
    coreDesire: z.string(),
    irreplaceability: z.string(),
  }),
  appearance: z.object({
    face: z.string(),
    build: z.string(),
    aura: z.string(),
    distinctiveness: z.number().int().min(1).max(10),
  }),
  personality: z.object({
    surface: z.string(),
    interior: z.string(),
    gap: z.string(),
  }),
  situation: z.object({
    identity: z.string(),
    tensionSource: z.string(),
    deleteTest: z.string(),
  }),
  physicalPresenceProfile: z.array(PhysicalPresenceTraitSchema),
  anchorBehaviors: z.array(AnchorBehaviorSchema),
  voiceDNA: VoiceDNASchema,
});
export type Character = z.infer<typeof CharacterSchema>;

// ============================================================================
// Plot — W3 output (_Story.md)
// ============================================================================

export const IntensityTierSchema = z.union([
  z.literal(1), // High
  z.literal(2), // Medium
  z.literal(3), // Light
]);
export type IntensityTier = z.infer<typeof IntensityTierSchema>;

export const DilationLevelSchema = z.number().int().min(1).max(10);
export type DilationLevel = z.infer<typeof DilationLevelSchema>;

export const BeatSchema = z.object({
  number: z.string(), // e.g. "3.1"
  content: z.string(),
  dilation: DilationLevelSchema,
  focus: z.string(),
  batch: z.number().int().positive().optional(),
});
export type Beat = z.infer<typeof BeatSchema>;

export const EmotionCurveSchema = z.object({
  entry: z.string(),
  peakBeat: z.string(),
  peakPositionPct: z.number().min(0).max(100),
  exit: z.string(),
  interrupted: z.boolean(),
});
export type EmotionCurve = z.infer<typeof EmotionCurveSchema>;

export const ChunkSchema = z.object({
  index: z.number().int().positive(),
  title: z.string(),
  status: z.enum(["pending", "planned", "writing", "reviewing", "consolidated", "done"]).default("pending"),
  timeline: z.string(),
  targetWords: z.number().int().positive(),
  actualWords: z.number().int().nonnegative().optional(),
  anchorPoints: z.array(z.object({
    anchorName: z.string(),
    stateInChunk: z.string(),
  })),
  stateFlow: z.string(),
  intensityTier: IntensityTierSchema,
  focus: z.string(),
  beats: z.array(BeatSchema),
  emotionCurve: EmotionCurveSchema,
});
export type Chunk = z.infer<typeof ChunkSchema>;

export const StorySchema = z.object({
  spine: z.object({
    corePremise: z.string(),
    arcShape: z.string(),
    timeline: z.string(),
  }),
  chunks: z.array(ChunkSchema),
  globalArcTracking: z.object({
    anchorBehaviorProgression: z.array(z.object({
      anchor: z.string(),
      progression: z.array(z.string()), // C1, C2, C3, C4 states
    })),
    emotionalArc: z.array(z.string()),
  }),
});
export type Story = z.infer<typeof StorySchema>;

// ============================================================================
// 4D State — tracked across chunks
// ============================================================================

export const POVStateSchema = z.object({
  knows: z.array(z.string()),
  doesntKnow: z.array(z.string()),
  feels: z.array(z.string()),
});
export type POVState = z.infer<typeof POVStateSchema>;

export const StateSnapshotSchema = z.object({
  meta: z.array(z.string()),
  pov: z.record(z.string(), POVStateSchema), // characterName → POVState
  physical: z.array(z.string()),
  irreversible: z.array(z.string()),
});
export type StateSnapshot = z.infer<typeof StateSnapshotSchema>;

export const FourDStateSchema = z.object({
  currentChunk: z.number().int().nonnegative(),
  chunksCompleted: z.array(z.number().int().positive()),
  storyState: z.record(z.string(), StateSnapshotSchema), // "after_chunk_N" → StateSnapshot
});
export type FourDState = z.infer<typeof FourDStateSchema>;

// ============================================================================
// Conversation
// ============================================================================

export const AgentRoleSchema = z.enum([
  "main",         // primary writing agent
  "redteam",      // independent destructive reviewer (W2)
  "outline-review", // independent producer+editor reviewer (W3)
  "chunk-review", // per-chunk reviewer in Write phase (invisible to user)
  "full-audit",   // post-Write whole-manuscript audit (invisible to user)
]);
export type AgentRole = z.infer<typeof AgentRoleSchema>;

export const ConversationTurnSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "agent"]),
  agent: AgentRoleSchema.optional(),
  content: z.string(),
  timestamp: z.string().datetime(),
  /**
   * If true, this turn is hidden from the rendered conversation but still included
   * in API conversationHistory. Used by auto-kickoff to satisfy Gemini's
   * "history must start with user role" constraint without showing the synthetic
   * trigger message in the UI.
   */
  hidden: z.boolean().optional(),
});
export type ConversationTurn = z.infer<typeof ConversationTurnSchema>;

// ============================================================================
// Sub-agent reports
// ============================================================================

export const SeveritySchema = z.enum(["critical", "warning", "info"]);
export type Severity = z.infer<typeof SeveritySchema>;

export const FindingSchema = z.object({
  id: z.string(),
  severity: SeveritySchema,
  location: z.string(),
  issue: z.string(),
  suggestion: z.string().optional(),
  status: z.enum(["open", "addressed", "dismissed", "deferred"]).default("open"),
  dismissReason: z.string().optional(),
});
export type Finding = z.infer<typeof FindingSchema>;

export const RedTeamReportSchema = z.object({
  generatedAt: z.string().datetime(),
  findings: z.array(FindingSchema),
  summary: z.string(),
});
export type RedTeamReport = z.infer<typeof RedTeamReportSchema>;

export const OutlineReviewReportSchema = z.object({
  generatedAt: z.string().datetime(),
  producerScore: z.number().min(1).max(10),
  editorScore: z.number().min(1).max(10),
  producerFindings: z.array(FindingSchema),
  editorFindings: z.array(FindingSchema),
  summary: z.string(),
});
export type OutlineReviewReport = z.infer<typeof OutlineReviewReportSchema>;

export const ChunkReviewReportSchema = z.object({
  chunkIndex: z.number().int().positive(),
  generatedAt: z.string().datetime(),
  layers: z.object({
    format: z.object({ status: z.enum(["pass", "fix-needed"]), notes: z.string() }),
    logical: z.object({ status: z.enum(["pass", "fix-needed"]), notes: z.string() }),
    proseQuality: z.object({ status: z.enum(["pass", "fix-needed"]), notes: z.string() }),
    characterConsistency: z.object({ status: z.enum(["pass", "fix-needed"]), notes: z.string() }),
    voiceConsistency: z.object({ status: z.enum(["pass", "fix-needed"]), notes: z.string() }),
  }),
  fixList: z.object({
    mustFix: z.array(FindingSchema),
    recommendFix: z.array(FindingSchema),
    optimizations: z.array(FindingSchema),
  }),
  sensoryFingerprint: z.object({
    distribution: z.record(z.string(), z.number()), // sense → percentage
    saturationWarnings: z.array(z.string()),
  }),
});
export type ChunkReviewReport = z.infer<typeof ChunkReviewReportSchema>;

// ============================================================================
// SSE event types — for real-time orchestration streaming
// ============================================================================

export const SSEEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("phase-start"), phase: WriteSubStepSchema, chunkIndex: z.number() }),
  z.object({ type: z.literal("phase-end"), phase: WriteSubStepSchema, chunkIndex: z.number() }),
  z.object({ type: z.literal("chunk-start"), chunkIndex: z.number() }),
  z.object({ type: z.literal("chunk-end"), chunkIndex: z.number(), wordCount: z.number() }),
  z.object({ type: z.literal("prose-token"), token: z.string() }),
  z.object({ type: z.literal("subagent-start"), agent: AgentRoleSchema }),
  z.object({ type: z.literal("subagent-end"), agent: AgentRoleSchema }),
  z.object({ type: z.literal("cost-update"), inputTokens: z.number(), outputTokens: z.number(), totalUsd: z.number() }),
  z.object({ type: z.literal("error"), message: z.string(), recoverable: z.boolean() }),
  z.object({ type: z.literal("complete"), totalWords: z.number(), totalCost: z.number() }),
]);
export type SSEEvent = z.infer<typeof SSEEventSchema>;

// ============================================================================
// LLM call contracts (used by llm-adapter package)
// ============================================================================

export const LLMRequestSchema = z.object({
  model: z.string(),
  systemPrompt: z.string(),
  userPrompt: z.string(),
  conversationHistory: z.array(z.object({
    role: z.enum(["user", "model"]),
    content: z.string(),
  })).optional(),
  temperature: z.number().min(0).max(2).default(0.7),
  maxOutputTokens: z.number().int().positive().optional(),
});
export type LLMRequest = z.infer<typeof LLMRequestSchema>;

export const LLMResponseSchema = z.object({
  content: z.string(),
  usage: z.object({
    inputTokens: z.number(),
    outputTokens: z.number(),
  }),
  finishReason: z.enum(["stop", "max_tokens", "safety", "error"]),
});
export type LLMResponse = z.infer<typeof LLMResponseSchema>;
