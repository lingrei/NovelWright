"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { PlanSubStep } from "@novelwright/types";

const TRANSITION_LINE: Record<string, string> = {
  "idea->world": "Now we shape the world.",
  "world->characters": "Now we meet the people.",
  "characters->plot": "Now we build the arc.",
  // Reverse moves (sending back) get a quieter line
  "world->idea": "Back to the seed.",
  "characters->world": "Back to the world.",
  "plot->characters": "Back to the people.",
};

interface StageTransitionProps {
  active: boolean;
  fromStep: PlanSubStep | null;
  toStep: PlanSubStep | null;
}

/**
 * 1.5-second cross-fade ceremony when the user advances between Plan sub-steps.
 * - 0-300ms: dim the canvas, hide CTAs
 * - 300-1100ms: serif italic line floats up, holds, fades
 * - 1100-1500ms: settles, reveals next sub-step
 *
 * Audio chime is intentionally not included here — would require a user-mutable
 * setting (the rule from v1.1 plan) which v1 doesn't have yet.
 */
export function StageTransition({ active, fromStep, toStep }: StageTransitionProps) {
  const key = fromStep && toStep ? `${fromStep}->${toStep}` : "";
  const line = TRANSITION_LINE[key] ?? "";

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="absolute inset-0 z-40 pointer-events-none flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Dimming overlay */}
          <motion.div
            className="absolute inset-0 bg-[var(--color-studio-base)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.85, 0.85, 0] }}
            transition={{ duration: 1.5, times: [0, 0.2, 0.75, 1] }}
          />
          {/* Serif italic line */}
          {line && (
            <motion.p
              className="relative z-10 text-2xl text-[var(--color-cream,_#F4EDE0)] italic"
              style={{ fontFamily: "var(--font-serif)" }}
              initial={{ opacity: 0, y: 12 }}
              animate={{
                opacity: [0, 1, 1, 0],
                y: [12, 0, 0, -8],
              }}
              transition={{ duration: 1.5, times: [0, 0.25, 0.7, 1] }}
            >
              {line}
            </motion.p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
