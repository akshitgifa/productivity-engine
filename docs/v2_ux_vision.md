# Entropy UX Vision: Thinking User-First

## The Real User Problems

People don't fail at productivity because they lack tools. They fail because **every tool demands structure at the wrong moment.** Here's what actually happens:

| Problem                          | What Users Do Today              | What Entropy Should Do                                                 |
| :------------------------------- | :------------------------------- | :--------------------------------------------------------------------- |
| "I have a task but no idea when" | Create it, forget it → dead pile | **Soft Windows**: "Do within 5 days" — engine auto-distributes         |
| "I want to plan ahead"           | Can't commit to future days      | **Navigable Agenda**: swipe to tomorrow, commit there                  |
| "I just want to dump everything" | Use WhatsApp / blank diary       | **Zero-Friction Dump**: single input, AI categorizes everything        |
| "Old tasks pile up silently"     | Never revisit, guilt spiral      | **Decay Surfacing**: periodic "Is this still relevant?" nudges         |
| "I finished early, what's next?" | Manually browse backlog          | **Auto-Fill**: engine pulls from soft-window pool to maintain momentum |

---

## Consolidated Feature List

### 1. 🗓️ Navigable Focus Agenda
**Problem**: I can only commit tasks to *today*. I can't plan ahead.

- Swipeable day-picker in the "Today" header: `[ ← Mon | Tue | **Wed** | Thu | Fri → ]`
- Selecting a future day shows tasks committed to that day
- Committing a task from Master List respects the selected day
- Recurring tasks for future days become visible (greyed, "Upcoming")

---

### 2. 📌 Commitment vs. Deadline (Clear Separation)
**Problem**: Users confuse "when I plan to do it" with "when it's due."

- **Commitment** = "I plan to focus on this [day]" → controls *visibility* in the Agenda
- **Deadline** = "This *must* be done by [date/time]" → controls *urgency sorting*
- **In Quick Capture**: Commitment selector is **always visible** (Today / Tomorrow / Pick). Deadline stays in "More Options."
- Visual: Commitment = calm primary color. Deadline = rose/amber warning badge.

---

### 3. ⏳ Soft Windows ("Do Within X Days")
**Problem**: Most tasks don't have hard deadlines. Without one, they rot.

- New option alongside commitment: **"Within 5 days"** / **"Within 10 days"** / custom
- The engine auto-distributes soft-window tasks across coming days, filling gaps
- **Auto-adjustment**:
  - If you complete tasks fast → engine pulls more from the pool ("keep momentum")
  - If you miss tasks → extends windows gracefully, no guilt
- Think of it as a **flexible promise** — the engine is your scheduler, not you

---

### 4. 🧹 Decay Surfacing ("Is This Still Relevant?")
**Problem**: Tasks without any temporal anchor silently pile up forever.

- Periodically surface tasks that have been untouched for X days (configurable)
- Prompt: *"You created this 14 days ago. Still relevant?"*
- Options: **Reschedule** (opens soft window picker) | **Archive** | **Do Today**
- Can appear as a gentle card in the "Plan Your Day" empty state or as a weekly digest

---

### 5. 📝 Zero-Friction Dump (The "Diary" Input)
**Problem**: Users want to throw *anything* into a single box — tasks, thoughts, links, reminders.

- The Quick Capture input accepts **anything**: a task, a thought, a link, a reminder, a grocery list
- AI classifies it automatically: task vs. thought vs. note
- If task → extracted fields (project, duration, dates)
- If thought → saved to Notes with `is_read: false` (existing Thought Mode)
- If ambiguous → saved as thought, surfaced in "Catch Up" for user to clarify later
- **Key principle**: Never make the user choose a mode. Just dump.

---

### 6. ⚡ Super Input (Power User Tags)
**Problem**: Experienced users want speed without clicking through fields.

- Inline tags detected in real-time as you type: `#project`, `@tomorrow`, `!friday`, `~30m`
- Token highlighting shows recognized tags in color
- Auto-suggestions appear on typing `#` or `@`
- Works alongside AI — if you tag manually, AI respects it; if you don't, AI infers
- **Fallback**: If Super Input feels too technical, the same syntax works invisibly through the AI parser

---

## How These Features Work Together

```
User types: "buy groceries @tomorrow ~15m"
                ↓
     Super Input detects: commitment=tomorrow, duration=15m
                ↓
     Task created → appears in Tomorrow's Agenda
                ↓
     Tomorrow morning: task is in your Focus list
```

```
User types: "refactor the auth module"  (no tags, no deadline)
                ↓
     AI classifies as task, no temporal anchor
                ↓
     Option shown: "When?" → [Today | Tomorrow | Within 5 days | No plan]
                ↓
     User picks "Within 5 days" → engine auto-schedules across Mon-Fri
                ↓
     Day 3: user completes 2 extra tasks → engine pulls this one forward
```

```
User types: "that article about React Server Components was interesting"
                ↓
     AI classifies as THOUGHT (not a task)
                ↓
     Saved to Notes → appears in "Catch Up" sparkle indicator
```

---

## Priority Order for Implementation

| Priority | Feature                               | Why                                    |
| :------: | :------------------------------------ | :------------------------------------- |
|  **P0**  | Navigable Agenda + Future Commitments | Unblocks the core "plan ahead" gap     |
|  **P0**  | Commitment selector in Quick Capture  | Makes commitment visible and fast      |
|  **P1**  | Soft Windows ("Within X days")        | Solves the dead-pile problem at source |
|  **P1**  | Decay Surfacing                       | Catches what Soft Windows don't        |
|  **P2**  | Zero-Friction Dump (auto-classify)    | Evolves existing Thought Mode          |
|  **P2**  | Super Input (tagging)                 | Power-user speed layer                 |
