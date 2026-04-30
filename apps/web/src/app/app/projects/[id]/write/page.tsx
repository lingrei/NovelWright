"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useProjectsStore } from "@/lib/stores/projects";
import { postSSE } from "@/lib/client/sse";
import { notify, requestPermissionIfNeeded } from "@/lib/client/notifications";

interface ChunkInProgress {
  index: number;
  title: string;
  targetWords: number;
  prose: string;
  wordCount: number;
  done: boolean;
  reviewFindings?: string | null;
}

/** Strip the <<<NW_DATA>>>...<<<END_DATA>>> structured tail from reviewer prose for display. */
function stripStructuredTail(text: string): string {
  const start = text.indexOf("<<<NW_DATA>>>");
  if (start === -1) return text.trim();
  return text.slice(0, start).trim();
}

export default function WriteView() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const project = useProjectsStore((s) => s.getProject(params.id));
  const setManuscript = useProjectsStore((s) => s.setManuscript);
  const advancePhase = useProjectsStore((s) => s.advancePhase);
  const addCost = useProjectsStore((s) => s.addCost);
  const forkProjectAtChunk = useProjectsStore((s) => s.forkProjectAtChunk);

  const [hydrated, setHydrated] = useState(false);
  const [chunks, setChunks] = useState<ChunkInProgress[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [costSoFar, setCostSoFar] = useState(0);
  const startedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Auto-scroll as prose streams in
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chunks]);

  // Resume / start logic
  useEffect(() => {
    if (!hydrated || !project) return;
    if (startedRef.current) return;
    startedRef.current = true;

    // If we already have a finished manuscript, just display it
    if (project.manuscript?.completedAt) {
      setChunks(
        project.manuscript.chunks.map((c) => ({
          index: c.index,
          title: c.title,
          targetWords: c.wordCount,
          prose: c.prose,
          wordCount: c.wordCount,
          done: true,
        })),
      );
      setIsComplete(true);
      return;
    }

    void runWrite();
  }, [hydrated, project]);

  async function runWrite() {
    if (!project) return;
    setIsStreaming(true);
    setError(null);

    // Ask for browser notification permission early. The actual notify() fires
    // on completion only if the tab is hidden — so the user gets pinged when
    // they tab-away during a long Write session.
    void requestPermissionIfNeeded();

    let workingChunks: ChunkInProgress[] = [];

    await postSSE(
      "/api/write/run",
      {
        premise: project.premise ?? {},
        setting: project.setting ?? {},
        characters: project.characters ?? [],
        story: project.story ?? {},
      },
      {
        onChunkStart: (info) => {
          workingChunks.push({
            index: info.chunkIndex,
            title: info.title,
            targetWords: info.targetWords,
            prose: "",
            wordCount: 0,
            done: false,
          });
          setChunks([...workingChunks]);
          setCurrentIdx(workingChunks.length - 1);
        },
        onProseToken: (token) => {
          if (workingChunks.length === 0) return;
          const last = workingChunks[workingChunks.length - 1]!;
          last.prose += token;
          last.wordCount = last.prose.split(/\s+/).filter(Boolean).length;
          setChunks([...workingChunks]);
        },
        onChunkEnd: (info) => {
          const c = workingChunks.find((x) => x.index === info.chunkIndex);
          if (c) {
            c.done = true;
            c.wordCount = info.wordCount;
            setChunks([...workingChunks]);
          }
        },
        onChunkReview: (info) => {
          const c = workingChunks.find((x) => x.index === info.chunkIndex);
          if (c) {
            (c as ChunkInProgress).reviewFindings = info.findings;
            setChunks([...workingChunks]);
          }
        },
        onCostUpdate: ({ totalUsd }) => {
          setCostSoFar(totalUsd);
        },
        onComplete: (data) => {
          const completion = data as {
            totalWords: number;
            totalCost: number;
            chunks: Array<{
              index: number;
              title: string;
              prose: string;
              reviewFindings?: string | null;
            }>;
            fullAuditFindings?: string | null;
          };
          setIsComplete(true);
          setIsStreaming(false);
          if (project) {
            const manuscriptChunks = completion.chunks.map((c) => ({
              index: c.index,
              title: c.title,
              prose: c.prose,
              wordCount: c.prose.split(/\s+/).filter(Boolean).length,
              reviewFindings: c.reviewFindings ?? null,
            }));
            setManuscript(project.id, {
              chunks: manuscriptChunks,
              totalWords: completion.totalWords,
              totalCost: completion.totalCost,
              completedAt: new Date().toISOString(),
              fullAuditFindings: completion.fullAuditFindings ?? null,
            });
            addCost(project.id, completion.totalCost);
            advancePhase(project.id, "done");

            // v1.5: notify the user if they tabbed away during the long Write session
            notify({
              title: `${project.title}: manuscript complete`,
              body: `${completion.totalWords.toLocaleString()} words. Click to view.`,
            });
          }
        },
        onError: (msg) => {
          setError(msg);
          setIsStreaming(false);
        },
      },
    );
  }

  if (!hydrated) {
    return (
      <main className="min-h-screen flex items-center justify-center mode-page">
        <p>Loading…</p>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="min-h-screen flex items-center justify-center mode-page">
        <Link href="/app/projects">← Back to projects</Link>
      </main>
    );
  }

  const totalWordsTarget =
    (project.story?.chunks ?? []).reduce((s, c) => s + (c.targetWords ?? 0), 0) || 0;
  const wordsSoFar = chunks.reduce((s, c) => s + c.wordCount, 0);
  const progressPct = totalWordsTarget > 0 ? Math.min(100, (wordsSoFar / totalWordsTarget) * 100) : 0;

  const handleExport = async (format: "md" | "docx" = "md") => {
    const url = `/api/projects/${project.id}/export?format=${format}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ project }),
    });
    if (!res.ok) {
      alert("Export failed");
      return;
    }
    const blob = await res.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${project.title.replace(/[^a-z0-9]+/gi, "_")}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="min-h-screen mode-page">
      {/* Top bar (minimal — preserves reading focus) */}
      <header className="sticky top-0 z-10 backdrop-blur-sm bg-[var(--color-page-base)]/85 border-b border-[var(--color-page-border-subtle)]">
        <div className="max-w-5xl mx-auto px-8 py-3 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Link
              href="/app/projects"
              className="text-xs text-[var(--color-page-text-muted)] hover:text-[var(--color-accent-primary)]"
            >
              ← Projects
            </Link>
            <h1
              className="text-sm font-medium text-[var(--color-page-text-primary)]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {project.title}
            </h1>
          </div>

          <div className="flex items-center gap-4 text-xs text-[var(--color-page-text-muted)]">
            {!isComplete && isStreaming && (
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] animate-pulse" />
                Writing Chunk {currentIdx + 1}
                {chunks.length > 0 ? ` of ${(project.story?.chunks ?? []).length}` : ""}
              </span>
            )}
            <span className="mono">
              {wordsSoFar.toLocaleString()}
              {totalWordsTarget > 0 && ` / ${totalWordsTarget.toLocaleString()}`} words
            </span>
            {costSoFar > 0 && (
              <span className="mono text-[var(--color-page-text-muted)]" title="API cost so far">
                ${costSoFar.toFixed(4)}
              </span>
            )}
            {isComplete && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExport("md")}
                  className="px-3 py-1.5 rounded-md border border-[var(--color-page-border-strong)] text-[var(--color-page-text-primary)] text-xs font-medium hover:border-[var(--color-accent-primary)] transition-colors"
                >
                  Markdown
                </button>
                <button
                  type="button"
                  onClick={() => handleExport("docx")}
                  className="px-3 py-1.5 rounded-md bg-[var(--color-accent-primary)] text-[var(--color-studio-base)] text-xs font-medium hover:bg-[var(--color-accent-glow)] transition-colors"
                >
                  Word .docx
                </button>
              </div>
            )}
          </div>
        </div>
        {/* Thin progress strip */}
        {!isComplete && (
          <div className="h-0.5 bg-[var(--color-page-border-subtle)]">
            <div
              className="h-full bg-[var(--color-accent-primary)] transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}
      </header>

      <div ref={scrollRef} className="vibe-scroll mode-page overflow-y-auto pb-32">
        <article className="max-w-2xl mx-auto px-8 py-16">
          {chunks.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <motion.div
                className="w-2 h-2 rounded-full bg-[var(--color-accent-primary)] mb-6"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.6, repeat: Infinity }}
              />
              <p
                className="text-lg italic text-[var(--color-page-text-secondary)]"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                The agent is composing the first words.
              </p>
              <p className="mt-3 text-sm text-[var(--color-page-text-muted)]">
                Loading constitutional prompt + golden examples + your full plan.
              </p>
            </div>
          )}

          {error && (
            <div className="p-6 rounded-lg border border-[var(--color-signal-critical)]/40 bg-[var(--color-signal-critical)]/5 text-[var(--color-signal-critical)]">
              <p className="font-medium mb-2">Writing interrupted</p>
              <p className="text-sm text-[var(--color-page-text-secondary)]">{error}</p>
              <button
                type="button"
                onClick={() => {
                  startedRef.current = false;
                  setError(null);
                  setChunks([]);
                  void runWrite();
                }}
                className="mt-4 px-4 py-2 rounded-md bg-[var(--color-accent-primary)] text-[var(--color-studio-base)] text-sm font-medium"
              >
                Retry
              </button>
            </div>
          )}

          {chunks.map((c, i) => (
            <section key={c.index} className="mb-16 group/chunk relative">
              <div className="flex items-baseline justify-between mb-8 gap-6">
                <h2
                  className="text-3xl font-medium text-[var(--color-page-text-primary)]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {c.title}
                </h2>
                {isComplete && project && (
                  <button
                    type="button"
                    onClick={() => {
                      const cloned = forkProjectAtChunk(project.id, c.index);
                      if (cloned) router.push(`/app/projects/${cloned.id}/plan`);
                    }}
                    className="text-xs italic text-[var(--color-page-text-muted)] hover:text-[var(--color-accent-primary)] opacity-0 group-hover/chunk:opacity-100 transition-opacity shrink-0"
                  >
                    Fork from here →
                  </button>
                )}
              </div>
              <div
                className="prose prose-lg max-w-none text-[var(--color-page-text-primary)] leading-[1.75]"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {c.prose.split("\n\n").map((para, pi) => (
                  <p key={pi}>{para}</p>
                ))}
                {!c.done && i === chunks.length - 1 && (
                  <span className="inline-block w-1.5 h-5 bg-[var(--color-accent-primary)] ml-1 animate-pulse align-middle" />
                )}
              </div>
            </section>
          ))}

          {isComplete && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-20 pt-12 border-t border-[var(--color-page-border-subtle)] text-center"
            >
              <p
                className="text-xl italic text-[var(--color-page-text-secondary)] mb-6"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                Manuscript complete.
              </p>
              <p className="text-sm text-[var(--color-page-text-muted)] mb-8">
                {wordsSoFar.toLocaleString()} words across {chunks.length} chunks.
                {project.manuscript?.totalCost
                  ? ` API cost: $${project.manuscript.totalCost.toFixed(4)}.`
                  : ""}
              </p>
              <div className="inline-flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleExport("docx")}
                  className="px-8 py-3 rounded-md bg-[var(--color-accent-primary)] text-[var(--color-studio-base)] font-medium hover:bg-[var(--color-accent-glow)] transition-colors"
                >
                  Export as Word .docx
                </button>
                <button
                  type="button"
                  onClick={() => handleExport("md")}
                  className="px-6 py-3 rounded-md border border-[var(--color-page-border-strong)] text-[var(--color-page-text-primary)] hover:border-[var(--color-accent-primary)] transition-colors"
                >
                  Markdown
                </button>
              </div>
            </motion.div>
          )}

          {/* v1.5: Editorial notes — surfaces post-Write findings from sub-agents */}
          {isComplete && (project.manuscript?.fullAuditFindings ||
            chunks.some((c) => c.reviewFindings)) && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="mt-16 pt-12 border-t border-[var(--color-page-border-subtle)]"
            >
              <h3
                className="text-2xl mb-2 text-[var(--color-page-text-primary)]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Editorial notes
              </h3>
              <p className="text-sm text-[var(--color-page-text-muted)] mb-8 italic">
                Independent reviewers read the manuscript in isolated contexts. These notes are
                their critique. They are not auto-applied.
              </p>

              {project.manuscript?.fullAuditFindings && (
                <details className="mb-6 group" open>
                  <summary className="cursor-pointer flex items-center gap-2 text-sm font-medium text-[var(--color-voice-reviewer)] mb-3 list-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-voice-reviewer)]" />
                    <span className="uppercase tracking-wider text-xs">Full Audit (whole manuscript)</span>
                    <span className="ml-auto text-[var(--color-page-text-muted)] text-xs group-open:rotate-180 transition-transform">▾</span>
                  </summary>
                  <div
                    className="text-[15px] leading-relaxed text-[var(--color-page-text-primary)] whitespace-pre-wrap pl-4 border-l-2 border-[var(--color-voice-reviewer)]/40"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    {stripStructuredTail(project.manuscript.fullAuditFindings)}
                  </div>
                </details>
              )}

              {chunks
                .filter((c) => c.reviewFindings)
                .map((c) => (
                  <details key={c.index} className="mb-4 group">
                    <summary className="cursor-pointer flex items-center gap-2 text-sm font-medium text-[var(--color-voice-reviewer)] mb-2 list-none">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-voice-reviewer)]" />
                      <span className="uppercase tracking-wider text-xs">
                        Chunk {c.index} review · {c.title}
                      </span>
                      <span className="ml-auto text-[var(--color-page-text-muted)] text-xs group-open:rotate-180 transition-transform">▾</span>
                    </summary>
                    <div
                      className="text-[14px] leading-relaxed text-[var(--color-page-text-primary)] whitespace-pre-wrap pl-4 border-l-2 border-[var(--color-voice-reviewer)]/30"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      {stripStructuredTail(c.reviewFindings ?? "")}
                    </div>
                  </details>
                ))}
            </motion.section>
          )}
        </article>
      </div>
    </main>
  );
}
