"use client";

import { cn } from "@/lib/utils";
import type { PlanSubStep } from "@novelwright/types";

const SUB_STEPS: { id: PlanSubStep; label: string }[] = [
  { id: "idea", label: "Idea" },
  { id: "world", label: "World" },
  { id: "characters", label: "Characters" },
  { id: "plot", label: "Plot" },
];

interface PlanRailProps {
  current: PlanSubStep;
  onSelect?: (next: PlanSubStep) => void;
}

/**
 * Top-of-Plan-view sub-step indicator. NOT navigation — it's a status display
 * showing where the user is in the planning pipeline. Future: clicking a completed
 * step lets you re-edit it (with downstream invalidation warning).
 */
export function PlanRail({ current, onSelect }: PlanRailProps) {
  const currentIdx = SUB_STEPS.findIndex((s) => s.id === current);

  return (
    <ol className="flex items-center gap-2 text-sm">
      {SUB_STEPS.map((step, i) => {
        const isActive = i === currentIdx;
        const isComplete = i < currentIdx;
        const isFuture = i > currentIdx;
        return (
          <li key={step.id} className="flex items-center gap-2">
            <button
              type="button"
              disabled={isFuture}
              onClick={() => onSelect?.(step.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors",
                isActive &&
                  "bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)] cursor-default",
                isComplete &&
                  "text-[var(--color-studio-text-secondary)] hover:text-[var(--color-studio-text-primary)] hover:bg-[var(--color-studio-raised)]",
                isFuture &&
                  "text-[var(--color-studio-text-muted)] cursor-not-allowed",
              )}
              aria-current={isActive ? "step" : undefined}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isActive && "bg-[var(--color-accent-primary)] animate-pulse",
                  isComplete && "bg-[var(--color-signal-success)]",
                  isFuture && "bg-[var(--color-studio-border-strong)]",
                )}
              />
              <span className="font-medium">{step.label}</span>
            </button>
            {i < SUB_STEPS.length - 1 && (
              <span className="text-[var(--color-studio-text-muted)] text-xs">→</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
