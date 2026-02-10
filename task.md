# Entropy Roadmap Task Tracker

> **Status:** Core platform shipped. Active development on intelligence and polish.

## Core Platform (Complete)
- [x] Dashboard with urgency-sorted execution queue
- [x] Portfolio with project health and decay tracking
- [x] Task detail modal with notes, subtasks, deadlines
- [x] AI Assistant with God Mode tools
- [x] Quick Capture (text + voice)
- [x] Notes page with AI refinement
- [x] Export / screenshot mode
- [x] Analytics / review page

## Infrastructure (Complete)
- [x] Local-first architecture (Dexie + outbox sync)
- [x] Centralized `taskService.ts` for all mutations
- [x] Deadline-aware sorting (`sortTasksByUserOrder`)
- [x] Sort compaction on task completion
- [x] Service Worker caching
- [x] Memory system with embeddings (`pgvector`)
- [x] Context cards per project
- [x] Background subagents (`spawn_subagents`)
- [x] Web search tool
- [x] Smart recurrence with `waiting_until`

## Pending
- [ ] Proactive decay notifications
- [ ] Dynamic KPI suggestions
- [ ] Admin Hour batching mode
- [ ] Pomodoro integration
- [ ] Cross-note linking / backlinks
- [ ] Contextual note-scoped assistant
