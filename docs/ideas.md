# Backlog & Ideas

This document tracks future concepts, feature ideas, and architectural improvements that are not currently in the immediate roadmap but are worth considering for future phases.

## Features

### 1. Time Budgeting / Daily Focus Window
- **Concept:** Instead of just filtering tasks, the system should allow users to set a "Focus Window" (e.g., 2 hours).
- **Behavior:** The "Today" view would show a progress bar indicating how much of the budget is filled by planned tasks. If the budget is exceeded, the system could provide visual warnings or suggest deprioritizing tasks.
- **Why:** Prevents burnout and encourages realistic daily planning.

### 2. Temporal Anchors in Notes
- **Concept:** Automatically link tasks mentioned in notes to specific dates or events.
- **Why:** Bridges the gap between static knowledge and active execution.

### 3. Subconscious Research Agent
- **Concept:** An background agent that researches topics mentioned in your "Inbox" or "Thoughts" and provides summaries or context cards.
- **Why:** Reduces cognitive load for secondary research tasks.

## Technical Debt / Refinements
- **Centralized Mutation Layer:** Move all writes into a more robust service layer that handles optimistic updates and error recovery more uniformly.
- **Web Worker Sync:** Move the Dexie sync process into a dedicated Web Worker to ensure the UI thread remains completely free during large data pulls.
