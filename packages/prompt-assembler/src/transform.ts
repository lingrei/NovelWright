/**
 * Transforms .claude/commands/*.md content from Claude-Code-specific syntax into
 * general-purpose prompt directives.
 *
 * The original files assume an environment with Read/Write/Bash/Agent tools and use
 * directives like:
 *   📦 Load Skill: Read `.claude/commands/foo.md` and follow its guidance
 *   🔍 Schedule Sub-Agent: Use Agent tool to launch sub-agent
 *
 * In a stateless API context, these directives are nonsensical (no tools to invoke).
 * We strip them and replace with structural notes the model can interpret as
 * "treat the next section as your guidance" rather than "perform a tool call."
 */

const PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  // 📦 Load Skill blocks — these instruct Claude Code to read another command file.
  // In our context, we already inline-load the relevant content, so these markers can be removed.
  {
    pattern: /^.*📦\s*Load Skill:.*$/gm,
    replacement: "",
  },
  // 🔍 Schedule Sub-Agent blocks — sub-agents are scheduled by the orchestrator at the API level,
  // not by the model emitting a tool call. Remove these directives.
  {
    pattern: /^.*🔍\s*Schedule Sub-?Agent:.*$/gm,
    replacement: "",
  },
  // "Use the Agent tool to..." / "Use Read tool to..." imperative tool invocations.
  {
    pattern: /^.*Use (?:the )?(?:Agent|Read|Write|Bash|Edit|Glob|Grep) tool.*$/gim,
    replacement: "",
  },
  // "Use the Read tool to read `path/to/file`" — these are tool invocations the model can't perform.
  {
    pattern: /^.*read\s+`?\.claude\/commands\/[^`\s]+`?.*$/gim,
    replacement: "",
  },
  // Tool result placeholders like `tool_result:` blocks
  {
    pattern: /^>\s*tool_result:.*$/gm,
    replacement: "",
  },
];

export function stripClaudeCodeSyntax(content: string): string {
  let result = content;
  for (const { pattern, replacement } of PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  // Collapse 3+ consecutive blank lines back to max 2 (preserves readability after stripping).
  result = result.replace(/\n{3,}/g, "\n\n");
  return result.trim();
}

/**
 * Roughly estimate token count for cost forecasting.
 * Rule of thumb for English: ~4 characters per token. Good enough for budgeting; not for billing.
 */
export function approximateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
