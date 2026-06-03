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

Two parallel Telegram integrations in one FastAPI + React app. No database — bot state is in-memory, monitor config persists to `backend/config.json`.

**Request flow:**
Browser → Vite dev server → `/api/*` proxy (strips `/api` prefix) → FastAPI on `:8000` → Telegram

**Backend (`backend/main.py`):**
All logic lives in one file. Two independent Telegram connections:

1. **Bot API** (via `httpx`) — uses `TELEGRAM_BOT_TOKEN`. Endpoints: `/bot-info`, `/send`, `DELETE /bot/history`.

2. **Telethon userbot** (MTProto) — uses `TELEGRAM_API_ID` + `TELEGRAM_API_HASH`. A single `TelegramClient` instance connects on FastAPI lifespan startup and disconnects on shutdown. Session persists to `backend/user.session`. A single `NewMessage` catch-all handler filters by `config["monitored_groups"]` and `config["keywords"]`, then calls `forward_messages`. The handler is re-registered via `register_forwarder()` on startup and on every `POST /config`.

**Monitor config** (`backend/config.json`, gitignored):
`{monitored_groups: [int], keywords: [str], destination: str, active: bool}` — loaded at startup, saved on every config change.

**Frontend (`frontend/src/`):**
- `api.js` — thin axios wrapper for all endpoints
- `App.jsx` — three self-contained components: `BotStatus`, `SendMessageForm`, `Monitor`
- `Monitor` has a 4-step auth state machine (checking → phone → code → authorized), then renders group checkboxes, keyword tags, destination input, and active toggle. All changes call `saveConfig` immediately.
- `BotStatus` includes a confirmation-gated "Clear Chat History" button that calls `DELETE /bot/history` — deletes messages via `get_messages` + `delete_messages` in batches of 100 (does NOT remove the dialog).
- `index.css` — all styles; dark theme (`#0f172a` base), no CSS framework

## Environment

`backend/.env` (not committed):
```
TELEGRAM_BOT_TOKEN=<token from @BotFather>
TELEGRAM_API_ID=<from my.telegram.org>
TELEGRAM_API_HASH=<from my.telegram.org>
```

To get a chat ID for sending/forwarding: message the bot or use `me` as destination for Saved Messages.
