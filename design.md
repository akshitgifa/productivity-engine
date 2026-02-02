This is the **"Entropy UI" Design System**.

It is designed to look like a **Pilot’s Cockpit** or a **Code Editor**, not a social media app. It prioritizes readability, data density, and "Flow State." It is **Dark Mode Native** (because builders work late).

Copy-paste this section to your agency's Design Team.

---

# Design Language: "Industrial Zen"

**The Vibe:**

* **Precision:** Thin lines, sharp corners, monospace data.
* **Focus:** High contrast for active items, low contrast for "noise."
* **Materials:** Matte black surfaces, subtle "frosted glass" for overlays, neon accents for status.

---

## 1. The Color Palette (Dark Mode First)

We use a **Semantic Color System**. Colors have specific meanings, they are not just for decoration.

### **Base Layers (The Canvas)**

* **Void Black (Background):** `#09090B` (Deepest black, OLED friendly).
* **Surface (Cards/panels):** `#18181B` (Slightly lighter, separates content from void).
* **Border/Divider:** `#27272A` (Subtle grey, defines structure without heavy lines).

### **Functional Accents (The Logic)**

* **Primary Action (The "Flow" Color):** `#3B82F6` (Electric Blue). Used for active buttons, the "Pull" mechanism, and current progress.
* **Entropy/Decay (The "Rust" Color):** `#F43F5E` (Muted Rose/Crimson). Used for "Stagnant Projects" or "Overdue Deadlines." It shouldn't scream "Error," it should look like it's *rusting*.

### **The Tier System (Visual Hierarchy)**

Tasks are color-coded by importance so you can scan the list instantly.

* **Tier 1 (Mission Critical):** `#F59E0B` (Amber/Gold). Captures attention immediately.
* **Tier 2 (Growth/Learning):** `#8B5CF6` (Violet). Strategic, high-value, but not an emergency.
* **Tier 3 (Maintenance):** `#10B981` (Emerald). "Good for you" tasks (Gym, Health).
* **Tier 4 (Icebox/Admin):** `#71717A` (Zinc Grey). Recedes into the background.

---

## 2. Typography

We mix a clean sans-serif for reading with a monospace font for data, reinforcing the "Builder" aesthetic.

* **Primary Font (UI/Text):** **`Inter`** or **`Space Grotesk`**.
* Clean, highly readable, modern.
* Use `Inter Tight` for headers for a sharper look.


* **Data Font (Numbers/Tags):** **`JetBrains Mono`** or **`Geist Mono`**.
* Used for: KPI numbers, Timers, Dates, and Tiers.
* Why: Monospace numbers align perfectly in vertical lists (tabular figures).



---

## 3. Component Styling

### **The "Focus Card" (Main Dashboard Item)**

* **Shape:** Rectangular, slightly rounded corners (`8px`). No "bubbly" soft shapes.
* **Surface:** `#18181B` with a 1px border of `#27272A`.
* **Active State:** When a task is "In Progress," the border glows slightly with the **Primary Color** (`#3B82F6`).
* **The "Context" Badge:** A small, pill-shaped tag using the **Tier Color** (e.g., Gold text on a low-opacity Gold background).

### **The "Truth" Charts (Analytics)**

* **Style:** Minimalist line charts. No grid lines (clutter).
* **The Line:** Thin, neon gradient (Green to Blue).
* **Negative Space:** Use negative space to show gaps in productivity.

### **The "Amygdala" Button (FAB)**

* **Style:** Floating circle, bottom center.
* **Color:** `#FAFAFA` (Stark White) icon on a `#3B82F6` (Electric Blue) background.
* **Effect:** Subtle "Pulse" animation if you haven't captured anything in 24 hours.

---

## 4. Visual Feedback & Interactions (The "Feel")

Since this is an app you use 20 times a day, the "Micro-interactions" matter.

* **Haptics:**
* **Success:** A sharp, crisp *click* (Heavy Impact) when swiping a task "Done."
* **Warning:** A double *buzz* when a Deadline Override kicks in.
* **Snooze:** A soft, sliding vibration.


* **Zeigarnik Effect (Visual):**
* Tasks that were left unfinished yesterday should have a subtle **"Ghost Effect"** (slightly translucent or a "glitch" border) to annoy your eye until you fix them.


* **Fatigue Mode (Visual Switch):**
* When you toggle "Low Energy," the app literally **dims**. The bright accent colors desaturate. The "Gold" Tier 1 tasks fade out, and the "Green" Tier 3 tasks light up. The interface physically relaxes.



---

### **Summary for the Designer**

> "Think **Linear App** meets **Bloomberg Terminal**. Dark, data-dense, monochromatic base with semantic color coding. The user is a developer/founder; they value information density over whitespace. Avoid 'friendly' illustrations or cartoons. Use raw data and clean typography."