# NovelWright

**An AI-powered collaborative novel writing tool built on Claude Code.**

NovelWright is a structured prompt engineering system that turns Claude into an immersive fiction co-author. Instead of building a custom web app, it uses a **file-based architecture** where markdown files ARE the interface — readable, portable, and version-controllable.

---

## How It Works

The system guides writers through a complete novel creation pipeline:

```
Phase 0: Inspiration → Core premise extraction
   ↓
W1: Worldbuilding → Setting rules, physical laws, social systems
   ↓
W2: Character Design → Psychology-first character profiles
   ↓
W3: Plot Structure → Chunk-based plot architecture with tension mapping
   ↓
W4: Writing → Automated loop (Plan → Write → Review → Consolidate)
   ↓
W5: Full Audit → Comprehensive editorial review
```

Each phase is powered by **specialized slash commands** — 19 in total — that load domain-specific prompt engineering on demand.

## Key Innovations

### Derivation Chain
Every design decision must trace back to the core premise. No random ideas — every character trait, world rule, and plot event has a logical upward path to the story's central hook.

### Beat Theory + Dilation System
Prose pacing is controlled by assigning a **Dilation Level (1-10)** to each story beat. High dilation = slow-motion sensory detail. Low dilation = brisk pacing. This gives writers precise control over narrative rhythm.

### Cognitive Independence via Sub-Agents
Quality review is done by separate AI agents that **don't share** the writing session's memory. They only see output files, eliminating "self-review bias."

### 4D State Tracking
Story state is tracked across 4 dimensions: META (world truths), POV (per-character knowledge), PHYSICAL (object states), and IRREVERSIBLE (thresholds that can't be uncrossed).

## Project Structure

```
NovelWright/
├── CLAUDE.md                    # Core aesthetic constitution (~400 lines)
├── .claude/commands/            # 19 slash command modules
│   ├── planning.md              # W1-W3 orchestrator
│   ├── writing.md               # W4 automated writing loop
│   ├── story-engine.md          # Worldbuilding guide
│   ├── character-engine.md      # Character design guide
│   ├── camera-os.md             # Multi-modal narrative engine
│   └── ...                      # 14 more specialized skills
├── .agent/knowledge/
│   ├── golden_examples/         # 6 writing principle calibration files
│   └── craft_references/        # Craft technique references
└── sample_project/              # "The Crescendo" — demo short story
    ├── _Setting.md              # World + character profiles
    ├── _Story.md                # Plot structure + chunk plans
    ├── _Draft.md                # Polished prose (~2000 words)
    ├── _state.yaml              # 4D progress state
    └── _chunk_plan.md           # Current chunk execution plan
```

## Sample Output

From *The Crescendo* — a short story about a concert pianist hiding progressive hearing loss:

> The Chopin came easily that afternoon. Not the desperate ease of someone forcing it, but the real kind — the kind where Lin Wei's fingers knew the path and her mind could float above, watching the music happen like weather.

> Then her left ear closed. Not pain. Not ringing. Just — absence. As if someone had pressed a palm flat over the left side of her skull.

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Core LLM | Claude Opus 4 (1M context) |
| Orchestration | Claude Code CLI |
| File Format | Markdown + YAML |
| IDE | VS Code |

## Documentation

See [Prototype_Documentation.md](Prototype_Documentation.md) for the full project documentation including UX design, development plan, troubleshooting log, and demo materials.

---

*Built for NYU Game Center — AI & Games (Spring 2026)*
*Powered by Claude Code + Claude Opus 4*
