"use client";

import { motion } from "framer-motion";

interface GateBarProps {
  status: string;
  primaryLabel: string;
  primaryDisabled?: boolean;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

/**
 * Gate Bar — Page-warmth strip that spans the bottom of Plan view when a sub-step's
 * exit conditions are met. The "approve and continue" pattern.
 *
 * Used both for sub-step transitions (Continue to World, Continue to Characters, etc.)
 * and for the final Plan→Write gate.
 */
export function GateBar({
  status,
  primaryLabel,
  primaryDisabled,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: GateBarProps) {
  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 60, opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="absolute bottom-0 inset-x-0 z-30 px-6 py-4 bg-[var(--color-page-base)] border-t border-[var(--color-page-border-strong)]"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <motion.span
            className="w-2 h-2 rounded-full bg-[var(--color-accent-primary)]"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
          <p
            className="text-sm text-[var(--color-page-text-primary)]"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {status}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {secondaryLabel && onSecondary && (
            <button
              type="button"
              onClick={onSecondary}
              className="px-4 py-2 text-sm text-[var(--color-page-text-secondary)] hover:text-[var(--color-page-text-primary)]"
            >
              {secondaryLabel}
            </button>
          )}
          <button
            type="button"
            disabled={primaryDisabled}
            onClick={onPrimary}
            className="px-6 py-2.5 rounded-md bg-[var(--color-accent-primary)] text-[var(--color-studio-base)] font-medium hover:bg-[var(--color-accent-glow)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
