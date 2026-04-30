"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import type { ConversationTurn, PlanSubStep } from "@novelwright/types";

interface ConversationPaneProps {
  subStep: PlanSubStep;
  conversation: ConversationTurn[];
  streamingContent: string;
  isStreaming: boolean;
  onSend: (message: string) => void;
}

const SUB_STEP_GREETING: Record<PlanSubStep, { title: string; prompt: string }> = {
  idea: {
    title: "Tell me what you have.",
    prompt:
      "A scene? A character? A feeling? A what-if? Describe it in your own words — the rougher the better. We'll find the core together.",
  },
  world: {
    title: "Now we build the world this story needs.",
    prompt:
      "We'll derive every world rule from your premise. Tell me what you imagine the world looks like — physical, social, the laws that bend or break.",
  },
  characters: {
    title: "Who are the people inside this story?",
    prompt:
      "Start with one. The protagonist, or whoever's most alive in your head. We'll build them from desire, then derive everything else.",
  },
  plot: {
    title: "Now the plot — but not as outline.",
    prompt:
      "We're building a Chunk Timeline: each Chunk is a unit of action with its own intensity, beats, and emotional arc. Start by telling me the shape — where does this story end?",
  },
};

export function ConversationPane({
  subStep,
  conversation,
  streamingContent,
  isStreaming,
  onSend,
}: ConversationPaneProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation, streamingContent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setInput("");
  };

  // Filter hidden turns (e.g. auto-kickoff synthetic user message) from rendered list
  const visibleConversation = conversation.filter((t) => !t.hidden);

  const greeting = SUB_STEP_GREETING[subStep];
  const isEmpty = visibleConversation.length === 0 && !isStreaming;

  return (
    <section className="flex flex-col h-full overflow-hidden">
      <div
        ref={scrollRef}
        className="vibe-scroll flex-1 overflow-y-auto overflow-x-hidden px-8 py-10 [&_*]:break-words [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_code]:break-words"
      >
        {isEmpty && (
          <div className="max-w-xl mx-auto">
            <h2
              className="text-2xl mb-3 text-[var(--color-studio-text-primary)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {greeting.title}
            </h2>
            <p
              className="text-[var(--color-studio-text-secondary)] leading-relaxed"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {greeting.prompt}
            </p>
          </div>
        )}

        <div className="space-y-6 max-w-3xl mx-auto pb-32">
          {visibleConversation.map((turn) => (
            <Turn key={turn.id} turn={turn} />
          ))}
          {isStreaming && streamingContent && (
            <Turn
              turn={{
                id: "streaming",
                role: "agent",
                agent: "main",
                content: streamingContent,
                timestamp: new Date().toISOString(),
              }}
              isStreaming
            />
          )}
          {isStreaming && !streamingContent && (
            <div className="flex gap-3 items-center text-sm text-[var(--color-studio-text-muted)]">
              <span className="w-2 h-2 rounded-full bg-[var(--color-accent-primary)] animate-pulse" />
              <span>Thinking…</span>
            </div>
          )}
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-[var(--color-studio-border-subtle)] p-4"
      >
        <div className="flex gap-3 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={isStreaming ? "Agent is responding…" : "Reply…"}
            disabled={isStreaming}
            rows={1}
            className="flex-1 resize-none px-4 py-3 bg-[var(--color-studio-raised)] border border-[var(--color-studio-border-subtle)] rounded-md text-[var(--color-studio-text-primary)] focus:border-[var(--color-accent-primary)] focus:outline-none disabled:opacity-60 max-h-40"
            style={{ fontFamily: "var(--font-sans)" }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="px-4 py-3 rounded-md bg-[var(--color-accent-primary)] text-[var(--color-studio-base)] font-medium hover:bg-[var(--color-accent-glow)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </section>
  );
}

function Turn({ turn, isStreaming }: { turn: ConversationTurn; isStreaming?: boolean }) {
  const isUser = turn.role === "user";
  const agentColor =
    turn.agent === "redteam"
      ? "border-l-[var(--color-voice-redteam)]"
      : turn.agent === "outline-review" || turn.agent === "chunk-review" || turn.agent === "full-audit"
      ? "border-l-[var(--color-voice-reviewer)]"
      : "border-l-[var(--color-accent-primary)]";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-[var(--color-studio-raised)] border border-[var(--color-studio-border-subtle)] rounded-lg px-4 py-3 text-[var(--color-studio-text-primary)]">
          <p className="whitespace-pre-wrap">{turn.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("border-l-2 pl-4", agentColor)}>
      {turn.agent && turn.agent !== "main" && (
        <p className="text-xs uppercase tracking-wider mb-2 text-[var(--color-voice-redteam)]">
          {turn.agent.replace("-", " ")} · independent context
        </p>
      )}
      <div
        className={cn(
          "prose prose-invert prose-sm max-w-none",
          "prose-headings:text-[var(--color-studio-text-primary)]",
          "prose-p:text-[var(--color-studio-text-primary)]",
          "prose-strong:text-[var(--color-studio-text-primary)]",
          "prose-em:text-[var(--color-studio-text-secondary)]",
          "prose-a:text-[var(--color-accent-primary)]",
          "prose-code:text-[var(--color-accent-glow)]",
        )}
        style={{ fontFamily: "var(--font-serif)" }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{turn.content}</ReactMarkdown>
      </div>
      {isStreaming && (
        <span className="inline-block w-2 h-4 bg-[var(--color-accent-primary)] ml-1 animate-pulse" />
      )}
    </div>
  );
}
