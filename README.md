# Pictionary (Realtime web + mobile)

A fast, minimal **Pictionary** clone: one player draws; others guess in chat. Realtime via Socket.io, React + TS on the client, Express + TS on the server. Works locally and across devices on the same Wi-Fi.

---

## Features
- Create/join rooms, 2+ players
- Word selection modal (auto-select fallback after 10s)
- Drawer sees the full word privately; guessers see blanks + difficulty
- Realtime canvas (pen/eraser, color, brush size)
- Chat + guess detection (first correct guess ends the round)
- Scoring by difficulty (drawer + guesser)
- Round rotation, timer, round-end banner, game-over modal + restart
- Basic reconnect support

---

## Quick start

### Requirements
- Node.js 18+ (tested on 20)
- Ports **5173** (client) and **3001** (server) available

### Install
```bash
npm install
```
### Dev (client + server)
```bash 
npm run dev
```

Client dev server: http://localhost:5173

API/WS server: http://localhost:3001 (Vite proxies /api/* and /socket.io in dev)

### Build & Run (production)
```bash 
npm run build
npm start
```
Express serves the built client (dist/client) and the API/WS.

### Environment
Create .env if needed (see .env.example):
```bash 
PORT=3001
NODE_ENV=development
```

### Play on LAN / multiple devices (same Wi-Fi)
```bash 
npm run dev
```
Vite prints both Local and Network addresses, e.g.:
```bash 
VITE ready
➜  Local:   http://localhost:5173/
➜  Network: http://192.168.178.128:5173/
```
Use the Network URL on your phone/tablet (must be on the same Wi-Fi).
If things don’t load:

-	Ensure the server process is running (no ws proxy ECONNREFUSED spam).
-	Same network/VLAN (guest networks often block peer access).
-	OS firewall may need to allow Node on port 5173.

### How to play
	1.	Create a room or join with the 6-char room code.
	2.	With ≥ 2 players, click Start Game.
	3.	Drawer chooses a word (or an easy one auto-selects after 10s).
	4.	Drawer draws; others type guesses in chat.
	5.	First correct guess ends the round. Points awarded by difficulty to guesser + drawer.
	6.	Next player becomes drawer. Repeat until someone reaches the target score (default 5).
	7.	Game Over modal → Restart resets scores and state.

### Tech stack
	•	React + TypeScript — Fast component iteration with type safety and good DX.
	•	Vite — Instant HMR; trivial proxy; prints LAN URL automatically.
	•	Tailwind CSS — Utility classes for quick, consistent, responsive UI.
	•	Express (TypeScript) — Small, predictable HTTP server + static hosting in prod.
	•	Socket.io — Rooms + reliable realtime transport for multiplayer game events.
	•	tsx — Fast TypeScript runner for server dev (watch mode).
	•	concurrently — One command to run client and server.
	•	nanoid — Short, safe IDs for rooms, players, and messages.

### Why a monolith?
For a time-boxed challenge, a monolith is the right trade-off:
-	One install, one dev command, zero multi-repo complexity.
-	Shared types across client/server (no package publishing).
-	Simpler deploy: Express serves the built client; no cross-origin drama in prod.
-	Easier to review, clone, and run.

If this grows, we can split services later (auth, persistence, gateway).

### Estimation & workflow
-	Foundation & server logic — ~1h
Rooms, state machine, word selection, scoring, timers.
-	Frontend components — ~45 min
Join/create, canvas, chat, word modal, scoreboard, status bar.
-	Integration & polish — ~1h
Socket plumbing, reconnection, responsive tweaks, error handling.
-	Testing & docs — ~15 min
Multi-client smoke tests, edge cases, README.

Total: ~3h

### Improvements (next steps)
***State & Architecture***
-	Use a small state library (Zustand preferred; or Redux Toolkit) to keep atomic slices: connection, room, round, canvas, chat. Fewer rerenders and cleaner effects.
-	Extract UI into highly atomic components (Button, Modal, Banner, Toolbar, StrokeList, MessageRow) to reduce prop drilling and improve reuse/testability.

***UX & Gameplay***
-	Auto-select countdown UI in the word modal (e.g., radial timer + “auto in 10…9…8”).
-   Mobile-first canvas: auto switch to portrait layout; larger touch targets; toolbar at bottom; edge-panning; prevent pull-to-refresh while drawing.
-	Smooth stroke interpolation client-side (Catmull–Rom / quadratic Bézier) + simplified stroke packets to cut bandwidth.
-	Undo/redo stack per drawer; accidental clear confirmation.
-	“Close guess” hinting with progressive feedback (heat meter, reveal first/last letter late in round).
-	Spectator mode for late joiners; queue to become active next round.

***Performance & Networking***
-	Throttle/batch draw events; compress stroke payloads; cap server-stored strokes (rolling window).
-	Server authoritative tick with drift compensation display; fall back to “soft” timer on high latency.
-	Better reconnection: session token + auto rejoin room with last known role.

***Productization***
-	QR code output in dev: print the Vite Network URL as a QR in the terminal on npm run dev (tiny qrcode-terminal hook).
-	Configurable rules: round time, points to win, number of rounds, allowed difficulties.
-	Scoreboard system: per-room round history; MVP “MVP of the match” badge.

***Accounts & Persistence***
-	Lightweight auth (emailless magic link or device-id).
-	Persist profiles, ELO/ratings, win/loss, lifetime score, streaks.
-	Friends list, presence, quick-invite with deep links.
-	Store past drawings (with opt-in) → gallery/replay.

***Multi-platform***
-	React Native app (or Expo) sharing core logic/types with the web client.
-	PWA on web: installable + offline shell; wake lock during drawing; Haptics on mobile.

***Ops & Quality***
-	Add Dockerfile + docker-compose for one-line prod runs.
-	Add Playwright E2E (two browsers guessing/drawing).
-	Add unit tests for GameRoom (rotation, scoring, win conditions, timers).
-	Structured logging (pino), error boundary UI, Sentry (optional).