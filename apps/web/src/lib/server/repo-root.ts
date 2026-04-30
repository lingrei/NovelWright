import path from "node:path";
import { existsSync } from "node:fs";

/**
 * Resolves the path to the NovelWright repo root (where CLAUDE.md, .claude/, .agent/ live).
 *
 * Resolution order:
 *   1. NOVELWRIGHT_REPO_ROOT env var (set in production)
 *   2. Walk up from process.cwd() looking for CLAUDE.md
 *
 * The PromptAssembler needs this to read .claude/commands/*.md and the knowledge base.
 */
export function getRepoRoot(): string {
  const envRoot = process.env.NOVELWRIGHT_REPO_ROOT;
  if (envRoot && existsSync(path.join(envRoot, "CLAUDE.md"))) {
    return envRoot;
  }

  // Walk up from cwd looking for the marker file.
  let current = process.cwd();
  for (let i = 0; i < 6; i++) {
    if (existsSync(path.join(current, "CLAUDE.md")) && existsSync(path.join(current, ".claude"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  throw new Error(
    "[repo-root] Could not locate NovelWright repo root. Set NOVELWRIGHT_REPO_ROOT env var or run from within the repo.",
  );
}
