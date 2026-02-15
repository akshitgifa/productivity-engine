# Entropy Platform Overview

## What is Entropy?

**Entropy** is a high-performance context engine designed for power users managing multiple complex projects ("projects") simultaneously. Named after the physics concept, it treats potential work as living entities that decay when neglected—ensuring nothing critical slips through the cracks while hiding the clutter that doesn't matter *now*.

### Core Philosophy
- **High-Performance Minimalism:** Speed, clarity, and visual elegance. The interface should feel like a premium tool, not just a web app.
- **Probabilistic Scheduling:** Work is modeled as entropy (decay). If you ignore a project, its tasks rise in urgency automatically.
- **Intentional Commitment:** The "Today" view acts as a daily fortress, where only tasks you explicitly commit to or that have absolute deadlines appear.
- **Cognitive Partnership:** The AI Assistant is moving from a simple tool to a "Second Brain" that remembers, anticipates, and acts in the background.

### Current Features (v1.0)
- **Today View & Master List:** Dual modes for execution. "Today" is a curated agenda; "Master List" is the full, urgency-ranked backlog.
- **Action Bubbles:** Creative mobile interactions (hold-and-drag) for swift task management.
- **Dashboard:** A dynamic, urgency-sorted task list using the entropy decay algorithm.
- **Projects:** High-level tracking of active projects with tier-based weights and health monitoring.
- **AI Assistant (Chat):** A "God Mode" Assistant capable of managing tasks and projects via tool calls.
- **Notes:** AI-enhanced knowledge base for unstructured thoughts.
- **Quick Capture:** Rapid mobile-first entry for tasks via text or voice.
- **High-Performance Sync:** Parallelized pulls with metadata-driven validation (skips unchanged tables), multi-tab mutex, and **internal instance mutex** (`initialSyncInProgress`) to handle rapid navigation concurrency.
- **Identity & Profiles:** Secure authentication, multi-user isolation, and customizable profile settings.
- **Soft-Delete with Undo:** 5-second safety window for deleted items.
- **Creative Customization:** High-fidelity project card personalization with "Live Preview" and real-time feedback.
- **Mobile Refinements:** **Unified DraggableDrawer** with velocity-sensitive snapping, native pointer event control, and portal-based z-index (10000) layering.

### v2.0 Vision: The Strategic Roadmap
The next evolution of Entropy focuses on moving from a productivity tool to a **Long-Term Context Engine**. 

Detailed planning for this phase is maintained in [docs/v2_ux_vision.md](file:///Users/akshit2434/github/productivity-engine/docs/v2_ux_vision.md).

Key Pillars from the Vision:
1. **The Navigation Engine:** Mastering the Daily Fortress vs. the Global Syllabus.
2. **Accountability & Momentum:** Honest retrospectives and intentional carry-forward logic.
3. **Soft Windows & Dynamic Decay:** High-intensity focus through smart visual priority.
4. **The Second Brain:** Long-term memory, subagents, and proactive intelligence.

---

# Developer Guidelines

> **CRITICAL: Read before implementing any code.**

## Environment & Tooling
- **Package Manager:** Use `pnpm` exclusively. Never use `npm` or `yarn`.
- **Primary Stack:** Next.js 15 (App Router), Dexie.js (Local Storage), Supabase (Cloud Sync + pgvector), Vercel AI SDK (Gemini-2.0-flash).
- **Styling:** **Vanilla CSS only.** Avoid Tailwind CSS unless specifically requested. Maintain a "High-Performance Minimalism" aesthetic.
- **Communication & UI:** **Use simple English only.** Avoid "buzzwords," overly thematic, or complex terminology (e.g., use "Reset Password" instead of "Forgot Strategy") unless the USER explicitly asks for a specific theme or aesthetic.

## Development Flow
1. **Phase-based Execution:** Follow the implementation phases in [doc/02_phases.md](file:///Users/akshit2434/github/productivity-engine/docs/02_phases.md).
2. **Build Verification:** Always run `pnpm build` to ensure type safety and error-free builds before testing.
3. **Testing Protocol:**
    - **NO browser automation.** Do not use browser subagents or automated testing tools for UI verification.
    - **User-Led Verification:** After completing a phase, the USER will manually test the feature in the browser and report back.
    - Only proceed to the next phase after user confirmation.

## Code Integrity
- **Local-First Pattern:** All data operations MUST prioritize the local Dexie database for zero-latency performance.
- **High-Performance Synchronization:** The `sync.ts` engine uses metadata-driven parallel pulls, a tab-mutex (Web Locks API), and a **local mutex guard** to maintain consistency with minimal overhead and zero race conditions (`AbortError`).
- **Mutations:** Use the "Dexie + Outbox" pattern for all writes. Deletions are "soft" using `is_deleted` to enable undo functionality.
- **Local Archival:** To keep IndexedDB slim, soft-deleted records are automatically purged locally after 30 days.
- **Engine Logic:** `src/lib/engine.ts` is the single source of truth for urgency math.
- **AI Integration:** Use Vercel AI SDK for all AI Assistant interactions. Ensure multi-step tool calls are enabled.
