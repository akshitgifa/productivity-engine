# AI Assistant Specification

## Overview
The AI Assistant is an active intelligence partner with full read/write access to the Entropy database. It operates as a multimodal agent (text + voice) with persistent conversation history.

### 3. Language & Tone
- **Simple English:** Prioritize clarity, directness, and standard English.
- **No Buzzwords:** Avoid "cool" but unnecessary terms (e.g., use "Reset Password" instead of "Forgot Strategy") unless the USER explicitly requests a themed interface.
- **Concatenation:** Be concise. Don't over-explain technical jargon.

---

## Tool Registry

### Task Management
| Tool               | Description                                                               |
| ------------------ | ------------------------------------------------------------------------- |
| `create_task`      | Create a task with title, project, deadline/planned_date, duration        |
| `update_task`      | Update any task field (applies business rules via `applyTaskUpdateRules`) |
| `delete_task`      | Delete a task and associated activity logs                                |
| `complete_task`    | Mark done, log activity, rejuvenate project health                        |
| `list_tasks`       | Search/filter tasks by project, state, or query                           |
| `get_task_details` | Full task with notes and subtasks                                         |
| `get_master_list`  | Fetch urgency-ranked backlog.                                             |

### Project Management
| Tool                  | Description                                    |
| --------------------- | ---------------------------------------------- |
| `get_projects`        | List all projects                              |
| `create_project`      | Create a project with tier and decay threshold |
| `delete_project`      | Delete project and all associated data         |
| `get_context_card`    | Fetch project strategy/context card            |
| `update_context_card` | Update project strategy card                   |

### Knowledge & Notes
| Tool             | Description                                    |
| ---------------- | ---------------------------------------------- |
| `add_note`       | Attach a text/voice note to a task             |
| `create_note`    | Create a standalone note in the knowledge base |
| `add_subtask`    | Add a checklist item to a task                 |
| `toggle_subtask` | Mark subtask complete/incomplete               |

### Analytics & Intelligence
| Tool              | Description                                              |
| ----------------- | -------------------------------------------------------- |
| `get_analytics`   | Activity logs, task distribution, stagnation reports     |
| `generate_chart`  | Suggest bar/line/pie/area charts for data visualization  |
| `search_web`      | Live web search with domain and recency filters          |
| `spawn_subagents` | Launch parallel background workers for research/analysis |
| `save_memory`     | Persist facts and directives for long-term recall        |

---

## Voice Interface

### Quick Capture Flow
1. User taps mic → waveform visualization
2. Audio sent to Gemini for transcription
3. Transcribed text parsed into structured task (project, duration, deadline/planned_date)
4. Confirmation UI with shorthand override chips (EOD, Tmrw, +1, +3d, +7d)

### Chat Voice Input
Audio messages in the chat are transcribed and processed as multimodal input alongside text context.

---

## Business Rules (Applied via `taskService`)
- Setting a deadline resets `sort_order` to 0 → task enters deadline-sorted pool
- All task updates auto-stamp `updated_at`
- **Soft-Delete**: Deletions are non-destructive and marked with `is_deleted` to allow for Undo logic.
- **Soft Windows**: Tasks scheduled with `planned_date_type: 'before'` are automatically distributed across available agenda windows to prevent overloading a single day.
- AI tool `update_task` imports `applyTaskUpdateRules` for server-side consistency
