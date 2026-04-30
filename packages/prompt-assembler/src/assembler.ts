import { promises as fs } from "node:fs";
import path from "node:path";
import { STAGE_CONFIG, type StageConfig } from "./stages";
import { approximateTokens, stripClaudeCodeSyntax } from "./transform";
import type { AssembledPrompt, AssemblyContext, Stage } from "./types";

/**
 * Reads .claude/commands/*.md, CLAUDE.md, and knowledge base files server-side, transforms them
 * into general-purpose prompts, and returns AssembledPrompt for any LLM provider to consume.
 */
export class PromptAssembler {
  private readonly fileCache = new Map<string, string>();

  /**
   * @param repoRoot Absolute path to the NovelWright repo root (where .claude/ and .agent/ live).
   */
  constructor(private readonly repoRoot: string) {}

  async assemble(stage: Stage, context: AssemblyContext): Promise<AssembledPrompt> {
    const config = STAGE_CONFIG[stage];

    // 1. Read constitutional prompt (always loaded).
    const constitution = await this.readFile(path.join(this.repoRoot, "CLAUDE.md"));

    // 2. Read command files for this stage, in order.
    const commandContents: string[] = [];
    for (const fileName of config.commandFiles) {
      const filePath = path.join(this.repoRoot, ".claude", "commands", fileName);
      const content = await this.readFile(filePath);
      commandContents.push(`<!-- ${fileName} -->\n${content}`);
    }

    // 3. Optionally load golden examples (always for Write phase, never for Plan).
    const goldenExamples: string[] = [];
    if (config.loadGoldenExamples) {
      const goldenDir = path.join(this.repoRoot, ".agent", "knowledge", "golden_examples");
      try {
        const files = await fs.readdir(goldenDir);
        for (const file of files.filter((f) => f.endsWith(".md"))) {
          const content = await this.readFile(path.join(goldenDir, file));
          goldenExamples.push(`<!-- golden_examples/${file} -->\n${content}`);
        }
      } catch (err) {
        // Directory may not exist in dev; warn but continue.
        console.warn(`[PromptAssembler] Could not load golden_examples: ${(err as Error).message}`);
      }
    }

    // 4. Optionally load craft references.
    const craftReferences: string[] = [];
    if (config.loadCraftReferences) {
      const craftDir = path.join(this.repoRoot, ".agent", "knowledge", "craft_references");
      try {
        const files = await fs.readdir(craftDir);
        for (const file of files.filter((f) => f.endsWith(".md"))) {
          const content = await this.readFile(path.join(craftDir, file));
          craftReferences.push(`<!-- craft_references/${file} -->\n${content}`);
        }
      } catch (err) {
        console.warn(`[PromptAssembler] Could not load craft_references: ${(err as Error).message}`);
      }
    }

    // 5. Assemble system prompt with preamble + constitution + commands + knowledge base.
    const systemPrompt = this.assembleSystemPrompt({
      stage,
      config,
      constitution: stripClaudeCodeSyntax(constitution),
      commandContents: commandContents.map(stripClaudeCodeSyntax),
      goldenExamples,
      craftReferences,
    });

    // 6. Build user prompt with artifacts injected.
    const userPrompt = this.buildUserPrompt(stage, context, config);

    // 7. Map conversation history (sub-agents skip this).
    const mappedHistory = config.isSubAgent
      ? undefined
      : context.conversationHistory?.map((turn) => ({
          role: turn.role === "user" ? ("user" as const) : ("model" as const),
          content: turn.content,
        }));

    return {
      systemPrompt,
      userPrompt,
      conversationHistory: mappedHistory,
      temperature: config.temperature,
      approximateInputTokens:
        approximateTokens(systemPrompt) +
        approximateTokens(userPrompt) +
        (mappedHistory?.reduce((sum, t) => sum + approximateTokens(t.content), 0) ?? 0),
    };
  }

  /**
   * Cached file read. Files are immutable for the lifetime of the process — safe to cache.
   * For hot-reload during dev, restart the orchestrator.
   */
  private async readFile(filePath: string): Promise<string> {
    if (this.fileCache.has(filePath)) {
      return this.fileCache.get(filePath)!;
    }
    const content = await fs.readFile(filePath, "utf-8");
    this.fileCache.set(filePath, content);
    return content;
  }

  private assembleSystemPrompt(args: {
    stage: Stage;
    config: StageConfig;
    constitution: string;
    commandContents: string[];
    goldenExamples: string[];
    craftReferences: string[];
  }): string {
    const { stage, config, constitution, commandContents, goldenExamples, craftReferences } = args;

    const parts: string[] = [];

    // Preamble: explain the runtime context to the model.
    parts.push(this.buildPreamble(stage, config));

    // Constitution: NovelWright's core aesthetic rules.
    parts.push("# === CONSTITUTION (CLAUDE.md) ===\n");
    parts.push(constitution);

    // Command files: stage-specific skill modules.
    parts.push("\n# === STAGE SKILLS ===\n");
    for (const cmd of commandContents) {
      parts.push(cmd);
    }

    // Knowledge base: golden examples + craft references for prose calibration.
    if (goldenExamples.length > 0) {
      parts.push("\n# === GOLDEN EXAMPLES (calibrate prose against these) ===\n");
      for (const ex of goldenExamples) {
        parts.push(ex);
      }
    }
    if (craftReferences.length > 0) {
      parts.push("\n# === CRAFT REFERENCES ===\n");
      for (const ref of craftReferences) {
        parts.push(ref);
      }
    }

    // Output expectations.
    parts.push("\n# === OUTPUT EXPECTATIONS FOR THIS TURN ===\n");
    parts.push(config.expectedOutputHint);

    return parts.join("\n");
  }

  private buildPreamble(stage: Stage, config: StageConfig): string {
    const subAgentNote = config.isSubAgent
      ? `
You are operating as an INDEPENDENT REVIEWER (sub-agent) for stage "${stage}". You have NOT seen the
conversation that produced the artifacts you're about to read. Treat them cold. Your value comes
precisely from this lack of shared context — be destructively honest where main-session bias would
lead to self-approval.`
      : "";

    return `You are NovelWright, a structured AI co-author for fiction writers.

You are running in a STATELESS API CONTEXT. You have NO tools — no Read, Write, Bash, or Agent
invocation. The original command files reference such tools; treat those references as descriptive
pseudo-code, not imperatives. Files have been pre-loaded into your context below.

You DO NOT need to "load" anything else. Everything you need is in this prompt.
${subAgentNote}

Current stage: ${stage}
Output language: English only
`;
  }

  private buildUserPrompt(stage: Stage, context: AssemblyContext, config: StageConfig): string {
    const parts: string[] = [];

    // Inject available artifacts into context.
    if (context.premise) {
      parts.push("## Current Premise\n" + JSON.stringify(context.premise, null, 2));
    }
    if (context.setting && (stage !== "world" || config.isSubAgent)) {
      parts.push("## Current Setting\n" + JSON.stringify(context.setting, null, 2));
    }
    if (context.characters && context.characters.length > 0) {
      parts.push(
        "## Current Characters\n" +
          context.characters.map((c) => JSON.stringify(c, null, 2)).join("\n\n"),
      );
    }
    if (context.story) {
      parts.push("## Current Plot Structure\n" + JSON.stringify(context.story, null, 2));
    }
    if (context.state) {
      parts.push("## Current 4D State\n" + JSON.stringify(context.state, null, 2));
    }
    if (context.draftTail) {
      parts.push("## Last Draft Excerpt (continuation anchor)\n" + context.draftTail);
    }
    if (context.currentChunkIndex != null) {
      parts.push(`## Currently working on Chunk ${context.currentChunkIndex}`);
    }

    // The actual user message (or sub-agent task description).
    if (config.isSubAgent) {
      parts.push(
        "## TASK\n" +
          (context.userMessage ||
            `Review the artifacts above for stage "${stage}" and return your independent findings.`),
      );
    } else {
      parts.push("## User Message\n" + context.userMessage);
    }

    return parts.join("\n\n");
  }
}
