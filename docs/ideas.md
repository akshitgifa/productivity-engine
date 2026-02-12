# Proposal: Transforming Entropy into a Second Brain

## Core Philosophy: The "Antifragile" Productivity Engine
Current state: A sophisticated Task Manager (Entropy v1).
Target state: A **Second Brain** that prevents delusion and adapts to usage (Entropy v2).

The key shift is moving from **managing lists** to **managing focus and outcomes**.

## 1. The "Today" View (Direct Commitment)

**The Problem:** Mixing *urgency* (external deadlines) with *intent* (what I actually chose to do today) creates cognitive overload and "delusion".
**The Solution:** A dedicated view of tasks you've explicitly committed to for the current day.

*   **Naming:** Simple and direct: **"Today"**. 
*   **Workflow:**
    *   **The Default State:** When you open the app, you see **"Today"**.
    *   **Selection:** You can easily move tasks from the "Syllabus" (All Tasks/Inbox) into "Today".
    *   **No Artificial Constraints:** You decide how much you can handle. If it's 2 tasks or 20, the app supports it.
    *   **Recurrence Handling:** Recurring tasks with a `waiting_until` or `due_date` of today (or earlier) are automatically flagged for consideration or auto-added to "Today" based on user preference.
*   **Toggle:** A super-simple, one-tap toggle to switch between "Today" and "Syllabus" (the full engine/backlog).

## 2. Project Outcomes & KPIs (Anti-Delusion)

**The Problem:** "People... keep on switching plans... delusion that they're working towards something good."
Completing tasks $\neq$ making progress. You can do 100 "shallow" tasks and achieve nothing.

**The Solution: Outcome-Driven Projects**
Projects should not just be buckets of tasks. They must be buckets of *value*.

*   **New Entity:** `ProjectOutcome` or `KPI`.
    *   *Example:* Project "Fitness" -> KPI "Resting prediction < 60".
    *   *Example:* Project "App Launch" -> Outcome "First 100 paying users".
*   **The Reality Check:**
    *   On the Project Page, the header is not "Tasks", but **"Current Trajectory"**.
    *   **Visual Feedback:** "You completed 15 tasks this week, but KPI 'User Growth' is flat. Pivot?"
    *   **Implementation:** Add `outcomes` text/markdown field to Projects initially, later `KPI` data points.

## 3. Context Restoration (The "Welcome Back" Mat)

**The Problem:** "When there are multiple things to be managed... they'll often lose context."

**The Solution: Instant Context Loading**
When you enter a Project, you shouldn't see a list of tasks immediately. You should see the **Context Card** first (or a summary).

*   **Feature:** **Project Heads-Up Display (HUD)**.
    *   "Last time you were here (3 days ago), you were working on X."
    *   "Pending Decision: Y."
    *   "Next logical step: Z."
*   **Mechanism:** AI summarizes the last 3 completed tasks + last note edit when you open the project view.

## 4. The Loop (Implicit Adaptation)

**The Problem:** "I don't want... configurable... adapts along with usage."

**The Solution: Behavioral Feedback Loops**
*   **Stagnation Detection:** If a task remains in "Today" (Orbit) for 3 days without completion -> **Auto-demote** it. "You're ignoring this. Is it actually important?" (Force user to deprioritize or act).
*   **Momentum Tracking:** If you complete 3 tasks in "Deep Work" mode, the app suggests "Keep the streak? 25m more."

---

## 5. Immediate "Good First Steps" (The Plan)

To achieve this without over-engineering, I propose we focus on **Module 1 (The Today View)** and **Module 3 (Context Restoration)** first, as they solve the most immediate pain points of "Tasks everywhere" and "Lost context".

### Phase 1: The "Today" Commitment
1.  **Schema:** Add `planned_date` to `tasks`.
2.  **UI:** Update Dashboard (`page.tsx`) to default to the "Today" list.
3.  **Toggle:** Add a prominent "Today / Syllabus" toggle at the top of the dashboard.
4.  **Interaction:** Swipe or tap to move tasks from Syllabus into Today.

### Phase 2: Context HUD
1.  **UI:** Revamp Project Detail Page. Top section is "Context".
2.  **Logic:** Fetch last 3 activities for this project and display them in a "Recap" block.
