# Entropy | Dynamic Context Engine

**Status:** Active Beta  
**Stack:** Next.js 15 · Supabase · Dexie.js (local-first) · Gemini 2.0 Flash

> *"In an era of infinite distraction, the greatest luxury is focus."*

Entropy is a high-performance productivity engine for power users managing multiple projects. It models neglected work as **entropy** — the inevitable decay of unattended priorities — ensuring nothing critical slips through while hiding what doesn't matter *now*.

---

## Architecture

### Local-First (Offline-Ready)
The application follows a strict **Local-First** pattern. Nearly all reads query the local Dexie.js (IndexedDB) instance for zero-latency performance. All mutations (tasks, projects, notes, etc.) are written locally and recorded in a **Sync Outbox**, which is processed in the background to keep Supabase in sync. This ensures the app remains fully functional offline.

### Global Sync Status
A subtle, global **Sync Indicator** provides real-time feedback:
- **Initial Sync**: A progress bar tracks the loading of historical data from Supabase.
- **Background Push**: A floating "Saving" indicator appears when the outbox is being processed.

### Deadline-Aware Sorting
Tasks are sorted via **`sortTasksByUserOrder()`** in `src/lib/engine.ts`:
1. **Deadlined tasks** float above non-deadlined tasks.
2. Among deadlined: manual drag order (`sort_order > 0`) overrides deadline sort; unranked tasks sort by soonest deadline.
3. **Non-deadlined tasks** sort by manual drag order.
4. **Urgency score** serves as the final tiebreaker.

Setting a deadline resets `sort_order` to 0 (enters deadline pool). Dragging assigns an explicit order that persists.

### Core Modules
| Module                            | Purpose                                                         |
| --------------------------------- | --------------------------------------------------------------- |
| `src/lib/engine.ts`               | Urgency scoring, sorting, sort compaction                       |
| `src/lib/taskService.ts`          | Centralized task mutations (Dexie + outbox) with business rules |
| `src/lib/ai/tools.ts`             | AI tool registry (15+ tools with God Mode access)               |
| `src/hooks/useTaskFulfillment.ts` | Task completion, recurrence, project rejuvenation               |
| `src/lib/sync.ts`                 | Multi-table outbox sync to Supabase                             |
| `src/store/syncStore.ts`          | Global sync state management                                    |

---

## Key Features

- **Dashboard**: Curated execution queue sorted by urgency, deadlines, and energy mode
- **Portfolio**: Per-project task management with health tracking, KPIs, and context cards
- **AI Assistant**: Multimodal chat (text + voice) with tool access to the full database
- **Quick Capture**: Voice → transcription → structured task creation in one flow
- **Notes**: Standalone AI-enhanced knowledge base with markdown editing
- **Export**: Screenshot-ready progress reports with privacy controls
- **Smart Recurrence**: Completed recurring tasks auto-spawn with `waiting_until` dates
- **Subagents**: Background AI workers for parallel research and analysis

---

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm

### Setup
```bash
pnpm install
cp .env.example .env.local
# Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#           GEMINI_API_KEY, SUPABASE_SERVICE_ROLE_KEY
pnpm dev
```

### Developer References
- [plan.md](./plan.md) — Roadmap and pending features
- [ai_assistant_spec.md](./ai_assistant_spec.md) — AI tool catalog and voice interface
- [docs/](./docs/) — Detailed architecture docs

---

## Deployment
Optimized for Vercel. Supports PWA installation for native-like mobile experience.
