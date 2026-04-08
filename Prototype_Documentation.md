# NovelWright: AI-Powered Collaborative Novel Writing Tool
## Prototype Documentation — Assignment 8

> **GitHub Repository:** [github.com/lingrei/NovelWright](https://github.com/lingrei/NovelWright)
> **Project Page:** [abovetheblueprints.com/NovelWright](http://abovetheblueprints.com/NovelWright/)

---

## 1. User Experience Design

### Design Evolution

**Phase 1: Initial Concept (Chat-Only Interface)**

The earliest prototype was purely CLI-based — the user interacts with Claude through a terminal/IDE, and the agent reads/writes project files directly. This turned out to be the *right* approach for our target audience (writers who think in terms of outlines and structure), because:

- Writers already work in text editors
- The file-based approach means all project state is human-readable markdown
- No custom UI development needed — the "interface" IS the file system + conversation

**Phase 2: Current Prototype (Structured File System + Slash Commands)**

The current UX is a **structured conversation workflow** powered by slash commands:

```
User types: /planning
→ Agent loads the Planning orchestrator
→ Guides user through W1 (Worldbuilding) → W2 (Character Design) → W3 (Plot Structure)
→ At each step, Agent writes results directly to project files
→ User reviews files, provides feedback, iterates

User types: /writing  
→ Agent loads the Writing orchestrator
→ Automatically loops: Plan chunk → Write batches → Review → Consolidate → Next chunk
→ Produces polished prose in _Draft.md
```

**Wireframe: Project File Structure (The "UI")**

```
sample_project/
├── _Setting.md      ← World rules + Character profiles (user reviews/edits)
├── _Story.md        ← Plot structure + Chunk plans (user reviews/edits)
├── _Draft.md        ← Final prose output (agent writes, user reads)
├── _state.yaml      ← Machine-readable progress state (agent manages)
├── _chunk_plan.md   ← Current execution plan (agent generates per-chunk)
├── _chunk_review.md ← Quality audit report (agent generates per-chunk)
└── drafts/          ← Individual batch files (working drafts before merge)
```

**Wireframe: Interaction Flow**

```
┌─────────────────────────────────────────────────────────────┐
│  USER (Director/Architect)                                   │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ "I want a story about a pianist losing her hearing"     ││
│  └─────────────────────────────────────────────────────────┘│
│                            ↓                                 │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ AGENT (Execution Engine)                                ││
│  │                                                         ││
│  │ Phase 0: Inspiration ──→ Core premise extraction        ││
│  │ W1: Worldbuilding ────→ _Setting.md Part 1              ││
│  │ W2: Characters ───────→ _Setting.md Part 2              ││
│  │ W3: Plot Structure ───→ _Story.md                       ││
│  │ W4: Writing Loop ─────→ _Draft.md (automated)           ││
│  │ W5: Full Audit ───────→ Quality polish                  ││
│  └─────────────────────────────────────────────────────────┘│
│                            ↓                                 │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ OUTPUT: Polished prose with consistent voice,           ││
│  │ pacing control, and sensory density                     ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

**Design Decision: Why Not a Web App?**

We deliberately chose a file-based CLI approach over a web application because:
1. **Writers don't need another app** — they need a better writing process
2. **Markdown files are portable** — readable anywhere, version-controllable with git
3. **The conversation IS the interface** — natural language beats button-clicking for creative collaboration
4. **Development speed** — all engineering effort goes into prompt engineering and workflow design, not frontend code

---

## 2. Development Plan

### AI Models Used

| Component | Model | Why This Model |
|-----------|-------|----------------|
| **Core Writing Engine** | Claude Opus 4 (1M context) | Largest context window for maintaining novel-length consistency. Best creative writing quality among available LLMs. |
| **Sub-Agent Reviews** | Claude Opus 4 | Independent audit agents need same-quality reasoning to catch issues |
| **Orchestration** | Claude Code (CLI tool) | Native file I/O, slash commands, agent spawning — purpose-built for this workflow |

### Prompt Engineering Architecture

The system uses a **multi-layered prompt architecture**:

1. **CLAUDE.md (Auto-loaded)** — Core aesthetic constitution. Defines sensory density standards, derivation chain rules, vocabulary classification, and the Dilation system. ~400 lines.

2. **Slash Commands (.claude/commands/)** — 19 specialized skill modules loaded on-demand:
   - Orchestrators: `planning.md`, `writing.md`
   - Skills: `story-engine.md`, `character-engine.md`, `voice-engine.md`, `plot-structure.md`, `narrative-dynamics.md`, `chunk-planner.md`, `camera-os.md`, `prose-auditor.md`, `consolidation-engine.md`
   - Sub-Agents: `review-agent.md`, `redteam-agent.md`, `outline-review-agent.md`, `retrospect-agent.md`
   - Post-production: `full-audit.md`, `publish.md`, `retrospect.md`

3. **Knowledge Base (.agent/knowledge/)** — Reference documents loaded per-session:
   - 6 golden example files (writing principle calibration)
   - Craft reference files (technique libraries)

4. **Project Files** — Per-project state that the agent reads for context:
   - `_Setting.md`, `_Story.md`, `_Draft.md`, `_state.yaml`

### Key Technical Innovations

**1. The Derivation Chain**
Every design decision must trace back to the core premise through a mandatory logic chain. This prevents "AI drift" where the model generates plausible but irrelevant content.

**2. Beat Theory + Dilation System**
Prose pacing is controlled through a "Dilation Level" (1-10) assigned to each story beat. High-dilation beats (7-10) get maximum sensory detail and slow-motion treatment. Low-dilation beats (1-3) move quickly. This replaces the typical "write more" / "write less" instructions with a precise pacing control system.

**3. Cognitive Independence via Sub-Agents**
Quality review is performed by separate AI agents that don't share the writing session's conversation history. This eliminates "self-review bias" — the reviewer literally cannot remember the compromises made during writing.

**4. 4D State Tracking**
Story state is tracked across 4 dimensions in `_state.yaml`:
- META: Absolute truths (world rules, hidden information)
- POV: What each character knows/doesn't know
- PHYSICAL: Object states, locations, injuries
- IRREVERSIBLE: Thresholds that cannot be uncrossed

### Tools Used

| Tool | Purpose |
|------|---------|
| **Claude Code** | Primary development environment — CLI tool for AI-assisted coding and agent orchestration |
| **Claude Opus 4** | Core LLM for all generation and reasoning |
| **VS Code** | IDE for editing prompt files and reviewing output |
| **Git** | Version control for the agent system itself |
| **Markdown** | All project files use markdown for human readability |

---

## 3. Prototype Demo

### What Works Now

- **Full W1-W3 Planning Pipeline:** User can invoke `/planning` and be guided through worldbuilding, character design, and plot structure. All output is written to project files in real-time.
- **W4 Automated Writing Loop:** The `/writing` command triggers a fully automated loop that plans chunks, writes batches, self-reviews, and consolidates into the final draft.
- **Sub-Agent Review System:** Independent review agents can be spawned to audit writing quality without self-review bias.
- **Session Recovery:** If a writing session is interrupted, the next session automatically detects the breakpoint and resumes from exactly where it left off.
- **Voice Consistency:** The Voice Engine locks in a specific narrative voice (narrator type, rhythm, vocabulary constraints) that persists across all chunks.

### Sample Project: "The Crescendo"

A short literary fiction piece about a concert pianist hiding progressive hearing loss. The `sample_project/` folder contains:
- Complete `_Setting.md` (world rules + 2 character profiles)
- Complete `_Story.md` (4-chunk plot structure)
- Partial `_Draft.md` (~2,000 words of polished prose for Chunks 1-2)
- Active `_chunk_plan.md` (execution plan for Chunk 3)
- `_state.yaml` (4D state after Chunk 2)

### Video/Photo Evidence

*(Videos to be recorded separately — demonstrating:)*
1. Invoking `/planning` and walking through W1 worldbuilding
2. The automated `/writing` loop producing a chunk of prose
3. Session recovery after interruption
4. Sub-agent review producing an independent audit report

---

## 4. Troubleshooting Log

### Challenge 1: Context Window Limitations
**Problem:** Novel-length projects exceed even the 200K context window. The agent would "forget" earlier chapters.  
**Solution:** Designed the 4D state tracking system (`_state.yaml`) + file-based architecture. The agent only loads what it needs: current chunk plan, recent draft tail, character profiles, and state file. This keeps context usage under 50K tokens per writing session.

### Challenge 2: AI Prose "Drift"
**Problem:** Over long writing sessions, the AI's prose style would gradually drift toward generic LLM-default patterns — losing the specific voice defined in W1.  
**Solution:** Implemented Voice Recalibration Protocol — every 3 batches, the agent re-reads the Voice definition from `_Setting.md`. Also, golden examples are loaded at session start as calibration anchors.

### Challenge 3: Self-Review Bias
**Problem:** When the same AI session writes AND reviews its own work, it tends to approve everything (it already "knows" the intent behind each sentence).  
**Solution:** Built the sub-agent architecture. Review agents are spawned as separate conversations with no access to the writing session's history. They only see the output files + the original plan, making them genuinely independent reviewers.

### Challenge 4: Pacing Control
**Problem:** AI tends to write everything at the same pace — either all dense or all summary. Couldn't match the controlled rhythm of professional fiction.  
**Solution:** Developed the Dilation Level system (1-10 scale). Each beat is assigned a dilation rating during planning. The writing engine uses this to calibrate sensory density — high dilation = slow-motion detail, low dilation = brisk pacing.

### Challenge 5: "Blank Page" Problem for Users
**Problem:** Users with great ideas but no writing experience didn't know where to start.  
**Solution:** The Phase 0 → W1 → W2 → W3 pipeline acts as a structured questionnaire that extracts the story from the user through guided questions. The user never faces a blank page — they answer questions, and the system builds the story architecture.

### Challenge 6: Slash Command Loading Overhead
**Problem:** Loading all 19 command files at once would waste context tokens.  
**Solution:** Implemented on-demand loading with a skip protocol. Each skill is loaded only when its phase activates, and can be skipped if already loaded within the current session and within 3 chunks.

---

## 5. What Support I Need From the Instructor

1. **Evaluation Criteria for AI-Generated Prose:** How should we assess the quality of AI-generated creative writing? Are there established rubrics from computational creativity research?

2. **RAG Integration Guidance:** The current prototype uses file-based context loading. For novel-length projects (100K+ words), a RAG system would help with long-range consistency (e.g., remembering foreshadowing from Chapter 1 when writing Chapter 20). What vector database would you recommend for creative writing applications?

3. **User Study Design:** If I want to test this with actual writers, what's a good study design for evaluating collaborative AI writing tools? Should I measure output quality, user satisfaction, or creative process changes?

---

## 6. Architecture Diagram

```
                    ┌──────────────────────┐
                    │     User (Director)   │
                    └──────────┬───────────┘
                               │
                    ┌──────────▼───────────┐
                    │   CLAUDE.md (Core     │
                    │   Aesthetic Config)    │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
    ┌─────────▼──────┐ ┌──────▼───────┐ ┌──────▼───────┐
    │  /planning     │ │  /writing    │ │  Sub-Agents  │
    │  (W1-W3)       │ │  (W4 Loop)  │ │  (Review)    │
    └────┬───────────┘ └──────┬───────┘ └──────┬───────┘
         │                    │                │
    ┌────▼────┐          ┌────▼────┐      ┌────▼────┐
    │ Skills  │          │ Skills  │      │ Read-   │
    │ story-  │          │ chunk-  │      │ Only    │
    │ engine  │          │ planner │      │ Audit   │
    │ char-   │          │ camera- │      │         │
    │ engine  │          │ os      │      │         │
    │ plot-   │          │ prose-  │      │         │
    │ struct  │          │ auditor │      │         │
    └────┬────┘          └────┬────┘      └────┬────┘
         │                    │                │
         ▼                    ▼                ▼
    ┌─────────────────────────────────────────────┐
    │            Project Files                     │
    │  _Setting.md │ _Story.md │ _Draft.md        │
    │  _state.yaml │ _chunk_plan.md               │
    └─────────────────────────────────────────────┘
```

---

## 7. Source Code

**GitHub Repository:** [github.com/lingrei/NovelWright](https://github.com/lingrei/NovelWright)
**Project Page:** [abovetheblueprints.com/NovelWright](http://abovetheblueprints.com/NovelWright/)

All source code is also included in this submission folder:

- **`CLAUDE.md`** — Core system prompt (~400 lines) defining the narrative aesthetics constitution
- **`.claude/commands/`** — 19 slash command files (orchestrators, skills, sub-agents)
- **`.agent/knowledge/`** — Reference knowledge base (golden examples + craft references)
- **`sample_project/`** — Working demo project with partial draft

Total system: ~3,000 lines of structured prompt engineering across 30+ files.

---

## 8. Next Steps (Week 2)

1. **Complete the sample project** — finish writing all 4 chunks to have a complete short story demo
2. **Record demo videos** — capture the planning and writing workflows in action
3. **Add session recovery demo** — show the system resuming from an interrupted state
4. **Explore RAG integration** — research vector database options for long-form consistency
5. **User testing** — have 1-2 writers try the system and collect feedback

---

*Built with: Claude Code + Claude Opus 4 | All AI tools disclosed*
