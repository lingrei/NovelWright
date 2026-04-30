/**
 * @novelwright/prompt-assembler — Server-side adapter that converts `.claude/commands/*.md`
 * (which were written for Claude Code with Read/Write/Bash/Agent tools) into general-purpose
 * system prompts callable from any LLM API (Gemini, Claude API, OpenAI).
 *
 * The command files are the SINGLE SOURCE OF TRUTH for both the CLI agent and the web product.
 * This package transforms them at request time, never forks them.
 */

export { PromptAssembler } from "./assembler";
export type { AssembledPrompt, AssemblyContext, Stage } from "./types";
export { stripClaudeCodeSyntax } from "./transform";
