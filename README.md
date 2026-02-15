# Entropy | Dynamic Context Engine

**Status:** Active Beta  
**Stack:** Next.js 15 · Supabase · Dexie.js (local-first) · Gemini 2.0 Flash

> *"In an era of infinite distraction, the greatest luxury is focus."*

Entropy is a high-performance productivity engine for power users managing multiple projects. It models neglected work as **entropy** — the inevitable decay of unattended priorities — ensuring nothing critical slips through while hiding what doesn't matter *now*.

### Account & Identity
Entropy now features a full-access **Identity System**:
- **Secure Authentication**: Built-in login, registration, and email verification via Supabase Auth.
- **Forgot Password**: Fully integrated password recovery and reset flows.
- **User Profiles**: Persistent user metadata including display names and email management.
- **Localized Settings**: Customizable focus windows and real-time connectivity monitoring.

---

## Architecture

### Local-First (Offline-Ready)
The application follows a strict **Local-First** pattern. Nearly all reads query the local Dexie.js (IndexedDB) instance for zero-latency performance. All mutations (tasks, projects, notes, etc.) are written locally and recorded in a **Sync Outbox**, which is processed in the background to keep Supabase in sync. This ensures the app remains fully functional offline.

### Global Sync Status
A subtle, global **Sync Indicator** provides real-time feedback:
- **Initial Sync**: A progress bar tracks the loading of historical data from Supabase.
- **Background Push**: A floating "Saving" indicator appears when the outbox is being processed.

### High-Performance Synchronization
The sync engine is optimized for speed and production-grade reliability:
- **Parallel Metadata Checks**: Instead of blanket pulls, the app queries the latest cloud timestamp for each table in parallel. If no changes are detected, the full data pull is skipped.
- **Concurrent Pulls**: Multiple tables are synchronized simultaneously using `Promise.all` to eliminate boot-time bottlenecks.
- **Multi-Tab & Instance Mutex**: Leverages the Web Locks API and internal state guards (`initialSyncInProgress`) to ensure only one sync process runs at a time. This prevents `AbortError` race conditions during rapid refreshes or navigations.
- **Failure-Aware Outbox**: Sync outbox includes a retry mechanism and batching to ensure transient failures don't block the data queue.

### Identity & Profiles
Secure authentication, multi-user isolation, and customizable profile settings are integrated directly into the local-first engine.

### Soft-Delete & Undo System
Mutations follow a **Soft-Delete** pattern:
- Items aren't immediately purged; they are marked `is_deleted: true`.
- **Undo Toast**: A 5-second window appears after any deletion, allowing instant restoration.
- **Local Archival**: Soft-deleted records older than 30 days are automatically purged from local storage to maintain performance.

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

- **Dashboard**: Curated execution queue sorted by urgency and deadlines
- **Portfolio**: Per-project task management with health tracking, KPIs, and context cards
- **AI Assistant**: Multimodal chat (text + voice) with tool access to the full database
- **Quick Capture**: Voice → transcription → structured task creation via a unified mobile drawer.
- **Notes**: Standalone AI-enhanced knowledge base with markdown editing
- **Export**: Screenshot-ready progress reports with privacy controls and automatic profile name integration
- **Profile & Settings**: Centralized account management and engine preference control
- **Smart Recurrence**: Completed recurring tasks auto-spawn with `waiting_until` dates
- **Master List**: Unified view of all fragments in the system with **viewMode persistence** (localStorage).
- **Creative Customization**: Real-time theme editing with live preview and **Unified DraggableDrawer** styling.
- **Mobile Performance**: **Velocity-sensitive DraggableDrawer** with projection-based snapping and portal-based layering (z-10000).

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
# Optional: SUPABASE_AUTH_EXTERNAL_URL (for custom callback domains)
pnpm dev
```

### Developer References
- [docs/v2_ux_vision.md](./docs/v2_ux_vision.md) — **Strategic Roadmap for Entropy v2.0**
- [plan.md](./plan.md) — Detailed engineering roadmap and pending features
- [ai_assistant_spec.md](./ai_assistant_spec.md) — AI tool catalog and voice interface
- [docs/](./docs/) — Detailed architecture docs

---

## Deployment
- **Platform**: Optimized for Vercel. 
- **PWA**: Supports PWA installation. Note: **Service Workers are disabled in development mode** to prevent CSS/layout corruption caused by Turbopack chunk rotation.
