"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useProjectsStore } from "@/lib/stores/projects";
import type { Phase, PlanSubStep } from "@novelwright/types";

export default function ProjectsHub() {
  const projects = useProjectsStore((s) => s.projects);
  const createProject = useProjectsStore((s) => s.createProject);
  const duplicateProject = useProjectsStore((s) => s.duplicateProject);
  const deleteProject = useProjectsStore((s) => s.deleteProject);
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const project = createProject(newTitle);
    router.push(`/app/projects/${project.id}/plan`);
  };

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours < 1) return "just now";
    if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
    const diffDays = diffHours / 24;
    if (diffDays < 7) return `${Math.floor(diffDays)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-12">
          <div>
            <Link
              href="/"
              className="text-sm text-[var(--color-studio-text-muted)] hover:text-[var(--color-accent-primary)] mb-2 inline-block"
            >
              ← Home
            </Link>
            <h1 className="text-3xl" style={{ fontFamily: "var(--font-display)" }}>
              Your projects
            </h1>
          </div>
          {projects.length > 0 && (
            <button
              onClick={() => setIsCreating(true)}
              className="px-5 py-2.5 rounded-md bg-[var(--color-accent-primary)] text-[var(--color-studio-base)] font-medium hover:bg-[var(--color-accent-glow)] transition-colors"
            >
              New project
            </button>
          )}
        </header>

        {isCreating && (
          <div className="fixed inset-0 bg-[var(--color-studio-base)]/90 backdrop-blur-sm flex items-center justify-center z-50 px-6">
            <div className="bg-[var(--color-studio-raised)] border border-[var(--color-studio-border-strong)] rounded-lg p-8 max-w-md w-full">
              <h2 className="text-xl mb-2" style={{ fontFamily: "var(--font-display)" }}>
                Name your story
              </h2>
              <p className="text-sm text-[var(--color-studio-text-secondary)] mb-6">
                A working title — change it anytime.
              </p>
              <form onSubmit={handleCreate}>
                <input
                  autoFocus
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="The Crescendo, Untitled, etc."
                  className="w-full px-4 py-3 bg-[var(--color-studio-base)] border border-[var(--color-studio-border-subtle)] rounded-md text-[var(--color-studio-text-primary)] focus:border-[var(--color-accent-primary)] focus:outline-none mb-6"
                />
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      setNewTitle("");
                    }}
                    className="px-5 py-2 text-[var(--color-studio-text-secondary)] hover:text-[var(--color-studio-text-primary)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newTitle.trim()}
                    className="px-5 py-2 rounded-md bg-[var(--color-accent-primary)] text-[var(--color-studio-base)] font-medium hover:bg-[var(--color-accent-glow)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Begin planning
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32">
            <p
              className="text-2xl text-[var(--color-studio-text-secondary)] mb-8 italic"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              You haven&apos;t started a story yet.
            </p>
            <button
              onClick={() => setIsCreating(true)}
              className="px-8 py-3.5 rounded-md bg-[var(--color-accent-primary)] text-[var(--color-studio-base)] font-medium hover:bg-[var(--color-accent-glow)] transition-colors"
            >
              Begin your first
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                onDuplicate={() => {
                  const cloned = duplicateProject(p.id);
                  if (cloned) router.push(
                    cloned.currentPhase === "plan"
                      ? `/app/projects/${cloned.id}/plan`
                      : `/app/projects/${cloned.id}/write`,
                  );
                }}
                onDelete={() => {
                  if (confirm(`Delete "${p.title}"? This cannot be undone.`)) {
                    deleteProject(p.id);
                  }
                }}
                onOpen={() => {
                  router.push(
                    p.currentPhase === "plan"
                      ? `/app/projects/${p.id}/plan`
                      : `/app/projects/${p.id}/write`,
                  );
                }}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function ProjectCard({
  project,
  onDuplicate,
  onDelete,
  onOpen,
}: {
  project: ReturnType<typeof useProjectsStore.getState>["projects"][number];
  onDuplicate: () => void;
  onDelete: () => void;
  onOpen: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const diffH = (Date.now() - d.getTime()) / (1000 * 60 * 60);
    if (diffH < 1) return "just now";
    if (diffH < 24) return `${Math.floor(diffH)}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={onOpen}
        className="w-full text-left p-6 bg-[var(--color-studio-raised)] border border-[var(--color-studio-border-subtle)] rounded-lg hover:border-[var(--color-accent-primary)] transition-colors"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs uppercase tracking-wider text-[var(--color-accent-primary)]">
            {project.currentPhase === "plan"
              ? `Plan · ${project.currentPlanSubStep}`
              : project.currentPhase === "write"
              ? "Writing"
              : "Done"}
          </span>
          <span className="text-xs text-[var(--color-studio-text-muted)]">
            {formatDate(project.updatedAt)}
          </span>
        </div>
        <h3
          className="text-xl mb-3 text-[var(--color-studio-text-primary)] group-hover:text-[var(--color-accent-primary)] transition-colors"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {project.title}
        </h3>
        <ProgressStrip phase={project.currentPhase} subStep={project.currentPlanSubStep} />
      </button>

      {/* Menu trigger — invisible until hover */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((v) => !v);
        }}
        className="absolute top-3 right-3 w-8 h-8 rounded-md flex items-center justify-center text-[var(--color-studio-text-muted)] opacity-0 group-hover:opacity-100 hover:bg-[var(--color-studio-overlay)] hover:text-[var(--color-studio-text-primary)] transition-opacity"
        aria-label="Project actions"
      >
        ⋯
      </button>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenuOpen(false)}
            aria-hidden
          />
          <div className="absolute top-12 right-3 z-50 min-w-[180px] bg-[var(--color-studio-overlay)] border border-[var(--color-studio-border-strong)] rounded-md shadow-xl overflow-hidden">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onDuplicate();
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-[var(--color-studio-text-primary)] hover:bg-[var(--color-studio-raised)]"
            >
              Duplicate project
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onDelete();
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-[var(--color-signal-critical)] hover:bg-[var(--color-studio-raised)]"
            >
              Delete project
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function ProgressStrip({ phase, subStep }: { phase: Phase; subStep: PlanSubStep }) {
  const planSteps: PlanSubStep[] = ["idea", "world", "characters", "plot"];
  const planIndex = planSteps.indexOf(subStep);
  const planProgress = phase === "plan" ? planIndex / planSteps.length : 1;
  const writeProgress = phase === "done" ? 1 : phase === "write" ? 0.5 : 0;

  return (
    <div className="flex gap-1.5">
      <div
        className="h-1 flex-1 rounded-full bg-[var(--color-studio-border-subtle)] overflow-hidden"
        title="Plan progress"
      >
        <div
          className="h-full bg-[var(--color-accent-primary)] transition-all"
          style={{ width: `${planProgress * 100}%` }}
        />
      </div>
      <div
        className="h-1 flex-1 rounded-full bg-[var(--color-studio-border-subtle)] overflow-hidden"
        title="Write progress"
      >
        <div
          className="h-full bg-[var(--color-accent-primary)] transition-all"
          style={{ width: `${writeProgress * 100}%` }}
        />
      </div>
    </div>
  );
}

