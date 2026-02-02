# AI Companion & Voice Interface Specification

## 1. Overview
The goal is to elevate the "Productivity Engine" from a static tool to an active **Intelligence Partner**. This involves two distinct interaction modes:
1.  **Fast Voice Capture**: A sleek, transactional voice interface for quick brain dumps in the Quick Capture drawer.
2.  **"The Prophet" (Deep Assistant)**: A full-featured, persistent chat interface accessible via the bottom menu. It acts as a "General Manager," capable of executing actions, analyzing data, and conversing philosophically about productivity.

---

## 2. Feature 1: Quick Capture Voice Mode
**Design Philosophy:** "Record, Confirm, Done." Minimal friction.

### UI/UX
*   **Trigger:** A prominent "Microphone" icon in the Quick Capture drawer.
*   **Recording State:**
    *   Replaces the text area with a **Sleek Waveform Visualization** (using Canvas/Web Audio API).
    *   Animation scales with audio amplitude (giving a "living" feel).
    *   Stop button (Red Square) or "Tap to Finish".
*   **Processing:**
    *   Audio is transcribed (using OpenAI Whisper or Gemini Multimodal).
    *   Transcribed text is fed into the existing `parse-task` logic.
    *   Standard confirmation UI appears with the inferred Project, Duration, and Recurrence.

### Technical Stack
*   **Audio Capture:** Native Browser `MediaRecorder` API.
*   **Visualization:** Custom Canvas implementation or lightweight library (e.g., `react-audio-visualize`).
*   **Transcription:** Server Action calling Gemini 2.0 Flash (Multimodal) or Whisper.

---

## 3. Feature 2: "The Prophet" (Full AI Assistant)
**Design Philosophy:** A semi-autonomous agent that understands the user's "Entropy" and "Orbit." It is optimistic, proactive, and deeply integrated.

### UI Structure
*   **Access:** New icon in the bottom navigation bar (replacing or adding to existing generic icons).
*   **Chat Interface:**
    *   **Message Bubbles:** Distinct styles for User (Minimal) vs. AI (Glassmorphic/Premium).
    *   **Tool Invocations:** Collapsible "Thinking" or "Action" blocks showing what the AI is modifying (e.g., *Using tool `create_task`...*).
    *   **Optimistic UI:** Messages appear instantly; actions reflect immediately in the UI state.
*   **Sidebar / Drawer:**
    *   **Chat History:** List of past conversations.
    *   **New Chat:** Button to start fresh context.
    *   **Rename/Delete:** Context menu options for thread management.
*   **Input Area:**
    *   Text Input + Voice Recording Button.
    *   Waveform visualization for voice inputs.

### Capabilities (Tools)
The AI will be equipped with **Function Calling** capabilities to interact with the Supabase database.
*   **Read Access (Context):**
    *   `get_projects()`: List all active projects and their health (decay).
    *   `get_tasks(filter)`: detailed search of tasks.
    *   `get_analytics()`: Read-only access to KPI and historical data.
    *   `get_my_availability()`: Check the user's current 'Time Available' setting.
*   **Write Access (Actions):**
    *   `create_task(...)`: same logic as Quick Capture.
    *   `update_task(id, updates)`: Modify status, due date, project, etc.
    *   `delete_task(id)`: Remove items.
    *   `create_project(...)`: Spin up new "Boats."
    *   `update_project(id, updates)`: Changing tiers or decay settings.
    *   **Constraint:** *Cannot* directly modify `activity_logs` or raw analytics numbers (these are derived from actions).

### System Prompt & Personality
**Core Identity:** You are the "Entropy Engine Architect."
**Context Awareness:**
*   You know the user's "Mode" (Deep Work vs. Low Energy).
*   You understand the "Decay" mechanic: Tasks aren't just overdue; they are *rotting*.
*   You prioritize "Flow" over "Busywork."
**Tone:**
*   **Optimistic & Stoic:** Encouraging but grounded in reality.
*   **Concise:** Do not ramble.
*   **Proactive:** If the user seems overwhelmed, suggest "Admin Batching" or dropping "Shallow" tasks.

### Technical Architecture
*   **State Management:** `useChat` from Vercel AI SDK or custom hook with React Query.
*   **Database:**
    *   `chats` table (id, title, updated_at).
    *   `messages` table (id, chat_id, role, content, tool_calls).
*   **Vector Search (Optional Future):** RAG for long-term memory (not needed for MVP).

---

## 4. Implementation Phase Plan

### Phase 1: Quick Capture Voice (MVP)
1.  Implement `AudioRecorder` component (visualizer + binary capture).
2.  Update `/api/parse-task` to accept audio blobs (Gemini Multimodal).
3.  Integrate into `QuickCaptureDrawer`.

### Phase 2: Assistant Backend (Supabase + Logic)
1.  Create `chats` and `messages` tables.
2.  Define `tools` definition array for Gemini.
3.  Create `/api/chat` endpoint handling the agent loop.

### Phase 3: Assistant Frontend (The Prophet UI)
1.  Add new Route `/assistant`.
2.  Build the Chat Interface (Messages, Input, Voice).
3.  Build the Sidebar (History management).
4.  Connect to `/api/chat` with optimistic updates.
