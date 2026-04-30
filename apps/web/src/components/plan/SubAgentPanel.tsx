"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ConversationTurn, Finding } from "@novelwright/types";

interface SubAgentPanelProps {
  agent: "redteam" | "outline-review";
  state: "activating" | "streaming" | "complete";
  streamingContent: string;
  conversation: ConversationTurn[];
  findings?: Finding[];
  producerScore?: number;
  editorScore?: number;
  onDismiss: () => void;
}

const AGENT_META: Record<
  SubAgentPanelProps["agent"],
  { name: string; tagline: string; colorVar: string }
> = {
  redteam: {
    name: "Red Team",
    tagline: "Independent destructive reviewer",
    colorVar: "var(--color-voice-redteam)",
  },
  "outline-review": {
    name: "Outline Review",
    tagline: "Producer + Editor independent verdict",
    colorVar: "var(--color-voice-reviewer)",
  },
};

/**
 * Sliding panel that visualizes sub-agent activity. The 3-second activation cinematic
 * (canvas dim → file-sharing line → panel slide-in) is part of the parent's transition.
 */
export function SubAgentPanel({
  agent,
  state,
  streamingContent,
  conversation,
  findings,
  producerScore,
  editorScore,
  onDismiss,
}: SubAgentPanelProps) {
  const meta = AGENT_META[agent];
  const accent = meta.colorVar;

  return (
    <motion.aside
      initial={{ x: "100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "100%", opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="absolute inset-y-0 right-0 w-[480px] bg-[var(--color-studio-overlay)] border-l-2 z-20 flex flex-col overflow-hidden shadow-2xl"
      style={{ borderLeftColor: accent }}
    >
      <header className="px-6 py-5 border-b border-[var(--color-studio-border-subtle)]">
        <div className="flex items-center gap-3 mb-2">
          <span
            className="text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded font-semibold"
            style={{ color: accent, backgroundColor: `${accent}20` }}
          >
            Independent context
          </span>
          {state === "complete" && (
            <button
              onClick={onDismiss}
              className="ml-auto text-sm text-[var(--color-studio-text-muted)] hover:text-[var(--color-studio-text-primary)]"
            >
              Close
            </button>
          )}
        </div>
        <h3 className="text-xl" style={{ fontFamily: "var(--font-display)", color: accent }}>
          {meta.name}
        </h3>
        <p className="text-xs text-[var(--color-studio-text-secondary)] mt-1">{meta.tagline}</p>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {state === "activating" && <ActivationCinematic accent={accent} />}

        {state !== "activating" && (
          <div className="space-y-6">
            {conversation.map((turn) => (
              <SubAgentTurn key={turn.id} turn={turn} accent={accent} />
            ))}
            {state === "streaming" && streamingContent && (
              <SubAgentTurn
                turn={{
                  id: "streaming",
                  role: "agent",
                  agent,
                  content: streamingContent,
                  timestamp: new Date().toISOString(),
                }}
                accent={accent}
                isStreaming
              />
            )}

            {/* Findings list when complete */}
            {state === "complete" && (
              <FindingsList
                agent={agent}
                findings={findings ?? []}
                producerScore={producerScore}
                editorScore={editorScore}
              />
            )}
          </div>
        )}
      </div>
    </motion.aside>
  );
}

function ActivationCinematic({ accent }: { accent: string }) {
  // 3 staged messages cycling through during the ~3s pre-stream window
  const stages = [
    "Loading independent reviewer…",
    "Sharing only artifact files (not conversation history)…",
    "Reading cold. No bias. Beginning critique.",
  ];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setIdx(1), 900);
    const t2 = setTimeout(() => setIdx(2), 1900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] py-12">
      <div className="relative mb-8">
        <span
          className="block w-12 h-12 rounded-full opacity-40 animate-pulse"
          style={{ backgroundColor: accent }}
        />
        <span
          className="absolute inset-0 w-12 h-12 rounded-full"
          style={{ backgroundColor: accent }}
        />
      </div>
      <AnimatePresence mode="wait">
        <motion.p
          key={idx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="text-sm text-[var(--color-studio-text-secondary)] italic text-center"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {stages[idx]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

function SubAgentTurn({
  turn,
  accent,
  isStreaming,
}: {
  turn: ConversationTurn;
  accent: string;
  isStreaming?: boolean;
}) {
  return (
    <div className="border-l-2 pl-4" style={{ borderColor: accent }}>
      <div
        className="prose prose-invert prose-sm max-w-none"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{turn.content}</ReactMarkdown>
      </div>
      {isStreaming && (
        <span
          className="inline-block w-2 h-4 ml-1 animate-pulse"
          style={{ backgroundColor: accent }}
        />
      )}
    </div>
  );
}

function FindingsList({
  agent,
  findings,
  producerScore,
  editorScore,
}: {
  agent: "redteam" | "outline-review";
  findings: Finding[];
  producerScore?: number;
  editorScore?: number;
}) {
  const grouped = {
    critical: findings.filter((f) => f.severity === "critical"),
    warning: findings.filter((f) => f.severity === "warning"),
    info: findings.filter((f) => f.severity === "info"),
  };

  return (
    <div className="border-t border-[var(--color-studio-border-subtle)] pt-6 mt-4 space-y-4">
      {agent === "outline-review" && producerScore != null && editorScore != null && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <ScoreCard label="Producer" score={producerScore} />
          <ScoreCard label="Editor" score={editorScore} />
        </div>
      )}
      {grouped.critical.length > 0 && (
        <FindingGroup label="Must address" findings={grouped.critical} severity="critical" />
      )}
      {grouped.warning.length > 0 && (
        <FindingGroup label="Recommend" findings={grouped.warning} severity="warning" />
      )}
      {grouped.info.length > 0 && (
        <FindingGroup label="Note" findings={grouped.info} severity="info" />
      )}
      {findings.length === 0 && (
        <p className="text-sm text-[var(--color-studio-text-muted)] italic">
          No structured findings extracted from this review.
        </p>
      )}
    </div>
  );
}

function ScoreCard({ label, score }: { label: string; score: number }) {
  return (
    <div className="bg-[var(--color-studio-raised)] rounded-md px-4 py-3 border border-[var(--color-studio-border-subtle)]">
      <p className="text-xs text-[var(--color-studio-text-muted)] uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-2xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
        {score}
        <span className="text-sm text-[var(--color-studio-text-muted)] ml-1">/10</span>
      </p>
    </div>
  );
}

function FindingGroup({
  label,
  findings,
  severity,
}: {
  label: string;
  findings: Finding[];
  severity: "critical" | "warning" | "info";
}) {
  const colorVar =
    severity === "critical"
      ? "var(--color-signal-critical)"
      : severity === "warning"
      ? "var(--color-signal-warning)"
      : "var(--color-signal-success)";

  return (
    <div>
      <p
        className="text-xs uppercase tracking-wider mb-2 font-semibold"
        style={{ color: colorVar }}
      >
        {label} · {findings.length}
      </p>
      <ul className="space-y-2">
        {findings.map((f) => (
          <li
            key={f.id}
            className={cn(
              "p-3 rounded-md border text-sm bg-[var(--color-studio-raised)]/50",
            )}
            style={{ borderColor: `${colorVar}40` }}
          >
            <p className="text-xs text-[var(--color-studio-text-muted)] mb-1">{f.location}</p>
            <p className="text-[var(--color-studio-text-primary)] mb-1">{f.issue}</p>
            {f.suggestion && (
              <p className="text-[var(--color-studio-text-secondary)] italic">
                → {f.suggestion}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
