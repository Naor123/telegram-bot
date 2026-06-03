# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Workflow

For any task touching multiple files or both frontend and backend, use parallel subagents — spawn one per concern and run them simultaneously.

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
Start each in a separate external cmd window via `Start-Process cmd -ArgumentList "/k cd <dir> && <command>"`.

## Architecture

Two parallel Telegram integrations in one FastAPI + React app. No database — bot state is in-memory, monitor config persists to `backend/config.json`.

**Request flow:**
Browser → Vite dev server → `/api/*` proxy (strips `/api` prefix) → FastAPI on `:8000` → Telegram

**Backend (`backend/main.py`):**
All logic lives in one file. Two independent Telegram connections:

1. **Bot API** (via `httpx`) — uses `TELEGRAM_BOT_TOKEN`. Endpoints: `/bot-info`, `/send`, `DELETE /bot/history`. `MY_CHAT_ID` and `BOT_ID` are derived from env — no chat ID inputs in UI.

2. **Telethon userbot** (MTProto) — uses `TELEGRAM_API_ID` + `TELEGRAM_API_HASH`. A single `TelegramClient` connects on lifespan startup. Session persists to `backend/user.session`.
   - `register_forwarder()` — catch-all `NewMessage` handler, filters by `config["monitored_groups"]` and `config["keywords"]`, forwards matches to `BOT_ID`. Re-registered on startup and every `POST /config`.
   - `register_command_handler()` — listens for outgoing messages to `BOT_ID` starting with `/`. Routes to `COMMAND_HANDLERS` dict. Re-registered on startup and after auth.

**Adding a new bot command:** write `async def cmd_foo(args: str)` and add `"foo": cmd_foo` to `COMMAND_HANDLERS`.

**Monitor config** (`backend/config.json`, gitignored):
`{monitored_groups: [int], keywords: [str], active: bool}` — loaded at startup, saved on every config change.

**Frontend (`frontend/src/`):**
- `api.js` — thin axios wrapper for all endpoints
- `App.jsx` — two tabs: **Bot** (`BotStatus` with Send Test + Clear History buttons) and **Monitor** (`Monitor` component). Both tabs stay mounted (preloaded) — only visibility toggled via `display: none`.
- `Monitor` has a 4-step auth state machine (checking → phone → code → authorized), then renders group checkboxes, keyword tags, and active toggle.
- `index.css` — all styles; dark theme (`#0f172a` base), no CSS framework

## Environment

`backend/.env` (not committed):
```
TELEGRAM_BOT_TOKEN=<token from @BotFather>
TELEGRAM_API_ID=<from my.telegram.org>
TELEGRAM_API_HASH=<from my.telegram.org>
MY_CHAT_ID=<your Telegram user ID>
```
