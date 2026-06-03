# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Dev Commands

**Backend** (from `backend/`):
```powershell
pip install -r requirements.txt
uvicorn main:app --reload
```

**Frontend** (from `frontend/`):
```powershell
npm install
npm run dev
```

Both must run simultaneously. Backend on `:8000`, frontend on `:5173`.

## Architecture

Single-purpose dashboard for interacting with the Telegram Bot API. No database — all state is in-memory.

**Request flow:**
Browser → Vite dev server → `/api/*` proxy (strips `/api` prefix) → FastAPI on `:8000` → Telegram Bot API

**Backend (`backend/main.py`):**
All logic lives in one file. The Telegram base URL is built at module load from `TELEGRAM_BOT_TOKEN` in `backend/.env`. The `getUpdates` offset is a module-level integer (`updates_offset`) — it advances after each poll so messages are not re-delivered. The `/updates` endpoint unwraps Telegram's `{ok, result: [{update_id, message}]}` envelope and returns only `{messages: [...]}`.

**Frontend (`frontend/src/`):**
- `api.js` — thin axios wrapper; all calls go to `/api/*` which the Vite proxy forwards
- `App.jsx` — three self-contained components: `BotStatus` (polls `/bot-info` every 30s), `RecentMessages` (polls `/updates` every 5s), `SendMessageForm` (POST to `/send`)
- `index.css` — all styles; dark theme (`#0f172a` base), no CSS framework

## Environment

`backend/.env` (not committed):
```
TELEGRAM_BOT_TOKEN=<token from @BotFather>
```

To get a chat ID for sending messages: message the bot first, then read it from the Recent Messages panel.
