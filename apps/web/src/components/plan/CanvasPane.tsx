"use client";

import type { Character, Chunk, PlanSubStep, WorldRule } from "@novelwright/types";
import type { ProjectRecord } from "@/lib/stores/projects";

interface CanvasPaneProps {
  subStep: PlanSubStep;
  project: ProjectRecord;
}

/**
 * The Canvas pane — LEFT column of Plan view (v1.1+).
 * Fixed-width rail. Only its own content scrolls; horizontal content wraps.
 */
export function CanvasPane({ subStep, project }: CanvasPaneProps) {
  return (
    <section className="vibe-scroll overflow-y-auto overflow-x-hidden px-5 py-6 bg-[var(--color-studio-base)] [&_*]:break-words">
      {subStep === "idea" && <IdeaCanvas project={project} />}
      {subStep === "world" && <WorldCanvas project={project} />}
      {subStep === "characters" && <CharactersCanvas project={project} />}
      {subStep === "plot" && <PlotCanvas project={project} />}
    </section>
  );
}

function IdeaCanvas({ project }: { project: ProjectRecord }) {
  const premise = project.premise;
  const fields: Array<{
    key: keyof NonNullable<typeof premise>;
    label: string;
    hint: string;
  }> = [
    { key: "hook", label: "Hook", hint: "One sentence — what makes a reader pick this up." },
    { key: "coreDesire", label: "Core Desire", hint: "The emotional experience the reader is hungry for." },
    { key: "conflictDriver", label: "Conflict Driver", hint: "Why the central conflict happens." },
    { key: "structuralLayer", label: "Structural Layer", hint: "The relationship architecture that carries the story." },
  ];
  const populated = fields.filter((f) => premise?.[f.key]).length;

  return (
    <div className="w-full">
      <CanvasHeader label="Premise Card" title="The seed of the story">
        {populated}/{fields.length} fields shaped — fills in as you and the agent talk.
      </CanvasHeader>

      <div className="space-y-4">
        {fields.map((field) => {
          const value = premise?.[field.key] as string | undefined;
          return (
            <FieldCard
              key={field.key}
              label={field.label}
              filled={!!value}
              hint={field.hint}
              content={value}
            />
          );
        })}
      </div>
    </div>
  );
}

function WorldCanvas({ project }: { project: ProjectRecord }) {
  const setting = project.setting;
  const rules: WorldRule[] = (setting?.worldRules ?? []) as WorldRule[];
  const voice = setting?.narrativeVoice;

  return (
    <div className="w-full">
      <CanvasHeader label="Setting Codex" title="The world this story needs">
        {rules.length} {rules.length === 1 ? "rule" : "rules"} derived
        {voice?.narrator ? ` · voice: ${voice.narrator}` : ""}
      </CanvasHeader>

      {voice && (voice.narrator || voice.languageStyle) && (
        <section className="mb-8 p-5 bg-[var(--color-studio-raised)] border border-[var(--color-studio-border-subtle)] rounded-lg">
          <h3 className="text-xs uppercase tracking-wider text-[var(--color-accent-primary)] mb-3">
            Narrative Voice
          </h3>
          {voice.narrator && (
            <p className="text-sm mb-2">
              <span className="text-[var(--color-studio-text-muted)]">Narrator:</span>{" "}
              <span className="text-[var(--color-studio-text-primary)]">{voice.narrator}</span>
            </p>
          )}
          {voice.languageStyle && (
            <p className="text-sm" style={{ fontFamily: "var(--font-serif)" }}>
              {voice.languageStyle}
            </p>
          )}
          {voice.allowedLensModes && voice.allowedLensModes.length > 0 && (
            <div className="mt-3 flex gap-2 flex-wrap">
              {voice.allowedLensModes.map((m) => (
                <span
                  key={m}
                  className="text-[10px] uppercase tracking-wider px-2 py-1 rounded bg-[var(--color-studio-overlay)] text-[var(--color-studio-text-secondary)]"
                >
                  {m}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      <section>
        <h3 className="text-xs uppercase tracking-wider text-[var(--color-accent-primary)] mb-3">
          World Rules
        </h3>
        {rules.length === 0 ? (
          <p
            className="text-[var(--color-studio-text-muted)] italic text-sm"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            World rules will populate as the agent extracts them from your premise.
          </p>
        ) : (
          <ul className="space-y-3">
            {rules.map((r, i) => (
              <li
                key={r.id ?? `rule-${i}`}
                className="p-4 bg-[var(--color-studio-raised)] border border-[var(--color-accent-primary)]/30 rounded-lg"
              >
                <div className="flex items-baseline justify-between mb-2">
                  <p className="font-medium text-[var(--color-studio-text-primary)]">
                    {r.rule}
                  </p>
                  <span className="text-[10px] text-[var(--color-studio-text-muted)] uppercase tracking-wider shrink-0 ml-3">
                    Rule {i + 1}
                  </span>
                </div>
                {r.serves && (
                  <p className="text-xs text-[var(--color-studio-text-secondary)]">
                    <span className="text-[var(--color-studio-text-muted)]">Serves:</span>{" "}
                    {r.serves}
                  </p>
                )}
                {r.lossIfRemoved && (
                  <p className="text-xs text-[var(--color-studio-text-secondary)] mt-1">
                    <span className="text-[var(--color-studio-text-muted)]">Loss if removed:</span>{" "}
                    {r.lossIfRemoved}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function CharactersCanvas({ project }: { project: ProjectRecord }) {
  const characters = (project.characters ?? []) as Character[];

  return (
    <div className="w-full">
      <CanvasHeader label="Character Cards" title="The people inside this story">
        {characters.length} {characters.length === 1 ? "character" : "characters"} designed
      </CanvasHeader>

      {characters.length === 0 ? (
        <p
          className="text-[var(--color-studio-text-muted)] italic text-sm"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Character profiles will appear here as you and the agent build them.
        </p>
      ) : (
        <div className="space-y-4">
          {characters.map((c, i) => (
            <CharacterCard key={c.id ?? `c-${i}`} character={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function CharacterCard({ character }: { character: Character }) {
  return (
    <article className="p-5 bg-[var(--color-studio-raised)] border border-[var(--color-accent-primary)]/30 rounded-lg">
      <header className="flex items-baseline justify-between mb-3">
        <h3 className="text-lg" style={{ fontFamily: "var(--font-display)" }}>
          {character.name ?? "(Unnamed)"}
        </h3>
        {character.role && (
          <span className="text-xs uppercase tracking-wider text-[var(--color-accent-primary)]">
            {character.role}
          </span>
        )}
      </header>

      {character.desirePositioning?.coreDesire && (
        <p
          className="text-sm text-[var(--color-studio-text-primary)] mb-3 italic leading-relaxed"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {character.desirePositioning.coreDesire}
        </p>
      )}

      <div className="grid sm:grid-cols-2 gap-3 text-xs">
        {character.appearance && (
          <Section label="Appearance">
            {character.appearance.face && <P>Face: {character.appearance.face}</P>}
            {character.appearance.aura && <P>Aura: {character.appearance.aura}</P>}
            {character.appearance.distinctiveness != null && (
              <P>
                Distinctiveness: <strong>{character.appearance.distinctiveness}/10</strong>
              </P>
            )}
          </Section>
        )}
        {character.personality && (
          <Section label="Personality">
            {character.personality.surface && <P>Surface: {character.personality.surface}</P>}
            {character.personality.interior && <P>Interior: {character.personality.interior}</P>}
            {character.personality.gap && <P>Gap: {character.personality.gap}</P>}
          </Section>
        )}
        {character.voiceDNA && (
          <Section label="Voice DNA">
            {character.voiceDNA.rhythm && <P>Rhythm: {character.voiceDNA.rhythm}</P>}
            {character.voiceDNA.signaturePattern && (
              <P>Signature: {character.voiceDNA.signaturePattern}</P>
            )}
          </Section>
        )}
        {character.anchorBehaviors && character.anchorBehaviors.length > 0 && (
          <Section label="Anchor Behaviors">
            {character.anchorBehaviors.slice(0, 2).map((a, i) => (
              <P key={i}>
                <strong>{a.name}</strong>: {a.phase1} → {a.phase3} → {a.phase5}
              </P>
            ))}
          </Section>
        )}
      </div>
    </article>
  );
}

function PlotCanvas({ project }: { project: ProjectRecord }) {
  const story = project.story;
  const chunks = (story?.chunks ?? []) as Chunk[];

  return (
    <div className="w-full">
      <CanvasHeader label="Chunk Timeline" title={story?.spine?.arcShape ?? "Plot structure"}>
        {chunks.length} {chunks.length === 1 ? "chunk" : "chunks"}
        {story?.spine?.timeline ? ` · ${story.spine.timeline}` : ""}
      </CanvasHeader>

      {story?.spine?.corePremise && (
        <p
          className="text-sm italic text-[var(--color-studio-text-secondary)] mb-6 leading-relaxed"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {story.spine.corePremise}
        </p>
      )}

      {chunks.length === 0 ? (
        <p
          className="text-[var(--color-studio-text-muted)] italic text-sm"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Chunks will populate here as you and the agent build the plot.
        </p>
      ) : (
        <div className="space-y-3">
          {chunks.map((c, i) => (
            <ChunkRow key={c.index ?? i} chunk={c} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function ChunkRow({ chunk, index }: { chunk: Chunk; index: number }) {
  const tier = chunk.intensityTier;
  const tierColor =
    tier === 1
      ? "border-l-[var(--color-signal-critical)]"
      : tier === 2
      ? "border-l-[var(--color-signal-warning)]"
      : "border-l-[var(--color-accent-primary)]/40";
  const tierLabel = tier === 1 ? "High" : tier === 2 ? "Medium" : "Light";

  return (
    <article
      className={`p-4 bg-[var(--color-studio-raised)] border border-[var(--color-studio-border-subtle)] border-l-2 rounded-md ${tierColor}`}
    >
      <header className="flex items-baseline justify-between mb-2">
        <h4 className="text-sm font-medium">
          Chunk {chunk.index ?? index + 1}: {chunk.title ?? "Untitled"}
        </h4>
        <div className="flex items-center gap-3 text-xs text-[var(--color-studio-text-muted)]">
          {tier && <span>Tier {tier} · {tierLabel}</span>}
          {chunk.targetWords && <span>~{chunk.targetWords} words</span>}
        </div>
      </header>
      {chunk.focus && (
        <p
          className="text-xs italic text-[var(--color-studio-text-secondary)] mb-2"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Focus: {chunk.focus}
        </p>
      )}
      {chunk.beats && chunk.beats.length > 0 && (
        <div className="flex gap-1 mt-2">
          {chunk.beats.map((b, i) => (
            <span
              key={i}
              className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-studio-overlay)] text-[var(--color-studio-text-muted)] mono"
              title={`Beat ${b.number}: ${b.content}`}
            >
              D{b.dilation}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

// Shared sub-components

function CanvasHeader({
  label,
  title,
  children,
}: {
  label: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-8">
      <p className="text-xs uppercase tracking-[0.15em] text-[var(--color-accent-primary)] mb-2">
        {label}
      </p>
      <h2 className="text-2xl mb-2" style={{ fontFamily: "var(--font-display)" }}>
        {title}
      </h2>
      {children && (
        <p className="text-sm text-[var(--color-studio-text-secondary)]">{children}</p>
      )}
    </header>
  );
}

function FieldCard({
  label,
  filled,
  hint,
  content,
}: {
  label: string;
  filled: boolean;
  hint: string;
  content?: string;
}) {
  return (
    <div
      className={
        filled
          ? "p-5 bg-[var(--color-studio-raised)] border border-[var(--color-accent-primary)]/30 rounded-lg"
          : "p-5 bg-[var(--color-studio-raised)]/40 border border-dashed border-[var(--color-studio-border-subtle)] rounded-lg"
      }
    >
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-sm font-medium uppercase tracking-wider text-[var(--color-studio-text-primary)]">
          {label}
        </h3>
        <span className="text-xs text-[var(--color-studio-text-muted)]">
          {filled ? "shaped" : "pending"}
        </span>
      </div>
      {filled ? (
        <p
          className="text-[var(--color-studio-text-primary)] leading-relaxed"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {content}
        </p>
      ) : (
        <p className="text-sm text-[var(--color-studio-text-muted)] italic">{hint}</p>
      )}
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-[var(--color-studio-text-muted)] mb-1">
        {label}
      </p>
      <div className="space-y-1 text-[var(--color-studio-text-secondary)]">{children}</div>
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="leading-snug">{children}</p>;
}
