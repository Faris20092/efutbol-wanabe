# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Overview

This is an eFotball-inspired Discord bot built with Node.js and Discord.js (v14). The bot features a gacha contract system, squad management, match simulations, PvP battles, and a full web dashboard with Discord OAuth2 authentication. It uses JSON files for persistence and includes both the Discord bot and an Express web server.

## Commands

### Core npm scripts

- **Start web dashboard + bot (recommended during development and in production):**
  ```bash
  npm start
  ```
  Runs `web-server.js`, which starts the Express web server on `PORT` (default 3000) and spawns the Discord bot process (`index.js`).

- **Run bot only (no web dashboard):**
  ```bash
  npm run bot
  ```
  Useful if you only want to test Discord behavior.

- **Run web server only (legacy status dashboard):**
  ```bash
  node server.js
  ```
  Older, simpler server that shows a status page and pings the bot; `web-server.js` is the newer, OAuth-enabled dashboard.

### Slash-command deployment

Slash commands are auto-discovered from `commands/` and deployed via the Discord REST API:

```bash
node deploy-commands.js
```

Run this whenever you add/remove/rename a slash command file or change its options. It:
- Loads every `*.js` file from `commands/` and collects its `data` export
- Derives the application ID from `DISCORD_TOKEN`
- Calls `Routes.applicationCommands(clientId)` to register global commands

If commands are not showing up, redeploy and wait a few minutes for Discord to propagate updates.

### Data / maintenance scripts

Scripts live in `scripts/` and operate directly on JSON data (`players.json` and files in `data/`). They are intended to be run manually from the repo root, e.g.:

```bash
node scripts/update.js
node scripts/fix-player-stats.js
node scripts/update-players-level.js
node scripts/update-user-players.js
node scripts/fix-max-stats.js
```

Check each script before running it; they typically read/modify `players.json` or user files in `data/` for bulk fixes and migrations.

### Manual testing (no automated tests)

There is no test runner configured. Typical workflows:
- Run `npm start`, then exercise slash commands in a Discord test server
- Open `http://localhost:3000` to test the web dashboard (login, squad builder, mail, news, etc.)

## Architecture

### High-level structure

Top-level directories:
- `commands/` – All Discord slash commands and button/autocomplete handlers
- `public/` – Static HTML/CSS/JS for the web dashboard
- `routes/`, `middleware/` – Additional Express wiring (if present)
- `shared/` – Shared logic used in both commands and web server (e.g. pack config)
- `scripts/` – One-off data maintenance / migration scripts
- `data/` – Runtime JSON data (per-user files, pack limits, sessions DB)
- `assets/` – Static assets (e.g. gacha GIFs)

Key entry points:

- `index.js` – Discord bot
- `web-server.js` – Main web dashboard + bot supervisor (recommended)
- `server.js` – Legacy/simple server + bot supervisor

### Discord bot (`index.js`)

Responsibilities:
- Loads environment variables via `dotenv`
- Creates a Discord `Client` with `GatewayIntentBits.Guilds`
- Dynamically loads all command modules from `commands/` into `client.commands`
- Sets up JSON-based persistence helpers:
  - `client.getUserData(userId)` – Reads/initializes `data/{userId}.json`
  - `client.setUserData(userId, data)` – Writes back to the same file
  - `client.listAllUserIds()` – Enumerates known user files for leaderboards, etc.
- Handles `interactionCreate` for:
  - Chat input commands (slash commands)
  - Button interactions, routed by `customId` prefixes (e.g. `collection:`, `mail:`, `penalty_`, `shoot_`, `pvpshoot_`, `leaderboard_`)
  - Autocomplete interactions via an optional `autocomplete` export on each command
- Implements a **daily login reward** that triggers after any successful command once per calendar day per user
- Periodically pings an optional `HEALTHCHECK_URL` to keep external monitors happy

Bot lifecycle:
- `client.once('clientReady', ...)` fetches application info and derives the bot owner ID (`client.botOwnerId`) for potential owner-only commands
- Logs in with `DISCORD_TOKEN`

When adding new commands, follow the existing pattern:
- Export `data` (SlashCommandBuilder) and `execute(interaction)`
- For components, also export `handleButton` and/or `autocomplete`

### Web dashboard (`web-server.js`)

`web-server.js` is the primary runtime for production-style hosting:

- Express app on `PORT` (defaults to 3000)
- Sets up:
  - `cookie-parser`, `body-parser`
  - `express-session` backed by `better-sqlite3` via `express-session-better-sqlite3`
  - `passport` with `passport-discord` strategy using `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, and `CALLBACK_URL`
- Serves static assets:
  - `public/` at `/`
  - `assets/` at `/assets`
- Auth flow:
  - `GET /auth/discord` → start OAuth2
  - `GET /auth/discord/callback` → complete login, redirect to `/dashboard`
  - `GET /logout` → destroy session
- Protected pages (require login via `isAuthenticated` middleware):
  - `/dashboard` – main UI
  - `/contracts`, `/my-team`, `/mail`, `/news`, `/dailygame`

#### API surface

All authenticated endpoints derive game data from the same JSON user files used by the bot (`data/{userId}.json`):

- `GET /api/user` – Returns `{ discord: profile, gameData: userData }`
- `GET /api/players` – User’s player collection
- `GET /api/squad` – Current `squad` (main + bench) and `formation`
- `POST /api/squad/update` – Persists updated squad + formation
- `GET /api/all-players` – Full `players.json` list for UI filtering/search
- `GET /api/packs` – Exposes `PACKS` from `shared/pack-config.js` for contracts page
- **Mail system:**
  - `GET /api/mail` – User mail items
  - `POST /api/mail/claim` – Claim a single mail by ID
  - `POST /api/mail/claim-all` – Claim all unclaimed mail, aggregating rewards
- **News system:**
  - `GET /api/news` – Reads news from `news.json` for `/news` page
- **Health / status:**
  - `GET /api/status` – JSON bot status (running, uptime, restart count, lastError)
  - `GET /health` – Health check for hosting
  - `GET /ping` – Simple `pong` keep-alive endpoint

Bot supervision:
- `startBot()` spawns `node index.js` as a child process and tracks status in `botStatus`
- Automatically restarts the bot after 5 seconds if it exits with non-zero code
- Graceful shutdown on `SIGINT`/`SIGTERM` kills the child before exiting

### Legacy status server (`server.js`)

`server.js` is an older, non-OAuth entry point that:
- Serves a single-page status dashboard at `/` showing uptime and restart counts
- Exposes `/api/status`, `/health`, `/ping`, and `/api/user?userId=...` (JSON-only access)
- Also supervises the bot via `spawn('node', ['index.js'])`

Prefer `web-server.js` for any new work; keep `server.js` for simpler hosting scenarios or debugging.

### Data model and persistence

#### User files (`data/{userId}.json`)

`index.js` and `web-server.js` both operate on the same per-user JSON files. Typical fields:
- `id` – Discord user ID
- `gp` – GP currency (integer)
- `eCoins` – premium currency
- `players` – list of player objects (id, name, overall, position, rarity, etc.)
- `squad` – `{ main: [11 player IDs], bench: [player IDs] }`
- `mail` – array of mail entries with `rewards` or legacy fields (`type`, `amount`, etc.)
- `inventory` – packs, trainers, and other items
- `minigames` – mini-game state (daily games, etc.)
- `daily` – `{ lastClaim: 'YYYY-MM-DD' }` for daily reward tracking
- `stats` – aggregate stats for leaderboards (wins/draws/losses, bestStrength, etc.)
- `formation` – formation string like `4-3-3`

`client.getUserData` is responsible for backfilling missing fields so commands can rely on a consistent shape.

#### Shared config (`shared/pack-config.js`)

Defines all gacha packs in one place:
- `PACKS.iconic`, `PACKS.legend`, `PACKS.standard` with:
  - `name`, `cost`, `currency`
  - `description`
  - `rarity_chances` (probabilities per rarity)
  - `includeRarities` (subset of rarities available in that pack)

It also manages `data/pack_limits.json` via:
- `loadPackLimits()` – reads/initializes pack limits
- `savePackLimits(limits)` – persists changes

This module is used both by Discord commands (e.g. `commands/contract.js`) and the web server (`/api/packs`) so any changes here will propagate to both surfaces.

#### Other shared files

- `players.json` – master player list used by contract pulls and squad/calculation logic
- `config.json` – misc bot settings (prefix, botName, admin IDs, gacha GIF URLs)
- `news.json` – persisted news items for `/news` and `/managenews` commands
- `sessions.db` – SQLite DB used solely for Express session storage

## Command system

All commands live under `commands/` and follow a consistent pattern:

- Export `data` built with `SlashCommandBuilder`
- Export `async execute(interaction)`
- Optionally export:
  - `handleButton(interaction, client)` – for button interactions with specific `customId` formats
  - `autocomplete(interaction)` – for option autocompletion

Important commands to know:

- `contract.js` – core gacha/contract system
  - Uses `PACKS` from `shared/pack-config.js`
  - Picks a rarity via weighted random, then a player from `players.json`
  - Handles duplicates by awarding GP instead of a second copy
  - Displays pulls using rarity-colored embeds and optional GIFs (local `assets/gifs/*.gif` or URLs from `config.json`)

- `contract2.js` – multi-pull/advanced contract logic (batch pulls)

- `squad.js` – full squad management
  - Subcommands: `view`, `autoset`, `set`, `remove`, `formation`, `bench`
  - Maintains a fixed 11-slot `main` squad and arbitrary-length `bench`
  - Uses `FORMATION_POSITIONS` to map formation names to position lists and formats the squad in embeds

- `match.js` – AI match simulation
  - Maintains per-user active matches in `activeMatches` Map
  - Generates a scripted timeline of events (comments, goals, halftime, fulltime)
  - Injects at most one interactive “chance” (Penalty/Free Kick/Chance) using buttons whose `customId` encodes user, minute, and shot type
  - Applies reward tiers based on outcome (win/draw/loss) and updates `userData.stats`

- `pvp.js` – head-to-head penalty shootout between two users

- `collection.js` – paginated player collection browser using buttons (with a `collection:` customId prefix and `handleButton` handler)

- `mail.js` – in-game mail inbox UI, synced with the web `/api/mail` endpoints

- `managenews.js` and `news.js` – creation and viewing of news items that are also shown on the dashboard (see `QUICK_START_NEWS.md`)

When adding new commands that require web parity, prefer to centralize cross-cutting data (like pack definitions) into `shared/` and re-use from both sides.

## Web dashboard

Static files are in `public/`:
- `index.html` – marketing / landing page
- `login.html` – prompts user to login via Discord
- `dashboard.html` – tabbed dashboard (overview, squad, players, etc.)
- `contracts.html` – contracts/packs page
- `my-team.html` – squad builder UI
- `mail.html`, `news.html`, `daily-game.html` – dedicated views
- `styles.css` – theming (CSS variables for primary/secondary/success colors)

`WEB_DASHBOARD_SETUP.md` documents full setup for local and hosted environments (OAuth, environment variables, routes, and endpoints). If you change login flow, routes, or add new dashboard tabs, you should update that file as well.

## Environment variables

The project depends on the following environment variables (typically via `.env` locally and host-specific config in production):

- `DISCORD_TOKEN` – bot token (required for both `index.js` and `deploy-commands.js`)
- `DISCORD_CLIENT_ID` – OAuth2 client ID for the web dashboard
- `DISCORD_CLIENT_SECRET` – OAuth2 client secret
- `CALLBACK_URL` – full redirect URL for Discord OAuth2 (e.g. `http://localhost:3000/auth/discord/callback` or your hosted URL)
- `SESSION_SECRET` – secret string for Express sessions (required in production)
- `PORT` – optional, typically set by hosting platform for the web server
- `HEALTHCHECK_URL` – optional external healthcheck endpoint the bot pings periodically
- `BOT_OWNER_ID` – optional fallback for bot owner if application fetch fails
- `ADMIN_IDS` – optional comma-separated Discord user IDs with elevated permissions in some commands

Keep `.env` out of version control; deployment docs in `DEPLOYMENT.md` and `WEB_DASHBOARD_SETUP.md` assume secrets are configured through the host’s UI.

## Deployment notes

See `DEPLOYMENT.md` for detailed, step-by-step instructions for Render, Railway, Replit, and Heroku.

Key points for Warp when editing deployment logic:
- Production entry point is `web-server.js` with `npm start`
- Health/keepalive routes are `/ping` and `/health`
- 24/7 uptime on free tiers is usually achieved via an external ping service (e.g. UptimeRobot) hitting `/ping`
- The dashboard and bot share the same process tree; any change to `web-server.js` affects how the bot is supervised and restarted

## Practical tips for modifications

- **User data changes:** If you add new fields to `userData`, update the default object in `client.getUserData` and ensure web APIs handle the new shape.
- **Pack changes:** Modify `shared/pack-config.js` only; do not hardcode pack details elsewhere. Both `/contract` and `/api/packs` rely on it.
- **Button interactions:** When adding buttons, choose a unique prefix in `customId` and route it in the `interactionCreate` listener in `index.js` to the appropriate command’s `handleButton`.
- **Dashboard additions:**
  - Add a new HTML view to `public/`
  - Add a route in `web-server.js` (and protect with `isAuthenticated` if needed)
  - Add any necessary API endpoints under `/api/...`
  - Re-use existing helpers to read/write user files when possible.
