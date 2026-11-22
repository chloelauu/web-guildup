# GuildUp!

A multiplayer task manager that plays like a co-op RPG. Your team shares a fantasy guild hall: walk around with WASD, see teammates move in real time, and manage tasks by walking up to objects in the room.

![GuildUp sign-in](Menu.png)

**Live demo:** https://guildup.netlify.app

Built with vanilla JavaScript and HTML5 Canvas, with Supabase for the database and real-time sync.

---

## About This Project

- **What:** hackathon project for the strAIght up! Hackathon (an AI hackathon for youths), April 2026
- **Result:** Finalist, AIF Award
- **Team:** 2 people

| Person | Role |
|---|---|
| **Chloe Lau** | Front-end and real-time programmer: vanilla JS, HTML5 Canvas, and a raw WebSocket client for Supabase Realtime |
| **Celeste Tong** | AI features and the Express backend (`server.js`) |

GuildUp started from the code of Paletteburg, an earlier project of mine, so the team had a working canvas base to build on. The multiplayer, the guild hall and the task features were built for the hackathon.

**Art:** the guild hall and object art were generated with AI. The character sprite is from a Kenney asset pack (CC0).

---

## Try the Demo

1. Open https://guildup.netlify.app
2. Sign in with any name and a team name. Use a made-up email such as `you@example.com` (see Known Limitations).
3. Pick a class and enter the hall. Move with `W A S D`, press `E` next to an object.

To see the multiplayer part, open the demo in a second browser window (a private window works), sign in with a different name and the **same team name**, and put the two windows side by side.

**What is switched off in the demo**

- **AI features.** The AI Assist button is disabled, and the Assignment Planner uses its built-in fairness rule (lowest workload first) in place of the AI plan. The AI code is still in this repo.
- **Email notifications.** Accepting a task does not send an email.

The demo runs on a free Supabase project, which Supabase pauses after a period of inactivity. If sign-in does nothing, the database is probably paused.

---

## Controls

| Key | Action |
|---|---|
| `W A S D` | Move |
| `E` | Interact with nearby object |
| `Escape` | Close current UI |
| `P` | Toggle debug mode (shows hitboxes) |

---

## Features

### Multiplayer Presence
Team members appear as tinted character sprites and move in real time. Each player writes their position to Supabase about every 100 ms while a movement key is held, and every teammate receives the change over a WebSocket subscription. Teammates face the direction they are walking.

### Bulletin Board (Pickup Tasks)
- Create tasks with title, description, deadline, and priority
- **AI Assist** button fills in a structured task from rough text (off in the demo)
- Tasks display as cards. Click one to preview, accept, edit, or delete
- Cards show deadline status (SOON / DUE / OVERDUE) and the recommended person to take it

### Cupboard (My Tasks)
- Lists all pickup tasks you've accepted plus your personal tasks
- Color-coded by priority: red (HIGH), yellow (MED), blue (LOW)
- Mark tasks complete to earn XP
- Status badges: OWN TASK · PICKED UP · IN PROGRESS · COMPLETED

### Fairness Tracker (Main Table)
- Shows every guild member's XP, active task count, completed count, class, and mood
- Highlights the recommended person for the next task
- Set your own mood (fine / busy / overwhelmed) to influence recommendations

### Assignment Planner (Planner Table)
1. Create unassigned tasks
2. Hit **Auto-Assign All**. Tasks are distributed based on workload, mood, and XP
3. Each draft card shows the assigned member, the reason, a confidence level, and tags
4. Manually override any assignment via dropdown
5. **Accept All** to commit or **Decline All** to clear the draft

With the AI backend running, steps 2 to 4 use the AI plan. Without it, the planner falls back to the fairness rule.

### XP System
Completing a task awards 1 XP. XP is tracked per member and contributes to the team progress bar.

---

## How the Real-Time Sync Works

Positions travel through the database, not directly between players.

1. While a movement key is held, the browser upserts the player's position into the `positions` table (`upsertPosition` in `supabase.js`).
2. Supabase Realtime notices the changed row.
3. It pushes the row to every client subscribed to that team (`subscribeToPositions` in `supabase.js`).
4. Each client moves that teammate's sprite (`onGameStart` in `index.js`).

The subscription is a raw WebSocket client written without the Supabase client library. It opens the socket, sends a Phoenix `phx_join` message that subscribes to Postgres changes on `positions` filtered by `team_id` on the server, sends a heartbeat every 30 seconds, and handles `INSERT` and `UPDATE` messages.

Positions are stored as fractions of the map (0 to 1), not pixels, so they stay correct on screens of different sizes.

---

## Known Limitations

- **No real accounts.** Sign-in is a name and team name lookup, so every visitor reaches the database as the same anonymous role. Row Level Security was added after the hackathon, and its policies have to allow that role to read and write the game's tables. Anything typed into the demo, including the email field, should be treated as public.
- **No movement smoothing.** A teammate's sprite jumps from one position update to the next.
- **No reconnect.** If the WebSocket drops, teammates stop moving on your screen until you refresh.
- **One database write per position update.** Simple, and it needed no server code, but it does not scale to many players.
- **Movement is per frame.** Speed depends on the monitor's refresh rate, and characters do not scale with the map when the window is resized.

---

## Tech Stack

- **Frontend:** Vanilla JS, HTML5 Canvas, GSAP, Howler.js
- **Database:** Supabase (PostgreSQL + Realtime over WebSocket)
- **Backend (AI):** Node.js, Express
- **AI:** OpenAI API for task structuring and assignment
- **Email:** AWS SES, sent by a serverless function (`api/send-email.js`)
- **Hosting:** Netlify (frontend only)

---

## Running It Locally

### Game only

```bash
git clone https://github.com/chloelauu/web-guildup.git
```

Open `index.html` in a browser. There is no build step: the frontend is plain HTML, JS and CSS. It uses the same Supabase database as the live demo, through the public anon key in `supabase.js`.

### With the AI backend

You need Node.js (LTS, 18 or higher) and your own OpenAI API key.

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a file named `.env` in the project root:
   ```
   OPENAI_API_KEY=sk-...your_key_here
   PORT=3001
   ```
   Keep `.env` private. It is listed in `.gitignore`.
3. Start the server:
   ```bash
   npm start
   ```
   You should see `AI server running on http://localhost:3001`.
4. At the top of `plannerTable.js`, set:
   ```javascript
   const AI_SERVER_URL = "http://localhost:3001";
   ```
5. Open `index.html`.

The email function (`api/send-email.js`) is not part of the local setup. It reads `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` and `SES_FROM_EMAIL` from its host's environment.

---

## AI Endpoints

The backend (`server.js`) uses the `gpt-5.4` model with structured JSON output (strict schema mode).

### `POST /ai-task`
Takes rough task text and returns a cleaned-up structured task.

```json
{ "title": "...", "description": "...", "deadline_hint": "..." }
```

### `POST /ai-assign`
Takes all unassigned tasks and all team members, and returns an assignment for each task.

```json
{
  "assignments": [
    {
      "task_id": "...",
      "recommended_member_id": "...",
      "recommended_member_name": "...",
      "reason": "...",
      "group_label": "...",
      "confidence": "HIGH | MEDIUM | LOW",
      "reason_tags": ["low workload", "similar work"]
    }
  ]
}
```

### `POST /ai-reassign`
The user locks one manual assignment, and the AI rebalances the rest around it. Same response shape as `/ai-assign`.

---

## Database Schema

```sql
teams (
  id, team_name, created_at
)

members (
  id, team_id, member_name, email,
  character_class, xp, mood, created_at
)

tasks (
  id, team_id,
  created_by_member_id, created_by_name, created_by_email,
  accepted_by_member_id, accepted_by_name, accepted_by_email,
  title, description, deadline, priority,
  image_index, task_type, status, created_at, accepted_at
)

positions (
  member_id, team_id, character_class, x, y, updated_at
)
```

| Field | Values |
|---|---|
| `task_type` | `pickup`, `personal` |
| `status` | `open`, `in_progress`, `completed` |
| `priority` | `HIGH`, `MED`, `LOW` |
| `mood` | `fine`, `busy`, `overwhelmed` |

---

## Project Structure

```
web-guildup/
├── index.html           # Canvas, overlays, modals
├── index.js             # Game loop, rendering pipeline, input, multiplayer sprites
├── classes.js           # Sprite and Boundary classes
├── supabase.js          # Database calls + raw WebSocket Realtime client
├── overlays.js          # Sign-in + character selection flow
├── bulletinBoard.js     # Pickup task board UI + logic
├── cupboard.js          # Personal task modal
├── plannerTable.js      # Assignment planner (AI plan or fairness rule)
├── decoAssets.js        # Decoration image loader
├── style.css            # All UI styling
├── data/
│   ├── collisionZones.js   # Collision rectangle map (% coords)
│   └── audio.js            # Audio asset references
├── img/                 # Sprites, tiles, UI assets
├── audio/               # Background music
├── server.js            # Express backend + OpenAI endpoints
├── api/
│   └── send-email.js    # Serverless function: task accepted email via AWS SES
├── package.json         # Backend dependency list and npm scripts
└── package-lock.json    # Exact dependency versions
```

---

## Rendering Pipeline

Each frame draws in this order so depth looks correct:

1. Background image
2. Collision boundaries (debug only)
3. Decoration assets behind the player
4. Player + teammates (Y-sorted so characters further south render on top)
5. Foreground portions of assets (top halves redrawn so the player walks behind them)
6. Press E prompts
7. Name labels
