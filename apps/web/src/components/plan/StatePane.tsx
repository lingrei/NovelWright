"use client";

import type { Character, PlanSubStep, WorldRule } from "@novelwright/types";
import type { ProjectRecord } from "@/lib/stores/projects";

interface StatePaneProps {
  subStep: PlanSubStep;
  project: ProjectRecord;
}

/**
 * State pane — right column of Plan view. Shows meta-state appropriate to the current sub-step.
 */
export function StatePane({ subStep, project }: StatePaneProps) {
  return (
    <aside className="vibe-scroll px-4 py-6 bg-[var(--color-studio-base)] overflow-y-auto overflow-x-hidden [&_*]:break-words">
      <p className="text-xs uppercase tracking-wider text-[var(--color-studio-text-muted)] mb-4">
        State
      </p>

      {subStep === "idea" && <IdeaState project={project} />}
      {subStep === "world" && <WorldState project={project} />}
      {subStep === "characters" && <CharactersState project={project} />}
      {subStep === "plot" && <PlotState project={project} />}

      {project.costAccum != null && project.costAccum > 0 && (
        <div className="mt-8 pt-4 border-t border-[var(--color-studio-border-subtle)]">
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-studio-text-muted)] mb-1">
            Session cost
          </p>
          <p className="text-sm mono text-[var(--color-studio-text-secondary)]">
            ${project.costAccum.toFixed(4)}
          </p>
        </div>
      )}
    </aside>
  );
}

function IdeaState({ project }: { project: ProjectRecord }) {
  const p = project.premise;
  if (!p?.hook && !p?.coreDesire) {
    return (
      <p
        className="text-sm text-[var(--color-studio-text-muted)] italic leading-relaxed"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        The Derivation Chain begins forming once your premise crystallizes.
      </p>
    );
  }
  return (
    <div className="space-y-3 text-xs">
      <p className="text-[var(--color-studio-text-muted)]">
        Once the premise is locked, the chain extends downward through World → Characters → Plot.
      </p>
    </div>
  );
}

function WorldState({ project }: { project: ProjectRecord }) {
  const rules: WorldRule[] = (project.setting?.worldRules ?? []) as WorldRule[];
  return (
    <div>
      <p className="text-xs text-[var(--color-studio-text-muted)] mb-3">
        L0 Premise → L1 Function → <strong className="text-[var(--color-accent-primary)]">L2 World Rules</strong> → L3 Characters → L4 Arcs → L5 Events
      </p>
      <p className="text-xs text-[var(--color-studio-text-secondary)] mb-3">
        {rules.length} world {rules.length === 1 ? "rule" : "rules"} derived from premise.
      </p>
      <ul className="space-y-1">
        {rules.map((r, i) => (
          <li key={r.id ?? i} className="text-xs leading-snug">
            <span className="text-[var(--color-studio-text-muted)]">{i + 1}.</span>{" "}
            <span className="text-[var(--color-studio-text-secondary)]">{r.rule}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CharactersState({ project }: { project: ProjectRecord }) {
  const chars = (project.characters ?? []) as Character[];
  return (
    <div>
      <p className="text-xs text-[var(--color-studio-text-muted)] mb-3">
        L0 Premise → L1 Function → L2 World → <strong className="text-[var(--color-accent-primary)]">L3 Characters</strong> → L4 Arcs → L5 Events
      </p>
      <ul className="space-y-2">
        {chars.map((c, i) => (
          <li
            key={c.id ?? i}
            className="text-xs p-2 bg-[var(--color-studio-raised)]/50 rounded border border-[var(--color-studio-border-subtle)]"
          >
            <p className="font-medium text-[var(--color-studio-text-primary)]">
              {c.name ?? "Unnamed"}
            </p>
            {c.role && (
              <p className="text-[10px] uppercase tracking-wider text-[var(--color-studio-text-muted)] mt-0.5">
                {c.role}
              </p>
            )}
            {c.voiceDNA?.signaturePattern && (
              <p
                className="text-[var(--color-studio-text-secondary)] italic mt-1 leading-snug"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {c.voiceDNA.signaturePattern}
              </p>
            )}
          </li>
        ))}
      </ul>
      {chars.length === 0 && (
        <p
          className="text-xs text-[var(--color-studio-text-muted)] italic"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Characters will appear here as the agent builds them.
        </p>
      )}
    </div>
  );
}

function PlotState({ project }: { project: ProjectRecord }) {
  const story = project.story;
  const tracking = story?.globalArcTracking;
  return (
    <div>
      <p className="text-xs text-[var(--color-studio-text-muted)] mb-3">
        Anchor Behavior progression across Chunks
      </p>
      {tracking?.anchorBehaviorProgression && tracking.anchorBehaviorProgression.length > 0 ? (
        <ul className="space-y-2">
          {tracking.anchorBehaviorProgression.map((a, i) => (
            <li key={i} className="text-xs">
              <p className="font-medium text-[var(--color-studio-text-primary)] mb-1">{a.anchor}</p>
              <ol className="space-y-0.5 ml-2">
                {a.progression.map((s, j) => (
                  <li
                    key={j}
                    className="text-[var(--color-studio-text-secondary)] leading-snug"
                  >
                    <span className="text-[var(--color-studio-text-muted)] mono mr-1">
                      C{j + 1}
                    </span>
                    {s}
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ul>
      ) : (
        <p
          className="text-xs text-[var(--color-studio-text-muted)] italic"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Anchor behaviors will track here as Chunks are designed.
        </p>
      )}
    </div>
  );
}
