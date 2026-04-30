"use client";

/**
 * Tiny SSE-stream reader for the Plan view + Write view.
 *
 * Calls the server endpoint with POST + JSON body (Next.js API routes don't natively
 * support EventSource because EventSource is GET-only). Uses fetch streaming + manual
 * parsing of "data: ..." lines.
 */

export interface SSEHandlers {
  onProseToken?: (token: string) => void;
  onStructuredUpdate?: (stage: string, data: unknown) => void;
  onPhaseStart?: (phase: string, chunkIndex?: number) => void;
  onPhaseEnd?: (phase: string, chunkIndex?: number) => void;
  onChunkStart?: (info: { chunkIndex: number; title: string; targetWords: number }) => void;
  onChunkEnd?: (info: { chunkIndex: number; wordCount: number }) => void;
  onCostUpdate?: (info: { inputTokens: number; outputTokens: number; totalUsd: number }) => void;
  onComplete?: (data: unknown) => void;
  onError?: (message: string) => void;
}

export async function postSSE(
  url: string,
  body: unknown,
  handlers: SSEHandlers,
  abortSignal?: AbortSignal,
): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: abortSignal,
  });

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => "Unknown");
    handlers.onError?.(`Server error (${response.status}): ${text}`);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      if (!rawEvent.startsWith("data: ")) continue;
      const payload = rawEvent.slice(6).trim();
      if (!payload) continue;
      try {
        const event = JSON.parse(payload);
        dispatch(event, handlers);
      } catch (parseErr) {
        console.warn("[postSSE] Could not parse SSE event:", parseErr, payload.slice(0, 120));
      }
    }
  }
}

function dispatch(event: unknown, handlers: SSEHandlers) {
  if (!event || typeof event !== "object") return;
  const e = event as { type?: string; [k: string]: unknown };
  switch (e.type) {
    case "prose-token":
      handlers.onProseToken?.(e.token as string);
      break;
    case "structured-update":
      handlers.onStructuredUpdate?.(e.stage as string, e.data);
      break;
    case "phase-start":
      handlers.onPhaseStart?.(e.phase as string, e.chunkIndex as number | undefined);
      break;
    case "phase-end":
      handlers.onPhaseEnd?.(e.phase as string, e.chunkIndex as number | undefined);
      break;
    case "chunk-start":
      handlers.onChunkStart?.({
        chunkIndex: e.chunkIndex as number,
        title: e.title as string,
        targetWords: e.targetWords as number,
      });
      break;
    case "chunk-end":
      handlers.onChunkEnd?.({
        chunkIndex: e.chunkIndex as number,
        wordCount: e.wordCount as number,
      });
      break;
    case "cost-update":
      handlers.onCostUpdate?.({
        inputTokens: e.inputTokens as number,
        outputTokens: e.outputTokens as number,
        totalUsd: e.totalUsd as number,
      });
      break;
    case "complete":
      handlers.onComplete?.(e);
      break;
    case "error":
      handlers.onError?.((e.message as string) ?? "Unknown error");
      break;
  }
}
