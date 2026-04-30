import type { LLMStreamChunk } from "@novelwright/llm-adapter";

/**
 * Wraps an LLM token stream and splits it into:
 *   - prose tokens (forwarded incrementally to the client for typewriter rendering)
 *   - a trailing structured JSON block (parsed once, emitted as a single event)
 *
 * The model is instructed (via the prompt assembler) to end its output with:
 *   <<<NW_DATA>>>
 *   { ...JSON... }
 *   <<<END_DATA>>>
 *
 * This helper detects the marker mid-stream, stops forwarding prose, and parses the JSON at end.
 * A small character holdback prevents partial-marker text from leaking into the prose UI.
 */

const MARKER_START = "<<<NW_DATA>>>";
const MARKER_END = "<<<END_DATA>>>";
const HOLDBACK_CHARS = MARKER_START.length + 4;

export type StructuredEvent =
  | { type: "prose"; token: string }
  | { type: "structured"; data: unknown }
  | { type: "usage"; inputTokens: number; outputTokens: number };

export async function* splitProseAndStructured(
  source: AsyncIterable<LLMStreamChunk>,
): AsyncIterable<StructuredEvent> {
  let buffer = "";
  let streamedUpTo = 0;
  let markerStartIdx: number | null = null;
  let lastInputTokens = 0;
  let lastOutputTokens = 0;

  for await (const chunk of source) {
    if (chunk.delta) buffer += chunk.delta;
    if (chunk.inputTokens != null) lastInputTokens = chunk.inputTokens;
    if (chunk.outputTokens != null) lastOutputTokens = chunk.outputTokens;

    if (markerStartIdx === null) {
      const idx = buffer.indexOf(MARKER_START);
      if (idx !== -1) {
        // Marker located. Flush prose up to it, stop streaming further prose.
        const tail = buffer.slice(streamedUpTo, idx);
        if (tail.length > 0) {
          yield { type: "prose", token: tail };
        }
        markerStartIdx = idx;
        streamedUpTo = idx;
      } else {
        // No marker yet — stream up to a safe boundary (holdback for partial marker).
        const safeIdx = buffer.length - HOLDBACK_CHARS;
        if (safeIdx > streamedUpTo) {
          const piece = buffer.slice(streamedUpTo, safeIdx);
          if (piece.length > 0) {
            yield { type: "prose", token: piece };
          }
          streamedUpTo = safeIdx;
        }
      }
    }

    if (chunk.done) {
      // Final flush + structured parse.
      if (markerStartIdx === null) {
        // No structured block emitted. Flush remaining prose.
        const tail = buffer.slice(streamedUpTo);
        if (tail.length > 0) {
          yield { type: "prose", token: tail };
        }
      } else {
        const jsonStart = markerStartIdx + MARKER_START.length;
        const endIdx = buffer.indexOf(MARKER_END, jsonStart);
        const jsonRaw =
          endIdx !== -1 ? buffer.slice(jsonStart, endIdx) : buffer.slice(jsonStart);

        // Models sometimes wrap JSON in ```json ... ``` even though we asked them not to.
        const cleaned = jsonRaw.trim().replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");

        try {
          const parsed = JSON.parse(cleaned);
          yield { type: "structured", data: parsed };
        } catch (err) {
          console.warn(
            `[structured-stream] Failed to parse JSON between markers: ${(err as Error).message}\nRaw:\n${cleaned.slice(0, 500)}`,
          );
        }
      }
      yield { type: "usage", inputTokens: lastInputTokens, outputTokens: lastOutputTokens };
    }
  }
}
