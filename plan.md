Here is a professional, comprehensive **Product Requirements Document (PRD)** tailored for a development agency. You can copy-paste this directly to them.

---

# Project Title: Dynamic Context Engine (Productivity App)

## 1. Project Overview

**Objective:** Build a high-performance, mobile-first productivity application designed for a power user managing multiple complex projects ("boats") simultaneously.
**Core Philosophy:** The system replaces static to-do lists with a **probabilistic scheduling engine**. It prioritizes tasks based on Project Tiers, Time Decay (Entropy), and Contextual Constraints (Energy/Time available).
**Key Differentiator:** "Decay-based" scheduling (tasks become urgent based on time since last touch) and "Context-aware" filtering (hiding tasks that don't fit the user's current environment/mood).

---

## 2. App Architecture & Navigation

**Platform:** Mobile-first (Flutter/React Native) or Progressive Web App (PWA). Offline-first capability is required.
**Navigation Structure:** Bottom Tab Bar with 4 Core Tabs + 1 Floating Action Button (FAB).

### **Sitemap:**

1. **Dashboard (Home)** – The execution view.
2. **Task Manager (List)** – The management/edit view.
3. **Portfolio (Projects)** – The strategy/KPI view.
4. **Analytics (Review)** – The data/progress view.
5. **Quick Capture (Overlay)** – Global input mechanism.

---

## 3. Detailed View Specifications

### **View 1: Dashboard (The "Focus" View)**

**Purpose:** Daily execution. Shows only actionable items filtered by the algorithm.
**UI Elements:**

* **Session Header:** Displays current "Mode" (e.g., Deep Work, Low Energy) and "Time Available" selector (15m, 30m, 1h, 2h+).
* **The Syllabus (Main Feed):**
* Displays a vertical stack of **Top 3-5 Priority Cards** selected by the backend algorithm.
* **Card UI:** Task Title, Project Badge (Color-coded by Tier), Estimated Time, Deadline (if applicable).
* **Actions:** Swipe Right to Complete, Swipe Left to Snooze/Defer.


* **Admin Batch Widget:** A distinct, collapsible card that groups all micro-tasks (<5 min) into one single entry (e.g., "12 Admin Tasks").
* **Empty State:** If all focus tasks are done, pull the next highest-priority task from the backlog ("Pull System").

### **View 2: Central Task Manager (The "All Tasks" View)**

**Purpose:** Full database access to manage, edit, and reorganize tasks.
**UI Elements:**

* **Search & Filter Bar:** Text search + Filters for Project, Tier, State (Active/Waiting/Blocked), and Context Tags (Phone/Laptop).
* **Task List Table:**
* Rows displaying: Checkbox, Task Name, Project, Urgency Score (Visual Indicator), Due Date.
* **Bulk Actions:** Ability to select multiple tasks to Bulk Edit (Change Project, Move to Waiting, Delete).


* **Quick Add Row:** A static top row to manually type a task directly into the list without AI processing.
* **Drag & Drop:** Manual reordering to override algorithmic sorting.

### **View 3: Project Portfolio (The "Boats" View)**

**Purpose:** High-level project management and health tracking.
**UI Elements:**

* **Grid/Tile View:** Each project is a card.
* **Project Card Data:**
* Project Name.
* **North Star KPI:** A single numeric metric (e.g., "Outreach Sent: 50").
* **Decay Health Bar:** Visual indicator showing "Time since last touch." Green = Recent, Red = Neglected.


* **Project Detail Page (Click-through):**
* Settings for **Decay Threshold** (e.g., "Alert me every 15 days").
* Project-specific Task Backlog.
* Notes/Context section (Rich text or links).



### **View 4: Analytics (The "Truth" View)**

**Purpose:** Weekly review and performance tracking.
**UI Elements:**

* **Input vs. Output Chart:** Graph comparing "Hours Logged" vs. "Tasks Completed."
* **Project Distribution Chart:** Pie chart showing time split by Tier (e.g., "60% on Tier 1, 10% on Tier 3").
* **Stagnation Report:** List of tasks/projects untouched for >30 days with options to "Archive" or "Delete."
* **Waiting On List:** A consolidated view of all tasks currently in the "Waiting" state, sorted by follow-up date.

### **Global Overlay: Quick Capture (FAB)**

**Purpose:** Frictionless entry of thoughts/tasks.
**UI Elements:**

* **Input Methods:** Text Field + Audio Recording Button.
* **AI Processing Interface:**
* User submits raw input (e.g., "Call client and fix the login bug").
* **Confirmation Drawer:** Displays how the AI parsed the input (e.g., "Created Task A under Project X, Created Task B under Project Y").
* **Buttons:** Confirm / Edit / Cancel.



---

## 4. Core Functional Logic (Backend Requirements)

### **A. The Sorting Algorithm (The "Syllabus" Logic)**

The backend must calculate a dynamic **Urgency Score** for every active task to determine the Dashboard order.

* **Formula:** `Score = (Tier Weight) × (Days Since Last Touch / Decay Threshold) × (Context Multiplier)`
* **Tier Weight:** Tier 1 = 2.0x, Tier 2 = 1.5x, Tier 3 = 1.0x.
* **Context Multiplier:** If Task Tag matches Current Session Mode (e.g., "Creative"), apply 1.5x boost. If mismatch, apply 0.1x penalty.


* **Deadline Override:** If `Due Date < 24 Hours`, Score = Max Int (Force to top).

### **B. Task States & Recurrence**

* **States:**
* `Active`: Visible in lists.
* `Waiting On`: Hidden until a specific date or manual trigger.
* `Blocked`: Hidden until a parent task is completed.
* `Done`: Logged for analytics.


* **Smart Recurrence (Decay-Based):**
* Unlike standard calendar recurrence (Fixed Date), these tasks reset the counter upon completion.
* *Example:* "Haircut every 20 days." If completed on Day 15, the next alert is set for Day 35 (15+20), not Day 20.



### **C. Admin Batching Logic**

* Any task with `Estimated Duration < 5 mins` is automatically hidden from the main syllabus.
* These tasks are aggregated into the "Admin Batch" widget on the Dashboard.

### **D. AI Integration (LLM Layer)**

> **Note:** See [ai_assistant_spec.md](./ai_assistant_spec.md) for full Voice & Chat Agent specifications.

* **Input:** Raw Text/Audio Transcript.
* **Output:** Structured JSON object containing:
* `Task Name`
* `Project Assignment` (Inferred from context)
* `Estimated Duration` (Inferred: Quick/Block/Deep)
* `Energy Type` (Inferred: Grind/Creative/Admin)



---

## 5. Data Model (Schema Overview)

**1. Projects Table:**

* `ID`, `Name`, `Tier (1-4)`, `Decay_Interval_Days`, `Last_Touched_Date`, `KPI_Metric_Name`, `KPI_Value`.

**2. Tasks Table:**

* `ID`, `Project_ID`, `Title`, `Description`.
* `State` (Active, Waiting, Blocked, Done).
* `Due_Date` (Nullable), `Waiting_Until_Date` (Nullable).
* `Est_Duration_Minutes`, `Energy_Tag` (Grind, Creative, Shallow).
* `Blocked_By_Task_ID` (Self-referencing foreign key).

**3. Activity Logs Table:**

* `ID`, `Task_ID`, `Project_ID`, `Timestamp_Completed`, `Time_Spent_Minutes`, `Session_Mode_Used`.

---

## 6. Success Metrics (For Acceptance Testing)

1. **Load Time:** Dashboard must load calculated priorities in <1 second.
2. **AI Accuracy:** "Quick Capture" must correctly identify the Project and Estimate Duration >90% of the time.
3. **Offline Sync:** Capture and edits must work offline and sync when connection is restored.