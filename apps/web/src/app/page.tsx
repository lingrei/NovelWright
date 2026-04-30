import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-[var(--color-studio-text-muted)] mb-6">
          NovelWright
        </p>
        <h1
          className="text-4xl md:text-6xl max-w-4xl font-medium leading-[1.1] mb-6"
          style={{ fontFamily: "var(--font-display)" }}
        >
          A novel-writing instrument,
          <br />
          not a novel-generating button.
        </h1>
        <p
          className="text-lg md:text-xl max-w-2xl text-[var(--color-studio-text-secondary)] mb-12 leading-relaxed"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          You direct the planning. The AI writes. Constraint-driven craft, not GPT slop.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/app/projects"
            className="px-8 py-3.5 rounded-md bg-[var(--color-accent-primary)] text-[var(--color-studio-base)] font-medium hover:bg-[var(--color-accent-glow)] transition-colors"
          >
            Start a project
          </Link>
          <Link
            href="/help"
            className="px-8 py-3.5 rounded-md border border-[var(--color-studio-border-strong)] text-[var(--color-studio-text-primary)] hover:border-[var(--color-accent-primary)] transition-colors"
          >
            How it works
          </Link>
        </div>
      </section>

      {/* Three pillars */}
      <section className="border-t border-[var(--color-studio-border-subtle)] px-6 py-20">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-12">
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--color-accent-primary)] mb-4">
              Derivation Chain
            </p>
            <h3 className="text-xl mb-3" style={{ fontFamily: "var(--font-display)" }}>
              Every choice traces back.
            </h3>
            <p className="text-[var(--color-studio-text-secondary)] leading-relaxed">
              No random AI ideas. World rules, characters, plot beats — each must trace upward to
              your core premise. Random = error.
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--color-voice-redteam)] mb-4">
              Cognitive Independence
            </p>
            <h3 className="text-xl mb-3" style={{ fontFamily: "var(--font-display)" }}>
              Reviewers who don't share your context.
            </h3>
            <p className="text-[var(--color-studio-text-secondary)] leading-relaxed">
              Independent sub-agents review your work in separate cognitive contexts. They can't
              approve their own writing.
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--color-voice-reviewer)] mb-4">
              Sovereign Director
            </p>
            <h3 className="text-xl mb-3" style={{ fontFamily: "var(--font-display)" }}>
              You stay the author.
            </h3>
            <p className="text-[var(--color-studio-text-secondary)] leading-relaxed">
              Approval gate before writing begins. AI never produces prose without your sign-off on
              the entire plan.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--color-studio-border-subtle)] px-6 py-8 text-center text-sm text-[var(--color-studio-text-muted)]">
        Built on Claude Code agent architecture · Powered by Gemini ·{" "}
        <Link href="https://github.com/lingrei/NovelWright" className="hover:text-[var(--color-accent-primary)]">
          GitHub
        </Link>
      </footer>
    </main>
  );
}
