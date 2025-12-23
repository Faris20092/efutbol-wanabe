I think u misleading about the daily game function. 
You are an expert Full-Stack Game Developer. I need you to build a "Daily Penalty Shootout" feature for my website's dashboard, modeled exactly after the eFootball Mobile "Daily Game".

First, analyze my current `dashboard` page to understand the UI theme, color palette (primary/secondary colors), and component structure. Then, implement this new feature as a standalone widget or modal that matches my design system.

Here are the specific REQUIREMENTS:

### 1. Visual Interface (Frontend)
- **View:** Create a 2.5D or 3D-style penalty kick view (behind the player). Use CSS perspective or a lightweight library (like Three.js or simple Canvas) if appropriate, but keep it performant.
- **UI Elements:**
  - A "Shoot" button or swipe gesture mechanic.
  - A "Lap Progress Map" overlay showing a path with 30-40 steps.
  - A "Rewards" list showing current vs. upcoming rewards.
- **Animations:** Smooth ball physics (using Bezier curves for the shot), Goalkeeper dive animations, and a celebration confetti effect for goals.

### 2. Game Mechanics (The Logic)
Implement the exact logic from eFootball:
- **Daily Limit:** Users can only take ONE kick per 24 hours (reset at 02:00 UTC).
- **Goalkeeper AI:** The GK should have a "pattern" logic (e.g., if he dived Left yesterday, he has a 70% chance to dive Right or Center today).
- **Progression (The Lap System):**
  - **Goal:** User moves forward **6 steps** on the map.
  - **Miss/Save:** User moves forward **4 steps** on the map.
  - **Critical:** Even a miss progresses the user, ensuring they eventually get rewards.

### 3. Backend / Data Persistence
- Create a database schema (or use LocalStorage if this is frontend-only) to store:
  - `last_kick_timestamp` (to enforce the 24h cooldown).
  - `current_lap_position` (integer, 0 to 40).
  - `history_gk_dives` (array of last 3 dives to calculate the pattern).
  - `claimed_rewards` (boolean flags).

### 4. Reward Structure
- **Checkpoint Rewards:** Triggers at steps 5, 10, 20 (e.g., +1000 in-game currency).
- **Lap Completion:** Triggers when the user completes the loop (e.g., "Epic Chance Deal").

### 5. Implementation Steps
1. Create the `DailyPenalty` component/file.
2. Add the database/state logic for tracking the "Lap" position.
3. Implement the shooting mechanic with simple randomization vs. GK logic.
4. Style it to match my dashboard's current CSS/Tailwind classes.

Please start by showing me the file structure changes you plan to make.