"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useProjectsStore } from "@/lib/stores/projects";
import { PlanRail } from "@/components/plan/PlanRail";
import { ConversationPane } from "@/components/plan/ConversationPane";
import { CanvasPane } from "@/components/plan/CanvasPane";
import { StatePane } from "@/components/plan/StatePane";
import { SubAgentPanel } from "@/components/plan/SubAgentPanel";
import { StageTransition } from "@/components/plan/StageTransition";
import { GateBar } from "@/components/plan/GateBar";
import { postSSE } from "@/lib/client/sse";
import type { ConversationTurn, PlanSubStep } from "@novelwright/types";

type SubAgentKind = "redteam" | "outline-review";
type SubAgentState = "activating" | "streaming" | "complete";

interface SubAgentRunState {
  kind: SubAgentKind;
  state: SubAgentState;
  streamingContent: string;
}

/**
 * When the user enters a new sub-step with no conversation yet, we auto-trigger the agent
 * to open the dialogue (instead of waiting for the user to send first). The kickoff message
 * is sent server-side but NOT appended to the visible conversation — only the agent's reply
 * shows up.
 *
 * Idea stage stays manual (warm static greeting feels right for first contact).
 */
const KICKOFF_MESSAGES: Partial<Record<PlanSubStep, string>> = {
  world:
    "Begin worldbuilding. Based on the premise locked in above, open with 2-3 sharp questions that start deriving the world rules. Probe the laws of physics, society, or magic that the premise demands. Be specific — reference the premise, don't ask generic worldbuilding questions.",
  characters:
    "Begin character design. Based on the premise and world above, ask me about the protagonist first. Start with desire — what does the reader want to feel through them? — and then probe what makes this character irreplaceable. Reference our world rules.",
  plot:
    "Begin plot structure. Based on premise, world, and characters above, open by asking about the arc shape — what trajectory does the story need to traverse? Then probe the central question the plot must answer. Reference our characters specifically.",
};

export default function PlanView() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const project = useProjectsStore((s) => s.getProject(params.id));
  const appendTurn = useProjectsStore((s) => s.appendTurn);
  const appendSubAgentTurn = useProjectsStore((s) => s.appendSubAgentTurn);
  const applyStructuredUpdate = useProjectsStore((s) => s.applyStructuredUpdate);
  const advanceSubStep = useProjectsStore((s) => s.advanceSubStep);
  const advancePhase = useProjectsStore((s) => s.advancePhase);
  const addCost = useProjectsStore((s) => s.addCost);
  const [hydrated, setHydrated] = useState(false);
  const [streamingTurn, setStreamingTurn] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [subAgent, setSubAgent] = useState<SubAgentRunState | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [stageTransition, setStageTransition] = useState<{
    active: boolean;
    from: PlanSubStep | null;
    to: PlanSubStep | null;
  }>({ active: false, from: null, to: null });
  const previousSubStepRef = useRef<PlanSubStep | null>(null);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Sub-step transition ceremony — fires on each sub-step change.
  useEffect(() => {
    if (!hydrated || !project) return;
    const current = project.currentPlanSubStep;
    const prev = previousSubStepRef.current;
    if (prev !== null && prev !== current) {
      setStageTransition({ active: true, from: prev, to: current });
      const t = setTimeout(() => {
        setStageTransition({ active: false, from: null, to: null });
      }, 1500);
      previousSubStepRef.current = current;
      return () => clearTimeout(t);
    }
    previousSubStepRef.current = current;
  }, [hydrated, project?.currentPlanSubStep, project]);

  const subStep = project?.currentPlanSubStep ?? "idea";
  const conversation = project?.conversations[subStep] ?? [];

  // Auto-kickoff: when entering World/Characters/Plot with no conversation, trigger the agent
  // to open the dialogue. Idea stage keeps its warm static greeting.
  useEffect(() => {
    if (!hydrated || !project) return;
    if (isStreaming || subAgent || transitioning) return;
    if (conversation.length > 0) return;
    const kickoff = KICKOFF_MESSAGES[subStep];
    if (!kickoff) return;
    void runKickoff(kickoff);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, project?.id, subStep, conversation.length]);

  async function runKickoff(kickoffMessage: string) {
    if (!project) return;
    setIsStreaming(true);
    setStreamingTurn("");

    let accumulated = "";
    await postSSE(
      `/api/stages/${subStep}`,
      {
        userMessage: kickoffMessage,
        conversationHistory: [],
        premise: project.premise,
        setting: project.setting,
        characters: project.characters,
        story: project.story,
      },
      {
        onProseToken: (token) => {
          accumulated += token;
          setStreamingTurn(accumulated);
        },
        onStructuredUpdate: (stage, data) => {
          applyStructuredUpdate(project.id, stage as PlanSubStep, data);
        },
        onCostUpdate: ({ totalUsd }) => addCost(project.id, totalUsd),
        onComplete: (data) => {
          const usage = (data as { usage?: { costUsd?: number } }).usage;
          if (usage?.costUsd) addCost(project.id, usage.costUsd);
        },
        onError: (err) => {
          accumulated += `\n\n_⚠ Error: ${err}_`;
        },
      },
    );

    // Append a HIDDEN user turn first so subsequent API calls see proper user-then-model
    // alternation. Gemini rejects history that starts with a model role turn.
    appendTurn(project.id, subStep, {
      id: crypto.randomUUID(),
      role: "user",
      content: kickoffMessage,
      timestamp: new Date().toISOString(),
      hidden: true,
    });
    appendTurn(project.id, subStep, {
      id: crypto.randomUUID(),
      role: "agent",
      agent: "main",
      content: accumulated,
      timestamp: new Date().toISOString(),
    });
    setIsStreaming(false);
    setStreamingTurn("");
  }

  if (!hydrated) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--color-studio-text-muted)]">Loading project…</p>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6">
        <p className="text-xl mb-4 text-[var(--color-studio-text-secondary)]">
          That project doesn&apos;t exist anymore.
        </p>
        <Link href="/app/projects" className="text-[var(--color-accent-primary)]">
          ← Back to projects
        </Link>
      </main>
    );
  }

  // -- Main conversation handler --
  const handleSend = async (message: string) => {
    if (isStreaming || subAgent) return;
    const userTurn: ConversationTurn = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
    };
    appendTurn(project.id, subStep, userTurn);
    setIsStreaming(true);
    setStreamingTurn("");

    let accumulated = "";
    await postSSE(
      `/api/stages/${subStep}`,
      {
        userMessage: message,
        conversationHistory: [...conversation, userTurn],
        premise: project.premise,
        setting: project.setting,
        characters: project.characters,
        story: project.story,
      },
      {
        onProseToken: (token) => {
          accumulated += token;
          setStreamingTurn(accumulated);
        },
        onStructuredUpdate: (stage, data) => {
          applyStructuredUpdate(project.id, stage as PlanSubStep, data);
        },
        onCostUpdate: ({ totalUsd }) => addCost(project.id, totalUsd),
        onComplete: (data) => {
          const usage = (data as { usage?: { costUsd?: number } }).usage;
          if (usage?.costUsd) addCost(project.id, usage.costUsd);
        },
        onError: (err) => {
          accumulated += `\n\n_⚠ Error: ${err}_`;
        },
      },
    );

    appendTurn(project.id, subStep, {
      id: crypto.randomUUID(),
      role: "agent",
      agent: "main",
      content: accumulated,
      timestamp: new Date().toISOString(),
    });
    setIsStreaming(false);
    setStreamingTurn("");
  };

  // -- Sub-agent activation --
  const runSubAgent = async (kind: SubAgentKind) => {
    if (subAgent || isStreaming) return;
    setSubAgent({ kind, state: "activating", streamingContent: "" });
    await new Promise((r) => setTimeout(r, 3000)); // 3-second cinematic
    setSubAgent({ kind, state: "streaming", streamingContent: "" });

    let accumulated = "";
    await postSSE(
      `/api/stages/${kind}`,
      {
        premise: project.premise ?? {},
        setting: project.setting ?? {},
        characters: project.characters ?? [],
        ...(kind === "outline-review" ? { story: project.story ?? {} } : {}),
      },
      {
        onProseToken: (token) => {
          accumulated += token;
          setSubAgent((prev) =>
            prev ? { ...prev, state: "streaming", streamingContent: accumulated } : prev,
          );
        },
        onStructuredUpdate: (stage, data) => {
          applyStructuredUpdate(project.id, stage as "redteam" | "outline-review", data);
        },
        onCostUpdate: ({ totalUsd }) => addCost(project.id, totalUsd),
        onComplete: (data) => {
          const usage = (data as { usage?: { costUsd?: number } }).usage;
          if (usage?.costUsd) addCost(project.id, usage.costUsd);
        },
        onError: (err) => {
          accumulated += `\n\n_⚠ Error: ${err}_`;
        },
      },
    );

    appendSubAgentTurn(project.id, kind, {
      id: crypto.randomUUID(),
      role: "agent",
      agent: kind,
      content: accumulated,
      timestamp: new Date().toISOString(),
    });
    setSubAgent({ kind, state: "complete", streamingContent: accumulated });
  };

  const dismissSubAgent = () => setSubAgent(null);

  // -- Plan → Write transition --
  const handleApproveAndWrite = async () => {
    setTransitioning(true);
    await new Promise((r) => setTimeout(r, 1800));
    advancePhase(project.id, "write");
    router.push(`/app/projects/${project.id}/write`);
  };

  // -- Compute current sub-step CTA inline (closures over runSubAgent + advanceSubStep) --
  const cta = computeCTA();

  type CTADescriptor = {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    hint?: string | null;
    /** Visual accent for the CTA dot. "amber" = in-stage transition, "purple" = Red Team, "teal" = Outline Review. */
    accent?: "amber" | "purple" | "teal";
  };

  function computeCTA(): CTADescriptor | null {
    if (subAgent) return null; // sub-agent panel takes over
    const p = project!;

    if (subStep === "idea") {
      const ready = !!(
        p.premise?.hook &&
        p.premise?.coreDesire &&
        p.premise?.conflictDriver &&
        p.premise?.structuralLayer
      );
      return {
        label: "Continue to World",
        disabled: !ready,
        hint: ready ? null : "Need all four premise fields shaped first.",
        onClick: () => advanceSubStep(p.id, "world"),
        accent: "amber",
      };
    }

    if (subStep === "world") {
      const hasRules = (p.setting?.worldRules?.length ?? 0) >= 1;
      return {
        label: "Continue to Characters",
        disabled: !hasRules,
        hint: hasRules ? null : "Need at least one world rule derived first.",
        onClick: () => advanceSubStep(p.id, "characters"),
        accent: "amber",
      };
    }

    if (subStep === "characters") {
      const charsReady = (p.characters ?? []).filter((c) => c.name && c.role).length >= 1;
      if (!p.redTeamReport && charsReady) {
        return {
          label: "Continue to Red Team review",
          hint: "Independent destructive critique by a separate AI context.",
          onClick: () => runSubAgent("redteam"),
          accent: "purple",
        };
      }
      if (p.redTeamReport) {
        return {
          label: "Continue to Plot",
          onClick: () => advanceSubStep(p.id, "plot"),
          accent: "amber",
        };
      }
      return {
        label: "Continue to Red Team review",
        disabled: true,
        hint: "Need at least one character with name + role first.",
        onClick: () => {},
        accent: "purple",
      };
    }

    if (subStep === "plot") {
      const hasChunks = (p.story?.chunks?.length ?? 0) >= 1;
      if (!p.outlineReviewReport && hasChunks) {
        return {
          label: "Continue to Outline review",
          hint: "Independent Producer + Editor verdict.",
          onClick: () => runSubAgent("outline-review"),
          accent: "teal",
        };
      }
      if (p.outlineReviewReport) {
        return null; // GateBar takes over below
      }
      return {
        label: "Continue to Outline review",
        disabled: true,
        hint: "Need at least one Chunk defined first.",
        onClick: () => {},
        accent: "teal",
      };
    }

    return null;
  }

  const showGateBar =
    subStep === "plot" && !!project.outlineReviewReport && !subAgent;

  return (
    <main className="h-screen flex flex-col relative overflow-hidden">
      <header className="border-b border-[var(--color-studio-border-subtle)] px-6 py-3 flex items-center gap-6 z-10 bg-[var(--color-studio-base)]">
        <Link
          href="/app/projects"
          className="text-sm text-[var(--color-studio-text-muted)] hover:text-[var(--color-accent-primary)] shrink-0"
        >
          ← Projects
        </Link>
        <h1 className="text-base font-medium shrink-0" style={{ fontFamily: "var(--font-display)" }}>
          {project.title}
        </h1>
        <div className="flex-1">
          <PlanRail current={subStep} onSelect={(s) => advanceSubStep(project.id, s)} />
        </div>
      </header>

      {/*
        Layout v1.1: chat-centered.
        - LEFT (~25%): Canvas — fixed, scrolls only its own content if content overflows
        - MIDDLE (~55%): Conversation — the dominant column, ONLY this scrolls with the dialogue
        - RIGHT (~20%): State — fixed, narrow rail
      */}
      <div className="flex-1 grid grid-cols-[minmax(280px,25%)_1fr_minmax(240px,20%)] overflow-hidden relative">
        <CanvasPane subStep={subStep} project={project} />

        <div className="relative overflow-hidden border-x border-[var(--color-studio-border-subtle)]">
          <ConversationPane
            subStep={subStep}
            conversation={conversation}
            streamingContent={streamingTurn}
            isStreaming={isStreaming}
            onSend={handleSend}
          />

          {cta && !subAgent && (
            <div className="absolute bottom-[88px] inset-x-0 px-6 pt-6 pb-2 bg-gradient-to-t from-[var(--color-studio-base)] via-[var(--color-studio-base)]/95 to-transparent z-10 pointer-events-none">
              <div className="flex items-center justify-end gap-3 pointer-events-auto">
                {cta.hint && (
                  <p className="text-xs text-[var(--color-studio-text-muted)] mr-auto italic">
                    {cta.hint}
                  </p>
                )}
                <button
                  type="button"
                  onClick={cta.onClick}
                  disabled={cta.disabled}
                  className="group inline-flex items-center gap-2.5 px-5 py-2.5 rounded-md bg-[var(--color-accent-primary)] text-[var(--color-studio-base)] font-medium hover:bg-[var(--color-accent-glow)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{
                      backgroundColor:
                        cta.accent === "purple"
                          ? "var(--color-voice-redteam)"
                          : cta.accent === "teal"
                          ? "var(--color-voice-reviewer)"
                          : "var(--color-studio-base)",
                    }}
                    aria-hidden
                  />
                  {cta.label}
                </button>
              </div>
            </div>
          )}

          <AnimatePresence>
            {subAgent && (
              <SubAgentPanel
                agent={subAgent.kind}
                state={subAgent.state}
                streamingContent={subAgent.streamingContent}
                conversation={
                  subAgent.kind === "redteam"
                    ? project.redTeamConversation ?? []
                    : project.outlineReviewConversation ?? []
                }
                findings={
                  subAgent.kind === "redteam"
                    ? project.redTeamReport?.findings
                    : [
                        ...(project.outlineReviewReport?.producerFindings ?? []),
                        ...(project.outlineReviewReport?.editorFindings ?? []),
                      ]
                }
                producerScore={project.outlineReviewReport?.producerScore}
                editorScore={project.outlineReviewReport?.editorScore}
                onDismiss={dismissSubAgent}
              />
            )}
          </AnimatePresence>
        </div>

        <StatePane subStep={subStep} project={project} />
      </div>

      <AnimatePresence>
        {showGateBar && (
          <GateBar
            status={`Plan complete · ${(project.story?.chunks ?? []).length} chunks · ~${
              (project.story?.chunks ?? []).reduce((s, c) => s + (c.targetWords ?? 0), 0) || "?"
            } words. Ready to write.`}
            primaryLabel="Approve and start writing"
            onPrimary={handleApproveAndWrite}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>{transitioning && <ModeSwitchCeremony />}</AnimatePresence>

      {/* Sub-step transition ceremony (Idea -> World -> Characters -> Plot) */}
      <StageTransition
        active={stageTransition.active}
        fromStep={stageTransition.from}
        toStep={stageTransition.to}
      />
    </main>
  );
}

function ModeSwitchCeremony() {
  return (
    <motion.div
      className="absolute inset-0 z-50 pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="absolute inset-0 bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.6, times: [0, 0.3, 0.65, 1] }}
      />
      <motion.div
        className="absolute inset-0 bg-[var(--color-page-base)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0, 1, 1] }}
        transition={{ duration: 1.6, times: [0, 0.3, 0.7, 1] }}
      />
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0, 1, 1, 0] }}
        transition={{ duration: 1.8, times: [0, 0.4, 0.55, 0.85, 1] }}
      >
        <p
          className="text-2xl text-[var(--color-page-text-primary)] italic"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          The plan is yours. The prose begins now.
        </p>
      </motion.div>
    </motion.div>
  );
}
