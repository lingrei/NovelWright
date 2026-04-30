import { PromptAssembler } from "@novelwright/prompt-assembler";
import { getRepoRoot } from "./repo-root";

let cachedAssembler: PromptAssembler | null = null;

/**
 * Singleton PromptAssembler bound to the resolved repo root.
 */
export function getPromptAssembler(): PromptAssembler {
  if (cachedAssembler) return cachedAssembler;
  cachedAssembler = new PromptAssembler(getRepoRoot());
  return cachedAssembler;
}
