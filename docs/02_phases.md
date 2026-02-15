# Entropy v2.0: Implementation Phases

Execution is divided into 5 testable phases. **USER MUST TEST AFTER EACH PHASE.**

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
 
## Phase 2.7: Today View & Intentionality ✅
**Goal:** Focus from "everything" to "today's commitments".

### Tasks
- [x] **2.7.1 Schema:** Add `planned_date` to tasks table (and cloud migration).
- [x] **2.7.2 UI:** Replace "Orbit" with "Today" view. Implement Today/Syllabus toggle.
- [x] **2.7.3 Mobile:** Build "Action Bubbles" (Hold-and-drag menu) for Complete/Delete/Commit.
- [x] **2.7.4 Engine:** Standardize local date string comparison to fix midnight-to-5:30AM timezone gap.
- [x] **2.7.5 Proactive:** "Plan Your Day" empty state with "Top Picks" from the Syllabus.

**TESTED ✅:** User verified the "Commit" flow and the creative mobile interaction bubble feedback.

---

## Phase 2.8: Account & Identity ✅
**Goal:** Secure multi-user support and personal environment settings.

### Tasks
- [x] **2.8.1 Auth:** Fully integrated Supabase Auth with registration, login, and email verification.
- [x] **2.8.2 Flow:** Implemented "Forgot Password" and "Reset Password" security loops.
- [x] **2.8.3 Identity:** Build "Profile" page for managing display names and user metadata.
- [x] **2.8.4 Preferences:** Build "Settings" page for Focus Window and connectivity monitoring.
- [x] **2.8.5 Privacy:** Isolated all local data per-user and implemented multi-tab multi-user safety.

**TESTED ✅:** User verified registration, login, and profile persistency.

---

## Phase 2.9: Creative Customization (Live Preview) ✅
**Goal:** High-fidelity project card personalization with real-time feedback.

### Tasks
- [x] **2.9.1 UI:** Build "Project Settings Popout" with `react-colorful` and layout controls.
- [x] **2.9.2 Preview:** Implement "Card Isolation" (scaling + dimming backdrop) when editing.
- [x] **2.9.3 Logic:** Add real-time style overrides (bgColor, color, fontFamily) via local state.
- [x] **2.9.4 Themes:** Create distinct theme presets (Glass, Neo-Brutal, Cyberpunk, etc.).
- [x] **2.9.5 Layout:** Implement snapping grid size controls for project cards.

**TESTED ✅:** Real-time customization works for all projects. Themes override custom styles correctly.

---

## Phase 2.10: Mobile Interaction & Performance ✅
**Goal:** Frictionless mobile gestures and optimistic page loads.

### Tasks
- [x] **2.10.1 UX:** Implement 600ms long-press gesture with haptic feedback for mobile customization.
- [x] **2.10.2 UI:** Ensure settings icon is always visible on touch devices for discoverability.
- [x] **2.10.3 Performance:** Replace text-based loading state with layout-matched Skeleton Loaders.
- [x] **2.10.4 Hydration:** Implement progressive loading (Identity first, tasks/analytics later).

**TESTED ✅:** Mobile long-press is reliable. Project pages feel "instant" due to skeletons and local cache.

---

## Phase 2.11: UI & Sync Stabilization ✅
**Goal:** Unified gesture primitives and race-condition free synchronization.

### Tasks
- [x] **2.11.1 UI:** Build unified `DraggableDrawer` with **Projection-Based Snapping** (velocity-aware).
- [x] **2.11.2 UI:** Port `QuickCapture` and `ProjectSettings` to the new stable drawer primitive.
- [x] **2.11.3 UI:** Implement portal-based layering with high z-index (10000) for global coverage.
- [x] **2.11.4 Sync:** Implement **Instance Mutex** (`initialSyncInProgress`) to eliminate `AbortError` race conditions.
- [x] **2.11.5 Hydration:** Added **Hydration Guards** and `viewMode` persistence to ensure visual stability.

**TESTED ✅:** Drawer gestures feel native. Rapid refreshes are stable. Master List view persists.

---

## Phase 3: Background Intelligence (The Subconscious)
**Goal:** Subagents and web research.

### Tasks
- [ ] **3.1 Database:** Create `background_jobs` and `job_logs` tables.
- [ ] **3.2 Logic:** Create Supabase Edge Function `subagent-executor` with full tool access.
- [ ] **3.3 Assistant:** Implement `spawn_subagent` and `search_web` tools.
- [ ] **3.4 UI:** Build real-time "Background Tasks" panel in the chat view.

**TEST:** Say "Research feasibility of Pursuing Brass Keyboards". Verify job starts and logs progress.

---

## Phase 4: Smart Notes (Temporal Anchors)
**Goal:** Line-level intelligence and interactive notes.

### Tasks
- [ ] **4.1 Logic:** Implement Regex parser for `@date` anchors in note content.
- [ ] **4.2 UI:** Customize Markdown renderer to Highlight anchors and render clickable checkboxes `[ ]`.
- [ ] **4.3 Feature:** Clicking an anchor allows spawning a Task with that date.

**TEST:** Write "Register for summit @March 15" in a note. Verify date is highlighted and clickable.

---

## Phase 5: Polish & Integration
**Goal:** Final refinement and seamless navigation.

### Tasks
- [ ] **5.1 Integration:** Deep link Catch Up cards to their respective notes/projects.
- [ ] **5.2 Polish:** Refine Sparkle pulse animations and job log UI.
- [ ] **5.3 Context:** Enable "Contextual Assistant" - button in notes to chat specifically about that note.
- [ ] **5.4 Final Docs:** Update README and project specs to reflect v2.0 stable.

**TEST:** Full walkthrough of the Second Brain loop.
