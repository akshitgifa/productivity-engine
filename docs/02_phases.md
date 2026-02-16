# Entropy v2.0: Implementation Phases

Execution is divided into testable phases. **USER MUST TEST AFTER EACH PHASE.**

> [!NOTE]
> Strategic direction for future phases is now governed by the [Entropy v2.0 UX Vision](file:///Users/akshit2434/github/productivity-engine/docs/v2_ux_vision.md). Refer to that document for background on Navigation, Commitment, and Soft Windows logic.

---

## Phase 1: Memory (The Hippocampus) ✅
**Goal:** Assistant gains long-term memory and structured project context.

### Tasks
- [x] **1.1 Database:** Enable `pgvector` in Supabase.
- [x] **1.2 Migrations:**
    - Create `memories` table (id, content, embedding, type: 'general'|'directive', source).
    - Create `context_cards` table (project_id, content: markdown).
    - Extend `notes` table (type: 'thought'|'note'|'research', is_read, enrichment_status, anchors: jsonb).
- [x] **1.3 Logic:** Implement `/api/embed` route for generating vector embeddings.
- [x] **1.4 AI Assistant:** Update `chat/route.ts` to query memories and inject them into the system prompt.
- [x] **1.5 UI:** Build "Context Card" view in the Project Detail page (with Edit mode).
- [x] **1.6 Memory Management:** `save_memory` (auto-dedupe), `update_memory`, `delete_memory`, `list_memories`.

**TESTED ✅:** Assistant recalls preferences across sessions. Context Card UI working.

---

## Phase 2: Unstructured Dumps (The Feed) ✅
**Goal:** "Fire and forget" thought dumps and the "Catch Up" loop.

### Tasks
- [x] **2.1 UI:** Upgrade Quick Capture Drawer with a "Thought Mode" (Silent Dump).
- [x] **2.2 Logic:** Thought Mode inserts directly into `notes` with `is_read = false`.
- [x] **2.3 UI:** Add "Sparkle" icon to the main Navigation header. It pulses if unread notes exist.
- [x] **2.4 UI:** Build the "Catch Up" Overlay to list unread thoughts/insights.

**TESTED ✅:** User verified Thought Mode capture and Catch Up review flow.

---

## Phase 2.5: Local-First Hardening ✅
**Goal:** Universal offline support and real-time sync transparency.

### Tasks
- [x] **2.5.1 Migration:** Move all remaining pages (`Portfolio`, `Review`, `Home Prefs`) from direct Supabase reads to Dexie/localStorage.
- [x] **2.5.2 Resilience:** Hardened `mapTaskData` to prevent "Inbox" glitch during initial data sync.
- [x] **2.5.3 UI:** Build global `SyncIndicator` (Top progress bar for initial fetch, floating pill for outbox push).
- [x] **2.5.4 DevEx:** Eliminate React Query collisions between Home and Task Manager via unique keys.

**TESTED ✅:** App works fully offline for all core views. Sync status is visible and non-glitchy.

---

## Phase 2.6: Sync & Outbox Hardening ✅
**Goal:** High-performance parallel sync and production-grade outbox robustness.

### Tasks
- [x] **2.6.1 Logic:** Implement **Parallel Metadata Pull** (parallelly verify `updated_at` before full pulls).
- [x] **2.6.2 Logic:** Implement **Multi-Tab Mutex** using Web Locks API to prevent sync races.
- [x] **2.6.3 Hybrid:** Implement **Outbox Robustness** (retry counts, batching limits, and validation failure handling).
- [x] **2.6.4 UX:** Universal **Soft-Delete with Undo** support across all data types.
- [x] **2.6.5 Hygiene:** Implement **Local Archival** (purge soft-deleted items older than 30 days).
- [x] **2.6.6 Schema:** Repair all synced tables with `updated_at` columns, triggers, and Supabase B-tree indexes.

**TESTED ✅:** Deletions are revocable. Sync is near-instant on refresh. Multi-tab concurrency is safe.
 
---
 
## Phase 2.12: Navigation & Momentum Engine (P0) ✅
**Goal:** Unified navigable agenda with intentional commitment and historical auditing.

### Tasks
- [x] **2.12.1 Engine:** Multi-day `memoizedDisplayTasks` with swipeable header navigation.
- [x] **2.12.2 Logic:** Carry-Forward logic (past tasks automatically appear in Today).
- [x] **2.12.3 Retrospective:** Journal-style view for past days (Missed vs. Completed logic).
- [x] **2.12.4 Momentum:** Today's completed tasks stay in the agenda list with bold visuals.
- [x] **2.12.5 UX:** Unified action bubbles for mobile task orchestration.

**TESTED ✅:** User confirmed the "Navigation Engine" and "Momentum Engine" are fully operational.

---

## Phase 3: Soft Windows & Dynamic Decay (P1) ✅
**Goal:** Flexible non-deadline scheduling and automatic maintenance of the backlog.

### Tasks
- [x] **3.1 Schema:** Update tasks table with `planned_date` and `planned_date_type` (on/before).
- [x] **3.2 Engine:** Implement "Distribution Logic" in `engine.ts` to spread "before" tasks across available agenda windows.
- [x] **3.3 UX:** Add "Within X Days" selector to Quick Capture and Task Detail.
- [x] **3.4 Decay:** Implement 3-day overdue "pulse" animation and context-aware swipe actions (Recommit/Unplan).
- [x] **3.5 UX:** Build lightweight "Quick Reschedule" popover menu for rapid mobile triage.

**TESTED ✅:** User verified Soft Windows distribution, pulsing decay animations, and the new swipe-to-reschedule flow.

---

## Phase 4: Zero-Friction Dump (P2)
**Goal:** The universal receiver — auto-classification of thoughts vs. tasks.

### Tasks
- [ ] **4.1 AI:** Enhance the backend classifier to handle ambiguous dumps (thought vs. task vs. note).
- [ ] **4.2 UI:** Unified input bar that accepts anything without mode-switching.
- [ ] **4.3 Verification:** "Catch Up" loop refinement to process ambiguous dumps into structured records.

---

## Phase 5: Super Input & Final Polish
**Goal:** Power-user speed layers and deep context integration.

### Tasks
- [ ] **5.1 UX:** Real-time token highlighting for `#project`, `@date`, and `!priority` in input.
- [ ] **5.2 Context:** Integrated "Contextual Assistant" scoped to individual project cards.
- [ ] **5.3 Performance:** Final bundle optimization and haptic refinement for all gestures.
