import type { Stage } from "./types";

/**
 * Maps each Stage to:
 *   - the relevant command file paths (relative to .claude/commands/)
 *   - whether it's a sub-agent (no main conversation history)
 *   - whether it should load golden_examples for prose calibration
 *   - whether it should load craft_references
 *   - default temperature
 *   - expected output hint (instructs the model on conversational style + the structured tail)
 */

export interface StageConfig {
  commandFiles: string[];
  isSubAgent: boolean;
  loadGoldenExamples: boolean;
  loadCraftReferences: boolean;
  temperature: number;
  expectedOutputHint: string;
}

/**
 * The structured-extraction marker every stage uses at the end of its output.
 * The PromptAssembler injects this as a strict closing protocol.
 */
const STRUCTURED_TAIL_PROTOCOL = `

# === STRUCTURED OUTPUT PROTOCOL (MANDATORY for every reply) ===

After your conversational response, end your message with a JSON metadata block in EXACTLY this format:

<<<NW_DATA>>>
{ ...JSON object matching the stage schema below... }
<<<END_DATA>>>

Rules:
- The marker tags must be on their own lines, exact characters: <<<NW_DATA>>> and <<<END_DATA>>>
- Inside the markers: pure JSON, no \`\`\` fences, no commentary
- Only include fields you can extract with confidence from the conversation so far
- Empty/uncertain fields must be omitted entirely (do not include null or empty strings)
- This block is invisible to the user — its purpose is to update the live document panel beside the conversation
- The conversational reply BEFORE the marker is what the user reads. Make it warm, probing, generative.

If nothing has changed worth recording in the structured block, still emit the markers with an empty object {}.
`;

const IDEA_SCHEMA = `
Schema for stage "idea" — emit only fields with confident values:
{
  "premise": {
    "hook": "one sentence — what makes a reader pick this up",
    "coreDesire": "the emotional experience the reader is hungry for",
    "conflictDriver": "why the central conflict happens",
    "structuralLayer": "the relationship architecture that carries the story"
  },
  "readyToAdvance": true | false  // true ONLY when all four premise fields are confidently established and the user has explicitly confirmed
}`;

const WORLD_SCHEMA = `
Schema for stage "world":
{
  "setting": {
    "premise": {
      "hook": "...",
      "coreDesire": "...",
      "conflictDriver": "...",
      "structuralLayer": "...",
      "protagonistPositioning": "Empathy vessel | Outsider observation | etc.",
      "climaxShape": "what the core premise looks like when fulfilled",
      "derivationChainTrace": "L0→L5 reasoning in narrative form"
    },
    "narrativeVoice": {
      "narrator": "Close third | First person | Omniscient | etc.",
      "languageStyle": "rhythm + temperature + literariness in prose",
      "allowedLensModes": ["PHYSICAL" | "SUBJECTIVE" | "NARRATOR"]
    },
    "worldRules": [
      { "id": "wr1", "rule": "the rule itself", "serves": "what premise level it serves", "lossIfRemoved": "what story loses without it" }
    ],
    "overview": {
      "typeLength": "Short story | Novella | Novel + word count",
      "timeline": "temporal scope",
      "tone": "foundational tone"
    }
  },
  "readyToAdvance": true | false
}`;

const CHARACTERS_SCHEMA = `
Schema for stage "characters" — emit the FULL characters array each time (the latest snapshot of all characters known so far):
{
  "characters": [
    {
      "id": "c1",
      "name": "Character Name",
      "role": "Protagonist | Mentor | Antagonist | etc.",
      "desirePositioning": { "coreDesire": "...", "irreplaceability": "..." },
      "appearance": { "face": "...", "build": "...", "aura": "...", "distinctiveness": 8 },
      "personality": { "surface": "...", "interior": "...", "gap": "..." },
      "situation": { "identity": "...", "tensionSource": "...", "deleteTest": "..." },
      "physicalPresenceProfile": [
        { "trait": "Hands", "physicalQuality": "...", "narrativeFunction": "...", "changeTrajectory": "Phase 1 → 3 → 5" }
      ],
      "anchorBehaviors": [
        { "name": "...", "phase1": "Setup state", "phase3": "Crisis state", "phase5": "Resolution state" }
      ],
      "voiceDNA": { "rhythm": "...", "vocabulary": "...", "signaturePattern": "...", "notes": "..." }
    }
  ],
  "readyForRedTeam": true | false  // true when at least the protagonist has all major fields populated and the user wants destructive review
}`;

const PLOT_SCHEMA = `
Schema for stage "plot":
{
  "story": {
    "spine": { "corePremise": "...", "arcShape": "e.g. pressure cooker → crack → rebuild", "timeline": "..." },
    "chunks": [
      {
        "index": 1,
        "title": "Chunk title",
        "status": "pending",
        "timeline": "when/where",
        "targetWords": 2000,
        "anchorPoints": [{ "anchorName": "...", "stateInChunk": "..." }],
        "stateFlow": "ENTRY → PIVOT → EXIT description",
        "intensityTier": 3,
        "focus": "what the reader experiences most vividly",
        "beats": [
          { "number": "1.1", "content": "...", "dilation": 5, "focus": "..." }
        ],
        "emotionCurve": { "entry": "...", "peakBeat": "1.2", "peakPositionPct": 50, "exit": "...", "interrupted": false }
      }
    ],
    "globalArcTracking": {
      "anchorBehaviorProgression": [{ "anchor": "...", "progression": ["C1 state", "C2 state", "..."] }],
      "emotionalArc": ["C1: ...", "C2: ..."]
    }
  },
  "readyForOutlineReview": true | false
}`;

const REDTEAM_SCHEMA = `
Schema for sub-agent "redteam":
{
  "findings": [
    {
      "id": "rt1",
      "severity": "critical | warning | info",
      "location": "Which character or design element",
      "issue": "specific failure mode you found",
      "suggestion": "concrete fix the user can apply"
    }
  ],
  "summary": "1-2 sentence overall verdict"
}
The conversational reply (before the marker) is the human-readable critique. The structured block is the actionable list.`;

const OUTLINE_REVIEW_SCHEMA = `
Schema for sub-agent "outline-review":
{
  "producerScore": 7,
  "editorScore": 8,
  "producerFindings": [{"id": "p1", "severity": "warning", "location": "Chunk 2", "issue": "...", "suggestion": "..."}],
  "editorFindings": [{"id": "e1", "severity": "critical", "location": "Causal chain Chunk 3 → 4", "issue": "...", "suggestion": "..."}],
  "summary": "Producer + Editor combined verdict in 1-2 sentences. State whether ready for W4."
}`;

const NULL_SCHEMA = `
Schema: emit empty object {} for the structured block.`;

export const STAGE_CONFIG: Record<Stage, StageConfig> = {
  idea: {
    commandFiles: ["idea-engine.md"],
    isSubAgent: false,
    loadGoldenExamples: false,
    loadCraftReferences: false,
    temperature: 0.85,
    expectedOutputHint:
      `Engage in conversational dialogue. Ask probing questions to extract the user's emotional core and narrative mechanism. Be lyrical, probing, generative. Once the four Premise fields are clear, surface them in the structured tail.\n${STRUCTURED_TAIL_PROTOCOL}\n${IDEA_SCHEMA}`,
  },
  world: {
    commandFiles: ["story-engine.md", "voice-engine.md"],
    isSubAgent: false,
    loadGoldenExamples: false,
    loadCraftReferences: false,
    temperature: 0.7,
    expectedOutputHint:
      `Guide the user through worldbuilding via the Derivation Chain. Each World Rule must trace upward to the Core Premise — show this reasoning in your prose. Output should converge on a populated Setting Codex.\n${STRUCTURED_TAIL_PROTOCOL}\n${WORLD_SCHEMA}`,
  },
  characters: {
    commandFiles: ["character-engine.md", "voice-engine.md"],
    isSubAgent: false,
    loadGoldenExamples: false,
    loadCraftReferences: false,
    temperature: 0.75,
    expectedOutputHint:
      `Design each character with explicit derivation reasoning. Each character must pass the Irreplaceability Test before continuing. Voice DNA should reveal personality, not announce it.\n${STRUCTURED_TAIL_PROTOCOL}\n${CHARACTERS_SCHEMA}`,
  },
  plot: {
    commandFiles: ["plot-structure.md", "narrative-dynamics.md"],
    isSubAgent: false,
    loadGoldenExamples: false,
    loadCraftReferences: false,
    temperature: 0.7,
    expectedOutputHint:
      `Build the plot as a Chunk Timeline with closed causal chains. Each Chunk has anchor points, state flow, intensity tier, focus, beats with dilation levels, and an emotion curve. Verify causality has no breaks.\n${STRUCTURED_TAIL_PROTOCOL}\n${PLOT_SCHEMA}`,
  },
  redteam: {
    commandFiles: ["redteam-agent.md"],
    isSubAgent: true,
    loadGoldenExamples: false,
    loadCraftReferences: false,
    temperature: 0.6,
    expectedOutputHint:
      `You are an INDEPENDENT REVIEWER. You have NOT seen the conversation that produced these characters. Read the artifacts cold. Be destructively honest. Find logical breaks, irreplaceability failures, depth gaps. Each finding must be specific and actionable.\n${STRUCTURED_TAIL_PROTOCOL}\n${REDTEAM_SCHEMA}`,
  },
  "outline-review": {
    commandFiles: ["outline-review-agent.md"],
    isSubAgent: true,
    loadGoldenExamples: false,
    loadCraftReferences: false,
    temperature: 0.6,
    expectedOutputHint:
      `You are an INDEPENDENT REVIEWER playing two roles: Producer (commercial — hook clear? pacing engaging? boring gaps?) and Editor (craft — causality closed? arcs complete? dumbed-down character behavior?). Write your prose verdict, then the structured block.\n${STRUCTURED_TAIL_PROTOCOL}\n${OUTLINE_REVIEW_SCHEMA}`,
  },
  "chunk-review": {
    commandFiles: ["review-agent.md", "prose-auditor.md"],
    isSubAgent: true,
    loadGoldenExamples: true,
    loadCraftReferences: false,
    temperature: 0.5,
    expectedOutputHint:
      `Audit the Chunk's prose against 5 layers: Format / Logical / Prose Quality / Character Consistency / Voice Consistency. Return a fix list. The user does NOT see this — your output is consumed by the orchestrator.\n${STRUCTURED_TAIL_PROTOCOL}\n${NULL_SCHEMA}`,
  },
  "full-audit": {
    commandFiles: ["full-audit.md"],
    isSubAgent: true,
    loadGoldenExamples: true,
    loadCraftReferences: false,
    temperature: 0.5,
    expectedOutputHint:
      `Whole-manuscript editorial pass. Check global consistency, voice drift, pacing, sensory distribution, structural closure. Return prioritized fix list.\n${STRUCTURED_TAIL_PROTOCOL}\n${NULL_SCHEMA}`,
  },
  "write-plan": {
    commandFiles: ["chunk-planner.md"],
    isSubAgent: false,
    loadGoldenExamples: false,
    loadCraftReferences: false,
    temperature: 0.5,
    expectedOutputHint:
      `Produce a Chunk Plan: Boundary Check / 4D State Inheritance / Beat → Batch derivation / Craft Reference loading / Emotion Curve. Hard constraint: max 2 Beats per Batch; Dilation 7+ Beats are SOLO. Output the plan as markdown — no structured tail needed.`,
  },
  "write-prose": {
    commandFiles: ["camera-os.md", "writing.md"],
    isSubAgent: false,
    loadGoldenExamples: true,
    loadCraftReferences: true,
    temperature: 0.85,
    expectedOutputHint:
      `Write the prose for this Batch. Pure prose only — no metadata, no thinking blocks, no JSON, no markers. Continue seamlessly from the previous Batch. End with a Shutter Cut (filmable physical image). Respect all KILL LIST constraints and the Sensory Utility Dual Test. Do NOT emit the <<<NW_DATA>>> block in this stage.`,
  },
  "write-consolidate": {
    commandFiles: ["consolidation-engine.md"],
    isSubAgent: false,
    loadGoldenExamples: false,
    loadCraftReferences: false,
    temperature: 0.3,
    expectedOutputHint:
      `Merge the Batches into a single Chunk and update 4D state. Output the consolidated prose followed by an updated state summary in the structured tail.\n${STRUCTURED_TAIL_PROTOCOL}\nSchema: { "fourDStateUpdate": { "meta": [...], "pov": {...}, "physical": [...], "irreversible": [...] } }`,
  },
};
