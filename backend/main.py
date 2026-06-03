import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_BASE = f"https://api.telegram.org/bot{TOKEN}/"

updates_offset: int = 0


class SendMessage(BaseModel):
    chat_id: str
    text: str


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/bot-info")
async def bot_info():
    if not TOKEN:
        return {"error": "No token configured"}
    async with httpx.AsyncClient() as client:
        r = await client.get(TELEGRAM_BASE + "getMe")
    data = r.json()
    if not data.get("ok"):
        return {"error": data.get("description", "Telegram API error")}
    return data["result"]


@app.get("/updates")
async def get_updates():
    global updates_offset
    async with httpx.AsyncClient() as client:
        r = await client.get(
            TELEGRAM_BASE + "getUpdates",
            params={"offset": updates_offset, "limit": 10},
        )
    data = r.json()
    results = data.get("result", [])
    if results:
        updates_offset = max(u["update_id"] for u in results) + 1
    messages = [u["message"] for u in results if "message" in u]
    return {"messages": messages}


@app.post("/send")
async def send_message(body: SendMessage):
    async with httpx.AsyncClient() as client:
        r = await client.post(
            TELEGRAM_BASE + "sendMessage",
            json={"chat_id": body.chat_id, "text": body.text},
        )
    return r.json()
