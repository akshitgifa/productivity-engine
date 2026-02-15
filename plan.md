# Entropy Roadmap

> **Status:** Core features complete. Polishing and expanding intelligence capabilities.

## Completed

- [x] Dashboard with urgency-based execution queue
- [x] Portfolio with project health, KPIs, and context cards
- [x] AI Assistant with God Mode tool access (15+ tools)
- [x] Voice capture → transcription → structured task creation
- [x] Task enrichment (notes, subtasks, deadlines, recurrence)
- [x] Notes page with AI refinement and markdown editing
- [x] Export / screenshot mode with privacy controls
- [x] Local-first data architecture (Dexie + outbox sync)
- [x] Global Sync Status Indicator (progress bar + outbox pill)
- [x] Centralized `taskService.ts` for all task mutations
- [x] Deadline-aware sorting with manual override
- [x] Sort compaction on task completion
- [x] Background subagents for parallel research
- [x] Web search tool integration
- [x] Memory system (embeddings + retrieval)
- [x] Smart recurrence with `waiting_until` scheduling
- [x] Service Worker caching for instant loads
- [x] Incremental sync (fetch deltas via `updated_at`)
- [x] Soft-delete & Undo system with local archival
- [x] **Today View**: Intentional daily agenda with manual commitment
- [x] **Proactive Agenda**: Top Picks suggestions for empty Today states
- [x] **Mobile Action Bubbles**: Creative hold-and-drag interaction for task management
- [x] **Unified DraggableDrawer**: Stable, velocity-sensitive mobile sheet with portal-based layering
- [x] **initialSync Mutex**: Prevents `AbortError` race conditions during navigation
- [x] **viewMode Persistence**: Home page remembers Today vs Master List view
- [x] **Real-time UI Refresh**: Auto-update on sync completion via global event bridge

## Pending

### Proactive Intelligence
- [ ] Decay notifications — AI alerts user about critical project entropy
- [ ] Dynamic KPI suggestions based on task completion patterns

### Execution Optimization
- [ ] Pomodoro integration — timer synced with session modes

### Knowledge Graph
- [ ] Cross-note linking and backlinks
- [ ] Contextual assistant scoped to individual notes

---

## Developer Notes
- **Supabase**: Real-time on `tasks` and `projects`. Service role key for system bypass.
- **AI SDK**: Vercel AI SDK with `gemini-2.0-flash`.
- **Styling**: Vanilla CSS only. No Tailwind.
- **Sort logic**: `src/lib/engine.ts` → `sortTasksByUserOrder()` is the single source of truth.
- **Mutations**: `src/lib/taskService.ts` is the single entry point for all task writes.