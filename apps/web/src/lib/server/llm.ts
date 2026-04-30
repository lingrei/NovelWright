import { GeminiProvider } from "@novelwright/llm-adapter";
import type { LLMProvider } from "@novelwright/llm-adapter";

let cachedProvider: LLMProvider | null = null;

/**
 * Singleton Gemini provider for the web app.
 * Reads GEMINI_API_KEY from env at first call. Throws if missing.
 */
export function getLLMProvider(): LLMProvider {
  if (cachedProvider) return cachedProvider;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "your-gemini-key-here") {
    throw new Error(
      "[llm] GEMINI_API_KEY is not set. Add it to apps/web/.env.local — see .env.example for format.",
    );
  }

  const defaultModel = process.env.GEMINI_MODEL || "gemini-2.5-pro";

  cachedProvider = new GeminiProvider({ apiKey, defaultModel });
  return cachedProvider;
}
