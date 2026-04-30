"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Character,
  ConversationTurn,
  OutlineReviewReport,
  Phase,
  PlanSubStep,
  Premise,
  RedTeamReport,
  Setting,
  Story,
} from "@novelwright/types";

/**
 * Client-side project state (localStorage-backed).
 *
 * v1: project state lives entirely in browser.
 * v1.5+ may add cloud sync via accounts.
 */

export interface ProjectRecord {
  id: string;
  title: string;
  currentPhase: Phase;
  currentPlanSubStep: PlanSubStep;
  // Per-sub-step conversation
  conversations: Partial<Record<PlanSubStep, ConversationTurn[]>>;
  // Artifacts as they grow (all optional/partial — populated by structured-update events)
  premise?: Partial<Premise>;
  setting?: Partial<Setting>;
  characters?: Array<Partial<Character>>;
  story?: Partial<Story>;
  // Sub-agent reports (when triggered)
  redTeamReport?: RedTeamReport;
  outlineReviewReport?: OutlineReviewReport;
  redTeamConversation?: ConversationTurn[];
  outlineReviewConversation?: ConversationTurn[];
  // Write-phase output
  manuscript?: {
    chunks: Array<{
      index: number;
      title: string;
      prose: string;
      wordCount: number;
      reviewFindings?: string | null;
    }>;
    totalWords: number;
    totalCost: number;
    completedAt?: string;
    /** v1.5: post-Write whole-manuscript editorial audit (markdown text) */
    fullAuditFindings?: string | null;
  };
  // Cost tracking (dev-mode visible)
  costAccum?: number;
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

interface ProjectsStore {
  projects: ProjectRecord[];

  createProject: (title: string) => ProjectRecord;
  getProject: (id: string) => ProjectRecord | undefined;
  updateProject: (id: string, updater: (draft: ProjectRecord) => void) => void;
  deleteProject: (id: string) => void;

  /** Duplicate a project — copies plan + (optionally) manuscript. */
  duplicateProject: (id: string, opts?: { suffix?: string }) => ProjectRecord | undefined;
  /** Fork a project at a specific chunk index. Plan is copied, manuscript is truncated to chunks 1..forkAtIndex-1. */
  forkProjectAtChunk: (id: string, forkAtIndex: number) => ProjectRecord | undefined;

  appendTurn: (id: string, subStep: PlanSubStep, turn: ConversationTurn) => void;
  appendSubAgentTurn: (id: string, agent: "redteam" | "outline-review", turn: ConversationTurn) => void;

  applyStructuredUpdate: (
    id: string,
    stage: PlanSubStep | "redteam" | "outline-review",
    data: unknown,
  ) => void;

  advanceSubStep: (id: string, next: PlanSubStep) => void;
  advancePhase: (id: string, next: Phase) => void;
  addCost: (id: string, deltaUsd: number) => void;

  setManuscript: (id: string, manuscript: ProjectRecord["manuscript"]) => void;
}

export const useProjectsStore = create<ProjectsStore>()(
  persist(
    (set, get) => ({
      projects: [],

      createProject: (title) => {
        const now = new Date().toISOString();
        const project: ProjectRecord = {
          id: crypto.randomUUID(),
          title: title.trim() || "Untitled",
          currentPhase: "plan",
          currentPlanSubStep: "idea",
          conversations: {},
          characters: [],
          costAccum: 0,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ projects: [project, ...s.projects] }));
        return project;
      },

      getProject: (id) => get().projects.find((p) => p.id === id),

      updateProject: (id, updater) => {
        set((s) => ({
          projects: s.projects.map((p) => {
            if (p.id !== id) return p;
            const draft = structuredClone(p);
            updater(draft);
            draft.updatedAt = new Date().toISOString();
            return draft;
          }),
        }));
      },

      deleteProject: (id) => {
        set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }));
      },

      duplicateProject: (id, opts) => {
        const source = get().projects.find((p) => p.id === id);
        if (!source) return undefined;
        const now = new Date().toISOString();
        const suffix = opts?.suffix ?? "(copy)";
        const cloned: ProjectRecord = {
          ...structuredClone(source),
          id: crypto.randomUUID(),
          title: `${source.title} ${suffix}`.trim(),
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ projects: [cloned, ...s.projects] }));
        return cloned;
      },

      forkProjectAtChunk: (id, forkAtIndex) => {
        const source = get().projects.find((p) => p.id === id);
        if (!source) return undefined;
        const now = new Date().toISOString();

        const cloned: ProjectRecord = structuredClone(source);
        cloned.id = crypto.randomUUID();
        cloned.title = `${source.title} (fork @ Chunk ${forkAtIndex})`;
        cloned.createdAt = now;
        cloned.updatedAt = now;

        // Reset to Plan phase if mid-Write — user re-runs Write from the fork point
        cloned.currentPhase = "plan";
        cloned.currentPlanSubStep = "plot";

        // Truncate manuscript to chunks before the fork point
        if (cloned.manuscript) {
          const keptChunks = cloned.manuscript.chunks.filter((c) => c.index < forkAtIndex);
          if (keptChunks.length === 0) {
            cloned.manuscript = undefined;
          } else {
            cloned.manuscript = {
              ...cloned.manuscript,
              chunks: keptChunks,
              totalWords: keptChunks.reduce((sum, c) => sum + c.wordCount, 0),
              completedAt: undefined,
              fullAuditFindings: null,
            };
          }
        }

        set((s) => ({ projects: [cloned, ...s.projects] }));
        return cloned;
      },

      appendTurn: (id, subStep, turn) => {
        get().updateProject(id, (draft) => {
          const turns = draft.conversations[subStep] ?? [];
          draft.conversations[subStep] = [...turns, turn];
        });
      },

      appendSubAgentTurn: (id, agent, turn) => {
        get().updateProject(id, (draft) => {
          if (agent === "redteam") {
            draft.redTeamConversation = [...(draft.redTeamConversation ?? []), turn];
          } else {
            draft.outlineReviewConversation = [...(draft.outlineReviewConversation ?? []), turn];
          }
        });
      },

      applyStructuredUpdate: (id, stage, data) => {
        get().updateProject(id, (draft) => {
          const obj = data as Record<string, unknown>;
          if (!obj || typeof obj !== "object") return;

          if (stage === "idea" && obj.premise && typeof obj.premise === "object") {
            draft.premise = { ...draft.premise, ...(obj.premise as Partial<Premise>) };
          }
          if (stage === "world" && obj.setting && typeof obj.setting === "object") {
            const s = obj.setting as Partial<Setting>;
            draft.setting = {
              ...draft.setting,
              ...s,
              // World rules are array — replace entirely with latest snapshot
              ...(s.worldRules ? { worldRules: s.worldRules } : {}),
            };
            // Also propagate any updated premise fields the world stage may refine
            if (s.premise) {
              draft.premise = { ...draft.premise, ...s.premise };
            }
          }
          if (stage === "characters" && Array.isArray(obj.characters)) {
            // Replace with latest full snapshot — model emits all known characters each turn
            draft.characters = obj.characters as Array<Partial<Character>>;
          }
          if (stage === "plot" && obj.story && typeof obj.story === "object") {
            draft.story = { ...draft.story, ...(obj.story as Partial<Story>) };
          }
          if (stage === "redteam" && Array.isArray(obj.findings)) {
            draft.redTeamReport = {
              generatedAt: new Date().toISOString(),
              findings: obj.findings as RedTeamReport["findings"],
              summary: (obj.summary as string) ?? "",
            };
          }
          if (stage === "outline-review") {
            draft.outlineReviewReport = {
              generatedAt: new Date().toISOString(),
              producerScore: (obj.producerScore as number) ?? 0,
              editorScore: (obj.editorScore as number) ?? 0,
              producerFindings:
                (obj.producerFindings as OutlineReviewReport["producerFindings"]) ?? [],
              editorFindings:
                (obj.editorFindings as OutlineReviewReport["editorFindings"]) ?? [],
              summary: (obj.summary as string) ?? "",
            };
          }
        });
      },

      advanceSubStep: (id, next) => {
        get().updateProject(id, (draft) => {
          draft.currentPlanSubStep = next;
        });
      },

      advancePhase: (id, next) => {
        get().updateProject(id, (draft) => {
          draft.currentPhase = next;
        });
      },

      addCost: (id, deltaUsd) => {
        get().updateProject(id, (draft) => {
          draft.costAccum = (draft.costAccum ?? 0) + deltaUsd;
        });
      },

      setManuscript: (id, manuscript) => {
        get().updateProject(id, (draft) => {
          draft.manuscript = manuscript;
        });
      },
    }),
    {
      name: "novelwright-projects-v1",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
